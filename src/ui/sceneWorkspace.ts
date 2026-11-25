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

import { MarkdownView, Modal, Notice, Setting } from "obsidian";
import type BrassPlugin from "../main";
import {
  sceneFile,
  filterScenes,
  EMPTY_SCENE_FILTERS,
  createScene,
  editSynopsis,
  moveScene,
  type Scene,
  type SceneFile,
  type SceneFilters,
} from "../scenes/model";
import {
  loadSceneWorkspace,
  jumpToScene,
  applySceneChanges,
  readSceneRecovery,
  restoreLastSceneMove,
  type SceneWorkspace,
} from "../scenes/vault";
import type { SceneRecovery } from "../scenes/transactions";
import { parseSceneHeadingParts } from "../screenplay/indexer";

async function report(
  task: () => Promise<void>,
  refresh: () => void,
): Promise<void> {
  try {
    await task();
    refresh();
  } catch (error) {
    new Notice(
      error instanceof Error
        ? error.message
        : "Scene operation failed. Your recovery copy, if any, is preserved.",
      12000,
    );
    refresh();
  }
}
/**
 * A button. `disabled` is false, or why the button is off: true, or a reason.
 * A button with a reason stays tappable and shows the reason in a notice
 * (hover tooltips never show on a phone), and also as a tooltip on hover.
 */
function action(
  container: HTMLElement,
  label: string,
  run: () => void,
  disabled: boolean | string = false,
): HTMLButtonElement {
  const button = container.createEl("button", { text: label });
  if (typeof disabled === "string") {
    button.title = disabled;
    button.setAttribute("aria-disabled", "true");
    button.addClass("brass-button-off");
    button.addEventListener("click", () => new Notice(disabled));
    return button;
  }
  button.disabled = disabled;
  button.addEventListener("click", run);
  return button;
}

/** Whether the cursor (workspace.activePath/activeLine) is in `scene`. */
function isActiveScene(
  workspace: SceneWorkspace,
  file: SceneFile,
  scene: Scene,
): boolean {
  if (scene.path !== workspace.activePath) return false;
  if (workspace.activeLine < scene.line) return false;
  const next = file.scenes.find((item) => item.start > scene.start);
  return next === undefined || workspace.activeLine < next.line;
}

/**
 * Everything the list shows, apart from which scene the cursor is in. When
 * it hasn't changed, the panel keeps its elements and only moves the
 * highlight, instead of rebuilding on every keystroke.
 */
function sceneListKey(
  workspace: SceneWorkspace,
  filters: SceneFilters,
): string {
  return JSON.stringify({
    issues: workspace.issues,
    activePath: workspace.activePath,
    filters,
    files: workspace.files.map((file) => ({
      path: file.path,
      issue: file.issue,
      scenes: file.scenes.map((scene) => [
        scene.heading,
        scene.line,
        scene.page.toFixed(1),
        scene.synopsis,
        scene.characters,
        // Searching also looks at the scene text.
        filters.query ? scene.text : "",
      ]),
    })),
  });
}

interface RenderedSceneList {
  key: string;
  /** The latest data; buttons read it when clicked, so it is never stale. */
  current: { workspace: SceneWorkspace };
  /** Move the highlight to the scene the cursor is in. */
  markActive: () => void;
}

const renderedLists = new WeakMap<HTMLElement, RenderedSceneList>();

