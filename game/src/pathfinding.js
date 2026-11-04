// Find walkable destinations and smooth eight-direction paths without corner cutting.
const index = (x, y, width) => y * width + x;

export function nearestWalkable(mask, x, y, [W, H]) {
  x = Math.max(0, Math.min(W - 1, Math.round(x)));
  y = Math.max(0, Math.min(H - 1, Math.round(y)));
  if (mask[index(x, y, W)]) return [x, y];
  let best = Infinity,
    result = null;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const px = i % W,
      py = Math.floor(i / W);
    const distance = (px - x) ** 2 + (py - y) ** 2;
    if (distance < best) {
      best = distance;
      result = [px, py];
    }
  }
  return result;
}

function visible(mask, a, b, W) {
  const steps = Math.ceil(
    Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * 2,
  );
  let previous = a.map(Math.round);
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    const x = Math.round(a[0] + (b[0] - a[0]) * t);
    const y = Math.round(a[1] + (b[1] - a[1]) * t);
    if (
      !mask[index(x, y, W)] ||
      !mask[index(previous[0], y, W)] ||
      !mask[index(x, previous[1], W)]
    )
      return false;
    previous = [x, y];
  }
  return true;
}

// Search eight neighbours with A*, then replace visible runs with straight segments.
export function findPath(mask, from, to, size) {
  const [W, H] = size;
  const start = nearestWalkable(mask, ...from, size),
    end = nearestWalkable(mask, ...to, size);
  if (!start || !end) return [];
  if (visible(mask, start, end, W)) return [end];
  const origin = index(...start, W),
    goal = index(...end, W);
  const cost = new Float64Array(W * H).fill(Infinity);
  const parent = new Int32Array(W * H).fill(-1);
  const closed = new Uint8Array(W * H);
  const heap = [];
  function push(node, score) {
    let i = heap.length;
    heap.push({ node, score });
    while (i) {
      const p = (i - 1) >> 1;
      if (heap[p].score <= score) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = { node, score };
  }
  function pop() {
    const first = heap[0],
      last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let c = i * 2 + 1;
        if (c + 1 < heap.length && heap[c + 1].score < heap[c].score) c++;
        if (heap[c].score >= last.score) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return first.node;
  }
  const heuristic = (x, y) => {
    const dx = Math.abs(end[0] - x),
      dy = Math.abs(end[1] - y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  cost[origin] = 0;
  push(origin, heuristic(...start));
  while (heap.length) {
    const current = pop();
    if (closed[current]) continue;
    if (current === goal) {
      const raw = [];
      for (let n = goal; n !== -1; n = parent[n])
        raw.push([n % W, Math.floor(n / W)]);
      raw.reverse();
      const smooth = [];
      let a = 0;
      while (a < raw.length - 1) {
        let b = raw.length - 1;
        while (b > a + 1 && !visible(mask, raw[a], raw[b], W)) b--;
        smooth.push(raw[b]);
        a = b;
      }
      return smooth;
    }
    closed[current] = 1;
    const x = current % W,
      y = Math.floor(current / W);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = index(nx, ny, W);
        if (!mask[n] || closed[n]) continue;
        if (dx && dy && (!mask[index(nx, y, W)] || !mask[index(x, ny, W)]))
          continue;
        const next = cost[current] + (dx && dy ? Math.SQRT2 : 1);
        if (next < cost[n]) {
          cost[n] = next;
          parent[n] = current;
          push(n, next + heuristic(nx, ny));
        }
      }
  }
  return [];
}
