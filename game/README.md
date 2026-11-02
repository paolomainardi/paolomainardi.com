# Adventure engine

A standalone WebGL2 point-and-click prototype. No runtime dependencies or build step.

From this folder:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/dev/>. **Start** requests fullscreen; **Start in window** stays windowed. Click the floor to walk. Select a verb, then a lamp, book, window, or door. `T` switches dusk/night, `L` toggles the lantern, `G` toggles bloom for comparison, and `Esc` closes the reader.

Embed the engine in a container with a defined width and height:

```js
import { boot } from "./src/main.js";

const game = await boot({
  world: "./dev/data/world.json",
  content: "./dev/data/content.json",
  element: document.querySelector("#game"),
});
// game.destroy() removes the game and its listeners.
```

Paths follow [CONTRACT.md](CONTRACT.md), including reader URLs relative to `content.json`. Hashes restore the room and reader after Start.

## Right-click verb menu

Right-click a hotspot, lamp, exit, content object, or topic book to open a
parchment menu beside the pointer. The menu stays inside the game frame and
shows the target's name and its supported verbs in world order. Hover a verb
to highlight it in rose and preview the sentence. The heading uses NF-Pixels in the faded colour with a one-game-pixel rule;
verbs use the same font and weight. Worlds without
book art retain the 5×7 menu font.

Click a verb, or use Up/Down and Enter, to walk over and run it. **Take** opens
a topic book or a content object's reader. The verb bar keeps its selected
verb. Escape, an outside click, an empty-floor right click, or a room change
closes the menu. The browser context menu is suppressed over the game.

## Topic books

Each room's `books` list fills its shelf slots in order. Each id names a book in
`world.json`'s `books` map, with a title, content filter, and its own sprite.
Series books sort by part; other topics sort by newest date. Books contain posts.
The window still opens the newest link.

Click a book, or choose **Open**, to walk over and open its close-up. **Look at**
says the title and post count. The first page shows the title and count, followed
by post titles and dates. Titles wrap to two lines with an ellipsis. NF-Pixels uses 10 px body text with 13 px line height and 20 px titles.
Entries have half a line of spacing, rounded to 7 game pixels. Font metrics fill
pages to the bottom margin. Text uses the book's ink, faded and accent colours
on a 640×360 Canvas 2D layer, with alpha thresholded to 0 or 255 and whole
game-pixel positions. The layer composites into the game frame before upscale
and redraws only when the book, spread, hover, menu or game-frame size changes. The verb bar and sentence line keep the 5×7 font.

Hover an entry to highlight it, then click to read. The reader's **Open on the
website** link opens its URL in a new tab. Closing the reader returns to the same
spread. Hover a lower outer corner to curl it and show a hand cursor. Drag a
page's outer half towards the spine, away from entries, to control the turn.
Release past halfway to finish, or release earlier to fall back. Pointer
cancellation also falls back. A corner click or left/right arrows turn pages.
Escape, the **Close**
label, or a click outside the book returns to the room at the same position.

`#stone-house/book/workstation/2` restores spread 2 after Start, including on
reload. The DOM contains a visually hidden catalogue of every book and its post
links. Pagination follows font metrics and the supplied page rectangles. Real-art books use
placeholder close-up art until a `dev/real/book/` folder is supplied; generation
never replaces an existing real-art book folder. See [CONTRACT.md](CONTRACT.md)
for the font and book data formats.

Both book fixtures bundle the unmodified NF-Pixels TTF and its SIL Open Font
License 1.1 in `fonts/NFPixels-OFL.txt`. The engine loads the local font with
`FontFace` without access to the site. Regenerate
palette-mapped corner sprites with `python tools/make_curls.py` using a
Pillow-enabled Python.

In `world.json`, each `objects` value accepts a single sprite path or a non-empty list, such as `"book": ["objects/book.png", "objects/book-green.png", "objects/book-blue.png"]`. Content objects cycle through that list in occupied slot order, starting from the first sprite in each room. Drawing and hit areas use each sprite's own dimensions. The placeholders show six books cycling through red, green and blue.

Bind room hotspots to content in `world.json`:

```json
"hotspots": { "window": { "content": { "type": "link" } } }
```

The id refers to a hotspot in that room's `room.json`. Filters follow slot rules,
but hotspots select the newest matching item by `date`, regardless of `part`.
The label includes the item's title. **Look at** gives the title and note in at
most two lines. **Open** opens `link`, or `url` when `link` is absent, in a new tab
directly from the click with `noopener,noreferrer`. The character then walks to
the hotspot and says "Let's see what's out there." Article books still use the
embedded reader. Unbound hotspots and filters without matches keep their original
behavior. Link items carry the external URL in `link` and their note in
`description`; content URLs resolve relative to `content.json` and require HTTP(S).
The placeholder and real-art demo worlds bind the window to two sample links.

Frame dimensions come from each room's `size`, shared by every room in a world. The placeholders use 640×360 room images and 128×234 character cells. Masks, paths, pointer coordinates, and render targets use the room dimensions.
Movement and effect distances scale with frame width relative to 480. The bitmap font stays at one buffer pixel per font pixel.

Room light adds each lamp's drawing minus the unlit drawing in linear colour, then clamps the result. Each lamp fades over 0.4 seconds. Oil and candle lamps flicker irregularly between 0.85 and 1.0 with slight pool drift; other lamps breathe slowly. There are no lighting bands. The final OKLab palette lookup stays. Set `"dither": true` in `world.json` for a subtle ordered palette dither; it defaults to false.

