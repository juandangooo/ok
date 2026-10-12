import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, context } from "../../manuals/p2s/lib.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 620, HEIGHT = 400;

// Predator 5000 Super Quiet Inverter (Harbor Freight 70143). x along the body, y across, z up.
// The access panel and oil drain door are on the +y side, facing the viewer.
const L_ = 240, W_ = 110, Z0 = 20, ZT = 150;
const BODY = { x: 0, y: 0, w: L_, d: W_, r: 14 };
const PANEL = [104, 206, 44, 118]; // x0 x1 z0 z1 on the +y face
const DOOR = [58, 94, 24, 42];
const FACE = W_;
const PLUG = [76, FACE, 33];
const NECK_TOP = [150, FACE - 4, 86];

const P = k.fitProjection([...k.boxCorners(BODY, 0, ZT + 26), [60, 190, 0], [150, 200, 170], [300, 186, 0]], WIDTH, HEIGHT, { pad: 26, azimuth: 66 });
const c = context(P);
const { S, L, slab, cyl, at, poly, line } = c;
const face = (x0, x1, z0, z1, y = FACE) => poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]);

// ---- static body ----
const body = [];
body.push(c.halo(BODY, 0, 4));
// wheels at the far end, feet at the near end
for (const [x, y] of [[26, -4], [26, W_ + 4]]) body.push(c.disc([x, y, 16], [0, 1, 0], y < 0 ? -10 : 0, y < 0 ? 0 : 10, 16, { tone: "lo" }));
body.push(slab({ x: L_ - 40, y: 12, w: 26, d: W_ - 24, r: 3 }, 0, Z0, { tone: "lo" }, 3, 0.4));
body.push(S(k.slabOf(BODY, Z0, ZT - Z0, P, 8, 1.4), { tone: "mid", inner: L(k.sideSeam(BODY, Z0 + 10, P, 8) + k.sideSeam(BODY, ZT - 22, P, 8), { tone: "faint" }) }));
// wheel hubs and treads on the near wheel
body.push(L(G.ribsOf(G.frameAlong([26, W_ + 4, 16], [0, 1, 0]), 0, 10, 16, 30, P), { tone: "lo" }));
body.push(c.disc([26, W_ + 14, 16], [0, 1, 0], 0, 1.5, 8, { tone: "mid" }));
// top deck: fuel cap, handles, outlet panel
const deck = { x: 8, y: 8, w: L_ - 16, d: W_ - 16, r: 10 };
body.push(slab(deck, ZT, 6, { tone: "lo" }, 8, 0.8));
body.push(cyl(150, W_ / 2, 20, ZT + 6, 4, { tone: "mid" }, 48), cyl(150, W_ / 2, 12, ZT + 10, 8, { tone: "mid" }, 40, 0.6));
body.push(L(k.knurl(150, W_ / 2, 12, ZT + 10, ZT + 18, 32, P), { tone: "lo" }));
for (const x of [10, L_ - 22]) body.push(slab({ x, y: 14, w: 12, d: W_ - 28, r: 4 }, ZT + 6, 18, { tone: "lo" }, 4, 0.6));
body.push(slab({ x: 40, y: 26, w: 60, d: 58, r: 4 }, ZT + 6, 2, { tone: "mid" }, 4, 0.4));
for (const [x, y] of [[54, 42], [80, 42], [54, 68], [80, 68]]) body.push(L(k.ring(x, y, 5, ZT + 8, P, 20), { tone: "hi" }), c.D([at([x - 1.6, y, ZT + 8]), at([x + 1.6, y, ZT + 8])], { size: 0.6 }));
// warning label on the side and exhaust grille at the far end
body.push(L(face(30, 92, 92, 128), { tone: "lo" }));
for (const [z, w] of [[120, 40], [114, 52], [108, 34], [100, 48]]) body.push(L(line([[36, FACE, z], [36 + w, FACE, z]]), { tone: "faint", free: true }));
for (let i = 0; i < 6; i++) body.push(L(poly([[L_, 20 + i * 12, 60], [L_, 26 + i * 12, 60], [L_, 26 + i * 12, 120], [L_, 20 + i * 12, 120]]), { tone: "lo" }));
// recess behind the access panel: crankcase, oil fill neck, battery
const recess = [];
recess.push(`<path class="cavity" d="${face(PANEL[0], PANEL[1], PANEL[2], PANEL[3])}"/>`);
recess.push(slab({ x: 112, y: 40, w: 70, d: 40, r: 6 }, 40, 34, { tone: "mid" }, 4, 0.6));
for (let i = 0; i < 5; i++) recess.push(L(k.lineOnTop([116 + i * 14, 42], [116 + i * 14, 78], 74, P), { tone: "lo" }));
recess.push(c.tube([[150, 74, 62], [150, 92, 72], NECK_TOP], 4.6, "mid"));
recess.push(c.disc(NECK_TOP, [0, 0.5, 0.86], 0, 1.6, 6, { tone: "mid" }));
recess.push(slab({ x: 176, y: 70, w: 24, d: 30, r: 2 }, 46, 30, { tone: "mid" }, 3, 0.5));
recess.push(cyl(181, 92, 2, 76, 3, { tone: "hi" }, 12), cyl(195, 92, 2, 76, 3, { tone: "hi" }, 12));
body.push(c.clip(face(PANEL[0], PANEL[1], PANEL[2], PANEL[3]), recess.join("")));
body.push(L(face(PANEL[0] - 2, PANEL[1] + 2, PANEL[2] - 2, PANEL[3] + 2), { tone: "lo" }));
// drain door opening and plug
body.push(`<path class="cavity" d="${face(DOOR[0], DOOR[1], DOOR[2], DOOR[3])}"/>`, L(face(DOOR[0] - 1.5, DOOR[1] + 1.5, DOOR[2] - 1.5, DOOR[3] + 1.5), { tone: "lo" }));
const plug = c.disc([PLUG[0], FACE - 6, PLUG[2]], [0, 1, 0], 0, 4, 4.4, { tone: "hi" }) + L(G.ribsOf(G.frameAlong([PLUG[0], FACE - 6, PLUG[2]], [0, 1, 0]), 0, 4, 4.4, 6, P), { tone: "lo" });

