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
  ink: "#1e1b17"
  ink-muted: "#56504a"
  ink-faint: "#8a8377"
  rule: "#e6ddcc"
  rule-strong: "#cec3ad"
  blush: "#b8617a"
  blush-wash: "#f8ecef"
  code-wash: "#f1eee6"
  code-ink: "#26221d"
  paper-night: "#1a1917"
  ink-night: "#f0e9dc"
  ink-muted-night: "#bcb3a6"
  ink-faint-night: "#8d8578"
  rule-night: "#302c27"
  rule-strong-night: "#453f37"
  blush-night: "#e5a3b2"
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
    textColor: "{colors.ink-muted}"
    padding: 20px
  note-rule:
    backgroundColor: "{colors.rule-strong}"
    width: 1px
  caution-rule:
    backgroundColor: "{colors.blush}"
    width: 2px
  figure:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.sm}"
  table-head:
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
  table-rule:
    backgroundColor: "{colors.ink-faint}"
    height: 1px
  term:
    textColor: "{colors.ink}"
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
  note-title:
    textColor: "{colors.ink-faint}"
    typography: "{typography.label}"
  caution-title:
    textColor: "{colors.blush}"
    typography: "{typography.label}"
  margin-note:
    textColor: "{colors.ink-muted}"
    typography: "{typography.apparatus}"
  sidenote:
    textColor: "{colors.ink-muted}"
    typography: "{typography.apparatus}"
  sidenote-mark:
    textColor: "{colors.blush}"
  copy-confirmed:
    textColor: "{colors.ink}"
  frontispiece:
    rounded: "{rounded.sm}"
  link-underline:
    textColor: "{colors.blush}"
  pull-quote-rule:
    backgroundColor: "{colors.rule-strong}"
    width: 3px
  selection:
    backgroundColor: "{colors.blush-wash}"
    textColor: "{colors.ink}"
  chart-mark:
    backgroundColor: "{colors.ink-faint}"
    width: 8px
    height: 8px
  chart-mark-highlight:
    backgroundColor: "{colors.blush}"
    width: 11px
    height: 11px
  chart-label:
    textColor: "{colors.ink-muted}"
    typography: "{typography.apparatus}"
  chart-value:
    textColor: "{colors.ink}"
    typography: "{typography.apparatus}"
  chart-axis:
    backgroundColor: "{colors.ink-faint}"
    height: 1px
  sparkline:
    textColor: "{colors.ink-muted}"
    height: 14px
---

## Overview

This is a personal engineering blog whose posts run to three thousand words,
with benchmark tables, shell listings, hardware photographs and footnotes. The
design has exactly one job: make that readable without effort, on a laptop, at
one hundred percent zoom.

The metaphor is a large print edition. Not a precious letterpress keepsake, but
the edition you can actually read: warm paper, a single serif set large, real
headings, and generous space. Where a book would put figure numbers and marginal
notes in the outer margin, this site does the same, which keeps the text column
free of labels and uses the width a wide window otherwise wastes.

Restraint is the rule. One typeface for everything the reader reads, one
monospace for machine text, one accent, and no decoration that does not carry
information. That last rule is Edward Tufte's: every drop of ink on the page
should say something about the content, so structure is drawn with space and
hairlines, and colour is kept for the one thing the reader should look at.

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

**blush** is the only accent. It marks what the reader should look at: links,
the current section, sidenote numbers, warnings and errors, deleted lines in a
diff, and the highlighted series in a chart. `blush-wash` is its pale form, used
for text selection and highlighted code lines. Never put body text on blush at
full strength.

There used to be four more, each with one job: sky for code, leaf for notes,
sun for cautions and lilac for margin notes, each with a wash for block
backgrounds. They were removed in October 2026. Five colours on a page meant
five things competing for attention, and none of them carried information that
a label or a hairline did not already carry. Code is told apart by its wash and
its typeface, notes by their label and rule, syntax by weight and slope.

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
- **Old style figures in running text**, so numbers sit in a line of prose the
  way lower case letters do. Tables, code, headings and charts keep lining
  figures, and table columns are tabular so digits line up.

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
opens to its left. Figure and chart captions, a listing's language and file
name, note labels, sidenotes and margin notes all move into that margin. Below 1200px the margin collapses
and every one of those labels falls back inline, above the block it belongs to.

Breakpoints, and what each one is for:

