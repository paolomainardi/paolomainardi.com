"""Build a character's side walk from its standing side pose, as a cut-out figure.

Usage: python tools/rig_walk.py <character.json> [--preview walk.gif]

Reads rig.json next to character.json, cuts the legs and the lantern out of the
standing pose, moves them with standard human gait angles and writes the walk
row into the sheet and glow sheet. See docs/character-walk.md.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

# Sagittal joint angles in degrees over one gait cycle, from heel strike (t=0).
# Hip: positive is the thigh forward. Knee: positive is flexion. Ankle: positive points the toes down.
GAIT = {
    "hip": [[0, 25], [0.1, 22], [0.5, -12], [0.6, -8], [0.85, 28]],
    "knee": [[0, 3], [0.12, 15], [0.4, 3], [0.55, 20], [0.7, 58], [0.85, 25], [0.95, 3]],
    "ankle": [[0, -8], [0.1, 0], [0.4, -10], [0.55, 18], [0.65, 10], [0.78, 0]],
}
UP = 4  # supersampling for rotations, so pixels stay whole


def curve(keys, t):
    """Periodic smoothstep interpolation through [t, value] keys."""
    xs = [k[0] for k in keys] + [keys[0][0] + 1]
    ys = [k[1] for k in keys] + [keys[0][1]]
    t %= 1
    for i in range(len(xs) - 1):
        if xs[i] <= t <= xs[i + 1]:
            u = (t - xs[i]) / (xs[i + 1] - xs[i])
            u = u * u * (3 - 2 * u)
            return ys[i] + (ys[i + 1] - ys[i]) * u
    return ys[0]


class Rig:
    def __init__(self, pose, rig, palette):
        self.src = pose
        self.h, self.w = pose.shape[:2]
        self.rig = rig
        self.gait = {**GAIT, **rig.get("gait", {})}
        self.palette = palette
        j = rig["joints"]
        self.hip, self.knee, self.ankle, self.hem = j["hip"], j["knee"], j["ankle"], rig["hem"]
        self.l1 = self.knee[1] - self.hip[1]
        self.l2 = self.ankle[1] - self.knee[1]
        self.body = pose.copy()
        self.body[self.hem + 1:] = 0
        self.shin = self.cut(rig["shin"])
        coat = rig.get("coat_brightness")
        if coat:
            self.shin[self.shin[..., :3].astype(int).sum(-1) > coat] = 0
        self.boot = self.cut(rig["boot"])
        # The thigh is hidden by the coat: stretch the top of the trousers up to the hip.
        x0, x1 = rig["shin"][0], rig["shin"][2]
        top = pose[self.hem + 1:self.hem + 16, x0:x1]
        tall = self.l1 + 6
        self.thigh = np.zeros_like(pose)
        self.thigh[self.hip[1] - 3:self.hip[1] - 3 + tall, x0:x1] = np.array(
            Image.fromarray(top).resize((x1 - x0, tall), Image.NEAREST))
        self.lantern = self.flame = None
        if "lantern" in rig:
            lx0, ly0, lx1, ly1 = rig["lantern"]["box"]
            self.lantern = self.cut(rig["lantern"]["box"])
            self.body[ly0:ly1, lx0:lx1] = 0
            bright = pose[..., :3].astype(int).sum(-1) > rig["lantern"].get("flame_brightness", 600)
            mask = np.zeros(pose.shape[:2], bool)
            mask[ly0:ly1, lx0:lx1] = bright[ly0:ly1, lx0:lx1] & (pose[ly0:ly1, lx0:lx1, 3] > 0)
            self.flame = np.zeros_like(pose)
            self.flame[mask] = 255

    def cut(self, box):
        x0, y0, x1, y1 = box
        piece = np.zeros_like(self.src)
        piece[y0:y1, x0:x1] = self.src[y0:y1, x0:x1]
        return piece

    def to_palette(self, rgba, factor):
        out = rgba.copy()
        m = out[..., 3] > 0
        c = out[..., :3][m].astype(float) * factor
        out[..., :3][m] = self.palette[((c[:, None] - self.palette[None]) ** 2).sum(-1).argmin(1)]
        return out

    def place(self, img, pivot, angle, target):
        """Rotate img about pivot by angle degrees (counterclockwise on screen) and move the pivot to target."""
        big = Image.fromarray(img).resize((self.w * UP, self.h * UP), Image.NEAREST)
        big = big.rotate(angle, resample=Image.NEAREST,
                         center=(pivot[0] * UP + UP / 2, pivot[1] * UP + UP / 2),
                         translate=((target[0] - pivot[0]) * UP, (target[1] - pivot[1]) * UP))
        return np.array(big)[UP // 2::UP, UP // 2::UP]

    def joints(self, t):
        a1 = curve(self.gait["hip"], t)
        a2 = a1 - curve(self.gait["knee"], t)
        hx, hy = self.hip
        knee = (hx + self.l1 * math.sin(math.radians(a1)), hy + self.l1 * math.cos(math.radians(a1)))
        ankle = (knee[0] + self.l2 * math.sin(math.radians(a2)), knee[1] + self.l2 * math.cos(math.radians(a2)))
        return a1, a2, knee, ankle

    def leg(self, t, shade):
        a1, a2, knee, ankle = self.joints(t)
        foot = a2 - curve(self.gait["ankle"], t)
        layers = [self.place(self.thigh, self.hip, a1, self.hip),
                  self.place(self.shin, self.knee, a2, knee),
                  self.place(self.boot, self.ankle, foot, ankle)]
        return [self.to_palette(layer, shade) for layer in layers]

    def upper(self, t):
        """The pose above the hem, with the hem swaying, a bob and a shoulder counter-sway, moved by whole rows."""
        r = self.rig.get("upper", {})
        x0, x1 = r.get("hem_columns", [0, self.w])
        b = self.body.copy()
        sway = round(r.get("hem_sway", 4.5) * math.sin(math.radians(curve(self.gait["hip"], t))))
        for y in range(self.hem - 18, self.hem + 1):
            s = round(sway * (y - (self.hem - 18)) / 18)
            seg = self.body[y, x0:x1]
            row = self.body[y].copy()
            row[x0:x1] = 0
            if s >= 0:
                row[x0 + s:x1] = seg[:x1 - x0 - s]
            else:
                row[x0:x1 + s] = seg[-s:]
            b[y] = row
        bob = -round(r.get("bob", 2) / 2 * (1 - math.cos(4 * math.pi * t)))
        lean = round(r.get("lean", 2.4) * math.sin(math.radians(curve(self.gait["hip"], t + 0.5))))
        top = self.hem - 40
        out = np.zeros_like(b)
        for y in range(self.h):
            s = round(lean * max(0.0, (top - y) / top))
            out[y] = np.roll(b[y], s, axis=0) if s else b[y]
        return np.roll(out, bob, axis=0), bob

    def frame(self, t):
        canvas = np.zeros_like(self.src)
        glow = np.zeros_like(self.src)

        def over(layer):
            m = layer[..., 3] > 0
            canvas[m] = layer[m]

        for layer in self.leg(t + 0.5, self.rig.get("far_shade", 0.72)):
            over(layer)
        near = self.leg(t, 1.0)
        over(near[0])
        body, bob = self.upper(t)
        over(body)
        for layer in near[1:]:
            over(layer)
        if self.lantern is not None:
            pivot = tuple(self.rig["lantern"]["pivot"])
            swing = self.rig["lantern"].get("swing", 7) * math.sin(2 * math.pi * (t - 0.15))
            hand = (pivot[0], pivot[1] + bob)
            over(self.place(self.lantern, pivot, swing, hand))
            glow = self.place(self.flame, pivot, swing, hand)
        # The lowest foot touches the ground: this gives the natural bob of the legs.
        drop = (self.h - 1) - np.nonzero(canvas[..., 3])[0].max()
        canvas = np.roll(canvas, drop, axis=0)
        glow = np.roll(glow, drop, axis=0)
        glow[canvas[..., 3] == 0] = 0
        return canvas, glow

    def timing(self, frames):
        """Phases where the planted foot has covered equal distances, and the cycle's length."""
        steps = 600
        travel = [0.0]
        for k in range(steps):
            t0, t1 = k / steps, (k + 1) / steps
            near, far = self.joints(t0)[3], self.joints(t0 + 0.5)[3]
            leg = 0 if near[1] >= far[1] else 0.5
            travel.append(travel[-1] + max(0.0, self.joints(t0 + leg)[3][0] - self.joints(t1 + leg)[3][0]))
        total = travel[-1]
        phases = [next(k for k in range(steps + 1) if travel[k] >= total * i / frames) / steps
                  for i in range(frames)]
        return phases, total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("character", type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    folder = args.character.parent
    meta = json.loads(args.character.read_text())
    rig = json.loads((folder / "rig.json").read_text())
    palette_path = folder / rig["palette"]
    palette = np.array([list(bytes.fromhex(c[1:])) for c in json.loads(palette_path.read_text())], dtype=float)
    fw, fh = meta["frame"]
    pose_anim = meta["animations"][rig.get("pose", "idle-side")]
    sheet = Image.open(folder / meta["sheet"]).convert("RGBA")
    glow_sheet = Image.open(folder / meta["glow"]).convert("RGBA") if meta.get("glow") else None
    col = pose_anim.get("start", 0)
    pose = np.array(sheet.crop((col * fw, pose_anim["row"] * fh, (col + 1) * fw, (pose_anim["row"] + 1) * fh)))

    r = Rig(pose, rig, palette)
    n = rig.get("frames", 12)
    phases, stride = r.timing(n)
    frames = [r.frame(t) for t in phases]

    walk = meta["animations"]["walk-side"]
    width = max(sheet.width, n * fw)
    for name, image, index in (("sheet", sheet, 0), ("glow", glow_sheet, 1)):
        if image is None:
            continue
        out = Image.new("RGBA", (width, image.height))
        out.paste(image, (0, 0))
        out.paste(Image.new("RGBA", (width, fh)), (0, walk["row"] * fh))
        for i, f in enumerate(frames):
            out.paste(Image.fromarray(f[index]), (i * fw, walk["row"] * fh))
        out.save(folder / meta[name])
    walk.update(frames=n, stride=round(stride, 1))
    walk.pop("start", None)
    args.character.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"walk-side: {n} frames, stride {stride:.1f} px per cycle, {stride / n:.1f} px per frame")

    if args.preview:
        step, x, images = stride / n, 10.0, []
        for _ in range(3):
            for canvas, _ in frames:
                bg = Image.new("RGBA", (fw * 5, fh + 6), (110, 110, 110, 255))
                ImageDraw.Draw(bg).line([(0, fh), (fw * 5, fh)], fill=(80, 80, 80, 255))
                bg.alpha_composite(Image.fromarray(canvas), (round(x), 0))
                images.append(bg.resize((bg.width * 2, bg.height * 2), Image.NEAREST).convert("RGB"))
                x += step
        images[0].save(args.preview, save_all=True, append_images=images[1:], duration=90, loop=0)


if __name__ == "__main__":
    main()
