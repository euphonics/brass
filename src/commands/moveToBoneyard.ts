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
import { boneyardSection, findBoneyard } from "../screenplay/boneyard";
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
    target = await createOrGet(app, siblingPath(file, "Boneyard"));
  } else {
    target = noteFromProperty(app, file, editor.getValue(), PROPERTY);
    if (target === null) {
      target = await pickNearbyNote(app, file, {
        title: "Boneyard note for this script",
        placeholder: "Pick a note, or create one",
        create: {
          label: `Create "${file.basename} Boneyard" next to this script`,
          path: siblingPath(file, "Boneyard"),
        },
      });
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
    app.metadataCache.fileToLinktext(file, target.path),
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
