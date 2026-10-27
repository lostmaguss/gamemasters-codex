// Combat tracker: initiative, HP, conditions with round timers. The turn order shows on the stream window.
import { $, $$, esc, h, icon, toast, uid, ls, debounce, rnd } from "./util.js";
import { C, save } from "./store.js";
import { Stage } from "./bridge.js";
import { nextPlanned } from "./bestiary.js";
import * as Discord from "./discord.js";

export const CONDITIONS = ["Stunned", "Prone", "Bleeding", "Poisoned", "Blinded", "Frightened", "Grappled", "Burning", "Invisible", "Concentrating", "Hidden", "Slowed", "Hasted", "Marked", "Restrained", "Unconscious"];
const KIND = { pc: { label: "Player", color: "#a8d3e4" }, ally: { label: "Ally", color: "#b8d8a8" }, foe: { label: "Foe", color: "#f39da8" } };

export function combat(c = C()) { return (c.combat ||= { active: false, round: 1, turn: 0, list: [], log: [], showOnStream: true, autoSkip: true }); }
export function sortCombat(cb) { const dir = C().rules?.initHigh === false ? -1 : 1; cb.list.sort((a, b) => dir * ((Number(b.init) || 0) - (Number(a.init) || 0)) || (b.tie || 0) - (a.tie || 0)); }
const hpWord = (hp, max) => !max ? "" : hp <= 0 ? "Down" : hp <= max * .25 ? "Near death" : hp <= max * .5 ? "Bloodied" : hp < max ? "Hurt" : "Unhurt";

// What the players see: no monster numbers, only how hurt things look.
export function streamCombatState(c = C()) {
  const cb = combat(c);
  if (!cb.active || !cb.showOnStream) return { kind: "combat", show: false };
  const cur = cb.list[cb.turn];
  return { kind: "combat", show: true, round: cb.round, list: cb.list.filter(x => !x.hidden).map(x => ({
    id: x.id, name: x.name, kind: x.kind, color: x.color || KIND[x.kind].color, current: x === cur,
    hp: x.kind === "pc" ? x.hp : null, max: x.kind === "pc" ? x.max : null, status: hpWord(Number(x.hp), Number(x.max)),
    conds: (x.conds || []).map(k => k.name + (k.rounds ? ` ${k.rounds}` : "")),
  })) };
}
let pushT;
export function pushCombat() { clearTimeout(pushT); pushT = setTimeout(() => Stage.overlay(streamCombatState()), 60); }

function fromCreature(x, n, hp) {
  const max = parseInt(x.stats?.HP || x.hp) || 0;
  const initMod = parseInt(x.stats?.Initiative || x.stats?.Agility || x.stats?.Speed) || 0;
  return { id: uid(), kind: "foe", name: n ? `${x.name} ${n}` : x.name, ref: x.id, init: "", initMod, hp: hp ?? max, max, def: x.stats?.Defense || "", conds: [], hidden: false };
}

