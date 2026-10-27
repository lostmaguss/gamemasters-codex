// Party stash: the money and loot the group carries together, with a ledger of where it came from.
import { $, $$, esc, icon, toast, uid, cap } from "./util.js";
import { C, save } from "./store.js";
import { Stage } from "./bridge.js";

export const UNIT = { fantasy: "gold", scifi: "credits", cyberpunk: "eddies" };
const REVEAL_SFX = { fantasy: "magic", scifi: "comms", cyberpunk: "glitch" };
export function stash(c = C()) {
  return (c.stash ||= { money: 0, unit: UNIT[c.genre || "fantasy"], items: [], log: [] });
}
const fmt = n => Number(n || 0).toLocaleString("en-US");
const num = s => parseInt(String(s).replace(/[,\s]/g, "").match(/-?\d+/)?.[0] ?? "", 10);
function logIt(S, text) { S.log.unshift({ id: uid(), t: Date.now(), text }); S.log.length = Math.min(S.log.length, 200); }

// Add money and/or things from anywhere (Forge, Live, a modal).
export function addToStash({ money = 0, items = [], from = "" } = {}) {
  const S = stash();
  if (money) S.money = (Number(S.money) || 0) + money;
  for (const it of items) S.items.push({ id: uid(), name: it.name, qty: it.qty || 1, note: it.note || "", value: it.value || "", holder: it.holder || "" });
  const parts = [money ? `${fmt(money)} ${S.unit}` : "", ...items.map(i => (i.qty > 1 ? `${i.qty}× ` : "") + i.name)].filter(Boolean);
  if (parts.length) logIt(S, `Found ${parts.join(", ")}${from && !items.some(i => i.name === from) ? ` · ${from}` : ""}`);
  save(); return parts;
}
// Turn a Forge card into stash entries: coins become money, valuables become items.
export function fromForgeCard(cur, g) {
  const f = cur.fields || {}, items = []; let money = 0;
  if (cur.kind === "loot") {
    if (f.coin) money = num(f.coin) || 0;
    String(f.valuables || "").split(/,\s*/).filter(Boolean).forEach(v => items.push({ name: cap(v) }));
    if (f.item) items.push({ name: f.item });
  } else if (cur.kind === "item") {
    items.push({ name: cur.title, note: g.sub(cur.ctx, f), value: f.value || "" });
  }
  return { money, items, from: cur.title };
}
export function revealLoot(it, App) {
  const c = C();
  Stage.overlay({ kind: "loot", show: true, id: uid(), name: it.name, note: it.note || "", value: it.value || "", eyebrow: it.money ? "Coin" : "Loot", secs: 9 });
  if (!App.streamLive) Stage.open();
  App.sound.send({ op: "play", key: "loot:" + Date.now(), sound: { synth: REVEAL_SFX[c.genre || "fantasy"] || "magic" }, loop: false, vol: .7 });
  toast(`Revealed ${it.name} on stream`);
}
export function stashSummary(c = C()) {
  const S = stash(c), who = id => c.party.find(m => m.id === id);
  return { money: `${fmt(S.money)} ${S.unit}`, items: S.items.map(i => `${i.qty > 1 ? i.qty + "× " : ""}${i.name}${i.holder && who(i.holder) ? ` (${who(i.holder).character || who(i.holder).player})` : ""}`) };
}

