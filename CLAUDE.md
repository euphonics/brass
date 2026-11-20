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
a bug, even if the text is right. When I change typing behaviour, I judge it
by how it feels mid-scene, not by how clean the code is.

### 2. Never leave the script invalid

The text is Fountain, and it must stay valid Fountain. If an action would
leave something no Fountain app can read the same way (text glued under
dialogue, a lone `(` on a wryly line, typing on the blank line that
separates two blocks), the editor prevents it or does something sensible
instead. Refusing a keystroke is better than producing a broken script.
Strict cursor placement is this principle as a feature.

### 3. Industry tools are the reference, not the master

Writers arrive with Final Draft and Fade In muscle memory, so their
behaviour is the default answer to "what should this key do?". When in
doubt, match them. But the writer's considered choice wins over parity, and
some things Fade In does can't exist in Fountain (it stores an element on
every line; Fountain infers elements from text). Then I pick the closest
valid behaviour and say so.

### 4. Plain text is the truth; display is a view

The note's text is the screenplay. Layout, columns and styling only change
how it looks. I don't rewrite the writer's text behind their back. Anything
that changes how other apps read the file (marking capitals as action with
`!`, cleaning Obsidian syntax) belongs in export options, off the page.
Scribidian writes; finishing (PDF, production) happens in dedicated
screenwriting software, so I don't rebuild what those apps do better.

### 5. Good defaults, with the writer in charge

Where behaviour is a matter of taste (case-sensitive suggestions, what Tab
does inside a line, Enter after a wryly), it becomes a setting with a
sensible default. Settings are explained in plain words and grouped where a
writer would look for them. I don't add settings for things that have one
right answer.

### 6. Concrete over abstract

Behaviour is specified as exact before/after states, with `|` for the
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

- **Ask before changing a decided behaviour.** If a rule in
  EDITOR_BEHAVIOR_DECISIONS.md is in the way, say so and propose a change;
  don't silently override it.
- **Bug surveys: document first.** When hunting for bugs, test and record
  them in the roadmap. Fix only when asked.
- **Every typing change:** update EDITOR_BEHAVIOR_DECISIONS.md (rule and
  test cases), CHANGELOG.md (Unreleased), and the roadmap item's status.
- **Push only when asked.** Never push to the upstream First Draft
  repository (grobmeier/firstdraft).
- **Keep Apache 2.0 credit.** Changed or new code files carry the license
  header with the "Modifications copyright 2026 arvn" line
  (`npm run license:headers:check`).
- **No `(CONT'D)`, ever.** Scribidian doesn't handle CONT'D, in the editor
  or exports (roadmap #125). Don't propose it or raise it again.
- **Fade In differences:** a behaviour where Scribidian differs from Fade
  In gets a setting with ours as the default; its description says Off is
  Fade In's behaviour, and it goes in `FADE_IN_DEFAULTS` (for the preset,
  #202).
- **Write UI text in sentence case** (the Obsidian lint rule checks it) and
  in plain, short words.
- **Live tests in the writer's vault happen only in the `Scribidian Example`
  folder** (scratch note: `Scribidian Example/Test Bench.md`). Never open or
  write the writer's real scripts (TIGHTER above all). A test script uses
  the leaf it opened, never `activeLeaf`, and checks the editor's file path
  before every change; it stops if the path is outside that folder. (A test
  once overwrote TIGHTER this way; it was recovered with undo.)

## Checks before committing

```
npm run format
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
npm run license:headers:check
```

`npm run build` also checks the bundle size. For typing behaviour, also test
in Obsidian: build, copy `main.js`, `styles.css` and `manifest.json` into a
vault's `.obsidian/plugins/scribidian/`, reload the plugin, and run the
keystrokes in a note with `screenplay: true` in its frontmatter, in script
mode with strict cursor placement on.
