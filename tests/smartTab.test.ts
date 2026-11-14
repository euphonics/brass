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
import { getSmartTabPlan } from "../src/editor/smartTab";
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

  it("starts the action after a complete heading", () => {
    const result = tabAtEnd("EXT. ROOF - DUSK", ["DUSK"]);
    expect(result?.text).toBe("EXT. ROOF - DUSK\n\n");
    expect(result?.plan.openCompletion).toBe(false);
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
    expect(
      getSmartTabPlan(`${opening}\n(beat)`, opening.length + 7),
    ).toBeNull();
    expect(getSmartTabPlan("CUT TO:", 7)).toBeNull();
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
