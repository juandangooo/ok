// Every drawing in the manual. Each function returns one <svg>.
import { k, G, figure, painter } from "./lib.mjs";
import { printer, interior, W, D, H } from "./printer.mjs";

const box = (x, y, w, d, z0, z1) => k.boxCorners({ x, y, w, d, r: 0 }, z0, z1);
const PLATE = { x: 0, y: 0, w: 128, d: 128, r: 5 };

// ---------- helpers ----------
function bed(c, { pins = true, z = 0 } = {}) {
  const fr = { x: -8, y: -8, w: 144, d: 144, r: 6 };
  c.put(c.halo(fr, z - 8, 2));
  c.put(c.slab(fr, z - 8, 4, { tone: "lo" }, 6, 0.6));
  c.put(c.slab(k.insetPlan(fr, 3), z - 4, 4, { tone: "mid" }, 6, 0.8));
  c.put(c.L(k.planOutline(k.insetPlan(fr, 9), z, c.P, 4), { tone: "faint" }));
  c.put(c.D(k.corners(fr, 6).map(([x, y]) => c.at([x, y, z - 4])), { size: 0.6 }));
  if (pins) for (const x of [24, 104]) c.put(c.cyl(x, -3, 2, z, 4, { tone: "hi" }, 16));
}
function plateFlat(c, z, { lit = false, plan = PLATE } = {}) {
  c.put(c.slab(plan, z, 1.4, { tone: "hi", lit, crease: "lo" }, 6, 0.6));
  c.put(c.L(k.planOutline(k.insetPlan(plan, 6), z + 1.4, c.P, 4), { tone: "faint" }));
  c.put(c.D(k.corners(plan, 3).map(([x, y]) => c.at([x, y, z + 1.4])), { size: 0.35 }));
}
// a plate bent about y: profile z(x)
function plateBent(c, zOf, { y0 = 0, d = 128, n = 16, x0 = 0, w = 128 } = {}) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const a = x0 + (w * i) / n, b = x0 + (w * (i + 1)) / n;
    const za = zOf(a), zb = zOf(b);
    const poly = [[a, za], [b, zb], [b, zb + 1.4], [a, za + 1.4]];
    items.push({ p: [(a + b) / 2, y0 + d / 2, (za + zb) / 2], svg: c.prism([0, y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1], poly, 0, d, { tone: "hi", crease: "none" }) });
  }
  c.put(`<g class="bent">${painter(c.P, items)}</g>`);
  const edge = (y) => c.line(Array.from({ length: n + 1 }, (_, i) => { const x = x0 + (w * i) / n; return [x, y, zOf(x) + 1.4]; }));
  const end = (x) => c.line([[x, y0, zOf(x)], [x, y0, zOf(x) + 1.4], [x, y0 + d, zOf(x) + 1.4], [x, y0 + d, zOf(x)]]);
  c.put(c.L(edge(y0) + edge(y0 + d) + end(x0) + end(x0 + w), { tone: "hi" }));
}
const drop = (c, p, r = 2.4) => { const [x, y] = c.at(p); return `<path class="water" d="M${x} ${y - r * 1.9}C${x + r * 0.9} ${y - r * 0.6} ${x + r} ${y + r * 0.2} ${x} ${y + r}C${x - r} ${y + r * 0.2} ${x - r * 0.9} ${y - r * 0.6} ${x} ${y - r * 1.9}Z"/>`; };
const oil = (c, p, r = 2.6) => drop(c, p, r).replace('class="water"', 'class="drop"');
const warnX = (c, p, s = 6) => { const [x, y] = c.at(p); return `<path class="warn" d="M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}"/>`; };
function bottle(c, x, y, z, h, r, { tip = "pump" } = {}) {
  c.put(c.halo({ x: x - r, y: y - r, w: 2 * r, d: 2 * r, r }, z, 1));
  c.put(c.turned([x, y, z], [0, 0, 1], [[0, r * 0.92], [1, r, 1], [h * 0.7, r, 1], [h * 0.85, r * 0.55, 1], [h * 0.9, r * 0.4]], { tone: "mid" }));
  c.put(c.L(k.sideArc(x, y, r, z + h * 0.25, c.P, 20) + k.sideArc(x, y, r, z + h * 0.55, c.P, 20), { tone: "faint" }));
  if (tip === "pump") {
    c.put(c.cyl(x, y, r * 0.4, z + h * 0.9, h * 0.12, { tone: "hi" }, 16));
    c.put(c.slab({ x: x - 1, y: y - 1.2, w: r * 1.2 + 1, d: 2.4, r: 0.8 }, z + h * 1.02, 2, { tone: "hi" }, 2, 0.2));
  } else {
    c.put(c.turned([x, y, z + h * 0.9], [0, 0, 1], [[0, r * 0.4], [h * 0.1, r * 0.36], [h * 0.35, 0.5], [h * 0.36, 0]], { tone: "hi" }));
  }
}

