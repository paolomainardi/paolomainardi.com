"""Build an animated cover from its sources.

Usage: build.py covers/<name> [--review <out.png>]

The sources of a cover live in covers/<name>/, outside what Hugo serves:

  cover.webp, night.webp          the cover and its night version (lossless masters)
  unlit.webp, unlit-night.webp    the scene before its light comes in (for lights and the light entry)
  flash.webp, flash-night.webp    the scene during a lightning flash (for a storm)
  objects.json, objects.png       the object sheet Codex made: meaning from the JSON, shapes from the PNG
  objects-<pass>.json, .png       optional further sheets, such as objects-limbs for a second pass on the figures
  extras.png                      optional: a white dot where a swinging lamp is hung
  spec.json                       the choices Codex cannot make (keys below)
  prompts.md                      the brief and every prompt that made the drawings

It writes, at the spec's "publish" path (src/assets/images/posts/<post>/<name>):

  <name>.webp and the other drawings as WebP, <name>-motion.webp, <name>-motion.json

<name>-motion.webp is three times the cover's height. Band 1: R the distance along a
thread, G wind, B the parts that turn (lamps, tools, limbs). Band 2: R water, G
floating things, B drift. Band 3: R the sky where rain falls, lightning shows and a
shooting star passes, G window glass, B the phase of each star.

With actors or a shooting star it also writes <name>-sprites.webp, their frames in one atlas.

Object kinds: light (spot, pendant, desk, screen, window, lighthouse), lamp, tool,
limb, plant, leaf, water, float, sky, cloud, thread, steam. See docs/cover-engine.md.

Spec keys, all optional except publish:
  publish     path and name of the published cover, without extension
  entry       true: the light comes in when the cover is first shown (needs unlit.webp)
  light_from  where that light comes from, an angle in degrees, 0 from the right,
              90 from above; 62 by default (the upper right)
  lights      {pattern: {spot: calls|wave|breathe}, breathe: speed (1 normal, 0.5 slower), glow: strength}
  storm       {sky: [ids] or "glass"} the sky where rain falls and lightning shows (needs flash.webp)
  rain        {speed, opacity, scale}       flash {every: [min, max] s, strength, fade s}
  glass       [kinds, ids or "window"] the panes rain is seen through and drops run down
  drops       true: drops run down the glass
  still       [kinds or ids] that do not move; indoor plants never move
  drift       [ids] clouds that drift (all clouds by default)
  pulse       {from: "bottom" | "top" | [x, y]}, or false: where the light along a thread starts
  floor       the y where falling leaves land
  twinkle     [{box}] where to look for lit windows in the night version
  amp         {id: factor} to make one thing move more or less
  exclude     [[x0, y0, x1, y1]] areas that never move
  stars       true or {depth}: the stars in the sky objects breathe, each at its own pace
  meteor      {every: [min, max] s, length}: a shooting star crosses the sky objects now and then
  actors      [{id, sheet, grid, walk, fps, end, height, path, speed, delay, bob, tilt}]:
              characters drawn apart from the scene that move along a path (see docs)
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image
from scipy import ndimage as nd


def fail(msg):
    sys.exit("cover-engine: " + msg)


if len(sys.argv) < 2:
    fail("usage: build.py covers/<name> [--review <out.png>]")
src = sys.argv[1].rstrip("/")
review = sys.argv[sys.argv.index("--review") + 1] if "--review" in sys.argv else None


def path(name):
    return os.path.join(src, name)


def load(name):
    return Image.open(path(name)).convert("RGB") if os.path.exists(path(name)) else None


spec = json.load(open(path("spec.json"))) if os.path.exists(path("spec.json")) else {}
if "publish" not in spec:
    fail("spec.json needs publish, the path of the published cover without extension")
cover = load("cover.webp")
if cover is None:
    fail(f"{src} has no cover.webp")
W, H = cover.size
yy, xx = np.mgrid[0:H, 0:W]


def edges(im):
    a = np.asarray(im.convert("L").resize((W // 2, H // 2)), float)
    return np.hypot(nd.sobel(a, 0), nd.sobel(a, 1))


def shift(a, b, r=4):
    best = (-1.0, 0, 0)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            c = np.corrcoef(a[r:-r, r:-r].ravel(), np.roll(np.roll(b, dy, 0), dx, 1)[r:-r, r:-r].ravel())[0, 1]
            if np.isfinite(c) and c > best[0]:
                best = (c, dx * 2, dy * 2)
    return best


# Every drawing must lie on its cover: one map serves them all. A state drawing
# is compared with the drawing it was made from, the cover or the night version.
night = load("night.webp")
if night is None:
    fail(f"{src} has no night.webp")
drawings = {"night": night}
refs = {"day": edges(cover), "night": edges(night)}
for name in ["night", "unlit", "flash", "unlit-night", "flash-night"]:
    im = drawings.get(name) or load(name + ".webp")
    if im is None:
        continue
    if im.size != (W, H):
        fail(f"{name}.webp is not {W}x{H}")
    drawings[name] = im
    c, dx, dy = shift(refs["night" if name.endswith("-night") else "day"], edges(im))
    print(f"{name + '.webp':<17} {dx:+d},{dy:+d} px (r={c:.2f})")
    # a blank or unrelated drawing has no edges in common with the cover
    if not np.isfinite(c) or c < 0.4:
        fail(f"{name}.webp does not match the cover (r={c:.2f}); draw it again from the cover")
    if abs(dx) > 2 or abs(dy) > 2:
        fail(f"{name}.webp is {dx:+d},{dy:+d} px off the cover; draw it again from the cover")

sheets = []
for name in ["objects"] + sorted(f[:-5] for f in os.listdir(src) if f.startswith("objects-") and f.endswith(".json")):
    if not os.path.exists(path(name + ".png")):
        fail(f"{name}.json has no {name}.png")
    sheet = np.asarray(Image.open(path(name + ".png")).convert("RGB")).astype(int)
    if sheet.shape[:2] != (H, W):
        fail(f"{name}.png is not the size of the cover")
    sheets.append((json.load(open(path(name + ".json"))), sheet))


def paint(o, sheet):
    """The object's painted shape: its colour, without the thin strips where two colours blend."""
    c = np.array([int(o["color"][i:i + 2], 16) for i in (1, 3, 5)])
    m = (np.abs(sheet - c).max(-1) < 48) & (sheet.max(-1) > 40)
    m = nd.binary_opening(m, iterations=1)
    lab, n = nd.label(m)
    if n == 0:
        return None
    sizes = nd.sum(m, lab, range(1, n + 1))
    return np.isin(lab, 1 + np.where(sizes >= min(sizes.max(), max(8, sizes.max() * 0.25)))[0])


