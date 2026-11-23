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

import { classifyLines, findLineComment } from "../screenplay/lines";

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

/**
 * `[[file name|alias]]`: keep as written, keep the alias (the file name
 * when there is none), keep the file name, or remove.
 */
export type WikilinkHandling = "keep" | "alias" | "file" | "remove";
/** `[name](link)`: keep as written, keep the name, keep the link, or remove. */
export type MarkdownLinkHandling = "keep" | "name" | "link" | "remove";
/** Keep code blocks, keep only their content (no fences), or remove them. */
export type CodeBlockHandling = "keep" | "unwrap" | "remove";

export interface CleanExportOptions {
  /** `- [ ] task` / `- [x] done` lines. */
  removeTasks: boolean;
  /** `[[file name|alias]]`: see WikilinkHandling. */
  wikilinks: WikilinkHandling;
  /** `![[image.png]]` and `![alt](image.png)`. */
  removeEmbeds: boolean;
  /** `[name](link)`: see MarkdownLinkHandling. */
  markdownLinks: MarkdownLinkHandling;
  /** ```` ``` ```` / `~~~` fenced code blocks. */
  codeBlocks: CodeBlockHandling;
  /** `# Heading` lines (also Fountain sections). */
  removeHeadings: boolean;
  /** Fountain synopses: `= text` lines. */
  removeSynopses: boolean;
  /** Fountain boneyard: `/* ... *\/`, inline or across lines. */
  removeBoneyard: boolean;
  /**
   * Obsidian comments, `%% comment %%` (inline or across lines): keep,
   * turn into a Fountain note (`[[comment]]`) or boneyard
   * (`/* comment *\/`), or remove.
   */
  comments: CommentHandling;
  /**
   * Line comments, `// note` to the end of the line (Scribidian): keep,
   * turn into a Fountain note (`[[note]]`) or boneyard (`/* note *\/`),
   * or remove.
   */
  lineComments: CommentHandling;
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

/** What a clean export does with a `%% comment %%` or `// line comment`. */
export type CommentHandling = "keep" | "note" | "boneyard" | "remove";

const COMMENT_HANDLING: readonly CommentHandling[] = [
  "keep",
  "note",
  "boneyard",
  "remove",
];

/**
 * Clean Fountain defaults: Obsidian-only markup goes; Fountain's own
 * hidden elements (sections, synopses, boneyard) stay, and line comments
 * become Fountain notes, so other Fountain apps keep them out of print.
 */
export const DEFAULT_CLEAN_EXPORT_OPTIONS: CleanExportOptions = {
  removeTasks: true,
  wikilinks: "alias",
  removeEmbeds: true,
  markdownLinks: "name",
  codeBlocks: "remove",
  removeHeadings: false,
  removeSynopses: false,
  removeBoneyard: false,
  comments: "note",
  lineComments: "note",
  removeCallouts: true,
  removeFootnotes: true,
  removeBlockIds: true,
  removeHighlights: true,
  removeTags: true,
};

const TASK_LINE = /^\s*[-*+]\s+\[[^\]]?\](?:\s.*)?$/u;
// The link patterns capture an optional leading `!` so embeds can be left
// alone. iOS before 16.4 has no lookbehind, so `(?<!!)` can't be used.
const WIKILINK = /(!?)\[\[([^[\]\n]+?)\]\]/gu;
const EMBED = /!\[\[[^[\]\n]*\]\]|!\[[^\]\n]*\]\([^)\n]*\)/gu;
const MARKDOWN_LINK = /(!?)\[([^[\]\n]+)\]\([^)\n]+\)/gu;

/** The link of `[name](link "title")`: `link`. */
function markdownLinkTarget(link: string): string {
  const inside = link.slice(link.lastIndexOf("](") + 2, -1).trim();
  const target = inside.split(/\s+"/u)[0] ?? inside;
  return target.replace(/^<|>$/gu, "");
}
const HEADING_LINE = /^\s*#{1,6}\s/u;
// "= text" (a synopsis); not "===" (a page break) or "==highlight==".
const SYNOPSIS_LINE = /^\s*=(?!=)/u;
const CALLOUT_START = /^\s*>\s*\[!/u;
const FOOTNOTE_DEFINITION = /^\s*\[\^[^\]\n]+\]:/u;
const FOOTNOTE_REFERENCE = /\[\^[^\]\n]+\]/gu;
// " ^abc-123" at line end; a lone "^" (Fountain dual dialogue) is kept.
const BLOCK_ID = /\s+\^[A-Za-z0-9-]+\s*$/u;
const HIGHLIGHT = /==([^=\n]+)==/gu;
// "#tag" or "#nested/tag" with at least one letter; not "#12#" scene numbers.
const TAG = /(^|\s)#(?=[\p{L}\p{N}_/-]*\p{L})[\p{L}\p{N}_/-]+(?!#)/gu;

