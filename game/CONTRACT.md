# Adventure data contract

The engine loads `world.json`, `content.json`, room drawings, character sheets, close-up artwork and optional sound files. `rig.json` and `palette.json` are build inputs, not runtime requests. This document describes fields consumed by the engine and its asset tools.

Paths inside JSON resolve against the file that names them. Runtime asset and link URLs must use HTTP or HTTPS.

Reader URLs must also share the page's origin. `site` paths resolve against the page origin, independently of asset URLs. Drawings use the palette; data masks do not.

## Coordinates and palette

Coordinates start at the top left; x increases right and y increases down. Points are `[x, y]`.

Layout rectangles are `[x, y, width, height]`; crop boxes in rigs are `[x0, y0, x1, y1]`, with the last edges excluded. Hit rectangles include top/left and exclude bottom/right, except room-mask bounds, whose last painted pixel is inclusive.

Room dimensions come from `room.size`, two positive integers. Use a common **640×360** frame for the supplied panel and close-up artwork. Low-level rendering accepts other dimensions, but the five-verb inventory panel has fixed horizontal positions and the book drawing is required to be 640×360.

| File                 | Format and use                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `palette.png`        | An opaque N×1 strip, with 1 to 256 RGB colours. Runtime palette source.                    |
| `palette.json`       | The same ordered colours as `["#rrggbb", ...]`. Used by drawing tools and checks.          |
| Room and sprite PNGs | Every visible drawing pixel belongs to the palette; sprite backgrounds may be transparent. |

The palette lookup quantizes RGB to 64 levels per channel and chooses the nearest swatch in OKLab. Ties use palette order. Bloom is added after palette mapping and is not restricted to palette colours.

## content.json

The top-level object has one field, `items`, an array of content records. Stable, unique ids are required for hashes and saved notices.

| Field         | Type                  | Meaning                                                                     |
| ------------- | --------------------- | --------------------------------------------------------------------------- |
| `id`          | string                | Content identity, used in routes and inventory.                             |
| `type`        | string                | Category used by filters, conventionally `post`, `link`, `about` or `talk`. |
| `title`       | string                | Display title.                                                              |
| `description` | optional string       | Spoken description or full notice text.                                     |
| `date`        | optional string       | Display date and descending lexical sort key; use `YYYY-MM-DD`.             |
| `tags`        | optional string array | Tags matched by filters; omitted means no tags.                             |
| `series`      | optional string       | Series identity for exact matching.                                         |
| `part`        | optional number       | Ascending series order; omitted sorts after numbered parts.                 |
| `link`        | optional URL string   | External destination, preferred to `url` when opening a hotspot or notice.  |
| `url`         | optional URL string   | Canonical website page; used by the reader's website link.                  |
| `reader`      | optional URL string   | Same-origin script-free reader page.                                        |
| `cover`       | optional string       | Site metadata; the engine does not load or render it.                       |

```json
{
  "items": [
    {
      "id": "linux-desk",
      "type": "post",
      "title": "Linux on the desk",
      "description": "Choosing a development workstation.",
      "date": "2026-10-03",
      "tags": ["linux"],
      "series": "workstation",
      "part": 3,
      "url": "/posts/linux-desk/",
      "reader": "/posts/linux-desk/reader.html"
    }
  ]
}
```

A filter is an object whose fields must all match.

Non-tag fields use exact equality. `tags` accepts a string or array and matches any shared tag. An omitted filter matches everything.

Matching items sort by `part` ascending, then `date` descending. Content hotspots and boards re-sort by newest date.

Books default to `type: "post"`; a `series` book keeps part order, while other books use newest date.

A reader takes priority over external links. Without a reader, book entries and notices open `link`; a hotspot opens `link` or otherwise `url`. An entry with no usable destination gives a response.

The reader's website link is hidden without `url`. Catalogue entries link to `link` or `url` in a new tab; entries with neither are plain text. Text is rendered as text, never interpreted as HTML.

