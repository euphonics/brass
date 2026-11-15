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
import {
  screenplayFontCss,
  screenplayFontFamily,
  screenplayFontOptions,
} from "../src/editor/screenplayFont";

describe("screenplay font", () => {
  it("quotes font names and keeps generic families", () => {
    expect(screenplayFontFamily("Courier Prime, Courier New, MONOSPACE")).toBe(
      '"Courier Prime", "Courier New", monospace',
    );
    expect(screenplayFontFamily("  ")).toBe("");
  });

  it("cannot break out of the CSS value", () => {
    expect(screenplayFontFamily('Evil"; } body { display: none; } "x')).toBe(
      '"Evil body display none x"',
    );
    expect(screenplayFontFamily("A, ;, B")).toBe('"A", "B"');
  });

  it("builds the CSS for each kind of choice", () => {
    expect(screenplayFontCss("", "x")).toBe("var(--font-text)");
    expect(screenplayFontCss("Courier Prime", "")).toBe(
      '"Courier Prime", var(--font-text)',
    );
    expect(screenplayFontCss("custom", "Menlo, monospace")).toBe(
      '"Menlo", monospace, var(--font-text)',
    );
    expect(screenplayFontCss("custom", ";")).toBe("var(--font-text)");
  });

  it("lists Obsidian default, then Courier fonts, then others, then Custom", () => {
    const options = screenplayFontOptions(
      ["Georgia", "Courier New", "Courier Prime"],
      "Courier Prime",
    );
    expect(Object.values(options)).toEqual([
      "Obsidian default",
      "Courier Prime",
      "Courier New",
      "Georgia",
      "Custom…",
    ]);
    expect(Object.keys(options)[0]).toBe("");
    // A saved font missing on this device stays selectable.
    expect(screenplayFontOptions([], "Courier Prime")).toMatchObject({
      "Courier Prime": "Courier Prime (not found)",
    });
  });
});
