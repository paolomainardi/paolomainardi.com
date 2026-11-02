# Task 13: Literata text at screen resolution, and turning pages by hand

Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask.

## 1. Book and menu text in real Literata

The book's pixel fonts are either soft or no longer look like Literata. Replace
them: the book's text and the verb menu's text are drawn with the real Literata
font at screen resolution, like the text of The Curse of Monkey Island over
pixel art. The art stays pixel art; only this text is finer.

- `book.json` names the font files instead of atlases:
  `"font": { "regular": "fonts/literata.woff2", "semibold": "fonts/literata.woff2", "family": "Literata" }`
  plus sizes in game pixels: `"sizes": { "title": 13, "body": 6.5, "label": 6.5 }`
  and the weights to use. Copy the site's
  `/home/paolo/webapps/sparkfabrik/agents/site-redesign/wt-adventure/src/themes/large-print/static/fonts/literata-latin-opsz-normal.woff2`
  and the `latin-ext` file into `dev/real/book/fonts/` and load them with
  `FontFace`, so the engine still knows nothing about the site.
- Draw the text with Canvas 2D into a layer the size of the screen canvas, upload
  it as a texture and composite it after the upscale, so one text pixel is one
  screen pixel. Redraw the layer only when the spread, the hover, the menu or
  the canvas size change. Snap baselines and x positions to whole screen pixels.
- Colours stay `ink`, `faded` and `accent` from `book.json`.
- Layout uses the real font metrics, scaled from game pixels. Fill each page to
  its bottom margin: a page must not leave room for another entry unused.
- **The verb menu** uses the same layer: the target's name as a heading in
  Literata semibold with a 1 px rule under it, the verbs in Literata regular.
  The 5×7 font stays for the verb bar and the sentence line.
- Remove the atlas font code and files for the book and the menu, and update
  the contract, the placeholders and the tests.

## 2. Turning pages by hand

- **Visible corners.** When the pointer is over a page's lower outer corner,
  that corner curls up a little and the cursor becomes a hand. Make the curl
  sprite with a script in `tools/` from the page pixels of `open.png` (the
  corner folded back, its back a slightly darker paper tone, mapped to the
  palette), named in `book.json`.
- **Drag.** Pressing on a page's outer half (not on an entry) and dragging
  towards the spine turns the page with the pointer: the turn frames follow the
  drag. Releasing past halfway completes the turn, otherwise the page falls
  back. A plain click on a corner still turns it, the arrow keys still work.

## Docs and tests

Update `CONTRACT.md` and `README.md`. Tests for the layout filling the page, the
text layer redrawing only on change, corner hover, drag commit and fall back,
and the menu heading. Run the whole suite. One browser check only if the
sandbox allows it.

Finish with a short summary.
