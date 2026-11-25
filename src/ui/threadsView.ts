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

import { ItemView, TFile, setIcon } from "obsidian";
import type { IconName, WorkspaceLeaf } from "obsidian";
import type BrassPlugin from "../main";
import {
  orderedPlaces,
  stripThreads,
  type ThreadPlace,
} from "../screenplay/threads";

export const THREADS_VIEW_TYPE = "brass-threads";

/** A thread as the panel lists it. */
interface ThreadSummary {
  key: string;
  name: string;
  places: ThreadPlace[];
}

/** The text of the line holding `offset`, without its threads. */
function lineAround(text: string, offset: number): string {
  const start = text.lastIndexOf("\n", offset - 1) + 1;
  const endAt = text.indexOf("\n", offset);
  const line = text.slice(start, endAt === -1 ? text.length : endAt);
  return stripThreads(line).trim();
}

/** Places of one thread, grouped by note in script order. */
function groupByNote(
  places: readonly ThreadPlace[],
): { path: string; places: ThreadPlace[] }[] {
  const groups: { path: string; places: ThreadPlace[] }[] = [];
  for (const place of places) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.path === place.path) {
      last.places.push(place);
    } else {
      groups.push({ path: place.path, places: [place] });
    }
  }
  return groups;
}

/**
 * The Threads sidebar: every thread the current note can reach (its
 * project's parts, character pages and linked notes), as a tree like
 * Obsidian's search results. Each thread is a heading that expands to its
 * notes, and each note to its lines, in script order. Click a line to go
 * there. Like Obsidian's tag search, for `[&name]`.
 */
