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

import { Notice, TFile, TFolder, moment, normalizePath } from "obsidian";

/** Obsidian's bundled moment, called as a function. */
const now = (): { format: (pattern: string) => string } =>
  (moment as unknown as () => { format: (pattern: string) => string })();
import type { App, Editor, MarkdownView } from "obsidian";
import type ScribidianPlugin from "../main";
import { boneyardSection, findBoneyard } from "../screenplay/boneyard";
import { PickerModal } from "../ui/pickers";

/*
 * Move to boneyard (#288): every `/* ... *\/` block in the note goes to its
 * boneyard note, under a dated heading per scene, and leaves the script.
 * The boneyard note is the screenplay's `boneyard` property; the first
 * time, a dialog picks a note or creates "<script> Boneyard" next to it.
 * A .fountain file has no properties, so it always uses that default.
 */

const PROPERTY = "boneyard";

/** Today as a link to the daily note when Daily notes is on, else text. */
function today(app: App): string {
  const label = now().format("MMMM DD, YYYY");
  const daily = (
    app as unknown as {
      internalPlugins?: {
        getPluginById?: (id: string) => {
          enabled?: boolean;
          instance?: { options?: { format?: string } };
        } | null;
      };
    }
  ).internalPlugins?.getPluginById?.("daily-notes");
  if (!daily?.enabled) return label;
  const format = daily.instance?.options?.format || "YYYY-MM-DD";
  return `[[${now().format(format)}|${label}]]`;
}

function defaultPath(file: TFile): string {
  const folder = file.parent?.path ?? "";
  const name = `${file.basename} Boneyard.md`;
  return normalizePath(
    folder === "/" || folder === "" ? name : `${folder}/${name}`,
  );
}

/**
 * The boneyard note set in the screenplay's property, if it exists. Read
 * from the editor's text, which is ahead of Obsidian's index right after
 * the property is set.
 */
function boneyardFromProperty(
  app: App,
  file: TFile,
  text: string,
): TFile | null {
  const lines = text.split("\n");
  let value: unknown = null;
  if (lines[0]?.trim() === "---") {
    for (
      let at = 1;
      at < lines.length && lines[at]?.trim() !== "---";
      at += 1
    ) {
      const match = new RegExp(`^${PROPERTY}:\\s*(.+)$`, "u").exec(
        lines[at] ?? "",
      );
      if (match) value = (match[1] ?? "").trim().replace(/^["']|["']$/gu, "");
    }
  }
  value ??= app.metadataCache.getFileCache(file)?.frontmatter?.[PROPERTY];
  if (typeof value !== "string") return null;
  const link =
    value
      .replace(/^\[\[|\]\]$/gu, "")
      .split("|")[0]
      ?.trim() ?? "";
  if (link === "") return null;
  return app.metadataCache.getFirstLinkpathDest(link, file.path);
}

async function createOrGet(app: App, path: string): Promise<TFile> {
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return existing;
  return app.vault.create(path, "");
}

/**
 * Set `key: "value"` in the frontmatter through the editor (the note is
 * open there), adding the frontmatter when there is none.
 */
function setPropertyInEditor(editor: Editor, key: string, value: string): void {
  const line = `${key}: "${value}"`;
  const text = editor.getValue();
  const lines = text.split("\n");
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

/** Ask which note is the boneyard (the caller remembers it). */
function pickBoneyard(app: App, file: TFile): Promise<TFile | null> {
  const create = `Create "${file.basename} Boneyard" next to this script`;
  // Only the notes next to the script (its folder and the folders in it):
  // Scribidian never lists the whole vault.
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
  walk(file.parent);
  notes.sort((a, b) => a.path.localeCompare(b.path));
  return new Promise((resolve) => {
    let chosen = false;
    const modal = new PickerModal<TFile | string>(app, {
      title: "Boneyard note for this script",
      placeholder: "Pick a note, or create one",
      items: [create, ...notes],
      itemText: (item) => (typeof item === "string" ? item : item.path),
      onChoose: (item) => {
        chosen = true;
        void (async () => {
          const target =
            typeof item === "string"
              ? await createOrGet(app, defaultPath(file))
              : item;
          resolve(target);
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

export async function moveToBoneyard(
  plugin: ScribidianPlugin,
  view: MarkdownView,
): Promise<void> {
  const file = view.file;
  if (file === null) return;
  const editor: Editor = view.editor;
  if (findBoneyard(editor.getValue()).blocks.length === 0) {
    new Notice("No /* boneyard */ text in this note.");
    return;
  }
  const app = plugin.app;
  let target: TFile | null;
  if (file.extension !== "md") {
    target = await createOrGet(app, defaultPath(file));
  } else {
    target = boneyardFromProperty(app, file, editor.getValue());
    if (target === null) {
      target = await pickBoneyard(app, file);
      if (target === null) return;
      // Remember it, through the editor so the text stays in step.
      setPropertyInEditor(
        editor,
        PROPERTY,
        `[[${app.metadataCache.fileToLinktext(target, file.path)}]]`,
      );
    }
  }
  if (target === null) return;
  // Read the note again now: setting the property moved the text.
  const { blocks, edits } = findBoneyard(editor.getValue());
  if (blocks.length === 0) return;

  const section = boneyardSection(
    blocks,
    today(app),
    `[[${app.metadataCache.fileToLinktext(file, target.path)}]]`,
  );
  await app.vault.process(target, (text) =>
    text.trim() === "" ? section : `${text.trimEnd()}\n\n${section}`,
  );
  // Take the blocks out of the script in one step, so one Undo puts them
  // back (the boneyard note keeps its copy).
  editor.transaction({
    changes: edits.map((edit) => ({
      from: editor.offsetToPos(edit.from),
      to: editor.offsetToPos(edit.to),
      text: edit.insert,
    })),
  });
  const count = blocks.length === 1 ? "1 block" : `${blocks.length} blocks`;
  new Notice(`Moved ${count} to ${target.basename}.`);
}
