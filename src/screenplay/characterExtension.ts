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

import { characterCue } from "./lines";

/** The name on a character cue line, in capitals, or null. */
export function characterNameFromCue(line: string): string | null {
  return characterCue(line)?.name.toLocaleUpperCase() ?? null;
}

/** Whether a line on its own could be a character cue. */
export function isLikelyCharacterCue(line: string): boolean {
  return characterCue(line) !== null;
}

export function withCharacterExtension(
  line: string,
  extension: string,
): string {
  const indentation = line.match(/^\s*/u)?.[0] ?? "";
  const trimmed = line.trim();
  const caret = /\s*\^\s*$/u.test(trimmed) ? " ^" : "";
  const cue = trimmed
    .replace(/\s*\^\s*$/u, "")
    .replace(/\s+\([^)]*\)\s*$/u, "")
    .trim();
  return `${indentation}${cue} ${extension}${caret}`;
}
