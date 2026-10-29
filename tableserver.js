// Table server: a small web server on the local network.
// Players open a page on their phones (handouts, map, their sheet, rolls, votes),
// and OBS loads stream overlays as transparent browser sources. Off until the GM turns it on.
const http = require("http");
const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ipcMain } = require("electron");
const tunnel = require("./tunnel");

const ROOT = __dirname;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".webm": "audio/webm" };
// only the app's own code, its libraries and fonts are served without the key
const PUBLIC = [/^app\/[\w./-]+$/, /^node_modules\/(three|cannon-es|@fontsource)\/[\w./@-]+$/];

let server = null, port = 0, key = "", gmKey = "", desk = null, mediaDir = null;
const clients = new Set(); // { res, role, member, only, dice }
let primary = null; // the OBS dice source that throws the physics when no stream window is open
const last = { overlay: {}, show: null, players: null, inbox: {}, mine: {}, gm: null }; // mine: per-player private state (journal)
let stageOpen = () => false;

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) for (const a of list || []) {
    if (a.family !== "IPv4" || a.internal) continue;
    const score = /^192\.168\./.test(a.address) ? 3 : /^10\./.test(a.address) ? 2 : /^172\.(1[6-9]|2\d|3[01])\./.test(a.address) ? 1 : 0;
    if (/vEthernet|VirtualBox|VMware|WSL|Hyper-V|docker|vbox/i.test(name)) continue;
    out.push({ ip: a.address, score });
  }
  return out.sort((a, b) => b.score - a.score).map(a => a.ip);
}
const base = () => `http://${lanAddresses()[0] || "localhost"}:${port}`;
const info = () => ({ on: !!server, port, key, url: server ? `${base()}/?k=${key}` : null, tunnel: tunnel.status(), publicUrl: server && tunnel.status().state === "on" ? `${tunnel.status().url}/?k=${key}` : null, gmUrl: server && gmKey ? `${base()}/gm?g=${gmKey}` : null, gmPublicUrl: server && gmKey && tunnel.status().state === "on" ? `${tunnel.status().url}/gm?g=${gmKey}` : null, local: server ? `http://localhost:${port}` : null, players: [...clients].filter(c => c.role === "player").map(c => c.member).filter(Boolean), obs: [...clients].filter(c => c.role === "obs").length });
const tellDesk = () => desk && !desk.isDestroyed() && desk.webContents.send("table:status", info());

// pictures in the app live at codexmedia://media/<file>; phones fetch them from /media/<file>
const remap = v => JSON.parse(JSON.stringify(v ?? null).replace(/codexmedia:\/\/media\//g, `/media/`).replace(/"\/media\/([^"?]+)"/g, `"/media/$1?k=${key}"`));

function send(c, t, v) { try { c.res.write(`data: ${JSON.stringify({ t, v: remap(v) })}\n\n`); } catch {} }
function wants(c, t, v) {
  if (c.role === "player") return ["overlay", "show", "hide", "players", "inbox", "result", "you", "journal"].includes(t);
  if (c.role === "gm") return ["gm", "result"].includes(t);
  if (!c.only) return true;
  if (t === "overlay") return c.only.has(v.kind) || (v.kind === "mapstate" && c.only.has("map"));
  if (["roll", "rollShow", "clear"].includes(t)) return c.only.has("dice");
  if (t === "show" || t === "hide") return c.only.has("handout");
  if (t === "sound") return c.only.has("sound");
  return true;
}
// fan an event out to the browser clients
function broadcast(t, v, filter) { for (const c of clients) if ((!filter || filter(c)) && wants(c, t, v)) send(c, t, v); }

function pickPrimary() {
  if (primary && clients.has(primary)) return primary;
  primary = [...clients].find(c => c.role === "obs" && c.dice) || null;
  return primary;
}
const obsDice = () => !!pickPrimary();

function serveFile(res, file, cache = true) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": cache ? "max-age=300" : "no-store" });
    res.end(buf);
  });
}
function body(req) { return new Promise(r => { let s = ""; req.on("data", d => { s += d; if (s.length > 1e6) req.destroy(); }); req.on("end", () => { try { r(JSON.parse(s)); } catch { r(null); } }); }); }

