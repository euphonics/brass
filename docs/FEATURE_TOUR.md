# Scribidian feature tour

Scribidian keeps Fountain or Markdown as the source of truth and adds a
screenplay-aware workspace around it. Everything shown below runs locally in
Obsidian.

The scene workspace and continuity inspector screenshots show **0.13.0**.
The other screenshots and short video show the continuing writing and export
workflow introduced in earlier releases. All captures use an isolated demo vault.

## Write with keyboard-first tools

Autocomplete and keyboard-first commands cover sluglines, known
locations, times of day, character cues, character extensions,
wrylies, and transitions. Statistics in the status bar update while the
source remains ordinary portable text.

Smart Tab and Smart Enter move from element to element; you choose what each
starts after every element under **Tab and Enter keys**. **Tab with a list
open** decides whether Tab picks the highlighted suggestion or skips to the
next element. With strict cursor placement on, Tab and Enter never leave
broken formatting such as an empty `()`, a wryly under a wryly or stacked
blank lines, and deleting a selection removes whole sluglines, cues and
wrylies rather than leaving a stray `)`.

`$placeholders` show in the accent colour, `// line comments` are faded, and
`~` lyrics are their own element.

## Combine a screenplay from several files

A project note owns the explicit reading order. Parts can live in different
folders, and the `parts` property stays readable one link per line.

![Multi-file screenplay project](images/multi-file-project.png)

Project statistics, checks, preview, and Fountain and FDX
exports operate on the combined screenplay. Previous/next actions move between
parts without the command palette.

## Plan and navigate scenes

Click the clapperboard icon or run **Open scenes** with Cmd/Ctrl+P.
Scene cards show headings, source parts, characters, portable `= Synopsis` notes
and approximate page positions. Search or filter by part, character, location or
time; click a heading to return to the original text.

![Scene workspace with source part and portable synopsis](images/scene-workspace.png)

Create scenes, edit synopses and rearrange complete scene blocks. Cross-part moves
require confirmation and saved, unchanged notes; **Restore last move** retains a
local recovery copy and refuses to overwrite later writing. Unsupported syntax
disables editing with an explanation. See the [Scenes panel guide](SCENE_WORKSPACE.md)
for safety boundaries and the remaining desktop acceptance checks.

## Preview and export

Preview renders the active screenplay or whole project as paper-like pages.
The toolbar exports a new Fountain file without changing or overwriting the
source. Import it into Final Draft, Fade In or another screenplay app to make
the PDF.

![Screenplay preview](images/screenplay-preview.png)

The configured US Letter or A4 size controls the preview and page counts.

## Keep character context in normal Markdown

Character dossiers hold background, wants, voice, relationships, and
continuity notes. Scribidian derives appearances and dialogue usage from the
screenplay and offers the normal Obsidian Local Graph for relationships.

![Character dossier and derived screenplay context](images/character-workspace.png)

Deterministic checks report missing pages, duplicate identities, ambiguous
aliases, broken relationships, unused pages, and likely spelling variants.
They do not generate or rewrite story material.

## Review source-linked continuity signals

Run **Inspect continuity** from Cmd/Ctrl+P or the Scenes panel.
It combines character identity, alias, relationship and spelling checks with
advice about optional dossiers, empty scenes and missing time-of-day labels.
Evidence opens the original cue, heading or character page; changed sources
require **Refresh** before navigation.

![Read-only continuity inspector with original-source links](images/continuity-inspector.png)

Only the current screenplay/project parts and configured character folder are
checked. **Checks incomplete** explicitly discloses unsupported or unresolved
scope. This is not an assessment of story logic, chronology, props or inferred
character presence, and it never rewrites your text. See the
[continuity inspector guide](CONTINUITY_INSPECTOR.md).

## Keep the terminology close

The offline cheat sheet explains screenplay terms, Fountain syntax, and First
Draft project concepts. Its examples are selectable and use the normal system
copy shortcut; the plugin itself never reads the clipboard. It writes to it
only for the command **Copy configuration to clipboard**.

![Offline screenplay cheat sheet](images/cheat-sheet.png)

## Try it safely

Run **Create example screenplay** from the command palette. It creates a self-contained tour with a project, parts, and character
dossiers. Existing vault content is never overwritten.

The 13-second [preview demo](images/scribidian-demo.mp4), recorded when Scribidian still had PDF export, is also
available as a compact video.
