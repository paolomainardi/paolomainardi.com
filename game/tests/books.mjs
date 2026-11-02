import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadFont,
  wrapAtlas,
  measure,
  layoutBook,
  hitEntry,
  parseRoute,
  bookRoute,
  bookItems,
} from "../src/book.js";
const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const book = load("../dev/data/book/book.json");
book.fonts = {
  title: load("../dev/data/book/fonts/title.json"),
  body: load("../dev/data/book/fonts/body.json"),
};
const world = load("../dev/data/world.json");
const items = load("../dev/data/content.json").items;
const topic = {
  ...world.books.workstation,
  items: bookItems(items, world.books.workstation.content),
};
const pages = layoutBook(book, topic);
assert.equal(pages.length, 6, "Placeholder workstation needs three spreads");
assert.deepEqual(
  pages.map((p) => p.number),
  [1, 2, 3, 4, 5, 6],
);
assert.deepEqual(
  pages.flatMap((p) => p.entries.map((e) => e.item.id)),
  topic.items.map((i) => i.id),
);
assert.equal(pages[0].count, "22 posts");
assert(pages.slice(1).every((p) => p.heading.length === 0));
for (const page of pages)
  for (const entry of page.entries) {
    assert(entry.lines.length <= 2);
    assert(
      entry.lines.every((line) => measure(book.fonts.body, line) <= page.width),
    );
    assert(
      entry.y + entry.height <=
        page.y + page.height - book.fonts.body.lineHeight * 2,
    );
    assert.equal(
      hitEntry(pages, Math.floor((page.number - 1) / 2), entry.x, entry.y),
      entry,
    );
    assert.notEqual(
      hitEntry(
        pages,
        Math.floor((page.number - 1) / 2),
        entry.x + entry.width,
        entry.y,
      ),
      entry,
    );
  }
assert.equal(hitEntry(pages, 0, 0, 0), null);
assert(wrapAtlas(book.fonts.body, "word ".repeat(100), 70, 2)[1].endsWith("…"));
assert(
  wrapAtlas(book.fonts.body, "x".repeat(100), 70, 2).every(
    (line) => measure(book.fonts.body, line) <= 70,
  ),
);
assert.deepEqual(wrapAtlas(book.fonts.body, "one two", 100), ["one two"]);
assert.equal(measure(book.fonts.body, "\u2603"), measure(book.fonts.body, "?"));
assert.deepEqual(
  bookItems(
    [
      { id: "a", type: "post", part: 1, date: "2020" },
      { id: "b", type: "post", part: 2, date: "2026" },
    ],
    {},
  ).map((i) => i.id),
  ["b", "a"],
);
assert.deepEqual(
  parseRoute(bookRoute("stone house", "Linux / AI", 2), "start"),
  { room: "stone house", book: "Linux / AI", spread: 2, item: null },
);
assert.equal(parseRoute("#room/book/linux/nope", "start").spread, 0);
assert.equal(parseRoute("#%xx/book/linux/2", "start").room, "start");
assert.equal(parseRoute("#room/post", "start").item, "post");
// Exercise the loader, including relative atlas paths and every invalid alpha value.
const oldFetch = globalThis.fetch,
  oldBitmap = globalThis.createImageBitmap;
let alpha = 0;
const fetched = [];
globalThis.fetch = async (url) => {
  fetched.push(url);
  return {
    ok: true,
    json: async () => ({ image: "atlas.png" }),
    blob: async () => ({}),
  };
};
globalThis.createImageBitmap = async () => ({ width: 1, height: 1 });
const renderer = {
  pixels: () => new Uint8Array([255, 255, 255, alpha]),
  texture: () => ({}),
};
try {
  for (alpha = 0; alpha < 256; alpha++) {
    if ([0, 128, 255].includes(alpha))
      await loadFont("https://test/fonts/body.json", renderer);
    else
      await assert.rejects(
        loadFont("https://test/fonts/body.json", renderer),
        /Font alpha/,
      );
  }
  assert(fetched.includes("https://test/fonts/atlas.png"));
} finally {
  globalThis.fetch = oldFetch;
  globalThis.createImageBitmap = oldBitmap;
}
console.log(
  "Book layout, wrapping, ellipsis, page flow, numbering, hits, routes, ordering, and font loading passed.",
);

const { Renderer } = await import("../src/renderer.js");
const draw = Object.create(Renderer.prototype),
  calls = [],
  uniforms = {};
Object.assign(draw, {
  gl: { disable() {}, enable() {}, blendFunc() {} },
  programs: {},
  scene: { texture: {} },
  size: [640, 360],
  scale: 3,
  black: {},
  lut: {},
  into() {},
  use() {},
  bind() {},
  draw() {},
  uniform(name, value) {
    uniforms[name] = value;
  },
  sprite(...args) {
    calls.push(args);
  },
  rect() {},
  text() {},
});
book.texture = {};
book.turn.texture = {};
book.turn.size = [1952, 274];
for (const font of Object.values(book.fonts)) {
  font.texture = {};
  font.size = [256, 160];
}
const bookGame = {
  bookArt: book,
  activeBook: { pages },
  spread: 0,
  hover: pages[0].entries[0],
  verbTop: 336,
};
draw.render(bookGame);
assert.equal(calls[0][0], book.texture);
assert.equal(uniforms.uBloom, 0, "Book rendering bypasses room bloom");
const accent = [
  ...book.accent
    .slice(1)
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255),
  1,
];
assert(
  calls.some((c) => JSON.stringify(c[4]) === JSON.stringify(accent)),
  "Hovered entry uses accent",
);
assert(
  calls.some((c) => c[0] === book.fonts.title.texture),
  "Heading uses title atlas",
);
assert(
  calls.some((c) => c[0] === book.fonts.body.texture),
  "Entries use body atlas",
);
for (const direction of [1, -1]) {
  calls.length = 0;
  bookGame.turning = { direction, clock: 1 / book.turn.fps };
  draw.render(bookGame);
  const turn = calls.find((c) => c[0] === book.turn.texture);
  assert.equal(turn[3][0], (direction === 1 ? 1 : 2) * 488);
  assert.equal(turn[5], direction < 0);
}
console.log(
  "Atlas text, hover tint, close-up drawing without room lighting, and turn direction passed (mock GPU).",
);
