# Adventure

The adventure at `/play/` is another way to browse this site. The visitor walks through a coastal study, harbour and lighthouse, opens topic books for posts, reads links on a notice board and finds the about page and talks as papers. The map connects the places.

The engine is independent of Hugo. [Its README](../game/README.md) explains running, rendering and interaction; [its contract](../game/CONTRACT.md) defines the data. [Adding a room](../game/docs/adding-a-room.md) covers new artwork and bindings.

## How Hugo serves it

`src/content/play/_index.md` enables HTML and JSON outputs and excludes the page from normal lists and the sitemap. The play template emits a standalone document with no site navigation or ordinary site script bundle. The page is marked `noindex, nofollow`.

| Source                                     | Published result                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `game/src/`, mounted as `assets/game`      | Hugo bundles `main.js` as `/play/game/main.js` and publishes its stylesheet and reader border beside it. |
| `game/dev/real/`, mounted as static assets | Artwork and data, including `world.json`, under `/play/data/`.                                           |
| Theme `layouts/play/list.json`             | `/play/content.json`.                                                                                    |
| Theme reader templates                     | Script-free reader pages for posts, about and talks.                                                     |

The mounts live in `src/hugo.toml`. The game resolves its stylesheet relative to its module URL, which is why the template publishes CSS and its border image beside the bundle. The engine mounts its title immediately and loads world data and artwork after Start.

## Content feed

`layouts/play/list.json` serializes content with Hugo's JSON encoder. It includes published, non-draft posts and links, excluding future and expired entries even when the development server builds them. Post records carry id, title, description, date, tags, canonical page URL, reader URL, optional series/part and optional cover metadata. Link records carry the external URL and plain-text note. The engine does not load cover metadata.

The same template appends the about and talks pages when those pages expose a reader output. The lighthouse's letter and logbook filters select those types. Topic books select posts by series or tags; the board selects links and orders them newest first. Adding matching content updates the feed without new room drawings.

The feed contains data, not game instructions. World bindings choose where content appears. Runtime text uses canvas text or DOM `textContent`, and destination URLs are checked before loading.

## Reader pages

Posts get a `reader` output through the Hugo cascade. The about and talks pages declare their reader output in front matter. Theme templates `posts/single.reader.html`, `single.reader.html` and `talks.reader.html` render article content with the site's styles, canonical URL and `noindex, follow`, without navigation or scripts. Post covers are still images.

The game opens these same-origin pages in a sandboxed iframe at normal browser resolution. `firebase.json` lets only the site itself frame `reader.html`; every other page refuses framing. The reader lowers sound and freezes movement; Close or Escape restores the underlying room or book. A separate website link opens the canonical page. The normal article URL remains canonical.

## Sound and voices

The visitor speaks. Each place has a line for the first visit, and Look at gives most objects their own line. The engine's short replies, such as "I can't do that.", are voiced too.

- **Text** lives in `world.json` under `voices`, keyed by id. Rooms and hotspots point at those ids. The text is also the subtitle.
- **Recordings** are `game/dev/real/voices/<id>.mp3`, one per id. They load on first use. A missing file leaves the line as text only, so a new line can ship before its recording.
- **Subtitles** are drawn in the book font above the character, in a warm colour with a dark outline. Close-ups show them in the footer.
- **Placement:** ambience tied to an object, such as the sea at a window or a lamp's flame, is binaural. On headphones it comes from the left or right of the visitor and turns as they walk.
- **Mixing:** voices have their own `mix.voice` level. Ambience and effects dip while a line plays, and mute silences everything.

The recordings were generated with ElevenLabs (`eleven_v4`, voice "Will", 44.1 kHz 128 kbps MP3). To change a line, edit its text in `world.json`, record the new take under the same id, and replace the file. The [engine README](../game/README.md) has the full behaviour.

## Intro

Start plays a short intro before the first room, like the opening of Monkey Island 2. Five living scenes (the island map, the harbour, the agents' workshop, the fishermen and the lighthouse) carry fading credits and the title, over a theme generated with ElevenLabs Music. On headphones the theme is binaural: the browser places it on two virtual speakers in front of the listener. A click, Escape or Enter skips it, and R replays it. The shots live in `world.json` under `intro`.

## Pocket map

A folded island map is always in the inventory. Open, Use or a click on it goes to the island map from any room or close-up. It is declared in `world.json` under `pocket`, is never stored and survives Forget.

## Site world

Hugo mounts `game/dev/real/` directly under `/play/data/`, including its world file. Book filters default to posts in the engine, so the site needs no generated world or second mount. Paths stay relative to the published world.

The site world keeps game navigation separate from content production. Books have site destinations such as `/tags/linux/`; the board links to `/links/`; found papers link to `/about/` and `/talks/`. Visitors can open those normal pages from close-up footers.

## Checks

Run the engine suites and browser checks from `game/`, following its README. Build Hugo to check the module mounts, bundled engine, content feed and reader templates together. Browser checks must cover `/play/` as well as the standalone demo when site integration changes.

Only inventory persists, in browser key `adventure.inventory`. It contains current book and notice ids, validated on Start. The in-game Forget control removes it. Room position, time overrides, lamp switches and mute do not persist.

## Removing the adventure

The adventure is an experiment, kept apart from the site so it can be dropped
in one change. Removing everything below gives a site that builds byte for byte
like it did before the adventure (checked by building both and comparing every
file).

**Delete:**

- `game/`
- `src/content/play/`
- `src/themes/large-print/layouts/play/`
- `src/themes/large-print/layouts/posts/single.reader.html`
- `src/themes/large-print/layouts/single.reader.html`
- `src/themes/large-print/layouts/talks.reader.html`
- `docs/adventure.md`

**Edit `src/hugo.toml`:**

- remove the `[[module.mounts]]` block under `[module]` (the default mounts
  are restated there only because the game adds its own);
- remove `[outputFormats.reader]` and `[outputFormats.adventure]`;
- set the posts cascade back to `outputs = ["html", "markdown"]`.

**Edit the pages and notes:**

- `src/content/about.md` and `src/content/talks.md`: remove the
  `outputs = ["html", "reader"]` line and its comment;
- `AGENTS.md`: remove the adventure from the browser storage exceptions;
- `DESIGN.md`: remove the **Adventure** paragraph;
- `.gitignore`: remove the `src/assets/jsconfig.json` line;
- `firebase.json`: drop the `reader.html` and `/` header rules and move the
  two framing headers back into the `**` rule.

`layouts/_partials/book/talks-list.html` can stay: the talks page uses it.

Then build and check that `/play/` and every `reader.html` are gone.
