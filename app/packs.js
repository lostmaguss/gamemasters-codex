// Homebrew packs: share a system (sheet + rules), monsters, spells, tables, custom dice and Codex pages
// as one .codexpack file. Pictures travel inside it. Importing adds what's new and skips what you already have.
import { $, $$, esc, h, icon, toast, uid, storeImage, toDataURL, mapStrings } from "./util.js";
import { C, save } from "./store.js";
import { CATS } from "./codex.js";
import { syncCustomDice } from "./customdice.js";
import { sheetLayout } from "./party.js";

const FORMAT = "codex-pack";
const clone = x => JSON.parse(JSON.stringify(x));
const noUi = x => { const y = clone(x); delete y.ui; return y; };
// what a pack can carry, read from and written to a campaign
const PARTS = [
  { k: "system", label: "Sheet layout & dice rules", count: () => 1, take: c => ({ system: c.system || null, sheet: clone(sheetLayout(c)), rules: c.rules, statTemplate: c.statTemplate, presets: c.presets, genre: c.genre }) },
  { k: "bestiary", label: "Bestiary creatures", count: c => c.bestiary.length, take: c => c.bestiary.map(noUi) },
  { k: "spells", label: "Spells & powers (Codex)", count: c => c.notes.filter(n => n.cat === "Spells").length, take: c => c.notes.filter(n => n.cat === "Spells").map(noUi) },
  { k: "notes", label: "Other Codex pages", count: c => c.notes.filter(n => n.cat !== "Spells").length, take: c => c.notes.filter(n => n.cat !== "Spells").map(noUi) },
  { k: "tables", label: "Random tables", count: c => c.tables.length, take: c => c.tables.map(t => ({ ...noUi(t), hist: [] })) },
  { k: "customDice", label: "Custom dice", count: c => (c.customDice || []).length, take: c => (c.customDice || []).map(noUi) },
];
const safeName = s => (s || "pack").replace(/[^\w\- ]+/g, "").trim() || "pack";

export function packsModal(App) {
  App.modal(`<h2>Homebrew packs</h2><p style="margin:0;color:var(--dim)">A pack is one file with your homebrew: a system's sheet and dice rules, monsters, spells, tables, custom dice and Codex pages, pictures included. Share it with other GMs, or load theirs.</p>
    <div class="row" style="gap:10px"><button class="btn primary" id="pkExp" style="flex:1;justify-content:center">${icon("save")} Make a pack from this campaign</button><button class="btn" id="pkImp" style="flex:1;justify-content:center">${icon("copy")} Open a pack…</button></div>
    <p class="md-help" style="margin:0">Only share what's yours to share. Material from the open game licenses in the Library can be shared under the same licenses (see Legal & credits); text copied from published books usually can't.</p>
    <div class="foot"><button class="btn ghost" data-x>Close</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    $("#pkExp", m).onclick = () => { close(); exportModal(App); };
    $("#pkImp", m).onclick = async () => { const txt = await pickFile(); if (txt == null) return; close(); importModal(App, txt); };
  });
}

function exportModal(App) {
  const c = C();
  App.modal(`<h2>Make a pack</h2>
    <label class="f"><span>Pack name</span><input type="text" id="pkN" value="${esc(c.name)} homebrew"></label>
    <div class="two"><label class="f"><span>Made by</span><input type="text" id="pkA" placeholder="Your name or handle"></label><label class="f"><span>Version</span><input type="text" id="pkV" value="1.0"></label></div>
    <label class="f"><span>What it is</span><textarea id="pkD" rows="2" placeholder="Monsters and spells for a sunken-city campaign"></textarea></label>
    <div class="grp" style="display:flex;flex-direction:column;gap:6px">${PARTS.map(p => { const n = p.count(c); return `<label class="set-row" style="cursor:pointer"><span>${esc(p.label)} <span class="eyebrow">${n}</span></span><input type="checkbox" data-p="${p.k}" ${n ? "checked" : "disabled"}></label>`; }).join("")}</div>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>${icon("save")} Save pack</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    $("[data-ok]", m).onclick = async () => {
      const contents = {};
      for (const p of PARTS) if ($(`[data-p="${p.k}"]`, m).checked) contents[p.k] = p.take(c);
      if (!Object.keys(contents).length) return toast("Pick at least one thing to share");
      const pack = { format: FORMAT, version: 1, name: $("#pkN", m).value.trim() || "Homebrew pack", author: $("#pkA", m).value.trim(), packVersion: $("#pkV", m).value.trim(), description: $("#pkD", m).value.trim(), created: new Date().toISOString(), contents };
      toast("Packing pictures…");
      await mapStrings(pack, v => v.startsWith("codexmedia://media/") && !/\.(mp3|ogg|wav|m4a|flac|webm|opus)$/i.test(v) ? toDataURL(v).catch(() => v) : v);
      const txt = JSON.stringify(pack), file = `${safeName(pack.name)}.codexpack`;
      if (window.codex) { if (await window.codex.exportData(txt, file, "pack")) { close(); toast("Pack saved"); } }
      else { const a = h(`<a download="${esc(file)}" style="display:none"></a>`); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); close(); toast("Pack downloaded"); }
    };
  });
}

