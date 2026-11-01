# Task: real content for the adventure, from Hugo

The site is a Hugo project in `src/` (read `CLAUDE.md` at the repository root). The
game engine lives in `game/` (do not edit anything inside `game/`). Its data format
is `game/CONTRACT.md`. Make Hugo produce everything the game needs and serve the game
at `/play/`. You cannot run Hugo or Docker here; write the templates carefully, and
I will build and test.

1. **Reader page for every post.** A new output format `reader` (HTML, base name
   `reader`), added to the posts cascade next to `html` and `markdown`. Template
   `src/themes/large-print/layouts/posts/single.reader.html`: a complete HTML page
   with the site's stylesheet, the post's title, its meta line and its content only,
   no header, no menu, no footer, no scripts. Links open in a new tab
   (`<base target="_blank">`). It must not be listed in the sitemap.
2. **content.json.** A section `src/content/play/_index.md` (title "Adventure",
   excluded from the sitemap and lists, `noindex`), with outputs `html` and `json`.
   Template `layouts/play/list.json` writes `content.json` per the contract: every
   published post (type `post`: id = slug, title, description, date, tags, series,
   part, url, reader = the reader output's relative permalink, cover when present)
   and every link entry (type `link`: id, title, description = the note as plain
   text, date, tags, link).
3. **The game page.** Template `layouts/play/list.html`: a full-viewport dark page
   with no site chrome, which bundles `game/src/main.js` with Hugo's `js.Build` (mount
   `../game/src` into `assets/game` in `src/hugo.toml`; when adding project mounts,
   restate the default ones so nothing else breaks) and calls
   `boot({ world: "/play/data/world.json", content: "<content.json relative URL>",
   element })`. Mount `../game/dev/real` as `static/play/data` for this spike.
4. **world.json for the site.** Do not touch `game/`. Write the site's world as
   `adventure/world.json` at the repository root, and mount it to
   `static/play/data/world.json` after the `dev/real` mount so it wins. It is the dev
   world (`game/dev/real/world.json`) with the stone house's content filter set to
   `{ "tags": ["linux"] }` and
   `"hotspots": { "window": { "content": { "type": "link" } } }`. Paths inside it stay
   relative to `/play/data/`.
5. Nothing else on the site changes: no menu entry, no link to `/play/` yet.

Finish with a summary listing every file you added or changed.
