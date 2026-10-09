"""Newark Museum of Art, 10.08.26 — Hellhound Audio event recap (1080x1920, 30fps, 90s).

Look borrowed from the Spotify Canvas of Tycho's "Dive": one fixed window on a dark field, footage
drifting inside it, hard cuts on the beat. The window is the logo's own hexagon (its alpha), so the
ending can turn the window into the logo, which then flips to the QR code.

usage:
  python3 render.py cache            # cut every shot out of the source footage (slow, once)
  python3 render.py board            # storyboard: one still per shot
  python3 render.py stills 3.2 47    # full frames at given seconds
  python3 render.py video            # final mp4
Sources: FOOTAGE env var -> folder with v1.mp4 … v19.mp4 (renamed from "Newark Museum 10 8 26 - videos_N.MP4").
"""
import math
import os
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import coin

HERE = os.path.dirname(os.path.abspath(__file__))
FOOTAGE = os.environ.get('FOOTAGE', os.path.join(HERE, 'footage'))
CACHE = os.environ.get('CACHE', os.path.join(HERE, 'cache'))
OUT = os.path.join(HERE, 'output')

W, H, FPS = 1080, 1920, 30
BEAT = 15                       # frames per beat: 120 BPM, so a track at 120 (or 60/240) lands on the cuts
RED = (238, 56, 58)
INK = (10, 10, 12)

# window: the logo's hexagon, 900 wide, sitting a little above centre like the Canvas triangle
WW = 900
WH = round(WW * 535 / 514)      # 937 → keep even
WH += WH % 2
WX, WY = (W - WW) // 2, 330
MARGIN = 1.12                   # cached shots are 12% bigger than the window, room for drift
CW, CH = round(WW * MARGIN / 2) * 2, round(WH * MARGIN / 2) * 2

# ── shot list ───────────────────────────────────────────────────────────────────────────────────
# (source, start s, speed, beats, focus x 0..1).  Timelapses run at 6-12x, real-time clips at 1x.
CHAPTERS = [
    ('NEWARK MUSEUM', 'of art  ·  10.08.26', [
        ('v18', 1.0, 1, 4, .5),
        ('v12', 4.0, 10, 4, .5),
    ]),
    ('LOAD IN', '01  ·  trucks, truss and cases', [
        ('v1', 2.0, 6, 3, .55),
        ('v2', 2.0, 6, 2, .5),
        ('v1', 17.0, 4, 2, .45),
        ('v2', 9.0, 4, 2, .45),
        ('v3', 108.0, 1, 2, .5),
        ('v2', 17.0, 4, 2, .55),
        ('v3', 116.0, 1, 2, .5),
        ('v1', 28.0, 4, 2, .4),
        ('v3', 132.0, 1, 2, .5),
        ('v3', 120.5, 1, 2, .5),
        ('v3', 140.0, 1, 3, .5),
    ]),
    ('THE BUILD', '02  ·  audio, video and staging', [
        ('v4', 0.0, 10, 4, .5),
        ('v3', 16.0, 1, 2, .5),
        ('v5', 0.0, 10, 3, .45),
        ('v3', 80.0, 1, 2, .5),
        ('v6', 0.0, 10, 4, .4),
        ('v3', 148.0, 1, 2, .5),
        ('v8', 0.0, 10, 3, .6),
        ('v9', 5.0, 10, 3, .55),
        ('v3', 56.0, 1, 2, .5),
        ('v10', 0.0, 8, 4, .35),
        ('v3', 152.0, 1, 2, .5),
        ('v7', 0.0, 10, 4, .5),
        ('v8', 20.0, 10, 2, .4),
        ('v3', 92.0, 1, 2, .5),
        ('v10', 12.0, 8, 3, .45),
        ('v6', 25.0, 10, 3, .55),
        ('v9', 25.0, 10, 3, .5),
    ]),
    ('LIGHTS UP', '03  ·  lighting and front of house', [
        ('xfade', ('v4', 10.0, 10), ('v12', 0.0, 10), 6, .5),   # same hall, daylight → purple
        ('v13', 0.0, 8, 3, .5),
        ('v11', 1.0, 1, 2, .5),
        ('v17', 15.0, 1, 2, .5),
        ('v12', 15.0, 10, 3, .5),
        ('v11', 9.0, 1, 3, .55),
        ('v17', 21.0, 1, 2, .4),
        ('v13', 20.0, 8, 3, .5),
        ('v17', 0.5, 1, 2, .6),
        ('v11', 15.5, 1, 2, .6),
        ('v12', 25.0, 10, 4, .5),
    ]),
    ('THE NIGHT', '04  ·  showtime', [
        ('v14', 0.0, 10, 5, .5),
        ('v18', 4.0, 1, 2, .5),
        ('v15', 0.0, 10, 3, .5),
        ('v18', 9.0, 1, 2, .6),
        ('v17', 30.0, 1, 2, .5),
        ('v16', 0.0, 10, 4, .5),
        ('v18', 22.0, 1, 2, .5),
        ('v17', 52.0, 1, 2, .5),
        ('v18', 76.0, 1, 2, .5),
        ('v19', 0.0, 10, 3, .5),
        ('v17', 60.0, 1, 2, .55),
        ('v18', 36.0, 1, 2, .6),
        ('v16', 20.0, 10, 3, .5),
        ('v18', 84.0, 1, 2, .5),
        ('v18', 120.0, 1, 2, .55),
        ('v17', 72.0, 1, 2, .5),
        ('v15', 20.0, 10, 3, .5),
        ('v18', 136.0, 1, 2, .55),
        ('v19', 33.0, 2, 5, .9),
        ('v17', 89.8, 1, 2, .3),
    ]),
]
OUTRO = ('HELLHOUND AUDIO', 'audio  ·  lighting  ·  video  ·  staging', 16)


