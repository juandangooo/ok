"""Square-tunnel symbol for colector de luz: nested frames gathering light to a centre.

Usage: python3 build_tunnel.py OUTDIR
Writes tunnel-<variant>.svg/.png for each variant plus a comparison sheet.
"""
import io, os, sys
import cairosvg
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
S = 1000            # artboard
LW = 46             # line weight


def frame(x, y, w, lw=LW):
    """A square outline as an even-odd path."""
    return (f'M{x} {y}h{w}v{w}h-{w}z M{x+lw} {y+lw}v{w-2*lw}h{w-2*lw}v-{w-2*lw}z')


def spiral():
    """One continuous square spiral, entering at the bottom-left and winding into a solid centre square."""
    step = LW * 2                      # line + equal gap
    h = LW / 2                         # keep the stroke inside the artboard margin
    L, T, R, B = 60 + h, 60 + h, S - 60 - h, S - 60 - h
    pts = [(L, B)]
    for _ in range(3):
        pts.append((L, T)); L += step   # up the left side
        pts.append((R, T)); T += step   # across the top
        pts.append((R, B)); R -= step   # down the right side
        pts.append((L, B)); B -= step   # back along the bottom
    pts.append((L, T))                  # last climb, stopping at the centre's edge
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
    # the light: a solid square in the space the spiral has wound around, one gap clear of every line
    cx, cy = L + LW / 2 + LW, T + LW / 2 + LW
    cw = (R - LW / 2 - LW) - cx
    return (f'<path d="{d}" fill="none" stroke="#000" stroke-width="{LW}" stroke-linejoin="miter" stroke-linecap="butt"/>'
            f'<rect x="{cx:.1f}" y="{cy:.1f}" width="{cw:.1f}" height="{cw:.1f}"/>')


def perspective():
    """Nested frames drifting up-right: a tunnel toward a point of light.

    Each frame sits inside the previous one with a wide gap on the left/bottom
    and a narrow one on the top/right, so the frames march toward a corner.
    """
    out = []
    x, y, w = 60, 60, S - 120
    wide, narrow = 1.6 * LW, 0.4 * LW
    for _ in range(4):
        out.append(f'<path fill-rule="evenodd" d="{frame(x, y, w)}"/>')
        x, y, w = x + LW + wide, y + LW + narrow, w - 2 * LW - wide - narrow
    out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{w:.1f}"/>')
    return ''.join(out)


def accelerate():
    """Concentric frames, gaps tightening toward the centre; the centre is an open square of light."""
    out, x, w, gap = [], 60, S - 120, 70
    for i in range(5):
        out.append(frame(x, x, w))
        x += LW + gap; w -= 2 * (LW + gap); gap *= 0.62
    return f'<path fill-rule="evenodd" d="{" ".join(out)}"/>'


def stepped(x, y, w, k, st):
    """Square with every corner cut into k stair-steps of size st, as a clockwise polygon."""
    pts = []

    def walk(px, py, moves):
        pts.append((px, py))
        for _ in range(k):
            for dx, dy in moves:
                px, py = px + dx * st, py + dy * st
                pts.append((px, py))

    walk(x, y + k * st, [(0, -1), (1, 0)])           # top-left: up, right
    walk(x + w - k * st, y, [(1, 0), (0, 1)])        # top-right: right, down
    walk(x + w, y + w - k * st, [(0, 1), (-1, 0)])   # bottom-right: down, left
    walk(x + k * st, y + w, [(-1, 0), (0, -1)])      # bottom-left: left, up
    return 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + 'z'


def pyramid():
    """Accelerate, as a stepped pyramid seen from above: terraces with stair-step corners
    tightening toward an open summit square of light."""
    out, x, w, gap = [], 60, S - 120, 70
    for i in range(4):
        k, st = 2, w * 0.085            # steps scale with the tier
        out.append(f'<path fill-rule="evenodd" d="{stepped(x, x, w, k, st)} '
                   f'{stepped(x + LW, x + LW, w - 2 * LW, k, st)}"/>')
        x += LW + gap; w -= 2 * (LW + gap); gap *= 0.62
    return ''.join(out)


def fret():
    """Stepped fret (xicalcoliuhqui): a staircase climbs in from the bottom-left and turns
    into a square spiral that winds around a square of light."""
    step = LW * 2
    h = LW / 2
    # spiral occupies the upper-right; the stair climbs into it from the lower-left
    L, T, R, B = 300 + h, 60 + h, S - 60 - h, 700 - h
    pts = [(60 + h, S - 60 - h)]
    # three stair steps up and to the right, ending at the spiral's bottom-left corner
    sx, sy = 60 + h, S - 60 - h
    dx, dy = (L - sx) / 3, (sy - B) / 3
    for _ in range(3):
        sy -= dy; pts.append((sx, sy)); sx += dx; pts.append((sx, sy))
    # then the square spiral, clockwise inward
    for _ in range(2):
        pts.append((L, T)); L += step
        pts.append((R, T)); T += step
        pts.append((R, B)); R -= step
        pts.append((L, B)); B -= step
    pts.append((L, T))
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
    cx, cy = L + LW / 2 + LW, T + LW / 2 + LW
    cw = min((R - LW / 2 - LW) - cx, (B - LW / 2 - LW) - cy + step)
    return (f'<path d="{d}" fill="none" stroke="#000" stroke-width="{LW}" stroke-linejoin="miter" stroke-linecap="butt"/>'
            f'<rect x="{cx:.1f}" y="{cy:.1f}" width="{cw:.1f}" height="{cw:.1f}"/>')


VARIANTS = {'accelerate': accelerate, 'pyramid': pyramid, 'fret': fret}


def svg(body, fg='#000', bg=None):
    back = f'<rect width="{S}" height="{S}" fill="{bg}"/>' if bg else ''
    body = body.replace('#000', fg)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">{back}'
            f'<g fill="{fg}">{body}</g></svg>')


def png(s, w):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(), output_width=w))).convert('RGB')


font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf', 24)
sheet = Image.new('RGB', (len(VARIANTS) * 460, 640), 'white')
d = ImageDraw.Draw(sheet)
for i, (name, fn) in enumerate(VARIANTS.items()):
    s = svg(fn())
    open(f'{OUT}/tunnel-{name}.svg', 'w').write(s)
    png(svg(fn(), bg='#fff'), 800).save(f'{OUT}/tunnel-{name}.png')
    x = i * 460 + 30
    sheet.paste(png(svg(fn(), bg='#fff'), 400), (x, 20))
    sheet.paste(png(svg(fn(), bg='#fff'), 24), (x, 470))
    sheet.paste(png(svg(fn(), bg='#fff'), 48), (x + 50, 458))
    sheet.paste(png(svg(fn(), '#fff', '#000'), 110), (x + 130, 430))
    d.text((x, 590), name, fill='black', font=font)
sheet.save(f'{OUT}/tunnel-variants.png')
print('ok')
