"""
HH Cube Ornament - parametric generator (v5, LEGO-style press fit, zero glue).

A real box: four full-colour side walls (black, red, black, red), red top and
bottom, every seam exactly on a cube edge (45-degree mitres). The H is recessed
into each side like the logo.

The tiles press on like LEGO:
  * each side of the core has two vertical ribs with small "crush bumps" on
    their sides; each tile has two matching straight grooves in its back;
  * the critical width (across the rib / groove) is printed in the XY plane on
    BOTH parts - the most accurate direction a printer has;
  * push a tile straight on: the bumps squash slightly and grip, LEGO-style.
  * the ribs are 1 mm off-centre, so a tile only fits the right way up.

Because grip depends on your printer, the core is generated in 5 fit levels.
Print fit_test.stl + fit_test_plate.stl first, find the number that grips best,
then print HH_Cube_fitN.3mf.

  core_fit1..5.stl  red: block + caps + ribs (bump interference 0.05..0.25 mm/side)
  tile_A.stl        x2  white floor / red step / black face (layer colour changes)
  tile_B.stl        x2  black floor / red face
  fit_test.stl      red: 5 ribs, numbered 1-5 by dots on top
  fit_test_plate.stl  the tile's groove on a small plate

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
T = 2.2             # wall (tile) and cap thickness
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

# LEGO-style ribs (core) and grooves (tile back). Tile coordinates:
# u = across the face, v = up, d = out of the block face (tile back at d = 0)
RIB_U = (-16.5, 15.5)   # rib centres - 1 mm off-centre so tiles only fit one way up
RIB_W = 3.0             # rib width (u)
RIB_H = 0.7             # rib height out of the face (d)
RIB_V = 18.0            # ribs run v = -18 .. +18
LEAD = 0.2              # 45-degree lead-in chamfer on the rib top edges
GROOVE_CLR = 0.10       # groove = rib + 0.10 per side (straight walls)
GROOVE_D = FLOOR - LAYER    # 0.8 deep: leaves one full floor layer (no see-through)
BUMP_L = 1.2            # crush bump length along the rib (v)
BUMP_V = (-15.0, -9.0, -3.0, 3.0, 9.0, 15.0)
FITS = {1: 0.05, 2: 0.10, 3: 0.15, 4: 0.20, 5: 0.25}   # bump interference per side (mm)

# hanging tab (part of the core)
TAB_W = 12.0
TAB_T = 5.5
TAB_RISE = 8.0      # cube top -> hole centre
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
    cx, cy = SHIFT, -SHIFT
    r = [rect2(-hw, -hw + H_STEM, -hh, hh),
         rect2(hw - H_STEM, hw, -hh, hh),
         rect2(-hw + H_STEM / 2, hw - H_STEM / 2, -H_BAR / 2, H_BAR / 2)]
    return [p.translate([cx, cy]) for p in r]


def h_extruded(k):
    """H swept k*SHIFT up-left (Minkowski sum with a segment) - the logo's
    3D look: the H plus the visible side wall of its extrusion."""
    out = None
    for p in h_pieces():
        q = CrossSection.batch_hull([p, p.translate([-k * SHIFT, k * SHIFT])]) if k else p
        out = q if out is None else out + q
    return out


def prism(cs, z0, z1):
    return cs.extrude(z1 - z0).translate([0, 0, z0])


def border_line():
    o = S / 2 - FRAME_INSET
    return rect2(-o, o, -o, o) - rect2(-o + FRAME_W, o - FRAME_W, -o + FRAME_W, o - FRAME_W)


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
    tri = CrossSection([[(-3, 9), (3, 9), (0, 13)]])
    stem = rect2(-1, 1, 5, 9)
    return prism(tri + stem, -1, 0.4)


def along_y(cs, y0, y1):
    """Extrude a profile drawn in (x, z) along +y from y0 to y1."""
    return cs.extrude(y1 - y0).translate([0, 0, -y1]).rotate([90, 0, 0])


def rib_profile(u):
    """Rib cross-section in (u, d): straight sides, 45-degree lead-in on top.
    Starts 0.3 inside the block so it fuses solidly (no flush faces)."""
    h = RIB_W / 2
    return CrossSection([[(u - h, -0.3), (u + h, -0.3), (u + h, RIB_H - LEAD),
                          (u + h - LEAD, RIB_H), (u - h + LEAD, RIB_H), (u - h, RIB_H - LEAD)]])


BUMP_FULL = 0.45        # bump grips at full height from the tile back up to here (d)


def bump_profile(u, side, interference):
    """Crush bump on one side of a rib, in (u, d). Full width from inside the
    block up to d = BUMP_FULL (where the tile groove wall rubs it), then it
    tapers back into the rib so the groove edge rides on gradually."""
    h = RIB_W / 2
    inner = u + side * (h - 0.2)                     # 0.2 inside the rib: fused, no flush face
    outer = u + side * (h + GROOVE_CLR + interference)
    lo, hi = sorted((inner, outer))
    taper_top = BUMP_FULL + 0.2
    if side > 0:
        pts = [(lo, -0.3), (hi, -0.3), (hi, BUMP_FULL), (lo, taper_top)]
    else:
        pts = [(lo, -0.3), (hi, -0.3), (hi, taper_top), (lo, BUMP_FULL)]
    return CrossSection([pts])


def bump_bite_area(interference):
    """Exact cross-section area of one bump that overlaps the groove wall."""
    h = RIB_W / 2
    bump = bump_profile(0.0, 1, interference)
    beyond_wall = rect2(h + GROOVE_CLR, h + 5, 0, GROOVE_D)
    return (bump ^ beyond_wall).area()


def ribs(interference=None, v0=-RIB_V, v1=RIB_V, centres=RIB_U, bump_v=BUMP_V):
    """Both ribs of one face (tile frame). interference=None -> plain ribs."""
    out = None
    for u in centres:
        m = along_y(rib_profile(u), v0, v1)
        if interference is not None:
            for vb in bump_v:
                for side in (-1, 1):
                    m = m + along_y(bump_profile(u, side, interference),
                                    vb - BUMP_L / 2, vb + BUMP_L / 2)
        out = m if out is None else out + m
    return out


def grooves(centres=RIB_U):
    """Straight grooves in the tile back (through the first GROOVE_D of it)."""
    out = None
    w = RIB_W / 2 + GROOVE_CLR
    for u in centres:
        m = box(u - w, u + w, -S, S, -1, GROOVE_D)
        out = m if out is None else out + m
    return out


# ---------------------------------------------------------------------- tiles
def make_tile_a():
    blank = tile_blank()
    white = slab(blank, 0, FLOOR) - up_arrow() - grooves()
    red = slab(blank, FLOOR, FLOOR + STEP) - prism(h_extruded(0), FLOOR - 1, T + 1)
    black = slab(blank, FLOOR + STEP, T) - prism(h_extruded(1) + border_line(), FLOOR - 1, T + 1)
    return {"white": white, "red": red, "black": black}


def make_tile_b():
    blank = tile_blank()
    groove = h_extruded(2) - h_extruded(1)
    cut = h_extruded(0) + groove + border_line()
    black = slab(blank, 0, FLOOR) - up_arrow() - grooves()
    red = slab(blank, FLOOR, T) - prism(cut, FLOOR - 1, T + 1)
    return {"black": black, "red": red}


# ----------------------------------------------------------------------- core
def tile_to_face(m, face):
    """Tile frame (back z=0, front z=T, H up = +y) -> cube side wall."""
    m = m.rotate([90, 0, 0])                       # +z -> -y, +y -> +z
    m = m.translate([0, -(S / 2 - T), S / 2])      # front lands on y = -S/2
    yaw = {"-y": 0, "+x": 90, "+y": 180, "-x": 270}[face]
    return m.rotate([0, 0, yaw])


FACES = [("-y", "A"), ("+x", "B"), ("+y", "A"), ("-x", "B")]


def make_tab():
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
    tip = HOLE_R * 1.2
    tear = CrossSection.batch_hull([
        CrossSection.circle(HOLE_R, SEG),
        rect2(-0.45, 0.45, tip - 0.01, tip),
    ]).translate([0, zc])
    hole = tear.extrude(TAB_T + 4).translate([0, 0, -TAB_T / 2 - 2]).rotate([90, 0, 0])
    return (plinth + tab) - hole


def make_core(interference=None):
    """interference=None -> plain ribs (no bumps), used by the checks."""
    i = S / 2 - T
    block = box(-i, i, -i, i, 0, S)
    bottom = Manifold.batch_hull([box(-S / 2, S / 2, -S / 2, S / 2, 0, EPS),
                                  box(-i, i, -i, i, T - EPS, T)])
    top = Manifold.batch_hull([box(-i, i, -i, i, S - T, S - T + EPS),
                               box(-S / 2, S / 2, -S / 2, S / 2, S - EPS, S)])
    core = block + bottom + top
    r = ribs(interference)
    for face, _ in FACES:
        core = core + tile_to_face(r, face)
    return core + make_tab()


def make_fit_test():
    """Calibration block, printed upright like the core: 5 ribs on its front
    face, rib n has bump interference FITS[n] and n dots on top above it."""
    pitch, n = 12.0, len(FITS)
    W, H, D = pitch * n, 26.0, 8.0
    blk = box(-W / 2, W / 2, 0, D, 0, H)            # front face at y = 0, ribs grow to -y
    out = blk
    for k, (num, inter) in enumerate(sorted(FITS.items())):
        u = -W / 2 + pitch * (k + 0.5)
        r = ribs(inter, v0=-11.0, v1=11.0, centres=(0.0,), bump_v=(-7.0, 0.0, 7.0))
        r = r.rotate([90, 0, 0]).translate([u, 0, H / 2])   # tile frame -> block front
        out = out + r
        for j in range(num):                                 # n dots = fit number
            x = u + (j - (num - 1) / 2) * 2.2
            out = out - Manifold.cylinder(1.0, 0.8, 0.8, 24).translate([x, D / 2, H - 0.8 + EPS])
    return out


def make_fit_plate():
    """Small plate with the tile's groove, printed face-up like a tile."""
    w, h = 10.0, 26.0
    plate = box(-w / 2, w / 2, -h / 2, h / 2, 0, T)
    return plate - grooves(centres=(0.0,))


