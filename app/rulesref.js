// Rules reference: a searchable side panel with the conditions and core rules of the campaign's system.
// Open-SRD text where the game has one (rules-srd.js), short summaries written for the app otherwise.
import { $, $$, esc, h, icon, toast } from "./util.js";
import { C } from "./store.js";
import { SYSTEMS, systemById } from "./systems.js";
import SRD from "./rules-srd.js";
import NOTES from "./rules-notes.js";
import { md } from "./codex.js";

const SOURCE = {
  dnd5e: "From the System Reference Document 5.1 by Wizards of the Coast LLC, CC-BY-4.0.",
  daggerheart: "From the Daggerheart SRD 1.0, © Critical Role, LLC, under the DPCGL.",
  fate: "From the Fate Core SRD by Evil Hat Productions, CC-BY 3.0.", fae: "From the Fate Core SRD by Evil Hat Productions, CC-BY 3.0.",
  pf2e: "Summaries written for the app, checked against Pathfinder Player Core (ORC).",
  pf1e: "Summaries of the Pathfinder Core Rulebook (Open Game Content).",
  blades: "Summaries of the Blades in the Dark SRD (CC-BY 3.0).",
};
export const rulesFor = id => [...(SRD[id] || []), ...(NOTES[id] || [])];
export const conditionsFor = id => { const L = rulesFor(id).filter(r => r.cat === "Conditions").map(r => r.name); return L.length ? L : null; };
export function ruleText(id, name) {
  const r = rulesFor(id).find(x => x.name.toLowerCase() === String(name).toLowerCase());
  return r ? r.text.replace(/^- /gm, "").replace(/[`*_]/g, "").replace(/\s+/g, " ").trim() : "";
}

let panel = null;
export function toggleRules(App, opts) { if (panel && !opts) return closeRules(); openRules(App, opts); }
export function closeRules() { panel?.remove(); panel = null; document.body.classList.remove("rules-open"); }
export function openRules(App, { q = "", sys } = {}) {
  const st = { sys: sys || (rulesFor(C().system).length ? C().system : "dnd5e"), q, cat: "All", open: new Set() };
  if (!panel) { panel = h(`<aside class="rules-panel" aria-label="Rules reference"></aside>`); document.body.append(panel); document.body.classList.add("rules-open"); }
  const draw = () => {
    const all = rulesFor(st.sys), cats = ["All", ...new Set(all.map(r => r.cat))];
    const ql = st.q.toLowerCase();
    const list = all.filter(r => (st.cat === "All" || r.cat === st.cat) && (!ql || r.name.toLowerCase().includes(ql) || r.text.toLowerCase().includes(ql)));
    if (ql && list.length === 1) st.open.add(list[0].name);
    panel.innerHTML = `<header><div class="row" style="gap:8px;align-items:center"><h3 style="flex:1">Rules</h3><button class="btn sm icon ghost" data-x title="Close (F2)">${icon("x")}</button></div>
      <select id="rrSys">${SYSTEMS.filter(s => rulesFor(s.id).length).map(s => `<option value="${s.id}">${esc(s.name)}${s.id === C().system ? " (this campaign)" : ""}</option>`).join("")}</select>
      <input type="search" id="rrQ" placeholder="Search: prone, grapple, death…" value="${esc(st.q)}">
      <div class="chips">${cats.map(c => `<button class="chip ${c === st.cat ? "on" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div></header>
      <div class="rr-list">${list.map(r => `<section class="rr-item ${st.open.has(r.name) ? "open" : ""}"><button class="rr-h" data-n="${esc(r.name)}"><b>${esc(r.name)}</b><span class="eyebrow">${esc(r.cat)}</span></button>${st.open.has(r.name) ? `<div class="prose nocap">${md(r.text, [], { rolls: true })}</div>` : ""}</section>`).join("") || `<p class="md-help" style="padding:12px">Nothing matches.</p>`}</div>
      <p class="md-help rr-src">${esc(SOURCE[st.sys] || "Short notes written for the app, not taken from the game's books. Check your own copy for the full rules.")}</p>`;
    $("#rrSys", panel).value = st.sys;
    $("#rrSys", panel).onchange = e => { st.sys = e.target.value; st.cat = "All"; st.open.clear(); draw(); };
    $("#rrQ", panel).oninput = e => { st.q = e.target.value; const pos = e.target.selectionStart; draw(); const i = $("#rrQ", panel); i.focus(); i.setSelectionRange(pos, pos); };
    $("[data-x]", panel).onclick = closeRules;
    $$("[data-cat]", panel).forEach(b => b.onclick = () => { st.cat = b.dataset.cat; draw(); });
    $$("[data-n]", panel).forEach(b => b.onclick = () => { const n = b.dataset.n; st.open.has(n) ? st.open.delete(n) : st.open.add(n); draw(); });
    $$("[data-mdroll]", panel).forEach(b => b.onclick = () => App.roll(b.dataset.mdroll, b.closest(".rr-item").querySelector("b").textContent));
  };
  draw();
  if (!q) $("#rrQ", panel).focus();
}
