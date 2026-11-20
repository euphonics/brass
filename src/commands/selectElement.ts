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

import { classifyLines, type LineKind } from "../screenplay/lines";

/** The kinds that make up one speech: the cue, its wrylies and dialogue. */
const SPEECH = new Set<LineKind>(["character", "parenthetical", "dialogue"]);

/**
 * The lines (0-based, inclusive) of the whole element around line `index`:
 * a speech (cue, wrylies and dialogue together), or a run of lines of one
 * kind with no blank line between them (an action paragraph). Null when
 * the line is blank or not part of the script.
 */
export function elementLines(
  lines: readonly string[],
  index: number,
): { from: number; to: number } | null {
  const kinds = classifyLines(lines);
  const kind = kinds[index] ?? null;
  if (kind === null || (lines[index] ?? "").trim() === "") {
    // A blank dialogue line ("  ") is part of its speech; other blank
    // lines belong to no element.
    if (kind !== "dialogue") return null;
  }
  const group = (at: number): string | null => {
    const k = kinds[at] ?? null;
    if (k === null) return null;
    return SPEECH.has(k) ? "speech" : k;
  };
  const own = group(index);
  if (own === null) return null;
  let from = index;
  // Up: a speech ends at its cue; anything else at a different kind.
  while (from > 0 && kinds[from] !== "character" && group(from - 1) === own) {
    from -= 1;
  }
  let to = index;
  // Down: a new cue starts another speech.
  while (
    to + 1 < lines.length &&
    group(to + 1) === own &&
    kinds[to + 1] !== "character"
  ) {
    to += 1;
  }
  return { from, to };
}
