export const LANTERN_COLOUR = [1, 0.7, 0.32];

export function linear(value) {
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

export function lightSourcesAt(game, x, y) {
  const [width, height] = game.room.size,
    state = game.room.states[game.time];
  const sources = game.room.lights.map((light) => {
    const px = Math.max(0, Math.min(width - 1, Math.floor(x + light.drift[0])));
    const py = Math.max(
      0,
      Math.min(height - 1, Math.floor(y + light.drift[1])),
    );
    const index = (py * width + px) * 4;
    const tint = [0, 1, 2].map((c) =>
      Math.max(
        0,
        linear(state.lightPixels[light.id][index + c]) -
          linear(state.unlitPixels[index + c]),
      ),
    );
    return {
      position: light.position,
      tint,
      strength: Math.max(...tint) * light.strength,
    };
  });
  if (game.room.map) return sources;
  const position = game.lanternPosition();
  sources.push({
    position,
    tint: LANTERN_COLOUR,
    strength:
      falloff(x, y, position, game.lanternRadius) * game.lanternStrength(),
  });
  return sources;
}

export function beacon(time) {
  const phase = ((time % 5) + 5) % 5;
  return phase < 4 ? 0 : Math.sin((phase - 4) * Math.PI) ** 2;
}
