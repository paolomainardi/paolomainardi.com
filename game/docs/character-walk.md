# How a character walks

This guide explains how the engine moves a character, and how to build side, front and back
walks that looks natural for any character with `tools/rig_walk.py`.

The short version: draw standing poses, measure their joints, write
`rig.json`, and run the tool. The tool cuts legs and lanterns from the poses,
moves them with human gait angles, and writes all three walks into the sheet.
A separate clean side body and near arm let the free arm swing.

## How the engine moves a character

1. **Path.** A click on the floor finds a path through the walkable area. The
   character follows it at a fixed speed, scaled by depth, twice as fast when
   running.
2. **Direction.** Each path segment picks `walk-side`, `walk-front` or
   `walk-back`. A little hysteresis stops a near-diagonal path from flickering
   between them. Walking left mirrors the side walk.
3. **Frames follow distance, not time.** A walk animation with a `stride` (the
   distance its feet cover in one cycle, at scale 1) shows the frame that
   matches the distance walked so far:

   ```text
   frame = floor(distance / (stride × depth) × frames) mod frames
   ```

   This is what keeps the feet planted, at any speed and depth. The classic
   SCUMM engine did the same thing differently: it moved the actor a fixed
   number of pixels on every animation frame.

4. **Standing.** When the path ends, the character keeps facing the way it
   walked: `idle-side`, `idle-back`, or `idle-front`.

The data lives in `character.json` (see [CONTRACT.md](../CONTRACT.md)). For a
walk, the fields that matter are `row`, `frames` and `stride`.

## What makes a walk look right

These rules hold for any walk, drawn by hand or built by the tool.

- **The planted foot moves back evenly.** Between two frames, the foot on the
  ground must move back by the same distance every time: `stride / frames`.
  Uneven spacing makes the feet skate, whatever the engine does.
- **Small bob.** The body rises when the legs pass each other and is lowest
  when both feet touch. About 1% of the figure's height (2 px for a 213 px
  character) is enough; more looks like hopping.
- **Clear phases.** Heel strike with the toes up, the foot flat, push-off from
  the toes, then the knee bends as the leg swings forward.
- **The far side is darker.** The far leg (and arm) a shade darker and cooler,
  so left and right alternate visibly at small size.
- **Opposite swing.** Arms swing against the legs. A held object (the lantern)
  sways a little, behind the motion of the hand.

## Build a side walk with `rig_walk.py`

### 1. Draw the standing side pose

The tool starts from the `idle-side` frame of the sheet, facing right:

- both feet flat on the ground, legs straight and together;
- the near leg fully visible below the clothes;
- a held object hanging free, away from the body, if there is one;
- the same palette and cell size as the rest of the sheet.

### 2. Measure the joints

Open the pose enlarged with a pixel ruler (the tool's preview or any image
editor) and note, in cell pixels, measured from the top left of the cell:

| What            | How to find it                                                           |
| :-------------- | :----------------------------------------------------------------------- |
| `hem`           | Last row of the coat or skirt. Everything below it is legs.              |
| `joints.hip`    | Hidden under the coat: about 53% of the figure's height above the soles. |
| `joints.knee`   | Where the trouser bends; roughly halfway between hip and ankle.          |
| `joints.ankle`  | Top of the boot, above the heel.                                         |
| `shin`          | Box from the hem to the boot top, wide enough for the trouser leg.       |
| `boot`          | Box around the boot, down to the soles.                                  |
| `lantern.box`   | Box around the held object, below the hand.                              |
| `lantern.pivot` | The point where the hand holds it: the object swings from here.          |

Boxes are `[x0, y0, x1, y1]`, with `x1` and `y1` excluded. Points are `[x, y]`.

### 3. Write `rig.json`

Put it next to `character.json`. The current character's file:

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

