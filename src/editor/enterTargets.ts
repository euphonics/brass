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
 * What Tab and Enter start at the end of each screenplay element (Smart Tab
 * and Enter on; Enter in script mode only). Set in Settings > Tab and Enter
 * keys.
 */

/** The elements Enter can follow. */
export type EnterSource =
  | "action"
  | "dialogue"
  | "transition"
  | "sceneHeading"
  | "character"
  | "parenthetical";

/** What Enter starts: an element, or "plain" for Obsidian's own Enter. */
export type EnterTarget =
  | "scene-heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "plain";

export type EnterTargets = Record<EnterSource, EnterTarget>;

/** The defaults match how Enter behaved before it was configurable. */
export const DEFAULT_ENTER_TARGETS: EnterTargets = {
  action: "action",
  dialogue: "character",
  transition: "scene-heading",
  sceneHeading: "action",
  character: "dialogue",
  parenthetical: "dialogue",
};

/** What Tab starts by default: the next likely element. */
export const DEFAULT_TAB_TARGETS: EnterTargets = {
  action: "character",
  dialogue: "parenthetical",
  transition: "scene-heading",
  sceneHeading: "action",
  character: "parenthetical",
  parenthetical: "dialogue",
};

/** Settings rows: the common ones first, the rest behind "Show more". */
export const ENTER_SOURCE_ROWS: {
  source: EnterSource;
  name: string;
  more: boolean;
}[] = [
  { source: "action", name: "Action line", more: false },
  { source: "dialogue", name: "Dialogue", more: false },
  { source: "transition", name: "Transition", more: false },
  { source: "sceneHeading", name: "Slugline", more: true },
  { source: "character", name: "Character", more: true },
  { source: "parenthetical", name: "Wryly", more: true },
];

/** Dropdown choices, in screenplay order. */
export const ENTER_TARGET_OPTIONS: Record<EnterTarget, string> = {
  "scene-heading": "Slugline",
  action: "Action line",
  character: "Character",
  parenthetical: "Wryly",
  dialogue: "Dialogue",
  transition: "Transition",
  plain: "New line (no change)",
};

export function isEnterTarget(value: unknown): value is EnterTarget {
  return typeof value === "string" && value in ENTER_TARGET_OPTIONS;
}

/** Stored targets with anything missing or unknown set to its default. */
export function normalizeEnterTargets(
  stored: unknown,
  defaults: EnterTargets = DEFAULT_ENTER_TARGETS,
): EnterTargets {
  const values =
    stored !== null && typeof stored === "object"
      ? (stored as Record<string, unknown>)
      : {};
  const targets = { ...defaults };
  for (const source of Object.keys(targets) as EnterSource[]) {
    const value = values[source];
    if (isEnterTarget(value)) targets[source] = value;
  }
  return targets;
}

/** Elements that start a new block, after a blank line. */
export function startsNewBlock(target: EnterTarget): boolean {
  return (
    target === "scene-heading" ||
    target === "action" ||
    target === "character" ||
    target === "transition"
  );
}

/** What Tab does with the cursor inside a line (not at its end). */
export type TabInsideAction =
  "nothing" | "obsidian" | "next-part" | "wryly" | "next-element";

export type TabInsideActions = Record<EnterSource, TabInsideAction>;

export const DEFAULT_TAB_INSIDE: TabInsideActions = {
  action: "nothing",
  dialogue: "wryly",
  transition: "nothing",
  sceneHeading: "next-part",
  character: "next-part",
  parenthetical: "nothing",
};

/** Plain (Fountain) mode: Tab inside a line works as in a normal note. */
export const DEFAULT_TAB_INSIDE_PLAIN: TabInsideActions = {
  action: "obsidian",
  dialogue: "obsidian",
  transition: "obsidian",
  sceneHeading: "obsidian",
  character: "obsidian",
  parenthetical: "obsidian",
};

export const TAB_INSIDE_LABELS: Record<TabInsideAction, string> = {
  nothing: "Nothing",
  obsidian: "Obsidian's Tab",
  "next-part": "Next part",
  wryly: "Add a wryly here",
  "next-element": "Next element",
};

/**
 * The choices each element offers. Only sluglines (scene type, location,
 * time, modifier) and characters (name, extension) have parts; only
 * dialogue can be split by a wryly.
 */
export function tabInsideOptions(source: EnterSource): TabInsideAction[] {
  const options: TabInsideAction[] = ["nothing", "obsidian"];
  if (source === "sceneHeading" || source === "character") {
    options.push("next-part");
  }
  if (source === "dialogue") options.push("wryly");
  options.push("next-element");
  return options;
}

/** Stored choices with anything missing or not offered set to its default. */
export function normalizeTabInside(
  stored: unknown,
  defaults: TabInsideActions = DEFAULT_TAB_INSIDE,
): TabInsideActions {
  const values =
    stored !== null && typeof stored === "object"
      ? (stored as Record<string, unknown>)
      : {};
  const actions = { ...defaults };
  for (const source of Object.keys(actions) as EnterSource[]) {
    const value = values[source];
    if (
      typeof value === "string" &&
      (tabInsideOptions(source) as string[]).includes(value)
    ) {
      actions[source] = value as TabInsideAction;
    }
  }
  return actions;
}

/** What Enter does with the cursor inside a line (not at its start or end). */
export type EnterInsideAction =
  "nothing" | "line-break" | "obsidian" | "next-element";

export type EnterInsideActions = Record<EnterSource, EnterInsideAction>;

/**
 * Script mode: splitting a slugline, cue, wryly or transition would mangle
 * it, so Enter does nothing there; action and dialogue split as plain text.
 */
export const DEFAULT_ENTER_INSIDE: EnterInsideActions = {
  action: "line-break",
  dialogue: "line-break",
  transition: "nothing",
  sceneHeading: "nothing",
  character: "nothing",
  parenthetical: "nothing",
};

/** Plain (Fountain) mode: a plain line break, as in a text file. */
export const DEFAULT_ENTER_INSIDE_PLAIN: EnterInsideActions = {
  action: "line-break",
  dialogue: "line-break",
  transition: "line-break",
  sceneHeading: "line-break",
  character: "line-break",
  parenthetical: "line-break",
};

export const ENTER_INSIDE_LABELS: Record<EnterInsideAction, string> = {
  nothing: "Nothing",
  "line-break": "Line break",
  obsidian: "Obsidian's Enter",
  "next-element": "Next element",
};

export const ENTER_INSIDE_OPTIONS: EnterInsideAction[] = [
  "nothing",
  "line-break",
  "obsidian",
  "next-element",
];

/** Stored choices with anything missing or unknown set to its default. */
export function normalizeEnterInside(
  stored: unknown,
  defaults: EnterInsideActions = DEFAULT_ENTER_INSIDE,
): EnterInsideActions {
  const values =
    stored !== null && typeof stored === "object"
      ? (stored as Record<string, unknown>)
      : {};
  const actions = { ...defaults };
  for (const source of Object.keys(actions) as EnterSource[]) {
    const value = values[source];
    if (
      typeof value === "string" &&
      (ENTER_INSIDE_OPTIONS as string[]).includes(value)
    ) {
      actions[source] = value as EnterInsideAction;
    }
  }
  return actions;
}
