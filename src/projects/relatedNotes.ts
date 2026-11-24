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

import { TFile, type App, type TFolder } from "obsidian";

/*
 * Related notes (#290): an outline or other note that belongs with a
 * screenplay gets its writing helpers ("+" names, "$" variables, the "[&"
 * list), using the script's characters and variables. A note belongs with
 * a script when the script names it in its `outline` property, when it
 * sits in the screenplay's project folder (or a folder inside it), or when
 * it sits in the same folder as a script.
 */

/** Folders up from the note that are searched for its script. */
const MAX_DEPTH = 4;

/** A script whose `outline` property links to `file`. */
export function scriptByOutline(
  app: App,
  file: TFile,
  isScript: (file: TFile) => boolean,
): TFile | null {
  const backlinks = (
    app.metadataCache as unknown as {
      getBacklinksForFile?: (file: TFile) => { keys?: () => Iterable<string> };
    }
  ).getBacklinksForFile?.(file);
  const sources = backlinks?.keys ? [...backlinks.keys()] : [];
  for (const path of sources) {
    const source = app.vault.getAbstractFileByPath(path);
    if (!(source instanceof TFile) || !isScript(source)) continue;
    const links =
      app.metadataCache.getFileCache(source)?.frontmatterLinks ?? [];
    const linked = links.some(
      (link) =>
        link.key === "outline" &&
        app.metadataCache.getFirstLinkpathDest(link.link, source.path)?.path ===
          file.path,
    );
    if (linked) return source;
  }
  return null;
}

/**
 * The script (or screenplay project file) `file` belongs with, or null.
 * `isProject` and `isScript` tell project files and screenplays apart.
 */
export function scriptForRelatedNote(
  app: App,
  file: TFile,
  isProject: (file: TFile) => boolean,
  isScript: (file: TFile) => boolean,
): TFile | null {
  const byOutline = scriptByOutline(app, file, isScript);
  if (byOutline !== null) return byOutline;
  let folder: TFolder | null = file.parent;
  for (let depth = 0; folder !== null && depth < MAX_DEPTH; depth += 1) {
    const files = folder.children.filter(
      (child): child is TFile => child instanceof TFile && child !== file,
    );
    const project = files.find((child) => isProject(child));
    if (project !== undefined) return project;
    // A lone script counts only for notes in its own folder; folders
    // further up count only when they hold a project.
    if (depth === 0) {
      const script = files.find((child) => isScript(child));
      if (script !== undefined) return script;
    }
    if (folder.isRoot()) break;
    folder = folder.parent;
  }
  return null;
}
