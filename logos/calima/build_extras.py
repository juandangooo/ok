"""Gold colourway, Instagram profile picture and favicon set for the colector de luz disc.

Usage: LOGO_FONT=fonts/Jost.ttf LOGO_WEIGHT=800 LOGO_SIZE=330 python3 build_extras.py OUTDIR
Run build_lockups.py first; this reuses its wordmark and mark builders.
"""
import io, os, sys
import cairosvg
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
os.makedirs(f'{OUT}/favicon', exist_ok=True)
sys.argv = [sys.argv[0], os.path.join(OUT, '.lockups-tmp')]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_lockups as bl  # noqa: E402

# Calima tumbaga gold: bright for dark grounds, deep for light grounds (>= 3:1 for graphics)
GOLD_ON_DARK, GOLD_ON_LIGHT = '#D4A63A', '#A8781E'
INK, CREAM = '#111111', '#F4EEE1'
S = bl.S


def paint(body, colour):
    return f'<g fill="{colour}">{body}</g>'


def doc(body, w, h, bg=None, pad=0):
    W, H = w + 2 * pad, h + 2 * pad
    back = f'<rect width="{W:.0f}" height="{H:.0f}" fill="{bg}"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">{back}'
            f'<g transform="translate({pad} {pad})">{body}</g></svg>')


def save(name, s, w):
    open(f'{OUT}/{name}.svg', 'w').write(s)
    cairosvg.svg2png(bytestring=s.encode(), write_to=f'{OUT}/{name}.png', output_width=w)


def png(s, w):
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=s.encode(), output_width=w))).convert('RGBA')


mark, small = bl.mark_body(), bl.mark_body(small=True)
wm, ww, xh = bl.wm, bl.ww, bl.xh
gap = 110
ty = S / 2 + xh / 2

# --- gold lockups -------------------------------------------------------------
for name, mcol, tcol, bg in (('lockup-gold-on-black', GOLD_ON_DARK, CREAM, INK),
                             ('lockup-gold-on-cream', GOLD_ON_LIGHT, INK, CREAM)):
    body = paint(mark, mcol) + f'<g transform="translate({S + gap} {ty:.1f})">{paint(wm, tcol)}</g>'
    save(name, doc(body, S + gap + ww, S, bg, 120), 2000)
save('mark-gold', doc(paint(mark, GOLD_ON_DARK), S, S), 1000)

# --- Instagram profile picture --------------------------------------------------
# 1080x1080; Instagram crops to a circle, so the disc sits well inside it.
IG = 1080
scale = 0.66 * IG / S
ig = doc(f'<g transform="translate({(IG - S * scale) / 2:.1f} {(IG - S * scale) / 2:.1f}) scale({scale:.4f})">'
         f'{paint(mark, GOLD_ON_DARK)}</g>', IG, IG, INK)
save('instagram-profile', ig, IG)

# --- favicons -------------------------------------------------------------------
# Tiny sizes use the simplified mark on a dark rounded tile so it stays legible in browser tabs.
def tile(body, size, radius=0.22, fill=1.0):
    k = fill * S
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">'
            f'<rect width="{S}" height="{S}" rx="{S * radius:.0f}" fill="{INK}"/>'
            f'<g transform="translate({(S - k) / 2:.1f} {(S - k) / 2:.1f}) scale({fill})">{paint(body, GOLD_ON_DARK)}</g></svg>')

# 16 px needs even less: 8 dots, 2 rings, strokes roughly twice as heavy
_lw = bl.bc.LW
bl.bc.LW = 110
tiny = bl.bc.disc(dots=8, dot_r=70, dot_R=420, rings=2, r=290, g=70)
bl.bc.LW = _lw
fav_tiny = tile(tiny, 16, fill=0.92)
fav_small = tile(small, 32, fill=0.86)
fav_large = tile(mark, 512, fill=0.82)
open(f'{OUT}/favicon/favicon.svg', 'w').write(fav_small)
open(f'{OUT}/favicon/favicon-16.svg', 'w').write(fav_tiny)
ico_imgs = [png(fav_tiny, 16)] + [png(fav_small, s) for s in (32, 48)]
ico_imgs[-1].save(f'{OUT}/favicon/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico_imgs[:-1])
for s, n in ((180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')):
    # Apple adds its own rounded corners, so its tile is square
    src = tile(mark, s, radius=0 if 'apple' in n else 0.22, fill=0.82)
    png(src, s).save(f'{OUT}/favicon/{n}')
open(f'{OUT}/favicon/snippet.html', 'w').write(
    '<link rel="icon" href="/favicon.ico" sizes="48x48">\n'
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n')

# --- presentation sheet ------------------------------------------------------------
font = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf', 22)
P = Image.new('RGB', (1800, 900), 'white')
d = ImageDraw.Draw(P)
def place(img, xy, label):
    P.paste(img.convert('RGB'), xy)
    d.text((xy[0] + 10, xy[1] - 26), label, fill='#888', font=font)
place(png(open(f'{OUT}/lockup-gold-on-black.svg').read(), 1100), (30, 40), 'gold on black')
place(png(open(f'{OUT}/lockup-gold-on-cream.svg').read(), 1100), (30, 500), 'gold on cream')
# instagram, shown cropped to a circle as it appears in the app
av = png(ig, 300)
mask = Image.new('L', (300, 300), 0)
ImageDraw.Draw(mask).ellipse((0, 0, 299, 299), fill=255)
canvas = Image.new('RGB', (300, 300), 'white')
canvas.paste(av, (0, 0), mask)
place(canvas, (1300, 40), 'instagram (as cropped)')
# favicons in a mock browser tab
tab = Image.new('RGB', (420, 60), '#E8E8E8')
td = ImageDraw.Draw(tab)
td.rounded_rectangle((10, 8, 410, 60), 12, fill='white')
tab.paste(png(fav_tiny, 16).convert('RGB'), (28, 26))
td.text((54, 22), 'colector de luz', fill='#333', font=ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf', 18))
place(tab, (1300, 420), 'browser tab (16 px)')
x = 1300
for s in (16, 32, 48):
    P.paste(png(fav_tiny if s == 16 else fav_small, s).convert('RGB'), (x, 600))
    x += s + 30
P.paste(png(open(f'{OUT}/favicon/apple-touch-icon.png', 'rb') and tile(mark, 180, radius=0.22, fill=0.82), 120).convert('RGB'), (x + 20, 560))
d.text((1310, 520), 'favicon 16 / 32 / 48 + home-screen icon', fill='#888', font=font)
P.save(f'{OUT}/presentation-extras.png')

import shutil
shutil.rmtree(os.path.join(OUT, '.lockups-tmp'), ignore_errors=True)
print('ok')
