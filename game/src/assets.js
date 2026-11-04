// Load world data and room drawings, and derive masks and content bindings.
import { validateActors, validateActorSheet, createActor } from "./actors.js";
import { validateIntro } from "./intro.js";
import { buildWater } from "./water.js";

export function resolve(path, base) {
  const url = new URL(path, base);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Assets and readers require HTTP(S) URLs.");
  return url.href;
}

export async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${url}: ${response.status}`);
  return response.json();
}

export async function image(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${url}: ${response.status}`);
  return createImageBitmap(await response.blob(), {
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
  });
}

export function matchingItems(items, filter = {}) {
  return items
    .filter((item) =>
      Object.entries(filter).every(([key, value]) => {
        if (key === "tags")
          return (Array.isArray(value) ? value : [value]).some((tag) =>
            (item.tags || []).includes(tag),
          );
        return item[key] === value;
      }),
    )
    .sort(
      (a, b) =>
        (a.part ?? Infinity) - (b.part ?? Infinity) ||
        (b.date || "").localeCompare(a.date || ""),
    );
}

export async function loadWorld(worldURL, contentURL, origin) {
  const [world, content] = await Promise.all([
    json(worldURL),
    json(contentURL),
  ]);
  validateIntro(world);
  const items = content.items.map((item) => {
    const reader = item.reader ? resolve(item.reader, contentURL) : null;
    if (reader && new URL(reader).origin !== origin)
      throw new Error("Readers must stay on the page origin.");
    return {
      ...item,
      link: item.link ? resolve(item.link, contentURL) : null,
      url: item.url ? resolve(item.url, contentURL) : null,
      reader,
    };
  });
  const bitmaps = new Map();
  const bitmap = (path, base) => {
    const url = resolve(path, base);
    if (!bitmaps.has(url)) bitmaps.set(url, image(url));
    return bitmaps.get(url);
  };
  const characterURL = resolve(world.character, worldURL);
  const character = await json(characterURL);
  const [palette, sheet, glow] = await Promise.all([
    bitmap(world.palette, worldURL),
    bitmap(character.sheet, characterURL),
    character.glow ? bitmap(character.glow, characterURL) : null,
  ]);
  if (glow && (glow.width !== sheet.width || glow.height !== sheet.height))
    throw new Error("Character glow must match the sheet grid.");
  return {
    world,
    items,
    character: { ...character, sheet, glow },
    palette,
    pocket: await Promise.all(
      (world.pocket || []).map(async (item) => ({
        ...item,
        kind: "inventory",
        pocket: true,
        bitmap: await bitmap(item.icon, worldURL),
      })),
    ),
    books: Object.fromEntries(
      await Promise.all(
        Object.entries(world.books || {}).map(async ([id, book]) => [
          id,
          {
            ...book,
            id,
            voiceLook: Object.values(world.rooms).find((room) =>
              room.books?.includes(id),
            )?.looks?.[id],
            bitmap: await bitmap(book.sprite, worldURL),
          },
        ]),
      ),
    ),
  };
}

