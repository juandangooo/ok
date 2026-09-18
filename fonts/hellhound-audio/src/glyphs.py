"""Hellhound Audio - glyph sources.

A bold geometric sans built to the wordmark's own measurements.  Taken off the
logo at cap height 76px: stroke/cap 0.237, and width/cap of H 0.87, E 0.70,
L 0.63, O 1.10, U 0.87, N 0.91, D 0.93.  Scaled to a 700 cap those give the
numbers below.

Two alphabets share these outlines.  The marked set (uppercase) adds the
descending spur, and swaps in the crossbar-less A and the thunderbolt I that
the logo uses.  The plain set (lowercase) is the conventional cut.
"""

from shapely import affinity

from geom import R, P, E, ring, DIAG, U, clip, arc, spath

CAP = 700
S = 166          # vertical stroke
HB = 148         # horizontal stroke
OV = 16          # overshoot on round letters
CS = 158         # stroke for the path-drawn curves (S, 2 ...)
DS = 132         # lighter, for the stacked bowls of 3 5 6 8 9 and the &

GLYPHS = {}


def g(name, advance, shape):
    GLYPHS[name] = (advance, shape)


def bowl(x_flat, y0, y1, rx, sx=S, sy=HB):
    """Right-hand bowl: flat to ``x_flat``, then a half ellipse of radius rx.

    Only the right half of each ellipse is kept - the left half would bulge out
    past the stem and turn the D into an O.
    """
    cy, ry = (y0 + y1) / 2.0, (y1 - y0) / 2.0
    outer = U(R(0, y0, x_flat, y1), clip(E(x_flat, cy, rx, ry), x0=x_flat))
    inner = U(R(sx, y0 + sy, x_flat, y1 - sy),
              clip(E(x_flat, cy, rx - sx, ry - sy), x0=x_flat))
    return outer.difference(inner)


# ----------------------------------------------------------------- A - Z

_A_OUT = P((0, 0), (672, 0), (336, 700))
_A_IN = P((S, 0), (672 - S, 0), (336, 354))
_A = _A_OUT.difference(_A_IN)
g("Alambda", 672, _A)                                   # the logo's crossbar-less A
g("A", 672, U(_A, R(0, 158, 672, 306).intersection(_A_OUT)))

g("B", 620, U(R(0, 0, 300, 700),
              clip(E(300, 525, 320, 175), x0=300),
              clip(E(300, 175, 320, 175), x0=300))
      .difference(U(R(S, 424, 300, 552), clip(E(300, 488, 154, 64), x0=300)))
      .difference(U(R(S, 148, 300, 276), clip(E(300, 212, 154, 64), x0=300))))

g("C", 740, ring(370, 350, 370, 350 + OV, S, HB).difference(R(370, 222, 900, 478)))

g("D", 654, bowl(220, 0, 700, 434))

g("E", 488, U(R(0, 0, S, 700), R(0, 700 - HB, 488, 700), R(0, 0, 488, HB),
              R(0, 276, 440, 276 + HB)))

g("F", 470, U(R(0, 0, S, 700), R(0, 700 - HB, 470, 700), R(0, 290, 430, 290 + HB)))

g("G", 770, U(ring(385, 350, 385, 350 + OV, S, HB).difference(R(385, 350, 900, 560)),
              R(500, 286, 770, 286 + HB)))

g("H", 608, U(R(0, 0, S, 700), R(608 - S, 0, 608, 700), R(0, 276, 608, 276 + HB)))

g("I", 166, R(0, 0, S, 700))

# Lifted straight off the wordmark: the outline was traced from the red bolt and
# reduced to its six corners.
g("Ibolt", 295, P((244, 847), (166, 396), (290, 447), (65, -166), (129, 249), (0, 203)))

g("J", 390, U(R(390 - S, 190, 390, 700),
              clip(ring(195, 190, 195, 190 + OV, S, HB), y1=190)))

g("K", 620, U(R(0, 0, S, 700),
              P((S, 292), (312, 292), (620, 700), (424, 700)),
              P((S, 408), (312, 408), (620, 0), (424, 0))))

g("L", 442, U(R(0, 0, S, 700), R(0, 0, 442, HB)))

# The diagonals are drawn overlong and cut back to the letter box, the way a
# real N or M has its diagonal trimmed by the stems.
g("M", 860, clip(U(R(0, 0, S, 700), R(860 - S, 0, 860, 700),
                   DIAG(83, 700, 430, 250, 176), DIAG(777, 700, 430, 250, 176)),
                 x0=0, x1=860))

