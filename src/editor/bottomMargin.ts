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
import { EditorView } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type FirstDraftPlugin from "../main";

/**
 * Keep the line being typed at least `bottomTypingMargin` pixels above the
 * bottom of the editor in screenplay notes, so a floating status bar (word
 * count, page estimate) never covers it. Uses CodeMirror's scroll margins,
 * so it changes where the editor scrolls to, not the note text.
 */
export function createBottomMarginExtension(
  plugin: FirstDraftPlugin,
): Extension {
  return EditorView.scrollMargins.of((view) => {
    const margin = plugin.settings.bottomTypingMargin;
    if (margin <= 0) return null;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return null;
    return { bottom: margin };
  });
}
