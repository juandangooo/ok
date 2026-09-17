"""Render a raster proof sheet straight from the outline sources."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw
from shapely.geometry import MultiPolygon
from shapely import affinity

import geom
from glyphs import GLYPHS

SS = 3  # supersample
TIGHTEN = 16

NAME = {c: c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"}
NAME.update({
    " ": "space", ".": "period", ",": "comma", "!": "exclam", "?": "question",
    "-": "hyphen", "&": "ampersand", "/": "slash", ":": "colon", ";": "semicolon",
    "'": "quoteright", '"': "quotedbl", "(": "parenleft", ")": "parenright",
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
    "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
    "#": "numbersign", "%": "percent", "$": "dollar", "@": "at", "*": "asterisk",
    "+": "plus", "=": "equal", "[": "bracketleft", "]": "bracketright",
})

_cache = {}


def shape_for(name):
    if name not in _cache:
        adv, solids, holes, extra = GLYPHS[name]
        _cache[name] = (adv, geom.assemble(solids, holes, extra))
    return _cache[name]


def run(text, tracking=0):
    """Lay out a string; returns (total_advance, combined shape)."""
    parts, x = [], 0
    for ch in text:
        name = NAME.get(ch)
        if name is None:
            continue
        adv, shp = shape_for(name)
        if not shp.is_empty:
            parts.append(affinity.translate(shp, x - TIGHTEN / 2, 0))
        x += adv - TIGHTEN + tracking
    from shapely.ops import unary_union
    return x, (unary_union(parts) if parts else MultiPolygon())


def paint(draw, shape, scale, ox, oy, height, ink):
    polys = list(shape.geoms) if isinstance(shape, MultiPolygon) else [shape]
    polys.sort(key=lambda p: p.area, reverse=True)
    for poly in polys:
        if poly.is_empty:
            continue
        def px(ring):
            return [(ox + x * scale, height - (oy + y * scale)) for x, y in ring.coords]
        draw.polygon(px(poly.exterior), fill=ink)
        for hole in poly.interiors:
            draw.polygon(px(hole), fill="white")


def sheet(path):
    W, H = 2400, 1700
    img = Image.new("RGB", (W * SS, H * SS), "white")
    d = ImageDraw.Draw(img)

    def line(text, y, size, style="regular", tracking=0, x0=70):
        scale = size / 1000.0 * SS
        _, shp = run(text, tracking)
        if style == "outline":
            shp = shp.difference(shp.buffer(-34, join_style=2, mitre_limit=2.5))
        elif style == "inline":
            shp = geom.inline(shp, 30, 28)
        elif style == "layered":
            sh = geom.sweep(shp, 50, -64)
            outl = shp.difference(shp.buffer(-30, join_style=2, mitre_limit=2.5))
            inl = shp.buffer(-64, join_style=2, mitre_limit=2.5)
            inl = inl.difference(inl.buffer(-30, join_style=2, mitre_limit=2.5))
            paint(d, sh, scale, x0 * SS, y * SS, H * SS, "black")
            paint(d, shp, scale, x0 * SS, y * SS, H * SS, "white")
            paint(d, outl, scale, x0 * SS, y * SS, H * SS, "black")
            paint(d, inl, scale, x0 * SS, y * SS, H * SS, "black")
            return
        paint(d, shp, scale, x0 * SS, y * SS, H * SS, "black")

    line("RAHWAY", 1370, 260, "layered", tracking=10)
    line("HELLHOUND AUDIO", 1160, 150)
    line("HELLHOUND AUDIO", 1010, 150, "outline")
    line("HELLHOUND AUDIO", 860, 150, "inline")
    line("ABCDEFGHIJKLM", 660, 150)
    line("NOPQRSTUVWXYZ", 470, 150)
    line("0123456789&$#%", 300, 150)
    line("!?.,:;'\"()[]-+=/@*", 140, 150)

    img = img.resize((W, H), Image.LANCZOS)
    img.save(path)
    print("wrote", path, img.size)


if __name__ == "__main__":
    sheet(sys.argv[1] if len(sys.argv) > 1 else "proof.png")
