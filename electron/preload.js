const { contextBridge } = require("electron");

// Ponte segura renderer <-> main (expandir conforme precisar: tray, hotkeys, etc.)
contextBridge.exposeInMainWorld("wellcord", {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
