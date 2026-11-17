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

/*
 * The one set of rules for what kind of screenplay line a line is. The editor
 * layout, the parser (suggestions, statistics, checks, export), Smart Tab and
 * the character cue checks all use these, so they agree.
 */

/** What kind of screenplay line a line is. */
export type LineKind =
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

const SCENE_HEADING = /^(?:INT|EXT|EST|INT\.\/EXT|INT\/EXT|I\/E)(?:\.|\s)/iu;
const HAS_LETTER = /\p{L}/u;
const UPPERCASE_LETTER = /\p{Lu}/u;
const LOWERCASE_LETTER = /\p{Ll}/u;
/** Transitions written without ">" that end in something other than "TO:". */
const FADE_TRANSITION = /^FADE (?:IN:|OUT\.|TO BLACK\.)$/u;
/** Lines that are something else, never a character cue. */
const NOT_A_CUE = /^(?:!|>|#|=|~|\[\[|\/\*|%%)/u;
const CUE_EXTENSIONS = /(?:\s+\([^)]*\))+\s*$/u;
const DUAL_DIALOGUE_CARET = /\s*\^\s*$/u;

function isBlank(line: string | undefined): boolean {
  return line === undefined || line.trim() === "";
}

/**
 * Index of the line that closes the front matter at the top ("---" ...
 * "---"), or -1 when there is none or it is never closed.
 */
export function frontmatterEnd(lines: readonly string[]): number {
  if (lines[0]?.replace(/^\uFEFF/u, "").trim() !== "---") return -1;
  return lines.findIndex((line, index) => index > 0 && line.trim() === "---");
}

/** "INT. KITCHEN - DAY", or forced with a dot: ".FLASHBACK". */
export function isSceneHeading(line: string): boolean {
  const text = line.trim();
  if (text.startsWith("!")) return false;
  return /^\.[\p{L}\p{N}]/u.test(text) || SCENE_HEADING.test(text);
}

/**
 * Forced transition line: "> CUT TO:". Not centered text ("> THE END <")
 * and not an Obsidian callout ("> [!note]").
 */
export function isForcedTransition(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith(">") &&
    !trimmed.endsWith("<") &&
    !/^>\s*\[!/u.test(trimmed)
  );
}

/** A transition: forced with ">", or all caps and ending in "TO:". */
export function isTransitionText(text: string): boolean {
  const trimmed = text.trim();
  if (isForcedTransition(trimmed)) return true;
  return (
    trimmed.endsWith("TO:") &&
    UPPERCASE_LETTER.test(trimmed) &&
    !LOWERCASE_LETTER.test(trimmed)
  );
}

/** Markdown heading or Fountain section: "# Act One", "## Sequence". */
export function isMarkdownHeading(text: string): boolean {
  return /^#{1,6}\s+\S/u.test(text.trim());
}

/** Centered text: "> THE END <". */
export function isCenteredText(text: string): boolean {
  return /^>.*<$/u.test(text.trim());
}

/** "> THE END <" -> "THE END". */
export function centeredContent(text: string): string {
  return text.trim().replace(/^>\s*/u, "").replace(/\s*<$/u, "");
}

export interface CharacterCue {
  /** The name without "@", extensions or "^": "JANE". */
  name: string;
  /** Everything in brackets after the name: "(V.O.) (CONT'D)". */
  extension: string | null;
}

/**
 * The character cue on a line, or null when the line can't be one. A cue is
 * a name in capitals, or any name forced with "@". Extensions may be in any
 * case ("JANE (v.o.)"). Sluglines, transitions and other marked lines are
 * never cues. Whether a cue line really is a cue also depends on the lines
 * around it; see `classifyLines`.
 */
export function characterCue(line: string): CharacterCue | null {
  const text = line.trim();
  const forced = text.startsWith("@");
  const candidate = (forced ? text.slice(1) : text)
    .replace(DUAL_DIALOGUE_CARET, "")
    .trim();
  if (!candidate || !HAS_LETTER.test(candidate)) return null;
  if (!forced) {
    if (NOT_A_CUE.test(candidate)) return null;
    if (isSceneHeading(candidate) || isTransitionText(candidate)) return null;
    if (FADE_TRANSITION.test(candidate)) return null;
  }
  const extensionMatch = CUE_EXTENSIONS.exec(candidate);
  const extension = extensionMatch?.[0].trim() ?? null;
  const name = extensionMatch
    ? candidate.slice(0, extensionMatch.index).trim()
    : candidate;
  if (!name) return null;
  if (
    !forced &&
    (!UPPERCASE_LETTER.test(name) || LOWERCASE_LETTER.test(name))
  ) {
    return null;
  }
  return { name, extension };
}

/** Character cue text: all caps (or forced with @), not a heading or transition. */
export function looksLikeCharacterCue(text: string): boolean {
  return characterCue(text) !== null;
}

/** A speech line in brackets, closed or still being typed: "(beat)", "(whis". */
function isParentheticalText(text: string): boolean {
  return text.startsWith("(") && (text.endsWith(")") || !text.includes(")"));
}

export interface ClassifyOptions {
  /**
   * The line the cursor is on (0-based), or -1. A cue being typed shows as a
   * cue before its dialogue exists, and the empty line being typed on takes
   * the column it is about to get.
   */
  cursorLine?: number;
  /** A line the writer set to an element (Shift+Tab, "Set line to …"). */
  forced?: { line: number; kind: LineKind } | null;
  /** Skip front matter at the top. Off when it has already been removed. */
  frontmatter?: boolean;
}

/**
 * The kind of every line of a Fountain document. `null` means the line is not
 * part of the script: blank lines, front matter, Markdown headings and
 * sections, tag lines and callouts.
 */
export function classifyLines(
  lines: readonly string[],
  options: ClassifyOptions = {},
): (LineKind | null)[] {
  const cursorLine = options.cursorLine ?? -1;
  const forced = options.forced ?? null;
  const kinds: (LineKind | null)[] = new Array<LineKind | null>(
    lines.length,
  ).fill(null);
  const firstContentLine =
    options.frontmatter === false ? 0 : frontmatterEnd(lines) + 1;
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
      // The empty line being typed on: right under a cue or a wryly it is
      // the dialogue line; after a speech and a blank line it is where the
      // next cue goes.
      if (index === cursorLine) {
        const previous = kinds[index - 1];
        const beforeBlank = kinds[index - 2];
        if (previous === "character" || previous === "parenthetical") {
          kinds[index] = "dialogue";
        } else if (
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

    // A "# heading" always ends a speech, even with no blank line before it.
    if (inDialogue && isMarkdownHeading(text)) inDialogue = false;

    if (inDialogue) {
      kinds[index] = isParentheticalText(text) ? "parenthetical" : "dialogue";
      continue;
    }

    if (/^={3,}$/u.test(text)) {
      kinds[index] = "page-break";
      continue;
    }
    // Markdown headings, Fountain sections and tag lines aren't script.
    if (text.startsWith("#") || isMarkdownHeading(text)) continue;
    // Synopses ("= ...") and notes ("[[...]]").
    if (/^=(?!=)/u.test(text) || /^\[\[.*\]\]$/u.test(text)) {
      kinds[index] = "note";
      continue;
    }
    if (/^>\s*\[!/u.test(text)) continue;
    if (isCenteredText(text)) {
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
      characterCue(text) !== null &&
      // A cue needs a line under it. A cue just picked, with the cursor on
      // it or on the empty line below, counts before its dialogue is typed.
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
