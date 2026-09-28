/* The Primark Journey: continuous 30-second Etched Motion.
   Reuses the drawing kit (etch.js, drawing-kit.js, map-paths.js, hellhound-logo.js, openings.js)
   and replaces the twelve held drawings with one eased timeline: the lid swings on its hinge,
   the gear rises out, the map unfolds, then every opening lands as its own pin. */
(function () {
'use strict';
const W = 1080, H = 1350, DURATION = 30, FPS = 30;

/* ---------- Copy (same words as journey.js) ---------- */
offsets[20] = [24, 12];
Object.assign(offsets, {29:[55,-15],30:[45,15],31:[5,-22],32:[45,-6],33:[-8,-23],34:[-24,-26],35:[25,10]});
const counts = [0,0,0,3,7,11,17,25,28,32,35,36];
const titles = [['THE SOUND OF','OPENING DAY.'],['PACKED WITH','POSSIBILITY.'],['ONE CREW.','A BIG JOURNEY.'],['THE FIRST','OPENING DAYS.'],['THE JOURNEY','GROWS.'],['MORE DOORS.','MORE MOMENTS.'],['NEW PLACES.','SAME PRIDE.'],['EVERY OPENING','MATTERS.'],['THE WORK','KEEPS MOVING.'],['MORE TRUST.','MORE MILESTONES.'],['35 OPENINGS.','ONE PROUD CREW.'],['A JOURNEY','BUILT ON TRUST.']];
const spans = ['READY TO ROLL','THE CASE OPENS','THE MAP UNFOLDS','NOV–DEC 2022','APR–JUL 2023','SEP–NOV 2023','JUL 2024–APR 2025','JUL–DEC 2025','APR–MAY 2026','JUN–AUG 2026','SEPTEMBER 2026','NEXT: NOVEMBER 19, 2026'];
const captions = ['Every opening starts with a crew.','The tools. The care. The people behind the day.','A story that reaches across thirteen states.'];

/* ---------- Easing ---------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, start, dur) => clamp((t - start) / dur);
const eOut = x => 1 - Math.pow(1 - x, 3);
const eInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eBack = x => { const k = 1.9; return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); };
const mixColor = (a, b, t) => { const p = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };

/* ---------- Timeline ----------
   0.0  – 2.2   packed case, title wipes in
   2.2  – 4.4   lid swings open, mic and speaker rise out
   4.4  – 6.6   the map unfolds behind the case
   6.6  – 8.0   everything settles into the map layout
   8.0  – 25.0  eight chapters; each opening lands as its own pin
   25.0 – 30.0  the upcoming 36th marker, a thank-you wave, hold */
const beats = [0, 2.2, 4.4];
const landT = {}, chapterOf = {};
{
  let s = 8.0;
  for (let f = 3; f <= 10; f++) {
    beats[f] = s;
    const n = counts[f] - counts[f - 1], dur = 1.6 + .12 * n;
    for (let k = 0; k < n; k++) {
      const id = counts[f - 1] + 1 + k;
      landT[id] = s + .45 + k * (dur - .95) / Math.max(1, n - 1);
      chapterOf[id] = f;
    }
    s += dur;
  }
  beats[11] = s; landT[36] = s + .6; chapterOf[36] = 11;
}
const beatAt = t => { let i = 0; while (i < 11 && t >= beats[i + 1]) i++; return i; };
const pinP = (t, id) => clamp((t - landT[id]) / .55);
const stateT = {};
for (const d of PrimarkOpenings) if (stateT[d.state] === undefined || landT[d.id] < stateT[d.state]) stateT[d.state] = landT[d.id];

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
/* One inked layer per state, revealed from the state's first opening. */
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
const groupPoint = {metro: [1715, 445], capital: [1635, 583]};

/* ---------- Gear (from journey.js) ---------- */
function speaker(c, x, y, angle = 0, scale = 1) { c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale); const p = new Path2D('M0 0 L94 -8 L114 14 L106 179 L9 185 L-8 164 Z'); Etch.fill(c, p, '#5f665b'); Etch.hatch(c, p, [-10, -10, 125, 205], {seed: 320, angle: 1.5, spacing: 2.7, length: 12, color: 'rgba(28,29,27,.5)'}); Etch.outline(c, p, P.ink, 1.4); for (const [yy, rx, ry] of [[44, 29, 25], [125, 39, 38]]) { const e = Etch.ellipse(49, yy, rx, ry); Etch.fill(c, e, '#454940'); Etch.hatch(c, e, [8, yy - 40, 85, 80], {seed: 321 + yy, angle: .4, spacing: 2, color: 'rgba(199,194,159,.24)'}); Etch.outline(c, e, '#b8b4a0', 1); } c.restore(); }
function mic(c, x, y, angle = 0, scale = 1) { c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale); const head = Etch.ellipse(0, 0, 27, 34), body = new Path2D('M-13 28 L13 28 L8 148 L-8 148 Z'); Etch.fill(c, body, '#887a65'); Etch.hatch(c, body, [-16, 24, 32, 125], {seed: 64, angle: 1.5, spacing: 2, color: 'rgba(41,32,36,.6)'}); Etch.outline(c, body, P.ink, 1.2); Etch.fill(c, head, '#c9c3a8'); for (const a of [-.6, .6]) Etch.hatch(c, head, [-29, -36, 58, 72], {seed: 68, angle: a, spacing: 3, length: 15, color: 'rgba(41,32,36,.56)'}); Etch.outline(c, head, P.ink, 1.2); c.restore(); }

