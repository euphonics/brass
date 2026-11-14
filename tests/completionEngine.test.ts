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

import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPLETION_PREFERENCES,
  getScreenplayCompletionPlan,
} from "../src/editor/completionEngine";
import { parseFountain } from "../src/screenplay/parser";

const screenplay = `INT. MILITARY BASE - THERAPY ROOM - DAY

JANE
Hello.

MILLER
Report.

INT. MILITARY BASE - WARD - NIGHT

JANE
Ready.
`;

describe("screenplay completion engine", () => {
  it("completes a character cue and prepares a dialogue line", () => {
    const source = `${screenplay}\nJA`;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );

    expect(plan?.kind).toBe("character");
    expect(plan?.candidates[0]).toMatchObject({
      label: "JANE",
      applyText: "JANE\n",
    });
  });

  it("completes known locations while preserving the scene type", () => {
    const source = `${screenplay}\nINT. MIL`;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );

    expect(plan?.kind).toBe("scene-location");
    expect(plan?.candidates[0]?.label).not.toBe("MIL");
    expect(plan?.candidates.map((candidate) => candidate.applyText)).toContain(
      "MILITARY BASE - THERAPY ROOM - ",
    );
  });

  it("offers time values after a completed location", () => {
    const source = `${screenplay}\nINT. MILITARY BASE - THERAPY ROOM - `;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );

    expect(plan?.kind).toBe("scene-time");
    expect(plan?.candidates.map((candidate) => candidate.label)).toContain(
      "NIGHT",
    );
  });

  it("offers character extensions only for discovered characters", () => {
    const source = `${screenplay}\nJANE (`;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );

    expect(plan?.kind).toBe("character-extension");
    expect(plan?.candidates.map((candidate) => candidate.label)).toEqual([
      "(O.S.)",
      "(V.O.)",
      "(CONT'D)",
      "(ON RADIO)",
      "(ON PHONE)",
    ]);
  });

  it("does not activate character completion in ordinary action", () => {
    const source = `${screenplay}JANE walks to the door.`;
    expect(
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
      ),
    ).toBeNull();
  });

  it("offers characters discovered in another project part", () => {
    const source = "\nMI";
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
      false,
      parseFountain(screenplay),
    );

    expect(plan?.candidates.map((candidate) => candidate.label)).toContain(
      "MILLER",
    );
  });

  it("lists known locations after a forced scene heading dot", () => {
    const source = `${screenplay}
.ROOFTOP - NIGHT

JANE
Up here.

.`;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );

    expect(plan?.kind).toBe("scene-location");
    expect(plan?.from).toBe(source.length);
    const labels = plan?.candidates.map((candidate) => candidate.label);
    expect(labels).toContain("MILITARY BASE - WARD");
    expect(labels).toContain("ROOFTOP");
  });

  it("filters forced-heading locations and then offers times", () => {
    const filtered = `${screenplay}
.MILITARY BASE - W`;
    const locationPlan = getScreenplayCompletionPlan(
      filtered,
      filtered.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );
    expect(locationPlan?.candidates[0]?.applyText).toBe(
      "MILITARY BASE - WARD - ",
    );

    const timed = `${screenplay}
.MILITARY BASE - WARD - `;
    const timePlan = getScreenplayCompletionPlan(
      timed,
      timed.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );
    expect(timePlan?.kind).toBe("scene-time");
  });

  it("does not treat a leading ellipsis as a forced heading", () => {
    const source = `${screenplay}
..`;
    expect(
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
      ),
    ).toBeNull();
  });

  it("offers scene types when a block starts with one, in any case", () => {
    for (const typed of ["int", "INT", "ex"]) {
      const source = `${screenplay}
${typed}`;
      const plan = getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
      );
      expect(plan?.kind).toBe("scene-type");
      expect(plan?.candidates[0]?.applyText).toMatch(/^(INT|EXT)\. $/u);
    }
  });

  it("lists locations as soon as the scene type is typed", () => {
    const source = `${screenplay}
INT. `;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );
    expect(plan?.kind).toBe("scene-location");
    expect(plan?.candidates.map((candidate) => candidate.label)).toContain(
      "MILITARY BASE - WARD",
    );
  });

  it("lists transitions after > and keeps them uppercase", () => {
    const source = `${screenplay}\n> SMASH TO:\n\nINT. ROOF - DAY\n\n>`;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );
    expect(plan?.kind).toBe("transition");
    const labels = plan?.candidates.map((candidate) => candidate.label);
    expect(labels).toContain("SMASH TO:");
    expect(labels).toContain("CUT TO:");
    expect(plan?.candidates[0]?.applyText).toMatch(/^> [A-Z]/u);

    const typed = `${screenplay}\n> cu`;
    expect(
      getScreenplayCompletionPlan(
        typed,
        typed.length,
        DEFAULT_COMPLETION_PREFERENCES,
      )?.candidates.map((candidate) => candidate.applyText),
    ).toEqual(["> CUT TO:"]);
  });

  it("respects the scene type letter minimum and case settings", () => {
    const labels = (typed: string, preferences: object) => {
      const source = `${screenplay}\n${typed}`;
      return getScreenplayCompletionPlan(source, source.length, {
        ...DEFAULT_COMPLETION_PREFERENCES,
        ...preferences,
      })?.candidates.map((candidate) => candidate.label);
    };

    // Scenario 1: two letters, case-insensitive.
    const relaxed = { sceneTypeMinimumLetters: 2, sceneTypeMatchCase: false };
    expect(labels("in", relaxed)).toContain("INT.");
    expect(labels("i", relaxed)).toBeUndefined();

    // Scenario 2: one letter, case-sensitive.
    const strict = { sceneTypeMinimumLetters: 1, sceneTypeMatchCase: true };
    expect(labels("E", strict)).toContain("EXT.");
    expect(labels("ext", strict)).toBeUndefined();
  });

  it("puts the other speaker first so dialogue alternates", () => {
    const labels = (source: string) =>
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
        true,
      )?.candidates.map((candidate) => candidate.label);

    const twoHander = `${screenplay}\nINT. ROOF - DAY\n\nMILLER\nHi.\n\nJANE\nHi.\n\n`;
    const order = labels(twoHander) ?? [];
    expect(order[0]).toBe("MILLER");
    expect(order[order.length - 1]).toBe("JANE");

    const threeWay = `INT. ROOF - DAY\n\nAMY\nOne.\n\nBEN\nTwo.\n\nCARL\nThree.\n\nDANA\nFour.\n\nCARL\nFive.\n\n`;
    expect(labels(threeWay)).toEqual(["DANA", "BEN", "AMY", "CARL"]);
  });

  it("only considers speakers in the current scene", () => {
    const source = `INT. A - DAY\n\nAMY\nOne.\n\nINT. B - DAY\n\nBEN\nTwo.\n\n`;
    const labels = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
    )?.candidates.map((candidate) => candidate.label);
    expect(labels?.[labels.length - 1]).toBe("BEN");
    expect(labels?.[0]).toBe("AMY");
  });

  it("matches lowercase letters once the character list is open", () => {
    const source = `${screenplay}\nMILLER\nGo.\n\nj`;
    const opened = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
    );
    expect(opened?.candidates.map((candidate) => candidate.label)).toEqual([
      "JANE",
    ]);
    expect(opened?.candidates[0]?.applyText).toBe("JANE\n");
    // Typing lowercase without the list open stays quiet (action lines).
    expect(
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
        false,
      ),
    ).toBeNull();
  });
});
