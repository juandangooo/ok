"""Sanity-check the compiled binaries and render from them."""

import sys, os, glob
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from PIL import Image, ImageDraw, ImageChops

DIST = sys.argv[1] if len(sys.argv) > 1 else "dist"
SS = 3


def outline(font, gs, name):
    pen = RecordingPen()
    gs[name].draw(pen)
    contours, cur = [], []
    for op, args in pen.value:
        if op == "moveTo":
            cur = [args[0]]
        elif op == "lineTo":
            cur.append(args[0])
        elif op in ("curveTo", "qCurveTo"):
            cur.extend(args)            # straight-line font: shouldn't happen
        elif op == "closePath" and cur:
            contours.append(cur); cur = []
    if cur:
        contours.append(cur)
    return contours


def signed_area(pts):
    a = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % len(pts)]
        a += x0 * y1 - x1 * y0
    return a / 2.0


def render(path, text, size, out, bg="white", ink="black"):
    """Render with an even-odd XOR fill so contour nesting cannot be faked."""
    font = TTFont(path)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    scale = size / font["head"].unitsPerEm

    pen_x, runs = 0, []
    for ch in text:
        name = cmap.get(ord(ch))
        if not name:
            continue
        runs.append((pen_x, outline(font, gs, name)))
        pen_x += hmtx[name][0]

    W = int(pen_x * scale) + 120
    H = int(size * 1.5)
    acc = Image.new("1", (W * SS, H * SS), 0)
    base = size * 0.32
    for ox, contours in runs:
        for pts in contours:
            layer = Image.new("1", acc.size, 0)
            ImageDraw.Draw(layer).polygon(
                [(((ox + x) * scale + 60) * SS, (H - (y * scale + base)) * SS)
                 for x, y in pts], fill=1)
            acc = ImageChops.logical_xor(acc, layer)
    img = Image.new("RGB", acc.size, bg)
    img.paste(Image.new("RGB", acc.size, ink), mask=acc)
    img.resize((W, H), Image.LANCZOS).save(out)
    return out


def report(path):
    f = TTFont(path)
    name = f["name"]
    fam = name.getDebugName(1)
    ps = name.getDebugName(6)
    cmap = f.getBestCmap()
    has_kern = "GPOS" in f
    pairs = 0
    if has_kern:
        for lookup in f["GPOS"].table.LookupList.Lookup:
            for st in lookup.SubTable:
                fmt = getattr(st, "Format", None)
                if fmt == 1:
                    pairs += sum(ps.PairValueCount for ps in st.PairSet)
                elif fmt == 2:   # class-based; each entry covers many glyph pairs
                    pairs += sum(1 for c1 in st.Class1Record for r in c1.Class2Record
                                 if r.Value1 and getattr(r.Value1, "XAdvance", 0))
    print("  %-34s family=%-26s glyphs=%3d cmap=%3d kernpairs=%3d upm=%d cap=%d"
          % (os.path.basename(path), fam, len(f.getGlyphOrder()), len(cmap),
             pairs, f["head"].unitsPerEm, f["OS/2"].sCapHeight))
    assert ps and " " not in ps, "bad PostScript name"
    for ch in "ABCXYZ0189?&":
        assert ord(ch) in cmap, "missing " + ch
    assert ord("a") in cmap, "lowercase not mapped"
    assert f["OS/2"].fsType == 0, "embedding restricted"
    assert pairs > 0, "no kerning"
    return fam


print("checking", DIST)
for p in sorted(glob.glob(os.path.join(DIST, "*.otf"))) + sorted(glob.glob(os.path.join(DIST, "*.ttf"))):
    report(p)
print("all binaries pass")
