// The player's phone: opened from the GM's table link. Read-mostly view of the table,
// plus rolls, votes and HP taps that go back to the GM's app.
import { drawMap, loadImg, loadFresh, fitView, makeFogTexture } from "./maprender.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const key = new URLSearchParams(location.search).get("k");
const store = { get: k => { try { return JSON.parse(localStorage.getItem("codex-player:" + k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("codex-player:" + k, JSON.stringify(v)); } catch {} } };
const S = { players: null, me: store.get("me"), tab: "table", show: null, inbox: [], seen: store.get("seen") || 0, map: null, mapImg: null, ms: null, fog: null, turnWasMine: false };
const post = a => fetch(`/act?k=${encodeURIComponent(key)}`, { method: "POST", body: JSON.stringify({ ...a, member: S.me }) }).catch(() => {});
const me = () => S.players?.party.find(p => p.id === S.me) || null;

// ---- connection ----
let es = null;
function connect() {
  es?.close();
  es = new EventSource(`/events?k=${encodeURIComponent(key)}&role=player${S.me ? "&member=" + encodeURIComponent(S.me) : ""}`);
  es.onopen = () => $("#dot").classList.add("on");
  es.onerror = () => { $("#dot").classList.remove("on"); es.close(); setTimeout(connect, 2500); };
  es.onmessage = e => { const { t, v } = JSON.parse(e.data); on[t]?.(v); };
}
const on = {
  players(v) {
    S.players = v; $("#camp").textContent = v.campaign;
    if (v.look && v.look !== "lantern") document.documentElement.dataset.look = v.look; else delete document.documentElement.dataset.look;
    const mine = !!(v.turn && me() && v.turn.list.find(x => x.current)?.name === me().name);
    if (mine && !S.turnWasMine) navigator.vibrate?.([120, 60, 120]);
    S.turnWasMine = mine; render();
  },
  show(h) { S.show = h; if (S.tab !== "table") flashTab("table"); render(); },
  hide() { S.show = null; render(); },
  inbox(list) { S.inbox = list || []; if (list?.[0] && list[0].t > S.seen) navigator.vibrate?.(200); render(); },
  result(r) { showResult(r); },
  async overlay(o) {
    if (o.kind === "map") {
      if (!o.show) { S.map = null; render(); return; }
      if (!S.map || S.map.id !== o.id || S.map.src !== o.src) S.mapImg = await loadImg(o.src);
      S.map = o; render(); return;
    }
    if (o.kind === "mapstate") {
      if (!S.map || o.id !== S.map.id) return;
      S.ms = { ...o, tokens: await Promise.all((o.tokens || []).map(async t => ({ ...t, _img: t.img ? await loadImg(t.img) : null }))) };
      if (o.fog) S.fog = await loadFresh(o.fog);
      drawMapNow(); return;
    }
  },
};
function flashTab(t) { const b = $(`nav [data-tab=${t}]`); b?.animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], 500); }

// ---- result popup ----
let rt = 0;
function showResult(r) {
  const el = $("#result"); clearTimeout(rt);
  el.className = "result on" + (r.crit ? " crit" : r.fumble ? " fumble" : "");
  el.innerHTML = r.error ? `<span>${esc(r.error)}</span>` : `<span>${esc(r.label || r.expr)}</span><b>${esc(r.total)}</b>${r.note ? `<span>${esc(r.note)}</span>` : ""}<small>${esc(r.breakdown)}</small>`;
  navigator.vibrate?.(r.crit ? [80, 40, 80, 40, 200] : 60);
  rt = setTimeout(() => el.className = "result", r.error ? 2500 : 4500);
}
let pending = 0;
function rolled(label) { showResult({ label, total: "…", note: "Rolling on the table", breakdown: "" }); clearTimeout(pending); }