| Width  | What changes                                                |
| :----- | :---------------------------------------------------------- |
| 560px  | Contents rows stack, the dotted leader is dropped            |
| 640px  | Post navigation goes to one column                           |
| 768px  | Phone type scale, the header stacks into two rows            |
| 900px  | The contents block opens, and goes to two columns            |
| 1200px | The apparatus margin opens, the section rail replaces the bar|
| 1280px | Body type steps up to 21px                                   |
| 1560px | The section rail shows the current section name              |
| 1700px | Body type steps up to 22px                                   |

The page has one header. There is no second running head inside the page.

## Elevation & Depth

There is none, deliberately. No shadows, no cards, no raised surfaces. Depth is
expressed by colour weight and by hairlines. The only filled surface is the code
wash behind listings and inline code, and it casts no shadow.

## Shapes

Corners are nearly square: 3px on images and inline code, 4px on code blocks. Nothing is a pill, nothing is a circle. The portrait on the home page is
a rounded rectangle with a hairline, treated as a plate rather than an avatar.

## Components

**Listing.** A fenced code block. The language, when the fence names one, and
the file name from the fence title sit in the apparatus margin. Listings used to
be numbered; the numbers went in October 2026 for the same reason as the figure
numbers below, since no post ever referred to one. The code sits on the code
wash, with no rule beside it: the wash and the typeface already set it apart.
Highlighting is in ink, by weight and slope: keywords semibold, names medium,
comments italic and faint, strings a shade lighter. A copy button appears over the top right
on hover or focus, and reports Copied. A long line fades into the block
background at the right edge rather than being cut off.

**Figure.** The caption is the apparatus. It sits in the outer margin beside the
image, right aligned against it, and the picture carries nothing underneath.
There is no figure number: nothing in the prose ever referred to one, so the
number was occupying the margin while saying nothing, and the caption, which is
the part that tells you what you are looking at, was in the smallest position on
the page. Below 1200px the margin collapses and the caption falls back under the
image.

Images carry intrinsic width and height so the page does not reflow while they
load, which is why post images live in `assets/` rather than `static/`.

**Image overlay.** An image that would show at least 15% wider on its own gets a
zoom cursor, and clicking it, or pressing Enter on it, opens it in a modal
overlay: a near black field with the image fitted to the viewport and the caption
under it in light ink. It is the one dark surface in the light scheme, because a
picture reads best against black. The overlay starts from the copy already on the
page and swaps in the 1640px copy, or the original when smaller, once it loads.
Images that already show at full size, linked images and charts are left alone.

**Table.** Unnumbered, like listings and figures. Three rules and nothing
else: one above the head, one under it, one under the last row, with rows
separated by space. Column heads are small uppercase labels. A column whose
cells are all numbers, ranges or numbers with a short unit is right aligned on
tabular figures; the render hook detects it, and an alignment written in the
markdown wins. Scrolls sideways inside its own container on narrow screens.
Zebra striping, a filled header and a semibold first column were removed with
the extra accents, for the same reason.

**Link.** Underlined in blush at about half strength, full blush on hover, with
the text itself staying ink. There is no external link glyph: a post that cites
a dozen sources would carry one on every second line, and the underline already
says "link". Outbound links open in a new tab.

**Note and caution.** The `notice` shortcode. The label (note, tip, info,
question, example, warning, error) is apparatus: in the margin above 1200px,
above the note below that. A hairline runs down the left of the body, which is
muted ink at 95 percent size. Warnings and errors take the accent, on the label
and on a 2px rule; every other kind stays in ink.

**Contents leader.** A title, a dotted leader, and the date where a page number
would sit. Aligned on the last baseline so a title that wraps still has its rule
beside the closing line. Below 560px it stacks and the leader is dropped.

**Contents.** A disclosure. Open above 900px, where it is two columns and
compact, closed below, where a single column of section links filled most of the
first screen before the reader reached a word of the post. The open state is set
from script, because `open` is an attribute rather than a style, so without
JavaScript it stays closed at every width.

**Reading position.** Below 1200px, where the section rail has no margin to live
in, a 2px blush line across the top of the viewport, driven by the scroll
timeline. No script and no scroll listener. Browsers without scroll driven
animations show nothing.

**Header.** One bar. Wordmark left, menu right, and the colour scheme toggle as the last item of the menu, so it never floats over the text. Below 768px it stacks into two
rows, wordmark then links, with no disclosure: three short links do not need
one, and a menu cost 260px of header to show them. On the home page the wordmark
steps back to 17px regular muted, because the masthead repeats it directly
below.

**Portrait.** Full column width below 1200px, so its edges match the heading and
the text. In the apparatus margin above it, 210px. It is a plate, not an avatar:
same hairline and corner as a figure.