// Derive floor, item ids and foreground baselines from exact mask colours.
export async function loadRoom(world, worldURL, id, renderer) {
  const config = Object.hasOwn(world.rooms, id) ? world.rooms[id] : null;
  if (!config) throw new Error(`Unknown room: ${id}`);
  const url = resolve(config.src, worldURL),
    room = await json(url);
  if (
    !Array.isArray(room.size) ||
    room.size.length !== 2 ||
    !room.size.every((value) => Number.isInteger(value) && value > 0)
  )
    throw new Error("Room size must contain two positive integers.");
  const [width, height] = room.size;
  const lights = room.items
    .filter((item) => item.kind === "light")
    .map((item) => ({
      ...item,
      on: true,
      level: 1,
      strength: 1,
      drift: [0, 0],
    }));
  if (
    !room.albedo ||
    Object.values(room.states).some(
      (state) =>
        !state.unlit || lights.some((light) => !state.lights?.[light.id]),
    )
  )
    throw new Error(
      "Room requires albedo, unlit, and one drawing per lamp in every state.",
    );
  const [maskImage, albedo, waterImage, states] = await Promise.all([
    image(resolve(room.objects, url)),
    image(resolve(room.albedo, url)),
    room.water ? image(resolve(room.water, url)) : null,
    Promise.all(
      Object.entries(room.states).map(async ([key, state]) => [
        key,
        {
          unlit: await image(resolve(state.unlit, url)),
          lights: Object.fromEntries(
            await Promise.all(
              lights.map(async (light) => [
                light.id,
                await image(resolve(state.lights[light.id], url)),
              ]),
            ),
          ),
        },
      ]),
    ),
  ]);
  for (const bitmap of [
    maskImage,
    albedo,
    ...(waterImage ? [waterImage] : []),
    ...states.flatMap(([, state]) => [
      state.unlit,
      ...Object.values(state.lights),
    ]),
  ]) {
    if (bitmap.width !== width || bitmap.height !== height)
      throw new Error(`Room ${id} images must match its size.`);
  }
  for (const [, state] of states) {
    state.unlitPixels = renderer.pixels(state.unlit);
    state.lightPixels = Object.fromEntries(
      Object.entries(state.lights).map(([id, drawing]) => [
        id,
        renderer.pixels(drawing),
      ]),
    );
  }
  const pixels = renderer.pixels(maskImage);
  const walkable = new Uint8Array(width * height),
    foreground = new Uint8Array(width * height * 4);
  const ids = new Int16Array(width * height).fill(-1);
  const colorMap = new Map(
    room.items.map((item, i) => [parseInt(item.color.slice(1), 16), i]),
  );
  const bounds = room.items.map(() => [width, height, -1, -1]);
  for (let i = 0; i < ids.length; i++) {
    const color =
      (pixels[i * 4] << 16) | (pixels[i * 4 + 1] << 8) | pixels[i * 4 + 2];
    const id = colorMap.get(color);
    if (id === undefined) continue;
    ids[i] = id;
    const item = room.items[id],
      x = i % width,
      y = Math.floor(i / width),
      b = bounds[id];
    b[0] = Math.min(b[0], x);
    b[1] = Math.min(b[1], y);
    b[2] = Math.max(b[2], x);
    b[3] = Math.max(b[3], y);
    if (item.kind === "walkable") walkable[i] = 1;
  }
  room.items.forEach((item, i) => {
    item.bounds = bounds[i];
    if (item.kind === "foreground") item.baseline = bounds[i][3];
    item.position = [(bounds[i][0] + bounds[i][2]) / 2, bounds[i][3]];
  });
  for (let i = 0; i < ids.length; i++) {
    const item = room.items[ids[i]];
    if (item?.kind === "foreground")
      foreground.set([item.baseline >> 8, item.baseline & 255, 0, 255], i * 4);
  }
  for (const light of lights) {
    light.position = room.items.find((item) => item.id === light.id).position;
  }
  validateActors(config.actors === undefined ? [] : config.actors, world, {
    ...room,
    walkable,
  });
  const actors = await Promise.all(
    (config.actors || []).map(async (actor) => {
      const sheetURL = resolve(actor.sheet, worldURL);
      const sheet = await json(sheetURL);
      const bitmap = await image(resolve(sheet.sheet, sheetURL));
      validateActorSheet(sheet, bitmap);
      return createActor(actor, {
        ...sheet,
        sheet: bitmap,
        size: [bitmap.width, bitmap.height],
      });
    }),
  );
  return {
    ...room,
    actors,
    id,
    config,
    states: Object.fromEntries(states),
    albedo,
    water: waterImage
      ? buildWater(renderer.pixels(waterImage), room.size)
      : null,
    lights,
    ids,
    walkable,
    foreground,
  };
}

export function flameCentroids(character, renderer) {
  if (character.glow) {
    const pixels = renderer.pixels(character.glow);
    character.flames = {};
    for (const [name, animation] of Object.entries(character.animations)) {
      character.flames[name] = [];
      for (let frame = 0; frame < animation.frames; frame++) {
        let sx = 0,
          sy = 0,
          weight = 0;
        for (let y = 0; y < character.frame[1]; y++)
          for (let x = 0; x < character.frame[0]; x++) {
            const i =
              ((animation.row * character.frame[1] + y) * character.size[0] +
                ((animation.start || 0) + frame) * character.frame[0] +
                x) *
              4;
            const w = ((pixels[i] / 255) * pixels[i + 3]) / 255;
            sx += (x + 0.5) * w;
            sy += (y + 0.5) * w;
            weight += w;
          }
        character.flames[name].push(
          weight
            ? [
                sx / weight - character.anchor[0],
                sy / weight - character.anchor[1],
              ]
            : character.lantern,
        );
      }
    }
  }
}

export function bindRoom(game) {
  const room = game.room;
  for (const hotspot of room.items.filter((item) => item.kind === "hotspot")) {
    const binding = room.config.hotspots?.[hotspot.id];
    if (!binding) continue;
    if (binding.go) {
      const via = room.items.find(
        (item) => item.id === binding.via && item.kind === "exit",
      );
      if (!Object.hasOwn(game.world.rooms, binding.go) || !via)
        throw new Error(`Invalid travel hotspot: ${hotspot.id}`);
      hotspot.go = binding.go;
      hotspot.via = via;
      continue;
    }
    if (binding.board) {
      hotspot.board = game.boards[binding.board];
      if (!hotspot.board) throw new Error(`Unknown board: ${binding.board}`);
      continue;
    }
    if (!binding.content) continue;
    hotspot.binding = "content";
    const item = newest(matchingItems(game.items, binding.content))[0];
    if (item) {
      hotspot.content = item;
      hotspot.site = binding.site;
      hotspot.label = `${hotspot.label || hotspot.id}: ${item.title}`;
    }
  }
  game.objects = room.items
    .filter((item) => item.kind === "slot" && item.bounds[2] >= 0)
    .slice(0, room.config.books?.length || 0)
    .map((slot, i) => {
      const book = game.books[room.config.books[i]];
      if (!book) throw new Error(`Unknown book: ${room.config.books[i]}`);
      return {
        ...slot,
        kind: "book",
        label: book.title,
        book,
        sprite: book.sprite,
      };
    });
}

export function newest(items) {
  return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