// wrong keys: each address gets a short cooldown, so the link can't be guessed by brute force
const misses = new Map();
const who = req => String(req.headers["cf-connecting-ip"] || req.socket.remoteAddress || "?");
const same = (k, want) => typeof k === "string" && !!want && k.length === want.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(want));
async function handle(req, res) {
  // k: the players' key. g: the GM remote's own key, never shown to players
  const u = new URL(req.url, "http://x"), given = u.searchParams.get("k"), givenGm = u.searchParams.get("g");
  let ok = false, gm = false;
  if (given != null || givenGm != null) {
    const ip = who(req), m = misses.get(ip);
    if (m && m.n >= 5 && Date.now() - m.t < 60000) { res.writeHead(429); return res.end("Too many wrong links. Wait a minute."); }
    gm = givenGm != null && same(givenGm, gmKey); ok = gm || (given != null && same(given, key));
    if (!ok) misses.set(ip, { n: (m && Date.now() - m.t < 60000 ? m.n : 0) + 1, t: Date.now() }); else misses.delete(ip);
    if (misses.size > 5000) misses.clear();
  }
  const p = decodeURIComponent(u.pathname).replace(/^\/+/, "");
  if (p === "" || p === "player") {
    if (!ok) { res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" }); return res.end(`<!doctype html><meta name=viewport content="width=device-width"><body style="font:18px sans-serif;background:#1a1517;color:#eee;padding:40px">Ask your GM for the table link or QR code.<br><br><span style="color:#aaa">Oyun yöneticinden masa bağlantısını ya da QR kodunu iste.</span></body>`); }
    return serveFile(res, path.join(ROOT, "app", "player.html"), false);
  }
  if (p === "gm") {
    if (!gm) { res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" }); return res.end(`<!doctype html><meta name=viewport content="width=device-width"><body style="font:18px sans-serif;background:#1a1517;color:#eee;padding:40px">This is the GM's remote. Open it from Settings → Connections → GM remote on the GM's computer.`); }
    return serveFile(res, path.join(ROOT, "app", "gm.html"), false);
  }
  // the stream page loads its scripts and styles relative to app/, so send OBS there
  if (p === "obs") { if (!ok) { res.writeHead(403); return res.end("Wrong key"); } res.writeHead(302, { Location: `/app/stage.html${u.search}` }); return res.end(); }
  if (p === "events") {
    if (!ok) { res.writeHead(403); return res.end(); }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
    const only = u.searchParams.get("only");
    const c = { res, role: gm ? "gm" : u.searchParams.get("role") === "obs" ? "obs" : "player", member: u.searchParams.get("member") || null, only: only ? new Set(only.split(",")) : null };
    c.dice = c.role === "obs" && (!c.only || c.only.has("dice"));
    clients.add(c); res.write(": hi\n\n");
    if (c.role === "gm") { if (last.gm) send(c, "gm", last.gm); desk && desk.webContents.send("table:gm", { type: "hello" }); }
    // catch the newcomer up
    for (const v of Object.values(last.overlay)) if (!v.secs || Date.now() - v._at < v.secs * 1000) if (wants(c, "overlay", v)) send(c, "overlay", v);
    if (c.role === "player") { if (last.players) send(c, "players", last.players); if (last.show) send(c, "show", last.show); if (c.member && last.inbox[c.member]) send(c, "inbox", last.inbox[c.member]); if (c.member) for (const [t, v] of Object.entries(last.mine[c.member] || {})) send(c, t, v); }
    const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);
    req.on("close", () => { clearInterval(ping); clients.delete(c); if (primary === c) primary = null; tellDesk(); desk && desk.webContents.send("stage:state", stageOpen() || obsDice()); });
    tellDesk(); desk && desk.webContents.send("stage:state", stageOpen() || obsDice());
    return;
  }
  if (p === "act" && req.method === "POST") {
    if (!ok) { res.writeHead(403); return res.end(); }
    const a = await body(req); res.writeHead(204); res.end();
    if (!a) return;
    if (gm) { desk && desk.webContents.send("table:gm", a); return; }
    if (a.type === "result") { desk && desk.webContents.send("stage:result", a.r); broadcast("rollShow", a.r, c => c.role === "obs" && c !== primary); return; }
    desk && desk.webContents.send("table:act", a);
    return;
  }
  if (p.startsWith("media/")) {
    if (!ok || !mediaDir) { res.writeHead(403); return res.end(); }
    return serveFile(res, path.join(mediaDir(), path.basename(p)));
  }
  if (PUBLIC.some(r => r.test(p)) && !p.includes("..")) return serveFile(res, path.join(ROOT, p));
  res.writeHead(404); res.end("Not found");
}

function start(wantPort, wantKey, wantGm) {
  return new Promise(resolve => {
    stop();
    key = wantKey || crypto.randomBytes(4).toString("hex"); gmKey = wantGm || "";
    const s = http.createServer((q, r) => handle(q, r).catch(() => { try { r.writeHead(500); r.end(); } catch {} }));
    let tryPort = wantPort || 7420;
    s.on("error", e => { if (e.code === "EADDRINUSE" && tryPort < (wantPort || 7420) + 20) s.listen(++tryPort, "0.0.0.0"); else { server = null; resolve({ ...info(), error: String(e.message) }); } });
    s.listen(tryPort, "0.0.0.0", () => { server = s; port = tryPort; tellDesk(); resolve(info()); });
  });
}
function stop() {
  tunnel.stop();
  for (const c of clients) { try { c.res.end(); } catch {} }
  clients.clear(); primary = null;
  if (server) { server.close(); server = null; }
  tellDesk();
}

// main.js calls these so browser clients mirror the stream window
const mirror = {
  overlay(o) { last.overlay[o.kind] = o.secs ? { ...o, _at: Date.now() } : o; broadcast("overlay", o); },
  show(h) { last.show = h; broadcast("show", h); },
  hide() { last.show = null; broadcast("hide", null); },
  clear() { broadcast("clear", null); },
  sound(cmd) { broadcast("sound", cmd, c => c.role === "obs"); },
  // with no stream window open, the OBS dice source throws; otherwise OBS just shows results
  roll(req) { if (!stageOpen() && pickPrimary()) send(primary, "roll", req); },
  result(r) { broadcast("rollShow", r, c => c.role === "obs"); },
  wantsRolls: () => !stageOpen() && obsDice(),
  hasObsDice: obsDice,
};

function setup(getDesk, getMediaDir, isStageOpen) {
  mediaDir = getMediaDir; stageOpen = isStageOpen;
  ipcMain.handle("table:start", async (_e, o = {}) => { desk = getDesk(); return start(o.port, o.key, o.gmKey); });
  // the GM remote's state, and who is connected to it
  ipcMain.on("table:gmstate", (_e, v) => { last.gm = v; broadcast("gm", v, c => c.role === "gm"); });
  ipcMain.on("table:gmresult", (_e, v) => broadcast("result", v, c => c.role === "gm"));
  ipcMain.handle("table:stop", () => { stop(); return info(); });
  // share over the internet: a Cloudflare quick tunnel in front of the table server
  tunnel.onChange(() => tellDesk());
  ipcMain.handle("table:tunnel", async (_e, on) => { if (!on) { tunnel.stop(); return info(); } if (!server) return { ...info(), error: "Turn on the table link first" }; await tunnel.start(port); return info(); });
  ipcMain.handle("table:info", () => { desk = getDesk(); return info(); });
  ipcMain.handle("table:qr", async (_e, text) => require("qrcode").toString(text, { type: "svg", margin: 1, color: { dark: "#1a1517", light: "#ffffff" } }));
  // the desk pushes player-facing state: party sheets, whispers, roll results
  ipcMain.on("table:players", (_e, v) => { last.players = v; broadcast("players", v, c => c.role === "player"); });
  ipcMain.on("table:inbox", (_e, { member, list }) => { last.inbox[member] = list; broadcast("inbox", list, c => c.role === "player" && c.member === member); });
  // private to one player, and replayed when they reconnect
  ipcMain.on("table:mine", (_e, { member, t, v }) => { (last.mine[member] ||= {})[t] = v; broadcast(t, v, c => c.role === "player" && c.member === member); });
  ipcMain.on("table:to", (_e, { member, t, v }) => broadcast(t, v, c => c.role === "player" && (!member || c.member === member)));
  ipcMain.handle("table:online", () => [...clients].filter(c => c.role === "player").map(c => c.member).filter(Boolean));
  ipcMain.handle("table:gmOnline", () => [...clients].filter(c => c.role === "gm").length);
}
module.exports = { setup, mirror, stop, info };
