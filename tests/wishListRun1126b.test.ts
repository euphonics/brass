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
import { listIsUseless } from "../src/editor/completionEngine";
import {
  addToBoneyard,
  findBoneyard,
  scriptHeadings,
} from "../src/screenplay/boneyard";

describe("no list when only what's typed is left (#353)", () => {
  it("closes on a fully typed name that is the only match", () => {
    expect(
      listIsUseless("FIONA", [{ label: "FIONA", applyText: "FIONA\n" }]),
    ).toBe(true);
  });

  it("closes on a typed wryly", () => {
    expect(
      listIsUseless("(beat)", [{ label: "(beat)", applyText: "(beat)" }]),
    ).toBe(true);
  });

  it("stays open with more than one match", () => {
    expect(
      listIsUseless("JEN", [
        { label: "JEN", applyText: "JEN\n" },
        { label: "JENNY", applyText: "JENNY\n" },
      ]),
    ).toBe(false);
  });

  it("stays open when picking would change the text", () => {
    expect(
      listIsUseless("fiona", [{ label: "FIONA", applyText: "FIONA\n" }]),
    ).toBe(false);
    expect(
      listIsUseless("KITCHEN", [
        { label: "KITCHEN", applyText: "KITCHEN - NIGHT" },
      ]),
    ).toBe(false);
    expect(listIsUseless("", [{ label: "(V.O.)" }])).toBe(false);
  });
});

describe("boneyard keeps the script's headings (#355)", () => {
  const script = [
    "# Act 1",
    "",
    "## The heist",
    "",
    "INT. BANK - NIGHT",
    "",
    "/* Jen counts the money. */",
    "",
  ].join("\n");
  const blocks = findBoneyard(script).blocks;

  it("records the heading chain", () => {
    expect(blocks[0]?.headings).toEqual([
      { level: 1, text: "Act 1" },
      { level: 2, text: "The heist" },
    ]);
  });

  it("creates the headings in an empty boneyard", () => {
    expect(addToBoneyard("", blocks, "November 26, 2026", "Script")).toBe(
      [
        "# Act 1",
        "",
        "## The heist",
        "",
        "### INT. BANK - NIGHT",
        "",
        "Archived on November 26, 2026 from [[Script#The heist]]",
        "",
        "Jen counts the money.",
        "",
      ].join("\n"),
    );
  });

  it("files under existing headings, before the next section", () => {
    const note = [
      "# Act 1",
      "",
      "## The heist",
      "",
      "### INT. VAULT - DAY",
      "",
      "Old text.",
      "",
      "# Act 2",
      "",
      "Later text.",
      "",
    ].join("\n");
    const result = addToBoneyard(note, blocks, "November 26, 2026", "Script");
    expect(result).toBe(
      [
        "# Act 1",
        "",
        "## The heist",
        "",
        "### INT. VAULT - DAY",
        "",
        "Old text.",
        "",
        "### INT. BANK - NIGHT",
        "",
        "Archived on November 26, 2026 from [[Script#The heist]]",
        "",
        "Jen counts the money.",
        "",
        "# Act 2",
        "",
        "Later text.",
        "",
      ].join("\n"),
    );
  });

  it("adds a missing subheading under its parent", () => {
    const note = ["# Act 1", "", "Old.", "", "# Act 2", "", "Later."].join(
      "\n",
    );
    const result = addToBoneyard(note, blocks, "November 26, 2026", "Script");
    expect(result.indexOf("## The heist")).toBeGreaterThan(
      result.indexOf("Old."),
    );
    expect(result.indexOf("## The heist")).toBeLessThan(
      result.indexOf("# Act 2"),
    );
  });

  it("adds a missing act before the later acts (#356)", () => {
    const script = "# Act 1\n\n/* early */\n\n# Act 2\n\nx\n\n# Act 3\n\ny\n";
    const early = findBoneyard(script).blocks;
    const note = "# Act 2\n\nTwo.\n\n# Act 3\n\nThree.\n";
    const result = addToBoneyard(
      note,
      early,
      "D",
      "Script",
      false,
      scriptHeadings(script),
    );
    expect(result).toBe(
      "# Act 1\n\n## Before the first scene\n\nArchived on D from [[Script#Act 1]]\n\nearly\n\n# Act 2\n\nTwo.\n\n# Act 3\n\nThree.\n",
    );
  });

  it("puts text under no heading at the end, as before", () => {
    const loose = findBoneyard("INT. BANK - NIGHT\n\n/* x */\n").blocks;
    const result = addToBoneyard("# Act 1\n\nOld.\n", loose, "D", "Script");
    expect(result).toBe(
      "# Act 1\n\nOld.\n\n## INT. BANK - NIGHT\n\nArchived on D from [[Script]]\n\nx\n",
    );
  });

  it("from an outline, dates the entry under the heading", () => {
    const outline = findBoneyard("# Act 1\n\n/* idea */\n").blocks;
    expect(addToBoneyard("", outline, "D", "Outline", true)).toBe(
      "# Act 1\n\n## D\n\nArchived on D from [[Outline#Act 1]]\n\nidea\n",
    );
  });
});
