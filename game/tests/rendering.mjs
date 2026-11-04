// Check rendering behavior against the engine and shipped fixtures.
import assert from "node:assert/strict";
import { layoutPanel, sentence } from "../src/panel.js";
import { wrap } from "../src/font.js";
import { speechLines, speechLayout } from "../src/speech.js";
import { bookFonts } from "../src/book.js";
import { context2D } from "./text-fixture.mjs";
import { Renderer } from "../src/renderer.js";

// Exercise render placement without requiring a GPU. Use deliberately different
// dimensions and an off-centre anchor to catch assumptions about the supplied art.
const calls = [],
  uniforms = {};
const renderer = Object.create(Renderer.prototype);
Object.assign(renderer, {
  gl: { disable() {}, enable() {}, blendFunc() {} },
  programs: {},
  scene: {},
  glow: [{ texture: {} }, { texture: {} }, { texture: {} }],
  canvas: { width: 640, height: 360 },
  scale: 1,
  compositeText() {},
  lights() {},
  into() {},
  use() {},
  lighting() {},
  integer() {},
  draw() {},
  bind() {},
  uniform(name, value) {
    uniforms[name] = value;
  },
  sprite(...args) {
    calls.push({ type: "sprite", args });
  },
  rect(...args) {
    calls.push({ type: "rect", args });
  },
  text(...args) {
    calls.push({ type: "text", args });
  },
});
const texture = {};
const game = {
  bookArt: {
    fonts: bookFonts(
      { font: { family: "NF-Pixels" }, sizes: { body: 10 } },
      context2D(),
    ),
  },
  world: {},
  objects: [],
  room: {
    size: [640, 360],
    depth: { far: [0, 0.8], near: [360, 0.8] },
    lights: [],
    states: {
      dusk: { unlitPixels: new Uint8Array(640 * 360 * 4), lightPixels: {} },
    },
  },
  pixelScale: 4 / 3,
  lanternRadius: 120,
  time: "dusk",
  soundRect: { x: 566, y: 328, width: 66, height: 8 },
  sound: { muted: false },
  hover: { label: "Window" },
  character: {
    texture,
    size: [120, 420],
    frame: [24, 60],
    anchor: [5, 58],
    lantern: [0, 0],
    animations: { "walk-side": { row: 6, frames: 5, fps: 10 } },
  },
  actor: { x: 100, y: 150, animation: "walk-side", clock: 0.3, mirror: false },
  bloom: true,
  panel: layoutPanel([640, 360], ["Open"]),
  inventory: [],
  inventoryOffset: 0,
  verbTop: 324,
  verb: "Open",
  verbRects: [{ label: "Open", x: 4, y: 170 }],
};
for (const mirror of [false, true]) {
  calls.length = 0;
  game.actor.mirror = mirror;
  renderer.render(game);
  const actor = calls.find((c) => c.type === "sprite" && c.args[0] === texture);
  assert.deepEqual(actor.args[2], [mirror ? 85 : 96, 104, 19, 48]);
  assert.deepEqual(actor.args[3], [72, 360, 24, 60]);
  assert.equal(actor.args[5], mirror);
  assert.deepEqual(
    actor.args[4],
    [0.7, 0.7, 0.7, 1],
    "Unlit sprite keeps 70% of its colours",
  );
  assert.equal(uniforms.uBloom, 1);
  assert.deepEqual(uniforms.uShadowSize, [24 * 0.28 * 0.8, 60 * 0.06 * 0.8]);
  const strips = calls.filter((c) => c.type === "rect");
  assert.equal(strips.length, 1 + game.panel.slots.length);
  assert.deepEqual(strips[0].args.slice(0, 4), [0, 324, 640, 36]);
  assert(strips[0].args[4][3] > 0 && strips[0].args[4][3] < 1);
  const sentenceCalls = calls.filter(
    (c) => c.type === "text" && c.args[0] === sentence(game),
  );
  assert.equal(sentenceCalls.length, 1, "Sentence stays inside the panel");
  assert.deepEqual(sentenceCalls[0].args.slice(1, 3), [8, 328]);
}
console.log(
  "Swappable frame, anchor, animation, mirroring, sentence outline, and compact translucent UI passed (mock GPU).",
);

