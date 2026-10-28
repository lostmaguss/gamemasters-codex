// Share over the internet: a Cloudflare quick tunnel to the table server, so players
// on other networks can open the table link. Free, no account; the address changes each time.
// cloudflared is downloaded from Cloudflare's GitHub releases the first time it's needed.
const { app, net } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BIN = {
  "win32-x64": "cloudflared-windows-amd64.exe", "win32-arm64": "cloudflared-windows-amd64.exe", "win32-ia32": "cloudflared-windows-386.exe",
  "linux-x64": "cloudflared-linux-amd64", "linux-arm64": "cloudflared-linux-arm64",
  "darwin-x64": "cloudflared-darwin-amd64.tgz", "darwin-arm64": "cloudflared-darwin-arm64.tgz", // macOS ships as an archive
};
const binDir = () => path.join(app.getPath("userData"), "bin");
const binName = () => BIN[`${process.platform}-${process.arch}`];
const binPath = () => process.env.CODEX_TUNNEL_BIN || path.join(binDir(), process.platform === "darwin" ? "cloudflared" : binName() || "cloudflared");

let proc = null, state = { state: "off" }, onChange = () => {};
const set = s => { state = s; onChange(state); };

async function download() {
  const name = binName();
  if (!name) throw new Error("Sharing over the internet isn't available on this system yet.");
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${name}`;
  set({ state: "downloading", progress: 0 });
  const res = await net.fetch(url);
  if (!res.ok) throw new Error(`Couldn't download the tunnel helper (${res.status}).`);
  const total = Number(res.headers.get("content-length")) || 0, tmp = path.join(binDir(), name + ".part");
  await fs.promises.mkdir(binDir(), { recursive: true });
  const out = fs.createWriteStream(tmp); let got = 0, last = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    got += value.length; if (!out.write(Buffer.from(value))) await new Promise(r => out.once("drain", r));
    if (total && Date.now() - last > 250) { last = Date.now(); set({ state: "downloading", progress: got / total }); }
  }
  await new Promise((r, j) => out.end(e => e ? j(e) : r()));
  if (got < 1e6) throw new Error("The tunnel helper download was incomplete. Try again.");
  if (name.endsWith(".tgz")) {
    await new Promise((res, rej) => spawn("tar", ["-xzf", tmp, "-C", binDir()]).on("exit", c => c ? rej(new Error("Couldn't unpack the tunnel helper.")) : res()));
    await fs.promises.unlink(tmp).catch(() => {});
  } else await fs.promises.rename(tmp, binPath());
  if (process.platform !== "win32") await fs.promises.chmod(binPath(), 0o755);
}

async function start(port) {
  stop();
  try {
    if (!fs.existsSync(binPath())) await download();
    set({ state: "starting" });
    return await new Promise(resolve => {
      const p = spawn(binPath(), ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`], { windowsHide: true });
      proc = p;
      let found = false, log = "";
      const timer = setTimeout(() => { if (!found) { stop(); fail("Couldn't reach Cloudflare. Check your internet connection, or that a firewall isn't blocking the app."); } }, 45000);
      const fail = msg => { clearTimeout(timer); set({ state: "error", error: msg }); resolve(state); };
      const read = d => {
        log = (log + d.toString()).slice(-4000);
        // the tunnel's own address, not api.trycloudflare.com from an error message
        const m = log.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/);
        if (m && !found) { found = true; clearTimeout(timer); set({ state: "on", url: m[0] }); resolve(state); }
      };
      p.stdout.on("data", read); p.stderr.on("data", read);
      p.on("error", e => fail(`The tunnel helper didn't start: ${e.message}`));
      p.on("exit", code => { if (p._stopped) return; if (proc === p) proc = null; if (!found) fail(/rate|429/i.test(log) ? "Cloudflare is busy right now. Try again in a minute." : /no such host|dial tcp|lookup/i.test(log) ? "Couldn't reach Cloudflare. Check your internet connection." : `The tunnel stopped (code ${code}).`); else if (state.state === "on") set({ state: "error", error: "The internet link dropped. Turn it on again." }); });
    });
  } catch (e) { set({ state: "error", error: String(e.message || e) }); return state; }
}
function stop() {
  const p = proc; proc = null;
  if (p) { p._stopped = true; try { p.kill(); } catch {} }
  if (state.state !== "off") set({ state: "off" });
}
app.on("before-quit", stop);
module.exports = { start, stop, status: () => state, onChange: fn => { onChange = fn; } };
