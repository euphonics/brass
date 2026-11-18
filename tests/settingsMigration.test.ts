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

const { DEFAULT_SETTINGS, migrateSettings } =
  await import("../src/settings/settings");

describe("settings migration", () => {
  it("turns text changes on in script mode and off in plain mode by default", () => {
    const settings = migrateSettings(null);
    expect(settings.capitalizeLineStartsScript).toBe(true);
    expect(settings.uppercaseTransitionsScript).toBe(true);
    expect(settings.capitalizeLineStartsPlain).toBe(false);
    expect(settings.uppercaseTransitionsPlain).toBe(false);
    expect(settings.uppercaseSluglinesScript).toBe(true);
    expect(settings.uppercaseSluglinesPlain).toBe(false);
    expect(settings.uppercaseCharactersScript).toBe(true);
    expect(settings.uppercaseCharactersPlain).toBe(false);
  });

  it("drops the old PDF language setting", () => {
    expect(migrateSettings({ pdfLanguage: "ja" })).not.toHaveProperty(
      "pdfLanguage",
    );
  });

  it("moves the old single capitalize switch to script mode", () => {
    const settings = migrateSettings({ capitalizeLineStarts: false });
    expect(settings.capitalizeLineStartsScript).toBe(false);
    expect(settings.capitalizeLineStartsPlain).toBe(false);
    expect("capitalizeLineStarts" in settings).toBe(false);
  });

  it("keeps per-mode values once they are saved", () => {
    const settings = migrateSettings({
      capitalizeLineStarts: false,
      capitalizeLineStartsScript: true,
      capitalizeLineStartsPlain: true,
    });
    expect(settings.capitalizeLineStartsScript).toBe(true);
    expect(settings.capitalizeLineStartsPlain).toBe(true);
  });

  it("keeps other stored settings", () => {
    const settings = migrateSettings({ editorLayout: "plain" });
    expect(settings.editorLayout).toBe("plain");
    expect(settings.smartTabEnabled).toBe(DEFAULT_SETTINGS.smartTabEnabled);
  });

  it("starts Smart Enter from the old Smart Tab setting", () => {
    expect(migrateSettings({ smartTabEnabled: false }).smartEnterEnabled).toBe(
      false,
    );
    expect(
      migrateSettings({ smartTabEnabled: false, smartEnterEnabled: true })
        .smartEnterEnabled,
    ).toBe(true);
    expect(migrateSettings({}).smartEnterEnabled).toBe(true);
  });

  it("fills in Enter targets", () => {
    const settings = migrateSettings({ enterTargets: { action: "character" } });
    expect(settings.enterTargets.action).toBe("character");
    expect(settings.enterTargets.dialogue).toBe("character");
    expect(settings.enterTargets.transition).toBe("scene-heading");
  });
});
