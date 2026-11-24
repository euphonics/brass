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

import { Notice, moment } from "obsidian";

/** Obsidian's bundled moment, called as a function. */
const now = (): { format: (pattern: string) => string } =>
  (moment as unknown as () => { format: (pattern: string) => string })();
import type { App, Editor, MarkdownView, TFile } from "obsidian";
import type ScribidianPlugin from "../main";
import {
  boneyardSection,
  findBoneyard,
  toggleBoneyardMarkers,
} from "../screenplay/boneyard";
import {
  createOrGet,
  noteFromProperty,
  pickNearbyNote,
  setPropertyInEditor,
  siblingPath,
} from "./linkedNote";

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

/**
 * The screenplay's boneyard note: its `boneyard` property, or asked the
 * first time (and remembered through the editor). A .fountain file uses
 * "<script> Boneyard" next to it.
 */
async function boneyardTarget(
  plugin: ScribidianPlugin,
  file: TFile,
  editor: Editor,
): Promise<TFile | null> {
  const app = plugin.app;
  if (file.extension !== "md") {
    return createOrGet(app, siblingPath(file, "Boneyard"));
  }
  const set = noteFromProperty(app, file, editor.getValue(), PROPERTY);
  if (set !== null) return set;
  const target = await pickNearbyNote(app, file, {
    title: "Boneyard note for this script",
    placeholder: "Pick a note, or create one",
    create: {
      label: `Create "${file.basename} Boneyard" next to this script`,
      path: siblingPath(file, "Boneyard"),
    },
  });
  if (target === null) return null;
  // Remember it, through the editor so the text stays in step.
  setPropertyInEditor(
    editor,
    PROPERTY,
    `[[${app.metadataCache.fileToLinktext(target, file.path)}]]`,
  );
  return target;
}

/** Add `blocks` to the boneyard note and take `edits` out of the script. */
async function moveBlocks(
  plugin: ScribidianPlugin,
  file: TFile,
  editor: Editor,
  target: TFile,
  { blocks, edits }: ReturnType<typeof findBoneyard>,
): Promise<void> {
  const app = plugin.app;
  const section = boneyardSection(
    blocks,
    today(app),
    app.metadataCache.fileToLinktext(file, target.path),
  );
  await app.vault.process(target, (text) =>
    text.trim() === "" ? section : `${text.trimEnd()}\n\n${section}`,
  );
  // Take the text out of the script in one step, so one Undo puts it
  // back (the boneyard note keeps its copy).
  editor.transaction({
    changes: edits.map((edit) => ({
      from: editor.offsetToPos(edit.from),
      to: editor.offsetToPos(edit.to),
      text: edit.insert,
    })),
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
  const target = await boneyardTarget(plugin, file, editor);
  if (target === null) return;
  // Read the note again now: setting the property moved the text.
  const found = findBoneyard(editor.getValue());
  if (found.blocks.length === 0) return;
  await moveBlocks(plugin, file, editor, target, found);
  const count =
    found.blocks.length === 1 ? "1 block" : `${found.blocks.length} blocks`;
  new Notice(`Moved ${count} to ${target.basename}.`);
}

/**
 * Move the selected text to the boneyard note (#294), with or without
 * boneyard markers around it.
 */
export async function moveSelectionToBoneyard(
  plugin: ScribidianPlugin,
  view: MarkdownView,
): Promise<void> {
  const file = view.file;
  if (file === null) return;
  const editor: Editor = view.editor;
  if (editor.getSelection().trim() === "") {
    new Notice("Select the text to move to the boneyard.");
    return;
  }
  const target = await boneyardTarget(plugin, file, editor);
  if (target === null) return;
  // The selection after the property was set (the editor keeps it mapped).
  const from = editor.posToOffset(editor.getCursor("from"));
  const to = editor.posToOffset(editor.getCursor("to"));
  const found = findBoneyard(editor.getValue(), { from, to });
  if (found.blocks.length === 0) return;
  await moveBlocks(plugin, file, editor, target, found);
  new Notice(`Moved the selection to ${target.basename}.`);
}

/**
 * Wrap the selection in boneyard markers, or take them off (#294). With
 * nothing selected, the line the cursor is on.
 */
export function wrapSelectionInBoneyard(editor: Editor): void {
  let from = editor.getCursor("from");
  let to = editor.getCursor("to");
  if (from.line === to.line && from.ch === to.ch) {
    from = { line: from.line, ch: 0 };
    to = { line: to.line, ch: editor.getLine(to.line).length };
  }
  const selected = editor.getRange(from, to);
  if (selected.trim() === "") return;
  const wholeLines =
    from.ch === 0 &&
    (to.ch === editor.getLine(to.line).length || to.ch === 0) &&
    (from.line !== to.line || selected === editor.getLine(from.line));
  const text = toggleBoneyardMarkers(selected, wholeLines);
  editor.replaceRange(text, from, to);
  const end = editor.offsetToPos(editor.posToOffset(from) + text.length);
  editor.setSelection(from, end);
}
