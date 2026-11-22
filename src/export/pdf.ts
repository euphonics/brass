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

import { PDFDocument, rgb } from "pdf-lib";
import type { PageSize, ScreenplayDocument } from "../screenplay/model";
import { layoutScreenplay, scriptPageNumber } from "./screenplayLayout";
import { embedScreenplayFonts } from "./pdfFonts";
import { boldPartOf, normalizePdfBold } from "./pdfStyle";
import type { PdfBoldOptions } from "./pdfStyle";

export interface PdfExportOptions {
  pageSize: PageSize;
  title: string;
  /** Which parts print in bold; missing parts use the defaults. */
  bold?: Partial<PdfBoldOptions>;
}

export class UnsupportedPdfTextError extends Error {
  constructor(
    readonly characters: readonly string[],
    readonly truncated: boolean,
  ) {
    const examples = characters
      .map((character) => {
        const code = character
          .codePointAt(0)
          ?.toString(16)
          .toUpperCase()
          .padStart(4, "0");
        return `${JSON.stringify(character)} (U+${code})`;
      })
      .join(", ");
    super(
      `PDF export stopped: the current font cannot represent ${examples}${truncated ? ", and other characters" : ""}. No PDF was saved; your source is unchanged. Export to Fountain instead. Screenplay preview remains available.`,
    );
    this.name = "UnsupportedPdfTextError";
  }
}

/** Plain text for PDF metadata: the first line, without emphasis marks. */
function metadataText(value: string | undefined): string | undefined {
  const line = value?.split("\n")[0]?.replace(/[*_]/gu, "").trim();
  return line ? line : undefined;
}

export async function serializePdf(
  document: ScreenplayDocument,
  options: PdfExportOptions,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  // The title page's title and author, as Fade In stores them; the note's
  // name when there's no title page.
  pdf.setTitle(metadataText(document.titlePage?.title) ?? options.title);
  const author = metadataText(document.titlePage?.author);
  if (author) pdf.setAuthor(author);
  pdf.setCreator("Scribidian");
  pdf.setProducer("Scribidian");
  const { regular, bold } = await embedScreenplayFonts(pdf);
  const regularCharacters = new Set(regular.getCharacterSet());
  const boldCharacters = new Set(bold.getCharacterSet());
  const layout = layoutScreenplay(document, options.pageSize);
  const boldParts = normalizePdfBold(options.bold);

  // Validate precisely the text and fonts used below, before drawing or saving.
  const unsupported = new Set<string>();
  let truncated = false;
  for (const layoutPage of layout.pages) {
    for (const block of layoutPage.blocks) {
      const characters = boldParts[boldPartOf(block)]
        ? boldCharacters
        : regularCharacters;
      for (const line of block.lines) {
        for (const character of line) {
          if (!characters.has(character.codePointAt(0) ?? -1)) {
            if (unsupported.has(character)) continue;
            if (unsupported.size < 8) unsupported.add(character);
            else truncated = true;
          }
        }
      }
    }
  }
  if (unsupported.size > 0) {
    throw new UnsupportedPdfTextError([...unsupported], truncated);
  }

  for (const [pageIndex, layoutPage] of layout.pages.entries()) {
    const page = pdf.addPage([
      layout.dimensions.width,
      layout.dimensions.height,
    ]);
    for (const block of layoutPage.blocks) {
      const font = boldParts[boldPartOf(block)] ? bold : regular;
      for (const [lineIndex, rawLine] of block.lines.entries()) {
        const text = rawLine;
        const textWidth = font.widthOfTextAtSize(text, layout.fontSize);
        const x =
          block.align === "center"
            ? block.left + Math.max(0, (block.width - textWidth) / 2)
            : block.align === "right"
              ? block.left + Math.max(0, block.width - textWidth)
              : block.left;
        const y =
          layout.dimensions.height -
          block.top -
          layout.fontSize -
          lineIndex * layout.lineHeight;
        page.drawText(text, {
          x,
          y,
          size: layout.fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Page numbers as in Final Draft and Fade In: "2." at the top right,
    // and none on the first page of the script.
    const pageNumber = scriptPageNumber(layoutPage, pageIndex, document);
    if (pageNumber === null) continue;
    const label = `${pageNumber}.`;
    const numberFont = boldParts["page-number"] ? bold : regular;
    const numberWidth = numberFont.widthOfTextAtSize(label, layout.fontSize);
    page.drawText(label, {
      x: layout.dimensions.width - 72 - numberWidth,
      y: layout.dimensions.height - 37.2,
      size: layout.fontSize,
      font: numberFont,
      color: rgb(0, 0, 0),
    });
  }

  return pdf.save();
}

export function pdfExportPath(
  sourcePath: string,
  existingPaths: Pick<ReadonlySet<string>, "has">,
  preferredBasename?: string,
): string {
  const slash = sourcePath.lastIndexOf("/");
  const directory = slash === -1 ? "" : sourcePath.slice(0, slash + 1);
  const filename = slash === -1 ? sourcePath : sourcePath.slice(slash + 1);
  const dot = filename.lastIndexOf(".");
  const basename = dot === -1 ? filename : filename.slice(0, dot);
  const extension = dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
  const safePreferredBasename = preferredBasename
    ?.replace(/[\\/:*?"<>|]/gu, "-")
    .trim();
  const exportBase =
    safePreferredBasename ||
    (extension === "pdf" ? `${basename}-export` : basename);

  let candidate = `${directory}${exportBase}.pdf`;
  let suffix = 2;
  while (existingPaths.has(candidate)) {
    candidate = `${directory}${exportBase}-${suffix}.pdf`;
    suffix += 1;
  }
  return candidate;
}
