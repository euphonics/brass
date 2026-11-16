# Scribidian

Scribidian is an Obsidian plugin for writing screenplays efficiently in
plain-text [Fountain](https://fountain.io/) syntax.

The guiding principle is simple: think about the movie, not the syntax.
Scribidian adds screenplay-aware assistance while keeping every document
portable, human-readable, and useful when the plugin is not installed.

Scribidian is derived from [First Draft](https://github.com/grobmeier/firstdraft)
by Christian Grobmeier, used under the Apache License 2.0. See
[Credits](#credits).

![Preview and PDF export](docs/images/firstdraft-demo.gif)

Install Scribidian from **Settings → Community plugins → Browse** in Obsidian:
search for **Scribidian**, install it, and enable it. To install by hand,
copy `main.js`, `manifest.json` and `styles.css` from the
[latest release](https://github.com/euphonics/scribidian/releases/latest) into
`.obsidian/plugins/scribidian/` in your vault, then enable it in
**Settings → Community plugins**. Coming from First Draft? See the
[0.1.0 release notes](docs/releases/0.1.0.md). See the
[visual feature tour](docs/FEATURE_TOUR.md) for the complete workflow.

## Features

**0.1.0** is the first Scribidian release, and a beta: so far it has been
tested by one writer, so keep backups and please
[report problems](https://github.com/euphonics/scribidian/issues). It builds on
First Draft 0.13.1
and adds an optional screenplay layout in the editor, smart Tab and Enter,
"Set line to …" commands, dual dialogue, slug modifiers, font and margin
settings and more. See the [release notes](docs/releases/0.1.0.md).

The current build provides:

- screenplay mode for `.fountain` files;
- an optional screenplay layout in the editor that indents and aligns each
  element as it prints, display only (Settings > Editor layout, or plain
  Fountain text);
- screenplay mode for Markdown notes with `screenplay: true` frontmatter;
- Fountain-aware scene and character parsing;
- a debounced status item with word and scene counts;
- screenplay-aware estimated pages for US Letter or A4;
- configurable runtime estimation based on minutes per page;
- a current-document statistics dialog with character dialogue rankings;
- parenthetical insertion with common, recently used, and custom choices;
- transition insertion with common, previously used, and custom choices;
- non-destructive export to a clean `.fountain` file;
- non-destructive Final Draft `.fdx` export for the six core screenplay element
  types;
- a read-only, page-like screenplay preview for individual files and combined
  multi-file projects;
- local, non-destructive PDF export in US Letter or A4 with screenplay margins,
  Courier typography, page breaks, and page numbers;
- a dockable Scribidian Palette with contextual actions and recent screenplay
  elements;
- a scene workspace with project-wide navigation, filters, portable synopses,
  scene creation and conflict-checked rearranging, including cross-part recovery;
- portable Markdown character dossiers with aliases, screenplay links, and
  relationship links;
- derived per-character scene, cue, and dialogue usage without generated data
  being written into dossiers;
- deterministic character checks for missing pages, duplicate identities,
  ambiguous aliases, broken relationships, unused pages, and likely spelling
  variants;
- a read-only continuity inspector with original-source evidence, explicit
  incomplete-scope reporting and advisory empty-scene/missing-time checks;
- native Obsidian Local Graph access for character relationships;
- ordered multi-file screenplay projects whose parts can live in different
  vault folders;
- vertically stacked project-part links for easier reading and ordering;
- project-wide statistics, character checks, recent elements, autocomplete,
  Fountain/FDX export, and previous/next navigation;
- project-local character folders with a Markdown `character-folder` override;
- a conflict-safe example screenplay generator for first-time exploration;
- an offline, copy-friendly screenplay and Fountain cheat sheet;
- context-aware character, character-extension, scene-location, and time
  autocomplete;
- keyboard-first Character, Character Extension, and New Scene commands;
- settings for activation, autocomplete ranking, result limits, scene types,
  and times of day.

See [PDF compatibility](docs/PDF_COMPATIBILITY.md) and
[FDX compatibility](docs/FDX_COMPATIBILITY.md) for the deliberately narrow
format boundaries.

Open a screenplay or project, then choose **Scenes** in the palette or run
**Open scene workspace** with Cmd/Ctrl+P. See the
[scene workspace guide and test checklist](docs/SCENE_WORKSPACE.md).

**Inspect continuity** provides read-only, source-linked character checks and
scene advice. See the [inspector guide](docs/CONTINUITY_INSPECTOR.md) for its
deliberately limited scope.

First Draft 0.12 embeds a local Courier-compatible PDF font with
broader Latin, Greek and Cyrillic coverage. Missing characters stop export
with a clear diagnostic rather than silently becoming `?`. This is not
universal Unicode support; see the PDF compatibility guide.

The plugin also supports horizontal Chinese, Japanese and Korean
PDFs with an [optional offline Noto font pack](docs/CJK_FONT_PACK.md) and measured
wrapping. Run **Install offline CJK PDF fonts** once on each device that needs
CJK PDFs. Select **PDF language** in Scribidian settings for regional character
forms. The core bundle is approximately 3.34 MB and its build enforces a 5 MB
release-asset limit. Preview pagination is approximate; inspect the exported
PDF. Physical-phone font installation and export testing remain important.

### PDF title pages and dialogue continuation

Add an explicit `title` property to a screenplay or project note for an
unnumbered title page. Optional properties are `credit`, `author`, `source`,
`draft-date` (a quoted string), and `contact` (multiline text is supported).
For projects, set these on the project note, not individual parts. Without an
explicit title, PDF export keeps its existing body-only behaviour.

Plain Fountain files can start with:

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

The body starts at page 1. Speeches crossing page boundaries get `(MORE)`
and a repeated speaker cue with `(CONT'D)`; short speeches stay together
where possible. These markers appear in preview/PDF only, not in your source.
Oversized title metadata or parentheticals stop export with a clear message.

### Create a screenplay project

Put a project note in the screenplay's folder and list its parts in reading
order. The links resolve using normal Obsidian link rules, so the part files do
not need to share a folder:

```yaml
---
firstdraft: screenplay-project
title: The Long Night
parts:
  - "[[Parts/01 - Opening]]"
  - "[[Elsewhere/02 - The Ward]]"
character-folder: Characters
---
```

`character-folder` is relative to the project note's folder. Start it with `/`
to use a vault-relative folder. Project membership and order come from the
explicit `parts` list.

Parts inside the project note's folder tree are discovered without searching
the whole vault. When a part lives elsewhere, add an explicit project link to
that part's properties:

```yaml
---
screenplay: true
screenplay-project: "[[Long Night/Screenplay Project]]"
---
```

The project note remains authoritative; the part-side link is only a scoped
discovery hint and an ordinary Obsidian backlink.

### Get started with an example

To use your own Markdown note, open it and click the clapperboard ribbon icon.
In the Scribidian Palette, choose **Use this note as a screenplay**. This adds
`screenplay: true` to its properties without converting your text or changing
other properties. Writing actions appear once Obsidian updates the note's
metadata. Remove that property to return to ordinary-note mode. If the button
is disabled, enable **Use screenplay frontmatter** in Settings → Scribidian.
You can also press **Cmd+P** (Ctrl+P on Windows/Linux) and choose
**Scribidian: Use this note as a screenplay** while an ordinary Markdown note
is open.

Run `Scribidian: Create Example Screenplay` from the command palette, or use
**Create Example Screenplay** in the Scribidian Palette while no screenplay is
open. Scribidian creates a new, self-contained `Scribidian Example` folder and
opens its `Start Here.md` tour. If that folder already exists, a numbered folder
is used; existing vault content is never overwritten.

Open **Cheat Sheet** in the Scribidian Palette—or run
`Scribidian: Open Screenplay Cheat Sheet`—for quick screenplay terminology,
selectable Fountain examples, and Scribidian project concepts. The cheat sheet
is bundled with the plugin, works offline, and does not create a vault note or
access the system clipboard.

## Tips and known limits

**Two editor modes.** **Screenplay layout** lays the page out like a script
and adds typing help such as Smart Enter. **Plain Fountain text** keeps free
typing: suggestions and Smart Tab still work, but Enter is always Obsidian's
own (Tab or a tap accepts a suggestion). Details:
[Editor modes](docs/EDITOR_MODES.md).

**Themes.** Scribidian supports Obsidian's Default theme and Minimal, on desktop
and phone. Other themes should work but are best effort. In screenplay notes
Scribidian controls the layout (font, the 60-character column, indents,
spacing, alignment) so themes can't knock it out of line; colours, dark mode
and text size still follow your theme.

- CSS snippets can't change a script's font or indents unless they use
  `!important`. To change the script font, use **Settings → Scribidian →
  Screenplay font** (this also works for accessibility fonts).
- Wide-note options (Minimal's `wide` and `max`, width plugins) don't widen a
  script: it stays 60 characters wide, like the printed page.

**Languages.** Scribidian supports languages written in the Latin alphabet.
Right-to-left scripts (Hebrew, Arabic) and scripts without capital letters
(Chinese, Japanese, Korean) aren't supported yet; contributions from people who
write screenplays in those languages are welcome (see
[CONTRIBUTING](CONTRIBUTING.md)).

**Phones.** See the [mobile guide](docs/MOBILE_TESTING.md) for installing with
BRAT and putting **Smart Tab** on the toolbar (phone keyboards have no Tab
key).

**Other plugins.**

- **Linter** rewrites scripts if it runs on them: it adds properties and a
  heading to `.fountain` files, removes two-space lines and squeezes blank
  lines. Add your screenplay folders to Linter's **Folders to ignore**, or turn
  off lint on save.
- **Natural Language Dates** opens a date list when you type `@`, which
  Fountain uses to force a character name. Keep typing to close it, or change
  that plugin's trigger.
- If **First Draft** is installed, turn it off: both plugins open `.fountain`
  files and lay out the editor.

**Fountain rules worth knowing.**

- An all-caps line followed by text (`BANG!` then a line) reads as a character
  and dialogue. Start it with `!` to force action: `!BANG!`.
- Scene headings must start with INT, EXT, EST or I/E. For anything else, start
  the line with a period: `.INNEN. HAUS - TAG`.
- Transitions must end in `TO:`. Force others with `>`: `> FADE OUT.`
- A line of two spaces keeps a speech going. `%% comments %%` and
  `/* boneyard */` are ignored.
- While Scribidian is turned off, `.fountain` files drop out of Obsidian's file
  list unless **Settings → Files and links → Detect all file extensions** is
  on.

## Development

Requirements: Node.js 22.12+ within the 22 series, or Node.js 24+, and npm.
If you use nvm, run `nvm use` in the
repository before installing dependencies.

```bash
npm install
npm test
npm run lint
npm run build
```

Run `npm run dev` for a watch build.

## Test safely in Obsidian

Never develop against your everyday vault. Build and install into the ignored,
repository-local `Scribidian Test Vault` directory:

```bash
npm run test-vault
```

Then open the visible `Scribidian Test Vault` directory as a separate Obsidian
vault, enable or reload **Scribidian** in Settings → Community plugins, and
open `Long Night/Screenplay Project.md` for project testing or `Milestone 4.md`
for the standalone-screenplay checks.

Expected result:

- the project note lists both ordered parts even though they live in different
  folders, displays each part on its own line, and opens either part from the
  palette;
- project statistics, checks, recent items, and exports combine both parts;
- Previous Part, Next Part, and Project Note navigate the project without the
  command palette;
- creating JANE's page from either project part creates
  `Long Night/Characters/Jane.md` and links it to the project note;
- setting `character-folder: People` on the project changes the destination to
  `Long Night/People`; a leading slash makes the override vault-relative;

- click the clapperboard ribbon icon or run
  `Screenplay: Open Scribidian Palette`; the panel opens in the right sidebar;
- move the caret between a character cue, dialogue, and a blank line and confirm
  the highlighted first action changes appropriately;
- click a recent character, parenthetical, or transition to insert it, or click
  a recent location to start a New Scene using that location;
- use **Open page** beside JANE or MILLER, then confirm the dossier shows linked
  screenplay usage, relationships, and an **Open Local Graph** action;
- use **Create page** beside REEVES and confirm Scribidian creates
  `Characters/Reeves.md` without modifying the screenplay;
- before creating REEVES, run `Screenplay: Check Characters` and confirm it is
  reported as missing; run it again afterwards to clear that warning;
- open `Characters/Jane.md`, choose **Open Local Graph**, and confirm Jane is
  connected to Milestone 4 and Miller through ordinary wikilinks;
- filter recent items from the panel without losing keyboard focus;
- the status bar shows estimated pages, estimated runtime, words, and scenes;
- run `Screenplay: Show Statistics` to see document totals and dialogue counts
  by character;
- put the caret in dialogue, run `Screenplay: Parenthetical`, and choose a
  common or custom direction;
- run `Screenplay: Transition` on a blank line and choose a common or custom
  transition;
- run `Screenplay: Export to Fountain`; Scribidian opens a new sibling
  `.fountain` file with the Obsidian frontmatter removed, leaving the original
  note untouched;
- run `Screenplay: Export to Final Draft FDX`; Scribidian creates a new sibling
  `.fdx` file without changing the source. Open that file in Final Draft and
  confirm the scene heading, action, character extension, parenthetical,
  dialogue, and transition retain their element types;
- run `Screenplay: Preview` from a standalone screenplay, a project part, and a
  project note; confirm the project preview combines its parts in order and the
  source remains unchanged;
- export from the preview or run `Screenplay: Export PDF`; confirm the PDF opens,
  matches the configured Letter/A4 size, and a second export uses a numbered
  filename rather than overwriting the first;
- switch page size, minutes per page, or individual status fields under
  Settings → Scribidian and confirm the display updates;
- use `Milestone 3 Settings Demo.md` when comparing Letter/A4 or runtime ratios;
  its length makes the differences visible without editing the fixture;
- type `JA` on the final blank line: choose `JANE` with Tab or Enter and start
  typing dialogue on the next line;
- type `INT. MIL`, accept a known location, then accept a time;
- run `Screenplay: New Scene` from the command palette and complete all three
  steps without the mouse;
- put the caret on a character cue and run
  `Screenplay: Character Extension`;
- changing dialogue updates the word count after a short delay;
- removing `screenplay: true` and reopening the note hides the item;
- creating a `.fountain` file activates it without frontmatter;
- ordinary Markdown notes are unchanged.
- from an ordinary note, create an example screenplay; repeat the command and
  confirm the second example uses a numbered folder without changing the first;
- open the cheat sheet from both its command and the sidebar, select one of its
  Fountain examples, and copy it with the normal system shortcut.

To use another dedicated test vault:

```bash
node scripts/install-test-vault.mjs /absolute/path/to/test-vault
```

## Automated testing

`npm test` covers parsing, estimation, helpers, character cataloguing and
verification, derived dossier usage, Fountain/FDX/PDF export, deterministic
screenplay page layout, strict XML parsing, XML escaping, and structural FDX
compatibility. `npm run test-vault` builds the production bundle and installs
it into the isolated vault.

Browser Playwright alone cannot exercise an Obsidian plugin because Obsidian is
an Electron desktop application rather than a website. A separate Electron UI
harness is possible, but it would be platform-specific and more brittle than
the model-level tests. The remaining acceptance check is therefore a short run
in the isolated Obsidian vault; see [FDX compatibility](docs/FDX_COMPATIBILITY.md).

Scribidian keeps mobile support enabled. Before the public release, follow the
[mobile testing checklist](docs/MOBILE_TESTING.md) on at least one physical
device and record the Obsidian and operating-system versions used.

## Security and privacy

This section covers **Scribidian** (plugin ID `scribidian`). See also
[PRIVACY.md](PRIVACY.md).

### What the plugin does not do

- **No network access.** It makes no network requests. It does not download,
  upload, sync or "phone home", and it has no telemetry, analytics, accounts or
  cloud services. The only web address in the code is a help link that opens in
  your browser when you click it.
- **No remote or dynamic code.** It does not use `eval`, does not load scripts
  from the internet and does not run code from your notes. Character page
  templates are plain text: `{{character}}`-style placeholders are filled in,
  and nothing in a template is executed (unlike, for example, Templater).
- **No HTML injection.** It does not insert raw HTML into Obsidian's interface.
- **No clipboard access**, and it does not scan your whole vault.

### What it reads

Only what it needs, inside your vault:

- the screenplay note you are editing, and the parts of its screenplay project;
- character pages in the configured character folder;
- the character page template you choose in settings;
- the folder set in Obsidian's core **Templates** plugin, read from Obsidian's
  internal settings to limit the template picker. This uses an internal
  Obsidian API; if it changes, the picker falls back to searching the whole
  vault.

### What it writes to your notes

Several features edit notes. All edits are ordinary text changes that can be
undone with Ctrl+Z or recovered from Obsidian's file history:

- **Smart Tab and Enter** insert Fountain text (blank lines, `()`, `-`, and so
  on) and uppercase transition lines.
- **Typing on a `> …` transition line** is uppercased as you type.
- **Turning a note into a screenplay**, or **opening a character page**, adds a
  `title` property to the screenplay note if it has none.
- **Opening a character page** creates the page, or, when a page with the
  expected name already exists, adds the properties Scribidian needs
  (`firstdraft`, `character`, `aliases`, `screenplays`, `related`) to its
  frontmatter. The page's text is not changed.
- **Moving a scene between files** (an original First Draft feature) saves the
  full before/after text of both files in `scene-recovery.json` in the plugin
  folder (`.obsidian/plugins/firstdraft-arvn/`). It is plain text, not
  encrypted, and may end up in backups and sync. Delete it when you no longer
  need it.

### Dependencies

The installed plugin bundles four libraries for PDF export: `pdf-lib`,
`@pdf-lib/fontkit`, `linebreak` and `pako`. They are pinned in
`package-lock.json` and, at the time of writing, `npm audit` reports no known
vulnerabilities in them. Build and test tools (Vite, Vitest, ESLint, esbuild)
run only on the developer's machine and are not part of the installed plugin.

### Relationship to First Draft

Scribidian is an independent project. Nothing from First Draft reaches it
automatically; changes from First Draft arrive only when they are deliberately
merged here, and can be reviewed then. Scribidian uses its own plugin ID, so
updates to First Draft never replace it. Do not enable both plugins at the
same time.

Scribidian marks character and project notes with a `scribidian:` frontmatter
property. Notes marked with First Draft's `firstdraft:` property keep working
and are not rewritten.

### What you are trusting

Like every Obsidian community plugin, this plugin runs with the same access as
Obsidian itself: it can read and change any note in your vault and, on desktop,
access your computer much as other apps can. Obsidian does not sandbox plugins.
Installing it means trusting the code in this repository and the GitHub account
that publishes it. The source is open; review it, or build it yourself with
`npm ci && npm run build`, if you want to verify what you install.

### Reporting a problem

Report suspected vulnerabilities privately, not in a public issue:

- **Problems in Scribidian**: follow [SECURITY.md](SECURITY.md).
- **Problems that also affect First Draft**: report them to its author through
  [First Draft's security page](https://github.com/grobmeier/firstdraft/security).

Never attach real screenplay content, credentials or other personal data to a
report.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). By participating, you agree to follow
the [Code of Conduct](CODE_OF_CONDUCT.md).

Release history is recorded in the [changelog](CHANGELOG.md). Security issues
must be submitted through the private process in [SECURITY.md](SECURITY.md), not
through a public issue.

## Credits

Scribidian is derived from [First Draft](https://github.com/grobmeier/firstdraft),
Copyright 2026 Christian Grobmeier, licensed under the Apache License 2.0. The
screenplay parser, exports, palette, character and project features, and much
else come from First Draft. Scribidian adds the screenplay editor layout, smart
Tab and Enter, element hotkeys, dual dialogue, slug modifiers, font and margin
settings and more. "First Draft" is Christian Grobmeier's project name; this
project is not affiliated with or endorsed by him.

## Licence

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE).

Third-party licences are recorded in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
