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

// Copies the built plugin (main.js, manifest.json, styles.css) into a
// vault's .obsidian/plugins/scribidian folder. Usage:
//   node scripts/install-vault.mjs dev     (the Dev vault, for testing)
//   node scripts/install-vault.mjs notes   (the everyday Notes vault, once
//                                           a batch is tested in Dev)
//   node scripts/install-vault.mjs <vault folder>
//
// Installing into Notes also resets Scribidian's settings to the defaults
// (the writer's rule: every Notes install starts from the defaults, so they
// check what a new user gets), except which commands show in the command
// palette (#296). The old settings are kept as
// settings-backups/data-<date>.json in the plugin folder (the last 10), and
// the plugin is reloaded in Obsidian so the running copy doesn't save the
// old settings back. Add --keep-settings to skip the reset.

import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const home = os.homedir();
const VAULTS = {
  dev: path.join(home, "Code", "Obsidian Dev Vault", "Dev"),
  notes: path.join(home, "Dropbox", "Notes"),
};

const target = process.argv[2] ?? "dev";
const keepSettings = process.argv.includes("--keep-settings");
const vaultRoot = VAULTS[target] ?? path.resolve(target);
const pluginRoot = path.join(vaultRoot, ".obsidian", "plugins", "scribidian");
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// Only install into a plugin folder that already exists: a mistyped path
// should fail, not create a stray vault.
await stat(pluginRoot).catch(() => {
  throw new Error(`No Scribidian plugin folder at ${pluginRoot}`);
});

const resetSettings = target === "notes" && !keepSettings;
if (resetSettings) {
  const data = path.join(pluginRoot, "data.json");
  const exists = await stat(data).then(
    () => true,
    () => false,
  );
  if (exists) {
    const backups = path.join(pluginRoot, "settings-backups");
    await mkdir(backups, { recursive: true });
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/gu, "")
      .replace("T", "-")
      .slice(0, 15);
    const backup = path.join(backups, `data-${stamp}.json`);
    await copyFile(data, backup);
    const old = (await readdir(backups))
      .filter((name) => /^data-\d{8}-\d{6}\.json$/u.test(name))
      .sort()
      .reverse()
      .slice(10);
    for (const name of old) await rm(path.join(backups, name));
    // Everything back to the defaults, except the writer's choice of
    // commands in the command palette (#296): Scribidian fills in the rest.
    const stored = JSON.parse(await readFile(data, "utf8"));
    const kept =
      stored && typeof stored.commandVisibility === "object"
        ? { commandVisibility: stored.commandVisibility }
        : null;
    if (kept && Object.keys(kept.commandVisibility).length > 0) {
      await writeFile(
        data,
        JSON.stringify(kept, null, 2) + String.fromCharCode(10),
      );
    } else {
      await rm(data);
    }
    console.log(
      `Reset Scribidian settings to defaults, keeping your command palette choices (backup: ${backup})`,
    );
  } else {
    console.log("Scribidian settings were already the defaults.");
  }
}

for (const name of ["main.js", "manifest.json", "styles.css"]) {
  await copyFile(path.join(projectRoot, name), path.join(pluginRoot, name));
}
console.log(`Installed Scribidian in ${pluginRoot}`);

// Reload the running plugin, so it reads the defaults rather than saving
// its old settings again. Needs Obsidian open with its command line on;
// otherwise the next Obsidian start loads the defaults.
if (resetSettings && process.platform === "win32") {
  await new Promise((resolve) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "obsidian vault=Notes plugin:reload id=scribidian",
      ],
      { timeout: 30000 },
      (error, stdout) => {
        console.log(
          error
            ? "Couldn't reload Scribidian in Obsidian: reload it (or restart Obsidian) before changing any setting."
            : stdout.trim() || "Reloaded Scribidian in Notes.",
        );
        resolve();
      },
    );
  });
}