def box_of(m):
    ys, xs = np.where(m)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def soft(m, grow, blur):
    if grow:
        m = nd.binary_dilation(m, iterations=grow)
    return np.clip(nd.gaussian_filter(m.astype(float), blur) * 1.4, 0, 1)


masks, ids = {}, {}
for o, sheet in ((o, sh) for objs, sh in sheets for o in objs):
    if o["id"] in ids:
        fail(f"two objects are called {o['id']}")
    m = paint(o, sheet)
    if m is None:
        print(f"skip {o['id']}: not painted in objects.png")
        continue
    masks[o["id"]], ids[o["id"]] = m, o
    # the painting is the truth; a box Codex wrote far from it is only reported
    b, cx, cy = box_of(m), xx[m].mean(), yy[m].mean()
    if o.get("box") and max(abs(cx - (o["box"][0] + o["box"][2]) / 2), abs(cy - (o["box"][1] + o["box"][3]) / 2)) > 80:
        print(f"note {o['id']}: painted away from the box Codex wrote; the painting wins")

extras = load("extras.png")
ex = np.asarray(extras).astype(int) if extras else None


def dot(color):
    if ex is None:
        return None
    m = np.abs(ex - np.array(color)).max(-1) < 60
    return [int(xx[m].mean()), int(yy[m].mean())] if m.sum() > 5 else None


still = set(spec.get("still", []))
amp = spec.get("amp", {})
storm = spec.get("storm") or {}
sky_ids = storm.get("sky", []) if isinstance(storm.get("sky"), list) else []
drift_ids = spec.get("drift", [i for i, o in ids.items() if o["kind"] == "cloud"])
pulse_spec = spec.get("pulse", {})

