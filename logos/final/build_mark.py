"""Builds the colector de luz grid mark + wordmark as SVG, and PNG previews."""
import os, sys
import cairosvg
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'

CELL, GAP = 100, 16
P = CELL + GAP


def mark(variant='joined'):
    """Return (svg body, width, height) for the cl mark.

    variant: 'split'  - spine and arms separated by gaps (reads as E at large sizes)
             'joined' - c is one solid shape, empty frame in its counter
             'dot'    - joined c, solid square of light instead of the frame
             'short'  - joined c with shorter arms, empty frame
    """
    r = []
    rect = lambda x, y, w, h: r.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>')
    H = 5 * P - GAP                       # l height: ascender, 5 rows
    y0 = 2 * P                            # c x-height: rows 2-4
    ch = 3 * P - GAP
    cw = 2 * P + CELL // 2 if variant == 'short' else 3 * P - GAP
    lx = 3 * P + P // 2                   # half a column of air before the l
    if variant == 'split':
        rect(0, y0, CELL, ch)
        rect(P, y0, cw - P, CELL)
        rect(P, y0 + 2 * P, cw - P, CELL)
        cy0, cy1 = y0 + CELL, y0 + 2 * P
    else:
        arm = 112                         # one solid c: spine + arms, no gaps
        r.append(f'<path d="M0 {y0}h{cw}v{arm}h-{cw-CELL}v{ch-2*arm}h{cw-CELL}v{arm}h-{cw}z"/>')
        cy0, cy1 = y0 + arm, y0 + ch - arm
    rect(lx, 0, CELL, H)                  # l
    # the light, centred in the counter of the c
    fs, st = 64, 12
    fx = CELL + (cw - CELL - fs) / 2
    fy = (cy0 + cy1 - fs) / 2
    if variant == 'dot':
        rect(fx, fy, fs, fs)
    else:
        r.append(f'<path fill-rule="evenodd" d="M{fx} {fy}h{fs}v{fs}h-{fs}z '
                 f'M{fx+st} {fy+st}v{fs-2*st}h{fs-2*st}v-{fs-2*st}z"/>')
    return ''.join(r), lx + CELL, H


def wordmark(text, size):
    f = TTFont(FONT)
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
    scale = size / f['head'].unitsPerEm
    track = 0.01 * f['head'].unitsPerEm
    x, paths = 0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, x * scale, 0)))
        if pen.getCommands():
            paths.append(pen.getCommands())
        x += hmtx[g][0] + track
    xh = f['OS/2'].sxHeight * scale
    return f'<path d="{" ".join(paths)}"/>', (x - track) * scale, xh


def svg(body, w, h, fg, bg, pad):
    W, H = w + 2 * pad, h + 2 * pad
    back = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">{back}'
            f'<g fill="{fg}" transform="translate({pad} {pad})">{body}</g></svg>')


def save(name, s, png_w):
    open(f'{OUT}/{name}.svg', 'w').write(s)
    cairosvg.svg2png(bytestring=s.encode(), write_to=f'{OUT}/{name}.png', output_width=png_w)


for v in ('split', 'joined', 'dot', 'short'):
    body, w, h = mark(v)
    save(f'mark-{v}', svg(body, w, h, '#000', '#fff', 120), 800)

# Lockups use the open variant
body, mw, mh = mark(sys.argv[2] if len(sys.argv) > 2 else 'joined')
size = 300                                  # font size so x-height ~ the c height
wm, ww, xh = wordmark('colector de luz', size)
# horizontal: baseline of text aligned to the c's baseline
gap = 130
horiz = (f'<g>{body}</g><g transform="translate({mw + gap} {mh})">{wm}</g>')
for fg, bg, n in (('#000', '#fff', 'lockup-horizontal'), ('#fff', '#000', 'lockup-horizontal-reversed')):
    save(n, svg(horiz, mw + gap + ww, mh, fg, bg, 140), 1800)
# stacked: mark centred above name
sw = max(mw, ww)
stack = (f'<g transform="translate({(sw - mw) / 2} 0)">{body}</g>'
         f'<g transform="translate({(sw - ww) / 2} {mh + 120 + size * 0.75})">{wm}</g>')
save('lockup-stacked', svg(stack, sw, mh + 120 + size * 0.75, '#000', '#fff', 140), 1200)
# transparent masters
save('mark', svg(body, mw, mh, '#000', None, 0), 1000)
save('wordmark', svg(f'<g transform="translate(0 {size*0.75})">{wm}</g>', ww, size * 0.75 + size * 0.22, '#000', None, 0), 1600)
print('ok', mw, mh, ww)
