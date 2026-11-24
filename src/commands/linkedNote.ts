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

import { TFile, TFolder, normalizePath } from "obsidian";
import type { App, Editor } from "obsidian";
import { PickerModal } from "../ui/pickers";

/*
 * A note the screenplay points to in a property (`boneyard`, `outline`):
 * read it, ask for it the first time, and remember it. Shared by Move to
 * boneyard (#288) and Link scene headings (#254).
 */

/** `<script> <suffix>.md` next to the script. */
export function siblingPath(file: TFile, suffix: string): string {
  const folder = file.parent?.path ?? "";
  const name = `${file.basename} ${suffix}.md`;
  return normalizePath(
    folder === "/" || folder === "" ? name : `${folder}/${name}`,
  );
}

export async function createOrGet(app: App, path: string): Promise<TFile> {
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return existing;
  return app.vault.create(path, "");
}

/**
 * The note set in property `key`, if it exists. Read from the editor's
 * text, which is ahead of Obsidian's index right after it is set.
 */
export function noteFromProperty(
  app: App,
  file: TFile,
  text: string,
  key: string,
): TFile | null {
  const lines = text.split("\n");
  let value: unknown = null;
  if (lines[0]?.trim() === "---") {
    const pattern = new RegExp(`^${key}:\\s*(.+)$`, "u");
    for (
      let at = 1;
      at < lines.length && lines[at]?.trim() !== "---";
      at += 1
    ) {
      const match = pattern.exec(lines[at] ?? "");
      if (match) value = (match[1] ?? "").trim().replace(/^["']|["']$/gu, "");
    }
  }
  value ??= app.metadataCache.getFileCache(file)?.frontmatter?.[key];
  if (typeof value !== "string") return null;
  const link =
    value
      .replace(/^\[\[|\]\]$/gu, "")
      .split("|")[0]
      ?.trim() ?? "";
  if (link === "") return null;
  return app.metadataCache.getFirstLinkpathDest(link, file.path);
}

/**
 * Set `key: "value"` in the frontmatter through the editor (the note is
 * open there), adding the frontmatter when there is none.
 */
export function setPropertyInEditor(
  editor: Editor,
  key: string,
  value: string,
): void {
  const line = `${key}: "${value}"`;
  const lines = editor.getValue().split("\n");
  if (lines[0]?.trim() === "---") {
    const close = lines.findIndex(
      (entry, at) => at > 0 && entry.trim() === "---",
    );
    if (close > 0) {
      const existing = lines.findIndex(
        (entry, at) => at > 0 && at < close && entry.startsWith(`${key}:`),
      );
      const at = existing === -1 ? close : existing;
      editor.replaceRange(
        existing === -1 ? `${line}\n` : line,
        { line: at, ch: 0 },
        existing === -1
          ? { line: at, ch: 0 }
          : { line: at, ch: lines[at]?.length ?? 0 },
      );
      return;
    }
  }
  editor.replaceRange(`---\n${line}\n---\n\n`, { line: 0, ch: 0 });
}

/**
 * Ask for a note near the script: the notes in its folder and the folders
 * in it (Scribidian never lists the whole vault), with an optional
 * "create" item first. Resolves to null when the dialog is closed.
 */
export function pickNearbyNote(
  app: App,
  file: TFile,
  options: {
    title: string;
    placeholder: string;
    /** First item, creating this path when picked. */
    create?: { label: string; path: string };
    /** Where to start looking: the script's folder by default. */
    folder?: TFolder | null;
  },
): Promise<TFile | null> {
  const notes: TFile[] = [];
  const walk = (folder: TFolder | null): void => {
    for (const child of folder?.children ?? []) {
      if (child instanceof TFolder) walk(child);
      else if (
        child instanceof TFile &&
        child.extension === "md" &&
        child.path !== file.path
      )
        notes.push(child);
    }
  };
  walk(options.folder ?? file.parent);
  notes.sort((a, b) => a.path.localeCompare(b.path));
  const create = options.create;
  return new Promise((resolve) => {
    let chosen = false;
    const modal = new PickerModal<TFile | string>(app, {
      title: options.title,
      placeholder: options.placeholder,
      items: create ? [create.label, ...notes] : notes,
      itemText: (item) => (typeof item === "string" ? item : item.path),
      onChoose: (item) => {
        chosen = true;
        void (async () => {
          resolve(
            typeof item === "string" && create
              ? await createOrGet(app, create.path)
              : item instanceof TFile
                ? item
                : null,
          );
        })();
      },
    });
    const close = modal.onClose.bind(modal);
    modal.onClose = () => {
      close();
      // A pick resolves after onClose; give it a moment before giving up.
      window.setTimeout(() => {
        if (!chosen) resolve(null);
      }, 0);
    };
    modal.open();
  });
}

/**
 * Ask the writer to pick from `items` (with a title); null when closed.
 */
export function pickOne<T>(
  app: App,
  title: string,
  placeholder: string,
  items: readonly T[],
  itemText: (item: T) => string,
): Promise<T | null> {
  return new Promise((resolve) => {
    let chosen = false;
    const modal = new PickerModal<T>(app, {
      title,
      placeholder,
      items,
      itemText,
      onChoose: (item) => {
        chosen = true;
        resolve(item);
      },
    });
    const close = modal.onClose.bind(modal);
    modal.onClose = () => {
      close();
      window.setTimeout(() => {
        if (!chosen) resolve(null);
      }, 0);
    };
    modal.open();
  });
}
