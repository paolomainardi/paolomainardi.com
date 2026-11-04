# Adventure engine

A standalone point-and-click adventure built with JavaScript modules and WebGL2. The engine reads JSON and local artwork. It has no runtime package dependencies and does not depend on Hugo.

## Run locally

Serve this directory over HTTP:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/dev/> for placeholders or <http://localhost:8000/dev/?data=real> for the island artwork. **Start** requests fullscreen. **Start in window** keeps the frame inside the page. Both buttons load the world only after the click. WebGL2 is required; Web Audio is optional.

To embed the engine, give the container a width and height:

```js
import { boot } from "./src/main.js";

const game = await boot({
  world: "./dev/real/world.json",
  content: "./dev/data/content.json",
  element: document.querySelector("#game"),
});
```

`boot` mounts the title screen and returns a controller. `game.state` is `null` until loading finishes after Start. `game.ready` is `null` before Start, then a promise that resolves when the game starts or rejects on a load error. `game.destroy()` removes the game, its stylesheet and listeners, stops audio, and releases the WebGL context. URLs resolve against the document base URL. See [CONTRACT.md](CONTRACT.md) for the data format.

## Module map

| Module               | Responsibility                                                                    |
| -------------------- | --------------------------------------------------------------------------------- |
| `src/main.js`        | Title screen, Start activation, deferred session loading and controller lifetime. |
| `src/session.js`     | World setup, room state, input, actions, routing and frame scheduling.            |
| `src/assets.js`      | JSON and bitmap loading, content filtering, masks and lamp drawing pixels.        |
| `src/renderer.js`    | WebGL passes, sprite placement, UI, texture uploads and presentation.             |
| `src/palette.js`     | A 64³ nearest-colour lookup table built in OKLab.                                 |
| `src/lighting.js`    | CPU light sampling, flame variation, falloff and beacon timing.                   |
| `src/water.js`       | Connected water spans, integer swell and painted reflection sampling.             |
| `src/pathfinding.js` | Nearest floor point, eight-direction A* and path smoothing.                       |
| `src/animation.js`   | Frame selection from travelled distance or an animation clock.                    |
| `src/book.js`        | Font loading, pagination, entry hits, page drags and hash parsing.                |
| `src/board.js`       | Board artwork, notice paging, heading layout and note text.                       |
| `src/text-layer.js`  | Cached Canvas 2D text for close-ups and menus.                                    |
| `src/font.js`        | Embedded 5×7 UI glyphs and fixed-width wrapping.                                  |
| `src/panel.js`       | Verb, inventory and site-link geometry.                                           |
| `src/verb-menu.js`   | Target verbs, menu placement and exit arrows.                                     |
| `src/sound.js`       | Audio buses, generators, file decoding, ambience and effects.                     |
| `src/style.css`      | Container, title, reader dialog and hidden accessible content.                    |

`src/reader-frame.png` supplies the reader border. `dev/data/` holds generated fixtures; `dev/real/` holds the real artwork. Tools generate placeholders, walking frames, page curls, the site's world and a load-size report. Tests exercise logic and simulated rendering; browser scripts check actual GPU output.

## Frame and rendering

All rooms in a world should share a frame size. The supplied worlds use **640×360**; the panel occupies the bottom 36 rows. Coordinates, masks, character depth and hit tests use game pixels.

```text
Room drawings + water displacement
  -> linear lamp differences + lantern on albedo
  -> objects, shadow and character
  -> foreground coverage using mask baselines
  -> panel, speech or close-up footer
  -> cached book / board / menu text
  -> nearest palette colour + optional subtle dither
  -> integer upscale + screen-resolution bloom
```

A room supplies an unlit drawing and a separate drawing with each lamp lit, for both dusk and night. The shader adds each lamp's difference from the unlit drawing in linear colour. Lamps fade when switched. Oil lamps and candles flicker and drift slightly; other lamps breathe slowly. Beacons flash for one second after four dark seconds.

At night, the carried lantern adds a warm pool using the room's albedo. CPU samples of the same lamp drawings tint the character, with a brightness floor of 70%. The strongest sampled source sets the rim; the nearest lit room lamp sets the shadow direction. Foreground masks cover the character and flame only when the feet are behind their lowest painted row.