/** Clean PDF defaults: only what prints (#277). */
export const DEFAULT_CLEAN_EXPORT_OPTIONS_PDF: CleanExportOptions = {
  ...DEFAULT_CLEAN_EXPORT_OPTIONS,
  removeHeadings: true,
  removeSynopses: true,
  removeBoneyard: true,
  comments: "remove",
  lineComments: "remove",
};

/**
 * Clean Final Draft defaults: like Fountain, but boneyard and line
 * comments have no Final Draft equivalent yet (#278).
 */
export const DEFAULT_CLEAN_EXPORT_OPTIONS_FDX: CleanExportOptions = {
  ...DEFAULT_CLEAN_EXPORT_OPTIONS,
  removeBoneyard: true,
  comments: "remove",
  lineComments: "remove",
};

const WIKILINK_HANDLING: readonly WikilinkHandling[] = [
  "keep",
  "alias",
  "file",
  "remove",
];
const MARKDOWN_LINK_HANDLING: readonly MarkdownLinkHandling[] = [
  "keep",
  "name",
  "link",
  "remove",
];
const CODE_BLOCK_HANDLING: readonly CodeBlockHandling[] = [
  "keep",
  "unwrap",
  "remove",
];

/**
 * Clean export options from stored settings, filling gaps with defaults and
 * migrating the old `unwrapWikilinks` / `unwrapMarkdownLinks` toggles.
 */
export function normalizeCleanExportOptions(
  stored: Record<string, unknown> | undefined,
  defaults: CleanExportOptions = DEFAULT_CLEAN_EXPORT_OPTIONS,
): CleanExportOptions {
  const options: CleanExportOptions = { ...defaults };
  if (!stored) return options;
  for (const key of Object.keys(options) as (keyof CleanExportOptions)[]) {
    const value = stored[key];
    if (typeof value === typeof options[key]) {
      (options as unknown as Record<string, unknown>)[key] = value;
    }
  }
  // Links were keep / unwrap / remove (and before that, toggles): unwrap
  // is now "alias" for wikilinks and "name" for web links (#281).
  const linkValue = <T extends string>(
    value: unknown,
    legacy: unknown,
    allowed: readonly T[],
    unwrapped: T,
  ): T | null =>
    allowed.includes(value as T)
      ? (value as T)
      : value === "unwrap"
        ? unwrapped
        : typeof legacy === "boolean"
          ? legacy
            ? unwrapped
            : ("keep" as T)
          : null;
  options.wikilinks =
    linkValue(
      stored.wikilinks,
      stored.unwrapWikilinks,
      WIKILINK_HANDLING,
      "alias",
    ) ?? defaults.wikilinks;
  options.markdownLinks =
    linkValue(
      stored.markdownLinks,
      stored.unwrapMarkdownLinks,
      MARKDOWN_LINK_HANDLING,
      "name",
    ) ?? defaults.markdownLinks;
  if (!CODE_BLOCK_HANDLING.includes(options.codeBlocks)) {
    options.codeBlocks = defaults.codeBlocks;
  }
  // "Remove line comments" was a toggle: off keeps them; on takes the
  // format's default (#277).
  // "Remove comments" and "Remove line comments" were toggles: off keeps
  // them; on takes the format's default (#277, #280).
  if (!COMMENT_HANDLING.includes(options.lineComments)) {
    options.lineComments = defaults.lineComments;
  }
  if (stored.lineComments === undefined && stored.removeLineComments === false)
    options.lineComments = "keep";
  if (!COMMENT_HANDLING.includes(options.comments)) {
    options.comments = defaults.comments;
  }
  if (stored.comments === undefined && stored.removeComments === false)
    options.comments = "keep";
  return options;
}

/**
 * The file name a wikilink points to: `Folder/Jen.md#Scene|x` -> `Jen`
 * (no folder, extension, heading or block).
 */
