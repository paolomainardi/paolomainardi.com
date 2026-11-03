# Task 21: show which part of the site the visitor is looking at

Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask.

## Configuration

Books, boards and content-bound hotspots in `world.json` gain an optional
`"site"` path, and boards an optional `"subtitle"`:

```json
"boards": { "links": { "title": "Links",
  "subtitle": "Things I read and think are worth your time, with a line or two on why.",
  "site": "/links/", ... } },
"books": { "linux": { "site": "/tags/linux/", ... } },
"rooms": { "lighthouse": { "hotspots": { "letter": { "content": { "type": "about" }, "site": "/about/" } } } }
```

Paths resolve against the site the game is served from (the page's origin),
never against `world.json`.

## Behaviour

1. **Board title.** The board close-up draws its `title` in the book's title
   font and its `subtitle` in the body font, faded, centred on the board's top
   rail above the notices (add an optional `"title"` rect to the board
   contract, with a sensible default from the notices' top edge). Wrap the
   subtitle to two lines at most.
2. **Site path in the bar.** While a book, a board or the reader opened from a
   bound hotspot is showing, the bottom bar shows its `site` path in faded
   text, right-aligned before the sound label, without overlapping any other
   text. Hovering it turns it to the accent colour and writes "Open <path> on
   the site" in the sentence line; a click opens it in a new tab
   (`rel="noopener"`). In rooms nothing is shown.
3. The hidden accessible link list gains the same paths as links ("Links on
   the site", and so on).

## Data

In `dev/real/world.json`: `links` board as above; books `workstation`:
`/posts/manage-dotfiles-with-yadm/#series`, `linux`: `/tags/linux/`, `ai`:
`/tags/ai/`, `docker`: `/tags/docker/`, `security`: `/tags/security/`,
`personal`: `/tags/personal/`; lighthouse hotspots `letter`: `/about/`,
`logbook`: `/talks/`. Placeholders get similar values.

Update `CONTRACT.md`, `README.md` and the tests (board title layout, bar path
placement without overlap, hover and click opening a tab, origin-relative
resolution). Run the whole suite.

Finish with a short summary.
