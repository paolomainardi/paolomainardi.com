// Keep subtitles and optional recordings together for one session.
import { wrapText } from "./book.js";
import { depth } from "./lighting.js";
import { footerLayout } from "./panel.js";

// Minimise row count first, then the difference between measured row widths.
export function speechLines(font, text, width = 200, characters = 34) {
  const words = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      const parts = [];
      let part = "";
      for (const char of word) {
        if (
          part &&
          (font.measure(part + char) > width || part.length >= characters)
        ) {
          parts.push(part);
          part = "";
        }
        part += char;
      }
      if (part) parts.push(part);
      return parts;
    });
  const best = [{ rows: 0, cost: 0, lines: [] }];
  for (let end = 1; end <= words.length; end++) {
    for (let start = end - 1; start >= 0; start--) {
      const line = words.slice(start, end).join(" ");
      const measured = font.measure(line);
      if (measured > width || line.length > characters) break;
      const rows = best[start].rows + 1;
      const cost = best[start].cost + measured * measured;
      if (
        !best[end] ||
        rows < best[end].rows ||
        (rows === best[end].rows && cost < best[end].cost)
      )
        best[end] = { rows, cost, lines: [...best[start].lines, line] };
    }
  }
  return best[words.length].lines;
}

export function speechLayout(game) {
  if (!game.speech || game.speechUntil <= game.elapsed) return null;
  const font = game.bookArt.fonts.body;
  const [width, height] = game.room.size;
  const footer =
    game.activeBook ||
    game.activeBoard ||
    game.inventoryNote ||
    game.readerItem;
  const footerWidth = footer
    ? Math.max(
        1,
        (footerLayout(game).site?.x ??
          width - 82 - (game.pocket?.length || 0) * 32) - 76,
      )
    : null;
  const lines = footer
    ? wrapText(font, game.sentenceNotice || game.speech, footerWidth)
    : game.speechLines;
  const blockHeight = lines.length * font.lineHeight;
  let top, center;
  if (footer) {
    top = footerLayout(game).close.y + 8 - (lines.length - 1) * font.lineHeight;
  } else {
    const head = game.room.map
      ? game.verbTop / 2
      : game.actor.y - game.character.anchor[1] * depth(game);
    const half = Math.max(...lines.map((line) => font.measure(line))) / 2;
    center = game.room.map ? width / 2 : game.actor.x;
    center = Math.max(1 + half, Math.min(width - 1 - half, center));
    top = head - 5 - blockHeight;
    if (top < 1) top = head + 5;
  }
  const bottom = footer ? height - 1 : game.verbTop - 1;
  top = Math.round(Math.max(1, Math.min(bottom - blockHeight, top)));
  return {
    font,
    top,
    height: blockHeight,
    width: footerWidth,
    footer: !!footer,
    rows: lines.map((line, i) => ({
      line,
      x: footer
        ? 68
        : Math.round(
            Math.max(
              1,
              Math.min(
                width - 1 - font.measure(line),
                center - font.measure(line) / 2,
              ),
            ),
          ),
      y: top + i * font.lineHeight,
    })),
  };
}

export class Speech {
  constructor(game, live) {
    this.game = game;
    this.live = live;
    this.visited = new Set();
    this.line = null;
  }

  active() {
    return !!this.game.speech && this.game.speechUntil > this.game.elapsed;
  }

  clear() {
    this.line = null;
    this.game.sound.stopVoice();
    this.game.speech = null;
    this.game.speechLines = [];
    this.game.speechUntil = 0;
    this.game.sentenceNotice = null;
    this.live.textContent = "";
  }

  say(fallback, id) {
    this.clear();
    const game = this.game;
    const text = game.world.voices?.[id]?.text ?? fallback;
    if (!text) return;
    const line = (this.line = {});
    game.speech = String(text);
    game.speechLines = speechLines(
      game.bookArt.fonts.body,
      text,
      Math.min(200, game.room.size[0] - 2),
    );
    const readingTime = Math.max(3.5, String(text).length * 0.055);
    game.speechUntil = game.elapsed + readingTime;
    this.live.textContent = String(text);
    if (!game.world.voices?.[id]?.src) return;
    // Keep the subtitle visible while the first request is still loading.
    game.speechUntil = Infinity;
    game.sound
      .playVoice(id, () => {
        if (this.line === line) game.speechUntil = game.elapsed;
      })
      .then((playing) => {
        if (this.line === line && !playing)
          game.speechUntil = game.elapsed + readingTime;
      });
  }

  enter() {
    const room = this.game.room;
    if (this.visited.has(room.id)) return;
    this.visited.add(room.id);
    this.say(null, room.config.enter);
  }
}
