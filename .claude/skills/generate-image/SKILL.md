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
  technical concept, ideally from its own vocabulary: init *reaps* its child
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
   - anything that must or must not be in the picture.

   Generate only after he answers. Use his words for the tone; a lighter or
   funnier image stays in the default style unless he asks for another one.
3. **Write the prompt** in a scratch directory outside the repository, with
   four parts: the subject (the post title and the idea in plain words), the
   scene (the metaphor, what is in the frame), the style (the rules above,
   including the styles to avoid) and the palette (the hex values). Ask for
   landscape 3:2, 1536x1024, saved as a PNG in the current directory.
4. **Generate with Codex**, which has an image generation tool:

   ```bash
   cd <scratch dir>
   codex exec --skip-git-repo-check --sandbox workspace-write "$PROMPT"
   ```

   To restyle or recolour an existing image, pass it after the prompt:
   `codex exec ... "$PROMPT" -i reference.png`. The prompt must come first,
   because `-i` takes several values and swallows a prompt placed after it.
5. **Look at the result** before showing it. Regenerate when it breaks a
   rule: wrong palette, cartoon faces, text, a dark mood, or a scene that
   repeats another cover.
6. **Convert to WebP** and add it to the post:

   ```bash
   magick image.png -resize 1536x -quality 85 \
     src/assets/images/posts/<n>-<slug>/<name>.webp
   ```

   Use a new file name when replacing a cover, so caches do not serve the old
   one, and delete the old file. Point `featuredImage` and `images` in the
   post's front matter at `/images/posts/<n>-<slug>/<name>.webp`.
7. **Make the night version** once Paolo approves the cover. Run Codex again
   with the approved PNG and a prompt asking for the same scene, unchanged,
   redrawn for the dark scheme: paper `#1a1917` (never pure black), cream ink
   `#f0e9dc` and `#bcb3a6`, washes darkened and desaturated, soft rose
   `#e5a3b2` as the one accent, a calm evening rather than an eerie night, no
   text. Pass the cover with `-i` after the prompt. Convert it like the cover,
   to `<name>-night.webp` in the same folder: the post picks it up by that
   name, with no front matter.
8. **Make the motion map** once both versions are approved. Run Codex with the
   approved PNG and this prompt, the cover passed with `-i` after it:

   > The attached image is an illustrated blog cover, 1536x1024 pixels.
   > Generate ONE new image: a motion mask for this cover. Same size and the
   > exact same composition, every object in the exact same position, so the
   > mask can be laid over the cover pixel for pixel. The mask is flat colours
   > on pure black (#000000). No shading, no outlines, no texture, no text.
   > Paint only the things that should move, each filled solid with its code
   > colour, following the object's real silhouette:
   > green #00FF00 plants and flowers rooted at the bottom, which sway in the
   > wind; cyan #00FFFF things hanging from above that sway, such as trailing
   > ivy or papers pegged on a line; blue #0000FF pendant lamps hanging from a
   > cord, cord included, which swing; yellow #FFFF00 wheels that can spin;
   > red #FF0000 cables or threads along which a light pulse can travel;
   > white #FFFFFF a small dot on each light bulb that is lit or could glow;
   > orange #FF8000 water that can ripple; magenta #FF00FF things floating on
   > the water, which bob.
   > Everything else stays black. Do not paint people, robots, furniture,
   > walls or windows. Save the result as mask.png in the current directory.

   Save it as `<name>-motion-codex.png` next to the cover and run
   `just motion-map <cover.webp> --overlay /site/.motion-review.png`. Look at
   the overlay, then delete it. Where Codex painted something that must not
   move, add an `exclude` box to `<name>-motion-spec.json`; where it missed or
   redrew a part (it tends to redraw a dense tree instead of tracing it), add
   that part to the spec instead. Clouds that drift exist only in the spec. The keys are in the script's docstring. The
   script fails when the mask is more than 2px off the cover: generate the
   mask again, or describe the parts in the spec. Commit the mask, the spec
   and the two outputs. Keep the motion slow and small; on a cover with
   nothing that would move naturally, skip this step.
9. **Check it on the page.** Build, serve the preview on the Tailscale
   address, and send Paolo both images and the preview link. The cover fills
   the text column at every width; check a phone width and the dark scheme
   too, and watch the motion in both.
10. **Open a pull request** and merge only when Paolo says so.
