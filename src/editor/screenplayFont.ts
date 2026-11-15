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

/** Setting value for Obsidian's own text font. */
export const OBSIDIAN_DEFAULT_FONT = "";
/** Setting value that uses the "Custom screenplay font" text instead. */
export const CUSTOM_FONT = "custom";

/** Courier-style fonts, offered first (when installed) in this order. */
export const COURIER_FONTS = [
  "Courier Prime",
  "Courier New",
  "Courier",
  "Courier Final Draft",
  "Courier Screenplay",
  "Courier 10 Pitch",
  "Courier Std",
  "Nimbus Mono PS",
  "Liberation Mono",
];

/** Other common fonts, offered after the Courier fonts when installed. */
export const OTHER_FONTS = [
  "American Typewriter",
  "Arial",
  "Atkinson Hyperlegible",
  "Cascadia Mono",
  "Consolas",
  "Fira Code",
  "Georgia",
  "Helvetica",
  "IBM Plex Mono",
  "Inter",
  "JetBrains Mono",
  "Menlo",
  "Monaco",
  "Palatino",
  "Prestige Elite Std",
  "Roboto Mono",
  "Segoe UI",
  "SF Mono",
  "Source Code Pro",
  "Times New Roman",
  "Verdana",
];

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

/**
 * The CSS font-family for a font setting: Obsidian's text font, a picked
 * font, or the custom text. Picked and custom fonts fall back to Obsidian's
 * text font if they are not installed on this device.
 */
export function screenplayFontCss(font: string, custom: string): string {
  const obsidian = "var(--font-text)";
  if (font === OBSIDIAN_DEFAULT_FONT) return obsidian;
  const family = screenplayFontFamily(font === CUSTOM_FONT ? custom : font);
  return family ? `${family}, ${obsidian}` : obsidian;
}

/** Fonts installed on this device, out of `candidates`, in the same order. */
export function installedFonts(candidates: readonly string[]): string[] {
  const context = createEl("canvas").getContext("2d");
  if (!context) return [...candidates];
  const sample = "mmmmmmmmmmlli WW 0123456789";
  const width = (family: string): number => {
    context.font = `72px ${family}`;
    return context.measureText(sample).width;
  };
  const fallbacks = ["monospace", "serif", "sans-serif"];
  const base = fallbacks.map(width);
  return candidates.filter((name) =>
    fallbacks.some(
      (fallback, index) => width(`"${name}", ${fallback}`) !== base[index],
    ),
  );
}

/**
 * Dropdown choices: Obsidian default first, then installed Courier fonts,
 * then other installed fonts, then Custom. `current` is always included so a
 * saved font stays selectable on a device that lacks it.
 */
export function screenplayFontOptions(
  installed: readonly string[],
  current: string,
): Record<string, string> {
  const options: Record<string, string> = {
    [OBSIDIAN_DEFAULT_FONT]: "Obsidian default",
  };
  const add = (name: string, label = name) => {
    if (!(name in options)) options[name] = label;
  };
  for (const name of COURIER_FONTS) if (installed.includes(name)) add(name);
  if (current && current !== CUSTOM_FONT && !installed.includes(current)) {
    add(current, `${current} (not found)`);
  }
  for (const name of OTHER_FONTS) if (installed.includes(name)) add(name);
  options[CUSTOM_FONT] = "Custom…";
  return options;
}

/** Body class while the screenplay font applies. */
export const CUSTOM_FONT_CLASS = "scribidian-custom-screenplay-font";
const FONT_VARIABLE = "--scribidian-screenplay-font";

/** Apply the screenplay font for the app window, or clear it (`null`). */
export function applyScreenplayFont(css: string | null): void {
  const body = activeDocument.body;
  if (css) {
    body.style.setProperty(FONT_VARIABLE, css);
    body.addClass(CUSTOM_FONT_CLASS);
  } else {
    body.style.removeProperty(FONT_VARIABLE);
    body.removeClass(CUSTOM_FONT_CLASS);
  }
}
