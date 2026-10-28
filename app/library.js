// Library: ready-made creatures (to the Bestiary) and spells, powers or gear (to the Codex) for each game system.
import { $, $$, esc, icon, toast, uid } from "./util.js";
import { C, save } from "./store.js";
import { SYSTEMS, systemById } from "./systems.js";

let LIB = null;
export async function loadLibrary() {
  if (LIB) return LIB;
  const parts = await Promise.all([import("./lib-d20.js"), import("./lib-daggerheart.js"), import("./lib-story.js"), import("./lib-future.js")]);
  return (LIB = Object.assign({}, ...parts.map(p => p.default)));
}

const DICE = /^[\dd%F+\-−×*kKhHlLrR!<>=()\s]+$/;
export const isDice = s => /\d*d(\d+|F|%)/i.test(s) && DICE.test(s);
// `1d6+2` in text becomes a roll button (the text is escaped already)
export const inlineRolls = html => html.replace(/`([^`]+)`/g, (m, x) => isDice(x.replace(/&lt;/g, "<").replace(/&gt;/g, ">")) ? `<button class="rollchip sm" data-mdroll="${x}">${icon("dice")} ${x}</button>` : `<code>${x}</code>`);

// a creature from the library as a Bestiary entry, with stats named after its system's stat block
export function toCreature(sys, row) {
  const [name, kind, threat, vals, abil, notes] = row;
  const stats = {}; sys.monster.forEach((k, i) => { if (vals[i] != null && vals[i] !== "") stats[k] = vals[i]; });
  const abilities = [];
  for (const [n, roll, text, dmg] of abil) {
    abilities.push({ id: uid(), name: n, roll: roll || "", text: text || "" });
    if (dmg) abilities.push({ id: uid(), name: `${n} damage`, roll: dmg, text: "" });
  }
  return { id: uid(), name, kind, tags: sys.name, threat, hp: stats.HP || "", stats, abilities, notes: notes || "", loot: "", lib: sys.id };
}
export const toSpell = (sys, [title, tags, body]) => ({ id: uid(), title, cat: "Spells", tags: `${sys.name}, ${tags}`, body, updated: Date.now(), lib: sys.id });

// where each system's entries come from
const CREDIT = {
  dnd5e: "From the System Reference Document 5.1 by Wizards of the Coast LLC, licensed under CC-BY-4.0. Checked against the SRD. ",
  pf2e: "Stat blocks from Paizo's Pathfinder Monster Core (ORC License) and Bestiary (OGL), spells from Player Core, as published in the open Pathfinder 2e data. Checked against that data. ",
  pf1e: "Pathfinder Roleplaying Game Core Rulebook and Bestiary, Open Game Content under the OGL. Spells checked against the open rules; monster numbers rebuilt from their Hit Dice, armor and attacks. ",
  fate: "Fate Core SRD by Evil Hat Productions, CC-BY 3.0: nameless NPC tiers, stunts and the ladder are taken from it; the named NPCs are examples built with its guidelines. ",
  fae: "Fate Accelerated SRD by Evil Hat Productions, CC-BY 3.0: stunts and rules are taken from it; the NPCs are examples. ",
  blades: "Abilities and roll rules from the Blades in the Dark SRD by John Harper (One Seven Design), CC-BY 3.0. Blades has no monster stat blocks, so the threats are examples. ",
  daggerheart: "Includes materials from the Daggerheart System Reference Document 1.0, © Critical Role, LLC, under the Darrington Press Community Gaming (DPCGL) License. Taken from the SRD. ",
};
export async function libraryModal(App, { tab = "creatures", onAdd } = {}) {
  const lib = await loadLibrary(), c = C();
  const st = { sys: lib[c.system] ? c.system : "homebrew", tab, q: "" };
  const have = (kind, name) => (kind === "creatures" ? c.bestiary.map(x => x.name) : c.notes.map(n => n.title)).some(n => String(n).toLowerCase() === name.toLowerCase());
  const add = (kind, rows) => {
    const sys = systemById(st.sys); let n = 0;
    for (const row of rows) {
      if (have(kind, row[0])) continue;
      if (kind === "creatures") c.bestiary.push(toCreature(sys, row)); else c.notes.push(toSpell(sys, row));
      n++;
    }
    // a creature from another system brings its stat names along
    if (kind === "creatures" && n) for (const k of sys.monster) if (!c.statTemplate.includes(k)) c.statTemplate.push(k);
    save(); onAdd?.(kind); return n;
  };
  App.modal(`<h2>Library</h2>
    <div class="row" style="gap:8px;flex-wrap:wrap"><select id="lbSys" style="flex:1;min-width:200px">${SYSTEMS.filter(s => lib[s.id]).map(s => `<option value="${s.id}">${esc(s.name)}${s.id === c.system ? " (this campaign)" : ""}</option>`).join("")}</select>
      <div class="mode-seg" id="lbTabs"></div><input type="search" id="lbQ" placeholder="Search" style="width:150px"></div>
    <div class="lib-list" id="lbList"></div>
    <p class="md-help" id="lbFoot" style="margin:0"></p>
    <div class="foot"><button class="btn" id="lbAll">${icon("plus")} Add all</button><div style="flex:1"></div><button class="btn primary" data-x>Done</button></div>`, (m, close) => {
    $("#lbSys", m).value = st.sys;
    const draw = () => {
      const L = lib[st.sys], kinds = { creatures: "Creatures", spells: L.label };
      $("#lbTabs", m).innerHTML = Object.entries(kinds).map(([k, n]) => `<button data-t="${k}" class="${st.tab === k ? "on" : ""}">${esc(n)}</button>`).join("");
      $$("[data-t]", m).forEach(b => b.onclick = () => { st.tab = b.dataset.t; draw(); });
      const rows = (st.tab === "creatures" ? L.creatures : L.spells).filter(r => !st.q || `${r[0]} ${r[1]}`.toLowerCase().includes(st.q));
      $("#lbList", m).innerHTML = rows.map((r, i) => {
        const got = have(st.tab, r[0]);
        const sub = st.tab === "creatures" ? `${esc(r[1])} · threat ${r[2]}/5` : esc(r[1]);
        const detail = st.tab === "creatures" ? r[4].map(a => esc(a[0]) + (a[1] ? ` <code>${esc(a[1])}</code>` : "") + (a[3] ? ` → <code>${esc(a[3])}</code>` : "")).join(" · ") : esc(r[2]).replace(/`([^`]+)`/g, "<code>$1</code>");
        return `<div class="lib-row"><div class="lib-txt"><b>${esc(r[0])}</b><span>${sub}</span><p>${detail}</p></div><button class="btn sm ${got ? "ghost" : ""}" data-add="${i}" ${got ? "disabled" : ""}>${got ? "Added" : `${icon("plus")} Add`}</button></div>`;
      }).join("") || `<p style="color:var(--faint);padding:12px">Nothing matches.</p>`;
      $$("[data-add]", m).forEach(b => b.onclick = () => { add(st.tab, [rows[+b.dataset.add]]); toast(`${rows[+b.dataset.add][0]} added to the ${st.tab === "creatures" ? "Bestiary" : "Codex (Spells)"}`); draw(); });
      $("#lbAll", m).onclick = () => { const n = add(st.tab, rows); toast(n ? `Added ${n} to the ${st.tab === "creatures" ? "Bestiary" : "Codex"}` : "All of these are in already"); draw(); };
      $("#lbFoot", m).innerHTML = (CREDIT[st.sys] || "")
        + (CREDIT[st.sys] ? "Added entries are yours to edit." : "Written for this app in the style of the game, not taken from its books: check the numbers against your copy and tune them for your table. Added entries are yours to edit.");
    };
    $("#lbSys", m).onchange = e => { st.sys = e.target.value; draw(); };
    $("#lbQ", m).oninput = e => { st.q = e.target.value.toLowerCase(); draw(); };
    $("[data-x]", m).onclick = close;
    draw();
  });
}
