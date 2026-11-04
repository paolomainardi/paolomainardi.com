// Check Browser checks for smoke behavior against the engine and shipped fixtures.
async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.location().url.includes("/voices/")
    )
      errors.push(message.text());
  });
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/dev/`);
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
  const canvas = page.locator("canvas");
  async function click(x, y) {
    await page.waitForFunction(
      () => !document.querySelector(".adventure-live").textContent,
    );
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
  // Panel hit areas use native game pixels.
  await click(130, 346); // Use
  await click(353, 187);
  await settle();
  await page.waitForFunction(
    () => window.game.state.lamps.find((l) => l.id === "oil").level < 0.01,
  );
  await click(70, 346); // Open
  await click(469, 140);
  await settle();
  await page.waitForFunction(() => window.game.state.book === "workstation");
  await click(100, 102);
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
    const link = reader.querySelector("a").getBoundingClientRect();
    return {
      fills:
        Math.abs(frame.top - box.top - reader.clientTop) < 1 &&
        Math.abs(frame.height + link.height - reader.clientHeight) < 1,
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
  if ((await page.evaluate(() => window.game.state.book)) !== "workstation")
    throw new Error("Reader Escape must preserve the book");
  await page.keyboard.press("Escape");
  await click(10, 346); // Look at
  await click(180, 120);
  await settle();
  const description = await page.locator(".adventure-live").textContent();
  if (description !== "The sea, calm tonight.")
    throw new Error("Content-bound hotspot description failed");
  await click(533, 307);
  await settle();
  await click(70, 346); // Open
  await page.context().route("https://www.kernel.org/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Sample external link</title>",
    }),
  );
  await page.evaluate(() => {
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      window.hotspotOpen = {
        args: [this.href, this.target, this.rel],
        activation: navigator.userActivation.isActive,
        walking: window.game.state.walking,
      };
      return click.call(this);
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
        "noopener noreferrer",
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
  await page.goto(`${origin}/dev/#stone-house/book/workstation/2`);
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
  await page.waitForFunction(
    () =>
      window.game.state.book === "workstation" &&
      window.game.state.spread === 2,
  );
  await page.keyboard.press("Escape");
  if (errors.length) throw new Error(errors.join("\n"));
  return { passed: true, views, errors };
};
