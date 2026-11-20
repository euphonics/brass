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

import { describe, expect, it } from "vitest";
import { Text } from "@codemirror/state";
import {
  centeredMarkers,
  cursorAffectsLayout,
  menuLineKind,
  classifyLayoutLines,
} from "../src/editor/layoutClassifier";

const classify = (text: string, cursorLine?: number) =>
  classifyLayoutLines(text.split("\n"), cursorLine);

describe("editor screenplay layout", () => {
  it("classifies each Fountain element", () => {
    const source = [
      "---",
      "screenplay: true",
      "---",
      "# Act One",
      "",
      "INT. KITCHEN - NIGHT",
      "",
      "Jen stirs a pot.",
      "",
      "JEN (O.S.)",
      "(quietly)",
      "I'm fine.",
      "Really.",
      "",
      "> CUT TO:",
      "",
      "> THE END <",
      "",
      "===",
      "~La la la",
      "",
      "[[note to self]]",
      "/* cut",
      "this */",
      ".LATER",
    ].join("\n");
    expect(classify(source)).toEqual([
      null,
      null,
      null,
      null,
      null,
      "scene-heading",
      null,
      "action",
      null,
      "character",
      "parenthetical",
      "dialogue",
      "dialogue",
      null,
      "transition",
      null,
      "centered",
      null,
      "page-break",
      "lyric",
      null,
      "note",
      "note",
      "note",
      "scene-heading",
    ]);
  });

  it("treats an all-caps line without dialogue as action, even while typed", () => {
    expect(classify("Text.\n\nBANG!\n\nMore.")[2]).toBe("action");
    // Being typed: stays action until the character list shows it (the
    // editor's job), Enter puts a line under it, or it starts with "@".
    expect(classify("Text.\n\nJEN", 2)[2]).toBe("action");
    expect(classify("Text.\n\nJEN")[2]).toBe("action");
    expect(classify("Text.\n\nJEN\n", 3)[2]).toBe("character");
    expect(classify("Text.\n\n@jen", 2)[2]).toBe("character");
  });

  it("reads capitals ending in punctuation as action, even with text below", () => {
    expect(classify("Text.\n\nBANG!\nShe falls.")[2]).toBe("action");
    expect(classify("Text.\n\nSILENCE.\nThen a knock.")[2]).toBe("action");
    // An extension is fine, and "@" forces a cue.
    expect(classify("Text.\n\nJEN (V.O.)\nHi.")[2]).toBe("character");
    expect(classify("Text.\n\n@BANG!\nHi.")[2]).toBe("character");
    // An extension with its ")" deleted is still being typed.
    expect(classify("Text.\n\nJEN (V.O.\nHi.")[2]).toBe("character");
    expect(classify("Text.\n\nJEN (V.O.) (CONT\nHi.")[2]).toBe("character");
  });

  it("needs a blank line before a cue", () => {
    expect(classify("She runs.\nJEN\nHi.")).toEqual([
      "action",
      "action",
      "action",
    ]);
  });

  it("leaves tags, callouts and Obsidian comments alone or muted", () => {
    expect(
      classify("#Character in TIGHTER\n\n> [!note] x\n\n%%\nhidden\n%%"),
    ).toEqual([null, null, null, null, "note", "note", "note"]);
  });

  it("centres the next cue and the dialogue line while they are typed", () => {
    // After a speech, the empty line where the next cue goes.
    expect(classify("BLAKE\nYou sure?\n\n", 3)[3]).toBe("character");
    // Not after action, and not when the cursor is elsewhere.
    expect(classify("She runs.\n\n", 2)[2]).toBeNull();
    expect(classify("BLAKE\nYou sure?\n\n")[3]).toBeNull();
    // A cue just picked, cursor on the empty line under it.
    const picked = classify("BLAKE\nYou sure?\n\nJEN\n", 4);
    expect(picked[3]).toBe("character");
    expect(picked[4]).toBe("dialogue");
    // Enter after a wryly: the empty line under it is the dialogue line.
    const wryly = classify("Action.\n\nTEST (O.S.)\n(beat)\n", 4);
    expect(wryly[3]).toBe("parenthetical");
    expect(wryly[4]).toBe("dialogue");
  });

  it("lays out a line turned back into action (Shift+Tab) as action", () => {
    const lines = "BLAKE\nYou sure?\n\n".split("\n");
    expect(classifyLayoutLines(lines, 3, { line: 3, kind: "action" })[3]).toBe(
      "action",
    );
    // Typing in caps there stays action rather than becoming a cue.
    const typed = "BLAKE\nYou sure?\n\nBANG\n".split("\n");
    expect(classifyLayoutLines(typed, 3, { line: 3, kind: "action" })[3]).toBe(
      "action",
    );
    // A blank pending-cue line set to a scene heading sits at the margin.
    expect(
      classifyLayoutLines(lines, 3, { line: 3, kind: "scene-heading" })[3],
    ).toBe("scene-heading");
  });

  it("keeps a # heading right after dialogue at the left margin", () => {
    expect(
      classify("BLAKE\nBest daughter ever.\n## Driving Up to the Ranch\nText"),
    ).toEqual(["character", "dialogue", null, "action"]);
  });

  it("finds the markers to hide on centred text", () => {
    expect(centeredMarkers("> TIGHTER <")).toEqual([
      [0, 2],
      [9, 11],
    ]);
    expect(centeredMarkers(">THE END<")).toEqual([
      [0, 1],
      [8, 9],
    ]);
    expect(centeredMarkers("TIGHTER")).toBeNull();
  });

  it("knows which element a suggestion list is for", () => {
    expect(menuLineKind("12 dialogue blocks")).toBe("character");
    expect(menuLineKind("1 dialogue block")).toBe("character");
    expect(menuLineKind("Character extension")).toBe("character");
    expect(menuLineKind("Scene type")).toBe("scene-heading");
    expect(menuLineKind("Transition")).toBe("transition");
  });
});

