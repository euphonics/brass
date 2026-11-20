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

import { ItemView, TFile } from "obsidian";
import type { IconName, WorkspaceLeaf } from "obsidian";
import type ScribidianPlugin from "../main";
import {
  orderedPlaces,
  stripThreads,
  type ThreadPlace,
} from "../screenplay/threads";

export const THREADS_VIEW_TYPE = "scribidian-threads";

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

/**
 * The Threads sidebar: every thread the current note can reach (its
 * project's parts, character pages and linked notes), and for one thread
 * every place, grouped by note in script order, with the line's text.
 * Like Obsidian's tag search, for `[&name]`.
 */
export class ThreadsView extends ItemView {
  private selected: string | null = null;
  private generation = 0;
  private shown = "";

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: ScribidianPlugin,
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
    this.contentEl.addClass("scribidian-threads");
    this.refresh();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  /** Show one thread (by its key), or all threads with null. */
  select(key: string | null): void {
    this.selected = key;
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
          cls: "scribidian-threads-empty",
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
    const thread =
      this.selected === null
        ? null
        : (threads.find((found) => found.key === this.selected) ?? null);
    // Only redraw when something changed, so the list doesn't flicker
    // while you type or move the cursor.
    const signature = JSON.stringify([
      file.path,
      this.selected,
      thread
        ? thread.places.map((place) => [
            place.path,
            place.from,
            lineAround(texts.get(place.path) ?? "", place.from),
          ])
        : threads.map((found) => [found.key, found.places.length]),
    ]);
    if (signature === this.shown) return;
    if (thread === null) {
      this.show(signature, (el) => this.renderAll(el, threads, file));
    } else {
      this.show(signature, (el) => this.renderThread(el, thread, texts));
    }
  }

  private show(signature: string, draw: (el: HTMLElement) => void): void {
    this.shown = signature;
    this.contentEl.empty();
    draw(this.contentEl);
  }

  private renderAll(
    el: HTMLElement,
    threads: ThreadSummary[],
    file: TFile,
  ): void {
    el.createDiv({ cls: "scribidian-threads-title", text: "Threads" });
    if (threads.length === 0) {
      el.createDiv({
        cls: "scribidian-threads-empty",
        text: `No threads in ${file.basename} or the notes linked to it. Add one with [&name] at the end of a line.`,
      });
      return;
    }
    const list = el.createDiv({ cls: "scribidian-threads-list" });
    for (const thread of threads) {
      const row = list.createDiv({ cls: "scribidian-threads-row" });
      row.createSpan({
        cls: "scribidian-threads-name",
        text: `🧵 ${thread.name}`,
      });
      row.createSpan({
        cls: "scribidian-threads-count",
        text: String(thread.places.length),
      });
      if (thread.places.length === 1) {
        row.createSpan({
          cls: "scribidian-threads-once",
          text: "Used once",
        });
      }
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.addEventListener("click", () => this.select(thread.key));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter") this.select(thread.key);
      });
    }
  }

  private renderThread(
    el: HTMLElement,
    thread: ThreadSummary,
    texts: Map<string, string>,
  ): void {
    const back = el.createDiv({
      cls: "scribidian-threads-back",
      text: "← All threads",
    });
    back.setAttribute("role", "button");
    back.setAttribute("tabindex", "0");
    back.addEventListener("click", () => this.select(null));
    el.createDiv({
      cls: "scribidian-threads-title",
      text: `🧵 ${thread.name}`,
    });
    el.createDiv({
      cls: "scribidian-threads-summary",
      text:
        thread.places.length === 1
          ? "Used once: nothing else in this thread yet."
          : `${thread.places.length} places`,
    });
    let path = "";
    let group: HTMLElement | null = null;
    for (const place of thread.places) {
      if (place.path !== path || group === null) {
        path = place.path;
        const note = this.app.vault.getAbstractFileByPath(path);
        group = el.createDiv({ cls: "scribidian-threads-group" });
        group.createDiv({
          cls: "scribidian-threads-note",
          text: note instanceof TFile ? note.basename : path,
        });
      }
      const line = lineAround(texts.get(place.path) ?? "", place.from);
      const item = group.createDiv({
        cls: "scribidian-threads-place",
        text: line === "" ? "(on its own line)" : line,
      });
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      const go = (newTab: boolean): void => {
        void this.plugin.threads.goTo(place.path, place.to, newTab);
      };
      item.addEventListener("click", (event) =>
        go(event.ctrlKey || event.metaKey),
      );
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter") go(false);
      });
    }
  }
}
