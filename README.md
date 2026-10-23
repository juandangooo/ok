# Curtains Wallpaper

A [curtains.js](https://www.curtainsjs.com/) ripple that plays on top of the
wallpaper you already have on your Mac.

It's a tiny Electron app that reads your current desktop picture and draws it
in one window per display at the **desktop layer**, behind your icons and every
app. Clicks pass straight through it. When the mouse is still, your desktop
looks exactly the same as before. When you move the mouse, the wallpaper
ripples under the cursor like water and then settles again.

macOS never sends pointer events to the desktop, so the app reads the global
cursor position about 60 times a second. It feeds each position into the same
`mouseToPlaneCoords` code a `pointermove` handler would use.

## Run it

```bash
npm install
npm start
```

A `◐` appears in the menu bar with **Pause/Resume**, **Use Current Wallpaper**,
**Choose Image…**, **Open at Login** and **Quit**.

The first time it runs, macOS asks whether the app may control **System
Events**. Click **OK**: that's how it finds your current wallpaper. If it can't
read the wallpaper (for example with a moving or dynamic one), it asks you to
pick the image yourself.

## Build a standalone .app

```bash
npm run dist          # → release/mac*/Curtains Wallpaper.app
```

Drag the app into `/Applications`, open it, then turn on **Open at Login** from
the `◐` menu.

## Customize

- `src/shaders.js`: ripple size (`55.0`), spread (`8.0`) and strength (`0.012`)
- `src/renderer.js`: how much mouse movement it takes to start a ripple (`/ 120`) and how fast it fades (`0.97`)
