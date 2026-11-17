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