| Key                        | Meaning                                                                                        |
| :------------------------- | :--------------------------------------------------------------------------------------------- |
| `palette`                  | The world palette; every new pixel is mapped to it.                                            |
| `pose`                     | The animation whose first frame is the standing pose.                                          |
| `frames`                   | Frames in one walk cycle. 12 is smooth; 8 is enough for small characters.                      |
| `coat_brightness`          | Optional. Pixels in the shin box brighter than this (sum of R, G and B) are coat, and dropped. |
| `far_shade`                | Brightness of the far leg, from 0 to 1.                                                        |
| `upper.hem_columns`        | Columns of the hem that sway with the legs.                                                    |
| `upper.hem_sway`           | How far the hem sways, in pixels.                                                              |
| `upper.bob`                | How far the upper body rises when the legs pass, in pixels.                                    |
| `upper.lean`               | How far the shoulders sway against the steps, in pixels.                                       |
| `lantern.swing`            | The held object's swing, in degrees.                                                           |
| `lantern.flame_brightness` | Pixels of the object brighter than this glow (they become the glow sheet).                     |
| `gait`                     | Optional. Replaces the `hip`, `knee` or `ankle` angle curves (see below).                      |

A character without a held object leaves out `lantern`.

### 4. Run the tool

From `game/`:

```sh
/home/paolo/webapps/sparkfabrik/agents/site-redesign/adventure-art/.venv/bin/python \
  tools/rig_walk.py dev/real/character/character.json --preview /tmp/walk.gif
```

It replaces `walk-side`, plus `walk-front` and `walk-back` when those rigs
exist, in `sheet.png` and `glow.png`. It sets each walk's `frames` and `stride`
in `character.json` and prints the distances.
`--preview` writes a GIF of the character crossing the frame at the right
speed: the feet must stay planted on the ground line.

### 5. Check it

- Watch the GIF for skating feet, a hop, or pieces of clothes left behind.
- Run the asset check and look at it in the game, walking both ways.
- Tune the numbers in `rig.json` and run again. The tool is deterministic: the
  same pose and `rig.json` always give the same sheet.

## How the tool builds the walk

1. **Cut-out pieces.** From the pose it takes the upper body (everything above
   the hem), the shin, the boot and the held object. The thigh is hidden under
   the coat, so the tool stretches the top of the trouser leg up to the hip.
2. **Gait angles.** Hip, knee and ankle follow standard curves of human walking
   over one cycle, from heel strike. The far leg is the same leg half a cycle
   later, darker.
3. **Equal steps.** The tool measures how far the planted foot travels through
   the cycle and picks frames at equal distances, so every frame covers the
   same ground (11.3 px for the current character).
4. **Ground contact.** Each frame is moved down until the lowest foot touches
   the ground. The legs' natural bob comes from this.
5. **Upper body.** The hem sways with the forward thigh, the body rises and the
   shoulders sway against the steps. These move whole rows of pixels, so no
   gaps open in the clothes.
6. **Free arm.** A separate sleeve and hand rotate around the shoulder against
   the near leg, reaching about 18 degrees each way. The lower arm bends
   slightly around the elbow during the back swing. The shoulder follows
   the body bob and lean.
7. **Held object.** It swings from the hand, a little behind the steps, and its
   bright pixels become the glow sheet, so the flame follows it.
8. **Pixels stay pixels.** Rotations happen at four times the size with
   nearest-neighbour sampling, and every new colour is mapped to the palette.

The gait curves, in degrees, as `[phase, angle]` keys over one cycle:

| Joint   | Keys                                                                                |
| :------ | :---------------------------------------------------------------------------------- |
| `hip`   | `[0, 25] [0.1, 22] [0.5, -12] [0.6, -8] [0.85, 28]` (positive: thigh forward)       |
| `knee`  | `[0, 3] [0.12, 15] [0.4, 3] [0.55, 20] [0.7, 58] [0.85, 25] [0.95, 3]`              |
| `ankle` | `[0, -8] [0.1, 0] [0.4, -10] [0.55, 18] [0.65, 10] [0.78, 0]` (positive: toes down) |

