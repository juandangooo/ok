"""Parametric 3-slot bin for 2-inch gaff tape rolls.

Based on the layout of the "TZe P-touch Label Bin" by Messner (MakerWorld,
CC BY-NC-SA): a rounded box with straight dividers. Changes for gaff tape:
the slots are sized for 2" rolls standing on edge, and each slot has a
curved cradle in the floor so the rolls stay centered and don't roll.

Run:  python3 make_bin.py            (writes gaff_tape_bin_3slot.stl / .3mf)
Needs: pip install trimesh manifold3d shapely numpy scipy
"""

import numpy as np
import trimesh
from shapely.geometry import box as rect

# ---- Measure your rolls and edit these (millimetres) ----------------------
TAPE_WIDTH = 50.8      # 2" tape (some brands are really 48 mm)
ROLL_OD = 127.0        # outside diameter of a FULL roll (~5" for 55 yd)
SLOTS = 3

WIDTH_CLEARANCE = 2.5  # side-to-side play per slot
LENGTH_CLEARANCE = 4.0 # end-to-end play per slot
WALL = 2.4             # outer wall (2 mm in the original)
DIVIDER = 2.0          # same as the original
FLOOR = 2.0            # same as the original
HEIGHT = 45.0          # overall height (original was 32 mm for cassettes)
CORNER_R = 3.0         # outer corner radius

CRADLE_R = 110.0       # radius of the floor curve; keep > ROLL_OD / 2
CRADLE_MAX = 12.0      # tallest the cradle gets at the slot ends
# ---------------------------------------------------------------------------

slot_w = TAPE_WIDTH + WIDTH_CLEARANCE
slot_l = ROLL_OD + LENGTH_CLEARANCE
outer_x = slot_l + 2 * WALL
outer_y = SLOTS * slot_w + (SLOTS - 1) * DIVIDER + 2 * WALL

assert CRADLE_R > ROLL_OD / 2, "cradle must be flatter than the roll"


def extrude(poly, h, z0=0.0):
    m = trimesh.creation.extrude_polygon(poly, h)
    m.apply_translation([0, 0, z0])
    return m


# Outer shell with rounded corners
outer = rect(0, 0, outer_x, outer_y).buffer(-CORNER_R).buffer(CORNER_R)
body = extrude(outer, HEIGHT)

# Cut each slot, then add its cradle back into the floor
cavities, cradles = [], []
for i in range(SLOTS):
    y0 = WALL + i * (slot_w + DIVIDER)
    pocket = rect(WALL, y0, WALL + slot_l, y0 + slot_w)
    pocket = pocket.buffer(-1.0).buffer(1.0)  # small inner fillet
    cavities.append(extrude(pocket, HEIGHT, FLOOR))

    # Cradle = block minus a big cylinder lying across the slot
    block = trimesh.creation.box(
        extents=[slot_l, slot_w, CRADLE_MAX],
        transform=trimesh.transformations.translation_matrix(
            [WALL + slot_l / 2, y0 + slot_w / 2, FLOOR + CRADLE_MAX / 2]
        ),
    )
    cyl = trimesh.creation.cylinder(radius=CRADLE_R, height=slot_w + 2,
                                    sections=256)
    cyl.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
    cyl.apply_translation([WALL + slot_l / 2, y0 + slot_w / 2, FLOOR + CRADLE_R])
    cradles.append(block.difference(cyl))

bin_mesh = body.difference(trimesh.boolean.union(cavities))
bin_mesh = trimesh.boolean.union([bin_mesh] + cradles)
bin_mesh.apply_translation([-outer_x / 2, -outer_y / 2, 0])

print(f"Outer size: {outer_x:.1f} x {outer_y:.1f} x {HEIGHT:.1f} mm")
print(f"Slot: {slot_w:.1f} wide x {slot_l:.1f} long")
print(f"Watertight: {bin_mesh.is_watertight}, volume {bin_mesh.volume/1000:.1f} cm3")

bin_mesh.export("gaff_tape_bin_3slot.stl")
bin_mesh.export("gaff_tape_bin_3slot.3mf")
