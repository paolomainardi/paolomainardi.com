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
  const [palette, sheet, objects] = await Promise.all([
    image(resolve(world.palette, worldURL)),
    image(resolve(character.sheet, characterURL)),
    Promise.all(
      Object.entries(world.objects || {}).map(async ([key, path]) => [
        key,
        await image(resolve(path, worldURL)),
      ]),
    ),
  ]);
  return {
    world,
    items: content.items.map((item) => ({
      ...item,
      reader: item.reader ? resolve(item.reader, contentURL) : null,
    })),
    character: { ...character, sheet },
    palette,
    objects: Object.fromEntries(objects),
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
  const [maskImage, states, pools] = await Promise.all([
    image(resolve(room.objects, url)),
    Promise.all(
      Object.entries(room.states).map(async ([key, state]) => [
        key,
        {
          lit: await image(resolve(state.lit, url)),
          unlit: await image(resolve(state.unlit, url)),
        },
      ]),
    ),
    Promise.all(
      room.items
        .filter((item) => item.kind === "light")
        .map(async (item) => ({
          ...item,
          image: await image(resolve(item.pool, url)),
          on: true,
          level: 1,
          strength: 1,
        })),
    ),
  ]);
  for (const bitmap of [
    maskImage,
    ...states.flatMap(([, state]) => [state.lit, state.unlit]),
    ...pools.map((pool) => pool.image),
  ]) {
    if (bitmap.width !== width || bitmap.height !== height)
      throw new Error(`Room ${id} images must match its size.`);
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
    if (item.kind === "foreground") foreground.set([255, 255, 255, 255], i * 4);
  }
  room.items.forEach((item, i) => {
    item.bounds = bounds[i];
    item.position = [(bounds[i][0] + bounds[i][2]) / 2, bounds[i][3]];
  });
  for (const light of pools) {
    light.position = room.items.find((item) => item.id === light.id).position;
    light.pixels = renderer.pixels(light.image);
  }
  return {
    ...room,
    id,
    config,
    states: Object.fromEntries(states),
    lights: pools,
    ids,
    walkable,
    foreground,
  };
}
