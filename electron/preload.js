const { contextBridge, ipcRenderer } = require("electron");

// Ponte segura renderer <-> main (tray, PTT, controles de voz).
contextBridge.exposeInMainWorld("wellcord", {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  tray: {
    update: (state) => ipcRenderer.send("tray-update", state),
  },
  ptt: {
    // accelerator estilo Electron ("CommandOrControl+Shift+M", "F9"...). Vazio = desliga.
    set: (accelerator) => ipcRenderer.invoke("ptt-set", accelerator || null),
    onPress: (cb) => {
      const h = () => cb();
      ipcRenderer.on("ptt", h);
      return () => ipcRenderer.removeListener("ptt", h);
    },
  },
  voice: {
    // main -> renderer (menu do tray)
    onControl: (cb) => {
      const h = (_e, action) => cb(action);
      ipcRenderer.on("voice-control", h);
      return () => ipcRenderer.removeListener("voice-control", h);
    },
  },
  screens: {
    // Seletor próprio (só no .exe; no navegador é null)
    list: () => ipcRenderer.invoke("screens-list"),
    pick: (id) => ipcRenderer.invoke("screens-pick", id),
  },
});
