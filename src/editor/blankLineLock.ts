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

import { EditorSelection, EditorState } from "@codemirror/state";
import type { Extension, Text } from "@codemirror/state";
import { editorInfoField } from "obsidian";
import type ScribidianPlugin from "../main";

/*
 * Keep the cursor off blank lines between elements. A single blank line
 * between two blocks is what separates them in Fountain: typing on it joins
 * the blocks (an action line runs into the cue below and the speech stops
 * being dialogue). Like Final Draft, the cursor skips over it.
 */

/**
 * Whether line `lineNumber` (1-based) is a single blank line with text
 * directly above and below it: the separator between two blocks.
 */
export function isSeparatorLine(doc: Text, lineNumber: number): boolean {
  if (lineNumber <= 1 || lineNumber >= doc.lines) return false;
  if (doc.line(lineNumber).text.trim() !== "") return false;
  return (
    doc.line(lineNumber - 1).text.trim() !== "" &&
    doc.line(lineNumber + 1).text.trim() !== ""
  );
}

/**
 * Where the cursor goes instead of `head` when `head` lands on a separator
 * line, or null to leave it. Moving down (from `previous` to a later offset)
 * goes on to the start of the next line; moving up or clicking goes to the
 * end of the line above.
 */
export function cursorOffSeparator(
  doc: Text,
  previous: number,
  head: number,
  pointer: boolean,
): number | null {
  const line = doc.lineAt(head);
  if (!isSeparatorLine(doc, line.number)) return null;
  const down = !pointer && head > previous;
  return down ? doc.line(line.number + 1).from : doc.line(line.number - 1).to;
}

/**
 * The lock as an editor extension. Only cursor moves are changed (arrow
 * keys, clicks), never edits, and only in screenplay notes with the
 * setting on for the current editor mode. Selections are left alone.
 */
export function createBlankLineLockExtension(
  plugin: ScribidianPlugin,
): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (tr.docChanged || !tr.selection) return tr;
    const { selection } = tr;
    if (selection.ranges.length !== 1 || !selection.main.empty) return tr;
    if (!plugin.typingChangeEnabled("lockBlankLines")) return tr;
    const file = tr.startState.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return tr;
    const target = cursorOffSeparator(
      tr.newDoc,
      tr.startState.selection.main.head,
      selection.main.head,
      tr.isUserEvent("select.pointer"),
    );
    if (target === null) return tr;
    return [
      tr,
      { selection: EditorSelection.cursor(target), sequential: true },
    ];
  });
}
