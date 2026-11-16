# Developing Scribidian

For people who want to build, test or change Scribidian. Writers don't need
any of this: see the [README](../README.md) instead. Contribution rules are in
[CONTRIBUTING](../CONTRIBUTING.md).

## Set up

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
- click a recent character, wryly, or transition to insert it, or click
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
- put the caret in dialogue, run `Screenplay: Wryly`, and choose a
  common or custom direction;
- on a blank line, choose **Transition** in the palette and pick a common or custom
  transition;
- run `Screenplay: Export to Fountain`; Scribidian opens a new sibling
  `.fountain` file with the Obsidian frontmatter removed, leaving the original
  note untouched;
- run `Screenplay: Export to Final Draft FDX`; Scribidian creates a new sibling
  `.fdx` file without changing the source. Open that file in Final Draft and
  confirm the slugline, action, character extension, wryly,
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
in the isolated Obsidian vault; see [FDX compatibility](FDX_COMPATIBILITY.md).

Scribidian keeps mobile support enabled. Before the public release, follow the
[mobile testing checklist](MOBILE_TESTING.md) on at least one physical
device and record the Obsidian and operating-system versions used.
