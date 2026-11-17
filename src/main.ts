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

import { createDualDialogueExtension } from "./editor/dualDialogueView";
import { EditorView } from "@codemirror/view";
import { pressTab } from "./editor/pressTab";
import { estimateCurrentPage } from "./screenplay/currentPage";
import type { ScreenplayStatistics } from "./screenplay/model";
import {
  applyScreenplayFont,
  screenplayFontCss,
} from "./editor/screenplayFont";
import { createBottomMarginExtension } from "./editor/bottomMargin";
import { createScreenplayLayoutExtension } from "./editor/screenplayLayout";
import {
  MarkdownView,
  Notice,
  Plugin,
  getFrontMatterInfo,
  parseYaml,
} from "obsidian";
import type { TFile } from "obsidian";
import { openCharacterPicker } from "./commands/character";
import { exportFdx } from "./commands/exportFdx";
import { exportFountain } from "./commands/exportFountain";
import { exportPdf } from "./commands/exportPdf";
import {
  isLikelyCharacterCue,
  openCharacterExtension,
} from "./commands/characterExtension";
import { openCharacterDossier } from "./commands/characterPage";
import { openCharacterGraph } from "./commands/characterGraph";
import { checkCharacters } from "./commands/checkCharacters";
import { createExampleScreenplay } from "./commands/createExample";
import { activateScreenplayNote } from "./commands/activateScreenplay";
import { openNewScene } from "./commands/newScene";
import { openParenthetical } from "./commands/parenthetical";
import { openTransition } from "./commands/transition";
import { previewScreenplay } from "./commands/previewScreenplay";
import {
  createScreenplayCompletionExtension,
  forceElement,
} from "./editor/completion";
import type { ForcedElement } from "./editor/forceElement";
import {
  createBlankLineLockExtension,
  mergeWithLineAbove,
} from "./editor/blankLineLock";
import { registerFountainCodeBlockProcessor } from "./editor/fountainCodeBlock";
import { isCharacterFrontmatter } from "./characters/catalogue";
import {
  loadScreenplayContext,
  openAdjacentProjectPart,
  projectForFile,
  projectForPart,
} from "./projects/vault";
import { isScreenplayProjectFrontmatter } from "./projects/model";
import { isScreenplayMode } from "./screenplay/mode";
import { calculateStatistics } from "./screenplay/statistics";
import { formatScreenplayStatus } from "./screenplay/status";
import {
  DEFAULT_SETTINGS,
  migrateSettings,
  ScribidianSettingTab,
  type ScribidianSettings,
} from "./settings/settings";
import { SCENES_VIEW_TYPE, ScenesView } from "./ui/scenesView";
import { CheatSheetModal } from "./ui/cheatSheetModal";
import { StatisticsModal } from "./ui/statisticsModal";
import { ContinuityInspectorModal } from "./ui/continuityInspectorModal";
import { NoteContext, resolveNoteProperties } from "./ui/noteContext";
import type { NoteProperties } from "./ui/noteContext";
import { CjkFontPackModal } from "./ui/cjkFontPackModal";

export default class ScribidianPlugin extends Plugin {
  settings: ScribidianSettings = { ...DEFAULT_SETTINGS };
  private statusBarItem: HTMLElement | null = null;
  private refreshTimer: number | null = null;
  private readonly noteContext = new NoteContext<TFile, MarkdownView>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.applyScreenplayFont();
    this.registerFountainExtension();
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass("scribidian-status");
    this.statusBarItem.hide();
    this.addSettingTab(new ScribidianSettingTab(this.app, this));
    this.registerEditorExtension(createScreenplayCompletionExtension(this));
    this.registerEditorExtension(createScreenplayLayoutExtension(this));
    this.registerEditorExtension(createDualDialogueExtension(this));
    this.registerEditorExtension(createBottomMarginExtension(this));
    this.registerEditorExtension(createBlankLineLockExtension(this));
    this.registerEditorExtension(
      EditorView.updateListener.of((update) => {
        if (update.selectionSet && !update.docChanged) this.onCursorMoved();
      }),
    );
    registerFountainCodeBlockProcessor(this);
    this.registerView(SCENES_VIEW_TYPE, (leaf) => new ScenesView(leaf, this));
    this.addRibbonIcon("clapperboard", "Open scenes", () => {
      void this.openScenes();
    });