// ---- moving parts, built at rest ----
const panel = [];
panel.push(c.prism([PANEL[0], FACE, PANEL[2]], [0, 1, 0], [1, 0, 0], [0, 0, 1], [[0, 0], [PANEL[1] - PANEL[0], 0], [PANEL[1] - PANEL[0], PANEL[3] - PANEL[2]], [0, PANEL[3] - PANEL[2]]], 0, 3, { tone: "mid" }));
for (const x of [PANEL[0] + 18, PANEL[1] - 18]) {
  panel.push(c.disc([x, FACE + 3, PANEL[3] - 12], [0, 1, 0], 0, 3, 6, { tone: "lo" }));
  panel.push(c.prism([x, FACE + 6, PANEL[3] - 12], [0, 1, 0], [1, 0, 0], [0, 0, 1], [[-1.6, -5], [1.6, -5], [1.6, 5], [-1.6, 5]], 0, 4, { tone: "hi", lit: true }));
}
panel.push(L(face(PANEL[0] + 10, PANEL[1] - 10, PANEL[2] + 10, PANEL[2] + 30, FACE + 3), { tone: "lo" }));
for (const [z, w] of [[36, 60], [42, 72], [48, 50], [54, 66]]) panel.push(L(line([[PANEL[0] + 14, FACE + 3, PANEL[2] + z - 30], [PANEL[0] + 14 + w, FACE + 3, PANEL[2] + z - 30]]), { tone: "faint", free: true }));
const door = c.prism([DOOR[0], FACE, DOOR[2]], [0, 1, 0], [1, 0, 0], [0, 0, 1], [[0, 0], [DOOR[1] - DOOR[0], 0], [DOOR[1] - DOOR[0], DOOR[3] - DOOR[2]], [0, DOOR[3] - DOOR[2]]], 0, 2.4, { tone: "mid" }) + c.D([at([DOOR[0] + 4, FACE + 2.4, DOOR[3] - 4]), at([DOOR[1] - 4, FACE + 2.4, DOOR[3] - 4])], { size: 0.6 });
const dipstick = c.turned(NECK_TOP, [0, 0.5, 0.86], [[0, 6.4], [8, 6.4], [9, 5]], { tone: "hi", lit: true }) + c.turned(NECK_TOP, [0, -0.5, -0.86], [[0, 1.4], [24, 1.4]], { tone: "hi" });
// floor tools: drain pan, oil bottle
const pan = { x: 46, y: 132, w: 90, d: 56, r: 6 };
const panSvg = c.halo(pan, 0, 2) + slab(pan, 0, 9, { tone: "lo" }, 6, 0.6) + `<path class="cavity" d="${k.slabOf(k.insetPlan(pan, 3), 9, 0.01, P, 6).fill}"/>` + `<path data-part="oilpool" class="oil" opacity="0" d="${k.slabOf(k.insetPlan(pan, 8), 9, 0.01, P, 6).fill}"/>`;
const stream = (pts) => `<path class="oil-stream" d="${line(pts)}"/>`;
const drainStream = stream([[PLUG[0], FACE + 2, PLUG[2]], [PLUG[0] + 2, FACE + 14, PLUG[2] - 4], [PLUG[0] + 4, FACE + 24, 18], [PLUG[0] + 5, FACE + 30, 9]]);
const bottleAt = [150, 150, 128];
const bottle = c.turned(bottleAt, [0, -0.62, -0.78], [[-46, 14], [-44, 15, 1], [-6, 15, 1], [0, 10, 1], [6, 4], [14, 4]], { tone: "mid" }) + c.disc(bottleAt, [0, -0.62, -0.78], 14, 16, 4.6, { tone: "hi" });
const pour = stream([[150, 150 - 0.62 * 16, 128 - 0.78 * 16], [150, 128, 104], [150, NECK_TOP[1] + 3, NECK_TOP[2] + 4]]);

