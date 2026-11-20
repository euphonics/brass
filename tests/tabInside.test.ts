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
  DEFAULT_ENTER_INSIDE,
  DEFAULT_ENTER_INSIDE_PLAIN,
  DEFAULT_TAB_INSIDE,
  normalizeEnterInside,
  normalizeTabInside,
  type EnterInsideActions,
  type TabInsideActions,
} from "../src/editor/enterTargets";
import {
  getEnterInsidePlan,
  getTabInsidePlan,
  type EnterInsidePlan,
  type TabInsidePlan,
} from "../src/editor/tabInside";

/**
 * Plan for a script where "|" marks the cursor. Offsets in the result are
 * shown back as text: a moved cursor as "|", a selection as "[...]".
 */
const TIMES = new Set(["DAY", "NIGHT"]);

function tabIn(
  marked: string,
  actions: Partial<TabInsideActions> = {},
): { plan: TabInsidePlan | null; text: string } {
  const cursorAt = marked.indexOf("|");
  const source = marked.replace("|", "");
  const lines = source.split("\n");
  const lineFroms: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineFroms.push(offset);
    offset += line.length + 1;
  }
  const index = source.slice(0, cursorAt).split("\n").length - 1;
  const plan = getTabInsidePlan(
    lines,
    index,
    lineFroms,
    cursorAt - (lineFroms[index] ?? 0),
    { ...DEFAULT_TAB_INSIDE, ...actions },
    (text) => TIMES.has(text),
  );
  let text = source;
  if (plan?.type === "move" || plan?.type === "end-tab") {
    text = `${source.slice(0, plan.cursor)}|${source.slice(plan.cursor)}`;
  } else if (plan?.type === "extension-list") {
    text = `${source.slice(0, plan.at)}|${source.slice(plan.at)}`;
  } else if (plan?.type === "select") {
    const from = Math.min(plan.anchor, plan.head);
    const to = Math.max(plan.anchor, plan.head);
    text = `${source.slice(0, from)}[${source.slice(from, to)}]${source.slice(to)}`;
  }
  return { plan, text };
}

describe("Tab inside a line", () => {
  it("next part: a cue's name goes on to its extension", () => {
    expect(tabIn("CHARA|CTER\nDialogue.").plan).toEqual({
      type: "extension-list",
      at: 9,
    });
    expect(tabIn("CHARA|CTER (V.O.)\nDialogue.").text).toBe(
      "CHARACTER ([V.O.])\nDialogue.",
    );
    // From the first extension to the next one, then the end.
    expect(tabIn("JEN (V.|O.) (CONT'D)\nHi.").text).toBe(
      "JEN (V.O.) ([CONT'D])\nHi.",
    );
    expect(tabIn("JEN (CONT|'D)\nHi.").text).toBe("JEN (CONT'D)|\nHi.");
  });

  it("next part: a slugline goes type, location, time, modifier", () => {
    expect(tabIn("I|NT. KITCHEN - DAY\n\nAction.").text).toBe(
      "INT. [KITCHEN] - DAY\n\nAction.",
    );
    expect(tabIn("INT. KIT|CHEN - DAY\n\nAction.").text).toBe(
      "INT. KITCHEN - [DAY]\n\nAction.",
    );
    expect(tabIn("INT. KITCHEN - D|AY (FLASHBACK)\n\nAction.").text).toBe(
      "INT. KITCHEN - DAY ([FLASHBACK])\n\nAction.",
    );
    // A part not there yet: Tab's end-of-line plan adds it.
    expect(tabIn("INT. KIT|CHEN\n\nAction.").plan?.type).toBe("end-tab");
    // After the time, Tab at the end starts the action: Next part just
    // goes to the end of the line.
    expect(tabIn("INT. KITCHEN - D|AY\n\nAction.").text).toBe(
      "INT. KITCHEN - DAY|\n\nAction.",
    );
    // After the modifier: the end of the line.
    expect(tabIn("INT. KITCHEN - DAY (FLASH|BACK)\n\nAction.").text).toBe(
      "INT. KITCHEN - DAY (FLASHBACK)|\n\nAction.",
    );
  });

  it("reads text after the last dash as a time only when it is one", () => {
    // "HOUSE - KITCHEN" is all location: the time is added, not KITCHEN.
    expect(tabIn("INT. HO|USE - KITCHEN\n\nAction.").plan?.type).toBe(
      "end-tab",
    );
    expect(tabIn("INT. HO|USE - KITCHEN - NIGHT\n\nAction.").text).toBe(
      "INT. HOUSE - KITCHEN - [NIGHT]\n\nAction.",
    );
  });

  it("next element skips headings, comments and notes", () => {
    expect(
      tabIn("She ru|ns.\n\n# Act Two\n\n%% note %%\n\nINT. CAR - DAY", {
        action: "next-element",
      }).text,
    ).toBe("She runs.\n\n# Act Two\n\n%% note %%\n\n|INT. CAR - DAY");
  });

  it("next element skips the parts", () => {
    const next = { character: "next-element" as const };
    expect(tabIn("CHARA|CTER (V.O.)\nDialogue.", next).text).toBe(
      "CHARACTER (V.O.)\n|Dialogue.",
    );
    expect(
      tabIn("She ru|ns.\n\nJEN\nHi.", { action: "next-element" }).text,
    ).toBe("She runs.\n\n|JEN\nHi.");
  });

  it("as at the end of the line runs Tab's end-of-line plan", () => {
    const result = tabIn("My |action.", { action: "line-end" });
    expect(result.plan?.type).toBe("end-tab");
    expect(result.text).toBe("My action.|");
  });

  it("nothing, Obsidian's Tab and the wryly split", () => {
    expect(tabIn("She ru|ns.").plan).toEqual({ type: "nothing" });
    expect(tabIn("She ru|ns.", { action: "obsidian" }).plan).toEqual({
      type: "obsidian",
    });
    expect(tabIn("JEN\nHello th|ere.").plan).toEqual({ type: "smart" });
  });

  it("leaves the end of a line and the start of action and dialogue alone", () => {
    expect(tabIn("She runs.|").plan).toBeNull();
    expect(tabIn("|She runs.").plan).toBeNull();
    expect(tabIn("JEN\n|Hello.").plan).toBeNull();
    expect(tabIn("JEN\nHi.\n(beat|)\nMore.").plan).toBeNull();
  });

  it("keeps stored choices only where the element offers them", () => {
    expect(
      normalizeTabInside({ action: "next-part", character: "next-element" }),
    ).toMatchObject({ action: "nothing", character: "next-element" });
  });
});

