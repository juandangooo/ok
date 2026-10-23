// Electron shell that pins the curtains.js scene to the macOS desktop layer
// (below desktop icons and every app window) on each connected display.
const { app, BrowserWindow, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let windows = [];
let tray = null;
let paused = false;
let cursorTimer = null;

function createWindows() {
  windows.forEach((w) => !w.isDestroyed() && w.destroy());
  windows = screen.getAllDisplays().map((display) => {
    const { x, y, width, height } = display.bounds;
    const win = new BrowserWindow({
      x, y, width, height,
      type: process.platform === 'darwin' ? 'desktop' : undefined,
      frame: false,
      show: false,
      hasShadow: false,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      enableLargerThanScreen: true,
      backgroundColor: '#07070a',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    });
    win.setIgnoreMouseEvents(true);
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
    win.loadFile(path.join(__dirname, 'src', 'index.html'));
    win.once('ready-to-show', () => win.showInactive());
    win.displayBounds = display.bounds;
    return win;
  });
}

// The wallpaper never receives real pointer events (it sits under everything),
// so the global cursor position is polled and forwarded to each display's window.
function startCursorFeed() {
  let last = { x: NaN, y: NaN };
  cursorTimer = setInterval(() => {
    if (paused) return;
    const p = screen.getCursorScreenPoint();
    if (p.x === last.x && p.y === last.y) return;
    last = p;
    for (const win of windows) {
      if (win.isDestroyed()) continue;
      const b = win.displayBounds;
      win.webContents.send('cursor', { x: p.x - b.x, y: p.y - b.y });
    }
  }, 16);
}

function setPaused(value) {
  paused = value;
  windows.forEach((w) => !w.isDestroyed() && w.webContents.send('paused', paused));
  buildTrayMenu();
}

function buildTrayMenu() {
  const openAtLogin = app.getLoginItemSettings().openAtLogin;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: paused ? 'Resume' : 'Pause', click: () => setPaused(!paused) },
    {
      label: 'Open at Login',
      type: 'checkbox',
      checked: openAtLogin,
      click: (item) => { app.setLoginItemSettings({ openAtLogin: item.checked }); buildTrayMenu(); },
    },
    { type: 'separator' },
    { label: 'Quit Curtains Wallpaper', click: () => app.quit() },
  ]));
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();

  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('◐');
  tray.setToolTip('Curtains Wallpaper');
  buildTrayMenu();

  createWindows();
  startCursorFeed();

  for (const evt of ['display-added', 'display-removed', 'display-metrics-changed']) {
    screen.on(evt, createWindows);
  }
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('before-quit', () => clearInterval(cursorTimer));
