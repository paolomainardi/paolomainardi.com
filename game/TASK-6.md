# Task 6: a new light model

`CONTRACT.md` changed: a room no longer has one `lit` drawing and greyscale pools.
Each state has `unlit` plus one drawing per lamp with only that lamp on, and the room
has an `albedo` drawing. Work only inside `game/`, no git commands.

1. **Room lamps from their drawings.** In linear colour:
   `c = unlit + sum over lamps of on_i * intensity_i * (lamp_i - unlit)`, clamped.
   Switching a lamp fades `on_i` over about 0.4 s. Oil and candle lamps flicker
   (intensity between about 0.85 and 1.0, irregular, a few changes per second, with
   a very slight drift of the light so the pool seems to move); pendant and wall
   lamps are steady with a very slow breathing of a few percent.
2. **No light bands.** Remove the band quantization and its dither from the lighting.
   The final palette lookup stays; add an optional very subtle ordered dither only
   in the palette lookup, controlled by `world.json` `"dither": true|false`, default
   false.
3. **The lantern** adds `albedo * lanternColour * falloff * flicker`, with a soft
   falloff (smooth, no hard edge) over about a third of the frame height, a warm
   colour, flickering like a flame, at night only.
4. **The character** is tinted by the same light at its feet (room lamps from their
   drawings' brightness at that point plus the lantern), keeping the 70% floor and
   the rim from the brightest nearby lamp.
5. **The bloom** stays: lit lamps' painted areas and the lantern.
6. Hit testing, hover labels and the `G` key are unchanged. `T` and `L` too.
7. Regenerate the placeholders to the new contract (one drawing per lamp, albedo)
   and update the tests and `README.md`.

Finish with a summary.

## The lantern in the hand

`character.json` may have `"glow"`: a sheet on the same grid, white where the
lantern's flame and bright glass are. When the lantern is on, draw those pixels
brighter and warmer, flickering in step with the lantern's light, and feed them to
the bloom so the lantern has a small warm halo. When it is off, no glow and the
flame pixels are dimmed. The lantern's light starts from the flame's position and
also lights the character itself on that side. Add a `glow` sheet to the placeholder
character.
