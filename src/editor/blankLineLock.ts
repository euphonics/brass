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

import {
  EditorSelection,
  EditorState,
  Prec,
  findClusterBreak,
} from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import type { Extension, Text, Transaction } from "@codemirror/state";
import { editorInfoField } from "obsidian";
import {
  classifyLines,
  isForcedTransition,
  isSceneHeading,
  isTransitionText,
  looksLikeCharacterCue,
} from "../screenplay/lines";
import type BrassPlugin from "../main";
import { docLineKinds } from "./docLines";

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
  const text = doc.line(lineNumber).text;
  if (text.trim() !== "") return false;
  // Two or more spaces: Fountain's blank line inside a speech, not a gap.
  if (/^ {2,}$/u.test(text)) return false;
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
 * Backspace landing on a blank line right under text, with nothing but
 * blank lines (or the end of the note) below: typing there would join the
 * block above, so the cursor goes to the end of that text instead. The
 * end of the note has no element below, so isSeparatorLine doesn't cover
 * it. Null to leave the cursor.
 */
export function offBlankUnderText(doc: Text, head: number): number | null {
  const line = doc.lineAt(head);
  if (line.number <= 1 || line.text.trim() !== "") return null;
  const above = doc.line(line.number - 1);
  if (above.text.trim() === "") return null;
  if (line.number < doc.lines && doc.line(line.number + 1).text.trim() !== "") {
    return null;
  }
  return above.to;
}

/**
 * When deleting `from`..`to` (one line break) removes the single blank
 * line separating two blocks, the end of the text above it; otherwise null.
 */
export function separatorRemoved(
  doc: Text,
  from: number,
  to: number,
): number | null {
  const above = doc.lineAt(from);
  const below = doc.lineAt(to);
  if (below.number !== above.number + 1) return null;
  if (isSeparatorLine(doc, above.number)) return doc.line(above.number - 1).to;
  if (isSeparatorLine(doc, below.number)) return above.to;
  return null;
}

/**
 * When deleting `from`..`to` removes the blank line between two action
 * blocks: the change that joins them into one paragraph instead (the line
 * break and blank line become a space), as in Fade In. Null otherwise.
 */
export function actionBlocksJoin(
  doc: Text,
  from: number,
  to: number,
): { from: number; to: number; insert: string } | null {
  const above = doc.lineAt(from);
  const below = doc.lineAt(to);
  if (below.number !== above.number + 1) return null;
  const blank = isSeparatorLine(doc, above.number)
    ? above.number
    : isSeparatorLine(doc, below.number)
      ? below.number
      : null;
  if (blank === null) return null;
  const textAbove = doc.line(blank - 1);
  const textBelow = doc.line(blank + 1);
  // The whole note: a cue is only a cue with its dialogue below it.
  const kinds = docLineKinds(doc);
  if (kinds[blank - 2] !== "action" || kinds[blank] !== "action") return null;
  const trimmedEnd = textAbove.from + textAbove.text.trimEnd().length;
  const startBelow =
    textBelow.from +
    (textBelow.text.length - textBelow.text.trimStart().length);
  return { from: trimmedEnd, to: startBelow, insert: " " };
}

/**
 * When deleting `from`..`to` removes the blank line under a name in
 * capitals standing on its own (a blank line or the top above it) with a
 * speech-like line below: the change that removes the whole blank line, so
 * the name becomes a cue and the line below its dialogue. Without it the
 * name reads as action and the two would join as action paragraphs
 * ("GEORGE Mm."). Null otherwise.
 */
export function cueGetsDialogue(
  doc: Text,
  from: number,
  to: number,
): { from: number; to: number; insert: string; cursor: number } | null {
  const above = doc.lineAt(from);
  const below = doc.lineAt(to);
  if (below.number !== above.number + 1) return null;
  const blank = isSeparatorLine(doc, above.number)
    ? above.number
    : isSeparatorLine(doc, below.number)
      ? below.number
      : null;
  if (blank === null) return null;
  const name = doc.line(blank - 1);
  const speech = doc.line(blank + 1);
  if (!looksLikeCharacterCue(name.text)) return null;
  if (blank - 1 > 1 && doc.line(blank - 2).text.trim() !== "") return null;
  const text = speech.text.trim();
  if (
    isSceneHeading(text) ||
    isTransitionText(text) ||
    isForcedTransition(text) ||
    looksLikeCharacterCue(text)
  ) {
    return null;
  }
  const start =
    speech.from + (speech.text.length - speech.text.trimStart().length);
  // The speech line's leading spaces go too: dialogue starts at its text.
  return { from: name.to, to: start, insert: "\n", cursor: name.to + 1 };
}

/**
 * Whether deleting `from`..`to` (with the cursor on line `cursorLine`,
 * 0-based) joins two lines of text that are different elements, such as a
 * character cue and the dialogue under it.
 */
