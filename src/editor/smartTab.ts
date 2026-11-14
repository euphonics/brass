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

import { DEFAULT_TIMES_OF_DAY } from "../screenplay/fountain";
import { isSceneHeading } from "../screenplay/parser";

/*
 * Smart Tab: Tab at the end of a character, dialogue, scene heading or action
 * line inserts the plain Fountain text for the next likely element. The
 * Fountain parser cannot classify the line being typed (a cue only becomes a
 * cue once dialogue follows it), so these helpers classify by the lines above
 * the cursor instead.
 */

export type SmartTabLineKind =
  | "new-block"
  | "heading"
  | "transition"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "scene-heading"
  | "action";

export interface SmartTabPlan {
  kind: SmartTabLineKind;
  /** Offset where `insert` goes (the cursor). */
  at: number;
  /** When set, `insert` replaces the text from here to `at`. */
  replaceFrom?: number;
  insert: string;
  /** Cursor offset after the insertion. */
  cursor: number;
  /** Open the suggestion menu after inserting. */
  openCompletion: boolean;
}

const LOWERCASE_LETTER = /\p{Ll}/u;
const UPPERCASE_LETTER = /\p{Lu}/u;

function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0]?.replace(/^\uFEFF/u, "").trim() !== "---") return -1;
  return lines.findIndex((line, index) => index > 0 && line.trim() === "---");
}

function isBlank(line: string | undefined): boolean {
  return (line ?? "").trim() === "";
}

/** Forced transition line: "> CUT TO:" (not centered "> THE END <"). */
export function isForcedTransition(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith(">") && !trimmed.endsWith("<");
}

export function isTransitionText(text: string): boolean {
  if (isForcedTransition(text)) return true;
  return (
    text.endsWith("TO:") &&
    UPPERCASE_LETTER.test(text) &&
    !LOWERCASE_LETTER.test(text)
  );
}

/** Character cue text: all caps (or forced with @), not a heading or transition. */
export function looksLikeCharacterCue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isSceneHeading(trimmed) || isTransitionText(trimmed)) {
    return false;
  }
  if (trimmed.startsWith("@")) return trimmed.length > 1;
  const name = trimmed
    .replace(/\s*\^\s*$/u, "")
    .replace(/(?:\s+\([^)]*\))+\s*$/u, "");
  return UPPERCASE_LETTER.test(name) && !LOWERCASE_LETTER.test(name);
}

/**
 * Whether line `index` sits inside a dialogue block: a run of non-blank lines
 * whose first line is a character cue that starts after a blank line.
 */
export function isInDialogueBlock(
  lines: readonly string[],
  index: number,
): boolean {
  const firstContentLine = frontmatterEnd(lines) + 1;
  let start = index - 1;
  while (start >= firstContentLine && !isBlank(lines[start])) start -= 1;
  const cueIndex = start + 1;
  if (cueIndex >= index) return false;
  const cueStartsBlock = cueIndex === firstContentLine || isBlank(lines[start]);
  return cueStartsBlock && looksLikeCharacterCue(lines[cueIndex] ?? "");
}

/** Markdown heading or Fountain section: "# Act One", "## Sequence". */
export function isMarkdownHeading(text: string): boolean {
  return /^#{1,6}\s+\S/u.test(text.trim());
}

