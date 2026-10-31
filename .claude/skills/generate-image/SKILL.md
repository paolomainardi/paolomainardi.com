---
name: generate-image
description: Generate a cover or illustration for a paolomainardi.com post with AI, in the site's palette and illustration style, and add it to the post as WebP. Use when Paolo asks for a new image, a cover, a featured image, or to replace an old one.
---

# Generate an image

Covers on this site are illustrations, not photos and not screenshots. They
share one palette and one hand, so a page of posts reads as one book. This
skill writes the prompt, generates the image with Codex, checks it, and puts it
in the post as WebP. Paolo approves every image before it is merged.

## Rules

- **The palette is DESIGN.md's.** Paper `#fbf7ef` and `#f1eee6`, ink
  `#1e1b17`, muted ink `#56504a` and `#6f685c`, beige `#e6ddcc` and
  `#cec3ad`. One strong colour only: rose `#a3526b`, pale tint `#f8ecef`.
  Sage and dusty blue only desaturated and sparingly. Check the hex values in
  DESIGN.md before writing the prompt; they change.
- **The style is calm and editorial.** Loose ink line and light watercolour
  wash on lots of white paper, like a botanical sketch or an architect's
  watercolour study. Simple, few elements, generous empty space, bright.
- **The reference look is a soft Japanese watercolour.** Warm wood, stone and
  paper tones, clean ink outlines, gentle washes, objects drawn with care, the
  calm of a picture book background. Architectural cross-sections and still
  scenes suit it well. The published covers of "docker run --init" (a gardener
  in a container) and "Docker on MacOS is slow" (a container at sea on a
  laptop) are in this style: look at them before writing a prompt. This is a
  painting style for scenes and objects, never anime characters.
- **Do not pick another style or mood yourself.** No anime, manga, chibi,
  comic, cartoon faces, big eyes, 3D render, photorealism, glossy highlights,
  or a dark and eerie mood. Paolo rejected each of these. Leave the default
  style only when Paolo asks for it and the article calls for it.
- **The image explains the idea.** Find a visual metaphor for the post's
  technical concept, ideally from its own vocabulary: init _reaps_ its child
  processes, so the cover is a gardener raking dead leaves from a process
  tree. A joke that does not map to the concept is not enough.
- **Each post gets its own scene.** Reuse the style and the palette, never a
  previous cover's composition. Containers can recur for container posts.
- **A figure that stands for Paolo is never a woman.** Draw the author as a
  neutral adult or a man, seen from behind or in profile, never a portrait.
  Say so in the prompt: image models default the writer at a desk to a woman.
- **No text** in the image: no letters, numbers, logos or watermarks.
- **No private data**: no real people, customer names, hostnames, addresses,
  or anything from Paolo's network.

## Steps

1. **Read the post** and name its one idea in a sentence.
2. **Ask before generating.** Never infer the scene, the tone or the style.
   Ask Paolo, in one short message:
   - the metaphor you propose, in one line, and whether he has another idea;
   - the tone: calm and serious (the default) or lighter;
   - anything that must or must not be in the picture;
   - the motion brief: in one line, what in the scene moves and how, from the
     effects in step 8, for example "the light comes in, the pendant breathes
     and can be switched, rain falls behind the window". Pick what would move
     in the real scene and carries the idea; leave the rest still. The motion
     is ambient: light, weather, water, wind, a swing, a small gesture. A scene
     whose idea needs a story to move (a train passing, a lever thrown) stays
     still. The one exception is an actor: a character drawn apart from the
     scene that crosses it or arrives once each time the cover is shown, such
     as a cat walking home; ask Paolo before adding one. Decide for this scene, and say it in the brief: whether the light
     comes in and from where, how fast the lights breathe (a quiet room slowly,
     a switchboard briskly), which plants sway (indoor plants do not).

   Generate only after he answers. Use his words for the tone; a lighter or
   funnier image stays in the default style unless he asks for another one.

3. **Write the prompt** in a scratch directory outside the repository, with
   four parts: the subject (the post title and the idea in plain words), the
   scene (the metaphor, what is in the frame), the style (the rules above,
   including the styles to avoid) and the palette (the hex values). Ask for
   landscape 3:2, 1536x1024, saved as a PNG in the current directory. Draw the
   lights of the scene lit, and swinging lamps on a visible cord.

