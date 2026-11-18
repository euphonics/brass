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

import type { Text } from "@codemirror/state";
import {
  characterCue,
  classifyLines,
  type LineKind,
} from "../screenplay/lines";

/** How a line is laid out in the editor's screenplay layout. */
export type LayoutLineKind = LineKind;

/**
 * Lay out each line of a Fountain document for the editor, with the same
 * rules the parser uses. `null` means the line keeps Obsidian's normal look
 * (blank lines, frontmatter, Markdown headings and tags). `cursorLine`
 * (0-based) lets a character cue being typed show as a cue before its
 * dialogue exists.
 */
export function classifyLayoutLines(
  lines: readonly string[],
  cursorLine = -1,
  forced: { line: number; kind: LayoutLineKind } | null = null,
): (LayoutLineKind | null)[] {
  return classifyLines(lines, { cursorLine, forced });
}

/**
 * The "> " and " <" around centred text ("> THE END <") as [from, to]
 * offsets in the line, or null when the line is not centred text.
 */
export function centeredMarkers(
  text: string,
): [[number, number], [number, number]] | null {
  const match = /^(\s*>\s*)\S.*?(\s*<\s*)$/u.exec(text);
  if (!match) return null;
  const open = match[1] ?? "";
  const close = match[2] ?? "";
  return [
    [0, open.length],
    [text.length - close.length, text.length],
  ];
}

/** Offset of the "." that forces a scene heading, or -1. */
export function forcedHeadingDot(text: string): number {
  // Same rule as isSceneHeading: "." then anything but "." or a space.
  const match = /^\s*\.(?![.\s])/u.exec(text);
  return match ? match[0].length - 1 : -1;
}

/**
 * The element a suggestion list is for, from its first suggestion: the
 * character list centres an empty line like a cue, scene parts keep it at
 * the left margin, and so on.
 */
export function menuLineKind(
  detail: string | undefined,
): LayoutLineKind | null {
  if (!detail) return null;
  if (/dialogue blocks?$/u.test(detail)) return "character";
  if (detail === "Character extension") return "character";
  if (["Scene type", "Location", "Time", "Slug modifier"].includes(detail)) {
    return "scene-heading";
  }
  if (detail === "Transition") return "transition";
  if (detail === "Wryly") return "parenthetical";
  return null;
}

/**
 * Whether the cursor being on line `line` (0-based) can change how lines
 * are laid out. `classifyLines` only uses the cursor line for an empty line
 * (where the next cue or dialogue goes) and for a character cue on that
 * line or the line above it. Moving between other lines needn't reclassify.
 */
export function cursorAffectsLayout(doc: Text, line: number): boolean {
  if (line < 0 || line >= doc.lines) return true;
  const text = doc.line(line + 1).text;
  if (text.trim() === "") return true;
  if (characterCue(text) !== null) return true;
  return line > 0 && characterCue(doc.line(line).text) !== null;
}
