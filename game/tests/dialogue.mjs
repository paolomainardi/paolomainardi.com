import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Speech, speechLayout } from "../src/speech.js";
import { depth } from "../src/lighting.js";
import { createActor, advanceActors, validateActors } from "../src/actors.js";
import { bookFonts } from "../src/book.js";
import { TextLayer } from "../src/text-layer.js";
import { canvas2D, context2D } from "./text-fixture.mjs";

const world = JSON.parse(
  readFileSync(new URL("../dev/real/world.json", import.meta.url)),
);
const config = world.rooms.harbour.actors[0];
const character = {
  frame: [48, 32],
  anchor: [24, 30],
  animations: {
    "walk-side": { stride: 36 },
    idle: { frames: 2, fps: 2 },
  },
};
const room = {
  size: [640, 360],
  items: [],
  walkable: new Uint8Array(640 * 360).fill(1),
  depth: { far: [0, 1], near: [360, 1] },
};
validateActors([config], world, room);
assert.equal(config.name, "Rosa");
assert.equal(config.label, "Rosa");
const palette = JSON.parse(
  readFileSync(new URL("../dev/real/palette.json", import.meta.url)),
);
assert(palette.includes(config.speech));
for (const patch of [
  { name: "" },
  { name: 5 },
  { name: null },
  { speech: "red" },
  { speech: "#fff" },
  { speech: 5 },
  { talk: [] },
  { talk: null },
  { talk: {} },
  { talk: [null] },
  ...["meow", "words", "end"].flatMap((key) =>
    ["", 4, null].map((value) => ({
      talk: [{ ...config.talk[0], [key]: value }],
    })),
  ),
  { talk: [{ ...config.talk[0], reply: "missing" }] },
])
  assert.throws(() => validateActors([{ ...config, ...patch }], world, room));
const actor = createActor(config, character);
const sounds = [];
const game = {
  world,
  room,
  actors: [actor],
  actor: { x: 250, y: 290 },
  character: { anchor: [24, 80] },
  path: [],
  elapsed: 0,
  verbTop: 324,
  sound: {
    effects: {},
    stopVoice() {},
    play: (id) => sounds.push(id),
    playVoice: async () => false,
  },
  bookArt: {
    fonts: bookFonts(
      { font: { family: "NF-Pixels" }, sizes: { body: 10 } },
      context2D(),
    ),
  },
};
const live = {};
const speech = new Speech(game, live);
const advance = (seconds) => {
  game.elapsed += seconds;
  speech.update();
  advanceActors(game, seconds);
};
for (let i = 0; i < 4; i++) {
  const exchange = config.talk[i % 3];
  speech.talk(actor);
  const position = [actor.x, actor.y];
  assert.equal(game.speech, exchange.meow);
  assert(Math.abs(game.speechUntil - game.elapsed - 4) < 1e-10);
  assert.equal(game.speechActor, actor);
  assert.equal(live.textContent, exchange.meow);
  assert.equal(actor.animation, "sit");
  assert(actor.mirror);
  advance(3.99);
  assert.equal(game.speech, exchange.meow);
  assert.deepEqual([actor.x, actor.y], position);
  advance(0.011);
  assert.equal(game.speech, exchange.words);
  const reading = Math.max(3.5, exchange.words.length * 0.055);
  assert(Math.abs(game.speechUntil - game.elapsed - reading) < 1e-10);
  advance(reading - 0.01);
  assert.equal(game.speech, exchange.words);
  advance(0.011);
  await new Promise(setImmediate);
  assert.equal(game.speech, world.voices[exchange.reply].text);
  assert.equal(game.speechActor, null);
  advance(game.speechUntil - game.elapsed + 0.001);
  assert.equal(game.speech, exchange.end);
  assert(Math.abs(game.speechUntil - game.elapsed - 1.2) < 1e-10);
  advance(1.19);
  assert.equal(game.speech, exchange.end);
  advance(0.011);
  assert.equal(game.conversation, null);
  assert.equal(game.speech, null);
  assert.equal(actor.held, false);
}
// Each exchange: chatter under the meows, a different chatter under her words, a meow to close.
assert.deepEqual(
  sounds,
  Array(4).fill([actor.chatter, actor.chatterWords, actor.meow]).flat(),
);
advance(5);
advance(0.1);
assert.equal(actor.animation, "walk-side", "Wandering resumes");
for (let stage = 0; stage < 4; stage++) {
  speech.talk(actor);
  for (let i = 0; i < stage; i++) speech.nextTalk();
  const step = game.conversation.step;
  speech.nextTalk();
  assert.equal(
    game.conversation?.step ?? 4,
    step + 1,
    "Skip advances exactly one step",
  );
  speech.clear();
  assert.equal(game.conversation, null);
  assert.equal(actor.held, false);
  assert.equal(game.speechActor, null);
}
speech.talk(actor);
game.path = [[200, 280]];
speech.update();
assert.equal(game.conversation, null, "Walking cancels");
game.path = [];
speech.talk(actor);
advanceActors(game, 1, true);
assert.equal(actor.animation, "sit");
assert.equal(game.speech, game.conversation.exchange.meow);
const layout = speechLayout(game);
assert.equal(
  layout.top + layout.height,
  Math.round(actor.y - character.anchor[1] - 5),
);
assert(
  layout.rows.every(
    (row) => row.x >= 1 && row.x + layout.font.measure(row.line) <= 639,
  ),
);
const layer = new TextLayer(canvas2D());
assert(layer.update(game));
assert.equal(layer.context.calls.at(-1).color, config.speech);
assert(
  layer.context.calls.slice(-9, -1).every((call) => call.color === "#1e1b17"),
);
assert(!layer.update(game));
game.actor.x += 10;
assert(layer.update(game), "Cat subtitle placement invalidates cached text");
// Her lines stay clear of the visitor standing beside her.
const clear = speechLayout(game);
const visitorHalf = 30 * depth(game, game.actor);
assert(
  clear.rows.every(
    (row) =>
      row.x >= game.actor.x + visitorHalf ||
      row.x + clear.font.measure(row.line) <= game.actor.x - visitorHalf,
  ),
);
speech.nextTalk();
assert(layer.update(game));
speech.nextTalk();
assert(layer.update(game));
assert.equal(
  layer.context.calls.at(-1).color,
  "#feeab3",
  "Reply uses visitor colour",
);
speech.clear();
console.log(
  "Rosa sequence, timing, looping, skip, cancel, reduced motion, subtitle placement and colour, and config validation passed.",
);
