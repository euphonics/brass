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

import { normalizePath, Notice, TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import {
  characterFilename,
  characterFirstName,
  characterPageFromFrontmatter,
  characterPageTemplate,
  characterProjectName,
  sanitizeProjectName,
  characterTitle,
  normalizeCharacterName,
  renderCharacterTemplate,
  matchingCharacterPages,
  type CharacterPage,
  wikiLinkTarget,
} from "./catalogue";
import type { VerifiableCharacterPage } from "./verification";

function markdownFilesInFolder(app: App, folderPath: string): TFile[] {
  const normalized = normalizePath(folderPath);
  if (!normalized) return [];
  const folder = app.vault.getFolderByPath(normalized);
  if (folder === null) return [];

  const files: TFile[] = [];
  const pending = [...folder.children];
  while (pending.length > 0) {
    const child = pending.pop();
    if (child instanceof TFile && child.extension === "md") files.push(child);
    if (child instanceof TFolder) pending.push(...child.children);
  }
  return files;
}

export function characterPages(
  app: App,
  characterFolder: string,
): CharacterPage[] {
  return markdownFilesInFolder(app, characterFolder).flatMap((file) => {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    const page = characterPageFromFrontmatter(file.path, frontmatter);
    return page ? [page] : [];
  });
}

export function characterPageFile(app: App, page: CharacterPage): TFile | null {
  const file = app.vault.getAbstractFileByPath(page.path);
  return file instanceof TFile ? file : null;
}

export function verifiableCharacterPages(
  app: App,
  characterFolder: string,
  scopeFiles: readonly TFile[],
): VerifiableCharacterPage[] {
  const scopePaths = new Set(scopeFiles.map((file) => file.path));
  return characterPages(app, characterFolder)
    .filter((page) =>
      page.screenplays.some((link) => {
        const target = wikiLinkTarget(link);
        const file = app.metadataCache.getFirstLinkpathDest(target, page.path);
        return file !== null && scopePaths.has(file.path);
      }),
    )
    .map((page) => ({
      ...page,
      linkedToScreenplay: true,
      unresolvedRelated: page.related.filter((link) => {
        const target = wikiLinkTarget(link);
        return (
          !target ||
          app.metadataCache.getFirstLinkpathDest(target, page.path) === null
        );
      }),
    }));
}

export function characterPagesForScope(
  app: App,
  characterFolder: string,
  scopeFiles: readonly TFile[],
): CharacterPage[] {
  return verifiableCharacterPages(app, characterFolder, scopeFiles);
}

async function ensureFolder(app: App, folder: string): Promise<void> {
  const parts = normalizePath(folder).split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (app.vault.getAbstractFileByPath(current) === null) {
      await app.vault.createFolder(current);
    }
  }
}

function availablePath(
  app: App,
  folder: string,
  cue: string,
  projectName: string,
): string {
  const stem = characterFilename(cue, projectName);
  let suffix = 1;
  let path = normalizePath(`${folder}/${stem}.md`);
  while (app.vault.getAbstractFileByPath(path) !== null) {
    suffix += 1;
    path = normalizePath(`${folder}/${stem} ${suffix}.md`);
  }
  return path;
}

interface TemplatesPluginHost {
  internalPlugins?: {
    getPluginById?: (id: string) => {
      enabled?: boolean;
      instance?: { options?: { folder?: unknown } };
    } | null;
  };
}

/**
 * Folder set in Obsidian's core Templates plugin, or "" when the plugin is
 * off or has no folder. Uses Obsidian's internal plugin registry, which has
 * no public API.
 */
export function coreTemplatesFolder(app: App): string {
  const templates = (
    app as unknown as TemplatesPluginHost
  ).internalPlugins?.getPluginById?.("templates");
  const folder = templates?.enabled
    ? templates.instance?.options?.folder
    : undefined;
  return typeof folder === "string"
    ? normalizePath(folder).replace(/^\/+|\/+$/gu, "")
    : "";
}

/** Markdown files inside `folder` and its subfolders; any note if empty. */
export function isTemplateCandidate(
  file: Pick<TFile, "path" | "extension">,
  folder: string,
): boolean {
  if (file.extension !== "md") return false;
  return !folder || file.path.startsWith(`${folder}/`);
}

/** Find the user's character template by vault path or note name. */
export function resolveCharacterTemplate(
  app: App,
  templateSetting: string,
): TFile | null {
  const target = templateSetting.trim().replace(/\.md$/iu, "");
  if (!target) return null;
  return (
    app.vault.getFileByPath(normalizePath(`${target}.md`)) ??
    app.metadataCache.getFirstLinkpathDest(target, "")
  );
}

