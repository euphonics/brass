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

import { Prec, RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from "@codemirror/view";
import { findThreads, type ThreadMark } from "../screenplay/threads";
import type { ThreadDisplay } from "../settings/settings";

/*
 * Threads in the editor: each `[&name]` shows as a small 🧵. Click: the next
 * place in this note (Shift+click: the previous one). Alt+click: the next
 * place in the project and linked notes. Ctrl/Cmd+click: the thread in
 * the Threads panel. With the cursor in it or right next to
 * it, the text shows (faded) so the name can be read and edited.
 */

/** The thread settings the editor reads (#298). */
export interface ThreadOptions {
  enabled: boolean;
  display: ThreadDisplay;
}

/** What a click on a thread asks for. */
export type OpenThread = (
  view: EditorView,
  mark: ThreadMark,
  step: 1 | -1,
  /** Ctrl/Cmd+click: show the thread in the Threads panel. */
  panel: boolean,
  across: boolean,
) => void;

class ThreadWidget extends WidgetType {
  constructor(
    private readonly mark: ThreadMark,
    private readonly open: OpenThread,
    private readonly display: ThreadDisplay,
  ) {
    super();
  }

  eq(other: ThreadWidget): boolean {
    return (
      other.mark.from === this.mark.from &&
      other.mark.to === this.mark.to &&
      other.mark.name === this.mark.name &&
      other.mark.alias === this.mark.alias &&
      other.mark.hidden === this.mark.hidden &&
      other.display === this.display
    );
  }

  toDOM(view: EditorView): HTMLElement {
    // The spool, then the thread's text: "[&gun|the pistol]" shows its
    // alias (part of the script, #289); "[&gun]" shows its name in the
    // thread color (#293); "[&gun|]" shows the spool only (#295). The
    // Thread text setting puts the text after or before the spool, or
    // hides it (#298).
    const textShown = !this.mark.hidden && this.display !== "icon";
    const el = createSpan({
      cls: textShown
        ? `scribidian-thread scribidian-thread-with-text scribidian-thread-${this.display}`
        : "scribidian-thread",
    });
    const spool = (): void => {
      el.createSpan({ cls: "scribidian-thread-spool", text: "🧵" });
    };
    if (!textShown || this.display === "left") spool();
    if (!textShown) {
      // Nothing but the spool.
    } else if (this.mark.alias !== undefined) {
      el.createSpan({ cls: "scribidian-thread-alias", text: this.mark.alias });
    } else {
      el.createSpan({ cls: "scribidian-thread-name", text: this.mark.name });
    }
    if (textShown && this.display === "right") spool();
    el.setAttribute("aria-label", `Thread: ${this.mark.name}`);
    el.setAttribute(
      "title",
      `${this.mark.name} (click: next in this note, Shift+click: previous, Alt+click: next in the project and linked notes, Ctrl/Cmd+click: Threads panel)`,
    );
    el.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      // The mark's place now, in case the text moved since it was drawn.
      const at = view.posAtDOM(el);
      const mark =
        findThreads(view.state.doc.lineAt(at).text)
          .map((found) => ({
            ...found,
            from: found.from + view.state.doc.lineAt(at).from,
            to: found.to + view.state.doc.lineAt(at).from,
          }))
          .find((found) => found.from === at) ?? this.mark;
      this.open(
        view,
        mark,
        event.shiftKey ? -1 : 1,
        event.ctrlKey || event.metaKey,
        event.altKey,
      );
    });
    return el;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

/** Every thread in the visible part of the note, as offsets in the note. */
function visibleThreads(view: EditorView): ThreadMark[] {
  const marks: ThreadMark[] = [];
  for (const { from, to } of view.visibleRanges) {
    const start = view.state.doc.lineAt(from);
    const end = view.state.doc.lineAt(to);
    const text = view.state.doc.sliceString(start.from, end.to);
    for (const mark of findThreads(text)) {
      marks.push({
        ...mark,
        from: mark.from + start.from,
        to: mark.to + start.from,
      });
    }
  }
  return marks;
}

/**
 * Show threads as 🧵 in every note (they're rare outside scripts). With
 * threads off (#298) nothing is drawn: "[&name]" is plain text.
 */
export function createThreadExtension(
  open: OpenThread,
  options: () => ThreadOptions,
): Extension {
  const raw = Decoration.mark({ class: "scribidian-thread-text" });
  const build = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const { enabled, display } = options();
    if (!enabled) return builder.finish();
    const ranges = view.state.selection.ranges;
    let last = -1;
    for (const mark of visibleThreads(view)) {
      if (mark.from < last) continue;
      last = mark.to;
      // The cursor in it or right next to it (or a selection over it):
      // show the text, to read the name or edit it.
      const editing = ranges.some(
        (range) => range.from <= mark.to && range.to >= mark.from,
      );
      builder.add(
        mark.from,
        mark.to,
        editing
          ? raw
          : Decoration.replace({
              widget: new ThreadWidget(mark, open, display),
            }),
      );
    }
    return builder.finish();
  };
  const optionsKey = (): string => {
    const { enabled, display } = options();
    return `${enabled}:${display}`;
  };
  // High precedence: the thread's mark wraps Obsidian's own syntax marks
  // ("[&name]" can read as a link), so its color wins over theirs.
  return Prec.high(
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        private shown: string;
        constructor(view: EditorView) {
          this.shown = optionsKey();
          this.decorations = build(view);
        }
        update(update: ViewUpdate): void {
          // Moving the cursor only matters when a thread is on screen (it
          // shows its text when the cursor is in it). A settings change
          // reaches here as a reconfigure (updateOptions).
          const shown = optionsKey();
          if (
            update.docChanged ||
            update.viewportChanged ||
            shown !== this.shown ||
            (update.selectionSet && this.decorations.size > 0)
          ) {
            this.shown = shown;
            this.decorations = build(update.view);
          }
        }
      },
      { decorations: (value) => value.decorations },
    ),
  );
}
