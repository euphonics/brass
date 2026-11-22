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

import {
  isForcedTransition,
  isMarkdownHeading,
  characterCue,
  isSceneHeading,
  isTransitionText,
  looksLikeCharacterCue,
} from "../screenplay/lines";
import { setTabMenuLine, tabCueLine, tabMenuLineField } from "./tabCueLine";
import {
  dismissedCueLineField,
  lineKindField,
  replacesWholeNote,
  setLineKind,
} from "./lineKindOverride";
import { forceElementPlan, type ForcedElement } from "./forceElement";
import { menuLineKind } from "./layoutClassifier";
import { docLineKinds, docLines } from "./docLines";
import { variableAtEnd, variableSuggestions } from "./variables";
import { mentionAtEnd, mentionText } from "./characterMentions";
import { getEnterInsidePlan, getTabInsidePlan } from "./tabInside";
import { CHARACTER_EXTENSIONS } from "../screenplay/fountain";
import {
  acceptCompletion,
  closeCompletion,
  autocompletion,
  completionStatus,
  currentCompletions,
  pickedCompletion,
  selectedCompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import {
  EditorState,
  Prec,
  StateEffect,
  StateField,
  type Extension,
  type Text,
  type Transaction,
  type TransactionSpec,
} from "@codemirror/state";
import { EditorView, keymap, tooltips } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import type ScribidianPlugin from "../main";
import { loadScreenplayContext } from "../projects/vault";
import { buildScreenplayIndex, rankUsages } from "../screenplay/indexer";
import { withListedCharacters } from "../screenplay/listedCharacters";
import { parseFountain } from "../screenplay/parser";
import { ScreenplayIndexCache, textOutsideLine } from "./indexCache";
import {
  classifySmartTabLine,
  getSmartEnterPlan,
  getSmartTabPlan,
  capitalizeLineStart,
  capitalizeSentenceStart,
  type SmartTabPlan,
} from "./smartTab";
import {
  getScreenplayCompletionPlan,
  type CompletionCandidate,
} from "./completionEngine";

/** A suggestion list asked for by a "Set line to …" command. */
const setForcedList = StateEffect.define<"scene-type" | "character" | null>();

/**
 * The forced list and the line it is for. It lasts while the cursor stays
 * on that line and the line has no space yet (a scene type or a name).
 */
const forcedListField = StateField.define<{
  kind: "scene-type" | "character";
  line: number;
} | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setForcedList)) {
        const head = tr.state.selection.main.head;
        return effect.value === null
          ? null
          : { kind: effect.value, line: tr.state.doc.lineAt(head).from };
      }
    }
    if (value === null || replacesWholeNote(tr)) return null;
    const line = tr.changes.mapPos(value.line);
    const current = tr.state.doc.lineAt(tr.state.selection.main.head);
    if (current.from !== line) return null;
    return /\s/u.test(current.text.trim()) ? null : { ...value, line };
  },
});

/** Tab inside a cue: list the extensions at this spot (after the name). */
const setExtensionList = StateEffect.define<number | null>();

/** Where Tab asked for the extension list; gone after any other change. */
const extensionListField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setExtensionList)) return effect.value;
    }
    return tr.docChanged || tr.selection ? null : value;
  },
});

/**
 * Whether line `lineNumber` (1-based) is a transition typed with lower case
 * on its own block: a short action line ending in "to:" ("cut to:", "Smash
 * cut to:"), with a blank line (or nothing) above. Up to three words, so a
 * sentence ("She walks over to:") isn't caught.
 */
