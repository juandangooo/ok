// Rebuild map-paths.js and the store positions in openings.js/json from real boundaries.
//   node tools/build-map.mjs <dir with national.json nyc.json dc.json>
// Source: U.S. Census Bureau cartographic boundary file cb_2023_us_state_500k, prepared with mapshaper:
//   national: lower 48 + DC, -simplify interval=1800 keep-shapes, -filter-islands min-area=150km2
//   nyc / dc: -clip to the metro box, -simplify interval=60, -filter-islands min-area=0.3km2
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
const read = f => JSON.parse(fs.readFileSync(path.join(src, f), 'utf8'));

// Store coordinates (approximate mall locations from the supplied addresses).
const coords = {
  1: [-73.6130, 40.7385], 2: [-73.7985, 40.7040], 3: [-73.9833, 40.6906], 4: [-78.7627, 42.9057],
  5: [-73.7222, 40.6627], 6: [-74.1732, 40.6618], 7: [-73.8484, 42.6892], 8: [-76.7263, 39.1577],
  9: [-88.0371, 42.0467], 10: [-73.1330, 40.8605], 11: [-80.7263, 35.3654], 12: [-77.2215, 38.9179],
  13: [-81.3963, 28.4460], 14: [-83.3013, 42.7058], 15: [-73.8697, 40.7349], 16: [-98.2393, 26.2193],
  17: [-77.2957, 38.6450], 18: [-89.7919, 35.2067], 19: [-74.0376, 40.7271], 20: [-106.3797, 31.7780],
  21: [-86.8132, 35.9543], 22: [-87.9538, 42.3811], 23: [-95.8034, 29.7741], 24: [-97.0417, 32.9690],
  25: [-80.3808, 25.7880], 26: [-97.1980, 32.8280], 27: [-73.9895, 40.7497], 28: [-76.9551, 38.9677],
  29: [-97.1142, 32.6780], 30: [-95.5475, 29.9602], 31: [-86.0690, 39.9142], 32: [-81.4946, 28.3858],
  33: [-93.2422, 44.8549], 34: [-84.0867, 33.9829], 35: [-82.0823, 33.4726], 36: [-77.0600, 38.8625],
};

// Albers equal-area conic, USGS standard parallels.
const rad = Math.PI / 180, p1 = 29.5 * rad, p2 = 45.5 * rad, lat0 = 37.5 * rad, lon0 = -96 * rad;
const n = (Math.sin(p1) + Math.sin(p2)) / 2, C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1), r0 = Math.sqrt(C - 2 * n * Math.sin(lat0)) / n;
const albers = (lon, lat) => { const r = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n, th = n * (lon * rad - lon0); return [r * Math.sin(th), -(r0 - r * Math.cos(th))]; };

const rings = g => g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
const nat = read('national.json');
let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
for (const f of nat.features) for (const ring of rings(f.geometry)) for (const [lo, la] of ring) { const [x, y] = albers(lo, la); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const FW = 1881, FH = 1344, pad = 28, k = Math.min((FW - 2 * pad) / (x1 - x0), (FH - 2 * pad) / (y1 - y0));
const ox = (FW - k * (x1 - x0)) / 2 - k * x0, oy = (FH - k * (y1 - y0)) / 2 - k * y0;
const project = (lon, lat) => { const [x, y] = albers(lon, lat); return [ox + k * x, oy + k * y]; };
const r1 = v => Math.round(v * 10) / 10;

function pathOf(geom, proj) {
  let d = '';
  for (const ring of rings(geom)) { ring.forEach(([lo, la], i) => { const [x, y] = proj(lo, la); d += `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`; }); d += 'Z'; }
  return d;
}
function boundsOf(geom, proj) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings(geom)) for (const [lo, la] of ring) { const [x, y] = proj(lo, la); b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; }
  return [Math.floor(b[0]), Math.floor(b[1]), Math.ceil(b[2] - b[0]), Math.ceil(b[3] - b[1])];
}
// Label anchor: area-weighted centroid of the largest ring, nudged inside if needed.
function labelOf(geom, proj) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = null, bestA = 0;
  for (const poly of polys) {
    const pts = poly[0].map(([lo, la]) => proj(lo, la)); let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length - 1; i++) { const [xa, ya] = pts[i], [xb, yb] = pts[i + 1], f = xa * yb - xb * ya; a += f; cx += (xa + xb) * f; cy += (ya + yb) * f; }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; }
  }
  return best.map(Math.round);
}

