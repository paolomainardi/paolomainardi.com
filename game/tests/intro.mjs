import assert from "node:assert/strict";
import { Intro, validateIntro } from "../src/intro.js";
import { SoundEngine } from "../src/sound.js";
import { AudioContext } from "./audio-fixture.mjs";
import { TextLayer } from "../src/text-layer.js";
import { canvas2D, context2D } from "./text-fixture.mjs";
import { bookFonts } from "../src/book.js";
const config = {
  music: "theme",
  shots: [
    { room: "map", time: "night", seconds: 4, lines: ["First", "Second"] },
    {
      room: "harbour",
      time: "dusk",
      seconds: 4,
      title: true,
      lines: ["Click to begin"],
    },
  ],
};
const world = {
  intro: config,
  rooms: { map: {}, harbour: {} },
  sounds: { theme: { src: "theme.mp3" } },
};
validateIntro(world);
validateIntro({});
for (const change of [
  null,
  { shots: [] },
  { music: "missing", shots: config.shots },
  { shots: [{ ...config.shots[0], seconds: 0 }] },
  { shots: [{ ...config.shots[0], seconds: Infinity }] },
  { shots: [{ ...config.shots[0], room: "missing" }] },
  { shots: [{ ...config.shots[0], time: "day" }] },
  { shots: [{ ...config.shots[0], lines: [42] }] },
  { shots: [{ ...config.shots[0], title: "yes" }] },
])
  assert.throws(() => validateIntro({ ...world, intro: change }));
assert.throws(() => validateIntro({ ...world, mix: { music: -1 } }));
assert.throws(() =>
  validateIntro({ ...world, sounds: { theme: { src: "file", loop: true } } }),
);
const intro = new Intro(config);
assert.equal(intro.text("Title").alpha, 0);
intro.update(0.4);
assert(intro.text("Title").alpha > 0 && intro.text("Title").alpha < 1);
intro.update(1.4);
assert(intro.text("Title").alpha < 0.5);
intro.update(0.3);
assert.equal(intro.text("Title").value, "Second");
assert.equal(intro.update(2), true);
intro.next();
assert.equal(intro.shot.room, "harbour");
assert.equal(intro.text("Title", true).value, "Title");
assert.equal(intro.text("Title", true).alpha, 1);
assert.equal(intro.text("Title", true).title, true);
assert.equal(intro.update(100), false);
assert.equal(intro.text("Title").value, "Click to begin");
assert.equal(intro.text("Title").alpha, 1);
const layer = new TextLayer(canvas2D());
const fonts = bookFonts(
  { font: { family: "NF-Pixels" }, sizes: { body: 10, title: 20 } },
  context2D(),
);
const game = {
  intro: new Intro(config),
  renderer: {},
  world: { title: "Title" },
  room: { size: [640, 360] },
  bookArt: { fonts },
};
game.intro.update(0.4);
assert(layer.update(game));
assert(
  layer.context.calls.some(
    (c) => c.args[0] === "First" && c.color === "#1e1b17",
  ),
);
assert(
  layer.context.calls.some((c) => c.args[0] === "First" && c.args[2] > 240),
);
assert(
  layer.context.pixels.data[15] > 0 && layer.context.pixels.data[15] < 255,
);
assert(!layer.update(game));
game.intro.update(0.1);
assert(layer.update(game));
const context = new AudioContext();
const sound = new SoundEngine(
  { ...world, mix: { music: 0.3 } },
  "https://intro.test/world.json",
  context,
);
globalThis.fetch = async () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(1),
});
sound.start();
assert.equal(sound.music.gain.value, 0.3);
assert(
  sound.music.connections[0].connections.every((panner) =>
    panner.connections.includes(sound.master),
  ),
);
await sound.playMusic("theme");
const source = sound.musicVoice.source;
assert.equal(source.loop, false);
sound.toggleMute();
assert.equal(sound.master.gain.calls.at(-1)[1], 0);
sound.toggleMute();
assert.equal(sound.master.gain.calls.at(-1)[1], 0.5);
const fade = sound.musicVoice.fade;
sound.stopMusic();
assert.deepEqual(fade.gain.calls.at(-1), ["linear", 0, 1]);
assert.equal(source.stopTime, 1);
sound.destroy();
const silent = new SoundEngine(
  world,
  "https://intro.test/world.json",
  new AudioContext(),
);
silent.start();
globalThis.fetch = async () => ({ ok: false, status: 404 });
const warn = console.warn;
console.warn = () => assert.fail("Missing theme must be silent");
await silent.playMusic("theme");
assert.equal(silent.musicVoice, null);
console.warn = warn;
silent.destroy();
console.log(
  "Intro timing, credits, reduced motion, validation, music bus, mute and missing music passed.",
);
// A skipped pending decode must never start audible music afterward.
let release;
const pending = new SoundEngine(
  world,
  "https://pending.test/world.json",
  new AudioContext(),
);
pending.start();
assert.equal(pending.music.gain.value, 0.7);
globalThis.fetch = () =>
  new Promise((resolve) => {
    release = resolve;
  });
const playing = pending.playMusic("theme");
pending.stopMusic();
release({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
await playing;
assert.equal(pending.musicVoice, undefined);
assert([...pending.voices].every((voice) => voice.source.stopTime === 0));
pending.destroy();
console.log("Music default gain and skip during pending decode passed.");

// A shot's sound cue plays once, when its time is reached.
{
  const cueIntro = new Intro({
    shots: [
      {
        room: "a",
        time: "night",
        seconds: 5,
        lines: [],
        sounds: [{ sound: "meow", at: 3, volume: 0.6 }],
      },
    ],
  });
  const fired = [];
  for (let i = 0; i < 50; i++) {
    cueIntro.update(0.1);
    fired.push(...cueIntro.due);
  }
  assert.deepEqual(fired, [{ sound: "meow", at: 3, volume: 0.6 }]);
}