// ---- views ----
function render() {
  const main = $("#main"), P = S.players;
  if (!P) { main.innerHTML = `<div class="empty-p">Connecting to the table…</div>`; return; }
  if (!me()) {
    $("#nav").hidden = true; $("#who").hidden = true;
    main.innerHTML = `<div class="card"><h2>Who are you?</h2><div class="eyebrow" style="margin-bottom:12px">Pick your character</div>
      <div class="pick">${P.party.map(p => `<button data-me="${p.id}" style="--mc:${esc(p.color)}"><i style="${p.portrait ? `background-image:url(${esc(p.portrait)})` : ""}">${p.portrait ? "" : esc(p.name[0])}</i>${esc(p.name)}<small>${esc(p.player || p.role)}</small></button>`).join("") || `<div class="empty-p">Your GM hasn't added the party yet.</div>`}</div></div>`;
    $$("[data-me]", main).forEach(b => b.onclick = () => { S.me = b.dataset.me; store.set("me", S.me); connect(); render(); });
    return;
  }
  const m = me();
  $("#nav").hidden = false;
  const w = $("#who"); w.hidden = false; w.style.setProperty("--mc", m.color);
  w.innerHTML = `<i style="${m.portrait ? `background-image:url(${esc(m.portrait)})` : ""}"></i><span>${esc(m.name)}</span>`;
  w.onclick = () => { if (confirm("Switch character?")) { S.me = null; store.set("me", null); connect(); render(); } };
  const unread = S.inbox.filter(x => x.t > S.seen).length, badge = $("#badge"); badge.hidden = !unread; badge.textContent = unread;
  $$("nav [data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
  if (S.tab === "table") main.innerHTML = tableView(P, m);
  if (S.tab === "me") main.innerHTML = meView(P, m);
  if (S.tab === "inbox") { main.innerHTML = inboxView(); S.seen = Math.max(S.seen, ...S.inbox.map(x => x.t), 0); store.set("seen", S.seen); badge.hidden = true; }
  bind(main, P, m);
  if (S.tab === "table") drawMapNow();
}
function tableView(P, m) {
  const out = [];
  if (P.turn) {
    const cur = P.turn.list.find(x => x.current);
    if (cur && cur.name === m.name) out.push(`<div class="yourturn">It's your turn!</div>`);
    out.push(`<div class="card"><div class="eyebrow" style="margin-bottom:8px">Round ${P.turn.round}</div><div class="turns">${P.turn.list.map(x => `<span class="${x.current ? "cur" : ""}" style="--mc:${esc(x.color)}">${esc(x.name)}</span>`).join("")}</div></div>`);
  }
  if (P.poll) {
    const tot = P.poll.opts.reduce((s, o) => s + o.n, 0) || 1, mine = P.poll.mine?.[m.id];
    out.push(`<div class="card vote"><div class="eyebrow">${P.poll.open ? "The party decides" : "The party decided"}</div><h2 style="margin-top:6px">${esc(P.poll.q)}</h2>
      ${P.poll.opts.map((o, i) => `<button data-vote="${i}" class="${mine === i ? "mine" : ""}" ${P.poll.open ? "" : "disabled"}><i style="width:${o.n / tot * 100}%"></i><span>${esc(o.text)}</span><b>${o.n}</b></button>`).join("")}</div>`);
  }
  if (S.show) {
    const h = S.show;
    out.push(`<div class="card ho"><div class="eyebrow" style="margin-bottom:8px">Handout</div>${h.title ? `<h2>${esc(h.title)}</h2>` : ""}${h.type === "image" ? `<img src="${esc(h.src)}" alt="">` : `<div class="body">${esc(h.text)}</div>`}</div>`);
  }
  if (S.map) out.push(`<div class="card"><div class="eyebrow" style="margin-bottom:8px">Map</div><canvas class="map" id="map"></canvas></div>`);
  if (P.stash) out.push(`<div class="card"><div class="eyebrow">Party stash</div><div class="money">${esc(P.stash.money)}</div>${P.stash.items.length ? `<div class="txt" style="margin-top:6px">${P.stash.items.map(esc).join("<br>")}</div>` : ""}</div>`);
  if (!out.length) out.push(`<div class="empty-p">Nothing on the table right now.<br>Handouts, the map, turn order and votes show up here.</div>`);
  return out.join("");
}
function meView(P, m) {
  return `<div class="card" style="--mc:${esc(m.color)}"><div class="me-h"><i style="${m.portrait ? `background-image:url(${esc(m.portrait)})` : ""}">${m.portrait ? "" : esc(m.name[0])}</i><div><b>${esc(m.name)}</b><span>${esc(m.role)}</span></div></div>
    ${m.res.map(r => { const cur = Number(r.cur), max = Number(r.max), pct = max ? Math.max(0, Math.min(100, cur / max * 100)) : 0;
      return `<div class="res"><div class="rh"><span>${esc(r.name)}</span><span>${esc(r.cur === "" ? "?" : r.cur)} / ${esc(r.max === "" ? "?" : r.max)}</span></div><div class="bar"><i style="width:${pct}%"></i></div>${P.hpEdit ? `<div class="rb">${[-5, -1, 1, 5].map(d => `<button data-hp="${esc(r.name)}" data-d="${d}">${d > 0 ? "+" : "−"}${Math.abs(d)}</button>`).join("")}</div>` : ""}</div>`; }).join("")}
    ${m.conds.length ? `<div class="conds" style="margin-top:12px">${m.conds.map(c => `<span>${esc(c)}</span>`).join("")}</div>` : ""}</div>
    <div class="card"><div class="eyebrow" style="margin-bottom:10px">Tap a stat to roll it on the table</div>
      <div class="stats">${m.stats.map(s => `<button data-stat="${esc(s.name)}"><small>${esc(s.name)}</small><b>${esc(s.value === "" ? "—" : s.value)}</b></button>`).join("")}</div>
      <div class="rollrow"><input id="expr" placeholder="2d6+1" inputmode="text" autocomplete="off" spellcheck="false"><button class="btn primary big" id="rollGo">Roll</button></div></div>
    ${m.text.map(t => `<div class="card"><div class="eyebrow" style="margin-bottom:6px">${esc(t.name)}</div><div class="txt">${esc(t.body)}</div></div>`).join("")}`;
}
function inboxView() {
  if (!S.inbox.length) return `<div class="empty-p">No secrets yet.<br>When the GM whispers to you, it lands here, and only you see it.</div>`;
  return S.inbox.map(x => `<div class="card msg"><span class="when">${new Date(x.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>${x.title ? `<h2>${esc(x.title)}</h2>` : `<div class="eyebrow" style="margin-bottom:6px">From the GM</div>`}${x.src ? `<img src="${esc(x.src)}" style="width:100%;border-radius:10px;margin-bottom:8px">` : ""}<div class="txt">${esc(x.text)}</div></div>`).join("");
}
function bind(main, P, m) {
  $$("[data-vote]", main).forEach(b => b.onclick = () => { post({ type: "vote", pollId: P.poll.id, idx: +b.dataset.vote }); navigator.vibrate?.(30); });
  $$("[data-stat]", main).forEach(b => b.onclick = () => { post({ type: "check", stat: b.dataset.stat }); rolled(b.dataset.stat); });
  $$("[data-hp]", main).forEach(b => b.onclick = () => { post({ type: "hp", res: b.dataset.hp, delta: +b.dataset.d }); navigator.vibrate?.(20); });
  const go = () => { const v = $("#expr", main).value.trim(); if (!v) return; post({ type: "roll", expr: v }); rolled(v); };
  $("#rollGo", main)?.addEventListener("click", go);
  $("#expr", main)?.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
}
const fogTex = makeFogTexture();
function drawMapNow() {
  const c = $("#map"); if (!c || !S.map || !S.mapImg) return;
  const dpr = devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  c.width = W * dpr; c.height = H * dpr; const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const map = { id: S.map.id, w: S.map.w, h: S.map.h, grid: S.map.grid, fogOn: S.map.fogOn, tokens: S.ms?.tokens || [], areas: S.ms?.areas || [] };
  drawMap(g, W, H, { map, img: S.mapImg, fog: S.fog, view: fitView(map, W, H, 6), gm: false, current: S.ms?.current, fogTex });
}
$$("nav [data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; render(); $("#main").scrollTop = 0; });
addEventListener("resize", drawMapNow);
render(); connect();
