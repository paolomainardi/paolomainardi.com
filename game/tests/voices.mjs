// Exercise optional recordings, subtitle timing, and their session lifetime.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SoundEngine } from "../src/sound.js";
import { bookFonts } from "../src/book.js";
import { context2D } from "./text-fixture.mjs";
import { Speech } from "../src/speech.js";
import { AudioContext } from "./audio-fixture.mjs";

const world = {
  mix: { voice: 0.7 },
  voices: {
    enter: { text: "A first impression.", src: "voices/enter.mp3" },
    missing: { text: "A long thought. ".repeat(25), src: "voices/missing.mp3" },
    slow: { text: "Still loading.", src: "voices/slow.mp3" },
    text: { text: "Only words." },
  },
};
const sound = new SoundEngine(
  world,
  "https://example.test/world.json",
  new AudioContext(),
);
const game = {
  world,
  bookArt: {
    fonts: bookFonts(
      { font: { family: "NF-Pixels" }, sizes: { body: 10 } },
      context2D(),
    ),
  },
  sound,
  elapsed: 0,
  room: { id: "study", size: [640, 360], config: { enter: "enter" } },
};
const live = {};
const speech = new Speech(game, live);
const oldFetch = globalThis.fetch,
  oldWarn = console.warn;
let requests = [],
  warnings = [],
  resolveSlow;
globalThis.fetch = async (url) => {
  requests.push(url);
  if (url.endsWith("slow.mp3"))
    await new Promise((resolve) => {
      resolveSlow = resolve;
    });
  return {
    ok: !url.endsWith("missing.mp3"),
    status: 404,
    arrayBuffer: async () => new ArrayBuffer(4),
  };
};
console.warn = (...args) => warnings.push(args);
const flush = () => new Promise(setImmediate);
try {
  sound.start();
  assert.equal(requests.length, 0, "Start never preloads recordings");
  assert.equal(sound.voice.gain.value, 0.7);
  assert.equal(sound.voice.connections[0], sound.master);
  assert.equal(sound.effects.connections[0], sound.duck);
  assert.equal(sound.ambience.connections[0], sound.duck);
  speech.enter();
  assert.equal(game.speech, world.voices.enter.text);
  assert.equal(game.speechUntil, Infinity, "Subtitles survive a pending load");
  await flush();
  const first = sound.spoken.source;
  assert.equal(first.connections[0], sound.voice);
  assert.equal(sound.duck.gain.calls.at(-1)[1], 0.5, "Voice ducks by 6 dB");
  sound.setReader(true);
  assert.equal(sound.duck.gain.calls.at(-1)[1], 0.125);
  sound.setReader(false);
  assert.equal(sound.duck.gain.calls.at(-1)[1], 0.5);
  sound.toggleMute();
  assert.equal(sound.master.gain.calls.at(-1)[1], 0, "Master mutes voice too");
  assert.equal(sound.spoken.source, first, "Mute does not restart narration");
  sound.toggleMute();
  game.elapsed = 60;
  assert(
    speech.active(),
    "Subtitle lasts until audio ends, regardless of reading time",
  );
  first.onended();
  assert(!speech.active());
  assert.equal(sound.duck.gain.calls.at(-1)[1], 1);
  speech.say(null, "enter");
  await flush();
  assert.equal(requests.length, 1, "Replay uses the decoded cache");
  const replay = sound.spoken.source;
  speech.say(null, "missing");
  assert.equal(
    replay.stopTime,
    sound.context.currentTime,
    "New line stops old audio",
  );
  await flush();
  assert.equal(sound.spoken, null);
  assert(game.speechLines.length > 2, "Long lines never truncate");
  assert.equal(
    game.speechLines.join(" ").trim(),
    world.voices.missing.text.trim(),
  );
  assert.equal(
    game.speechUntil,
    game.elapsed + Math.max(3.5, game.speech.length * 0.055),
  );
  speech.say(null, "missing");
  await flush();
  assert.equal(warnings.length, 1, "A failed recording warns once");
  assert.equal(requests.filter((url) => url.endsWith("missing.mp3")).length, 1);
  speech.say(null, "slow");
  speech.clear();
  resolveSlow();
  await flush();
  assert.equal(sound.spoken, null, "A skipped download cannot start later");
  assert.equal(game.speech, null);
  assert.equal(live.textContent, "");
  speech.say(null, "text");
  assert.equal(game.speech, "Only words.");
  speech.say("Built-in fallback", "absent");
  assert.equal(game.speech, "Built-in fallback");
  speech.clear();
  speech.enter();
  assert.equal(game.speech, null, "A room speaks only once in a session");
  game.room = { ...game.room, id: "harbour" };
  speech.enter();
  await flush();
  assert.equal(
    game.speech,
    world.voices.enter.text,
    "Each room has its own first entry",
  );
  speech.clear();
  // Without browser storage a new visit speaks again.
  const nextVisit = new Speech(game, live);
  nextVisit.enter();
  await flush();
  assert(nextVisit.active(), "A new session speaks again");
  nextVisit.clear();
  // With storage, a room entered on an earlier visit stays quiet.
  const store = new Map();
  const oldStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
    },
  });
  try {
    const firstVisit = new Speech(game, live);
    firstVisit.enter();
    await flush();
    assert(firstVisit.active(), "The first visit speaks");
    firstVisit.clear();
    assert.deepEqual(JSON.parse(store.get("adventure.visited")), [
      game.room.id,
    ]);
    const laterVisit = new Speech(game, live);
    laterVisit.enter();
    await flush();
    assert(!laterVisit.active(), "A later visit does not repeat the entry");
  } finally {
    if (oldStorage)
      Object.defineProperty(globalThis, "localStorage", oldStorage);
    else delete globalThis.localStorage;
  }
  sound.destroy();
  assert.equal(sound.spoken, null);
  assert.equal(sound.context.state, "closed");
} finally {
  globalThis.fetch = oldFetch;
  console.warn = oldWarn;
}

