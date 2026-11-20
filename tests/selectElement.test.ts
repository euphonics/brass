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
import { elementLines } from "../src/commands/selectElement";

const script = [
  "INT. HALL - NIGHT", // 0
  "", // 1
  "My action.", // 2
  "This is part of the same action.", // 3
  "This too.", // 4
  "", // 5
  "But not this.", // 6
  "", // 7
  "NAME", // 8
  "(connected)", // 9
  "This is part of the same text element.", // 10
  "  ", // 11: blank line inside the speech
  "Still talking.", // 12
  "", // 13
  "JEN", // 14
  "Hi.", // 15
];

describe("elementLines", () => {
  it("selects a whole speech from any of its lines", () => {
    for (const at of [8, 9, 10, 11, 12]) {
      expect(elementLines(script, at)).toEqual({ from: 8, to: 12 });
    }
    expect(elementLines(script, 15)).toEqual({ from: 14, to: 15 });
  });

  it("selects lines of action with no blank line between them", () => {
    for (const at of [2, 3, 4]) {
      expect(elementLines(script, at)).toEqual({ from: 2, to: 4 });
    }
    expect(elementLines(script, 6)).toEqual({ from: 6, to: 6 });
  });

  it("selects a slugline alone and nothing on a blank line", () => {
    expect(elementLines(script, 0)).toEqual({ from: 0, to: 0 });
    expect(elementLines(script, 1)).toBeNull();
    expect(elementLines(script, 13)).toBeNull();
  });
});
