"""Geometry for Hellhound Audio.

A geometric sans: circles, straight stems, flat terminals.  Nothing here
chamfers anything - the shapes are drawn as they are meant to look, and the
only generated detail is the spur, which is measured off the wordmark.
"""

import math

from shapely.geometry import Polygon, MultiPolygon, LineString, box
from shapely.ops import unary_union
from shapely import affinity

CIRCLE_STEPS = 224          # ~0.2 unit chord error at this size: invisible


# --------------------------------------------------------------- primitives

def R(x0, y0, x1, y1):
    return Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def P(*points):
    return Polygon(list(points))


def E(cx, cy, rx, ry, steps=CIRCLE_STEPS):
    """Ellipse."""
    return Polygon([(cx + rx * math.cos(2 * math.pi * i / steps),
                     cy + ry * math.sin(2 * math.pi * i / steps))
                    for i in range(steps)])


def ring(cx, cy, rx, ry, sx, sy=None):
    """Elliptical ring of horizontal thickness ``sx`` and vertical ``sy``."""
    sy = sx if sy is None else sy
    return E(cx, cy, rx, ry).difference(E(cx, cy, rx - sx, ry - sy))


def arc(cx, cy, rx, ry, a0, a1, steps=64):
    """Points along an elliptical arc, angles in degrees, 0 deg = due right."""
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / steps)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / steps)))
            for i in range(steps + 1)]


def spath(points, width, closed=False):
    """A stroked path of constant width, flat-capped.

    Curved letters (S, 2, 3, 5, and the like) are far easier to get right as a
    centreline that is then given a thickness than as a pile of booleans.
    """
    line = LineString(points)
    return line.buffer(width / 2.0, cap_style=2, join_style=1,
                       resolution=32).buffer(0)


def DIAG(x0, y0, x1, y1, t):
    """Diagonal stroke of horizontal thickness ``t``."""
    h = t / 2.0
    return Polygon([(x0 - h, y0), (x0 + h, y0), (x1 + h, y1), (x1 - h, y1)])


def U(*parts):
    return unary_union([p for p in parts if not p.is_empty]).buffer(0)


def clip(shape, y0=-2000, y1=2000, x0=-3000, x1=6000):
    return shape.intersection(box(x0, y0, x1, y1))


# -------------------------------------------------------------------- spur

def _runs(shape, y0, y1, x0=-3000.0, x1=6000.0):
    cut = shape.intersection(box(x0, y0, x1, y1))
    if cut.is_empty:
        return []
    parts = cut.geoms if hasattr(cut, "geoms") else [cut]
    out = []
    for part in parts:
        if part.geom_type == "Polygon" and not part.is_empty:
            bx0, _, bx1, _ = part.bounds
            out.append((bx0, bx1))
    return sorted(out)


def spur(shape, depth=170.0, stroke=166.0):
    """The wordmark's descending spur, hung off the rightmost stem.

    Measured off the logo: the outer edge of the rightmost stroke carries on
    downwards along its own slope, and the foot is cut back on a diagonal from
    the inner edge at the baseline to the tip.  On the H that outer edge is
    vertical; on the A it keeps the leg's angle, which is why the slope is read
    from the glyph rather than assumed.

    Only a straight stem takes one.  A foot that is a horizontal bar (E, L, Z)
    or the bottom of a bowl (O, U, D) is too wide and is left alone, which is
    what the wordmark does.
    """
    if shape.is_empty:
        return None
    feet = _runs(shape, 0.0, 5.0)
    if not feet:
        return None
    x0, x1 = feet[-1]                       # rightmost
    if not (stroke * 0.45 <= x1 - x0 <= stroke * 1.35):
        return None    # a bar, a bowl or a point - not a stem

    # Follow the outer edge upwards to get its slope.
    window = _runs(shape, 118.0, 124.0, x0 - stroke, x1 + stroke)
    if not window:
        return None
    ux1 = window[-1][1]
    if abs(ux1 - x1) > stroke * 1.6:
        return None
    slope = (x1 - ux1) / 120.0              # +ve when the edge leans right
    tip = x1 + slope * depth
    return Polygon([(x0, 0.0), (x1, 0.0), (tip, -depth)]).buffer(0)


def with_spur(shape, **kw):
    tip = spur(shape, **kw)
    if tip is None or tip.is_empty or tip.area < 200:
        return shape
    return U(shape, tip)


# ------------------------------------------------------------ style passes

_MITRE = dict(join_style=2, mitre_limit=2.5)


def prune(geom_, min_thickness=8.0, min_area=900.0):
    opened = geom_.buffer(-min_thickness / 2.0, **_MITRE).buffer(min_thickness / 2.0, **_MITRE)
    if opened.is_empty:
        return opened
    polys = opened.geoms if isinstance(opened, MultiPolygon) else [opened]
    keep = [p for p in polys if p.area >= min_area]
    return unary_union(keep) if keep else Polygon()


def inline(shape, gap, groove):
    inner = shape.buffer(-gap, **_MITRE)
    core = prune(shape.buffer(-(gap + groove), **_MITRE))
    band = prune(shape.difference(inner) if not inner.is_empty else shape)
    return U(band, core)


def outline(shape, weight):
    return prune(shape.difference(shape.buffer(-weight, **_MITRE)))


def sweep(shape, dx, dy):
    parts = [shape, affinity.translate(shape, dx, dy)]
    polys = shape.geoms if isinstance(shape, MultiPolygon) else [shape]
    for poly in polys:
        for r in [poly.exterior] + list(poly.interiors):
            pts = list(r.coords)
            for a, b in zip(pts, pts[1:]):
                q = Polygon([a, b, (b[0] + dx, b[1] + dy), (a[0] + dx, a[1] + dy)])
                if q.is_valid and q.area > 0:
                    parts.append(q)
    return unary_union(parts).buffer(0)


# ---------------------------------------------------------------- pen output

def _ccw(coords):
    pts = list(coords)
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    area = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        area += x0 * y1 - x1 * y0
    return pts if area > 0 else pts[::-1]


def draw(shape, pen, grid=0.5):
    polys = shape.geoms if isinstance(shape, MultiPolygon) else [shape]
    for poly in polys:
        if poly.is_empty or poly.area < 1.0:
            continue
        rings = [_ccw(poly.exterior.coords)[::-1]]
        rings += [_ccw(r.coords) for r in poly.interiors]
        for pts in rings:
            pts = [(round(x / grid) * grid, round(y / grid) * grid) for x, y in pts]
            out = [pts[0]]
            for pt in pts[1:]:
                if pt != out[-1]:
                    out.append(pt)
            if len(out) > 1 and out[0] == out[-1]:
                out.pop()
            if len(out) < 3:
                continue
            pen.moveTo(out[0])
            for pt in out[1:]:
                pen.lineTo(pt)
            pen.closePath()
