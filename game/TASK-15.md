# Task 15: planted feet and facing when standing

Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask. A new character sheet with the same cell size is being made at the same
time; it adds the fields below to `character.json`.

1. **Frames follow distance.** A walk animation with `"stride"` (pixels its feet
   travel in one cycle at scale 1) advances its frame by distance walked, not by
   time: frame = floor(distance / (stride × depth scale) × frames) mod frames.
   Running uses the same rule, so the feet stay planted at any speed and depth.
   Animations without `stride` keep using `fps`. Keep the frame phase when the
   direction changes between path segments, so the cycle does not restart.
2. **Facing when standing.** When the character stops, keep the direction it was
   walking: `idle-side` (mirrored as the walk was) after a side walk,
   `idle-back` after walking away, `idle-front` after walking towards the
   camera. Fall back to `idle-front` when the animation is missing. Talking and
   turning to look at a target keep their current behaviour.
3. **Start column.** An animation may have `"start"`, the first column of its
   frames in its row (default 0).
4. **Direction switching.** Add a little hysteresis to the choice between side,
   front and back walk, so a path near the diagonal does not flicker between
   them.

Update `CONTRACT.md` (`stride`, `start`, the idle animations), the
placeholders (give the placeholder walks a stride) and the tests: frame by
distance at two depths and when running, phase kept across segments, facing on
stop, hysteresis. Run the whole suite. One browser check only if the sandbox
allows it.

Finish with a short summary.
