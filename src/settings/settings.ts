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
import { Modal, Notice, PluginSettingTab, Setting, setIcon } from "obsidian";
import { triggerProblem } from "../editor/triggers";
import {
  DEFAULT_SLUG_SUGGESTION_ORDER,
  slugOrder,
  type SlugSuggestionKind,
} from "../editor/completionEngine";
import type { App, SettingDefinitionItem, SettingGroupItem } from "obsidian";
import type ScribidianPlugin from "../main";
import {
  DEFAULT_ENTER_TARGETS,
  DEFAULT_TAB_TARGETS,
  ENTER_SOURCE_ROWS,
  ENTER_TARGET_OPTIONS,
  isEnterTarget,
  normalizeEnterTargets,
  DEFAULT_TAB_INSIDE,
  DEFAULT_TAB_INSIDE_PLAIN,
  DEFAULT_ENTER_INSIDE,
  DEFAULT_ENTER_INSIDE_PLAIN,
  ENTER_INSIDE_LABELS,
  ENTER_INSIDE_OPTIONS,
  normalizeEnterInside,
  type EnterInsideActions,
  normalizeTabInside,
  TAB_INSIDE_LABELS,
  tabInsideOptions,
  type EnterTargets,
  type EnterSource,
  type TabInsideActions,
} from "../editor/enterTargets";
import {
  DEFAULT_CLEAN_EXPORT_OPTIONS,
  DEFAULT_CLEAN_EXPORT_OPTIONS_FDX,
  DEFAULT_CLEAN_EXPORT_OPTIONS_PDF,
  normalizeCleanExportOptions,
  type CleanExportOptions,
} from "../export/fountain";
import { coreTemplatesFolder, isTemplateCandidate } from "../characters/vault";
import type { PageSize } from "../screenplay/model";
import {
  DEFAULT_PDF_BOLD,
  normalizePdfBold,
  PDF_BOLD_SETTINGS,
} from "../export/pdfStyle";
import type { PdfBoldOptions, PdfBoldPart } from "../export/pdfStyle";
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
  smartEnterEnabled: boolean;
  showAllCommands: boolean;
  /** Commands the writer showed or hid in the palette, by id (#296). */
  commandVisibility: Record<string, boolean>;
  /**
   * Settings sections and sub-sections left open ("Section" or
   * "Section/Sub"), or null before the writer opens or closes any (#306).
   */
  openSettingSections: string[] | null;
  indentActionWithSpaces: boolean;
  /** Typing settings, set separately for script and plain mode. */
  capitalizeLineStartsScript: boolean;
  capitalizeLineStartsPlain: boolean;
  capitalizeSentencesScript: boolean;
  capitalizeSentencesPlain: boolean;
  uppercaseTransitionsScript: boolean;
  uppercaseTransitionsPlain: boolean;
  uppercaseCharactersScript: boolean;
  uppercaseCharactersPlain: boolean;
  highlightVariablesScript: boolean;
  highlightVariablesPlain: boolean;
  uppercaseSluglinesScript: boolean;
  uppercaseSluglinesPlain: boolean;
  /** Strict cursor placement: keep the cursor off the blank line between two elements. */
  lockBlankLinesScript: boolean;
  lockBlankLinesPlain: boolean;
  /** What Enter starts at the end of each element (script mode). */
  enterTargets: EnterTargets;
  /** What Tab starts at the end of each element. */
  tabTargets: EnterTargets;
  /** What Tab does with the cursor inside each element. */
  /** Tab inside a line, set separately for script and plain mode. */
  tabInsideScript: TabInsideActions;
  tabInsidePlain: TabInsideActions;
  /** Shift+Tab inside a slugline or cue: select the part before (#287). */
  shiftTabInsideScript: ShiftTabInside;
  shiftTabInsidePlain: ShiftTabInside;
  /** Enter inside a line, set separately for script and plain mode. */
  enterInsideScript: EnterInsideActions;
  enterInsidePlain: EnterInsideActions;
  /**
   * Tab with a suggestion list open, script mode only: "pick" takes the
   * highlighted item, "move" closes the list and moves on as if it were
   * not open.
   */
  tabWithListScript: TabWithList;
  /**
   * Strict, script mode: Backspace on the empty line in the cue column
   * first makes it action (on), or deletes it at once as Fade In does (off).
   */
  backspaceEmptyCueToAction: boolean;
  /**
   * Strict, script mode: Enter at the end of a cue with its speech below
   * moves the cursor to the line below (on), or adds an empty dialogue line
   * under the cue as Fade In does (off).
   */
  enterAfterCueMovesDown: boolean;
  /** Tab at the start of dialogue with text adds "()" above (off: Fade In). */
  tabAtDialogueStartAddsWryly: boolean;
  editorLayout: EditorLayout;
  bottomTypingMargin: number;
  screenplayFont: string;
  screenplayFontCustom: string;
  renderFountainCodeBlocks: boolean;
  sceneTypeMinimumLetters: number;
  sceneTypeMatchCase: boolean;
  characterMatchCase: boolean;
  namesInAction: boolean;
  /** Where Link scene headings puts the outline link (#292). */
  outlineLinkPlacement: "heading" | "slugline";
  /** Threads ([&name]): spool, suggestions, clicks, panel (#298). */
  threadsEnabled: boolean;
  /** How a thread shows in the editor (#298). */
  threadDisplay: ThreadDisplay;
  /** Typing "&&" in a screenplay becomes "[&" (#299). */
  threadAmpersands: boolean;
  /** Color of thread text and the raw mark; "" = the theme's orange. */
  threadColor: string;
  /** Completr's suggestion popup stays closed in screenplay notes (#271). */
  quietCompletrInScripts: boolean;
  /** Extensions the script uses come before (V.O.), (O.S.) and the rest. */
  customExtensionsFirst: boolean;
  /** Typed before a variable's name: "$" by default. */
  variablePrefix: string;
  /** Typed in action to list the characters: "+" by default. */
  characterMentionPrefix: string;
  /**
   * "+" groups also match loosely (#305): spaces and commas skipped, the
   * start of each name in turn ("+zg" for Zorana and George).
   */
  fuzzyCharacterGroups: boolean;
  recentItemsWeighting: number;
  maximumSuggestions: number;
  preferredSceneTypes: string[];
  preferredTimesOfDay: string[];
  preferredSlugModifiers: string[];
  /** The location list also offers each location's last whole slug. */
  offerFullSlugs: boolean;
  /** With full slugs on: which of a location's two items comes first. */
  slugSuggestionOrder: SlugSuggestionKind[];
  /** Picking a location fills in its last time (#284). */
  slugFillTime: boolean;
  /** Picking a location fills in its last modifier (#284). */
  slugFillModifier: boolean;
  statusBarEnabled: boolean;
  showEstimatedPages: boolean;
  showCurrentPage: boolean;
  showEstimatedRuntime: boolean;
  showWordCount: boolean;
  showSceneCount: boolean;
  /** The element the cursor is on (Action, Dialogue…) in the status bar. */
  showCurrentElement: boolean;
  pageSize: PageSize;
  minutesPerPage: number;
  updateDelayMs: number;
  characterFolder: string;
  characterTemplate: string;
  /** What "Export to clean Fountain" removes. */
  cleanExport: CleanExportOptions;
  /** What "Export clean PDF" (and the page preview) removes. */
  cleanExportPdf: CleanExportOptions;
  /** What "Export to clean Final Draft FDX" removes. */
  cleanExportFdx: CleanExportOptions;
  /** Fountain export: "!" in front of capitals Scribidian reads as action. */
  markCapitalsAsAction: boolean;
  /** PDF export (and the page preview): which parts print in bold. */
  pdfBold: PdfBoldOptions;
  /** PDF export and preview: (CONT'D) for a speaker who continues. */
  pdfContinued: boolean;
  /** Color of line comments ("// note") in the editor; "" for the theme's. */
  lineCommentColor: string;
}

/** The formats with a clean export, each with its own Clean export column. */
export type CleanExportFormat = "fountain" | "pdf" | "fdx";

const CLEAN_EXPORT_KEYS: Record<
  CleanExportFormat,
  "cleanExport" | "cleanExportPdf" | "cleanExportFdx"
> = { fountain: "cleanExport", pdf: "cleanExportPdf", fdx: "cleanExportFdx" };

/** What a clean export to `format` removes. */
export function cleanExportFor(
  settings: ScribidianSettings,
  format: CleanExportFormat,
): CleanExportOptions {
  return normalizeCleanExportOptions(
    settings[CLEAN_EXPORT_KEYS[format]] as unknown as Record<string, unknown>,
    CLEAN_EXPORT_DEFAULTS[format],
  );
}

const CLEAN_EXPORT_DEFAULTS: Record<CleanExportFormat, CleanExportOptions> = {
  fountain: DEFAULT_CLEAN_EXPORT_OPTIONS,
  pdf: DEFAULT_CLEAN_EXPORT_OPTIONS_PDF,
  fdx: DEFAULT_CLEAN_EXPORT_OPTIONS_FDX,
};

const CLEAN_EXPORT_COLUMNS: { format: CleanExportFormat; title: string }[] = [
  { format: "fountain", title: "Fountain" },
  { format: "pdf", title: "PDF" },
  { format: "fdx", title: "Final Draft" },
];

const CLEAN_EXPORT_NAME = "What each clean export removes";
const CLEAN_EXPORT_KEY = "cleanExportTable";

/** Clean export rows, in the order shown in settings. */

