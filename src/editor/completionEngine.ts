/*
 * Copyright 2026 Christian Grobmeier
 * Modifications copyright 2026 arvn
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
  isMarkdownHeading,
  isSceneHeading,
  isTransitionText,
  looksLikeCharacterCue,
} from "../screenplay/lines";
import {
  DEFAULT_SLUG_MODIFIERS,
  CHARACTER_EXTENSIONS,
  COMMON_PARENTHETICALS,
  COMMON_TRANSITIONS,
  DEFAULT_SCENE_TYPES,
  DEFAULT_TIMES_OF_DAY,
  SCENE_TYPE_SOURCE,
} from "../screenplay/fountain";
import {
  buildScreenplayIndex,
  preferredAndRecent,
  preferredAndRecentTimes,
  rankUsages,
} from "../screenplay/indexer";
import { parseFountain } from "../screenplay/parser";
import type {
  ScreenplayDocument,
  ScreenplayIndex,
  Usage,
} from "../screenplay/model";
import { isInDialogueBlock, recentSceneSpeakers } from "./smartTab";

export type ScreenplayCompletionKind =
  | "character"
  | "character-name"
  | "character-extension"
  | "parenthetical"
  | "transition"
  | "scene-type"
  | "slug-modifier"
  | "scene-location"
  | "scene-time";

export interface CompletionCandidate {
  label: string;
  /** Shown in the list instead of `label` (e.g. "KITCHEN - NIGHT"). */
  displayLabel?: string;
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
  /**
   * Typing only opens the character list for capitals ("JE", not "Je").
   * Off: any case opens it. Default on.
   */
  characterMatchCase?: boolean;
  /**
   * A name typed in capitals inside an action line ("She sees JE") lists
   * the characters, like Final Draft's SmartType. Default off.
   */
  namesInAction?: boolean;
  /** Slug modifiers offered after the time of day. */
  preferredSlugModifiers?: readonly string[];
  /**
   * The location list also offers each location's last whole slug
   * ("KITCHEN - NIGHT (FLASHBACK)"), filled in at once. Default off.
   */
  offerFullSlugs?: boolean;
  /** With full slugs on: which of a location's two items comes first. */
  slugSuggestionOrder?: readonly SlugSuggestionKind[];
}

/** The two items a location can have in the slugline list. */
export type SlugSuggestionKind = "recent" | "shortest";

export const DEFAULT_SLUG_SUGGESTION_ORDER: readonly SlugSuggestionKind[] = [
  "recent",
  "shortest",
];

/** A usable order of the two slug items: both, once each. */
export function slugOrder(
  order: readonly unknown[] | undefined,
): SlugSuggestionKind[] {
  const kinds = (order ?? []).filter(
    (kind, at, all): kind is SlugSuggestionKind =>
      (kind === "recent" || kind === "shortest") && all.indexOf(kind) === at,
  );
  for (const kind of DEFAULT_SLUG_SUGGESTION_ORDER) {
    if (!kinds.includes(kind)) kinds.push(kind);
  }
  return kinds;
}

