"""
HH Cube Ornament - parametric generator (v2).

The cube is a real box: four full-colour side walls (black, red, black, red),
red top and bottom. Every seam sits exactly on a cube edge (45-degree mitres),
so a black side meets a red side right at the corner, like the logo.

The H is RECESSED into each side, like the logo: the H is the floor of a
pocket and a sliver "extrusion wall" shows up-and-left of every stroke.

  core.stl     red: inner block + top/bottom caps + hanging tab
  tile_A.stl   x2  white floor / red step / black face   (layer colour changes)
  tile_B.stl   x2  black floor / red face with black sliver lines

Every colour boundary inside a tile is horizontal (a Z height) when printed,
so each tile needs only whole-layer filament changes - AMS or manual swap.

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
LAYER = 0.2         # print layer height these heights are designed for
T = 2.2             # wall (tile) thickness
FLOOR = 1.0         # recess floor thickness  (layers 1-5)
STEP = 0.6          # tile A: red step layer  (layers 6-8), black face (layers 9-11)
GAP = 0.15          # mitre clearance per side of each tile

# H letter (tile coordinates: x right, y up, centred on the face)
H_H = 28.0
H_W = 23.0
H_STEM = 6.6
H_BAR = 5.6
SHIFT = 1.0         # sliver width: extrusion direction is up-left (-x, +y)

FRAME_INSET = 2.6   # border line (red on A, black on B), distance from cube edge
FRAME_W = 1.0       # border line width

# hanging tab (on the top cap)
TAB_W = 12.0
TAB_T = 5.5
TAB_RISE = 8.0
HOLE_R = 2.25
PLINTH = (17.0, 10.0, 2.0)

SEG = 96
EPS = 1e-3


# -------------------------------------------------------------------- helpers
def box(x0, x1, y0, y1, z0, z1):
    return Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0])


def rect2(x0, x1, y0, y1):
    return CrossSection.square([x1 - x0, y1 - y0]).translate([x0, y0])


def h_pieces():
    """H as three convex rectangles, re-centred so the whole extruded
    letter (H plus slivers) sits in the middle of the face."""
    hw, hh = H_W / 2, H_H / 2
    cx, cy = SHIFT, -SHIFT          # 2*SHIFT of slivers go up-left -> nudge
    r = [rect2(-hw, -hw + H_STEM, -hh, hh),
         rect2(hw - H_STEM, hw, -hh, hh),
         rect2(-hw + H_STEM / 2, hw - H_STEM / 2, -H_BAR / 2, H_BAR / 2)]
    return [p.translate([cx, cy]) for p in r]


def h_extruded(k):
    """H swept k*SHIFT up-left (Minkowski sum with a segment) - this is the
    logo's 3D look: the H plus the visible side wall of its extrusion."""
    out = None
    for p in h_pieces():
        q = CrossSection.batch_hull([p, p.translate([-k * SHIFT, k * SHIFT])]) if k else p
        out = q if out is None else out + q
    return out


def prism(cs, z0, z1):
    return cs.extrude(z1 - z0).translate([0, 0, z0])


def tile_blank():
    """Mitred wall: front face (z = T) is the full cube face minus clearance,
    all four sides slope 45 degrees inward to the back (z = 0)."""
    w = S - 2 * GAP
    front = box(-w / 2, w / 2, -w / 2, w / 2, T - EPS, T)
    back = box(-w / 2 + T, w / 2 - T, -w / 2 + T, w / 2 - T, 0, EPS)
    return Manifold.batch_hull([front, back])


def slab(m, z0, z1):
    return m ^ box(-S, S, -S, S, z0, z1)


def up_arrow():
    """Small arrow engraved in the back face (bed side) - points to the top."""
    tri = CrossSection.hull(CrossSection([[(-3, 14), (3, 14), (0, 18)]]))
    stem = rect2(-1, 1, 10, 14)
    return prism(tri + stem, -1, 0.4)


def border_line():
    """Square outline just inside the face edge (logo's hexagon outline)."""
    o = S / 2 - FRAME_INSET
    return rect2(-o, o, -o, o) - rect2(-o + FRAME_W, o - FRAME_W, -o + FRAME_W, o - FRAME_W)


