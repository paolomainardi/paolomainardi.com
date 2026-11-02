# Task 16: moving water

Animate the sea seen through the study window. Work only inside `game/`. No git
commands. The plan is approved: do not stop to ask. A real water mask is being
made at the same time; build against a placeholder.

## Contract

`room.json` may name `"water": "water.png"`, a mask the size of the room: red
255 where there is water, green 255 where the water carries a bright
reflection (the moon path), black elsewhere.

## Effect

Every pixel still comes from the drawings: the effect only moves and reorders
them, it never paints new colours.

- **Swell.** Inside the red area, sample the room (unlit and every lamp layer,
  the same way) from a horizontally shifted position: each row moves by a whole
  number of pixels, at most 2, following slow waves that travel across the
  water. Rows farther from the horizon move more. Samples that would land
  outside the red area are clamped back inside it, so frame and coast never
  smear into the sea.
- **Glitter.** Inside the green area, pixels switch on and off in short random
  sparkles: a sparkle shows the brightest colour of the reflection, then
  returns to its own. Few at a time, a slow rhythm, stronger near the horizon
  line of the reflection.
- **Speed.** A full swell takes several seconds; nothing flickers faster than a
  few times a second. Keep the look calm. Respect `prefers-reduced-motion`: no
  swell and no glitter then.
- The effect runs before the palette mapping, so the result stays in the
  palette with the usual dithering.

Look at how the site's animated covers do water
(`/home/paolo/webapps/sparkfabrik/agents/site-redesign/wt-adventure/docs/cover-engine.md`,
the `water` effect, and its shader in
`/home/paolo/webapps/sparkfabrik/agents/site-redesign/wt-adventure/src/themes/large-print/assets/js/motion.js`)
and reuse the same idea where it fits. Do not import that file.

## Docs and tests

Update `CONTRACT.md` and `README.md`, make a placeholder `water.png`, and add
tests: rows move by whole pixels within ±2, samples never leave the red area,
glitter only inside green, reduced motion stops both, a room without `water`
is unchanged. Run the whole suite. One browser check only if the sandbox allows
it.

Finish with a short summary.
