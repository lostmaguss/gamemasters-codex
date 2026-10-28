// Talks to the stream dice window: Electron IPC in the app, BroadcastChannel when opened in a browser.
import { getLang } from "./i18n.js";
const api = window.codex?.stage;
let bc = null; try { bc = new BroadcastChannel("codex-stage"); } catch {}
const subs = { result: [], state: [], roll: [], clear: [], close: [], sound: [], show: [], hide: [], overlay: [], rollShow: [] };
// opened from the table server (OBS browser source): events stream in, results post back
const Q = new URLSearchParams(location.search);
export const remote = !api && Q.get("k") && /^https?:/.test(location.protocol) ? { key: Q.get("k"), only: Q.get("only") } : null;
if (remote) {
  const connect = () => {
    const es = new EventSource(`/events?k=${encodeURIComponent(remote.key)}&role=obs${remote.only ? "&only=" + encodeURIComponent(remote.only) : ""}`);
    es.onmessage = e => { const { t, v } = JSON.parse(e.data); (subs[t] || []).forEach(f => f(v)); };
    es.onerror = () => { es.close(); setTimeout(connect, 2000); };
  };
  connect();
}
const post = a => fetch(`/act?k=${encodeURIComponent(remote.key)}`, { method: "POST", body: JSON.stringify(a) }).catch(() => {});
const lastOverlay = {};
let browserOpen = false;
if (!api && !remote && bc) bc.onmessage = e => {
  const { t, v } = e.data || {};
  if (t === "hello") { browserOpen = true; subs.state.forEach(f => f(true)); Object.values(lastOverlay).forEach(o => bc.postMessage({ t: "overlay", v: o })); }
  if (t === "bye") { browserOpen = false; subs.state.forEach(f => f(false)); }
  (subs[t] || []).forEach(f => f(v));
};
export const Stage = {
  open() { if (api) api.open(); else window.open("stage.html", "codex-stage", "width=1200,height=720"); },
  close() { if (api) api.close(); else bc?.postMessage({ t: "close" }); },
  async isOpen() { return api ? api.isOpen() : browserOpen; },
  onTop(v) { api?.onTop(v); },
  roll(req) { req = { ...req, lang: getLang() }; if (api) api.roll(req); else bc?.postMessage({ t: "roll", v: req }); },
  clear() { if (api) api.clear(); else bc?.postMessage({ t: "clear" }); },
  sound(cmd) { if (api) api.sound(cmd); else bc?.postMessage({ t: "sound", v: cmd }); },
  show(h) { if (api) api.show(h); else { if (!browserOpen) this.open(); setTimeout(() => bc?.postMessage({ t: "show", v: h }), browserOpen ? 0 : 1500); } },
  overlay(o) { o = { ...o, lang: getLang() }; if (api) api.overlay(o); else { lastOverlay[o.kind] = o; bc?.postMessage({ t: "overlay", v: o }); } },
  onOverlay(fn) { if (api) api.onOverlay(fn); else subs.overlay.push(fn); },
  hide() { if (api) api.hide(); else bc?.postMessage({ t: "hide" }); },
  onSound(fn) { if (api) api.onSound(fn); else subs.sound.push(fn); },
  onShow(fn) { if (api) api.onShow(fn); else subs.show.push(fn); },
  onHide(fn) { if (api) api.onHide(fn); else subs.hide.push(fn); },
  onState(fn) { if (api) api.onState(fn); else subs.state.push(fn); },
  onResult(fn) { if (api) api.onResult(fn); else subs.result.push(fn); },
  // stream-window side
  onRoll(fn) { if (api) api.onRoll(fn); else subs.roll.push(fn); },
  onClear(fn) { if (api) api.onClear(fn); else subs.clear.push(fn); },
  sendResult(r) { if (api) api.sendResult(r); else if (remote) post({ type: "result", r }); else bc?.postMessage({ t: "result", v: r }); },
  onRollShow(fn) { subs.rollShow.push(fn); },
  onClose(fn) { subs.close.push(fn); },
  hello() { if (!api && !remote) { bc?.postMessage({ t: "hello" }); addEventListener("beforeunload", () => bc?.postMessage({ t: "bye" })); } },
};
