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

import { TFolder } from "obsidian";
import type { App } from "obsidian";

/**
 * Whether a file or folder already uses `path`, ignoring upper and lower
 * case. Windows and macOS treat "Alex.md" and "alex.md" as the same file,
 * so Obsidian refuses to create one when the other exists.
 */
export function isPathTaken(app: App, path: string): boolean {
  if (app.vault.getAbstractFileByPath(path) !== null) return true;
  // Only the files in the same folder can clash, so look at those alone.
  const slash = path.lastIndexOf("/");
  const parent =
    slash === -1
      ? app.vault.getRoot()
      : app.vault.getAbstractFileByPath(path.slice(0, slash));
  if (!(parent instanceof TFolder)) return false;
  const wanted = path.toLocaleLowerCase();
  return parent.children.some(
    (child) => child.path.toLocaleLowerCase() === wanted,
  );
}
