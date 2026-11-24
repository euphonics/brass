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

const { variableAtEnd, variableRanges, variableSuggestions } =
  await import("../src/editor/variables");

const names = (text: string) =>
  variableRanges(text).map(({ from, to }) => text.slice(from, to));

describe("$ variables", () => {
  it("finds variables", () => {
    expect(names("Meet $my_variable at $ABC123 and $1ABC.")).toEqual([
      "$my_variable",
      "$ABC123",
      "$1ABC",
    ]);
  });

  it("skips dollar amounts", () => {
    expect(names("It costs $123, $123.12 or $1,123.12.")).toEqual([]);
  });

  it("leaves out trailing punctuation and a lone $", () => {
    expect(names("Ask $name, then $ alone.")).toEqual(["$name"]);
  });

  it("keeps hyphens inside a name", () => {
    expect(names("Nawashi $dead-teacher-name. Then $x- and $1-2.")).toEqual([
      "$dead-teacher-name",
      "$x",
    ]);
  });

  it("keeps apostrophes inside a name, not quotes around it", () => {
    expect(names("Take $jen's_car and $jen’s-bag. Say '$name'.")).toEqual([
      "$jen's_car",
      "$jen’s-bag",
      "$name",
    ]);
    expect(names("That's $killer's.")).toEqual(["$killer's"]);
  });
});

describe("$ variable list", () => {
  it("finds the variable being typed", () => {
    expect(variableAtEnd("Hi $")).toEqual({ typed: "" });
    expect(variableAtEnd("Hi $je")).toEqual({ typed: "je" });
    expect(variableAtEnd("$jen's")).toEqual({ typed: "jen's" });
    expect(variableAtEnd("US$5")).toBeNull();
    expect(variableAtEnd("Hi $je now")).toBeNull();
  });

  it("lists the note's other variables, most used first", () => {
    const text = "$car and $cat. $car again. $dog. Now $c";
    const at = text.length - 2;
    expect(variableSuggestions(text, "c", at, 8)).toEqual(["$car", "$cat"]);
    expect(variableSuggestions(text, "", at, 8)).toEqual([
      "$car",
      "$cat",
      "$dog",
    ]);
    expect(variableSuggestions(text, "C", at, 8)).toEqual(["$car", "$cat"]);
    expect(variableSuggestions(text, "car", at, 8)).toEqual([]);
    expect(variableSuggestions("Costs $12. $", "", 11, 8)).toEqual([]);
  });
});

describe("shared project variables (#270)", () => {
  it("offers the other notes' variables too", () => {
    expect(
      variableSuggestions("Jen meets $v", "v", 10, 8, "$", [
        { counts: new Map([["$villain", 3]]), mtime: 1 },
      ]),
    ).toEqual(["$villain"]);
  });

  it("uses this note's spelling, else the most recently changed note's", () => {
    const others = [
      { counts: new Map([["$Villain", 1]]), mtime: 1 },
      { counts: new Map([["$VILLAIN", 1]]), mtime: 2 },
    ];
    expect(variableSuggestions("$v", "v", 0, 8, "$", others)).toEqual([
      "$VILLAIN",
    ]);
    expect(
      variableSuggestions("$villain hides. $v", "v", 16, 8, "$", others),
    ).toEqual(["$villain"]);
  });

  it("ranks by use across all the notes", () => {
    expect(
      variableSuggestions("$alpha $alpha $a", "a", 14, 8, "$", [
        { counts: new Map([["$apple", 5]]), mtime: 1 },
      ]),
    ).toEqual(["$apple", "$alpha"]);
  });
});
