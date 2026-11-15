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
import { estimateCurrentPage } from "../src/screenplay/currentPage";
import { formatScreenplayStatus } from "../src/screenplay/status";
import type { ScreenplayStatistics } from "../src/screenplay/model";

describe("current page", () => {
  it("is page 1 at the top and grows through the script", () => {
    const scene = "INT. ROOM - DAY\n\nShe waits. She waits some more.\n\n";
    const script = scene.repeat(60);
    expect(estimateCurrentPage(script, 0)).toBe(1);
    const middle = estimateCurrentPage(script, Math.floor(script.length / 2));
    const end = estimateCurrentPage(script, script.length);
    expect(middle).toBeGreaterThan(1);
    expect(end).toBeGreaterThan(middle);
    expect(end).toBeLessThanOrEqual(6);
  });

  it("shows the page in the status text", () => {
    const statistics = {
      estimatedPages: 77.3,
      estimatedRuntimeMinutes: 77,
      words: 100,
      scenes: 3,
    } as ScreenplayStatistics;
    const fields = {
      estimatedRuntime: false,
      words: false,
      scenes: false,
    };
    expect(
      formatScreenplayStatus(statistics, {
        ...fields,
        estimatedPages: true,
        currentPage: 34,
      }),
    ).toBe("Screenplay · p. 34 of ~77.3");
    expect(
      formatScreenplayStatus(statistics, {
        ...fields,
        estimatedPages: false,
        currentPage: 34,
      }),
    ).toBe("Screenplay · p. 34");
    expect(
      formatScreenplayStatus(statistics, { ...fields, estimatedPages: true }),
    ).toBe("Screenplay · ~77.3 pages");
  });
});
