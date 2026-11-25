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
  splitSlugModifier,
  DEFAULT_TIMES_OF_DAY,
  SCENE_TYPE_SOURCE,
} from "./fountain";
import type { ScreenplayDocument, ScreenplayIndex, Usage } from "./model";

const SCENE_PARTS = new RegExp(`^\\.?(${SCENE_TYPE_SOURCE})\\s+(.+)$`, "iu");
const SCENE_NUMBER = /\s+#[\p{L}\p{N}.-]+#\s*$/u;

/** O'BRIEN and O’BRIEN (a phone's smart quotes) are the same entry. */
function usageKey(value: string): string {
  return value.replace(/[‘’]/gu, "'").toLocaleUpperCase();
}

function addUsage(
  usages: Map<string, Usage>,
  value: string,
  position: number,
): void {
  const normalized = value.trim();
  if (!normalized) return;

  const key = usageKey(normalized);
  const existing = usages.get(key);
  if (existing) {
    existing.count += 1;
    existing.lastUsedPosition = Math.max(existing.lastUsedPosition, position);
  } else {
    usages.set(key, {
      value: normalized,
      count: 1,
      lastUsedPosition: position,
    });
  }
}

export interface SceneHeadingParts {
  type: string;
  location: string;
  timeOfDay: string | null;
}

export function parseSceneHeadingParts(text: string): SceneHeadingParts | null {
  const withoutNumber = text.trim().replace(SCENE_NUMBER, "");
  const match = SCENE_PARTS.exec(withoutNumber);
  if (!match) return null;

  const type = match[1]?.toLocaleUpperCase() ?? "";
  const remainder = match[2]?.trim() ?? "";
  const parts = remainder.split(/\s+-\s+/u);
  if (parts.length < 2) {
    return { type, location: remainder, timeOfDay: null };
  }

  const timeOfDay = parts.pop()?.trim() ?? null;
  return {
    type,
    location: parts.join(" - ").trim(),
    timeOfDay,
  };
}

// Forced scene headings without a scene type, e.g. ".BEDROOM - NIGHT".
// Kept separate from parseSceneHeadingParts so scene editing keeps its INT./EXT. contract.
function forcedSceneHeadingParts(text: string): SceneHeadingParts | null {
  const withoutNumber = text.trim().replace(SCENE_NUMBER, "");
  if (!/^\.[\p{L}\p{N}]/u.test(withoutNumber)) return null;
  const remainder = withoutNumber.slice(1).trim();
  const parts = remainder.split(/\s+-\s+/u);
  if (parts.length < 2)
    return { type: "", location: remainder, timeOfDay: null };
  const timeOfDay = parts.pop()?.trim() ?? null;
  return { type: "", location: parts.join(" - ").trim(), timeOfDay };
}

export function buildScreenplayIndex(
  document: ScreenplayDocument,
): ScreenplayIndex {
  // A forced heading that is only a time (".LATER", ".MOMENTS LATER") is a
  // time, not a location. Known times: the defaults plus any time used after
  // " - " in the script.
  const knownTimes = new Set(
    DEFAULT_TIMES_OF_DAY.map((time) => time.toLocaleUpperCase()),
  );
  for (const element of document.elements) {
    if (element.type !== "scene-heading") continue;
    const { base } = splitSlugModifier(element.text);
    const time = (parseSceneHeadingParts(base) ?? forcedSceneHeadingParts(base))
      ?.timeOfDay;
    if (time) knownTimes.add(time.toLocaleUpperCase());
  }
  const standaloneTimes = new Map<string, Usage>();
  const characters = new Map<string, Usage>();
  const locations = new Map<string, Usage>();
  const timesOfDay = new Map<string, Usage>();
  const slugModifiers = new Map<string, Usage>();
  const parentheticals = new Map<string, Usage>();
  const transitions = new Map<string, Usage>();
  const lastTimeByLocation: Record<string, string> = {};
  const lastSlugByLocation: Record<string, string> = {};

  for (const element of document.elements) {
    if (element.type === "character") {
      addUsage(characters, element.text, element.line);
    }
    if (element.type === "scene-heading") {
      const { base, modifier } = splitSlugModifier(element.text);
      if (modifier) addUsage(slugModifiers, modifier, element.line);
      const parts =
        parseSceneHeadingParts(base) ?? forcedSceneHeadingParts(base);
      if (!parts) continue;
      if (
        parts.type === "" &&
        parts.timeOfDay === null &&
        knownTimes.has(parts.location.toLocaleUpperCase())
      ) {
        addUsage(standaloneTimes, parts.location, element.line);
        addUsage(timesOfDay, parts.location, element.line);
        continue;
      }
      if (parts.location) {
        addUsage(locations, parts.location, element.line);
        lastSlugByLocation[parts.location.toLocaleUpperCase()] = [
          parts.location,
          parts.timeOfDay ? ` - ${parts.timeOfDay}` : "",
          modifier ? ` (${modifier})` : "",
        ].join("");
      }
      if (parts.timeOfDay) {
        addUsage(timesOfDay, parts.timeOfDay, element.line);
        if (parts.location) {
          lastTimeByLocation[parts.location.toLocaleUpperCase()] =
            parts.timeOfDay;
        }
      }
    }
    if (element.type === "parenthetical") {
      addUsage(parentheticals, element.text, element.line);
    }
    if (element.type === "transition") {
      addUsage(transitions, element.text, element.line);
    }
  }

  return {
    characterGroups: characterGroups(document, [...characters.values()]),
    characters: [...characters.values()],
    locations: [...locations.values()],
    timesOfDay: [...timesOfDay.values()],
    standaloneTimes: [...standaloneTimes.values()],
    slugModifiers: [...slugModifiers.values()],
    parentheticals: [...parentheticals.values()],
    transitions: [...transitions.values()],
    lastTimeByLocation,
    lastSlugByLocation,
  };
}

