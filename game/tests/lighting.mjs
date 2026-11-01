import assert from "node:assert/strict";
import { flame, falloff, lightSourcesAt } from "../src/lighting.js";

for (let t = 0; t < 60; t += 0.01) {
  assert(flame(t) >= 0.85 && flame(t) <= 1);
  assert(Math.abs(flame(t + 0.01) - flame(t)) < 0.01);
}
assert(new Set(Array.from({ length: 20 }, (_, i) => flame(i / 4))).size > 15);
assert.equal(falloff(0, 0, [0, 0], 90), 1);
assert.equal(falloff(45, 0, [0, 0], 90), 0.5);
assert.equal(falloff(90, 0, [0, 0], 90), 0);
assert.equal(falloff(100, 0, [0, 0], 90), 0);
assert(falloff(89, 0, [0, 0], 90) < 0.001);

// Separate coloured drawings have different brightness at the actor's feet.
// The expected middle-grey value is the standard sRGB-to-linear conversion.
const state = {
  unlitPixels: new Uint8Array([128, 128, 128, 255]),
  lightPixels: {
    red: new Uint8Array([255, 128, 128, 255]),
    blue: new Uint8Array([128, 128, 255, 255]),
  },
};
const game = {
  time: "night",
  room: {
    size: [1, 1],
    states: { night: state },
    lights: [
      { id: "red", position: [0, 0], drift: [0, 0], strength: 0.5 },
      { id: "blue", position: [1, 0], drift: [0, 0], strength: 1 },
    ],
  },
  lanternPosition: () => [0, 0],
  lanternRadius: 90,
  lanternStrength: () => 0,
};
let sources = lightSourcesAt(game, 0, 0);
const delta = 1 - 0.21586050011389926;
assert(Math.abs(sources[0].strength - delta * 0.5) < 1e-12);
assert(Math.abs(sources[1].strength - delta) < 1e-12);
assert.deepEqual(sources[0].tint.slice(1), [0, 0]);
assert.equal(sources[1].tint[0], 0);
game.room.lights[1].strength = 0;
sources = lightSourcesAt(game, 0, 0);
assert.equal(sources[1].strength, 0);
assert.equal(sources[0].strength, delta * 0.5);
game.lanternStrength = () => 0.9;
assert.equal(lightSourcesAt(game, 45, 0)[2].strength, 0.45);
assert.equal(lightSourcesAt(game, 90, 0)[2].strength, 0);
console.log(
  "Independent lamp drawings, linear brightness, fades, flame range, and smooth lantern falloff passed.",
);
