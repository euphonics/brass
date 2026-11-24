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

import type { MarkdownView } from "obsidian";
import type ScribidianPlugin from "../main";
import { loadScreenplayContext } from "../projects/vault";
import { ScreenplayPreviewModal } from "../ui/screenplayPreviewModal";
import { printedScreenplay, sourceWithEmbeds } from "./exportFountain";
import { exportPdf } from "./exportPdf";

export async function previewScreenplay(
  plugin: ScribidianPlugin,
  view: MarkdownView,
): Promise<void> {
  const file = view.file;
  if (file === null) return;
  const context = await loadScreenplayContext(
    plugin.app,
    file,
    plugin.settings.characterFolder,
    view.editor.getValue(),
  );
  const title = context.project?.project.title ?? context.owner.basename;
  new ScreenplayPreviewModal(
    plugin.app,
    printedScreenplay(
      plugin,
      await sourceWithEmbeds(
        plugin,
        context.source,
        context.owner.path,
        true,
        "pdf",
      ),
      context.document.titlePage,
    ),
    plugin.settings.pageSize,
    title,
    () => exportPdf(plugin, view, true),
    plugin.settings.pdfBold,
    plugin.settings.pdfContinued,
  ).open();
}
