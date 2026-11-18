# Changelog

All notable changes to Scribidian are documented here. Entries from 0.13.1
and earlier are from First Draft, the plugin Scribidian is forked from. This
project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

Scribidian changes since 0.1.0.

### Added

- **Tab inside a line** settings table: per element, what Tab does with the
  cursor in the middle of a line. Nothing, Obsidian's own Tab, Next part
  (sluglines: location, time, modifier; characters: the extension, with its
  list open and the current one picked) or Next element (the start of the
  next element). Dialogue can also add a wryly there, as before.
- docs/EDITOR_BEHAVIOR_DECISIONS.md: how the script editor should behave
  (Enter, Tab, Backspace, menus, capitals) and the cases to test.
- Strict cursor placement: Backspace or Delete anywhere on an empty wryly,
  `()`, or one that would leave only `(` or `)` (as in `(b|`), deletes the
  wryly line and puts the cursor at the end of the dialogue above. A lone
  bracket is never left on a wryly line.
  A wryly on its own block (blank line above) is cleared instead, leaving
  an empty action line, so the blank line between blocks stays.
- Tab at the start of dialogue right under a wryly does nothing, as in
  Fade In, instead of adding another wryly.
- Typing on a line in the character column (after Tab, or **Set line to
  character**) is uppercased, even for a name the script doesn't have yet.
  Setting: "Uppercase character names as you type" (on in script mode).
- **Screenplay: Transition** command, so the transition picker no longer
  needs the sidebar.
- Strict cursor placement: the cursor never rests on the single blank line
  that separates two elements, so typing can't join them. Arrow keys and
  clicks skip it, and Backspace on an extra empty line lands at the end of
  the line above. Backspace and Delete never join two different elements,
  like a cue and its dialogue; Shift+Backspace (or the command "Delete and
  merge with line above") joins them anyway. On in script mode, off in plain mode (Settings > Typing in each
  mode, which was "Text changes while typing").
- Settings > Tab and Enter keys: choose what Tab and what Enter start at the
  end of each element (action, dialogue, transition; slugline, character
  and wryly under Show more). The defaults keep the old behaviour. "New line
  (no change)" is a plain line break. Tab completes a slugline first; its
  choice applies after that.
- Setting **Character suggestions match capitals** (Suggestions > Show
  more). On by default: typing `JE` opens the character list, `Je` doesn't.
  Off: `Je` opens it too, and the line moves to the character column while
  the list is open.
- Tab at the start of an action line with text turns it into a character
  (in capitals), like **Set line to character**. The lines under it become its dialogue.
- Setting **Mark capitals that are action** (Settings > Fountain export, on
  by default): Fountain exports put `!` in front of capitals Scribidian reads
  as action (`!BANG!`), so Final Draft, Fade In and other apps read them as
  action too.
- Uppercase sluglines as you type ("int. kitchen - day" becomes "INT.
  KITCHEN - DAY"), with a setting for each mode: on in script mode, off in
  plain mode by default.
- **Smart Tab** and **Smart Tab back** commands, so Smart Tab can go on the
  mobile toolbar (phone keyboards have no Tab key).
- README tips on themes, other plugins and Fountain rules; a rewritten mobile
  testing guide; a roadmap with possible issues and a human test checklist.

### Removed

- PDF export, the "Install offline CJK PDF fonts" command and the PDF
  language setting. Export Fountain (or FDX), import it into Final Draft, Fade
  In or another screenplay app for last looks, and make the PDF there. The
  plugin drops from 3.6 MB to about 0.17 MB and starts faster, mostly on
  phones. The preview's button now exports Fountain. A CJK font pack
  installed earlier can be deleted: the `fonts` folder inside
  `.obsidian/plugins/scribidian/`.

### Changed

- Smart Tab and Smart Enter are separate settings. Turning off Smart Tab no
  longer changes Enter; Smart Enter starts from your old Smart Tab choice.
- Moving the cursor no longer recounts the script: the status bar and the
  Scenes panel reuse their numbers until the text changes, and the Scenes
  panel moves its highlight instead of rebuilding. On a 3,000-line script a
  refresh after a cursor move drops from about 35 ms to about 9 ms.
- Faster start: the editor features are added in one step instead of six.

- The sidebar palette is gone. Its buttons (Preview, Export PDF, character
  pages, project parts and so on) were already commands, and the Recent lists
  are dropped. The scene list stays as the **Scenes** panel: click the
  clapperboard icon or run **Open scenes**. A sidebar saved with the palette
  opens as the Scenes panel.
- Settings: "Text changes while typing" is now one table with a Plain and a Script column. A checkbox at the top of each column turns all of that mode's changes on or off.

- The editor layouts are now called script mode and plain mode. New command
  **Screenplay: Toggle script/Fountain mode**.
- The settings page is reorganised for writers: Getting started, Writing,
  Typing in each mode, Tab and Enter keys, Suggestions, Page count and status bar,
  Character pages, Clean Fountain export, and a collapsed Advanced section.
  Suggestion order and scene type matching sit under Show more in
  Suggestions. Names and descriptions use plain words. Your saved settings
  are unchanged.
- The README is rewritten for writers: install with BRAT, a first five
  minutes walkthrough and a plain feature list. Developer setup and testing
  moved to `docs/DEVELOPING.md`; privacy details moved to `PRIVACY.md`.
- The Set line commands are named "Set line to action", "Set line to
  character" and so on, without numbers. Assigned hotkeys keep working.
- The plugin says "slugline" and "wryly" everywhere it used to say "scene
  heading" and "parenthetical" (commands, menus, settings, cheat sheet,
  docs). FDX export still uses Final Draft's own element names.
