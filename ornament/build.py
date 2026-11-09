"""
HH Cube Ornament - parametric generator.

Produces print-ready STLs for a Bambu Lab P2S (or any 0.4 mm FDM printer):

  core.stl     red cube body with 4 face pockets + hanging tab
  tile_A.stl   black plate, raised white H   (x2)  -> filament change at Z=1.4
  tile_B.stl   red plate, black H + border   (x2)  -> filament change at Z=1.4

plus colour-split parts (parts/) for AMS per-part painting and an assembled
preview (preview/). All dimensions in millimetres.

Run:  python3 build.py
"""
import json
import os

import numpy as np
import trimesh
from manifold3d import CrossSection, Manifold

HERE = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------- parameters
S = 45.0            # cube edge
EDGE_CH = 0.6       # chamfer on every cube edge
FRAME = 2.5         # red border left around each face pocket
POCKET_D = 1.2      # pocket depth == tile base thickness
CLEAR = 0.2         # clearance per side, tile vs pocket
TILE_T = POCKET_D   # tile base thickness (flush with frame when installed)
TILE_FOOT = 0.3     # chamfer on tile bed edge (eats elephant foot)
RAISE = 1.0         # height of the H above the face
H_CH = 0.4          # 45 deg bevel on the top edges of the H
LINE_RAISE = 0.6    # height of the thin black border line on tile B
LINE_W = 1.0        # width of that line
LINE_INSET = 1.4    # gap between tile edge and the line

# H letter (on the tile, centred)
H_H = 28.0          # letter height
H_W = 23.0          # letter width
H_STEM = 6.6        # vertical stroke width
H_BAR = 5.6         # crossbar thickness

# hanging tab
TAB_W = 12.0        # across x
TAB_T = 5.5         # thickness along y (hole axis)
TAB_RISE = 8.0      # top face -> hole centre
HOLE_R = 2.25       # 4.5 mm hole, fits ribbon / ornament hook
PLINTH = (17.0, 10.0, 2.0)  # base footprint x, y and height

POCKET = S - 2 * FRAME          # 40.0
TILE = POCKET - 2 * CLEAR       # 39.6
SEG = 96


# -------------------------------------------------------------------- helpers
def box(x0, x1, y0, y1, z0, z1):
    return Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0])


def chamfer_box(sx, sy, sz, c, top=True, bottom=True, sides=True):
    """Box centred in x/y, z from 0..sz, with 45-degree chamfers."""
    parts = []
    cx = c if sides else 0
    # full-size slab in the middle, shrunk slabs at the chamfered ends
    zb = c if bottom else 0
    zt = sz - c if top else sz
    parts.append(box(-sx / 2, sx / 2, -sy / 2 + cx, sy / 2 - cx, zb, zt))
    parts.append(box(-sx / 2 + cx, sx / 2 - cx, -sy / 2, sy / 2, zb, zt))
    if bottom:
        parts.append(box(-sx / 2 + c, sx / 2 - c, -sy / 2 + c, sy / 2 - c, 0, zb))
    if top:
        parts.append(box(-sx / 2 + c, sx / 2 - c, -sy / 2 + c, sy / 2 - c, zt, sz))
    return Manifold.batch_hull(parts)


def beveled_rect(x0, x1, y0, y1, z0, h, ch):
    """Rectangular prism with a 45-degree bevel of `ch` on its top edges."""
    lower = box(x0, x1, y0, y1, z0, z0 + h - ch)
    upper = box(x0 + ch, x1 - ch, y0 + ch, y1 - ch, z0 + h - 1e-3, z0 + h)
    return Manifold.batch_hull([lower, upper])


