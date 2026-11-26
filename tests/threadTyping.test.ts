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

vi.mock("obsidian", () => ({
  editorInfoField: {},
  EditorSuggest: class {},
  MarkdownView: class {},
  Notice: class {},
  Platform: {},
  TFile: class {},
}));

const { threadOpenBefore } = await import("../src/editor/completion");
const { onlyPlaceNotice } = await import("../src/threads/threadNavigator");

describe("Thread typing (#339)", () => {
  it("knows when the cursor is inside a thread", () => {
    expect(threadOpenBefore("She runs. [&gun")).toBe(true);
    expect(threadOpenBefore("She runs. [&")).toBe(true);
    expect(threadOpenBefore("She runs. [&gun] and")).toBe(false);
    expect(threadOpenBefore("[[link")).toBe(false);
  });
});

describe("Thread notice (#340)", () => {
  it("names the Threads panel shortcut for the platform", () => {
    expect(onlyPlaceNotice("Kino!", false, false)).toBe(
      "🧵 Kino!: the only place in this note. Alt+click to look in the project and linked notes. Ctrl+click to show the Threads panel.",
    );
    expect(onlyPlaceNotice("Kino!", true, true)).toBe(
      "🧵 Kino!: this is the only place in this thread. Cmd+click to show the Threads panel.",
    );
  });
});