**Section rail.** On a post, a tick per top level section pinned to the left
edge of the viewport, outside the frame. The current tick is filled in blush and
grows from 10px to 18px, and above 1560px its section name is shown. It is an
orientation device, not navigation chrome, and it never appears below 1200px.

**Margin note.** The `marginal` shortcode. Floats into the outer margin above
1200px, sits in the column behind a hairline below that.

**Chart.** The `chart` shortcode draws a dot plot, a bar chart or a slopegraph
from a CSV file next to the post, when the site is built. It is HTML, not an image, so the
labels stay at reading size on a phone and the chart follows the colour scheme.
The rules are Tufte's:

- **One accent.** Context is ink, the highlighted series is blush with its
  values written beside it. Other series are told apart by shape (circle,
  square, diamond, triangle), so identity never depends on colour.
- **No grid, no frame.** The value axis is one hairline with round ticks, and
  the unit appears once, after the last tick.
- **Bars start at zero.** A dot plot does too unless the shortcode asks for
  `from="auto"`.
- **The numbers are never only in the picture.** Every chart ends with its
  data as a table behind a disclosure, and every mark has its exact value as a
  hover title.
- **Text wears text colours.** Values, labels and the key stay in ink; a
  coloured mark beside them carries the identity.
- **Explain on the chart, not in a legend.** An axis title under the axis says
  what the numbers are and which way is better ("Seconds, fewer is faster"). A
  name that means nothing alone gets a short note under its label, in muted
  ink and a smaller size.
- **Small multiples share one scale.** A dot or bar chart split by a column
  becomes a grid of small panels, as many across as fit, each titled in bold,
  on the same scale so they compare at a glance, with one key above them.
- **A slopegraph has no axis.** Each category is a line between two columns
  of labels, category and value on the left, value on the right, the higher
  values at the top. Labels that would collide are pushed apart and the lines
  end at them. Below 560px the category is not repeated on the right.

The caption is the apparatus, in the margin like a figure caption.

**Sparkline.** A word sized line chart, 14px tall, set inline with text: the
`sparkline` shortcode in a post, or the partial in a template. The line is
muted ink, the last value is a blush dot and the highest an ink dot. The home
page puts posts per year beside the Writing label.

**Link log.** The `links` section: pages worth reading, each with a short note.
An entry is the linked page's title, underlined like a link in prose because
it is the one thing to click, the site's host in small muted type, the note in
body text, and its tags in small type below. The date sits in the outer margin
above 1200px, like a caption, and links to the entry's own page. Entries are
grouped by month, twenty to a page. Above them an index of years gives each
year a sparkline of links per month on one shared scale, 20px tall, so the
years compare as small multiples; only the current year ends in a blush dot.
The home page lists the five newest under Writing, with the host where a date
would sit. A tag page lists its posts first, then its links.

**Pagination.** Page numbers in one line under a hairline, the current page in
ink and bold, the others muted links.

**Tag index.** Each tag carries its count and a short bar of the same length
ratio, so the shape of the site reads at a glance.

**Sidenote.** The `sidenote` shortcode, written inline where the reference mark
belongs. A blush number marks the text, and the note, numbered to match, sits
in the outer margin level with its line above 1200px, floated so that two notes
on one line stack rather than overlap. Below that it follows the
sentence as a short indented block. Numbers come from a CSS counter, so they
never need maintaining.

## Do's and Don'ts

**Do** keep the body type large. Every other decision is negotiable, that one is
not.

**Do** put the apparatus in the outer margin. Figure captions, a listing's
language and file name, note labels, sidenotes, years on the talks page and
the archive, and section names on the rail all live in the same column, which is
what makes the page feel like one system.

**Do** put information there, not bookkeeping. A label that nothing refers to is
decoration occupying a column.

**Do** give a narrow screen its own answer, not a fallback. The apparatus margin
and the section rail cannot exist below 1200px, so the caption goes under the
image, the labels go above their block, and the rail becomes a line at the top.
Each is a decision rather than a collapse.

**Do** keep to one accent. If something new seems to need a colour, ask whether
a label, a weight or a hairline would say the same thing first.

**Do** draw structure with hairlines and space.

**Don't** add a third typeface. Two families is the budget.

**Don't** justify text or indent first lines.

**Don't** put a box, card or shadow around anything.

**Don't** repeat the same words twice on one screen. The wordmark steps back to
a quiet label on the home page precisely because the masthead below it already
says the name.

**Don't** use `!important`. The theme ships one stylesheet, so order and scoping
are enough.

**Don't** load anything at runtime from a third party for the design layer.
Fonts are self hosted, styles and scripts are local.
