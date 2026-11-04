// Precompute connected row spans so a wave cannot cross a coast or window bar.
export function buildWater(pixels, [width, height]) {
  const spans = [],
    reflection = [];
  let top = height,
    bottom = -1,
    reflectionTop = height,
    reflectionBottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (pixels[i * 4] !== 255) continue;
      const start = x;
      while (x + 1 < width && pixels[(y * width + x + 1) * 4] === 255) x++;
      spans.push([y, start, x]);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (let xx = start; xx <= x; xx++) {
        const index = y * width + xx;
        if (pixels[index * 4 + 1] !== 255) continue;
        reflection.push(index);
        reflectionTop = Math.min(reflectionTop, y);
        reflectionBottom = Math.max(reflectionBottom, y);
      }
    }
  }
  return {
    width,
    height,
    spans,
    reflection,
    top,
    bottom,
    reflectionTop,
    reflectionBottom,
    frame: new Uint8Array(width * height * 4),
  };
}

// Reuse one RGBA motion buffer for bounded displacement and reflection flags.
export function waterFrame(water, seconds, reduced = false) {
  const frame = water.frame;
  frame.fill(0);
  if (reduced) return frame;
  // Four updates per second, with an eight-second swell and sparse sparkles.
  const tick = Math.floor(seconds * 4),
    t = tick / 4;
  for (const [y, start, end] of water.spans) {
    const depth = (y - water.top) / Math.max(1, water.bottom - water.top);
    const shift = Math.round(
      2 * depth * Math.sin((t * Math.PI) / 4 + y * 0.24),
    );
    for (let x = start; x <= end; x++) {
      const at = (y * water.width + x) * 4;
      frame[at] = Math.max(start, Math.min(end, x + shift)) - x + 2;
      frame[at + 2] = 255;
    }
  }
  for (const i of water.reflection) {
    const depth =
      (Math.floor(i / water.width) - water.reflectionTop) /
      Math.max(1, water.reflectionBottom - water.reflectionTop);
    let hash = Math.imul(i + 1, 374761393) ^ Math.imul(tick + 1, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    if ((hash >>> 0) / 4294967296 < 0.025 * (1 - 0.8 * depth))
      frame[i * 4 + 1] = 255;
  }
  return frame;
}

// Return an existing RGB triplet, never a channel-wise maximum or a new colour.
export function reflectionPeak(water, pixels) {
  let best = -1,
    peak = [0, 0, 0, 255];
  for (const i of water.reflection) {
    const at = i * 4;
    const brightness =
      pixels[at] * 0.2126 + pixels[at + 1] * 0.7152 + pixels[at + 2] * 0.0722;
    if (brightness <= best) continue;
    best = brightness;
    peak = [...pixels.slice(at, at + 3), 255];
  }
  return peak;
}
