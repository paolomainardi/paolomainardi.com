---
version: alpha
name: Large Print
description: >-
  The reading design for paolomainardi.com. A book set in large print: warm
  paper, one serif at a size you do not have to zoom, and an outer margin that
  carries the apparatus so the text column stays clean.
colors:
  primary: "{colors.ink}"
  secondary: "{colors.ink-muted}"
  tertiary: "{colors.blush}"
  neutral: "{colors.paper}"
  paper: "#fbf7ef"
  paper-raised: "#f3ecdf"
  ink: "#1e1b17"
  ink-muted: "#56504a"
  ink-faint: "#8a8377"
  rule: "#e6ddcc"
  rule-strong: "#cec3ad"
  blush: "#b8617a"
  blush-wash: "#f8ecef"
  sky: "#5e83b6"
  sky-wash: "#e9eff6"
  leaf: "#6f9878"
  leaf-wash: "#e8f0e9"
  sun: "#c07f3f"
  sun-wash: "#faeee1"
  lilac: "#8b7cae"
  lilac-wash: "#efecf6"
  code-wash: "#f1eee6"
  code-ink: "#26221d"
  paper-night: "#1a1917"
  paper-raised-night: "#232120"
  ink-night: "#f0e9dc"
  ink-muted-night: "#bcb3a6"
  ink-faint-night: "#8d8578"
  rule-night: "#302c27"
  rule-strong-night: "#453f37"
  blush-night: "#e5a3b2"
  sky-night: "#a4bbdb"
  leaf-night: "#a8c8ad"
  sun-night: "#e0b184"
  lilac-night: "#bdaeda"
  code-wash-night: "#201e1c"
  code-ink-night: "#ece5d8"
typography:
  body:
    fontFamily: Literata
    fontSize: 20px
    lineHeight: 1.62
    fontWeight: 400
  body-wide:
    fontFamily: Literata
    fontSize: 21px
    lineHeight: 1.62
    fontWeight: 400
  body-ultrawide:
    fontFamily: Literata
    fontSize: 22px
    lineHeight: 1.62
    fontWeight: 400
  masthead:
    fontFamily: Literata
    fontSize: 50px
    lineHeight: 1.05
    fontWeight: 600
    letterSpacing: -0.02em
  h1:
    fontFamily: Literata
    fontSize: 47px
    lineHeight: 1.08
    fontWeight: 600
    letterSpacing: -0.02em
  h2:
    fontFamily: Literata
    fontSize: 29px
    lineHeight: 1.2
    fontWeight: 600
    letterSpacing: -0.015em
  h3:
    fontFamily: Literata
    fontSize: 23px
    lineHeight: 1.25
    fontWeight: 600
  h4:
    fontFamily: Literata
    fontSize: 20px
    lineHeight: 1.3
    fontWeight: 600
  lede:
    fontFamily: Literata
    fontSize: 22px
    lineHeight: 1.5
    fontWeight: 400
  pull-quote:
    fontFamily: Literata
    fontSize: 22px
    lineHeight: 1.45
    fontWeight: 400
  drop-cap:
    fontFamily: Literata
    fontSize: 66px
    lineHeight: 0.8
    fontWeight: 600
  meta:
    fontFamily: Literata
    fontSize: 16px
    lineHeight: 1.4
    fontWeight: 400
  label:
    fontFamily: Literata
    fontSize: 15px
    lineHeight: 1.4
    fontWeight: 600
    letterSpacing: 0.1em
  apparatus:
    fontFamily: Literata
    fontSize: 14px
    lineHeight: 1.45
    fontWeight: 400
  code:
    fontFamily: JetBrains Mono
    fontSize: 16px
    lineHeight: 1.6
    fontWeight: 400
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 0.86em
    fontWeight: 400
rounded:
  sm: 3px
  md: 4px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 56px
