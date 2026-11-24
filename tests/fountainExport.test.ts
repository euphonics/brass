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
  cleanFountainSource,
  DEFAULT_CLEAN_EXPORT_OPTIONS,
  normalizeCleanExportOptions,
  type CleanExportOptions,
  type CodeBlockHandling,
  type MarkdownLinkHandling,
  type WikilinkHandling,
  fountainExportPath,
  markCapitalsAsAction,
  stripObsidianFrontmatter,
} from "../src/export/fountain";

describe("marking capitals as action", () => {
  it("puts ! in front of capitals ending in punctuation with text below", () => {
    expect(markCapitalsAsAction("She runs.\n\nBANG!\nShe falls.")).toBe(
      "She runs.\n\n!BANG!\nShe falls.",
    );
  });

  it("leaves cues, lone capitals and marked lines alone", () => {
    const script = "JEN (V.O.)\nHi.\n\nSILENCE.\n\n!BOOM!\nDust.";
    expect(markCapitalsAsAction(script)).toBe(script);
  });
});

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
        embeds: "keep",
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
      embeds: "keep",
      markdownLinks: "keep",
      codeBlocks: "keep",
      removeHeadings: false,
      removeSynopses: false,
      removeBoneyard: false,
      comments: "keep",
      lineComments: "keep",
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
        on({ comments: "remove" }),
      ),
    ).toBe("She runs. Fast.");
    expect(
      cleanFountainSource(
        "A\n%%\nhidden\nnotes\n%%\nB",
        on({ comments: "remove" }),
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
      cleanFountainSource("Look ![[photo.png]] here", on({ embeds: "remove" })),
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
    const options = (
      wikilinks: WikilinkHandling,
      markdownLinks: MarkdownLinkHandling,
    ) => ({
      ...DEFAULT_CLEAN_EXPORT_OPTIONS,
      wikilinks,
      markdownLinks,
    });
    const text =
      "Meet [[Jen (Character in TIGHTER)|Jen]] at [the barn](https://x.y).";
    expect(cleanFountainSource(text, options("keep", "keep"))).toBe(text);
    expect(cleanFountainSource(text, options("alias", "name"))).toBe(
      "Meet Jen at the barn.",
    );
    expect(cleanFountainSource(text, options("file", "link"))).toBe(
      "Meet Jen (Character in TIGHTER) at https://x.y.",
    );
    expect(cleanFountainSource(text, options("remove", "remove"))).toBe(
      "Meet at.",
    );
  });

  it("falls back to the file name when a wikilink has no alias (#281)", () => {
    const wiki = (text: string, keep: "alias" | "file") =>
      cleanFountainSource(text, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        wikilinks: keep,
      });
    expect(wiki("See [[File name|alias]].", "alias")).toBe("See alias.");
    expect(wiki("See [[File name]].", "alias")).toBe("See File name.");
    expect(wiki("See [[Notes/Jen.md#Scene 3|her]].", "file")).toBe("See Jen.");
    expect(wiki("See [[Notes/Jen#^abc]].", "alias")).toBe("See Jen.");
    expect(
      cleanFountainSource('Go [home](<https://a.b/c d> "Home").', {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        markdownLinks: "link",
      }),
    ).toBe("Go https://a.b/c d.");
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
    ).toMatchObject({ wikilinks: "keep", markdownLinks: "name" });
    expect(
      normalizeCleanExportOptions({
        wikilinks: "unwrap",
        markdownLinks: "unwrap",
      }),
    ).toMatchObject({ wikilinks: "alias", markdownLinks: "name" });
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
    expect(clean("She runs %%cut%% fast")).toBe("She runs [[cut]] fast");
    expect(clean("#idea She runs")).toBe("She runs");
    expect(clean("(see [[Note]]) ok")).toBe("(see) ok");
    expect(clean("[[Note]] opens the door")).toBe("opens the door");
    // Indentation the line already had is kept.
    expect(clean("    Centered [[x]] text")).toBe("    Centered text");
    // Untouched lines keep their spacing exactly.
    expect(clean("Two  spaces stay.")).toBe("Two  spaces stay.");
  });

  it("leaves embeds alone when unwrapping links, even back to back", () => {
    const unwrap = (text: string) =>
      cleanFountainSource(text, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        embeds: "keep",
        wikilinks: "alias",
        markdownLinks: "name",
      });
    expect(unwrap("[[A]][[B|bee]] ![[pic.png]]")).toBe("Abee ![[pic.png]]");
    expect(unwrap("[go](x.md) ![alt](p.png)")).toBe("go ![alt](p.png)");
  });
});

