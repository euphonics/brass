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
import {
  applyBoneyardEdits,
  boneyardSection,
  findBoneyard,
  toggleBoneyardMarkers,
} from "../src/screenplay/boneyard";

const script = [
  "---",
  "screenplay: true",
  "---",
  "",
  "INT. BARN - DAY",
  "",
  "Hay everywhere.",
  "",
  "/*",
  "A cut beat.",
  "*/",
  "",
  "She waits. /* too slow */ Then runs.",
  "",
  "EXT. YARD - NIGHT",
  "",
  "/* old ending */",
].join("\n");

describe("Move to boneyard (#288)", () => {
  it("finds each block and the scene it was in", () => {
    const { blocks } = findBoneyard(script);
    expect(blocks).toEqual([
      { text: "A cut beat.", scene: "INT. BARN - DAY", heading: null },
      { text: "too slow", scene: "INT. BARN - DAY", heading: null },
      { text: "old ending", scene: "EXT. YARD - NIGHT", heading: null },
    ]);
  });

  it("takes them out without leaving double gaps", () => {
    const { edits } = findBoneyard(script);
    expect(applyBoneyardEdits(script, edits)).toBe(
      [
        "---",
        "screenplay: true",
        "---",
        "",
        "INT. BARN - DAY",
        "",
        "Hay everywhere.",
        "",
        "She waits. Then runs.",
        "",
        "EXT. YARD - NIGHT",
        "",
      ].join("\n"),
    );
  });

  it("leaves an unclosed /* alone", () => {
    expect(findBoneyard("She waits. /* not closed").blocks).toEqual([]);
  });

  it("writes one dated heading per scene", () => {
    const { blocks } = findBoneyard(script);
    expect(boneyardSection(blocks, "November 23, 2026", "Script")).toBe(
      [
        "## November 23, 2026 · INT. BARN - DAY ([[Script]])",
        "",
        "A cut beat.",
        "",
        "too slow",
        "",
        "## November 23, 2026 · EXT. YARD - NIGHT ([[Script]])",
        "",
        "old ending",
        "",
      ].join("\n"),
    );
  });

  it("links back to the heading above where the block starts", () => {
    const outer = [
      "# Act 1",
      "",
      "## The scene where this happens",
      "",
      "EXT. NEW SLUG - DAY",
      "",
      "Action.",
      "",
      "/*",
      "INT. THE ACTUAL SLUGLINE - DAY",
      "",
      "The content.",
      "*/",
    ].join("\n");
    expect(findBoneyard(outer).blocks[0]?.heading).toBe(
      "The scene where this happens",
    );
    const inner = [
      "# Act 1",
      "/*",
      "## The scene where this happens",
      "",
      "EXT. NEW SLUG - DAY",
      "*/",
    ].join("\n");
    const block = findBoneyard(inner).blocks[0];
    expect(block?.heading).toBe("Act 1");
    expect(
      boneyardSection(block ? [block] : [], "November 24, 2026", "Script"),
    ).toContain("([[Script#Act 1]])");
  });
});

describe("boneyard for a selection (#294)", () => {
  const text =
    "INT. BARN - DAY\n\nHay everywhere.\n\nShe waits. Too slow. Then runs.\n";

  it("takes the selected text, markers or not", () => {
    const from = text.indexOf("Too slow.");
    const plain = findBoneyard(text, { from, to: from + "Too slow.".length });
    expect(plain.blocks).toEqual([
      { text: "Too slow.", scene: "INT. BARN - DAY", heading: null },
    ]);
    expect(applyBoneyardEdits(text, plain.edits)).toBe(
      "INT. BARN - DAY\n\nHay everywhere.\n\nShe waits. Then runs.\n",
    );
    const lineFrom = text.indexOf("Hay");
    const whole = findBoneyard(text, {
      from: lineFrom,
      to: lineFrom + "Hay everywhere.".length,
    });
    expect(applyBoneyardEdits(text, whole.edits)).toBe(
      "INT. BARN - DAY\n\nShe waits. Too slow. Then runs.\n",
    );
  });

  it("wraps and unwraps the markers", () => {
    expect(toggleBoneyardMarkers("Too slow.", false)).toBe("/* Too slow. */");
    expect(toggleBoneyardMarkers("/* Too slow. */", false)).toBe("Too slow.");
    expect(toggleBoneyardMarkers("A.\nB.", true)).toBe("/*\nA.\nB.\n*/");
    expect(toggleBoneyardMarkers("/*\nA.\nB.\n*/", true)).toBe("A.\nB.");
  });

  it("names outline sections by their heading (#300)", () => {
    const outline = [
      "# Act 1",
      "",
      "Jen finds the gun.",
      "",
      "/* Old beat. */",
      "",
      "# Act 2",
      "",
      "/* Cut chase. */",
    ].join("\n");
    const { blocks } = findBoneyard(outline);
    const section = boneyardSection(
      blocks,
      "November 24, 2026",
      "Outline",
      true,
    );
    expect(section).toContain(
      "## November 24, 2026 · Act 1 ([[Outline#Act 1]])",
    );
    expect(section).toContain(
      "## November 24, 2026 · Act 2 ([[Outline#Act 2]])",
    );
    expect(section).not.toContain("Before the first scene");
  });
});
