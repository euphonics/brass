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

vi.mock("obsidian", () => ({
  App: class {},
  Notice: class {},
  PluginSettingTab: class {},
  Setting: class {},
  SettingGroup: class {},
  normalizePath: (path: string) => path,
  TFile: class {},
  TFolder: class {},
}));

const { exportedFountainSource, printedScreenplay } =
  await import("../src/commands/exportFountain");
const { DEFAULT_SETTINGS, migrateSettings } =
  await import("../src/settings/settings");
import type ScribidianPlugin from "../src/main";
import type { CleanExportFormat } from "../src/settings/settings";

const source = `INT. HALL - NIGHT

- [ ] Fix this scene

Jen sees the clue.
`;

function pluginWith(
  changes: Partial<typeof DEFAULT_SETTINGS>,
): ScribidianPlugin {
  return {
    settings: { ...DEFAULT_SETTINGS, ...changes },
  } as unknown as ScribidianPlugin;
}

const keepTasks = { ...DEFAULT_SETTINGS.cleanExport, removeTasks: false };

const printed = (
  plugin: ScribidianPlugin,
  clean: boolean,
  format: CleanExportFormat,
) =>
  printedScreenplay(plugin, source, undefined, clean, format)
    .elements.map((element) => element.text)
    .join("\n");

describe("clean exports, per format (#277)", () => {
  it("strips markup only in clean exports", () => {
    const plugin = pluginWith({});
    expect(printed(plugin, true, "pdf")).not.toContain("Fix this scene");
    expect(printed(plugin, false, "pdf")).toContain("Fix this scene");
  });

  it("uses each format's own column", () => {
    const plugin = pluginWith({ cleanExportPdf: keepTasks });
    expect(printed(plugin, true, "pdf")).toContain("Fix this scene");
    expect(printed(plugin, true, "fdx")).not.toContain("Fix this scene");
    expect(exportedFountainSource(plugin, source, true)).not.toContain(
      "Fix this scene",
    );
    const fountain = pluginWith({ cleanExport: keepTasks });
    expect(exportedFountainSource(fountain, source, true)).toContain(
      "Fix this scene",
    );
    expect(printed(fountain, true, "pdf")).not.toContain("Fix this scene");
  });

  it("starts every format from the old single set of options", () => {
    const settings = migrateSettings({ cleanExport: keepTasks });
    expect(settings.cleanExport.removeTasks).toBe(false);
    expect(settings.cleanExportPdf.removeTasks).toBe(false);
    expect(settings.cleanExportFdx.removeTasks).toBe(false);
    const kept = migrateSettings({
      cleanExport: keepTasks,
      cleanExportPdf: DEFAULT_SETTINGS.cleanExport,
    });
    expect(kept.cleanExportPdf.removeTasks).toBe(true);
  });
});
