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
import { getSmartEnterPlan, getSmartTabPlan } from "../src/editor/smartTab";
import {
  DEFAULT_COMPLETION_PREFERENCES,
  getScreenplayCompletionPlan,
} from "../src/editor/completionEngine";

const opening = `INT. KITCHEN - NIGHT

Jen stirs a pot.

JEN
I'm fine.`;

/** Apply Tab at the end of `source`; returns the new text and cursor. */
function tabAtEnd(source: string, knownTimes?: string[]) {
  const plan = getSmartTabPlan(source, source.length, knownTimes);
  if (!plan) return null;
  const text = source.slice(0, plan.at) + plan.insert + source.slice(plan.at);
  return { plan, text, cursor: plan.cursor };
}

describe("Smart Tab", () => {
  it("adds a parenthetical line after a character cue being typed", () => {
    const result = tabAtEnd("INT. KITCHEN - NIGHT\n\nJEN");
    expect(result?.plan.kind).toBe("character");
    expect(result?.text).toBe("INT. KITCHEN - NIGHT\n\nJEN\n()");
    expect(result?.text.charAt(result.cursor)).toBe(")");
    expect(result?.plan.openCompletion).toBe(true);
  });

  it("adds a parenthetical line after dialogue", () => {
    const result = tabAtEnd(opening);
    expect(result?.plan.kind).toBe("dialogue");
    expect(result?.text).toBe(`${opening}\n()`);
  });

  it("adds a time separator to a heading without a time of day", () => {
    const result = tabAtEnd("INT. MILITARY BASE - WARD");
    expect(result?.plan.kind).toBe("scene-heading");
    expect(result?.text).toBe("INT. MILITARY BASE - WARD - ");
    expect(result?.plan.openCompletion).toBe(true);
    expect(tabAtEnd("INT. KITCHEN -")?.text).toBe("INT. KITCHEN - ");
    expect(tabAtEnd(".ROOFTOP")?.text).toBe(".ROOFTOP - ");
  });

  it("opens slug modifiers after the time, then starts the action", () => {
    const afterTime = tabAtEnd("EXT. ROOF - DUSK", ["DUSK"]);
    expect(afterTime?.text).toBe("EXT. ROOF - DUSK");
    expect(afterTime?.plan.openCompletion).toBe(true);
    const afterModifier = tabAtEnd("EXT. ROOF - DUSK (FLASHBACK)", ["DUSK"]);
    expect(afterModifier?.text).toBe("EXT. ROOF - DUSK (FLASHBACK)\n\n");
    expect(afterModifier?.plan.openCompletion).toBe(false);
  });

  it("suggests slug modifiers after the time of day", () => {
    const labels = (source: string, explicit: boolean) =>
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
        explicit,
      )?.candidates.map((candidate) => [candidate.label, candidate.applyText]);
    // Tab at the end of a heading with a time: the whole list.
    expect(labels("EXT. HIGHWAY - DAY", true)).toContainEqual([
      "FLASHBACK",
      " (FLASHBACK)",
    ]);
    // Typing "(" narrows it.
    expect(labels("EXT. HIGHWAY - DAY (dre", false)).toEqual([
      ["DREAM", "(DREAM)"],
    ]);
    // Modifiers used in the script are offered too.
    const script =
      "EXT. ROAD - NIGHT (MONTAGE)\n\nShe drives.\n\nEXT. HIGHWAY - DAY (";
    expect(labels(script, false)?.map(([label]) => label)).toContain("MONTAGE");
    // Not without a time, and not after a modifier.
    expect(labels("EXT. HIGHWAY", true)?.[0]?.[0]).not.toBe("FLASHBACK");
    expect(
      getScreenplayCompletionPlan(
        "EXT. HIGHWAY - DAY (DREAM)",
        26,
        DEFAULT_COMPLETION_PREFERENCES,
        true,
      )?.kind,
    ).not.toBe("slug-modifier");
  });

  it("opens a new character block after action", () => {
    const result = tabAtEnd("INT. KITCHEN - NIGHT\n\nJen stirs a pot.");
    expect(result?.plan.kind).toBe("action");
    expect(result?.text).toBe("INT. KITCHEN - NIGHT\n\nJen stirs a pot.\n\n");
    expect(result?.plan.openCompletion).toBe(true);
  });

  it("leaves Tab alone mid-line, right under dialogue and in parentheticals", () => {
    expect(getSmartTabPlan(opening, opening.length - 3)).toBeNull();
    // Empty line straight under dialogue, with no blank line yet.
    expect(getSmartTabPlan(`${opening}\n`, opening.length + 1)).toBeNull();
    // Mid-parenthetical.
    expect(
      getSmartTabPlan(`${opening}\n(beat)`, opening.length + 3),
    ).toBeNull();
  });

  it("moves to a new dialogue line after a parenthetical", () => {
    const apply = (source: string, cursor: number) => {
      const plan = getSmartTabPlan(source, cursor);
      if (!plan) return null;
      const from = plan.replaceFrom ?? plan.at;
      return {
        text: source.slice(0, from) + plan.insert + source.slice(plan.at),
        cursor: plan.cursor,
        kind: plan.kind,
      };
    };
    const source = "JEN\ntesting\n(scoffs)";
    expect(apply(source, source.length)).toEqual({
      text: "JEN\ntesting\n(scoffs)\n",
      cursor: source.length + 1,
      kind: "parenthetical",
    });
    // Cursor just inside the closing parenthesis.
    expect(apply(source, source.length - 1)?.text).toBe(
      "JEN\ntesting\n(scoffs)\n",
    );
    // Unclosed parenthetical gets closed.
    expect(apply("JEN\n(scoffs", 11)?.text).toBe("JEN\n(scoffs)\n");
    // Parenthetical right under the cue.
    expect(apply("JEN\n(quietly)", 13)?.text).toBe("JEN\n(quietly)\n");
  });

  it("opens the character list on an empty line after a blank line", () => {
    const source = "HELIOS\nYeah.\n\n";
    expect(getSmartTabPlan(source, source.length)).toMatchObject({
      kind: "new-block",
      insert: "",
      openCompletion: true,
    });
    const characters = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
    );
    expect(characters?.kind).toBe("character");
    expect(characters?.candidates[0]?.label).toBe("HELIOS");
  });

  it("uppercases a transition and starts a slugline after it", () => {
    const source = "She leaves.\n\n> cut to:";
    const plan = getSmartTabPlan(source, source.length);
    expect(plan?.kind).toBe("transition");
    const text =
      source.slice(0, plan?.replaceFrom) +
      (plan?.insert ?? "") +
      source.slice(plan?.at);
    expect(text).toBe("She leaves.\n\n> CUT TO:\n\n");
    expect(plan?.cursor).toBe(text.length);
    expect(plan?.openCompletion).toBe(true);
    expect(getSmartTabPlan("CUT TO:", 7)?.kind).toBe("transition");
    expect(getSmartTabPlan("> THE END <", 11)?.kind).not.toBe("transition");

    const next = getScreenplayCompletionPlan(
      text,
      text.length,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
    );
    expect(next?.kind).toBe("scene-type");
  });

  it("ignores frontmatter", () => {
    const source = "---\nscreenplay: true\n---";
    expect(getSmartTabPlan(source, 19)).toBeNull();
  });

  it("starts a new slugline after a # heading", () => {
    for (const heading of ["# Act One", "## The Barn", "### Sequence 3"]) {
      const result = tabAtEnd(heading);
      expect(result?.plan.kind).toBe("heading");
      expect(result?.text).toBe(`${heading}\n\n`);
      expect(result?.plan.openCompletion).toBe(true);
    }
    // A tag line is not a heading.
    expect(tabAtEnd("#Character in TIGHTER")).toBeNull();
  });

  it("offers scene types after a heading, then characters if none match", () => {
    const source = "# Act One\n\n";
    const plan = getScreenplayCompletionPlan(
      source,
      source.length,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
    );
    expect(plan?.kind).toBe("scene-type");
    expect(plan?.candidates[0]).toMatchObject({
      label: "INT.",
      applyText: "INT. ",
    });

    const typed = "# Act One\n\nINT";
    expect(
      getScreenplayCompletionPlan(
        typed,
        typed.length,
        DEFAULT_COMPLETION_PREFERENCES,
      )?.candidates.map((candidate) => candidate.label),
    ).toEqual(["INT.", "INT./EXT.", "INT/EXT"]);
  });
});