export async function renderSceneWorkspace(
  plugin: BrassPlugin,
  container: HTMLElement,
  filters: SceneFilters,
  isCurrent: () => boolean,
  refresh: () => void,
): Promise<void> {
  let loaded: SceneWorkspace;
  try {
    loaded = await loadSceneWorkspace(plugin);
  } catch (error) {
    if (!isCurrent()) return;
    renderedLists.delete(container);
    container.empty();
    container.createEl("h2", { text: "Scenes" });
    const bar = container.createDiv({ cls: "brass-scene-actions" });
    action(bar, "Refresh", refresh);
    action(bar, "Inspect continuity", () => plugin.openContinuityInspector());
    container.createEl("p", {
      text: error instanceof Error ? error.message : "Could not load scenes.",
    });
    return;
  }
  if (!isCurrent()) return;
  const key = sceneListKey(loaded, filters);
  const rendered = renderedLists.get(container);
  if (rendered !== undefined && rendered.key === key) {
    rendered.current.workspace = loaded;
    rendered.markActive();
    return;
  }

  const current = { workspace: loaded };
  const workspace = loaded;
  container.empty();
  container.createEl("h2", { text: "Scenes" });
  const bar = container.createDiv({ cls: "brass-scene-actions" });
  action(bar, "Refresh", refresh);
  action(bar, "Inspect continuity", () => plugin.openContinuityInspector());
  {
    const all = workspace.files.flatMap((file) => file.scenes);
    const issues = [
      ...workspace.issues,
      ...workspace.files.flatMap((file) =>
        file.issue ? [`${file.path}: ${file.issue}`] : [],
      ),
    ];
    if (issues.length)
      container.createEl("p", {
        cls: "brass-scene-warning",
        text: issues.join("\n"),
      });
    const writeIssue = workspace.issues[0] ?? null;
    action(
      bar,
      "New scene",
      () =>
        new SceneEditModal(
          plugin,
          current.workspace,
          null,
          "create",
          refresh,
        ).open(),
      writeIssue ??
        (workspace.files.some((file) => !file.issue)
          ? false
          : (workspace.files[0]?.issue ?? true)),
    );
    action(
      bar,
      "Restore last move",
      () =>
        void report(
          async () => {
            const record = await readSceneRecovery(plugin);
            if (!record) {
              new Notice("No scene move recovery copy is available.");
              return;
            }
            new RecoveryModal(plugin, record, refresh).open();
          },
          () => {},
        ),
    );
    const controls = container.createDiv({ cls: "brass-scene-filters" });
    const search = controls.createEl("input", {
      type: "search",
      placeholder: "Find scenes or synopses",
    });
    search.value = filters.query;
    search.setAttribute("aria-label", "Find scenes or synopses");
    const selects: {
      key: "part" | "character" | "location" | "time";
      label: string;
      values: string[];
    }[] = [
      {
        key: "part",
        label: "All parts",
        values: workspace.files.map((file) => file.path),
      },
      {
        key: "character",
        label: "All characters",
        values: all.flatMap((scene) => scene.characters),
      },
      {
        key: "location",
        label: "All locations",
        values: all.map((scene) => scene.location),
      },
      {
        key: "time",
        label: "All times",
        values: all.map((scene) => scene.time),
      },
    ];
    const list = container.createDiv({ cls: "brass-scene-list" });
    const cards: {
      card: HTMLElement;
      heading: HTMLElement;
      live: () => { file: SceneFile; scene: Scene };
    }[] = [];
    const markActive = (): void => {
      for (const { card, heading, live } of cards) {
        const { file, scene } = live();
        const active = isActiveScene(current.workspace, file, scene);
        card.toggleClass("is-active", active);
        if (active) heading.setAttribute("aria-current", "true");
        else heading.removeAttribute("aria-current");
      }
    };
    const renderList = (): void => {
      list.empty();
      const visible = filterScenes(all, filters);
      if (!visible.length)
        list.createEl("p", {
          text: all.length
            ? "No scenes match these filters."
            : "No scenes yet. Choose New scene to begin.",
        });
      list.createEl("p", {
        cls: "brass-palette-muted",
        text: `${visible.length} of ${all.length} scenes · page positions are approximate`,
      });
      cards.length = 0;
      for (const scene of visible) {
        const fileIndex = workspace.files.findIndex(
          (item) => item.path === scene.path,
        );
        const file = workspace.files[fileIndex];
        if (!file) continue;
        const local = file.scenes.indexOf(scene);
        // The same file and scene in the latest data (see sceneListKey).
        const live = (): { file: SceneFile; scene: Scene } => {
          const liveFile = current.workspace.files[fileIndex] ?? file;
          return { file: liveFile, scene: liveFile.scenes[local] ?? scene };
        };
        const card = list.createDiv({ cls: "brass-scene-card" });
        const index = all.indexOf(scene);
        const heading = action(card, `${index + 1}. ${scene.heading}`, () => {
          const target = live();
          void report(
            () => jumpToScene(plugin, target.file, target.scene),
            refresh,
          );
        });
        heading.addClass("brass-scene-heading");
        cards.push({ card, heading, live });
        card.createEl("p", {
          cls: "brass-palette-muted",
          text: `${scene.path} · ~p. ${scene.page.toFixed(1)}`,
        });
        if (scene.synopsis)
          card.createEl("p", {
            cls: "brass-scene-synopsis",
            text: scene.synopsis,
          });
        if (scene.characters.length)
          card.createEl("p", {
            cls: "brass-palette-muted",
            text: scene.characters.join(", "),
          });
        const buttons = card.createDiv({ cls: "brass-scene-actions" });
        const disabled: string | false = writeIssue ?? file.issue ?? false;
        const filtered = Boolean(
          filters.query ||
          filters.part ||
          filters.character ||
          filters.location ||
          filters.time,
        );
        const filteredReason =
          "Clear the search and filters to move scenes up or down.";
        action(
          buttons,
          "Synopsis",
          () =>
            new SceneEditModal(
              plugin,
              current.workspace,
              live().scene,
              "synopsis",
              refresh,
            ).open(),
          disabled,
        );
        const shift = (offset: -1 | 1) =>
          void report(async () => {
            const { file: liveFile, scene: liveScene } = live();
            const target = liveFile.scenes[local + offset];
            if (!target) return;
            await applySceneChanges(
              plugin,
              moveScene(
                liveFile,
                liveScene,
                liveFile,
                target,
                offset < 0 ? "before" : "after",
              ),
            );
          }, refresh);
        action(
          buttons,
          "Up",
          () => shift(-1),
          disabled ||
            (local === 0 && "Already the first scene in this file.") ||
            (filtered && filteredReason),
        );
        action(
          buttons,
          "Down",
          () => shift(1),
          disabled ||
            (local === file.scenes.length - 1 &&
              "Already the last scene in this file.") ||
            (filtered && filteredReason),
        );
        action(
          buttons,
          "Move…",
          () =>
            new SceneEditModal(
              plugin,
              current.workspace,
              live().scene,
              "move",
              refresh,
            ).open(),
          disabled,
        );
      }
      markActive();
    };
    search.addEventListener("input", () => {
      filters.query = search.value;
      renderList();
    });
    for (const { key, label, values } of selects) {
      const select = controls.createEl("select");
      select.setAttribute("aria-label", label);
      select.createEl("option", { value: "", text: label });
      for (const value of [...new Set(values)].filter(Boolean))
        select.createEl("option", { value, text: value });
      if (!values.includes(filters[key])) filters[key] = "";
      select.value = filters[key];
      select.addEventListener("change", () => {
        filters[key] = select.value;
        renderList();
      });
    }
    action(controls, "Clear filters", () => {
      Object.assign(filters, EMPTY_SCENE_FILTERS);
      refresh();
    });
    renderList();
    renderedLists.set(container, { key, current, markActive });
  }
}

