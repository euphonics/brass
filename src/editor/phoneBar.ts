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

import type { Extension } from "@codemirror/state";
import { ViewPlugin, type EditorView } from "@codemirror/view";
import { editorInfoField, type Editor, type TFile } from "obsidian";

/** A button on the phone bar: its label and what it does in the editor. */
export interface PhoneButton {
  label: string;
  run: (view: EditorView, editor: Editor) => void;
}

export interface PhoneBarHost {
  /** Whether the bar is turned on in settings. */
  enabled: () => boolean;
  isScreenplayFile: (file: TFile) => boolean;
  /** The buttons, in order. */
  buttons: readonly PhoneButton[];
}

/** Whether the bar shows for `file`: turned on, and a screenplay. */
export function phoneBarShown(
  host: Pick<PhoneBarHost, "enabled" | "isScreenplayFile">,
  file: TFile | null,
): boolean {
  return host.enabled() && file !== null && host.isScreenplayFile(file);
}

/**
 * A row of buttons under screenplay editors for the elements a phone
 * keyboard makes slow to type (new scene, character, wryly, Tab). Only
 * register it on mobile. The bar is built once per editor, at the bottom of
 * the editor like a CodeMirror panel, and only shown or hidden afterwards.
 * Obsidian sets the editor's file after the editor exists, so whether to
 * show it is checked on every update; the check is O(1) (the editor's file
 * and settings), never proportional to the note. Buttons call the actions
 * directly, not through commands, so they work even when a command is
 * hidden from the palette.
 */
export function createPhoneBarExtension(host: PhoneBarHost): Extension {
  return ViewPlugin.fromClass(
    class {
      readonly dom: HTMLElement;
      shown: boolean | null = null;

      constructor(readonly view: EditorView) {
        this.dom = view.dom.createDiv({ cls: "brass-phone-bar" });
        this.dom.setAttribute("role", "toolbar");
        this.dom.setAttribute("aria-label", "Screenplay elements");
        for (const { label, run } of host.buttons) {
          const button = this.dom.createEl("button", { text: label });
          // Keep the editor focused and the keyboard up while tapping. Only
          // pointerdown is stopped, so the bar can still scroll sideways.
          button.addEventListener("pointerdown", (event) =>
            event.preventDefault(),
          );
          button.addEventListener("click", () => {
            const editor = this.view.state.field(
              editorInfoField,
              false,
            )?.editor;
            if (editor) run(this.view, editor);
          });
        }
        this.sync();
      }

      update(): void {
        this.sync();
      }

      private sync(): void {
        const file =
          this.view.state.field(editorInfoField, false)?.file ?? null;
        const show = phoneBarShown(host, file);
        if (this.shown === show) return;
        this.shown = show;
        this.dom.toggle(show);
      }

      destroy(): void {
        this.dom.remove();
      }
    },
  );
}
