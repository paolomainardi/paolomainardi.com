# Prompts for xremap-switchboard

The cover was made with the generate-image skill. The prompts are as sent.

**Motion brief:** the light comes in; the panel lamps take calls, switching on and off; the pendant breathes and swings; a light runs along the patch cables from the keyboard. Every lamp can be switched.

## Cover

Sent with one reference image: the docker-run-init-reaper cover.

> Subject: a cover for the blog post "Mastering Key Remapping on Linux: A Practical Guide with xremap". The idea: a small program sits between the keyboard and the system, catches every key press and sends it somewhere else, the way an old telephone operator patches each call to a different line.
>
> Scene: a quiet corner of an old telephone exchange, seen from a slight angle. A wooden switchboard stands against the wall, with rows of round sockets and, above them, small round indicator lamps, several of them lit softly. In front of it, on a wooden desk, sits a large vintage typewriter-style computer keyboard with chunky round keys. From the back of the keyboard one single rose cable rises and, a little above the desk, splits into five or six thin rose patch cables, each plugged into a different socket of the switchboard. An operator sits at the desk, seen from behind (a man, never a woman, no face shown), one hand plugging a patch cable into a socket. A single pendant lamp hangs from the ceiling on a visible cord above the desk, lit. Plenty of empty wall and paper around. No people other than the operator, no text.
>
> The rose patch cables are drawn clearly and continuously, a little thicker than a hair line, all joined at the one point where they leave the keyboard, and touch nothing else that is rose. The switchboard lamps and the pendant lamp are not rose: brass, cream and warm light.
>
> Style: loose ink line and light watercolour wash on lots of white paper, like a botanical sketch or an architect's watercolour study. A soft Japanese watercolour look: warm wood, stone and paper tones, clean ink outlines, gentle washes, calm picture-book background. Match the attached reference image's hand. Simple, few elements, bright, calm and editorial. Do not use anime, manga, chibi, comic, cartoon faces, big eyes, 3D render, photorealism, glossy highlights, or a dark or eerie mood. No letters, numbers, logos or watermarks, not even on the keys.
>
> Palette: paper #fbf7ef and #f1eee6, ink #1e1b17, muted ink #56504a and #6f685c, beige #e6ddcc and #cec3ad. One strong colour only: rose #a3526b, used only for the patch cables, pale tint #f8ecef. Wood in warm beige, brass sparingly.
>
> Landscape 3:2, 1536x1024. Save it as cover.png in the current directory.

## Night

Sent with the cover attached.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Redraw exactly the same scene, unchanged: same composition, every object in the exact same position and size, same line work. Only the colours change, for a website's dark colour scheme: paper #1a1917 (never pure black), cream ink #f0e9dc and #bcb3a6 for the lines, washes darkened and desaturated, soft rose #e5a3b2 as the one accent where the cover uses rose. A calm evening rather than an eerie night: the signal lamps and the lamp in the signal box glow warmly. No text, letters or numbers. Save the result as night.png in the current directory.

## Unlit

Sent with the cover attached.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Redraw exactly the same scene, unchanged: same composition, every object, figure and line in the exact same position and size, same loose ink line and soft watercolour hand. Only the light changes: this is the moment just before the lights come on. The pendant lamp and every indicator lamp of the switchboard are off: dark glass, no glow, no warm halo. The room is in a soft, cool shadow: the washes are dimmer and cooler, the wall and the wood a little greyer, the shadows deeper and broader, and only the edges of things catch a faint cool light from the upper right. Keep the paper, the palette and the rose patch cables; the mood stays calm, never eerie. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as unlit.png in the current directory.

## Unlit night

Sent with the night version attached.

> The attached image is the night version of an illustrated blog cover, 1536x1024 pixels. Redraw exactly the same scene, unchanged: same composition, every object, figure and line in the exact same position and size, same line work and palette. Only the light changes: this is the moment just before the lights come on. The pendant lamp and every indicator lamp of the switchboard are off: dark glass, no glow, no warm light on the wall, the desk or the operator. The room is in deep, quiet shadow, the cream lines dimmer, and only the upper edges of things catch a thin cool rim light from the upper right. Paper #1a1917, never pure black. The mood stays calm, never eerie. No text, letters or numbers. Landscape 3:2, 1536x1024. Save the result as unlit-night.png in the current directory.

## Object sheet

Sent with the cover attached. Made objects.json and objects.png.

> The attached image is an illustrated blog cover, 1536x1024 pixels. Produce an object sheet for it: two files in the current directory.
>
> 1. objects.png: ONE new image, same size and the exact same composition, every object in the exact same position, so it can be laid over the cover pixel for pixel. Flat colours on pure black (#000000), no shading, no outlines, no texture, no text. Paint each object listed in objects.json filled solid with its own colour, following its real silhouette. Everything else stays black.
>
> 2. objects.json: a JSON array, one entry per object, in this form:
>    {"id": "pendant-shade", "kind": "lamp", "label": "pendant lamp shade with its cord", "motion": ["swing"], "light": null, "box": [x0, y0, x1, y1], "color": "#0000FF"}
>
> What to include, and nothing else:
>
> - every light source, one object each: the bulb of the pendant lamp, and each indicator lamp of the switchboard that is lit in the picture. For a light, "kind" is "light", the painted area is the glowing glass only, and "light" says how it shines: "spot" for a small lamp, "pendant" for a bulb that lights the wall and the desk below it;
> - the pendant lamp shade with its cord, as one object, kind "lamp", motion ["swing"];
> - the rose patch cables, from the back of the keyboard to the sockets, as one object, kind "thread", motion ["pulse"].
>
> "box" is your best estimate of the object's bounding box in cover pixels. "color" is a different colour for every object, taken in order from this list and from nothing else:
> #FF0000 #00FF00 #0000FF #FFFF00 #FF00FF #00FFFF #FF8000 #8000FF #00FF80 #FF0080 #80FF00 #0080FF #FFFFFF #800000 #008000 #000080 #808000 #800080 #008080 #FF8080 #80FF80 #8080FF #FFC000 #C0C0C0
>
> Use the same colours in objects.png and objects.json. Save both files in the current directory.

## Anchors

Sent with the cover attached. Made extras.png; only its white dot, the lamp's hook, is used.

> The attached image is an illustrated blog cover, 1536x1024 pixels: an operator at an old telephone switchboard, under a pendant lamp. Produce a light and anchor sheet for it: ONE new image, extras.png, same size and the exact same composition, so it can be laid over the cover pixel for pixel. Pure black (#000000) background, flat colours, no shading, no outlines, no text. Paint only:
>
> - in yellow #FFFF00: the area the pendant lamp's light falls on, the warm pool of light on the wall, the switchboard, the operator and the desk below and around the lamp, as it appears in the picture, its shape following the real surfaces it lights;
> - in white #FFFFFF: one small round dot, about 10 pixels wide, exactly where the pendant lamp's cord is hung from the ceiling, at the top edge of the picture if the cord leaves it;
> - in cyan #00FFFF: one small round dot, about 10 pixels wide, exactly where the cord meets the lamp shade.
>   Everything else stays black. Save extras.png in the current directory.
