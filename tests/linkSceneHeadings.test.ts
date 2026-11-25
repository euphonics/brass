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

vi.mock("obsidian", () => ({
  Notice: class {},
  TFile: class {},
  TFolder: class {},
  FuzzySuggestModal: class {},
  SuggestModal: class {},
  Modal: class {},
  Setting: class {},
  normalizePath: (path: string) => path,
  editorInfoField: {},
}));

const { outlineNameFor, unmatchedNotice } =
  await import("../src/commands/linkSceneHeadings");

describe("Link scene headings without pickers (#337)", () => {
  it("finds '<script> Outline' in the script's folder, any capitals", () => {
    expect(
      outlineNameFor("TIGHTER", ["TIGHTER notes", "tighter OUTLINE", "Other"]),
    ).toBe("tighter OUTLINE");
    expect(outlineNameFor("TIGHTER", ["TIGHTER v4 Outline"])).toBeNull();
  });

  it("lists the scenes with no outline heading, at most five", () => {
    expect(unmatchedNotice([], "Outline")).toBe("");
    expect(unmatchedNotice(["INT. BARN - DAY"], "Outline")).toBe(
      "1 scene has no heading in Outline: INT. BARN - DAY.",
    );
    expect(
      unmatchedNotice(["A", "B", "C", "D", "E", "F", "G"], "Outline"),
    ).toBe("7 scenes have no heading in Outline: A; B; C; D; E; and 2 more.");
  });
});
