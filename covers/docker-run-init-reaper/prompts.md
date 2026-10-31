# Prompts for docker-run-init-reaper

The cover was drawn before the prompts were kept, and was given its night version and its motion later. Its original prompt is lost; the prompts below are the ones used afterwards.

**Motion brief:** the tree sways, the rake swings in the gardener's hands, dead leaves fall from their branches.

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

## Object sheet

Sent with the cover attached. Made objects.json and objects.png.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Produce an object sheet for it: two files in the current directory.
>
> 1. objects.png: ONE new image, same size and the exact same composition, every object in the exact same position, so it can be laid over the cover pixel for pixel. Flat colours on pure black (#000000), no shading, no outlines, no texture, no text. Paint each object listed in objects.json filled solid with its own colour, following its real silhouette. Everything else stays black.
>
> 2. objects.json: a JSON array, one entry per object, in this form:
>    {"id": "desk-lamp-bulb", "kind": "light", "label": "the bulb of the desk lamp on the left", "motion": [], "light": "spot", "box": [x0, y0, x1, y1], "color": "#FF0000"}
>
> Include only the things that give light or could move, one object each:
>
> - kind "light": every light source that is lit or could be lit (a bulb, a lamp's glowing glass, a lit window pane). The painted area is the glowing part only. "light" says how it shines: "spot" a small lamp, "pendant" a hanging bulb that lights the area below it, "desk" a desk or wall lamp that lights a pool in front of it, "window" a window or a pane of light.
> - kind "lamp": a lamp body that hangs and could swing, with its cord; motion ["swing"].
> - kind "plant": plants and flowers that could sway; motion ["sway"].
> - kind "water": water that could ripple; motion ["ripple"].
> - kind "float": something floating on water; motion ["bob"].
> - kind "sky": an open sky area; motion [].
> - kind "cloud": a cloud that could drift; motion ["drift"].
> - kind "thread": a cable or thread a light could run along; motion ["pulse"].
> - kind "tool": something held or hanging that could swing, such as a rake in a hand or a sign on a hook; motion ["swing"]. Also give "anchor": [x, y], the point where it is held.
> - kind "leaf": a single loose or dead leaf still hanging on a plant that could fall; one object per leaf, at most 8, the most visible ones; motion ["fall"].
>   Never include people, robots, furniture or walls; a plant includes its trunk and branches but not its pot. For a light, also give "of": the id of the lamp it belongs to, if any.
>
> "box" is your best estimate of the object's bounding box in cover pixels. "color" is a different colour for every object, taken in order from this list and from nothing else:
> #FF0000 #00FF00 #0000FF #FFFF00 #FF00FF #00FFFF #FF8000 #8000FF #00FF80 #FF0080 #80FF00 #0080FF #FFFFFF #800000 #008000 #000080 #808000 #800080 #008080 #FF8080 #80FF80 #8080FF #FFC000 #C0C0C0
>
> Use the same colours in objects.png and objects.json. Save both files in the current directory.