components:
  page-frame:
    width: 1120px
  reading-column:
    width: 820px
  apparatus-margin:
    width: 180px
  listing:
    backgroundColor: "{colors.code-wash}"
    textColor: "{colors.code-ink}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: 18px
  listing-copy:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: 4px
  note:
    backgroundColor: "{colors.leaf-wash}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: 20px
  caution:
    backgroundColor: "{colors.sun-wash}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: 20px
  plate:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.sm}"
  table-head:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
  term:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 5px
  rail-tick:
    backgroundColor: "{colors.rule-strong}"
    width: 10px
    height: 2px
  rail-tick-current:
    backgroundColor: "{colors.blush}"
    width: 18px
    height: 2px
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  page-night:
    backgroundColor: "{colors.paper-night}"
    textColor: "{colors.ink-night}"
    typography: "{typography.body}"
  link:
    textColor: "{colors.ink}"
  link-hover:
    textColor: "{colors.blush}"
  meta:
    textColor: "{colors.ink-faint}"
    typography: "{typography.meta}"
  hairline:
    backgroundColor: "{colors.rule}"
    height: 1px
  hairline-strong:
    backgroundColor: "{colors.rule-strong}"
    height: 1px
  info:
    backgroundColor: "{colors.sky-wash}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: 20px
  example:
    backgroundColor: "{colors.lilac-wash}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: 20px
  error:
    backgroundColor: "{colors.blush-wash}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: 20px
  note-title:
    textColor: "{colors.leaf}"
    typography: "{typography.label}"
  caution-title:
    textColor: "{colors.sun}"
    typography: "{typography.label}"
  info-title:
    textColor: "{colors.sky}"
    typography: "{typography.label}"
  example-title:
    textColor: "{colors.lilac}"
    typography: "{typography.label}"
  listing-rule:
    backgroundColor: "{colors.sky}"
    width: 3px
  margin-note:
    textColor: "{colors.ink-muted}"
    typography: "{typography.apparatus}"
  copy-confirmed:
    textColor: "{colors.leaf}"
  drop-cap:
    textColor: "{colors.blush}"
    typography: "{typography.drop-cap}"
---

## Overview

This is a personal engineering blog whose posts run to three thousand words,
with benchmark tables, shell listings, hardware photographs and footnotes. The
design has exactly one job: make that readable without effort, on a laptop, at
one hundred percent zoom.

The metaphor is a large print edition. Not a precious letterpress keepsake, but
the edition you can actually read: warm paper, a single serif set large, real
headings, and generous space. Where a book would put plate numbers and marginal
notes in the outer margin, this site does the same, which keeps the text column
free of labels and uses the width a wide window otherwise wastes.

Restraint is the rule. One typeface for everything the reader reads, one
monospace for machine text, four pastel accents each with a single job, and no
decoration that does not carry information.

## Colors

Warm paper rather than white, and ink rather than black. The night palette is
the same idea inverted, not a separate design; every token has a `-night`
counterpart and the whole set is swapped by the colour scheme class on `body`.

The `-night` tokens are deliberately not wired to individual components, because
no component picks between them. The swap happens once, at the palette level, so
a linter reporting them as unreferenced is expected rather than a gap.

