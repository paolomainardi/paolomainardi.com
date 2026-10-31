# Prompts for stage-lighting

**Motion brief:** the light comes in from above; the two spotlights breathe slowly and can be switched; the work lamp over the lighting desk swings on its cord and can be switched; a light runs along the cables from the desk up the wall; the painter robot turns its head and the operator robot moves its head and its reaching arm. The painted scenery, the clouds, the ropes and the painter's arms (they hold the brush and the bucket) stay still.

## Cover

Sent with the cover of the docker run --init post attached, as a style reference.

> Create an illustrated cover for a quiet editorial engineering blog post titled "How the new image engine works under the hood". The idea: a picture that moves without ever being repainted by code. The scene is drawn in several states (lit, unlit), and an engine mixes those drawings the way a lighting desk mixes painted scenery.
>
> Scene: a small old theatre stage seen from the wings, at an angle, with lots of empty space. Two large painted backdrops of the same simple landscape hang from the fly bars: one painted in daylight, one painted at dusk, the second half raised as if waiting to be swapped in. On the left, a small friendly robot on a low stepladder paints the edge of a backdrop with a long brush; it holds the brush in one arm. On the right, in the wings, a second small robot sits at a wooden lighting desk with a row of sliders, one arm reaching to a slider. Above the desk a small work lamp hangs on a visible cord from a batten. Two theatre spotlights on the batten above the stage point at the backdrop, both lit, casting soft pools of warm light. Three cables run from the lighting desk up the wall to the batten and the spotlights, clearly drawn as separate lines. Wooden floorboards, a heavy curtain at the edge, rope lines tied off on a rail. The robots are small, simple and rounded, drawn as objects with care, no faces with big eyes, no anime features.
>
> Style: loose ink line and light watercolour wash on lots of white paper, like an architect's watercolour study or a soft Japanese picture book background. Warm wood, stone and paper tones, clean ink outlines, gentle washes, calm and bright. Simple, few elements, generous empty space. Match the hand of the attached reference illustration, but not its composition. Avoid: anime, manga, chibi, comic, cartoon faces, big eyes, 3D render, photorealism, glossy highlights, dark or eerie mood. No text, letters, numbers, logos or watermarks anywhere.
>
> Palette: paper #fbf7ef and #f1eee6, ink #1e1b17, muted ink #56504a and #6f685c, beige #e6ddcc and #cec3ad. One strong colour only, used for the curtain and a few accents: rose #a3526b, with pale tint #f8ecef. Sage and dusty blue only desaturated and sparingly, for the painted landscape on the backdrops.
>
> Output: landscape 3:2, 1536x1024, saved as a PNG named cover.png in the current directory.

## Night

Sent with the cover attached.

> Redraw the attached illustration as its night version, for the dark theme of a quiet editorial blog.
>
> Keep everything else identical: the same composition, framing, objects, figures, line work and soft Japanese watercolour style (loose ink line, light washes, generous empty space). Only the light and the paper change.
>
> Palette for the night version:
>
> - Paper and background: deep warm charcoal #1a1917, never pure black, filling the whole frame.
> - Ink lines: warm cream #f0e9dc, with muted #bcb3a6 and #8d8578 for secondary lines.
> - Washes: the original colours darkened and desaturated so nothing is brighter than a soft cream; warm wood and stone tones become dusky.
> - One accent only, used sparingly: soft rose #e5a3b2 where the original uses rose.
> - Lamps or windows may glow faintly warm.
>
> Mood: calm and quiet evening, not eerie, not spooky, no neon, no glossy highlights, no 3D render, no anime. No text, letters, numbers, logos or watermarks.
>
> Output: landscape 3:2, 1536x1024, saved as a PNG named night.png in the current directory.

## Unlit

Sent with the cover attached.

> The attached image is an illustrated blog cover, 1536x1024 pixels: a small theatre stage seen from the wings, two robots, two spotlights on a batten, a work lamp over a lighting desk. Redraw exactly the same scene, unchanged: same composition, every object, curtain, cable, rope and line in the exact same position and size, same loose ink line and soft watercolour hand. Only the light changes: it is the moment before the show, before anything is switched on. Both spotlights are off, with no beams and no pools of light on the backdrop; the small work lamp over the desk is off, with no glow; the backdrops are in a soft, even, cool shade. The washes a little dimmer and cooler. Keep the paper, the palette and the rose curtains; calm, never dark or eerie. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as unlit.png in the current directory.

## Unlit night

Sent with the night version attached.

> The attached image is the night version of an illustrated blog cover, 1536x1024 pixels: a small theatre stage seen from the wings, two robots, two spotlights on a batten, a work lamp over a lighting desk. Redraw exactly the same scene, unchanged: same composition, every object, curtain, cable, rope and line in the exact same position and size, same loose ink line and soft watercolour hand. Only the light changes: it is the moment before the show, before anything is switched on. Both spotlights are off, with no beams and no pools of light on the backdrop; the small work lamp over the desk is off, with no glow; the backdrops are in a soft, even, cool shade. The washes a little dimmer and cooler, still a quiet evening. Keep the dark charcoal paper, the cream ink, the night palette and the rose curtains; calm, never dark or eerie. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as unlit-night.png in the current directory.

