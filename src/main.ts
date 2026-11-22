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
import type { Extension } from "@codemirror/state";
import { pressTab } from "./editor/pressTab";
import { estimateCurrentPage } from "./screenplay/currentPage";
import { exportedFountainSource } from "./commands/exportFountain";
import { parseFountain } from "./screenplay/parser";
import { stripObsidianFrontmatter } from "./export/fountain";
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
  type WorkspaceLeaf,
} from "obsidian";
import type { Command, TFile } from "obsidian";
import { openCharacterPicker } from "./commands/character";
import { copyConfiguration } from "./commands/copyConfiguration";
import { elementLines } from "./commands/selectElement";
import { createThreadExtension } from "./editor/threads";
import { ThreadNavigator, ThreadSuggest } from "./threads/threadNavigator";
import { exportFdx } from "./commands/exportFdx";
import { exportFountain } from "./commands/exportFountain";
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
  mergeWithLineBelow,
} from "./editor/blankLineLock";
import {
  createBoneyardMarkerExtension,
  createLineCommentExtension,
} from "./editor/boneyardMarkers";
import { createVariableHighlightExtension } from "./editor/variables";
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
import { classifyLines, type LineKind } from "./screenplay/lines";
import { lineKindField } from "./editor/lineKindOverride";
import {
  DEFAULT_SETTINGS,
  migrateSettings,
  ScribidianSettingTab,
  type ScribidianSettings,
} from "./settings/settings";
import { SCENES_VIEW_TYPE, ScenesView } from "./ui/scenesView";
import { THREADS_VIEW_TYPE, ThreadsView } from "./ui/threadsView";
import { CheatSheetModal } from "./ui/cheatSheetModal";
import { StatisticsModal } from "./ui/statisticsModal";
import { ContinuityInspectorModal } from "./ui/continuityInspectorModal";
import { NoteContext, resolveNoteProperties } from "./ui/noteContext";
import type { NoteProperties } from "./ui/noteContext";

/**
 * Obsidian's command palette lists matching commands shortest name first
 * (ties alphabetically). Padding a name with zero-width spaces past every
 * other command's length puts a group of commands last, in `rank` order.
 */
const PALETTE_GROUP_LENGTH = 64;

/** How each element is named in the status bar ("Current element"). */
const ELEMENT_LABELS: Partial<Record<LineKind, string>> = {
  "scene-heading": "Scene heading",
  action: "Action",
  character: "Character",
  parenthetical: "Wryly",
  dialogue: "Dialogue",
  transition: "Transition",
  centered: "Centered",
  lyric: "Lyrics",
  "page-break": "Page break",
  note: "Note",
};
export function paletteOrdered(name: string, rank: number): string {
  const pad = Math.max(0, PALETTE_GROUP_LENGTH + rank - name.length);
  return name + "\u200b".repeat(pad);
}

/**
 * Marks the editor extensions this plugin registered, across reloads (a
 * reloaded plugin is new code, so only a global symbol is shared).
 */
const EXTENSIONS_TAG = Symbol.for("scribidian.editorExtensions");
/** The loaded instance, on window, so a reloaded copy can find it (#220). */
const LIVE_INSTANCE = Symbol.for("scribidian.liveInstance");

export default class ScribidianPlugin extends Plugin {
  settings: ScribidianSettings = { ...DEFAULT_SETTINGS };
  /**
   * Commands kept out of the command palette unless "Show all commands in
   * the command palette" is on: ones with their own key or menu (Tab,
   * Shift+Backspace, the suggestion lists) or rarely needed.
   */
  private readonly extraCommands: Command[] = [];
  private extraCommandsShown = false;
  private statusBarItem: HTMLElement | null = null;
  /** Threads ("[&name]"): the vault index and going between places. */
  threads!: ThreadNavigator;
  private refreshTimer: number | null = null;
  private readonly noteContext = new NoteContext<TFile, MarkdownView>();
  /** Set up and not unloaded yet (see claimLiveInstance). */
  private live = false;

