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
import { forceElementPlan } from "../src/editor/forceElement";
import { isSceneHeading } from "../src/screenplay/lines";
import {
  DEFAULT_COMPLETION_PREFERENCES,
  getScreenplayCompletionPlan,
} from "../src/editor/completionEngine";

describe("force element", () => {
  it("scene heading: opens scene types, leaves sluglines, forces with .", () => {
    expect(forceElementPlan("", "scene-heading")).toMatchObject({
      text: "",
      cursor: 0,
      complete: "scene-type",
    });
    expect(forceElementPlan("INT. ROOF - DAY", "scene-heading")).toBeNull();
    expect(forceElementPlan(".LATER", "scene-heading")).toBeNull();
    expect(forceElementPlan("the rooftop", "scene-heading")).toMatchObject({
      text: ".THE ROOFTOP",
      spaced: true,
    });
    expect(forceElementPlan("int. roof", "scene-heading")?.text).toBe(
      "INT. ROOF",
    );
    expect(forceElementPlan("!BANG", "scene-heading")?.text).toBe(".BANG");
  });

  it("character: opens the list, leaves cues, uppercases text", () => {
    expect(forceElementPlan("", "character")?.complete).toBe("character");
    expect(forceElementPlan("JEN", "character")).toBeNull();
    expect(forceElementPlan("jen (o.s.)", "character")?.text).toBe(
      "JEN (O.S.)",
    );
    expect(forceElementPlan("!JEN", "character")?.text).toBe("JEN");
  });

  it("transition, parenthetical and centred text", () => {
    expect(forceElementPlan("", "transition")).toMatchObject({
      text: "> ",
      complete: "transition",
    });
    expect(forceElementPlan("CUT TO:", "transition")).toBeNull();
    expect(forceElementPlan("smash cut to", "transition")?.text).toBe(
      "> SMASH CUT TO",
    );
    expect(forceElementPlan("", "parenthetical")).toEqual({
      text: "()",
      cursor: 1,
      complete: "parenthetical",
    });
    expect(forceElementPlan("beat", "parenthetical")?.text).toBe("(beat)");
    expect(forceElementPlan("(beat)", "parenthetical")).toBeNull();
    expect(forceElementPlan("THE END", "centered")?.text).toBe("> THE END <");
    expect(forceElementPlan("> THE END <", "centered")).toBeNull();
  });

  it("action: removes forcing marks, or forces with ! when needed", () => {
    expect(forceElementPlan("She runs.", "action")).toBeNull();
    expect(forceElementPlan("BANG", "action")?.text).toBe("!BANG");
    // Capitals ending in punctuation already read as action.
    expect(forceElementPlan("BANG!", "action")).toBeNull();
    expect(forceElementPlan(".LATER", "action")?.text).toBe("!LATER");
    // A wryly loses its brackets.
    expect(forceElementPlan("(text)", "action")?.text).toBe("text");
    // A wryly made a slugline keeps them and reads as one.
    expect(forceElementPlan("(text)", "scene-heading")?.text).toBe(".(TEXT)");
    expect(isSceneHeading(".(TEXT)")).toBe(true);
    expect(isSceneHeading("...")).toBe(false);
    expect(isSceneHeading(". Later")).toBe(false);
    expect(forceElementPlan("> She leaves <", "action")?.text).toBe(
      "She leaves",
    );
    expect(forceElementPlan("", "action")).toBeNull();
  });

  it("a forced scene-type list shows every scene type on a blank line", () => {
    const source = "She runs.\n";
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
      undefined,
      undefined,
      "scene-type",
    );
    expect(plan?.kind).toBe("scene-type");
    expect(plan?.candidates.map((candidate) => candidate.label)).toContain(
      "INT.",
    );
  });

  it("a forced scene-type list hands over to locations after the type", () => {
    const source = "INT. ROOF - DAY\n\nText.\n\nINT. ";
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
      undefined,
      undefined,
      "scene-type",
    );
    expect(plan?.kind).toBe("scene-location");
  });
});
