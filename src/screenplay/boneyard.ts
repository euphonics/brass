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
  /**
   * The Markdown headings the block sits under, outermost first
   * (`# Act 1`, then `## The heist`), so the boneyard note can file it
   * under the same headings (#355). Empty when there are none.
   */
  headings?: BoneyardHeading[];
}

/** A Markdown heading: its level (1 for "#") and its text. */
export interface BoneyardHeading {
  level: number;
  text: string;
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
  // Every heading above, each one level up from the last: "# Act 1",
  // then "## The heist", outermost first.
  const headingsBefore = (offset: number): BoneyardHeading[] => {
    const found: BoneyardHeading[] = [];
    let below = 7;
    let at = lineStartOf(offset);
    while (at > bodyStart && below > 1) {
      const previousEnd = at - 1;
      const previousStart = lineStartOf(previousEnd);
      const heading = /^(#{1,6})[ \t]+(.+?)[ \t#]*$/u.exec(
        source.slice(previousStart, previousEnd),
      );
      const level = heading?.[1]?.length ?? 7;
      if (heading && level < below) {
        found.unshift({ level, text: heading[2] ?? "" });
        below = level;
      }
      at = previousStart;
    }
    return found;
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
    const headings = headingsBefore(open);
    blocks.push({
      text,
      scene: sceneBefore(open),
      heading: headingBefore(open),
      ...(headings.length > 0 ? { headings } : {}),
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
 * slugline, then a line with the date and a link back to the heading the
 * text was under in the script (or to the script when it had none).
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
        // The scene or heading as the title, then where and when it came
        // from on a line of its own (#303).
        `## ${
          outline
            ? (heading ?? "Before the first heading")
            : (scene ?? "Before the first scene")
        }\n\nArchived on ${date} from [[${scriptName}${
          heading === null ? "" : `#${heading}`
        }]]\n\n${texts.filter((text) => text !== "").join("\n\n")}\n`,
    )
    .join("\n");
}

/** The headings of a Markdown note: line, level, text (not in code). */
function noteHeadings(
  lines: readonly string[],
): { line: number; level: number; text: string }[] {
  const found: { line: number; level: number; text: string }[] = [];
  let start = 0;
  if (lines[0]?.trim() === "---") {
    const close = lines.findIndex(
      (line, at) => at > 0 && line.trim() === "---",
    );
    if (close > 0) start = close + 1;
  }
  let fence = false;
  for (let at = start; at < lines.length; at += 1) {
    const text = lines[at] ?? "";
    if (/^\s*(```|~~~)/u.test(text)) fence = !fence;
    if (fence) continue;
    const heading = /^(#{1,6})[ \t]+(.+?)[ \t#]*$/u.exec(text);
    if (heading) {
      found.push({
        line: at,
        level: heading[1]?.length ?? 1,
        text: heading[2] ?? "",
      });
    }
  }
  return found;
}

/** Every Markdown heading of `source`, in order (#356). */
export function scriptHeadings(source: string): BoneyardHeading[] {
  return noteHeadings(source.split("\n")).map(({ level, text }) => ({
    level,
    text,
  }));
}

const sameHeading = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * The boneyard note with `blocks` added (#355). Text that sat under
 * headings in the script (`# Act 1`, `## The heist`) goes under the same
 * headings in the boneyard note: found where they are, or added at the end
 * of their parent heading's section (or of the note). Under them, each
 * scene's text gets a heading of its own one level down, then the
 * "Archived on" line, as before. Text under no heading goes at the end.
 */
export function addToBoneyard(
  note: string,
  blocks: readonly BoneyardBlock[],
  date: string,
  scriptName: string,
  outline = false,
  /** Every heading of the script, in order, to place new ones (#356). */
  order: readonly BoneyardHeading[] = [],
): string {
  // Consecutive blocks under the same headings and scene go together.
  const groups: { blocks: BoneyardBlock[]; key: string }[] = [];
  for (const block of blocks) {
    const key = JSON.stringify([block.headings ?? [], block.scene]);
    const last = groups[groups.length - 1];
    if (last !== undefined && last.key === key) last.blocks.push(block);
    else groups.push({ blocks: [block], key });
  }
  let text = note;
  for (const group of groups) {
    const first = group.blocks[0];
    if (first === undefined) continue;
    const path = first.headings ?? [];
    const section = boneyardSection(group.blocks, date, scriptName, outline);
    if (path.length === 0) {
      text = text.trim() === "" ? section : `${text.trimEnd()}\n\n${section}`;
      continue;
    }
    const lines = text.trim() === "" ? [] : text.trimEnd().split("\n");
    const headings = noteHeadings(lines);
    // Find each heading of the path inside the section of the one before.
    let from = 0;
    let to = lines.length;
    let found = 0;
    for (const want of path) {
      const match = headings.find(
        (heading) =>
          heading.line >= from &&
          heading.line < to &&
          heading.level === want.level &&
          sameHeading(heading.text, want.text),
      );
      if (match === undefined) break;
      const next = headings.find(
        (heading) => heading.line > match.line && heading.level <= match.level,
      );
      from = match.line + 1;
      to = Math.min(to, next?.line ?? lines.length);
      found += 1;
    }
    const deepest = path[path.length - 1]?.level ?? 1;
    const added = path
      .slice(found)
      .map((heading) => `${"#".repeat(heading.level)} ${heading.text}`);
    // From an outline the title was the heading itself, now above it:
    // the date instead.
    const marks = "#".repeat(Math.min(6, deepest + 1));
    const entry = outline
      ? section.trimEnd().replace(/^## .*/u, `${marks} ${date}`)
      : section.trimEnd().replace(/^## /u, `${marks} `);
    // A heading that is added goes in the script's order among the
    // headings beside it (#356): "# Act 1" before an "# Act 2" already
    // there. Otherwise at the end of the section.
    const missing = path[found];
    const rank = (heading: BoneyardHeading): number =>
      order.findIndex(
        (other) =>
          other.level === heading.level &&
          sameHeading(other.text, heading.text),
      );
    const ownRank = missing === undefined ? -1 : rank(missing);
    const later =
      missing === undefined || ownRank === -1
        ? undefined
        : headings.find(
            (heading) =>
              heading.line >= from &&
              heading.line < to &&
              heading.level === missing.level &&
              rank(heading) > ownRank,
          );
    let insertAt = later?.line ?? to;
    while (insertAt > from && (lines[insertAt - 1] ?? "").trim() === "") {
      insertAt -= 1;
    }
    const before = lines.slice(0, insertAt).join("\n").trimEnd();
    const after = lines.slice(insertAt).join("\n").trim();
    const chunk = [...added, entry].join("\n\n");
    text =
      (before === "" ? "" : `${before}\n\n`) +
      chunk +
      (after === "" ? "\n" : `\n\n${after}\n`);
  }
  return text;
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
