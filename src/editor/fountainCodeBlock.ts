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

import type ScribidianPlugin from "../main";
import { classifyLayoutLines } from "./layoutClassifier";

/** CSS class on the container of a rendered Fountain code block. */
const BLOCK_CLASS = "scribidian-fountain-codeblock";

/**
 * Register a markdown code block post-processor for `fountain` fenced code
 * blocks. When the "Render Fountain code blocks" setting is on, the block
 * content is laid out with screenplay formatting (centred character cues,
 * indented dialogue, right-aligned transitions and so on). When off, the
 * block is re-created as a standard `<pre><code>` so it looks like any
 * other code block.
 *
 * This applies to every note in the vault, not only to screenplay-mode notes.
 */
export function registerFountainCodeBlockProcessor(
  plugin: ScribidianPlugin,
): void {
  plugin.registerMarkdownCodeBlockProcessor("fountain", (source, el) => {
    if (!plugin.settings.renderFountainCodeBlocks) {
      // Recreate the default code block appearance.
      const pre = el.createEl("pre");
      const code = pre.createEl("code", { cls: "language-fountain" });
      code.setText(source);
      return;
    }

    el.addClass(BLOCK_CLASS);

    const lines = source.split("\n");
    const kinds = classifyLayoutLines(lines);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const kind = kinds[i];
      const div = el.createDiv({
        cls: kind ? `scribidian-sp-${kind}` : undefined,
      });
      if (line) {
        div.setText(line);
      } else {
        // Preserve blank-line height with a non-breaking space.
        div.addClass("scribidian-codeblock-blank");
        div.setText("\u00A0");
      }
    }
  });
}
