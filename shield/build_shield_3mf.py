"""Pack the shield into a Bambu Studio project: HH_Shield_Ornament.3mf
One object, three colour parts (filament 1 red, 2 black, 3 white), centred on
a 256 x 256 bed, face down. Same per-part format Bambu Studio already loaded
for the cube project."""
import os
import zipfile

import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "HH_Shield_Ornament.3mf")
PARTS = [("red", 1), ("black", 2), ("white", 3)]
BED_X, BED_Y = 128, 128


def main():
    objs, comps, cfg = [], [], []
    for i, (col, fil) in enumerate(PARTS, start=1):
        m = trimesh.load(os.path.join(HERE, "parts", f"shield_{col}.stl"))
        assert m.is_watertight and m.volume > 0, col
        v = "".join(f'<vertex x="{a:.6f}" y="{b:.6f}" z="{c:.6f}"/>' for a, b, c in m.vertices)
        t = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in m.faces)
        objs.append(f'<object id="{i}" name="{col}" type="model"><mesh><vertices>{v}</vertices>'
                    f'<triangles>{t}</triangles></mesh></object>\n')
        comps.append(f'<component objectid="{i}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>')
        cfg.append(f'    <part id="{i}" subtype="normal_part">\n'
                   f'      <metadata key="name" value="{col}"/>\n'
                   f'      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n'
                   f'      <metadata key="extruder" value="{fil}"/>\n    </part>\n')
    pid = len(PARTS) + 1
    model = ('<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" '
             'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n'
             '<metadata name="Title">HH Shield Ornament</metadata>\n<resources>\n' + "".join(objs) +
             f'<object id="{pid}" name="HH shield" type="model"><components>{"".join(comps)}</components></object>\n'
             f'</resources>\n<build><item objectid="{pid}" transform="1 0 0 0 1 0 0 0 1 {BED_X} {BED_Y} 0" '
             'printable="1"/></build>\n</model>\n')
    settings = ('<?xml version="1.0" encoding="UTF-8"?>\n<config>\n'
                f'  <object id="{pid}">\n    <metadata key="name" value="HH shield"/>\n'
                '    <metadata key="extruder" value="1"/>\n' + "".join(cfg) + '  </object>\n</config>\n')
    ct = ('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
          '<Default Extension="config" ContentType="text/xml"/></Types>\n')
    rels = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>'
            '</Relationships>\n')
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", ct)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", model)
        z.writestr("Metadata/model_settings.config", settings)
    print(OUT, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
