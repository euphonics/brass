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

import { RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type BrassPlugin from "../main";
import { escapeForRegExp } from "./triggers";

/*
 * "$" variables ("$my_variable", "$ABC123"), a Brass addition: shown
 * in the theme's accent color so placeholders stand out. Dollar amounts
 * ("$123", "$123.12", "$1,123.12") aren't variables and stay as they are.
 */

/** The characters a name can hold (a trailing ".", ",", "-" or quote aside). */
const NAME_CHARACTERS = "[\\p{L}\\p{N}_.,'’-]";
/** Punctuation that ends a name rather than being part of it. */
const TRAILING = /[.,'’-]+$/u;

const variablePatterns = new Map<string, RegExp>();
function variablePattern(prefix: string): RegExp {
  let pattern = variablePatterns.get(prefix);
  if (pattern === undefined) {
    pattern = new RegExp(`${escapeForRegExp(prefix)}${NAME_CHARACTERS}+`, "gu");
    variablePatterns.set(prefix, pattern);
  }
  return pattern;
}

/**
 * Ranges of variables in `text`, starting at `offset`: `prefix` ("$" by
 * default, a setting) and the letters, digits, underscores, hyphens and
 * apostrophes after it ("$dead-teacher-name", "$jen's_car"). A trailing
 * ".", ",", "-" or quote is punctuation, not part of the name; a name of
 * only digits, ".", "," and "-" is a dollar amount and is skipped.
 */
export function variableRanges(
  text: string,
  offset = 0,
  prefix = "$",
): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  for (const match of text.matchAll(variablePattern(prefix))) {
    const name = match[0].slice(prefix.length).replace(TRAILING, "");
    if (name === "" || /^[\d.,-]+$/u.test(name)) continue;
    const from = offset + (match.index ?? 0);
    ranges.push({ from, to: from + prefix.length + name.length });
  }
  return ranges;
}

/**
 * The variable being typed right before the cursor ("$je" in "Hi $je"),
 * or null: the name typed so far, maybe empty (right after the prefix).
 * Not right after a letter, digit or another prefix ("US$5").
 */
export function variableAtEnd(
  before: string,
  prefix = "$",
): { typed: string } | null {
  const escaped = escapeForRegExp(prefix);
  const match = new RegExp(
    `(?:^|[^\\p{L}\\p{N}_${escaped}])${escaped}(${NAME_CHARACTERS}*)$`,
    "u",
  ).exec(before);
  return match ? { typed: match[1] ?? "" } : null;
}

/**
 * The note's variables for the "$" list, most used first, then in order of
 * appearance: those starting with `typed` (any case), not counting the one
 * starting at `skipFrom` (the one being typed) or one exactly `typed`.
 */
export function variableSuggestions(
  text: string,
  typed: string,
  skipFrom: number,
  maximum: number,
  prefix = "$",
  /**
   * The variables of the other notes in the project folder (#270). A name
   * is counted across all of them; its spelling is this note's, or else
   * the most recently changed note's.
   */
  others: readonly {
    counts: ReadonlyMap<string, number>;
    mtime: number;
  }[] = [],
): string[] {
  const own = new Map<string, number>();
  for (const { from, to } of variableRanges(text, 0, prefix)) {
    if (from === skipFrom) continue;
    const name = text.slice(from, to);
    own.set(name, (own.get(name) ?? 0) + 1);
  }
  const byKey = new Map<
    string,
    { name: string; count: number; mine: boolean; mtime: number }
  >();
  for (const [name, count] of own) {
    const key = name.toLocaleLowerCase();
    const entry = byKey.get(key);
    if (entry === undefined) {
      byKey.set(key, { name, count, mine: true, mtime: Infinity });
    } else {
      entry.count += count;
    }
  }
  for (const note of others) {
    for (const [name, count] of note.counts) {
      const key = name.toLocaleLowerCase();
      const entry = byKey.get(key);
      if (entry === undefined) {
        byKey.set(key, { name, count, mine: false, mtime: note.mtime });
      } else {
        entry.count += count;
        if (!entry.mine && note.mtime > entry.mtime) {
          entry.name = name;
          entry.mtime = note.mtime;
        }
      }
    }
  }
  const counts = new Map(
    [...byKey.values()].map((entry) => [entry.name, entry.count]),
  );
  const start = `${prefix}${typed}`.toLocaleLowerCase();
  return [...counts.entries()]
    .filter(
      ([name]) =>
        name.toLocaleLowerCase().startsWith(start) &&
        name !== `${prefix}${typed}`,
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, maximum)
    .map(([name]) => name);
}

/**
 * Color "$" variables in screenplay notes and the notes of their project
 * (#321), per the mode's setting.
 */
export function createVariableHighlightExtension(
  plugin: BrassPlugin,
): Extension {
  const mark = Decoration.mark({ class: "brass-variable" });
  const build = (view: EditorView): DecorationSet => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isProjectNote(file)) return Decoration.none;
    if (!plugin.typingChangeEnabled("highlightVariables")) {
      return Decoration.none;
    }
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      for (const range of variableRanges(
        text,
        from,
        plugin.settings.variablePrefix,
      )) {
        builder.add(range.from, range.to, mark);
      }
    }
    return builder.finish();
  };
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = build(view);
      }
      // Switching the mode or the setting reconfigures the editor, so it
      // shows at once; cursor moves alone change nothing here.
      update(update: ViewUpdate): void {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.transactions.some((tr) => tr.reconfigured)
        ) {
          this.decorations = build(update.view);
        }
      }
    },
    { decorations: (value) => value.decorations },
  );
}
