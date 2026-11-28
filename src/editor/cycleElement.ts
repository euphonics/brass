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

import { closeCompletion } from "@codemirror/autocomplete";
import type { Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { LineKind } from "../screenplay/lines";
import { forceElement } from "./completion";
import { docLineKinds } from "./docLines";
import { nextCycleKind } from "./forceElement";
import { setLineKind } from "./lineKindOverride";

/** The element `number`'s line shows as (1-based), as laid out on screen. */
function shownKind(view: EditorView, number: number): LineKind | null {
  const { doc } = view.state;
  const line = doc.line(number);
  try {
    const { node } = view.domAtPos(line.from);
    const el = node instanceof HTMLElement ? node : node.parentElement;
    const match = /\bbrass-sp-([a-z-]+)/u.exec(
      el?.closest(".cm-line")?.className ?? "",
    );
    if (match?.[1]) return match[1] as LineKind;
  } catch {
    // Not drawn: read it from the text below.
  }
  const cursor = doc.lineAt(view.state.selection.main.head).number - 1;
  return docLineKinds(doc, cursor)[number - 1] ?? null;
}

/**
 * Cycle the cursor's line to the next element. On an empty line, that's
 * the element it will become (its column and list); on a line with text,
 * the text changes to the element, as the "Set line to" commands do.
 */
/**
 * The line's text before the first of a run of taps, so going round the
 * cycle doesn't keep what each element did to it ("she waits" back to
 * action is "she waits", not "!SHE WAITS"). Any other change ends the run.
 */
const runs = new WeakMap<
  EditorView,
  { doc: Text; from: number; text: string }
>();

export function cycleElement(view: EditorView): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const run = runs.get(view);
  const source =
    run && run.doc === state.doc && run.from === line.from
      ? run.text
      : line.text;
  cycleFrom(view, line, source);
  const after = view.state.doc.lineAt(view.state.selection.main.head);
  runs.set(view, { doc: view.state.doc, from: after.from, text: source });
}

function cycleFrom(
  view: EditorView,
  line: { from: number; to: number; number: number; text: string },
  source: string,
): void {
  const { state } = view;
  const above = line.number > 1 ? state.doc.line(line.number - 1) : null;
  const aboveKind =
    above && above.text.trim() !== "" ? shownKind(view, line.number - 1) : null;
  const inSpeech =
    aboveKind === "character" ||
    aboveKind === "parenthetical" ||
    aboveKind === "dialogue";
  const next = nextCycleKind(shownKind(view, line.number), inSpeech);
  if (next !== "dialogue") {
    forceElement(view, next, source);
    return;
  }
  // A wryly becomes dialogue: its brackets go, the line lays out as
  // dialogue. ("Set line to" has no dialogue: it depends on the cue above.)
  closeCompletion(view);
  const text = source
    .trim()
    .replace(/^\((.*)\)$/u, "$1")
    .trim();
  view.dispatch({
    changes:
      text === line.text
        ? undefined
        : { from: line.from, to: line.to, insert: text },
    selection: { anchor: line.from + text.length },
    effects: setLineKind.of({ from: line.from, kind: "dialogue" }),
    scrollIntoView: true,
    userEvent: "input",
  });
}
