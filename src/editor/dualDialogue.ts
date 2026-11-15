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

import type { LayoutLineKind } from "./layoutClassifier";

/** One side of a dual dialogue: the cue and its speech. */
export interface DualSide {
  /** Cue without the "^" that marks the second speaker. */
  cue: string;
  lines: { kind: "dialogue" | "parenthetical"; text: string }[];
}

/** Two speeches shown side by side, as 0-based line numbers. */
export interface DualDialogue {
  startLine: number;
  endLine: number;
  left: DualSide;
  right: DualSide;
}

const SPEECH = new Set<LayoutLineKind | null>(["dialogue", "parenthetical"]);

function side(
  lines: readonly string[],
  kinds: readonly (LayoutLineKind | null)[],
  cueLine: number,
): { side: DualSide; endLine: number } {
  let end = cueLine;
  const speech: DualSide["lines"] = [];
  while (SPEECH.has(kinds[end + 1] ?? null)) {
    end += 1;
    speech.push({
      kind: kinds[end] === "parenthetical" ? "parenthetical" : "dialogue",
      text: (lines[end] ?? "").trim(),
    });
  }
  const cue = (lines[cueLine] ?? "")
    .trim()
    .replace(/^@/u, "")
    .replace(/\s*\^\s*$/u, "");
  return { side: { cue, lines: speech }, endLine: end };
}

/**
 * Fountain dual dialogue: a cue ending in "^" ("BLAKE ^") speaks at the
 * same time as the speech just before it. Returns each pair, from the first
 * cue to the last line of the second speech.
 */
export function findDualDialogue(
  lines: readonly string[],
  kinds: readonly (LayoutLineKind | null)[],
): DualDialogue[] {
  const pairs: DualDialogue[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (kinds[index] !== "character") continue;
    if (!/\^\s*$/u.test(lines[index] ?? "")) continue;
    // Back over blank lines to the end of the speech before.
    let previous = index - 1;
    while (previous >= 0 && (lines[previous] ?? "").trim() === "") {
      previous -= 1;
    }
    let cue = previous;
    while (cue >= 0 && SPEECH.has(kinds[cue] ?? null)) cue -= 1;
    if (cue < 0 || cue === previous || kinds[cue] !== "character") continue;
    if (/\^\s*$/u.test(lines[cue] ?? "")) continue;
    if (pairs.some((pair) => pair.endLine >= cue)) continue;
    const left = side(lines, kinds, cue);
    const right = side(lines, kinds, index);
    pairs.push({
      startLine: cue,
      endLine: right.endLine,
      left: left.side,
      right: right.side,
    });
    index = right.endLine;
  }
  return pairs;
}
