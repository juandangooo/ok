"""Newark Museum of Art, 10.08.26 — Hellhound Audio event recap (1080x1920, 30fps, 1:10).

v4: the day in clock order, from load-in at 10:34 am to the dance floor at 8:38 pm, told with the clips and
photo bursts played as stop-motion (never single stills). A camcorder time stamp ticks forward in the corner.
People at work fill the screen; at each chapter break the picture collapses into the logo's hexagon (a wide
shot of the room inside it), then blows back out. Opens on the logo, ends by collapsing into it and flipping
to a scannable QR code. Cuts on a 120 BPM grid.

usage:
  python3 render.py cache            # cut every shot out of the source footage (slow, once)
  python3 render.py board            # storyboard: first / middle / last frame of every shot
  python3 render.py stills 3.2 47    # full frames at given seconds
  python3 render.py video            # final mp4
Sources: FOOTAGE -> folder with v1.mp4 … v19.mp4 (renamed from "Newark Museum 10 8 26 - videos_N.MP4"),
         PHOTOS -> folder with IMG_5220.JPG … (the photo zip, as-is).
"""
import math
import os
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import coin

HERE = os.path.dirname(os.path.abspath(__file__))
FOOTAGE = os.environ.get('FOOTAGE', os.path.join(HERE, 'footage'))
CACHE = os.environ.get('CACHE', os.path.join(HERE, 'cache'))
OUT = os.path.join(HERE, 'output')

W, H, FPS = 1080, 1920, 30
BEAT = 15                       # frames per beat: 120 BPM, so a track at 120 (or 60/240) lands on the cuts
RED = (238, 56, 58)

# the hexagon window, at rest: the logo's own outline, centred a little above the middle
WW = 760
WH = round(WW * 535 / 514 / 2) * 2
CX, CY = W / 2, 860
HEX = [(.5, 0), (1, .249), (.993, .754), (.5, 1), (0, .748), (0, .249)]   # measured off the logo

# cached shot sizes: a little bigger than what's shown, room for drift
FMARGIN, HMARGIN = 1.08, 1.12
FCW, FCH = round(W * FMARGIN / 2) * 2, round(H * FMARGIN / 2) * 2
HCW, HCH = round(WW * HMARGIN / 2) * 2, round(WH * HMARGIN / 2) * 2

SWAP = 8                        # frames for the hexagon to collapse in / blow out

# ── shot list ───────────────────────────────────────────────────────────────────────────────────
# Rules for this cut: every fixed-camera timelapse appears once; a handheld clip comes back only for a
# different moment; every chapter runs in clock order, so the time stamp in the corner only moves forward.
# Full screen (F) is for people at work; the hexagon (X) gets the wide shots of the room.
# Photo bursts play as stop-motion (a new frame every `step` video frames).
F, X = 'F', 'X'
TIMELAPSE_RATIO = 15            # the tripod timelapses shoot one frame every 0.5s, played at 30fps
REALTIME = {'v3', 'v11', 'v17', 'v18'}
# clip start times, Eastern (the cameras stamp UTC; these match the photo EXIF clock)
CLIP_START = {'v1': '10:39:27', 'v2': '10:33:57', 'v3': '10:55:57', 'v4': '11:03:44', 'v5': '11:42:27',
              'v6': '11:58:39', 'v7': '12:16:18', 'v8': '12:30:52', 'v9': '12:44:00', 'v10': '12:55:11',
              'v11': '19:18:22', 'v12': '19:23:27', 'v13': '19:37:28', 'v14': '19:47:56', 'v15': '19:58:18',
              'v16': '20:10:23', 'v17': '20:21:24', 'v18': '20:23:42', 'v19': '20:29:44'}


def V(src, start, speed, beats, fx=.5, mode=F):
    return dict(kind='v', src=src, start=start, speed=speed, beats=beats, fx=fx, mode=mode)


def P(ids, beats, fx=.5, mode=F, step=4, bounce=True):
    """A photo burst played as stop-motion: a new frame every `step` video frames, bouncing back and forth
    (or holding the last frame). Photos never appear on their own."""
    ids = ids.split()
    assert len(ids) >= 3, 'photos only as stop-motion'
    return dict(kind='p', ids=ids, beats=beats, fx=fx, mode=mode, step=step, bounce=bounce)


