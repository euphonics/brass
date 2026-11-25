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

import {
  EditorSuggest,
  MarkdownView,
  Notice,
  TFile,
  editorInfoField,
  type App,
  type Editor,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
} from "obsidian";
import { EditorView } from "@codemirror/view";
import type ScribidianPlugin from "../main";
import { projectForFile } from "../projects/vault";
import { resolveCharacterFolder } from "../projects/model";
import { characterPagesForScope } from "../characters/vault";
import {
  findThreads,
  orderedPlaces,
  stepPlace,
  type ThreadMark,
} from "../screenplay/threads";

/**
 * The notes a thread can reach from `file`, without searching the vault:
 * the screenplay project's note and parts (or the note alone), its
 * character pages, and every note linked to or from those (an outline that
 * links the script). A note outside any project (an outline) reaches the
 * projects of the screenplays it links to, or that link to it.
 * `firstPaths` are the project's parts, which come first when cycling.
 */
export function threadScope(
  plugin: ScribidianPlugin,
  file: TFile,
): { files: TFile[]; firstPaths: string[] } {
  const { app } = plugin;
  const files = new Map<string, TFile>([[file.path, file]]);
  const add = (target: TFile | null): void => {
    if (target === null) return;
    if (target.extension !== "md" && target.extension !== "fountain") return;
    files.set(target.path, target);
  };
  const byPath = (path: string): TFile | null => {
    const found = app.vault.getAbstractFileByPath(path);
    return found instanceof TFile ? found : null;
  };
  // Links in Obsidian's own index: notes `of` links to, and notes linking to it.
  const links = app.metadataCache.resolvedLinks;
  const linked = (of: TFile): TFile[] => {
    const out = Object.keys(links[of.path] ?? {}).map(byPath);
    for (const [source, targets] of Object.entries(links)) {
      if (of.path in targets) out.push(byPath(source));
    }
    return out.filter((found): found is TFile => found !== null);
  };

  const projects = [projectForFile(app, file)];
  if (projects[0] === null) {
    for (const near of linked(file)) projects.push(projectForFile(app, near));
  }
  let firstPaths: string[] = [];
  const cores: TFile[] = [file];
  for (const project of projects) {
    if (project === null) continue;
    const parts = project.parts.flatMap((part) =>
      part.file ? [part.file] : [],
    );
    if (firstPaths.length === 0) firstPaths = parts.map((part) => part.path);
    cores.push(project.file, ...parts);
    const folder = resolveCharacterFolder(
      project.file.path,
      project.project.characterFolder ?? plugin.settings.characterFolder,
    );
    for (const page of characterPagesForScope(app, folder, [
      project.file,
      ...parts,
    ])) {
      add(byPath(page.path));
    }
  }
  if (firstPaths.length === 0) firstPaths = [file.path];
  for (const core of cores) {
    add(core);
    for (const near of linked(core)) add(near);
  }
  return { files: [...files.values()], firstPaths };
}

/** The threads in each reachable note, read when asked and cached. */
export class ThreadIndex {
  private cache = new Map<
    string,
    { mtime: number; marks: ThreadMark[]; text: string }
  >();

  constructor(private readonly plugin: ScribidianPlugin) {}

  private async read(
    file: TFile,
  ): Promise<{ marks: ThreadMark[]; text: string }> {
    const cached = this.cache.get(file.path);
    if (cached && cached.mtime === file.stat.mtime) return cached;
    const text = await this.plugin.app.vault.cachedRead(file);
    const entry = { mtime: file.stat.mtime, marks: findThreads(text), text };
    this.cache.set(file.path, entry);
    return entry;
  }

  /**
   * The places in each note `file` can reach, using `liveText` (its unsaved
   * text) for `file` itself, and the paths that come first when cycling.
   */
  async places(
    file: TFile,
    liveText: string,
  ): Promise<{
    places: Map<string, ThreadMark[]>;
    firstPaths: string[];
    texts: Map<string, string>;
  }> {
    const { files, firstPaths } = threadScope(this.plugin, file);
    const places = new Map<string, ThreadMark[]>();
    const texts = new Map<string, string>();
    await Promise.all(
      files.map(async (other) => {
        const { marks, text } =
          other.path === file.path
            ? { marks: findThreads(liveText), text: liveText }
            : await this.read(other);
        if (marks.length > 0) {
          places.set(other.path, marks);
          texts.set(other.path, text);
        }
      }),
    );
    return { places, firstPaths, texts };
  }

