# Task 8: hotspots bound to content, links that open a real tab

Work only inside `game/`, no git commands. Update `CONTRACT.md`, the tests, the
placeholders and `README.md`.

1. **Content items of type `link`** carry `link`, the external URL of the linked
   page (besides `title`, `date`, `tags`, and the note as `description`).
2. **world.json room hotspots.** A room in `world.json` may have
   `"hotspots": { "<item id>": { "content": { <filter> } } }`. The hotspot with that
   id in `room.json` is then bound to the newest content item matching the filter
   (same filter rules as slots, newest by `date`):
   - its label becomes "<hotspot label>: <item title>";
   - Look at says the item's title and its description, shortened to one or two
     lines;
   - Open opens the item in a new browser tab: `link` if present, otherwise `url`,
     with `window.open(url, "_blank", "noopener,noreferrer")`, from the click
     itself so pop-up blockers allow it. The character walks to the hotspot first
     and says a short line ("Let's see what's out there."); the tab opens on the
     same click, before the walk, because browsers block pop-ups that are not
     direct responses to a click.
3. In the dev data, bind `window` to `{ "type": "link" }` and add two sample links.

Finish with a summary.
