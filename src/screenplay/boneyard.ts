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

import { frontmatterEnd, isSceneHeading } from "./lines";

/** One `/* ... *\/` block taken out of a script (#288). */
export interface BoneyardBlock {
  /** The text inside the markers, trimmed. */
  text: string;
  /** The slugline of the scene it was in, or null before the first. */
  scene: string | null;
  /**
   * The Markdown heading above where the block starts (a heading inside
   * the block doesn't count), linked from the boneyard note; null when
   * there is none.
   */
  heading: string | null;
}

/** A change to the script: replace `from`..`to` with `insert`. */
export interface BoneyardEdit {
  from: number;
  to: number;
  insert: string;
}

/**
 * Every complete `/* ... *\/` block in `source` (after the frontmatter),
 * with the edits that take them out of the script. A block filling whole
 * lines takes its lines (and one blank line, so no double gap is left); a
 * block inside a line takes the space before it. An unclosed `/*` stays.
 */
export function findBoneyard(
  source: string,
  /**
   * Take just this range as the one block (#294): a selection, with or
   * without its own markers.
   */
  only?: { from: number; to: number },
): {
  blocks: BoneyardBlock[];
  edits: BoneyardEdit[];
} {
  const lines = source.split("\n");
  const end = frontmatterEnd(lines);
  let bodyStart = 0;
  for (let index = 0; index <= end; index += 1) {
    bodyStart += (lines[index] ?? "").length + 1;
  }
  const blocks: BoneyardBlock[] = [];
  const edits: BoneyardEdit[] = [];
  const lineStartOf = (offset: number) =>
    source.lastIndexOf("\n", offset - 1) + 1;
  const lineEndOf = (offset: number) => {
    const next = source.indexOf("\n", offset);
    return next === -1 ? source.length : next;
  };
  const headingBefore = (offset: number): string | null => {
    let at = lineStartOf(offset);
    while (at > bodyStart) {
      const previousEnd = at - 1;
      const previousStart = lineStartOf(previousEnd);
      const heading = /^#{1,6}[ \t]+(.+?)[ \t#]*$/u.exec(
        source.slice(previousStart, previousEnd),
      );
      if (heading) return heading[1] ?? null;
      at = previousStart;
    }
    return null;
  };
  const sceneBefore = (offset: number): string | null => {
    let at = lineStartOf(offset);
    while (at > bodyStart) {
      const previousEnd = at - 1;
      const previousStart = lineStartOf(previousEnd);
      const text = source.slice(previousStart, previousEnd).trim();
      if (isSceneHeading(text)) return text;
      at = previousStart;
    }
    return null;
  };

  // One block, from `open` to `blockEnd`, its text `inner`.
  const take = (open: number, blockEnd: number, inner: string): void => {
    const text = inner.trim();
    blocks.push({
      text,
      scene: sceneBefore(open),
      heading: headingBefore(open),
    });

    const startLine = lineStartOf(open);
    const endLine = lineEndOf(blockEnd);
    const before = source.slice(startLine, open);
    const after = source.slice(blockEnd, endLine);
    if (before.trim() === "" && after.trim() === "") {
      // Whole lines: take them, with their line break.
      let to = endLine < source.length ? endLine + 1 : endLine;
      let from = startLine;
      const blankBefore =
        startLine === bodyStart ||
        source
          .slice(lineStartOf(Math.max(startLine - 1, 0)), startLine - 1)
          .trim() === "";
      const nextLineEnd = lineEndOf(to);
      const blankAfter = source.slice(to, nextLineEnd).trim() === "";
      if (blankBefore && blankAfter && to < source.length) {
        to = nextLineEnd < source.length ? nextLineEnd + 1 : nextLineEnd;
      } else if (to === source.length && from > 0 && blankBefore) {
        from = Math.max(bodyStart, from - 1);
      }
      edits.push({ from, to, insert: "" });
    } else {
      // Inside a line: take the spaces before it too ("Text. /* x */").
      let from = open;
      while (from > startLine && /[ \t]/u.test(source.charAt(from - 1))) {
        from -= 1;
      }
      const keepSpace =
        from > startLine &&
        /^[ \t]*\S/u.test(after) &&
        !/^[ \t]*[.,;:!?)]/u.test(after);
      let to = blockEnd;
      if (from === startLine) {
        while (/[ \t]/u.test(source.charAt(to))) to += 1;
      }
      edits.push({
        from,
        to,
        insert: keepSpace && /^\S/u.test(after) ? " " : "",
      });
    }
  };

  if (only !== undefined) {
    const selected = source.slice(only.from, only.to);
    const unwrapped = /^\s*\/\*([\s\S]*)\*\/\s*$/u.exec(selected);
    if (selected.trim() !== "") {
      take(only.from, only.to, unwrapped ? (unwrapped[1] ?? "") : selected);
    }
    return { blocks, edits };
  }
  let search = bodyStart;
  for (;;) {
    const open = source.indexOf("/*", search);
    if (open === -1) break;
    const close = source.indexOf("*/", open + 2);
    if (close === -1) break;
    take(open, close + 2, source.slice(open + 2, close));
    search = close + 2;
  }
  return { blocks, edits };
}

/** `source` with `edits` applied (they don't overlap and are in order). */
export function applyBoneyardEdits(
  source: string,
  edits: readonly BoneyardEdit[],
): string {
  let out = "";
  let at = 0;
  for (const edit of edits) {
    out += source.slice(at, edit.from) + edit.insert;
    at = edit.to;
  }
  return out + source.slice(at);
}

/**
 * The text added to the boneyard note: for each scene, a heading with the
 * date, the slugline, and a link back to the heading the text was under in
 * the script (or to the script when it had none).
 */
export function boneyardSection(
  blocks: readonly BoneyardBlock[],
  date: string,
  /** The script's link text, as `[[...]]` would hold it. */
  scriptName: string,
  /**
   * From an outline (#300): each section is named by the heading the text
   * sat under, not by a scene.
   */
  outline = false,
): string {
  const groups: {
    scene: string | null;
    heading: string | null;
    texts: string[];
  }[] = [];
  for (const block of blocks) {
    const last = groups[groups.length - 1];
    if (
      last !== undefined &&
      last.scene === block.scene &&
      last.heading === block.heading
    ) {
      last.texts.push(block.text);
    } else {
      groups.push({
        scene: block.scene,
        heading: block.heading,
        texts: [block.text],
      });
    }
  }
  return groups
    .map(
      ({ scene, heading, texts }) =>
        `## ${date} · ${
          outline
            ? (heading ?? "Before the first heading")
            : (scene ?? "Before the first scene")
        } ([[${scriptName}${
          heading === null ? "" : `#${heading}`
        }]])\n\n${texts.filter((text) => text !== "").join("\n\n")}\n`,
    )
    .join("\n");
}

/**
 * Wrap `selected` in boneyard markers, or take them off when it already
 * has them (#294). Whole lines get the markers on lines of their own.
 */
export function toggleBoneyardMarkers(
  selected: string,
  wholeLines: boolean,
): string {
  const wrapped = /^(\s*)\/\*\s?([\s\S]*?)\s?\*\/(\s*)$/u.exec(selected);
  if (wrapped) {
    const inner = (wrapped[2] ?? "").replace(/^\n|\n$/gu, "");
    return `${wrapped[1] ?? ""}${inner}${wrapped[3] ?? ""}`;
  }
  return wholeLines ? `/*\n${selected}\n*/` : `/* ${selected} */`;
}
