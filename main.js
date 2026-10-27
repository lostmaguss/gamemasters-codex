// Gamemaster's Codex — Electron main process.
// Owns the two windows (the GM desk and the stream dice window) and the campaign file on disk.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

// Set this to { owner, repo } of a public GitHub repo that holds release builds to turn on auto-update.
const UPDATE_REPO = { owner: "lostmaguss", repo: "gamemasters-codex" };

// Imported audio lives in <userData>/media and is served to both windows as codexmedia://media/<file>
protocol.registerSchemesAsPrivileged([{ scheme: "codexmedia", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const mediaDir = () => path.join(app.getPath("userData"), "media");
let pendingStage = [];
// the stream window plays sound without waiting for a click inside it
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let desk = null;
let stage = null;

const dataDir = () => app.getPath("userData");
const dataFile = () => path.join(dataDir(), "codex-data.json");

function iconPath() {
  return path.join(__dirname, "build", "icon.png");
}

function createDesk() {
  desk = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    frame: false, backgroundColor: "#1a1517", title: "Gamemaster's Codex", icon: iconPath(), show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: false },
  });
  desk.loadFile(path.join(__dirname, "app", "index.html"));
  desk.once("ready-to-show", () => desk.show());
  const sendState = () => desk && desk.webContents.send("win:state", { max: desk.isMaximized() });
  desk.on("maximize", sendState);
  desk.on("unmaximize", sendState);
  desk.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  desk.on("closed", () => {
    desk = null;
    if (stage && !stage.isDestroyed()) stage.close();
  });
}

function openStage() {
  if (stage && !stage.isDestroyed()) { stage.show(); stage.focus(); return; }
  stage = new BrowserWindow({
    width: 1280, height: 760, minWidth: 480, minHeight: 320,
    title: "Codex Dice (stream)", backgroundColor: "#120e10", icon: iconPath(), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: false },
  });
  stage.setMenu(null);
  stage.loadFile(path.join(__dirname, "app", "stage.html"));
  stage.on("page-title-updated", e => e.preventDefault());
  stage.webContents.on("did-finish-load", () => {
    desk && desk.webContents.send("stage:state", true);
    for (const [ch, v] of pendingStage) stage.webContents.send(ch, v);
    pendingStage = [];
  });
  stage.on("closed", () => { stage = null; desk && desk.webContents.send("stage:state", false); });
}

// ---- data file ----
ipcMain.handle("data:load", async () => {
  try { return await fs.promises.readFile(dataFile(), "utf8"); }
  catch {
    try { return await fs.promises.readFile(dataFile() + ".bak", "utf8"); } catch { return null; }
  }
});
ipcMain.handle("data:save", async (_e, text) => {
  const file = dataFile();
  await fs.promises.mkdir(dataDir(), { recursive: true });
  try { await fs.promises.copyFile(file, file + ".bak"); } catch {}
  const tmp = file + ".tmp";
  await fs.promises.writeFile(tmp, text, "utf8");
  await fs.promises.rename(tmp, file);
  return true;
});
ipcMain.handle("data:export", async (_e, { text, name }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(desk, {
    title: "Export campaign backup", defaultPath: name || "codex-backup.json",
    filters: [{ name: "Codex backup", extensions: ["json"] }],
  });
  if (canceled || !filePath) return false;
  await fs.promises.writeFile(filePath, text, "utf8");
  return filePath;
});
ipcMain.handle("data:import", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(desk, {
    title: "Import campaign backup", properties: ["openFile"], filters: [{ name: "Codex backup", extensions: ["json"] }],
  });
  if (canceled || !filePaths[0]) return null;
  return fs.promises.readFile(filePaths[0], "utf8");
});
ipcMain.handle("data:folder", () => { shell.openPath(dataDir()); return dataDir(); });

// ---- window chrome ----
ipcMain.on("win:min", () => desk && desk.minimize());
ipcMain.on("win:max", () => desk && (desk.isMaximized() ? desk.unmaximize() : desk.maximize()));
ipcMain.on("win:close", () => desk && desk.close());

