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
  RangeSetBuilder,
  StateField,
  type EditorState,
  type Extension,
  type Text,
  type Transaction,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { editorInfoField, type TFile } from "obsidian";

/*
 * Hide synopses (#352): with "Show synopses" off, a synopsis line ("= The
 * heist goes wrong.") is folded away in screenplay notes, and the line with
 * text above it (the slugline or heading) gets a 📝. The synopsis shows
 * while the cursor is on it; clicking the 📝 puts the cursor there.
 *
 * Speed: the whole note is read only when the field starts, when the
 * setting or the file changes. A keystroke re-checks only the lines it
 * touched, plus the cursor's old and new lines.
 */

/** Shown after the line above a hidden synopsis. */
export const HIDDEN_SYNOPSIS_MARK = "📝";

/** A Fountain synopsis: "= text" (not a page break "==="). */
export function isSynopsisLine(text: string): boolean {
  return /^\s*=(?!=)/u.test(text);
}

export interface SynopsisHideHost {
  /** False when the writer hides synopses. */
  showSynopses: () => boolean;
  isScreenplayFile: (file: TFile) => boolean;
}

class MarkWidget extends WidgetType {
  constructor(readonly target: number) {
    super();
  }

  eq(other: MarkWidget): boolean {
    return other.target === this.target;
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement("span");
    span.className = "brass-synopsis-mark";
    span.textContent = ` ${HIDDEN_SYNOPSIS_MARK}`;
    span.setAttribute("aria-label", "Show the synopsis");
    span.title = "Show the synopsis";
    span.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const line = view.state.doc.lineAt(
        Math.min(this.target, view.state.doc.length),
      );
      view.dispatch({ selection: { anchor: line.to }, scrollIntoView: true });
      view.focus();
    });
    return span;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

interface HideState {
  /** Whether hiding is on for this editor (setting off, screenplay file). */
  on: boolean;
  path: string | null;
  /** 1-based numbers of hidden synopsis lines. */
  hidden: Set<number>;
  decorations: DecorationSet;
}

/** The nearest line with text above `number`, skipping synopses. */
function lineAbove(doc: Text, number: number): number | null {
  for (let at = number - 1; at >= 1; at -= 1) {
    const text = doc.line(at).text;
    if (text.trim() !== "" && !isSynopsisLine(text)) return at;
  }
  return null;
}

/** Decorations for the hidden lines: each folded, a 📝 on the line above. */
function decorate(doc: Text, hidden: Set<number>): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const marks = new Map<number, number>();
  for (const number of hidden) {
    const above = lineAbove(doc, number);
    if (above !== null && !marks.has(above)) marks.set(above, number);
  }
  const points: {
    at: number;
    deco: Decoration;
    side: number;
    block: boolean;
  }[] = [];
  for (const [above, number] of marks) {
    points.push({
      at: doc.line(above).to,
      side: 1,
      block: false,
      deco: Decoration.widget({
        widget: new MarkWidget(doc.line(number).from),
        side: 1,
      }),
    });
  }
  for (const number of hidden) {
    const line = doc.line(number);
    points.push({
      at: line.from,
      side: 0,
      block: true,
      deco: Decoration.replace({ block: true }),
    });
  }
  points.sort((a, b) => a.at - b.at || a.side - b.side);
  for (const point of points) {
    if (point.block) {
      const line = doc.lineAt(point.at);
      builder.add(line.from, line.to, point.deco);
    } else builder.add(point.at, point.at, point.deco);
  }
  return builder.finish();
}

function cursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let at = first; at <= last && at - first < 1000; at += 1) {
      lines.add(at);
    }
  }
  return lines;
}

function fullScan(state: EditorState): Set<number> {
  const hidden = new Set<number>();
  const shown = cursorLines(state);
  const { doc } = state;
  for (let at = 1; at <= doc.lines; at += 1) {
    if (!shown.has(at) && isSynopsisLine(doc.line(at).text)) hidden.add(at);
  }
  return hidden;
}

const EMPTY: HideState = {
  on: false,
  path: null,
  hidden: new Set(),
  decorations: Decoration.none,
};

export function createSynopsisHideExtension(host: SynopsisHideHost): Extension {
  const wanted = (state: EditorState): { on: boolean; path: string | null } => {
    const file = state.field(editorInfoField, false)?.file ?? null;
    const path = file?.path ?? null;
    return {
      on: file !== null && !host.showSynopses() && host.isScreenplayFile(file),
      path,
    };
  };

  const start = (state: EditorState): HideState => {
    const { on, path } = wanted(state);
    if (!on) return { ...EMPTY, path };
    const hidden = fullScan(state);
    return { on, path, hidden, decorations: decorate(state.doc, hidden) };
  };

  const field = StateField.define<HideState>({
    create: (state) => start(state),
    update(value, tr: Transaction) {
      const { on, path } = wanted(tr.state);
      if (on !== value.on || path !== value.path) return start(tr.state);
      if (!on) return value;
      if (!tr.docChanged && tr.selection === undefined) return value;
      const { doc } = tr.state;
      const touched = new Set<number>();
      // Lines the edit reached, renumbered through it.
      const hidden = new Set<number>();
      if (tr.docChanged) {
        const old = tr.startState.doc;
        for (const number of value.hidden) {
          const line = old.line(number);
          const from = tr.changes.mapPos(line.from, 1, 2);
          if (from === null) continue;
          hidden.add(doc.lineAt(from).number);
        }
        tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
          const first = doc.lineAt(fromB).number;
          const last = doc.lineAt(toB).number;
          for (let at = first; at <= last; at += 1) touched.add(at);
        });
      } else {
        for (const number of value.hidden) hidden.add(number);
      }
      for (const at of cursorLines(tr.startState)) {
        const mapped = tr.docChanged
          ? doc.lineAt(
              tr.changes.mapPos(
                tr.startState.doc.line(Math.min(at, tr.startState.doc.lines))
                  .from,
              ),
            ).number
          : at;
        touched.add(mapped);
      }
      const shown = cursorLines(tr.state);
      for (const at of shown) touched.add(at);
      let changed = false;
      for (const at of touched) {
        if (at < 1 || at > doc.lines) continue;
        const hide = !shown.has(at) && isSynopsisLine(doc.line(at).text);
        if (hide !== hidden.has(at)) changed = true;
        if (hide) hidden.add(at);
        else hidden.delete(at);
      }
      // An edit just above a hidden synopsis may move its 📝 to another
      // line: draw again. Otherwise the decorations only shift.
      if (!changed && tr.docChanged) {
        for (const at of touched) {
          if (hidden.has(at + 1) || hidden.has(at + 2) || hidden.has(at + 3)) {
            changed = true;
            break;
          }
        }
      }
      if (!changed) {
        return tr.docChanged
          ? { ...value, hidden, decorations: value.decorations.map(tr.changes) }
          : value;
      }
      return {
        on,
        path,
        hidden,
        decorations: decorate(doc, hidden),
      };
    },
    provide: (f) =>
      EditorView.decorations.from(f, (value) => value.decorations),
  });
  return field;
}
