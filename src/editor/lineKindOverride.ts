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

import { StateEffect, StateField } from "@codemirror/state";
import type { LayoutLineKind } from "./layoutClassifier";

/** The cursor's line, laid out as a chosen element. */
export interface LineKindOverride {
  /** Start of the line. */
  from: number;
  kind: LayoutLineKind;
}

/**
 * Lay out the cursor's line as `kind` (Shift+Tab, "Set line to …"), or
 * clear the override with null.
 */
export const setLineKind = StateEffect.define<LineKindOverride | null>();

/**
 * The writer's choice of element for the cursor's line, kept while the
 * cursor stays on it. It lets a blank line show where the element goes
 * (a slugline at the left margin) before anything is typed.
 */
export const lineKindField = StateField.define<LineKindOverride | null>({
  create: () => null,
  update(value, tr) {
    let next =
      value === null ? null : { ...value, from: tr.changes.mapPos(value.from) };
    for (const effect of tr.effects) {
      if (effect.is(setLineKind)) next = effect.value;
    }
    if (next === null) return null;
    const { doc, selection } = tr.state;
    return doc.lineAt(selection.main.head).from === doc.lineAt(next.from).from
      ? next
      : null;
  },
});
