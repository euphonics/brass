# Editor modes

Scribidian has two editor modes, chosen in **Settings → Scribidian → Editor
mode**, or switched with the command **Screenplay: Toggle script/Fountain
mode**. Both edit the same plain Fountain text; only the display and the
typing help differ.

- **Script mode** (screenplay layout): the page is laid out like a
  screenplay, and Scribidian may shape typing (for example Smart Enter). The
  [strict typing plan](ROADMAP.md#strict-typing-plan) grows this mode towards
  Final Draft and Fade In.
- **Plain mode** (Fountain text): plain text and free typing.
  Suggestions and Smart Tab still help, and Enter is Obsidian's own, except
  for the few guard rails strict cursor placement adds when you turn it on
  (see the table).

**Tab and Enter never make improper formatting.** With strict cursor
placement on, in either mode, Tab and Enter never leave a tab character, an
empty `()`, a wryly under a wryly, a split `(` `)`, an unfinished slugline
followed by a new element, or a stack of blank lines. You can still type any
of these by hand. See [Editor behavior decisions](EDITOR_BEHAVIOR_DECISIONS.md).

The rule for new features: anything that changes typing beyond suggestions and
the Tab key belongs to script mode only. In code, check `plugin.isScriptMode()`.
Text changes while typing, and strict cursor placement (the cursor lock on blank lines between
elements), get a setting for each mode, on in script mode and off in plain mode
by default; check `plugin.typingChangeEnabled(...)`.

## Current behavior

| Behavior                                                                            | Script mode  | Plain mode                                         |
| ----------------------------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| Screenplay layout (indents, 60-character column, lock)                              | Yes          | No                                                 |
| Dual dialogue shown side by side                                                    | Yes          | No                                                 |
| Screenplay font                                                                     | Yes          | Yes                                                |
| Bottom typing margin                                                                | Yes          | Yes                                                |
| Suggestions while typing                                                            | Yes          | Yes                                                |
| Accept a suggestion with Tab or a tap                                               | Yes          | Yes                                                |
| Accept a suggestion with Enter                                                      | Yes          | No: Enter closes the list and starts a new line    |
| Tab with a list open: pick, or move to the next element (setting)                   | Yes          | No: Tab always picks                               |
| Smart Tab (Tab) and the Smart Tab commands                                          | Yes          | Yes                                                |
| "Obsidian's Tab" inside a line never inserts a tab character                        | Yes          | Yes (lists, tables and code blocks keep it)        |
| Shift+Tab or Escape on the empty next-cue line → action                             | Yes          | No (there is no layout to change)                  |
| Smart Enter (next element; set per element under Tab and Enter keys)                | Yes          | No: Obsidian's Enter                               |
| Shift+Enter as a plain line break                                                   | Yes          | Obsidian's Shift+Enter                             |
| **Set line** commands                                                               | Yes          | Yes (they add Fountain markers such as `@` or `>`) |
| Capitalize the first letter of a line                                               | On (setting) | Off (setting)                                      |
| Uppercase a slugline as you type                                                    | On (setting) | Off (setting)                                      |
| Uppercase while typing on a `>` transition line                                     | On (setting) | Off (setting)                                      |
| Strict cursor placement (skip the blank line between elements)                      | On (setting) | Off (setting)                                      |
| Strict: Enter on a blank line under a blank line does nothing                       | Yes          | Yes                                                |
| Strict: Enter at the end of an unfinished slugline does nothing                     | Yes          | Yes                                                |
| Strict: Enter on an empty `()` removes it                                           | Yes          | Yes                                                |
| Strict: Enter inside a speech keeps it whole                                        | Yes          | Yes                                                |
| Strict: Enter inside action starts a new paragraph                                  | Yes          | No: a plain line break                             |
| Strict: deleting a selection removes whole sluglines, cues, wrylies and transitions | Yes          | Yes                                                |
| Shift+Backspace / Shift+Delete join a line to a different element                   | Always       | Always                                             |
| Highlight `$` variables                                                             | On (setting) | On (setting)                                       |
| Status bar, Scenes panel, inspector, commands                                       | Yes          | Yes                                                |

These settings have a Plain and a Script column under
**Settings → Scribidian → Typing in each mode**. **Screenplay: Toggle strict
cursor placement** turns strict on or off for the current mode.
