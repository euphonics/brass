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

const { variableRanges } = await import("../src/editor/variables");

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
});