  /** Every thread name `file` can reach, with how often it's used. */
  async names(
    file: TFile,
    liveText: string,
  ): Promise<{ name: string; count: number }[]> {
    const { places } = await this.places(file, liveText);
    const counts = new Map<string, { name: string; count: number }>();
    for (const marks of places.values()) {
      for (const mark of marks) {
        const entry = counts.get(mark.key);
        if (entry) entry.count += 1;
        else counts.set(mark.key, { name: mark.name, count: 1 });
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }
}

export class ThreadNavigator {
  readonly index: ThreadIndex;

  constructor(readonly plugin: ScribidianPlugin) {
    this.index = new ThreadIndex(plugin);
  }

  /** Go from the place `mark` (in `view`'s note) to the next one in its thread. */
  async open(
    view: EditorView,
    mark: ThreadMark,
    step: 1 | -1,
    newTab: boolean,
    across = false,
  ): Promise<void> {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null) return;
    // Plain click: the places in this note only (a thread in a script has a
    // handful). Across notes: the project's parts, character pages and
    // linked notes too.
    const { places, firstPaths } = across
      ? await this.index.places(file, view.state.doc.toString())
      : {
          places: new Map([
            [file.path, findThreads(view.state.doc.toString())],
          ]),
          firstPaths: [file.path],
        };
    const ordered = orderedPlaces(places, mark.key, firstPaths);
    const target = stepPlace(
      ordered,
      { path: file.path, from: mark.from },
      step,
    );
    if (target === null) {
      new Notice(
        across
          ? `🧵 ${mark.name}: this is the only place in this thread.`
          : `🧵 ${mark.name}: the only place in this note. Alt+click to look in the project and linked notes.`,
      );
      return;
    }
    if (target.path === file.path && !newTab) {
      view.dispatch({
        selection: { anchor: target.to },
        effects: EditorView.scrollIntoView(target.to, { y: "center" }),
      });
      view.focus();
      return;
    }
    await this.goTo(target.path, target.to, newTab);
  }

  /**
   * From a thread in rendered Markdown (#323): the `nth` thread named
   * `key` at or after line `line` of the note at `path`, then the next
   * place along its thread (Shift: the previous; across: other notes).
   */
  async openRendered(
    path: string,
    line: number,
    key: string,
    nth: number,
    step: 1 | -1,
    across: boolean,
  ): Promise<void> {
    const { vault, workspace } = this.plugin.app;
    const file = vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const open = workspace
      .getLeavesOfType("markdown")
      .map((leaf) => leaf.view)
      .find(
        (view): view is MarkdownView =>
          view instanceof MarkdownView && view.file?.path === path,
      );
    const text = open?.editor.getValue() ?? (await vault.cachedRead(file));
    let start = 0;
    for (let index = 0; index < line; index += 1) {
      const next = text.indexOf("\n", start);
      if (next === -1) break;
      start = next + 1;
    }
    const all = findThreads(text).filter((mark) => mark.key === key);
    const after = all.filter((mark) => mark.from >= start);
    const mark = after[nth] ?? after[0] ?? all[0];
    if (mark === undefined) return;
    const { places, firstPaths } = across
      ? await this.index.places(file, text)
      : { places: new Map([[file.path, all]]), firstPaths: [file.path] };
    const target = stepPlace(
      orderedPlaces(places, key, firstPaths),
      { path: file.path, from: mark.from },
      step,
    );
    if (target === null) {
      new Notice(
        across
          ? `🧵 ${mark.name}: this is the only place in this thread.`
          : `🧵 ${mark.name}: the only place in this note. Alt+click to look in the project and linked notes.`,
      );
      return;
    }
    await this.goTo(target.path, target.to);
  }

  /**
   * Open `path` (in the note's open tab if it has one, else this tab or a
   * new one) with the cursor at `offset`, scrolled into view.
   */
  async goTo(path: string, offset: number, newTab = false): Promise<void> {
    const { workspace, vault } = this.plugin.app;
    const file = vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const open = newTab
      ? undefined
      : workspace
          .getLeavesOfType("markdown")
          .find(
            (leaf) =>
              leaf.view instanceof MarkdownView &&
              leaf.view.file?.path === path,
          );
    const leaf = open ?? workspace.getLeaf(newTab ? "tab" : false);
    if (open) workspace.setActiveLeaf(open, { focus: true });
    else await leaf.openFile(file);
    const opened = leaf.view;
    if (!(opened instanceof MarkdownView)) return;
    const editor = opened.editor;
    const pos = editor.offsetToPos(offset);
    editor.setCursor(pos);
    editor.scrollIntoView({ from: pos, to: pos }, true);
    editor.focus();
  }

  /**
   * The thread the cursor is on, in, or right next to (`|[&x]`, `[&x|]`,
   * `[&x]|`), or null.
   */
  markAtCursor(view: EditorView): ThreadMark | null {
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return null;
    const head = selection.main.head;
    const line = doc.lineAt(head);
    for (const mark of findThreads(line.text)) {
      const from = line.from + mark.from;
      const to = line.from + mark.to;
      if (head >= from && head <= to) return { ...mark, from, to };
    }
    return null;
  }

  /** The key of the thread on the cursor's line nearest the cursor. */
  keyAtCursor(editor: Editor): string | null {
    const cursor = editor.getCursor("head");
    const marks = findThreads(editor.getLine(cursor.line));
    if (marks.length === 0) return null;
    const nearest = marks.reduce((best, mark) =>
      Math.abs(mark.from - cursor.ch) < Math.abs(best.from - cursor.ch)
        ? mark
        : best,
    );
    return nearest.key;
  }

  /** The command: the thread on the cursor's line nearest the cursor. */
  openFromCursor(editor: Editor, step: 1 | -1, across = false): boolean {
    const view = (editor as { cm?: unknown }).cm;
    if (!(view instanceof EditorView)) return false;
    const head = view.state.selection.main.head;
    const line = view.state.doc.lineAt(head);
    const marks = findThreads(line.text).map((mark) => ({
      ...mark,
      from: mark.from + line.from,
      to: mark.to + line.from,
    }));
    if (marks.length === 0) {
      new Notice("No thread on this line. Threads look like [&name].");
      return true;
    }
    const nearest = marks.reduce((best, mark) =>
      Math.abs(mark.from - head) < Math.abs(best.from - head) ? mark : best,
    );
    void this.open(view, nearest, step, false, across);
    return true;
  }
}

/**
 * Put `suggest` first in Obsidian's list of editor suggesters. Only one
 * suggestion popup shows at a time, and the first suggester that claims a
 * keystroke wins: a word-completion plugin (Completr) listed earlier took
 * over as soon as a letter was typed after `[&`, closing the thread list
 * (#283). The thread list only claims text right after `[&`, so other
 * plugins keep every other keystroke. Uses Obsidian's internal
 * `workspace.editorSuggest.suggests`; does nothing if that's missing.
 */
export function putSuggestFirst(app: App, suggest: unknown): void {
  const manager = (
    app.workspace as unknown as { editorSuggest?: { suggests?: unknown } }
  ).editorSuggest;
  const list = manager?.suggests;
  if (!Array.isArray(list)) return;
  const at = list.indexOf(suggest);
  if (at > 0) {
    list.splice(at, 1);
    list.unshift(suggest);
  }
}

/** Typing `[&` lists the thread names already used, most used first. */
export class ThreadSuggest extends EditorSuggest<{
  name: string;
  count: number;
}> {
  constructor(private readonly navigator: ThreadNavigator) {
    super(navigator.plugin.app);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
  ): EditorSuggestTriggerInfo | null {
    if (!this.navigator.plugin.settings.threadsEnabled) return null;
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const match = /\[&([^\]\n]*)$/u.exec(before);
    if (!match) return null;
    return {
      start: { line: cursor.line, ch: match.index + 2 },
      end: cursor,
      query: match[1] ?? "",
    };
  }

  async getSuggestions(
    context: EditorSuggestContext,
  ): Promise<{ name: string; count: number }[]> {
    if (!context.file) return [];
    const query = context.query.trim().toLocaleLowerCase();
    // Leave out the thread being typed, so "[&f" doesn't list "f" itself.
    const { editor, start, end } = context;
    const text = editor.getValue();
    const from = editor.posToOffset(start) - 2;
    let to = editor.posToOffset(end);
    if (text.charAt(to) === "]") to += 1;
    const names = await this.navigator.index.names(
      context.file,
      text.slice(0, Math.max(0, from)) + text.slice(to),
    );
    return names
      .filter((entry) => entry.name.toLocaleLowerCase().includes(query))
      .slice(0, 20);
  }

  renderSuggestion(
    value: { name: string; count: number },
    el: HTMLElement,
  ): void {
    el.createSpan({ text: `🧵 ${value.name}` });
    el.createSpan({
      cls: "scribidian-thread-count",
      text: ` ${value.count}`,
    });
  }

  selectSuggestion(value: { name: string; count: number }): void {
    const context = this.context;
    if (!context) return;
    const { editor, start, end } = context;
    // Replace a "]" already after the cursor rather than doubling it.
    const after = editor.getLine(end.line).slice(end.ch);
    const close = after.startsWith("]") ? 1 : 0;
    editor.replaceRange(`${value.name}]`, start, {
      line: end.line,
      ch: end.ch + close,
    });
    editor.setCursor({
      line: start.line,
      ch: start.ch + value.name.length + 1,
    });
  }
}