/**
 * The screenplay's official title: its `title` property, else a name guessed
 * from the note name, which is then saved as `title` so it can be edited.
 */
export async function screenplayProjectName(
  app: App,
  owner: TFile,
): Promise<string> {
  const title: unknown =
    app.metadataCache.getFileCache(owner)?.frontmatter?.title;
  if (typeof title === "string" && title.trim()) {
    // An explicit title is used as written, only made safe for file names.
    return sanitizeProjectName(title);
  }
  const guessed = characterProjectName(owner.basename);
  if (owner.extension === "md" && guessed) {
    await app.fileManager.processFrontMatter(
      owner,
      (frontmatter: Record<string, unknown>) => {
        if (typeof frontmatter.title !== "string" || !frontmatter.title.trim())
          frontmatter.title = guessed;
      },
    );
  }
  return guessed;
}

/** Add the properties First Draft uses to recognise a character page. */
async function markAsCharacterPage(
  app: App,
  file: TFile,
  cue: string,
  owner: TFile,
  addFirstNameAlias = false,
): Promise<void> {
  const link = `[[${app.metadataCache.fileToLinktext(owner, file.path, owner.extension === "md")}]]`;
  await app.fileManager.processFrontMatter(
    file,
    (frontmatter: Record<string, unknown>) => {
      frontmatter.firstdraft = "character";
      if (typeof frontmatter.character !== "string") {
        frontmatter.character = normalizeCharacterName(cue);
      }
      const aliases = Array.isArray(frontmatter.aliases)
        ? (frontmatter.aliases as unknown[])
        : [];
      // New pages get the first name as an alias: [[John]] links to
      // "John (Character in STORY)".
      const firstName = characterFirstName(cue);
      if (addFirstNameAlias && firstName && !aliases.includes(firstName)) {
        aliases.push(firstName);
      }
      frontmatter.aliases = aliases;
      const screenplays = Array.isArray(frontmatter.screenplays)
        ? (frontmatter.screenplays as unknown[])
        : [];
      if (!screenplays.includes(link)) screenplays.push(link);
      frontmatter.screenplays = screenplays;
      if (!Array.isArray(frontmatter.related)) frontmatter.related = [];
    },
  );
}

export async function ensureCharacterPage(
  app: App,
  folder: string,
  owner: TFile,
  scopeFiles: readonly TFile[],
  cue: string,
  templateSetting = "",
): Promise<TFile | null> {
  const matches = matchingCharacterPages(
    characterPagesForScope(app, folder, scopeFiles),
    cue,
  );
  if (matches.length === 1) return characterPageFile(app, matches[0]);
  if (matches.length > 1) return null;

  const projectName = await screenplayProjectName(app, owner);

  // A page with the expected name may already exist without First Draft's
  // properties (written by hand, or moved). Adopt it instead of making
  // "Name (Character in X) 2".
  const existing = app.metadataCache.getFirstLinkpathDest(
    characterFilename(cue, projectName),
    owner.path,
  );
  if (existing !== null && existing.extension === "md") {
    await markAsCharacterPage(app, existing, cue, owner);
    return existing;
  }

  await ensureFolder(app, folder);
  const path = availablePath(app, folder, cue, projectName);
  const screenplayLink = app.metadataCache.fileToLinktext(
    owner,
    path,
    owner.extension === "md",
  );

  const templateFile = templateSetting.trim()
    ? resolveCharacterTemplate(app, templateSetting)
    : null;
  if (templateSetting.trim() && templateFile === null) {
    new Notice(
      `Character template "${templateSetting}" was not found. Using the built-in template.`,
    );
  }
  if (templateFile === null) {
    return app.vault.create(
      path,
      characterPageTemplate(cue, screenplayLink, projectName),
    );
  }

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const content = renderCharacterTemplate(await app.vault.read(templateFile), {
    character: characterTitle(cue),
    cue: normalizeCharacterName(cue),
    project: projectName,
    title: path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/u, ""),
    screenplayLink,
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  });
  const file = await app.vault.create(path, content);
  // The user's template may lack the properties First Draft needs.
  await markAsCharacterPage(app, file, cue, owner, true);
  return file;
}

export async function openCharacterPage(app: App, file: TFile): Promise<void> {
  await app.workspace.getLeaf("tab").openFile(file);
}
