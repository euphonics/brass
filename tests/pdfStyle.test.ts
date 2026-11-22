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

import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("obsidian", () => ({
  App: class {},
  Notice: class {},
  PluginSettingTab: class {},
  Setting: class {},
  SettingGroup: class {},
  normalizePath: (path: string) => path,
  TFile: class {},
  TFolder: class {},
}));
import {
  boldPartOf,
  DEFAULT_PDF_BOLD,
  normalizePdfBold,
  PDF_BOLD_SETTINGS,
} from "../src/export/pdfStyle";
import { layoutScreenplay } from "../src/export/screenplayLayout";
import { parseFountain } from "../src/screenplay/parser";
import { serializePdf } from "../src/export/pdf";

const { migrateSettings } = await import("../src/settings/settings");

describe("PDF bold settings", () => {
  it("bolds only sluglines by default", () => {
    expect(
      Object.entries(DEFAULT_PDF_BOLD)
        .filter(([, on]) => on)
        .map(([part]) => part),
    ).toEqual(["scene-heading"]);
    expect(migrateSettings(null).pdfBold).toEqual(DEFAULT_PDF_BOLD);
  });

  it("lists a setting for every part", () => {
    expect(PDF_BOLD_SETTINGS.map(({ part }) => part).sort()).toEqual(
      Object.keys(DEFAULT_PDF_BOLD).sort(),
    );
  });

  it("keeps saved values and repairs missing or invalid ones", () => {
    expect(
      normalizePdfBold({ character: true, dialogue: "yes", extra: true }),
    ).toEqual({ ...DEFAULT_PDF_BOLD, character: true });
    expect(normalizePdfBold(null)).toEqual(DEFAULT_PDF_BOLD);
    expect(
      migrateSettings({ pdfBold: { "scene-heading": false } }).pdfBold,
    ).toEqual({ ...DEFAULT_PDF_BOLD, "scene-heading": false });
  });

  it("tells title page text apart from the script's own elements", () => {
    const document = {
      ...parseFountain("INT. ROOM - DAY\n\nJANE\nHi."),
      titlePage: { title: "Night", author: "Alex", contact: "Office" },
    };
    const [titlePage, firstPage] = layoutScreenplay(document, "a4").pages;
    expect(titlePage?.blocks.map(boldPartOf)).toEqual([
      "title",
      "title-details",
      "title-details",
    ]);
    expect(firstPage?.blocks.map(boldPartOf)).toEqual([
      "scene-heading",
      "character",
      "dialogue",
    ]);
  });

  it("exports with every part bold, or none", async () => {
    const document = parseFountain(
      "INT. ROOM - DAY\n\nJane waits.\n\nJANE\n(quietly)\nHi.\n\nCUT TO:",
    );
    for (const value of [true, false]) {
      const bold = Object.fromEntries(
        Object.keys(DEFAULT_PDF_BOLD).map((part) => [part, value]),
      );
      const bytes = await serializePdf(document, {
        pageSize: "us-letter",
        title: "Bold",
        bold,
      });
      expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    }
  });
});