def burst_index(s, i):
    k, n = i // s['step'], len(s['ids'])
    if not s['bounce']:
        return min(n - 1, k)
    k %= 2 * n - 2
    return k if k < n else 2 * n - 2 - k


def XF(a, b, beats, mode=X):
    """Dissolve from a to b over the middle of the shot."""
    for s in (a, b):
        s.update(beats=beats, mode=mode)
    return dict(kind='x', a=a, b=b, beats=beats, mode=mode)


CHAPTERS = [
    ('NEWARK MUSEUM', 'of art  ·  10.08.26', [
        V('v18', 1.0, 1, 8, mode=X),                     # opens on the logo, then the disco-ball arch
    ]),
    ('LOAD IN', '01  ·  trucks, truss and cases', [
        V('v2', 2.0, 6, 2, .45),
        P('5224 5225 5226', 2),
        P('5276 5277 5278 5279', 2),
        P('5280 5281 5282', 2, .45),
        P('5289 5290 5291', 2, .5),
        P('5308 5309 5310 5311 5312', 2),
        P('5318 5319 5320 5321 5322', 2, .5),
        V('v1', 13.0, 3, 2, .5),
        P('5333 5334 5335', 2, .45),
        P('5340 5341 5342', 2),
        V('v3', 108.0, 1, 2),
        V('v3', 120.5, 1, 2),
        V('v3', 142.0, 1, 3),
        V('v3', 150.0, 1, 2),
    ]),
    ('THE BUILD', '02  ·  audio, video and staging', [
        V('v4', 0.0, 6, 4, mode=X),
        P('5371 5372 5373 5374', 2),
        P('5375 5376 5377 5378 5379 5380', 2, .5),
        P('5388 5389 5390 5391', 2),
        P('5398 5399 5400 5401', 2),
        P('5409 5410 5411 5412 5413 5414 5415', 3),
        P('5423 5424 5426 5427 5428', 3),                # 11:52, the disco ball goes up
        P('5429 5430 5431 5432 5433 5434 5435', 3, .5),
        V('v6', 28.0, 4, 2, .55),
        V('v7', 0.0, 10, 3),
        V('v8', 0.0, 10, 3, .55),
        V('v10', 0.0, 8, 3, .4),
    ]),
    ('LIGHTS UP', '03  ·  lighting and front of house', [
        P('5440 5441 5443 5444', 4, mode=X, step=9, bounce=False),   # 7:14 pm, the hall dark, then lit
        V('v11', 1.0, 1, 2, .35),
        V('v11', 9.0, 1, 2, .5),
        V('v11', 16.6, 1, 2, .72),
        V('v12', 0.0, 5, 4, .5),
        V('v13', 0.0, 5, 4),
    ]),
    ('THE NIGHT', '04  ·  showtime', [
        V('v14', 0.0, 6, 4, mode=X),
        V('v15', 0.0, 10, 3, .5),
        V('v16', 0.0, 8, 3, .45),
        P('5473 5474 5475 5478 5479', 3),
        P('5487 5488 5489', 2),
        P('5505 5506 5507', 2),
        P('5513 5514 5515 5516 5517 5518', 3),
        V('v17', 0.5, 1, 2, .6),
        V('v17', 15.0, 1, 2, .5),
        V('v17', 33.0, 1, 2, .5),
        V('v17', 70.0, 1, 2, .5),
        V('v18', 12.0, 1, 2, .55),
        V('v18', 80.0, 1, 2, .5),
        V('v18', 135.5, 1, 2, .5),
        V('v19', 34.8, 1, 3, .05),                       # the Hellhound jacket on the floor
    ]),
]
OUTRO = ('HELLHOUND AUDIO', 'audio  ·  lighting  ·  video  ·  staging', 16)
LOGO_IN = 1.4                   # seconds the opening hexagon shows the logo before the footage


def label(s):
    if s['kind'] == 'x':
        return f"{label(s['a'])}>{label(s['b'])}"
    return s['src'] if s['kind'] == 'v' else 'P' + '+'.join(s['ids'])


