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

import type { EnterSource, TabInsideActions } from "./enterTargets";
import { classifySmartTabLine } from "./smartTab";

/** What Tab should do with the cursor inside a line. */
export type TabInsidePlan =
  /** Swallow Tab. */
  | { type: "nothing" }
  /** Let Obsidian's own Tab run. */
  | { type: "obsidian" }
  /** Let Smart Tab's usual plan run (a wryly splitting a speech). */
  | { type: "smart" }
  /** Put the cursor at `cursor`. */
  | { type: "move"; cursor: number }
  /**
   * Select a part (`head` at its start, so its list shows every choice)
   * and open its suggestion list with the current text picked.
   */
  | { type: "select"; anchor: number; head: number }
  /** Put the cursor after a character's name and list the extensions. */
  | { type: "extension-list"; at: number }
  /** Put the cursor at the end of the line and do Tab's end-of-line plan. */
  | { type: "end-tab"; cursor: number };

interface Part {
  from: number;
  to: number;
}

function sourceOf(kind: string | null): EnterSource | null {
  switch (kind) {
    case "action":
    case "dialogue":
    case "transition":
    case "character":
    case "parenthetical":
      return kind;
    case "scene-heading":
      return "sceneHeading";
    default:
      return null;
  }
}

/** Offsets (within the line) of a slugline's parts, in order. */
function slugParts(line: string): (Part | null)[] {
  const textStart = line.length - line.trimStart().length;
  // A scene number at the end ("#12#") isn't a part.
  const end = line.replace(/\s*#[^#\s]*#\s*$/u, "").trimEnd().length;
  const type =
    /^\.?(?:(?:INT\.?\/EXT|INT\/EXT|I\/E|INT|EXT|EST)\.?(?:\s+|$))?/iu.exec(
      line.slice(textStart, end),
    );
  const locationFrom = textStart + (type?.[0].length ?? 0);
  // A modifier in brackets at the end: "(FLASHBACK)".
  const modifier = /\(([^()]*)\)$/u.exec(line.slice(0, end));
  const baseEnd = modifier
    ? line.slice(0, modifier.index).trimEnd().length
    : end;
  const separator = line.lastIndexOf(" - ", baseEnd - 1);
  const hasTime = separator >= locationFrom;
  const locationTo = hasTime ? separator : baseEnd;
  return [
    locationFrom > textStart ? { from: textStart, to: locationFrom } : null,
    locationTo > locationFrom ? { from: locationFrom, to: locationTo } : null,
    hasTime && baseEnd > separator + 3
      ? { from: separator + 3, to: baseEnd }
      : null,
    modifier
      ? {
          from: modifier.index + 1,
          to: modifier.index + 1 + (modifier[1] ?? "").length,
        }
      : null,
  ];
}

/** A character cue's name and its extensions (inside the brackets). */
function cueParts(line: string): { nameEnd: number; extensions: Part[] } {
  const textEnd = line.trimEnd().length;
  const open = line.indexOf("(");
  const nameEnd = (open === -1 ? line.slice(0, textEnd) : line.slice(0, open))
    .replace(/\s*\^\s*$/u, "")
    .trimEnd().length;
  const extensions: Part[] = [];
  for (const match of line.matchAll(/\(([^()]*)\)/gu)) {
    const from = (match.index ?? 0) + 1;
    extensions.push({ from, to: from + (match[1] ?? "").length });
  }
  return { nameEnd, extensions };
}

/**
 * What Tab does with the cursor at `cursor` (an offset within line
 * `index`, whose text starts at `lineFrom` in the document), or null when
 * the cursor isn't inside an element and the end-of-line rules apply.
 * `lineFroms[i]` is where line `i` starts in the document.
 */
export function getTabInsidePlan(
  lines: readonly string[],
  index: number,
  lineFroms: readonly number[],
  cursor: number,
  actions: TabInsideActions,
): TabInsidePlan | null {
  const line = lines[index] ?? "";
  const lineFrom = lineFroms[index] ?? 0;
  const source = sourceOf(classifySmartTabLine(lines, index));
  if (source === null) return null;
  const textStart = line.length - line.trimStart().length;
  const textEnd = line.trimEnd().length;
  if (textEnd === 0 || cursor >= textEnd) return null;
  // The start of action and dialogue has its own Tab (character, wryly).
  if (cursor <= textStart && (source === "action" || source === "dialogue")) {
    return null;
  }
  // "(beat|)" counts as the end of the wryly.
  if (
    source === "parenthetical" &&
    line.slice(0, textEnd).endsWith(")") &&
    cursor === textEnd - 1
  ) {
    return null;
  }

  const action = actions[source];
  switch (action) {
    case "nothing":
      return { type: "nothing" };
    case "obsidian":
      return { type: "obsidian" };
    case "wryly":
      return { type: "smart" };
    case "next-element": {
      for (let next = index + 1; next < lines.length; next += 1) {
        const text = lines[next] ?? "";
        if (text.trim() === "") continue;
        const indent = text.length - text.trimStart().length;
        return { type: "move", cursor: (lineFroms[next] ?? 0) + indent };
      }
      return { type: "move", cursor: lineFrom + textEnd };
    }
    case "next-part":
      break;
  }

  if (source === "character") {
    const { nameEnd, extensions } = cueParts(line);
    const next =
      cursor < nameEnd
        ? extensions[0]
        : extensions.find((part) => part.from > cursor);
    if (next !== undefined) {
      return {
        type: "select",
        anchor: lineFrom + next.to,
        head: lineFrom + next.from,
      };
    }
    // No extension yet: list them after the name.
    if (cursor < nameEnd) {
      return { type: "extension-list", at: lineFrom + nameEnd };
    }
    return { type: "move", cursor: lineFrom + textEnd };
  }

  // Sluglines: scene type, location, time, modifier.
  const parts = slugParts(line);
  let current = 0;
  parts.forEach((part, position) => {
    if (part !== null && part.from <= cursor) current = position;
  });
  const next = parts.slice(current + 1).find((part) => part !== null);
  if (next === undefined || next === null) {
    // The next part isn't there yet: Tab's end-of-line plan adds it
    // (" - " and the times, or the modifier list). After the modifier
    // there is nothing left: go to the end.
    return current < 3
      ? { type: "end-tab", cursor: lineFrom + textEnd }
      : { type: "move", cursor: lineFrom + textEnd };
  }
  return {
    type: "select",
    anchor: lineFrom + next.to,
    head: lineFrom + next.from,
  };
}
