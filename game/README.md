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

Frame dimensions come from each room's `size`, shared by every room in a world. The placeholders use 480×270 room images and 72×128 character cells, with a figure about 120 pixels tall. Masks, paths, lighting, pointer coordinates, and render targets use the room dimensions. The font is 2× at 480×270; the verb strip occupies one fifteenth of the frame height. Lantern reach is one third of the frame height. At night its gently flickering warm pool reveals the lit drawing around the character, including the floor. Light steps use six levels with a 2 to 3 scene-pixel dither transition. The character keeps at least 70% of its source colours before palette mapping, receives the room and lantern tint, and has a warm rim facing the strongest light at its feet. Bloom combines a small bright core with a soft warm halo, follows lamp fades, and disappears with `G`. Lantern reach and bloom scale with frame height.

The renderer uses the largest whole pixel scale that fits, centred with black bars. On a viewport smaller than one frame, the canvas fits the available space while keeping its native render resolution.

- `src/`: WebGL2 renderer, OKLab palette lookup, mask loader, A\*, bitmap font, interaction, and reader frame.
- `dev/data/`: generated room drawings, masks, light pools, palette, sprites, world, and six sample posts.
- `dev/reader/`: readable sample articles.
- `tools/make_placeholders.py`: regenerates demo data and `src/reader-frame.png` using Pillow and NumPy.
- `tests/`: logic, asset, shader, simulated interaction, and browser checks.

## Replace the character

Point `world.json`'s `character` at a new `character.json`, or replace the existing character files. The `sheet` path resolves relative to `character.json`. Keep sprite colours in the world's palette, with a transparent background.

Set `frame` to the cell width and height, `anchor` to the feet inside each cell, and `lantern` to the light offset from the feet at scale 1. The engine mirrors both the anchor and lantern when facing left. Supply the animation names from [CONTRACT.md](CONTRACT.md), with each animation's `row`, `frames`, and `fps`. Dimensions, offsets, and animation timing come from this file; no engine edits are needed.

Preview the supplied real assets at <http://localhost:8000/dev/?data=real>.

Regenerate assets:

```sh
/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python tools/make_placeholders.py
```

Checks:

```sh
node tests/logic.mjs
node tests/shaders.mjs # requires glslangValidator
node tests/rendering.mjs # sprite geometry and UI placement with a mock GPU
node --experimental-vm-modules tests/integration.mjs
/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python tests/assets.py
```

The integration check uses real data and PNGs with simulated DOM/GPU interfaces. Set `ART_PYTHON` to another Pillow-enabled Python if needed. It does not verify rendered output.

With the server running, browser verification is available through Playwright CLI:

```sh
playwright-cli -s=adventure open http://localhost:8000/dev/
playwright-cli -s=adventure run-code --filename=tests/browser-smoke.js
playwright-cli -s=adventure close
```

The browser check covers walking, lamp switching, readers, iframe Escape, hashes, integer scaling, overflow, and WebGL errors. It saves dusk/night screenshots at four widths under `.playwright-cli/`.

The current sandbox blocks server sockets and browser startup, so the browser check and visual review remain unrun. Logic, assets, interaction simulation, renderer placement, lighting controls, character tint, and shader compilation pass. Both placeholder and real assets load in the integration check. Exits show a line instead of changing rooms, as specified. The embedded font covers ASCII; cross-origin readers need the close button when iframe focus owns Escape.
