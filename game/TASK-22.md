# Task 22: keep the inventory between visits

Work only inside `game/`. No git commands. The plan is approved: do not stop to
ask.

- Save the inventory in `localStorage` under one key, `adventure.inventory`:
  a JSON list of `{ "kind": "book" | "notice", "id": "<book id or content item id>" }`,
  nothing else. Write it whenever the inventory changes.
- On start, restore it after the world and content are loaded. Drop entries
  whose book or content item no longer exists, and rewrite the key.
- Every read and write is wrapped in `try`/`catch`: with storage blocked, full
  or missing (private windows, disabled site data) the game works as now and
  keeps the inventory for the session only. Never show an error for it.
- In the inventory, a small "Forget" label at the end of the row clears every
  item and the key, after the line "Pockets emptied.".
- Only the inventory is stored: room, lamps, time of day and position still
  start fresh.

Update `CONTRACT.md` and `README.md` (what is stored, under which key, and how to
clear it). Tests with a mock storage: save on take, restore on start, stale ids
dropped, corrupt JSON ignored, storage that throws, Forget clears both. Run the
whole suite.

Finish with a short summary.
