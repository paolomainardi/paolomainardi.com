import {
  loadBook,
  bookItems,
  layoutBook,
  hitEntry,
  parseRoute,
  bookRoute,
} from "./book.js";
import { Renderer } from "./renderer.js";
import { loadWorld, loadRoom, matchingItems, resolve } from "./assets.js";
import { findPath, nearestWalkable } from "./pathfinding.js";
import { wrap } from "./font.js";
import { flame, lightSourcesAt } from "./lighting.js";

/** Boot an isolated game in a supplied container. URLs resolve against the document. */
export async function boot({ world, content, element }) {
  if (!(element instanceof HTMLElement))
    throw new Error("boot requires a container element.");
  const worldURL = resolve(world, document.baseURI),
    contentURL = resolve(content, document.baseURI);
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("./style.css", import.meta.url).href;
  document.head.append(style);
  const root = document.createElement("section");
  root.className = "adventure";
  root.tabIndex = 0;
  root.setAttribute("aria-label", "Point and click adventure");
  const canvas = document.createElement("canvas");
  canvas.setAttribute(
    "aria-label",
    "Adventure scene. Click floor to walk. Double click floor or objects to run. Select a verb, then an object. T changes time. L toggles lantern. G toggles bloom.",
  );
  const cover = document.createElement("div");
  cover.className = "adventure-start";
  const heading = document.createElement("h1");
  heading.textContent = "The engineer’s study";
  const help = document.createElement("p");
  help.textContent =
    "Click to walk. Double click to run. Choose a verb, then an object. T: dusk / night. L: lantern. G: bloom.";
  const start = document.createElement("button");
  start.textContent = "Loading…";
  start.disabled = true;
  const windowed = document.createElement("button");
  windowed.textContent = "Start in window";
  windowed.disabled = true;
  cover.append(heading, help, start, windowed);
  root.append(canvas, cover);
  element.append(root);
  const reader = document.createElement("div");
  reader.className = "adventure-reader";
  reader.hidden = true;
  reader.setAttribute("role", "dialog");
  reader.setAttribute("aria-modal", "true");
  const close = document.createElement("button");
  close.className = "adventure-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close");
  const iframe = document.createElement("iframe");
  iframe.title = "Article reader";
  iframe.setAttribute("sandbox", "allow-same-origin");
  iframe.referrerPolicy = "no-referrer";
  const website = document.createElement("a");
  website.textContent = "Open on the website";
  website.target = "_blank";
  website.rel = "noopener";
  reader.append(close, iframe, website);
  root.append(reader);
  const live = document.createElement("div");
  live.className = "adventure-live";
  live.setAttribute("aria-live", "polite");
  root.append(live);
  let renderer,
    game,
    disposed = false,
    frame = 0,
    last = 0,
    roomRequest = 0;
  const subscriptions = [];
  function on(target, event, handler) {
    target.addEventListener(event, handler);
    subscriptions.push(() => target.removeEventListener(event, handler));
  }
  try {
    renderer = new Renderer(canvas);
    const assets = await loadWorld(worldURL, contentURL);
    renderer.palette(assets.palette);
    game = {
      ...assets,
      renderer,
      root,
      canvas,
      started: false,
      readerItem: null,
      time:
        new Date().getHours() >= 6 && new Date().getHours() < 20
          ? "dusk"
          : "night",
      lantern: true,
      bloom: true,
      timeOverride: false,
      elapsed: 0,
      verb: "Walk to",
      hover: null,
      path: [],
      running: false,
      pending: null,
      speech: null,
      speechLines: [],
      speechUntil: 0,
      objects: [],
      verbRects: [],
    };
    game.bookArt = game.world.book
      ? await loadBook(resolve(game.world.book, worldURL), renderer)
      : null;
    for (const book of Object.values(game.books)) {
      book.items = bookItems(game.items, book.content);
      book.sprite = {
        texture: renderer.texture(book.bitmap),
        size: [book.bitmap.width, book.bitmap.height],
      };
      book.pages = layoutBook(game.bookArt, book);
    }
    const catalogue = document.createElement("nav");
    catalogue.className = "adventure-catalogue";
    catalogue.setAttribute("aria-label", "Books and posts");
    for (const book of Object.values(game.books)) {
      const title = document.createElement("h2");
      title.textContent = book.title;
      const list = document.createElement("ul");
      for (const item of book.items) {
        const row = document.createElement("li"),
          link = document.createElement("a");
        link.textContent = item.title;
        if (item.url) link.href = item.url;
        row.append(link);
        list.append(row);
      }
      catalogue.append(title, list);
    }
    root.append(catalogue);
    game.character.texture = renderer.texture(game.character.sheet);
    game.character.size = [
      game.character.sheet.width,
      game.character.sheet.height,
    ];
    game.depth = () => {
      const { far, near } = game.room.depth,
        t = Math.max(
          0,
          Math.min(1, (game.actor.y - far[0]) / (near[0] - far[0])),
        );
      return far[1] + (near[1] - far[1]) * t;
    };
    game.character.glowTexture = game.character.glow
      ? renderer.texture(game.character.glow)
      : null;
    if (game.character.glow) {
      const pixels = renderer.pixels(game.character.glow);
      game.character.flames = {};
      for (const [name, animation] of Object.entries(
        game.character.animations,
      )) {
        game.character.flames[name] = [];
        for (let frame = 0; frame < animation.frames; frame++) {
          let sx = 0,
            sy = 0,
            weight = 0;
          for (let y = 0; y < game.character.frame[1]; y++)
            for (let x = 0; x < game.character.frame[0]; x++) {
              const i =
                ((animation.row * game.character.frame[1] + y) *
                  game.character.size[0] +
                  frame * game.character.frame[0] +
                  x) *
                4;
              const w = ((pixels[i] / 255) * pixels[i + 3]) / 255;
              sx += (x + 0.5) * w;
              sy += (y + 0.5) * w;
              weight += w;
            }
          game.character.flames[name].push(
            weight
              ? [
                  sx / weight - game.character.anchor[0],
                  sy / weight - game.character.anchor[1],
                ]
              : game.character.lantern,
          );
        }
      }
    }
    game.lanternPosition = () => {
      const animation = game.character.animations[game.actor.animation];
      const frame =
        Math.floor(game.actor.clock * animation.fps) % animation.frames;
      const offset =
        game.character.flames?.[game.actor.animation][frame] ||
        game.character.lantern;
      return [
        game.actor.x + (game.actor.mirror ? -1 : 1) * offset[0] * game.depth(),
        game.actor.y + offset[1] * game.depth(),
      ];
    };
    game.lanternStrength = () =>
      game.lantern && game.time === "night" ? flame(game.elapsed) : 0;
    game.lightSourcesAt = (x, y) => lightSourcesAt(game, x, y);
    game.lightAt = (x, y) =>
      Math.min(
        1,
        game
          .lightSourcesAt(x, y)
          .reduce((sum, light) => sum + light.strength, 0),
      );
    game.nearestLamp = () =>
      game.room.lights
        .filter((l) => l.strength > 0.05)
        .sort(
          (a, b) =>
            Math.hypot(
              a.position[0] - game.actor.x,
              a.position[1] - game.actor.y,
            ) -
            Math.hypot(
              b.position[0] - game.actor.x,
              b.position[1] - game.actor.y,
            ),
        )[0];
    game.sentence = () => {
      const target = game.hover;
      return target
        ? `${game.verb} ${target.kind === "content" ? "Book: " : ""}${target.label || target.id}`
        : game.verb;
    };
    const labels = [
      "Walk to",
      ...game.world.verbs.filter((v) => v !== "Walk to"),
    ];
    function say(text) {
      game.speech = String(text);
      game.speechLines = wrap(
        text,
        Math.max(1, Math.floor((game.room.size[0] * 0.8) / (6 * game.uiScale))),
        2,
      );
      game.speechUntil =
        game.elapsed + Math.max(3.5, String(text).length * 0.055);
      live.textContent = String(text);
    }
    function hashState() {
      return parseRoute(location.hash, game.world.start);
    }
    function writeHash(item = null) {
      const value = game.activeBook
        ? bookRoute(game.room.id, game.activeBook.id, game.spread)
        : `#${encodeURIComponent(game.room.id)}${item ? "/" + encodeURIComponent(item.id) : ""}`;
      if (location.hash !== value) history.pushState(null, "", value);
    }
    function openBook(book, spread = 0, update = true) {
      game.activeBook = book;
      game.spread = Math.max(
        0,
        Math.min(Math.floor(spread), book.pages.length / 2 - 1),
      );
      game.turning = null;
      game.hover = null;
      game.path = [];
      game.pending = null;
      if (update) writeHash();
    }
    function closeBook() {
      game.activeBook = null;
      game.turning = null;
      game.hover = null;
      canvas.style.cursor = "crosshair";
      writeHash();
    }
    function turnBook(direction) {
      const spread = game.spread + direction;
      if (
        game.turning ||
        spread < 0 ||
        spread >= game.activeBook.pages.length / 2
      )
        return;
      game.turning = { direction, spread, clock: 0 };
      game.hover = null;
    }
    function hideReader(update = true) {
      reader.hidden = true;
      iframe.removeAttribute("src");
      game.readerItem = null;
      if (update) writeHash();
      root.focus({ preventScroll: true });
    }
    function openReader(item, update = true) {
      if (!item.reader) {
        say("There is nothing to read here.");
        return;
      }
      game.path = [];
      game.pending = null;
      game.readerItem = item;
      game.hover = null;
      game.actor.animation = "idle-front";
      reader.setAttribute("aria-label", item.title);
      iframe.title = item.title;
      website.hidden = !item.url;
      if (item.url) website.href = item.url;
      else website.removeAttribute("href");
      iframe.src = item.reader;
      reader.hidden = false;
      if (update) writeHash(item);
      close.focus({ preventScroll: true });
    }
    on(close, "click", () => hideReader());
    let wasFullscreen = false;
    on(document, "fullscreenchange", () => {
      if (
        wasFullscreen &&
        document.fullscreenElement !== root &&
        game.readerItem
      )
        hideReader();
      wasFullscreen = document.fullscreenElement === root;
    });
    function readerKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hideReader();
      } else if (event.key === "Tab") {
        if (event.target === website && !event.shiftKey) {
          event.preventDefault();
          close.focus();
        }
        // Keep keyboard focus within the modal, including after the last article link.
        if (event.target === close && event.shiftKey) {
          event.preventDefault();
          (website.hidden ? iframe : website).focus();
        }
      }
    }
    on(reader, "keydown", readerKey);
    const frameSubscriptions = [];
    on(iframe, "load", () => {
      frameSubscriptions.splice(0).forEach((remove) => remove());
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          doc.addEventListener("keydown", readerKey);
          frameSubscriptions.push(() =>
            doc.removeEventListener("keydown", readerKey),
          );
        }
      } catch {
        /* Cross-origin readers must use the visible close button when iframe focus owns Escape. */
      }
    });
    async function changeRoom(id) {
      const request = ++roomRequest;
      const room = await loadRoom(game.world, worldURL, id, renderer);
      if (request !== roomRequest || disposed) return;
      game.activeBook = null;
      game.turning = null;
      game.room = room;
      renderer.setRoom(room);
      const [width, height] = room.size;
      game.pixelScale = width / 480;
      game.uiScale = 1;
      game.lanternRadius = 90 * game.pixelScale;
      game.verbTop = height - Math.round(18 * game.pixelScale);
      const margin = width / 80;
      const verbWidth = labels.reduce(
        (sum, label) => sum + label.length * 6 + 10 * game.pixelScale,
        0,
      );
      game.verbScale = Math.min(game.uiScale, (width - margin * 2) / verbWidth);
      let verbX = margin;
      game.verbRects = labels.map((label) => {
        const cellWidth =
          (label.length * 6 + 10 * game.pixelScale) * game.verbScale;
        const rect = {
          label,
          x: verbX,
          y: game.verbTop + (height - game.verbTop - 8 * game.verbScale) / 2,
          width: cellWidth,
        };
        verbX += cellWidth;
        return rect;
      });
      const spawn = nearestWalkable(room.walkable, ...room.spawn, room.size);
      if (!spawn) throw new Error(`Room ${id} has no walkable floor.`);
      game.actor = {
        x: spawn[0],
        y: spawn[1],
        animation: "idle-front",
        clock: 0,
        mirror: false,
      };
      game.path = [];
      game.pending = null;
      game.hover = null;
      game.speech = null;
      for (const hotspot of room.items.filter(
        (item) => item.kind === "hotspot",
      )) {
        const binding = room.config.hotspots?.[hotspot.id];
        if (!binding) continue;
        const item = matchingItems(game.items, binding.content).sort((a, b) =>
          (b.date || "").localeCompare(a.date || ""),
        )[0];
        if (item) {
          hotspot.content = item;
          hotspot.label = `${hotspot.label || hotspot.id}: ${item.title}`;
        }
      }
      const matching = room.config.books
        ? []
        : matchingItems(game.items, room.config.content);
      for (const sprite of game.objectSprites || [])
        renderer.gl.deleteTexture(sprite.texture);
      game.objectSprites = (assets.objects[room.config.object] || []).map(
        (bitmap) => ({
          texture: renderer.texture(bitmap),
          size: [bitmap.width, bitmap.height],
        }),
      );
      game.objects = room.items
        .filter((item) => item.kind === "slot" && item.bounds[2] >= 0)
        .slice(0, matching.length)
        .map((slot, i) => ({
          ...slot,
          kind: "content",
          label: matching[i].title,
          content: matching[i],
          sprite: game.objectSprites[i % game.objectSprites.length],
        }));
      if (room.config.books) {
        game.objects = room.items
          .filter((item) => item.kind === "slot" && item.bounds[2] >= 0)
          .slice(0, room.config.books.length)
          .map((slot, i) => {
            const book = game.books[room.config.books[i]];
            if (!book) throw new Error(`Unknown book: ${room.config.books[i]}`);
            return {
              ...slot,
              kind: "book",
              label: book.title,
              book,
              sprite: book.sprite,
            };
          });
      }
      if (
        !room.config.books &&
        game.objects.length &&
        !game.objectSprites.length
      )
        throw new Error(`Missing object sprite: ${room.config.object}`);
    }
    let initial = hashState();
    if (!game.world.rooms[initial.room])
      initial = { room: game.world.start, item: null };
    await changeRoom(initial.room);
    const fit = () => renderer.resize(root.clientWidth, root.clientHeight);
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    fit();
    subscriptions.push(
      () => observer.disconnect(),
      () => frameSubscriptions.forEach((remove) => remove()),
    );
    function hit(px, py) {
      if (px < 0 || py < 0 || px >= game.room.size[0] || py >= game.verbTop)
        return null;
      for (const object of game.objects) {
        const [x0, y0, x1, y1] = object.bounds;
        const sprite = object.sprite.size,
          p = object.position;
        if (
          (px >= x0 && px <= x1 && py >= y0 && py <= y1) ||
          (px >= p[0] - sprite[0] / 2 &&
            px < p[0] + sprite[0] / 2 &&
            py >= p[1] - sprite[1] &&
            py <= p[1])
        )
          return object;
      }
      const id =
          game.room.ids[Math.floor(py) * game.room.size[0] + Math.floor(px)],
        item = game.room.items[id];
      return item && !["walkable", "foreground", "slot"].includes(item.kind)
        ? item
        : null;
    }
    function point(event) {
      const rect = canvas.getBoundingClientRect();
      return [
        ((event.clientX - rect.left) * game.room.size[0]) / rect.width,
        ((event.clientY - rect.top) * game.room.size[1]) / rect.height,
      ];
    }
    on(canvas, "pointermove", (event) => {
      if (!game.started || game.readerItem || game.loading) return;
      const [x, y] = point(event);
      game.hover = game.activeBook
        ? game.turning
          ? null
          : hitEntry(game.activeBook.pages, game.spread, x, y)
        : hit(x, y);
      canvas.style.cursor = game.hover ? "pointer" : "crosshair";
    });
    on(canvas, "pointerleave", () => {
      game.hover = null;
    });
    function act(target, verb) {
      if (target.kind === "book") {
        if (verb === "Look at")
          say(`${target.book.title}. ${target.book.items.length} posts.`);
        else if (verb === "Open") openBook(target.book);
        else say("I can't do that.");
        return;
      }
      if (target.kind === "exit") {
        say(`That way lies ${target.to}.`);
        return;
      }
      if (verb === "Look at" && target.kind === "hotspot" && target.content) {
        say(`${target.content.title}. ${target.content.description || ""}`);
      } else if (verb === "Look at")
        say(target.content?.description || target.look || "Nothing unusual.");
      else if (verb === "Open" && target.kind === "hotspot" && target.content)
        say(
          target.content.link || target.content.url
            ? "Let's see what's out there."
            : "There is nothing to open here.",
        );
      else if (verb === "Open" && target.content) openReader(target.content);
      else if (verb === "Use" && target.kind === "light") {
        const lamp = game.room.lights.find((light) => light.id === target.id);
        lamp.on = !lamp.on;
        say(lamp.on ? "Let there be light." : "A little less light.");
      } else say("I can't do that.");
    }
    function walk(destination, pending = null, running = false) {
      game.pending = pending;
      game.running = running;
      game.path = findPath(
        game.room.walkable,
        [game.actor.x, game.actor.y],
        destination,
        game.room.size,
      );
      if (!game.path.length) {
        game.pending = null;
        say("I can't reach that.");
      }
    }
    on(canvas, "click", (event) => {
      if (!game.started || game.readerItem || game.loading) return;
      root.focus({ preventScroll: true });
      const [x, y] = point(event);
      if (game.activeBook) {
        if (game.turning) return;
        if (y >= game.verbTop) {
          if (x >= 8 && x < 60) closeBook();
          return;
        }
        const entry = hitEntry(game.activeBook.pages, game.spread, x, y);
        if (entry) {
          openReader(entry.item);
          return;
        }
        const pages = game.bookArt.pages;
        const left = pages[0],
          right = pages[1];
        if (
          x >= left[0] - 16 &&
          x < left[0] + 32 &&
          y >= left[1] + left[3] - 20 &&
          y < left[1] + left[3] + 24
        )
          turnBook(-1);
        else if (
          x >= right[0] + right[2] - 32 &&
          x < right[0] + right[2] + 16 &&
          y >= right[1] + right[3] - 20 &&
          y < right[1] + right[3] + 24
        )
          turnBook(1);
        else if (
          x < left[0] - 16 ||
          x >= right[0] + right[2] + 16 ||
          y < Math.min(left[1], right[1]) - 16 ||
          y >= Math.max(left[1] + left[3], right[1] + right[3]) + 24
        )
          closeBook();
        return;
      }
      if (y >= game.verbTop) {
        const cell = game.verbRects.find(
          (v) =>
            x >= v.x &&
            x < v.x + v.width &&
            y >= game.verbTop &&
            y < game.room.size[1],
        );
        if (cell) game.verb = cell.label;
        return;
      }
      const target = hit(x, y);
      game.hover = target;
      if (target) {
        const verb =
          target.kind === "book" && game.verb === "Walk to"
            ? "Open"
            : game.verb;
        if (verb === "Open" && target.kind === "hotspot" && target.content) {
          const url = target.content.link || target.content.url;
          if (url && !(event.detail >= 2))
            window.open(url, "_blank", "noopener,noreferrer");
        }
        walk(
          target.position,
          verb === "Walk to" && target.kind !== "exit"
            ? null
            : { target, verb },
          event.detail >= 2,
        );
      } else if (
        x >= 0 &&
        x < game.room.size[0] &&
        y >= 0 &&
        y < game.room.size[1] &&
        game.room.walkable[Math.floor(y) * game.room.size[0] + Math.floor(x)]
      )
        walk([x, y], null, event.detail >= 2);
    });
    on(root, "keydown", (event) => {
      if (
        event.target === start ||
        event.target === windowed ||
        game.readerItem ||
        !game.started
      )
        return;
      if (game.activeBook) {
        if (["Escape", "ArrowLeft", "ArrowRight"].includes(event.key))
          event.preventDefault();
        if (event.key === "Escape") closeBook();
        if (event.key === "ArrowLeft") turnBook(-1);
        if (event.key === "ArrowRight") turnBook(1);
        return;
      }
      if (event.key.toLowerCase() === "t") {
        game.timeOverride = true;
        game.time = game.time === "night" ? "dusk" : "night";
      }
      if (event.key.toLowerCase() === "l") game.lantern = !game.lantern;
      if (event.key.toLowerCase() === "g") game.bloom = !game.bloom;
    });
    async function restoreHash() {
      if (disposed) return;
      const state = hashState();
      if (!game.world.rooms[state.room]) return;
      if (game.room.id !== state.room) {
        hideReader(false);
        game.loading = true;
        try {
          await changeRoom(state.room);
        } finally {
          game.loading = false;
        }
      }
      if (game.started) {
        if (state.book && game.room.config.books?.includes(state.book)) {
          hideReader(false);
          openBook(game.books[state.book], state.spread, false);
          return;
        }
        game.activeBook = null;
        game.turning = null;
        const item = game.objects.find(
          (object) => object.content?.id === state.item,
        )?.content;
        if (item) openReader(item, false);
        else hideReader(false);
      }
    }
    on(window, "hashchange", () => {
      restoreHash().catch((error) => say(error.message));
    });
    function begin(fullscreen) {
      if (game.started) return;
      game.started = true;
      cover.hidden = true;
      if (fullscreen && root.requestFullscreen)
        root.requestFullscreen().catch(() => {});
      root.focus({ preventScroll: true });
      const item = game.objects.find(
        (object) => object.content?.id === initial.item,
      )?.content;
      if (initial.book && game.room.config.books?.includes(initial.book))
        openBook(game.books[initial.book], initial.spread);
      else if (item) openReader(item);
      else writeHash();
      initial.item = null;
    }
    on(start, "click", () => begin(true));
    on(windowed, "click", () => begin(false));
    heading.textContent = game.world.title;
    start.textContent = "Start";
    start.disabled = false;
    windowed.disabled = false;
    function tick(now) {
      if (disposed) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (!game.loading) {
        if (
          game.started &&
          !game.readerItem &&
          game.activeBook &&
          game.turning
        ) {
          game.turning.clock += dt;
          if (
            game.turning.clock >=
            game.bookArt.turn.frames / game.bookArt.turn.fps
          ) {
            game.spread = game.turning.spread;
            game.turning = null;
            writeHash();
          }
        }
        if (game.started && !game.readerItem && !game.activeBook) {
          if (!game.timeOverride) {
            const hour = new Date().getHours();
            game.time = hour >= 6 && hour < 20 ? "dusk" : "night";
          }
          game.elapsed += dt;
          game.actor.clock += dt;
          for (const lamp of game.room.lights) {
            lamp.level +=
              Math.sign(Number(lamp.on) - lamp.level) *
              Math.min(Math.abs(Number(lamp.on) - lamp.level), dt / 0.4);
            const index = game.room.lights.indexOf(lamp),
              t = game.elapsed + index * 7.31;
            const burning = ["oil", "candle"].includes(lamp.light);
            lamp.strength =
              lamp.level *
              (burning ? flame(t) : 0.98 + 0.02 * Math.sin(t * 0.2));
            lamp.drift = burning
              ? [
                  0.65 * game.pixelScale * Math.sin(t * 1.13),
                  0.45 * game.pixelScale * Math.sin(t * 0.79),
                ]
              : [0, 0];
          }
          let remaining = dt;
          while (game.path.length && remaining > 0) {
            const next = game.path[0],
              dx = next[0] - game.actor.x,
              dy = next[1] - game.actor.y,
              distance = Math.hypot(dx, dy),
              speed =
                90 * game.pixelScale * game.depth() * (game.running ? 2 : 1),
              travel = speed * remaining;
            if (distance > 0) {
              game.actor.mirror = dx < 0;
              game.actor.animation =
                Math.abs(dx) > Math.abs(dy) * 0.8
                  ? "walk-side"
                  : dy < 0
                    ? "walk-back"
                    : "walk-front";
            }
            if (distance <= travel) {
              game.actor.x = next[0];
              game.actor.y = next[1];
              game.path.shift();
              remaining -= distance / speed;
            } else {
              game.actor.x += (dx / distance) * travel;
              game.actor.y += (dy / distance) * travel;
              remaining = 0;
            }
          }
          if (!game.path.length) {
            game.actor.animation = "idle-front";
            game.actor.mirror = false;
            if (game.pending) {
              const pending = game.pending;
              game.pending = null;
              act(pending.target, pending.verb);
            }
          }
        }
        renderer.render(game);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return {
      destroy() {
        disposed = true;
        cancelAnimationFrame(frame);
        subscriptions.forEach((remove) => remove());
        renderer.destroy();
        root.remove();
        style.remove();
      },
      get state() {
        return {
          room: game.room.id,
          time: game.time,
          lantern: game.lantern,
          bloom: game.bloom,
          reader: game.readerItem?.id || null,
          book: game.activeBook?.id || null,
          spread: game.activeBook ? game.spread : null,
          position: [game.actor.x, game.actor.y],
          walking: game.path.length > 0,
          verb: game.verb,
          lamps: game.room.lights.map((l) => ({
            id: l.id,
            on: l.on,
            level: l.level,
          })),
        };
      },
    };
  } catch (error) {
    start.hidden = true;
    windowed.hidden = true;
    help.textContent = error.message;
    heading.textContent = "The study could not open";
    renderer?.destroy();
    throw error;
  }
}
