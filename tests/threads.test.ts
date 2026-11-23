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
  findThreads,
  orderedPlaces,
  stepPlace,
  stripThreads,
  stripThreadsFromSource,
  threadKey,
} from "../src/screenplay/threads";
import { classifyLines } from "../src/screenplay/lines";
import { parseFountain } from "../src/screenplay/parser";

describe("threads", () => {
  it("finds [&name] marks, matched without case or extra spaces", () => {
    const marks = findThreads(
      "Shut.[&Zosia  red herring] and [& zosia red herring ]",
    );
    expect(marks.map((mark) => mark.name)).toEqual([
      "Zosia red herring",
      "zosia red herring",
    ]);
    expect(new Set(marks.map((mark) => mark.key)).size).toBe(1);
    expect(threadKey(" A  B ")).toBe("a b");
    expect(findThreads("No [& ] or [link] here")).toEqual([]);
  });

  it("strips threads from a line and from a whole script", () => {
    expect(stripThreads("The screen shut.[&zosia red herring]")).toBe(
      "The screen shut.",
    );
    expect(stripThreads("Hi. [&a] there [&b]")).toBe("Hi. there");
    expect(stripThreads("[&a] JEN")).toBe("JEN");
    const source = ["Jen sits.", "", "[&setup]", "", "JEN", "Hi.[&x]"].join(
      "\n",
    );
    expect(stripThreadsFromSource(source)).toBe(
      ["Jen sits.", "", "JEN", "Hi."].join("\n"),
    );
  });

  it("aren't script: a cue with a thread is still a cue", () => {
    const lines = ["ZORANA [&x]", "The entire class.[&zosia red herring]"];
    expect(classifyLines(lines)).toEqual(["character", "dialogue"]);
    expect(classifyLines(["Jen sits.", "", "[&setup]"])[2]).toBe("note");
    const doc = parseFountain(lines.join("\n"));
    const text = JSON.stringify(doc);
    expect(text).not.toContain("[&");
  });

  it("orders the project's parts first, then other notes, and wraps", () => {
    const mark = (from: number) => ({
      from,
      to: from + 5,
      name: "x",
      key: "x",
    });
    const places = new Map([
      ["Notes/Outline.md", [mark(3)]],
      ["Script/Part 2.md", [mark(10), mark(40)]],
      ["Script/Part 1.md", [mark(7)]],
    ]);
    const ordered = orderedPlaces(places, "x", [
      "Script/Part 1.md",
      "Script/Part 2.md",
    ]);
    expect(ordered.map((place) => `${place.path}@${place.from}`)).toEqual([
      "Script/Part 1.md@7",
      "Script/Part 2.md@10",
      "Script/Part 2.md@40",
      "Notes/Outline.md@3",
    ]);
    const next = stepPlace(ordered, { path: "Notes/Outline.md", from: 3 }, 1);
    expect(next?.path).toBe("Script/Part 1.md");
    const back = stepPlace(ordered, { path: "Script/Part 1.md", from: 7 }, -1);
    expect(back?.path).toBe("Notes/Outline.md");
    expect(stepPlace(ordered.slice(0, 1), ordered[0], 1)).toBeNull();
  });
});

describe("threads with text (#289)", () => {
  it("reads the text after | as the thread's alias, same thread", () => {
    const [plain, aliased] = findThreads(
      "She hides [&the gun]. He finds [&The Gun|the pistol].",
    );
    expect(aliased).toMatchObject({ name: "The Gun", alias: "the pistol" });
    expect(aliased?.key).toBe(plain?.key);
    expect(plain?.alias).toBeUndefined();
  });

  it("keeps the text in place when threads are stripped", () => {
    expect(stripThreads("He finds [&gun|the pistol] under the bed.")).toBe(
      "He finds the pistol under the bed.",
    );
    expect(stripThreads("He finds it. [&gun]")).toBe("He finds it.");
    expect(stripThreads("He finds it. [&gun|]")).toBe("He finds it.");
    expect(
      parseFountain("INT. ROOM - DAY\n\nHe finds [&gun|the pistol].")
        .elements.map((element) => element.text)
        .join(" "),
    ).toContain("He finds the pistol.");
  });
});
