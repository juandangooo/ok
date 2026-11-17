"""
HH Cube Ornament - parametric generator (v4, snap-fit, zero glue).

A real box: four full-colour side walls (black, red, black, red), red top and
bottom, every seam exactly on a cube edge (45-degree mitres). The H is recessed
into each side like the logo.

The side tiles CLICK on:
  * the core has two spring arms per side (vertical cantilevers in slots, each
    with a hook on top that sticks 1 mm out of the face);
  * each tile has two matching pockets in its back - a narrow mouth (the first
    two printed layers form a lip) with a wider cavity behind it;
  * push a tile straight on: the pocket edge rides up the hook's ramp, bends
    the arm sideways 0.6 mm, the hook passes the lip and springs back - click.
  * both snaps sit above centre, so a tile only fits the right way up.

  core.stl     red: block + top and bottom caps + spring arms + hanging tab
  tile_A.stl   x2  white floor / red step / black face (layer colour changes)
  tile_B.stl   x2  black floor / red face

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

# snap-fit catches (tile coordinates: u = x across the face, v = y up, d = z out
# of the block face; the tile's back sits on d = 0)
SNAP_U = 15.0       # arm centre, +- from the face centre (clear of the H and border)
SNAP_V = 4.0        # hook centre height - above centre, so tiles only fit one way up
BEAM_T = 1.6        # arm thickness in its bending direction (u)
BEAM_D = 2.6        # arm depth into the core (d) - keeps 0.8 mm between corner slots
BEAM_L = 16.0       # arm length, root to tip (v)
HOOK = 0.6          # hook overhang = how far the arm bends while clicking on
BARB_H = 4.5        # hook height (v)
BARB_TOP = 1.05     # hook tip, distance out of the face
LIP = 0.4           # tile: lip thickness = first 2 printed layers
CAV_TOP = 1.2       # tile: pocket depth (1.0 mm of tile stays above it)
SNAP_CLR = 0.15     # clearance hook <-> pocket
DEFL_GAP = 0.9      # slot gap on the side the arm bends into (HOOK + 0.3)
SIDE_GAP = 0.6      # other slot gaps
PLA_E = 3500.0      # MPa, for the strain/force estimate

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


def _v_range():
    return SNAP_V - BARB_H / 2, SNAP_V + BARB_H / 2


def _right_and_left(m):
    """The +u snap as built, plus its mirror image for the -u side."""
    return m + m.mirror([1, 0, 0])


def barb(deflect=0.0):
    """Hook on the arm tip (right-hand snap, hook pointing +u = away from the
    centre). Profile in (u, d), extruded along v; its underside is cut at 45
    degrees so it prints on the vertical face without support.
    deflect > 0 = the arm bent toward the centre by that much (while clicking)."""
    u0, u1 = SNAP_U - BEAM_T / 2, SNAP_U + BEAM_T / 2
    catch = LIP + SNAP_CLR                       # hook's catch face (faces the lip)
    n0, n1 = u0 + 0.05, u1 - 0.05                # neck sits 0.05 inside the arm: no flush faces
    prof = CrossSection([[(n0, -1.0), (n1, -1.0), (n1, catch), (u1 + HOOK, catch),
                          (u1 + HOOK, catch + 0.1), (n0 + 0.3, BARB_TOP), (n0, BARB_TOP)]])
    v0, v1 = _v_range()
    v1 -= 0.03                                     # hook top just under the arm top
    solid = along_y(prof, v0, v1)
    wedge = Manifold.batch_hull([box(u0 - 1, u1 + HOOK + 1, v0, v0 + EPS, -1.5, 0),
                                 box(u0 - 1, u1 + HOOK + 1, v1 - EPS, v1, -1.5, v1 - v0)])
    return (solid ^ wedge).translate([-deflect, 0, 0])


def beam():
    u0, u1 = SNAP_U - BEAM_T / 2, SNAP_U + BEAM_T / 2
    v1 = _v_range()[1]
    return box(u0, u1, v1 - BEAM_L - 0.5, v1, -BEAM_D, -0.02)   # 0.02 below the face: no flush faces


def beam_slot():
    u0, u1 = SNAP_U - BEAM_T / 2, SNAP_U + BEAM_T / 2
    v1 = _v_range()[1]
    return box(u0 - DEFL_GAP, u1 + SIDE_GAP, v1 - BEAM_L, v1 + SIDE_GAP,
               -BEAM_D - SIDE_GAP, 1)


def pocket():
    """Pocket in the tile back (right-hand snap): narrow mouth through the
    lip layers, wider cavity behind it for the hook."""
    u0, u1 = SNAP_U - BEAM_T / 2, SNAP_U + BEAM_T / 2
    v0, v1 = _v_range()
    lo = u0 - HOOK - SNAP_CLR                      # room for the arm to bend in
    m_hi, c_hi = u1 + SNAP_CLR, u1 + HOOK + SNAP_CLR
    # one L-shaped profile (mouth + cavity) so there is no internal seam
    prof = CrossSection([[(lo, -1), (m_hi, -1), (m_hi, LIP), (c_hi, LIP),
                          (c_hi, CAV_TOP), (lo, CAV_TOP)]])
    return along_y(prof, v0 - SNAP_CLR, v1 + SNAP_CLR)


def snaps_core(deflect=0.0):
    """Arms + hooks for one face (tile frame)."""
    right = beam() + barb(deflect)
    return right + right.mirror([1, 0, 0])


def slots_core():
    return _right_and_left(beam_slot())


def pockets_tile():
    return _right_and_left(pocket())


# ---------------------------------------------------------------------- tiles
def make_tile_a():
    blank = tile_blank()
    white = slab(blank, 0, FLOOR) - up_arrow() - pockets_tile()
    red = slab(blank, FLOOR, FLOOR + STEP) - prism(h_extruded(0), FLOOR - 1, T + 1) - pockets_tile()
    black = slab(blank, FLOOR + STEP, T) - prism(h_extruded(1) + border_line(), FLOOR - 1, T + 1)
    return {"white": white, "red": red, "black": black}


def make_tile_b():
    blank = tile_blank()
    groove = h_extruded(2) - h_extruded(1)
    cut = h_extruded(0) + groove + border_line()
    black = slab(blank, 0, FLOOR) - up_arrow() - pockets_tile()
    red = slab(blank, FLOOR, T) - prism(cut, FLOOR - 1, T + 1) - pockets_tile()
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


def make_core(deflect=0.0, with_snaps=True):
    i = S / 2 - T
    block = box(-i, i, -i, i, 0, S)
    bottom = Manifold.batch_hull([box(-S / 2, S / 2, -S / 2, S / 2, 0, EPS),
                                  box(-i, i, -i, i, T - EPS, T)])
    top = Manifold.batch_hull([box(-i, i, -i, i, S - T, S - T + EPS),
                               box(-S / 2, S / 2, -S / 2, S / 2, S - EPS, S)])
    core = block + bottom + top
    for face, _ in FACES:
        core = core - tile_to_face(slots_core(), face)
    if with_snaps:
        for face, _ in FACES:
            core = core + tile_to_face(snaps_core(deflect), face)
    return core + make_tab()


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
    for old in ("lid.stl",):
        if os.path.exists(os.path.join(HERE, old)):
            os.remove(os.path.join(HERE, old))
    report = {"layer_height": LAYER, "checks": []}
    log = report["checks"].append

    core = make_core()
    core_bent = make_core(deflect=HOOK)          # every arm bent in by the full hook depth
    ta, tb = make_tile_a(), make_tile_b()

    # --- parts: manifold, one body, flat on the bed
    t = check_solid("core", core); t.export(os.path.join(HERE, "core.stl"))
    assert core.genus() == 1, ("core should have exactly one through-hole (the tab)", core.genus())
    log(f"core: watertight, 1 body, bbox {np.round(t.extents, 2).tolist()}")
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
        log(f"{tname}: watertight, 1 body, colours disjoint")

    # --- colour boundaries are pure layer heights
    def zr(m):
        b = m.bounding_box(); return round(b[2], 6), round(b[5], 6)
    assert zr(ta["white"]) == (0, FLOOR) and zr(ta["red"]) == (FLOOR, FLOOR + STEP) \
        and zr(ta["black"]) == (FLOOR + STEP, T)
    assert zr(tb["black"]) == (0, FLOOR) and zr(tb["red"]) == (FLOOR, T)
    for z in (FLOOR, FLOOR + STEP, T, LIP, CAV_TOP):
        assert abs(z / LAYER - round(z / LAYER)) < 1e-9, z
    log("colour changes on layer boundaries: A white->red @1.0, red->black @1.6; B black->red @1.0")

    # --- thin features (>= 0.8 mm = 2 nozzle lines), every tile layer
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        for col, m in parts.items():
            b = m.bounding_box()
            for z in np.arange(b[2] + LAYER / 2, b[5], LAYER):
                cs = m.slice(z)
                loss = min_feature_loss(cs, 0.4)
                hole_loss = min_feature_loss(rect2(-S, S, -S, S) - cs, 0.4)
                assert loss < 0.01 and hole_loss < 0.01, (tname, col, z, loss, hole_loss)
    log("every tile layer: no printed feature or gap narrower than 0.8 mm")

    # --- core around the arms: arm >= 0.8 mm thick, every slot gap >= 0.6 mm
    zs = S / 2 + SNAP_V - BARB_H / 2 - 4          # through the arms, below the hooks
    cs = core.slice(zs)
    assert min_feature_loss(cs, 0.4) < 0.01
    assert min_feature_loss(rect2(-S, S, -S, S) - cs, 0.299) < 0.01
    slots = [tile_to_face(slots_core(), f) for f, _ in FACES]
    for a_ in range(4):
        for b_ in range(a_ + 1, 4):
            assert not hits(slots[a_], slots[b_]), "arm slots of two faces run into each other"
    log("core: arms >= 0.8 mm, slot gaps >= 0.6 mm, slots of neighbouring faces stay apart")

    # --- no see-through holes and enough material over every pocket
    pk = pockets_tile()
    pocket_shadow = (pk ^ box(-S, S, -S, S, 0, T)).project()
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        whole = sum(list(parts.values())[1:], list(parts.values())[0])
        assert abs(whole.project().area() - tile_blank().project().area()) < 1e-3, tname
        floor_layer = slab(whole, FLOOR - LAYER, FLOOR).project()
        full = slab(tile_blank(), FLOOR - LAYER, FLOOR).project()
        assert (full - floor_layer - pocket_shadow).area() < 1e-3, tname
        cover = slab(whole, CAV_TOP, T).project()
        assert (pocket_shadow - cover).area() < 1e-3, tname
        assert slab(whole, CAV_TOP, T).volume() > 0
    log(f"no see-through holes; {T - CAV_TOP:.1f} mm of solid tile over every snap pocket")

    # --- assembled, arms relaxed: nothing collides, hooks sit inside the pockets
    placed = {}
    for face, kind in FACES:
        parts = ta if kind == "A" else tb
        placed[face] = {col: tile_to_face(m, face) for col, m in parts.items()}
    whole_tiles = {f: sum(list(p.values())[1:], list(p.values())[0]) for f, p in placed.items()}
    for f, w in whole_tiles.items():
        assert not hits(w, core), f"tile {f} hits core when seated"
    fl = list(whole_tiles.values())
    for a_ in range(4):
        for b_ in range(a_ + 1, 4):
            assert not hits(fl[a_], fl[b_]), "tiles collide"
    log("seated: tiles, core and hooks don't collide")

    out = {"-y": (0, -1, 0), "+x": (1, 0, 0), "+y": (0, 1, 0), "-x": (-1, 0, 0)}
    mv = lambda m, f, k: m.translate([c * k for c in out[f]])
    for f, w in whole_tiles.items():
        others = [o for g, o in whole_tiles.items() if g != f]
        # 1. pushing straight on works while the arms bend in (no collision anywhere)
        for k in np.arange(0.05, 3.0, 0.05):
            assert not hits(mv(w, f, k), core_bent), (f, "push-on path blocked", k)
            for o in others:
                assert not hits(mv(w, f, k), o), (f, "hits neighbour on the way in", k)
        # 2. ...and the arms MUST bend: with them relaxed the path is blocked -> it clicks
        blocked = [k for k in np.arange(0.05, 1.2, 0.05) if hits(mv(w, f, k), core)]
        assert blocked, (f, "hooks never engage")
        # 3. seated + relaxed: pulling it off is blocked within 0.25 mm -> locked
        play = next((k for k in np.arange(0.02, 1.0, 0.02) if hits(mv(w, f, k), core)), None)
        assert play is not None and play <= 0.25, (f, play)
    log(f"click: tiles push straight on while the arms bend {HOOK} mm, the relaxed hooks block "
        f"the path (so they must snap), and a seated tile is locked (pull-off play {play:.2f} mm)")

    # 4. an upside-down tile cannot seat, even with the arms bent
    for face, kind in FACES:
        parts = ta if kind == "A" else tb
        w = sum(list(parts.values())[1:], list(parts.values())[0]).rotate([0, 0, 180])
        assert hits(tile_to_face(w, face), core_bent), (face, "upside-down tile seats")
    log("keyed: a tile turned upside down will not seat")

    # --- arm mechanics (cantilever beam): strain and click force
    L = BEAM_L - BARB_H / 2
    strain = 3 * HOOK * BEAM_T / (2 * L ** 2)
    k_arm = PLA_E * BEAM_D * BEAM_T ** 3 / (4 * L ** 3)
    assert strain < 0.012, strain
    log(f"arm: bending strain {strain*100:.2f} % (PLA safe limit ~1.5 % even across layers), "
        f"about {k_arm*HOOK:.1f} N to bend each arm the full {HOOK} mm")

    # --- closed cube
    filled = core ^ box(-S, S, -S, S, 0, S)
    for w in fl:
        filled = filled + w
    bb = filled.bounding_box()
    assert np.allclose(bb, (-S / 2, -S / 2, 0, S / 2, S / 2, S), atol=1e-6), bb
    log(f"outer surfaces form a true {S} mm cube")

    asm = {"red": core, "black": None, "white": None}
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
