"""Previews: traced artwork next to the source logo, a pixel-difference map,
and 3D renders of the printed shield."""
import os
import sys

import cv2
import numpy as np
import trimesh
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "ornament"))
import build_shield as B   # noqa: E402
import render as R         # noqa: E402  (z-buffer renderer from the cube project)

PV = os.path.join(HERE, "preview")
COL = {"red": (232, 52, 58), "black": (12, 12, 12), "white": (250, 250, 250)}


def main():
    os.makedirs(PV, exist_ok=True)
    d = B.main(return_data=True)
    regions, face_red, cx, cy, px = d["regions"], d["face_red"], d["cx"], d["cy"], d["px"]
    S = 4
    H = W = 1254 * S

    def raster(cs):
        img = np.zeros((H, W), np.uint8)
        for poly in cs.translate([cx, cy]).to_polygons():
            p = np.array(poly) / px * S
            p[:, 1] = -p[:, 1]
            t = np.zeros((H, W), np.uint8)
            cv2.fillPoly(t, [np.round(p * 8).astype(np.int32)], 1, shift=3)
            img ^= t
        return img.astype(bool)

    out = np.full((H, W, 3), 255, np.uint8)
    for k in ("black", "white"):
        out[raster(regions[k])] = COL[k]
    out[raster(face_red)] = COL["red"]
    mine = Image.fromarray(out).resize((1254, 1254), Image.LANCZOS)
    src = Image.open(B.SRC).convert("RGBA")
    bg = Image.new("RGBA", src.size, "white"); bg.alpha_composite(src)
    orig = bg.convert("RGB")
    pair = Image.new("RGB", (2548, 1254), "white")
    pair.paste(orig, (0, 0)); pair.paste(mine, (1294, 0))
    pair.resize((1274, 627), Image.LANCZOS).save(os.path.join(PV, "compare.png"))

    a, b = np.asarray(orig).astype(int), np.asarray(mine).astype(int)
    diff = np.abs(a - b).sum(-1) > 120
    dm = np.full(a.shape, 240, np.uint8)
    dm[np.asarray(orig).sum(-1) < 700] = 200          # logo area in grey
    dm[diff] = (220, 0, 200)                          # differences in magenta
    Image.fromarray(dm).save(os.path.join(PV, "diff.png"))
    print(f"pixels that differ visibly: {diff.sum()} "
          f"({diff.sum() / (np.asarray(orig).sum(-1) < 700).sum() * 100:.2f}% of the logo)")

    # 3D renders from the printed parts
    parts = [(trimesh.load(os.path.join(HERE, "parts", f"shield_{c}.stl")), np.array(COL[c]) / 255)
             for c in ("red", "black", "white")]
    hang = []
    for m, c in parts:          # as it hangs: back face (z top) toward the viewer, upright
        hang.append((m, c))
    R.render(hang, os.path.join(PV, "shield_back.png"), 89.9, -90, size=900, pad=1.05,
             title="Back side (as it hangs)")
    # flip the part over like you would in your hand (180 deg about the vertical axis)
    flip = trimesh.transformations.rotation_matrix(np.pi, [0, 1, 0])
    flipped = []
    for m, c in parts:
        m2 = m.copy(); m2.apply_transform(flip); flipped.append((m2, c))
    R.render(flipped, os.path.join(PV, "shield_front.png"), 89.9, -90, size=900, pad=1.05,
             title="Front side (printed against the plate), turned over")
    R.render(hang, os.path.join(PV, "shield_angle.png"), 35, -60, size=900,
             title="3 mm thick, red edge")


if __name__ == "__main__":
    main()
