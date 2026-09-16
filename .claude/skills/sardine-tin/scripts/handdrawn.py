"""
Hand-drawn primitives for tin-can artwork.

The hand does not come from wobbling a font. It comes from four things this
module produces: lines whose weight swells and thins, texture made of
individually placed marks rather than a tiling pattern, geometry that is
slightly wrong, and colour that sits a hair off its outline.

Every function returns an SVG path `d` string (or a list of them), so output
drops straight into a template. Seeds are explicit: same seed, same drawing.

    from handdrawn import smooth, taper, wobble_rect, scatter, hatch
"""

import math
import random


# ——————————————————————————————————————————————— curves

def smooth(points, closed=False, tension=1.0):
    """Catmull-Rom through `points` as a cubic path. Use for any organic
    contour — a fish back, a jaw, a coil of cable."""
    p = list(points)
    if len(p) < 3:
        return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in p)
    if closed:
        p = [p[-1]] + p + [p[0], p[1]]
    else:
        p = [p[0]] + p + [p[-1]]
    d = [f"M{p[1][0]:.2f} {p[1][1]:.2f}"]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * tension,
              p1[1] + (p2[1] - p0[1]) / 6 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * tension,
              p2[1] - (p3[1] - p1[1]) / 6 * tension)
        d.append(f"C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} "
                 f"{p2[0]:.2f} {p2[1]:.2f}")
    if closed:
        d.append("Z")
    return " ".join(d)


def jitter(points, amp=1.8, seed=0):
    """Nudge every point off its ideal position. Keep amp at 0.3–0.8% of the
    drawing's width; past that it reads as a gimmick, not a hand."""
    rng = random.Random(seed)
    return [(x + rng.uniform(-amp, amp), y + rng.uniform(-amp, amp))
            for x, y in points]


# ——————————————————————————————————————————————— variable-weight line

