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

import type {
  PageSize,
  ScreenplayDocument,
  ScreenplayElement,
  ScreenplayElementType,
} from "../screenplay/model";
import { wrapMeasuredText } from "./measuredWrapping";
import { markEmphasis, visibleText } from "./emphasis";

export interface ScreenplayPageDimensions {
  width: number;
  height: number;
}

export interface ScreenplayLayoutBlock {
  type: ScreenplayElementType;
  /** Title page text: the title, or the details (credit, author, ...). */
  role?: "title" | "title-details";
  lines: string[];
  left: number;
  top: number;
  width: number;
  align: "left" | "right" | "center";
}

export interface ScreenplayLayoutPage {
  blocks: ScreenplayLayoutBlock[];
  titlePage?: boolean;
}

export interface ScreenplayLayout {
  dimensions: ScreenplayPageDimensions;
  fontSize: number;
  lineHeight: number;
  pages: ScreenplayLayoutPage[];
}

interface ElementStyle {
  left: number;
  right: number;
  maximumCharacters: number;
  gapBefore: number;
  align: "left" | "right" | "center";
}

const PAGE_DIMENSIONS: Record<PageSize, ScreenplayPageDimensions> = {
  "us-letter": { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};

const FONT_SIZE = 12;
const LINE_HEIGHT = 12;
export const CJK_LINE_HEIGHT = 14.4;

/** Whether the text has Chinese, Japanese or Korean characters. */
export function hasCjkText(text: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff00-\uffef]/u.test(
    text,
  );
}
const TOP_MARGIN = 72;
const BOTTOM_MARGIN = 72;
/** A scene number at the end of a heading: "INT. HOUSE - DAY #1A#". */
const SCENE_NUMBER = /\s*#([\p{L}\p{N}.-]+)#\s*$/u;

/** Width of one Courier character at 12 points. */
const CHARACTER_WIDTH = 7.2;
/** Left edge of action and sluglines: 1.5 inches, as in Final Draft and Fade In. */
const TEXT_LEFT = 108;
/** Right edge of action, sluglines and transitions: 60 characters on. */
const TEXT_RIGHT = TEXT_LEFT + 60 * CHARACTER_WIDTH;

function styleFor(
  type: ScreenplayElementType,
  pageWidth: number,
): ElementStyle {
  // Column positions match Final Draft and Fade In: dialogue at 2.5",
  // wrylies at 2.9", character names at 3.5", from the page's left edge.
  const column = (
    left: number,
    maximumCharacters: number,
    gapBefore: number,
    align: ElementStyle["align"] = "left",
  ): ElementStyle => ({
    left,
    right: pageWidth - left - maximumCharacters * CHARACTER_WIDTH,
    maximumCharacters,
    gapBefore,
    align,
  });
  switch (type) {
    case "scene-heading":
      return column(TEXT_LEFT, 60, 24);
    case "character":
      return column(252, 32, 12);
    case "parenthetical":
      return column(208.8, 25, 0);
    case "dialogue":
      return column(180, 35, 0);
    case "transition":
      return column(TEXT_RIGHT - 32 * CHARACTER_WIDTH, 32, 12, "right");
    case "action":
    case "lyric":
      return column(TEXT_LEFT, 60, 12);
    case "centered":
      return column(TEXT_LEFT, 60, 12, "center");
  }
}

export function screenplayElementText(element: ScreenplayElement): string {
  if (element.type === "character" && element.characterExtension) {
    return `${element.text} ${element.characterExtension}`;
  }
  if (element.type === "scene-heading" && element.text.startsWith(".")) {
    return element.text.slice(1);
  }
  if (element.type === "transition" && element.text.startsWith(">")) {
    return element.text.slice(1);
  }
  if (element.type === "action" && element.text.startsWith("!")) {
    return element.text.slice(1);
  }
  return element.text;
}

