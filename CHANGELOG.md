# Changelog

All notable changes to Scribidian are documented here. Entries from 0.13.1
and earlier are from First Draft, the plugin Scribidian is forked from. This
project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Commands in the command palette** (Settings → Getting started): check
  or uncheck each Scribidian command to show or hide it in the palette.
  Replaces **Show all commands**. Hidden at first: the commands with
  their own key or menu, plus Create example screenplay, Open local graph,
  Select element, Toggle strict cursor placement, the plain PDF and Final
  Draft exports, and the cheat sheet.
- **Threads** settings section: **Use threads** turns threads on or off
  (off: `[&name]` is plain text, and the thread list, commands and panel
  go away), and **Thread text** shows the text after the spool, before
  it, or not at all.
- **Type && to start a thread** (on by default): in a screenplay, `&&`
  becomes `[&` and opens the thread list.
- **Thread text** now defaults to text then 🧵, and can be **Text only**.
  **Thread color** sets the color of thread text.

## [0.1.3] - 2026-11-24

### Added (writer wish list, 2026-11-23)

- **Wrap selection in boneyard** and **Move selection to the boneyard
  note** (commands, hotkeys possible): wrap or unwrap `/* */`, or send the
  selected text straight to the boneyard note.
- `[&ropehead|]` shows the thread's spool only.

- **Outline links go under** (Suggestions): Link scene headings puts one
  link under each scene's heading (default) or under each slugline.
- A thread shows its name next to the spool in the thread color
  (`[&black widow Fiona]` → 🧵black widow Fiona).

- **Link scene headings across documents** (command): links each scene to
  its outline heading both ways. Sluglines get `= [[Outline#Heading]]`,
  and the outline heading gets a link back to the scene's heading in the
  script. Scenes are matched by heading name; others ask which heading.
  The outline is set in an `outline` property.

- Clean export's **Embeds** can be **Include text** (per format): the
  embedded note, heading section or block goes into the export and
  preview in place of `![[...]]`, cleaned like the script; embeds inside
  it up to three levels. Images are left out for now.

- Outlines and other notes that belong with a script (in its project
  folder, its own folder, or named in its `outline` property) get `+`
  character names and the script's `$` variables, without the screenplay
  layout.

- `$` variables are shared across a project: the list offers the
  variables used in every note in the screenplay's project folder (or the
  script's folder), not only this note's.

- **Move boneyard to the boneyard note** (command): every `/* ... */`
  block leaves the script and lands in the screenplay's boneyard note,
  under a dated heading for each scene. The first time, pick a note or
  create `<script> Boneyard`; it's remembered in a `boneyard` property.

- **Turn off Completr in screenplays** (Suggestions, on by default): the
  Completr plugin's word list stays closed in screenplay notes, so it
  doesn't compete with Scribidian's lists; other notes keep it.

- Shift+Tab inside a slugline or character selects the part before and
  opens its list (`INT. BARN - DAY|` → DAY, then BARN), the way Tab's Next
  part goes forward. A setting under Tab and Enter keys (on in script
  mode).
- Threads can carry text, like a wikilink's alias: `[&gun|the pistol]`
  shows 🧵 and `the pistol`, belongs to the same thread as `[&gun]`, and
  exports keep `the pistol` in the sentence.
- `+` groups match more loosely: `+Jenandb` finds `Jen and Blake`, and
  `+j,b` finds `Jen, Blake, and George`.

## [0.1.2] - 2026-11-23

### Added (writer wish list, 2026-11-22)

- Mini sluglines: after `.HA`, the location list also offers a bare `HALL`
  that fills in just the location, with no time. It comes first when the
  location was last used without a time.
- Clean export works for every format: **Export clean PDF** and **Export
  to clean Final Draft FDX** join **Export to clean Fountain**, and the
  Clean export settings are a table with a column per format (Fountain,
  PDF, Final Draft), so each can keep or remove different markup. Your
  earlier choices carry over to all three.
