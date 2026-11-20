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

import { stripThreadsFromSource } from "../screenplay/threads";
import { Notice } from "obsidian";
import type { MarkdownView } from "obsidian";
import type ScribidianPlugin from "../main";
import {
  cleanFountainSource,
  fountainExportPath,
  markCapitalsAsAction,
  normalizeCleanExportOptions,
} from "../export/fountain";
import { loadScreenplayContext } from "../projects/vault";

export async function exportFountain(
  plugin: ScribidianPlugin,
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
  const exported = clean
    ? cleanFountainSource(
        context.source,
        normalizeCleanExportOptions(
          plugin.settings.cleanExport as unknown as Record<string, unknown>,
        ),
      )
    : context.source;
  // Threads ("[&name]") are Scribidian's own: no export keeps them.
  const withoutThreads = stripThreadsFromSource(exported);
  const content = plugin.settings.markCapitalsAsAction
    ? markCapitalsAsAction(withoutThreads)
    : withoutThreads;

  try {
    const file = await plugin.app.vault.create(path, content);
    new Notice(`Exported screenplay to ${path}`);
    await plugin.app.workspace.getLeaf(false).openFile(file);
  } catch (error) {
    console.error("Scribidian could not export Fountain", error);
    new Notice("Scribidian could not export the screenplay.");
  }
}
