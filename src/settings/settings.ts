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

import {
  COURIER_FONTS,
  OTHER_FONTS,
  installedFonts,
  screenplayFontOptions,
} from "../editor/screenplayFont";
import { PluginSettingTab } from "obsidian";
import type {
  App,
  Setting,
  SettingDefinitionItem,
  SettingGroupItem,
} from "obsidian";
import type ScribidianPlugin from "../main";
import {
  DEFAULT_ENTER_TARGETS,
  ENTER_SOURCE_ROWS,
  ENTER_TARGET_OPTIONS,
  isEnterTarget,
  normalizeEnterTargets,
  type EnterTargets,
} from "../editor/enterTargets";
import {
  DEFAULT_CLEAN_EXPORT_OPTIONS,
  normalizeCleanExportOptions,
  type CleanExportOptions,
} from "../export/fountain";
import { coreTemplatesFolder, isTemplateCandidate } from "../characters/vault";
import type { PageSize } from "../screenplay/model";
import {
  DEFAULT_SLUG_MODIFIERS,
  DEFAULT_SCENE_TYPES,
  DEFAULT_TIMES_OF_DAY,
} from "../screenplay/fountain";

/** Editor look for screenplay notes. */
export type EditorLayout = "screenplay" | "plain";

export interface ScribidianSettings {
  activateFountainFiles: boolean;
  activateFrontmatter: boolean;
  autocompleteEnabled: boolean;
  smartTabEnabled: boolean;
  /** Typing settings, set separately for script and plain mode. */
  capitalizeLineStartsScript: boolean;
  capitalizeLineStartsPlain: boolean;
  uppercaseTransitionsScript: boolean;
  uppercaseTransitionsPlain: boolean;
  uppercaseSluglinesScript: boolean;
  uppercaseSluglinesPlain: boolean;
  /** Strict cursor placement: keep the cursor off the blank line between two elements. */
  lockBlankLinesScript: boolean;
  lockBlankLinesPlain: boolean;
  /** What Enter starts at the end of each element (script mode). */
  enterTargets: EnterTargets;
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
    desc: "Task checkboxes: lines starting - [ ] or - [x].",
  },
  {
    option: "wikilinks",
    name: "Links to other notes",
    desc: "Links like [[Note|alias]]: keep them, keep just the text, or remove them.",
    choices: LINK_CHOICES,
  },
  {
    option: "removeEmbeds",
    name: "Remove embeds",
    desc: "Embedded images and notes, like ![[image.png]].",
  },
  {
    option: "markdownLinks",
    name: "Web links",
    desc: "Links like [text](https://...): keep them, keep just the text, or remove them.",
    choices: LINK_CHOICES,
  },
  {
    option: "codeBlocks",
    name: "Code blocks",
    desc: "Blocks fenced with ``` or ~~~: keep them, keep just what's inside, or remove them.",
    choices: {
      keep: "Keep as written",
      unwrap: "Keep the content only",
      remove: "Remove entirely",
    },
  },
  {
    option: "removeHeadings",
    name: "Remove headings",
    desc: "Heading lines (# Heading). In Fountain these are sections, such as acts.",
  },
  {
    option: "removeComments",
    name: "Remove comments",
    desc: "Obsidian comments: %% comment %%.",
  },
  {
    option: "removeCallouts",
    name: "Remove callouts",
    desc: "Callout boxes: > [!note] and the lines under them.",
  },
  {
    option: "removeFootnotes",
    name: "Remove footnotes",
    desc: "Footnotes: [^1] and the lines that define them.",
  },
  {
    option: "removeBlockIds",
    name: "Remove block link markers",
    desc: "Markers at the end of a line, like ^abc123. A lone ^ (dual dialogue) is kept.",
  },
  {
    option: "removeHighlights",
    name: "Remove highlights",
    desc: "==text== becomes text.",
  },
  {
    option: "removeTags",
    name: "Remove tags",
    desc: "Tags like #idea. Scene numbers like #12# are kept.",
  },
];