- Line-start capitalization and transition uppercasing have a setting for each
  mode: on in script mode, off in plain mode by default. An existing
  capitalization setting carries over to script mode.

- Plain mode no longer changes Enter: no Smart Enter, no
  Shift+Enter override, and Enter closes an open suggestion list instead of
  accepting it. Suggestions and Smart Tab still work.

### Fixed

- Enter in the middle of a slugline: with strict cursor placement on it does
  nothing; with it off it is a plain line break that keeps the text as typed
  (it used to drop the space and jump the cursor past "- ").
- Screenplay notes: Tab no longer puts tab characters into the script when
  Smart Tab has nothing to do (two cursors, a selection over several lines,
  Smart Tab off). Lists, tables and code blocks keep Obsidian's Tab.
- Strict cursor placement: Backspace at the start of a block or Delete at the
  end of one no longer removes the blank line between blocks, which merged
  them (a cue after a speech became its dialogue).
- Fountain mode: Enter after a `> transition` or `> THE END <` line no
  longer starts another `>` line.
- Script mode: Enter after a lowercase `cut to:` on its own block makes it
  the transition `CUT TO:` and starts a slugline, as in Fade In.
- Enter on the empty dialogue line under a character or wryly does nothing,
  instead of turning the character into action.
- A character whose dialogue was deleted keeps the character column while
  the cursor stays on it.
- A forced slugline's `.` is styled for `.(FLASHBACK)` too.
- Wrylies, as in Fade In: Enter in an empty `()` keeps it and starts the
  dialogue instead of picking `(beat)`; one Tab or Enter on a typed wryly
  picks it and goes on to the dialogue.
- Tab after a slugline's time starts the action, as in Fade In (it used to
  open the modifier list, so a second Tab added FLASHBACK). Type ` (` for
  a modifier.
- Tab at the end of `INT. HOUSE - KITCHEN` adds `-` and the times.
- Tab at the start of an action line turns it into a character only when
  it can be a name; a sentence no longer becomes `@She runs to the door.`
- Tab inside a line: one Tab per part walks a slugline (location, time,
  modifier) without adding a second time (`NIGHTDAY`); Tab with a part
  selected after Escape carries on instead of indenting the line;
  `INT. HOUSE - KITCHEN` is read as all location; Next element skips
  headings, comments and notes.
- **Set line to action** on a wryly removes its brackets: `(text)` becomes
  `text`. Every **Set line to …** command now moves the line to the new
  element's column at once, even when it had text.
- A forced slugline may start with any character after the `.` except
  another `.` or a space, so `.(FLASHBACK)` reads as a slugline.
- Tab at the end of a wryly with dialogue right under it moves to the start
  of that dialogue instead of adding a new line.
- Tab on an empty line moved out of the character column (Backspace or
  Shift+Tab) moves it back and opens the character list again.
- Deleting the `)` of a character extension (`JEN (V.O.`) no longer drops
  the cue to the action margin; it stays a character while the extension
  is edited.
- After Tab opens the character list on an empty line, typing a name in
  lower case ("Jen") keeps the line in the cue's column instead of jumping
  back to the action margin.
- Tab at the end of an action line puts the next line in the cue's column
  even in a script with no characters yet (the character list is empty).
  Shift+Tab or Escape makes it action.
- Strict cursor placement: Backspace never leaves the cursor on the blank
  line right under a block at the end of the script; it goes to the end of
  the text above. A line set to action that merges into the line above no
  longer lays that line out as action (text at the action margin right
  under dialogue).
- Strict cursor placement: Backspace on an empty line in the cue's column
  moves to the action margin on the same line (like Shift+Tab) instead of
  deleting the line. A second Backspace deletes it.
