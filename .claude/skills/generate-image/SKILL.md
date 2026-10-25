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
7. **Check it on the page.** Build, serve the preview on the Tailscale
   address, and send Paolo the image and the preview link. The cover fills the
   text column at every width; check a phone width too.
8. **Open a pull request** and merge only when Paolo says so.
