"""Turns the clean spreads from build.js into something that looks scanned from an old book."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

rng = np.random.default_rng(1974)


def blurred_noise(shape, sigma, radius):
    n = rng.normal(0, 1, shape[:2]).astype(np.float32)
    img = Image.fromarray(((n * sigma) + 128).clip(0, 255).astype(np.uint8))
    return (np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), np.float32) - 128)[..., None]


def age(src, dst, tilt):
    im = Image.open(src).convert('RGB')
    # Ink spreads a little into the paper.
    im = im.filter(ImageFilter.GaussianBlur(0.9))
    a = np.asarray(im, np.float32)
    h, w = a.shape[:2]

    # Yellow the paper and soften the blacks, as old offset printing does.
    lum = a.mean(axis=2, keepdims=True)
    a = a * 0.86 + lum * 0.14
    a = a * np.array([1.0, 0.975, 0.92]) + np.array([14, 12, 8])

    # Fibre grain, plus slow mottling across the sheet.
    a += blurred_noise(a.shape, 9, 0.6)
    a += blurred_noise(a.shape, 60, 40) * 0.35

    # Uneven scanner light: brighter in the middle, falling off at the corners.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.hypot((xx - w * 0.55) / w, (yy - h * 0.45) / h)
    a *= (1.04 - 0.22 * r ** 2)[..., None]

    out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    out = out.rotate(tilt, resample=Image.BICUBIC, fillcolor=(196, 194, 188))
    out = out.resize((w * 5 // 6, h * 5 // 6), Image.LANCZOS)
    out.save(dst, quality=78, subsampling=2)


if __name__ == '__main__':
    src_dir, dst_dir = Path(sys.argv[1]), Path(sys.argv[2])
    dst_dir.mkdir(parents=True, exist_ok=True)
    tilts = [-0.6, 0.35, -0.25, 0.5, -0.4]
    for f, t in zip(sorted(src_dir.glob('raw-*.png')), tilts):
        age(f, dst_dir / (f.stem.replace('raw-', 'plate-') + '.jpg'), t)
