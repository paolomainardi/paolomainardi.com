import {
  depth as actorDepth,
  lanternPosition,
  lanternStrength,
  lightAt,
  lightSourcesAt,
} from "../src/lighting.js";
import { sentence } from "../src/panel.js";
// Execute the real loader and game loop with generated PNGs, a DOM stand-in,
// and a renderer stand-in. GPU output still needs a real browser visual pass.
import assert from "node:assert/strict";
import { animationFrame } from "../src/animation.js";
import { AudioContext } from "./audio-fixture.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { context2D } from "./text-fixture.mjs";

const base = fileURLToPath(new URL("../", import.meta.url));
const python =
  process.env.ART_PYTHON ||
  "/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python";
class Element extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = tag;
    this.children = [];
    this.style = {};
    this.attributes = {};
    this.disabled = false;
    this.clientWidth = 960;
    this.clientHeight = 540;
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  setAttribute(key, value) {
    this.attributes[key] = value;
  }
  removeAttribute(key) {
    delete this.attributes[key];
    if (key === "src") this.src = "";
  }
  click() {
    if (this.tagName === "a")
      clickedLinks.push({
        href: this.href,
        target: this.target,
        rel: this.rel,
      });
    if (this.tagName === "a")
      opened.push({
        args: [this.href, this.target, "noopener,noreferrer"],
        position: [rendered.actor.x, rendered.actor.y],
      });
    this.dispatchEvent(new Event("click"));
  }
  focus() {
    document.activeElement = this;
  }
  remove() {
    this.removed = true;
  }
  setPointerCapture(id) {
    this.pointerId = id;
  }
  hasPointerCapture(id) {
    return this.pointerId === id;
  }
  releasePointerCapture() {
    this.pointerId = null;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 640, height: 360 };
  }
}
const document = new EventTarget();
document.baseURI = "https://adventure.test/dev/";
const fontFaces = new Set();
document.fonts = {
  add: (face) => fontFaces.add(face),
  delete: (face) => fontFaces.delete(face),
};
document.head = new Element("head");
document.body = new Element("body");
document.createElement = (tag) => new Element(tag);
const window = new EventTarget();
const opened = [];
const clickedLinks = [];
window.open = (...args) => {
  opened.push({ args, position: [rendered.actor.x, rendered.actor.y] });
  return null; // noopener may return null even when the browser opens the tab.
};
const location = { hash: "", origin: "https://adventure.test" };
let animationStart = 0;
// Retain coverage for worlds that omit the optional pocket list.
let includePocket = false;
let contentOverride,
  missingLampDrawings = false;
const requests = [];
let renderCount = 0;
let nextFrame,
  time = 1000,
  rendered;
class Renderer {
  constructor() {
    this.textLayer = { context: context2D() };
    this.scale = 1;
    this.deletedTextures = [];
    this.gl = {
      deleteTexture: (texture) => this.deletedTextures.push(texture),
    };
  }
  pixels(image) {
    return image.data;
  }
  texture(bitmap) {
    return { bitmap };
  }
  palette() {}
  setRoom() {}
  resize() {
    return 1;
  }
  render(game) {
    renderCount++;
    rendered = game;
  }
  destroy() {
    this.destroyed = true;
  }
}
const decodedImages = new Map();
const context = vm.createContext({
  AudioContext,
  URL,
  FontFace: class {
    async load() {}
  },
  Uint8Array,
  Int16Array,
  Int32Array,
  Float32Array,
  Float64Array,
  HTMLElement: Element,
  document,
  window,
  location,
  history: {
    pushState(_a, _b, hash) {
      location.hash = hash;
    },
  },
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
  requestAnimationFrame(callback) {
    nextFrame = callback;
    return 1;
  },
  cancelAnimationFrame() {
    nextFrame = null;
  },
  async fetch(url) {
    requests.push(String(url));
    const path = base + new URL(url).pathname.slice(1);
    return {
      ok: true,
      json: async () => {
        const data = JSON.parse(readFileSync(path, "utf8"));
        if (path.endsWith("/world.json") && !includePocket) delete data.pocket;
        if (path.endsWith("/content.json") && contentOverride)
          data.items = contentOverride;
        if (path.endsWith("/room.json") && missingLampDrawings)
          for (const state of Object.values(data.states)) {
            delete state.lights;
          }
        if (path.endsWith("/data/character/character.json") && animationStart) {
          data.animations["walk-side"].start = animationStart;
          data.animations["walk-side"].frames -= animationStart;
        }
        return data;
      },
      blob: async () => ({ path }),
    };
  },
  async createImageBitmap(blob) {
    let result = decodedImages.get(blob.path);
    if (!result) {
      result = spawnSync(
        python,
        [
          "-c",
          "from PIL import Image; import sys,struct; i=Image.open(sys.argv[1]).convert('RGBA'); sys.stdout.buffer.write(struct.pack('<II',*i.size)+i.tobytes())",
          blob.path,
        ],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      if (result.status !== 0)
        throw result.error || new Error(result.stderr.toString());
      assert.equal(
        result.stdout.length,
        8 + result.stdout.readUInt32LE(0) * result.stdout.readUInt32LE(4) * 4,
        "PNG decoder must return every pixel",
      );
      decodedImages.set(blob.path, result);
    }
    return {
      width: result.stdout.readUInt32LE(0),
      height: result.stdout.readUInt32LE(4),
      data: new Uint8Array(result.stdout.subarray(8)),
    };
  },
});
const cache = new Map();
async function moduleAt(url) {
  if (cache.has(url)) return cache.get(url);
  if (url.endsWith("/renderer.js")) {
    const module = new vm.SyntheticModule(
      ["Renderer"],
      function () {
        this.setExport("Renderer", Renderer);
      },
      { context },
    );
    cache.set(url, module);
    return module;
  }
  const source = readFileSync(base + new URL(url).pathname.slice(1), "utf8");
  const module = new vm.SourceTextModule(source, {
    context,
    identifier: url,
    async importModuleDynamically(specifier, parent) {
      const imported = await moduleAt(
        new URL(specifier, parent.identifier).href,
      );
      if (imported.status === "unlinked")
        await imported.link((specifier, parent) =>
          moduleAt(new URL(specifier, parent.identifier).href),
        );
      if (imported.status === "linked") await imported.evaluate();
      return imported;
    },
    initializeImportMeta(meta) {
      meta.url = url;
    },
  });
  cache.set(url, module);
  return module;
}
const module = await moduleAt("https://adventure.test/src/main.js");
await module.link((specifier, parent) =>
  moduleAt(new URL(specifier, parent.identifier).href),
);
await module.evaluate();
async function startedBoot(options) {
  const instance = await module.namespace.boot(options);
  options.element.children[0].children[1].children[3].click();
  await instance.ready;
  return instance;
}
const container = new Element("main");
const controller = await module.namespace.boot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: container,
});
const root = container.children[0],
  canvas = root.children[0],
  cover = root.children[1],
  reader = root.children[2],
  close = reader.children[0],
  iframe = reader.children[1];
function rawEvent(target, type, props = {}) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, props);
  target.dispatchEvent(e);
  return e;
}
// Existing interaction cases assume the visitor has finished reading each reply.
function event(target, type, props = {}) {
  if (["click", "contextmenu", "pointerdown"].includes(type) && rendered) {
    rendered.sound.stopVoice();
    rendered.speechUntil = rendered.elapsed;
  }
  return rawEvent(target, type, props);
}
function step(frames = 1) {
  for (let i = 0; i < frames; i++) {
    time += 16;
    const frame = nextFrame;
    frame(time);
  }
}
function click(x, y, detail = 1) {
  event(canvas, "click", { clientX: x, clientY: y, detail });
}
function key(key) {
  event(root, "keydown", { key });
}
function settle() {
  for (let i = 0; i < 600 && controller.state.walking; i++) step();
  assert(!controller.state.walking, "Actor must reach its target");
}
assert.equal(cover.children[2].textContent, "Start");
assert.equal(cover.children[2].disabled, false);
assert.equal(reader.hidden, true);
assert.equal(close.textContent, "×");
assert.equal(close.attributes["aria-label"], "Close");
assert.equal(
  AudioContext.instances.length,
  0,
  "Boot must not create audio before Start",
);
assert.equal(requests.length, 0, "No data or drawings before Start");
assert.equal(controller.state, null);
event(cover.children[3], "click");
const firstReady = controller.ready;
event(cover.children[3], "click");
assert.equal(
  controller.ready,
  firstReady,
  "Repeated Start clicks share initialization",
);
await controller.ready;
step();
assert.equal(AudioContext.instances.length, 1);
const soundEvents = [];
const originalSoundEvent = rendered.sound.event.bind(rendered.sound);
rendered.sound.event = (name, volume = 1) => {
  soundEvents.push({ name, volume, phase: rendered.actor.walkPhase });
  return originalSoundEvent(name, volume);
};
key("m");
assert.equal(rendered.sound.muted, true);
click(rendered.soundRect.x + 2, rendered.soundRect.y + 2);
assert.equal(rendered.sound.muted, false);
document.hidden = true;
event(document, "visibilitychange");
assert.equal(rendered.sound.context.state, "suspended");
const hiddenRenders = renderCount,
  hiddenElapsed = rendered.elapsed;
step(10);
assert.equal(renderCount, hiddenRenders);
assert.equal(rendered.elapsed, hiddenElapsed);
document.hidden = false;
event(document, "visibilitychange");
assert.equal(rendered.sound.context.state, "running");
step();
// Speed is 120 pixels per second at depth scale 1, and doubles for one walk only.
const depth = rendered.room.depth;
rendered.room.depth = { far: [150, 1], near: [265, 1] };
rendered.actor.x = 320;
event(canvas, "click", { clientX: 533.333, clientY: 300, detail: 1 });
step(10);
assert(
  Math.abs(rendered.actor.x - 339.2) < 1e-8,
  JSON.stringify({
    actor: rendered.actor,
    path: rendered.path,
    size: rendered.room.size,
  }),
);
rendered.actor.x = 320;
event(canvas, "click", { clientX: 533.333, clientY: 300, detail: 2 });
step(10);
assert(Math.abs(rendered.actor.x - 358.4) < 1e-8);
event(canvas, "click", { clientX: 533.333, clientY: 300, detail: 1 });
step(10);
assert(Math.abs(rendered.actor.x - 377.6) < 1e-8);
rendered.actor.x = 120;
rendered.path = [];
rendered.room.depth = depth;
step();
// Distance advances the same cycle at different depths, including running.
const savedActor = { ...rendered.actor },
  savedElapsed = rendered.elapsed;
