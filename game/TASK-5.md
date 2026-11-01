# Task 5: 256-colour palettes

`CONTRACT.md` changed: the palette has N colours, N up to 256, instead of exactly 32.
Work only inside `game/`, no git commands.

1. Accept any palette of N×1 pixels with 1 ≤ N ≤ 256; remove the 32 check.
2. The colour lookup is too coarse for 256 colours: use 64 steps per channel
   (a 64×64×64 3D texture), nearest colour in OKLab. Build it fast enough not to
   delay the start noticeably (under about 200 ms on a laptop): for example in a
   Web Worker, or with a coarse-to-fine search over the palette sorted in OKLab.
3. Keep the light bands and the dithered band edges as they are.
4. Regenerate the placeholders with a 256-colour palette and check that the
   rendering tests pass with both a 32 and a 256 colour palette.

Finish with a summary, including the measured lookup build time if you can measure it.