- Script mode: a line in capitals stays at the action margin while you type
  it (`INTENSE MUSIC`, a new name like `BOB`) and moves to the character
  column only once it is clearly a cue: the character list shows it, the
  (V.O.) list is open, it starts with `@`, or Enter puts a line under it.
- A line in capitals ending in punctuation (`BANG!`, `SILENCE.`) is action,
  even with text right below it, so Enter after it starts more action. An
  extension is fine (`JEN (V.O.)`); `@` forces a cue (`@JOHN JR.`).
- A line Tab put in the character column only offers characters, never the
  slugline list. Escape or Shift+Tab with the slugline list open keeps the
  line at the action margin.
- Typing the start of a slugline in capitals (`IN`) keeps the line at the
  left margin while the slugline list is open, instead of jumping to the
  cue's column.
- Enter after a wryly puts the new line in the dialogue column instead of
  the action margin.
- Typing `(` after a new character name in capitals (`JOHN (`) opens the
  extension list ((V.O.), (O.S.) and so on), not only after a name that
  already has dialogue.
- The editor, suggestions, statistics, Smart Tab and export now read every
  line the same way, using one set of rules:
  - A cue with a lowercase extension (`JANE (v.o.)`) counts as a character.
  - `CUT TO:` is always a transition, never a character, even with no blank
    line after it.
  - Centered text (`> THE END <`) is centered in PDF and FDX export, without
    the markers.
  - Page breaks (`===`), sections (`# ACT ONE`), notes (`[[...]]`) and
    callouts are no longer counted or printed as action.
  - An unclosed wryly (`(whispering`) is a wryly, and a Markdown heading ends
    a speech.
  - `FADE OUT.` and `FADE IN:` are never read as character names.
- Keep the theme's side margins on phones.
- Don't change text while a phone keyboard is composing a word.
- Lock the screenplay layout in screenplay notes so themes can't move it
  (first-line indents, their own fonts, padded or narrowed content, inline
  text styles). Colours, dark mode and text size still follow the theme.
- Read every trailing extension on a cue, e.g. `ALEX (V.O.) (CONT'D)`.
- Treat `!` lines as action, keep a speech going over a two-space line, and
  ignore `%%` comments (including ones that open with text) and boneyard.
- Count `O'BRIEN` and `O’BRIEN` as one character.
- Don't capitalize the first letter of a line inside a code block.
- Pick another name instead of failing when a file differs only in case.
- Load even when another plugin already opens `.fountain` files.
- "1 scene" and "1 word" in the status bar.

## [0.13.1] - 2026-10-19

### Fixed

- Reduce the core bundle from approximately 33.5 MB to 3.34 MB by moving CJK PDF
  fonts into an optional, hash-verified offline pack. All standard assets must
  now stay below 5 MB; production builds enforce the limit.

- Keep the active Markdown note context when the First Draft palette takes focus;
  reject stale editors during note navigation.
- Recognise current screenplay properties while metadata catches up, and show
  waiting feedback instead of activation for unknown or malformed properties.
- Refresh the palette after activation and report an already-active note.
- Embed bundled Latin PDF fonts as literal byte arrays, removing native
  `atob()`/`btoa()` calls. Production builds reject these calls. Upstream PDF
  libraries retain legitimate data-encoding utilities; see the scanner notes.
- Update the development-only `source-map-js` dependency to patched 1.2.2.

### Added

- Install offline CJK PDF fonts command with a device file picker, verified
  regular/bold files and sub-5-MB local storage chunks. Missing or invalid packs
  stop export with actionable feedback; Latin PDFs need no additional install.

### Testing

- All 246 tests pass, including 52 checks added since 0.13.0 for note context,
  property loading, palette rendering, activation feedback, font-pack integrity,
  exact bundled font bytes, native base64 calls and release-asset size.
  Physical iPad acceptance remains outstanding.
- Beta releases use separate tags and attested assets without replacing the
  stable GitHub release.

## [0.13.0] - 2026-10-04

### Added

- Read-only continuity inspector with source-linked character identity/link checks,
  optional dossier and empty-scene/missing-time advice, stale-evidence guards and
  explicit incomplete-scope reporting.
- Scene workspace in the palette and command palette for standalone scripts and
  explicitly ordered projects: click-to-jump, active-scene highlighting, search,
  part/character/location/time filters and approximate page positions.
- Scene creation, portable `= Synopsis` editing, same-file Up/Down and explicit
  destination moves, with normal editor undo for single-file changes.
- Confirmed cross-part moves with a local pre-move recovery copy, destination-first
  writes, stale-source checks, rollback and conflict-aware restore.

### Fixed

- Override the vulnerable development-only Moment dependency with patched 2.31.0.
- Same-file scene transactions leave unchanged frontmatter and surrounding text
  outside the replacement range.