for (const scale of [0.5, 1]) {
  for (const running of [false, true]) {
    rendered.room.depth = { far: [150, scale], near: [352, scale] };
    Object.assign(rendered.actor, {
      x: 200,
      y: 300,
      animation: "idle-front",
      walkPhase: 0,
      clock: 0,
    });
    rendered.path = [[600, 300]];
    rendered.running = running;
    const beforeSteps = soundEvents.filter(
      (event) => event.name === "step",
    ).length;
    step(20);
    const contacts = soundEvents
      .filter((event) => event.name === "step")
      .slice(beforeSteps);
    assert.equal(
      contacts.length,
      running ? 1 : 0,
      "Foot contacts follow distance at both speeds and depths",
    );
    assert(contacts.every((event) => event.volume === scale));
    const distance = rendered.actor.x - 200;
    assert(Math.abs(distance - 38.4 * scale * (running ? 2 : 1)) < 1e-8);
    assert(Math.abs(rendered.actor.walkPhase - distance / (96 * scale)) < 1e-8);
    assert.equal(
      animationFrame(
        rendered.actor,
        rendered.character.animations["walk-side"],
      ),
      running ? 4 : 2,
    );
    step(40);
    const fullContacts = soundEvents
      .filter((event) => event.name === "step")
      .slice(beforeSteps);
    assert.equal(
      fullContacts.length,
      running ? 4 : 2,
      "Both foot phases fire over full cycles",
    );
    assert(fullContacts.every((event) => event.volume === scale));
  }
}
rendered.room.depth = { far: [150, 1], near: [352, 1] };
rendered.running = false;
Object.assign(rendered.actor, {
  x: 200,
  y: 300,
  animation: "walk-side",
  walkPhase: 0.2,
});
rendered.path = [
  [200.5, 300],
  [200.5, 280],
];
step();
assert.equal(rendered.actor.animation, "walk-back");
assert(
  Math.abs(rendered.actor.walkPhase - (0.2 + 1.92 / 96)) < 1e-8,
  "Phase survives a direction change within one tick",
);
const savedStride = rendered.character.animations["walk-back"].stride;
rendered.character.animations["walk-back"].stride = 48;
step();
assert(
  Math.abs(rendered.actor.walkPhase - (0.2 + 1.92 / 96 + 1.92 / 48)) < 1e-8,
);
rendered.character.animations["walk-back"].stride = savedStride;

// A diagonal must cross the hysteresis band before changing direction.
for (const [initial, dx, dy, expected] of [
  ["walk-side", 0.75, -1, "walk-side"],
  ["walk-side", 0.69, -1, "walk-back"],
  ["walk-back", 0.85, -1, "walk-back"],
  ["walk-back", 0.91, -1, "walk-side"],
  ["walk-front", 0.85, 1, "walk-front"],
  ["walk-front", 0.91, 1, "walk-side"],
  ["walk-side", 0.69, 1, "walk-front"],
]) {
  Object.assign(rendered.actor, { x: 300, y: 300, animation: initial });
  rendered.path = [[300 + dx * 20, 300 + dy * 20]];
  step();
  assert.equal(rendered.actor.animation, expected);
}
for (const direction of ["side", "back"]) {
  rendered.character.animations[`idle-${direction}`] = {
    row: 0,
    frames: 1,
    fps: 1,
  };
}
for (const [dx, dy, idle, mirror] of [
  [-0.5, 0, "idle-side", true],
  [0.5, 0, "idle-side", false],
  [0, -0.5, "idle-back", false],
  [0, 0.5, "idle-front", false],
]) {
  Object.assign(rendered.actor, { x: 300, y: 300, animation: "idle-front" });
  rendered.path = [[300 + dx, 300 + dy]];
  step();
  assert.equal(rendered.actor.animation, idle);
  assert.equal(rendered.actor.mirror, mirror);
  step(3);
  assert.equal(rendered.actor.animation, idle, "Standing direction persists");
}
for (const direction of ["side", "back"])
  delete rendered.character.animations[`idle-${direction}`];
for (const [dx, dy] of [
  [-0.5, 0],
  [0, -0.5],
]) {
  Object.assign(rendered.actor, { x: 300, y: 300, animation: "idle-front" });
  rendered.path = [[300 + dx, 300 + dy]];
  step();
  assert.equal(rendered.actor.animation, "idle-front");
  assert.equal(rendered.actor.mirror, false);
}
// Time-based sheets remain supported; the lantern uses the same cycle frame.
const side = rendered.character.animations["walk-side"];
Object.assign(rendered.actor, {
  animation: "walk-side",
  walkPhase: 0.4,
  clock: 0.2,
  mirror: false,
});
const flames = rendered.character.flames["walk-side"];
rendered.character.flames["walk-side"] = Array.from(
  { length: side.frames },
  (_, i) => [i * 10, -i],
);
assert.equal(lanternPosition(rendered)[0], rendered.actor.x + 20);
assert.equal(animationFrame(rendered.actor, { frames: 6, fps: 8 }), 1);
rendered.character.flames["walk-side"] = flames;
Object.assign(rendered.actor, savedActor);
rendered.elapsed = savedElapsed;
rendered.path = [];
rendered.room.depth = depth;
console.log(
  "Distance frames, depth, running, segment phase, standing direction and hysteresis passed.",
);

assert.equal(location.hash, "#stone-house");
assert.equal(rendered.objects.length, 6);
assert.equal(
  rendered.room.walkable.length,
  rendered.room.size[0] * rendered.room.size[1],
);
assert.equal(rendered.objects[0].label, "Workstation");
// Hit areas must use the assigned sprite, including pixels beyond the slot mask.
const varied = rendered.objects[1],
  originalSize = varied.sprite.size;
varied.sprite.size = [30, 60];
const hitX = varied.position[0],
  hitY = varied.position[1] - 50;
event(canvas, "pointermove", {
  clientX: hitX,
  clientY: hitY,
});
assert.equal(rendered.hover, varied);
const variedBounds = varied.bounds;
varied.bounds = [-1, -1, -1, -1];
for (const [x, y] of [
  [varied.position[0], varied.position[1]],
  [varied.position[0] + varied.sprite.size[0] / 2, varied.position[1] - 1],
]) {
  event(canvas, "pointermove", { clientX: x, clientY: y });
  assert.notEqual(
    rendered.hover,
    varied,
    "Sprite excludes bottom and right edges",
  );
}
varied.bounds = variedBounds;
varied.sprite.size = originalSize;
event(canvas, "pointermove", {
  clientX: hitX,
  clientY: hitY,
});
assert.notEqual(rendered.hover, varied);

assert.deepEqual(Array.from(controller.state.position), [120, 300]);
assert.equal(rendered.verbTop, 324, "Panel occupies the bottom 36 pixels");
assert(
  rendered.verbRects.every((v, i) => v.y === 344),
  "Five verbs share one row",
);
click(150, 300);
step(10);
const expectedTravel = 120 * actorDepth(rendered) * 0.16;
assert(
  Math.abs(controller.state.position[0] - 120 - expectedTravel) < 0.001,
  "Walk at 120 pixels per second scaled by depth",
);
settle();
click(280, 300);
assert(controller.state.walking);
settle();
assert.deepEqual(Array.from(controller.state.position), [280, 300]);
// CPU light sampling must reach the last pixel and match the shader's radius.
const savedLights = rendered.room.lights;
const sampleState = rendered.room.states.dusk;
const oldPixels = sampleState.lightPixels,
  oldUnlit = sampleState.unlitPixels;