/* ---------- Road case with a hinged lid (0 closed, 1 open) ---------- */
function caseAt(c, x, y, s, lid) {
  roadcase(c, x, y, s, 0);
  if (lid <= .001) return;
  c.save(); c.translate(x, y); c.scale(s, s);
  const top = new Path2D('M 0 33 L 71 0 L 239 13 L 165 52 Z');
  c.save(); c.globalAlpha *= clamp(lid * 4); Etch.fill(c, top, '#463b3c'); Etch.hatch(c, top, [0, 0, 240, 52], {angle: -.35, spacing: 3.5, length: 22, color: 'rgba(43,36,28,.30)', seed: 23}); Etch.outline(c, top, P.ink, 1.4, 33); c.restore();
  // Parallel projection: the lid's free edge turns from "toward us" to "straight up" about the hinge.
  const th = lid * Math.PI / 2, vx = Math.cos(th) * -71 + Math.sin(th) * -25, vy = Math.cos(th) * 33 + Math.sin(th) * -150;
  const close = 1 - clamp(lid), H1 = [71, 0], H2 = [239, 13];
  const F1 = [H1[0] + vx, H1[1] + vy], F2 = [H2[0] + vx - 3 * close, H2[1] + vy + 6 * close];
  const lp = new Path2D(`M${H1} L${F1} L${F2} L${H2} Z`);
  Etch.fill(c, lp, mixColor('#dba592', '#be8b70', clamp(lid)));
  c.save(); c.clip(lp); c.transform(168 / 168, 13 / 168, vx / 100, vy / 100, 71, 0);
  Etch.hatch(c, new Path2D('M-2 -2 H170 V102 H-2 Z'), [0, 0, 168, 100], {seed: 71, angle: .35, spacing: 4, length: 22, width: .7, color: 'rgba(65,34,35,.36)'});
  c.restore();
  Etch.outline(c, lp, P.ink, 1.2);
  c.restore();
}
const casePoses = [[240, 460, 1.9], [280, 595, 1.65], [330, 670, 1.4], [123, 568, .75]];
const mixPose = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

/* ---------- Map unfolding ---------- */
function foldedMap(u) {
  const src = mapBase(), cv = cache.fold || (cache.fold = Etch.layer(1881, 1344, () => {})), c = cv.getContext('2d');
  c.clearRect(0, 0, 1881, 1344);
  const edges = [0, 450, 920, 1370, 1881], f = [0, 1, 2, 3].map(i => .1 + .9 * eInOut(clamp((u - i * .17) / .5)));
  const widths = f.map((k, i) => (edges[i + 1] - edges[i]) * k), total = widths.reduce((a, b) => a + b);
  let x = (1881 - total) / 2;
  for (let i = 0; i < 4; i++) {
    const sw = edges[i + 1] - edges[i];
    c.drawImage(src, edges[i], 0, sw, 1344, x, 0, widths[i], 1344);
    const g = c.createLinearGradient(x, 0, x + widths[i], 0), shade = .5 * (1 - f[i]);
    g.addColorStop(i % 2 ? 1 : 0, `rgba(58,40,32,${shade})`); g.addColorStop(i % 2 ? 0 : 1, `rgba(255,248,222,${shade * .35})`);
    c.save(); c.globalCompositeOperation = 'source-atop'; c.fillStyle = g; c.fillRect(x, 0, widths[i], 1344); c.restore();
    x += widths[i];
  }
  return cv;
}