Rooms can supply `"water": "water.png"`, a room-sized mask with red water, yellow reflection, and black elsewhere. The sea swells in whole-pixel steps up to two pixels, clamped inside each water span. Sparse reflection sparkles reuse the brightest painted colours. The eight-second swell and four updates per second keep the motion calm; reduced motion disables both effects. Water moves identically in the unlit and lamp drawings before palette mapping and optional dithering. Rooms without the mask keep their existing rendering.

The demo includes a disposable window-water mask in `dev/data/rooms/stone-house/water.png`; `tools/make_placeholders.py` regenerates it. The real-art mask and its room reference are supplied by the art task.

At night the lantern adds warm light coloured by the room's `albedo`, with a smooth falloff over one third of the frame height. The character samples lamp brightness and colour at its feet, keeps a 70% brightness floor, and receives a rim from the strongest source. The lantern also lights the character near the carrying hand. Bloom follows lit lamps' painted areas and the lantern; `G` toggles it.

The renderer uses the largest whole pixel scale that fits, centred with black bars. On a viewport smaller than one frame, the canvas fits the available space while keeping its native render resolution.

- `src/`: WebGL2 renderer, OKLab palette lookup, mask loader, A\*, bitmap font, interaction, and reader frame.
- `dev/data/`: generated per-lamp drawings, albedo, masks, palette, sprites, world, 22 sample posts, and two sample links.
- `dev/reader/`: readable sample articles.
- `tools/make_placeholders.py`: regenerates demo data and `src/reader-frame.png` using Pillow and NumPy.
- `tests/`: logic, asset, shader, simulated interaction, and browser checks.

## Replace the character

Point `world.json`'s `character` at a new `character.json`, or replace the existing character files. The `sheet` path resolves relative to `character.json`. Keep sprite colours in the world's palette, with a transparent background.

Set `frame` to the cell width and height, `anchor` to the feet inside each cell, and `lantern` to the light offset from the feet at scale 1. The engine mirrors both the anchor and lantern when facing left. Supply the animation names from [CONTRACT.md](CONTRACT.md), with each animation's `row`, `frames`, and `fps`. Dimensions, offsets, and animation timing come from this file; no engine edits are needed.

To build a natural side walk for a new character from its standing side pose, see [docs/character-walk.md](docs/character-walk.md): it explains how the engine moves a character and how to run `tools/rig_walk.py`.

Optional `glow` points to a white-on-transparent sheet matching the character grid. Its pixels brighten and warm with the lantern, feed bloom, and dim when the lantern is off. The engine derives the flame position from the glow pixels in each animation frame. Without a glow sheet it uses the `lantern` offset. The placeholders include a glow sheet.

Rooms must supply `albedo` and, for each state, `unlit` plus `lights`, keyed by light item id. Every drawing must match the room size. Greyscale pools and shared `lit` drawings are no longer read. The `dev/real/` artwork also supplies per-lamp and albedo drawings.

Regenerate assets:

```sh
/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python tools/make_placeholders.py
```

Checks:

```sh
node tests/verb-menu.mjs # target verbs, edge placement, row hits
node tests/books.mjs # layout, routes, entry hits, font loading
node tests/logic.mjs
node tests/water.mjs # integer swell, mask bounds, glitter and reduced motion
node tests/lighting.mjs # linear brightness, independent lamps, flame and falloff
node tests/shaders.mjs # requires glslangValidator
node tests/rendering.mjs # sprite geometry and UI placement with a mock GPU
node --experimental-vm-modules tests/integration.mjs
/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python tests/assets.py
```

The object checks cover single paths, lists, cycling across slots and rooms, relative URLs, invalid lists, distinct book colours, and sprite-specific drawing and hit areas.

Hotspot checks cover newest-date selection independent of part, combined filters,
labels, short descriptions, direct-click tab opening, URL preference and fallback,
missing URLs, unmatched filters, and preservation of article readers. The browser
smoke check also checks a real popup, user activation, and its missing opener.

The integration check uses real data and PNGs with simulated DOM/GPU interfaces. Set `ART_PYTHON` to another Pillow-enabled Python if needed. It does not verify rendered output.

With the server running, browser verification is available through Playwright CLI:

```sh
playwright-cli -s=adventure open http://localhost:8000/dev/
playwright-cli -s=adventure run-code --filename=tests/browser-books.js
playwright-cli -s=adventure run-code --filename=tests/browser-smoke.js
playwright-cli -s=adventure run-code --filename=tests/browser-lighting.js
playwright-cli -s=adventure run-code --filename=tests/browser-640.js
playwright-cli -s=adventure close
```

The browser checks cover rendered linear light sums, independent lamp switches, fractional fades, albedo lighting, flame dimming and bloom sources, plus walking, lamp switching, readers, iframe Escape, hashes, integer scaling, overflow, and WebGL errors. It saves dusk/night screenshots at four widths under `.playwright-cli/`.

Book layout, NF-Pixels loading, binary text alpha, game-pixel positions, text-layer caching, menu headings, corner hover, drag turns, routes, lighting math, assets, interaction simulation, renderer checks, and shader compilation pass. The current sandbox denies server sockets, so browser rendering and visual checks remain unrun. Exits show a line instead of changing rooms, as specified. The verb font covers ASCII; NF-Pixels is bundled under SIL OFL 1.1; cross-origin readers need the close button when iframe focus owns Escape.