// Long subtitles stay complete and inside the frame, including near its edges.
game.elapsed = 0;
game.speechUntil = 100;
game.speech = "A long spoken thought about this quiet island. "
  .repeat(12)
  .trim();
game.speechLines = speechLines(game.bookArt.fonts.body, game.speech);
for (const map of [false, true]) {
  game.room.map = map;
  for (const [x, y] of [
    [0, 0],
    [639, 359],
  ]) {
    game.actor.x = x;
    game.actor.y = y;
    calls.length = 0;
    renderer.render(game);
    const layout = speechLayout(game);
    assert.equal(layout.rows.length, game.speechLines.length);
    for (const { line, x, y } of layout.rows) {
      assert(x >= 1 && x + layout.font.measure(line) <= 639);
      assert(y >= 1 && y + layout.font.lineHeight <= game.verbTop - 1);
    }
    assert(
      !calls.some(
        (call) =>
          call.type === "text" && game.speechLines.includes(call.args[0]),
      ),
    );
    assert(
      !calls.some(
        (call) => call.type === "rect" && call.args[1] < game.verbTop,
      ),
      "Room subtitles have no background rectangle",
    );
  }
}
game.room.map = false;
renderer.size = [640, 360];
game.siteHover = true;
calls.length = 0;
renderer.renderFooter({ ...game, readerItem: {} });
const footerSpeech = speechLayout({ ...game, readerItem: {} });
assert.equal(footerSpeech.rows.map((row) => row.line).join(" "), game.speech);
assert(
  footerSpeech.rows.every(
    (row) => row.y >= 0 && row.y + footerSpeech.font.lineHeight <= 360,
  ),
);
assert(
  !calls.some((call) => call.type === "text" && call.args[1] === 68),
  "Footer speech uses the text layer",
);
game.siteHover = false;
game.speech = null;
game.actor.x = 100;
game.actor.y = 150;
console.log(
  "Complete room, map and footer subtitles stay within frame bounds (mock GPU).",
);

// Each object draws its assigned texture at its own size, bottom-centred on the slot.
game.objects = [
  { position: [200, 100], sprite: { texture: {}, size: [18, 27] } },
  { position: [240, 120], sprite: { texture: {}, size: [30, 40] } },
];
calls.length = 0;
renderer.render(game);
for (const item of game.objects) {
  const draw = calls.find(
    (call) => call.type === "sprite" && call.args[0] === item.sprite.texture,
  );
  assert.deepEqual(draw.args[1], item.sprite.size);
  assert.deepEqual(draw.args[2], [
    item.position[0] - item.sprite.size[0] / 2,
    item.position[1] - item.sprite.size[1] + 4 / 3,
    ...item.sprite.size,
  ]);
}
game.objects = [];

// Sentence truncates to one row, leaving space for the time and sound controls.
for (const text of ["Walk to Window", "word ".repeat(80)]) {
  const verb = game.verb;
  const hover = game.hover;
  game.verb = text;
  game.hover = null;
  calls.length = 0;
  renderer.render(game);
  const rows = calls.filter(
    (call) =>
      call.type === "text" && call.args[2] === 328 && call.args[1] === 8,
  );
  assert.deepEqual(
    rows.map((call) => call.args[0]),
    wrap(text, 77, 1),
  );
  assert(rows.every((call) => call.args[2] === 328));
  game.verb = verb;
  game.hover = hover;
}

// Ellipsis has its own bitmap cell rather than the unsupported-character glyph.
calls.length = 0;
Renderer.prototype.text.call(renderer, "…", 0, 0);
assert.deepEqual(calls[0].args[3], [90, 40, 6, 8]);

