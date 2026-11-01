async (page) => {
  return page.evaluate(async () => {
    const { Renderer } = await import("/src/renderer.js");
    const renderer = new Renderer(document.createElement("canvas"));
    const gl = renderer.gl;
    const pixels = (rgb) =>
      new Uint8Array(Array.from({ length: 16 }, () => [...rgb, 255]).flat());
    const bitmap = async (rgb) =>
      createImageBitmap(
        new ImageData(new Uint8ClampedArray(pixels(rgb)), 4, 4),
      );
    const unlit = [64, 64, 64],
      red = [180, 64, 64],
      blue = [64, 64, 160],
      albedo = [160, 140, 120];
    const room = {
      size: [4, 4],
      albedo: await bitmap(albedo),
      states: {
        night: {
          unlit: await bitmap(unlit),
          lightPixels: { red: pixels(red), blue: pixels(blue) },
        },
      },
      lights: ["red", "blue"].map((id) => ({
        id,
        position: [0, 0],
        strength: 0,
        tint: "#ffd08a",
        drift: [0, 0],
      })),
      items: [{ id: "red" }, { id: "blue" }],
      ids: new Int16Array(16).fill(0),
      foreground: new Uint8Array(64),
    };
    renderer.setRoom(room);
    let hand = 0;
    const game = {
      room,
      time: "night",
      lanternRadius: 90,
      lanternPosition: () => [1.5, 2.5],
      lanternStrength: () => hand,
    };
    const linear = (v) =>
      v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4;
    const srgb = (v) =>
      Math.round(
        255 *
          (v <= 0.0031308
            ? v * 12.92
            : 1.055 * Math.min(1, v) ** (1 / 2.4) - 0.055),
      );
    function read() {
      const out = new Uint8Array(4);
      gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
      return Array.from(out.slice(0, 3));
    }
    function close(actual, expected, label) {
      if (actual.some((v, i) => Math.abs(v - expected[i]) > 1))
        throw new Error(`${label}: ${actual} != ${expected}`);
    }
    for (const [a, b, lantern] of [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [0.5, 0.25, 0],
      [0, 0, 0.9],
    ]) {
      room.lights[0].strength = a;
      room.lights[1].strength = b;
      hand = lantern;
      renderer.lights(game);
      renderer.into(renderer.scene);
      renderer.use(renderer.programs.room);
      renderer.lighting(game);
      renderer.integer("uFront", 0);
      renderer.draw();
      const expected = unlit.map((v, i) =>
        srgb(
          linear(v) +
            a * (linear(red[i]) - linear(v)) +
            b * (linear(blue[i]) - linear(v)) +
            linear(albedo[i]) * [1, 0.7, 0.32][i] * hand,
        ),
      );
      close(read(), expected, `Room ${a}/${b}/${lantern}`);
    }
    const sprite = renderer.texture(pixels([160, 140, 120]), 4, 4);
    game.character = {
      glowTexture: renderer.texture(pixels([255, 255, 255]), 4, 4),
    };
    for (const strength of [0, 0.9]) {
      hand = strength;
      renderer.sprite(
        sprite,
        [4, 4],
        [0, 0, 4, 4],
        undefined,
        undefined,
        false,
        0,
        { game },
      );
      if (!strength) close(read(), [40, 35, 30], "Extinguished glass");
      else if (read()[0] < 250 || read()[1] < 240)
        throw new Error("Flame did not brighten");
      renderer.sprite(
        sprite,
        [4, 4],
        [0, 0, 4, 4],
        undefined,
        undefined,
        false,
        0,
        { game, emission: true },
      );
      close(
        read(),
        [255, 178.5, 81.6].map((v) => Math.round(v * hand)),
        "Flame bloom source",
      );
    }
    if (gl.getError()) throw new Error("WebGL lighting error");
    renderer.destroy();
    return {
      passed: true,
      checks:
        "Linear room sum, independent switches, fractional fade, albedo lantern, extinguished glass, flame and bloom",
    };
  });
};
