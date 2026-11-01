import assert from "node:assert/strict";
import { findPath, nearestWalkable } from "../src/pathfinding.js";
import { matchingItems, resolve } from "../src/assets.js";
import { fontPixels, wrap } from "../src/font.js";

for (const size of [
  [320, 180],
  [480, 270],
  [640, 400],
]) {
  const [width, height] = size;
  const mask = new Uint8Array(width * height);
  for (let y = 100; y < height; y++)
    for (let x = 0; x < width; x++) mask[y * width + x] = 1;
  for (let y = 100; y < 166; y++)
    for (let x = 90; x < 116; x++) mask[y * width + x] = 0;
  const path = findPath(mask, [60, 150], [140, 150], size);
  assert(path.length > 1, "Must route around the obstacle");
  let previous = [60, 150];
  for (const next of path) {
    const count = Math.ceil(
      Math.hypot(next[0] - previous[0], next[1] - previous[1]) * 3,
    );
    for (let i = 0; i <= count; i++) {
      const x = Math.round(previous[0] + ((next[0] - previous[0]) * i) / count),
        y = Math.round(previous[1] + ((next[1] - previous[1]) * i) / count);
      assert(
        mask[y * width + x],
        `Smoothed path entered obstacle at ${x},${y}`,
      );
    }
    previous = next;
  }
  assert.deepEqual(path.at(-1), [140, 150]);
  assert.deepEqual(findPath(mask, [60, 150], [60, 150], size), [[60, 150]]);
  assert.deepEqual(nearestWalkable(mask, 20, 30, size), [20, 100]);
  assert.deepEqual(nearestWalkable(mask, width + 20, height + 20, size), [
    width - 1,
    height - 1,
  ]);
  assert.deepEqual(
    findPath(mask, [width - 20, height - 10], [width - 1, height - 1], size),
    [[width - 1, height - 1]],
  );
  const isolated = new Uint8Array(width * height);
  isolated[101 * width + 101] = 1;
  isolated[102 * width + 102] = 1;
  assert.deepEqual(
    findPath(isolated, [101, 101], [102, 102], size),
    [],
    "No diagonal corner cutting",
  );
  assert.deepEqual(
    findPath(new Uint8Array(width * height), [0, 0], [1, 1], size),
    [],
  );
}
const items = [
  { id: "b", part: 2, series: "x", tags: ["linux"], date: "2026-01-01" },
  { id: "c", series: "x", tags: ["linux"], date: "2026-04-01" },
  { id: "a", part: 1, series: "x", tags: ["linux"], date: "2026-01-01" },
  { id: "d", series: "x", tags: ["linux"], date: "2026-03-01" },
  { id: "e", part: 0, series: "y", tags: ["mac"] },
];
assert.deepEqual(
  matchingItems(items, { series: "x", tags: ["linux", "hardware"] }).map(
    (i) => i.id,
  ),
  ["a", "b", "c", "d"],
);
assert.equal(
  resolve("../reader/a.html", "https://example.test/dev/data/content.json"),
  "https://example.test/dev/reader/a.html",
);
assert.throws(() => resolve("javascript:alert(1)", "https://example.test/"));
assert(fontPixels().some((v) => v === 255));
assert(
  wrap("A long text with words that should wrap.", 12).every(
    (line) => line.length <= 12,
  ),
);
assert(wrap("x".repeat(100), 42).every((line) => line.length <= 42));
console.log(
  "Pathfinding, filtering, relative URLs, font, and text wrapping passed.",
);
