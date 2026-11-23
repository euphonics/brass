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

vi.mock("obsidian", () => ({ Notice: class {} }));

const { toggleDualDialogue } = await import("../src/commands/dualDialogue");

const script = [
  "Jen waits.",
  "",
  "JEN",
  "Now?",
  "",
  "BLAKE",
  "(quietly)",
  "Now.",
  "",
  "Fiona runs.",
];

describe("Toggle dual dialogue (#211)", () => {
  it("adds ^ to the cue of the speech holding the cursor", () => {
    expect(toggleDualDialogue(script, 7)).toEqual({ line: 5, text: "BLAKE ^" });
    expect(toggleDualDialogue(script, 5)).toEqual({ line: 5, text: "BLAKE ^" });
  });

  it("removes it again", () => {
    const dual = script.map((line, at) => (at === 5 ? "BLAKE ^" : line));
    expect(toggleDualDialogue(dual, 6)).toEqual({ line: 5, text: "BLAKE" });
  });

  it("needs a speech right above", () => {
    expect(toggleDualDialogue(script, 3)).toHaveProperty("problem");
    expect(toggleDualDialogue(script, 9)).toHaveProperty("problem");
    expect(toggleDualDialogue(script, 1)).toHaveProperty("problem");
  });

  it("won't pair with a speech that is already the second half", () => {
    const chain = [...script.slice(0, 8), "", "FIONA", "Wait."];
    const second = chain.map((line, at) => (at === 5 ? "BLAKE ^" : line));
    expect(toggleDualDialogue(second, 10)).toHaveProperty("problem");
  });
});
