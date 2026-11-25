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

import { threadElement } from "../editor/threads";
import { findThreads, type ThreadMark } from "../screenplay/threads";
import type { ThreadDisplay } from "../settings/settings";

/*
 * Threads in rendered Markdown (#323): a callout or table in Live Preview
 * (drawn as rendered Markdown while the cursor is outside it) and the
 * reading view show `[&name]` as the 🧵 too, not as raw text.
 */

/**
 * Draw each `[&name]` in the text of `root` as a thread. `onClick` gets
 * the mark, how many threads with the same name came before it in `root`
 * (to find it in the note), and the mouse event. Code is left alone.
 */
export function renderThreads(
  root: HTMLElement,
  display: ThreadDisplay,
  onClick: (mark: ThreadMark, nth: number, event: MouseEvent) => void,
): void {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node as Text;
    if (!text.data.includes("[&")) continue;
    if (text.parentElement?.closest("code, pre, .scribidian-thread")) continue;
    nodes.push(text);
  }
  const seen = new Map<string, number>();
  for (const node of nodes) {
    const marks = findThreads(node.data);
    if (marks.length === 0) continue;
    const fragment = doc.createDocumentFragment();
    let at = 0;
    for (const mark of marks) {
      fragment.append(node.data.slice(at, mark.from));
      const nth = seen.get(mark.key) ?? 0;
      seen.set(mark.key, nth + 1);
      const el = threadElement(mark, display);
      el.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        // Not into the callout's text to edit it: go along the thread.
        event.preventDefault();
        event.stopPropagation();
        onClick(mark, nth, event);
      });
      el.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      fragment.append(el);
      at = mark.to;
    }
    fragment.append(node.data.slice(at));
    node.replaceWith(fragment);
  }
}