sampleState.unlitPixels = new Uint8Array(640 * 360 * 4);
sampleState.lightPixels = { test: new Uint8Array(640 * 360 * 4) };
sampleState.lightPixels.test.set([255, 128, 0, 255], (640 * 360 - 1) * 4);
rendered.room.lights = [
  { id: "test", strength: 1, position: [0, 0], drift: [0, 0] },
];
const savedTime = rendered.time;
rendered.time = "dusk";
assert.equal(lightAt(rendered, 639, 359), 1);
assert.equal(lightAt(rendered, 1000, 1000), 1);
assert.equal(lightAt(rendered, 638, 359), 0);
const sampled = lightSourcesAt(rendered, 639, 359)[0];
assert(sampled.tint[0] > sampled.tint[1] && sampled.tint[1] > sampled.tint[2]);
rendered.room.lights[0].drift = [1, 0];
assert.equal(lightAt(rendered, 638, 359), 1, "CPU sampling follows lamp drift");
sampleState.lightPixels = oldPixels;
sampleState.unlitPixels = oldUnlit;
rendered.room.lights = [];
rendered.time = "night";
const lanternPoint = lanternPosition(rendered);
assert.equal(rendered.lanternRadius, 120);
assert.equal(lightAt(rendered, ...lanternPoint), lanternStrength(rendered));
const footLight = lightAt(rendered, rendered.actor.x, rendered.actor.y);
assert(footLight > 0.3, "Lantern must visibly light the feet");
const strength = lanternStrength(rendered);
rendered.elapsed += 0.1;
assert.notEqual(lanternStrength(rendered), strength, "Flame flickers gently");
assert(Math.abs(lanternStrength(rendered) - strength) < 0.1);
key("l");
assert.equal(lightAt(rendered, ...lanternPoint), 0);
key("l");
assert.equal(controller.state.bloom, true);
key("g");
assert.equal(controller.state.bloom, false);
key("G");
assert.equal(controller.state.bloom, true);
assert.equal(lightAt(rendered, lanternPoint[0] + 120, lanternPoint[1]), 0);
rendered.room.lights = savedLights;
rendered.time = savedTime;
const glowPoint = lanternPosition(rendered);
assert(glowPoint[0] > rendered.actor.x && glowPoint[1] < rendered.actor.y);
rendered.actor.mirror = true;
assert(
  Math.abs(
    lanternPosition(rendered)[0] - (2 * rendered.actor.x - glowPoint[0]),
  ) < 1e-8,
);
rendered.actor.mirror = false;
assert(rendered.character.glowTexture);
const readable = rendered.room.items.find((item) => item.id === "about");
readable.content = rendered.items.find((item) => item.id === "workstation-1");
const open = rendered.verbRects.find((v) => v.label === "Open");
click(open.x + 2, open.y + 2);
click(...readable.position, 2);
assert.equal(rendered.running, true, "Double-clicking an object runs to it");
assert.equal(controller.state.reader, null, "Opening must wait for the walk");
settle();
assert.equal(controller.state.reader, "workstation-1");
assert.equal(location.hash, "#stone-house/workstation-1");
assert.equal(reader.hidden, false);
assert.equal(rendered.sound.duck.gain.calls.at(-1)[1], 0.25);
assert.equal(
  iframe.src,
  "https://adventure.test/dev/reader/workstation-1.html",
);
const frozen = JSON.stringify(controller.state);
const readerRenders = renderCount;
click(40, 300);
key("t");
key("g");
step(20);
assert.equal(
  JSON.stringify(controller.state),
  frozen,
  "Reader pauses input and simulation",
);
assert.equal(renderCount, readerRenders, "Reader pauses rendering");
event(reader, "keydown", { key: "Escape" });
assert.equal(reader.hidden, true);
assert.equal(controller.state.reader, null);
assert.equal(rendered.sound.duck.gain.calls.at(-1)[1], 1);
assert.equal(location.hash, "#stone-house");
assert.equal(document.activeElement, root);
const use = rendered.verbRects.find((v) => v.label === "Use");
click(use.x + 2, use.y + 2);
click(354, 186);
settle();
step(12);
assert(
  Math.abs(controller.state.lamps.find((l) => l.id === "oil").level - 0.52) <
    0.001,
);
step(13);
assert.equal(controller.state.lamps.find((l) => l.id === "oil").on, false);
assert(controller.state.lamps.find((l) => l.id === "oil").level < 0.01);
// Menu input shares actions with the bar and preserves its selected verb.
const selectedVerb = rendered.verb;
const lampBefore = controller.state.lamps.find((l) => l.id === "oil").on;
assert(
  event(root, "contextmenu", { clientX: 354, clientY: 186 }).defaultPrevented,
);
assert(rendered.menu);
const menu = rendered.menu;
const useRow = menu.verbs.indexOf("Use");
event(canvas, "pointermove", {
  clientX: menu.x + 6,
  clientY: menu.y + menu.listTop + useRow * menu.rowHeight,
});
assert.equal(sentence(rendered), "Use Oil lamp");
click(menu.x + 6, menu.y + menu.listTop + useRow * menu.rowHeight);
assert.equal(rendered.menu, null);
assert.equal(rendered.verb, selectedVerb);
settle();
assert.equal(
  controller.state.lamps.find((l) => l.id === "oil").on,
  !lampBefore,
);
for (const dismissal of ["escape", "outside", "document", "floor"]) {
  event(root, "contextmenu", { clientX: 354, clientY: 186 });
  const before = JSON.stringify(controller.state.position);
  if (dismissal === "escape") key("Escape");
  if (dismissal === "outside") click(600, 300);
  if (dismissal === "document") event(document, "click");
  if (dismissal === "floor")
    event(root, "contextmenu", { clientX: 600, clientY: 300 });
  assert.equal(rendered.menu, null);
  assert.equal(JSON.stringify(controller.state.position), before);
  assert.equal(controller.state.walking, false);
}
event(root, "contextmenu", {
  clientX: readable.position[0],
  clientY: readable.position[1],
});
key("ArrowUp");
assert.equal(rendered.menu.verbs[rendered.menu.selected], "Take");
key("ArrowDown");
assert.equal(rendered.menu.selected, 0);
key("ArrowDown");
key("Enter");
settle();
assert.equal(controller.state.reader, "workstation-1");
event(reader, "keydown", { key: "Escape" });
assert.equal(rendered.verb, selectedVerb);
assert(
  event(root, "contextmenu", { clientX: -20, clientY: -20 }).defaultPrevented,
);
assert.equal(rendered.menu, null);
const originalTime = controller.state.time;
key("t");
assert.notEqual(controller.state.time, originalTime);
step();
assert.notEqual(controller.state.time, originalTime);
const lantern = controller.state.lantern;
key("l");
assert.notEqual(controller.state.lantern, lantern);
const look = rendered.verbRects.find((v) => v.label === "Look at");
click(look.x + 2, look.y + 2);
click(180, 120);
settle();
const hotspot = rendered.room.items.find((item) => item.id === "window");
assert.equal(hotspot.label, "Window: The Linux kernel");
assert.equal(hotspot.content.id, "linux-kernel");
assert.equal(rendered.speech, hotspot.look);
assert(rendered.speechLines.length <= 2);
assert.equal(opened.length, 0, "Look at must not open a tab");
// The verb applies once, then returns to Walk to.
assert.equal(sentence(rendered), "Walk to Window: The Linux kernel");
const originalDescription = hotspot.look;
hotspot.look = "A long note about the kernel. ".repeat(30);
click(look.x + 2, look.y + 2);
click(180, 120);
settle();
assert(rendered.speechLines.length > 2);
assert.equal(rendered.speechLines.join(" ").trim(), hotspot.look.trim());
hotspot.look = originalDescription;
// Move away so the click can prove opening happens before movement.
click(600, 300);
settle();
click(open.x + 2, open.y + 2);
const beforeOpen = Array.from(controller.state.position);
click(180, 120);
assert.equal(opened.length, 1, "Tab must open synchronously during the click");
click(180, 120, 2);
assert.equal(opened.length, 1, "The second click must not open another tab");
assert.equal(rendered.running, true);
assert.deepEqual(Array.from(opened[0].args), [
  "https://www.kernel.org/",
  "_blank",
  "noopener,noreferrer",
]);
assert.deepEqual(opened[0].position, beforeOpen);
assert.deepEqual(Array.from(controller.state.position), beforeOpen);
assert(controller.state.walking);
assert.equal(controller.state.reader, null);
settle();
assert.equal(opened.length, 1, "Arrival must not open a second tab");
assert.equal(rendered.speech, "Let's see what's out there.");
assert.equal(location.hash, "#stone-house");
const originalLink = hotspot.content.link;
hotspot.content.link = null;
// Verbs apply once; a click may first skip a line still playing.
for (let i = 0; i < 2 && controller.state.verb !== "Open"; i++)
  click(open.x + 2, open.y + 2);
assert.equal(controller.state.verb, "Open");
click(180, 120);
assert.equal(
  opened.at(-1).args[0],
  "https://adventure.test/links/linux-kernel/",
);
settle();
hotspot.content.link = originalLink;
click(look.x + 2, look.y + 2);
click(80, 160);
settle();
assert.equal(rendered.speech, "That way lies harbour.");
readable.content = rendered.items.find((item) => item.id === "workstation-6");
location.hash = "#stone-house/workstation-6";
event(window, "hashchange");
await Promise.resolve();
assert.equal(controller.state.reader, "workstation-6");
location.hash = "#stone-house";
event(window, "hashchange");
await Promise.resolve();
assert.equal(controller.state.reader, null);
// Date ordering must override part ordering and filters must exclude newer non-matches.
rendered.items.push(
  {
    id: "new-link",
    type: "link",
    title: "New link",
    date: "2026-10-30",
    part: 99,
    tags: ["linux"],
  },
  {
    id: "wrong-tag",
    type: "link",
    title: "Wrong tag",
    date: "2026-10-31",
    tags: ["web"],
  },
  {
    id: "wrong-type",
    type: "post",
    title: "Wrong type",
    date: "2026-11-01",
    tags: ["linux"],
  },
);
rendered.world.rooms.second = {
  ...rendered.world.rooms["stone-house"],
  hotspots: {
    window: { content: { type: "link", tags: ["linux", "hardware"] } },
  },
};
event(root, "contextmenu", { clientX: 354, clientY: 186 });
assert(rendered.menu);
location.hash = "#second";
event(window, "hashchange");
await new Promise(setImmediate);
step();
assert.equal(controller.state.room, "second");
assert.equal(rendered.menu, null);
const rebound = rendered.room.items.find((item) => item.id === "window");
assert.equal(rebound.label, "Window: New link");
assert.equal(rebound.content.id, "new-link");
assert.equal(opened.length, 2, "Changing rooms must not open tabs");
click(open.x + 2, open.y + 2);
click(180, 120);
settle();
assert.equal(rendered.speech, "There is nothing to open here.");
assert.equal(opened.length, 2);
assert(soundEvents.some((event) => event.name === "lamp"));
assert(soundEvents.some((event) => event.name === "menu"));
// Exit effects fire for Use, Open and Walk to, but not Look at.
const exit = rendered.room.items.find((item) => item.kind === "exit");
exit.to = "unbuilt-room";
for (const verb of ["Use", "Open", "Walk to"]) {
  const barVerb = rendered.verbRects.find((v) => v.label === verb);
  if (barVerb) click(barVerb.x + 2, barVerb.y + 2);
  else rendered.verb = null;
  rendered.actor.x = exit.position[0];
  rendered.actor.y = exit.position[1];
  click(80, 160);
  settle();
}
assert.equal(soundEvents.filter((event) => event.name === "door").length, 0);
const originalFlames = rendered.character.flames["walk-side"];
const firstAudio = rendered.sound.context;
controller.destroy();
assert.equal(firstAudio.state, "closed");
assert.equal(nextFrame, null);
assert(root.removed);
// Loading with a deep link preserves the reader selection on Start.
location.hash = "#stone-house/found-about";
animationStart = 1;
const secondContainer = new Element("main");
const second = await startedBoot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: secondContainer,
});
event(secondContainer.children[0].children[1].children[3], "click");
step();
animationStart = 0;
assert.deepEqual(
  rendered.character.flames["walk-side"],
  originalFlames.slice(1),
  "Glow extraction starts at the animation's first column",
);
assert.equal(second.state.reader, "found-about");
// No matching content preserves the original room hotspot.
rendered.world.rooms.empty = {
  ...rendered.world.rooms["stone-house"],
  hotspots: { window: { content: { type: "missing" } } },
};
location.hash = "#empty";
event(window, "hashchange");
await new Promise(setImmediate);
step();
const unbound = rendered.room.items.find((item) => item.id === "window");
assert.equal(unbound.label, "Window");
assert.equal(unbound.content, undefined);
rendered.verb = "Take";
event(rendered.canvas, "click", { clientX: 180, clientY: 120 });
step(300);
assert.equal(rendered.speech, "It belongs to the keeper.");
rendered.verb = null;
const secondLook = rendered.verbRects.find((v) => v.label === "Look at");
event(rendered.canvas, "click", {
  clientX: secondLook.x + 2,
  clientY: secondLook.y + 2,
});
event(rendered.canvas, "click", { clientX: 180, clientY: 120 });
step(300);
assert.equal(rendered.speech, "The sea, calm tonight.");
second.destroy();
const assetsModule = await moduleAt("https://adventure.test/src/assets.js");
for (const field of ["link", "url"]) {
  for (const value of ["javascript:alert(1)", "data:text/html,test"]) {
    contentOverride = [{ id: "unsafe", type: "link", [field]: value }];
    await assert.rejects(
      assetsModule.namespace.loadWorld(
        "https://adventure.test/dev/data/world.json",
        "https://adventure.test/dev/data/content.json",
        location.origin,
      ),
      /require HTTP\(S\) URLs/,
    );
  }
}
contentOverride = [
  { id: "unsafe-reader", reader: "https://other.test/reader.html" },
];
await assert.rejects(
  assetsModule.namespace.loadWorld(
    "https://adventure.test/dev/data/world.json",
    "https://adventure.test/dev/data/content.json",
    location.origin,
  ),
  /Readers must stay on the page origin/,
);
contentOverride = undefined;
// Missing lamp drawings fail at the asset boundary.
missingLampDrawings = true;
location.hash = "";
await assert.rejects(
  startedBoot({
    world: "./real/world.json",
    content: "./data/content.json",
    element: new Element("main"),
  }),
  /one drawing per lamp/,
);
// Load the shipped art as well as the placeholders and walk on its own mask.
missingLampDrawings = false;
const realContainer = new Element("main");
const real = await startedBoot({
  world: "./real/world.json",
  content: "./data/content.json",
  element: realContainer,
});
event(realContainer.children[0].children[1].children[3], "click");
step();
assert.deepEqual(Array.from(rendered.room.size), [640, 360]);
assert.deepEqual(Array.from(rendered.character.frame), [128, 234]);
assert.equal(rendered.pixelScale, 4 / 3);
assert.equal(rendered.lanternRadius, 120);
assert(rendered.verbRects.every((v) => v.x >= 0 && v.x + v.width <= 640));
const realStart = real.state.position;
const targetX = Math.round(realStart[0]) + 60;
const targetY = Math.round(realStart[1]);
assert(rendered.room.walkable[targetY * 640 + targetX]);
event(rendered.canvas, "click", { clientX: targetX, clientY: targetY });
assert(real.state.walking);
step(10);
assert(real.state.position[0] > realStart[0]);
for (let i = 0; i < 600 && real.state.walking; i++) step();
assert.deepEqual(Array.from(real.state.position), [targetX, targetY]);
real.destroy();
console.log(
  "New asset loading, start, movement, readers, lamp fade, drift, time, lantern, descriptions, content-bound hotspots, click-time tabs, safe URLs, exits, hashes, and cleanup passed (mock DOM/GPU).",
);

