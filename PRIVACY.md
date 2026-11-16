# Privacy and security

**In short:** Scribidian works entirely on your device. It never goes online,
sends nothing anywhere, has no account and collects no data. Every change it
makes to your notes is ordinary text that you can undo.

## What it never does

- **No internet.** It makes no network requests: no downloads, uploads, sync,
  telemetry, analytics, accounts or cloud services. The only web address in the
  plugin is a help link that opens in your browser when you click it.
- **No code from outside.** It doesn't load scripts from the internet and
  doesn't run code from your notes. Character page templates are plain text:
  placeholders like `{{character}}` are filled in, and nothing in a template is
  executed.
- **No clipboard.** It doesn't read or write the clipboard. You copy cheat
  sheet examples yourself with your normal shortcut.
- **No vault-wide scanning.** It doesn't list or read every file in your vault.

## What it reads

Only what a feature needs:

- the screenplay you are editing, and the parts of its screenplay project
  (found through the project note's own list of parts and the folders above
  the note, not by searching the vault);
- character pages in the character folder you set;
- the character page template you choose in settings;
- the folder set in Obsidian's core **Templates** plugin, to narrow the
  template picker. This uses an internal Obsidian setting; if Obsidian changes
  it, the picker searches the whole vault instead.

The statistics, character checks and continuity inspector work this out fresh
from your text each time. Their results stay in memory and are never written
into your notes or a database.

## What it changes in your notes

All changes are ordinary text edits you can undo with Ctrl+Z (Cmd+Z on Mac) or
recover from Obsidian's file history.

- **Smart Tab and Enter** insert screenplay text: blank lines, `()`, `-` and
  so on.
- **Typing help** (on in script mode, can be turned off): the first letter of
  a line becomes a capital, and sluglines and transitions become uppercase as
  you type.
- **Turning a note into a screenplay** adds `screenplay: true`, and a `title`
  if the note has none.
- **Opening a character page** creates the page, or, if a page with that name
  already exists, adds the properties Scribidian needs (`scribidian`,
  `character`, `aliases`, `screenplays`, `related`). The page's text is not
  changed.
- **Exports** (Fountain, Final Draft, PDF) always create a new file. Your
  screenplay is never changed.

### The scene recovery file

Moving a scene from one file to another (in the scene workspace) first saves
the full text of both files, before and after, in `scene-recovery.json` in
Scribidian's plugin folder, normally `.obsidian/plugins/scribidian/`. Each new
move replaces it. It is plain text, not encrypted, and may end up in backups
and sync. Delete it when you no longer need it. Moving a scene within one file
doesn't create it.

### Chinese, Japanese and Korean PDF fonts

Installing the optional PDF fonts reads only the two font files you pick
yourself. Scribidian checks them against the official checksums, stores them
in its plugin folder, and checks them again before each export. It never
downloads fonts.

## What you are trusting

Like every Obsidian community plugin, Scribidian runs with the same access as
Obsidian itself: it can read and change any note in your vault and, on desktop,
use your computer much as other apps can. Obsidian doesn't sandbox plugins.
Installing it means trusting the code in this repository and the GitHub account
that publishes it. The source is open; review it, or build it yourself with
`npm ci && npm run build`, if you want to check what you install.

The installed plugin includes four libraries, all for PDF export: `pdf-lib`,
`@pdf-lib/fontkit`, `linebreak` and `pako`. Their versions are pinned. Build
and test tools run only on the developer's computer and are not part of the
installed plugin.

Scribidian is an independent project. Nothing from First Draft, the plugin it
was forked from, reaches it automatically; changes arrive only when they are
deliberately merged and reviewed here.

Obsidian, other plugins, sync services and your operating system are outside
Scribidian's control and have their own privacy rules.

## Reporting a problem

Report suspected security problems privately, not in a public issue:

- **Problems in Scribidian**: follow [SECURITY.md](SECURITY.md).
- **Problems that also affect First Draft**: report them to its author through
  [First Draft's security page](https://github.com/grobmeier/firstdraft/security).

Never attach real screenplay content, passwords or other personal data to a
report.
