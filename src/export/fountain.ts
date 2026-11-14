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

export interface CleanExportOptions {
  /** `- [ ] task` / `- [x] done` lines. */
  removeTasks: boolean;
  /** `[[target|alias]]` -> `alias`, `[[target]]` -> `target`. */
  unwrapWikilinks: boolean;
  /** `![[image.png]]` and `![alt](image.png)`. */
  removeEmbeds: boolean;
  /** `[text](https://...)` -> `text`. */
  unwrapMarkdownLinks: boolean;
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
  unwrapWikilinks: true,
  removeEmbeds: true,
  unwrapMarkdownLinks: true,
  removeHeadings: false,
  removeComments: true,
  removeCallouts: true,
  removeFootnotes: true,
  removeBlockIds: true,
  removeHighlights: true,
  removeTags: false,
};

const TASK_LINE = /^\s*[-*+]\s+\[[^\]]?\](?:\s.*)?$/u;
const WIKILINK = /(?<!!)\[\[([^[\]\n]+?)\]\]/gu;
const EMBED = /!\[\[[^[\]\n]*\]\]|!\[[^\]\n]*\]\([^)\n]*\)/gu;
const MARKDOWN_LINK = /(?<!!)\[([^[\]\n]+)\]\([^)\n]+\)/gu;
const HEADING_LINE = /^\s*#{1,6}\s/u;
const CALLOUT_START = /^\s*>\s*\[!/u;
const FOOTNOTE_DEFINITION = /^\s*\[\^[^\]\n]+\]:/u;
const FOOTNOTE_REFERENCE = /\[\^[^\]\n]+\]/gu;
// " ^abc-123" at line end; a lone "^" (Fountain dual dialogue) is kept.
const BLOCK_ID = /\s+\^[A-Za-z0-9-]+\s*$/u;
const HIGHLIGHT = /==([^=\n]+)==/gu;
// "#tag" or "#nested/tag" with at least one letter; not "#12#" scene numbers.
const TAG = /(^|\s)#(?=[\p{L}\p{N}_/-]*\p{L})[\p{L}\p{N}_/-]+(?!#)/gu;

/** `[[target|alias]]` -> `alias`, `[[target]]` -> `target`. Embeds stay. */
export function unwrapWikilinks(text: string): string {
  return text.replace(WIKILINK, (_match, inner: string) => {
    const pipe = inner.indexOf("|");
    return (pipe === -1 ? inner : inner.slice(pipe + 1)).trim();
  });
}

function cleanInline(line: string, options: CleanExportOptions): string {
  let text = line;
  if (options.removeEmbeds) text = text.replace(EMBED, "");
  if (options.unwrapWikilinks) text = unwrapWikilinks(text);
  if (options.unwrapMarkdownLinks) text = text.replace(MARKDOWN_LINK, "$1");
  if (options.removeFootnotes) text = text.replace(FOOTNOTE_REFERENCE, "");
  if (options.removeBlockIds) text = text.replace(BLOCK_ID, "");
  if (options.removeHighlights) text = text.replace(HIGHLIGHT, "$1");
  if (options.removeTags) text = text.replace(TAG, "$1");
  return text;
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

  for (const rawLine of source.replaceAll("\r\n", "\n").split("\n")) {
    let line = rawLine;
    let removed = false;

    if (options.removeComments) {
      let kept = "";
      let rest = line;
      for (;;) {
        const marker = rest.indexOf("%%");
        if (inComment) {
          if (marker === -1) {
            rest = "";
            break;
          }
          rest = rest.slice(marker + 2);
          inComment = false;
        } else {
          if (marker === -1) {
            kept += rest;
            break;
          }
          kept += rest.slice(0, marker);
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
