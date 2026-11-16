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
import { forceElementPlan, type ForcedElement } from "./forceElement";
import {
  acceptCompletion,
  closeCompletion,
  autocompletion,
  completionStatus,
  pickedCompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import {
  EditorState,
  Prec,
  StateEffect,
  StateField,
  type Extension,
  type Text,
} from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type ScribidianPlugin from "../main";
import { loadScreenplayContext } from "../projects/vault";
import { buildScreenplayIndex } from "../screenplay/indexer";
import { parseFountain } from "../screenplay/parser";
import { ScreenplayIndexCache, textOutsideLine } from "./indexCache";
import {
  getSmartEnterPlan,
  getSmartTabPlan,
  capitalizeLineStart,
  isForcedTransition,
  type SmartTabPlan,
} from "./smartTab";
import {
  getScreenplayCompletionPlan,
  type CompletionCandidate,
} from "./completionEngine";

/** A suggestion list asked for by a "Set line to …" command. */
const setForcedList = StateEffect.define<"scene-type" | "character" | null>();

/**
 * The forced list and the line it is for. It lasts while the cursor stays
 * on that line and the line has no space yet (a scene type or a name).
 */
const forcedListField = StateField.define<{
  kind: "scene-type" | "character";
  line: number;
} | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setForcedList)) {
        const head = tr.state.selection.main.head;
        return effect.value === null
          ? null
          : { kind: effect.value, line: tr.state.doc.lineAt(head).from };
      }
    }
    if (value === null) return null;
    const line = tr.changes.mapPos(value.line);
    const current = tr.state.doc.lineAt(tr.state.selection.main.head);
    if (current.from !== line) return null;
    return /\s/u.test(current.text.trim()) ? null : { ...value, line };
  },
});

/**
 * Turn the cursor's line into `element` (a "Set line to …" command): see
 * forceElementPlan. Opens the element's suggestion list on a blank line.
 */
export function forceElement(view: EditorView, element: ForcedElement): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const plan = forceElementPlan(line.text, element);
  // Whatever list is open belongs to the old element: close it. The new
  // element's own list (if it has one) opens below.
  closeCompletion(view);
  // On a blank line, also lay the line out as the element right away, so
  // the cursor moves to its column (a slugline at the left margin).
  const layout =
    line.text.trim() === ""
      ? setLineKind.of({ from: line.from, kind: element })
      : null;
  if (plan === null) {
    if (layout) view.dispatch({ effects: layout });
    return;
  }
  const forced =
    plan.complete === "scene-type" || plan.complete === "character"
      ? plan.complete
      : null;
  // Sluglines and transitions get a blank line above and below, if missing.
  const { doc } = state;
  const blankAt = (number: number) =>
    number < 1 || number > doc.lines || doc.line(number).text.trim() === "";
  const above = plan.spaced && !blankAt(line.number - 1) ? "\n" : "";
  const below = plan.spaced && !blankAt(line.number + 1) ? "\n" : "";
  const insert = `${above}${plan.text}${below}`;
  const lineStart = line.from + above.length;
  const effects: StateEffect<unknown>[] = [setForcedList.of(forced)];
  if (layout) effects.push(setLineKind.of({ from: lineStart, kind: element }));
  view.dispatch({
    changes:
      insert === line.text
        ? undefined
        : { from: line.from, to: line.to, insert },
    selection: { anchor: lineStart + plan.cursor },
    effects,
    scrollIntoView: true,
    userEvent: "input",
  });
  if (plan.complete !== null) startCompletion(view);
}

function applyCandidate(
  view: EditorView,
  completion: Completion,
  from: number,
  to: number,
  candidate: CompletionCandidate,
): void {
  view.dispatch({
    changes: { from, to, insert: candidate.applyText },
    selection: { anchor: from + candidate.applyText.length },
    annotations: pickedCompletion.of(completion),
    // Marks the change as a picked suggestion, so activateOnCompletion can
    // open the next list (scene type -> location -> time).
    userEvent: "input.complete",
  });
}

