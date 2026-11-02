import assert from "node:assert/strict";
import { Renderer } from "../src/renderer.js";

// Exercise render placement without requiring a GPU. Use deliberately different
// dimensions and an off-centre anchor to catch assumptions about the supplied art.
const calls = [],
  uniforms = {};
const renderer = Object.create(Renderer.prototype);
Object.assign(renderer, {
  gl: { disable() {}, enable() {}, blendFunc() {} },
  programs: {},
  scene: {},
  glow: [{ texture: {} }, { texture: {} }, { texture: {} }],
  canvas: { width: 640, height: 360 },
  scale: 1,
  lights() {},
  into() {},
  use() {},
  lighting() {},
  integer() {},
  draw() {},
  bind() {},
  uniform(name, value) {
    uniforms[name] = value;
  },
  sprite(...args) {
    calls.push({ type: "sprite", args });
  },
  rect(...args) {
    calls.push({ type: "rect", args });
  },
  text(...args) {
    calls.push({ type: "text", args });
  },
});
const texture = {};
const game = {
  objects: [],
  room: { size: [640, 360] },
  uiScale: 1,
  character: {
    texture,
    size: [120, 420],
    frame: [24, 60],
    anchor: [5, 58],
    animations: { "walk-side": { row: 6, frames: 5, fps: 10 } },
  },
  actor: { x: 100, y: 150, animation: "walk-side", clock: 0.3, mirror: false },
  depth: () => 0.8,
  nearestLamp: () => null,
  lightAt: () => 0.5,
  lightSourcesAt: () => [],
  bloom: true,
  sentence: () => "Walk to Window",
  verbTop: 336,
  verbScale: 1,
  verb: "Open",
  verbRects: [{ label: "Open", x: 4, y: 170 }],
};
for (const mirror of [false, true]) {
  calls.length = 0;
  game.actor.mirror = mirror;
  renderer.render(game);
  const actor = calls.find((c) => c.type === "sprite" && c.args[0] === texture);
  assert.deepEqual(actor.args[2], [mirror ? 85 : 96, 104, 19, 48]);
  assert.deepEqual(actor.args[3], [72, 360, 24, 60]);
  assert.equal(actor.args[5], mirror);
  assert.deepEqual(
    actor.args[4],
    [0.7, 0.7, 0.7, 1],
    "Unlit sprite keeps 70% of its colours",
  );
  assert.equal(uniforms.uBloom, 1);
  const strips = calls.filter((c) => c.type === "rect");
  assert.equal(strips.length, 1, "No background strip under the sentence");
  assert.deepEqual(strips[0].args.slice(0, 4), [0, 336, 640, 24]);
  assert(strips[0].args[4][3] > 0 && strips[0].args[4][3] < 1);
  const sentence = calls.filter(
    (c) => c.type === "text" && c.args[0] === game.sentence(),
  );
  assert.equal(sentence.length, 9, "Eight outline offsets plus sentence text");
  assert(
    sentence
      .slice(0, 8)
      .every(
        (c) =>
          Math.abs(c.args[1] - 8) <= 4 / 3 + 1e-8 &&
          Math.abs(c.args[2] - 12) <= 4 / 3 + 1e-8,
      ),
  );
}
console.log(
  "Swappable frame, anchor, animation, mirroring, sentence outline, and compact translucent UI passed (mock GPU).",
);

// Each object draws its assigned texture at its own size, bottom-centred on the slot.
game.objects = [
  { position: [200, 100], sprite: { texture: {}, size: [18, 27] } },
  { position: [240, 120], sprite: { texture: {}, size: [30, 40] } },
];
calls.length = 0;
renderer.render(game);
for (const item of game.objects) {
  const draw = calls.find(
    (call) => call.type === "sprite" && call.args[0] === item.sprite.texture,
  );
  assert.deepEqual(draw.args[1], item.sprite.size);
  assert.deepEqual(draw.args[2], [
    item.position[0] - item.sprite.size[0] / 2,
    item.position[1] - item.sprite.size[1] + 4 / 3,
    ...item.sprite.size,
  ]);
}
game.objects = [];

// Long labels use two outlined rows and truncate only when a third is needed.
for (const [text, expected] of [
  [
    "Walk to a book with a title that fits on two lines",
    ["Walk to a book with a title that fits on two lines"],
  ],
  ["word ".repeat(40), ["word ".repeat(21).trim(), "word ".repeat(19)]],
  [
    "word ".repeat(80),
    ["word ".repeat(21).trim(), "word ".repeat(20).trim() + "…"],
  ],
]) {
  const sentence = game.sentence;
  game.sentence = () => text;
  calls.length = 0;
  renderer.render(game);
  const rows = calls.filter(
    (call) => call.type === "text" && call.args[3] === undefined,
  );
  assert.deepEqual(
    rows.map((call) => call.args[0]),
    expected,
  );
  assert.deepEqual(
    rows.map((call) => call.args[2]),
    expected.length === 1 ? [12] : [12, 24],
  );
  assert(rows.every((call) => call.args[1] + call.args[0].length * 6 <= 632));
  game.sentence = sentence;
}

