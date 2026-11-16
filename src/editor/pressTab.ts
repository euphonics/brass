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

import { runScopeHandlers } from "@codemirror/view";
import type { EditorView } from "@codemirror/view";

/**
 * Run the editor's Tab (or Shift+Tab) key bindings, exactly as if the key
 * were pressed: Smart Tab, accepting a suggestion, or Obsidian's own Tab.
 * Used by commands, because phone keyboards have no Tab key.
 */
export function pressTab(view: EditorView, shiftKey: boolean): boolean {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    code: "Tab",
    keyCode: 9,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  const handled = runScopeHandlers(view, event, "editor");
  view.focus();
  return handled;
}
