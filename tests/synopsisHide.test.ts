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

vi.mock("obsidian", () => ({ editorInfoField: {} }));

const { isSynopsisLine, HIDDEN_SYNOPSIS_MARK } =
  await import("../src/editor/synopsisHide");

describe("Hide synopses (#352)", () => {
  it("knows a synopsis line", () => {
    expect(isSynopsisLine("= The heist goes wrong.")).toBe(true);
    expect(isSynopsisLine("=No space")).toBe(true);
    expect(isSynopsisLine("  = indented")).toBe(true);
  });

  it("leaves page breaks and other lines alone", () => {
    expect(isSynopsisLine("===")).toBe(false);
    expect(isSynopsisLine("== not one")).toBe(false);
    expect(isSynopsisLine("She waits. = no")).toBe(false);
    expect(isSynopsisLine("")).toBe(false);
  });

  it("marks the line above with a memo", () => {
    expect(HIDDEN_SYNOPSIS_MARK).toBe("📝");
  });
});
