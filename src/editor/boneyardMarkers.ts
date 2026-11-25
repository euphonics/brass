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

import {
  Prec,
  RangeSetBuilder,
  type Extension,
  type Range,
} from "@codemirror/state";
import {
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type BrassPlugin from "../main";
import { findLineComment } from "../screenplay/lines";

/*
 * Every "*" in a Fountain boneyard ("/* ... *\/") shows in screenplay
 * notes, the markers' own included. Obsidian's Live Preview reads them as
 * Markdown emphasis and hides them unless the cursor is next to them, so
 * "/* test *\/" showed as "/* test /". These widgets draw each "*" as
 * typed and win over Obsidian's own hiding (highest precedence).
 */

class MarkerWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  eq(other: MarkerWidget): boolean {
    return other.text === this.text;
  }

  toDOM(): HTMLElement {
    return createSpan({
      cls: "brass-boneyard-marker",
      text: this.text,
    });
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const BONEYARD = /\/\*[\s\S]*?(?:\*\/|$)/gu;
/** Text that starts or ends a boneyard. */
const BONEYARD_MARK = /\/\*|\*\//u;
/** Boneyard or code-fence markers: these change lines beyond the edit. */
const COMPLEX_MARK = /\/\*|\*\/|```|~~~/u;

/** Whether the text of the edited lines (before or after) matches `mark`. */
function changeTouches(update: ViewUpdate, mark: RegExp): boolean {
  let touches = false;
  update.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
    const before = update.startState.doc;
    const after = update.state.doc;
    if (
      mark.test(
        before.sliceString(before.lineAt(fromA).from, before.lineAt(toA).to),
      ) ||
      mark.test(
        after.sliceString(after.lineAt(fromB).from, after.lineAt(toB).to),
      )
    )
      touches = true;
  });
  return touches;
}

/** An edit near the top may change the frontmatter (screenplay or not). */
function changeNearTop(update: ViewUpdate): boolean {
  let near = false;
  update.changes.iterChangedRanges((_fromA, _toA, fromB) => {
    if (update.state.doc.lineAt(fromB).number <= 60) near = true;
  });
  return near;
}

/**
 * Offsets of every "*" in a boneyard ("/* ... *\/", or to the end of the
 * note when it isn't closed), the markers' own included. Fountain shows
 * boneyard text as typed, so none of it is emphasis.
 */
export function boneyardStars(text: string): number[] {
  const stars: number[] = [];
  for (const match of text.matchAll(BONEYARD)) {
    const start = match.index ?? 0;
    for (let index = 0; index < match[0].length; index += 1) {
      if (match[0][index] === "*") stars.push(start + index);
    }
  }
  return stars;
}

export function createBoneyardMarkerExtension(plugin: BrassPlugin): Extension {
  const build = (view: EditorView): DecorationSet => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return Decoration.none;
    const builder = new RangeSetBuilder<Decoration>();
    const visible = view.visibleRanges;
    for (const at of boneyardStars(view.state.doc.toString())) {
      if (!visible.some((range) => at >= range.from && at < range.to)) {
        continue;
      }
      builder.add(
        at,
        at + 1,
        Decoration.replace({ widget: new MarkerWidget("*") }),
      );
    }
    return builder.finish();
  };
  return Prec.highest(
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = build(view);
        }
        /** The note has a boneyard ("/*"): stars must be found again. */
        private hasBoneyard = true;
        update(update: ViewUpdate): void {
          // Most notes have no boneyard and most edits don't start one:
          // then there are no stars, and nothing to scan.
          if (
            update.docChanged &&
            !this.hasBoneyard &&
            !changeTouches(update, BONEYARD_MARK) &&
            !changeNearTop(update)
          ) {
            return;
          }
          if (update.docChanged || update.viewportChanged) {
            this.decorations = build(update.view);
            this.hasBoneyard = update.state.doc.sliceString(0).includes("/*");
          }
        }
      },
      { decorations: (value) => value.decorations },
    ),
  );
}

/**
 * Ranges of line comments ("// note" to the end of the line) in `text`,
 * outside boneyards and fenced code blocks.
 */
export function lineCommentRanges(
  text: string,
): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  let offset = 0;
  let inBoneyard = false;
  let fence: string | null = null;
  for (const line of text.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})/u.exec(line)?.[1] ?? null;
    if (fence === null && marker !== null) {
      fence = marker;
    } else if (fence !== null) {
      if (marker !== null && marker[0] === fence[0] && line.trim() === marker) {
        fence = null;
      }
    } else {
      const comment = findLineComment(line, inBoneyard);
      inBoneyard = comment.inBoneyard;
      if (comment.at !== null) {
        ranges.push({ from: offset + comment.at, to: offset + line.length });
      }
    }
    offset += line.length + 1;
  }
  return ranges;
}

/** Line comments shown faded in screenplay notes. */
export function createLineCommentExtension(plugin: BrassPlugin): Extension {
  const faded = Decoration.mark({ class: "brass-line-comment" });
  const build = (view: EditorView): DecorationSet => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return Decoration.none;
    const builder = new RangeSetBuilder<Decoration>();
    for (const range of lineCommentRanges(view.state.doc.toString())) {
      if (range.to > range.from) builder.add(range.from, range.to, faded);
    }
    return builder.finish();
  };
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = build(view);
      }
      /** The note has a boneyard or a code fence: always rescan in full. */
      private complex = true;
      update(update: ViewUpdate): void {
        if (!update.docChanged) return;
        if (
          this.complex ||
          changeTouches(update, COMPLEX_MARK) ||
          changeNearTop(update)
        ) {
          this.decorations = build(update.view);
          this.complex = COMPLEX_MARK.test(update.state.doc.sliceString(0));
          return;
        }
        // Rescan only the edited lines; the rest keep their decorations.
        let decorations = this.decorations.map(update.changes);
        const doc = update.state.doc;
        update.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
          const from = doc.lineAt(fromB).from;
          const to = doc.lineAt(toB).to;
          const added: Range<Decoration>[] = [];
          for (
            let number = doc.lineAt(from).number;
            number <= doc.lineAt(to).number;
            number += 1
          ) {
            const line = doc.line(number);
            const at = findLineComment(line.text, false).at;
            if (at !== null && line.to > line.from + at)
              added.push(faded.range(line.from + at, line.to));
          }
          decorations = decorations.update({
            filterFrom: from,
            filterTo: to,
            filter: (rangeFrom, rangeTo) => rangeTo < from || rangeFrom > to,
            add: added,
            sort: true,
          });
        });
        this.decorations = decorations;
      }
    },
    { decorations: (value) => value.decorations },
  );
}
