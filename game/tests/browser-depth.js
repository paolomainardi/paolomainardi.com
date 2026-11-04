async (page) => {
  return page.evaluate(async () => {
    const { Renderer } = await import("/src/renderer.js");
    const { loadRoom } = await import("/src/assets.js");
    const worldURL = new URL("/dev/real/world.json", location.href).href;
    const world = await (await fetch(worldURL)).json();
    const renderer = new Renderer(document.createElement("canvas"));
    const gl = renderer.gl;
    const white = renderer.texture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    const checks = [];
    try {
      for (const [id, items] of [["harbour", ["cargo", "quay-posts"]], ["stone-house", ["chair"]]]) {
        const room = await loadRoom(world, worldURL, id, renderer);
        renderer.setRoom(room);
        const [width, height] = room.size;
        room.lights.forEach((lamp) => { lamp.strength = 0; });
        for (const name of items) {
          const index = room.items.findIndex((item) => item.id === name);
          const item = room.items[index];
          const pixel = room.ids.findIndex((value) => value === index);
          const x = pixel % width, y = Math.floor(pixel / width);
          const game = {
            room, time: "night", elapsed: 0,
            actor: { y: 0 }, character: { glowTexture: white },
            lanternRadius: 30, lanternPosition: () => [x + 0.5, y + 0.5],
            lanternStrength: () => 1,
          };
          const read = () => {
            const out = new Uint8Array(4);
            gl.readPixels(x, height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
            return Array.from(out.slice(0, 3));
          };
          const reset = () => {
            renderer.into(renderer.scene);
            gl.disable(gl.BLEND);
            gl.clearColor(1, 0, 1, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
          };
          for (const feet of [item.baseline - 1, item.baseline, item.baseline + 1]) {
            game.actor.y = feet;
            const behind = feet < item.baseline;
            reset();
            renderer.use(renderer.programs.room);
            renderer.lighting(game);
            renderer.integer("uFront", 1);
            renderer.draw();
            const sentinel = read().join() === "255,0,255";
            if (sentinel === behind) throw new Error(`${id}/${name}: foreground at feet ${feet}`);
            reset();
            renderer.sprite(white, [1, 1], [0, 0, width, height], undefined, undefined, false, 0, { game, emission: true });
            if ((read().join() === "255,0,255") !== behind)
              throw new Error(`${id}/${name}: flame at feet ${feet}`);
            reset();
            renderer.use(renderer.programs.glow);
            renderer.lighting(game);
            renderer.draw();
            if ((read()[0] === 0) !== behind)
              throw new Error(`${id}/${name}: lantern glow at feet ${feet}`);
            checks.push(`${id}/${name}/${feet}`);
          }
        }
      }
      if (gl.getError()) throw new Error("WebGL depth error");
      return { passed: true, checks };
    } finally {
      gl.deleteTexture(white);
      renderer.destroy();
    }
  });
};
