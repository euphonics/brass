/*
 * Copyright 2026 Christian Grobmeier
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  CHARACTER_EXTENSIONS,
  COMMON_PARENTHETICALS,
  COMMON_TRANSITIONS,
  DEFAULT_SCENE_TYPES,
  DEFAULT_TIMES_OF_DAY,
  SCENE_TYPE_SOURCE,
} from "../screenplay/fountain";
import {
  buildScreenplayIndex,
  preferredAndRecentTimes,
  rankUsages,
} from "../screenplay/indexer";
import { parseFountain } from "../screenplay/parser";
import type {
  ScreenplayDocument,
  ScreenplayIndex,
  Usage,
} from "../screenplay/model";
import {
  isInDialogueBlock,
  isMarkdownHeading,
  isTransitionText,
  recentSceneSpeakers,
} from "./smartTab";

export type ScreenplayCompletionKind =
  | "character"
  | "character-extension"
  | "parenthetical"
  | "transition"
  | "scene-type"
  | "scene-location"
  | "scene-time";

export interface CompletionCandidate {
  label: string;
  applyText: string;
  detail: string;
}

export interface ScreenplayCompletionPlan {
  kind: ScreenplayCompletionKind;
  from: number;
  to: number;
  candidates: CompletionCandidate[];
}

export interface CompletionPreferences {
  recentItemsWeighting: number;
  maximumSuggestions: number;
  preferredTimesOfDay: readonly string[];
  preferredSceneTypes?: readonly string[];
  /** Letters typed before scene types are suggested (at least 1). */
  sceneTypeMinimumLetters?: number;
  /** Scene type suggestions require the typed letters' case to match. */
  sceneTypeMatchCase?: boolean;
}