export class ThreadsView extends ItemView {
  /** The thread last picked in the editor (highlighted, kept open). */
  private selected: string | null = null;
  /** Thread keys shown open. */
  private readonly expanded = new Set<string>();
  /** Note groups shown closed, as "threadKey\npath". */
  private readonly closedNotes = new Set<string>();
  private generation = 0;
  private shown = "";
  /** Every thread key in the last drawing (for Expand all). */
  private keys: string[] = [];

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: BrassPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return THREADS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Threads";
  }

  getIcon(): IconName {
    return "spool";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("brass-threads");
    this.refresh();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  /**
   * Open one thread (by its key) and scroll to it, or with null just
   * clear the highlight. Other threads stay as they were.
   */
  select(key: string | null): void {
    this.selected = key;
    if (key !== null) this.expanded.add(key);
    this.shown = "";
    this.refresh();
  }

  refresh(): void {
    const generation = ++this.generation;
    void this.render(() => generation === this.generation);
  }

  private async render(current: () => boolean): Promise<void> {
    const view = this.plugin.activeMarkdownView();
    const file = view?.file ?? null;
    if (view === null || !(file instanceof TFile)) {
      this.show("none", (el) => {
        el.createDiv({
          cls: "brass-threads-empty",
          text: "Open a note to see its threads.",
        });
      });
      return;
    }
    const { places, firstPaths, texts } =
      await this.plugin.threads.index.places(file, view.editor.getValue());
    if (!current()) return;
    const keys = new Map<string, string>();
    for (const marks of places.values()) {
      for (const mark of marks)
        if (!keys.has(mark.key)) keys.set(mark.key, mark.name);
    }
    const threads: ThreadSummary[] = [...keys].map(([key, name]) => ({
      key,
      name,
      places: orderedPlaces(places, key, firstPaths),
    }));
    threads.sort(
      (a, b) =>
        b.places.length - a.places.length || a.name.localeCompare(b.name),
    );
    const lines = threads.map((thread) =>
      thread.places.map((place) =>
        lineAround(texts.get(place.path) ?? "", place.from),
      ),
    );
    // Only redraw when something changed, so the list doesn't flicker
    // while you type or move the cursor. Opening and closing don't redraw.
    const signature = JSON.stringify([
      file.path,
      this.selected,
      threads.map((thread, at) => [
        thread.key,
        thread.places.map((place, line) => [
          place.path,
          place.from,
          lines[at]?.[line],
        ]),
      ]),
    ]);
    if (signature === this.shown) return;
    this.keys = threads.map((thread) => thread.key);
    this.show(signature, (el) => this.renderTree(el, threads, lines, file));
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
    const chevron = row.createDiv({
      cls: "brass-threads-chevron",
    });
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
      } else if (event.key === "ArrowRight") {
        set(true);
      } else if (event.key === "ArrowLeft") {
        set(false);
      }
    });
  }

  private renderTree(
    el: HTMLElement,
    threads: ThreadSummary[],
    lines: string[][],
    file: TFile,
  ): void {
    const header = el.createDiv({ cls: "brass-threads-header" });
    header.createDiv({ cls: "brass-threads-title", text: "Threads" });
    if (threads.length === 0) {
      el.createDiv({
        cls: "brass-threads-empty",
        text: `No threads in ${file.basename} or the notes linked to it. Add one with [&name] at the end of a line.`,
      });
      return;
    }
    const buttons = header.createDiv({ cls: "brass-threads-buttons" });
    const button = (icon: string, label: string, open: boolean): void => {
      const control = buttons.createDiv({
        cls: "clickable-icon brass-threads-button",
        attr: { "aria-label": label, role: "button", tabindex: "0" },
      });
      setIcon(control, icon);
      const run = (): void => {
        if (open) for (const key of this.keys) this.expanded.add(key);
        else this.expanded.clear();
        this.closedNotes.clear();
        for (const item of Array.from(
          el.querySelectorAll<HTMLElement>(".brass-threads-item"),
        )) {
          item.toggleClass("is-collapsed", !open);
          item
            .querySelector(":scope > .brass-threads-self")
            ?.setAttribute("aria-expanded", String(open));
        }
      };
      control.addEventListener("click", run);
      control.addEventListener("keydown", (event) => {
        if (event.key === "Enter") run();
      });
    };
    button("chevrons-up-down", "Expand all", true);
    button("chevrons-down-up", "Collapse all", false);

    const list = el.createDiv({ cls: "brass-threads-list" });
    let selectedRow: HTMLElement | null = null;
    threads.forEach((thread, at) => {
      const item = list.createDiv({
        cls: "brass-threads-item brass-threads-thread",
      });
      const row = item.createDiv({
        cls: "brass-threads-self brass-threads-row",
      });
      if (thread.key === this.selected) {
        row.addClass("is-active");
        selectedRow = row;
      }
      row.createSpan({
        cls: "brass-threads-name",
        text: `🧵 ${thread.name}`,
      });
      if (thread.places.length === 1) {
        row.createSpan({
          cls: "brass-threads-once",
          text: "Used once",
        });
      }
      row.createSpan({
        cls: "brass-threads-count",
        text: String(thread.places.length),
      });
      this.toggleRow(item, row, this.expanded.has(thread.key), (open) => {
        if (open) this.expanded.add(thread.key);
        else this.expanded.delete(thread.key);
      });
      const children = item.createDiv({
        cls: "brass-threads-children",
      });
      let index = 0;
      for (const group of groupByNote(thread.places)) {
        const noteKey = `${thread.key}\n${group.path}`;
        const noteItem = children.createDiv({
          cls: "brass-threads-item brass-threads-group",
        });
        const noteRow = noteItem.createDiv({
          cls: "brass-threads-self brass-threads-note",
        });
        const note = this.app.vault.getAbstractFileByPath(group.path);
        noteRow.createSpan({
          cls: "brass-threads-note-name",
          text: note instanceof TFile ? note.basename : group.path,
        });
        noteRow.createSpan({
          cls: "brass-threads-count",
          text: String(group.places.length),
        });
        this.toggleRow(
          noteItem,
          noteRow,
          !this.closedNotes.has(noteKey),
          (open) => {
            if (open) this.closedNotes.delete(noteKey);
            else this.closedNotes.add(noteKey);
          },
        );
        const placesEl = noteItem.createDiv({
          cls: "brass-threads-children",
        });
        for (const place of group.places) {
          const line = lines[at]?.[index] ?? "";
          index += 1;
          const placeEl = placesEl.createDiv({
            cls: "brass-threads-place",
            text: line === "" ? "(on its own line)" : line,
          });
          placeEl.setAttribute("role", "button");
          placeEl.setAttribute("tabindex", "0");
          const go = (newTab: boolean): void => {
            void this.plugin.threads.goTo(place.path, place.to, newTab);
          };
          placeEl.addEventListener("click", (event) =>
            go(event.ctrlKey || event.metaKey),
          );
          placeEl.addEventListener("keydown", (event) => {
            if (event.key === "Enter") go(false);
          });
        }
      }
    });
    (selectedRow as HTMLElement | null)?.scrollIntoView({ block: "nearest" });
  }
}