/**
 * Groups of known characters written in action lines: "Jen and Blake",
 * "Jen, Blake, and George" (with or without the Oxford comma), as written.
 */
function characterGroups(
  document: ScreenplayDocument,
  characters: readonly Usage[],
): Usage[] {
  const names = characters
    .map((usage) => usage.value.trim())
    .filter((name) => name.length > 0)
    .sort((a, b) => b.length - a.length)
    .slice(0, 300)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"));
  if (names.length < 2) return [];
  const name = `(?:${names.join("|")})`;
  const group = new RegExp(
    `(?<![\\p{L}\\p{N}_])${name}(?:,\\s+${name})*,?\\s+and\\s+${name}(?![\\p{L}\\p{N}_])`,
    "giu",
  );
  const groups = new Map<string, Usage>();
  for (const element of document.elements) {
    if (element.type !== "action") continue;
    for (const match of element.text.matchAll(group)) {
      addUsage(groups, match[0].replace(/\s+/gu, " "), element.line);
    }
  }
  return [...groups.values()];
}

export function rankUsages(
  usages: readonly Usage[],
  query: string,
  recentWeight: number,
  limit: number,
): Usage[] {
  const normalizedQuery = query.trim().toLocaleUpperCase();
  const maxCount = Math.max(1, ...usages.map((usage) => usage.count));
  const maxPosition = Math.max(
    1,
    ...usages.map((usage) => usage.lastUsedPosition),
  );
  const recency = Math.min(1, Math.max(0, recentWeight));

  return usages
    .filter((usage) =>
      usage.value.toLocaleUpperCase().startsWith(normalizedQuery),
    )
    .map((usage) => ({
      usage,
      score:
        (usage.count / maxCount) * (1 - recency) +
        (usage.lastUsedPosition / maxPosition) * recency,
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.usage.count - left.usage.count ||
        left.usage.value.localeCompare(right.usage.value),
    )
    .slice(0, Math.max(1, limit))
    .map(({ usage }) => usage);
}

export function preferredAndRecentTimes(
  index: ScreenplayIndex,
  preferred: readonly string[] = DEFAULT_TIMES_OF_DAY,
): Usage[] {
  return preferredAndRecent(index.timesOfDay, preferred);
}

/** Preferred values (in order) merged with the ones used in the script. */
export function preferredAndRecent(
  used: readonly Usage[],
  preferred: readonly string[],
): Usage[] {
  const combined = new Map<string, Usage>();
  const maximumPosition = Math.max(
    0,
    ...used.map((usage) => usage.lastUsedPosition),
  );

  for (const [offset, value] of preferred.entries()) {
    // The first preferred value counts as the most recent, so the list
    // keeps its order (DAY before NIGHT) among values used no more (#332).
    addUsage(combined, value, maximumPosition - 1 - offset);
  }
  for (const usage of used) {
    const existing = combined.get(usageKey(usage.value));
    if (existing) {
      existing.count += usage.count;
      existing.lastUsedPosition = Math.max(
        existing.lastUsedPosition,
        usage.lastUsedPosition,
      );
    } else {
      combined.set(usageKey(usage.value), { ...usage });
    }
  }

  return [...combined.values()];
}