describe("line comments", () => {
  it("strips // comments in clean export, keeping URLs and boneyards", () => {
    const source = [
      "MARA",
      "Dialogue. // grayed out",
      "",
      "// a note on its own line",
      "See https://example.com now.",
      "/* keep // this */",
      "",
      "She runs.",
    ].join("\n");
    expect(
      cleanFountainSource(source, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        lineComments: "remove",
      }),
    ).toBe(
      [
        "MARA",
        "Dialogue.",
        "",
        "See https://example.com now.",
        "/* keep // this */",
        "",
        "She runs.",
      ].join("\n"),
    );
  });

  it("turns // comments into Fountain notes by default (#277)", () => {
    const source = [
      "MARA",
      "Dialogue. // see [[Ideas]] later",
      "",
      "  // a note on its own line",
      "",
      "She runs. //",
    ].join("\n");
    expect(cleanFountainSource(source)).toBe(
      [
        "MARA",
        "Dialogue. [[see [[Ideas] ] later]]",
        "",
        "  [[a note on its own line]]",
        "",
        "She runs.",
      ].join("\n"),
    );
  });

  it("turns // comments into boneyard when chosen", () => {
    expect(
      cleanFountainSource("Dialogue. // cut */ this", {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        lineComments: "boneyard",
      }),
    ).toBe("Dialogue. /* cut * / this */");
  });
});

describe("%% comments to Fountain notes or boneyard (#280)", () => {
  const as = (comments: "note" | "boneyard" | "keep") => ({
    ...DEFAULT_CLEAN_EXPORT_OPTIONS,
    comments,
  });

  it("turns an inline comment into a note, cleaning the text inside", () => {
    expect(
      cleanFountainSource("She runs. %% see [[Ideas]] %% Fast.", as("note")),
    ).toBe("She runs. [[see Ideas]] Fast.");
  });

  it("keeps a comment across lines as one note, blank lines included", () => {
    expect(
      cleanFountainSource("A\n%%\nhidden\n\nnotes\n%%\nB", as("note")),
    ).toBe("A\n[[\nhidden\n  \nnotes\n]]\nB");
  });

  it("turns comments into boneyard", () => {
    expect(
      cleanFountainSource("She runs. %%cut */ this%% Fast.", as("boneyard")),
    ).toBe("She runs. /* cut * / this */ Fast.");
    expect(cleanFountainSource("A\n%%\nhidden\n%%\nB", as("boneyard"))).toBe(
      "A\n/*\nhidden\n*/\nB",
    );
  });

  it("leaves comments alone with Keep", () => {
    expect(cleanFountainSource("A %%x%% B", as("keep"))).toBe("A %%x%% B");
  });

  it("reads the old comments toggle", () => {
    expect(
      normalizeCleanExportOptions({ removeComments: false }).comments,
    ).toBe("keep");
    expect(normalizeCleanExportOptions({ removeComments: true }).comments).toBe(
      "note",
    );
  });
});

describe("Fountain's hidden elements (#277)", () => {
  const source = [
    "# Act One",
    "",
    "= Mara gets the key.",
    "",
    "INT. HALL - NIGHT",
    "",
    "She waits. /* cut",
    "this */ Then runs.",
    "",
    "===",
    "",
    "==Bright== light.",
  ].join("\n");

  it("keeps sections, synopses and boneyard by default", () => {
    expect(cleanFountainSource(source)).toBe(
      source.replace("==Bright==", "Bright"),
    );
  });

  it("removes them when asked, keeping page breaks", () => {
    expect(
      cleanFountainSource(source, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        removeHeadings: true,
        removeSynopses: true,
        removeBoneyard: true,
      }),
    ).toBe(
      [
        "INT. HALL - NIGHT",
        "",
        "She waits.",
        "Then runs.",
        "",
        "===",
        "",
        "Bright light.",
      ].join("\n"),
    );
  });

  it("reads the old line comment toggle", () => {
    expect(
      normalizeCleanExportOptions({ removeLineComments: false }).lineComments,
    ).toBe("keep");
    expect(
      normalizeCleanExportOptions({ removeLineComments: true }).lineComments,
    ).toBe("note");
  });
});
