# Roadmap

## Plan

1. **0.1.x betas.** Friends install through BRAT or by hand, and report
   problems. Fix what they find.
2. **Directory submission.** Once friend testing is done, submit to the
   Obsidian community directory (community.obsidian.md).
3. **1.0.0.** Release after the directory accepts it and the device checks
   below are recorded.

Export (PDF, Fountain, FDX) is not a priority for these builds. Export work
lives in the deep backlog at the end.

## Planned work

- **Smart Tab on phones.** Phone keyboards have no Tab key, so Smart Tab,
  Shift+Tab and Escape can't be used on iPhone or Android. Add two commands,
  "Smart Tab" and "Smart Tab back", that do what Tab and Shift+Tab do. Writers
  can then put them on Obsidian's mobile toolbar (Settings → Mobile → Manage
  toolbar options). Desktop doesn't change.

## Possible issues

Problems users might run into. None of these has been reported by anyone else
yet. Most have only been reasoned about from the code, not seen.

- **Effort:** S = under an hour, M = a few hours, L = a day or more.
- **Device:** the issue can only be confirmed or fixed on that kind of device.

### Every phone and tablet (iPhone, iPad, Android)

| #   | Possible issue                                                                                                                                                                                                           | Effort | Device |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| 1   | Smart Tab, Shift+Tab and Escape can't be used (see Planned work).                                                                                                                                                        | S      | —      |
| 2   | The suggestion list (characters, locations, transitions) may sit under the on-screen keyboard or be cut off near the bottom of the screen.                                                                               | M      | Phone  |
| 3   | The Scribidian Palette, Scene Workspace and Continuity Inspector may be cramped or cut off on a narrow screen.                                                                                                           | M      | Phone  |
| 4   | Slow start-up and typing on long scripts on older phones. `main.js` is 3.4 MB, mostly because it includes PDF export. Loading PDF export only when it is used would help.                                                | M–L    | Phone  |
| 5   | Courier Prime (the default font) isn't installed on phones. iPhone falls back to Courier or Courier New, Android to its own monospace font. Line widths and the page estimate in the status bar may then look a bit off. | S      | Phone  |
| 6   | The typing margin at the bottom may not be enough to keep the cursor above the keyboard. Keyboards and toolbars differ between iPhone and Android.                                                                       | S–M    | Phone  |
| 7   | Testers won't know how to set up the mobile toolbar. Needs a short guide.                                                                                                                                                | S      | —      |
| 8   | `docs/MOBILE_TESTING.md` still describes First Draft 0.13.1 and old BRAT steps. Rewrite it for Scribidian 0.1.x.                                                                                                         | S      | —      |

### iPhone and iPad

| #   | Possible issue                                                                                                                                                                                                                                                                                                                                                           | Effort | Device |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ |
| 9   | **Smart Punctuation** (on by default) turns `'` into `’`, `"` into `“ ”` and `--` into `—`. A character typed as `O'BRIEN` on desktop and `O’BRIEN` on iPhone might then show as two different characters in suggestions, and `--` written as a dash would change. Turning Smart Punctuation off is a workaround. Treating both kinds of quote as the same would fix it. | S–M    | iPhone |
| 10  | **Autocorrect and auto-capitalize** may fight Scribidian. The iPhone keyboard can change `INT` to `Int`, or "correct" an unusual character name after Scribidian has uppercased it. The iPhone keyboard also sends text differently from Android's, so the recent Android typing fix may not cover it.                                                                   | M      | iPhone |
| 11  | Dictation adds whole phrases at once, so line-start capitalization and transition uppercasing may act in unexpected ways.                                                                                                                                                                                                                                                | S      | iPhone |
| 12  | Tapping dual dialogue to edit it relies on mouse events that iOS only imitates. It may need a double tap, or may select text instead.                                                                                                                                                                                                                                    | S      | iPhone |
| 13  | iCloud Drive vaults: iOS may not have downloaded every file yet, so the character and location lists can be incomplete. Scribidian's own writes (marking character pages, Scene Workspace moves) can create sync conflicts.                                                                                                                                              | M      | iPhone |
| 14  | Installing on iPhone is only possible through BRAT until Scribidian is in the directory. Copying files by hand is impractical. Needs clear steps for friends.                                                                                                                                                                                                            | S      | —      |
| 15  | iPad with a hardware keyboard: check that Tab reaches Scribidian and isn't used by iPadOS to move focus.                                                                                                                                                                                                                                                                 | S      | iPad   |

