import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createActor,
  advanceActors,
  petActor,
  petHearts,
  validateActors,
  validateActorSheet,
} from "../src/actors.js";
import { animationFrame } from "../src/animation.js";
import { targetVerbs } from "../src/verb-menu.js";
import { validatePocket } from "../src/inventory.js";

// Rest and meow timings are random; fix them so timing assertions are stable.
Math.random = () => 0;
import { SoundEngine } from "../src/sound.js";
import { AudioContext } from "./audio-fixture.mjs";
const world = JSON.parse(
  readFileSync(new URL("../dev/data/world.json", import.meta.url)),
);
const config = world.rooms.harbour.actors[0];
const sheet = JSON.parse(
  readFileSync(new URL("../dev/data/cat/cat.json", import.meta.url)),
);
const room = {
  items: [],
  size: [640, 360],
  walkable: new Uint8Array(640 * 360).fill(1),
  depth: { far: [0, 0.5], near: [360, 0.5] },
};
validateActors([config], world, room);
validateActorSheet(sheet, { width: 192, height: 128 });
for (const patch of [
  { speed: 0 },
  { speed: NaN },
  { sit: [9, 4] },
  { sit: [0, 1] },
  { path: [] },
  {
    path: [
      [1, -1],
      [2, 3],
    ],
  },
  { look: "missing" },
  { sound: "missing" },
  { id: "" },
  {
    path: [
      [1, 325],
      [2, 325],
    ],
  },
])
  assert.throws(() => validateActors([{ ...config, ...patch }], world, room));
assert.throws(() => validateActors({}, world, room));
assert.throws(() => validateActors([config, config], world, room));
// A feed names a held pocket item, a visitor voice and the actor's answer.
const held = {
  id: "treats",
  label: "Treats",
  icon: "t.png",
  look: "pocket-map",
};
const fedWorld = { ...world, pocket: [...world.pocket, held] };
const feed = {
  item: "treats",
  say: "harbour-cat",
  meow: "Mrrp.",
  words: "Fish.",
};
validatePocket(fedWorld);
validateActors([{ ...config, feed }], fedWorld, room);
validateActors(
  [{ ...config, feed: { ...feed, sound: "purr" } }],
  fedWorld,
  room,
);
for (const patch of [
  { item: "map" },
  { item: "missing" },
  { say: "missing" },
  { meow: "" },
  { words: " " },
  { sound: "missing" },
])
  assert.throws(() =>
    validateActors(
      [{ ...config, feed: { ...feed, ...patch } }],
      fedWorld,
      room,
    ),
  );
assert.throws(() => validateActors([{ ...config, feed }], world, room));
for (const pocket of [
  {},
  [held, held],
  [{ ...held, to: "missing" }],
  [{ ...held, use: "missing" }],
  [{ ...held, look: "missing" }],
  [{ ...held, icon: "" }],
])
  assert.throws(() => validatePocket({ ...world, pocket }));
for (const patch of [
  { frame: [0, 3] },
  { anchor: [-1, 3] },
  { animations: { ...sheet.animations, pet: { row: 9, frames: 1, fps: 1 } } },
  {
    animations: {
      ...sheet.animations,
      "walk-side": { row: 0, frames: 4, fps: 5 },
    },
  },
])
  assert.throws(() =>
    validateActorSheet({ ...sheet, ...patch }, { width: 192, height: 128 }),
  );