4. **Generate with Codex**, which has an image generation tool:

   ```bash
   cd <scratch dir>
   codex exec --skip-git-repo-check --sandbox workspace-write "$PROMPT" < /dev/null
   ```

   To restyle or redraw an existing image, pass it after the prompt:
   `codex exec ... "$PROMPT" -i reference.png < /dev/null`. The prompt must
   come first, because `-i` takes several values and swallows a prompt placed
   after it. Without `< /dev/null` Codex waits for input and never ends.

5. **Look at the result** before showing it. Regenerate when it breaks a
   rule: wrong palette, cartoon faces, text, a dark mood, or a scene that
   repeats another cover.

6. **Keep the sources** in `covers/<name>/`, outside what Hugo serves: the
   approved cover as `cover.webp`, lossless (`magick cover.png -define
webp:lossless=true covers/<name>/cover.webp`), and every drawing after it
   the same way. Every later drawing is made from these masters, so never
   from a lossy copy. Write `covers/<name>/prompts.md` as you go: the motion
   brief, then every prompt sent to Codex as it was sent, with the image it
   was sent with. The repository is public: only the brief and the prompts,
   never a local path, a hostname or anything from the scratch directory.
   Point `featuredImage` and `images` in the post's front matter at
   `/images/posts/<n>-<slug>/<name>.webp`; use a new name when replacing a
   cover, so caches do not serve the old one.

7. **Make the night version** once Paolo approves the cover. Run Codex again
   with the cover attached and a prompt asking for the same scene, unchanged,
   redrawn for the dark scheme: paper `#1a1917` (never pure black), cream ink
   `#f0e9dc` and `#bcb3a6`, washes darkened and desaturated, soft rose
   `#e5a3b2` as the one accent, a calm evening rather than an eerie night, no
   text. Save it as `covers/<name>/night.webp`, lossless.

