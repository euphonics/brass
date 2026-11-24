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
  mentionAtEnd,
  mentionGroups,
  sceneCharacters,
  mentionText,
} from "../src/editor/characterMentions";

describe("+ character mentions", () => {
  it("finds the mention being typed", () => {
    expect(mentionAtEnd("+")).toEqual({ typed: "" });
    expect(mentionAtEnd("She sees +je")).toEqual({ typed: "je" });
    expect(mentionAtEnd("(+Ma")).toEqual({ typed: "Ma" });
    expect(mentionAtEnd("She sees +mary a")).toEqual({ typed: "mary a" });
    expect(mentionAtEnd("C++")).toBeNull();
    expect(mentionAtEnd("1+1")).toBeNull();
    expect(mentionAtEnd("a+b")).toBeNull();
  });

  it("writes names in mixed case unless typed in capitals", () => {
    expect(mentionText("JEN", "", "")).toBe("Jen");
    expect(mentionText("JEN", "je", "")).toBe("Jen");
    expect(mentionText("JEN", "JE", "")).toBe("JEN");
    expect(mentionText("MARY ANN", "m", "")).toBe("Mary Ann");
    expect(mentionText("O'BRIEN", "", "")).toBe("O'Brien");
  });

  it("uses the note's own spelling of a name", () => {
    const source = "MCALLISTER\nHi.\n\nMcAllister waves. McAllister sits.";
    expect(mentionText("MCALLISTER", "mc", source)).toBe("McAllister");
    expect(mentionText("MCALLISTER", "MC", source)).toBe("MCALLISTER");
    expect(mentionText("JEN", "", "Jenny waves.")).toBe("Jen");
  });
});

describe("mention groups (#255)", () => {
  const spell = (name: string) =>
    name.charAt(0) + name.slice(1).toLocaleLowerCase();

  it("reads letters as the start of each name in turn (#304)", () => {
    const scene = ["JEN", "BLAKE"];
    const script = ["ZORANA", "GEORGE", "JEN", "BLAKE"];
    expect(mentionGroups("zg", [], scene, spell, script)).toContain(
      "Zorana and George",
    );
    expect(mentionGroups("jenbl", [], scene, spell, script)).toContain(
      "Jen and Blake",
    );
    expect(mentionGroups("zgj", [], scene, spell, script)).toContain(
      "Zorana, George, and Jen",
    );
    expect(mentionGroups("gz", [], scene, spell, script)).toContain(
      "George and Zorana",
    );
  });

  it("offers written groups, then scene pairs, then the Oxford list", () => {
    expect(mentionGroups("Je", [], ["JEN", "BLAKE", "GEORGE"], spell)).toEqual([
      "Jen and Blake",
      "Jen and George",
      "Jen, Blake, and George",
    ]);
    expect(
      mentionGroups("Je", ["Jen and Zora"], ["JEN", "BLAKE"], spell),
    ).toEqual(["Jen and Zora", "Jen and Blake"]);
  });

  it("filters by what was typed, commas included", () => {
    expect(
      mentionGroups("Jen, B", [], ["JEN", "BLAKE", "GEORGE"], spell),
    ).toEqual(["Jen, Blake, and George"]);
    expect(mentionAtEnd("She sees +Jen, B")).toEqual({ typed: "Jen, B" });
  });

  it("writes groups in capitals when typed in capitals", () => {
    expect(mentionGroups("JE", ["Jen and Zora"], [], spell)).toEqual([
      "JEN AND ZORA",
    ]);
  });
});

describe("mention groups from the whole scene (#282)", () => {
  const spell = (name: string) =>
    name.charAt(0) + name.slice(1).toLocaleLowerCase();
  const known = ["JEN", "JENNA", "BLAKE", "HELIOS", "FIONA", "JEN AND BLAKE"];

  it("counts characters named in action, not only speakers", () => {
    const scene = [
      "INT. BARN - NIGHT",
      "",
      "Helios struggles against the rope.",
      "",
      "JEN",
      "Find scissors.",
      "",
      "Fiona looks between Jen, Blake, and Helios",
    ].join("\n");
    expect(sceneCharacters(scene, known)).toEqual([
      "HELIOS",
      "JEN",
      "FIONA",
      "BLAKE",
    ]);
  });

  it("doesn't repeat a group already offered as a name", () => {
    expect(
      mentionGroups("Je", ["Jen and Blake"], ["JEN", "BLAKE"], spell, known, [
        "Jen",
        "Jen and Blake",
      ]),
    ).toEqual([]);
  });

  it("keeps the whole-scene list near the top of a long scene", () => {
    const groups = mentionGroups(
      "Je",
      [],
      ["JEN", "BLAKE", "HELIOS", "FIONA"],
      spell,
    );
    expect(groups.slice(0, 3)).toEqual([
      "Jen and Blake",
      "Jen and Helios",
      "Jen, Blake, Helios, and Fiona",
    ]);
  });

  it("completes a list being typed, name by name", () => {
    const scene = ["JEN", "BLAKE", "HELIOS", "FIONA"];
    expect(mentionGroups("Jen, Blake, and H", [], scene, spell, known)).toEqual(
      ["Jen, Blake, and Helios"],
    );
    expect(mentionGroups("Jen, Blake, H", [], scene, spell, known)).toEqual([
      "Jen, Blake, and Helios",
      "Jen, Blake, Helios, and Fiona",
    ]);
    expect(mentionGroups("Jen and B", [], scene, spell, known)).toEqual([
      "Jen and Blake",
    ]);
    expect(mentionGroups("Jen, B", [], scene, spell, known)).toEqual([
      "Jen, Blake, and Helios",
      "Jen, Blake, and Fiona",
      "Jen, Blake, Helios, and Fiona",
    ]);
  });
});

describe("fuzzier + groups (#286)", () => {
  const spell = (name: string) =>
    name.charAt(0) + name.slice(1).toLocaleLowerCase();
  const scene = ["JEN", "BLAKE", "GEORGE"];

  it("ignores spaces and commas: +Jenandb finds Jen and Blake", () => {
    expect(mentionGroups("Jenandb", [], scene, spell)).toContain(
      "Jen and Blake",
    );
  });

  it("matches only exactly when fuzzy matching is off (#305)", () => {
    const script = ["ZORANA", "GEORGE", "JEN", "BLAKE"];
    const strict = (typed: string) =>
      mentionGroups(typed, [], scene, spell, script, [], false);
    expect(strict("zg")).toEqual([]);
    expect(strict("Jenandb")).toEqual([]);
    expect(strict("j,b")).toEqual([]);
    expect(strict("Jen and B")).toEqual(["Jen and Blake"]);
    expect(strict("Je")).toContain("Jen and Blake");
  });

  it("takes the start of a name in a list: +j,b", () => {
    expect(mentionGroups("j,b", [], scene, spell)).toContain(
      "Jen, Blake, and George",
    );
    expect(mentionGroups("j and b", [], scene, spell)).toEqual([
      "Jen and Blake",
    ]);
  });
});
