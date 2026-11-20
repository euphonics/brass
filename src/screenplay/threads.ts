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
 * Threads, a Scribidian addition to Fountain: `[&zosia red herring]` marks a
 * line as part of a named thread. Every `[&…]` with the same name, in any
 * note, belongs to the same thread; clicking one goes to the next. Threads
 * aren't script: the preview, page count and exports leave them out.
 */

/** One `[&name]` in a text: offsets of the whole token, and its name. */
export interface ThreadMark {
  from: number;
  to: number;
  name: string;
  key: string;
}

const THREAD = /\[&([^\]\n]+)\]/gu;

/** The name a thread is matched by: case and extra spaces don't count. */
export function threadKey(name: string): string {
  return name.trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

/** Every `[&name]` in `text`, in order. Empty names don't count. */
export function findThreads(text: string): ThreadMark[] {
  const marks: ThreadMark[] = [];
  if (!text.includes("[&")) return marks;
  for (const match of text.matchAll(THREAD)) {
    const name = (match[1] ?? "").trim().replace(/\s+/gu, " ");
    if (name === "") continue;
    const from = match.index;
    marks.push({
      from,
      to: from + match[0].length,
      name,
      key: threadKey(name),
    });
  }
  return marks;
}

/**
 * `line` without its threads, and the spaces before each one, so
 * `Text.[&x]` and `Text. [&x]` both give `Text.`. A thread at the start of
 * the line takes the spaces after it instead.
 */
export function stripThreads(line: string): string {
  if (!line.includes("[&")) return line;
  return line
    .replace(/^[ \t]*\[&[^\]\n]*[^\]\n\s][^\]\n]*\][ \t]*/u, "")
    .replace(/[ \t]*\[&[^\]\n]*[^\]\n\s][^\]\n]*\]/gu, "");
}

/** Whether `line` holds a thread and nothing else. */
export function onlyThreads(line: string): boolean {
  return line.includes("[&") && stripThreads(line).trim() === "";
}

/**
 * `source` with every thread taken out, for exports. A line that held only
 * threads goes, so it leaves no extra blank line.
 */
export function stripThreadsFromSource(source: string): string {
  if (!source.includes("[&")) return source;
  const lines = source.split("\n");
  const out: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (onlyThreads(line)) {
      // On its own block: one of the blank lines around it goes too.
      const blankBefore = out.length > 0 && out[out.length - 1]?.trim() === "";
      if (blankBefore && (lines[index + 1] ?? "x").trim() === "") index += 1;
      continue;
    }
    out.push(stripThreads(line));
  }
  return out.join("\n");
}

/** One place in a thread: a note and the `[&name]`'s offsets in it. */
export interface ThreadPlace {
  path: string;
  from: number;
  to: number;
  name: string;
  key: string;
}

/**
 * The places in thread `key`, in the order clicking goes through them: the
 * parts of `file`'s screenplay project in their order (or `file` alone),
 * then every other note by path.
 */
export function orderedPlaces(
  places: Map<string, ThreadMark[]>,
  key: string,
  firstPaths: readonly string[],
): ThreadPlace[] {
  const first = new Set(firstPaths);
  const rest = [...places.keys()].filter((path) => !first.has(path)).sort();
  const ordered: ThreadPlace[] = [];
  for (const path of [...firstPaths, ...rest]) {
    for (const mark of places.get(path) ?? []) {
      if (mark.key === key) ordered.push({ ...mark, path });
    }
  }
  return ordered;
}

/** The place `step` away from `current` (wrapping), or null if alone. */
export function stepPlace(
  ordered: readonly ThreadPlace[],
  current: { path: string; from: number },
  step: 1 | -1,
): ThreadPlace | null {
  if (ordered.length < 2) return null;
  let at = ordered.findIndex(
    (place) => place.path === current.path && place.from === current.from,
  );
  if (at === -1) at = step === 1 ? -1 : 0;
  const next = (at + step + ordered.length) % ordered.length;
  return ordered[next] ?? null;
}
