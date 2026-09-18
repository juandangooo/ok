"""Export a Hellhound Audio wordmark as SVG and transparent PNG.

Google Docs cannot install a custom font, so the practical route for Docs is to
drop in a picture of the lettering.  This makes that picture at any size.

    python3 src/wordmark.py "HELLHOUND AUDIO" --out build/logo --bolt '#d7282f'
"""

import argparse, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shapely.geometry import MultiPolygon
from shapely.ops import unary_union
from shapely import affinity

import geom
from build import master_shapes, CMAP, SHADOW_VECTOR

LOGO_TRACKING = 268        # measured off the wordmark
_M = None


def typeset(text, tracking):
    global _M
    if _M is None:
        _M = master_shapes()
    body, bolts, x = [], [], 0
    for ch in text:
        name = CMAP.get(ord(ch))
        if name is None:
            continue
        adv, shape = _M[name]
        if not shape.is_empty:
            placed = affinity.translate(shape, x, 0)
            (bolts if name == "I" else body).append(placed)
        x += adv + tracking
    return (unary_union(body) if body else MultiPolygon(),
            unary_union(bolts) if bolts else MultiPolygon())


def styled(shape, style):
    if shape.is_empty or style == "regular":
        return shape
    if style == "outline":
        return geom.outline(shape, 34)
    raise SystemExit("unknown style: " + style)


def _polys(g):
    return list(g.geoms) if isinstance(g, MultiPolygon) else ([g] if not g.is_empty else [])


def to_svg(stack, box, path):
    x0, y0, x1, y1 = box
    body = []
    for g, colour in stack:
        d = []
        for poly in _polys(g):
            for ring in [poly.exterior] + list(poly.interiors):
                d.append("M" + " ".join("%.1f,%.1f" % (x - x0, y1 - y)
                                        for x, y in ring.coords) + "Z")
        if d:
            body.append('<path fill="%s" fill-rule="evenodd" d="%s"/>' % (colour, " ".join(d)))
    with open(path, "w") as fh:
        fh.write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" '
                 'width="%.0f" height="%.0f">\n%s\n</svg>\n'
                 % (x1 - x0, y1 - y0, x1 - x0, y1 - y0, "\n".join(body)))
    return path


def to_png(stack, box, path, height):
    from PIL import Image, ImageDraw
    x0, y0, x1, y1 = box
    ss, k = 4, height / (y1 - y0)
    W = max(1, int(round((x1 - x0) * k)))
    img = Image.new("RGBA", (W * ss, int(height) * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for g, colour in stack:
        rgb = tuple(int(colour.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
        for poly in sorted(_polys(g), key=lambda p: p.area, reverse=True):
            px = lambda r: [((x - x0) * k * ss, (y1 - y) * k * ss) for x, y in r.coords]
            d.polygon(px(poly.exterior), fill=rgb)
            for hole in poly.interiors:
                d.polygon(px(hole), fill=(0, 0, 0, 0))
    img.resize((W, int(height)), Image.LANCZOS).save(path)
    return path


def main():
    ap = argparse.ArgumentParser(description="Hellhound Audio wordmark exporter")
    ap.add_argument("text")
    ap.add_argument("--style", default="regular", choices=["regular", "outline"])
    ap.add_argument("--out", default="wordmark")
    ap.add_argument("--ink", default="#111111")
    ap.add_argument("--bolt", default=None, help="colour for the capital I (default: same as --ink)")
    ap.add_argument("--shadow", default=None, help="add an extrude behind, in this colour")
    ap.add_argument("--tracking", type=int, default=LOGO_TRACKING)
    ap.add_argument("--height", type=int, default=400)
    ap.add_argument("--pad", type=int, default=60)
    a = ap.parse_args()

    body, bolts = typeset(a.text, a.tracking)
    if body.is_empty and bolts.is_empty:
        raise SystemExit("nothing to set")
    body, bolts = styled(body, a.style), styled(bolts, a.style)

    stack = []
    if a.shadow:
        whole = unary_union([g for g in (body, bolts) if not g.is_empty])
        stack.append((geom.sweep(whole, *SHADOW_VECTOR), a.shadow))
    stack.append((body, a.ink))
    if not bolts.is_empty:
        stack.append((bolts, a.bolt or a.ink))

    union = unary_union([g for g, _ in stack if not g.is_empty])
    bx0, by0, bx1, by1 = union.bounds
    box = (bx0 - a.pad, by0 - a.pad, bx1 + a.pad, by1 + a.pad)

    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    print(to_svg(stack, box, out + ".svg"))
    print(to_png(stack, box, out + ".png", a.height))


if __name__ == "__main__":
    main()
