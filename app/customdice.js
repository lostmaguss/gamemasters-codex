// Custom dice: your own faces (symbols, words, emoji) with optional values, rolled as 3d[boon].
import { $, $$, esc, icon, toast, uid } from "./util.js";
import { C, save } from "./store.js";
import { setCustomDice } from "./roll.js";

const SIDES = [4, 6, 8, 10, 12, 20];
export const STARTERS = [
  { name: "Boon", sides: 6, faces: [["⚔", 1], ["⚔", 1], ["✦", 0], ["⚔✦", 1], ["", 0], ["", 0]], note: "Success and advantage" },
  { name: "Hit", sides: 6, faces: [["Hit", 1], ["Hit", 1], ["Hit", 1], ["Miss", 0], ["Miss", 0], ["Crit!", 2]], note: "A simple hit / miss die" },
  { name: "Rune", sides: 8, faces: [["ᚠ", ""], ["ᚢ", ""], ["ᚦ", ""], ["ᚨ", ""], ["ᚱ", ""], ["ᚲ", ""], ["ᚷ", ""], ["ᚹ", ""]], note: "Pure symbols, for oracles and rituals" },
];
const list = () => (C().customDice ||= []);
export function syncCustomDice() { setCustomDice(list()); }

export function customDiceModal(App, die, onDone) {
  const isNew = !die;
  const d = die ? JSON.parse(JSON.stringify(die)) : { id: uid(), name: "", sides: 6, faces: Array.from({ length: 6 }, () => ({ label: "", value: "" })) };
  App.modal(`<h2>${isNew ? "New" : "Edit"} custom die</h2>
    <div class="row" style="gap:10px"><label class="f" style="flex:1"><span>Name (roll it as <code id="cdHow">2d[name]</code>)</span><input type="text" id="cdN" value="${esc(d.name)}" placeholder="Boon"></label>
      <label class="f" style="width:110px"><span>Sides</span><select id="cdS">${SIDES.map(s => `<option ${s === d.sides ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>
    ${isNew ? `<div class="row" style="gap:6px"><span class="eyebrow">Start from</span>${STARTERS.map((s, i) => `<button class="chip" data-st="${i}" title="${esc(s.note)}">${esc(s.name)}</button>`).join("")}</div>` : ""}
    <div class="cd-faces" id="cdF"></div>
    <p class="md-help" style="margin:0">A face can show a symbol, a word or an emoji. Give it a number if it should add to the total; leave numbers empty and the roll shows the symbols you got instead.</p>
    <div class="foot">${isNew ? "" : `<button class="btn ghost danger" data-del>Delete</button><div style="flex:1"></div>`}<button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save die</button></div>`, (m, close) => {
    const drawFaces = () => {
      while (d.faces.length < d.sides) d.faces.push({ label: "", value: "" }); d.faces.length = d.sides;
      $("#cdF", m).innerHTML = d.faces.map((f, i) => `<div class="cd-face"><span class="eyebrow">${i + 1}</span><input type="text" data-l="${i}" value="${esc(f.label)}" placeholder="–" maxlength="8"><input type="text" class="mono" data-v="${i}" value="${esc(f.value)}" placeholder="0" title="Value"></div>`).join("");
      $$("[data-l]", m).forEach(x => x.oninput = () => d.faces[+x.dataset.l].label = x.value);
      $$("[data-v]", m).forEach(x => x.oninput = () => d.faces[+x.dataset.v].value = x.value.trim());
    };
    const how = () => $("#cdHow", m).textContent = `2d[${$("#cdN", m).value.trim() || "name"}]`;
    $("#cdN", m).oninput = how; how();
    $("#cdS", m).onchange = e => { d.sides = +e.target.value; drawFaces(); };
    $$("[data-st]", m).forEach(b => b.onclick = () => { const s = STARTERS[+b.dataset.st]; d.sides = s.sides; d.faces = s.faces.map(([label, value]) => ({ label, value: String(value) })); $("#cdS", m).value = s.sides; if (!$("#cdN", m).value.trim()) $("#cdN", m).value = s.name; how(); drawFaces(); });
    drawFaces();
    $("[data-x]", m).onclick = close;
    $("[data-del]", m)?.addEventListener("click", () => { C().customDice = list().filter(x => x.id !== d.id); save(); syncCustomDice(); close(); onDone?.(); });
    $("[data-ok]", m).onclick = () => {
      d.name = $("#cdN", m).value.trim().replace(/[\[\]]/g, "");
      if (!d.name) return toast("Name the die");
      if (list().some(x => x.id !== d.id && x.name.toLowerCase() === d.name.toLowerCase())) return toast("You already have a die with that name");
      if (!d.faces.some(f => f.label.trim())) return toast("Put something on at least one face");
      const i = list().findIndex(x => x.id === d.id); if (i >= 0) list()[i] = d; else list().push(d);
      save(); syncCustomDice(); close(); onDone?.(); toast(`Roll it with 1d[${d.name}]`);
    };
  });
}
