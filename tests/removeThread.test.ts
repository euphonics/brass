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

import { describe, expect, it, vi } from "vitest";
import { removeThread } from "../src/screenplay/threads";

describe("Delete a thread everywhere (#342)", () => {
  it("keeps a thread's own text by default and drops plain marks", () => {
    expect(
      removeThread("He lifts [&gun|the pistol]. [&gun]", "gun", true),
    ).toBe("He lifts the pistol.");
  });

  it("drops the text too when set to leave nothing", () => {
    expect(removeThread("He lifts [&gun|the pistol] fast.", "gun", false)).toBe(
      "He lifts fast.",
    );
  });

  it("matches any capitals and spacing, and leaves other threads", () => {
    expect(removeThread("Run. [& Gun ] [&knife]", "gun", true)).toBe(
      "Run. [&knife]",
    );
  });

  it("takes the spaces after a thread at the start of a line", () => {
    expect(removeThread("[&gun] She runs.", "gun", true)).toBe("She runs.");
    expect(removeThread("[&gun|The pistol] drops.", "gun", true)).toBe(
      "The pistol drops.",
    );
  });

  it("removes a line that held only the thread, and one blank line", () => {
    expect(removeThread("She runs.\n\n[&gun]\n\nHe waits.", "gun", true)).toBe(
      "She runs.\n\nHe waits.",
    );
    expect(removeThread("A\n[&gun|]\nB", "gun", true)).toBe("A\nB");
  });

  it("returns the same text when the thread isn't there", () => {
    const text = "Nothing [&knife] here.";
    expect(removeThread(text, "gun", true)).toBe(text);
  });
});

vi.mock("obsidian", () => ({ Modal: class {}, Setting: class {} }));
const { deleteUnlocked, placesLabel } =
  await import("../src/ui/deleteThreadModal");

describe("Delete thread box (#342)", () => {
  it("only unlocks after YES", () => {
    expect(deleteUnlocked("")).toBe(false);
    expect(deleteUnlocked("YE")).toBe(false);
    expect(deleteUnlocked("yes")).toBe(true);
    expect(deleteUnlocked("YES")).toBe(true);
  });

  it("counts places and notes", () => {
    expect(placesLabel(1, 1)).toBe("1 place in 1 note");
    expect(placesLabel(4, 2)).toBe("4 places in 2 notes");
  });
});
