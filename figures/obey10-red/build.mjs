import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../.claude/skills/anatomy/kit/lathe.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 300;

// Obey 10 top panel, lying flat on the bench. Front edge is +y, faders push toward -y.
const PANEL = { x: -110, y: -23, w: 220, d: 46, r: 2 };
const PANEL_H = 8;
const FOOT_H = 2.4;
const TOP = PANEL_H;

const FADER_X = Array.from({ length: 8 }, (_, i) => -50 + i * 10);
const TRAVEL = [12, -12]; // y at 0 and at full
const BTN = { w: 6, d: 4.4, h: 1.2 };

// LED par: a 3-channel RGB fixture at DMX address 1, standing face up.
const PAR = [150, 6];
const CAN_R = 15;
const CAN_Z = 8;
const CAN_TOP = 30;
const LENS_Z = CAN_TOP + 2.4;

const P = k.fitProjection(
  [...k.boxCorners(PANEL, -FOOT_H, TOP + 4), [PAR[0] + 22, PAR[1] + 22, 0], [PAR[0] - 22, PAR[1] - 22, LENS_Z + 4], [PAR[0] + 20, PAR[1] - 20, LENS_Z]],
  WIDTH,
  HEIGHT,
  { pad: 34, azimuth: 58 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const button = (x, y, { tone = "mid", lit = false, part } = {}) => {
  const plan = { x: x - BTN.w / 2, y: y - BTN.d / 2, w: BTN.w, d: BTN.d, r: 0.8 };
  const well = L(k.planOutline(k.insetPlan(plan, -0.7), TOP, P, 3), { tone: "faint" });
  const cap = S(k.slabOf(plan, TOP, BTN.h, P, 3, 0.3), { tone, lit, crease: "lo" });
  return well + (part ? `<g data-part="${part}">${cap}</g>` : cap);
};
const led = (x, y, part) =>
  `<circle cx="${at([x, y, TOP])[0].toFixed(1)}" cy="${at([x, y, TOP])[1].toFixed(1)}" r="0.9" class="led-off"/>` +
  (part ? `<circle data-part="${part}" cx="${at([x, y, TOP])[0].toFixed(1)}" cy="${at([x, y, TOP])[1].toFixed(1)}" r="1.05" class="led-on" opacity="0"/>` : "");


function par() {
  const [x, y] = PAR;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 20, y: y - 20, w: 40, d: 40, r: 20 }, -FOOT_H, 2, P)}"/>`];
  // base and yoke foot
  out.push(S(k.cylinder(x, y, 20, -FOOT_H, 2.4, P, 64, 0.6), { tone: "lo" }));
  out.push(L(k.ring(x, y, 17, 0, P, 64), { tone: "faint" }));
  const screws = [0, 1, 2, 3].map((i) => [x + Math.cos(i * Math.PI / 2 + 0.6) * 18.4, y + Math.sin(i * Math.PI / 2 + 0.6) * 18.4]);
  out.push(D(screws.map(([sx, sy]) => at([sx, sy, 0])), { size: 0.45 }));
  // yoke: bottom bar and the far arm, drawn before the can
  out.push(S(k.slabOf({ x: x - 4, y: y - CAN_R - 4, w: 8, d: 2 * CAN_R + 8, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
  const arm = (yy) => k.slabOf({ x: x - 4, y: yy, w: 8, d: 2.6, r: 0.8 }, 3, 20, P, 3, 0.4);
  out.push(S(arm(y - CAN_R - 4), { tone: "mid" }));
  // can body with cooling fins
  out.push(S(k.cylinder(x, y, CAN_R, CAN_Z, CAN_TOP - CAN_Z, P, 64), { tone: "mid", crease: "lo" }));
  out.push(L(k.knurl(x, y, CAN_R, CAN_Z + 3, CAN_TOP - 4, 44, P, 0.4), { tone: "faint" }));
  out.push(L(k.sideArc(x, y, CAN_R, CAN_Z + 3, P, 48) + k.sideArc(x, y, CAN_R, CAN_TOP - 4, P, 48), { tone: "lo" }));
  // bezel
  out.push(S(k.cylinder(x, y, CAN_R + 1.4, CAN_TOP, 2.4, P, 64, 0.5), { tone: "hi", crease: "lo" }));
  // lens: dark glass, then the red light on top of it
  const lens = k.ring(x, y, CAN_R - 1.6, LENS_Z, P, 64);
  out.push(`<path class="par-glass" d="${lens}"/>`);
  out.push(`<path data-part="glow" class="par-glow" d="${lens}" opacity="0"/>`);
  out.push(L(lens, { tone: "lo" }));
  // 19 LEDs in a hex pattern
  const leds = [[0, 0]];
  for (let i = 0; i < 6; i++) leds.push([Math.cos(i * Math.PI / 3) * 4.8, Math.sin(i * Math.PI / 3) * 4.8]);
  for (let i = 0; i < 12; i++) leds.push([Math.cos(i * Math.PI / 6) * 9.4, Math.sin(i * Math.PI / 6) * 9.4]);
  out.push(L(leds.map(([dx, dy]) => k.ring(x + dx, y + dy, 1.7, LENS_Z, P, 16)).join(""), { tone: "faint" }));
  out.push(`<g data-part="leds" class="par-leds" opacity="0">${leds.map(([dx, dy]) => { const [sx, sy] = at([x + dx, y + dy, LENS_Z]); return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.5"/>`; }).join("")}</g>`);
  // near arm, knobs and DMX input
  out.push(S(arm(y + CAN_R + 1.4), { tone: "mid" }));
  out.push(D([at([x, y + CAN_R + 4, 20])], { size: 0.5 }));
  const knobF = G.frameAlong([x, y + CAN_R + 4, 17], [0, 1, 0]);
  out.push(S(G.disc(0, 3, 4, knobF, P), { tone: "mid" }));
  out.push(L(G.ribsOf(knobF, 0.2, 2.8, 4, 24, P), { tone: "lo" }));
  const port = { x: x + 14, y: y - 4, w: 6, d: 8, r: 1 };
  out.push(S(k.slabOf(port, 0, 5, P, 3, 0.3), { tone: "lo" }));
  return out.join("");
}

function cable() {
  // DMX out on the controller's rear right, round the end of the controller, into the par's base port.
  const plug = S(k.slabOf({ x: 80, y: PANEL.y - 9, w: 8, d: 9, r: 1.6 }, 1, 6, P, 4, 0.4), { tone: "mid" });
  // a slack cable: one smooth curve on the bench from the plug to the par's base port
  const knots = [[84, PANEL.y - 9], [92, PANEL.y - 22], [130, PANEL.y - 30], [168, PANEL.y - 22], [176, PAR[1] - 8], [PAR[0] + 20, PAR[1]]];
  const curve = [];
  for (let i = 0; i < knots.length - 1; i++) {
    const p0 = knots[Math.max(0, i - 1)], p1 = knots[i], p2 = knots[i + 1], p3 = knots[Math.min(knots.length - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.125) {
      const t2 = t * t, t3 = t2 * t;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      curve.push(at([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), 0.8]));
    }
  }
  const from = at([84, PANEL.y - 9, 3.5]);
  const to = at([PAR[0] + 20, PAR[1], 2.5]);
  const via = curve.slice(1);
  return `<g class="dmx-cable">${k.wireSvg(from, to, { via, tone: "mid", size: 1 })}</g>` + plug;
}

function controller() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PANEL, -FOOT_H, PANEL_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PANEL, 6))) out.push(S(k.cylinder(x, y, 3, -FOOT_H, FOOT_H, P, 20), { tone: "lo" }));
  out.push(S(k.slabOf(PANEL, 0, PANEL_H, P, 4, 1.2), { tone: "mid", inner: L(k.sideSeam(PANEL, 2.4, P, 4), { tone: "faint" }) }));
  // rack slots and corner screws
  for (const sx of [-105, 105]) for (const sy of [-15, 11]) out.push(L(k.planOutline({ x: sx - 1.6, y: sy, w: 3.2, d: 5, r: 1.6 }, TOP, P, 4), { tone: "lo" }));
  const screws = [[-100, -19], [100, -19], [-100, 19], [100, 19]];
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, TOP, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, TOP])), { size: 0.45 }));

  // fixture block: 8 buttons with indicator LEDs, page select with page A/B LEDs
  out.push(L(k.planOutline({ x: -98, y: -19, w: 30, d: 38, r: 1.5 }, TOP, P, 3), { tone: "faint" }));
  const fixtures = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) fixtures.push({ n: row * 2 + col + 1, x: -93 + col * 13, y: -13 + row * 9 });
  for (const f of fixtures) {
    out.push(button(f.x, f.y, { part: f.n === 1 ? "fixture1" : undefined }));
    out.push(led(f.x + 5.2, f.y - 1.6, f.n === 1 ? "fixture1-led" : undefined));
  }
  out.push(button(-62, 8));
  out.push(led(-62, -4), led(-62, 0));

  // channel label strip with a tick per fader
  const strip = { x: -55, y: -21.5, w: 80, d: 3.4, r: 0.6 };
  out.push(S(k.slabOf(strip, TOP, 0.5, P, 3), { tone: "mid", crease: "none" }));
  const ticks = k.topTicks(FADER_X[0], FADER_X[7], 10, 1, strip.y + strip.d, TOP + 0.5, [1.2, 1.6], P);
  out.push(L(ticks.major, { tone: "lo" }));

  // fader slots and level scales
  for (const fx of [...FADER_X, 34, 44]) {
    out.push(L(k.planOutline({ x: fx - 0.9, y: -14, w: 1.8, d: 27.6, r: 0.9 }, TOP, P, 4), { tone: "lo" }));
    out.push(D(Array.from({ length: 7 }, (_, i) => at([fx + 3.6, -12 + i * 4, TOP])), { size: 0.4, tone: "lo" }));
  }
  out.push(L(k.planOutline({ x: 29, y: -19, w: 20, d: 38, r: 1.5 }, TOP, P, 3), { tone: "faint" }));

  // display window
  const win = { x: 55, y: -19, w: 26, d: 9, r: 1 };
  out.push(S(k.slabOf(win, TOP, 0.4, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(win, 1.2), TOP + 0.4, P, 3), { tone: "faint" }));
  out.push(`<g data-part="display">${k.faceTextSvg(k.topMatrix([win.x + win.w / 2, win.y + 6.4], TOP + 0.4, P, "x"), "000", { size: 5, tone: "hi", anchor: "middle" })}</g>`);

  // function buttons, six chase buttons, and the right-hand column (step up, step down, program, blackout)
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) out.push(button(58 + col * 10, -3 + row * 8));
  out.push(L(k.planOutline({ x: 53, y: 3, w: 30, d: 17, r: 1.5 }, TOP, P, 3), { tone: "faint" }));
  for (let row = 0; row < 4; row++) out.push(button(93, -15 + row * 9, { part: row === 3 ? "blackout" : undefined }));
  out.push(led(98, 12.6, "blackout-led"), led(98, -16.6));
  return out.join("");
}

function faderCap(fx, { lit = false, tone = "mid" } = {}) {
  const plan = { x: fx - 2.4, y: -1.8, w: 4.8, d: 3.6, r: 0.6 };
  return S(k.slabOf(plan, TOP, 4, P, 3, 0.4), { tone, lit, crease: "lo" }) + L(k.lineOnTop([fx - 2.4, 0], [fx + 2.4, 0], TOP + 4, P), { tone: lit ? "lo" : "faint" });
}

function faders() {
  // fixed caps first, back to front by depth; fader 1 (red) is the lit accent
  const caps = [];
  FADER_X.forEach((fx, i) => caps.push({ x: fx, y: TRAVEL[0], svg: `<g data-part="fader${i + 1}" transform="${k.translateAlong(P, [0, TRAVEL[0], 0])}">${faderCap(fx, { lit: i === 0, tone: i === 0 ? "hi" : "mid" })}</g>` }));
  caps.push({ x: 34, y: -2, svg: `<g transform="${k.translateAlong(P, [0, -2, 0])}">${faderCap(34)}</g>` });
  caps.push({ x: 44, y: 4, svg: `<g transform="${k.translateAlong(P, [0, 4, 0])}">${faderCap(44)}</g>` });
  return caps.sort((a, b) => k.depthOf([a.x, a.y, 0], P) - k.depthOf([b.x, b.y, 0], P)).map((c) => c.svg).join("");
}

const EXTRA_CSS = `
.dmx-cable .iso-line{stroke-width:1.6}
.par-glass{fill:var(--anatomy-shade-0, #222)}
.par-glow{fill:var(--anatomy-red)}
.par-leds circle{fill:var(--anatomy-red)}
.led-off{fill:var(--anatomy-faint, #555)}
.led-on{fill:var(--anatomy-red)}
.iso-plate [data-part="glow"]{filter:drop-shadow(0 0 6px var(--anatomy-red))}
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A Chauvet Obey 10 DMX controller lying on a bench, cabled to an LED par can standing face up. To make the par red: release Blackout, press Fixture button 1, then push channel fader 1, the red channel of a 3-channel RGB fixture at DMX address 1, to the top. The par's LEDs glow red as the fader rises.",
  body: [`<style>${EXTRA_CSS}</style>`, cable(), par(), controller(), faders()],
});

const STEPS = [
  { text: "Blackout on · everything at 0", blackout: true, fixture: false, red: 0 },
  { text: "1 · Blackout off", blackout: false, fixture: false, red: 0 },
  { text: "2 · Fixture 1 selected", blackout: false, fixture: true, red: 0 },
  { text: "3 · Fader 1 up", blackout: false, fixture: true, red: 255 },
];

const live = `
const P = ${JSON.stringify(P)};
const STEPS = ${JSON.stringify(STEPS)};
const TRAVEL = ${JSON.stringify(TRAVEL)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const q = (name) => svg.querySelector('[data-part="' + name + '"]');
const fader = q("fader1"), glow = q("glow"), leds = q("leds"), display = svg.querySelector('[data-part="display"] text');
const fixLed = q("fixture1-led"), fixBtn = q("fixture1"), boLed = q("blackout-led"), boBtn = q("blackout");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let step = 0, level = 0, out = 0, press = { fixture1: 0, blackout: 0 };
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0;
const HOLD = [1.6, 1.4, 1.4, 3.2];
function setStep(next) {
  if (next === step) return;
  if (STEPS[next].blackout !== STEPS[step].blackout) press.blackout = 1;
  if (STEPS[next].fixture !== STEPS[step].fixture) press.fixture1 = 1;
  step = next;
}
function draw() {
  const s = STEPS[step];
  fader.setAttribute("transform", translateAlong(P, [0, TRAVEL[0] + (TRAVEL[1] - TRAVEL[0]) * level / 255, 0]));
  const shown = Math.round(level);
  display.textContent = String(shown).padStart(3, "0");
  out = s.blackout ? 0 : (s.fixture ? level : 0);
  const a = out / 255;
  glow.setAttribute("opacity", (a * 0.85).toFixed(3));
  leds.setAttribute("opacity", a.toFixed(3));
  fixLed.setAttribute("opacity", s.fixture ? "1" : "0");
  boLed.setAttribute("opacity", s.blackout ? "1" : "0");
  fixBtn.setAttribute("transform", translateAlong(P, [0, 0, -0.8 * press.fixture1]));
  boBtn.setAttribute("transform", translateAlong(P, [0, 0, -0.8 * press.blackout]));
  const text = s.text + " · DMX 1 R " + Math.round(out) + " · 2 G 0 · 3 B 0";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    clock += dt;
    if (clock > HOLD[step]) { clock = 0; setStep((step + 1) % STEPS.length); }
  }
  const want = STEPS[step].red;
  level = calm ? want : level + (want - level) * (1 - Math.exp(-dt / 0.35));
  if (Math.abs(want - level) < 0.3) level = want;
  for (const key in press) press[key] = calm ? 0 : Math.max(0, press[key] - dt * 4);
  draw();
  const settled = !touring && level === want && press.fixture1 === 0 && press.blackout === 0;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false; setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 5000); run();
};
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.min(0.999, Math.max(0, ((event.clientX - box.left) / box.width - 0.15) / 0.7));
  steer(Math.floor(share * STEPS.length));
});
stage.addEventListener("click", () => steer((step + 1) % STEPS.length));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") to = step + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = step - 1;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = STEPS.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
if (still.matches) { step = 3; level = 255; }
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Obey 10 · make it red",
  hint: "Hover, click or ← → to step",
  readout: STEPS[0].text,
  keys: [
    { mark: "lit", label: "Fader 1: channel 1, red on a 3-channel RGB par" },
    { mark: "raised", label: "Faders 2 and 3: green and blue, left at 0" },
    { mark: "red", label: "Red light from the par's 19 LEDs" },
  ],
  caption:
    "How to make a light red on the Obey 10: release BLACKOUT (its LED goes out), press FIXTURE 1 so its LED lights, then push fader 1 to the top (255 on the display). Faders 1–8 send channels 1–8 of the selected fixture, and fixture 1 starts at DMX address 1. This assumes a 3-channel RGB par at address 1 (channel 1 red, 2 green, 3 blue); if your light has a master dimmer channel, push that up too. Your light's manual lists its channels. To keep the look, hold PROGRAM for 3 s, pick a chase button, set the faders, tap MUSIC/ADD, and hold PROGRAM for 3 s to exit.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Obey 10: arrow keys step through making the light red" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0">${svg}</div>`,
});

const name = theme === "light" ? "obey10-red-light.html" : "obey10-red.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Obey 10: make it red", theme, body, script: kitScript() + live, width: 680 }));
console.log("wrote", name);