def timeline():
    shots, chapters, f = [], [], 0
    for ci, (title, sub, lst) in enumerate(CHAPTERS):
        chapters.append((f, title, sub))
        for s in lst:
            n = s['beats'] * BEAT
            shots.append(dict(s, idx=len(shots), ch=ci, f0=f, n=n, label=label(s)))
            f += n
    outro0 = f
    chapters.append((f, OUTRO[0], OUTRO[1]))
    chapters.append((f + round(3.4 * FPS), OUTRO[0], 'scan  ·  hellhoundaudio.com'))
    return shots, chapters, outro0, f + OUTRO[2] * BEAT


SHOTS, CHAPS, OUTRO0, TOTAL = timeline()


# ── the clock ───────────────────────────────────────────────────────────────────────────────────
def _secs(hms):
    h, m, s = (int(x) for x in hms.split(':'))
    return h * 3600 + m * 60 + s


_EXIF = {}


def photo_time(pid):
    if pid not in _EXIF:
        ex = Image.open(photo_path(pid))._getexif() or {}
        _EXIF[pid] = _secs(ex.get(36867, '2026:10:08 00:00:00')[11:19])
    return _EXIF[pid]


def clock(s, i):
    """Seconds since midnight (Eastern) at frame i of shot s."""
    if s['kind'] == 'x':
        return clock(s['a'] if i < s['n'] // 2 else s['b'], i)
    if s['kind'] == 'p':
        return photo_time(s['ids'][burst_index(s, i)])
    ratio = 1 if s['src'] in REALTIME else TIMELAPSE_RATIO
    return _secs(CLIP_START[s['src']]) + (s['start'] + i / FPS * s['speed']) * ratio


def clock_text(sec):
    h, m = int(sec // 3600), int(sec % 3600 // 60)
    return f"{(h - 1) % 12 + 1}:{m:02d} {'am' if h < 12 else 'pm'}"


# ── shot cache ──────────────────────────────────────────────────────────────────────────────────
PHOTOS = os.environ.get('PHOTOS', os.path.join(HERE, 'photos'))


def photo_path(pid):
    return os.path.join(PHOTOS, f'IMG_{pid}.JPG')


def size_for(mode):
    return (FCW, FCH) if mode == F else (HCW, HCH)


GRADE = 'eq=contrast=1.06:saturation=1.12:gamma=0.97'


def cache_path(job):
    if job[0] == 'v':
        _, src, start, speed, n, fx, mode = job
        return os.path.join(CACHE, f'{mode}_{src}_{start:.2f}_{speed}_{n}_{fx:.2f}.mp4')
    _, pid, fx, mode = job
    return os.path.join(CACHE, f'{mode}_P{pid}_{fx:.2f}.png')


def cut(job):
    out = cache_path(job)
    if os.path.exists(out):
        return out
    if job[0] == 'v':
        _, src, start, speed, n, fx, mode = job
        cw, ch = size_for(mode)
        need = n / FPS * speed + 1
        vf = (f'setpts=(PTS-STARTPTS)/{speed},fps={FPS},'
              f'scale={cw}:{ch}:force_original_aspect_ratio=increase:flags=lanczos,'
              f'crop={cw}:{ch}:(iw-{cw})*{fx}:(ih-{ch})/2,{GRADE}')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', str(need),
                        '-i', os.path.join(FOOTAGE, src + '.mp4'), '-an', '-vf', vf, '-frames:v', str(n),
                        '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', '-pix_fmt', 'yuv420p', out + '.tmp.mp4'],
                       check=True)
        os.rename(out + '.tmp.mp4', out)
    else:
        _, pid, fx, mode = job
        cw, ch = size_for(mode)
        # ffmpeg applies the EXIF rotation and the same grade as the footage
        vf = (f'scale={cw}:{ch}:force_original_aspect_ratio=increase:flags=lanczos,'
              f'crop={cw}:{ch}:(iw-{cw})*{fx}:(ih-{ch})/2,{GRADE}')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', photo_path(pid), '-vf', vf, '-frames:v', '1',
                        out + '.tmp.png'], check=True)
        os.rename(out + '.tmp.png', out)
    return out


