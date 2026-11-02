export function animationFrame(actor, animation) {
  return (
    Math.floor(
      animation.stride
        ? actor.walkPhase * animation.frames
        : actor.clock * animation.fps,
    ) % animation.frames
  );
}