// ---------- page 1-4: printer views ----------
export const PRN_EXT = box(0, 0, W, D, -6, H + 4);
export function frontView({ badges = true } = {}) {
  return figure({ extent: PRN_EXT, width: 470, height: 430, pad: 14, azimuth: 52, badgeScale: 1.35, label: "Bambu Lab P2S from the front and right side, with its parts numbered.", draw: (c) => {
    c.put(printer(c, { view: "front" }));
    if (badges) c.put(
      c.badge([25, D, 128], 1), c.badge([25, D, 207], 2), c.badge([10, D - 30, 206], 3), c.badge([W - 19, D + 4, 156], 4),
      c.badge([130, 168, 100], 5), c.badge([W, 150, 198], 6), c.badge([110, D - 8, H + 4], 7));
  } });
}
export function backView() {
  return figure({ extent: PRN_EXT, width: 470, height: 430, pad: 14, azimuth: 232, badgeScale: 2, label: "The P2S from the back: power switch and socket, waste outlet and rear vents.", draw: (c) => {
    c.put(printer(c, { view: "back" }));
    c.put(c.badge([38, 0, 48], 4), c.badge([144, -16, 14], 7), c.badge([98, 0, 206], 6));
  } });
}
export function topView() {
  return figure({ extent: PRN_EXT, width: 470, height: 420, pad: 12, azimuth: 52, elevation: 58, badgeScale: 2, label: "The P2S from above with the lid off: purge wiper, air filter cover and airflow unit.", draw: (c) => {
    c.put(printer(c, { view: "top" }));
    c.put(c.badge([25, 22, 52], 1), c.badge([61, 6, 200], 3), c.badge([147, 20, 200], 4));
  } });
}

// ---------- page 2: reset ----------
const PL_EXT = [...box(-10, -10, 148, 148, -10, 40)];
export const liftPlate = () => figure({ extent: [...PL_EXT, [0, 0, 70]], width: 300, height: 150, azimuth: 40, label: "Lifting the cool plate off the bed by its edges.", draw: (c) => {
  bed(c);
  plateBent(c, (x) => 2 + Math.max(0, x - 0) * 0.42, {});
  c.put(c.badge([128, 64, 58], "A", { kind: "letter", r: 5 }), c.badge([128, 2, 58], "A", { kind: "letter", r: 5 }));
} });
export const flexPlate = () => figure({ extent: [...box(-10, 0, 150, 60, -30, 30)], width: 300, height: 150, azimuth: 40, label: "Flexing the plate so the print and loose bits come off.", draw: (c) => {
  const bin = { x: 10, y: 6, w: 110, d: 50, r: 4 };
  c.put(c.halo(bin, -30, 2), c.slab(bin, -30, 16, { tone: "lo" }, 6, 0.8));
  c.put(`<path class="cavity" d="${k.slabOf(k.insetPlan(bin, 3), -14, 0.01, c.P, 6).fill}"/>`);
  plateBent(c, (x) => 8 + 0.0042 * (x - 64) ** 2 * 2.2, { y0: 4, d: 52, n: 20 });
  for (const [x, y, z] of [[50, 20, -6], [62, 34, -10], [74, 26, -4], [58, 44, -12], [80, 40, -9]]) c.put(c.slab({ x, y, w: 4, d: 2.6, r: 0.5 }, z, 1.6, { tone: "mid" }, 2, 0));
} });
export const seatPlate = () => figure({ extent: PL_EXT, width: 300, height: 150, azimuth: 40, label: "The plate seated flat on the bed against its rear pins.", draw: (c) => {
  bed(c); plateFlat(c, 0.2, { lit: true });
  c.put(c.badge([24, -3, 6], "B", { kind: "letter", r: 5 }), c.badge([104, -3, 6], "B", { kind: "letter", r: 5 }));
} });

