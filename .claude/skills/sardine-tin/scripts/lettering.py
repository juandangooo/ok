"""
Hand-cut display lettering, built as paths rather than set in a font.

When a brand's own letterforms matter, substituting a Google Font is the wrong
move twice over: it loses the shapes, and a typeset word is mechanically
perfect in a way nothing else on the can is. Draw the skeleton instead and let
every stroke be a little off.

This module carries one alphabet — a monoline squared grotesque of the
Eurostile / Microgramma cast: flat terminals, square corners, superelliptical
O and D, extended proportions. Glyphs are CENTRELINES on a 100-unit cap
height; the weight comes from the stroke, so the same skeleton gives you light
or heavy simply by changing it.

    from lettering import word
    paths, w = word("HELLHOUND", x=200, y=210, cap=66, tracking=16, seed=3)
"""

import math
import random

STROKE = 17.0          # nominal stroke as a fraction of the 100-unit cap
_S = STROKE / 2.0      # 8.5 — how far a centreline sits inside the glyph box


def arc(cx, cy, r, a0, a1, n=7):
    """Sampled arc, degrees, screen coords (y down). 270 is up, 90 is down."""
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
            for a in [a0 + (a1 - a0) * i / n for i in range(n + 1)]]


T, B = _S, 100 - _S     # centreline top and bottom
R = 20                  # corner radius of the squared bowls

# advance width -> list of centreline polylines
GLYPHS = {
    "H": (84, [[(_S, T), (_S, B)], [(75.5, T), (75.5, B)], [(_S, 50), (75.5, 50)]]),
    "E": (72, [[(63.5, T), (_S, T), (_S, B), (63.5, B)], [(_S, 50), (56, 50)]]),
    "L": (62, [[(_S, T), (_S, B), (53.5, B)]]),
    "F": (70, [[(61.5, T), (_S, T), (_S, B)], [(_S, 50), (54, 50)]]),
    "I": (28, [[(14, T), (14, B)]]),
    "T": (76, [[(_S, T), (67.5, T)], [(38, T), (38, B)]]),
    "N": (86, [[(_S, B), (_S, T)], [(_S, T), (77.5, B)], [(77.5, B), (77.5, T)]]),
    "M": (104, [[(_S, B), (_S, T)], [(_S, T), (52, 62)], [(52, 62), (95.5, T)],
                [(95.5, T), (95.5, B)]]),
    "A": (86, [[(_S, B), (26, T)], [(26, T), (60, T)], [(60, T), (77.5, B)],
                [(19, 58), (67, 58)]]),
    "W": (116, [[(_S, T), (26, B)], [(26, B), (58, 32)], [(58, 32), (90, B)],
                [(90, B), (107.5, T)]]),
    "O": (88, [arc(28.5, 28.5, R, 180, 270) + arc(59.5, 28.5, R, 270, 360)
               + arc(59.5, 71.5, R, 0, 90) + arc(28.5, 71.5, R, 90, 180)
               + [(_S, 28.5)]]),
    "D": (84, [[(_S, B), (_S, T), (55, T)] + arc(55, 28.5, R, 270, 360)
               + [(75.5, 71.5)] + arc(55, 71.5, R, 0, 90) + [(55, B), (_S, B)]]),
    "U": (84, [[(_S, T), (_S, 68)] + arc(28.5, 68, R, 180, 90)
               + [(55.5, 88)] + arc(55.5, 68, R, 90, 0) + [(75.5, T)]]),
    "C": (82, [[(73.5, 24), (57, T), (28.5, T)] + arc(28.5, 28.5, R, 270, 180)
               + [(_S, 71.5)] + arc(28.5, 71.5, R, 180, 90)
               + [(57, B), (73.5, 76)]]),
    "G": (86, [[(73.5, 24), (57, T), (28.5, T)] + arc(28.5, 28.5, R, 270, 180)
               + [(_S, 71.5)] + arc(28.5, 71.5, R, 180, 90) + [(57, B), (77.5, B)],
               [(52, 54), (77.5, 54), (77.5, B)]]),
    "P": (80, [[(_S, B), (_S, T), (51, T)] + arc(51, 28.5, R, 270, 360)
               + [(71.5, 52)] + arc(51, 52, R, 0, 90) + [(51, 72), (_S, 72)]]),
    "R": (84, [[(_S, B), (_S, T), (51, T)] + arc(51, 28.5, R, 270, 360)
               + [(71.5, 52)] + arc(51, 52, R, 0, 90) + [(51, 72), (_S, 72)],
               [(46, 72), (75.5, B)]]),
    "S": (80, [[(71.5, 24), (56, T), (26, T), (_S, 24), (_S, 36), (24, 48),
                (56, 52), (71.5, 64), (71.5, 76), (56, B), (24, B), (_S, 76)]]),
    ".": (26, [[(13, B - 3), (13, B)]]),
    "·": (26, [[(13, 48), (13, 51)]]),
    " ": (40, []),
}


def word(text, x, y, cap=60, tracking=14, seed=0, weight=STROKE,
         amp=0.9, weight_var=0.07):
    """Lay out `text` with its baseline at `y`, left edge at `x`.

    Returns (list of <path> elements, total advance width). Each stroke gets
    its own jittered points and its own slightly different weight, so no two
    letters are cut quite alike — which is the whole point of drawing them.
    """
    rng = random.Random(seed)
    s = cap / 100.0
    out, pen = [], x
    for ch in text.upper():
        if ch not in GLYPHS:
            continue
        adv, polys = GLYPHS[ch]
        # each letter sits a hair off its own baseline and leans a touch
        dy = rng.uniform(-amp, amp) * 0.9
        lean = rng.uniform(-0.45, 0.45)
        for poly in polys:
            pts = []
            for px, py in poly:
                jx = px + rng.uniform(-amp, amp)
                jy = py + rng.uniform(-amp, amp)
                jx += (100 - jy) * math.tan(math.radians(lean))   # slight lean
                pts.append((pen + jx * s, y - cap + (jy + dy) * s))
            d = "M" + " L".join(f"{a:.2f} {b:.2f}" for a, b in pts)
            w = weight * s * (1 + rng.uniform(-weight_var, weight_var))
            out.append(
                f'<path fill="none" stroke-width="{w:.2f}" stroke-linecap="butt" '
                f'stroke-linejoin="miter" stroke-miterlimit="4" d="{d}"/>')
        pen += adv * s + tracking
    return out, (pen - tracking - x if text else 0)


def measure(text, cap=60, tracking=14):
    s = cap / 100.0
    total = sum(GLYPHS[c][0] * s + tracking for c in text.upper() if c in GLYPHS)
    return max(total - tracking, 0)
