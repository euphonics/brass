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

import {
  classifyLines,
  frontmatterEnd,
  isForcedTransition,
  isMarkdownHeading,
  isSceneHeading,
  isTransitionText,
  looksLikeCharacterCue,
} from "../screenplay/lines";
import {
  splitSlugModifier,
  DEFAULT_TIMES_OF_DAY,
} from "../screenplay/fountain";
import {
  DEFAULT_ENTER_TARGETS,
  DEFAULT_TAB_TARGETS,
  startsNewBlock,
  type EnterSource,
  type EnterTarget,
  type EnterTargets,
} from "./enterTargets";
import type { ForcedElement } from "./forceElement";

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
  | "under-speech"
  | "none"
  | "under-block"
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
  /** Set the new line to this element afterwards (Enter settings). */
  forceAfter?: ForcedElement;
}

function isBlank(line: string | undefined): boolean {
  return (line ?? "").trim() === "";
}

/**
 * The capital to use when `typed` is the first character on its line
 * (`before` is the line up to it), or null to leave it as typed.
 */
export function capitalizeLineStart(
  before: string,
  typed: string,
): string | null {
  if (before.trim() !== "" || [...typed].length !== 1) return null;
  const upper = typed.toLocaleUpperCase();
  return upper !== typed && upper.length === typed.length ? upper : null;
}

/** Known times, or a function that computes them only when needed. */
export type KnownTimes = readonly string[] | (() => readonly string[]);

/**
 * Whether line `index` sits inside a speech: under a character cue that
 * starts a block, with only dialogue and wrylies between them.
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
  const kinds = classifyLines(lines.slice(0, index + 1), { cursorLine: index });
  if (kinds[cueIndex] !== "character") return false;
  for (let line = cueIndex + 1; line < index; line += 1) {
    const kind = kinds[line];
    if (kind !== "dialogue" && kind !== "parenthetical" && kind !== "note") {
      return false;
    }
  }
  return true;
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
  if (!text) {
    if (startsBlock) return "new-block";
    // Right under a cue or speech: a wryly goes here. Right under anything
    // else (action, a slugline): start a new block.
    const above = (lines[index - 1] ?? "").trim();
    const aboveStartsBlock =
      index - 1 === firstContentLine || isBlank(lines[index - 2]);
    if (
      isInDialogueBlock(lines, index - 1) ||
      (aboveStartsBlock && looksLikeCharacterCue(above))
    ) {
      return "under-speech";
    }
    if (/^(?:\/\*|\*\/|\[\[|#|=|>\s*\[!|[-*+]\s|\d+[.)]\s)/u.test(above)) {
      return null;
    }
    return "under-block";
  }
  if (isMarkdownHeading(text)) return "heading";
  // Centred text ("> THE END <", a title): like a heading, a slugline next.
  if (/^>.*<$/u.test(text)) return "heading";
  // Markdown list items and tasks keep Obsidian's own Tab (indent).
  if (/^(?:[-*+]|\d+[.)])\s/u.test(text)) return null;
  // Leave notes, boneyard, tags, synopses and callouts alone.
  if (/^(?:\/\*|\*\/|\[\[|#|=|>\s*\[!)/u.test(text)) return null;
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
  // ".LATER": a forced heading that is only a time.
  const forced = /^\.([^.\s].*)$/u.exec(heading.trim());
  if (
    forced &&
    knownTimes.some(
      (time) =>
        time.toLocaleUpperCase() ===
        (forced[1] ?? "")
          .replace(/\s+#[^#]*#$/u, "")
          .trim()
          .toLocaleUpperCase(),
    )
  ) {
    return true;
  }
  const parts = heading.trim().split(/\s+-\s+/u);
  if (parts.length < 2) return false;
  const last = (parts[parts.length - 1] ?? "").replace(/\s+#[^#]*#$/u, "");
  const normalized = last.trim().toLocaleUpperCase();
  return knownTimes.some((time) => time.toLocaleUpperCase() === normalized);
}

/**
 * Sluglines are all caps: when Tab or Enter moves on from a scene heading,
 * the part already typed ("INT. car") is uppercased along with the insert.
 */
export function uppercaseHeading(
  source: string,
  plan: SmartTabPlan,
): SmartTabPlan {
  const lineStart = source.lastIndexOf("\n", Math.max(0, plan.at - 1)) + 1;
  const typed = source.slice(lineStart, plan.at);
  const upper = typed.toLocaleUpperCase();
  if (upper === typed || upper.length !== typed.length) return plan;
  return {
    ...plan,
    replaceFrom: lineStart,
    insert: upper + plan.insert,
    cursor: lineStart + upper.length + (plan.cursor - plan.at),
  };
}

