# Adventure

A second way to visit the site: a point-and-click adventure in the spirit of the
early 90s LucasArts games. The visitor walks a character around an island, and the
island is the site. Posts, links, the about page and the talks are things to find,
look at and open.

This is a design document for a spike. Everything stays on a local branch until the
spike works.

## Decisions so far

- **A real way to navigate,** not an easter egg. It starts full screen from a button.
- **Desktop only** for now. No mobile version.
- **One fixed character,** a generic visitor. Paolo is a character the visitor meets.
- **Posts open inside the game,** in a reader that the browser renders with the
  site's own CSS. Readability matters more than anything else in the game.
- **Rooms by topic.** Posts are objects in the room of their topic or series.
- **Monkey Island's structure, our art.** The map, the verbs, the dialogues and the
  irony come from those games. The look comes from the site's covers.
- **Light first.** Lamps, street lights and the character's lantern are the heart of
  the look.
- **An engine driven by configuration,** separate from the site, so it can become an
  open source project later. No abstraction beyond that in the spike.

## The world

The covers already describe one world: a calm Mediterranean coast with a sea that
spills out of a laptop, three lighthouses, a rose shipping container, cypresses, a
small stone house, a print workshop with robots, an old telephone exchange and a
theatre stage. The island is that world.

| Place                  | Holds                                                    |
| :--------------------- | :------------------------------------------------------- |
| The harbour            | The start, the newest post, the way back to the site     |
| The tavern             | The links                                                |
| Paolo's house          | The about page, as a dialogue with Paolo                 |
| The stage              | The talks                                                |
| The stone house        | The workstation series, one room or shelf per part       |
| The lighthouse         | ai and agents, the agents series floor by floor          |
| The harbour warehouse  | docker, with the rose container                          |
| The fort               | security                                                 |
| The workshop           | linux and hardware                                       |
| The studio             | design, webgl and hugo                                   |

A map screen links the places, as on Mêlée Island. The theme is a harbour, not
pirates: sailors, a lighthouse keeper, a crate merchant. No LucasArts names, art or
music.

**The rose is the guide.** The rose accent of the covers marks what matters: a rose
thread leads to the newest post, and objects that can be used carry a touch of rose.

## Posts as objects

A room is drawn once, with free slots on shelves and tables. A post becomes a book,
a scroll, a crate or a bottle: a few objects drawn once, coloured by series or tag,
and placed in a free slot when the game starts. A new post needs no new art. When a
room runs out of slots, the build fails, and the room needs to grow.

- **Look at** shows the description.
- **Read** opens the post in the reader.
- A post with a cover also hangs its cover as a framed painting next to its object.

## The reader

Hugo writes a second page for every post, with the article alone: no header, no menu,
the site's fonts and CSS. The game opens it in an iframe over the scene, inside a
pixel art frame like an opened scroll.

- The text is the browser's, at full resolution, never pixelated.
- Selecting text, find in page and links work as on the site.
- The iframe scrolls on its own and keeps the game's styles apart from the article's.
- Esc closes it, and the character is where it was.
- Every place and every open post has its own address, such as
  `/play/#lighthouse/<slug>`, so a position can be shared.

## Light

The look is pixel art lit by modern lights: the palette and resolution of a 90s game,
with light that moves the way it does in a game of today.

**Every pixel still comes from a drawing.** As with the covers, Codex draws each room
in the states it needs: day, dusk, night, lamps lit and unlit. The shader mixes the
drawings with soft masks from the object sheet. Code never paints a lamp's glow on
its own.

**The frame is rendered small and lit in the palette.**

1. The scene, the sprites and the lights are drawn into a 320×200 buffer.
2. Light is added there, in linear colour.
3. Every pixel is mapped back onto the palette through a lookup table, with ordered
   dithering where the light fades. Light falls off in bands of palette colours, the
   way a 90s artist would have painted it, but it moves.
4. The buffer is scaled up to the screen by whole pixels.
5. A soft glow is added at screen resolution around bright lights. This is the one
   modern touch on top of the pixels.

**Lights:**

- **Room lamps.** Lamps and street lights come from the object sheet, as on the
  covers. Each one also paints its pool of light, so the light stays where the
  drawing says it reaches and does not cross walls. Lamps breathe, oil lamps flicker,
  and the visitor can switch them.
