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

import { frontmatterEnd, isSceneHeading } from "./lines";

/*
 * Link scene headings across documents (#254). Each scene in the script is
 * known by the Markdown heading it sits under ("## Jen finds the key"), or
 * by its slugline when there is no heading above it. A scene is linked to
 * the outline heading with the same text (or one the writer picks): its
 * sluglines get a synopsis line `= [[Outline#Heading]]`, and the outline
 * heading gets a line linking back, `[[Script#Heading]]`.
 */

/** A scene of the script: the sluglines under one heading. */
export interface SceneUnit {
  /** The Markdown heading above the sluglines, or null. */
  heading: string | null;
  /** The first slugline's text (the scene's name when there's no heading). */
  slug: string;
  /** 0-based lines of its sluglines. */
  slugLines: number[];
}

const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t#]*$/u;

/** A Markdown heading in a note. */
export interface NoteHeading {
  text: string;
  level: number;
  line: number;
}

/** Every Markdown heading in `lines`, after the frontmatter. */
export function noteHeadings(lines: readonly string[]): NoteHeading[] {
  const headings: NoteHeading[] = [];
  let fence = false;
  for (let line = frontmatterEnd(lines) + 1; line < lines.length; line += 1) {
    const text = lines[line] ?? "";
    if (/^\s*(`{3,}|~{3,})/u.test(text)) fence = !fence;
    if (fence) continue;
    const match = HEADING.exec(text);
    if (match) {
      headings.push({
        text: match[2] ?? "",
        level: (match[1] ?? "#").length,
        line,
      });
    }
  }
  return headings;
}

/** The script's scenes, grouped by the heading above their sluglines. */
export function sceneUnits(lines: readonly string[]): SceneUnit[] {
  const units: SceneUnit[] = [];
  let heading: string | null = null;
  let current: SceneUnit | null = null;
  for (let line = frontmatterEnd(lines) + 1; line < lines.length; line += 1) {
    const text = (lines[line] ?? "").trim();
    const match = HEADING.exec(text);
    if (match) {
      heading = match[2] ?? null;
      current = null;
      continue;
    }
    if (!isSceneHeading(text)) continue;
    const blankAbove = line === 0 || (lines[line - 1] ?? "").trim() === "";
    if (!blankAbove) continue;
    if (current !== null && heading !== null && current.heading === heading) {
      current.slugLines.push(line);
      continue;
    }
    current = { heading, slug: text, slugLines: [line] };
    units.push(current);
  }
  return units;
}

const same = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** The outline heading with the scene's name, or null. */
export function matchingHeading(
  unit: SceneUnit,
  headings: readonly NoteHeading[],
): string | null {
  const name = unit.heading ?? unit.slug;
  return headings.find((heading) => same(heading.text, name))?.text ?? null;
}

/**
 * The outline heading a scene is already linked to (a synopsis line
 * `= [[Outline#Heading]]` under one of its sluglines), or null.
 */
export function existingLink(
  unit: SceneUnit,
  lines: readonly string[],
  outlineName: string,
): string | null {
  const prefix = `[[${outlineName}#`;
  for (const line of unit.slugLines) {
    const below = lines[line + 1] ?? "";
    const at = below.indexOf(prefix);
    if (at === -1) continue;
    const end = below.indexOf("]]", at);
    if (end === -1) continue;
    const target = below.slice(at + prefix.length, end).split("|")[0] ?? "";
    if (target.trim() !== "") return target.trim();
  }
  return null;
}

/**
 * The synopsis lines to add to the script: after each slugline of a linked
 * scene, `= [[Outline#Heading]]`, unless the line under the slugline
 * already links to the outline. Returns the lines to insert after, in
 * order, with their text.
 */
export function scriptLinkInserts(
  lines: readonly string[],
  links: ReadonlyMap<SceneUnit, string>,
  outlineName: string,
): { after: number; text: string }[] {
  const inserts: { after: number; text: string }[] = [];
  for (const [unit, heading] of links) {
    for (const line of unit.slugLines) {
      const below = lines[line + 1] ?? "";
      if (
        below.includes(`[[${outlineName}#`) ||
        below.includes(`[[${outlineName}]]`)
      ) {
        continue;
      }
      inserts.push({ after: line, text: `= [[${outlineName}#${heading}]]` });
    }
  }
  return inserts.sort((a, b) => a.after - b.after);
}

/**
 * The outline with a link back under each linked heading:
 * `[[Script#Heading]]` (or `[[Script]]` for a scene with no heading),
 * unless that heading's section already has it.
 */
export function outlineWithLinks(
  outline: string,
  links: ReadonlyMap<SceneUnit, string>,
  scriptName: string,
): string {
  const lines = outline.split("\n");
  const headings = noteHeadings(lines);
  const inserts = new Map<number, string[]>();
  for (const [unit, target] of links) {
    const at = headings.findIndex((heading) => same(heading.text, target));
    const heading = headings[at];
    if (heading === undefined) continue;
    const link =
      unit.heading === null
        ? `[[${scriptName}]]`
        : `[[${scriptName}#${unit.heading}]]`;
    const end = headings[at + 1]?.line ?? lines.length;
    const section = lines.slice(heading.line + 1, end).join("\n");
    const pending = inserts.get(heading.line) ?? [];
    if (section.includes(link) || pending.includes(link)) continue;
    pending.push(link);
    inserts.set(heading.line, pending);
  }
  const out: string[] = [];
  lines.forEach((line, index) => {
    out.push(line);
    const add = inserts.get(index);
    if (add !== undefined) out.push(...add);
  });
  return out.join("\n");
}
