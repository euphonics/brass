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
  cleanFountainSource,
  DEFAULT_CLEAN_EXPORT_OPTIONS,
  fountainExportPath,
  stripObsidianFrontmatter,
} from "../src/export/fountain";

describe("Fountain export", () => {
  it("strips leading Obsidian frontmatter without changing screenplay text", () => {
    expect(
      stripObsidianFrontmatter(`---
screenplay: true
title: Test
---

INT. ROOM - DAY

JANE
Hello.
`),
    ).toBe(`INT. ROOM - DAY

JANE
Hello.
`);
  });

  it("leaves source without frontmatter byte-for-byte unchanged", () => {
    const source = "INT. ROOM - DAY\r\n\r\nAction.\r\n";
    expect(stripObsidianFrontmatter(source)).toBe(source);
  });

  it("chooses a collision-safe path beside a Markdown note", () => {
    expect(
      fountainExportPath(
        "Scripts/Draft.md",
        new Set(["Scripts/Draft.fountain", "Scripts/Draft-2.fountain"]),
      ),
    ).toBe("Scripts/Draft-3.fountain");
  });

  it("does not overwrite an existing Fountain source", () => {
    expect(
      fountainExportPath("Draft.fountain", new Set(["Draft-export.fountain"])),
    ).toBe("Draft-export-2.fountain");
  });

  it("cleans wikilinks and task lines for a clean Fountain export", () => {
    const source = [
      "# Act One",
      "",
      "INT. [[Jen's Apartment|APARTMENT]] - NIGHT",
      "",
      "[[Jen (Character in TIGHTER)|JEN]] reads **[[The Letter]]** and an embed ![[photo.png]].",
      "",
      "- [ ] fix this scene",
      "- [x] done task",
      "",
      "JEN",
      "_Nobody_ calls me that.",
    ].join("\n");

    expect(
      cleanFountainSource(source, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        removeEmbeds: false,
      }),
    ).toBe(
      [
        "# Act One",
        "",
        "INT. APARTMENT - NIGHT",
        "",
        "JEN reads **The Letter** and an embed ![[photo.png]].",
        "",
        "JEN",
        "_Nobody_ calls me that.",
      ].join("\n"),
    );
  });

  it("keeps ordinary lists and bracketed text that are not tasks", () => {
    const source = "- a list item\n[ ] not a task\nNo [[links]] here? [[a|b]]";
    expect(cleanFountainSource(source)).toBe(
      "- a list item\n[ ] not a task\nNo links here? b",
    );
  });

  it("removes each Obsidian element only when its option is on", () => {
    const on = (option: keyof typeof DEFAULT_CLEAN_EXPORT_OPTIONS) =>
      ({
        ...Object.fromEntries(
          Object.keys(DEFAULT_CLEAN_EXPORT_OPTIONS).map((key) => [key, false]),
        ),
        [option]: true,
      }) as unknown as typeof DEFAULT_CLEAN_EXPORT_OPTIONS;

    expect(
      cleanFountainSource("# Act One\n\nINT. ROOF - DAY", on("removeHeadings")),
    ).toBe("INT. ROOF - DAY");
    expect(
      cleanFountainSource("She runs. %%cut?%% Fast.", on("removeComments")),
    ).toBe("She runs.  Fast.");
    expect(
      cleanFountainSource("A\n%%\nhidden\nnotes\n%%\nB", on("removeComments")),
    ).toBe("A\nB");
    expect(
      cleanFountainSource(
        "A\n\n> [!note] Fix\n> this beat\n\nB",
        on("removeCallouts"),
      ),
    ).toBe("A\n\nB");
    expect(
      cleanFountainSource(
        "She runs.[^1]\n\n[^1]: Source note",
        on("removeFootnotes"),
      ),
    ).toBe("She runs.\n");
    expect(cleanFountainSource("She runs. ^abc123", on("removeBlockIds"))).toBe(
      "She runs.",
    );
    // Fountain dual dialogue caret is not a block ID.
    expect(cleanFountainSource("JEN ^", on("removeBlockIds"))).toBe("JEN ^");
    expect(
      cleanFountainSource("A ==big== moment", on("removeHighlights")),
    ).toBe("A big moment");
    expect(
      cleanFountainSource(
        "See [the site](https://x.y).",
        on("unwrapMarkdownLinks"),
      ),
    ).toBe("See the site.");
    expect(
      cleanFountainSource("Look ![[photo.png]] here", on("removeEmbeds")),
    ).toBe("Look  here");
    expect(cleanFountainSource("She runs #idea/later", on("removeTags"))).toBe(
      "She runs",
    );
    // Scene numbers are not tags.
    expect(cleanFountainSource("INT. ROOF - DAY #12#", on("removeTags"))).toBe(
      "INT. ROOF - DAY #12#",
    );
    // Everything off: unchanged.
    const all = "# H\n- [ ] t\n[[a|b]] %%c%% ==h== #tag ^id1";
    expect(
      cleanFountainSource(
        all,
        Object.fromEntries(
          Object.keys(DEFAULT_CLEAN_EXPORT_OPTIONS).map((key) => [key, false]),
        ) as unknown as typeof DEFAULT_CLEAN_EXPORT_OPTIONS,
      ),
    ).toBe(all);
  });
});