def timeline():
    shots, chapters, f = [], [], 0
    for ci, (title, sub, lst) in enumerate(CHAPTERS):
        chapters.append((f, title, sub))
        for i, s in enumerate(lst):
            n = s[3] * BEAT
            shots.append(dict(idx=len(shots), ch=ci, f0=f, n=n, spec=s))
            f += n
    outro0 = f
    chapters.append((f, OUTRO[0], OUTRO[1]))
    chapters.append((f + round(3.4 * FPS), OUTRO[0], 'scan  ·  hellhoundaudio.com'))
    total = f + OUTRO[2] * BEAT
    return shots, chapters, outro0, total


SHOTS, CHAPS, OUTRO0, TOTAL = timeline()


# ── shot cache ──────────────────────────────────────────────────────────────────────────────────
def cache_path(src, start, speed, n, fx):
    return os.path.join(CACHE, f'{src}_{start:.2f}_{speed}_{n}_{fx:.2f}.mp4')


def cut(job):
    src, start, speed, n, fx = job
    out = cache_path(*job)
    if os.path.exists(out):
        return out
    need = n / FPS * speed + 1
    vf = (f'setpts=(PTS-STARTPTS)/{speed},fps={FPS},'
          f'scale={CW}:{CH}:force_original_aspect_ratio=increase:flags=lanczos,'
          f'crop={CW}:{CH}:(iw-{CW})*{fx}:(ih-{CH})/2,'
          'eq=contrast=1.06:saturation=1.12:gamma=0.97')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', str(need),
                    '-i', os.path.join(FOOTAGE, src + '.mp4'), '-an', '-vf', vf, '-frames:v', str(n),
                    '-c:v', 'libx264', '-crf', '12', '-preset', 'fast', '-pix_fmt', 'yuv420p', out + '.tmp.mp4'],
                   check=True)
    os.rename(out + '.tmp.mp4', out)
    return out


def jobs():
    out = []
    for s in SHOTS:
        sp = s['spec']
        if sp[0] == 'xfade':
            out += [(a[0], a[1], a[2], s['n'], sp[4]) for a in (sp[1], sp[2])]
        else:
            out.append((sp[0], sp[1], sp[2], s['n'], sp[4]))
    return out


def read_frames(path, n):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.uint8)
    got = len(a) // (CW * CH * 3)
    a = a[:got * CW * CH * 3].reshape(got, CH, CW, 3)
    if got < n:   # short source: hold the last frame
        a = np.concatenate([a, np.repeat(a[-1:], n - got, 0)])
    return a


