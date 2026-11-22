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
