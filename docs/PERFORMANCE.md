# Typing performance

The question (2026-11-22): can Scribidian be as responsive as a dedicated
screenwriting app inside Obsidian, or does it need to become a separate
app? **Answer: it can stay in Obsidian.** Typing in script mode now costs
about the same as typing in a plain Obsidian note (within 1–2 ms, about
the measurement noise), even in a 500-page script. Lag in a busy vault comes
from other plugins, not from Scribidian or Obsidian.

## How it was measured

A script in the Dev vault (`obsidian vault=Dev eval`) types real keystrokes
through the editor's input path (`document.execCommand("insertText")`) into
an action line in the middle of a long script. It times each keystroke from
input to the next painted frame, and records long tasks (over 50 ms) during
and just after typing. The CPU profiler (Chrome DevTools Protocol, through
`obsidian dev:cdp`), on an unminified build, showed where the time went.
Test scripts were 2 and 8 copies of EXFILTRATION (about 120 and 500 pages;
5,025 and 20,091 lines). Runs typed 40–60 keystrokes, 80–90 ms apart; the
"with pauses" runs also stopped for 0.6 s after every 8 keystrokes, which
lets background work start between bursts.

## Results (median ms per keystroke, input to next frame)

With all of the writer's plugins on:

| Script                 | Before | After round 1 | Scribidian off |
| ---------------------- | ------ | ------------- | -------------- |
| 120 pages, script mode | 38     | 22            | 18             |
| 500 pages, script mode | 112    | 48            | 43             |
| 500 pages, plain mode  | 67     | 48            | 43             |

With every other plugin off (Scribidian alone), after round 2:

| Script                              | Median    | 95th percentile | Scribidian off |
| ----------------------------------- | --------- | --------------- | -------------- |
| 500 pages, script mode              | 11.7–13.3 | 16              | 9.8–11.8       |
| 500 pages, plain mode               | 10.2–12.4 | 16              | 9.8–11.8       |
| 500 pages, script mode, with pauses | 13.4      | 19 (was 147)    | 11.8           |
| 120 pages, script mode              | 11.5      | 15              | 10.2           |

Before the fixes, script mode at 500 pages had a 70–220 ms long task on
every keystroke. Now typing produces none, at either size.

## What was slow in Scribidian, and the fixes

1. **Reading the frontmatter copied the whole note.** `isScreenplayFile`,
   which several editor extensions call on every edit, used
   `editor.getValue()` to read the properties. Now it reads only the lines up
   to the end of the frontmatter.
2. **The screenplay layout reclassified every line on every keystroke.** Now
   it reclassifies only the lines between the blank line before the edit and
   the blank line after it. The classifier's state resets at a blank line
   outside notes and boneyards, so the result is the same. It falls back to
   a full pass when the edit adds or removes a multi-line construct (`/*`,
   `*/`, `%%`, `[[`, `]]`, a code fence), when the note has code fences,
   near the frontmatter, or when the suggestion list or a forced line kind is
   involved. In notes up to 6,000 lines (about 120 pages) a full pass also
   runs 0.8 s after typing pauses, as a safety net; longer notes skip it,
   because it would be a 60 ms pause of its own. A live check in the Dev
   vault compared the two after random edits: they matched, except where
   the suggestion list had opened in between (which is meant to change the
   layout).
3. **Dual dialogue rescanned the whole script on every edit.** Now it
   rebuilds only when an edit touches a line ending in `^`, a pair, or the
   top of the note; otherwise the pairs just move.
4. **Line comments and boneyard markers scanned the whole note on every
   edit** (`doc.toString()` and a full scan). Now line comments rescan only
   the edited lines, and the boneyard scan is skipped when the note has no
   boneyard. Both scan in full when the note has boneyards or code fences,
   when an edit adds one, or near the frontmatter.
5. **Status bar statistics and the current page ran on the main thread.**
   They could take 40 ms (120 pages) to 170 ms (500 pages) after a pause and
   delay the next keystroke. Now they're counted in a Web Worker
   (`src/workers/`), bundled into `main.js` as text by
   `scripts/worker-source.mjs` and started from a Blob URL; the main thread
   only copies the text (about 6 ms at 500 pages). If a worker can't start,
   they're counted on the main thread as before. The statistics cache keys
   on the editor's document, the current page is cached per line, and both
   wait for the browser to be idle.