- Exclude Fountain synopsis lines from screenplay statistics, preview and PDF
  output while preserving them in source and Fountain export.

### Known limitations

- Scripts with sections, dual dialogue, boneyards, multiline notes or fenced code
  remain navigable, but scene mutations are disabled to protect boundaries.
- Cross-part moves require saved notes and ordinary non-hidden note paths.
- Desktop native menu Undo, cross-part move/restore, later-edit conflicts and
  stale-dialog rejection passed in the isolated test vault. Narrow-sidebar and
  physical mobile acceptance remain outstanding; automated tests do not establish
  device compatibility.

## [0.12.0] - 2026-10-01

### Added

- Optional unnumbered title pages from Fountain title blocks or screenplay/project
  Markdown properties, with body numbering starting at 1.
- Dialogue pagination with `(MORE)` and repeated `(CONT'D)` speaker cues;
  keep short speeches and parentheticals with their dialogue where possible.
- Offline horizontal Chinese, Japanese and Korean PDFs with regional glyph
  selection, measured wrapping and embedded Noto fonts.
- Bundled Liberation Mono fonts for broader Latin, Greek and Cyrillic PDF text.

### Fixed

- Stop PDF export with explicit missing-glyph or oversized-metadata diagnostics
  instead of silently substituting text or clipping indivisible blocks.
- Include current editor title metadata in preview and export without modifying
  screenplay source.
- Improve screenplay activation controls and command-palette access.

### Known limitations

- The bundle is approximately 33 MB. Physical iPhone memory/performance testing
  remains outstanding; CJK preview pagination is approximate.

## [0.11.0] - 2026-09-29

### Added

- Add a read-only screenplay preview for standalone files and ordered
  multi-file projects.
- Export local, non-destructive US Letter or A4 PDFs with Courier typography,
  screenplay element positioning, deterministic wrapping, page breaks, and
  page numbers.
- Add a visual feature tour, publication-ready screenshots, and a short
  preview-to-PDF demo.

### Fixed

- Discover screenplay projects through explicit links and nearby project notes
  instead of enumerating every Markdown file in the vault.
- Limit character discovery to the configured character folder.
- Present selectable cheat-sheet examples without reading or writing the system
  clipboard.

## [0.10.2] - 2026-09-28

### Changed

- Split the First Draft Palette into focused character, project, screenplay,
  and recent-item modules while preserving its existing behaviour.
- Update the GitHub Actions runtime and compatible development dependencies.
- Adopt TypeScript 6 and remove deprecated compiler configuration.

## [0.10.1] - 2026-09-28

### Fixed

- Preserve the user's dock placement when First Draft unloads.
- Use popout-window-safe timers and remove unnecessary type assertions.
- Make command names concise and searchable without repeating the plugin name.
- Adopt Obsidian's declarative settings API and remove deprecated slider calls.
- Check export-name collisions without enumerating every vault file.
- Publish only Obsidian-supported assets with GitHub build-provenance
  attestations.

## [0.10.0] - 2026-09-28

### Added

- Fountain-aware editing, autocomplete, statistics, runtime estimates, and
  keyboard-first screenplay commands.
- Non-destructive Fountain and Final Draft FDX exports.
- A dockable First Draft Palette with contextual and recent actions.
- Portable Markdown character dossiers, relationship graphs, derived usage,
  and deterministic consistency checks.
- Ordered multi-file screenplay projects with project-wide navigation,
  statistics, checks, exports, and project-local character folders.
- Vertically stacked project-part links, a conflict-safe example screenplay
  generator, and an offline screenplay/Fountain cheat sheet.
- Local-only operation without telemetry, accounts, or network access.

### Compatibility

- Requires Obsidian 1.13.7 or later.
- Declares desktop and mobile support. See the physical-device checklist in
  `docs/MOBILE_TESTING.md`.
- FDX export intentionally supports the six core screenplay element types; see
  `docs/FDX_COMPATIBILITY.md`.

[Unreleased]: https://github.com/grobmeier/firstdraft/compare/0.13.1...HEAD
[0.13.1]: https://github.com/grobmeier/firstdraft/releases/tag/0.13.1
[0.13.0]: https://github.com/grobmeier/firstdraft/releases/tag/0.13.0
[0.12.0]: https://github.com/grobmeier/firstdraft/releases/tag/0.12.0
[0.11.0]: https://github.com/grobmeier/firstdraft/releases/tag/0.11.0
[0.10.2]: https://github.com/grobmeier/firstdraft/releases/tag/0.10.2
[0.10.1]: https://github.com/grobmeier/firstdraft/releases/tag/0.10.1
[0.10.0]: https://github.com/grobmeier/firstdraft/releases/tag/0.10.0