def shot_frames(s):
    sp = s['spec']
    if sp[0] != 'xfade':
        return read_frames(cache_path(sp[0], sp[1], sp[2], s['n'], sp[4]), s['n'])
    a = read_frames(cache_path(*sp[1], s['n'], sp[4]), s['n']).astype(np.float32)
    b = read_frames(cache_path(*sp[2], s['n'], sp[4]), s['n']).astype(np.float32)
    k = np.clip((np.arange(s['n']) - 1.0 * BEAT) / (3.0 * BEAT), 0, 1)
    k = (k * k * (3 - 2 * k))[:, None, None, None]
    return (a * (1 - k) + b * k).astype(np.uint8)


# ── drift inside the window ─────────────────────────────────────────────────────────────────────
MOVES = ['in', 'left', 'out', 'right', 'in', 'up']


def drift(img, s, i):
    """Crop a moving view out of the 12%-oversized cached frame; constant speed across shots."""
    t = i / FPS
    mv = MOVES[s['idx'] % len(MOVES)]
    zmax = MARGIN
    span = min(MARGIN - 1, 0.07 * s['n'] / FPS + 0.02)     # how far this shot travels
    u = t / (s['n'] / FPS)
    z, dx, dy = zmax, 0.0, 0.0
    if mv == 'in':
        z = 1 + (MARGIN - 1 - span) + span * u
    elif mv == 'out':
        z = MARGIN - span * u
    else:
        free = (CW - CW / zmax) / 2 if mv in ('left', 'right') else (CH - CH / zmax) / 2
        d = free * (span / (MARGIN - 1)) * (u - .5) * 2
        dx = {'left': -d, 'right': d}.get(mv, 0)
        dy = -d if mv == 'up' else 0
    vw, vh = CW / z, CH / z
    cx, cy = CW / 2 + dx, CH / 2 + dy
    box = (cx - vw / 2, cy - vh / 2, cx + vw / 2, cy + vh / 2)
    return Image.fromarray(img).resize((WW, WH), Image.BILINEAR, box=box)


# ── static layers ───────────────────────────────────────────────────────────────────────────────
FONT = os.path.join(HERE, 'brand', 'HellhoundAudio.ttf')


def mask():
    a = Image.open(os.path.join(HERE, 'brand', 'mark.png')).split()[3]
    return np.asarray(a.resize((WW, WH), Image.LANCZOS), np.float32)[..., None] / 255


def background():
    y = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array([22, 21, 26]), np.array([9, 9, 11])
    bg = top * (1 - y) + bot * y
    yy, xx = np.mgrid[0:H, 0:W]
    v = 1 - 0.35 * (((xx - W / 2) / W) ** 2 + ((yy - H * .45) / H) ** 2) * 2
    return np.clip(bg * v[..., None], 0, 255).astype(np.float32)


def text_layer(title, sub, red_bolts=True):
    """Bottom-left title block, the Canvas's track-name slot."""
    im = Image.new('RGBA', (W, 240))
    d = ImageDraw.Draw(im)
    size = 76
    while size > 40 and sum(ImageFont.truetype(FONT, size).getlength(c) + 6 for c in title) > W - 72 * 2 - (0 if title == OUTRO[0] else COIN + 40):
        size -= 2
    ft = ImageFont.truetype(FONT, size)
    fs = ImageFont.truetype(FONT, 30)
    x = 72
    for ch in title:          # marked caps: "I" is the logo's thunderbolt — paint it red
        d.text((x, 116 - size), ch, font=ft, fill=RED if (ch == 'I' and red_bolts) else (245, 243, 240))
        x += ft.getlength(ch) + 6
    d.text((74, 150), sub, font=fs, fill=(170, 166, 160))
    return im


def wordmark():
    w = Image.open(os.path.join(HERE, 'brand', 'word_white.png'))
    s = 300 / w.width
    return w.resize((300, round(w.height * s)), Image.LANCZOS)


TITLE_Y = 1440
BAR_Y = 1700
COIN = 156


