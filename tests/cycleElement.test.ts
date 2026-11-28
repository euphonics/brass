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
import { forceElementPlan, nextCycleKind } from "../src/editor/forceElement";

describe("Cycle button (#360)", () => {
  it("steps slugline, action, character, transition, and round", () => {
    expect(nextCycleKind("scene-heading", false)).toBe("action");
    expect(nextCycleKind("action", false)).toBe("character");
    expect(nextCycleKind("character", false)).toBe("transition");
    expect(nextCycleKind("transition", false)).toBe("scene-heading");
  });

  it("counts a blank line or other elements as action", () => {
    expect(nextCycleKind(null, false)).toBe("character");
    expect(nextCycleKind("centered", false)).toBe("character");
  });

  it("toggles wryly and dialogue under a character", () => {
    expect(nextCycleKind("dialogue", true)).toBe("parenthetical");
    expect(nextCycleKind(null, true)).toBe("parenthetical");
    expect(nextCycleKind("parenthetical", true)).toBe("dialogue");
  });

  it("starts a line holding only an element's start over", () => {
    expect(forceElementPlan("> ", "scene-heading")?.text).toBe("");
    expect(forceElementPlan("()", "character")?.text).toBe("");
    expect(forceElementPlan("> ", "action")?.text).toBe("");
    expect(forceElementPlan("", "action")).toBeNull();
  });
});