describe("parenthetical suggestions", () => {
  it("suggests parentheticals inside the inserted () and replaces it", () => {
    const source = `${opening}\n()`;
    const cursor = source.length - 1;
    const plan = getScreenplayCompletionPlan(
      source,
      cursor,
      DEFAULT_COMPLETION_PREFERENCES,
      true,
    );
    expect(plan?.kind).toBe("parenthetical");
    expect(plan?.candidates.map((candidate) => candidate.label)).toContain(
      "(beat)",
    );
    expect(plan?.to).toBe(source.length);
  });

  it("does not suggest parentheticals in action", () => {
    const source = "Jen stirs a pot.\n(";
    expect(
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
        true,
      )?.kind,
    ).not.toBe("parenthetical");
  });
});

describe("Smart Enter", () => {
  it("starts a new speaker after dialogue", () => {
    const source = "BLAKE\nHello.";
    const plan = getSmartEnterPlan(source, source.length);
    expect(plan).toMatchObject({
      kind: "dialogue",
      insert: "\n\n",
      cursor: source.length + 2,
      openCompletion: true,
    });
  });

  it("starts a slugline after a transition", () => {
    const source = "> cut to:";
    expect(getSmartEnterPlan(source, source.length)?.insert).toBe(
      "> CUT TO:\n\n",
    );
  });

  it("adds a blank line after a scene heading", () => {
    for (const heading of ["INT. ROOF", "INT. ROOF - DAY", ".LATER"]) {
      expect(getSmartEnterPlan(heading, heading.length)).toMatchObject({
        kind: "scene-heading",
        insert: "\n\n",
        cursor: heading.length + 2,
        openCompletion: false,
      });
    }
    expect(getSmartEnterPlan("INT. ROOF - DAY", 4)).toBeNull();
  });

  it("keeps the normal Enter elsewhere", () => {
    expect(getSmartEnterPlan("BLAKE", 5)).toBeNull();
    expect(getSmartEnterPlan("BLAKE\nHello.", 9)).toBeNull();
    expect(getSmartEnterPlan("BLAKE\n(quietly)", 15)).toBeNull();
  });

  it("adds a blank line after action", () => {
    expect(getSmartEnterPlan("She runs.", 9)).toMatchObject({
      kind: "action",
      insert: "\n\n",
      cursor: 11,
      openCompletion: false,
    });
    // Mid-line, mid-paragraph and list items keep the normal Enter.
    expect(getSmartEnterPlan("She runs.", 4)).toBeNull();
    expect(getSmartEnterPlan("She runs.\nFast.", 9)).toBeNull();
    expect(getSmartEnterPlan("She runs.\n\nFast.", 9)?.insert).toBe("\n\n");
    expect(getSmartEnterPlan("- a list item", 13)).toBeNull();
    expect(getSmartEnterPlan("- [ ] a task", 12)).toBeNull();
    expect(getSmartEnterPlan("1. first", 8)).toBeNull();
  });
});

