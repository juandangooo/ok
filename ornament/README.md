# HH Cube Ornament (v2)

![assembled](preview/assembled_front.png)
![turnaround](preview/turnaround.png)

This is a real 45 mm box. Going around it you see black, red, black, red, with a red top
and bottom. The colours meet exactly on the cube edges, like the centre line of the logo.

The **H is set into each side**, not raised. The H is the floor of a pocket, and the
wall of that pocket shows up-and-left of every stroke, which is the logo's 3D look:

| Face | What you see, outer to inner |
|---|---|
| A (black) | black face with a **red** border line, then a **red** wall step, then a **white** H floor |
| B (red) | red face, then a **black** line, then a red sliver, then a **black** H floor, plus a black border line |

![faces](preview/faces_headon.png)

## Parts

| File | Qty | Colours, bottom to top (Z) |
|---|---|---|
| `core.stl` | 1 | Red |
| `tile_A.stl` | 2 | **White** 0–1.0, then **red** 1.0–1.6, then **black** 1.6–2.2 |
| `tile_B.stl` | 2 | **Black** 0–1.0, then **red** 1.0–2.2 |

Every colour change happens at a whole-layer height. You never need two colours
in the same layer, so this works **with an AMS or without one** (by doing manual swaps at pauses).

## How it goes together

The core is a red block with a red top cap and a red bottom cap, and the caps have 45° bevelled edges.
The four tiles are walls with all four edges mitred at 45°. Each tile glues flat onto
one side of the block. Its mitres seat against the caps and against the tiles next to it, so
every seam lands exactly on a cube edge. There is 0.15 mm of clearance per mitre.

## Quickest route: `HH_Cube_Ornament.3mf` (AMS)
Open it in Bambu Studio. Everything is on one plate, and every colour part already has its filament set:
**filament 1 = red, 2 = black, 3 = white.** Set those three filament colours in the left panel
(or sync them from the AMS), slice, and map them to your AMS slots when you send the job.
It's one print with no manual swaps. Glue the tiles on afterwards, as described below.

## Printing on a Bambu Lab P2S (Bambu Studio)

Use **0.20 mm layer height with a 0.20 mm first layer.** The colour heights are designed for that
(the default "0.20mm Standard" profile). Use PLA and a 0.4 mm nozzle.

### `core.stl` (red), 1 copy
- Print it as it loads, tab up. **No supports.** The top-cap bevel and the teardrop hole are both 45° overhangs.
- 2 walls, 15 % gyroid infill.

### `tile_A.stl`, 2 copies (plate 1)
- Start with **white**. Print it as it loads: face up, narrow side on the plate. No supports; the mitres are 45°.
- After slicing, open the Preview layer slider:
  - On the layer at **1.20 mm** (layer 6), right-click the **+** and choose **Change filament → red**
    (or **Add pause** if you have no AMS).
  - On the layer at **1.80 mm** (layer 9), do the same and choose **Change filament → black**.
- **Check this in the preview before you print.** Layer 6 should show red only around the H outline,
  and layers 9–11 should be black everywhere except the H and the thin border line.

### `tile_B.stl`, 2 copies (plate 2)
- Start with **black**.
- On the layer at **1.20 mm** (layer 6), choose **Change filament → red**.
- Check the preview: the top layers are red, with the H, the sliver lines and the border cut
  through to the black.

Optional: turn on ironing on the tiles' top surfaces for a smooth finish.

## Assembly
1. Dry-fit all four tiles first. Each one should seat flush with the cap edges and sit
   tight against its neighbours.
2. Go around the cube **A, B, A, B**. The back of each tile has a small engraved
   **arrow, which points to the top** (towards the tab). If a tile goes on upside down, its slivers
   will point down-right instead of up-left.
3. Put 4–5 small dots of CA (super glue) on the back of a tile, press it on for 20 s, and repeat for each tile.
4. Thread a ribbon or an ornament hook through the tab. The hole is 4.5 mm.

Finished size: 45 × 45 × 59 mm. Expect about 40 g.

## If the fit needs adjusting
All the dimensions are parameters at the top of `build.py`:
- `GAP`: mitre clearance (0.15). Raise it to 0.2 if the tiles don't seat.
- `T`, `FLOOR`, `STEP`: wall and colour heights. Keep them multiples of 0.2.
- `SHIFT`: sliver width.
- `H_*`: letter proportions.

```bash
pip install trimesh manifold3d numpy matplotlib pillow
python3 build.py && python3 render.py
```

`build.py` refuses to write the files unless every check passes. The results are in `preview/report.json`:
- every part is watertight and manifold, and every tile prints as one body on the bed
- the colour regions don't overlap, and each one lies exactly between its layer heights
- no feature and no gap is narrower than 0.8 mm (two nozzle lines)
- the assembled tiles don't collide with the core or with each other, and the outer surfaces form a true 45 mm cube

The colour-split STLs in `parts/` are only needed if you'd rather assign colours per part with the AMS.