export function joinsDifferentElements(
  doc: Text,
  from: number,
  to: number,
  cursorLine: number,
): boolean {
  const above = doc.lineAt(from);
  const below = doc.lineAt(to);
  if (above.number === below.number) return false;
  if (above.text.trim() === "" || below.text.trim() === "") return false;
  const lines = doc.sliceString(0, below.to).split("\n");
  const kinds = classifyLines(lines, { cursorLine });
  const kindAbove = kinds[above.number - 1] ?? null;
  const kindBelow = kinds[below.number - 1] ?? null;
  return kindAbove !== null && kindBelow !== null && kindAbove !== kindBelow;
}

/**
 * The lock as an editor extension, only in screenplay notes with the setting
 * on for the current editor mode. It changes cursor moves (arrow keys,
 * clicks) and Backspace: deleting an extra empty line so that the cursor
 * would land on a separator puts it at the end of the line above instead.
 * Backspace or Delete across a line break never joins two different
 * elements (a cue and its dialogue): Backspace moves to the end of the line
 * above instead, and Delete does nothing; Shift+Backspace joins them
 * anyway. Two action blocks join into one paragraph. Other edits and selections are left alone.
 */
export function createBlankLineLockExtension(
  plugin: BrassPlugin,
): Extension {
  const shiftBackspace = Prec.high(
    keymap.of([
      {
        key: "Shift-Backspace",
        run: (view) => {
          // With strict on or off: a join on purpose, in one press.
          const file = view.state.field(editorInfoField, false)?.file ?? null;
          if (file === null || !plugin.isScreenplayFile(file)) return false;
          return mergeWithLineAbove(view);
        },
      },
      {
        key: "Shift-Delete",
        run: (view) => {
          // With strict on or off: a join on purpose, in one press.
          const file = view.state.field(editorInfoField, false)?.file ?? null;
          if (file === null || !plugin.isScreenplayFile(file)) return false;
          return mergeWithLineBelow(view);
        },
      },
    ]),
  );
  const filter = EditorState.transactionFilter.of((tr) => {
    const backspace = tr.docChanged && tr.isUserEvent("delete.backward");
    const forward = tr.docChanged && tr.isUserEvent("delete.forward");
    if (tr.docChanged && !backspace && !forward) return tr;
    if (backspace || forward) {
      const join = elementJoin(plugin, tr);
      if (join !== null) {
        if (join.merge) {
          const { from, to, insert, cursor } = join.merge;
          return {
            changes: { from, to, insert },
            selection: EditorSelection.cursor(cursor ?? from + insert.length),
            userEvent: backspace ? "delete.backward" : "delete.forward",
            scrollIntoView: true,
          };
        }
        return backspace
          ? { selection: EditorSelection.cursor(join.aboveEnd) }
          : {};
      }
      if (forward) return tr;
    }
    // A Backspace that removed no line break (e.g. Ctrl+Backspace clearing
    // the words on a line) leaves the cursor where it is.
    if (backspace) {
      let joined = false;
      tr.changes.iterChanges((fromA, toA) => {
        if (tr.startState.doc.sliceString(fromA, toA).includes("\n")) {
          joined = true;
        }
      });
      if (!joined) return tr;
    }
    const selection = tr.selection ?? (backspace ? tr.newSelection : null);
    if (selection === null) return tr;
    if (selection.ranges.length !== 1 || !selection.main.empty) return tr;
    if (!plugin.typingChangeEnabled("lockBlankLines")) return tr;
    const file = tr.startState.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return tr;
    const target =
      cursorOffSeparator(
        tr.newDoc,
        tr.startState.selection.main.head,
        selection.main.head,
        backspace || tr.isUserEvent("select.pointer"),
      ) ??
      (backspace ? offBlankUnderText(tr.newDoc, selection.main.head) : null);
    if (target === null) return tr;
    return [
      tr,
      { selection: EditorSelection.cursor(target), sequential: true },
    ];
  });
  return [filter, shiftBackspace];
}

/**
 * When `tr` is a Backspace or Delete with no selection that would join two
 * different elements, the end of the line above the join; otherwise null.
 */
function elementJoin(
  plugin: BrassPlugin,
  tr: Transaction,
): {
  aboveEnd: number;
  merge?: { from: number; to: number; insert: string; cursor?: number };
} | null {
  const start = tr.startState;
  if (start.selection.ranges.length !== 1 || !start.selection.main.empty) {
    return null;
  }
  let from = -1;
  let to = -1;
  let count = 0;
  tr.changes.iterChanges((fromA, toA) => {
    count += 1;
    from = fromA;
    to = toA;
  });
  if (count !== 1) return null;
  if (start.doc.lineAt(from).number === start.doc.lineAt(to).number) {
    return null;
  }
  if (!plugin.typingChangeEnabled("lockBlankLines")) return null;
  const file = start.field(editorInfoField, false)?.file ?? null;
  if (file === null || !plugin.isScreenplayFile(file)) return null;
  // Deleting the blank line between two blocks merges them (a cue after a
  // speech becomes its dialogue; a slugline ends up glued under action).
  // Backspace at the start of a block goes to the end of the block above;
  // Delete at the end of a block does nothing. Two action blocks join into
  // one paragraph instead, as in Fade In.
  const separator = separatorRemoved(start.doc, from, to);
  if (separator !== null) {
    const cue = cueGetsDialogue(start.doc, from, to);
    if (cue !== null) return { aboveEnd: separator, merge: cue };
    const merge = actionBlocksJoin(start.doc, from, to);
    return merge ? { aboveEnd: separator, merge } : { aboveEnd: separator };
  }
  const cursorLine = start.doc.lineAt(start.selection.main.head).number - 1;
  if (!joinsDifferentElements(start.doc, from, to, cursorLine)) return null;
  return { aboveEnd: start.doc.lineAt(from).to };
}