const shapes = nat.features.sort((a, b) => a.properties.STUSPS.localeCompare(b.properties.STUSPS))
  .map(f => ({state: f.properties.STUSPS, name: f.properties.NAME, d: pathOf(f.geometry, project), bounds: boundsOf(f.geometry, project)}));
const labels = Object.fromEntries(nat.features.map(f => [f.properties.STUSPS, labelOf(f.geometry, project)]));
// Hand adjustments where the centroid falls awkwardly for a label.
Object.assign(labels, {FL: [labels.FL[0] + 22, labels.FL[1] + 10], MI: [labels.MI[0] + 8, labels.MI[1] + 30], VA: [labels.VA[0] + 20, labels.VA[1] + 4], MD: [labels.MD[0] + 6, labels.MD[1] - 2], NJ: [labels.NJ[0] + 2, labels.NJ[1] + 4], NY: [labels.NY[0] + 4, labels.NY[1] + 4]});

// Metro insets in local units: x = east (km-ish), y = south; 100 units per degree of latitude.
function inset(file, box) {
  const [w, s, e, nn] = box, latc = (s + nn) / 2, cx = Math.cos(latc * rad);
  const proj = (lo, la) => [(lo - w) * cx * 100, (nn - la) * 100];
  const g = read(file);
  return {box, size: [r1((e - w) * cx * 100), r1((nn - s) * 100)], cos: cx,
    shapes: g.features.map(f => ({state: f.properties.STUSPS, d: pathOf(f.geometry, proj)}))};
}
const insets = {nyc: inset('nyc.json', [-74.75, 40.35, -72.55, 41.2]), dc: inset('dc.json', [-77.75, 38.35, -76.25, 39.45])};

const out = `/* U.S. state boundaries: Census Bureau cb_2023_us_state_500k, simplified with mapshaper.
   Albers equal-area conic (29.5°N / 45.5°N, centred on 96°W) fitted to a ${FW} x ${FH} frame.
   Generated by tools/build-map.mjs; edit that script, not this file. */
globalThis.MapShapes=${JSON.stringify(shapes)};
globalThis.MapLabels=${JSON.stringify(labels)};
globalThis.MapInsets=${JSON.stringify(insets)};
globalThis.MapProject=(()=>{const rad=Math.PI/180,n=${n},C=${C},r0=${r0},lon0=${lon0},k=${k},ox=${ox},oy=${oy};return (lon,lat)=>{const r=Math.sqrt(C-2*n*Math.sin(lat*rad))/n,th=n*(lon*rad-lon0);return [ox+k*r*Math.sin(th),oy-k*(r0-r*Math.cos(th))]}})();
`;
fs.writeFileSync(path.join(root, 'map-paths.js'), out);

// Store positions: real coordinates, projected national points.
const data = JSON.parse(fs.readFileSync(path.join(root, 'openings.json'), 'utf8'));
for (const d of data) { const [lo, la] = coords[d.id]; d.lon = lo; d.lat = la; d.map_point = project(lo, la).map(Math.round); }
fs.writeFileSync(path.join(root, 'openings.json'), JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'openings.js'), `globalThis.PrimarkOpenings=${JSON.stringify(data)};\n`);
console.log('shapes', shapes.length, 'map-paths.js', fs.statSync(path.join(root, 'map-paths.js')).size, 'bytes; k', k.toFixed(6));
