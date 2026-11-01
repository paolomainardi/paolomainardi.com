# Adventure engine: data contract

The engine reads only these files. Paths inside a file are relative to that file.

## Frame

320×180 pixels. Every room image is exactly 320×180.

## palette.png and palette.json

`palette.png` is 32×1 pixels, one colour per pixel. `palette.json` is the same list
as `["#rrggbb", ...]`. Every pixel of every room and character image is one of
these colours, or fully transparent.

## content.json (written by the site)

```json
{ "items": [
  { "id": "slug", "type": "post", "title": "...", "description": "...",
    "date": "2026-11-02", "tags": ["linux"], "series": "workstation", "part": 2,
    "url": "/posts/slug/", "reader": "/posts/slug/reader.html",
    "cover": "/images/posts/19-x/cover.webp" }
] }
```

`type` is `post`, `link`, `about` or `talk`. Optional fields may be missing.

## world.json (written by hand)

```json
{
  "title": "paolomainardi.com",
  "palette": "palette.png",
  "start": "stone-house",
  "character": "character/character.json",
  "verbs": ["Look at", "Open", "Use", "Talk to"],
  "objects": { "book": "objects/book.png" },
  "rooms": {
    "stone-house": {
      "src": "rooms/stone-house/room.json",
      "content": { "series": "workstation" },
      "object": "book"
    }
  }
}
```

`content` is a filter on content items: every key must match (`tags` matches when
any tag is shared). Matching items fill the room's slots in order: `part`
ascending, then `date` descending.

## rooms/<name>/room.json (written by the asset builder)

```json
{
  "name": "stone-house",
  "size": [320, 180],
  "states": {
    "dusk":  { "lit": "dusk-lit.png",  "unlit": "dusk-unlit.png" },
    "night": { "lit": "night-lit.png", "unlit": "night-unlit.png" }
  },
  "objects": "objects.png",
  "items": [
    { "id": "floor", "kind": "walkable", "color": "#00ff00" },
    { "id": "chair", "kind": "foreground", "color": "#0000ff" },
    { "id": "shelf-1", "kind": "slot", "color": "#ff00ff" },
    { "id": "pendant", "kind": "light", "label": "Pendant lamp", "light": "pendant",
      "color": "#ffff00", "pool": "pools/pendant.png", "tint": "#ffd08a" },
    { "id": "door", "kind": "exit", "label": "Door", "to": "harbour", "color": "#ff8000" },
    { "id": "window", "kind": "hotspot", "label": "Window", "look": "The sea, calm tonight.",
      "color": "#00ffff" }
  ],
  "depth": { "far": [96, 0.7], "near": [176, 1.0] },
  "spawn": [60, 160]
}
```

- `states`: `lit` has every lamp on, `unlit` every lamp off, same drawing otherwise.
- `objects.png`: 320×180, each item painted in its flat `color` on black (#000000).
  A pixel belongs to at most one item.
- `slot`: a free place for one content object. The object stands on the bottom
  centre of the painted area.
- `light`: the painted area is the lamp itself (bulb, flame, glass). `light` is
  `pendant`, `wall`, `oil`, `desk` or `candle`; oil and candle flicker. `pool` is a
  320×180 greyscale image: how far that lamp's light reaches (white full, black none).
- `depth`: at screen y `far[0]` the character is drawn at scale `far[1]`, at y
  `near[0]` at scale `near[1]`, linear in between.
- `spawn`: where the character's feet start.

## character/character.json

```json
{
  "sheet": "sheet.png",
  "frame": [32, 48],
  "anchor": [16, 47],
  "lantern": [11, -13],
  "animations": {
    "idle-front": { "row": 0, "frames": 1, "fps": 1 },
    "walk-side":  { "row": 1, "frames": 6, "fps": 8 },
    "walk-front": { "row": 2, "frames": 4, "fps": 8 },
    "walk-back":  { "row": 3, "frames": 4, "fps": 8 },
    "talk-front": { "row": 4, "frames": 2, "fps": 4 }
  }
}
```

`lantern` is where the light the character carries sits, in pixels from the feet
at scale 1, for the side view facing right; the engine mirrors it for left.

`sheet.png` is a grid of `frame`-sized cells on a transparent background, one row per
animation. `anchor` is the feet point inside a cell. `walk-side` faces right; the
engine mirrors it for left. The figure is about 44 pixels tall at scale 1.