- **Export PDF** and **Export to Final Draft FDX** now keep Obsidian
  markup (tasks, callouts, tags…) as text, like **Export Fountain**; use
  the clean versions to leave it out. The preview and the status bar's
  page count follow the PDF column.
- Clean export defaults suit each format: the clean Fountain file keeps
  Fountain's own hidden elements (sections, synopses, boneyard) and turns
  `// line comments` into Fountain notes (`[[note]]`); the clean PDF and
  Final Draft files leave them out. New **Remove synopses** and **Remove
  boneyard** rows; **Line comments** can become a Fountain note or
  boneyard. "Links to other notes" is now **Wikilinks**.
- New command **Screenplay: Toggle dual dialogue**: adds or removes the
  `^` on the cue of the speech the cursor is in, when there's a speech
  right above to pair with.
- A Fountain note or section between two speeches now stops them pairing
  as dual dialogue in the PDF, preview and Final Draft export, as
  Fountain's rules say.
- Picking a location in the slugline list fills in the whole slug it
  shows, time and modifier included (`STUDIO, BARN - NIGHT (FLASHBACK)`).
  **Picking a location fills in** (Suggestions) has Time and Modifier
  checkboxes; turn both off for the old location-then-times behavior.
- Fixed: the `[&` thread list closed as soon as you typed a letter when a
  word-completion plugin (Completr) was on; it now filters as you type. It
  also no longer lists the thread you're typing.
- `+` groups use everyone named in the scene so far, not only those who
  speak; a list you type is completed name by name (`+Jen, Blake, and H` →
  `Jen, Blake, and Helios`); and a group already offered as a name isn't
  listed twice.
- `%% comments %%` can also become Fountain notes or boneyard in the
  clean Fountain file (Note is the default there).
- Wikilinks: keep the alias (falling back to the file name), the file
  name, the whole link, or nothing. Web links: keep the name, the address,
  the whole link, or nothing.
- Fixed: the PDF printed inline boneyard text (`/* ... */`) as script.
- The Threads panel is now a tree like Obsidian's search results: click a
  thread to open or close its notes and lines, close a note's group, or use
  Expand all and Collapse all.
- `+` names in action also offer groups after the names: groups the script
  already writes (`Jen and Blake`), then pairs and the Oxford-comma list of
  the scene's speakers (`Jen, Blake, and George`). Typing a comma keeps
  narrowing the list.

### Changed (performance, 2026-11-22)

- Typing in long scripts is much faster. In a 500-page script, a keystroke
  in script mode went from about 112 ms to 48 ms (19 ms with no other
  plugins): the layout reclassifies only the paragraphs around an edit, the
  frontmatter check no longer copies the whole note, dual dialogue no longer
  rescans the script, and the status bar counts only when the editor is
  idle. See docs/PERFORMANCE.md.
- Typing performance, round 2: Scribidian on its own now types about as
  fast as a plain Obsidian note, even at 500 pages. Line comments and
  boneyard markers scan only edited lines, and the status bar's statistics
  and current page are counted in a background worker.
- Enter and Tab in long scripts are about two to three times faster: the
  layout updates only the paragraphs around the cursor when a suggestion
  list opens or a line is set to an element, and the suggestion index is
  built in the background worker.

### Added (PDF, 2026-11-22)

