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
  ItemView: class {},
  TFile: class {},
  TFolder: class {},
  setIcon: () => {},
}));

const { collectPlaceholders } = await import("../src/ui/placeholdersView");

describe("Placeholders panel (#341)", () => {
  it("lists placeholders across notes, most used first, with their lines", () => {
    const list = collectPlaceholders([
      {
        path: "Script.md",
        text: "She grabs the $tool.\n\nHe drops the $tool.",
      },
      { path: "Outline.md", text: "- the $smell in the barn\n- $tool again" },
    ]);
    expect(list.map((p) => [p.name, p.places.length])).toEqual([
      ["$tool", 3],
      ["$smell", 1],
    ]);
    expect(list[0]?.places.map((p) => [p.path, p.line])).toEqual([
      ["Script.md", "She grabs the $tool."],
      ["Script.md", "He drops the $tool."],
      ["Outline.md", "- $tool again"],
    ]);
    expect(list[0]?.places[0]?.from).toBe(14);
  });

  it("skips dollar amounts and notes without placeholders", () => {
    expect(
      collectPlaceholders([{ path: "A.md", text: "It costs $5, or $1,000." }]),
    ).toEqual([]);
  });
});
