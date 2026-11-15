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

import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type FirstDraftPlugin from "../main";

const BOTTOM_MARGIN_CLASS = "firstdraft-bottom-margin";

/**
 * In screenplay notes, end the editor's scrolling area `bottomTypingMargin`
 * pixels above the bottom of the pane, so a floating status bar (word count,
 * page estimate) never covers text. Display only: the note is not changed.
 */
export function createBottomMarginExtension(
  plugin: FirstDraftPlugin,
): Extension {
  return ViewPlugin.fromClass(
    class {
      active = false;

      constructor(view: EditorView) {
        this.active = this.isActive(view);
      }

      update(update: ViewUpdate): void {
        // Checking the file is not free, so only when something could change it.
        if (
          update.docChanged ||
          update.transactions.some((tr) => tr.reconfigured) ||
          update.startState.field(editorInfoField, false)?.file !==
            update.state.field(editorInfoField, false)?.file
        ) {
          this.active = this.isActive(update.view);
        }
      }

      private isActive(view: EditorView): boolean {
        if (plugin.settings.bottomTypingMargin <= 0) return false;
        const file = view.state.field(editorInfoField, false)?.file ?? null;
        return file !== null && plugin.isScreenplayFile(file);
      }
    },
    {
      provide: (self) =>
        EditorView.editorAttributes.of((view) =>
          view.plugin(self)?.active
            ? {
                class: BOTTOM_MARGIN_CLASS,
                style: `--firstdraft-bottom-margin: ${plugin.settings.bottomTypingMargin}px`,
              }
            : null,
        ),
    },
  );
}