- Setting **Add (CONT'D) to continued dialogue** (on by default): the PDF
  and preview print `(CONT'D)` for a character who speaks again after action
  in the same scene, and on the next page of a split speech. Your Fountain
  text never changes.
- Scene numbers (`#1A#`) print in both margins; `===` starts a new page;
  lyrics print in italics; Source is centered on the title page.

### Fixed (PDF, 2026-11-22)

- A page could start with a transition, or keep a single line of a split
  action paragraph.

### Added (wish list, 2026-11-22)

- Character extension suggestions include the extensions the script already
  uses, after the standard ones. Setting **Your extensions first** (off by
  default) puts them first.
- Setting **Line comment color** (color picker). Line comments are now the
  theme's muted text color instead of 45% opacity, so they're easier to read.
- `npm run install-notes` installs a tested build into the Notes vault.

### Changed

- PDF and preview layout now match Fade In: Final Draft margins (action at
  1.5", dialogue 2.5", wrylies 2.9", character names 3.5", 1" bottom),
  page numbers `2.` at the top right from the second script page, and a
  title page placed like Fade In's. PDF metadata takes the title and author
  from the title page.

- PDF and preview print emphasis: `*italic*`, `**bold**`, `***bold
italic***` and `_underline_`, without the marks. Courier Prime italic and
  bold italic are now built in (main.js about 2.2 MB).

- PDF and preview: dual dialogue (`^`) prints side by side; action lines
  with no blank line between them stay one paragraph; a long speech splits
  at a sentence end with `(MORE)`, as in Fade In. On a 61-page test script
  every page now breaks where Fade In's does.

### Fixed

- A scene heading could be left alone at the bottom of a PDF page.

### Added

- **Settings → PDF export**: a bold toggle for each part of the printed
  page (sluglines, action, character names, dialogue, wrylies, transitions,
  centered text, lyrics, title, title page details, page numbers). Only
  sluglines are bold by default; character names and the title page title,
  bold before, now aren't. The preview follows the same settings.

## [0.1.1] - 2026-11-22

Scribidian changes since 0.1.0.

### Added

- Setting **Capitalize the first letter of each sentence** (on in script
  mode, off in plain): the first letter after `.`, `!` or `?` and a space
  goes into capitals as you type. Not after an ellipsis, an abbreviation
  (`Mr.`, `Dr.`) or a single initial.
- Slugline suggestions remember each location's last time of day: the
  location list shows `KITCHEN - NIGHT`, and the times list puts NIGHT
  first.
- Suggestions settings **Offer full slugs** (off by default) and **Order of
  slug suggestions** (drag to reorder): with full slugs on, each location
  also offers its last whole slug (`KITCHEN - NIGHT (FLASHBACK)`), filled
  in at once.
- Setting **Enter at the end of a character moves to the dialogue** (on by
  default): strict, with the speech already below, Enter moves the cursor
  down. Off: Enter adds an empty dialogue line under the character, as in
  Fade In.
- PDF export is back: **Screenplay: Export PDF**, or **Export PDF** in the
  preview. It uses Courier Prime, built into the plugin, and prints what
  clean Fountain export holds, so notes, tasks, callouts and other Obsidian
  markup stay out (the preview now shows the same). Latin-alphabet languages
  only. A speech split across pages repeats its cue as written. The plugin
  grows to about 1.9 MB.

- Settings **Variable character** and **Character name character** change
  the `$` and `+` that start variables and character names in action.
- A `characters` property in a screenplay note's frontmatter adds
  characters to the suggestion lists before they have any dialogue.
- Typing `+` in an action line lists the characters; the pick is written
  as a name in action (`Jen`, `McAllister`), in capitals only if you typed
  capitals.
- Typing `$` lists the note's other `$` variables, most used first.
- `$` variables keep apostrophes inside the name (`$jen's_car`), so the
  color no longer stops at the `'`.
- Setting **Suggest character names in action** (on by default): a name
  typed in capitals inside an action line (`She sees JE`) lists the
  characters, like Final Draft's SmartType.
- Strict: Enter at the end of a wryly with dialogue below moves the cursor
  to the start of that dialogue, as in Final Draft and Fade In.
- `cut to:` typed on its own block goes into capitals when the `:` is
  typed (setting: Uppercase transitions as you type).
- Transitions typed without `>` get the transition list: `CUT T`, `SMASH`
  or `FADE O` in capitals at the start of a block, after any matching
  characters. `CUT TO:` is written as it is; others get their `>`.
- A forced cue lists the characters: `@` or `@j`, in any case.
- Typing `)` right before the `)` that closes a wryly or extension steps
  over it, as in Fade In (no more `(beat))`).

- **Threads**, a Scribidian addition: `[&name]` ties lines together by name
  (setups and payoffs, red herrings). Shown as 🧵. Click: next place in the
  note; Shift+click: previous; Alt+click: next place across the project and
  notes linked to it. Typing `[&` lists the names already used. Commands
  **Next in thread**, **Previous in thread**, **Next in thread, across
  notes**. Preview, counts and exports leave threads out.
- **Threads panel** (command **Show threads**, or Ctrl/Cmd+click a 🧵):
  every thread with counts, and every place of one thread grouped by
  note, with the line's text. Threads used once are marked.
- Obsidian's **Follow link** hotkey with the cursor on or next to a thread
  goes to the next place in it, like a click.
- **Tab inside a line** has a new choice, **As at the end of the line**:
  Tab does what it does at the end of the line, so Tab in the middle of
  action starts a new character with its list (as in Arc Studio Pro).
- Settings **Tab at the start of dialogue adds a wryly** and **Backspace on
  an empty character line makes it action** (both on). Turn them off for
  Fade In's behavior.
- Setting **Current element** (status bar, off by default): the element the
  cursor is on.
- Escape (or Shift+Tab) on the empty next-cue line is remembered: arrowing
  away and back keeps the line action, with no character list.
- Tab in an empty `()` with no cue above clears it to an empty action line.
- Command **Screenplay: Select element**: selects the whole element at the
  cursor, a speech (cue, wrylies and dialogue) or a run of action lines with
  no blank line between them. Give it a hotkey under Settings → Hotkeys.
- Command **Copy configuration to clipboard**: settings, mode and the
  cursor's context, ready to paste into a bug report.
- Setting **Tab with a list open** (script mode): Tab can pick the
  highlighted suggestion, as before, or move to the next element, as if the
  list weren't open (an empty line after a transition then goes to the
  character column instead of picking INT.).
- Command **Screenplay: Toggle strict cursor placement**, for the current
  mode (bind it to a key in Settings > Hotkeys).
- Shift+Delete at the end of a line joins the next line with text onto it,
  the mirror of Shift+Backspace (it used to cut the line). Both work with
  strict cursor placement on or off. Both joins cross blank lines and
  take the upper line's element (in capitals onto a slugline, cue or
  transition). New command: Delete and merge with line below.