- **The lantern.** The character carries a lantern at night and in dark rooms. It is
  a moving point light, clipped by the room's walls, and it lights only what is near.
- **Day and night.** The island follows the visitor's clock. Street lights come on at
  dusk; dark rooms always need the lantern.
- **The character in the light.** The sprite takes the colour of the light at its
  feet, gets a thin rim on the side of the nearest lamp, and casts a soft shadow away
  from it.
- **Scene light.** The lighthouse beam sweeps the map and the harbour. Lamps reflect
  on the water. Light comes through windows in dithered shafts. Mist sits on the sea
  at night.

## Configuration

The engine reads three kinds of file and nothing else.

- **`content.json`**, written by Hugo at build time: what the site has, with no game
  logic. Each item has an `id`, a `type` (post, link, about, talk), a title, a
  description, a date, tags, series and part, its `url`, its `reader` page and its
  cover.
- **`world.json`**, written by hand for this site: the map, the rooms, the character,
  the palette, the verb labels, and which content goes in which room, as plain
  filters such as `{ "tags": ["ai", "agents"] }` or `{ "series": "workstation" }`.
- **`rooms/<name>.json`**, written by the asset builder from a room's object sheet:
  the walkable area, the slots, the exits, the foreground, the depth and the lights.
  The room's images sit next to it.

The engine starts with one call, `boot({ content, world, element })`, and knows
nothing about Hugo. Any other site generator can write the same files.

**Not in the spike:** plugins, schema versions, a general scripting language, themes,
translations, other site generators. A rule that only this site needs goes in
`world.json`, never in the engine.

## Code layout

- **`game/`** holds the engine, with no imports from the theme. Hugo bundles it with
  its built-in esbuild for now; moving the engine to its own repository later means
  moving the folder.
- **The game page** loads only that bundle. The rest of the site does not grow.
- **The light effects** shared with the covers (water, lamps, clouds) move into a
  module that both players load.

## Assets

The asset pipeline stays on the site side and grows from the cover engine.

1. **A style bible, made once:** the resolution, a palette of about 32 colours taken
   from the site (paper, ink, rose and the watercolour washes), the light direction
   and a reference picture. Every prompt attaches it.
2. **Rooms are specified from the content.** A script groups the posts into topics
   and writes each room's spec, including how many slots it needs.
3. **Codex draws each room** at full size, in the covers' style and with the covers'
   prompts, in every light state, and paints its object sheet.
4. **A script turns drawings into pixels:** it scales them down and maps them onto
   the palette, the same way every time. The builder fails when a drawing leaves the
   palette or does not line up with its room.
5. **The object sheet learns new kinds:** `walkable`, `slot`, `exit`, `foreground`,
   `depth`, and a pool for every light.
6. **Post objects** are drawn once and coloured by the script.
7. **The map** is drawn once, with a marker for each place.

Commands follow `just cover`: `just room <name>` and `just island`.

**The character is the open risk.** About 45 pixels tall, a walk cycle in three
directions (the side view is mirrored), idle and talk frames: about 20 frames.
The spike tries two ways and keeps the one that stays consistent:

- **Frame by frame.** Codex draws each frame with a turnaround sheet attached, and a
  script checks that height, feet position and colours stay the same.
- **Cut-out.** The body parts are drawn once and moved by code, like the limbs of the
  figures on the covers.

## The spike

One room, the stone house with the workstation series, with real content.

1. The style bible and the palette.
2. The stone house in two light states (dusk and night), pixelated, with its object
   sheet.
3. The character: both ways tried, one kept.
4. Walking inside the walkable area, with depth and foreground.
5. The light pipeline: the palette lookup, room lamps the visitor can switch, the
   lantern.
6. The workstation posts as objects on a shelf, from `content.json`.
7. Look at and Read, with the reader page in an iframe.

The spike is done when the visitor can walk into the stone house at night with a
lantern, switch on a lamp, pick a post from the shelf and read it comfortably.

## Open questions

- **Resolution:** 320×200 as in the originals, with bars on a 16:9 screen, or
  320×180 to fill it.
- **Verbs:** the full verb bar of the early games, or a short one (Look at, Open,
  Use, Talk to).
- **Sound:** none in the spike. Music and sound later, off by default.
