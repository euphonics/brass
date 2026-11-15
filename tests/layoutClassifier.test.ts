/*
 * Copyright 2026 Christian Grobmeier
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
import {
  centeredMarkers,
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

  it("treats an all-caps line without dialogue as action, unless being typed", () => {
    expect(classify("Text.\n\nBANG!\n\nMore.")[2]).toBe("action");
    expect(classify("Text.\n\nJEN", 2)[2]).toBe("character");
    expect(classify("Text.\n\nJEN")[2]).toBe("action");
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
});
