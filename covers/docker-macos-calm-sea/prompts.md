# Prompts for docker-macos-calm-sea

The cover was made with the generate-image skill. The prompts are as sent.

**Motion brief:** the sea swells, the container bobs, the lifebuoy swings, the lighthouses sweep their beams, the clouds drift, the trees on the coast sway.

## Cover

Sent with two reference images: the docker-macos-sea cover and the
docker-run-init-reaper cover.

> Subject: a cover for the blog post "Docker on MacOS is still slow?", written two years after an earlier post about the same problem. The idea: things have improved a lot, the water is calmer, and there are now three good options to choose from depending on your needs (open source, maximum speed, stable).
>
> Scene: an open laptop seen from a slight angle on a pale paper ground, as in the first reference image. Its screen opens onto a calm sea that spills gently onto the keyboard. The same rose shipping container from the reference now floats upright and steady on soft, low swells, no longer tossed by waves, with a small lifebuoy hanging on its side. On a gentle coastline at the right, three small lighthouses of different shapes stand at different distances, each with its lantern lit softly, showing the way. A few soft clouds in a pale sky. Plenty of empty space. No people, no text.
>
> Style: loose ink line and light watercolour wash on lots of white paper, like a botanical sketch or an architect's watercolour study. A soft Japanese watercolour look: warm wood, stone and paper tones, clean ink outlines, gentle washes, calm picture-book background. Match the second reference image's hand and the first one's laptop and container. Simple, few elements, bright, calm and editorial. Do not use anime, manga, chibi, comic, cartoon faces, big eyes, 3D render, photorealism, glossy highlights, or a dark or eerie mood. No letters, numbers, logos or watermarks.
>
> Palette: paper #fbf7ef and #f1eee6, ink #1e1b17, muted ink #56504a and #6f685c, beige #e6ddcc and #cec3ad. One strong colour only: rose #a3526b for the container, pale tint #f8ecef. Sea in desaturated dusty blue and grey, sparingly. Lighthouses in stone, cream and a little rose.
>
> Landscape 3:2, 1536x1024. Save it as cover.png in the current directory.

## Night

Sent with the cover attached.

> Redraw the attached cover as its night version: the same scene, unchanged, every object in the exact same position and size, redrawn for a dark page. Paper #1a1917 (never pure black), cream ink #f0e9dc and #bcb3a6, washes darkened and desaturated, soft rose #e5a3b2 as the one accent. A calm evening rather than an eerie night: the three lighthouse lanterns glow warmly and their light reflects on the water. No text, no letters, no logos. Landscape 3:2, 1536x1024. Save it as night.png in the current directory.

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
> - kind "light": every light source that is lit or could be lit. The painted area is the glowing part only (a bulb, a lamp's glass, a lit window pane, a lighthouse lantern). "light" says how it shines: "spot" a small lamp, "pendant" a hanging bulb that lights the area below it, "desk" a desk or wall lamp that lights a pool in front of it, "window" a window pane of daylight or a lit window far away, "lighthouse" a lighthouse lantern. "of": the id of the lamp body it belongs to, if any. "label": two or three words naming the lamp for a screen reader, such as "Pendant lamp".
> - kind "lamp": a lamp body that hangs on a cord and could swing, cord included; motion ["swing"].
> - kind "tool": something held or hanging that could swing, such as a rake in a hand or a sign on a hook; motion ["swing"]; "anchor": [x, y], the point where it is held.
> - kind "plant": a plant or a tree that could sway, trunk and branches included, never its pot; "outdoor": true when it grows outside in the open air, false when it is indoors; motion ["sway"].
> - kind "leaf": a single loose or dead leaf still hanging on a plant that could fall; one object per leaf, at most 8, the most visible ones; motion ["fall"].
> - kind "water": water that could ripple; motion ["ripple"].
> - kind "float": something floating on water; motion ["bob"].
> - kind "sky": an open sky area, one object for each separate sky (the sky inside a screen, a picture or a window is a different object from the sky behind the scene); motion [].
> - kind "cloud": a cloud that could drift; motion ["drift"].
> - kind "thread": a cable, wire or thread a light could run along, one object for all the threads that meet; motion ["pulse"].
>   Never include people, robots, furniture or walls.
>
> "box" is your best estimate of the object's bounding box in cover pixels. "color" is a different colour for every object, taken in order from this list and from nothing else:
> #FF0000 #00FF00 #0000FF #FFFF00 #FF00FF #00FFFF #FF8000 #8000FF #00FF80 #FF0080 #80FF00 #0080FF #FFFFFF #800000 #008000 #000080 #808000 #800080 #008080 #FF8080 #80FF80 #8080FF #FFC000 #C0C0C0
>
> Use the same colours in objects.png and objects.json. Save both files in the current directory.
