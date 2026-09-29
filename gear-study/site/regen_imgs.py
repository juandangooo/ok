"""Re-encode every item photo into gear.json: background lifted off, cropped tight, up to 480px WebP.

Background removal only runs when the photo sits on a plain light backdrop: pixels close to the
border colour that connect to the border are made transparent, with a soft antialiased edge and
the white fringe removed. If the backdrop is not plain, or the cut looks wrong, the photo keeps
its background and is marked cut=0 so the game can leave it out of the photo grid.

Run after photos change: python3 gear-study/site/regen_imgs.py
"""
import base64
import io
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, "..", "photos")
LO, HI = 16, 42   # colour distance from the backdrop: <=LO fully clear, >=HI fully solid


def cutout(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    # a plain light backdrop: bright, grey, and most of the border matches it
    if bg.min() < 215 or bg.max() - bg.min() > 18:
        return None
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    if (np.sqrt(((border - bg) ** 2).sum(axis=1)) < HI).mean() < .85:
        return None
    near = dist < HI
    lab, _ = ndimage.label(near)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    back = np.isin(lab, edge[edge > 0])
    # holes: backdrop showing through a dark item (inside a cable coil, between stand legs).
    # Only for dark gear, so white gear keeps its white panels.
    body = dist >= HI
    if body.any() and np.median(a[body].mean(axis=1)) < 120:
        for i in range(1, lab.max() + 1):
            if i in edge:
                continue
            comp = lab == i
            if comp.sum() > 40 and np.percentile(dist[comp], 90) < LO + 4:
                back |= comp
    alpha = np.where(back, np.clip((dist - LO) / (HI - LO), 0, 1), 1.0)
    alpha = np.clip(ndimage.gaussian_filter(alpha, .5), 0, 1)  # soften the cut edge a touch
    solid = alpha > .02
    frac = solid.mean()
    if frac < .03 or frac > .97:
        return None
    # the item was already cropped in the source photo: a cut-out would show a sliced edge
    sides = [alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]]
    if max((s > .5).mean() for s in sides) > .2:
        return None
    # a light halo left around dark gear (the backdrop's own shadow or glow): leave it boxed
    solid_px = alpha > .5
    ring = solid_px & ~ndimage.binary_erosion(solid_px, iterations=2)
    core = ndimage.binary_erosion(solid_px, iterations=2)
    if ring.any() and core.any():
        lum = a.mean(axis=2)
        sat = a.max(axis=2) - a.min(axis=2)
        light_ring = ((lum[ring] > 190) & (sat[ring] < 30)).mean()
        if np.median(lum[core]) < 140 and light_ring > .3:
            return None
    # remove the white fringe: un-mix the backdrop colour from semi-transparent edge pixels
    m = alpha[..., None]
    rgb = np.where(m > .02, (a - (1 - m) * bg) / np.maximum(m, .02), a)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    ys, xs = np.where(alpha > .08)
    pad = int(max(np.ptp(xs), np.ptp(ys)) * .03) + 2
    return img.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(w, xs.max() + pad + 1), min(h, ys.max() + pad + 1)))


def trim(im):
    mask = im.convert("L").point(lambda v: 255 if v < 238 else 0)
    box = mask.getbbox()
    if not box:
        return im
    pad = int(max(box[2] - box[0], box[3] - box[1]) * .04)
    return im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))


def main():
    path = os.path.join(HERE, "gear.json")
    gear = json.load(open(path))
    reject = set(open(os.path.join(HERE, "cut_reject.txt")).read().split()) - {"#"}
    cut = 0
    for g in gear:
        f = os.path.join(PHOTOS, g["id"] + ".jpg")
        if not os.path.exists(f):
            continue
        src = Image.open(f).convert("RGB")
        im = None if g["id"] in reject else cutout(src)
        g["cut"] = 1 if im is not None else 0
        cut += g["cut"]
        if im is None:
            im = trim(src)
        g["iw"] = max(im.size)  # the side that fills a square tile
        im.thumbnail((420, 420), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=80, method=6, alpha_quality=80)
        g["img"] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
    json.dump(gear, open(path, "w"), separators=(",", ":"))
    print(f"{len(gear)} items, {cut} cut out, {os.path.getsize(path) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