- **Highlight $ variables** (Typing in each mode, script and Fountain):
  `$my_variable` or `$ABC123` shows in the theme's accent color; dollar
  amounts like `$123.12` or `$1,123.12` don't.
- **Indent action with spaces** setting (on by default): spaces at the start
  of an action line indent it in the preview and FDX export too, as
  Fountain allows. Tabs don't indent action.
- Line comments, a Scribidian addition to Fountain: `// note` at the end
  of a line (or on its own line) is shown faded, is left out of preview and
  export, and is removed by Clean Fountain export ("Remove line comments").
- Lyrics (`~` lines) are their own element: italic in preview, italic
  action in FDX export.
- **Enter inside a line** setting: what Enter does with the cursor in the
  middle of each element (Nothing, Line break, Obsidian's Enter, Next
  element), set separately for script and Fountain mode. Script mode
  defaults to Nothing in sluglines, cues, wrylies and transitions, and a
  line break in action and dialogue; Fountain mode defaults to a line
  break everywhere. The Tab and Enter keys settings now have three
  headings: At the end of a line, Tab inside a line, Enter inside a line.
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
  and wryly under Show more). The defaults keep the old behavior. "New line
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

### Changed

- Clean Fountain export removes tags by default, so it takes out all
  Obsidian markup unless you turn a part of it off.