// ---------- page 3: wash ----------
export const gripPlate = () => figure({ extent: PL_EXT, width: 300, height: 150, azimuth: 40, label: "Hold the plate by its edges.", draw: (c) => {
  c.put(c.halo(PLATE, 0, 1)); plateFlat(c, 0);
  c.put(c.badge([0, 64, 2], "A", { kind: "letter", r: 5 }), c.badge([128, 64, 2], "A", { kind: "letter", r: 5 }));
} });
export const washPlate = () => figure({ extent: [...PL_EXT, [150, 140, 40]], width: 300, height: 150, azimuth: 40, label: "Washing the plate with warm water, dish soap and a soft sponge.", draw: (c) => {
  const mat = { x: -12, y: -12, w: 152, d: 152, r: 8 };
  c.put(c.slab(mat, -3, 3, { tone: "lo" }, 8, 0.6));
  for (let i = 1; i < 10; i++) c.put(c.L(k.lineOnTop([mat.x + i * 15.2, mat.y], [mat.x + i * 15.2, mat.y + mat.d], 0, c.P), { tone: "faint" }));
  plateFlat(c, 0.2);
  const sp = { x: 52, y: 52, w: 34, d: 22, r: 3 };
  c.put(c.slab(sp, 1.6, 7, { tone: "mid" }, 4, 0.4), c.slab(sp, 8.6, 5, { tone: "hi" }, 4, 0.6));
  c.put(c.D(k.dotGrid(sp.x + 4, sp.y + 4, 7, 4, 4.4, 13.6, c.P), { size: 0.4, tone: "lo" }));
  for (const [x, y, r] of [[48, 80, 3], [42, 74, 2], [92, 50, 2.6], [96, 44, 1.6], [40, 58, 1.8]]) { const [sx, sy] = c.at([x, y, 2]); c.put(`<circle class="bubble" cx="${sx}" cy="${sy}" r="${r}" fill="#fffdf8" stroke="var(--anatomy-mid)" stroke-width=".6"/>`); }
  bottle(c, 150, 120, 0, 44, 8);
} });
export const rinsePlate = () => figure({ extent: [...box(-10, -10, 160, 150, -10, 90)], width: 300, height: 150, azimuth: 40, label: "The rinsed plate standing in a rack to dry, water running off its lower edge.", draw: (c) => {
  const rack = { x: -6, y: 50, w: 150, d: 30, r: 3 };
  c.put(c.halo(rack, 0, 2), c.slab(rack, 0, 4, { tone: "lo" }, 4, 0.6));
  for (const x of [8, 40, 72, 104, 136]) c.put(c.cyl(x, 58, 1.4, 4, 26, { tone: "mid" }, 12), c.cyl(x, 72, 1.4, 4, 26, { tone: "mid" }, 12));
  c.put(c.prism([0, 64, 4], [1, 0, 0], [0, 1, 0], [0, 0, 1], [[-1, 0], [0.4, 0], [0.4, 82], [-1, 82]], 0, 128, { tone: "hi" }));
  for (const [x, z] of [[20, -4], [60, -8], [100, -5], [36, -14]]) c.put(drop(c, [x, 66, 4 + z + 2], 2));
  const towel = { x: -10, y: 96, w: 160, d: 40, r: 2 };
  c.put(c.slab(towel, 0, 3, { tone: "mid" }, 3, 0.4));
  for (const y of [102, 106, 128]) c.put(c.L(k.lineOnTop([towel.x, y], [towel.x + towel.w, y], 3, c.P), { tone: "lo" }));
} });
export const setPlate = () => figure({ extent: [...PL_EXT, [0, 0, 60]], width: 300, height: 150, azimuth: 40, label: "Checking the bed is clear, then lowering the plate onto it.", draw: (c) => {
  bed(c);
  for (const [x, y] of k.corners(PLATE, 0)) c.put(c.L(c.line([[x, y, 0], [x, y, 34]]), { tone: "lo", dotted: true }));
  plateFlat(c, 34, { lit: true });
} });

// ---------- page 4: dust ----------
export const cameraSwab = () => figure({ extent: [...box(0, 0, 120, 60, 0, 60)], width: 300, height: 140, azimuth: 40, label: "Cleaning the camera lens with a lightly damp swab.", draw: (c) => {
  const wall = { x: 0, y: 0, w: 60, d: 8, r: 1 };
  c.put(c.slab(wall, 0, 60, { tone: "mid" }, 3, 0.6));
  c.put(c.slab({ x: 14, y: 8, w: 32, d: 8, r: 3 }, 16, 30, { tone: "mid" }, 4, 0.6));
  c.put(c.disc([30, 16, 31], [0, 1, 0], 0, 2, 9, { tone: "hi" }), c.disc([30, 16, 31], [0, 1, 0], 2, 3, 5, { tone: "hi", lit: true }));
  c.put(c.D([[17, 19], [43, 19], [17, 43], [43, 43]].map(([x, z]) => c.at([x, 16, z])), { size: 0.5 }));
  c.put(c.tube([[37, 22, 33], [70, 40, 36], [118, 58, 38]], 1.1, "mid"));
  c.put(c.ball([35, 21, 32.6], 4, { tone: "hi" }));
} });
export const filterSwap = () => figure({ extent: [...box(0, 0, 130, 50, 0, 70)], width: 300, height: 140, azimuth: 40, label: "The slotted filter cover taken off and the pleated filter beside it.", draw: (c) => {
  const cover = { x: 0, y: 0, w: 56, d: 4, r: 1 };
  c.put(c.halo(cover, 0, 1), c.slab(cover, 0, 66, { tone: "mid" }, 3, 0.6));
  for (let i = 0; i < 8; i++) c.put(c.L(c.poly([[6 + i * 6, 4, 8], [9 + i * 6, 4, 8], [9 + i * 6, 4, 58], [6 + i * 6, 4, 58]]), { tone: "lo" }));
  const f = { x: 70, y: 6, w: 56, d: 20, r: 1 };
  c.put(c.halo(f, 0, 1), c.slab(f, 0, 56, { tone: "lo" }, 3, 0.6));
  c.put(c.slab(k.insetPlan(f, 2), 56, 2, { tone: "hi" }, 3, 0.3));
  for (let i = 0; i <= 13; i++) c.put(c.L(k.lineOnTop([f.x + 2 + i * 4, f.y + 2], [f.x + 2 + i * 4, f.y + f.d - 2], 58, c.P), { tone: i % 2 ? "lo" : "mid" }));
} });

