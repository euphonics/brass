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
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type ScribidianPlugin from "../main";
import {
  findDualDialogue,
  type DualDialogue,
  type DualSide,
} from "./dualDialogue";
import { classifyLayoutLines } from "./layoutClassifier";

/** Both speeches of a dual dialogue, drawn side by side. */
class DualDialogueWidget extends WidgetType {
  constructor(private readonly pair: DualDialogue) {
    super();
  }

  eq(other: DualDialogueWidget): boolean {
    return JSON.stringify(other.pair) === JSON.stringify(this.pair);
  }

  toDOM(view: EditorView): HTMLElement {
    const root = createDiv({ cls: "scribidian-dual" });
    for (const speech of [this.pair.left, this.pair.right]) {
      this.column(root, speech);
    }
    // Clicking puts the cursor in the text, which shows it for editing.
    root.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const position = view.posAtDOM(root);
      view.focus();
      view.dispatch({ selection: { anchor: position } });
    });
    return root;
  }

  private column(parent: HTMLElement, speech: DualSide): void {
    const column = parent.createDiv({ cls: "scribidian-dual-column" });
    column.createDiv({ cls: "scribidian-dual-cue", text: speech.cue });
    for (const line of speech.lines) {
      column.createDiv({
        cls:
          line.kind === "parenthetical"
            ? "scribidian-dual-parenthetical"
            : "scribidian-dual-dialogue",
        text: line.text,
      });
    }
  }

  ignoreEvent(): boolean {
    return false;
  }
}

interface DualState {
  active: boolean;
  pairs: DualDialogue[];
  decorations: DecorationSet;
}

/**
 * Dual dialogue side by side in the screenplay layout. The pair shows as
 * written (with "^") while the cursor is inside it. Display only.
 */
export function createDualDialogueExtension(
  plugin: ScribidianPlugin,
): Extension {
  const isActive = (state: EditorState): boolean => {
    if (!plugin.isScriptMode()) return false;
    const file = state.field(editorInfoField, false)?.file ?? null;
    return file !== null && plugin.isScreenplayFile(file);
  };

  const findPairs = (state: EditorState): DualDialogue[] => {
    const lines: string[] = [];
    for (const line of state.doc.iterLines()) lines.push(line);
    // Only "^" makes dual dialogue, so skip the work without one.
    if (!lines.some((line) => /\^\s*$/u.test(line))) return [];
    return findDualDialogue(lines, classifyLayoutLines(lines));
  };

  const decorate = (
    state: EditorState,
    pairs: DualDialogue[],
  ): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const head = state.selection.main.head;
    for (const pair of pairs) {
      const from = state.doc.line(pair.startLine + 1).from;
      const to = state.doc.line(pair.endLine + 1).to;
      if (head >= from && head <= to) continue;
      builder.add(
        from,
        to,
        Decoration.replace({
          widget: new DualDialogueWidget(pair),
          block: true,
        }),
      );
    }
    return builder.finish();
  };

  const build = (state: EditorState): DualState => {
    const active = isActive(state);
    const pairs = active ? findPairs(state) : [];
    return { active, pairs, decorations: decorate(state, pairs) };
  };

  return StateField.define<DualState>({
    create: build,
    update(value, tr) {
      if (
        tr.docChanged ||
        tr.reconfigured ||
        tr.startState.field(editorInfoField, false)?.file !==
          tr.state.field(editorInfoField, false)?.file
      ) {
        return build(tr.state);
      }
      if (tr.selection && value.pairs.length > 0) {
        return { ...value, decorations: decorate(tr.state, value.pairs) };
      }
      return value;
    },
    provide: (field) =>
      EditorView.decorations.from(field, (value) => value.decorations),
  });
}