function lowercaseTransitionLine(doc: Text, lineNumber: number): boolean {
  const text = doc.line(lineNumber).text.trim();
  if (!/^[\p{L}][\p{L}.'’ -]* to:$/iu.test(text)) return false;
  if (!/\p{Ll}/u.test(text) || text.split(/\s+/u).length > 3) return false;
  if (lineNumber > 1 && doc.line(lineNumber - 1).text.trim() !== "") {
    return false;
  }
  const lines = docLines(doc);
  return classifySmartTabLine(lines, lineNumber - 1) === "action";
}

/**
 * Whether the last text above line `lineNumber` is a "# heading", a
 * transition or centered text, after which a slugline (not a cue) comes.
 */
function followsHeading(doc: Text, lineNumber: number): boolean {
  for (let number = lineNumber - 1; number >= 1; number -= 1) {
    const text = doc.line(number).text.trim();
    if (text === "") continue;
    return (
      isMarkdownHeading(text) || isTransitionText(text) || /^>.*<$/u.test(text)
    );
  }
  return false;
}

/**
 * A slugline still missing its location or time: only a scene type
 * ("INT.", "I/E."), or ending in a dash ("INT. HOUSE -", "INT. -").
 */
export function isUnfinishedSlugline(text: string): boolean {
  const line = text.trim();
  if (/^(?:INT|EXT|EST|INT\.?\/EXT|I\/E)\.$/iu.test(line)) return true;
  return (
    /^(?:INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/iu.test(line) && /\s-$/u.test(line)
  );
}

/**
 * Typing on the empty line where Tab opened the character list: the writer
 * is typing a cue. Keep the line laid out as one, so a name typed in lower
 * case ("Jen", before the list's "JEN" is picked) stays in the middle
 * instead of dropping to the action margin. The same when the list is
 * empty (no characters yet) and Tab put a cue there. Shift+Tab still makes
 * it action.
 */
const keepTabCue = EditorState.transactionExtender.of((tr) => {
  if (!tr.docChanged) return null;
  const start = tr.startState;
  const marked = start.field(tabMenuLineField, false) ?? null;
  if (marked === null) return null;
  if (start.field(lineKindField, false) != null) return null;
  if (start.doc.lineAt(start.selection.main.head).from !== marked.from) {
    return null;
  }
  if (completionStatus(start) === "active") {
    const first = currentCompletions(start)[0]?.detail;
    if (menuLineKind(first) !== "character") return null;
  } else if (!marked.cue) {
    return null;
  }
  const head = tr.state.selection.main.head;
  const line = tr.state.doc.lineAt(head);
  if (line.from !== tr.changes.mapPos(marked.from)) return null;
  return {
    effects: [
      setLineKind.of({ from: line.from, kind: "character" }),
      setTabMenuLine.of(null),
    ],
  };
});

/**
 * Turn the cursor's line into `element` (a "Set line to …" command): see
 * forceElementPlan. Opens the element's suggestion list on a blank line.
 */
export function forceElement(view: EditorView, element: ForcedElement): void {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const plan = forceElementPlan(line.text, element);
  // Whatever list is open belongs to the old element: close it. The new
  // element's own list (if it has one) opens below.
  closeCompletion(view);
  // Also lay the line out as the element right away, so the cursor moves
  // to its column (a slugline at the left margin), even on a blank line or
  // one that was set to another element before.
  const layout = setLineKind.of({ from: line.from, kind: element });
  if (plan === null) {
    if (layout) view.dispatch({ effects: layout });
    return;
  }
  const forced =
    plan.complete === "scene-type" || plan.complete === "character"
      ? plan.complete
      : null;
  // Sluglines and transitions get a blank line above and below, if missing.
  const { doc } = state;
  const blankAt = (number: number) =>
    number < 1 || number > doc.lines || doc.line(number).text.trim() === "";
  const above = plan.spaced && !blankAt(line.number - 1) ? "\n" : "";
  const below = plan.spaced && !blankAt(line.number + 1) ? "\n" : "";
  const insert = `${above}${plan.text}${below}`;
  const lineStart = line.from + above.length;
  const effects: StateEffect<unknown>[] = [setForcedList.of(forced)];
  if (layout) effects.push(setLineKind.of({ from: lineStart, kind: element }));
  const start = plan.complete !== null ? startCompletionEffects(view) : [];
  view.dispatch({
    changes:
      insert === line.text
        ? undefined
        : { from: line.from, to: line.to, insert },
    selection: { anchor: lineStart + plan.cursor },
    effects: [...effects, ...(start ?? [])],
    scrollIntoView: true,
    userEvent: "input",
  });
  if (start === null) startCompletion(view);
}

/**
 * The effects startCompletion would dispatch, read without dispatching, so
 * they can go in the caller's own transaction: in a long script each extra
 * transaction costs several ms (#221). Empty when there's no
 * autocompletion to start; null when the effects can't be read, and then
 * the caller calls startCompletion after its own dispatch.
 */
function startCompletionEffects(
  view: EditorView,
): readonly StateEffect<unknown>[] | null {
  let captured: readonly StateEffect<unknown>[] | null = null;
  const probe = {
    state: view.state,
    dispatch: (spec: TransactionSpec) => {
      const { effects } = spec;
      captured =
        effects === undefined
          ? []
          : Array.isArray(effects)
            ? effects
            : [effects as StateEffect<unknown>];
    },
  };
  try {
    if (!startCompletion(probe as unknown as EditorView)) return [];
  } catch {
    return null;
  }
  return captured;
}

/** Picks made over a selected part: they don't open the next list. */
const partCompletions = new WeakSet<Completion>();

function applyCandidate(
  view: EditorView,
  completion: Completion,
  from: number,
  to: number,
  candidate: CompletionCandidate,
  overSelection = false,
): void {
  // Replacing a selected part (Tab's "Next part"): don't repeat what comes
  // right after it, like the ")" of an extension or a location's " - ".
  let cursor = from + candidate.applyText.length;
  if (overSelection) {
    const after = view.state.doc.sliceString(to, view.state.doc.lineAt(to).to);
    const text = candidate.applyText;
    for (
      let length = Math.min(text.length, after.length);
      length > 0;
      length -= 1
    ) {
      if (text.endsWith(after.slice(0, length))) {
        to += length;
        // The cursor stays at the end of the part, before a " - " it
        // shares with the next part, so the next Tab goes on to that part.
        if (/^[\s-]+$/u.test(after.slice(0, length))) cursor -= length;
        break;
      }
    }
  }
  view.dispatch({
    changes: { from, to, insert: candidate.applyText },
    selection: { anchor: cursor },
    annotations: pickedCompletion.of(completion),
    // Marks the change as a picked suggestion, so activateOnCompletion can
    // open the next list (scene type -> location -> time).
    userEvent: "input.complete",
  });
}

export function createScreenplayCompletionExtension(
  plugin: ScribidianPlugin,
): Extension {
  // Smart rebuild: reuse the suggestion index while only the current line
  // changes. Edits to other notes (e.g. other project parts) clear it.
  const indexCache = new ScreenplayIndexCache();
  plugin.registerEvent(
    plugin.app.vault.on("modify", (changed) =>
      indexCache.invalidate(changed.path),
    ),
  );
  plugin.registerEvent(
    plugin.app.vault.on("rename", () => indexCache.invalidate()),
  );
  plugin.registerEvent(
    plugin.app.vault.on("delete", () => indexCache.invalidate()),
  );

  // Typing a "$" variable: the note's variables that start with what's
  // typed, most used first. Null when the cursor isn't on one (or the note
  // has no other variables that fit).
  const variableOptions = (
    context: CompletionContext,
  ): CompletionResult | null => {
    const { state, pos } = context;
    const line = state.doc.lineAt(pos);
    const prefix = plugin.settings.variablePrefix;
    const typing = variableAtEnd(line.text.slice(0, pos - line.from), prefix);
    if (typing === null) return null;
    const from = pos - typing.typed.length - prefix.length;
    const names = variableSuggestions(
      state.doc.toString(),
      typing.typed,
      from,
      plugin.settings.maximumSuggestions,
      prefix,
    );
    if (names.length === 0) return null;
    return {
      from,
      to: pos,
      filter: false,
      options: names.map((name) => ({
        label: name,
        detail: "Variable",
        apply: (view, completion, applyFrom, applyTo) => {
          view.dispatch({
            changes: { from: applyFrom, to: applyTo, insert: name },
            selection: { anchor: applyFrom + name.length },
            annotations: pickedCompletion.of(completion),
            userEvent: "input",
          });
        },
      })),
    };
  };

  const source = async (
    context: CompletionContext,
  ): Promise<CompletionResult | null> => {
    const info = context.state.field(editorInfoField, false);
    const file = info?.file ?? null;
    if (
      !plugin.settings.autocompleteEnabled ||
      !plugin.isScreenplayFile(file) ||
      file === null
    ) {
      return null;
    }

    // Tab inside a cue with no extension: list them after the name.
    const extensionAt = context.state.field(extensionListField, false) ?? null;
    if (extensionAt !== null && extensionAt === context.pos) {
      const space = /\s$/u.test(
        context.state.doc.sliceString(
          Math.max(0, extensionAt - 1),
          extensionAt,
        ),
      )
        ? ""
        : " ";
      return {
        from: extensionAt,
        to: extensionAt,
        filter: false,
        options: CHARACTER_EXTENSIONS.map((extension) => {
          const candidate = {
            label: extension,
            applyText: `${space}${extension}`,
            detail: "Character extension",
          };
          return {
            label: extension,
            detail: candidate.detail,
            apply: (view, completion, from, to) =>
              applyCandidate(view, completion, from, to, candidate),
          };
        }),
      };
    }

    // "$": the note's other variables, wherever the cursor is.
    const variables = variableOptions(context);
    if (variables !== null) return variables;

    const editorSource = context.state.doc.toString();
    const line = context.state.doc.lineAt(context.pos);
    const outside = textOutsideLine(editorSource, line.from, line.to);
    const index = await indexCache.get(file.path, outside, async () => {
      const screenplay = await loadScreenplayContext(
        plugin.app,
        file,
        plugin.settings.characterFolder,
        outside,
      );
      return withListedCharacters(
        buildScreenplayIndex(screenplay.document),
        screenplay.listedCharacters,
      );
    });
    // A line set to an element (Set line, Shift+Tab) only gets that
    // element's list: none for centered text, only scene parts for action
    // (Escape said "no cue", not "no slugline"), scene parts at the left
    // margin, characters in the middle.
    const lineKind = context.state.field(lineKindField, false) ?? null;
    const onSetLine =
      lineKind !== null &&
      context.state.doc.lineAt(lineKind.from).from === line.from;
    if (onSetLine && lineKind.kind === "centered") return null;
    const actionLine = onSetLine && lineKind.kind === "action";
    // "+" in an action line: the characters, written as names in action.
    const mentionPrefix = plugin.settings.characterMentionPrefix;
    const mention = mentionAtEnd(
      line.text.slice(0, context.pos - line.from),
      mentionPrefix,
    );
    if (
      mention !== null &&
      (actionLine ||
        docLineKinds(context.state.doc, line.number - 1)[line.number - 1] ===
          "action")
    ) {
      const from = context.pos - mention.typed.length - mentionPrefix.length;
      const names = rankUsages(
        index.characters,
        mention.typed,
        plugin.settings.recentItemsWeighting,
        plugin.settings.maximumSuggestions,
      );
      if (names.length === 0) return null;
      return {
        from,
        to: context.pos,
        filter: false,
        options: names.map((usage) => {
          const text = mentionText(usage.value, mention.typed, editorSource);
          return {
            label: text,
            detail: "Character",
            apply: (view, completion, applyFrom, applyTo) => {
              view.dispatch({
                changes: { from: applyFrom, to: applyTo, insert: text },
                selection: { anchor: applyFrom + text.length },
                annotations: pickedCompletion.of(completion),
                userEvent: "input",
              });
            },
          };
        }),
      };
    }
    const forced =
      context.state.field(forcedListField, false) ??
      (onSetLine && lineKind.kind === "scene-heading"
        ? { kind: "scene-type" as const }
        : onSetLine && lineKind.kind === "character"
          ? { kind: "character" as const }
          : null);
    const plan = getScreenplayCompletionPlan(
      editorSource,
      context.pos,
      plugin.settings,
      context.explicit,
      undefined,
      index,
      forced?.kind,
    );
    if (!plan) return null;
    if (actionLine && plan.kind !== "character-name") {
      if (plan.kind !== "scene-type" && plan.kind !== "character") {
        return null;
      }
      plan.candidates = plan.candidates.filter(
        (candidate) => candidate.detail === "Scene type",
      );
      if (plan.candidates.length === 0) return null;
      plan.kind = "scene-type";
    }

    // A list opened over a selected part (Tab's "Next part") replaces the
    // whole part, and lists the part's current text first, so Enter keeps it.
    const selected = context.state.selection.main;
    const overSelection =
      !selected.empty &&
      plan.from <= selected.from &&
      plan.to >= selected.from &&
      plan.to <= selected.to;
    let candidates = plan.candidates;
    if (overSelection) {
      const current = context.state.doc
        .sliceString(selected.from, selected.to)
        .trim()
        .toLocaleUpperCase();
      const matches = (label: string) => {
        const value = label.trim().toLocaleUpperCase();
        return value === current || value === `(${current})`;
      };
      const kept = candidates.filter((candidate) => matches(candidate.label));
      // Not in the list (the line's own location isn't counted, or an
      // extension of the writer's own): add it, so Enter keeps it as is.
      const own = context.state.doc.sliceString(plan.from, selected.to);
      const label = own.trim().startsWith("(") ? `${own.trim()})` : own.trim();
      candidates = [
        ...(kept.length > 0
          ? kept
          : [{ label, applyText: own, detail: "Current" }]),
        ...candidates.filter((candidate) => !matches(candidate.label)),
      ];
    }

    return {
      from: plan.from,
      to: overSelection ? selected.to : plan.to,
      filter: false,
      options: candidates.map((candidate) => ({
        label: candidate.label,
        ...(candidate.displayLabel
          ? { displayLabel: candidate.displayLabel }
          : {}),
        detail: candidate.detail,
        apply: (view, completion, from, to) => {
          if (overSelection) partCompletions.add(completion);
          applyCandidate(view, completion, from, to, candidate, overSelection);
        },
      })),
    };
  };

  // Tab accepts an open suggestion; otherwise Smart Tab may insert the next
  // Fountain element. Returning false keeps Obsidian's normal Tab.
  const smartPlan = (
    view: EditorView,
    planner: typeof getSmartTabPlan = (source, cursor, knownTimes) =>
      getSmartTabPlan(source, cursor, knownTimes, plugin.settings.tabTargets),
    enabled: boolean = plugin.settings.smartTabEnabled,
    // The state to plan from: a pending edit's (see applySmartPlan).
    state: EditorState = view.state,
  ): SmartTabPlan | null => {
    if (!enabled) return null;
    const file = state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return null;
    const { selection } = state;
    if (selection.ranges.length > 1 || !selection.main.empty) return null;

    const source = state.doc.toString();
    // Only scene headings need the script's times; parse lazily. Not
    // counting the cursor's line, whose last part is the one in question
    // ("INT. HOUSE - KITCHEN" would make KITCHEN a time).
    const knownTimes = () => {
      const line = state.doc.lineAt(selection.main.head);
      const others = `${source.slice(0, line.from)}${source.slice(line.to)}`;
      return [
        ...plugin.settings.preferredTimesOfDay,
        ...buildScreenplayIndex(parseFountain(others)).timesOfDay.map(
          (usage) => usage.value,
        ),
      ];
    };
    const plan = planner(source, selection.main.head, knownTimes);
    // Setting off (Fade In): Tab at the start of dialogue with text doesn't
    // add a wryly above it.
    if (
      plan !== null &&
      !plugin.settings.tabAtDialogueStartAddsWryly &&
      plan.kind === "dialogue" &&
      plan.insert === "()\n"
    ) {
      const head = selection.main.head;
      return {
        kind: "none",
        at: head,
        insert: "",
        cursor: head,
        openCompletion: false,
      };
    }
    return plan;
  };

  // Tab at the start of an action line with text after the cursor turns
  // the line into a character, like "Set line to character". Only action;
  // other elements keep their own Tab.
  const tabAtLineStart = (view: EditorView): boolean => {
    if (!plugin.settings.smartTabEnabled) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    const indent = line.text.length - line.text.trimStart().length;
    if (line.text.trim() === "" || selection.main.head !== line.from + indent) {
      return false;
    }
    const lines = docLines(doc);
    const kind = classifySmartTabLine(lines, line.number - 1);
    // Dialogue right under a wryly: Tab does nothing (as in Fade In),
    // instead of adding another wryly between them.
    if (
      kind === "dialogue" &&
      line.number > 1 &&
      classifySmartTabLine(lines, line.number - 2) === "parenthetical"
    ) {
      return true;
    }
    if (kind !== "action") return false;
    // Only a line that can be a name ("jen", "BOB (V.O.)"). A sentence
    // ("She runs to the door.") stays action, as in Fade In, instead of
    // becoming a forced "@" cue.
    if (!looksLikeCharacterCue(line.text.trim().toLocaleUpperCase())) {
      return false;
    }
    forceElement(view, "character");
    return true;
  };

  // Tab on an empty line set to action (Backspace or Shift+Tab out of the
  // cue's column): back to the character column, with the character list.
  const tabOnSetActionLine = (view: EditorView): boolean => {
    if (!plugin.settings.smartTabEnabled) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    if (line.text.trim() !== "") return false;
    const set = view.state.field(lineKindField, false) ?? null;
    if (set === null || set.kind !== "action") return false;
    if (doc.lineAt(set.from).from !== line.from) return false;
    forceElement(view, "character");
    return true;
  };

  // Tab at the end of a wryly ("(beat|)" or "(beat)|") with dialogue right
  // under it: move to the start of that dialogue instead of adding a line.
  const tabToDialogueBelow = (view: EditorView): boolean => {
    if (!plugin.settings.smartTabEnabled) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    if (line.number >= doc.lines) return false;
    const end = line.from + line.text.trimEnd().length;
    const atEnd =
      selection.main.head === end ||
      (selection.main.head === end - 1 && line.text.trimEnd().endsWith(")"));
    if (!atEnd) return false;
    const lines = docLines(doc);
    if (classifySmartTabLine(lines, line.number - 1) !== "parenthetical") {
      return false;
    }
    if (classifySmartTabLine(lines, line.number) !== "dialogue") return false;
    const below = doc.line(line.number + 1);
    const indent = below.text.length - below.text.trimStart().length;
    // An empty "()" isn't left behind: it goes, and the cursor lands on
    // the dialogue.
    if (/^\(\s*\)$/u.test(line.text.trim())) {
      view.dispatch({
        changes: { from: line.from, to: below.from },
        selection: { anchor: line.from + indent },
        scrollIntoView: true,
        userEvent: "delete",
      });
      return true;
    }
    view.dispatch({
      selection: { anchor: below.from + indent },
      scrollIntoView: true,
      userEvent: "select",
    });
    return true;
  };

  // Tab with the cursor inside a line: the "Tab inside a line" setting.
  // True when handled, false to let Obsidian's Tab run, null when the
  // end-of-line rules apply.
  const tabInside = (view: EditorView): boolean | null => {
    if (!plugin.settings.smartTabEnabled) return null;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return null;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return null;
    const head = selection.main.head;
    const line = doc.lineAt(head);
    const lines = docLines(doc);
    const lineFroms: number[] = [];
    let offset = 0;
    for (const text of lines) {
      lineFroms.push(offset);
      offset += text.length + 1;
    }
    // The times of day the settings and the script know (sluglines only).
    // Not counting this line, whose last part is the one in question.
    let times: Set<string> | null = null;
    const isTime = (text: string): boolean => {
      const others = lines.filter((_, number) => number !== line.number - 1);
      times ??= new Set(
        [
          ...plugin.settings.preferredTimesOfDay,
          ...buildScreenplayIndex(
            parseFountain(others.join("\n")),
          ).timesOfDay.map((usage) => usage.value),
        ].map((time) => time.toLocaleUpperCase()),
      );
      return times.has(text.toLocaleUpperCase());
    };
    const plan = getTabInsidePlan(
      lines,
      line.number - 1,
      lineFroms,
      head - line.from,
      plugin.isScriptMode()
        ? plugin.settings.tabInsideScript
        : plugin.settings.tabInsidePlain,
      isTime,
    );
    if (plan === null || plan.type === "smart") return null;
    switch (plan.type) {
      case "nothing":
        return true;
      case "obsidian":
        // Obsidian's Tab, except that it never puts a tab character into
        // the script (it would indent the line): lists, tables and code
        // blocks keep it, other lines get nothing.
        return keepTabsOut(view);
      case "move":
        view.dispatch({
          selection: { anchor: plan.cursor },
          scrollIntoView: true,
          userEvent: "select",
        });
        return true;
      case "select":
        view.dispatch({
          selection: { anchor: plan.anchor, head: plan.head },
          scrollIntoView: true,
          userEvent: "select",
        });
        startCompletion(view);
        return true;
      case "extension-list":
        view.dispatch({
          selection: { anchor: plan.at },
          effects: setExtensionList.of(plan.at),
          scrollIntoView: true,
          userEvent: "select",
        });
        startCompletion(view);
        return true;
      case "end-tab": {
        view.dispatch({
          selection: { anchor: plan.cursor },
          scrollIntoView: true,
          userEvent: "select",
        });
        const smart = smartPlan(view);
        if (smart !== null) applySmartPlan(view, smart);
        return true;
      }
    }
  };

  // A list open over a selected part with the part's own text highlighted:
  // keeping it needs no change, so Tab goes straight on to the next part.
  const keepsSelectedPart = (view: EditorView): boolean => {
    const { selection, doc } = view.state;
    const main = selection.main;
    if (selection.ranges.length > 1 || main.empty) return false;
    const picked = selectedCompletion(view.state);
    if (picked === null) return false;
    const current = doc
      .sliceString(main.from, main.to)
      .trim()
      .toLocaleUpperCase();
    const label = picked.label.trim().toLocaleUpperCase();
    return label === current || label === `(${current})`;
  };

  // The wryly list open on a wryly line: "empty" in a bare "()" (nothing
  // typed yet), "pick" when a typed wryly is highlighted, else null.
  const wrylyList = (view: EditorView): "empty" | "pick" | null => {
    if (completionStatus(view.state) !== "active") return null;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return null;
    const text = doc.lineAt(selection.main.head).text.trim();
    if (!text.startsWith("(")) return null;
    if (/^\(\s*\)?$/u.test(text)) return "empty";
    return selectedCompletion(view.state)?.detail === "Wryly" ? "pick" : null;
  };

  // Tab in an empty "()" on its own block (no cue above it, e.g. after "Set
  // line to wryly"): a wryly can't stand alone, so the line becomes an
  // empty action line. Fade In makes it dialogue, which would be just as
  // stranded without a cue.
  const tabInLoneWryly = (view: EditorView): boolean => {
    if (!plugin.settings.smartTabEnabled) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    if (!/^\s*\(\s*\)\s*$/u.test(line.text)) return false;
    if (line.number > 1 && doc.line(line.number - 1).text.trim() !== "") {
      return false;
    }
    closeCompletion(view);
    view.dispatch({
      changes: { from: line.from, to: line.to },
      selection: { anchor: line.from },
      effects: setLineKind.of({ from: line.from, kind: "action" }),
      userEvent: "input",
    });
    return true;
  };

  const tab = (view: EditorView): boolean => {
    // "Tab with a list open: moves to the next element" (script mode):
    // close the list and carry on as if it weren't open.
    if (
      completionStatus(view.state) === "active" &&
      plugin.settings.tabWithListScript === "move" &&
      plugin.isScriptMode()
    ) {
      const file = view.state.field(editorInfoField, false)?.file ?? null;
      if (file !== null && plugin.isScreenplayFile(file)) {
        closeCompletion(view);
        // An empty line where a new block starts (the scene types after a
        // transition): the next element is the character column. Without
        // this, Tab would only open the same list again.
        const { selection, doc } = view.state;
        const line = doc.lineAt(selection.main.head);
        const set = view.state.field(lineKindField, false) ?? null;
        if (
          selection.ranges.length === 1 &&
          selection.main.empty &&
          line.text.trim() === "" &&
          !(set !== null && doc.lineAt(set.from).from === line.from) &&
          classifySmartTabLine(docLines(doc), line.number - 1) === "new-block"
        ) {
          forceElement(view, "character");
          return true;
        }
      }
    }
    if (tabInLoneWryly(view)) return true;
    if (completionStatus(view.state) === "active") {
      // A typed wryly: one Tab picks it and goes on to the dialogue, as in
      // Fade In.
      if (wrylyList(view) === "pick") {
        acceptCompletion(view);
        if (tabToDialogueBelow(view)) return true;
        const plan = smartPlan(view);
        if (plan !== null) applySmartPlan(view, plan);
        return true;
      }
      if (!keepsSelectedPart(view)) {
        if (acceptCompletion(view)) return true;
        // CodeMirror ignores a pick in the first moments after a list
        // opens. Tab pressed that fast (held down, or tapped quickly) must
        // not fall through to Obsidian's Tab, which indents the line.
        const file = view.state.field(editorInfoField, false)?.file ?? null;
        return file !== null && plugin.isScreenplayFile(file);
      }
      closeCompletion(view);
    }
    // Text selected on one line (a part left selected after Escape): carry
    // on from its end, instead of Obsidian's Tab indenting the whole line.
    {
      const { selection, doc } = view.state;
      const file = view.state.field(editorInfoField, false)?.file ?? null;
      const main = selection.main;
      if (
        plugin.settings.smartTabEnabled &&
        file !== null &&
        plugin.isScreenplayFile(file) &&
        selection.ranges.length === 1 &&
        !main.empty &&
        doc.lineAt(main.from).number === doc.lineAt(main.to).number
      ) {
        view.dispatch({ selection: { anchor: main.to }, userEvent: "select" });
      }
    }
    if (tabAtLineStart(view)) return true;
    if (tabOnSetActionLine(view)) return true;
    if (tabToDialogueBelow(view)) return true;
    // Under a wryly: never a second "()" (see dropEmptyWrylyAbove).
    if (plugin.settings.smartTabEnabled) {
      const underWryly = dropEmptyWrylyAbove(view);
      if (underWryly === "wryly") return true;
      if (underWryly !== null) {
        // The speech ends here: on to a new character, not another wryly.
        // One edit with the dropped "()", so one Ctrl+Z undoes it.
        const at = underWryly.state.selection.main.head;
        view.dispatch({
          changes: underWryly.changes.compose(
            underWryly.state.changes({ from: at, insert: "\n\n" }),
          ),
          selection: { anchor: at + 2 },
          scrollIntoView: true,
          userEvent: "input",
        });
        forceElement(view, "character");
        return true;
      }
    }
    const inside = tabInside(view);
    if (inside !== null) return inside;
    const plan = smartPlan(view);
    if (plan !== null) return applySmartPlan(view, plan);
    return keepTabsOut(view);
  };

  // Tab with nothing to do in a screenplay (two cursors, a selection over
  // several lines, Smart Tab off): nothing happens. Obsidian's Tab would
  // put tab characters into the script. Lists, tables and code blocks keep
  // Obsidian's Tab (indent, next cell).
  const keepTabsOut = (view: EditorView): boolean => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { doc } = view.state;
    for (const range of view.state.selection.ranges) {
      const first = doc.lineAt(range.from).number;
      const last = doc.lineAt(range.to).number;
      for (let number = first; number <= last; number += 1) {
        if (/^\s*(?:[-*+]|\d+[.)])\s|^\s*\|/u.test(doc.line(number).text)) {
          return false;
        }
      }
      if (inCodeBlock(doc, first)) return false;
    }
    return true;
  };

  // Enter with the cursor inside a line: the "Enter inside a line"
  // setting, per mode. True when handled, false to let Obsidian's Enter
  // run, null when Enter's other rules apply (start or end of a line).
  const enterInside = (view: EditorView): boolean | null => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return null;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return null;
    const head = selection.main.head;
    const line = doc.lineAt(head);
    const lines = docLines(doc);
    const lineFroms: number[] = [];
    let offset = 0;
    for (const text of lines) {
      lineFroms.push(offset);
      offset += text.length + 1;
    }
    const plan = getEnterInsidePlan(
      lines,
      line.number - 1,
      lineFroms,
      head - line.from,
      plugin.isScriptMode()
        ? plugin.settings.enterInsideScript
        : plugin.settings.enterInsidePlain,
    );
    if (plan === null) return null;
    switch (plan.type) {
      case "nothing":
        return true;
      case "obsidian":
        return false;
      case "move":
        view.dispatch({
          selection: { anchor: plan.cursor },
          scrollIntoView: true,
          userEvent: "select",
        });
        return true;
      case "line-break": {
        // Spaces at the split go: "Hi |there." gives "Hi" and "there.", not
        // "Hi " with a space left at the end of the line.
        let from = head;
        let to = head;
        while (
          from > line.from &&
          /[ \t]/u.test(doc.sliceString(from - 1, from))
        )
          from -= 1;
        while (to < line.to && /[ \t]/u.test(doc.sliceString(to, to + 1)))
          to += 1;
        // Strict, inside action: a new paragraph (blank line between), as
        // in Fade In. A plain break would only wrap the same paragraph,
        // which Shift+Enter already does.
        const insert =
          plugin.isScriptMode() &&
          plugin.typingChangeEnabled("lockBlankLines") &&
          classifySmartTabLine(lines, line.number - 1) === "action"
            ? "\n\n"
            : "\n";
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
          scrollIntoView: true,
          userEvent: "input",
        });
        return true;
      }
    }
  };

  // Plain mode, a "> transition" or "> centered <" line: a plain line
  // break. Obsidian's own Enter would continue it as a quote ("> "),
  // starting another forced transition.
  const plainBreakAfterMarker = (view: EditorView): boolean => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1) return false;
    const text = doc.lineAt(selection.main.head).text.trim();
    if (!text.startsWith(">") || /^>\s*\[!/u.test(text)) return false;
    view.dispatch(view.state.replaceSelection("\n"), {
      scrollIntoView: true,
      userEvent: "input",
    });
    return true;
  };

  // A transition typed in lower case on its own block ("cut to:"): Enter
  // puts it in capitals, so it reads as a transition, and goes on as after
  // one (a slugline), as in Fade In.
  const enterPlanner: typeof getSmartTabPlan = (source, cursor, knownTimes) =>
    getSmartEnterPlan(source, cursor, knownTimes, plugin.settings.enterTargets);

  const transitionOnEnter = (view: EditorView): boolean => {
    if (!plugin.settings.smartEnterEnabled) return false;
    if (completionStatus(view.state) === "active") return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    const text = line.text.trim();
    if (selection.main.head !== line.from + line.text.trimEnd().length) {
      return false;
    }
    if (!lowercaseTransitionLine(doc, line.number)) return false;
    const indent = line.text.length - line.text.trimStart().length;
    const before = view.state.update({
      changes: {
        from: line.from + indent,
        to: line.from + line.text.trimEnd().length,
        insert: text.toLocaleUpperCase(),
      },
      userEvent: "input",
    });
    applySmartPlan(
      view,
      smartPlan(view, enterPlanner, undefined, before.state),
      before,
    );
    return true;
  };

  // Enter at the end of a transition starts a slugline; at the end of
  // dialogue, a new speaker. An open suggestion menu keeps Enter for
  // accepting.
  const enter = (view: EditorView): boolean => {
    // Script mode, the wryly list open on a bare "()": Enter picks the
    // highlighted wryly and goes on, as with a typed one (below). With the
    // list closed, the empty-"()" rules apply.
    const emptyPick =
      plugin.isScriptMode() &&
      wrylyList(view) === "empty" &&
      selectedCompletion(view.state)?.detail === "Wryly";
    if (!emptyPick && enterInEmptyWryly(view)) return true;
    // "(beat|)" counts as the end of the wryly: step past the ")" and
    // handle Enter from there, instead of breaking the line before it.
    if (
      (completionStatus(view.state) !== "active" || !plugin.isScriptMode()) &&
      stepPastWrylyClose(view)
    ) {
      return enter(view);
    }
    if (completionStatus(view.state) !== "active") {
      if (enterOnBlankStack(view)) return true;
      if (enterOnUnfinishedSlugline(view)) return true;
      const inside = enterInside(view);
      if (inside !== null) return inside;
    }
    // Plain mode: Enter is always Obsidian's own. An open suggestion list
    // closes rather than taking the Enter (Tab or a tap accepts it).
    // Strict still keeps a speech whole, as in script mode.
    if (!plugin.isScriptMode()) {
      if (completionStatus(view.state) !== null) closeCompletion(view);
      if (enterOnBlankStack(view)) return true;
      if (enterOnUnfinishedSlugline(view)) return true;
      if (enterInsideSpeech(view)) return true;
      if (blankLineInSpeech(view)) return true;
      if (
        plugin.typingChangeEnabled("lockBlankLines") &&
        enterOnEmptyDialogue(view, true)
      ) {
        return true;
      }
      return plainBreakAfterMarker(view);
    }
    if (transitionOnEnter(view)) return true;
    // The wryly list on a typed wryly or a bare "()": Enter picks it and
    // goes on, in one press (as in Fade In). A pick CodeMirror refuses
    // (pressed in the list's first moments) leaves the "()" as it is.
    const wryly = wrylyList(view);
    if (emptyPick) {
      if (!acceptCompletion(view)) return true;
    } else if (wryly === "pick") acceptCompletion(view);
    else if (completionStatus(view.state) === "active") return false;
    const dropped = plugin.settings.smartEnterEnabled
      ? dropEmptyWrylyAbove(view)
      : null;
    if (dropped !== null && dropped !== "wryly") {
      applySmartPlan(
        view,
        smartPlan(view, enterPlanner, true, dropped.state),
        dropped,
      );
      return true;
    }
    if (enterOnEmptyDialogue(view)) return true;
    if (enterInsideSpeech(view)) return true;
    if (blankLineInSpeech(view)) return true;
    const plan = smartPlan(
      view,
      (source, cursor, knownTimes) =>
        getSmartEnterPlan(
          source,
          cursor,
          knownTimes,
          plugin.settings.enterTargets,
        ),
      plugin.settings.smartEnterEnabled,
    );
    return plan !== null && applySmartPlan(view, plan);
  };

  // The cursor right before the ")" that closes a wryly ("(beat|)") or a
  // cue's extension ("BOB (V.O.|)"): move it past the ")". True when it
  // moved.
  const stepPastWrylyClose = (view: EditorView): boolean => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    const text = line.text.trimEnd();
    if (!text.endsWith(")") || text.trim() === "()") return false;
    const end = line.from + text.length;
    if (selection.main.head !== end - 1) return false;
    const kind = classifySmartTabLine(docLines(doc), line.number - 1);
    if (kind !== "parenthetical" && kind !== "character") return false;
    view.dispatch({ selection: { anchor: end }, userEvent: "select" });
    return true;
  };

  // Enter on an empty "()" (cursor anywhere on it; list closed, or any
  // list in plain mode; script mode with the wryly list open picks from
  // it instead, see enter): the empty wryly never stays behind. With more of the speech
  // below, the "()" line goes and the cursor moves to that line. Under a
  // cue, the line becomes the dialogue line (as in Fade In). After
  // dialogue, the "()" goes and Enter carries on from the end of the
  // dialogue (a new character, in script mode).
  const enterInEmptyWryly = (view: EditorView): boolean => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    if (!/^\(\s*\)$/u.test(line.text.trim()) || line.number === 1) return false;
    const lines = docLines(doc);
    if (classifySmartTabLine(lines, line.number - 1) !== "parenthetical") {
      return false;
    }
    if (completionStatus(view.state) !== null) closeCompletion(view);
    const next = line.number < doc.lines ? doc.line(line.number + 1) : null;
    if (next !== null && next.text.trim() !== "") {
      const indent = next.text.length - next.text.trimStart().length;
      view.dispatch({
        changes: { from: line.from, to: next.from },
        selection: { anchor: line.from + indent },
        scrollIntoView: true,
        userEvent: "delete",
      });
      return true;
    }
    const above = doc.line(line.number - 1);
    const kinds = docLineKinds(doc, line.number - 1);
    if (
      kinds[line.number - 2] !== "character" &&
      plugin.isScriptMode() &&
      plugin.settings.smartEnterEnabled &&
      above.text.trim() !== ""
    ) {
      // One edit with the new line, so one Ctrl+Z undoes the key press.
      const before = view.state.update({
        changes: { from: above.to, to: line.to },
        selection: { anchor: above.to },
        scrollIntoView: true,
        userEvent: "delete",
      });
      applySmartPlan(
        view,
        smartPlan(view, enterPlanner, true, before.state),
        before,
      );
      return true;
    }
    view.dispatch({
      changes: { from: line.from, to: line.to },
      selection: { anchor: line.from },
      scrollIntoView: true,
      userEvent: "delete",
    });
    return true;
  };

  // Strict: Enter on an empty line, or at the start of a line, that already
  // has a blank line above does nothing. The line is already where the
  // next element goes; another Enter would only stack blank lines.
  const enterOnBlankStack = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    if (line.number === 1) return false;
    const textStart =
      line.from + (line.text.length - line.text.trimStart().length);
    if (selection.main.head > textStart && line.text.trim() !== "") {
      return false;
    }
    if (doc.line(line.number - 1).text.trim() !== "") return false;
    if (inCodeBlock(doc, line.number)) return false;
    // At the start of an action paragraph: the paragraph moves down with
    // the cursor, leaving an empty action above it (as in Fade In).
    if (
      line.text.trim() !== "" &&
      docLineKinds(doc, line.number - 1)[line.number - 1] === "action"
    ) {
      view.dispatch({
        changes: { from: line.from, insert: "\n\n" },
        selection: { anchor: selection.main.head + 2 },
        scrollIntoView: true,
        userEvent: "input",
      });
    }
    return true;
  };

  // Strict: Enter at the end of an unfinished slugline ("INT.", "INT. ",
  // "INT. HOUSE - ") does nothing, so it isn't left unfinished.
  const enterOnUnfinishedSlugline = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    if (selection.main.head < line.from + line.text.trimEnd().length) {
      return false;
    }
    return isUnfinishedSlugline(line.text);
  };

  // Strict cursor placement: Enter at the end of a cue, wryly or dialogue
  // line with more of the speech right below adds no line. A new block
  // there would cut the speech in two (the rest would become action).
  // After a cue the cursor moves to the line below, or (setting off, as
  // in Fade In) a new empty dialogue line goes right under the cue; after
  // a wryly the cursor moves to the dialogue below; after dialogue it
  // stays.
  const enterInsideSpeech = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    const end = line.from + line.text.trimEnd().length;
    // "(beat|)" counts as the end of the wryly.
    const beforeBracket =
      selection.main.head === end - 1 && line.text.trimEnd().endsWith(")");
    if (selection.main.head < end && !beforeBracket) return false;
    if (line.number >= doc.lines) return false;
    if (doc.line(line.number + 1).text.trim() === "") return false;
    const kinds = docLineKinds(doc, line.number - 1);
    const kind = kinds[line.number - 1];
    const below = kinds[line.number];
    const speech = ["character", "parenthetical", "dialogue"];
    if (
      !speech.includes(kind ?? "") ||
      (below !== "parenthetical" && below !== "dialogue")
    ) {
      return false;
    }
    // At the end of a cue: a new empty dialogue line under it, holding two
    // spaces so Fountain keeps the speech whole (a truly empty line would
    // end it). One edit, so one Ctrl+Z undoes it.
    if (kind === "character" && !plugin.settings.enterAfterCueMovesDown) {
      view.dispatch({
        changes: { from: end, to: line.to, insert: "\n  " },
        selection: { anchor: end + 3 },
        scrollIntoView: true,
        userEvent: "input",
      });
      return true;
    }
    // At the end of a cue, or of a wryly, the cursor goes on to the start
    // of the line below, as in Final Draft.
    if (
      kind === "character" ||
      (kind === "parenthetical" && below === "dialogue")
    ) {
      const next = doc.line(line.number + 1);
      view.dispatch({
        selection: {
          anchor: next.from + (next.text.length - next.text.trimStart().length),
        },
        scrollIntoView: true,
        userEvent: "select",
      });
    }
    return true;
  };

  // Strict cursor placement: Enter at the start of a dialogue or wryly line
  // in the middle of a speech adds an empty dialogue line above it, as in
  // Fade In. In Fountain that line holds two spaces, so the speech goes on
  // past it (a truly empty line would end it).
  const blankLineInSpeech = (view: EditorView): boolean => {
    if (!plugin.typingChangeEnabled("lockBlankLines")) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    const textStart =
      line.from + (line.text.length - line.text.trimStart().length);
    if (line.text.trim() === "" || selection.main.head > textStart)
      return false;
    if (line.number === 1) return false;
    const kinds = docLineKinds(doc, line.number - 1);
    const kind = kinds[line.number - 1];
    const above = kinds[line.number - 2];
    if (kind !== "dialogue" && kind !== "parenthetical") return false;
    // Right under a cue or a wryly: nothing. An empty line there would sit
    // between the cue or wryly and its dialogue (under a cue, Fountain
    // would no longer read the cue as one).
    if (above === "character") return true;
    if (kind === "dialogue" && above === "parenthetical") return true;
    if (above !== "dialogue" && above !== "parenthetical") return false;
    view.dispatch({
      changes: { from: line.from, insert: "  \n" },
      selection: { anchor: line.from + 2 },
      scrollIntoView: true,
      userEvent: "input",
    });
    return true;
  };

  // The empty line under a wryly, where its dialogue goes. Under an empty
  // "()" (Enter there leaves the cursor on this line) the wryly is dropped
  // with this line, and the cursor goes to the end of the line above it,
  // so Tab or Enter carry on from there: that edit is returned, not yet
  // dispatched, so the caller's next step joins it (one undo). Under a
  // wryly with text: "wryly" (its dialogue must be typed). Otherwise null.
  const dropEmptyWrylyAbove = (
    view: EditorView,
  ): Transaction | "wryly" | null => {
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return null;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return null;
    const line = doc.lineAt(selection.main.head);
    if (line.text.trim() !== "" || line.number < 3) return null;
    const lines = docLines(doc);
    if (classifySmartTabLine(lines, line.number - 2) !== "parenthetical") {
      return null;
    }
    const wryly = doc.line(line.number - 1);
    if (!/^\(\s*\)$/u.test(wryly.text.trim())) return "wryly";
    const before = doc.line(line.number - 2);
    if (before.text.trim() === "") return null;
    return view.state.update({
      changes: { from: before.to, to: line.to },
      selection: { anchor: before.to },
      scrollIntoView: true,
      userEvent: "delete",
    });
  };

  // Enter on the empty dialogue line under a cue or wryly does nothing:
  // a cue needs its dialogue, so there is no valid line to start yet. Type
  // the dialogue, or Backspace (back to the cue) or Shift+Tab (action).
  // In Fountain mode (`always`) it applies with strict on, whatever Smart
  // Enter says.
  const enterOnEmptyDialogue = (view: EditorView, always = false): boolean => {
    if (!always && !plugin.settings.smartEnterEnabled) return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { selection, doc } = view.state;
    if (selection.ranges.length > 1 || !selection.main.empty) return false;
    const line = doc.lineAt(selection.main.head);
    if (line.text.trim() !== "" || line.number === 1) return false;
    const kinds = docLineKinds(doc, line.number - 1);
    return kinds[line.number - 1] === "dialogue";
  };

  // Shift+Enter: a plain line break, e.g. to continue the same speech. The
  // new line is the same element as the line the cursor was on (dialogue
  // stays in the dialogue column), even where an empty line would
  // otherwise read as action.
  const shiftEnter = (view: EditorView): boolean => {
    if (!plugin.isScriptMode()) return false;
    if (completionStatus(view.state) === "active") return false;
    const file = view.state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return false;
    const { state } = view;
    const line = state.doc.lineAt(state.selection.main.head);
    const override = state.field(lineKindField, false) ?? null;
    // The writer's choice for the line wins (Set line to, Tab's cue
    // column). Otherwise the element is read after the split, from the
    // part left above: "CHARACTER|Test." is a cue once "Test." moves down.
    const chosen =
      override !== null && override.from === line.from
        ? override.kind
        : inCueColumn(state, line.from)
          ? "character"
          : null;
    view.dispatch(state.replaceSelection("\n"), {
      scrollIntoView: true,
      userEvent: "input",
    });
    if (state.selection.ranges.length !== 1) return true;
    const next = view.state.doc.lineAt(view.state.selection.main.head);
    const kind =
      chosen ??
      docLineKinds(view.state.doc, next.number - 2)[next.number - 2] ??
      null;
    if (kind === null) return true;
    // A new cue line holds a name: in capitals, like typing in that column.
    const upper = next.text.toLocaleUpperCase();
    const changes =
      kind === "character" &&
      plugin.typingChangeEnabled("uppercaseCharacters") &&
      upper !== next.text &&
      upper.length === next.text.length
        ? { from: next.from, to: next.to, insert: upper }
        : undefined;
    view.dispatch({
      changes,
      effects: setLineKind.of({ from: next.from, kind }),
    });
    return true;
  };

  // `before`: an edit not yet dispatched that the plan was made after (see
  // smartPlan's `state`). Both go in as one transaction, so one Ctrl+Z
  // undoes the whole key press. A null plan dispatches `before` alone.
  const applySmartPlan = (
    view: EditorView,
    plan: SmartTabPlan | null,
    before?: Transaction,
  ): boolean => {
    if (plan === null) {
      if (before !== undefined) view.dispatch(before);
      return before !== undefined;
    }
    const openList = !plan.forceAfter && plan.openCompletion;
    // A new block: remember the line, so typing a cue there keeps the
    // cue's column (see keepTabCue), even with no characters to list.
    const menuLine = (doc: Text, head: number): StateEffect<unknown>[] => {
      if (
        plan.kind !== "new-block" &&
        plan.kind !== "under-block" &&
        plan.kind !== "action"
      ) {
        return [];
      }
      const line = doc.lineAt(head);
      return line.text.trim() === ""
        ? [
            setTabMenuLine.of({
              from: line.from,
              cue: !followsHeading(doc, line.number),
            }),
          ]
        : [];
    };
    if (plan.insert) {
      const change = {
        from: plan.replaceFrom ?? plan.at,
        to: plan.at,
        insert: plan.insert,
      };
      const changes =
        before === undefined
          ? view.state.changes(change)
          : before.changes.compose(before.state.changes(change));
      // The list's effects go in the insert's own transaction: in a long
      // script each extra transaction costs several ms (#221).
      const start = openList ? startCompletionEffects(view) : [];
      const effects = openList
        ? [
            ...menuLine(changes.apply(view.state.doc), plan.cursor),
            ...(start ?? []),
          ]
        : [];
      view.dispatch({
        changes,
        selection: { anchor: plan.cursor },
        effects,
        scrollIntoView: true,
        userEvent: "input",
      });
      if (start === null) startCompletion(view);
      if (plan.forceAfter) forceElement(view, plan.forceAfter);
      return true;
    }
    if (before !== undefined) view.dispatch(before);
    if (plan.forceAfter) forceElement(view, plan.forceAfter);
    else if (openList) {
      const { state } = view;
      const effects = menuLine(state.doc, state.selection.main.head);
      if (effects.length > 0) view.dispatch({ effects });
      startCompletion(view);
    }
    return true;
  };

  // Transitions are all caps: typing on a "> ..." line is uppercased.
  // Line numbers are 1-based; frontmatter is "---" ... "---" at the top.
  const inFrontmatter = (doc: Text, lineNumber: number): boolean => {
    if (doc.line(1).text.trim() !== "---") return false;
    for (
      let number = 2;
      number <= Math.min(doc.lines, lineNumber);
      number += 1
    ) {
      if (doc.line(number).text.trim() === "---") return lineNumber <= number;
    }
    return true;
  };

  // Inside a ``` or ~~~ fenced code block? Only checked for the first
  // letter of a line, so the scan up to that line is rare and cheap.
  const inCodeBlock = (doc: Text, lineNumber: number): boolean => {
    let open = false;
    for (let number = 1; number < lineNumber; number += 1) {
      if (/^\s*(?:```|~~~)/u.test(doc.line(number).text)) open = !open;
    }
    return open;
  };

  // The line starting at `from` is laid out as a character cue: set to one
  // ("Set line to character", or Tab's cue once typing starts), or the empty
  // line where Tab just put a cue.
  const inCueColumn = (state: EditorState, from: number): boolean => {
    const forced = state.field(lineKindField, false) ?? null;
    if (forced !== null && forced.from === from) {
      return forced.kind === "character";
    }
    return tabCueLine(state) === from;
  };

  // Typing at `at` on a cue the script already reads as one: a name in
  // capitals on its own line (blank line or the top above), with text right
  // below. "HELIOS|" + "test" stays a cue as "HELIOSTEST" instead of turning
  // into action with its dialogue. Not inside the extension's brackets,
  // which may be lower case ("(v.o.)").
  const typingOnCue = (doc: Text, at: number): boolean => {
    const line = doc.lineAt(at);
    if (line.number >= doc.lines) return false;
    if (line.number > 1 && doc.line(line.number - 1).text.trim() !== "") {
      return false;
    }
    if (doc.line(line.number + 1).text.trim() === "") return false;
    if (line.text.slice(0, at - line.from).includes("(")) return false;
    if (!looksLikeCharacterCue(line.text)) return false;
    return !inFrontmatter(doc, line.number) && !inCodeBlock(doc, line.number);
  };

  const uppercaseTransitions = EditorState.transactionFilter.of((tr) => {
    const pasted = tr.isUserEvent("input.paste");
    if (!tr.docChanged || (!tr.isUserEvent("input.type") && !pasted)) {
      return tr;
    }
    // Leave text alone while a phone keyboard is composing a word: changing
    // it mid-composition makes the keyboard duplicate or garble letters.
    if (tr.isUserEvent("input.type.compose")) return tr;
    const file = tr.startState.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return tr;
    const fixes: { from: number; to: number; insert: string }[] = [];
    const sluglines = new Set<number>();
    tr.changes.iterChanges((fromA, _toA, fromB, toB, inserted) => {
      const text = inserted.toString();
      const line = tr.newDoc.lineAt(fromB);
      // A name pasted on a line in the character column is a cue too. Other
      // pasted text is left as it is.
      if (pasted) {
        if (
          plugin.typingChangeEnabled("uppercaseCharacters") &&
          !text.includes("\n") &&
          inCueColumn(tr.startState, tr.startState.doc.lineAt(fromA).from)
        ) {
          const upper = text.toLocaleUpperCase();
          if (upper !== text && upper.length === text.length) {
            fixes.push({ from: fromB, to: toB, insert: upper });
          }
        }
        return;
      }
      // The first letter typed on a blank dialogue line ("  ", see
      // blankLineInSpeech) replaces the two spaces that kept it in the speech.
      // Only inside a speech: elsewhere leading spaces indent action.
      const before = tr.startState.doc.lineAt(fromA);
      if (
        /^ {2,}$/u.test(before.text) &&
        fromA === before.to &&
        text.trim() &&
        docLineKinds(tr.startState.doc)[before.number - 1] === "dialogue"
      ) {
        fixes.push({
          from: line.from,
          to: line.from + before.text.length,
          insert: "",
        });
      }
      // Uppercase a scene heading as it is typed (setting). The whole line,
      // so "int." becomes "INT." when the period makes it a heading. Only
      // letters that change are replaced, so the cursor stays put.
      if (
        plugin.typingChangeEnabled("uppercaseSluglines") &&
        isSceneHeading(line.text) &&
        !inFrontmatter(tr.newDoc, line.number) &&
        !inCodeBlock(tr.newDoc, line.number)
      ) {
        if (!sluglines.has(line.number)) {
          sluglines.add(line.number);
          [...line.text].reduce((offset, character) => {
            const upper = character.toLocaleUpperCase();
            if (upper !== character && upper.length === character.length) {
              fixes.push({
                from: line.from + offset,
                to: line.from + offset + character.length,
                insert: upper,
              });
            }
            return offset + character.length;
          }, 0);
        }
        return;
      }
      // The ":" that makes a lower-case line on its own block a transition
      // ("cut to:"): the line goes into capitals, as a slugline does at
      // "int.".
      if (
        text.endsWith(":") &&
        toB === line.from + line.text.trimEnd().length &&
        plugin.typingChangeEnabled("uppercaseTransitions") &&
        lowercaseTransitionLine(tr.newDoc, line.number)
      ) {
        // Only letters that change are replaced, so the cursor stays put.
        [...line.text].reduce((offset, character) => {
          const upper = character.toLocaleUpperCase();
          if (upper !== character && upper.length === character.length) {
            fixes.push({
              from: line.from + offset,
              to: line.from + offset + character.length,
              insert: upper,
            });
          }
          return offset + character.length;
        }, 0);
        return;
      }
      // A line in the character column is a cue: uppercase what is typed
      // there, even a name the script doesn't have yet.
      if (
        plugin.typingChangeEnabled("uppercaseCharacters") &&
        (inCueColumn(tr.startState, tr.startState.doc.lineAt(fromA).from) ||
          typingOnCue(tr.startState.doc, fromA))
      ) {
        const upper = text.toLocaleUpperCase();
        if (upper !== text && upper.length === text.length) {
          fixes.push({ from: fromB, to: toB, insert: upper });
        }
        return;
      }
      // Capitalize the first letter typed on a line (setting), outside
      // the frontmatter.
      if (plugin.typingChangeEnabled("capitalizeLineStarts")) {
        const capital = capitalizeLineStart(
          tr.newDoc.sliceString(line.from, fromB),
          text,
        );
        if (
          capital !== null &&
          !inFrontmatter(tr.newDoc, line.number) &&
          !inCodeBlock(tr.newDoc, line.number)
        ) {
          fixes.push({ from: fromB, to: toB, insert: capital });
          return;
        }
      }
      // Capitalize the first letter of a sentence inside a line (setting).
      if (!pasted && plugin.typingChangeEnabled("capitalizeSentences")) {
        const capital = capitalizeSentenceStart(
          tr.newDoc.sliceString(line.from, fromB),
          text,
        );
        if (
          capital !== null &&
          !inFrontmatter(tr.newDoc, line.number) &&
          !inCodeBlock(tr.newDoc, line.number)
        ) {
          fixes.push({ from: fromB, to: toB, insert: capital });
          return;
        }
      }
      const upper = text.toLocaleUpperCase();
      if (upper === text || upper.length !== text.length) return;
      if (!plugin.typingChangeEnabled("uppercaseTransitions")) return;
      if (!isForcedTransition(line.text)) return;
      fixes.push({ from: fromB, to: toB, insert: upper });
    });
    return fixes.length === 0 ? tr : [tr, { changes: fixes, sequential: true }];
  });

  // The cursor on an empty line laid out in the character column (e.g. the
  // next cue's line after a speech, reached by deleting back to it): mark
  // it as a cue line and open the character list, as Tab does. Otherwise
  // the line looks like a cue but typing on it makes action, with no list
  // and no capitals.
  const cueColumnMenu = EditorView.updateListener.of((update) => {
    if (!update.docChanged && !update.selectionSet) return;
    const emptyCueLine = (state: EditorState): number | null => {
      if (!plugin.isScriptMode()) return null;
      const file = state.field(editorInfoField, false)?.file ?? null;
      if (file === null || !plugin.isScreenplayFile(file)) return null;
      const { selection, doc } = state;
      if (selection.ranges.length > 1 || !selection.main.empty) return null;
      const line = doc.lineAt(selection.main.head);
      if (line.text.trim() !== "" || tabCueLine(state) !== null) return null;
      const forced = state.field(lineKindField, false) ?? null;
      if (forced !== null && forced.from === line.from) {
        return forced.kind === "character" ? line.from : null;
      }
      // The writer already said "not a cue" here (Escape, Shift+Tab): keep
      // the line action instead of reopening the list.
      if (state.field(dismissedCueLineField, false) === line.from) {
        const view = update.view;
        window.setTimeout(() => {
          const now = view.state;
          if (now.doc.lineAt(now.selection.main.head).from !== line.from) {
            return;
          }
          view.dispatch({
            effects: setLineKind.of({ from: line.from, kind: "action" }),
          });
        }, 0);
        return null;
      }
      const kinds = docLineKinds(doc, line.number - 1);
      return kinds[line.number - 1] === "character" ? line.from : null;
    };
    // A cue whose text was just deleted (e.g. Ctrl+Backspace): the line
    // stays where the cue goes, so it stays a cue line.
    const clearedCue = (): number | null => {
      if (!update.docChanged || !plugin.isScriptMode()) return null;
      const { state, startState } = update;
      if (state.selection.ranges.length > 1 || !state.selection.main.empty) {
        return null;
      }
      const line = state.doc.lineAt(state.selection.main.head);
      if (line.text.trim() !== "" || tabCueLine(state) !== null) return null;
      const old = startState.doc.lineAt(startState.selection.main.head);
      if (old.text.trim() === "") return null;
      if (update.changes.mapPos(old.from, -1) !== line.from) return null;
      const kinds = docLineKinds(startState.doc, old.number - 1);
      return kinds[old.number - 1] === "character" ? line.from : null;
    };
    const from = emptyCueLine(update.state) ?? clearedCue();
    if (from === null) return;
    const view = update.view;
    window.setTimeout(() => {
      const { state } = view;
      if (state.selection.ranges.length > 1) return;
      const line = state.doc.lineAt(state.selection.main.head);
      if (line.from !== from || line.text.trim() !== "") return;
      if (tabCueLine(state) !== null) return;
      view.dispatch({ effects: setTabMenuLine.of({ from, cue: true }) });
      if (completionStatus(view.state) === null) startCompletion(view);
    }, 0);
  });

  // Deleting back into an empty part reopens its list, as Tab does going
  // forward: a bare "()" (wrylies), "INT. |" (locations), "INT. CAR - |"
  // (times), "JEN (|" (extensions).
  const partListAfterDelete = EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    if (!update.transactions.some((tr) => tr.isUserEvent("delete"))) return;
    const { state } = update;
    const file = state.field(editorInfoField, false)?.file ?? null;
    if (file === null || !plugin.isScreenplayFile(file)) return;
    if (state.selection.ranges.length > 1 || !state.selection.main.empty) {
      return;
    }
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    const before = line.text.slice(0, head - line.from);
    const after = line.text.slice(head - line.from);
    const emptyPart =
      (/^\s*\($/u.test(before) && /^\)\s*$/u.test(after)) ||
      (after.trim() === "" &&
        isSceneHeading(line.text.trim()) &&
        (/^\S+\s+$/u.test(before) || / - $/u.test(before))) ||
      (after.trim() === "" &&
        / \($/u.test(before) &&
        characterCue(before.slice(0, -1)) !== null);
    if (!emptyPart) return;
    const view = update.view;
    window.setTimeout(() => {
      if (view.state.selection.main.head !== head) return;
      if (completionStatus(view.state) === null) startCompletion(view);
    }, 0);
  });

  return [
    forcedListField,
    extensionListField,
    tabMenuLineField,
    keepTabCue,
    cueColumnMenu,
    partListAfterDelete,
    uppercaseTransitions,
    // Before autocompletion, so plain mode's Enter runs ahead of the
    // suggestion list's own Enter.
    Prec.highest(
      keymap.of([
        { key: "Tab", run: tab },
        { key: "Enter", run: enter },
        { key: "Shift-Enter", run: shiftEnter },
      ]),
    ),
    // Typing ")" right before the ")" that closes a wryly or an extension
    // ("(beat|)", "JEN (V.O.|)") steps over it, as in Fade In, instead of
    // leaving "(beat))". Tab's "()" isn't one of CodeMirror's own brackets,
    // so its bracket closing doesn't do this.
    EditorView.inputHandler.of((view, from, to, text) => {
      if (text !== ")" || from !== to) return false;
      const { state } = view;
      if (state.selection.ranges.length > 1) return false;
      const file = state.field(editorInfoField, false)?.file ?? null;
      if (file === null || !plugin.isScreenplayFile(file)) return false;
      const line = state.doc.lineAt(from);
      const after = line.text.slice(from - line.from);
      if (after.trimEnd() !== ")") return false;
      const before = line.text.slice(0, from - line.from);
      if (!before.includes("(") || before.includes(")")) return false;
      view.dispatch({ selection: { anchor: from + 1 }, userEvent: "select" });
      return true;
    }),
    // Suggestion lists fit inside the editor pane, so one opened near the
    // right edge (a transition) moves left instead of being cut off.
    tooltips({
      tooltipSpace: (view) => view.scrollDOM.getBoundingClientRect(),
    }),
    autocompletion({
      activateOnTyping: true,
      // Keep the slugline flowing: scene type -> location -> time.
      // Not after a pick over a selected part: the next part is already
      // there, and Tab goes on to it.
      activateOnCompletion: (completion) =>
        !partCompletions.has(completion) &&
        (completion.detail === "Location" ||
          completion.detail === "Scene type"),
      maxRenderedOptions: 20,
    }),
    EditorState.languageData.of(() => [{ autocomplete: source }]),
  ];
}
