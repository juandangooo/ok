// Electron shell that lays an invisible curtains.js layer over the user's own
// wallpaper: each display gets a desktop-level window showing that display's
// wallpaper image, which only ripples where the cursor moves.
const { app, BrowserWindow, screen, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execFileP = promisify(execFile);

let windows = [];
let tray = null;
let paused = false;
let cursorTimer = null;
let images = [];

const configPath = () => path.join(app.getPath('userData'), 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; }
}

function writeConfig(config) {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

// Ask macOS for the picture on every desktop, one path per line.
async function systemWallpaperPaths() {
  const script = `
    set out to ""
    tell application "System Events"
      repeat with d in desktops
        set out to out & (picture of d) & linefeed
      end repeat
    end tell
    return out`;
  try {
    const { stdout } = await execFileP('osascript', ['-e', script]);
    return stdout.split('\n').map((s) => s.trim()).filter((p) => p && fs.existsSync(p));
  } catch {
    return [];
  }
}

// Convert any wallpaper format macOS knows (HEIC, PNG, JPEG...) to a JPEG sized
// for the display, and hand it to the renderer as a data URL so WebGL can use it.
async function loadImage(src, display, index) {
  const { width, height } = display.size;
  const maxDim = Math.round(Math.max(width, height) * display.scaleFactor);
  const out = path.join(app.getPath('userData'), `wallpaper-${index}.jpg`);
  try {
    await execFileP('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', '-Z', String(maxDim), src, '--out', out]);
    return `data:image/jpeg;base64,${fs.readFileSync(out).toString('base64')}`;
  } catch {
    return null;
  }
}

async function resolveImages(displays) {
  const custom = readConfig().customImage;
  const paths = custom && fs.existsSync(custom) ? [custom] : await systemWallpaperPaths();
  if (!paths.length) return [];
  return Promise.all(displays.map((d, i) => loadImage(paths[i] ?? paths[0], d, i)));
}

async function chooseImage() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose your wallpaper image',
    defaultPath: '/System/Library/Desktop Pictures',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'heic', 'tiff', 'webp'] }],
  });
  if (canceled) return false;
  writeConfig({ ...readConfig(), customImage: filePaths[0] });
  return true;
}

async function createWindows() {
  windows.forEach((w) => !w.isDestroyed() && w.destroy());
  windows = [];

  const displays = screen.getAllDisplays();
  images = await resolveImages(displays);

  if (!images.some(Boolean)) {
    const { response } = await dialog.showMessageBox({
      type: 'question',
      message: "Couldn't read your current wallpaper.",
      detail: 'Pick the same image you use as your desktop picture and the ripple will play on top of it.',
      buttons: ['Choose Image…', 'Quit'],
    });
    if (response === 0 && await chooseImage()) return createWindows();
    return app.quit();
  }

  windows = displays.map((display, index) => {
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
      backgroundColor: '#000000',
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
    win.displayBounds = display.bounds;
    win.imageIndex = images[index] ? index : images.findIndex(Boolean);
    return win;
  });
}

ipcMain.handle('get-image', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  return win ? images[win.imageIndex] : null;
});

// Only show the window once the wallpaper has been drawn, so there's never a flash.
ipcMain.on('rendered', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && !win.isVisible()) win.showInactive();
});

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
  const custom = readConfig().customImage;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: paused ? 'Resume' : 'Pause', click: () => setPaused(!paused) },
    { type: 'separator' },
    {
      label: 'Use Current Wallpaper',
      type: 'radio',
      checked: !custom,
      click: () => { writeConfig({ ...readConfig(), customImage: null }); buildTrayMenu(); createWindows(); },
    },
    {
      label: 'Choose Image…',
      type: 'radio',
      checked: Boolean(custom),
      click: async () => { if (await chooseImage()) createWindows(); buildTrayMenu(); },
    },
    { type: 'separator' },
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

app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock.hide();

  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('◐');
  tray.setToolTip('Curtains Wallpaper');
  buildTrayMenu();

  await createWindows();
  startCursorFeed();

  for (const evt of ['display-added', 'display-removed', 'display-metrics-changed']) {
    screen.on(evt, createWindows);
  }
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('before-quit', () => clearInterval(cursorTimer));
