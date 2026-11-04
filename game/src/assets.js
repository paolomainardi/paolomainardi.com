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

export async function loadWorld(worldURL, contentURL) {
  const [world, content] = await Promise.all([
    json(worldURL),
    json(contentURL),
  ]);
  const characterURL = resolve(world.character, worldURL);
  const character = await json(characterURL);
  const [palette, sheet, glow, objects] = await Promise.all([
    image(resolve(world.palette, worldURL)),
    image(resolve(character.sheet, characterURL)),
    character.glow ? image(resolve(character.glow, characterURL)) : null,
    Promise.all(
      Object.entries(world.objects || {}).map(async ([key, value]) => {
        const paths = Array.isArray(value) ? value : [value];
        if (
          !paths.length ||
          paths.some((path) => typeof path !== "string" || !path)
        )
          throw new Error(
            `Object ${key} requires a sprite path or a non-empty list of sprite paths.`,
          );
        return [
          key,
          await Promise.all(
            paths.map((path) => image(resolve(path, worldURL))),
          ),
        ];
      }),
    ),
  ]);
  if (glow && (glow.width !== sheet.width || glow.height !== sheet.height))
    throw new Error("Character glow must match the sheet grid.");
  return {
    world,
    items: content.items.map((item) => ({
      ...item,
      link: item.link ? resolve(item.link, contentURL) : null,
      url: item.url ? resolve(item.url, contentURL) : null,
      reader: item.reader ? resolve(item.reader, contentURL) : null,
    })),
    character: { ...character, sheet, glow },
    palette,
    objects: Object.fromEntries(objects),
    books: Object.fromEntries(
      await Promise.all(
        Object.entries(world.books || {}).map(async ([id, book]) => [
          id,
          {
            ...book,
            id,
            bitmap: await image(resolve(book.sprite, worldURL)),
          },
        ]),
      ),
    ),
  };
}

export async function loadRoom(world, worldURL, id, renderer) {
  const config = world.rooms[id];
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
  return {
    ...room,
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
