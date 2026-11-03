import { loadBoard, boardItems, boardPage, boardHit } from "./board.js";
import {
  loadBook,
  cornerHit,
  dragPage,
  movePage,
  releasePage,
  bookItems,
  layoutBook,
  hitEntry,
  parseRoute,
  bookRoute,
} from "./book.js";
import { layoutPanel, inside, siteLayout } from "./panel.js";
import { targetVerbs, layoutMenu, menuHit } from "./verb-menu.js";
import { Renderer } from "./renderer.js";
import { loadWorld, loadRoom, matchingItems, resolve } from "./assets.js";
import { findPath, nearestWalkable } from "./pathfinding.js";
import { wrap } from "./font.js";
import { beacon, flame, lightSourcesAt } from "./lighting.js";
import { animationFrame } from "./animation.js";
import { SoundEngine, footContacts } from "./sound.js";

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
    "Adventure scene. Click floor to walk. Double click floor or objects to run. Select a verb, then an object. T changes time. L toggles lantern. G toggles bloom. M toggles sound.",
  );
  const cover = document.createElement("div");
  cover.className = "adventure-start";
  const heading = document.createElement("h1");
  heading.textContent = "The engineer’s study";
  const help = document.createElement("p");
  help.textContent =
    "Click to walk. Double click to run. Choose a verb, then an object. T: dusk / night. L: lantern. G: bloom. M: sound.";
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
  const fade = document.createElement("div");
  fade.className = "adventure-fade";
  root.append(fade);
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
      verb: null,
      hover: null,
      menu: null,
      path: [],
      running: false,
      pending: null,
      speech: null,
      speechLines: [],
      speechUntil: 0,
      objects: [],
      verbRects: [],
      inventory: [],
      inventoryOffset: 0,
      selectedItem: null,
      panelHover: null,
      sentenceNotice: null,
    };
    game.sound = new SoundEngine(game.world, worldURL);
    subscriptions.push(() => game.sound.destroy());
    on(document, "visibilitychange", () =>
      game.sound.visibility(document.hidden),
    );
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
    game.boards = Object.fromEntries(
      await Promise.all(
        Object.entries(game.world.boards || {}).map(async ([id, config]) => [
          id,
          {
            ...config,
            id,
            items: boardItems(game.items, config.content),
            art: await loadBoard(config, worldURL, renderer),
          },
        ]),
      ),
    );
    function saveInventory() {
      try {
        window.localStorage.setItem(
          "adventure.inventory",
          JSON.stringify(
            game.inventory.map((item) => ({
              kind: item.note ? "notice" : "book",
              id: item.note ? item.note.id : item.book.id,
            })),
          ),
        );
      } catch {}
    }
    function carriedNotice(note, board) {
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
        saveInventory();
      }
    } catch {}
    const siteURL = (path) => {
      if (
        typeof path !== "string" ||
        !path.startsWith("/") ||
        path.startsWith("//")
      )
        throw new Error("Site paths must start with a single slash.");
      const url = resolve(path, location.origin + "/");
      if (new URL(url).origin !== location.origin)
        throw new Error("Site paths must stay on the page origin.");
      return url;
    };
    const catalogue = document.createElement("nav");
    catalogue.className = "adventure-catalogue";
    catalogue.setAttribute("aria-label", "Books and posts");
    for (const book of [
      ...Object.values(game.books),
      ...Object.values(game.boards),
    ]) {
      const title = document.createElement("h2");
      title.textContent = book.title;
      const list = document.createElement("ul");
      if (book.site) {
        const row = document.createElement("li"),
          link = document.createElement("a");
        link.textContent = `${book.title} on the site`;
        link.href = siteURL(book.site);
        link.target = "_blank";
        link.rel = "noopener";
        row.append(link);
        list.append(row);
      }
      for (const item of book.items) {
        const row = document.createElement("li"),
          link = document.createElement("a");
        link.textContent = item.title;
        if (item.link || item.url) link.href = item.link || item.url;
        row.append(link);
        list.append(row);
      }
      catalogue.append(title, list);
    }
    const hotspotLinks = document.createElement("ul");
    for (const room of Object.values(game.world.rooms))
      for (const [id, binding] of Object.entries(room.hotspots || {})) {
        if (!binding.content || !binding.site) continue;
        const row = document.createElement("li"),
          link = document.createElement("a");
        const item = matchingItems(game.items, binding.content).sort((a, b) =>
          (b.date || "").localeCompare(a.date || ""),
        )[0];
        link.textContent = `${item?.title || id} on the site`;
        link.href = siteURL(binding.site);
        link.target = "_blank";
        link.rel = "noopener";
        row.append(link);
        hotspotLinks.append(row);
      }
    catalogue.append(hotspotLinks);
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
                  ((animation.start || 0) + frame) * game.character.frame[0] +
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
      if (game.room.map) return [0, 0];
      const animation = game.character.animations[game.actor.animation];
      const frame = animationFrame(game.actor, animation);
      const offset =
        game.character.flames?.[game.actor.animation][frame] ||
        game.character.lantern;
      return [
        game.actor.x + (game.actor.mirror ? -1 : 1) * offset[0] * game.depth(),
        game.actor.y + offset[1] * game.depth(),
      ];
    };
    game.lanternStrength = () =>
      !game.room.map && game.lantern && game.time === "night"
        ? flame(game.elapsed)
        : 0;
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
      const site = siteLayout(game);
      if (game.siteHover && site) return `Open ${site.path} on the site`;
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
        ? `${game.verb || "Walk to"} ${target.kind === "content" ? "Book: " : ""}${target.label || target.id}`
        : game.verb || "Walk to";
    };
    const labels = game.world.verbs;
    function say(text) {
      game.sentenceNotice = null;
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
      const value = game.activeBoard
        ? `#${encodeURIComponent(game.room.id)}/board/${encodeURIComponent(game.activeBoard.id)}/${game.boardPage}`
        : game.activeBook
          ? bookRoute(game.room.id, game.activeBook.id, game.spread)
          : `#${encodeURIComponent(game.room.id)}${item ? "/" + encodeURIComponent(item.id) : ""}`;
      if (location.hash !== value) history.pushState(null, "", value);
    }
    function openBoard(board, page = 0, update = true) {
      game.siteHover = false;
      game.activeBook = null;
      game.activeBoard = board;
      game.turning = null;
      game.corner = 0;
      game.boardPage = boardPage(board, page);
      game.boardNote = null;
      game.inventoryNote = false;
      game.menu = game.hover = game.pending = null;
      game.path = [];
      game.sentenceNotice = null;
      if (update) writeHash();
    }
    function openBook(book, spread = 0, update = true) {
      game.siteHover = false;
      game.sound.event("book-open");
      game.menu = null;
      game.activeBoard = null;
      game.inventoryNote = false;
      game.sentenceNotice = null;
      game.activeBook = book;
      game.spread = Math.max(
        0,
        Math.min(Math.floor(spread), book.pages.length / 2 - 1),
      );
      game.turning = null;
      game.corner = 0;
      game.hover = null;
      game.path = [];
      game.pending = null;
      if (update) writeHash();
    }
    function closeBook() {
      game.siteHover = false;
      game.activeBoard = null;
      game.boardNote = null;
      game.inventoryNote = false;
      game.sentenceNotice = null;
      game.sound.event("book-close");
      game.activeBook = null;
      game.turning = null;
      game.corner = 0;
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
      game.turning = { direction, spread, progress: 0, commit: true };
      game.corner = 0;
      game.hover = null;
    }
    function hideReader(update = true) {
      reader.hidden = true;
      game.sound.setReader(false);
      iframe.removeAttribute("src");
      game.readerItem = null;
      game.readerSite = null;
      game.siteHover = false;
      if (update) writeHash();
      root.focus({ preventScroll: true });
    }
    function openReader(item, update = true) {
      game.menu = null;
      if (!item.reader) {
        if (item.link) {
          const link = document.createElement("a");
          link.href = item.link;
          link.target = "_blank";
          link.rel = "noopener";
          root.append(link);
          link.click();
          link.remove();
          say("Opening the link…");
          game.sentenceNotice = "Opening the link…";
        } else say("There is nothing to read here.");
        return;
      }
      game.path = [];
      game.pending = null;
      game.readerItem = item;
      game.readerSite =
        [...game.objects, ...game.room.items].find(
          (object) => object.content === item,
        )?.site || null;
      game.siteHover = false;
      game.hover = null;
      game.actor.animation = "idle-front";
      game.actor.mirror = false;
      reader.setAttribute("aria-label", item.title);
      iframe.title = item.title;
      website.hidden = !item.url;
      if (item.url) website.href = item.url;
      else website.removeAttribute("href");
      iframe.src = item.reader;
      reader.hidden = false;
      game.sound.setReader(true);
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
      if (event.key.toLowerCase() === "m" && !event.repeat)
        game.sound.toggleMute();
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
    async function changeRoom(id, from = null) {
      game.menu = null;
      const request = ++roomRequest;
      const room = await loadRoom(game.world, worldURL, id, renderer);
      if (request !== roomRequest || disposed) return;
      game.activeBook = null;
      game.activeBoard = null;
      game.boardNote = null;
      game.inventoryNote = false;
      game.turning = null;
      game.room = room;
      renderer.setRoom(room);
      const [width, height] = room.size;
      game.pixelScale = width / 480;
      game.uiScale = 1;
      game.lanternRadius = 90 * game.pixelScale;
      game.panel = layoutPanel(room.size, labels);
      game.verbTop = game.panel.top;
      game.verbRects = game.panel.verbs;
      game.verbScale = 1;
      game.soundRect = game.panel.sound;
      room.walkable.fill(0, game.verbTop * width);
      const entrance =
        from &&
        room.items.find(
          (item) =>
            item.kind === "exit" && item.to === from && item.bounds[2] >= 0,
        );
      const spawn = room.map
        ? room.spawn || [0, 0]
        : nearestWalkable(
            room.walkable,
            ...(entrance ? entrance.position : room.spawn),
            room.size,
          );
      if (!spawn) throw new Error(`Room ${id} has no walkable floor.`);
      const dx = width / 2 - spawn[0],
        dy = game.verbTop / 2 - spawn[1];
      const facing =
        Math.abs(dx) > Math.abs(dy) ? "side" : dy < 0 ? "back" : "front";
      const idle = entrance ? `idle-${facing}` : "idle-front";
      game.actor = {
        x: spawn[0],
        y: spawn[1],
        animation: game.character.animations[idle] ? idle : "idle-front",
        clock: 0,
        walkPhase: 0,
        mirror: !!entrance && facing === "side" && dx < 0,
      };
      game.path = [];
      game.pending = null;
      game.hover = null;
      game.panelHover = null;
      game.speech = null;
      game.sentenceNotice = null;
      for (const hotspot of room.items.filter(
        (item) => item.kind === "hotspot",
      )) {
        const binding = room.config.hotspots?.[hotspot.id];
        if (!binding) continue;
        if (binding.board) {
          hotspot.board = game.boards[binding.board];
          if (!hotspot.board)
            throw new Error(`Unknown board: ${binding.board}`);
          continue;
        }
        if (binding.book) {
          hotspot.book = game.books[binding.book];
          if (!hotspot.book) throw new Error(`Unknown book: ${binding.book}`);
          continue;
        }
        const item = matchingItems(game.items, binding.content).sort((a, b) =>
          (b.date || "").localeCompare(a.date || ""),
        )[0];
        if (item) {
          hotspot.content = item;
          hotspot.site = binding.site;
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
    const fit = () => {
      renderer.resize(root.clientWidth, root.clientHeight);
      const [width, height] = game.room.size;
      const scale = Math.max(
        1,
        Math.floor(
          Math.min(root.clientWidth / width, root.clientHeight / height),
        ),
      );
      const fit = Math.min(
        scale,
        root.clientWidth / width,
        root.clientHeight / height,
      );
      reader.style.top = `${(root.clientHeight - height * fit) / 2 + 6 * fit}px`;
      reader.style.height = `${(height - 48) * fit}px`;
    };
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
      const site = siteLayout(game);
      game.siteHover = !!(site && inside(site, ...point(event)));
      if (game.siteHover) {
        game.hover = null;
        canvas.style.cursor = "pointer";
        return;
      }
      if (!game.started || game.readerItem || game.loading || game.transition)
        return;
      const [x, y] = point(event);
      if (game.turning?.dragging) {
        movePage(game.turning, x);
        canvas.style.cursor = "grabbing";
        return;
      }
      if (game.activeBoard) {
        game.hover = boardHit(
          game.activeBoard,
          game.boardPage,
          game.boardNote,
          x,
          y,
          !game.inventoryNote,
        );
        canvas.style.cursor = game.hover ? "pointer" : "crosshair";
        return;
      }
      game.corner =
        game.activeBook && !game.turning
          ? cornerHit(
              game.bookArt,
              game.spread,
              game.activeBook.pages.length,
              x,
              y,
            )
          : 0;
      if (game.menu) {
        game.menu.selected = menuHit(game.menu, x, y);
        canvas.style.cursor = game.menu.selected >= 0 ? "pointer" : "crosshair";
        return;
      }
      game.panelHover =
        !game.activeBook && game.verbRects.find((rect) => inside(rect, x, y));
      const slot = game.activeBook
        ? -1
        : game.panel.slots.findIndex((rect) => inside(rect, x, y));
      game.hover = game.activeBook
        ? game.turning
          ? null
          : hitEntry(game.activeBook.pages, game.spread, x, y)
        : slot >= 0
          ? game.inventory[game.inventoryOffset + slot] || null
          : hit(x, y);
      canvas.style.cursor =
        game.hover ||
        game.corner ||
        (!game.activeBook && inside(game.panel.forget, x, y))
          ? "pointer"
          : "crosshair";
    });
    on(canvas, "pointerleave", () => {
      game.siteHover = false;
      if (game.menu) game.menu.selected = -1;
      game.hover = null;
      game.corner = 0;
      game.panelHover = null;
    });
    on(root, "contextmenu", (event) => {
      event.preventDefault();
      game.menu = null;
      if ((game.activeBook || game.activeBoard) && !game.readerItem) {
        closeBook();
        return;
      }
      if (!game.started || game.readerItem || game.loading || game.transition)
        return;
      root.focus({ preventScroll: true });
      const pointAt = point(event);
      const target = hit(...pointAt);
      game.hover = null;
      if (target)
        game.menu = layoutMenu(
          target,
          targetVerbs(labels, target),
          pointAt,
          game.room.size,
          game.bookArt?.fonts,
        );
    });
    function act(target, verb) {
      if (verb !== "Walk to" && !targetVerbs(labels, target).includes(verb)) {
        say("I can't do that.");
        return;
      }
      if (target.note) {
        if (verb === "Open") {
          openBoard(target.board, 0, false);
          game.boardNote = target.note;
          game.inventoryNote = true;
        } else if (verb === "Look at") say(target.note.title);
        else say("I can't do that.");
        return;
      }
      if (target.board && verb === "Open") {
        openBoard(target.board);
        return;
      }
      if (target.book && verb === "Open") {
        openBook(target.book);
        return;
      }
      if (target.kind === "book" || target.kind === "inventory") {
        if (verb === "Look at")
          say(`${target.book.title}. ${target.book.items.length} entries.`);
        else if (verb === "Take" && target.kind === "book") {
          if (game.inventory.some((item) => item.book?.id === target.book.id))
            say("I already have it.");
          else {
            game.inventory.push({ ...target, kind: "inventory" });
            saveInventory();
            say(`Taken ${target.book.title}.`);
          }
        } else say("I can't do that.");
        return;
      }
      if (target.kind === "exit") {
        if (verb === "Use" || verb === "Walk to") {
          if (!game.world.rooms[target.to]) {
            say(`That way lies ${target.to}.`);
            return;
          }
          game.sound.event("door");
          game.transition = {
            to: target.to,
            from: game.room.id,
            phase: "out",
            opacity: 0,
          };
        } else say(target.look || `That way lies ${target.to}.`);
        return;
      }
      if (verb === "Look at" && target.kind === "hotspot" && target.content) {
        say(
          target.look ||
            `${target.content.title}. ${target.content.description || ""}`,
        );
      } else if (verb === "Look at")
        say(target.content?.description || target.look || "Nothing unusual.");
      else if (verb === "Open" && target.kind === "hotspot" && target.content)
        target.content.reader
          ? openReader(target.content)
          : say(
              target.content.link || target.content.url
                ? "Let's see what's out there."
                : "There is nothing to open here.",
            );
      else if (
        (verb === "Open" || verb === "Take") &&
        target.kind === "content"
      )
        openReader(target.content);
      else if (verb === "Use" && target.kind === "light") {
        const lamp = game.room.lights.find((light) => light.id === target.id);
        if (lamp.light === "beacon") {
          say("Too far away.");
          return;
        }
        lamp.on = !lamp.on;
        game.sound.event("lamp");
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
    function chooseTarget(target, verb, running = false) {
      verb ||= "Walk to";
      if (game.room.map) {
        if (target.kind === "exit") act(target, "Walk to");
        return;
      }
      if (game.selectedItem) {
        const item = game.selectedItem;
        game.selectedItem = null;
        game.path = [];
        game.pending = null;
        const sentence = `Use ${item.label} with ${target.label || target.id}`;
        say("I can't use those together.");
        game.sentenceNotice = sentence;
        return;
      }
      if (
        target.kind !== "inventory" &&
        (target.book || target.board || target.content?.reader) &&
        verb === "Walk to"
      )
        verb = "Open";
      if (verb !== "Walk to" && !targetVerbs(labels, target).includes(verb)) {
        say("I can't do that.");
        return;
      }
      if (target.light === "beacon" && verb === "Use") {
        act(target, verb);
        return;
      }
      if (target.kind === "inventory") {
        if (target.note && verb === "Walk to") verb = "Open";
        if (verb === "Use" || verb === "Walk to") {
          game.selectedItem = target;
          game.verb = "Use";
        } else act(target, verb);
        return;
      }
      if (verb === "Open" && target.kind === "hotspot" && target.content) {
        const url = target.content.link || target.content.url;
        if (url && !target.content.reader && !running)
          window.open(url, "_blank", "noopener,noreferrer");
      }
      walk(
        target.position,
        verb === "Walk to" && target.kind !== "exit" ? null : { target, verb },
        running,
      );
    }
    function chooseMenu(index) {
      const menu = game.menu;
      game.menu = null;
      game.hover = null;
      canvas.style.cursor = "crosshair";
      if (index >= 0) {
        game.sound.event("menu");
        chooseTarget(menu.target, menu.verbs[index]);
      }
    }
    let suppressBookClick = false;
    on(canvas, "pointerdown", (event) => {
      suppressBookClick = false;
      if (
        event.button !== 0 ||
        !game.started ||
        game.readerItem ||
        game.loading ||
        game.transition ||
        !game.activeBook ||
        game.turning
      )
        return;
      const [x, y] = point(event);
      if (hitEntry(game.activeBook.pages, game.spread, x, y)) return;
      const turn = dragPage(
        game.bookArt,
        game.spread,
        game.activeBook.pages.length,
        x,
        y,
      );
      if (!turn) return;
      game.turning = { ...turn, spread: game.spread + turn.direction };
      game.hover = null;
      game.corner = 0;
      canvas.setPointerCapture(event.pointerId);
    });
    function finishDrag(event, cancelled = false) {
      if (!game.turning?.dragging) return;
      movePage(game.turning, point(event)[0]);
      const turn = game.turning;
      releasePage(turn, cancelled);
      suppressBookClick = turn.moved || turn.corner || cancelled;
      if (!turn.moved && !turn.corner) game.turning = null;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "crosshair";
    }
    on(canvas, "pointerup", (event) => finishDrag(event));
    on(canvas, "pointercancel", (event) => finishDrag(event, true));
    on(canvas, "lostpointercapture", (event) => finishDrag(event, true));
    on(canvas, "click", (event) => {
      const site = siteLayout(game);
      if (game.started && site && inside(site, ...point(event))) {
        const link = document.createElement("a");
        link.href = siteURL(site.path);
        link.target = "_blank";
        link.rel = "noopener";
        root.append(link);
        link.click();
        link.remove();
        return;
      }
      if (!game.started || game.readerItem || game.loading || game.transition)
        return;
      root.focus({ preventScroll: true });
      const [x, y] = point(event);
      if (
        inside(
          game.activeBook || game.activeBoard
            ? { ...game.soundRect, y: game.room.size[1] - 16 }
            : game.soundRect,
          x,
          y,
        )
      ) {
        game.sound.toggleMute();
        return;
      }
      if (game.menu) {
        chooseMenu(menuHit(game.menu, x, y));
        return;
      }
      if (game.activeBoard) {
        if (y >= game.room.size[1] - 24) {
          if (x >= 8 && x < 60) closeBook();
          return;
        }
        const hit = boardHit(
          game.activeBoard,
          game.boardPage,
          game.boardNote,
          x,
          y,
          !game.inventoryNote,
        );
        if (hit === "back") {
          if (game.inventoryNote) closeBook();
          else game.boardNote = null;
        } else if (hit === "take") {
          const note = game.boardNote;
          if (game.inventory.some((item) => item.note?.id === note.id))
            say("I already have it.");
          else {
            const board = game.activeBoard;
            game.inventory.push(carriedNotice(note, board));
            saveInventory();
            say("I'll keep this one.");
          }
        } else if (hit === "go")
          openReader({ ...game.boardNote, reader: null });
        else if (hit === "older" || hit === "newer") {
          game.boardPage += hit === "older" ? 1 : -1;
          writeHash();
        } else if (hit) game.boardNote = hit;
        game.hover = null;
        return;
      }
      if (game.activeBook) {
        if (suppressBookClick) {
          suppressBookClick = false;
          return;
        }
        if (game.turning) return;
        if (y >= game.room.size[1] - 24) {
          if (x >= 8 && x < 60) closeBook();
          return;
        }
        const entry = hitEntry(game.activeBook.pages, game.spread, x, y);
        if (entry) {
          openReader(entry.item);
          return;
        }
        const corner = cornerHit(
          game.bookArt,
          game.spread,
          game.activeBook.pages.length,
          x,
          y,
        );
        if (corner) turnBook(corner);
        return;
      }
      if (y >= game.verbTop) {
        if (inside(game.panel.forget, x, y)) {
          say("Pockets emptied.");
          game.inventory = [];
          game.inventoryOffset = 0;
          game.selectedItem = null;
          game.hover = null;
          game.sentenceNotice = null;
          try {
            window.localStorage.removeItem("adventure.inventory");
          } catch {}
          return;
        }
        const cell = game.verbRects.find((rect) => inside(rect, x, y));
        if (cell) {
          game.verb = game.verb === cell.label ? null : cell.label;
          game.selectedItem = null;
          game.sentenceNotice = null;
        }
        const slot = game.panel.slots.findIndex((rect) => inside(rect, x, y));
        const item = slot >= 0 && game.inventory[game.inventoryOffset + slot];
        if (item) chooseTarget(item, game.verb);
        if (inside(game.panel.previous, x, y))
          game.inventoryOffset = Math.max(
            0,
            game.inventoryOffset - game.panel.slots.length,
          );
        if (
          inside(game.panel.next, x, y) &&
          game.inventoryOffset + game.panel.slots.length < game.inventory.length
        )
          game.inventoryOffset += game.panel.slots.length;
        return;
      }
      const target = hit(x, y);
      game.hover = target;
      if (target) {
        chooseTarget(target, game.verb, event.detail >= 2);
      } else if (
        x >= 0 &&
        x < game.room.size[0] &&
        y >= 0 &&
        y < game.room.size[1] &&
        game.room.walkable[Math.floor(y) * game.room.size[0] + Math.floor(x)]
      )
        if (!game.room.map) walk([x, y], null, event.detail >= 2);
    });
    on(document, "click", (event) => {
      if (game.menu && event.target !== canvas) chooseMenu(-1);
    });
    on(root, "keydown", (event) => {
      if (
        event.target === start ||
        event.target === windowed ||
        game.readerItem ||
        !game.started ||
        game.loading ||
        game.transition
      )
        return;
      if (event.key.toLowerCase() === "m") {
        if (!event.repeat) game.sound.toggleMute();
        return;
      }
      if (game.menu) {
        if (["Escape", "ArrowUp", "ArrowDown", "Enter"].includes(event.key))
          event.preventDefault();
        const menu = game.menu;
        if (event.key === "Escape") chooseMenu(-1);
        if (event.key === "ArrowDown")
          menu.selected = (menu.selected + 1) % menu.verbs.length;
        if (event.key === "ArrowUp")
          menu.selected =
            menu.selected < 0
              ? menu.verbs.length - 1
              : (menu.selected + menu.verbs.length - 1) % menu.verbs.length;
        if (event.key === "Enter") chooseMenu(menu.selected);
        return;
      }
      if (game.activeBoard) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeBook();
        }
        return;
      }
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
        game.sound.event("time");
      }
      if (event.key.toLowerCase() === "l") {
        game.lantern = !game.lantern;
        game.sound.event("lantern");
      }
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
        if (
          state.board &&
          game.room.items.some((item) => item.board?.id === state.board)
        ) {
          hideReader(false);
          openBoard(game.boards[state.board], state.spread, false);
          return;
        }
        game.activeBoard = null;
        game.inventoryNote = false;
        if (
          state.book &&
          (game.room.config.books?.includes(state.book) ||
            game.room.items.some((item) => item.book?.id === state.book) ||
            game.inventory.some((item) => item.book?.id === state.book))
        ) {
          hideReader(false);
          openBook(game.books[state.book], state.spread, false);
          return;
        }
        game.activeBook = null;
        game.turning = null;
        const item = [...game.objects, ...game.room.items].find(
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
      game.sound.start();
      game.sound.visibility(document.hidden);
      game.sound.update(game);
      cover.hidden = true;
      if (fullscreen && root.requestFullscreen)
        root.requestFullscreen().catch(() => {});
      root.focus({ preventScroll: true });
      const item = [...game.objects, ...game.room.items].find(
        (object) => object.content?.id === initial.item,
      )?.content;
      if (
        initial.board &&
        game.room.items.some((item) => item.board?.id === initial.board)
      )
        openBoard(game.boards[initial.board], initial.spread);
      else if (
        initial.book &&
        (game.room.config.books?.includes(initial.book) ||
          game.room.items.some((item) => item.book?.id === initial.book))
      )
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
      if (game.transition) {
        const transition = game.transition;
        if (transition.phase !== "loading") {
          transition.opacity = Math.max(
            0,
            Math.min(
              1,
              transition.opacity +
                (transition.phase === "out" ? dt : -dt) / 0.15,
            ),
          );
          fade.style.opacity = String(transition.opacity);
          if (transition.phase === "out" && transition.opacity === 1) {
            transition.phase = "loading";
            game.loading = true;
            changeRoom(transition.to, transition.from)
              .then(() => {
                if (!disposed) writeHash();
              })
              .catch((error) => say(error.message))
              .finally(() => {
                game.loading = false;
                transition.phase = "in";
              });
          } else if (transition.phase === "in" && transition.opacity === 0)
            game.transition = null;
        }
      }
      if (!game.loading) {
        if (
          game.started &&
          !game.readerItem &&
          game.activeBook &&
          game.turning
        ) {
          const turn = game.turning;
          if (!turn.dragging) {
            const step =
              (dt * game.bookArt.turn.fps) / game.bookArt.turn.frames;
            turn.progress = Math.max(
              0,
              Math.min(1, turn.progress + (turn.commit ? step : -step)),
            );
            if (
              (turn.commit && turn.progress === 1) ||
              (!turn.commit && turn.progress === 0)
            ) {
              if (turn.commit) {
                game.spread = turn.spread;
                game.sound.event("page-turn");
              }
              game.turning = null;
              writeHash();
            }
          }
        }
        if (game.started && !game.readerItem) game.elapsed += dt;
        if (
          game.started &&
          !game.readerItem &&
          !game.activeBook &&
          !game.activeBoard
        ) {
          if (!game.timeOverride) {
            const hour = new Date().getHours();
            game.time = hour >= 6 && hour < 20 ? "dusk" : "night";
          }
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
              (lamp.light === "beacon"
                ? beacon(game.elapsed)
                : burning
                  ? flame(t)
                  : 0.98 + 0.02 * Math.sin(t * 0.2));
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
              const wasSide = game.actor.animation === "walk-side",
                wasVertical = ["walk-front", "walk-back"].includes(
                  game.actor.animation,
                ),
                threshold = wasSide ? 0.7 : wasVertical ? 0.9 : 0.8;
              game.actor.mirror = dx < 0;
              game.actor.animation =
                Math.abs(dx) > Math.abs(dy) * threshold
                  ? "walk-side"
                  : dy < 0
                    ? "walk-back"
                    : "walk-front";
              const animation = game.character.animations[game.actor.animation];
              const before = animation.stride
                ? game.actor.walkPhase
                : ((game.actor.clock - remaining) * animation.fps) /
                  animation.frames;
              if (animation.stride)
                game.actor.walkPhase +=
                  Math.min(distance, travel) /
                  (animation.stride * game.depth());
              const after = animation.stride
                ? game.actor.walkPhase
                : before +
                  (Math.min(distance / speed, remaining) * animation.fps) /
                    animation.frames;
              for (let i = 0; i < footContacts(before, after); i++)
                game.sound.event("step", game.depth());
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
            if (game.actor.animation.startsWith("walk-")) {
              const idle = game.actor.animation.replace("walk-", "idle-");
              game.actor.animation = game.character.animations[idle]
                ? idle
                : "idle-front";
              if (game.actor.animation !== "idle-side")
                game.actor.mirror = false;
            }
            if (game.pending) {
              const pending = game.pending;
              game.pending = null;
              act(pending.target, pending.verb);
            }
          }
        }
        game.sound.update(game);
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
          board: game.activeBoard?.id || null,
          page: game.activeBoard ? game.boardPage : null,
          note: game.activeBoard ? game.boardNote?.id || null : null,
          book: game.activeBook?.id || null,
          spread: game.activeBook ? game.spread : null,
          position: game.room.map ? null : [game.actor.x, game.actor.y],
          walking: game.path.length > 0,
          verb: game.verb,
          inventory: game.inventory.map(
            (item) => item.note?.id || item.book.id,
          ),
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
    game?.sound?.destroy();
    renderer?.destroy();
    throw error;
  }
}
