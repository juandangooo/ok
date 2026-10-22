# Neon tube maps for the Hellhound emblem, traced from the original logo's colour regions:
#   neon-red.png   tubes along the red face / bevels and the cube outline
#   neon-white.png tubes around the white H
# Same crop box as hound-graphite.png so they overlay 1:1.
import numpy as np
from PIL import Image, ImageFilter

src = np.asarray(Image.open('hellhound-src.webp').convert('RGBA')).astype(np.float32)
r, g, b, al = src[..., 0], src[..., 1], src[..., 2], src[..., 3]
TEXT_TOP = 1400
cube = (np.arange(al.shape[0])[:, None] < TEXT_TOP) & (al > 128)

red = cube & (r - g > 90)
white = cube & (np.minimum(np.minimum(r, g), b) > 170)

def outline(mask, grow, shrink):
    m = Image.fromarray((mask * 255).astype(np.uint8))
    outer = np.asarray(m.filter(ImageFilter.MaxFilter(grow))) > 127
    inner = np.asarray(m.filter(ImageFilter.MinFilter(shrink))) > 127
    return outer & ~inner

def tube(mask, rgb):
    a = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    a = np.asarray(a)
    img = np.dstack([np.full(a.shape, c, np.uint8) for c in rgb] + [a])
    return Image.fromarray(img).crop((300, 185, 1700, 1815))

red_t = outline(red, 9, 3) | outline(cube, 9, 3)
white_t = outline(white, 9, 3)
tube(red_t, (255, 70, 66)).save('neon-red.png')
tube(white_t, (255, 246, 238)).save('neon-white.png')
print(red_t.sum(), white_t.sum())