# ----------------------------------------------------------- export / checks
def to_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(vertices=np.asarray(mesh.vert_properties)[:, :3],
                           faces=np.asarray(mesh.tri_verts), process=False)


def roundtrip_ok(m):
    """Save as STL (32-bit floats, what a slicer reads), reload, still watertight?"""
    import io
    buf = io.BytesIO(); to_trimesh(m).export(buf, file_type="stl"); buf.seek(0)
    r = trimesh.load(buf, file_type="stl")
    return r.is_watertight and r.is_winding_consistent and abs(r.volume - m.volume()) < 1e-2


def check_solid(name, m, bodies=1):
    t = to_trimesh(m)
    assert t.is_watertight and t.is_winding_consistent and t.volume > 0, name
    assert roundtrip_ok(m), f"{name}: breaks at slicer (float32) precision"
    n = len(m.decompose())
    assert n == bodies, (name, n)
    return t


def min_feature_loss(cs, r):
    a = cs.area()
    if a == 0:
        return 0.0
    opened = cs.offset(-r, circular_segments=SEG).offset(r, circular_segments=SEG)
    return 1 - opened.area() / a


def hits(a, b):
    return (a ^ b).volume() > 1e-3


def main():
    os.makedirs(os.path.join(HERE, "parts"), exist_ok=True)
    os.makedirs(os.path.join(HERE, "preview"), exist_ok=True)
    for old in ("lid.stl", "core.stl"):
        if os.path.exists(os.path.join(HERE, old)):
            os.remove(os.path.join(HERE, old))
    report = {"layer_height": LAYER, "checks": []}
    log = report["checks"].append

    plain = make_core(None)                       # ribs without bumps (for the checks)
    cores = {n: make_core(i) for n, i in FITS.items()}
    ta, tb = make_tile_a(), make_tile_b()

    # --- parts: manifold, one body, flat on the bed, survive float32
    for n, c in cores.items():
        t = check_solid(f"core_fit{n}", c)
        assert c.genus() == 1, (n, c.genus())    # only through-hole: the tab
        t.export(os.path.join(HERE, f"core_fit{n}.stl"))
    log(f"core_fit1..5: watertight, 1 body, only hole = tab, bbox {np.round(t.extents, 2).tolist()}")
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        whole = None
        for col, m in parts.items():
            check_solid(f"{tname}_{col}", m, bodies=len(m.decompose()))
            to_trimesh(m).export(os.path.join(HERE, "parts", f"{tname}_{col}.stl"))
            whole = m if whole is None else whole + m
        assert abs(whole.volume() - sum(m.volume() for m in parts.values())) < 1e-3
        tw = check_solid(tname, whole)
        assert abs(tw.bounds[0][2]) < 1e-9
        tw.export(os.path.join(HERE, f"{tname}.stl"))
    log("tile_A, tile_B: watertight, 1 body, colours disjoint")

    # --- colour boundaries are pure layer heights
    def zr(m):
        b = m.bounding_box(); return round(b[2], 6), round(b[5], 6)
    assert zr(ta["white"]) == (0, FLOOR) and zr(ta["red"]) == (FLOOR, FLOOR + STEP) \
        and zr(ta["black"]) == (FLOOR + STEP, T)
    assert zr(tb["black"]) == (0, FLOOR) and zr(tb["red"]) == (FLOOR, T)
    for z in (FLOOR, FLOOR + STEP, T, GROOVE_D):
        assert abs(z / LAYER - round(z / LAYER)) < 1e-9, z
    log("colour changes on layer boundaries: A white->red @1.0, red->black @1.6; B black->red @1.0")

    # --- thin features (>= 0.8 mm), every tile layer
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        for col, m in parts.items():
            b = m.bounding_box()
            for z in np.arange(b[2] + LAYER / 2, b[5], LAYER):
                cs = m.slice(z)
                assert min_feature_loss(cs, 0.4) < 0.01, (tname, col, z)
                assert min_feature_loss(rect2(-S, S, -S, S) - cs, 0.4) < 0.01, (tname, col, z)
    log("every tile layer: no printed feature or gap narrower than 0.8 mm")

    # --- no see-through holes; one full floor layer everywhere
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        whole = sum(list(parts.values())[1:], list(parts.values())[0])
        assert abs(whole.project().area() - tile_blank().project().area()) < 1e-3, tname
        fl_ = slab(whole, FLOOR - LAYER, FLOOR).project()
        full = slab(tile_blank(), FLOOR - LAYER, FLOOR).project()
        assert (full - fl_).area() < 1e-3, tname
    log("no see-through holes: the top floor layer is unbroken over the grooves and under every recess")

    # --- fit: rib vs groove, tile by tile
    placed = {}
    for face, kind in FACES:
        parts = ta if kind == "A" else tb
        placed[face] = {col: tile_to_face(m, face) for col, m in parts.items()}
    whole_tiles = {f: sum(list(p.values())[1:], list(p.values())[0]) for f, p in placed.items()}
    fl = list(whole_tiles.values())
    for a_ in range(4):
        for b_ in range(a_ + 1, 4):
            assert not hits(fl[a_], fl[b_]), "tiles collide"
    out = {"-y": (0, -1, 0), "+x": (1, 0, 0), "+y": (0, 1, 0), "-x": (-1, 0, 0)}
    side = {"-y": (1, 0, 0), "+x": (0, 1, 0), "+y": (1, 0, 0), "-x": (0, 1, 0)}
    mv = lambda m, vec, k: m.translate([c * k for c in vec])
    for f, w in whole_tiles.items():
        others = [o for g, o in whole_tiles.items() if g != f]
        # plain ribs: tile seats with clearance and the whole push-on path is free
        assert not hits(w, plain), (f, "tile hits plain ribs")
        for k in np.arange(0.05, 3.0, 0.05):
            assert not hits(mv(w, out[f], k), plain), (f, "push path", k)
            for o in others:
                assert not hits(mv(w, out[f], k), o), (f, "neighbour on the way in", k)
        # ribs hold it square: 0.15 mm sideways already hits a rib
        for sg in (1, -1):
            assert hits(mv(w, side[f], sg * 0.15), plain), (f, "sideways play")
        # keyed: upside down it cannot seat
        face_kind = dict(FACES)[f]
        parts = ta if face_kind == "A" else tb
        upside = tile_to_face(sum(list(parts.values())[1:], list(parts.values())[0]).rotate([0, 0, 180]), f)
        assert hits(upside, plain), (f, "upside-down tile seats")
    log("plain ribs: every tile pushes straight on with no collision, can't shift sideways "
        "(0.10 mm clearance), and won't seat upside down")

    # bumps: the ONLY overlap between tile and core is the planned crush of the bumps
    n_bumps = len(RIB_U) * 2 * len(BUMP_V)
    for n, inter in FITS.items():
        bite = sum((w ^ cores[n]).volume() for w in fl) / 4
        expect = n_bumps * BUMP_L * bump_bite_area(inter)
        assert abs(bite - expect) < 0.01 * expect + 1e-4, (n, bite, expect)
        assert bump_bite_area(inter) >= inter * BUMP_FULL * 0.99      # grips over >= 0.45 mm height
        log(f"fit {n}: {inter:.2f} mm grip per side, {n_bumps} crush bumps per tile, "
            f"{bite:.3f} mm3 of planned squash per tile")

    # --- closed cube
    filled = plain ^ box(-S, S, -S, S, 0, S)
    for w in fl:
        filled = filled + w
    bb = filled.bounding_box()
    assert np.allclose(bb, (-S / 2, -S / 2, 0, S / 2, S / 2, S), atol=1e-6), bb
    log(f"outer surfaces form a true {S} mm cube")

    # --- fit test: same rib/bump/groove functions as the real parts
    ft, fp = make_fit_test(), make_fit_plate()
    assert abs(ft.bounding_box()[2]) < 1e-9
    t = check_solid("fit_test", ft); t.export(os.path.join(HERE, "fit_test.stl"))
    t = check_solid("fit_test_plate", fp); t.export(os.path.join(HERE, "fit_test_plate.stl"))
    assert abs(t.bounds[0][2]) < 1e-9
    # the plate pressed onto test rib n must squash each bump exactly like a real tile on core_fitN
    pitch, H = 12.0, 26.0
    W = pitch * len(FITS)
    for k, (n, inter) in enumerate(sorted(FITS.items())):
        u = -W / 2 + pitch * (k + 0.5)
        on = fp.rotate([90, 0, 0]).translate([u, 0, H / 2])
        bite = (on ^ ft).volume()
        expect = 3 * 2 * BUMP_L * bump_bite_area(inter)
        assert abs(bite - expect) < 0.01 * expect + 1e-4, (n, bite, expect)
        per_bump_test = bite / 6
        per_bump_real = sum((w ^ cores[n]).volume() for w in fl) / 4 / n_bumps
        assert abs(per_bump_test - per_bump_real) < 0.01 * per_bump_real + 1e-5, (n, per_bump_test, per_bump_real)
        for k2 in np.arange(0.05, 2.0, 0.05):                  # plate comes off/on along the rib normal
            moved = on.translate([0, -k2, 0])
            if k2 > BUMP_FULL + 0.25:
                assert not hits(moved, ft), (n, k2)
    log("fit_test predicts the cube: the plate squashes each bump on test rib N exactly as "
        "much as a real tile does on core_fitN")
    log("fit_test: 5 ribs (1-5 dots on top), printed upright like the core; "
        "fit_test_plate: the tile groove, printed flat like a tile")

    asm = {"red": cores[3], "black": None, "white": None}
    for face, kind in FACES:
        for col, m in placed[face].items():
            asm[col] = m if asm[col] is None else asm[col] + m
    for col, m in asm.items():
        to_trimesh(m).export(os.path.join(HERE, "preview", f"assembled_{col}.stl"))
    with open(os.path.join(HERE, "preview", "report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print("\n".join(report["checks"]))


if __name__ == "__main__":
    main()
