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

import type { ScreenplayIndex } from "./model";

/** The frontmatter property that lists characters for the suggestion lists. */
export const LISTED_CHARACTERS_PROPERTY = "characters";

/**
 * The names in a note's `characters` property, in capitals, once each: a
 * list (`[Jen, Bob]`, or links like `[[Jen]]` and `[[Jen Smith|Jen]]`) or
 * one comma-separated text ("Jen, Bob"). A link's shown text wins.
 */
export function listedCharacters(
  properties: Record<string, unknown>,
): string[] {
  const value = properties[LISTED_CHARACTERS_PROPERTY];
  const items: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const names: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const link = /^\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*$/u.exec(item);
    const name = (link ? (link[2] ?? link[1] ?? "") : item)
      .trim()
      .replace(/\s+/gu, " ")
      .toLocaleUpperCase();
    if (name !== "" && !names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * `index` with the listed characters added to its characters, for the
 * suggestion lists: a character listed but not yet speaking has no uses
 * and was never recent, so the speaking ones rank first.
 */
export function withListedCharacters(
  index: ScreenplayIndex,
  names: readonly string[],
): ScreenplayIndex {
  const known = new Set(
    index.characters.map((usage) => usage.value.toLocaleUpperCase()),
  );
  const added = names
    .filter((name) => !known.has(name.toLocaleUpperCase()))
    .map((value) => ({ value, count: 0, lastUsedPosition: 0 }));
  return added.length === 0
    ? index
    : { ...index, characters: [...index.characters, ...added] };
}
