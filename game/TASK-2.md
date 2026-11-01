# Task 2: engine fixes after the first visual review

The engine works. `dev/?data=real` boots it with the real room and character. Fix
these, keeping `CONTRACT.md` as the format. Work only inside `game/`, no git commands.

1. **Dithering is too visible.** Large checkerboard areas cover the walls wherever
   a light pool fades. Use 6 light bands instead of 4, and apply the Bayer dither
   only in a narrow transition at each band edge (about a fifth of a band), so most
   of the lit area is flat colour and only the band edges are dithered.
2. **The UI hides the scene.** The sentence line and the verb bar sit on opaque
   black bars that cover the top and bottom of the room. Draw the sentence line as
   text only, with a 1-pixel dark outline, no bar. Make the verb bar one compact row
   on a semi-transparent dark strip no taller than 12 pixels of the 320×180 frame.
3. **Walking is too slow.** Crossing the room takes about 30 seconds. Use about 60
   pixels per second at scale 1, scaled by depth.
4. **Character data only.** The character must be swappable by changing its sprite
   files: nothing about a specific character may live in the engine code. Everything
   comes from `character.json` (frame, anchor, lantern, animations). Check that no
   other character value is hardcoded, and update `README.md` with a short section on
   how to replace the character.

Finish with a summary of what changed.
