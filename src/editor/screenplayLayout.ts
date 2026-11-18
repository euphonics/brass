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

import { lineKindField, setLineKind } from "./lineKindOverride";
import { tabCueLine } from "./tabCueLine";
import {
  closeCompletion,
  completionStatus,
  currentCompletions,
} from "@codemirror/autocomplete";
import type { EditorState } from "@codemirror/state";
import { Prec, RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type ScribidianPlugin from "../main";
import {
  centeredMarkers,
  classifyLayoutLines,
  cursorAffectsLayout,
  menuLineKind,
  forcedHeadingDot,
  type LayoutLineKind,
} from "./layoutClassifier";

/** Class on the editor root while the screenplay layout is shown. */
export const SCREENPLAY_LAYOUT_CLASS = "scribidian-screenplay-layout";

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
    Decoration.line({ attributes: { class: `scribidian-sp-${kind}` } }),
  ]),
);

const HIDDEN = Decoration.replace({});

/**
 * Element of the open suggestion list on an empty cursor line, or null. A
 * line where Tab put a cue counts as a character even when the list is
 * empty (no characters yet). With text typed, the slugline list keeps its
 * line at the left margin ("IN" in capitals would otherwise read as a cue
 * being typed) and the character list puts it in the cue's column ("Je"
 * in lower case would otherwise read as action).
 */
function openMenuKind(state: EditorState): LayoutLineKind | null {
  const line = state.doc.lineAt(state.selection.main.head);
  const empty = line.text.trim() === "";
  if (completionStatus(state) === "active") {
    const kind = menuLineKind(currentCompletions(state)[0]?.detail);
    return empty || kind === "scene-heading" || kind === "character"
      ? kind
      : null;
  }
  if (!empty) return null;
  return tabCueLine(state) !== null ? "character" : null;
}

/**
 * Screenplay layout for the editor: indents and aligns each Fountain element
 * the way it prints (centered cues, narrow dialogue, right-aligned
 * transitions) in a monospace font. Display only: the note text is not
 * changed. Off when the "Editor layout" setting is "Plain Fountain text".
 */
export function createScreenplayLayoutExtension(
  plugin: ScribidianPlugin,
): Extension {
  const layoutPlugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      active = false;
      kinds: (LayoutLineKind | null)[] = [];
      private cursorLine = -1;
      private menuKind: LayoutLineKind | null = null;

      constructor(view: EditorView) {
        this.active = this.isActive(view);
        this.refresh(view, true);
      }

      update(update: ViewUpdate): void {
        const cursorLine =
          update.state.doc.lineAt(update.state.selection.main.head).number - 1;
        const cursorMoved = cursorLine !== this.cursorLine;
        const reclassify =
          update.docChanged ||
          (cursorMoved &&
            (cursorAffectsLayout(update.state.doc, this.cursorLine) ||
              cursorAffectsLayout(update.state.doc, cursorLine))) ||
          openMenuKind(update.state) !== this.menuKind ||
          update.startState.field(lineKindField, false) !==
            update.state.field(lineKindField, false) ||
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
          cursorMoved ||
          this.active !== wasActive ||
          update.viewportChanged ||
          update.transactions.some((tr) => tr.reconfigured)
        ) {
          this.refresh(update.view, reclassify || this.active !== wasActive);
        }
      }

      private isActive(view: EditorView): boolean {
        if (!plugin.isScriptMode()) return false;
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
          const forced = view.state.field(lineKindField, false) ?? null;
          // An open suggestion list on an empty line puts the cursor in its
          // element's column (the character list centres it).
          this.menuKind = openMenuKind(view.state);
          this.kinds = classifyLayoutLines(
            lines,
            this.cursorLine,
            forced !== null
              ? { line: doc.lineAt(forced.from).number - 1, kind: forced.kind }
              : this.menuKind !== null
                ? { line: this.cursorLine, kind: this.menuKind }
                : null,
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
    view.dispatch({
      effects: setLineKind.of({ from: line.from, kind: "action" }),
    });
    return true;
  };

  // Backspace on the empty line laid out as a cue (strict cursor
  // placement): step back to the action margin on the same line, as
  // Shift+Tab does, instead of deleting the line. The next Backspace
  // deletes as usual.
  const backspace = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    return emptyWryly(view) || shiftTab(view);
  };

  // Backspace inside an empty wryly, "(|)": the wryly goes away whole and
  // the cursor lands at the end of the line above (the dialogue), instead
  // of leaving a stray ")".
  const emptyWryly = (view: EditorView): boolean => {
    const layout = view.plugin(layoutPlugin);
    if (!layout?.active) return false;
    const { state } = view;
    const selection = state.selection.main;
    if (state.selection.ranges.length > 1 || !selection.empty) return false;
    const line = state.doc.lineAt(selection.head);
    if (line.number === 1) return false;
    if (layout.kinds[line.number - 1] !== "parenthetical") return false;
    const match = /^(\s*\()\s*\)\s*$/u.exec(line.text);
    if (match === null) return false;
    const inside = selection.head - line.from;
    if (
      inside < (match[1] ?? "").length ||
      inside > line.text.trimEnd().length - 1
    ) {
      return false;
    }
    closeCompletion(view);
    view.dispatch({
      changes: { from: line.from - 1, to: line.to },
      selection: { anchor: line.from - 1 },
      // Not "delete.backward": strict mode stops that from joining two
      // elements, and here the whole line goes.
      userEvent: "delete.wryly",
      scrollIntoView: true,
    });
    return true;
  };

  // Escape closing the character list on the empty next-cue line: the
  // writer chose not to add a cue, so the line becomes action (as with
  // Shift+Tab) instead of staying centred until they type. Observed, not
  // handled, so the list's own Escape still runs.
  const escape = EditorView.domEventObservers({
    keydown(event, view) {
      if (event.key !== "Escape") return;
      if (
        completionStatus(view.state) !== "active" &&
        tabCueLine(view.state) === null
      ) {
        return;
      }
      window.setTimeout(() => shiftTab(view), 0);
    },
  });

  return [
    lineKindField,
    layoutPlugin,
    escape,
    Prec.highest(
      keymap.of([
        { key: "Shift-Tab", run: shiftTab },
        { key: "Backspace", run: backspace },
      ]),
    ),
  ];
}
