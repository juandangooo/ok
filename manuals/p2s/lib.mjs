// Shared drawing helpers for the P2S care manual. Everything is built on the anatomy kit.
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import * as T from "../../.claude/skills/anatomy/kit/tube.mjs";

export { k, G, T };

let clipId = 0;
export const nextId = (name) => `${name}${++clipId}`;

// A figure: its own camera fitted to `extent`, drawn by `draw(ctx)` into a list of strings.
export function figure({ extent, width, height, pad = 18, azimuth = 45, elevation = 30, label, draw, badgeScale = 1 }) {
  const P = k.fitProjection(extent, width, height, { pad, azimuth, elevation });
  const ctx = context(P);
  ctx.badgeScale = badgeScale;
  const body = draw(ctx) ?? ctx.out;
  return k.figureSvg({ width, height, label, body: Array.isArray(body) ? body.join("") : body });
}

export function context(P) {
  const at = (p) => k.iso(p, P);
  const out = [];
  const ctx = {
    P,
    out,
    at,
    put: (...s) => out.push(...s),
    S: (paths, style) => k.solidSvg(paths, style),
    L: (d, style) => k.lineSvg(d, style),
    D: (pts, style) => k.dotsSvg(pts, style),
    depth: (p) => k.depthOf(p, P),
    // closed polygon through world points
    poly: (pts) => `M${pts.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`,
    line: (pts) => `M${pts.map((p) => at(p).map((v) => v.toFixed(1)).join(" ")).join("L")}`,
    slab: (plan, z, h, style = {}, steps = 4, bevel = 0.5) => k.solidSvg(k.slabOf(plan, z, h, P, steps, bevel), style),
    cyl: (x, y, r, z, h, style = {}, steps = 40, bevel = 0) => k.solidSvg(k.cylinder(x, y, r, z, h, P, steps, bevel), style),
    halo: (plan, z, h) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`,
    ball: (c, r, style = {}) => k.solidSvg(G.sphereOf(c, r, P), style),
    // a turned part along any axis: profile [[s, r], ...]
    turned: (o, a, profile, style = {}, opts = {}) => k.solidSvg(G.solidOf(profile, G.frameAlong(o, a), P, opts), style),
    disc: (o, a, s0, s1, r, style = {}) => k.solidSvg(G.disc(s0, s1, r, G.frameAlong(o, a), P), style),
    prism: (o, a, u, v, polygon, s0, s1, style = {}) => k.solidSvg(G.prismOf(G.frameOf(o, a, u, v), polygon, s0, s1, P), style),
    tube: (pts, r, tone = "hi", opts = {}) =>
      T.tubePieces(pts, r, P, { spacing: Math.max(0.6, Math.min(1.6, r)), ...opts })
        .sort((a, b) => k.depthOf(a.mid, P) - k.depthOf(b.mid, P))
        .map((piece) => T.tubeSvg(piece, { tone }))
        .join(""),
    // a numbered marker sitting on a part
    badge: (p, text, { r = 6.2 * (ctx.badgeScale ?? 1), kind = "num" } = {}) => {
      const [x, y] = at(p);
      return `<g class="badge" data-kind="${kind}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/><text x="${x.toFixed(1)}" y="${(y + r * 0.36).toFixed(1)}" font-size="${(r * 1.08).toFixed(1)}">${text}</text></g>`;
    },
    // text lying on a face (for printed labels on the machine)
    topText: (p, z, text, opts) => k.faceTextSvg(k.topMatrix(p, z, P, "x"), text, opts),
    clip: (d, inner) => {
      const id = nextId("c");
      return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
    },
  };
  return ctx;
}

// The paper sticker marks used in the manual: tick and cross
export const tick = `<svg class="mark ok" viewBox="0 0 16 16"><path d="M2.5 8.6 6.4 12.2 13.6 3.8"/></svg>`;
export const cross = `<svg class="mark no" viewBox="0 0 16 16"><path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"/></svg>`;

// Sort a list of {p, svg} back to front
export function painter(P, items) {
  return items.sort((a, b) => k.depthOf(a.p, P) - k.depthOf(b.p, P) + (a.bias ?? 0) - (b.bias ?? 0)).map((i) => i.svg).join("");
}

// Helical lines on a threaded rod standing upright
export function threads(ctx, x, y, r, z0, z1, pitch) {
  const F = G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  return ctx.L(G.ribsOf(F, z0, z1, r, Math.round((z1 - z0) / pitch), ctx.P, { twist: Math.PI * 2 * 0.0 + ((z1 - z0) / pitch) * 0.0 + 0, phase: 0 }), { tone: "lo" });
}