const SCENE_LINE = new RegExp(`^(${SCENE_TYPE_SOURCE})\\s+(.*)$`, "iu");
// Fountain forced scene heading: a single leading "." (not "..", which is an ellipsis).
const FORCED_SCENE_LINE = /^\.(?![.\s])(.*)$/u;
const POSSIBLE_CHARACTER = /^[\p{Lu}\p{N} ._'’-]+$/u;
/** Capitals and the marks a transition uses, no lower case: "SMASH CUT T". */
const LOWERCASE = /\p{Ll}/u;
const UPPERCASE_ONLY = /^(?=.*\p{Lu})[^\p{Ll}]+$/u;

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
  source: string,
  before: string,
  lineFrom: number,
  cursorOffset: number,
  characters: readonly string[],
  startsBlock: boolean,
): ScreenplayCompletionPlan | null {
  // "JEN (" or "JEN(" both open the list.
  const match = /^(.+?)(\s*)\(([^)]*)$/u.exec(before);
  if (!match) return null;
  const typed = match[1] ?? "";
  const character = typed.replace(/^@/u, "").trim().toLocaleUpperCase();
  if (!character) return null;
  // A known character, or a new one: a name in capitals (or "@name")
  // starting a block, before it has any dialogue.
  if (
    !characters.includes(character) &&
    !(startsBlock && looksLikeCharacterCue(typed))
  ) {
    return null;
  }

  const query = match[3]?.toLocaleUpperCase() ?? "";
  const openParenthesis = before.lastIndexOf("(");
  // "JEN(" gets its space back: "JEN (V.O.)".
  const space = match[2] ? "" : " ";
  const candidates = CHARACTER_EXTENSIONS.filter((extension) =>
    extension.slice(1).toLocaleUpperCase().startsWith(query),
  ).map((extension) => ({
    label: extension,
    applyText: `${space}${extension}`,
    detail: "Character extension",
  }));

  return candidates.length === 0
    ? null
    : {
        kind: "character-extension",
        from: lineFrom + openParenthesis,
        // Cover an auto-inserted ")" right after the cursor.
        to:
          source.charAt(cursorOffset) === ")" ? cursorOffset + 1 : cursorOffset,
        candidates,
      };
}

/** Transition text without the ">" marker, uppercased: "> cut to:" -> "CUT TO:". */
function transitionValue(text: string): string {
  return text.trim().replace(/^>\s*/u, "").trim().toLocaleUpperCase();
}

/** Transitions used in the script first, then the common ones. */
function transitionUsages(
  index: ReturnType<typeof buildScreenplayIndex>,
): Usage[] {
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
  return [...usages.values()];
}

/**
 * How a picked transition is written: "CUT TO:" as it is (Fountain reads a
 * line in capitals ending in "TO:" as a transition), others with the ">"
 * that makes them one ("> FADE OUT.").
 */
function transitionText(value: string): string {
  return value.endsWith("TO:") ? value : `> ${value}`;
}

