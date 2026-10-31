# Prompts for docker-macos-sea

The cover was drawn before the prompts were kept; its original prompt is lost. In 2026 its sky behind the laptop became a storm: cover.webp and night.webp here are the stormy versions, made from the original cover and night version with the prompts below.

**Motion brief:** a storm over the coast behind the laptop: rain in the sky and a lightning flash every 8 to 15 seconds; the waves roll, the container bobs, the storm clouds drift, the cypresses sway. The screen stays as it is.

## Night (of the original cover)

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

## Storm

Sent with the original cover attached. Made cover.webp.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Redraw exactly the same scene, unchanged: the laptop, the sea inside and outside the screen, the waves, the container, the lifebuoy and the coast in the exact same position and size, same loose ink line and soft watercolour hand. Only the weather changes, and only behind the laptop: the open paper sky above and behind the laptop and over the coast on the right becomes a storm sky, low grey and dusty blue storm clouds in soft watercolour washes, darker towards the top, with a few lighter gaps; the far sea and the coast under it fall into a soft grey shadow. Leave a margin of plain paper along the very top and the edges so the washes fade into the paper. Inside the laptop's screen nothing changes. No lightning, no rain. Keep the palette and the rose container; calm and editorial, never dark or eerie. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as storm.png in the current directory.

## Storm night

Sent with the original night version attached. Made night.webp.

> The attached image is the night version of an illustrated blog cover, 1536x1024 pixels. Redraw exactly the same scene, unchanged: the laptop, the sea inside and outside the screen, the waves, the container, the lifebuoy and the coast in the exact same position and size, same line work and palette. Only the weather changes, and only behind the laptop: the night sky above and behind the laptop and over the coast on the right becomes a storm sky, heavy storm clouds in deep blue grey washes with faint cream edges; the far sea and the coast under it fall into deeper shadow. Inside the laptop's screen nothing changes. No lightning, no rain. Paper #1a1917, never pure black. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as storm-night.png in the current directory.

## Lightning flash

Sent with the stormy cover attached.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Redraw exactly the same scene, unchanged: the laptop, everything inside its screen, the sea, the waves, the container, the coast and the storm clouds in the exact same position and size, same loose ink line and soft watercolour hand. Only the moment changes, and only in the storm sky behind the laptop: a lightning flash. One thin, branching lightning bolt drops from the storm clouds over the far sea, to the right of the laptop's screen, drawn in pale ink and white; the storm clouds around it are lit from within, paler and brighter; a cold light falls on the far sea and the coast. Inside the laptop's screen nothing changes. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as flash.png in the current directory.

## Lightning flash, night

Sent with the stormy night version attached.

> The attached image is the night version of an illustrated blog cover, 1536x1024 pixels. Redraw exactly the same scene, unchanged: the laptop, everything inside its screen, the sea, the waves, the container, the coast and the storm clouds in the exact same position and size, same line work and palette. Only the moment changes, and only in the storm sky behind the laptop: a lightning flash. One thin, branching lightning bolt drops from the storm clouds over the far sea, to the right of the laptop's screen, drawn in cream and white; the storm clouds around it are lit from within; a cold light falls on the far sea and the coast. Inside the laptop's screen nothing changes. Paper #1a1917, never pure black. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as flash-night.png in the current directory.

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
> - kind "sky": an open sky area, one object for each separate sky (the sky inside a screen or a window is a different object from the sky behind the scene); motion [].
> - kind "cloud": a cloud that could drift; motion ["drift"].
> - kind "thread": a cable or thread a light could run along; motion ["pulse"].
>   Never include people, robots, furniture or walls. For a light, also give "of": the id of the lamp it belongs to, if any.
>
> "box" is your best estimate of the object's bounding box in cover pixels. "color" is a different colour for every object, taken in order from this list and from nothing else:
> #FF0000 #00FF00 #0000FF #FFFF00 #FF00FF #00FFFF #FF8000 #8000FF #00FF80 #FF0080 #80FF00 #0080FF #FFFFFF #800000 #008000 #000080 #808000 #800080 #008080 #FF8080 #80FF80 #8080FF #FFC000 #C0C0C0
>
> Use the same colours in objects.png and objects.json. Save both files in the current directory.

## Rain

The shared texture in covers/_effects/rain.webp.