// Book mode uses the shipped topic bindings and close-up assets.
location.hash = "#constructor";
const bookContainer = new Element("main");
const books = await startedBoot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: bookContainer,
});
const bookRoot = bookContainer.children[0],
  bookCanvas = bookRoot.children[0];
const bookReader = bookRoot.children[2];
event(bookRoot.children[1].children[3], "click");
step();
const bookSoundEvents = [];
const bookSoundEvent = rendered.sound.event.bind(rendered.sound);
rendered.sound.event = (name, volume) => {
  bookSoundEvents.push(name);
  return bookSoundEvent(name, volume);
};
assert.equal(rendered.objects.length, 6);
assert.equal(rendered.objects[0].label, "Workstation");
assert.equal(rendered.objects[0].book.items.length, 22);
const catalogue = bookRoot.children.find((node) => node.tagName === "nav");
for (const list of catalogue.children.filter((node) => node.tagName === "ul")) {
  for (const row of list.children) {
    const link = row.children[0];
    if (link.tagName === "a") {
      assert.equal(link.target, "_blank");
      assert.equal(link.rel, "noopener noreferrer");
      assert(link.href.startsWith("https://"));
    }
  }
}
const catalogueModule = await moduleAt(
  "https://adventure.test/src/catalogue.js",
);
assert.equal(
  catalogueModule.namespace.link("Reader only", null).tagName,
  "span",
);
assert.equal(catalogue.children.length, 17);
assert.equal(
  catalogue.children[1].children[1].children[0].href,
  "https://adventure.test/dev/reader/workstation-1.html",
);
event(bookRoot, "contextmenu", { clientX: 470, clientY: 140 });
assert.equal(rendered.menu.verbs.at(-1), "Take");
event(bookRoot, "keydown", { key: "ArrowDown" });
event(bookRoot, "keydown", { key: "ArrowDown" });
event(bookRoot, "keydown", { key: "Enter" });
for (let i = 0; i < 600 && books.state.walking; i++) step();
assert.equal(books.state.book, "workstation");
assert.equal(
  rendered.sound.duck.gain.value,
  1,
  "Book close-up keeps full ambience",
);
event(bookRoot, "keydown", { key: "Escape" });
const bookLook = rendered.verbRects.find((v) => v.label === "Look at");
event(bookCanvas, "click", {
  clientX: bookLook.x + 2,
  clientY: bookLook.y + 2,
});
event(bookCanvas, "click", { clientX: 470, clientY: 140 });
for (let i = 0; i < 600 && books.state.walking; i++) step();
assert.equal(rendered.speech, "Workstation. 22 entries.");
// Look at applied once; the next click skips the line, then walks to the book.
assert.equal(books.state.verb, null);
event(bookCanvas, "click", { clientX: 470, clientY: 140 });
event(bookCanvas, "click", { clientX: 470, clientY: 140 });
assert.equal(books.state.book, null, "Book waits for arrival");
for (let i = 0; i < 600 && books.state.walking; i++) step();
assert.equal(books.state.book, "workstation");
assert.equal(location.hash, "#stone-house/book/workstation/0");
const bookPosition = JSON.stringify(books.state.position);
event(bookRoot, "keydown", { key: "ArrowRight" });
step(30);
assert.equal(books.state.spread, 1);
assert.equal(location.hash, "#stone-house/book/workstation/1");
const entry = rendered.activeBook.pages[2].entries[0];
event(bookCanvas, "pointermove", {
  clientX: entry.x + 1,
  clientY: entry.y + 1,
});
assert.equal(rendered.hover, entry);
assert.equal(bookCanvas.style.cursor, "pointer");
event(bookCanvas, "click", { clientX: entry.x + 1, clientY: entry.y + 1 });
assert.equal(books.state.reader, entry.item.id);
assert.equal(bookReader.children[2].href, entry.item.url);
assert.equal(bookReader.children[2].rel, "noopener noreferrer");
assert.equal(bookReader.children[2].target, "_blank");
let readerEscapeStopped = false;
bookReader.addEventListener("keydown", (event) => {
  readerEscapeStopped = event.cancelBubble;
});
event(bookReader, "keydown", { key: "Escape" });
assert(
  readerEscapeStopped,
  "Reader Escape must stop before reaching the room key handler",
);
assert.equal(books.state.reader, null);
assert.equal(books.state.spread, 1);
assert.equal(location.hash, "#stone-house/book/workstation/1");
event(bookCanvas, "click", { clientX: 345, clientY: 290 });
step(30);
assert.equal(books.state.spread, 1, "Interior blank space does not turn");
event(bookCanvas, "click", { clientX: 95, clientY: 290 });
step(30);
assert.equal(books.state.spread, 0, "Lower left corner turns previous");
event(bookCanvas, "click", { clientX: 545, clientY: 290 });
step(30);
assert.equal(books.state.spread, 1, "Lower right corner turns next");
// Pointer capture keeps the turn tied to the drag, including cancellation.
event(bookCanvas, "pointermove", { clientX: 80, clientY: 310 });
assert.equal(rendered.corner, -1);
assert.equal(bookCanvas.style.cursor, "pointer");
event(bookCanvas, "pointerleave");
assert.equal(rendered.corner, 0);
const dragTurn = (to, expected, cancel = false) => {
  event(bookCanvas, "pointerdown", {
    button: 0,
    pointerId: 7,
    clientX: 98,
    clientY: 310,
  });
  assert(rendered.turning?.dragging);
  event(bookCanvas, "pointermove", { clientX: to, clientY: 310 });
  const progress = rendered.turning.progress;
  step(3);
  assert.equal(
    rendered.turning.progress,
    progress,
    "Held page does not animate on its own",
  );
  event(bookCanvas, cancel ? "pointercancel" : "pointerup", {
    pointerId: 7,
    clientX: to,
    clientY: 310,
  });
  event(bookCanvas, "click", { clientX: to, clientY: 310 });
  assert.equal(
    books.state.reader,
    null,
    "Drag release must suppress entry activation",
  );
  step(30);
  assert.equal(books.state.spread, expected);
};
dragTurn(145, 1);
dragTurn(260, 1, true);
dragTurn(260, 0);
assert.equal(location.hash, "#stone-house/book/workstation/0");
// A press on an entry still opens the reader instead of starting a drag.
const firstEntry = rendered.activeBook.pages[0].entries[0];
event(bookCanvas, "pointerdown", {
  button: 0,
  pointerId: 8,
  clientX: firstEntry.x + 1,
  clientY: firstEntry.y + 1,
});
assert.equal(rendered.turning, null);
event(bookCanvas, "click", {
  clientX: firstEntry.x + 1,
  clientY: firstEntry.y + 1,
});
assert.equal(books.state.reader, firstEntry.item.id);
event(bookReader, "keydown", { key: "Escape" });
event(bookRoot, "keydown", { key: "Escape" });
assert.equal(books.state.book, null);
assert.equal(JSON.stringify(books.state.position), bookPosition);
location.hash = "#stone-house/book/workstation/2";
event(window, "hashchange");
await Promise.resolve();
assert.equal(books.state.spread, rendered.activeBook.pages.length / 2 - 1);
event(bookCanvas, "click", { clientX: 20, clientY: 20 });
assert.equal(books.state.book, "workstation", "Outside click keeps book open");
event(bookRoot, "contextmenu", { clientX: 20, clientY: 20 });
assert.equal(books.state.book, null, "Right click closes book");
location.hash = "#stone-house/book/workstation/999";
event(window, "hashchange");
await Promise.resolve();
assert.equal(
  books.state.spread,
  rendered.activeBook.pages.length / 2 - 1,
  "Out-of-range spread clamps",
);
event(bookCanvas, "click", { clientX: 15, clientY: 345 });
assert.equal(books.state.book, null, "Close verb returns to room");
assert(bookSoundEvents.includes("book-open"));
assert(bookSoundEvents.includes("book-close"));
assert(bookSoundEvents.includes("page-turn"));
books.destroy();
location.hash = "#stone-house/book/workstation/1";
const reloadContainer = new Element("main");
const reloaded = await startedBoot({
  world: "./real/world.json",
  content: "./data/content.json",
  element: reloadContainer,
});
event(reloadContainer.children[0].children[1].children[3], "click");
step();
assert.equal(reloaded.state.book, "workstation");
assert.equal(reloaded.state.spread, 1);
reloaded.destroy();
console.log(
  "Topic shelves, catalogue, look, click-to-open, turns, entry hits, reader return, website link, closing, routing, and reload passed (mock DOM/GPU).",
);