// ---------- page 5: filament ----------
function spool(c, o, { rFlange = 32, width = 26, wound = 26, axis = [1, 0, 0] } = {}) {
  c.put(c.disc(o, axis, 0, 2, rFlange, { tone: "mid" }));
  const F = G.frameAlong(o, axis);
  c.put(c.S(G.disc(2, width, wound, F, c.P), { tone: "hi", crease: "none", inner: c.L(Array.from({ length: 9 }, (_, i) => G.arcOf(F, 3 + i * 2.6, wound, c.P)).join(""), { tone: "faint" }) }));
  c.put(c.disc(o, axis, width, width + 2, rFlange, { tone: "mid" }));
  c.put(c.disc(o, axis, width + 2, width + 3, 10, { tone: "lo" }));
  c.put(c.L(G.circleOf(F, width + 3, 6, c.P), { tone: "mid" }));
  c.put(c.L(G.spokesOf(F, width + 2, 12, rFlange - 4, 6, c.P), { tone: "lo" }));
}
export const spoolRoll = () => figure({ extent: [...box(-10, -40, 80, 80, -10, 70)], width: 300, height: 150, azimuth: 40, label: "A spool resting on two rollers, free to turn.", draw: (c) => {
  const base = { x: -6, y: -38, w: 50, d: 76, r: 3 };
  c.put(c.halo(base, -10, 2), c.slab(base, -10, 4, { tone: "lo" }, 3, 0.6));
  for (const y of [-20, 20]) c.put(c.turned([-4, y, 0], [1, 0, 0], [[0, 4], [46, 4]], { tone: "mid" }));
  spool(c, [2, 0, 30], {});
  c.put(c.tube([[16, 22, 52], [30, 40, 58], [60, 60, 60], [80, 66, 56]], 0.9, "mid"));
} });
export const tubePath = () => figure({ extent: [...box(0, 0, 230, 70, 0, 10)], width: 300, height: 150, azimuth: 40, label: "Left: a tube in gentle bends. Right: a tube pinched at a sharp kink.", draw: (c) => {
  for (const x0 of [0, 124]) { const b = { x: x0, y: 0, w: 106, d: 70, r: 4 }; c.put(c.halo(b, 0, 2), c.slab(b, 0, 3, { tone: "lo" }, 4, 0.6)); }
  const good = [[6, 14, 7], [30, 14, 7], [50, 20, 7], [60, 44, 7], [76, 58, 7], [100, 58, 7]];
  c.put(c.tube(good, 3, "hi"));
  const bad = [[130, 14, 7], [170, 14, 7], [182, 18, 7], [170, 30, 7], [184, 58, 7], [224, 58, 7]];
  c.put(c.tube(bad, 3, "hi"), warnX(c, [182, 22, 14], 6));
  for (const [x0, y] of [[6, 14], [100, 58], [130, 14], [224, 58]]) c.put(c.disc([x0, y, 7], [x0 < 50 || (x0 > 120 && x0 < 140) ? -1 : 1, 0, 0], -1, 4, 4.6, { tone: "mid" }));
} });
export const amsBox = () => figure({ extent: [...box(0, 0, 170, 70, 0, 70)], width: 300, height: 150, azimuth: 40, label: "The AMS with its lid shut and the humidity reading on the front.", draw: (c) => {
  const b = { x: 0, y: 0, w: 168, d: 68, r: 4 };
  c.put(c.halo(b, 0, 2), c.slab(b, 0, 46, { tone: "mid", inner: c.L(k.sideSeam(b, 40, c.P, 4), { tone: "faint" }) }, 4, 0.8));
  c.put(c.slab(k.insetPlan(b, 1), 46, 12, { tone: "mid" }, 4, 0.8));
  const win = k.insetPlan(b, 8);
  c.put(`<path class="glass" d="${c.poly([[win.x, win.y, 58], [win.x + win.w, win.y, 58], [win.x + win.w, win.y + win.d, 58], [win.x, win.y + win.d, 58]])}"/>`, c.L(k.planOutline(win, 58, c.P, 3), { tone: "mid" }));
  for (let i = 0; i < 4; i++) c.put(c.L(k.planOutline({ x: win.x + 6 + i * 38, y: win.y + 10, w: 26, d: 32, r: 12 }, 58, c.P, 6), { tone: "lo" }));
  c.put(`<path class="screen" d="${c.poly([[120, 68, 18], [152, 68, 18], [152, 68, 32], [120, 68, 32]])}"/>`);
  for (let i = 0; i < 4; i++) c.put(c.L(c.line([[124 + i * 6, 68, 21], [124 + i * 6, 68, 23 + i * 2]]), { tone: "faint" }));
  for (let i = 0; i < 4; i++) c.put(c.L(c.poly([[14 + i * 24, 68, 8], [30 + i * 24, 68, 8], [30 + i * 24, 68, 12], [14 + i * 24, 68, 12]]), { tone: "lo" }));
} });
export const spoolClip = () => figure({ extent: [...box(-40, -10, 80, 40, -40, 40)], width: 300, height: 150, azimuth: 40, label: "The loose end of the filament clipped into a hole in the spool flange.", draw: (c) => {
  spool(c, [0, 0, 0], { axis: [0, 1, 0], width: 24 });
  const F = G.frameAlong([0, 26, 0], [0, 1, 0]);
  for (const a of [0.6, 1.4, 2.2]) { const p = G.pointOf(F, 0, 27, a); c.put(c.L(G.circleOf(G.frameAlong(p, [0, 1, 0]), 0, 1.4, c.P, 12), { tone: "hi" })); }
  const p = G.pointOf(F, 0, 27, 1.4);
  c.put(c.tube([[p[0] + 12, p[1] - 14, p[2] + 6], [p[0] + 4, p[1] - 4, p[2] + 2], p], 0.9, "mid"));
  c.put(c.badge([p[0], p[1], p[2] + 8], "A", { kind: "letter", r: 5 }));
} });

