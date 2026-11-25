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

import { MarkdownView, Notice, Platform, apiVersion } from "obsidian";
import type { EditorView } from "@codemirror/view";
import type BrassPlugin from "../main";
import { classifyLines } from "../screenplay/lines";

const onOff = (value: boolean): string => (value ? "on" : "off");

/**
 * The cursor's line and the lines around it, with "|" at the cursor, and
 * the element each line is read as. Null without a Markdown editor.
 */
function cursorContext(
  plugin: BrassPlugin,
): { file: string; screenplay: boolean; text: string } | null {
  const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  if (view === null || view.file === null) return null;
  const screenplay = plugin.isScreenplayFile(view.file);
  const cm = (view.editor as unknown as { cm?: EditorView }).cm;
  if (cm === undefined) {
    return { file: view.file.path, screenplay, text: "(no editor)" };
  }
  const { doc, selection } = cm.state;
  const main = selection.main;
  const cursorLine = doc.lineAt(main.head).number;
  const lines = doc.toString().split("\n");
  const kinds = classifyLines(lines, { cursorLine: cursorLine - 1 });
  const from = Math.max(1, cursorLine - 4);
  const to = Math.min(doc.lines, cursorLine + 4);
  const rows: string[] = [];
  for (let number = from; number <= to; number++) {
    const line = doc.line(number);
    let text = line.text;
    if (number === cursorLine) {
      const at = main.head - line.from;
      text = `${text.slice(0, at)}|${text.slice(at)}`;
    }
    const kind = kinds[number - 1] ?? "";
    rows.push(
      `${String(number).padStart(4)} ${kind.padEnd(14)} ${JSON.stringify(text)}`,
    );
  }
  const selected = main.empty
    ? ""
    : `\nSelection: ${main.to - main.from} characters`;
  const cursors =
    selection.ranges.length > 1 ? `\nCursors: ${selection.ranges.length}` : "";
  return {
    file: view.file.path,
    screenplay,
    text: `Line ${cursorLine}, column ${main.head - doc.line(cursorLine).from}${selected}${cursors}\n${rows.join("\n")}`,
  };
}

/** Debugging information: versions, mode, key settings, the cursor. */
export function buildConfigurationReport(plugin: BrassPlugin): string {
  const s = plugin.settings;
  const script = plugin.isScriptMode();
  const strict = script ? s.lockBlankLinesScript : s.lockBlankLinesPlain;
  const platform = Platform.isMobile
    ? Platform.isIosApp
      ? "iOS"
      : "Android"
    : Platform.isMacOS
      ? "macOS"
      : Platform.isWin
        ? "Windows"
        : "Linux";
  const context = cursorContext(plugin);
  const out: string[] = [
    "## Brass configuration",
    "",
    `- Brass ${plugin.manifest.version}, Obsidian ${apiVersion}, ${platform}`,
    `- Mode: ${script ? "Script (formatted)" : "Fountain (plain text)"}`,
    `- Strict cursor placement (this mode): ${onOff(strict)} (script ${onOff(s.lockBlankLinesScript)}, Fountain ${onOff(s.lockBlankLinesPlain)})`,
    `- Smart Tab: ${onOff(s.smartTabEnabled)}, Smart Enter: ${onOff(s.smartEnterEnabled)}`,
    `- Tab with a list open (script): ${s.tabWithListScript}`,
    `- Suggestions: ${onOff(s.autocompleteEnabled)}`,
  ];
  if (context !== null) {
    out.push(
      `- File: ${context.file} (screenplay: ${context.screenplay ? "yes" : "no"})`,
      "",
      "### Cursor",
      "",
      "```",
      context.text,
      "```",
    );
  } else {
    out.push("- No Markdown editor active");
  }
  out.push(
    "",
    "### Tab and Enter tables",
    "",
    "```json",
    JSON.stringify(
      {
        tabAtLineEnd: s.tabTargets,
        enterAtLineEnd: s.enterTargets,
        tabInsideScript: s.tabInsideScript,
        tabInsidePlain: s.tabInsidePlain,
        enterInsideScript: s.enterInsideScript,
        enterInsidePlain: s.enterInsidePlain,
      },
      null,
      1,
    ),
    "```",
    "",
    "### All settings",
    "",
    "```json",
    JSON.stringify(s, null, 1),
    "```",
  );
  return out.join("\n");
}

/** "Copy configuration to clipboard": paste it into a bug report. */
export async function copyConfiguration(
  plugin: BrassPlugin,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildConfigurationReport(plugin));
    new Notice("Brass: configuration copied to the clipboard");
  } catch {
    new Notice("Brass: couldn't copy the configuration");
  }
}