// Task 18: panel boundaries, session inventory, book hotspots and actual travel.
const inventoryKey = "adventure.inventory";
const stored = new Map();
const storage = {
  getItem(key) {
    return stored.get(key) ?? null;
  },
  setItem(key, value) {
    stored.set(key, value);
  },
  removeItem(key) {
    stored.delete(key);
  },
};
window.localStorage = storage;
location.hash = "#stone-house";
const adventureContainer = new Element("main");
const adventure = await startedBoot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: adventureContainer,
});
const adventureRoot = adventureContainer.children[0],
  adventureCanvas = adventureRoot.children[0];
event(adventureRoot.children[1].children[3], "click");
step();
const tap = (x, y) =>
  event(adventureCanvas, "click", { clientX: x, clientY: y });
const select = (label) => {
  if (label === "Walk to") {
    if (rendered.verb) {
      const selected = rendered.verbRects.find(
        (rect) => rect.label === rendered.verb,
      );
      tap(selected.x + 1, selected.y + 1);
    }
    return;
  }
  // A tap may first skip a line still playing.
  const rect = rendered.verbRects.find((rect) => rect.label === label);
  for (let i = 0; i < 2 && rendered.verb !== label; i++)
    tap(rect.x + 1, rect.y + 1);
  assert.equal(rendered.verb, label);
};
const arrive = () => {
  for (let i = 0; i < 600 && adventure.state.walking; i++) step();
  assert(!adventure.state.walking);
};
assert.deepEqual(
  Array.from(rendered.verbRects, (rect) => rect.label),
  Array.from(rendered.world.verbs),
);
assert(!rendered.room.walkable.slice(324 * 640).some(Boolean));
for (const [x, y] of [
  [0, 324],
  [639, 324],
  [0, 359],
  [639, 359],
  [8, 339],
  [640, 350],
]) {
  tap(x, y);
  assert.equal(
    adventure.state.walking,
    false,
    `Panel click at ${x},${y} must not walk`,
  );
}
const topic = rendered.objects[0];
select("Take");
tap(...topic.position);
arrive();
assert.deepEqual(Array.from(adventure.state.inventory), ["workstation"]);
assert.deepEqual(JSON.parse(stored.get(inventoryKey)), [
  { kind: "book", id: "workstation" },
]);
assert.equal(rendered.objects.length, 6, "Shelf keeps its book");
assert.equal(rendered.verb, null, "Take applies once");
select("Take");
tap(...topic.position);
arrive();
assert.equal(rendered.speech, "I already have it.");
assert.equal(adventure.state.inventory.length, 1);
let slot = rendered.panel.slots[0];
select("Look at");
tap(slot.x + 1, slot.y + 1);
assert.equal(rendered.speech, "Workstation. 22 entries.");
for (const verb of ["Open"]) {
  select(verb);
  tap(slot.x + 1, slot.y + 1);
  assert.equal(adventure.state.book, "workstation");
  const panelModule = await moduleAt("https://adventure.test/src/panel.js");
  const site = panelModule.namespace.siteLayout(rendered);
  tap(site.x + 1, site.y + 1);
  assert.equal(
    clickedLinks.at(-1).href,
    "https://adventure.test/posts/manage-dotfiles-with-yadm/#series",
  );
  event(adventureRoot, "keydown", { key: "Escape" });
}
for (const verb of ["Talk to"]) {
  select(verb);
  tap(slot.x + 1, slot.y + 1);
  assert.equal(rendered.speech, "I can't do that.");
}
select("Walk to");
tap(slot.x + 1, slot.y + 1);
assert.equal(rendered.selectedItem.book.id, "workstation");
const windowTarget = rendered.room.items.find((item) => item.id === "window");
event(adventureCanvas, "pointermove", {
  clientX: windowTarget.position[0],
  clientY: windowTarget.position[1],
});
assert.equal(sentence(rendered), `Use Workstation with ${windowTarget.label}`);
tap(...windowTarget.position);
assert.equal(rendered.speech, "I can't use those together.");
assert.equal(sentence(rendered), `Use Workstation with ${windowTarget.label}`);
assert.equal(rendered.selectedItem, null);
select("Talk to");
tap(...topic.position);
assert.equal(rendered.speech, "I can't do that.");
for (let i = 1; i < 20; i++)
  rendered.inventory.push({ ...rendered.inventory[0], label: `Copy ${i}` });
tap(rendered.panel.next.x + 1, rendered.panel.next.y + 1);
assert.equal(rendered.inventoryOffset, rendered.panel.slots.length);
tap(rendered.panel.previous.x + 1, rendered.panel.previous.y + 1);
assert.equal(rendered.inventoryOffset, 0);
rendered.inventory.splice(1);
const travel = async (target, to, verb = "Walk to") => {
  select(verb);
  tap(...target.position);
  arrive();
  assert.equal(rendered.transition.phase, "out");
  step(5);
  assert(
    Number(
      adventureRoot.children.find(
        (child) => child.className === "adventure-fade",
      ).style.opacity,
    ) > 0,
  );
  for (let i = 0; i < 100 && rendered.transition; i++) {
    step();
    await new Promise(setImmediate);
  }
  assert.equal(adventure.state.room, to);
  assert.equal(rendered.transition, null);
  assert.equal(location.hash, `#${to}`);
};
await travel(
  rendered.room.items.find((item) => item.kind === "exit"),
  "harbour",
);
assert.deepEqual(Array.from(adventure.state.position), [572, 245]);
assert.equal(rendered.actor.animation, "idle-side");
assert.equal(rendered.actor.mirror, true, "Arrival faces left into harbour");
assert.deepEqual(Array.from(adventure.state.inventory), ["workstation"]);
const board = rendered.room.items.find((item) => item.id === "noticeboard");
assert.equal(board.board.id, "links");
select("Take");
tap(...board.position);
arrive();
assert.equal(rendered.speech, "Open it and pick a notice.");
assert.equal(adventure.state.board, null);

