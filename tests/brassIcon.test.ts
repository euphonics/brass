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

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const addIcon = vi.fn();
vi.mock("obsidian", () => ({ addIcon }));

const { BRASS_ICON, BRASS_ICON_SVG, registerBrassIcon } =
  await import("../src/ui/brassIcon");

describe("Brass logo icon", () => {
  it("draws the same shapes as assets/logo/brass-logo.svg", () => {
    const asset = readFileSync("assets/logo/brass-logo.svg", "utf8");
    const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(asset)?.[1].trim();
    expect(inner).toBeTruthy();
    expect(BRASS_ICON_SVG).toBe(
      `<g transform="translate(50 50) scale(0.26) translate(-275.5 -287)">${inner}</g>`,
    );
  });

  it("registers under the Brass icon name", () => {
    registerBrassIcon();
    expect(addIcon).toHaveBeenCalledWith(BRASS_ICON, BRASS_ICON_SVG);
  });
});
