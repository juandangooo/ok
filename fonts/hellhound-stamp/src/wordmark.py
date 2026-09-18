"""Export a Hellhound Audio wordmark as SVG and transparent PNG.

Google Docs cannot install a custom font, so the practical route for Docs is to
drop in a picture of the lettering.  This makes that picture, at any size, in
any of the four styles - including the full layered treatment.

    python3 src/wordmark.py "HELLHOUND AUDIO" --style layered --out build/logo
"""

import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shapely.geometry import MultiPolygon
from shapely.ops import unary_union
from shapely import affinity
from PIL import Image, ImageDraw

import geom
from glyphs import GLYPHS
from build import CMAP, TIGHTEN, SHADOW_VECTOR

_cache = {}


def _glyph(name):
    if name not in _cache:
        adv, solids, holes, extra = GLYPHS[name]
        shape = geom.assemble(solids, holes, extra)
        if not shape.is_empty:
            shape = affinity.translate(shape, -TIGHTEN / 2.0, 0)
        _cache[name] = (adv - TIGHTEN, shape)
    return _cache[name]


def typeset(text, tracking=0):
    parts, x = [], 0
    for ch in text:
        name = CMAP.get(ord(ch))
        if name is None:
            continue
        adv, shape = _glyph(name)
        if not shape.is_empty:
            parts.append(affinity.translate(shape, x, 0))
        x += adv + tracking
    return (unary_union(parts) if parts else MultiPolygon()), x


def layers(shape, style, keyline=34):
    """-> [(shapely geometry, role)] painted back to front."""
    if style == "regular":
        return [(shape, "ink")]
    if style == "inline":
        return [(geom.inline(shape, 30, 28), "ink")]
    if style == "outline":
        return [(geom.prune(shape.difference(shape.buffer(-keyline, join_style=2, mitre_limit=2.5))), "ink")]
    if style == "shadow":
        return [(geom.sweep(shape, *SHADOW_VECTOR), "ink")]
    if style == "layered":
        out = geom.prune(shape.difference(shape.buffer(-30, join_style=2, mitre_limit=2.5)))
        inner = geom.prune(shape.buffer(-62, join_style=2, mitre_limit=2.5))
        inner = geom.prune(inner.difference(inner.buffer(-28, join_style=2, mitre_limit=2.5)))
        return [(geom.sweep(shape, *SHADOW_VECTOR), "ink"),
                (shape, "fill"), (out, "ink"), (inner, "ink")]
    raise SystemExit("unknown style: " + style)


def _polys(geo):
    return list(geo.geoms) if isinstance(geo, MultiPolygon) else ([geo] if not geo.is_empty else [])


def to_svg(stack, box, path, ink, fill):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    body = []
    for geo, role in stack:
        d = []
        for poly in _polys(geo):
            for ring in [poly.exterior] + list(poly.interiors):
                pts = list(ring.coords)
                d.append("M" + " ".join("%.1f,%.1f" % (x - x0, y1 - y) for x, y in pts) + "Z")
        if d:
            body.append('<path fill="%s" fill-rule="evenodd" d="%s"/>'
                        % (ink if role == "ink" else fill, " ".join(d)))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" '
           'width="%.0f" height="%.0f">\n%s\n</svg>\n'
           % (w, h, w, h, "\n".join(body)))
    with open(path, "w") as fh:
        fh.write(svg)
    return path


def to_png(stack, box, path, ink, fill, height, ss=4):
    x0, y0, x1, y1 = box
    scale = height / (y1 - y0)
    W = max(1, int(round((x1 - x0) * scale)))
    H = max(1, int(round(height)))
    img = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for geo, role in stack:
        colour = ink if role == "ink" else fill
        for poly in sorted(_polys(geo), key=lambda p: p.area, reverse=True):
            px = lambda r: [((x - x0) * scale * ss, (y1 - y) * scale * ss) for x, y in r.coords]
            d.polygon(px(poly.exterior), fill=colour)
            for hole in poly.interiors:
                d.polygon(px(hole), fill=(0, 0, 0, 0))
    img.resize((W, H), Image.LANCZOS).save(path)
    return path


def main():
    ap = argparse.ArgumentParser(description="Hellhound Audio wordmark exporter")
    ap.add_argument("text")
    ap.add_argument("--style", default="regular",
                    choices=["regular", "inline", "outline", "shadow", "layered"])
    ap.add_argument("--out", default="wordmark", help="path without extension")
    ap.add_argument("--ink", default="#000000")
    ap.add_argument("--fill", default="#ffffff", help="letter fill for --style layered")
    ap.add_argument("--tracking", type=int, default=0, help="1/1000 em between letters")
    ap.add_argument("--height", type=int, default=400, help="PNG height in pixels")
    ap.add_argument("--pad", type=int, default=40, help="margin in font units")
    a = ap.parse_args()

    shape, _ = typeset(a.text.upper(), a.tracking)
    if shape.is_empty:
        raise SystemExit("nothing to set")
    stack = layers(shape, a.style)

    union = unary_union([g for g, _ in stack])
    x0, y0, x1, y1 = union.bounds
    box = (x0 - a.pad, y0 - a.pad, x1 + a.pad, y1 + a.pad)

    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    ink_rgb = tuple(int(a.ink.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    fill_rgb = tuple(int(a.fill.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    print(to_svg(stack, box, out + ".svg", a.ink, a.fill))
    print(to_png(stack, box, out + ".png", ink_rgb, fill_rgb, a.height))


if __name__ == "__main__":
    main()
