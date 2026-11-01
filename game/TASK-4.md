# Task 4: light that reads

`dev/?data=real` now runs the real 480×270 room and a 160-pixel character. The light
is the heart of the look and it is too weak. Work only inside `game/`, no git
commands.

1. **The lantern.** Its light is barely visible. At night it must clearly light a
   warm pool on the floor around the character's feet and the nearby walls and
   furniture, revealing the `lit` drawing within its radius (about a third of the
   frame height) with a warm tint, falling off in the dithered bands. It flickers
   gently like a flame. The lantern itself shows a small bright glow in the bloom pass.
2. **The character in the light.** At night the sprite is too dark and grey. Tint it
   by the light at its position (room lamps plus its own lantern), never darker than
   about 70% of its own colours, with the warm rim on the side of the brightest
   nearby light, stronger than now.
3. **Remaining dithering.** The edge of the pendant's light on the left wall still
   shows a wide dithered area. Narrow the dither transition further, so only a
   2 to 3 pixel band at each light step is dithered.
4. **Lamp glow.** Lit lamps get a soft halo in the bloom pass, a little stronger than
   now and warm; switched off, none.

Add a debug key `G` that toggles the bloom, for comparison. Finish with a summary.
