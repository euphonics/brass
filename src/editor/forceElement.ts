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

import { isSceneHeading } from "../screenplay/parser";
import { isTransitionText, looksLikeCharacterCue } from "./smartTab";

/** Elements a line can be forced to with the "Set line to …" commands. */
export type ForcedElement =
  | "scene-heading"
  | "action"
  | "character"
  | "transition"
  | "parenthetical"
  | "centered";

/** Suggestion list to open after forcing a blank line. */
export type ForcedCompletion =
  "scene-type" | "character" | "transition" | "parenthetical";

export interface ForceElementPlan {
  /** New text for the whole line. */
  text: string;
  /** Cursor offset within the new line. */
  cursor: number;
  /** Suggestion list to open, if any. */
  complete: ForcedCompletion | null;
  /** Needs a blank line above and below (sluglines, transitions). */
  spaced?: boolean;
}

/** Line text without the Fountain markers that force another element. */
function withoutMarkers(text: string): string {
  return text
    .trim()
    .replace(/^(?:[!.@~]|>\s*)/u, "")
    .replace(/\s*<$/u, "")
    .trim();
}

function plan(
  text: string,
  complete: ForcedCompletion | null = null,
  cursor = text.length,
): ForceElementPlan {
  return { text, cursor, complete };
}

/**
 * How to turn a line into `element`, or null when it already is one (or
 * there is nothing to do). Blank lines get the element's start and open its
 * suggestion list: scene types for a scene heading, the character list for a
 * character, and so on.
 */
export function forceElementPlan(
  line: string,
  element: ForcedElement,
): ForceElementPlan | null {
  const trimmed = line.trim();
  const blank = trimmed === "";
  const content = withoutMarkers(line);

  switch (element) {
    case "scene-heading": {
      // Sluglines are all caps and stand apart from the lines around them.
      if (blank) return { ...plan("", "scene-type"), spaced: true };
      if (isSceneHeading(trimmed)) {
        const upper = trimmed.toLocaleUpperCase();
        return upper === trimmed ? null : { ...plan(upper), spaced: true };
      }
      return { ...plan(`.${content.toLocaleUpperCase()}`), spaced: true };
    }

    case "character":
      if (blank) return plan("", "character");
      if (
        looksLikeCharacterCue(trimmed) &&
        !trimmed.startsWith("!") &&
        !trimmed.startsWith(">")
      ) {
        return null;
      }
      {
        const cue = content.toLocaleUpperCase();
        // A cue needs a letter; "@" forces one that would not read as a cue.
        return plan(looksLikeCharacterCue(cue) ? cue : `@${content}`);
      }

    case "transition":
      if (blank) return { ...plan("> ", "transition"), spaced: true };
      if (isTransitionText(trimmed)) return null;
      return { ...plan(`> ${content.toLocaleUpperCase()}`), spaced: true };

    case "parenthetical":
      if (blank) return plan("()", "parenthetical", 1);
      if (/^\(.*\)$/u.test(trimmed)) return null;
      return plan(`(${content.replace(/^\(|\)$/gu, "")})`);

    case "centered":
      if (blank) return plan(">  <", null, 2);
      if (/^>.*<$/u.test(trimmed)) return null;
      return plan(`> ${content} <`);

    case "action": {
      if (blank) return null;
      const readsAsOther =
        isSceneHeading(content) ||
        isTransitionText(content) ||
        looksLikeCharacterCue(content);
      const text = readsAsOther ? `!${content}` : content;
      return text === trimmed ? null : plan(text);
    }
  }
}
