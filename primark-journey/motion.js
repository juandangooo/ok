/* The Primark Journey: continuous 30-second Etched Motion.
   Reuses the drawing kit (etch.js, drawing-kit.js, map-paths.js, hellhound-logo.js, openings.js).
   A three-second intro (case opens, SM58 and a JBL VRX ground stack come out, the map unfolds), then
   every opening lands on a steady beat: pin on the map (NYC and DC stores in real-geography close-ups),
   a big "now opening" callout, and a permanent line in the ledger below. */
(function () {
'use strict';
const W = 1080, H = 1350, DURATION = 30, FPS = 30;

/* ---------- Copy ---------- */
const counts = [0,0,0,3,7,11,17,25,28,32,35,36];
const titles = [['THE SOUND OF','OPENING DAY.'],null,null,['THE FIRST','OPENING DAYS.'],['THE JOURNEY','GROWS.'],['MORE DOORS.','MORE MOMENTS.'],['NEW PLACES.','SAME PRIDE.'],['EVERY OPENING','MATTERS.'],['THE WORK','KEEPS MOVING.'],['MORE TRUST.','MORE MILESTONES.'],['35 OPENINGS.','ONE PROUD CREW.'],['A JOURNEY','BUILT ON TRUST.']];
const spans = ['HELLHOUND AUDIO  ×  PRIMARK  /  2022–2026',null,null,'NOV–DEC 2022','APR–JUL 2023','SEP–NOV 2023','JUL 2024–APR 2025','JUL–DEC 2025','APR–MAY 2026','JUN–AUG 2026','SEPTEMBER 2026','35 OPENINGS  ·  13 STATES  ·  THANK YOU, PRIMARK'];
const shown = [0, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const byId = Object.fromEntries(PrimarkOpenings.map(d => [d.id, d]));

/* ---------- Easing ---------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, start, dur) => clamp((t - start) / dur);
const eOut = x => 1 - Math.pow(1 - x, 3);
const eInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eBack = x => { const k = 1.9; return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); };
const mixColor = (a, b, t) => { const p = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };

/* ---------- Timeline ----------
   0.0 – 2.6   case etches in, lid opens, gear out, map unfolds, layout settles
   2.6 – 3.5   three ink lines draw the truss and TV out of the case in one continuous path
   3.7 – 25.5  openings 01–35, one every 0.64 s; chapter titles change with the first of each batch
   26.3 – 30.0 the upcoming 36th, a thank-you wave through every marker, hold */
const FIRST = 3.7, STEP = .64;
const landT = {}, chapterOf = {}, beats = [0];
for (let id = 1; id <= 35; id++) landT[id] = FIRST + (id - 1) * STEP;
for (let f = 3; f <= 10; f++) { beats[f] = landT[counts[f - 1] + 1] - .35; for (let id = counts[f - 1] + 1; id <= counts[f]; id++) chapterOf[id] = f; }
beats[1] = beats[2] = beats[3];
beats[11] = landT[35] + .8; landT[36] = beats[11] + .5; chapterOf[36] = 11;
const beatAt = t => { let i = 0; while (i < 11 && t >= beats[i + 1]) i++; return i; };
const prevShown = i => shown[shown.indexOf(i) - 1];
const pinP = (t, id) => clamp((t - landT[id]) / .55);
const latest = t => { let n = 0; for (let id = 1; id <= 36; id++) if (t >= landT[id]) n = id; return n; };
const stateT = {}, stateFirst = {};
for (const d of PrimarkOpenings) if (stateT[d.state] === undefined || landT[d.id] < stateT[d.state]) { stateT[d.state] = landT[d.id]; stateFirst[d.state] = d; }

/* ---------- Layout ---------- */
const MS = 900 / 1827, MX = 90 - 35 * MS, MY = 262 - 105 * MS;   // national map: 900 px wide, top at y 262
const mapPt = (x, y) => [MX + x * MS, MY + y * MS];
// Badge offsets where real locations sit close together (DFW, Houston, Orlando, Chicago, Georgia).
const pinOffset = {4:[-14,-24],7:[0,-26],9:[-26,16],22:[-26,-16],14:[0,-26],11:[0,-26],13:[26,-14],32:[-28,4],25:[24,-6],16:[0,-26],20:[0,-26],
  24:[8,-30],26:[-28,-14],29:[-18,24],30:[20,-22],23:[-12,26],18:[-6,-26],21:[0,-26],31:[0,-26],33:[0,-26],34:[-10,-26],35:[14,-24]};
// Label nudges (map-frame units) so state letters clear the pins.
const labelAt = Object.assign({}, MapLabels, {TN:[1375,765],IN:[1290,640],FL:[1500,1160],TX:[800,1060],MN:[990,280],MI:[1310,500],NC:[1600,760],MD:[1560,560],NJ:[1672,560]});
// Metro close-ups (real geography) in the top-right corner.
const INSETS = {
  nyc: {title: 'NEW YORK CITY AREA', rect: [580, 96, 290, 154], view: [-74.32, 40.47, -73.02, 40.98], at: [-73.93, 40.72],
    ids: [1,2,3,5,6,10,15,19,27], off: {27:[-6,-30],19:[-32,-14],3:[-8,28],6:[-8,24],15:[6,-34],2:[4,30],5:[22,22],1:[8,-32],10:[0,28]},
    labels: [['NEW JERSEY', -74.24, 40.80], ['LONG ISLAND', -73.42, 40.79]]},
  dc: {title: 'WASHINGTON, DC AREA', rect: [882, 96, 144, 154], view: [-77.50, 38.52, -76.56, 39.28], at: [-77.03, 38.90],
    ids: [8,12,17,28,36], off: {8:[6,30],12:[-20,-22],28:[-4,-30],36:[24,14],17:[26,0]},
    labels: [['MARYLAND', -76.86, 38.62], ['VIRGINIA', -77.36, 38.78]]},
};
const insetOf = {};
for (const k in INSETS) for (const id of INSETS[k].ids) insetOf[id] = k;
function insetFit(ins) {
  const data = MapInsets[ins === INSETS.nyc ? 'nyc' : 'dc'], [bw, , , bn] = data.box, cs = data.cos;
  const [vw, vs, ve, vn] = ins.view, [rx, ry, rw, rh] = ins.rect;
  const uw = (ve - vw) * cs * 100, uh = (vn - vs) * 100, sc = Math.min(rw / uw, rh / uh);
  const tx = (rw - uw * sc) / 2 - (vw - bw) * cs * 100 * sc, ty = (rh - uh * sc) / 2 - (bn - vn) * 100 * sc;
  return {data, sc, tx, ty, pt: (lon, lat) => [rx + tx + (lon - bw) * cs * 100 * sc, ry + ty + (bn - lat) * 100 * sc]};
}
const casePoses = [[280, 390, 1.5], [330, 480, 1.35], [190, 612, .52]];
const mixPose = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

/* ---------- Cached art ---------- */
const cache = {};
function paperLayer() {
  if (!cache.paper) cache.paper = Etch.layer(W * cache.scale, H * cache.scale, c => { c.scale(cache.scale, cache.scale); paper(c); });
  return cache.paper;
}
const inactiveStyle = (i, s) => ({seed: 201 + i, angle: .25, spacing: 7, length: 32, width: .55, color: 'rgba(80,88,96,.16)', density: x => .4 + ((x - s.bounds[0]) / Math.max(1, s.bounds[2])) * .5});
const activeStyle = (i, s) => ({seed: 201 + i, angle: -.7, spacing: 4.4, length: 23, width: .55, color: 'rgba(0,60,90,.30)', density: x => .4 + ((x - s.bounds[0]) / Math.max(1, s.bounds[2])) * .5});
function mapBase() {
  if (cache.base) return cache.base;
  return cache.base = Etch.layer(1881, 1344, c => {
    MapShapes.forEach((s, i) => { const p = new Path2D(s.d); Etch.fill(c, p, '#e7e9eb'); Etch.hatch(c, p, s.bounds, inactiveStyle(i, s)); Etch.outline(c, p, '#a7abb0', .9, 200 + i); });
  });
}
function stateLayer(state) {
  cache.states = cache.states || {};
  if (cache.states[state]) return cache.states[state];
  const i = MapShapes.findIndex(s => s.state === state), s = MapShapes[i];
  const [x0, y0] = [s.bounds[0] - 6, s.bounds[1] - 6], w = s.bounds[2] + 12, h = s.bounds[3] + 12;
  const cv = Etch.layer(w, h, c => { c.translate(-x0, -y0); const p = new Path2D(s.d); Etch.fill(c, p, P.blue); Etch.hatch(c, p, s.bounds, activeStyle(i, s)); Etch.outline(c, p, '#006f8e', 1.4, 200 + i); });
  return cache.states[state] = {cv, x0, y0, w, h};
}
// Close-up layers: base (every state quiet) and one inked layer per state with openings.
function insetLayer(key, only) {
  const id = key + ':' + (only || 'base') + ':' + cache.scale; cache.insets = cache.insets || {};
  if (cache.insets[id]) return cache.insets[id];
  const ins = INSETS[key], f = insetFit(ins), [rx, ry, rw, rh] = ins.rect, S = cache.scale;
  return cache.insets[id] = Etch.layer(Math.ceil(rw * S), Math.ceil(rh * S), c => {
    c.scale(S, S);
    if (!only) { c.fillStyle = 'rgba(0,166,208,.10)'; c.fillRect(0, 0, rw, rh); }
    f.data.shapes.forEach((s, i) => {
      if (only && s.state !== only) return;
      const p = new Path2D(); p.addPath(new Path2D(s.d), new DOMMatrix([f.sc, 0, 0, f.sc, f.tx, f.ty]));
      const on = !!only, b = [0, 0, rw, rh];
      Etch.fill(c, p, on ? P.blue : '#e7e9eb');
      Etch.hatch(c, p, b, on ? {seed: 401 + i, angle: -.7, spacing: 4.4, length: 20, width: .55, color: 'rgba(0,60,90,.30)'} : {seed: 401 + i, angle: .25, spacing: 6, length: 26, width: .55, color: 'rgba(80,88,96,.16)'});
      Etch.outline(c, p, on ? '#006f8e' : '#a7abb0', on ? 1.1 : .8, 410 + i);
    });
  });
}

/* ---------- Gear: Shure SM58 and a JBL VRX ground stack ---------- */
// SM58: 51 mm ball grille, 162 mm long, handle tapering to a 23 mm shank; origin at the grille centre.
function sm58(c, x, y, angle = 0, scale = 1) {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale);
  const handle = new Path2D('M-16.5 25 L16.5 25 L10.8 124 L-10.8 124 Z');
  Etch.fill(c, handle, '#38393c');
  Etch.hatch(c, handle, [-17, 24, 34, 101], {seed: 581, angle: 1.52, spacing: 2.2, length: 14, width: .5, color: 'rgba(0,0,0,.45)'});
  Etch.line(c, [[-10.5, 30], [-6.8, 120]], 'rgba(235,235,235,.22)', 3, 582, .2);
  Etch.outline(c, handle, P.ink, 1.1, 583);
  c.save(); c.translate(0, 46); text(c, 'SHURE', 0, 0, 7.5, '#f2f0ea', 'Avenir Next', '700', 'center'); c.restore();
  const tail = new Path2D('M-10.8 124 L10.8 124 L10.6 130 L-10.6 130 Z'); Etch.fill(c, tail, '#9a9da2'); Etch.outline(c, tail, P.ink, .9, 584);
  const collar = new Path2D('M-18.6 16 L18.6 16 L17.2 25.5 L-17.2 25.5 Z'); Etch.fill(c, collar, '#aeb1b5');
  Etch.hatch(c, collar, [-19, 15, 38, 12], {seed: 585, angle: 0, spacing: 2, length: 30, width: .4, color: 'rgba(40,40,45,.35)'}); Etch.outline(c, collar, P.ink, 1, 585);
  const ball = new Path2D(); ball.moveTo(18.4, 15.4); ball.arc(0, 0, 24, .698, 2.443, true); ball.closePath();
  Etch.fill(c, ball, '#c4c7cb');
  for (const a of [.785, -.785]) Etch.hatch(c, ball, [-26, -26, 52, 44], {seed: 586 + a * 10, angle: a, spacing: 2.3, length: 60, jitter: 0, width: .45, color: 'rgba(45,46,52,.55)'});
  c.save(); c.clip(ball); const g = c.createRadialGradient(-8, -10, 2, 0, 0, 30); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(20,22,26,.45)'); c.fillStyle = g; c.fillRect(-26, -26, 52, 44); c.restore();
  Etch.outline(c, ball, P.ink, 1.1, 587);
  c.restore();
}
// Black DuraFlex cabinets, perforated steel grilles. Width 597 mm = 150 units; oblique depth at 0.51.
function grillePattern(c) {
  if (!cache.grille) { cache.grille = Etch.layer(4, 4, g => { g.fillStyle = '#2b2b2e'; g.fillRect(0, 0, 4, 4); g.fillStyle = '#4a4a4f'; g.beginPath(); g.arc(2, 2, .8, 0, Math.PI * 2); g.fill(); }); }
  return c.createPattern(cache.grille, 'repeat');
}
function jblBadge(c, x, y) {
  c.fillStyle = '#0d0d0e'; c.fillRect(x, y, 27, 10); c.strokeStyle = '#6d6d72'; c.lineWidth = .5; c.strokeRect(x, y, 27, 10);
  c.fillStyle = '#f26522'; c.fillRect(x + 1.5, y + 1.5, 4.5, 7);
  text(c, 'JBL', x + 16.5, y + 8.3, 8.5, '#fff', 'Avenir Next', '700', 'center');
}
function cabinet(c, w, h, d, taper, seed, sideHandle) {
  const [dx, dy] = d;
  const front = new Path2D(`M0 ${-h} H${w} V0 H0 Z`);
  const side = new Path2D(`M${w} ${-h} L${w + dx} ${-h + dy + taper} L${w + dx} ${dy - taper} L${w} 0 Z`);
  const top = new Path2D(`M0 ${-h} L${dx} ${-h + dy + taper} L${w + dx} ${-h + dy + taper} L${w} ${-h} Z`);
  Etch.fill(c, top, '#2c2b2e'); Etch.hatch(c, top, [0, -h + dy - 2, w + dx, -dy + 4], {seed, angle: -.35, spacing: 3.2, length: 20, color: CASE.etch});
  Etch.fill(c, side, '#161518'); Etch.hatch(c, side, [w, -h + dy, dx, h - dy], {seed: seed + 1, angle: -.55, spacing: 2.6, length: 18, color: 'rgba(220,222,226,.09)'});
  Etch.fill(c, front, '#1d1c1f');
  c.save(); c.fillStyle = grillePattern(c); c.fillRect(4, -h + 4, w - 8, h - 8); c.restore();
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.strokeRect(4, -h + 4, w - 8, h - 8);
  if (sideHandle) { const hp = new Path2D(`M${w + dx * .35} ${-h * .55 + dy * .35} l${dx * .3} ${dy * .3} v10 l${-dx * .3} ${-dy * .3} Z`); Etch.fill(c, hp, '#08080a'); Etch.outline(c, hp, '#56565a', .6); }
  for (const p of [top, side, front]) Etch.outline(c, p, '#0c0b0d', 1.1, seed + 2);
  jblBadge(c, 8, -16);
  return side;
}
function vrxStack(c, x, y, s, t, t0, alpha = 1) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= alpha;
  // VRX918S sub: 508 x 597 x 749 mm.
  const sp = eBack(prog(t, t0, .45));
  if (sp > 0) { c.save(); c.translate(0, -90 * (1 - sp)); c.globalAlpha *= clamp(sp * 3); cabinet(c, 150, 128, [96 * .885, -96 * .466], 0, 700, true); c.restore(); }
  // Three VRX932LA-1: 343 x 597 x 376 mm, trapezoid sides, steel rigging at the front corners.
  for (let k = 0; k < 3; k++) {
    const p = eBack(prog(t, t0 + .16 + k * .1, .4)); if (p <= 0) continue;
    c.save(); c.translate(0, -128 - k * 86 - 90 * (1 - p)); c.globalAlpha *= clamp(p * 3);
    cabinet(c, 150, 86, [48 * .885, -48 * .466], 16, 710 + k * 5, false);
    c.fillStyle = '#8c8e92'; c.fillRect(150, -84, 5, 82); c.strokeStyle = P.ink; c.lineWidth = .6; c.strokeRect(150, -84, 5, 82);
    for (const yy of [-76, -10]) { c.fillStyle = '#2a2a2c'; c.beginPath(); c.arc(152.5, yy, 1.6, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  c.restore();
}

/* ---------- Black road case with a hinged lid (0 closed, 1 open) ---------- */
function caseAt(c, x, y, s, lid) {
  roadcase(c, x, y, s, 0);
  if (lid <= .001) return;
  c.save(); c.translate(x, y); c.scale(s, s);
  const top = new Path2D('M 0 33 L 71 0 L 239 13 L 165 52 Z');
  c.save(); c.globalAlpha *= clamp(lid * 4); Etch.fill(c, top, CASE.inside); Etch.hatch(c, top, [0, 0, 240, 52], {angle: -.35, spacing: 3.5, length: 22, color: CASE.etch, seed: 23}); Etch.outline(c, top, P.ink, 1.4, 33); c.restore();
  // Parallel projection: the lid's free edge turns from "toward us" to "straight up" about the hinge.
  const th = lid * Math.PI / 2, vx = Math.cos(th) * -71 + Math.sin(th) * -25, vy = Math.cos(th) * 33 + Math.sin(th) * -150;
  const close = 1 - clamp(lid), H1 = [71, 0], H2 = [239, 13];
  const F1 = [H1[0] + vx, H1[1] + vy], F2 = [H2[0] + vx - 3 * close, H2[1] + vy + 6 * close];
  const lp = new Path2D(`M${H1} L${F1} L${F2} L${H2} Z`);
  Etch.fill(c, lp, mixColor(CASE.top, CASE.lid, clamp(lid)));
  c.save(); c.clip(lp); c.transform(1, 13 / 168, vx / 100, vy / 100, 71, 0);
  Etch.hatch(c, new Path2D('M-2 -2 H170 V102 H-2 Z'), [0, 0, 168, 100], {seed: 71, angle: .35, spacing: 4, length: 22, width: .7, color: CASE.etch});
  c.restore();
  Etch.outline(c, lp, P.ink, 1.2);
  Etch.line(c, [F1, F2], '#d4d7db', 5, 8); Etch.line(c, [F1, F2], P.ink, .8, 8);
  c.restore();
}

/* ---------- Map unfolding ---------- */
function foldedMap(u) {
  const src = mapBase(), cv = cache.fold || (cache.fold = Etch.layer(1881, 1344, () => {})), c = cv.getContext('2d');
  c.clearRect(0, 0, 1881, 1344);
  const edges = [0, 470, 940, 1410, 1881], f = [0, 1, 2, 3].map(i => .1 + .9 * eInOut(clamp((u - i * .17) / .5)));
  const widths = f.map((k, i) => (edges[i + 1] - edges[i]) * k), total = widths.reduce((a, b) => a + b);
  let x = (1881 - total) / 2;
  for (let i = 0; i < 4; i++) {
    c.drawImage(src, edges[i], 0, edges[i + 1] - edges[i], 1344, x, 0, widths[i], 1344);
    const g = c.createLinearGradient(x, 0, x + widths[i], 0), shade = .5 * (1 - f[i]);
    g.addColorStop(i % 2 ? 1 : 0, `rgba(58,40,32,${shade})`); g.addColorStop(i % 2 ? 0 : 1, `rgba(255,248,222,${shade * .35})`);
    c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = g; c.fillRect(x, 0, widths[i], 1344); c.restore();
    x += widths[i];
  }
  return cv;
}

/* ---------- Markers ---------- */
function badge(c, id, r, t, p) {
  if (id === 36) {
    Etch.fill(c, Etch.ellipse(0, 0, r, r), P.paper);
    c.strokeStyle = P.red; c.lineWidth = 1.5; c.setLineDash([3, 2]); c.lineDashOffset = -t * 6;
    c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * eOut(p)); c.stroke(); c.setLineDash([]);
    c.globalAlpha *= clamp((p - .4) * 3); text(c, '36', 0, r * .36, r * .92, P.red, 'Avenir Next', '700', 'center');
  } else {
    c.fillStyle = 'rgba(30,30,35,.14)'; c.beginPath(); c.arc(1.8, 2, r, 0, Math.PI * 2); c.fill();
    const e = Etch.ellipse(0, 0, r, r); Etch.fill(c, e, P.red); Etch.outline(c, e, P.ink, .65, id);
    text(c, num(id), 0, r * .36, r * .92, P.paper, 'Avenir Next', '700', 'center');
  }
}
function stampAt(c, t, id, x, y, r = 13) {
  const p = pinP(t, id); if (p <= 0) return;
  const wave = Math.sin(Math.PI * prog(t, beats[11] + 1.1 + (id - 1) * .03, .42));
  const k = eBack(clamp(p / .8)) * (1 + .22 * wave), drop = -16 * (1 - eOut(p));
  const q = prog(t, landT[id] + .12, .85);
  if (q > 0 && q < 1) { c.save(); c.globalAlpha *= .55 * (1 - q); c.strokeStyle = P.red; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, r + 3 + 26 * eOut(q), 0, Math.PI * 2); c.stroke(); c.restore(); }
  c.save(); c.globalAlpha *= clamp(p * 3); c.translate(x, y + drop); c.scale(k, k); badge(c, id, r, t, p); c.restore();
  if (id < 36) {
    const f = chapterOf[id], a = prog(t, landT[id] + .25, .3) * (1 - prog(t, beats[f + 1], .35));
    if (a > 0) { c.save(); c.globalAlpha *= a; for (let j = 0; j < 3; j++) { const ang = -2.4 + j * .85; Etch.line(c, [[x + Math.cos(ang) * (r + 5), y + Math.sin(ang) * (r + 5)], [x + Math.cos(ang) * (r + 11), y + Math.sin(ang) * (r + 11)]], P.red, .8, 50 + id); } c.restore(); }
  }
}
function pinAt(c, t, id, x, y, dx, dy, r = 13) {
  const p = pinP(t, id); if (p <= 0) return;
  const lp = eOut(clamp(p / .45));
  c.save(); c.fillStyle = P.ink; c.beginPath(); c.arc(x, y, 2 * eBack(clamp(p / .3)), 0, Math.PI * 2); c.fill(); c.restore();
  if (lp > .02) Etch.line(c, [[x, y], [x + dx * lp, y + dy * lp]], P.ink, 1, id, .35);
  stampAt(c, t - .1, id, x + dx, y + dy, r);
}

/* ---------- Header, title, map ---------- */
function headerAt(c, t) {
  text(c, 'HELLHOUND AUDIO  /  THE PRIMARK JOURNEY', 54, 52, 16, P.ink, 'Avenir Next', '700');
  const n = latest(t), year = n === 36 ? 'NEXT →' : n ? byId[n].date.slice(0, 4) : '2022';
  text(c, year, 1026, 52, 16, P.muted, 'Avenir Next', '700', 'right');
  rule(c, 54, 73, 972);
  c.save(); c.strokeStyle = P.red; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(54, 73); c.lineTo(54 + 972 * clamp(t / DURATION), 73.4); c.stroke(); c.restore();
}
function titleLine(c, s, y, size, color, box, off) {
  c.font = `700 ${size}px "DIN Condensed"`; const w = c.measureText(s).width; if (w > 505) size *= 505 / w;
  c.save(); c.beginPath(); c.rect(0, box[0], 575, box[1] - box[0]); c.clip(); text(c, s, 52, y + off, size, color, 'DIN Condensed', '700'); c.restore();
}
function titlesAt(c, t) {
  const i = beatAt(t), prev = prevShown(i);
  for (const [n, y, size, color, box, delay] of [[0, 134, 52, P.ink, [86, 142], 0], [1, 192, 58, P.red, [142, 200], .08]]) {
    const q = eInOut(prog(t, beats[i] + delay + (i === 0 ? -.6 : 0), .6));
    if (prev !== undefined && q < 1) titleLine(c, titles[prev][n], y, size, color, box, -q * 62);
    if (q > 0) titleLine(c, titles[i][n], y, size, color, box, (1 - q) * 62);
  }
  const s = prog(t, beats[i] + (i === 0 ? -.5 : .15), .5);
  c.save(); if (prev !== undefined && s < 1) { c.globalAlpha = 1 - s; text(c, spans[prev], 54, 232 - 6 * s, 16, P.muted, 'Avenir Next', '700'); }
  c.globalAlpha = s; text(c, spans[i], 54, 232 + 6 * (1 - s), 16, P.muted, 'Avenir Next', '700'); c.restore();
}
function mapAt(c, t) {
  const u = prog(t, 1.25, 1.15); if (u <= 0) return;
  const m = eInOut(prog(t, 2.35, .8)), rise = eOut(clamp(u / .45));
  const cx = lerp(545, MX + 940.5 * MS, m), cy = lerp(500 + 80 * (1 - rise), MY + 672 * MS, m), rot = lerp(-.08, 0, m);
  const sx = lerp(.46 * lerp(.85, 1, rise), MS, m), sy = lerp(.34 * lerp(.85, 1, rise), MS, m);
  c.save(); c.globalAlpha = rise; c.translate(cx, cy); c.rotate(rot); c.scale(sx, sy); c.translate(-940.5, -672);
  c.drawImage(u < 1 ? foldedMap(u) : mapBase(), 0, 0);
  for (const st in stateT) {
    const p = eInOut(prog(t, stateT[st] + .05, .9)); if (p <= 0) continue;
    const L = stateLayer(st), [ox, oy] = stateFirst[st].map_point;
    const R = Math.max(...[[L.x0, L.y0], [L.x0 + L.w, L.y0], [L.x0, L.y0 + L.h], [L.x0 + L.w, L.y0 + L.h]].map(([a, b]) => Math.hypot(a - ox, b - oy)));
    c.save(); c.beginPath(); c.arc(ox, oy, 8 + R * p, 0, Math.PI * 2); c.clip(); c.globalAlpha *= clamp(p * 2.5); c.drawImage(L.cv, L.x0, L.y0); c.restore();
    const la = prog(t, stateT[st] + .55, .5); if (la > 0) { c.save(); c.globalAlpha *= la; const [lx, ly] = labelAt[st]; text(c, st, lx, ly, 34, '#063a4d', 'DIN Condensed', '700', 'center'); c.restore(); }
  }
  c.restore();
}
function insetsAt(c, t) {
  const a = eOut(prog(t, 2.55, .55)); if (a <= 0) return;
  for (const key in INSETS) {
    const ins = INSETS[key], f = insetFit(ins), [rx, ry, rw, rh] = ins.rect;
    c.save(); c.globalAlpha = a; c.translate(0, -10 * (1 - a));
    // Where this close-up sits on the national map.
    const [mx, my] = mapPt(...MapProject(...ins.at)), nx = W / 2 + (mx - W / 2) * cache.zoom, ny = 545 + (my - 545) * cache.zoom, lastLand = Math.max(-9, ...ins.ids.filter(id => t >= landT[id]).map(id => landT[id]));
    const pulse = Math.sin(Math.PI * prog(t, lastLand, .45));
    c.strokeStyle = P.ink; c.lineWidth = 1; c.beginPath(); c.arc(nx, ny, 6 + 4 * pulse, 0, Math.PI * 2); c.stroke();
    c.save(); c.setLineDash([2, 3]); c.strokeStyle = 'rgba(38,36,38,.55)'; c.beginPath(); c.moveTo(nx + (key === 'nyc' ? -4 : 3), ny - 6); c.lineTo(rx + rw / 2, ry + rh); c.stroke(); c.restore();
    // Land, then each state inks in from its first opening, as on the big map.
    c.drawImage(insetLayer(key), rx, ry, rw, rh);
    c.save(); c.beginPath(); c.rect(rx, ry, rw, rh); c.clip();
    for (const s of f.data.shapes) {
      const st = s.state; if (stateT[st] === undefined || !INSETS[key].ids.some(id => byId[id].state === st)) continue;
      const p = eInOut(prog(t, stateT[st] + .05, .9)); if (p <= 0) continue;
      const first = byId[INSETS[key].ids.filter(id => byId[id].state === st).sort((x, y) => landT[x] - landT[y])[0]], [px, py] = f.pt(first.lon, first.lat);
      c.save(); c.beginPath(); c.arc(px, py, 6 + 420 * p, 0, Math.PI * 2); c.clip(); c.globalAlpha *= clamp(p * 2.5); c.drawImage(insetLayer(key, st), rx, ry, rw, rh); c.restore();
    }
    for (const [label, lon, lat] of ins.labels) { const [lx, ly] = f.pt(lon, lat); text(c, label, lx, ly, 8.5, '#063a4d', 'Avenir Next', '700', 'center'); }
    c.restore();
    Etch.outline(c, new Path2D(`M${rx} ${ry} H${rx + rw} V${ry + rh} H${rx} Z`), P.ink, .9, 90);
    c.fillStyle = P.paper; c.font = '700 9.5px "Avenir Next"'; const tw = c.measureText(ins.title).width; c.fillRect(rx + 1, ry + 1, tw + 12, 15);
    text(c, ins.title, rx + 6, ry + 12, 9.5, P.ink, 'Avenir Next', '700');
    c.restore();
    for (const id of ins.ids) { const d = byId[id], [px, py] = f.pt(d.lon, d.lat), [dx, dy] = ins.off[id]; c.save(); c.translate(0, -10 * (1 - a)); pinAt(c, t, id, px, py, dx, dy, 10); c.restore(); }
  }
}
function pinsAt(c, t) {
  if (t < 2.6) return;
  for (const d of PrimarkOpenings) if (d.panel === 'national') { const [dx, dy] = pinOffset[d.id] || [0, -24]; const [x, y] = mapPt(...d.map_point); pinAt(c, t, d.id, x, y, dx, dy); }
}
function gearAt(c, t, pose) {
  const [x, y, s] = pose, mouth = [x + 120 * s, y + 20 * s];
  const back = eInOut(prog(t, 2.25, .5));
  // JBL VRX918S + three VRX932LA-1 set down piece by piece beside it.
  if (t > .8 && back < 1) {
    const sx = 752, sy = 772, sc = .93;
    vrxStack(c, sx, sy + 40 * back, sc, t, .8, 1 - back);
  }
}
function caseScene(c, t) {
  const toField = eInOut(prog(t, 2.2, .65));
  let pose = mixPose(casePoses[0], casePoses[1], eInOut(prog(t, .1, .9)));
  pose = mixPose(pose, casePoses[2], toField);
  const lid = eBack(prog(t, .45, .6)), hop = -8 * Math.sin(Math.PI * prog(t, .45, .3));
  const [x, y0, s] = pose, y = y0 + hop + 24 * (1 - eOut(prog(t, -.45, .5)));
  const sh = (1 - toField) * prog(t, -.4, .4);
  if (sh > 0) { c.save(); c.globalAlpha = sh; const e = Etch.ellipse(x + 121 * s, y - hop + 229 * s, 137 * s, 20 * s); Etch.hatch(c, e, [x - 40 * s, y + 200 * s, 330 * s, 60 * s], {seed: 900, angle: .06, spacing: 3, length: 30, color: 'rgba(40,44,50,.22)'}); c.restore(); }
  gearAt(c, t, [x, y, s]);
  const wipe = eInOut(prog(t, -.45, .55));
  c.save();
  if (wipe < 1) { c.beginPath(); const e = lerp(-300, 1300, wipe); c.moveTo(0, 0); c.lineTo(e + 250, 0); c.lineTo(e - 250, H); c.lineTo(0, H); c.clip(); }
  caseAt(c, x, y, s, lid);
  c.restore();
  const [fx, fy, fs] = casePoses[2];
  tvSketchAt(c, t, [fx + 120 * fs, fy + 24 * fs]);
  const cap = prog(t, 3, .6); if (cap > 0) { c.save(); c.globalAlpha = cap; text(c, 'Every pin, a proud moment.', 94, 804, 20, P.ink, 'Baskerville'); c.restore(); }
}

/* ---------- Sketched TV on truss ----------
   Three loose ink lines (ballpoint navy, Primark blue, a thread of Hellhound red) rise out of the
   open case and draw the truss and TV in one continuous path, then keep boiling; ballpoint
   scratches and ink pulses run through them like current.
   Everything on the TV moves on damped springs; each opening's photo springs onto the screen as its
   pin lands (01–28), then the Primark logo for the rest. */
const TV = {x: 54, y: 270, w: 440, h: 248, bezel: 12};
const SKETCH_T0 = 2.62, SKETCH_T1 = 3.5, TV_ON = 3.5;
const tvCx = TV.x + TV.w / 2, tvCy = TV.y + TV.h / 2;
// Closed-form damped spring 0 → 1 (pure function of time, so any frame renders on its own).
function spring(tau, f = 3, z = .6) {
  if (tau <= 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + (z * w / wd) * Math.sin(wd * tau));
}
// A decaying wobble for "kicks" (0 at rest).
const kick = (tau, f = 3.2, z = .35) => tau <= 0 ? 0 : Math.exp(-z * 2 * Math.PI * f * tau) * Math.sin(2 * Math.PI * f * Math.sqrt(1 - z * z) * tau);
// One unbroken path: up the left chord, round the TV with corner loops, round the screen,
// down the truss in a zigzag, back up the right chord, and a little curl to finish.
function sketchPath(mx, my) {
  const pts = [], {x, y, w, h, bezel: b} = TV, yB = y + h, L = tvCx - 12, Rr = tvCx + 12, deep = my + 70;
  const to = (px, py) => { const [ax, ay] = pts[pts.length - 1], n = Math.max(1, Math.ceil(Math.hypot(px - ax, py - ay) / 3)); for (let i = 1; i <= n; i++) pts.push([ax + (px - ax) * i / n, ay + (py - ay) * i / n]); };
  // Corners overshoot a hair and snap back, the way a quick ballpoint turns.
  const corner = (px, py, ox, oy) => { to(px + ox, py + oy); to(px, py); };
  pts.push([L, deep]);                       // from inside the case
  to(L, yB);
  corner(x, yB, -5, 2); corner(x, y, -2, -5); corner(x + w, y, 5, -2); corner(x + w, yB, 2, 5);
  to(x + w - b, yB - b);
  corner(x + w - b, y + b, 2, -3); corner(x + b, y + b, -3, -2); corner(x + b, yB - b, -2, 3); to(Rr, yB - b);
  to(Rr, deep);                              // down the right chord, back into the case
  let up = deep, left = true;
  while (up - 14 > yB) { up -= 14; to(left ? L : Rr, up); left = !left; }   // lacing climbs back out
  to(Rr, yB);
  let s = 0;
  return pts.map((p, i) => { if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return [p[0], p[1], s]; });
}
// The case body in canvas space (final pose): the lines are hidden behind it, so they rise out of the open top.
function caseBody() {
  const [cx, cy, cs] = casePoses[2], p = new Path2D(), pts = [[0, 33], [165, 52], [239, 13], [239, 169], [165, 214], [0, 193]];
  pts.forEach(([a, b2], i) => i ? p.lineTo(cx + a * cs, cy + b2 * cs) : p.moveTo(cx + a * cs, cy + b2 * cs)); p.closePath();
  return p;
}
// Scribble tiles that slide like current: along the TV frame and up the truss out of the case.
function currentTile(key, w, h, opts) {
  const id = key + cache.scale; cache.tiles = cache.tiles || {};
  if (!cache.tiles[id]) cache.tiles[id] = Etch.layer(Math.ceil(w * cache.scale), Math.ceil(h * cache.scale), g => { g.scale(cache.scale, cache.scale); Etch.hatch(g, new Path2D(`M0 0 H${w} V${h} H0 Z`), [-20, -20, w + 40, h + 40], opts); });
  return cache.tiles[id];
}
function flowFill(c, tile, dx, dy, alpha) {
  const pat = c.createPattern(tile, 'repeat'), S = cache.scale;
  pat.setTransform(new DOMMatrix([1 / S, 0, 0, 1 / S, dx, dy]));
  c.save(); c.globalAlpha *= alpha; c.fillStyle = pat; c.fillRect(-2000, -2000, 5000, 5000); c.restore();
}
const INKS = [
  {col: '#2547b5', w: 2.1, lag: 0, ph: 0, amp: 1.5, a: .95},
  {col: '#00a6d0', w: 1.7, lag: .07, ph: 2.1, amp: 2.4, a: .9},
  {col: '#f13037', w: 1, lag: .13, ph: 4.4, amp: 2.8, a: .8},
];
function photoCover(c, img, x, y, w, h, zoom) {
  const s = Math.max(w / img.width, h / img.height) * zoom, iw = img.width * s, ih = img.height * s;
  c.drawImage(img, x + (w - iw) / 2, y + (h - ih) * .42, iw, ih);
}
function screenContent(c, n, x, y, w, h, zoom) {
  const photos = window.JourneyPhotos || {};
  const logoScreen = (bg, fg, sub) => {
    c.fillStyle = bg; c.fillRect(x, y, w, h);
    primarkLogo(c, x + w * .19, y + h * .43, w * .62, fg);
    if (sub) text(c, sub, x + w / 2, y + h * .74, 15, fg, 'Avenir Next', '700', 'center');
  };
  if (n === 0) logoScreen('#e3f4fa', P.blue);
  else if (n <= 28 && photos[n]) photoCover(c, photos[n], x, y, w, h, zoom);
  else if (n === 36) logoScreen(P.blue, '#ffffff', 'COMING SOON');
  else logoScreen(n % 2 ? P.blue : '#e3f4fa', n % 2 ? '#ffffff' : P.blue);
}
function screenAt(c, t, x, y, w, h) {
  // The screen opens from the centre on a spring once the frame is drawn.
  const open = spring(t - TV_ON, 2.2, .55); if (open <= 0) return;
  const ow = w * Math.min(1, open), oh = h * Math.min(1, open);
  c.save(); c.beginPath(); c.rect(x + (w - ow) / 2, y + (h - oh) / 2, ow, oh); c.clip();
  const n = latest(t);
  if (n === 0) screenContent(c, 0, x, y, w, h, 1);
  else {
    // Previous opening underneath; the new one springs up into place over it.
    const tau = t - landT[n], sp = spring(tau, 4.2, .6);
    screenContent(c, n - 1, x, y, w, h, 1 + .05 * sp);
    c.fillStyle = `rgba(255,255,255,${.35 * Math.min(1, sp)})`; c.fillRect(x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y + h * (1 - Math.min(1, sp * 1.15)), w, h); c.clip();
    c.translate(0, (1 - sp) * h * .35); screenContent(c, n, x, y, w, h, 1.16 - .16 * sp); c.restore();
    const bp = spring(tau - .06, 4.5, .5);
    if (bp > 0) { c.save(); c.translate(x + 22, y + 20); c.scale(bp, bp); badge(c, n, 13, t, n === 36 ? clamp((t - landT[36]) / .55) : 1); c.restore(); }
  }
  c.restore();
}
function tvSketchAt(c, t, mouth) {
  if (t < SKETCH_T0) return;
  const [mx, my] = mouth, key = Math.round(mx) + ':' + Math.round(my);
  if (!cache.sketch || cache.sketch.key !== key) cache.sketch = {key, path: sketchPath(mx, my)};
  const path = cache.sketch.path, total = path[path.length - 1][2], {x, y, w, h, bezel: b} = TV;
  // The whole set settles in on a spring, and gets a little kick each time a new opening lands.
  const n = latest(t), settle = spring(t - SKETCH_T1 + .15, 2.4, .5);
  const k = 1 + .025 * (1 - settle) * (t > SKETCH_T1 - .15 ? 1 : 0) + (n ? .014 * kick(t - landT[n]) : 0);
  c.save(); c.translate(tvCx, TV.y + TV.h); c.scale(k, k); c.translate(-tvCx, -(TV.y + TV.h));
  screenAt(c, t, x + b, y + b, w - 2 * b, h - 2 * b);
  // Ballpoint scratches running like current: round the frame, and up the truss out of the case.
  const hs = prog(t, SKETCH_T1 - .25, .35), flick = .78 + .22 * Math.sin(t * 13) * Math.sin(t * 7.3);
  if (hs > 0) {
    const band = new Path2D(); band.rect(x, y, w, h); band.rect(x + b, y + b, w - 2 * b, h - 2 * b);
    const navy = currentTile('navy', 300, 120, {seed: 640, angle: -.8, spacing: 3.6, length: 16, width: .8, color: 'rgba(37,71,181,.55)'});
    const cyan = currentTile('cyan', 260, 140, {seed: 641, angle: .7, spacing: 6.5, length: 12, width: .7, color: 'rgba(0,166,208,.6)'});
    c.save(); c.globalAlpha = hs; c.clip(band, 'evenodd');
    flowFill(c, navy, t * 70, Math.sin(t * 2) * 3, flick); flowFill(c, cyan, -t * 48, t * 9, 1 - (flick - .78));
    c.restore();
    const shaft = new Path2D(); shaft.rect(tvCx - 13, y + h, 26, my + 90 - y - h);
    c.save(); c.globalAlpha = hs * .9; c.clip(shaft); c.clip(caseBodyInverse(), 'evenodd');
    flowFill(c, currentTile('up', 40, 200, {seed: 642, angle: -1.25, spacing: 3.2, length: 10, width: .8, color: 'rgba(37,71,181,.6)'}), 0, -t * 120, flick);
    flowFill(c, currentTile('up2', 40, 160, {seed: 643, angle: 1.2, spacing: 5, length: 8, width: .7, color: 'rgba(0,166,208,.65)'}), 3, -t * 75, 1);
    c.restore();
  }
  // Three inks race along the same path, each with its own living wobble.
  const dur = SKETCH_T1 - SKETCH_T0;
  c.lineCap = c.lineJoin = 'round';
  c.save(); c.clip(caseBodyInverse(), 'evenodd');
  for (const ink of INKS) {
    const drawn = total * eInOut(prog(t, SKETCH_T0 + ink.lag * dur, dur * (1 - ink.lag * .6)));
    if (drawn <= 0) continue;
    const amp = ink.amp * (1 - .35 * prog(t, SKETCH_T1, 1));
    c.save(); c.globalAlpha = ink.a; c.strokeStyle = ink.col; c.lineWidth = ink.w; c.beginPath();
    let hx = 0, hy = 0;
    for (let i = 0; i < path.length; i++) {
      const [px, py, s] = path[i]; if (s > drawn) break;
      hx = px + amp * (Math.sin(s * .045 + ink.ph + t * 2.3) * .8 + Math.sin(s * .13 + ink.ph * 1.7 - t * 3.4) * .35);
      hy = py + amp * (Math.cos(s * .05 + ink.ph * 1.3 + t * 2.0) * .8 + Math.sin(s * .17 + ink.ph - t * 2.9) * .35);
      i ? c.lineTo(hx, hy) : c.moveTo(hx, hy);
    }
    c.stroke();
    c.restore();
  }
  // Once drawn, pulses of ink keep running along the line like current.
  const live = prog(t, SKETCH_T1, .3);
  if (live > 0) for (const off of [0, .5]) {
    const head = (((t - SKETCH_T1) * 420) / total + off) % 1 * total, ink = INKS[0];
    c.save(); c.globalAlpha = .9 * live; c.strokeStyle = P.blue; c.lineWidth = 3; c.beginPath(); let started = false;
    for (const [px, py, s2] of path) {
      if (s2 < head - 80 || s2 > head) continue;
      const hx = px + ink.amp * .65 * (Math.sin(s2 * .045 + t * 2.3) * .8 + Math.sin(s2 * .13 - t * 3.4) * .35), hy = py + ink.amp * .65 * (Math.cos(s2 * .05 + t * 2.0) * .8 + Math.sin(s2 * .17 - t * 2.9) * .35);
      started ? c.lineTo(hx, hy) : (c.moveTo(hx, hy), started = true);
    }
    c.stroke(); c.restore();
  }
  c.restore();
  c.restore();
}
function caseBodyInverse() { const p = new Path2D(); p.rect(-50, -50, W + 100, H + 100); p.addPath(caseBody()); cache.inv = p; return p; }

/* ---------- Now opening + ledger ---------- */
function fitText(c, s, x, y, size, max, color, font, weight, align) {
  c.font = `${weight} ${size}px "${font}"`; const w = c.measureText(s).width;
  text(c, s, x, y, w > max ? size * max / w : size, color, font, weight, align);
}
function calloutRow(c, t, id, off) {
  const d = byId[id];
  c.save(); c.translate(0, off);
  c.save(); c.translate(80, 896); badge(c, id, 25, t, 1); c.restore();
  fitText(c, d.name, 124, 894, 36, 740, P.ink, 'Avenir Next', '700');
  const sub = id === 36 ? `${d.city}, ${d.state}   ·   COMING SOON   ·   DATE TBD` : `${d.city}, ${d.state}   ·   ${dateLabel(d.date)}`;
  text(c, sub, 125, 925, 18, id === 36 ? P.red : P.muted, 'Avenir Next', '600');
  c.restore();
}
function calloutAt(c, t) {
  rule(c, 54, 848, 972);
  c.save(); c.beginPath(); c.rect(0, 852, 880, 90); c.clip();
  const n = latest(t);
  if (n === 0) {
    const a = prog(t, -.2, .4) * (1 - prog(t, 2.9, .4));
    if (a > 0) { c.globalAlpha = a; text(c, 'Every opening starts with a crew.', 54, 906, 32, P.ink, 'Baskerville'); }
  } else {
    const q = eInOut(prog(t, landT[n], .32));
    if (q < 1 && n > 1) calloutRow(c, t, n - 1, -q * 90);
    if (q < 1 && n === 1) { c.save(); c.globalAlpha = 1 - q; text(c, 'Every opening starts with a crew.', 54, 906 - q * 90, 32, P.ink, 'Baskerville'); c.restore(); }
    calloutRow(c, t, n, (1 - q) * 90);
  }
  c.restore();
  let done = 0, lastT = -1; for (let id = 1; id <= 35; id++) if (t >= landT[id]) { done = id; lastT = landT[id]; }
  const ca = prog(t, 2.7, .5), bump = 1 + .12 * Math.sin(Math.PI * prog(t, lastT, .3));
  c.save(); c.globalAlpha = ca;
  text(c, t >= landT[36] ? 'OPENINGS  +1 NEXT' : 'OPENINGS', 1026, 872, 17, t >= landT[36] ? P.red : P.ink, 'DIN Condensed', '700', 'right');
  c.translate(1026, 934); c.scale(bump, bump); text(c, num(done), 0, 0, 72, P.red, 'DIN Condensed', '700', 'right');
  c.restore();
}
function ledgerAt(c, t) {
  rule(c, 54, 948, 972);
  const a0 = prog(t, 2.6, .6); if (a0 <= 0) return;
  const n = latest(t);
  for (let id = 1; id <= 36; id++) {
    const d = byId[id], col = Math.floor((id - 1) / 12), row = (id - 1) % 12, x = 54 + col * 330, y = 978 + row * 21.5;
    const a = prog(t, landT[id] - .05, .35);
    c.save(); c.globalAlpha = a0;
    if (a < 1) {
      c.save(); c.globalAlpha *= .4 * clamp(1 - a * 3); text(c, num(id), x, y, 14, P.line, 'Avenir Next', '700');
      c.strokeStyle = P.line; c.lineWidth = 1; c.setLineDash([1.5, 4]); c.beginPath(); c.moveTo(x + 28, y - 4); c.lineTo(x + 310, y - 4); c.stroke(); c.restore();
    }
    if (a > 0) {
      const hl = id === n ? 1 - prog(t, landT[id + 1] ?? 99, .5) : (id === n - 1 ? 1 - prog(t, landT[n], .5) : 0);
      if (hl > 0) { c.save(); c.globalAlpha *= hl * a; c.fillStyle = 'rgba(241,48,55,.10)'; c.fillRect(x - 6, y - 15, 322, 20); c.restore(); }
      c.globalAlpha *= a; const dx = 12 * (1 - eOut(a));
      text(c, num(id), x + dx, y, 14, P.red, 'Avenir Next', '700');
      fitText(c, d.name, x + 28 + dx, y, 16, 250, id === 36 ? P.muted : mixColor(P.ink, P.red, hl), 'Avenir Next', '600');
      text(c, id === 36 ? 'NEXT' : d.state, x + 312, y, 12, id === 36 ? P.red : P.muted, 'Avenir Next', '700', 'right');
    }
    c.restore();
  }
}

/* ---------- Frame ---------- */
function renderInto(c, t, scale = 1) {
  t = clamp(t, 0, DURATION);
  if (cache.scale !== scale) { cache.scale = scale; cache.paper = null; }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(paperLayer(), 0, 0); c.restore();
  c.save(); c.scale(scale, scale);
  // A slow push-in on the national map keeps it breathing; type, close-ups and logos stay locked.
  c.save(); const zoom = cache.zoom = 1 + .018 * eInOut(t / DURATION); c.translate(W / 2, 545); c.scale(zoom, zoom); c.translate(-W / 2, -545);
  mapAt(c, t); pinsAt(c, t); caseScene(c, t);
  c.restore();
  insetsAt(c, t);
  headerAt(c, t); titlesAt(c, t); calloutAt(c, t); ledgerAt(c, t);
  rule(c, 54, 1248, 972); logo(c, 54, 1260, 215); primarkLogo(c, 811, 1297, 215);
  c.restore();
}
function render(t, scale = 1, canvas) {
  const cv = canvas || document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale;
  renderInto(cv.getContext('2d'), t, scale); return cv;
}
function warm() { mapBase(); for (const st in stateT) stateLayer(st); }

window.JourneyMotion = {W, H, DURATION, FPS, beats, landT, render, renderInto, warm};
})();
