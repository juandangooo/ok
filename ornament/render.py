"""Render preview PNGs with a small z-buffer rasterizer (numpy + matplotlib for PNG)."""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
COL = {"red": (0.90, 0.20, 0.20), "black": (0.08, 0.08, 0.08), "white": (0.96, 0.96, 0.96)}


def view_matrix(elev, azim):
    e, a = np.radians(elev), np.radians(azim)
    d = np.array([np.cos(e) * np.cos(a), np.cos(e) * np.sin(a), np.sin(e)])  # toward camera
    right = np.cross([0, 0, 1], d); right /= np.linalg.norm(right)
    up = np.cross(d, right)
    return np.stack([right, up, d]), d


def render(items, path, elev, azim, size=900, title=None, pad=1.15):
    R, d = view_matrix(elev, azim)
    light = d * 0.6 + np.array([-0.3, 0.2, 0.8]); light /= np.linalg.norm(light)
    allv = np.vstack([m.vertices for m, _ in items])
    c = (allv.max(0) + allv.min(0)) / 2
    p = (allv - c) @ R.T
    scale = size / (pad * 2 * np.abs(p[:, :2]).max())
    img = np.ones((size, size, 3))
    zb = np.full((size, size), -np.inf)
    for mesh, rgb in items:
        v = (mesh.vertices - c) @ R.T
        sx = v[:, 0] * scale + size / 2
        sy = size / 2 - v[:, 1] * scale
        n = mesh.face_normals
        k = 0.35 + 0.65 * np.clip(n @ light, 0, 1)
        for f, kk in zip(mesh.faces, k):
            x, y, z = sx[f], sy[f], v[f, 2]
            x0, x1 = int(max(np.floor(x.min()), 0)), int(min(np.ceil(x.max()), size - 1))
            y0, y1 = int(max(np.floor(y.min()), 0)), int(min(np.ceil(y.max()), size - 1))
            if x1 < x0 or y1 < y0:
                continue
            den = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2])
            if abs(den) < 1e-12:
                continue
            X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            w0 = ((y[1] - y[2]) * (X - x[2]) + (x[2] - x[1]) * (Y - y[2])) / den
            w1 = ((y[2] - y[0]) * (X - x[2]) + (x[0] - x[2]) * (Y - y[2])) / den
            w2 = 1 - w0 - w1
            inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
            zz = w0 * z[0] + w1 * z[1] + w2 * z[2]
            sub = zb[y0:y1 + 1, x0:x1 + 1]
            upd = inside & (zz > sub)
            sub[upd] = zz[upd]
            img[y0:y1 + 1, x0:x1 + 1][upd] = np.array(rgb) * kk + 0.03
    fig = plt.figure(figsize=(size / 150, size / 150), dpi=150)
    ax = fig.add_axes([0, 0, 1, 1]); ax.imshow(np.clip(img, 0, 1)); ax.axis("off")
    if title:
        ax.text(size / 2, 30, title, ha="center", fontsize=9)
    fig.savefig(path, facecolor="white")
    plt.close(fig)


def main():
    pv = os.path.join(HERE, "preview")
    L = lambda p: trimesh.load(os.path.join(HERE, p))
    asm = [(L(f"preview/assembled_{c}.stl"), COL[c]) for c in COL]
    render(asm, os.path.join(pv, "assembled_front.png"), 8, -45, title="Edge-on, like the logo")
    ims = []
    for i, az in enumerate((-45, 45, 135, 225)):
        render(asm, os.path.join(pv, f"_t{i}.png"), 8, az, size=500)
    from PIL import Image
    ims = [Image.open(os.path.join(pv, f"_t{i}.png")) for i in range(4)]
    o = Image.new("RGB", (2000, 500), "white")
    for i, im in enumerate(ims):
        o.paste(im, (i * 500, 0)); os.remove(os.path.join(pv, f"_t{i}.png"))
    o.save(os.path.join(pv, "turnaround.png"))

    core = L("core_fit3.stl")
    render([(core, COL["red"])], os.path.join(pv, "core.png"), 15, -60,
           title="core - two ribs with crush bumps on each side")
    import build
    items = [(core, COL["red"])]
    out = {"-y": (0, -1, 0), "+x": (1, 0, 0), "+y": (0, 1, 0), "-x": (-1, 0, 0)}
    for face, kind in build.FACES:
        cols = ("white", "red", "black") if kind == "A" else ("black", "red")
        k = 16 if face in ("-y", "+x") else 0
        for c in cols:
            m = build.to_trimesh(build.tile_to_face(
                trimesh_to_manifold(L(f"parts/tile_{kind}_{c}.stl")), face))
            m.apply_translation([v * k for v in out[face]])
            items.append((m, COL[c]))
    render(items, os.path.join(pv, "exploded.png"), 15, -45,
           title="Press each tile straight on - grooves grip the ribs like LEGO")
    # close-up of one rib with its crush bumps
    cm = trimesh_to_manifold(core)
    u = build.RIB_U[1]
    win = build.box(u - 4, u + 4, -build.S / 2 - 2, -build.S / 2 + 4, build.S / 2 - 6, build.S / 2 + 12)
    render([(build.to_trimesh(cm ^ win), COL["red"])], os.path.join(pv, "rib_closeup.png"), 20, -60,
           size=700, title="Rib with crush bumps (they squash a little as the tile goes on)")
    ft, fp = L("fit_test.stl"), L("fit_test_plate.stl")
    fp2 = fp.copy(); fp2.apply_translation([0, -30, 0])
    render([(ft, COL["red"]), (fp2, np.array(COL["black"]))], os.path.join(pv, "fit_test.png"), 30, -60,
           size=800, title="Fit test: block with ribs 1-5 (dots on top) + plate")
    p = os.path.join(HERE, "parts")
    for name, cols in (("tile_A", ("white", "red", "black")), ("tile_B", ("black", "red"))):
        items = [(trimesh.load(os.path.join(p, f"{name}_{c}.stl")), COL[c]) for c in cols]
        render(items, os.path.join(pv, f"{name}.png"), 55, -75, title=f"{name}.stl - as printed (face up)")
        render(items, os.path.join(pv, f"{name}_back.png"), -55, -75, title=f"{name} - back: the two grooves")


def trimesh_to_manifold(t):
    from manifold3d import Manifold, Mesh
    return Manifold(Mesh(vert_properties=np.asarray(t.vertices, dtype=np.float32),
                         tri_verts=np.asarray(t.faces, dtype=np.uint32)))


if __name__ == "__main__":
    main()
