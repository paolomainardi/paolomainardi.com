// Check sound behavior against the engine and shipped fixtures.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SoundEngine, soundPosition, footContacts } from "../src/sound.js";
import { AudioContext } from "./audio-fixture.mjs";
const world = JSON.parse(
  readFileSync(new URL("../dev/data/world.json", import.meta.url)),
);
const audio = new SoundEngine(
  world,
  "https://example.test/data/world.json",
  new AudioContext(),
);
const room = {
  config: world.rooms["stone-house"],
  size: [640, 360],
  items: [
    { id: "window", position: [100, 100] },
    { id: "oil", position: [350, 200] },
  ],
  lights: [{ id: "oil", level: 1 }],
};
const game = { room, actor: { x: 100, y: 100 }, time: "dusk" };
await audio.event("step");
audio.update(game);
audio.visibility(false);
assert.equal(
  AudioContext.instances.length,
  1,
  "Caller supplies context before Start",
);
audio.start();
assert.equal(audio.context.state, "running");
// Music reaches master through two HRTF speakers, left and right, drifting.
const split = audio.music.connections[0];
const panners = split.connections;
assert.equal(panners.length, 2);
assert(panners.every((panner) => panner.panningModel === "HRTF"));
assert(panners[0].positionX.value < 0 && panners[1].positionX.value > 0);
assert(panners.every((panner) => panner.connections[0] === audio.master));
assert(
  audio.context.nodes.some(
    (node) =>
      node.started &&
      node.connections[0]?.connections[0] === panners[0].positionX,
  ),
  "a slow oscillator drifts the left speaker",
);
assert.equal(audio.master.gain.value, 0.5);
assert.equal(audio.ambience.gain.value, 0.8);
assert.equal(audio.effects.gain.value, 1);
audio.start();
assert.equal(AudioContext.instances.length, 1);
audio.toggleMute();
assert.equal(audio.muted, true);
assert.deepEqual(audio.master.gain.calls.at(-1).slice(0, 2), ["linear", 0]);
audio.toggleMute();
assert.equal(audio.master.gain.calls.at(-1)[1], 0.5);
audio.setReader(true);
assert.equal(audio.duck.gain.calls.at(-1)[1], 0.25);
audio.setReader(false);
assert.equal(audio.duck.gain.calls.at(-1)[1], 1);
audio.visibility(true);
assert.equal(audio.context.state, "suspended");
audio.visibility(false);
assert.equal(audio.context.state, "running");
// A gesture wakes audio that iOS interrupted, and leaves running audio alone.
audio.context.state = "interrupted";
audio.wake();
assert.equal(audio.context.state, "running");
audio.wake();
assert.equal(audio.context.state, "running");
assert.deepEqual(soundPosition(room, game.actor, { at: "window" }), {
  gain: 1,
  pan: 0,
});
const distant = soundPosition(room, { x: 600, y: 100 }, { at: "window" });
assert(distant.gain > 0 && distant.gain < 1);
assert.equal(distant.pan, -1);
assert(soundPosition(room, { x: 0, y: 100 }, { at: "window" }).pan > 0);
assert.deepEqual(soundPosition(room, game.actor, {}), { gain: 1, pan: 0 });
audio.update(game);
await Promise.resolve();
const sea = audio.loops[0].voice;
assert(sea.source.loop);
assert.equal(sea.output.gain.calls.at(-1)[1], 0.5);
assert.deepEqual(sea.fade.gain.calls.at(-1), ["linear", 1, 1]);
audio.context.currentTime = 2;
game.time = "night";
audio.update(game);
await Promise.resolve();
assert.deepEqual(sea.fade.gain.calls.at(-1), ["linear", 0, 3]);
assert.equal(sea.source.stopTime, 3);
assert.equal(audio.loops.length, 3);
const fire = audio.loops[2].voice;
room.lights[0].level = 0.5;
audio.update(game);
const half = fire.output.gain.calls.at(-1)[1];
assert(half > 0 && half < 0.125);
room.lights[0].level = 0;
audio.update(game);
assert.equal(fire.output.gain.calls.at(-1)[1], 0);
const retired = audio.loops[0].voice;
game.room = { ...room, config: { ambience: {} } };
audio.update(game);
assert.equal(audio.loops.length, 0);
assert.equal(retired.source.stopTime, 3);
// Every built-in generator creates filtered noise; effects have finite lifetimes.
for (const name of Object.keys(world.events)) {
  const voice = await audio.event(name, 0.7);
  assert.equal(voice.definition, world.sounds[world.events[name]]);
  assert.equal(voice.output.gain.value, voice.definition.volume * 0.7);
  assert(voice.source.filter);
  assert(voice.source.stopTime > audio.context.currentTime);
}
const original = world.events.menu;
world.events.menu = "door";
assert.equal((await audio.event("menu")).definition.synth, "creak");
world.events.menu = original;
for (const speed of [1, 2]) {
  let phase = 0,
    contacts = 0;
  for (let frame = 0; frame < 100; frame++) {
    const next = phase + 0.016 * speed;
    contacts += footContacts(phase, next);
    phase = next;
  }
  assert.equal(contacts, Math.floor(phase * 2));
}
assert.equal(footContacts(0.49, 0.51), 1);
assert.equal(footContacts(0.99, 1.01), 1);
assert.equal(footContacts(0.1, 2.1), 4);
assert.equal(footContacts(0.51, 0.99), 0);
const warnings = [],
  oldWarn = console.warn,
  oldFetch = globalThis.fetch;
