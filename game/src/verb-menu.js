// Filter supported target actions and place context menus and exit cursors.
import { inside, rectangle } from "./panel.js";
import { wrapText } from "./book.js";

export function targetVerbs(verbs, target) {
  return verbs.filter((verb) => {
    if (
      target.kind === "actor" &&
      ["Look at", "Use", "Take", "Talk to"].includes(verb)
    )
      return true;
    if (verb === "Walk to" || verb === "Look at") return true;
    if (verb === "Use")
      return ["light", "exit", "inventory"].includes(target.kind);
    if (verb === "Take")
      return (
        target.kind === "book" ||
        (target.kind === "hotspot" &&
          (target.board || target.binding === "content"))
      );
    if (verb === "Open")
      return (
        ["book", "inventory", "exit"].includes(target.kind) ||
        (target.kind === "hotspot" &&
          !!(target.content || target.board || target.go))
      );
    return false;
  });
}

export function layoutMenu(target, verbs, point, size, font) {
  const body = font.body,
    heading = font.label;
  const textWidth = (text, role = body) => role.measure(text);
  const name = target.label || target.id;
  const width = Math.min(
    size[0],
    240,
    Math.ceil(
      Math.max(
        textWidth(name, heading),
        ...verbs.map((verb) => textWidth(verb)),
      ),
    ) + 12,
  );
  const header = wrapText(heading, name, width - 12, 1)[0];
  const rowHeight =
    Math.ceil(Math.max(body.lineHeight, heading.lineHeight)) + 4;
  const listTop = rowHeight + 8;
  const height = listTop + verbs.length * rowHeight + 4;
  const x = Math.max(0, Math.min(Math.round(point[0]) + 3, size[0] - width));
  const y = Math.max(0, Math.min(Math.round(point[1]) + 3, size[1] - height));
  return {
    target,
    verbs,
    header,
    x,
    y,
    width,
    height,
    rowHeight,
    listTop,
    selected: -1,
  };
}

export function menuHit(menu, x, y) {
  if (!inside(rectangle(menu.x + 1, menu.y, menu.width - 2, menu.height), x, y))
    return -1;
  const row = Math.floor((y - menu.y - menu.listTop) / menu.rowHeight);
  return row >= 0 && row < menu.verbs.length ? row : -1;
}

export function exitCursor(target, [width, height]) {
  const [x, y] = target.position;
  const edges = [x, width - x, y, height - y];
  const angle = [180, 0, 270, 90][edges.indexOf(Math.min(...edges))];
  const arrow = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path transform="rotate(${angle} 12 12)" d="M3 8h9V3l9 9-9 9v-5H3z" fill="#f5e3b8" stroke="#1d202f" stroke-width="2"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(arrow)}") 12 12, pointer`;
}
