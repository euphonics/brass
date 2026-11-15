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

import {
  COURIER_FONTS,
  OTHER_FONTS,
  installedFonts,
  screenplayFontOptions,
} from "../editor/screenplayFont";
import { PluginSettingTab } from "obsidian";
import type { App, SettingDefinitionItem, SettingGroupItem } from "obsidian";
import type FirstDraftPlugin from "../main";
import {
  DEFAULT_CLEAN_EXPORT_OPTIONS,
  normalizeCleanExportOptions,
  type CleanExportOptions,
} from "../export/fountain";
import { coreTemplatesFolder, isTemplateCandidate } from "../characters/vault";
import type { PageSize } from "../screenplay/model";
import { isPdfLanguage, PDF_LANGUAGES } from "../export/pdfLanguage";
import type { PdfLanguage } from "../export/pdfLanguage";
import {
  DEFAULT_SLUG_MODIFIERS,
  DEFAULT_SCENE_TYPES,
  DEFAULT_TIMES_OF_DAY,
} from "../screenplay/fountain";

/** Editor look for screenplay notes. */
export type EditorLayout = "screenplay" | "plain";

export interface FirstDraftSettings {
  activateFountainFiles: boolean;
  activateFrontmatter: boolean;
  autocompleteEnabled: boolean;
  smartTabEnabled: boolean;
  editorLayout: EditorLayout;
  bottomTypingMargin: number;
  screenplayFont: string;
  screenplayFontCustom: string;
  renderFountainCodeBlocks: boolean;
  sceneTypeMinimumLetters: number;
  sceneTypeMatchCase: boolean;
  recentItemsWeighting: number;
  maximumSuggestions: number;
  preferredSceneTypes: string[];
  preferredTimesOfDay: string[];
  preferredSlugModifiers: string[];
  statusBarEnabled: boolean;
  showEstimatedPages: boolean;
  showCurrentPage: boolean;
  showEstimatedRuntime: boolean;
  showWordCount: boolean;
  showSceneCount: boolean;
  pageSize: PageSize;
  pdfLanguage: PdfLanguage;
  minutesPerPage: number;
  updateDelayMs: number;
  characterFolder: string;
  characterTemplate: string;
  cleanExport: CleanExportOptions;
}

/** Clean Fountain export toggles, in the order shown in settings. */
const LINK_CHOICES = {
  keep: "Keep as written",
  unwrap: "Keep the text only",
  remove: "Remove entirely",
};

const CLEAN_EXPORT_SETTINGS: {
  option: keyof CleanExportOptions;
  name: string;
  desc: string;
  /** Dropdown choices; options without them are toggles. */
  choices?: Record<string, string>;
}[] = [
  {
    option: "removeTasks",
    name: "Remove tasks",
    desc: "- [ ] and - [x] lines.",
  },
  {
    option: "wikilinks",
    name: "Wikilinks",
    desc: "[[Note|alias]]: keep it, keep only alias (or Note), or remove it. Fountain notes use the same [[ ]] syntax and are handled the same way.",
    choices: LINK_CHOICES,
  },
  {
    option: "removeEmbeds",
    name: "Remove embeds",
    desc: "![[image.png]] and ![alt](image.png).",
  },
  {
    option: "markdownLinks",
    name: "Markdown links",
    desc: "[text](https://...): keep it, keep only text, or remove it.",
    choices: LINK_CHOICES,
  },
  {
    option: "codeBlocks",
    name: "Code blocks",
    desc: "Fenced ``` or ~~~ blocks: keep them, keep only their content (fence lines removed), or remove them.",
    choices: {
      keep: "Keep as written",
      unwrap: "Keep the content only",
      remove: "Remove entirely",
    },
  },
  {
    option: "removeHeadings",
    name: "Remove headings",
    desc: "# Heading lines. These are also Fountain sections (acts, sequences).",
  },
  {
    option: "removeComments",
    name: "Remove comments",
    desc: "%% comments %%, inline or across lines.",
  },
  {
    option: "removeCallouts",
    name: "Remove callouts",
    desc: "> [!note] blocks and their > lines.",
  },
  {
    option: "removeFootnotes",
    name: "Remove footnotes",
    desc: "[^1] references and [^1]: definition lines.",
  },
  {
    option: "removeBlockIds",
    name: "Remove block IDs",
    desc: "^abc123 at the end of a line. A lone ^ (dual dialogue) is kept.",
  },
  {
    option: "removeHighlights",
    name: "Remove highlight marks",
    desc: "==text== becomes text.",
  },
  {
    option: "removeTags",
    name: "Remove tags",
    desc: "Inline #tags. Scene numbers like #12# are kept.",
  },
];

