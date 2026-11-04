import assert from "node:assert/strict";
import { buildWater, waterFrame, reflectionPeak } from "../src/water.js";
import { Renderer } from "../src/renderer.js";

const size = [20, 12],
  mask = new Uint8Array(20 * 12 * 4);
for (let y = 1; y < 11; y++) {
  for (let x = 1; x < 19; x++) {
    if (x === 9 || (y > 7 && x < 4)) continue;
    mask[(y * 20 + x) * 4] = 255;
    if (x >= 12 && x <= 16) mask[(y * 20 + x) * 4 + 1] = 255;
  }
}
const water = buildWater(mask, size);
const shifts = new Set();
let sparkles = 0,
  horizon = 0,
  near = 0;
for (let tick = 0; tick < 800; tick++) {
  const frame = waterFrame(water, tick / 4).slice();
  assert.deepEqual(
    waterFrame(water, tick / 4 + 0.1),
    frame,
    "Stable between four-Hz ticks",
  );
  for (let i = 0; i < 240; i++) {
    const at = i * 4;
    if (mask[at] !== 255) {
      assert.deepEqual([...frame.slice(at, at + 4)], [0, 0, 0, 0]);
      continue;
    }
    const dx = frame[at] - 2;
    assert(Number.isInteger(dx) && Math.abs(dx) <= 2);
    assert.equal(
      mask[(i + dx) * 4],
      255,
      "Source stays inside red, including holes and coasts",
    );
    assert.equal(Math.floor((i + dx) / 20), Math.floor(i / 20));
    shifts.add(dx);
    if (frame[at + 1]) {
      assert.equal(mask[at + 1], 255, "Glitter stays in green");
      sparkles++;
      if (i < 6 * 20) horizon++;
      else near++;
    }
  }
  assert(
    waterFrame(water, tick / 4, true).every((v) => v === 0),
    "Reduced motion disables both effects",
  );
}
assert.deepEqual([...shifts].sort(), [-1, -2, 0, 1, 2].sort());
assert(sparkles > 0 && sparkles < water.reflection.length * 800 * 0.04);
assert(horizon > near, "Glitter is stronger near the reflection horizon");
const drawing = new Uint8Array(mask.length);
const peakAt = water.reflection[3] * 4;
drawing.set([240, 220, 210, 255], peakAt);
assert.deepEqual(reflectionPeak(water, drawing), [240, 220, 210, 255]);
const empty = buildWater(new Uint8Array(mask.length), size);
assert(waterFrame(empty, 6).every((v) => v === 0));

// Exercise the real renderer wiring, including changes to the media query.
const uniforms = {},
  uploads = [];
const renderer = Object.create(Renderer.prototype);
Object.assign(renderer, {
  gl: {
    activeTexture() {},
    bindTexture() {},
    texSubImage2D(...args) {
      uploads.push(args);
    },
  },
  size,
  water,
  waterTick: null,
  waterTexture: {},
  motionPreference: { matches: false },
  states: { dusk: { reflection: {} } },
  bind() {},
  uniform() {},
  integer(name, value) {
    uniforms[name] = value;
  },
});
const game = {
  actor: { y: 0 },
  time: "dusk",
  elapsed: 2,
  room: { lights: [] },
  lanternPosition: () => [0, 0],
  lanternStrength: () => 0,
};
renderer.lighting(game);
assert.equal(uniforms.uWaterMotion, 1);
assert.equal(uploads.length, 1);
renderer.lighting(game);
assert.equal(uploads.length, 1, "Upload only on water ticks");
renderer.motionPreference.matches = true;
renderer.lighting(game);
assert.equal(uniforms.uWaterMotion, 0);
renderer.water = null;
renderer.motionPreference.matches = false;
renderer.lighting(game);
assert.equal(
  uniforms.uWaterMotion,
  0,
  "Room without water uses unchanged drawing coordinates",
);
assert.equal(uploads.length, 1);
console.log(
  "Water integer swell, bounded sources, sparse masked glitter, painted peaks, reduced motion and optional rooms passed.",
);

// Check optional loading, relative URLs and size validation at the asset boundary.
const { loadRoom } = await import("../src/assets.js");
const fetched = [];
const roomConfig = {
  size,
  items: [],
  objects: "objects.png",
  albedo: "albedo.png",
  states: { dusk: { unlit: "unlit.png", lights: {} } },
  water: "water.png",
};
let wrongSize = false;
globalThis.fetch = async (url) => {
  fetched.push(url);
  return {
    ok: true,
    json: async () => structuredClone(roomConfig),
    blob: async () => url,
  };
};
globalThis.createImageBitmap = async (url) => ({
  width: wrongSize && url.endsWith("water.png") ? 1 : size[0],
  height: size[1],
  data: url.endsWith("water.png") ? mask : new Uint8Array(mask.length),
});
const world = { rooms: { test: { src: "rooms/test/room.json" } } };
const loaded = await loadRoom(
  world,
  "https://example.test/demo/world.json",
  "test",
  { pixels: (image) => image.data },
);
assert.equal(loaded.water.spans.length, water.spans.length);
assert(fetched.includes("https://example.test/demo/rooms/test/water.png"));
wrongSize = true;
await assert.rejects(
  loadRoom(world, "https://example.test/demo/world.json", "test", {
    pixels: (image) => image.data,
  }),
  /images must match/,
);
delete roomConfig.water;
fetched.length = 0;
const dry = await loadRoom(
  world,
  "https://example.test/demo/world.json",
  "test",
  { pixels: (image) => image.data },
);
assert.equal(dry.water, null);
assert(!fetched.some((url) => url.endsWith("water.png")));
console.log(
  "Optional water loading, relative mask URL and room-size validation passed.",
);
