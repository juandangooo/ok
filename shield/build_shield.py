"""
HH Shield Ornament - a flat, double-sided, exact print of the logo.

The artwork is traced straight from logo_source.webp (the real logo), not
redrawn: every colour region is vectorised from the image, then checked back
against it pixel by pixel.

Print: face DOWN on the textured plate.
  Z 0.0-0.6   front logo (mirrored in the file, reads correctly once flipped)
  Z 0.6-2.4   red core
  Z 2.4-3.0   back logo (reads correctly from behind)
Colours sit side by side only in the first and last 3 layers, so an AMS does
~15 swaps in total.

Run:  python3 build_shield.py
"""
import json
import os

import cv2
import numpy as np
import trimesh
from manifold3d import CrossSection, FillRule, JoinType, Manifold, OpType

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "logo_source.webp")

HEIGHT = 90.0        # mm, logo height (top point to bottom point)
T = 3.0              # total thickness
FACE = 0.6           # colour layers on each side (3 x 0.2 mm)
LAYER = 0.2
MIN_W = 0.6          # smallest printable feature / gap we accept (mm)
EPS_PX = 1.0         # polygon simplification tolerance (px)
RIM = 0.3            # red added OUTSIDE the outline: the logo's 0.55 mm outline -> ~0.85 mm

LOOP_R = 6.0         # hanging loop outer radius
LOOP_HOLE = 2.25     # 4.5 mm hole
LOOP_DROP = 3.0      # loop centre this far above the top point

COLOURS = {"red": (60, 60, 240), "black": (10, 10, 10), "white": (250, 250, 250)}  # BGR
FIL = {"red": 1, "black": 2, "white": 3}


# ------------------------------------------------------------- image -> labels
def load_labels():
    im = cv2.imread(SRC, cv2.IMREAD_UNCHANGED).astype(float)
    bgr, alpha = im[..., :3], im[..., 3]
    sil = alpha > 128
    d = np.stack([np.linalg.norm(bgr - np.array(c), axis=-1) for c in COLOURS.values()])
    lab = np.argmin(d, 0).astype(np.int8)
    lab[~sil] = -1
    # remove anti-aliasing speckle: 3x3 majority vote inside the silhouette
    out = lab.copy()
    votes = np.stack([cv2.blur((lab == i).astype(np.float32), (3, 3)) for i in range(3)])
    out[sil] = np.argmax(votes, 0)[sil]
    return out, sil


def mask_to_cs(mask, px):
    """Raster mask -> CrossSection in mm (y up), contours simplified by EPS_PX."""
    m = mask.astype(np.uint8) * 255
    contours, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    polys = []
    for c in contours:
        if cv2.contourArea(c) < 4:
            continue
        a = cv2.approxPolyDP(c, EPS_PX, True)[:, 0, :].astype(float)
        a[:, 1] = -a[:, 1]
        polys.append((a * px).tolist())
    return CrossSection(polys, FillRule.EvenOdd)


def rasterize(cs, shape, px):
    img = np.zeros(shape, np.uint8)
    for poly in cs.to_polygons():
        p = np.array(poly) / px
        p[:, 1] = -p[:, 1]
        cv2.fillPoly(img, [np.round(p * 8).astype(np.int32)], 1, shift=3)
    return img.astype(bool)


def xor_fill(cs, shape, px):
    """Even-odd raster of a multi-contour section (holes handled)."""
    img = np.zeros(shape, np.uint8)
    for poly in cs.to_polygons():
        p = np.array(poly) / px
        p[:, 1] = -p[:, 1]
        tmp = np.zeros(shape, np.uint8)
        cv2.fillPoly(tmp, [np.round(p * 8).astype(np.int32)], 1, shift=3)
        img ^= tmp
    return img.astype(bool)


def snap(cs, g=1e-3):
    """Snap every vertex to a g-mm grid (same grid for all colours, so shared
    edges stay identical); collapses near-duplicate vertices that would
    otherwise fold into holes when a slicer reads 32-bit float coordinates."""
    polys = [np.round(np.array(p) / g) * g for p in cs.to_polygons()]
    return CrossSection([p.tolist() for p in polys if len(p) >= 3], FillRule.Positive)


def roundtrip_ok(m):
    """Export to STL (32-bit floats, like a slicer reads it), reload, re-check."""
    import io
    mm = m.to_mesh()
    t = trimesh.Trimesh(np.asarray(mm.vert_properties)[:, :3], np.asarray(mm.tri_verts), process=False)
    buf = io.BytesIO(); t.export(buf, file_type="stl"); buf.seek(0)
    r = trimesh.load(buf, file_type="stl")
    return r.is_watertight and r.is_winding_consistent and abs(r.volume - m.volume()) < 1e-2


