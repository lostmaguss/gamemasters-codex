// Talks to the stream dice window: Electron IPC in the app, BroadcastChannel when opened in a browser.
const api = window.codex?.stage;
let bc = null; try { bc = new BroadcastChannel("codex-stage"); } catch {}
const subs = { result: [], state: [], roll: [], clear: [], close: [], sound: [], show: [], hide: [] };
let browserOpen = false;
if (!api && bc) bc.onmessage = e => {
  const { t, v } = e.data || {};
  if (t === "hello") { browserOpen = true; subs.state.forEach(f => f(true)); }
  if (t === "bye") { browserOpen = false; subs.state.forEach(f => f(false)); }
  (subs[t] || []).forEach(f => f(v));
};
export const Stage = {
  open() { if (api) api.open(); else window.open("stage.html", "codex-stage", "width=1200,height=720"); },
  close() { if (api) api.close(); else bc?.postMessage({ t: "close" }); },
  async isOpen() { return api ? api.isOpen() : browserOpen; },
  onTop(v) { api?.onTop(v); },
  roll(req) { if (api) api.roll(req); else bc?.postMessage({ t: "roll", v: req }); },
  clear() { if (api) api.clear(); else bc?.postMessage({ t: "clear" }); },
  sound(cmd) { if (api) api.sound(cmd); else bc?.postMessage({ t: "sound", v: cmd }); },
  show(h) { if (api) api.show(h); else { if (!browserOpen) this.open(); setTimeout(() => bc?.postMessage({ t: "show", v: h }), browserOpen ? 0 : 1500); } },
  hide() { if (api) api.hide(); else bc?.postMessage({ t: "hide" }); },
  onSound(fn) { if (api) api.onSound(fn); else subs.sound.push(fn); },
  onShow(fn) { if (api) api.onShow(fn); else subs.show.push(fn); },
  onHide(fn) { if (api) api.onHide(fn); else subs.hide.push(fn); },
  onState(fn) { if (api) api.onState(fn); else subs.state.push(fn); },
  onResult(fn) { if (api) api.onResult(fn); else subs.result.push(fn); },
  // stream-window side
  onRoll(fn) { if (api) api.onRoll(fn); else subs.roll.push(fn); },
  onClear(fn) { if (api) api.onClear(fn); else subs.clear.push(fn); },
  sendResult(r) { if (api) api.sendResult(r); else bc?.postMessage({ t: "result", v: r }); },
  onClose(fn) { subs.close.push(fn); },
  hello() { if (!api) { bc?.postMessage({ t: "hello" }); addEventListener("beforeunload", () => bc?.postMessage({ t: "bye" })); } },
};