// ---- stream window ----
ipcMain.on("stage:open", openStage);
ipcMain.on("stage:close", () => stage && stage.close());
ipcMain.handle("stage:isOpen", () => !!(stage && !stage.isDestroyed()));
ipcMain.on("stage:ontop", (_e, on) => stage && stage.setAlwaysOnTop(!!on, "floating"));
ipcMain.on("stage:roll", (_e, req) => stage && stage.webContents.send("stage:roll", req));
ipcMain.on("stage:result", (_e, res) => desk && desk.webContents.send("stage:result", res));
ipcMain.on("stage:clear", () => stage && stage.webContents.send("stage:clear"));
ipcMain.on("stage:sound", (_e, cmd) => stage && stage.webContents.send("stage:sound", cmd));
// handouts open the stream window if needed and arrive once it has loaded
ipcMain.on("stage:show", (_e, h) => {
  if (stage && !stage.isDestroyed() && !stage.webContents.isLoading()) stage.webContents.send("stage:show", h);
  else { pendingStage.push(["stage:show", h]); openStage(); }
});
ipcMain.on("stage:hide", () => stage && stage.webContents.send("stage:hide"));

// ---- media (audio files) ----
ipcMain.handle("media:import", async (_e, paths) => {
  if (!paths) {
    const r = await dialog.showOpenDialog(desk, { title: "Add sounds", properties: ["openFile", "multiSelections"], filters: [{ name: "Audio", extensions: ["mp3", "ogg", "wav", "m4a", "flac", "webm", "opus"] }] });
    if (r.canceled) return [];
    paths = r.filePaths;
  }
  await fs.promises.mkdir(mediaDir(), { recursive: true });
  const out = [];
  for (const p of paths) {
    const ext = path.extname(p).toLowerCase();
    if (![".mp3", ".ogg", ".wav", ".m4a", ".flac", ".webm", ".opus"].includes(ext)) continue;
    const file = Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + ext;
    await fs.promises.copyFile(p, path.join(mediaDir(), file));
    out.push({ file, name: path.basename(p, ext) });
  }
  return out;
});
ipcMain.handle("media:remove", async (_e, file) => { try { await fs.promises.unlink(path.join(mediaDir(), path.basename(file))); } catch {} return true; });

// ---- updates ----
let updater = null;
function setupUpdates() {
  if (!UPDATE_REPO || !app.isPackaged) return;
  try {
    updater = require("electron-updater").autoUpdater;
    updater.setFeedURL({ provider: "github", owner: UPDATE_REPO.owner, repo: UPDATE_REPO.repo });
    updater.autoDownload = true;
    const tell = (state, info) => desk && desk.webContents.send("update:state", { state, version: info && info.version, message: info && info.message });
    updater.on("update-available", i => tell("downloading", i));
    updater.on("update-not-available", i => tell("current", i));
    updater.on("update-downloaded", i => tell("ready", i));
    updater.on("error", e => tell("error", { message: String(e && e.message || e) }));
    setTimeout(() => updater.checkForUpdates().catch(() => {}), 8000);
  } catch (e) { updater = null; }
}
ipcMain.handle("update:check", async () => {
  if (!updater) return { state: "off", version: app.getVersion() };
  try { await updater.checkForUpdates(); return { state: "checking", version: app.getVersion() }; } catch (e) { return { state: "error", message: String(e.message || e) }; }
});
ipcMain.on("update:install", () => updater && updater.quitAndInstall());
ipcMain.handle("app:version", () => app.getVersion());

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle("codexmedia", req => {
    const file = path.basename(decodeURIComponent(new URL(req.url).pathname));
    return net.fetch(pathToFileURL(path.join(mediaDir(), file)).toString());
  });
  createDesk();
  setupUpdates();
  app.on("activate", () => { if (!desk) createDesk(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
