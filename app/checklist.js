// First-launch checklist: a small card that ticks itself off as the GM sets up, then gets out of the way.
import { $, $$, esc, h, icon } from "./util.js";
import { S, C, save, onSaved } from "./store.js";

const seen = () => (S.data.prefs.seen ||= {});
export const markSeen = k => { if (!seen()[k]) { seen()[k] = true; save(); render(); } };

const STEPS = [
  { k: "system", t: "Pick your game system", d: "Dice, sheets and the bestiary follow it", done: c => !!c.system, go: A => A.settings("rules") },
  { k: "party", t: "Add your party", d: "Each player's character and stats", done: c => c.party.length > 0, go: A => A.go("party") },
  { k: "prep", t: "Plan the next session", d: "A strong start, scenes, secrets", done: c => c.sessions.some(s => s.plan && (s.plan.start || s.plan.scenes?.length)), go: A => A.go("prep") },
  { k: "monsters", t: "Add monsters from the Library", d: "Ready-made for your system", done: c => c.bestiary.length > 0, go: A => { A.go("bestiary"); setTimeout(() => $("#bLib")?.click(), 150); } },
  { k: "stage", t: "Open the stream window", d: "What players see on Discord or a TV", done: () => !!seen().stage, go: A => A.stage.open() },
  { k: "table", t: "Let players join on their phones", d: "A QR code, no app to install", done: () => !!seen().table, go: A => A.tableModal() },
  { k: "discord", t: "Connect Discord", d: "Optional: rolls, recaps, the bot", done: () => !!A_?.discordConnected?.(), go: A => A.discord.discordModal(A), optional: true },
  { k: "look", t: "Make it yours: pick a theme", d: "15 themes, light and dark", done: c => !!c.look && c.look !== "auto" || !!seen().look, go: A => { markSeen("look"); A.settings("look"); }, optional: true },
];

let A_ = null, el = null;
// open on first launch; after that it remembers, and folds itself away once a few steps are done
const isOpen = () => S.data.prefs.checklistOpen ?? true;
const setOpen = v => { S.data.prefs.checklistOpen = v; save(); };
export function initChecklist(App) {
  A_ = App;
  App.checklist = force => { if (force) { S.data.prefs.checklistHidden = false; setOpen(true); } render(); };
  onSaved(s => { if (s === "saved") render(); });
  render();
}
function render() {
  if (!A_ || !S.data) return;
  const c = C(), hidden = S.data.prefs.checklistHidden;
  if (hidden) { el?.remove(); el = null; return; }
  const rows = STEPS.map(s => ({ ...s, ok: !!s.done(c) }));
  const need = rows.filter(r => !r.optional), n = need.filter(r => r.ok).length;
  if (!el) { el = h(`<aside class="checklist" aria-label="Setup checklist"></aside>`); document.body.append(el); }
  const all = n === need.length;
  if (S.data.prefs.checklistOpen == null && n >= 3) S.data.prefs.checklistOpen = false;
  const open = isOpen();
  el.classList.toggle("closed", !open);
  el.innerHTML = `<header><button class="cl-toggle" title="${open ? "Collapse" : "Expand"}"><span class="cl-ring" style="--p:${Math.round(n / need.length * 100)}"><b>${n}/${need.length}</b></span><span><b>${all ? "You're ready to play" : "Get set up"}</b><small>${all ? "Everything's in place. Have a great session." : "A few steps and you're ready for game night"}</small></span></button><button class="cl-x" title="Hide (Settings → General brings it back)">${icon("x")}</button></header>
    ${open ? `<ol>${rows.map(r => `<li class="${r.ok ? "ok" : ""}"><button data-k="${r.k}"><span class="cl-box">${r.ok ? icon("check") : ""}</span><span><b>${esc(r.t)}</b><small>${esc(r.d)}</small></span>${r.optional ? `<em>optional</em>` : ""}</button></li>`).join("")}</ol>` : ""}`;
  $(".cl-toggle", el).onclick = () => { setOpen(!open); render(); };
  $(".cl-x", el).onclick = () => { S.data.prefs.checklistHidden = true; save(); render(); };
  $$("[data-k]", el).forEach(b => b.onclick = () => STEPS.find(s => s.k === b.dataset.k).go(A_));
}
