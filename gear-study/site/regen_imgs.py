"""Re-encode every item photo into gear.json at up to 480px (WebP), and record its native width.

Run after photos change: python3 gear-study/site/regen_imgs.py
"""
import base64
import io
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, "..", "photos")
path = os.path.join(HERE, "gear.json")
gear = json.load(open(path))
for g in gear:
    f = os.path.join(PHOTOS, g["id"] + ".jpg")
    if not os.path.exists(f):
        continue
    im = Image.open(f).convert("RGB")
    # trim white borders so the gear fills its tile
    mask = im.convert("L").point(lambda v: 255 if v < 238 else 0)
    box = mask.getbbox()
    if box:
        pad = int(max(box[2] - box[0], box[3] - box[1]) * .04)
        im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
    g["iw"] = max(im.size)  # the side that fills a square tile
    im.thumbnail((480, 480), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=82, method=6)
    g["img"] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
json.dump(gear, open(path, "w"), separators=(",", ":"))
print(f"{len(gear)} items, {os.path.getsize(path) / 1e6:.1f} MB")