export function createScreenplayCompletionExtension(
  plugin: ScribidianPlugin,
): Extension {
  // Smart rebuild: reuse the suggestion index while only the current line
  // changes. Edits to other notes (e.g. other project parts) clear it.
  const indexCache = new ScreenplayIndexCache();
  plugin.registerEvent(
    plugin.app.vault.on("modify", (changed) =>
      indexCache.invalidate(changed.path),
    ),
  );
  plugin.registerEvent(
    plugin.app.vault.on("rename", () => indexCache.invalidate()),
  );
  plugin.registerEvent(
    plugin.app.vault.on("delete", () => indexCache.invalidate()),
  );

  const source = async (
    context: CompletionContext,
  ): Promise<CompletionResult | null> => {
    const info = context.state.field(editorInfoField, false);
    const file = info?.file ?? null;
    if (
      !plugin.settings.autocompleteEnabled ||
      !plugin.isScreenplayFile(file) ||
      file === null
    ) {
      return null;
    }

    const editorSource = context.state.doc.toString();
    const line = context.state.doc.lineAt(context.pos);
    const outside = textOutsideLine(editorSource, line.from, line.to);
    const index = await indexCache.get(file.path, outside, async () => {
      const screenplay = await loadScreenplayContext(
        plugin.app,
        file,
        plugin.settings.characterFolder,
        outside,
      );
      return buildScreenplayIndex(screenplay.document);
    });
    // A line set to an element (Set line, Shift+Tab) only gets that
    // element's list: none for action or centred text, scene parts at the
    // left margin, characters in the middle.
    const lineKind = context.state.field(lineKindField, false) ?? null;
    const onSetLine =
      lineKind !== null &&
      context.state.doc.lineAt(lineKind.from).from === line.from;
    if (
      onSetLine &&
      (lineKind.kind === "action" || lineKind.kind === "centered")
    ) {
      return null;
    }
    const forced =
      context.state.field(forcedListField, false) ??
      (onSetLine && lineKind.kind === "scene-heading"
        ? { kind: "scene-type" as const }
        : onSetLine && lineKind.kind === "character"
          ? { kind: "character" as const }
          : null);
    const plan = getScreenplayCompletionPlan(
      editorSource,
      context.pos,
      plugin.settings,
      context.explicit,
      undefined,
      index,
      forced?.kind,
    );
    if (!plan) return null;

    return {
      from: plan.from,
      to: plan.to,
      filter: false,
      options: plan.candidates.map((candidate) => ({
        label: candidate.label,
        detail: candidate.detail,
        apply: (view, completion, from, to) =>
          applyCandidate(view, completion, from, to, candidate),
      })),
    };
  };

  // Tab accepts an open suggestion; otherwise Smart Tab may insert the next
  // Fountain element. Returning false keeps Obsidian's normal Tab.
  const smartPlan = (
    view: EditorView,
    planner: typeof getSmartTabPlan = getSmartTabPlan,
  ): SmartTabPlan | null => {
    if (!plugin.settings.smartTabEnabled) return null;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return null;
    const { selection } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return null;

    const source = view.state.doc.toString();
    // Only scene headings need the script's times; parse lazily.
    const knownTimes = () => [
      ...plugin.settings.preferredTimesOfDay,
      ...buildScreenplayIndex(parseFountain(source)).timesOfDay.map(
        (usage) => usage.value,
      ),
    ];
    return planner(source, selection.main.head, knownTimes);
  };

  const tab = (view: EditorView): boolean => {
    if (completionStatus(view.state) === "active")
      return acceptCompletion(view);
    const plan = smartPlan(view);
    return plan !== null && applySmartPlan(view, plan);
  };

  // Enter at the end of a transition starts a slugline; at the end of
  // dialogue, a new speaker. An open suggestion menu keeps Enter for
  // accepting.
  const enter = (view: EditorView): boolean => {
    if (completionStatus(view.state) === "active") return false;
    const plan = smartPlan(view, getSmartEnterPlan);
    return plan !== null && applySmartPlan(view, plan);
  };

  // Shift+Enter: a plain line break, e.g. to continue the same speech.
  const shiftEnter = (view: EditorView): boolean => {
    if (completionStatus(view.state) === "active") return false;
    if (!plugin.settings.smartTabEnabled) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    view.dispatch(view.state.replaceSelection("\n"), {
      scrollIntoView: true,
      userEvent: "input",
    });
    return true;
  };

  const applySmartPlan = (view: EditorView, plan: SmartTabPlan): boolean => {
    if (plan.insert) {
      view.dispatch({
        changes: {
          from: plan.replaceFrom ?? plan.at,
          to: plan.at,
          insert: plan.insert,
        },
        selection: { anchor: plan.cursor },
        scrollIntoView: true,
        userEvent: "input",
      });
    }
    if (plan.openCompletion) startCompletion(view);
    return true;
  };

  // Transitions are all caps: typing on a "> ..." line is uppercased.
  // Line numbers are 1-based; frontmatter is "---" ... "---" at the top.
  const inFrontmatter = (doc: Text, lineNumber: number): boolean => {
    if (doc.line(1).text.trim() !== "---") return false;
    for (
      let number = 2;
      number <= Math.min(doc.lines, lineNumber);
      number += 1
    ) {
      if (doc.line(number).text.trim() === "---") return lineNumber <= number;
    }
    return true;
  };

  const uppercaseTransitions = EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !tr.isUserEvent("input.type")) return tr;
    // Leave text alone while a phone keyboard is composing a word: changing
    // it mid-composition makes the keyboard duplicate or garble letters.
    if (tr.isUserEvent("input.type.compose")) return tr;
    const file = tr.startState.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return tr;
    const fixes: { from: number; to: number; insert: string }[] = [];
    tr.changes.iterChanges((_fromA, _toA, fromB, toB, inserted) => {
      const text = inserted.toString();
      const line = tr.newDoc.lineAt(fromB);
      // Capitalize the first letter typed on a line (setting), outside
      // the frontmatter.
      if (plugin.settings.capitalizeLineStarts) {
        const capital = capitalizeLineStart(
          tr.newDoc.sliceString(line.from, fromB),
          text,
        );
        if (capital !== null && !inFrontmatter(tr.newDoc, line.number)) {
          fixes.push({ from: fromB, to: toB, insert: capital });
          return;
        }
      }
      const upper = text.toLocaleUpperCase();
      if (upper === text || upper.length !== text.length) return;
      if (!isForcedTransition(line.text)) return;
      fixes.push({ from: fromB, to: toB, insert: upper });
    });
    return fixes.length === 0 ? tr : [tr, { changes: fixes, sequential: true }];
  });

  return [
    forcedListField,
    uppercaseTransitions,
    autocompletion({
      activateOnTyping: true,
      // Keep the slugline flowing: scene type -> location -> time.
      activateOnCompletion: (completion) =>
        completion.detail === "Location" || completion.detail === "Scene type",
      maxRenderedOptions: 20,
    }),
    EditorState.languageData.of(() => [{ autocomplete: source }]),
    Prec.highest(
      keymap.of([
        { key: "Tab", run: tab },
        { key: "Enter", run: enter },
        { key: "Shift-Enter", run: shiftEnter },
      ]),
    ),
  ];
}