export function classifySmartTabLine(
  lines: readonly string[],
  index: number,
): SmartTabLineKind | null {
  if (index <= frontmatterEnd(lines)) return null;
  const text = (lines[index] ?? "").trim();
  const firstContentLine = frontmatterEnd(lines) + 1;
  const startsBlock = index === firstContentLine || isBlank(lines[index - 1]);
  // Empty line after a blank line: where a new cue or slugline goes.
  if (!text) return startsBlock ? "new-block" : null;
  if (isMarkdownHeading(text)) return "heading";
  // Leave notes, boneyard, tags and synopses alone.
  if (/^(?:\/\*|\*\/|\[\[|#|=)/u.test(text)) return null;
  if (isSceneHeading(text)) return "scene-heading";
  if (isTransitionText(text)) return "transition";
  if (isInDialogueBlock(lines, index)) {
    return text.startsWith("(") ? "parenthetical" : "dialogue";
  }
  if (startsBlock && looksLikeCharacterCue(text)) return "character";
  return "action";
}

/** A heading is complete when its last " - " part is a known time of day. */
function hasTimeOfDay(heading: string, knownTimes: readonly string[]): boolean {
  const parts = heading.trim().split(/\s+-\s+/u);
  if (parts.length < 2) return false;
  const last = (parts[parts.length - 1] ?? "").replace(/\s+#[^#]*#$/u, "");
  const normalized = last.trim().toLocaleUpperCase();
  return knownTimes.some((time) => time.toLocaleUpperCase() === normalized);
}

export function getSmartTabPlan(
  source: string,
  cursorOffset: number,
  knownTimes: readonly string[] = DEFAULT_TIMES_OF_DAY,
): SmartTabPlan | null {
  const lineStart = source.lastIndexOf("\n", Math.max(0, cursorOffset - 1)) + 1;
  const nextBreak = source.indexOf("\n", cursorOffset);
  const lineEnd = nextBreak === -1 ? source.length : nextBreak;
  const line = source.slice(lineStart, lineEnd);
  const textEnd = lineStart + line.trimEnd().length;
  const lines = source.split("\n");
  const index = source.slice(0, lineStart).split("\n").length - 1;
  const kind = classifySmartTabLine(lines, index);
  if (kind === null) return null;

  if (kind === "parenthetical") {
    // "(scoffs)": Tab goes to a new dialogue line. Also works with the
    // cursor just inside the closing ")", and closes an unclosed "(scoffs".
    const closed = line.trimEnd().endsWith(")");
    const insideClose = closed && cursorOffset === textEnd - 1;
    if (cursorOffset < textEnd && !insideClose) return null;
    const insert = closed ? "\n" : ")\n";
    return {
      kind,
      at: textEnd,
      replaceFrom: textEnd,
      insert,
      cursor: textEnd + insert.length,
      openCompletion: false,
    };
  }

  // Otherwise only act with the cursor at the end of the line's text.
  if (cursorOffset < textEnd) return null;
  const at = cursorOffset;
  switch (kind) {
    case "new-block":
      // Nothing to insert: open the character list (scene types after a
      // # heading).
      return { kind, at, insert: "", cursor: at, openCompletion: true };
    case "transition": {
      // Uppercase the transition, then a blank line and the scene types.
      const text = `${line.trimEnd().toLocaleUpperCase()}\n\n`;
      return {
        kind,
        at,
        replaceFrom: lineStart,
        insert: text,
        cursor: lineStart + text.length,
        openCompletion: true,
      };
    }
    case "heading":
      // Blank line and the scene type list for a new slugline.
      return { kind, at, insert: "\n\n", cursor: at + 2, openCompletion: true };
    case "character":
    case "dialogue":
      // New line with "()" and the cursor between the parentheses.
      return { kind, at, insert: "\n()", cursor: at + 2, openCompletion: true };
    case "scene-heading": {
      if (hasTimeOfDay(line, knownTimes)) {
        return {
          kind,
          at,
          insert: "\n\n",
          cursor: at + 2,
          openCompletion: false,
        };
      }
      // Complete the " - " separator, whatever part of it is already typed.
      const trimmed = line.trimEnd();
      const insert = trimmed.endsWith(" -")
        ? line.endsWith(" ")
          ? ""
          : " "
        : line.endsWith(" ")
          ? "- "
          : " - ";
      return {
        kind,
        at,
        insert,
        cursor: at + insert.length,
        openCompletion: true,
      };
    }
    case "action":
      return { kind, at, insert: "\n\n", cursor: at + 2, openCompletion: true };
  }
}
