"""Compile the Hellhound Audio family to OTF / TTF / WOFF2."""

import os, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from shapely import affinity

import geom
from glyphs import GLYPHS, CAP, S

UPM = 1000
ASC, DESC = 800, -260          # the spur and the bolt both descend
SB = 96                        # sidebearing; the wordmark adds ~315 more tracking
VERSION = "2.000"
YEAR = datetime.date.today().year
SHADOW_VECTOR = (54, -54)

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
# What the marked (uppercase) alphabet swaps in, straight from the wordmark.
MARKED = {"A": "Alambda", "I": "Ibolt"}

# Which capitals carry the spur.  The wordmark shows it on H and A - both
# letters whose rightmost stroke is a straight stem landing flat on the
# baseline - so the set is every capital built that way.  On a bowl (B D O S)
# or a bottom bar (E L Z) there is no stem to hang it from and it reads as a
# blot, so those are left clean.  Set this to "AH" to copy the logo exactly, or
# drop the N: the logo's own N has no spur, though structurally it could.
SPURRED = "AFHKMNPRT"

STYLES = {
    "Regular": lambda s: s,
    "Outline": lambda s: geom.outline(s, 34),
    "Shadow":  lambda s: geom.sweep(s, *SHADOW_VECTOR),
}
DESCRIPTIONS = {
    "Regular": "The wordmark cut: bold geometric caps, spurred on the shift key.",
    "Outline": "Hollow caps - the perimeter only.",
    "Shadow":  "The 3-D extrude. Set it behind Regular in a second colour.",
}

CMAP = {
    0x20: "space", 0x21: "exclam", 0x22: "quotedbl", 0x23: "numbersign",
    0x24: "dollar", 0x25: "percent", 0x26: "ampersand", 0x27: "quotesingle",
    0x28: "parenleft", 0x29: "parenright", 0x2A: "asterisk", 0x2B: "plus",
    0x2C: "comma", 0x2D: "hyphen", 0x2E: "period", 0x2F: "slash",
    0x3A: "colon", 0x3B: "semicolon", 0x3D: "equal", 0x3F: "question",
    0x40: "at", 0x5B: "bracketleft", 0x5C: "backslash", 0x5D: "bracketright",
    0x5F: "underscore", 0x60: "quoteleft",
    0x2013: "endash", 0x2014: "emdash", 0x2018: "quoteleft", 0x2019: "quoteright",
    0x201C: "quotedblleft", 0x201D: "quotedblright", 0x2022: "bullet",
    0x00A0: "space", 0x00B7: "periodcentered",
}
for i, n in enumerate("zero one two three four five six seven eight nine".split()):
    CMAP[0x30 + i] = n
for i in range(26):
    CMAP[0x41 + i] = LETTERS[i]            # A -> marked cap
    CMAP[0x61 + i] = LETTERS[i].lower()    # a -> plain cap

KERN = """
languagesystem DFLT dflt;
languagesystem latn dflt;

@A = [A a]; @B = [B b]; @C = [C c]; @D = [D d]; @E = [E e]; @F = [F f];
@G = [G g]; @H = [H h]; @I = [I i]; @J = [J j]; @K = [K k]; @L = [L l];
@M = [M m]; @N = [N n]; @O = [O o]; @P = [P p]; @Q = [Q q]; @R = [R r];
@S = [S s]; @T = [T t]; @U = [U u]; @V = [V v]; @W = [W w]; @X = [X x];
@Y = [Y y]; @Z = [Z z];

@ROUND = [@C @G @O @Q];
@FLAG  = [@T @V @W @Y];
@STOP  = [period comma colon semicolon];

feature kern {
    pos @A @FLAG -60;
    pos @FLAG @A -60;
    pos [@F @P] @A -35;
    pos @L @FLAG -70;
    pos @L [@ROUND @U] -20;
    pos @FLAG [@ROUND @U] -30;
    pos @ROUND [@A @V @W @X @Y] -20;
    pos [@FLAG @F @P] @STOP -90;
    pos [@A @V @W @X @Y] @STOP -50;
    pos @Y @A -70;
    pos @W @A -50;
    pos [@D @B @P @R] @A -20;
} kern;
"""


def _place(adv, shape):
    if not shape.is_empty:
        shape = affinity.translate(shape, SB, 0).simplify(0.25, preserve_topology=True)
    return (adv + 2 * SB, shape)


