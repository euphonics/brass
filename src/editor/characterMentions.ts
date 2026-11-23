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

/** A name that is itself a group ("JEN AND BLAKE" listed as a character). */
function isGroupName(name: string): boolean {
  return /,|&|\band\b/iu.test(name);
}

/**
 * The characters named in `sceneText` (the scene so far, cues and action),
 * in the order they first appear: everyone in the scene, not only those
 * who speak (#282). `known` are the script's character names.
 */
export function sceneCharacters(
  sceneText: string,
  known: readonly string[],
): string[] {
  const found: { name: string; at: number }[] = [];
  for (const name of known) {
    if (name.trim() === "" || isGroupName(name)) continue;
    const match = new RegExp(
      `(?<![\\p{L}\\p{N}_])${escapeForRegExp(name)}(?![\\p{L}\\p{N}_])`,
      "iu",
    ).exec(sceneText);
    if (match) found.push({ name, at: match.index });
  }
  return found.sort((a, b) => a.at - b.at).map(({ name }) => name);
}

/**
 * Group suggestions for a "+" mention, offered after the names (#255,
 * #282). Only groups starting with what was typed.
 *
 * - Plain text (`+Je`): groups the script already writes, most used first;
 *   then, for each scene character the text matches, pairs with the
 *   others and the Oxford-comma list of the whole scene.
 * - A list being typed (`+Jen, Blake, and H`): the names so far are kept
 *   and the last one is completed from the scene's characters, then the
 *   script's others: `Jen, Blake, and Helios`. After a comma
 *   (`+Jen, B`) the list goes on with one more name each
 *   (`Jen, Blake, and Helios`), and the rest of the scene.
 *
 * `names` are the names already offered above, so a group isn't listed
 * twice; `others` are the script's other characters.
 */
export function mentionGroups(
  typed: string,
  written: readonly string[],
  scene: readonly string[],
  spell: (name: string) => string,
  others: readonly string[] = [],
  names: readonly string[] = [],
): string[] {
  const query = typed.trimStart().toLocaleUpperCase();
  const caps = typedInCapitals(typed);
  const groups: string[] = [];
  const seen = new Set(names.map((name) => name.toLocaleUpperCase()));
  // Letters and digits only, so spaces and commas don't have to be typed:
  // "+Jenandb" finds "Jen and Blake" (#286).
  const compact = (text: string) =>
    text.toLocaleUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
  const compactQuery = compact(query);
  // `matched`: the group was built from what was typed (a list), so it
  // needn't start with it ("Jen, Blake, H" -> "Jen, Blake, and Helios").
  const add = (group: string, matched = false) => {
    const text = caps ? group.toLocaleUpperCase() : group;
    const key = text.toLocaleUpperCase();
    if (seen.has(key) || key === query) return;
    if (!matched && !compact(key).startsWith(compactQuery)) return;
    seen.add(key);
    groups.push(text);
  };
  const sceneNames = [...new Set(scene.map(spell))];
  const otherNames = [...new Set(others.filter((n) => !isGroupName(n)))]
    .map(spell)
    .filter((name) => !sceneNames.includes(name));
  const everyone = [...sceneNames, ...otherNames];
  const same = (a: string, b: string) =>
    a.toLocaleUpperCase() === b.toLocaleUpperCase();

  for (const group of written) add(group);

  const separator = /(,\s*(?:and\s+)?|\s+and\s+)(?=[^,]*$)/iu.exec(typed);
  if (separator !== null) {
    const chosenText = typed
      .slice(0, separator.index)
      .split(/\s*,\s*(?:and\s+)?|\s+and\s+/iu)
      .map((part) => part.trim())
      .filter((part) => part !== "");
    // Each name typed so far: the name itself, or the first one in the
    // scene (then the script) that starts with it ("+j,b": Jen, then B…).
    const chosen = chosenText.map(
      (part) =>
        everyone.find((name) => same(name, part)) ??
        everyone.find((name) =>
          name.toLocaleUpperCase().startsWith(part.toLocaleUpperCase()),
        ),
    );
    if (chosen.length > 0 && chosen.every((name) => name !== undefined)) {
      const picked = chosen;
      const partial = typed
        .slice(separator.index + separator[0].length)
        .trim()
        .toLocaleUpperCase();
      const left = everyone.filter(
        (name) => !picked.some((p) => same(p, name)),
      );
      const matching = left.filter((name) =>
        name.toLocaleUpperCase().startsWith(partial),
      );
      const afterComma = !/\band\s*$/iu.test(separator[0].trim() + " ");
      for (const next of matching) {
        if (!afterComma || picked.length >= 2) {
          add(oxfordList([...picked, next]), true);
        }
        if (afterComma) {
          const rest = sceneNames.filter(
            (name) => !same(name, next) && !picked.some((p) => same(p, name)),
          );
          for (const last of rest)
            add(oxfordList([...picked, next, last]), true);
          if (rest.length >= 2)
            add(oxfordList([...picked, next, ...rest]), true);
        }
      }
      return groups;
    }
  }

  for (const first of sceneNames) {
    const rest = sceneNames.filter((name) => name !== first);
    const pairs = rest.map((other) => oxfordList([first, other]));
    const whole = rest.length >= 2 ? [oxfordList([first, ...rest])] : [];
    // The whole scene comes after the first two pairs, so a long scene
    // doesn't push it out of the list.
    [...pairs.slice(0, 2), ...whole, ...pairs.slice(2)].forEach((group) =>
      add(group),
    );
  }
  return groups;
}
