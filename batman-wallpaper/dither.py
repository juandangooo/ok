# Adds fine monochrome grain so dark gradients don't band on 8-bit panels.
import sys
import numpy as np
from PIL import Image

for f in sys.argv[1:]:
    im = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 1.6, im.shape[:2])[..., None]
    out = np.clip(im + noise + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(f, optimize=True)
