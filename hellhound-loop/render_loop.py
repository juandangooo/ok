#!/usr/bin/env python3
"""Render the Hellhound Audio "Services We Offer" loop (1920x1080, 30 fps, 150 s).

Usage:
  render_loop.py prep <src.mp4> <workdir>      extract photos, VHS intro, logo, QR from the source video
  render_loop.py still <workdir> <t> <out.png>  render one frame
  render_loop.py chunk <workdir> <a> <b> <out.mp4>  render frames [a, b) to an mp4

Every frame is a pure function of (t mod T), so the last frame flows into the first.
"""
import math, os, subprocess, sys, zlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, T = 1920, 1080, 30, 150.0
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

# ---- palette (warm, softly muted; all text >= 5:1 on cream) -----------------
CREAM = (238, 228, 210)
LATTICE = (229, 217, 196)
INK = (42, 36, 32)
SOFT = (84, 72, 64)
RED = (176, 48, 42)
MUSTARD = (226, 168, 43)

# ---- services: photo indices refer to ph/pNN.png (2 s slides in the source) --
# Copy for descriptors is PROPOSED and needs client sign-off.
SERVICES = [
    ("Audio",    "Sound systems and mixing",  [12, 6, 35, 1]),
    ("Visual",   "Screens and video",         [5, "pre", 28, 18]),
    ("Staging",  "Stages and platforms",      [62, 7, 44, 54]),
    ("Power",    "Power for your event",      [17, 15, 34, 43]),
    ("Truss",    "Truss structures",          [52, 3, 46, 47]),
    ("Lighting", "Stage and event lighting",  [65, 11, 66, 71]),
]
BUMPER = 6.0
SEG = 24.0
PHOTO = 6.0
IRIS = 1.4            # transition length, centred on each boundary
URL = "HellhoundAudio.com"

# ---- layout (1080p) ----------------------------------------------------------
WIN = 760
WX, WY = 1064, 160
LEFT = 96
NHEX = None


def smooth(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def font(name, size, **kw):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if kw:
        f.set_variation_by_axes([kw.get("opsz", 14), kw.get("wght", 400)])
    return f


def tracked(draw, xy, text, fnt, fill, spacing):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + spacing
    return x


def hexagon(cx, cy, r):  # pointy-top, matches the logo
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
            for a in (90, 30, -30, -90, -150, 150)]


# ============================ prep =============================================
def prep(src, wd):
    os.makedirs(wd + "/ph", exist_ok=True)
    starts = [4.2] + [6.0 + 2 * i for i in range(71)]
    for i, s in enumerate(starts):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{s+0.9:.2f}", "-i", src, "-frames:v", "1",
                        "-vf", "crop=546:546:367:40", f"{wd}/ph/p{i:02d}.png"], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "3.3", "-i", src, "-frames:v", "1",
                    "-vf", "crop=546:546:367:40", f"{wd}/ph/pre.png"], check=True)
    os.makedirs(wd + "/vhs", exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-t", "2.2", "-i", src, "-vf", "crop=546:546:367:40",
                    f"{wd}/vhs/v%03d.png"], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "9", "-i", src, "-frames:v", "1", f"{wd}/ref.png"], check=True)