export function renderStash(host, App) {
  const c = C(), S = stash(c);
  const holderOpts = sel => `<option value="">Shared</option>` + c.party.map(m => `<option value="${m.id}" ${sel === m.id ? "selected" : ""}>${esc(m.character || m.player || "?")}</option>`).join("");
  host.innerHTML = `<div class="sh-h"><div><div class="eyebrow">Carried together</div><h3>Party stash</h3></div><button class="tb" id="shUnit" title="Rename the currency">${icon("gear")}</button></div>
    <div class="sh-money ${S.money < 0 ? "neg" : ""}"><b class="mono">${fmt(S.money)}</b><span>${esc(S.unit)}</span></div>
    <div class="sh-mrow"><input type="text" id="shAmt" class="mono" placeholder="+250, -40" aria-label="Amount"><input type="text" id="shWhy" placeholder="What for?" aria-label="Reason"><button class="btn sm" id="shGo">Apply</button></div>
    <div class="sh-mrow"><button class="btn sm ghost" id="shSplit" ${c.party.length ? "" : "disabled"}>${icon("party")} Split evenly</button><button class="btn sm ghost" id="shShowM">${icon("stream")} Show on stream</button></div>
    <div class="sec-h"><h3>Things</h3><div class="line"></div><span class="carried">${S.items.length}</span></div>
    <ul class="sh-items">${S.items.map(i => `<li data-i="${i.id}">
      <input type="number" class="sh-q mono" min="0" value="${esc(i.qty)}" title="How many">
      <div class="sh-n"><input type="text" class="sh-name" value="${esc(i.name)}"><input type="text" class="sh-note" value="${esc(i.note)}" placeholder="Note, value, who wants it"></div>
      <select class="sh-who" title="Who carries it">${holderOpts(i.holder)}</select>
      <div class="sh-ops"><button class="tb" data-rev title="Reveal on stream">${icon("stream")}</button><button class="tb" data-rm title="Remove (used, sold, lost)">${icon("trash")}</button></div></li>`).join("") || `<li class="sh-empty">Nothing yet. Forge loot and press <b>To stash</b>, or add it here.</li>`}</ul>
    <div class="sh-add"><input type="text" id="shNew" placeholder="+ Add a thing (Enter)"></div>
    <details class="sh-log"><summary>Ledger <span class="carried">${S.log.length}</span></summary><ul>${S.log.slice(0, 60).map(l => `<li><span class="carried">${new Date(l.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span> ${esc(l.text)}</li>`).join("") || "<li class=carried>Empty</li>"}</ul></details>`;
  const redraw = () => renderStash(host, App);
  const apply = () => {
    const raw = $("#shAmt", host).value.trim(), why = $("#shWhy", host).value.trim(); const n = num(raw);
    if (isNaN(n) || !n) return toast("Type an amount like 250 or -40");
    S.money = (Number(S.money) || 0) + n;
    logIt(S, `${n > 0 ? "+" : "−"}${fmt(Math.abs(n))} ${S.unit}${why ? ` · ${why}` : ""}`);
    save(); redraw();
  };
  $("#shGo", host).onclick = apply;
  [$("#shAmt", host), $("#shWhy", host)].forEach(i => i.onkeydown = e => { if (e.key === "Enter") apply(); });
  $("#shSplit", host).onclick = () => {
    const n = c.party.length, each = Math.floor((Number(S.money) || 0) / n), left = (Number(S.money) || 0) - each * n;
    if (each <= 0) return toast("Not enough to split");
    App.confirm(`Split ${fmt(S.money)} ${S.unit}?`, `${fmt(each)} ${S.unit} each for ${n} characters${left ? `, ${fmt(left)} stays in the stash` : ""}. Each share is added to their Inventory tab.`, "Split", () => {
      const tab = (c.sheet?.fields || []).find(f => /inv|gear|equip/i.test(f)) || (c.sheet?.fields || ["Notes"])[0];
      c.party.forEach(m => { (m.text ||= {})[tab] = ((m.text[tab] || "").trimEnd() + `\n+${fmt(each)} ${S.unit} (split)`).trimStart(); });
      S.money = left; logIt(S, `Split ${fmt(each)} ${S.unit} each among ${n}`); save(); App.refreshAll?.(); redraw();
    });
  };
  $("#shShowM", host).onclick = () => revealLoot({ name: `${fmt(S.money)} ${S.unit}`, note: "In the party's purse", money: true }, App);
  $("#shUnit", host).onclick = () => App.modal(`<h2>Currency</h2><label class="f"><span>What the party counts in</span><input type="text" id="uN" value="${esc(S.unit)}" placeholder="gold, credits, eddies, shells"></label><div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close; $("[data-ok]", m).onclick = () => { S.unit = $("#uN", m).value.trim() || S.unit; save(); close(); redraw(); };
  });
  $("#shNew", host).onkeydown = e => {
    if (e.key !== "Enter" || !e.target.value.trim()) return;
    const t = e.target.value.trim(), q = t.match(/^(\d+)\s*[x×]\s*(.+)$/i);
    addToStash({ items: [{ name: q ? q[2] : t, qty: q ? +q[1] : 1 }] }); redraw(); setTimeout(() => $("#shNew", host)?.focus(), 0);
  };
  $$(".sh-items li[data-i]", host).forEach(li => {
    const it = S.items.find(x => x.id === li.dataset.i); if (!it) return;
    $(".sh-q", li).onchange = e => { it.qty = Math.max(0, parseInt(e.target.value) || 0); if (!it.qty) { S.items = S.items.filter(x => x !== it); logIt(S, `Used up ${it.name}`); redraw(); } save(); };
    $(".sh-name", li).onchange = e => { it.name = e.target.value.trim() || it.name; save(); };
    $(".sh-note", li).onchange = e => { it.note = e.target.value; save(); };
    $(".sh-who", li).onchange = e => { it.holder = e.target.value; const m = c.party.find(x => x.id === it.holder); logIt(S, `${it.name} → ${m ? m.character || m.player : "shared"}`); save(); };
    $("[data-rev]", li).onclick = () => revealLoot(it, App);
    $("[data-rm]", li).onclick = () => { S.items = S.items.filter(x => x !== it); logIt(S, `Gone: ${it.name}`); save(); redraw(); toast(`Removed ${it.name}`); };
  });
}