// ---------- page 6: lube ----------
export const rodOil = () => figure({ extent: [...box(-20, -20, 70, 40, 0, 90)], width: 220, height: 150, azimuth: 40, label: "A smooth rod getting a drop of oil.", draw: (c) => {
  c.put(c.cyl(0, 0, 8, 0, 6, { tone: "mid" }, 24), c.cyl(0, 0, 3, 6, 80, { tone: "hi", lit: true, crease: "none" }, 20), c.cyl(0, 0, 7, 84, 4, { tone: "mid" }, 24));
  c.put(c.L(Array.from({ length: 4 }, (_, i) => k.sideArc(0, 0, 3, 30 + i * 8, c.P, 12)).join(""), { tone: "faint" }));
  c.put(oil(c, [3, 1, 56], 2.6));
  c.put(c.turned([16, 6, 62], [-0.6, -0.2, -0.3], [[0, 0.5], [10, 0.5], [12, 3], [26, 6], [44, 6]], { tone: "mid" }));
} });
export const screwGrease = () => figure({ extent: [...box(-20, -20, 70, 40, 0, 90)], width: 220, height: 150, azimuth: 40, label: "A threaded lead screw with grease on its spiral grooves.", draw: (c) => {
  c.put(c.cyl(0, 0, 8, 0, 6, { tone: "mid" }, 24), c.cyl(0, 0, 3.4, 6, 80, { tone: "mid", crease: "none" }, 20), c.cyl(0, 0, 7, 84, 4, { tone: "mid" }, 24));
  c.put(c.L(Array.from({ length: 24 }, (_, i) => k.sideArc(0, 0, 3.4, 9 + i * 3.1, c.P, 12)).join(""), { tone: "hi" }));
  c.put(c.ball([2.4, 2.4, 46], 4.2, { tone: "lo" }), c.ball([3, 1.2, 40], 3, { tone: "lo" }));
  c.put(c.turned([40, 8, 30], [-1, 0, 0.2], [[0, 5], [30, 5], [32, 2.4], [40, 2.4], [42, 1.2]], { tone: "mid" }));
} });
export const beltDry = () => figure({ extent: [...box(-10, -10, 130, 30, 0, 50)], width: 220, height: 150, azimuth: 40, label: "A toothed belt between two pulleys. It stays dry.", draw: (c) => {
  for (const x of [10, 110]) c.put(c.cyl(x, 6, 9, 0, 3, { tone: "lo" }, 28));
  for (const y of [-3, 15]) {
    const b = { x: 10, y, w: 100, d: 2, r: 0.6 };
    c.put(c.slab(b, 3, 8, { tone: "mid" }, 2, 0));
    for (let i = 0; i < 25; i++) c.put(c.L(c.line([[12 + i * 4, y + 2, 3], [12 + i * 4, y + 2, 11]]), { tone: "lo" }));
  }
  for (const x of [10, 110]) c.put(c.cyl(x, 6, 8, 3, 9, { tone: "mid" }, 28), c.cyl(x, 6, 2, 12, 2, { tone: "hi" }, 12));
  c.put(oil(c, [60, 6, 34], 3), warnX(c, [60, 6, 32], 9));
} });
export const lubeMap = () => figure({ extent: box(0, 0, W, D, 0, 30), width: 320, height: 170, azimuth: 52, elevation: 52, label: "Map of the bed-lift parts from above: smooth rods (A) and threaded screws (B).", draw: (c) => {
  const body = { x: 0, y: 0, w: W, d: D, r: 5 };
  c.put(c.L(k.planOutline(body, 0, c.P, 6), { tone: "lo" }));
  c.put(c.slab({ x: 28, y: 30, w: W - 56, d: D - 64, r: 4 }, 8, 6, { tone: "mid" }, 6, 0.8));
  c.put(c.slab({ x: 31, y: 33, w: W - 62, d: D - 70, r: 4 }, 14, 3, { tone: "hi" }, 6, 0.6));
  for (const [x, y] of [[22, 176], [W - 22, 176], [W / 2, 22]]) c.put(c.cyl(x, y, 4, 0, 24, { tone: "mid" }, 20), c.badge([x, y, 30], "B", { kind: "letter", r: 5.5 }));
  for (const [x, y] of [[22, 158], [W - 22, 158]]) c.put(c.cyl(x, y, 3, 0, 24, { tone: "hi" }, 20), c.badge([x, y, 30], "A", { kind: "letter", r: 5.5 }));
  c.put(c.slab({ x: 50, y: D - 2, w: W - 100, d: 4, r: 1 }, 0, 2, { tone: "lo" }, 2, 0));
} });

