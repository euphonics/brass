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

import { ItemView, TFile, TFolder, setIcon } from "obsidian";
import type { IconName, WorkspaceLeaf } from "obsidian";
import type BrassPlugin from "../main";
import { variablesFolder } from "../editor/projectVariables";
import { variableRanges } from "../editor/variables";

export const PLACEHOLDERS_VIEW_TYPE = "brass-placeholders";

/** At most this many notes are read from a folder. */
const MAX_NOTES = 400;

/** One use of a placeholder: its note, where it is, and its line. */
export interface PlaceholderPlace {
  path: string;
  from: number;
  line: string;
}

/** A placeholder as the panel lists it, with every place it is used. */
export interface PlaceholderSummary {
  name: string;
  places: PlaceholderPlace[];
}

/**
 * The placeholders ("$name") in `notes`, in the given note order, most
 * used first, then by name. A name's places stay in note and text order.
 */
export function collectPlaceholders(
  notes: readonly { path: string; text: string }[],
  prefix = "$",
): PlaceholderSummary[] {
  const byName = new Map<string, PlaceholderSummary>();
  for (const { path, text } of notes) {
    if (!text.includes(prefix)) continue;
    for (const { from, to } of variableRanges(text, 0, prefix)) {
      const name = text.slice(from, to);
      const start = text.lastIndexOf("\n", from - 1) + 1;
      const endAt = text.indexOf("\n", from);
      const line = text.slice(start, endAt === -1 ? text.length : endAt).trim();
      let summary = byName.get(name);
      if (summary === undefined) {
        summary = { name, places: [] };
        byName.set(name, summary);
      }
      summary.places.push({ path, from, line });
    }
  }
  return [...byName.values()].sort(
    (a, b) => b.places.length - a.places.length || a.name.localeCompare(b.name),
  );
}

/**
 * The Placeholders sidebar (#341): every "$name" in the current note's
 * project folder (the notes the "$" list reads, #270), as a tree like the
 * Threads panel. Each placeholder opens to its notes and lines; click a
 * line to go there. Read when the panel refreshes, not while you type.
 */
