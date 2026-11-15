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

import { closeCompletion } from "@codemirror/autocomplete";
import {
  Prec,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type FirstDraftPlugin from "../main";
import {
  centeredMarkers,
  classifyLayoutLines,
  forcedHeadingDot,
  type LayoutLineKind,
} from "./layoutClassifier";

/** Class on the editor root while the screenplay layout is shown. */
export const SCREENPLAY_LAYOUT_CLASS = "firstdraft-screenplay-layout";

const LINE_DECORATIONS = new Map<LayoutLineKind, Decoration>(
  (
    [
      "scene-heading",
      "action",
      "character",
      "parenthetical",
      "dialogue",
      "transition",
      "centered",
      "lyric",
      "page-break",
      "note",
    ] as const
  ).map((kind) => [
    kind,
    Decoration.line({ attributes: { class: `firstdraft-sp-${kind}` } }),
  ]),
);

const HIDDEN = Decoration.replace({});

/** Turn the cursor's line back into action (Shift+Tab on a pending cue). */
const setActionLine = StateEffect.define<number | null>();

/**
 * Start of the line the writer turned back into action, or null. Cleared
 * once the cursor leaves that line.
 */
const actionLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    let next = value === null ? null : tr.changes.mapPos(value);
    for (const effect of tr.effects) {
      if (effect.is(setActionLine)) next = effect.value;
    }
    if (next === null) return null;
    const { doc, selection } = tr.state;
    return doc.lineAt(selection.main.head).from === doc.lineAt(next).from
      ? next
      : null;
  },
});

/**
 * Screenplay layout for the editor: indents and aligns each Fountain element
 * the way it prints (centered cues, narrow dialogue, right-aligned
 * transitions) in a monospace font. Display only: the note text is not
 * changed. Off when the "Editor layout" setting is "Plain Fountain text".
 */
export function createScreenplayLayoutExtension(
  plugin: FirstDraftPlugin,
): Extension {
  const layoutPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      active = false;
      kinds: (LayoutLineKind | null)[] = [];
      private cursorLine = -1;

      constructor(view: EditorView) {
        this.active = this.isActive(view);
        this.refresh(view, true);
      }

      update(update: ViewUpdate): void {
        const cursorLine =
          update.state.doc.lineAt(update.state.selection.main.head).number - 1;
        const reclassify =
          update.docChanged ||
          cursorLine !== this.cursorLine ||
          update.startState.field(actionLineField, false) !==
            update.state.field(actionLineField, false) ||
          update.startState.field(editorInfoField, false)?.file !==
            update.state.field(editorInfoField, false)?.file;
        const wasActive = this.active;
        // Checking the file is not free, so only when something could change it.
        if (
          update.docChanged ||
          update.transactions.some((tr) => tr.reconfigured) ||
          update.startState.field(editorInfoField, false)?.file !==
            update.state.field(editorInfoField, false)?.file
        ) {
          this.active = this.isActive(update.view);
        }
        if (
          reclassify ||
          this.active !== wasActive ||
          update.viewportChanged ||
          update.transactions.some((tr) => tr.reconfigured)
        ) {
          this.refresh(update.view, reclassify || this.active !== wasActive);
        }
      }

      private isActive(view: EditorView): boolean {
        if (plugin.settings.editorLayout !== "screenplay") return false;
        const file = view.state.field(editorInfoField, false)?.file ?? null;
        return file !== null && plugin.isScreenplayFile(file);
      }

      private refresh(view: EditorView, reclassify: boolean): void {
        if (!this.active) {
          this.kinds = [];
          this.decorations = Decoration.none;
          return;
        }
        const { doc } = view.state;
        this.cursorLine = doc.lineAt(view.state.selection.main.head).number - 1;
        if (reclassify || this.kinds.length !== doc.lines) {
          const lines: string[] = [];
          for (const line of doc.iterLines()) lines.push(line);
          const actionLine = view.state.field(actionLineField, false);
          this.kinds = classifyLayoutLines(
            lines,
            this.cursorLine,
            actionLine == null ? -1 : doc.lineAt(actionLine).number - 1,
          );
        }
        const builder = new RangeSetBuilder<Decoration>();
        let lastLine = 0;
        for (const { from, to } of view.visibleRanges) {
          let position = from;
          while (position <= to) {
            const line = doc.lineAt(position);
            const kind = this.kinds[line.number - 1];
            const decoration = kind ? LINE_DECORATIONS.get(kind) : undefined;
            if (decoration && line.number > lastLine) {
              builder.add(line.from, line.from, decoration);
              lastLine = line.number;
              // Forced slugline ".LATER": hide the "." unless the cursor is
              // on that line, so it reads like any other scene heading.
              const dot = forcedHeadingDot(line.text);
              if (
                kind === "scene-heading" &&
                dot !== -1 &&
                line.number - 1 !== this.cursorLine
              ) {
                builder.add(line.from + dot, line.from + dot + 1, HIDDEN);
              }
              // Centred text "> THE END <": hide both markers off the cursor line.
              const markers =
                kind === "centered" && line.number - 1 !== this.cursorLine
                  ? centeredMarkers(line.text)
                  : null;
              if (markers) {
                for (const [start, end] of markers) {
                  builder.add(line.from + start, line.from + end, HIDDEN);
                }
              }
            }
            position = line.to + 1;
          }
        }
        this.decorations = builder.finish();
      }
    },
    {
      decorations: (value) => value.decorations,
      provide: (self) =>
        EditorView.editorAttributes.of((view) =>
          view.plugin(self)?.active ? { class: SCREENPLAY_LAYOUT_CLASS } : null,
        ),
    },
  );
  // Shift+Tab on the empty line where the next cue goes: close the
  // character list and lay the line out as action instead.
  const shiftTab = (view: EditorView): boolean => {
    const layout = view.plugin(layoutPlugin);
    if (!layout?.active) return false;
    const { state } = view;
    const selection = state.selection.main;
    if (!selection.empty) return false;
    const line = state.doc.lineAt(selection.head);
    if (line.text.trim() !== "") return false;
    if (layout.kinds[line.number - 1] !== "character") return false;
    closeCompletion(view);
    view.dispatch({ effects: setActionLine.of(line.from) });
    return true;
  };

  return [
    actionLineField,
    layoutPlugin,
    Prec.highest(keymap.of([{ key: "Shift-Tab", run: shiftTab }])),
  ];
}
