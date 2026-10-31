# Prompts for halloween

The header of the site on 31 October. Paolo chose the style from a reference: a naive gouache night scene, a cute young witch with her cats, a white cottage with lit windows. Codex drew a scene of its own in that style, not a copy of the reference.

**Motion brief:** the light comes in from above; the windows, the two carved pumpkins and the lantern switch on their own and can be switched; the two bare trees sway; the stars breathe and a shooting star passes now and then. Two actors play once each time the header is shown: a witch on a broom with five cats flies across the sky once, above the roof, and out on the right, and a tuxedo cat walks along the path and sits by the steps, looking at the reader.

The drawings were made at 1536x1024 and cropped to the band, 1536x620 from y=236. The scene is a night scene in both colour schemes, so `night.webp` and `unlit-night.webp` are copies of `cover.webp` and `unlit.webp`.

## Cover

> Generate one image with your image generation tool and save it as scene.png in the current directory, landscape 1536x1024. Do not ask questions; decide.
>
> Subject: a quiet Halloween night for the header of a personal tech blog. The feeling is "coming home on Halloween night": warm, cosy, a little magical, never scary.
>
> Style: a naive hand-painted gouache illustration on textured paper, like a picture book painting. Matte paint, visible brush texture and paper grain, soft edges, simple shapes, no outlines in black ink, no glossy highlights, no 3D, no photorealism, no text, no letters, no logos.
>
> Scene, a wide panorama read from left to right:
> - A deep navy and dark teal night sky filling the upper half, with many small hand-painted cream and pale gold stars of different sizes, some five-pointed, some just dots, and a thin cream crescent moon in the upper left area.
> - On the right of centre, a small white wooden two-storey cottage with a steep dark roof, a brick chimney, a red front door with three stone steps and a small lantern beside it. It has several small windows. Draw ALL windows lit with warm yellow light from inside, glowing softly.
> - In front of the cottage a few round orange pumpkins on the ground, two of them carved with simple friendly faces and lit from inside with a warm glow.
> - Thin bare autumn trees on the far left and far right, with a few rust and orange leaves, low autumn bushes in rust and ochre along the ground.
> - A wide sandy ochre path and ground across the bottom, with a few fallen leaves.
> - No people, no witch, no animals in this picture: the upper sky stays open and empty apart from stars, because a witch on a broom will fly across it later.
>
> Composition: this picture will be cropped to a wide band of 1536x560 pixels, taken from y=300 to y=860. Keep the moon, the top of the cottage roof and chimney, the pumpkins and the trees fully inside that band. The left third of the band behind the moon must stay calm sky, because the blog title sits there.
>
> Palette: navy #1d2a3a, dark teal #23383f, cream stars #efe4c8, pale gold #e6c77a, warm window yellow #f2c35b, pumpkin orange #d9772e, rust #a8492b, ochre ground #b8996a, white cottage #e8e1d2, red door #a3262a.

## Broom

> Generate one image with your image generation tool and save it as broom.png in the current directory, 1536x1024, with a TRANSPARENT background (PNG with alpha, nothing behind the subject). If transparency is impossible, use a flat pure green #00FF00 background with nothing else on it. Do not ask questions; decide.
>
> Subject, seen from the side, flying towards the right of the picture: a small cute young witch riding a long wooden broom with a straw brush at the back. She wears a black dress and a big pointed black hat, long auburn hair blowing back, brown boots, a calm little smile. Five cats sit in a row on the broom handle behind her: a white fluffy cat, a black cat with yellow eyes, a white cat with a red scarf, an orange tabby cat and a black cat. All of them small, round and sweet.
>
> Style: a naive hand-painted gouache illustration, like a picture book painting. Matte paint, visible brush texture, soft edges, simple shapes, no black ink outlines, no glossy highlights, no 3D, no text.
>
> The witch, the cats and the broom fill the width of the picture, centred, with a little empty margin all around. Nothing else in the picture: no moon, no stars, no ground, no shadow.

The broom was trimmed to its drawing and saved as `broom.webp`, the witch's sprite sheet of one frame.

## Unlit

Sent with the cover attached.