  async onload(): Promise<void> {
    await this.loadSettings();
    if (!this.claimLiveInstance()) return;
    this.applyScreenplayFont();
    this.registerFountainExtension();
    this.threads = new ThreadNavigator(this);
    // Status items left by an earlier copy that was never unloaded (#220).
    activeDocument
      .querySelectorAll(".status-bar-item.scribidian-status")
      .forEach((item) => item.remove());
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.addClass("scribidian-status");
    this.statusBarItem.hide();
    this.addSettingTab(new ScribidianSettingTab(this.app, this));
    // One call, in this order: each call makes Obsidian reconfigure every
    // open editor.
    const editorExtensions = [
      createScreenplayCompletionExtension(this),
      createScreenplayLayoutExtension(this),
      createDualDialogueExtension(this),
      createBottomMarginExtension(this),
      createBlankLineLockExtension(this),
      createBoneyardMarkerExtension(this),
      createLineCommentExtension(this),
      createVariableHighlightExtension(this),
      createThreadExtension((view, mark, step, panel, across) => {
        // Ctrl/Cmd+click: the thread in the Threads panel.
        if (panel) void this.openThreads(mark.key);
        else void this.threads.open(view, mark, step, false, across);
      }),
      EditorView.updateListener.of((update) => {
        if (update.selectionSet && !update.docChanged) this.onCursorMoved();
      }),
    ];
    this.registerOwnEditorExtensions(editorExtensions);
    this.registerEditorSuggest(new ThreadSuggest(this.threads));
    this.app.workspace.onLayoutReady(() => this.followLinkOnThreads());
    registerFountainCodeBlockProcessor(this);
    this.registerOwnView(
      SCENES_VIEW_TYPE,
      (leaf) => new ScenesView(leaf, this),
    );
    this.registerOwnView(
      THREADS_VIEW_TYPE,
      (leaf) => new ThreadsView(leaf, this),
    );
    this.addRibbonIcon("clapperboard", "Open scenes", () => {
      void this.openScenes();
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
      name: "Screenplay: Toggle script/Fountain mode",
      icon: "file-type",
      callback: () => void this.toggleEditorMode(),
    });
    this.addCommand({
      id: "toggle-strict-cursor",
      name: "Screenplay: Toggle strict cursor placement",
      icon: "lock",
      callback: () => void this.toggleStrictCursor(),
    });
    this.addCommand({
      id: "copy-configuration",
      name: "Copy configuration to clipboard",
      icon: "clipboard-copy",
      callback: () => void copyConfiguration(this),
    });
    this.addCommand({
      id: "thread-next",
      name: "Next in thread",
      icon: "spool",
      editorCallback: (editor) => {
        this.threads.openFromCursor(editor, 1);
      },
    });
    this.addCommand({
      id: "thread-previous",
      name: "Previous in thread",
      icon: "spool",
      editorCallback: (editor) => {
        this.threads.openFromCursor(editor, -1);
      },
    });
    this.addCommand({
      id: "show-threads",
      name: "Show threads",
      icon: "spool",
      callback: () => {
        const editor = this.activeMarkdownView()?.editor ?? null;
        void this.openThreads(
          editor === null ? null : this.threads.keyAtCursor(editor),
        );
      },
    });
    this.addCommand({
      id: "thread-next-across",
      name: "Next in thread, across notes",
      icon: "spool",
      editorCallback: (editor) => {
        this.threads.openFromCursor(editor, 1, true);
      },
    });
    this.addCommand({
      id: "screenplay-select-element",
      name: "Screenplay: Select element",
      icon: "text-select",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        if (checking) return true;
        const lines = editor.getValue().split("\n");
        const range = elementLines(lines, editor.getCursor("head").line);
        if (range === null) return true;
        editor.setSelection(
          { line: range.from, ch: 0 },
          { line: range.to, ch: (lines[range.to] ?? "").length },
        );
        return true;
      },
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
    forceCommands.forEach(([element, id, name], rank) => {
      this.addCommand({
        id: `screenplay-${id}`,
        name: paletteOrdered(`Screenplay: ${name}`, rank),
        editorCheckCallback: (checking, editor, context) => {
          if (!this.isScreenplayFile(context.file)) return false;
          const cm = (editor as { cm?: unknown }).cm;
          if (!(cm instanceof EditorView)) return false;
          if (!checking) forceElement(cm, element);
          return true;
        },
      });
    });

    // Phone keyboards have no Tab key. These commands press Tab and
    // Shift+Tab in the editor, so Smart Tab can go on the mobile toolbar.
    const smartTabCommands: [string, string, boolean][] = [
      ["screenplay-smart-tab", "Screenplay: Smart Tab", false],
      ["screenplay-smart-tab-back", "Screenplay: Smart Tab back", true],
    ];
    for (const [id, name, shiftKey] of smartTabCommands) {
      this.addExtraCommand({
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
    this.addExtraCommand({
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
    this.addExtraCommand({
      id: "screenplay-merge-with-line-below",
      name: "Screenplay: Delete and merge with line below",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        const cm = (editor as { cm?: unknown }).cm;
        if (!(cm instanceof EditorView)) return false;
        if (!checking) mergeWithLineBelow(cm);
        return true;
      },
    });
    this.addExtraCommand({
      id: "screenplay-new-scene",
      name: "Screenplay: New scene",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        if (!checking) openNewScene(this, editor);
        return true;
      },
    });
    this.addExtraCommand({
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
    this.addExtraCommand({
      id: "screenplay-parenthetical",
      name: "Screenplay: Wryly",
      editorCheckCallback: (checking, editor, context) => {
        if (!this.isScreenplayFile(context.file)) return false;
        if (!checking) openParenthetical(this, editor);
        return true;
      },
    });
    this.addExtraCommand({
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
    this.addExtraCommand({
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
      if (this.scenesOpen() || this.threadsOpen()) this.scheduleRefresh();
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

  /**
   * Two overlapping reloads (Hot Reload plus a manual one) can make
   * Obsidian build two instances of the plugin: it checks for a loaded one,
   * waits for the script, then keeps whichever it made last. The other
   * stayed loaded but untracked, so its views were never unregistered and
   * the next load stopped at "Attempting to register an existing view
   * type" (#220). Only the instance Obsidian keeps registers anything, and
   * it first unloads any earlier instance still loaded.
   */
  private claimLiveInstance(): boolean {
    const plugins = (
      this.app as unknown as { plugins?: { plugins?: Record<string, unknown> } }
    ).plugins?.plugins;
    if (plugins !== undefined && plugins[this.manifest.id] !== this) {
      return false;
    }
    const holder = window as unknown as Record<symbol, unknown>;
    const previous = holder[LIVE_INSTANCE];
    if (previous instanceof Plugin && previous !== this) previous.unload();
    holder[LIVE_INSTANCE] = this;
    this.live = true;
    return true;
  }

  onunload(): void {
    // An instance that never claimed (see claimLiveInstance) set nothing up.
    if (!this.live) return;
    this.live = false;
    const holder = window as unknown as Record<symbol, unknown>;
    if (holder[LIVE_INSTANCE] === this) delete holder[LIVE_INSTANCE];
    applyScreenplayFont(null);
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.clearProjectViewClasses();
  }

  /** Register a command that only shows with "Show all commands" on. */
  private addExtraCommand(command: Command): void {
    // addCommand prefixes the id and name in place: keep a clean copy.
    this.extraCommands.push({ ...command });
    if (this.settings.showAllCommands) {
      this.addCommand({ ...command });
      this.extraCommandsShown = true;
    }
  }

  /** Add or remove the extra commands to match the setting. */
  applyCommandVisibility(): void {
    const show = this.settings.showAllCommands;
    if (show === this.extraCommandsShown) return;
    for (const command of this.extraCommands) {
      if (show) this.addCommand({ ...command });
      else this.removeCommand(command.id);
    }
    this.extraCommandsShown = show;
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
  /**
   * Register the editor extensions, first dropping any left by an earlier
   * load. Two reloads at once (Hot Reload and a manual reload) could leave
   * a second copy; Obsidian's next reconfigure then failed ("Config merge
   * conflict") before it could note how to remove the new copy, so every
   * reload leaked another one and settings stopped redrawing editors until
   * a restart. Our own clean-up runs on unload whatever Obsidian managed.
   */
  private registerOwnEditorExtensions(extensions: Extension[]): void {
    const workspace = this.app.workspace as unknown as {
      editorExtensions?: unknown[];
    };
    const list = workspace.editorExtensions;
    const ours = (item: unknown): boolean =>
      Array.isArray(item) &&
      (item as unknown as Record<symbol, unknown>)[EXTENSIONS_TAG] === true;
    Object.defineProperty(extensions, EXTENSIONS_TAG, { value: true });
    if (Array.isArray(list)) {
      for (let index = list.length - 1; index >= 0; index -= 1) {
        if (ours(list[index])) list.splice(index, 1);
      }
      this.register(() => {
        const at = list.indexOf(extensions);
        if (at === -1) return;
        list.splice(at, 1);
        this.app.workspace.updateOptions();
      });
    }
    this.registerEditorExtension(extensions);
  }

  /**
   * registerView, first clearing a registration of the same type left by an
   * earlier copy of Scribidian that was never unloaded (#220). Otherwise
   * registerView throws and the rest of onload never runs.
   */
  private registerOwnView(
    type: string,
    creator: Parameters<Plugin["registerView"]>[1],
  ): void {
    const registry = this.viewRegistry();
    if (registry?.viewByType?.[type] !== undefined) {
      registry.unregisterView?.(type);
    }
    this.registerView(type, creator);
  }

  private viewRegistry():
    | {
        viewByType?: Record<string, unknown>;
        typeByExtension?: Record<string, string>;
        unregisterView?: (type: string) => void;
        unregisterExtensions?: (extensions: string[]) => void;
      }
    | undefined {
    return (this.app as unknown as { viewRegistry?: never }).viewRegistry;
  }

  private registerFountainExtension(): void {
    // Already opened as notes: most likely left by an earlier copy of
    // Scribidian that was never unloaded (#220). Take it over, so ours is
    // the registration that goes when Scribidian unloads.
    const registry = this.viewRegistry();
    if (registry?.typeByExtension?.fountain === "markdown") {
      registry.unregisterExtensions?.(["fountain"]);
    }
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
   * Behavior that changes typing beyond suggestions and Tab belongs to
   * script mode only. See docs/EDITOR_MODES.md for the full list.
   */
  isScriptMode(): boolean {
    return this.settings.editorLayout === "screenplay";
  }

  /** Whether a per-mode typing setting is on in the current mode. */
  typingChangeEnabled(
    change:
      | "capitalizeLineStarts"
      | "capitalizeSentences"
      | "uppercaseSluglines"
      | "uppercaseTransitions"
      | "uppercaseCharacters"
      | "highlightVariables"
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

  /** Turn strict cursor placement on or off for the current mode. */
  async toggleStrictCursor(): Promise<void> {
    const key = this.isScriptMode()
      ? "lockBlankLinesScript"
      : "lockBlankLinesPlain";
    this.settings[key] = !this.settings[key];
    await this.saveSettings();
    this.app.workspace.updateOptions();
    const mode = this.isScriptMode() ? "script" : "Fountain";
    new Notice(
      `Scribidian: strict cursor placement ${this.settings[key] ? "on" : "off"} (${mode} mode)`,
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
    this.refreshThreads();
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
      this.settings.cleanExport,
      this.settings.markCapitalsAsAction,
    ]);
    if (this.statisticsCache?.key === key) {
      return this.statisticsCache.statistics;
    }
    // Count what a clean Fountain export would hold: tasks, comments,
    // callouts and the other elements it strips don't add pages.
    const document = {
      ...parseFountain(exportedFountainSource(this, context.source, true)),
      titlePage: context.document.titlePage,
    };
    const statistics = calculateStatistics(document, {
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
    if (
      !this.settings.statusBarEnabled ||
      (!this.settings.showCurrentPage && !this.settings.showCurrentElement)
    ) {
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

  /** The page the cursor is on, counted as in a clean Fountain export. */
  private currentPage(view: MarkdownView): number {
    const source = view.editor.getValue();
    const cursor = view.editor.posToOffset(view.editor.getCursor());
    const lineEnd = source.indexOf("\n", cursor);
    const before = exportedFountainSource(
      this,
      stripObsidianFrontmatter(
        source.slice(0, lineEnd === -1 ? source.length : lineEnd),
      ),
      true,
    );
    return estimateCurrentPage(before, before.length, this.settings.pageSize);
  }

  private renderStatus(view: MarkdownView): void {
    const last = this.lastStatus;
    if (last === null || view.file !== last.file) return;
    const currentPage =
      this.settings.showCurrentPage && this.isScreenplayFile(last.file)
        ? this.currentPage(view)
        : null;
    const counts = formatScreenplayStatus(last.statistics, {
      estimatedPages: this.settings.showEstimatedPages,
      currentPage,
      estimatedRuntime: this.settings.showEstimatedRuntime,
      words: this.settings.showWordCount,
      scenes: this.settings.showSceneCount,
    });
    const element =
      this.settings.showCurrentElement && this.isScreenplayFile(last.file)
        ? this.currentElementLabel(view)
        : null;
    const status = [element, counts].filter(Boolean).join(" · ");
    this.statusBarItem?.setText(status);
    this.statusBarItem?.setAttribute(
      "aria-label",
      `Scribidian screenplay statistics: ${status}`,
    );
    this.statusBarItem?.show();
  }

  /**
   * The element the cursor is on, as the status bar shows it ("Dialogue"),
   * or null on a blank line or a line that isn't part of the script. A line
   * set to an element (Shift+Tab, Set line to…) counts as that element.
   */
  private currentElementLabel(view: MarkdownView): string | null {
    const cm = (view.editor as { cm?: unknown }).cm;
    const lines = view.editor.getValue().split("\n");
    const cursorLine = view.editor.getCursor("head").line;
    let forced: { line: number; kind: LineKind } | null = null;
    if (cm instanceof EditorView) {
      const set = cm.state.field(lineKindField, false) ?? null;
      if (set !== null) {
        forced = {
          line: cm.state.doc.lineAt(set.from).number - 1,
          kind: set.kind,
        };
      }
    }
    const kind = classifyLines(lines, { cursorLine, forced })[cursorLine];
    return kind ? (ELEMENT_LABELS[kind] ?? null) : null;
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

  /**
   * Obsidian's "Follow link" (Alt+Enter by default, or the writer's own
   * hotkey) with the cursor on, in or right next to a thread goes to the
   * next place in it, as a click on the 🧵 does. Anywhere else the command
   * works as before. Undone when Scribidian is turned off.
   */
  private followLinkOnThreads(): void {
    const registry = (
      this.app as unknown as {
        commands?: { commands?: Record<string, Command | undefined> };
      }
    ).commands?.commands;
    const command = registry?.["editor:follow-link"];
    if (!command) return;
    const original = {
      checkCallback: command.checkCallback,
      editorCheckCallback: command.editorCheckCallback,
      editorCallback: command.editorCallback,
    };
    const onThread = (checking: boolean): boolean => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const cm = (view?.editor as { cm?: unknown } | undefined)?.cm;
      if (!(cm instanceof EditorView)) return false;
      const mark = this.threads.markAtCursor(cm);
      if (mark === null) return false;
      if (!checking) void this.threads.open(cm, mark, 1, false, false);
      return true;
    };
    if (original.checkCallback) {
      const call = original.checkCallback;
      command.checkCallback = (checking) =>
        onThread(checking) || call(checking);
    }
    if (original.editorCheckCallback) {
      const call = original.editorCheckCallback;
      command.editorCheckCallback = (checking, editor, context) =>
        onThread(checking) || call(checking, editor, context);
    }
    if (original.editorCallback) {
      const call = original.editorCallback;
      command.editorCallback = (editor, context) => {
        if (!onThread(false)) void call(editor, context);
      };
    }
    this.register(() => Object.assign(command, original));
  }

  /** Open the Threads sidebar, showing thread `key` (or all of them). */
  async openThreads(key: string | null): Promise<void> {
    this.activeMarkdownView();
    let leaf: WorkspaceLeaf | null =
      this.app.workspace.getLeavesOfType(THREADS_VIEW_TYPE)[0] ?? null;
    if (leaf === null) {
      leaf = this.app.workspace.getRightLeaf(false);
      if (leaf === null) return;
      await leaf.setViewState({ type: THREADS_VIEW_TYPE, active: false });
    }
    await this.app.workspace.revealLeaf(leaf);
    if (leaf.view instanceof ThreadsView) leaf.view.select(key);
  }

  private threadsOpen(): boolean {
    return this.app.workspace.getLeavesOfType(THREADS_VIEW_TYPE).length > 0;
  }

  private refreshThreads(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(THREADS_VIEW_TYPE)) {
      if (leaf.view instanceof ThreadsView) leaf.view.refresh();
    }
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
      this.app.workspace.getActiveViewOfType(ScenesView) !== null ||
        this.app.workspace.getActiveViewOfType(ThreadsView) !== null,
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
