# Adding a room

A room needs aligned drawings, an exact-colour object mask and a world binding. Start from a supplied room with the same frame size. Keep the JSON beside its PNGs so relative paths remain readable.

## 1. Draw the room

Use the world's palette and frame size, normally 640×360. Leave the bottom 36 rows for the panel. Make these images on the same pixel grid:

| Drawing                             | Contents                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `albedo.png`                        | The room in even light, for the visitor's moving lantern.                     |
| `dusk-unlit.png`, `night-unlit.png` | Each time state with all room lamps off.                                      |
| `<time>-<lamp>.png`                 | The same scene with only that lamp on, for every lamp and time state.         |
| `objects.png`                       | Flat-colour regions for floor, foreground, slots, lights, exits and hotspots. |
| `water.png`                         | Optional water/reflection data mask.                                          |

Do not move furniture or the camera between light drawings. Lamp differences become illumination directly; misalignment appears as ghosts or moving edges. Map drawing colours back to the palette. Keep masks unfiltered and free of antialiasing.

## 2. Paint the object mask

Use black for unassigned pixels and one unique RGB colour per item. Paint enough continuous floor to reach every target. Put exit regions above nearby floor; arrival snaps to the nearest walkable point. A* will not cross gaps or diagonal corners.

A slot anchors the bottom centre of a book sprite. A light region marks the emitting bulb or flame, not its pool. A foreground region marks the part of a drawing that can cover the actor; its lowest row becomes its depth baseline. Keep each foreground region limited to the object it represents.

If water is present, use red for water and yellow for reflection within water, black elsewhere. Window bars and coastlines must remain black. See [the mask contract](../CONTRACT.md#roomjson-and-objectspng).

## 3. Write room.json

This example has one lamp, one book slot and an exit back to `harbour`:

```json
{
  "name": "workshop",
  "size": [640, 360],
  "albedo": "albedo.png",
  "objects": "objects.png",
  "states": {
    "dusk": {
      "unlit": "dusk-unlit.png",
      "lights": { "desk-lamp": "dusk-desk-lamp.png" }
    },
    "night": {
      "unlit": "night-unlit.png",
      "lights": { "desk-lamp": "night-desk-lamp.png" }
    }
  },
  "items": [
    { "id": "floor", "kind": "walkable", "color": "#00ff00" },
    { "id": "shelf", "kind": "slot", "color": "#ff00ff" },
    {
      "id": "desk-lamp",
      "kind": "light",
      "color": "#ffff00",
      "light": "desk",
      "tint": "#ffd08a",
      "label": "Desk lamp"
    },
    {
      "id": "door",
      "kind": "exit",
      "color": "#ff8000",
      "to": "harbour",
      "label": "Harbour"
    }
  ],
  "depth": { "far": [220, 0.7], "near": [323, 1] },
  "spawn": [320, 280]
}
```

Paint every listed colour in `objects.png`. Set `depth` from the farthest and nearest floor rows, using positive scales and distinct y values. Put `spawn` on floor above the panel. A map uses `"map": true`, exit regions and normal state drawings, but needs no depth, spawn or floor.

## 4. Bind the room in world.json

Add the room to `rooms`:

```json
{
  "workshop": {
    "src": "rooms/workshop/room.json",
    "books": ["linux"],
    "ambience": {
      "dusk": [{ "sound": "wind" }],
      "night": [{ "sound": "wind" }]
    }
  }
}
```

This is a fragment of the `rooms` map. `linux` must exist in `world.books`, including its title, filter and sprite; `wind` must exist in `world.sounds`. Supply at least as many slots as room books. Extra book bindings are silently truncated to available slots.

Use hotspot bindings for a board, the newest matching content item, or travel through a named exit. The shared `world.book` drawing and fonts are required, including for menus. The full forms are in [CONTRACT.md](../CONTRACT.md#room-bindings).

Add an exit to the new room in the source room. For return travel, make the new room's exit `to` name that source room. Arrival uses its nearest floor point and faces into the room. Change `world.start` only if this should become the initial room.

## 5. Check data and play it

Run the JavaScript suite and `tests/assets.py` as described in [README.md](../README.md#checks-and-tools). The asset check covers the shipped demo worlds and includes fixture-specific counts. Extend it for new artwork; it is not a general schema command.

Check the new room's files explicitly:

- All room drawings and masks match `size`.
- Every lamp has a drawing in both states and a tint.
- All visible colours belong to the palette; mask colours are known and unique.
- Every item has painted pixels; floor connects spawn, exits and interaction points.
- Book ids, sprite paths, hotspot ids and destination rooms exist.
- Board text rectangles and close-up controls fit without overlap.

Serve the game, open `/dev/?data=real#workshop` and press Start. Walk to all targets and travel both ways. Switch each lamp independently in dusk and night, then test lantern and bloom. Check foreground with feet behind, on and in front of its baseline. Open content, close the reader with Escape, reload the hash, and check the browser console for errors.

Inspect narrow and wide viewports. Check floor hits at the panel edge, close-up text, focus return and reduced-motion water. A passing mock-render test does not replace this visual pass.
