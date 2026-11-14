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
import { getSmartTabPlan } from "./smartTab";
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
  const tab = (view: EditorView): boolean => {
    if (completionStatus(view.state) === "active")
      return acceptCompletion(view);
    if (!plugin.settings.smartTabEnabled) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;

    const source = view.state.doc.toString();
    const knownTimes = [
      ...plugin.settings.preferredTimesOfDay,
      ...buildScreenplayIndex(parseFountain(source)).timesOfDay.map(
        (usage) => usage.value,
      ),
    ];
    const plan = getSmartTabPlan(source, selection.main.head, knownTimes);
    if (plan === null) return false;
    view.dispatch({
      changes: { from: plan.at, insert: plan.insert },
      selection: { anchor: plan.cursor },
      scrollIntoView: true,
      userEvent: "input",
    });
    if (plan.openCompletion) startCompletion(view);
    return true;
  };

  return [
    autocompletion({
      activateOnTyping: true,
      // Keep the slugline flowing: scene type -> location -> time.
      activateOnCompletion: (completion) =>
        completion.detail === "Location" || completion.detail === "Scene type",
      maxRenderedOptions: 20,
    }),
    EditorState.languageData.of(() => [{ autocomplete: source }]),
    Prec.highest(keymap.of([{ key: "Tab", run: tab }])),
  ];
}
