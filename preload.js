const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wallpaper', {
  onCursor: (cb) => ipcRenderer.on('cursor', (_e, p) => cb(p)),
  onPaused: (cb) => ipcRenderer.on('paused', (_e, v) => cb(v)),
});
