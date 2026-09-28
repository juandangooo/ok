/* The Primark Journey: continuous 30-second Etched Motion.
   Reuses the drawing kit (etch.js, drawing-kit.js, map-paths.js, hellhound-logo.js, openings.js).
   A three-second intro (case opens, gear out, map unfolds), then every opening lands on a steady
   beat: pin on the map, big "now opening" callout, and a permanent line in the ledger below. */
(function () {
'use strict';
const W = 1080, H = 1350, DURATION = 30, FPS = 30;

/* ---------- Copy ---------- */
offsets[20] = [24, 12];
Object.assign(offsets, {29:[55,-15],30:[45,15],31:[5,-22],32:[45,-6],33:[-8,-23],34:[-24,-26],35:[25,10]});
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
   0.0 – 3.0   case etches in, lid opens, gear pops out, map unfolds, layout settles
   3.4 – 25.2  openings 01–35, one every 0.64 s; chapter titles change with the first of each batch
   26.0 – 30.0 the upcoming 36th, a thank-you wave through every marker, hold */
const FIRST = 3.4, STEP = .64;
const landT = {}, chapterOf = {}, beats = [0];
for (let id = 1; id <= 35; id++) landT[id] = FIRST + (id - 1) * STEP;
for (let f = 3; f <= 10; f++) { beats[f] = landT[counts[f - 1] + 1] - .35; for (let id = counts[f - 1] + 1; id <= counts[f]; id++) chapterOf[id] = f; }
beats[1] = beats[2] = beats[3];
beats[11] = landT[35] + .8; landT[36] = beats[11] + .5; chapterOf[36] = 11;
const beatAt = t => { let i = 0; while (i < 11 && t >= beats[i + 1]) i++; return i; };
const prevShown = i => shown[shown.indexOf(i) - 1];
const pinP = (t, id) => clamp((t - landT[id]) / .55);
const latest = t => { let n = 0; for (let id = 1; id <= 36; id++) if (t >= landT[id]) n = id; return n; };
const stateT = {};
for (const d of PrimarkOpenings) if (stateT[d.state] === undefined || landT[d.id] < stateT[d.state]) stateT[d.state] = landT[d.id];

/* ---------- Layout ---------- */
const MX = 98, MY = 214, MS = .47;                      // national map placement
const mapPt = (x, y) => [MX + x * MS, MY + y * MS];
const clusters = {                                      // metro openings get their own badges beside the map
  metro:   {label: 'NY / NJ', ids: [1,2,3,5,6,10,15,19,27], at: [1715, 445], x: 975, y: 406, cols: 3},
  capital: {label: 'MD / VA', ids: [8,12,17,28,36],        at: [1635, 583], x: 975, y: 514, cols: 3},
};
const clusterPos = {};
for (const g of Object.values(clusters)) g.ids.forEach((id, k) => { clusterPos[id] = [g.x + (k % g.cols) * 27, g.y + Math.floor(k / g.cols) * 27]; });
const casePoses = [[280, 390, 1.5], [330, 480, 1.35], [118, 462, .68]];
const mixPose = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

/* ---------- Cached art ---------- */
const cache = {};
function paperLayer() {
  if (!cache.paper) cache.paper = Etch.layer(W * cache.scale, H * cache.scale, c => { c.scale(cache.scale, cache.scale); paper(c); });
  return cache.paper;
}
function creases(c) {
  for (const x of [450, 920, 1370]) { Etch.line(c, [[x, 0], [x - 10, 1344]], 'rgba(248,240,213,.7)', 3, 12); Etch.line(c, [[x + 4, 0], [x - 6, 1344]], 'rgba(80,59,48,.15)', 2, 12); }
}
function mapBase() {
  if (cache.base) return cache.base;
  return cache.base = Etch.layer(1881, 1344, c => {
    MapShapes.forEach((s, i) => { const p = new Path2D(s.d); Etch.fill(c, p, '#d5d0ba'); Etch.hatch(c, p, s.bounds, {seed: 201 + i, angle: .25, spacing: 7, length: 32, width: .55, color: 'rgba(93,83,68,.19)', density: (x) => .4 + ((x - s.bounds[0]) / Math.max(1, s.bounds[2])) * .5}); Etch.outline(c, p, '#999482', .8, 200 + i); });
    const whole = new Path2D(); for (const s of MapShapes) whole.addPath(new Path2D(s.d));
    Etch.withClip(c, whole, () => creases(c));
  });
}
function stateLayer(state) {
  cache.states = cache.states || {};
  if (cache.states[state]) return cache.states[state];
  const shapes = MapShapes.map((s, i) => [s, i]).filter(([s]) => s.state === state);
  let [x0, y0, x1, y1] = [1e9, 1e9, -1e9, -1e9];
  for (const [s] of shapes) { x0 = Math.min(x0, s.bounds[0]); y0 = Math.min(y0, s.bounds[1]); x1 = Math.max(x1, s.bounds[0] + s.bounds[2]); y1 = Math.max(y1, s.bounds[1] + s.bounds[3]); }
  x0 -= 6; y0 -= 6; x1 += 6; y1 += 6;
  const cv = Etch.layer(x1 - x0, y1 - y0, c => {
    c.translate(-x0, -y0);
    const whole = new Path2D();
    for (const [s, i] of shapes) { const p = new Path2D(s.d); whole.addPath(p); Etch.fill(c, p, '#82aaa0'); Etch.hatch(c, p, s.bounds, {seed: 201 + i, angle: -.7, spacing: 4.4, length: 23, width: .55, color: 'rgba(51,67,56,.38)', density: (x) => .4 + ((x - s.bounds[0]) / Math.max(1, s.bounds[2])) * .5}); Etch.outline(c, p, '#514b45', 1.4, 200 + i); }
    Etch.withClip(c, whole, () => creases(c));
  });
  return cache.states[state] = {cv, x0, y0, w: x1 - x0, h: y1 - y0};
}
const labelPos = {NY:[1630,383],NJ:[1699,502],MD:[1625,548],VA:[1596,645],NC:[1604,729],TN:[1330,780],IL:[1195,592],MI:[1344,461],FL:[1575,1096],TX:[887,1008],MN:[1005,341],IN:[1310,573],GA:[1490,927]};

/* ---------- Gear (from journey.js) ---------- */
function speaker(c, x, y, angle = 0, scale = 1) { c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale); const p = new Path2D('M0 0 L94 -8 L114 14 L106 179 L9 185 L-8 164 Z'); Etch.fill(c, p, '#5f665b'); Etch.hatch(c, p, [-10, -10, 125, 205], {seed: 320, angle: 1.5, spacing: 2.7, length: 12, color: 'rgba(28,29,27,.5)'}); Etch.outline(c, p, P.ink, 1.4); for (const [yy, rx, ry] of [[44, 29, 25], [125, 39, 38]]) { const e = Etch.ellipse(49, yy, rx, ry); Etch.fill(c, e, '#454940'); Etch.hatch(c, e, [8, yy - 40, 85, 80], {seed: 321 + yy, angle: .4, spacing: 2, color: 'rgba(199,194,159,.24)'}); Etch.outline(c, e, '#b8b4a0', 1); } c.restore(); }
function mic(c, x, y, angle = 0, scale = 1) { c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale); const head = Etch.ellipse(0, 0, 27, 34), body = new Path2D('M-13 28 L13 28 L8 148 L-8 148 Z'); Etch.fill(c, body, '#887a65'); Etch.hatch(c, body, [-16, 24, 32, 125], {seed: 64, angle: 1.5, spacing: 2, color: 'rgba(41,32,36,.6)'}); Etch.outline(c, body, P.ink, 1.2); Etch.fill(c, head, '#c9c3a8'); for (const a of [-.6, .6]) Etch.hatch(c, head, [-29, -36, 58, 72], {seed: 68, angle: a, spacing: 3, length: 15, color: 'rgba(41,32,36,.56)'}); Etch.outline(c, head, P.ink, 1.2); c.restore(); }

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
  Etch.line(c, [F1, F2], '#dfd5be', 5, 8); Etch.line(c, [F1, F2], P.ink, .8, 8);
  c.restore();
}

