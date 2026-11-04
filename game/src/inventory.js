// Persist carried books and notices by their content ids.
export function saveInventory(game) {
  try {
    window.localStorage.setItem(
      "adventure.inventory",
      JSON.stringify(
        game.inventory
          .filter((item) => !item.pocket)
          .map((item) => ({
            kind: item.note ? "notice" : "book",
            id: item.note ? item.note.id : item.book.id,
          })),
      ),
    );
  } catch {}
}
export function carriedNotice(note, board) {
  const entry =
    board.art.notices[board.items.indexOf(note) % board.art.notices.length];
  return {
    kind: "inventory",
    label: note.title,
    note,
    board,
    sprite: board.art.sprites[entry.paper],
    pin: board.art.sprites[board.art.pin],
  };
}

export function restoreInventory(game) {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem("adventure.inventory"),
    );
    if (Array.isArray(saved)) {
      for (const entry of saved) {
        if (!entry || typeof entry.id !== "string") continue;
        if (entry.kind === "book" && Object.hasOwn(game.books, entry.id)) {
          const book = game.books[entry.id];
          if (!game.inventory.some((item) => item.book === book))
            game.inventory.push({
              kind: "inventory",
              label: book.title,
              book,
              sprite: book.sprite,
            });
        } else if (entry.kind === "notice") {
          const note = game.items.find((item) => item.id === entry.id);
          const board = Object.values(game.boards).find((board) =>
            board.items.includes(note),
          );
          if (
            note &&
            board &&
            !game.inventory.some((item) => item.note === note)
          )
            game.inventory.push(carriedNotice(note, board));
        }
      }
      saveInventory(game);
    }
  } catch {}
}

export function forgetInventory(game) {
  game.inventory = game.inventory.filter((item) => item.pocket);
  game.inventoryOffset = 0;
  game.selectedItem = game.hover = game.sentenceNotice = null;
  try {
    window.localStorage.removeItem("adventure.inventory");
  } catch {}
}

export function canTake(game) {
  return (
    !game.inventoryNote &&
    !game.inventory.some((item) => item.note?.id === game.boardNote?.id)
  );
}
