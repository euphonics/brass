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
import type { TFile } from "obsidian";

vi.mock("obsidian", () => ({ editorInfoField: {} }));

const { phoneBarShown } = await import("../src/editor/phoneBar");

const script = { path: "Script.md" } as TFile;

describe("phone element bar", () => {
  it("shows under screenplay notes only", () => {
    const host = (screenplay: boolean) => ({
      enabled: () => true,
      isScreenplayFile: () => screenplay,
    });
    expect(phoneBarShown(host(true), script)).toBe(true);
    expect(phoneBarShown(host(false), script)).toBe(false);
  });

  it("hides when turned off, and before the editor has a file", () => {
    expect(
      phoneBarShown(
        { enabled: () => false, isScreenplayFile: () => true },
        script,
      ),
    ).toBe(false);
    expect(
      phoneBarShown(
        { enabled: () => true, isScreenplayFile: () => true },
        null,
      ),
    ).toBe(false);
  });
});
