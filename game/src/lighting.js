// Sample drawing-based lighting and animate lamp and lantern strengths.
const LANTERN_COLOUR = [1, 0.7, 0.32];

function linear(value) {
  value /= 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

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

// Reuse samples between calls; consumers read the result before sampling another point.
const samples = new WeakMap();
export function lightSourcesAt(game, x, y) {
  const room = game.room,
    [width, height] = room.size;
  const state = room.states[game.time];
  const count = room.lights.length + Number(!room.map);
  let cached = samples.get(game);
  let sources = cached?.sources;
  if (
    !cached ||
    cached.room !== room ||
    cached.lights !== room.lights ||
    sources.length !== count
  ) {
    sources = Array.from({ length: count }, () => ({
      position: [0, 0],
      tint: [0, 0, 0],
      strength: 0,
    }));
    samples.set(game, { room, lights: room.lights, sources });
  }
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
        linear(state.lightPixels[light.id][index + channel]) -
          linear(state.unlitPixels[index + channel]),
      );
    sample.position = light.position;
    sample.strength = Math.max(...sample.tint) * light.strength;
  }
  if (!room.map) {
    const sample = sources[count - 1];
    sample.position = game.lanternPosition(sample.position);
    sample.tint = LANTERN_COLOUR;
    sample.strength =
      falloff(x, y, sample.position, game.lanternRadius) *
      game.lanternStrength();
  }
  return sources;
}

export function beacon(time) {
  const phase = ((time % 5) + 5) % 5;
  return phase < 4 ? 0 : Math.sin((phase - 4) * Math.PI) ** 2;
}