// Non-contract dimensions catch fixed frame assumptions in integer upscaling.
const sizing = Object.create(Renderer.prototype);
Object.assign(sizing, {
  size: [640, 400],
  canvas: { style: {} },
  target: (width, height) => ({ width, height }),
  gl: { deleteTexture() {}, deleteFramebuffer() {} },
});
sizing.resize(1500, 1000);
assert.equal(sizing.canvas.width, 1280);
assert.equal(sizing.canvas.height, 800);
sizing.resize(375, 667);
assert.equal(sizing.canvas.width, 640);
assert.equal(sizing.canvas.style.width, "375px");
assert.equal(sizing.canvas.style.height, "234.375px");

sizing.size = [640, 360];
sizing.resize(1920, 1080);
assert.equal(sizing.scale, 3);
assert.equal(sizing.canvas.width, 1920);
assert.equal(sizing.canvas.height, 1080);
assert.equal(sizing.canvas.style.width, "1920px");
assert.equal(sizing.canvas.style.height, "1080px");

// Room upload dimensions and lamp drawing packing must follow data, including edge pixels.
const uploads = [];
const width = 513,
  height = 287;
const pixels = new Uint8Array(width * height * 4);
pixels[pixels.length - 4] = 123;
const ids = new Int16Array(width * height).fill(-1);
ids[ids.length - 1] = 0;
const upload = Object.create(Renderer.prototype);
Object.assign(upload, {
  gl: {
    createTexture: () => ({}),
    getParameter: () => 256,
    bindTexture() {},
    texParameteri() {},
    texImage2D() {},
    texImage3D(...args) {
      uploads.push(args);
    },
  },
  target: (w, h) => ({ width: w, height: h }),
  texture: (_pixels, w, h) => ({ width: w, height: h }),
});
upload.setRoom({
  size: [width, height],
  states: { night: { unlit: {}, lightPixels: { lamp: pixels } } },
  albedo: {},
  foreground: new Uint8Array(width * height * 4),
  items: [{ id: "lamp" }],
  ids,
  lights: [{ id: "lamp", pixels, position: [0, 0], tint: "#ffd08a" }],
});
assert.deepEqual([upload.scene.width, upload.scene.height], [width, height]);
assert.deepEqual(
  [upload.foreground.width, upload.foreground.height],
  [width, height],
);
assert.deepEqual(uploads[0].slice(3, 6), [width, height, 1]);
assert.equal(uploads[0][9].length, width * height * 4);
assert.deepEqual(Array.from(uploads[0][9].slice(-4)), [123, 0, 0, 0]);
assert.deepEqual(Array.from(uploads[1][9].slice(-4)), [255, 0, 0, 255]);
console.log(
  "Data-driven render sizing, small viewport fitting, and lamp drawing and emission mask edge uploads passed.",
);

