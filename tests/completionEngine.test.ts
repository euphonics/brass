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

  it("puts the time a location had last time first", () => {
    const source = [
      "INT. KITCHEN - DAY",
      "",
      "Toast.",
      "",
      "INT. HALL - DAY",
      "",
      "Steps.",
      "",
      "INT. KITCHEN - DUSK",
      "",
      "Dark.",
      "",
      "INT. HALL - DAY",
      "",
      "Steps.",
      "",
      "INT. KITCHEN - ",
    ].join("\n");
    const labels = (text: string) =>
      getScreenplayCompletionPlan(
        text,
        text.length,
        DEFAULT_COMPLETION_PREFERENCES,
      )?.candidates.map((candidate) => candidate.label);
    expect(labels(source)?.[0]).toBe("DUSK");
    expect(labels(`${source}D`)?.[0]).toBe("DUSK");
    expect(labels(`${source}N`)?.[0]).toBe("NIGHT");
    expect(labels(source.replace(/KITCHEN - $/u, "HALL - "))?.[0]).toBe("DAY");
  });

  it("opens the character list for lowercase typing with match capitals off", () => {
    const source = `${screenplay}\n\nJa`;
    const plan = (characterMatchCase: boolean) =>
      getScreenplayCompletionPlan(source, source.length, {
        ...DEFAULT_COMPLETION_PREFERENCES,
        characterMatchCase,
      });
    expect(plan(true)?.kind).not.toBe("character");
    expect(plan(false)?.kind).toBe("character");
    expect(plan(false)?.candidates[0]?.label).toBe("JANE");
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
      "(ON RADIO)",
      "(ON PHONE)",
    ]);
  });

  it("offers extensions for a new name in capitals starting a block", () => {
    const plan = (source: string) =>
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
      )?.kind;
    expect(plan("My action.\n\nJOHN (")).toBe("character-extension");
    expect(plan("My action.\n\nJOHN(")).toBe("character-extension");
    // Not inside an action paragraph, and not for ordinary text.
    expect(plan("My action.\nJOHN (")).not.toBe("character-extension");
    expect(plan("My action.\n\nShe waves (")).not.toBe("character-extension");
  });

  it("opens character extensions right after the name, too", () => {
    const source = `${screenplay}\nJANE(`;
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );
    expect(plan?.kind).toBe("character-extension");
    // The space comes back: "JANE (V.O.)".
    expect(plan?.candidates[1]?.applyText).toBe(" (V.O.)");
    expect(plan?.from).toBe(source.length - 1);
    // An auto-closed ")" is replaced too.
    const closed = `${screenplay}\nJANE()`;
    expect(
      getScreenplayCompletionPlan(
        closed,
        closed.length - 1,
        DEFAULT_COMPLETION_PREFERENCES,
      )?.to,
    ).toBe(closed.length);
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

  it("treats .LATER as a time, not a location", () => {
    const script = `${screenplay}\n.LATER\n\nJane waits.\n\n.MOMENTS LATER\n\nShe leaves.\n`;
    const typed = `${script}\nINT. `;
    const locations = getScreenplayCompletionPlan(
      typed,
      typed.length,
      DEFAULT_COMPLETION_PREFERENCES,
    )?.candidates.map((candidate) => candidate.label);
    expect(locations).not.toContain("LATER");
    expect(locations).not.toContain("MOMENTS LATER");

    const dot = `${script}\n.`;
    const afterDot = getScreenplayCompletionPlan(
      dot,
      dot.length,
      DEFAULT_COMPLETION_PREFERENCES,
    )?.candidates;
    const later = afterDot?.find((candidate) => candidate.label === "LATER");
    expect(later).toMatchObject({ applyText: "LATER", detail: "Time" });
    expect(afterDot?.map((candidate) => candidate.label)).toContain(
      "MILITARY BASE - WARD",
    );
  });
});

describe("transitions typed without >", () => {
  const plan = (source: string) =>
    getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );

  it("lists transitions for capitals at the start of a block", () => {
    const cut = plan("Jen waits.\n\nCUT T");
    expect(cut?.kind).toBe("transition");
    expect(cut?.candidates).toEqual([
      { label: "CUT TO:", applyText: "CUT TO:", detail: "Transition" },
    ]);
    // Without "TO:" a transition needs its ">".
    expect(
      plan("Jen waits.\n\nFADE O")?.candidates.map((c) => c.applyText),
    ).toEqual(["> FADE OUT."]);
  });

  it("lists matching characters first", () => {
    const labels = plan("FARLEY\nHi.\n\nJen waits.\n\nFA")?.candidates.map(
      (candidate) => candidate.label,
    );
    expect(labels).toEqual(["FARLEY", "FADE IN:", "FADE OUT."]);
  });

  it("stays quiet for lower case, one letter or mid-paragraph", () => {
    expect(plan("Jen waits.\n\nCu")).toBeNull();
    expect(plan("Jen waits.\n\nC")).toBeNull();
    expect(plan("Jen waits.\nCUT")).toBeNull();
  });
});

describe("forced character cues", () => {
  const plan = (source: string) =>
    getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
    );

  it("lists characters after @, in any case", () => {
    const script = "JEN\nHi.\n\nJen waits.\n\n";
    expect(plan(`${script}@j`)?.candidates).toEqual([
      { label: "JEN", applyText: "JEN\n", detail: "1 dialogue block" },
    ]);
    expect(plan(`${script}@`)?.kind).toBe("character");
  });

  it("keeps the @ on a name with lower case", () => {
    const script = "@McCLANE\nYo.\n\nJen waits.\n\n";
    expect(plan(`${script}MC`)?.candidates[0]?.applyText).toBe("@McCLANE\n");
  });
});

describe("character names in action", () => {
  const script = "JENNY\nHi.\n\nTHEO\nYo.\n\n";
  const plan = (source: string, namesInAction = true) =>
    getScreenplayCompletionPlan(source, source.length, {
      ...DEFAULT_COMPLETION_PREFERENCES,
      namesInAction,
    });

  it("lists characters for capitals inside an action line", () => {
    const source = `${script}She sees JE`;
    expect(plan(source)).toEqual({
      kind: "character-name",
      from: source.length - 2,
      to: source.length,
      candidates: [{ label: "JENNY", applyText: "JENNY", detail: "Character" }],
    });
  });

  it("works on a later line of an action paragraph", () => {
    expect(plan(`${script}She runs.\nTH`)?.candidates[0]?.label).toBe("THEO");
  });

  it("is off by default", () => {
    expect(plan(`${script}She sees JE`, false)).toBeNull();
  });

  it("leaves cues, dialogue, sluglines and finished names alone", () => {
    expect(plan(`${script}JE`)?.kind).toBe("character");
    expect(plan(`${script}JENNY AND TH`)).toBeNull();
    expect(plan(`JENNY\nI saw TH`)).toBeNull();
    expect(plan(`${script}INT. HOUSE - TH`)?.kind).not.toBe("character-name");
    expect(plan(`${script}She sees JENNY`)).toBeNull();
    expect(plan(`${script}She sees J`)).toBeNull();
    expect(plan(`${script}She sees je`)).toBeNull();
  });
});
