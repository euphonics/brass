# Editor modes

Scribidian has two editor modes, chosen in **Settings → Scribidian → Editor
layout**. Both edit the same plain Fountain text; only the display and the
typing help differ.

- **Script mode** ("Screenplay layout"): the page is laid out like a
  screenplay, and Scribidian may shape typing (for example Smart Enter). The
  [strict typing plan](ROADMAP.md#strict-typing-plan) grows this mode towards
  Final Draft and Fade In.
- **Plain mode** ("Plain Fountain text"): plain text and free typing.
  Suggestions and Smart Tab still help, but Enter is always Obsidian's own.

The rule for new features: anything that changes typing beyond suggestions and
the Tab key belongs to script mode only. In code, check `plugin.isScriptMode()`.

## Current behaviour

| Behaviour                                                 | Script mode | Plain mode                                         |
| --------------------------------------------------------- | ----------- | -------------------------------------------------- |
| Screenplay layout (indents, 60-character column, lock)    | Yes         | No                                                 |
| Dual dialogue shown side by side                          | Yes         | No                                                 |
| Screenplay font                                           | Yes         | Yes                                                |
| Bottom typing margin                                      | Yes         | Yes                                                |
| Suggestions while typing                                  | Yes         | Yes                                                |
| Accept a suggestion with Tab or a tap                     | Yes         | Yes                                                |
| Accept a suggestion with Enter                            | Yes         | No: Enter closes the list and starts a new line    |
| Smart Tab (Tab) and the Smart Tab commands                | Yes         | Yes                                                |
| Shift+Tab or Escape on the empty next-cue line → action   | Yes         | No (there is no layout to change)                  |
| Smart Enter (next element after dialogue, heading, etc.)  | Yes         | No: Obsidian's Enter                               |
| Shift+Enter as a plain line break                         | Yes         | Obsidian's Shift+Enter                             |
| **Set line** commands                                     | Yes         | Yes (they add Fountain markers such as `@` or `>`) |
| Capitalize the first letter of a line (setting)           | Yes         | Yes                                                |
| Uppercase while typing on a `>` transition line           | Yes         | Yes                                                |
| Status bar, palette, scene workspace, inspector, commands | Yes         | Yes                                                |

Line-start capitalization and transition uppercasing change text as you type
in both modes. Whether plain mode should keep them is an open question in the
roadmap.
