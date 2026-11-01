# Adventure engine

A standalone WebGL2 point-and-click prototype. No runtime dependencies or build step.

From this folder:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/dev/>. **Start** requests fullscreen; **Start in window** stays windowed. Click the floor to walk. Select a verb, then a lamp, book, window, or door. `T` switches dusk/night, `L` toggles the lantern, and `Esc` closes the reader.

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

- `src/`: WebGL2 renderer, OKLab palette lookup, mask loader, A\*, bitmap font, interaction, and reader frame.
- `dev/data/`: generated room drawings, masks, light pools, palette, sprites, world, and six sample posts.
- `dev/reader/`: readable sample articles.
- `tools/make_placeholders.py`: regenerates demo data and `src/reader-frame.png` using Pillow and NumPy.
- `tests/`: logic, asset, shader, simulated interaction, and browser checks.

Regenerate assets:

```sh
/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python tools/make_placeholders.py
```

Checks:

```sh
node tests/logic.mjs
node tests/shaders.mjs # requires glslangValidator
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

The current sandbox blocks server sockets and browser launches, so the browser check and visual review remain unrun. Logic, assets, interaction simulation, and shader compilation pass. Art is deliberately placeholder. Exits show a line instead of changing rooms, as specified. The embedded font covers ASCII; cross-origin readers need the close button when iframe focus owns Escape.
