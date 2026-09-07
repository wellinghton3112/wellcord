const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const PORT = Number(process.env.WELLCORD_PORT || 3100);
const START_URL = isDev ? "http://localhost:3000" : `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let nextApp = null;

// Voz em segundo plano + GPU: não estrangula timers/render quando minimizado
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

const singleLock = app.requestSingleInstanceLock();
if (!singleLock) app.quit();

async function startEmbeddedNext() {
  // Servidor Next embutido (produção): mantém rotas/API funcionando dentro do .exe
  const next = require("next");
  nextApp = next({ dev: false, dir: app.getAppPath(), quiet: true });
  await nextApp.prepare();
  const handler = nextApp.getRequestHandler();
  const http = require("http");
  await new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", resolve);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: "#313338",
    title: "WellCORD",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL(START_URL);
  // Links externos abrem no navegador
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(START_URL)) {
      shell.openExternal(url).catch(() => {});
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      await startEmbeddedNext();
    } catch (e) {
      console.error("[wellcord] falha ao subir servidor embutido:", e);
      app.quit();
      return;
    }
  }
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
