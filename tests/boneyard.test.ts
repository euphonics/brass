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
      { text: "A cut beat.", scene: "INT. BARN - DAY" },
      { text: "too slow", scene: "INT. BARN - DAY" },
      { text: "old ending", scene: "EXT. YARD - NIGHT" },
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
    expect(boneyardSection(blocks, "November 23, 2026", "[[Script]]")).toBe(
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
});