async function pickFile() {
  if (window.codex) return window.codex.importData("pack");
  return new Promise(res => { const f = h(`<input type="file" accept=".codexpack,.json">`); f.onchange = async () => res(f.files[0] ? await f.files[0].text() : null); f.click(); });
}

// a pack file's text: preview what's in it, then add what the GM picks
export function importModal(App, txt) {
  let pack;
  try { pack = JSON.parse(txt); } catch { return toast("That file isn't a homebrew pack"); }
  if (pack?.format !== FORMAT || !pack.contents) return toast("That file isn't a homebrew pack");
  const C_ = pack.contents, n = k => Array.isArray(C_[k]) ? C_[k].length : C_[k] ? 1 : 0;
  App.modal(`<h2>${esc(pack.name || "Homebrew pack")}</h2>
    <p style="margin:0;color:var(--dim)">${pack.author ? `By ${esc(pack.author)}` : "Unknown author"}${pack.packVersion ? ` · v${esc(pack.packVersion)}` : ""}${pack.description ? `<br>${esc(pack.description)}` : ""}</p>
    <div class="grp" style="display:flex;flex-direction:column;gap:6px">${PARTS.filter(p => n(p.k)).map(p => `<label class="set-row" style="cursor:pointer"><span>${esc(p.label)} <span class="eyebrow">${n(p.k)}</span>${p.k === "system" ? `<br><small style="color:var(--dim)">Replaces this campaign's sheet layout, dice rules and bestiary stat block.</small>` : ""}</span><input type="checkbox" data-p="${p.k}" ${p.k === "system" ? "" : "checked"}></label>`).join("")}</div>
    <p class="md-help" style="margin:0">Things you already have (same name) are skipped. Ctrl+Z undoes the whole import.</p>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>${icon("plus")} Add to ${esc(C().name)}</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    $("[data-ok]", m).onclick = async () => {
      const on = k => $(`[data-p="${k}"]`, m)?.checked, c = C(), added = [];
      // pictures inside the pack go to the media folder like any other picture
      await mapStrings(C_, v => v.startsWith("data:image") ? storeImage(v) : v);
      const merge = (list, items, key, fix) => { const have = new Set(list.map(x => String(x[key]).toLowerCase())); let k = 0; for (const x of items) { if (have.has(String(x[key]).toLowerCase())) continue; const y = { ...x, id: uid() }; fix?.(y); list.push(y); k++; } return k; };
      if (on("system") && C_.system) { const s = C_.system; Object.assign(c, { sheet: s.sheet || c.sheet, rules: s.rules || c.rules, statTemplate: s.statTemplate || c.statTemplate }); if (s.system) c.system = s.system; c.presets ||= []; merge(c.presets, s.presets || [], "name"); added.push("sheet & rules"); }
      if (on("bestiary")) { const k = merge(c.bestiary, C_.bestiary, "name", x => x.abilities = (x.abilities || []).map(a => ({ ...a, id: uid() }))); if (k) added.push(`${k} creatures`); }
      if (on("spells")) { const k = merge(c.notes, C_.spells, "title", x => { x.cat = "Spells"; x.updated = Date.now(); }); if (k) added.push(`${k} spells`); }
      if (on("notes")) { const k = merge(c.notes, C_.notes, "title", x => { if (!CATS[x.cat]) x.cat = "Other"; x.updated = Date.now(); }); if (k) added.push(`${k} pages`); }
      if (on("tables")) { const k = merge(c.tables, C_.tables, "name", x => x.rows = (x.rows || []).map(r => ({ ...r, id: uid() }))); if (k) added.push(`${k} tables`); }
      if (on("customDice")) { c.customDice ||= []; const k = merge(c.customDice, C_.customDice, "name"); if (k) { added.push(`${k} custom dice`); syncCustomDice(); } }
      save(); close(); App.refreshAll();
      if (on("system")) App.settingsRemount?.();
      App.undoToast ? toast(added.length ? `Added ${added.join(", ")}` : "Nothing new: you already have all of it", added.length ? { action: "Undo", run: App.undo } : {}) : toast("Pack added");
    };
  });
}
