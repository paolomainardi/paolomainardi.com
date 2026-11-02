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
      box.x + (x * box.width) / 640,
      box.y + (y * box.height) / 360,
    );
  }
  async function settle() {
    await page.waitForFunction(() => !window.game.state.walking);
  }
  await click(280, 300);
  await settle();
  const walked = await page.evaluate(() => window.game.state.position);
  if (Math.hypot(walked[0] - 280, walked[1] - 300) > 0.5)
    throw new Error("Walking failed");
  // Font pixels remain native; verb padding follows the frame scale.
  await click(170, 340); // Use
  await click(353, 187);
  await settle();
  await page.waitForFunction(
    () => window.game.state.lamps.find((l) => l.id === "oil").level < 0.01,
  );
  await click(135, 340); // Open
  await click(469, 140);
  await settle();
  await page.waitForFunction(
    () => window.game.state.reader === "workstation-1",
  );
  await page
    .frameLocator("iframe")
    .getByRole("heading", { name: "A room of one's own", exact: true })
    .waitFor();
  const readerLayout = await page.evaluate(() => {
    const reader = document.querySelector(".adventure-reader");
    const frame = reader.querySelector("iframe").getBoundingClientRect();
    const close = reader.querySelector("button").getBoundingClientRect();
    const box = reader.getBoundingClientRect();
    return {
      fills:
        Math.abs(frame.top - box.top - reader.clientTop) < 1 &&
        Math.abs(frame.height - reader.clientHeight) < 1,
      overlay:
        close.top >= frame.top &&
        close.bottom <= frame.bottom &&
        close.right <= frame.right &&
        frame.right - close.right <= 8,
    };
  });
  if (!readerLayout.fills || !readerLayout.overlay)
    throw new Error(
      "Reader iframe must fill the frame beneath the close overlay",
    );
  await page.frameLocator("iframe").locator("body").click();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.game.state.reader === null);
  await click(85, 340); // Look at
  await click(180, 120);
  await settle();
  const description = await page.locator(".adventure-live").textContent();
  if (
    !description.includes("The Linux kernel") ||
    !description.replace(/\s+/g, " ").includes("Follow kernel releases")
  )
    throw new Error("Content-bound hotspot description failed");
  await click(533, 307);
  await settle();
  await click(135, 340); // Open
  await page.context().route("https://www.kernel.org/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Sample external link</title>",
    }),
  );
  await page.evaluate(() => {
    const open = window.open;
    window.open = function (...args) {
      window.hotspotOpen = {
        args,
        activation: navigator.userActivation.isActive,
        walking: window.game.state.walking,
      };
      return open.apply(window, args);
    };
  });
  const popupPromise = page.waitForEvent("popup");
  await click(180, 120);
  const popup = await popupPromise;
  await popup.waitForLoadState();
  const opened = await page.evaluate(() => window.hotspotOpen);
  if (
    JSON.stringify(opened.args) !==
      JSON.stringify([
        "https://www.kernel.org/",
        "_blank",
        "noopener,noreferrer",
      ]) ||
    !opened.activation ||
    opened.walking
  )
    throw new Error(
      "External tab must open directly from the click before walking",
    );
  if (await popup.evaluate(() => window.opener !== null))
    throw new Error("External tab must have no opener");
  await popup.close();
  await settle();
  if (
    (await page.locator(".adventure-live").textContent()) !==
    "Let's see what's out there."
  )
    throw new Error("Hotspot arrival dialogue failed");
  if ((await page.evaluate(() => window.game.state.reader)) !== null)
    throw new Error("Hotspots must not open the article reader");
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
          scale: canvas.width / 640,
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
  await page.getByRole("button", { name: "Close", exact: true }).click();
  if (errors.length) throw new Error(errors.join("\n"));
  return { passed: true, views, errors };
};
