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
import type ScribidianPlugin from "../main";

/*
 * "$" variables ("$my_variable", "$ABC123"), a Scribidian addition: shown
 * in the theme's accent colour so placeholders stand out. Dollar amounts
 * ("$123", "$123.12", "$1,123.12") aren't variables and stay as they are.
 */

const VARIABLE = /\$[\p{L}\p{N}_.,]+/gu;

/**
 * Ranges of "$" variables in `text`, starting at `offset`: "$" and the
 * letters, digits and underscores after it. A trailing "." or "," is
 * punctuation, not part of the name; a name of only digits, "." and ","
 * is a dollar amount and is skipped.
 */
export function variableRanges(
  text: string,
  offset = 0,
): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  for (const match of text.matchAll(VARIABLE)) {
    const name = match[0].slice(1).replace(/[.,]+$/u, "");
    if (name === "" || /^[\d.,]+$/u.test(name)) continue;
    const from = offset + (match.index ?? 0);
    ranges.push({ from, to: from + 1 + name.length });
  }
  return ranges;
}

/** Colour "$" variables in screenplay notes, per the mode's setting. */
export function createVariableHighlightExtension(
  plugin: ScribidianPlugin,
): Extension {
  const mark = Decoration.mark({ class: "scribidian-variable" });
  const build = (view: EditorView): DecorationSet => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return Decoration.none;
    if (!plugin.typingChangeEnabled("highlightVariables")) {
      return Decoration.none;
    }
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      for (const range of variableRanges(text, from)) {
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
      // Every update, so switching the mode or the setting shows at once.
      update(update: ViewUpdate): void {
        this.decorations = build(update.view);
      }
    },
    { decorations: (value) => value.decorations },
  );
}
