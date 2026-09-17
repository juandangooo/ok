"""Compile the Hellhound Audio family to OTF / TTF / WOFF2."""

import os, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from shapely import affinity

import geom
from glyphs import GLYPHS

UPM = 1000
CAP = 700
ASC, DESC = 800, -200
TIGHTEN = 16          # trimmed off each advance; the face is meant to set tight
VERSION = "1.000"
YEAR = datetime.date.today().year

# Style -> (family suffix, transform of the master outline)
SHADOW_VECTOR = (50, -64)

STYLES = {
    "Regular": lambda s: s,
    "Inline":  lambda s: geom.inline(s, 30, 28),
    "Outline": lambda s: geom.prune(s.difference(s.buffer(-34, join_style=2, mitre_limit=2.5))),
    "Shadow":  lambda s: geom.sweep(s, *SHADOW_VECTOR),
}

DESCRIPTIONS = {
    "Regular": "The solid cut: heavy chiselled caps for logos, record sleeves and merch.",
    "Inline":  "Solid caps with a keyline channel cut just inside the edge.",
    "Outline": "Hollow caps - the perimeter only.",
    "Shadow":  "The 3-D extrude. Set it behind Regular or Outline in a second colour.",
}

# Codepoint -> glyph name.  Lowercase is mapped onto the caps.
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
for i, name in enumerate("zero one two three four five six seven eight nine".split()):
    CMAP[0x30 + i] = name
for i in range(26):
    letter = chr(ord("A") + i)
    CMAP[0x41 + i] = letter          # uppercase
    CMAP[0x61 + i] = letter          # lowercase types the same cap

KERN = """
languagesystem DFLT dflt;
languagesystem latn dflt;

@ROUND   = [C D G O Q];
@FLAT    = [B D E F H I K L M N P R];
@DIAG_L  = [A];
@STOP    = [period comma colon semicolon];

feature kern {
    pos A [T V W Y] -70;
    pos [T V W Y] A -70;
    pos [F P] A -45;
    pos A [C G O Q] -20;
    pos L [T V W Y] -85;
    pos L [C G O Q U] -25;
    pos [T V W Y] [C G O Q U] -35;
    pos @ROUND [A V W X Y] -25;
    pos [B D E H I K L M N P R] [V W Y] -20;
    pos [T V W Y F P] @STOP -110;
    pos [K R] [C G O Q] -20;
    pos [A V W X Y] @STOP -60;
    pos [J] [A] -30;
    pos [D B P R] [A] -25;
    pos Y [A] -80;
    pos W [A] -60;
} kern;
"""


def master_shapes():
    """Chamfered master outline + advance for every glyph, spacing applied."""
    out = {}
    for name, (adv, solids, holes, extra) in GLYPHS.items():
        shape = geom.assemble(solids, holes, extra)
        if not shape.is_empty:
            shape = affinity.translate(shape, -TIGHTEN / 2.0, 0)
            shape = shape.simplify(0.4, preserve_topology=True)
        out[name] = (adv - TIGHTEN, shape)
    return out


def build_style(masters, style, outdir):
    transform = STYLES[style]
    suffix = "" if style == "Regular" else " " + style
    family = "Hellhound Audio" + suffix
    ps_family = family.replace(" ", "")
    ps_name = ps_family + "-Regular"

    order = [".notdef"] + sorted(masters)
    advances, charstrings, glyfs = {}, {}, {}

    # .notdef: a hollow box, so a missing character is obvious rather than blank.
    nd = geom.R(60, 0, 480, 700).difference(geom.R(130, 70, 410, 630))
    shapes = {".notdef": (540, nd)}
    for name, (adv, shape) in masters.items():
        shapes[name] = (adv, transform(shape) if not shape.is_empty else shape)

    for name in order:
        adv, shape = shapes[name]
        advances[name] = (int(round(adv)), 0)
        t2 = T2CharStringPen(int(round(adv)), None)
        tt = TTGlyphPen(None)
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
                                  "Weight": "Regular"}, charstrings, {})
        fb.setupHorizontalMetrics(advances)
        fb.setupHorizontalHeader(ascent=ASC, descent=DESC, lineGap=0)
        fb.setupNameTable({
            "copyright": "Copyright (c) %d Hellhound Audio. All rights reserved." % YEAR,
            "familyName": family,
            "styleName": "Regular",
            "uniqueFontIdentifier": "%s; %s; %d" % (ps_name, VERSION, YEAR),
            "fullName": family,
            "version": "Version " + VERSION,
            "psName": ps_name,
            "designer": "Hellhound Audio",
            "description": DESCRIPTIONS[style],
            "sampleText": "HELLHOUND AUDIO",
        })
        fb.setupOS2(
            sTypoAscender=CAP, sTypoDescender=DESC, sTypoLineGap=200,
            usWinAscent=ASC, usWinDescent=-DESC,
            sCapHeight=CAP, sxHeight=CAP,
            usWeightClass=800, usWidthClass=5, fsType=0,
            achVendID="HLHD",
            panose=dict(bFamilyType=4, bSerifStyle=0, bWeight=9, bProportion=0,
                        bContrast=0, bStrokeVariation=0, bArmStyle=0,
                        bLetterForm=0, bMidline=0, bXHeight=0),
        )
        fb.setupPost(isFixedPitch=0, underlinePosition=-120, underlineThickness=90)
        try:
            addOpenTypeFeaturesFromString(fb.font, KERN)
        except Exception as exc:                      # pragma: no cover
            print("  ! kern feature skipped:", exc)

        ext = "ttf" if is_ttf else "otf"
        path = os.path.join(outdir, "%s.%s" % (ps_family, ext))
        fb.save(path)
        written.append(path)

        if is_ttf:  # web build off the TrueType master
            fb.font.flavor = "woff2"
            woff = os.path.join(outdir, "%s.woff2" % ps_family)
            fb.font.save(woff)
            written.append(woff)
    return written


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else "dist"
    os.makedirs(outdir, exist_ok=True)
    print("building masters ...")
    masters = master_shapes()
    for style in STYLES:
        print("  %-8s" % style, end=" ")
        files = build_style(masters, style, outdir)
        print("->", ", ".join(os.path.basename(f) for f in files))
    print("done:", len(os.listdir(outdir)), "files in", outdir)


if __name__ == "__main__":
    main()
