import { measure, wrapText } from "./book.js";
import { wrap } from "./font.js";

export function targetVerbs(verbs, target) {
  return verbs.filter((verb) => {
    if (verb === "Walk to" || verb === "Look at") return true;
    if (verb === "Use")
      return ["light", "exit", "inventory"].includes(target.kind);
    if (verb === "Take") return ["book", "content"].includes(target.kind);
    if (verb === "Open" || verb === "Read")
      return (
        ["book", "content", "inventory"].includes(target.kind) ||
        (target.kind === "hotspot" && !!(target.content || target.book))
      );
    return false;
  });
}

export function layoutMenu(target, verbs, point, size, font = null) {
  const body = font?.body,
    heading = font?.label;
  const textWidth = (text, role = body) =>
    role ? measure(role, text) : text.length * 6;
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
  const header = heading
    ? wrapText(heading, name, width - 12, 1)[0]
    : wrap(name, Math.max(1, Math.floor((width - 12) / 6)), 1)[0];
  const rowHeight =
    Math.ceil(Math.max(body?.lineHeight || 8, heading?.lineHeight || 8)) + 4;
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
  if (x < menu.x + 1 || x >= menu.x + menu.width - 1) return -1;
  const row = Math.floor((y - menu.y - menu.listTop) / menu.rowHeight);
  return row >= 0 && row < menu.verbs.length ? row : -1;
}
