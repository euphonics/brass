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

import { Notice } from "obsidian";
import type { MarkdownView } from "obsidian";
import type ScribidianPlugin from "../main";
import type * as PdfExport from "../export/pdf";
// The PDF code (pdf-lib, fontkit and the embedded fonts, most of the
// plugin's size) loads on the first export, not when Obsidian starts.
type PdfModule = typeof PdfExport;
import { loadScreenplayContext } from "../projects/vault";
import { printedScreenplay } from "./exportFountain";
import { ScreenplayLayoutError } from "../export/screenplayLayout";

const activeExports = new WeakSet<ScribidianPlugin>();

export async function exportPdf(
  plugin: ScribidianPlugin,
  view: MarkdownView,
  clean = false,
): Promise<void> {
  const file = view.file;
  if (file === null) return;
  if (activeExports.has(plugin)) {
    new Notice("A PDF export is already in progress.");
    return;
  }

  activeExports.add(plugin);
  const progress = new Notice("Preparing screenplay PDF…", 0);
  let pdf: PdfModule | null = null;
  try {
    // Paint the progress notice before synchronous font decoding starts, using
    // the editor's window so this also works in an Obsidian popout.
    const ownerWindow = view.containerEl.ownerDocument.defaultView ?? window;
    await new Promise<void>((resolve) => ownerWindow.setTimeout(resolve, 0));
    pdf = await import("../export/pdf");
    const context = await loadScreenplayContext(
      plugin.app,
      file,
      plugin.settings.characterFolder,
      plugin.isScreenplayFile(file) ? view.editor.getValue() : undefined,
    );
    const title = context.project?.project.title ?? context.owner.basename;
    const path = pdf.pdfExportPath(
      context.owner.path,
      {
        has: (candidate: string) =>
          plugin.app.vault.getAbstractFileByPath(candidate) !== null,
      },
      title,
    );
    const document = printedScreenplay(
      plugin,
      context.source,
      context.document.titlePage,
      clean,
    );
    const content = await pdf.serializePdf(document, {
      pageSize: plugin.settings.pageSize,
      title,
      bold: plugin.settings.pdfBold,
      continued: plugin.settings.pdfContinued,
    });
    const buffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength,
    ) as ArrayBuffer;
    await plugin.app.vault.createBinary(path, buffer);
    new Notice(`Exported screenplay PDF to ${path}`);
  } catch (error) {
    if (
      (pdf !== null && error instanceof pdf.UnsupportedPdfTextError) ||
      error instanceof ScreenplayLayoutError
    ) {
      new Notice(error.message, 15000);
      return;
    }
    console.error("Scribidian could not export PDF", error);
    new Notice("Scribidian could not export the screenplay PDF.");
  } finally {
    progress.hide();
    activeExports.delete(plugin);
  }
}
