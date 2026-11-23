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
import { computeStatistics } from "../src/workers/statisticsCompute";
import { DEFAULT_CLEAN_EXPORT_OPTIONS_PDF } from "../src/export/fountain";

const base = {
  titlePage: undefined,
  cleanExport: DEFAULT_CLEAN_EXPORT_OPTIONS_PDF,
  markCapitalsAsAction: true,
  pageSize: "us-letter" as const,
  minutesPerPage: 1,
};

describe("worker statistics", () => {
  it("counts the clean export: notes and tasks add nothing", () => {
    const plain = computeStatistics({
      ...base,
      source: "INT. ROOM - DAY\n\nJen waits.\n\nJEN\nHello.",
    });
    const noisy = computeStatistics({
      ...base,
      source:
        "INT. ROOM - DAY\n\n- [ ] fix this\n\nJen waits. %% note %%\n\n> [!note] callout\n\nJEN\nHello.",
    });
    expect(noisy.scenes).toBe(1);
    expect(noisy.words).toBe(plain.words);
    expect(noisy.dialogueBlocks).toBe(1);
  });

  it("uses a Fountain title page when the frontmatter has none", () => {
    const withTitle = computeStatistics({
      ...base,
      source: "Title: Night\n\nINT. ROOM - DAY\n\nJen waits.",
    });
    const without = computeStatistics({
      ...base,
      source: "INT. ROOM - DAY\n\nJen waits.",
    });
    expect(withTitle.estimatedPages).toBeGreaterThanOrEqual(
      without.estimatedPages,
    );
  });
});