const SCENE_LINE = new RegExp(`^(${SCENE_TYPE_SOURCE})\\s+(.*)$`, "iu");
// Fountain forced scene heading: a single leading "." (not "..", which is an ellipsis).
const FORCED_SCENE_LINE = /^\.(?![.\s])(.*)$/u;
const POSSIBLE_CHARACTER = /^[\p{Lu}\p{N} ._'’-]+$/u;

function lineContext(
  source: string,
  cursorOffset: number,
): {
  before: string;
  from: number;
  indexSource: string;
  previousLine: string;
} {
  const from = source.lastIndexOf("\n", Math.max(0, cursorOffset - 1)) + 1;
  const nextBreak = source.indexOf("\n", cursorOffset);
  const lineEnd = nextBreak === -1 ? source.length : nextBreak;
  const previousBreak = source.lastIndexOf("\n", Math.max(0, from - 2));
  const previousLine = source.slice(previousBreak + 1, Math.max(0, from - 1));
  return {
    before: source.slice(from, cursorOffset),
    from,
    indexSource: `${source.slice(0, from)}${source.slice(lineEnd)}`,
    previousLine,
  };
}

function extensionPlan(
  before: string,
  lineFrom: number,
  cursorOffset: number,
  characters: readonly string[],
): ScreenplayCompletionPlan | null {
  const match = /^(.+?)\s+\(([^)]*)$/u.exec(before);
  if (!match) return null;
  const character = match[1]?.replace(/^@/u, "").trim().toLocaleUpperCase();
  if (!character || !characters.includes(character)) return null;

  const query = match[2]?.toLocaleUpperCase() ?? "";
  const openParenthesis = before.lastIndexOf("(");
  const candidates = CHARACTER_EXTENSIONS.filter((extension) =>
    extension.slice(1).toLocaleUpperCase().startsWith(query),
  ).map((extension) => ({
    label: extension,
    applyText: extension,
    detail: "Character extension",
  }));

  return candidates.length === 0
    ? null
    : {
        kind: "character-extension",
        from: lineFrom + openParenthesis,
        to: cursorOffset,
        candidates,
      };
}

/** Transition text without the ">" marker, uppercased: "> cut to:" -> "CUT TO:". */
function transitionValue(text: string): string {
  return text.trim().replace(/^>\s*/u, "").trim().toLocaleUpperCase();
}

function transitionPlan(
  before: string,
  lineFrom: number,
  cursorOffset: number,
  index: ReturnType<typeof buildScreenplayIndex>,
  preferences: CompletionPreferences,
): ScreenplayCompletionPlan | null {
  const match = /^(\s*)>\s*([^<]*)$/u.exec(before);
  if (!match) return null;

  // Transitions used in the script first, then the common ones.
  const usages = new Map<string, Usage>();
  for (const usage of index.transitions) {
    const value = transitionValue(usage.value);
    if (!value) continue;
    const known = usages.get(value);
    usages.set(value, {
      value,
      count: (known?.count ?? 0) + usage.count,
      lastUsedPosition: Math.max(
        known?.lastUsedPosition ?? 0,
        usage.lastUsedPosition,
      ),
    });
  }
  for (const value of COMMON_TRANSITIONS) {
    if (!usages.has(value)) {
      usages.set(value, { value, count: 0, lastUsedPosition: 0 });
    }
  }

  const candidates = rankUsages(
    [...usages.values()],
    match[2] ?? "",
    preferences.recentItemsWeighting,
    preferences.maximumSuggestions,
  ).map((usage) => ({
    label: usage.value,
    applyText: `> ${usage.value}`,
    detail: "Transition",
  }));
  return candidates.length === 0
    ? null
    : {
        kind: "transition",
        from: lineFrom + (match[1]?.length ?? 0),
        to: cursorOffset,
        candidates,
      };
}

function scenePlan(
  before: string,
  lineFrom: number,
  cursorOffset: number,
  index: ReturnType<typeof buildScreenplayIndex>,
  preferences: CompletionPreferences,
): ScreenplayCompletionPlan | null {
  let value: string;
  let valueFrom: number;
  let untypedForced = false;
  const match = SCENE_LINE.exec(before);
  if (match) {
    const sceneType = match[1] ?? "";
    value = match[2] ?? "";
    valueFrom = lineFrom + sceneType.length + 1;
  } else {
    const forced = FORCED_SCENE_LINE.exec(before);
    if (!forced) return null;
    const forcedBody = forced[1] ?? "";
    // ".INT. KITCHEN" is a forced heading that still carries a scene type.
    const typed = SCENE_LINE.exec(forcedBody);
    if (typed) {
      value = typed[2] ?? "";
      valueFrom = lineFrom + 1 + (typed[1] ?? "").length + 1;
    } else {
      value = forcedBody;
      valueFrom = lineFrom + 1;
      untypedForced = true;
    }
  }
  const normalizedValue = value.toLocaleUpperCase();
  const canContinueLocation = index.locations.some((usage) =>
    usage.value.toLocaleUpperCase().startsWith(normalizedValue),
  );

  if (canContinueLocation || !value.includes(" - ")) {
    const candidates = rankUsages(
      index.locations,
      value,
      preferences.recentItemsWeighting,
      preferences.maximumSuggestions,
    ).map((usage) => ({
      label: usage.value,
      applyText: `${usage.value} - `,
      detail: "Location",
    }));
    // After a bare ".", times used on their own (".LATER") are offered too.
    if (untypedForced) {
      candidates.push(
        ...rankUsages(
          index.standaloneTimes,
          value,
          preferences.recentItemsWeighting,
          preferences.maximumSuggestions,
        ).map((usage) => ({
          label: usage.value,
          applyText: usage.value,
          detail: "Time",
        })),
      );
    }
    return candidates.length === 0
      ? null
      : {
          kind: "scene-location",
          from: valueFrom,
          to: cursorOffset,
          candidates,
        };
  }

  const delimiter = value.lastIndexOf(" - ");
  const query = value.slice(delimiter + 3);
  const candidates = rankUsages(
    preferredAndRecentTimes(index, preferences.preferredTimesOfDay),
    query,
    preferences.recentItemsWeighting,
    preferences.maximumSuggestions,
  ).map((usage) => ({
    label: usage.value,
    applyText: usage.value,
    detail: "Time",
  }));

  return candidates.length === 0
    ? null
    : {
        kind: "scene-time",
        from: valueFrom + delimiter + 3,
        to: cursorOffset,
        candidates,
      };
}

/**
 * Order character suggestions for the next cue. Whoever spoke last goes to
 * the bottom (they rarely speak twice in a row); the other speakers in the
 * scene come first, most recent first, so a two-hander alternates. The rest
 * keep their usual frequency/recency ranking.
 */
function orderByTurn(
  ranked: readonly Usage[],
  sceneSpeakers: readonly string[],
  limit: number,
): Usage[] {
  const [lastSpeaker, ...earlierSpeakers] = sceneSpeakers;
  const key = (usage: Usage) => usage.value.toLocaleUpperCase();
  const scene = earlierSpeakers.flatMap((name) =>
    ranked.filter((usage) => key(usage) === name),
  );
  const last = ranked.filter((usage) => key(usage) === lastSpeaker);
  const rest = ranked.filter(
    (usage) => !scene.includes(usage) && !last.includes(usage),
  );
  const max = Math.max(1, limit);
  return [...scene, ...rest].slice(0, max - last.length).concat(last);
}

// Generic defaults only; "(to Reeves)" in COMMON_PARENTHETICALS is an example.
const DEFAULT_PARENTHETICALS = COMMON_PARENTHETICALS.filter(
  (value) => !value.startsWith("(to "),
);

function parentheticalPlan(
  source: string,
  before: string,
  lineFrom: number,
  cursorOffset: number,
  index: ReturnType<typeof buildScreenplayIndex>,
  preferences: CompletionPreferences,
): ScreenplayCompletionPlan | null {
  const match = /^(\s*)\(([^)]*)$/u.exec(before);
  if (!match) return null;
  const lines = source.split("\n");
  const lineIndex = source.slice(0, lineFrom).split("\n").length - 1;
  if (!isInDialogueBlock(lines, lineIndex)) return null;

  const used = new Set(index.parentheticals.map((usage) => usage.value));
  const usages: Usage[] = [
    ...index.parentheticals,
    ...DEFAULT_PARENTHETICALS.filter((value) => !used.has(value)).map(
      (value) => ({ value, count: 0, lastUsedPosition: 0 }),
    ),
  ];
  const candidates = rankUsages(
    usages,
    `(${match[2] ?? ""}`,
    preferences.recentItemsWeighting,
    preferences.maximumSuggestions,
  ).map((usage) => ({
    label: usage.value,
    applyText: usage.value,
    detail: "Parenthetical",
  }));
  if (candidates.length === 0) return null;
  // Smart Tab inserts "()", so replace the closing parenthesis too.
  const closes = source.charAt(cursorOffset) === ")";
  return {
    kind: "parenthetical",
    from: lineFrom + (match[1]?.length ?? 0),
    to: cursorOffset + (closes ? 1 : 0),
    candidates,
  };
}

export function getScreenplayCompletionPlan(
  source: string,
  cursorOffset: number,
  preferences: CompletionPreferences,
  explicit = false,
  projectDocument?: ScreenplayDocument,
  /** A ready-made index (smart rebuild cache); skips building one. */
  precomputedIndex?: ScreenplayIndex,
): ScreenplayCompletionPlan | null {
  const { before, from, indexSource, previousLine } = lineContext(
    source,
    cursorOffset,
  );
  const index =
    precomputedIndex ??
    buildScreenplayIndex(projectDocument ?? parseFountain(indexSource));
  const characterNames = index.characters.map((usage) =>
    usage.value.toLocaleUpperCase(),
  );

  const extensions = extensionPlan(before, from, cursorOffset, characterNames);
  if (extensions) return extensions;

  const transition = transitionPlan(
    before,
    from,
    cursorOffset,
    index,
    preferences,
  );
  if (transition) return transition;

  const scene = scenePlan(before, from, cursorOffset, index, preferences);
  if (scene) return scene;

  const parenthetical = parentheticalPlan(
    source,
    before,
    from,
    cursorOffset,
    index,
    preferences,
  );
  if (parenthetical) return parenthetical;

  const query = before.trimStart();
  const leadingWhitespace = before.length - query.length;
  const plausiblePosition = from === 0 || previousLine.trim() === "";

  // Scene types: after Tab on a "# heading" or transition, or when a block
  // starts with a scene type prefix ("in", "EXT"). A minimum number of
  // letters (default 2) keeps ordinary action lines from popping the menu.
  const minimumLetters = Math.max(1, preferences.sceneTypeMinimumLetters ?? 2);
  const matchCase = preferences.sceneTypeMatchCase ?? false;
  const lastContentLine = source.slice(0, from).trimEnd().split("\n").pop();
  // After a "# heading" or a transition, a slugline comes next.
  const afterHeading =
    isMarkdownHeading(lastContentLine ?? "") ||
    isTransitionText((lastContentLine ?? "").trim());
  const wantsSceneTypes =
    plausiblePosition &&
    !/\s/u.test(query) &&
    (query.length >= minimumLetters ||
      (explicit && afterHeading && query.length === 0));
  const sceneTypeCandidates = wantsSceneTypes
    ? (preferences.preferredSceneTypes ?? DEFAULT_SCENE_TYPES)
        .filter((type) =>
          matchCase
            ? type.startsWith(query)
            : type.toLocaleUpperCase().startsWith(query.toLocaleUpperCase()),
        )
        .map((type) => ({
          label: type,
          applyText: `${type} `,
          detail: "Scene type",
        }))
    : [];
  if (afterHeading && query.length === 0 && sceneTypeCandidates.length > 0) {
    return {
      kind: "scene-type",
      from: from + leadingWhitespace,
      to: cursorOffset,
      candidates: sceneTypeCandidates,
    };
  }

  // Typing only opens the list for capitals (so lowercase action doesn't),
  // but once it is open on purpose (Tab, Enter, Ctrl+Space) any case
  // matches: "f" finds FIONA.
  const characterQuery = explicit ? query.toLocaleUpperCase() : query;
  const characterCandidates =
    !plausiblePosition ||
    (!explicit && query.length === 0) ||
    (query.length > 0 && !POSSIBLE_CHARACTER.test(characterQuery))
      ? []
      : orderByTurn(
          rankUsages(
            index.characters,
            query,
            preferences.recentItemsWeighting,
            Number.MAX_SAFE_INTEGER,
          ),
          recentSceneSpeakers(source, from),
          preferences.maximumSuggestions,
        ).map((usage) => ({
          label: usage.value,
          applyText: `${usage.value}\n`,
          detail: `${usage.count} dialogue ${usage.count === 1 ? "block" : "blocks"}`,
        }));

  const candidates = [...sceneTypeCandidates, ...characterCandidates];
  return candidates.length === 0
    ? null
    : {
        kind: characterCandidates.length === 0 ? "scene-type" : "character",
        from: from + leadingWhitespace,
        to: cursorOffset,
        candidates,
      };
}

export const DEFAULT_COMPLETION_PREFERENCES: CompletionPreferences = {
  recentItemsWeighting: 0.65,
  maximumSuggestions: 8,
  preferredTimesOfDay: DEFAULT_TIMES_OF_DAY,
};
