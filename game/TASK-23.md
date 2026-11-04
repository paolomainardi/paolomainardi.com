# Task 23: depth for foreground objects, feedback in close-ups, the way to the lighthouse

Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask.

## 1. Foreground objects respect depth

Today every `foreground` item is drawn over the character, so in the harbour
the crates and the rope cover him even when he stands in front of them. A
foreground item must cover the character only when the character's feet are
behind it: when the feet's y is smaller than the item's baseline (the lowest
row of that item in `objects.png`). Compute each item's baseline at load, and
mask the character per item (for example a foreground texture holding the item
index, with the baselines as a uniform array, or one mask per item; keep it
fast). The lantern glow follows the same rule. Test with the harbour's `cargo`
and `quay-posts` and the study's `chair`, in front and behind.

## 2. Feedback inside close-ups

- Messages said while a book, the board, a note or the reader is open appear in
  the bottom bar for about three seconds, replacing the "Close or right click,
  Esc" hint, never overlapping it or the site path.
- In a note that is already in the inventory, "Take it" becomes "In your pocket",
  faded and inactive.
- In rooms, `Take` on the notice board says "Open it and pick a notice.";
  `Take` on the letter or the logbook says "It belongs to the keeper."

## 3. The way to the lighthouse

- A hotspot can send the character somewhere: in `world.json`,
  `"hotspots": { "lighthouse": { "go": "lighthouse", "via": "path" } }`.
  `Walk to`, `Open` or a plain click on it walks to the exit named in `via`,
  then travels to the room named in `go` (with the usual fade), skipping the
  map. `Look at` still gives its look line.
- Hovering the harbour's `path` exit writes "Walk to Island path" and the
  cursor shows an arrow pointing right (any exit shows an arrow pointing to the
  frame edge it is nearest to).
- Set the harbour's distant lighthouse in `dev/real/world.json` as above, and
  give the lighthouse room's `stairs` the same treatment towards the harbour:
  `"hotspots": { "stairs": { "go": "harbour", "via": "stairs" } }` is not
  needed; the stairs stay an exit to the map.

Update `CONTRACT.md`, `README.md` and the tests. Run the whole suite.

Finish with a short summary.
