# Task 3: frame size from the data, 480×270

`CONTRACT.md` changed: the frame is now 480×270 and the character about 120 pixels
tall (72×128 cells). Work only inside `game/`, no git commands.

1. **No hardcoded frame size.** The engine takes the frame size from the room's
   `size` (all rooms of a world share it). Remove every 320, 180, 319 and 179 tied to
   the frame from the code and the shaders; pathfinding, masks, lookups, upscaling
   and hit testing use the room's size.
2. **UI scales with the frame.** The bitmap font, the sentence line and the verb
   strip keep the same proportion of the frame they have now (the verb strip about
   one fifteenth of the height). A 2× font at 480×270 is fine.
3. **Lantern and light radius** scale with the frame: the lantern radius is a
   fraction of the frame height, not a pixel count.
4. **Placeholders:** update `tools/make_placeholders.py` to the new contract and
   regenerate `dev/data/` (480×270 room, 72×128 character cells).
5. Update `README.md` where it names sizes.

Finish with a summary.