The final pass uses a 64³ OKLab lookup into the world's palette. Nearest sampling preserves whole pixels. The largest integer scale that fits is centred in the container; smaller displays shrink the CSS canvas to fit. Bloom comes from lamp masks and lantern emission, blurred at the output resolution and added after palette mapping. Consequently bloom may produce colours outside the drawing palette.

Books and boards replace the room view and use palette mapping without room lighting or bloom. NF-Pixels text is drawn at game resolution, with alpha thresholded to 0 or 255. The text texture changes only when its content or layout state changes. Lamp data uses an existing GPU texture, updated only when strength or drift changes. Water uploads at most four times per second and stops under reduced motion.

Hidden tabs skip simulation and rendering and suspend audio. Readers freeze movement and lamp animation. While a reader is open, the frame redraws only for footer changes, such as hover, mute or message expiry; the audio scheduler and feedback clock continue.

## Input and verbs

Click floor to walk; double-click floor or an object to run for that walk. Walking speed is `90 × (frame width / 480) × depth scale` pixels per second; running doubles it. Paths stay on painted floor, cannot cut diagonal corners, and stop before the panel. An unreachable target gives a short response.

The panel uses the order in `world.verbs`, normally **Look at**, **Open**, **Use**, **Take**, **Talk to**. Select a verb, then a target. Selecting the same verb again clears it. With no verb selected, the default is **Walk to**; books, boards and readable papers open after arrival. Unsupported actions give a short response.

Right-click a target for its supported actions in world order. Click an action or use Up/Down and Enter. Escape, an outside click or an empty-floor right-click closes the menu. The selected panel verb stays unchanged.

| Key        | Action                                     |
| ---------- | ------------------------------------------ |
| `T`        | Override local time and switch dusk/night. |
| `L`        | Toggle the carried lantern.                |
| `G`        | Toggle bloom.                              |
| `M`        | Toggle sound.                              |
| Escape     | Close the menu, book, board or reader.     |
| Left/Right | Turn an open book's spread.                |

Dusk runs from 06:00 through 19:59 in the visitor's local time; night covers the other hours. Room simulation follows the clock until `T` overrides it.

## Rooms and travel

Room artwork describes floor, slots, lamps, exits, foreground and hotspots in a flat-colour object mask. World bindings decide which books or content occupy slots and what hotspots open. Excess slot content is truncated; runtime loading does not reject overflow. Topic books paginate their entries.

An exit names its destination room. Travel fades out, loads the destination, then fades in. The character arrives at the nearest floor point to an exit pointing back, facing into the room; otherwise it uses `spawn`. A travel hotspot can walk through a named exit but choose a different destination. Maps draw no character and travel immediately when a place is clicked.

Use [Adding a room](docs/adding-a-room.md) for the drawing-to-world workflow. Use [Character walking](docs/character-walk.md) to build distance-based walks from standing poses.

## Books, boards and readers

A topic book uses a content filter. Series sort by part; other books sort by newest date and default to posts. Entries wrap to two title lines, followed by a date. Pages fill from font metrics and always form complete spreads. Hover highlights an entry; click opens its reader or link. Drag an outer page half towards the spine to turn; release past halfway commits. Corner clicks and arrow keys also turn. Close returns to the same room position.

A notice board sorts entries by date, newest first. Hover lifts a paper and pin by one pixel. Click a notice to read its title, date, link hostname and description. **Go there** opens its external `link`. **Take it** keeps a copy. **Back** returns to the same board page; older/newer controls page through notices. Taken notices show an inactive **In your pocket** action.

The reader is a same-origin iframe at normal browser resolution. It runs without scripts inside a sandbox. Close, Escape or leaving fullscreen returns focus to the game and preserves the underlying book spread. The reader's website link uses the item's `url`. All game-created links use HTTP(S) and `noopener noreferrer`.

Books, boards and content-bound hotspots can show a site path in the footer. Clicking it opens that section of the site. Hashes restore rooms, readers and close-ups after Start:

```text
#stone-house
#stone-house/post-id
#stone-house/book/workstation/1
#harbour/board/links/0
```

