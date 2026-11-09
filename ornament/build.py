"""
HH Cube Ornament - parametric generator (v3, glue-free).

A real box: four full-colour side walls (black, red, black, red), red top and
bottom, every seam exactly on a cube edge (45-degree mitres). The H is recessed
into each side like the logo.

No glue:
  * each side tile has two dovetail grooves on its back and SLIDES DOWN onto
    matching dovetail rails on the core - it cannot come off outward;
  * the red lid PRESSES ON over the hanging tab (crush ribs) and stops the
    tiles sliding back up;
  * the ornament hangs from the tab, which is part of the core - the lid and
    tiles carry no load.

  core.stl     red: bottom cap + block + rails + hanging tab
  lid.stl      red: top cap
  tile_A.stl   x2  white floor / red step / black face (layer colour changes)
  tile_B.stl   x2  black floor / red face

Run:  python3 build.py
"""
import json
import os

import numpy as np
import trimesh
from manifold3d import CrossSection, JoinType, Manifold

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

# dovetail rails (core) / grooves (tile back)
RAIL_U = 16.0       # rails at +-16 mm from the face centre (clear of the H recess)
RAIL_NECK = 2.0     # rail width at the block face
RAIL_HEAD = 3.2     # rail width at its top (45-degree flanks)
RAIL_H = 0.6        # rail height; groove depth 0.8 leaves one full floor layer
RAIL_CLR = 0.20     # clearance rail <-> groove (covers 0.2 mm layer stair-stepping)

# hanging tab (part of the core, passes through the lid)
TAB_W = 12.0
TAB_T = 5.5
TAB_RISE = 8.0      # cube top -> hole centre
HOLE_R = 2.25
COLLAR = ((17.0, 10.0), (14.5, 8.5), 2.0)   # lid collar: bottom, top, height
SLOT_CLR = 0.10     # lid slot clearance around the tab
RIB_W, RIB_H = 1.0, 0.25   # crush ribs in the lid slot (0.15 mm interference)

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


def dovetail_2d(clr):
    """Dovetail profile in (u, d): u along the face, d out of the block face.
    clr = 0: the rail. clr > 0: the groove = rail grown by clr on every flank,
    continued straight through the tile's back face (d < 0)."""
    n, h = RAIL_NECK / 2, RAIL_HEAD / 2
    slope = (h - n) / RAIL_H
    rail = CrossSection([[(-n, 0), (n, 0), (h, RAIL_H), (-h, RAIL_H)]])
    if clr == 0:
        return rail
    ext = CrossSection([[(-(n - slope), -1), (n - slope, -1), (h, RAIL_H), (-h, RAIL_H)]])
    return ext.offset(clr, JoinType.Miter)


def along_y(cs, y0, y1):
    """Extrude a profile drawn in (x, z) along +y from y0 to y1."""
    return cs.extrude(y1 - y0).translate([0, 0, -y1]).rotate([90, 0, 0])


def rails_or_grooves(clr, y0, y1):
    out = None
    for u in (-RAIL_U, RAIL_U):
        m = along_y(dovetail_2d(clr).translate([u, 0]), y0, y1)
        out = m if out is None else out + m
    return out


# ---------------------------------------------------------------------- tiles
def tile_grooves():
    return rails_or_grooves(RAIL_CLR, -S, S) ^ box(-S, S, -S, S, -1, FLOOR - LAYER)


def make_tile_a():
    blank = tile_blank()
    white = slab(blank, 0, FLOOR) - up_arrow() - tile_grooves()
    red = slab(blank, FLOOR, FLOOR + STEP) - prism(h_extruded(0), FLOOR - 1, T + 1)
    black = slab(blank, FLOOR + STEP, T) - prism(h_extruded(1) + border_line(), FLOOR - 1, T + 1)
    return {"white": white, "red": red, "black": black}


def make_tile_b():
    blank = tile_blank()
    groove = h_extruded(2) - h_extruded(1)
    cut = h_extruded(0) + groove + border_line()
    black = slab(blank, 0, FLOOR) - up_arrow() - tile_grooves()
    red = slab(blank, FLOOR, T) - prism(cut, FLOOR - 1, T + 1)
    return {"black": black, "red": red}