// ---------- page 7: print head ----------
export const headExploded = () => figure({ extent: [...box(-30, -30, 120, 150, -60, 110)], width: 470, height: 400, pad: 10, azimuth: 48, badgeScale: 1.35, label: "The print head pulled apart along its axes, parts numbered.", draw: (c) => {
  const { slab, cyl, L, P, turned, disc } = c;
  const x = 30, y = 20;
  // 4 hotend, dropped below
  c.put(L(c.line([[x, y, -6], [x, y, 2]]), { tone: "faint", dotted: true }));
  c.put(slab({ x: x - 12, y: y - 10, w: 24, d: 20, r: 1.5 }, -26, 12, { tone: "mid" }, 3, 0.6));
  c.put(L(k.sideSeam({ x: x - 12, y: y - 10, w: 24, d: 20, r: 1.5 }, -20, P, 3), { tone: "faint" }));
  c.put(turned([x, y, -14], [0, 0, 1], [[0, 7], [16, 7]], { tone: "hi", crease: "none", inner: L(Array.from({ length: 6 }, (_, i) => G.arcOf(G.frameAlong([x, y, -14], [0, 0, 1]), 2 + i * 2.6, 7, P)).join(""), { tone: "lo" }) }));
  c.put(turned([x, y, -26], [0, 0, -1], [[0, 4], [6, 4], [6, 2], [10, 2], [13, 0.5]], { tone: "hi", lit: true }));
  // 5 body
  const body = { x: x - 22, y: y - 18, w: 44, d: 34, r: 4 };
  c.put(c.halo(body, 6, 2));
  c.put(slab(body, 6, 62, { tone: "mid", inner: L(k.sideSeam(body, 20, P, 5) + k.sideSeam(body, 54, P, 5), { tone: "faint" }) }, 5, 1));
  for (let i = 0; i < 5; i++) c.put(L(c.poly([[body.x + body.w, y - 12 + i * 5, 24], [body.x + body.w, y - 10 + i * 5, 24], [body.x + body.w, y - 10 + i * 5, 48], [body.x + body.w, y - 12 + i * 5, 48]]), { tone: "lo" }));
  // 1 filament inlet on top, 2 cutter lever
  c.put(cyl(x - 6, y - 4, 6, 68, 4, { tone: "mid" }, 24), cyl(x - 6, y - 4, 3.6, 72, 10, { tone: "hi" }, 20));
  c.put(L(k.ring(x - 6, y - 4, 1.6, 82, P, 14), { tone: "hi" }));
  c.put(c.tube([[x - 6, y - 4, 96], [x - 6, y - 4, 110]], 2.2, "mid"));
  c.put(slab({ x: x + 10, y: y - 14, w: 8, d: 6, r: 1 }, 68, 4, { tone: "mid" }, 2, 0.3));
  c.put(slab({ x: x + 12, y: y - 13, w: 4, d: 4, r: 1 }, 72, 16, { tone: "hi", lit: true }, 2, 0.3));
  // 3 feed gears, pulled out to the right
  for (const [dz, ph] of [[34, 0], [46, 0.3]]) {
    const o = [x + 40, y - 2, dz];
    const F = G.frameAlong(o, [1, 0, 0]);
    c.put(c.S(G.disc(0, 5, 6, F, P), { tone: "hi", inner: L(G.ribsOf(F, 0, 5, 6, 22, P, { phase: ph }), { tone: "lo" }) }));
    c.put(disc(o, [1, 0, 0], 5, 7, 2, { tone: "mid" }));
  }
  c.put(L(c.line([[x + 23, y - 2, 40], [x + 38, y - 2, 40]]), { tone: "faint", dotted: true }));
  // 6 front cover and 7 fan, pulled out toward the viewer
  const cv = { x: x - 21, y: y + 34, w: 42, d: 4, r: 2 };
  c.put(L(c.line([[x, y + 16, 36], [x, y + 34, 36]]), { tone: "faint", dotted: true }));
  c.put(slab(cv, 8, 58, { tone: "hi" }, 3, 0.8));
  c.put(L(c.poly([[x - 16, y + 38, 14], [x + 16, y + 38, 14], [x + 16, y + 38, 60], [x - 16, y + 38, 60]]), { tone: "faint" }));
  const fo = [x, y + 58, 36];
  c.put(L(c.line([[x, y + 38, 36], [x, y + 50, 36]]), { tone: "faint", dotted: true }));
  c.put(slab({ x: x - 15, y: y + 50, w: 30, d: 8, r: 2 }, 21, 30, { tone: "mid" }, 3, 0.6));
  const FF = G.frameAlong(fo, [0, 1, 0]);
  c.put(c.S(G.disc(0, 0.6, 12, FF, P), { tone: "lo" }));
  c.put(L(G.spokesOf(FF, 0.6, 4, 11.4, 9, P, { sweep: 0.5 }), { tone: "mid" }), c.S(G.disc(0.6, 2, 4, FF, P), { tone: "hi" }));
  for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) c.put(c.D([c.at([x + dx, y + 58, 36 + dz])], { size: 0.6 }));
  c.put(c.badge([x - 6, y - 4, 112], 1), c.badge([x + 14, y - 11, 92], 2), c.badge([x + 47, y - 2, 56], 3), c.badge([x, y, -36], 4), c.badge([x + 22, y + 8, 14], 5), c.badge([x - 21, y + 38, 66], 6), c.badge([x, y + 60, 54], 7));
} });
const nozzle = (blob) => figure({ extent: [...box(-24, -24, 48, 48, -30, 30)], width: 140, height: 110, azimuth: 40, label: blob ? "A nozzle with melted plastic stuck around it." : "A clean nozzle.", draw: (c) => {
  c.put(c.slab({ x: -14, y: -12, w: 28, d: 24, r: 2 }, 0, 16, { tone: "mid" }, 3, 0.6));
  c.put(c.turned([0, 0, 0], [0, 0, -1], [[0, 6], [6, 6], [6, 3], [12, 3], [16, 0.8]], { tone: "hi", lit: !blob }));
  if (blob) { c.put(c.ball([2, 3, -4], 7, { tone: "lo" }), c.ball([-5, 4, 1], 5, { tone: "lo" }), c.ball([5, -3, -9], 4, { tone: "lo" })); c.put(warnX(c, [16, 16, -16], 5)); }
} });
export const nozzleClean = () => nozzle(false);
export const nozzleBlob = () => nozzle(true);

