// Check panel behavior against the engine and shipped fixtures.
import assert from "node:assert/strict";
import {
  layoutPanel,
  inside,
  inventoryIcon,
  siteLayout,
  sitePath,
} from "../src/panel.js";
const verbs = ["Look at", "Open", "Use", "Take", "Talk to"];
const panel = layoutPanel([640, 360], verbs);
assert.equal(panel.top, 324);
assert.deepEqual(
  panel.verbs.map((rect) => rect.label),
  verbs,
);
assert.deepEqual(
  layoutPanel([640, 360], [...verbs].reverse()).verbs.map((rect) => rect.label),
  [...verbs].reverse(),
);
for (const [i, rect] of panel.verbs.entries()) {
  assert.equal(rect.x, 8 + i * 60);
  assert.equal(rect.y, 344);
  assert(inside(rect, rect.x, rect.y));
  assert(
    inside(rect, rect.x + rect.width - 0.001, rect.y + rect.height - 0.001),
  );
  assert(!inside(rect, rect.x + rect.width, rect.y));
  assert(!inside(rect, rect.x, rect.y + rect.height));
  assert(!inside(rect, rect.x - 0.001, rect.y));
  assert(!inside(rect, rect.x, rect.y - 0.001));
}
for (const rect of [
  ...panel.slots,
  panel.previous,
  panel.next,
  panel.sound,
  panel.forget,
]) {
  assert(rect.x >= 0 && rect.x + rect.width <= 640);
  assert(rect.y >= panel.top && rect.y + rect.height <= 360);
  assert(inside(rect, rect.x, rect.y));
  assert(!inside(rect, rect.x + rect.width, rect.y));
  assert(!inside(rect, rect.x, rect.y + rect.height));
}
assert(panel.slots.at(-1).x + panel.slots.at(-1).width <= panel.next.x);
assert(panel.next.x + panel.next.width <= panel.forget.x);
const icon = inventoryIcon({ size: [24, 36] }, panel.slots[0]);
assert.deepEqual(icon.slice(2), [8, 12]);
assert(icon.every(Number.isInteger));
console.log(
  "Panel order, grid positions, half-open edge hits, and whole-pixel icons passed.",
);

for (const width of [320, 640, 960]) {
  const game = { room: { size: [width, 360] } };
  assert.equal(sitePath(game), null);
  for (const state of [
    { activeBook: { site: "/tags/linux/" } },
    { activeBoard: { site: "/links/" } },
    { readerItem: {}, readerSite: "/about/" },
    { activeBook: { site: "/" + "long/".repeat(100) } },
  ]) {
    Object.assign(
      game,
      {
        activeBook: null,
        activeBoard: null,
        readerItem: null,
        readerSite: null,
      },
      state,
    );
    const rect = siteLayout(game);
    assert(rect.x >= 152);
    assert(rect.x + rect.width <= width - 82);
    assert.equal(rect.y, 344);
    assert(inside(rect, rect.x, rect.y));
  }
}
