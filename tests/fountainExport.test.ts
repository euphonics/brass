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
  normalizeCleanExportOptions,
  type CleanExportOptions,
  type CodeBlockHandling,
  type LinkHandling,
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
    const none: CleanExportOptions = {
      removeTasks: false,
      wikilinks: "keep",
      removeEmbeds: false,
      markdownLinks: "keep",
      codeBlocks: "keep",
      removeHeadings: false,
      removeComments: false,
      removeCallouts: false,
      removeFootnotes: false,
      removeBlockIds: false,
      removeHighlights: false,
      removeTags: false,
    };
    const on = (option: Partial<CleanExportOptions>) => ({
      ...none,
      ...option,
    });

    expect(
      cleanFountainSource(
        "# Act One\n\nINT. ROOF - DAY",
        on({ removeHeadings: true }),
      ),
    ).toBe("INT. ROOF - DAY");
    expect(
      cleanFountainSource(
        "She runs. %%cut?%% Fast.",
        on({ removeComments: true }),
      ),
    ).toBe("She runs. Fast.");
    expect(
      cleanFountainSource(
        "A\n%%\nhidden\nnotes\n%%\nB",
        on({ removeComments: true }),
      ),
    ).toBe("A\nB");
    expect(
      cleanFountainSource(
        "A\n\n> [!note] Fix\n> this beat\n\nB",
        on({ removeCallouts: true }),
      ),
    ).toBe("A\n\nB");
    expect(
      cleanFountainSource(
        "She runs.[^1]\n\n[^1]: Source note",
        on({ removeFootnotes: true }),
      ),
    ).toBe("She runs.\n");
    expect(
      cleanFountainSource("She runs. ^abc123", on({ removeBlockIds: true })),
    ).toBe("She runs.");
    // Fountain dual dialogue caret is not a block ID.
    expect(cleanFountainSource("JEN ^", on({ removeBlockIds: true }))).toBe(
      "JEN ^",
    );
    expect(
      cleanFountainSource("A ==big== moment", on({ removeHighlights: true })),
    ).toBe("A big moment");
    expect(
      cleanFountainSource(
        "Look ![[photo.png]] here",
        on({ removeEmbeds: true }),
      ),
    ).toBe("Look here");
    expect(
      cleanFountainSource("She runs #idea/later", on({ removeTags: true })),
    ).toBe("She runs");
    // Scene numbers are not tags.
    expect(
      cleanFountainSource("INT. ROOF - DAY #12#", on({ removeTags: true })),
    ).toBe("INT. ROOF - DAY #12#");
    // Everything off: unchanged.
    const all = "# H\n- [ ] t\n[[a|b]] %%c%% ==h== #tag ^id1\n```\nx\n```";
    expect(cleanFountainSource(all, none)).toBe(all);
  });

  it("keeps, unwraps or removes links", () => {
    const options = (wikilinks: LinkHandling, markdownLinks: LinkHandling) => ({
      ...DEFAULT_CLEAN_EXPORT_OPTIONS,
      wikilinks,
      markdownLinks,
    });
    const text =
      "Meet [[Jen (Character in TIGHTER)|Jen]] at [the barn](https://x.y).";
    expect(cleanFountainSource(text, options("keep", "keep"))).toBe(text);
    expect(cleanFountainSource(text, options("unwrap", "unwrap"))).toBe(
      "Meet Jen at the barn.",
    );
    expect(cleanFountainSource(text, options("remove", "remove"))).toBe(
      "Meet at.",
    );
  });

  it("keeps, unwraps or removes fenced code blocks", () => {
    const text = "A\n\n```js\nconst a = [[x]];\n```\n\nB\n\n~~~~\nraw\n~~~~";
    const handle = (codeBlocks: CodeBlockHandling) =>
      cleanFountainSource(text, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        codeBlocks,
      });
    expect(handle("keep")).toBe(text);
    // Content is left untouched (no link cleanup inside code).
    expect(handle("unwrap")).toBe("A\n\nconst a = [[x]];\n\nB\n\nraw");
    expect(handle("remove")).toBe("A\n\nB\n");
  });

  it("migrates the old link toggles", () => {
    expect(
      normalizeCleanExportOptions({
        unwrapWikilinks: false,
        unwrapMarkdownLinks: true,
      }),
    ).toMatchObject({ wikilinks: "keep", markdownLinks: "unwrap" });
    expect(normalizeCleanExportOptions(undefined)).toEqual(
      DEFAULT_CLEAN_EXPORT_OPTIONS,
    );
    expect(
      normalizeCleanExportOptions({ wikilinks: "remove", codeBlocks: "bogus" }),
    ).toMatchObject({ wikilinks: "remove", codeBlocks: "remove" });
  });

  it("closes the gaps left by removed elements", () => {
    const clean = (text: string) =>
      cleanFountainSource(text, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        wikilinks: "remove",
        markdownLinks: "remove",
        removeTags: true,
      });
    expect(clean("Look ![[photo.png]] here.")).toBe("Look here.");
    expect(clean("She runs [^1].")).toBe("She runs.");
    expect(clean("She runs %%cut%% fast")).toBe("She runs fast");
    expect(clean("#idea She runs")).toBe("She runs");
    expect(clean("(see [[Note]]) ok")).toBe("(see) ok");
    expect(clean("[[Note]] opens the door")).toBe("opens the door");
    // Indentation the line already had is kept.
    expect(clean("    Centered [[x]] text")).toBe("    Centered text");
    // Untouched lines keep their spacing exactly.
    expect(clean("Two  spaces stay.")).toBe("Two  spaces stay.");
  });
});
