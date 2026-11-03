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
  "verbs": ["Look at", "Open", "Use", "Take", "Talk to"],
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

`verbs` defines one row in this order: `Look at`, `Open`, `Use`, `Take`, `Talk to`.
`Open` also reads. No selected verb means `Walk to`; selecting the same verb again deselects it.
The panel occupies the bottom 36 game pixels (rows 324 through 359 at 640×360).
The sentence sits above the verb row on the left and inventory on the right.
Hover and selected verbs use rose. Hit rectangles include their top and left edges and exclude their bottom and right edges.
Panel clicks never walk. Runtime pathfinding removes floor pixels under the panel, but permits floor up to its top.
Unsupported actions give a short response. The right-click menu contains supported verbs from this five-verb list.

**Take** on a topic book adds one inventory copy keyed by book id; the shelf
keeps its book. Duplicates say "I already have it." Inventory lives only in the
running game, survives room changes, and uses no browser storage. Each icon
uses its book sprite divided by the smallest integer that fits its slot; output
sizes and coordinates are whole pixels. Scroll arrows page through occupied
slots when the inventory is full. **Look at** describes inventory items;
**Open** opens its close-up. **Use** or a plain click selects an item;
the next target forms "Use <item> with <target>" and produces a short response.
Other verbs also produce a short response.

`objects` values accept a sprite path or a non-empty list of sprite paths relative to `world.json`, which content objects cycle through in occupied slot order, starting again in each room.

`content` is a filter on content items: every key must match (`tags` matches when
any tag is shared). Matching items fill the room's slots in order: `part`
ascending, then `date` descending.

A room's optional `hotspots` map binds a `room.json` hotspot id to a `content`
filter. Filters use the same rules as slots, but choose only the newest matching
item by `date`, ignoring `part`. A missing binding or no matching item leaves the
hotspot's original label and actions unchanged.

A hotspot binding can instead name a book: `"hotspots": { "noticeboard":
{ "book": "links" } }`. `book` takes priority over `content` and must name an
entry in `world.books`. **Open** or a plain click opens the
book after walking to the hotspot. Hotspot books also support book hash routes.

A bound hotspot's label becomes `<hotspot label>: <item title>`. **Look at** says the hotspot's own `look` line, falling back to the item's title and description, shortened to two lines.
If the item has a `reader`, **Open** or a plain click opens the embedded reader after walking to it.
This applies to `about` and `talk` items as well as posts. Reader hash routes also restore hotspot items.
Otherwise **Open** calls `window.open(url, "_blank", "noopener,noreferrer")` during the click, using `link` if present, otherwise `url`.
After walking, the character says "Let's see what's out there." Without either URL, it says there is nothing to open.
Looking at a hotspot or loading a room never opens a tab.

## rooms/<name>/room.json (written by the asset builder)

```json
{
  "name": "stone-house",
  "size": [640, 360],
  "albedo": "dusk-lit.png",
  "water": "water.png",
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
- `water` (optional): a room-sized RGB mask, relative to `room.json`. Red 255 marks water; green 255 marks its bright reflection and must lie inside red. Use red `#ff0000` for water, yellow `#ffff00` for reflection, and black elsewhere. This is a data mask, exempt from the drawing palette.
  Water rows shift horizontally by whole pixels within ±2 over an eight-second swell, with greater movement farther from the mask's horizon. Samples clamp to their connected red row span, including around holes and window bars. Sparse green pixels briefly show the brightest painted reflection RGB triplet from each drawing, more often near the reflection's horizon. Both effects update at most four times per second and stop when `prefers-reduced-motion: reduce` matches, including preference changes during play.
  Unlit and all lamp layers share the water displacement; lamp pool drift does not move water samples outside the mask. The effects run before lighting composition and the usual palette lookup and dithering. No water colour is synthesized. Omitting `water` preserves the existing room rendering.
