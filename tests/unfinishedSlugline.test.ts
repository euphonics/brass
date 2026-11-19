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

const { isUnfinishedSlugline } = await import("../src/editor/completion");

describe("unfinished slugline", () => {
  it("is only a scene type, or ends in a dash", () => {
    for (const text of ["INT.", "INT. ", "I/E.", "INT. HOUSE -", "INT. - "]) {
      expect(isUnfinishedSlugline(text)).toBe(true);
    }
  });

  it("is not a finished slugline or action", () => {
    for (const text of [
      "INT. HOUSE",
      "INT. HOUSE - DAY",
      "Interior design is fun.",
      "Int",
      "She waits -",
    ]) {
      expect(isUnfinishedSlugline(text)).toBe(false);
    }
  });
});
