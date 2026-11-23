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

import { escapeForRegExp } from "./triggers";

/*
 * "+" character mentions ("+" by default, a setting), a Scribidian addition: typing "+" in an action
 * line lists the characters, and picking one writes the name in place of
 * "+" and what was typed. A faster way to type names in action.
 */

/**
 * The "+" mention being typed right before the cursor ("+je" in "She sees
 * +je"), or null: the name typed so far, maybe empty (right after "+").
 * Not right after a letter, digit or "+" ("C++", "1+1").
 */
export function mentionAtEnd(
  before: string,
  prefix = "+",
): { typed: string } | null {
  const escaped = escapeForRegExp(prefix);
  const match = new RegExp(
    `(?:^|[^\\p{L}\\p{N}_${escaped}])${escaped}([\\p{L}\\p{N}'’., -]{0,80})$`,
    "u",
  ).exec(before);
  return match ? { typed: match[1] ?? "" } : null;
}

const hasLetter = /\p{L}/u;

/**
 * How to write `name` (a cue's spelling, in capitals) in an action line:
 * in capitals when the writer typed capitals ("+JE"); otherwise as the
 * note already writes it in mixed case ("McAllister"), the most common
 * spelling first, or else with each word capitalized ("Mary Ann").
 */
export function mentionText(
  name: string,
  typed: string,
  source: string,
): string {
  if (typedInCapitals(typed)) return name.toLocaleUpperCase();
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const spellings = new Map<string, number>();
  for (const match of source.matchAll(
    new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "giu"),
  )) {
    const found = match[0];
    if (found === found.toLocaleUpperCase()) continue;
    spellings.set(found, (spellings.get(found) ?? 0) + 1);
  }
  const best = [...spellings.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best !== undefined) return best[0];
  return name
    .toLocaleLowerCase()
    .replace(
      /(^|[\s'’.-])(\p{L})/gu,
      (_, start: string, letter: string) =>
        `${start}${letter.toLocaleUpperCase()}`,
    );
}

/** True when the writer typed the mention in capitals ("+JE"). */
function typedInCapitals(typed: string): boolean {
  return (
    hasLetter.test(typed) &&
    typed === typed.toLocaleUpperCase() &&
    typed !== typed.toLocaleLowerCase()
  );
}

/** "Jen and Blake"; "Jen, Blake, and George". */
function oxfordList(names: readonly string[]): string {
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/**
 * Group suggestions for a "+" mention, offered after the names (#255):
 * first the groups the script already writes ("Jen and Blake"), in the
 * order given (most used first); then, from the current scene's speakers
 * (in order of appearance), each pair and the whole Oxford-comma list,
 * for every speaker the typed text matches. Only groups that start with
 * what was typed ("Jen, B" keeps "Jen, Blake, and George").
 */
export function mentionGroups(
  typed: string,
  written: readonly string[],
  sceneNames: readonly string[],
  spell: (name: string) => string,
): string[] {
  const query = typed.trimStart().toLocaleUpperCase();
  const caps = typedInCapitals(typed);
  const groups: string[] = [];
  const seen = new Set<string>();
  const add = (group: string) => {
    const text = caps ? group.toLocaleUpperCase() : group;
    const key = text.toLocaleUpperCase();
    if (seen.has(key) || key === query || !key.startsWith(query)) return;
    seen.add(key);
    groups.push(text);
  };
  written.forEach(add);
  const names = sceneNames.map(spell);
  for (const first of names) {
    const others = names.filter((name) => name !== first);
    for (const other of others) add(oxfordList([first, other]));
    if (others.length >= 2) add(oxfordList([first, ...others]));
  }
  return groups;
}