g("N", 636, clip(U(R(0, 0, S, 700), R(636 - S, 0, 636, 700),
                   DIAG(83, 700, 553, 0, 196)), x0=0, x1=636))

g("O", 770, ring(385, 350, 385, 350 + OV, S, HB))

g("P", 590, U(R(0, 0, S, 700),
              U(R(0, 352, 300, 700), E(300, 526, 290, 174))
              .difference(U(R(S, 400, 300, 652), E(300, 526, 124, 126)))))

g("Q", 770, U(ring(385, 350, 385, 350 + OV, S, HB),
              P((470, 214), (610, 274), (770, -92), (630, -152))))

g("R", 618, U(R(0, 0, S, 700),
              U(R(0, 372, 300, 700), E(300, 536, 290, 164))
              .difference(U(R(S, 416, 300, 656), E(300, 536, 124, 120))),
              P((236, 400), (404, 400), (618, 0), (438, 0))))

_S_PATH = (arc(310, 515, 231, 106, 20, 215) + arc(310, 185, 231, 106, 35, -160))
g("S", 620, spath(_S_PATH, CS))

g("T", 620, U(R(0, 700 - HB, 620, 700), R(227, 0, 227 + S, 700)))

g("U", 608, clip(
    U(R(0, 190, 608, 700), E(304, 190, 304, 190 + OV))
    .difference(U(R(S, 190, 608 - S, 760), E(304, 190, 304 - S, 190 + OV - HB))),
    y1=700))

g("V", 668, U(P((0, 700), (S, 700), (400, 0), (268, 0)),
              P((668, 700), (668 - S, 700), (268, 0), (400, 0))))

g("W", 990, U(P((0, 700), (S, 700), (332, 0), (200, 0)),
              P((429, 700), (429 + S, 700), (332, 0), (200, 0)),
              P((429, 700), (429 + S, 700), (790, 0), (658, 0)),
              P((990 - S, 700), (990, 700), (790, 0), (658, 0))))

g("X", 640, clip(U(DIAG(83, 700, 557, 0, 186), DIAG(557, 700, 83, 0, 186)),
                 x0=0, x1=640))

g("Y", 640, clip(U(DIAG(83, 700, 320, 372, 186), DIAG(557, 700, 320, 372, 186),
                   R(320 - S / 2, 0, 320 + S / 2, 400)), x0=0, x1=640))

g("Z", 590, U(R(0, 700 - HB, 590, 700), R(0, 0, 590, HB),
              P((404, 700 - HB), (590, 700 - HB), (186, HB), (0, HB))))

# ----------------------------------------------------------------- 0 - 9

g("zero", 660, ring(330, 350, 330, 350 + OV, S, HB))
g("one", 400, U(R(400 - S - 40, 0, 400 - 40, 700), P((30, 520), (194, 430), (194, 604), (30, 604))))
g("two", 620, U(spath(arc(310, 470, 231, 151, 200, -20), CS),
                R(0, 0, 620, HB),
                P((454, 470), (620, 470), (232, HB), (0, HB))))
g("three", 620, spath(arc(300, 512, 205, 108, 168, -104)
                      + arc(300, 212, 240, 212, 108, -175), DS))

g("four", 660, U(P((640, 700), (474, 700), (0, 236), (0, 110)),
                 R(0, 110, 660, 110 + HB), R(660 - S - 40, 0, 660 - 40, 700)))
g("five", 620, clip(U(R(0, 700 - HB, 548, 700), R(0, 396, S, 700),
                      spath([(66, 462)] + arc(300, 240, 248, 240, 112, -152), DS)),
                    x0=0, y0=0))

g("six", 600, U(ring(290, 226, 268, 226, DS, DS),
                spath(arc(300, 300, 258, 330, 180, 74), DS)))

g("seven", 600, U(R(0, 700 - HB, 600, 700), P((420, 552), (600, 552), (250, 0), (70, 0))))
g("eight", 620, U(E(310, 496, 232, 204), E(310, 204, 268, 204))
       .difference(U(E(310, 496, 100, 76), E(310, 204, 136, 76))))

g("nine", 600, U(ring(310, 474, 268, 226, DS, DS),
                 spath(arc(300, 400, 258, 330, 0, -106), DS)))

# ---------------------------------------------------------- punctuation