## world.json

| Field       | Type            | Meaning                                                               |
| ----------- | --------------- | --------------------------------------------------------------------- |
| `title`     | string          | World title, applied when the world loads after Start.                |
| `palette`   | asset path      | Palette strip.                                                        |
| `start`     | string          | Initial room id when no valid hash selects another room.              |
| `character` | asset path      | Character JSON. Loaded even when the initial room is a map.           |
| `verbs`     | string array    | Panel and context-menu ordering. Use the five supported labels below. |
| `rooms`     | object          | Room ids mapped to room bindings.                                     |
| `book`      | asset path      | Required shared book drawing and fonts, also used by menus.           |
| `books`     | optional object | Topic book ids mapped to book bindings.                               |
| `boards`    | optional object | Board ids mapped to board bindings.                                   |
| `pocket`    | optional array  | Permanent inventory items, in display order.                          |
| `voices`    | optional object | Voice ids mapped to subtitle text and optional audio paths.           |
| `sounds`    | optional object | Sound ids mapped to sound definitions.                                |
| `events`    | optional object | Game event names mapped to sound ids.                                 |
| `mix`       | optional object | Audio bus gains.                                                      |

```json
{
  "title": "The engineer's study",
  "palette": "palette.png",
  "start": "study",
  "character": "character/character.json",
  "verbs": ["Look at", "Open", "Use", "Take", "Talk to"],
  "book": "book/book.json",
  "books": {
    "linux": {
      "title": "Linux",
      "content": { "tags": ["linux"] },
      "sprite": "objects/book.png",
      "site": "/tags/linux/"
    }
  },
  "rooms": {
    "study": { "src": "rooms/study/room.json", "books": ["linux"] }
  }
}
```

### Permanent pocket items

`pocket` is optional and defaults to an empty list. Each entry requires a unique `id`, display `label`, transparent `icon` path, destination room id `to`, and voice id `look`. Icons resolve against `world.json`, fit within 24×14 pixels, and render in inventory slots.

```json
"pocket": [
  { "id": "map", "label": "Island map", "icon": "items/map.png", "to": "map", "look": "pocket-map" }
]
```

Pocket items precede collected books and notices. They cannot be dropped, never enter storage, and survive Forget. Forget appears only when non-pocket items are present.

Open, Use and a plain click (including Walk to) travel immediately with the exit fade. At the destination, the reply uses `common-already-map`, falling back to "I'm already looking at it." Look at uses the entry's `look` voice, Take uses `common-have-it`, and Talk to uses `common-cant`.

Book, board and reader footers also show pocket icons. Clicking a footer icon closes the close-up and travels, regardless of the selected room verb. Hovering an inventory icon uses the normal action sentence.

### Room bindings

| Field      | Type              | Meaning                                                                                 |
| ---------- | ----------------- | --------------------------------------------------------------------------------------- |
| `src`      | asset path        | Room JSON, relative to the world.                                                       |
| `books`    | optional id array | Fill slots in painted item order with topic books. An empty or omitted list fills none. |
| `hotspots` | optional object   | Room hotspot ids mapped to bindings below.                                              |
| `ambience` | optional object   | `dusk` and `night` arrays of ambient sound entries.                                     |

`enter` names a voice said once per room per session, after the room fades in. `looks` maps room item ids or topic book ids to voice ids. A hotspot binding can name its voice with `look`, including alongside `go`, `board` or `content`, or by itself. Look bindings take priority over drawing descriptions and content metadata. Carried books retain their look binding.

Slot books stop when either books or slots run out. Each sprite uses its own dimensions, bottom-centred on the slot. There is no automatic room expansion or overflow build check.

A hotspot binding chooses the first applicable form in this order:

