// The player's phone: opened from the GM's table link. Read-mostly view of the table,
// plus rolls, votes and HP taps that go back to the GM's app.
import { t, setLang } from "./i18n.js";
import { drawMap, loadImg, loadFresh, fitView, makeFogTexture } from "./maprender.js";

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const key = new URLSearchParams(location.search).get("k");
const store = { get: k => { try { return JSON.parse(localStorage.getItem("codex-player:" + k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem("codex-player:" + k, JSON.stringify(v)); } catch {} } };
const S = { journal: { entries: [], goals: [] }, players: null, me: store.get("me"), tab: "table", show: null, inbox: [], seen: store.get("seen") || 0, map: null, mapImg: null, ms: null, fog: null, turnWasMine: false };
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
    setLang(v.lang); document.documentElement.lang = v.lang || "en";
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
  journal(v) { S.journal = v || { entries: [], goals: [] }; if (S.tab === "journal") render(); },
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
function rolled(label) { showResult({ label, total: "…", note: t("Rolling on the table"), breakdown: "" }); clearTimeout(pending); }

// ---- views ----
// live updates redraw the screen; keep what the player is typing
const drafts = {};
function render() {
  const keep = $$("#main input[id], #main textarea[id]").map(i => (drafts[i.id] = i.value, i)).find(i => i === document.activeElement);
  const sel = keep ? [keep.id, keep.selectionStart, keep.selectionEnd] : null;
  draw();
  for (const [id, v] of Object.entries(drafts)) { const i = document.getElementById(id); if (i && v) i.value = v; }
  if (sel) { const i = document.getElementById(sel[0]); if (i) { i.focus(); try { i.setSelectionRange(sel[1], sel[2]); } catch {} } }
}
function draw() {
  const main = $("#main"), P = S.players;
  if (!P) { main.innerHTML = `<div class="empty-p">${t("Connecting to the table…")}</div>`; return; }
  if (!me()) {
    $("#nav").hidden = true; $("#who").hidden = true;
    main.innerHTML = `<div class="card"><h2>${t("Who are you?")}</h2><div class="eyebrow" style="margin-bottom:12px">${t("Pick your character")}</div>
      <div class="pick">${P.party.map(p => `<button data-me="${p.id}" style="--mc:${esc(p.color)}"><i style="${p.portrait ? `background-image:url(${esc(p.portrait)})` : ""}">${p.portrait ? "" : esc(p.name[0])}</i>${esc(p.name)}<small>${esc(p.player || p.role)}</small></button>`).join("") || `<div class="empty-p">${t("Your GM hasn't added the party yet.")}</div>`}</div></div>`;
    $$("[data-me]", main).forEach(b => b.onclick = () => { S.me = b.dataset.me; store.set("me", S.me); connect(); render(); });
    return;
  }
  const m = me();
  $("#nav").hidden = false;
  const w = $("#who"); w.hidden = false; w.style.setProperty("--mc", m.color);
  w.innerHTML = `<i style="${m.portrait ? `background-image:url(${esc(m.portrait)})` : ""}"></i><span>${esc(m.name)}</span>`;
  w.onclick = () => { if (confirm(t("Switch character?"))) { S.me = null; store.set("me", null); connect(); render(); } };
  const unread = S.inbox.filter(x => x.t > S.seen).length, badge = $("#badge"); badge.hidden = !unread; badge.textContent = unread;
  $$("nav [data-tab]").forEach(b => { b.classList.toggle("on", b.dataset.tab === S.tab); const l = b.querySelector(".nl"); if (l) l.textContent = t(l.dataset.en); });
  if (S.tab === "table") main.innerHTML = tableView(P, m);
  if (S.tab === "me") main.innerHTML = meView(P, m);
  if (S.tab === "journal") main.innerHTML = journalView(m);
  if (S.tab === "inbox") { main.innerHTML = inboxView(); S.seen = Math.max(S.seen, ...S.inbox.map(x => x.t), 0); store.set("seen", S.seen); badge.hidden = true; }
  bind(main, P, m);
  if (S.tab === "table") drawMapNow();
}
function tableView(P, m) {
  const out = [];
  if (P.turn) {
    const cur = P.turn.list.find(x => x.current);
    if (cur && cur.name === m.name) out.push(`<div class="yourturn">${t("It's your turn!")}</div>`);
    out.push(`<div class="card"><div class="eyebrow" style="margin-bottom:8px">${t("Round {n}", { n: P.turn.round })}</div><div class="turns">${P.turn.list.map(x => `<span class="${x.current ? "cur" : ""}" style="--mc:${esc(x.color)}">${esc(x.name)}</span>`).join("")}</div></div>`);
  }
  if (P.poll) {
    const tot = P.poll.opts.reduce((s, o) => s + o.n, 0) || 1, mine = P.poll.mine?.[m.id];
    out.push(`<div class="card vote"><div class="eyebrow">${t(P.poll.open ? "The party decides" : "The party decided")}</div><h2 style="margin-top:6px">${esc(P.poll.q)}</h2>
      ${P.poll.opts.map((o, i) => `<button data-vote="${i}" class="${mine === i ? "mine" : ""}" ${P.poll.open ? "" : "disabled"}><i style="width:${o.n / tot * 100}%"></i><span>${esc(o.text)}</span><b>${o.n}</b></button>`).join("")}</div>`);
  }
  if (S.show) {
    const h = S.show;
    out.push(`<div class="card ho"><div class="eyebrow" style="margin-bottom:8px">${t("Handout")}</div>${h.title ? `<h2>${esc(h.title)}</h2>` : ""}${h.type === "image" ? `<img src="${esc(h.src)}" alt="">` : `<div class="body">${esc(h.text)}</div>`}</div>`);
  }
  if (S.map) out.push(`<div class="card"><div class="eyebrow" style="margin-bottom:8px">${t("Map")}</div><canvas class="map" id="map"></canvas></div>`);
  if (P.stash) out.push(`<div class="card"><div class="eyebrow">${t("Party stash")}</div><div class="money">${esc(P.stash.money)}</div>${P.stash.items.length ? `<div class="txt" style="margin-top:6px">${P.stash.items.map(esc).join("<br>")}</div>` : ""}</div>`);
  if (!out.length) out.push(`<div class="empty-p">${t("Nothing on the table right now.")}<br>${t("Handouts, the map, turn order and votes show up here.")}</div>`);
  return out.join("");
}
function meView(P, m) {
  return `<div class="card" style="--mc:${esc(m.color)}"><div class="me-h"><i style="${m.portrait ? `background-image:url(${esc(m.portrait)})` : ""}">${m.portrait ? "" : esc(m.name[0])}</i><div><b>${esc(m.name)}</b><span>${esc(m.role)}</span></div></div>
    ${m.res.map(r => { const cur = Number(r.cur), max = Number(r.max), pct = max ? Math.max(0, Math.min(100, cur / max * 100)) : 0;
      return `<div class="res"><div class="rh"><span>${esc(r.name)}</span><span>${esc(r.cur === "" ? "?" : r.cur)} / ${esc(r.max === "" ? "?" : r.max)}</span></div><div class="bar"><i style="width:${pct}%"></i></div>${P.hpEdit ? `<div class="rb">${[-5, -1, 1, 5].map(d => `<button data-hp="${esc(r.name)}" data-d="${d}">${d > 0 ? "+" : "−"}${Math.abs(d)}</button>`).join("")}</div>` : ""}</div>`; }).join("")}
    ${m.conds.length ? `<div class="conds" style="margin-top:12px">${m.conds.map(c => `<span>${esc(c)}</span>`).join("")}</div>` : ""}</div>
    <div class="card"><div class="eyebrow" style="margin-bottom:10px">${t("Tap a stat to roll it on the table")}</div>
      <div class="stats">${m.stats.map(s => `<button data-stat="${esc(s.name)}"><small>${esc(s.name)}</small><b>${esc(s.value === "" ? "—" : s.value)}</b></button>`).join("")}</div>
      <div class="rollrow"><input id="expr" placeholder="2d6+1" inputmode="text" autocomplete="off" spellcheck="false"><button class="btn primary big" id="rollGo">${t("Roll")}</button></div></div>
    ${m.text.map(x => `<div class="card"><div class="eyebrow" style="margin-bottom:6px">${esc(x.name)}</div><div class="txt">${esc(x.body)}</div></div>`).join("")}`;
}
function journalView(m) {
  const J = S.journal;
  return `<div class="card"><div class="eyebrow" style="margin-bottom:4px">${t("Only you and the GM see this")}</div><h2>${t("Goals")}</h2>
      <ul class="goals">${J.goals.map(g => `<li class="${g.done ? "done" : ""}" data-g="${esc(g.id)}"><button class="ck" data-gt>${g.done ? "✓" : ""}</button><span>${esc(g.text)}</span><button class="x" data-gd aria-label="Remove">×</button></li>`).join("") || `<li style="background:none;color:var(--faint);padding:0">${t("What does {name} want?", { name: esc(m.name) })}</li>`}</ul>
      <div class="rollrow"><input id="jGoal" placeholder="${t("Add a goal")}" maxlength="300" style="font:16px var(--body)"><button class="btn big" id="jGoalAdd">${t("Add")}</button></div></div>
    <div class="card"><h2>${t("Journal")}</h2><textarea class="jt" id="jText" placeholder="${t("What happened tonight, what you suspect, who you owe…")}" maxlength="4000"></textarea>
      <div class="rollrow" style="justify-content:flex-end"><button class="btn primary big" id="jAdd">${t("Write it down")}</button></div></div>
    ${J.entries.map(e => `<div class="card entry" style="--mc:${esc(m.color)}"><div class="when"><span>${new Date(e.t).toLocaleString(document.documentElement.lang === "tr" ? "tr-TR" : [], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><button class="x" data-je="${esc(e.id)}" aria-label="Delete">×</button></div><div class="txt">${esc(e.text)}</div></div>`).join("")}`;
}
function inboxView() {
  if (!S.inbox.length) return `<div class="empty-p">${t("No secrets yet.")}<br>${t("When the GM whispers to you, it lands here, and only you see it.")}</div>`;
  return S.inbox.map(x => `<div class="card msg"><span class="when">${new Date(x.t).toLocaleTimeString(document.documentElement.lang === "tr" ? "tr-TR" : [], { hour: "2-digit", minute: "2-digit" })}</span>${x.title ? `<h2>${esc(x.title)}</h2>` : `<div class="eyebrow" style="margin-bottom:6px">${t("From the GM")}</div>`}${x.src ? `<img src="${esc(x.src)}" style="width:100%;border-radius:10px;margin-bottom:8px">` : ""}<div class="txt">${esc(x.text)}</div></div>`).join("");
}
function bind(main, P, m) {
  const jPost = o => post({ type: "journal", ...o });
  $("#jGoalAdd", main)?.addEventListener("click", () => { const i = $("#jGoal", main); if (i.value.trim()) { jPost({ op: "goal", text: i.value }); i.value = ""; drafts.jGoal = ""; } });
  $("#jGoal", main)?.addEventListener("keydown", e => { if (e.key === "Enter") $("#jGoalAdd", main).click(); });
  $$("[data-g]", main).forEach(li => { $("[data-gt]", li).onclick = () => jPost({ op: "goalToggle", id: li.dataset.g }); $("[data-gd]", li).onclick = () => jPost({ op: "goalDel", id: li.dataset.g }); });
  $("#jAdd", main)?.addEventListener("click", () => { const t = $("#jText", main); if (t.value.trim()) { jPost({ op: "add", text: t.value }); t.value = ""; drafts.jText = ""; navigator.vibrate?.(30); } });
  $$("[data-je]", main).forEach(b => b.onclick = () => { if (confirm(t("Delete this entry?"))) jPost({ op: "del", id: b.dataset.je }); });
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
