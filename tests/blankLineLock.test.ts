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
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({ editorInfoField: {} }));

const { cursorOffSeparator, isSeparatorLine } =
  await import("../src/editor/blankLineLock");

const doc = Text.of([
  "Edgar strokes her.", // line 1
  "", // line 2: separator
  "EDGAR", // line 3
  "You're in the feeling now.", // line 4
  "", // line 5: two blank lines, not a separator
  "", // line 6
  "She runs.", // line 7
]);

describe("blank line lock", () => {
  it("finds the single blank line between two elements", () => {
    expect(isSeparatorLine(doc, 2)).toBe(true);
    expect(isSeparatorLine(doc, 5)).toBe(false);
    expect(isSeparatorLine(doc, 6)).toBe(false);
    expect(isSeparatorLine(doc, 3)).toBe(false);
  });

  it("does not lock a blank first or last line", () => {
    const edges = Text.of(["", "INT. ROOF - DAY", ""]);
    expect(isSeparatorLine(edges, 1)).toBe(false);
    expect(isSeparatorLine(edges, 3)).toBe(false);
  });

  it("moves down onto the next line", () => {
    const blank = doc.line(2).from;
    const before = doc.line(1).to;
    expect(cursorOffSeparator(doc, before, blank, false)).toBe(
      doc.line(3).from,
    );
  });

  it("moves up, or on a click, to the end of the line above", () => {
    const blank = doc.line(2).from;
    expect(cursorOffSeparator(doc, doc.line(3).from, blank, false)).toBe(
      doc.line(1).to,
    );
    expect(cursorOffSeparator(doc, doc.line(4).to, blank, true)).toBe(
      doc.line(1).to,
    );
  });

  it("leaves other lines alone", () => {
    expect(cursorOffSeparator(doc, 0, doc.line(5).from, false)).toBeNull();
    expect(cursorOffSeparator(doc, 0, doc.line(3).from, true)).toBeNull();
  });
});
