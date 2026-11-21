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
import { classifyLines, type LineKind } from "../screenplay/lines";

/*
 * The note's lines and what each one is (cue, dialogue, action…), worked
 * out once per version of the note and shared. Enter, Tab and the layout
 * all ask these questions on the same keystroke; each used to copy and
 * classify the whole note again. A note's text (`Text`) never changes once
 * made, so a result kept for it stays right; an edit makes a new `Text`.
 *
 * The arrays returned are shared: read them, never change them.
 */

const linesCache = new WeakMap<Text, readonly string[]>();
const kindsCache = new WeakMap<
  Text,
  Map<number, readonly (LineKind | null)[]>
>();

/** The note's lines, as `doc.toString().split("\n")` would give them. */
export function docLines(doc: Text): readonly string[] {
  let lines = linesCache.get(doc);
  if (lines === undefined) {
    const list: string[] = [];
    for (const line of doc.iterLines()) list.push(line);
    lines = list;
    linesCache.set(doc, lines);
  }
  return lines;
}

/**
 * Each line's element, as `classifyLines(docLines(doc), { cursorLine })`
 * would give it (`cursorLine` 0-based, -1 for none).
 */
export function docLineKinds(
  doc: Text,
  cursorLine = -1,
): readonly (LineKind | null)[] {
  let byCursor = kindsCache.get(doc);
  if (byCursor === undefined) {
    byCursor = new Map();
    kindsCache.set(doc, byCursor);
  }
  let kinds = byCursor.get(cursorLine);
  if (kinds === undefined) {
    kinds = classifyLines(docLines(doc), { cursorLine });
    byCursor.set(cursorLine, kinds);
  }
  return kinds;
}