describe("Enter inside a line", () => {
  function enterIn(
    marked: string,
    actions: Partial<EnterInsideActions> = {},
  ): EnterInsidePlan | null {
    const cursorAt = marked.indexOf("|");
    const source = marked.replace("|", "");
    const lines = source.split("\n");
    const lineFroms: number[] = [];
    let offset = 0;
    for (const line of lines) {
      lineFroms.push(offset);
      offset += line.length + 1;
    }
    const index = source.slice(0, cursorAt).split("\n").length - 1;
    return getEnterInsidePlan(
      lines,
      index,
      lineFroms,
      cursorAt - (lineFroms[index] ?? 0),
      { ...DEFAULT_ENTER_INSIDE, ...actions },
    );
  }

  it("does nothing inside a slugline or cue by default", () => {
    expect(enterIn("INT. CAR| - DAY\n\nShe runs.")).toEqual({
      type: "nothing",
    });
    expect(enterIn("She runs.\n\nMA|RA\nHello.")).toEqual({ type: "nothing" });
  });

  it("splits action and dialogue as a line break by default", () => {
    expect(enterIn("She ru|ns.")).toEqual({ type: "line-break" });
    expect(enterIn("She runs.\n\nMARA\nHel|lo.")).toEqual({
      type: "line-break",
    });
  });

  it("leaves the start and end of a line to Enter's other rules", () => {
    expect(enterIn("|She runs.")).toBeNull();
    expect(enterIn("She runs.|")).toBeNull();
    expect(enterIn("She runs.\n\nMARA\n(beat|)\nHello.")).toBeNull();
  });

  it("moves to the next element when chosen", () => {
    const plan = enterIn("INT. CAR| - DAY\n\nShe runs.", {
      sceneHeading: "next-element",
    });
    expect(plan).toEqual({ type: "move", cursor: 16 });
  });

  it("keeps stored choices and fills in the rest", () => {
    const actions = normalizeEnterInside(
      { action: "nothing", dialogue: "bogus" },
      DEFAULT_ENTER_INSIDE_PLAIN,
    );
    expect(actions.action).toBe("nothing");
    expect(actions.dialogue).toBe("line-break");
  });
});