/** A plan that changes nothing (Tab swallowed). */
function noop(at: number): SmartTabPlan {
  return { kind: "none", at, insert: "", cursor: at, openCompletion: false };
}

/**
 * Smart Tab. At the end of an element, Tab starts what `targets` says
 * (Settings > Tab and Enter keys); the defaults are the next likely
 * element. A slugline is completed first (" - ", the time of day, a
 * modifier), and the setting applies after that.
 */
export function getSmartTabPlan(
  source: string,
  cursorOffset: number,
  knownTimes: KnownTimes = DEFAULT_TIMES_OF_DAY,
  targets: EnterTargets = DEFAULT_TAB_TARGETS,
): SmartTabPlan | null {
  const plan = defaultTabPlan(source, cursorOffset, knownTimes);
  if (plan === null || !endsElement(plan)) return plan;
  const from = enterSourceOf(plan.kind);
  if (from === null) return plan;
  const target = targets[from];
  if (target === DEFAULT_TAB_TARGETS[from]) return plan;
  if (target === "plain") {
    return {
      kind: plan.kind,
      at: plan.at,
      insert: "\n",
      cursor: plan.at + 1,
      openCompletion: false,
    };
  }
  const lineStart = source.lastIndexOf("\n", Math.max(0, plan.at - 1)) + 1;
  return customEnterPlan(source, plan, lineStart, target);
}

/**
 * Whether a default Tab plan is the step that leaves the element (as
 * opposed to splitting a speech, completing a slugline or doing nothing).
 */
function endsElement(plan: SmartTabPlan): boolean {
  switch (plan.kind) {
    case "action":
    case "transition":
    case "character":
      return true;
    case "dialogue":
      return plan.insert === "\n()";
    case "parenthetical":
      return plan.insert !== "";
    case "scene-heading":
      return plan.insert === "\n\n" && !plan.openCompletion;
    default:
      return false;
  }
}

function defaultTabPlan(
  source: string,
  cursorOffset: number,
  knownTimes: KnownTimes,
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
    // An empty "()": Tab drops it and goes back to the line above.
    if (line.trim() === "()") {
      const from = lineStart > 0 ? lineStart - 1 : lineStart;
      const to = lineStart > 0 ? lineEnd : Math.min(source.length, lineEnd + 1);
      return {
        kind,
        at: to,
        replaceFrom: from,
        insert: "",
        cursor: from,
        openCompletion: false,
      };
    }
    const closed = line.trimEnd().endsWith(")");
    const insideClose = closed && cursorOffset === textEnd - 1;
    // Mid-wryly: Tab does nothing (no tab character in the script).
    if (cursorOffset < textEnd && !insideClose) {
      return noop(cursorOffset);
    }
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

  // Mid-speech: split the dialogue around a new "()" line, cursor inside,
  // so a wryly can go in the middle of a long speech.
  if (kind === "dialogue" && cursorOffset < textEnd) {
    let from = cursorOffset;
    while (from > lineStart && /[ \t]/u.test(source.charAt(from - 1))) {
      from -= 1;
    }
    let to = cursorOffset;
    while (to < textEnd && /[ \t]/u.test(source.charAt(to))) to += 1;
    const atLineStart = source.slice(lineStart, from).trim() === "";
    const insert = atLineStart ? "()\n" : "\n()\n";
    // The spaces at the split stay at the end of the line above (unseen),
    // so deleting the empty "()" joins the speech back exactly: "to the"
    // and a split mid-word ("th|e") both come back as they were.
    const replaceFrom = atLineStart ? lineStart : to;
    return {
      kind,
      at: to,
      replaceFrom,
      insert,
      cursor: replaceFrom + insert.indexOf(")"),
      openCompletion: true,
    };
  }

  // Otherwise only act with the cursor at the end of the line's text.
  // Mid-line: Tab does nothing, rather than put a tab character into the
  // script and break the layout.
  if (cursorOffset < textEnd) return noop(cursorOffset);
  const at = cursorOffset;
  switch (kind) {
    case "new-block":
      // Nothing to insert: open the character list (scene types after a
      // # heading).
      return { kind, at, insert: "", cursor: at, openCompletion: true };
    case "under-speech":
      // "()" with the cursor inside, for a wryly.
      return { kind, at, insert: "()", cursor: at + 1, openCompletion: true };
    case "under-block":
      // The blank line a new block needs, then the character list.
      return { kind, at, insert: "\n", cursor: at + 1, openCompletion: true };
    case "none":
      return null;
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
      const times =
        typeof knownTimes === "function" ? knownTimes() : knownTimes;
      // After the time of day, or a slug modifier "(FLASHBACK)": start the
      // action, as in Fade In. (Typing " (" after the time opens the
      // modifier list.)
      const { base, modifier } = splitSlugModifier(line);
      if (
        hasTimeOfDay(line, times) ||
        (modifier !== null && hasTimeOfDay(base, times))
      ) {
        return uppercaseHeading(source, {
          kind,
          at,
          insert: "\n\n",
          cursor: at + 2,
          openCompletion: false,
        });
      }
      // Only a scene type so far ("INT.", "INT. "): a space and the
      // location list, not " - " before any location.
      const trimmed = line.trimEnd();
      if (/^\s*(?:INT|EXT|EST|INT\.?\/EXT|I\/E)\.$/iu.test(trimmed)) {
        const space = line.endsWith(" ") ? "" : " ";
        return uppercaseHeading(source, {
          kind,
          at,
          insert: space,
          cursor: at + space.length,
          openCompletion: true,
        });
      }
      // Complete the " - " separator, whatever part of it is already typed.
      const insert = trimmed.endsWith(" -")
        ? line.endsWith(" ")
          ? ""
          : " "
        : line.endsWith(" ")
          ? "- "
          : " - ";
      return uppercaseHeading(source, {
        kind,
        at,
        insert,
        cursor: at + insert.length,
        openCompletion: true,
      });
    }
    case "action":
      return { kind, at, insert: "\n\n", cursor: at + 2, openCompletion: true };
  }
}