describe("review fixes", () => {
  it("keeps Enter plain in the middle of a speech", () => {
    const source = "JEN\nI'm fine.\nReally.";
    expect(getSmartEnterPlan(source, "JEN\nI'm fine.".length)).toBeNull();
    expect(getSmartEnterPlan(source, source.length)?.insert).toBe("\n\n");
  });

  it("does not treat callouts as transitions", () => {
    expect(getSmartTabPlan("> [!note] fix this", 18)).toBeNull();
    expect(getSmartEnterPlan("> [!note] fix this", 18)).toBeNull();
    const source = "She runs.\n\n> [!";
    expect(
      getScreenplayCompletionPlan(
        source,
        source.length,
        DEFAULT_COMPLETION_PREFERENCES,
      ),
    ).toBeNull();
  });

  it("only computes known times for scene headings", () => {
    let calls = 0;
    const times = () => {
      calls += 1;
      return ["DUSK"];
    };
    getSmartEnterPlan("JEN\nHi.", 7, times);
    getSmartTabPlan("She runs.", 9, times);
    expect(calls).toBe(0);
    expect(getSmartTabPlan("EXT. ROOF - DUSK", 16, times)?.openCompletion).toBe(
      true,
    );
    expect(calls).toBe(1);
  });
});

describe("uppercase sluglines", () => {
  const apply = (source: string, plan: ReturnType<typeof getSmartTabPlan>) =>
    plan
      ? source.slice(0, plan.replaceFrom ?? plan.at) +
        plan.insert +
        source.slice(plan.at)
      : null;

  it("uppercases the typed parts when Tab moves on", () => {
    const source = "INT. car";
    const plan = getSmartTabPlan(source, source.length);
    expect(apply(source, plan)).toBe("INT. CAR - ");
    expect(plan?.cursor).toBe("INT. CAR - ".length);
    expect(apply(".car", getSmartTabPlan(".car", 4))).toBe(".CAR - ");
    const timed = "INT. car - day";
    expect(apply(timed, getSmartTabPlan(timed, timed.length, ["DAY"]))).toBe(
      "INT. CAR - DAY",
    );
  });

  it("uppercases the heading when Enter starts the action", () => {
    const source = "int. car - day";
    expect(apply(source, getSmartEnterPlan(source, source.length))).toBe(
      "INT. CAR - DAY\n\n",
    );
  });
});
