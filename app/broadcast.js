// Broadcast: full-screen stream scenes (starting soon, break, chapter title, recap, end) and NPC name cards.
import { $, $$, esc, h, icon, toast, uid, ls } from "./util.js";
import { C, save } from "./store.js";
import { Stage } from "./bridge.js";
import { nextPlanned } from "./bestiary.js";
import { renderPollControls, onPoll } from "./poll.js";

const SCENES = {
  soon: { label: "Starting soon", icon: "rest", desc: "Countdown while people join" },
  title: { label: "Chapter title", icon: "book", desc: "Big reveal of tonight's chapter" },
  recap: { label: "Previously on…", icon: "chronicle", desc: "Recap text while you read it out" },
  brb: { label: "Break", icon: "sound", desc: "Back in a few minutes" },
  end: { label: "That's the session", icon: "star", desc: "Thanks + next session date" },
};
export function createBroadcast(el, App) {
  const st = () => (C().ui.cast ||= { soonMin: 10, brbMin: 10, next: "", custom: "" });
  el.innerHTML = `<div class="cast"><header class="pt-head"><div><div class="eyebrow">Stream</div><h2>Broadcast</h2></div><div style="flex:1"></div><span class="eyebrow" id="bcState">Showing the table</span><button class="btn" id="bcObs" title="Browser sources for OBS, and the phone link">OBS &amp; phones</button><button class="btn" id="bcClear">${icon("x")} Back to the table</button></header><div class="cast-grid" id="bcGrid"></div></div>`;
  let onAirScene = null;

  function sceneData(type) {
    const c = C(), S = st(), s = c.sessions.find(x => x.status === "live") || nextPlanned(c, false) || [...c.sessions].sort((a, b) => b.num - a.num)[0];
    const prev = c.sessions.filter(x => (!x.status || x.status === "played") && x !== s).sort((a, b) => b.num - a.num)[0];
    const base = { kind: "scene", show: true, type, campaign: c.name, tagline: c.tagline || "" };
    if (type === "soon") return { ...base, title: c.name, sub: s ? `Session ${s.num}${s.title ? ": " + s.title : ""}` : "", endsAt: Date.now() + S.soonMin * 60000 };
    if (type === "brb") return { ...base, title: "Short break", sub: "Grab a drink. Back soon.", endsAt: Date.now() + S.brbMin * 60000 };
    if (type === "title") return { ...base, title: s?.title || c.name, sub: s ? `Chapter ${s.num}` : "", };
    if (type === "recap") return { ...base, title: "Previously on…", text: (s?.recap || prev?.cliff || "").replace(/\[\[([^\]]+)\]\]/g, "$1") };
    if (type === "end") return { ...base, title: "Thanks for playing", sub: S.next ? `Next session: ${S.next}` : "See you next time", };
  }
  function show(type) { const d = sceneData(type); onAirScene = type; Stage.overlay(d); if (!App.streamLive) Stage.open(); render(); toast(`${SCENES[type].label} is on stream`); }
  function render() {
    const S = st(), c = C();
    $("#bcState", el).textContent = onAirScene ? `On stream: ${SCENES[onAirScene].label}` : "Showing the table";
    $("#bcGrid", el).innerHTML = `
      <section class="cast-col"><div class="sec-h"><h3>Scenes</h3><div class="line"></div></div>
        <div class="scene-grid">${Object.entries(SCENES).map(([k, v]) => `<button class="scene ${onAirScene === k ? "on" : ""}" data-scene="${k}">${icon(v.icon)}<b>${v.label}</b><span>${v.desc}</span></button>`).join("")}</div>
        <div class="row" style="margin-top:14px;gap:12px">
          <label class="f" style="width:150px"><span>Starting soon (min)</span><input type="number" id="bcSoon" value="${S.soonMin}" min="1"></label>
          <label class="f" style="width:130px"><span>Break (min)</span><input type="number" id="bcBrb" value="${S.brbMin}" min="1"></label>
          <label class="f" style="flex:1;min-width:180px"><span>Next session (end card)</span><input type="text" id="bcNext" value="${esc(S.next)}" placeholder="Friday 21:00"></label>
        </div>
        <p class="md-help">Scenes cover the whole stream window. Your sounds keep playing, so start an ambience loop under "Starting soon".</p>
        <div class="sec-h" style="margin-top:22px"><h3>Countdown on stream</h3><div class="line"></div></div>
        <div class="lt-form" style="grid-template-columns:1fr 90px auto auto"><input type="text" id="tmL" placeholder="The ritual completes" value="${esc(S.timerLabel || "")}"><input type="number" id="tmM" min="0.25" step="0.25" value="${S.timerMin || 3}" title="Minutes"><button class="btn primary" id="tmGo">${icon("clock")} Start</button><button class="btn" id="tmX">Stop</button></div>
        <p class="md-help">A ticking clock at the top of the stream window. It flashes when time runs out.</p>
        <div class="sec-h" style="margin-top:22px"><h3>Party vote</h3><div class="line"></div></div>
        <div id="bcPoll"></div>
        <p class="md-help">With the dice bot online, players vote with buttons in Discord; at the table, tap + for each hand. Results show on stream as they come in.</p>
        <div class="sec-h" style="margin-top:22px"><h3>Atmosphere</h3><div class="line"></div></div>
        <div id="bcFx"></div>
        <p class="md-help">Weather and mood over the table and map. Storm flashes also fire whenever you play Thunder or Explosion.</p>
      </section>
      <section class="cast-col"><div class="sec-h"><h3>Name cards</h3><div class="line"></div></div>
        <p class="md-help" style="margin-top:0">Introduce someone the way TV does: a caption slides in for a few seconds.</p>
        <div class="lt-form"><input type="text" id="ltName" placeholder="Magistrate Corwin Hale"><input type="text" id="ltSub" placeholder="Collaborator, ruler of Millford"><button class="btn primary" id="ltGo">${icon("stream")} Show</button></div>
        <div class="eyebrow" style="margin:14px 0 8px">From your world</div>
        <div class="lt-list">${[...c.party.map(m => ({ name: m.character || m.player, sub: [m.role, m.player && `played by ${m.player}`].filter(Boolean).join(" · "), color: m.color, portrait: m.portrait })),
          ...c.notes.filter(n => ["NPCs", "Locations", "Factions"].includes(n.cat)).map(n => ({ name: n.title, sub: n.tags || n.cat, color: n.cat === "NPCs" ? "#f39da8" : n.cat === "Locations" ? "#b8d8a8" : "#a8d3e4", portrait: n.img })),
          ...c.bestiary.map(x => ({ name: x.name, sub: x.kind, color: "#ff6b6b", portrait: x.img }))].map((x, i) => `<button class="lt-item" data-i="${i}" style="--mc:${esc(x.color)}"><b>${esc(x.name)}</b><span>${esc(x.sub || "")}</span></button>`).join("")}</div>
      </section>`;
    const items = [...c.party.map(m => ({ name: m.character || m.player, sub: [m.role, m.player && `played by ${m.player}`].filter(Boolean).join(" · "), color: m.color, portrait: m.portrait })),
      ...c.notes.filter(n => ["NPCs", "Locations", "Factions"].includes(n.cat)).map(n => ({ name: n.title, sub: n.tags || n.cat, color: n.cat === "NPCs" ? "#f39da8" : n.cat === "Locations" ? "#b8d8a8" : "#a8d3e4", portrait: n.img })),
      ...c.bestiary.map(x => ({ name: x.name, sub: x.kind, color: "#ff6b6b", portrait: x.img }))];
    App.fx.controls($("#bcFx", el));
    renderPollControls($("#bcPoll", el));
    $("#tmGo", el).onclick = () => { S.timerLabel = $("#tmL", el).value.trim(); S.timerMin = Math.max(.25, +$("#tmM", el).value || 3); save(); Stage.overlay({ kind: "timer", show: true, label: S.timerLabel, endsAt: Date.now() + S.timerMin * 60000 }); if (!App.streamLive) Stage.open(); toast("Countdown started"); };
    $("#tmX", el).onclick = () => Stage.overlay({ kind: "timer", show: false });
    $$("[data-scene]", el).forEach(b => b.onclick = () => onAirScene === b.dataset.scene ? clear() : show(b.dataset.scene));
    $("#bcSoon", el).onchange = e => { S.soonMin = Math.max(1, +e.target.value || 10); save(); };
    $("#bcBrb", el).onchange = e => { S.brbMin = Math.max(1, +e.target.value || 10); save(); };
    $("#bcNext", el).oninput = e => { S.next = e.target.value; save(); };
    $("#ltGo", el).onclick = () => { const n = $("#ltName", el).value.trim(); if (!n) return toast("Type a name"); lower({ name: n, sub: $("#ltSub", el).value.trim() }); };
    $$(".lt-item", el).forEach(b => b.onclick = () => lower(items[+b.dataset.i]));
  }
  const lower = x => App.lowerThird(x);
  function clear() { onAirScene = null; Stage.overlay({ kind: "scene", show: false }); render(); }
  $("#bcClear", el).onclick = clear;
  $("#bcObs", el).onclick = () => import("./players.js").then(x => x.tableModal());
  onPoll(() => { const h = $("#bcPoll", el); if (h && !h.contains(document.activeElement)) renderPollControls(h); });
  render();
  return { show() { render(); }, refresh() { render(); } };
}
