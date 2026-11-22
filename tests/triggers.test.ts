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
import { triggerProblem } from "../src/editor/triggers";
import { mentionAtEnd } from "../src/editor/characterMentions";

vi.mock("obsidian", () => ({ editorInfoField: {} }));

const { variableAtEnd, variableRanges, variableSuggestions } =
  await import("../src/editor/variables");

describe("trigger characters", () => {
  it("accepts one free symbol and refuses the rest", () => {
    expect(triggerProblem("%", "+")).toBeNull();
    expect(triggerProblem("§", "+")).toBeNull();
    expect(triggerProblem("", "+")).not.toBeNull();
    expect(triggerProblem("%%", "+")).not.toBeNull();
    expect(triggerProblem("a", "+")).not.toBeNull();
    expect(triggerProblem("7", "+")).not.toBeNull();
    expect(triggerProblem("@", "+")).not.toBeNull();
    expect(triggerProblem("#", "+")).not.toBeNull();
    expect(triggerProblem("+", "+")).not.toBeNull();
  });

  it("finds variables with another character", () => {
    const text = "Take %car and %cat. It costs $5 and 50%.";
    expect(
      variableRanges(text, 0, "%").map(({ from, to }) => text.slice(from, to)),
    ).toEqual(["%car", "%cat"]);
    expect(variableAtEnd("Hi %ca", "%")).toEqual({ typed: "ca" });
    expect(variableAtEnd("Hi $ca", "%")).toBeNull();
    expect(
      variableSuggestions(`${text} %c`, "c", text.length + 1, 8, "%"),
    ).toEqual(["%car", "%cat"]);
  });

  it("finds character names with another character", () => {
    expect(mentionAtEnd("She sees &je", "&")).toEqual({ typed: "je" });
    expect(mentionAtEnd("She sees +je", "&")).toBeNull();
    expect(mentionAtEnd("R&D", "&")).toBeNull();
  });
});
