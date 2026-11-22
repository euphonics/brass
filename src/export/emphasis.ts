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
 * Fountain emphasis for the page layout: *italic*, **bold**, ***bold
 * italic*** and _underline_. A mark counts only when it has a partner in
 * the same element; a lone "*" (5 * 3) or "_" prints as written, and so
 * does an escaped "\*" or "\_". Paired marks are swapped for invisible
 * toggle characters before wrapping, so line lengths count only the text,
 * and a style can carry on across wrapped lines.
 */

/** Toggle characters (Unicode private use), never in real screenplay text. */
export const ITALIC_TOGGLE = "";
export const BOLD_TOGGLE = "";
export const UNDERLINE_TOGGLE = "";
const TOGGLES = /[-]/gu;

/** The text without toggle characters: what's printed. */
export function visibleText(text: string): string {
  return text.replace(TOGGLES, "");
}

interface Mark {
  index: number;
  length: number;
  kind: "*" | "**" | "***" | "_";
}

/** Swap paired emphasis marks for toggles and drop escape backslashes. */
export function markEmphasis(text: string): string {
  const marks: Mark[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "\\" && /[*_]/u.test(text[index + 1] ?? "")) {
      index += 1;
      continue;
    }
    if (character === "_") {
      marks.push({ index, length: 1, kind: "_" });
    } else if (character === "*") {
      let length = 1;
      while (length < 3 && text[index + length] === "*") length += 1;
      marks.push({ index, length, kind: "*".repeat(length) as Mark["kind"] });
      index += length - 1;
    }
  }
  // Pair each mark with the next one of the same kind; leftovers are text.
  const paired = new Set<Mark>();
  const open = new Map<Mark["kind"], Mark>();
  for (const mark of marks) {
    const opener = open.get(mark.kind);
    if (opener) {
      paired.add(opener);
      paired.add(mark);
      open.delete(mark.kind);
    } else open.set(mark.kind, mark);
  }
  const toggleFor = (kind: Mark["kind"]): string =>
    kind === "_"
      ? UNDERLINE_TOGGLE
      : kind === "*"
        ? ITALIC_TOGGLE
        : kind === "**"
          ? BOLD_TOGGLE
          : BOLD_TOGGLE + ITALIC_TOGGLE;
  let result = "";
  let markIndex = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? "";
    if (character === "\\" && /[*_]/u.test(text[index + 1] ?? "")) {
      result += text[index + 1];
      index += 1;
      continue;
    }
    const mark = marks[markIndex];
    if (mark && mark.index === index) {
      markIndex += 1;
      result += paired.has(mark)
        ? toggleFor(mark.kind)
        : text.slice(index, index + mark.length);
      index += mark.length - 1;
      continue;
    }
    result += character;
  }
  return result;
}

export interface EmphasisStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface EmphasisRun extends EmphasisStyle {
  text: string;
}

/**
 * Split laid-out lines into styled runs. The style carries from one line
 * to the next, so emphasis that wraps keeps going.
 */
export function emphasisRuns(lines: readonly string[]): EmphasisRun[][] {
  const style: EmphasisStyle = { bold: false, italic: false, underline: false };
  return lines.map((line) => {
    const runs: EmphasisRun[] = [];
    let text = "";
    const flush = (): void => {
      if (text) runs.push({ text, ...style });
      text = "";
    };
    for (const character of line) {
      if (character === ITALIC_TOGGLE) {
        flush();
        style.italic = !style.italic;
      } else if (character === BOLD_TOGGLE) {
        flush();
        style.bold = !style.bold;
      } else if (character === UNDERLINE_TOGGLE) {
        flush();
        style.underline = !style.underline;
      } else text += character;
    }
    flush();
    return runs;
  });
}
