// Check real WebAudio playback and subtitle rendering at narrow and wide widths.
async (page) => {
  const origin = new URL(page.url()).origin;
  const errors = [],
    requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/voices/")) requests.push(request.url());
  });
  // A WAV response is decoded by content, even under the configured MP3 name.
  const audio = Buffer.alloc(44 + 16000 * 2 * 10);
  audio.write("RIFF", 0);
  audio.writeUInt32LE(audio.length - 8, 4);
  audio.write("WAVEfmt ", 8);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(16000, 24);
  audio.writeUInt32LE(32000, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write("data", 36);
  audio.writeUInt32LE(audio.length - 44, 40);
  await page.route("**/voices/*.mp3", (route) =>
    route.fulfill({ contentType: "audio/wav", body: audio }),
  );
  const canvas = page.locator("canvas"),
    live = page.locator(".adventure-live");
  const click = async (x, y) => {
    const box = await canvas.boundingBox();
    await page.mouse.click(
      box.x + (x * box.width) / 640,
      box.y + (y * box.height) / 360,
    );
  };
  try {
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(`${origin}/dev/?data=real`);
      await page.waitForFunction(() => !!window.game);
      const before = requests.length;
      await page
        .getByRole("button", { name: "Start in window", exact: true })
        .click();
      await page.waitForFunction(() => !!window.game.state);
      await page.waitForFunction(() =>
        document
          .querySelector(".adventure-live")
          .textContent.startsWith("Hello…?"),
      );
      if (requests.length !== before + 1)
        throw new Error("Only entry audio should load at Start");
      await page.keyboard.press("m");
      if (!(await live.textContent()).startsWith("Hello…?"))
        throw new Error("Mute must preserve subtitles");
      await page.screenshot({ path: `.playwright-cli/voices-${width}.png` });
      await click(10, 346);
      if (await live.textContent())
        throw new Error("Click must clear the subtitle");
      if (await page.evaluate(() => window.game.state.verb))
        throw new Error("Skip must not select a verb");
      await click(10, 346);
      if (await page.evaluate(() => window.game.state.verb !== "Look at"))
        throw new Error("Next click must act");
      for (const key of ["t", "t"]) {
        await page.keyboard.press(key);
        await page.waitForFunction(
          () => !!document.querySelector(".adventure-live").textContent,
        );
        await click(5, 5);
      }
      const loaded = requests.length;
      await page.keyboard.press("t");
      await page.waitForFunction(
        () => !!document.querySelector(".adventure-live").textContent,
      );
      await click(5, 5);
      if (requests.length !== loaded)
        throw new Error("Repeated line must use the cache");
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        gl: document.querySelector("canvas").getContext("webgl2").getError(),
      }));
      if (result.overflow || result.gl) throw new Error(JSON.stringify(result));
    }
    if (errors.length) throw new Error(errors.join("\n"));
  } finally {
    await page.unroute("**/voices/*.mp3");
  }
};
