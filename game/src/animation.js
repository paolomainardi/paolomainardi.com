// Advance walking and select animation cells from distance or elapsed time.
import { depth } from "./lighting.js";
import { footContacts } from "./sound.js";
export function animationFrame(actor, animation) {
  return (
    Math.floor(
      animation.stride
        ? actor.walkPhase * animation.frames
        : actor.clock * animation.fps,
    ) % animation.frames
  );
}

export function idleAnimation(character, name) {
  const idle = name.replace("walk-", "idle-");
  return character.animations[idle] ? idle : "idle-front";
}

export function advanceActor(game, dt) {
  const contacts = [];
  game.actor.clock += dt;
  let remaining = dt;
  while (game.path.length && remaining > 0) {
    const next = game.path[0],
      dx = next[0] - game.actor.x,
      dy = next[1] - game.actor.y,
      distance = Math.hypot(dx, dy),
      speed = 90 * game.pixelScale * depth(game) * (game.running ? 2 : 1),
      travel = speed * remaining;
    if (distance > 0) {
      const wasSide = game.actor.animation === "walk-side",
        wasVertical = ["walk-front", "walk-back"].includes(
          game.actor.animation,
        ),
        threshold = wasSide ? 0.7 : wasVertical ? 0.9 : 0.8;
      game.actor.mirror = dx < 0;
      game.actor.animation =
        Math.abs(dx) > Math.abs(dy) * threshold
          ? "walk-side"
          : dy < 0
            ? "walk-back"
            : "walk-front";
      const animation = game.character.animations[game.actor.animation];
      const before = animation.stride
        ? game.actor.walkPhase
        : ((game.actor.clock - remaining) * animation.fps) / animation.frames;
      if (animation.stride)
        game.actor.walkPhase +=
          Math.min(distance, travel) / (animation.stride * depth(game));
      const after = animation.stride
        ? game.actor.walkPhase
        : before +
          (Math.min(distance / speed, remaining) * animation.fps) /
            animation.frames;
      for (let i = 0; i < footContacts(before, after); i++)
        contacts.push(depth(game));
    }
    if (distance <= travel) {
      game.actor.x = next[0];
      game.actor.y = next[1];
      game.path.shift();
      remaining -= distance / speed;
    } else {
      game.actor.x += (dx / distance) * travel;
      game.actor.y += (dy / distance) * travel;
      remaining = 0;
    }
  }
  if (!game.path.length) {
    if (game.actor.animation.startsWith("walk-")) {
      game.actor.animation = idleAnimation(
        game.character,
        game.actor.animation,
      );
      if (game.actor.animation !== "idle-side") game.actor.mirror = false;
    }
  }
  return contacts;
}
