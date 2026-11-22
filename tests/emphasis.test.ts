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
import { PDFDocument } from "pdf-lib";
import {
  emphasisRuns,
  markEmphasis,
  visibleText,
} from "../src/export/emphasis";
import { layoutScreenplay } from "../src/export/screenplayLayout";
import { parseFountain } from "../src/screenplay/parser";
import { serializePdf } from "../src/export/pdf";

const styles = (text: string) =>
  emphasisRuns([markEmphasis(text)])[0]?.map((run) => [
    run.text,
    run.bold ? "b" : "",
    run.italic ? "i" : "",
    run.underline ? "u" : "",
  ]);

describe("emphasis", () => {
  it("styles italic, bold, bold italic and underline, and drops the marks", () => {
    expect(styles("her *date.*")).toEqual([
      ["her ", "", "", ""],
      ["date.", "", "i", ""],
    ]);
    expect(styles("**Welcome Tony.**")).toEqual([
      ["Welcome Tony.", "b", "", ""],
    ]);
    expect(styles("***now***")).toEqual([["now", "b", "i", ""]]);
    expect(styles("from _admission@stanford.edu_.")).toEqual([
      ["from ", "", "", ""],
      ["admission@stanford.edu", "", "", "u"],
      [".", "", "", ""],
    ]);
  });

  it("leaves lone and escaped marks as written", () => {
    expect(visibleText(markEmphasis("5 * 3 = 15"))).toBe("5 * 3 = 15");
    expect(visibleText(markEmphasis("snake_case"))).toBe("snake_case");
    expect(visibleText(markEmphasis("nimbus\\_phish\\_server.exe"))).toBe(
      "nimbus_phish_server.exe",
    );
    expect(visibleText(markEmphasis("\\*not italic\\*"))).toBe("*not italic*");
  });

  it("wraps on the printed text and keeps a style across lines", () => {
    const layout = layoutScreenplay(
      parseFountain(
        `INT. ROOM - DAY\n\nWe get the feeling that Allegra's date *isn't the narrator.* Allegra pulls open doors.`,
      ),
      "us-letter",
    );
    const action = layout.pages[0]?.blocks.find(
      (block) => block.type === "action",
    );
    expect(action?.lines.map(visibleText)).toEqual([
      "We get the feeling that Allegra's date isn't the narrator.",
      "Allegra pulls open doors.",
    ]);
    const runs = emphasisRuns(action?.lines ?? []);
    expect(runs[0]?.[runs[0].length - 1]).toMatchObject({
      text: "isn't the narrator.",
      italic: true,
    });
    expect(runs[1]?.[0]).toMatchObject({ italic: false });
  });

  it("exports emphasis without printing the marks", async () => {
    const bytes = await serializePdf(
      parseFountain(
        "INT. ROOM - DAY\n\nIt reads: **Welcome Tony.** She's *sober* and _sure_.",
      ),
      { pageSize: "us-letter", title: "Emphasis" },
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});

describe("dual dialogue", () => {
  it("prints two speeches side by side in Fade In's columns", () => {
    const document = parseFountain(
      "INT. ROOM - NIGHT\n\nALLEGRA (SILENT)\nBathroom?\n\nMAN'S VOICE (V.O.) ^\nThat's all it takes.\n\nThe Man points.",
    );
    expect(document.elements.find((e) => e.dual)?.text).toBe("MAN'S VOICE");
    const blocks = layoutScreenplay(document, "us-letter").pages[0]?.blocks;
    const at = (text: string) =>
      blocks?.find((block) => block.lines.map(visibleText).join(" ") === text);
    expect(at("ALLEGRA (SILENT)")).toMatchObject({ left: 166 });
    expect(at("Bathroom?")).toMatchObject({ left: 108 });
    expect(at("MAN'S VOICE (V.O.)")).toMatchObject({ left: 392.6 });
    expect(at("That's all it takes.")).toMatchObject({ left: 334.6 });
    expect(at("ALLEGRA (SILENT)")?.top).toBe(at("MAN'S VOICE (V.O.)")?.top);
    expect(at("The Man points.")?.top).toBe(
      (at("Bathroom?")?.top ?? 0) + 12 + 12,
    );
  });
});

describe("action paragraphs", () => {
  it("keeps action lines with no blank line between them together, with emphasis across them", () => {
    const blocks = layoutScreenplay(
      parseFountain(
        "INT. ROOM - DAY\n\n**redrekt: who?  \narw3n: a bad guy  \nredrekt: this**\n\nOlivia opens it.",
      ),
      "us-letter",
    ).pages[0]?.blocks.filter((block) => block.type === "action");
    expect(blocks?.[0]?.lines.map(visibleText)).toEqual([
      "redrekt: who?",
      "arw3n: a bad guy",
      "redrekt: this",
    ]);
    expect(
      emphasisRuns(blocks?.[0]?.lines ?? [])
        .flat()
        .every((r) => r.bold),
    ).toBe(true);
    expect(blocks?.[1]?.top).toBe((blocks?.[0]?.top ?? 0) + 3 * 12 + 12);
  });
});