pulse, wind, turn = (np.zeros((H, W)) for _ in range(3))
water, floatc, drift = (np.zeros((H, W)) for _ in range(3))
sky, glass = np.zeros((H, W)), np.zeros((H, W))
swings, floats, falls, lights, beams, steams = [], [], [], [], [], []

for i, o in ids.items():
    m, k = masks[i], o["kind"]
    if k in still or i in still or (k == "plant" and o.get("outdoor") is False):
        continue
    b, a = box_of(m), amp.get(i, 1.0)
    if k == "plant":
        # a plant sways more the further it is from its root, the foot of its shape
        ramp = np.clip((b[3] - yy) / max(b[3] - b[1], 1), 0, 1)
        np.maximum(wind, soft(m, 2, 2.5) * ramp * a, out=wind)
    elif k == "water":
        np.maximum(water, soft(m, 2, 3) * a, out=water)
    elif k == "float":
        floats.append({"center": [int(xx[m].mean()), int(yy[m].mean())], "box": b, "amp": a})
        np.maximum(floatc, soft(m, 12, 3), out=floatc)
    elif k in ("lamp", "tool", "limb"):
        hook = o.get("anchor") if k != "lamp" else dot((255, 255, 255))
        if hook is None:
            hook = [int(np.median(xx[m & (yy < b[1] + 4)])), b[1]]
        length = max(max(b[3] - hook[1], b[2] - b[0]), 1)
        # a limb turns about 5 degrees at most; a lamp or a tool swings more the shorter it is
        base = 1.6 if k == "limb" else min(1.0, 65.0 / length)
        swings.append({"id": i, "anchor": [int(hook[0]), int(hook[1])], "box": b, "amp": round(base * a, 3), "idle": k == "limb"})
        np.maximum(turn, soft(m, 4 if k == "limb" else 6, 2), out=turn)
    elif k == "thread" and pulse_spec is not False:
        frm = pulse_spec.get("from", "bottom") if isinstance(pulse_spec, dict) else "bottom"
        ys, xs = np.where(m)
        if isinstance(frm, list):
            # the start the spec names, moved onto the nearest painted thread
            j = ((xs - frm[0]) ** 2 + (ys - frm[1]) ** 2).argmin()
        else:
            j = ys.argmax() if frm == "bottom" else ys.argmin()
        sx, sy = xs[j], ys[j]
        on = nd.binary_dilation(m, iterations=3)
        dist = np.full((H, W), np.inf)
        q = deque()
        for y, x in zip(*np.where(on & (np.abs(xx - sx) < 12) & (np.abs(yy - sy) < 12))):
            dist[y, x] = 0
            q.append((y, x))
        while q:
            y, x = q.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and on[ny, nx] and dist[ny, nx] == np.inf:
                        dist[ny, nx] = dist[y, x] + (1.414 if dx and dy else 1)
                        q.append((ny, nx))
        reach = np.isfinite(dist)
        if reach.any() and dist[reach].max() > 0:
            # the light runs away from where the threads start
            along = np.where(reach, 1 - dist / dist[reach].max(), 0)
            near = nd.binary_dilation(m, iterations=2)
            np.maximum(pulse, np.where(near, np.maximum(nd.grey_dilation(along, size=5), 2 / 255), 0), out=pulse)
    elif k == "steam":
        # steam rises from the middle of the opening, as wide as the opening
        steams.append([int(xx[m].mean()), b[1], max(b[2] - b[0], 12), round((len(steams) * 0.43) % 1, 3)])
    elif k == "leaf":
        falls.append({"sprite": b, "from": [int(xx[m].mean()), int(yy[m].mean())],
                      "floor": spec.get("floor", min(H - 20, b[3] + 300)), "drift": 14 + (len(falls) * 7) % 16})
    if i in drift_ids:
        e = nd.binary_erosion(m, iterations=min(30, max(2, int(np.sqrt(m.sum()) / 12))))
        np.maximum(drift, np.clip(nd.gaussian_filter(e.astype(float), 18) * 1.5, 0, 1), out=drift)
    if i in sky_ids:
        np.maximum(sky, np.clip(nd.gaussian_filter(m.astype(float), 8), 0, 1), out=sky)

gsel = spec.get("glass", [])
for i, o in ids.items():
    if i in gsel or o["kind"] in gsel or ("window" in gsel and o.get("light") == "window"):
        np.maximum(glass, np.clip(nd.gaussian_filter(masks[i].astype(float), 1.5), 0, 1), out=glass)
