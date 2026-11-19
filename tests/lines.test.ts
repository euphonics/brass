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
import { classifyLayoutLines } from "../src/editor/layoutClassifier";
import { serializeFdx } from "../src/export/fdx";
import { layoutScreenplay } from "../src/export/screenplayLayout";
import { classifySmartTabLine } from "../src/editor/smartTab";
import { isLikelyCharacterCue } from "../src/screenplay/characterExtension";
import { characterCue } from "../src/screenplay/lines";
import { parseFountain } from "../src/screenplay/parser";

/** Parser elements as "type:text" for compact comparisons. */
const parsed = (source: string) =>
  parseFountain(source).elements.map((element) =>
    element.characterExtension
      ? `${element.type}:${element.text} ${element.characterExtension}`
      : `${element.type}:${element.text.trim()}`,
  );

/** Editor layout kinds of the non-blank lines. */
const laidOut = (source: string) => {
  const lines = source.split("\n");
  return classifyLayoutLines(lines).filter(
    (kind, index) => (lines[index] ?? "").trim() !== "" || kind !== null,
  );
};

describe("one set of line rules", () => {
  it("reads a cue with a lowercase extension as a character (#76)", () => {
    const source = "\nJANE (v.o.)\nHello.\n";
    expect(parsed(source)).toEqual([
      "character:JANE (v.o.)",
      "dialogue:Hello.",
    ]);
    expect(laidOut(source)).toEqual(["character", "dialogue"]);
  });

  it("reads CUT TO: as a transition even without a blank line after (#77)", () => {
    const source = "\nCUT TO:\nINT. HOUSE - DAY\n";
    expect(parsed(source)).toEqual([
      "transition:CUT TO:",
      "scene-heading:INT. HOUSE - DAY",
    ]);
    expect(laidOut(source)).toEqual(["transition", "scene-heading"]);
    expect(characterCue("CUT TO:")).toBeNull();
  });

  it("reads centered text without its markers (#78)", () => {
    const source = "\n> THE END <\n";
    expect(parsed(source)).toEqual(["centered:THE END"]);
    expect(laidOut(source)).toEqual(["centered"]);
    const blocks = layoutScreenplay(parseFountain(source), "us-letter")
      .pages.flatMap((page) => page.blocks)
      .filter((block) => block.lines.join("").includes("THE END"));
    expect(blocks.map((block) => [block.align, block.lines])).toEqual([
      ["center", ["THE END"]],
    ]);
    expect(serializeFdx(parseFountain(source))).toContain(
      '<Paragraph Type="Action" Alignment="Center">',
    );
  });

  it("leaves page breaks, sections and notes out of the script (#79, #80)", () => {
    const source = "\n# ACT ONE\n\n===\n\n[[a note]]\n\nShe runs.\n";
    expect(parsed(source)).toEqual(["action:She runs."]);
    expect(laidOut(source)).toEqual([null, "page-break", "note", "action"]);
  });

  it("reads an unclosed wryly as a wryly (#81)", () => {
    const source = "\nJANE\n(whispering\nGo.\n";
    expect(parsed(source)).toEqual([
      "character:JANE",
      "parenthetical:(whispering",
      "dialogue:Go.",
    ]);
    expect(laidOut(source)).toEqual(["character", "parenthetical", "dialogue"]);
  });

  it("ends a speech at a Markdown heading (#82)", () => {
    const source = "\nJANE\nHello.\n## Later\nShe leaves.\n";
    expect(parsed(source)).toEqual([
      "character:JANE",
      "dialogue:Hello.",
      "action:She leaves.",
    ]);
    expect(laidOut(source)).toEqual(["character", "dialogue", null, "action"]);
  });

  it("never reads a fade or other marked line as a cue (#83)", () => {
    for (const line of [
      "FADE OUT.",
      "FADE IN:",
      "FADE TO BLACK.",
      "> CUT TO:",
      "# ACT ONE",
      "[[NOTE]]",
      "INT. HOUSE - DAY",
    ]) {
      expect(characterCue(line), line).toBeNull();
      expect(isLikelyCharacterCue(line), line).toBe(false);
    }
    const source = "\nFADE OUT.\nThe end.\n";
    expect(parsed(source)).toEqual(["action:FADE OUT.", "action:The end."]);
    expect(laidOut(source)).toEqual(["action", "action"]);
    expect(classifySmartTabLine(["", "FADE OUT."], 1)).toBe("action");
  });

  it("keeps forced cues and plain cues", () => {
    expect(characterCue("@McCLANE")).toEqual({
      name: "McCLANE",
      extension: null,
    });
    // "@" forces any name, even one with no letters.
    expect(characterCue("@||||!!!#")?.name).toBe("||||!!!#");
    expect(characterCue("@123")?.name).toBe("123");
    expect(characterCue("@")).toBeNull();
    expect(characterCue("123")).toBeNull();
    expect(characterCue("ALEX (V.O.) (CONT'D) ^")).toEqual({
      name: "ALEX",
      extension: "(V.O.) (CONT'D)",
    });
    expect(characterCue("Jane")).toBeNull();
  });

  it("ignores Obsidian callouts", () => {
    const source = "\n> [!note]\n\nShe runs.\n";
    expect(parsed(source)).toEqual(["action:She runs."]);
  });

  it("agrees with the editor layout on a sample scene", () => {
    const source = [
      "INT. KITCHEN - DAY",
      "",
      "Jane enters.",
      "",
      "JANE (v.o.)",
      "(quietly",
      "Hello.",
      "",
      "> THE END <",
      "",
      "CUT TO:",
    ].join("\n");
    const kinds = classifyLayoutLines(source.split("\n")).filter(
      (kind) => kind !== null,
    );
    expect(
      parseFountain(source).elements.map((element) => element.type),
    ).toEqual(kinds);
  });
});