const CLEAN_EXPORT_SETTINGS: {
  option: keyof CleanExportOptions;
  name: string;
  desc: string;
  /** Dropdown choices; options without them are toggles. */
  choices?: Record<string, string>;
  /** Fewer choices for some formats. */
  choicesFor?: Partial<Record<CleanExportFormat, Record<string, string>>>;
  /**
   * Formats where the export does this anyway, so the cell is fixed (with
   * the reason as its tooltip).
   */
  fixed?: Partial<Record<CleanExportFormat, string>>;
}[] = [
  {
    option: "removeTasks",
    name: "Remove tasks",
    desc: "Task checkboxes: lines starting - [ ] or - [x].",
  },
  {
    option: "wikilinks",
    name: "Wikilinks",
    desc: "Links like [[File name|alias]]. Alias: the alias, or the file name when there is none ([[File name]] becomes File name). File name: always the file name. Keep: as written.",
    choices: {
      alias: "Alias",
      file: "File name",
      keep: "Keep",
      remove: "Remove",
    },
  },
  {
    option: "embeds",
    name: "Embeds",
    desc: "Embedded notes and images, like ![[Scene notes]] or ![[image.png]]. Include text: the embedded note's text goes into the export where the embed is (a heading or block embed brings just that part), cleaned like the script, and embeds inside it up to three levels; an embed inside a sentence stays on that line. Images are left out for now.",
    choices: {
      remove: "Remove",
      include: "Include text",
      keep: "Keep",
    },
  },
  {
    option: "markdownLinks",
    name: "Web links",
    desc: "Links like [name](https://...). Name: just the name. Link: just the address. Keep: as written.",
    choices: {
      name: "Name",
      link: "Link",
      keep: "Keep",
      remove: "Remove",
    },
  },
  {
    option: "codeBlocks",
    name: "Code blocks",
    desc: "Blocks fenced with ``` or ~~~: keep them, keep just what's inside, or remove them.",
    choices: {
      keep: "Keep",
      unwrap: "Content only",
      remove: "Remove",
    },
  },
  {
    option: "removeHeadings",
    name: "Remove headings",
    desc: "Heading lines (# Heading). In Fountain these are sections, such as acts: an outline that never prints.",
    fixed: {
      pdf: "Sections never print, so the PDF always leaves them out.",
      fdx: "The Final Draft export can't include sections yet (roadmap #278).",
    },
  },
  {
    option: "removeSynopses",
    name: "Remove synopses",
    desc: "Fountain synopses: lines starting with = (= She finds the key). They never print.",
    fixed: {
      pdf: "Synopses never print, so the PDF always leaves them out.",
      fdx: "The Final Draft export can't include synopses yet (roadmap #278).",
    },
  },
  {
    option: "removeBoneyard",
    name: "Remove boneyard",
    desc: "Fountain's hidden text: /* ... */. Fountain apps ignore it; Final Draft has no boneyard, so keeping it there (or in the PDF) prints it as script.",
  },
  {
    option: "comments",
    name: "Comments",
    desc: "Obsidian comments: %% comment %%, on one line or across several. Other apps would show them as script. Note: a Fountain note, [[like this]], which Fountain apps show as a note and never print. Boneyard: /* like this */, which they ignore.",
    choices: {
      keep: "Keep",
      note: "Note [[ ]]",
      boneyard: "Boneyard /* */",
      remove: "Remove",
    },
    choicesFor: {
      pdf: { keep: "Keep", remove: "Remove" },
      fdx: { keep: "Keep", remove: "Remove" },
    },
  },
  {
    option: "lineComments",
    name: "Line comments",
    desc: "Text after // at the end of a line, shown faded in the editor; other apps would show it as script. Note: a Fountain note, [[like this]], which Fountain apps show as a note and never print. Boneyard: /* like this */, which they ignore.",
    choices: {
      keep: "Keep",
      note: "Note [[ ]]",
      boneyard: "Boneyard /* */",
      remove: "Remove",
    },
    choicesFor: {
      pdf: { keep: "Keep", remove: "Remove" },
      fdx: { keep: "Keep", remove: "Remove" },
    },
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

const PDF_BOLD_PREFIX = "pdfBold.";

export const DEFAULT_SETTINGS: ScribidianSettings = {
  activateFountainFiles: true,
  activateFrontmatter: true,
  autocompleteEnabled: true,
  smartTabEnabled: true,
  smartEnterEnabled: true,
  showAllCommands: false,
  commandVisibility: {},
  openSettingSections: null,
  tabWithListScript: "pick",
  backspaceEmptyCueToAction: true,
  enterAfterCueMovesDown: true,
  tabAtDialogueStartAddsWryly: true,
  indentActionWithSpaces: true,
  capitalizeLineStartsScript: true,
  capitalizeLineStartsPlain: false,
  capitalizeSentencesScript: true,
  capitalizeSentencesPlain: false,
  uppercaseTransitionsScript: true,
  uppercaseTransitionsPlain: false,
  uppercaseCharactersScript: true,
  uppercaseCharactersPlain: false,
  highlightVariablesScript: true,
  highlightVariablesPlain: true,
  uppercaseSluglinesScript: true,
  uppercaseSluglinesPlain: false,
  lockBlankLinesScript: true,
  lockBlankLinesPlain: false,
  enterTargets: { ...DEFAULT_ENTER_TARGETS },
  tabTargets: { ...DEFAULT_TAB_TARGETS },
  tabInsideScript: { ...DEFAULT_TAB_INSIDE },
  tabInsidePlain: { ...DEFAULT_TAB_INSIDE_PLAIN },
  shiftTabInsideScript: "previous-part",
  shiftTabInsidePlain: "nothing",
  enterInsideScript: { ...DEFAULT_ENTER_INSIDE },
  enterInsidePlain: { ...DEFAULT_ENTER_INSIDE_PLAIN },
  editorLayout: "screenplay",
  bottomTypingMargin: 40,
  screenplayFont: "Courier Prime",
  screenplayFontCustom: "",
  renderFountainCodeBlocks: false,
  sceneTypeMinimumLetters: 2,
  sceneTypeMatchCase: false,
  characterMatchCase: true,
  namesInAction: true,
  quietCompletrInScripts: true,
  outlineLinkPlacement: "heading",
  threadsEnabled: true,
  threadDisplay: "right",
  threadAmpersands: true,
  threadColor: "",
  customExtensionsFirst: false,
  variablePrefix: "$",
  characterMentionPrefix: "+",
  fuzzyCharacterGroups: true,
  recentItemsWeighting: 0.65,
  maximumSuggestions: 8,
  preferredSceneTypes: DEFAULT_SCENE_TYPES,
  preferredTimesOfDay: DEFAULT_TIMES_OF_DAY,
  preferredSlugModifiers: DEFAULT_SLUG_MODIFIERS,
  offerFullSlugs: false,
  slugSuggestionOrder: [...DEFAULT_SLUG_SUGGESTION_ORDER],
  slugFillTime: true,
  slugFillModifier: true,
  statusBarEnabled: true,
  showEstimatedPages: true,
  showCurrentPage: true,
  showEstimatedRuntime: true,
  showWordCount: true,
  showSceneCount: true,
  showCurrentElement: false,
  pageSize: "us-letter",
  minutesPerPage: 1,
  updateDelayMs: 300,
  characterFolder: "Characters",
  characterTemplate: "",
  cleanExport: { ...DEFAULT_CLEAN_EXPORT_OPTIONS },
  cleanExportPdf: { ...DEFAULT_CLEAN_EXPORT_OPTIONS_PDF },
  cleanExportFdx: { ...DEFAULT_CLEAN_EXPORT_OPTIONS_FDX },
  pdfBold: { ...DEFAULT_PDF_BOLD },
  pdfContinued: true,
  lineCommentColor: "",
  markCapitalsAsAction: true,
};

/**
 * Settings where Scribidian's default differs from Fade In, with Fade In's
 * value. For a future "Use Fade In behavior" preset button; each such
 * setting says "Off is Fade In's behavior" in its description.
 */
export const FADE_IN_DEFAULTS: Partial<ScribidianSettings> = {
  backspaceEmptyCueToAction: false,
  enterAfterCueMovesDown: false,
  tabAtDialogueStartAddsWryly: false,
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
export type TabWithList = "pick" | "move";

/** What Shift+Tab does inside a slugline or character cue (#287). */
export type ShiftTabInside = "previous-part" | "nothing";

/**
 * How a thread shows (#298): its text then the spool (default), the spool
 * then its text, the spool only, or the text only.
 */
export type ThreadDisplay = "left" | "right" | "icon" | "text";

function isThreadDisplay(value: unknown): value is ThreadDisplay {
  return (
    value === "left" ||
    value === "right" ||
    value === "icon" ||
    value === "text"
  );
}

const SHIFT_TAB_INSIDE_LABELS: Record<ShiftTabInside, string> = {
  "previous-part": "Previous part",
  nothing: "Nothing",
};

export const TAB_WITH_LIST_LABELS: Record<TabWithList, string> = {
  pick: "Picks the highlighted item",
  move: "Moves to the next element",
};

function isTabWithList(value: unknown): value is TabWithList {
  return value === "pick" || value === "move";
}

export function migrateSettings(
  stored: Record<string, unknown> | null,
): ScribidianSettings {
  const { capitalizeLineStarts, tabInside, ...rest } = stored ?? {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(rest as Partial<ScribidianSettings>),
  };
  settings.enterTargets = normalizeEnterTargets(rest.enterTargets);
  settings.pdfBold = normalizePdfBold(rest.pdfBold);
  // Clean export had one set of options for every format; each format
  // starts from it (#277).
  settings.cleanExport = normalizeCleanExportOptions(
    rest.cleanExport as Record<string, unknown> | undefined,
  );
  settings.cleanExportPdf = normalizeCleanExportOptions(
    (rest.cleanExportPdf ?? rest.cleanExport) as
      Record<string, unknown> | undefined,
    DEFAULT_CLEAN_EXPORT_OPTIONS_PDF,
  );
  settings.cleanExportFdx = normalizeCleanExportOptions(
    (rest.cleanExportFdx ?? rest.cleanExport) as
      Record<string, unknown> | undefined,
    DEFAULT_CLEAN_EXPORT_OPTIONS_FDX,
  );
  settings.tabTargets = normalizeEnterTargets(
    rest.tabTargets,
    DEFAULT_TAB_TARGETS,
  );
  // "Tab inside a line" was one table for both modes; it now sets script
  // mode, and plain mode starts with Obsidian's Tab.
  settings.tabInsideScript = normalizeTabInside(
    rest.tabInsideScript ?? tabInside,
  );
  settings.tabInsidePlain = normalizeTabInside(
    rest.tabInsidePlain,
    DEFAULT_TAB_INSIDE_PLAIN,
  );
  settings.enterInsideScript = normalizeEnterInside(rest.enterInsideScript);
  settings.enterInsidePlain = normalizeEnterInside(
    rest.enterInsidePlain,
    DEFAULT_ENTER_INSIDE_PLAIN,
  );
  for (const key of ["shiftTabInsideScript", "shiftTabInsidePlain"] as const) {
    if (rest[key] !== "previous-part" && rest[key] !== "nothing") {
      settings[key] = DEFAULT_SETTINGS[key];
    }
  }
  if (
    rest.outlineLinkPlacement !== "heading" &&
    rest.outlineLinkPlacement !== "slugline"
  ) {
    settings.outlineLinkPlacement = DEFAULT_SETTINGS.outlineLinkPlacement;
  }
  if (!isThreadDisplay(rest.threadDisplay)) {
    settings.threadDisplay = DEFAULT_SETTINGS.threadDisplay;
  }
  if (
    typeof rest.commandVisibility !== "object" ||
    rest.commandVisibility === null ||
    Array.isArray(rest.commandVisibility)
  ) {
    settings.commandVisibility = {};
  }
  if (
    !Array.isArray(rest.openSettingSections) ||
    !rest.openSettingSections.every((item) => typeof item === "string")
  ) {
    settings.openSettingSections = null;
  }
  if (!isTabWithList(rest.tabWithListScript)) {
    settings.tabWithListScript = "pick";
  }
  // Smart Tab used to switch Enter's element logic too; Smart Enter now
  // has its own setting, starting from the old value.
  if (
    typeof rest.smartEnterEnabled !== "boolean" &&
    typeof rest.smartTabEnabled === "boolean"
  ) {
    settings.smartEnterEnabled = rest.smartTabEnabled;
  }
  // PDF export was removed; drop its old setting.
  delete (settings as Record<string, unknown>).pdfLanguage;
  if (
    typeof capitalizeLineStarts === "boolean" &&
    typeof rest.capitalizeLineStartsScript !== "boolean"
  ) {
    settings.capitalizeLineStartsScript = capitalizeLineStarts;
  }
  settings.slugSuggestionOrder = slugOrder(
    Array.isArray(settings.slugSuggestionOrder)
      ? settings.slugSuggestionOrder
      : undefined,
  );
  // Trigger characters: back to the defaults if unusable or the same.
  if (
    typeof settings.variablePrefix !== "string" ||
    triggerProblem(settings.variablePrefix, "") !== null
  ) {
    settings.variablePrefix = DEFAULT_SETTINGS.variablePrefix;
  }
  if (
    typeof settings.characterMentionPrefix !== "string" ||
    triggerProblem(settings.characterMentionPrefix, settings.variablePrefix) !==
      null
  ) {
    settings.characterMentionPrefix =
      settings.variablePrefix === DEFAULT_SETTINGS.characterMentionPrefix
        ? DEFAULT_SETTINGS.variablePrefix
        : DEFAULT_SETTINGS.characterMentionPrefix;
  }
  return settings;
}

function isSettingKey(key: string): key is keyof ScribidianSettings {
  return key in DEFAULT_SETTINGS;
}

type TypingChangeKey =
  | "capitalizeLineStartsScript"
  | "capitalizeLineStartsPlain"
  | "capitalizeSentencesScript"
  | "capitalizeSentencesPlain"
  | "uppercaseSluglinesScript"
  | "uppercaseSluglinesPlain"
  | "uppercaseTransitionsScript"
  | "uppercaseTransitionsPlain"
  | "uppercaseCharactersScript"
  | "uppercaseCharactersPlain"
  | "highlightVariablesScript"
  | "highlightVariablesPlain"
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
    name: "Capitalize the first letter of each sentence",
    desc: '"She runs. he follows." becomes "She runs. He follows." as you type. Not after an ellipsis ("Wait... what"), an abbreviation like "Mr." or "INT.", or an initial.',
    plain: "capitalizeSentencesPlain",
    script: "capitalizeSentencesScript",
  },
  {
    name: "Uppercase sluglines as you type",
    desc: '"int. kitchen - day" becomes "INT. KITCHEN - DAY", including lines forced with a leading period.',
    plain: "uppercaseSluglinesPlain",
    script: "uppercaseSluglinesScript",
  },
  {
    name: "Uppercase transitions as you type",
    desc: 'Text typed on a forced transition line ("> cut to") becomes uppercase. So does a short line on its own block once its "to:" is typed ("cut to:" becomes "CUT TO:").',
    plain: "uppercaseTransitionsPlain",
    script: "uppercaseTransitionsScript",
  },
  {
    name: "Uppercase character names as you type",
    desc: 'Text typed on a line in the character column (after Tab, or "Set line to character") becomes uppercase, even for a name not in the script yet: "jen" becomes "JEN".',
    plain: "uppercaseCharactersPlain",
    script: "uppercaseCharactersScript",
  },
  {
    name: "Highlight $ variables",
    desc: "Text after a $ sign, like $my_variable or $ABC123, shows in the accent color. Dollar amounts like $123, $123.12 or $1,123.12 don't.",
    plain: "highlightVariablesPlain",
    script: "highlightVariablesScript",
  },
  {
    name: "Strict cursor placement",
    desc: "The cursor never rests on the single blank line that separates two elements, so typing can't join them by accident. Arrow keys and clicks skip it, and Backspace on an extra empty line lands at the end of the line above. Backspace and Delete never join two different elements, like a cue and its dialogue; Shift+Backspace or Shift+Delete joins them anyway (with this off too). Enter still makes room for a new element.",
    plain: "lockBlankLinesPlain",
    script: "lockBlankLinesScript",
  },
];

const TYPING_CHANGES_NAME = "Typing in each mode";
const ENTER_TARGETS_NAME = "What Tab and Enter start after each element";
/** Placeholder keys that put the tables in their settings sections. */
const TYPING_CHANGES_KEY = "typingChangesTable";
const ENTER_TARGETS_KEY = "enterTargetsTable";
const HOTKEYS_NAME = "Keyboard shortcuts";
const HOTKEYS_KEY = "hotkeysAction";
const SLUG_ORDER_NAME = "Order of slug suggestions";
const SLUG_ORDER_KEY = "slugOrderList";
const COMMANDS_NAME = "Commands in the command palette";
const COMMANDS_KEY = "commandPaletteList";
const SLUG_FILL_NAME = "Picking a location fills in";
const SLUG_FILL_KEY = "slugFillChecks";
/** Items without a control, placed in their section by name. */
const NAMED_ITEM_KEYS: Record<string, string> = {
  [TYPING_CHANGES_NAME]: TYPING_CHANGES_KEY,
  [ENTER_TARGETS_NAME]: ENTER_TARGETS_KEY,
  [HOTKEYS_NAME]: HOTKEYS_KEY,
  [SLUG_ORDER_NAME]: SLUG_ORDER_KEY,
  [SLUG_FILL_NAME]: SLUG_FILL_KEY,
  [COMMANDS_NAME]: COMMANDS_KEY,
  [CLEAN_EXPORT_NAME]: CLEAN_EXPORT_KEY,
};

/** A sub-section heading inside a settings section (collapsible). */
interface SubSection {
  subsection: string;
}

/**
 * Settings sections, top to bottom from what every writer needs to the
 * niche (#306). Each section folds; `{ subsection }` starts a folding sub-section
 * that runs to the next one or the end. `master`: the section's on/off
 * setting; off dims the rest and puts "Off" on the header.
 */
export const SETTING_SECTIONS: {
  heading: string;
  keys: (string | SubSection)[];
  master?: keyof ScribidianSettings;
  /** Open the first time the tab is shown. */
  open?: boolean;
}[] = [
  {
    heading: "Getting started",
    open: true,
    keys: [
      "activateFountainFiles",
      "activateFrontmatter",
      HOTKEYS_KEY,
      { subsection: "Command palette" },
      COMMANDS_KEY,
    ],
  },
  {
    heading: "Look of the page",
    open: true,
    keys: [
      "editorLayout",
      "screenplayFont",
      "screenplayFontCustom",
      "bottomTypingMargin",
      "lineCommentColor",
      "threadColor",
    ],
  },
  {
    heading: "Typing helpers",
    keys: [
      "smartTabEnabled",
      "smartEnterEnabled",
      "tabAtDialogueStartAddsWryly",
      "backspaceEmptyCueToAction",
      "enterAfterCueMovesDown",
      "shiftTabInsideScript",
      "shiftTabInsidePlain",
      "indentActionWithSpaces",
      { subsection: "Tab and Enter, element by element" },
      ENTER_TARGETS_KEY,
      { subsection: "Automatic capitals and highlighting, per mode" },
      TYPING_CHANGES_KEY,
    ],
  },
  {
    heading: "Suggestions",
    master: "autocompleteEnabled",
    keys: [
      "autocompleteEnabled",
      "maximumSuggestions",
      "recentItemsWeighting",
      { subsection: "Sluglines" },
      "preferredSceneTypes",
      "preferredTimesOfDay",
      "preferredSlugModifiers",
      "sceneTypeMinimumLetters",
      "sceneTypeMatchCase",
      "offerFullSlugs",
      SLUG_ORDER_KEY,
      SLUG_FILL_KEY,
      { subsection: "Characters" },
      "characterMatchCase",
      "customExtensionsFirst",
    ],
  },
  {
    heading: "Character names in action",
    keys: ["namesInAction", "characterMentionPrefix", "fuzzyCharacterGroups"],
  },
  {
    heading: "Status bar",
    master: "statusBarEnabled",
    keys: [
      "statusBarEnabled",
      "showEstimatedPages",
      "showCurrentPage",
      "showEstimatedRuntime",
      "showWordCount",
      "showSceneCount",
      "showCurrentElement",
      "pageSize",
      "minutesPerPage",
    ],
  },
  {
    heading: "Export",
    keys: [
      { subsection: "PDF" },
      "pdfContinued",
      ...PDF_BOLD_SETTINGS.map(({ part }) => `${PDF_BOLD_PREFIX}${part}`),
      { subsection: "Fountain" },
      "markCapitalsAsAction",
      { subsection: "Clean export" },
      CLEAN_EXPORT_KEY,
    ],
  },
  {
    heading: "Outline",
    keys: ["outlineLinkPlacement"],
  },
  {
    heading: "Threads",
    master: "threadsEnabled",
    keys: ["threadsEnabled", "threadDisplay", "threadAmpersands"],
  },
  {
    heading: "Variables",
    keys: ["variablePrefix"],
  },
  {
    heading: "Character pages",
    keys: ["characterFolder", "characterTemplate"],
  },
  {
    heading: "Other plugins",
    keys: ["quietCompletrInScripts"],
  },
  {
    heading: "Advanced",
    keys: ["renderFountainCodeBlocks"],
  },
];

/**
 * The stored settings behind one control key: a table or list control
 * covers several, a PDF bold toggle is part of `pdfBold`. Used to count
 * and reset a section's changes.
 */
export function storedKeys(key: string): (keyof ScribidianSettings)[] {
  if (key === TYPING_CHANGES_KEY) {
    return TYPING_CHANGE_ROWS.flatMap((row) => [row.script, row.plain]);
  }
  if (key === ENTER_TARGETS_KEY) {
    return [
      "tabTargets",
      "enterTargets",
      "tabWithListScript",
      "tabInsideScript",
      "tabInsidePlain",
      "enterInsideScript",
      "enterInsidePlain",
    ];
  }
  if (key === SLUG_FILL_KEY) return ["slugFillTime", "slugFillModifier"];
  if (key === SLUG_ORDER_KEY) return ["slugSuggestionOrder"];
  if (key === CLEAN_EXPORT_KEY) return Object.values(CLEAN_EXPORT_KEYS);
  if (key === COMMANDS_KEY) return ["commandVisibility", "showAllCommands"];
  if (key.startsWith(PDF_BOLD_PREFIX)) return ["pdfBold"];
  return isSettingKey(key) ? [key] : [];
}

/** Stored settings of a section (or one sub-section), without repeats. */
function sectionStoredKeys(
  keys: readonly (string | SubSection)[],
): (keyof ScribidianSettings)[] {
  return [
    ...new Set(
      keys.flatMap((key) => (typeof key === "string" ? storedKeys(key) : [])),
    ),
  ];
}

/** True when a stored setting differs from its default. */
export function isChanged(
  settings: ScribidianSettings,
  key: keyof ScribidianSettings,
): boolean {
  return (
    JSON.stringify(settings[key]) !== JSON.stringify(DEFAULT_SETTINGS[key])
  );
}

function definitionKey(item: SettingDefinitionItem): string | undefined {
  const control = (item as { control?: { key?: string } }).control;
  if (control?.key) return control.key;
  const name = (item as { name?: string }).name;
  return name === undefined ? undefined : NAMED_ITEM_KEYS[name];
}

/**
 * Sort flat setting definitions into the sections of SETTING_SECTIONS.
 * Existing groups are kept after them, and anything not listed lands in an
 * "Other" section so no setting is lost. A sub-section heading becomes a
 * row of its own, marked for the tab to fold.
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
  const subRows = new WeakSet<SettingGroupItem>();
  const grouped = SETTING_SECTIONS.map(({ heading, keys }) => ({
    type: "group" as const,
    heading,
    cls: "scribidian-section",
    items: keys.flatMap((key): SettingGroupItem[] => {
      if (typeof key !== "string") {
        const row: SettingGroupItem = {
          name: key.subsection,
          searchable: false,
          render: (setting: Setting) => {
            setting.settingEl.addClass("scribidian-sub-toggle");
            setting.settingEl.dataset.sub = key.subsection;
            setting.setName(key.subsection);
          },
        };
        subRows.add(row);
        return [row];
      }
      const item = byKey.get(key);
      byKey.delete(key);
      return item ? [item as SettingGroupItem] : [];
    }),
  })).filter((group) => group.items.some((item) => !subRows.has(item)));
  const rest = [...byKey.values(), ...other] as SettingGroupItem[];
  return [
    ...grouped,
    ...groups,
    ...(rest.length > 0
      ? [
          {
            type: "group" as const,
            heading: "Other",
            cls: "scribidian-section",
            items: rest,
          },
        ]
      : []),
  ];
}

/** The control keys of one sub-section of a section (#306). */
function subSectionKeys(
  keys: readonly (string | SubSection)[],
  sub: string,
): string[] {
  const start = keys.findIndex(
    (key) => typeof key !== "string" && key.subsection === sub,
  );
  if (start === -1) return [];
  const out: string[] = [];
  for (const key of keys.slice(start + 1)) {
    if (typeof key !== "string") break;
    out.push(key);
  }
  return out;
}

/** Asks before a section's settings go back to their defaults. */
class ConfirmResetModal extends Modal {
  constructor(
    app: App,
    private readonly message: string,
    private readonly onConfirm: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Reset settings");
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText("Cancel").onClick(() => this.close()),
      )
      .addButton((button) =>
        button
          .setButtonText("Reset")
          .setDestructive()
          .onClick(() => {
            this.close();
            this.onConfirm();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ScribidianSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: ScribidianPlugin,
  ) {
    super(app, plugin);
    // Keep the "changed" counts current after any control changes.
    const refresh = (): void => {
      window.setTimeout(() => this.refreshBadges(), 50);
    };
    this.containerEl.addEventListener("change", refresh);
    this.containerEl.addEventListener("click", refresh);
  }

  /** Sections and sub-sections open now ("Section", "Section/Sub"). */
  private openSections(): Set<string> {
    return new Set(
      this.plugin.settings.openSettingSections ??
        SETTING_SECTIONS.filter((section) => section.open).map(
          (section) => section.heading,
        ),
    );
  }

  private saveOpenSections(open: Set<string>): void {
    this.plugin.settings.openSettingSections = [...open];
    void this.plugin.saveSettings();
  }

  /** Every section and sub-section, for Expand all. */
  private allSectionKeys(): string[] {
    return SETTING_SECTIONS.flatMap(({ heading, keys }) => [
      heading,
      ...keys.flatMap((key) =>
        typeof key === "string" ? [] : [`${heading}/${key.subsection}`],
      ),
    ]);
  }

  private sectionGroups(): HTMLElement[] {
    return Array.from(
      this.containerEl.querySelectorAll<HTMLElement>(
        ".setting-group.scribidian-section",
      ),
    );
  }

  /**
   * Make each section's heading and each sub-section row fold (#306):
   * a chevron, a click or Enter/Space to open or close, and badges.
   * Runs after every render; the open ones are remembered in settings.
   */
  private decorateSections(): void {
    for (const group of this.sectionGroups()) {
      const heading = group.querySelector<HTMLElement>(
        ":scope > .setting-item-heading",
      );
      if (heading === null) continue;
      const nameEl = heading.querySelector<HTMLElement>(".setting-item-name");
      // The heading's own text, without the chevron and badges added here.
      const title = Array.from(nameEl?.childNodes ?? [])
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim();
      group.dataset.section = title;
      heading.addClass("scribidian-section-heading");
      this.makeFoldable(heading, nameEl, title);
      if (heading.querySelector(".scribidian-section-badges") === null) {
        const badges = (nameEl ?? heading).createSpan({
          cls: "scribidian-section-badges",
        });
        badges.createSpan({ cls: "scribidian-badge scribidian-badge-off" });
        badges.createSpan({
          cls: "scribidian-badge scribidian-badge-changed",
        });
      }
      const spec = SETTING_SECTIONS.find(
        (section) => section.heading === title,
      );
      if (
        spec !== undefined &&
        heading.querySelector(".scribidian-section-reset") === null
      ) {
        const control =
          heading.querySelector<HTMLElement>(".setting-item-control") ??
          heading.createDiv({ cls: "setting-item-control" });
        const reset = control.createEl("button", {
          cls: "clickable-icon scribidian-section-reset",
          attr: { "aria-label": `Reset ${title} settings to their defaults` },
        });
        setIcon(reset, "rotate-ccw");
        reset.addEventListener("click", (event) => {
          event.stopPropagation();
          this.confirmReset(title, sectionStoredKeys(spec.keys));
        });
      }
      for (const row of Array.from(
        group.querySelectorAll<HTMLElement>(".scribidian-sub-toggle"),
      )) {
        const sub = row.dataset.sub ?? "";
        const subName = row.querySelector<HTMLElement>(".setting-item-name");
        this.makeFoldable(row, subName, `${title}/${sub}`);
        if (row.querySelector(".scribidian-badge-changed") === null) {
          (subName ?? row).createSpan({
            cls: "scribidian-badge scribidian-badge-changed",
          });
        }
      }
    }
    this.applyOpenState();
    this.refreshBadges();
  }

  /** Rows that already open and close on a click. */
  private readonly foldRows = new WeakSet<HTMLElement>();

  /**
   * A heading or sub row that opens and closes `key` when clicked. Safe to
   * call again after a re-render: listeners are added once per row, the
   * chevron whenever it is missing.
   */
  private makeFoldable(
    row: HTMLElement,
    nameEl: HTMLElement | null,
    key: string,
  ): void {
    row.addClass("scribidian-foldable");
    row.dataset.foldKey = key;
    row.setAttr("role", "button");
    row.setAttr("tabindex", "0");
    if (row.querySelector(".scribidian-fold-chevron") === null) {
      const chevron = createSpan({ cls: "scribidian-fold-chevron" });
      setIcon(chevron, "chevron-right");
      (nameEl ?? row).prepend(chevron);
    }
    if (this.foldRows.has(row)) return;
    this.foldRows.add(row);
    const toggle = (): void => {
      const target = row.dataset.foldKey ?? key;
      const open = this.openSections();
      if (!open.delete(target)) open.add(target);
      this.saveOpenSections(open);
      this.applyOpenState();
    };
    row.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).closest("button, input, select")) {
        return;
      }
      toggle();
    });
    row.addEventListener("keydown", (event) => {
      if (event.target !== row) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle();
    });
  }

  /** Show sections and sub-sections open or closed, as remembered. */
  private applyOpenState(): void {
    const open = this.openSections();
    for (const group of this.sectionGroups()) {
      const title = group.dataset.section ?? "";
      const isOpen = open.has(title);
      group.toggleClass("scribidian-collapsed", !isOpen);
      group
        .querySelector(":scope > .scribidian-foldable")
        ?.setAttr("aria-expanded", String(isOpen));
      let subOpen = true;
      for (const item of Array.from(
        group.querySelectorAll<HTMLElement>(".setting-items > .setting-item"),
      )) {
        if (item.hasClass("scribidian-sub-toggle")) {
          subOpen = open.has(`${title}/${item.dataset.sub ?? ""}`);
          item.setAttr("aria-expanded", String(subOpen));
          item.toggleClass("scribidian-sub-open", subOpen);
          continue;
        }
        item.toggleClass("scribidian-sub-hidden", !subOpen);
      }
    }
  }

  /** "Off" and "N changed" on each header, and the reset button. */
  private refreshBadges(): void {
    const settings = this.plugin.settings;
    const label = (count: number): string =>
      count > 0 ? `● ${count} changed` : "";
    for (const group of this.sectionGroups()) {
      const spec = SETTING_SECTIONS.find(
        (section) => section.heading === group.dataset.section,
      );
      if (spec === undefined) continue;
      const changed = sectionStoredKeys(spec.keys).filter((key) =>
        isChanged(settings, key),
      ).length;
      const off = spec.master !== undefined && settings[spec.master] === false;
      group.toggleClass("scribidian-master-off", off);
      const heading = group.querySelector(":scope > .setting-item-heading");
      heading
        ?.querySelector(".scribidian-badge-off")
        ?.setText(off ? "Off" : "");
      heading
        ?.querySelector(".scribidian-badge-changed")
        ?.setText(label(changed));
      heading
        ?.querySelector(".scribidian-section-reset")
        ?.toggleClass("scribidian-hidden", changed === 0);
      for (const row of Array.from(
        group.querySelectorAll<HTMLElement>(".scribidian-sub-toggle"),
      )) {
        const count = sectionStoredKeys(
          subSectionKeys(spec.keys, row.dataset.sub ?? ""),
        ).filter((key) => isChanged(settings, key)).length;
        row.querySelector(".scribidian-badge-changed")?.setText(label(count));
      }
    }
  }

  /** Ask, then put a section's settings back to their defaults. */
  private confirmReset(
    title: string,
    keys: readonly (keyof ScribidianSettings)[],
  ): void {
    const changed = keys.filter((key) => isChanged(this.plugin.settings, key));
    if (changed.length === 0) return;
    new ConfirmResetModal(
      this.app,
      `Put the ${title} settings back to their defaults? ${changed.length} ${
        changed.length === 1 ? "setting is" : "settings are"
      } changed now.`,
      () => void this.resetSettings(changed),
    ).open();
  }

  private async resetSettings(
    keys: readonly (keyof ScribidianSettings)[],
  ): Promise<void> {
    const settings = this.plugin.settings as unknown as Record<string, unknown>;
    for (const key of keys) {
      settings[key] = structuredClone(DEFAULT_SETTINGS[key]);
    }
    await this.plugin.saveSettings();
    this.plugin.applyScreenplayFont();
    this.plugin.applyThreadSettings();
    this.plugin.applyCommandVisibility();
    this.plugin.refreshStatus();
    this.app.workspace.updateOptions();
    this.update();
    window.setTimeout(() => {
      this.decorateSections();
      this.filterSettings();
    }, 0);
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
              const expand = setting.controlEl.createEl("button", {
                text: "Expand all",
              });
              expand.addEventListener("click", () => {
                this.saveOpenSections(new Set(this.allSectionKeys()));
                this.applyOpenState();
              });
              const collapse = setting.controlEl.createEl("button", {
                text: "Collapse all",
              });
              collapse.addEventListener("click", () => {
                this.saveOpenSections(new Set());
                this.applyOpenState();
              });
              window.setTimeout(() => {
                this.decorateSections();
                this.filterSettings();
              }, 0);
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
        // Redraw editors, e.g. for "Highlight $ variables".
        this.app.workspace.updateOptions();
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
          this.app.workspace.updateOptions();
        });
      }
    }
    syncMaster("plain");
    syncMaster("script");
  }

  /**
   * Draw Clean export as a table: one row per kind of Obsidian markup, one
   * column per format with a clean export (Fountain, PDF, Final Draft),
   * each with its own checkbox or dropdown. Plain exports keep everything.
   */
  private renderCleanExport(setting: Setting): void {
    setting.settingEl.addClass("scribidian-settings-table-row");
    setting.infoEl.remove();
    setting.controlEl.remove();
    setting.settingEl.createDiv({
      cls: "setting-item-description scribidian-settings-table-note",
      text: "What the clean exports leave out: Export to clean Fountain, Export clean PDF (and the page preview), and Export to clean Final Draft FDX. The other exports keep everything. Your script is never changed.",
    });
    const table = setting.settingEl.createEl("table", {
      cls: "scribidian-settings-table scribidian-clean-table",
    });
    const head = table.createEl("thead").createEl("tr");
    head.createEl("th", { text: "Markup" });
    for (const { title } of CLEAN_EXPORT_COLUMNS) {
      head.createEl("th", { cls: "scribidian-clean-format", text: title });
    }
    const body = table.createEl("tbody");
    for (const {
      option,
      name,
      desc,
      choices: allChoices,
      choicesFor,
      fixed,
    } of CLEAN_EXPORT_SETTINGS) {
      const tr = body.createEl("tr");
      const info = tr.createEl("td", { cls: "scribidian-clean-info" });
      info.createDiv({ cls: "setting-item-name", text: name });
      info.createDiv({ cls: "setting-item-description", text: desc });
      for (const { format, title } of CLEAN_EXPORT_COLUMNS) {
        const cell = tr.createEl("td", { cls: "scribidian-clean-format" });
        const choices = choicesFor?.[format] ?? allChoices;
        const reason = fixed?.[format];
        if (reason !== undefined) {
          const box = cell.createEl("input", { type: "checkbox" });
          box.checked = true;
          box.disabled = true;
          box.setAttr("aria-label", `${title}: ${name} (always)`);
          cell.setAttr("title", reason);
          continue;
        }
        const current = cleanExportFor(this.plugin.settings, format)[option];
        const save = (value: unknown): void => {
          const key = CLEAN_EXPORT_KEYS[format];
          this.plugin.settings[key] = normalizeCleanExportOptions(
            {
              ...cleanExportFor(this.plugin.settings, format),
              [option]: value,
            },
            CLEAN_EXPORT_DEFAULTS[format],
          );
          void this.plugin.saveSettings();
        };
        if (choices) {
          const select = cell.createEl("select", { cls: "dropdown" });
          for (const [value, label] of Object.entries(choices)) {
            select.createEl("option", { value, text: label });
          }
          select.value = String(current);
          select.setAttr("aria-label", `${title}: ${name}`);
          select.addEventListener("change", () => save(select.value));
        } else {
          const box = cell.createEl("input", { type: "checkbox" });
          box.checked = current === true;
          box.setAttr("aria-label", `${title}: ${name}`);
          box.addEventListener("change", () => save(box.checked));
        }
      }
    }
  }

  /**
   * A checkbox for each Scribidian command: checked shows it in the
   * command palette, unchecked hides it (#296). Hidden commands can't be
   * run from a hotkey either. Some are hidden at first: they have their own
   * key or menu (Smart Tab, the suggestion lists).
   */
  private renderCommandList(setting: Setting): void {
    setting.setName(COMMANDS_NAME);
    setting.setDesc(
      "Uncheck a command to hide it from the command palette and make the list shorter. A hidden command can't be run with a hotkey either: keep it checked to give it one, or to put Smart Tab on the phone toolbar.",
    );
    const showAll = setting.controlEl.createEl("button", { text: "Show all" });
    const reset = setting.controlEl.createEl("button", { text: "Reset" });
    const list = setting.settingEl.createDiv({
      cls: "scribidian-command-list",
    });
    const draw = (): void => {
      list.empty();
      for (const command of this.plugin.listCommands()) {
        const row = list.createEl("label", { cls: "scribidian-command-row" });
        const box = row.createEl("input", { type: "checkbox" });
        box.checked = command.shown;
        row.createSpan({ text: command.name });
        box.addEventListener("change", () => {
          this.plugin.settings.commandVisibility = {
            ...this.plugin.settings.commandVisibility,
            [command.id]: box.checked,
          };
          void this.plugin.saveSettings();
          this.plugin.applyCommandVisibility();
        });
      }
    };
    showAll.addEventListener("click", () => {
      this.plugin.settings.commandVisibility = Object.fromEntries(
        this.plugin.listCommands().map((command) => [command.id, true]),
      );
      void this.plugin.saveSettings();
      this.plugin.applyCommandVisibility();
      draw();
    });
    reset.addEventListener("click", () => {
      this.plugin.settings.commandVisibility = {};
      this.plugin.settings.showAllCommands = false;
      void this.plugin.saveSettings();
      this.plugin.applyCommandVisibility();
      draw();
    });
    draw();
  }

  /** A list to drag into order: which slug item comes first. */
  private renderSlugOrder(setting: Setting): void {
    setting.setName(SLUG_ORDER_NAME);
    setting.setDesc(
      "With full slugs on, each location has two items. Drag to choose which comes first.",
    );
    const labels: Record<SlugSuggestionKind, string> = {
      recent:
        "Most recent: the last slug used with that location (KITCHEN - NIGHT (FLASHBACK))",
      shortest: "Shortest: the location alone (KITCHEN), then the times",
    };
    const list = setting.settingEl.createDiv({ cls: "scribidian-order-list" });
    let dragged: SlugSuggestionKind | null = null;
    const draw = (): void => {
      list.empty();
      const order = slugOrder(this.plugin.settings.slugSuggestionOrder);
      order.forEach((kind, at) => {
        const row = list.createDiv({
          cls: "scribidian-order-item",
          attr: { draggable: "true", "data-kind": kind },
        });
        row.createSpan({ cls: "scribidian-order-handle", text: "⋮⋮" });
        row.createSpan({ text: `${at + 1}. ${labels[kind]}` });
        const move = row.createEl("button", {
          text: at === 0 ? "Move down" : "Move up",
          attr: { "aria-label": `Move ${kind} ${at === 0 ? "down" : "up"}` },
        });
        move.addEventListener("click", () => {
          void this.saveSlugOrder([...order].reverse());
          draw();
        });
        row.addEventListener("dragstart", (event) => {
          dragged = kind;
          event.dataTransfer?.setData("text/plain", kind);
          row.addClass("is-dragging");
        });
        row.addEventListener("dragend", () => {
          dragged = null;
          row.removeClass("is-dragging");
        });
        row.addEventListener("dragover", (event) => event.preventDefault());
        row.addEventListener("drop", (event) => {
          event.preventDefault();
          if (dragged === null || dragged === kind) return;
          const next = order.filter((item) => item !== dragged);
          next.splice(next.indexOf(kind) + (at === 0 ? 0 : 1), 0, dragged);
          void this.saveSlugOrder(next);
          draw();
        });
      });
    };
    draw();
  }

  /**
   * Two checkboxes: what picking a location in the slugline list fills in
   * after it, from the location's last slug (#284).
   */
  private renderSlugFill(setting: Setting): void {
    setting.setName(SLUG_FILL_NAME);
    setting.setDesc(
      "What picking a location in the slugline list adds after it, from the last slug that used it: STUDIO, BARN - NIGHT (FLASHBACK). The list shows what will be filled in. With both off, picking fills in the location and opens the times list, as Final Draft does.",
    );
    const options = [
      { key: "slugFillTime", label: "Time" },
      { key: "slugFillModifier", label: "Modifier" },
    ] as const;
    for (const { key, label } of options) {
      const wrap = setting.controlEl.createEl("label", {
        cls: "scribidian-slug-fill-option",
      });
      const box = wrap.createEl("input", { type: "checkbox" });
      box.checked = this.plugin.settings[key];
      wrap.createSpan({ text: label });
      box.addEventListener("change", () => {
        this.plugin.settings[key] = box.checked;
        void this.plugin.saveSettings();
      });
    }
  }

  private async saveSlugOrder(order: SlugSuggestionKind[]): Promise<void> {
    this.plugin.settings.slugSuggestionOrder = slugOrder(order);
    await this.plugin.saveSettings();
  }

  /** Whether the Tab and Enter table shows its less common rows. */
  private showAllEnterRows: boolean | null = null;

  /**
   * Draw the Tab and Enter settings as a table: one row per element with a
   * dropdown each for what Tab and Enter start after it. Less common rows
   * sit behind "Show more" (shown anyway when one of them is changed from
   * its default).
   */
  private renderEnterTargets(setting: Setting): void {
    setting.settingEl.addClass("scribidian-settings-table-row");
    setting.infoEl.remove();
    setting.controlEl.remove();
    const columns = [
      {
        key: "Tab",
        targets: this.plugin.settings.tabTargets,
        defaults: DEFAULT_TAB_TARGETS,
      },
      {
        key: "Enter",
        targets: this.plugin.settings.enterTargets,
        defaults: DEFAULT_ENTER_TARGETS,
      },
    ];
    setting.settingEl.createDiv({
      cls: "scribidian-settings-subheading",
      text: "At the end of a line",
    });
    setting.settingEl.createDiv({
      cls: "setting-item-description scribidian-settings-table-note",
      text: 'What pressing Tab or Enter at the end of a line starts next, with Smart Tab or Smart Enter on. Enter works this way in script mode only. Tab first completes a slugline (" - ", the time of day, a modifier); its choice applies after that. What they do in the middle of a line is set in the next two tables. Shift+Enter is always a plain line break that keeps the same element.',
    });
    const table = setting.settingEl.createEl("table", {
      cls: "scribidian-settings-table scribidian-enter-table",
    });
    const head = table.createEl("thead").createEl("tr");
    head.createEl("th", { text: "Element" });
    for (const column of columns) {
      head.createEl("th", { text: `${column.key} starts` });
    }
    const body = table.createEl("tbody");
    const moreRows: HTMLElement[] = [];
    this.showAllEnterRows ??= ENTER_SOURCE_ROWS.some(
      (row) =>
        row.more &&
        columns.some(
          (column) =>
            column.targets[row.source] !== column.defaults[row.source],
        ),
    );
    for (const row of ENTER_SOURCE_ROWS) {
      const tr = body.createEl("tr");
      if (row.more) moreRows.push(tr);
      tr.createEl("td", { cls: "setting-item-name", text: row.name });
      for (const { key, targets } of columns) {
        const select = tr
          .createEl("td")
          .createEl("select", { cls: "dropdown" });
        select.setAttr(
          "aria-label",
          `After ${row.name.toLowerCase()}, ${key} starts`,
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
    this.renderTabWithList(setting.settingEl);
    this.renderTabInside(setting.settingEl);
    this.renderEnterInside(setting.settingEl);
  }

  /** What Tab does while a suggestion list is open (script mode). */
  private renderTabWithList(parent: HTMLElement): void {
    parent.createDiv({
      cls: "scribidian-settings-subheading",
      text: "Tab with a list open",
    });
    parent.createDiv({
      cls: "setting-item-description scribidian-settings-table-note",
      text: "Script mode only. Picks: the highlighted suggestion goes in. Moves to the next element: the list closes and the key works as if it weren't open, so on an empty line after a transition it goes to the character column. Enter always picks. In Fountain mode the key always picks.",
    });
    const select = parent.createEl("select", { cls: "dropdown" });
    select.setAttr("aria-label", "Tab with a list open");
    for (const [value, label] of Object.entries(TAB_WITH_LIST_LABELS)) {
      select.createEl("option", { value, text: label });
    }
    select.value = this.plugin.settings.tabWithListScript;
    select.addEventListener("change", () => {
      if (!isTabWithList(select.value)) return;
      this.plugin.settings.tabWithListScript = select.value;
      void this.plugin.saveSettings();
    });
  }

  /**
   * The "Tab inside a line" table: one dropdown per element and mode for
   * what Tab does with the cursor in the middle of the line.
   */
  private renderTabInside(parent: HTMLElement): void {
    this.renderInsideTable(parent, {
      heading: "Tab inside a line",
      note: "With the cursor inside a line, not at its end. Next part: sluglines go on to the location, time or modifier, characters to the extension, with its list open and the current one picked. Next element: the cursor goes to the start of the next element, skipping any parts. As at the end of the line: Tab does what it does at the end of the line, so after action it starts a new character with its list (Arc Studio). Obsidian's: the key works as in a normal note.",
      key: "Tab",
      script: this.plugin.settings.tabInsideScript,
      plain: this.plugin.settings.tabInsidePlain,
      options: (source) => tabInsideOptions(source),
      label: (value) => TAB_INSIDE_LABELS[value],
    });
  }

  /** The "Enter inside a line" table, like the Tab one. */
  private renderEnterInside(parent: HTMLElement): void {
    this.renderInsideTable(parent, {
      heading: "Enter inside a line",
      note: "With the cursor inside a line, not at its start or end. Line break: the rest of the line moves to a new line as typed. Obsidian's Enter: as in a normal note, which may continue a list or quote. Next element: the cursor goes to the start of the next element. Nothing: Enter is ignored, so the line can't be split.",
      key: "Enter",
      script: this.plugin.settings.enterInsideScript,
      plain: this.plugin.settings.enterInsidePlain,
      options: () => ENTER_INSIDE_OPTIONS,
      label: (value) => ENTER_INSIDE_LABELS[value],
    });
  }

  private renderInsideTable<Action extends string>(
    parent: HTMLElement,
    spec: {
      heading: string;
      note: string;
      key: string;
      script: Record<EnterSource, Action>;
      plain: Record<EnterSource, Action>;
      options: (source: EnterSource) => readonly Action[];
      label: (value: Action) => string;
    },
  ): void {
    parent.createDiv({
      cls: "scribidian-settings-subheading",
      text: spec.heading,
    });
    parent.createDiv({
      cls: "setting-item-description scribidian-settings-table-note",
      text: spec.note,
    });
    const table = parent.createEl("table", {
      cls: "scribidian-settings-table scribidian-enter-table",
    });
    const head = table.createEl("thead").createEl("tr");
    head.createEl("th", { text: "Element" });
    head.createEl("th", { text: "Script" });
    head.createEl("th", { text: "Fountain" });
    const body = table.createEl("tbody");
    const modes: [string, Record<EnterSource, Action>][] = [
      ["script", spec.script],
      ["Fountain", spec.plain],
    ];
    for (const row of ENTER_SOURCE_ROWS) {
      const tr = body.createEl("tr");
      tr.createEl("td", { cls: "setting-item-name", text: row.name });
      for (const [mode, actions] of modes) {
        const select = tr
          .createEl("td")
          .createEl("select", { cls: "dropdown" });
        select.setAttr(
          "aria-label",
          `Inside ${row.name.toLowerCase()} in ${mode} mode, ${spec.key} does`,
        );
        const options = spec.options(row.source);
        for (const value of options) {
          select.createEl("option", { value, text: spec.label(value) });
        }
        select.value = actions[row.source];
        select.addEventListener("change", () => {
          const value = select.value as Action;
          if (!options.includes(value)) return;
          actions[row.source] = value;
          void this.plugin.saveSettings();
        });
      }
    }
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

  /**
   * Hide settings (and whole sections) that do not match the search text.
   * While searching, every section and sub-section shows open; a
   * sub-section row shows when one of its settings matches.
   */
  private filterSettings(): void {
    const words = this.query.toLocaleLowerCase().split(/\s+/u).filter(Boolean);
    for (const group of Array.from(
      this.containerEl.querySelectorAll<HTMLElement>(".setting-group"),
    )) {
      if (group.hasClass("scribidian-settings-search")) continue;
      group.toggleClass("scribidian-searching", words.length > 0);
      const heading =
        group.querySelector(":scope > .setting-item-heading")?.textContent ??
        "";
      let shown = 0;
      let subRow: HTMLElement | null = null;
      let subShown = false;
      const closeSub = (): void => {
        subRow?.toggleClass("scribidian-hidden", !subShown);
      };
      for (const item of Array.from(
        group.querySelectorAll<HTMLElement>(".setting-items > .setting-item"),
      )) {
        if (item.hasClass("scribidian-sub-toggle")) {
          closeSub();
          subRow = item;
          subShown = words.length === 0;
          continue;
        }
        const text =
          `${heading} ${subRow?.textContent ?? ""} ${item.textContent ?? ""}`.toLocaleLowerCase();
        const match = words.every((word) => text.includes(word));
        item.toggleClass("scribidian-hidden", !match);
        if (match) {
          shown += 1;
          subShown = true;
        }
      }
      closeSub();
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
        name: "Current element",
        desc: "The element the cursor is on: Scene heading, Action, Character, Wryly, Dialogue or Transition.",
        control: {
          type: "toggle",
          key: "showCurrentElement",
          defaultValue: DEFAULT_SETTINGS.showCurrentElement,
        },
      },
      {
        name: "Shift+Tab inside a slugline or character (script mode)",
        desc: "Previous part: selects the part before the cursor and opens its list, as Tab's Next part goes forward. INT. BARN - DAY| selects DAY, then BARN; in a character, the extension, then the name. Nothing: Obsidian's Shift+Tab.",
        control: {
          type: "dropdown",
          key: "shiftTabInsideScript",
          options: SHIFT_TAB_INSIDE_LABELS,
          defaultValue: DEFAULT_SETTINGS.shiftTabInsideScript,
        },
      },
      {
        name: "Shift+Tab inside a slugline or character (Fountain mode)",
        desc: "The same choice for plain (Fountain) mode.",
        control: {
          type: "dropdown",
          key: "shiftTabInsidePlain",
          options: SHIFT_TAB_INSIDE_LABELS,
          defaultValue: DEFAULT_SETTINGS.shiftTabInsidePlain,
        },
      },
      {
        name: "Page size",
        desc: "US Letter or A4. Used for page counts, the preview and PDFs.",
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
        desc: "Script mode lays your script out like the printed page and helps as you type. Plain mode keeps Obsidian's normal look and leaves your typing alone, though suggestions and Smart Tab still work. Your text is the same either way. Switch any time with the command Screenplay: Toggle script/Fountain mode.",
        control: {
          type: "dropdown",
          key: "editorLayout",
          options: {
            screenplay: "Screenplay (formatted)",
            plain: "Fountain (plain text)",
          },
          defaultValue: DEFAULT_SETTINGS.editorLayout,
        },
      },
      {
        name: "Screenplay font",
        desc: "The font for scripts in the editor. PDFs always use Courier Prime, like a printed script; the page preview uses it too when it is installed on this device, otherwise Courier.",
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
        name: "Line comment color",
        desc: "The color of line comments (// note) in the editor. Leave it unset for your theme's muted text color.",
        control: {
          type: "color",
          key: "lineCommentColor",
          defaultValue: DEFAULT_SETTINGS.lineCommentColor,
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
        name: "Character suggestions match capitals",
        desc: "On: typing JE at the start of a block shows JEN, but Je doesn't, so ordinary action doesn't open the list. Off: Je shows JEN too, and the line moves to the character column while the list is open. Picking a name writes it in capitals. Tab and Enter open the list in any case either way.",
        control: {
          type: "toggle",
          key: "characterMatchCase",
          defaultValue: DEFAULT_SETTINGS.characterMatchCase,
        },
      },
      {
        name: "Outline links go under",
        desc: "Where Link scene headings across documents puts each scene's link to the outline (= [[Outline#Heading]]). Headings: one line under the scene's heading. Sluglines: one under each slugline. A scene with no heading above it always gets it under the slugline.",
        control: {
          type: "dropdown",
          key: "outlineLinkPlacement",
          options: { heading: "Headings", slugline: "Sluglines" },
          defaultValue: DEFAULT_SETTINGS.outlineLinkPlacement,
        },
      },
      {
        name: "Use threads",
        desc: "Threads ([&name]) tie places together across a script and its notes. On: each shows as a 🧵 you can click to go to the next place, [& lists the threads you've used, and the Threads panel and commands work. Off: [&name] stays plain text, and the other thread settings do nothing. Exports remove thread marks either way.",
        control: {
          type: "toggle",
          key: "threadsEnabled",
          defaultValue: DEFAULT_SETTINGS.threadsEnabled,
        },
      },
      {
        name: "Thread text",
        desc: "How a thread shows: its text (its name, or its own text as in [&gun|the pistol]) before or after the 🧵, the text alone, or the 🧵 alone. With the 🧵 alone, the text shows while the cursor is in the thread. [&gun|] always shows the 🧵 only.",
        control: {
          type: "dropdown",
          key: "threadDisplay",
          options: {
            right: "Text then 🧵",
            left: "🧵 then text",
            text: "Text only",
            icon: "🧵 only",
          },
          defaultValue: DEFAULT_SETTINGS.threadDisplay,
          disabled: () => !this.plugin.settings.threadsEnabled,
        },
      },
      {
        name: "Thread color",
        desc: "The color of a thread's text, and of [&name] while you edit it. Leave it unset for your theme's orange.",
        control: {
          type: "color",
          key: "threadColor",
          defaultValue: DEFAULT_SETTINGS.threadColor,
          disabled: () => !this.plugin.settings.threadsEnabled,
        },
      },
      {
        name: "Type && to start a thread",
        desc: "In a screenplay, typing && turns into [& and opens the thread list, so you don't have to reach for the bracket. Not after [ or a third &.",
        control: {
          type: "toggle",
          key: "threadAmpersands",
          defaultValue: DEFAULT_SETTINGS.threadAmpersands,
          disabled: () => !this.plugin.settings.threadsEnabled,
        },
      },
      {
        name: "Turn off Completr in screenplays",
        desc: "Completr (a word-completion plugin) opens its own list while you type, on top of Scribidian's. On: Completr stays quiet in screenplay notes and works as usual in every other note. Does nothing if Completr isn't installed.",
        control: {
          type: "toggle",
          key: "quietCompletrInScripts",
          defaultValue: DEFAULT_SETTINGS.quietCompletrInScripts,
        },
      },
      {
        name: "Suggest character names in action",
        desc: "Typing a name in capitals inside an action line (JE in \"She sees JE\") lists the script's characters that start with it, like Final Draft's SmartType for a character's first appearance. Enter picks the name, which stays in the action line. On by default. Enter after capitals that start a name (THE for THEO) picks the name, so press Escape first, or turn this off to keep action typing quiet.",
        control: {
          type: "toggle",
          key: "namesInAction",
          defaultValue: DEFAULT_SETTINGS.namesInAction,
        },
      },
      {
        name: "Your extensions first",
        desc: "Character extensions you've used in the script, like (UNINTELLIGIBLE), are always suggested. On: they come before (V.O.), (O.S.), (ON RADIO) and (ON PHONE). Off: after them.",
        control: {
          type: "toggle",
          key: "customExtensionsFirst",
          defaultValue: DEFAULT_SETTINGS.customExtensionsFirst,
        },
      },
      {
        name: "Variable character",
        desc: "Typed before a variable's name ($ in $killer_name): the name is colored, and typing the character lists the note's other variables. One symbol, not one Fountain or Markdown already uses (such as @ ! # . > ~ = * _). Variables written with the old character stop being colored.",
        control: {
          type: "text",
          key: "variablePrefix",
          placeholder: "$",
          defaultValue: DEFAULT_SETTINGS.variablePrefix,
        },
      },
      {
        name: "Character name character",
        desc: 'Typed in an action line to list the characters (+ in "She sees +je"); the pick is written as a name in action, such as Jen. One symbol, different from the variable character.',
        control: {
          type: "text",
          key: "characterMentionPrefix",
          placeholder: "+",
          defaultValue: DEFAULT_SETTINGS.characterMentionPrefix,
        },
      },
      {
        name: "Fuzzy group matching",
        desc: "Groups of characters in the + list also match loosely: spaces and commas can be skipped (+jenandb for Jen and Blake), a list can use the start of each name (+j,b), and letters can be the start of each name in turn (+zg for Zorana and George). Off: a group is offered only when it starts with exactly what you typed, and names in a list are typed in full.",
        control: {
          type: "toggle",
          key: "fuzzyCharacterGroups",
          defaultValue: DEFAULT_SETTINGS.fuzzyCharacterGroups,
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
        name: COMMANDS_NAME,
        render: (setting) => this.renderCommandList(setting),
      },
      {
        name: "Offer full slugs",
        desc: "The slugline list also offers each location's last whole slug, such as KITCHEN - NIGHT (FLASHBACK); picking it fills in the whole slug. Off: each location shows once, with the time it had last (KITCHEN - NIGHT), and picking it opens the times with that time first.",
        control: {
          type: "toggle",
          key: "offerFullSlugs",
          defaultValue: DEFAULT_SETTINGS.offerFullSlugs,
        },
      },
      {
        name: SLUG_ORDER_NAME,
        render: (setting) => this.renderSlugOrder(setting),
      },
      {
        name: SLUG_FILL_NAME,
        render: (setting) => this.renderSlugFill(setting),
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
        name: "Smart Tab",
        desc: "Tab moves you on to the next likely element: a wryly under a character, the time of day after a slugline, a character after action. Choose what it starts under Tab and Enter keys. Turn off and Tab does nothing in a screenplay (lists and tables keep their own Tab).",
        control: {
          type: "toggle",
          key: "smartTabEnabled",
          defaultValue: DEFAULT_SETTINGS.smartTabEnabled,
        },
      },
      {
        name: "Tab at the start of dialogue adds a wryly",
        desc: "Script mode. On: Tab with the cursor at the start of a line of dialogue puts an empty () above it, ready for a wryly. Off: Tab does nothing there, as in Fade In (a wryly then only goes on an empty dialogue line).",
        control: {
          type: "toggle",
          key: "tabAtDialogueStartAddsWryly",
          defaultValue: DEFAULT_SETTINGS.tabAtDialogueStartAddsWryly,
        },
      },
      {
        name: "Backspace on an empty character line makes it action",
        desc: "Script mode, strict cursor placement on. On: the first Backspace on the empty line in the character column moves it to the action margin; the next deletes it. Off: Backspace deletes the line at once and goes to the end of the line above, as in Fade In.",
        control: {
          type: "toggle",
          key: "backspaceEmptyCueToAction",
          defaultValue: DEFAULT_SETTINGS.backspaceEmptyCueToAction,
        },
      },
      {
        name: "Enter at the end of a character moves to the dialogue",
        desc: "Strict cursor placement on, with the speech already below the character. On: Enter moves the cursor to the start of the line below. Off: Enter adds an empty dialogue line under the character, as in Fade In.",
        control: {
          type: "toggle",
          key: "enterAfterCueMovesDown",
          defaultValue: DEFAULT_SETTINGS.enterAfterCueMovesDown,
        },
      },
      {
        name: "Indent action with spaces",
        desc: "Spaces at the start of an action line indent it, in the preview and in exports too, as Fountain allows (for a note, a sign, a letter). Tabs don't indent action: Tab moves between elements. Turn off to ignore those spaces in the preview and exports.",
        control: {
          type: "toggle",
          key: "indentActionWithSpaces",
          defaultValue: DEFAULT_SETTINGS.indentActionWithSpaces,
        },
      },
      {
        name: "Smart Enter",
        desc: "In script mode, Enter starts the next likely element: action after a slugline, a new character after dialogue. Choose what it starts under Tab and Enter keys. Turn off to make Enter a plain line break.",
        control: {
          type: "toggle",
          key: "smartEnterEnabled",
          defaultValue: DEFAULT_SETTINGS.smartEnterEnabled,
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
        name: "Add (CONT'D) to continued dialogue",
        desc: "In the PDF and the page preview only: when a character speaks again after action in the same scene, or a speech goes on to the next page, the cue gets (CONT'D), as Final Draft and Fade In print it. Your Fountain text is never changed.",
        control: {
          type: "toggle" as const,
          key: "pdfContinued",
          defaultValue: DEFAULT_SETTINGS.pdfContinued,
        },
      },
      ...PDF_BOLD_SETTINGS.map(({ part, name, desc }) => ({
        name,
        desc,
        control: {
          type: "toggle" as const,
          key: `${PDF_BOLD_PREFIX}${part}`,
          defaultValue: DEFAULT_PDF_BOLD[part],
        },
      })),
      {
        name: "Mark capitals that are action",
        desc: "Scribidian reads a line in capitals ending in punctuation (BANG!, SILENCE.) as action. Final Draft, Fade In and other Fountain apps read it as a character when text follows it. On: exports put ! in front of such lines (!BANG!) so those apps read them as action too. Your script is never changed.",
        control: {
          type: "toggle",
          key: "markCapitalsAsAction",
          defaultValue: DEFAULT_SETTINGS.markCapitalsAsAction,
        },
      },
      {
        name: CLEAN_EXPORT_NAME,
        searchable: false,
        render: (setting) => this.renderCleanExport(setting),
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
    if (key.startsWith(PDF_BOLD_PREFIX)) {
      const part = key.slice(PDF_BOLD_PREFIX.length);
      const options = normalizePdfBold(this.plugin.settings.pdfBold);
      return part in options ? options[part as PdfBoldPart] : undefined;
    }
    if (!isSettingKey(key)) return undefined;
    const value = this.plugin.settings[key];
    return Array.isArray(value) ? value.join(", ") : value;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key.startsWith(PDF_BOLD_PREFIX)) {
      const part = key.slice(PDF_BOLD_PREFIX.length);
      if (!(part in DEFAULT_PDF_BOLD) || typeof value !== "boolean") return;
      this.plugin.settings.pdfBold = {
        ...normalizePdfBold(this.plugin.settings.pdfBold),
        [part]: value,
      };
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
    } else if (key === "threadColor") {
      if (typeof value !== "string") return;
      this.plugin.settings.threadColor = value.trim();
      this.plugin.applyScreenplayFont();
    } else if (key === "lineCommentColor") {
      if (typeof value !== "string") return;
      this.plugin.settings.lineCommentColor = value.trim();
      this.plugin.applyScreenplayFont();
    } else if (key === "screenplayFont" || key === "screenplayFontCustom") {
      if (typeof value !== "string") return;
      this.plugin.settings[key] = value.trim();
      this.plugin.applyScreenplayFont();
    } else if (key === "variablePrefix" || key === "characterMentionPrefix") {
      if (typeof value !== "string") return;
      const trimmed = value.trim();
      const other =
        key === "variablePrefix"
          ? this.plugin.settings.characterMentionPrefix
          : this.plugin.settings.variablePrefix;
      const problem = triggerProblem(trimmed, other);
      if (problem !== null) {
        // Not while the box is being cleared to type a new one.
        if (trimmed !== "") new Notice(`Scribidian: ${problem}`);
        return;
      }
      this.plugin.settings[key] = trimmed;
    } else if (key === "characterTemplate") {
      if (typeof value !== "string") return;
      this.plugin.settings.characterTemplate = value.trim();
    } else if (key === "outlineLinkPlacement") {
      if (value !== "heading" && value !== "slugline") return;
      this.plugin.settings.outlineLinkPlacement = value;
    } else if (key === "threadDisplay") {
      if (!isThreadDisplay(value)) return;
      this.plugin.settings.threadDisplay = value;
    } else if (
      key === "shiftTabInsideScript" ||
      key === "shiftTabInsidePlain"
    ) {
      if (value !== "previous-part" && value !== "nothing") return;
      this.plugin.settings[key] = value;
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
    if (key === "showAllCommands") this.plugin.applyCommandVisibility();
    if (key === "threadsEnabled" || key === "threadDisplay") {
      this.plugin.applyThreadSettings();
    }
    // A section's on/off setting dims the rest of it (#306).
    if (SETTING_SECTIONS.some((section) => section.master === key)) {
      this.update();
    }
    this.refreshBadges();
    if (
      key === "editorLayout" ||
      key === "bottomTypingMargin" ||
      key === "highlightVariablesScript" ||
      key === "highlightVariablesPlain" ||
      key === "variablePrefix"
    ) {
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
      key === "showCurrentElement" ||
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
      case "smartEnterEnabled":
      case "showAllCommands":
      case "indentActionWithSpaces":
      case "capitalizeLineStartsScript":
      case "capitalizeLineStartsPlain":
      case "capitalizeSentencesScript":
      case "capitalizeSentencesPlain":
      case "uppercaseTransitionsScript":
      case "uppercaseTransitionsPlain":
      case "uppercaseCharactersScript":
      case "uppercaseCharactersPlain":
      case "highlightVariablesScript":
      case "highlightVariablesPlain":
      case "uppercaseSluglinesScript":
      case "uppercaseSluglinesPlain":
      case "lockBlankLinesScript":
      case "lockBlankLinesPlain":
      case "renderFountainCodeBlocks":
      case "sceneTypeMatchCase":
      case "characterMatchCase":
      case "namesInAction":
      case "fuzzyCharacterGroups":
      case "quietCompletrInScripts":
      case "threadsEnabled":
      case "threadAmpersands":
      case "offerFullSlugs":
      case "markCapitalsAsAction":
      case "statusBarEnabled":
      case "showEstimatedPages":
      case "showCurrentPage":
      case "showEstimatedRuntime":
      case "showWordCount":
      case "showSceneCount":
      case "showCurrentElement":
      case "backspaceEmptyCueToAction":
      case "enterAfterCueMovesDown":
      case "pdfContinued":
      case "customExtensionsFirst":
      case "tabAtDialogueStartAddsWryly":
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
