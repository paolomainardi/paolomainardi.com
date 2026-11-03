# Adventure engine

A standalone WebGL2 point-and-click prototype. No runtime dependencies or build step.

From this folder:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/dev/>. **Start** requests fullscreen; **Start in window** stays windowed. Click the floor to walk. Select a verb, then a lamp, book, window, or door. `T` switches dusk/night, `L` toggles the lantern, `G` toggles bloom for comparison, `M` toggles sound, and `Esc` closes the reader.

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

## Verb panel and inventory

The dark, translucent panel occupies the bottom 36 pixels of the 640×360 frame.
Its sentence line sits above five verbs on the left and inventory on the right:
**Look at**, **Open**, **Use**, **Take**, **Talk to**. **Open** also reads.
With no verb selected, clicks use **Walk to**. Click the selected verb again to deselect it.
Hover and selected verbs use rose. Panel clicks never walk, and floor can reach the panel's top.
Unsupported actions say "I can't do that."

**Take** copies a topic book into the session inventory while leaving its shelf
copy in place. Taking it again says "I already have it." Icons use each book's
sprite, reduced by an integer divisor into whole pixels. Arrows scroll full
inventories. **Look at** describes an item; **Open** opens its book.
Select **Use** or leave the verb unselected, click an inventory item, then a target to form
"Use <item> with <target>" and hear a short response. Other verbs give a short
response. Inventory survives room changes and clears when the game is restarted.
It uses no browser storage.

## Right-click verb menu

Right-click a hotspot, lamp, exit, content object, or topic book to open a
parchment menu beside the pointer. The menu stays inside the game frame and
shows the target's name and its supported verbs in world order. Hover a verb
to highlight it in rose and preview the sentence. The heading uses NF-Pixels in the faded colour with a one-game-pixel rule;
verbs use the same font and weight. Worlds without
book art retain the 5×7 menu font.

Click a verb, or use Up/Down and Enter, to walk over and run it. **Take** copies
a topic book into the inventory. A content object still opens its reader. The panel keeps its selected
verb. Escape, an outside click, an empty-floor right click, or a room change
closes the menu. The browser context menu is suppressed over the game.

## Topic books

Each room's `books` list fills its shelf slots in order. Each id names a book in
`world.json`'s `books` map, with a title, content filter, and its own sprite.
Series books sort by part; other topics sort by newest date. Books contain posts
unless their filter sets another content type, such as `"type": "link"`.
The window still opens the newest link.

Click a book with no verb selected, or choose **Open**, to walk over and open its close-up. **Look at**
says the title and entry count. The first page shows the title and count, followed
by post titles and dates. Titles wrap to two lines with an ellipsis. NF-Pixels uses 10 px body text with 13 px line height and 20 px titles.
Entries have half a line of spacing, rounded to 7 game pixels. Font metrics fill
pages to the bottom margin. Text uses the book's ink, faded and accent colours
on a 640×360 Canvas 2D layer, with alpha thresholded to 0 or 255 and whole
game-pixel positions. The layer composites into the game frame before upscale
and redraws only when the book, spread, hover, menu or game-frame size changes. The verb panel and sentence line keep the 5×7 font.

Hover an entry to highlight it, then click to read. The reader's **Open on the
website** link opens its URL in a new tab. Closing the reader returns to the same
spread. Hover a lower outer corner to curl it and show a hand cursor. Drag a
page's outer half towards the spine, away from entries, to control the turn.
Release past halfway to finish, or release earlier to fall back. Pointer
cancellation also falls back. A corner click or left/right arrows turn pages.
Escape, the **Close**
label, or a right click returns to the room at the same position.

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
The label includes the item's title. **Look at** gives the hotspot’s own `look` line, falling back to the title and note in at most two lines. For items without a reader, **Open** opens `link`, or `url` when `link` is absent, in a new tab
directly from the click with `noopener,noreferrer`. The character then walks to
the hotspot and says "Let's see what's out there." A bound item with a `reader`, including `about` and `talk`, opens the embedded reader with **Open** or a plain click. Unbound hotspots and filters without matches keep their original
behavior. Link items carry the external URL in `link` and their note in
`description`; content URLs resolve relative to `content.json` and require HTTP(S).
The placeholder and real-art demo worlds bind the window to two sample links.

