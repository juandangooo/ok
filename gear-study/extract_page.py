"""Extract items + photos from one Current RMS 'Products' page PDF.

Run: python3 gear-study/extract_page.py <pdf> <page-number>
Writes gear-study/raw/pageNN.json and gear-study/photos/pNN-XX.png.
"""
import json
import os
import sys

import pymupdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
NAME_X = (61, 530, 999)
GROUP_X = 69


def main(pdf, page):
    doc = pymupdf.open(pdf)
    p = doc[0]
    blocks = [b for b in p.get_text("blocks") if 250 < b[1] < p.rect.height - 300]
    items = []
    for b in blocks:
        t = b[4].strip()
        if round(b[0]) not in NAME_X or t.startswith(("Available", "Booked")) or "rent" in t:
            continue
        qty = [c for c in blocks if c[4].startswith("Available")
               and abs(c[0] - b[0]) < 2 and 0 < c[1] - b[1] < 80]
        items.append(dict(name=t, x=b[0], y=b[1],
                          qty=int(qty[0][4].split("\n")[1]) if qty else None))
    items.sort(key=lambda i: (i["y"], i["x"]))
    groups = []
    for b in sorted([b for b in blocks if round(b[0]) == GROUP_X], key=lambda b: b[1]):
        groups += b[4].strip().split("\n")
    assert len(groups) == len(items), (len(groups), len(items))
    os.makedirs(os.path.join(HERE, "photos"), exist_ok=True)
    for n, (it, g) in enumerate(zip(items, groups), 1):
        it["group"] = g
        it["id"] = f"p{page:02d}-{n:02d}"
    for im in p.get_images(full=True):
        for r in p.get_image_rects(im[0]):
            for it in items:
                if abs((r.x0 + r.x1) / 2 - (it["x"] + 209)) < 120 and 0 < it["y"] - r.y0 < 220:
                    raw = doc.extract_image(im[0])
                    tmp = os.path.join(HERE, "photos", "_tmp." + raw["ext"])
                    open(tmp, "wb").write(raw["image"])
                    img = Image.open(tmp).convert("RGBA")
                    bg = Image.new("RGBA", img.size, "white")
                    bg.alpha_composite(img)
                    img = bg.convert("RGB")
                    img.thumbnail((240, 240))
                    img.save(os.path.join(HERE, "photos", f"{it['id']}.png"), optimize=True)
                    os.remove(tmp)
    os.makedirs(os.path.join(HERE, "raw"), exist_ok=True)
    out = [dict(id=i["id"], name=i["name"], group=i["group"], qty=i["qty"]) for i in items]
    json.dump(out, open(os.path.join(HERE, "raw", f"page{page:02d}.json"), "w"), indent=1)
    for i in out:
        print(i["id"], "|", i["group"], "|", i["qty"], "|", i["name"])


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]))
