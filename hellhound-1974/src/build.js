// Lays out each mark as an open spread of a 1970s trademark annual and screenshots it.
// The "scan" look (grain, ink spread, tilt) is added afterwards by age.py.
const { chromium } = require('playwright');
const marks = require('./marks');

const INK = '#1b1a18';
const PAPER = '#f2eee4';
const RED = '#c5413a';

const plates = [
  {
    no: 231, mark: 'cube', title: 'Cube',
    note: 'The cube is kept; the painted depth is removed. Three flat faces, parted by a white seam, carry the two H’s in true isometric. It prints in one colour, reverses cleanly and holds at twelve millimetres.',
  },
  {
    no: 232, mark: 'grille', title: 'Grille',
    note: 'HH set in nine bands, after the cloth of a loudspeaker grille. The crossbars occupy the three middle bands. The band count is a rule, not an ornament: it survives embossing, silk-screen and enamel.',
  },
  {
    no: 233, mark: 'cone', title: 'Cone',
    note: 'A disc, read as the cone of a driver. Two counters and a single channel are cut away; the curve of the disc becomes the outer stems. Suited to badges, dust caps and the face of a cabinet.',
  },
  {
    no: 234, mark: 'depth', title: 'Depth',
    note: 'One H, extruded and drawn as a draughtsman would draw it. The hidden back face, shown dashed, is the second H. Intended for engraved panels, rear plates and technical literature.',
  },
  {
    no: 235, mark: 'horned', title: 'Horned H',
    note: 'The angled cut of the old wordmark is moved to the head of the stems. One letter: two ears, or two horns. The hound is implied, never illustrated.',
  },
];

const svg = (name, size, ink, paper) =>
  `<svg viewBox="0 0 200 200" width="${size}" height="${size}">${marks[name](ink, paper)}</svg>`;

function spread(p, i) {
  const tile = (bg, fg) => `<div class="tile" style="background:${bg}">${svg(p.mark, 104, fg, bg)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 2400px; height: 1600px; background: #c9c8c3; position: relative; overflow: hidden; }
  .cover { position: absolute; left: 150px; top: 92px; width: 2140px; height: 1440px; background: #151514; border-radius: 6px; }
  .page { position: absolute; top: 108px; width: 1046px; height: 1404px; background: ${PAPER}; overflow: hidden; }
  .left { left: 166px; box-shadow: inset -70px 0 60px -40px rgba(60,50,30,.28), inset 2px 0 0 rgba(0,0,0,.05); }
  .right { left: 1212px; box-shadow: inset 70px 0 60px -40px rgba(60,50,30,.30); }
  .edges { position: absolute; top: 112px; left: 2258px; width: 18px; height: 1396px;
    background: repeating-linear-gradient(90deg, #e6e1d5 0 2px, #cfc9bb 2px 3px); }
  .serif { font-family: 'Liberation Serif', serif; color: ${INK}; }
  .sans { font-family: 'Liberation Sans', sans-serif; color: ${INK}; }
  .no { position: absolute; left: 150px; top: 150px; font: 700 30px 'Liberation Sans'; }
  dl { position: absolute; left: 150px; top: 205px; font: italic 33px/1.32 'Liberation Serif'; display: grid; grid-template-columns: 92px auto; }
  dt { font-style: italic; } dt::after { content: ' :'; }
  .note { position: absolute; left: 150px; top: 520px; width: 640px; font: 27px/1.5 'Liberation Serif'; text-align: justify; hyphens: auto; }
  .rule { position: absolute; left: 150px; top: 935px; width: 700px; border-top: 1.5px solid ${INK}; }
  .cap { position: absolute; left: 150px; top: 955px; font: italic 23px 'Liberation Serif'; }
  .row { position: absolute; left: 150px; top: 1010px; display: flex; align-items: flex-end; gap: 38px; }
  .tile { width: 150px; height: 150px; display: grid; place-items: center; }
  .folio { position: absolute; bottom: 70px; font: 22px 'Liberation Sans'; }
  .main { position: absolute; left: 50%; top: 520px; transform: translate(-50%, -50%); }
  .word { position: absolute; left: 0; right: 0; top: 960px; text-align: center; font: 700 30px 'Liberation Sans'; letter-spacing: .5em; padding-left: .5em; }
  .spine { position: absolute; right: 26px; top: 50%; transform: translateY(-50%) rotate(-90deg); transform-origin: right center;
    white-space: nowrap; font: 21px 'Liberation Sans'; letter-spacing: .04em; }
  .spine { right: 40px; transform: translate(50%, -50%) rotate(-90deg); transform-origin: center; }
</style></head><body>
  <div class="cover"></div>
  <div class="page left">
    <div class="no sans">${p.no}</div>
    <dl class="serif">
      <dt>Firm</dt><dd>Hellhound Audio</dd>
      <dt>Act.</dt><dd>Loudspeakers &amp; amplification</dd>
      <dt>Des.</dt><dd>J. Cortes</dd>
      <dt>Year</dt><dd>1974</dd>
    </dl>
    <p class="note serif">${p.note}</p>
    <div class="rule"></div>
    <div class="cap serif">${p.title} &mdash; reductions, reversal and second colour</div>
    <div class="row">
      ${svg(p.mark, 150, INK, PAPER)}${svg(p.mark, 86, INK, PAPER)}${svg(p.mark, 44, INK, PAPER)}
      ${tile(INK, PAPER)}${tile(RED, PAPER)}
    </div>
    <div class="folio sans" style="left:150px">${118 + i * 2}</div>
  </div>
  <div class="page right">
    <div class="main">${svg(p.mark, 600, INK, PAPER)}</div>
    <div class="word sans">HELLHOUND AUDIO</div>
    <div class="spine sans">Marques &amp; symboles &middot; planche ${p.no} &middot; reproduction réservée à l’étude</div>
    <div class="folio sans" style="right:150px">${119 + i * 2}</div>
  </div>
  <div class="edges"></div>
</body></html>`;
}

(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 2400, height: 1600 } });
  for (const [i, p] of plates.entries()) {
    await page.setContent(spread(p, i));
    await page.screenshot({ path: `${out}/raw-${i + 1}-${p.mark}.png` });
  }
  await browser.close();
})();
