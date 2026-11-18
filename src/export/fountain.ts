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

import { classifyLines } from "../screenplay/lines";

export function stripObsidianFrontmatter(source: string): string {
  const normalized = source.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.replace(/^\uFEFF/u, "").trim() !== "---") return source;

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (closingIndex === -1) return source;

  return lines
    .slice(closingIndex + 1)
    .join("\n")
    .replace(/^\n+/u, "");
}

export function fountainExportPath(
  sourcePath: string,
  existingPaths: Pick<ReadonlySet<string>, "has">,
): string {
  const slash = sourcePath.lastIndexOf("/");
  const directory = slash === -1 ? "" : sourcePath.slice(0, slash + 1);
  const filename = slash === -1 ? sourcePath : sourcePath.slice(slash + 1);
  const dot = filename.lastIndexOf(".");
  const basename = dot === -1 ? filename : filename.slice(0, dot);
  const extension = dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
  const exportBase = extension === "fountain" ? `${basename}-export` : basename;

  let candidate = `${directory}${exportBase}.fountain`;
  let suffix = 2;
  while (existingPaths.has(candidate)) {
    candidate = `${directory}${exportBase}-${suffix}.fountain`;
    suffix += 1;
  }
  return candidate;
}

/** Keep links as written, keep only their text, or remove them. */
export type LinkHandling = "keep" | "unwrap" | "remove";
/** Keep code blocks, keep only their content (no fences), or remove them. */
export type CodeBlockHandling = "keep" | "unwrap" | "remove";

export interface CleanExportOptions {
  /** `- [ ] task` / `- [x] done` lines. */
  removeTasks: boolean;
  /** `[[target|alias]]`: keep, unwrap to `alias` / `target`, or remove. */
  wikilinks: LinkHandling;
  /** `![[image.png]]` and `![alt](image.png)`. */
  removeEmbeds: boolean;
  /** `[text](https://...)`: keep, unwrap to `text`, or remove. */
  markdownLinks: LinkHandling;
  /** ```` ``` ```` / `~~~` fenced code blocks. */
  codeBlocks: CodeBlockHandling;
  /** `# Heading` lines (also Fountain sections). */
  removeHeadings: boolean;
  /** `%% comment %%`, inline or across lines. */
  removeComments: boolean;
  /** `> [!note]` callout blocks. */
  removeCallouts: boolean;
  /** `[^1]` references and `[^1]: ...` definitions. */
  removeFootnotes: boolean;
  /** Block IDs at the end of a line: ` ^abc123`. */
  removeBlockIds: boolean;
  /** `==text==` -> `text`. */
  removeHighlights: boolean;
  /** Inline `#tags`. */
  removeTags: boolean;
}

export const DEFAULT_CLEAN_EXPORT_OPTIONS: CleanExportOptions = {
  removeTasks: true,
  wikilinks: "unwrap",
  removeEmbeds: true,
  markdownLinks: "unwrap",
  codeBlocks: "remove",
  removeHeadings: false,
  removeComments: true,
  removeCallouts: true,
  removeFootnotes: true,
  removeBlockIds: true,
  removeHighlights: true,
  removeTags: false,
};

const TASK_LINE = /^\s*[-*+]\s+\[[^\]]?\](?:\s.*)?$/u;
// The link patterns capture an optional leading `!` so embeds can be left
// alone. iOS before 16.4 has no lookbehind, so `(?<!!)` can't be used.
const WIKILINK = /(!?)\[\[([^[\]\n]+?)\]\]/gu;
const EMBED = /!\[\[[^[\]\n]*\]\]|!\[[^\]\n]*\]\([^)\n]*\)/gu;
const MARKDOWN_LINK = /(!?)\[([^[\]\n]+)\]\([^)\n]+\)/gu;
const HEADING_LINE = /^\s*#{1,6}\s/u;
const CALLOUT_START = /^\s*>\s*\[!/u;
const FOOTNOTE_DEFINITION = /^\s*\[\^[^\]\n]+\]:/u;
const FOOTNOTE_REFERENCE = /\[\^[^\]\n]+\]/gu;
// " ^abc-123" at line end; a lone "^" (Fountain dual dialogue) is kept.
const BLOCK_ID = /\s+\^[A-Za-z0-9-]+\s*$/u;
const HIGHLIGHT = /==([^=\n]+)==/gu;
// "#tag" or "#nested/tag" with at least one letter; not "#12#" scene numbers.
const TAG = /(^|\s)#(?=[\p{L}\p{N}_/-]*\p{L})[\p{L}\p{N}_/-]+(?!#)/gu;

