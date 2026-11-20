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
  dismissedCueLineField,
  lineKindField,
  setDismissedCueLine,
  setLineKind,
} from "./lineKindOverride";
import { tabCueLine } from "./tabCueLine";
import { characterCue } from "../screenplay/lines";
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
      /**
       * Start of the cursor's line while it is laid out as a cue. A cue
       * whose dialogue was deleted keeps the cue's column while the cursor
       * stays on it, instead of dropping to the action margin.
       */
      private cueFrom: number | null = null;
      /** Starts of the lines laid out as cues last time (mapped on edits). */
      private cueStarts: number[] = [];

      constructor(view: EditorView) {
        this.active = this.isActive(view);
        this.refresh(view, true);
      }

      update(update: ViewUpdate): void {
        const cursorLine =
          update.state.doc.lineAt(update.state.selection.main.head).number - 1;
        const cursorMoved = cursorLine !== this.cursorLine;
        if (update.docChanged) {
          if (this.cueFrom !== null) {
            this.cueFrom = update.changes.mapPos(this.cueFrom);
          }
          this.cueStarts = this.cueStarts.map((from) =>
            update.changes.mapPos(from, -1),
          );
        }
        const reclassify =
          update.docChanged ||
          (cursorMoved && this.cueFrom !== null) ||
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
          // Remember a cue the cursor is on. If it stops reading as one
          // only because nothing is under it any more (its dialogue was
          // deleted), keep its column until the cursor leaves the line.
          const cursorFrom = doc.line(this.cursorLine + 1).from;
          // A cue before this edit: the cursor's own, or one it landed on
          // (Backspace from the dialogue line below).
          const remembered =
            this.cueFrom === cursorFrom || this.cueStarts.includes(cursorFrom);
          this.cueFrom = null;
          if (this.kinds[this.cursorLine] === "character") {
            this.cueFrom = cursorFrom;
          } else if (
            remembered &&
            forced === null &&
            this.menuKind === null &&
            this.kinds[this.cursorLine] === "action" &&
            characterCue(lines[this.cursorLine] ?? "") !== null
          ) {
            this.kinds = classifyLayoutLines(lines, this.cursorLine, {
              line: this.cursorLine,
              kind: "character",
            });
            this.cueFrom = cursorFrom;
          }
          this.cueStarts = [];
          let offset = 0;
          lines.forEach((text, index) => {
            if (this.kinds[index] === "character") this.cueStarts.push(offset);
            offset += text.length + 1;
          });
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
      effects: [
        setLineKind.of({ from: line.from, kind: "action" }),
        setDismissedCueLine.of(line.from),
      ],
    });
    return true;
  };

  // Backspace on the empty line laid out as a cue (strict cursor
  // placement): step back to the action margin on the same line, as
  // Shift+Tab does, instead of deleting the line. The next Backspace
  // deletes as usual.
  const backspace = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    return (
      selectionDelete(view) ||
      cueDelete(view) ||
      wrylyDelete(view, false) ||
      emptyCueDelete(view) ||
      shiftTab(view)
    );
  };

  // Setting off (Fade In's behaviour): Backspace on the empty line in the
  // cue column deletes it at once, with the blank lines above, and the
  // cursor goes to the end of the text above.
  const emptyCueDelete = (view: EditorView): boolean => {
    if (plugin.settings.backspaceEmptyCueToAction) return false;
    const layout = view.plugin(layoutPlugin);
    if (!layout?.active) return false;
    const { state } = view;
    const selection = state.selection.main;
    if (state.selection.ranges.length > 1 || !selection.empty) return false;
    const line = state.doc.lineAt(selection.head);
    if (line.text.trim() !== "" || line.number === 1) return false;
    if (layout.kinds[line.number - 1] !== "character") return false;
    let above = line.number - 1;
    while (above > 1 && state.doc.line(above).text.trim() === "") above -= 1;
    const from = state.doc.line(above).to;
    closeCompletion(view);
    view.dispatch({
      changes: { from, to: line.to },
      selection: { anchor: from },
      userEvent: "delete.cue",
      scrollIntoView: true,
    });
    return true;
  };

  // Backspace or Delete with a whole character cue selected, right after
  // another speech (a blank line, then the cue): the cue and the blank line
  // go, and its dialogue carries on the speech above, as in Fade In. After
  // anything else, only the cue line goes; its dialogue stays as action.
  // Deleting only the cue's text would leave an empty line in the cue's
  // column and turn the dialogue under it into action.
  const cueDelete = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    const layout = view.plugin(layoutPlugin);
    if (!layout?.active) return false;
    const { state } = view;
    const selection = state.selection.main;
    if (state.selection.ranges.length > 1 || selection.empty) return false;
    const line = state.doc.lineAt(selection.from);
    if (state.doc.lineAt(selection.to).number !== line.number) return false;
    if (line.number >= state.doc.lines) return false;
    const textFrom =
      line.from + (line.text.length - line.text.trimStart().length);
    const textTo = line.from + line.text.trimEnd().length;
    if (selection.from > textFrom || selection.to < textTo) return false;
    if (layout.kinds[line.number - 1] !== "character") return false;
    if (state.doc.line(line.number + 1).text.trim() === "") return false;
    if (line.number > 1 && state.doc.line(line.number - 1).text.trim() !== "") {
      return false;
    }
    closeCompletion(view);
    const above = line.number > 2 ? layout.kinds[line.number - 3] : null;
    if (above !== "dialogue" && above !== "parenthetical") {
      // Not after a speech (action, a slugline, the top of the note): the
      // cue line goes and its dialogue stays on its own as action.
      view.dispatch({
        changes: { from: line.from, to: line.to + 1 },
        selection: { anchor: line.from },
        userEvent: "delete.cue",
        scrollIntoView: true,
      });
      return true;
    }
    const from = state.doc.line(line.number - 2).to;
    view.dispatch({
      changes: { from, to: line.to },
      selection: { anchor: from + 1 },
      // Not "delete.backward": strict mode stops that from joining two
      // elements, and here joining the speeches is the point.
      userEvent: "delete.cue",
      scrollIntoView: true,
    });
    return true;
  };

  // Backspace or Delete on a wryly that would leave only "(" or ")" on the
  // line, or on an empty "()" with the cursor anywhere: the wryly goes away
  // whole and the cursor lands at the end of the line above (the dialogue).
  // A lone bracket is never left on a wryly line.
  const wrylyDelete = (view: EditorView, forward: boolean): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    const layout = view.plugin(layoutPlugin);
    if (!layout?.active) return false;
    const { state } = view;
    const selection = state.selection.main;
    if (state.selection.ranges.length > 1 || !selection.empty) return false;
    const line = state.doc.lineAt(selection.head);
    if (line.number === 1) return false;
    if (layout.kinds[line.number - 1] !== "parenthetical") return false;
    if (!/^\s*\(\s*\)\s*$/u.test(line.text)) {
      // What one Backspace or Delete would leave on the line.
      const at = selection.head - line.from;
      const before = line.text.slice(0, at);
      const after = line.text.slice(at);
      const left = forward
        ? before + Array.from(after).slice(1).join("")
        : Array.from(before).slice(0, -1).join("") + after;
      if (left === line.text || !/^[()]$/u.test(left.trim())) return false;
    }
    closeCompletion(view);
    // A wryly on its own block (a blank line above it, e.g. after "Set
    // line to wryly"): clear it and leave an empty action line, so the
    // blank line between blocks stays.
    if (state.doc.line(line.number - 1).text.trim() === "") {
      view.dispatch({
        changes: { from: line.from, to: line.to },
        selection: { anchor: line.from },
        effects: setLineKind.of({ from: line.from, kind: "action" }),
        userEvent: "delete.wryly",
        scrollIntoView: true,
      });
      return true;
    }
    // An empty "()" in the middle of a speech (Tab inside dialogue): the
    // dialogue it split joins back into one line, as before the Tab.
    const joinsSpeech =
      line.number < state.doc.lines &&
      layout.kinds[line.number - 2] === "dialogue" &&
      layout.kinds[line.number] === "dialogue";
    const below = joinsSpeech ? state.doc.line(line.number + 1) : null;
    const left = state.doc.line(line.number - 1).text;
    const gap =
      below !== null &&
      /[.!?,;:)]$/u.test(left) &&
      /^[\p{L}\p{N}"'“‘]/u.test(below.text)
        ? " "
        : "";
    view.dispatch({
      changes:
        below !== null
          ? { from: line.from - 1, to: below.from, insert: gap }
          : { from: line.from - 1, to: line.to },
      selection: { anchor: line.from - 1 + gap.length },
      // Not "delete.backward": strict mode stops that from joining two
      // elements, and here the whole line goes.
      userEvent: "delete.wryly",
      scrollIntoView: true,
    });
    return true;
  };

  // Backspace or Delete on a selection over several lines that starts or
  // ends inside a one-line element (slugline, cue, wryly, transition): the
  // touched elements go whole, so no lone "(" or ")", half cue or half
  // slugline is left. Selections that start and end in action or dialogue
  // delete as usual.
  const SNAP_KINDS = new Set([
    "scene-heading",
    "character",
    "parenthetical",
    "transition",
  ]);
  const selectionDelete = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    const layout = view.plugin(layoutPlugin);
    if (!layout?.active) return false;
    const { state } = view;
    const { doc } = state;
    const selection = state.selection.main;
    if (state.selection.ranges.length > 1 || selection.empty) return false;
    const first = doc.lineAt(selection.from);
    const last = doc.lineAt(selection.to);
    if (first.number === last.number) return false;
    const textStart = (line: { from: number; text: string }): number =>
      line.from + (line.text.length - line.text.trimStart().length);
    const textEnd = (line: { from: number; text: string }): number =>
      line.from + line.text.trimEnd().length;
    const cutsFirst =
      selection.from > textStart(first) &&
      SNAP_KINDS.has(layout.kinds[first.number - 1] ?? "");
    const cutsLast =
      selection.to < textEnd(last) &&
      SNAP_KINDS.has(layout.kinds[last.number - 1] ?? "");
    if (!cutsFirst && !cutsLast) return false;
    const fromWhole = cutsFirst || selection.from <= textStart(first);
    const toWhole = cutsLast || selection.to >= textEnd(last);
    if (!fromWhole || !toWhole) {
      // Only one end snaps: widen that end to its whole line.
      const from = cutsFirst ? first.from : selection.from;
      const to = cutsLast ? last.to : selection.to;
      closeCompletion(view);
      view.dispatch({
        changes: { from, to },
        selection: { anchor: from },
        userEvent: "delete.selection",
        scrollIntoView: true,
      });
      return true;
    }
    // Whole lines go, with their line break. A whole block between blank
    // lines takes one blank line with it, so one blank line stays.
    let from = first.from;
    let to = last.to;
    if (last.number < doc.lines) to += 1;
    else if (first.number > 1) from -= 1;
    const blankAbove =
      first.number > 1 && doc.line(first.number - 1).text.trim() === "";
    const blankBelow =
      last.number < doc.lines && doc.line(last.number + 1).text.trim() === "";
    if (blankAbove && (blankBelow || last.number === doc.lines)) {
      from = Math.max(0, doc.line(first.number - 1).from - 1);
      to = last.number < doc.lines ? last.to : to;
    }
    closeCompletion(view);
    view.dispatch({
      changes: { from, to },
      selection: { anchor: from },
      // Not "delete.backward": strict mode would stop the lines joining.
      userEvent: "delete.selection",
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
    dismissedCueLineField,
    layoutPlugin,
    escape,
    Prec.highest(
      keymap.of([
        { key: "Shift-Tab", run: shiftTab },
        { key: "Backspace", run: backspace },
        {
          key: "Delete",
          run: (view) =>
            selectionDelete(view) || cueDelete(view) || wrylyDelete(view, true),
        },
      ]),
    ),
  ];
}
