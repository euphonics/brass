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

import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENTER_TARGETS,
  DEFAULT_TAB_TARGETS,
  normalizeEnterTargets,
  type EnterTargets,
} from "../src/editor/enterTargets";
import { getSmartEnterPlan, getSmartTabPlan } from "../src/editor/smartTab";

const withTargets = (changes: Partial<EnterTargets>): EnterTargets => ({
  ...DEFAULT_ENTER_TARGETS,
  ...changes,
});

const enter = (source: string, changes: Partial<EnterTargets>) =>
  getSmartEnterPlan(source, source.length, undefined, withTargets(changes));

describe("Enter targets", () => {
  it("fills in missing or unknown values with the defaults", () => {
    expect(normalizeEnterTargets(undefined)).toEqual(DEFAULT_ENTER_TARGETS);
    expect(
      normalizeEnterTargets({ action: "character", dialogue: "nonsense" }),
    ).toEqual({ ...DEFAULT_ENTER_TARGETS, action: "character" });
  });

  it("keeps the old behavior with the defaults", () => {
    expect(enter("BLAKE\nHello.", {})).toMatchObject({
      insert: "\n\n",
      openCompletion: true,
    });
    expect(enter("BLAKE\nHello.", {})?.forceAfter).toBeUndefined();
    expect(enter("BLAKE", {})).toBeNull();
    expect(enter("BLAKE\n(quietly)", {})).toBeNull();
  });

  it("starts a new block after a blank line", () => {
    expect(enter("She runs.", { action: "character" })).toMatchObject({
      insert: "\n\n",
      forceAfter: "character",
      openCompletion: false,
    });
    expect(enter("BLAKE\nHello.", { dialogue: "scene-heading" })).toMatchObject(
      { insert: "\n\n", forceAfter: "scene-heading" },
    );
  });

  it("stays inside the speech for a wryly or dialogue", () => {
    expect(enter("BLAKE", { character: "parenthetical" })).toMatchObject({
      insert: "\n",
      forceAfter: "parenthetical",
    });
    expect(
      enter("BLAKE\n(quietly", { parenthetical: "character" }),
    ).toMatchObject({ insert: ")\n\n", forceAfter: "character" });
    expect(enter("BLAKE\nHello.", { dialogue: "parenthetical" })).toMatchObject(
      {
        insert: "\n",
        forceAfter: "parenthetical",
      },
    );
  });

  it("uppercases a transition or heading before moving on", () => {
    expect(enter("> cut to:", { transition: "action" })).toMatchObject({
      insert: "> CUT TO:\n\n",
      forceAfter: "action",
    });
    expect(enter("int. roof - ", { sceneHeading: "character" })).toMatchObject({
      insert: "INT. ROOF\n\n",
      forceAfter: "character",
    });
  });

  it("adds a plain line break when set to a new line", () => {
    const cases: [string, Partial<EnterTargets>][] = [
      ["BLAKE\nHello.", { dialogue: "plain" }],
      ["> CUT TO:", { transition: "plain" }],
    ];
    for (const [source, changes] of cases) {
      const plan = enter(source, changes);
      expect(plan).toMatchObject({ insert: "\n", cursor: source.length + 1 });
      expect(plan?.forceAfter).toBeUndefined();
    }
  });

  it("does not split a speech that goes on below", () => {
    const source = "BLAKE\nHello.";
    expect(
      getSmartEnterPlan(
        source,
        5,
        undefined,
        withTargets({ character: "action" }),
      ),
    ).toBeNull();
  });
});

describe("Tab targets", () => {
  const tab = (source: string, changes: Partial<EnterTargets> = {}) =>
    getSmartTabPlan(source, source.length, undefined, {
      ...DEFAULT_TAB_TARGETS,
      ...changes,
    });

  it("keeps the usual Tab with the defaults", () => {
    expect(tab("JEN\nHello.")?.insert).toBe("\n()");
    expect(normalizeEnterTargets(undefined, DEFAULT_TAB_TARGETS)).toEqual(
      DEFAULT_TAB_TARGETS,
    );
  });

  it("starts the chosen element at the end of an element", () => {
    const plan = tab("JEN\nHello.", { dialogue: "character" });
    expect(plan?.insert).toBe("\n\n");
    expect(plan?.forceAfter).toBe("character");
    expect(tab("She runs.", { action: "plain" })?.insert).toBe("\n");
  });

  it("still completes a slugline before the choice applies", () => {
    const changes = { sceneHeading: "character" } as const;
    expect(tab("INT. CAR", changes)?.insert).toBe(" - ");
    const done = tab("INT. CAR - DAY (FLASHBACK)", changes);
    expect(done?.forceAfter).toBe("character");
  });

  it("leaves mid-speech Tab (a wryly) alone", () => {
    const source = "JEN\nHello there.";
    const plan = getSmartTabPlan(source, source.length - 6, undefined, {
      ...DEFAULT_TAB_TARGETS,
      dialogue: "character",
    });
    expect(plan?.insert).toContain("()");
  });
});