// ---------- page 8: first layer ----------
const layer = (kind) => figure({ extent: [...box(-6, -6, 92, 70, -4, 14)], width: 260, height: 120, azimuth: 40, label: `First-layer sample: ${kind}.`, draw: (c) => {
  const pl = { x: -6, y: -6, w: 92, d: 70, r: 3 };
  c.put(c.halo(pl, -4, 2), c.slab(pl, -4, 4, { tone: "mid" }, 4, 0.6));
  const n = kind === "gaps" ? 10 : 16, step = kind === "gaps" ? 6.4 : 3.8, r = kind === "gaps" ? 1.1 : 1.6;
  const items = [];
  for (let i = 0; i < n; i++) {
    const y = 2 + i * step;
    const pts = kind === "lifting"
      ? [[0, y, 1 + 9 * (1 - i / n) ** 2], [10, y, 1.6], [70, y, 1.6], [80, y, 1 + 9 * (1 - i / n) ** 2]]
      : [[0, y, r], [80, y, r]];
    items.push({ p: [40, y, 0], svg: c.tube(pts, r, "mid") });
  }
  c.put(painter(c.P, items));
} });
export const layerReady = () => layer("ready");
export const layerGaps = () => layer("gaps");
export const layerLifting = () => layer("lifting");
export const checkPlateMini = () => figure({ extent: PL_EXT, width: 200, height: 92, azimuth: 40, label: "Plate clean and seated.", draw: (c) => { bed(c); plateFlat(c, 0.2, { lit: true }); } });
export const checkFeedMini = () => figure({ extent: [...box(-10, -40, 120, 80, -10, 70)], width: 200, height: 92, azimuth: 40, label: "Spool and tube feed.", draw: (c) => {
  spool(c, [2, 0, 30], {});
  c.put(c.tube([[16, 22, 52], [40, 40, 52], [80, 50, 46], [110, 52, 40]], 2.4, "hi"));
} });
export const phoneMini = () => figure({ extent: [...box(0, 0, 60, 110, 0, 8)], width: 200, height: 92, azimuth: 40, elevation: 50, label: "A phone photo of the full error message.", draw: (c) => {
  const ph = { x: 0, y: 0, w: 56, d: 108, r: 8 };
  c.put(c.halo(ph, 0, 2), c.slab(ph, 0, 5, { tone: "mid" }, 8, 0.8));
  const sc = k.insetPlan(ph, 3);
  c.put(`<path class="screen" d="${k.slabOf(sc, 5, 0.01, c.P, 8).fill}"/>`);
  c.put(c.L(k.planOutline({ x: 10, y: 22, w: 36, d: 56, r: 2 }, 5, c.P, 2), { tone: "faint" }));
  for (const [y, w] of [[30, 26], [38, 30], [46, 18], [54, 28]]) c.put(c.L(k.lineOnTop([14, y], [14 + w, y], 5, c.P), { tone: "faint", free: true }));
  c.put(c.L(k.lineOnTop([20, 66], [36, 66], 5, c.P), { tone: "lo" }));
} });

