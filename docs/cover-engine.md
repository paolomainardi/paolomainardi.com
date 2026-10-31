# Cover engine

The covers of some posts move: lamps breathe and swing, plants sway, rain falls,
lightning flashes, leaves fall from a tree. This is the reference for how that works
and how to extend it. The `generate-image` skill walks through making a cover;
DESIGN.md says what the motion may and may not do.

## How it works

Every pixel on screen comes from a drawing. Codex draws the scene in each state it
needs (lit, unlit, during a lightning flash), all lined up with the cover, and an
object sheet that says what is in the picture. A builder turns those into a motion
map; a WebGL shader in the browser bends the picture with the map and mixes the
drawings with soft masks. Nothing is painted by code: a lamp that goes out shows its
own unlit drawing.

The pieces:

| Piece           | Where                                                                 | What                                                                            |
| :-------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------ |
| Sources         | `covers/<name>/`                                                      | Lossless masters, object sheets, spec, prompts. Not served by Hugo              |
| Builder         | `scripts/cover-engine/build.py`, run by `just cover <name>` in Docker | Checks the drawings line up, reads the object sheet, writes the web files       |
| Web files       | `src/assets/images/posts/<post>/<name>*.webp`, `<name>-motion.json`   | The cover, its state drawings, the motion map and its data                      |
| Template        | `layouts/posts/single.html`                                           | Passes the player every file the cover uses                                     |
| Player          | `assets/js/motion.js`                                                 | The shader, the effects, the lamp switches                                      |
| Effect textures | `assets/images/motion/`                                               | Rain, raindrops and steam, shared by every cover; masters in `covers/_effects/` |

## The sources of a cover

`covers/<name>/` holds everything needed to rebuild or change the cover. The masters
are lossless WebP, because every new state is drawn by Codex from a master, and a
lossy copy loses detail on each round.

| File                             | Needed for                                          |
| :------------------------------- | :-------------------------------------------------- |
| `cover.webp`, `night.webp`       | Every cover                                         |
| `unlit.webp`, `unlit-night.webp` | Lights, and the light entry                         |
| `flash.webp`, `flash-night.webp` | A storm                                             |
| `objects.json`, `objects.png`    | Every animated cover: the object sheet              |
| `objects-<pass>.json`, `.png`    | Further sheets, such as the limbs of the figures    |
| `extras.png`                     | Optional: a white dot where a swinging lamp is hung |
| `spec.json`                      | The choices Codex cannot make, and where to publish |
| `prompts.md`                     | The brief and every prompt that made the drawings   |

Every state drawing is made from the cover or the night version with the cover
attached, and must line up with it within 2 pixels, or the builder fails.

## The object sheet

Codex looks at the cover and returns two files. `objects.json` gives the meaning of
each object; `objects.png` paints each one in its own flat colour on black, laid over
the cover pixel for pixel. The builder trusts the painting for every position and
shape, and the JSON for everything else: a box Codex writes as numbers can be off by
hundreds of pixels, a painted shape lands within a pixel or two. The prompt is in the
`generate-image` skill.

| Kind     | Fields                                                                            | Becomes                                                                                                                                    |
| :------- | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `light`  | `light`: spot, pendant, desk, screen, window, lighthouse; `of`: its lamp; `label` | A light that breathes or switches and a switch the reader can press; a lighthouse sweeps a beam; a window is daylight and only marks glass |
| `lamp`   |                                                                                   | A lamp body that swings on its cord, its light with it                                                                                     |
| `tool`   | `anchor`                                                                          | Something held or hung that swings about its anchor                                                                                        |
| `limb`   | `anchor`                                                                          | A figure's arm or head that makes small, slow moves about its joint                                                                        |
| `plant`  | `outdoor`                                                                         | Sways from its root; an indoor plant stays still                                                                                           |
| `leaf`   |                                                                                   | Falls from its place to the floor                                                                                                          |
| `water`  |                                                                                   | Swells and ripples                                                                                                                         |
| `float`  |                                                                                   | Bobs and rocks on the water                                                                                                                |
| `sky`    |                                                                                   | Where rain and lightning go, when the spec names it                                                                                        |
| `cloud`  |                                                                                   | Drifts                                                                                                                                     |
| `thread` |                                                                                   | A light runs along it                                                                                                                      |
| `steam`  |                                                                                   | Steam rises from it                                                                                                                        |

## The spec

`spec.json` holds the choices that are the brief's, not Codex's. All keys but
`publish` are optional; the docstring of `build.py` lists them. The main ones:

- `publish`: the published cover's path without extension.
- `entry`: the light comes in when the cover is first shown; `light_from` says from
  where, in degrees, 0 from the right and 90 from above (28, the upper right, by default).
- `lights`: `pattern` for the small lamps (`calls`, `wave`, `breathe`), `breathe` for
  the speed of the breathing (1 normal, 0.5 a slow breath every 11 seconds), `glow`.
- `storm`: `sky` is the list of sky objects where rain falls and lightning shows, or
  `"glass"` for the window panes; `rain` and `flash` tune them; `drops` runs drops
  down the glass named by `glass`.