/* ---------- Map unfolding ---------- */
function foldedMap(u) {
  const src = mapBase(), cv = cache.fold || (cache.fold = Etch.layer(1881, 1344, () => {})), c = cv.getContext('2d');
  c.clearRect(0, 0, 1881, 1344);
  const edges = [0, 450, 920, 1370, 1881], f = [0, 1, 2, 3].map(i => .1 + .9 * eInOut(clamp((u - i * .17) / .5)));
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
    c.fillStyle = 'rgba(50,32,23,.14)'; c.beginPath(); c.arc(1.8, 2, r, 0, Math.PI * 2); c.fill();
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
  const n = latest(t), year = n === 36 ? '2026 →' : n ? byId[n].date.slice(0, 4) : '2022';
  text(c, year, 1026, 52, 16, P.muted, 'Avenir Next', '700', 'right');
  rule(c, 54, 73, 972);
  c.save(); c.strokeStyle = P.red; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(54, 73); c.lineTo(54 + 972 * clamp(t / DURATION), 73.4); c.stroke(); c.restore();
}
// One line: ink phrase + red phrase, shrunk to fit the column.
function titleLine(c, pair, off) {
  let size = 64; c.font = `700 ${size}px "DIN Condensed"`;
  const w = c.measureText(pair[0] + ' ' + pair[1]).width; if (w > 972) size *= 972 / w;
  c.font = `700 ${size}px "DIN Condensed"`; const w0 = c.measureText(pair[0] + ' ').width;
  c.save(); c.beginPath(); c.rect(0, 84, W, 82); c.clip();
  text(c, pair[0], 52, 152 + off, size, P.ink, 'DIN Condensed', '700'); text(c, pair[1], 52 + w0, 152 + off, size, P.red, 'DIN Condensed', '700');
  c.restore();
}
function titlesAt(c, t) {
  const i = beatAt(t), prev = prevShown(i), q = eInOut(prog(t, beats[i] + (i === 0 ? .05 : 0), .6));
  if (prev !== undefined && q < 1) titleLine(c, titles[prev], -q * 80);
  if (q > 0) titleLine(c, titles[i], (1 - q) * 80);
  const s = prog(t, beats[i] + .15, .5);
  c.save(); if (prev !== undefined && s < 1) { c.globalAlpha = 1 - s; text(c, spans[prev], 54, 190 - 6 * s, 17, P.muted, 'Avenir Next', '700'); }
  c.globalAlpha = s; text(c, spans[i], 54, 190 + 6 * (1 - s), 17, P.muted, 'Avenir Next', '700'); c.restore();
}
function mapAt(c, t) {
  const u = prog(t, 1.25, 1.15); if (u <= 0) return;
  const m = eInOut(prog(t, 2.35, .8)), rise = eOut(clamp(u / .45));
  const cx = lerp(545, MX + 940.5 * MS, m), cy = lerp(470 + 80 * (1 - rise), MY + 672 * MS, m), rot = lerp(-.08, 0, m);
  const sx = lerp(.46 * lerp(.85, 1, rise), MS, m), sy = lerp(.34 * lerp(.85, 1, rise), MS, m);
  c.save(); c.globalAlpha = rise; c.translate(cx, cy); c.rotate(rot); c.scale(sx, sy); c.translate(-940.5, -672);
  c.drawImage(u < 1 ? foldedMap(u) : mapBase(), 0, 0);
  for (const st in stateT) {
    const p = eInOut(prog(t, stateT[st] + .05, .9)); if (p <= 0) continue;
    const L = stateLayer(st), first = PrimarkOpenings.find(d => d.state === st && landT[d.id] === stateT[st]);
    const [ox, oy] = first.map_point || clusters[first.panel].at;
    const R = Math.max(...[[L.x0, L.y0], [L.x0 + L.w, L.y0], [L.x0, L.y0 + L.h], [L.x0 + L.w, L.y0 + L.h]].map(([a, b]) => Math.hypot(a - ox, b - oy)));
    c.save(); c.beginPath(); c.arc(ox, oy, 8 + R * p, 0, Math.PI * 2); c.clip(); c.globalAlpha *= clamp(p * 2.5); c.drawImage(L.cv, L.x0, L.y0); c.restore();
    const la = prog(t, stateT[st] + .55, .5); if (la > 0) { c.save(); c.globalAlpha *= la; const [lx, ly] = labelPos[st]; text(c, st, lx, ly, 35, '#354b48', 'DIN Condensed', '700', 'center'); c.restore(); }
  }
  c.restore();
}
function pinsAt(c, t) {
  if (t < 2.6) return;
  for (const d of PrimarkOpenings) if (d.panel === 'national') { const [dx, dy] = offsets[d.id] || [0, -23]; const [x, y] = mapPt(...d.map_point); pinAt(c, t, d.id, x, y, dx, dy); }
  // NY/NJ and MD/VA openings: a numbered block beside the map, tied to the city with a leader.
  const a = prog(t, 2.6, .5);
  for (const g of Object.values(clusters)) {
    const [cx, cy] = mapPt(...g.at), gx = g.x - 14, gy = g.y;
    c.save(); c.globalAlpha = a;
    c.fillStyle = P.ink; c.beginPath(); c.arc(cx, cy, 2.5, 0, Math.PI * 2); c.fill();
    Etch.line(c, [[cx, cy], [gx, gy]], P.ink, .8, 61, .3);
    text(c, g.label, g.x - 12, g.y - 17, 10, P.ink, 'Avenir Next', '700');
    c.restore();
    for (const id of g.ids) stampAt(c, t, id, ...clusterPos[id], 11);
  }
}
function gearAt(c, t, pose) {
  const [x, y, s] = pose, mouth = [x + 120 * s, y + 20 * s];
  const back = eInOut(prog(t, 2.3, .5));
  for (const [draw, B, start] of [[mic, [190, 560, -.22, .95], .85], [speaker, [780, 520, .1, .9], .95]]) {
    const out = eOut(prog(t, start, .65)); if (out <= 0 || back >= 1) continue;
    const k = out * (1 - back), arc = Math.sin(Math.PI * k) * 70 * (1 - back);
    const gx = lerp(mouth[0], B[0], k), gy = lerp(mouth[1], B[1], k) - arc;
    c.save(); c.globalAlpha = clamp(k * 2.5); draw(c, gx, gy, B[2] * k, B[3] * lerp(.3, 1, k)); c.restore();
    if (draw === speaker && k > .9) for (let j = 0; j < 3; j++) {
      const ph = ((t * 1.4 + j / 3) % 1), sc = B[3];
      c.save(); c.translate(gx, gy); c.rotate(B[2]); c.globalAlpha = (1 - ph) * .8 * clamp((k - .9) * 10); c.strokeStyle = P.red; c.lineWidth = 2;
      for (const [yy, base] of [[44, 38], [125, 50]]) { c.beginPath(); c.arc(49 * sc, yy * sc, (base + ph * 46) * sc, -.55, .55); c.stroke(); }
      c.restore();
    }
  }
}
function caseScene(c, t) {
  const toField = eInOut(prog(t, 2.3, .85));
  let pose = mixPose(casePoses[0], casePoses[1], eInOut(prog(t, .1, .9)));
  pose = mixPose(pose, casePoses[2], toField);
  const lid = eBack(prog(t, .45, .6)), hop = -8 * Math.sin(Math.PI * prog(t, .45, .3));
  const [x, y0, s] = pose, y = y0 + hop + 24 * (1 - eOut(prog(t, 0, .5)));
  const sh = (1 - toField) * prog(t, 0, .4);
  if (sh > 0) { c.save(); c.globalAlpha = sh; const e = Etch.ellipse(x + 121 * s, y - hop + 229 * s, 137 * s, 20 * s); Etch.hatch(c, e, [x - 40 * s, y + 200 * s, 330 * s, 60 * s], {seed: 900, angle: .06, spacing: 3, length: 30, color: 'rgba(67,46,38,.28)'}); c.restore(); }
  gearAt(c, t, [x, y, s]);
  const wipe = eInOut(prog(t, 0, .55));
  c.save();
  if (wipe < 1) { c.beginPath(); const e = lerp(-300, 1300, wipe); c.moveTo(0, 0); c.lineTo(e + 250, 0); c.lineTo(e - 250, H); c.lineTo(0, H); c.clip(); }
  caseAt(c, x, y, s, lid);
  c.restore();
  const cap = prog(t, 3, .6); if (cap > 0) { c.save(); c.globalAlpha = cap; text(c, 'Every pin, a proud moment.', 100, 768, 20, P.ink, 'Baskerville'); c.restore(); }
}

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
  const sub = `${d.city}, ${d.state}   ·   ${dateLabel(d.date)}${id === 36 ? '   ·   UPCOMING' : ''}`;
  text(c, sub, 125, 925, 18, id === 36 ? P.red : P.muted, 'Avenir Next', '600');
  c.restore();
}
function calloutAt(c, t) {
  rule(c, 54, 848, 972);
  c.save(); c.beginPath(); c.rect(0, 852, 880, 90); c.clip();
  const n = latest(t);
  if (n === 0) {
    const a = prog(t, .2, .4) * (1 - prog(t, 2.9, .4));
    if (a > 0) { c.globalAlpha = a; text(c, 'Every opening starts with a crew.', 54, 906, 32, P.ink, 'Baskerville'); }
  } else {
    const q = eInOut(prog(t, landT[n], .32));
    if (q < 1 && n > 1) calloutRow(c, t, n - 1, -q * 90);
    if (q < 1 && n === 1) { c.save(); c.globalAlpha = 1 - q; text(c, 'Every opening starts with a crew.', 54, 906 - q * 90, 32, P.ink, 'Baskerville'); c.restore(); }
    calloutRow(c, t, n, (1 - q) * 90);
  }
  c.restore();
  // Counter
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
    if (a < 1) { // empty slot still to fill
      c.save(); c.globalAlpha *= .4 * clamp(1 - a * 3); text(c, num(id), x, y, 14, P.line, 'Avenir Next', '700');
      c.strokeStyle = P.line; c.lineWidth = 1; c.setLineDash([1.5, 4]); c.beginPath(); c.moveTo(x + 28, y - 4); c.lineTo(x + 310, y - 4); c.stroke(); c.restore();
    }
    if (a > 0) {
      const hl = id === n ? 1 - prog(t, landT[id + 1] ?? 99, .5) : (id === n - 1 ? 1 - prog(t, landT[n], .5) : 0);
      if (hl > 0) { c.save(); c.globalAlpha *= hl * a; c.fillStyle = 'rgba(173,80,69,.13)'; c.fillRect(x - 6, y - 15, 322, 20); c.restore(); }
      c.globalAlpha *= a; const dx = 12 * (1 - eOut(a));
      text(c, num(id), x + dx, y, 14, P.red, 'Avenir Next', '700');
      fitText(c, d.name, x + 28 + dx, y, 16, 250, id === 36 ? P.muted : mixColor('#3e3034', '#ad5045', hl), 'Avenir Next', '600');
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
  // A slow push-in on the artwork keeps it breathing; type and logos stay locked.
  c.save(); const zoom = 1 + .02 * eInOut(t / DURATION); c.translate(W / 2, 516); c.scale(zoom, zoom); c.translate(-W / 2, -516);
  mapAt(c, t); pinsAt(c, t); caseScene(c, t);
  c.restore();
  headerAt(c, t); titlesAt(c, t); calloutAt(c, t); ledgerAt(c, t);
  rule(c, 54, 1248, 972); logo(c, 54, 1260, 215); if (images.wordmark) c.drawImage(images.wordmark, 810, 1290, 215, 47);
  c.restore();
}
function render(t, scale = 1, canvas) {
  const cv = canvas || document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale;
  renderInto(cv.getContext('2d'), t, scale); return cv;
}
function warm() { mapBase(); for (const st in stateT) stateLayer(st); }

window.JourneyMotion = {W, H, DURATION, FPS, beats, landT, render, renderInto, warm};
})();
