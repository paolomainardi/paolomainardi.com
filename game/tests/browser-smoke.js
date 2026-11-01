async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/dev/`);
  await page.waitForFunction(() => !!window.game);
  await page
    .getByRole("button", { name: "Start in window", exact: true })
    .click();
  const canvas = page.locator("canvas");
  async function click(x, y) {
    const box = await canvas.boundingBox();
    await page.mouse.click(
      box.x + (x * box.width) / 480,
      box.y + (y * box.height) / 270,
    );
  }
  async function settle() {
    await page.waitForFunction(() => !window.game.state.walking);
  }
  await click(210, 225);
  await settle();
  const walked = await page.evaluate(() => window.game.state.position);
  if (Math.hypot(walked[0] - 210, walked[1] - 225) > 0.5)
    throw new Error("Walking failed");
  // The default verbs use the 2x bitmap font at this frame size.
  await click(300, 255); // Use
  await click(265, 140);
  await settle();
  await page.waitForFunction(
    () => window.game.state.lamps.find((l) => l.id === "oil").level < 0.01,
  );
  await click(230, 255); // Open
  await click(352, 105);
  await settle();
  await page.waitForFunction(
    () => window.game.state.reader === "workstation-1",
  );
  await page
    .frameLocator("iframe")
    .getByRole("heading", { name: "A room of one's own", exact: true })
    .waitFor();
  await page.frameLocator("iframe").locator("body").click();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.game.state.reader === null);
  const initial = await page.evaluate(() => window.game.state.time);
  await page.keyboard.press("t");
  if ((await page.evaluate(() => window.game.state.time)) === initial)
    throw new Error("Time toggle failed");
  await page.keyboard.press("l");
  const views = [];
  for (const [width, height] of [
    [375, 667],
    [640, 480],
    [1280, 720],
    [1700, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    for (const state of ["dusk", "night"]) {
      if ((await page.evaluate(() => window.game.state.time)) !== state)
        await page.keyboard.press("t");
      await page.screenshot({
        path: `.playwright-cli/game-${width}-${state}.png`,
      });
      const metrics = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          scale: canvas.width / 480,
          error: canvas.getContext("webgl2").getError(),
        };
      });
      if (metrics.overflow || !Number.isInteger(metrics.scale) || metrics.error)
        throw new Error(JSON.stringify(metrics));
      views.push({ width, height, state, ...metrics });
    }
  }
  await page.goto(`${origin}/dev/#stone-house/workstation-6`);
  await page.waitForFunction(() => !!window.game);
  await page
    .getByRole("button", { name: "Start in window", exact: true })
    .click();
  await page.waitForFunction(
    () => window.game.state.reader === "workstation-6",
  );
  await page.getByRole("button", { name: "Close [Esc]", exact: true }).click();
  if (errors.length) throw new Error(errors.join("\n"));
  return { passed: true, views, errors };
};
