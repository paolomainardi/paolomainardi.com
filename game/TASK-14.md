# Task 14: NF-Pixels on the game grid for the book and the menu

The book and the verb menu move from Literata at screen resolution to NF-Pixels,
a pixel font, drawn on the game's own 640×360 grid like the rest of the art.
Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask.

The font is vendored, unmodified, in `dev/real/book/fonts/NFPixels-Regular.ttf`
with its licence `NFPixels-OFL.txt` (SIL OFL 1.1). Its glyphs sit on a 10 px em:
cap height 7 px, x-height 5 px.

## What changes

- **Font.** `book.json` names `fonts/NFPixels-Regular.ttf`; load it with
  `FontFace`. Body text at 10 px (one font pixel is one game pixel), the book
  title at 20 px. NF-Pixels has one weight: the menu heading uses the same font,
  set apart by the rule under it and by `faded`, not by weight.
- **Game grid, solid pixels.** Draw the text into a 640×360 layer, threshold its
  alpha to 0 or 255, and composite it into the game frame before the upscale, so
  every text pixel is a whole game pixel, sharp at any scale. Positions are whole
  game pixels.
- **Layout.** Line height 13 px for body text, with half a line between
  entries; titles wrap to at most two lines with an ellipsis, as now. Pages fill
  to the bottom margin.
- **Clean up.** Remove the Literata files and the screen-resolution text path.
  Keep the redraw-only-on-change behaviour. Placeholders and tests use
  NF-Pixels too; the font licence file is copied with it wherever the font is.
- The 5×7 font of the verb bar and the sentence line stays.

## Docs and tests

Update `CONTRACT.md` and `README.md` (name the font and its licence). Tests:
text alpha is only 0 or 255, glyph positions are whole game pixels, layout
fills the page, the menu heading. Run the whole suite. One browser check only
if the sandbox allows it.

Finish with a short summary.
