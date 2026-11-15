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
import type { App } from "obsidian";

vi.mock("obsidian", () => ({
  normalizePath: (path: string) => path.replace(/\\/gu, "/"),
  Notice: class {},
  TFile: class {},
  TFolder: class {},
}));

const { coreTemplatesFolder, isTemplateCandidate } =
  await import("../src/characters/vault");

function appWithTemplates(plugin: unknown): App {
  return {
    internalPlugins: { getPluginById: () => plugin },
  } as unknown as App;
}

const file = (path: string, extension = "md") => ({ path, extension });

describe("character template picker", () => {
  it("reads the core Templates plugin folder", () => {
    expect(
      coreTemplatesFolder(
        appWithTemplates({
          enabled: true,
          instance: { options: { folder: "/_template/" } },
        }),
      ),
    ).toBe("_template");
  });

  it("ignores the folder when the Templates plugin is off or missing", () => {
    expect(
      coreTemplatesFolder(
        appWithTemplates({
          enabled: false,
          instance: { options: { folder: "_template" } },
        }),
      ),
    ).toBe("");
    expect(coreTemplatesFolder(appWithTemplates(null))).toBe("");
    expect(coreTemplatesFolder({} as App)).toBe("");
  });

  it("suggests Markdown notes in the templates folder and subfolders", () => {
    expect(
      isTemplateCandidate(file("_template/_character.md"), "_template"),
    ).toBe(true);
    expect(
      isTemplateCandidate(file("_template/Writing/_character.md"), "_template"),
    ).toBe(true);
    expect(isTemplateCandidate(file("_templates-old/x.md"), "_template")).toBe(
      false,
    );
    expect(
      isTemplateCandidate(file("_template/cover.png", "png"), "_template"),
    ).toBe(false);
    expect(isTemplateCandidate(file("Anywhere/note.md"), "")).toBe(true);
  });
});
