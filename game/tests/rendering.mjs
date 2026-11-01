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
  glow: [{ texture: {} }, { texture: {} }],
  canvas: { width: 320, height: 180 },
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
  sentence: () => "Walk to Window",
  verbTop: 168,
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
  const strips = calls.filter((c) => c.type === "rect");
  assert.equal(strips.length, 1, "No background strip under the sentence");
  assert.deepEqual(strips[0].args.slice(0, 4), [0, 168, 320, 12]);
  assert(strips[0].args[4][3] > 0 && strips[0].args[4][3] < 1);
  const sentence = calls.filter(
    (c) => c.type === "text" && c.args[0] === game.sentence(),
  );
  assert.equal(sentence.length, 9, "Eight outline offsets plus sentence text");
  assert(
    sentence
      .slice(0, 8)
      .every(
        (c) => Math.abs(c.args[1] - 4) <= 1 && Math.abs(c.args[2] - 6) <= 1,
      ),
  );
}
console.log(
  "Swappable frame, anchor, animation, mirroring, sentence outline, and compact translucent UI passed (mock GPU).",
);
