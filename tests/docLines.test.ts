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

import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { docLineKinds, docLines } from "../src/editor/docLines";
import { classifyLines } from "../src/screenplay/lines";

describe("shared note lines and line types", () => {
  const source = "INT. HOUSE - DAY\n\nJEN\nHi.\n\nShe runs.";
  const doc = Text.of(source.split("\n"));

  it("gives the same lines and types as reading the note", () => {
    expect(docLines(doc)).toEqual(source.split("\n"));
    expect(docLineKinds(doc, 3)).toEqual(
      classifyLines(source.split("\n"), { cursorLine: 3 }),
    );
    expect(docLineKinds(doc)).toEqual(classifyLines(source.split("\n")));
  });

  it("works each answer out once per version of the note", () => {
    expect(docLines(doc)).toBe(docLines(doc));
    expect(docLineKinds(doc, 2)).toBe(docLineKinds(doc, 2));
    const edited = doc.replace(0, 0, Text.of(["X"]));
    expect(docLines(edited)[0]).toBe("XINT. HOUSE - DAY");
  });
});
