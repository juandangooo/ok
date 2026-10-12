"""Hand-drawn ink-pen versions of the colector de luz disc, as vector SVG.

Lines are built as filled outlines with a gentle wobble (low-frequency noise),
slightly varying width, and a small ink pool where the pen lands and lifts.

Usage: python3 build_pen.py OUTDIR
"""
import io, math, os, random, sys
import cairosvg
from PIL import Image, ImageDraw, ImageFont

S = 1000
C = S / 2


def wobble(seed, amp, freqs=(2, 3, 5)):
    """Smooth periodic noise f(t) for t in turns."""
    rnd = random.Random(seed)
    terms = [(amp / (i + 1), f, rnd.uniform(0, 2 * math.pi)) for i, f in enumerate(freqs)]
    return lambda t: sum(a * math.sin(2 * math.pi * f * t + p) for a, f, p in terms)


def stroke(points, widths):
    """Filled outline of a variable-width polyline (points and widths in step)."""
    left, right = [], []
    for i, (x, y) in enumerate(points):
        x0, y0 = points[max(i - 1, 0)]
        x1, y1 = points[min(i + 1, len(points) - 1)]
        dx, dy = x1 - x0, y1 - y0
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        w = widths[i] / 2
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    pts = left + right[::-1]
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'z'


def blob(x, y, r, seed):
    """A slightly irregular ink dot."""
    f = wobble(seed, r * 0.05, (2, 3))
    pts = [(x + (r + f(t)) * math.cos(2 * math.pi * t), y + (r + f(t)) * math.sin(2 * math.pi * t))
           for t in [i / 48 for i in range(48)]]
    return 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + 'z'


def pen_ring(r, w, seed, start=0.0, sweep=1.04, n=400, pressure=0.0):
    """A hand-drawn circle: wobbles a little, overshoots so the ends overlap, pools ink at the ends.
    pressure > 0 makes the line swell and thin like a fountain pen nib."""
    rw = wobble(seed, r * 0.005, (2, 3, 7))
    ww = wobble(seed + 7, w * 0.12, (3, 7, 11))
    pts, widths = [], []
    for i in range(n + 1):
        t = i / n
        a = 2 * math.pi * (start + sweep * t) - math.pi / 2
        rr = r + rw(start + sweep * t)
        pts.append((C + rr * math.cos(a), C + rr * math.sin(a)))
        nib = 1 + pressure * math.sin(2 * a + 0.6)          # thick on one diagonal, thin on the other
        taper = min(1, 0.55 + t * 9, 0.55 + (1 - t) * 9)     # pen lands and lifts
        widths.append(max(2, (w + ww(t)) * nib * taper))
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    return [stroke(pts, widths), blob(x0, y0, w * 0.62, seed + 1), blob(x1, y1, w * 0.55, seed + 2)]


def pen_spiral(r0, r1, turns, w, seed, n=900):
    """One continuous pen line spiralling inward."""
    rw = wobble(seed, r0 * 0.005, (2, 3, 7))
    pts, widths = [], []
    for i in range(n + 1):
        t = i / n
        a = 2 * math.pi * turns * t - math.pi / 2
        rr = r0 + (r1 - r0) * t + rw(turns * t)
        pts.append((C + rr * math.cos(a), C + rr * math.sin(a)))
        taper = min(1, 0.55 + t * 30, 0.55 + (1 - t) * 30)
        widths.append(w * taper)
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    return [stroke(pts, widths), blob(x0, y0, w * 0.62, seed + 1), blob(x1, y1, w * 0.6, seed + 2)]


def dot_ring(n, R, r, seed):
    rnd = random.Random(seed)
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n - math.pi / 2 + rnd.uniform(-0.03, 0.03)
        rr = R + rnd.uniform(-4, 4)
        out.append(blob(C + rr * math.cos(a), C + rr * math.sin(a), r * rnd.uniform(0.88, 1.1), seed + i * 13))
    return out


def fineliner():
    """Even fine-liner line: three hand-drawn rings tightening inward, plus a ring of dots."""
    d = dot_ring(24, 440, 19, 11)
    for i, (r, start) in enumerate(((350, 0.08), (275, 0.55), (222, 0.3))):
        d += pen_ring(r, 22, 100 + i, start=start)
    return d


def onestroke():
    """The rings drawn as one continuous pen line spiralling inward, plus the dot ring."""
    return dot_ring(24, 440, 19, 21) + pen_spiral(350, 205, 2.6, 22, 200)


def fountain():
    """Fountain-pen nib: the line swells and thins as it travels round."""
    d = dot_ring(24, 440, 19, 31)
    for i, (r, start) in enumerate(((350, 0.12), (275, 0.6), (222, 0.35))):
        d += pen_ring(r, 26, 300 + i, start=start, pressure=0.5)
    return d


VARIANTS = {'fineliner': fineliner, 'onestroke': onestroke, 'fountain': fountain}


def svg(paths, fg='#111111', bg=None):
    back = f'<rect width="{S}" height="{S}" fill="{bg}"/>' if bg else ''
    # nonzero fill so overlapping stroke ends merge like real ink instead of cancelling
    body = ''.join(f'<path d="{p}"/>' for p in paths)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">{back}'
            f'<g fill="{fg}" fill-rule="nonzero">{body}</g></svg>')


def png(s, w):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(), output_width=w))).convert('RGB')


if __name__ == '__main__':
    OUT = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf', 24)
    sheet = Image.new('RGB', (len(VARIANTS) * 460, 640), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (name, fn) in enumerate(VARIANTS.items()):
        p = fn()
        open(f'{OUT}/pen-{name}.svg', 'w').write(svg(p))
        open(f'{OUT}/pen-{name}-gold.svg', 'w').write(svg(p, '#D4A63A'))
        x = i * 460 + 30
        sheet.paste(png(svg(p, bg='#fff'), 400), (x, 20))
        sheet.paste(png(svg(p, bg='#fff'), 32), (x, 466))
        sheet.paste(png(svg(p, bg='#fff'), 64), (x + 50, 450))
        sheet.paste(png(svg(p, '#D4A63A', '#111111'), 120), (x + 140, 425))
        d.text((x, 590), name, fill='black', font=font)
    sheet.save(f'{OUT}/pen-variants.png')
    print('ok')
