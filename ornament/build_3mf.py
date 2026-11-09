"""
Pack the ornament into one Bambu Studio project: HH_Cube_Ornament.3mf

One plate (256 x 256, P2S/X1/P1 bed):
  core (red) + lid (red) + 2x tile_A (white/red/black parts) + 2x tile_B (black/red parts)

Each tile is ONE object made of colour PARTS, with a filament number per part
(Metadata/model_settings.config, Bambu's own per-part format):
  filament 1 = red, 2 = black, 3 = white

Run after build.py:  python3 build_3mf.py
"""
import os
import zipfile
from xml.sax.saxutils import escape

import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "HH_Cube_Ornament.3mf")
FIL = {"red": 1, "black": 2, "white": 3}

# (object name, [(part name, stl path, colour)], bed x, bed y)
OBJECTS = [
    ("HH core", [("core", "core.stl", "red")], 100, 145),
    ("HH lid", [("lid", "lid.stl", "red")], 160, 145),
]
for i, x in enumerate((53, 103)):
    OBJECTS.append((f"HH tile A{i+1}", [
        ("white floor", "parts/tile_A_white.stl", "white"),
        ("red step", "parts/tile_A_red.stl", "red"),
        ("black face", "parts/tile_A_black.stl", "black")], x, 70))
for i, x in enumerate((153, 203)):
    OBJECTS.append((f"HH tile B{i+1}", [
        ("black floor", "parts/tile_B_black.stl", "black"),
        ("red face", "parts/tile_B_red.stl", "red")], x, 70))


def mesh_xml(oid, name, mesh):
    v = "".join(f'<vertex x="{a:.6f}" y="{b:.6f}" z="{c:.6f}"/>' for a, b, c in mesh.vertices)
    t = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in mesh.faces)
    return (f'<object id="{oid}" name="{escape(name)}" type="model"><mesh>'
            f'<vertices>{v}</vertices><triangles>{t}</triangles></mesh></object>\n')


def main():
    objs, comps, builds, cfg = [], [], [], []
    oid = 1
    for name, parts, bx, by in OBJECTS:
        part_ids, part_cfg = [], []
        for pname, path, col in parts:
            m = trimesh.load(os.path.join(HERE, path))
            assert m.is_watertight and m.is_winding_consistent and m.volume > 0, path
            objs.append(mesh_xml(oid, pname, m))
            part_ids.append(oid)
            part_cfg.append(
                f'    <part id="{oid}" subtype="normal_part">\n'
                f'      <metadata key="name" value="{escape(pname)}"/>\n'
                f'      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n'
                f'      <metadata key="extruder" value="{FIL[col]}"/>\n'
                f'    </part>\n')
            oid += 1
        parent = oid; oid += 1
        c = "".join(f'<component objectid="{p}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>' for p in part_ids)
        comps.append(f'<object id="{parent}" name="{escape(name)}" type="model">'
                     f'<components>{c}</components></object>\n')
        builds.append(f'<item objectid="{parent}" transform="1 0 0 0 1 0 0 0 1 {bx} {by} 0" printable="1"/>')
        first = FIL[parts[0][2]]
        cfg.append(f'  <object id="{parent}">\n'
                   f'    <metadata key="name" value="{escape(name)}"/>\n'
                   f'    <metadata key="extruder" value="{first}"/>\n'
                   + "".join(part_cfg) + '  </object>\n')

    model = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<model unit="millimeter" xml:lang="en-US" '
             'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n'
             '<metadata name="Title">HH Cube Ornament</metadata>\n'
             '<resources>\n' + "".join(objs) + "".join(comps) + '</resources>\n'
             '<build>' + "".join(builds) + '</build>\n</model>\n')
    content_types = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                     '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                     '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                     '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
                     '<Default Extension="config" ContentType="text/xml"/>'
                     '</Types>\n')
    rels = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Target="/3D/3dmodel.model" Id="rel-1" '
            'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>'
            '</Relationships>\n')
    settings = '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n' + "".join(cfg) + '</config>\n'

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", model)
        z.writestr("Metadata/model_settings.config", settings)
    print(OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
