// Clocks & calendar: progress clocks for factions and dangers, and the world's own calendar.
import { $, $$, esc, h, icon, toast, uid, debounce } from "./util.js";
import { C, save } from "./store.js";
import { Stage } from "./bridge.js";

export function clockSVG(segs, filled, color, size = 120) {
  const r = 46, cx = 50, cy = 50, parts = [];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / segs) * Math.PI * 2 - Math.PI / 2;
    const p = (a) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    parts.push(`<path data-seg="${i}" d="M${cx},${cy} L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z" fill="${i < filled ? color : "transparent"}" stroke="currentColor" stroke-width="2.5"/>`);
  }
  return `<svg class="clock-svg" viewBox="0 0 100 100" width="${size}" height="${size}">${parts.join("")}<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="3.5"/></svg>`;
}
const STANDING = ["Sworn enemies", "Hostile", "Wary", "Unfriendly", "Neutral", "Friendly", "Trusted", "Allied", "Devoted"];
export const standing = v => STANDING[Math.max(0, Math.min(8, v + 4))];
export function clocksStream(c = C()) { const list = (c.clocks || []).filter(k => k.onStream); return { kind: "clocks", show: list.length > 0, list: list.map(k => ({ name: k.name, segs: k.segs, filled: k.filled, color: k.color })) }; }
const pushClocks = () => Stage.overlay(clocksStream());

const DEFAULT_CAL = { months: ["Deepwinter", "Thawing", "Seedtime", "Greening", "Highsun", "Goldfall", "Harvest", "Ashfall", "Frostfall", "Longnight"].map(n => ({ name: n, days: 30 })), weekdays: ["Moonday", "Tideday", "Ashday", "Thornday", "Feastday", "Starday", "Restday"], year: 412, month: 7, day: 2, era: "AC", events: [] };

