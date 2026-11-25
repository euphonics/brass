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

import { Modal } from "obsidian";
import type { App } from "obsidian";
import type { PageSize, ScreenplayDocument } from "../screenplay/model";
import {
  CJK_LINE_HEIGHT,
  hasCjkText,
  layoutScreenplay,
  screenplayElementText,
  ScreenplayLayoutError,
  scriptPageNumber,
} from "../export/screenplayLayout";
import { boldPartOf, normalizePdfBold } from "../export/pdfStyle";
import { emphasisRuns } from "../export/emphasis";
import type { PdfBoldOptions } from "../export/pdfStyle";

export class ScreenplayPreviewModal extends Modal {
  constructor(
    app: App,
    private readonly screenplay: ScreenplayDocument,
    private readonly pageSize: PageSize,
    private readonly screenplayTitle: string,
    private readonly exportPdf: () => Promise<void>,
    private readonly bold: PdfBoldOptions,
    private readonly continued: boolean,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(`${this.screenplayTitle} - screenplay preview`);
    this.modalEl.addClass("brass-preview-modal");
    this.contentEl.addClass("brass-preview");

    const toolbar = this.contentEl.createDiv({
      cls: "brass-preview-toolbar",
    });
    const cjk =
      Object.values(this.screenplay.titlePage ?? {}).some(hasCjkText) ||
      this.screenplay.elements.some((element) =>
        hasCjkText(screenplayElementText(element)),
      );
    toolbar.createEl("p", {
      text: cjk
        ? "Read-only preview. CJK line breaks and page count are approximate."
        : "Read-only preview. Your Fountain source remains unchanged.",
    });
    const exportButton = toolbar.createEl("button", {
      text: "Export clean PDF",
    });
    exportButton.addEventListener("click", () => void this.exportPdf());

    let layout;
    try {
      layout = layoutScreenplay(
        this.screenplay,
        this.pageSize,
        cjk
          ? (text) =>
              Array.from(text).reduce(
                (width, character) =>
                  width + (hasCjkText(character) ? 12 : 7.2),
                0,
              )
          : undefined,
        cjk ? CJK_LINE_HEIGHT : undefined,
        { continued: this.continued },
      );
    } catch (error) {
      if (!(error instanceof ScreenplayLayoutError)) throw error;
      this.contentEl.createEl("p", { text: error.message });
      return;
    }
    const boldParts = normalizePdfBold(this.bold);
    const pages = this.contentEl.createDiv({
      cls: "brass-preview-pages",
    });
    for (const [pageIndex, layoutPage] of layout.pages.entries()) {
      const page = pages.createDiv({ cls: "brass-preview-page" });
      page.style.aspectRatio = `${layout.dimensions.width} / ${layout.dimensions.height}`;
      for (const block of layoutPage.blocks) {
        const element = page.createDiv({
          cls: `brass-preview-block brass-preview-${block.type}`,
        });
        // Emphasis (*italic*, **bold**, _underline_) as the PDF prints it.
        for (const [lineIndex, runs] of emphasisRuns(block.lines).entries()) {
          if (lineIndex > 0) element.appendText("\n");
          for (const run of runs) {
            const span = element.createSpan({ text: run.text });
            span.toggleClass("brass-preview-bold", run.bold);
            span.toggleClass("brass-preview-italic", run.italic);
            span.toggleClass("brass-preview-underline", run.underline);
          }
        }
        element.style.left = `${(block.left / layout.dimensions.width) * 100}%`;
        element.style.top = `${(block.top / layout.dimensions.height) * 100}%`;
        element.style.width = `${(block.width / layout.dimensions.width) * 100}%`;
        element.style.textAlign = block.align;
        // Bold follows the PDF export settings, so the preview matches.
        element.style.fontWeight = boldParts[boldPartOf(block)] ? "700" : "400";
        element.style.lineHeight = String(layout.lineHeight / layout.fontSize);
      }
      const pageNumber = scriptPageNumber(
        layoutPage,
        pageIndex,
        this.screenplay,
      );
      if (pageNumber !== null) {
        const number = page.createDiv({
          cls: "brass-preview-page-number",
          text: `${pageNumber}.`,
        });
        number.style.fontWeight = boldParts["page-number"] ? "700" : "400";
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
