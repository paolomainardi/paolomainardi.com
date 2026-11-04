# How a character walks

Draw standing poses, measure their joints in `rig.json`, then run `tools/rig_walk.py` to build side, front and back walks. The tool cuts the legs and lantern from the poses, moves them through a gait cycle and writes the resulting frames into the character sheets.

## Runtime movement

The engine finds a path through painted floor and follows it at a speed scaled by depth. Running doubles the distance travelled. Each segment selects `walk-side`, `walk-front` or `walk-back`; hysteresis prevents rapid switching around diagonals. Side motion mirrors for left.

Walks with a positive `stride` advance by travelled distance, using the depth at each movement step:

```text
phase += step_distance / (stride × step_depth)
frame = floor(phase × frames) mod frames
```

Phase survives changes in direction and stride. Animations without `stride` use elapsed animation time and `fps`. On stopping, the engine selects `idle-side`, `idle-back` or `idle-front`; missing side/back idles fall back to unmirrored `idle-front`.

The engine uses only [character metadata](../CONTRACT.md#characterjson), not the rig. The rig is an authoring input that produces sheet pixels and stride values.

## Prepare the sheets

Use a transparent standing pose in each cell, with straight legs, both feet grounded and the side view facing right. Keep the near leg visible below the clothing. Leave a held lantern clear of the body. Use the world palette and consistent cell dimensions.

Before running the tool, define the standing pose animations and output `walk-side` row in `character.json`. Define `walk-front` and `walk-back` rows when enabling those rigs. The output sheet must already be tall enough for every target row: the tool expands its width for the frame count but does not increase its height. Use separate source-pose rows if repeat generation should preserve the original poses.

A supplied glow sheet must share the sheet grid. The tool writes white flame pixels into the corresponding output rows. If `character.glow` is absent, it writes only the visible sheet.

## Measure the side pose

Measurements use cell pixels from the top left. Points are `[x, y]`. Crop boxes are `[x0, y0, x1, y1]`, excluding the last edges.

| Measurement     | What to measure                              |
| --------------- | -------------------------------------------- |
| `hem`           | Last upper-body row, above the exposed legs. |
| `joints.hip`    | Hip pivot hidden beneath the coat.           |
| `joints.knee`   | Knee pivot where trousers bend.              |
| `joints.ankle`  | Boot pivot above the heel.                   |
| `shin`          | Trouser-leg box between hem and boot.        |
| `boot`          | Boot box down to the sole.                   |
| `lantern.box`   | Held object below the hand.                  |
| `lantern.pivot` | Hand position from which the lantern swings. |

Place `rig.json` beside `character.json`. This side-rig example uses the shipped character's cell measurements:

```json
{
  "palette": "../palette.json",
  "pose": "idle-side",
  "frames": 12,
  "hem": 167,
  "joints": { "hip": [64, 125], "knee": [64, 172], "ankle": [63, 218] },
  "shin": [44, 168, 82, 214],
  "boot": [44, 214, 92, 234],
  "coat_brightness": 420,
  "far_shade": 0.72,
  "upper": { "hem_columns": [40, 92], "hem_sway": 4.5, "bob": 2, "lean": 2.4 },
  "lantern": {
    "box": [88, 134, 107, 170],
    "pivot": [96, 134],
    "swing": 7,
    "flame_brightness": 600
  }
}
```

`coat_brightness` excludes bright coat pixels from the shin by RGB sum. `far_shade` darkens the far leg and snaps it to the palette. `upper` controls the hem columns, sway, bob and shoulder counter-sway. Omit `lantern` when there is no held object. All fields and defaults are in [the rig contract](../CONTRACT.md#rigjson).

## Build the side walk

The tool stretches trouser pixels upward beneath the coat to form a hidden thigh. It rotates thigh, shin and boot about their measured joints. The far leg follows half a cycle behind. Sampling phases at equal planted-foot travel produces a consistent stride.

The upper body moves by whole rows: the hem sways with the thigh, while bob and shoulder motion counter the steps. The lowest visible foot is shifted to the cell's last row. The lantern swings behind the hand's motion and its bright pixels supply the glow sheet. Rotations use 4× nearest sampling; shading returns to the palette.

A free side arm can use a separate source so coat and sleeve colours need not be separated automatically:

| Field          | Meaning                                                   |
| -------------- | --------------------------------------------------------- |
| `clean_pose`   | Cell-sized pose without the near arm.                     |
| `arm.source`   | Transparent near sleeve and hand in the same coordinates. |
| `arm.shoulder` | Rotation pivot.                                           |
| `arm.elbow`    | Pivot for the small bend during the back swing.           |
| `arm.swing`    | Maximum shoulder angle, default 18 degrees.               |

The shipped sources are `clean-side.png` and `near-arm.png`, in 128×234 cells. Keep them aligned with the standing pose. The clean body replaces the side pose before the rig cuts its pieces.

## Front and back views

Optional `front` and `back` objects use the same side gait and distance-sampled phases. Each has its own standing `pose`, `hem` and two `legs`. Each leg supplies hip/knee/ankle joints and thigh/shin/boot boxes. Optional `arms` supply exposed boxes, pivots and small swing angles. Optional `lantern` follows the side format.

Thigh and shin project vertically through the cosines of their sagittal angles. The hips sway one pixel. During the half-cycle stance, the foot retreats by `stride / frames` per frame. A correction hidden beneath the coat keeps contact while the knee bends. Swing returns the foot with a small lift; boots do not inherit hip sway. Front and back reverse the depth sign.

`stride_scale` defaults to 0.5 relative to the side stride. `foot_lift` defaults to 5 pixels and `far_shade` to 0.84. Depth arms default to three-degree swings. The current real walks have 12 frames, with a side stride of 135.5 pixels and front/back strides of 67.7 pixels per cycle.

## Gait curves

Each `[phase, angle]` curve repeats over one cycle with smoothstep interpolation. Supplying `gait.hip`, `gait.knee` or `gait.ankle` replaces that entire curve. Hip-positive means thigh forward; ankle-positive points the toes down.

| Joint | Default keys                                                    |
| ----- | --------------------------------------------------------------- |
| Hip   | `[0,25] [0.1,22] [0.5,-12] [0.6,-8] [0.85,28]`                  |
| Knee  | `[0,3] [0.12,15] [0.4,3] [0.55,20] [0.7,58] [0.85,25] [0.95,3]` |
| Ankle | `[0,-8] [0.1,0] [0.4,-10] [0.55,18] [0.65,10] [0.78,0]`         |

Tune joint measurements before changing the gait. A larger hip range increases stride; excessive knee lift or body bob looks like hopping.

## Generate and inspect

From `game/`, use a Python environment containing Pillow and NumPy:

```sh
/path/to/art-venv/bin/python tools/rig_walk.py \
  dev/real/character/character.json --preview /tmp/walk.gif
```

This overwrites walk rows in the sheet and glow, updates `frames` and `stride` in character metadata and removes walk `start` offsets. It prints each generated stride. The GIF shows three cycles at 2×, moving by each view's stride against ground marks. Repeating generation with unchanged source poses and rig is deterministic.

Check these before using the output:

- The planted foot retreats evenly between frames, without skating.
- Bob stays small; feet alternate clearly and the near/far legs remain distinguishable.
- Coat, shoulder and lantern cuts leave no holes or loose fragments.
- Front and back feet keep contact while moving in depth.
- Every animation crop stays in the sheet, with glow inside visible character pixels.

Run `tests/assets.py` and the JavaScript suite, then walk in both directions at near and far depth in the game. Cut-out joints can remain visible at close zoom. Short jackets and unusual silhouettes need different measurements because the method relies on clothing hiding hip corrections. Large depth-arm swings expose crop boundaries.
