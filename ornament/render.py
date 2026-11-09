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
    asm = [(trimesh.load(os.path.join(pv, f"assembled_{c}.stl")), COL[c]) for c in COL]
    render(asm, os.path.join(pv, "assembled_front.png"), 8, -45, title="Edge-on, like the logo")
    for i, az in enumerate((-45, 45, 135, 225)):
        render(asm, os.path.join(pv, f"turn_{i}.png"), 8, az, size=500)
    render(asm, os.path.join(pv, "assembled_high.png"), 35, -70, title="From above")
    core = trimesh.load(os.path.join(HERE, "core.stl"))
    render([(core, COL["red"])], os.path.join(pv, "core.png"), 25, -60, title="core.stl - as printed (red)")
    p = os.path.join(HERE, "parts")
    for name, cols in (("tile_A", ("white", "red", "black")), ("tile_B", ("black", "red"))):
        items = [(trimesh.load(os.path.join(p, f"{name}_{c}.stl")), COL[c]) for c in cols]
        render(items, os.path.join(pv, f"{name}.png"), 55, -75, title=f"{name}.stl - as printed (face up)")
        render(items, os.path.join(pv, f"{name}_back.png"), -60, -75, title=f"{name} - back (bed side)")


if __name__ == "__main__":
    main()
