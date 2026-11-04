// Parse, resolve and write room, reader, book and board routes.
export function parseRoute(hash, start) {
  try {
    const parts = hash.replace(/^#/, "").split("/");
    return {
      room: decodeURIComponent(parts[0] || start),
      board: parts[1] === "board" ? decodeURIComponent(parts[2] || "") : null,
      book: parts[1] === "book" ? decodeURIComponent(parts[2] || "") : null,
      spread: /^\d+$/.test(parts[3] || "") ? Number(parts[3]) : 0,
      item:
        parts[1] && !["book", "board"].includes(parts[1])
          ? decodeURIComponent(parts[1])
          : null,
    };
  } catch {
    return { room: start, book: null, spread: 0, item: null };
  }
}

export function bookRoute(room, id, spread) {
  return `#${encodeURIComponent(room)}/book/${encodeURIComponent(id)}/${spread}`;
}

export function writeHash(game, item = null) {
  const value = game.activeBoard
    ? `#${encodeURIComponent(game.room.id)}/board/${encodeURIComponent(game.activeBoard.id)}/${game.boardPage}`
    : game.activeBook
      ? bookRoute(game.room.id, game.activeBook.id, game.spread)
      : `#${encodeURIComponent(game.room.id)}${item ? "/" + encodeURIComponent(item.id) : ""}`;
  if (location.hash !== value) history.pushState(null, "", value);
}

export function routeTarget(game, state) {
  if (
    state.board &&
    game.room.items.some((item) => item.board?.id === state.board)
  )
    return { board: game.boards[state.board] };
  if (
    state.book &&
    (game.room.config.books?.includes(state.book) ||
      game.inventory.some((item) => item.book?.id === state.book))
  )
    return { book: game.books[state.book] };
  return {
    item: game.room.items.find((object) => object.content?.id === state.item)
      ?.content,
  };
}
