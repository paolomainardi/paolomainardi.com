// Check board behavior against the engine and shipped fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  boardItems,
  boardPage,
  boardEntries,
  boardHit,
  boardText,
  noteTakeRect,
} from "../src/board.js";
import { bookFonts, parseRoute } from "../src/book.js";
import { TextLayer } from "../src/text-layer.js";
import { Renderer } from "../src/renderer.js";
import { beacon } from "../src/lighting.js";
import { canvas2D, context2D } from "./text-fixture.mjs";
const load = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const art = load("../dev/data/board/board.json");
art.sprites = Object.fromEntries(
  [art.image, art.pin, art.note.image, ...art.notices.map((n) => n.paper)].map(
    (path) => [
      path,
      {
        texture: { path },
        size:
          path === "paper.png"
            ? [160, 112]
            : path === "pin.png"
              ? [5, 5]
              : [640, 360],
      },
    ],
  ),
);
const fonts = bookFonts(load("../dev/data/book/book.json"), context2D());
const items = Array.from({ length: 14 }, (_, i) => ({
  id: String(i),
  type: "link",
  date: `2026-10-${String(i + 1).padStart(2, "0")}`,
  title: "A long title that must wrap and end with an ellipsis ".repeat(8),
  description:
    "Paolo’s note with enough text to wrap onto several lines. ".repeat(20),
  link: "https://example.com/",
}));
items[0].part = 1;
const board = { id: "links", art, items: boardItems(items, { type: "link" }) };
assert.equal(board.items[0].id, "13", "Date order overrides part");
assert.equal(boardPage(board, -1), 0);
assert.equal(boardPage(board, Infinity), 2);
assert.equal(boardPage({ ...board, items: [] }, Infinity), 0);
assert.equal(boardEntries(board, 2).length, 2);
const entry = boardEntries(board, 0)[0];
assert.equal(boardHit(board, 0, null, ...entry.at), entry.item);
assert.equal(boardHit(board, 0, null, ...art.newer), null);
assert.equal(boardHit(board, 0, null, ...art.older), "older");
assert.equal(boardHit(board, 2, null, ...art.older), null);
assert.equal(boardHit(board, 2, null, ...art.newer), "newer");
assert.equal(boardHit(board, 0, entry.item, ...art.note.go), "go");
assert.equal(boardHit(board, 0, entry.item, ...art.note.back), "back");
assert.equal(parseRoute("#harbour/board/links/2", "start").board, "links");
assert.equal(parseRoute("#harbour/board/links/2", "start").spread, 2);
assert.equal(parseRoute("#harbour/board/links/2", "start").item, null);
const lines = boardText(board, 0, null, null, fonts);
const lifted = boardText(board, 0, null, entry.item, fonts);
for (const line of lines) assert(line.font.measure(line.value) <= 144);
assert(lines.some((l) => l.value.endsWith("…")));
assert.equal(lifted[0].y, lines[0].y - 1);
assert.equal(lifted[0].color, art.accent);
const note = boardText(board, 0, entry.item, "go", fonts);
assert(note.some((l) => l.value.includes("Paolo")));
assert(note.some((l) => l.value === "Go there" && l.color === art.accent));
assert(note.every((l) => l.y + l.font.lineHeight <= art.note.go[1] + 18));
const canvas = canvas2D(),
  layer = new TextLayer(canvas);
const game = {
  room: { size: [640, 360] },
  activeBoard: board,
  boardPage: 0,
  boardNote: null,
  bookArt: { fonts },
  elapsed: 1,
};
assert(layer.update(game));
assert(!layer.update(game));
game.boardPage = 1;
assert(layer.update(game));
game.boardNote = entry.item;
assert(layer.update(game));
assert(canvas.getContext().calls.some((c) => c.args[0].includes("Paolo")));
const draws = [],
  texts = [];
const renderer = Object.create(Renderer.prototype);
Object.assign(renderer, {
  size: [640, 360],
  scale: 1,
  scene: { texture: {} },
  gl: { disable() {}, enable() {}, blendFunc() {} },
  programs: {},
  into() {},
  use() {},
  bind() {},
  uniform() {},
  draw() {},
  compositeText() {},
  soundLabel() {},
  sprite(...args) {
    draws.push(args);
  },
  rect() {},
  text(...args) {
    texts.push(args);
  },
});
game.boardPage = 0;
game.boardNote = null;
game.hover = entry.item;
renderer.renderBoard(game);
const paper = draws.find((d) => d[0] === art.sprites[entry.paper].texture);
assert.equal(paper[2][1], entry.at[1] - 1);
assert(paper[4].slice(0, 3).some((c) => c < 1));
game.boardNote = entry.item;
draws.length = 0;
renderer.renderBoard(game);
assert(draws.some((d) => d[0] === art.sprites[art.note.image].texture));
for (const message of [null, "Opening the link…"]) {
  texts.length = 0;
  game.sentenceNotice = message;
  game.speechUntil = 3;
  renderer.renderFooter(game);
  assert.equal(texts.length, 2, "Close and one hint or message");
  assert.equal(texts[1][0], message || "or right click, Esc");
  assert(texts[0][1] + texts[0][0].length * 6 <= texts[1][1]);
  assert(
    texts[1][1] + texts[1][0].length * 6 < 566,
    "Message leaves sound control space",
  );
}
for (const time of [0, 1, 2, 3, 4, 5, 6, 9, 10]) assert.equal(beacon(time), 0);
assert(Math.abs(beacon(4.5) - 1) < 1e-12);
assert(Math.abs(beacon(4.25) - beacon(4.75)) < 1e-12);
assert(beacon(4.1) < beacon(4.2) && beacon(4.8) > beacon(4.9));
assert.equal(beacon(9.5), beacon(4.5));
console.log(
  "Board date order, paging, bounds, title truncation, note text, hover lift and tint, text caching, routes, footer replacement and beacon timing passed.",
);

