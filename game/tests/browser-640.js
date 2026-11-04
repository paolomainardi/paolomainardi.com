// Check Browser checks for 640 behavior against the engine and shipped fixtures.
async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${new URL(page.url()).origin}/dev/?data=real`);
  await page.waitForFunction(() => !!window.game);
  await page
    .getByRole("button", { name: "Start in window", exact: true })
    .click();
  await page.waitForFunction(() => !!window.game.state);
  if (await page.evaluate(() => window.game.state.intro !== null)) {
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () =>
        window.game.state.intro === null && window.game.state.room !== "map",
    );
  }
  const metrics = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const box = canvas.getBoundingClientRect();
    return {
      width: canvas.width,
      height: canvas.height,
      x: box.x,
      y: box.y,
      cssWidth: box.width,
      cssHeight: box.height,
    };
  });
  if (
    JSON.stringify(metrics) !==
    JSON.stringify({
      width: 1920,
      height: 1080,
      x: 0,
      y: 0,
      cssWidth: 1920,
      cssHeight: 1080,
    })
  )
    throw new Error(
      `Expected a full-screen 3× frame: ${JSON.stringify(metrics)}`,
    );
  await page.waitForFunction(
    () => !document.querySelector(".adventure-live").textContent,
  );
  const start = await page.evaluate(() => window.game.state.position);
  const target = [start[0] + 60, start[1]];
  await page.mouse.click(target[0] * 3, target[1] * 3);
  await page.waitForFunction(() => window.game.state.walking);
  await page.waitForFunction(() => !window.game.state.walking);
  const position = await page.evaluate(() => window.game.state.position);
  if (Math.hypot(position[0] - target[0], position[1] - target[1]) > 0.5)
    throw new Error("Character did not reach the floor target");
  await page.mouse.click(10 * 3, 346 * 3);
  if (await page.evaluate(() => window.game.state.verb !== "Look at"))
    throw new Error("Verb panel hit area failed");
  const windowPoint = await page.evaluate(async () => {
    const image = await createImageBitmap(
      await (await fetch("/dev/real/rooms/stone-house/objects.png")).blob(),
    );
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i] === 0 && pixels[i + 1] === 255 && pixels[i + 2] === 255)
        return [
          ((i / 4) % image.width) + 0.5,
          Math.floor(i / 4 / image.width) + 0.5,
        ];
    throw new Error("Missing window hotspot");
  });
  await page.mouse.move(windowPoint[0] * 3, windowPoint[1] * 3);
  await page.screenshot({ path: "dev/shot-640.png" });
  const glError = await page.evaluate(() =>
    document.querySelector("canvas").getContext("webgl2").getError(),
  );
  if (glError || errors.length)
    throw new Error(JSON.stringify({ glError, errors }));
  return { passed: true, metrics, position, screenshot: "dev/shot-640.png" };
};