- `still`, `amp`, `exclude`, `drift`, `pulse`, `floor`, `twinkle`.

## Effects

The player assembles its shader from the effects a cover uses, listed in
`<name>-motion.json`. An effect is an entry in the `EFFECTS` list of `motion.js`:

| Field      | What                                                                                                                                    |
| :--------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `name`     | Matches a name the builder writes in `effects`                                                                                          |
| `decl`     | Shader declarations: uniforms, samplers                                                                                                 |
| `displace` | Shader code that moves `src`, the point the pixel is read from, before the picture is read                                              |
| `color`    | Shader code that changes `col` after the picture is read                                                                                |
| `textures` | Drawings to load: the attribute that names the file, the texture unit, whether it has a night version, whether the first frame needs it |
| `setup`    | Sets the uniforms once                                                                                                                  |
| `frame`    | Updates the uniforms on every frame                                                                                                     |

The shader has `px` (the pixel, in cover pixels), `uv`, `t` (seconds), `night`,
`size`, the three bands of the map (`m`, `n`, `sky` and `glass`) and the helpers
`rot`, `swing(i)` and `follow(at, lamp)`. The effects run in the order of the list.

The effects today:

| Effect    | Moves or changes                                         | From                               |
| :-------- | :------------------------------------------------------- | :--------------------------------- |
| `water`   | Swells and chop                                          | `water` objects                    |
| `drift`   | Clouds slide one way and back over fifty seconds         | `cloud` objects                    |
| `float`   | Bob and rock                                             | `float` objects                    |
| `wind`    | Sideways sway under a gust                               | outdoor `plant` objects            |
| `turn`    | Lamps and tools swing; limbs make small irregular moves  | `lamp`, `tool`, `limb`             |
| `glass`   | Raindrops slide down the panes and bend the view         | `glass`, `drops`                   |
| `lights`  | The light entry; each light's level and warm glow; hover | `light` objects, `unlit.webp`      |
| `flash`   | A double flicker of the flash drawing, then a fade       | `storm`, `flash.webp`              |
| `rain`    | Streaks falling in the storm's sky                       | `storm`, the rain texture          |
| `twinkle` | Lit windows outside go dark and come back at night       | `twinkle` boxes                    |
| `beam`    | A lighthouse beam sweeps round                           | `light` objects of type lighthouse |
| `pulse`   | A light runs along threads                               | `thread` objects                   |
| `fall`    | Leaves fall and fade                                     | `leaf` objects                     |
| `steam`   | A drawn wisp rises, sways and breathes                   | `steam` objects, the steam texture |

### Adding an effect

1. The builder: read the objects or the spec it needs, write its data in
   `<name>-motion.json` or a channel of the map, and add its name to `effects` when
   the cover uses it. The third band of the map has a free blue channel.
2. The player: add an entry to `EFFECTS`. Keep it slow and small, as DESIGN.md asks.
3. A shared texture goes in `assets/images/motion/`, with its master and prompt in
   `covers/_effects/`, and a line in the template that passes its URL.
4. Document it here and in the skill.

## Lights and switches

Each light has a level from 0 (lit) to 1 (off), computed on every frame from its
pattern: `calls` (on for 3 to 9 seconds, off for 1 to 3, back with a double blink),
`wave`, `breathe`; a pendant or a desk lamp breathes slowly with a warm glow at its peak, and a
screen stays lit with a cool glow and only wavers. Where a light is off, the shader shows its unlit drawing in a soft pool around
it. After the light comes in, each lamp winks once to show it can be pressed.

Every light is a button over the cover: named from the object sheet's `label`, with
`aria-pressed`, a focus ring for the keyboard only, and nothing drawn over the
picture. Under the pointer the lamp brightens. A pendant switches off and on; a small
lamp leaves its pattern for the state the reader chose, and a second click hands it
back. A button is at least 44 pixels for a finger and 24 for a mouse; small lamps
closer to each other than that are not buttons at the size the cover is drawn, so a
tap never hits a neighbour, and in the zoom they usually are.

## Zoom

When the reader opens the zoom, `zoom.js` sends `zoom:open` to the cover, and the
player moves its canvas and switches over the enlarged picture, with the full-size
cover as its texture. The animation and the switches carry on; `zoom:close` brings
them back.

## Performance and fallbacks

- The shader holds only the effects a cover uses.
- Thirty frames a second at most; paused off screen and in a background tab.
- The canvas is drawn at the device's pixel ratio, at most 2, and never wider than
  the cover.
- Only the first frame's drawings load before it; the flash, rain and drops after.
- A cover whose light comes in waits hidden for its unlit drawing, 1.2 seconds at most.
- A pause button sits in the lower right corner of the cover, seen while the pointer
  is over it or it has focus, and faintly on touch screens. It stops the motion and
  starts it again.
- Reduced motion (at load or switched on later), no WebGL, a lost WebGL context, or a
  failing script leave the cover as a still image.
  `data-motion-state` on the image says why it is still.