if storm.get("sky") == "glass":
    sky = glass.copy()
elif storm:
    # the storm's sky never covers a sky drawn inside the scene, such as a screen
    for i, o in ids.items():
        if o["kind"] in ("sky", "cloud") and i not in sky_ids:
            sky[nd.binary_dilation(masks[i], iterations=4)] = 0

turn_of = {s["id"]: n for n, s in enumerate(swings)}
for i, o in ids.items():
    if o["kind"] != "light":
        continue
    m = masks[i]
    b = box_of(m)
    cx, cy = int(xx[m].mean()), int(yy[m].mean())
    w, h = b[2] - b[0], b[3] - b[1]
    kind = o.get("light") or "spot"
    if kind == "lighthouse":
        # a lighthouse sweeps its beam round; it reaches further the taller the lantern
        beams.append([cx, cy, int(np.clip(30 * h, 150, 360)), round((len(beams) * 0.37) % 1, 3)])
        continue
    if kind == "window":
        continue
    big = kind in ("pendant", "desk", "screen")
    pool = {"pendant": [cx, cy + 120, 260, 260], "desk": [cx, cy + 60, 200, 170],
            "screen": [cx, cy, int(w * 0.75) + 30, int(h * 0.75) + 30]}.get(kind, [cx, cy, int(w * 0.7) + 2, int(h * 0.7) + 2])
    hit = b
    if o.get("of") in masks:
        lb = box_of(masks[o["of"]])
        hit = [min(lb[0], b[0]), min(lb[1], b[1]), max(lb[2], b[2]), max(lb[3], b[3])]
    lights.append({"id": i, "label": o.get("label", i), "kind": kind, "big": big, "cool": kind == "screen", "pool": pool, "hit": hit,
                   "swing": turn_of.get(o.get("of"), -1)})

twinkle = []
if spec.get("twinkle"):
    na = np.asarray(night).astype(float)
    nr, ng, nb = na[..., 0], na[..., 1], na[..., 2]
    dark_around = nd.percentile_filter(0.3 * nr + 0.59 * ng + 0.11 * nb, 30, size=21) < 50
    for tw in spec["twinkle"]:
        b = tw["box"]
        inside = (xx >= b[0]) & (xx < b[2]) & (yy >= b[1]) & (yy < b[3])
        lit = inside & (nr > 175) & (ng > 110) & (nr - nb > 80) & dark_around
        lab, _ = nd.label(nd.binary_dilation(lit, iterations=1))
        for sl in nd.find_objects(lab):
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if 2 <= h <= 20 and 2 <= w <= 20:
                twinkle.append([(sl[1].start + sl[1].stop) / 2, (sl[0].start + sl[0].stop) / 2, max(h, w) / 2 + 2,
                                round((len(twinkle) * 0.618) % 1, 3)])

# The sky the stars and the shooting star belong to: every sky object, unless a storm
# already named its own.
sky_all = np.zeros((H, W), bool)
for i, o in ids.items():
    if o["kind"] == "sky":
        sky_all |= masks[i]
if (spec.get("stars") or spec.get("meteor")) and not sky_all.any():
    fail("stars and meteor need a sky object in the object sheet")
if spec.get("meteor") and not storm:
    sky = np.clip(nd.gaussian_filter(nd.binary_erosion(sky_all, iterations=3).astype(float), 3), 0, 1)