// Ellipsis has its own bitmap cell rather than the unsupported-character glyph.
calls.length = 0;
Renderer.prototype.text.call(renderer, "…", 0, 0);
assert.deepEqual(calls[0].args[3], [90, 40, 6, 8]);

// Non-contract dimensions catch fixed frame assumptions in integer upscaling.
const sizing = Object.create(Renderer.prototype);
Object.assign(sizing, {
  size: [640, 400],
  canvas: { style: {} },
  target: (width, height) => ({ width, height }),
  gl: { deleteTexture() {}, deleteFramebuffer() {} },
});
sizing.resize(1500, 1000);
assert.equal(sizing.canvas.width, 1280);
assert.equal(sizing.canvas.height, 800);
sizing.resize(375, 667);
assert.equal(sizing.canvas.width, 640);
assert.equal(sizing.canvas.style.width, "375px");
assert.equal(sizing.canvas.style.height, "234.375px");

sizing.size = [640, 360];
sizing.resize(1920, 1080);
assert.equal(sizing.scale, 3);
assert.equal(sizing.canvas.width, 1920);
assert.equal(sizing.canvas.height, 1080);
assert.equal(sizing.canvas.style.width, "1920px");
assert.equal(sizing.canvas.style.height, "1080px");

// Room upload dimensions and lamp drawing packing must follow data, including edge pixels.
const uploads = [];
const width = 513,
  height = 287;
const pixels = new Uint8Array(width * height * 4);
pixels[pixels.length - 4] = 123;
const ids = new Int16Array(width * height).fill(-1);
ids[ids.length - 1] = 0;
const upload = Object.create(Renderer.prototype);
Object.assign(upload, {
  gl: {
    createTexture: () => ({}),
    getParameter: () => 256,
    bindTexture() {},
    texParameteri() {},
    texImage3D(...args) {
      uploads.push(args);
    },
  },
  target: (w, h) => ({ width: w, height: h }),
  texture: (_pixels, w, h) => ({ width: w, height: h }),
});
upload.setRoom({
  size: [width, height],
  states: { night: { unlit: {}, lightPixels: { lamp: pixels } } },
  albedo: {},
  foreground: new Uint8Array(width * height * 4),
  items: [{ id: "lamp" }],
  ids,
  lights: [{ id: "lamp", pixels }],
});
assert.deepEqual([upload.scene.width, upload.scene.height], [width, height]);
assert.deepEqual(
  [upload.foreground.width, upload.foreground.height],
  [width, height],
);
assert.deepEqual(uploads[0].slice(3, 6), [width, height, 1]);
assert.equal(uploads[0][9].length, width * height * 4);
assert.deepEqual(Array.from(uploads[0][9].slice(-4)), [123, 0, 0, 0]);
assert.deepEqual(Array.from(uploads[1][9].slice(-4)), [255, 0, 0, 255]);
console.log(
  "Data-driven render sizing, small viewport fitting, and lamp drawing and emission mask edge uploads passed.",
);

// A dark warm source still tints the actor; the strongest pool chooses the rim.
game.lightSourcesAt = () => [
  { position: [10, 50], strength: 0.2, tint: [1, 1, 1] },
  { position: [130, 100], strength: 0.6, tint: [0.2, 0.12, 0.04] },
];
game.bloom = false;
calls.length = 0;
renderer.render(game);
const litActor = calls.find(
  (c) => c.type === "sprite" && c.args[0] === texture,
);
const tint = litActor.args[4];
assert(tint[0] > tint[1] && tint[1] > tint[2]);
assert(tint.slice(0, 3).every((v) => v >= 0.7 && v <= 1));
assert(
  Math.abs(litActor.args[6] - 0.9) < 1e-10,
  "Rim faces the strongest source",
);
assert.equal(uniforms.uBloom, 0, "G comparison removes both halo and core");
console.log(
  "Character brightness floor, warm lighting, strongest rim, and bloom toggle passed (mock GPU).",
);

