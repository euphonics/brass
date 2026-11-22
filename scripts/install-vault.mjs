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
// vault's .obsidian/plugins/scribidian folder. The everyday Notes vault
// gets releases from GitHub (BRAT), never a local build. Usage:
//   node scripts/install-vault.mjs dev     (the Dev vault, for testing)
//   node scripts/install-vault.mjs <vault folder>

import { copyFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const home = os.homedir();
const VAULTS = {
  dev: path.join(home, "Code", "Obsidian Dev Vault", "Dev"),
};

const target = process.argv[2] ?? "dev";
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
for (const name of ["main.js", "manifest.json", "styles.css"]) {
  await copyFile(path.join(projectRoot, name), path.join(pluginRoot, name));
}
console.log(`Installed Scribidian in ${pluginRoot}`);
