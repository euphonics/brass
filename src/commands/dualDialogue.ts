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

import { Notice } from "obsidian";
import type { Editor } from "obsidian";
import { characterCue } from "../screenplay/lines";

/** A cue ending in Fountain's dual dialogue caret: "JEN ^". */
const DUAL_CARET = /\s*\^\s*$/u;

function isBlank(line: string | undefined): boolean {
  return line === undefined || line.trim() === "";
}

/** The first line of the paragraph holding `line`. */
function blockStart(lines: readonly string[], line: number): number {
  let start = line;
  while (start > 0 && !isBlank(lines[start - 1])) start -= 1;
  return start;
}

/** A speech: a cue with at least one line under it in the same paragraph. */
function isSpeech(lines: readonly string[], start: number): boolean {
  return (
    characterCue(lines[start] ?? "") !== null && !isBlank(lines[start + 1])
  );
}

/**
 * Toggle dual dialogue for the speech holding `cursorLine` (#211): remove
 * the "^" from its cue, or add one when there's a speech right above to
 * pair with. Returns the cue line's new text, or a problem to show.
 */
export function toggleDualDialogue(
  lines: readonly string[],
  cursorLine: number,
): { line: number; text: string } | { problem: string } {
  if (isBlank(lines[cursorLine])) {
    return { problem: "Put the cursor in a speech to make it dual dialogue." };
  }
  const start = blockStart(lines, cursorLine);
  if (!isSpeech(lines, start)) {
    return { problem: "Put the cursor in a speech to make it dual dialogue." };
  }
  const cue = lines[start] ?? "";
  if (DUAL_CARET.test(cue)) {
    return { line: start, text: cue.replace(DUAL_CARET, "") };
  }
  let above = start - 1;
  while (above >= 0 && isBlank(lines[above])) above -= 1;
  const aboveStart = above < 0 ? -1 : blockStart(lines, above);
  if (aboveStart < 0 || !isSpeech(lines, aboveStart)) {
    return {
      problem:
        "Dual dialogue needs a speech right above this one to pair with.",
    };
  }
  if (DUAL_CARET.test(lines[aboveStart] ?? "")) {
    return {
      problem:
        "The speech above is already the second half of a dual dialogue pair.",
    };
  }
  return { line: start, text: `${cue.trimEnd()} ^` };
}

/** The command: toggle dual dialogue at the cursor, keeping the cursor. */
export function toggleDualDialogueInEditor(editor: Editor): void {
  const cursor = editor.getCursor();
  const lines = Array.from({ length: editor.lineCount() }, (_, line) =>
    editor.getLine(line),
  );
  const result = toggleDualDialogue(lines, cursor.line);
  if ("problem" in result) {
    new Notice(result.problem);
    return;
  }
  const old = lines[result.line] ?? "";
  editor.replaceRange(
    result.text,
    { line: result.line, ch: 0 },
    { line: result.line, ch: old.length },
  );
  if (cursor.line === result.line) {
    editor.setCursor({
      line: cursor.line,
      ch: Math.min(cursor.ch, result.text.length),
    });
  } else {
    editor.setCursor(cursor);
  }
}
