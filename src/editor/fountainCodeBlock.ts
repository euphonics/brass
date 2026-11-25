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

import { MarkdownPreviewRenderer } from "obsidian";
import type BrassPlugin from "../main";
import { classifyLayoutLines } from "./layoutClassifier";

/** CSS class on the container of a rendered Fountain code block. */
const BLOCK_CLASS = "brass-fountain-codeblock";

/**
 * Register a markdown code block post-processor for `fountain` fenced code
 * blocks. When the "Show fountain code blocks as a script" setting is on, the block
 * content is laid out with screenplay formatting (centered character cues,
 * indented dialogue, right-aligned transitions and so on). When off, the
 * block is re-created as a standard `<pre><code>` so it looks like any
 * other code block.
 *
 * This applies to every note in the vault, not only to screenplay-mode notes.
 */
export function registerFountainCodeBlockProcessor(plugin: BrassPlugin): void {
  // A processor an earlier load of Brass never removed (two reloads at
  // once): drop it, or registering again fails and stops the plugin
  // loading halfway. One from another plugin is left alone.
  const marker = window as unknown as Record<symbol, boolean | undefined>;
  const registry = (
    MarkdownPreviewRenderer as unknown as {
      codeBlockPostProcessors?: Record<string, unknown>;
    }
  ).codeBlockPostProcessors;
  if (marker[OWN_PROCESSOR] === true && registry !== undefined) {
    delete registry.fountain;
  }
  try {
    registerProcessor(plugin);
  } catch {
    // Another plugin shows fountain code blocks: keep its look.
    return;
  }
  marker[OWN_PROCESSOR] = true;
  plugin.register(() => {
    marker[OWN_PROCESSOR] = false;
  });
}

/** Set while a Brass load has the "fountain" processor registered. */
const OWN_PROCESSOR = Symbol.for("brass.fountainCodeBlock");

function registerProcessor(plugin: BrassPlugin): void {
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
        cls: kind ? `brass-sp-${kind}` : undefined,
      });
      if (line) {
        div.setText(line);
      } else {
        // Preserve blank-line height with a non-breaking space.
        div.addClass("brass-codeblock-blank");
        div.setText("\u00A0");
      }
    }
  });
}
