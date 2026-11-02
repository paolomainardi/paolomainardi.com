import { image, json, resolve, matchingItems } from "./assets.js";

export async function loadFont(url, renderer) {
  const font = await json(url);
  const bitmap = await image(resolve(font.image, url));
  const pixels = renderer.pixels(bitmap);
  for (let i = 3; i < pixels.length; i += 4)
    if (![0, 128, 255].includes(pixels[i]))
      throw new Error("Font alpha must be 0, 128 or 255.");
  return {
    ...font,
    texture: renderer.texture(bitmap),
    size: [bitmap.width, bitmap.height],
  };
}

export async function loadBook(url, renderer) {
  const book = await json(url);
  const [bitmap, turn, title, body] = await Promise.all([
    image(resolve(book.image, url)),
    image(resolve(book.turn.sheet, url)),
    loadFont(resolve(book.fonts.title, url), renderer),
    loadFont(resolve(book.fonts.body, url), renderer),
  ]);
  if (
    bitmap.width !== 640 ||
    bitmap.height !== 360 ||
    turn.width !== book.turn.rect[2] * book.turn.frames ||
    turn.height !== book.turn.rect[3]
  )
    throw new Error(
      "Book drawings must match the frame and turn strip dimensions.",
    );
  return {
    ...book,
    texture: renderer.texture(bitmap),
    turn: {
      ...book.turn,
      texture: renderer.texture(turn),
      size: [turn.width, turn.height],
    },
    fonts: { title, body },
  };
}

export function bookItems(items, filter) {
  const matches = matchingItems(
    items.filter((item) => item.type === "post"),
    filter,
  );
  return filter?.series
    ? matches
    : matches.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function glyph(font, char) {
  return font.glyphs[char] || font.glyphs["?"];
}

export function measure(font, text) {
  return Array.from(String(text)).reduce(
    (w, char) => w + (char === " " ? font.space : glyph(font, char)[6]),
    0,
  );
}

export function wrapAtlas(font, text, width, maxLines = Infinity) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      if (line && measure(font, line + " " + word) > width) {
        lines.push(line);
        line = "";
      }
      if (line) line += " ";
      for (const char of word) {
        if (line && measure(font, line + char) > width) {
          lines.push(line.trimEnd());
          line = "";
        }
        line += char;
      }
    }
    if (line.trim()) lines.push(line.trimEnd());
  }
  if (lines.length > maxLines) {
    let end = lines[maxLines - 1].trimEnd();
    while (end && measure(font, end + "…") > width)
      end = Array.from(end).slice(0, -1).join("");
    return [...lines.slice(0, maxLines - 1), end.trimEnd() + "…"];
  }
  return lines;
}

export function layoutBook(book, topic) {
  const pages = [];
  let index = 0;
  do {
    const number = pages.length + 1;
    const [x, y, width, height] = book.pages[(number - 1) % 2];
    const page = { number, x, y, width, height, entries: [], heading: [] };
    let top = y;
    if (number === 1) {
      page.heading = wrapAtlas(book.fonts.title, topic.title, width, 2);
      top += page.heading.length * book.fonts.title.lineHeight;
      page.count = `${topic.items.length} posts`;
      top += book.fonts.body.lineHeight * 2;
    }
    const bottom = y + height - book.fonts.body.lineHeight * 2;
    while (index < topic.items.length) {
      const item = topic.items[index];
      const lines = wrapAtlas(book.fonts.body, item.title, width, 2);
      const entryHeight = (lines.length + 1) * book.fonts.body.lineHeight;
      if (top + entryHeight > bottom) break;
      page.entries.push({ item, lines, x, y: top, width, height: entryHeight });
      top += entryHeight + book.fonts.body.lineHeight;
      index++;
    }
    if (!page.entries.length && index < topic.items.length && number > 1)
      throw new Error("Book page is too small for an entry.");
    pages.push(page);
  } while (index < topic.items.length || pages.length % 2);
  return pages;
}

export function hitEntry(pages, spread, x, y) {
  return (
    pages
      .slice(spread * 2, spread * 2 + 2)
      .flatMap((page) => page.entries)
      .find(
        (entry) =>
          x >= entry.x &&
          x < entry.x + entry.width &&
          y >= entry.y &&
          y < entry.y + entry.height,
      ) || null
  );
}

export function parseRoute(hash, start) {
  try {
    const parts = hash.replace(/^#/, "").split("/");
    return {
      room: decodeURIComponent(parts[0] || start),
      book: parts[1] === "book" ? decodeURIComponent(parts[2] || "") : null,
      spread: /^\d+$/.test(parts[3] || "") ? Number(parts[3]) : 0,
      item:
        parts[1] && parts[1] !== "book" ? decodeURIComponent(parts[1]) : null,
    };
  } catch {
    return { room: start, book: null, spread: 0, item: null };
  }
}

export function bookRoute(room, id, spread) {
  return `#${encodeURIComponent(room)}/book/${encodeURIComponent(id)}/${spread}`;
}
