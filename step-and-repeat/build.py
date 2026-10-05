"""Trace the Hellhound Audio logo to vector and tile it as a step-and-repeat (10ft x 8ft)."""
import numpy as np, potrace, cairosvg
from PIL import Image
from scipy import ndimage as ndi

SRC = "/tmp/claude-0/-home-user-ok/63119a20-17ea-5d6a-8dfb-d51f83897001/images/1.webp"
S = 3  # trace upscale factor
im = Image.open(SRC).convert("RGBA")
bg = Image.new("RGBA", im.size, "white"); bg.alpha_composite(im)
rgb = bg.convert("RGB").resize((im.width * S, im.height * S), Image.LANCZOS)
a = np.asarray(rgb).astype(float)

pal = {"black": (8, 9, 10), "red": (238, 57, 57), "white": (255, 255, 255)}
d = np.stack([((a - np.array(v)) ** 2).sum(-1) for v in pal.values()])
cls = d.argmin(0)  # 0 black, 1 red, 2 white
black, red, white = cls == 0, cls == 1, cls == 2

# outer white background = white pixels connected to the border
lab, _ = ndi.label(white)
outer = np.isin(lab, np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
outer &= white
ink = ~outer                      # everything that belongs to the logo
inner_white = white & ~outer      # white letters inside the cube
red = ndi.binary_opening(red, structure=np.ones((7, 7)))  # drop anti-alias fringe

ys, xs = np.where(ink)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
W, H = (x1 - x0) / S, (y1 - y0) / S   # logo size in source px
print("logo bbox (src px):", W, H, "aspect", W / H)

def trace(mask):
    mask = mask[y0:y1, x0:x1]
    bm = potrace.Bitmap(~mask)
    pl = bm.trace(turdsize=6, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                  alphamax=1.0, opticurve=True, opttolerance=0.3)
    f = lambda p: f"{p.x / S:.2f},{p.y / S:.2f}"
    out = []
    for c in pl:
        out.append(f"M{f(c.start_point)}")
        for s in c.segments:
            out.append(f"L{f(s.c)}L{f(s.end_point)}" if s.is_corner
                       else f"C{f(s.c1)} {f(s.c2)} {f(s.end_point)}")
        out.append("Z")
    return "".join(out)

# Layered like a real logo file: black base, red on top, white on top (no seams)
logo_defs = f'''<g id="logo">
<path fill="#08090A" fill-rule="evenodd" d="{trace(ink)}"/>
<path fill="#EE3939" fill-rule="evenodd" d="{trace(red)}"/>
<path fill="#FFFFFF" fill-rule="evenodd" d="{trace(inner_white)}"/>
</g>'''

# Single-logo vector (transparent bg)
open("hellhound-logo-vector.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} {H:.2f}">{logo_defs}</svg>')

# ---------- layout (inches) ----------
CW, CH = 120, 96            # 10 ft x 8 ft
lw = 16.0; lh = lw * H / W  # logo size
gap = 8.0
cols, rows = 5, 7
BLEED = 1.0                 # inches of bleed on every side

def layout(stagger):
    pitch_x, pitch_y = lw + gap, lh + gap
    total_h = rows * lh + (rows - 1) * gap
    oy = (CH - total_h) / 2
    pos = []
    for r in range(rows):
        n = cols if (not stagger or r % 2 == 0) else cols - 1
        span = n * lw + (n - 1) * gap
        ox = (CW - span) / 2
        for c in range(n):
            pos.append((ox + c * pitch_x, oy + r * pitch_y))
    return pos

def build(name, stagger):
    s = lw / W
    uses = "".join(f'<use href="#logo" transform="translate({x:.3f},{y:.3f}) scale({s:.6f})"/>'
                   for x, y in layout(stagger))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{CW+2*BLEED}in" height="{CH+2*BLEED}in" '
           f'viewBox="{-BLEED} {-BLEED} {CW+2*BLEED} {CH+2*BLEED}"><defs>{logo_defs}</defs>'
           f'<rect x="{-BLEED}" y="{-BLEED}" width="{CW+2*BLEED}" height="{CH+2*BLEED}" fill="#FFFFFF"/>{uses}</svg>')
    open(f"{name}.svg", "w").write(svg)
    # cairosvg uses 96 px/in -> PDF page = 120in x 96in
    cairosvg.svg2pdf(bytestring=svg.encode(), write_to=f"{name}.pdf",
                     output_width=(CW + 2 * BLEED) * 96, output_height=(CH + 2 * BLEED) * 96)
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import RectangleObject
    w = PdfWriter(clone_from=f"{name}.pdf"); p = w.pages[0]; b = BLEED * 72
    W_, H_ = float(p.mediabox.width), float(p.mediabox.height)
    p.bleedbox = RectangleObject([0, 0, W_, H_])
    p.trimbox = RectangleObject([b, b, W_ - b, H_ - b])
    w.write(f"{name}.pdf")
    cairosvg.svg2png(bytestring=svg.encode(), write_to=f"{name}-preview.png",
                     output_width=1500, output_height=1200)

build("hellhound-step-and-repeat-10x8ft", stagger=True)
build("hellhound-step-and-repeat-10x8ft-straight-grid", stagger=False)
