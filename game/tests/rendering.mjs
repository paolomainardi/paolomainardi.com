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
  canvas: { width: 480, height: 270 },
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
  room: { size: [480, 270] },
  uiScale: 2,
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
  verbTop: 252,
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
  assert.deepEqual(strips[0].args.slice(0, 4), [0, 252, 480, 18]);
  assert(strips[0].args[4][3] > 0 && strips[0].args[4][3] < 1);
  const sentence = calls.filter(
    (c) => c.type === "text" && c.args[0] === game.sentence(),
  );
  assert.equal(sentence.length, 9, "Eight outline offsets plus sentence text");
  assert(
    sentence
      .slice(0, 8)
      .every(
        (c) => Math.abs(c.args[1] - 6) <= 2 && Math.abs(c.args[2] - 9) <= 2,
      ),
  );
}
console.log(
  "Swappable frame, anchor, animation, mirroring, sentence outline, and compact translucent UI passed (mock GPU).",
);

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

// Room upload dimensions and pool packing must follow data, including edge pixels.
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
  states: {},
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
assert.deepEqual(Array.from(uploads[0][9].slice(-4)), [123, 255, 0, 255]);
console.log(
  "Data-driven render sizing, small viewport fitting, and pool edge uploads passed.",
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