## Inventory and storage

**Take** copies a topic book while leaving it on the shelf. Board notices also stay on the board. Inventory arrows scroll full rows. **Look at** describes a carried item; **Open** opens its book or notice. A plain click selects a carried book for **Use**, while a carried notice opens directly. Item combinations currently give a response rather than changing the world.

Only inventory persists, under `localStorage` key `adventure.inventory`, as a list of `{ "kind": "book" | "notice", "id": "..." }`. Startup checks types, resolves current ids, removes duplicates and stale entries, and rewrites valid entries. Invalid JSON is ignored. Unavailable storage leaves a session-only inventory. **Forget** empties inventory and removes the key. Position, lamp state, time overrides and mute are not stored.

## Sound and accessibility

Start creates and resumes the audio context during the button gesture. World sound definitions select noise generators or audio files; files decode once per URL. Ambience follows room and time, cross-fades over one second, pans towards named objects and can follow a lamp's fade level. Effects cover foot contacts, page turns, books, switches, menus, doors and time/lantern changes. The reader lowers both audio buses to 25%; mute lasts only for the instance.

The title uses native buttons. A hidden navigation list exposes book and board links and site destinations, and a polite live region announces spoken responses. Data text uses DOM `textContent` or canvas text. The reader is a labelled dialog with a Close button, iframe Escape handling and focus return. Keyboard menus and page turns work, but movement and most canvas controls still require a pointer. The engine is not a fully keyboard-accessible game. Reduced motion disables water motion; it does not disable every animation.

NF-Pixels is bundled unmodified under SIL OFL 1.1 beside each font file.

## Checks and tools

Run from this directory with Node and a Python environment containing Pillow and NumPy. On this project, use the existing art virtual environment; do not install packages globally. `glslangValidator` is required for shader checks.

```sh
for test in logic lighting water sound panel verb-menu board books rendering shaders; do
  node "tests/$test.mjs" || break
done
ART_PYTHON=/path/to/art-venv/bin/python node --experimental-vm-modules tests/integration.mjs
/path/to/art-venv/bin/python tests/assets.py
```

The integration suite runs actual loaders and masks with simulated DOM, GPU and audio interfaces. PNG fixture decoding is cached, with fresh pixel buffers for each load. This checks interactions and lifecycle, not rendered appearance.

For real GPU checks, serve the directory and run:

```sh
playwright-cli -s=adventure open http://localhost:8000/dev/
playwright-cli -s=adventure run-code --filename=tests/browser-smoke.js
playwright-cli -s=adventure run-code --filename=tests/browser-books.js
playwright-cli -s=adventure run-code --filename=tests/browser-site.js
playwright-cli -s=adventure run-code --filename=tests/browser-lighting.js
playwright-cli -s=adventure run-code --filename=tests/browser-depth.js
playwright-cli -s=adventure run-code --filename=tests/browser-640.js
playwright-cli -s=adventure close
```

These scripts check interaction, same-origin site paths, reader return, lamp composition, foreground depth, scaling, overflow and WebGL errors. Inspect screenshots at narrow and wide widths in dusk and night. Browser execution may require a less restricted environment than the coding sandbox.

`tools/make_placeholders.py` rebuilds `dev/data/` and sample reader pages and writes the shared reader border. `tools/make_curls.py` rebuilds page curls for both demo books. `tools/rig_walk.py` writes walk rows from a rig. `tools/site_world.py` derives the site's world from the real demo. Regeneration overwrites the named outputs.

`node tools/measure-load.mjs` counts real loader calls and local payload bytes, using `dev/real/world.json` and the existing Hugo `../output/play/content.json`. It does not measure HTTP compression, headers, latency, JS, CSS or reader-page resources. Pass alternative world and content file paths as arguments, relative to the tool's directory or as absolute paths.

On 2026-11-04, the real study start and existing Hugo content snapshot used **35 loader requests and 2,528,561 payload bytes** (35 unique files). No world data was requested before Start. This is an offline loader measurement, not a browser network trace; script, CSS, HTML, HTTP overhead, later rooms, footsteps and reader resources are excluded.
