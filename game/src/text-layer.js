// Cache subtitles, close-up and menu text on a transparent canvas at game resolution.
import { speechLayout } from "./speech.js";
import { canTake } from "./inventory.js";
import { boardText } from "./board.js";

export class TextLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.key = [];
    this.nextKey = [];
  }
  update(game) {
    const [width, height] = game.room.size;
    const key = this.nextKey;
    key[0] = game.activeBook;
    key[1] = game.activeBoard;
    key[2] = game.boardPage;
    key[3] = game.boardNote;
    key[4] = game.inventoryNote;
    key[5] = game.inventory?.length;
    key[6] = game.spread;
    key[7] = game.hover;
    key[8] = game.menu;
    key[9] = game.menu?.selected;
    key[10] = width;
    key[11] = height;
    const speech = game.intro ? null : speechLayout(game);
    const credit = game.intro?.text(
      game.world.title,
      !!game.renderer.motionPreference?.matches,
    );
    key[20] = credit?.value;
    key[21] = credit?.alpha;
    key[22] = credit?.title;
    key[12] = game.speech;
    key[13] = speech?.top;
    key[14] = speech?.rows[0]?.x;
    key[15] = speech?.footer;
    key[16] = game.readerItem;
    key[17] = game.sentenceNotice;
    key[18] = game.speechActor?.speech || game.world?.speech;
    key[19] = speech && !speech.footer ? game.actor.x : null;
    let changed = false;
    for (let i = 0; i < key.length; i++)
      if (key[i] !== this.key[i]) {
        changed = true;
        break;
      }
    if (!changed) return false;
    this.nextKey = this.key;
    this.key = key;
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.context,
      book = game.bookArt;
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
          page.x + (page.width - book.fonts.label.measure(number)) / 2,
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
        canTake(game),
      ))
        text(line.font, line.value, line.x, line.y, line.color);
    }
    if (credit) {
      const font = credit.title ? book.fonts.title : book.fonts.body;
      // Wrap credits to the frame, keeping the title in the centre and lines below.
      const words = credit.value.split(/\s+/);
      const lines = [];
      let line = "";
      for (const word of words) {
        const next = line ? line + " " + word : word;
        if (line && font.measure(next) > width - 40) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
      const top =
        (credit.title ? height / 2 : height * 0.75) -
        (lines.length * font.lineHeight) / 2;
      lines.forEach((value, i) => {
        const x = (width - font.measure(value)) / 2;
        const y = top + i * font.lineHeight;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (dx || dy) text(font, value, x + dx, y + dy, "#1e1b17");
        text(font, value, x, y, game.world.speech || "#feeab3");
      });
    }
    if (speech) {
      for (const row of speech.rows) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (dx || dy)
              text(speech.font, row.line, row.x + dx, row.y + dy, "#1e1b17");
        text(
          speech.font,
          row.line,
          row.x,
          row.y,
          game.speechActor?.speech || game.world.speech || "#feeab3",
        );
      }
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
      pixels.data[i] =
        pixels.data[i] >= 128 ? Math.round(255 * (credit?.alpha ?? 1)) : 0;
    ctx.putImageData(pixels, 0, 0);
    return true;
  }
}
