/*
 * Copyright 2026 Christian Grobmeier
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
import {
  ScreenplayIndexCache,
  textOutsideLine,
} from "../src/editor/indexCache";
import { buildScreenplayIndex } from "../src/screenplay/indexer";
import { parseFountain } from "../src/screenplay/parser";

/** Simulates the editor: text plus the bounds of the line being typed. */
function outside(text: string) {
  const lineFrom = text.lastIndexOf("\n") + 1;
  return textOutsideLine(text, lineFrom, text.length);
}

describe("smart rebuild cache", () => {
  it("empties only the current line", () => {
    expect(textOutsideLine("A\nBC\nD", 2, 4)).toBe("A\n\nD");
  });

  it("reuses the index while typing within one line", async () => {
    const cache = new ScreenplayIndexCache();
    let builds = 0;
    const build = (text: string) => async () => {
      builds += 1;
      return buildScreenplayIndex(parseFountain(text));
    };
    const script = "INT. ROOF - DAY\n\nJEN\nHi.\n\n";
    for (const typed of ["B", "BL", "BLA", "BLAK"]) {
      const text = script + typed;
      await cache.get("a.md", outside(text), build(outside(text)));
    }
    expect(builds).toBe(1);

    // A new line (Enter) changes the text outside the current line.
    const next = `${script}BLAKE\n`;
    const index = await cache.get("a.md", outside(next), build(outside(next)));
    expect(builds).toBe(2);
    expect(index.characters.map((usage) => usage.value)).toContain("JEN");
  });

  it("rebuilds for another file, or when another note changes", async () => {
    const cache = new ScreenplayIndexCache();
    let builds = 0;
    const build = async () => {
      builds += 1;
      return buildScreenplayIndex(parseFountain("JEN\nHi."));
    };
    await cache.get("a.md", "same", build);
    await cache.get("b.md", "same", build);
    expect(builds).toBe(2);

    cache.invalidate("b.md"); // the file the index is for: still valid
    await cache.get("b.md", "same", build);
    expect(builds).toBe(2);

    cache.invalidate("part-two.md"); // another project part changed
    await cache.get("b.md", "same", build);
    expect(builds).toBe(3);
  });
});
