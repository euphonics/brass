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

/*
 * Embeds in exports (#272): with Clean export's "Embeds" set to "Include
 * text", each `![[note]]`, `![[note#Heading]]` or `![[note#^block]]` is
 * replaced by the text it shows, before the export cleans the script, so
 * the embedded text is cleaned the same way. An embed alone on its line
 * becomes those lines; an embed inside a sentence becomes words on that
 * line. Embeds inside embedded text are included too, up to three levels.
 * Images and notes that can't be found are left for the cleanup to remove.
 */

/** The text an embed shows, or null (an image, or nothing found). */
export type EmbedResolver = (
  link: string,
  fromPath: string,
) => Promise<{ text: string; path: string } | null>;

const EMBED = /!\[\[([^[\]\n]+?)\]\]/gu;

/** How deep embeds inside embedded text are followed. */
export const MAX_EMBED_DEPTH = 3;

/**
 * `source` (from the note at `fromPath`) with its embeds replaced by their
 * text. `seen` stops a note embedding itself.
 */
export async function inlineEmbeds(
  source: string,
  fromPath: string,
  resolve: EmbedResolver,
  depth = MAX_EMBED_DEPTH,
  seen: ReadonlySet<string> = new Set([fromPath]),
): Promise<string> {
  if (depth <= 0 || !source.includes("![[")) return source;
  const lines = source.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (!line.includes("![[")) {
      out.push(line);
      continue;
    }
    const alone = /^\s*!\[\[[^[\]\n]+?\]\]\s*$/u.test(line);
    let result = "";
    let at = 0;
    for (const match of line.matchAll(EMBED)) {
      result += line.slice(at, match.index);
      at = match.index + match[0].length;
      const link = (match[1] ?? "").split("|")[0]?.trim() ?? "";
      const found = link === "" ? null : await resolve(link, fromPath);
      if (found === null || seen.has(found.path)) {
        result += match[0];
        continue;
      }
      const nested = await inlineEmbeds(
        found.text,
        found.path,
        resolve,
        depth - 1,
        new Set([...seen, found.path]),
      );
      const text = nested.trim();
      result += alone ? text : text.replace(/\s*\n\s*/gu, " ");
    }
    result += line.slice(at);
    out.push(result);
  }
  return out.join("\n");
}

/** `text` without its frontmatter. */
export function withoutFrontmatter(text: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/u.exec(text);
  return match ? text.slice(match[0].length) : text;
}
