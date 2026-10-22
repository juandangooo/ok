# Makes the Hellhound logo readable on a near-black background:
# black wordmark -> light grey (red bolt kept), plus a faint rim around the cube.
import numpy as np
from PIL import Image, ImageFilter

src = Image.open('hellhound-src.webp').convert('RGBA')
a = np.asarray(src).astype(np.float32)
rgb, al = a[..., :3], a[..., 3]

TEXT_TOP = 1400  # wordmark starts below the cube
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
dark = (r < 90) & (g < 90) & (b < 90)
text = np.zeros_like(dark); text[TEXT_TOP:] = True
rgb[dark & text] = (214, 218, 223)

# rim: thin ring just outside the cube silhouette
cube_alpha = Image.fromarray(np.where(np.arange(al.shape[0])[:, None] < TEXT_TOP, al, 0).astype(np.uint8))
grown = np.asarray(cube_alpha.filter(ImageFilter.MaxFilter(7))).astype(np.float32)
ring = np.clip(grown - np.asarray(cube_alpha), 0, 255) * 0.35

out = np.dstack([rgb, al])
rim = np.zeros_like(out); rim[..., :3] = 200; rim[..., 3] = ring
# composite logo over rim
oa = out[..., 3:4] / 255; ra = rim[..., 3:4] / 255
fa = oa + ra * (1 - oa)
frgb = (out[..., :3] * oa + rim[..., :3] * ra * (1 - oa)) / np.maximum(fa, 1e-6)
res = Image.fromarray(np.dstack([frgb, fa[..., 0] * 255]).clip(0, 255).astype(np.uint8))
res.crop((300, 185, 1700, 1815)).save('hellhound-dark.png')
print(res.crop((300, 185, 1700, 1815)).size)