> Edit the attached image with your image generation tool and save the result as unlit.png in the current directory, 1536x1024. Do not ask questions; decide.
>
> Exactly the same scene, unchanged: every object, every star, every leaf, every brush stroke in the exact same position, same size, same framing, same colours, so the two images can be laid one over the other pixel for pixel. Only the light changes: every light in the scene is switched off.
> - Every window of the cottage is dark: the glass is a deep dark blue-grey night colour, no yellow light, no glow on the walls around it.
> - The two carved pumpkins are not lit: their carved eyes and mouths are dark holes, no glow inside or around them. The uncarved pumpkins stay as they are.
> - The lantern beside the door is off, no glow.
> - The warm glow on the ground and the steps in front of the house is gone; the ground keeps its ochre colour lit only by the moon.
> Nothing else changes: the moon and the stars stay the same.

## Object sheet

Sent with the cover attached.

> The attached image is an illustrated header picture, 1536x1024 pixels. Produce an object sheet for it: two files in the current directory. Do not ask questions; decide.
>
> 1. objects.png: ONE new image made with your image generation tool, same size and the exact same composition, every object in the exact same position, so it can be laid over the picture pixel for pixel. Flat colours on pure black (#000000), no shading, no outlines, no texture, no text. Paint each object listed in objects.json filled solid with its own colour, following its real silhouette. Everything else stays black.
>
> 2. objects.json: a JSON array, one entry per object, in this form:
>    {"id": "window-upper-left", "kind": "light", "label": "Upper left window", "light": "spot", "motion": [], "box": [x0, y0, x1, y1], "color": "#FF0000"}
>
> Include only these objects:
> - kind "light", light "spot": each lit window of the cottage, one object per window, the painted area is the lit glass only; each of the two carved, lit pumpkins, the painted area is the whole pumpkin; the small lantern beside the red door, the painted area is its glass. "label": two or three words for a screen reader, such as "Attic window" or "Pumpkin lantern".
> - kind "plant", "outdoor": true, motion ["sway"]: the bare tree on the far left and the tree on the far right, trunk and branches included.
> Use clearly different saturated colours for each object.

## Sky sheet

Sent with the cropped cover attached. It made `objects-sky.json` and `objects-sky.png`.

> The attached image is an illustrated header picture, 1536x620 pixels. Produce an object sheet for its sky: two files in the current directory. Do not ask questions; decide.
>
> 1. objects-sky.png: ONE new image made with your image generation tool, same size (1536x620) and the exact same composition, so it can be laid over the picture pixel for pixel. Flat colour on pure black (#000000), no shading, no outlines, no texture, no text. Paint the open night sky filled solid with pure blue #0000FF, following its real outline: the stars inside the sky are part of the sky and are painted blue too. Everything that is not sky stays black: the moon, the cottage and its roof and chimney, the trees and their branches and leaves, the distant hills and bushes, the ground.
>
> 2. objects-sky.json: a JSON array with one entry:
>    [{"id": "night-sky", "kind": "sky", "motion": [], "box": [x0, y0, x1, y1], "color": "#0000FF"}]

## Tuxedo cat

Sent with the cover attached, as the style reference. It made `cat.webp`, the cat's sprite sheet.

> Generate one image with your image generation tool and save it as cat.png in the current directory, 1536x1024, with a TRANSPARENT background (PNG with alpha). If transparency is impossible, use a flat pure green #00FF00 background with nothing else on it. Do not ask questions; decide.
>
> It is a sprite sheet for an animation: a grid of 4 columns and 2 rows, 8 equal cells of 384x512 pixels, each cell holding the SAME cat, the same size, its feet on the same line near the bottom of the cell, centred in the cell, with nothing crossing into another cell. No grid lines, no numbers, no text.
>
> The cat: a small tuxedo cat, black with a white chest, a white muzzle and four white paws, green eyes, a long black tail. Painted in the same naive gouache picture book style as the attached picture: matte paint, soft edges, visible brush texture, simple round shapes, no black ink outlines, no 3D. Sweet and calm, never scary.
>
> Cells, read left to right, top row first:
> 1 to 6: a walk cycle seen exactly from the side, walking towards the RIGHT, six evenly spaced steps of one full stride, tail held up in a soft curve. Only the legs, the tail and a tiny bob of the body change between these six cells; the head, the body size and the colours stay identical.
> 7: the same cat sitting, seen from the side facing right, tail around its paws.
> 8: the same cat sitting like in cell 7, its head turned towards the viewer.
