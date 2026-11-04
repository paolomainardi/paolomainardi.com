// Count real loader requests and on-disk payload bytes without a server or GPU.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadWorld, loadRoom, resolve } from "../src/assets.js";
import { loadBook } from "../src/book.js";
import { loadBoard } from "../src/board.js";

const worldURL = new URL(
  process.argv[2] || "../dev/real/world.json",
  import.meta.url,
).href;
const contentURL = new URL(
  process.argv[3] || "../../output/play/content.json",
  import.meta.url,
).href;
const origin = "https://adventure.test";
const files = new Map();
const requests = [];
// Map HTTP URLs back to the supplied local files, retaining relative resolution.
const paths = new Map();
function register(file) {
  const url = origin + new URL(file).pathname;
  paths.set(url, file);
  return url;
}
const world = register(worldURL),
  content = register(contentURL);
function read(url) {
  const path = fileURLToPath(
    paths.get(url) || "file://" + new URL(url).pathname,
  );
  const bytes = readFileSync(path);
  requests.push({ path, bytes: bytes.length });
  files.set(path, bytes.length);
  return bytes;
}
globalThis.fetch = async (url) => {
  const bytes = read(String(url));
  return {
    ok: true,
    json: async () => JSON.parse(bytes),
    blob: async () => bytes,
  };
};
globalThis.createImageBitmap = async (bytes) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});
globalThis.FontFace = class {
  constructor(_family, source) {
    this.url = source.slice(5, -2);
  }
  async load() {
    read(this.url);
    return this;
  }
};
globalThis.document = { fonts: { add() {} } };
const renderer = {
  texture() {},
  pixels: (bitmap) => new Uint8Array(bitmap.width * bitmap.height * 4),
  textLayer: {
    context: { measureText: () => ({ actualBoundingBoxAscent: 7 }) },
  },
};
const assets = await loadWorld(world, content, origin);
await loadBook(resolve(assets.world.book, world), renderer);
for (const board of Object.values(assets.world.boards || {}))
  await loadBoard(board, world, renderer);
await loadRoom(assets.world, world, assets.world.start, renderer);
console.log(
  JSON.stringify(
    {
      world: fileURLToPath(worldURL),
      content: fileURLToPath(contentURL),
      loaderRequests: requests.length,
      requestedBytes: requests.reduce((sum, request) => sum + request.bytes, 0),
      uniqueFiles: files.size,
      uniqueBytes: [...files.values()].reduce((sum, bytes) => sum + bytes, 0),
      files: [...files].map(([path, bytes]) => ({ path, bytes })),
    },
    null,
    2,
  ),
);