| Fields                     | Effect                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `go`, `via`                | `go` names a destination room; `via` names an exit in the current room. Open or default walk reaches that exit, then travels to `go`. |
| `board`                    | Open the named world board after arrival.                                                                                             |
| `content`, optional `site` | Bind the newest matching item, append its title to the hotspot label, and open its reader or destination.                             |

An unmatched content filter keeps the original hotspot label and description. Take still responds that it belongs to the keeper. Without a voice binding, Look prefers the drawing's `look`, then the content title and description.

External hotspot links open during the original click to retain browser activation; arrival supplies feedback. The second click of a double-click does not open another tab.

### Room actors

A room binding may include an `actors` list. Actors are loaded when entering that room and reset on re-entry. They never enter inventory or storage. Map rooms cannot have actors.

```json
"actors": [
  {
    "id": "cat",
    "label": "Cat",
    "sheet": "cat/cat.json",
    "path": [[330, 288], [440, 292], [540, 286]],
    "speed": 28,
    "sit": [4, 9],
    "look": "harbour-cat",
    "pet": "harbour-cat-pet",
    "take": "harbour-cat-take",
    "sound": "purr"
  }
]
```

All fields above are required; `chatter` and `chatterWords` are optional and name the sounds played under the meows and under the translated words (`chatterWords` falls back to `chatter`); the closing line plays `meow`. `chatter` is the longer sound played while the actor talks (4 s step, falling back to `meow` and 1.6 s); `meow` is optional and names a sound definition played when the actor is petted and every 15 to 40 seconds while it wanders, panned to its position. `id` must be nonempty and unique among room items and actors. `label` is the hover and menu name. `sheet` resolves from `world.json`; its image resolves from the sheet JSON. `look`, `pet` and `take` name existing voices; `sound` names an existing sound definition played on the effects bus.

`path` contains at least two finite points on connected walkable floor above the panel. Actors follow floor paths between successive waypoints and reverse at the ends. `speed` is a positive number of game pixels per second at depth scale 1. `sit` gives positive minimum and maximum rest seconds, with maximum at least minimum. Each arrival chooses a random rest. An idle gesture plays occasionally during that rest.

The sheet uses `frame`, `anchor` and `animations` as described under `character.json`. Required animations are `walk-side`, `sit`, `idle` and `pet`. Cells must fit inside the image, rates and frame counts must be positive, and `walk-side` requires positive `stride`. Side art faces right. Distance and depth advance the walk cycle; other animations use elapsed time.

Actors share visitor scaling, lamp tint, lantern light at night, shadows and foreground baselines. Characters sort by feet position. Each character applies its own foreground mask.

Look at and Take say their configured voices. Use and the default click hold the actor seated while the visitor approaches, then play `pet` for three seconds with rising pixel hearts, the configured sound and the `pet` voice. The actor resumes its route afterward. Open gives `common-cant`. The right-click menu offers Look at, Use, Take and Talk to in world verb order.

Optional `name` is a nonempty display name; set `label` to the same value for hover and menus. Optional `speech` is a six-digit `#rrggbb` subtitle colour, falling back to `world.speech`. Optional `talk` is a nonempty list of exchanges:

```json
{
  "meow": "Meow. Mrrp… meow meow.",
  "words": "About time. They all went up to the lighthouse… and nobody fed me.",
  "reply": "rosa-reply-1",
  "end": "Meow."
}
```

Each exchange requires nonempty `meow`, `words` and `end` strings and a `reply` naming an existing voice. Talk to approaches the actor, holds it seated facing the visitor and plays the next exchange, looping in list order. The actor's `meow` sound plays once with the first subtitle. Its `meow` text lasts 1.6 seconds, then `words` lasts `max(3.5, text.length × 0.055)` seconds. The visitor says `reply` using normal voice timing, then the actor says `end` for 1.2 seconds and resumes its route. Actor subtitles share visitor font, outline, wrapping and frame clamping, positioned above the actor's own head in its speech colour. Replies appear above the visitor in the world's speech colour.

