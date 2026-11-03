export function layoutPanel([width, height], verbs) {
  const top = height - 52;
  const capacity = Math.max(1, Math.floor((width - 280) / 40));
  return {
    top,
    verbs: verbs.map((label, i) => ({
      label,
      x: 8 + (i % 3) * 76,
      y: top + 16 + Math.floor(i / 3) * 12,
      width: 76,
      height: 12,
    })),
    slots: Array.from({ length: capacity }, (_, i) => ({
      x: 252 + i * 40,
      y: top + 16,
      width: 36,
      height: 34,
    })),
    previous: { x: 236, y: top + 16, width: 16, height: 34 },
    next: { x: width - 24, y: top + 16, width: 16, height: 34 },
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
