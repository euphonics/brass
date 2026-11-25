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

import { Notice, type App, type TFile } from "obsidian";
import { markdownFilesInFolder } from "../characters/vault";

/** The plugin's ID before it was renamed to Brass. */
export const OLD_PLUGIN_ID = "scribidian";

/** Frontmatter key used before the rename. */
const OLD_KEY = "scribidian";
const NEW_KEY = "brass";

interface HotkeyManager {
  customKeys?: Record<string, unknown[]>;
  setHotkeys?: (id: string, keys: unknown[]) => void;
  save?: () => Promise<void> | void;
}

interface PluginManager {
  enabledPlugins?: Set<string>;
  disablePluginAndSave?: (id: string) => Promise<void>;
}

/** Settings saved by Scribidian, or null when there are none. */
export async function readOldSettings(
  app: App,
): Promise<Record<string, unknown> | null> {
  const path = `${app.vault.configDir}/plugins/${OLD_PLUGIN_ID}/data.json`;
  try {
    if (!(await app.vault.adapter.exists(path))) return null;
    const parsed: unknown = JSON.parse(await app.vault.adapter.read(path));
    return parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Copy Scribidian's custom hotkeys to the same Brass commands. Command IDs
 * are "plugin-id:command", so only the prefix changes. Hotkeys already set
 * for a Brass command are kept. Returns how many commands were copied.
 */
export async function copyOldHotkeys(app: App, newId: string): Promise<number> {
  const manager = (app as unknown as { hotkeyManager?: HotkeyManager })
    .hotkeyManager;
  const custom = manager?.customKeys;
  if (!manager || !custom || typeof manager.setHotkeys !== "function") {
    return 0;
  }
  let copied = 0;
  for (const [id, keys] of Object.entries(custom)) {
    if (!id.startsWith(`${OLD_PLUGIN_ID}:`)) continue;
    const target = `${newId}:${id.slice(OLD_PLUGIN_ID.length + 1)}`;
    if (custom[target] !== undefined) continue;
    manager.setHotkeys(target, keys);
    copied++;
  }
  if (copied > 0) await manager.save?.();
  return copied;
}

/** Turn Scribidian off if it is still on, since both would claim .fountain. */
export async function turnOffOldPlugin(app: App): Promise<boolean> {
  const plugins = (app as unknown as { plugins?: PluginManager }).plugins;
  if (!plugins?.enabledPlugins?.has(OLD_PLUGIN_ID)) return false;
  if (typeof plugins.disablePluginAndSave !== "function") return false;
  await plugins.disablePluginAndSave(OLD_PLUGIN_ID);
  return true;
}

/**
 * The notes Brass converts: the given note, the notes in its folder and
 * below it, and the character folder. Never the whole vault (PRIVACY.md); a
 * note in the vault's root folder converts only itself.
 */
function candidateNotes(
  app: App,
  note: TFile,
  characterFolder: string,
): TFile[] {
  const files = new Map<string, TFile>([[note.path, note]]);
  const folder = note.parent?.path ?? "";
  const folders = [characterFolder];
  if (folder !== "" && folder !== "/") folders.push(folder);
  for (const path of folders) {
    for (const file of markdownFilesInFolder(app, path)) {
      files.set(file.path, file);
    }
  }
  return [...files.values()];
}

/** Notes near `note` still marked with the old "scribidian:" property. */
export function notesWithOldKey(
  app: App,
  note: TFile,
  characterFolder: string,
): TFile[] {
  return candidateNotes(app, note, characterFolder).filter((file) => {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    return frontmatter !== undefined && OLD_KEY in frontmatter;
  });
}

/**
 * Rename the "scribidian:" property to "brass:" in the notes near `note`
 * (see candidateNotes), keeping its value. A note that already has "brass:"
 * just loses the old key.
 */
export async function convertOldKeys(
  app: App,
  note: TFile,
  characterFolder: string,
): Promise<number> {
  const files = notesWithOldKey(app, note, characterFolder);
  for (const file of files) {
    await app.fileManager.processFrontMatter(
      file,
      (frontmatter: Record<string, unknown>) => {
        if (!(OLD_KEY in frontmatter)) return;
        if (frontmatter[NEW_KEY] === undefined) {
          frontmatter[NEW_KEY] = frontmatter[OLD_KEY];
        }
        delete frontmatter[OLD_KEY];
      },
    );
  }
  return files.length;
}

/** Run once on the first start of Brass after Scribidian. */
export async function migrateFromScribidian(
  app: App,
  newId: string,
  oldTurnedOff: boolean,
): Promise<void> {
  const parts: string[] = [];
  try {
    const hotkeys = await copyOldHotkeys(app, newId);
    if (hotkeys > 0) parts.push(`copied ${hotkeys} hotkeys`);
  } catch {
    // Hotkeys are a convenience; a failure must not stop the plugin.
  }
  if (oldTurnedOff) parts.push("turned Scribidian off");
  new Notice(
    `Scribidian is now Brass. Your settings came along${parts.length ? `; ${parts.join(", ")}` : ""}. Open a script and run "Convert Scribidian properties in this folder" to rename the property in its notes.`,
    15000,
  );
}
