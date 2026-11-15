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

import { linesPerPage, screenplayPageEstimator } from "./estimator";
import type { PageSize } from "./model";
import { parseFountain } from "./parser";

/**
 * Estimated page the cursor is on: the same estimate as the page count,
 * applied to the text from the start of the note to the end of the cursor's
 * line. Always at least 1.
 */
export function estimateCurrentPage(
  source: string,
  cursorOffset: number,
  pageSize: PageSize = "us-letter",
): number {
  const lineEnd = source.indexOf("\n", cursorOffset);
  const before = source.slice(0, lineEnd === -1 ? source.length : lineEnd);
  const { formattedLines } = screenplayPageEstimator.estimate(
    parseFountain(before),
    { pageSize },
  );
  return Math.max(1, Math.ceil(formattedLines / linesPerPage(pageSize)));
}