/** Elements whose text is in capitals: text joined onto them is too. */
const CAPITAL_KINDS = new Set(["scene-heading", "character", "transition"]);

/**
 * Join line `upper` (1-based) and the next line with text, removing the
 * line break and any blank lines between them. The joined text takes the
 * upper line's element: onto a slugline, cue or transition it goes in
 * capitals. Returns the change, or null when there is no line to join.
 */
function joinLines(
  state: EditorState,
  upperLine: number,
  lowerLine: number,
): { from: number; to: number; insert: string } | null {
  const doc = state.doc;
  if (upperLine < 1 || lowerLine > doc.lines || upperLine >= lowerLine) {
    return null;
  }
  const upper = doc.line(upperLine);
  const lower = doc.line(lowerLine);
  const kinds = docLineKinds(doc);
  const capitals = CAPITAL_KINDS.has(kinds[upperLine - 1] ?? "");
  const text = lower.text.trimStart();
  return {
    from: upper.to,
    to: lower.to,
    insert: capitals ? text.toLocaleUpperCase() : text,
  };
}

/** The nearest line with text before (`step` -1) or after (+1) `line`. */
function nearestTextLine(doc: Text, line: number, step: -1 | 1): number | null {
  for (
    let number = line + step;
    number >= 1 && number <= doc.lines;
    number += step
  ) {
    if (doc.line(number).text.trim() !== "") return number;
  }
  return null;
}

/**
 * Backspace that may join different elements ("Delete and merge with line
 * above", Shift+Backspace by default). At the start of a line it joins the
 * line onto the line with text above it (blank lines between go), and the
 * joined text takes that line's element; elsewhere it deletes like
 * Backspace. A selection is deleted.
 */
export function mergeWithLineAbove(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) {
    view.dispatch({
      changes: { from: range.from, to: range.to },
      selection: EditorSelection.cursor(range.from),
      scrollIntoView: true,
      userEvent: "delete.merge",
    });
    return true;
  }
  const line = state.doc.lineAt(range.head);
  if (
    range.head >
    line.from + (line.text.length - line.text.trimStart().length)
  ) {
    const from =
      findClusterBreak(line.text, range.head - line.from, false) + line.from;
    view.dispatch({
      changes: { from, to: range.head },
      selection: EditorSelection.cursor(from),
      scrollIntoView: true,
      userEvent: "delete.merge",
    });
    return true;
  }
  const above = nearestTextLine(state.doc, line.number, -1);
  if (above === null) return false;
  const join = joinLines(state, above, line.number);
  if (join === null) return false;
  view.dispatch({
    changes: join,
    selection: EditorSelection.cursor(join.from),
    scrollIntoView: true,
    userEvent: "delete.merge",
  });
  return true;
}

/**
 * Delete that may join different elements ("Delete and merge with line
 * below", Shift+Delete by default). At the end of a line it joins the line
 * with text below onto this one (blank lines between go), and the joined
 * text takes this line's element; elsewhere it deletes like Delete. A
 * selection is deleted.
 */
export function mergeWithLineBelow(view: EditorView): boolean {
  const { state } = view;
  const range = state.selection.main;
  if (!range.empty) {
    view.dispatch({
      changes: { from: range.from, to: range.to },
      selection: EditorSelection.cursor(range.from),
      scrollIntoView: true,
      userEvent: "delete.merge",
    });
    return true;
  }
  const line = state.doc.lineAt(range.head);
  if (range.head < line.from + line.text.trimEnd().length) {
    const to =
      findClusterBreak(line.text, range.head - line.from, true) + line.from;
    view.dispatch({
      changes: { from: range.head, to },
      selection: EditorSelection.cursor(range.head),
      scrollIntoView: true,
      userEvent: "delete.merge",
    });
    return true;
  }
  const below = nearestTextLine(state.doc, line.number, 1);
  if (below === null) return false;
  const join = joinLines(state, line.number, below);
  if (join === null) return false;
  view.dispatch({
    changes: join,
    selection: EditorSelection.cursor(join.from),
    scrollIntoView: true,
    userEvent: "delete.merge",
  });
  return true;
}
