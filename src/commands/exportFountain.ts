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
import type BrassPlugin from "../main";
import { fountainExportPath } from "../export/fountain";
import { exportedFountainText } from "../export/exportedText";
import { loadScreenplayContext } from "../projects/vault";
import { parseFountain, withoutActionIndent } from "../screenplay/parser";
import type { ScreenplayDocument } from "../screenplay/model";
import { cleanExportFor, type CleanExportFormat } from "../settings/settings";
import {
  inlineEmbeds,
  withoutFrontmatter,
  type EmbedResolver,
} from "../export/embeds";
import { TFile } from "obsidian";

/**
 * The text an embed shows (#272): a note without its frontmatter, the
 * section under a heading, or a block. Null for images and missing notes.
 */
export function embedResolver(plugin: BrassPlugin): EmbedResolver {
  const { app } = plugin;
  return async (link, fromPath) => {
    const hash = link.indexOf("#");
    const path = hash === -1 ? link : link.slice(0, hash);
    const subpath = hash === -1 ? "" : link.slice(hash + 1);
    const file =
      path === ""
        ? app.vault.getAbstractFileByPath(fromPath)
        : app.metadataCache.getFirstLinkpathDest(path, fromPath);
    if (!(file instanceof TFile)) return null;
    if (file.extension !== "md" && file.extension !== "fountain") return null;
    const text = await app.vault.cachedRead(file);
    if (subpath === "")
      return { text: withoutFrontmatter(text), path: file.path };
    const cache = app.metadataCache.getFileCache(file);
    if (subpath.startsWith("^")) {
      const block = cache?.blocks?.[subpath.slice(1).toLocaleLowerCase()];
      if (!block) return null;
      const part = text
        .slice(block.position.start.offset, block.position.end.offset)
        .replace(/\s\^[A-Za-z0-9-]+\s*$/u, "");
      return { text: part, path: `${file.path}#${subpath}` };
    }
    const headings = cache?.headings ?? [];
    const at = headings.findIndex(
      (heading) =>
        heading.heading.trim().toLocaleLowerCase() ===
        subpath.trim().toLocaleLowerCase(),
    );
    const heading = headings[at];
    if (heading === undefined) return null;
    const next = headings
      .slice(at + 1)
      .find((later) => later.level <= heading.level);
    const part = text.slice(
      heading.position.end.offset,
      next ? next.position.start.offset : text.length,
    );
    return { text: part, path: `${file.path}#${subpath}` };
  };
}

/**
 * The note's text ready for a clean export to `format`: with the embedded
 * text put in when that format's Embeds choice is "Include text" (#272).
 */
export async function sourceWithEmbeds(
  plugin: BrassPlugin,
  source: string,
  fromPath: string,
  clean: boolean,
  format: CleanExportFormat,
): Promise<string> {
  if (!clean || cleanExportFor(plugin.settings, format).embeds !== "include") {
    return source;
  }
  return inlineEmbeds(source, fromPath, embedResolver(plugin));
}

/**
 * The Fountain text an export writes for `source`: cleaned of the
 * Obsidian-only elements chosen in settings (when `clean`), without
 * threads, and with capitals marked as action (setting). The status bar
 * counts pages from the clean version, so they match the export.
 */
export function exportedFountainSource(
  plugin: BrassPlugin,
  source: string,
  clean: boolean,
  format: CleanExportFormat = "fountain",
): string {
  return exportedFountainText(source, {
    clean,
    cleanExport: cleanExportFor(plugin.settings, format),
    markCapitalsAsAction: plugin.settings.markCapitalsAsAction,
  });
}

/**
 * The screenplay as an export holds it: the Fountain export parsed, with
 * the title page kept. With `clean` (the preview, and the clean PDF and
 * Final Draft exports), the Obsidian-only elements chosen in that
 * format's Clean export column are left out.
 */
export function printedScreenplay(
  plugin: BrassPlugin,
  source: string,
  titlePage: ScreenplayDocument["titlePage"],
  clean = true,
  format: CleanExportFormat = "pdf",
): ScreenplayDocument {
  const document = {
    ...parseFountain(exportedFountainSource(plugin, source, clean, format)),
    titlePage,
  };
  return plugin.settings.indentActionWithSpaces
    ? document
    : withoutActionIndent(document);
}

export async function exportFountain(
  plugin: BrassPlugin,
  view: MarkdownView,
  clean = false,
): Promise<void> {
  const file = view.file;
  if (file === null) return;

  const existingPaths = {
    has: (path: string) =>
      plugin.app.vault.getAbstractFileByPath(path) !== null,
  };
  const context = await loadScreenplayContext(
    plugin.app,
    file,
    plugin.settings.characterFolder,
    plugin.isScreenplayFile(file) ? view.editor.getValue() : undefined,
  );
  const path = fountainExportPath(context.owner.path, existingPaths);
  const content = exportedFountainSource(
    plugin,
    await sourceWithEmbeds(
      plugin,
      context.source,
      context.owner.path,
      clean,
      "fountain",
    ),
    clean,
  );

  try {
    const file = await plugin.app.vault.create(path, content);
    new Notice(`Exported screenplay to ${path}`);
    await plugin.app.workspace.getLeaf(false).openFile(file);
  } catch (error) {
    console.error("Brass could not export Fountain", error);
    new Notice("Brass could not export the screenplay.");
  }
}