def master_shapes():
    """Plain cut under the lowercase name, marked cut under the uppercase one."""
    out = {}
    for name, (adv, shape) in GLYPHS.items():
        if name in ("Alambda", "Ibolt"):
            continue                        # reached through MARKED
        if name in LETTERS:
            out[name.lower()] = _place(adv, shape)
            m_adv, m_shape = GLYPHS[MARKED[name]] if name in MARKED else (adv, shape)
            if name in SPURRED:
                m_shape = geom.with_spur(m_shape, stroke=S)
            out[name] = _place(m_adv, m_shape)
        else:
            out[name] = _place(adv, shape)
    return out


def build_style(masters, style, outdir):
    transform = STYLES[style]
    suffix = "" if style == "Regular" else " " + style
    family = "Hellhound Audio" + suffix
    ps_family = family.replace(" ", "")
    ps_name = ps_family + "-Regular"

    order = [".notdef"] + sorted(masters)
    nd = geom.R(70, 0, 540, 700).difference(geom.R(70 + 90, 90, 540 - 90, 610))
    shapes = {".notdef": (610, nd)}
    for name, (adv, shape) in masters.items():
        shapes[name] = (adv, transform(shape) if not shape.is_empty else shape)

    advances, charstrings, glyfs = {}, {}, {}
    for name in order:
        adv, shape = shapes[name]
        advances[name] = (int(round(adv)), 0)
        t2, tt = T2CharStringPen(int(round(adv)), None), TTGlyphPen(None)
        if not shape.is_empty:
            geom.draw(shape, t2)
            geom.draw(shape, tt)
        charstrings[name] = t2.getCharString()
        glyfs[name] = tt.glyph()

    written = []
    for is_ttf in (False, True):
        fb = FontBuilder(UPM, isTTF=is_ttf)
        fb.setupGlyphOrder(order)
        fb.setupCharacterMap(CMAP)
        if is_ttf:
            fb.setupGlyf(glyfs)
        else:
            fb.setupCFF(ps_name, {"FullName": family, "FamilyName": family,
                                  "Weight": "Bold"}, charstrings, {})
        fb.setupHorizontalMetrics(advances)
        fb.setupHorizontalHeader(ascent=ASC, descent=DESC, lineGap=0)
        fb.setupNameTable({
            "copyright": "Copyright (c) %d Hellhound Audio. All rights reserved." % YEAR,
            "familyName": family, "styleName": "Regular",
            "uniqueFontIdentifier": "%s; %s; %d" % (ps_name, VERSION, YEAR),
            "fullName": family, "version": "Version " + VERSION, "psName": ps_name,
            "designer": "Hellhound Audio", "description": DESCRIPTIONS[style],
            "sampleText": "HELLHOUND AUDIO",
        })
        fb.setupOS2(sTypoAscender=CAP, sTypoDescender=DESC, sTypoLineGap=200,
                    usWinAscent=ASC, usWinDescent=-DESC,
                    sCapHeight=CAP, sxHeight=CAP,
                    usWeightClass=700, usWidthClass=5, fsType=0, achVendID="HLHD",
                    panose=dict(bFamilyType=2, bSerifStyle=11, bWeight=8, bProportion=4,
                                bContrast=0, bStrokeVariation=0, bArmStyle=0,
                                bLetterForm=0, bMidline=0, bXHeight=0))
        fb.setupPost(isFixedPitch=0, underlinePosition=-140, underlineThickness=90)
        try:
            addOpenTypeFeaturesFromString(fb.font, KERN)
        except Exception as exc:
            print("  ! kern skipped:", exc)
        ext = "ttf" if is_ttf else "otf"
        path = os.path.join(outdir, "%s.%s" % (ps_family, ext))
        fb.save(path); written.append(path)
        if is_ttf:
            fb.font.flavor = "woff2"
            w = os.path.join(outdir, "%s.woff2" % ps_family)
            fb.font.save(w); written.append(w)
    return written


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else "dist"
    os.makedirs(outdir, exist_ok=True)
    print("building masters ...")
    masters = master_shapes()
    for style in STYLES:
        print("  %-8s" % style, end=" ")
        print("->", ", ".join(os.path.basename(f)
                              for f in build_style(masters, style, outdir)))
    print("done:", len(os.listdir(outdir)), "files")


if __name__ == "__main__":
    main()
