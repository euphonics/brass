# Mobile testing

Brass supports iPhone, iPad and Android, but has so far been tested on a
phone by one person. These steps are for friends testing a beta. Use a test
vault, or a copy of your vault, with no private screenplays in it.

## Install with BRAT (iPhone, iPad and Android)

Until Brass is in Obsidian's community plugin directory, BRAT is the way to
install it on a phone. BRAT installs plugins straight from their GitHub
releases.

1. In Obsidian, open **Settings → Community plugins**, turn off Restricted mode
   if asked, then **Browse** and install **BRAT** (Obsidian42 - BRAT). Enable it.
2. Open **Settings → BRAT → Add beta plugin**.
3. Enter `euphonics/brass` and choose the latest release.
4. Enable **Brass** under **Settings → Community plugins**.
5. Run **Brass: Create example screenplay** from the command palette to
   get a sample script to try.

BRAT only installs Brass; Brass itself never goes online.

If you used First Draft before, turn it off first. Both plugins open
`.fountain` files and lay out the editor, so having both on causes clashes.
Hotkeys and settings don't carry over; set them again.

## Android: install by hand

On a computer, download `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/euphonics/brass/releases/latest) and
copy them into `<vault>/.obsidian/plugins/brass/` on the phone (USB or
your sync app). Restart Obsidian and enable Brass. On iPhone this is
impractical; use BRAT.

## Element buttons

In a script, Brass shows its own row of buttons above the keyboard toolbar:
⬅️ Smart Tab back, 🎬 Slug, 🏃 Action, 🧑 Character and ➡️ Smart Tab (settings
section **Phone toolbar**: pick and order the buttons, emoji labels, convert
the current line). Test that each button
works, that the keyboard stays up when tapping, that the row scrolls sideways
on a narrow phone, and that it never shows in a plain note.

## Put Smart Tab on the toolbar

Phone keyboards have no Tab key. The element buttons above include Tab. To
also have Smart Tab on Obsidian's own toolbar, add its commands there:

1. In **Settings → Brass**, turn on **Show all commands in the command
   palette**. Smart Tab is hidden from the command list until you do.
2. Open **Settings → Mobile → Manage toolbar options** (called "Mobile" or
   "Toolbar" depending on the Obsidian version).
3. Add **Brass: Screenplay: Smart Tab** and **Brass: Screenplay:
   Smart Tab back**.
4. Optionally add the **Set line** commands (Slugline, Action, Character,
   Wryly, Transition, Centered text).

Tapping Smart Tab does exactly what pressing Tab does on a computer.

## Phone tips

- **iPhone Smart Punctuation** turns `'` into `’`. Brass treats `O'BRIEN`
  and `O’BRIEN` as the same character, but `--` still becomes `—`. To keep
  plain quotes and dashes, turn off **Settings → General → Keyboard → Smart
  Punctuation** on the iPhone.
- **Natural Language Dates** opens a date list when you type `@`, which Fountain
  uses to force a character name. Keep typing or tap elsewhere to close it, or change that
  plugin's trigger character in its settings.
- Phones have no status bar, so page count and word count aren't shown there.

## Acceptance checklist

- Open a `.fountain` file and a Markdown note with `screenplay: true`.
- Check the side margins match ordinary notes, and that character names,
  dialogue and transitions line up.
- Add **Smart Tab** and **Smart Tab back** to the toolbar (above) and use them
  to move between action, character and dialogue.
- Confirm autocomplete works with the on-screen keyboard.
- Create and open a character dossier.
- Open a multi-part screenplay project and navigate between parts.
- View project statistics and character checks.
- Open the Scenes panel and check narrow cards, filters, scene
  editing and cross-part move/restore on disposable notes.
- In a build containing the continuity inspector, check scrolling/wrapped
  evidence, source navigation, Refresh and stale-report warnings.
- Preview a standalone screenplay and a multi-part project in both portrait
  and landscape orientation without horizontal page clipping.
- Export Fountain and FDX files without changing the source document.
- Change Brass settings, restart Obsidian, and confirm they persist.
- Lock and resume the device, then confirm the active screenplay still works.

Record the Obsidian version, operating system version, and device type with the
test result. Mobile acceptance is separate from the automated model tests and
the desktop test-vault check.

## Report what you find

Use the [bug report form](https://github.com/euphonics/brass/issues/new/choose)
and include the device, the OS version, the Obsidian version and the theme. The
list of things that still need a person to check, grouped by device, is in the
[roadmap](ROADMAP.md#human-test-checklist).
