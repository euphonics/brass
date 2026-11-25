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

import type { App, TFile } from "obsidian";

/*
 * Completr (a word-completion plugin) opens its own suggestion popup while
 * you type. In a screenplay it competes with Brass's lists (typing
 * NIGHT after "INT. PLACE - "). With the setting on, Completr stays quiet
 * in screenplay notes and works as usual everywhere else (#271). Completr
 * has no switch for this, so its popup's onTrigger is wrapped; Brass
 * puts the original back when it unloads.
 */

type Trigger = (
  cursor: unknown,
  editor: unknown,
  file: TFile | null,
) => unknown;

interface Popup {
  onTrigger: Trigger;
  brassOriginalTrigger?: Trigger;
}

function completrPopup(app: App): Popup | null {
  const plugins = (
    app as unknown as {
      plugins?: { plugins?: Record<string, { popup?: unknown } | undefined> };
    }
  ).plugins?.plugins;
  const popup = plugins?.["obsidian-completr"]?.popup as Popup | undefined;
  return popup && typeof popup.onTrigger === "function" ? popup : null;
}

/**
 * Wrap Completr's popup (when Completr is on and not wrapped yet) so it
 * doesn't open in notes where `quiet(file)` is true. Returns a function
 * that puts the original back.
 */
export function quietCompletr(
  app: App,
  quiet: (file: TFile | null) => boolean,
): () => void {
  const popup = completrPopup(app);
  if (popup === null || popup.brassOriginalTrigger) return () => {};
  const original = popup.onTrigger;
  popup.brassOriginalTrigger = original;
  popup.onTrigger = function (cursor, editor, file) {
    if (quiet(file)) return null;
    return original.call(this, cursor, editor, file);
  };
  return () => {
    if (popup.brassOriginalTrigger === original) {
      popup.onTrigger = original;
      delete popup.brassOriginalTrigger;
    }
  };
}