During an exchange a click skips one step. Clicking walkable floor walks away and cancels; right click or Escape cancels without another action. Other speech, room changes and close-ups cancel the exchange. Reduced motion preserves the text and timing with the actor seated. Actors without `talk` keep petting on Talk to. Exchange order resets on room re-entry.

Books, boards, readers and hidden tabs pause actors. Reduced motion keeps them seated, including during petting, with static hearts. Actor state is never saved.

### Books, boards and site paths

| Binding       | Fields                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| `books.<id>`  | Required `title`, `sprite`; optional `content` filter and `site` path.                    |
| `boards.<id>` | Required `board` path and `content` filter; optional `title`, `subtitle` and `site` path. |

`site` must begin with one slash, must resolve to the page origin and may include a fragment. Books and boards display it in their close-up footer. A content hotspot supplies its path to the reader.

Paths are also present in the accessible catalogue. Long labels truncate to leave room for Close, the message and sound.

### Verbs, routes and storage

Use `Look at`, `Open`, `Use`, `Take`, `Talk to`. Labels are action identifiers, not translatable display strings. Unsupported actions respond without changing the world.

No selected verb means `Walk to`. The context menu filters this list for each target; `Talk to` starts an actor exchange when `talk` is configured, otherwise pets it.

**Take** copies a topic book. Board hotspots prompt the visitor to open the board and pick a notice. Content-bound hotspots give the keeper response, including when their filter matches nothing.

These actions depend on bindings, not hotspot ids.

| Hash                         | Restored state                              |
| ---------------------------- | ------------------------------------------- |
| `#<room>`                    | Room.                                       |
| `#<room>/<item>`             | Reader for content bound to a room hotspot. |
| `#<room>/book/<id>/<spread>` | Book and zero-based spread.                 |
| `#<room>/board/<id>/<page>`  | Board and zero-based page.                  |

Ids are URL-encoded. Missing or non-digit page numbers become zero; numeric values clamp to bounds. Malformed URI escapes fall back to the start room.

Unknown initial rooms fall back to `start`; unknown rooms in later hash changes are ignored. A book route must belong to the room or carried inventory; board routes require a board hotspot in the room. Notice detail is not encoded in the hash.

Inventory uses only `localStorage["adventure.inventory"]`, containing a JSON array of `{ "kind": "book" | "notice", "id": "..." }`. Restoration checks entry types, current ids, board membership and duplicates. It rewrites the valid list.

Corrupt JSON, blocked storage and quota errors do not stop play.

Forget removes collected books and notices and removes the key. Pocket items remain. No other game state persists.

## room.json and objects.png

| Field                  | Type                  | Meaning                                                                                                      |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `name`                 | string                | Descriptive authoring name; runtime identity comes from the world room key.                                  |
| `size`                 | two positive integers | Width and height shared by all room images.                                                                  |
| `albedo`               | asset path            | Room in even light, used to colour the carried lantern's pool.                                               |
| `states`               | object                | Both `dusk` and `night`, each containing `unlit` and `lights`.                                               |
| `states.<time>.unlit`  | asset path            | Drawing with every room lamp off.                                                                            |
| `states.<time>.lights` | object                | Every light item id mapped to a drawing with only that lamp on. May be empty.                                |
| `items`                | array                 | Ordered item records described below.                                                                        |
| `depth`                | object                | Required in walking rooms: `far: [y, scale]`, `near: [y, scale]`. Use distinct y values and positive scales. |
| `spawn`                | point                 | Required in walking rooms. Default arrival feet position, snapped to walkable floor.                         |
| `map`                  | optional boolean      | With `true`, no actor, shadow, carried lantern or walking. Depth and spawn may be omitted.                   |
| `water`                | optional asset path   | Room-sized water data mask.                                                                                  |

Each state requires one drawing for every lamp. All room PNG dimensions are checked at load. Lighting is composed in linear colour as `unlit + sum(strength × (lamp drawing - unlit))`, plus lantern light from albedo, then clamped.