for (const verb of ["Open", "Walk to"]) {
  select(verb);
  tap(...board.position);
  arrive();
  assert.equal(adventure.state.board, "links");
  assert.equal(location.hash, "#harbour/board/links/0");
  event(adventureRoot, "keydown", { key: "Escape" });
}
select("Open");
tap(...board.position);
arrive();
const panelModule = await moduleAt("https://adventure.test/src/panel.js");
const checkSite = (path) => {
  const rect = panelModule.namespace.siteLayout(rendered);
  assert.equal(rect.path, path);
  assert(rect.x + rect.width <= rendered.panel.sound.x - 8);
  event(adventureCanvas, "pointermove", {
    clientX: rect.x + 1,
    clientY: rect.y + 1,
  });
  assert.equal(sentence(rendered), `Open ${path} on the site`);
  const count = clickedLinks.length;
  tap(rect.x + 1, rect.y + 1);
  assert.equal(clickedLinks.length, count + 1);
  assert.deepEqual(clickedLinks.at(-1), {
    href: `https://adventure.test${path}`,
    target: "_blank",
    rel: "noopener noreferrer",
  });
  event(adventureCanvas, "pointerleave");
  assert.equal(rendered.siteHover, false);
};
checkSite("/links/");
const linkEntry = rendered.activeBoard.items[0];
const notice = rendered.activeBoard.art.notices[0];
const linksBefore = clickedLinks.length;
tap(notice.at[0] + 1, notice.at[1] + 1);
assert.equal(adventure.state.note, linkEntry.id);
tap(...rendered.activeBoard.art.note.go.slice(0, 2));
assert.equal(clickedLinks.length, linksBefore + 1);
assert.deepEqual(clickedLinks.at(-1), {
  href: linkEntry.link,
  target: "_blank",
  rel: "noopener noreferrer",
});
assert.equal(sentence(rendered), "Opening the link…");
assert.equal(adventure.state.reader, null);
assert.equal(adventure.state.board, "links");
step(250);
assert(rendered.elapsed > rendered.speechUntil, "Close-up messages expire");
event(adventureRoot, "keydown", { key: "Escape" });
await travel(
  rendered.room.items.find((item) => item.kind === "exit"),
  "stone-house",
  "Use",
);
const entrance = rendered.room.items.find((item) => item.kind === "exit");
const pathfinding = await moduleAt("https://adventure.test/src/pathfinding.js");
assert.deepEqual(
  Array.from(adventure.state.position),
  Array.from(
    pathfinding.namespace.nearestWalkable(
      rendered.room.walkable,
      ...entrance.position,
      rendered.room.size,
    ),
  ),
);
assert.equal(rendered.actor.animation, "idle-side");
assert.equal(rendered.actor.mirror, false, "Arrival faces right into study");
// A destination without an exit pointing back uses its spawn.
rendered.world.rooms["no-return"] = rendered.world.rooms["stone-house"];
entrance.to = "no-return";
await travel(entrance, "no-return");
assert.deepEqual(Array.from(adventure.state.position), [120, 300]);
// Board hash restoration, page controls, note Back and all close gestures.
const notices = rendered.boards.links;
notices.items = Array.from({ length: 14 }, (_, i) => ({
  ...notices.items[0],
  id: `notice-${i}`,
}));
rendered.turning = { progress: 0.3, direction: 1 };
location.hash = "#harbour/board/links/1";
event(window, "hashchange");
await new Promise(setImmediate);
step();
assert.equal(adventure.state.board, "links");
assert.equal(rendered.turning, null);
assert.equal(adventure.state.page, 1);
tap(...notices.art.older.slice(0, 2));
assert.equal(adventure.state.page, 2);
assert.equal(location.hash, "#harbour/board/links/2");
tap(...notices.art.older.slice(0, 2));
assert.equal(adventure.state.page, 2, "Last page cannot advance");
tap(...notices.art.newer.slice(0, 2));
assert.equal(adventure.state.page, 1);
tap(...notices.art.notices[0].at);
assert.equal(adventure.state.note, "notice-6");
const boardModule = await moduleAt("https://adventure.test/src/board.js");
const takeRect = boardModule.namespace.noteTakeRect(notices.art);
const beforeTaking = adventure.state.inventory.length;
tap(takeRect.x, takeRect.y);
assert.equal(rendered.speech, "I'll keep this one.");
assert.equal(rendered.speechUntil - rendered.elapsed, 3.5);
assert.equal(adventure.state.inventory.length, beforeTaking + 1);
assert.deepEqual(JSON.parse(stored.get(inventoryKey)).at(-1), {
  kind: "notice",
  id: rendered.boardNote.id,
});
assert.equal(notices.items.length, 14, "Taken notice stays on board");
let taken = rendered.inventory.at(-1);
assert.equal(taken.sprite, notices.art.sprites[notices.art.notices[0].paper]);
assert.equal(taken.pin, notices.art.sprites[notices.art.pin]);
tap(takeRect.x, takeRect.y);
assert.equal(
  rendered.speech,
  "I'll keep this one.",
  "Inactive take does not speak again",
);
assert.equal(adventure.state.inventory.length, beforeTaking + 1);
tap(...notices.art.note.back.slice(0, 2));
assert.equal(adventure.state.note, null);
assert.equal(adventure.state.page, 1);
// Fill the mixed inventory by taking each distinct notice through the board UI.
for (let page = 0; page <= 2; page++) {
  while (rendered.boardPage > page) tap(...notices.art.newer.slice(0, 2));
  while (rendered.boardPage < page) tap(...notices.art.older.slice(0, 2));
  const count = Math.min(
    notices.art.notices.length,
    notices.items.length - page * notices.art.notices.length,
  );
  for (let i = 0; i < count; i++) {
    tap(...notices.art.notices[i].at);
    tap(takeRect.x, takeRect.y);
    tap(...notices.art.note.back.slice(0, 2));
  }
}
assert.equal(adventure.state.inventory.length, beforeTaking + 14);
taken = rendered.inventory.at(-1);
event(adventureRoot, "contextmenu");
assert.equal(adventure.state.board, null);
location.hash = "#harbour/board/links/999";
event(window, "hashchange");
assert.equal(adventure.state.page, 2, "Hash pages clamp");
tap(10, 344);
assert.equal(adventure.state.board, null, "Footer closes board");
const accessible = adventureRoot.children.find(
  (child) => child.tagName === "nav",
);
assert(
  accessible.children
    .at(-2)
    .children.every((row) => row.children[0].href.startsWith("https://")),
);
// Carry a notice into another room, then open it without walking or showing the board.
location.hash = "#stone-house";
event(window, "hashchange");
await new Promise(setImmediate);
step();
rendered.inventoryOffset = 0;
while (
  rendered.inventoryOffset + rendered.panel.slots.length <
  rendered.inventory.length
)
  tap(rendered.panel.next.x + 1, rendered.panel.next.y + 1);
assert(
  rendered.inventoryOffset > 0,
  "Scroll mixed inventory to carried notice",
);
const noticeSlot =
  rendered.panel.slots[
    (rendered.inventory.length - 1) % rendered.panel.slots.length
  ];
const noticePosition = JSON.stringify(adventure.state.position);
for (const verb of ["Look at", "Open", "Walk to"]) {
  select(verb);
  tap(noticeSlot.x + 1, noticeSlot.y + 1);
  assert.equal(adventure.state.room, "stone-house");
  assert.equal(JSON.stringify(adventure.state.position), noticePosition);
  assert.equal(adventure.state.walking, false);
  if (verb === "Look at") assert.equal(rendered.speech, taken.note.title);
  else {
    assert.equal(adventure.state.note, taken.note.id);
    assert.equal(rendered.inventoryNote, true);
    const count = clickedLinks.length;
    tap(...notices.art.note.go.slice(0, 2));
    assert.equal(clickedLinks.length, count + 1);
    assert.equal(clickedLinks.at(-1).href, taken.note.link);
    assert.equal(clickedLinks.at(-1).rel, "noopener noreferrer");
    tap(...notices.art.note.back.slice(0, 2));
    assert.equal(adventure.state.board, null);
    assert.equal(location.hash, "#stone-house");
  }
}
location.hash = "#harbour";
event(window, "hashchange");
await new Promise(setImmediate);
step();
// Beacon Use never toggles or starts a walk.
const beaconTarget = rendered.room.items.find(
  (item) => item.light === "beacon",
);
select("Use");
tap(...beaconTarget.position);
assert.equal(rendered.speech, "Too far away.");
assert.equal(adventure.state.walking, false);
assert.equal(rendered.room.lights[0].on, true);
rendered.elapsed = 4.484;
step();
assert(Math.abs(rendered.room.lights[0].strength - 1) < 1e-8);
rendered.elapsed = 5.984;
step();
assert.equal(rendered.room.lights[0].strength, 0);
// Map exits travel immediately, without pathfinding, and use the map entrance.
await travel(
  rendered.room.items.find((item) => item.to === "map"),
  "map",
);
assert.equal(adventure.state.position, null);
assert.equal(adventure.state.walking, false);
tap(300, 250);
assert.equal(adventure.state.walking, false);
const mapPlace = rendered.room.items.find((item) => item.to === "stone-house");
event(adventureCanvas, "pointermove", {
  clientX: mapPlace.position[0],
  clientY: mapPlace.position[1],
});
assert.equal(sentence(rendered), "Go to Study");
assert.equal(lanternStrength(rendered), 0);
assert.deepEqual(Array.from(lanternPosition(rendered)), [0, 0]);
await travel(mapPlace, "stone-house");
const mapEntrance = rendered.room.items.find((item) => item.to === "map");
assert.deepEqual(
  Array.from(adventure.state.position),
  Array.from(
    pathfinding.namespace.nearestWalkable(
      rendered.room.walkable,
      ...mapEntrance.position,
      rendered.room.size,
    ),
  ),
);
// Found about and talk papers use their own Look line and embedded reader.
for (const kind of ["about", "talk"]) {
  const paper = rendered.room.items.find((item) => item.id === kind);
  for (const verb of ["Look at", "Open", "Walk to"]) {
    select(verb);
    const tabs = opened.length;
    tap(...paper.position);
    arrive();
    assert.equal(opened.length, tabs, "Found papers do not open external tabs");
    if (verb === "Look at") assert.equal(rendered.speech, paper.look);
    else {
      assert.equal(adventure.state.reader, `found-${kind}`);
      checkSite(kind === "about" ? "/about/" : "/talks/");
      event(adventureRoot.children[2], "keydown", { key: "Escape" });
    }
  }
}
// Reader routes also restore content bound to a hotspot.
location.hash = "#stone-house/found-about";
event(window, "hashchange");
assert.equal(adventure.state.reader, "found-about");
event(adventureRoot.children[2], "keydown", { key: "Escape" });
select("Look at");
const lookAgain = rendered.verbRects.find((rect) => rect.label === "Look at");
tap(lookAgain.x + 1, lookAgain.y + 1);
assert.equal(
  adventure.state.verb,
  null,
  "Clicking selected verb restores default walk",
);
assert.equal(sentence(rendered), "Walk to");
// A map destination without a return exit falls back to spawn.
location.hash = "#map";
event(window, "hashchange");
await new Promise(setImmediate);
step();
rendered.world.rooms["other-map"] = rendered.world.rooms.map;
location.hash = "#other-map";
event(window, "hashchange");
await new Promise(setImmediate);
step();
await travel(rendered.room.items[0], "stone-house");
assert.deepEqual(Array.from(adventure.state.position), [120, 300]);
console.log(
  "Board paging, note Back, hash restore, close gestures, accessible links, beacon Use and cycle, map travel and found about/talk readers passed.",
);
adventure.destroy();
const savedInventory = stored.get(inventoryKey);
const savedEntries = JSON.parse(savedInventory);
contentOverride = [
  ...JSON.parse(readFileSync(base + "dev/data/content.json", "utf8")).items,
  ...notices.items,
];
stored.set(
  inventoryKey,
  JSON.stringify([
    ...savedEntries,
    { kind: "book", id: "deleted-book" },
    { kind: "notice", id: "deleted-notice" },
    { kind: "book", id: "__proto__" },
    { kind: "other", id: "workstation" },
    { kind: "book", id: "workstation" },
    null,
  ]),
);
location.hash = "#harbour/book/workstation/1";
const freshContainer = new Element("main");
const fresh = await startedBoot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: freshContainer,
});
assert.deepEqual(
  Array.from(fresh.state.inventory),
  savedEntries.map((entry) => entry.id),
  "New session restores books and notices and drops stale or invalid entries",
);
assert.equal(
  stored.get(inventoryKey),
  savedInventory,
  "Restore rewrites only valid identifiers",
);
assert.equal(fresh.state.room, "harbour");
assert.equal(
  fresh.state.book,
  "workstation",
  "Initial routes accept carried books outside their shelf room",
);
assert.equal(fresh.state.spread, 1);
location.hash = "#stone-house";
event(window, "hashchange");
await new Promise(setImmediate);
const freshRoot = freshContainer.children[0];
event(freshRoot.children[1].children[3], "click");
step();
assert.deepEqual(Array.from(fresh.state.position), [120, 300]);
assert.equal(rendered.elapsed, 0, "Elapsed time starts fresh");
assert.equal(rendered.lantern, true);
assert.equal(rendered.timeOverride, false);
assert(rendered.inventory[0].sprite.texture, "Restored book has its sprite");
assert(rendered.inventory.at(-1).pin.texture, "Restored notice has its pin");
// Restored items retain their actions and duplicate protection.
event(freshRoot.children[0], "click", { clientX: 70, clientY: 345 });
event(freshRoot.children[0], "click", {
  clientX: rendered.panel.slots[0].x + 1,
  clientY: rendered.panel.slots[0].y + 1,
});
assert.equal(fresh.state.book, "workstation");
event(freshRoot, "keydown", { key: "Escape" });
rendered.selectedItem = rendered.inventory[0];
rendered.inventoryOffset = rendered.panel.slots.length;
event(freshRoot.children[0], "click", {
  clientX: rendered.panel.forget.x + 1,
  clientY: rendered.panel.forget.y + 1,
});
assert.deepEqual(Array.from(fresh.state.inventory), []);
assert.equal(stored.has(inventoryKey), false);
assert.equal(rendered.speech, "Pockets emptied.");
assert.equal(rendered.selectedItem, null);
assert.equal(rendered.inventoryOffset, 0);
assert.equal(fresh.state.walking, false);
fresh.destroy();
contentOverride = undefined;
for (const value of ["{broken", "null", "{}", '"text"']) {
  stored.set(inventoryKey, value);
  const instance = await startedBoot({
    world: "./data/world.json",
    content: "./data/content.json",
    element: new Element("main"),
  });
  assert.deepEqual(
    Array.from(instance.state.inventory),
    [],
    "Corrupt storage is ignored",
  );
  instance.destroy();
}
// Blocked access, missing storage, quota failures, and failed deletion stay silent.
for (const failure of [
  "missing",
  "access",
  "getItem",
  "setItem",
  "removeItem",
]) {
  stored.clear();
  if (failure === "missing") window.localStorage = undefined;
  else if (failure === "access")
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("Storage blocked");
      },
    });
  else
    window.localStorage = {
      ...storage,
      [failure]() {
        throw new Error("Storage unavailable");
      },
    };
  const target = new Element("main");
  const instance = await startedBoot({
    world: "./data/world.json",
    content: "./data/content.json",
    element: target,
  });
  const root = target.children[0],
    canvas = root.children[0];
  event(root.children[1].children[3], "click");
  step();
  const take = rendered.verbRects.find((rect) => rect.label === "Take");
  event(canvas, "click", { clientX: take.x + 1, clientY: take.y + 1 });
  const book = rendered.objects[0];
  event(canvas, "click", {
    clientX: book.position[0],
    clientY: book.position[1],
  });
  for (let i = 0; i < 600 && instance.state.walking; i++) step();
  assert.deepEqual(
    Array.from(instance.state.inventory),
    ["workstation"],
    failure,
  );
  event(canvas, "click", {
    clientX: rendered.panel.forget.x + 1,
    clientY: rendered.panel.forget.y + 1,
  });
  assert.deepEqual(Array.from(instance.state.inventory), [], failure);
  assert.equal(rendered.speech, "Pockets emptied.");
  instance.destroy();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: storage,
  });
}
stored.clear();
console.log(
  "Inventory persistence, stale IDs, corrupt JSON, unavailable storage and Forget passed. Panel actions, scrolling, hotspots and travel passed.",
);