// A dark warm source still tints the actor; the strongest pool chooses the rim.
const sample = (rgb) => {
  const pixels = new Uint8Array(640 * 360 * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([...rgb, 255], i);
  return pixels;
};
game.room.states.dusk.lightPixels = { warm: sample([255, 200, 100]) };
game.room.lights = [
  { id: "warm", position: [130, 100], strength: 0.6, drift: [0, 0] },
];
game.bloom = false;
calls.length = 0;
renderer.render(game);
const litActor = calls.find(
  (c) => c.type === "sprite" && c.args[0] === texture,
);
const tint = litActor.args[4];
assert(tint[0] > tint[1] && tint[1] > tint[2]);
assert(tint.slice(0, 3).every((v) => v >= 0.7 && v <= 1));
assert(
  Math.abs(litActor.args[6] - 0.9) < 1e-10,
  "Rim faces the strongest source",
);
assert.equal(uniforms.uBloom, 0, "G comparison removes both halo and core");
console.log(
  "Character brightness floor, warm lighting, strongest rim, and bloom toggle passed (mock GPU).",
);

// The flame uses the same sprite cell and mirror in the scene and bloom source.
game.character.glowTexture = {};
calls.length = 0;
renderer.render(game);
const characterCalls = calls.filter(
  (c) => c.type === "sprite" && c.args[0] === texture,
);
assert.equal(characterCalls.length, 2);
assert.deepEqual(
  characterCalls[0].args.slice(1, 4),
  characterCalls[1].args.slice(1, 4),
);
assert.equal(characterCalls[1].args[7].emission, true);
// Start columns affect both visible and emission crops, including stride frames.
const sideAnimation = game.character.animations["walk-side"];
sideAnimation.start = 2;
sideAnimation.stride = 96;
game.actor.walkPhase = 0.45;
calls.length = 0;
renderer.render(game);
const offsetCalls = calls.filter(
  (c) => c.type === "sprite" && c.args[0] === texture,
);
assert.equal(offsetCalls.length, 2);
for (const call of offsetCalls)
  assert.deepEqual(call.args[3], [96, 360, 24, 60]);
delete sideAnimation.start;
delete sideAnimation.stride;
game.character.glowTexture = null;
console.log("Character flame bloom alignment passed (mock GPU).");

// Validate uploaded 64-cube contents against an independent exhaustive OKLab
// reference at grid samples, including endpoints and both palette sizes.
function referenceLab(rgb) {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const { readFileSync } = await import("node:fs");
const paletteColors = JSON.parse(
  readFileSync(new URL("../dev/data/palette.json", import.meta.url)),
);
for (const count of [1, 17, 32, 256]) {
  const colors = paletteColors.slice(0, count).map((c) =>
    c
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16)),
  );
  assert.equal(
    colors.length,
    count,
    "Fixture contains the requested palette size",
  );
  const data = new Uint8Array(colors.flatMap((c) => [...c, 255]));
  let uploaded;
  const paletteRenderer = Object.create(Renderer.prototype);
  Object.assign(paletteRenderer, {
    pixels: () => data,
    gl: {
      createTexture: () => ({}),
      bindTexture() {},
      texParameteri() {},
      texImage3D(...args) {
        uploaded = args;
      },
    },
  });
  const start = performance.now();
  paletteRenderer.palette({ width: count, height: 1 });
  console.log(
    `${count}-colour 64³ lookup build and mock upload: ${(performance.now() - start).toFixed(1)} ms`,
  );
  assert.deepEqual(uploaded.slice(3, 6), [64, 64, 64]);
  const lut = uploaded[9];
  assert.equal(lut.length, 64 ** 3 * 4);
  const allowed = new Set(colors.map((c) => c.join(",")));
  for (let i = 0; i < lut.length; i += 4) {
    assert.equal(lut[i + 3], 255);
    assert(allowed.has(`${lut[i]},${lut[i + 1]},${lut[i + 2]}`));
  }
  const labs = colors.map(referenceLab);
  const samples = [0, 64 ** 3 - 1];
  for (let i = 0; i < 64 ** 3; i += 101) samples.push(i);
  for (const index of samples) {
    const lab = referenceLab(
      [index % 64, Math.floor(index / 64) % 64, Math.floor(index / 4096)].map(
        (v) => (v * 255) / 63,
      ),
    );
    let best = Infinity,
      nearest = 0;
    labs.forEach((p, i) => {
      const d = p.reduce((sum, v, c) => sum + (v - lab[c]) ** 2, 0);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    assert.deepEqual(
      Array.from(lut.slice(index * 4, index * 4 + 3)),
      colors[nearest],
    );
  }
  for (const [width, height] of [
    [0, 1],
    [257, 1],
    [32, 2],
  ]) {
    assert.throws(() => paletteRenderer.palette({ width, height }), /1 to 256/);
  }
}
console.log(
  "Palette sizes, 64³ uploads, palette membership, and exact OKLab reference samples passed.",
);

// Menu draws above the scene with a one-pixel border and shared hover colours.
const menuGame = {
  bookArt: { ink: "#1d202f", accent: "#8a5650" },
  menu: {
    header: "Lamp",
    verbs: ["Look at", "Use"],
    selected: 1,
    x: 500,
    y: 300,
    width: 90,
    height: 48,
    rowHeight: 12,
  },
};
calls.length = 0;
renderer.renderMenu(menuGame);
assert.deepEqual(calls[0].args.slice(0, 4), [500, 300, 90, 48]);
assert.deepEqual(calls[1].args.slice(0, 4), [501, 301, 88, 46]);
assert.equal(
  calls.filter((call) => call.type === "text").length,
  0,
  "NF-Pixels text uses the game-grid text layer",
);
console.log("Menu border and separate text layer passed (mock GPU).");

// Inventory draws the item's own sprite and shares the verb highlight colour.
const iconItem = { sprite: { texture: {}, size: [24, 36] } };
game.inventory = [iconItem];
game.panelHover = game.verbRects[0];
calls.length = 0;
renderer.renderPanel(game);
const iconDraw = calls.find(
  (call) => call.type === "sprite" && call.args[0] === iconItem.sprite.texture,
);
assert.deepEqual(iconDraw.args[1], [24, 36]);
assert.deepEqual(iconDraw.args[2].slice(2), [8, 12]);
assert(iconDraw.args[2].every(Number.isInteger));
const selectedColor = calls.find(
  (call) => call.type === "text" && call.args[0] === "Open",
).args[3];
game.verb = "Use";
calls.length = 0;
renderer.renderPanel(game);
assert.deepEqual(
  calls.find((call) => call.type === "text" && call.args[0] === "Open").args[3],
  selectedColor,
);
console.log(
  "Inventory sprite scaling and shared rose hover/selection colour passed.",
);

// Permanent pocket items hide Forget and remain visible in close-up footers.
const pocketIcon = {
  kind: "inventory",
  pocket: true,
  id: "map",
  label: "Island map",
  sprite: { texture: {}, size: [24, 14] },
};
const pocketView = {
  ...game,
  inventory: [pocketIcon],
  pocket: [pocketIcon],
  hover: pocketIcon,
  speech: null,
  sentenceNotice: null,
};
calls.length = 0;
renderer.renderPanel(pocketView);
assert(
  !calls.some((call) => call.type === "text" && call.args[0] === "Forget"),
);
calls.length = 0;
renderer.renderPanel({ ...pocketView, inventory: [pocketIcon, iconItem] });
assert(calls.some((call) => call.type === "text" && call.args[0] === "Forget"));
for (const closeup of [
  { activeBook: { site: "/tags/linux/" } },
  { activeBoard: { site: "/links/" } },
  { readerItem: {}, readerSite: "/posts/" },
]) {
  calls.length = 0;
  renderer.renderFooter({
    ...pocketView,
    ...closeup,
    siteHover: false,
  });
  const sprite = calls.find(
    (call) =>
      call.type === "sprite" && call.args[0] === pocketIcon.sprite.texture,
  );
  assert.deepEqual(sprite.args[2], [528, 341, 24, 14]);
  assert(
    calls.some(
      (call) => call.type === "text" && call.args[0] === "Open Island map",
    ),
  );
}

// Map rooms draw neither the character nor its shadow or lantern emission.
game.room.map = true;
calls.length = 0;
renderer.render(game);
assert(
  !calls.some((call) => call.type === "sprite" && call.args[0] === texture),
);
assert(!calls.some((call) => call.type === "sprite" && call.args[6]?.emission));

// Notice inventory icons keep the paper and pin on integer coordinates.
iconItem.pin = { texture: {}, size: [7, 7] };
calls.length = 0;
renderer.renderPanel(game);
const pinDraw = calls.find(
  (call) => call.type === "sprite" && call.args[0] === iconItem.pin.texture,
);
assert(pinDraw);
assert(pinDraw.args[2].every(Number.isInteger));
const noteTexture = {};
game.activeBoard = {
  art: {
    note: { image: "note.png" },
    sprites: { "note.png": { texture: noteTexture, size: [640, 360] } },
  },
};
game.inventoryNote = true;
game.boardNote = { id: "carried-note" };
renderer.renderBoard = () =>
  assert.fail("Carried note must keep current room behind it");
renderer.renderFooter = () => calls.push({ type: "footer" });
calls.length = 0;
renderer.render(game);
assert(
  calls.some((call) => call.type === "sprite" && call.args[0] === noteTexture),
);
assert(calls.some((call) => call.type === "footer"));
assert.equal(
  calls.filter((call) => call.type === "text" && call.args[0] === "Open")
    .length,
  0,
  "Carried note hides verb panel",
);
console.log(
  "Notice paper and pin icons and current-room note overlay passed (mock GPU).",
);

// Reader feedback uses the close-up footer and hides room speech and verbs.
game.inventoryNote = false;
game.activeBoard = null;
game.readerItem = { id: "reader" };
game.room.map = false;
game.speech = "Reader feedback";
game.speechLines = [game.speech];
game.elapsed = 1;
game.speechUntil = 4;
calls.length = 0;
renderer.render(game);
assert(calls.some((call) => call.type === "footer"));
assert(
  !calls.some(
    (call) =>
      call.type === "text" && ["Open", game.speech].includes(call.args[0]),
  ),
);

// Lamp storage is allocated at room load and updated only when values change.
const lampUploads = [];
const lamps = Object.create(Renderer.prototype);
Object.assign(lamps, {
  lightData: new Float32Array(12),
  data: {},
  gl: {
    activeTexture() {},
    bindTexture() {},
    texSubImage2D(...args) {
      lampUploads.push(args);
    },
  },
});
const lampRoom = { lights: [{ strength: 0.75, drift: [0.25, 0] }] };
lamps.lights({ room: lampRoom });
lamps.lights({ room: lampRoom });
assert.equal(lampUploads.length, 1);
lampRoom.lights[0].drift[0] = 0.5;
lamps.lights({ room: lampRoom });
assert.equal(lampUploads.length, 2);
assert.equal(lamps.lightData[2], 0.75);
assert.equal(lamps.lightData[8], 0.5);

// Room hover must not touch the Canvas 2D text layer or upload an empty texture.
const roomText = Object.create(Renderer.prototype);
roomText.textLayer = {
  update() {
    assert.fail("Room hover must not update text");
  },
};
for (const hover of [null, { kind: "hotspot" }])
  roomText.compositeText({ hover });

// Exercise sprite uniforms with real state functions rather than mocked sprite calls.
const spriteRenderer = Object.create(Renderer.prototype);
const spriteUniforms = {};
Object.assign(spriteRenderer, {
  programs: {},
  pixelScale: 4 / 3,
  use() {},
  bind() {},
  integer() {},
  draw() {},
  uniform(name, value) {
    spriteUniforms[name] = value;
  },
});
game.character.glowTexture = null;
spriteRenderer.sprite(
  {},
  [24, 60],
  [0, 0, 24, 60],
  undefined,
  undefined,
  false,
  0,
  { game },
);
assert.deepEqual(spriteUniforms.uHand, [game.actor.x, game.actor.y]);
assert.equal(spriteUniforms.uFlame, 0);
assert.equal(spriteUniforms.uRimOffset, 4 / 3);

// Each character keeps its own scale, lighting and foreground baseline.
game.actors = [
  { ...game.actor, y: 145, character: { ...game.character, texture: {} } },
];
for (const y of [145, 155]) {
  game.actors[0].y = y;
  calls.length = 0;
  renderer.render(game);
  const sprites = calls.filter(
    (c) =>
      c.type === "sprite" &&
      [texture, game.actors[0].character.texture].includes(c.args[0]),
  );
  assert.deepEqual(
    sprites.map((c) => c.args[0]),
    y < game.actor.y
      ? [game.actors[0].character.texture, texture]
      : [texture, game.actors[0].character.texture],
  );
  assert.equal(
    sprites.find((c) => c.args[0] === game.actors[0].character.texture).args[7]
      .actor.y,
    y,
  );
}
console.log(
  "Room actors sort with visitor by feet and keep separate foreground baselines.",
);
// Intro scenes keep room actors and omit the visitor and all panel controls.
game.intro = { text: () => null };
calls.length = 0;
renderer.render(game);
assert(!calls.some((c) => c.type === "sprite" && c.args[0] === texture));
assert(
  calls.some(
    (c) =>
      c.type === "sprite" && c.args[0] === game.actors[0].character.texture,
  ),
);
assert(!calls.some((c) => c.type === "text"));
console.log("Intro renders room actors without visitor or panel.");
