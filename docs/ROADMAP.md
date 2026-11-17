# Roadmap

## Plan

1. **0.1.x betas.** Friends install through BRAT or by hand, and report
   problems. Fix what they find.
2. **Directory submission.** Once friend testing is done, submit to the
   Obsidian community directory (community.obsidian.md).
3. **1.0.0.** Release after the directory accepts it and the device checks
   below are recorded.

**Themes.** Supported: Obsidian's Default theme and Minimal, on desktop and
phone. Other themes are best effort. In screenplay notes Scribidian locks the
layout (font, 60-character column, indents, spacing, alignment) so most themes
work without testing; themes keep colours, dark mode and text size.

**Languages.** Scribidian supports languages written in the Latin alphabet
(English, Spanish, French, German and so on). Right-to-left scripts (Hebrew,
Arabic) and scripts without capital letters (Chinese, Japanese, Korean) are out
of scope for now. Contributions are welcome from people who write screenplays in
those languages.

Scribidian has no PDF export (removed 2026-11-17). Writers export Fountain
(or FDX), import it into Final Draft, Fade In or another screenplay app for
last looks, and make the PDF there. Fountain export is the export priority;
FDX improvements come after it (see Export at the end).

## Planned work

- **Smart Tab on phones.** Done (2026-11-15): commands **Smart Tab** and
  **Smart Tab back** for the mobile toolbar. Still to check on a real phone.
- **Clear boundary between the editor modes.** Done (2026-11-15): plain mode
  never changes Enter; see [Editor modes](EDITOR_MODES.md).
- **Strict typing in script mode.** See the plan below.

## Strict typing plan

Goal: script mode types like Final Draft or Fade In, while plain mode stays
free (suggestions and Smart Tab only). The file is always plain Fountain; the
strictness is only in how typing behaves. The current split between the modes
is in [Editor modes](EDITOR_MODES.md).

**Phase 1: the biggest gain**

- **Every Enter goes somewhere.** Slugline → action, character →
  dialogue, dialogue → next character, wryly → dialogue, transition →
  slugline, action → action. Today Smart Enter covers some of these.
- **Scribidian manages blank lines.** Enter adds the blank line Fountain needs;
  Backspace on it removes the pair. No typing or deleting blank lines by hand.
- **Capitals as you type** on character names. Sluglines and
  transitions already do this (settings per mode).
- **Show the current element** (status bar on desktop, near the toolbar on
  phones), with a way to change it.
- **Per-note switch** between script and plain mode (command and status-bar
  toggle), instead of only the global setting.

**Phase 2**

