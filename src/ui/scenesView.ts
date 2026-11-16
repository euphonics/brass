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

import { ItemView } from "obsidian";
import type { IconName, WorkspaceLeaf } from "obsidian";
import type ScribidianPlugin from "../main";
import { renderSceneWorkspace } from "./sceneWorkspace";
import { EMPTY_SCENE_FILTERS } from "../scenes/model";

/** Kept from the old palette so sidebars saved with it still open. */
export const SCENES_VIEW_TYPE = "scribidian-palette";

/** The sidebar scene list: jump to, filter, add, edit and move scenes. */
export class ScenesView extends ItemView {
  private renderGeneration = 0;
  private sceneFilters = { ...EMPTY_SCENE_FILTERS };

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: ScribidianPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return SCENES_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Scenes";
  }

  getIcon(): IconName {
    return "clapperboard";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("scribidian-palette");
    this.refresh();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  refresh(): void {
    const generation = ++this.renderGeneration;
    void renderSceneWorkspace(
      this.plugin,
      this.contentEl,
      this.sceneFilters,
      () => generation === this.renderGeneration,
      () => this.refresh(),
    );
  }
}
