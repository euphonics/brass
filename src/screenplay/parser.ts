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

import { stripThreads } from "./threads";
import {
  centeredContent,
  characterCue,
  classifyLines,
  frontmatterEnd,
  stripLineComment,
} from "./lines";
import type { ScreenplayDocument, ScreenplayElement } from "./model";
import { extractFountainTitlePage } from "./titlePage";

/** The lines after the front matter. Line numbers count from there. */
function bodyLines(source: string): string[] {
  const lines = source
    .replace(/^\uFEFF/u, "")
    .replaceAll("\r\n", "\n")
    .split("\n");
  const end = frontmatterEnd(lines);
  return end === -1 ? lines : lines.slice(end + 1);
}

/**
 * Read a Fountain document into screenplay elements. Each line's kind comes
 * from `classifyLines`, the same rules the editor layout uses.
 */
export function parseFountain(source: string): ScreenplayDocument {
  const { lines, titlePage } = extractFountainTitlePage(bodyLines(source));
  const kinds = classifyLines(lines, { frontmatter: false });
  const elements: ScreenplayElement[] = [];
  let blankLines = 0;

  for (let index = 0; index < lines.length; index += 1) {
    // Line comments ("// note") aren't part of the script.
    // Threads ("[&name]") aren't either.
    const raw = stripThreads(stripLineComment(lines[index] ?? ""));
    const text = raw.trim();
    const kind = kinds[index] ?? null;
    const line = index + 1;

    if (kind === null) {
      if (text === "") blankLines += 1;
      continue;
    }
    // Notes, comments, synopses and page breaks aren't printed or counted. A
    // line of spaces inside a speech only keeps the speech going.
    if (kind === "note" || kind === "page-break" || text === "") continue;

    switch (kind) {
      case "character": {
        const cue = characterCue(text);
        elements.push({
          type: "character",
          text: cue?.name ?? text,
          line,
          ...(cue?.extension ? { characterExtension: cue.extension } : {}),
        });
        break;
      }
      case "centered":
        elements.push({ type: "centered", text: centeredContent(text), line });
        break;
      case "action":
        elements.push({ type: "action", text: raw, line });
        break;
      case "lyric":
        elements.push({ type: "lyric", text: text.slice(1).trim(), line });
        break;
      default:
        elements.push({ type: kind, text, line });
    }
  }

  return { elements, blankLines, ...(titlePage ? { titlePage } : {}) };
}

/**
 * `document` with no indent on action lines ("    Scott --" -> "Scott --"),
 * for when "Indent action with spaces" is off.
 */
export function withoutActionIndent(
  document: ScreenplayDocument,
): ScreenplayDocument {
  return {
    ...document,
    elements: document.elements.map((element) =>
      element.type === "action"
        ? { ...element, text: element.text.trimStart() }
        : element,
    ),
  };
}