describe("comments and two-space lines", () => {
  const kinds = (text: string) => classifyLayoutLines(text.split("\n"));

  it("keeps a speech going past a one-line comment", () => {
    expect(kinds("JOKER\n%%note%%\nChoose.")).toEqual([
      "character",
      "note",
      "dialogue",
    ]);
  });

  it("recognises a comment that opens with text on the same line", () => {
    expect(kinds("%% to do\nfix this\n%%\n\nJOKER\nChoose.")).toEqual([
      "note",
      "note",
      "note",
      null,
      "character",
      "dialogue",
    ]);
  });

  it("keeps a speech going over a line of two spaces", () => {
    expect(kinds("JANE\nLine one.\n  \nLine two.")).toEqual([
      "character",
      "dialogue",
      "dialogue",
      "dialogue",
    ]);
  });
});

describe("cursorAffectsLayout", () => {
  const script = [
    "---",
    "screenplay: true",
    "---",
    "",
    "INT. KITCHEN - DAY",
    "",
    "Jen stirs the pot.",
    "",
    "JEN (V.O.)",
    "(quietly)",
    "It was never about the soup.",
    "  ",
    "Still stirring.",
    "",
    "GEORGE",
    "",
    "Al",
    "",
    "AL",
    "",
    "> THE END <",
    "",
    "# Act two",
    "",
    "~Sing it",
    "",
    "CUT TO:",
    "",
    "/* a boneyard",
    "BOB",
    "*/",
    "",
    "MARY ^",
    "Hi.",
  ];
  const doc = Text.of(script);

  it("is true wherever the cursor line changes the layout", () => {
    const base = classifyLayoutLines(script, -1);
    for (let line = 0; line < script.length; line += 1) {
      if (cursorAffectsLayout(doc, line)) continue;
      expect(classifyLayoutLines(script, line), `line ${line}`).toEqual(base);
    }
  });

  it("is true on empty lines and around cues", () => {
    expect(cursorAffectsLayout(doc, 3)).toBe(true);
    expect(cursorAffectsLayout(doc, 8)).toBe(true);
    expect(cursorAffectsLayout(doc, 9)).toBe(true);
    expect(cursorAffectsLayout(doc, 6)).toBe(false);
    expect(cursorAffectsLayout(doc, -1)).toBe(true);
  });
});

describe("a line set to dialogue", () => {
  it("becomes a wryly once it starts with (", () => {
    const lines = ["JEN", "Hi.", "(quietly"];
    expect(
      classifyLayoutLines(lines, 2, { line: 2, kind: "dialogue" })[2],
    ).toBe("parenthetical");
    expect(
      classifyLayoutLines(["JEN", "Hi.", "(laughs) okay"], 2, {
        line: 2,
        kind: "dialogue",
      })[2],
    ).toBe("dialogue");
  });
});
