"""Logo/QR coin for the corner: logo holds, spins 1.5 turns to the QR, QR holds still
(scannable), spins back. Same motion as the v2/v3 TV loop (10s cycle)."""
import math
from PIL import Image, ImageDraw, ImageFilter

BRAND = __file__.rsplit('/', 1)[0] + '/brand/'


def _outline(im, px):
    """White outline around an RGBA cut-out so the black cube face reads on a dark field."""
    pad = px * 2
    big = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2))
    big.paste(im, (pad, pad), im)
    a = big.split()[3].filter(ImageFilter.MaxFilter(px * 2 + 1))
    out = Image.new('RGBA', big.size, (255, 255, 255, 0))
    out.putalpha(a)
    out.alpha_composite(big)
    return out


def faces(size):
    """(front, back) RGBA squares of side `size`."""
    mark = Image.open(BRAND + 'mark.png').convert('RGBA')
    mark = _outline(mark, 6)
    s = size / max(mark.size)
    mark = mark.resize((round(mark.width * s), round(mark.height * s)), Image.LANCZOS)
    front = Image.new('RGBA', (size, size))
    front.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))

    qr = Image.open(BRAND + 'qr.png').convert('RGBA').resize((size, size), Image.LANCZOS)
    m = Image.new('L', (size, size))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 14, fill=255)
    back = Image.new('RGBA', (size, size))
    back.paste(qr, (0, 0), m)
    return front, back


def _inout(x):
    x = min(1, max(0, x))
    return x * x * (3 - 2 * x)


def _prog(t, a, b):
    return (t - a) / (b - a)


def angle(t):
    c = t % 10
    return _inout(_prog(c, 3.6, 5.0)) * 540 + _inout(_prog(c, 8.6, 10.0)) * 540


def frame(front, back, t):
    """Coin at time t, returned on a transparent canvas the size of a face (+ bob margin)."""
    size = front.width
    deg = angle(t) + math.sin(t * 1.1) * 10
    c = math.cos(math.radians(deg))
    face = front if c >= 0 else back
    w = max(1, round(size * abs(c)))
    squashed = face.resize((w, size), Image.LANCZOS)
    bob = round(math.sin(t * 1.5) * size * 0.04)
    margin = round(size * 0.06)
    canvas = Image.new('RGBA', (size, size + margin * 2))
    canvas.alpha_composite(squashed, ((size - w) // 2, margin + bob))
    return canvas
