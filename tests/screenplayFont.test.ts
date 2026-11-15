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
import { screenplayFontFamily } from "../src/editor/screenplayFont";

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
});
