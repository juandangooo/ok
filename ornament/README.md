# HH Cube Ornament

![assembled](preview/assembled_front.png)

The logo as a real 45 mm cube. Seen edge-on, the two front faces read exactly like
the badge: black face with a white **H** inside a red border on the left, and a red
face with a black **H** and a black inset line on the right. The back two faces repeat
this, so it looks right from every side of the tree.

## Parts

| File | Qty | Colour | Notes |
|---|---|---|---|
| `core.stl` | 1 | Red | Cube body, 4 face pockets, hanging tab with a 4.5 mm hole |
| `tile_A.stl` | 2 | Black, then **white** from Z = 1.4 | Black plate, raised bevelled white H |
| `tile_B.stl` | 2 | Red, then **black** from Z = 1.4 | Red plate, raised black H and border line |

Finished size: 45 × 45 × 59 mm, including the tab. Expect about 35–40 g of PLA in total.

## Why it's split into tiles

Colour on a vertical wall would mean a filament swap on every layer: hundreds of
swaps, hours of purging and a big pile of waste. Printing the faces flat means each
tile only changes colour **once**, at a single height. That works with an AMS, and it
also works without one by doing a manual swap at a pause.

## Printing on a Bambu Lab P2S (Bambu Studio)

Shared settings: PLA, 0.4 mm nozzle, **0.20 mm layer height** (first layer 0.20), textured PEI or smooth plate.

### 1. `core.stl` (red)
- Print it as it loads: bottom face on the plate, tab pointing up. Use **no supports**.
  The hole is teardrop-shaped and the pocket lips are only 1.2 mm deep, so neither needs support.
- 2 walls, 10–15 % gyroid infill, 4 top and 4 bottom layers.
- Brim: none needed.

### 2. `tile_A.stl` × 2 (black → white)
- Load the black filament.
- Slice the file, then on the layer slider find the layer at **Z = 1.40 mm** (layer 7). Right-click the **+**
  and choose **Change filament** (with AMS), or **Add pause** (without AMS), then swap in white.
- Use 100 % infill, or just let 2 walls fill it. The tiles are thin and come out solid either way.
- Optional: turn on ironing for the top surface to get a glossy H.

### 3. `tile_B.stl` × 2 (red → black)
- Same as above: red filament, then change to **black at Z = 1.40 mm**.

> If you'd rather paint the colours per part with an AMS, the colour-split parts are in `parts/`.
> Select both STLs of a tile together, drag them in, answer **Yes** to "load as a single
> object with multiple parts", and assign a filament to each part. They share one
> origin, so they line up exactly.

## Assembly
1. Do a test fit first. Each tile drops into a pocket with 0.2 mm of clearance per side, and its
   surface sits flush with the red frame. Only the H stands proud, by 1 mm.
2. Arrange the faces alternately around the cube: **A, B, A, B**.
   Turn every tile so that the **H crossbar is horizontal** and the tab is up.
3. Glue each tile with 3–4 small dots of CA (super glue) or a thin layer of E6000 on the
   back. Press it down for 20 seconds.
4. Thread a ribbon or an ornament hook through the tab.

## Tweaking
Everything is parametric and lives in `build.py`: cube size, border width, H proportions, clearance,
and the tab and hole sizes. Regenerate with:

```bash
pip install trimesh manifold3d numpy matplotlib
python3 build.py && python3 render.py
```

`build.py` checks the geometry on every run and fails if any check fails:
- every part is watertight and manifold and is a single body sitting at Z = 0
- the colour parts don't overlap
- every installed tile clears the core and the other tiles
- the tile surface is flush with the cube face

The results are written to `preview/report.json`.
