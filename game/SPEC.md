# Task: adventure engine prototype

Build a browser engine for a point-and-click adventure in the style of early 90s
LucasArts games, with modern light. It must work against placeholder assets now;
real art arrives later in the same format. The data format is `CONTRACT.md`, in
this folder: read it first and follow it exactly.

Work only inside this `game/` folder. Do not run git commands.

## Tech

- Modern JavaScript ES modules, no dependencies, no build step needed to run.
  Entry `src/main.js` exports `boot({ world, content, element })`, where `world`
  and `content` are URLs to the JSON files and `element` is the container.
- WebGL2. No canvas 2D for the scene.
- The engine knows nothing about any site generator.

## Rendering

1. Render the scene into a 320×180 offscreen buffer, nearest filtering throughout.
2. **Room light, every pixel from a drawing.** For the current time state (dusk or
   night), the colour is `unlit + (lit - unlit) * L`, where
   `L = clamp(sum over lamps of pool_i * on_i * flicker_i)`. Oil and candle lamps
   flicker gently and irregularly; others breathe very slowly (a few percent).
3. **Lantern.** The character carries a lantern at night: a point light at the
   lantern's position that moves the pixel towards the `lit` drawing and adds a
   warm tint, falling off with distance (radius about 70 px at scale 1).
4. **Light in bands.** Quantize the total light factor into 4 bands with a 4×4
   Bayer ordered dither before mixing, so light falls off in dithered steps.
5. **Palette.** Map every final pixel to the nearest palette colour through a
   precomputed 3D lookup texture (32 steps per channel, nearest in a perceptual
   space such as OKLab).
6. **Character.** Draw the sprite into the buffer before the palette step, at its
   depth scale (nearest), tinted by the room light at its feet, with a thin rim on
   the side of the nearest lit lamp and a soft dithered shadow on the floor away
   from it. Foreground items are drawn over the character.
7. **Upscale** to the screen by the largest whole number that fits, centred with
   black bars.
8. **Glow.** At screen resolution, add a soft bloom around the lamp pixels of lamps
   that are on (and the lantern), blurred in a few passes. Subtle.

## Interaction

- A "Start" button enters full screen (Fullscreen API) and starts the game. It also
  works without full screen.
- Click the floor to walk: A* on the walkable mask at 320×180 (8 directions), path
  smoothed, constant speed, `walk-side` (mirrored for left), `walk-front`,
  `walk-back` by direction, `idle-front` when standing.
- Hovering an item shows its label in a sentence line at the top ("Walk to Door",
  "Look at Book: <title>"). A verb bar with the world's verbs sits at the bottom of
  the frame, drawn in a small embedded bitmap pixel font (write it yourself, 5×7
  or similar), visible always, semi-transparent.
- Verb then item: the character walks next to the item, then acts.
  - Look at: show the text above the character for a few seconds (hotspot `look`,
    content `description`).
  - Open on a content object: open the reader.
  - Use on a light: switch it on or off, with a short fade.
  - Exit: show "That way lies <to>." for now.
  - Anything else: a short dry line ("I can't do that.").
- Content objects: place the room's matching items in its slots per the contract,
  drawing the world's object sprite for the room. Each one is a hotspot labelled
  with the item's title.
- Time: dusk from 06:00 to 20:00 local time, night otherwise. Key `T` toggles for
  testing. Key `L` toggles the lantern.

## Reader

An iframe over the scene, about 70% of the width and 90% of the height, centred,
inside a pixel art frame (CSS `border-image` from a small placeholder PNG, scaled by
whole pixels). The iframe loads the item's `reader` URL at full resolution, never
pixelated. Esc or a close button closes it and returns focus to the game. While it
is open the game pauses input.

The address hash follows the state: `#<room>` and `#<room>/<item id>` when a
reader is open. Loading with a hash restores it.

## Placeholders and dev page

- `tools/make_placeholders.py` writes a placeholder room, character, palette and
  object sprite that follow the contract exactly, with simple shapes: a room with a
  floor, a back wall, a door on the left, a shelf with 6 slots on the right, a
  pendant lamp and an oil lamp, a chair in the foreground; lit and unlit versions
  that differ in warm light around the lamps. A character placeholder with
  recognisable directions and a moving walk cycle. Run it with
  `/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python`
  (Pillow and numpy are installed there).
- `dev/index.html` boots the engine with `dev/data/world.json` and
  `dev/data/content.json`: six sample posts of the series "workstation", each with
  a `reader` pointing at a sample article page in `dev/reader/` (plain readable
  HTML with a heading, paragraphs and a code block).
- Serve with `python3 -m http.server` from `game/` and open `/dev/`.

## Done when

Opening `/dev/` shows the start button; the character walks around the room with
correct depth and foreground; lamps can be switched; the lantern lights the
surroundings at night with dithered bands in the palette; the books on the shelf
show their titles; Open on a book reads the sample article; Esc returns. No errors
in the console.

Write `README.md` (short: how to run, file layout) and finish with a summary of
what works and anything left out.
