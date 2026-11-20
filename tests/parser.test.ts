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
import { parseFountain } from "../src/screenplay/parser";

describe("parseFountain", () => {
  it("recognizes scenes, characters, dialogue, and parentheticals", () => {
    const document = parseFountain(`INT. MILITARY BASE - THERAPY ROOM - DAY

DR. JANE MORROW, 42, enters.

JANE (O.S.)
(quietly)
How long have you been having these dreams?

MILLER
Since I died.

EXT. PARADE GROUND - NIGHT
`);

    expect(document.elements.map((element) => element.type)).toEqual([
      "scene-heading",
      "action",
      "character",
      "parenthetical",
      "dialogue",
      "character",
      "dialogue",
      "scene-heading",
    ]);
    expect(
      document.elements.filter((element) => element.type === "character"),
    ).toMatchObject([
      { text: "JANE", characterExtension: "(O.S.)" },
      { text: "MILLER" },
    ]);
  });

  it("does not treat standalone uppercase action as a character", () => {
    const document = parseFountain(`INT. CASINO - NIGHT

!SCANNING THE AISLES…

NO ONE MOVES

The dealer watches.
`);

    expect(
      document.elements.filter((element) => element.type === "character"),
    ).toEqual([]);
  });

  it("supports forced mixed-case character cues", () => {
    const document = parseFountain(`@McCLANE
Welcome to the party.
`);

    expect(document.elements[0]).toMatchObject({
      type: "character",
      text: "McCLANE",
    });
  });

  it("ignores Obsidian frontmatter", () => {
    const document = parseFountain(`---
screenplay: true
title: Test
---

INT. ROOM - DAY
`);

    expect(document.elements).toEqual([
      { type: "scene-heading", text: "INT. ROOM - DAY", line: 2 },
    ]);
  });
});

describe("Fountain rules", () => {
  const types = (source: string) =>
    parseFountain(source).elements.map((element) => [
      element.type,
      element.text,
    ]);

  it("treats a line starting with ! as action", () => {
    expect(types("!SPLASH\nWater everywhere.\n")).toEqual([
      ["action", "!SPLASH"],
      ["action", "Water everywhere."],
    ]);
  });

  it("keeps a speech going over a line of two spaces", () => {
    expect(types("JANE\nLine one.\n  \nLine two.\n")).toEqual([
      ["character", "JANE"],
      ["dialogue", "Line one."],
      ["dialogue", "Line two."],
    ]);
  });

  it("skips Obsidian comments and boneyard", () => {
    expect(
      types(
        "JOKER\n%%note%%\nChoose.\n\n%% to do\nfix this\n%%\n\n/* cut\nold scene */\n\nBATMAN\nNo.\n",
      ),
    ).toEqual([
      ["character", "JOKER"],
      ["dialogue", "Choose."],
      ["character", "BATMAN"],
      ["dialogue", "No."],
    ]);
  });
});