def tidy(p, tol=1e-6):
    """Remove duplicate points and zero-width spikes (A -> B -> A) from a contour."""
    p = [np.asarray(v, float) for v in p]
    changed = True
    while changed and len(p) >= 3:
        changed = False
        n = len(p)
        for i in range(n):
            a, b, c = p[i - 1], p[i], p[(i + 1) % n]
            u, w = b - a, c - b
            dup = np.linalg.norm(u) < tol
            spike = abs(u[0] * w[1] - u[1] * w[0]) < tol * max(np.linalg.norm(u), np.linalg.norm(w), 1) \
                and np.dot(u, w) < 0
            if dup or spike:
                del p[i]
                changed = True
                break
    return np.array(p)


def clean(cs, amin=1e-6):
    """Drop zero-area leftover contours and spikes (degenerate boolean output)."""
    keep = []
    for p in cs.to_polygons():
        p = tidy(p)
        if len(p) < 3:
            continue
        a = 0.5 * np.sum(p[:, 0] * np.roll(p[:, 1], -1) - np.roll(p[:, 0], -1) * p[:, 1])
        if len(p) >= 3 and abs(a) > amin:
            keep.append(p.tolist())
    return CrossSection(keep, FillRule.Positive)


def pinch_points(cs):
    """Vertices that occur twice in a region (corner-to-corner touches)."""
    pts = np.vstack([np.array(p) for p in cs.to_polygons()])
    _, counts = np.unique(np.round(pts, 6), axis=0, return_counts=True)
    return int((counts > 1).sum())


def opened(cs, r):
    return cs.offset(-r, circular_segments=48).offset(r, circular_segments=48)


