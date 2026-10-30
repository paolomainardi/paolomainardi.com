"""Build the motion map of an animated cover.

Usage: motion_map.py <cover.webp> [--overlay <out.png>]

Reads, next to the cover, at least one of:
  <name>-motion-codex.png  the mask Codex painted, flat colours on black
  <name>-motion-spec.json  corrections and additions written on review
and, when it exists:
  <name>-night.webp        the night version, checked for alignment

Writes, next to the cover:
  <name>-motion.webp       twice the cover's height. Top half R: distance
                           along a pulse thread, G: wind, B: swing. Bottom
                           half R: water, G: floating, B: drift
  <name>-motion.json       anchors, lights, falling leaves and lit windows

The Codex mask says what moves and roughly where. The exact pixels come from
the cover itself, so a mask a pixel or two off still works. A mask or a night
version that does not line up with the cover fails the build.

The Codex mask colour code: green #00FF00 plants rooted at the bottom, cyan
#00FFFF things hanging from above (ivy, papers on a line), blue #0000FF pendant
lamps with their cord, yellow #FFFF00 wheels (ignored), red #FF0000 threads a
light runs along, white #FFFFFF a dot on each light, orange #FF8000 water,
magenta #FF00FF things floating on it. Everything else black.

The spec, all keys optional, coordinates in cover pixels, boxes [x0, y0, x1, y1]:
  exclude   boxes removed from every Codex region (a robot painted with the
            papers it stands next to)
  wind      [{box, root | hang, select: leaves | dark | all, contrast, amp,
            exclude}] parts Codex missed or redrew; root is the y of the
            ground, hang the y of the line
  swing     [{box, anchor, amp}] a rigid part that swings, the largest drawn
            shape in the box, about anchor (default: its top)
  glow      [{at, radius, strength}] a light Codex missed
  fall      [{sprite, from, floor, drift}] a leaf copied from the sprite box
            falls from `from` to the y of `floor`
  twinkle   [{box}] where to look for lit windows in the night version
  water     [{box, select: water | all, exclude}] water that ripples; water
            picks the blue and the foam on it
  float     [{box, amp, exclude}] a thing floating on the water, the largest
            shape in the box that is neither paper nor water; it bobs and rocks
            about its middle
  drift     [{box, exclude}] sky whose clouds slide slowly sideways
  glow_radius  the radius of Codex's lights, 110 by default

--overlay writes the cover with the regions painted over it, for review.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image
from scipy import ndimage as nd

CODES = {
    "green": (0, 255, 0),       # rooted plants: sway, more at the top
    "cyan": (0, 255, 255),      # hanging things: sway, more at the bottom
    "blue": (0, 0, 255),        # pendant lamps: swing about the top of the cord
    "yellow": (255, 255, 0),    # wheels: ignored, a turning wheel needs its own layer
    "red": (255, 0, 0),         # threads a light pulse runs along
    "white": (255, 255, 255),   # lights that glow
    "orange": (255, 128, 0),    # water: ripples
    "magenta": (255, 0, 255),   # floating things: bob and rock
}
MAX = {"swing": 4, "glow": 6, "fall": 4, "twinkle": 12, "float": 3}


def fail(msg):
    sys.exit("motion-map: " + msg)


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(float)


def edges(img):
    lum = img.mean(-1) if img.ndim == 3 else img
    return np.hypot(nd.sobel(lum, 0), nd.sobel(lum, 1))


def best_shift(a, b, reach):
    """The offset of b against a, in pixels, where their edges agree best."""
    a = a[reach:-reach, reach:-reach].ravel()
    best = (-2.0, 0, 0)
    for dy in range(-reach, reach + 1):
        for dx in range(-reach, reach + 1):
            s = np.roll(np.roll(b, dy, 0), dx, 1)[reach:-reach, reach:-reach].ravel()
            best = max(best, (float(np.corrcoef(a, s)[0, 1]), dx, dy))
    return best


def main():
    args = sys.argv[1:]
    if not args:
        fail("usage: motion_map.py <cover.webp> [--overlay <out.png>]")
    cover = args[0]
    overlay = args[args.index("--overlay") + 1] if "--overlay" in args else None
    stem = cover[: -len(".webp")]
    codex_path = stem + "-motion-codex.png"
    spec = {}
    if os.path.exists(stem + "-motion-spec.json"):
        spec = json.load(open(stem + "-motion-spec.json"))
    elif not os.path.exists(codex_path):
        fail("no Codex mask and no spec next to " + cover)

    im = load_rgb(cover)
    H, W, _ = im.shape
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    yy, xx = np.mgrid[0:H, 0:W]

    def box(bx):
        x0, y0, x1, y1 = bx
        return (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)

    def soft(m, grow, blur):
        return nd.gaussian_filter(nd.binary_dilation(m, iterations=grow).astype(float), blur)

    def drawn(region, contrast=28):
        """Pixels darker than the paper or wall around them."""
        bg = np.percentile(lum[region], 85)
        return region & (lum < bg - contrast)

    # The Codex mask, snapped to the nearest code colour. It has to sit on the
    # cover: Codex sometimes redraws a busy shape, such as a tree, instead of
    # tracing it, and then the spec has to describe that part instead.
    region = {k: np.zeros((H, W), bool) for k in CODES}
    if os.path.exists(codex_path):
        cm = np.asarray(Image.open(codex_path).convert("RGB").resize((W, H), Image.NEAREST)).astype(float)
        dist = np.stack([np.linalg.norm(cm - np.array(c), axis=-1) for c in CODES.values()])
        nearest = np.argmin(dist, 0)
        region = {k: (nearest == i) & (dist[i] < 120) for i, k in enumerate(CODES)}
        for e in spec.get("exclude", []):
            for k in region:
                region[k] &= ~box(e)
        painted = np.zeros((H, W), bool)
        for k in region:
            painted |= region[k]
        if painted.sum() < 200:
            fail("the Codex mask paints nothing")
        # Compared only around what the mask paints: on a small mask the rest
        # of the cover would drown it.
        outline = (painted ^ nd.binary_erosion(painted, iterations=2)).astype(float)
        ys, xs = np.where(painted)
        win = (slice(max(ys.min() - 24, 0), ys.max() + 25), slice(max(xs.min() - 24, 0), xs.max() + 25))
        corr, dx, dy = best_shift(nd.gaussian_filter(edges(im), 1.5)[win], nd.gaussian_filter(outline, 1.5)[win], 6)
        print(f"codex mask: best fit {dx:+d},{dy:+d} px (r={corr:.2f})")
        if abs(dx) > 2 or abs(dy) > 2:
            fail(f"the Codex mask is {dx:+d},{dy:+d} px off the cover; generate it again, or describe the parts in the spec")

    # The night version has to line up too: one map serves both.
    night = None
    if os.path.exists(stem + "-night.webp"):
        night = load_rgb(stem + "-night.webp")
        if night.shape != im.shape:
            fail("the night version has another size")
        corr, dx, dy = best_shift(edges(im), edges(night), 3)
        print(f"night version: best fit {dx:+d},{dy:+d} px (r={corr:.2f})")
        if abs(dx) > 1 or abs(dy) > 1:
            fail(f"the night version is {dx:+d},{dy:+d} px off the cover; one map cannot serve both")

    def parts(mask, min_px):
        lab, _ = nd.label(mask)
        for i, sl in enumerate(nd.find_objects(lab)):
            comp = lab == i + 1
            if comp.sum() >= min_px:
                yield comp, sl

    # Wind. The weight grows away from where the thing is held: the ground for
    # a plant, the line or the ledge for something that hangs.
    wind = np.zeros((H, W))

    def add_wind(m, bx, root=None, hang=None, amp=1.0):
        x0, y0, x1, y1 = bx
        if root is not None:
            ramp = np.clip((root - yy) / max(root - y0, 1), 0, 1)
        else:
            ramp = np.clip((yy - hang) / max(y1 - hang, 1), 0, 1)
        near = box([x0 - 8, y0 - 8, x1 + 8, y1 + 8])
        np.maximum(wind, soft(m, 4, 2.5) * ramp * amp * near, out=wind)

    for comp, (sy, sx) in parts(region["green"], 150):
        add_wind(nd.binary_dilation(comp, iterations=2), [sx.start, sy.start, sx.stop, sy.stop], root=sy.stop)
    for comp, (sy, sx) in parts(region["cyan"], 150):
        add_wind(nd.binary_dilation(comp, iterations=2), [sx.start, sy.start, sx.stop, sy.stop], hang=sy.start)
    for w in spec.get("wind", []):
        reg = box(w["box"])
        if w.get("select") == "all":
            m = reg
        elif w.get("select") == "dark":
            m = nd.binary_opening(drawn(reg, w.get("contrast", 35)) & (r - g < 30), iterations=1)
        else:
            bg = np.percentile(lum[reg], 85)
            leaf = (g > b + 6) & (g > r - 12) & (lum < bg - 12)
            petal = (r - g > 18) & (r - b > 8) & (lum < bg - 8)
            m = nd.binary_opening(reg & (leaf | petal), iterations=1)
        for e in w.get("exclude", []):
            m = m & ~box(e)
        add_wind(m, w["box"], root=w.get("root"), hang=w.get("hang"), amp=w.get("amp", 1.0))

    # Swinging parts: Codex's lamps, plus anything the spec adds by box.
    rigid = np.zeros((H, W))
    swings = []

    def add_swing(m, anchor=None, amp=None):
        ys, xs = np.where(m)
        top = int(ys.min())
        length = max(int(ys.max()) - top, 1)
        swings.append({
            "anchor": anchor or [int(np.median(xs[ys < top + 4])), top],
            "box": [int(xs.min()), top, int(xs.max()) + 1, int(ys.max()) + 1],
            # A long cord would throw the shade too far, so the angle shrinks with it.
            "amp": round(amp if amp is not None else min(1.0, 65.0 / length), 3),
        })
        np.maximum(rigid, soft(m, 6, 2), out=rigid)

    for comp, _ in parts(region["blue"], 150):
        add_swing(comp)
    for s in spec.get("swing", []):
        m = nd.binary_closing(drawn(box(s["box"])), iterations=2)
        lab, n = nd.label(m)
        if n == 0:
            fail(f"nothing drawn in swing box {s['box']}")
        m = nd.binary_fill_holes(lab == 1 + np.argmax(nd.sum(m, lab, range(1, n + 1))))
        add_swing(m, s.get("anchor"), s.get("amp"))

    # Lights: Codex's white dots. A dot on a lamp follows its swing.
    glows = []
    lamps = [nd.binary_dilation(np.zeros((H, W), bool) | box(s["box"]), iterations=6) for s in swings]
    for comp, (sy, sx) in parts(region["white"], 4):
        cy, cx = (sy.start + sy.stop) // 2, (sx.start + sx.stop) // 2
        on = [i for i, lp in enumerate(lamps) if lp[cy, cx]]
        glows.append({"at": [cx, cy], "radius": spec.get("glow_radius", 110), "strength": 1.0,
                      "swing": on[0] if on else -1})
    for gl in spec.get("glow", []):
        glows.append({"at": gl["at"], "radius": gl.get("radius", 110),
                      "strength": gl.get("strength", 1.0), "swing": gl.get("swing", -1)})

    # Pulse: whole blush threads that Codex's red touches, and the distance
    # along them to the point where they meet.
    along = np.zeros((H, W))
    if region["red"].sum() > 200:
        thread = (r - g > 45) & (r - b > 15) & (g < 150)
        lab, n = nd.label(thread)
        big = 1 + np.where(nd.sum(thread, lab, range(1, n + 1)) > 40)[0]
        touched = np.unique(lab[thread & nd.binary_dilation(region["red"], iterations=6)])
        thread = np.isin(lab, np.intersect1d(big, touched))
        if thread.any():
            dens = nd.uniform_filter(region["red"].astype(float), 41)
            sy, sx = np.unravel_index(np.argmax(dens), dens.shape)
            path = nd.binary_dilation(thread, iterations=3)
            d = np.full((H, W), np.inf)
            q = deque()
            for y, x in zip(*np.where(path & box([sx - 40, sy - 40, sx + 40, sy + 40]))):
                d[y, x] = 0
                q.append((y, x))
            while q:
                y, x = q.popleft()
                for ddy in (-1, 0, 1):
                    for ddx in (-1, 0, 1):
                        ny, nx = y + ddy, x + ddx
                        if 0 <= ny < H and 0 <= nx < W and path[ny, nx] and d[ny, nx] == np.inf:
                            d[ny, nx] = d[y, x] + (1.414 if ddx and ddy else 1)
                            q.append((ny, nx))
            reach = np.isfinite(d)
            if reach.any() and d[reach].max() > 0:
                a = nd.grey_dilation(np.where(reach, d / d[reach].max(), 0), size=7)
                on_thread = nd.binary_dilation(thread, iterations=2)
                along = np.where(on_thread, np.maximum(a, 2 / 255), 0)

    # Lit windows in the night version: small bright warm spots with dark around.
    twinkle = []
    if night is not None:
        nr, ng, nb = night[..., 0], night[..., 1], night[..., 2]
        dark_around = nd.percentile_filter(0.3 * nr + 0.59 * ng + 0.11 * nb, 30, size=21) < 50
        for tw in spec.get("twinkle", []):
            lit = box(tw["box"]) & (nr > 175) & (ng > 110) & (nr - nb > 80) & dark_around
            lab, _ = nd.label(nd.binary_dilation(lit, iterations=1))
            for sy, sx in nd.find_objects(lab):
                h, w = sy.stop - sy.start, sx.stop - sx.start
                if 2 <= h <= 20 and 2 <= w <= 20:
                    twinkle.append([(sx.start + sx.stop) / 2, (sy.start + sy.stop) / 2,
                                    max(h, w) / 2 + 2, round((len(twinkle) * 0.618) % 1, 3)])

    # Water ripples, with the blue and the foam riding on it.
    water = soft(nd.binary_dilation(region["orange"], iterations=2), 2, 3)
    blue_water = (b - r > 6) & (lum < 235)
    foam = (lum > 200) & nd.binary_dilation(blue_water, iterations=6)
    for w in spec.get("water", []):
        m = box(w["box"]) & (True if w.get("select") == "all" else (blue_water | foam))
        for e in w.get("exclude", []):
            m = m & ~box(e)
        # Closed and filled, so foam crests inside the water move with it.
        m = nd.binary_fill_holes(nd.binary_closing(m, iterations=6)) & box(w["box"])
        for e in w.get("exclude", []):
            m = m & ~box(e)
        np.maximum(water, soft(m, 2, 3), out=water)

    # Floating things bob and rock about their middle.
    floating, floats = np.zeros((H, W)), []

    def add_float(m, amp):
        ys, xs = np.where(m)
        floats.append({"center": [int(xs.mean()), int(ys.mean())],
                       "box": [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
                       "amp": amp})
        np.maximum(floating, soft(m, 5, 2), out=floating)

    for comp, _ in parts(region["magenta"], 150):
        add_float(comp, 1.0)
    for fl in spec.get("float", []):
        reg = box(fl["box"])
        bg = np.percentile(lum[reg], 85)
        m = reg & ~blue_water & ~foam & (lum < bg - 10)
        for e in fl.get("exclude", []):
            m = m & ~box(e)
        m = nd.binary_fill_holes(nd.binary_closing(m, iterations=3))
        lab, n = nd.label(m)
        if n == 0:
            fail(f"nothing floating in box {fl['box']}")
        add_float(lab == 1 + np.argmax(nd.sum(m, lab, range(1, n + 1))), fl.get("amp", 1.0))

    # Drift: the sky slides slowly, feathered so its edges do not tear.
    drift = np.zeros((H, W))
    for d_ in spec.get("drift", []):
        m = box(d_["box"])
        for e in d_.get("exclude", []):
            m = m & ~box(e)
        np.maximum(drift, nd.gaussian_filter(nd.binary_erosion(m, iterations=12).astype(float), 6), out=drift)

    for k, v in (("swing", swings), ("glow", glows), ("fall", spec.get("fall", [])), ("twinkle", twinkle), ("float", floats)):
        if len(v) > MAX[k]:
            fail(f"{len(v)} {k} entries, the player takes {MAX[k]}")

    if wind.max() > 0:
        wind /= wind.max()
    rgb = np.clip(np.concatenate([np.stack([along, wind, rigid], -1),
                                  np.stack([water, floating, drift], -1)], 0), 0, 1)
    Image.fromarray((rgb * 255).round().astype(np.uint8), "RGB").save(stem + "-motion.webp", lossless=True, quality=100, method=6)
    json.dump({"size": [W, H], "swing": swings, "glow": glows, "fall": spec.get("fall", []), "twinkle": twinkle,
               "float": floats},
              open(stem + "-motion.json", "w"), separators=(",", ":"))
    print(f"{len(swings)} swing, {len(glows)} glow, {len(spec.get('fall', []))} fall, {len(twinkle)} twinkle,"
          f" {len(floats)} float, wind {int((wind > 0.05).sum())} px, pulse {int((along > 0).sum())} px,"
          f" water {int((water > 0.05).sum())} px, drift {int((drift > 0.05).sum())} px")

    if overlay:
        show = np.zeros((H, W, 3))
        show[..., 0] = (along > 0) * 255
        show[..., 1] = wind * 255
        show[..., 2] = np.maximum(rigid, floating) * 255
        show[..., 0] = np.maximum(show[..., 0], water * 255)
        show[..., 1] = np.maximum(show[..., 1], water * 128 + drift * 90)
        for gl in glows:
            x, y = gl["at"]
            show[max(y - 4, 0):y + 5, max(x - 4, 0):x + 5] = 255
        mix = np.where(show.max(-1, keepdims=True) > 10, im * 0.4 + show * 0.6, im * 0.55)
        Image.fromarray(mix.clip(0, 255).astype(np.uint8)).save(overlay)


main()
