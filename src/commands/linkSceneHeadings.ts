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
import type { MarkdownView, TFile } from "obsidian";
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
  pickOne,
  setPropertyInEditor,
} from "./linkedNote";

/*
 * Link scene headings across documents (#254): link each scene of the
 * script to its heading in the outline, both ways. See sceneLinks.ts. The
 * outline is the screenplay's `outline` property; the first time, a dialog
 * picks it from the notes near the script. Scenes with no outline heading
 * of the same name ask which heading to use (or to skip them).
 */

const PROPERTY = "outline";
const SKIP = "Skip this scene";
const SKIP_ALL = "Skip this and every other scene without a match";

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
    outline = await pickNearbyNote(app, file, {
      title: "Outline for this script",
      placeholder: "Pick the outline note",
      folder: variablesFolder(app, file),
    });
    if (outline === null) return;
    // A .fountain file has no properties: it is asked each time.
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
  let skipRest = false;
  for (const unit of units) {
    // Already linked (by an earlier run or by hand): keep that heading.
    const match =
      existingLink(unit, lines, outlineName) ?? matchingHeading(unit, headings);
    if (match !== null) {
      links.set(unit, match);
      continue;
    }
    if (skipRest) continue;
    const name = unit.heading ?? unit.slug;
    const choice = await pickOne(
      app,
      `Outline heading for "${name}"`,
      "Pick a heading, or skip",
      [SKIP, SKIP_ALL, ...headings.map((heading) => heading.text)],
      (item) => item,
    );
    if (choice === null || choice === SKIP) continue;
    if (choice === SKIP_ALL) {
      skipRest = true;
      continue;
    }
    links.set(unit, choice);
  }
  if (links.size === 0) {
    new Notice("No scenes linked.");
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
  new Notice(`Linked ${scenes} with ${outline.basename}.`);
}
