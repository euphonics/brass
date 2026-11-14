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

export function stripObsidianFrontmatter(source: string): string {
  const normalized = source.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.replace(/^\uFEFF/u, "").trim() !== "---") return source;

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (closingIndex === -1) return source;

  return lines
    .slice(closingIndex + 1)
    .join("\n")
    .replace(/^\n+/u, "");
}

export function fountainExportPath(
  sourcePath: string,
  existingPaths: Pick<ReadonlySet<string>, "has">,
): string {
  const slash = sourcePath.lastIndexOf("/");
  const directory = slash === -1 ? "" : sourcePath.slice(0, slash + 1);
  const filename = slash === -1 ? sourcePath : sourcePath.slice(slash + 1);
  const dot = filename.lastIndexOf(".");
  const basename = dot === -1 ? filename : filename.slice(0, dot);
  const extension = dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
  const exportBase = extension === "fountain" ? `${basename}-export` : basename;

  let candidate = `${directory}${exportBase}.fountain`;
  let suffix = 2;
  while (existingPaths.has(candidate)) {
    candidate = `${directory}${exportBase}-${suffix}.fountain`;
    suffix += 1;
  }
  return candidate;
}

const TASK_LINE = /^\s*[-*+]\s+\[[^\]]?\](?:\s.*)?$/u;
const WIKILINK = /(?<!!)\[\[([^[\]\n]+?)\]\]/gu;

/** `[[target|alias]]` -> `alias`, `[[target]]` -> `target`. Embeds stay. */
export function unwrapWikilinks(text: string): string {
  return text.replace(WIKILINK, (_match, inner: string) => {
    const pipe = inner.indexOf("|");
    return (pipe === -1 ? inner : inner.slice(pipe + 1)).trim();
  });
}

/**
 * Clean Fountain export: remove Markdown task lines (`- [ ] ...`, any status)
 * and unwrap wikilinks. Headings and inline formatting are kept.
 */
export function cleanFountainSource(source: string): string {
  const output: string[] = [];
  let removedSinceLastLine = false;
  for (const line of source.replaceAll("\r\n", "\n").split("\n")) {
    if (TASK_LINE.test(line)) {
      removedSinceLastLine = true;
      continue;
    }
    // Avoid leaving a double blank line where a task block was removed.
    if (
      removedSinceLastLine &&
      line.trim() === "" &&
      (output.length === 0 || output[output.length - 1]?.trim() === "")
    ) {
      continue;
    }
    removedSinceLastLine = false;
    output.push(unwrapWikilinks(line));
  }
  return output.join("\n");
}
