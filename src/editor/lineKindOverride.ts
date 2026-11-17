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

import { isForcedTransition, isSceneHeading } from "../screenplay/lines";
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
    // The line merged into the one above (its line break deleted): the
    // choice was for that line, not for the one it joined.
    let merged = false;
    if (value !== null) {
      tr.changes.iterChanges((fromA, toA) => {
        if (fromA < value.from && toA >= value.from) merged = true;
      });
    }
    let next =
      value === null || merged
        ? null
        : { ...value, from: tr.changes.mapPos(value.from) };
    for (const effect of tr.effects) {
      if (effect.is(setLineKind)) next = effect.value;
    }
    if (next === null) return null;
    const { doc, selection } = tr.state;
    const line = doc.lineAt(next.from);
    if (doc.lineAt(selection.main.head).from !== line.from) return null;
    // Typing a slugline or transition on the line overrides the choice.
    const text = line.text.trim();
    if (
      next.kind !== "scene-heading" &&
      next.kind !== "transition" &&
      (isSceneHeading(text) || isForcedTransition(text))
    ) {
      return null;
    }
    return next;
  },
});
