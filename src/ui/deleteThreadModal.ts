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

import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";
import type { ThreadDeleteLeaves } from "../screenplay/threads";

/** The word to type before the delete button works (#342). */
export const DELETE_WORD = "YES";

/** Whether the typed text unlocks the delete button. */
export function deleteUnlocked(typed: string): boolean {
  return typed.trim().toUpperCase() === DELETE_WORD;
}

/** "3 places in 2 notes", "1 place in 1 note". */
export function placesLabel(places: number, notes: number): string {
  const place = places === 1 ? "place" : "places";
  const note = notes === 1 ? "note" : "notes";
  return `${places} ${place} in ${notes} ${note}`;
}

/**
 * Asks before deleting a thread everywhere (#342): says what will go and
 * what stays, warns that it can't be undone, and only lets Delete work
 * after YES is typed (the box types in capitals).
 */
export class DeleteThreadModal extends Modal {
  constructor(
    app: App,
    private readonly name: string,
    private readonly places: number,
    private readonly notes: number,
    private readonly leaves: ThreadDeleteLeaves,
    private readonly onDelete: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(`Delete the thread 🧵 ${this.name}?`);
    this.contentEl.addClass("brass-delete-thread");
    this.contentEl.createEl("p", {
      text: `This removes [&${this.name}] from ${placesLabel(this.places, this.notes)}.`,
    });
    this.contentEl.createEl("p", {
      text:
        this.leaves === "text"
          ? `A thread with its own text leaves the text: [&${this.name}|the pistol] becomes "the pistol". Change this in Settings → Threads.`
          : `A thread with its own text loses the text too: [&${this.name}|the pistol] goes, words and all. Change this in Settings → Threads.`,
    });
    this.contentEl.createEl("p", {
      cls: "brass-delete-thread-warning",
      text: "This can't be undone.",
    });
    let typed = "";
    const inputs: HTMLInputElement[] = [];
    let deleteButton: HTMLButtonElement | null = null;
    const update = (): void => {
      if (deleteButton) deleteButton.disabled = !deleteUnlocked(typed);
    };
    const run = (): void => {
      if (!deleteUnlocked(typed)) return;
      this.close();
      this.onDelete();
    };
    new Setting(this.contentEl)
      .setName(`Type ${DELETE_WORD} to delete`)
      .addText((text) => {
        text.inputEl.addClass("brass-delete-thread-input");
        text.inputEl.setAttribute("autocapitalize", "characters");
        text.inputEl.setAttribute("autocomplete", "off");
        text.inputEl.setAttribute("spellcheck", "false");
        text.onChange((value) => {
          const upper = value.toUpperCase();
          if (upper !== value) text.setValue(upper);
          typed = upper;
          update();
        });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") run();
        });
        inputs.push(text.inputEl);
      });
    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText("Cancel").onClick(() => this.close()),
      )
      .addButton((button) => {
        button.setButtonText("Delete").setDestructive().onClick(run);
        deleteButton = button.buttonEl;
        update();
      });
    inputs[0]?.focus();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
