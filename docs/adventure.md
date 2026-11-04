# Adventure

The adventure at `/play/` is another way to browse this site. The visitor walks through a coastal study, harbour and lighthouse, opens topic books for posts, reads links on a notice board and finds the about page and talks as papers. The map connects the places.

The engine is independent of Hugo. [Its README](../game/README.md) explains running, rendering and interaction; [its contract](../game/CONTRACT.md) defines the data. [Adding a room](../game/docs/adding-a-room.md) covers new artwork and bindings.

## How Hugo serves it

`src/content/play/_index.md` enables HTML and JSON outputs and excludes the page from normal lists and the sitemap. The play template emits a standalone document with no site navigation or ordinary site script bundle. The page is marked `noindex, nofollow`.

| Source                                     | Published result                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `game/src/`, mounted as `assets/game`      | Hugo bundles `main.js` as `/play/game/main.js` and publishes its stylesheet and reader border beside it. |
| `game/dev/real/`, mounted as static assets | Artwork and data under `/play/data/`, excluding that directory's `world.json`.                           |
| `adventure/world.json`, mounted separately | The site's `/play/data/world.json`.                                                                      |
| Theme `layouts/play/list.json`             | `/play/content.json`.                                                                                    |
| Theme reader templates                     | Script-free reader pages for posts, about and talks.                                                     |

The mounts live in `src/hugo.toml`. The game resolves its stylesheet relative to its module URL, which is why the template publishes CSS and its border image beside the bundle. The engine mounts its title immediately and loads world data and artwork after Start.

## Content feed

`layouts/play/list.json` serializes content with Hugo's JSON encoder. It includes published, non-draft posts and links, excluding future and expired entries even when the development server builds them. Post records carry id, title, description, date, tags, canonical page URL, reader URL, optional series/part and optional cover metadata. Link records carry the external URL and plain-text note. The engine does not load cover metadata.

The same template appends the about and talks pages when those pages expose a reader output. The lighthouse's letter and logbook filters select those types. Topic books select posts by series or tags; the board selects links and orders them newest first. Adding matching content updates the feed without new room drawings.

The feed contains data, not game instructions. World bindings choose where content appears. Runtime text uses canvas text or DOM `textContent`, and destination URLs are checked before loading.

## Reader pages

Posts get a `reader` output through the Hugo cascade. The about and talks pages declare their reader output in front matter. Theme templates `posts/single.reader.html`, `single.reader.html` and `talks.reader.html` render article content with the site's styles, canonical URL and `noindex, follow`, without navigation or scripts. Post covers are still images.

The game opens these same-origin pages in a sandboxed iframe at normal browser resolution. The reader lowers sound and freezes movement; Close or Escape restores the underlying room or book. A separate website link opens the canonical page. The normal article URL remains canonical.

## Site world

`game/tools/site_world.py` reads `game/dev/real/world.json`, adds `type: "post"` to book filters that omit a type and writes `adventure/world.json`. An explicit type remains unchanged. Paths stay relative to the published world, so they continue to refer to `/play/data/` artwork.

Run from the repository root after changing real-world bindings:

```sh
python3 game/tools/site_world.py adventure/world.json
```

The target file must exist in the mounted site tree before building Hugo. The tool accepts another output path; this is useful when checking generated data without updating the site copy.

The site world keeps game navigation separate from content production. Books have site destinations such as `/tags/linux/`; the board links to `/links/`; found papers link to `/about/` and `/talks/`. Visitors can open those normal pages from close-up footers.

## Checks

Run the engine suites and browser checks from `game/`, following its README. Build Hugo to check the module mounts, bundled engine, content feed and reader templates together. Browser checks must cover `/play/` as well as the standalone demo when site integration changes.

Only inventory persists, in browser key `adventure.inventory`. It contains current book and notice ids, validated on Start. The in-game Forget control removes it. Room position, time overrides, lamp switches and mute do not persist.

## Removing the adventure

_To be filled in separately._