- The status bar's page count, runtime, words and scenes count only what
  clean export keeps: notes, tasks, callouts and embeds add no pages.
- The README opening is rewritten for screenwriters.
- Script mode: Enter in an empty `()` with the wryly list open picks the
  highlighted wryly and goes on to the dialogue, instead of removing the
  `()`. With the list closed, Enter still removes it.
- A thread's text (`[&name]`, while the cursor is on it) shows in its own
  color (orange) instead of a faded link color. A snippet can change it
  with `--scribidian-thread-color`.

- Strict cursor placement: Backspace or Delete between two action blocks
  joins them into one paragraph (with a space), as in Fade In. Other
  elements still stay apart.
- Tidier command palette: commands with their own key or menu (Smart Tab,
  Smart Tab back, Delete and merge with line above, New scene, Character,
  Wryly, Transition, Preview) are hidden unless **Show all commands in the
  command palette** is on. The Set line commands are listed together, in
  order: slugline, action, character, wryly, transition, centered text.
- Tab inside a line is set separately for script and Fountain mode. Fountain
  mode starts with Obsidian's Tab for every element; your earlier choices
  carry over to script mode. The Tab and Enter keys settings have
  sub-headings: At the end of a line, and Inside a line.
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
- The settings page is reorganized for writers: Getting started, Writing,
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

- Enter with the cursor before the `)` of a character extension
  (`BOB (V.O.|)`) did nothing; it now goes on to the dialogue line.
- Strict: Enter at the start of an action paragraph with a blank line
  above did nothing; the paragraph now moves down, as in Fade In.
- Tab or Shift+Tab in an empty `()` under a character turns it into the
  dialogue line, as in Fade In.
- Two reloads of Scribidian at once (Hot Reload plus a manual reload) no
  longer leave a hidden second copy loaded, which made every later reload
  stop partway with missing commands and panels until Obsidian restarted.

- Enter right before the `)` of a wryly (`(beat|)`) no longer splits it
  onto two lines; it goes on as from the end of the wryly.

- One Ctrl+Z undoes Enter on an empty `()`, Enter or Tab under an empty
  `()`, and Enter on a lower-case `cut to:` (each took two).
- Two reloads of Scribidian at once (Hot Reload and a manual reload) no
  longer leave a second copy of its editor setup, which stopped settings
  from redrawing editors until Obsidian restarted.
- Enter and Tab are faster in long scripts: they share the layout's reading
  of the note instead of each reading it again. Enter after dialogue and
  Tab after action now open their list in the same edit as the new line,
  instead of two or three edits in a row (about 3 times faster in a long
  script).

- Enter splitting a dialogue line no longer leaves a space at the end of
  the line above (`Hi |there.` gives `Hi`, not `Hi `).

- Strict: Enter at the start of the first dialogue line, right under the
  cue, no longer adds a blank line there (the cursor showed indented, and
  Backspace then broke the speech into action). It does nothing, as under
  a wryly.
- Strict: Backspace or Delete on the blank line Enter adds inside a speech
  removes the whole line, instead of leaving an empty line that ends the
  speech or `  Never.` indented.
- A line set to action (Escape, Shift+Tab) gets the slugline list again
  when a scene type is typed (`IN`).
- A line set to dialogue that starts with `(` is laid out as a wryly.
- A picked character whose name has lower case (`McCLANE`) keeps its `@`.
- Faster typing in long scripts: line comments are found without copying
  every character, arrow keys no longer re-read the note for threads, and
  `$` highlights don't rebuild on cursor moves (an 11,000-line script went
  from 30–49 ms to 24–28 ms a key).

- Typing at the end of a cue already in the script (`HELIOS` with its
  dialogue below) is in capitals, so the cue stays a cue.
- Strict: Backspace or Delete on an empty `()` in the middle of a speech
  joins the dialogue back into one line, exactly as before the Tab that
  split it (Tab now keeps the space at the split, at the end of the line
  above).
