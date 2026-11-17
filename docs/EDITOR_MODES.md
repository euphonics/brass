# Editor modes

Scribidian has two editor modes, chosen in **Settings → Scribidian → Editor
mode**, or switched with the command **Screenplay: Toggle script and
plain mode**. Both edit the same plain Fountain text; only the display and the
typing help differ.

- **Script mode** (screenplay layout): the page is laid out like a
  screenplay, and Scribidian may shape typing (for example Smart Enter). The
  [strict typing plan](ROADMAP.md#strict-typing-plan) grows this mode towards
  Final Draft and Fade In.
- **Plain mode** (Fountain text): plain text and free typing.
  Suggestions and Smart Tab still help, but Enter is always Obsidian's own.

The rule for new features: anything that changes typing beyond suggestions and
the Tab key belongs to script mode only. In code, check `plugin.isScriptMode()`.
Text changes while typing, and strict cursor placement (the cursor lock on blank lines between
elements), get a setting for each mode, on in script mode and off in plain mode
by default; check `plugin.typingChangeEnabled(...)`.

## Current behaviour

| Behaviour                                                            | Script mode  | Plain mode                                         |
| -------------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| Screenplay layout (indents, 60-character column, lock)               | Yes          | No                                                 |
| Dual dialogue shown side by side                                     | Yes          | No                                                 |
| Screenplay font                                                      | Yes          | Yes                                                |
| Bottom typing margin                                                 | Yes          | Yes                                                |
| Suggestions while typing                                             | Yes          | Yes                                                |
| Accept a suggestion with Tab or a tap                                | Yes          | Yes                                                |
| Accept a suggestion with Enter                                       | Yes          | No: Enter closes the list and starts a new line    |
| Smart Tab (Tab) and the Smart Tab commands                           | Yes          | Yes                                                |
| Shift+Tab or Escape on the empty next-cue line → action              | Yes          | No (there is no layout to change)                  |
| Smart Enter (next element; set per element under Tab and Enter keys) | Yes          | No: Obsidian's Enter                               |
| Shift+Enter as a plain line break                                    | Yes          | Obsidian's Shift+Enter                             |
| **Set line** commands                                                | Yes          | Yes (they add Fountain markers such as `@` or `>`) |
| Capitalize the first letter of a line                                | On (setting) | Off (setting)                                      |
| Uppercase a slugline as you type                                     | On (setting) | Off (setting)                                      |
| Uppercase while typing on a `>` transition line                      | On (setting) | Off (setting)                                      |
| Strict cursor placement (skip the blank line between elements)       | On (setting) | Off (setting)                                      |
| Shift+Backspace joins a line to a different element above            | With strict  | With strict                                        |
| Status bar, Scenes panel, inspector, commands                        | Yes          | Yes                                                |

These settings have a Plain and a Script column under
**Settings → Scribidian → Typing in each mode**.
