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

/** The actions a phone toolbar button can run. */
export type PhoneAction =
  | "tab-back"
  | "convert"
  | "slug"
  | "mini-slug"
  | "action"
  | "character"
  | "extension"
  | "wryly"
  | "transition"
  | "centered"
  | "dual-dialogue"
  | "tab";

export interface PhoneActionInfo {
  id: PhoneAction;
  /** Short label for the button. */
  words: string;
  /** Emoji label for the button. */
  emoji: string;
  /** What it does, for settings and the button's accessible name. */
  name: string;
}

/** Every action, in the order new ones are listed in settings. */
export const PHONE_ACTIONS: readonly PhoneActionInfo[] = [
  { id: "tab-back", words: "<--Tab", emoji: "⬅️", name: "Smart Tab back" },
  {
    id: "convert",
    words: "Convert",
    emoji: "🔄",
    name: "Convert: the next element button changes the current line",
  },
  { id: "slug", words: "Slug", emoji: "🎬", name: "New scene" },
  { id: "mini-slug", words: "Mini slug", emoji: "📍", name: "Mini slug (.)" },
  { id: "action", words: "Action", emoji: "🏃", name: "Action" },
  { id: "character", words: "Character", emoji: "🧑", name: "Character" },
  {
    id: "extension",
    words: "Extension",
    emoji: "🎙️",
    name: "Character extension (V.O.)",
  },
  { id: "wryly", words: "Wryly", emoji: "🤔", name: "Wryly" },
  { id: "transition", words: "Transition", emoji: "✂️", name: "Transition" },
  { id: "centered", words: "Centered", emoji: "🎯", name: "Centered text" },
  {
    id: "dual-dialogue",
    words: "Dual dialogue",
    emoji: "👥",
    name: "Dual dialogue",
  },
  { id: "tab", words: "Tab-->", emoji: "➡️", name: "Smart Tab" },
];

export interface PhoneButtonItem {
  action: PhoneAction;
  shown: boolean;
}

/** The buttons a new install shows, in this order; the rest start hidden. */
const DEFAULT_SHOWN: readonly PhoneAction[] = [
  "tab-back",
  "convert",
  "slug",
  "action",
  "character",
  "tab",
];

export const DEFAULT_PHONE_BUTTONS: readonly PhoneButtonItem[] = [
  ...DEFAULT_SHOWN.map((action) => ({ action, shown: true })),
  ...PHONE_ACTIONS.filter(({ id }) => !DEFAULT_SHOWN.includes(id)).map(
    ({ id }) => ({ action: id, shown: false }),
  ),
];

/**
 * Saved buttons made safe: unknown actions and repeats dropped, actions
 * added since (hidden) appended, so every action is listed exactly once.
 */
export function normalizePhoneButtons(saved: unknown): PhoneButtonItem[] {
  const known = new Set<string>(PHONE_ACTIONS.map(({ id }) => id));
  const items: PhoneButtonItem[] = [];
  const seen = new Set<string>();
  if (Array.isArray(saved)) {
    for (const entry of saved as unknown[]) {
      const action = (entry as { action?: unknown } | null)?.action;
      if (typeof action !== "string" || !known.has(action) || seen.has(action))
        continue;
      seen.add(action);
      items.push({
        action: action as PhoneAction,
        shown: (entry as { shown?: unknown }).shown === true,
      });
    }
  } else {
    return DEFAULT_PHONE_BUTTONS.map((item) => ({ ...item }));
  }
  // Convert replaced the "Convert the current line" setting: lists saved
  // before it get it shown, after <--Tab.
  if (!seen.has("convert")) {
    const at = items.findIndex((item) => item.action === "tab-back") + 1;
    items.splice(at, 0, { action: "convert", shown: true });
    seen.add("convert");
  }
  // Other actions added in a later version start hidden.
  for (const { action } of DEFAULT_PHONE_BUTTONS)
    if (!seen.has(action)) items.push({ action, shown: false });
  return items;
}

/** The list with the item at `from` moved by `step` (-1 up, 1 down). */
export function movePhoneButton(
  items: readonly PhoneButtonItem[],
  from: number,
  step: -1 | 1,
): PhoneButtonItem[] {
  const to = from + step;
  const next = items.map((item) => ({ ...item }));
  if (to < 0 || to >= next.length) return next;
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(to, 0, moved);
  return next;
}

export function phoneActionInfo(
  action: PhoneAction,
): PhoneActionInfo | undefined {
  return PHONE_ACTIONS.find(({ id }) => id === action);
}