export function createClocks(el, App) {
  el.innerHTML = `<div class="clocksv"><header class="pt-head"><div><div class="eyebrow">World</div><h2>Clocks & calendar</h2></div><div style="flex:1"></div><button class="btn primary" id="ckAdd">${icon("plus")} New clock</button></header><div class="ck-grid"><div style="overflow:auto;min-width:0"><section class="ck-list" id="ckList"></section><section class="rep" id="ckRep"></section></div><aside class="ck-cal" id="ckCal"></aside></div></div>`;
  const clocks = () => (C().clocks ||= []);
  const cal = () => (C().calendar ||= JSON.parse(JSON.stringify(DEFAULT_CAL)));
  const touch = debounce(save, 300);

  function renderClocks() {
    const box = $("#ckList", el), L = clocks();
    box.innerHTML = L.length ? L.map(k => `<article class="clock" data-id="${k.id}" style="--kc:${esc(k.color)}">
        <div class="clock-face" style="color:${esc(k.color)}">${clockSVG(k.segs, k.filled, k.color, 132)}<span class="ck-n mono">${k.filled}/${k.segs}</span></div>
        <div class="clock-body"><input class="ck-name" type="text" value="${esc(k.name)}" placeholder="The Ash Crown takes the dam">
          <div class="row" style="gap:6px"><button class="btn sm" data-tick="-1">−</button><button class="btn sm primary" data-tick="1">Tick +1</button>
            <select data-segs style="width:auto;height:28px;padding:0 6px">${[4, 6, 8, 10, 12].map(n => `<option ${n === k.segs ? "selected" : ""}>${n}</option>`).join("")}</select>
            <input type="color" data-color value="${esc(k.color)}"></div>
          <textarea data-note rows="2" placeholder="What happens when it fills?">${esc(k.note || "")}</textarea>
          <div class="row" style="gap:10px"><label class="toggle"><input type="checkbox" data-stream ${k.onStream ? "checked" : ""}> On stream</label><span style="flex:1"></span><button class="btn sm ghost danger" data-del>${icon("trash")}</button></div>
        </div>${k.filled >= k.segs ? `<div class="ck-full">Filled</div>` : ""}</article>`).join("")
      : `<div class="empty" style="height:auto;padding-top:50px"><h3>Progress clocks</h3><p>Track what moves while the party isn't looking: a faction's plan, a ritual, the guards' suspicion. Tick a segment when it advances; when it fills, it happens.</p></div>`;
    $$(".clock", box).forEach(card => {
      const k = L.find(x => x.id === card.dataset.id);
      $$("[data-seg]", card).forEach(p => p.onclick = () => { const i = +p.dataset.seg; k.filled = k.filled === i + 1 ? i : i + 1; save(); renderClocks(); pushClocks(); });
      $(".ck-name", card).oninput = e => { k.name = e.target.value; touch(); pushClocks(); };
      $$("[data-tick]", card).forEach(b => b.onclick = () => { k.filled = Math.max(0, Math.min(k.segs, k.filled + +b.dataset.tick)); save(); renderClocks(); pushClocks(); if (k.filled === k.segs && +b.dataset.tick > 0) toast(`"${k.name}" has filled`); });
      $("[data-segs]", card).onchange = e => { k.segs = +e.target.value; k.filled = Math.min(k.filled, k.segs); save(); renderClocks(); pushClocks(); };
      $("[data-color]", card).onchange = e => { k.color = e.target.value; save(); renderClocks(); pushClocks(); };
      $("[data-note]", card).oninput = e => { k.note = e.target.value; touch(); };
      $("[data-stream]", card).onchange = e => { k.onStream = e.target.checked; save(); pushClocks(); };
      $("[data-del]", card).onclick = () => App.confirm(`Delete "${k.name || "this clock"}"?`, "The clock is removed.", "Delete", () => { C().clocks = L.filter(x => x !== k); save(); renderClocks(); pushClocks(); });
    });
  }
  function renderCal() {
    const box = $("#ckCal", el), K = cal(), m = K.months[K.month] || K.months[0];
    const dayIndex = K.months.slice(0, K.month).reduce((s, x) => s + x.days, 0) + K.day - 1 + K.year * K.months.reduce((s, x) => s + x.days, 0);
    const wd = K.weekdays.length ? K.weekdays[dayIndex % K.weekdays.length] : "";
    const evs = K.events.filter(e => e.month === K.month).sort((a, b) => a.day - b.day);
    box.innerHTML = `<div class="sec-h"><h3>Calendar</h3><div class="line"></div><button class="btn sm ghost" id="calEdit">${icon("gear")}</button></div>
      <div class="cal-today"><span class="eyebrow">Today in the world</span><b>${esc(wd ? wd + ", " : "")}${K.day} ${esc(m.name)}</b><span>Year ${K.year} ${esc(K.era || "")}</span></div>
      <div class="row" style="gap:6px;margin:10px 0"><button class="btn sm" data-adv="-1">−1 day</button><button class="btn sm primary" data-adv="1">+1 day</button><button class="btn sm" data-adv="7">+1 week</button><button class="btn sm" data-adv="${m.days}">+1 month</button></div>
      <div class="cal-grid">${Array.from({ length: m.days }, (_, i) => { const d = i + 1, ev = evs.filter(e => e.day === d); return `<button class="cal-d ${d === K.day ? "today" : ""} ${ev.length ? "ev" : ""}" data-d="${d}" title="${esc(ev.map(e => e.title).join(", "))}">${d}</button>`; }).join("")}</div>
      <div class="sec-h" style="margin-top:16px"><h3 style="font-size:18px">${esc(m.name)} events</h3><div class="line"></div></div>
      <ul class="cal-ev">${evs.map(e => `<li data-e="${e.id}"><b class="mono">${e.day}</b><span>${esc(e.title)}</span><button class="x">${icon("x")}</button></li>`).join("") || `<li class="none">Click a day to add an event: a festival, a deadline, a full moon.</li>`}</ul>
      <button class="btn sm" id="calStamp" style="margin-top:10px">${icon("chronicle")} Use as tonight's in-world date</button>`;
    const advance = n => { let { year, month, day } = K; day += n; while (day > K.months[month].days) { day -= K.months[month].days; month++; if (month >= K.months.length) { month = 0; year++; } } while (day < 1) { month--; if (month < 0) { month = K.months.length - 1; year--; } day += K.months[month].days; } Object.assign(K, { year, month, day }); save(); renderCal();
      const hit = K.events.filter(e => e.month === month && e.day === day); if (hit.length) toast(`Today: ${hit.map(e => e.title).join(", ")}`); };
    $$("[data-adv]", box).forEach(b => b.onclick = () => advance(+b.dataset.adv));
    $$("[data-d]", box).forEach(b => b.onclick = () => App.modal(`<h2>${b.dataset.d} ${esc(m.name)}</h2><label class="f"><span>Event</span><input type="text" id="evT" placeholder="Festival of the Drowned Bell"></label><div class="foot"><button class="btn ghost" data-today>Make this today</button><button class="btn primary" data-ok>Add event</button></div>`, (mm, close) => {
      $("[data-today]", mm).onclick = () => { K.day = +b.dataset.d; save(); close(); renderCal(); };
      const ok = () => { const t = $("#evT", mm).value.trim(); if (t) { K.events.push({ id: uid(), month: K.month, day: +b.dataset.d, title: t }); save(); } close(); renderCal(); };
      $("[data-ok]", mm).onclick = ok; $("#evT", mm).onkeydown = e => { if (e.key === "Enter") ok(); };
    }));
    $$(".cal-ev li[data-e]", box).forEach(li => $(".x", li).onclick = () => { K.events = K.events.filter(e => e.id !== li.dataset.e); save(); renderCal(); });
    $("#calStamp", box).onclick = () => { const s = C().sessions.find(x => x.status === "live") || C().sessions.find(x => x.status === "planned"); if (!s) return toast("No session is running or planned"); s.ingame = `${K.day} ${m.name}, ${K.year} ${K.era || ""}`.trim(); save(); toast(`Session ${s.num}: ${s.ingame}`); };
    $("#calEdit", box).onclick = () => App.modal(`<h2>Your calendar</h2>
      <div class="two"><label class="f"><span>Months (name, days)</span><textarea id="cM" rows="10">${esc(K.months.map(x => `${x.name}, ${x.days}`).join("\n"))}</textarea></label>
      <label class="f"><span>Weekdays</span><textarea id="cW" rows="10">${esc(K.weekdays.join("\n"))}</textarea></label></div>
      <div class="grid3"><label class="f"><span>Year</span><input type="number" id="cY" value="${K.year}"></label><label class="f"><span>Era</span><input type="text" id="cE" value="${esc(K.era || "")}"></label><span></span></div>
      <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save calendar</button></div>`, (mm, close) => {
      $("[data-x]", mm).onclick = close;
      $("[data-ok]", mm).onclick = () => {
        const months = $("#cM", mm).value.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [n, d] = l.split(","); return { name: n.trim(), days: Math.max(1, parseInt(d) || 30) }; });
        if (!months.length) return toast("Add at least one month");
        Object.assign(K, { months, weekdays: $("#cW", mm).value.split("\n").map(s => s.trim()).filter(Boolean), year: +$("#cY", mm).value || 1, era: $("#cE", mm).value.trim() });
        K.month = Math.min(K.month, months.length - 1); K.day = Math.min(K.day, months[K.month].days); save(); close(); renderCal();
      };
    });
  }
  $("#ckAdd", el).onclick = () => { clocks().push({ id: uid(), name: "", segs: 6, filled: 0, color: ["#ff7a3d", "#f39da8", "#a8d3e4", "#b8d8a8", "#cfb2e2"][clocks().length % 5], note: "", onStream: false }); save(); renderClocks(); $$(".ck-name", el).pop()?.focus(); };
  function renderRep() {
    const box = $("#ckRep", el), c = C(), R = (c.rep ||= []);
    const factions = c.notes.filter(n => n.cat === "Factions" && !R.some(r => r.note === n.id));
    box.innerHTML = `<div class="sec-h"><h3>Reputation</h3><div class="line"></div><button class="btn sm" id="repAdd">${icon("plus")} Add</button></div>
      ${R.length ? R.map(r => { const n = r.note && c.notes.find(x => x.id === r.note); const name = n ? n.title : r.name; return `<div class="rep-row" data-id="${r.id}"><b>${esc(name)}</b>
        <div class="rep-bar">${[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(v => `<button data-v="${v}" class="${v === r.v ? "on" : ""} ${v < 0 ? "neg" : v > 0 ? "pos" : "mid"}" title="${standing(v)}"></button>`).join("")}</div>
        <span class="rep-w">${standing(r.v)}</span><button class="tb" data-x title="Remove">${icon("x")}</button></div>`; }).join("")
      : `<p class="md-help" style="margin:0">How the party stands with factions, towns and powerful people. Factions from your Codex can be added in one click.</p>`}`;
    $("#repAdd", box).onclick = () => App.modal(`<h2>Track reputation with…</h2>${factions.length ? `<div class="chips">${factions.map(n => `<button class="chip" data-n="${n.id}">${esc(n.title)}</button>`).join("")}</div>` : ""}<label class="f"><span>Or type a name</span><input type="text" id="rN" placeholder="The Salt Kings"></label><div class="foot"><button class="btn primary" data-ok>Add</button></div>`, (m, close) => {
      $$("[data-n]", m).forEach(b => b.onclick = () => { R.push({ id: uid(), note: b.dataset.n, v: 0 }); save(); close(); renderRep(); });
      const ok = () => { const v = $("#rN", m).value.trim(); if (v) { R.push({ id: uid(), name: v, v: 0 }); save(); } close(); renderRep(); };
      $("[data-ok]", m).onclick = ok; $("#rN", m).onkeydown = e => { if (e.key === "Enter") ok(); };
    });
    $$(".rep-row", box).forEach(row => {
      const r = R.find(x => x.id === row.dataset.id);
      $$("[data-v]", row).forEach(b => b.onclick = () => { const old = r.v; r.v = +b.dataset.v; save(); renderRep(); if (old !== r.v) toast(`${row.querySelector("b").textContent}: ${standing(r.v)}`); });
      $("[data-x]", row).onclick = () => { c.rep = R.filter(x => x !== r); save(); renderRep(); };
    });
  }
  renderClocks(); renderCal(); renderRep(); pushClocks();
  return { show() { renderClocks(); renderCal(); renderRep(); }, refresh() { renderClocks(); renderCal(); renderRep(); } };
}
