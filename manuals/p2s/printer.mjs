// A Bambu Lab P2S, built from parts. World units are half-millimetres: x across the front,
// y from the back (0) to the front door (D), z up. Positions of inner parts are schematic.
import { k } from "./lib.mjs";

export const W = 196, D = 203, H = 228, LID = 4;
const BODY = { x: 0, y: 0, w: W, d: D, r: 5 };
export const BED_Z = 96;
export const SCREWS = { front: [[22, 176], [W - 22, 176]], rear: [[W / 2, 22]] };
export const RODS = [[22, 158], [W - 22, 158]];
export const HEAD = { x: 102, y: 108, z: 160 }; // toolhead centre bottom

const F = (ctx) => ({
  front: (x0, x1, z0, z1, y = D) => ctx.poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]),
  side: (y0, y1, z0, z1, x = W) => ctx.poly([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]),
  back: (x0, x1, z0, z1) => ctx.poly([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]]),
  leftSide: (y0, y1, z0, z1) => ctx.poly([[0, y0, z0], [0, y1, z0], [0, y1, z1], [0, y0, z1]]),
});

// Inside of the chamber: drawn under a clip of whatever window looks into it.
export function interior(ctx, { plate = true, head = true, marks = {} } = {}) {
  const { S, L, P, slab, cyl, turned, put } = ctx;
  const out = [];
  const t = 6; // wall thickness
  // chamber shell seen from inside: floor and the far walls' corner lines
  out.push(`<path class="cavity" d="${ctx.poly([[t, t, 14], [W - t, t, 14], [W - t, D - t, 14], [t, D - t, 14]])}"/>`);
  out.push(`<path class="cavity-wall" d="${ctx.poly([[t, t, 14], [W - t, t, 14], [W - t, t, H - 4], [t, t, H - 4]])}"/>`);
  out.push(`<path class="cavity-wall" d="${ctx.poly([[t, t, 14], [t, D - t, 14], [t, D - t, H - 4], [t, t, H - 4]])}"/>`);
  out.push(L(ctx.line([[t, D - t, 14], [t, t, 14], [W - t, t, 14]]) + ctx.line([[t, t, 14], [t, t, H - 4]]), { tone: "lo" }));
  // rear wall: air filter cover (slotted) and the airflow unit
  const fc = [36, 86, 150, 196];
  const filter = ctx.poly([[fc[0], t + 0.4, fc[2]], [fc[1], t + 0.4, fc[2]], [fc[1], t + 0.4, fc[3]], [fc[0], t + 0.4, fc[3]]]);
  out.push(`<path class="panel" d="${filter}"/>`, L(filter, { tone: "mid" }));
  for (let i = 0; i < 9; i++) {
    const x = fc[0] + 5 + i * 5;
    out.push(L(ctx.poly([[x, t + 0.5, fc[2] + 6], [x + 2, t + 0.5, fc[2] + 6], [x + 2, t + 0.5, fc[3] - 6], [x, t + 0.5, fc[3] - 6]]), { tone: "lo" }));
  }
  out.push(ctx.D([[fc[0] + 2.5, fc[2] + 2.5], [fc[1] - 2.5, fc[2] + 2.5], [fc[0] + 2.5, fc[3] - 2.5], [fc[1] - 2.5, fc[3] - 2.5]].map(([x, z]) => ctx.at([x, t + 0.5, z])), { size: 0.6 }));
  const au = { x: 122, y: t, w: 50, d: 14, r: 2 };
  out.push(slab(au, 146, 52, { tone: "mid" }, 3, 0.6));
  for (let i = 0; i < 6; i++) out.push(L(k.planOutline({ x: au.x + 5, y: au.y + 3 + i * 1.6, w: au.w - 10, d: 0.6, r: 0.3 }, 198, P, 2), { tone: "lo" }));
  out.push(L(ctx.line([[au.x + 4, au.y + au.d, 150], [au.x + au.w - 4, au.y + au.d, 150]]), { tone: "faint" }));
  for (let i = 0; i < 7; i++) {
    const x = au.x + 6 + i * 6.4;
    out.push(L(ctx.poly([[x, au.y + au.d, 154], [x + 2.4, au.y + au.d, 154], [x + 2.4, au.y + au.d, 190], [x, au.y + au.d, 190]]), { tone: "lo" }));
  }
  // rear lead screw
  const [rx, ry] = SCREWS.rear[0];
  out.push(cyl(rx, ry, 4, 14, 6, { tone: "mid" }, 24));
  out.push(cyl(rx, ry, 2.2, 20, BED_Z - 20, { tone: "mid", crease: "none" }, 20));
  out.push(L(Array.from({ length: 12 }, (_, i) => k.sideArc(rx, ry, 2.2, 24 + i * 6, P, 10)).join(""), { tone: "lo" }));
  // purge wiper at rear left: a block with rubber fins
  const pw = { x: 14, y: 16, w: 22, d: 12, r: 1.5 };
  out.push(slab(pw, 14, 30, { tone: "mid" }, 3, 0.5));
  for (let i = 0; i < 5; i++) out.push(slab({ x: pw.x + 2 + i * 4, y: pw.y + 3, w: 1.6, d: 6, r: 0.4 }, 44, 5, { tone: "hi" }, 2, 0));
  // bed: carriage frame, heater, build plate
  const frame = { x: 28, y: 30, w: W - 56, d: D - 64, r: 4 };
  out.push(ctx.halo(frame, BED_Z - 6, 2));
  out.push(slab({ x: rx - 9, y: ry, w: 18, d: frame.y - ry + 4, r: 2 }, BED_Z - 6, 5, { tone: "mid" }, 3, 0.4));
  out.push(slab(frame, BED_Z - 6, 6, { tone: "mid" }, 6, 0.8));
  const heater = k.insetPlan(frame, 3);
  out.push(slab(heater, BED_Z, 3, { tone: "mid" }, 6, 0.6));
  if (plate) {
    const pl = { x: heater.x - 1, y: heater.y - 1, w: heater.w + 2, d: heater.d + 2, r: 4 };
    out.push(slab(pl, BED_Z + 3, 1.2, { tone: "hi", crease: "lo" }, 6, 0.5));
    out.push(L(k.planOutline(k.insetPlan(pl, 4), BED_Z + 4.2, P, 4), { tone: "faint" }));
  }
  for (const x of [heater.x + 18, heater.x + heater.w - 18]) out.push(cyl(x, heater.y - 3.5, 1.8, BED_Z + 3, 3, { tone: "mid" }, 14));
  // front screws and smooth rods
  for (let i = 0; i < 2; i++) {
    const [sx, sy] = SCREWS.front[i];
    const [ox, oy] = RODS[i];
    out.push(cyl(ox, oy, 3.6, 14, 6, { tone: "mid" }, 20), cyl(ox, oy, 2, 20, 176, { tone: "hi", crease: "none" }, 18));
    out.push(cyl(sx, sy, 4, 14, 6, { tone: "mid" }, 24), cyl(sx, sy, 2.2, 20, BED_Z - 20, { tone: "mid", crease: "none" }, 20));
    out.push(L(Array.from({ length: 12 }, (_, j) => k.sideArc(sx, sy, 2.2, 24 + j * 6, P, 10)).join(""), { tone: "lo" }));
    out.push(slab({ x: i ? frame.x + frame.w - 2 : sx - 6, y: oy - 6, w: i ? sx + 6 - (frame.x + frame.w - 2) : frame.x + 2 - (sx - 6), d: sy - oy + 12, r: 2 }, BED_Z - 8, 7, { tone: "mid" }, 3, 0.4));
    out.push(cyl(ox, oy, 4.2, BED_Z - 9, 9, { tone: "mid" }, 20));
  }
  // gantry: Y rods on each side, X rail across, toolhead
  const gz = 206;
  for (const x of [12, W - 12]) {
    out.push(turned([x, 10, gz], [0, 1, 0], [[0, 2], [D - 20, 2]], { tone: "hi", crease: "none" }));
    out.push(slab({ x: x - 5, y: HEAD.y - 10, w: 10, d: 20, r: 2 }, gz - 6, 12, { tone: "mid" }, 3, 0.5));
  }
  out.push(slab({ x: 12, y: HEAD.y - 8, w: W - 24, d: 7, r: 1.5 }, gz - 4, 9, { tone: "mid" }, 3, 0.6));
  out.push(turned([14, HEAD.y + 3, gz - 7], [1, 0, 0], [[0, 1.6], [W - 28, 1.6]], { tone: "hi", crease: "none" }));
  if (head) out.push(toolhead(ctx, HEAD.x, HEAD.y + 6, HEAD.z));
  // camera at the upper left, just inside the door frame
  out.push(ctx.disc([t, D - 30, 196], [1, 0, 0], 0, 5, 7, { tone: "mid" }));
  out.push(ctx.disc([t, D - 30, 196], [1, 0, 0], 5, 6.5, 3.2, { tone: "hi", lit: true }));
  return out.join("");
}

