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
document.fonts = { add() {} };
document.head = new Element("head");
document.createElement = (tag) => new Element(tag);
const window = new EventTarget();
const opened = [];
const clickedLinks = [];
window.open = (...args) => {
  opened.push({ args, position: [rendered.actor.x, rendered.actor.y] });
  return null; // noopener may return null even when the browser opens the tab.
};
const location = { hash: "" };
let legacyBooks = true;
let animationStart = 0;
let objectPaths,
  contentOverride,
  legacyRoom = false;
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
  resize() {}
  render(game) {
    rendered = game;
  }
  destroy() {
    this.destroyed = true;
  }
}
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
    const path = base + new URL(url).pathname.slice(1);
    return {
      ok: true,
      json: async () => {
        const data = JSON.parse(readFileSync(path, "utf8"));
        if (path.endsWith("/data/world.json") && legacyBooks) {
          delete data.books;
          delete data.book;
          data.rooms["stone-house"].books = undefined;
          data.rooms["stone-house"].content = { series: "workstation" };
          data.rooms["stone-house"].object = "book";
        }
        if (path.endsWith("/data/content.json") && legacyBooks)
          data.items = data.items.filter(
            (item) => !item.part || item.part <= 6,
          );
        if (path.endsWith("/data/world.json") && objectPaths !== undefined)
          data.objects.book = objectPaths;
        if (path.endsWith("/content.json") && contentOverride)
          data.items = contentOverride;
        if (path.endsWith("/room.json") && legacyRoom)
          for (const state of Object.values(data.states)) {
            state.lit = state.unlit;
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
    const result = spawnSync(python, [
      "-c",
      "from PIL import Image; import sys,struct; i=Image.open(sys.argv[1]).convert('RGBA'); sys.stdout.buffer.write(struct.pack('<II',*i.size)+i.tobytes())",
      blob.path,
    ]);
    if (result.status) throw new Error(result.stderr.toString());
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
function event(target, type, props = {}) {
  const e = new Event(type, { cancelable: true });
  Object.assign(e, props);
  target.dispatchEvent(e);
  return e;
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
event(cover.children[3], "click");
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
document.hidden = false;
event(document, "visibilitychange");
assert.equal(rendered.sound.context.state, "running");
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
assert.equal(rendered.lanternPosition()[0], rendered.actor.x + 20);
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
assert.equal(rendered.objects[0].label, "A room of one's own");
assert.equal(rendered.objectSprites.length, 3);
assert.deepEqual(
  Array.from(rendered.objects, (object) =>
    rendered.objectSprites.indexOf(object.sprite),
  ),
  [0, 1, 2, 0, 1, 2],
  "Six occupied slots cycle through three sprites",
);
assert.equal(
  new Set(rendered.objects.map((object) => object.sprite.texture)).size,
  3,
);
assert.notDeepEqual(
  rendered.objectSprites[0].texture.bitmap.data,
  rendered.objectSprites[1].texture.bitmap.data,
);
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
varied.sprite.size = originalSize;
event(canvas, "pointermove", {
  clientX: hitX,
  clientY: hitY,
});
assert.notEqual(rendered.hover, varied);

assert.deepEqual(Array.from(controller.state.position), [120, 300]);
assert.equal(rendered.verbTop, 308, "Panel occupies the bottom 52 pixels");
assert(
  rendered.verbRects.every((v, i) => v.y === 324 + Math.floor(i / 3) * 12),
  "Verbs follow a three-column grid",
);
click(150, 300);
step(10);
const expectedTravel = 120 * rendered.depth() * 0.16;
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
assert.equal(rendered.lightAt(639, 359), 1);
assert.equal(rendered.lightAt(1000, 1000), 1);
assert.equal(rendered.lightAt(638, 359), 0);
const sampled = rendered.lightSourcesAt(639, 359)[0];
assert(sampled.tint[0] > sampled.tint[1] && sampled.tint[1] > sampled.tint[2]);
rendered.room.lights[0].drift = [1, 0];
assert.equal(rendered.lightAt(638, 359), 1, "CPU sampling follows lamp drift");
sampleState.lightPixels = oldPixels;
sampleState.unlitPixels = oldUnlit;
rendered.room.lights = [];
rendered.time = "night";
const lanternPoint = rendered.lanternPosition();
assert.equal(rendered.lanternRadius, 120);
assert.equal(rendered.lightAt(...lanternPoint), rendered.lanternStrength());
const footLight = rendered.lightAt(rendered.actor.x, rendered.actor.y);
assert(footLight > 0.3, "Lantern must visibly light the feet");
const strength = rendered.lanternStrength();
rendered.elapsed += 0.1;
assert.notEqual(rendered.lanternStrength(), strength, "Flame flickers gently");
assert(Math.abs(rendered.lanternStrength() - strength) < 0.1);
key("l");
assert.equal(rendered.lightAt(...lanternPoint), 0);
key("l");
assert.equal(controller.state.bloom, true);
key("g");
assert.equal(controller.state.bloom, false);
key("G");
assert.equal(controller.state.bloom, true);
assert.equal(rendered.lightAt(lanternPoint[0] + 120, lanternPoint[1]), 0);
rendered.room.lights = savedLights;
rendered.time = savedTime;
const glowPoint = rendered.lanternPosition();
assert(glowPoint[0] > rendered.actor.x && glowPoint[1] < rendered.actor.y);
rendered.actor.mirror = true;
assert(
  Math.abs(
    rendered.lanternPosition()[0] - (2 * rendered.actor.x - glowPoint[0]),
  ) < 1e-8,
);
rendered.actor.mirror = false;
assert(rendered.character.glowTexture);
const open = rendered.verbRects.find((v) => v.label === "Open");
click(open.x + 2, open.y + 2);
click(470, 140, 2);
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
click(40, 300);
key("t");
key("g");
step(20);
assert.equal(
  JSON.stringify(controller.state),
  frozen,
  "Reader pauses input and simulation",
);
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
assert.equal(rendered.sentence(), "Use Oil lamp");
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
event(root, "contextmenu", { clientX: 470, clientY: 140 });
key("ArrowUp");
assert.equal(rendered.menu.verbs[rendered.menu.selected], "Walk to");
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
assert(rendered.speech.includes("The Linux kernel"));
assert(rendered.speech.replace(/\s+/g, " ").includes("Follow kernel releases"));
assert(rendered.speechLines.length <= 2);
assert.equal(opened.length, 0, "Look at must not open a tab");
assert.equal(rendered.sentence(), "Look at Window: The Linux kernel");
const originalDescription = hotspot.content.description;
hotspot.content.description = "A long note about the kernel. ".repeat(30);
click(180, 120);
settle();
assert.equal(rendered.speechLines.length, 2);
assert(rendered.speechLines[1].endsWith("…"));
hotspot.content.description = originalDescription;
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
location.hash = "#stone-house/workstation-6";
event(window, "hashchange");
await Promise.resolve();
assert.equal(controller.state.reader, "workstation-6");
location.hash = "#stone-house";
event(window, "hashchange");
await Promise.resolve();
assert.equal(controller.state.reader, null);
const retiredSprites = rendered.objectSprites;
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
assert.deepEqual(
  Array.from(rendered.objects, (object) =>
    rendered.objectSprites.indexOf(object.sprite),
  ),
  [0, 1, 2, 0, 1, 2],
  "A new room restarts the sprite cycle",
);
assert(
  retiredSprites.every((sprite) =>
    rendered.renderer.deletedTextures.includes(sprite.texture),
  ),
);
assert(
  rendered.objectSprites.every((sprite) => !retiredSprites.includes(sprite)),
);
assert(soundEvents.some((event) => event.name === "lamp"));
assert(soundEvents.some((event) => event.name === "menu"));
// Exit effects fire for Use and Walk to, but not Look at.
const exit = rendered.room.items.find((item) => item.kind === "exit");
exit.to = "unbuilt-room";
for (const verb of ["Use", "Walk to"]) {
  const barVerb = rendered.verbRects.find((v) => v.label === verb);
  click(barVerb.x + 2, barVerb.y + 2);
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
location.hash = "#stone-house/workstation-2";
objectPaths = "objects/book.png";
animationStart = 1;
const secondContainer = new Element("main");
const second = await module.namespace.boot({
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
assert.equal(second.state.reader, "workstation-2");
assert.equal(rendered.objectSprites.length, 1);
assert(
  rendered.objects.every(
    (object) => object.sprite === rendered.objectSprites[0],
  ),
);
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
const secondLook = rendered.verbRects.find((v) => v.label === "Look at");
event(rendered.canvas, "click", {
  clientX: secondLook.x + 2,
  clientY: secondLook.y + 2,
});
event(rendered.canvas, "click", { clientX: 180, clientY: 120 });
step(300);
assert.equal(rendered.speech, "The sea, calm tonight.");
second.destroy();
// Both accepted forms resolve relative to the world file, and empty lists fail clearly.
const assetsModule = await moduleAt("https://adventure.test/src/assets.js");
for (const value of [
  ["objects/book-blue.png"],
  ["objects/book.png", "objects/book-green.png"],
]) {
  objectPaths = value;
  const loaded = await assetsModule.namespace.loadWorld(
    "https://adventure.test/dev/data/world.json",
    "https://adventure.test/dev/data/content.json",
  );
  assert.equal(loaded.objects.book.length, value.length);
  assert(
    loaded.objects.book.every(
      (bitmap) => bitmap.width === 24 && bitmap.height === 36,
    ),
  );
}
for (const value of [[], [null], ""]) {
  objectPaths = value;
  await assert.rejects(
    assetsModule.namespace.loadWorld(
      "https://adventure.test/dev/data/world.json",
      "https://adventure.test/dev/data/content.json",
    ),
    /requires a sprite path or a non-empty list/,
  );
}
objectPaths = "objects/book.png";
for (const field of ["link", "url"]) {
  for (const value of ["javascript:alert(1)", "data:text/html,test"]) {
    contentOverride = [{ id: "unsafe", type: "link", [field]: value }];
    await assert.rejects(
      assetsModule.namespace.loadWorld(
        "https://adventure.test/dev/data/world.json",
        "https://adventure.test/dev/data/content.json",
      ),
      /require HTTP\(S\) URLs/,
    );
  }
}
contentOverride = undefined;
// Build an explicit legacy fixture; real artwork may already follow the current contract.
legacyRoom = true;
// Legacy shared-lit drawings must fail clearly rather than silently lighting incorrectly.
location.hash = "";
await assert.rejects(
  module.namespace.boot({
    world: "./real/world.json",
    content: "./data/content.json",
    element: new Element("main"),
  }),
  /one drawing per lamp/,
);
// Load the shipped art as well as the placeholders and walk on its own mask.
legacyRoom = false;
const realContainer = new Element("main");
const real = await module.namespace.boot({
  world: "./real/world.json",
  content: "./data/content.json",
  element: realContainer,
});
event(realContainer.children[0].children[1].children[3], "click");
step();
assert.deepEqual(Array.from(rendered.room.size), [640, 360]);
assert.deepEqual(Array.from(rendered.character.frame), [128, 234]);
assert.equal(rendered.pixelScale, 4 / 3);
assert.equal(rendered.uiScale, 1);
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
legacyBooks = false;
location.hash = "#stone-house";
const bookContainer = new Element("main");
const books = await module.namespace.boot({
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
assert.equal(catalogue.children.length, 14);
assert.equal(
  catalogue.children[1].children[0].children[0].href,
  "https://adventure.test/dev/reader/workstation-1.html",
);
event(bookRoot, "contextmenu", { clientX: 470, clientY: 140 });
assert.equal(rendered.menu.verbs.at(-1), "Walk to");
event(bookRoot, "keydown", { key: "ArrowUp" });
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
const walkVerb = rendered.verbRects.find((v) => v.label === "Walk to");
event(bookCanvas, "click", {
  clientX: walkVerb.x + 2,
  clientY: walkVerb.y + 2,
});
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
assert.equal(bookReader.children[2].rel, "noopener");
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
const reloaded = await module.namespace.boot({
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
location.hash = "#stone-house";
const adventureContainer = new Element("main");
const adventure = await module.namespace.boot({
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
  const rect = rendered.verbRects.find((rect) => rect.label === label);
  tap(rect.x + 1, rect.y + 1);
};
const arrive = () => {
  for (let i = 0; i < 600 && adventure.state.walking; i++) step();
  assert(!adventure.state.walking);
};
assert.deepEqual(
  Array.from(rendered.verbRects, (rect) => rect.label),
  Array.from(rendered.world.verbs),
);
assert(!rendered.room.walkable.slice(308 * 640).some(Boolean));
for (const [x, y] of [
  [0, 308],
  [639, 308],
  [0, 359],
  [639, 359],
  [8, 323],
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
assert.equal(rendered.objects.length, 6, "Shelf keeps its book");
tap(...topic.position);
arrive();
assert.equal(rendered.speech, "I already have it.");
assert.equal(adventure.state.inventory.length, 1);
let slot = rendered.panel.slots[0];
select("Look at");
tap(slot.x + 1, slot.y + 1);
assert.equal(rendered.speech, "Workstation. 22 entries.");
for (const verb of ["Open", "Read"]) {
  select(verb);
  tap(slot.x + 1, slot.y + 1);
  assert.equal(adventure.state.book, "workstation");
  event(adventureRoot, "keydown", { key: "Escape" });
}
for (const verb of ["Give", "Close", "Talk to"]) {
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
assert.equal(rendered.sentence(), `Use Workstation with ${windowTarget.label}`);
tap(...windowTarget.position);
assert.equal(rendered.speech, "I can't use those together.");
assert.equal(rendered.sentence(), `Use Workstation with ${windowTarget.label}`);
assert.equal(rendered.selectedItem, null);
select("Close");
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
assert.equal(board.book.id, "links");
for (const verb of ["Read", "Open", "Walk to"]) {
  select(verb);
  tap(...board.position);
  arrive();
  assert.equal(adventure.state.book, "links");
  event(adventureRoot, "keydown", { key: "Escape" });
}
select("Read");
tap(...board.position);
arrive();
const linkEntry = rendered.activeBook.pages.flatMap((page) => page.entries)[0];
const linksBefore = clickedLinks.length;
tap(linkEntry.x + 1, linkEntry.y + 1);
assert.equal(clickedLinks.length, linksBefore + 1);
assert.deepEqual(clickedLinks.at(-1), {
  href: linkEntry.item.link,
  target: "_blank",
  rel: "noopener",
});
assert.equal(rendered.sentence(), "Opening the link…");
assert.equal(adventure.state.reader, null);
assert.equal(adventure.state.book, "links");
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
adventure.destroy();
location.hash = "#stone-house";
const freshContainer = new Element("main");
const fresh = await module.namespace.boot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: freshContainer,
});
assert.deepEqual(
  Array.from(fresh.state.inventory),
  [],
  "New session starts empty",
);
fresh.destroy();
console.log(
  "Panel edges, inventory actions and scrolling, book hotspots, safe link tabs, fades, matching exits, facing, spawn fallback and session reset passed.",
);
