// Load a world and coordinate room state, interactions, audio, and the frame loop.
import { catalogue, siteURL, openLink } from "./catalogue.js";
import {
  restoreInventory,
  saveInventory,
  carriedNotice,
  forgetInventory,
  canTake,
} from "./inventory.js";
import { parseRoute, writeHash, routeTarget } from "./route.js";
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
} from "./book.js";
import { layoutPanel, inside, footerLayout, rectangle } from "./panel.js";
import { targetVerbs, layoutMenu, menuHit, exitCursor } from "./verb-menu.js";
import { Renderer } from "./renderer.js";
import {
  loadWorld,
  loadRoom,
  bindRoom,
  flameCentroids,
  resolve,
} from "./assets.js";
import { findPath, nearestWalkable } from "./pathfinding.js";
import { wrap } from "./font.js";
import { currentTime, updateLamps } from "./lighting.js";
import { advanceActor, idleAnimation } from "./animation.js";
import { SoundEngine } from "./sound.js";

export async function startSession({
  worldURL,
  contentURL,
  ui,
  soundContext,
  subscriptions,
  on,
  lifecycle,
}) {
  const {
    root,
    canvas,
    cover,
    heading,
    reader,
    close,
    iframe,
    website,
    live,
    fade,
  } = ui;
  let renderer,
    game,
    frame = 0,
    last = 0,
    roomRequest = 0;
  const subscriptionStart = subscriptions.length;
  try {
    renderer = new Renderer(canvas);
    const assets = await loadWorld(worldURL, contentURL, location.origin);
    if (lifecycle.disposed) throw new Error("Game was closed.");
    heading.textContent = assets.world.title;
    renderer.palette(assets.palette);
    game = {
      ...assets,
      renderer,
      root,
      canvas,
      readerItem: null,
      time: currentTime(),
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
    game.sound = new SoundEngine(game.world, worldURL, soundContext);
    subscriptions.push(() => game.sound.destroy());
    on(document, "visibilitychange", () =>
      game.sound.visibility(document.hidden),
    );
    game.bookArt = await loadBook(resolve(game.world.book, worldURL), renderer);
    subscriptions.push(() => document.fonts.delete(game.bookArt.fontFace));
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
    restoreInventory(game);
    root.append(catalogue(game));
    game.character.texture = renderer.texture(game.character.sheet);
    game.character.size = [
      game.character.sheet.width,
      game.character.sheet.height,
    ];
    game.character.glowTexture = game.character.glow
      ? renderer.texture(game.character.glow)
      : null;
    flameCentroids(game.character, renderer);
    const labels = game.world.verbs;
    function say(text) {
      game.sentenceNotice = null;
      game.speech = String(text);
      game.speechLines = wrap(
        text,
        Math.max(1, Math.floor((game.room.size[0] * 0.8) / 6)),
        2,
      );
      game.speechUntil =
        game.elapsed +
        (game.activeBook || game.activeBoard || game.readerItem
          ? 3
          : Math.max(3.5, String(text).length * 0.055));
      live.textContent = String(text);
    }
    function openBoard(board, page = 0, update = true) {
      game.siteHover = false;
      game.activeBook = null;
      game.activeBoard = board;
      game.speech = null;
      game.turning = null;
      game.corner = 0;
      game.boardPage = boardPage(board, page);
      game.boardNote = null;
      game.inventoryNote = false;
      game.menu = game.hover = game.pending = null;
      game.path = [];
      game.sentenceNotice = null;
      if (update) writeHash(game);
    }
    function openBook(book, spread = 0, update = true) {
      game.siteHover = false;
      game.sound.event("book-open");
      game.menu = null;
      game.activeBoard = null;
      game.inventoryNote = false;
      game.sentenceNotice = null;
      game.activeBook = book;
      game.speech = null;
      game.spread = Math.max(
        0,
        Math.min(Math.floor(spread), book.pages.length / 2 - 1),
      );
      game.turning = null;
      game.corner = 0;
      game.hover = null;
      game.path = [];
      game.pending = null;
      if (update) writeHash(game);
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
      writeHash(game);
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
      frameSubscriptions.splice(0).forEach((remove) => remove());
      iframe.removeAttribute("src");
      game.readerItem = null;
      game.readerSite = null;
      game.siteHover = false;
      if (update) writeHash(game);
      root.focus({ preventScroll: true });
    }
    function openReader(item, update = true) {
      game.menu = null;
      if (!item.reader) {
        if (item.link) {
          openLink(item.link);
          say("Opening the link…");
          game.sentenceNotice = "Opening the link…";
        } else say("There is nothing to read here.");
        return;
      }
      game.path = [];
      game.pending = null;
      game.readerItem = item;
      game.speech = null;
      game.sentenceNotice = null;
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
      renderer.render(game);
      game.readerHover = game.siteHover;
      game.readerMuted = game.sound.muted;
      game.readerSpeech = game.speechUntil > game.elapsed;
      reader.hidden = false;
      game.sound.setReader(true);
      if (update) writeHash(game, item);
      close.focus({ preventScroll: true });
    }
    on(close, "click", () => hideReader());
    let wasFullscreen = document.fullscreenElement === root;
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
        if (
          (event.target === website ||
            (website.hidden && event.target === iframe)) &&
          !event.shiftKey
        ) {
          event.preventDefault();
          close.focus();
        }
        // Shift-Tab from Close returns to the last focusable reader control.
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
      const doc = iframe.contentDocument;
      if (doc) {
        doc.addEventListener("keydown", readerKey);
        frameSubscriptions.push(() =>
          doc.removeEventListener("keydown", readerKey),
        );
      }
    });
    async function changeRoom(id, from = null) {
      game.menu = null;
      const request = ++roomRequest;
      const room = await loadRoom(game.world, worldURL, id, renderer);
      if (request !== roomRequest || lifecycle.disposed) return;
      game.activeBook = null;
      game.activeBoard = null;
      game.boardNote = null;
      game.inventoryNote = false;
      game.turning = null;
      game.room = room;
      renderer.setRoom(room);
      fit();
      const [width] = room.size;
      game.pixelScale = width / 480;
      game.lanternRadius = 90 * game.pixelScale;
      game.panel = layoutPanel(room.size, labels);
      game.verbTop = game.panel.top;
      game.verbRects = game.panel.verbs;
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
        animation: idleAnimation(game.character, idle),
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
      bindRoom(game);
    }
    let initial = parseRoute(location.hash, game.world.start);
    if (!Object.hasOwn(game.world.rooms, initial.room))
      initial = { room: game.world.start, item: null };
    await changeRoom(initial.room);
    function fit() {
      const fit = renderer.resize(root.clientWidth, root.clientHeight);
      const [, height] = game.room.size;
      // Leave six game pixels above the reader and room for the footer below.
      reader.style.top = `${(root.clientHeight - height * fit) / 2 + 6 * fit}px`;
      reader.style.height = `${(height - 48) * fit}px`;
    }
    const observer = new ResizeObserver(fit);
    observer.observe(root);
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
          inside(rectangle(x0, y0, x1 - x0 + 1, y1 - y0 + 1), px, py) ||
          inside(
            rectangle(p[0] - sprite[0] / 2, p[1] - sprite[1], ...sprite),
            px,
            py,
          )
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
      const site = footerLayout(game).site;
      game.siteHover = !!(site && inside(site, ...point(event)));
      if (game.siteHover) {
        game.hover = null;
        canvas.style.cursor = "pointer";
        return;
      }
      if (game.readerItem || game.loading || game.transition) return;
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
          canTake(game),
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
        game.hover?.kind === "exit"
          ? exitCursor(game.hover, game.room.size)
          : game.hover ||
              game.corner ||
              (!game.activeBook &&
                game.inventory.length &&
                inside(game.panel.forget, x, y))
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
      if (game.readerItem || game.loading || game.transition) return;
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
          game.bookArt.fonts,
        );
    });
    function act(target, verb) {
      if (target.note) {
        if (verb === "Open") {
          openBoard(target.board, 0, false);
          game.boardNote = target.note;
          game.inventoryNote = true;
        } else if (verb === "Look at") say(target.note.title);
        else say("I can't do that.");
        return;
      }
      if (verb === "Take" && target.kind === "hotspot") {
        if (target.board) say("Open it and pick a notice.");
        else say("It belongs to the keeper.");
        return;
      }
      if (target.go && (verb === "Open" || verb === "Walk to")) {
        act({ ...target.via, to: target.go }, "Walk to");
        return;
      }
      if (target.board && verb === "Open") {
        openBoard(target.board);
        return;
      }
      if (target.kind === "book" || target.kind === "inventory") {
        if (verb === "Open") openBook(target.book);
        else if (verb === "Look at")
          say(`${target.book.title}. ${target.book.items.length} entries.`);
        else if (verb === "Take" && target.kind === "book") {
          if (game.inventory.some((item) => item.book?.id === target.book.id))
            say("I already have it.");
          else {
            game.inventory.push({ ...target, kind: "inventory" });
            saveInventory(game);
            say(`Taken ${target.book.title}.`);
          }
        } else say("I can't do that.");
        return;
      }
      if (target.kind === "exit") {
        if (verb === "Use" || verb === "Walk to") {
          if (!Object.hasOwn(game.world.rooms, target.to)) {
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
        if (url && !target.content.reader && !running) openLink(url);
      }
      const travel = target.go && (verb === "Open" || verb === "Walk to");
      walk(
        travel ? target.via.position : target.position,
        verb === "Walk to" && target.kind !== "exit" && !travel
          ? null
          : { target, verb },
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
      const site = footerLayout(game).site;
      if (site && inside(site, ...point(event))) {
        openLink(siteURL(site.path));
        return;
      }
      if (game.readerItem) {
        const [x, y] = point(event);
        if (inside(footerLayout(game).close, x, y)) hideReader();
        return;
      }
      if (game.loading || game.transition) return;
      root.focus({ preventScroll: true });
      const [x, y] = point(event);
      if (inside(footerLayout(game).sound, x, y)) {
        game.sound.toggleMute();
        return;
      }
      if (game.menu) {
        chooseMenu(menuHit(game.menu, x, y));
        return;
      }
      if (game.activeBoard) {
        if (y >= game.room.size[1] - 24) {
          if (inside(footerLayout(game).close, x, y)) closeBook();
          return;
        }
        const hit = boardHit(
          game.activeBoard,
          game.boardPage,
          game.boardNote,
          x,
          y,
          canTake(game),
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
            saveInventory(game);
            say("I'll keep this one.");
          }
        } else if (hit === "go")
          openReader({ ...game.boardNote, reader: null });
        else if (hit === "older" || hit === "newer") {
          game.boardPage += hit === "older" ? 1 : -1;
          writeHash(game);
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
          if (inside(footerLayout(game).close, x, y)) closeBook();
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
        if (game.inventory.length && inside(game.panel.forget, x, y)) {
          say("Pockets emptied.");
          forgetInventory(game);
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
      if (game.readerItem || game.loading || game.transition) return;
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
      if (lifecycle.disposed) return;
      const state = parseRoute(location.hash, game.world.start);
      if (!Object.hasOwn(game.world.rooms, state.room)) return;
      if (game.room.id !== state.room) {
        hideReader(false);
        game.loading = true;
        try {
          await changeRoom(state.room);
        } finally {
          game.loading = false;
        }
      }
      const target = routeTarget(game, state);
      hideReader(false);
      game.activeBoard = game.activeBook = game.turning = null;
      game.inventoryNote = false;
      if (target.board) openBoard(target.board, state.spread, false);
      else if (target.book) openBook(target.book, state.spread, false);
      else if (target.item) openReader(target.item, false);
    }

    on(window, "hashchange", () => {
      restoreHash().catch((error) => say(error.message));
    });
    function tick(now) {
      if (lifecycle.disposed) return;
      if (document.hidden) {
        last = 0;
        frame = requestAnimationFrame(tick);
        return;
      }
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
                if (!lifecycle.disposed) writeHash(game);
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
        if (!game.readerItem && game.activeBook && game.turning) {
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
              writeHash(game);
            }
          }
        }
        game.elapsed += dt;
        if (!game.readerItem && !game.activeBook && !game.activeBoard) {
          if (!game.timeOverride) game.time = currentTime();
          updateLamps(game, dt);
          for (const contact of advanceActor(game, dt))
            game.sound.event("step", contact);
          if (!game.path.length) {
            if (game.pending) {
              const pending = game.pending;
              game.pending = null;
              act(pending.target, pending.verb);
            }
          }
        }
        game.sound.update(game);
        const readerSpeech = game.speechUntil > game.elapsed;
        if (
          !game.readerItem ||
          game.readerHover !== game.siteHover ||
          game.readerMuted !== game.sound.muted ||
          game.readerSpeech !== readerSpeech
        ) {
          renderer.render(game);
          game.readerHover = game.siteHover;
          game.readerMuted = game.sound.muted;
          game.readerSpeech = readerSpeech;
        }
      }
      frame = requestAnimationFrame(tick);
    }
    game.sound.start();
    game.sound.visibility(document.hidden);
    game.sound.update(game);
    cover.hidden = true;
    root.focus({ preventScroll: true });
    const target = routeTarget(game, initial);
    if (target.board) openBoard(target.board, initial.spread);
    else if (target.book) openBook(target.book, initial.spread);
    else if (target.item) openReader(target.item);
    else writeHash(game);
    frame = requestAnimationFrame(tick);
    return {
      destroy() {
        lifecycle.disposed = true;
        cancelAnimationFrame(frame);
        subscriptions.forEach((remove) => remove());
        renderer.destroy();
        root.remove();
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
    subscriptions.splice(subscriptionStart).forEach((remove) => remove());
    if (!game?.sound) soundContext?.close()?.catch(() => {});
    renderer?.destroy();
    throw error;
  }
}