# ------------------------------------------------------------------ core, lid
def tile_to_face(m, face):
    """Tile frame (back z=0, front z=T, H up = +y) -> cube side wall."""
    m = m.rotate([90, 0, 0])                       # +z -> -y, +y -> +z
    m = m.translate([0, -(S / 2 - T), S / 2])      # front lands on y = -S/2
    yaw = {"-y": 0, "+x": 90, "+y": 180, "-x": 270}[face]
    return m.rotate([0, 0, yaw])


FACES = [("-y", "A"), ("+x", "B"), ("+y", "A"), ("-x", "B")]


def tab_profile_solid(z_from):
    zc = S + TAB_RISE
    profile = CrossSection.batch_hull([
        CrossSection.circle(TAB_W / 2, SEG).translate([0, zc]),
        rect2(-TAB_W / 2, TAB_W / 2, z_from, zc),
    ])
    tab = profile.extrude(TAB_T).translate([0, 0, -TAB_T / 2]).rotate([90, 0, 0])
    tip = HOLE_R * 1.2
    tear = CrossSection.batch_hull([
        CrossSection.circle(HOLE_R, SEG),
        rect2(-0.45, 0.45, tip - 0.01, tip),
    ]).translate([0, zc])
    hole = tear.extrude(TAB_T + 4).translate([0, 0, -TAB_T / 2 - 2]).rotate([90, 0, 0])
    return tab - hole


def make_core():
    i = S / 2 - T
    block = box(-i, i, -i, i, 0, S - T)
    bottom = Manifold.batch_hull([box(-S / 2, S / 2, -S / 2, S / 2, 0, EPS),
                                  box(-i, i, -i, i, T - EPS, T)])
    core = block + bottom
    # rails: tile-frame y from bottom-cap top (z=T) to block top (z=S-T)
    rail = rails_or_grooves(0, -(S / 2 - T), S / 2 - T)
    for face, _ in FACES:
        core = core + tile_to_face(rail, face)
    return core + tab_profile_solid(S - T - 0.5)