DOT = 88
g("space", 300, R(0, 0, 0, 0))
g("period", 280, E(DOT, DOT, DOT, DOT))
g("comma", 280, U(E(DOT, DOT, DOT, DOT), P((10, 60), (DOT * 2, 60), (96, -170), (18, -170))))
g("colon", 280, U(E(DOT, DOT, DOT, DOT), E(DOT, 420, DOT, DOT)))
g("semicolon", 280, U(E(DOT, 420, DOT, DOT), E(DOT, DOT, DOT, DOT),
                      P((10, 60), (DOT * 2, 60), (96, -170), (18, -170))))
g("exclam", 280, U(E(DOT, DOT, DOT, DOT), R(DOT - S / 2, 250, DOT + S / 2, 700)))
g("question", 520, U(spath(arc(260, 505, 181, 116, 180, -35)
                           + [(260, 300), (260, 250)], CS),
                     E(260, DOT, DOT, DOT)))
g("hyphen", 420, R(60, 276, 360, 276 + HB))
g("endash", 560, R(60, 276, 500, 276 + HB))
g("emdash", 760, R(40, 276, 720, 276 + HB))
g("underscore", 620, R(0, -150, 620, -150 + HB))
g("quotesingle", 260, R(47, 470, 47 + S, 700))
g("quotedbl", 480, U(R(47, 470, 47 + S, 700), R(267, 470, 267 + S, 700)))
g("quoteleft", 260, U(E(130, 610, 88, 88), P((60, 570), (218, 570), (150, 400), (72, 400))))
GLYPHS["quoteright"] = GLYPHS["quoteleft"]
g("quotedblleft", 480, U(E(130, 610, 88, 88), P((60, 570), (218, 570), (150, 400), (72, 400)),
                         E(350, 610, 88, 88), P((280, 570), (438, 570), (370, 400), (292, 400))))
GLYPHS["quotedblright"] = GLYPHS["quotedblleft"]
g("slash", 560, P((380, 760), (560, 760), (180, -120), (0, -120)))
g("backslash", 560, P((180, 760), (0, 760), (380, -120), (560, -120)))
g("parenleft", 360, clip(ring(300, 300, 300, 420, S, S), x1=300).difference(R(-50, -300, 20, 900)))
g("parenright", 360, clip(ring(60, 300, 300, 420, S, S), x0=60).difference(R(340, -300, 420, 900)))
g("bracketleft", 340, U(R(0, -60, S, 700), R(0, 700 - HB, 300, 700), R(0, -60, 300, -60 + HB)))
g("bracketright", 340, U(R(300 - S, -60, 300, 700), R(0, 700 - HB, 300, 700), R(0, -60, 300, -60 + HB)))
g("plus", 560, U(R(50, 276, 510, 276 + HB), R(280 - HB / 2, 126, 280 + HB / 2, 574)))
g("equal", 560, U(R(50, 180, 510, 180 + HB), R(50, 400, 510, 400 + HB)))
g("numbersign", 660, U(R(160, 0, 160 + 120, 700), R(380, 0, 500, 700),
                       R(20, 190, 640, 310), R(20, 420, 640, 540)))
g("percent", 740, U(P((470, 760), (660, 760), (270, -60), (80, -60)),
                    ring(150, 550, 150, 150, 110, 100),
                    ring(590, 150, 150, 150, 110, 100)))
g("dollar", 620, U(GLYPHS["S"][1], R(310 - 52, -90, 310 + 52, 790)))
AW = 120         # the ampersand needs a lighter stroke to keep its small loop open
g("ampersand", 700, clip(U(
    ring(230, 520, 170, 170, AW, AW).difference(R(230, 180, 900, 520)),
    ring(250, 200, 200, 200, AW, AW).difference(R(250, 200, 900, 560)),
    spath([(140, 420), (630, 30)], AW)), x0=0, y0=0, y1=700))

g("at", 860, clip(U(spath(arc(430, 350, 335, 335, -40, 290), 130),
                    ring(430, 330, 176, 176, 118, 110),
                    spath([(606, 330), (606, 240), (690, 240)], 118)),
                  x0=0, y0=-16, y1=716))
_AST = R(230 - 56, 300, 230 + 56, 700)
g("asterisk", 460, U(_AST,
                     affinity.rotate(_AST, 60, origin=(230, 500)),
                     affinity.rotate(_AST, -60, origin=(230, 500))))
g("bullet", 340, E(170, 300, 120, 120))
g("periodcentered", 280, E(DOT, 300, DOT, DOT))