# ---------------------------------------------------------------------- tiles
def make_tile_a():
    blank = tile_blank()
    H0 = h_extruded(0)
    H1 = h_extruded(1)
    white = slab(blank, 0, FLOOR) - up_arrow()
    red = slab(blank, FLOOR, FLOOR + STEP) - prism(H0, FLOOR - 1, T + 1)
    # border groove cut through the black face exposes the red layer -> red outline
    black = slab(blank, FLOOR + STEP, T) - prism(H1 + border_line(), FLOOR - 1, T + 1)
    return {"white": white, "red": red, "black": black}


def make_tile_b():
    blank = tile_blank()
    H0, H1, H2 = h_extruded(0), h_extruded(1), h_extruded(2)
    groove = H2 - H1                                      # black line beyond the sliver
    cut = H0 + groove + border_line()
    black = slab(blank, 0, FLOOR) - up_arrow()
    red = slab(blank, FLOOR, T) - prism(cut, FLOOR - 1, T + 1)
    return {"black": black, "red": red}


# ----------------------------------------------------------------------- core
def make_core():
    i = S / 2 - T                                         # inner block half-width
    block = box(-i, i, -i, i, 0, S)
    bottom = Manifold.batch_hull([box(-S / 2, S / 2, -S / 2, S / 2, 0, EPS),
                                  box(-i, i, -i, i, T - EPS, T)])
    top = Manifold.batch_hull([box(-i, i, -i, i, S - T, S - T + EPS),
                               box(-S / 2, S / 2, -S / 2, S / 2, S - EPS, S)])
    core = block + bottom + top

    px, py, ph = PLINTH
    plinth = Manifold.batch_hull([
        box(-px / 2, px / 2, -py / 2, py / 2, S - 0.5, S),
        box(-TAB_W / 2, TAB_W / 2, -TAB_T / 2, TAB_T / 2, S + ph - EPS, S + ph),
    ])
    zc = S + TAB_RISE
    profile = CrossSection.batch_hull([
        CrossSection.circle(TAB_W / 2, SEG).translate([0, zc]),
        rect2(-TAB_W / 2, TAB_W / 2, S - 0.5, zc),
    ])
    tab = profile.extrude(TAB_T).translate([0, 0, -TAB_T / 2]).rotate([90, 0, 0])
    tip = HOLE_R * 1.2                                    # truncated teardrop
    tear = CrossSection.batch_hull([
        CrossSection.circle(HOLE_R, SEG),
        rect2(-0.45, 0.45, tip - 0.01, tip),
    ]).translate([0, zc])
    hole = tear.extrude(TAB_T + 4).translate([0, 0, -TAB_T / 2 - 2]).rotate([90, 0, 0])
    return core + ((plinth + tab) - hole)


# ----------------------------------------------------------- export / checks
def to_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(vertices=np.asarray(mesh.vert_properties)[:, :3],
                           faces=np.asarray(mesh.tri_verts), process=True)


def check_solid(name, m, bodies=1):
    t = to_trimesh(m)
    assert t.is_watertight and t.is_winding_consistent and t.volume > 0, name
    n = len(m.decompose())
    assert n == bodies, (name, n)
    return t


def min_feature_loss(cs, r):
    """Fraction of area lost by a morphological opening with radius r:
    features narrower than 2r disappear. Near zero = nothing too thin."""
    a = cs.area()
    if a == 0:
        return 0.0
    opened = cs.offset(-r, circular_segments=SEG).offset(r, circular_segments=SEG)
    return 1 - opened.area() / a


def tile_to_face(m, face):
    """Tile frame (back z=0, front z=T, H up = +y) -> cube side wall."""
    m = m.rotate([90, 0, 0])                       # +z -> -y, +y -> +z
    m = m.translate([0, -(S / 2 - T), S / 2])      # front lands on y = -S/2
    yaw = {"-y": 0, "+x": 90, "+y": 180, "-x": 270}[face]
    return m.rotate([0, 0, yaw])


