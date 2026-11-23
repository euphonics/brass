# CLAUDE.md

Guidance for AI agents (Claude Code and others) working on Scribidian, an
Obsidian plugin for writing screenplays in Fountain.

## Design philosophy

This is how I design and build Scribidian. It comes from working closely
with its author, a screenwriter, and it decides the hard cases.

### 1. The writer's flow comes first

Scribidian exists so a writer can type a scene without thinking about the
tool. Every keystroke has to land where the writer expects: the cursor in
the right column, the right list open, nothing jumping around. A
half-second of surprise ("why is my cursor in the middle of the page?") is
a bug, even if the text is right. When I change typing behavior, I judge it
by how it feels mid-scene, not by how clean the code is.

### 2. Valid Fountain by default, broken formatting by choice

Scribidian never breaks the formatting on its own. Tab, Enter, the lists
and the other keys that fill in or skip always leave valid Fountain, in
every mode. With strict cursor placement on (the script mode default), the
editor also guards against accidents: if a keystroke would leave something
no Fountain app reads the same way (text glued under dialogue, a lone `(`
on a wryly line, typing on the blank line that separates two blocks), it is
refused or does something sensible instead.

But the writer is in charge, not the format. Part of writing here rather
than in Final Draft or Fade In is the freedom to break formatting on
purpose: plain mode, or strict turned off, lets the writer type anything,
anywhere, and the editor stays out of the way. A rule that protects the
script must never trap the writer.

### 3. Industry tools are the reference, not the master

Writers arrive with Final Draft and Fade In muscle memory, so their
behavior is the default answer to "what should this key do?". When in
doubt, match them. But the writer's considered choice wins over parity, and
some things Fade In does can't exist in Fountain (it stores an element on
every line; Fountain infers elements from text). Then I pick the closest
valid behavior and say so.

### 4. Plain text is the truth; display is a view

The note's text is the screenplay. Layout, columns and styling only change
how it looks. I don't rewrite the writer's text behind their back. Anything
that changes how other apps read the file (marking capitals as action with
`!`, cleaning Obsidian syntax) belongs in export options, off the page.
Scribidian writes; finishing (PDF, production) happens in dedicated
screenwriting software, so I don't rebuild what those apps do better.

### 5. Good defaults, with the writer in charge

Where behavior is a matter of taste (case-sensitive suggestions, what Tab
does inside a line, Enter after a wryly), it becomes a setting with a
sensible default. Settings are explained in plain words and grouped where a
writer would look for them. I don't add settings for things that have one
right answer.

### 6. Concrete over abstract

Behavior is specified as exact before/after states, with `|` for the
cursor:

```
CHARA|CTER (V.O.)        Tab →        CHARACTER ([V.O.])  {list open}
```

I describe bugs, decisions and tests this way, and I verify fixes by doing
the keystrokes in the real app, not only with unit tests.

### 7. Decide fast, change cheaply, write it down

Decisions are made quickly and revised without attachment when testing
shows something better. That only works because every decision and its
reason is recorded, so nothing is lost when it changes. Every bug, possible
bug or improvement idea goes into [docs/ROADMAP.md](docs/ROADMAP.md) as a
numbered item, unprompted. Typing rules and their test cases live in
[docs/EDITOR_BEHAVIOR_DECISIONS.md](docs/EDITOR_BEHAVIOR_DECISIONS.md).
Both are written in plain English, for people and for AI agents.

### 8. Respect the writer's time and attention

The author is a writer, not a programmer. I frame decisions in terms they
can judge (what happens on screen, what it would cost them), give one
recommendation with the alternatives, and handle the technical rest. I
avoid wasted work in my own process too, for example reading text rather
than screenshots when testing other apps.

## Working rules

- **Ask before changing a decided behavior.** If a rule in
  EDITOR_BEHAVIOR_DECISIONS.md is in the way, say so and propose a change;
  don't silently override it.
- **Bug surveys: document first.** When hunting for bugs, test and record
  them in the roadmap. Fix only when asked.
- **Every typing change:** update EDITOR_BEHAVIOR_DECISIONS.md (rule and
  test cases), CHANGELOG.md (Unreleased), and the roadmap item's status.
