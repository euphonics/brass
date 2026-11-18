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
  capitalizeLineStart,
  getSmartEnterPlan,
  getSmartTabPlan,
} from "../src/editor/smartTab";
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

  it("starts the action after the time or a modifier (as in Fade In)", () => {
    const afterTime = tabAtEnd("EXT. ROOF - DUSK", ["DUSK"]);
    expect(afterTime?.text).toBe("EXT. ROOF - DUSK\n\n");
    expect(afterTime?.plan.openCompletion).toBe(false);
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

  it("splits a speech around a new wryly when Tab is pressed mid-dialogue", () => {
    const apply = (source: string, cursor: number) => {
      const plan = getSmartTabPlan(source, cursor);
      if (!plan) return null;
      const text =
        source.slice(0, plan.replaceFrom ?? plan.at) +
        plan.insert +
        source.slice(plan.at);
      return { text, cursor: plan.cursor, open: plan.openCompletion };
    };
    const source = "HELIOS\nThey want to tie you down. They don't mean to.";
    const result = apply(source, source.indexOf(" They don't"));
    expect(result?.text).toBe(
      "HELIOS\nThey want to tie you down.\n()\nThey don't mean to.",
    );
    expect(result?.text.slice(0, result.cursor).endsWith("(")).toBe(true);
    expect(result?.open).toBe(true);
    // At the very start of a dialogue line, the wryly goes above it.
    const start = apply("JEN\nHi.", 4);
    expect(start?.text).toBe("JEN\n()\nHi.");
    expect(start?.cursor).toBe(5);
  });

  it("adds a wryly right under dialogue; leaves parentheticals alone", () => {
    // Empty line straight under dialogue: a wryly goes there.
    expect(getSmartTabPlan(`${opening}\n`, opening.length + 1)).toMatchObject({
      kind: "under-speech",
      insert: "()",
    });
    // Mid-parenthetical: Tab does nothing (no tab character).
    expect(
      getSmartTabPlan(`${opening}\n(beat)`, opening.length + 3),
    ).toMatchObject({ kind: "none", insert: "" });
  });

  it("swallows Tab mid-line instead of inserting a tab character", () => {
    for (const [source, cursor] of [
      ["She| runs.", 3],
      ["INT. C|AR - DAY", 6],
      ["> CUT| TO:", 5],
      ["# Act| One", 5],
    ] as const) {
      const text = source.replace("|", "");
      expect(getSmartTabPlan(text, cursor)).toMatchObject({
        kind: "none",
        insert: "",
      });
      // Enter there stays a plain line break.
      expect(getSmartEnterPlan(text, cursor)).toBeNull();
    }
  });

  it("Tab in an empty () drops it and goes back to the line above", () => {
    const source = "JEN\nHi.\n()";
    const plan = getSmartTabPlan(source, source.length - 1);
    const text =
      source.slice(0, plan?.replaceFrom ?? 0) +
      (plan?.insert ?? "") +
      source.slice(plan?.at ?? 0);
    expect(text).toBe("JEN\nHi.");
    expect(plan?.cursor).toBe("JEN\nHi.".length);
  });

  it("Enter after a # heading starts a slugline like Tab", () => {
    expect(getSmartEnterPlan("# Act One", 9)).toMatchObject({
      kind: "heading",
      insert: "\n\n",
      openCompletion: true,
    });
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

  it("starts a new speaker when a heading follows the speech directly", () => {
    const speech = "JEN\n(laughs)\nRenting for a while.";
    const source = `${speech}\n### Going to Bathroom, Sees George`;
    expect(getSmartEnterPlan(source, speech.length)).toMatchObject({
      kind: "dialogue",
      insert: "\n\n",
      openCompletion: true,
    });
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
    expect(getSmartTabPlan("EXT. ROOF - DUSK", 16, times)?.insert).toBe("\n\n");
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
      "INT. CAR - DAY\n\n",
    );
  });

  it("uppercases the heading when Enter starts the action", () => {
    const source = "int. car - day";
    expect(apply(source, getSmartEnterPlan(source, source.length))).toBe(
      "INT. CAR - DAY\n\n",
    );
  });
});

describe("capitalize line starts", () => {
  it("capitalizes only the first letter typed on a line", () => {
    expect(capitalizeLineStart("", "s")).toBe("S");
    expect(capitalizeLineStart("  ", "s")).toBe("S");
    expect(capitalizeLineStart("S", "h")).toBeNull();
    expect(capitalizeLineStart("", "S")).toBeNull();
    expect(capitalizeLineStart("", "(")).toBeNull();
    expect(capitalizeLineStart("(", "b")).toBeNull();
    expect(capitalizeLineStart("", "ab")).toBeNull();
  });
});

describe("key matrix fixes", () => {
  const apply = (source: string, plan: ReturnType<typeof getSmartTabPlan>) =>
    plan
      ? source.slice(0, plan.replaceFrom ?? plan.at) +
        plan.insert +
        source.slice(plan.at)
      : null;

  it("centred text: Tab starts a slugline", () => {
    const source = "> THE END <";
    expect(apply(source, getSmartTabPlan(source, source.length))).toBe(
      "> THE END <\n\n",
    );
  });

  it("list items and tasks keep Obsidian's Tab", () => {
    expect(getSmartTabPlan("- buy milk", 10)).toBeNull();
    expect(getSmartTabPlan("- [ ] fix act two", 17)).toBeNull();
  });

  it("an empty line right under action gets its blank line first", () => {
    const source = "She runs.\n";
    expect(apply(source, getSmartTabPlan(source, source.length))).toBe(
      "She runs.\n\n",
    );
  });

  it(".LATER counts as a complete heading", () => {
    expect(getSmartTabPlan(".LATER", 6)).toMatchObject({
      insert: "\n\n",
      openCompletion: false,
    });
  });

  it("Enter drops a dangling separator and keeps lyrics plain", () => {
    const source = "INT. CAR - ";
    expect(apply(source, getSmartEnterPlan(source, source.length))).toBe(
      "INT. CAR\n\n",
    );
    expect(getSmartEnterPlan("~la la", 6)).toBeNull();
  });
});