/* ---------- Markers ---------- */
function stampAt(c, t, id, x, y, r = 13) {
  const p = pinP(t, id); if (p <= 0) return;
  const wave = Math.sin(Math.PI * prog(t, beats[11] + 1.4 + (id - 1) * .03, .42));
  const k = eBack(clamp(p / .8)) * (1 + .22 * wave), drop = -16 * (1 - eOut(p));
  // Ripple where the marker lands.
  const q = prog(t, landT[id] + .12, .85);
  if (q > 0 && q < 1) { c.save(); c.globalAlpha *= .55 * (1 - q); c.strokeStyle = P.red; c.lineWidth = 1.6; c.beginPath(); c.arc(x, y, r + 3 + 26 * eOut(q), 0, Math.PI * 2); c.stroke(); c.restore(); }
  c.save(); c.globalAlpha *= clamp(p * 3); c.translate(x, y + drop); c.scale(k, k);
  if (id === 36) {
    const e = Etch.ellipse(0, 0, r, r); Etch.fill(c, e, P.paper);
    c.strokeStyle = P.red; c.lineWidth = 1.5; c.setLineDash([3, 2]); c.lineDashOffset = -t * 6;
    c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * eOut(p)); c.stroke(); c.setLineDash([]);
    c.globalAlpha *= clamp((p - .4) * 3); text(c, '36', 0, 4.7, 12, P.red, 'Avenir Next', '700', 'center');
  } else {
    c.fillStyle = 'rgba(50,32,23,.14)'; c.beginPath(); c.arc(1.8, 2, r, 0, Math.PI * 2); c.fill();
    const e = Etch.ellipse(0, 0, r, r); Etch.fill(c, e, P.red); Etch.outline(c, e, P.ink, .65, id);
    text(c, num(id), 0, 4.7, 12, P.paper, 'Avenir Next', '700', 'center');
  }
  c.restore();
  // "New" ticks while this opening's chapter is on screen.
  if (id < 36) {
    const f = chapterOf[id], a = prog(t, landT[id] + .25, .3) * (1 - prog(t, beats[f + 1], .35));
    if (a > 0) { c.save(); c.globalAlpha *= a; for (let j = 0; j < 3; j++) { const ang = -2.4 + j * .85; Etch.line(c, [[x + Math.cos(ang) * (r + 5), y + Math.sin(ang) * (r + 5)], [x + Math.cos(ang) * (r + 11), y + Math.sin(ang) * (r + 11)]], P.red, .8, 50 + id); } c.restore(); }
  }
}
function pinAt(c, t, id, x, y, dx = 0, dy = -23) {
  const p = pinP(t, id); if (p <= 0) return;
  const lp = eOut(clamp(p / .45));
  c.save(); c.fillStyle = P.ink; c.beginPath(); c.arc(x, y, 2 * eBack(clamp(p / .3)), 0, Math.PI * 2); c.fill(); c.restore();
  if (lp > .02) Etch.line(c, [[x, y], [x + dx * lp, y + dy * lp]], P.ink, 1, id, .35);
  stampAt(c, t - .12, id, x + dx, y + dy);
}