def main():
    os.makedirs(os.path.join(HERE, "parts"), exist_ok=True)
    os.makedirs(os.path.join(HERE, "preview"), exist_ok=True)
    report = {"layer_height": LAYER, "checks": []}
    log = report["checks"].append

    core = make_core()
    ta, tb = make_tile_a(), make_tile_b()

    # --- every part: manifold, one body, on the bed
    t = check_solid("core", core)
    t.export(os.path.join(HERE, "core.stl"))
    log(f"core: watertight, 1 body, {t.volume/1000:.1f} cm3 solid, bbox {np.round(t.extents,2).tolist()}")
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        whole = None
        for col, m in parts.items():
            check_solid(f"{tname}_{col}", m, bodies=len(m.decompose()))  # islands OK, whole tile checked below
            to_trimesh(m).export(os.path.join(HERE, "parts", f"{tname}_{col}.stl"))
            whole = m if whole is None else whole + m
        # colours must not overlap, must stack into one solid
        assert abs(whole.volume() - sum(m.volume() for m in parts.values())) < 1e-3
        tw = check_solid(tname, whole)
        assert abs(tw.bounds[0][2]) < 1e-9
        tw.export(os.path.join(HERE, f"{tname}.stl"))
        log(f"{tname}: watertight, 1 body, colours disjoint, {tw.volume/1000:.2f} cm3")

    # --- colour boundaries are pure layer heights (whole-layer changes only)
    def zr(m):
        b = m.bounding_box(); return round(b[2], 6), round(b[5], 6)
    assert zr(ta["white"]) == (0, FLOOR) and zr(ta["red"]) == (FLOOR, FLOOR + STEP) \
        and zr(ta["black"]) == (FLOOR + STEP, T)
    assert zr(tb["black"]) == (0, FLOOR) and zr(tb["red"]) == (FLOOR, T)
    for z in (FLOOR, FLOOR + STEP, T):
        assert abs(z / LAYER - round(z / LAYER)) < 1e-9, z
    log("colour changes fall exactly on layer boundaries: "
        f"A white->red @ {FLOOR}, red->black @ {FLOOR+STEP}; B black->red @ {FLOOR}")

    # --- thin features: every printed region and every gap >= 0.8 mm (2 lines)
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        for col, m in parts.items():
            b = m.bounding_box()
            cs = m.slice((b[2] + b[5]) / 2)
            loss = min_feature_loss(cs, 0.4)
            hole_loss = min_feature_loss(rect2(-S, S, -S, S) - cs, 0.4)
            assert loss < 0.01 and hole_loss < 0.01, (tname, col, loss, hole_loss)
            log(f"{tname}/{col}: area lost to <0.8 mm features {loss*100:.2f} %, "
                f"gaps lost {hole_loss*100:.2f} %")

    # --- assembly
    faces = [("-y", "A"), ("+x", "B"), ("+y", "A"), ("-x", "B")]
    asm = {"red": core, "black": None, "white": None}
    blanks = []
    for face, kind in faces:
        parts = ta if kind == "A" else tb
        blank = tile_to_face(tile_blank(), face)
        assert (blank ^ core).volume() < 1e-3, f"tile {face} hits core"
        blanks.append(blank)
        for col, m in parts.items():
            pm = tile_to_face(m, face)
            asm[col] = pm if asm[col] is None else asm[col] + pm
    for a in range(4):
        for b in range(a + 1, 4):
            assert (blanks[a] ^ blanks[b]).volume() < 1e-3, "tiles collide"
    cube_part = core ^ box(-S, S, -S, S, 0, S)
    filled = cube_part + blanks[0] + blanks[1] + blanks[2] + blanks[3]
    cover = filled.volume() / S ** 3
    assert cover > 0.995, cover
    bb = filled.bounding_box()
    assert np.allclose(bb, (-S / 2, -S / 2, 0, S / 2, S / 2, S), atol=1e-6), bb
    log(f"assembly: no collisions, outer faces flush to a {S} mm cube, "
        f"cube {cover*100:.2f} % filled (rest = {GAP} mm mitre clearance)")

    for col, m in asm.items():
        to_trimesh(m).export(os.path.join(HERE, "preview", f"assembled_{col}.stl"))
    with open(os.path.join(HERE, "preview", "report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print("\n".join(report["checks"]))


if __name__ == "__main__":
    main()
