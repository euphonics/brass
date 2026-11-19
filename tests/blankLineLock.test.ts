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

import { EditorSelection, EditorState, Text } from "@codemirror/state";
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", async () => {
  const { StateField } = await import("@codemirror/state");
  return {
    editorInfoField: StateField.define({
      create: () => ({ file: { path: "script.md" } }),
      update: (value) => value,
    }),
  };
});

const {
  createBlankLineLockExtension,
  cursorOffSeparator,
  isSeparatorLine,
  mergeWithLineAbove,
  mergeWithLineBelow,
  separatorRemoved,
} = await import("../src/editor/blankLineLock");
const { editorInfoField } = await import("obsidian");
const { lineKindField, setLineKind } =
  await import("../src/editor/lineKindOverride");

const doc = Text.of([
  "Edgar strokes her.", // line 1
  "", // line 2: separator
  "EDGAR", // line 3
  "You're in the feeling now.", // line 4
  "", // line 5: two blank lines, not a separator
  "", // line 6
  "She runs.", // line 7
]);

describe("blank line lock", () => {
  it("finds the single blank line between two elements", () => {
    expect(isSeparatorLine(doc, 2)).toBe(true);
    expect(isSeparatorLine(doc, 5)).toBe(false);
    expect(isSeparatorLine(doc, 6)).toBe(false);
    expect(isSeparatorLine(doc, 3)).toBe(false);
  });

  it("sees a Backspace or Delete that would remove the separator", () => {
    const line = (n: number) => doc.line(n);
    // Backspace at the start of "EDGAR": back to the end of line 1.
    expect(separatorRemoved(doc, line(2).to, line(3).from)).toBe(line(1).to);
    // Delete at the end of line 1.
    expect(separatorRemoved(doc, line(1).to, line(2).from)).toBe(line(1).to);
    // One of two blank lines can go.
    expect(separatorRemoved(doc, line(5).to, line(6).from)).toBeNull();
    expect(separatorRemoved(doc, line(6).to, line(7).from)).toBeNull();
  });

  it("does not lock a blank dialogue line of two spaces", () => {
    const speech = Text.of(["CODY", "Test.", "  ", "Test."]);
    expect(isSeparatorLine(speech, 3)).toBe(false);
  });

  it("does not lock a blank first or last line", () => {
    const edges = Text.of(["", "INT. ROOF - DAY", ""]);
    expect(isSeparatorLine(edges, 1)).toBe(false);
    expect(isSeparatorLine(edges, 3)).toBe(false);
  });

  it("moves down onto the next line", () => {
    const blank = doc.line(2).from;
    const before = doc.line(1).to;
    expect(cursorOffSeparator(doc, before, blank, false)).toBe(
      doc.line(3).from,
    );
  });

  it("moves up, or on a click, to the end of the line above", () => {
    const blank = doc.line(2).from;
    expect(cursorOffSeparator(doc, doc.line(3).from, blank, false)).toBe(
      doc.line(1).to,
    );
    expect(cursorOffSeparator(doc, doc.line(4).to, blank, true)).toBe(
      doc.line(1).to,
    );
  });

  it("leaves other lines alone", () => {
    expect(cursorOffSeparator(doc, 0, doc.line(5).from, false)).toBeNull();
    expect(cursorOffSeparator(doc, 0, doc.line(3).from, true)).toBeNull();
  });

  describe("Backspace", () => {
    const plugin = {
      typingChangeEnabled: () => true,
      isScreenplayFile: () => true,
    } as unknown as Parameters<typeof createBlankLineLockExtension>[0];
    const lines = [
      "George offers it to Jen.", // line 1
      "", // line 2
      "", // line 3: cursor here
      "GEORGE", // line 4
      "You are not Jen.", // line 5
    ];
    const stateAt = (text: string[], line: number) => {
      const state = EditorState.create({
        doc: Text.of(text),
        extensions: [
          editorInfoField,
          lineKindField,
          createBlankLineLockExtension(plugin),
        ],
      });
      return state.update({
        selection: EditorSelection.cursor(state.doc.line(line).from),
      }).state;
    };
    const backspace = (state: EditorState) => {
      const head = state.selection.main.head;
      return state.update({
        changes: { from: head - 1, to: head },
        selection: EditorSelection.cursor(head - 1),
        userEvent: "delete.backward",
      }).state;
    };

    it("puts the cursor at the end of the line above, not on the separator", () => {
      const after = backspace(stateAt(lines, 3));
      expect(after.doc.lines).toBe(4);
      expect(after.selection.main.head).toBe(after.doc.line(1).to);
    });

    it("at the end of the note, skips the blank line under the speech", () => {
      const speech = ["CHARACTER", "Hi.", "", ""];
      const after = backspace(stateAt(speech, 4));
      expect(after.selection.main.head).toBe(after.doc.line(2).to);
    });

    it("drops a line's element choice when it merges into the line above", () => {
      const speech = ["CHARACTER", "Hi.", "", ""];
      const start = stateAt(speech, 4);
      const chosen = start.update({
        effects: setLineKind.of({
          from: start.doc.line(4).from,
          kind: "action",
        }),
      }).state;
      expect(chosen.field(lineKindField)).not.toBeNull();
      expect(backspace(chosen).field(lineKindField)).toBeNull();
    });

    it("leaves Backspace alone when the cursor doesn't land on a separator", () => {
      const fourBlank = ["Action.", "", "", "", "", "JANE", "Hi."];
      const after = backspace(stateAt(fourBlank, 4));
      expect(after.selection.main.head).toBe(after.doc.line(3).from);
    });

    it("won't join a cue and its dialogue: moves to the end of the cue", () => {
      const speech = ["Action.", "", "CODY", "Test"];
      const after = backspace(stateAt(speech, 4));
      expect(after.doc.toString()).toBe(speech.join("\n"));
      expect(after.selection.main.head).toBe(after.doc.line(3).to);
    });

    it("doesn't join action to a cue below it", () => {
      const blocks = ["Fiona glows.", "", "BLAKE", "Hi."];
      const after = backspace(stateAt(blocks, 3));
      expect(after.doc.toString()).toBe(blocks.join("\n"));
    });

    it("leaves the cursor on a line cleared without joining lines", () => {
      const state = stateAt(["MARA", "Hello"], 2);
      const line = state.doc.line(2);
      // Ctrl+Backspace at the end: the word goes, the line break stays.
      const after = state.update({
        changes: { from: line.from, to: line.to },
        selection: EditorSelection.cursor(line.from),
        userEvent: "delete.backward",
      }).state;
      expect(after.doc.toString()).toBe("MARA\n");
      expect(after.selection.main.head).toBe(after.doc.line(2).from);
    });

    it("joins two action blocks into one paragraph", () => {
      const blocks = ["Fiona glows.", "", "Blake eyes a camera."];
      const after = backspace(stateAt(blocks, 3));
      expect(after.doc.toString()).toBe("Fiona glows. Blake eyes a camera.");
      expect(after.selection.main.head).toBe("Fiona glows. ".length);
    });

    it("joins two action blocks with Delete too", () => {
      const blocks = ["Fiona glows.", "", "Blake eyes a camera."];
      const state = stateAt(blocks, 1);
      const end = state.doc.line(1).to;
      const after = state
        .update({ selection: EditorSelection.cursor(end) })
        .state.update({
          changes: { from: end, to: end + 1 },
          userEvent: "delete.forward",
        }).state;
      expect(after.doc.toString()).toBe("Fiona glows. Blake eyes a camera.");
    });

    it("still joins two lines of the same element", () => {
      const speech = ["CODY", "Line one", "line two"];
      const after = backspace(stateAt(speech, 3));
      expect(after.doc.line(2).text).toBe("Line oneline two");
    });

    it("Delete at the end of a cue does nothing", () => {
      const speech = ["Action.", "", "CODY", "Test"];
      const state = stateAt(speech, 3);
      const end = state.doc.line(3).to;
      const placed = state.update({
        selection: EditorSelection.cursor(end),
      }).state;
      const after = placed.update({
        changes: { from: end, to: end + 1 },
        userEvent: "delete.forward",
      }).state;
      expect(after.doc.toString()).toBe(speech.join("\n"));
    });

    it("does nothing with the setting off", () => {
      const off = { ...plugin, typingChangeEnabled: () => false };
      const state = EditorState.create({
        doc: Text.of(lines),
        extensions: [
          editorInfoField,
          createBlankLineLockExtension(off as unknown as typeof plugin),
        ],
      });
      const placed = state.update({
        selection: EditorSelection.cursor(state.doc.line(3).from),
      }).state;
      const after = backspace(placed);
      expect(after.selection.main.head).toBe(after.doc.line(2).from);
    });
  });

  describe("Delete and merge with line above", () => {
    const plugin = {
      typingChangeEnabled: () => true,
      isScreenplayFile: () => true,
    } as unknown as Parameters<typeof createBlankLineLockExtension>[0];
    const run = (text: string[], line: number, ch: number) => {
      let state = EditorState.create({
        doc: Text.of(text),
        extensions: [editorInfoField, createBlankLineLockExtension(plugin)],
      });
      state = state.update({
        selection: EditorSelection.cursor(state.doc.line(line).from + ch),
      }).state;
      const view = {
        get state() {
          return state;
        },
        dispatch: (spec: Parameters<EditorState["update"]>[0]) => {
          state = state.update(spec).state;
        },
      };
      const handled = mergeWithLineAbove(
        view as unknown as Parameters<typeof mergeWithLineAbove>[0],
      );
      return { handled, state };
    };

    it("joins a line to a different element above, in its element", () => {
      const { state } = run(["Action.", "", "CODY", "Test"], 4, 0);
      expect(state.doc.line(3).text).toBe("CODYTEST");
      expect(state.selection.main.head).toBe(state.doc.line(3).from + 4);
    });

    it("joins across blank lines to the line with text above", () => {
      const { state } = run(["She runs.", "", "He waits."], 3, 0);
      expect(state.doc.toString()).toBe("She runs.He waits.");
    });

    it("deletes one character mid-line", () => {
      const { state } = run(["CODY", "Test"], 2, 2);
      expect(state.doc.line(2).text).toBe("Tst");
    });

    it("does nothing at the start of the note", () => {
      expect(run(["CODY"], 1, 0).handled).toBe(false);
    });

    it("Shift+Delete joins the next line with text onto a slugline", () => {
      let state = EditorState.create({
        doc: Text.of([".OFFICE", "", "computer fiona pulls open"]),
        extensions: [editorInfoField, createBlankLineLockExtension(plugin)],
      });
      state = state.update({
        selection: EditorSelection.cursor(state.doc.line(1).to),
      }).state;
      const view = {
        get state() {
          return state;
        },
        dispatch: (spec: Parameters<EditorState["update"]>[0]) => {
          state = state.update(spec).state;
        },
      };
      mergeWithLineBelow(
        view as unknown as Parameters<typeof mergeWithLineBelow>[0],
      );
      expect(state.doc.toString()).toBe(".OFFICECOMPUTER FIONA PULLS OPEN");
      expect(state.selection.main.head).toBe(".OFFICE".length);
    });
  });
});