/* ---------- Close-up panels (drawing-kit metro/capital, animated) ---------- */
function metroPanel(c, t) {
  c.save(); c.translate(55, 1008); rule(c, 0, 0, 603); text(c, 'NEW YORK / NEW JERSEY', 0, 27, 15, P.ink, 'Avenir Next', '700');
  const land = new Path2D('M135 53 L176 41 L179 71 L210 80 L270 72 L356 81 L516 49 L557 72 L425 107 L351 119 L263 116 L205 130 L163 117 L159 80 Z'); Etch.fill(c, land, '#c7e3e1'); Etch.outline(c, land, '#799d9e', .7, 5);
  Etch.line(c, [[130, 45], [146, 77], [146, 112], [163, 147]], '#009fc8', 1.8, 2);
  text(c, 'NJ', 15, 65, 11, P.muted); text(c, 'MANHATTAN', 131, 42, 9, P.muted); text(c, 'LONG ISLAND', 417, 160, 10, P.muted);
  for (const [id, x, y] of [[6,69,139],[19,98,84],[27,160,61],[3,192,133],[15,255,76],[2,310,111],[5,383,138],[1,427,80],[10,536,61]]) stampAt(c, t, id, x, y, 13);
  c.restore();
}
function capitalPanel(c, t) {
  c.save(); c.translate(700, 1008); rule(c, 0, 0, 325); text(c, 'MID-ATLANTIC', 0, 27, 15, P.ink, 'Avenir Next', '700');
  const land = new Path2D('M14 50 L293 47 L276 159 L33 172 Z'); Etch.fill(c, land, '#d9e6da'); Etch.line(c, [[128, 45], [144, 69], [147, 97], [172, 125], [156, 161]], '#009fc8', 2, 11);
  for (const [id, x, y, label] of [[8,239,60,'HANOVER'],[28,227,112,'HYATTSVILLE'],[12,69,70,'TYSONS'],[17,74,139,'WOODBRIDGE'],[36,149,103,'PENTAGON CITY']]) {
    stampAt(c, t, id, x, y, 13);
    const a = prog(t, landT[id] + .25, .4); if (a > 0) { c.save(); c.globalAlpha *= a; text(c, label, x, y + 27, 8.5, P.ink, 'Avenir Next', '600', 'center'); c.restore(); }
  }
  c.restore();
}