A longer stride raises the hip range; a heavier, slower character lowers the
knee peak.

## Side arm sources and alignment

The sleeve and coat share colours, so the tool does not try to separate them by colour.
The side rig adds:

| Key            | Meaning                                                                                   |
| :------------- | :---------------------------------------------------------------------------------------- |
| `clean_pose`   | A cell-sized PNG of the standing side pose without the near arm.                          |
| `arm.source`   | A transparent PNG containing only the near sleeve and hand, in the same cell coordinates. |
| `arm.shoulder` | Shoulder pivot in cell pixels.                                                            |
| `arm.elbow`    | Pivot for the small back-swing bend.                                                      |
| `arm.swing`    | Maximum shoulder rotation, in degrees.                                                    |

The current sources are `clean-side.png` and `near-arm.png` beside `rig.json`.
Both use the world palette and binary alpha in a 128 by 234 cell.
The source drawings were generated with `idle-side` attached, then cleaned and registered.
Only the arm area of the original body was replaced, preserving the face, scarf, bag, lantern and legs.

The art workspace holds the generated drawings, reduced sources, exact prompts and
`arm-alignment.png` in `character/out/a8/`. The comparison shows the original,
the clean body, and the body with the arm at rest. The preparation script is
`character/tools/prepare_a8.py`.

## Front and back rigs

Optional `front` and `back` objects in `rig.json` define the other standing views.
They use the side gait curves and the same distance-sampled phases. Each view has:

| Key                      | Meaning                                                                                                   |
| :----------------------- | :-------------------------------------------------------------------------------------------------------- |
| `pose`                   | Standing animation, normally `idle-front` or `idle-back`.                                                 |
| `hem`                    | Last body row before the separate legs.                                                                   |
| `joints`, `shin`, `boot` | Reference leg measurements used to initialise the shared rig.                                             |
| `legs`                   | Two leg objects, each with `joints.hip`, `joints.knee`, `joints.ankle` and `thigh`, `shin`, `boot` boxes. |
| `arms`                   | Exposed sleeve and hand boxes, each with a `pivot` and small `swing` angle.                               |
| `lantern`                | Lantern box, hand pivot, swing and flame threshold, as in the side rig.                                   |
| `far_shade`              | Palette-mapped brightness of the leg stepping away.                                                       |
| `stride_scale`           | Depth distance divided by side distance. The current value is 0.5.                                        |
| `foot_lift`              | Extra swinging-foot rise in pixels.                                                                       |

The thigh and shin scale vertically by the cosine of their sagittal angles.
The foot rises during the swing, and the hips sway one pixel across the screen.
The leg stepping away from the camera is drawn first, behind the nearer leg.
Arms and lantern swing a few degrees, and the glow follows the lantern.

Depth contact uses a half-cycle stance followed by a half-cycle swing.
During stance, the foot moves against the actor by exactly `stride / frames`
per frame. A vertical correction beneath the coat keeps the planted foot
on that path while the knee follows the cosine projection. Boot positions do
not inherit hip sway. Swing returns the foot for its next contact with a small lift.
Front and back reverse the depth sign, so the same contact rule works in both directions.

The current walks have 12 frames. The side stride is 135.5 pixels per cycle;
front and back strides are 67.7 pixels, about half the side distance, as in SCUMM.
The engine uses these distances through the existing animation metadata.

`--preview` shows the three views at 2x, each moving by its own stride against
fixed ground marks. The approved task preview is `character/out/a8/walks.gif`
in the art workspace.

## Limits

- At close zoom, cut-out joints and the side shoulder can show where pieces meet.
- Depth projection uses a fixed camera factor and a coat that hides hip corrections.
  A short jacket or an unusual body shape needs its own measurements and visual check.
- The depth arms use exposed sleeve and hand boxes. Large swings would expose the cut boundaries.