export class PlaceholdersView extends ItemView {
  private readonly expanded = new Set<string>();
  private generation = 0;
  private shown = "";

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: BrassPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return PLACEHOLDERS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Placeholders";
  }

  getIcon(): IconName {
    return "dollar-sign";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("brass-threads", "brass-placeholders");
    this.refresh();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  refresh(): void {
    const generation = ++this.generation;
    void this.render(() => generation === this.generation);
  }

  /** The current note first, then the other notes of its folder. */
  private async notes(
    file: TFile,
    text: string,
  ): Promise<{ path: string; text: string }[]> {
    const app = this.plugin.app;
    const script = this.plugin.scriptForNote(file);
    const folder = variablesFolder(app, script ?? file);
    const notes = [{ path: file.path, text }];
    if (folder === null) return notes;
    const files: TFile[] = [];
    const walk = (at: TFolder): void => {
      for (const child of at.children) {
        if (files.length >= MAX_NOTES) return;
        if (child instanceof TFolder) walk(child);
        else if (
          child instanceof TFile &&
          child.path !== file.path &&
          (child.extension === "md" || child.extension === "fountain")
        )
          files.push(child);
      }
    };
    walk(folder);
    files.sort((a, b) => a.path.localeCompare(b.path));
    for (const note of files) {
      notes.push({ path: note.path, text: await app.vault.cachedRead(note) });
    }
    return notes;
  }

  private async render(current: () => boolean): Promise<void> {
    const view = this.plugin.activeMarkdownView();
    const file = view?.file ?? null;
    if (view === null || !(file instanceof TFile)) {
      this.show("none", (el) => {
        el.createDiv({
          cls: "brass-threads-empty",
          text: "Open a note to see its placeholders.",
        });
      });
      return;
    }
    const prefix = this.plugin.settings.variablePrefix;
    const notes = await this.notes(file, view.editor.getValue());
    if (!current()) return;
    const placeholders = collectPlaceholders(notes, prefix);
    // Only redraw when something changed, so the list doesn't flicker.
    const signature = JSON.stringify([
      file.path,
      placeholders.map((p) => [
        p.name,
        p.places.map((place) => [place.path, place.from, place.line]),
      ]),
    ]);
    if (signature === this.shown) return;
    this.show(signature, (el) => this.renderTree(el, placeholders, file));
  }

  private show(signature: string, draw: (el: HTMLElement) => void): void {
    this.shown = signature;
    this.contentEl.empty();
    draw(this.contentEl);
  }

  /** A row that opens and closes `item`, with a chevron, like search. */
  private toggleRow(
    item: HTMLElement,
    row: HTMLElement,
    isOpen: boolean,
    onToggle: (open: boolean) => void,
  ): void {
    const chevron = row.createDiv({ cls: "brass-threads-chevron" });
    setIcon(chevron, "right-triangle");
    row.prepend(chevron);
    item.toggleClass("is-collapsed", !isOpen);
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.setAttribute("aria-expanded", String(isOpen));
    const set = (open: boolean): void => {
      item.toggleClass("is-collapsed", !open);
      row.setAttribute("aria-expanded", String(open));
      onToggle(open);
    };
    row.addEventListener("click", () => set(item.hasClass("is-collapsed")));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        set(item.hasClass("is-collapsed"));
      } else if (event.key === "ArrowRight") set(true);
      else if (event.key === "ArrowLeft") set(false);
    });
  }

  private renderTree(
    el: HTMLElement,
    placeholders: PlaceholderSummary[],
    file: TFile,
  ): void {
    const prefix = this.plugin.settings.variablePrefix;
    const header = el.createDiv({ cls: "brass-threads-header" });
    header.createDiv({ cls: "brass-threads-title", text: "Placeholders" });
    if (placeholders.length === 0) {
      el.createDiv({
        cls: "brass-threads-empty",
        text: `No placeholders in ${file.basename} or its project folder. Type ${prefix}name in a line to leave one.`,
      });
      return;
    }
    const list = el.createDiv({ cls: "brass-threads-list" });
    for (const placeholder of placeholders) {
      const item = list.createDiv({
        cls: "brass-threads-item brass-threads-thread",
      });
      const row = item.createDiv({
        cls: "brass-threads-self brass-threads-row",
      });
      row.createSpan({ cls: "brass-threads-name", text: placeholder.name });
      row.createSpan({
        cls: "brass-threads-count",
        text: String(placeholder.places.length),
      });
      this.toggleRow(item, row, this.expanded.has(placeholder.name), (open) => {
        if (open) this.expanded.add(placeholder.name);
        else this.expanded.delete(placeholder.name);
      });
      const children = item.createDiv({ cls: "brass-threads-children" });
      let group: HTMLElement | null = null;
      let groupPath = "";
      for (const place of placeholder.places) {
        if (group === null || groupPath !== place.path) {
          groupPath = place.path;
          const note = this.app.vault.getAbstractFileByPath(place.path);
          const count = placeholder.places.filter(
            (p) => p.path === place.path,
          ).length;
          const noteItem = children.createDiv({
            cls: "brass-threads-item brass-threads-group",
          });
          const noteRow = noteItem.createDiv({
            cls: "brass-threads-self brass-threads-note",
          });
          noteRow.createSpan({
            cls: "brass-threads-note-name",
            text: note instanceof TFile ? note.basename : place.path,
          });
          noteRow.createSpan({
            cls: "brass-threads-count",
            text: String(count),
          });
          this.toggleRow(noteItem, noteRow, true, () => {});
          group = noteItem.createDiv({ cls: "brass-threads-children" });
        }
        const placeEl = group.createDiv({
          cls: "brass-threads-place",
          text: place.line,
        });
        placeEl.setAttribute("role", "button");
        placeEl.setAttribute("tabindex", "0");
        const go = (newTab: boolean): void => {
          void this.plugin.threads.goTo(place.path, place.from, newTab);
        };
        placeEl.addEventListener("click", (event) =>
          go(event.ctrlKey || event.metaKey),
        );
        placeEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") go(false);
        });
      }
    }
  }
}
