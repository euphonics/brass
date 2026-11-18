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
import { describe, expect, it } from "vitest";
import {
  setTabMenuLine,
  tabCueLine,
  tabMenuLineField,
} from "../src/editor/tabCueLine";

const marked = (cue: boolean) => {
  const doc = "She runs.\n\n";
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(doc.length),
    extensions: [tabMenuLineField],
  });
  return state.update({
    effects: setTabMenuLine.of({ from: doc.length, cue }),
  }).state;
};

describe("Tab cue line", () => {
  it("marks the empty line where Tab put a cue", () => {
    const state = marked(true);
    expect(tabCueLine(state)).toBe(state.doc.length);
  });

  it("ignores a line marked for a slugline", () => {
    expect(tabCueLine(marked(false))).toBeNull();
  });

  it("clears once the line has text or the cursor leaves", () => {
    const state = marked(true);
    const typed = state.update({
      changes: { from: state.doc.length, insert: "j" },
      selection: EditorSelection.cursor(state.doc.length + 1),
    }).state;
    expect(typed.field(tabMenuLineField)).toBeNull();
    const moved = state.update({ selection: EditorSelection.cursor(0) }).state;
    expect(tabCueLine(moved)).toBeNull();
  });

  it("clears when the whole note is replaced, even at the same spot", () => {
    const state = marked(true);
    const doc = "Other text.\n";
    const replaced = state.update({
      changes: { from: 0, to: state.doc.length, insert: doc },
      selection: EditorSelection.cursor(doc.length),
    }).state;
    expect(replaced.field(tabMenuLineField)).toBeNull();
  });
});
