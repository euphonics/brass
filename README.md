# Scribidian

Scribidian turns Obsidian into a screenplay editor. You write in plain text,
and Scribidian lays it out like a printed script, suggests character names and
scene details as you type, counts your pages, and exports Fountain or Final Draft files for finishing in
a dedicated screenplay app.

Your scripts stay ordinary text files in
[Fountain](https://fountain.io/), a simple screenplay format: a line like
`INT. KITCHEN - NIGHT` is a slugline, a name in capitals is a character, and
the lines below it are dialogue. They open in any text editor and in other
screenplay apps, with or without Scribidian.

![Writing in Scribidian, then previewing it as pages](docs/images/firstdraft-demo.gif)

**This is a beta.** Scribidian 0.1.0 has so far been tested by one writer.
Keep backups of your scripts, and please
[report problems](https://github.com/euphonics/scribidian/issues).

## Install

Scribidian isn't in Obsidian's community plugin directory yet. Until it is,
install it with BRAT, a helper plugin that installs plugins from GitHub. This
works on computers, iPhone, iPad and Android.

1. In Obsidian, open **Settings → Community plugins**, turn off Restricted
   mode if asked, then choose **Browse** and install **BRAT**. Enable it.
2. Open **Settings → BRAT → Add beta plugin**.
3. Enter `euphonics/scribidian` and choose the latest release.
4. Enable **Scribidian** under **Settings → Community plugins**.

To install by hand instead, download `main.js`, `manifest.json` and
`styles.css` from the
[latest release](https://github.com/euphonics/scribidian/releases/latest) and
put them in a folder called `scribidian` inside your vault's
`.obsidian/plugins` folder. Then enable Scribidian under
**Settings → Community plugins**.

**Used First Draft before?** Turn it off: both plugins open the same files.
See [Moving from First Draft](docs/releases/0.1.0.md#moving-from-first-draft).

## Your first five minutes

1. **Try the example.** Open the command palette (**Ctrl+P**, or **Cmd+P** on
   Mac), run **Scribidian: Create example screenplay**, and follow the
   `Start Here` note it opens. It goes in a new folder and never changes
   anything else.
2. **Start your own script.** Create a file ending in `.fountain`, or open any
   note and choose **Use this note as a screenplay** from the command palette
   or the clapperboard icon in the left ribbon.
3. **Type a slugline.** Type `int. kitchen - night`. It becomes
   `INT. KITCHEN - NIGHT`, and suggestions offer scene types, places you have
   used before, and times of day.
4. **Press Tab and Enter.** At the end of a line, Tab moves on to the most
   likely next thing: a wryly `()` under a character, the time of day after a
   slugline, a character after action. Enter starts the next element, for
   example a new speaker after a line of dialogue.
5. **See it as pages.** Run **Screenplay: Preview** to see the script as
   printed pages, then **Export Fountain** to take it into Final Draft, Fade In
   or another screenplay app.

Open **Scribidian: Open screenplay cheat sheet** any time for screenplay terms
and examples of the Fountain format.

## What it does

**While you write**

- Lays your script out like a printed page: centered character names, narrow
  dialogue, transitions on the right. Prefer plain text? Switch to plain mode.
- Suggests character names, places, times of day, wrylies and transitions as
  you type.
- Smart Tab and Enter move you from element to element without reaching for
  the mouse. You choose what Enter does after each element.
- Shows estimated page count, the page you're on, runtime, words and scenes
  in the status bar.
- Dual dialogue, character extensions like `(V.O.)`, and slug modifiers like
  `(FLASHBACK)`.

**Organising a script**

- A **Scenes** panel in the sidebar to see every scene, jump to it, add a
  synopsis, and move scenes around. Click the clapperboard icon or run
  **Open scenes**.
- **Longer scripts** can be split across several files and treated as one
  screenplay (see [Screenplay projects](#screenplay-projects)).
- **Character pages**: ordinary notes about each character, linked to the
  scripts they appear in, with checks for missing pages and misspelt names.
- A **continuity inspector** that points out possible problems, such as a
  scene with no time of day, and links to the exact line.

**Sharing your script**

- Clean **Fountain** and **Final Draft** (`.fdx`) files. Scribidian has no PDF
  export: import the Fountain file into Final Draft, Fade In, Highland or
  another screenplay app for last looks, and make the PDF there.
- Exports always create a new file. Your script is never changed.

See the [feature tour](docs/FEATURE_TOUR.md) for pictures of each part.

## Guides

- [Feature tour](docs/FEATURE_TOUR.md): every feature, with screenshots.
- [Editor modes](docs/EDITOR_MODES.md): what script mode and plain mode each do.
- [Using Scribidian on a phone](docs/MOBILE_TESTING.md): installing, and
  putting Smart Tab on the toolbar.
- [Scenes panel](docs/SCENE_WORKSPACE.md) and
  [continuity inspector](docs/CONTINUITY_INSPECTOR.md).
- [Final Draft export](docs/FDX_COMPATIBILITY.md): what it can and can't do.

## Tips and known limits

**Two editor modes.** **Script mode** lays the page out like a script and helps
as you type, for example with capitals and Smart Enter. **Plain mode** keeps
Obsidian's normal look and free typing: suggestions and Smart Tab still work,
but Enter and your text are left alone. Switch with
**Screenplay: Toggle script and plain mode**. Each kind of typing help can be
turned on or off for each mode in settings. See
[Editor modes](docs/EDITOR_MODES.md).

**Themes.** Scribidian supports Obsidian's Default theme and Minimal, on
computers and phones. Other themes should work but aren't tested. In scripts,
Scribidian keeps control of the layout (font, the 60-character line, indents,
spacing) so a theme can't knock it out of line; colours, dark mode and text
size still follow your theme.

- To change the script font, use **Settings → Scribidian → Screenplay font**.
  This also works for fonts that help with reading. CSS snippets can't change
  it.
- Settings that make notes wider don't widen a script: it stays 60 characters
  wide, like the printed page.

**Languages.** Scribidian supports languages written in the Latin alphabet.
Right-to-left languages (Hebrew, Arabic) and languages without capital letters
(Chinese, Japanese, Korean) aren't supported for writing yet. If you write
screenplays in one of them and would like to help, see
[CONTRIBUTING](CONTRIBUTING.md).

**Phones.** Phone keyboards have no Tab key. The
[phone guide](docs/MOBILE_TESTING.md) shows how to put **Smart Tab** on the
toolbar above the keyboard.

**Other plugins.**

- **Linter** changes scripts if it runs on them. Add your screenplay folders
  to Linter's **Folders to ignore**, or turn off lint on save.
- **Natural Language Dates** opens a date list when you type `@`, which
  Fountain uses to mark a character name. Keep typing to close it, or change
  that plugin's trigger.
- **First Draft**: turn it off. Both plugins open `.fountain` files.

**Fountain rules worth knowing.**

- A line in capitals with text right below it reads as a character and
  dialogue, unless it ends in punctuation: `BANG!` or `SILENCE.` stays action
  in Scribidian. Other apps follow plain Fountain and may read `BANG!` as a
  character; put `!` in front (`!BANG!`) to make it action everywhere. For a
  name that does end in punctuation (`JOHN JR.`), put `@` in front.
- Sluglines must start with INT, EXT, EST or I/E. For anything else, start the
  line with a full stop: `.INNEN. HAUS - TAG`.
- Transitions must end in `TO:`. For others, start with `>`: `> FADE OUT.`
- A line with just two spaces keeps a speech going across a gap.
  `%% comments %%` and `/* notes */` are left out of the script.
- While Scribidian is turned off, `.fountain` files disappear from Obsidian's
  file list unless **Settings → Files and links → Detect all file extensions**
  is on.

## Title pages

To show a title page in the preview, give the screenplay (or project) note a
`title` property. You can also add `credit`, `author`, `source`, `draft-date`
(in quotes)
and `contact`. In a `.fountain` file, put them at the top instead:

```fountain
Title: The Long Night
Credit: Written by
Author: Alex Example
Draft date: 1 October 2026
Contact:
    Example office
    Example City

INT. OFFICE - NIGHT
```

## Screenplay projects

A long script can be split into several files, for example one per act, and
treated as one screenplay for page counts, suggestions, character checks and
export. Create a project note and list the parts in reading order. The parts
can live in any folder:

```yaml
---
scribidian: screenplay-project
title: The Long Night
parts:
  - "[[Parts/01 - Opening]]"
  - "[[Elsewhere/02 - The Ward]]"
character-folder: Characters
---
```

`character-folder` is where character pages go, starting from the project
note's folder; start it with `/` to start from the top of your vault instead.

Parts in the project note's folder, or folders inside it, are found
automatically. For a part that lives somewhere else, add a link back to the
project in that part's properties:

```yaml
---
screenplay: true
screenplay-project: "[[Long Night/Screenplay Project]]"
---
```

## Privacy

Scribidian works entirely on your device. It never goes online, sends nothing
anywhere, has no account and collects no data. Every change it makes to your
notes is ordinary text you can undo. Details, including exactly what it reads
and writes: [Privacy and security](PRIVACY.md).

## Help and contributing

- Found a problem or have an idea?
  [Open an issue](https://github.com/euphonics/scribidian/issues).
- Security problems: please report them privately, as described in
  [SECURITY.md](SECURITY.md).
- Want to help? See [CONTRIBUTING](CONTRIBUTING.md) and the
  [developer guide](docs/DEVELOPING.md). By taking part you agree to the
  [Code of Conduct](CODE_OF_CONDUCT.md).
- What changed in each version: [changelog](CHANGELOG.md).

## Credits

Scribidian is derived from [First Draft](https://github.com/grobmeier/firstdraft)
by Christian Grobmeier, used under the Apache License 2.0. The screenplay
parser, exports, palette, character and project features, and much else come
from First Draft. Scribidian adds the screenplay layout in the editor, Smart
Tab and Enter, element hotkeys, dual dialogue, slug modifiers, typing help,
font and margin settings and more. "First Draft" is Christian Grobmeier's
project name; this project is not affiliated with or endorsed by him.

## Licence

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) and
[third-party notices](THIRD_PARTY_NOTICES.md).
