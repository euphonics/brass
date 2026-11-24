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
  existingLink,
  matchingHeading,
  noteHeadings,
  outlineWithLinks,
  sceneUnits,
  scriptLinkInserts,
  type SceneUnit,
} from "../src/screenplay/sceneLinks";

const script = [
  "---",
  "screenplay: true",
  "---",
  "",
  "# Act One",
  "",
  "## Jen finds the key",
  "",
  "INT. HALL - NIGHT",
  "",
  "Jen searches.",
  "",
  "INT. KITCHEN - NIGHT",
  "",
  "There it is.",
  "",
  "## Blake hides",
  "",
  "EXT. YARD - NIGHT",
  "",
  "Blake ducks.",
]
  .join("\n")
  .split("\n");

const outline = [
  "# Act One",
  "",
  "## Jen finds the key",
  "",
  "She finds it in the kitchen.",
  "",
  "## The chase",
  "",
  "Blake runs.",
].join("\n");

describe("Link scene headings across documents (#254)", () => {
  it("groups sluglines by the heading above them", () => {
    expect(
      sceneUnits(script).map((unit) => [unit.heading, unit.slugLines]),
    ).toEqual([
      ["Jen finds the key", [8, 12]],
      ["Blake hides", [18]],
    ]);
  });

  it("matches outline headings with the same text", () => {
    const headings = noteHeadings(outline.split("\n"));
    const [jen, blake] = sceneUnits(script);
    expect(jen && matchingHeading(jen, headings)).toBe("Jen finds the key");
    expect(blake && matchingHeading(blake, headings)).toBeNull();
  });

  it("adds synopsis links under each slugline, once", () => {
    const [jen] = sceneUnits(script);
    const links = new Map<SceneUnit, string>([[jen, "Jen finds the key"]]);
    expect(scriptLinkInserts(script, links, "Outline", "slugline")).toEqual([
      { after: 8, text: "= [[Outline#Jen finds the key]]" },
      { after: 12, text: "= [[Outline#Jen finds the key]]" },
    ]);
    const linked = [...script];
    linked.splice(9, 0, "= [[Outline#Jen finds the key]]");
    linked.splice(14, 0, "= [[Outline#Jen finds the key]]");
    const [again] = sceneUnits(linked);
    expect(
      scriptLinkInserts(
        linked,
        new Map([[again, "Jen finds the key"]]),
        "Outline",
      ),
    ).toEqual([]);
  });

  it("links the outline heading back to the script heading, once", () => {
    const [jen, blake] = sceneUnits(script);
    const links = new Map<SceneUnit, string>([
      [jen, "Jen finds the key"],
      [blake, "The chase"],
    ]);
    const once = outlineWithLinks(outline, links, "Script");
    expect(once).toContain(
      "## Jen finds the key\n[[Script#Jen finds the key]]\n",
    );
    expect(once).toContain("## The chase\n[[Script#Blake hides]]\n");
    expect(outlineWithLinks(once, links, "Script")).toBe(once);
  });
});

describe("scenes already linked (#254)", () => {
  it("keeps the heading a slugline already links to", () => {
    const lines = [
      "## Blake hides",
      "",
      "EXT. YARD - NIGHT",
      "= [[Outline#The chase]]",
      "",
      "Blake ducks.",
    ];
    const [unit] = sceneUnits(lines);
    expect(unit && existingLink(unit, lines, "Outline")).toBe("The chase");
  });
});

describe("outline links under headings (#292)", () => {
  it("puts one link under the scene's heading by default", () => {
    const [jen] = sceneUnits(script);
    const links = new Map<SceneUnit, string>([[jen, "Jen finds the key"]]);
    expect(scriptLinkInserts(script, links, "Outline")).toEqual([
      { after: 6, text: "= [[Outline#Jen finds the key]]" },
    ]);
  });

  it("uses the slugline when there's no heading, and skips linked scenes", () => {
    const lines = ["EXT. YARD - NIGHT", "", "Blake ducks."];
    const [unit] = sceneUnits(lines);
    expect(
      scriptLinkInserts(lines, new Map([[unit, "The chase"]]), "Outline"),
    ).toEqual([{ after: 0, text: "= [[Outline#The chase]]" }]);
    const linked = [
      "## Blake hides",
      "= [[Outline#The chase]]",
      "",
      "EXT. YARD - NIGHT",
      "",
      "Ducks.",
    ];
    const [done] = sceneUnits(linked);
    expect(existingLink(done, linked, "Outline")).toBe("The chase");
    expect(
      scriptLinkInserts(linked, new Map([[done, "The chase"]]), "Outline"),
    ).toEqual([]);
  });
});
