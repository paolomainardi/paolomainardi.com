import { image, json, resolve, matchingItems } from "./assets.js";
import { wrapText, measure } from "./book.js";

export async function loadBoard(config, worldURL, renderer) {
  const url = resolve(config.board, worldURL);
  const art = await json(url);
  const paths = [
    art.image,
    art.pin,
    art.note.image,
    ...art.notices.map((n) => n.paper),
  ];
  const sprites = Object.fromEntries(
    await Promise.all(
      [...new Set(paths)].map(async (path) => {
        const bitmap = await image(resolve(path, url));
        return [
          path,
          {
            texture: renderer.texture(bitmap),
            size: [bitmap.width, bitmap.height],
          },
        ];
      }),
    ),
  );
  return { ...art, sprites };
}

export function boardItems(items, filter) {
  return matchingItems(items, filter).sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  );
}

export function boardPage(board, page) {
  return Math.max(
    0,
    Math.min(
      Math.floor(page),
      Math.max(0, Math.ceil(board.items.length / board.art.notices.length) - 1),
    ),
  );
}

export function boardEntries(board, page) {
  return board.items
    .slice(
      page * board.art.notices.length,
      (page + 1) * board.art.notices.length,
    )
    .map((item, i) => ({ item, ...board.art.notices[i] }));
}

export function noteTakeRect(art) {
  if (art.note.take) return art.note.take;
  const [gx, gy, gw, gh] = art.note.go,
    [bx] = art.note.back;
  return [Math.round((gx + gw + bx - 80) / 2), gy, 80, gh];
}

export function boardHit(board, page, note, x, y, canTake = true) {
  const hit = ([px, py, w, h]) =>
    x >= px && x < px + w && y >= py && y < py + h;
  if (note) {
    if (hit(board.art.note.go)) return "go";
    if (canTake && hit(noteTakeRect(board.art))) return "take";
    if (hit(board.art.note.back)) return "back";
    return null;
  }
  if (page > 0 && hit(board.art.newer)) return "newer";
  if (page < boardPage(board, Infinity) && hit(board.art.older)) return "older";
  return (
    boardEntries(board, page).find((entry) =>
      hit([...entry.at, ...board.art.sprites[entry.paper].size]),
    )?.item || null
  );
}

// The board's title and subtitle sit on a paper strip above the notices, centred on them.
export function boardTitleBox(board, art, fonts) {
  if (!board.title && !board.subtitle) return null;
  const top = Math.min(...art.notices.map((notice) => notice.at[1]));
  const left = Math.min(...art.notices.map((notice) => notice.at[0]));
  const right = Math.max(
    ...art.notices.map((notice) => notice.at[0] + art.sprites[notice.paper].size[0]),
  );
  const lines = [
    ...wrapText(fonts.title, board.title || "", right - left, 1).map((v) => [fonts.title, v, art.ink]),
    ...wrapText(fonts.body, board.subtitle || "", right - left, 1).map((v) => [fonts.body, v, art.faded]),
  ];
  const w = Math.max(...lines.map(([font, value]) => measure(font, value))) + 16;
  const h = lines.reduce((sum, [font]) => sum + font.lineHeight, 0) + 8;
  const [x, y] = art.title
    ? [art.title[0] + Math.floor((art.title[2] - w) / 2), art.title[1]]
    : [Math.floor((left + right - w) / 2), Math.max(0, top - h - 4)];
  return { x, y, w, h, lines };
}

export function boardText(board, page, note, hover, fonts, canTake = true) {
  const art = board.art,
    lines = [];
  const add = (font, value, x, y, color) =>
    lines.push({ font, value, x, y, color });
  const paper = (item, rect, lifted, full) => {
    const [x, top, width, height] = rect,
      y = top - Number(lifted);
    const title = full ? fonts.title : fonts.body;
    const maxTitle = Math.max(
      1,
      Math.floor((height - fonts.label.lineHeight) / title.lineHeight),
    );
    const titles = wrapText(
      title,
      item.title,
      width,
      Math.min(full ? 3 : Infinity, maxTitle),
    );
    titles.forEach((line, i) =>
      add(
        title,
        line,
        x,
        y + i * title.lineHeight,
        lifted ? art.accent : art.ink,
      ),
    );
    const dateY = y + titles.length * title.lineHeight;
    add(fonts.label, item.date || "", x, dateY, art.faded);
    if (full) {
      const host =
        item.link || item.url ? new URL(item.link || item.url).hostname : "";
      add(fonts.label, host, x, dateY + fonts.label.lineHeight, art.faded);
      const bodyY = dateY + fonts.label.lineHeight * 3;
      wrapText(
        fonts.body,
        item.description || "No note on this one. Worth a look.",
        width,
        Math.max(1, Math.floor((y + height - bodyY) / fonts.body.lineHeight)),
      ).forEach((line, i) =>
        add(
          fonts.body,
          line,
          x,
          bodyY + i * fonts.body.lineHeight,
          item.description ? art.ink : art.faded,
        ),
      );
    }
  };
  if (note) {
    paper(note, art.note.text, false, true);
    for (const [key, label] of [
      ["go", "Go there"],
      ...(canTake ? [["take", "Take it"]] : []),
      ["back", "Back"],
    ])
      add(
        fonts.body,
        label,
        ...(key === "take" ? noteTakeRect(art) : art.note[key]).slice(0, 2),
        hover === key ? art.accent : art.ink,
      );
  } else {
    const box = boardTitleBox(board, art, fonts);
    if (box) {
      let lineY = box.y + 4;
      for (const [font, value, color] of box.lines) {
        add(font, value, box.x + Math.floor((box.w - measure(font, value)) / 2), lineY, color);
        lineY += font.lineHeight;
      }
    }
    for (const entry of boardEntries(board, page))
      paper(entry.item, entry.text, hover === entry.item, false);
    // The paging papers are part of the board drawing: an inactive one says why, in faded ink.
    for (const [key, label, idle, visible] of [
      [
        "older",
        "Older notices",
        "No older notices",
        page < boardPage(board, Infinity),
      ],
      ["newer", "Newer notices", "Latest notices", page > 0],
    ])
      add(
        fonts.body,
        visible ? label : idle,
        ...art[key].slice(0, 2),
        !visible ? art.faded : hover === key ? art.accent : art.ink,
      );
  }
  return lines;
}
