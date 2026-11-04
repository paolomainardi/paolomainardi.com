// Select animation cells from walking distance or elapsed time.
export function animationFrame(actor, animation) {
  return (
    Math.floor(
      animation.stride
        ? actor.walkPhase * animation.frames
        : actor.clock * animation.fps,
    ) % animation.frames
  );
}