8. **Make it move**, once both versions are approved, with the effects of the
   brief. `docs/cover-engine.md` is the reference. Each effect needs its
   drawings, made by Codex from the cover (and from the night version for the
   `-night` one), "exactly the same scene, unchanged, only the light changes":

   | Effect in the brief                                                                                                                                                                                       | Drawings                                                 | Spec                                        |
   | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- | :------------------------------------------ |
   | The light comes in; lamps breathe, switch, can be pressed                                                                                                                                                 | `unlit`, `unlit-night`: every lamp off, no glow          | `entry`, `light_from`, `lights`             |
   | A storm or a distant thunder                                                                                                                                                                              | `flash`, `flash-night`: the same moment lit by lightning | `storm`, `flash`                            |
   | Rain in the sky or behind a window                                                                                                                                                                        | none (shared texture)                                    | `storm.sky`, `rain`                         |
   | Drops running down a window                                                                                                                                                                               | none (shared texture)                                    | `glass`, `drops`                            |
   | Waves, bobbing, drifting clouds, swaying plants, swinging lamps and tools, small gestures, falling leaves, a light along a thread, a lighthouse beam, windows going dark at night, steam from a hot drink | none                                                     | `amp`, `still`, `pulse`, `floor`, `twinkle` |
   | Stars breathing in a night sky, a shooting star now and then                                                                                                                                             | a `sky` object in the object sheet                       | `stars`, `meteor`                           |
   | Code falling on an old computer screen, status lights blinking on a machine                                                                                                                              | `terminal` objects, lights of type `led`                 | `terminal`                                  |
   | A character walking or flying across the scene once (an actor)                                                                                                                                           | its sprite sheet, below                                  | `actors`                                    |

   A changed weather, such as rain over a sunny scene, is a new cover: draw the
   rainy cover first and every state from it.

   An actor's sprite sheet is drawn by Codex with the cover attached as the
   style reference: "a sprite sheet for an animation, a grid of C columns and R
   rows of equal cells, each holding the SAME character, the same size, its
   feet on the same line near the bottom of the cell, nothing crossing into
   another cell, transparent background (or a flat pure green if transparency
   is impossible), no grid lines, no text", then the character, the style of
   the cover, and what each cell shows: for a walk, six evenly spaced steps of
   one stride seen from the side, facing right, then the pose it ends in. A
   character that only flies is one drawing, `grid` `[1, 1]`. Look at every
   cell: the head, the size and the colours must not change between frames.

   Then ask Codex for the object sheet, the cover attached, with this prompt:

   > The attached image is an illustrated blog cover, 1536x1024 pixels. Produce an object sheet for it: two files in the current directory.
   >
   > 1. objects.png: ONE new image, same size and the exact same composition, every object in the exact same position, so it can be laid over the cover pixel for pixel. Flat colours on pure black (#000000), no shading, no outlines, no texture, no text. Paint each object listed in objects.json filled solid with its own colour, following its real silhouette. Everything else stays black.
   >
   > 2. objects.json: a JSON array, one entry per object, in this form:
   >    {"id": "desk-lamp-bulb", "kind": "light", "label": "Desk lamp", "light": "desk", "of": "desk-lamp", "motion": [], "box": [x0, y0, x1, y1], "color": "#FF0000"}
   >
   > Include only the things that give light or could move, one object each:
   >
   > - kind "light": every light source that is lit or could be lit. The painted area is the glowing part only (a bulb, a lamp's glass, a lit window pane, a lighthouse lantern). "light" says how it shines: "spot" a small lamp, "pendant" a hanging bulb that lights the area below it, "desk" a desk or wall lamp that lights a pool in front of it, "window" a window pane of daylight or a lit window far away, "screen" a lit computer or television screen, "lighthouse" a lighthouse lantern, "led" a tiny status light on a machine (one object per light). "of": the id of the lamp body it belongs to, if any. "label": two or three words naming the lamp for a screen reader, such as "Pendant lamp".
   > - kind "lamp": a lamp body that hangs on a cord and could swing, cord included; motion ["swing"].
   > - kind "tool": something held or hanging that could swing, such as a rake in a hand or a sign on a hook; motion ["swing"]; "anchor": [x, y], the point where it is held.
   > - kind "limb": a part of a robot or a person that could make a small movement while they work, such as an arm holding a brush or a head bent over a task; one object per limb, only the clearly visible ones, at most 6; motion ["idle"]; "anchor": [x, y], the joint it turns about (the shoulder for an arm, the neck for a head).
   > - kind "plant": a plant or a tree that could sway, trunk and branches included, never its pot; "outdoor": true when it grows outside in the open air, false when it is indoors; motion ["sway"].
   > - kind "leaf": a single loose or dead leaf still hanging on a plant that could fall; one object per leaf, at most 8, the most visible ones; motion ["fall"].
   > - kind "water": water that could ripple; motion ["ripple"].
   > - kind "float": something floating on water; motion ["bob"].
   > - kind "sky": an open sky area, one object for each separate sky (the sky inside a screen, a picture or a window is a different object from the sky behind the scene); motion [].
   > - kind "cloud": a cloud that could drift; motion ["drift"].
   > - kind "terminal": the glass of a lit computer screen showing text, one object per screen; motion ["code"].
   > - kind "steam": the top of a hot drink or anything else that could give off steam; the painted area is the opening the steam would rise from; motion ["steam"].
   > - kind "thread": a cable, wire or thread a light could run along, one object for all the threads that meet; motion ["pulse"].
   >   Never include whole people, whole robots, furniture or walls.
   >
   > "box" is your best estimate of the object's bounding box in cover pixels. "color" is a different colour for every object, taken in order from this list and from nothing else:
   > #FF0000 #00FF00 #0000FF #FFFF00 #FF00FF #00FFFF #FF8000 #8000FF #00FF80 #FF0080 #80FF00 #0080FF #FFFFFF #800000 #008000 #000080 #808000 #800080 #008080 #FF8080 #80FF80 #8080FF #FFC000 #C0C0C0
   >
   > Use the same colours in objects.png and objects.json. Save both files in the current directory.

   Save the two files as `covers/<name>/objects.json` and `objects.png`. When
   the first sheet misses something the brief needs, such as the limbs of a
   figure, ask for a second sheet with the same form for those things only and
   save it as `objects-<pass>.json` and `.png`. Write `covers/<name>/spec.json`
   with `publish` and the brief's choices, then run `just cover <name>`. The
   builder fails when a drawing is more than 2px off the cover: draw it again
   from the cover. Watch the motion on the preview in both schemes before
   sending it: a brief item that does not move, or moves too little to notice,
   or something moving that is not in the brief, is a mistake to fix first.
   Commit `covers/<name>/` and the files the builder writes. On a cover with
   nothing that would move naturally, skip this step.

9. **Check it on the page.** Build, serve the preview on the Tailscale
   address, and send Paolo both images and the preview link. The cover fills
   the text column at every width; check a phone width and the dark scheme
   too, watch the motion in both, press the lamps, and open the zoom.
10. **Open a pull request** and merge only when Paolo says so.
