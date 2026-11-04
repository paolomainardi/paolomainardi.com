// Room-local characters: waypoint walks, rests and a short pet interaction.
import { depth } from "./lighting.js";
import { findPath } from "./pathfinding.js";

export function validateActors(configs, world, room) {
  if (!Array.isArray(configs)) throw new Error("Room actors must be a list.");
  const ids = new Set(room.items.map((item) => item.id));
  for (const actor of configs) {
    const point = (p) =>
      Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
    if (
      !actor ||
      typeof actor.id !== "string" ||
      !actor.id ||
      ids.has(actor.id) ||
      typeof actor.label !== "string" ||
      !actor.label ||
      typeof actor.sheet !== "string" ||
      !actor.sheet ||
      !Array.isArray(actor.path) ||
      actor.path.length < 2 ||
      !actor.path.every(point) ||
      !Number.isFinite(actor.speed) ||
      actor.speed <= 0 ||
      !point(actor.sit) ||
      actor.sit[0] <= 0 ||
      actor.sit[1] < actor.sit[0] ||
      ![actor.look, actor.pet, actor.take].every((id) =>
        Object.hasOwn(world.voices || {}, id),
      ) ||
      !Object.hasOwn(world.sounds || {}, actor.sound) ||
      (actor.meow !== undefined &&
        !Object.hasOwn(world.sounds || {}, actor.meow)) ||
      (actor.chatter !== undefined &&
        !Object.hasOwn(world.sounds || {}, actor.chatter)) ||
      (actor.name !== undefined &&
        (typeof actor.name !== "string" || !actor.name.trim())) ||
      (actor.speech !== undefined &&
        (typeof actor.speech !== "string" ||
          !/^#[0-9a-f]{6}$/i.test(actor.speech))) ||
      (actor.talk !== undefined &&
        (!Array.isArray(actor.talk) ||
          !actor.talk.length ||
          !actor.talk.every(
            (exchange) =>
              exchange &&
              [exchange.meow, exchange.words, exchange.end].every(
                (text) => typeof text === "string" && text.trim(),
              ) &&
              typeof exchange.reply === "string" &&
              Object.hasOwn(world.voices || {}, exchange.reply),
          ))) ||
      room.map
    )
      throw new Error("Invalid room actor configuration.");
    ids.add(actor.id);
    for (const [x, y] of actor.path) {
      if (
        x < 0 ||
        x >= room.size[0] ||
        y < 0 ||
        y >= room.size[1] - 36 ||
        !room.walkable[Math.floor(y) * room.size[0] + Math.floor(x)]
      )
        throw new Error(`Actor ${actor.id} path must stay on walkable floor.`);
    }
    for (let i = 1; i < actor.path.length; i++)
      if (
        !findPath(room.walkable, actor.path[i - 1], actor.path[i], room.size)
          .length
      )
        throw new Error(`Actor ${actor.id} path must be connected.`);
  }
}

export function validateActorSheet(sheet, bitmap) {
  if (
    !Array.isArray(sheet.frame) ||
    sheet.frame.length !== 2 ||
    !sheet.frame.every((n) => Number.isInteger(n) && n > 0) ||
    !Array.isArray(sheet.anchor) ||
    sheet.anchor.length !== 2 ||
    !sheet.anchor.every(
      (n, i) => Number.isFinite(n) && n >= 0 && n <= sheet.frame[i],
    ) ||
    !["walk-side", "sit", "idle", "pet"].every((name) => {
      const a = sheet.animations?.[name];
      return (
        a &&
        Number.isInteger(a.row) &&
        a.row >= 0 &&
        Number.isInteger(a.frames) &&
        a.frames > 0 &&
        Number.isFinite(a.fps) &&
        a.fps > 0 &&
        Number.isInteger(a.start ?? 0) &&
        (a.start ?? 0) >= 0 &&
        (a.row + 1) * sheet.frame[1] <= bitmap.height &&
        ((a.start ?? 0) + a.frames) * sheet.frame[0] <= bitmap.width &&
        (a.stride === undefined || (Number.isFinite(a.stride) && a.stride > 0))
      );
    }) ||
    !(sheet.animations["walk-side"].stride > 0)
  )
    throw new Error("Invalid actor sprite sheet.");
}

export function createActor(config, character) {
  return {
    ...config,
    kind: "actor",
    character,
    x: config.path[0][0],
    y: config.path[0][1],
    animation: "sit",
    clock: 0,
    walkPhase: 0,
    mirror: false,
    waypoint: 0,
    direction: 1,
    rest: config.sit[0],
    route: [],
    held: false,
    petting: 0,
    nextMeow: 12 + Math.random() * 20,
  };
}

export function petActor(
  actor,
  sound,
  say,
  reduced = false,
  visitorX = actor.x,
) {
  if (actor.petting) return;
  // Turn towards the visitor; the sheet faces right.
  actor.mirror = visitorX < actor.x;
  actor.held = false;
  actor.petting = 3;
  actor.clock = 0;
  actor.animation = reduced ? "sit" : "pet";
  if (actor.meow) sound.play(actor.meow, sound.effects);
  sound.play(actor.sound, sound.effects);
  say(null, actor.pet);
}

export function advanceActors(game, dt, reduced = false) {
  if (game.readerItem || game.activeBook || game.activeBoard || game.hidden)
    return;
  for (const actor of game.actors || []) {
    if (
      actor.held &&
      game.pending?.target !== actor &&
      game.conversation?.actor !== actor
    )
      actor.held = false;
    if (actor.petting) {
      actor.petting = Math.max(0, actor.petting - dt);
      actor.animation = reduced ? "sit" : "pet";
      if (!reduced) actor.clock += dt;
      if (!actor.petting) {
        actor.animation = "sit";
        actor.rest = actor.sit[0];
        actor.clock = 0;
      }
      continue;
    }
    if (actor.held || reduced) {
      actor.animation = "sit";
      actor.clock = 0;
      continue;
    }
    actor.clock += dt;
    actor.nextMeow -= dt;
    if (actor.meow && actor.nextMeow <= 0) {
      actor.nextMeow = 15 + Math.random() * 25;
      // Pan the meow towards where the cat is.
      const pan = (actor.x / game.room.size[0]) * 1.2 - 0.6;
      game.sound
        .play(actor.meow, game.sound.effects)
        ?.then?.((voice) => voice && (voice.pan.pan.value = pan));
    }
    if (actor.rest > 0) {
      actor.rest -= dt;
      if (actor.animation === "idle") {
        const idle = actor.character.animations.idle;
        if (actor.clock >= idle.frames / idle.fps) {
          actor.animation = "sit";
          actor.clock = 0;
        }
      } else if (actor.clock >= 2) {
        actor.animation = "idle";
        actor.clock = 0;
      } else actor.animation = "sit";
      continue;
    }
    if (!actor.route.length) {
      if (actor.waypoint === actor.path.length - 1) actor.direction = -1;
      if (actor.waypoint === 0) actor.direction = 1;
      actor.waypoint += actor.direction;
      actor.route = findPath(
        game.room.walkable,
        [actor.x, actor.y],
        actor.path[actor.waypoint],
        game.room.size,
      );
    }
    let remaining = dt;
    while (actor.route.length && remaining > 0) {
      const next = actor.route[0],
        dx = next[0] - actor.x,
        dy = next[1] - actor.y;
      const distance = Math.hypot(dx, dy),
        scale = depth(game, actor);
      const speed = actor.speed * scale,
        travel = Math.min(distance, speed * remaining);
      if (distance) {
        if (dx) actor.mirror = dx < 0;
        actor.animation = "walk-side";
        actor.walkPhase +=
          travel / (actor.character.animations["walk-side"].stride * scale);
        actor.x += (dx / distance) * travel;
        actor.y += (dy / distance) * travel;
      }
      remaining -= travel / speed;
      if (travel === distance) actor.route.shift();
    }
    if (!actor.route.length) {
      actor.animation = "sit";
      actor.clock = 0;
      actor.rest = actor.sit[0] + Math.random() * (actor.sit[1] - actor.sit[0]);
    }
  }
}

export function actorRect(game, actor) {
  const scale = depth(game, actor),
    sheet = actor.character;
  return [
    Math.round(
      actor.x -
        (actor.mirror ? sheet.frame[0] - sheet.anchor[0] : sheet.anchor[0]) *
          scale,
    ),
    Math.round(actor.y - sheet.anchor[1] * scale),
    Math.round(sheet.frame[0] * scale),
    Math.round(sheet.frame[1] * scale),
  ];
}

export function petHearts(game, actor, reduced = false) {
  if (!actor.petting) return [];
  const scale = depth(game, actor);
  return [0, 1, 2].map((i) => {
    const phase = reduced ? 0.4 : ((3 - actor.petting + i * 0.55) % 1.6) / 1.6;
    return [
      Math.round(actor.x + (i - 1) * 9 * scale),
      Math.round(
        actor.y - (actor.character.anchor[1] + 3 + phase * 16) * scale,
      ),
      1 - phase,
    ];
  });
}
