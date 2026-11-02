import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookFonts } from "../src/book.js";
import { context2D } from "./text-fixture.mjs";
import { targetVerbs, layoutMenu, menuHit } from "../src/verb-menu.js";
const verbs = ["Walk to", "Look at", "Open", "Use", "Talk to", "Take"];
for (const [target, expected] of [
  [{ kind: "hotspot" }, ["Walk to", "Look at"]],
  [{ kind: "hotspot", content: {} }, ["Walk to", "Look at", "Open"]],
  [{ kind: "light" }, ["Walk to", "Look at", "Use"]],
  [{ kind: "exit" }, ["Walk to", "Look at", "Use"]],
  [{ kind: "content" }, ["Walk to", "Look at", "Open", "Take"]],
  [{ kind: "book" }, ["Walk to", "Look at", "Open", "Take"]],
]) {
  assert.deepEqual(targetVerbs(verbs, target), expected);
  assert.deepEqual(
    targetVerbs([...verbs].reverse(), target),
    [...expected].reverse(),
  );
}
const book = JSON.parse(
  readFileSync(new URL("../dev/data/book/book.json", import.meta.url)),
);
const font = bookFonts(book, context2D());
for (const body of [null, font]) {
  for (const point of [
    [0, 0],
    [639, 0],
    [0, 359],
    [639, 359],
    [300, 180],
  ]) {
    const menu = layoutMenu(
      { label: "Long target ".repeat(30) },
      verbs,
      point,
      [640, 360],
      body,
    );
    assert(menu.x >= 0 && menu.y >= 0);
    assert(menu.x + menu.width <= 640 && menu.y + menu.height <= 360);
    assert.equal(menuHit(menu, menu.x + 6, menu.y + 4), -1);
    for (let i = 0; i < verbs.length; i++)
      assert.equal(
        menuHit(menu, menu.x + 6, menu.y + menu.listTop + i * menu.rowHeight),
        i,
      );
    assert.equal(menuHit(menu, menu.x - 1, menu.y), -1);
  }
}
const near = layoutMenu({ label: "Lamp" }, verbs, [100, 100], [640, 360]);
assert.equal(near.x, 103);
assert.equal(near.y, 103);
console.log(
  "Target verbs, world ordering, edge placement, font layouts and row hits passed.",
);
