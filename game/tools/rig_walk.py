"""Build side, front and back walks from standing poses as cut-out figures.

Usage: python tools/rig_walk.py <character.json> [--preview walk.gif]

Reads rig.json next to character.json, cuts the legs and the lantern out of the
standing poses, moves them with standard human gait angles and writes the walk
rows into the sheet and glow sheet. See docs/character-walk.md.
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
    def __init__(self, pose, rig, palette, arm=None):
        self.setup(pose, rig, palette, {**GAIT, **rig.get("gait", {})}, arm)
        j = rig["joints"]
        self.hip, self.knee, self.ankle = j["hip"], j["knee"], j["ankle"]
        self.l1 = self.knee[1] - self.hip[1]
        self.l2 = self.ankle[1] - self.knee[1]
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

    def setup(self, pose, rig, palette, gait, arm=None):
        self.arm = arm
        self.src = pose
        self.h, self.w = pose.shape[:2]
        self.rig = rig
        self.gait = gait
        self.palette = palette
        self.hem = rig["hem"]
        self.body = pose.copy()
        self.body[self.hem + 1:] = 0
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

    def lean(self, t):
        return self.rig.get("upper", {}).get("lean", 2.4) * math.sin(math.radians(curve(self.gait["hip"], t + 0.5)))

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
        out = np.zeros_like(b)
        for y in range(self.h):
            s = round(round(self.lean(t)) * max(0.0, (self.hem - 40 - y) / (self.hem - 40)))
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
        if self.arm is not None:
            a = self.rig["arm"]
            shoulder = a["shoulder"]
            angle = -a.get("swing", 18) * math.sin(2 * math.pi * (t + 0.25))
            arm = self.arm
            if angle < 0:
                elbow = a["elbow"]
                lower = arm.copy()
                lower[:elbow[1]] = 0
                arm = arm.copy()
                arm[elbow[1]:] = 0
                bent = self.place(lower, elbow, -angle * 0.35, elbow)
                arm[bent[..., 3] > 0] = bent[bent[..., 3] > 0]
            lean = round(self.lean(t) * max(0, (self.hem - 40 - shoulder[1]) / (self.hem - 40)))
            over(self.place(arm, shoulder, angle, (shoulder[0] + lean, shoulder[1] + bob)))
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


class DepthRig(Rig):
    """Project the same sagittal gait into the front or back image plane."""

    def __init__(self, pose, rig, palette, direction, stride, gait):
        self.setup(pose, rig, palette, gait)
        self.direction, self.stride = direction, stride
        self.legs = []
        for spec in rig["legs"]:
            x0, y0, x1, y1 = spec["thigh"]
            hip, knee = spec["joints"]["hip"], spec["joints"]["knee"]
            height = knee[1] - hip[1] + 6
            thigh = np.zeros_like(pose)
            thigh[hip[1] - 3:hip[1] - 3 + height, x0:x1] = np.array(
                Image.fromarray(pose[y0:y1, x0:x1]).resize((x1 - x0, height), Image.NEAREST))
            shin = self.cut(spec["shin"])
            boot = self.cut(spec["boot"])
            self.legs.append((spec, thigh, shin, boot))
        self.arms = []
        for spec in rig.get("arms", []):
            self.arms.append((spec, self.cut(spec["box"])))
            x0, y0, x1, y1 = spec["box"]
            self.body[y0:y1, x0:x1] = 0

    def vertical(self, image, pivot, scale, target):
        # Affine inverse mapping preserves the pivot without wrapping image edges.
        transform = (1, 0, pivot[0] - target[0], 0, 1 / scale,
                     pivot[1] - target[1] / scale)
        return np.array(Image.fromarray(image).transform(
            (self.w, self.h), Image.Transform.AFFINE, transform, Image.Resampling.NEAREST))

    def frame(self, t, distance_phase):
        canvas = np.zeros_like(self.src)
        glow = np.zeros_like(self.src)
        sway = round(math.sin(2 * math.pi * t))
        bob = -round((1 - math.cos(4 * math.pi * t)) / 2)
        layers = []
        for i, (spec, thigh, shin, boot) in enumerate(self.legs):
            phase = (t + i * .5) % 1
            distance = (distance_phase + i * .5) % 1
            a1 = curve(self.gait["hip"], phase)
            a2 = a1 - curve(self.gait["knee"], phase)
            c1, c2 = math.cos(math.radians(a1)), math.cos(math.radians(a2))
            hip, knee, ankle = [spec["joints"][key] for key in ("hip", "knee", "ankle")]
            # The stance foot retreats by exactly stride/frames in screen depth.
            if distance < .5:
                depth = self.stride * (distance - .25)
                lift = 0
            else:
                u = (distance - .5) * 2
                depth = self.stride * (.25 - .5 * u)
                lift = self.rig.get("foot_lift", 5) * math.sin(math.pi * u)
            foot_y = self.h - 1 - self.direction * depth - self.stride / 4 - lift
            ky = hip[1] + (knee[1] - hip[1]) * c1
            ay = ky + (ankle[1] - knee[1]) * c2
            # Contact correction is hidden at the hip beneath the coat.
            correction = foot_y - (ay + self.h - 1 - ankle[1])
            target_hip = (hip[0] + sway, hip[1] + correction)
            target_knee = (knee[0] + sway / 2, ky + correction)
            target_ankle = (ankle[0], ay + correction)
            parts = [self.vertical(thigh, hip, c1, target_hip),
                     self.vertical(shin, knee, c2, target_knee),
                     self.vertical(boot, ankle, 1, target_ankle)]
            away = self.direction * depth > 0
            layers.append((away, parts))
        def over(layer):
            m = layer[..., 3] > 0
            canvas[m] = layer[m]
        for away, parts in sorted(layers, key=lambda item: not item[0]):
            for part in parts:
                over(self.to_palette(part, self.rig.get("far_shade", .84) if away else 1))
        body = self.place(self.body, (0, 0), 0, (sway, bob))
        over(body)
        for i, (spec, arm) in enumerate(self.arms):
            pivot = spec["pivot"]
            angle = spec.get("swing", 3) * math.sin(2 * math.pi * (t + i * .5))
            over(self.place(arm, pivot, angle, (pivot[0] + sway, pivot[1] + bob)))
        if self.lantern is not None:
            pivot = self.rig["lantern"]["pivot"]
            swing = self.rig["lantern"].get("swing", 4) * math.sin(2 * math.pi * (t - .15))
            hand = (pivot[0] + sway, pivot[1] + bob)
            over(self.place(self.lantern, pivot, swing, hand))
            glow = self.place(self.flame, pivot, swing, hand)
            glow[canvas[..., 3] == 0] = 0
        return canvas, glow


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

    if "clean_pose" in rig:
        pose = np.array(Image.open(folder / rig["clean_pose"]).convert("RGBA"))
    arm = np.array(Image.open(folder / rig["arm"]["source"]).convert("RGBA")) if "arm" in rig else None
    r = Rig(pose, rig, palette, arm)
    n = rig.get("frames", 12)
    phases, stride = r.timing(n)
    walks = {"side": ([r.frame(t) for t in phases], stride)}
    for view, direction in (("front", 1), ("back", -1)):
        if view not in rig:
            continue
        config = rig[view]
        idle = meta["animations"][config.get("pose", "idle-" + view)]
        col = idle.get("start", 0)
        pose = np.array(sheet.crop((col * fw, idle["row"] * fh,
                                    (col + 1) * fw, (idle["row"] + 1) * fh)))
        depth_stride = stride * config.get("stride_scale", .5)
        depth = DepthRig(pose, config, palette, direction, depth_stride, r.gait)
        walks[view] = ([depth.frame(t, i / n) for i, t in enumerate(phases)], depth_stride)

    width = max(sheet.width, n * fw)
    for name, source, index in (("sheet", sheet, 0), ("glow", glow_sheet, 1)):
        if source is None:
            continue
        out = Image.new("RGBA", (width, source.height))
        out.paste(source, (0, 0))
        for view, (frames, _) in walks.items():
            row = meta["animations"]["walk-" + view]["row"]
            out.paste(Image.new("RGBA", (width, fh)), (0, row * fh))
            for i, frame in enumerate(frames):
                out.paste(Image.fromarray(frame[index]), (i * fw, row * fh))
        out.save(folder / meta[name])
    for view, (_, distance) in walks.items():
        walk = meta["animations"]["walk-" + view]
        walk.update(frames=n, stride=round(distance, 1))
        walk.pop("start", None)
        print(f"walk-{view}: {n} frames, stride {distance:.1f} px per cycle, {distance / n:.1f} px per frame")
    args.character.write_text(json.dumps(meta, indent=2) + "\n")

    if args.preview:
        images = []
        lane = fh + math.ceil(max((distance for view, (_, distance) in walks.items() if view != "side"), default=0) * 3) + 40
        for k in range(n * 3):
            bg = Image.new("RGBA", (fw * 5, lane * len(walks)), (110, 110, 110, 255))
            draw = ImageDraw.Draw(bg)
            for row, (view, (frames, distance)) in enumerate(walks.items()):
                top = row * lane
                draw.text((8, top + 4), f"walk-{view}: {distance:.1f} px/cycle", fill="white")
                if view == "side":
                    x, y = round(10 + k * distance / n), top + 20
                    draw.line([(0, y + fh), (bg.width, y + fh)], fill=(80, 80, 80))
                else:
                    x = fw * 2
                    y = top + 20 + round((k if view == "front" else n * 3 - 1 - k) * distance / n)
                    for mark in range(0, lane - fh, 12):
                        draw.line([(x - 20, top + fh + mark), (x + fw + 20, top + fh + mark)], fill=(80, 80, 80))
                bg.alpha_composite(Image.fromarray(frames[k % n][0]), (x, y))
            images.append(bg.resize((bg.width * 2, bg.height * 2), Image.NEAREST).convert("RGB"))
        images[0].save(args.preview, save_all=True, append_images=images[1:], duration=90, loop=0)


if __name__ == "__main__":
    main()
