// Run with playwright-cli against the standalone dev server.
async (page) => {
  const origin = new URL(page.url()).origin;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const reduced of ["no-preference", "reduce"]) {
    await page.emulateMedia({ reducedMotion: reduced });
    for (const width of [375, 640, 1280]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(`${origin}/dev/?data=real`);
      await page.waitForFunction(() => !!window.game);
      await page
        .getByRole("button", { name: "Start in window", exact: true })
        .click();
      await page.waitForFunction(() => window.game.state?.intro === 0);
      if (await page.evaluate(() => window.game.state.position !== null))
        throw new Error("Intro must hide the visitor");
      await page.screenshot({
        path: `.playwright-cli/intro-${width}-${reduced}.png`,
      });
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw new Error("Intro overflows the viewport");
      await page.keyboard.press("m");
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        () =>
          window.game.state?.room === "stone-house" &&
          window.game.state.intro === null,
      );
      if (!(await page.evaluate(() => !!window.game.state.position)))
        throw new Error("Skip must restore the visitor");
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return "Intro layouts and reduced motion passed at 375, 640 and 1280 pixels.";
};
