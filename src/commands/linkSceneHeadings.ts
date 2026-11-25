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

import { Notice } from "obsidian";
import { TFile, type MarkdownView } from "obsidian";
import type BrassPlugin from "../main";
import { variablesFolder } from "../editor/projectVariables";
import {
  existingLink,
  matchingHeading,
  noteHeadings,
  outlineWithLinks,
  sceneUnits,
  scriptLinkInserts,
  type SceneUnit,
} from "../screenplay/sceneLinks";
import {
  noteFromProperty,
  pickNearbyNote,
  setPropertyInEditor,
} from "./linkedNote";

/*
 * Link scene headings across documents (#254): link each scene of the
 * script to its heading in the outline, both ways. See sceneLinks.ts. The
 * outline is the screenplay's `outline` property; the first time, it is
 * the note "<script> Outline" in the script's folder, or a dialog picks it
 * from the notes near the script when there is none. Scenes are linked
 * when an outline heading has the same text; the rest are skipped and
 * listed in a notice at the end, with no question per scene (#337).
 */

const PROPERTY = "outline";

/** "<script> Outline" in the script's folder, any capitals (#337). */
export function outlineNameFor(
  script: string,
  names: readonly string[],
): string | null {
  const wanted = `${script} outline`.toLocaleLowerCase();
  return names.find((name) => name.toLocaleLowerCase() === wanted) ?? null;
}

/** The notice for scenes with no outline heading: names, at most five. */
export function unmatchedNotice(
  names: readonly string[],
  outline: string,
): string {
  if (names.length === 0) return "";
  const shown = names.slice(0, 5).join("; ");
  const more = names.length > 5 ? `; and ${names.length - 5} more` : "";
  const count =
    names.length === 1 ? "1 scene has" : `${names.length} scenes have`;
  return `${count} no heading in ${outline}: ${shown}${more}.`;
}

export async function linkSceneHeadings(
  plugin: BrassPlugin,
  view: MarkdownView,
): Promise<void> {
  const file = view.file;
  if (file === null) return;
  const { app } = plugin;
  const editor = view.editor;

  let outline: TFile | null =
    file.extension === "md"
      ? noteFromProperty(app, file, editor.getValue(), PROPERTY)
      : null;
  if (outline === null) {
    const siblings = (file.parent?.children ?? []).filter(
      (child): child is TFile =>
        child instanceof TFile && child.extension === "md",
    );
    const name = outlineNameFor(
      file.basename,
      siblings.map((child) => child.basename),
    );
    outline = siblings.find((child) => child.basename === name) ?? null;
  }
  if (outline === null) {
    outline = await pickNearbyNote(app, file, {
      title: "Outline for this script",
      placeholder: "Pick the outline note",
      folder: variablesFolder(app, file),
    });
    if (outline === null) return;
  }
  if (noteFromProperty(app, file, editor.getValue(), PROPERTY) === null) {
    // A .fountain file has no properties: it is found or asked each time.
    if (file.extension === "md") {
      setPropertyInEditor(
        editor,
        PROPERTY,
        `[[${app.metadataCache.fileToLinktext(outline, file.path)}]]`,
      );
    }
  }

  const headings = noteHeadings((await app.vault.read(outline)).split("\n"));
  if (headings.length === 0) {
    new Notice(`${outline.basename} has no headings to link to.`);
    return;
  }
  const lines = editor.getValue().split("\n");
  const units = sceneUnits(lines);
  if (units.length === 0) {
    new Notice("No sluglines in this note.");
    return;
  }

  const outlineName = app.metadataCache.fileToLinktext(outline, file.path);
  const links = new Map<SceneUnit, string>();
  const unmatched: string[] = [];
  for (const unit of units) {
    // Already linked (by an earlier run or by hand): keep that heading.
    const match =
      existingLink(unit, lines, outlineName) ?? matchingHeading(unit, headings);
    if (match !== null) links.set(unit, match);
    else unmatched.push(unit.heading ?? unit.slug);
  }
  const missing = unmatchedNotice(unmatched, outline.basename);
  if (links.size === 0) {
    new Notice(`No scenes linked. ${missing}`, 15000);
    return;
  }

  const scriptName = app.metadataCache.fileToLinktext(file, outline.path);
  const inserts = scriptLinkInserts(
    lines,
    links,
    outlineName,
    plugin.settings.outlineLinkPlacement,
  );
  if (inserts.length > 0) {
    editor.transaction({
      changes: inserts.map((insert) => {
        const end = {
          line: insert.after,
          ch: (lines[insert.after] ?? "").length,
        };
        return { from: end, to: end, text: `\n${insert.text}` };
      }),
    });
  }
  await app.vault.process(outline, (text) =>
    outlineWithLinks(text, links, scriptName),
  );
  const scenes = links.size === 1 ? "1 scene" : `${links.size} scenes`;
  new Notice(
    `Linked ${scenes} with ${outline.basename}.${missing ? ` ${missing}` : ""}`,
    missing ? 15000 : 5000,
  );
}