// steps: what each moving thing does. offsets are world vectors.
const STEPS = [
  { text: "Off, level, cooled", panel: 0, door: 0, dip: 0, plug: 0, drain: 0, fill: 0, tilt: 0, oil: 0.64 },
  { text: "1 · Unlock knobs, lift off panel", panel: 1, door: 0, dip: 0, plug: 0, drain: 0, fill: 0, tilt: 0, oil: 0.64 },
  { text: "2 · Open drain door, pull dipstick", panel: 1, door: 1, dip: 1, plug: 0, drain: 0, fill: 0, tilt: 0, oil: 0.64 },
  { text: "3 · Plug out, tilt, drain", panel: 1, door: 1, dip: 1, plug: 1, drain: 1, fill: 0, tilt: 1, oil: 0 },
  { text: "4 · Plug back, level again", panel: 1, door: 0, dip: 1, plug: 0, drain: 0, fill: 0, tilt: 0, oil: 0 },
  { text: "5 · Fill 10W-30 to hole edge", panel: 1, door: 0, dip: 1, plug: 0, drain: 0, fill: 1, tilt: 0, oil: 0.64 },
  { text: "6 · Dipstick in, panel on, lock", panel: 0, door: 0, dip: 0, plug: 0, drain: 0, fill: 0, tilt: 0, oil: 0.64 },
];
const MOVES = { panel: [92, 70, -44], door: [0, 18, -14], dip: [0, 24, 30], plug: [0, 22, -6] };

