import { Curtains, Plane, Vec2 } from 'curtainsjs';
import { vertexShader, fragmentShader } from './shaders.js';

const palettes = [
  [[0.10, 0.07, 0.30], [0.95, 0.42, 0.55]],
  [[0.04, 0.18, 0.28], [0.35, 0.85, 0.80]],
  [[0.22, 0.05, 0.20], [0.98, 0.70, 0.35]],
  [[0.05, 0.08, 0.18], [0.55, 0.60, 0.98]],
];

const curtains = new Curtains({
  container: 'canvas',
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  watchScroll: false,
});

const cursor = { x: -1e4, y: -1e4 };
const planes = [];

document.querySelectorAll('.plane').forEach((el, index) => {
  const [colorA, colorB] = palettes[index % palettes.length];
  const state = {
    hover: 0,
    targetHover: 0,
    mouse: new Vec2(0, 0),
    targetMouse: new Vec2(0, 0),
    ready: false,
  };

  const plane = new Plane(curtains, el, {
    vertexShader, fragmentShader, widthSegments: 40, heightSegments: 40,
    uniforms: {
      hover: { name: 'uHover', type: '1f', value: 0 },
      mouse: { name: 'uMouse', type: '2f', value: new Vec2(0, 0) },
      time: { name: 'uTime', type: '1f', value: index * 7.3 },
      colorA: { name: 'uColorA', type: '3f', value: colorA },
      colorB: { name: 'uColorB', type: '3f', value: colorB },
    },
  });

  // Same mapping as a pointermove handler, but fed from the global cursor
  // (the wallpaper sits beneath every window, so it never gets DOM events).
  const pointermove = (e) => {
    const r = el.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right
      && e.clientY >= r.top && e.clientY <= r.bottom;
    state.targetHover = inside ? 1 : 0;
    if (inside && state.ready) {
      const p = plane.mouseToPlaneCoords(new Vec2(e.clientX, e.clientY));
      state.targetMouse.set(p.x, p.y);
    }
  };
  el.addEventListener('pointermove', pointermove);

  plane.onReady(() => { state.ready = true; });

  plane.onRender(() => {
    state.hover += (state.targetHover - state.hover) * 0.06;
    state.mouse.x += (state.targetMouse.x - state.mouse.x) * 0.12;
    state.mouse.y += (state.targetMouse.y - state.mouse.y) * 0.12;
    plane.uniforms.hover.value = state.hover;
    plane.uniforms.mouse.value = state.mouse;
    plane.uniforms.time.value += 1 / 60;
  });

  planes.push(pointermove);
});

window.wallpaper?.onCursor((p) => {
  cursor.x = p.x;
  cursor.y = p.y;
  planes.forEach((move) => move({ clientX: cursor.x, clientY: cursor.y }));
});

window.wallpaper?.onPaused((paused) => {
  if (paused) curtains.disableDrawing();
  else curtains.enableDrawing();
});

curtains.onError(() => document.body.classList.add('no-webgl'));