{
  // Real lighthouse masks and bindings must open the found papers after arrival.
  location.hash = "#lighthouse";
  const realContainer = new Element("main");
  const real = await startedBoot({
    world: "./real/world.json",
    content: "./data/content.json",
    element: realContainer,
  });
  const realRoot = realContainer.children[0],
    realCanvas = realRoot.children[0];
  event(realRoot.children[1].children[3], "click");
  step();
  for (const [id, kind] of [
    ["letter", "about"],
    ["logbook", "talk"],
  ]) {
    const paper = rendered.room.items.find((item) => item.id === id);
    assert.equal(paper.content.type, kind);
    const take = rendered.verbRects.find((rect) => rect.label === "Take");
    event(realCanvas, "click", { clientX: take.x + 1, clientY: take.y + 1 });
    const takePixel = rendered.room.ids.findIndex(
      (value) => rendered.room.items[value] === paper,
    );
    event(realCanvas, "click", {
      clientX: takePixel % 640,
      clientY: Math.floor(takePixel / 640),
    });
    for (let i = 0; i < 600 && real.state.walking; i++) step();
    assert.equal(rendered.speech, "It belongs to the keeper.");
    assert.equal(real.state.reader, null);
    assert.equal(rendered.verb, null, "Take applies once");
    const pixel = rendered.room.ids.findIndex(
      (value) => rendered.room.items[value] === paper,
    );
    const x = pixel % 640,
      y = Math.floor(pixel / 640);
    for (const verb of [null, "Open"]) {
      if (verb) {
        const rect = rendered.verbRects.find((rect) => rect.label === verb);
        event(realCanvas, "click", {
          clientX: rect.x + 1,
          clientY: rect.y + 1,
        });
      }
      const tabs = opened.length;
      event(realCanvas, "click", { clientX: x, clientY: y });
      assert(real.state.walking, `${id} starts walking`);
      assert.equal(real.state.reader, null, "Reader waits for arrival");
      for (let i = 0; i < 600 && real.state.walking; i++) step();
      assert.equal(
        real.state.reader,
        `found-${kind}`,
        `${id}: ${verb || "plain click"}: ${rendered.speech}`,
      );
      assert.equal(realRoot.children[2].children[1].src, paper.content.reader);
      const elapsed = rendered.elapsed;
      for (let i = 0; i < 200; i++) step();
      assert(
        rendered.elapsed >= elapsed + 3,
        "Reader keeps feedback expiry clock running",
      );
      assert.equal(opened.length, tabs);
      event(realRoot.children[2], "keydown", { key: "Escape" });
      if (verb) {
        const rect = rendered.verbRects.find((rect) => rect.label === verb);
        event(realCanvas, "click", {
          clientX: rect.x + 1,
          clientY: rect.y + 1,
        });
      }
    }
  }
  // Direct lighthouse travel uses the path exit, with the normal fade, bypassing the map.
  const realTap = (x, y) =>
    event(realCanvas, "click", { clientX: x, clientY: y });
  const enterRoom = async (id) => {
    location.hash = `#${id}`;
    event(window, "hashchange");
    await new Promise(setImmediate);
    step();
  };
  const itemPixel = (item) => {
    const i = rendered.room.ids.findIndex(
      (value) => rendered.room.items[value] === item,
    );
    return [i % 640, Math.floor(i / 640)];
  };
  for (const verb of [null, "Open", "Walk to"]) {
    await enterRoom("harbour");
    rendered.verb = verb;
    const target = rendered.room.items.find((item) => item.id === "lighthouse");
    const path = rendered.room.items.find((item) => item.id === "path");
    assert.equal(target.via, path);
    assert.equal(path.to, "map");
    rendered.speechUntil = 0;
    rendered.verb = null;
    const [px, py] = itemPixel(path);
    event(realCanvas, "pointermove", { clientX: px, clientY: py });
    assert.equal(sentence(rendered), "Walk to Island path");
    assert(
      decodeURIComponent(realCanvas.style.cursor).includes("rotate(0 12 12)"),
    );
    rendered.verb = "Look at";
    realTap(...itemPixel(target));
    for (let i = 0; i < 600 && real.state.walking; i++) step();
    assert.equal(
      rendered.speech,
      rendered.world.voices[
        rendered.room.config.looks[target.id] ||
          rendered.room.config.hotspots[target.id].look
      ].text,
    );
    assert.equal(real.state.room, "harbour");
    rendered.verb = verb;
    realTap(...itemPixel(target));
    assert.equal(rendered.pending.target, target);
    assert.equal(rendered.pending.target.via.id, "path");
    for (let i = 0; i < 600 && real.state.walking; i++) step();
    assert.equal(rendered.transition.to, "lighthouse");
    const pathPoint = pathfinding.namespace.nearestWalkable(
      rendered.room.walkable,
      ...path.position,
      rendered.room.size,
    );
    assert.deepEqual(Array.from(real.state.position), Array.from(pathPoint));
    for (let i = 0; i < 100 && rendered.transition; i++) {
      step();
      await new Promise(setImmediate);
    }
    assert.equal(real.state.room, "lighthouse");
    assert.equal(location.hash, "#lighthouse");
    assert.equal(
      rendered.room.items.find((item) => item.id === "stairs").to,
      "map",
    );
  }
  // Baselines come from the lowest mask row of each real foreground item.
  for (const [room, ids] of [
    ["harbour", ["cargo", "quay-posts"]],
    ["stone-house", ["chair"]],
  ]) {
    await enterRoom(room);
    for (const id of ids) {
      const item = rendered.room.items.find((item) => item.id === id);
      const index = rendered.room.items.indexOf(item);
      const pixels = Array.from(rendered.room.ids).flatMap((value, i) =>
        value === index ? [i] : [],
      );
      const baseline = Math.max(...pixels.map((i) => Math.floor(i / 640)));
      assert.equal(item.baseline, baseline);
      for (const i of pixels) {
        const mask = rendered.room.foreground.slice(i * 4, i * 4 + 4);
        assert.equal(mask[0] * 256 + mask[1], baseline);
        assert.equal(mask[3], 255);
      }
      for (const feet of [baseline - 1, baseline, baseline + 1]) {
        const mask = rendered.room.foreground.slice(
          pixels[0] * 4,
          pixels[0] * 4 + 4,
        );
        assert.equal(feet < mask[0] * 256 + mask[1], feet < baseline);
      }
    }
  }
  real.destroy();
  console.log("Real lighthouse letter and logbook readers passed.");
}

