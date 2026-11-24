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

import { TFile, TFolder, type App } from "obsidian";
import { projectForFile } from "../projects/vault";
import { variableRanges } from "./variables";

/*
 * Shared "$" variables (#270): every note in the screenplay's project
 * folder (or the script's own folder) shares its variables, so the outline,
 * the pages and other notes all offer the same "$" names. Notes are read
 * once and kept until they change.
 */

/** Variables counted in one note, with when it last changed. */
export interface NoteVariables {
  counts: Map<string, number>;
  mtime: number;
}

/** At most this many notes are read from a folder. */
const MAX_NOTES = 400;

/** The folder whose notes share variables with `file`. */
export function variablesFolder(app: App, file: TFile): TFolder | null {
  const project = projectForFile(app, file);
  return project?.file.parent ?? file.parent ?? null;
}

export class ProjectVariables {
  private readonly cache = new Map<
    string,
    { mtime: number; prefix: string; counts: Map<string, number> }
  >();

  constructor(private readonly app: App) {}

  /** Forget a note (it changed or went). */
  invalidate(path: string): void {
    this.cache.delete(path);
  }

  /** The variables of the other notes in `file`'s folder. */
  async others(file: TFile, prefix: string): Promise<NoteVariables[]> {
    const folder = variablesFolder(this.app, file);
    if (folder === null) return [];
    const notes: TFile[] = [];
    const walk = (at: TFolder): void => {
      for (const child of at.children) {
        if (notes.length >= MAX_NOTES) return;
        if (child instanceof TFolder) walk(child);
        else if (
          child instanceof TFile &&
          child.path !== file.path &&
          (child.extension === "md" || child.extension === "fountain")
        ) {
          notes.push(child);
        }
      }
    };
    walk(folder);
    const result: NoteVariables[] = [];
    for (const note of notes) {
      const cached = this.cache.get(note.path);
      if (
        cached !== undefined &&
        cached.mtime === note.stat.mtime &&
        cached.prefix === prefix
      ) {
        result.push({ counts: cached.counts, mtime: cached.mtime });
        continue;
      }
      const text = await this.app.vault.cachedRead(note);
      const counts = new Map<string, number>();
      if (text.includes(prefix)) {
        for (const { from, to } of variableRanges(text, 0, prefix)) {
          const name = text.slice(from, to);
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }
      this.cache.set(note.path, { mtime: note.stat.mtime, prefix, counts });
      result.push({ counts, mtime: note.stat.mtime });
    }
    return result;
  }
}