const CLEAN_EXPORT_PREFIX = "cleanExport.";

export const DEFAULT_SETTINGS: ScribidianSettings = {
  activateFountainFiles: true,
  activateFrontmatter: true,
  autocompleteEnabled: true,
  smartTabEnabled: true,
  capitalizeLineStartsScript: true,
  capitalizeLineStartsPlain: false,
  uppercaseTransitionsScript: true,
  uppercaseTransitionsPlain: false,
  uppercaseSluglinesScript: true,
  uppercaseSluglinesPlain: false,
  lockBlankLinesScript: true,
  lockBlankLinesPlain: false,
  enterTargets: { ...DEFAULT_ENTER_TARGETS },
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

/**
 * Settings as stored, brought up to date. Before 0.1.1 there was one
 * "capitalizeLineStarts" switch for both modes; it now sets script mode only.
 */
export function migrateSettings(
  stored: Record<string, unknown> | null,
): ScribidianSettings {
  const { capitalizeLineStarts, ...rest } = stored ?? {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(rest as Partial<ScribidianSettings>),
  };
  settings.enterTargets = normalizeEnterTargets(rest.enterTargets);
  // PDF export was removed; drop its old setting.
  delete (settings as Record<string, unknown>).pdfLanguage;
  if (
    typeof capitalizeLineStarts === "boolean" &&
    typeof rest.capitalizeLineStartsScript !== "boolean"
  ) {
    settings.capitalizeLineStartsScript = capitalizeLineStarts;
  }
  return settings;
}

function isSettingKey(key: string): key is keyof ScribidianSettings {
  return key in DEFAULT_SETTINGS;
}

type TypingChangeKey =
  | "capitalizeLineStartsScript"
  | "capitalizeLineStartsPlain"
  | "uppercaseSluglinesScript"
  | "uppercaseSluglinesPlain"
  | "uppercaseTransitionsScript"
  | "uppercaseTransitionsPlain"
  | "lockBlankLinesScript"
  | "lockBlankLinesPlain";

/** Rows of the "Typing in each mode" table: one switch per mode. */
export const TYPING_CHANGE_ROWS: {
  name: string;
  desc: string;
  plain: TypingChangeKey;
  script: TypingChangeKey;
}[] = [
  {
    name: "Capitalize the first letter of each line",
    desc: '"she runs" becomes "She runs". Lines that start with a symbol, like a wryly\'s "(", and lines in code blocks are left alone.',
    plain: "capitalizeLineStartsPlain",
    script: "capitalizeLineStartsScript",
  },
  {
    name: "Uppercase sluglines as you type",
    desc: '"int. kitchen - day" becomes "INT. KITCHEN - DAY", including lines forced with a leading period.',
    plain: "uppercaseSluglinesPlain",
    script: "uppercaseSluglinesScript",
  },
  {
    name: "Uppercase transitions as you type",
    desc: 'Text typed on a forced transition line ("> cut to") becomes uppercase.',
    plain: "uppercaseTransitionsPlain",
    script: "uppercaseTransitionsScript",
  },
  {
    name: "Strict cursor placement",
    desc: "The cursor never rests on the single blank line that separates two elements, so typing can't join them by accident. Arrow keys and clicks skip it, and Backspace on an extra empty line lands at the end of the line above. Backspace and Delete never join two different elements, like a cue and its dialogue; Shift+Backspace joins them anyway. Enter still makes room for a new element.",
    plain: "lockBlankLinesPlain",
    script: "lockBlankLinesScript",
  },
];

const TYPING_CHANGES_NAME = "Typing in each mode";
const ENTER_TARGETS_NAME = "What Enter starts after each element";
/** Placeholder keys that put the tables in their settings sections. */
const TYPING_CHANGES_KEY = "typingChangesTable";
const ENTER_TARGETS_KEY = "enterTargetsTable";
const HOTKEYS_NAME = "Keyboard shortcuts";
const HOTKEYS_KEY = "hotkeysAction";
const ADVANCED_NAME = "Advanced settings";
const ADVANCED_KEY = "advancedToggle";
const MORE_SUGGESTIONS_NAME = "More suggestion settings";
const MORE_SUGGESTIONS_KEY = "moreSuggestionsToggle";
/** Items without a control, placed in their section by name. */
const NAMED_ITEM_KEYS: Record<string, string> = {
  [TYPING_CHANGES_NAME]: TYPING_CHANGES_KEY,
  [ENTER_TARGETS_NAME]: ENTER_TARGETS_KEY,
  [HOTKEYS_NAME]: HOTKEYS_KEY,
  [ADVANCED_NAME]: ADVANCED_KEY,
  [MORE_SUGGESTIONS_NAME]: MORE_SUGGESTIONS_KEY,
};

/**
 * Settings sections, in order, by control key. Sections marked `last` go
 * after built-in groups such as Clean Fountain export.
 */
const SETTING_GROUPS: {
  heading: string;
  keys: string[];
  cls?: string;
  last?: boolean;
}[] = [
  {
    heading: "Getting started",
    keys: ["activateFountainFiles", "activateFrontmatter", HOTKEYS_KEY],
  },
  {
    heading: "Writing",
    keys: [
      "editorLayout",
      "screenplayFont",
      "screenplayFontCustom",
      "smartTabEnabled",
      "bottomTypingMargin",
    ],
  },
  {
    heading: "Typing in each mode",
    keys: [TYPING_CHANGES_KEY],
  },
  {
    heading: "Enter key",
    keys: [ENTER_TARGETS_KEY],
  },
  {
    heading: "Suggestions",
    keys: [
      "autocompleteEnabled",
      "maximumSuggestions",
      "preferredSceneTypes",
      "preferredTimesOfDay",
      "preferredSlugModifiers",
      MORE_SUGGESTIONS_KEY,
      "recentItemsWeighting",
      "sceneTypeMinimumLetters",
      "sceneTypeMatchCase",
    ],
  },
  {
    heading: "Page count and status bar",
    keys: [
      "statusBarEnabled",
      "showEstimatedPages",
      "showCurrentPage",
      "showEstimatedRuntime",
      "showWordCount",
      "showSceneCount",
      "pageSize",
      "minutesPerPage",
    ],
  },
  {
    heading: "Character pages",
    keys: ["characterFolder", "characterTemplate"],
  },
  {
    heading: "Advanced",
    last: true,
    keys: [ADVANCED_KEY, "renderFountainCodeBlocks"],
  },
];

function definitionKey(item: SettingDefinitionItem): string | undefined {
  const control = (item as { control?: { key?: string } }).control;
  if (control?.key) return control.key;
  const name = (item as { name?: string }).name;
  return name === undefined ? undefined : NAMED_ITEM_KEYS[name];
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
  const grouped = SETTING_GROUPS.map(({ heading, keys, cls, last }) => ({
    group: {
      type: "group" as const,
      heading,
      ...(cls ? { cls } : {}),
      items: keys.flatMap((key) => {
        const item = byKey.get(key);
        byKey.delete(key);
        return item ? [item as SettingGroupItem] : [];
      }),
    },
    last: last === true,
  })).filter(({ group }) => group.items.length > 0);
  const rest = [...byKey.values(), ...other] as SettingGroupItem[];
  return [
    ...grouped.filter(({ last }) => !last).map(({ group }) => group),
    ...groups,
    ...grouped.filter(({ last }) => last).map(({ group }) => group),
    ...(rest.length > 0
      ? [{ type: "group" as const, heading: "Other", items: rest }]
      : []),
  ];
}

export class ScribidianSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: ScribidianPlugin,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        cls: "scribidian-settings-search",
        items: [
          {
            name: "Search settings",
            searchable: false,
            render: (setting) => {
              setting.settingEl.addClass("scribidian-settings-search-row");
              setting.infoEl.remove();
              setting.addSearch((search) => {
                search.setPlaceholder("Type to find a setting…");
                search.setValue(this.query);
                search.onChange((value) => {
                  this.query = value;
                  this.filterSettings();
                });
                search.inputEl.addClass("scribidian-settings-search-input");
              });
              // Reapply the search after each re-render of the tab.
              window.setTimeout(() => this.filterSettings(), 0);
            },
          },
        ],
      },
      ...groupSettings(this.flatDefinitions()),
    ];
  }

  /**
   * Draw the text-change switches as a table: one row per change, one
   * checkbox column per editor mode, and a header checkbox per column that
   * turns that whole mode on or off.
   */
  private renderTypingChanges(setting: Setting): void {
    setting.settingEl.addClass("scribidian-settings-table-row");
    setting.infoEl.remove();
    setting.controlEl.remove();
    const settings = this.plugin.settings;
    const table = setting.settingEl.createEl("table", {
      cls: "scribidian-settings-table scribidian-typing-table",
    });
    const head = table.createEl("thead").createEl("tr");
    head.createEl("th", { text: "Setting" });
    const body = table.createEl("tbody");
    const columns = [
      { mode: "plain", title: "Plain" },
      { mode: "script", title: "Script" },
    ] as const;
    const boxes = {
      plain: [] as HTMLInputElement[],
      script: [] as HTMLInputElement[],
    };
    const masters = {} as Record<"plain" | "script", HTMLInputElement>;

    const syncMaster = (mode: "plain" | "script"): void => {
      const values = TYPING_CHANGE_ROWS.map((row) => settings[row[mode]]);
      const all = values.every(Boolean);
      masters[mode].checked = all;
      masters[mode].indeterminate = !all && values.some(Boolean);
    };

    for (const { mode, title } of columns) {
      const label = head
        .createEl("th", { cls: "scribidian-typing-mode" })
        .createEl("label");
      const master = label.createEl("input", { type: "checkbox" });
      master.setAttr(
        "aria-label",
        `Turn all ${title.toLowerCase()} mode changes on or off`,
      );
      label.createSpan({ text: title });
      masters[mode] = master;
      master.addEventListener("change", () => {
        const on = master.checked;
        for (const [index, row] of TYPING_CHANGE_ROWS.entries()) {
          settings[row[mode]] = on;
          const box = boxes[mode][index];
          if (box) box.checked = on;
        }
        syncMaster(mode);
        void this.plugin.saveSettings();
      });
    }

    for (const row of TYPING_CHANGE_ROWS) {
      const tr = body.createEl("tr");
      const info = tr.createEl("td", { cls: "scribidian-typing-info" });
      info.createDiv({ cls: "setting-item-name", text: row.name });
      info.createDiv({ cls: "setting-item-description", text: row.desc });
      for (const { mode, title } of columns) {
        const key = row[mode];
        const box = tr
          .createEl("td", { cls: "scribidian-typing-mode" })
          .createEl("input", { type: "checkbox" });
        box.checked = settings[key];
        box.setAttr("aria-label", `${title} mode: ${row.name}`);
        boxes[mode].push(box);
        box.addEventListener("change", () => {
          settings[key] = box.checked;
          syncMaster(mode);
          void this.plugin.saveSettings();
        });
      }
    }
    syncMaster("plain");
    syncMaster("script");
  }

  /** Keys of the "show more" rows that are currently open. */
  private readonly openMore = new Set<string>();

  /**
   * A row with a button that shows or hides the settings after it in the
   * same section. Searching shows matching hidden settings anyway.
   */
  private renderMoreToggle(setting: Setting, key: string): void {
    setting.settingEl.addClass("scribidian-more-toggle");
    const advanced = key === ADVANCED_KEY;
    if (advanced) {
      setting.setName(ADVANCED_NAME);
      setting.setDesc(
        "Fine-tuning for code blocks. Most writers never need these.",
      );
    } else {
      setting.settingEl.addClass("scribidian-more-toggle-plain");
    }
    const [closed, open] = advanced
      ? ["Show", "Hide"]
      : ["Show more", "Show less"];
    const button = advanced
      ? setting.controlEl.createEl("button")
      : setting.infoEl.createEl("button", {
          cls: "scribidian-settings-table-more",
        });
    const update = (): void => {
      const isOpen = this.openMore.has(key);
      button.setText(isOpen ? open : closed);
      setting.settingEl
        .closest(".setting-group")
        ?.toggleClass("scribidian-more-open", isOpen);
    };
    button.addEventListener("click", () => {
      if (!this.openMore.delete(key)) this.openMore.add(key);
      update();
    });
    window.setTimeout(update, 0);
  }

  /** Whether the Enter table shows its less common rows. */
  private showAllEnterRows: boolean | null = null;

  /**
   * Draw the Enter settings as a table: one row per element with a dropdown
   * of what Enter starts after it. Less common rows sit behind "Show more"
   * (shown anyway when one of them is changed from its default).
   */
  private renderEnterTargets(setting: Setting): void {
    setting.settingEl.addClass("scribidian-settings-table-row");
    setting.infoEl.remove();
    setting.controlEl.remove();
    const targets = this.plugin.settings.enterTargets;
    setting.settingEl.createDiv({
      cls: "setting-item-description scribidian-settings-table-note",
      text: "What pressing Enter at the end of a line starts next. Script mode only, with Smart Tab and Enter on. Shift+Enter is always a plain line break.",
    });
    const table = setting.settingEl.createEl("table", {
      cls: "scribidian-settings-table scribidian-enter-table",
    });
    const head = table.createEl("thead").createEl("tr");
    head.createEl("th", { text: "Element" });
    head.createEl("th", { text: "Enter starts" });
    const body = table.createEl("tbody");
    const moreRows: HTMLElement[] = [];
    this.showAllEnterRows ??= ENTER_SOURCE_ROWS.some(
      (row) =>
        row.more && targets[row.source] !== DEFAULT_ENTER_TARGETS[row.source],
    );
    for (const row of ENTER_SOURCE_ROWS) {
      const tr = body.createEl("tr");
      if (row.more) moreRows.push(tr);
      tr.createEl("td", { cls: "setting-item-name", text: row.name });
      const select = tr.createEl("td").createEl("select", { cls: "dropdown" });
      select.setAttr(
        "aria-label",
        `After ${row.name.toLowerCase()}, Enter starts`,
      );
      for (const [value, label] of Object.entries(ENTER_TARGET_OPTIONS)) {
        select.createEl("option", { value, text: label });
      }
      select.value = targets[row.source];
      select.addEventListener("change", () => {
        if (!isEnterTarget(select.value)) return;
        targets[row.source] = select.value;
        void this.plugin.saveSettings();
      });
    }
    const button = setting.settingEl.createEl("button", {
      cls: "scribidian-settings-table-more",
    });
    const update = (): void => {
      for (const tr of moreRows) {
        tr.toggleClass("scribidian-hidden", !this.showAllEnterRows);
      }
      button.setText(this.showAllEnterRows ? "Show less" : "Show more");
    };
    button.addEventListener("click", () => {
      this.showAllEnterRows = !this.showAllEnterRows;
      update();
    });
    update();
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
      if (group.hasClass("scribidian-settings-search")) continue;
      group.toggleClass("scribidian-searching", words.length > 0);
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
        item.toggleClass("scribidian-hidden", !match);
        if (match) shown += 1;
      }
      group.toggleClass("scribidian-hidden", shown === 0);
    }
  }

  private flatDefinitions(): SettingDefinitionItem[] {
    const templatesFolder = coreTemplatesFolder(this.app);
    return [
      {
        name: "Open .fountain files as screenplays",
        desc: "Files ending in .fountain open with Scribidian's screenplay tools.",
        control: {
          type: "toggle",
          key: "activateFountainFiles",
          defaultValue: DEFAULT_SETTINGS.activateFountainFiles,
        },
      },
      {
        name: "Turn on for notes marked as screenplays",
        desc: "Ordinary notes with screenplay: true in their properties get the screenplay tools. The command Use this note as a screenplay adds it for you.",
        control: {
          type: "toggle",
          key: "activateFrontmatter",
          defaultValue: DEFAULT_SETTINGS.activateFrontmatter,
        },
      },
      {
        name: "Show screenplay stats in the status bar",
        desc: "Page count, runtime, words and scenes at the bottom of the window. Choose which below.",
        control: {
          type: "toggle",
          key: "statusBarEnabled",
          defaultValue: DEFAULT_SETTINGS.statusBarEnabled,
        },
      },
      {
        name: "Estimated pages",
        desc: "Roughly how many printed pages the script fills.",
        control: {
          type: "toggle",
          key: "showEstimatedPages",
          defaultValue: DEFAULT_SETTINGS.showEstimatedPages,
        },
      },
      {
        name: "Current page",
        desc: "Which page the cursor is on, for example p. 34 of ~77.",
        control: {
          type: "toggle",
          key: "showCurrentPage",
          defaultValue: DEFAULT_SETTINGS.showCurrentPage,
        },
      },
      {
        name: "Estimated runtime",
        desc: "Worked out from the page count and the minutes per page below.",
        control: {
          type: "toggle",
          key: "showEstimatedRuntime",
          defaultValue: DEFAULT_SETTINGS.showEstimatedRuntime,
        },
      },
      {
        name: "Word count",
        desc: "Words in the script.",
        control: {
          type: "toggle",
          key: "showWordCount",
          defaultValue: DEFAULT_SETTINGS.showWordCount,
        },
      },
      {
        name: "Scene count",
        desc: "Counts the sluglines.",
        control: {
          type: "toggle",
          key: "showSceneCount",
          defaultValue: DEFAULT_SETTINGS.showSceneCount,
        },
      },
      {
        name: "Page size",
        desc: "US Letter or A4. Used for page counts and the preview.",
        control: {
          type: "dropdown",
          key: "pageSize",
          options: { "us-letter": "US Letter", a4: "A4" },
          defaultValue: DEFAULT_SETTINGS.pageSize,
        },
      },
      {
        name: "Minutes per page",
        desc: "Used for the estimated runtime. The usual rule of thumb is one minute per page.",
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
        name: "Editor mode",
        desc: "Script mode lays your script out like the printed page and helps as you type. Plain mode keeps Obsidian's normal look and leaves your typing alone, though suggestions and Smart Tab still work. Your text is the same either way. Switch any time with the command Screenplay: Toggle script and plain mode.",
        control: {
          type: "dropdown",
          key: "editorLayout",
          options: {
            screenplay: "Script mode (screenplay layout)",
            plain: "Plain mode (Fountain text)",
          },
          defaultValue: DEFAULT_SETTINGS.editorLayout,
        },
      },
      {
        name: "Screenplay font",
        desc: "The font for scripts in the editor. The page preview always uses Courier, like a printed script.",
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
        desc: "Used when Screenplay font is set to Custom. Type the name of a font installed on this device. You can add backups after commas, for example Courier Prime, Courier New.",
        control: {
          type: "text",
          key: "screenplayFontCustom",
          placeholder: "Courier Prime",
          defaultValue: DEFAULT_SETTINGS.screenplayFontCustom,
        },
      },
      {
        name: "Bottom typing margin",
        desc: "Empty space below the last line, so the status bar never covers what you're typing. 0 turns it off.",
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
        name: "Show fountain code blocks as a script",
        desc: "In any note, a code block marked fountain shows with screenplay formatting. When off, it shows as plain code. Reopen notes after changing this.",
        control: {
          type: "toggle",
          key: "renderFountainCodeBlocks",
          defaultValue: DEFAULT_SETTINGS.renderFountainCodeBlocks,
        },
      },
      {
        name: "Suggestions while typing",
        desc: "Suggest character names, places, times of day and more as you type in a script.",
        control: {
          type: "toggle",
          key: "autocompleteEnabled",
          defaultValue: DEFAULT_SETTINGS.autocompleteEnabled,
        },
      },
      {
        name: "Suggestion order",
        desc: "Left puts what you use most at the top of the list; right puts what you used last.",
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
        name: "Letters before scene types are suggested",
        desc: "How many letters you type at the start of a line before INT., EXT. and other scene types are suggested. With 2, typing in shows INT.",
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
        name: "Scene type suggestions match capitals",
        desc: "On: E shows EXT., but e doesn't. Off: either does.",
        control: {
          type: "toggle",
          key: "sceneTypeMatchCase",
          defaultValue: DEFAULT_SETTINGS.sceneTypeMatchCase,
        },
      },
      {
        name: "Maximum suggestions",
        desc: "The most suggestions shown at once.",
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
        name: HOTKEYS_NAME,
        desc: "Set keyboard shortcuts for Scribidian's commands, such as Set line to slugline.",
        aliases: ["hotkeys", "keyboard", "shortcut", "keys"],
        action: () => this.openPluginHotkeys(),
      },
      {
        name: ADVANCED_NAME,
        searchable: false,
        render: (setting) => this.renderMoreToggle(setting, ADVANCED_KEY),
      },
      {
        name: MORE_SUGGESTIONS_NAME,
        searchable: false,
        render: (setting) =>
          this.renderMoreToggle(setting, MORE_SUGGESTIONS_KEY),
      },
      {
        name: TYPING_CHANGES_NAME,
        searchable: false,
        render: (setting) => this.renderTypingChanges(setting),
      },
      {
        name: ENTER_TARGETS_NAME,
        searchable: false,
        render: (setting) => this.renderEnterTargets(setting),
      },
      {
        name: "Smart Tab and Enter",
        desc: "Tab moves you on to the next likely element: a wryly under a character, the time of day after a slugline, a character after action. In script mode Enter does the same; choose what it starts under Enter key. Turn off to make Tab and Enter work as normal.",
        control: {
          type: "toggle",
          key: "smartTabEnabled",
          defaultValue: DEFAULT_SETTINGS.smartTabEnabled,
        },
      },
      {
        name: "Character pages folder",
        desc: "Where new character pages go, starting from the screenplay's folder. Start with / to start from the top of your vault instead. A screenplay project can set its own folder with character-folder.",
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
        desc: `A note to start new character pages from. Leave empty to use the built-in one. Type to search ${templatesFolder ? `your templates folder (${templatesFolder})` : "your vault (setting a folder in the core Templates plugin narrows this)"}. In the template, these are filled in for you: {{character}}, {{cue}}, {{title}}, {{screenplay}}, {{project}}, {{project_link}}, {{date}}, {{time}}.`,
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
        heading: "Clean Fountain export: what to strip out",
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
        name: "Scene types",
        desc: "Suggested at the start of a slugline, in this order. Separate them with commas.",
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
        name: "Times of day",
        desc: "Suggested after the place in a slugline, in this order. Separate them with commas.",
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
        name: "Slug modifiers",
        desc: "Extra notes suggested after the time of day, like (FLASHBACK) in EXT. HIGHWAY - DAY (FLASHBACK). Separate them with commas. Ones you use in the script are added automatically.",
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
    key: keyof ScribidianSettings,
    value: boolean,
  ): void {
    switch (key) {
      case "activateFountainFiles":
      case "activateFrontmatter":
      case "autocompleteEnabled":
      case "smartTabEnabled":
      case "capitalizeLineStartsScript":
      case "capitalizeLineStartsPlain":
      case "uppercaseTransitionsScript":
      case "uppercaseTransitionsPlain":
      case "uppercaseSluglinesScript":
      case "uppercaseSluglinesPlain":
      case "lockBlankLinesScript":
      case "lockBlankLinesPlain":
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

  private setNumberSetting(key: keyof ScribidianSettings, value: number): void {
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
