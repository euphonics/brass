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
  inlineEmbeds,
  withoutFrontmatter,
  type EmbedResolver,
} from "../src/export/embeds";
import {
  cleanFountainSource,
  DEFAULT_CLEAN_EXPORT_OPTIONS,
} from "../src/export/fountain";

const notes: Record<string, string> = {
  Barn: "The barn is old.\nHay everywhere.",
  Nested: "Outside: ![[Barn]]",
  Loop: "Again ![[Loop]]",
  Deep1: "one ![[Deep2]]",
  Deep2: "two ![[Deep3]]",
  Deep3: "three ![[Deep4]]",
  Deep4: "four",
};

const resolve: EmbedResolver = async (link) => {
  const text = notes[link];
  return text === undefined ? null : { text, path: link };
};

describe("embeds in exports (#272)", () => {
  it("puts a whole-line embed's lines in place", async () => {
    expect(
      await inlineEmbeds("INT. BARN - DAY\n\n![[Barn]]\n", "Script", resolve),
    ).toBe("INT. BARN - DAY\n\nThe barn is old.\nHay everywhere.\n");
  });

  it("keeps an embed inside a sentence on its line", async () => {
    expect(
      await inlineEmbeds(
        "She sees it. ![[Barn]] Then runs.",
        "Script",
        resolve,
      ),
    ).toBe("She sees it. The barn is old. Hay everywhere. Then runs.");
  });

  it("follows embeds inside embedded text, up to three levels", async () => {
    expect(await inlineEmbeds("![[Nested]]", "Script", resolve)).toBe(
      "Outside: The barn is old. Hay everywhere.",
    );
    expect(await inlineEmbeds("![[Deep1]]", "Script", resolve)).toBe(
      "one two three ![[Deep4]]",
    );
  });

  it("doesn't follow a note into itself, and leaves images for the cleanup", async () => {
    expect(await inlineEmbeds("![[Loop]]", "Script", resolve)).toBe(
      "Again ![[Loop]]",
    );
    const kept = await inlineEmbeds(
      "Look. ![[photo.png]] Done.",
      "Script",
      resolve,
    );
    expect(kept).toBe("Look. ![[photo.png]] Done.");
    expect(
      cleanFountainSource(kept, {
        ...DEFAULT_CLEAN_EXPORT_OPTIONS,
        embeds: "include",
      }),
    ).toBe("Look. Done.");
  });

  it("drops the embedded note's frontmatter", () => {
    expect(withoutFrontmatter("---\ntags: x\n---\nBody.")).toBe("Body.");
  });
});