// ---------- page 9: small row icons ----------
export const iconPlate = () => figure({ extent: PL_EXT, width: 90, height: 48, pad: 3, azimuth: 40, label: "", draw: (c) => { bed(c, { pins: false }); plateFlat(c, 0.2); } });
export const iconSpool = () => figure({ extent: [...box(0, -34, 30, 68, -34, 34)], width: 90, height: 48, pad: 3, azimuth: 40, label: "", draw: (c) => spool(c, [0, 0, 0], {}) });
export const iconSponge = () => figure({ extent: box(0, 0, 40, 26, 0, 14), width: 90, height: 48, pad: 3, azimuth: 40, label: "", draw: (c) => { const s = { x: 0, y: 0, w: 40, d: 26, r: 3 }; c.put(c.slab(s, 0, 8, { tone: "mid" }, 4, 0.4), c.slab(s, 8, 6, { tone: "hi" }, 4, 0.6)); } });
export const iconCamera = () => figure({ extent: box(0, 0, 40, 20, 0, 34), width: 90, height: 48, pad: 3, azimuth: 40, label: "", draw: (c) => { c.put(c.slab({ x: 0, y: 0, w: 36, d: 10, r: 3 }, 0, 32, { tone: "mid" }, 4, 0.6), c.disc([18, 10, 16], [0, 1, 0], 0, 2, 10, { tone: "hi" }), c.disc([18, 10, 16], [0, 1, 0], 2, 3, 5, { tone: "hi", lit: true })); } });
export const iconFilter = () => figure({ extent: box(0, 0, 56, 20, 0, 40), width: 90, height: 48, pad: 3, azimuth: 40, label: "", draw: (c) => { const f = { x: 0, y: 0, w: 56, d: 20, r: 1 }; c.put(c.slab(f, 0, 36, { tone: "lo" }, 3, 0.6)); for (let i = 0; i <= 13; i++) c.put(c.L(k.lineOnTop([2 + i * 4, 1], [2 + i * 4, 19], 36, c.P), { tone: "mid" })); } });
export const iconRod = () => figure({ extent: box(-10, -10, 20, 20, 0, 60), width: 90, height: 48, pad: 3, azimuth: 40, label: "", draw: (c) => { c.put(c.cyl(0, 0, 5, 0, 4, { tone: "mid" }, 20), c.cyl(0, 0, 2.4, 4, 52, { tone: "hi", crease: "none" }, 16)); c.put(oil(c, [2, 1, 36], 3)); } });
export const iconPrinter = () => figure({ extent: PRN_EXT, width: 90, height: 48, pad: 3, azimuth: 52, label: "", draw: (c) => { c.put(printer(c, { view: "front" })); } });

// ---------- page 10: tool tray ----------
export const toolTray = () => figure({ extent: [...box(0, 0, 300, 120, 0, 70)], width: 470, height: 200, pad: 10, azimuth: 42, label: "The care kit on a tray: soft cloth, soft brush, tweezers, dish soap, oil and grease.", draw: (c) => {
  const tray = { x: 0, y: 0, w: 300, d: 120, r: 8 };
  c.put(c.halo(tray, 0, 3), c.slab(tray, 0, 8, { tone: "mid" }, 8, 1));
  c.put(`<path class="cavity" d="${k.slabOf(k.insetPlan(tray, 5), 8, 0.01, c.P, 8).fill}"/>`, c.L(k.planOutline(k.insetPlan(tray, 5), 8, c.P, 8), { tone: "lo" }));
  // cloth, folded
  const cl = { x: 14, y: 18, w: 70, d: 56, r: 2 };
  c.put(c.slab(cl, 8, 3, { tone: "hi" }, 3, 0.4), c.slab({ x: cl.x, y: cl.y, w: cl.w, d: 36, r: 2 }, 11, 3, { tone: "hi" }, 3, 0.4));
  c.put(c.L(k.planOutline(k.insetPlan({ x: cl.x, y: cl.y, w: cl.w, d: 36, r: 2 }, 3), 14, c.P, 3), { tone: "faint", dotted: true }));
  // brush
  c.put(c.turned([20, 96, 14], [1, 0, 0], [[0, 0], [2, 3.4, 1], [44, 3.4, 1], [48, 2.6]], { tone: "mid" }));
  c.put(c.slab({ x: 68, y: 90, w: 18, d: 12, r: 2 }, 9, 10, { tone: "lo" }, 3, 0.4));
  for (let i = 0; i < 8; i++) c.put(c.L(c.line([[88, 91 + i * 1.4, 10], [100, 91 + i * 1.4, 10]]), { tone: "mid" }));
  // tweezers
  c.put(c.prism([110, 22, 9], [0, 0, 1], [1, 0, 0], [0, 1, 0], [[0, 0], [70, 4], [70, 6], [0, 3]], 0, 1.2, { tone: "hi" }));
  c.put(c.prism([110, 22, 10.2], [0, 0, 1], [1, 0, 0], [0, 1, 0], [[0, 0], [70, -4], [70, -2], [0, 3]], 0, 1.2, { tone: "hi" }));
  // soap, oil and grease
  bottle(c, 214, 40, 8, 48, 10);
  bottle(c, 248, 34, 8, 36, 7, { tip: "needle" });
  c.put(c.turned([200, 90, 15], [1, 0, 0], [[0, 0], [1, 7], [56, 7], [62, 3], [70, 3]], { tone: "mid" }));
  c.put(c.turned([270, 90, 15], [1, 0, 0], [[0, 4], [10, 4]], { tone: "hi" }));
} });
