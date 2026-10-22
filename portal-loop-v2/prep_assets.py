# Builds the textures the scene needs:
#   hound-graphite.png  Hellhound logo re-toned into the same graphite world as the bat
#   hound-edge.png      thin rim around the cube, lit later from the portal side
#   fog-a.png / fog-b.png  soft fractal haze (alpha = density)
import numpy as np
from PIL import Image, ImageFilter

src = np.asarray(Image.open('hellhound-src.webp').convert('RGBA')).astype(np.float32)
rgb, al = src[..., :3], src[..., 3]
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

red = np.clip((r - g) / 180, 0, 1)
white = np.clip((np.minimum(np.minimum(r, g), b) - 10) / 245, 0, 1) * (1 - red)
black = np.clip(1 - red - white, 0, 1)

TEXT_TOP = 1400
cube = np.arange(al.shape[0])[:, None] < TEXT_TOP

def tone(black_c, red_c, white_c):
    return (black[..., None] * np.array(black_c) + red[..., None] * np.array(red_c)
            + white[..., None] * np.array(white_c))

cube_rgb = tone((11, 11, 12), (27, 22, 21), (46, 47, 50))   # dark face / ember face / lifted H
text_rgb = tone((64, 66, 70), (86, 52, 46), (64, 66, 70))   # quiet wordmark, muted ember bolt
out_rgb = np.where(cube[..., None], cube_rgb, text_rgb)
out = np.dstack([out_rgb, al]).clip(0, 255).astype(np.uint8)
box = (300, 185, 1700, 1815)
Image.fromarray(out).crop(box).save('hound-graphite.png')

cube_alpha = Image.fromarray(np.where(cube, al, 0).astype(np.uint8))
grown = np.asarray(cube_alpha.filter(ImageFilter.MaxFilter(5))).astype(np.float32)
ring = np.clip(grown - np.asarray(cube_alpha), 0, 255)
edge = np.dstack([np.full_like(ring, 255)] * 3 + [ring]).astype(np.uint8)
Image.fromarray(edge).crop(box).save('hound-edge.png')

# fractal haze: sum of smoothly upscaled random grids
def fbm(w, h, seed, octaves=(6, 12, 24, 48), gains=(1, .5, .25, .12)):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    for o, k in zip(octaves, gains):
        gw, gh = max(2, int(o * w / h)), o
        grid = rng.random((gh, gw)).astype(np.float32) * 255
        up = Image.fromarray(grid.astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += np.asarray(up, np.float32) / 255 * k
    acc /= sum(gains)
    acc = np.clip((acc - 0.35) / 0.4, 0, 1) ** 1.6
    return acc

for name, seed, oct_ in [('fog-a.png', 3, (4, 8, 16, 32)), ('fog-b.png', 9, (7, 14, 28, 56))]:
    d = fbm(1600, 300, seed, oct_)
    img = np.dstack([np.full_like(d, 222), np.full_like(d, 214), np.full_like(d, 202), d * 255]).astype(np.uint8)
    Image.fromarray(img).filter(ImageFilter.GaussianBlur(2)).save(name)
print('ok')