- **Pipeline: Dev, then Notes and GitHub, then a release.** Test every
  change in the Dev vault first (`npm run install-vault`). Once it passes
  there, do these together without asking: `npm run install-notes`, so the
  writer can check it in their Notes vault, then commit and push.
  `install-notes` also resets Scribidian's settings in Notes to the
  defaults every time (the writer's rule, so they always check what a new
  user gets): it backs up `data.json` to `settings-backups/` in the plugin
  folder (last 10), deletes it, and reloads the plugin in Obsidian. Don't
  skip it (`--keep-settings`) unless the writer asks. Publish a
  GitHub release only on the writer's explicit approval, once per checked
  batch (see docs/RELEASING.md). Before every public release, run the speed
  check (`& tools/perf/check.ps1` in the Dev vault, about 2 minutes); it
  must pass. Never push to the upstream First Draft
  repository (grobmeier/firstdraft).
- **Keep Apache 2.0 credit.** Changed or new code files carry the license
  header with the "Modifications copyright 2026 arvn" line
  (`npm run license:headers:check`).
- **`(CONT'D)` on the printed page only.** The PDF and the page preview add
  it (setting "Add (CONT'D) to continued dialogue", on by default; #265).
  Never add it to the Fountain text, the editor or text exports (Fountain,
  FDX), and never offer it as a suggestion (#125).
- **PDF appearance changes:** after any change to how the exported PDF
  looks, export a fresh PDF of the Dev vault's EXFILTRATION note
  (`2026.10.26 EXFILTRATION by Arun Croll SCRIBIDIAN.fountain`, at the
  vault root), so a new PDF is waiting there for the writer to review. Its
  Fade In export (`2026.10.26 EXFILTRATION by Arun Croll.pdf`) is the
  reference.
- **Fade In differences:** a behavior where Scribidian differs from Fade
  In gets a setting with ours as the default; its description says Off is
  Fade In's behavior, and it goes in `FADE_IN_DEFAULTS` (for the preset,
  #202).
- **Write UI text in sentence case** (the Obsidian lint rule checks it) and
  in plain, short words.
- **Live tests run only in the Dev vault** (`C:\Users\arunc\Code\Obsidian
Dev Vault\Dev`, `obsidian vault=Dev ...`), in its `Scribidian Example`
  folder (scratch note: `Scribidian Example/Test Bench.md`). Never test in
  the Notes vault, and never open or write the writer's real scripts
  (TIGHTER above all). Bring the Dev window to the front first (editor
  commands need focus; Notes is usually open too). A test script checks
  `app.vault.getName() === "Dev"`, uses the leaf it opened, never
  `activeLeaf`, and checks the editor's file path before every change; it
  stops if the path is outside that folder. (A test once overwrote TIGHTER
  this way; it was recovered with undo.)

## Performance rules

Follow the vault note **Obsidian Plugin Development - Performance
Guidelines** (`Tech/Obsidian/` in the Notes vault) for anything that runs
while the writer types. In short:

- A keystroke's work is proportional to the edit, never to the note: no
  `doc.toString()`, `getValue()` or whole-note parse or classify in
  transaction filters, `update` methods or what they call. Use the changed
  range, the visible range, or mapped decorations.
- Incremental code uses the same rules as the full pass and falls back to
  it whenever an edit could reach further (see `reclassifyAround` in
  `src/editor/screenplayLayout.ts`).
- Work that can arrive a moment later (counts, statistics, indexes) runs in
  the Web Worker (`src/workers/`), from pure code with a main-thread
  fallback.
- Caches key on everything their answer depends on. No stale results where
  the writer acts on them (suggestion lists).
- Before every public release: `& tools/perf/check.ps1` (compares typing,
  Enter and Tab with `tools/perf/baseline.json`; must print PASS).
- Measure with `tools/perf/` (README) in the Dev vault: at about 500 pages,
  alone and with the writer's plugins. Replay the recorded behavior cases
  against the previous build before shipping a speedup. Results so far:
  `docs/PERFORMANCE.md`.

## Checks before committing

```
npm run format
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npm run license:headers:check
```

`npm run build` also checks the bundle size. For typing behavior, also test
in Obsidian: `npm run install-vault` (builds and installs into the Dev
vault), reload the plugin, and run the keystrokes in a note with
`screenplay: true` in its frontmatter, in script mode with strict cursor
placement on. Once it passes, `npm run install-notes` puts the same build in
the writer's Notes vault (see the pipeline rule above).