const CLEAN_EXPORT_PREFIX = "cleanExport.";

export const DEFAULT_SETTINGS: FirstDraftSettings = {
  activateFountainFiles: true,
  activateFrontmatter: true,
  autocompleteEnabled: true,
  smartTabEnabled: true,
  editorLayout: "screenplay",
  bottomTypingMargin: 40,
  screenplayFont: "Courier Prime",
  screenplayFontCustom: "",
  renderFountainCodeBlocks: false,
  sceneTypeMinimumLetters: 2,
  sceneTypeMatchCase: false,
  recentItemsWeighting: 0.65,
  maximumSuggestions: 8,
  preferredSceneTypes: DEFAULT_SCENE_TYPES,
  preferredTimesOfDay: DEFAULT_TIMES_OF_DAY,
  preferredSlugModifiers: DEFAULT_SLUG_MODIFIERS,
  statusBarEnabled: true,
  showEstimatedPages: true,
  showCurrentPage: true,
  showEstimatedRuntime: true,
  showWordCount: true,
  showSceneCount: true,
  pageSize: "us-letter",
  pdfLanguage: "zh-Hans",
  minutesPerPage: 1,
  updateDelayMs: 300,
  characterFolder: "Characters",
  characterTemplate: "",
  cleanExport: { ...DEFAULT_CLEAN_EXPORT_OPTIONS },
};

