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

import {
  acceptCompletion,
  autocompletion,
  completionStatus,
  pickedCompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { EditorState, Prec, type Extension } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type FirstDraftPlugin from "../main";
import { loadScreenplayContext } from "../projects/vault";
import { buildScreenplayIndex } from "../screenplay/indexer";
import { parseFountain } from "../screenplay/parser";
import {
  getSmartEnterPlan,
  getSmartTabPlan,
  isForcedTransition,
  type SmartTabPlan,
} from "./smartTab";
import {
  getScreenplayCompletionPlan,
  type CompletionCandidate,
} from "./completionEngine";

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
  plugin: FirstDraftPlugin,
): Extension {
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
    const screenplay = await loadScreenplayContext(
      plugin.app,
      file,
      plugin.settings.characterFolder,
      editorSource,
    );
    const plan = getScreenplayCompletionPlan(
      editorSource,
      context.pos,
      plugin.settings,
      context.explicit,
      screenplay.document,
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
    const knownTimes = [
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
  const uppercaseTransitions = EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || !tr.isUserEvent("input.type")) return tr;
    const file = tr.startState.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return tr;
    const fixes: { from: number; to: number; insert: string }[] = [];
    tr.changes.iterChanges((_fromA, _toA, fromB, toB, inserted) => {
      const text = inserted.toString();
      const upper = text.toLocaleUpperCase();
      if (upper === text || upper.length !== text.length) return;
      if (!isForcedTransition(tr.newDoc.lineAt(fromB).text)) return;
      fixes.push({ from: fromB, to: toB, insert: upper });
    });
    return fixes.length === 0 ? tr : [tr, { changes: fixes, sequential: true }];
  });

  return [
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