function transitionPlan(
  before: string,
  lineFrom: number,
  cursorOffset: number,
  index: ReturnType<typeof buildScreenplayIndex>,
  preferences: CompletionPreferences,
): ScreenplayCompletionPlan | null {
  const match = /^(\s*)>\s*([^<]*)$/u.exec(before);
  // "> [!note]" is an Obsidian callout, not a transition.
  if (!match || /^\s*\[!/u.test(match[2] ?? "")) return null;

  const usages = transitionUsages(index);
  const candidates = rankUsages(
    usages,
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

/**
 * Slug modifiers after the time of day: typing "(" after it
 * ("EXT. HIGHWAY - DAY (FL"), or asking for the list (Tab) at the end of a
 * heading that has a time and no modifier yet.
 */
function slugModifierPlan(
  source: string,
  before: string,
  lineFrom: number,
  cursorOffset: number,
  index: ScreenplayIndex,
  preferences: CompletionPreferences,
  explicit: boolean,
): ScreenplayCompletionPlan | null {
  if (!isSceneHeading(before.trim())) return null;
  // Later preferred values count as more recent, so reverse the list to
  // offer it in the order written in settings (FLASHBACK first).
  const modifiers = preferredAndRecent(
    index.slugModifiers,
    [
      ...(preferences.preferredSlugModifiers ?? DEFAULT_SLUG_MODIFIERS),
    ].reverse(),
  );
  const typed = /^(.*\S)(\s*)\(([^()]*)$/u.exec(before);
  if (typed) {
    const base = typed[1] ?? "";
    if (!headingHasTime(base, index, preferences)) return null;
    const query = typed[3] ?? "";
    const from = lineFrom + base.length + (typed[2] ?? "").length;
    // Cover an auto-inserted ")" right after the cursor.
    const to =
      source.charAt(cursorOffset) === ")" ? cursorOffset + 1 : cursorOffset;
    const candidates = rankUsages(
      modifiers,
      query,
      preferences.recentItemsWeighting,
      preferences.maximumSuggestions,
    ).map((usage) => ({
      label: usage.value,
      applyText: `(${usage.value})`,
      detail: "Slug modifier",
    }));
    return candidates.length === 0
      ? null
      : { kind: "slug-modifier", from, to, candidates };
  }
  if (!explicit || before.trimEnd().endsWith(")")) return null;
  if (!headingHasTime(before, index, preferences)) return null;
  const space = before.endsWith(" ") ? "" : " ";
  const candidates = rankUsages(
    modifiers,
    "",
    preferences.recentItemsWeighting,
    preferences.maximumSuggestions,
  ).map((usage) => ({
    label: usage.value,
    applyText: `${space}(${usage.value})`,
    detail: "Slug modifier",
  }));
  return candidates.length === 0
    ? null
    : {
        kind: "slug-modifier",
        from: cursorOffset,
        to: cursorOffset,
        candidates,
      };
}

/** Whether a scene heading ends with a known time of day. */
function headingHasTime(
  heading: string,
  index: ScreenplayIndex,
  preferences: CompletionPreferences,
): boolean {
  const parts = heading.trim().split(/\s+-\s+/u);
  // ".LATER": a forced heading that is only a time.
  const forced = parts.length === 1 && /^\.[^.\s]/u.test(parts[0] ?? "");
  if (parts.length < 2 && !forced) return false;
  const last = (parts[parts.length - 1] ?? "")
    .trim()
    .replace(/^\./u, "")
    .toLocaleUpperCase();
  return preferredAndRecentTimes(index, preferences.preferredTimesOfDay).some(
    (usage) => usage.value.toLocaleUpperCase() === last,
  );
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
    ).flatMap((usage): CompletionCandidate[] => {
      const key = usage.value.toLocaleUpperCase();
      const last = index.lastTimeByLocation?.[key];
      const slug = index.lastSlugByLocation?.[key];
      // Full slugs on: the location ("KITCHEN", then the times list) and
      // its last whole slug ("KITCHEN - NIGHT (FLASHBACK)", filled in at
      // once), in the order set in settings.
      if (
        preferences.offerFullSlugs === true &&
        slug !== undefined &&
        slug.toLocaleUpperCase() !== key
      ) {
        const items: Record<SlugSuggestionKind, CompletionCandidate> = {
          shortest: {
            label: usage.value,
            applyText: `${usage.value} - `,
            detail: "Location",
          },
          recent: { label: slug, applyText: slug, detail: "Last slug" },
        };
        return slugOrder(preferences.slugSuggestionOrder).map(
          (kind) => items[kind],
        );
      }
      // Shown with the time it had last ("KITCHEN - NIGHT"); picking it
      // still fills in "KITCHEN - " and opens the times, that time first.
      return [
        {
          label: usage.value,
          ...(last ? { displayLabel: `${usage.value} - ${last}` } : {}),
          applyText: `${usage.value} - `,
          detail: "Location",
        },
      ];
    });
    candidates.length = Math.min(
      candidates.length,
      preferences.maximumSuggestions,
    );
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
  const ranked = rankUsages(
    preferredAndRecentTimes(index, preferences.preferredTimesOfDay),
    query,
    preferences.recentItemsWeighting,
    preferences.maximumSuggestions,
  );
  // The time this location had last time comes first ("KITCHEN" was last
  // at NIGHT: NIGHT tops the list), if it matches what is typed.
  const location = value.slice(0, delimiter).trim().toLocaleUpperCase();
  const last = index.lastTimeByLocation?.[location];
  if (
    last !== undefined &&
    last.toLocaleUpperCase().startsWith(query.trim().toLocaleUpperCase())
  ) {
    const at = ranked.findIndex(
      (usage) => usage.value.toLocaleUpperCase() === last.toLocaleUpperCase(),
    );
    const [usage] =
      at === -1
        ? [{ value: last, count: 1, lastUsedPosition: 0 }]
        : ranked.splice(at, 1);
    if (usage) ranked.unshift(usage);
    ranked.length = Math.min(ranked.length, preferences.maximumSuggestions);
  }
  const candidates = ranked.map((usage) => ({
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
    detail: "Wryly",
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

/** The capitals being typed at the end of `before`: "JE" in "She sees JE". */
const NAME_AT_END = /(^|[^\p{L}\p{N}_'’@#$])(\p{Lu}[\p{Lu}\p{N}'’.-]*)$/u;

/**
 * A character's name typed in capitals inside an action line ("She sees
 * JE"): the characters starting with it, written in the line as they are
 * (no "@", no line break). Not at the start of a block, where the same
 * capitals are a cue and get the cue list; not in a speech, slugline,
 * transition or other marked line.
 */
function namePlan(
  source: string,
  before: string,
  lineFrom: number,
  cursorOffset: number,
  startsBlock: boolean,
  index: ReturnType<typeof buildScreenplayIndex>,
  preferences: CompletionPreferences,
): ScreenplayCompletionPlan | null {
  if (preferences.namesInAction !== true) return null;
  const match = NAME_AT_END.exec(before);
  const word = match?.[2] ?? "";
  if (word.length < 2) return null;
  const leading = before.slice(0, before.length - word.length);
  // Capitals alone at the start of a block are a cue ("JEN", "JEN AND JO").
  if (startsBlock && UPPERCASE_ONLY.test(before.trim())) return null;
  if (startsBlock && leading.trim() === "") return null;
  const lineEnd = source.indexOf("\n", cursorOffset);
  const text = source
    .slice(lineFrom, lineEnd === -1 ? source.length : lineEnd)
    .trim();
  if (/^[>@~=#.[]/u.test(text) || isSceneHeading(text)) return null;
  const lines = source.split("\n");
  const lineIndex = source.slice(0, lineFrom).split("\n").length - 1;
  if (isInDialogueBlock(lines, lineIndex)) return null;
  const candidates = rankUsages(
    index.characters,
    word,
    preferences.recentItemsWeighting,
    preferences.maximumSuggestions,
  )
    .filter((usage) => usage.value.toLocaleUpperCase() !== word)
    .map((usage) => ({
      label: usage.value,
      applyText: usage.value,
      detail: "Character",
    }));
  return candidates.length === 0
    ? null
    : {
        kind: "character-name",
        from: cursorOffset - word.length,
        to: cursorOffset,
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
  /** A list asked for by a "Set line to …" command, whatever the context. */
  force?: "scene-type" | "character",
): ScreenplayCompletionPlan | null {
  const { before, from, indexSource, previousLine } = lineContext(
    source,
    cursorOffset,
  );
  const forcedQuery = before.trimStart();
  if (force === "scene-type" && !/\s/u.test(forcedQuery)) {
    const query = forcedQuery;
    const candidates = (preferences.preferredSceneTypes ?? DEFAULT_SCENE_TYPES)
      .filter((type) =>
        type.toLocaleUpperCase().startsWith(query.toLocaleUpperCase()),
      )
      .map((type) => ({
        label: type,
        applyText: `${type} `,
        detail: "Scene type",
      }));
    if (candidates.length > 0) {
      return {
        kind: "scene-type",
        from: from + (before.length - query.length),
        to: cursorOffset,
        candidates,
      };
    }
  }
  if (force === "character") explicit = true;
  const index =
    precomputedIndex ??
    buildScreenplayIndex(projectDocument ?? parseFountain(indexSource));
  const characterNames = index.characters.map((usage) =>
    usage.value.toLocaleUpperCase(),
  );

  const extensions = extensionPlan(
    source,
    before,
    from,
    cursorOffset,
    characterNames,
    from === 0 || previousLine.trim() === "",
  );
  if (extensions) return extensions;

  // A line set to a character only gets characters (and extensions).
  const characterOnly = force === "character";

  const transition = characterOnly
    ? null
    : transitionPlan(before, from, cursorOffset, index, preferences);
  if (transition) return transition;

  const modifier = characterOnly
    ? null
    : slugModifierPlan(
        source,
        before,
        from,
        cursorOffset,
        index,
        preferences,
        explicit,
      );
  if (modifier) return modifier;

  const scene = characterOnly
    ? null
    : scenePlan(before, from, cursorOffset, index, preferences);
  if (scene) return scene;

  const parenthetical = characterOnly
    ? null
    : parentheticalPlan(source, before, from, cursorOffset, index, preferences);
  if (parenthetical) return parenthetical;

  const query = before.trimStart();
  const leadingWhitespace = before.length - query.length;
  const plausiblePosition =
    force === "character" || from === 0 || previousLine.trim() === "";

  // Scene types: after Tab on a "# heading" or transition, or when a block
  // starts with a scene type prefix ("in", "EXT"). A minimum number of
  // letters (default 2) keeps ordinary action lines from popping the menu.
  const minimumLetters = Math.max(1, preferences.sceneTypeMinimumLetters ?? 2);
  const matchCase = preferences.sceneTypeMatchCase ?? false;
  const lastContentLine = source.slice(0, from).trimEnd().split("\n").pop();
  // After a "# heading" or a transition, a slugline comes next.
  // After a "# heading", a transition or centered text (a title), a
  // slugline comes next.
  const afterHeading =
    isMarkdownHeading(lastContentLine ?? "") ||
    isTransitionText((lastContentLine ?? "").trim()) ||
    /^>.*<$/u.test((lastContentLine ?? "").trim());
  const wantsSceneTypes =
    plausiblePosition &&
    !/\s/u.test(query) &&
    (query.length >= minimumLetters ||
      (explicit && afterHeading && query.length === 0));
  const sceneTypeCandidates =
    wantsSceneTypes && !characterOnly
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
  // matches: "f" finds FIONA. With "match capitals" off, typing in any
  // case opens it too: "Je" finds JEN.
  // A forced cue ("@", "@j", "@mc"): the name after the "@", in any case.
  const forcedCue = query.startsWith("@");
  const nameQuery = forcedCue ? query.slice(1) : query;
  const anyCase =
    explicit || forcedCue || preferences.characterMatchCase === false;
  const characterQuery = anyCase ? nameQuery.toLocaleUpperCase() : nameQuery;
  const characterCandidates =
    !plausiblePosition ||
    // Typing needs two capitals ("JE"): one is just a capitalized action
    // line ("S" for "She runs").
    (!explicit && !forcedCue && query.length < 2) ||
    (nameQuery.length > 0 && !POSSIBLE_CHARACTER.test(characterQuery))
      ? []
      : orderByTurn(
          rankUsages(
            index.characters,
            nameQuery,
            preferences.recentItemsWeighting,
            Number.MAX_SAFE_INTEGER,
          ),
          recentSceneSpeakers(source, from),
          preferences.maximumSuggestions,
        ).map((usage) => ({
          label: usage.value,
          // A name with lower case ("McCLANE") is only a cue with its "@".
          applyText: `${LOWERCASE.test(usage.value) ? "@" : ""}${usage.value}\n`,
          // Ends in "dialogue block(s)" either way: see menuLineKind.
          detail:
            usage.count === 0
              ? "No dialogue blocks"
              : `${usage.count} dialogue ${usage.count === 1 ? "block" : "blocks"}`,
        }));

  // Transitions typed without ">" ("CUT T", "SMASH"): in capitals at the
  // start of a block, after the characters that match.
  const transitionCandidates =
    characterOnly ||
    !plausiblePosition ||
    query.length < 2 ||
    !UPPERCASE_ONLY.test(query)
      ? []
      : transitionUsages(index)
          .filter((usage) => usage.value.startsWith(query))
          .sort((a, b) => b.count - a.count)
          .slice(0, preferences.maximumSuggestions)
          .map((usage) => ({
            label: usage.value,
            applyText: transitionText(usage.value),
            detail: "Transition",
          }));

  const candidates = [
    ...sceneTypeCandidates,
    ...characterCandidates,
    ...transitionCandidates,
  ];
  if (candidates.length === 0 && !characterOnly) {
    return namePlan(
      source,
      before,
      from,
      cursorOffset,
      plausiblePosition,
      index,
      preferences,
    );
  }
  return candidates.length === 0
    ? null
    : {
        kind:
          characterCandidates.length > 0
            ? "character"
            : sceneTypeCandidates.length > 0
              ? "scene-type"
              : "transition",
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
