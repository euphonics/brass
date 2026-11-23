# PDF preview and export

Scribidian shows a read-only page preview (**Screenplay: Preview**) and
exports a PDF for a screenplay or a whole screenplay project:
**Screenplay: Export clean PDF** (or the preview's **Export clean PDF**
button) or **Screenplay: Export PDF**.

## What the PDF holds

**Export clean PDF** and the preview show the script as it would print:
the Obsidian-only markup ticked in the PDF column of **Settings →
Scribidian → Clean export** (tasks, callouts, comments, embeds and so on)
is left out, and links keep their words by default. Each format (Fountain,
PDF, Final Draft) has its own column, so the PDF can keep something the
Fountain export removes. **Export PDF** keeps that markup as text. Threads
and Fountain notes (`[[...]]`) are left out of both.

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
- Emphasis as Fountain writes it: `*italic*`, `**bold**`, `***bold
italic***` and `_underline_`, without the marks. A mark with no partner
  (`5 * 3`), or one escaped with a backslash (`\*`), prints as written.
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

- Adding scene numbers (ones you write print), revision colors and locked
  pages.

For a production PDF, export Fountain or Final Draft and make the PDF in
Final Draft, Fade In or another screenplay app.

## The font

PDFs use Courier Prime, the typeface made for screenplays, built into the
plugin (regular, bold, italic and bold italic). PDFs embed only the letters they use. Courier
Prime covers languages written in the Latin alphabet, accents included. It
has no Greek, Cyrillic, Chinese, Japanese, Korean or emoji.

When the script has a character the font can't draw, export stops and names
up to eight of them, with their Unicode code points. No PDF is saved. The
preview and Fountain export still work. The editor's font is a separate
setting and doesn't change the PDF.

## Speeches across pages

A character's cue, wrylies and dialogue are kept together as one speech. A
speech that doesn't fit at the bottom of a page is split at the end of a
sentence when at least two lines of dialogue fit on each page, as Fade In
does: the page ends with `(MORE)` under the speech, and the next page repeats
the cue. Otherwise the speech moves to the next page whole. A wryly always
stays with the dialogue after it.

**(CONT'D)** (setting **Add (CONT'D) to continued dialogue**, on by
default): the cue on the next page of a split speech, and the cue of a
character who speaks again after action in the same scene (the same cue,
extension included), get `(CONT'D)`, as Final Draft and Fade In print it.
Only the PDF and the preview show it; your Fountain text never changes.

## Page breaks and other rules

- A scene heading stays with what follows it, a page never starts with a
  transition, and an action paragraph split across pages leaves at least two
  lines on each page.
- `===` on its own line starts a new page.
- Scene numbers (`INT. HOUSE - DAY #1A#`) print in both margins beside the
  heading, not in it.
- Lyrics (`~`) print in italics.

## Paragraphs and dual dialogue

- Action lines with no blank line between them print as one paragraph with
  line breaks, as Fountain says.
- Dual dialogue (a cue ending in `^`) prints side by side with the speech
  before it, in Fade In's columns.

For moving a script into Final Draft, see
[FDX compatibility](FDX_COMPATIBILITY.md).