export function createCombat(el, App) {
  const st = { sel: null, secret: ls.get("cb.secret", true) };
  el.innerHTML = `<div class="combat"><header class="cb-head" id="cbHead"></header><div class="cb-grid"><section class="cb-list" id="cbList"></section><aside class="cb-side" id="cbSide"></aside></div></div>`;
  const cb = () => combat();
  const log = msg => { const L = cb().log; L.unshift({ t: Date.now(), r: cb().round, msg }); L.length = Math.min(L.length, 80); };
  const changed = (full = true) => { save(); pushCombat(); if (full) render(); };

  function renderHead() {
    const b = cb(), box = $("#cbHead", el), cur = b.list[b.turn];
    box.innerHTML = b.active
      ? `<div class="cb-round"><span>Round</span><b>${b.round}</b></div>
         <div class="cb-now"><span class="eyebrow">Now acting</span><b>${esc(cur?.name || "—")}</b></div>
         <button class="btn icon" id="cbPrev" title="Previous turn">${icon("up")}</button>
         <button class="btn primary roll-btn" id="cbNext">Next turn <span class="mono" style="font-size:11px;opacity:.6">SPACE</span></button>
         <div style="flex:1"></div>
         <label class="toggle"><input type="checkbox" id="cbStream" ${b.showOnStream ? "checked" : ""}> Turn order on stream</label>
         <label class="toggle"><input type="checkbox" id="cbSkip" ${b.autoSkip ? "checked" : ""}> Skip downed foes</label>
         <button class="btn icon" id="cbPost" title="Post the turn order to Discord">${icon("discord")}</button>
         <button class="btn" id="cbEnd">End combat</button>`
      : `<div><div class="eyebrow">Combat</div><h2>${b.list.length ? "Ready to fight" : "No fight yet"}</h2></div><div style="flex:1"></div>
         <button class="btn" id="cbRollAll">${icon("dice")} Roll initiative for foes</button>
         <button class="btn primary roll-btn" id="cbStart" ${b.list.length ? "" : "disabled"}>Start combat</button>`;
    $("#cbNext", box)?.addEventListener("click", () => next(1));
    $("#cbPrev", box)?.addEventListener("click", () => next(-1));
    $("#cbStream", box)?.addEventListener("change", e => { b.showOnStream = e.target.checked; changed(false); });
    $("#cbSkip", box)?.addEventListener("change", e => { b.autoSkip = e.target.checked; save(); });
    $("#cbPost", box)?.addEventListener("click", () => Discord.postCombat({ ...streamCombatState(), show: true }).then(ok => ok && toast("Turn order posted")));
    $("#cbEnd", box)?.addEventListener("click", () => App.confirm("End combat?", "Foes that are down are cleared from the list. Players and allies stay for the next fight.", "End combat", () => {
      b.active = false; b.list = b.list.filter(x => x.kind !== "foe" || Number(x.hp) > 0); b.list.forEach(x => x.conds = []); b.turn = 0; b.round = 1; log("Combat ended"); changed(); App.logBeat?.("combat", "The fight ends.", true);
    }));
    $("#cbRollAll", box)?.addEventListener("click", rollFoes);
    $("#cbStart", box)?.addEventListener("click", start);
  }
  function rollFoes() {
    const b = cb(); let n = 0;
    b.list.forEach(x => { if (x.kind !== "pc" && (x.init === "" || x.init == null)) { x.init = rnd(20) + 1 + (Number(x.initMod) || 0); x.tie = Math.random(); n++; } });
    sortCombat(b); changed(); toast(n ? `Rolled initiative for ${n}` : "Everyone already has initiative");
  }
  function start() {
    const b = cb();
    b.list.forEach(x => { if (x.kind !== "pc" && (x.init === "" || x.init == null)) { x.init = rnd(20) + 1 + (Number(x.initMod) || 0); x.tie = Math.random(); } });
    const missing = b.list.filter(x => x.init === "" || x.init == null);
    if (missing.length) { toast(`Enter initiative for ${missing.map(x => x.name).join(", ")}`); render(); return; }
    sortCombat(b); b.active = true; b.round = 1; b.turn = 0; log("Combat started"); changed();
    if (Discord.settings().autoRounds && Discord.connected()) Discord.postCombat(streamCombatState(), { quiet: true });
    App.logBeat?.("combat", `Fight: ${b.list.filter(x => x.kind === "foe").map(x => x.name).join(", ")}`, true);
  }
  function next(dir) {
    const b = cb(); if (!b.active || !b.list.length) return;
    if (dir > 0) {
      // conditions on the combatant whose turn is ending tick down
      const ending = b.list[b.turn];
      ending?.conds?.forEach(k => { if (k.rounds) k.rounds--; });
      const expired = ending?.conds?.filter(k => k.rounds === 0) || [];
      if (expired.length) { ending.conds = ending.conds.filter(k => k.rounds !== 0); log(`${ending.name}: ${expired.map(k => k.name).join(", ")} wore off`); toast(`${ending.name}: ${expired.map(k => k.name).join(", ")} wore off`); }
    }
    let guard = b.list.length;
    do {
      b.turn += dir;
      if (b.turn >= b.list.length) { b.turn = 0; b.round++; log(`Round ${b.round}`); b._newRound = true; }
      if (b.turn < 0) { b.turn = b.list.length - 1; b.round = Math.max(1, b.round - 1); }
    } while (b.autoSkip && dir > 0 && --guard > 0 && b.list[b.turn].kind === "foe" && Number(b.list[b.turn].hp) <= 0 && Number(b.list[b.turn].max) > 0);
    st.sel = b.list[b.turn]?.id; changed();
    if (b._newRound) { delete b._newRound; if (Discord.settings().autoRounds && Discord.connected()) Discord.postCombat(streamCombatState(), { quiet: true }); }
    setTimeout(() => $(".cb-row.current", el)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 30);
  }
  function applyHp(x, raw) {
    const s = String(raw).trim(); if (!s) return;
    const old = Number(x.hp) || 0;
    if (/^[+-]\d+$/.test(s)) x.hp = old + Number(s);
    else if (/^\d+$/.test(s)) x.hp = old - Number(s); // a plain number is damage, the common case
    else if (/^=\d+$/.test(s)) x.hp = Number(s.slice(1));
    else return toast("Type damage like 7, healing like +5, or =20 to set HP");
    if (x.max) x.hp = Math.min(x.hp, Number(x.max) * 2);
    const d = x.hp - old;
    log(`${x.name} ${d < 0 ? "takes " + -d : "heals " + d}${x.hp <= 0 ? " and goes down" : ""}`);
    if (x.hp <= 0 && old > 0) toast(`${x.name} is down`);
  }

  function renderList() {
    const b = cb(), box = $("#cbList", el), cur = b.list[b.turn];
    const add = `<div class="cb-add"><button class="btn sm" id="aParty">${icon("social")} Add the party</button><button class="btn sm" id="aEnc">${icon("combat")} Tonight's encounters</button><button class="btn sm" id="aBst">${icon("death")} From bestiary</button><button class="btn sm" id="aCustom">${icon("plus")} Custom</button>${b.list.length ? `<button class="btn sm ghost danger" id="aClear">${icon("trash")} Clear all</button>` : ""}</div>`;
    if (!b.list.length) { box.innerHTML = add + `<div class="empty" style="height:auto;padding-top:60px"><h3>Roll for initiative</h3><p>Add the party and tonight's foes, enter the players' initiative, and press Start. Foes roll their own. Damage and conditions are tracked per round, and the turn order shows on the stream window.</p></div>`; bindAdd(box); return; }
    box.innerHTML = add + `<ol class="cb-rows">${b.list.map((x, i) => {
      const max = Number(x.max) || 0, hp = Number(x.hp) || 0, pct = max ? Math.max(0, Math.min(100, hp / max * 100)) : 0, K = KIND[x.kind];
      return `<li class="cb-row ${x === cur && b.active ? "current" : ""} ${x.id === st.sel ? "sel" : ""} ${max && hp <= 0 ? "down" : ""}" data-id="${x.id}" style="--kc:${x.color || K.color}">
        <input class="cb-init mono" type="number" value="${esc(x.init)}" placeholder="—" title="Initiative" aria-label="Initiative">
        <div class="cb-who"><b>${esc(x.name)}</b><span><i class="kd"></i>${K.label}${x.def ? ` · Def ${esc(x.def)}` : ""}${x.hidden ? ` · <em>hidden from stream</em>` : ""}</span></div>
        <div class="cb-hp">${max ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}<span class="mono">${max ? `${hp}<small>/${max}</small>` : `<small>no HP</small>`}</span><input type="text" class="cb-dmg mono" placeholder="dmg / +heal" aria-label="Damage or healing"></div>
        <div class="cb-conds">${(x.conds || []).map(k => `<button class="cond" data-cond="${k.id}" title="Click to remove">${esc(k.name)}${k.rounds ? `<b>${k.rounds}</b>` : ""}</button>`).join("")}<button class="cond add" data-addcond title="Add a condition">${icon("plus")}</button></div>
        <div class="cb-ops"><button data-up title="Move up">${icon("up")}</button><button data-down title="Move down">${icon("down")}</button><button data-hide title="${x.hidden ? "Show on stream" : "Hide from stream"}" class="${x.hidden ? "on" : ""}">${icon("lock")}</button><button data-rm title="Remove">${icon("x")}</button></div>
      </li>`; }).join("")}</ol>`;
    bindAdd(box);
    $$(".cb-row", box).forEach(row => {
      const x = b.list.find(y => y.id === row.dataset.id), i = b.list.indexOf(x);
      row.addEventListener("mousedown", e => { if (!e.target.closest("input,button")) { st.sel = x.id; renderSide(); $$(".cb-row", box).forEach(r => r.classList.toggle("sel", r === row)); } });
      const ini = $(".cb-init", row);
      ini.onchange = () => { x.init = ini.value === "" ? "" : Number(ini.value); if (!b.active) sortCombat(b); changed(); };
      ini.onkeydown = e => { if (e.key === "Enter") { ini.blur(); const nxt = $$(".cb-init", box).find(n => n.value === ""); nxt?.focus(); } };
      const dmg = $(".cb-dmg", row);
      dmg.onkeydown = e => { if (e.key === "Enter") { applyHp(x, dmg.value); changed(); setTimeout(() => $(`.cb-row[data-id="${x.id}"] .cb-dmg`, el)?.focus(), 20); } };
      $$("[data-cond]", row).forEach(c => c.onclick = () => { const k = x.conds.find(q => q.id === c.dataset.cond); x.conds = x.conds.filter(q => q !== k); log(`${x.name} is no longer ${k.name}`); changed(); });
      $("[data-addcond]", row).onclick = e => condPicker(e.currentTarget, x);
      $("[data-up]", row).onclick = () => { if (i > 0) { const cur = b.list[b.turn]; b.list.splice(i - 1, 0, b.list.splice(i, 1)[0]); b.turn = b.list.indexOf(cur); changed(); } };
      $("[data-down]", row).onclick = () => { if (i < b.list.length - 1) { const cur = b.list[b.turn]; b.list.splice(i + 1, 0, b.list.splice(i, 1)[0]); b.turn = b.list.indexOf(cur); changed(); } };
      $("[data-hide]", row).onclick = () => { x.hidden = !x.hidden; changed(); };
      $("[data-rm]", row).onclick = () => { const cur = b.list[b.turn]; b.list.splice(i, 1); b.turn = Math.max(0, cur === x ? Math.min(i, b.list.length - 1) : b.list.indexOf(cur)); changed(); };
    });
  }
  function condPicker(anchor, x) {
    App.modal(`<h2>Condition on ${esc(x.name)}</h2>
      <div class="chips" id="cpL">${CONDITIONS.map(n => `<button class="chip" data-n="${n}">${n}</button>`).join("")}</div>
      <div class="row"><label class="f" style="flex:1"><span>Or type one</span><input type="text" id="cpT" placeholder="Cursed by the bell"></label>
      <label class="f"><span>Lasts (rounds)</span><div class="stepper"><button data-r="-1">−</button><output id="cpR">∞</output><button data-r="1">+</button></div></label></div>
      <p class="md-help" style="margin:0">Rounds count down at the end of ${esc(x.name)}'s turn. ∞ lasts until you remove it.</p>
      <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Add</button></div>`, (m, close) => {
      let rounds = 0, pick = "";
      const sync = () => $("#cpR", m).textContent = rounds || "∞";
      $$("[data-r]", m).forEach(b => b.onclick = () => { rounds = Math.max(0, Math.min(99, rounds + +b.dataset.r)); sync(); });
      $$("[data-n]", m).forEach(b => b.onclick = () => { pick = b.dataset.n; $$("[data-n]", m).forEach(y => y.classList.toggle("on", y === b)); $("#cpT", m).value = ""; });
      $("#cpT", m).oninput = () => { pick = ""; $$("[data-n]", m).forEach(y => y.classList.remove("on")); };
      $("[data-x]", m).onclick = close;
      $("[data-ok]", m).onclick = () => { const name = $("#cpT", m).value.trim() || pick; if (!name) return toast("Pick or type a condition"); (x.conds ||= []).push({ id: uid(), name, rounds: rounds || null }); log(`${x.name} is ${name}${rounds ? ` for ${rounds} rounds` : ""}`); close(); changed(); };
    });
  }
  function bindAdd(box) {
    const b = cb(), c = C();
    $("#aParty", box).onclick = () => {
      if (!c.party.length) return toast("Add your party first (campaign menu → Party & players)");
      let n = 0; c.party.forEach(m => { if (!b.list.some(x => x.ref === m.id)) { b.list.push({ id: uid(), kind: "pc", ref: m.id, name: m.character || m.player, color: m.color, init: "", hp: m.hp ?? "", max: m.maxHp ?? "", def: m.def ?? "", conds: [] }); n++; } });
      changed(); toast(n ? `Added ${n} player${n > 1 ? "s" : ""}` : "The party is already in");
    };
    $("#aEnc", box).onclick = () => {
      const s = c.sessions.find(x => x.status === "live") || nextPlanned(c, false);
      const enc = s?.plan?.encounters || [];
      if (!enc.length) return toast("No encounters planned for tonight. Add them in Prep");
      App.modal(`<h2>Tonight's encounters</h2><div style="display:flex;flex-direction:column;gap:6px">${enc.map(e => { const x = c.bestiary.find(y => y.id === e.creature); return x ? `<label class="toggle" style="color:var(--ink)"><input type="checkbox" data-e="${e.id}" checked> ${esc(x.name)} × ${e.count}</label>` : ""; }).join("")}</div>
        <div class="foot"><button class="btn primary" data-ok>Add to the fight</button></div>`, (m, close) => {
        $("[data-ok]", m).onclick = () => {
          $$("[data-e]:checked", m).forEach(cbx => { const e = enc.find(y => y.id === cbx.dataset.e), x = c.bestiary.find(y => y.id === e.creature); for (let i = 0; i < e.count; i++) { const f = fromCreature(x, e.count > 1 ? i + 1 : 0, e.hp?.[i]); f.enc = e.id; f.encIdx = i; b.list.push(f); } });
          close(); changed();
        };
      });
    };
    $("#aBst", box).onclick = () => {
      if (!c.bestiary.length) return toast("The bestiary is empty");
      App.modal(`<h2>Add from the bestiary</h2><div style="display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow:auto">${c.bestiary.map(x => `<div class="row" style="justify-content:space-between"><span>${esc(x.name)} <span class="eyebrow">${esc(x.kind || "")}</span></span><div class="stepper sm"><button data-b="${x.id}" data-d="-1">−</button><output data-o="${x.id}">0</output><button data-b="${x.id}" data-d="1">+</button></div></div>`).join("")}</div>
        <div class="foot"><button class="btn primary" data-ok>Add to the fight</button></div>`, (m, close) => {
        const n = {};
        $$("[data-b]", m).forEach(btn => btn.onclick = () => { const id = btn.dataset.b; n[id] = Math.max(0, Math.min(20, (n[id] || 0) + +btn.dataset.d)); $(`[data-o="${id}"]`, m).textContent = n[id]; });
        $("[data-ok]", m).onclick = () => { for (const [id, k] of Object.entries(n)) { const x = c.bestiary.find(y => y.id === id); const have = b.list.filter(y => y.ref === id).length; for (let i = 0; i < k; i++) b.list.push(fromCreature(x, k + have > 1 ? have + i + 1 : 0)); } close(); changed(); };
      });
    };
    $("#aCustom", box).onclick = () => App.modal(`<h2>Add a combatant</h2>
      <label class="f"><span>Name</span><input type="text" id="cuN" placeholder="Bandit captain"></label>
      <div class="grid3"><label class="f"><span>Side</span><select id="cuK"><option value="foe">Foe</option><option value="ally">Ally</option><option value="pc">Player</option></select></label><label class="f"><span>HP</span><input type="number" id="cuH"></label><label class="f"><span>Initiative</span><input type="number" id="cuI" placeholder="roll"></label></div>
      <div class="foot"><button class="btn primary" data-ok>Add</button></div>`, (m, close) => {
      $("[data-ok]", m).onclick = () => { const hp = $("#cuH", m).value; b.list.push({ id: uid(), kind: $("#cuK", m).value, name: $("#cuN", m).value.trim() || "Combatant", init: $("#cuI", m).value === "" ? "" : Number($("#cuI", m).value), hp: hp === "" ? "" : Number(hp), max: hp === "" ? "" : Number(hp), conds: [] }); if (!b.active) sortCombat(b); close(); changed(); };
    });
    $("#aClear", box)?.addEventListener("click", () => App.confirm("Clear the combat list?", "Everyone is removed from the tracker.", "Clear", () => { b.list = []; b.active = false; b.turn = 0; b.round = 1; changed(); }));
  }
  function renderSide() {
    const b = cb(), box = $("#cbSide", el), c = C();
    const x = b.list.find(y => y.id === st.sel) || b.list[b.turn];
    const cr = x?.ref && c.bestiary.find(y => y.id === x.ref);
    box.innerHTML = `${x ? `<section class="cb-detail"><div class="eyebrow">${KIND[x.kind].label}</div><h3>${esc(x.name)}</h3>
        ${cr ? `<div class="mstats sm">${c.statTemplate.filter(k => cr.stats?.[k]).map(k => `<div class="mstat"><span>${esc(k)}</span><b>${esc(cr.stats[k])}</b></div>`).join("")}</div>
          <label class="toggle" style="margin:6px 0"><input type="checkbox" id="cbSec" ${st.secret ? "checked" : ""}> Secret rolls</label>
          <div class="cb-abil">${(cr.abilities || []).map(a => `<div><div class="row" style="gap:8px"><b>${esc(a.name)}</b>${a.roll ? `<button class="rollchip sm" data-roll="${a.id}">${icon("dice")} <span>${esc(a.roll)}</span></button>` : ""}</div>${a.text ? `<p>${esc(a.text)}</p>` : ""}</div>`).join("")}</div>
          ${cr.notes ? `<p class="cb-notes">${esc(cr.notes)}</p>` : ""}`
        : `<label class="f"><span>Note</span><textarea id="cbNote" rows="3" placeholder="Anything to remember about ${esc(x.name)}">${esc(x.note || "")}</textarea></label>`}
        <div class="row" style="margin-top:8px"><label class="f" style="width:90px"><span>Max HP</span><input type="number" id="cbMax" value="${esc(x.max)}"></label><label class="f" style="width:90px"><span>Defense</span><input type="text" id="cbDef" value="${esc(x.def || "")}"></label><label class="f" style="width:90px"><span>Init bonus</span><input type="number" id="cbMod" value="${esc(x.initMod || "")}"></label></div>
      </section>` : ""}
      <section><div class="sec-h"><h3>Combat log</h3><div class="line"></div></div><ul class="cb-log">${b.log.slice(0, 40).map(l => `<li><span class="mono">R${l.r}</span>${esc(l.msg)}</li>`).join("") || `<li style="color:var(--faint)">Damage, conditions and turns are logged here.</li>`}</ul></section>`;
    if (!x) return;
    $("#cbSec", box)?.addEventListener("change", e => { st.secret = e.target.checked; ls.set("cb.secret", st.secret); });
    $$("[data-roll]", box).forEach(btn => btn.onclick = () => { const a = cr.abilities.find(y => y.id === btn.dataset.roll); App.roll(a.roll, `${x.name}: ${a.name}`, { secret: st.secret }); });
    $("#cbNote", box)?.addEventListener("input", e => { x.note = e.target.value; save(); });
    $("#cbMax", box).onchange = e => { x.max = e.target.value === "" ? "" : Number(e.target.value); if (x.hp === "" || x.hp == null) x.hp = x.max; changed(); };
    $("#cbDef", box).onchange = e => { x.def = e.target.value; changed(); };
    $("#cbMod", box).onchange = e => { x.initMod = Number(e.target.value) || 0; save(); };
  }
  function render() { renderHead(); renderList(); renderSide(); }
  const onKey = e => {
    if (el.closest("[hidden]") || document.querySelector(".modal-back") || e.target.closest("input,textarea,select,[contenteditable]")) return;
    if (e.code === "Space") { e.preventDefault(); cb().active ? next(1) : start(); }
  };
  addEventListener("keydown", onKey);
  render(); pushCombat();
  return { show() { render(); }, refresh() { render(); }, destroy() { removeEventListener("keydown", onKey); } };
}