const pivot = at([L_, W_, 0]);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A Predator 5000 inverter generator with its side access panel and oil drain door. The steps show the panel lifted off, the dipstick pulled, the drain plug out with oil running into a pan while the generator tilts, then the plug back and fresh 10W-30 poured into the dipstick hole.",
  body: [
    `<style>.oil{fill:#8b6a22;fill-opacity:.7}.oil-stream{fill:none;stroke:#8b6a22;stroke-width:2.6px;stroke-linecap:round;stroke-dasharray:4 3;animation:oilflow .6s linear infinite}@keyframes oilflow{to{stroke-dashoffset:-7}}.iso-svg .cavity{fill:var(--anatomy-shade-0)}@media (prefers-reduced-motion:reduce){.oil-stream{animation:none}}</style>`,
    `<g data-part="pan">${panSvg}</g>`,
    `<g data-part="tilt" style="transform-origin:${pivot[0]}px ${pivot[1]}px">${body.join("")}`,
    `<g data-part="door">${door}</g>`,
    `<g data-part="plug">${plug}</g>`,
    `<g data-part="drain" opacity="0">${drainStream}</g>`,
    `<g data-part="dip">${dipstick}</g>`,
    `<g data-part="panel">${panel.join("")}</g></g>`,
    `<g data-part="fill" opacity="0">${pour}${bottle}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const STEPS = ${JSON.stringify(STEPS)};
const MOVES = ${JSON.stringify(MOVES)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (n) => svg.querySelector('[data-part="' + n + '"]');
const parts = { panel: part("panel"), door: part("door"), dip: part("dip"), plug: part("plug") };
const tilt = part("tilt"), drain = part("drain"), fill = part("fill"), pool = part("oilpool");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const keys = ["panel", "door", "dip", "plug", "drain", "fill", "tilt", "oil"];
let step = 0, cur = { ...STEPS[0] }, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0, drained = 0;
const HOLD = [2.2, 2.2, 2.4, 3.6, 2.2, 3.6, 2.6];
function draw() {
  for (const n in parts) { const m = MOVES[n]; parts[n].setAttribute("transform", translateAlong(P, m.map((v) => v * cur[n]))); }
  tilt.style.transform = "rotate(" + (-4 * cur.tilt).toFixed(2) + "deg)";
  drain.setAttribute("opacity", cur.drain.toFixed(3));
  fill.setAttribute("opacity", cur.fill.toFixed(3));
  pool.setAttribute("opacity", Math.min(1, drained).toFixed(3));
  const text = STEPS[step].text + " · in engine " + cur.oil.toFixed(2) + " qt";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; if (clock > HOLD[step]) { clock = 0; step = (step + 1) % STEPS.length; if (step === 0) drained = 0; } }
  const want = STEPS[step];
  let moving = false;
  for (const key of keys) {
    const rate = key === "oil" ? 1.1 : 0.32;
    const next = still.matches ? want[key] : cur[key] + (want[key] - cur[key]) * (1 - Math.exp(-dt / rate));
    cur[key] = Math.abs(want[key] - next) < 0.002 ? want[key] : next;
    if (cur[key] !== want[key]) moving = true;
  }
  if (step >= 3) drained = Math.max(drained, 1 - cur.oil / 0.64);
  draw();
  frame = visible && (touring || moving) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (n) => {
  touring = false; step = (n + STEPS.length) % STEPS.length; if (step < 3) drained = 0;
  clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 6000); run();
};
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => steer(step + 1));
stage.addEventListener("pointermove", (ev) => { const b = svg.getBoundingClientRect(); steer(Math.min(STEPS.length - 1, Math.max(0, Math.floor(((ev.clientX - b.left) / b.width) * STEPS.length)))); });
stage.addEventListener("keydown", (ev) => {
  const to = { ArrowRight: step + 1, ArrowUp: step + 1, Enter: step + 1, " ": step + 1, ArrowLeft: step - 1, ArrowDown: step - 1, Home: 0, End: STEPS.length - 1 }[ev.key];
  if (to === undefined) return; ev.preventDefault(); steer(Math.max(0, Math.min(STEPS.length - 1, to)));
});
if (still.matches) { step = 5; cur = { ...STEPS[5] }; }
draw();
`;

const body2 = k.plateHtml({
  fig: "Fig 1",
  title: "Predator 5000 · oil change",
  hint: "Hover, click or ← → to step",
  readout: STEPS[0].text,
  keys: [
    { mark: "lit", label: "Knobs and dipstick: the parts you turn and pull" },
    { mark: "raised", label: "Access panel and oil drain door, both on the same side" },
    { mark: "dashed", label: "Oil: SAE 10W-30, 0.64 qt (0.6 L)" },
  ],
  caption:
    "Changing the oil on the Predator 5000 (item 70143): with the engine off and the generator on level ground, unlock the two knobs and lift off the access panel, open the oil drain door and pull the dipstick. Remove the drain plug, tilt the generator slightly and let the oil drain completely into a pan. Refit the plug, set the generator level again, and pour SAE 10W-30 into the dipstick hole until it reaches the edge of the hole (about 0.64 qt). Refit the dipstick, the door and the panel, and lock the knobs. Recycle the old oil.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Oil change: arrow keys step through" aria-valuemin="0" aria-valuemax="6" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "predator-oil-light.html" : "predator-oil.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Predator 5000 oil change", theme, body: body2, script: kitScript() + live, width: 680 }));
console.log("wrote", name);
