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

import { exportedFountainText } from "../export/exportedText";
import { stripObsidianFrontmatter } from "../export/fountain";
import { estimateCurrentPage } from "../screenplay/currentPage";
import type {
  PageSize,
  ScreenplayIndex,
  ScreenplayStatistics,
  ScreenplayTitlePage,
} from "../screenplay/model";
import { parseFountain } from "../screenplay/parser";
import { calculateStatistics } from "../screenplay/statistics";
import { buildScreenplayIndex } from "../screenplay/indexer";

export interface StatisticsRequest {
  source: string;
  titlePage: ScreenplayTitlePage | undefined;
  cleanExport: unknown;
  markCapitalsAsAction: boolean;
  pageSize: PageSize;
  minutesPerPage: number;
}

/**
 * The status bar's statistics for a script: counted from what a clean
 * Fountain export would hold, so tasks, comments, callouts and the other
 * stripped elements don't add pages. Runs in the worker, or on the main
 * thread when a worker can't start.
 */
export function computeStatistics(
  request: StatisticsRequest,
): ScreenplayStatistics {
  const parsed = parseFountain(
    exportedFountainText(request.source, {
      clean: true,
      cleanExport: request.cleanExport,
      markCapitalsAsAction: request.markCapitalsAsAction,
    }),
  );
  // The frontmatter's title page wins; otherwise the Fountain one, if any.
  const titlePage = request.titlePage ?? parsed.titlePage;
  const document = { ...parsed, ...(titlePage ? { titlePage } : {}) };
  return calculateStatistics(document, {
    pageSize: request.pageSize,
    minutesPerPage: request.minutesPerPage,
  });
}

export interface PageRequest {
  /** The note's text up to the end of the cursor's line. */
  upToLine: string;
  cleanExport: unknown;
  markCapitalsAsAction: boolean;
  pageSize: PageSize;
}

/** The page the cursor is on, counted as in a clean Fountain export. */
export function computeCurrentPage(request: PageRequest): number {
  const before = exportedFountainText(
    stripObsidianFrontmatter(request.upToLine),
    {
      clean: true,
      cleanExport: request.cleanExport,
      markCapitalsAsAction: request.markCapitalsAsAction,
    },
  );
  return estimateCurrentPage(before, before.length, request.pageSize);
}

export interface IndexRequest {
  /** The note's text with the line being typed emptied. */
  source: string;
}

/** The suggestion index (characters, locations, times, ...) for a note. */
export function computeIndex(request: IndexRequest): ScreenplayIndex {
  return buildScreenplayIndex(parseFountain(request.source));
}
