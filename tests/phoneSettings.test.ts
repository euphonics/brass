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
  Modal: class {},
  setIcon: () => undefined,
  normalizePath: (path: string) => path,
  TFile: class {},
  TFolder: class {},
  editorInfoField: {},
}));

const { migrateSettings } = await import("../src/settings/settings");

describe("phone toolbar settings", () => {
  it("label with emoji by default, and keep words when chosen", () => {
    expect(migrateSettings(null).phoneButtonLabels).toBe("emoji");
    expect(
      migrateSettings({ phoneButtonLabels: "words" }).phoneButtonLabels,
    ).toBe("words");
    expect(
      migrateSettings({ phoneButtonLabels: "odd" }).phoneButtonLabels,
    ).toBe("emoji");
  });

  it("put Convert above the row unless set to the row", () => {
    expect(migrateSettings(null).phoneConvertPlacement).toBe("above");
    expect(
      migrateSettings({ phoneConvertPlacement: "row" }).phoneConvertPlacement,
    ).toBe("row");
    expect(
      migrateSettings({ phoneConvertPlacement: "odd" }).phoneConvertPlacement,
    ).toBe("above");
  });

  it("start with the toolbar on and drop the old convert setting", () => {
    const settings = migrateSettings(null);
    expect(settings.phoneButtons).toBe(true);
    expect(
      "phoneButtonsConvert" in migrateSettings({ phoneButtonsConvert: true }),
    ).toBe(false);
  });
});
