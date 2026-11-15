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
import { findDualDialogue } from "../src/editor/dualDialogue";
import { classifyLayoutLines } from "../src/editor/layoutClassifier";

const find = (text: string) => {
  const lines = text.split("\n");
  return findDualDialogue(lines, classifyLayoutLines(lines));
};

describe("dual dialogue", () => {
  it("pairs a ^ cue with the speech before it", () => {
    const pairs = find(
      [
        "Jen and Blake exchange a look then—",
        "",
        "JEN",
        "No.",
        "",
        "BLAKE^",
        "(quietly)",
        "No.",
        "",
        "FIONA",
        "I'm just pumped up.",
      ].join("\n"),
    );
    expect(pairs).toEqual([
      {
        startLine: 2,
        endLine: 7,
        left: { cue: "JEN", lines: [{ kind: "dialogue", text: "No." }] },
        right: {
          cue: "BLAKE",
          lines: [
            { kind: "parenthetical", text: "(quietly)" },
            { kind: "dialogue", text: "No." },
          ],
        },
      },
    ]);
  });

  it("needs a speech before the ^ cue", () => {
    expect(find("She runs.\n\nBLAKE ^\nNo.")).toEqual([]);
    expect(find("JEN\nNo.\n\nBLAKE\nYes.")).toEqual([]);
  });
});
