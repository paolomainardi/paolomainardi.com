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
| `<actor>.webp`                   | Actors: a sprite sheet for each, drawn apart from the scene |
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
| `light`  | `light`: spot, pendant, desk, screen, window, lighthouse, led; `of`: its lamp; `label` | A light that breathes or switches and a switch the reader can press; a lighthouse sweeps a beam; a window is daylight and only marks glass; a led is a status light that blinks fast on its own and is not a switch |
| `lamp`   |                                                                                   | A lamp body that swings on its cord, its light with it                                                                                     |
| `tool`   | `anchor`                                                                          | Something held or hung that swings about its anchor                                                                                        |
| `limb`   | `anchor`                                                                          | A figure's arm or head that makes small, slow moves about its joint                                                                        |
| `plant`  | `outdoor`                                                                         | Sways from its root; an indoor plant stays still                                                                                           |
| `leaf`   |                                                                                   | Falls from its place to the floor                                                                                                          |
| `water`  |                                                                                   | Swells and ripples                                                                                                                         |
| `float`  |                                                                                   | Bobs and rocks on the water                                                                                                                |
| `sky`    |                                                                                   | Where rain and lightning go, when the spec names it; where the stars breathe and the shooting star passes                                 |
| `cloud`  |                                                                                   | Drifts                                                                                                                                     |
| `thread` |                                                                                   | A light runs along it                                                                                                                      |
| `steam`  |                                                                                   | Steam rises from it                                                                                                                        |
| `terminal` |                                                                                 | An old computer's screen, where green characters fall fast                                                                                 |

## The spec

`spec.json` holds the choices that are the brief's, not Codex's. All keys but
`publish` are optional; the docstring of `build.py` lists them. The main ones:

- `publish`: the published cover's path without extension.
- `entry`: the light comes in when the cover is first shown; `light_from` says from
  where, in degrees, 0 from the right and 90 from above (62, the upper right, by default).
- `lights`: `pattern` for the small lamps (`calls`, `wave`, `breathe`), `breathe` for
  the speed of the breathing (1 normal, 0.5 a slow breath every 11 seconds), `glow`.
- `storm`: `sky` is the list of sky objects where rain falls and lightning shows, or
  `"glass"` for the window panes; `rain` and `flash` tune them; `drops` runs drops
  down the glass named by `glass`.
- `stars`: `true`, or `{depth}` for how far a star dims (0.75 by default). The builder
  finds the stars itself: small pale spots well above the sky around them, inside the
  sky objects.
- `meteor`: `{every: [min, max]}` seconds between two shooting stars (20 to 40 by
  default), `length` in cover pixels. Needs a sky object.
- `terminal`: `{speed, columns}`, how fast the characters fall (0.35 by default) and how
  many columns cross a screen (6 by default).
- `ambience`: a soundscape, below.
- `actors`: the characters drawn apart from the scene, below.
- `still`, `amp`, `exclude`, `drift`, `pulse`, `floor`, `twinkle`.

## Actors

An actor is a character that is not painted in the scene and moves across it: a
witch flying past, a cat walking home. Codex draws it as a sprite sheet, a grid of
poses of the same character on a transparent background (or a flat colour the
builder keys out), and the spec says where it goes:

| Key      | What                                                                                            |
| :------- | :---------------------------------------------------------------------------------------------- |
| `id`     | Its name                                                                                        |
| `sheet`  | The sprite sheet in `covers/<name>/`                                                            |
| `grid`   | `[columns, rows]` of the sheet, `[1, 1]` for a single drawing                                   |
| `walk`   | `[first, last]` frame of the cycle played while it moves, counted left to right, top row first  |
| `fps`    | Frames a second of that cycle                                                                   |
| `end`    | The frame it keeps at the end of its path; without it, the actor fades out there                |
| `height` | Its height in cover pixels, from its feet to the top of its tallest frame                       |
| `path`   | Points in cover pixels the feet pass through; the curve through them is smooth                  |
| `speed`  | Cover pixels a second along the path                                                            |
| `delay`  | Seconds after the cover is shown before it sets off                                             |
| `bob`    | Pixels it rises and falls while it moves, for something flying                                  |
| `tilt`   | `true`: it leans with the slope of its path, by 17 degrees at most                              |
| `loop`   | `{rest, back}`: it goes again after `rest` seconds; with `back`, every other trip runs the path the other way, the sheet mirrored |
| `interact` | What the reader can do with it once it rests, below                                            |

