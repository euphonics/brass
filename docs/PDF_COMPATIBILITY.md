# PDF preview and export

Scribidian shows a read-only page preview (**Screenplay: Preview**) and
exports a PDF (**Screenplay: Export PDF**, or the preview's **Export PDF**
button) for a screenplay or a whole screenplay project.

## What the PDF holds

The preview and the PDF show the script as it would print: the same text as
**Export to clean Fountain**. Notes, tasks, callouts, comments, embeds,
threads and the other Obsidian-only markup chosen under **Clean export** are
left out; links keep their words. Changing those settings changes the PDF too.

- Sluglines, action, character cues and extensions, wrylies, dialogue,
  transitions, centered text and lyrics.
- US Letter or A4, from **Settings → Scribidian → Page size**.
- 12-point Courier Prime with the margins Final Draft and Fade In use:
  action at 1.5", dialogue at 2.5", wrylies at 2.9", character names at
  3.5", and a 1" margin at the top, right and bottom. A scene heading is
  never left alone at the bottom of a page.
- Page numbers at the top right (`2.`), starting on the second page of the
  script.
- Bold where you want it: **Settings → Scribidian → PDF export** has a
  toggle for each part (sluglines, action, character names, dialogue,
  wrylies, transitions, centered text, lyrics, the title, the title page
  details and page numbers). Only sluglines are bold by default. The preview
  follows the same settings.
- A title page when the screenplay (or project) has title properties; see
  [Title pages](../README.md#title-pages).
- A project's parts in the order of the project note's `parts` list.
- A new file every time. The PDF is named after the note (or project) and
  saved beside it; when that name is taken, a number is added. Scribidian
  never overwrites a PDF.

Everything happens on your device. Nothing is uploaded, and your script is
never changed.

## Not there yet

The PDF is for reading and review. It isn't locked production pagination and
may not match Final Draft page for page. These aren't handled yet:

- Dual dialogue side by side (each speech prints in turn).
- Bold, italic and underline: `*walks*`, `**fast**` and `_under_` print with
  their marks.
- Scene numbers, revision colors and locked pages.

For a production PDF, export Fountain or Final Draft and make the PDF in
Final Draft, Fade In or another screenplay app.

## The font

PDFs use Courier Prime, the typeface made for screenplays, built into the
plugin (regular and bold). PDFs embed only the letters they use. Courier
Prime covers languages written in the Latin alphabet, accents included. It
has no Greek, Cyrillic, Chinese, Japanese, Korean or emoji.

When the script has a character the font can't draw, export stops and names
up to eight of them, with their Unicode code points. No PDF is saved. The
preview and Fountain export still work. The editor's font is a separate
setting and doesn't change the PDF.

## Speeches across pages

A character's cue, wrylies and dialogue are kept together as one speech. A
short speech that doesn't fit at the bottom of a page moves to the next page
whole. A long one is split: the page ends with `(MORE)` and the next page
repeats the cue as written. A wryly always stays with the dialogue after it.
The preview uses the same rules.

For moving a script into Final Draft, see
[FDX compatibility](FDX_COMPATIBILITY.md).