export function wrapScreenplayText(
  value: string,
  maximumCharacters: number,
): string[] {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (visibleText(word).length > maximumCharacters) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let offset = 0; offset < word.length; offset += maximumCharacters) {
        const chunk = word.slice(offset, offset + maximumCharacters);
        if (chunk.length === maximumCharacters) lines.push(chunk);
        else current = chunk;
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (visibleText(candidate).length <= maximumCharacters) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Height that must fit below an element on the same page: a scene heading
 * keeps its blank line and the first line after it (a cue and one line of
 * dialogue, for a speech), so it's never left alone at the bottom.
 */
function minimumFollowingHeight(
  elements: readonly ScreenplayElement[],
  index: number,
  lineHeight: number,
  pageWidth: number,
): number {
  const current = elements[index];
  const next = elements[index + 1];
  if (!current || !next) return 0;
  if (current.type === "scene-heading") {
    const lines =
      next.type === "character" &&
      ["dialogue", "parenthetical"].includes(elements[index + 2]?.type ?? "")
        ? 2
        : 1;
    return styleFor(next.type, pageWidth).gapBefore + lines * lineHeight;
  }
  if (
    current.type === "character" &&
    (next.type === "parenthetical" || next.type === "dialogue")
  ) {
    return lineHeight;
  }
  // A page never starts with a transition: keep room for it here.
  if (next.type === "transition" && current.type !== "transition") {
    return styleFor("transition", pageWidth).gapBefore + lineHeight;
  }
  return 0;
}

export interface LayoutOptions {
  /**
   * Print (CONT'D) after a cue when the same character speaks again after
   * action in the scene, or when a speech goes on to the next page. Only
   * the printed page gets it: the Fountain text never changes.
   */
  continued?: boolean;
}

/** A cue that already says (CONT'D). */
const CONTINUED = /\(CONT['’]D\)/iu;

export function layoutScreenplay(
  document: ScreenplayDocument,
  pageSize: PageSize,
  measure?: (text: string, type: ScreenplayElementType) => number,
  lineHeight = LINE_HEIGHT,
  options: LayoutOptions = {},
): ScreenplayLayout {
  const dimensions = PAGE_DIMENSIONS[pageSize];
  // The speaker of the last speech in this scene, for (CONT'D).
  let lastSpeaker: string | null = null;
  const withContinued = (cue: string): string =>
    CONTINUED.test(cue) ? cue : `${cue} (CONT'D)`;
  const pages: ScreenplayLayoutPage[] = [{ blocks: [] }];
  let page = pages[0];
  let cursor = TOP_MARGIN;

  const addPage = (): void => {
    page = { blocks: [] };
    pages.push(page);
    cursor = TOP_MARGIN;
  };

  const wrap = (text: string, type: ScreenplayElementType): string[] => {
    const style = styleFor(type, dimensions.width);
    if (measure)
      return wrapMeasuredText(
        text,
        dimensions.width - style.left - style.right,
        (line) => measure(visibleText(line), type),
      );
    const lines = wrapScreenplayText(text, style.maximumCharacters);
    // A wryly's wrapped lines start one space in, under the text after
    // its "(", as in Final Draft and Fade In.
    if (type !== "parenthetical" || lines.length < 2) return lines;
    const [first = "", ...rest] = lines;
    return [
      first,
      ...wrapScreenplayText(rest.join(" "), style.maximumCharacters - 1).map(
        (line) => ` ${line}`,
      ),
    ];
  };
  const append = (
    type: ScreenplayElementType,
    lines: string[],
    gap = 0,
  ): void => {
    const style = styleFor(type, dimensions.width);
    page.blocks.push({
      type,
      lines,
      left: style.left,
      top: cursor + gap,
      width: dimensions.width - style.left - style.right,
      align: style.align,
    });
    cursor += gap + lines.length * lineHeight;
  };

  const partLines = (part: ScreenplayElement): string[] =>
    wrap(markEmphasis(screenplayElementText(part)), part.type);
  const appendParts = (parts: readonly ScreenplayElement[]): void => {
    for (const part of parts) append(part.type, partLines(part));
  };
  /**
   * Where to split a speech that doesn't fit: the latest sentence end
   * (inside a line of dialogue, or between parts) that leaves at most
   * `maximumLines` before it, at least two lines of dialogue on each side,
   * and no wryly cut off from the dialogue after it. Null when none does.
   */
  const sentenceSplit = (
    speech: readonly ScreenplayElement[],
    maximumLines: number,
  ): {
    before: ScreenplayElement[];
    after: ScreenplayElement[];
  } | null => {
    const dialogueLines = (parts: readonly ScreenplayElement[]): number =>
      parts
        .filter((part) => part.type === "dialogue")
        .reduce((sum, part) => sum + partLines(part).length, 0);
    const allLines = (parts: readonly ScreenplayElement[]): number =>
      parts.reduce((sum, part) => sum + partLines(part).length, 0);
    const candidates: {
      before: ScreenplayElement[];
      after: ScreenplayElement[];
    }[] = [];
    for (const [k, part] of speech.entries()) {
      if (part.type !== "dialogue") continue;
      const ends = [...part.text.matchAll(/[.!?…—]["')\]]*\s+(?=\S)/gu)];
      for (const match of ends) {
        const cut = (match.index ?? 0) + match[0].length;
        candidates.push({
          before: [
            ...speech.slice(0, k),
            { ...part, text: part.text.slice(0, cut).trimEnd() },
          ],
          after: [
            { ...part, text: part.text.slice(cut) },
            ...speech.slice(k + 1),
          ],
        });
      }
      if (k < speech.length - 1)
        candidates.push({
          before: speech.slice(0, k + 1),
          after: speech.slice(k + 1),
        });
    }
    for (const candidate of candidates.reverse()) {
      if (candidate.before[candidate.before.length - 1]?.type !== "dialogue")
        continue;
      if (allLines(candidate.before) > maximumLines) continue;
      if (dialogueLines(candidate.before) < 2) continue;
      if (dialogueLines(candidate.after) < 2) continue;
      return candidate;
    }
    return null;
  };

  // A speech that fits on a page moves to the next page whole rather than
  // splitting, so a scene heading right before one keeps room for all of
  // it (and its blank line). Zero when no such speech follows.
  const speechAfter = (index: number): number => {
    const cue = document.elements[index + 1];
    if (cue?.type !== "character") return 0;
    let total = wrap(
      markEmphasis(screenplayElementText(cue)),
      "character",
    ).length;
    let end = index + 2;
    while (
      ["dialogue", "parenthetical"].includes(document.elements[end]?.type ?? "")
    ) {
      const part = document.elements[end];
      if (part)
        total += wrap(
          markEmphasis(screenplayElementText(part)),
          part.type,
        ).length;
      end++;
    }
    if (end === index + 2) return 0;
    const capacity = Math.floor(
      (dimensions.height - BOTTOM_MARGIN - TOP_MARGIN) / lineHeight,
    );
    return total <= capacity
      ? styleFor("character", dimensions.width).gapBefore + total * lineHeight
      : 0;
  };

  // Two speeches side by side, in Fade In's columns: each half of the text
  // column holds its dialogue, with the cue 58 points in and wrylies 29.
  // The pair stays together on one page.
  const layoutDual = (
    left: readonly ScreenplayElement[],
    right: readonly ScreenplayElement[],
  ): void => {
    const columnWidth = (TEXT_RIGHT - TEXT_LEFT) / 2;
    const maximumCharacters = 28;
    const wrapColumn = (text: string, characters: number): string[] =>
      measure
        ? wrapMeasuredText(text, characters * CHARACTER_WIDTH, (line) =>
            measure(visibleText(line), "dialogue"),
          )
        : wrapScreenplayText(text, characters);
    const column = (elements: readonly ScreenplayElement[], x: number) => {
      const blocks: Omit<ScreenplayLayoutBlock, "top">[] = [];
      let height = 0;
      for (const part of elements) {
        const text = markEmphasis(screenplayElementText(part));
        const offset =
          part.type === "character"
            ? 58
            : part.type === "parenthetical"
              ? 29
              : 0;
        const characters =
          maximumCharacters - Math.round(offset / CHARACTER_WIDTH);
        const lines = wrapColumn(text, characters);
        blocks.push({
          type: part.type,
          lines,
          left: x + offset,
          width: characters * CHARACTER_WIDTH,
          align: "left",
        });
        height += lines.length * lineHeight;
      }
      return { blocks, height };
    };
    const sides = [
      column(left, TEXT_LEFT),
      column(right, TEXT_LEFT + columnWidth + 10.6),
    ];
    const height = Math.max(...sides.map((side) => side.height));
    let gap = page.blocks.length ? 12 : 0;
    if (
      page.blocks.length > 0 &&
      cursor + gap + height > dimensions.height - BOTTOM_MARGIN
    ) {
      addPage();
      gap = 0;
    }
    const top = cursor + gap;
    for (const side of sides) {
      let y = top;
      for (const block of side.blocks) {
        page.blocks.push({ ...block, top: y });
        y += block.lines.length * lineHeight;
      }
    }
    cursor = top + height;
  };

  if (document.titlePage) {
    const metadata = document.titlePage;
    page.titlePage = true;
    const titleLines = (value: string, type: ScreenplayElementType): string[] =>
      markEmphasis(value)
        .split("\n")
        .flatMap((line) =>
          measure
            ? wrapMeasuredText(line, TEXT_RIGHT - TEXT_LEFT, (text) =>
                measure(visibleText(text), type),
              )
            : wrapScreenplayText(
                line,
                Math.floor((TEXT_RIGHT - TEXT_LEFT) / CHARACTER_WIDTH),
              ),
        );
    // Placement follows Fade In: the title about 3.1" down, two blank
    // lines after it, one between the credit and the author, all centered
    // on the text column.
    const central = [
      { value: metadata.title, role: "title" as const, after: 24 },
      { value: metadata.credit, role: "title-details" as const, after: 12 },
      { value: metadata.author, role: "title-details" as const, after: 24 },
      { value: metadata.source, role: "title-details" as const, after: 24 },
    ].filter((item): item is typeof item & { value: string } =>
      Boolean(item.value),
    );
    cursor = dimensions.height * 0.2845;
    for (const { value, role, after } of central) {
      const type = role === "title" ? "scene-heading" : "action";
      const lines = titleLines(value, type);
      page.blocks.push({
        type,
        role,
        lines,
        left: TEXT_LEFT,
        top: cursor,
        width: TEXT_RIGHT - TEXT_LEFT,
        align: "center",
      });
      cursor += lines.length * lineHeight + after;
    }
    const lower = [metadata.draftDate, metadata.contact].filter(
      (value): value is string => Boolean(value),
    );
    const lowerLines = lower.map((value) => titleLines(value, "action"));
    const lowerHeight = lowerLines.reduce(
      (sum, lines) => sum + lines.length * lineHeight + 12,
      0,
    );
    const lowerTop = dimensions.height - 108 - lowerHeight;
    if (cursor > lowerTop - 24)
      throw new ScreenplayLayoutError(
        "Title-page metadata is too long for one page. Shorten the title, credits or contact details.",
      );
    cursor = lowerTop;
    for (const lines of lowerLines) {
      page.blocks.push({
        type: "action",
        role: "title-details",
        lines,
        left: TEXT_LEFT,
        top: cursor,
        width: TEXT_RIGHT - TEXT_LEFT,
        align: "left",
      });
      cursor += lines.length * lineHeight + 12;
    }
    addPage();
  }

  for (let index = 0; index < document.elements.length; index += 1) {
    const element = document.elements[index];
    if (!element) continue;
    if (element.type === "scene-heading") lastSpeaker = null;
    // "===" in Fountain: start a new page.
    if (element.pageBreakBefore && page.blocks.length > 0 && !page.titlePage)
      addPage();
    if (
      element.type === "character" &&
      document.elements[index + 1]?.type &&
      ["dialogue", "parenthetical"].includes(
        document.elements[index + 1]?.type ?? "",
      )
    ) {
      let end = index + 1;
      while (
        ["dialogue", "parenthetical"].includes(
          document.elements[end]?.type ?? "",
        )
      )
        end++;
      const speech = document.elements.slice(index + 1, end);
      // Dual dialogue: the next speech's cue ends in "^", so the two print
      // side by side, as in Fade In.
      const partner = document.elements[end];
      if (
        partner?.type === "character" &&
        partner.dual === true &&
        ["dialogue", "parenthetical"].includes(
          document.elements[end + 1]?.type ?? "",
        )
      ) {
        let partnerEnd = end + 1;
        while (
          ["dialogue", "parenthetical"].includes(
            document.elements[partnerEnd]?.type ?? "",
          )
        )
          partnerEnd++;
        layoutDual(
          [element, ...speech],
          document.elements.slice(end, partnerEnd),
        );
        lastSpeaker = null;
        index = partnerEnd - 1;
        continue;
      }
      if (speech.some((part) => part.type === "dialogue")) {
        // The same cue, extension included, as Fade In compares it: "NURSE
        // (O.C.)" then "NURSE" is not a continuation.
        const speaker = screenplayElementText(element)
          .toLocaleUpperCase()
          .replace(/\s+/gu, " ");
        const written = markEmphasis(screenplayElementText(element));
        const cue =
          options.continued && lastSpeaker === speaker
            ? withContinued(written)
            : written;
        lastSpeaker = speaker;
        const firstCue = wrap(cue, "character");
        // A speech split across pages repeats its cue on the next page, with
        // (CONT'D) when that setting is on.
        const continued = options.continued
          ? wrap(withContinued(written), "character")
          : firstCue;
        // Each parenthetical is atomic and tied to the first following dialogue line.
        const units: { type: ScreenplayElementType; lines: string[] }[][] = [];
        let pending: { type: ScreenplayElementType; lines: string[] }[] = [];
        for (const part of speech) {
          const lines = wrap(
            markEmphasis(screenplayElementText(part)),
            part.type,
          );
          if (part.type === "parenthetical")
            pending.push({ type: part.type, lines });
          else
            for (const line of lines) {
              units.push([...pending, { type: part.type, lines: [line] }]);
              pending = [];
            }
        }
        // A trailing parenthetical belongs to the final dialogue unit.
        if (pending.length && units.length)
          units[units.length - 1]?.push(...pending);
        const size = (unit: typeof pending) =>
          unit.reduce((sum, part) => sum + part.lines.length, 0);
        const total =
          firstCue.length + units.reduce((sum, unit) => sum + size(unit), 0);
        const capacity = Math.floor(
          (dimensions.height - BOTTOM_MARGIN - TOP_MARGIN) / lineHeight,
        );
        let gap = page.blocks.length ? 12 : 0;
        if (
          total <= capacity &&
          cursor +
            gap +
            // A transition right after keeps its blank line and line here.
            (total + (document.elements[end]?.type === "transition" ? 2 : 0)) *
              lineHeight >
            dimensions.height - BOTTOM_MARGIN
        ) {
          // As in Fade In: split the speech at the end of a sentence, with
          // (MORE) below and the cue again on the next page, when at least
          // two lines of dialogue go on each page. Otherwise it moves whole.
          const available = Math.floor(
            (dimensions.height - BOTTOM_MARGIN - cursor - gap) / lineHeight,
          );
          const split = page.blocks.length
            ? sentenceSplit(speech, available - firstCue.length - 1)
            : null;
          if (split) {
            append("character", firstCue, gap);
            appendParts(split.before);
            append("character", ["(MORE)"]);
            addPage();
            append("character", continued);
            appendParts(split.after);
            index = end - 1;
            continue;
          }
          addPage();
          gap = 0;
        }
        let offset = 0;
        let cueLines = firstCue;
        while (offset < units.length) {
          const available = Math.floor(
            (dimensions.height - BOTTOM_MARGIN - cursor - gap) / lineHeight,
          );
          let used = cueLines.length;
          let stop = offset;
          while (stop < units.length) {
            const count = size(units[stop] ?? []);
            const more = stop + 1 < units.length ? 1 : 0;
            if (used + count + more > available) break;
            used += count;
            stop++;
          }
          if (stop === offset) {
            if (!page.blocks.length)
              throw new ScreenplayLayoutError(
                "A character cue or wryly is too long to fit with dialogue on one page. Shorten it before exporting.",
              );
            addPage();
            gap = 0;
            continue;
          }
          append("character", cueLines, gap);
          for (const unit of units.slice(offset, stop))
            for (const part of unit) {
              const last = page.blocks[page.blocks.length - 1];
              if (
                last?.type === part.type &&
                last.top + last.lines.length * lineHeight === cursor
              ) {
                last.lines.push(...part.lines);
                cursor += part.lines.length * lineHeight;
              } else append(part.type, [...part.lines]);
            }
          offset = stop;
          if (offset < units.length) {
            append("character", ["(MORE)"]);
            addPage();
            gap = 0;
            cueLines = continued;
          }
        }
        index = end - 1;
        continue;
      }
    }
    const style = styleFor(element.type, dimensions.width);
    // Action lines with no blank line between them are one paragraph with
    // line breaks, as in Fountain and Fade In; emphasis can span them.
    const group = [element];
    if (element.type === "action") {
      for (
        let next = document.elements[index + group.length];
        next?.type === "action" &&
        next.line === (group[group.length - 1]?.line ?? 0) + 1;
        next = document.elements[index + group.length]
      )
        group.push(next);
      index += group.length - 1;
    }
    // A scene number ("INT. HOUSE - DAY #1A#") prints in both margins, not
    // in the heading.
    let sceneNumber: string | null = null;
    const texts = group.map((part) => {
      const text = screenplayElementText(part);
      if (part.type !== "scene-heading") return text;
      const match = SCENE_NUMBER.exec(text);
      if (!match) return text;
      sceneNumber = match[1] ?? null;
      return text.slice(0, match.index);
    });
    const segments = markEmphasis(texts.join("\n")).split("\n");
    let lines = segments.flatMap((text) => {
      // Action keeps the spaces it starts with ("    Scott --"), on every
      // wrapped line, as Fountain says. Tabs aren't indentation here.
      const indent =
        element.type === "action"
          ? (/^[ \t]*/u.exec(text)?.[0] ?? "").replace(/\t/gu, "").length
          : 0;
      const pad = " ".repeat(Math.min(indent, style.maximumCharacters - 10));
      return (
        measure
          ? wrapMeasuredText(
              text.trimStart(),
              dimensions.width - style.left - style.right - pad.length * 7.2,
              (line) => measure(visibleText(line), element.type),
            )
          : wrapScreenplayText(text, style.maximumCharacters - pad.length)
      ).map((line) => pad + line);
    });
    let gap = page.blocks.length === 0 ? 0 : style.gapBefore;
    const minimumHeight =
      lines.length * lineHeight +
      Math.max(
        minimumFollowingHeight(
          document.elements,
          index,
          lineHeight,
          dimensions.width,
        ),
        element.type === "scene-heading" ? speechAfter(index) : 0,
      );

    if (
      page.blocks.length > 0 &&
      cursor + gap + minimumHeight > dimensions.height - BOTTOM_MARGIN
    ) {
      addPage();
      gap = 0;
    }

    while (lines.length > 0) {
      const top = cursor + gap;
      let availableLines = Math.max(
        1,
        Math.floor((dimensions.height - BOTTOM_MARGIN - top) / lineHeight),
      );
      // An action paragraph split across pages keeps at least two lines on
      // each page (widow and orphan control), or moves to the next page.
      if (
        element.type === "action" &&
        lines.length > availableLines &&
        page.blocks.length > 0
      ) {
        availableLines = Math.min(availableLines, lines.length - 2);
        if (availableLines < 2) {
          addPage();
          gap = 0;
          continue;
        }
      }
      const pageLines = lines.slice(0, availableLines);
      page.blocks.push({
        type: element.type,
        lines: pageLines,
        left: style.left,
        top,
        width: dimensions.width - style.left - style.right,
        align: style.align,
      });
      if (sceneNumber !== null) {
        const number: string = sceneNumber;
        const width = number.length * CHARACTER_WIDTH;
        for (const left of [
          TEXT_LEFT - 2 * CHARACTER_WIDTH - width,
          TEXT_RIGHT + 2 * CHARACTER_WIDTH,
        ])
          page.blocks.push({
            type: "scene-heading",
            lines: [number],
            left,
            top,
            width,
            align: "left",
          });
        sceneNumber = null;
      }
      cursor = top + pageLines.length * lineHeight;
      lines = lines.slice(availableLines);
      gap = 0;
      if (lines.length > 0) addPage();
    }
  }

  return {
    dimensions,
    fontSize: FONT_SIZE,
    lineHeight,
    pages,
  };
}

/**
 * The number printed on a laid-out page: none on the title page or the
 * first page of the script, then 2, 3 and so on.
 */
export function scriptPageNumber(
  layoutPage: { titlePage?: boolean },
  pageIndex: number,
  document: Pick<ScreenplayDocument, "titlePage">,
): number | null {
  if (layoutPage.titlePage) return null;
  const number = pageIndex + 1 - (document.titlePage ? 1 : 0);
  return number > 1 ? number : null;
}

export class ScreenplayLayoutError extends Error {
  constructor(message: string) {
    super(`Preview stopped: ${message} Your source is unchanged.`);
    this.name = "ScreenplayLayoutError";
  }
}