    this.addCommand({
      id: "install-offline-cjk-pdf-fonts",
      name: "Install offline CJK PDF fonts",
      callback: () => new CjkFontPackModal(this).open(),
    });
    this.addCommand({
      id: "open-scene-workspace",
      name: "Open scenes",
      callback: () => void this.openScenes(),
    });
    this.addCommand({
      id: "inspect-continuity",
      name: "Inspect continuity",
      callback: () => this.openContinuityInspector(),
    });

    this.addCommand({
      id: "toggle-editor-mode",
      name: "Screenplay: Toggle script and plain mode",
      icon: "file-type",
      callback: () => void this.toggleEditorMode(),
    });

    this.addCommand({
      id: "use-note-as-screenplay",
      name: "Use this note as a screenplay",
      checkCallback: (checking) => {
        const file = this.activeMarkdownView()?.file;
        if (
          !file ||
          file.extension !== "md" ||
          this.isScreenplayFile(file) ||
          this.isCharacterFile(file) ||
          this.isProjectFile(file)
        )
          return false;
        if (!checking) void activateScreenplayNote(this, file);
        return true;
      },
    });

    this.addCommand({
      id: "create-example-screenplay",
      name: "Create example screenplay",
      callback: () => void createExampleScreenplay(this),
    });

    this.addCommand({
      id: "open-screenplay-cheat-sheet",
      name: "Open screenplay cheat sheet",
      callback: () => new CheatSheetModal(this.app).open(),
    });

    const forceCommands: [ForcedElement, string, string][] = [
      // The ids stayed the same when the names lost their numbers, so
      // assigned hotkeys keep working.
      ["scene-heading", "set-line-scene-heading", "Set line to slugline"],
      ["action", "set-line-action", "Set line to action"],
      ["character", "set-line-character", "Set line to character"],
      ["parenthetical", "set-line-parenthetical", "Set line to wryly"],
      ["transition", "set-line-transition", "Set line to transition"],
      ["centered", "set-line-centered", "Set line to centered text"],
    ];
    for (const [element, id, name] of forceCommands) {
      this.addCommand({
        id: `screenplay-${id}`,
        name: `Screenplay: ${name}`,
        editorCheckCallback: (checking, editor, context) => {
          if (!this.isScreenplayFile(context.file)) return false;
          const cm = (editor as { cm?: unknown }).cm;
          if (!(cm instanceof EditorView)) return false;
          if (!checking) forceElement(cm, element);
          return true;
        },
      });
    }

    // Phone keyboards have no Tab key. These commands press Tab and
    // Shift+Tab in the editor, so Smart Tab can go on the mobile toolbar.
    const smartTabCommands: [string, string, boolean][] = [
      ["screenplay-smart-tab", "Screenplay: Smart Tab", false],
      ["screenplay-smart-tab-back", "Screenplay: Smart Tab back", true],
    ];
    for (const [id, name, shiftKey] of smartTabCommands) {
      this.addCommand({
        id,
        name,
        icon: shiftKey ? "arrow-left-to-line" : "arrow-right-to-line",
        editorCheckCallback: (checking, editor, context) => {
          if (!this.isScreenplayFile(context.file)) return false;
          const cm = (editor as { cm?: unknown }).cm;
          if (!(cm instanceof EditorView)) return false;
          if (!checking) pressTab(cm, shiftKey);
          return true;
        },
      });
    }

