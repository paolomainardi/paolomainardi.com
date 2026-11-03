async (page) => {
  const origin = new URL(page.url()).origin;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [375, 640, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto(`${origin}/dev/?data=real#harbour/board/links/0`);
    await page.waitForFunction(() => !!window.game);
    await page
      .getByRole("button", { name: "Start in window", exact: true })
      .click();
    for (const [hash, path, closeup] of [
      ["#harbour/board/links/0", "/links/", true],
      [
        "#stone-house/book/workstation/0",
        "/posts/manage-dotfiles-with-yadm/#series",
        true,
      ],
      ["#lighthouse/found-about", "/about/", false],
      ["#lighthouse/found-talk", "/talks/", false],
    ]) {
      await page.evaluate((hash) => {
        location.hash = hash;
      }, hash);
      await page.waitForFunction((hash) => {
        const state = window.game.state;
        return hash.includes("/board/")
          ? state.board === "links"
          : hash.includes("/book/")
            ? state.book === "workstation"
            : state.reader === hash.split("/").at(-1);
      }, hash);
      const point = await page.evaluate(
        async ({ path, closeup }) => {
          const { siteLayout } = await import("../src/panel.js");
          const rect = siteLayout({
            room: { size: [640, 360] },
            ...(closeup
              ? { activeBook: { site: path } }
              : { readerItem: {}, readerSite: path }),
          });
          const canvas = document.querySelector("canvas"),
            box = canvas.getBoundingClientRect();
          const x = box.x + ((rect.x + 2) * box.width) / 640;
          const y = box.y + ((rect.y + 2) * box.height) / 360;
          if (document.elementFromPoint(x, y) !== canvas)
            throw new Error("Site path is covered");
          return { x, y };
        },
        { path, closeup },
      );
      await page.mouse.move(point.x, point.y);
      if (
        (await page
          .locator("canvas")
          .evaluate((canvas) => canvas.style.cursor)) !== "pointer"
      )
        throw new Error("Missing site hover");
      const popupPromise = page.waitForEvent("popup");
      await page.mouse.click(point.x, point.y);
      const popup = await popupPromise;
      await popup.waitForLoadState("domcontentloaded");
      if (popup.url() !== origin + path)
        throw new Error("Site path used wrong origin");
      if (await popup.evaluate(() => window.opener !== null))
        throw new Error("Site tab has an opener");
      await popup.close();
    }
    await page.screenshot({ path: `.playwright-cli/site-${width}.png` });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { passed: true };
};
