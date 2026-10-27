// Gamemaster's Codex — Electron main process.
// Owns the two windows (the GM desk and the stream dice window) and the campaign file on disk.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol, net, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const table = require("./tableserver");

// Set this to { owner, repo } of a public GitHub repo that holds release builds to turn on auto-update.
const UPDATE_REPO = { owner: "lostmaguss", repo: "gamemasters-codex" };

// Imported audio lives in <userData>/media and is served to both windows as codexmedia://media/<file>
protocol.registerSchemesAsPrivileged([{ scheme: "codexmedia", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const mediaDir = () => path.join(app.getPath("userData"), "media");
let pendingStage = [];
// latest state of each stream overlay (combat strip, map, scene), replayed when the stream window (re)loads
const overlays = {};
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
    for (const v of Object.values(overlays)) if (!v.secs || Date.now() - v._at < v.secs * 1000) stage.webContents.send("stage:overlay", v); // one-shots (name cards, loot) only while still fresh
    for (const [ch, v] of pendingStage) stage.webContents.send(ch, v);
    pendingStage = [];
  });
  stage.on("closed", () => { stage = null; desk && desk.webContents.send("stage:state", table.mirror.hasObsDice()); });
}

// ---- data file ----
ipcMain.handle("data:load", async () => {
  try { return await fs.promises.readFile(dataFile(), "utf8"); }
  catch {
    try { return await fs.promises.readFile(dataFile() + ".bak", "utf8"); } catch { return null; }
  }
});
// one dated copy per day in <userData>/backups, last 14 kept
async function dailyBackup(file) {
  const dir = path.join(dataDir(), "backups");
  const name = `codex-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.access(path.join(dir, name)).catch(async () => {
      await fs.promises.copyFile(file, path.join(dir, name));
      const all = (await fs.promises.readdir(dir)).filter(f => /^codex-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
      for (const old of all.slice(0, Math.max(0, all.length - 14))) await fs.promises.unlink(path.join(dir, old)).catch(() => {});
    });
  } catch {}
}
ipcMain.handle("data:backups", async () => {
  const dir = path.join(dataDir(), "backups");
  try { return (await fs.promises.readdir(dir)).filter(f => f.endsWith(".json")).sort().reverse(); } catch { return []; }
});
ipcMain.handle("data:restore", async (_e, name) => fs.promises.readFile(path.join(dataDir(), "backups", path.basename(name)), "utf8"));
ipcMain.handle("data:save", async (_e, text) => {
  const file = dataFile();
  await fs.promises.mkdir(dataDir(), { recursive: true });
  try { await fs.promises.copyFile(file, file + ".bak"); } catch {}
  const tmp = file + ".tmp";
  await fs.promises.writeFile(tmp, text, "utf8");
  await fs.promises.rename(tmp, file);
  await dailyBackup(file);
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
// table mode: the player display goes fullscreen on another screen (TV, projector)
ipcMain.handle("stage:screens", () => screen.getAllDisplays().map(d => ({ id: d.id, label: d.label || `${d.size.width}×${d.size.height}`, primary: d.id === screen.getPrimaryDisplay().id })));
ipcMain.handle("stage:toScreen", async (_e, id) => {
  if (!stage || stage.isDestroyed()) { openStage(); await new Promise(r => stage.webContents.once("did-finish-load", r)); }
  const d = screen.getAllDisplays().find(x => x.id === id) || screen.getAllDisplays().find(x => x.id !== screen.getPrimaryDisplay().id);
  if (!d) return { ok: false, error: "Only one screen is connected." };
  stage.setFullScreen(false); stage.setBounds(d.bounds); stage.setFullScreen(true); stage.webContents.send("stage:tableMode", true);
  return { ok: true };
});
ipcMain.on("stage:windowed", () => { if (stage && !stage.isDestroyed()) { stage.setFullScreen(false); stage.setSize(1280, 760); stage.center(); stage.webContents.send("stage:tableMode", false); } });
ipcMain.on("stage:close", () => stage && stage.close());
ipcMain.handle("stage:isOpen", () => !!(stage && !stage.isDestroyed()) || table.mirror.hasObsDice());
ipcMain.on("stage:ontop", (_e, on) => stage && stage.setAlwaysOnTop(!!on, "floating"));
const stageUp = () => !!(stage && !stage.isDestroyed());
ipcMain.on("stage:roll", (_e, req) => { if (stageUp()) stage.webContents.send("stage:roll", req); else table.mirror.roll(req); });
ipcMain.on("stage:result", (_e, res) => { desk && desk.webContents.send("stage:result", res); table.mirror.result(res); });
ipcMain.on("stage:clear", () => { stage && stage.webContents.send("stage:clear"); table.mirror.clear(); });
ipcMain.on("stage:sound", (_e, cmd) => { stage && stage.webContents.send("stage:sound", cmd); table.mirror.sound(cmd); });
// handouts open the stream window if needed and arrive once it has loaded
ipcMain.on("stage:show", (_e, h) => {
  table.mirror.show(h);
  if (!stageUp() && table.mirror.hasObsDice()) return; // streaming through OBS: no window needed
  if (stage && !stage.isDestroyed() && !stage.webContents.isLoading()) stage.webContents.send("stage:show", h);
  else { pendingStage.push(["stage:show", h]); openStage(); }
});
ipcMain.on("stage:overlay", (_e, o) => {
  overlays[o.kind] = o.secs ? { ...o, _at: Date.now() } : o;
  table.mirror.overlay(o);
  if (stage && !stage.isDestroyed() && !stage.webContents.isLoading()) stage.webContents.send("stage:overlay", o);
});
ipcMain.on("stage:hide", () => { stage && stage.webContents.send("stage:hide"); table.mirror.hide(); });

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
ipcMain.handle("media:saveData", async (_e, { dataURL, ext }) => {
  await fs.promises.mkdir(mediaDir(), { recursive: true });
  const file = Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + "." + (ext || "jpg");
  await fs.promises.writeFile(path.join(mediaDir(), file), Buffer.from(dataURL.split(",")[1], "base64"));
  return file;
});
ipcMain.handle("media:remove", async (_e, file) => { try { await fs.promises.unlink(path.join(mediaDir(), path.basename(file))); } catch {} return true; });

// ---- Discord webhooks ----
// Posting happens here, not in the page, so Discord's CORS rules don't apply and the page's CSP stays strict.
ipcMain.handle("discord:send", async (_e, { url, payload, file, files }) => {
  if (!/^https:\/\/(?:\w+\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/.test(url) && !process.env.CODEX_WEBHOOK_TEST) return { ok: false, status: 0, error: "That isn't a Discord webhook link" };
  try {
    let res;
    const list = (files || (file ? [file] : [])).filter(f => f && f.dataURL);
    if (list.length) {
      const form = new FormData();
      form.append("payload_json", JSON.stringify(payload));
      list.slice(0, 10).forEach((f, i) => {
        const [head, b64] = f.dataURL.split(",");
        const type = (head.match(/data:([^;]+)/) || [])[1] || "image/png";
        form.append(`files[${i}]`, new Blob([Buffer.from(b64, "base64")], { type }), f.name || `image${i}.png`);
      });
      res = await net.fetch(url, { method: "POST", body: form });
    } else {
      res = await net.fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    if (res.status === 429) { const j = await res.json().catch(() => ({})); return { ok: false, status: 429, error: `Discord says slow down (${Math.ceil(j.retry_after || 1)}s)` }; }
    return { ok: res.ok, status: res.status, error: res.ok ? "" : (await res.text()).slice(0, 200) };
  } catch (e) { return { ok: false, status: 0, error: String(e.message || e) }; }
});

// ---- printables: render a page in a hidden window and save it as a PDF ----
ipcMain.handle("print:pdf", async (_e, { html, name, landscape }) => {
  const os = require("os");
  const tmp = path.join(os.tmpdir(), `codex-print-${Date.now()}.html`);
  const base = pathToFileURL(path.join(__dirname, "app")).href + "/";
  await fs.promises.writeFile(tmp, html.replace("<head>", `<head><base href="${base}">`), "utf8");
  const w = new BrowserWindow({ show: false, width: 900, height: 1200, webPreferences: { sandbox: true } });
  try {
    await w.loadFile(tmp);
    await w.webContents.executeJavaScript("document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))))");
    const pdf = await w.webContents.printToPDF({ pageSize: "A4", printBackground: true, landscape: !!landscape, margins: { marginType: "none" } });
    if (process.env.CODEX_PRINT_TEST) { await fs.promises.writeFile(process.env.CODEX_PRINT_TEST, pdf); return { ok: true, file: process.env.CODEX_PRINT_TEST, pages: (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length }; }
    const { canceled, filePath } = await dialog.showSaveDialog(desk, { title: "Save PDF", defaultPath: path.join(app.getPath("documents"), (name || "codex") + ".pdf"), filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (canceled || !filePath) return { ok: false };
    await fs.promises.writeFile(filePath, pdf); shell.openPath(filePath);
    return { ok: true, file: filePath };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
  finally { w.destroy(); fs.promises.unlink(tmp).catch(() => {}); }
});

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

const bot = require("./bot");
bot.setup(() => desk);
table.setup(() => desk, mediaDir, () => !!(stage && !stage.isDestroyed()));

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
app.on("window-all-closed", () => { bot.stop(); if (process.platform !== "darwin") app.quit(); });