def _jobs_for(s):
    if s['kind'] == 'x':
        return _jobs_for(dict(s['a'], n=s['n'])) + _jobs_for(dict(s['b'], n=s['n']))
    if s['kind'] == 'v':
        return [('v', s['src'], s['start'], s['speed'], s['n'], s['fx'], s['mode'])]
    return [('p', pid, s['fx'], s['mode']) for pid in s['ids']]


def jobs():
    return [j for s in SHOTS for j in _jobs_for(s)]


def read_frames(path, n, mode):
    cw, ch = size_for(mode)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.uint8)
    got = len(a) // (cw * ch * 3)
    a = a[:got * cw * ch * 3].reshape(got, ch, cw, 3)
    if got < n:   # short source: hold the last frame
        a = np.concatenate([a, np.repeat(a[-1:], n - got, 0)])
    return a


def shot_frames(s):
    """A list of n frames (photos share one array per still, so this stays light)."""
    if s['kind'] == 'v':
        return read_frames(cache_path(_jobs_for(s)[0]), s['n'], s['mode'])
    if s['kind'] == 'p':
        stills = [np.asarray(Image.open(cache_path(j)).convert('RGB')) for j in _jobs_for(s)]
        return [stills[burst_index(s, i)] for i in range(s['n'])]
    a = shot_frames(dict(s['a'], n=s['n']))
    b = shot_frames(dict(s['b'], n=s['n']))
    out = []
    for i in range(s['n']):
        k = min(1, max(0, (i - 1.0 * BEAT) / (2.0 * BEAT)))
        k = k * k * (3 - 2 * k)
        out.append((np.asarray(a[i], np.float32) * (1 - k) + np.asarray(b[i], np.float32) * k).astype(np.uint8))
    return out


# ── drift ───────────────────────────────────────────────────────────────────────────────────────
MOVES = ['in', 'left', 'out', 'right', 'in', 'up']


def drift(img, s, i):
    """A moving view out of the oversized cached frame; constant speed whatever the shot length."""
    cw, ch = size_for(s['mode'])
    ow, oh = (W, H) if s['mode'] == F else (WW, WH)
    margin = FMARGIN if s['mode'] == F else HMARGIN
    mv = MOVES[s['idx'] % len(MOVES)]
    rate = 0.055 if s['kind'] == 'p' else (0.035 if s['mode'] == F else 0.07)   # stills drift a touch more
    span = min(margin - 1, rate * s['n'] / FPS + 0.01)
    u = i / s['n']
    z, dx, dy = margin, 0.0, 0.0
    if mv == 'in':
        z = margin - span + span * u
    elif mv == 'out':
        z = margin - span * u
    else:
        free = ((cw if mv != 'up' else ch) - (cw if mv != 'up' else ch) / margin) / 2
        d = free * (span / (margin - 1)) * (u - .5) * 2
        dx = {'left': -d, 'right': d}.get(mv, 0)
        dy = -d if mv == 'up' else 0
    vw, vh = cw / z, ch / z
    x0, y0 = cw / 2 + dx - vw / 2, ch / 2 + dy - vh / 2
    return Image.fromarray(img).resize((ow, oh), Image.BILINEAR, box=(x0, y0, x0 + vw, y0 + vh))


# ── the hexagon ─────────────────────────────────────────────────────────────────────────────────
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


def hex_pts(s):
    return [(CX + (px - .5) * WW * s, CY + (py - .5) * WH * s) for px, py in HEX]


def hex_sdf(s):
    """Signed distance (px) to the hexagon scaled by s about its centre: <0 inside."""
    p = hex_pts(s)
    d = np.full((H, W), -1e9, np.float32)
    for (x1, y1), (x2, y2) in zip(p, p[1:] + p[:1]):
        nx, ny = y2 - y1, -(x2 - x1)          # outward normal for a clockwise polygon
        ln = math.hypot(nx, ny)
        d = np.maximum(d, ((XX - x1) * nx + (YY - y1) * ny) / ln)
    return d