The builder stands every frame on the same feet, the bottom of the drawing under the
middle of its upper body, so the cycle does not jump. It packs the frames of every
actor, the shooting star and the glyphs of the terminals in one atlas, `<name>-sprites.webp`, at twice the size
they are shown. An actor moves once each time the cover is shown; it faces the way
it goes, and the sheet is drawn facing right.

An actor that rests at the end of its path (it has an `end` frame) can answer the
reader. `interact` adds a button over it, shown once it is there, named by `label`
("Pet the cat"). Pressing it plays a few poses from a second sheet, then the actor
goes back to its resting pose, and a small sprite can rise over its head and fade,
such as a heart. A sound can play with it, only because the reader pressed it:

| Key      | What                                                                        |
| :------- | :-------------------------------------------------------------------------- |
| `sheet`  | The sheet of its poses, drawn like the actor's own                          |
| `grid`   | `[columns, rows]` of that sheet                                             |
| `frames` | The cells played in turn, a cell may repeat                                 |
| `fps`    | Frames a second                                                             |
| `rise`   | Optional: the cell that holds what rises, such as a heart or a note         |
| `label`  | The button's name for a screen reader, what the reader does                 |
| `sound`  | Optional: `purr`, a purr made in the browser, or the address of a sound file |

The builder scales the second sheet so its poses are as tall as the resting pose.

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
| `stars`   | Each star breathes at its own pace, now and then sparkles | `stars`, `sky` objects             |
| `meteor`  | A drawn shooting star crosses the sky, behind the rest   | `meteor`, `sky` objects, the atlas |
| `actors`  | Characters walk or fly along their path, frame by frame  | `actors`, the atlas                |
| `terminal` | Green characters fall down a screen, once its light is in | `terminal` objects, the glyph texture in the atlas |

### Adding an effect

1. The builder: read the objects or the spec it needs, write its data in
   `<name>-motion.json` or a channel of the map, and add its name to `effects` when
   the cover uses it. The third band of the map has no free channel left: its blue holds the phase of each star.
2. The player: add an entry to `EFFECTS`. Keep it slow and small, as DESIGN.md asks.
3. A shared texture goes in `assets/images/motion/`, with its master and prompt in
   `covers/_effects/`, and a line in the template that passes its URL.
4. Document it here and in the skill.

## Ambience

A cover can have a soundscape, made in the browser with the Web Audio API: nothing
is a recording, so no model makes sound. It stays off until the reader presses the
speaker, a dark disc in the lower left corner of the cover, always seen; the pause
button and a hidden page stop it. Its layers come from `ambience` in the spec:

| Key        | What                                                                 |
| :--------- | :------------------------------------------------------------------- |
| `music`    | `waltz`: a slow music-box waltz in D minor, eight bars, then a rest  |
| `wind`     | `true`: soft wind rising and falling                                 |
| `crickets` | `true`: two crickets, one on each side                               |
| `owl`      | `[min, max]` seconds between the calls of a distant owl              |
| `volume`   | 0 to 1, 0.6 by default                                               |
| `label`    | The speaker's name for a screen reader                               |

A sound of its own also plays when the reader interacts with an actor, with
`sound` in `interact`.

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
back. A button is at least 44 pixels for a finger and 24 for a mouse, and no two
buttons overlap, so a tap never hits a neighbour. Where a small lamp's target would
overlap another, the small lamps are not buttons at the size the cover is drawn; where
two big lights' targets would, the one with the smaller lamp is not. On a wider
screen, or in the zoom when it is wide enough, they are buttons again.

## The Halloween header

On 31 October the site header sits over a night scene built with the engine from
`covers/halloween/`: the cottage windows, the pumpkins and the lantern switch, and
the trees sway. `layouts/_partials/halloween.html` keeps it in a template that a
small script adds to the page only on that day, by the reader's own date, so no
other day downloads it. The status lights of a server rack blink,
green code falls down an old computer's screen, the stars breathe, a shooting star passes
now and then, a witch with her cats flies across the sky above the roof and back,
again and again, and a tuxedo cat walks home once and sits by the steps, where the
reader can pet it. The player runs on
every image with a motion map, so the header and a post's cover move together.

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
