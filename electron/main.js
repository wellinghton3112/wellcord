const { app, BrowserWindow, shell, Tray, Menu, nativeImage, ipcMain, globalShortcut, session, desktopCapturer, dialog, Notification } = require("electron");
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
      { label: "Verificar atualizações", click: () => checkForUpdate(true) },
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
let pendingScreenId = null;

// Update progress para o renderer
ipcMain.on("update-check", () => checkForUpdate(true));
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

// Fonte escolhida no picker: usada UMA vez pelo getDisplayMedia seguinte
ipcMain.handle("screens-pick", (_e, id) => {
  pendingScreenId = id || null;
  return true;
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

  // Se o renderer quebrar (ex: captura), recarrega em vez de tela cinza
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error("[wellcord] renderer gone:", details?.reason);
    try {
      const { dialog } = require("electron");
      dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "WellCORD",
        message: "A janela travou e será recarregada.",
        detail: `Motivo: ${details?.reason || "desconhecido"}`,
      }).catch(() => {});
    } catch {}
    mainWindow?.reload();
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Notificação nativa do Windows (só quando o app não está em foco)
ipcMain.on("notify-show", (_e, n) => {
  try {
    if (!n || mainWindow?.isFocused()) return;
    const notif = new Notification({
      title: n.title || "WellCORD",
      body: n.body || "",
      icon: assetPath("tray.png"),
      appName: "WellCORD",
    });
    notif.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send("notify-click", n.ref || null);
      }
    });
    notif.show();
  } catch {}
});

// Auto-update via API do GitHub Releases (só no .exe instalado)
// Usa https direto — mais confiável que electron-updater (evita erros de provider/config)
const https = require("https");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);
const fs = require("fs");

const GITHUB_REPO = "wellinghton3112/wellcord";

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: { "User-Agent": "WellCORD-Updater", "Accept": "application/vnd.github+json" },
    };
    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error("JSON parse error")); }
      });
    }).on("error", reject);
  });
}

function compareVersions(a, b) {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0, nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

let updateCheckTimer = null;
let downloading = false;
let pendingUpdate = null; // { version, exeUrl, size }

function setupAutoUpdate() {
  if (isDev) return;
  const check = () => checkForUpdate(false);
  setTimeout(check, 30 * 1000);
  updateCheckTimer = setInterval(check, 6 * 60 * 60 * 1000);
}

async function checkForUpdate(manual) {
  const done = (msg, type) => {
    if (manual && mainWindow) dialog.showMessageBox(mainWindow, { type: type || "info", title: "WellCORD", message: msg }).catch(() => {});
  };
  try {
    const release = await fetchLatestRelease();
    if (!release || !release.tag_name) {
      done("Não foi possível ler informações do GitHub.", "warning");
      return;
    }
    const latestVersion = release.tag_name.replace(/^v/, "");
    const currentVersion = app.getVersion();
    if (compareVersions(latestVersion, currentVersion) <= 0) {
      done(`Você já está na versão mais recente (${currentVersion}).`);
      return;
    }
    // Versão nova encontrada
    const exeAsset = release.assets.find((a) => /\.exe$/i.test(a.name));
    if (!exeAsset) {
      done(`Versão ${latestVersion} disponível, mas o instalador não foi encontrado no GitHub.`, "warning");
      return;
    }
    pendingUpdate = { version: latestVersion, exeUrl: exeAsset.browser_download_url, size: exeAsset.size };
    console.log(`[wellcord] update disponível: v${latestVersion} (atual: v${currentVersion})`);
    if (downloading) {
      done(`Atualização v${latestVersion} já está baixando...`);
      return;
    }
    // Perguntar se quer baixar
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "WellCORD — Atualização disponível",
      message: `Versão ${latestVersion} disponível!`,
      detail: `Sua versão: ${currentVersion}\nTamanho: ${Math.round(exeAsset.size / 1024 / 1024)} MB`,
      buttons: ["Baixar e instalar", "Depois"],
      defaultId: 0,
    }).catch(() => ({ response: 1 }));
    if (response !== 0) return;
    await downloadAndInstall(pendingUpdate);
  } catch (e) {
    console.error("[wellcord] erro ao verificar atualização:", e?.message || e);
    if (manual) done("Não foi possível verificar agora. Tente mais tarde.", "warning");
  }
}

async function downloadAndInstall(update) {
  if (downloading) return;
  downloading = true;
  const tempPath = path.join(app.getPath("temp"), `WellCORD-Setup-${update.version}.exe`);
  try {
    console.log(`[wellcord] baixando ${update.exeUrl} -> ${tempPath}`);
    // Notificar o renderer que começou
    mainWindow?.webContents.send("update-download-progress", { phase: "start", version: update.version });
    const file = fs.createWriteStream(tempPath);
    await new Promise((resolve, reject) => {
      https.get(update.exeUrl, (res) => {
        // Seguir redirecionamentos (GitHub CDN)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (res2) => {
            streamPipeline(res2, file).then(resolve).catch(reject);
          }).on("error", reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;
        res.on("data", (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round((downloaded / total) * 100);
            mainWindow?.webContents.send("update-download-progress", { phase: "downloading", pct, downloaded, total });
          }
        });
        streamPipeline(res, file).then(resolve).catch(reject);
      }).on("error", reject);
    });
    console.log(`[wellcord] download concluído: ${tempPath}`);
    mainWindow?.webContents.send("update-download-progress", { phase: "done", path: tempPath });
    // Perguntar para instalar
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "WellCORD atualizado",
      message: `Versão ${update.version} baixada com sucesso!`,
      detail: "O instalador será aberto. Siga as instruções para atualizar.",
      buttons: ["Instalar agora", "Depois"],
      defaultId: 0,
    }).catch(() => ({ response: 1 }));
    if (response === 0) {
      require("shell").openExternal(tempPath);
      app.quit();
    }
  } catch (e) {
    console.error("[wellcord] erro no download:", e?.message || e);
    dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "WellCORD",
      message: "Falha ao baixar a atualização.",
      detail: e?.message || "Verifique sua conexão e tente novamente.",
    }).catch(() => {});
    mainWindow?.webContents.send("update-download-progress", { phase: "error", error: e?.message });
  } finally {
    downloading = false;
  }
}

app.whenReady().then(async () => {  // Electron não tem seletor de tela nativo: o app fornece a fonte
  // (escolhida no picker, ou tela principal) + áudio do sistema via loopback
  try {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen", "window"] })
        .then((sources) => {
          const wanted = pendingScreenId
            ? sources.find((s) => s.id === pendingScreenId)
            : null;
          pendingScreenId = null;
          const pick = wanted || sources.find((s) => s.id.startsWith("screen:")) || sources[0];
          if (pick) callback({ video: pick, audio: "loopback" });
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
  setupAutoUpdate();
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
