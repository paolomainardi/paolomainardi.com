# Task 19: five verbs, the notice board, the map, beacons and found papers

Work only inside `game/` (not `dev/real/rooms/` or `dev/real/board/`: the art
task writes those). No git commands. The plan is approved: do not stop to ask.

## 1. Five verbs in one row

- `world.verbs` becomes `["Look at", "Open", "Use", "Take", "Talk to"]`.
  `Open` also covers reading. Remove `Close`, `Give` and `Read` from the engine
  and the right-click menu.
- "Walk to" is the default when no verb is selected, as in the classic games:
  it is no longer a button. Selecting a verb again deselects it.
- The panel shrinks to the sentence line plus one row: the five verbs on the
  left, the inventory on the right, at most 36 game pixels in all. Walkable
  floor may come down to the panel's top.
- **Fix:** the sentence line and the bar hints overlap ("Close or right click,
  Esc" and "Opening the link…" drawn on top of each other). Each text gets its
  own place; a temporary message replaces the hint, never overlaps it.

## 2. The notice board close-up

Implement `/home/paolo/webapps/sparkfabrik/agents/site-redesign/game-board-contract.md`:
a `board` mode next to the book mode, opened by a hotspot with `"board": id`
(`Open` or a plain click). Notices show the link title (wrapped to fit,
ellipsis) and date; hover lifts the notice by one pixel and tints it with the
accent; a click opens the note view (title, date, the item's `description` as
Paolo's note, wrapped, "Go there" opening `link` in a new tab with
`rel="noopener"`, "Back"). Older and newer papers page through. Close like the
book: the bottom bar's Close, right click, or Esc. Address
`#<room>/board/<id>/<page>`. The hidden accessible link list includes the board's
links. Build placeholders for `dev/data/board/`.

## 3. The island map

A room with `"map": true` in its `room.json` has no character and no walking:
its exits are places, hovering one writes "Go to <label>" in the sentence line,
a click travels there with the usual fade. Arrival in a room from the map uses
the room's exit whose `to` is `"map"`, otherwise `spawn`.

## 4. Beacons

A light item with `light: "beacon"` flashes: off most of the time, then a slow
rise to full and back over about a second, every five seconds, as a lighthouse.
It cannot be switched with `Use` ("Too far away.").

## 5. Found papers

A hotspot bound to a content item with a `reader` (`"content": { "type":
"about" }`, `"content": { "type": "talk" }`) opens it in the reader with
`Open` or a plain click, and `Look at` gives the hotspot's own `look` line.
Check this works for items of type `about` and `talk`.

## Docs and tests

Update `CONTRACT.md` (board, map rooms, beacons, verbs) and `README.md`, the
placeholders (a map room and a board) and the tests: verb row and default
walk, no overlapping bar texts, board layout and paging and note view, map
travel without a character, beacon timing, hotspot readers for about and talk.
Run the whole suite. One browser check only if the sandbox allows it.

Finish with a short summary.
