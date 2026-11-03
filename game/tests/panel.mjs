import assert from "node:assert/strict";
import { layoutPanel, inside, inventoryIcon } from "../src/panel.js";
const verbs = [
  "Open",
  "Close",
  "Give",
  "Take",
  "Look at",
  "Talk to",
  "Use",
  "Read",
  "Walk to",
];
const panel = layoutPanel([640, 360], verbs);
assert.equal(panel.top, 308);
assert.deepEqual(
  panel.verbs.map((rect) => rect.label),
  verbs,
);
assert.deepEqual(
  layoutPanel([640, 360], [...verbs].reverse()).verbs.map((rect) => rect.label),
  [...verbs].reverse(),
);
for (const [i, rect] of panel.verbs.entries()) {
  assert.equal(rect.x, 8 + (i % 3) * 76);
  assert.equal(rect.y, 324 + Math.floor(i / 3) * 12);
  assert(inside(rect, rect.x, rect.y));
  assert(
    inside(rect, rect.x + rect.width - 0.001, rect.y + rect.height - 0.001),
  );
  assert(!inside(rect, rect.x + rect.width, rect.y));
  assert(!inside(rect, rect.x, rect.y + rect.height));
  assert(!inside(rect, rect.x - 0.001, rect.y));
  assert(!inside(rect, rect.x, rect.y - 0.001));
}
for (const rect of [...panel.slots, panel.previous, panel.next, panel.sound]) {
  assert(rect.x >= 0 && rect.x + rect.width <= 640);
  assert(rect.y >= panel.top && rect.y + rect.height <= 360);
  assert(inside(rect, rect.x, rect.y));
  assert(!inside(rect, rect.x + rect.width, rect.y));
  assert(!inside(rect, rect.x, rect.y + rect.height));
}
const icon = inventoryIcon({ size: [24, 36] }, panel.slots[0]);
assert.deepEqual(icon.slice(2), [12, 18]);
assert(icon.every(Number.isInteger));
console.log(
  "Panel order, grid positions, half-open edge hits, and whole-pixel icons passed.",
);
