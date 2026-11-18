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

import { StateEffect, StateField, type EditorState } from "@codemirror/state";
import { replacesWholeNote } from "./lineKindOverride";

/** The empty line where Smart Tab just opened a suggestion list. */
export interface TabMenuLine {
  /** Start of the line. */
  from: number;
  /**
   * A character cue goes here (Tab after action, or on a new block that
   * doesn't follow a heading or transition). The line keeps the cue's
   * column even when the character list is empty, e.g. in a script with
   * no characters yet.
   */
  cue: boolean;
}

/** Mark (or clear, with null) the line where Smart Tab opened a list. */
export const setTabMenuLine = StateEffect.define<TabMenuLine | null>();

/**
 * The empty line where Smart Tab just opened a list. It lasts while the
 * cursor stays on that line and the line is empty.
 */
export const tabMenuLineField = StateField.define<TabMenuLine | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTabMenuLine)) return effect.value;
    }
    if (value === null || replacesWholeNote(tr)) return null;
    const from = tr.changes.mapPos(value.from);
    const current = tr.state.doc.lineAt(tr.state.selection.main.head);
    return current.from === from && current.text.trim() === ""
      ? { ...value, from }
      : null;
  },
});

/**
 * Start of the empty cursor line where Tab put a character cue, or null.
 */
export function tabCueLine(state: EditorState): number | null {
  const marked = state.field(tabMenuLineField, false) ?? null;
  if (marked === null || !marked.cue) return null;
  const line = state.doc.lineAt(state.selection.main.head);
  return line.from === marked.from && line.text.trim() === ""
    ? marked.from
    : null;
}
