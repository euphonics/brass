/*
 * Copyright 2026 Christian Grobmeier
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

import { readFile } from "node:fs/promises";

// Embed the original font bytes as base64 text, decoded by a few lines of
// plain JavaScript on first use: about a third the size of a number list,
// with no data URL and no atob() (see docs/SECURITY_SCAN_NOTES.md).
export async function fontBytesModule(path) {
  const base64 = (await readFile(path)).toString("base64");
  return `const DATA = "${base64}";
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const VALUES = new Uint8Array(128);
for (let index = 0; index < ALPHABET.length; index += 1)
  VALUES[ALPHABET.charCodeAt(index)] = index;
const padding = DATA.endsWith("==") ? 2 : DATA.endsWith("=") ? 1 : 0;
const bytes = new Uint8Array((DATA.length / 4) * 3 - padding);
let out = 0;
for (let index = 0; index < DATA.length; index += 4) {
  const chunk =
    (VALUES[DATA.charCodeAt(index)] << 18) |
    (VALUES[DATA.charCodeAt(index + 1)] << 12) |
    (VALUES[DATA.charCodeAt(index + 2)] << 6) |
    VALUES[DATA.charCodeAt(index + 3)];
  if (out < bytes.length) bytes[out++] = (chunk >> 16) & 255;
  if (out < bytes.length) bytes[out++] = (chunk >> 8) & 255;
  if (out < bytes.length) bytes[out++] = chunk & 255;
}
export default bytes;`;
}

export function fontBytesEsbuildPlugin() {
  return {
    name: "font-bytes",
    setup(build) {
      build.onLoad({ filter: /\.ttf$/ }, async ({ path, suffix }) => {
        if (suffix !== "?bytes") return;
        return { contents: await fontBytesModule(path), loader: "js" };
      });
    },
  };
}

export function fontBytesVitePlugin() {
  return {
    name: "font-bytes",
    enforce: "pre",
    async load(id) {
      if (id.endsWith(".ttf?bytes"))
        return fontBytesModule(id.slice(0, -"?bytes".length));
    },
  };
}
