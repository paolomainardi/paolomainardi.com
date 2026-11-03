export function layoutPanel([width, height], verbs) {
  const top = height - 36;
  const capacity = Math.max(1, Math.floor((width - 344) / 32));
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
    next: { x: width - 24, y: top + 16, width: 16, height: 18 },
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
