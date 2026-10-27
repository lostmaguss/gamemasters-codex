// Party vote: ask the table a question; players vote with buttons in Discord (or you tally by hand),
// and live bars show on stream.
import { $, $$, esc, icon, toast, uid } from "./util.js";
import { C, S, save } from "./store.js";
import { Stage } from "./bridge.js";

let App = null, subs = new Set();
const P = () => C().ui.poll || null;
const counts = p => p.opts.map((text, i) => {
  const d = p.discord?.[i] || { n: 0, names: [] }, ph = Object.values(p.phone || {}).filter(v => v.idx === i).map(v => v.name);
  return { text, n: d.n + (p.manual[i] || 0) + ph.length, names: [...d.names, ...ph] };
});
export const pollCounts = p => counts(p);
// a vote from a player's phone (the table link); they can change it while the vote is open
export function phoneVote(m, id, idx) {
  const p = P(); if (!p || p.id !== id || !p.open || !p.opts[idx]) return;
  (p.phone ||= {})[m.id] = { idx, name: m.character || m.player }; changed();
}
function push() {
  const p = P();
  if (!p || !p.onStream) return Stage.overlay({ kind: "poll", show: false });
  const opts = counts(p), top = Math.max(0, ...opts.map(o => o.n));
  Stage.overlay({ kind: "poll", show: true, q: p.q, opts, closed: !p.open, top, viaDiscord: !!p.discordOk });
}
const changed = () => { save(); push(); subs.forEach(f => f()); };

export function initPoll(app) {
  App = app;
  window.codex?.bot?.onVote?.(v => { const p = P(); if (!p || p.id !== v.id) return; p.discord = v.opts.map(o => ({ n: o.n, names: o.names })); changed(); });
  push();
}
export function onPoll(fn) { subs.add(fn); return () => subs.delete(fn); }

export async function openPoll(q, opts) {
  const c = C();
  const p = c.ui.poll = { id: uid(), q, opts, manual: opts.map(() => 0), discord: null, open: true, onStream: true, discordOk: false };
  const B = window.codex?.bot;
  if (B && App._botOnline) {
    const r = await B.poll({ op: "open", id: p.id, q, opts, channel: S.data.prefs.bot?.channel || null });
    if (r?.ok) { p.discordOk = true; toast("Vote posted in Discord"); } else toast(`Discord: ${r?.error || "couldn't post"}. You can still tally by hand.`);
  }
  if (!App.streamLive) Stage.open();
  changed();
}
export async function closePoll() {
  const p = P(); if (!p) return;
  p.open = false;
  if (p.discordOk) await window.codex.bot.poll({ op: "close", id: p.id });
  const o = counts(p), top = Math.max(...o.map(x => x.n));
  const win = o.filter(x => x.n === top && top > 0).map(x => x.text);
  toast(win.length ? `The party chose: ${win.join(" / ")}` : "No votes");
  if (win.length && C().sessions.some(x => x.status === "live")) App.logBeat?.("social", `The party voted: ${p.q} → ${win.join(" / ")}`);
  changed();
}

export function renderPollControls(host) {
  const p = P();
  const draw = () => renderPollControls(host);
  if (!p) {
    host.innerHTML = `<div class="lt-form" style="grid-template-columns:1fr"><input type="text" id="pQ" placeholder="Which way, crew?"></div>
      <textarea id="pO" rows="3" placeholder="One option per line (2 to 10)&#10;Through the sewers&#10;Over the rooftops" style="margin-top:6px;width:100%"></textarea>
      <div class="row" style="margin-top:6px"><button class="btn primary" id="pGo">${icon("party")} Start the vote</button></div>`;
    $("#pGo", host).onclick = () => {
      const q = $("#pQ", host).value.trim(), opts = $("#pO", host).value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 10);
      if (!q) return toast("Ask a question first"); if (opts.length < 2) return toast("Give at least two options");
      openPoll(q, opts).then(draw);
    };
    return;
  }
  const o = counts(p), tot = o.reduce((s, x) => s + x.n, 0) || 1, top = Math.max(...o.map(x => x.n));
  host.innerHTML = `<div class="poll-q"><b>${esc(p.q)}</b><span class="eyebrow">${p.open ? (p.discordOk ? "Open · voting in Discord" : "Open · tally by hand") : "Closed"}</span></div>
    <ul class="poll-l">${o.map((x, i) => `<li class="${!p.open && x.n === top && top > 0 ? "win" : ""}"><div class="poll-bar" style="--w:${x.n / tot * 100}%"><span>${esc(x.text)}</span><b class="mono">${x.n}</b></div>
      <button class="tb" data-pm="${i}" title="One fewer">−</button><button class="tb" data-pp="${i}" title="One more vote">+</button>${x.names.length ? `<small class="carried">${esc(x.names.join(", "))}</small>` : ""}</li>`).join("")}</ul>
    <div class="row" style="gap:6px;margin-top:8px">${p.open ? `<button class="btn primary" id="pClose">Close &amp; reveal</button>` : ""}
      <label class="toggle"><input type="checkbox" id="pStream" ${p.onStream ? "checked" : ""}> On stream</label><div style="flex:1"></div><button class="btn ghost" id="pNew">New vote</button></div>`;
  $$("[data-pp]", host).forEach(b => b.onclick = () => { p.manual[+b.dataset.pp]++; changed(); });
  $$("[data-pm]", host).forEach(b => b.onclick = () => { const i = +b.dataset.pm; p.manual[i] = Math.max(0, p.manual[i] - 1); changed(); });
  $("#pClose", host)?.addEventListener("click", () => closePoll().then(draw));
  $("#pStream", host).onchange = e => { p.onStream = e.target.checked; changed(); };
  $("#pNew", host).onclick = async () => { if (p.open) await closePoll(); C().ui.poll = null; changed(); };
}
