# Bakes film grain into the still: luma grain with a hint of chroma noise,
# stronger in the shadows so the dark fog reads gritty rather than banded.
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1:3]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
rng = np.random.default_rng(11)
h, w, _ = im.shape
luma = im.mean(axis=2, keepdims=True)
shadow = 1.0 - np.clip(luma / 120.0, 0, 1) * 0.55
coarse = np.asarray(Image.fromarray(rng.normal(128, 40, (h, w)).clip(0, 255).astype(np.uint8))
                    .filter(ImageFilter.GaussianBlur(0.9))).astype(np.float32)[..., None] - 128
fine = rng.normal(0, 1, (h, w, 1)).astype(np.float32)
chroma = rng.normal(0, 1, (h, w, 3)).astype(np.float32)
out = im + (coarse * 0.20 + fine * 3.2) * shadow + chroma * 0.9
Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(dst, optimize=True)
