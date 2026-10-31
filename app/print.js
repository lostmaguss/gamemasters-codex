// Printables: a one-page session sheet, NPC cards, handouts and character sheets, saved as PDF.
import { $, $$, esc, icon, toast } from "./util.js";
import { C } from "./store.js";
import { nextPlanned } from "./bestiary.js";
import { sheetLayout, slotCells } from "./party.js";
import { creatureHP } from "./difficulty.js";

const md = t => esc(String(t || "").replace(/^#+\s*(.*)$/gm, "**$1**").replace(/\[\[([^\]]+)\]\]/g, "$1")).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
const boxes = n => `<span class="hpbox">${Array.from({ length: Math.min(n, 60) }, () => "<i></i>").join("")}</span>`;
const page = (title, body, extra = "") => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="stylesheet" href="styles.css"><style>
  @page { size: A4; margin: 0; }
  html, body { height: auto; overflow: visible; background: #fff; color: #1b1416; }
  body { font: 11pt/1.45 var(--body); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pg { width: 210mm; min-height: 297mm; padding: 14mm 14mm 12mm; box-sizing: border-box; page-break-after: always; position: relative; }
  .pg:last-child { page-break-after: auto; }
  h1 { font: 700 26pt/1.05 var(--display); margin: 0 0 2mm; color: #1b1416; }
  h2 { font: 700 13pt var(--display); margin: 0 0 2mm; padding-bottom: 1mm; border-bottom: 1.5px solid #1b1416; color: #1b1416; }
  .eb { font: 600 7.5pt var(--mono); letter-spacing: .18em; text-transform: uppercase; color: #8a6f62; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 8mm; } .full { grid-column: 1 / -1; }
  ul.ck { list-style: none; margin: 0; padding: 0; } ul.ck li { padding: 1mm 0 1mm 6mm; position: relative; border-bottom: .5px dotted #cbb9ad; }
  ul.ck li::before { content: ""; position: absolute; left: 0; top: 2.2mm; width: 3mm; height: 3mm; border: 1px solid #1b1416; border-radius: .6mm; }
  .hpbox { display: inline-flex; flex-wrap: wrap; gap: .8mm; vertical-align: middle; } .hpbox i { width: 2.6mm; height: 2.6mm; border: .8px solid #1b1416; border-radius: .4mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; } td, th { text-align: left; padding: 1.2mm 1.5mm; border-bottom: .5px solid #d8c9be; vertical-align: top; } th { font: 600 7.5pt var(--mono); letter-spacing: .12em; text-transform: uppercase; color: #8a6f62; }
  .foot { position: absolute; bottom: 7mm; left: 14mm; right: 14mm; display: flex; justify-content: space-between; font: 500 7pt var(--mono); color: #a08b7f; }
  .start { font: italic 11.5pt/1.5 var(--body); padding: 3mm 4mm; background: #f6efe6; border-left: 3px solid #c2451d; }
  ${extra}
</style></head><body>${body}</body></html>`;

// ---- the session sheet: everything for tonight on one page ----
function sessionSheet(c) {
  const s = c.sessions.find(x => x.status === "live") || nextPlanned(c, false);
  if (!s) return null;
  const P = s.plan || {}, L = sheetLayout(c);
  const items = arr => (arr || []).filter(x => x.text).map(x => `<li>${md(x.text)}</li>`).join("") || `<li style="color:#a08b7f">–</li>`;
  const cast = (P.cast || []).map(id => c.notes.find(n => n.id === id)).filter(Boolean);
  const enc = (P.encounters || []).map(e => { const x = c.bestiary.find(b => b.id === e.creature); if (!x) return ""; const hp = creatureHP(x);
    return `<tr><td><b>${esc(x.name)}</b>${e.count > 1 ? ` ×${e.count}` : ""}<div class="eb">${esc(["Def " + (x.stats?.Defense || "?"), x.stats?.Speed].filter(Boolean).join(" · "))}</div>${(x.abilities || []).filter(a => a.roll).slice(0, 3).map(a => `<div style="font-size:8.5pt">${esc(a.name)} <b>${esc(a.roll)}</b></div>`).join("")}</td><td>${Array.from({ length: e.count }, (_, i) => `<div style="margin-bottom:1mm"><span class="eb">#${i + 1}</span> ${boxes(hp)}</div>`).join("")}</td></tr>`; }).join("");
  const body = `<div class="pg">
    <div class="eb">${esc(c.name)} · Session ${esc(s.num)}${s.date ? " · " + esc(s.date) : ""}</div><h1>${esc(s.title || "Tonight's session")}</h1>
    ${P.start ? `<div class="start" style="margin:3mm 0 5mm">${md(P.start)}</div>` : ""}
    <div class="cols">
      <div><h2>Scenes</h2><ul class="ck">${items(P.scenes)}</ul></div>
      <div><h2>Secrets &amp; clues</h2><ul class="ck">${items(P.secrets)}</ul></div>
      <div><h2>Cast</h2>${cast.map(n => `<div style="margin-bottom:2mm"><b>${esc(n.title)}</b> <span class="eb">${esc(n.tags || n.cat)}</span><div style="font-size:9pt;color:#4a3c3f">${md(String(n.body || "").split("\n").find(l => l.trim() && !/^#/.test(l.trim())) || "").slice(0, 220)}</div></div>`).join("") || `<div style="color:#a08b7f">–</div>`}</div>
      <div><h2>Treasure</h2><ul class="ck">${items(P.treasure)}</ul></div>
      ${enc ? `<div class="full"><h2>Encounters</h2><table><tr><th style="width:42%">Foe</th><th>HP</th></tr>${enc}</table></div>` : ""}
      <div class="full"><h2>The party</h2><table><tr><th>Character</th>${L.resources.map(r => `<th>${esc(r)}</th>`).join("")}${L.stats.map(x => `<th>${esc(x)}</th>`).join("")}<th>Notes</th></tr>
        ${c.party.map(m => `<tr><td><b>${esc(m.character || m.player)}</b><div class="eb">${esc(m.player)}</div></td>${L.resources.map(r => `<td>${esc(m.res?.[r]?.max ?? "")}</td>`).join("")}${L.stats.map(x => `<td>${esc(m.stats?.[x] ?? "")}</td>`).join("")}<td style="width:25%"></td></tr>`).join("")}</table></div>
    </div><div class="foot"><span>Gamemaster's Codex</span><span>Stat roll: ${esc(L.roll)}</span></div></div>`;
  return { html: page(`Session ${s.num}`, body), name: `${c.name} - Session ${s.num}` };
}

// ---- NPC cards: 2 × 3 per page, cut them out ----
function npcCards(c, which) {
  const s = nextPlanned(c, false);
  const list = which === "cast" && s ? (s.plan?.cast || []).map(id => c.notes.find(n => n.id === id)).filter(Boolean) : c.notes.filter(n => n.cat === "NPCs");
  if (!list.length) return null;
  const card = n => `<div class="card">${n.img ? `<div class="pic" style="background-image:url('${esc(n.img)}')"></div>` : ""}<div class="eb">${esc(n.tags || n.cat)}</div><h3>${esc(n.title)}</h3><div class="tx">${md(String(n.body || "").slice(0, n.img ? 380 : 620))}</div></div>`;
  const pages = []; for (let i = 0; i < list.length; i += 6) pages.push(`<div class="pg cards">${list.slice(i, i + 6).map(card).join("")}</div>`);
  return { html: page("NPC cards", pages.join(""), `.cards { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 85mm; gap: 4mm; padding: 10mm; }
    .card { border: 1px dashed #b9a597; border-radius: 3mm; padding: 4mm; overflow: hidden; display: flex; flex-direction: column; background: #fffaf3; }
    .card h3 { font: 700 15pt/1.1 var(--display); margin: 1mm 0 2mm; } .card .tx { font-size: 9pt; color: #3a2e31; overflow: hidden; }
    .card .pic { height: 26mm; margin: -4mm -4mm 3mm; background: center/cover; border-radius: 3mm 3mm 0 0; }`), name: `${c.name} - NPC cards` };
}

// ---- handouts: one per page, to hand across the table ----
function handouts(c) {
  const list = c.handouts.filter(h => h.type === "image" ? h.src : h.text);
  if (!list.length) return null;
  const pg = h => h.type === "image"
    ? `<div class="pg ho">${h.title ? `<div class="ht">${esc(h.title)}</div>` : ""}<img src="${esc(h.src)}"></div>`
    : `<div class="pg ho"><div class="paper s-${esc(h.style || "letter")}">${h.title ? `<h1>${esc(h.title)}</h1>` : ""}<div class="tx">${esc(h.text)}</div></div></div>`;
  return { html: page("Handouts", list.map(pg).join(""), `.ho { display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ho img { max-width: 100%; max-height: 255mm; object-fit: contain; } .ht { font: 700 18pt var(--display); margin-bottom: 5mm; }
    .paper { width: 100%; min-height: 200mm; padding: 16mm; background: #f4e9d3; border-radius: 2mm; box-shadow: inset 0 0 25mm rgba(120,80,40,.25); }
    .paper .tx { white-space: pre-wrap; font: 14pt/1.6 var(--hand, var(--body)); } .paper.s-letter .tx { font-style: italic; }
    .paper.s-plain { background: #fff; box-shadow: none; border: 1px solid #ccc; }`), name: `${c.name} - Handouts` };
}

// ---- character sheets: one page per player ----
function charSheets(c) {
  if (!c.party.length) return null;
  const L = sheetLayout(c);
  const pg = m => `<div class="pg">
    <div class="eb">${esc(c.name)}</div><h1>${esc(m.character || "Character")}</h1><div style="margin:-1mm 0 5mm;color:#6a585b">${esc([m.role, m.player && "played by " + m.player].filter(Boolean).join(" · "))}</div>
    <div class="cols"><div><h2>Stats</h2><div class="stats">${L.stats.map(x => { const v = m.stats?.[x] ?? "", mx = L.statMax ? (m.statMax?.[x] ?? "") : ""; return `<div><span class="eb">${esc(x)}</span><b>${esc(v)}${mx !== "" && mx !== v ? `<small style="font-size:11pt;color:#6a585b">/${esc(mx)}</small>` : ""}</b></div>`; }).join("")}</div><div class="eb" style="margin-top:2mm">Roll: ${esc(L.roll)}</div></div>
      <div><h2>Resources</h2>${L.resources.map(r => { const cur = m.res?.[r]?.cur ?? "", mx = m.res?.[r]?.max ?? ""; return `<div style="margin-bottom:3mm"><b>${esc(r)}</b> <span class="eb">${mx !== "" ? `max ${esc(mx)}` : esc(cur)}</span><br>${boxes(Number(mx || cur) || 6)}</div>`; }).join("")}${m.conds?.length ? `<div class="eb">Conditions: ${esc(m.conds.join(", "))}</div>` : ""}</div>
      ${L.slots?.n ? `<div class="full"><h2>Inventory (${L.slots.n} slots)</h2><div class="pslots">${slotCells(m, L).map(x => `<div><span class="eb">${x.i + 1}</span> ${x.kind === "fatigue" ? "<b>Fatigue</b>" : x.kind === "cont" ? `<i>↳ ${esc(x.of.t)}</i>` : esc(x.s?.t || "") + (x.s?.b ? " <i>(bulky)</i>" : "")}</div>`).join("")}</div></div>` : ""}
      ${L.fields.map(f => `<div class="full"><h2>${esc(f)}</h2><div class="lined">${md(m.text?.[f] || "")}</div></div>`).join("")}
    </div><div class="foot"><span>Gamemaster's Codex</span><span>${esc(m.character || "")}</span></div></div>`;
  return { html: page("Character sheets", c.party.map(pg).join(""), `.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(19mm, 1fr)); gap: 2mm; } .stats div { border: 1px solid #1b1416; border-radius: 2mm; text-align: center; padding: 1.5mm; } .stats b { display: block; font: 700 18pt var(--display); min-height: 8mm; }
    .pslots { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm 4mm; } .pslots div { border-bottom: 1px solid #cbb9ad; padding: 1mm 1.5mm; min-height: 5.5mm; font-size: 9.5pt; }
    .lined { min-height: 26mm; font-size: 10pt; background: repeating-linear-gradient(transparent 0 6.2mm, #e3d6cc 6.2mm 6.5mm); line-height: 6.5mm; }`), name: `${c.name} - Character sheets` };
}

export const PRINTS = {
  session: { label: "Session sheet", desc: "Tonight on one page: strong start, scenes, secrets, cast, encounters with HP boxes, the party", build: sessionSheet, empty: "Plan a session in Prep first" },
  cast: { label: "NPC cards: tonight's cast", desc: "Cut-out cards for the NPCs in your next session", build: c => npcCards(c, "cast"), empty: "Add NPCs to the cast in Prep first" },
  npcs: { label: "NPC cards: everyone", desc: "Every NPC page in the Codex, six to a page", build: c => npcCards(c, "all"), empty: "No NPC pages in the Codex yet" },
  handouts: { label: "Handouts", desc: "One per page, to hand across the table", build: handouts, empty: "No handouts yet (Live view)" },
  sheets: { label: "Character sheets", desc: "One page per character, with HP boxes to tick", build: charSheets, empty: "Add your party first" },
};
export async function printPDF(kind) {
  const p = PRINTS[kind], c = C(), out = p.build(c);
  if (!out) return toast(p.empty);
  if (!window.codex?.printPDF) { const w = window.open("", "_blank"); w.document.write(out.html.replace("<head>", `<head><base href="${location.href.replace(/[^/]*$/, "")}">`)); w.document.close(); setTimeout(() => w.print(), 600); return; }
  toast("Making the PDF…");
  const r = await window.codex.printPDF({ html: out.html, name: out.name.replace(/[\\/:*?"<>|]+/g, "") });
  if (r?.error) toast("Couldn't make the PDF: " + r.error); else if (r?.ok) toast("PDF saved");
  return r;
}
export function printModal(App) {
  App.modal(`<h2>Print</h2><p style="margin:0;color:var(--dim)">Saved as a PDF you can print or keep on a tablet.</p>
    <div style="display:flex;flex-direction:column;gap:6px">${Object.entries(PRINTS).map(([k, p]) => `<button class="cx-item pr-item" data-p="${k}"><b>${p.label}</b><span class="carried">${p.desc}</span></button>`).join("")}</div>
    <div class="foot"><button class="btn ghost" data-x>Close</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    $$("[data-p]", m).forEach(b => b.onclick = () => printPDF(b.dataset.p));
  });
}
