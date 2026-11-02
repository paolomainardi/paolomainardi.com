# Task 11: the book close-up

Each topic is now one book on the study's shelf. Opening it shows the book close
up with the topic's posts listed on its pages. Implement it following
`/home/paolo/webapps/sparkfabrik/agents/site-redesign/game-book-contract.md`.
Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask. The real art and fonts are being made at the same time; build against
placeholders.

## Behaviour

1. **Books on the shelf.** A room with `books` places one book per slot, in
   order, with the book's own sprite. `Look at` says the title and how many
   posts it holds. `Open`, or a plain click on the book, walks to it and opens
   it.
2. **The close-up.** Draw `book.image` instead of the room, through the same
   palette and upscale (no room lights, no character). The first page shows the
   book title in the `title` font and a short count line in `faded`. Then the
   entries, filled page by page: each entry is the post title in `body` and
   `ink`, wrapped to at most two lines (ellipsis after), and its date below in
   `faded`. Pages that do not fit flow to the next spread. Page numbers at the
   bottom of each page in `faded`.
3. **Using it.** The entry under the pointer turns `accent` and the cursor
   becomes a hand. A click opens the entry in the reader; closing the reader
   returns to the same spread. Left and right arrows, or a click on the lower
   corners of the pages, turn the spread with the `turn` animation. `Esc`, a
   click outside the book or a "Close" label in the verb bar returns to the room
   with the character where it was.
4. **Address.** `#<room>/book/<id>/<spread>` opens a book at a spread, and
   reloading restores it.
5. **Accessible list.** The game's DOM keeps a visually hidden list of every
   book and its links (title linking to the post's `url`), so screen readers and
   search engines see the same content.
6. **Reader link.** The reader gets an "Open on the website" link to the item's
   `url`, opening a new tab (`rel="noopener"`).

All text drawing goes through the font atlases from the contract. Keep the
current 5×7 font for the verb bar and the sentence line.

## Data

- `tools/make_placeholders.py`: a placeholder `book/` (flat paper pages on a
  brown desk, a 4 frame turn, two simple fonts in the contract format) and
  `books` in `dev/data/world.json` with enough placeholder content to need three
  spreads in one book.
- `dev/real/world.json`: six books in the shelf's slots, in this order, with
  `objects/book-1.png` to `book-6.png`:
  workstation (`series: workstation`), linux (`tags: linux`),
  ai (`tags: ai`), docker (`tags: docker`), security (`tags: security`),
  personal (`tags: personal`). Keep the window hotspot.
  Point `book` at `book/book.json`; until the real art lands, copy the
  placeholder `book/` into `dev/real/book/` only if that folder does not exist.

## Docs and tests

- Move the contract into `CONTRACT.md` and document the book in `README.md`.
- Tests for layout (wrapping, ellipsis, flowing to the next spread, page
  numbers), the hash route, hit testing of entries, and the font loader
  rejecting alpha values other than 0, 128 and 255.
- Run the whole suite. One browser check of `/dev/?data=real` at 1920×1080 if
  the sandbox allows it: open a book, turn a spread, open an entry, close. If it
  does not, say so.

Finish with a short summary.