def s_full():
    """Smallest scale at which the hexagon covers the whole frame."""
    lo, hi = 1.0, 20.0
    corners = [(0, 0), (W, 0), (0, H), (W, H)]
    for _ in range(40):
        mid = (lo + hi) / 2
        p = hex_pts(mid)
        inside = all(all((x2 - x1) * (cy - y1) - (y2 - y1) * (cx - x1) >= 0
                         for (x1, y1), (x2, y2) in zip(p, p[1:] + p[:1])) for cx, cy in corners)
        lo, hi = (lo, mid) if inside else (mid, hi)
    return hi * 1.02


SFULL = s_full()


def ease_in(u):
    return u ** 3


def ease_out(u):
    return 1 - (1 - u) ** 3


def zoom_about_centre(im, k):
    """Scale a full frame by k about the hexagon centre (k<1 shrinks it into the window)."""
    return im.transform((W, H), Image.AFFINE, (1 / k, 0, CX - CX / k, 0, 1 / k, CY - CY / k), Image.BILINEAR)


# ── static layers ───────────────────────────────────────────────────────────────────────────────
FONT = os.path.join(HERE, 'brand', 'HellhoundAudio.ttf')
TITLE_Y = 1440
BAR_Y = 1700
COIN = 156


def text_layer(title, sub):
    """Bottom-left title block, the Canvas's track-name slot. The marked-caps "I" is the logo's bolt: red."""
    im = Image.new('RGBA', (W, 240))
    d = ImageDraw.Draw(im)
    room = W - 72 * 2 - (0 if title == OUTRO[0] else COIN + 40)
    size = 76
    while size > 40 and sum(ImageFont.truetype(FONT, size).getlength(c) + 6 for c in title) > room:
        size -= 2
    ft, fs = ImageFont.truetype(FONT, size), ImageFont.truetype(FONT, 30)
    x = 72
    for ch in title:
        d.text((x, 116 - size), ch, font=ft, fill=RED if ch == 'I' else (245, 243, 240))
        x += ft.getlength(ch) + 6
    d.text((74, 150), sub, font=fs, fill=(196, 192, 186))
    return im


def scrims():
    """Dark gradients top and bottom so the type reads over full-screen footage."""
    y = np.arange(H, dtype=np.float32)[:, None, None]
    top = np.clip(1 - y / 380, 0, 1) ** 1.4 * 0.72
    bot = np.clip((y - 1180) / (H - 1180), 0, 1) ** 1.3 * 0.82
    return 1 - np.maximum(top, bot)


