'use strict';
// ============================================================
// gear.js - the actual kit that leaves the shop, drawn so an engineer recognises it
// from the silhouette alone. Every piece is parts-as-paths in LOCAL coordinates with the
// origin at the middle of its footprint, so it can be placed, scaled and rotated anywhere.
// Each takes `mode`: 'riso' (dot-screened fills and crayon outlines) or 'blueprint'
// (chalk lines on night, no fills) - one geometry, two renderers.
// ============================================================

// local-coordinate helpers: everything is authored in a unit box and scaled at draw time
const GT = (x, y, s, rot = 0) => (px, py) => { const X = px * s, Y = py * s, ca = Math.cos(rot), sa = Math.sin(rot); return [x + X * ca - Y * sa, y + X * sa + Y * ca]; };
const GM = (T, pts) => pts.map(p => T(p[0], p[1]));
function gFill(c, mode, pts, ink, o = {}) {
  const T = o.T, P = poly(pts), xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  if (mode === 'blueprint') { c.save(); c.strokeStyle = PAL.chalk; c.lineWidth = o.w || 2.2; c.globalAlpha = o.al ?? .9; wob(c, pts, 1.6, o.seed || 1, true); c.stroke(); c.restore(); return; }
  dotScreen(c, P, box, { cell: o.cell || 10, color: ink, density: o.density ?? .55, angle: o.angle ?? .26, jitter: .5, seed: o.seed || 1 });
  crayon(c, pts, o.rim || INK(3), o.w || 4, (o.seed || 1) + 3, true);
}
const gRect = (T, x, y, w, h) => GM(T, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
function gCirc(c, mode, T, x, y, r, ink, seed, o = {}) {
  const pts = GM(T, ellPts(x, y, r, r, 0, 40).map(q => q));
  if (mode === 'blueprint') { c.save(); c.strokeStyle = PAL.chalk; c.lineWidth = 2; wob(c, pts, 1.2, seed, true); c.stroke(); c.restore(); return; }
  gFill(c, mode, pts, ink, { seed, density: o.density ?? .62, cell: o.cell || 9, w: o.w || 3 });
}

// ---------- Allen & Heath SQ-7: wide surface, big touchscreen on the RIGHT, one rotary row ----------
function sq7(c, mode, x, y, s, seed = 1, o = {}) {
  const T = GT(x, y, s, o.rot || 0), ink = o.ink ?? INK(0);
  gFill(c, mode, GM(T, [[-1, -.34], [1, -.34], [1, .34], [-1, .34]]), ink, { seed, density: .42, w: 5 });      // the surface
  gFill(c, mode, gRect(T, .30, -.27, .62, .40), INK(3), { seed: seed + 1, density: .82, cell: 8, w: 3 });      // the touchscreen, right
  if (mode !== 'blueprint') { c.save(); c.globalAlpha = .55;                                                    // meters on it
    for (let k = 0; k < 9; k++) { const h = .05 + ((k * 37) % 23) / 23 * .24; crayon(c, GM(T, [[.35 + k * .062, .10], [.35 + k * .062, .10 - h]]), INK(2), 3.2 * s / 200, seed + 20 + k); } c.restore(); }
  for (let k = 0; k < 8; k++) gCirc(c, mode, T, -.86 + k * .13, -.22, .045, INK(2), seed + 30 + k, { density: .8, cell: 7 });   // the rotary row
  const r = rng(seed + 50);
  for (let k = 0; k < 16; k++) { const fx = -.92 + k * .0775, lvl = .10 + r() * .34;                            // 16 faders + caps
    if (mode !== 'blueprint') crayon(c, GM(T, [[fx, -.02], [fx, .28]]), alpha(INK(3), .6), 2.6 * s / 200, seed + 60 + k);
    gFill(c, mode, gRect(T, fx - .026, .26 - lvl, .052, .045), k % 4 === 3 ? INK(1) : INK(2), { seed: seed + 80 + k, density: .9, cell: 6, w: 2.4 }); }
  gFill(c, mode, gRect(T, -1, .30, 2, .06), INK(3), { seed: seed + 99, density: .7, cell: 7, w: 3 });           // the armrest
}
// ---------- Behringer X32: screen centre-left, two rotary banks, 25 faders ----------
function x32(c, mode, x, y, s, seed = 1, o = {}) {
  const T = GT(x, y, s, o.rot || 0), ink = o.ink ?? INK(3);
  gFill(c, mode, GM(T, [[-1, -.36], [1, -.36], [1, .36], [-1, .36]]), ink, { seed, density: .34, w: 5 });
  gFill(c, mode, gRect(T, -.30, -.30, .54, .34), INK(0), { seed: seed + 1, density: .8, cell: 8, w: 3 });       // the screen
  for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) gCirc(c, mode, T, .36 + k * .15, -.24 + row * .17, .05, INK(2), seed + 30 + row * 9 + k, { density: .85, cell: 7 });
  for (let k = 0; k < 6; k++) gCirc(c, mode, T, -.90 + k * .10, -.22, .036, INK(1), seed + 50 + k, { density: .85, cell: 6 });
  const r = rng(seed + 70);
  for (let k = 0; k < 17; k++) { const fx = -.94 + k * .1125, lvl = .08 + r() * .36;
    if (mode !== 'blueprint') crayon(c, GM(T, [[fx, .02], [fx, .30]]), alpha(INK(0), .55), 2.6 * s / 200, seed + 90 + k);
    gFill(c, mode, gRect(T, fx - .034, -.02, .068, .036), [INK(0), INK(1), INK(2)][k % 3], { seed: seed + 110 + k, density: .95, cell: 5, w: 2 });   // scribble strip
    gFill(c, mode, gRect(T, fx - .030, .28 - lvl, .060, .046), INK(2), { seed: seed + 130 + k, density: .9, cell: 6, w: 2.4 }); }
}
// ---------- QSC K12.2: the trapezoid everyone owns. Wedge side, big LF grille, pole cup ----------
function k12(c, mode, x, y, s, seed = 1, o = {}) {
  const T = GT(x, y, s, o.rot || 0), ink = o.ink ?? INK(1);
  const B = [[-.52, -1], [.52, -1], [.72, .62], [-.72, .62]];
  gFill(c, mode, GM(T, B), ink, { seed, density: .5, w: 5 });
  gCirc(c, mode, T, 0, .02, .46, INK(3), seed + 2, { density: .30, cell: 12, w: 3 });                            // the LF grille
  gFill(c, mode, GM(T, [[-.34, -.80], [.34, -.80], [.30, -.50], [-.30, -.50]]), INK(3), { seed: seed + 3, density: .6, cell: 8, w: 3 });  // the horn
  if (mode !== 'blueprint') { crayon(c, GM(T, [[-.30, -1.04], [.30, -1.04]]), INK(3), 5 * s / 200, seed + 4);    // the handle
    crayon(c, GM(T, [[-.16, .62], [.16, .62]]), INK(3), 6 * s / 200, seed + 5); }                                // the pole cup
}
// ---------- JBL SRX906LA: a flown column. The splay is what makes it read as a line array ----------
function arrayColumn(c, mode, x, yTop, s, n = 5, seed = 1, o = {}) {
  const bw = s, bh = s * .30, spread = o.spread ?? .10;
  if (mode !== 'blueprint') { crayon(c, [[x, yTop - s * .52], [x, yTop - s * .14]], INK(3), 6, seed);            // the motor chain
    crayon(c, [[x - bw * .42, yTop - s * .14], [x + bw * .42, yTop - s * .14]], INK(3), 7, seed + 1); }          // the bumper
  let yy = yTop, ang = 0;
  for (let k = 0; k < n; k++) {
    ang += spread * (k / n);
    const T = GT(x + Math.sin(ang) * bh * k * .30, yy + bh * .5, 1, ang);
    const P = [[-bw * .50, -bh * .5], [bw * .50, -bh * .5], [bw * .44, bh * .5], [-bw * .44, bh * .5]];
    gFill(c, mode, GM(T, P), k % 2 ? INK(0) : INK(1), { seed: seed + 10 + k, density: .55, cell: 9, w: 4 });
    if (mode !== 'blueprint') hexLattice(c, [x - bw * .34, yy + bh * .16, bw * .68, bh * .56], 8, alpha(INK(3), .45), .5, .8);
    yy += bh * .96;
  }
  return yy;
}
// ---------- JBL SRX918S: the sub. Castors and a port are what say "sub" and not "box" ----------
function sub918(c, mode, x, y, s, seed = 1, o = {}) {
  const T = GT(x, y, s, o.rot || 0);
  gFill(c, mode, GM(T, [[-.62, -.52], [.62, -.52], [.62, .46], [-.62, .46]]), o.ink ?? INK(0), { seed, density: .5, w: 5 });
  gCirc(c, mode, T, -.24, -.02, .28, INK(3), seed + 2, { density: .28, cell: 12, w: 3 });
  gFill(c, mode, GM(T, [[.14, -.34], [.52, -.34], [.52, .30], [.14, .30]]), INK(3), { seed: seed + 3, density: .55, cell: 9, w: 3 });   // the port
  if (mode !== 'blueprint') for (const cx of [-.46, .46]) { c.fillStyle = INK(3); const p = T(cx, .54); c.beginPath(); c.arc(p[0], p[1], s * .055, 0, TAU); c.fill(); }   // castors
}
// ---------- a mic stand: tripod, shaft, boom, and the mic on the end ----------
function micStand(c, mode, x, y, s, seed = 1, o = {}) {
  const boom = o.boom ?? -.55, line = mode === 'blueprint' ? PAL.chalk : INK(3), w = 5 * s / 300;
  const top = [x, y - s * .92];
  c.save(); c.strokeStyle = line; c.lineWidth = w; c.lineCap = 'round';
  for (const d of [-1, 0, 1]) wob(c, [[x, y - s * .10], [x + d * s * .26, y], [x + d * s * .30, y + s * .03]], 1.4, seed + d + 2);   // the legs
  c.stroke(); c.restore();
  crayon(c, [[x, y - s * .10], top], line, 6 * s / 300, seed + 5);                                                // the shaft
  const tip = [x + Math.cos(boom) * s * .52, top[1] + Math.sin(boom) * s * .52];
  crayon(c, [top, tip], line, 5 * s / 300, seed + 6);                                                             // the boom
  handheld(c, mode, tip[0], tip[1], s * .22, seed + 7, { rot: boom + Math.PI });
  if (mode !== 'blueprint') { c.fillStyle = INK(2); c.beginPath(); c.arc(top[0], top[1], s * .028, 0, TAU); c.fill(); }   // the clutch
}
// ---------- the handheld everyone has held: ball grille, tapered body ----------
function handheld(c, mode, x, y, s, seed = 1, o = {}) {
  const T = GT(x, y, s, o.rot || 0);
  gFill(c, mode, GM(T, [[-.26, .10], [.26, .10], [.20, 1.5], [-.20, 1.5]]), o.ink ?? INK(3), { seed, density: .5, cell: 7, w: 3 });
  gCirc(c, mode, T, 0, 0, .32, o.ball ?? INK(3), seed + 1, { density: .42, cell: 6, w: 3 });
}
// ---------- wireless: a rack of receivers, antennas in a V, and the RF you cannot see ----------
function wirelessRack(c, mode, x, y, s, seed = 1, o = {}) {
  const T = GT(x, y, s, o.rot || 0);
  gFill(c, mode, GM(T, [[-1, -.22], [1, -.22], [1, .22], [-1, .22]]), INK(3), { seed, density: .46, w: 4.5 });
  for (const k of [0, 1]) gFill(c, mode, gRect(T, -.86 + k * .92, -.14, .70, .28), INK(0), { seed: seed + 2 + k, density: .7, cell: 7, w: 3 });
  const line = mode === 'blueprint' ? PAL.chalk : INK(3);
  for (const d of [-1, 1]) crayon(c, GM(T, [[d * .92, -.22], [d * 1.26, -.86]]), line, 5 * s / 200, seed + 10 + d);   // the antennas
  if (mode !== 'blueprint' && o.rf) for (let k = 1; k <= 3; k++) for (const d of [-1, 1]) {                            // and the RF
    const a0 = GM(T, [[d * 1.26, -.86]])[0], r = s * (.18 + k * .16) * o.rf, pts = [];
    for (let j = 0; j <= 16; j++) { const th = -Math.PI * .85 + j / 16 * Math.PI * .7; pts.push([a0[0] + Math.cos(th) * r * d, a0[1] + Math.sin(th) * r]); }
    c.save(); c.globalAlpha = .7 - k * .17; crayon(c, pts, INK(2), 3.4, seed + 40 + k * 3 + d); c.restore(); }
}
// ---------- a road case with the hound on the lid ----------
function roadCase(c, mode, x, y, w, h, seed = 1, o = {}) {
  const T = GT(x, y, 1, 0);
  gFill(c, mode, GM(T, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]), o.ink ?? INK(0), { seed, density: .5, w: 4.5 });
  if (mode === 'blueprint') return;
  crayon(c, [[x - w / 2 + 12, y - h * .18], [x + w / 2 - 12, y - h * .18]], INK(3), 3.4, seed + 1);          // the lid seam
  for (const cx of [x - w / 2 + 20, x + w / 2 - 20]) for (const cy of [y - h / 2 + 18, y + h / 2 - 18]) {     // ball corners
    c.fillStyle = INK(2); c.beginPath(); c.arc(cx, cy, 8, 0, TAU); c.fill(); }
  if (o.mark) logoMark(c, x, y + h * .12, h * .34, { flat: true });
}
