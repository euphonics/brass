/*
 * Copyright 2026 Christian Grobmeier
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

import type { ScreenplayIndex } from "../screenplay/model";

/**
 * The screenplay text with the line being typed emptied (its line break is
 * kept, so line numbers don't shift). While the user types within one line
 * this stays the same, so the suggestion index can be reused.
 */
export function textOutsideLine(
  source: string,
  lineFrom: number,
  lineTo: number,
): string {
  return `${source.slice(0, lineFrom)}${source.slice(lineTo)}`;
}

/**
 * Smart rebuild: keeps the last suggestion index (characters, locations,
 * times, parentheticals, transitions) and rebuilds it only when the text
 * outside the current line changes, another note changes (project parts),
 * or a different screenplay is edited.
 */
export class ScreenplayIndexCache {
  private entry: { path: string; key: string; index: ScreenplayIndex } | null =
    null;

  async get(
    path: string,
    key: string,
    build: () => Promise<ScreenplayIndex>,
  ): Promise<ScreenplayIndex> {
    const entry = this.entry;
    if (entry !== null && entry.path === path && entry.key === key) {
      return entry.index;
    }
    const index = await build();
    this.entry = { path, key, index };
    return index;
  }

  /**
   * Forget the index, unless the changed note is the one it was built for
   * (its own edits are already covered by the key).
   */
  invalidate(changedPath?: string): void {
    if (changedPath !== undefined && this.entry?.path === changedPath) return;
    this.entry = null;
  }
}