Lamps start on and fade over 0.4 seconds when toggled.

`objects.png` is an RGB mask. Black means no item. Paint each item with its unique exact `#rrggbb` colour, without antialiasing.

An item must have painted pixels. The loader derives bounds and bottom-centre position from those pixels. Item regions cannot overlap because each pixel encodes one colour.

Walkable floor under the panel is removed at runtime.

| Item field | Meaning                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Unique item name used by bindings, sound positions and lamp drawings.                                                            |
| `kind`     | `walkable`, `foreground`, `slot`, `light`, `exit` or `hotspot`.                                                                  |
| `color`    | Exact mask colour, distinct from black and all other item colours.                                                               |
| `label`    | Optional user-facing name; otherwise the id is shown.                                                                            |
| `look`     | Optional spoken description.                                                                                                     |
| `to`       | Exit destination room id. Undefined destinations give a response.                                                                |
| `light`    | Lamp behaviour: `oil` and `candle` flicker; `beacon` flashes; other labels, such as `pendant`, `wall` or `desk`, breathe slowly. |
| `tint`     | Required for light items: `#rrggbb` bloom colour. Room illumination still comes from drawings.                                   |

Floor pixels permit eight-direction paths with no diagonal corner cutting. Slot position anchors a sprite's bottom centre. Foreground items use their lowest painted row as a baseline: feet behind that row are covered; feet on or in front of it remain visible.

The same test clips lantern emission and glow.

Exits travel with a 0.15-second fade each way. The return exit's nearest floor point supplies arrival; otherwise `spawn` does. Arrival faces the frame centre.

A map exit travels immediately. Beacon Use responds without walking or toggling: four seconds dark, then one smooth one-second flash, repeating every five seconds.

### water.png

Use RGB black outside water, red `#ff0000` for water and yellow `#ffff00` for reflection pixels inside water. The loader treats red 255 as water and green 255 as reflection within it. Palette membership does not apply.

Connected row spans keep displacement within coasts, holes and window bars. Horizontal samples shift by integer offsets within ±2 pixels over an eight-second swell. Sparse reflection pixels use the brightest painted RGB triplet of the relevant drawing, more often near the reflection horizon.

Both effects update four times per second and stop when `prefers-reduced-motion: reduce` matches. Displacement applies to every lamp drawing and the unlit drawing before composition.

## character.json

| Field        | Type                | Meaning                                                                             |
| ------------ | ------------------- | ----------------------------------------------------------------------------------- |
| `sheet`      | asset path          | Transparent character sprite grid.                                                  |
| `glow`       | optional asset path | White emission pixels on transparency, matching the sheet dimensions and cell grid. |
| `frame`      | `[width, height]`   | Size of each cell, currently `[128, 234]`.                                          |
| `anchor`     | point               | Feet within a cell, currently `[64, 233]`.                                          |
| `lantern`    | point               | Fallback flame offset from the feet at scale 1.                                     |
| `animations` | object              | Animation names mapped to cell metadata.                                            |

Required animation names are `idle-front`, `walk-side`, `walk-front`, `walk-back`. Optional `idle-side` and `idle-back` preserve facing after movement; otherwise standing falls back to unmirrored `idle-front`.

Additional sheet rows such as `talk-front` may exist, but the current engine does not select a talking animation.

| Animation field | Meaning                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `row`           | Zero-based cell row.                                                                                                             |
| `start`         | Optional first column, default zero.                                                                                             |
| `frames`        | Positive number of cells in this animation.                                                                                      |
| `fps`           | Positive time-based playback rate when no stride is supplied.                                                                    |
| `stride`        | Optional positive pixels travelled per cycle at scale 1. Walking advances by distance divided by stride and current depth scale. |

The side sheet faces right and mirrors for left. Front/back selection uses hysteresis near diagonals. Walk phase persists across segments and directions; running changes distance, not frame rules.