const LINK_HANDLING: readonly LinkHandling[] = ["keep", "unwrap", "remove"];

/**
 * Clean export options from stored settings, filling gaps with defaults and
 * migrating the old `unwrapWikilinks` / `unwrapMarkdownLinks` toggles.
 */
export function normalizeCleanExportOptions(
  stored: Record<string, unknown> | undefined,
): CleanExportOptions {
  const options: CleanExportOptions = { ...DEFAULT_CLEAN_EXPORT_OPTIONS };
  if (!stored) return options;
  for (const key of Object.keys(options) as (keyof CleanExportOptions)[]) {
    const value = stored[key];
    if (typeof value === typeof options[key]) {
      (options as unknown as Record<string, unknown>)[key] = value;
    }
  }
  const linkValue = (value: unknown, legacy: unknown): LinkHandling | null =>
    LINK_HANDLING.includes(value as LinkHandling)
      ? (value as LinkHandling)
      : typeof legacy === "boolean"
        ? legacy
          ? "unwrap"
          : "keep"
        : null;
  options.wikilinks =
    linkValue(stored.wikilinks, stored.unwrapWikilinks) ?? options.wikilinks;
  options.markdownLinks =
    linkValue(stored.markdownLinks, stored.unwrapMarkdownLinks) ??
    options.markdownLinks;
  if (!LINK_HANDLING.includes(options.codeBlocks)) {
    options.codeBlocks = DEFAULT_CLEAN_EXPORT_OPTIONS.codeBlocks;
  }
  return options;
}

/** `[[target|alias]]` -> `alias`, `[[target]]` -> `target`. Embeds stay. */
export function unwrapWikilinks(text: string): string {
  return text.replace(WIKILINK, (match, bang: string, inner: string) => {
    if (bang) return match;
    const pipe = inner.indexOf("|");
    return (pipe === -1 ? inner : inner.slice(pipe + 1)).trim();
  });
}

/** Marks where something was removed, so the spacing can be fixed after. */
const GAP = "\uE000";

/**
 * Close the gaps left by removed elements: one space between words, none
 * before punctuation or at the start/end of the text, and the line's own
 * indentation kept. "Look ![[x]] here." -> "Look here."; "runs [^1]." ->
 * "runs.".
 */
