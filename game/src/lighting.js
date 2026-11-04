// Sample drawing-based lighting and animate lamp and lantern strengths.
import { animationFrame } from "./animation.js";
import { linear } from "./palette.js";

const LANTERN_COLOUR = [1, 0.7, 0.32];

// Smooth random targets four times per second, with no repeating sine cycle.
export function flame(time) {
  const t = time * 4,
    tick = Math.floor(t),
    f = t - tick;
  const noise = (n) => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  return (
    0.85 +
    0.15 * (noise(tick) + (noise(tick + 1) - noise(tick)) * f * f * (3 - 2 * f))
  );
}

export function falloff(x, y, position, radius) {
  const t = Math.min(1, Math.hypot(x - position[0], y - position[1]) / radius);
  return 1 - t * t * (3 - 2 * t);
}

export function lightSourcesAt(game, x, y) {
  const room = game.room,
    [width, height] = room.size;
  const state = room.states[game.time];
  const count = room.lights.length + Number(!room.map);
  const sources = Array.from({ length: count }, () => ({
    position: [0, 0],
    tint: [0, 0, 0],
    strength: 0,
  }));
  for (let i = 0; i < room.lights.length; i++) {
    const light = room.lights[i],
      sample = sources[i];
    const px = Math.max(0, Math.min(width - 1, Math.floor(x + light.drift[0])));
    const py = Math.max(
      0,
      Math.min(height - 1, Math.floor(y + light.drift[1])),
    );
    const index = (py * width + px) * 4;
    for (let channel = 0; channel < 3; channel++)
      sample.tint[channel] = Math.max(
        0,
        linear(state.lightPixels[light.id][index + channel] / 255) -
          linear(state.unlitPixels[index + channel] / 255),
      );
    sample.position = light.position;
    sample.strength = Math.max(...sample.tint) * light.strength;
  }
  if (!room.map) {
    const sample = sources[count - 1];
    sample.position = lanternPosition(game, sample.position);
    sample.tint = LANTERN_COLOUR;
    sample.strength =
      falloff(x, y, sample.position, game.lanternRadius) *
      lanternStrength(game);
  }
  return sources;
}

export function beacon(time) {
  const phase = ((time % 5) + 5) % 5;
  return phase < 4 ? 0 : Math.sin((phase - 4) * Math.PI) ** 2;
}

export function depth(game) {
  const { far, near } = game.room.depth,
    t = Math.max(0, Math.min(1, (game.actor.y - far[0]) / (near[0] - far[0])));
  return far[1] + (near[1] - far[1]) * t;
}

export function lanternPosition(game, position = [0, 0]) {
  if (game.room.map) {
    position[0] = position[1] = 0;
    return position;
  }
  const animation = game.character.animations[game.actor.animation];
  const frame = animationFrame(game.actor, animation);
  const offset =
    game.character.flames?.[game.actor.animation][frame] ||
    game.character.lantern;
  const scale = depth(game);
  position[0] = game.actor.x + (game.actor.mirror ? -1 : 1) * offset[0] * scale;
  position[1] = game.actor.y + offset[1] * scale;
  return position;
}
export const lanternStrength = (game) =>
  !game.room.map && game.lantern && game.time === "night"
    ? flame(game.elapsed)
    : 0;
export function lightAt(game, x, y) {
  return Math.min(
    1,
    lightSourcesAt(game, x, y).reduce((sum, light) => sum + light.strength, 0),
  );
}
export function nearestLamp(game) {
  let nearest = null,
    best = Infinity;
  for (const light of game.room.lights) {
    if (light.strength <= 0.05) continue;
    const distance =
      (light.position[0] - game.actor.x) ** 2 +
      (light.position[1] - game.actor.y) ** 2;
    if (distance < best) {
      best = distance;
      nearest = light;
    }
  }
  return nearest;
}

export function updateLamps(game, dt) {
  for (const lamp of game.room.lights) {
    lamp.level +=
      Math.sign(Number(lamp.on) - lamp.level) *
      Math.min(Math.abs(Number(lamp.on) - lamp.level), dt / 0.4);
    const index = game.room.lights.indexOf(lamp),
      t = game.elapsed + index * 7.31;
    const burning = lamp.light === "oil" || lamp.light === "candle";
    lamp.strength =
      lamp.level *
      (lamp.light === "beacon"
        ? beacon(game.elapsed)
        : burning
          ? flame(t)
          : 0.98 + 0.02 * Math.sin(t * 0.2));
    lamp.drift[0] = burning ? 0.65 * game.pixelScale * Math.sin(t * 1.13) : 0;
    lamp.drift[1] = burning ? 0.45 * game.pixelScale * Math.sin(t * 0.79) : 0;
  }
}

export function currentTime() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 20 ? "dusk" : "night";
}
