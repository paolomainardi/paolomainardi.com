// Subtitle metrics, placement, outline and text texture invalidation.
import assert from "node:assert/strict";
import { speechLines, speechLayout } from "../src/speech.js";
import { bookFonts } from "../src/book.js";
import { TextLayer } from "../src/text-layer.js";
import { canvas2D, context2D } from "./text-fixture.mjs";
const fonts = bookFonts(
  { font: { family: "NF-Pixels" }, sizes: { body: 10 } },
  context2D(),
);
const font = fonts.body;
for (const value of [
  "Hello, island!",
  "A long thought about the harbour and the lamps in the quiet town.",
  "Wide WWW words and iii narrow words. ".repeat(10),
]) {
  const lines = speechLines(font, value);
  assert.equal(lines.join(" "), value.trim());
  assert(lines.every((line) => line.length <= 34 && font.measure(line) <= 200));
}
assert.deepEqual(speechLines(font, ""), []);
assert(
  speechLines(font, "W".repeat(100)).every((line) => font.measure(line) <= 200),
);
const balanced = speechLines(font, "one two three four five six seven");
assert.equal(balanced.length, 1);
const two = speechLines(font, "one two three four five six seven eight nine");
assert.equal(two.length, 2);
assert(Math.abs(font.measure(two[0]) - font.measure(two[1])) < 40);
const game = {
  soundRect: { y: 328 },
  world: {},
  bookArt: { fonts },
  speech: "Hello, island!",
  speechLines: ["Hello, island!"],
  speechUntil: 4,
  elapsed: 0,
  room: { size: [640, 360], depth: { far: [0, 1], near: [360, 1] } },
  character: { anchor: [10, 60] },
  actor: { x: 320, y: 220 },
  verbTop: 324,
};
let layout = speechLayout(game);
assert.equal(
  layout.top + layout.height,
  155,
  "Block ends five pixels above head",
);
assert.equal(layout.rows[0].x, Math.round(320 - font.measure(game.speech) / 2));
game.actor.y = 62;
assert.equal(speechLayout(game).top, 7, "Near top, speech goes below head");
for (const x of [0, 639])
  for (const y of [0, 359]) {
    game.actor = { x, y };
    layout = speechLayout(game);
    assert(
      layout.rows.every(
        (row) => row.x >= 1 && row.x + font.measure(row.line) <= 639,
      ),
    );
    assert(layout.top >= 1 && layout.top + layout.height <= 323);
  }
game.room.map = true;
assert.equal(
  speechLayout(game).rows[0].x,
  Math.round(320 - font.measure(game.speech) / 2),
);
game.room.map = false;
game.actor = { x: 320, y: 220 };
const canvas = canvas2D(),
  layer = new TextLayer(canvas),
  ctx = layer.context;
assert(layer.update(game));
assert(!layer.update(game), "Unchanged speech reuses texture");
const glyphs = ctx.calls.filter((call) => call.type === "text");
assert.equal(
  glyphs.length,
  9,
  "Eight outline offsets plus the original glyphs",
);
const core = glyphs.at(-1);
assert.equal(core.args[0], "Hello, island!");
assert.equal(core.font, '10px "NF-Pixels"');
assert.equal(core.color, "#feeab3");
assert.deepEqual(
  new Set(
    glyphs
      .slice(0, 8)
      .map(
        (call) =>
          `${call.args[1] - core.args[1]},${call.args[2] - core.args[2]}`,
      ),
  ),
  new Set(["-1,-1", "0,-1", "1,-1", "-1,0", "1,0", "-1,1", "0,1", "1,1"]),
);
assert(glyphs.slice(0, 8).every((call) => call.color === "#1e1b17"));
assert(!ctx.calls.some((call) => call.type === "rect"), "No subtitle box");
assert(
  [...ctx.pixels.data]
    .filter((_, i) => i % 4 === 3)
    .every((a) => a === 0 || a === 255),
);
game.world.speech = "#ffffff";
assert(layer.update(game));
assert.equal(ctx.calls.at(-1).color, "#ffffff");
game.actor.x++;
assert(layer.update(game), "Speech follows movement");
for (const mode of [
  "activeBook",
  "activeBoard",
  "readerItem",
  "inventoryNote",
]) {
  const view = { ...game, [mode]: {} };
  const footer = speechLayout(view);
  assert(footer.footer);
  assert.equal(footer.rows[0].x, 68);
  assert(footer.top > 300);
}
const siteSpeech = speechLayout({
  ...game,
  readerItem: {},
  readerSite: "/a-long-section-path/",
  speech: "A long message in the reader that must wrap before the site link.",
});
assert(
  siteSpeech.rows.every((row) => font.measure(row.line) <= siteSpeech.width),
);
game.elapsed = 5;
assert(layer.update(game), "Expiry clears cached speech");
assert.equal(speechLayout(game), null);
console.log(
  "Balanced subtitles, head placement, clamping, outline, case, colour, alpha and cache passed.",
);

// A single opaque glyph pixel isolates the eight outline pixels from font metrics.
const pixels = { data: new Uint8ClampedArray(640 * 360 * 4) };
const pixelContext = context2D();
pixelContext.fillText = function (value, x, y) {
  const i = (y * 640 + x) * 4;
  pixels.data.set(
    [
      ...this.fillStyle
        .slice(1)
        .match(/../g)
        .map((c) => parseInt(c, 16)),
      255,
    ],
    i,
  );
};
pixelContext.getImageData = () => pixels;
pixelContext.putImageData = () => {};
const pixelLayer = new TextLayer({ getContext: () => pixelContext });
game.elapsed = 0;
game.world.speech = "#feeab3";
pixelLayer.update(game);
const row = speechLayout(game).rows[0];
const baseline = row.y + font.ascent;
let painted = 0;
for (let y = 0; y < 360; y++)
  for (let x = 0; x < 640; x++) {
    const rgba = [
      ...pixels.data.slice((y * 640 + x) * 4, (y * 640 + x) * 4 + 4),
    ];
    if (Math.abs(x - row.x) <= 1 && Math.abs(y - baseline) <= 1) {
      assert.deepEqual(
        rgba,
        x === row.x && y === baseline
          ? [254, 234, 179, 255]
          : [30, 27, 23, 255],
      );
      painted++;
    } else
      assert.equal(
        rgba[3],
        0,
        "Pixels outside glyph and outline remain transparent",
      );
  }
assert.equal(painted, 9);
console.log(
  "Outline pixels and transparent subtitle background passed (mock glyph raster).",
);