console.warn = (...args) => warnings.push(args);
let fetched = [],
  resolveSlow;
globalThis.fetch = async (url) => {
  fetched.push(String(url));
  if (String(url).endsWith("slow.wav"))
    await new Promise((resolve) => {
      resolveSlow = resolve;
    });
  return {
    ok: !String(url).endsWith("missing.wav"),
    status: 404,
    arrayBuffer: async () => new ArrayBuffer(4),
  };
};
try {
  world.sounds.bad = { synth: "unknown" };
  world.sounds.inherited = { synth: "constructor" };
  world.sounds.file = { src: "sounds/test.wav", loop: true };
  world.sounds.missing = { src: "missing.wav" };
  for (let i = 0; i < 2; i++) {
    assert.equal(await audio.play("bad", audio.effects), null);
    assert.equal(await audio.play("inherited", audio.effects), null);
    assert.equal(await audio.play("absent", audio.effects), null);
    assert.equal(await audio.play("missing", audio.effects), null);
    await audio.play("file", audio.ambience);
    world.sounds.alias = { src: "sounds/test.wav" };
    await audio.play("alias", audio.effects);
  }
  assert.equal(warnings.length, 4);
  assert.equal(audio.context.decoded, 1);
  assert.equal(fetched.filter((url) => url.endsWith("test.wav")).length, 1);
  assert(fetched.includes("https://example.test/data/sounds/test.wav"));
  const safeFetches = fetched.length;
  for (const src of ["javascript:alert(1)", "data:audio/wav,invalid"]) {
    world.sounds.unsafe = { src };
    assert.equal(await audio.play("unsafe", audio.effects), null);
  }
  assert.equal(
    fetched.length,
    safeFetches,
    "Unsafe audio URLs never reach fetch",
  );
  world.sounds.slow = { src: "slow.wav", loop: true };
  game.room = { ...room, config: { ambience: { night: [{ sound: "slow" }] } } };
  audio.update(game);
  game.time = "dusk";
  audio.update(game);
  resolveSlow();
  await new Promise(setImmediate);
  const stale = [...audio.voices].find(
    (voice) => voice.definition === world.sounds.slow,
  );
  assert.equal(stale.source.stopTime, audio.context.currentTime);
  const active = [...audio.voices];
  audio.destroy();
  assert.equal(audio.context.state, "closed");
  assert(
    active.every((voice) => voice.nodes.every((node) => node.disconnected)),
  );
} finally {
  console.warn = oldWarn;
  globalThis.fetch = oldFetch;
}
console.log(
  "Sound lifecycle, buses, mute, ducking, spatial gain, lamps, fades, synths, events, contacts, decode caching and missing sounds passed.",
);
