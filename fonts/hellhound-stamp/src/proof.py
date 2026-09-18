"""Render a raster proof sheet straight from the outline sources."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw
from shapely.geometry import MultiPolygon
from shapely import affinity

import geom

SS = 3  # supersample

from build import master_shapes, CMAP

_M = None


def shape_for(name):
    global _M
    if _M is None:
        _M = master_shapes()
    return _M[name]


def run(text, tracking=0):
    """Lay out a string; returns (total_advance, combined shape)."""
    parts, x = [], 0
    for ch in text:
        name = CMAP.get(ord(ch))
        if name is None:
            continue
        adv, shp = shape_for(name)
        if not shp.is_empty:
            parts.append(affinity.translate(shp, x, 0))
        x += adv + tracking
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

    line("RAHWAY", 1370, 250, "layered", tracking=10)
    line("HELLHOUND AUDIO", 1165, 145)
    line("HELLHOUND AUDIO", 1015, 145, "outline")
    line("HELLHOUND AUDIO", 865, 145, "inline")
    line("ABCDEFGHIJKLM", 665, 145)
    line("NOPQRSTUVWXYZ", 480, 145)
    line("abcdefghijklm", 300, 145)
    line("nopqrstuvwxyz", 120, 145)
    line("0123456789 &@#$%!?.,:;'-/()", 1370, 96, x0=1300)
    line("HIGH VOLTAGE", 1180, 96, x0=1300)
    line("high voltage", 1080, 96, x0=1300)
    line("SPIKED CAPS", 940, 96, x0=1300)
    line("plain caps", 840, 96, x0=1300)
    img = img.resize((W, H), Image.LANCZOS)
    img.save(path)
    print("wrote", path, img.size)


if __name__ == "__main__":
    sheet(sys.argv[1] if len(sys.argv) > 1 else "proof.png")
