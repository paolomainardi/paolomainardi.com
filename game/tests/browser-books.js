// Check Browser checks for books behavior against the engine and shipped fixtures.
async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const origin = new URL(page.url()).origin;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${origin}/dev/?data=real`);
  await page.waitForFunction(() => !!window.game);
  await page
    .getByRole("button", { name: "Start in window", exact: true })
    .click();
  await page.waitForFunction(() => !!window.game.state);
  const target = await page.evaluate(async () => {
    const world = await (await fetch("./real/world.json")).json();
    const roomURL = new URL(
      "./real/" + world.rooms["stone-house"].src,
      location.href,
    );
    const room = await (await fetch(roomURL)).json();
    const bitmap = await createImageBitmap(
      await (await fetch(new URL(room.objects, roomURL))).blob(),
    );
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const color = room.items
      .find((i) => i.kind === "slot")
      .color.slice(1)
      .match(/../g)
      .map((c) => parseInt(c, 16));
    let x0 = 640,
      y0 = 360,
      x1 = 0,
      y1 = 0;
    for (let y = 0; y < 360; y++)
      for (let x = 0; x < 640; x++) {
        const i = (y * 640 + x) * 4;
        if (color.every((c, k) => pixels[i + k] === c)) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
    return [(x0 + x1) / 2, (y0 + y1) / 2];
  });
  async function click(x, y) {
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.click(
      box.x + (x * box.width) / 640,
      box.y + (y * box.height) / 360,
    );
  }
  await click(...target);
  await page.waitForFunction(() => window.game.state.book === "workstation");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => window.game.state.spread === 1);
  const position = await page.evaluate(() => window.game.state.position);
  const entry = await page.evaluate(async () => {
    const { layoutBook, bookItems, bookFonts } = await import("../src/book.js");
    const world = await (await fetch("./real/world.json")).json();
    const url = new URL("./real/" + world.book, location.href);
    const book = await (await fetch(url)).json();
    book.fonts = bookFonts(
      book,
      document.createElement("canvas").getContext("2d"),
    );
    const content = await (await fetch("./data/content.json")).json();
    const topic = world.books.workstation;
    return layoutBook(book, {
      ...topic,
      items: bookItems(content.items, topic.content),
    })[2].entries[0];
  });
  await click(entry.x + 1, entry.y + 1);
  await page.waitForFunction(
    (id) => window.game.state.reader === id,
    entry.item.id,
  );
  const link = page.getByRole("link", {
    name: "Open on the website",
    exact: true,
  });
  if ((await link.getAttribute("rel")) !== "noopener noreferrer")
    throw new Error("Missing safe link relation");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  if ((await page.evaluate(() => window.game.state.spread)) !== 1)
    throw new Error("Reader lost spread");
  await page.screenshot({ path: ".playwright-cli/book-real-1920.png" });
  await page.reload();
  await page.waitForFunction(() => !!window.game);
  await page
    .getByRole("button", { name: "Start in window", exact: true })
    .click();
  await page.waitForFunction(() => !!window.game.state);
  await page.waitForFunction(
    () =>
      window.game.state.book === "workstation" &&
      window.game.state.spread === 1,
  );
  await page.keyboard.press("Escape");
  if ((await page.evaluate(() => window.game.state.book)) !== null)
    throw new Error("Book did not close");
  if (errors.length) throw new Error(errors.join("\n"));
  return { errors, position, spreadRestored: true };
};