    // Strict cursor placement stops Backspace from joining two different
    // elements; this joins them anyway. Shift+Backspace in the editor runs
    // it too (see createBlankLineLockExtension).
    this.addCommand({
      id: "screenplay-merge-with-line-above",
      name: "Screenplay: Delete and merge with line above",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        const cm = (editor as { cm?: unknown }).cm;
        if (!(cm instanceof EditorView)) return false;
        if (!checking) mergeWithLineAbove(cm);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-new-scene",
      name: "Screenplay: New scene",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        if (!checking) openNewScene(this, editor);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-character",
      name: "Screenplay: Character",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        if (!checking) openCharacterPicker(this, editor);
        return true;
      },
    });
    this.addCommand({
      id: "character-open-local-graph",
      name: "Character: Open local graph",
      checkCallback: (checking) => {
        const file = this.activeFile();
        if (!this.isCharacterFile(file) || file === null) return false;
        if (!checking) void openCharacterGraph(this, file);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-check-characters",
      name: "Screenplay: Check characters",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (
          view?.file === null ||
          view === null ||
          (!this.isScreenplayFile(view.file) && !this.isProjectFile(view.file))
        )
          return false;
        if (!checking) checkCharacters(this, view.editor, view.file);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-character-page",
      name: "Screenplay: Open or create character page",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file) || context.file === null) {
          return false;
        }
        if (!checking) openCharacterDossier(this, editor, context.file);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-character-extension",
      name: "Screenplay: Character extension",
      editorCheckCallback: (checking, editor, context) => {
        if (
          !this.isScreenplayFile(context.file) ||
          !isLikelyCharacterCue(editor.getLine(editor.getCursor().line))
        ) {
          return false;
        }
        if (!checking) openCharacterExtension(this, editor);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-parenthetical",
      name: "Screenplay: Wryly",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        if (!checking) openParenthetical(this, editor);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-transition",
      name: "Screenplay: Transition",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        if (!checking) openTransition(this, editor);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-show-statistics",
      name: "Screenplay: Show statistics",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (
          view === null ||
          (!this.isScreenplayFile(view.file) && !this.isProjectFile(view.file))
        )
          return false;
        if (!checking) void this.showStatistics(view);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-preview",
      name: "Screenplay: Preview",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (
          view === null ||
          (!this.isScreenplayFile(view.file) && !this.isProjectFile(view.file))
        )
          return false;
        if (!checking) void previewScreenplay(this, view);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-export-pdf",
      name: "Screenplay: Export PDF",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (
          view === null ||
          (!this.isScreenplayFile(view.file) && !this.isProjectFile(view.file))
        )
          return false;
        if (!checking) void exportPdf(this, view);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-export-fountain",
      name: "Screenplay: Export to Fountain",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (
          view === null ||
          (!this.isScreenplayFile(view.file) && !this.isProjectFile(view.file))
        )
          return false;
        if (!checking) void exportFountain(this, view);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-export-clean-fountain",
      name: "Screenplay: Export to clean Fountain",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (
          view === null ||
          (!this.isScreenplayFile(view.file) && !this.isProjectFile(view.file))
        )
          return false;
        if (!checking) void exportFountain(this, view, true);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-export-final-draft-fdx",
      name: "Screenplay: Export to Final Draft FDX",
      checkCallback: (checking) => {
        const view = this.activeMarkdownView();
        if (
          view === null ||
          (!this.isScreenplayFile(view.file) && !this.isProjectFile(view.file))
        )
          return false;
        if (!checking) void exportFdx(this, view);
        return true;
      },
    });

    this.addCommand({
      id: "screenplay-project-previous-part",
      name: "Screenplay project: Previous part",
      checkCallback: (checking) => {
        const file = this.activeFile();
        if (file === null || projectForPart(this.app, file) === null)
          return false;
        if (!checking) void openAdjacentProjectPart(this.app, file, -1);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-project-next-part",
      name: "Screenplay project: Next part",
      checkCallback: (checking) => {
        const file = this.activeFile();
        if (file === null || projectForPart(this.app, file) === null)
          return false;
        if (!checking) void openAdjacentProjectPart(this.app, file, 1);
        return true;
      },
    });
    this.addCommand({
      id: "screenplay-project-open-project-note",
      name: "Screenplay project: Open project note",
      checkCallback: (checking) => {
        const file = this.activeFile();
        const project = file ? projectForPart(this.app, file) : null;
        if (project === null) return false;
        if (!checking)
          void this.app.workspace.getLeaf(false).openFile(project.file);
        return true;
      },
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.activeMarkdownView();
        this.scheduleRefresh();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.noteContext.opened(file);
        this.activeMarkdownView();
        this.scheduleRefresh();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.scheduleRefresh()),
    );
    this.registerEvent(
      this.app.workspace.on("editor-change", () => this.scheduleRefresh()),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.scenesOpen() || file === this.activeFile())
          this.scheduleRefresh();
      }),
    );
    const onVaultChange = () => {
      if (this.scenesOpen()) this.scheduleRefresh();
    };
    this.registerEvent(this.app.vault.on("modify", onVaultChange));
    this.registerEvent(this.app.vault.on("rename", onVaultChange));
    this.registerEvent(this.app.vault.on("delete", onVaultChange));
    this.registerEvent(this.app.vault.on("create", onVaultChange));
    this.registerDomEvent(activeDocument, "selectionchange", () => {
      const activeElement = activeDocument.activeElement;
      if (
        activeElement?.instanceOf(HTMLElement) &&
        activeElement.closest(".cm-editor")
      ) {
        this.scheduleRefresh();
      }
    });

    this.app.workspace.onLayoutReady(() => this.scheduleRefresh());
  }

  onunload(): void {
    applyScreenplayFont(null);
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.clearProjectViewClasses();
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Record<string, unknown> | null;
    this.settings = migrateSettings(stored);
  }

  /** Apply the "Screenplay font" setting to the app window. */
  applyScreenplayFont(): void {
    applyScreenplayFont(
      screenplayFontCss(
        this.settings.screenplayFont,
        this.settings.screenplayFontCustom,
      ),
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Open .fountain files as notes. Another plugin (or Custom File
   * Extensions) may have claimed .fountain already; Obsidian then refuses a
   * second claim, which would otherwise stop Scribidian from loading.
   */
  private registerFountainExtension(): void {
    try {
      this.registerExtensions(["fountain"], "markdown");
    } catch {
      new Notice(
        "Scribidian: another plugin already opens .fountain files. Scribidian " +
          "still works in them if that plugin opens them as notes. Otherwise, " +
          "turn off that plugin's .fountain support and restart Obsidian.",
        15000,
      );
    }
  }

  /**
   * The two editor modes (Settings > Editor layout):
   *
   * - Script mode ("Screenplay layout"): the page is laid out like a
   *   screenplay and Scribidian may shape typing, e.g. Smart Enter.
   * - Plain mode ("Plain Fountain text"): plain text with free typing.
   *   Suggestions and Smart Tab still work; Enter is always Obsidian's own.
   *
   * Behaviour that changes typing beyond suggestions and Tab belongs to
   * script mode only. See docs/EDITOR_MODES.md for the full list.
   */
  isScriptMode(): boolean {
    return this.settings.editorLayout === "screenplay";
  }

  /** Whether a per-mode typing setting is on in the current mode. */
  typingChangeEnabled(
    change:
      | "capitalizeLineStarts"
      | "uppercaseSluglines"
      | "uppercaseTransitions"
      | "lockBlankLines",
  ): boolean {
    const mode = this.isScriptMode() ? "Script" : "Plain";
    return this.settings[`${change}${mode}`];
  }

  /** Switch between script and plain mode, and say which one is on. */
  async toggleEditorMode(): Promise<void> {
    this.settings.editorLayout = this.isScriptMode() ? "plain" : "screenplay";
    await this.saveSettings();
    this.app.workspace.updateOptions();
    new Notice(
      this.isScriptMode()
        ? "Scribidian: script mode (screenplay layout)"
        : "Scribidian: plain mode (Fountain text)",
    );
  }

  isScreenplayFile(file: TFile | null): boolean {
    const properties = this.notePropertiesForFile(file);
    return isScreenplayMode(
      file,
      properties.state === "ready" ? properties.frontmatter : undefined,
      this.settings,
    );
  }

  notePropertiesForFile(file: TFile | null): NoteProperties {
    if (file === null) return { state: "loading" };
    const cache = this.app.metadataCache.getFileCache(file);
    const view = this.activeMarkdownView();
    const editorSource = view?.file === file ? view.editor.getValue() : null;
    // Reading views can have an empty editor; do not mistake that for removed properties.
    const source =
      editorSource === "" && (view?.getMode() !== "source" || cache == null)
        ? null
        : editorSource;
    return resolveNoteProperties(
      source,
      cache != null,
      cache?.frontmatter,
      (text) => {
        const info = getFrontMatterInfo(text);
        if (!info.exists) {
          if (/^\uFEFF?---(?:\r?\n|$)/u.test(text))
            throw new Error("Properties are still loading or incomplete.");
          return undefined;
        }
        const properties: unknown = parseYaml(info.frontmatter);
        if (properties === null || properties === undefined) return undefined;
        if (typeof properties !== "object" || Array.isArray(properties))
          throw new Error("Properties must be a mapping.");
        return properties as Record<string, unknown>;
      },
    );
  }

  isCharacterFile(file: TFile | null): boolean {
    if (file === null || file.extension !== "md") return false;
    const properties = this.notePropertiesForFile(file);
    return (
      properties.state === "ready" &&
      isCharacterFrontmatter(properties.frontmatter)
    );
  }

  isProjectFile(file: TFile | null): boolean {
    if (file === null || file.extension !== "md") return false;
    const properties = this.notePropertiesForFile(file);
    return (
      properties.state === "ready" &&
      isScreenplayProjectFrontmatter(properties.frontmatter)
    );
  }

  refreshStatus(): void {
    this.refreshProjectViewClasses();
    this.refreshScenes();
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.settings.statusBarEnabled) {
      this.statusBarItem?.hide();
      return;
    }

    const view = this.activeMarkdownView();
    const file = view?.file ?? null;
    if (
      view === null ||
      (!this.isScreenplayFile(file) && !this.isProjectFile(file))
    ) {
      this.statusBarItem?.hide();
      return;
    }

    void this.refreshStatusFor(view);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(
      () => this.refreshStatus(),
      this.settings.updateDelayMs,
    );
  }

  private async statisticsFor(view: MarkdownView) {
    const file = view.file;
    if (file === null) return null;
    const context = await loadScreenplayContext(
      this.app,
      file,
      this.settings.characterFolder,
      this.isScreenplayFile(file) ? view.editor.getValue() : undefined,
    );
    // Cursor moves refresh the status too; recount only when the text or
    // a setting it depends on changed.
    const key = JSON.stringify([
      context.source,
      context.document.titlePage ?? null,
      this.settings.pageSize,
      this.settings.minutesPerPage,
    ]);
    if (this.statisticsCache?.key === key) {
      return this.statisticsCache.statistics;
    }
    const statistics = calculateStatistics(context.document, {
      pageSize: this.settings.pageSize,
      minutesPerPage: this.settings.minutesPerPage,
    });
    this.statisticsCache = { key, statistics };
    return statistics;
  }

  private statisticsCache: {
    key: string;
    statistics: ScreenplayStatistics;
  } | null = null;

  private async showStatistics(view: MarkdownView): Promise<void> {
    const statistics = await this.statisticsFor(view);
    if (statistics) new StatisticsModal(this.app, statistics).open();
  }

  private async refreshStatusFor(view: MarkdownView): Promise<void> {
    const file = view.file;
    const statistics = await this.statisticsFor(view);
    if (
      statistics === null ||
      file === null ||
      file !== this.activeFile() ||
      (projectForFile(this.app, file) === null && !this.isScreenplayFile(file))
    )
      return;
    this.lastStatus = { file, statistics };
    this.renderStatus(view);
  }

  /** Statistics from the last full refresh, reused when only the cursor moves. */
  private lastStatus: {
    file: TFile;
    statistics: ScreenplayStatistics;
  } | null = null;
  private cursorTimer: number | null = null;

  /** The cursor moved: update the current page without recounting. */
  onCursorMoved(): void {
    if (!this.settings.statusBarEnabled || !this.settings.showCurrentPage) {
      return;
    }
    if (this.cursorTimer !== null) window.clearTimeout(this.cursorTimer);
    this.cursorTimer = window.setTimeout(() => {
      this.cursorTimer = null;
      const view = this.activeMarkdownView();
      if (view !== null && view.file === this.lastStatus?.file) {
        this.renderStatus(view);
      }
    }, 150);
  }

  private renderStatus(view: MarkdownView): void {
    const last = this.lastStatus;
    if (last === null || view.file !== last.file) return;
    const currentPage =
      this.settings.showCurrentPage && this.isScreenplayFile(last.file)
        ? estimateCurrentPage(
            view.editor.getValue(),
            view.editor.posToOffset(view.editor.getCursor()),
            this.settings.pageSize,
          )
        : null;
    const status = formatScreenplayStatus(last.statistics, {
      estimatedPages: this.settings.showEstimatedPages,
      currentPage,
      estimatedRuntime: this.settings.showEstimatedRuntime,
      words: this.settings.showWordCount,
      scenes: this.settings.showSceneCount,
    });
    this.statusBarItem?.setText(status);
    this.statusBarItem?.setAttribute(
      "aria-label",
      `Scribidian screenplay statistics: ${status}`,
    );
    this.statusBarItem?.show();
  }

  /** Open the Scenes sidebar, or bring it forward if it is already open. */
  async openScenes(): Promise<void> {
    this.activeMarkdownView();
    const existing = this.app.workspace.getLeavesOfType(SCENES_VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(true);
    if (leaf === null) return;
    await leaf.setViewState({
      type: SCENES_VIEW_TYPE,
      active: true,
    });
    await this.app.workspace.revealLeaf(leaf);
  }

  openContinuityInspector(): void {
    new ContinuityInspectorModal(this).open();
  }

  activeMarkdownView(): MarkdownView | null {
    const direct = this.app.workspace.getActiveViewOfType(MarkdownView);
    const views = this.app.workspace
      .getLeavesOfType("markdown")
      .map((leaf) => leaf.view)
      .filter((view): view is MarkdownView => view instanceof MarkdownView);
    return this.noteContext.resolve(
      direct,
      this.app.workspace.getActiveFile(),
      views,
      this.app.workspace.getActiveViewOfType(ScenesView) !== null,
    );
  }

  private activeFile(): TFile | null {
    return (
      this.activeMarkdownView()?.file ?? this.app.workspace.getActiveFile()
    );
  }

  private scenesOpen(): boolean {
    return this.app.workspace.getLeavesOfType(SCENES_VIEW_TYPE).length > 0;
  }

  private refreshScenes(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(SCENES_VIEW_TYPE)) {
      if (leaf.view instanceof ScenesView) leaf.view.refresh();
    }
  }

  private refreshProjectViewClasses(): void {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView) {
        leaf.view.containerEl.classList.toggle(
          "scribidian-project-note",
          this.isProjectFile(leaf.view.file),
        );
      }
    }
  }

  private clearProjectViewClasses(): void {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView) {
        leaf.view.containerEl.classList.remove("scribidian-project-note");
      }
    }
  }
}