class Look:
    def __init__(self):
        self.scrim = scrims()
        w = Image.open(os.path.join(HERE, 'brand', 'word_white.png'))
        self.word = w.resize((300, round(w.height * 300 / w.width)), Image.LANCZOS)
        self.titles = [text_layer(t, s) for _, t, s in CHAPS]
        self.coin_f, self.coin_b = coin.faces(COIN)
        mark = Image.open(os.path.join(HERE, 'brand', 'mark.png')).convert('RGBA')
        self.mark = mark.resize((WW, WH), Image.LANCZOS)
        self.qr = coin.faces(round(WW * 0.8))[1]
        # outro backdrop: the logo blown up and blurred into red/black bands
        big = Image.new('RGB', (W, H), (10, 10, 12))
        m = mark.resize((W * 3, round(W * 3 * mark.height / mark.width)), Image.LANCZOS)
        big.paste(m, ((W - m.width) // 2, (H - m.height) // 2), m)
        self.logo_bg = np.asarray(big.filter(ImageFilter.GaussianBlur(28)), np.float32) * 0.42
        sd = hex_sdf(1.0)
        self.win_mask = np.clip(0.5 - sd, 0, 1)[..., None]
        self.win_stroke = np.clip(1.6 - np.abs(sd + 1.2), 0, 1)[..., None]
        rng = np.random.default_rng(7)
        self.grain = [rng.normal(0, 4.5, (H // 2, W // 2, 1)).astype(np.float32) for _ in range(8)]

    def chapter_at(self, f):
        return max(i for i, (f0, *_r) in enumerate(CHAPS) if f >= f0)

    def ui(self, f, clk=None):
        t = f / FPS
        im = Image.new('RGBA', (W, H))
        im.alpha_composite(self.word, (72, 120))
        d = ImageDraw.Draw(im)
        fs = ImageFont.truetype(FONT, 24)
        if clk is not None:     # camcorder-style time stamp: the day, ticking forward
            ft = ImageFont.truetype(FONT, 28)
            txt = clock_text(clk)
            tw = ft.getlength(txt)
            d.text((W - 70, 126), txt, font=ft, fill=(0, 0, 0, 150), anchor='ra')
            d.text((W - 72, 124), txt, font=ft, fill=(240, 236, 230), anchor='ra')
            d.ellipse((W - 72 - tw - 30, 130, W - 72 - tw - 16, 144), fill=RED + (255,))

        k = self.chapter_at(f)
        dt = (f - CHAPS[k][0]) / FPS
        e = min(1, dt / 0.35) if (k == 0 or CHAPS[k][1] != CHAPS[k - 1][1]) else 1
        e = 1 - (1 - e) ** 3
        layer = self.titles[k]
        if e < 1:
            a = np.asarray(layer).copy()
            a[..., 3] = (a[..., 3] * e).astype(np.uint8)
            layer = Image.fromarray(a)
        im.alpha_composite(layer, (0, TITLE_Y + round((1 - e) * 24)))

        x0, x1 = 72, W - 72
        p = f / (TOTAL - 1)
        d.line((x0, BAR_Y, x1, BAR_Y), fill=(255, 255, 255, 70), width=4)
        d.line((x0, BAR_Y, x0 + (x1 - x0) * p, BAR_Y), fill=(245, 243, 240, 255), width=4)
        for f0, *_r in CHAPS[1:len(CHAPTERS)]:
            xt = x0 + (x1 - x0) * f0 / (TOTAL - 1)
            d.rectangle((xt - 1, BAR_Y - 7, xt + 1, BAR_Y + 7), fill=RED + (255,))
        hx = x0 + (x1 - x0) * p
        d.ellipse((hx - 9, BAR_Y - 9, hx + 9, BAR_Y + 9), fill=(255, 255, 255, 255))
        mm = lambda s: f'{int(s // 60)}:{int(s % 60):02d}'
        d.text((x0, BAR_Y + 22), mm(t), font=fs, fill=(190, 186, 180))
        d.text((x1, BAR_Y + 22), mm(TOTAL / FPS), font=fs, fill=(190, 186, 180), anchor='ra')

        fade = 1 - min(1, max(0, (f - OUTRO0) / 12))
        if fade > 0:
            c = coin.frame(self.coin_f, self.coin_b, t)
            if fade < 1:
                a = np.asarray(c).copy()
                a[..., 3] = (a[..., 3] * fade).astype(np.uint8)
                c = Image.fromarray(a)
            im.alpha_composite(c, (W - 72 - COIN, TITLE_Y + 38))
        return im


LOOK = None


# ── compositing ─────────────────────────────────────────────────────────────────────────────────
def blurred(img):
    """Full-frame, heavily blurred, darkened copy of a picture: the field around the hexagon."""
    small = img.resize((W // 24, H // 24), Image.BILINEAR, reducing_gap=2.0)
    return np.asarray(small.resize((W, H), Image.BICUBIC), np.float32) * 0.45


def window(pic_win, bg):
    """Hexagon at rest: window-sized picture inside, blurred field around, thin red edge."""
    out = bg.copy()
    reg = (slice(round(CY - WH / 2), round(CY - WH / 2) + WH), slice(round(CX - WW / 2), round(CX - WW / 2) + WW))
    full = np.zeros((H, W, 3), np.float32)
    full[reg] = np.asarray(pic_win, np.float32)
    m = LOOK.win_mask
    out = out * (1 - m) + full * m
    st = LOOK.win_stroke * 0.85
    return out * (1 - st) + np.array(RED, np.float32) * st


def moving_hex(pic_full, s):
    """Hexagon at scale s (1 = at rest, SFULL = past the frame edges) holding a full-screen picture
    shrunk with it, so the shot itself flies into / out of the window."""
    k = min(1.0, max(WW / W, WH / H) * s)    # the shot always fills the hexagon, and is 1:1 once it covers the frame
    inner = np.asarray(zoom_about_centre(pic_full, k), np.float32)
    bg = blurred(pic_full)
    sd = hex_sdf(s)
    m = np.clip(0.5 - sd, 0, 1)[..., None]
    st = np.clip(1.6 - np.abs(sd + 1.2), 0, 1)[..., None] * 0.85
    out = bg * (1 - m) + inner * m
    return out * (1 - st) + np.array(RED, np.float32) * st


class Frames:
    """Holds the decoded frames of the shot(s) in use."""
    def __init__(self):
        self.c = {}

    def get(self, s):
        if s['idx'] not in self.c:
            if len(self.c) > 2:
                self.c.pop(min(self.c))
            self.c[s['idx']] = shot_frames(s)
        return self.c[s['idx']]


def shot_at(f):
    return next(s for s in SHOTS if s['f0'] <= f < s['f0'] + s['n'])


def picture(f, fr):
    """The picture layer (no UI) at frame f."""
    if f >= OUTRO0:
        return outro(f, fr)
    s = shot_at(f)
    i = f - s['f0']
    pic = drift(fr.get(s)[i], s, i)
    prev = SHOTS[s['idx'] - 1] if s['idx'] else None
    nxt = SHOTS[s['idx'] + 1] if s['idx'] + 1 < len(SHOTS) else None

    if s['mode'] == X:
        if i < SWAP and prev is not None and prev['mode'] == F:
            # collapse: the last full-screen frame shrinks into the hexagon
            u = ease_out((i + 1) / SWAP)
            last = drift(fr.get(prev)[-1], prev, prev['n'] - 1)
            return moving_hex(last, SFULL + (1 - SFULL) * u)
        if s['idx'] == 0:
            return opening(f, pic)
        return window(pic, blurred(pic))

    # full screen
    if prev is not None and prev['mode'] == X and i < SWAP:
        u = ease_in((i + 1) / SWAP)     # blow out: this shot grows from the window to the frame
        return moving_hex(pic, 1 + (SFULL - 1) * u)
    if nxt is None and i >= s['n'] - SWAP:
        pass                            # last shot: the outro does the collapse
    return np.asarray(pic, np.float32)


def opening(f, pic):
    """Logo in the hexagon, which dissolves into the first shot."""
    t = f / FPS
    u = min(1, max(0, (t - LOGO_IN) / 0.6))
    u = u * u * (3 - 2 * u)
    win = np.asarray(pic, np.float32)
    mk = np.asarray(LOOK.mark, np.float32)
    a = mk[..., 3:] / 255
    logo = np.full_like(win, 10) * (1 - a) + mk[..., :3] * a
    mixed = Image.fromarray((logo * (1 - u) + win * u).astype(np.uint8))
    bg = blurred(pic) * u + LOOK.logo_bg * (1 - u)
    out = window(mixed, bg)
    return out * min(1, f / 10)


def outro(f, fr):
    """Last shot collapses into the hexagon, becomes the logo, spins to the QR."""
    i = f - OUTRO0
    t = i / FPS
    last_s = SHOTS[-1]
    last = drift(fr.get(last_s)[-1], last_s, last_s['n'] - 1)
    if i < SWAP:
        return moving_hex(last, SFULL + (1 - SFULL) * ease_out((i + 1) / SWAP))
    u = min(1, max(0, (t - SWAP / FPS) / 0.7))
    u = u * u * (3 - 2 * u)
    rest = moving_hex(last, 1.0)                     # the last shot, at rest in the window
    empty = LOOK.logo_bg * (1 - LOOK.win_mask) + 10 * LOOK.win_mask
    out = rest * (1 - u) + empty * u

    spin = coin._inout((t - 3.4) / 1.4) * 540
    c = math.cos(math.radians(spin + math.sin(t * 1.1) * 4))
    face = LOOK.mark if c >= 0 else LOOK.qr
    w = max(1, round(face.width * abs(c)))
    sq = face.resize((w, face.height), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H))
    canvas.alpha_composite(sq, (round(CX - w / 2), round(CY - face.height / 2 + math.sin(t * 1.5) * 6)))
    a = np.asarray(canvas, np.float32)
    al = a[..., 3:] / 255 * u
    return out * (1 - al) + a[..., :3] * al


def grade(x):
    """One warm, slightly faded look over footage and photos alike: lifted blacks, warm highlights, soft bloom."""
    small = Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).resize((W // 12, H // 12), Image.BILINEAR)
    s = np.clip(np.asarray(small, np.float32) - 150, 0, None)
    bloom = np.asarray(Image.fromarray(s.astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32)
    x = 12 + x * 0.93 + bloom * 0.35
    return x * np.array([1.03, 1.0, 0.95], np.float32)


def clock_at(f):
    if f < CHAPS[1][0] or f >= OUTRO0:
        return None
    s = shot_at(f)
    return clock(s, f - s['f0'])


def frame(f, fr):
    global LOOK
    if LOOK is None:
        LOOK = Look()
    out = grade(picture(f, fr))
    out = out * LOOK.scrim
    out = out + np.repeat(np.repeat(LOOK.grain[f % 8], 2, 0), 2, 1)
    ui = np.asarray(LOOK.ui(f, clock_at(f)), np.float32)
    a = ui[..., 3:] / 255
    out = out * (1 - a) + ui[..., :3] * a
    return np.clip(out, 0, 255).astype(np.uint8)


def render_range(args):
    a, b, path = args
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '17',
                            '-preset', 'medium', '-pix_fmt', 'yuv420p', '-threads', '2', path], stdin=subprocess.PIPE)
    fr = Frames()
    for f in range(a, b):
        enc.stdin.write(frame(f, fr).tobytes())
        if (f - a) % 150 == 0:
            print(f'  {os.path.basename(path)} {f - a}/{b - a}', flush=True)
    enc.stdin.close()
    enc.wait()
    return path


def main():
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'video'
    if cmd == 'cache':
        js = jobs()
        with ProcessPoolExecutor(3) as ex:
            for i, p in enumerate(ex.map(cut, js)):
                print(f'{i + 1}/{len(js)} {os.path.basename(p)}', flush=True)
    elif cmd == 'board':
        tw, th = 108, 192
        rows = []
        for s in SHOTS:
            fr = shot_frames(s)
            ims = []
            for i in (0, len(fr) // 2, len(fr) - 1):
                im = drift(fr[i], s, i)
                if s['mode'] == X:
                    pad = Image.new('RGB', (W, H), (40, 0, 0))
                    pad.paste(im, (round(CX - WW / 2), round(CY - WH / 2)))
                    im = pad
                ims.append(im.resize((tw, th)))
            row = Image.new('RGB', (tw * 3 + 6, th + 18), (0, 0, 0))
            for j, im in enumerate(ims):
                row.paste(im, (j * (tw + 3), 18))
            ImageDraw.Draw(row).text((2, 2), f"{s['idx']} {s['label']} {s['mode']} {clock_text(clock(s, 0))}", fill='yellow')
            rows.append(row)
        cols = 8
        rw, rh = rows[0].size
        sheet = Image.new('RGB', (rw * cols + 8 * cols, rh * math.ceil(len(rows) / cols)), (20, 20, 20))
        for i, r in enumerate(rows):
            sheet.paste(r, ((rw + 8) * (i % cols), rh * (i // cols)))
        sheet.save(os.path.join(OUT, 'board.jpg'), quality=85)
    elif cmd == 'stills':
        fr = Frames()
        for t in sys.argv[2:]:
            Image.fromarray(frame(round(float(t) * FPS), fr)).save(os.path.join(OUT, f'still_{t}.jpg'), quality=90)
    else:
        n = 4
        parts = [(TOTAL * i // n, TOTAL * (i + 1) // n, os.path.join(CACHE, f'part{i}.mp4')) for i in range(n)]
        with ProcessPoolExecutor(n) as ex:
            paths = list(ex.map(render_range, parts))
        lst = os.path.join(CACHE, 'parts.txt')
        with open(lst, 'w') as fh:
            fh.writelines(f"file '{p}'\n" for p in paths)
        final = os.path.join(OUT, 'master.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy',
                        '-movflags', '+faststart', final], check=True)
        print(final, TOTAL / FPS, 's')


if __name__ == '__main__':
    main()
