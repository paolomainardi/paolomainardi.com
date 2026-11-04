// Load book art and fonts, paginate entries, and track page drags.
import { inside, rectangle } from "./panel.js";
import {
  image,
  json,
  resolve,
  versioned,
  matchingItems,
  newest,
} from "./assets.js";

export async function loadFonts(book, url) {
  const face = new FontFace(
    book.font.family,
    `url("${versioned(resolve(book.font.regular, url))}")`,
  );
  await face.load();
  document.fonts.add(face);
  return face;
}

export function bookFonts(book, context) {
  return Object.fromEntries(
    Object.entries(book.sizes).map(([role, size]) => {
      const css = `${size}px "${book.font.family}"`;
      context.font = css;
      const metrics = context.measureText("Hg");
      return [
        role,
        {
          css,
          ascent: Math.ceil(metrics.actualBoundingBoxAscent),
          lineHeight: Math.round(size * 1.3),
          measure(text) {
            context.font = css;
            return context.measureText(String(text)).width;
          },
        },
      ];
    }),
  );
}

export async function loadBook(url, renderer) {
  const book = await json(url);
  const [bitmap, turn, curl] = await Promise.all([
    image(resolve(book.image, url)),
    image(resolve(book.turn.sheet, url)),
    image(resolve(book.curl.image, url)),
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
  const fontFace = await loadFonts(book, url);
  return {
    ...book,
    fontFace,
    texture: renderer.texture(bitmap),
    turn: {
      ...book.turn,
      texture: renderer.texture(turn),
      size: [turn.width, turn.height],
    },
    curl: {
      ...book.curl,
      texture: renderer.texture(curl),
      size: [curl.width, curl.height],
    },
    fonts: bookFonts(book, renderer.textLayer.context),
  };
}

export function bookItems(items, filter) {
  const matches = matchingItems(
    items.filter((item) => item.type === (filter?.type || "post")),
    filter,
  );
  return filter?.series ? matches : newest(matches);
}

export function wrapText(font, text, width, maxLines = Infinity) {
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if (!word) continue;
      if (line && font.measure(line + " " + word) > width) {
        lines.push(line);
        line = "";
      }
      if (line) line += " ";
      for (const char of word) {
        if (line && font.measure(line + char) > width) {
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
    while (end && font.measure(end + "…") > width)
      end = Array.from(end).slice(0, -1).join("");
    return [...lines.slice(0, maxLines - 1), end.trimEnd() + "…"];
  }
  return lines;
}

// Fill complete entries into paired pages, reserving room for headings and numbers.
export function layoutBook(book, topic) {
  const pages = [];
  let index = 0;
  do {
    const number = pages.length + 1;
    const [x, y, width, height] = book.pages[(number - 1) % 2];
    const page = { number, x, y, width, height, entries: [], heading: [] };
    let top = y;
    if (number === 1) {
      page.heading = wrapText(book.fonts.title, topic.title, width, 2);
      top += page.heading.length * book.fonts.title.lineHeight;
      page.count = `${topic.items.length} ${topic.content?.type === "link" ? "links" : "posts"}`;
      top += book.fonts.body.lineHeight * 2;
    }
    const bottom = y + height - book.fonts.label.lineHeight;
    while (index < topic.items.length) {
      const item = topic.items[index];
      const lines = wrapText(book.fonts.body, item.title, width, 2);
      const entryHeight =
        lines.length * book.fonts.body.lineHeight + book.fonts.label.lineHeight;
      if (top + entryHeight > bottom) break;
      page.entries.push({ item, lines, x, y: top, width, height: entryHeight });
      top += entryHeight + Math.round(book.fonts.body.lineHeight / 2);
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
      .find((entry) => inside(entry, x, y)) || null
  );
}

export function cornerHit(book, spread, pageCount, x, y) {
  for (const direction of [-1, 1]) {
    if (spread + direction < 0 || spread + direction >= pageCount / 2) continue;
    const [px, py, width, height] = book.curl.rects[direction < 0 ? 0 : 1];
    if (inside(rectangle(px - 8, py - 4, width + 16, height + 12), x, y))
      return direction;
  }
  return 0;
}

// Capture an available outer leaf while leaving entry presses available for reading.
export function dragPage(book, spread, pageCount, x, y) {
  for (const direction of [-1, 1]) {
    const [px, py, width, height] = book.pages[direction < 0 ? 0 : 1];
    const [cx, cy, cw, ch] = book.curl.rects[direction < 0 ? 0 : 1];
    const left = Math.min(px, cx),
      right = Math.max(px + width, cx + cw);
    const corner = cornerHit(book, spread, pageCount, x, y) === direction;
    const outer = direction < 0 ? x < px + width / 2 : x >= px + width / 2;
    if (
      (corner ||
        (outer &&
          inside(
            rectangle(
              left,
              py - 16,
              right - left,
              Math.max(py + height, cy + ch) - py + 16,
            ),
            x,
            y,
          ))) &&
      spread + direction >= 0 &&
      spread + direction < pageCount / 2
    )
      return {
        direction,
        start: x,
        // Distance to the spine makes a full drag turn one leaf.
        distance: Math.abs(
          x - (book.pages[0][0] + book.pages[0][2] + book.pages[1][0]) / 2,
        ),
        progress: 0,
        dragging: true,
        moved: false,
        corner,
      };
  }
  return null;
}

export function movePage(turn, x) {
  turn.moved ||= Math.abs(x - turn.start) > 3;
  turn.progress = Math.max(
    0,
    Math.min(1, ((turn.start - x) * turn.direction) / turn.distance),
  );
}

export function releasePage(turn, cancelled = false) {
  turn.dragging = false;
  turn.commit =
    !cancelled && (turn.progress > 0.5 || (!turn.moved && turn.corner));
  return turn.commit;
}