6. **Enter and Tab reclassified the whole note, and rebuilt the suggestion
   index on the main thread.** A suggestion list opening, a line set to an
   element (Tab) and a cursor move onto a line that lays out differently
   now use the same windowed reclassify as typing, with the same rules as
   the full pass (the forced element, the open list, the remembered cue).
   The suggestion index for a single note is built in the worker (a new line
   waits for it, but typing doesn't). `characterCue`, the busiest function
   in every whole-note pass, rejects lines with a lowercase letter before
   any `(` first, before its other checks (same result). Median per press,
   Scribidian alone: Enter 34 to 12 ms (120 pages) and 48 to 19 ms (500
   pages); Tab 35 to 11 ms and 48 to 13 ms. All 204 recorded behavior cases
   (cases1–22) give the same results as before, including each line's
   layout.

## Other plugins in the writer's vault (500 pages, per keystroke)

| Plugin                                   | About    |
| ---------------------------------------- | -------- |
| Dataview (inline fields in live preview) | 35–65 ms |
| Arvnfig (heading guard on each edit)     | 41 ms    |
| Templater                                | 14 ms    |
| Better Word Count                        | 10 ms    |

These run on every keystroke in every note. Dataview's setting **Render
inline fields in live preview** (`prettyRenderInlineFieldsInLivePreview`)
is the single biggest cost: turned off (and Dataview reloaded), a keystroke
in a 500-page script with all plugins on went from about 62 ms to about
22 ms. Arvnfig is the writer's own plugin; its guard scans the note on each
edit and could be made incremental.

## Still to check

- The Smart Enter and Tab plans still read the whole note (about 6 ms of
  each press at 500 pages); the first Tab after opening a note can take
  about 120 ms while the worker starts and builds the first index.
- Screenplay projects: completion builds its index from every part when the
  text outside the cursor's line changes; worth profiling in a large
  project.
- Phones and slower computers: these numbers are from a desktop.

## Threads panel (2026-11-23)

Measured in the Dev vault on a 500-page script (`Scribidian Example/Threads
Perf.md`, thread marks added to action lines), with the panel open. The
panel works only after typing pauses, never per keystroke.

| Thread places | Names | Redraw (median) | Redraw (max)                             | Refresh with nothing changed |
| ------------- | ----- | --------------- | ---------------------------------------- | ---------------------------- |
| 200           | 20    | 5.2 ms          | (first open: 753 ms, reading the script) | 1.6 ms                       |
| 1,000         | 50    | 8.8 ms          | 21 ms                                    | 3.3 ms                       |
| 2,904         | 100   | 17.4 ms         | 30 ms                                    | 6.2 ms                       |
| 2,904         | 200   | 20.9 ms         | 48 ms                                    | 9.1 ms                       |

Verdict: no change needed. Even about 3,000 places redraw in about one
frame, after a pause. If it ever matters: move the place collection to the
worker and redraw only the threads that changed (#285).

## Release check, 0.1.1 vs 0.1.2 (2026-11-23)

`tools/perf/check.ps1` (only Scribidian on), baseline from the 0.1.1
release build, then the 0.1.2 candidate. Scribidian's cost is script or
plain mode minus Scribidian off, in the same run.

| Check | 0.1.1 | 0.1.2 |
| --- | --- | --- |
| 120 pages, script mode cost | 12.5 ms | 1.7 ms |
| 500 pages, script mode cost | 43.1 ms | 1.0 ms |
| 500 pages, plain mode cost | 11.6 ms | 0.2 ms |
| 500 pages, script 95th percentile | 80.6 ms | 15.4 ms |
| 500 pages, long tasks over 50 ms (60 keys) | 25 | 0 |
| 500 pages, Enter | 100.7 ms | 37.4 ms |
| 500 pages, Tab | 82 ms | 28.7 ms |

The behavior replay (`regress.ps1`, 214 cases) differed from 0.1.1 in 10
cases, all intended (#252/#266, #255/#282, #256, #284). `baseline.json` is
now the 0.1.2 candidate.