// Keep real input events for voice behavior; other cases wait between replies.
location.hash = "#stone-house";
stored.set(inventoryKey, JSON.stringify([{ kind: "book", id: "workstation" }]));
const voiceContainer = new Element("main");
const voiceGame = await startedBoot({
  world: "./real/world.json",
  content: "./data/content.json",
  element: voiceContainer,
});
step();
await new Promise(setImmediate);
const voiceRoot = voiceContainer.children[0],
  voiceCanvas = voiceRoot.children[0];
assert.equal(rendered.speech, rendered.world.voices["study-enter"].text);
const lookVoice = rendered.verbRects.find((rect) => rect.label === "Look at");
rawEvent(voiceCanvas, "click", {
  clientX: lookVoice.x + 1,
  clientY: lookVoice.y + 1,
});
assert.equal(rendered.speech, null, "Click skips text-only entry speech");
assert.equal(rendered.verb, null, "Skip click cannot select a verb");
assert.equal(rendered.path.length, 0);
assert.equal(rendered.pending, null);
rawEvent(voiceCanvas, "click", {
  clientX: lookVoice.x + 1,
  clientY: lookVoice.y + 1,
});
assert.equal(rendered.verb, "Look at");
const voiceWindow = rendered.room.items.find((item) => item.id === "window");
const voicePixel = rendered.room.ids.findIndex(
  (id) => rendered.room.items[id] === voiceWindow,
);
rawEvent(voiceCanvas, "click", {
  clientX: voicePixel % 640,
  clientY: Math.floor(voicePixel / 640),
});
for (let i = 0; i < 600 && voiceGame.state.walking; i++) step();
assert.equal(rendered.speech, rendered.world.voices["study-window"].text);
await new Promise(setImmediate);
assert(
  Number.isFinite(rendered.speechUntil),
  "Missing recording uses reading time",
);
rawEvent(voiceCanvas, "click", { clientX: 5, clientY: 5 });
// Topic book look uses its world binding before the dynamic entry-count fallback.
const voiceBook = rendered.objects[0];
rendered.actor.x = voiceBook.position[0];
rendered.actor.y = voiceBook.position[1];
rawEvent(voiceRoot, "contextmenu", {
  clientX: voiceBook.position[0],
  clientY: voiceBook.position[1] - 1,
});
assert(rendered.menu);
rawEvent(voiceRoot, "keydown", { key: "ArrowDown" });
rawEvent(voiceRoot, "keydown", { key: "Enter" });
for (let i = 0; i < 600 && voiceGame.state.walking; i++) step();
step();
assert.equal(rendered.speech, rendered.world.voices["book-workstation"].text);
rawEvent(voiceCanvas, "click", { clientX: 5, clientY: 5 });
rawEvent(voiceRoot, "keydown", { key: "t" });
assert.equal(
  rendered.speech,
  rendered.world.voices[`common-${rendered.time}`].text,
);
rawEvent(voiceCanvas, "click", { clientX: 5, clientY: 5 });
// Drive the actual fade state machine, including the asynchronous room load.
rendered.transition = {
  to: "harbour",
  from: "stone-house",
  phase: "out",
  opacity: 0,
};
step(12);
await new Promise(setImmediate);
assert.equal(voiceGame.state.room, "harbour");
assert.equal(rendered.speech, null, "Room entry waits for fade-in");
step(12);
assert.equal(rendered.transition, null);
assert.equal(rendered.speech, rendered.world.voices["harbour-enter"].text);
const voiceReturn = async (room) => {
  location.hash = `#${room}`;
  rawEvent(window, "hashchange");
  await new Promise(setImmediate);
  step();
};
await voiceReturn("stone-house");
assert.equal(
  rendered.speech,
  null,
  "Returning to a room never repeats entry speech",
);
await voiceReturn("map");
assert.equal(rendered.speech, rendered.world.voices["map-enter"].text);
rawEvent(voiceCanvas, "click", { clientX: 5, clientY: 5 });
await voiceReturn("harbour");
assert.equal(rendered.speech, null);
const voiceSlot = rendered.panel.slots[0];
rawEvent(voiceCanvas, "click", {
  clientX: lookVoice.x + 1,
  clientY: lookVoice.y + 1,
});
assert.equal(rendered.verb, "Look at");
rawEvent(voiceCanvas, "click", {
  clientX: voiceSlot.x + 1,
  clientY: voiceSlot.y + 1,
});
assert.equal(
  rendered.speech,
  rendered.world.voices["book-workstation"].text,
  "A restored carried book keeps its look voice outside its original room",
);
voiceGame.destroy();
console.log(
  "Voice frame skipping, look bindings, common replies, fade ordering and once-per-room entry passed.",
);

// Destroying an untouched title must not load data or create an audio context.
const beforeIdleRequests = requests.length;
const beforeIdleAudio = AudioContext.instances.length;
const idleContainer = new Element("main");
const idle = await module.namespace.boot({
  world: "./real/world.json",
  content: "./data/content.json",
  element: idleContainer,
});
assert.equal(idle.ready, null);
idle.destroy();
assert.equal(requests.length, beforeIdleRequests);
assert.equal(AudioContext.instances.length, beforeIdleAudio);
assert(idleContainer.children[0].removed);

assert.equal(fontFaces.size, 0, "Destroyed games release their font faces");

assert(
  AudioContext.instances.every((context) => context.closeCalls === 1),
  "Every audio context closes exactly once, including failed starts",
);

// Permanent pocket items work alongside saved items and every close-up.
includePocket = true;
stored.clear();
location.hash = "#stone-house";
const pocketContainer = new Element("main");
const pocketGame = await startedBoot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: pocketContainer,
});
step();
const pocketRoot = pocketContainer.children[0];
const pocketCanvas = pocketRoot.children[0];
const pocketTap = (rect) =>
  event(pocketCanvas, "click", {
    clientX: rect.x + 1,
    clientY: rect.y + 1,
  });
const mapSlot = rendered.panel.slots[0];
assert.deepEqual(Array.from(pocketGame.state.inventory), ["map"]);
assert(rendered.inventory[0].sprite.texture);
assert.equal(stored.has(inventoryKey), false, "Fresh pocket is not persisted");
pocketTap(rendered.panel.forget);
assert.equal(
  rendered.speech,
  null,
  "Forget is inactive with only pocket items",
);
const pocketReturn = async (hash) => {
  location.hash = hash;
  event(window, "hashchange");
  await new Promise(setImmediate);
  step();
};
const finishPocketTravel = async () => {
  step(12);
  await new Promise(setImmediate);
  step(12);
  assert.equal(pocketGame.state.room, "map");
  assert.equal(rendered.transition, null);
};
for (const verb of ["Open", "Use", null, "Walk to"]) {
  await pocketReturn("#stone-house");
  rendered.verb = verb;
  rendered.hover = rendered.inventory[0];
  assert.equal(sentence(rendered), (verb || "Walk to") + " Island map");
  pocketTap(mapSlot);
  assert.equal(rendered.transition.to, "map");
  assert.equal(rendered.transition.from, "stone-house");
  assert.equal(rendered.transition.phase, "out");
  assert.equal(rendered.path.length, 0);
  assert.equal(rendered.selectedItem, null);
  await finishPocketTravel();
  pocketTap(mapSlot);
  assert.equal(rendered.speech, "I'm already looking at it.");
  assert.equal(rendered.transition, null);
}
for (const [verb, expected] of [
  ["Look at", "My map of the island. Folded wrong, like every map."],
  ["Take", "I already have it."],
  ["Talk to", "I can't do that."],
]) {
  rendered.verb = verb;
  pocketTap(mapSlot);
  assert.equal(rendered.speech, expected, verb + " works in the map room");
}
await pocketReturn("#stone-house");
const carriedBook = rendered.books.workstation;
rendered.inventory.push({
  kind: "inventory",
  label: carriedBook.title,
  book: carriedBook,
  sprite: carriedBook.sprite,
});
const inventoryModule = await moduleAt(
  "https://adventure.test/src/inventory.js",
);
inventoryModule.namespace.saveInventory(rendered);
assert.deepEqual(JSON.parse(stored.get(inventoryKey)), [
  { kind: "book", id: "workstation" },
]);
pocketTap(rendered.panel.forget);
assert.deepEqual(Array.from(pocketGame.state.inventory), ["map"]);
assert.equal(stored.has(inventoryKey), false);
assert.equal(rendered.inventoryOffset, 0);
assert.equal(rendered.selectedItem, null);
for (const hash of [
  "#stone-house/book/workstation/0",
  "#harbour/board/links/0",
  "reader",
]) {
  await pocketReturn(
    hash === "reader" ? "#stone-house/book/workstation/0" : hash,
  );
  if (hash === "reader") {
    const entry = rendered.activeBook.pages[0].entries[0];
    pocketTap(entry);
    assert.equal(pocketGame.state.reader, entry.item.id);
  }
  assert(
    rendered.activeBook || rendered.activeBoard || rendered.readerItem,
    hash,
  );
  const footerMap = panelModule.namespace.footerLayout(rendered).pocket[0];
  event(pocketCanvas, "pointermove", {
    clientX: footerMap.x + 1,
    clientY: footerMap.y + 1,
  });
  assert.equal(
    rendered.hover,
    rendered.inventory[0],
    "Footer map can be hovered",
  );
  // A stale room verb must not stop the close-up shortcut.
  rendered.verb = "Talk to";
  pocketTap(footerMap);
  assert.equal(pocketGame.state.book, null);
  assert.equal(pocketGame.state.board, null);
  assert.equal(pocketGame.state.reader, null);
  assert.equal(pocketRoot.children[2].hidden, true);
  await finishPocketTravel();
}
pocketGame.destroy();
stored.set(
  inventoryKey,
  JSON.stringify([
    { kind: "pocket", id: "map" },
    { kind: "book", id: "workstation" },
  ]),
);
location.hash = "#stone-house";
const restoredPocketContainer = new Element("main");
const restoredPocket = await startedBoot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: restoredPocketContainer,
});
step();
assert.deepEqual(Array.from(restoredPocket.state.inventory), [
  "map",
  "workstation",
]);
assert.deepEqual(JSON.parse(stored.get(inventoryKey)), [
  { kind: "book", id: "workstation" },
]);
restoredPocket.destroy();
assert.equal(fontFaces.size, 0);
assert(AudioContext.instances.every((context) => context.closeCalls === 1));
console.log(
  "Pocket map startup, storage, Forget, actions, travel and close-ups passed.",
);
