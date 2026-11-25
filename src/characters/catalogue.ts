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

export interface CharacterPage {
  path: string;
  character: string;
  aliases: string[];
  screenplays: string[];
  related: string[];
}

export function normalizeCharacterName(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleUpperCase();
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Frontmatter key that marks a note as a Brass page. */
export const PAGE_KIND_KEY = "brass";
/** Key used before the rename to Brass, still read so older notes keep working. */
export const SCRIBIDIAN_PAGE_KIND_KEY = "scribidian";
/** Key used by First Draft, still read so older notes keep working. */
export const LEGACY_PAGE_KIND_KEY = "firstdraft";

/** The page kind ("character", "screenplay-project"), new key first. */
export function pageKind(
  frontmatter: Record<string, unknown> | undefined,
): unknown {
  return (
    frontmatter?.[PAGE_KIND_KEY] ??
    frontmatter?.[SCRIBIDIAN_PAGE_KIND_KEY] ??
    frontmatter?.[LEGACY_PAGE_KIND_KEY]
  );
}

export function isCharacterFrontmatter(
  frontmatter: Record<string, unknown> | undefined,
): boolean {
  return pageKind(frontmatter) === "character";
}

export function characterPageFromFrontmatter(
  path: string,
  frontmatter: Record<string, unknown> | undefined,
): CharacterPage | null {
  if (!isCharacterFrontmatter(frontmatter)) return null;
  const character =
    typeof frontmatter?.character === "string"
      ? normalizeCharacterName(frontmatter.character)
      : "";
  if (!character) return null;

  return {
    path,
    character,
    aliases: stringValues(frontmatter?.aliases).map(normalizeCharacterName),
    screenplays: stringValues(frontmatter?.screenplays),
    related: stringValues(frontmatter?.related),
  };
}

export function matchingCharacterPages(
  pages: readonly CharacterPage[],
  cue: string,
): CharacterPage[] {
  const normalized = normalizeCharacterName(cue);
  return pages.filter(
    (page) =>
      page.character === normalized || page.aliases.includes(normalized),
  );
}

const UNSAFE_FILENAME_CHARACTERS = /[\\/:*?"<>|#[\]^]/gu;

/** Readable character name, e.g. "DR. JANE MORROW (O.S.)" -> "Dr. Jane Morrow". */
export function characterTitle(cue: string): string {
  const words = normalizeCharacterName(cue)
    .replace(/(?:\s+\([^)]*\))+\s*$/u, "")
    .replace(UNSAFE_FILENAME_CHARACTERS, " ")
    .split(/\s+/u)
    .filter(Boolean);
  const title = words
    .map((word) => `${word.charAt(0)}${word.slice(1).toLocaleLowerCase()}`)
    .join(" ");
  return title || "Character";
}

/**
 * Project name used in character page names and headings, from the
 * screenplay's `title` property or, failing that, its note name without a
 * trailing " (project)", " fountain pages", " pages", " script", " draft"
 * or " screenplay" ("TIGHTER fountain pages" -> "TIGHTER").
 */
export function characterProjectName(titleOrBasename: string): string {
  return sanitizeProjectName(
    titleOrBasename
      .replace(/\s*\(project\)\s*$/iu, "")
      .replace(
        /\s+(?:fountain\s+)?(?:pages|script|draft|screenplay)\s*$/iu,
        "",
      ),
  );
}

/** A title made safe for file names, without guessing: "The Rough Draft" stays. */
export function sanitizeProjectName(title: string): string {
  return title
    .replace(UNSAFE_FILENAME_CHARACTERS, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/** "Jen (Character in TIGHTER)", or just "Jen" without a project name. */
export function characterFilename(cue: string, projectName = ""): string {
  const title = characterTitle(cue);
  return projectName ? `${title} (Character in ${projectName})` : title;
}

function projectLink(projectName: string): string {
  return `[[${projectName} (project)|${projectName}]]`;
}

export interface CharacterTemplateValues {
  /** Readable character name, e.g. "Jen". */
  character: string;
  /** Character cue as written in the script, e.g. "JEN". */
  cue: string;
  /** Project name, e.g. "TIGHTER". */
  project: string;
  /** New note's filename without extension. */
  title: string;
  /** Link text for the screenplay or project note. */
  screenplayLink: string;
  date: string;
  time: string;
}

/**
 * Fill a user's character template. Supported placeholders:
 * {{character}}, {{cue}}, {{project}}, {{project_link}}, {{screenplay}},
 * {{title}}, {{date}}, {{time}}. Unknown placeholders are left untouched.
 */
export function renderCharacterTemplate(
  template: string,
  values: CharacterTemplateValues,
): string {
  const replacements: Record<string, string> = {
    character: values.character,
    cue: values.cue,
    project: values.project,
    project_link: values.project ? projectLink(values.project) : "",
    screenplay: `[[${values.screenplayLink}]]`,
    title: values.title,
    date: values.date,
    time: values.time,
  };
  return template.replace(
    /\{\{\s*([a-z_]+)\s*\}\}/giu,
    (match, key: string) => replacements[key.toLowerCase()] ?? match,
  );
}

const HONORIFICS = new Set([
  "DR",
  "DR.",
  "MR",
  "MR.",
  "MRS",
  "MRS.",
  "MS",
  "MS.",
  "MX",
  "MX.",
  "MISS",
  "SIR",
  "DAME",
]);

/**
 * First name for a character page alias: "JOHN" -> "John",
 * "JANE MORROW" -> "Jane", "DR. JANE MORROW" -> "Jane".
 */
export function characterFirstName(cue: string): string {
  const words = characterTitle(cue).split(" ");
  const first =
    words.find((word) => !HONORIFICS.has(word.toLocaleUpperCase())) ??
    words[0] ??
    "";
  return first;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

export function characterPageTemplate(
  cue: string,
  screenplayLink: string,
  projectName = "",
): string {
  const character = normalizeCharacterName(cue);
  const title = characterTitle(character);
  const projectLine = projectName
    ? `\n#Character in ${projectLink(projectName)}\n`
    : "";
  return `---
brass: character
character: ${yamlString(character)}
aliases:
  - ${yamlString(characterFirstName(character))}
screenplays:
  - ${yamlString(`[[${screenplayLink}]]`)}
related: []
---

# ${title}
${projectLine}
## Background

## Wants and fears

## Voice

## Relationships

## Continuity notes
`;
}

export function wikiLinkTarget(value: string): string {
  const trimmed = value.trim();
  const inner =
    trimmed.startsWith("[[") && trimmed.endsWith("]]")
      ? trimmed.slice(2, -2)
      : trimmed;
  return (inner.split("|")[0] ?? "").split("#")[0]?.trim() ?? "";
}