- **paper (#fbf7ef):** the ground for the whole page, edge to edge. There is no
  card, panel or sheet floating on a different background.
- **ink (#1e1b17):** body text and headings.
- **ink-muted (#56504a):** secondary prose, captions, quoted abstracts.
- **ink-faint (#8a8377):** metadata, labels, apparatus, anything you read second.
- **rule (#e6ddcc) and rule-strong (#cec3ad):** hairlines and dotted leaders.
  Structure is drawn with one pixel, never with a box.

The four accents each have exactly one job, and they never swap roles:

- **blush:** links, list markers, the drop cap, the current section mark.
- **sky:** code. The rule down the left of a listing, and function names in
  syntax highlighting.
- **leaf:** notes, and the confirmation state of the copy button.
- **sun:** cautions and warnings.

**lilac** is the fifth, used only for margin notes and numeric literals in code.

Accents are used at full strength for marks and hairlines, and as a wash
(the `-wash` tokens) for block backgrounds. Never put body text directly on an
accent at full strength.

## Typography

Two families, and the second one only ever holds machine text.

- **Literata** carries everything a human wrote: the masthead, headings, body,
  captions, labels and navigation. It is a variable font with an optical size
  axis, self hosted, latin and latin-ext only.
- **JetBrains Mono** carries everything a machine wrote: code blocks, inline
  code, and command output. Variable, self hosted, same subsets.

Body text is 20px, rising to 21px above 1280px and 22px above 1700px, on a 1.62
line height across a measure of about 70 characters. This is the single most
important number in the design. If a change makes the body smaller, the change
is wrong.

Three decisions that separate this from a typical book pastiche, all made for
legibility:

- **Ragged right, never justified.** Justification with hyphens looks like a
  book and reads worse on a screen.
- **Spaced paragraphs, no first line indents.** Easier to scan, which is how
  people read technical writing.
- **Section heads are real headings at 29px**, not small caps at 15px. A heading
  that reads as a caption is not doing its job.

The drop cap opens the first paragraph of a post and appears nowhere else. Index
pages have a lead-in, not an opening paragraph, so they do not get one.

## Layout

Three numbers drive every page, and they are CSS custom properties so the whole
layout retunes from one place:

- **frame, 1120px:** the outer width the page never exceeds.
- **offset, 240px:** how far the reading column is pushed right, which is also
  the room available to the apparatus margin.
- **measure, 820px:** the reading column itself.

Above 1200px the reading column sits at the offset and the apparatus margin
opens to its left. Plate numbers, listing numbers and captions, table numbers
and margin notes all move into that margin. Below 1200px the margin collapses
and every one of those labels falls back inline, above the block it belongs to.

Breakpoints, and what each one is for:

| Width  | What changes                                                |
| :----- | :---------------------------------------------------------- |
| 560px  | Contents rows stack, the dotted leader is dropped            |
| 640px  | Post navigation goes to one column                           |
| 768px  | Phone type scale, the navigation becomes a menu              |
| 900px  | The contents block in a post goes to two columns             |
| 1200px | The apparatus margin opens, the section rail appears         |
| 1280px | Body type steps up to 21px                                   |
| 1560px | The section rail shows the current section name              |
| 1700px | Body type steps up to 22px                                   |

The page has one header. There is no second running head inside the page.

## Elevation & Depth

There is none, deliberately. No shadows, no cards, no raised surfaces. Depth is
expressed by colour weight and by hairlines. The only filled surfaces are the
code wash, the accent washes on notes, and `paper-raised` behind table headers
and tag chips, and none of them cast a shadow.

## Shapes

Corners are nearly square: 3px on images and notes, 4px on code blocks and
chips. Nothing is a pill, nothing is a circle. The portrait on the home page is
a rounded rectangle with a hairline, treated as a plate rather than an avatar.

## Components

**Listing.** A fenced code block. The listing number, the language and the file
name from the fence title sit in the apparatus margin. The code sits on the code
wash behind a 3px sky rule on its left. A copy button appears over the top right
on hover or focus, and reports Copied. A long line fades into the block
background at the right edge rather than being cut off.

**Plate.** A figure. The plate number sits in the apparatus margin, the caption
under the image. Images carry intrinsic width and height so the page does not
reflow while they load, which is why post images live in `assets/` rather than
`static/`.

**Table.** Numbered like a plate, with the number in the margin. Small caps
column headers on `paper-raised`, hairline row rules, zebra striping at thirty
percent rule, and the first column in semibold. Scrolls sideways inside its own
container on narrow screens.

**Note and caution.** The theme notice shortcode, repainted on the accent
washes. Leaf for a note or tip, sky for info, lilac for question or example, sun
for a warning, blush for an error. The title is a small uppercase label in the
accent colour, the body is muted ink at 95 percent size.

**Contents leader.** A title, a dotted leader, and the date where a page number
would sit. Aligned on the last baseline so a title that wraps still has its rule
beside the closing line. Below 560px it stacks and the leader is dropped.

**Section rail.** On a post, a tick per top level section pinned to the left
edge of the viewport, outside the frame. The current tick is filled in blush and
grows from 10px to 18px, and above 1560px its section name is shown. It is an
orientation device, not navigation chrome, and it never appears below 1200px.

**Margin note.** Floats into the outer margin above 1200px, sits in the column
behind a lilac rule below that.

## Do's and Don'ts

**Do** keep the body type large. Every other decision is negotiable, that one is
not.

**Do** put labels in the apparatus margin. Listing numbers, plate numbers, table
numbers, years on the talks page, and section names on the rail all live in the
same column, which is what makes the page feel like one system.

**Do** give each accent one job. If something new needs a colour, ask which of
the four existing jobs it belongs to before adding a fifth.

**Do** draw structure with hairlines and space.

**Don't** add a third typeface. Two families is the budget.

**Don't** justify text or indent first lines.

**Don't** put a box, card or shadow around anything.

**Don't** repeat the same words twice on one screen. The wordmark steps back to
a quiet label on the home page precisely because the masthead below it already
says the name.

**Don't** use `!important`. Theme rules are outranked by scoping component rules
under `body:is(.colorscheme-light, .colorscheme-dark, .colorscheme-auto)`, which
adds one class of specificity and wins ties by load order.

**Don't** load anything at runtime from a third party for the design layer.
Fonts are self hosted, styles and scripts are local.
