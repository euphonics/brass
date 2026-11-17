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
  centeredContent,
  characterCue,
  classifyLines,
  frontmatterEnd,
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
    const raw = lines[index] ?? "";
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
      case "lyric":
        elements.push({ type: "action", text: raw, line });
        break;
      default:
        elements.push({ type: kind, text, line });
    }
  }

  return { elements, blankLines, ...(titlePage ? { titlePage } : {}) };
}