def letter_h(z0, h, ch):
    """Raised H with bevelled top. Union of convex bevelled pieces gives
    correct mitred inner corners for 45-degree bevels."""
    hw, hh = H_W / 2, H_H / 2
    left = beveled_rect(-hw, -hw + H_STEM, -hh, hh, z0, h, ch)
    right = beveled_rect(hw - H_STEM, hw, -hh, hh, z0, h, ch)
    bar = beveled_rect(-hw + H_STEM / 2, hw - H_STEM / 2,
                       -H_BAR / 2, H_BAR / 2, z0, h, ch)
    return left + right + bar


def square_ring(outer, width, z0, h):
    o = outer / 2
    i = o - width
    return box(-o, o, -o, o, z0, z0 + h) - box(-i, i, -i, i, z0 - 1, z0 + h + 1)


# ---------------------------------------------------------------------- parts
def make_tile_base():
    return chamfer_box(TILE, TILE, TILE_T, TILE_FOOT, top=False, bottom=True)


def make_tile_a_parts():
    base = make_tile_base()
    h = letter_h(TILE_T, RAISE, H_CH)
    return {"black": base, "white": h}


def make_tile_b_parts():
    base = make_tile_base()
    h = letter_h(TILE_T, RAISE, H_CH)
    line = square_ring(TILE - 2 * LINE_INSET, LINE_W, TILE_T, LINE_RAISE)
    return {"red": base, "black": h + line}


def make_core():
    cube = chamfer_box(S, S, S, EDGE_CH)
    half = S / 2
    p = POCKET / 2
    z0, z1 = half - p, half + p
    # pockets on the four vertical faces
    pockets = [
        box(half - POCKET_D, half + 1, -p, p, z0, z1),     # +x
        box(-half - 1, -half + POCKET_D, -p, p, z0, z1),   # -x
        box(-p, p, half - POCKET_D, half + 1, z0, z1),     # +y
        box(-p, p, -half - 1, -half + POCKET_D, z0, z1),   # -y
    ]
    for pk in pockets:
        cube = cube - pk

    # hanging tab: chamfered plinth + rounded tab + teardrop hole (axis = y)
    px, py, ph = PLINTH
    plinth = Manifold.batch_hull([
        box(-px / 2, px / 2, -py / 2, py / 2, S - 0.5, S),
        box(-TAB_W / 2, TAB_W / 2, -TAB_T / 2, TAB_T / 2, S + ph - 1e-3, S + ph),
    ])
    zc = S + TAB_RISE
    rim = TAB_W / 2
    disc = (CrossSection.circle(rim, SEG)
            .translate([0, zc]))
    stem = CrossSection.square([TAB_W, zc - S + 0.5]).translate([-TAB_W / 2, S - 0.5])
    profile = CrossSection.batch_hull([disc, stem])            # in (x, z)
    tab = profile.extrude(TAB_T).translate([0, 0, -TAB_T / 2])  # z is thickness
    tab = tab.rotate([90, 0, 0])                               # -> thickness along y
    # teardrop hole, tip truncated so >3 mm of plastic stays above it
    tip = HOLE_R * 1.2
    tear = CrossSection.batch_hull([
        CrossSection.circle(HOLE_R, SEG),
        CrossSection.square([0.9, 0.01]).translate([-0.45, tip - 0.01]),
    ]).translate([0, zc])
    hole = tear.extrude(TAB_T + 4).translate([0, 0, -TAB_T / 2 - 2]).rotate([90, 0, 0])
    hanger = (plinth + tab) - hole
    return cube + hanger


# ----------------------------------------------------------- export / checks
def to_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(vertices=np.asarray(mesh.vert_properties)[:, :3],
                           faces=np.asarray(mesh.tri_verts), process=True)


