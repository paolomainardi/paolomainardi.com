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
    const speaker = game.speechActor || game.actor;
    const head = game.room.map
      ? game.verbTop / 2
      : speaker.y -
        (game.speechActor?.character || game.character).anchor[1] *
          depth(game, speaker);
    const half = Math.max(...lines.map((line) => font.measure(line))) / 2;
    center = game.room.map ? width / 2 : speaker.x;
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
    const conversation = this.game.conversation;
    if (conversation) {
      conversation.actor.held = false;
      conversation.actor.rest = conversation.actor.sit[0];
      this.game.conversation = null;
    }
    this.clearLine();
  }

  clearLine() {
    this.game.speechActor = null;
    this.line = null;
    this.game.sound.stopVoice();
    this.game.speech = null;
    this.game.speechLines = [];
    this.game.speechUntil = 0;
    this.game.sentenceNotice = null;
    this.live.textContent = "";
  }

  say(fallback, id, speaker = null, duration) {
    this.clearLine();
    this.game.speechActor = speaker;
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
    const readingTime = duration ?? Math.max(3.5, String(text).length * 0.055);
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

  talk(actor) {
    this.clear();
    actor.talkIndex = actor.talkIndex || 0;
    const exchange = actor.talk[actor.talkIndex];
    actor.talkIndex = (actor.talkIndex + 1) % actor.talk.length;
    actor.held = true;
    actor.petting = 0;
    actor.animation = "sit";
    actor.clock = 0;
    actor.mirror = this.game.actor.x < actor.x;
    this.game.path = [];
    this.game.pending = null;
    this.game.conversation = { actor, exchange, step: -1 };
    this.nextTalk();
  }

  nextTalk() {
    const conversation = this.game.conversation;
    if (!conversation) return;
    const { actor, exchange } = conversation;
    conversation.step++;
    if (conversation.step === 0) {
      this.say(exchange.meow, null, actor, 1.6);
      if (actor.meow) this.game.sound.play(actor.meow, this.game.sound.effects);
    } else if (conversation.step === 1) this.say(exchange.words, null, actor);
    else if (conversation.step === 2) this.say(null, exchange.reply);
    else if (conversation.step === 3) this.say(exchange.end, null, actor, 1.2);
    else this.clear();
  }

  update() {
    if (!this.game.conversation) return;
    if (
      this.game.path.length ||
      this.game.activeBook ||
      this.game.activeBoard ||
      this.game.readerItem ||
      this.game.transition
    )
      this.clear();
    else if (!this.active()) this.nextTalk();
  }

  enter() {
    const room = this.game.room;
    if (this.visited.has(room.id)) return;
    this.visited.add(room.id);
    this.say(null, room.config.enter);
  }
}