export function closeGaps(text: string): string {
  return text.replace(
    /([ \t]*)\uE000+([ \t]*)/gu,
    (match: string, before: string, after: string, offset: number) => {
      const previous = text.slice(0, offset);
      const next = text.slice(offset + match.length);
      if (previous.trim() === "") return before;
      if (next === "" || /^[.,;:!?)\]}"'’”]/u.test(next)) return "";
      if (/[([{"'‘“]$/u.test(previous)) return "";
      return before || after ? " " : "";
    },
  );
}

function cleanInline(line: string, options: CleanExportOptions): string {
  let text = line;
  if (options.removeEmbeds) text = text.replace(EMBED, GAP);
  if (options.wikilinks === "unwrap") text = unwrapWikilinks(text);
  if (options.wikilinks === "remove") {
    text = text.replace(WIKILINK, (match, bang: string) =>
      bang ? match : GAP,
    );
  }
  if (options.markdownLinks === "unwrap") {
    text = text.replace(MARKDOWN_LINK, (match, bang: string, label: string) =>
      bang ? match : label,
    );
  }
  if (options.markdownLinks === "remove") {
    text = text.replace(MARKDOWN_LINK, (match, bang: string) =>
      bang ? match : GAP,
    );
  }
  if (options.removeFootnotes) text = text.replace(FOOTNOTE_REFERENCE, GAP);
  if (options.removeBlockIds) text = text.replace(BLOCK_ID, GAP);
  if (options.removeHighlights) text = text.replace(HIGHLIGHT, "$1");
  if (options.removeTags) text = text.replace(TAG, `$1${GAP}`);
  return text.includes(GAP) ? closeGaps(text) : text;
}

/**
 * Clean Fountain export: strip the Obsidian-only elements selected in
 * `options` (tasks, wikilinks, embeds, comments, callouts, footnotes, ...).
 * Lines emptied by the cleanup are dropped without leaving extra blank lines.
 */
export function cleanFountainSource(
  source: string,
  options: CleanExportOptions = DEFAULT_CLEAN_EXPORT_OPTIONS,
): string {
  const output: string[] = [];
  let removedSinceLastLine = false;
  let inComment = false;
  let inCallout = false;
  let fence: string | null = null;

  for (const rawLine of source.replaceAll("\r\n", "\n").split("\n")) {
    let line = rawLine;
    let removed = false;

    // Fenced code blocks: content is code, so no other cleanup applies.
    const fenceMatch = /^\s*(`{3,}|~{3,})/u.exec(line);
    if (fence === null && fenceMatch && !inComment) {
      fence = fenceMatch[1] ?? "```";
      if (options.codeBlocks === "keep") output.push(line);
      else removedSinceLastLine = true;
      continue;
    }
    if (fence !== null) {
      const closes =
        fenceMatch !== null &&
        (fenceMatch[1] ?? "").startsWith(fence.charAt(0)) &&
        (fenceMatch[1] ?? "").length >= fence.length &&
        line.trim() === fenceMatch[1];
      if (closes) fence = null;
      if (
        options.codeBlocks === "keep" ||
        (options.codeBlocks === "unwrap" && !closes)
      ) {
        output.push(line);
        removedSinceLastLine = false;
      } else {
        removedSinceLastLine = true;
      }
      continue;
    }

    if (options.removeComments) {
      let kept = "";
      let rest = line;
      for (;;) {
        const marker = rest.indexOf("%%");
        if (inComment) {
          if (marker === -1) break;
          rest = rest.slice(marker + 2);
          inComment = false;
        } else {
          if (marker === -1) {
            kept += rest;
            break;
          }
          kept += rest.slice(0, marker) + GAP;
          rest = rest.slice(marker + 2);
          inComment = true;
        }
      }
      if (kept !== line) removed = true;
      line = kept;
    }

    if (options.removeCallouts) {
      if (CALLOUT_START.test(line)) inCallout = true;
      else if (inCallout && !/^\s*>/u.test(line)) inCallout = false;
      if (inCallout) {
        line = "";
        removed = true;
      }
    }

    if (
      (options.removeTasks && TASK_LINE.test(line)) ||
      (options.removeHeadings && HEADING_LINE.test(line)) ||
      (options.removeFootnotes && FOOTNOTE_DEFINITION.test(line))
    ) {
      line = "";
      removed = true;
    }

    let cleaned = cleanInline(line, options);
    if (cleaned.includes(GAP)) cleaned = closeGaps(cleaned);
    if (cleaned !== line) {
      removed = true;
      // Don't leave trailing spaces where a tag or ID was removed.
      cleaned = cleaned.trimEnd();
    }
    line = cleaned.trim() === "" && rawLine.trim() !== "" ? "" : cleaned;

    // A line emptied by the cleanup is dropped entirely.
    if (removed && line.trim() === "") {
      removedSinceLastLine = true;
      continue;
    }
    // Avoid leaving a double blank line where something was removed.
    if (
      removedSinceLastLine &&
      line.trim() === "" &&
      (output.length === 0 || output[output.length - 1]?.trim() === "")
    ) {
      continue;
    }
    removedSinceLastLine = false;
    output.push(line);
  }
  return output.join("\n");
}

/**
 * Put `!` in front of lines Scribidian reads as action that plain Fountain
 * (and Final Draft, Fade In) would read as a character: a line in capitals
 * ending in punctuation ("BANG!") with text right under it. Other lines
 * are left as they are.
 */
export function markCapitalsAsAction(source: string): string {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const kinds = classifyLines(lines);
  return lines
    .map((line, index) => {
      const text = line.trim();
      if (kinds[index] !== "action" || text === "" || text.startsWith("!")) {
        return line;
      }
      const startsBlock = index === 0 || (lines[index - 1] ?? "").trim() === "";
      const textBelow = (lines[index + 1] ?? "").trim() !== "";
      const capitals = /\p{Lu}/u.test(text) && !/\p{Ll}/u.test(text);
      if (!startsBlock || !textBelow || !capitals) return line;
      const indent = line.length - line.trimStart().length;
      return `${line.slice(0, indent)}!${line.slice(indent)}`;
    })
    .join("\n");
}
