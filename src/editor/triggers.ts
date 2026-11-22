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

/*
 * The typed characters that start a variable ("$") or a character name in
 * action ("+"). Both are settings.
 */

/** `text` safe to use inside a regular expression. */
export function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/-]/gu, "\\$&");
}

/**
 * Characters that already mean something in Fountain or Markdown (forced
 * elements, notes, emphasis, boneyard, wrylies) or inside names, so they
 * can't start a variable or a character name.
 */
const RESERVED = new Set([..."@!#.>~=[]()*_/\\^\"'’-,:;?<`"]);

/**
 * Why `value` can't be a trigger character, or null if it can: exactly one
 * character, not a letter, digit or space, not reserved (see RESERVED),
 * and not the same as `other` (the other trigger).
 */
export function triggerProblem(value: string, other: string): string | null {
  const characters = [...value];
  if (characters.length !== 1) return "Use exactly one character.";
  const character = characters[0] ?? "";
  if (/[\p{L}\p{N}\s]/u.test(character)) {
    return "Use a symbol, not a letter, digit or space.";
  }
  if (RESERVED.has(character)) {
    return `${character} already means something in Fountain or Markdown.`;
  }
  if (character === other) return "The two triggers must be different.";
  return null;
}
