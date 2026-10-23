const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wallpaper', {
  getImage: () => ipcRenderer.invoke('get-image'),
  rendered: () => ipcRenderer.send('rendered'),
  onCursor: (cb) => ipcRenderer.on('cursor', (_e, p) => cb(p)),
  onPaused: (cb) => ipcRenderer.on('paused', (_e, v) => cb(v)),
});
