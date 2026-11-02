# Adventure engine: data contract

The engine reads only these files. Paths inside a file are relative to that file.

## Frame

Frame dimensions come from `room.json`'s `size`: 640×360 for this site.
Every room image must match that size.

## palette.png and palette.json

`palette.png` is N×1 pixels, one colour per pixel, with N up to 256 (VGA style).
`palette.json` is the same list as `["#rrggbb", ...]`. Every pixel of every room and character image is one of
these colours, or fully transparent.

## content.json (written by the site)

```json
{
  "items": [
    {
      "id": "slug",
      "type": "post",
      "title": "...",
      "description": "...",
      "date": "2026-11-02",
      "tags": ["linux"],
      "series": "workstation",
      "part": 2,
      "url": "/posts/slug/",
      "reader": "/posts/slug/reader.html",
      "cover": "/images/posts/19-x/cover.webp"
    }
  ]
}
```

`type` is `post`, `link`, `about` or `talk`. Optional fields may be missing.
Items of type `link` carry `link`, the external URL of the linked page, plus
`title`, `date`, `tags`, and the note as `description`. `url` may point to the
site's own link entry. `link`, `url`, and `reader` resolve relative to `content.json`
and must use HTTP(S).

```json
{
  "id": "linux-kernel",
  "type": "link",
  "title": "The Linux kernel",
  "description": "Follow kernel releases and development.",
  "date": "2026-10-25",
  "tags": ["linux"],
  "link": "https://www.kernel.org/",
  "url": "/links/linux-kernel/"
}
```

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
      "object": "book",
      "hotspots": { "window": { "content": { "type": "link" } } }
    }
  }
}
```

`objects` values accept a sprite path or a non-empty list of sprite paths relative to `world.json`, which content objects cycle through in occupied slot order, starting again in each room.

`content` is a filter on content items: every key must match (`tags` matches when
any tag is shared). Matching items fill the room's slots in order: `part`
ascending, then `date` descending.

A room's optional `hotspots` map binds a `room.json` hotspot id to a `content`
filter. Filters use the same rules as slots, but choose only the newest matching
item by `date`, ignoring `part`. A missing binding or no matching item leaves the
hotspot's original label and actions unchanged.

A bound hotspot's label becomes `<hotspot label>: <item title>`. **Look at** says
the item's title and description, shortened to at most two lines with `...` when
truncated. **Open** calls `window.open(url, "_blank", "noopener,noreferrer")`
directly during the click, using `link` if present, otherwise `url`. The tab opens
before the character walks, so the browser retains user activation. After walking
to the hotspot, the character says "Let's see what's out there." Opening a hotspot
does not open the article reader or change its hash. Without either URL, the
character walks over and says there is nothing to open. Loading a room or looking
at a hotspot never opens a tab.

## rooms/<name>/room.json (written by the asset builder)

```json
{
  "name": "stone-house",
  "size": [640, 360],
  "albedo": "dusk-lit.png",
  "states": {
    "dusk": {
      "unlit": "dusk-unlit.png",
      "lights": {
        "pendant": "dusk-pendant.png",
        "oil-lamp": "dusk-oil-lamp.png"
      }
    },
    "night": {
      "unlit": "night-unlit.png",
      "lights": {
        "pendant": "night-pendant.png",
        "oil-lamp": "night-oil-lamp.png"
      }
    }
  },
  "objects": "objects.png",
  "items": [
    { "id": "floor", "kind": "walkable", "color": "#00ff00" },
    { "id": "chair", "kind": "foreground", "color": "#0000ff" },
    { "id": "shelf-1", "kind": "slot", "color": "#ff00ff" },
    {
      "id": "pendant",
      "kind": "light",
      "label": "Pendant lamp",
      "light": "pendant",
      "color": "#ffff00",
      "tint": "#ffd08a"
    },
    {
      "id": "door",
      "kind": "exit",
      "label": "Door",
      "to": "harbour",
      "color": "#ff8000"
    },
    {
      "id": "window",
      "kind": "hotspot",
      "label": "Window",
      "look": "The sea, calm tonight.",
      "color": "#00ffff"
    }
  ],
  "depth": { "far": [279, 0.88], "near": [359, 1.0] },
  "spawn": [84, 292]
}
```

- `states`: `unlit` has every lamp off. `lights` gives, for each light item, the
  same drawing with only that lamp on. The engine adds each lamp's light as the
  difference between its drawing and `unlit`, so every lamp lights exactly what its
  drawing shows.
- `albedo`: the room in plain, even light, used to colour light that has no drawing
  of its own, such as the lantern the character carries.
- `objects.png`: 640×360, each item painted in its flat `color` on black (#000000).
  A pixel belongs to at most one item.
- `slot`: a free place for one content object. The object stands on the bottom
  centre of the painted area.
- `light`: the painted area is the lamp itself (bulb, flame, glass). `light` is
  `pendant`, `wall`, `oil`, `desk` or `candle`; oil and candle flicker.
- `depth`: at screen y `far[0]` the character is drawn at scale `far[1]`, at y
  `near[0]` at scale `near[1]`, linear in between.
- `spawn`: where the character's feet start.

## character/character.json

```json
{
  "sheet": "sheet.png",
  "frame": [128, 234],
  "anchor": [64, 233],
  "lantern": [27, -83],
  "animations": {
    "idle-front": { "row": 0, "frames": 1, "fps": 1 },
    "walk-side": { "row": 1, "frames": 6, "fps": 8 },
    "walk-front": { "row": 2, "frames": 4, "fps": 8 },
    "walk-back": { "row": 3, "frames": 4, "fps": 8 },
    "talk-front": { "row": 4, "frames": 2, "fps": 4 }
  }
}
```

`lantern` is where the light the character carries sits, in pixels from the feet
at scale 1, for the side view facing right; the engine mirrors it for left.

`glow` (optional) is a sheet on the same grid, white where the lantern's flame and
bright glass are; the engine makes those pixels glow and flicker when the lantern is on.

`sheet.png` is a grid of `frame`-sized cells on a transparent background, one row per
animation. `anchor` is the feet point inside a cell. `walk-side` faces right; the
engine mirrors it for left. The figure is about 230 pixels tall at scale 1, the height of a person at the front of the room.