/* ---------- Scene pieces ---------- */
function titleLine(c, s, y, size, color, box, off) { c.save(); c.beginPath(); c.rect(0, box[0], W, box[1] - box[0]); c.clip(); text(c, s, 52, y + off, size, color, 'DIN Condensed', '700'); c.restore(); }
function titlesAt(c, t) {
  const i = beatAt(t), s = beats[i] + (i === 0 ? .3 : 0);
  const lines = [[0, 155, 76, P.ink, [82, 170], 0], [1, 235, 86, P.red, [170, 254], .1]];
  for (const [n, y, size, color, box, delay] of lines) {
    const q = eInOut(prog(t, s + delay, .7));
    if (i > 0 && q < 1) titleLine(c, titles[i - 1][n], y, size, color, box, -q * 96);
    if (q > 0) titleLine(c, titles[i][n], y, size, color, box, (1 - q) * 96);
  }
  const q = prog(t, s + .2, .6);
  c.save(); if (i > 0 && q < 1) { c.globalAlpha = 1 - q; text(c, spans[i - 1], 1025, 279 - 8 * q, 16, P.muted, 'Avenir Next', '600', 'right'); }
  c.globalAlpha = q; text(c, spans[i], 1025, 279 + 8 * (1 - q), 16, P.muted, 'Avenir Next', '600', 'right'); c.restore();
}
function headerAt(c, t) {
  text(c, 'HELLHOUND AUDIO  /  THE PRIMARK JOURNEY', 54, 52, 16, P.ink, 'Avenir Next', '700');
  let year = '2022'; for (const d of PrimarkOpenings) if (d.id < 36 && t >= landT[d.id]) year = d.date.slice(0, 4);
  if (t >= landT[36]) year = '2026 →';
  text(c, year, 1026, 52, 14, P.muted, 'Avenir Next', '600', 'right');
  rule(c, 54, 73, 972);
  c.save(); c.strokeStyle = P.red; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(54, 73); c.lineTo(54 + 972 * clamp(t / DURATION), 73.4); c.stroke(); c.restore();
}
function footerAt(c, t) {
  rule(c, 54, 1135, 972);
  const i = beatAt(t);
  // Opening captions, crossfading beat to beat.
  if (t < 7.6) {
    const out = 1 - prog(t, 6.7, .6);
    for (let k = 0; k < 3; k++) {
      const a = (k === 0 ? prog(t, .5, .6) : prog(t, beats[k] + .25, .5)) * (k < 2 ? 1 - prog(t, beats[k + 1] + .05, .35) : 1) * out;
      if (a > 0) { c.save(); c.globalAlpha = a; text(c, captions[k], 54, 1183 + 6 * (1 - a), 29, P.ink, 'Baskerville'); c.restore(); }
    }
    c.save(); c.globalAlpha = prog(t, .8, .6) * out; text(c, 'An illustrated celebration of the work and the trust behind it.', 54, 1220, 18, P.muted); c.restore();
  }
  // Each chapter's openings type in as their pins land.
  for (let f = Math.max(3, i - 1); f <= Math.min(10, i); f++) {
    const rows = PrimarkOpenings.filter(d => d.id > counts[f - 1] && d.id <= counts[f]), two = rows.length > 4, fade = 1 - prog(t, beats[f + 1], .3);
    rows.forEach((d, k) => {
      const a = prog(t, landT[d.id] - .05, .35) * fade; if (a <= 0) return;
      const col = two ? Math.floor(k / 4) : 0, row = two ? k % 4 : k;
      const label = two ? `${num(d.id)}  ${d.name} / ${d.state}` : `${num(d.id)}   ${d.name} / ${d.city}, ${d.state}`;
      c.save(); c.globalAlpha = a; text(c, label, 54 + col * 510 + 14 * (1 - eOut(a)), 1160 + row * 23, two ? 16 : 18, P.ink, 'Avenir Next', '500'); c.restore();
    });
  }
  const a = prog(t, beats[11] + .5, .6), b = prog(t, beats[11] + .9, .6);
  if (a > 0) { c.save(); c.globalAlpha = a; text(c, '35 openings. 13 states. Thank you, Primark.', 54, 1181 + 8 * (1 - eOut(a)), 31, P.ink, 'Baskerville'); c.globalAlpha = b; text(c, 'NEXT: 36  Pentagon City Mall, Arlington, VA  /  NOV 19, 2026', 54, 1218, 19, P.muted); c.restore(); }
  rule(c, 54, 1248, 972); logo(c, 54, 1260, 215); if (images.wordmark) c.drawImage(images.wordmark, 810, 1290, 215, 47);
}
function mapAt(c, t) {
  const u = prog(t, 4.5, 1.9); if (u <= 0) return;
  const m = eInOut(prog(t, 6.6, 1.35)), rise = eOut(clamp(u / .45));
  const cx = lerp(550, 539.25, m), cy = lerp(540 + 90 * (1 - rise), 590, m), rot = lerp(-.08, 0, m);
  const sx = lerp(.48 * lerp(.85, 1, rise), .515, m), sy = lerp(.35 * lerp(.85, 1, rise), .515, m);
  c.save(); c.globalAlpha = rise; c.translate(cx, cy); c.rotate(rot); c.scale(sx, sy); c.translate(-940.5, -672);
  c.drawImage(u < 1 ? foldedMap(u) : mapBase(), 0, 0);
  // States ink in, spreading out from the first opening in each.
  for (const st in stateT) {
    const p = eInOut(prog(t, stateT[st] + .05, .9)); if (p <= 0) continue;
    const L = stateLayer(st), first = PrimarkOpenings.find(d => d.state === st && landT[d.id] === stateT[st]);
    const [ox, oy] = first.map_point || groupPoint[first.panel];
    const R = Math.max(...[[L.x0, L.y0], [L.x0 + L.w, L.y0], [L.x0, L.y0 + L.h], [L.x0 + L.w, L.y0 + L.h]].map(([a, b]) => Math.hypot(a - ox, b - oy)));
    c.save(); c.beginPath(); c.arc(ox, oy, 8 + R * p, 0, Math.PI * 2); c.clip(); c.globalAlpha *= clamp(p * 2.5); c.drawImage(L.cv, L.x0, L.y0); c.restore();
    const la = prog(t, stateT[st] + .55, .5); if (la > 0) { c.save(); c.globalAlpha *= la; const [lx, ly] = labelPos[st]; text(c, st, lx, ly, 35, '#354b48', 'DIN Condensed', '700', 'center'); c.restore(); }
  }
  c.restore();
}
function fieldAt(c, t) {
  if (t < 6.8) return;
  // Pins in chronological order so later markers sit on top.
  for (const d of PrimarkOpenings) if (d.panel === 'national') { const [dx, dy] = offsets[d.id] || [0, -23]; pinAt(c, t, d.id, 55 + d.map_point[0] * .515, 244 + d.map_point[1] * .515, dx, dy); }
  for (const [group, gx, gy, label] of [['metro', 1715, 445, 'NY / NJ'], ['capital', 1635, 583, 'MD / VA']]) {
    const landed = PrimarkOpenings.filter(d => d.panel === group && t >= landT[d.id]); if (!landed.length) continue;
    const last = landT[landed[landed.length - 1].id], first = landT[landed[0].id], pop = 1 + .3 * Math.sin(Math.PI * prog(t, last, .35));
    const px = 55 + gx * .515, py = 244 + gy * .515;
    c.save(); c.globalAlpha = prog(t, first, .3); c.translate(px, py); c.scale(pop, pop);
    Etch.outline(c, Etch.ellipse(0, 0, 18, 18), P.red, 1.2, 52); text(c, String(landed.length), 0, 5, 16, P.ink, 'Avenir Next', '700', 'center'); c.restore();
    c.save(); c.globalAlpha = prog(t, first, .3); text(c, label, px + 25, py - 12, 10, P.ink); c.restore();
  }
  const pa = eOut(prog(t, 6.9, 1)); c.save(); c.globalAlpha = pa; c.translate(0, -76 + 34 * (1 - pa)); metroPanel(c, t); capitalPanel(c, t); c.restore();
  // Counter ticks with each landing.
  let n = 0, lastT = -1; for (let id = 1; id <= 35; id++) if (t >= landT[id]) { n = id; lastT = landT[id]; }
  const ca = prog(t, 7.55, .6), bump = 1 + .1 * Math.sin(Math.PI * prog(t, lastT, .3));
  c.save(); c.globalAlpha = ca; c.translate(395, 477); c.scale(bump, bump); text(c, num(n), 0, 0, 100, P.red, 'DIN Condensed', '700'); c.restore();
  c.save(); c.globalAlpha = ca; text(c, 'OPENINGS', 401, 509, 23, P.ink, 'DIN Condensed', '700');
  c.globalAlpha = prog(t, landT[36] + .3, .5); text(c, '+ 1 UPCOMING', 401, 535, 17, P.red, 'DIN Condensed', '700'); c.restore();
}
function gearAt(c, t, pose) {
  const [x, y, s] = pose, mouth = [x + 120 * s, y + 20 * s];
  const back = eInOut(prog(t, 6.6, .7)), shift = eInOut(prog(t, 4.4, 1.6));
  const items = [
    [mic, [206, 414, -.3, 1], [150, 700, -.22, .95], 2.55],
    [speaker, [770, 431, .12, 1.1], [800, 690, .1, .9], 2.75],
  ];
  for (const [draw, A, B, start] of items) {
    const out = eOut(prog(t, start, 1.1)); if (out <= 0 || back >= 1) continue;
    const pose2 = A.map((v, i) => lerp(v, B[i], shift));
    const k = out * (1 - back), arc = Math.sin(Math.PI * k) * 70;
    const gx = lerp(mouth[0], pose2[0], k), gy = lerp(mouth[1], pose2[1], k) - arc * (1 - shift);
    c.save(); c.globalAlpha = clamp(k * 2.5);
    draw(c, gx, gy, pose2[2] * k, pose2[3] * lerp(.3, 1, k));
    c.restore();
    // Sound rings pulse from the speaker while it is out.
    if (draw === speaker && k > .9) {
      for (let j = 0; j < 3; j++) {
        const ph = ((t * 1.1 + j / 3) % 1), sc = pose2[3];
        c.save(); c.translate(gx, gy); c.rotate(pose2[2]); c.globalAlpha = (1 - ph) * .8 * clamp((k - .9) * 10); c.strokeStyle = P.red; c.lineWidth = 2;
        for (const [yy, base] of [[44, 38], [125, 50]]) { c.beginPath(); c.arc(49 * sc, yy * sc, (base + ph * 46) * sc, -.55, .55); c.stroke(); }
        c.restore();
      }
    }
  }
}
function openerAt(c, t) {
  const toField = eInOut(prog(t, 6.6, 1.35));
  let pose = mixPose(casePoses[0], casePoses[1], eInOut(prog(t, 1.45, 1.3)));
  pose = mixPose(pose, casePoses[2], eInOut(prog(t, 4.4, 1.6)));
  pose = mixPose(pose, casePoses[3], toField);
  const lid = eBack(prog(t, 1.95, 1.05)), hop = -9 * Math.sin(Math.PI * prog(t, 1.95, .4));
  const [x, y0, s] = pose, y = y0 + hop + 30 * (1 - eOut(prog(t, 0, .9)));
  // Shadow fades as the case settles onto the map.
  const sh = 1 - toField;
  if (sh > 0) { c.save(); c.globalAlpha = sh * prog(t, .1, .6); const e = Etch.ellipse(x + 121 * s, y - hop + 121 * s + 108 * s, 137 * s, 20 * s); Etch.hatch(c, e, [x - 40 * s, y + 200 * s, 330 * s, 60 * s], {seed: 900, angle: .06, spacing: 3, length: 30, color: 'rgba(67,46,38,.28)'}); c.restore(); }
  gearAt(c, t, [x, y, s]);
  // The case etches in from the left on the first beat.
  const wipe = eInOut(prog(t, 0, 1.1));
  c.save();
  if (wipe < 1) { c.beginPath(); const e = lerp(-300, 1300, wipe); c.moveTo(0, 0); c.lineTo(e + 250, 0); c.lineTo(e - 250, H); c.lineTo(0, H); c.clip(); }
  caseAt(c, x, y, s, lid);
  c.restore();
  // Luggage tag: in with the case, off as the lid opens.
  const tg = prog(t, .6, .5) * (1 - prog(t, 1.6, .45));
  if (tg > 0) {
    c.save(); c.globalAlpha = tg; c.translate(0, 18 * (1 - tg));
    const tag = new Path2D('M140 874 L379 848 L390 940 L149 967 Z'); Etch.fill(c, tag, '#d3c091'); Etch.outline(c, tag, P.ink, 1);
    c.save(); c.translate(161, 904); c.rotate(-.105); text(c, 'THE PRIMARK JOURNEY', 0, 0, 17, P.ink, 'DIN Condensed', '700'); text(c, 'HELLHOUND AUDIO', 0, 28, 21, P.ink, 'DIN Condensed', '700'); c.restore();
    Etch.line(c, [[156, 882], [185, 859], [283, 837]], P.ink, .9); c.restore();
  }
  const cap = prog(t, 7.4, .8); if (cap > 0) { c.save(); c.globalAlpha = cap; text(c, 'Every pin, a proud moment.', 115, 819, 23, P.ink, 'Baskerville'); c.restore(); }
}

/* ---------- Frame ---------- */
function renderInto(c, t, scale = 1) {
  t = clamp(t, 0, DURATION);
  if (cache.scale !== scale) { cache.scale = scale; cache.paper = null; }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(paperLayer(), 0, 0); c.restore();
  c.save(); c.scale(scale, scale);
  // A slow, constant push-in on the artwork keeps the page breathing; type and logos stay locked.
  c.save();
  const zoom = 1 + .022 * eInOut(t / DURATION); c.translate(W / 2, 600); c.scale(zoom, zoom); c.translate(-W / 2, -600);
  mapAt(c, t);
  fieldAt(c, t);
  openerAt(c, t);
  c.restore();
  headerAt(c, t);
  titlesAt(c, t);
  footerAt(c, t);
  c.restore();
}
function render(t, scale = 1, canvas) {
  const cv = canvas || document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale;
  renderInto(cv.getContext('2d'), t, scale); return cv;
}
function warm() { mapBase(); for (const st in stateT) stateLayer(st); }

window.JourneyMotion = {W, H, DURATION, FPS, beats, landT, render, renderInto, warm};
})();