- Hide Fountain markers (`@`, `!`, `.`, `>`) when the cursor is off the line.
- Keep intent: an all-caps action line gets `!` so it isn't read as a
  character (#69); `(` in dialogue starts a wryly and closes it.
- Tidy pasted text (indents, blank lines).

**Phase 3**

- Live page breaks with page numbers; (MORE) and (CONT'D) shown in the editor.
- An optional shortcut preset matching Final Draft's element keys.

**Risks to design for:** phone keyboards and autocorrect (as in the earlier
composing fix), clean Undo for every automatic change (#23), plugins that also
use Enter and Tab (Outliner), and wrong guesses: every automatic change needs an
obvious way back, such as Backspace undoing what was just added.

**Decided (2026-11-15):** every text change while typing gets a setting for
each mode, on in script mode and off in plain mode by default. New strict-typing
changes follow the same pattern. A command switches modes globally; a per-note
switch is still planned (Phase 1).

## Possible issues

Problems users might run into. None of these has been reported by anyone else
yet. Most have only been reasoned about from the code, not seen.

Each issue was tested where possible on 2026-11-15: unit tests, or live in
Obsidian on Windows desktop. **Human test** marks what needs a person, and on
which device. A checklist for testers is at the end of this section.

- **Effort:** S = under an hour, M = a few hours, L = a day or more.
- **Device:** the issue can only be confirmed or fixed on that kind of device.
- **Result:** what testing found.

### Every phone and tablet (iPhone, iPad, Android)

| #   | Possible issue                                                                                                                                                                                                           | Effort | Device | Result                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Smart Tab, Shift+Tab and Escape can't be used (see Planned work).                                                                                                                                                        | S      | —      | **Fixed:** new commands **Smart Tab** and **Smart Tab back** run Tab and Shift+Tab, for the mobile toolbar. Tested on desktop. **Human test** on a phone.                                                                  |
| 2   | The suggestion list (characters, locations, transitions) may sit under the on-screen keyboard or be cut off near the bottom of the screen.                                                                               | M      | Phone  | **Human test** on a phone.                                                                                                                                                                                                 |
| 3   | The Scenes panel and Continuity Inspector may be cramped or cut off on a narrow screen.                                                                                                                                  | M      | Phone  | **Human test** on a phone.                                                                                                                                                                                                 |
| 4   | Slow start-up and typing on long scripts on older phones. Done in part (2026-11-17): PDF export is removed and `main.js` dropped from 3.6 MB to about 0.17 MB.                                                           | M–L    | Phone  | Desktop: Scribidian reloads in 0.44 s, and a 120-page script (5,850 lines) is read and laid out in about 5 ms. Phones are often 5–10 times slower. **Human test:** start-up and typing in a long script on an older phone. |
| 5   | Courier Prime (the default font) isn't installed on phones. iPhone falls back to Courier or Courier New, Android to its own monospace font. Line widths and the page estimate in the status bar may then look a bit off. | S      | Phone  | **Human test** on a phone: compare line widths with desktop.                                                                                                                                                               |
| 6   | The typing margin at the bottom may not be enough to keep the cursor above the keyboard. Keyboards and toolbars differ between iPhone and Android.                                                                       | S–M    | Phone  | **Human test** on iPhone and Android.                                                                                                                                                                                      |
| 7   | Testers won't know how to set up the mobile toolbar. Needs a short guide.                                                                                                                                                | S      | —      | **Fixed:** toolbar steps are in `docs/MOBILE_TESTING.md`.                                                                                                                                                                  |
| 8   | `docs/MOBILE_TESTING.md` still describes First Draft 0.13.1 and old BRAT steps. Rewrite it for Scribidian 0.1.x.                                                                                                         | S      | —      | **Fixed:** rewritten for Scribidian 0.1.x.                                                                                                                                                                                 |

### iPhone and iPad

| #   | Possible issue                                                                                                                                                                                                                                                                                                                                                           | Effort | Device | Result                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | **Smart Punctuation** (on by default) turns `'` into `’`, `"` into `“ ”` and `--` into `—`. A character typed as `O'BRIEN` on desktop and `O’BRIEN` on iPhone might then show as two different characters in suggestions, and `--` written as a dash would change. Turning Smart Punctuation off is a workaround. Treating both kinds of quote as the same would fix it. | S–M    | iPhone | **Fixed:** `O'BRIEN` and `O’BRIEN` now count as one character. `--` still becomes `—`; the mobile guide says how to turn Smart Punctuation off. |
| 10  | **Autocorrect and auto-capitalize** may fight Scribidian. The iPhone keyboard can change `INT` to `Int`, or "correct" an unusual character name after Scribidian has uppercased it. The iPhone keyboard also sends text differently from Android's, so the recent Android typing fix may not cover it.                                                                   | M      | iPhone | **Human test** on iPhone.                                                                                                                       |
| 11  | Dictation adds whole phrases at once, so line-start capitalization and transition uppercasing may act in unexpected ways.                                                                                                                                                                                                                                                | S      | iPhone | **Human test** on iPhone.                                                                                                                       |
| 12  | Tapping dual dialogue to edit it relies on mouse events that iOS only imitates. It may need a double tap, or may select text instead.                                                                                                                                                                                                                                    | S      | iPhone | **Human test** on iPhone.                                                                                                                       |
| 13  | iCloud Drive vaults: iOS may not have downloaded every file yet, so the character and location lists can be incomplete. Scribidian's own writes (marking character pages, Scenes panel moves) can create sync conflicts.                                                                                                                                                 | M      | iPhone | **Human test** on iPhone with an iCloud vault.                                                                                                  |
| 14  | Installing on iPhone is only possible through BRAT until Scribidian is in the directory. Copying files by hand is impractical. Needs clear steps for friends.                                                                                                                                                                                                            | S      | —      | **Fixed:** BRAT steps for iPhone are in `docs/MOBILE_TESTING.md`.                                                                               |
| 15  | iPad with a hardware keyboard: check that Tab reaches Scribidian and isn't used by iPadOS to move focus.                                                                                                                                                                                                                                                                 | S      | iPad   | **Human test** on iPad with a keyboard.                                                                                                         |

### Mac

| #   | Possible issue                                                                                                                                                                                                                                                       | Effort | Device | Result                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16  | Typing Japanese, Chinese or Korean with a Mac input method, or using press-and-hold accents: pressing Enter to confirm a word must not also run Scribidian's Enter (new dialogue line and so on). Pickers already check for this. The editor needs a check on a Mac. | S      | Mac    | **Human test** on a Mac with Japanese or Chinese input (Windows input methods untested too).                                                                             |
| 17  | macOS file names ignore upper and lower case. `Scene.md` and `scene.md` count as the same file, so creating scene or character pages could collide where Windows wouldn't.                                                                                           | S      | Mac    | **Fixed for files:** a new character page or example folder now picks another name instead of failing. A characters folder that differs only in case is not handled yet. |
| 18  | Courier Prime isn't installed by default. Courier and Courier New are, so this is cosmetic.                                                                                                                                                                          | S      | —      | No test needed.                                                                                                                                                          |
| 19  | Writers may assign hotkeys that macOS already uses (Cmd+Option combinations, for example). Scribidian sets no default hotkeys, so this only needs a note in the docs.                                                                                                | S      | —      | **Confirmed:** Scribidian sets no default hotkeys. Docs note only.                                                                                                       |

### All platforms

| #   | Possible issue                                                                                                                                           | Effort | Device | Result                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 20  | Themes other than Default and Minimal (AnuPpuccin, Things, Blue Topaz…) may break side margins or line centring, like the mobile margin bug.             | M      | —      | **Mostly covered by the layout lock** (2026-11-15). What themes can still affect: colours (#54), Markdown styling (#49), inline text (#58), code blocks (#56), phone margins (#57). **Human test:** 2–3 popular themes, for those only.    |
| 21  | Other plugins that also use Tab or Enter (Outliner, Various Complements, Templater, Natural Language Dates) may conflict with Smart Tab and suggestions. | M      | —      | This vault runs Outliner, Templater and Natural Language Dates with no known clash. **Human test:** Various Complements and Vim mode.                                                                                                      |
| 22  | Dropbox and Syncthing conflicted copies of a screenplay give the character and location lists duplicate entries.                                         | S      | —      | **Not a bug for suggestions:** lists come only from the open script or its project's listed parts. **Human test:** a conflicted copy of a character page may show twice in character lists.                                                |
| 23  | Undo after line-start capitalization removes the letter entirely instead of making it lowercase again.                                                   | S      | —      | **Confirmed.** One Undo removes the capital letter and what was typed with it. There is no step back to lowercase.                                                                                                                         |
| 24  | Line-start capitalization also applies inside code blocks and at the start of a URL in screenplay notes.                                                 | S      | —      | **Fixed for code blocks:** no capital letters inside ``` or ~~~ blocks (tested live). A line starting `www.` is still capitalized, since the first letter is typed before it looks like a web address.                                     |
| 25  | Right-to-left languages (Hebrew, Arabic) in centred character and dialogue lines haven't been tried.                                                     | M      | —      | **Out of scope.** Scribidian supports languages written in the Latin alphabet. Right-to-left and other scripts are open to contributions from people who write screenplays in them. `@NAME` already forces a character name in any script. |
| 42  | The status bar's scene count says "1 scenes" instead of "1 scene". Found while testing.                                                                  | S      | —      | **Fixed:** "1 scene", "1 word" (tested live).                                                                                                                                                                                              |

### Seen in similar plugins

Bugs reported against other Obsidian screenplay plugins that could also affect Scribidian. Not yet checked against Scribidian unless noted.

| #   | Possible issue                                                                                                                                                                                                                                       | Effort | Device | Reported in                                                                                                                                                                                                                                                                  | Result                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26  | Another plugin already opens `.fountain` files (obsidian-fountain, Custom File Extensions). Scribidian registers `.fountain` at start-up without checking, which Obsidian refuses, so Scribidian may fail to load at all. Fix: catch it and explain. | S      | —      | [obsidian-fountain #3](https://github.com/bgrundmann/obsidian-fountain/issues/3)                                                                                                                                                                                             | **Fixed:** Scribidian now loads anyway and shows a notice (tested live by claiming `.fountain` first).                                                                                                                       |
| 27  | Obsidian comments not fully recognised: a one-line `%%note%%` inside a speech, or a comment that starts with text on the same line (`%% to do`), can throw off the layout of the lines after it.                                                     | S      | —      | [Fountain Editor #57](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/57)                                                                                                                                                                                     | **Fixed:** comments that open with text (`%% to do`) and one-line comments inside a speech are handled, in the layout and in suggestions and statistics. `/* boneyard */` is ignored too.                                    |
| 28  | Embeds in a screenplay note (images, audio, canvas, missing files) may break the layout in Live Preview until the note is reopened.                                                                                                                  | S–M    | —      | [Fountain Editor #25](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/25)                                                                                                                                                                                     | **Partly confirmed:** an embed right after a dialogue line is laid out as dialogue. **Human test:** how it looks, and whether layout breaks after leaving the line.                                                          |
| 29  | Fountain notes `[[like this]]` inside action or dialogue are Obsidian links in Markdown notes. Clicking one creates an empty note, and they fill the graph and unresolved-links list. Multi-line notes aren't recognised.                            | M      | —      | [Fountain Editor #40](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/40), [obsidian-fountain #43](https://github.com/bgrundmann/obsidian-fountain/issues/43)                                                                                                 | **Moved to the deep backlog** (export): the planned fix is export options for how wikilinks are handled. In the editor they stay Obsidian links.                                                                             |
| 30  | Parts of a note that aren't screenplay (Markdown text, headings, properties, callouts) might pick up the screenplay font.                                                                                                                            | S      | —      | [Fountain Editor #38](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/38)                                                                                                                                                                                     | **By design:** the whole note, including Markdown headings and paragraphs, uses the screenplay font, and paragraphs are laid out as action. Properties keep the normal font. Only matters for notes mixing prose and script. |
| 31  | Character names wrapping one letter per line in a narrow pane (split view, sidebar, phone).                                                                                                                                                          | S      | —      | [Fountain Editor #63](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/63)                                                                                                                                                                                     | **Not reproduced** at 220 px wide: names stay on one line. **Human test** on a phone.                                                                                                                                        |
| 32  | Accented and non-Latin names (ÉTIENNE, Cyrillic, names with `_`) not detected as characters. Scribidian uses Unicode letter classes, so likely fine; add tests to make sure.                                                                         | S      | —      | [Fountain Editor #28](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/28), [Fountain Editor #64](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/64), [Fountain Editor #68](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/68) | **Fine** for accented Latin names (ÉTIENNE) and names with `_`. Cyrillic names happen to work too, but only the Latin alphabet is supported (see #25).                                                                       |
| 33  | The same screenplay open in two panes (script beside the Scenes panel or a second tab): typing in one may disrupt the other.                                                                                                                         | S–M    | —      | [obsidian-fountain #36](https://github.com/bgrundmann/obsidian-fountain/issues/36)                                                                                                                                                                                           | **Not reproduced:** typing in one pane shows in the other with the right layout.                                                                                                                                             |
| 34  | Obsidian's word count (and Better Word Count) not updating while typing in `.fountain` files.                                                                                                                                                        | S      | —      | [obsidian-fountain #42](https://github.com/bgrundmann/obsidian-fountain/issues/42)                                                                                                                                                                                           | **Not reproduced** on desktop with Better Word Count. **Human test:** Obsidian's own word count, and on a phone.                                                                                                             |
| 35  | Scene lists losing their scroll position after clicking a scene. Check the Scenes panel.                                                                                                                                                             | S      | —      | [obsidian-fountain #41](https://github.com/bgrundmann/obsidian-fountain/issues/41)                                                                                                                                                                                           | **Human test** on desktop with a long script.                                                                                                                                                                                |
| 36  | `.fountain` files not showing on iPhone. Check that Scribidian's `.fountain` support works on iOS.                                                                                                                                                   | S      | iPhone | [obsidian-fountain #29](https://github.com/bgrundmann/obsidian-fountain/issues/29)                                                                                                                                                                                           | **Human test** on iPhone.                                                                                                                                                                                                    |
| 37  | Vim mode: Smart Tab, Enter and Escape may clash with Vim keys (Escape especially).                                                                                                                                                                   | S      | —      | [obsidian-fountain #33](https://github.com/bgrundmann/obsidian-fountain/issues/33)                                                                                                                                                                                           | **Human test** on desktop with Vim mode on (it's off in this vault).                                                                                                                                                         |
| 38  | Spell check missing in `.fountain` files, or every character name flagged as a misspelling.                                                                                                                                                          | S      | —      | [obsidian-fountain #19](https://github.com/bgrundmann/obsidian-fountain/issues/19)                                                                                                                                                                                           | Spell check is on in screenplay notes. **Human test:** whether character names get flagged.                                                                                                                                  |
| 39  | Reading view: screenplay notes may not look like a screenplay there.                                                                                                                                                                                 | M      | —      | [Fountain Editor #49](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/49)                                                                                                                                                                                     | **Human test.** Couldn't test: Reading view doesn't render while the Obsidian window is hidden.                                                                                                                              |
| 40  | Embedding a screenplay note in another note (`![[Script]]`) loses the screenplay layout.                                                                                                                                                             | M      | —      | [Fountain Editor #67](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/67)                                                                                                                                                                                     | **Likely:** the embedded note got no Scribidian styling. **Human test:** confirm by eye.                                                                                                                                     |
| 41  | "Failed to install" from the directory or BRAT. Cause unknown in the other plugin; Scribidian's 3.4 MB `main.js` makes slow downloads more likely.                                                                                                   | S      | —      | [Fountain Editor #61](https://github.com/chuangcaleb/obsidian-fountain-editor/issues/61)                                                                                                                                                                                     | **Human test:** install through BRAT on a slow connection.                                                                                                                                                                   |

### Themes and appearance settings

Tested on 2026-11-15 by switching settings for a moment in a test note, or by adding a theme's kind of CSS and removing it again. Most theme problems came from one gap: Scribidian reset the width, maximum width and margins of each line, but not text indent, line font, or the padding and width of the editor content. The layout lock (2026-11-15) closes it.

| #   | Possible issue                                                                                                                                                                                                                                                  | Effort | Device | Result                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 43  | A theme or snippet indents the first line of each paragraph (`text-indent`, common in book-style themes). Every screenplay line shifts right.                                                                                                                   | S      | —      | **Fixed** by the layout lock (re-tested: names stay at 36.7%).                                                                                                              |
| 44  | A theme sets its font on each editor line rather than on the editor. That beats Scribidian's screenplay font.                                                                                                                                                   | S      | —      | **Fixed** by the layout lock (re-tested: Courier kept, also when a theme sets the font on the content).                                                                     |
| 45  | A theme narrows the editor's content area on its own (`.cm-contentContainer`). The 60-character column no longer fits.                                                                                                                                          | S      | —      | **Fixed** by the layout lock (re-tested).                                                                                                                                   |
| 46  | A theme adds side padding to the editor content. Indents are measured from the wrong edge.                                                                                                                                                                      | S      | —      | **Fixed** by the layout lock (re-tested).                                                                                                                                   |
| 47  | A theme forces line padding with `!important`. All screenplay indents disappear.                                                                                                                                                                                | S      | —      | **Fixed** by the layout lock (re-tested with `!important`).                                                                                                                 |
| 48  | A theme justifies text. Dialogue and action get uneven word spacing.                                                                                                                                                                                            | S      | —      | **Fixed** by the layout lock (re-tested with simulated justified text).                                                                                                     |
| 49  | Live Preview treats some screenplay lines as Markdown. `> CUT TO:` is a blockquote, a line starting `- ` or `1. ` is a list with a bullet or number, and a line starting `#` is a heading. Themes that draw quote bars or list markers show them in the script. | S–M    | —      | **Confirmed:** the transition line carries Obsidian's quote styling and the `- ` line its list styling (Minimal draws no quote bar, so it looked fine here).                |
| 50  | Core settings that change the editor: readable line length off, line numbers, fold indicators off, Source mode, the Default theme, letter spacing.                                                                                                              | S      | —      | **Not reproduced:** the layout stayed correct with each one.                                                                                                                |
| 51  | Right-to-left editor setting (Settings → Editor).                                                                                                                                                                                                               | S      | —      | **Out of scope** with right-to-left languages (see #25).                                                                                                                    |
| 52  | Minimal's page-width options: `wide` and `max` cssclasses, Minimal Settings line widths, focus mode.                                                                                                                                                            | S      | —      | **By design now:** the layout lock keeps the script at 60 characters whatever Minimal's width options say. **Human test:** that a script in a `wide` note doesn't look odd. |
| 53  | Bigger or smaller text: Minimal's text size, Obsidian's font size, zoom (Ctrl/Cmd +/−).                                                                                                                                                                         | S      | —      | The lock follows the theme's text size, so this should be fine. **Human test:** the column stays 60 characters at any size, on desktop and phone.                           |
| 54  | Dark mode and colour schemes: page-break lines and notes use theme colours and could be hard to see.                                                                                                                                                            | S      | —      | **Human test:** look at a script in light and dark.                                                                                                                         |
| 55  | Heading styles (Minimal's colourful headings, your `headings` snippet) apply to Markdown headings inside screenplay notes.                                                                                                                                      | S      | —      | **By design.** Only Markdown headings are affected, not Fountain lines.                                                                                                     |
| 56  | Fountain code blocks in other notes pick up the theme's code-block look (background, smaller text, sideways scrolling instead of wrapping).                                                                                                                     | S      | —      | Open, and now the weak spot: the layout lock covers the editor, not Fountain code blocks in other notes. **Human test** in Reading view with two or three themes.           |
| 57  | Phone margins in other themes. Scribidian's mobile margin fix reads Minimal's `--max-width`. A theme that makes phone margins another way would get the old too-close-to-the-edge look.                                                                         | S–M    | Phone  | **Human test** on a phone with the Default theme and one other.                                                                                                             |

### After the layout lock

Reviewed again on 2026-11-15 after Scribidian started locking the screenplay layout. Updated results are in the tables above. These are new possible issues the lock brings, or leaves.

| #   | Possible issue                                                                                                                                                                                                                                          | Effort | Device | Result                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 58  | Inline text inside script lines (links, tags, inline code, bold, italic, highlights) isn't covered by the lock. A theme can give it another font, size or spacing, which changes where lines wrap.                                                      | S–M    | —      | **Fixed:** inline text in script lines uses the line's font, size and spacing (tested live: tags and inline code now 14 px Courier). |
| 59  | Your own CSS snippets for screenplay notes (bigger indents, another script font) no longer work unless they use `!important`.                                                                                                                           | S      | —      | **By design.** Explained in the README's Tips section.                                                                               |
| 60  | Plugins or theme options that widen notes (editor-width sliders, Minimal's `wide` and `max`) can't widen a script.                                                                                                                                      | S      | —      | **By design.** Explained in the README's Tips section.                                                                               |
| 61  | Accessibility fonts set through a snippet (for example a dyslexia-friendly font) don't reach scripts.                                                                                                                                                   | S      | —      | **By design.** The README points to Scribidian's Screenplay font setting.                                                            |
| 62  | The directory review may question the 28 `!important` flags in `styles.css`.                                                                                                                                                                            | S      | —      | Unknown. **Human:** see what the review says, and explain the lock if asked.                                                         |
| 63  | The lock depends on Obsidian's internal class names for the editor (`.cm-sizer`, `.cm-contentContainer`, `HyperMD-list-line`). An Obsidian update that renames them would break the layout. This was already true, but the lock relies on more of them. | S      | —      | **Human test** after each Obsidian update. The live measuring used for these tests could become a repeatable check.                  |

### Workflow, other plugins and Fountain rules

Found on 2026-11-15 by testing Fountain edge cases, the plugins in this vault, and turning Scribidian off and on.

| #   | Possible issue                                                                                                                                                                                                                                                                            | Effort | Device | Result                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 64  | **Linter** (a popular plugin, on in this vault with lint on save) rewrites scripts when it runs, `.fountain` files included. It adds YAML properties and a file-name heading to the top, deletes two-space lines, squeezes double spaces and blank lines, and renumbers section headings. | M      | —      | **Confirmed** with Linter's Lint file command. **Documented:** the README says to add screenplay folders to Linter's Folders to ignore. **Human test:** Ctrl/Cmd+S in a script with lint on save on. |
| 65  | **Natural Language Dates** (and any plugin triggered by `@`) opens a date list when you type `@`, which Fountain uses to force a character name (`@McCLANE`).                                                                                                                             | S      | —      | **Confirmed.** **Documented** in the README and mobile guide.                                                                                                                                        |
| 66  | Forced action (`!` at the start of a line) is laid out as action in the editor, but the rest of Scribidian ignores it. `!SPLASH` followed by a line counts as a character and dialogue, so `!SPLASH` turns up in character suggestions and statistics.                                    | S      | —      | **Fixed:** `!` lines are action everywhere.                                                                                                                                                          |
| 67  | A line holding only two spaces should keep a speech going (Fountain's rule for a blank line inside dialogue). Scribidian ends the speech there, so the rest becomes action.                                                                                                               | S–M    | —      | **Fixed:** a two-space line keeps the speech going, in the layout and in suggestions and statistics.                                                                                                 |
| 68  | A Fountain title page at the top of a script (`Title:`, `Author:`) is laid out as action in the editor.                                                                                                                                                                                   | S      | —      | **Confirmed** (unit test). Cosmetic; export reads it correctly.                                                                                                                                      |
| 69  | An all-caps action line followed by more text (`BANG!` then a line) is read as a character and dialogue.                                                                                                                                                                                  | S      | —      | **By design.** Explained in the README, and `!BANG!` now works everywhere (#66).                                                                                                                     |
| 70  | Sluglines in other languages (`INNEN.`, `EXT` words other than INT/EXT/EST/I/E) aren't recognised, and transitions that don't end in `TO:` (`FADE OUT.`, `SMASH CUT TO BLACK.`) are action.                                                                                               | S      | —      | **By design.** Explained in the README.                                                                                                                                                              |
| 71  | Turning Scribidian off.                                                                                                                                                                                                                                                                   | S      | —      | **Clean.** The README explains the file-list setting.                                                                                                                                                |
| 72  | Phones have no status bar, so page count, runtime, word count and scene count can't be seen on a phone.                                                                                                                                                                                   | M      | Phone  | **Human test** on a phone. Obsidian's mobile app hides the status bar.                                                                                                                               |
| 73  | Friends switching from First Draft. With both plugins on, both claim `.fountain` (#26), both lay out the editor, and commands appear twice. Hotkeys and settings don't carry over, because the command names and settings file are new.                                                   | S–M    | —      | **Documented** in the README and mobile guide. **Human test** with both plugins installed.                                                                                                           |
| 74  | Smart Tab with text selected or with several cursors, and how Undo handles Smart Tab and suggestion changes.                                                                                                                                                                              | S      | —      | **Human test** on desktop.                                                                                                                                                                           |
| 75  | Pasting a script copied from a PDF, with spaces or tabs in front of each line.                                                                                                                                                                                                            | S      | —      | **Not a bug:** character names and dialogue are still recognised.                                                                                                                                    |

### Workload

- **75 possible issues:** 53 small, 21 medium, 1 medium-to-large.
- **Fixed (19):** 1, 7, 8, 9, 14, 17 (files), 24 (code blocks), 26, 27, 42,
  43, 44, 45, 46, 47, 48, 58, 66, 67.
- **Confirmed, open (5):** 23, 49, 64 (documented), 65 (documented), 68.
  Partly: 28.
- **Out of scope or moved to the export backlog (2):** 25 (non-Latin
  scripts), 29 (wikilinks).
- **Not a bug, by design, or not reproduced (17):** 19, 22 (suggestions), 30,
  31, 32, 33, 34 (desktop), 50, 52, 55, 59, 60, 61, 69, 70, 71, 75.
- **Need a human (rest):** see the checklist.

### Human test checklist

- **iPhone:** 1 (Smart Tab on the toolbar), 2, 3, 4, 5, 6, 9 (Smart Punctuation on?), 10, 11, 12, 13
  (iCloud vault), 31, 34, 36, 41, 57, 72.
- **iPad with keyboard:** 15.
- **Android phone:** 1, 2, 3, 4, 5, 6, 31, 34, 57, 72.
- **Mac:** 16 (Japanese or Chinese input).
- **Other:** 62 (directory review), 63 (after each Obsidian update).
- **Any desktop:** 20 (themes), 21 (Various Complements), 22 (conflicted
  character pages), 28 (embeds), 35 (long script
  scroll), 37 (Vim), 38 (spell check), 39 (Reading view), 40 (embedded
  script), 52 (script in a `wide` note), 53 (text size and zoom), 54 (light and dark), 56 (code blocks in other
  themes), 64 (Ctrl/Cmd+S with Linter), 73 (First Draft and Scribidian
  together), 74 (Smart Tab with a selection, Undo).

## Internal inconsistencies

Found on 2026-11-15 by reading the code and docs and by testing the parser and the editor layout side by side. #76–83 were fixed on 2026-11-16.

### Fountain rules: the editor layout and the parser disagree

Fixed on 2026-11-16: the editor layout, the parser, Smart Tab and the cue checks now share one set of line rules (`src/screenplay/lines.ts`), tested side by side in `tests/lines.test.ts`.

| #   | Inconsistency                                                                                                                                                                                                                                                                                           | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 76  | Done. A cue with a lowercase extension (`JANE (v.o.)`): the layout shows a character, the parser reads action, so JANE is missing from suggestions and statistics.                                                                                                                                      | S      |
| 77  | Done. `CUT TO:` followed straight by the next line: the layout shows a transition, the parser reads a character named "CUT TO:", which then appears in character suggestions.                                                                                                                           | S      |
| 78  | Done. Centered text (`> THE END <`): the layout centres it; the parser has no centered element and reads action with the markers, so PDF export would print `> THE END <`.                                                                                                                              | S–M    |
| 79  | Done. Page break (`===`): the layout draws a page break; the parser reads action `===` (counted, and printed in PDF).                                                                                                                                                                                   | S      |
| 80  | Done. Sections (`# ACT ONE`) and note lines (`[[...]]`): the layout leaves them out of the script; the parser reads them as action (counted, printed).                                                                                                                                                  | S      |
| 81  | Done. An unclosed wryly on its own line (`(whispering`): the layout shows a wryly, the parser reads dialogue.                                                                                                                                                                                           | S      |
| 82  | Done. A Markdown heading inside a speech: the layout ends the speech, the parser keeps it as dialogue.                                                                                                                                                                                                  | S      |
| 83  | Done. Character cues and transitions are decided in four places (parser, layout classifier, Smart Tab, cue checker), and they disagree: `FADE OUT.` is a cue for Smart Tab but not for the cue checker. Front matter is also found four different ways. One shared line classifier would remove #76–83. | M–L    |

### Typing behaviour across elements

| #   | Inconsistency                                                                                                                                                                                                                                                           | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 84  | Sluglines and `>` transitions are uppercased as you type, but character names aren't. Worse, first-letter capitalization turns `jane` into `Jane`, which is no longer read as a character. Natural transitions (`cut to:`) aren't uppercased either; only `>` ones are. | S–M    |
| 85  | The per-mode text-change settings only cover typing. Smart Tab, Smart Enter, suggestions and the Set line commands still uppercase headings and names in both modes, whatever those settings say.                                                                       | S–M    |
| 86  | Shift+Tab and Escape (turn the empty next-cue line into action) only work in script mode and only on that one line. The command "Smart Tab back" sounds like the reverse of Smart Tab, but in plain mode it runs Obsidian's outdent.                                    | S      |
| 87  | Pickers are uneven: commands exist for Character, Wryly, Character extension and Transition; sluglines only through New scene.                                                                                                                                          | S      |

### Menus and the cursor's column (script mode)

Tested live on 2026-11-17 with a script of ~50 typing scenarios (each
keystroke checks which column the line is in and which list is open). Rule
the writer expects: the line sits in the column of the list that is open,
the slugline list never shows in the cue's column, and the cue's column only
appears once a character list (or a cue) is really being typed. Already
fixed that day: Tab after action with no characters, `IN` jumping to the
cue's column, Enter after a wryly, Backspace on an empty cue line.

| #   | Issue                                                                                                                                                                                                                                      | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 99  | Tab after action (the line goes to the cue's column), then type `IN`: the slugline list opens but the line stays in the cue's column. With or without characters in the script.                                                            | S      |
| 100 | Escape or Shift+Tab while the slugline list is open on `IN`: the list closes and the line jumps to the cue's column, the opposite of what the key means.                                                                                   | S      |
| 101 | A capitalised action word that starts like a scene type (`INTENSE MUSIC`): `IN`/`INT` show the slugline list at the left margin, then `INTE` closes it and the line jumps to the cue's column. The line moves twice while typing one word. | S–M    |
| 102 | Transitions typed without `>` (`CUT TO:`, `SMASH CUT TO:`, `FADE OUT.`) get no transition list, and sit in the cue's column until the `:` is typed, then jump right. Only `> ...` opens the transition list.                               | M      |
| 103 | `EST` is a valid slugline start but isn't in the slugline list: `ES`/`EST` sit in the cue's column with no list until `EST.` is typed.                                                                                                     | S      |
| 104 | After Escape or Shift+Tab turns the empty line into action, typing `INT` shows no slugline list (a line set to action gets no lists); it becomes a slugline only at `INT.`.                                                                | S      |
| 105 | A forced cue (`@`, `@j`) shows no character list, and `@j` stays at the action margin until a second letter.                                                                                                                               | S      |
| 106 | Done (2026-11-17): new setting **Character suggestions match capitals** (on by default). Off: a known name typed with a lowercase letter (`Je`) opens the character list and moves the line to the character column.                       | S      |

### Names and settings

| #   | Inconsistency                                                                                                                                                                                                                                                                                        | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 88  | "Screenplay mode" (a note counts as a screenplay: the settings group, `isScreenplayMode()`) and "script mode" (the editor display) are near-identical names for different things.                                                                                                                    | S      |
| 89  | Setting keys don't match their labels: `editorLayout` with values `screenplay`/`plain` is labelled Editor mode with script/plain mode; `smartTabEnabled` also switches Smart Enter.                                                                                                                  | S      |
| 90  | Command names follow no single pattern: some start "Screenplay:", some "Screenplay project:" or "Character:", some nothing ("Open scenes", "Inspect continuity"). "Export PDF" but "Export to Fountain". "Screenplay: Character" (a picker) sits beside "Set line to character" (an element change). | S      |
| 91  | Done: the First Draft view and command names are gone (the palette was removed) and the changelog names Scribidian.                                                                                                                                                                                  | S      |
| 92  | Two front matter conventions: screenplays use `screenplay: true`, character and project pages use `scribidian: character` / `scribidian: screenplay-project`.                                                                                                                                        | M      |

### Docs and code

| #   | Inconsistency                                                                                                                                                                                                         | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 93  | The README feature list still says the screenplay layout is "display only (Settings > Editor layout, or plain Fountain text)". The setting is now Editor mode, and script mode changes typing.                        | S      |
| 94  | The README writes commands in Title Case ("Scribidian: Create Example Screenplay", "Open Screenplay Cheat Sheet"); the real names are sentence case.                                                                  | S      |
| 95  | The roadmap plans wikilink options for export (#29), but clean Fountain export already has them (keep, unwrap or remove links, plus comments, tags, highlights and more). PDF and FDX export don't use those options. | S      |
| 96  | The editor font is a setting, but the page preview always uses Courier.                                                                                                                                               | S      |

### Code structure

| #   | Inconsistency                                                                                                                                                                                        | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 97  | New files written for Scribidian (`pressTab.ts`, `vaultPaths.ts`, `settingsMigration.test.ts`) carry "Copyright 2026 Christian Grobmeier" because the header check demands his header on every file. | S      |
| 98  | `main.ts` (about 790 lines) mixes commands, mode logic, settings loading and the status bar; `vaultPaths.ts` sits alone at the top of `src/` while other helpers live in folders.                    | M      |

## Export

**Fountain export is the priority.** The file must import cleanly into Final
Draft, Fade In, Highland and WriterSolo, so the writer can finish there.

- **Title page from note properties.** A Markdown screenplay's `title`,
  `author`, `credit` and so on show in the preview but are not written into
  the exported Fountain file as a title block. Check, and add them.
- **Round-trip test.** Export TIGHTER-sized scripts and import them into Final
  Draft and Fade In; list every element that changes type.

**FDX export, after Fountain.** FDX export writes only six element types
(see `docs/FDX_COMPATIBILITY.md`). Improve it: centered text, lyrics, notes,
dual dialogue, title page, scene numbers, and checking the file in Final
Draft itself.

The items below are older export ideas, not yet scheduled.

- **Wikilinks on export.** In Fountain, `[[...]]` is a writer's note; in
  Obsidian it's a link. Offer options for how wikilinks are handled when
  exporting (for example keep as Fountain notes, keep only the link text, or
  remove them). Comes from #29, a problem also met with other screenwriting
  apps.

- **Automatic (CONT'D) when a speaker resumes.** (CONT'D) is never offered as
  a suggestion. It should be filled in automatically, unlike (V.O.) and (O.S.),
  which the writer chooses. Add it on export when the same character speaks again
  after only action lines in the same scene. Don't add it after another
  character speaks, or after a new slugline. Leave the writer's text
  unchanged. Possibly offer a setting to turn it off.
- **Finding an exported file on a phone.** The export is saved in the vault,
  but a phone gives no easy way to find, open or share it. Could open it right
  away or say where it went. (S, phone)
- **Export files on a Mac.** File names that differ only in upper and lower
  case count as the same file on macOS, so exported files could overwrite each
  other. (S, Mac)
- **Export bugs seen in other plugins.** Forced-element markers (`@`, `.`)
  handled wrongly on export; highlighting one character's lines. [obsidian-fountain #31](https://github.com/bgrundmann/obsidian-fountain/issues/31), [obsidian-fountain #27](https://github.com/bgrundmann/obsidian-fountain/issues/27), [obsidian-fountain #38](https://github.com/bgrundmann/obsidian-fountain/issues/38), [obsidian-fountain #37](https://github.com/bgrundmann/obsidian-fountain/issues/37), [obsidian-fountain #23](https://github.com/bgrundmann/obsidian-fountain/issues/23).