// Palette dither defaults off and only follows an explicit world opt-in.
for (const dither of [undefined, false, true]) {
  game.world = { dither };
  renderer.render(game);
  assert.equal(uniforms.uDither, dither === true ? 1 : 0);
}
// The flame uses the same sprite cell and mirror in the scene and bloom source.
game.character.glowTexture = {};
calls.length = 0;
renderer.render(game);
const characterCalls = calls.filter(
  (c) => c.type === "sprite" && c.args[0] === texture,
);
assert.equal(characterCalls.length, 2);
assert.deepEqual(
  characterCalls[0].args.slice(1, 4),
  characterCalls[1].args.slice(1, 4),
);
assert.equal(characterCalls[1].args[7].emission, true);
game.character.glowTexture = null;
console.log(
  "Optional palette dither and character flame bloom alignment passed (mock GPU).",
);

// Validate uploaded 64-cube contents against an independent exhaustive OKLab
// reference at grid samples, including endpoints and both palette sizes.
function referenceLab(rgb) {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const { readFileSync } = await import("node:fs");
const paletteColors = JSON.parse(
  readFileSync(new URL("../dev/data/palette.json", import.meta.url)),
);
for (const count of [1, 17, 32, 256]) {
  const colors = paletteColors.slice(0, count).map((c) =>
    c
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16)),
  );
  assert.equal(
    colors.length,
    count,
    "Fixture contains the requested palette size",
  );
  const data = new Uint8Array(colors.flatMap((c) => [...c, 255]));
  let uploaded;
  const paletteRenderer = Object.create(Renderer.prototype);
  Object.assign(paletteRenderer, {
    pixels: () => data,
    gl: {
      createTexture: () => ({}),
      bindTexture() {},
      texParameteri() {},
      texImage3D(...args) {
        uploaded = args;
      },
    },
  });
  const start = performance.now();
  paletteRenderer.palette({ width: count, height: 1 });
  console.log(
    `${count}-colour 64³ lookup build and mock upload: ${(performance.now() - start).toFixed(1)} ms`,
  );
  assert.deepEqual(uploaded.slice(3, 6), [64, 64, 64]);
  const lut = uploaded[9];
  assert.equal(lut.length, 64 ** 3 * 4);
  const allowed = new Set(colors.map((c) => c.join(",")));
  for (let i = 0; i < lut.length; i += 4) {
    assert.equal(lut[i + 3], 255);
    assert(allowed.has(`${lut[i]},${lut[i + 1]},${lut[i + 2]}`));
  }
  const labs = colors.map(referenceLab);
  const samples = [0, 64 ** 3 - 1];
  for (let i = 0; i < 64 ** 3; i += 101) samples.push(i);
  for (const index of samples) {
    const lab = referenceLab(
      [index % 64, Math.floor(index / 64) % 64, Math.floor(index / 4096)].map(
        (v) => (v * 255) / 63,
      ),
    );
    let best = Infinity,
      nearest = 0;
    labs.forEach((p, i) => {
      const d = p.reduce((sum, v, c) => sum + (v - lab[c]) ** 2, 0);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    assert.deepEqual(
      Array.from(lut.slice(index * 4, index * 4 + 3)),
      colors[nearest],
    );
  }
  for (const [width, height] of [
    [0, 1],
    [257, 1],
    [32, 2],
  ]) {
    assert.throws(() => paletteRenderer.palette({ width, height }), /1 to 256/);
  }
}
console.log(
  "Palette sizes, 64³ uploads, palette membership, and exact OKLab reference samples passed.",
);

// Menu draws above the scene with a one-pixel border and shared hover colours.
const menuGame = {
  menu: {
    header: "Lamp",
    verbs: ["Look at", "Use"],
    selected: 1,
    x: 500,
    y: 300,
    width: 90,
    height: 48,
    rowHeight: 12,
  },
};
calls.length = 0;
renderer.renderMenu(menuGame);
assert.deepEqual(calls[0].args.slice(0, 4), [500, 300, 90, 48]);
assert.deepEqual(calls[1].args.slice(0, 4), [501, 301, 88, 46]);
const menuText = calls.filter((call) => call.type === "text");
assert.deepEqual(
  menuText.map((call) => call.args[0]),
  ["Lamp", "Look at", "Use"],
);
assert.notDeepEqual(menuText[1].args[3], menuText[2].args[3]);
const atlasCalls = [];
renderer.atlasText = (...args) => atlasCalls.push(args);
menuGame.bookArt = { fonts: { body: {} }, ink: "#1d202f", accent: "#8a5650" };
renderer.renderMenu(menuGame);
assert(atlasCalls.every((call) => call[0] === menuGame.bookArt.fonts.body));
assert.equal(atlasCalls[1][4], menuGame.bookArt.ink);
assert.equal(atlasCalls[2][4], menuGame.bookArt.accent);
console.log(
  "Menu border, fallback font, body atlas and rose highlight passed (mock GPU).",
);

menuGame.menu.selected = -1;
atlasCalls.length = 0;
renderer.renderMenu(menuGame);
assert(atlasCalls.every((call) => call[4] === menuGame.bookArt.ink));
