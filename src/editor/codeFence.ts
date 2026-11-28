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

import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

/**
 * True when the line at `pos` is a ``` code block's opening fence or a line
 * inside it, even before the closing fence is typed (#358). Not the
 * closing fence: Enter after it is a screenplay Enter again. Read from
 * Obsidian's syntax tree, so it costs the same however long the note is.
 */
export function inCodeFence(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos);
  const tree = syntaxTree(state);
  for (const at of [line.from, line.to]) {
    for (const side of [1, -1] as const) {
      let node: { name: string; parent: unknown } | null = tree.resolveInner(
        at,
        side,
      );
      while (node !== null) {
        if (node.name.includes("HyperMD-codeblock")) {
          return !node.name.includes("HyperMD-codeblock-end");
        }
        node = node.parent as typeof node;
      }
    }
  }
  return false;
}
