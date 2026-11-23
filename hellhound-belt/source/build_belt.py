"""Hellhound Audio championship belt: layered plate builder (PSD + PNG)."""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

SRC = sys.argv[1]       # folder holding the logo PNGs
OUT = sys.argv[2]
FONTS = sys.argv[3]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- helpers
def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255

def to_mask(im):
    return np.asarray(im, dtype=np.float32) / 255

def poly_mask(pts, size, rnd=0):
    im = Image.new("L", size, 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    if rnd:
        im = im.filter(ImageFilter.GaussianBlur(rnd)).point(lambda v: 255 if v > 127 else 0)
        im = im.filter(ImageFilter.GaussianBlur(1.2))
    return to_mask(im)

def inset(pts, d):
    pts = np.array(pts, float); n = len(pts)
    area = sum(pts[i][0]*pts[(i+1)%n][1] - pts[(i+1)%n][0]*pts[i][1] for i in range(n))
    s = 1 if area > 0 else -1
    lines = []
    for i in range(n):
        a, b = pts[i], pts[(i+1) % n]
        t = (b - a) / np.linalg.norm(b - a)
        nrm = np.array([-t[1], t[0]]) * s
        lines.append((a + nrm * d, t))
    out = []
    for i in range(n):
        (p1, t1), (p2, t2) = lines[i-1], lines[i]
        A = np.array([t1, -t2]).T
        k = np.linalg.solve(A, p2 - p1)
        out.append(p1 + t1 * k[0])
    return [tuple(p) for p in out]

def perimeter_points(pts, spacing):
    pts = list(pts) + [pts[0]]
    out, carry = [], 0.0
    for a, b in zip(pts[:-1], pts[1:]):
        a, b = np.array(a), np.array(b); L = np.linalg.norm(b - a)
        d = carry
        while d < L:
            out.append(a + (b - a) * d / L); d += spacing
        carry = d - L
    return out

def ramp(t, stops):
    t = np.clip(t, 0, 1)
    xs = np.array([s[0] for s in stops]); cs = np.array([s[1] for s in stops], float)
    return np.stack([np.interp(t, xs, cs[:, c]) for c in range(3)], -1)

GOLD = [(0, (58, 34, 6)), (.25, (122, 80, 18)), (.5, (201, 150, 48)),
        (.72, (240, 200, 98)), (.88, (255, 236, 160)), (1, (255, 252, 230))]
NICKEL = [(0, (40, 42, 46)), (.3, (98, 102, 110)), (.55, (168, 172, 180)),
          (.8, (222, 226, 232)), (1, (255, 255, 255))]
RUBY = [(0, (40, 0, 4)), (.35, (110, 6, 14)), (.6, (190, 22, 30)), (.85, (238, 58, 58)), (1, (255, 190, 180))]

def brushed(h, w, strength=0.05):
    n = rng.standard_normal((h, w)).astype(np.float32)
    k = 41
    c = np.cumsum(np.pad(n, ((0, 0), (k, 0))), axis=1)
    n = (c[:, k:] - c[:, :-k]) / k
    return n / (n.std() + 1e-6) * strength

def shade(mask, radius, stops, height=1.0, spec=0.6, tex=0.04, wave=0.12, bias=0.0):
    """Beveled metal: mask(float) -> RGBA uint8."""
    h, w = mask.shape
    H = blur(mask, radius) * mask * height
    gy, gx = np.gradient(H * radius * 2.2)
    N = np.stack([-gx, -gy, np.ones_like(H)], -1)
    N /= np.linalg.norm(N, axis=-1, keepdims=True)
    L = np.array([-0.45, -0.6, 0.66]); L /= np.linalg.norm(L)
    V = np.array([0, 0, 1.0]); Hh = (L + V) / np.linalg.norm(L + V)
    diff = np.clip(N @ L, 0, 1)
    sp = np.clip(N @ Hh, 0, 1) ** 40 * spec
    yy = np.linspace(0, 1, h)[:, None]
    env = wave * np.sin(yy * math.pi * 3.2 + 0.6)          # polished-metal banding
    t = 0.15 + 0.75 * diff + env + brushed(h, w, tex) + bias
    rgb = ramp(t, stops) + sp[..., None] * 255
    a = np.clip(mask, 0, 1)
    return rgba(rgb, a)

def rgba(rgb, a):
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(a, 0, 1) * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

def flat(color, mask):
    h, w = mask.shape
    return rgba(np.broadcast_to(np.array(color, float), (h, w, 3)).copy(), mask)

def enamel(mask, base, gloss=0.25):
    """Glassy filled enamel with inner shadow along the edges."""
    h, w = mask.shape
    inner = 1 - blur(mask, 18)
    yy = np.linspace(0, 1, h)[:, None]
    rgb = np.broadcast_to(np.array(base, float), (h, w, 3)).copy()
    rgb *= (1 - 0.55 * np.clip(inner * 2, 0, 1))[..., None]
    rgb += (gloss * 90 * np.clip(1 - yy * 2.2, 0, 1))[..., None]
    rgb += (rng.standard_normal((h, w)) * 3)[..., None]
    return rgba(rgb, mask)

def shadow(mask, r=25, dx=10, dy=18, op=0.65):
    m = np.roll(np.roll(blur(mask, r), dy, 0), dx, 1) * op
    return flat((0, 0, 0), m)

def text_mask(txt, font, size, canvas, center, tracking=0, var="Black"):
    f = ImageFont.truetype(font, size)
    try: f.set_variation_by_name(var)
    except Exception: pass
    widths = [f.getlength(c) for c in txt]
    total = sum(widths) + tracking * (len(txt) - 1)
    im = Image.new("L", canvas, 0); d = ImageDraw.Draw(im)
    x = center[0] - total / 2
    for c, wd in zip(txt, widths):
        d.text((x, center[1]), c, font=f, fill=255, anchor="lm"); x += wd + tracking
    return to_mask(im)

def paste_mask(src_mask, canvas, center, height=None, width=None):
    im = Image.fromarray((src_mask * 255).astype(np.uint8))
    sw, sh = im.size
    s = height / sh if height else width / sw
    im = im.resize((max(1, int(sw * s)), max(1, int(sh * s))), Image.LANCZOS)
    out = Image.new("L", canvas, 0)
    out.paste(im, (int(center[0] - im.width / 2), int(center[1] - im.height / 2)))
    return to_mask(out)

def over(*layers):
    base = layers[0].copy()
    for l in layers[1:]:
        base = Image.alpha_composite(base, l)
    return base

def engrave(lines_mask, clip):
    """Hand-cut engraving: dark cut + bright lip offset down-right."""
    m = lines_mask * clip
    dark = flat((48, 28, 4), m * 0.85)
    lip = flat((255, 240, 185), np.roll(np.roll(m, 3, 0), 3, 1) * clip * (1 - m) * 0.55)
    return over(lip, dark)

# ---------------------------------------------------------------- brand art (chopped from supplied logo)
logo = Image.open(os.path.join(SRC, "02-logo-stacked.png")).convert("RGBA")
bg = Image.new("RGBA", logo.size, (255, 255, 255, 255))
logo = Image.alpha_composite(bg, logo).convert("RGB")
L = np.asarray(logo, dtype=np.float32)
R, G, B = L[..., 0], L[..., 1], L[..., 2]
is_red = (R > 150) & (G < 120) & (B < 120)
is_dark = (R < 90) & (G < 90) & (B < 90)

# cube region (top) and wordmark region (bottom)
cube_rows = slice(150, 1440)
ys, xs = np.where((is_red | is_dark)[cube_rows])
cy0, cy1, cx0, cx1 = ys.min() + 150, ys.max() + 150, xs.min(), xs.max()
pad = 6
crop = (slice(cy0 - pad, cy1 + pad), slice(cx0 - pad, cx1 + pad))
cube_any = (is_red | is_dark)[crop]
# silhouette = everything not reachable from outside
sil = Image.fromarray(((~cube_any) * 255).astype(np.uint8)).copy()
ImageDraw.floodfill(sil, (0, 0), 128)
cube_sil = (np.asarray(sil) != 128).astype(np.float32)
cube_red = is_red[crop].astype(np.float32)
cube_dark = is_dark[crop].astype(np.float32)
cube_white = cube_sil * (1 - cube_any)

word_rows = slice(1500, 1880)
ys, xs = np.where((is_red | is_dark)[word_rows])
wy0, wy1, wx0, wx1 = ys.min() + 1500, ys.max() + 1500, xs.min(), xs.max()
wcrop = (slice(wy0 - 4, wy1 + 4), slice(wx0 - 4, wx1 + 4))
word_dark = is_dark[wcrop].astype(np.float32)
word_red = is_red[wcrop].astype(np.float32)
# split HELLHOUND / AUDIO lines
rows = word_dark.sum(1)
gap = [i for i in range(len(rows)) if rows[i] == 0 and 60 < i < len(rows) - 60]
split = gap[len(gap) // 2] if gap else len(rows) // 2
hell_m = word_dark[:split]; audio_m = word_dark[split:]; bolt_m = word_red[:, :]
ys, xs = np.where(bolt_m > 0)
bolt_m = bolt_m[ys.min() - 2:ys.max() + 3, xs.min() - 2:xs.max() + 3]
# Rebuild the bolt as a clean vector polygon (traced from the logo's 46x163px bolt), drawn at 24x
BOLT_PTS = [(41, 0), (28, 70), (43, 72), (9, 163), (18, 110), (0, 104)]
_S = 24
_bim = Image.new("L", (44 * _S, 164 * _S), 0)
ImageDraw.Draw(_bim).polygon([(x * _S, y * _S) for x, y in BOLT_PTS], fill=255)
bolt_m = to_mask(_bim)
def trim(m):
    ys, xs = np.where(m > 0); return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
hell_m = trim(hell_m); audio_full = trim(np.maximum(word_dark, word_red)[split - 40:])

CINZEL = os.path.join(FONTS, "Cinzel-var.ttf")
CINZEL_DEC = os.path.join(FONTS, "CinzelDecorative-Black.ttf")

# ---------------------------------------------------------------- shared plate builder
def jewel(canvas, c, r, stops=RUBY):
    W, Hh = canvas
    im = Image.new("L", canvas, 0)
    ImageDraw.Draw(im).ellipse([c[0]-r*1.35, c[1]-r*1.35, c[0]+r*1.35, c[1]+r*1.35], fill=255)
    bez_m = to_mask(im)
    im2 = Image.new("L", canvas, 0)
    # faceted stone: octagon
    pts = [(c[0] + r*math.cos(a), c[1] + r*math.sin(a)) for a in np.linspace(0, 2*math.pi, 9)[:-1] + math.pi/8]
    ImageDraw.Draw(im2).polygon(pts, fill=255)
    stone_m = to_mask(im2)
    return bez_m, stone_m

def gem_layers(canvas, centers, r):
    bez_all = np.zeros(canvas[::-1], np.float32); st_all = np.zeros_like(bez_all)
    for c in centers:
        b, s = jewel(canvas, c, r); bez_all = np.maximum(bez_all, b); st_all = np.maximum(st_all, s)
    bezel = shade(bez_all, r * 0.35, GOLD, spec=0.9)
    stone = shade(st_all, r * 0.55, RUBY, height=1.4, spec=1.2, tex=0.0, wave=0.05)
    # facet sparkle
    sp = np.zeros_like(st_all)
    for c in centers:
        im = Image.new("L", canvas, 0); d = ImageDraw.Draw(im)
        d.ellipse([c[0]-r*.55, c[1]-r*.62, c[0]-r*.1, c[1]-r*.25], fill=230)
        sp = np.maximum(sp, blur(to_mask(im), r * .08))
    spark = flat((255, 245, 245), sp * st_all)
    return over(shadow(bez_all, r*.25, r*.12, r*.2), bezel, stone), spark

def beads(canvas, path_pts, spacing, r):
    m = Image.new("L", canvas, 0); d = ImageDraw.Draw(m)
    for p in perimeter_points(path_pts, spacing):
        d.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=255)
    m = to_mask(m)
    return m

def sunburst(canvas, center, n, width):
    im = Image.new("L", canvas, 0); d = ImageDraw.Draw(im)
    R = max(canvas) * 1.2
    for i in range(n):
        a = 2 * math.pi * i / n
        d.line([center, (center[0] + R*math.cos(a), center[1] + R*math.sin(a))], fill=255, width=width)
    return to_mask(im)

def rings(canvas, center, r0, r1, step, width, squash=1.0):
    im = Image.new("L", canvas, 0); d = ImageDraw.Draw(im)
    r = r0
    while r < r1:
        d.ellipse([center[0]-r, center[1]-r*squash, center[0]+r, center[1]+r*squash], outline=255, width=width)
        r += step
    return to_mask(im)

def scroll_band(canvas, path_pts, spacing, size, width):
    """Repeating hand-engraved C-scrolls along a path (Millican/Crumrine-style)."""
    im = Image.new("L", canvas, 0); d = ImageDraw.Draw(im)
    pts = perimeter_points(path_pts, spacing)
    for i, p in enumerate(pts):
        flip = 1 if i % 2 else -1
        box = [p[0]-size, p[1]-size, p[0]+size, p[1]+size]
        d.arc(box, 200 if flip > 0 else 20, 340 if flip > 0 else 160, fill=255, width=width)
        s2 = size * 0.45
        d.arc([p[0]-s2, p[1]-s2, p[0]+s2, p[1]+s2], 0, 300, fill=255, width=max(2, width-1))
    return to_mask(im)

def strap_preview(canvas):
    W, H = canvas
    t = rng.standard_normal((H // 120 + 2, W // 120 + 2)).astype(np.float32)
    t = np.asarray(Image.fromarray(((t * 20) + 128).clip(0, 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    base = 14 + (t - .5) * 18
    rgb = np.dstack([base, base, base + 2])
    return rgba(rgb, np.ones((H, W)))

def guides(canvas, cut_pts, safe_pts):
    cut = Image.new("RGBA", canvas, (0, 0, 0, 0)); d = ImageDraw.Draw(cut)
    d.line([tuple(p) for p in cut_pts] + [tuple(cut_pts[0])], fill=(0, 200, 255, 255), width=4)
    safe = Image.new("RGBA", canvas, (0, 0, 0, 0)); d = ImageDraw.Draw(safe)
    sp = [tuple(p) for p in safe_pts] + [tuple(safe_pts[0])]
    for a, b in zip(sp[:-1], sp[1:]):
        a, b = np.array(a), np.array(b); L = np.linalg.norm(b - a)
        for s in np.arange(0, L, 40):
            p0 = a + (b - a) * s / L; p1 = a + (b - a) * min(s + 22, L) / L
            d.line([tuple(p0), tuple(p1)], fill=(255, 0, 200, 255), width=4)
    return cut, safe

def build_plate(name, canvas, outline, rnd, rim, field_inset, art_fn, gem_pts, gem_r, bead_r, bead_space,
                field_color=(14, 14, 16)):
    W, H = canvas
    back_m = poly_mask(outline, canvas, rnd)
    front_pts = inset(outline, rim)
    front_m = poly_mask(front_pts, canvas, rnd * 0.8)
    field_pts = inset(outline, field_inset)
    field_m = poly_mask(field_pts, canvas, rnd * 0.6)
    bead_path = inset(outline, rim + bead_r * 2.2)
    bead_m = beads(canvas, bead_path, bead_space, bead_r) * front_m
    zone = np.clip(front_m - field_m, 0, 1) * (1 - blur(bead_m, 3) > 0.5)
    # field gets a raised gold lip
    lip_m = np.clip(poly_mask(inset(outline, field_inset - 16), canvas, rnd * .6) - field_m, 0, 1)

    L = {}
    L["Strap preview (HIDE before upload)"] = strap_preview(canvas)
    L["Plate drop shadow"] = shadow(back_m, 30, 14, 24, 0.8)
    L["Backer plate - nickel (cast, flared)"] = shade(back_m, 14, NICKEL, spec=0.9, tex=0.06)
    L["Front plate - 24k gold"] = shade(front_m, 22, GOLD, spec=0.8, tex=0.05)
    L["Engraving - hand-cut scrolls + sunburst"] = engrave(
        np.maximum(sunburst(canvas, (W/2, H/2), 180, 3) * 0.7,
                   scroll_band(canvas, inset(outline, (rim + field_inset) / 2 + 6), 74, 24, 5)), zone)
    L["Field - black enamel (recessed)"] = enamel(field_m, field_color)
    L["Field lip - gold"] = shade(lip_m, 6, GOLD, spec=1.0, tex=0.03)
    L["Bead border - cast gold"] = over(shadow(bead_m, 4, 3, 5, .7), shade(bead_m, bead_r * .8, GOLD, height=1.5, spec=1.1, tex=0))
    art = art_fn(canvas, field_m)
    L.update(art)
    if gem_pts:
        g, sp = gem_layers(canvas, gem_pts, gem_r)
        L["Jewels - ruby (set in gold bezels)"] = g
        L["Jewel sparkle (screen)"] = sp
    L["Specular sweep (screen)"] = flat((255, 250, 225), blur(poly_mask(
        [(0, 0), (W*.55, 0), (W*.15, H), (0, H)], canvas), W*.08) * front_m * 0.16)
    cut, safe = guides(canvas, outline, field_pts)
    L["GUIDE - cut line (hidden)"] = cut
    L["GUIDE - safe area (hidden)"] = safe
    return L

HIDDEN = {"Strap preview (HIDE before upload)", "GUIDE - cut line (hidden)", "GUIDE - safe area (hidden)"}
SCREEN = {"Jewel sparkle (screen)", "Specular sweep (screen)"}

def grow(m, r):
    return np.clip((blur(m, r) - 0.06) * 14, 0, 1)

def raised(mask, r=6, stops=GOLD, sh=True, spec=1.0):
    parts = []
    if sh: parts.append(shadow(mask, r * .8, r * .5, r * .9, .75))
    parts.append(shade(mask, r, stops, spec=spec, tex=0.03))
    return over(*parts)

# ---------------------------------------------------------------- MAIN PLATE
MW, MH = 3600, 3000
cx, cy = MW / 2, MH / 2
main_outline = [(1800, 70), (2330, 330), (2880, 230), (3530, 860), (3530, 2140), (2880, 2770), (2330, 2670),
                (1800, 2930), (1270, 2670), (720, 2770), (70, 2140), (70, 860), (720, 230), (1270, 330)]

def main_art(canvas, field_m):
    W, H = canvas
    out = {}
    # speaker-cone sound rings engraved into the enamel behind the emblem
    rm = rings(canvas, (cx, cy + 20), 380, 1700, 64, 5, squash=0.78) * field_m
    out["Sound rings - engraved in enamel (Hellhound touch)"] = flat((120, 92, 40), rm * 0.55)
    # side bolts flank the emblem
    bm = np.zeros((H, W), np.float32)
    for x, flip in ((700, False), (2900, True)):
        m = bolt_m[:, ::-1] if flip else bolt_m
        bm = np.maximum(bm, paste_mask(m, canvas, (x, cy + 40), height=1050))
    out["Lightning bolts - ruby enamel in gold"] = over(
        raised(grow(bm, 9), 8), shade(bm, 10, RUBY, spec=1.0, tex=0, wave=.05))
    # emblem
    eh = 940
    sil = paste_mask(cube_sil, canvas, (cx, cy - 80), height=eh)
    rim_m = np.clip(blur(sil, 7) * 2.2, 0, 1)
    whi = paste_mask(cube_white, canvas, (cx, cy - 80), height=eh)
    red = paste_mask(cube_red, canvas, (cx, cy - 80), height=eh)
    drk = paste_mask(cube_dark, canvas, (cx, cy - 80), height=eh)
    inner = np.clip(sil - (1 - blur(sil, 3) > 0.5) * 0 , 0, 1)
    out["HH emblem - cast gold rim"] = raised(rim_m, 18, spec=1.1)
    out["HH emblem - black enamel face"] = enamel(drk * (blur(sil, 10) > .97), (10, 10, 12), gloss=.35)
    out["HH emblem - ruby enamel face"] = enamel(red * (blur(sil, 10) > .97), (200, 26, 34), gloss=.5)
    out["HH emblem - raised polished H"] = raised(whi, 9, spec=1.3)
    # top banner: HELLHOUND (real brand wordmark) / AUDIO
    ban_pts = [(980, 520), (2620, 520), (2700, 650), (2620, 780), (980, 780), (900, 650)]
    ban_m = poly_mask(ban_pts, canvas, 8)
    ban_f = poly_mask(inset(ban_pts, 22), canvas, 6)
    hm = paste_mask(hell_m, canvas, (cx, 650), width=1380)
    out["Top banner - gold"] = raised(ban_m, 14)
    out["Top banner - black enamel inlay"] = enamel(ban_f, (12, 12, 14), gloss=.3)
    out["TEXT - HELLHOUND (brand wordmark, raised gold)"] = raised(hm * ban_f, 4, spec=1.2)
    # bottom banner: AUDIO + bolt
    bb_pts = [(1180, 1930), (2420, 1930), (2500, 2045), (2420, 2160), (1180, 2160), (1100, 2045)]
    bb_m = poly_mask(bb_pts, canvas, 8); bb_f = poly_mask(inset(bb_pts, 22), canvas, 6)
    out["Bottom banner - gold"] = raised(bb_m, 14)
    out["Bottom banner - black enamel inlay"] = enamel(bb_f, (12, 12, 14), gloss=.3)
    a_dark = paste_mask(trim(word_dark[split - 40:]) if False else audio_m_trim, canvas, (cx, 2045), height=160)
    a_bolt = paste_mask(audio_bolt_trim, canvas, (cx, 2045), height=160)
    out["TEXT - AUDIO (brand wordmark, raised gold)"] = raised(a_dark * bb_f, 4, spec=1.2)
    out["TEXT - AUDIO bolt (ruby)"] = shade(a_bolt, 4, RUBY, spec=1.2, tex=0, wave=.05)
    # whisper line engraved under the banner: the poetry
    tm = text_mask("NO COMPARISON", CINZEL, 64, canvas, (cx, 2290), tracking=14)
    out["TEXT - NO COMPARISON (engraved, editable copy)"] = over(
        flat((255, 236, 170), np.roll(tm, 3, 0) * .5 * field_m), flat((214, 168, 70), tm * field_m))
    return out

# AUDIO line from wordmark, with bolt split out
_a_region = np.maximum(word_dark, word_red)[split:]
ys, xs = np.where(_a_region > 0)
_y0, _y1, _x0, _x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
audio_m_trim = word_dark[split:][_y0:_y1, _x0:_x1]
audio_bolt_trim = word_red[split:][_y0:_y1, _x0:_x1]

main_gems = [(1800, 250), (1800, 2755), (3330, 1500), (270, 1500), (2900, 420), (700, 420), (2900, 2580), (700, 2580)]
main_L = build_plate("main", (MW, MH), main_outline, 26, 64, 300, main_art, main_gems, 46, 15, 46)

# ---------------------------------------------------------------- SIDE + END plates
def hex_pts(cx, cy, rx, ry, rot=90):
    return [(cx + rx * math.cos(math.radians(rot + 60 * i)), cy + ry * math.sin(math.radians(rot + 60 * i))) for i in range(6)]

SW, SH = 1500, 1700
side_outline = hex_pts(SW / 2, SH / 2, 720, 830)

def side1_art(canvas, field_m):
    W, H = canvas
    tm = text_mask("NJ", CINZEL_DEC, 500, canvas, (W / 2, H / 2 - 70), tracking=40)
    bm = paste_mask(bolt_m, canvas, (W / 2 + 8, H / 2 - 70), height=700)
    nm = text_mask("NEW JERSEY", CINZEL, 62, canvas, (W / 2, H / 2 + 370), tracking=14)
    return {"Sound rings - engraved": flat((120, 92, 40), rings(canvas, (W/2, H/2), 250, 900, 52, 4) * field_m * .45),
            "TEXT - NJ (raised gold)": raised(tm * (1 - grow(bm, 8)), 8, spec=1.2),
            "Lightning bolt - ruby enamel": over(raised(grow(bm, 8), 7), shade(bm, 8, RUBY, spec=1, tex=0, wave=.05)),
            "TEXT - NEW JERSEY (engraved, editable copy)": flat((214, 168, 70), nm * field_m)}

def side2_art(canvas, field_m):
    W, H = canvas
    c = (W / 2, H / 2 - 110)
    # speaker: surround, cone, dust cap - all raised gold, cone in black enamel
    def disc(r):
        im = Image.new("L", canvas, 0); ImageDraw.Draw(im).ellipse([c[0]-r, c[1]-r, c[0]+r, c[1]+r], fill=255); return to_mask(im)
    surround = np.clip(disc(390) - disc(330), 0, 1)
    cone = np.clip(disc(330) - disc(125), 0, 1)
    cap = disc(125)
    bm = paste_mask(bolt_m, canvas, c, height=250)
    nm = text_mask("THE SOUND", CINZEL, 62, canvas, (W / 2, H / 2 + 370), tracking=14)
    return {"Speaker surround - raised gold": raised(surround, 24, spec=1.2),
            "Speaker cone - black enamel": enamel(cone, (12, 12, 14), gloss=.4),
            "Speaker cone ribs - engraved": flat((150, 115, 50), rings(canvas, c, 150, 330, 32, 4) * cone * .7),
            "Dust cap - polished gold": raised(cap, 40, spec=1.4),
            "Lightning bolt - ruby enamel": shade(bm, 6, RUBY, spec=1, tex=0, wave=.05),
            "TEXT - THE SOUND (engraved, editable copy)": flat((214, 168, 70), nm * field_m)}

side_gems = [(SW/2, 155), (SW/2, SH - 155)]
side1_L = build_plate("side1", (SW, SH), side_outline, 18, 44, 190, side1_art, side_gems, 34, 11, 34)
side2_L = build_plate("side2", (SW, SH), side_outline, 18, 44, 190, side2_art, side_gems, 34, 11, 34)

EW, EH = 900, 1100
end_outline = hex_pts(EW / 2, EH / 2, 420, 520)

def end_art_factory(flip):
    def fn(canvas, field_m):
        W, H = canvas
        m = bolt_m[:, ::-1] if flip else bolt_m
        bm = paste_mask(m, canvas, (W / 2, H / 2), height=560)
        return {"Lightning bolt - ruby enamel in gold": over(raised(grow(bm, 9), 8),
                                                              shade(bm, 9, RUBY, spec=1, tex=0, wave=.05))}
    return fn

end1_L = build_plate("end1", (EW, EH), end_outline, 14, 34, 120, end_art_factory(False), [], 0, 9, 28)
end2_L = build_plate("end2", (EW, EH), end_outline, 14, 34, 120, end_art_factory(True), [], 0, 9, 28)

# ---------------------------------------------------------------- write files
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer
from psd_tools.constants import BlendMode, Compression

def write(name, layers, dpi=300):
    first = next(iter(layers.values()))
    psd = PSDImage.new("RGB", first.size, color=0)
    for lname, im in layers.items():
        bb = im.getbbox() or (0, 0, 1, 1)
        lay = PixelLayer.frompil(im.crop(bb), psd, lname, bb[1], bb[0], compression=Compression.ZIP)
        if lname in HIDDEN: lay.visible = False
        if lname in SCREEN:
            try: lay.blend_mode = BlendMode.SCREEN
            except Exception: pass
    flat_im = Image.new("RGBA", first.size, (0, 0, 0, 0))
    for lname, im in layers.items():
        if lname in HIDDEN: continue
        flat_im = Image.alpha_composite(flat_im, im)
    psd.save(os.path.join(OUT, f"{name}.psd"))
    flat_im.save(os.path.join(OUT, f"{name}.png"), dpi=(dpi, dpi))
    return flat_im

plates = {}
for nm, Ls in [("01_Main_Plate", main_L), ("02_Side_Plate_1_NJ", side1_L), ("03_Side_Plate_2_Sound", side2_L),
               ("04_End_Plate_1", end1_L), ("05_End_Plate_2", end2_L)]:
    plates[nm] = write(nm, Ls)
    print("wrote", nm, flush=True)

# ---------------------------------------------------------------- full-belt mockup
S = 0.5
BW, BH = 6400, 2000
belt = Image.new("RGBA", (BW, BH), (30, 30, 32, 255))
# backdrop gradient
yy = np.linspace(0, 1, BH)[:, None]
bgrgb = np.broadcast_to((np.array([46, 44, 48]) * (1 - .6 * yy)[..., None]), (BH, BW, 3)).copy()
belt = rgba(bgrgb, np.ones((BH, BW)))
strap_h = 700; sy = BH // 2
strap_m = np.zeros((BH, BW), np.float32); strap_m[sy - strap_h // 2: sy + strap_h // 2, 120:BW - 120] = 1
strap_m = blur(strap_m, 6)
strap_rgb = np.asarray(strap_preview((BW, BH)))[..., :3].astype(np.float32)
belt = over(belt, shadow(strap_m, 30, 0, 30, .7), shade(strap_m, 30, [(0, (6, 6, 7)), (.5, (24, 24, 26)), (1, (70, 70, 74))], spec=.2, tex=.08, wave=.02))
# red stitch lines
st = Image.new("RGBA", (BW, BH), (0, 0, 0, 0)); d = ImageDraw.Draw(st)
for yoff in (-strap_h // 2 + 40, strap_h // 2 - 40):
    for x in range(160, BW - 160, 36):
        d.line([(x, sy + yoff), (x + 20, sy + yoff)], fill=(214, 40, 46, 255), width=6)
belt = over(belt, st)
def place(img, cx, cy):
    im = img.resize((int(img.width * S), int(img.height * S)), Image.LANCZOS)
    layer = Image.new("RGBA", (BW, BH), (0, 0, 0, 0)); layer.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)
    return layer
order = [("04_End_Plate_1", 560), ("02_Side_Plate_1_NJ", 1700), ("01_Main_Plate", BW / 2),
         ("03_Side_Plate_2_Sound", BW - 1700), ("05_End_Plate_2", BW - 560)]
for nm, x in order:
    belt = over(belt, place(plates[nm], x, sy))
belt.convert("RGB").save(os.path.join(OUT, "00_Full_Belt_Mockup.png"))
belt.convert("RGB").resize((BW // 3, BH // 3), Image.LANCZOS).save(os.path.join(OUT, "00_Full_Belt_Mockup_small.jpg"), quality=90)

# full-design upload sheet (all plates, actual size, on one canvas)
sheet = Image.new("RGBA", (MW + 2 * SW + 400, MH + EH + 300), (255, 255, 255, 0))
sheet.paste(plates["02_Side_Plate_1_NJ"], (100, 100), plates["02_Side_Plate_1_NJ"])
sheet.paste(plates["01_Main_Plate"], (SW + 200, 100), plates["01_Main_Plate"])
sheet.paste(plates["03_Side_Plate_2_Sound"], (SW + MW + 300, 100), plates["03_Side_Plate_2_Sound"])
sheet.paste(plates["04_End_Plate_1"], (200, MH + 200), plates["04_End_Plate_1"])
sheet.paste(plates["05_End_Plate_2"], (sheet.width - EW - 200, MH + 200), plates["05_End_Plate_2"])
psd = PSDImage.new("RGB", sheet.size, color=(255, 255, 255))
for nm, pos in [("02_Side_Plate_1_NJ", (100, 100)), ("01_Main_Plate", (SW + 200, 100)), ("03_Side_Plate_2_Sound", (SW + MW + 300, 100)),
                ("04_End_Plate_1", (200, MH + 200)), ("05_End_Plate_2", (sheet.width - EW - 200, MH + 200))]:
    PixelLayer.frompil(plates[nm], psd, nm, pos[1], pos[0], compression=Compression.ZIP)
pass  # combined PSD skipped (size); PNG below is the upload file
sheet.save(os.path.join(OUT, "06_Full_Design_Upload.png"), dpi=(300, 300))
print("done")