class SceneEditModal extends Modal {
  private targetFile: SceneFile;
  private target: Scene | null = null;
  private position: "before" | "after" = "after";
  private heading = "INT. LOCATION - DAY";
  private synopsis = "";
  private submitting = false;
  constructor(
    private plugin: BrassPlugin,
    private workspace: SceneWorkspace,
    private scene: Scene | null,
    private mode: "create" | "move" | "synopsis",
    private refresh: () => void,
  ) {
    super(plugin.app);
    this.targetFile =
      workspace.files.find((file) => file.path === scene?.path) ??
      workspace.files.find((file) => !file.issue) ??
      workspace.files[0];
    this.synopsis = mode === "synopsis" ? (scene?.synopsis ?? "") : "";
  }
  onOpen(): void {
    this.setTitle(
      this.mode === "create"
        ? "New scene"
        : this.mode === "move"
          ? "Move scene"
          : "Edit synopsis",
    );
    this.contentEl.empty();
    if (this.scene) {
      this.contentEl.createEl("p", { text: this.scene.heading });
      this.contentEl.createEl("p", { text: `Source: ${this.scene.path}` });
    }
    if (this.mode !== "synopsis") {
      new Setting(this.contentEl).setName("Part").addDropdown((dropdown) => {
        for (const file of this.workspace.files.filter((file) => !file.issue))
          dropdown.addOption(file.path, file.path);
        dropdown.setValue(this.targetFile.path).onChange((path) => {
          this.targetFile =
            this.workspace.files.find((file) => file.path === path) ??
            this.targetFile;
          this.target = null;
          this.onOpen();
        });
      });
      new Setting(this.contentEl)
        .setName("Destination scene")
        .addDropdown((dropdown) => {
          dropdown.addOption("end", "End of part");
          for (const [index, scene] of this.targetFile.scenes.entries())
            if (scene !== this.scene)
              dropdown.addOption(
                String(scene.start),
                `${index + 1}. ${scene.heading}`,
              );
          dropdown
            .setValue(this.target ? String(this.target.start) : "end")
            .onChange((start) => {
              this.target =
                this.targetFile.scenes.find(
                  (scene) => String(scene.start) === start,
                ) ?? null;
            });
        });
      new Setting(this.contentEl).setName("Position").addDropdown((dropdown) =>
        dropdown
          .addOption("before", "Before destination scene")
          .addOption("after", "After destination scene")
          .setValue(this.position)
          .onChange((value) => {
            this.position = value === "before" ? "before" : "after";
          }),
      );
    }
    if (this.mode === "create") {
      new Setting(this.contentEl)
        .setName("Suggested scene type")
        .addDropdown((dropdown) => {
          for (const type of this.plugin.settings.preferredSceneTypes)
            dropdown.addOption(type, type);
          dropdown.setValue(
            parseSceneHeadingParts(this.heading)?.type ?? "INT.",
          );
          dropdown.onChange((type) => {
            const current = parseSceneHeadingParts(this.heading);
            this.heading = `${type} ${current?.location ?? "LOCATION"} - ${current?.timeOfDay ?? "DAY"}`;
            this.onOpen();
          });
        });
      new Setting(this.contentEl)
        .setName("Suggested location")
        .addDropdown((dropdown) => {
          dropdown.addOption("", "Choose or type in the heading");
          for (const location of [
            ...new Set(
              this.workspace.files.flatMap((file) =>
                file.scenes.map((scene) => scene.location),
              ),
            ),
          ].filter(Boolean))
            dropdown.addOption(location, location);
          dropdown.setValue(
            parseSceneHeadingParts(this.heading)?.location ?? "",
          );
          dropdown.onChange((location) => {
            if (location) {
              const current = parseSceneHeadingParts(this.heading);
              this.heading = `${current?.type ?? "INT."} ${location} - ${current?.timeOfDay ?? "DAY"}`;
              this.onOpen();
            }
          });
        });
      new Setting(this.contentEl)
        .setName("Suggested time")
        .addDropdown((dropdown) => {
          dropdown.addOption("", "Choose or type in the heading");
          for (const time of [
            ...new Set([
              ...this.plugin.settings.preferredTimesOfDay,
              ...this.workspace.files.flatMap((file) =>
                file.scenes.map((scene) => scene.time),
              ),
            ]),
          ].filter(Boolean))
            dropdown.addOption(time, time);
          dropdown.setValue(
            parseSceneHeadingParts(this.heading)?.timeOfDay ?? "",
          );
          dropdown.onChange((time) => {
            if (time) {
              const current = parseSceneHeadingParts(this.heading);
              this.heading = `${current?.type ?? "INT."} ${current?.location ?? "LOCATION"} - ${time}`;
              this.onOpen();
            }
          });
        });
      new Setting(this.contentEl).setName("Slugline").addText((text) =>
        text.setValue(this.heading).onChange((value) => {
          this.heading = value;
        }),
      );
    }
    if (this.mode !== "move")
      new Setting(this.contentEl)
        .setName("Synopsis (optional)")
        .addTextArea((text) =>
          text.setValue(this.synopsis).onChange((value) => {
            this.synopsis = value;
          }),
        );
    if (this.mode === "move")
      this.contentEl.createEl("p", {
        text: "Confirm the destination before moving. Cross-file moves save a local recovery copy; save both notes first. A new cross-file move replaces the previous recovery copy.",
      });
    const error = this.contentEl.createEl("p", {
      cls: "brass-scene-warning",
    });
    const button = action(
      this.contentEl,
      this.mode === "move" ? "Confirm move" : "Save",
      () => {
        if (this.submitting) return;
        this.submitting = true;
        button.disabled = true;
        void this.submit()
          .then(() => {
            this.close();
            this.refresh();
          })
          .catch((problem: unknown) => {
            error.setText(
              problem instanceof Error
                ? problem.message
                : "Scene operation failed.",
            );
            this.submitting = false;
            button.disabled = false;
          });
      },
    );
  }
  private async submit(): Promise<void> {
    if (this.mode === "synopsis" && this.scene) {
      await applySceneChanges(this.plugin, [
        editSynopsis(this.targetFile, this.scene, this.synopsis),
      ]);
      return;
    }
    if (this.mode === "move" && this.scene) {
      const source = this.workspace.files.find(
        (file) => file.path === this.scene?.path,
      );
      if (!source) throw new Error("The source part is unavailable.");
      await applySceneChanges(
        this.plugin,
        moveScene(
          source,
          this.scene,
          this.targetFile,
          this.target,
          this.position,
        ),
      );
      return;
    }
    const change = createScene(
      this.targetFile,
      this.heading,
      this.synopsis,
      this.target,
      this.position,
    );
    await applySceneChanges(this.plugin, [change]);
    const updated = sceneFile(
      change.path,
      change.after,
      this.plugin.settings.pageSize,
    );
    const inserted = updated.scenes.find(
      (scene) => scene.start === change.focus,
    );
    if (inserted) {
      await jumpToScene(this.plugin, updated, inserted);
      const editor =
        this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
      if (editor) {
        const line =
          inserted.line +
          1 +
          (this.synopsis.trim()
            ? this.synopsis.trim().split(/\r?\n/u).length
            : 0);
        editor.setCursor({ line, ch: 0 });
        editor.focus();
      }
    }
  }
}

class RecoveryModal extends Modal {
  constructor(
    private plugin: BrassPlugin,
    private record: SceneRecovery,
    private refresh: () => void,
  ) {
    super(plugin.app);
  }
  onOpen(): void {
    this.setTitle("Restore last scene move");
    this.contentEl.createEl("p", {
      text: "Restore the pre-move contents of these files? Restore stops if either file contains later edits. The recovery copy stays local in plugin configuration.",
    });
    for (const change of this.record.changes)
      this.contentEl.createEl("p", { text: change.path });
    const details = this.contentEl.createEl("details");
    details.createEl("summary", { text: "Preview affected file changes" });
    for (const change of this.record.changes) {
      details.createEl("h4", { text: change.path });
      details.createEl("p", { text: "Restore this pre-move text:" });
      details.createEl("pre", { text: change.before });
    }
    const button = action(this.contentEl, "Confirm restore", () => {
      button.disabled = true;
      void report(async () => {
        await restoreLastSceneMove(this.plugin, this.record);
        this.close();
        new Notice("Pre-move screenplay contents restored.");
      }, this.refresh).finally(() => {
        button.disabled = false;
      });
    });
  }
}
