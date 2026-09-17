"""Geometry engine for Hellhound Audio.

Glyphs are authored as plain heavy bars and wedges.  Every outline then goes
through one shared pass that chamfers the corners, which is what gives the
family its chiselled, faceted look without hand-cutting each letter.
"""

import math

from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely import affinity

# ---------------------------------------------------------------- primitives

def R(x0, y0, x1, y1):
    """Axis-aligned bar."""
    return Polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def P(*points):
    """Free polygon."""
    return Polygon(list(points))


def DIAG(x0, y0, x1, y1, t):
    """Diagonal stroke of horizontal thickness ``t`` from one point to another."""
    h = t / 2.0
    return Polygon([(x0 - h, y0), (x0 + h, y0), (x1 + h, y1), (x1 - h, y1)])


# ------------------------------------------------------------------ chamfer

def _ring_ccw(coords):
    pts = list(coords)
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    area = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        area += x0 * y1 - x1 * y0
    return pts if area > 0 else pts[::-1]


# The facets are lit from the upper left: corners facing up-left or down-right
# get the deep cut, everything else only a nick.  One axis, applied globally,
# is what makes the whole alphabet look carved by the same chisel.
_AXIS = (-0.70710678, 0.70710678)


def _chamfer_ring(pts, cut_convex, cut_concave, directional=1.0):
    """Cut every corner of a CCW ring. Left turns are treated as convex."""
    n = len(pts)
    out = []
    for i in range(n):
        px, py = pts[(i - 1) % n]
        cx, cy = pts[i]
        nx, ny = pts[(i + 1) % n]

        v1x, v1y = px - cx, py - cy
        v2x, v2y = nx - cx, ny - cy
        l1 = math.hypot(v1x, v1y)
        l2 = math.hypot(v2x, v2y)
        if l1 < 1e-9 or l2 < 1e-9:
            continue
        v1x, v1y = v1x / l1, v1y / l1
        v2x, v2y = v2x / l2, v2y / l2

        # Nearly straight -> nothing to cut.
        if v1x * v2x + v1y * v2y < -0.9995:
            out.append((cx, cy))
            continue

        cross = v1x * v2y - v1y * v2x
        if cross < 0:  # convex as far as the ink is concerned
            bx, by = v1x + v2x, v1y + v2y
            blen = math.hypot(bx, by)
            if blen < 1e-9:
                facing = 0.0
            else:
                # Outward bisector, projected onto the chisel axis.
                ox, oy = -bx / blen, -by / blen
                facing = abs(ox * _AXIS[0] + oy * _AXIS[1])
            cut = cut_convex * (1.0 + directional * facing ** 1.4)
        else:
            cut = cut_concave
        # Never eat more than 40% of either arm.
        cut = min(cut, 0.4 * l1, 0.4 * l2)
        if cut <= 0.5:
            out.append((cx, cy))
            continue

        out.append((cx + v1x * cut, cy + v1y * cut))
        out.append((cx + v2x * cut, cy + v2y * cut))
    return out


def chamfer(geom, cut_convex, cut_concave, directional=1.0):
    """Chamfer every corner of a (Multi)Polygon."""
    polys = geom.geoms if isinstance(geom, MultiPolygon) else [geom]
    done = []
    for poly in polys:
        if poly.is_empty:
            continue
        shell = _chamfer_ring(_ring_ccw(poly.exterior.coords), cut_convex, cut_concave,
                              directional)
        # A hole's corners are concave as far as the ink is concerned, so the
        # two cut sizes swap over.
        holes = []
        for ring in poly.interiors:
            holes.append(_chamfer_ring(_ring_ccw(ring.coords), cut_concave, cut_convex,
                                       directional))
        if len(shell) >= 3:
            done.append(Polygon(shell, [h for h in holes if len(h) >= 3]))
    return unary_union(done) if done else Polygon()


# ------------------------------------------------------------- glyph shaping

def assemble(solids, holes=(), extra=(), cut_convex=40.0, cut_concave=30.0,
             slant=0.0, directional=2.1):
    """Union the parts, punch the holes, add any islands back, chamfer, shear."""
    shape = unary_union([s for s in solids if not s.is_empty])
    if holes:
        shape = shape.difference(unary_union(list(holes)))
    for isl_solids, isl_holes in extra:
        island = unary_union([s for s in isl_solids if not s.is_empty])
        if isl_holes:
            island = island.difference(unary_union(list(isl_holes)))
        shape = unary_union([shape, island])
    shape = shape.buffer(0)
    shape = chamfer(shape, cut_convex, cut_concave, directional)
    shape = shape.buffer(0)
    if slant:
        shape = affinity.skew(shape, xs=slant, origin=(0, 0), use_radians=False)
    return shape


def prune(geom_, min_thickness=8.0, min_area=900.0):
    """Drop hairline slivers and crumbs left behind by inward offsets."""
    kw = dict(join_style=2, mitre_limit=2.5)
    opened = geom_.buffer(-min_thickness / 2.0, **kw).buffer(min_thickness / 2.0, **kw)
    if opened.is_empty:
        return opened
    polys = opened.geoms if isinstance(opened, MultiPolygon) else [opened]
    keep = [p for p in polys if p.area >= min_area]
    return unary_union(keep) if keep else Polygon()


def inline(shape, gap, groove):
    """Outer band + inner core, with a ``groove``-wide channel cut between them.

    Reproduces the white keyline that runs inside the reference lettering.
    """
    kw = dict(join_style=2, mitre_limit=2.5)  # 2 == mitre
    inner = shape.buffer(-gap, **kw)
    core = shape.buffer(-(gap + groove), **kw)
    core = prune(core)
    band = shape.difference(inner) if not inner.is_empty else shape
    band = prune(band)
    result = unary_union([g for g in (band, core) if not g.is_empty])
    return result.buffer(0)


def sweep(shape, dx, dy):
    """Extrude ``shape`` along a vector: the solid backdrop for the 3-D layer."""
    parts = [shape, affinity.translate(shape, dx, dy)]
    polys = shape.geoms if isinstance(shape, MultiPolygon) else [shape]
    for poly in polys:
        rings = [poly.exterior] + list(poly.interiors)
        for ring in rings:
            pts = list(ring.coords)
            for a, b in zip(pts, pts[1:]):
                quad = Polygon([a, b, (b[0] + dx, b[1] + dy), (a[0] + dx, a[1] + dy)])
                if quad.is_valid and quad.area > 0:
                    parts.append(quad)
    return unary_union(parts).buffer(0)


# ---------------------------------------------------------------- pen output

def draw(shape, pen, round_to=1):
    """Emit a (Multi)Polygon to a fontTools pen."""
    polys = shape.geoms if isinstance(shape, MultiPolygon) else [shape]
    for poly in polys:
        if poly.is_empty or poly.area < 1.0:
            continue
        # TrueType/CFF want the outer contour clockwise, holes counter-clockwise.
        rings = [(_ring_ccw(poly.exterior.coords)[::-1], True)]
        for ring in poly.interiors:
            rings.append((_ring_ccw(ring.coords), False))
        for pts, _outer in rings:
            pts = [(round(x / round_to) * round_to, round(y / round_to) * round_to)
                   for x, y in pts]
            deduped = [pts[0]]
            for pt in pts[1:]:
                if pt != deduped[-1]:
                    deduped.append(pt)
            if len(deduped) > 1 and deduped[0] == deduped[-1]:
                deduped.pop()
            if len(deduped) < 3:
                continue
            pen.moveTo(deduped[0])
            for pt in deduped[1:]:
                pen.lineTo(pt)
            pen.closePath()
