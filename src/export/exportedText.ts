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

import { stripThreadsFromSource } from "../screenplay/threads";
import {
  cleanFountainSource,
  markCapitalsAsAction,
  normalizeCleanExportOptions,
} from "./fountain";

export interface ExportedTextOptions {
  /** Strip the Obsidian-only elements chosen under Clean export. */
  clean: boolean;
  /** The Clean export settings, as saved. */
  cleanExport: unknown;
  /** Put "!" in front of capitals Brass reads as action. */
  markCapitalsAsAction: boolean;
}

/**
 * The Fountain text an export writes for `source`: cleaned (when `clean`),
 * without threads, and with capitals marked as action (setting). Pure, so
 * the statistics worker can use it too.
 */
export function exportedFountainText(
  source: string,
  options: ExportedTextOptions,
): string {
  const exported = options.clean
    ? cleanFountainSource(
        source,
        normalizeCleanExportOptions(
          options.cleanExport as Record<string, unknown>,
        ),
      )
    : source;
  // Threads ("[&name]") are Brass's own: no export keeps them.
  const withoutThreads = stripThreadsFromSource(exported);
  return options.markCapitalsAsAction
    ? markCapitalsAsAction(withoutThreads)
    : withoutThreads;
}