/** Which Enter setting applies to a line of this kind, if any. */
function enterSourceOf(kind: SmartTabLineKind): EnterSource | null {
  switch (kind) {
    case "action":
    case "dialogue":
    case "transition":
    case "character":
    case "parenthetical":
      return kind;
    case "scene-heading":
      return "sceneHeading";
    default:
      return null;
  }
}

/**
 * Whether the block ends after the line that ends at `at`: the next line is
 * blank, missing, or a heading, scene heading or transition (not more of
 * the same speech or paragraph).
 */
function blockEndsAfter(source: string, at: number): boolean {
  const lineEnd = source.indexOf("\n", at);
  if (lineEnd === -1) return true;
  const nextEnd = source.indexOf("\n", lineEnd + 1);
  const next = source
    .slice(lineEnd + 1, nextEnd === -1 ? source.length : nextEnd)
    .trim();
  return (
    next === "" ||
    isMarkdownHeading(next) ||
    isSceneHeading(next) ||
    isForcedTransition(next)
  );
}

/**
 * Smart Enter. What Enter starts at the end of each element comes from
 * `targets` (Settings > Tab and Enter keys). The defaults: after a transition, a new
 * slugline; after dialogue, a blank line and the character list for the
 * next speaker; after a scene heading or an action paragraph, a blank line
 * for the action; after a character or a wryly, Obsidian's own Enter (a
 * dialogue line). Anything else keeps the normal Enter.
 */
export function getSmartEnterPlan(
  source: string,
  cursorOffset: number,
  knownTimes: KnownTimes = DEFAULT_TIMES_OF_DAY,
  targets: EnterTargets = DEFAULT_ENTER_TARGETS,
): SmartTabPlan | null {
  const plan = defaultTabPlan(source, cursorOffset, knownTimes);
  // Lyrics ("~...") run line after line: plain Enter.
  const lineStartForEnter =
    source.lastIndexOf("\n", Math.max(0, cursorOffset - 1)) + 1;
  if (
    source.slice(lineStartForEnter, cursorOffset).trimStart().startsWith("~")
  ) {
    return null;
  }
  // The mid-speech wryly split is Tab only; Enter there is a plain break.
  const lineEnd = source.indexOf("\n", cursorOffset);
  const rest = source.slice(
    cursorOffset,
    lineEnd === -1 ? source.length : lineEnd,
  );
  if (plan?.kind === "dialogue" && rest.trim() !== "") return null;
  // After a "# heading" (or centred text): a blank line and the slugline
  // list, like Tab.
  if (plan?.kind === "heading") return plan;
  const from = plan === null ? null : enterSourceOf(plan.kind);
  if (plan === null || from === null) return null;
  const target = targets[from];
  // Markdown list items and tasks keep Obsidian's own Enter (list continuation).
  if (plan.kind === "action") {
    const lineStart = source.lastIndexOf("\n", plan.at - 1) + 1;
    if (/^\s*(?:[-*+]|\d+[.)])\s/u.test(source.slice(lineStart, plan.at))) {
      return null;
    }
  }
  // An empty "()" keeps the normal Enter.
  if (
    plan.kind === "parenthetical" &&
    source
      .slice(lineStartForEnter, lineEnd === -1 ? source.length : lineEnd)
      .trim() === "()"
  ) {
    return null;
  }
  // Mid-speech or mid-paragraph (more text on the next line), Enter stays a
  // plain line break so the block isn't split. The same for a new block
  // started from a cue or a wryly with the speech still below.
  const needsBlockEnd =
    plan.kind === "dialogue" ||
    plan.kind === "action" ||
    ((plan.kind === "character" || plan.kind === "parenthetical") &&
      startsNewBlock(target));
  if (needsBlockEnd && !blockEndsAfter(source, plan.at)) return null;

  // "New line": a plain line break, like Shift+Enter (no blockquote or
  // list continuation from Obsidian's Enter).
  if (target === "plain") {
    return {
      kind: plan.kind,
      at: cursorOffset,
      insert: "\n",
      cursor: cursorOffset + 1,
      openCompletion: false,
    };
  }

  if (target !== DEFAULT_ENTER_TARGETS[from]) {
    return customEnterPlan(source, plan, lineStartForEnter, target);
  }

  // The default for each element.
  if (plan.kind === "transition") return plan;
  if (plan.kind === "character" || plan.kind === "parenthetical") return null;
  const enterPlan: SmartTabPlan = {
    kind: plan.kind,
    at: plan.at,
    insert: "\n\n",
    cursor: plan.at + 2,
    openCompletion: plan.kind === "dialogue",
  };
  if (plan.kind === "scene-heading") {
    return headingEnterPlan(source, enterPlan, lineStartForEnter, "\n\n");
  }
  return enterPlan;
}

