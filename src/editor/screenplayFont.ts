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

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-monospace",
  "ui-serif",
  "ui-sans-serif",
]);

/**
 * A CSS font-family list from the user's text, e.g.
 * "Courier Prime, monospace" -> '"Courier Prime", monospace'. Names keep only
 * letters, digits, spaces, "-" and "_", so the value cannot break out of CSS.
 * Empty when nothing usable is left.
 */
export function screenplayFontFamily(value: string): string {
  return value
    .split(",")
    .map((name) =>
      name
        .replace(/[^\p{L}\p{N} _-]/gu, "")
        .replace(/\s+/gu, " ")
        .trim(),
    )
    .filter(Boolean)
    .map((name) =>
      GENERIC_FAMILIES.has(name.toLowerCase())
        ? name.toLowerCase()
        : `"${name}"`,
    )
    .join(", ");
}

/** Body class while a custom screenplay font is set. */
export const CUSTOM_FONT_CLASS = "firstdraft-custom-screenplay-font";
const FONT_VARIABLE = "--firstdraft-screenplay-font";

/** Apply (or clear) the screenplay font for the app window. */
export function applyScreenplayFont(value: string): void {
  const family = screenplayFontFamily(value);
  const body = activeDocument.body;
  if (family) {
    body.style.setProperty(FONT_VARIABLE, family);
    body.addClass(CUSTOM_FONT_CLASS);
  } else {
    body.style.removeProperty(FONT_VARIABLE);
    body.removeClass(CUSTOM_FONT_CLASS);
  }
}