def main(return_data=False):
    report = []
    lab, sil = load_labels()
    ys, xs = np.where(sil)
    px = HEIGHT / (ys.max() - ys.min() + 1)                  # mm per pixel
    report.append(f"scale: {px:.4f} mm/px, logo {(xs.max()-xs.min()+1)*px:.1f} x {HEIGHT:.1f} mm")

    silh = mask_to_cs(sil, px)
    white = mask_to_cs(lab == 2, px) ^ silh
    red = (mask_to_cs(lab == 0, px) - white) ^ silh
    black = silh - red - white
    # tracing leaves hairline black slivers along red/white borders: give them to red
    sliver = black - opened(black, 0.12)
    black, red = black - sliver, red + sliver
    report.append(f"cleaned {sliver.area():.2f} mm2 of tracing slivers")
    silh_src = silh
    silh = silh.offset(RIM, JoinType.Miter, 4.0)
    red = red + (silh - silh_src)
    report.append(f"outer outline widened by {RIM} mm outward (interior artwork untouched)")

    # recentre: logo centre at origin
    bx0, by0, bx1, by1 = silh.bounds()
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    silh = snap(silh.translate([-cx, -cy]))
    white = snap(white.translate([-cx, -cy])) ^ silh
    red = (snap(red.translate([-cx, -cy])) - white) ^ silh   # exact booleans on snapped inputs
    # final clean-up: tracing + snapping can leave microscopic crumbs that touch a
    # neighbour at one corner (a "pinch point" a slicer can't read cleanly).
    # Hand every crumb < 0.05 mm2 to the surrounding colour, repeat until clean.
    def drop(cs, amin=0.05):
        keep = [p for p in cs.decompose() if p.area() >= amin]
        out = CrossSection()
        for p in keep:
            out = out + p
        return out
    black = silh - red - white
    moved = 0.0
    for _ in range(5):
        w2 = drop(white); moved += (white - w2).area(); white = w2
        b2 = drop(black); moved += (black - b2).area(); black = b2
        red = silh - black - white
        r2 = drop(red); crumbs = red - r2; moved += crumbs.area()
        black = black + crumbs; red = silh - black - white
        white, black = clean(white), clean(black)
        red = clean(silh - black - white)
        if not any(pinch_points(c) for c in (red, black, white)):
            break
    report.append(f"removed tracing crumbs: {moved:.3f} mm2 reassigned")
    regions = {"red": red, "black": black, "white": white}
    for k, cs in regions.items():
        assert pinch_points(cs) == 0, (k, pinch_points(cs))
    report.append("no corner-to-corner pinch points in any colour")
    _, by0, _, by1 = silh.bounds()

    # ---- fidelity check: rasterise the vectors back and compare with the image
    shape = lab.shape
    back = {}
    for k, cs in regions.items():
        back[k] = xor_fill(cs.translate([cx, cy]), shape, px)
    agree = sum(((lab == i) & back[k]).sum() for i, k in enumerate(("red", "black", "white")))
    acc = agree / sil.sum()
    per = {k: ((lab == i) & back[k]).sum() / max((lab == i).sum(), 1)
           for i, k in enumerate(("red", "black", "white"))}
    # pixels away from any colour edge (the anti-aliased 1 px seam) must match exactly
    k3 = np.ones((3, 3), np.uint8)
    interior = sil.copy()
    for i in range(3):
        m = (lab == i).astype(np.uint8)
        edge = cv2.dilate(m, k3) != cv2.erode(m, k3)
        interior &= ~edge
    inner_ok = sum(((lab == i) & back[k] & interior).sum() for i, k in enumerate(("red", "black", "white"))) / interior.sum()
    report.append(f"fidelity away from colour edges: {inner_ok*100:.3f}% of pixels match")
    assert inner_ok > 0.999, inner_ok
    assert acc > 0.98, acc
    report.append("fidelity vs. source image: " + f"{acc*100:.2f}% of all logo pixels match (rest = 1 px anti-aliased seams); " +
                  ", ".join(f"{k} {v*100:.1f}%" for k, v in per.items()))

    # ---- printability: no colour feature thinner than MIN_W (lost area ~ 0)
    for k, cs in regions.items():
        loss = 1 - opened(cs, MIN_W / 2 * 0.999).area() / cs.area()
        report.append(f"{k}: {loss*100:.2f}% of area in features thinner than {MIN_W} mm")
        assert loss < 0.01, (k, loss)

    # ---- hanging loop (red), centred over the top point
    top_y = by1
    zc = top_y + LOOP_DROP
    loop2d = CrossSection.circle(LOOP_R, 96).translate([0, zc])
    hole2d = CrossSection.circle(LOOP_HOLE, 96).translate([0, zc])
    assert (hole2d ^ silh).area() < 1e-6, "loop hole cuts the logo"
    outline = snap(silh + loop2d - hole2d)               # full plate outline
    face_red = clean(outline - regions["black"] - regions["white"])
    assert pinch_points(face_red) == 0

    # ---- 3D: front (mirrored) on the bed, red core, back on top
    def ex(cs, z0, z1):
        return cs.extrude(z1 - z0).translate([0, 0, z0])
    mir = lambda cs: cs.mirror([1, 0])
    parts = {"red": [], "black": [], "white": []}
    for k in parts:
        cs = face_red if k == "red" else regions[k]
        parts[k].append(ex(mir(cs), 0, FACE))           # front, read from below
        parts[k].append(ex(cs, T - FACE, T))             # back, read from above
    parts["red"].append(ex(outline, FACE, T - FACE))      # core
    solids = {k: Manifold.batch_boolean(v, OpType.Add) for k, v in parts.items()}

    # colour parts: never overlap, and together fill the plate exactly
    names = list(solids)
    for i in range(3):
        for j in range(i + 1, 3):
            assert (solids[names[i]] ^ solids[names[j]]).volume() < 1e-3, "colours overlap"
    plate = ex(outline, 0, T)
    total = sum(s.volume() for s in solids.values())
    assert abs(total - plate.volume()) < 1e-2, (total, plate.volume())
    for z in np.arange(LAYER / 2, T, LAYER):          # every layer fully covered
        got = sum(s.slice(z).area() for s in solids.values())
        assert abs(got - outline.area()) < 1e-3, (z, got)
    assert plate.genus() == 1 and len(plate.decompose()) == 1   # one solid, one hole (the loop)
    whole = plate
    m = plate.to_mesh()
    t = trimesh.Trimesh(np.asarray(m.vert_properties)[:, :3], np.asarray(m.tri_verts), process=False)
    assert t.is_watertight and t.is_winding_consistent
    ext = t.extents
    report.append(f"colour parts: disjoint, every layer 100% covered; plate: 1 body, 1 hole (loop), "
                  f"{ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} mm incl. loop, "
                  f"{plate.volume()/1000*1.24:.1f} g PLA (solid)")
    for z in (FACE, T - FACE):
        assert abs(z / LAYER - round(z / LAYER)) < 1e-9

    for k, s in solids.items():
        assert roundtrip_ok(s), f"{k}: breaks when saved at slicer (float32) precision"
    assert roundtrip_ok(plate)
    report.append("every part still watertight after a float32 STL save/reload (what a slicer reads)")
    if return_data:
        return dict(regions=regions, face_red=face_red, outline=outline, cx=cx, cy=cy, px=px,
                    solids=solids, report=report)
    os.makedirs(os.path.join(HERE, "parts"), exist_ok=True)
    for k, s in solids.items():
        m = s.to_mesh()
        tm = trimesh.Trimesh(np.asarray(m.vert_properties)[:, :3], np.asarray(m.tri_verts), process=False)
        assert tm.is_watertight and tm.is_winding_consistent and tm.volume > 0, k
        assert roundtrip_ok(s), f"{k}: breaks when saved at slicer (float32) precision"
        tm.export(
            os.path.join(HERE, "parts", f"shield_{k}.stl"))
    t.export(os.path.join(HERE, "shield_all.stl"))
    with open(os.path.join(HERE, "report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print("\n".join(report))


if __name__ == "__main__":
    main()
