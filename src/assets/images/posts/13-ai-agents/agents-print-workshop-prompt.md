# Prompts for agents-print-workshop

The cover was drawn before the prompts were kept, and was given its night
version and its motion later. Its original prompt is lost; the prompts
below are the ones used afterwards.

**Motion:** the lamp swings, the lights glow, the plants sway, the lit windows go dark one by one. Yellow then meant a wheel that spins; the spec excludes the press wheel, since yellow now means a lighthouse beam.

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

## Motion mask

Sent with the cover attached.

> The attached image is an illustrated blog cover, 1536x1024 pixels.
>
> Generate ONE new image: a motion mask for this cover. Same size and the exact same composition, every object in the exact same position, so the mask can be laid over the cover pixel for pixel.
>
> The mask is flat colours on pure black (#000000). No shading, no outlines, no texture, no text. Paint only the things that should move, each filled solid with its code colour, following the object's real silhouette:
>
> - Green #00FF00: plants and flowers rooted at the bottom, which sway in the wind.
> - Cyan #00FFFF: things hanging from above that sway: trailing ivy, papers pegged on a line.
> - Blue #0000FF: pendant lamps hanging from a cord, cord included, which swing.
> - Yellow #FFFF00: wheels that can spin, such as a flywheel.
> - Red #FF0000: cables or threads along which a light pulse can travel.
> - White #FFFFFF: a small dot on each light bulb that is lit or could glow.
>
> Everything else stays black. Do not paint people, robots, furniture, walls or windows.
>
> Save the result as mask.png in the current directory.