const actor = createActor(
  {
    ...config,
    path: [
      [100, 280],
      [110, 280],
      [120, 280],
    ],
    sit: [1, 2],
  },
  sheet,
);
const meows = [];
const game = {
  room,
  actors: [actor],
  sound: {
    effects: "effects",
    play: (...args) => {
      meows.push(args);
      return Promise.resolve({ pan: { pan: { value: 0 } } });
    },
  },
};
// A wandering cat meows now and then, and only when it has a meow sound.
actor.meow = "meow";
actor.nextMeow = 0.05;
advanceActors(game, 0.1);
assert.deepEqual(meows, [["meow", "effects"]]);
assert(actor.nextMeow >= 15, "the next meow waits a while");
actor.nextMeow = 1e9;
advanceActors(game, 0.5);
assert.equal(actor.x, 100);
assert.equal(actor.animation, "sit");
advanceActors(game, 0.6);
advanceActors(game, 0.25);
assert.equal(actor.x, 103.5);
assert.equal(actor.animation, "walk-side");
assert.equal(actor.walkPhase, 3.5 / (36 * 0.5));
assert.equal(animationFrame(actor, sheet.animations["walk-side"]), 0);
for (let i = 0; i < 10; i++) advanceActors(game, 0.1);
assert.equal(actor.x, 110);
assert(actor.rest > 0 && actor.rest <= 2);
let returned = false;
for (let i = 0; i < 100; i++) {
  advanceActors(game, 0.1);
  if (actor.mirror) returned = true;
}
assert(actor.x >= 100 && actor.x <= 120);
assert(returned, "Returns along path");
for (const key of ["activeBook", "activeBoard", "readerItem", "hidden"]) {
  game[key] = {};
  const before = JSON.stringify(actor);
  advanceActors(game, 10);
  assert.equal(JSON.stringify(actor), before);
  game[key] = null;
}
const x = actor.x;
advanceActors(game, 10, true);
assert.equal(actor.x, x);
assert.equal(actor.animation, "sit");
const resting = createActor(config, sheet);
const restingGame = { room, actors: [resting] };
let idleGesture = false;
const idleFrames = new Set();
for (let i = 0; i < 39; i++) {
  advanceActors(restingGame, 0.1);
  idleGesture ||= resting.animation === "idle";
  if (resting.animation === "idle")
    idleFrames.add(animationFrame(resting, sheet.animations.idle));
}
assert(idleGesture, "An idle gesture plays during a long rest");
assert(
  idleFrames.size > 1,
  "Idle gestures advance through their animation cells",
);
const disconnected = new Uint8Array(640 * 360);
disconnected[288 * 640 + 330] = 1;
disconnected[292 * 640 + 440] = 1;
assert.throws(() =>
  validateActors(
    [
      {
        ...config,
        path: [
          [330, 288],
          [440, 292],
        ],
      },
    ],
    world,
    { ...room, walkable: disconnected },
  ),
);
const events = [],
  voices = [];
petActor(
  actor,
  { effects: "effects", play: (...args) => events.push(args) },
  (...args) => voices.push(args),
);
assert.equal(actor.animation, "pet");
assert.equal(actor.petting, 3);
// The cat turns towards the visitor on both sides.
for (const [visitorX, mirror] of [
  [actor.x - 40, true],
  [actor.x + 40, false],
]) {
  const turning = { ...actor, petting: 0 };
  petActor(
    turning,
    { effects: "effects", play() {} },
    () => {},
    false,
    visitorX,
  );
  assert.equal(turning.mirror, mirror);
}
assert.deepEqual(events, [
  ["meow", "effects"],
  ["purr", "effects"],
]);
assert.deepEqual(voices, [[null, "harbour-cat-pet"]]);
const hearts = petHearts(game, actor);
assert.equal(hearts.length, 3);
advanceActors(game, 0.5);
assert.notDeepEqual(petHearts(game, actor), hearts);
const staticHearts = petHearts(game, actor, true);
advanceActors(game, 0.5, true);
assert.deepEqual(petHearts(game, actor, true), staticHearts);
assert.equal(actor.animation, "sit");
advanceActors(game, 2);
assert.equal(actor.petting, 0);
assert.deepEqual(petHearts(game, actor), []);
advanceActors(game, 2);
advanceActors(game, 0.2);
assert.equal(actor.animation, "walk-side");
assert.deepEqual(targetVerbs(world.verbs, actor), [
  "Look at",
  "Use",
  "Take",
  "Talk to",
]);
const audio = new SoundEngine(
  world,
  "https://example.test/dev/data/world.json",
  new AudioContext(),
);
audio.start();
const purr = await audio.play("purr", audio.effects);
assert.equal(purr.source.filter.type, "lowpass");
assert.equal(purr.source.filter.frequency.value, 320);
assert(purr.source.buffer.getChannelData(0).some((n) => n !== 0));
assert(purr.pan.connections.includes(audio.effects));
assert.equal(purr.source.stopTime, 2.62);
audio.destroy();
petActor(actor, { effects: "effects", play() {} }, () => {}, true);
assert.equal(
  actor.animation,
  "sit",
  "Reduced motion also sits on the first pet frame",
);
console.log(
  "Actor paths, depth speed, stride, sits, pauses, reduced motion, pet hearts, voice, effects and validation passed.",
);
