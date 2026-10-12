"""Lockups for the Calima disc: mark + 'colector de luz' wordmark, plus a small-size mark.

Usage: LOGO_FONT=path/to/font.ttf python3 build_lockups.py OUTDIR [variant]
variant is one of the disc functions in build_calima.py (default: disc).
"""
import io, os, re, sys
import cairosvg
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image, ImageDraw, ImageFont

sys.argv, OUT, VARIANT = sys.argv[:2], sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'disc')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_calima as bc  # noqa: E402
os.makedirs(OUT, exist_ok=True)

FONT = os.environ.get('LOGO_FONT', '/usr/share/fonts/opentype/inter/Inter-Medium.otf')
WEIGHT = os.environ.get('LOGO_WEIGHT')
S = bc.S


def mark_body(small=False):
    if small:  # fewer, bigger dots and two rings so it survives 16-32 px
        return bc.disc(dots=16, dot_r=40, dot_R=430, rings=2, r=330, g=70)
    return getattr(bc, VARIANT)()


def wordmark(text, size, word_space=1.0):
    f = TTFont(FONT)
    if WEIGHT and 'fvar' in f:
        from fontTools.varLib.instancer import instantiateVariableFont
        f = instantiateVariableFont(f, {'wght': float(WEIGHT)})
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f['hmtx']
    scale = size / f['head'].unitsPerEm
    x, paths = 0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, x * scale, 0)))
        if pen.getCommands():
            paths.append(pen.getCommands())
        adv = hmtx[g][0]
        x += adv * (word_space if ch == ' ' else 1)
    xh = (f['OS/2'].sxHeight or f['head'].unitsPerEm * 0.5) * scale
    return f'<path d="{" ".join(paths)}"/>', x * scale, xh


def svg(body, w, h, fg='#000', bg=None, pad=0):
    W, H = w + 2 * pad, h + 2 * pad
    back = f'<rect width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ''
    body = body.replace('#000', fg)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">{back}'
            f'<g fill="{fg}" transform="translate({pad} {pad})">{body}</g></svg>')


def save(name, s, w):
    open(f'{OUT}/{name}.svg', 'w').write(s)
    cairosvg.svg2png(bytestring=s.encode(), write_to=f'{OUT}/{name}.png', output_width=w)


mono = 'mono' in FONT.lower()
size = int(os.environ.get('LOGO_SIZE', 230))
wm, ww, xh = wordmark('colector de luz', size, word_space=0.6 if mono else 1.0)
mark = mark_body()
small = mark_body(small=True)

# horizontal: name centred on the disc's middle, by x-height
gap = 110
horiz = f'<g>{mark}</g><g transform="translate({S + gap} {S / 2 + xh / 2:.1f})">{wm}</g>'
save('lockup-horizontal', svg(horiz, S + gap + ww, S, bg='#fff', pad=120), 2000)
save('lockup-horizontal-reversed', svg(horiz, S + gap + ww, S, fg='#fff', bg='#000', pad=120), 2000)
# stacked: name centred under the disc
sw = max(S, ww)
stack = (f'<g transform="translate({(sw - S) / 2:.1f} 0)">{mark}</g>'
         f'<g transform="translate({(sw - ww) / 2:.1f} {S + 120 + size * 0.75:.1f})">{wm}</g>')
sh = S + 120 + size
save('lockup-stacked', svg(stack, sw, sh, bg='#fff', pad=120), 1400)
# masters on transparent backgrounds
save('mark', svg(mark, S, S), 1000)
save('mark-small', svg(small, S, S), 256)
save('wordmark', svg(f'<g transform="translate(0 {size * 0.75:.1f})">{wm}</g>', ww, size), 1600)

# presentation sheet
def r(name, w, fg=None):
    return Image.open(io.BytesIO(cairosvg.svg2png(url=f'{OUT}/{name}.svg', output_width=w))).convert('RGB')

font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf', 22)
P = Image.new('RGB', (1800, 1560), 'white')
d = ImageDraw.Draw(P)
d.text((40, 15), 'horizontal', fill='#888', font=font)
P.paste(r('lockup-horizontal', 1150), (30, 40))
d.text((1240, 15), 'stacked', fill='#888', font=font)
P.paste(r('lockup-stacked', 500), (1250, 40))
d.text((40, 470), 'reversed', fill='#888', font=font)
P.paste(r('lockup-horizontal-reversed', 1150), (30, 495))
d.text((40, 930), 'mark', fill='#888', font=font)
mk = Image.open(io.BytesIO(cairosvg.svg2png(url=f'{OUT}/mark.svg', output_width=400, background_color='white'))).convert('RGB')
P.paste(mk, (40, 960))
x = 520
d.text((x, 930), 'small sizes use a simplified mark (fewer dots, two rings)', fill='#888', font=font)
for px in (16, 24, 32, 48, 96):
    src = 'mark-small' if px <= 32 else 'mark'
    im = Image.open(io.BytesIO(cairosvg.svg2png(url=f'{OUT}/{src}.svg', output_width=px, background_color='white'))).convert('RGB')
    P.paste(im, (x, 1160 - px // 2))
    d.text((x, 1240), f'{px}px', fill='#888', font=font)
    x += px + 70
# instagram avatar preview: white mark in a black circle
av = Image.new('RGB', (220, 220), 'white')
circ = Image.new('L', (220, 220), 0)
ImageDraw.Draw(circ).ellipse((0, 0, 219, 219), fill=255)
inv = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg(mark, S, S, fg='#fff', bg='#000', pad=140).encode(), output_width=220))).convert('RGB')
av.paste(inv, (0, 0), circ)
P.paste(av, (x + 30, 1050))
d.text((x + 30, 1290), 'instagram avatar', fill='#888', font=font)
P.save(f'{OUT}/presentation.png')
print('ok', VARIANT, os.path.basename(FONT))