function valuesFromText(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSettingKey(key: string): key is keyof FirstDraftSettings {
  return key in DEFAULT_SETTINGS;
}

/** Settings sections, in order, by control key. */
const SETTING_GROUPS: { heading: string; keys: string[] }[] = [
  {
    heading: "Screenplay mode",
    keys: ["activateFountainFiles", "activateFrontmatter"],
  },
  {
    heading: "Editor",
    keys: [
      "editorLayout",
      "screenplayFont",
      "screenplayFontCustom",
      "bottomTypingMargin",
      "smartTabEnabled",
      "renderFountainCodeBlocks",
    ],
  },
  {
    heading: "Autocomplete",
    keys: [
      "autocompleteEnabled",
      "recentItemsWeighting",
      "sceneTypeMinimumLetters",
      "sceneTypeMatchCase",
      "maximumSuggestions",
      "preferredSceneTypes",
      "preferredTimesOfDay",
      "preferredSlugModifiers",
    ],
  },
  {
    heading: "Status bar",
    keys: [
      "statusBarEnabled",
      "showEstimatedPages",
      "showCurrentPage",
      "showEstimatedRuntime",
      "showWordCount",
      "showSceneCount",
    ],
  },
  {
    heading: "Pages, runtime and PDF",
    keys: ["pageSize", "minutesPerPage", "pdfLanguage"],
  },
  {
    heading: "Character pages",
    keys: ["characterFolder", "characterTemplate"],
  },
];

function definitionKey(item: SettingDefinitionItem): string | undefined {
  const control = (item as { control?: { key?: string } }).control;
  return control?.key;
}

/**
 * Sort flat setting definitions into headed groups. Existing groups (such
 * as Clean Fountain export) are kept as they are, and anything not listed in
 * SETTING_GROUPS lands in an "Other" group so no setting is lost.
 */
export function groupSettings(
  items: SettingDefinitionItem[],
): SettingDefinitionItem[] {
  const byKey = new Map<string, SettingDefinitionItem>();
  const groups: SettingDefinitionItem[] = [];
  const other: SettingDefinitionItem[] = [];
  for (const item of items) {
    const key = definitionKey(item);
    if ("type" in item && (item.type === "group" || item.type === "list")) {
      groups.push(item);
    } else if (key !== undefined) {
      byKey.set(key, item);
    } else {
      other.push(item);
    }
  }
  const grouped = SETTING_GROUPS.map(({ heading, keys }) => ({
    type: "group" as const,
    heading,
    items: keys.flatMap((key) => {
      const item = byKey.get(key);
      byKey.delete(key);
      return item ? [item as SettingGroupItem] : [];
    }),
  })).filter((group) => group.items.length > 0);
  const rest = [...byKey.values(), ...other] as SettingGroupItem[];
  return [
    ...grouped,
    ...groups,
    ...(rest.length > 0
      ? [{ type: "group" as const, heading: "Other", items: rest }]
      : []),
  ];
}

export class FirstDraftSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: FirstDraftPlugin,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        cls: "firstdraft-settings-search",
        items: [
          {
            name: "Search settings",
            searchable: false,
            render: (setting) => {
              setting.settingEl.addClass("firstdraft-settings-search-row");
              setting.infoEl.remove();
              setting.addSearch((search) => {
                search.setPlaceholder("Type to find a setting…");
                search.setValue(this.query);
                search.onChange((value) => {
                  this.query = value;
                  this.filterSettings();
                });
                search.inputEl.addClass("firstdraft-settings-search-input");
              });
              // Reapply the search after each re-render of the tab.
              window.setTimeout(() => this.filterSettings(), 0);
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Hotkeys",
        items: [
          {
            name: "Set hotkeys",
            desc: 'Open Settings > Hotkeys showing only this plugin\'s commands, e.g. "Set line 1: Scene heading".',
            aliases: ["keyboard", "shortcut", "keys"],
            action: () => this.openPluginHotkeys(),
          },
        ],
      },
      ...groupSettings(this.flatDefinitions()),
    ];
  }

  /** Open Settings > Hotkeys filtered to this plugin's commands. */
  private openPluginHotkeys(): void {
    const setting = (
      this.app as unknown as {
        setting?: {
          openTabById(id: string): unknown;
        };
      }
    ).setting;
    const tab = setting?.openTabById("hotkeys") as
      | {
          searchComponent?: {
            setValue(value: string): void;
            inputEl?: HTMLInputElement;
          };
        }
      | undefined;
    const search = tab?.searchComponent;
    if (!search) return;
    search.setValue(this.plugin.manifest.name);
    search.inputEl?.dispatchEvent(new Event("input"));
  }

  /** Current text in the settings search box. */
  private query = "";

  /** Hide settings (and whole groups) that do not match the search text. */
  private filterSettings(): void {
    const words = this.query.toLocaleLowerCase().split(/\s+/u).filter(Boolean);
    for (const group of Array.from(
      this.containerEl.querySelectorAll<HTMLElement>(".setting-group"),
    )) {
      if (group.hasClass("firstdraft-settings-search")) continue;
      let shown = 0;
      for (const item of Array.from(
        group.querySelectorAll<HTMLElement>(".setting-items > .setting-item"),
      )) {
        const heading = group.querySelector(
          ".setting-group-heading, .setting-item-heading",
        );
        const text =
          `${heading?.textContent ?? ""} ${item.textContent ?? ""}`.toLocaleLowerCase();
        const match = words.every((word) => text.includes(word));
        item.toggleClass("firstdraft-hidden", !match);
        if (match) shown += 1;
      }
      group.toggleClass("firstdraft-hidden", shown === 0);
    }
  }

  private flatDefinitions(): SettingDefinitionItem[] {
    const templatesFolder = coreTemplatesFolder(this.app);
    return [
      {
        name: "Open .fountain files in screenplay mode",
        desc: "Automatically activate First Draft for Fountain files.",
        control: {
          type: "toggle",
          key: "activateFountainFiles",
          defaultValue: DEFAULT_SETTINGS.activateFountainFiles,
        },
      },
      {
        name: "Use screenplay frontmatter",
        desc: "Activate First Draft for Markdown notes with screenplay: true.",
        control: {
          type: "toggle",
          key: "activateFrontmatter",
          defaultValue: DEFAULT_SETTINGS.activateFrontmatter,
        },
      },
      {
        name: "Status bar",
        desc: "Show current screenplay measurements in the status bar.",
        control: {
          type: "toggle",
          key: "statusBarEnabled",
          defaultValue: DEFAULT_SETTINGS.statusBarEnabled,
        },
      },
      {
        name: "Show estimated pages",
        desc: "Include the approximate formatted screenplay length.",
        control: {
          type: "toggle",
          key: "showEstimatedPages",
          defaultValue: DEFAULT_SETTINGS.showEstimatedPages,
        },
      },
      {
        name: "Show current page",
        desc: 'Show roughly which page the cursor is on, e.g. "p. 34 of ~77". Estimated for this note, the same way as the page count.',
        control: {
          type: "toggle",
          key: "showCurrentPage",
          defaultValue: DEFAULT_SETTINGS.showCurrentPage,
        },
      },
      {
        name: "Show estimated runtime",
        desc: "Include runtime derived from pages and the ratio below.",
        control: {
          type: "toggle",
          key: "showEstimatedRuntime",
          defaultValue: DEFAULT_SETTINGS.showEstimatedRuntime,
        },
      },
      {
        name: "Show word count",
        desc: "Include screenplay words in the status bar.",
        control: {
          type: "toggle",
          key: "showWordCount",
          defaultValue: DEFAULT_SETTINGS.showWordCount,
        },
      },
      {
        name: "Show scene count",
        desc: "Include detected scene headings in the status bar.",
        control: {
          type: "toggle",
          key: "showSceneCount",
          defaultValue: DEFAULT_SETTINGS.showSceneCount,
        },
      },
      {
        name: "Page size",
        desc: "Formatting assumption used for estimated pages.",
        control: {
          type: "dropdown",
          key: "pageSize",
          options: { "us-letter": "US Letter", a4: "A4" },
          defaultValue: DEFAULT_SETTINGS.pageSize,
        },
      },
      {
        name: "PDF language",
        desc: 'Regional character forms for Chinese, Japanese and Korean PDFs. First run "Install offline CJK PDF fonts" on this device. Horizontal layout only; does not translate text.',
        control: {
          type: "dropdown",
          key: "pdfLanguage",
          options: PDF_LANGUAGES,
          defaultValue: DEFAULT_SETTINGS.pdfLanguage,
        },
      },
      {
        name: "Minutes per page",
        desc: "Runtime estimate ratio. The screenplay convention is 1.0.",
        control: {
          type: "slider",
          key: "minutesPerPage",
          min: 0.5,
          max: 2,
          step: 0.1,
          defaultValue: DEFAULT_SETTINGS.minutesPerPage,
          displayFormat: (value) => value.toFixed(1),
        },
      },
      {
        name: "Editor layout",
        desc: "Screenplay layout indents and aligns each element as it prints (centered character names, narrow dialogue, right-aligned transitions) in a monospace font. Plain Fountain text keeps Obsidian's normal look. Display only: the note text is the same either way.",
        control: {
          type: "dropdown",
          key: "editorLayout",
          options: {
            screenplay: "Screenplay layout",
            plain: "Plain Fountain text",
          },
          defaultValue: DEFAULT_SETTINGS.editorLayout,
        },
      },
      {
        name: "Screenplay font",
        desc: "Font for screenplay notes in the editor (both layouts) and for rendered Fountain code blocks. Lists the fonts found on this device. PDF export and the page preview always use Courier.",
        control: {
          type: "dropdown",
          key: "screenplayFont",
          options: screenplayFontOptions(
            installedFonts([...COURIER_FONTS, ...OTHER_FONTS]),
            this.plugin.settings.screenplayFont,
          ),
          defaultValue: DEFAULT_SETTINGS.screenplayFont,
        },
      },
      {
        name: "Custom screenplay font",
        desc: 'Used when Screenplay font is "Custom…". A font installed on this device; list fallbacks with commas, e.g. "Courier Prime, Courier New, monospace".',
        control: {
          type: "text",
          key: "screenplayFontCustom",
          placeholder: "Courier Prime",
          defaultValue: DEFAULT_SETTINGS.screenplayFontCustom,
        },
      },
      {
        name: "Bottom typing margin",
        desc: "Leave this much empty space at the bottom of the editor in screenplay notes, so the status bar never covers text. 0 turns it off.",
        control: {
          type: "slider",
          key: "bottomTypingMargin",
          min: 0,
          max: 200,
          step: 10,
          defaultValue: DEFAULT_SETTINGS.bottomTypingMargin,
          displayFormat: (value) => `${value} px`,
        },
      },
      {
        name: "Render Fountain code blocks",
        desc: "Display ```fountain code blocks with screenplay formatting (indented characters, dialogue, transitions) in all notes, not only in screenplay-mode files. When off, Fountain code blocks display as plain code. Re-open affected notes after changing.",
        control: {
          type: "toggle",
          key: "renderFountainCodeBlocks",
          defaultValue: DEFAULT_SETTINGS.renderFountainCodeBlocks,
        },
      },
      {
        name: "Autocomplete",
        desc: "Suggest screenplay elements while typing in Screenplay Mode.",
        control: {
          type: "toggle",
          key: "autocompleteEnabled",
          defaultValue: DEFAULT_SETTINGS.autocompleteEnabled,
        },
      },
      {
        name: "Recent-item weighting",
        desc: "Balance frequency (left) against recency (right).",
        control: {
          type: "slider",
          key: "recentItemsWeighting",
          min: 0,
          max: 1,
          step: 0.05,
          defaultValue: DEFAULT_SETTINGS.recentItemsWeighting,
          displayFormat: (value) => value.toFixed(2),
        },
      },
      {
        name: "Scene type suggestions start after",
        desc: "Letters typed at the start of a new block before INT., EXT. and other scene types are suggested. Example: with 2, typing in shows INT.",
        control: {
          type: "slider",
          key: "sceneTypeMinimumLetters",
          min: 1,
          max: 5,
          step: 1,
          defaultValue: DEFAULT_SETTINGS.sceneTypeMinimumLetters,
          displayFormat: (value) =>
            `${value} ${value === 1 ? "letter" : "letters"}`,
        },
      },
      {
        name: "Match case for scene type suggestions",
        desc: "Only suggest scene types when the letters typed match their case. On: E shows EXT., but ext shows nothing. Off: ext shows EXT.",
        control: {
          type: "toggle",
          key: "sceneTypeMatchCase",
          defaultValue: DEFAULT_SETTINGS.sceneTypeMatchCase,
        },
      },
      {
        name: "Maximum autocomplete suggestions",
        desc: "Limit the number of First Draft suggestions shown at once.",
        control: {
          type: "slider",
          key: "maximumSuggestions",
          min: 3,
          max: 20,
          step: 1,
          defaultValue: DEFAULT_SETTINGS.maximumSuggestions,
          displayFormat: (value) => String(value),
        },
      },
      {
        name: "Smart Tab and Enter",
        desc: 'At the end of a line, Tab inserts the next Fountain element: after a character or dialogue line, a new () line; after a scene heading, " - " and times of day, or a blank line once complete; after action, a blank line and the character list. Enter after dialogue starts a new speaker, Enter after a transition starts a slugline, Enter after a scene heading or at the end of an action paragraph adds a blank line, and Shift+Enter is a plain line break.',
        control: {
          type: "toggle",
          key: "smartTabEnabled",
          defaultValue: DEFAULT_SETTINGS.smartTabEnabled,
        },
      },
      {
        name: "Character pages folder",
        desc: "Folder relative to the screenplay or project note. Start with / for a vault-relative folder; projects can override it with character-folder.",
        control: {
          type: "text",
          key: "characterFolder",
          placeholder: "Characters",
          defaultValue: DEFAULT_SETTINGS.characterFolder,
          validate: (value) =>
            value.trim() && value.trim() !== "/"
              ? undefined
              : "Choose a folder name other than the vault root.",
        },
      },
      {
        name: "Character page template",
        desc: `Note used for new character pages. Type to search ${templatesFolder ? `your templates folder (${templatesFolder}) and its subfolders` : "your vault (set a folder in the core Templates plugin to narrow this)"}. Placeholders: {{character}}, {{cue}}, {{project}}, {{project_link}}, {{screenplay}}, {{title}}, {{date}}, {{time}}. Leave empty for the built-in template.`,
        control: {
          type: "file",
          key: "characterTemplate",
          placeholder: templatesFolder
            ? `${templatesFolder}/…`
            : "Search for a template note",
          defaultValue: DEFAULT_SETTINGS.characterTemplate,
          filter: (file) => isTemplateCandidate(file, templatesFolder),
        },
      },
      {
        type: "group",
        heading: "Clean Fountain export",
        items: CLEAN_EXPORT_SETTINGS.map(({ option, name, desc, choices }) => {
          const key = `${CLEAN_EXPORT_PREFIX}${option}`;
          const defaultValue = DEFAULT_CLEAN_EXPORT_OPTIONS[option];
          return {
            name,
            desc,
            control: choices
              ? {
                  type: "dropdown" as const,
                  key,
                  options: choices,
                  defaultValue: String(defaultValue),
                }
              : {
                  type: "toggle" as const,
                  key,
                  defaultValue: defaultValue === true,
                },
          };
        }),
      },
      {
        name: "Preferred scene types",
        desc: "Comma-separated values shown by New Scene, in order.",
        control: {
          type: "textarea",
          key: "preferredSceneTypes",
          rows: 2,
          validate: (value) =>
            valuesFromText(value).length > 0
              ? undefined
              : "Enter at least one scene type.",
        },
      },
      {
        name: "Preferred times of day",
        desc: "Comma-separated values shown by New Scene, in order.",
        control: {
          type: "textarea",
          key: "preferredTimesOfDay",
          rows: 3,
          validate: (value) =>
            valuesFromText(value).length > 0
              ? undefined
              : "Enter at least one time of day.",
        },
      },
      {
        name: "Preferred slug modifiers",
        desc: 'Comma-separated values offered after the time of day, as in "EXT. HIGHWAY - DAY (FLASHBACK)". Tab after the time opens the list; modifiers used in the script are added.',
        control: {
          type: "textarea",
          key: "preferredSlugModifiers",
          rows: 2,
          validate: (value) =>
            valuesFromText(value).length > 0
              ? undefined
              : "Enter at least one slug modifier.",
        },
      },
    ];
  }

  getControlValue(key: string): unknown {
    if (key.startsWith(CLEAN_EXPORT_PREFIX)) {
      const option = key.slice(CLEAN_EXPORT_PREFIX.length);
      const options = normalizeCleanExportOptions(
        this.plugin.settings.cleanExport as unknown as Record<string, unknown>,
      );
      return option in options
        ? options[option as keyof CleanExportOptions]
        : undefined;
    }
    if (!isSettingKey(key)) return undefined;
    const value = this.plugin.settings[key];
    return Array.isArray(value) ? value.join(", ") : value;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key.startsWith(CLEAN_EXPORT_PREFIX)) {
      const option = key.slice(CLEAN_EXPORT_PREFIX.length);
      if (!(option in DEFAULT_CLEAN_EXPORT_OPTIONS)) return;
      const updated = normalizeCleanExportOptions({
        ...normalizeCleanExportOptions(
          this.plugin.settings.cleanExport as unknown as Record<
            string,
            unknown
          >,
        ),
        [option]: value,
      });
      this.plugin.settings.cleanExport = updated;
      await this.plugin.saveSettings();
      return;
    }
    if (!isSettingKey(key)) return;

    if (
      key === "preferredSceneTypes" ||
      key === "preferredTimesOfDay" ||
      key === "preferredSlugModifiers"
    ) {
      if (typeof value !== "string") return;
      const values = valuesFromText(value);
      if (values.length === 0) return;
      this.plugin.settings[key] = values;
    } else if (key === "characterFolder") {
      if (typeof value !== "string") return;
      const folder = value.trim().replace(/\/+$/gu, "");
      if (!folder || folder === "/") return;
      this.plugin.settings.characterFolder = folder;
    } else if (key === "screenplayFont" || key === "screenplayFontCustom") {
      if (typeof value !== "string") return;
      this.plugin.settings[key] = value.trim();
      this.plugin.applyScreenplayFont();
    } else if (key === "characterTemplate") {
      if (typeof value !== "string") return;
      this.plugin.settings.characterTemplate = value.trim();
    } else if (key === "pageSize") {
      if (value !== "us-letter" && value !== "a4") return;
      this.plugin.settings.pageSize = value;
    } else if (key === "editorLayout") {
      if (value !== "screenplay" && value !== "plain") return;
      this.plugin.settings.editorLayout = value;
    } else if (key === "pdfLanguage") {
      if (!isPdfLanguage(value)) return;
      this.plugin.settings.pdfLanguage = value;
    } else if (typeof DEFAULT_SETTINGS[key] === "boolean") {
      if (typeof value !== "boolean") return;
      this.setBooleanSetting(key, value);
    } else if (typeof DEFAULT_SETTINGS[key] === "number") {
      if (typeof value !== "number") return;
      this.setNumberSetting(key, value);
    } else {
      return;
    }

    await this.plugin.saveSettings();
    if (key === "editorLayout" || key === "bottomTypingMargin") {
      this.app.workspace.updateOptions();
    }
    if (
      key === "activateFountainFiles" ||
      key === "activateFrontmatter" ||
      key === "statusBarEnabled" ||
      key === "showEstimatedPages" ||
      key === "showCurrentPage" ||
      key === "showEstimatedRuntime" ||
      key === "showWordCount" ||
      key === "showSceneCount" ||
      key === "pageSize" ||
      key === "minutesPerPage"
    ) {
      this.plugin.refreshStatus();
    }
  }

  private setBooleanSetting(
    key: keyof FirstDraftSettings,
    value: boolean,
  ): void {
    switch (key) {
      case "activateFountainFiles":
      case "activateFrontmatter":
      case "autocompleteEnabled":
      case "smartTabEnabled":
      case "renderFountainCodeBlocks":
      case "sceneTypeMatchCase":
      case "statusBarEnabled":
      case "showEstimatedPages":
      case "showCurrentPage":
      case "showEstimatedRuntime":
      case "showWordCount":
      case "showSceneCount":
        this.plugin.settings[key] = value;
    }
  }

  private setNumberSetting(key: keyof FirstDraftSettings, value: number): void {
    switch (key) {
      case "recentItemsWeighting":
      case "maximumSuggestions":
      case "minutesPerPage":
      case "updateDelayMs":
        this.plugin.settings[key] = value;
        break;
      case "sceneTypeMinimumLetters":
        this.plugin.settings[key] = Math.max(1, Math.round(value));
        break;
      case "bottomTypingMargin":
        this.plugin.settings[key] = Math.min(
          200,
          Math.max(0, Math.round(value)),
        );
    }
  }
}
