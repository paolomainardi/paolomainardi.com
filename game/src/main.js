// Mount the title screen and reader, then start and dispose the game session.
/** Boot an isolated game in a supplied container. URLs resolve against the document. */
export async function boot({ world, content, element }) {
  if (!(element instanceof HTMLElement))
    throw new Error("boot requires a container element.");
  const worldURL = new URL(world, document.baseURI).href,
    contentURL = new URL(content, document.baseURI).href;
  if (
    ![worldURL, contentURL].every((url) =>
      ["http:", "https:"].includes(new URL(url).protocol),
    )
  )
    throw new Error("Assets and readers require HTTP(S) URLs.");
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = new URL("./style.css", import.meta.url).href;
  document.head.append(style);
  const root = document.createElement("section");
  root.className = "adventure";
  root.tabIndex = 0;
  root.setAttribute("aria-label", "Point and click adventure");
  const canvas = document.createElement("canvas");
  canvas.setAttribute(
    "aria-label",
    "Adventure scene. Click floor to walk. Double click floor or objects to run. Select a verb, then an object. T changes time. L toggles lantern. G toggles bloom. M toggles sound.",
  );
  const cover = document.createElement("div");
  cover.className = "adventure-start";
  const heading = document.createElement("h1");
  heading.textContent = "The engineer’s study";
  const help = document.createElement("p");
  help.textContent =
    "Click to walk. Double click to run. Choose a verb, then an object. T: dusk / night. L: lantern. G: bloom. M: sound.";
  const start = document.createElement("button");
  start.textContent = "Start";
  const windowed = document.createElement("button");
  windowed.textContent = "Start in window";
  cover.append(heading, help, start, windowed);
  root.append(canvas, cover);
  element.append(root);
  const reader = document.createElement("div");
  reader.className = "adventure-reader";
  reader.hidden = true;
  reader.setAttribute("role", "dialog");
  reader.setAttribute("aria-modal", "true");
  const close = document.createElement("button");
  close.className = "adventure-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Close");
  const iframe = document.createElement("iframe");
  iframe.title = "Article reader";
  // Article links open in a new tab, so the reader may open popups outside its sandbox.
  iframe.setAttribute(
    "sandbox",
    "allow-same-origin allow-popups allow-popups-to-escape-sandbox",
  );
  iframe.referrerPolicy = "no-referrer";
  const website = document.createElement("a");
  website.textContent = "Open on the website";
  website.target = "_blank";
  website.rel = "noopener noreferrer";
  reader.append(close, iframe, website);
  root.append(reader);
  const live = document.createElement("div");
  live.className = "adventure-live";
  live.setAttribute("aria-live", "polite");
  root.append(live);
  const fade = document.createElement("div");
  fade.className = "adventure-fade";
  root.append(fade);
  const lifecycle = { disposed: false };
  const subscriptions = [];
  function on(target, event, handler) {
    target.addEventListener(event, handler);
    subscriptions.push(() => target.removeEventListener(event, handler));
  }
  let ready = null,
    controller = null,
    soundContext = null;
  // Capture browser activation before asset requests yield to the event loop.
  function startGame(fullscreen) {
    if (ready || lifecycle.disposed) return;
    start.disabled = windowed.disabled = true;
    start.textContent = "Loading…";
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (Context) {
      soundContext = new Context();
      soundContext.resume()?.catch(() => {});
    }
    if (fullscreen && root.requestFullscreen)
      root.requestFullscreen().catch(() => {});
    ready = import("./session.js")
      .then(({ startSession }) => {
        if (lifecycle.disposed) return null;
        const context = soundContext;
        soundContext = null;
        return startSession({
          worldURL,
          contentURL,
          ui: {
            root,
            canvas,
            cover,
            heading,
            reader,
            close,
            iframe,
            website,
            live,
            fade,
          },
          soundContext: context,
          subscriptions,
          on,
          lifecycle,
        });
      })
      .then((value) => {
        controller = value;
        if (lifecycle.disposed) controller?.destroy();
      });
    ready.catch((error) => {
      if (lifecycle.disposed) return;
      soundContext?.close()?.catch(() => {});
      soundContext = null;
      cover.hidden = false;
      start.hidden = windowed.hidden = true;
      heading.textContent = "The study could not open";
      help.textContent = error.message;
    });
  }
  on(start, "click", () => startGame(true));
  on(windowed, "click", () => startGame(false));
  return {
    get ready() {
      return ready;
    },
    get state() {
      return controller?.state || null;
    },
    destroy() {
      lifecycle.disposed = true;
      if (controller) controller.destroy();
      else {
        subscriptions.splice(0).forEach((remove) => remove());
        soundContext?.close()?.catch(() => {});
        soundContext = null;
        root.remove();
      }
      style.remove();
    },
  };
}