// The print head as it sits on the gantry (front cover facing +y)
export function toolhead(ctx, x, y, z) {
  const { slab, cyl, L, P, turned } = ctx;
  const out = [];
  const body = { x: x - 16, y: y - 14, w: 32, d: 26, r: 3 };
  out.push(slab(body, z + 4, 40, { tone: "mid" }, 5, 0.8));
  out.push(slab({ x: x - 15, y: y + 12, w: 30, d: 3, r: 1.2 }, z + 6, 34, { tone: "hi" }, 3, 0.6));
  out.push(L(ctx.poly([[x - 11, y + 15, z + 10], [x + 11, y + 15, z + 10], [x + 11, y + 15, z + 36], [x - 11, y + 15, z + 36]]), { tone: "lo" }));
  out.push(ctx.disc([x, y + 15, z + 23], [0, 1, 0], 0, 1, 9, { tone: "mid" }));
  out.push(L(ctx.line([[x - 6.4, y + 16, z + 23], [x + 6.4, y + 16, z + 23]]) + ctx.line([[x, y + 16, z + 16.6], [x, y + 16, z + 29.4]]), { tone: "lo" }));
  out.push(turned([x, y, z + 4], [0, 0, -1], [[0, 3.4], [6, 3.4], [6, 1.6], [10, 1.6], [12, 0.4]], { tone: "hi" }));
  out.push(turned([x - 4, y - 4, z + 44], [0, 0, 1], [[0, 3], [5, 3]], { tone: "mid" }));
  return out.join("");
}

