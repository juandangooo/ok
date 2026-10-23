# Curtains Wallpaper

A live, mouse-reactive [curtains.js](https://www.curtainsjs.com/) wallpaper for macOS.

It's a tiny Electron app that opens one window per display at the **desktop
layer**. That means it sits behind your desktop icons and every app, and clicks
pass straight through it. macOS never sends pointer events to the desktop, so
the app reads the global cursor position about 60 times a second. It feeds each
position into the same `mouseToPlaneCoords` code a `pointermove` handler would
use, which makes the curtain planes ripple wherever your mouse is.

## Run it

```bash
npm install
npm start
```

A `◐` appears in the menu bar with **Pause/Resume**, **Open at Login** and **Quit**.

## Build a standalone .app

```bash
npm run dist          # → release/mac*/Curtains Wallpaper.app
```

Drag the app into `/Applications`, open it, then turn on **Open at Login** from
the `◐` menu.

## Customize

- `src/index.html`: the number and layout of `.plane` panels
- `src/renderer.js`: color palettes and how quickly the hover and mouse values ease in
- `src/shaders.js`: the vertex ripple/bulge and the fragment colors and glow
