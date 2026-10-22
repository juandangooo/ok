// Five Hellhound Audio marks, each drawn in a 200 x 200 box.
// `ink` is the printing colour, `paper` the knock-out colour.

function cube(ink = '#000', paper = '#fff') {
  // Isometric hexagon split into three faces; an H is cut from each side face.
  const T = [100, 12], UR = [176, 56], LR = [176, 144], B = [100, 188], LL = [24, 144], UL = [24, 56], C = [100, 100];
  const poly = (pts) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${ink}"/>`;
  // H in unit-square coordinates, mapped onto each face with an affine matrix.
  const H = 'M0.2 0.17H0.4V0.43H0.6V0.17H0.8V0.83H0.6V0.57H0.4V0.83H0.2Z';
  const g = 3.2; // white seam between faces
  return `
  <g stroke="${paper}" stroke-width="${g}" stroke-linejoin="round">
    ${poly([T, UR, C, UL])}
    ${poly([UL, C, B, LL])}
    ${poly([C, UR, LR, B])}
  </g>
  <path d="${H}" fill="${paper}" transform="matrix(76 44 0 88 24 56)"/>
  <path d="${H}" fill="${paper}" transform="matrix(76 -44 0 88 100 100)"/>`;
}

function grille(ink = '#000', paper = '#fff') {
  // HH cut into nine bands, like a loudspeaker grille. The crossbars take the middle three bands.
  const x0 = 10, y0 = 40, h = 120, n = 9, p = h / n, band = p * 0.62;
  const stems = [[0, 30], [56, 86], [114, 144], [170, 200]].map(([a, b]) => [a * 0.9 + x0, b * 0.9 + x0]);
  let out = '';
  for (let i = 0; i < n; i++) {
    const y = y0 + i * p;
    const row = i >= 3 && i <= 5 ? [[stems[0][0], stems[1][1]], [stems[2][0], stems[3][1]]] : stems;
    for (const [a, b] of row) out += `<rect x="${a}" y="${y}" width="${b - a}" height="${band}" fill="${ink}"/>`;
  }
  return out;
}

function cone(ink = '#000', paper = '#fff') {
  // A loudspeaker cone read as a disc. Two counters and one channel carve HH out of it;
  // the curve of the disc supplies the outer stems.
  const strip = (a, b) => `<rect x="${100 + a}" y="0" width="${b - a}" height="200" fill="${paper}"/>`;
  const counter = (a, b) => `${strip(a, b)}<rect x="${100 + a}" y="91" width="${b - a}" height="18" fill="${ink}"/>`;
  return `
  <defs><clipPath id="disc"><circle cx="100" cy="100" r="88"/></clipPath></defs>
  <g clip-path="url(#disc)">
    <rect width="200" height="200" fill="${ink}"/>
    ${counter(-50, -26)}${strip(-3.5, 3.5)}${counter(26, 50)}
  </g>`;
}

function depth(ink = '#000', paper = '#fff') {
  // One H, extruded and drawn in line. Its front face and its back face make the pair: HH.
  const H = [[0, 0], [36, 0], [36, 58], [74, 58], [74, 0], [110, 0], [110, 150], [74, 150], [74, 88], [36, 88], [36, 150], [0, 150]];
  const ox = 30, oy = 46, dx = 28, dy = -22;
  const f = H.map(([x, y]) => [x + ox, y + oy]);
  const b = f.map(([x, y]) => [x + dx, y + dy]);
  const pts = (a) => a.map((p) => p.join(',')).join(' ');
  const st = `fill="${paper}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"`;
  // Side walls, painted back to front: walls facing away first, then those facing up or right.
  const walls = f.map((p, i) => {
    const q = f[(i + 1) % f.length];
    const nx = q[1] - p[1], ny = -(q[0] - p[0]); // outward normal for a clockwise outline
    const seen = nx * dx + ny * dy > 0;
    const far = Math.min(p[0], q[0]) - Math.max(p[1], q[1]); // further up-right = drawn earlier
    return { seen, far, poly: [p, q, b[(i + 1) % f.length], b[i]] };
  });
  walls.sort((a, c) => (a.seen - c.seen) || (c.far - a.far));
  return `<polygon points="${pts(b)}" ${st}/>` +
    walls.map((w) => `<polygon points="${pts(w.poly)}" ${st}/>`).join('') +
    `<polygon points="${pts(f)}" ${st}/>` +
    // Hidden edges, dashed: the back face reappears as the second H.
    `<g fill="none" stroke="${ink}" stroke-width="1.1" stroke-dasharray="4 3.5">` +
    `<polygon points="${pts(b)}"/>` +
    f.map((p, i) => `<line x1="${p[0]}" y1="${p[1]}" x2="${b[i][0]}" y2="${b[i][1]}"/>`).join('') +
    `</g>`;
}

function horned(ink = '#000', paper = '#fff') {
  // A single heavy H; the stem tops are cut on the angle of the old wordmark's hook,
  // so the letter carries two ears, or two horns.
  const d = 'M34 22L82 54V92H118V54L166 22V178H118V122H82V178H34Z';
  return `<path d="${d}" fill="${ink}"/>`;
}

module.exports = { cube, grille, cone, depth, horned };