/**
 * Enter at the end of a scene heading: the heading is uppercased, and one
 * left at "INT. CAR - " drops the dangling " - ".
 */
function headingEnterPlan(
  source: string,
  plan: SmartTabPlan,
  lineStart: number,
  gap: string,
): SmartTabPlan {
  const typed = source.slice(lineStart, plan.at);
  const trimmed = typed.replace(/\s*-\s*$/u, "");
  if (trimmed !== typed) {
    const insert = `${trimmed.toLocaleUpperCase()}${gap}`;
    return {
      ...plan,
      replaceFrom: lineStart,
      insert,
      cursor: lineStart + insert.length,
    };
  }
  return uppercaseHeading(source, plan);
}

/**
 * Enter set to start another element than the default: a blank line first
 * for a new block (scene heading, action, character, transition), a single
 * line break inside a speech (wryly, dialogue). The new line is then set to
 * the element (`forceAfter`), which opens its suggestion list.
 */
function customEnterPlan(
  source: string,
  plan: SmartTabPlan,
  lineStart: number,
  target: Exclude<EnterTarget, "plain">,
): SmartTabPlan {
  const gap = startsNewBlock(target) ? "\n\n" : "\n";
  const forceAfter = target === "dialogue" ? undefined : target;
  const base: SmartTabPlan = {
    kind: plan.kind,
    at: plan.at,
    insert: gap,
    cursor: plan.at + gap.length,
    openCompletion: false,
    forceAfter,
  };
  switch (plan.kind) {
    case "scene-heading":
      return headingEnterPlan(source, base, lineStart, gap);
    case "transition": {
      const text = `${source.slice(lineStart, plan.at).trimEnd().toLocaleUpperCase()}${gap}`;
      return {
        ...base,
        replaceFrom: lineStart,
        insert: text,
        cursor: lineStart + text.length,
      };
    }
    case "parenthetical": {
      // Close an unclosed "(whispering" first.
      const typed = source.slice(lineStart, plan.at).trimEnd();
      const insert = `${typed.endsWith(")") ? "" : ")"}${gap}`;
      return { ...base, insert, cursor: plan.at + insert.length };
    }
    default:
      return base;
  }
}

/** Character name from a cue line: "@jen (V.O.) ^" -> "JEN". */
function cueName(text: string): string {
  return text
    .trim()
    .replace(/^@/u, "")
    .replace(/\s*\^\s*$/u, "")
    .replace(/(?:\s+\([^)]*\))+\s*$/u, "")
    .trim()
    .toLocaleUpperCase();
}

/**
 * Speakers in the current scene before `offset`, most recent first and
 * without repeats: for "BLAKE ... JEN ..." it returns ["JEN", "BLAKE"].
 * Stops at the scene heading.
 */
export function recentSceneSpeakers(source: string, offset: number): string[] {
  const lines = source.slice(0, offset).split("\n");
  const firstContentLine = frontmatterEnd(lines) + 1;
  const speakers: string[] = [];
  for (let index = lines.length - 2; index >= firstContentLine; index -= 1) {
    const text = lines[index] ?? "";
    if (isSceneHeading(text.trim())) break;
    const startsBlock = index === firstContentLine || isBlank(lines[index - 1]);
    if (
      startsBlock &&
      !isBlank(text) &&
      !isBlank(lines[index + 1]) &&
      looksLikeCharacterCue(text)
    ) {
      const name = cueName(text);
      if (name && !speakers.includes(name)) speakers.push(name);
    }
  }
  return speakers;
}
