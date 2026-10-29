// Tonight: one screen for game night. Turn order, the scene you're in, party health, quick rolls and the clock.
// Focus mode hides the sidebar so it fits a laptop beside a TV or a second monitor.
import { $, $$, esc, icon, toast, uid, ls } from "./util.js";
import { C, save } from "./store.js";
import { combat, advanceTurn, applyDamage, combatChanged, addCreature } from "./combat.js";
import { dropZone } from "./dnd.js";
import { res, pushParty } from "./party.js";
import { nextPlanned } from "./bestiary.js";
import { startSession } from "./prep.js";
import { Stage } from "./bridge.js";
import { t } from "./i18n.js";

const clock = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };

export function createTonight(el, App) {
  el.innerHTML = `<div class="tonight"><header class="tn-head" id="tnHead"></header><div class="tn-grid"><section class="tn-col" id="tnTurns"></section><section class="tn-col" id="tnScene"></section><section class="tn-col" id="tnParty"></section></div></div>`;
  let tick = null;
  dropZone($("#tnTurns", el), { accept: p => p.kind === "creature", label: p => `Add ${p.name} to the fight`, drop: p => { const x = C().bestiary.find(y => y.id === p.id); if (x) { addCreature(x); combatChanged(); turns(); toast(`${x.name} joins the fight`); } } });
  const session = () => { const c = C(); return c.sessions.find(s => s.status === "live") || nextPlanned(c, false); };

  function head() {
    const s = session(), box = $("#tnHead", el), live = s?.status === "live", focus = document.body.classList.contains("tn-focus");
    box.innerHTML = `<div class="lv-dot ${live ? "" : "off"}"></div><div style="min-width:0"><div class="eyebrow">${live ? `Live · Session ${esc(s.num)}` : s ? `Next up · Session ${esc(s.num)}` : "Tonight"}</div><h2>${esc(s?.title || (s ? "Untitled session" : "No session planned"))}</h2></div>
      <div style="flex:1"></div>
      ${live ? `<div class="tn-clock" title="Time since the session started"><span class="eyebrow">Played</span><b class="mono" id="tnClock">${clock(Date.now() - (s.plan?.startedAt || Date.now()))}</b></div>` : ""}
      <button class="btn" id="tnBreak" title="Put the break screen on stream">${icon("clock")} Break</button>
      ${live ? "" : s ? `<button class="btn primary" id="tnStart">Start session ${esc(s.num)}</button>` : `<button class="btn" id="tnPrep">${icon("book")} Plan one</button>`}
      <button class="btn icon" id="tnFocus" title="${focus ? "Show the sidebar (Esc)" : "Focus: hide the sidebar"}">${icon("fit")}</button>`;
    $("#tnStart", box)?.addEventListener("click", () => { startSession(App, s); App.go("tonight"); });
    $("#tnPrep", box)?.addEventListener("click", () => App.go("prep"));
    $("#tnFocus", box).onclick = () => { document.body.classList.toggle("tn-focus"); head(); };
    $("#tnBreak", box).onclick = () => {
      const c = C(), min = ls.get("tn.break", 10);
      Stage.overlay({ kind: "scene", show: true, type: "brb", campaign: c.name, tagline: c.tagline || "", title: t("Short break"), sub: t("Grab a drink. Back soon."), endsAt: Date.now() + min * 60000 });
      if (!App.streamLive) Stage.open();
      toast(`Break on stream for ${min} min`, { action: "Back now", run: () => Stage.overlay({ kind: "scene", show: false }) });
    };
    clearInterval(tick);
    if (live) tick = setInterval(() => { const n = $("#tnClock", el); if (n) n.textContent = clock(Date.now() - (s.plan?.startedAt || Date.now())); }, 15000);
  }

  function turns() {
    const b = combat(), box = $("#tnTurns", el), cur = b.list[b.turn];
    if (!b.list.length || !b.active) {
      box.innerHTML = `<div class="sec-h"><h3>Turn order</h3><div class="line"></div></div>
        <div class="empty sm"><h3>No fight right now</h3><p>${b.list.length ? `${b.list.length} ready in Combat.` : "Add the party and tonight's foes in Combat."}</p><button class="btn primary" id="tnCb">${icon("combat")} ${b.list.length ? "Start it in Combat" : "Set up a fight"}</button></div>`;
      $("#tnCb", box).onclick = () => App.go("combat");
      return;
    }
    box.innerHTML = `<div class="sec-h"><h3>Round ${b.round}</h3><div class="line"></div><button class="btn sm" id="tnOpenCb" title="Full combat tracker">${icon("combat")}</button></div>
      <button class="btn primary tn-next" id="tnNext">Next turn <span class="mono">SPACE</span></button>
      <ol class="tn-turns">${b.list.map(x => {
        const max = Number(x.max) || 0, hp = Number(x.hp) || 0, pct = max ? Math.max(0, Math.min(100, hp / max * 100)) : 0;
        return `<li class="${x === cur ? "cur" : ""} ${max && hp <= 0 ? "down" : ""}" data-id="${x.id}" style="--kc:${x.color || (x.kind === "foe" ? "#f39da8" : x.kind === "ally" ? "#b8d8a8" : "#a8d3e4")}">
          <span class="mono ti">${esc(x.init ?? "")}</span><div class="tw"><b>${esc(x.name)}</b>${max ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}${(x.conds || []).length ? `<small>${x.conds.map(k => esc(k.name)).join(" · ")}</small>` : ""}</div>
          <span class="mono th">${max ? `${hp}<small>/${max}</small>` : ""}</span><input class="mono" data-dmg placeholder="dmg" title="Damage like 7, healing like +5"></li>`;
      }).join("")}</ol>`;
    $("#tnNext", box).onclick = () => { advanceTurn(1); turns(); party(); };
    $("#tnOpenCb", box).onclick = () => App.go("combat");
    $$("[data-dmg]", box).forEach(inp => inp.onkeydown = e => {
      if (e.key !== "Enter") return;
      const x = b.list.find(y => y.id === inp.closest("li").dataset.id);
      if (applyDamage(x, inp.value)) { combatChanged(); turns(); party(); $(`.tn-turns li[data-id="${x.id}"] [data-dmg]`, el)?.focus(); }
    });
    $(".tn-turns li.cur", box)?.scrollIntoView({ block: "nearest" });
  }

  function scene() {
    const s = session(), box = $("#tnScene", el), P = s?.plan;
    if (!s) { box.innerHTML = `<div class="sec-h"><h3>Scenes</h3><div class="line"></div></div><div class="empty sm"><h3>Nothing planned</h3><p>Plan a strong start, scenes and secrets in Prep.</p><button class="btn" id="tnGoPrep">${icon("book")} Open Prep</button></div>`; $("#tnGoPrep", box).onclick = () => App.go("prep"); return; }
    const scenes = P.scenes || [], next = scenes.find(x => !x.done);
    const list = (arr, kind) => arr.map(x => `<label class="tn-chk ${x.done ? "done" : ""} ${kind === "scene" && x === next ? "now" : ""}"><input type="checkbox" data-${kind}="${x.id}" ${x.done ? "checked" : ""}><span>${esc(x.text)}</span></label>`).join("");
    box.innerHTML = `<div class="sec-h"><h3>Scenes</h3><div class="line"></div></div>
      ${P.start ? `<div class="tn-start"><span class="eyebrow">Strong start</span><p>${esc(P.start)}</p></div>` : ""}
      <div class="tn-list">${list(scenes, "scene") || `<p class="md-help">No scenes planned.</p>`}</div>
      <div class="sec-h"><h3>Secrets & clues</h3><div class="line"></div><span class="eyebrow">${(P.secrets || []).filter(x => x.done).length}/${(P.secrets || []).length} revealed</span></div>
      <div class="tn-list">${list(P.secrets || [], "secret") || `<p class="md-help">No secrets yet.</p>`}</div>
      <div class="tn-log"><input type="text" id="tnLog" placeholder="${s.status === "live" ? "Log what just happened, then Enter" : "Start the session to log what happens"}" ${s.status === "live" ? "" : "disabled"}></div>`;
    $$("[data-scene]", box).forEach(c => c.onchange = () => { scenes.find(x => x.id === c.dataset.scene).done = c.checked; save(); scene(); });
    $$("[data-secret]", box).forEach(c => c.onchange = () => { const x = P.secrets.find(y => y.id === c.dataset.secret); x.done = c.checked; save(); if (c.checked && s.status === "live") App.logBeat?.("discovery", `Revealed: ${x.text}`, true); scene(); });
    $("#tnLog", box).onkeydown = e => { if (e.key === "Enter" && e.target.value.trim()) { App.logBeat("social", e.target.value.trim()); e.target.value = ""; } };
  }

  function party() {
    const c = C(), box = $("#tnParty", el), presets = c.presets || [];
    box.innerHTML = `<div class="sec-h"><h3>Party</h3><div class="line"></div></div>
      <div class="tn-party">${c.party.map(m => {
        const hp = res(m, "HP"), cur = Number(hp.cur), max = Number(hp.max), pct = max ? Math.max(0, Math.min(100, cur / max * 100)) : 0;
        return `<div class="tn-pc" data-m="${m.id}" style="--mc:${esc(m.color)}"><div class="tw"><b>${esc(m.character || m.player || "Unnamed")}</b>${max ? `<div class="bar"><i style="width:${pct}%"></i></div>` : `<small>No HP on the sheet</small>`}</div>
          <span class="mono th">${max ? `${cur}<small>/${max}</small>` : ""}</span><div class="tn-pm"><button data-d="-1" title="−1 HP">−</button><button data-d="1" title="+1 HP">+</button></div></div>`;
      }).join("") || `<p class="md-help">No characters yet. <a href="#" id="tnAddPc">Add the party</a>.</p>`}</div>
      <div class="sec-h"><h3>Quick rolls</h3><div class="line"></div></div>
      <div class="tn-rolls">${presets.slice(0, 10).map(p => `<button class="rollchip sm" data-roll="${esc(p.expr)}" title="${esc(p.name)}">${esc(p.name)} <span>${esc(p.expr)}</span></button>`).join("")}</div>
      <div class="row" style="gap:6px"><input type="text" class="mono" id="tnExpr" placeholder="Any roll: 2d6+3, 4dF, 1d100<=45" style="flex:1"><button class="btn" id="tnRoll">${icon("dice")} Roll</button></div>`;
    $("#tnAddPc", box)?.addEventListener("click", e => { e.preventDefault(); App.go("party"); });
    $$(".tn-pc [data-d]", box).forEach(btn => btn.onclick = () => {
      const m = c.party.find(p => p.id === btn.closest(".tn-pc").dataset.m), hp = res(m, "HP");
      hp.cur = (Number(hp.cur) || 0) + Number(btn.dataset.d);
      const x = combat().list.find(y => y.kind === "pc" && y.ref === m.id); if (x) x.hp = hp.cur;
      save(); pushParty(); if (x) combatChanged(); party(); if (x) turns();
    });
    $$("[data-roll]", box).forEach(b => b.onclick = () => App.roll(b.dataset.roll, b.title));
    const roll = () => { const v = $("#tnExpr", box).value.trim(); if (v) App.roll(v, ""); };
    $("#tnRoll", box).onclick = roll; $("#tnExpr", box).onkeydown = e => { if (e.key === "Enter") roll(); };
  }

  const onKey = e => {
    if (el.offsetParent === null || e.target.closest("input, textarea, select, [contenteditable=true]") || document.querySelector(".modal-back")) return;
    if (e.key === " " && combat().active) { e.preventDefault(); advanceTurn(1); turns(); party(); }
    if (e.key === "Escape" && document.body.classList.contains("tn-focus")) { document.body.classList.remove("tn-focus"); head(); }
  };
  addEventListener("keydown", onKey);
  const onCombat = () => { if (el.offsetParent !== null && !el.contains(document.activeElement)) { turns(); party(); } };
  addEventListener("codex:combat", onCombat);
  const render = () => { head(); turns(); scene(); party(); };
  render();
  return { show: render, refresh: render, destroy() { clearInterval(tick); removeEventListener("keydown", onKey); removeEventListener("codex:combat", onCombat); document.body.classList.remove("tn-focus"); } };
}