function wikilinkFileName(target: string): string {
  const file = target.split(/[#^]/u)[0] ?? target;
  const name = file.slice(file.lastIndexOf("/") + 1).replace(/\.md$/iu, "");
  return (name || target).trim();
}

/**
 * Wikilinks as words. "alias": `[[file name|alias]]` -> `alias`,
 * `[[file name]]` -> `file name`. "file": the file name in both. Embeds
 * stay.
 */
export function unwrapWikilinks(
  text: string,
  keep: "alias" | "file" = "alias",
): string {
  return text.replace(WIKILINK, (match, bang: string, inner: string) => {
    if (bang) return match;
    const pipe = inner.indexOf("|");
    const target = pipe === -1 ? inner : inner.slice(0, pipe);
    const alias = pipe === -1 ? "" : inner.slice(pipe + 1).trim();
    if (keep === "alias" && alias !== "") return alias;
    return wikilinkFileName(target);
  });
}

/** Marks where something was removed, so the spacing can be fixed after. */
const GAP = "\uE000";
/** Stand-ins for the brackets of a converted `%% comment %%`. */
const NOTE_OPEN = "\uE001";
const NOTE_CLOSE = "\uE002";
const BONEYARD_OPEN = "\uE003";
const BONEYARD_CLOSE = "\uE004";

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
  if (options.wikilinks === "alias" || options.wikilinks === "file")
    text = unwrapWikilinks(text, options.wikilinks);
  if (options.wikilinks === "remove") {
    text = text.replace(WIKILINK, (match, bang: string) =>
      bang ? match : GAP,
    );
  }
  if (options.markdownLinks === "name" || options.markdownLinks === "link") {
    const keepLink = options.markdownLinks === "link";
    text = text.replace(MARKDOWN_LINK, (match, bang: string, label: string) =>
      bang ? match : keepLink ? markdownLinkTarget(match) : label,
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
  let inBoneyard = false;
  let inRemovedBoneyard = false;
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

    if (options.comments === "remove") {
      let kept = "";
      let rest = line;
      for (;;) {
        const marker = rest.indexOf("%%");
        if (inComment) {
          if (marker === -1) break;
          rest = rest.slice(marker + 2);
          kept += GAP;
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
    } else if (
      options.comments !== "keep" &&
      (inComment || line.includes("%%"))
    ) {
      // Turn "%%" into a Fountain note or boneyard. Placeholders stand in
      // for the brackets until the inline cleanup is done, so the note
      // isn't unwrapped as a wikilink; the text inside is cleaned too.
      const note = options.comments === "note";
      const startedInside = inComment;
      let kept = "";
      let rest = line;
      for (;;) {
        const marker = rest.indexOf("%%");
        if (marker === -1) {
          kept += rest;
          break;
        }
        kept += rest.slice(0, marker);
        kept += inComment
          ? note
            ? NOTE_CLOSE
            : BONEYARD_CLOSE
          : note
            ? NOTE_OPEN
            : BONEYARD_OPEN;
        inComment = !inComment;
        rest = rest.slice(marker + 2);
      }
      // A blank line would end a Fountain note: two spaces keep it going.
      if (note && startedInside && inComment && kept.trim() === "") {
        kept = "  ";
      }
      line = kept;
    }

    if (options.removeBoneyard) {
      let kept = "";
      let rest = line;
      for (;;) {
        if (inRemovedBoneyard) {
          const close = rest.indexOf("*/");
          if (close === -1) break;
          rest = rest.slice(close + 2);
          kept += GAP;
          inRemovedBoneyard = false;
        } else {
          const open = rest.indexOf("/*");
          if (open === -1) {
            kept += rest;
            break;
          }
          kept += rest.slice(0, open) + GAP;
          rest = rest.slice(open + 2);
          inRemovedBoneyard = true;
        }
      }
      if (kept !== line) removed = true;
      line = kept;
    }

    // Line comments: "// note" to the end of the line, outside boneyards.
    // Kept aside and added back after the inline cleanup, so a comment
    // turned into a Fountain note isn't unwrapped as a wikilink.
    let convertedComment: string | null = null;
    {
      const comment = findLineComment(line, inBoneyard);
      inBoneyard = comment.inBoneyard;
      if (options.lineComments !== "keep" && comment.at !== null) {
        const body = line
          .slice(comment.at)
          .replace(/^\/\/\s*/u, "")
          .trim();
        if (body !== "" && options.lineComments === "note") {
          convertedComment = `[[${body.replaceAll("]]", "] ]")}]]`;
        } else if (body !== "" && options.lineComments === "boneyard") {
          convertedComment = `/* ${body.replaceAll("*/", "* /")} */`;
        }
        line = line.slice(0, comment.at).trimEnd();
        removed = true;
      }
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
      (options.removeSynopses && SYNOPSIS_LINE.test(line)) ||
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
    if (/[\uE001-\uE004]/u.test(line)) {
      line = line
        .replace(
          /\uE001([^\uE002]*)/gu,
          (_, inner: string) => `[[${inner.trim().replaceAll("]]", "] ]")}`,
        )
        .replace(/\uE003([^\uE004]*)/gu, (_, inner: string) =>
          inner.trim() === ""
            ? BONEYARD_OPEN
            : `/* ${inner.trim().replaceAll("*/", "* /")}`,
        )
        .replace(/^(\s*)/u, "$1*/")
        .replaceAll(NOTE_CLOSE, "]]")
        .replaceAll(BONEYARD_CLOSE, " */")
        .replaceAll(NOTE_OPEN, "[[")
        .replaceAll(BONEYARD_OPEN, "/*");
    }
    if (convertedComment !== null) {
      line =
        line.trim() === ""
          ? `${/^\s*/u.exec(rawLine)?.[0] ?? ""}${convertedComment}`
          : `${line.trimEnd()} ${convertedComment}`;
    }

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
