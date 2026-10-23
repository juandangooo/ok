import { Curtains, Plane, Vec2 } from 'curtainsjs';
import { vertexShader, fragmentShader } from './shaders.js';

const state = {
  hover: 0,
  targetHover: 0,
  mouse: new Vec2(0, 0),
  targetMouse: new Vec2(0, 0),
  lastCursor: null,
  ready: false,
};

async function start() {
  const src = await window.wallpaper.getImage();
  if (!src) return;

  const el = document.querySelector('.plane');
  const img = new Image();
  img.src = src;
  img.dataset.sampler = 'uTexture';
  await img.decode();
  el.appendChild(img);

  const curtains = new Curtains({
    container: 'canvas',
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    watchScroll: false,
  });

  const plane = new Plane(curtains, el, {
    vertexShader, fragmentShader, widthSegments: 40, heightSegments: 40,
    uniforms: {
      hover: { name: 'uHover', type: '1f', value: 0 },
      mouse: { name: 'uMouse', type: '2f', value: new Vec2(0, 0) },
      time: { name: 'uTime', type: '1f', value: 0 },
      aspect: { name: 'uAspect', type: '1f', value: innerWidth / innerHeight },
    },
  });

  // Same mapping as a pointermove handler, but fed from the global cursor
  // (the wallpaper sits beneath every window, so it never gets DOM events).
  // Ripples swell while the mouse moves and fade out once it stops.
  const pointermove = (e) => {
    if (!state.ready) return;
    const p = plane.mouseToPlaneCoords(new Vec2(e.clientX, e.clientY));
    state.targetMouse.set(p.x, p.y);
    if (state.lastCursor) {
      const speed = Math.hypot(e.clientX - state.lastCursor.x, e.clientY - state.lastCursor.y);
      state.targetHover = Math.min(1, state.targetHover + speed / 120);
    }
    state.lastCursor = { x: e.clientX, y: e.clientY };
  };
  el.addEventListener('pointermove', pointermove);
  window.wallpaper.onCursor((p) => pointermove({ clientX: p.x, clientY: p.y }));

  plane.onReady(() => {
    state.ready = true;
    requestAnimationFrame(() => window.wallpaper.rendered());
  });

  plane.onRender(() => {
    state.targetHover *= 0.97;
    state.hover += (state.targetHover - state.hover) * 0.08;
    state.mouse.x += (state.targetMouse.x - state.mouse.x) * 0.15;
    state.mouse.y += (state.targetMouse.y - state.mouse.y) * 0.15;
    plane.uniforms.hover.value = state.hover;
    plane.uniforms.mouse.value = state.mouse;
    plane.uniforms.time.value += 1 / 60;
  });

  curtains.onAfterResize(() => {
    plane.uniforms.aspect.value = innerWidth / innerHeight;
  });

  window.wallpaper.onPaused((paused) => {
    if (paused) curtains.disableDrawing();
    else curtains.enableDrawing();
  });
}

start();
