# Task 10: move the game to 640×360

The art is rebuilt at 640×360 in
`/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/ab/640-final/`
(room, character with 128×234 cells, objects, palette). Move the game to it. Work
only inside `game/`. No git commands. The plan is approved: do not stop to ask.

1. **Data.** Replace the files in `dev/real/` with the 640 ones, copying only the
   files the contract names (`palette.png`, `palette.json`, the room images and
   `room.json`, `objects.png`, the character `sheet.png`, `glow.png` and
   `character.json`, the book sprites). Leave out the reports and debug images.
   Keep `dev/real/world.json` as it is.
2. **Engine.** The frame size already comes from the room. Find every value that
   is in buffer pixels and was tuned for 480×270 (walk speed 90 px/s, lantern
   radius, rim and shadow offsets, bloom radius, click and hover tolerances, verb
   bar and sentence line layout, look text placement) and scale it with the frame
   width relative to 480, so the game feels the same at 640. Keep the bitmap font
   at one pixel per font pixel unless it no longer reads at 3× scale on a 1080p
   screen; say which you chose.
3. **Contract.** Update `CONTRACT.md`: frame size from `room.json` (640×360 for
   this site), character example with the new cell size.
4. **Tests.** Update the tests and placeholders that assume 480×270, run the whole
   suite, and do one browser check of `/dev/?data=real` at 1920×1080: the frame
   fills the screen at 3×, the character walks, the verb bar and the sentence line
   read. Save that screenshot as `dev/shot-640.png`.

Finish with a short summary of what changed.
