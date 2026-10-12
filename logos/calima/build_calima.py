"""Calima-inspired symbols for colector de luz.

Motifs from Calima (Yotoco period) goldwork: anchor-shaped pectorals whose arms end
in spirals, borders of raised repoussé dots, and round ear discs.

Usage: python3 build_calima.py OUTDIR
"""
import io, math, os, sys
import cairosvg
from PIL import Image, ImageDraw, ImageFont

S = 1000
LW = 44


def frame(x, y, w, lw=LW):
    return f'M{x} {y}h{w}v{w}h-{w}z M{x+lw} {y+lw}v{w-2*lw}h{w-2*lw}v-{w-2*lw}z'


def plaque(x, y, w, n=3, gap=0.9):
    """Accelerating nested frames with an open centre of light (the chosen 'accelerate' idea)."""
    out, g = [], LW * gap
    for _ in range(n):
        out.append(frame(x, y, w))
        x += LW + g; y += LW + g; w -= 2 * (LW + g); g *= 0.62
    return f'<path fill-rule="evenodd" d="{" ".join(out)}"/>'


def spiral_pts(cx, cy, r0, r1, turns, start=-math.pi / 2, n=240):
    """Archimedean spiral, clockwise (screen coords) from radius r0 to r1."""
    pts = []
    for i in range(n + 1):
        t = i / n
        a = start + t * turns * 2 * math.pi
        r = r0 + (r1 - r0) * t
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def pectoral():
    """Anchor-shaped pectoral: a plaque of light hangs from a bar whose ends rise and curl
    upward into spirals, like the Calima anchor-form (ancoriforme) chest plates."""
    pw = 300
    px, py = (S - pw) / 2, 470
    R0 = 140
    by = py + LW / 2                         # the bar runs along the plaque's top edge
    cx, cy = S - 60 - R0 - LW / 2, by - R0   # spiral sits above the bar's outer end
    # bar goes right, then the spiral turns up and back inward (counter-clockwise on screen)
    pts = [(S / 2, by), (cx, by)] + spiral_pts(cx, cy, R0, 24, -1.55, start=math.pi / 2)[1:]
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
    side = f'<path d="{d}" fill="none" stroke="#000" stroke-width="{LW}" stroke-linecap="round" stroke-linejoin="round"/>'
    return (side + f'<g transform="translate({S} 0) scale(-1 1)">{side}</g>' + plaque(px, py, pw, n=2, gap=1.0))


def dot_square(x, y, w, n, r):
    """A square border of n dots per side, like repoussé beading."""
    out = []
    for i in range(n):
        t = x + i * w / (n - 1)
        out += [(t, y), (t, y + w)]
        if 0 < i < n - 1:
            out += [(x, t - x + y), (x + w, t - x + y)]
    return ''.join(f'<circle cx="{a:.1f}" cy="{b:.1f}" r="{r}"/>' for a, b in out)


def beaded():
    """'Accelerate' framed by a Calima border of raised dots."""
    return dot_square(70, 70, S - 140, 11, 30) + plaque(185, 185, S - 370, n=3, gap=1.1)


def disc(dots=24, dot_r=28, dot_R=440, rings=3, r=360, g=52, beaded_band=False):
    """Round ear-disc: a ring of repoussé dots, then rings tightening to an open centre of light."""
    out = []
    c = S / 2
    circle = lambda x, y, rr: f'M{x-rr:.1f} {y:.1f}a{rr} {rr} 0 1 0 {2*rr} 0a{rr} {rr} 0 1 0 {-2*rr} 0z'
    dot_xy = [(c + dot_R * math.cos(i / dots * 2 * math.pi - math.pi / 2),
               c + dot_R * math.sin(i / dots * 2 * math.pi - math.pi / 2)) for i in range(dots)]
    if beaded_band:
        # dots punched through a solid outer band, like beading worked into the gold sheet
        bw = 2 * dot_r + 36
        holes = ' '.join(circle(x, y, dot_r) for x, y in dot_xy)
        out.append(f'<path fill-rule="evenodd" d="{circle(c, c, dot_R + bw / 2)} {circle(c, c, dot_R - bw / 2)} {holes}"/>')
    else:
        out += [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{dot_r}"/>' for x, y in dot_xy]
    ring_paths = []
    for _ in range(rings):
        ring_paths.append(f'M{c - r} {c}a{r} {r} 0 1 0 {2*r} 0a{r} {r} 0 1 0 {-2*r} 0z '
                          f'M{c - r + LW} {c}a{r-LW} {r-LW} 0 1 0 {2*(r-LW)} 0a{r-LW} {r-LW} 0 1 0 {-2*(r-LW)} 0z')
        r -= LW + g; g *= 0.62
    return ''.join(out) + f'<path fill-rule="evenodd" d="{" ".join(ring_paths)}"/>'


def disc_fine():
    """More, smaller dots and a fourth ring: reads as worked gold rather than a target."""
    return disc(dots=36, dot_r=20, dot_R=450, rings=4, r=380, g=48)


def disc_band():
    """Dots punched through a solid outer band."""
    return disc(dots=28, dot_r=22, dot_R=420, rings=3, r=330, g=50, beaded_band=True)


VARIANTS = {'disc': disc, 'disc_fine': disc_fine, 'disc_band': disc_band}


def svg(body, fg='#000', bg=None):
    back = f'<rect width="{S}" height="{S}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">{back}'
            f'<g fill="{fg}" stroke-color="{fg}">{body.replace("#000", fg)}</g></svg>')


def png(s, w):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(), output_width=w))).convert('RGB')


if __name__ == '__main__':
    OUT = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf', 24)
    sheet = Image.new('RGB', (len(VARIANTS) * 460, 640), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (name, fn) in enumerate(VARIANTS.items()):
        open(f'{OUT}/calima-{name}.svg', 'w').write(svg(fn()))
        png(svg(fn(), bg='#fff'), 800).save(f'{OUT}/calima-{name}.png')
        x = i * 460 + 30
        sheet.paste(png(svg(fn(), bg='#fff'), 400), (x, 20))
        sheet.paste(png(svg(fn(), bg='#fff'), 24), (x, 470))
        sheet.paste(png(svg(fn(), bg='#fff'), 48), (x + 50, 458))
        sheet.paste(png(svg(fn(), '#fff', '#000'), 110), (x + 130, 430))
        d.text((x, 590), name, fill='black', font=font)
    sheet.save(f'{OUT}/calima-variants.png')
    print('ok')
