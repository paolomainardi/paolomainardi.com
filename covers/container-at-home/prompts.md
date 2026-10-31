# Prompts for container-at-home

The cover was drawn before the prompts were kept, and was given its night
version and its motion later. Its original prompt is lost, and so are its
lossless masters: cover.webp and night.webp here are the published images.

**Motion brief:** the light comes in through the window, from the upper left; a
light runs along the three cables out of the container into the house; the desk
lamp breathes and the screen glows, and both can be pressed; steam rises from
the coffee; the tree outside the window sways. The indoor plants stay still.

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

> The attached image is an illustrated blog cover, 1536x1024 pixels: a rose shipping container plugged into a cosy room. Redraw exactly the same scene, unchanged: same composition, every object, plant, cable and line in the exact same position and size, same loose ink line and soft watercolour hand. Only the light changes: it is early morning, just before the sun comes in and before anything is switched on. The desk lamp is off, with no glow; the monitor screen is dark; there is no patch of sunlight on the floor or the walls, and the light from the window is low and cool. The room is in a soft, cool shadow: the washes a little dimmer and cooler. Keep the paper, the palette and the rose container; calm, never dark or eerie. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as unlit.png in the current directory.

## Unlit night

Sent with the night version attached.

> The attached image is the night version of an illustrated blog cover, 1536x1024 pixels: a rose shipping container plugged into a cosy room. Redraw exactly the same scene, unchanged: same composition, every object, plant, cable and line in the exact same position and size, same line work and palette. Only the light changes: it is the moment before anything is switched on. The desk lamp is off, with no warm glow; the monitor screen is dark; the window shows the night. The room is in deep, quiet shadow, the cream lines dimmer, only the upper edges of things catching a thin cool light. Paper #1a1917, never pure black. Calm, never eerie. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as unlit-night.png in the current directory.

## Object sheet

Sent with the cover attached.

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

## Steam

The shared texture in covers/_effects/steam.webp.
