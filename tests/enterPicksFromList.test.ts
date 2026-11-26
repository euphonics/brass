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

vi.mock("obsidian", () => ({ editorInfoField: {} }));

const { enterPicksFromList } = await import("../src/editor/completion");

describe("Enter with the suggestion list open (#349)", () => {
  it("picks the highlighted item in script mode", () => {
    // `- text +z|` with Zorana highlighted: Enter gives `- text Zorana|`,
    // not a new bullet.
    expect(enterPicksFromList("active", true)).toBe(true);
  });

  it("leaves Enter alone in plain mode, where it closes the list", () => {
    expect(enterPicksFromList("active", false)).toBe(false);
  });

  it("does nothing while the list is still loading or closed", () => {
    expect(enterPicksFromList("pending", true)).toBe(false);
    expect(enterPicksFromList(null, true)).toBe(false);
  });
});
