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
import { forcedHeadingDot } from "../src/editor/layoutClassifier";

describe("forced slugline dot", () => {
  it("finds the dot that forces a scene heading", () => {
    expect(forcedHeadingDot(".LATER")).toBe(0);
    expect(forcedHeadingDot("  .ROOFTOP")).toBe(2);
    expect(forcedHeadingDot("INT. ROOF")).toBe(-1);
    expect(forcedHeadingDot("...")).toBe(-1);
    expect(forcedHeadingDot(". LATER")).toBe(-1);
  });
});