class Overlay:
    def __init__(self):
        self.mask = mask()
        self.bg = background()
        self.word = wordmark()
        self.titles = [text_layer(t, s) for _, t, s in CHAPS]
        self.coin_f, self.coin_b = coin.faces(COIN)
        big = round(WW * 0.72)
        self.big_f = Image.open(os.path.join(HERE, 'brand', 'mark.png')).convert('RGBA').resize((WW, WH), Image.LANCZOS)
        self.big_b = coin.faces(big)[1]
        rng = np.random.default_rng(7)
        self.grain = [rng.normal(0, 5.5, (H // 2, W // 2, 1)).astype(np.float32) for _ in range(8)]

    def chapter_at(self, f):
        k = 0
        for i, (f0, *_rest) in enumerate(CHAPS):
            if f >= f0:
                k = i
        return k

    def ui(self, f):
        """Everything drawn over the picture: wordmark, title, progress bar, coin."""
        t = f / FPS
        im = Image.new('RGBA', (W, H))
        im.alpha_composite(self.word, (72, 120))
        d = ImageDraw.Draw(im)
        fs = ImageFont.truetype(FONT, 24)
        d.text((W - 72, 128), 'event recap', font=fs, fill=(150, 146, 140), anchor='ra')

        k = self.chapter_at(f)
        dt = (f - CHAPS[k][0]) / FPS
        e = min(1, dt / 0.35) if CHAPS[k][1] != CHAPS[k - 1][1] else 1
        e = 1 - (1 - e) ** 3
        layer = self.titles[k]
        if e < 1:
            a = np.asarray(layer).copy()
            a[..., 3] = (a[..., 3] * e).astype(np.uint8)
            layer = Image.fromarray(a)
        im.alpha_composite(layer, (0, TITLE_Y + round((1 - e) * 24)))

        # progress bar with chapter ticks, Spotify-style
        x0, x1 = 72, W - 72
        p = f / (TOTAL - 1)
        d.line((x0, BAR_Y, x1, BAR_Y), fill=(255, 255, 255, 60), width=4)
        d.line((x0, BAR_Y, x0 + (x1 - x0) * p, BAR_Y), fill=(245, 243, 240, 255), width=4)
        for f0, *_r in CHAPS[1:len(CHAPTERS)]:
            xt = x0 + (x1 - x0) * f0 / (TOTAL - 1)
            d.rectangle((xt - 1, BAR_Y - 7, xt + 1, BAR_Y + 7), fill=RED + (255,))
        hx = x0 + (x1 - x0) * p
        d.ellipse((hx - 9, BAR_Y - 9, hx + 9, BAR_Y + 9), fill=(255, 255, 255, 255))
        mm = lambda s: f'{int(s // 60)}:{int(s % 60):02d}'
        d.text((x0, BAR_Y + 22), mm(t), font=fs, fill=(150, 146, 140))
        d.text((x1, BAR_Y + 22), mm(TOTAL / FPS), font=fs, fill=(150, 146, 140), anchor='ra')

        # corner coin: logo ⇄ QR; bows out as the window itself becomes the logo
        fade = 1 - min(1, max(0, (f - OUTRO0) / 12))
        if fade > 0:
            c = coin.frame(self.coin_f, self.coin_b, t)
            if fade < 1:
                a = np.asarray(c).copy()
                a[..., 3] = (a[..., 3] * fade).astype(np.uint8)
                c = Image.fromarray(a)
            im.alpha_composite(c, (W - 72 - COIN, TITLE_Y + 38))
        return im

    def outro(self, f, base):
        """Window → logo (same hexagon), hold, spin to a big QR, hold for scanning."""
        t = (f - OUTRO0) / FPS
        u = min(1, t / 1.0)
        u = u * u * (3 - 2 * u)
        spin = coin._inout((t - 3.4) / 1.4) * 540
        c = math.cos(math.radians(spin + math.sin(t * 1.1) * 4))
        face = self.big_f if c >= 0 else self.big_b
        w = max(1, round(face.width * abs(c)))
        sq = face.resize((w, face.height), Image.LANCZOS)
        canvas = Image.new('RGBA', (W, H))
        bob = round(math.sin(t * 1.5) * 6)
        canvas.alpha_composite(sq, ((W - w) // 2, WY + (WH - face.height) // 2 + bob))
        a = np.asarray(canvas, np.float32)
        al = a[..., 3:] / 255 * u
        return base * (1 - al) + a[..., :3] * al


OV = None


def frame(f, shot_cache):
    global OV
    if OV is None:
        OV = Overlay()
    out = OV.bg.copy()
    if f < OUTRO0:
        s = next(s for s in SHOTS if s['f0'] <= f < s['f0'] + s['n'])
        if s['idx'] not in shot_cache:
            shot_cache.clear()
            shot_cache[s['idx']] = shot_frames(s)
        i = f - s['f0']
        win = drift(shot_cache[s['idx']][i], s, i)
    else:   # outro: last shot keeps playing (frozen at its end) until the logo covers it
        s = SHOTS[-1]
        if s['idx'] not in shot_cache:
            shot_cache.clear()
            shot_cache[s['idx']] = shot_frames(s)
        win = drift(shot_cache[s['idx']][-1], s, s['n'] - 1)
    wa = np.asarray(win, np.float32)

    # ambient: the window's colours bled softly into the dark field
    amb = np.asarray(win.resize((6, 10), Image.BILINEAR).resize((W, H), Image.BICUBIC), np.float32)
    out += amb * 0.16

    # the hexagon window (with a quick fade-in at the very top)
    vis = min(1, f / 12) * (1 - min(1, max(0, (f - OUTRO0) / FPS)))
    m = OV.mask * vis
    reg = out[WY:WY + WH, WX:WX + WW]
    out[WY:WY + WH, WX:WX + WW] = reg * (1 - m) + wa * m

    if f >= OUTRO0:
        out = OV.outro(f, out)

    g = OV.grain[f % 8]
    out += np.repeat(np.repeat(g, 2, 0), 2, 1)
    ui = np.asarray(OV.ui(f), np.float32)
    a = ui[..., 3:] / 255
    out = out * (1 - a) + ui[..., :3] * a
    return np.clip(out, 0, 255).astype(np.uint8)


def render_range(args):
    a, b, path = args
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-crf', '17',
                            '-preset', 'medium', '-pix_fmt', 'yuv420p', '-threads', '2', path], stdin=subprocess.PIPE)
    sc = {}
    for f in range(a, b):
        enc.stdin.write(frame(f, sc).tobytes())
        if (f - a) % 150 == 0:
            print(f'  {path[-12:]} {f - a}/{b - a}', flush=True)
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
        tiles = []
        for s in SHOTS:
            fr = shot_frames(s)
            im = drift(fr[len(fr) // 2], s, len(fr) // 2).resize((225, 234))
            ImageDraw.Draw(im).text((6, 4), f"{s['idx']} {s['spec'][0]}", fill='yellow')
            tiles.append(im)
        cols = 10
        sheet = Image.new('RGB', (225 * cols, 234 * math.ceil(len(tiles) / cols)))
        for i, t in enumerate(tiles):
            sheet.paste(t, (225 * (i % cols), 234 * (i // cols)))
        sheet.save(os.path.join(OUT, 'board.jpg'), quality=85)
    elif cmd == 'stills':
        for t in sys.argv[2:]:
            Image.fromarray(frame(round(float(t) * FPS), {})).save(os.path.join(OUT, f'still_{t}.jpg'), quality=90)
    else:
        n = 4
        parts = [(TOTAL * i // n, TOTAL * (i + 1) // n, os.path.join(CACHE, f'part{i}.mp4')) for i in range(n)]
        with ProcessPoolExecutor(n) as ex:
            paths = list(ex.map(render_range, parts))
        lst = os.path.join(CACHE, 'parts.txt')
        with open(lst, 'w') as fh:
            fh.writelines(f"file '{p}'\n" for p in paths)
        final = os.path.join(OUT, 'hellhound-newark-museum-recap.mp4')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy',
                        '-movflags', '+faststart', final], check=True)
        print(final, TOTAL / FPS, 's')


if __name__ == '__main__':
    main()