A hotspot can instead open a whole book:

```json
"hotspots": { "noticeboard": { "book": "links" } }
```

The book id names `world.books`. **Open** or a click with no verb selected
walks to the hotspot and opens that book. The second placeholder room, the
harbour, has a notice board bound to a links book. Clicking an entry without a
`reader` opens its `link` in a new tab with `rel="noopener"` and shows
"Opening the link…" in the sentence line.

Using an exit or walking to it fades the scene to black, loads its destination,
and fades back. The character arrives at the destination exit whose `to` points
back to the previous room, at the nearest walkable point, facing into the room.
Without a matching exit, arrival uses the nearest walkable point to `spawn`.
The placeholder study and harbour have exits in both directions.

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

## Notice board, map and beacons

The placeholder harbour has a notice board. Open it or click with no verb selected.
Notices show titles and dates; hover lifts and accents a paper. Click to read Paolo's note, then choose **Go there** to open its link safely in a new tab.
**Back** returns to the same page. **Older notices** and **Newer notices** page through the links.
The route `#harbour/board/links/0` restores the board after Start. Board links also appear in the hidden accessible catalogue.

Close boards and books with the bottom bar's **Close**, right click or Escape.
Temporary messages replace the bar hint and expire without overlapping Close or sound.
The placeholders live in `dev/data/board/`; their data format is in [CONTRACT.md](CONTRACT.md#notice-boards).

Choose **Island map** in the study or harbour to visit the placeholder map.
Map rooms set `"map": true`, draw no character or carried lantern, and do not walk.
Hover a place to see **Go to <label>**, then click to travel with a fade.
Arrival uses the destination exit back to the map, falling back to `spawn` when none exists.

The harbour's lighthouse uses `light: "beacon"`: four seconds dark, then a smooth one-second flash, repeating every five seconds.
**Use** says "Too far away." Found **about** and **talk** papers in the study open in the reader; **Look at** keeps their own descriptions.

## Sound

Start enables low-volume Web Audio. Click the panel's `Sound: on` label or
press `M` to mute; the setting lasts only for this game instance. The reader
lowers all sound by about 12 dB. Book close-ups keep full ambience. Hidden tabs
suspend audio until visible again.

Both demo worlds configure sea at the window, plus wind and lamp crackle at
night. Nearby sources get louder and pan towards their room position. Switching
the oil lamp off fades its crackle. Room and time changes cross-fade ambience
over one second. Wooden footsteps follow both foot contacts while walking or
running. Pages, book close-ups, lamp switches, menu choices and exits have effects.

Define `sounds`, `events`, `mix` and each room's `ambience` in `world.json`.
Use built-in filtered-noise synths or a `src` audio file relative to the world.
Files decode once; missing files and unknown synths warn once and stay silent.
See [the sound contract](CONTRACT.md#sound-in-worldjson) for all fields,
generators and event bindings. Placeholder regeneration preserves this setup.

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
node tests/sound.mjs # mock AudioContext, mixing, spatial sound, fades, events and missing files
node tests/panel.mjs # panel grid, boundaries and inventory icon sizing
node tests/verb-menu.mjs # target verbs, edge placement, row hits
node tests/board.mjs # board layout, paging, note view, footer replacement and beacon timing
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

The automated suite covers sound, books, panel layout and boundaries, inventory,
hotspot books, safe link tabs, room arrival and fades, rendering, assets, lighting,
and shaders. Browser rendering remains unchecked: the current sandbox denies
local server sockets. The verb font covers ASCII; NF-Pixels is bundled under
SIL OFL 1.1. Cross-origin readers need the close button when iframe focus owns
Escape.