// Existing lines have recordings. Cat lines and Rosa replies are recorded separately.
// Every place line, including actor replies, must remain bound.
const real = JSON.parse(
  readFileSync(new URL("../dev/real/world.json", import.meta.url)),
);
const ids = Object.keys(real.voices);
const pendingRecordings = new Set([
  "harbour-cat",
  "harbour-cat-pet",
  "harbour-cat-take",
  "rosa-reply-1",
  "rosa-reply-2",
  "rosa-reply-3",
]);
for (const id of ids) {
  assert.equal(real.voices[id].src, `voices/${id}.mp3`);
  assert(
    pendingRecordings.has(id) ||
      existsSync(
        new URL(`../dev/real/${real.voices[id].src}`, import.meta.url),
      ),
  );
}
const bound = new Set((real.pocket || []).map((item) => item.look));
for (const room of Object.values(real.rooms)) {
  bound.add(room.enter);
  for (const actor of room.actors || []) {
    [actor.look, actor.pet, actor.take].forEach((id) => bound.add(id));
    for (const exchange of actor.talk || []) bound.add(exchange.reply);
  }
  Object.values(room.looks || {}).forEach((id) => bound.add(id));
  Object.values(room.hotspots || {}).forEach((binding) => {
    if (binding.look) bound.add(binding.look);
  });
  const drawing = JSON.parse(
    readFileSync(new URL(`../dev/real/${room.src}`, import.meta.url)),
  );
  assert(drawing.items.every((item) => !Object.hasOwn(item, "look")));
}
assert(
  ids.filter((id) => !id.startsWith("common-")).every((id) => bound.has(id)),
);
for (const variant of ["data", "real"]) {
  const fixture = JSON.parse(
    readFileSync(new URL(`../dev/${variant}/world.json`, import.meta.url)),
  );
  for (const room of Object.values(fixture.rooms)) {
    const drawing = JSON.parse(
      readFileSync(new URL(`../dev/${variant}/${room.src}`, import.meta.url)),
    );
    if (room.enter) assert(fixture.voices[room.enter]);
    for (const actor of room.actors || [])
      for (const id of [actor.look, actor.pet, actor.take])
        assert(fixture.voices[id]);
    for (const [item, id] of Object.entries(room.looks || {})) {
      assert(
        drawing.items.some((target) => target.id === item) ||
          room.books?.includes(item),
      );
      assert(fixture.voices[id]);
    }
    for (const [item, binding] of Object.entries(room.hotspots || {})) {
      assert(drawing.items.some((target) => target.id === item));
      if (binding.look) assert(fixture.voices[binding.look]);
    }
  }
}
console.log(
  "Voice subtitles, duration, missing files, cancellation, mixing, mute, cache, entry lifetime, and recording bindings passed.",
);
