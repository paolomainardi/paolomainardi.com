import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  bookFonts,
  loadFonts,
  wrapText,
  measure,
  layoutBook,
  hitEntry,
  parseRoute,
  bookRoute,
  bookItems,
  cornerHit,
  dragPage,
  movePage,
  releasePage,
} from "../src/book.js";
import { TextLayer } from "../src/text-layer.js";
import { Renderer } from "../src/renderer.js";
import { layoutMenu } from "../src/verb-menu.js";
import { context2D, canvas2D } from "./text-fixture.mjs";
const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const book = load("../dev/data/book/book.json");
const ctx = context2D();
book.fonts = bookFonts(book, ctx);
const world = load("../dev/data/world.json");
const items = load("../dev/data/content.json").items;
const topic = {
  ...world.books.workstation,
  items: bookItems(items, world.books.workstation.content),
};
const pages = layoutBook(book, topic);
assert.equal(pages.length % 2, 0);
assert.equal(book.fonts.body.lineHeight, 13);
assert.equal(book.fonts.label.lineHeight, 13);
assert.equal(book.fonts.title.css, '20px "NF-Pixels"');
assert.deepEqual(
  pages.flatMap((p) => p.entries.map((e) => e.item.id)),
  topic.items.map((i) => i.id),
);
assert.equal(pages[0].count, "22 posts");
for (const page of pages) {
  for (const entry of page.entries) {
    assert(entry.lines.length <= 2);
    assert([entry.x, entry.y, entry.height].every(Number.isInteger));
    const previous = page.entries[page.entries.indexOf(entry) - 1];
    if (previous) assert.equal(entry.y - previous.y - previous.height, 7);
    assert(
      entry.lines.every((line) => measure(book.fonts.body, line) <= page.width),
    );
    assert(
      entry.y + entry.height <=
        page.y + page.height - book.fonts.label.lineHeight,
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
  const next = pages.slice(page.number).flatMap((p) => p.entries)[0];
  if (next && page.entries.length) {
    const last = page.entries.at(-1);
    const height =
      wrapText(book.fonts.body, next.item.title, page.width, 2).length *
        book.fonts.body.lineHeight +
      book.fonts.label.lineHeight;
    assert(
      last.y +
        last.height +
        Math.round(book.fonts.body.lineHeight / 2) +
        height >
        page.y + page.height - book.fonts.label.lineHeight,
      "Page leaves no room for the next entry",
    );
  }
}
assert(wrapText(book.fonts.body, "word ".repeat(100), 70, 2)[1].endsWith("…"));
assert(
  wrapText(book.fonts.body, "x".repeat(100), 70, 2).every(
    (line) => measure(book.fonts.body, line) <= 70,
  ),
);
assert(measure(book.fonts.body, "WWW") > measure(book.fonts.body, "iii"));
assert.deepEqual(
  parseRoute(bookRoute("stone house", "Linux / AI", 2), "start"),
  { room: "stone house", board: null, book: "Linux / AI", spread: 2, item: null },
);
assert.equal(parseRoute("#%xx/book/linux/2", "start").room, "start");
assert.equal(parseRoute("#room/book/linux/nope", "start").spread, 0);
assert.equal(parseRoute("#room/post", "start").item, "post");
assert.deepEqual(
  bookItems(
    [
      { type: "post", date: "2020", id: "a" },
      { type: "post", date: "2026", id: "b" },
    ],
    {},
  ).map((i) => i.id),
  ["b", "a"],
);
const loaded = [];
globalThis.FontFace = class {
  constructor(...args) {
    this.args = args;
  }
  async load() {
    loaded.push(this);
  }
};
globalThis.document = { fonts: { add() {} } };
await loadFonts(book, "https://test/book/book.json");
assert.equal(loaded.length, 1);
assert(
  loaded[0].args[1].includes("https://test/book/fonts/NFPixels-Regular.ttf"),
);
assert.equal(loaded[0].args[0], "NF-Pixels");
delete globalThis.FontFace;
delete globalThis.document;
for (const direction of [-1, 1]) {
  const spread = direction < 0 ? 1 : 0;
  const [x, y, w, h] = book.pages[direction < 0 ? 0 : 1];
  const [cx, cy, cw, ch] = book.curl.rects[direction < 0 ? 0 : 1];
  const edge = direction < 0 ? cx : cx + cw - 1;
  const cornerY = cy + ch - 1;
  assert.equal(cornerHit(book, spread, 6, edge, cornerY), direction);
  assert.equal(cornerHit(book, direction < 0 ? 0 : 2, 6, edge, cornerY), 0);
  for (const progress of [0.25, 0.5, 0.75]) {
    const turn = dragPage(book, spread, 6, edge, cornerY);
    movePage(turn, edge - direction * turn.distance * progress);
    assert.equal(turn.progress, progress);
    assert.equal(releasePage(turn), progress > 0.5);
  }
  const click = dragPage(book, spread, 6, edge, cornerY);
  assert.equal(releasePage(click), true);
  const cancel = dragPage(book, spread, 6, edge, cornerY);
  movePage(cancel, edge - direction * w);
  assert.equal(releasePage(cancel, true), false);
  const outer = dragPage(
    book,
    spread,
    6,
    direction < 0 ? x + 8 : x + w - 8,
    y + 20,
  );
  assert(outer);
  assert.equal(releasePage(outer), false);
}
assert.equal(dragPage(book, 0, 6, 320, 100), null);
const canvas = canvas2D(),
  layer = new TextLayer(canvas);
const game = {
  bookArt: book,
  activeBook: { pages },
  room: { size: [640, 360] },
  spread: 0,
  hover: null,
  menu: null,
};
assert(layer.update(game));
assert.equal(layer.update(game), false);
assert(
  canvas
    .getContext()
    .calls.filter((c) => c.type === "text")
    .every((c) => c.args.slice(1).every(Number.isInteger)),
);
game.hover = pages[0].entries[0];
assert(layer.update(game));
assert(canvas.getContext().calls.some((c) => c.color === book.accent));
game.spread = 1;
assert(layer.update(game));
assert.equal(layer.update(game), false);
assert.deepEqual([canvas.width, canvas.height], [640, 360]);
assert.deepEqual(
  Array.from(canvas.getContext().pixels.data).filter((_, i) => i % 4 === 3),
  [0, 0, 255, 255],
);
game.menu = layoutMenu(
  { label: "Target heading" },
  ["Look at", "Open"],
  [100, 100],
  [640, 360],
  book.fonts,
);
game.activeBook = null;
canvas.getContext().calls.length = 0;
assert(layer.update(game));
const calls = canvas.getContext().calls;
assert.equal(calls[0].font, '10px "NF-Pixels"');
assert.equal(calls[0].color, book.faded);
assert.equal(calls[0].args[0], "Target heading");
assert.equal(calls[1].type, "rect");
assert.equal(calls[1].args[3], 1);
assert.equal(calls[2].font, calls[0].font);
assert.equal(calls[2].color, book.ink);
assert(
  calls
    .filter((c) => c.type === "text")
    .every((c) => c.args.slice(1).every(Number.isInteger)),
);
game.menu.selected = 1;
assert(layer.update(game));
assert.equal(layer.update(game), false);
game.menu = null;
assert(layer.update(game));

const draw = Object.create(Renderer.prototype),
  sprites = [],
  order = [];
Object.assign(draw, {
  gl: { disable() {}, enable() {}, blendFunc() {} },
  programs: {},
  scene: { texture: {} },
  size: [640, 360],
  scale: 3,
  black: {},
  lut: {},
  into(target) {
    this.target = target;
  },
  use() {},
  bind() {},
  uniform() {},
  draw() {
    order.push("present");
  },
  sprite(...args) {
    sprites.push(args);
  },
  rect() {},
  text() {},
  compositeText() {
    assert.equal(this.target, this.scene);
    order.push("text");
  },
});
book.turn.texture = {};
book.turn.size = [1952, 274];
book.curl.texture = {};
book.curl.size = [48, 24];
game.activeBook = { pages };
game.verbTop = 336;
for (const direction of [1, -1]) {
  game.turning = { direction, progress: 0.3 };
  sprites.length = 0;
  draw.renderBook(game);
  const turn = sprites.find((c) => c[0] === book.turn.texture);
  assert.equal(turn[3][0], 488);
  assert.equal(turn[5], direction < 0);
  assert.deepEqual(order.slice(-2), ["text", "present"]);
}
game.turning = null;
game.corner = 1;
sprites.length = 0;
draw.renderBook(game);
assert(sprites.some((c) => c[0] === book.curl.texture));
console.log(
  "Book metrics, full pages, font loading, text caching, menu heading, corners, drag commit, fallback and composition passed.",
);

// Real compositor uploads only changed text, while turn masks follow every frame.
let uploads = 0;
const gpu = Object.create(Renderer.prototype);
Object.assign(gpu, {
  textLayer: new TextLayer(canvas2D()),
  canvas: { width: 1920, height: 1080 },
  size: [640, 360],
  programs: { text: {} },
  black: {},
  gl: {
    enable() {},
    disable() {},
    blendFunc() {},
    bindTexture() {},
    texImage2D() {
      uploads++;
    },
  },
  texture() {
    uploads++;
    return {};
  },
  use() {},
  bind() {},
  integer() {},
  uniform() {},
  draw() {},
});
game.hover = null;
game.spread = 0;
game.corner = 0;
gpu.compositeText(game);
gpu.compositeText(game);
assert.equal(uploads, 1);
gpu.canvas.width = 1280;
gpu.canvas.height = 720;
gpu.compositeText(game);
assert.equal(
  uploads,
  1,
  "Screen resizing keeps the same game-grid text texture",
);
game.turning = { progress: 0.2, direction: 1 };
gpu.compositeText(game);
game.turning.progress = 0.8;
gpu.compositeText(game);
assert.equal(uploads, 1, "Moving leaf masks text without redrawing it");
game.spread = 1;
gpu.compositeText(game);
assert.equal(uploads, 2);

const linksTopic = {
  ...world.books.links,
  items: bookItems(items, world.books.links.content),
};
assert.equal(linksTopic.items.length, 2);
assert(linksTopic.items.every((item) => item.type === "link"));
assert.equal(layoutBook(book, linksTopic)[0].count, "2 links");
