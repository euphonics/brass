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

import type { ScreenplayLayoutBlock } from "./screenplayLayout";

/** The parts of a printed page that can be set in bold. */
export type PdfBoldPart =
  | "scene-heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "centered"
  | "lyric"
  | "title"
  | "title-details"
  | "page-number";

export type PdfBoldOptions = Record<PdfBoldPart, boolean>;

/** Only sluglines are bold unless the writer turns more on. */
export const DEFAULT_PDF_BOLD: PdfBoldOptions = {
  "scene-heading": true,
  action: false,
  character: false,
  parenthetical: false,
  dialogue: false,
  transition: false,
  centered: false,
  lyric: false,
  title: false,
  "title-details": false,
  "page-number": false,
};

/** Setting names and descriptions, in the order the settings tab lists them. */
export const PDF_BOLD_SETTINGS: {
  part: PdfBoldPart;
  name: string;
  desc: string;
}[] = [
  {
    part: "scene-heading",
    name: "Bold sluglines",
    desc: "INT. KITCHEN - NIGHT",
  },
  { part: "action", name: "Bold action", desc: "Description lines." },
  {
    part: "character",
    name: "Bold character names",
    desc: "The name above each speech, with its extension (V.O.).",
  },
  { part: "dialogue", name: "Bold dialogue", desc: "What characters say." },
  {
    part: "parenthetical",
    name: "Bold wrylies",
    desc: "(quietly) and other directions inside a speech, and (MORE).",
  },
  { part: "transition", name: "Bold transitions", desc: "CUT TO: and others." },
  {
    part: "centered",
    name: "Bold centered text",
    desc: "> THE END < and other centered lines.",
  },
  { part: "lyric", name: "Bold lyrics", desc: "Lines starting with ~." },
  {
    part: "title",
    name: "Bold title",
    desc: "The title on the title page.",
  },
  {
    part: "title-details",
    name: "Bold title page details",
    desc: "Credit, author, source, draft date and contact on the title page.",
  },
  {
    part: "page-number",
    name: "Bold page numbers",
    desc: "The number at the top right of each page.",
  },
];

/** Saved settings with any missing or invalid value set to its default. */
export function normalizePdfBold(value: unknown): PdfBoldOptions {
  const stored =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const options = { ...DEFAULT_PDF_BOLD };
  for (const part of Object.keys(DEFAULT_PDF_BOLD) as PdfBoldPart[]) {
    if (typeof stored[part] === "boolean") options[part] = stored[part];
  }
  return options;
}

/** Which bold setting a laid-out block follows. */
export function boldPartOf(block: ScreenplayLayoutBlock): PdfBoldPart {
  return block.role ?? block.type;
}