// The whole printer. view: "front" (front and right side), "back" (back and left side), "top" (lid off, from above)
export function printer(ctx, { view = "front", marks = {} } = {}) {
  const { S, L, P, slab, cyl, put, at } = ctx;
  const f = F(ctx);
  const out = [];
  out.push(ctx.halo(BODY, -6, 6));
  for (const [x, y] of [[12, 12], [W - 12, 12], [12, D - 12], [W - 12, D - 12]].sort((a, b) => ctx.depth([...a, 0]) - ctx.depth([...b, 0])))
    out.push(cyl(x, y, 8, -6, 6, { tone: "lo" }, 24));
  out.push(S(k.slabOf(BODY, 0, H, P, 6, 1.2), { tone: "mid", inner: L(k.sideSeam(BODY, 12, P, 6), { tone: "faint" }) }));
  const lid = k.insetPlan(BODY, 1.5);
  if (view !== "top") out.push(slab(lid, H, LID, { tone: "mid" }, 6, 0.8));

  if (view === "front") {
    // left column: screen, USB
    out.push(`<path class="screen" d="${f.front(9, 41, 166, 200)}"/>`);
    out.push(L(f.front(7, 43, 164, 202), { tone: "mid" }));
    out.push(L(ctx.line([[13, D, 194], [26, D, 194]]) + ctx.line([[13, D, 189], [36, D, 189]]) + ctx.line([[13, D, 184], [31, D, 184]]), { tone: "faint", free: true }));
    out.push(L(f.front(13, 22, 170, 178) + f.front(26, 37, 170, 178), { tone: "faint" }));
    out.push(L(f.front(20, 30, 128, 132), { tone: "lo" }));
    out.push(L(ctx.line([[46, D, 12], [46, D, H]]), { tone: "faint" }));
    // door with glass, through which the chamber shows
    const glass = [54, W - 12, 22, H - 14];
    const doorWin = f.front(glass[0], glass[1], glass[2], glass[3]);
    const topWin = ctx.poly([[12, 12, H + LID], [W - 12, 12, H + LID], [W - 12, D - 12, H + LID], [12, D - 12, H + LID]]);
    out.push(ctx.clip(`${doorWin}${topWin}`, interior(ctx, { marks })));
    out.push(`<path class="glass" d="${doorWin}"/><path class="glass" d="${topWin}"/>`);
    out.push(ctx.clip(doorWin, L(ctx.line([[glass[0] + 30, D, glass[3]], [glass[0] + 80, D, glass[2]]]) + ctx.line([[glass[0] + 46, D, glass[3]], [glass[0] + 96, D, glass[2]]]), { tone: "faint" })));
    out.push(L(doorWin, { tone: "mid" }), L(f.front(50, W - 6, 16, H - 8), { tone: "lo" }), L(topWin, { tone: "mid" }));
    out.push(ctx.D([[50, 16], [W - 6, 16], [50, H - 8], [W - 6, H - 8]].map(([x, z]) => at([x + (x < 100 ? 2 : -2), D, z + (z < 100 ? 2 : -2)])), { size: 0.55 }));
    // door handle on the right edge of the door
    out.push(slab({ x: W - 22, y: D, w: 6, d: 4, r: 1.5 }, 92, 64, { tone: "hi" }, 3, 0.5));
    // right side: air intake / handle slot and lower vents
    out.push(`<path class="recess" d="${f.side(46, 160, 190, 206)}"/>`, L(f.side(46, 160, 190, 206), { tone: "mid" }));
    for (let i = 0; i < 16; i++) out.push(L(f.side(52 + i * 6.6, 54.4 + i * 6.6, 193, 203), { tone: "lo" }));
    for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) out.push(L(f.side(40 + i * 10, 46 + i * 10, 26 + r * 7, 29 + r * 7), { tone: "lo" }));
  }

  if (view === "back") {
    // rear vents: a large grille
    out.push(`<path class="recess" d="${f.back(34, 162, 118, 206)}"/>`, L(f.back(34, 162, 118, 206), { tone: "mid" }));
    for (let r = 0; r < 8; r++) for (let i = 0; i < 10; i++) out.push(L(f.back(40 + i * 12, 48 + i * 12, 123 + r * 10.4, 127 + r * 10.4), { tone: "lo" }));
    // waste outlet: chute through the back wall at the bottom
    out.push(`<path class="screen" d="${f.back(122, 166, 14, 34)}"/>`, L(f.back(118, 170, 10, 38), { tone: "mid" }));
    out.push(slab({ x: 120, y: -16, w: 48, d: 16, r: 1 }, 10, 3, { tone: "mid" }, 2, 0.4));
    // power socket and rocker switch
    out.push(L(f.back(20, 60, 18, 46), { tone: "mid" }));
    out.push(`<path class="screen" d="${f.back(26, 42, 24, 40)}"/>`);
    out.push(L(f.back(29, 39, 28, 36), { tone: "faint" }));
    out.push(slab({ x: 46, y: -2, w: 9, d: 2, r: 0.6 }, 24, 16, { tone: "hi" }, 2, 0.3));
    // filament inlet coupler and network/USB plates at top right of the back
    for (const x of [72, 90]) out.push(ctx.disc([x, 0, 214], [0, -1, 0], 0, 5, 4, { tone: "mid" }), ctx.disc([x, 0, 214], [0, -1, 0], 5, 9, 2, { tone: "hi" }));
    out.push(L(f.back(110, 150, 208, 220), { tone: "lo" }));
    // left side: plain panel with its lower vents
    for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) out.push(L(f.leftSide(40 + i * 10, 46 + i * 10, 26 + r * 7, 29 + r * 7), { tone: "lo" }));
  }

  if (view === "top") {
    const rim = 7;
    const topWin = ctx.poly([[rim, rim, H], [W - rim, rim, H], [W - rim, D - rim, H], [rim, D - rim, H]]);
    out.push(ctx.clip(topWin, interior(ctx, { marks })));
    out.push(L(topWin, { tone: "mid" }));
  }
  return out.join("");
}
