# Task 20: take notices, notes without text, found papers

Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask.

1. **Take a notice.** The open note view on the notice board gets a third
   action, "Take it", between "Go there" and "Back" (place it in the note's
   free space; add `take` to the board contract as an optional rect, with a
   default centred between the other two). It puts the notice in the
   inventory as a small paper icon (from the board's paper sprite, scaled down
   by whole pixels, with the pin), says "I'll keep this one.", and the notice
   stays on the board. Taking it again says "I already have it." In the
   inventory, `Open` (or a click with no verb) shows the same note view over
   the current room, with "Go there" and "Back"; `Look at` says the title. The
   inventory scrolls when full. Session only, no storage.
2. **Notes without text.** When a link has no `description`, the note shows
   "No note on this one. Worth a look." in faded ink. Under the date, every note
   shows the link's host name (for example `zenodo.org`), faded.
3. **Found papers.** In `dev/real`, the lighthouse's `letter` hotspot is bound to
   the `about` item and `logbook` to the `talk` item (`world.json`). A plain
   click on the letter (walk there, then open) and `Open` on it must open the
   reader with the about page; check with an integration test using the real
   world and a content fixture that has `about` and `talk` items. Fix whatever
   stops it.

Update `CONTRACT.md`, `README.md` and the tests. Run the whole suite.

Finish with a short summary.
