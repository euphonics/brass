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

import { isSceneHeading } from "../screenplay/parser";
import {
  isForcedTransition,
  isMarkdownHeading,
  isTransitionText,
  looksLikeCharacterCue,
} from "./smartTab";

/** How a line is laid out in the editor's screenplay layout. */
export type LayoutLineKind =
  | "scene-heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "centered"
  | "lyric"
  | "page-break"
  | "note";

function isBlank(line: string | undefined): boolean {
  return line === undefined || line.trim() === "";
}

function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0]?.replace(/^\uFEFF/u, "").trim() !== "---") return -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") return index;
  }
  return -1;
}

/**
 * Lay out each line of a Fountain document for the editor. `null` means the
 * line keeps Obsidian's normal look (blank lines, frontmatter, Markdown
 * headings and tags). `cursorLine` (0-based) lets a character cue being typed
 * show as a cue before its dialogue exists.
 */
export function classifyLayoutLines(
  lines: readonly string[],
  cursorLine = -1,
  forced: { line: number; kind: LayoutLineKind } | null = null,
): (LayoutLineKind | null)[] {
  const kinds: (LayoutLineKind | null)[] = new Array<LayoutLineKind | null>(
    lines.length,
  ).fill(null);
  const firstContentLine = frontmatterEnd(lines) + 1;
  let inDialogue = false;
  let inBoneyard = false;
  let inComment = false;

  for (let index = firstContentLine; index < lines.length; index += 1) {
    const text = (lines[index] ?? "").trim();

    // Boneyard /* ... */ and Obsidian %% ... %% comments can span lines.
    if (
      inBoneyard ||
      inComment ||
      text.startsWith("/*") ||
      text.startsWith("%%")
    ) {
      kinds[index] = "note";
      if (inComment) {
        if (text.endsWith("%%")) inComment = false;
        inDialogue = false;
      } else if (inBoneyard) {
        if (text.endsWith("*/")) inBoneyard = false;
        inDialogue = false;
      } else {
        const opener = text.startsWith("%%") ? "%%" : "/*";
        const closer = opener === "%%" ? "%%" : "*/";
        const oneLine = text.length >= 4 && text.endsWith(closer);
        // A one-line comment inside a speech doesn't end it.
        if (!oneLine) {
          if (opener === "%%") inComment = true;
          else inBoneyard = true;
          inDialogue = false;
        }
      }
      continue;
    }

    // A line the writer set to an element (Shift+Tab, "Set line to …").
    if (forced !== null && index === forced.line) {
      kinds[index] = forced.kind;
      if (forced.kind === "character") inDialogue = true;
      else if (forced.kind !== "parenthetical" && forced.kind !== "dialogue") {
        inDialogue = false;
      }
      continue;
    }

    // A line of two or more spaces inside a speech keeps it going
    // (Fountain's way to put a blank line in dialogue).
    if (inDialogue && text === "" && /^ {2,}$/u.test(lines[index] ?? "")) {
      kinds[index] = "dialogue";
      continue;
    }

    if (text === "") {
      // The empty line being typed on: right under a cue it is the dialogue
      // line; after a speech and a blank line it is where the next cue goes.
      // Placing the cursor there keeps the suggestion list in that column.
      if (index === cursorLine) {
        const previous = kinds[index - 1];
        const beforeBlank = kinds[index - 2];
        if (previous === "character") kinds[index] = "dialogue";
        else if (
          isBlank(lines[index - 1]) &&
          (beforeBlank === "dialogue" || beforeBlank === "parenthetical")
        ) {
          kinds[index] = "character";
        }
      }
      inDialogue = false;
      continue;
    }

    const startsBlock = index === firstContentLine || isBlank(lines[index - 1]);

    // A "# heading" always ends a speech and stays at the left margin, even
    // with no blank line before it.
    if (inDialogue && isMarkdownHeading(text)) inDialogue = false;

    if (inDialogue) {
      kinds[index] =
        text.startsWith("(") && text.endsWith(")")
          ? "parenthetical"
          : text.startsWith("(") && !text.includes(")")
            ? "parenthetical"
            : "dialogue";
      continue;
    }

    if (/^={3,}$/u.test(text)) {
      kinds[index] = "page-break";
      continue;
    }
    // Markdown headings, Fountain sections and tag lines keep their look.
    if (text.startsWith("#") || isMarkdownHeading(text)) continue;
    if (/^=(?!=)/u.test(text) || /^\[\[.*\]\]$/u.test(text)) {
      kinds[index] = "note";
      continue;
    }
    if (/^>\s*\[!/u.test(text)) continue;
    if (/^>.*<$/u.test(text)) {
      kinds[index] = "centered";
      continue;
    }
    if (text.startsWith("~")) {
      kinds[index] = "lyric";
      continue;
    }
    if (text.startsWith("!")) {
      kinds[index] = "action";
      continue;
    }
    if (isSceneHeading(text)) {
      kinds[index] = "scene-heading";
      continue;
    }
    if (isForcedTransition(text) || (startsBlock && isTransitionText(text))) {
      kinds[index] = "transition";
      continue;
    }
    if (
      startsBlock &&
      looksLikeCharacterCue(text) &&
      // A cue just picked, with the cursor on it or on the empty line below,
      // counts as a cue before its dialogue is typed.
      (!isBlank(lines[index + 1]) ||
        // Two letters at least, so the auto-capital starting an action
        // line ("S") does not jump to the middle.
        (index === cursorLine && text.replace(/^@/u, "").length > 1) ||
        index + 1 === cursorLine)
    ) {
      kinds[index] = "character";
      inDialogue = true;
      continue;
    }
    kinds[index] = "action";
  }
  return kinds;
}

/**
 * The "> " and " <" around centred text ("> THE END <") as [from, to]
 * offsets in the line, or null when the line is not centred text.
 */
export function centeredMarkers(
  text: string,
): [[number, number], [number, number]] | null {
  const match = /^(\s*>\s*)\S.*?(\s*<\s*)$/u.exec(text);
  if (!match) return null;
  const open = match[1] ?? "";
  const close = match[2] ?? "";
  return [
    [0, open.length],
    [text.length - close.length, text.length],
  ];
}

/** Offset of the "." that forces a scene heading, or -1. */
export function forcedHeadingDot(text: string): number {
  const match = /^\s*\.(?=[\p{L}\p{N}])/u.exec(text);
  return match ? match[0].length - 1 : -1;
}

/**
 * The element a suggestion list is for, from its first suggestion: the
 * character list centres an empty line like a cue, scene parts keep it at
 * the left margin, and so on.
 */
export function menuLineKind(
  detail: string | undefined,
): LayoutLineKind | null {
  if (!detail) return null;
  if (/dialogue blocks?$/u.test(detail)) return "character";
  if (["Scene type", "Location", "Time", "Slug modifier"].includes(detail)) {
    return "scene-heading";
  }
  if (detail === "Transition") return "transition";
  if (detail === "Parenthetical") return "parenthetical";
  return null;
}
