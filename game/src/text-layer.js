import { boardText } from "./board.js";
import { measure } from "./book.js";

export class TextLayer {
  constructor(canvas = document.createElement("canvas")) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.revision = 0;
  }
  update(game) {
    const [width, height] = game.room.size;
    const key = [
      game.activeBook,
      game.activeBoard,
      game.boardPage,
      game.boardNote,
      game.inventoryNote,
      game.spread,
      game.hover,
      game.menu,
      game.menu?.selected,
      width,
      height,
    ];
    if (this.key && key.every((value, i) => value === this.key[i]))
      return false;
    this.key = key;
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.context,
      book = game.bookArt;
    this.revision++;
    if (!book) return true;
    const text = (font, value, x, y, color) => {
      ctx.font = font.css;
      ctx.fillStyle = color;
      ctx.fillText(String(value), Math.round(x), Math.round(y + font.ascent));
    };
    if (game.activeBook) {
      for (const page of game.activeBook.pages.slice(
        game.spread * 2,
        game.spread * 2 + 2,
      )) {
        let y = page.y;
        for (const line of page.heading) {
          text(book.fonts.title, line, page.x, y, book.ink);
          y += book.fonts.title.lineHeight;
        }
        if (page.count)
          text(book.fonts.label, page.count, page.x, y, book.faded);
        for (const entry of page.entries) {
          entry.lines.forEach((line, i) =>
            text(
              book.fonts.body,
              line,
              entry.x,
              entry.y + i * book.fonts.body.lineHeight,
              game.hover === entry ? book.accent : book.ink,
            ),
          );
          text(
            book.fonts.label,
            entry.item.date || "",
            entry.x,
            entry.y + entry.lines.length * book.fonts.body.lineHeight,
            book.faded,
          );
        }
        const number = String(page.number);
        text(
          book.fonts.label,
          number,
          page.x + (page.width - measure(book.fonts.label, number)) / 2,
          page.y + page.height - book.fonts.label.lineHeight,
          book.faded,
        );
      }
    }
    if (game.activeBoard) {
      for (const line of boardText(
        game.activeBoard,
        game.boardPage,
        game.boardNote,
        game.hover,
        book.fonts,
        !game.inventoryNote,
      ))
        text(line.font, line.value, line.x, line.y, line.color);
    }
    const menu = game.menu;
    if (menu) {
      text(book.fonts.label, menu.header, menu.x + 6, menu.y + 4, book.faded);
      ctx.fillStyle = book.ink;
      ctx.fillRect(menu.x + 6, menu.y + menu.rowHeight + 2, menu.width - 12, 1);
      menu.verbs.forEach((verb, i) =>
        text(
          book.fonts.body,
          verb,
          menu.x + 6,
          menu.y + menu.listTop + i * menu.rowHeight,
          i === menu.selected ? book.accent : book.ink,
        ),
      );
    }
    const pixels = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < pixels.data.length; i += 4)
      pixels.data[i] = pixels.data[i] >= 128 ? 255 : 0;
    ctx.putImageData(pixels, 0, 0);
    return true;
  }
}
