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
import { layoutScreenplay } from "../src/export/screenplayLayout";
import { visibleText } from "../src/export/emphasis";
import { parseFountain } from "../src/screenplay/parser";

const text = (block: { lines: string[] }) =>
  block.lines.map(visibleText).join(" ");

describe("PDF screenplay rules", () => {
  it("prints scene numbers in both margins, not in the heading", () => {
    const blocks = layoutScreenplay(
      parseFountain("INT. HOUSE - DAY #1A#\n\nJen waits."),
      "us-letter",
    ).pages[0]?.blocks;
    expect(blocks?.map(text)).toEqual([
      "INT. HOUSE - DAY",
      "1A",
      "1A",
      "Jen waits.",
    ]);
    expect(blocks?.[1]?.left).toBeLessThan(108);
    expect(blocks?.[2]?.left).toBeGreaterThan(540);
    expect(blocks?.[1]?.top).toBe(blocks?.[0]?.top);
  });

  it("starts a new page at ===", () => {
    const pages = layoutScreenplay(
      parseFountain("INT. HOUSE - DAY\n\nJen waits.\n\n===\n\nEXT. YARD - DAY"),
      "us-letter",
    ).pages;
    expect(pages.map((page) => page.blocks.map(text))).toEqual([
      ["INT. HOUSE - DAY", "Jen waits."],
      ["EXT. YARD - DAY"],
    ]);
  });

  it("centers Source on the title page", () => {
    const page = layoutScreenplay(
      {
        ...parseFountain("INT. ROOM - DAY"),
        titlePage: { title: "Night", author: "Alex", source: "A novel" },
      },
      "us-letter",
    ).pages[0];
    expect(page?.blocks.find((block) => text(block) === "A novel")?.align).toBe(
      "center",
    );
  });

  it("never starts a page with a transition", () => {
    const filler = Array.from({ length: 26 }, (_, i) => `Line ${i}.`).join(
      "\n\n",
    );
    for (let extra = 0; extra < 4; extra++) {
      const pages = layoutScreenplay(
        parseFountain(
          `INT. ROOM - DAY\n\n${filler}${"\n\nMore.".repeat(extra)}\n\nCUT TO:\n\nEXT. YARD - DAY`,
        ),
        "us-letter",
      ).pages;
      for (const page of pages.slice(1))
        expect(page.blocks[0]?.type).not.toBe("transition");
    }
  });

  it("leaves at least two lines of a split action paragraph on each page", () => {
    const long = "Rain falls on the street and nobody moves at all. ".repeat(
      12,
    );
    for (let filler = 20; filler < 26; filler++) {
      const pages = layoutScreenplay(
        parseFountain(
          `INT. ROOM - DAY\n\n${Array.from({ length: filler }, () => "Beat.").join("\n\n")}\n\n${long}`,
        ),
        "us-letter",
      ).pages;
      const parts = pages.flatMap((page) =>
        page.blocks.filter(
          (block) =>
            text(block).startsWith("Rain") || text(block).includes("nobody"),
        ),
      );
      for (const part of parts)
        expect(part.lines.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("adds (CONT'D) on the page only when asked", () => {
    const document = parseFountain(
      "INT. ROOM - DAY\n\nREDREKT (O.C.)\nI have his network.\n\nWe can't hear the reply.\n\nREDREKT (O.C.)\nHe thinks he's blackmailed.\n\nEXT. YARD - DAY\n\nREDREKT\nNew scene.",
    );
    const cues = (continued: boolean) =>
      layoutScreenplay(document, "us-letter", undefined, undefined, {
        continued,
      })
        .pages.flatMap((page) => page.blocks)
        .filter((block) => block.type === "character")
        .map(text);
    expect(cues(true)).toEqual([
      "REDREKT (O.C.)",
      "REDREKT (O.C.) (CONT'D)",
      "REDREKT",
    ]);
    expect(cues(false)).toEqual([
      "REDREKT (O.C.)",
      "REDREKT (O.C.)",
      "REDREKT",
    ]);
    expect(document.elements.some((e) => /CONT/u.test(e.text))).toBe(false);
  });
});
