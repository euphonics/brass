# Typing performance

The question (2026-11-22): can Scribidian be as responsive as a dedicated
screenwriting app inside Obsidian, or does it need to become a separate
app? **Answer: it can stay in Obsidian.** With the fixes below, typing in
script mode costs about one display frame, even in a 500-page script. The
remaining lag in a busy vault comes from other plugins, not Scribidian or
Obsidian.

## How it was measured

A script in the Dev vault (`obsidian vault=Dev eval`) types real keystrokes
through the editor's input path (`document.execCommand("insertText")`) into
an action line in the middle of a long script. It times each keystroke from
input to the next painted frame, and records long tasks (over 50 ms) during
and just after typing. The CPU profiler (Chrome DevTools Protocol, through
`obsidian dev:cdp`) showed where the time went. Test scripts were 2 and 8
copies of EXFILTRATION (about 120 and 500 pages; 5,025 and 20,091 lines).
Each run typed 40 keystrokes, 90 ms apart.

## Results (median ms per keystroke, input to next frame)

| Script                         | Before | After  | Scribidian off |
| ------------------------------ | ------ | ------ | -------------- |
| 120 pages, script mode         | 38     | 22     | 18             |
| 500 pages, script mode         | 112    | 48     | 43             |
| 500 pages, plain mode          | 67     | 48     | 43             |
| 500 pages, script mode, solo\* | —      | **19** | 12             |
| 120 pages, script mode, solo\* | —      | **14** | —              |

\*Solo: every other community plugin turned off for the run.

Before the fixes, script mode at 500 pages had a 70–220 ms long task on
every keystroke; after, at 120 pages, there are none.

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
   involved. A full pass also runs 0.8 s after typing pauses, as a safety
   net. A live check in the Dev vault compared the two after random edits:
   they matched, except where the suggestion list had opened in between
   (which is meant to change the layout).
3. **Dual dialogue rescanned the whole script on every edit.** Now it
   rebuilds only when an edit touches a line ending in `^`, a pair, or the
   top of the note; otherwise the pairs just move.
4. **Status bar statistics ran on every pause, and re-parsed the script
   before checking their cache.** The cache now keys on the editor's
   document (unchanged text skips the work), and the count waits for the
   browser to be idle (`requestIdleCallback`), so it can't delay a keystroke.

## Other plugins in the writer's vault (500 pages, plain mode, per keystroke)

| Plugin                                | About |
| ------------------------------------- | ----- |
| Dataview (inline fields on each edit) | 65 ms |
| Arvnfig (heading guard on each edit)  | 41 ms |
| Templater                             | 14 ms |
| Better Word Count                     | 10 ms |

These run on every keystroke in every note, so they slow typing in long
scripts whatever Scribidian does. Dataview's inline-field highlighting can be
turned off in its settings. Arvnfig is the writer's own plugin; its guard
scans the note on each edit and could be made incremental.

## Still to check

- Enter and Tab still classify the whole note once per press (the Smart
  Enter and Tab plans). That's one keystroke at a time, but in a 500-page
  script it may be noticeable.
- Phones and slower computers: these numbers are from a desktop.
