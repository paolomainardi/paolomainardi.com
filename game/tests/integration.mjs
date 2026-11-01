// Execute the real loader and game loop with generated PNGs, a DOM stand-in,
// and a renderer stand-in. GPU output still needs a real browser visual pass.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

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
  focus() {
    document.activeElement = this;
  }
  remove() {
    this.removed = true;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 480, height: 270 };
  }
}
const document = new EventTarget();
document.baseURI = "https://adventure.test/dev/";
document.head = new Element("head");
document.createElement = (tag) => new Element(tag);
const window = new EventTarget(),
  location = { hash: "" };
let nextFrame,
  time = 1000,
  rendered;
class Renderer {
  constructor() {
    this.gl = { deleteTexture() {} };
  }
  pixels(image) {
    return image.data;
  }
  texture() {
    return {};
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
  URL,
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
      json: async () => JSON.parse(readFileSync(path, "utf8")),
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
  await module.link((specifier, parent) =>
    moduleAt(new URL(specifier, parent.identifier).href),
  );
  return module;
}
const module = await moduleAt("https://adventure.test/src/main.js");
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
}
function step(frames = 1) {
  for (let i = 0; i < frames; i++) {
    time += 16;
    const frame = nextFrame;
    frame(time);
  }
}
function click(x, y) {
  event(canvas, "click", { clientX: x * 1.5, clientY: y * 1.5 });
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
event(cover.children[3], "click");
step();
assert.equal(location.hash, "#stone-house");
assert.equal(rendered.objects.length, 6);
assert.equal(
  rendered.room.walkable.length,
  rendered.room.size[0] * rendered.room.size[1],
);
assert.equal(rendered.objects[0].label, "A room of one's own");
assert.deepEqual(Array.from(controller.state.position), [90, 240]);
assert.equal(
  rendered.verbTop,
  252,
  "Verb strip must occupy one fifteenth of the frame",
);
assert(
  rendered.verbRects.every((v) => v.y === 253),
  "Verbs stay in one row",
);
click(75, 160);
step(10);
const expectedTravel = 90 * rendered.depth() * 0.16;
assert(
  Math.abs(controller.state.position[0] - 90 - expectedTravel) < 0.001,
  "Walk at 90 pixels per second scaled by depth",
);
settle();
click(140, 150);
assert(controller.state.walking);
settle();
assert.deepEqual(Array.from(controller.state.position), [210, 225]);
// CPU light sampling must reach the last pixel and match the shader's radius.
const savedLights = rendered.room.lights;
rendered.room.lights = [
  {
    pixels: new Uint8Array(480 * 270 * 4),
    strength: 1,
    tint: "#ffd08a",
    position: [0, 0],
  },
];
rendered.room.lights[0].pixels[(480 * 270 - 1) * 4] = 255;
const savedTime = rendered.time;
rendered.time = "dusk";
assert.equal(rendered.lightAt(479, 269), 1);
assert.equal(rendered.lightAt(1000, 1000), 1);
assert.equal(rendered.lightAt(478, 269), 0);
rendered.room.lights = [];
rendered.time = "night";
const lanternPoint = rendered.lanternPosition();
assert.equal(rendered.lanternRadius, 90);
assert.equal(rendered.lightAt(...lanternPoint), 1);
const footLight = rendered.lightAt(rendered.actor.x, rendered.actor.y);
assert(footLight > 0.4, "Lantern must visibly light the feet");
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
assert.equal(rendered.lightAt(lanternPoint[0] + 90, lanternPoint[1]), 0);
rendered.room.lights = savedLights;
rendered.time = savedTime;
const open = rendered.verbRects.find((v) => v.label === "Open");
click((open.x + 2) / 1.5, 170);
click(235, 70);
assert.equal(controller.state.reader, null, "Opening must wait for the walk");
settle();
assert.equal(controller.state.reader, "workstation-1");
assert.equal(location.hash, "#stone-house/workstation-1");
assert.equal(reader.hidden, false);
assert.equal(
  iframe.src,
  "https://adventure.test/dev/reader/workstation-1.html",
);
const frozen = JSON.stringify(controller.state);
click(20, 150);
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
assert.equal(location.hash, "#stone-house");
assert.equal(document.activeElement, root);
const use = rendered.verbRects.find((v) => v.label === "Use");
click((use.x + 2) / 1.5, 170);
click(177, 93);
settle();
step(90);
assert.equal(controller.state.lamps.find((l) => l.id === "oil").on, false);
assert(controller.state.lamps.find((l) => l.id === "oil").level < 0.01);
const originalTime = controller.state.time;
key("t");
assert.notEqual(controller.state.time, originalTime);
step();
assert.notEqual(controller.state.time, originalTime);
const lantern = controller.state.lantern;
key("l");
assert.notEqual(controller.state.lantern, lantern);
const look = rendered.verbRects.find((v) => v.label === "Look at");
click((look.x + 2) / 1.5, 170);
click(90, 60);
settle();
assert.equal(rendered.speech, "The sea, calm tonight.");
click(40, 80);
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
controller.destroy();
assert.equal(nextFrame, null);
assert(root.removed);
// Loading with a deep link preserves the reader selection on Start.
location.hash = "#stone-house/workstation-2";
const secondContainer = new Element("main");
const second = await module.namespace.boot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: secondContainer,
});
event(secondContainer.children[0].children[1].children[3], "click");
step();
assert.equal(second.state.reader, "workstation-2");
second.destroy();
// The reviewed art must load through exactly the same contract as placeholders.
location.hash = "";
const realContainer = new Element("main");
const real = await module.namespace.boot({
  world: "./real/world.json",
  content: "./data/content.json",
  element: realContainer,
});
event(realContainer.children[0].children[1].children[3], "click");
step();
assert.equal(real.state.room, "stone-house");
assert.equal(rendered.objects.length, 6);
assert.equal(real.state.lamps.length, 2);
assert.deepEqual(Array.from(real.state.position), [63, 219]);
assert.deepEqual(Array.from(rendered.lanternPosition()), [85.5, 160.5]);
rendered.actor.mirror = true;
assert.deepEqual(Array.from(rendered.lanternPosition()), [40.5, 160.5]);
const realLights = rendered.room.lights;
rendered.room.lights = [];
rendered.time = "night";
rendered.actor.mirror = false;
assert(
  rendered.lightAt(...real.state.position) > 0.4,
  "Real 160-pixel character's lantern reaches its feet",
);
rendered.lantern = false;
assert.equal(rendered.lightAt(...real.state.position), 0);
rendered.room.lights = realLights;
real.destroy();
console.log(
  "Real asset loading, start, movement, walk-before-act, readers, Esc, input pause, lamp fade, time, lantern, descriptions, exits, hashes, and cleanup passed (mock DOM/GPU).",
);
