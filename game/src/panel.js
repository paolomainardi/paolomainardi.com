// Lay out verbs, inventory icons, and site links in game coordinates.
export function layoutPanel([width, height], verbs) {
  const top = height - 36;
  const capacity = Math.max(1, Math.floor((width - 392) / 32));
  return {
    top,
    verbs: verbs.map((label, i) => ({
      label,
      x: 8 + i * 60,
      y: top + 20,
      width: 60,
      height: 12,
    })),
    slots: Array.from({ length: capacity }, (_, i) => ({
      x: 324 + i * 32,
      y: top + 16,
      width: 28,
      height: 18,
    })),
    previous: { x: 308, y: top + 16, width: 16, height: 18 },
    next: { x: width - 72, y: top + 16, width: 16, height: 18 },
    forget: { x: width - 44, y: top + 21, width: 36, height: 8 },
    sound: { x: width - 74, y: top + 4, width: 66, height: 8 },
  };
}

export function inside(rect, x, y) {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

export function inventoryIcon(sprite, slot) {
  const divisor = Math.max(
    1,
    Math.ceil(sprite.size[0] / (slot.width - 4)),
    Math.ceil(sprite.size[1] / (slot.height - 4)),
  );
  const width = Math.floor(sprite.size[0] / divisor),
    height = Math.floor(sprite.size[1] / divisor);
  return [
    slot.x + Math.floor((slot.width - width) / 2),
    slot.y + Math.floor((slot.height - height) / 2),
    width,
    height,
  ];
}

export function sitePath(game) {
  return (
    (game.readerItem
      ? game.readerSite || game.activeBook?.site || game.activeBoard?.site
      : game.activeBook?.site || game.activeBoard?.site) || null
  );
}

export function siteLayout(game) {
  const path = sitePath(game);
  if (!path) return null;
  const [width, height] = game.room.size;
  const right = width - 82;
  // Leave Close and a short sentence to the left, even for a long path.
  const capacity = Math.max(1, Math.floor((right - 152) / 6));
  const label =
    path.length > capacity ? path.slice(0, capacity - 1) + "…" : path;
  return {
    path,
    label,
    x: right - label.length * 6,
    y:
      game.activeBook || game.activeBoard || game.readerItem
        ? height - 16
        : height - 32,
    width: label.length * 6,
    height: 8,
  };
}

export const siteSentence = (site) => `Open ${site.path} on the site`;

export function sentence(game) {
  const site = siteLayout(game);
  if (game.siteHover && site) return siteSentence(site);
  if (game.sentenceNotice && game.speechUntil > game.elapsed)
    return game.sentenceNotice;
  if (game.selectedItem)
    return `Use ${game.selectedItem.label} with${game.hover ? " " + (game.hover.label || game.hover.id) : "..."}`;
  if (game.menu) {
    const { target, verbs, selected } = game.menu;
    return selected >= 0
      ? `${verbs[selected]} ${target.label || target.id}`
      : target.label || target.id;
  }
  const target = game.hover;
  if (game.room.map && target?.kind === "exit")
    return `Go to ${target.label || target.id}`;
  return target
    ? `${game.verb || "Walk to"} ${target.label || target.id}`
    : game.verb || "Walk to";
}

export function footerLayout(game) {
  return {
    close: { x: 8, y: game.room.size[1] - 24, width: 52, height: 24 },
    sound: {
      ...game.soundRect,
      y:
        game.activeBook || game.activeBoard || game.readerItem
          ? game.room.size[1] - 16
          : game.soundRect.y,
    },
    site: siteLayout(game),
  };
}

// Convert JSON layout tuples to the hit-rectangle format used by the UI.
export function rectangle(x, y, width, height) {
  return { x, y, width, height };
}
