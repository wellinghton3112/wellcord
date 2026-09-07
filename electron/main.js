const { app, BrowserWindow, shell, Tray, Menu, nativeImage, ipcMain, globalShortcut, session, desktopCapturer } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;
const PORT = Number(process.env.WELLCORD_PORT || 3100);
const START_URL = isDev ? "http://localhost:3000" : `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let nextApp = null;
let tray = null;
let trayState = { unread: 0, inVoice: false, muted: false };
let pttAccelerator = null;

// Voz em segundo plano + GPU: não estrangula timers/render quando minimizado
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

const singleLock = app.requestSingleInstanceLock();
if (!singleLock) app.quit();

function assetPath(name) {
  return isDev
    ? path.join(__dirname, "..", "assets", name)
    : path.join(process.resourcesPath, "assets", name);
}

function refreshTray() {
  if (!tray) return;
  const { unread, inVoice, muted } = trayState;
  tray.setToolTip(
    `WellCORD${unread > 0 ? ` • ${unread} não lida(s)` : ""}${inVoice ? ` • em voz${muted ? " (mutado)" : ""}` : ""}`
  );
  try {
    const dot = nativeImage.createFromPath(assetPath("tray-dot.png"));
    mainWindow?.setOverlayIcon(unread > 0 ? dot : null, unread > 0 ? `${unread} não lidas` : "");
  } catch {}
  tray.setContextMenu(Menu.buildFromTemplate(trayMenu()));
}

function trayMenu() {
  const login = app.getLoginItemSettings();
  return [
    { label: "Abrir WellCORD", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: "separator" },
    {
      label: "Push-to-talk",
      submenu: [
        { label: `Tecla atual: ${pttAccelerator || "não definida"}`, enabled: false },
        { label: "Definir pelo app (menu de status)", enabled: false },
      ],
    },
    {
      label: "Iniciar com o Windows",
      type: "checkbox",
      checked: !!login.openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: !!item.checked }),
    },
    { label: "Abrir console (debug)", click: () => mainWindow?.webContents.openDevTools({ mode: "detach" }) },
    { type: "separator" },
    {
      label: trayState.inVoice ? "Sair da voz" : "Sair do WellCORD",
      click: () => {
        if (trayState.inVoice && mainWindow) {
          mainWindow.webContents.send("voice-control", "leave");
        } else {
          app.quit();
        }
      },
    },
  ];
}

function setupTray() {
  const icon = nativeImage.createFromPath(assetPath("tray.png"));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });
  refreshTray();
}

// --- IPC vindo do app ---
ipcMain.on("tray-update", (_e, state) => {
  trayState = { ...trayState, ...state };
  refreshTray();
});

ipcMain.handle("ptt-set", (_e, accelerator) => {  try {
    if (pttAccelerator) globalShortcut.unregister(pttAccelerator);
    pttAccelerator = null;
    if (!accelerator) { refreshTray(); return true; }
    const ok = globalShortcut.register(accelerator, () => mainWindow?.webContents.send("ptt", "press"));
    if (!ok) return false;
    pttAccelerator = accelerator;
    refreshTray();
    return true;
  } catch {
    return false;
  }
});

// Seletor de tela próprio (estilo Discord): telas + janelas com miniatura
ipcMain.handle("screens-list", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: false,
    });
    return sources
      .filter((s) => !/wellcord/i.test(s.name))
      .map((s) => ({
        id: s.id,
        name: s.name || (s.id.startsWith("screen:") ? "Tela" : "Janela"),
        screen: s.id.startsWith("screen:"),
        thumbnail: s.thumbnail.isEmpty() ? null : s.thumbnail.toDataURL(),
      }));
  } catch {
    return [];
  }
});

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
    icon: assetPath("icon.ico"),
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
  // Minimizar vai pra tray em vez de fechar
  mainWindow.on("close", (e) => {
    if (!app.quitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  // Electron não tem seletor de tela nativo: o app fornece a fonte
  // (tela principal + áudio do sistema via loopback)
  try {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen"] })
        .then((sources) => {
          if (sources.length > 0) callback({ video: sources[0], audio: "loopback" });
          else callback({});
        })
        .catch(() => callback({}));
    });
  } catch (e) {
    console.error("[wellcord] displayMedia handler falhou:", e);
  }
  if (!isDev) {
    try {
      await startEmbeddedNext();
    } catch (e) {
      console.error("[wellcord] falha ao subir servidor embutido:", e);
      app.quit();
      return;
    }
  }
  setupTray();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // App segue no tray; sair de verdade pelo menu do tray
});

app.on("before-quit", () => { app.quitting = true; });
app.on("will-quit", () => { globalShortcut.unregisterAll(); });
