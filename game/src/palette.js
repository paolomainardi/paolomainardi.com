export const PALETTE_STEPS = 64;

function linear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function oklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function buildPaletteLookup(data) {
  const points = Array.from({ length: data.length / 4 }, (_, index) => ({
    index,
    lab: oklab(...[0, 1, 2].map((c) => linear(data[index * 4 + c] / 255))),
  }));
  // Split the widest OKLab axis. Distance to each split bounds the other branch,
  // so pruning preserves the exact nearest colour, including palette-order ties.
  function tree(points) {
    if (!points.length) return null;
    let axis = 0,
      widest = -1;
    for (let c = 0; c < 3; c++) {
      const values = points.map((p) => p.lab[c]);
      const span = Math.max(...values) - Math.min(...values);
      if (span > widest) {
        axis = c;
        widest = span;
      }
    }
    points.sort((a, b) => a.lab[axis] - b.lab[axis] || a.index - b.index);
    const middle = points.length >> 1;
    return {
      ...points[middle],
      axis,
      left: tree(points.slice(0, middle)),
      right: tree(points.slice(middle + 1)),
    };
  }
  const root = tree(points);
  const levels = Array.from({ length: PALETTE_STEPS }, (_, i) =>
    linear(i / (PALETTE_STEPS - 1)),
  );
  const lut = new Uint8Array(PALETTE_STEPS ** 3 * 4);
  let target, best, nearest;
  function search(node) {
    if (!node) return;
    const dl = target[0] - node.lab[0],
      da = target[1] - node.lab[1],
      db = target[2] - node.lab[2];
    const distance = dl * dl + da * da + db * db;
    if (distance < best || (distance === best && node.index < nearest)) {
      best = distance;
      nearest = node.index;
    }
    const delta = target[node.axis] - node.lab[node.axis];
    search(delta < 0 ? node.left : node.right);
    if (delta * delta <= best) search(delta < 0 ? node.right : node.left);
  }
  let offset = 0;
  for (const b of levels)
    for (const g of levels)
      for (const r of levels) {
        target = oklab(r, g, b);
        best = Infinity;
        nearest = 0;
        search(root);
        lut[offset++] = data[nearest * 4];
        lut[offset++] = data[nearest * 4 + 1];
        lut[offset++] = data[nearest * 4 + 2];
        lut[offset++] = 255;
      }
  return lut;
}