Feet interpolate the room depth scale, clamped at the far and near rows.

With `glow`, each cell's red×alpha weighted centroid supplies the flame location; an empty cell uses `lantern`. This offset, sheet crop and mirroring follow the current animation. Glow dimensions are checked against the sheet.

Authoring checks must ensure every animation stays inside the grid.

## rig.json

`tools/rig_walk.py` reads this beside `character.json`. It uses Pillow and NumPy, rewrites walk rows in `sheet` and optional `glow`, updates animation `frames` and `stride`, removes walk `start` offsets, and optionally writes a preview GIF. Paths resolve relative to the character directory.

Side output is always generated; front and back output require their view objects.

| Field               | Default or requirement                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `palette`           | Required JSON colour-list path.                                                                                                  |
| `pose`              | Standing animation name, default `idle-side`; uses its `start` column.                                                           |
| `frames`            | Number of walk frames, default 12.                                                                                               |
| `clean_pose`        | Optional cell-sized transparent PNG replacing the side pose.                                                                     |
| `hem`               | Required last upper-body row.                                                                                                    |
| `joints`            | Required `hip`, `knee`, `ankle` points for a reference leg.                                                                      |
| `shin`, `boot`      | Required crop boxes for the reference leg.                                                                                       |
| `coat_brightness`   | Optional sum-of-RGB threshold excluding bright coat pixels from the shin.                                                        |
| `far_shade`         | Far side brightness, default 0.72 for side, 0.84 for depth views.                                                                |
| `gait`              | Optional `hip`, `knee`, `ankle` arrays of `[phase, degrees]` keys. Each supplied curve replaces its default.                     |
| `upper.hem_columns` | Swaying columns `[x0, x1]`, default whole width.                                                                                 |
| `upper.hem_sway`    | Side hem motion multiplier, default 4.5.                                                                                         |
| `upper.bob`         | Side vertical bob amount, default 2.                                                                                             |
| `upper.lean`        | Side shoulder counter-sway, default 2.4.                                                                                         |
| `lantern`           | Optional object with required `box`, `pivot`; optional `swing` (default 7 side or 4 depth) and `flame_brightness` (default 600). |
| `arm`               | Optional side arm with required `source`, `shoulder`, `elbow`; optional `swing`, default 18 degrees.                             |
| `front`, `back`     | Optional depth-view definitions below.                                                                                           |

Depth-view objects require `hem` and two `legs`. Each leg requires `joints.hip`, `joints.knee`, `joints.ankle`, plus `thigh`, `shin`, `boot` crop boxes.

A view's optional `pose` defaults to `idle-front` or `idle-back`. `stride_scale` defaults to 0.5 and `foot_lift` to 5 pixels.

Optional `arms` entries require `box`, `pivot` and accept `swing` (default 3 degrees). Optional `lantern` follows the common object. Depth views share the side gait and have no per-view gait option.

Curve interpolation is periodic smoothstep. The tool samples side phases at equal planted-foot travel; depth views project those phases with half-cycle stance/swing corrections. Rotations use 4× nearest sampling; shading snaps back to the palette.

See [Character walking](docs/character-walk.md) for measurements and visual checks.

## book.json

| Field                                      | Meaning                                                        |
| ------------------------------------------ | -------------------------------------------------------------- |
| `image`                                    | Required 640×360 open-book drawing with blank pages.           |
| `pages`                                    | Two `[x, y, width, height]` text rectangles, left then right.  |
| `turn.sheet`                               | Transparent horizontal strip of turning-page cells.            |
| `turn.rect`                                | Destination rectangle and dimensions of one cell.              |
| `turn.frames`                              | Cell count; strip width must equal cell width times count.     |
| `turn.fps`                                 | Playback rate for automatic completion or cancellation.        |
| `curl.image`                               | Two-cell transparent corner strip, left then right.            |
| `curl.rects`                               | Two destination rectangles, normally 24×24 each.               |
| `font.regular`                             | Self-hosted font path, currently `fonts/NFPixels-Regular.ttf`. |
| `font.family`                              | FontFace family, currently `NF-Pixels`.                        |
| `sizes.title`, `sizes.body`, `sizes.label` | Font sizes in game pixels, currently 20, 10, 10.               |
| `ink`, `faded`, `accent`                   | Text, secondary text and hover colours as `#rrggbb`.           |

