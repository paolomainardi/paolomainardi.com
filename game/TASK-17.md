# Task 17: the sound engine

Add sound to the engine: background sounds tied to the room and its objects,
and effects tied to what happens. Everything is configured in JSON, like rooms
and lights; the engine knows no particular sound. Work only inside `game/`. No
git commands. The plan is approved: do not stop to ask.

## Rules

- **No sound before Start.** The Start button creates or resumes the
  `AudioContext`. Sound is on after Start at a low master volume.
- **Mute.** `M` toggles mute; a small speaker label in the verb bar shows the
  state and toggles it on click. Not stored anywhere.
- **Reader.** While the reader is open, everything ducks by about 12 dB and
  comes back when it closes. The book close-up keeps ambience at full volume.
- **Hidden tab.** Suspend the context when the page is hidden, resume when
  visible.
- **Buses.** Master, ambience and effects gains, so levels can be tuned in
  `world.json`.

## Configuration

`world.json` gains:

```json
"sounds": {
  "sea":    { "synth": "surf",    "volume": 0.5, "loop": true },
  "wind":   { "synth": "wind",    "volume": 0.3, "loop": true },
  "flame":  { "synth": "crackle", "volume": 0.25, "loop": true },
  "step":   { "synth": "step",    "volume": 0.5 },
  "page":   { "synth": "page",    "volume": 0.6 },
  "click":  { "synth": "click",   "volume": 0.4 },
  "door":   { "synth": "creak",   "volume": 0.5 }
},
"events": {
  "step": "step", "page-turn": "page", "book-open": "page", "book-close": "page",
  "lamp": "click", "menu": "click", "door": "door"
},
"mix": { "master": 0.5, "ambience": 0.8, "effects": 1.0 }
```

A sound is either `"synth"` (a generator built into the engine, with optional
parameters) or `"src"` (an audio file relative to `world.json`, decoded once).
Unknown synths and missing files are reported once in the console and skipped.

Rooms say where background sounds come from, per time of day, in `world.json`'s
room entry:

```json
"ambience": {
  "dusk":  [{ "sound": "sea", "at": "window" }],
  "night": [{ "sound": "sea", "at": "window" }, { "sound": "wind" },
            { "sound": "flame", "at": "oil-lamp", "light": "oil-lamp" }]
}
```

- `at` names a room item: the sound gets louder as the character gets closer
  (gentle falloff, never silent) and pans left and right with its position.
  Without `at`, the sound is everywhere, centred.
- `light` ties the volume to that lamp's level, so switching the lamp off
  fades the crackle.
- Changing time of day or room cross-fades the loops over about a second.

## Generators

Make them sound natural, not like beeps: noise shaped by filters and slow
envelopes, with randomness so loops never repeat exactly.

- `surf`: waves on a shore, a slow irregular swell of filtered noise with an
  occasional soft break.
- `wind`: low band-passed noise drifting in pitch and level.
- `crackle`: an oil flame, a soft bed with small random pops.
- `step`: one footstep on wooden boards, short and low; slight random pitch and
  level so steps differ.
- `page`: a page turning, a quick swept noise burst.
- `click`: a small switch or menu click.
- `creak`: a short wooden creak.

## Events

The engine fires the events above: `step` on each foot contact (the two contact
phases of the walk cycle, so steps match the feet at any speed), `page-turn`,
`book-open`, `book-close`, `lamp` (Use on a light), `menu` (choosing in the
right-click menu), `door` (Use or Walk to on an exit). Step volume follows depth.

## Docs and tests

Fill the real `dev/real/world.json` and the placeholders with the sounds and
ambience above. Document sound in `CONTRACT.md` and `README.md`. Tests with a
mock `AudioContext`: nothing before Start, mute, ducking with the reader,
distance gain and pan, lamp-tied volume, cross-fade on time change, steps on
contact phases at two speeds, events mapped from `world.json`, missing sounds
skipped. Run the whole suite. One browser check only if the sandbox allows it.

Finish with a short summary.