def taper(points, widths, closed=False, straight=False):
    """A stroke drawn as a FILLED shape so its weight can swell and thin the
    way a nib does. `widths` is one width per point (or a single number).

    Pass `straight=True` for anything with corners that must stay corners — a
    hexagon, a frame, a letterform. The default smooths through the points,
    which will quietly dissolve a polygon into a blob.

    This is the difference between a drawn line and a plotted one. A uniform
    `stroke-width` is the machine tell — use it for rules and keylines, and
    use this for anything that is meant to have been drawn.
    """
    n = len(points)
    if isinstance(widths, (int, float)):
        widths = [widths] * n
    left, right = [], []
    for i, (x, y) in enumerate(points):
        if i == 0:
            dx, dy = points[1][0] - x, points[1][1] - y
        elif i == n - 1:
            dx, dy = x - points[-2][0], y - points[-2][1]
        else:
            dx = points[i + 1][0] - points[i - 1][0]
            dy = points[i + 1][1] - points[i - 1][1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        w = widths[i] / 2.0
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    pts = left + right[::-1]
    if straight:
        return "M" + " L".join(f"{a:.2f} {b:.2f}" for a, b in pts) + " Z"
    return smooth(pts, closed=True)


def stroke_weights(n, ends=0.5, belly=1.0, peak=0.45):
    """Width multipliers for `taper`: thin at the ends, fat at `peak` along
    the run. Multiply by your nominal weight."""
    out = []
    for i in range(n):
        t = i / max(n - 1, 1)
        # distance from the belly, normalised to each side
        d = (peak - t) / peak if t < peak else (t - peak) / max(1 - peak, 1e-6)
        out.append(ends + (belly - ends) * (1 - d ** 1.6))
    return out


# ——————————————————————————————————————————————— geometry that is slightly wrong

def wobble_rect(x, y, w, h, r, amp=1.6, seed=0, per_corner=7):
    """A rounded rectangle whose four corners do not quite match — for frames
    and keylines. A perfect `<rect rx>` frame is the fastest way to look
    printed rather than drawn."""
    rng = random.Random(seed)
    pts = []
    corners = [(x + r, y + r, 180, 270), (x + w - r, y + r, 270, 360),
               (x + w - r, y + h - r, 0, 90), (x + r, y + h - r, 90, 180)]
    for cx, cy, a0, a1 in corners:
        rr = r * rng.uniform(0.93, 1.07)          # each corner its own radius
        for i in range(per_corner + 1):
            a = math.radians(a0 + (a1 - a0) * i / per_corner)
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return smooth(jitter(pts, amp, seed), closed=True)


# ——————————————————————————————————————————————— texture made of marks

def scatter(x, y, w, h, n, seed=0, length=7.0, angle=0.0,
            spread=16.0, len_var=0.45, inside=None):
    """Individually placed tick marks — scales, stipple, shading, sand.

    Returns a list of tiny path strings. This is deliberately NOT an SVG
    `<pattern>`: a pattern repeats exactly and the eye catches the grid
    instantly. Marks belong on the subject; keep patterns for flat background
    tone where the regularity is not read as drawing.

    `inside(px, py) -> bool` masks the marks to a shape.
    """
    rng = random.Random(seed)
    out = []
    tries = 0
    while len(out) < n and tries < n * 40:
        tries += 1
        px = x + rng.random() * w
        py = y + rng.random() * h
        if inside and not inside(px, py):
            continue
        a = math.radians(angle + rng.uniform(-spread, spread))
        L = length * (1 + rng.uniform(-len_var, len_var))
        dx, dy = math.cos(a) * L / 2, math.sin(a) * L / 2
        out.append(f"M{px - dx:.1f} {py - dy:.1f} L{px + dx:.1f} {py + dy:.1f}")
    return out


def hatch(x, y, w, h, spacing=6.0, angle=35.0, seed=0,
          jitter_amp=1.2, shorten=0.12, inside=None, bow=0.0):
    """Hatching drawn line by line, each one slightly off its neighbour and
    each one a little short of the last. Same job as a hatch `<pattern>`, but
    it does not tile, so it reads as engraving instead of as a fill.

    `bow` bends each line, which is how an engraver follows a curved form.
    Stack two calls at different angles for cross-hatch, three spacings for
    three tonal steps.
    """
    rng = random.Random(seed)
    a = math.radians(angle)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    diag = math.hypot(w, h)
    cx, cy = x + w / 2, y + h / 2
    out = []
    k = -int(diag / spacing) - 1
    while k * spacing <= diag:
        off = k * spacing + rng.uniform(-jitter_amp, jitter_amp)
        k += 1
        bx, by = cx + nx * off, cy + ny * off
        half = diag / 2 * (1 - rng.uniform(0, shorten))
        p0 = (bx - dx * half, by - dy * half)
        p1 = (bx + dx * half, by + dy * half)
        if inside:
            segs, on, start = [], False, None
            steps = max(int(half * 2 / 3), 12)
            for i in range(steps + 1):
                t = i / steps
                px = p0[0] + (p1[0] - p0[0]) * t
                py = p0[1] + (p1[1] - p0[1]) * t
                ok = inside(px, py)
                if ok and not on:
                    start, on = (px, py), True
                elif not ok and on:
                    segs.append((start, (px, py)))
                    on = False
            if on:
                segs.append((start, p1))
        else:
            segs = [(p0, p1)]
        for s, e in segs:
            if math.hypot(e[0] - s[0], e[1] - s[1]) < spacing * 0.6:
                continue
            if bow:
                mx = (s[0] + e[0]) / 2 + nx * bow
                my = (s[1] + e[1]) / 2 + ny * bow
                out.append(f"M{s[0]:.1f} {s[1]:.1f} Q{mx:.1f} {my:.1f} "
                           f"{e[0]:.1f} {e[1]:.1f}")
            else:
                out.append(f"M{s[0]:.1f} {s[1]:.1f} L{e[0]:.1f} {e[1]:.1f}")
    return out


# ——————————————————————————————————————————————— helpers

def ellipse_mask(cx, cy, rx, ry):
    """An `inside` predicate for scatter/hatch."""
    return lambda px, py: ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1.0


def paths(ds, **attrs):
    """Join many path strings into one <path> element (one node, one fill)."""
    a = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<path {a} d="{" ".join(ds)}"/>'