## Object sheet

Sent with the cover attached. Made objects.json and objects.png.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Produce an object sheet for it: two files in the current directory.
>
> 1. objects.png: ONE new image, same size and the exact same composition, every object in the exact same position, so it can be laid over the cover pixel for pixel. Flat colours on pure black (#000000), no shading, no outlines, no texture, no text. Paint each object listed in objects.json filled solid with its own colour, following its real silhouette. Everything else stays black.
>
> 2. objects.json: a JSON array, one entry per object, in this form:
>    {"id": "desk-lamp-bulb", "kind": "light", "label": "Desk lamp", "light": "desk", "of": "desk-lamp", "motion": [], "box": [x0, y0, x1, y1], "color": "#FF0000"}
>
> Include only the things that give light or could move, one object each:
>
> - kind "light": every light source that is lit or could be lit. The painted area is the glowing part only (a bulb, a lamp's glass, a lit window pane, a lighthouse lantern). "light" says how it shines: "spot" a small lamp, "pendant" a hanging bulb that lights the area below it, "desk" a desk or wall lamp that lights a pool in front of it, "window" a window pane of daylight or a lit window far away, "screen" a lit computer or television screen, "lighthouse" a lighthouse lantern. "of": the id of the lamp body it belongs to, if any. "label": two or three words naming the lamp for a screen reader, such as "Pendant lamp".
> - kind "lamp": a lamp body that hangs on a cord and could swing, cord included; motion ["swing"].
> - kind "tool": something held or hanging that could swing, such as a rake in a hand or a sign on a hook; motion ["swing"]; "anchor": [x, y], the point where it is held.
> - kind "limb": a part of a robot or a person that could make a small movement while they work, such as an arm holding a brush or a head bent over a task; one object per limb, only the clearly visible ones, at most 6; motion ["idle"]; "anchor": [x, y], the joint it turns about (the shoulder for an arm, the neck for a head).
> - kind "plant": a plant or a tree that could sway, trunk and branches included, never its pot; "outdoor": true when it grows outside in the open air, false when it is indoors; motion ["sway"].
> - kind "leaf": a single loose or dead leaf still hanging on a plant that could fall; one object per leaf, at most 8, the most visible ones; motion ["fall"].
> - kind "water": water that could ripple; motion ["ripple"].
> - kind "float": something floating on water; motion ["bob"].
> - kind "sky": an open sky area, one object for each separate sky (the sky inside a screen, a picture or a window is a different object from the sky behind the scene); motion [].
> - kind "cloud": a cloud that could drift; motion ["drift"].
> - kind "steam": the top of a hot drink or anything else that could give off steam; the painted area is the opening the steam would rise from; motion ["steam"].
> - kind "thread": a cable, wire or thread a light could run along, one object for all the threads that meet; motion ["pulse"].
>   Never include whole people, whole robots, furniture or walls.
>
> "box" is your best estimate of the object's bounding box in cover pixels. "color" is a different colour for every object, taken in order from this list and from nothing else:
> #FF0000 #00FF00 #0000FF #FFFF00 #FF00FF #00FFFF #FF8000 #8000FF #00FF80 #FF0080 #80FF00 #0080FF #FFFFFF #800000 #008000 #000080 #808000 #800080 #008080 #FF8080 #80FF80 #8080FF #FFC000 #C0C0C0
>
> Use the same colours in objects.png and objects.json. Save both files in the current directory.

The two spotlights are listed in objects.json as "desk" lights rather than "spot": their light is the beam on the backdrop, so switching one off has to darken a pool below it, not only the lamp. The first sheet painted the cables in the colour of the painter's arm, so they are kept still and come from a second sheet.

## Cables sheet

Sent with the cover attached. Made objects-cables.json and objects-cables.png.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Produce a second object sheet for it, for the electrical cables only: two files in the current directory.
>
> 1. objects-cables.png: ONE new image, same size and the exact same composition, so it can be laid over the cover pixel for pixel. Flat colour on pure black (#000000), no shading, no outlines, no texture, no text. Paint the electrical cables that run from the wooden lighting desk on the right, up the wooden wall to the top of the wall, filled solid with #FF0000, following their real lines, a few pixels wide. Paint nothing else: not the ropes, not the lamp cord, not the robots, not the curtains. Everything else stays black.
>
> 2. objects-cables.json: a JSON array with one entry:
>    {"id": "desk-cables", "kind": "thread", "label": "Cables", "motion": ["pulse"], "box": [x0, y0, x1, y1], "color": "#FF0000"}
>
> "box" is your best estimate of the cables' bounding box in cover pixels. Save both files in the current directory.
