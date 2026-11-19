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

import { Prec, RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type ScribidianPlugin from "../main";
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
      cls: "scribidian-boneyard-marker",
      text: this.text,
    });
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const BONEYARD = /\/\*[\s\S]*?(?:\*\/|$)/gu;

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

export function createBoneyardMarkerExtension(
  plugin: ScribidianPlugin,
): Extension {
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
        update(update: ViewUpdate): void {
          if (update.docChanged || update.viewportChanged) {
            this.decorations = build(update.view);
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
export function createLineCommentExtension(
  plugin: ScribidianPlugin,
): Extension {
  const faded = Decoration.mark({ class: "scribidian-line-comment" });
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
      update(update: ViewUpdate): void {
        if (update.docChanged) this.decorations = build(update.view);
      }
    },
    { decorations: (value) => value.decorations },
  );
}