# ============================ assets ===========================================
class Assets:
    def __init__(self, wd):
        self.wd = wd
        self.base_cache = {}
        self.lattice = self._lattice()
        self.nhex = self._nhex()
        self.round = self._round_mask()
        self.vhs = self._vhs()
        self.photos = {}
        for _, _, idxs in SERVICES:
            for i in idxs:
                self.photos[i] = self._photo(i)
        self.logo = self._logo()
        self.qr = self._qr()
        self.frame_rgb, self.frame_a = self._paper_frame()
        self.text = [self._left_layer(k) for k in range(7)]   # 0 = bumper, 1..6 services
        self.chrome = self._chrome()
        self.url_states = self._url_states()

    # -- background lattice: period (sqrt3*R, 0) so a drift of one period per loop is seamless
    def _lattice(self):
        R = 96.0
        px = math.sqrt(3) * R
        py = 3 * R  # two rows
        Wb, Hb = W + 3 * int(px) + 8, H + 2 * int(py)
        ss = 2
        # scale coords: polygon was drawn in 1x units, so redo at ss
        im = Image.new("L", (Wb * ss, Hb * ss), 0)
        d = ImageDraw.Draw(im)
        row, y = 0, -R
        while y < Hb + 2 * R:
            x = -px + (px / 2 if row % 2 else 0)
            while x < Wb + px:
                d.polygon([(a * ss, b * ss) for a, b in hexagon(x, y, R)], outline=255, width=3)
                x += px
            y += 1.5 * R
            row += 1
        im = im.resize((Wb, Hb), Image.LANCZOS)
        self.period = px
        return im

    def lattice_frame(self, t):
        shift = (t / T) * self.period
        # sample window starting at offset so drift moves left->right by one period per loop
        ox = self.period - shift
        arr = self.lattice.transform((W, H), Image.AFFINE, (1, 0, ox, 0, 1, 0), resample=Image.BICUBIC)
        a = np.asarray(arr, dtype=np.float32)[..., None] / 255.0
        base = np.array(CREAM, np.float32)
        line = np.array(LATTICE, np.float32)
        return base + (line - base) * a

    def _nhex(self):
        ys, xs = np.mgrid[0:WIN, 0:WIN].astype(np.float32)
        x = np.abs(xs - WIN / 2 + 0.5)
        y = np.abs(ys - WIN / 2 + 0.5)
        return np.maximum(x / (math.sqrt(3) / 2), x / math.sqrt(3) + y)

    def _round_mask(self):
        m = Image.new("L", (WIN * 2, WIN * 2), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, WIN * 2 - 1, WIN * 2 - 1], radius=16, fill=255)
        return np.asarray(m.resize((WIN, WIN), Image.LANCZOS), np.float32)[..., None] / 255.0

    # -- photos: warm, muted, evened-out brightness, light grain; stored oversized for slow push-in
    def _photo(self, i):
        name = "pre" if i == "pre" else f"p{i:02d}"
        im = Image.open(f"{self.wd}/ph/{name}.png").convert("RGB")
        S = int(WIN * 1.08)
        im = im.resize((S, S), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=40, threshold=2))
        a = np.asarray(im, np.float32) / 255.0
        lum = float((a * [0.299, 0.587, 0.114]).sum(-1).mean())
        g = math.log(0.42) / math.log(max(lum, 0.05))
        g = 1 + (min(max(g, 0.75), 1.3) - 1) * 0.7
        a = np.power(a, g)
        gray = (a * [0.299, 0.587, 0.114]).sum(-1, keepdims=True)
        a = gray + (a - gray) * 0.88                       # softly muted colour
        sep = np.stack([gray[..., 0] * 1.06, gray[..., 0] * 0.98, gray[..., 0] * 0.84], -1)
        a = a * 0.9 + sep * 0.1                            # a touch of sepia
        a = a * np.array([1.025, 1.0, 0.95]) * 0.96 + 0.035   # warm, faded blacks
        yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
        r = np.sqrt(((xx - S / 2) / (S / 2)) ** 2 + ((yy - S / 2) / (S / 2)) ** 2)
        a *= (1 - 0.13 * np.clip(r - 0.55, 0, 1) ** 1.5)[..., None]   # soft vignette
        rng = np.random.default_rng(zlib.crc32(str(i).encode()))
        a += rng.normal(0, 0.010, a.shape[:2])[..., None]
        return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

    def photo_frame(self, i, u, k):
        """Slow Ken Burns on photo i; u = local progress (0..1), k = scene counter for direction."""
        im = self.photos[i]
        S = im.size[0]
        u = min(max(u, -0.12), 1.12)
        zin = k % 2 == 0
        z = 1.0 + 0.05 * (u if zin else (1 - u))
        c = S / (1.08 * z)
        mx = (S - c)
        dirs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
        dx, dy = dirs[k % 4]
        cx = S / 2 + dx * mx * 0.30 * (u - 0.5)
        cy = S / 2 + dy * mx * 0.30 * (u - 0.5)
        box = (cx - c / 2, cy - c / 2, cx + c / 2, cy + c / 2)
        out = im.resize((WIN, WIN), Image.BICUBIC, box=box)
        return np.asarray(out, np.float32)

    def _vhs(self):
        d = f"{self.wd}/vhs"
        names = sorted(n for n in os.listdir(d) if n.endswith(".png"))
        fr = []
        for n in names:
            im = Image.open(f"{d}/{n}").convert("RGB").resize((WIN, WIN), Image.LANCZOS)
            a = np.asarray(im, np.float32)
            # nudge the tape's grey-beige toward our cream so it sits in the same world
            a = a * 0.9 + np.array(CREAM, np.float32) * 0.1 * (a.mean() / 220)
            fr.append(np.clip(a, 0, 255))
        return fr

    def vhs_frame(self, dt):
        # tape plays at 0.4x: the glitch is gentler and the clean mark holds on screen longer
        src_t = min(max(dt * 0.4, 0), 2.2)
        i = min(int(src_t * 60), len(self.vhs) - 1)
        return self.vhs[i]

    # -- brand crops from the source: logo lockup and the original QR (decodes to HellhoundAudio.com)
    def _norm_crop(self, box):
        ref = Image.open(f"{self.wd}/ref.png").convert("RGB")
        a = np.asarray(ref.crop(box), np.float32)
        bg = np.median(a.reshape(-1, 3), axis=0)
        return np.clip(a / bg * 255, 0, 255), bg

    def _logo(self):
        a, _ = self._norm_crop((960, 32, 1218, 122))
        a[64:, 88:] = 255                      # drop the tiny "www" line (unreadable on a TV)
        a = a[:62 + 20]
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        h = 104
        w = int(im.size[0] * h / im.size[1])
        im = im.resize((w, h), Image.LANCZOS)
        n = np.asarray(im, np.float32) / 255.0
        return np.clip(n / 0.93, 0, 1)         # levels: flatten the beige ground so it multiplies away

    def _qr(self):
        a, _ = self._norm_crop((117, 232, 270, 382))   # modules only; plate and quiet zone are redrawn
        im = Image.fromarray(a.astype(np.uint8)).resize((184, 184), Image.LANCZOS)
        return np.asarray(im, np.float32) / 255.0

    # -- paper print frame + soft shadow behind the photo window
    def _paper_frame(self):
        pad = 14
        S = WIN + 2 * pad
        m = 70
        sh = Image.new("L", (S + 2 * m, S + 2 * m), 0)
        ImageDraw.Draw(sh).rounded_rectangle([m, m + 10, m + S, m + S + 10], radius=20, fill=70)
        sh = sh.filter(ImageFilter.GaussianBlur(22))
        paper = Image.new("L", (S + 2 * m, S + 2 * m), 0)
        ImageDraw.Draw(paper).rounded_rectangle([m, m, m + S, m + S], radius=20, fill=255)
        paper = paper.filter(ImageFilter.GaussianBlur(0.8))
        rgb = np.zeros((S + 2 * m, S + 2 * m, 3), np.float32)
        a_sh = np.asarray(sh, np.float32) / 255.0
        a_pp = np.asarray(paper, np.float32) / 255.0
        shadow_col = np.array((70, 52, 36), np.float32)
        paper_col = np.array((248, 242, 230), np.float32)
        a = a_pp + a_sh * (1 - a_pp)
        rgb = (paper_col * a_pp[..., None] + shadow_col * (a_sh * (1 - a_pp))[..., None]) / np.maximum(a, 1e-4)[..., None]
        self.frame_xy = (WX - pad - m, WY - pad - m)
        return rgb.astype(np.float32), a[..., None].astype(np.float32)

    # -- left-column text layers (premultiplied over cream by alpha)
    def _left_layer(self, k):
        LW, LH = 980, H
        im = Image.new("RGBA", (LW, LH), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        if k == 0:
            f = font("DMSerifDisplay-Regular.ttf", 112)
            d.text((LEFT - 2, 380), "What we offer", font=f, fill=INK + (255,), anchor="ls")
            d.rectangle([LEFT + 4, 414, LEFT + 4 + 96, 420], fill=MUSTARD + (255,))
            fl = font("DMSans.ttf", 56, wght=600, opsz=36)
            for n, (name, _, _) in enumerate(SERVICES):
                col, row = n % 2, n // 2
                x = LEFT + col * 400
                y = 452 + row * 80
                d.polygon(hexagon(x + 18, y + 40, 16), fill=RED + (255,))
                d.text((x + 56, y), name, font=fl, fill=INK + (255,))
        else:
            name, desc, _ = SERVICES[k - 1]
            size = 236
            f = font("DMSerifDisplay-Regular.ttf", size)
            while d.textlength(name, font=f) > 860:
                size -= 6
                f = font("DMSerifDisplay-Regular.ttf", size)
            d.text((LEFT - 4, 508), name, font=f, fill=INK + (255,), anchor="ls")
            d.rectangle([LEFT + 4, 546, LEFT + 4 + 96, 552], fill=MUSTARD + (255,))
            fd = font("DMSans.ttf", 54, wght=500, opsz=36)
            d.text((LEFT + 2, 578), desc, font=fd, fill=SOFT + (255,))
            # six hexagon pips: which of the six services we're on
            for n in range(6):
                cx, cy = LEFT + 20 + n * 62, 690
                if n == k - 1:
                    d.polygon(hexagon(cx, cy, 21), fill=RED + (255,))
                else:
                    d.polygon(hexagon(cx, cy, 21), outline=SOFT + (255,), width=3)
        a = np.asarray(im, np.float32)
        return a[..., :3], a[..., 3:] / 255.0

    # -- persistent chrome: logo, QR plate, "scan to visit"
    def _chrome(self):
        LW, LH = 980, H
        rgb = np.zeros((LH, LW, 3), np.float32)
        alpha = np.zeros((LH, LW, 1), np.float32)
        cream = np.array(CREAM, np.float32)
        # logo (multiply onto cream so its beige ground disappears)
        lg = self.logo
        y0, x0 = WY, LEFT
        self.logo_mul = lg
        self.logo_xy = (y0, x0)
        # QR on a pale paper plate
        qr = self.qr
        sz = 168
        q = Image.fromarray((qr * 255).astype(np.uint8)).resize((sz - 40, sz - 40), Image.LANCZOS)
        plate = Image.new("RGB", (sz, sz), (250, 246, 238))
        plate.paste(q, (20, 20))
        pa = np.asarray(plate, np.float32)
        qx, qy = LEFT, WY + WIN - sz
        rgb[qy:qy + sz, qx:qx + sz] = pa
        alpha[qy:qy + sz, qx:qx + sz] = 1
        self.qr_box = (qx, qy, sz)
        im = Image.fromarray(rgb.astype(np.uint8)).convert("RGBA")
        d = ImageDraw.Draw(im)
        fl = font("DMSans.ttf", 30, wght=700, opsz=24)
        tx = qx + sz + 36
        tracked(d, (tx, qy + 26), "SCAN TO VISIT", fl, RED + (255,), 5)
        arr = np.asarray(im, np.float32)
        txt_alpha = np.zeros((LH, LW), np.float32)
        tl = Image.new("L", (LW, LH), 0)
        tracked(ImageDraw.Draw(tl), (tx, qy + 26), "SCAN TO VISIT", fl, 255, 5)
        txt_alpha = np.asarray(tl, np.float32)[..., None] / 255.0
        rgb2 = rgb * (1 - txt_alpha) + np.array(RED, np.float32) * txt_alpha
        alpha2 = np.maximum(alpha, txt_alpha)
        self.url_xy = (tx, qy + 84)
        return rgb2, alpha2

    def _url_states(self):
        f = font("CutiveMono-Regular.ttf", 50)
        full = URL + " :)"
        states = []
        w_full = Image.new("L", (10, 10))
        d0 = ImageDraw.Draw(w_full)
        self.url_w = int(d0.textlength(full, font=f)) + 30
        for n in range(len(full) + 1):
            im = Image.new("L", (self.url_w + 40, 80), 0)
            d = ImageDraw.Draw(im)
            d.text((0, 6), full[:n], font=f, fill=255)
            cx = d.textlength(full[:n], font=f)
            states.append((np.asarray(im, np.float32)[..., None] / 255.0, cx))
        return states

    def url_text(self, t):
        full = len(URL + " :)")
        tm = t % T
        if tm < 0.8:
            n = 0
        elif tm < 2.3:
            n = int((tm - 0.8) * 12)
        elif tm < 3.3:
            n = len(URL)
        elif tm < 3.6:
            n = len(URL) + 1
        elif tm < T - 3.0:
            n = full
        else:
            n = max(0, full - int((tm - (T - 3.0)) * 12))   # a quick backspace so the loop re-types
        n = min(max(n, 0), full)
        arr, cx = self.url_states[n]
        typing = (0.8 <= tm < 3.6) or tm >= T - 3.0
        cursor_on = typing or (int(tm * 1.6) % 2 == 0)
        return arr, cx, cursor_on


# ============================ timeline =========================================
def photo_scenes():
    sc = [("vhs", None, 0.0, BUMPER)]
    for k, (_, _, idxs) in enumerate(SERVICES):
        for m, i in enumerate(idxs):
            sc.append(("photo", i, BUMPER + k * SEG + m * PHOTO, PHOTO))
    return sc


SCENES = photo_scenes()
TEXT_STARTS = [0.0] + [BUMPER + k * SEG for k in range(6)]


def cyc(dt):
    return ((dt + T / 2) % T) - T / 2


def nearest_boundary(t, starts):
    best = None
    for j, s in enumerate(starts):
        d = cyc(t - s)
        if abs(d) < IRIS / 2 and (best is None or abs(d) < abs(best[1])):
            best = (j, d)
    return best


def scene_at(t, starts):
    tm = t % T
    j = max(i for i, s in enumerate(starts) if s <= tm)
    return j


# ============================ frame ============================================
def blend(dst, src_rgb, alpha, y, x):
    h, w = src_rgb.shape[:2]
    y0, x0 = max(y, 0), max(x, 0)
    y1, x1 = min(y + h, dst.shape[0]), min(x + w, dst.shape[1])
    if y1 <= y0 or x1 <= x0:
        return
    s = src_rgb[y0 - y:y1 - y, x0 - x:x1 - x]
    a = alpha[y0 - y:y1 - y, x0 - x:x1 - x]
    dst[y0:y1, x0:x1] = dst[y0:y1, x0:x1] * (1 - a) + s * a


def scene_image(A, sc, t):
    kind, idx, s0, dur = sc
    dt = cyc(t - s0)
    if kind == "vhs":
        return A.vhs_frame(dt)
    k = [i for i, s in enumerate(SCENES) if s is sc][0]
    return A.photo_frame(idx, dt / dur, k)


def render(A, t):
    t = t % T
    f = A.lattice_frame(t)

    # paper frame + shadow
    fy, fx = A.frame_xy[1], A.frame_xy[0]
    blend(f, A.frame_rgb, A.frame_a, fy, fx)

    # photo window
    starts = [s[2] for s in SCENES]
    nb = nearest_boundary(t, starts)
    if nb is None:
        j = scene_at(t, starts)
        img = scene_image(A, SCENES[j], t)
    else:
        jn, d = nb
        jo = (jn - 1) % len(SCENES)
        p = (d + IRIS / 2) / IRIS
        old, new = scene_image(A, SCENES[jo], t), scene_image(A, SCENES[jn], t)
        R = -50 + smooth(p) * 700
        m = np.clip((R - A.nhex) / 46.0, 0, 1)[..., None]
        img = old * (1 - m) + new * m
    win = np.clip(img, 0, 255)
    blend(f, win, A.round, WY, WX)

    # left column: persistent chrome, then title layer(s)
    c_rgb, c_a = A.chrome
    ly, lx = A.logo_xy
    f[ly:ly + A.logo_mul.shape[0], lx:lx + A.logo_mul.shape[1]] *= A.logo_mul
    blend(f, c_rgb, c_a, 0, 0)
    tb = nearest_boundary(t, TEXT_STARTS)
    if tb is None:
        layers = [(scene_at(t, TEXT_STARTS), 1.0, 0)]
    else:
        jn, d = tb
        jo = (jn - 1) % len(TEXT_STARTS)
        p = (d + IRIS / 2) / IRIS
        eo, en = smooth(p / 0.45), smooth((p - 0.55) / 0.45)   # old leaves, then new arrives: never overlapped
        layers = [(jo, 1 - eo, int(-12 * eo)), (jn, en, int(12 * (1 - en)))]
    ink = np.zeros((H, 980, 3), np.float32)
    for idx, a, dy in layers:
        rgb, al = A.text[idx]
        blend(f, rgb, al * a, dy, 0)

    # typed URL with blinking block cursor, as in the original
    arr, cx, cur = A.url_text(t)
    ux, uy = A.url_xy
    ink_col = np.array(INK, np.float32)
    sub = f[uy:uy + arr.shape[0], ux:ux + arr.shape[1]]
    f[uy:uy + arr.shape[0], ux:ux + arr.shape[1]] = sub * (1 - arr) + ink_col * arr
    if cur:
        x0 = int(ux + cx + 3)
        f[uy + 12:uy + 62, x0:x0 + 22] = ink_col

    return np.clip(f, 0, 255).astype(np.uint8)


# ============================ cli ==============================================
def main():
    cmd = sys.argv[1]
    if cmd == "prep":
        prep(sys.argv[2], sys.argv[3])
        return
    A = Assets(sys.argv[2])
    if cmd == "still":
        Image.fromarray(render(A, float(sys.argv[3]))).save(sys.argv[4])
    elif cmd == "chunk":
        a, b, out = int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                              "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
                              "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                              "-color_trc", "bt709", "-g", "30", "-an", out], stdin=subprocess.PIPE)
        for n in range(a, b):
            p.stdin.write(render(A, n / FPS).tobytes())
        p.stdin.close()
        p.wait()


if __name__ == "__main__":
    main()
