// Check verb menu behavior against the engine and shipped fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookFonts } from "../src/book.js";
import { context2D } from "./text-fixture.mjs";
import {
  targetVerbs,
  layoutMenu,
  menuHit,
  exitCursor,
} from "../src/verb-menu.js";
const verbs = ["Look at", "Open", "Use", "Take", "Talk to"];
for (const [target, expected] of [
  [{ kind: "hotspot" }, ["Look at"]],
  [{ kind: "hotspot", binding: "content" }, ["Look at", "Take"]],
  [
    { kind: "hotspot", binding: "content", content: {} },
    ["Look at", "Open", "Take"],
  ],
  [{ kind: "light" }, ["Look at", "Use"]],
  [{ kind: "exit" }, ["Look at", "Open", "Use"]],
  [{ kind: "book" }, ["Look at", "Open", "Take"]],
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
for (const body of [font]) {
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
const near = layoutMenu({ label: "Lamp" }, verbs, [100, 100], [640, 360], font);
assert.equal(near.x, 103);
assert.equal(near.y, 103);
console.log(
  "Target verbs, world ordering, edge placement, font layouts and row hits passed.",
);

const newVerbs = ["Open", "Close", "Give", "Take", "Look at", "Talk to", "Use"];
assert.deepEqual(targetVerbs(newVerbs, { kind: "book" }), [
  "Open",
  "Take",
  "Look at",
]);
assert.deepEqual(targetVerbs(newVerbs, { kind: "inventory" }), [
  "Open",
  "Look at",
  "Use",
]);

assert.deepEqual(targetVerbs(verbs, { kind: "hotspot", board: {} }), [
  "Look at",
  "Open",
  "Take",
]);
assert(!targetVerbs(["Close", "Give", "Read"], { kind: "book" }).length);

assert.deepEqual(targetVerbs(verbs, { kind: "hotspot", go: "lighthouse" }), [
  "Look at",
  "Open",
]);
for (const [position, cursor] of [
  [[1, 180], 180],
  [[639, 180], 0],
  [[320, 1], 270],
  [[320, 359], 90],
])
  assert(
    decodeURIComponent(exitCursor({ position }, [640, 360])).includes(
      `rotate(${cursor} 12 12)`,
    ),
  );

for (const id of ["noticeboard", "letter", "logbook", "arbitrary-paper"])
  assert(
    targetVerbs(verbs, { kind: "hotspot", id, binding: "content" }).includes(
      "Take",
    ),
  );

for (const id of ["noticeboard", "letter", "logbook"])
  assert(!targetVerbs(verbs, { kind: "hotspot", id }).includes("Take"));
