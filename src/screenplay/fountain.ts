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

export const DEFAULT_SCENE_TYPES = [
  "INT.",
  "EXT.",
  "INT./EXT.",
  "INT/EXT",
  "EST.",
];

export const DEFAULT_TIMES_OF_DAY = [
  "DAY",
  "NIGHT",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "DAWN",
  "DUSK",
  "LATER",
  "CONTINUOUS",
  "MOMENTS LATER",
];

/** Slug modifiers after the time of day: "EXT. HIGHWAY - DAY (FLASHBACK)". */
export const DEFAULT_SLUG_MODIFIERS = [
  "FLASHBACK",
  "PRESENT",
  "DREAM",
  "REALITY",
  "DRIVING",
];

/**
 * A scene heading split into its main part and a trailing slug modifier:
 * "EXT. HIGHWAY - DAY (FLASHBACK) #12#" -> { base: "EXT. HIGHWAY - DAY #12#",
 * modifier: "FLASHBACK" }. A scene number stays with the base.
 */
export function splitSlugModifier(text: string): {
  base: string;
  modifier: string | null;
} {
  const match = /^(.*?\S)\s*\(([^()]*)\)\s*(#[^#]*#)?\s*$/u.exec(text.trim());
  if (!match || !(match[2] ?? "").trim()) return { base: text, modifier: null };
  const number = match[3] ? ` ${match[3]}` : "";
  return {
    base: `${match[1] ?? ""}${number}`,
    modifier: (match[2] ?? "").trim(),
  };
}

export const CHARACTER_EXTENSIONS = [
  "(O.S.)",
  "(V.O.)",
  "(ON RADIO)",
  "(ON PHONE)",
];

export const COMMON_PARENTHETICALS = [
  "(quietly)",
  "(to Reeves)",
  "(beat)",
  "(whispering)",
];

export const COMMON_TRANSITIONS = [
  "CUT TO:",
  "FADE IN:",
  "FADE OUT.",
  "DISSOLVE TO:",
  "SMASH CUT TO:",
  "MATCH CUT TO:",
];

export const SCENE_TYPE_SOURCE =
  "(?:INT\\.\\/EXT\\.|INT\\.\\/EXT|INT\\/EXT|INT\\.|EXT\\.|EST\\.|I\\/E)";
