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
const window = new EventTarget();
const opened = [];
window.open = (...args) => {
  opened.push({ args, position: [rendered.actor.x, rendered.actor.y] });
  return null; // noopener may return null even when the browser opens the tab.
};
const location = { hash: "" };
let objectPaths,
  contentOverride,
  legacyRoom = false;
let nextFrame,
  time = 1000,
  rendered;
class Renderer {
  constructor() {
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
      json: async () => {
        const data = JSON.parse(readFileSync(path, "utf8"));
        if (path.endsWith("/data/world.json") && objectPaths !== undefined)
          data.objects.book = objectPaths;
        if (path.endsWith("/content.json") && contentOverride)
          data.items = contentOverride;
        if (path.endsWith("/room.json") && legacyRoom)
          for (const state of Object.values(data.states)) {
            state.lit = state.unlit;
            delete state.lights;
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
event(canvas, "pointermove", { clientX: hitX, clientY: hitY });
assert.equal(rendered.hover, varied);
varied.sprite.size = originalSize;
event(canvas, "pointermove", { clientX: hitX, clientY: hitY });
assert.notEqual(rendered.hover, varied);

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
const sampleState = rendered.room.states.dusk;
const oldPixels = sampleState.lightPixels,
  oldUnlit = sampleState.unlitPixels;
sampleState.unlitPixels = new Uint8Array(480 * 270 * 4);
sampleState.lightPixels = { test: new Uint8Array(480 * 270 * 4) };
sampleState.lightPixels.test.set([255, 128, 0, 255], (480 * 270 - 1) * 4);
rendered.room.lights = [
  { id: "test", strength: 1, position: [0, 0], drift: [0, 0] },
];
const savedTime = rendered.time;
rendered.time = "dusk";
assert.equal(rendered.lightAt(479, 269), 1);
assert.equal(rendered.lightAt(1000, 1000), 1);
assert.equal(rendered.lightAt(478, 269), 0);
const sampled = rendered.lightSourcesAt(479, 269)[0];
assert(sampled.tint[0] > sampled.tint[1] && sampled.tint[1] > sampled.tint[2]);
rendered.room.lights[0].drift = [1, 0];
assert.equal(rendered.lightAt(478, 269), 1, "CPU sampling follows lamp drift");
sampleState.lightPixels = oldPixels;
sampleState.unlitPixels = oldUnlit;
rendered.room.lights = [];
rendered.time = "night";
const lanternPoint = rendered.lanternPosition();
assert.equal(rendered.lanternRadius, 90);
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
assert.equal(rendered.lightAt(lanternPoint[0] + 90, lanternPoint[1]), 0);
rendered.room.lights = savedLights;
rendered.time = savedTime;
const glowPoint = rendered.lanternPosition();
assert(glowPoint[0] > rendered.actor.x && glowPoint[1] < rendered.actor.y);
rendered.actor.mirror = true;
assert.equal(
  rendered.lanternPosition()[0],
  2 * rendered.actor.x - glowPoint[0],
);
rendered.actor.mirror = false;
assert(rendered.character.glowTexture);
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
step(12);
assert(
  Math.abs(controller.state.lamps.find((l) => l.id === "oil").level - 0.52) <
    0.001,
);
step(13);
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
click(90, 60);
settle();
assert.equal(rendered.speechLines.length, 2);
assert(rendered.speech.endsWith("..."));
hotspot.content.description = originalDescription;
// Move away so the click can prove opening happens before movement.
click(300, 150);
settle();
click((open.x + 2) / 1.5, 170);
const beforeOpen = Array.from(controller.state.position);
click(90, 60);
assert.equal(opened.length, 1, "Tab must open synchronously during the click");
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
click(90, 60);
assert.equal(
  opened.at(-1).args[0],
  "https://adventure.test/links/linux-kernel/",
);
settle();
hotspot.content.link = originalLink;
click((look.x + 2) / 1.5, 170);
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
location.hash = "#second";
event(window, "hashchange");
await new Promise(setImmediate);
step();
assert.equal(controller.state.room, "second");
const rebound = rendered.room.items.find((item) => item.id === "window");
assert.equal(rebound.label, "Window: New link");
assert.equal(rebound.content.id, "new-link");
assert.equal(opened.length, 2, "Changing rooms must not open tabs");
click((open.x + 2) / 1.5, 170);
click(90, 60);
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
controller.destroy();
assert.equal(nextFrame, null);
assert(root.removed);
// Loading with a deep link preserves the reader selection on Start.
location.hash = "#stone-house/workstation-2";
objectPaths = "objects/book.png";
const secondContainer = new Element("main");
const second = await module.namespace.boot({
  world: "./data/world.json",
  content: "./data/content.json",
  element: secondContainer,
});
event(secondContainer.children[0].children[1].children[3], "click");
step();
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
event(rendered.canvas, "click", { clientX: secondLook.x + 2, clientY: 255 });
event(rendered.canvas, "click", { clientX: 135, clientY: 90 });
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
      (bitmap) => bitmap.width === 18 && bitmap.height === 27,
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
console.log(
  "New asset loading, start, movement, readers, lamp fade, drift, time, lantern, descriptions, content-bound hotspots, click-time tabs, safe URLs, exits, hashes, and cleanup passed (mock DOM/GPU).",
);