- `objects.png`: 640×360, each item painted in its flat `color` on black (#000000).
  A pixel belongs to at most one item.
- `slot`: a free place for one content object. The object stands on the bottom
  centre of the painted area.
- `light`: the painted area is the lamp itself (bulb, flame, glass). `light` is
  `pendant`, `wall`, `oil`, `desk`, `candle` or `beacon`; oil and candle flicker.
  A beacon stays dark for four seconds, then rises smoothly to full strength and back over one second, repeating every five seconds.
  It still requires its own lamp drawing in each state. **Use** says "Too far away." without walking or switching it.
- `depth`: at screen y `far[0]` the character is drawn at scale `far[1]`, at y
  `near[0]` at scale `near[1]`, linear in between.
- `spawn`: where the character's feet start when no matching entrance exists.

Using or walking to an exit travels to the room named by its `to`. Travel fades
to black over 0.15 seconds, loads the room, then fades back over 0.15 seconds.
Input is paused during the transition. The destination exit whose `to` names the
previous room is the entrance. Arrival uses its nearest walkable point above
the panel and faces towards the room centre, using the corresponding idle
animation when supplied. Without a matching entrance, arrival uses the nearest
walkable point to `spawn`. An exit to an undefined room gives a short response.

A room with `"map": true` is an island map. It needs no `depth`, `spawn` or walkable mask pixels.
It uses the normal room images and exit mask, draws no character, shadow or carried lantern, and never walks.
Hovering an exit writes `Go to <label>`; clicking travels immediately with the usual fade.
Arrival from room `map` uses the destination exit whose `to` is `"map"`, otherwise its `spawn`.

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
  books default to posts; set `"type": "link"` for a links book. Items are ordered by `date`, newest first, except a `series` filter, which
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
by `faded` and a one-game-pixel rule. The verb panel and sentence line keep their
5×7 font.

Lower outer corners curl on hover and show a hand cursor when a turn is available.
Pressing an outer page half outside an entry captures the pointer. Turn frames
follow horizontal drag progress towards the spine. Release past halfway commits
the turn; release before halfway or pointer cancellation returns to the same
spread. A corner click and the arrow keys also turn pages. The first and last
spread disable unavailable turn directions.

Clicking a book entry with a `reader` opens the embedded reader. An entry without
`reader` opens its HTTP(S) `link` synchronously from the click, in a new tab with
`target="_blank"` and `rel="noopener"`. The sentence line shows "Opening the link…".
The book stays open on the same spread. An entry without either field gives a
short spoken response.

Spreads use zero-based indices in `#<room>/book/<id>/<spread>`. Page numbers start at 1. Invalid spread indices clamp to the book bounds. Closing the reader preserves the current book and spread. Rooms without `books` keep the single-post object behavior.

## Notice boards

A world board binds content to close-up art. A hotspot uses `board` instead of `book` or `content`:

```json
{
  "boards": {
    "links": {
      "title": "Notices",
      "content": { "type": "link" },
      "board": "board/board.json"
    }
  },
  "rooms": {
    "harbour": {
      "src": "rooms/harbour/room.json",
      "hotspots": { "noticeboard": { "board": "links" } }
    }
  }
}
```

**Open** or a plain click walks to the hotspot and opens the board. `board` takes priority over other bindings.
Items sort by date, newest first, regardless of `part`. Board links join the hidden accessible catalogue.

`board/board.json` follows this format. All paths resolve relative to this file. All colours come from `palette.json`:

```json
{
  "image": "board.png",
  "notices": [
    { "paper": "paper-1.png", "at": [60, 40], "text": [68, 52, 144, 88] }
  ],
  "pin": "pin.png",
  "older": [470, 306, 110, 16],
  "newer": [60, 306, 110, 16],
  "note": {
    "image": "note.png",
    "text": [115, 42, 410, 224],
    "go": [115, 287, 100, 18],
    "back": [445, 287, 60, 18]
  },
  "ink": "#1d202f",
  "faded": "#76645f",
  "accent": "#8a5650"
}
```

- `image` is the empty 640×360 board frame. `notices` supplies six to eight places in reading order. The example shows one place.
- Each place names a blank paper sprite, its top-left `at`, and an absolute `[x, y, width, height]` text rectangle.
  The engine draws the paper and a pin at its top centre, followed by the wrapped title and date. Titles truncate with an ellipsis to leave room for the date.
- Hover lifts the paper, pin and text by one game pixel and tints the paper and title with `accent`.
- `older` and `newer` are page control rectangles. Each page holds one board-full. A control hides when there is nothing on its side.
- Clicking a notice draws `note.image`, a 640×360 transparent overlay containing a large paper. Its `text` rectangle holds the title, date and the item's `description` as Paolo's note, wrapped to fit.
  `go` opens `link` in a new tab with `rel="noopener"`; `back` returns to the same board page.
- Text uses the book's NF-Pixels font and sizes. Supply `world.book` with the shared font definition.

The route is `#<room>/board/<id>/<page>` with zero-based pages clamped to board bounds.
The bottom bar's **Close**, right click and Escape return to the room. The bar reserves separate places for Close, one hint or temporary message, and sound.
A temporary message replaces the hint and expires while the close-up stays open. Book close-ups use the same bar.

## Sound in world.json

Sound starts only when a Start button creates or resumes an `AudioContext`.
Worlds without sound configuration remain silent. Browsers without Web Audio
keep the game playable.

```json
{
  "sounds": {
    "sea": { "synth": "surf", "volume": 0.5, "loop": true },
    "wind": { "synth": "wind", "volume": 0.3, "loop": true },
    "flame": { "synth": "crackle", "volume": 0.25, "loop": true },
    "step": { "synth": "step", "volume": 0.5 },
    "page": { "synth": "page", "volume": 0.6 },
    "click": { "synth": "click", "volume": 0.4 },
    "door": { "synth": "creak", "volume": 0.5 }
  },
  "events": {
    "step": "step",
    "page-turn": "page",
    "book-open": "page",
    "book-close": "page",
    "lamp": "click",
    "menu": "click",
    "door": "door"
  },
  "mix": { "master": 0.5, "ambience": 0.8, "effects": 1.0 },
  "rooms": {
    "stone-house": {
      "src": "rooms/stone-house/room.json",
      "ambience": {
        "dusk": [{ "sound": "sea", "at": "window" }],
        "night": [
          { "sound": "sea", "at": "window" },
          { "sound": "wind" },
          { "sound": "flame", "at": "oil-lamp", "light": "oil-lamp" }
        ]
      }
    }
  }
}
```

Each sound selects either `synth` or `src`. `src` resolves relative to
`world.json`; files load after Start and decode once per URL. Unknown sound
ids, unknown synths and failed files warn once in the console and are skipped.
`volume` defaults to 1 and `loop` defaults to false. Ambient definitions use
`loop: true`. Omitted event mappings are silent.

The seven synths use filtered noise: irregular shore swells (`surf`), drifting
low wind (`wind`), an oil-flame bed with random pops (`crackle`), a low wooden
footstep (`step`), swept paper (`page`), a brief switch (`click`), and a resonant
wooden creak (`creak`). Optional `params.frequency` sets the filter centre or
cutoff in Hz. `params.duration` sets a positive one-shot duration in seconds.
Noise, pitch, levels and ambient envelopes vary between plays.

Each `ambience` list belongs to a time of day in the world's room entry.
`at` names an item in that room. Gain decreases gently with distance from the
character's feet, never reaches zero, and pans towards the item's relative
horizontal position. Without `at`, gain stays constant and pan stays centred.
`light` names a room lamp and multiplies volume by its current fade level.
Use the fixture's actual ids: placeholders use `oil`; real art uses `oil-lamp`.
Time and room changes cross-fade old and new sources over one second.

Master, ambience and effects buses use `mix` gains, defaulting to 0.5, 0.8 and
1.0. `M` or the panel's `Sound: on` / `Sound: off` label toggles master mute.
Mute is held only in memory. The reader ducks both buses to 0.25
(about 12 dB down); closing it restores volume. Book close-ups keep full
ambience. Hiding the document suspends the context; showing it resumes the
context. Destroying the game stops sources and closes the context.

`step` fires at both half-cycle and whole-cycle foot contacts during movement,
using distance-based walk phase or the animation clock for animations without
`stride`. Step gain follows character depth. `page-turn` fires when a turn
commits, including a successful drag. Cancelled turns stay silent. Opening and
closing book close-ups fire `book-open` and `book-close`. Using a light fires
`lamp`; choosing a right-click menu verb fires `menu`. Using or walking to an
exit fires `door` on arrival. Exit travel loads the destination room after fading out.
