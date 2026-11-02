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
    "walk-side": { "row": 1, "start": 0, "frames": 6, "fps": 8, "stride": 96 },
    "walk-front": { "row": 2, "frames": 4, "fps": 8, "stride": 96 },
    "walk-back": { "row": 3, "frames": 4, "fps": 8, "stride": 96 },
    "idle-side": { "row": 1, "start": 0, "frames": 1, "fps": 1 },
    "idle-back": { "row": 3, "start": 0, "frames": 1, "fps": 1 },
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

`start` is the first frame column in the row, default 0. Both the character
and its optional glow sheet use this column offset.

`stride` is the positive distance in pixels that the feet travel in one walk
cycle at scale 1. A walk advances by `distance / (stride * depth scale)` cycles,
with frame `floor(cycles * frames) mod frames`. Running follows the same rule.
The engine accumulates cycles at the depth of each movement step and keeps the
phase across path segments, including changes of direction and stride.
Animations without `stride` use `fps` and elapsed animation time.

On stopping, side walks select `idle-side` with the same mirroring, back walks
select `idle-back`, and front walks select `idle-front`. Missing idle animations
fall back to unmirrored `idle-front`. Optional side and back idles may share a
walk row using `start`. Talking and turning to look at a target keep their
existing behaviour. Walk direction uses hysteresis around the diagonal to
avoid switching repeatedly between side and front or back.

## Book close-up

Shared by the art task and the engine task. Paths are relative to the file that
names them. Frame is 640×360; every colour comes from `palette.json`.

### Topic books in world.json

```json
{
  "book": "book/book.json",
  "books": {
    "linux": {
      "title": "Linux",
      "content": { "tags": ["linux"] },
      "sprite": "objects/book-1.png"
    },
    "ai": {
      "title": "AI and agents",
      "content": { "tags": ["ai", "agents"] },
      "sprite": "objects/book-2.png"
    }
  },
  "rooms": {
    "stone-house": {
      "src": "rooms/stone-house/room.json",
      "books": ["linux", "ai"]
    }
  }
}
```

- `books` is one book per topic. `content` is the same filter rooms use today;
  items are ordered by `date`, newest first, except a `series` filter, which
  keeps `part` ascending.
- A room's `books` fills its slots in order, one book per slot. A room can still
  use `content` and `object` as today instead.

### book/book.json

```json
{
  "image": "open.png",
  "pages": [[x, y, w, h], [x, y, w, h]],
  "turn": { "sheet": "turn.png", "rect": [x, y, w, h], "frames": 4, "fps": 12 },
  "ink": "#rrggbb", "faded": "#rrggbb", "accent": "#rrggbb",
  "font": {
    "regular": "fonts/NFPixels-Regular.ttf",
    "family": "NF-Pixels"
  },
  "sizes": { "title": 20, "body": 10, "label": 10 },
  "curl": { "image": "curl.png", "rects": [[x, y, 24, 24], [x, y, 24, 24]] }
}
```

- `image`: the whole 640×360 frame, an open book close up, both pages blank.
- `pages`: the text area of the left and the right page, inside the margins.
- `turn`: a strip of `frames` cells, each `rect` sized, transparent outside the
  turning page; drawn over `image` at `rect`, right-to-left for "next", mirrored
  order for "previous".
- `ink` for text, `faded` for dates and page numbers, `accent` (the rose) for
  the entry under the pointer.

- `font`: the unmodified, self-hosted NF-Pixels TTF, loaded with `FontFace`.
  Distribute `fonts/NFPixels-OFL.txt` (SIL Open Font License 1.1) alongside it.
  The font has one weight and a 10 px em, with 7 px capitals and 5 px lowercase.
- `sizes`: type sizes in game pixels: 20 for the title, 10 for body and labels.
  Body and label line height is 13 px; title line height is 26 px.
- `curl`: a two-cell transparent strip, left then right, with destination rectangles
  in game pixels. `tools/make_curls.py` folds pixels from `open.png`, darkens the
  back and maps it to the book palette. It detects the paper's outer corners.

Book and menu text use Canvas 2D font metrics for wrapping and pagination. Each
page fits as many complete entries as its bottom margin allows, with half a body
line between entries, rounded to 7 game pixels. Titles have at
most two lines with ellipsis; dates and page numbers use the label style.

A transparent 640×360 text layer uses whole game-pixel positions and baselines.
Its alpha is thresholded at 128 to 0 or 255. The texture is composited into the
game frame before palette mapping and nearest-neighbour upscale. Text redraws
only when the book, spread, hover, menu or game-frame size changes; screen
resizing does not change text metrics. The turning leaf masks covered text on
the GPU. The menu heading uses the same NF-Pixels font as its verbs, set apart
by `faded` and a one-game-pixel rule. The verb bar and sentence line keep their
5×7 font.

Lower outer corners curl on hover and show a hand cursor when a turn is available.
Pressing an outer page half outside an entry captures the pointer. Turn frames
follow horizontal drag progress towards the spine. Release past halfway commits
the turn; release before halfway or pointer cancellation returns to the same
spread. A corner click and the arrow keys also turn pages. The first and last
spread disable unavailable turn directions.

Spreads use zero-based indices in `#<room>/book/<id>/<spread>`. Page numbers start at 1. Invalid spread indices clamp to the book bounds. Closing the reader preserves the current book and spread. Rooms without `books` keep the single-post object behavior.