const take = noteTakeRect(art);
assert(take[0] >= art.note.go[0] + art.note.go[2]);
assert(take[0] + take[2] <= art.note.back[0]);
assert.equal(boardHit(board, 0, entry.item, ...take), "take");
assert.equal(boardHit(board, 0, entry.item, ...take.slice(0, 2), false), null);
const custom = { ...art, note: { ...art.note, take: [300, 280, 60, 14] } };
assert.deepEqual(noteTakeRect(custom), custom.note.take);
assert.equal(
  boardHit({ ...board, art: custom }, 0, entry.item, 301, 281),
  "take",
);
assert(note.some((line) => line.value === "Take it"));
const blank = boardText(
  board,
  0,
  {
    ...entry.item,
    title: "Blank",
    description: undefined,
    link: "https://zenodo.org/records/123",
  },
  null,
  fonts,
);
const host = blank.find((line) => line.value === "zenodo.org");
assert.equal(host.color, art.faded);
assert.equal(
  host.y,
  blank.find((line) => line.value === entry.item.date).y +
    fonts.label.lineHeight,
);
assert.equal(
  blank
    .filter(
      (line) =>
        line.font === fonts.body &&
        !["Go there", "Take it", "Back"].includes(line.value),
    )
    .map((line) => line.value)
    .join(" "),
  "No note on this one. Worth a look.",
);
assert(
  blank
    .filter((line) => line.value.includes("No note"))
    .every((line) => line.color === art.faded),
);
assert(
  !boardText(board, 0, entry.item, null, fonts, false).some(
    (line) => line.value === "Take it",
  ),
);

for (const custom of [null, [80, 4, 480, 60]]) {
  const titled = {
    ...board,
    title: "Links",
    subtitle:
      "Things I read and think are worth your time, with a line or two on why.",
    art: { ...art, ...(custom ? { title: custom } : {}) },
  };
  const heading = boardText(titled, 0, null, null, fonts).filter(
    (line) => line.y < art.notices[0].at[1],
  );
  assert.equal(heading[0].value, "Links");
  assert.equal(heading[0].font, fonts.title);
  assert.equal(heading[0].color, art.ink);
  assert(heading.length >= 2 && heading.length <= 3);
  for (const line of heading.slice(1)) {
    assert.equal(line.font, fonts.body);
    assert.equal(line.color, art.faded);
  }
  const rect = custom || [60, 0, 520, 68];
  for (const line of heading) {
    assert(
      Math.abs(
        line.x + line.font.measure(line.value) / 2 - (rect[0] + rect[2] / 2),
      ) <= 1,
    );
    assert(line.y >= rect[1]);
    assert(line.y + line.font.lineHeight <= rect[1] + rect[3]);
  }
  assert(
    !boardText(titled, 0, entry.item, null, fonts).some(
      (line) => line.value === "Links",
    ),
  );
}

for (const path of [
  "/links/",
  "/posts/manage-dotfiles-with-yadm/#series",
  "/" + "long/".repeat(100),
]) {
  game.activeBoard = { ...board, site: path };
  game.soundRect = { x: 566 };
  for (const hover of [false, true]) {
    game.siteHover = hover;
    texts.length = 0;
    renderer.renderFooter(game);
    const site = texts.find((line) => line[1] + line[0].length * 6 === 558);
    assert(site, "Site path ends before sound with an eight pixel gap");
    assert.deepEqual(
      site[3],
      hover ? [0.9, 0.64, 0.7, 1] : [0.55, 0.51, 0.47, 1],
    );
    const sentence = texts.at(-1);
    assert(sentence[1] + sentence[0].length * 6 < site[1]);
    assert(texts[0][1] + texts[0][0].length * 6 < sentence[1]);
    if (hover) assert(sentence[0].startsWith("Open"));
  }
}

const pocket = boardText(board, 0, entry.item, "take", fonts, false);
assert(
  pocket.some(
    (line) => line.value === "In your pocket" && line.color === art.faded,
  ),
);
game.inventory = [];
game.boardNote = entry.item;
layer.update(game);
game.inventory.push({ note: entry.item });
assert(layer.update(game), "Taking a notice invalidates the text cache");
assert(canvas.getContext().calls.some((c) => c.args[0] === "In your pocket"));
for (const mode of ["activeBook", "activeBoard", "readerItem"]) {
  const view = {
    room: { size: [640, 360] },
    [mode]: { site: "/links/" },
    readerSite: mode === "readerItem" ? "/about/" : null,
    speech: "I'll keep this one.",
    speechUntil: 4,
    elapsed: 1,
  };
  texts.length = 0;
  renderer.renderFooter(view);
  assert(texts.some((row) => row[0] === view.speech));
  assert(!texts.some((row) => row[0] === "or right click, Esc"));
  const sorted = texts.toSorted((a, b) => a[1] - b[1]);
  for (let i = 1; i < sorted.length; i++)
    assert(sorted[i - 1][1] + sorted[i - 1][0].length * 6 < sorted[i][1]);
  view.elapsed = 5;
  texts.length = 0;
  renderer.renderFooter(view);
  assert(texts.some((row) => row[0] === "or right click, Esc"));
}