# Stars: the small bright spots of the sky. Each gets its own phase in the blue
# channel of the third band, flat over the star so the filtering never mixes two phases.
starc = np.zeros((H, W))
nstars = 0
if spec.get("stars"):
    lum = np.asarray(cover.convert("L"), float)
    blue = np.asarray(cover).astype(float)[..., 2]
    peak = lum - nd.median_filter(lum, size=25)
    # a painted star stands well above the sky around it, the grain of the paper does not;
    # it is pale, an autumn leaf against the sky is not
    spots = nd.binary_erosion(sky_all, iterations=4) & (peak > 60) & (lum > 110) & (blue > 90)
    lab, n = nd.label(nd.binary_dilation(spots, iterations=1))
    for k, sl in enumerate(nd.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h > 40 or w > 40:
            continue
        nstars += 1
        blob = nd.binary_dilation(lab == k, iterations=2)
        starc[blob] = 0.1 + 0.9 * ((nstars * 0.618) % 1)

# Sprites: actors and the shooting star are drawn apart from the scene and packed in one
# atlas, <name>-sprites.webp, so they take a single texture unit.
sprites = []


def key_out(im):
    """A sheet without transparency is keyed out on its flat background."""
    a = np.asarray(im).astype(float)
    if a[..., 3].min() < 250:
        return im
    bg = np.median(np.concatenate([a[0, :, :3], a[-1, :, :3], a[:, 0, :3], a[:, -1, :3]]), 0)
    d = np.abs(a[..., :3] - bg).max(-1)
    a[..., 3] = np.clip((d - 40) / 60, 0, 1) * 255
    return Image.fromarray(a.round().astype(np.uint8), "RGBA")


def bleed(im):
    """Colour under the transparent pixels from the nearest painted one, so filtering at
    the edge never pulls in black."""
    a = np.asarray(im).copy()
    solid = a[..., 3] > 8
    if solid.any():
        _, (iy, ix) = nd.distance_transform_edt(~solid, return_indices=True)
        a[..., :3] = a[iy, ix, :3]
    return Image.fromarray(a, "RGBA")


def add_sprite(im):
    sprites.append(bleed(im))
    return len(sprites) - 1


actors = []
for a in spec.get("actors", []):
    sheet = key_out(Image.open(path(a["sheet"])).convert("RGBA"))
    cols, rows = a.get("grid", [1, 1])
    cw, ch = sheet.width // cols, sheet.height // rows
    cells = [sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(rows) for c in range(cols)]
    # every frame stands on the same feet: the bottom of the drawing, under the middle of
    # its upper body, which does not move when the legs do
    feet = []
    for cell in cells:
        al = np.asarray(cell)[..., 3] > 32
        if not al.any():
            fail(f"actor {a['id']}: a cell of {a['sheet']} is empty")
        ys, xs = np.where(al)
        top, bot = ys.min(), ys.max() + 1
        upper = ys < top + (bot - top) * 0.6
        feet.append((int(xs[upper].mean()), int(bot), xs.min(), xs.max() + 1, top))
    left = max(f[0] - f[2] for f in feet) + 2
    right = max(f[3] - f[0] for f in feet) + 2
    up = max(f[1] - f[4] for f in feet) + 2
    # stored at twice the size it is shown in the cover, for screens at two pixels a pixel
    k = min(1.0, 2 * a["height"] / up)
    frames = []
    for cell, f in zip(cells, feet):
        fr = cell.crop((f[0] - left, f[1] - up, f[0] + right, f[1] + 2))
        frames.append(add_sprite(fr.resize((max(1, round(fr.width * k)), max(1, round(fr.height * k))), Image.LANCZOS)))
    walk = a.get("walk", [0, len(cells) - 1])
    actors.append({"id": a["id"], "frames": frames, "anchor": [round(left * k), round(up * k)], "k": round(1 / k * a["height"] / up, 4),
                   "path": a["path"], "speed": a.get("speed", 60), "delay": a.get("delay", 0), "fps": a.get("fps", 8),
                   "walk": walk, "end": a.get("end", -1), "bob": a.get("bob", 0), "tilt": bool(a.get("tilt"))})

meteor = None
if spec.get("meteor"):
    mk = spec["meteor"] if isinstance(spec["meteor"], dict) else {}
    mpath = os.path.join(os.path.dirname(src), "_effects", "meteor.webp")
    if not os.path.exists(mpath):
        fail("meteor needs covers/_effects/meteor.webp")
    mim = key_out(Image.open(mpath).convert("RGBA"))
    length = mk.get("length", int(W * 0.18))
    mk2 = min(1.0, 2 * length / mim.width)
    mim = mim.resize((round(mim.width * mk2), round(mim.height * mk2)), Image.LANCZOS)
    meteor = {"sprite": add_sprite(mim), "k": round(length / mim.width, 4), "every": mk.get("every", [20, 40])}

rects = []
if sprites:
    # shelves: sprites side by side, a new row when the next one would pass 2048 pixels
    x = y = row = 0
    for sp in sprites:
        if x + sp.width > 2048:
            x, y, row = 0, y + row + 2, 0
        rects.append([x, y, sp.width, sp.height])
        x, row = x + sp.width + 2, max(row, sp.height)
    atlas = Image.new("RGBA", (max(r[0] + r[2] for r in rects), y + row), (0, 0, 0, 0))
    for sp, r in zip(sprites, rects):
        atlas.paste(sp, (r[0], r[1]))

for bx in spec.get("exclude", []):
    sel = (xx >= bx[0]) & (xx < bx[2]) & (yy >= bx[1]) & (yy < bx[3])
    for ch in (pulse, wind, turn, water, floatc, drift, sky, glass, starc):
        ch[sel] = 0

LIMIT = {"swing": 16, "light": 16, "fall": 8, "float": 3, "twinkle": 12, "beam": 4, "steam": 3, "actor": 4}
for name, items in (("swing", swings), ("light", lights), ("fall", falls), ("float", floats), ("twinkle", twinkle), ("beam", beams), ("steam", steams), ("actor", actors)):
    if len(items) > LIMIT[name]:
        print(f"note: {len(items)} {name}s, the player shows the first {LIMIT[name]}")
        del items[LIMIT[name]:]

entry = bool(spec.get("entry")) and "unlit" in drawings
if spec.get("entry") and not entry:
    fail("entry needs unlit.webp")
if storm and "flash" not in drawings:
    fail("storm needs flash.webp")
if lights and "unlit" not in drawings:
    fail("lights need unlit.webp, the scene with its lamps off")

effects = [name for name, on in [
    ("water", water.any()), ("drift", drift.any()), ("float", bool(floats)), ("wind", wind.any()),
    ("turn", bool(swings)), ("glass", bool(spec.get("drops")) and glass.any()), ("lights", bool(lights) or entry),
    ("flash", bool(storm)), ("rain", bool(storm) and sky.any()), ("twinkle", bool(twinkle)), ("beam", bool(beams)),
    ("pulse", pulse.any()), ("fall", bool(falls)), ("steam", bool(steams)),
    ("stars", bool(nstars)), ("meteor", meteor is not None and sky.any()), ("actors", bool(actors))] if on]

data = {
    "size": [W, H], "effects": effects, "swing": swings, "float": floats, "fall": falls, "lights": lights,
    "twinkle": twinkle, "beam": beams, "steam": steams, "actors": actors, "meteor": meteor, "sprites": rects,
    "starsK": spec["stars"] if isinstance(spec.get("stars"), dict) else {},
    "entry": {"from": spec.get("light_from", 62)} if entry else None,
    "lightsK": spec.get("lights", {}), "rainK": spec.get("rain", {}), "flashK": spec.get("flash", {}),
    "states": sorted(n for n in drawings if n != "night"),
}

pub = spec["publish"]
os.makedirs(os.path.dirname(pub), exist_ok=True)
bands = np.concatenate([np.stack([pulse, wind, turn], -1), np.stack([water, floatc, drift], -1),
                        np.stack([sky, glass, starc], -1)], 0)
Image.fromarray((np.clip(bands, 0, 1) * 255).round().astype(np.uint8)).save(pub + "-motion.webp", lossless=True, quality=100, method=6)
cover.save(pub + ".webp", quality=85, method=6)
for name, im in drawings.items():
    im.save(f"{pub}-{name}.webp", quality=85, method=6)
json.dump(data, open(pub + "-motion.json", "w"), separators=(",", ":"))
if sprites:
    atlas.save(pub + "-sprites.webp", quality=88, method=6, exact=True)
elif os.path.exists(pub + "-sprites.webp"):
    os.remove(pub + "-sprites.webp")

if review:
    rev = Image.blend(cover, Image.fromarray((np.stack([np.maximum(pulse, water), np.maximum(wind, floatc), np.maximum(turn, drift)], -1) * 255).astype(np.uint8)), 0.5)
    rev.save(review)

print(f"{pub}: {', '.join(effects) or 'no motion'}; {len(lights)} lights, {len(swings)} turning, {len(floats)} floating, "
      f"{len(falls)} falling, {len(beams)} beams, {len(twinkle)} lit windows, {len(steams)} steaming, "
      f"{nstars} stars, {len(actors)} actors{', a shooting star' if meteor else ''}")