Keep `fonts/NFPixels-OFL.txt` beside the unmodified font. Font metrics set ascent and line height; line height is `round(size × 1.3)`. Entries have at most two title lines plus a date and a half-body-line gap.

Page one includes a two-line title and count. Each page reserves label height for its number; pagination throws if later pages cannot fit any entry. Empty books still have one spread.

A cached transparent text canvas matches the room grid. Positions round to whole pixels and alpha thresholds at 128. It redraws only while a book, board or menu is open, when book, board, page, note, inventory count, hover, menu selection or frame size changes.

The turning leaf masks text in the shader without rebuilding the text canvas.

Drag an outer half outside an entry towards the spine. Passing halfway commits; cancellation or an earlier release returns. Corner clicks commit without dragging.

The next-page strip runs right-to-left; previous turns mirror it. `tools/make_curls.py` derives folded corners from the open drawing and palette.

## board.json

| Field                    | Meaning                                            |
| ------------------------ | -------------------------------------------------- |
| `image`                  | Empty board drawing, normally 640×360.             |
| `pin`                    | Transparent pin sprite.                            |
| `notices`                | Non-empty array of notice places in reading order. |
| `notices[].paper`        | Blank paper sprite path.                           |
| `notices[].at`           | Paper top-left point.                              |
| `notices[].text`         | Absolute text rectangle inside that paper.         |
| `older`, `newer`         | Paging hit rectangles.                             |
| `note.image`             | Large-note overlay, normally transparent 640×360.  |
| `note.text`              | Full note text rectangle.                          |
| `note.go`, `note.back`   | Go there and Back hit rectangles.                  |
| `ink`, `faded`, `accent` | Text, secondary text and hover colours.            |

One page holds `notices.length` items. Controls stay drawn when inactive, with faded explanatory labels. Hover lifts paper, pin and text one game pixel.

Titles wrap to fit the paper and reserve one date line.

The full note shows up to three title lines, date, faded hostname and description; missing descriptions use a faded placeholder sentence.

The world board's title and subtitle each wrap to one line above the notices. The box centres over the notice span just above its top edge. Its height follows font line heights; wrapping uses the horizontal notice span.

Leave enough clear space in the drawing.

The Take it rectangle has an 80-pixel width centred between Go and Back, sharing Go's y and height.

Take copies the notice and its slot's paper/pin into inventory; the board retains it. A carried notice shows inactive In your pocket. Its Back action closes the overlay to the current room.

The book's shared fonts are required for board text.

## Sounds

The `purr` generator filters soft noise with a 24 Hz rumble and two breathing envelopes. Use `{"synth":"purr"}` in `world.sounds`; an actor's `sound` names that definition.

Sounds live in `world.sounds`; no separate sound JSON is loaded. The shipped real world uses WAV footstep files plus synthesized ambience and effects.

| Sound definition field | Meaning                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `synth`                | One built-in generator id below; use either this or `src`.                                                           |
| `src`                  | One audio path or a non-empty array of paths, relative to `world.json`. An array chooses one file randomly per play. |
| `volume`               | Gain multiplier, default 1.                                                                                          |
| `loop`                 | Loop flag, default false. Ambient sounds should use true.                                                            |
| `params.frequency`     | Optional generator filter frequency in Hz.                                                                           |
| `params.duration`      | Optional generator duration in seconds, clamped to at least 0.02.                                                    |