### Mac

| #   | Possible issue                                                                                                                                                                                                                                                       | Effort | Device |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| 16  | Typing Japanese, Chinese or Korean with a Mac input method, or using press-and-hold accents: pressing Enter to confirm a word must not also run Scribidian's Enter (new dialogue line and so on). Pickers already check for this. The editor needs a check on a Mac. | S      | Mac    |
| 17  | macOS file names ignore upper and lower case. `Scene.md` and `scene.md` count as the same file, so creating scene or character pages could collide where Windows wouldn't.                                                                                           | S      | Mac    |
| 18  | Courier Prime isn't installed by default. Courier and Courier New are, so this is cosmetic.                                                                                                                                                                          | S      | —      |
| 19  | Writers may assign hotkeys that macOS already uses (Cmd+Option combinations, for example). Scribidian sets no default hotkeys, so this only needs a note in the docs.                                                                                                | S      | —      |

### All platforms

| #   | Possible issue                                                                                                                                           | Effort | Device |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| 20  | Themes other than Default and Minimal (AnuPpuccin, Things, Blue Topaz…) may break side margins or line centring, like the mobile margin bug.             | M      | —      |
| 21  | Other plugins that also use Tab or Enter (Outliner, Various Complements, Templater, Natural Language Dates) may conflict with Smart Tab and suggestions. | M      | —      |
| 22  | Dropbox and Syncthing conflicted copies of a screenplay give the character and location lists duplicate entries.                                         | S      | —      |
| 23  | Undo after line-start capitalization removes the letter entirely instead of making it lowercase again.                                                   | S      | —      |
| 24  | Line-start capitalization also applies inside code blocks and at the start of a URL in screenplay notes.                                                 | S      | —      |
| 25  | Right-to-left languages (Hebrew, Arabic) in centred character and dialogue lines haven't been tried.                                                     | M      | —      |

### Workload

- **25 possible issues:** 15 small, 9 medium, 1 medium-to-large.
- **12 can be done without a device:** 1, 7, 8, 14, 18 to 25.
- **The rest need an iPhone, an Android phone or a Mac:** either a friend
  testing with a checklist, or Obsidian's own mobile emulation on desktop
  (`app.emulateMobile(true)`) for a first pass.

## Deep backlog: export

Not planned for the 0.1.x betas or 1.0.0.

- **Automatic (CONT'D) when a speaker resumes.** (CONT'D) is never offered as
  a suggestion. It should be filled in automatically, unlike (V.O.) and (O.S.),
  which the writer chooses. PDF export already adds it when one speech breaks
  across a page. Also add it on export when the same character speaks again
  after only action lines in the same scene. Don't add it after another
  character speaks, or after a new scene heading. Leave the writer's text
  unchanged. Possibly offer a setting to turn it off.
- **Finding an exported PDF on a phone.** The PDF is saved in the vault, but a
  phone gives no easy way to find, open or share it. Could open the PDF right
  away or say where it went. (S, phone)
- **CJK font pack on iPhone.** The pack downloads and writes large font files
  into the vault. This may be slow or fail on iOS when storage is low. (S,
  iPhone)
- **Export files on a Mac.** File names that differ only in upper and lower
  case count as the same file on macOS, so exported files could overwrite each
  other. (S, Mac)