def make_lid(ribs=True):
    i = S / 2 - T
    cap = Manifold.batch_hull([box(-i, i, -i, i, S - T, S - T + EPS),
                               box(-S / 2, S / 2, -S / 2, S / 2, S - EPS, S)])
    (bx, by), (tx, ty), ch = COLLAR
    collar = Manifold.batch_hull([box(-bx / 2, bx / 2, -by / 2, by / 2, S - 0.5, S),
                                  box(-tx / 2, tx / 2, -ty / 2, ty / 2, S + ch - EPS, S + ch)])
    sx, sy = TAB_W / 2 + SLOT_CLR, TAB_T / 2 + SLOT_CLR
    lid = (cap + collar) - box(-sx, sx, -sy, sy, S - T - 1, S + ch + 1)
    if ribs:
        for x in (-3.5, 3.5):
            for sgn in (-1, 1):
                y_out = sgn * sy
                y_in = sgn * (sy - RIB_H)
                lid = lid + box(x - RIB_W / 2, x + RIB_W / 2, min(y_in, y_out), max(y_in, y_out),
                                S - T, S + ch)
    return lid


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
    report = {"layer_height": LAYER, "checks": []}
    log = report["checks"].append

    core, lid = make_core(), make_lid()
    lid_noribs = make_lid(ribs=False)
    ta, tb = make_tile_a(), make_tile_b()

    # --- parts: manifold, one body, flat on the bed
    t = check_solid("core", core); t.export(os.path.join(HERE, "core.stl"))
    log(f"core: watertight, 1 body, bbox {np.round(t.extents, 2).tolist()}")
    lid_print = lid.translate([0, 0, -(S - T)])
    t = check_solid("lid", lid_print); t.export(os.path.join(HERE, "lid.stl"))
    assert abs(t.bounds[0][2]) < 1e-9
    log(f"lid: watertight, 1 body, bbox {np.round(t.extents, 2).tolist()}")
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
    for z in (FLOOR, FLOOR + STEP, T):
        assert abs(z / LAYER - round(z / LAYER)) < 1e-9, z
    log("colour changes on layer boundaries: A white->red @1.0, red->black @1.6; B black->red @1.0")

    # --- thin features (>= 0.8 mm = 2 nozzle lines), every colour slab
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        for col, m in parts.items():
            b = m.bounding_box()
            for z in np.arange(b[2] + LAYER / 2, b[5], LAYER):
                cs = m.slice(z)
                loss = min_feature_loss(cs, 0.4)
                hole_loss = min_feature_loss(rect2(-S, S, -S, S) - cs, 0.4)
                assert loss < 0.01 and hole_loss < 0.01, (tname, col, z, loss, hole_loss)
    log("every tile layer: no printed feature or gap narrower than 0.8 mm")

    # --- no see-through holes: seen from the front, every tile is fully solid
    for tname, parts in (("tile_A", ta), ("tile_B", tb)):
        whole = sum(list(parts.values())[1:], list(parts.values())[0])
        assert abs(whole.project().area() - tile_blank().project().area()) < 1e-3, tname
        # and every column through the tile has at least one full floor layer
        floor_layer = slab(whole, FLOOR - LAYER, FLOOR)
        assert abs(floor_layer.project().area() - slab(tile_blank(), FLOOR - LAYER, FLOOR).project().area()) < 1e-3, tname
    log("no see-through holes: the top floor layer is unbroken under every recess, line and groove")

    # --- assembled position: nothing collides
    placed = {}
    for face, kind in FACES:
        parts = ta if kind == "A" else tb
        placed[face] = {col: tile_to_face(m, face) for col, m in parts.items()}
    whole_tiles = {f: sum(list(p.values())[1:], list(p.values())[0]) for f, p in placed.items()}
    for f, w in whole_tiles.items():
        assert not hits(w, core), f"tile {f} hits core"
        assert not hits(w, lid), f"tile {f} hits lid"
    fl = list(whole_tiles.values())
    for a in range(4):
        for b in range(a + 1, 4):
            assert not hits(fl[a], fl[b]), "tiles collide"
    assert not hits(lid_noribs, core), "lid hits core"
    rib_bite = (lid ^ core).volume()
    expect = 4 * RIB_W * (RIB_H - SLOT_CLR) * (T + COLLAR[2])
    assert abs(rib_bite - expect) < 0.01, (rib_bite, expect)
    log(f"assembled: tiles, core and lid don't collide (lid crush ribs bite {rib_bite:.2f} mm3 into the tab)")

    # --- assembly path: tiles slide straight down onto the rails (lid off)
    for f, w in whole_tiles.items():
        for k in np.arange(0.25, S, 0.25):
            assert not hits(w.translate([0, 0, k]), core), (f, k)
    log("assembly path: every tile slides down its rails from above with no collision")
    # --- tiles locked: cannot move outward or sideways once on the rails
    out = {"-y": (0, -1, 0), "+x": (1, 0, 0), "+y": (0, 1, 0), "-x": (-1, 0, 0)}
    side = {"-y": (1, 0, 0), "+x": (0, 1, 0), "+y": (1, 0, 0), "-x": (0, 1, 0)}
    for f, w in whole_tiles.items():
        play = None
        for k in np.arange(0.05, 1.5, 0.05):
            if hits(w.translate([v * k for v in out[f]]), core):
                play = k; break
        assert play is not None and play <= 0.35, (f, play)
        for sgn in (1, -1):
            assert hits(w.translate([sgn * v * 0.5 for v in side[f]]), core), (f, "side")
    log(f"locked: tiles can't come off outward (play < {play:.2f} mm) or slide sideways")
    # --- lid goes on straight down; while seated it blocks every tile from rising
    for k in np.arange(0.25, 25, 0.25):
        assert not hits(lid_noribs.translate([0, 0, k]), core), k
    for f, w in whole_tiles.items():
        assert hits(w.translate([0, 0, 0.5]), lid), f"lid doesn't trap tile {f}"
    log("lid presses straight down over the tab and traps all four tiles")

    # --- closed cube
    filled = (core ^ box(-S, S, -S, S, 0, S)) + (lid_noribs ^ box(-S, S, -S, S, 0, S))
    for w in fl:
        filled = filled + w
    bb = filled.bounding_box()
    assert np.allclose(bb, (-S / 2, -S / 2, 0, S / 2, S / 2, S), atol=1e-6), bb
    log(f"outer surfaces form a true {S} mm cube")

    asm = {"red": core + lid, "black": None, "white": None}
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