| Generator | Filter frequency | Duration | Base level |
| --------- | ---------------- | -------- | ---------- |
| `purr`    | 320 Hz lowpass   | 2.6 s    | 0.22       |
| `surf`    | 650 Hz           | 4 s      | 0.32       |
| `wind`    | 280 Hz           | 4 s      | 0.22       |
| `crackle` | 1800 Hz          | 4 s      | 0.09       |
| `step`    | 900 Hz           | 0.09 s   | 1          |
| `page`    | 2400 Hz          | 0.32 s   | 0.3        |
| `click`   | 1400 Hz          | 0.035 s  | 0.25       |
| `creak`   | 380 Hz           | 0.65 s   | 0.28       |
| `whoosh`  | 700 Hz           | 0.5 s    | 0.25       |

Generators use filtered noise with pitch and level variation. Loops use eight-second noise beds and evolving envelopes. `surf` uses a low-pass filter; other presets use a band-pass.

File duration comes from decoded audio.

Missing files, unknown sound ids and unknown synths warn once and remain silent. Audio data is decoded once per resolved URL per game instance.

`world.mix` accepts `master`, `ambience`, `effects` and `voice`, defaulting to 0.5, 0.8, 1 and 1. Each room's `ambience.dusk` and `ambience.night` contain entries with required `sound`, optional `at` (room item id) and optional `light` (lamp id). Position changes gain and stereo pan; no position means constant gain and centred pan.

Lamp binding multiplies gain by fade level. Room/time changes cross-fade loops over one second.

`world.events` maps `step`, `page-turn`, `book-open`, `book-close`, `lamp`, `menu`, `door`, `lantern` and `time` to sound ids. Omitted events stay silent. Footsteps fire at half and whole walk cycles with depth-scaled gain.

Cancelled page turns stay silent. Door sound fires on exit arrival before the room fade.

Start unlocks audio. M and the sound label toggle mute in memory. A reader ducks ambience and effects to 0.25.

Hidden tabs suspend the context and visible tabs resume it. Destroy stops voices and closes the context.

## Voices

`world.voices` maps each voice id to `{ "text": "Spoken subtitle.", "src": "voices/line-id.mp3" }`. `text` is required; `src` is optional and resolves against `world.json`. Record dry MP3 files under `dev/real/voices/`, using each line's id as its file name.

Recordings load only when said and decode once per resolved URL per instance. Missing or failing files warn once and use text only; failed loads are cached too. A new line cancels the previous recording and any pending playback. Destroy also cancels pending playback.

Subtitles stay visible while audio loads and until it ends. Without audio they stay for `max(3.5, text.length × 0.055)` seconds, starting after a failed load resolves. Long subtitles wrap without truncation above the character, inside the frame. Maps centre subtitles; close-ups show them in the bottom bar.

A frame click skips the current line, stops audio and clears its subtitle, then acts as a normal click. A secondary click only skips. Page dragging cannot begin during a line. Room entry speech starts after fade-in before a frame click can act.

The voice bus connects directly to master. While a recording plays, ambience and effects duck to 0.5 (about 6 dB). Reader ducking multiplies this level. Voice gain uses `mix.voice`, default 1; M and the sound label mute every bus through master. M never skips a line.

The fixed answers use `common-cant`, `common-lamp-on`, `common-lamp-off`, `common-too-far`, `common-keep`, `common-have-it`, `common-pockets`, `common-night` and `common-dusk`. Their text and recordings come from `voices`; an omitted id keeps the engine's built-in text. Other dynamic responses stay text only.

## Validation boundary

The loader checks fetch status, URL protocols, reader origin, palette-strip dimensions, room-image dimensions, required lamp drawings, character-glow dimensions and room actor configuration and sheet bounds. It is not a complete schema validator. Authors must check ids, colours, animation bounds, floor connectivity, page fit and control geometry.

Use `tests/assets.py`, the JavaScript suite and browser checks described in [README.md](README.md#checks-and-tools).