- Strict: Delete on the blank line under a name in capitals (or Backspace
  at the start of the line below) makes the name a cue with that line as
  its dialogue, instead of joining them as action (`GEORGE Mm.`).
- Tab and Enter no longer produce improper formatting (from a survey of
  Tab/Enter chains): Enter doesn't stack blank lines or leave unfinished
  sluglines (strict); an empty "()" is never left behind; no empty line
  between a wryly and its dialogue; Tab after "INT." opens the location
  list instead of adding " - "; in Fountain mode, Tab never inserts tab
  characters, Enter keeps "()" and speeches whole, and no wryly goes under
  a wryly.

- With strict on, deleting a selection that cuts into a slugline, cue,
  wryly or transition deletes those elements whole (no lone ")").
- "$" variables with hyphens ("$dead-teacher-name") are highlighted whole.

- With strict on, Enter in the middle of action starts a new paragraph
  (blank line between) instead of a plain line break.

- Tab under an empty "()" (or under a wryly) no longer adds a second wryly:
  under an empty "()" Tab and Enter drop it and go to a new character.

- Shift+Enter in the middle of a character name line keeps the moved text a
  character line, in capitals.
- Suggestion lists near the right edge of the editor (transitions) move
  left instead of being cut off.
- Pressing Tab very fast after a slugline's " - " no longer indents the line.
- Spaces typed at the start of an empty line are no longer removed by the
  first letter (that only applies to a blank dialogue line in a speech).
- Notes over several lines (`[[ ... ]]`) are read as notes, not action.
- Boneyards (`/* ... */`) show every `*` as typed. Obsidian used to hide
  them as Markdown emphasis unless the cursor was next to them.
- Script mode: text in a fenced code block keeps Obsidian's own look and
  line height; script layout applies only inside a ```fountain block.
- Script mode: a character cue whose text is deleted stays a cue line (list
  open, capitals); an empty line after a speech with text right below no
  longer shows as the next cue or turns that text into dialogue; a pasted
  name in the character column is put in capitals.
- Strict: Ctrl+Backspace that clears a line's words no longer moves the
  cursor to the line above (typing used to join the character's name).
- Deleting back into an empty part reopens its list: wrylies in "()",
  locations after "INT. ", times after " - ", extensions after "(".
- A forced character cue with no letters (`@123`, `@???`) is a cue, as
  Fountain allows; it used to be read as action.
- Script mode: an empty line shown in the character column always opens the
  character list and types in capitals, however the cursor got there
  (before, deleting back to it showed the column with no list, and typing
  made action).
- Script mode: Shift+Enter starts a new line of the same element as the
  line the cursor was on (after dialogue, the cursor stays in the dialogue
  column).
- Script mode, strict: deleting a whole selected character cue right after
  another speech removes the cue and the blank line, so its dialogue carries
  on the speech above (as in Fade In), instead of leaving an empty cue line. After action, only the cue line goes and its dialogue stays as a
  separate action line.
- Script mode: fenced code blocks keep Obsidian's inner margin (the text no
  longer touches the block's left edge), with the same margin on the right.
- Script mode, strict: Enter at the start of a dialogue line inside a speech
  adds an empty dialogue line (two spaces, Fountain's blank line in
  dialogue) instead of ending the speech, as in Fade In.
- Scenes panel: Synopsis, Up, Down, Move and New scene work in scripts with
  Markdown headings (Fountain sections), fenced code blocks or dual
  dialogue. A scene ends before the next section heading. A grayed-out
  button says why on hover.
- Script mode, strict: Enter at the end of a line in the middle of a speech
  (with a wryly or more dialogue below) no longer cuts the speech in two; it
  does nothing.
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
  text styles). Colors, dark mode and text size still follow the theme.
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
- Recognize current screenplay properties while metadata catches up, and show
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
  and recent-item modules while preserving its existing behavior.
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
