# Task 18: the verb panel, inventory, and rooms that hold books

Work only inside `game/` (not `dev/real/rooms/`, `dev/real/character/`,
`dev/real/book/` or `tools/rig_walk.py`: other tasks are writing those). No git
commands. The plan is approved: do not stop to ask.

## 1. A Monkey Island 2 style panel

Replace the one-line verb bar with a panel over the bottom 52 game pixels of
the 640×360 frame, dark and slightly transparent:

- **Sentence line** at the top of the panel ("Walk to Notice board").
- **Left: a 3×3 grid of verbs**, in the 5×7 font:
  `Open`, `Close`, `Give` / `Take`, `Look at`, `Talk to` / `Use`, `Read`,
  `Walk to`. `world.verbs` lists them in that order and the grid follows it.
  Verbs that do nothing for a target say a short line ("I can't do that.").
- **Right: the inventory**, slots of item icons, with arrows to scroll when it
  is full.
- Hover highlights a verb in the rose accent; the selected verb stays lit.
- The walkable floor never reaches under the panel: clicks on the panel never
  walk.
- The right-click menu keeps working with the new verbs.

## 2. Inventory

- `Take` on a topic book puts a copy of the book in the inventory (the shelf
  keeps its book). Taking it again says "I already have it."
- An inventory item is a small icon drawn from the item's own sprite, scaled
  down by whole pixels.
- Clicking an inventory item with `Look at` describes it, with `Read` or
  `Open` opens the book close-up, with `Give` or others says a short line.
  Selecting an item then clicking a target forms "Use <item> with <target>";
  for now that says a short line.
- The inventory lives for the session only: no browser storage.

## 3. Rooms that hold books, and links

- A room hotspot can open a book: `"hotspots": { "noticeboard": { "book":
  "links" } }` in `world.json`. `Read`, `Open` or a plain click open it.
- A book entry without a `reader` (a link) opens its `link` in a new tab
  (`rel="noopener"`), with a line in the sentence ("Opening the link…").
- **Arrival.** When the character enters a room through an exit, it appears at
  the matching exit of the new room (the item whose `to` points back), on the
  nearest walkable point, facing into the room; otherwise at `spawn`. A short
  fade to black and back between rooms.

## Docs and tests

Update the placeholders (a second placeholder room with a hotspot that opens a
links book, and exits both ways), `CONTRACT.md` and `README.md`. Tests: panel
layout and hit areas at the panel edges, verb grid order from `world.verbs`,
clicks on the panel never walk, inventory add/duplicate/use lines, hotspot
books, links opening a tab, arrival at the matching exit. Run the whole suite.
One browser check only if the sandbox allows it.

Finish with a short summary.