def check(name, m):
    t = to_trimesh(m)
    info = {
        "name": name,
        "watertight": bool(t.is_watertight),
        "winding_consistent": bool(t.is_winding_consistent),
        "volume_positive": bool(t.volume > 0),
        "bodies": len(m.decompose()),
        "volume_cm3": round(t.volume / 1000, 3),
        "pla_grams_solid": round(t.volume / 1000 * 1.24, 1),
        "bbox_mm": [round(v, 3) for v in (t.bounds[1] - t.bounds[0])],
        "min_z": round(float(t.bounds[0][2]), 4),
    }
    assert info["watertight"] and info["winding_consistent"] and info["volume_positive"], info
    assert info["bodies"] == 1, info
    assert abs(info["min_z"]) < 1e-6, info
    return t, info


def tile_to_face(m, face):
    """Place a tile (built flat, H upright along +y) into a face pocket."""
    half = S / 2
    floor = half - POCKET_D
    m = m.rotate([90, 0, 0])            # tile +z -> -y, tile +y -> +z
    m = m.translate([0, 0, half])       # centre on face
    yaw = {"-y": 0, "+x": 90, "+y": 180, "-x": 270}[face]
    m = m.translate([0, -floor, 0])     # base sits on pocket floor of -y face
    return m.rotate([0, 0, yaw])


def main():
    out = HERE
    os.makedirs(os.path.join(out, "parts"), exist_ok=True)
    os.makedirs(os.path.join(out, "preview"), exist_ok=True)
    report = []

    core = make_core()
    ta = make_tile_a_parts()
    tb = make_tile_b_parts()
    tile_a = ta["black"] + ta["white"]
    tile_b = tb["red"] + tb["black"]

    for name, m in [("core", core), ("tile_A", tile_a), ("tile_B", tile_b)]:
        t, info = check(name, m)
        t.export(os.path.join(out, f"{name}.stl"))
        report.append(info)

    # colour-split parts, sharing the tile's origin (for AMS per-part colours)
    for name, m in [("tile_A_black_base", ta["black"]), ("tile_A_white_H", ta["white"]),
                    ("tile_B_red_base", tb["red"]), ("tile_B_black_H", tb["black"])]:
        t = to_trimesh(m)
        assert t.is_watertight, name
        t.export(os.path.join(out, "parts", f"{name}.stl"))

    # colour parts must not overlap (volume of union == sum of volumes)
    for parts in (ta, tb):
        a, b = list(parts.values())
        assert abs((a + b).volume() - a.volume() - b.volume()) < 1e-3

    # ---------- assembly + fit checks
    faces = {"-y": "A", "+x": "B", "+y": "A", "-x": "B"}
    asm = {"red": core, "black": None, "white": None}
    placed = []
    for face, kind in faces.items():
        parts = ta if kind == "A" else tb
        whole = tile_to_face(tile_a if kind == "A" else tile_b, face)
        # tile must not intersect the core (clearance really exists)
        inter = (whole ^ core).volume()
        assert inter < 1e-3, (face, inter)
        placed.append(whole)
        for col, m in parts.items():
            pm = tile_to_face(m, face)
            asm[col] = pm if asm[col] is None else asm[col] + pm
    # tiles must not intersect each other
    for i in range(len(placed)):
        for j in range(i + 1, len(placed)):
            assert (placed[i] ^ placed[j]).volume() < 1e-3
    # installed tile face flush with frame: base top == cube face plane
    bb = placed[0].bounding_box()   # -y face; H protrudes to -y
    assert abs(bb[1] - (-S / 2 - RAISE)) < 1e-6, bb

    # gap check: tile edge to pocket wall = CLEAR on every side
    for col, m in asm.items():
        to_trimesh(m).export(os.path.join(out, "preview", f"assembled_{col}.stl"))

    full = asm["red"] + asm["black"] + asm["white"]
    tf = to_trimesh(full)
    report.append({
        "name": "assembled",
        "bbox_mm": [round(v, 2) for v in (tf.bounds[1] - tf.bounds[0])],
        "volume_cm3": round(tf.volume / 1000, 2),
        "pla_grams_if_solid": round(tf.volume / 1000 * 1.24, 1),
    })
    with open(os.path.join(out, "preview", "report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
