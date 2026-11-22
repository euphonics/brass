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
import {
  listedCharacters,
  withListedCharacters,
} from "../src/screenplay/listedCharacters";
import { buildScreenplayIndex } from "../src/screenplay/indexer";
import { parseFountain } from "../src/screenplay/parser";

describe("characters listed in frontmatter", () => {
  it("reads lists, links and comma-separated text", () => {
    expect(listedCharacters({ characters: ["Jen", "bob", "Jen"] })).toEqual([
      "JEN",
      "BOB",
    ]);
    expect(
      listedCharacters({ characters: ["[[Mary Ann]]", "[[Bob Smith|Bob]]"] }),
    ).toEqual(["MARY ANN", "BOB"]);
    expect(listedCharacters({ characters: "Jen, Old  Man" })).toEqual([
      "JEN",
      "OLD MAN",
    ]);
    expect(listedCharacters({ characters: 3 })).toEqual([]);
    expect(listedCharacters({})).toEqual([]);
  });

  it("adds characters without dialogue, after the speaking ones", () => {
    const index = buildScreenplayIndex(
      parseFountain("INT. HOUSE - DAY\n\nJEN\nHi.\n"),
    );
    const merged = withListedCharacters(index, ["JEN", "SILENT MAN"]);
    expect(merged.characters.map((usage) => usage.value)).toEqual([
      "JEN",
      "SILENT MAN",
    ]);
    expect(withListedCharacters(index, ["JEN"])).toBe(index);
  });
});
