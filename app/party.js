// Party: character sheets for the players, laid out the way your system works.
import { $, $$, esc, h, icon, toast, uid, debounce, ls } from "./util.js";
import { C, save } from "./store.js";
import { Stage } from "./bridge.js";
import { shrinkImage } from "./board.js";
import { renderStash } from "./stash.js";

const PALETTE = ["#ef7f8f", "#c39bd3", "#a7cf9e", "#8fc3d9", "#f0c35a", "#ff9a66", "#e2e2e2"];
export function sheetLayout(c = C()) {
  return (c.sheet ||= { stats: [...(c.statTemplate || ["Might", "Agility", "Wits", "Will"]).filter(s => !/^(hp|defense|speed)$/i.test(s))], resources: ["HP"], roll: "1d20+{value}", fields: ["Abilities", "Inventory", "Notes"] });
}
// ready-made sheet layouts; anything can be edited after
export const SHEET_PRESETS = {
  "Fate Core": { stats: ["Athletics", "Burglary", "Contacts", "Crafts", "Deceive", "Drive", "Empathy", "Fight", "Investigate", "Lore", "Notice", "Physique", "Provoke", "Rapport", "Resources", "Shoot", "Stealth", "Will"], resources: ["Physical stress", "Mental stress", "Fate points"], fields: ["Aspects", "Stunts", "Consequences", "Notes"], roll: "4dF+{value}" },
  "Fate Accelerated": { stats: ["Careful", "Clever", "Flashy", "Forceful", "Quick", "Sneaky"], resources: ["Stress", "Fate points"], fields: ["Aspects", "Stunts", "Consequences", "Notes"], roll: "4dF+{value}" },
  "d20": { stats: ["Might", "Agility", "Wits", "Will"], resources: ["HP"], fields: ["Abilities", "Inventory", "Notes"], roll: "1d20+{value}" },
};
export function member(c, id) { return c.party.find(m => m.id === id); }
export function res(m, name) { m.res ||= {}; return (m.res[name] ||= { cur: "", max: "" }); }

export function partyStreamState(c = C()) {
  if (!c.ui.partyOnStream) return { kind: "party", show: false };
  return { kind: "party", show: true, list: c.party.map(m => {
    const hp = m.res?.HP || {};
    return { name: m.character || m.player, color: m.color, portrait: m.portrait || null, hp: Number(hp.cur), max: Number(hp.max), conds: m.conds || [] };
  }) };
}
let pt; export function pushParty() { clearTimeout(pt); pt = setTimeout(() => Stage.overlay(partyStreamState()), 80); }

export function createParty(el, App) {
  const st = { sel: C().ui.member || null };
  el.innerHTML = `<div class="party"><header class="pt-head" id="ptHead"></header><div class="pt-body"><div class="pt-grid" id="ptGrid"></div><aside class="pt-stash" id="ptStash"></aside></div></div>`;
  const touch = debounce(() => { save(); pushParty(); }, 300);

  function render() {
    const c = C(), L = sheetLayout(c);
    $("#ptHead", el).innerHTML = `<div><div class="eyebrow">${esc(c.name)}</div><h2>The party</h2></div><div style="flex:1"></div>
      <label class="toggle"><input type="checkbox" id="ptStream" ${c.ui.partyOnStream ? "checked" : ""}> ${icon("stream")} Party health on stream</label>
      <button class="btn" id="ptTable" title="Players open their sheet on their phone">${icon("stream")} Phones</button><button class="btn" id="ptLayout">${icon("gear")} Sheet layout</button><button class="btn primary" id="ptAdd">${icon("plus")} Add character</button>`;
    $("#ptStream", el).onchange = e => { c.ui.partyOnStream = e.target.checked; save(); pushParty(); };
    $("#ptLayout", el).onclick = layoutModal;
    $("#ptTable", el).onclick = () => import("./players.js").then(x => x.tableModal());
    $("#ptAdd", el).onclick = () => { const m = { id: uid(), player: "", character: "", role: "", color: PALETTE[c.party.length % PALETTE.length] }; c.party.push(m); st.sel = m.id; save(); render(); setTimeout(() => $(`[data-m="${m.id}"] [data-k=character]`, el)?.focus(), 30); };
    renderStash($("#ptStash", el), App);
    const grid = $("#ptGrid", el);
    if (!c.party.length) { grid.innerHTML = `<div class="empty"><h3>Who's at the table?</h3><p>Add each player's character. Set the sheet layout to your system's stats and resources, and stat rolls become one click.</p></div>`; return; }
    grid.innerHTML = c.party.map(m => sheet(m, L)).join("");
    $$(".csheet", grid).forEach(card => bind(card, c.party.find(m => m.id === card.dataset.m), L));
  }
  function sheet(m, L) {
    const r = n => res(m, n);
    return `<article class="csheet" data-m="${m.id}" style="--mc:${esc(m.color)}">
      <header>
        <button class="portrait" data-portrait title="Change portrait" style="${m.portrait ? `background-image:url(${m.portrait})` : ""}">${m.portrait ? "" : esc((m.character || m.player || "?")[0] || "?")}</button>
        <div class="who"><input class="cname" type="text" data-k="character" value="${esc(m.character)}" placeholder="Character name">
          <div class="row" style="gap:6px"><input type="text" data-k="role" value="${esc(m.role)}" placeholder="Class / role" style="flex:1"><input type="text" data-k="player" value="${esc(m.player)}" placeholder="Player" style="width:110px"></div>
          <input type="text" data-k="discord" value="${esc(m.discord || "")}" placeholder="Discord name (for /check, /init, /me)" class="dc-in" title="${m.discordId ? "Linked: whispers reach this player" : "Not linked yet: the player uses any bot command once"}"></div>
        <div class="pt-ops"><input type="color" data-k="color" value="${esc(m.color)}" title="Color"><button class="tb jn-btn" data-jn title="Their journal (written on their phone)">${icon("book")}${m.journal && m.journal.updated > (m.journal.seen || 0) ? `<i class="jn-dot"></i>` : ""}</button><button class="tb" data-wh title="${m.discordId ? "Whisper (private Discord message)" : "Whisper: they need to use the dice bot once first"}">${icon("lock")}</button><button class="tb" data-rm title="Remove">${icon("trash")}</button></div>
      </header>
      <div class="resources">${L.resources.map(n => { const x = r(n), cur = Number(x.cur), max = Number(x.max), pct = max ? Math.max(0, Math.min(100, cur / max * 100)) : 0;
        return `<div class="resrc" data-res="${esc(n)}"><div class="rh"><span>${esc(n)}</span><span class="mono"><input type="number" data-cur value="${esc(x.cur)}">/<input type="number" data-max value="${esc(x.max)}"></span></div><div class="bar"><i style="width:${pct}%"></i></div><div class="rb"><button data-d="-5">−5</button><button data-d="-1">−1</button><button data-d="1">+1</button><button data-d="5">+5</button></div></div>`; }).join("")}</div>
      <div class="cstats">${L.stats.map(sn => `<div class="cstat"><button class="sroll" data-stat="${esc(sn)}" title="Roll ${esc(sn)}">${esc(sn)}</button><input type="text" data-statv="${esc(sn)}" value="${esc(m.stats?.[sn] ?? "")}"></div>`).join("")}</div>
      <div class="conds-row">${(m.conds || []).map((k, i) => `<button class="cond" data-cond="${i}" title="Remove">${esc(k)}</button>`).join("")}<input type="text" class="cond-in" placeholder="+ condition" aria-label="Add condition"></div>
      <div class="tabs-row">${L.fields.map((f, i) => `<button class="${(m._tab ?? 0) === i ? "on" : ""}" data-tab="${i}">${esc(f)}</button>`).join("")}</div>
      <textarea class="ctext" rows="5" data-field="${esc(L.fields[m._tab ?? 0] || "Notes")}" placeholder="${esc(L.fields[m._tab ?? 0] || "Notes")}">${esc(m.text?.[L.fields[m._tab ?? 0]] || "")}</textarea>
    </article>`;
  }
  function bind(card, m, L) {
    $$("[data-k]", card).forEach(i => i.oninput = () => { m[i.dataset.k] = i.value; if (i.dataset.k === "color") card.style.setProperty("--mc", i.value); touch(); });
    $("[data-wh]", card).onclick = () => App.modal(`<h2>Whisper to ${esc(m.character || m.player)}</h2><textarea id="wT" rows="5" placeholder="Only you notice the cold draft from behind the bookcase."></textarea><div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>${icon("lock")} Send privately</button></div>`, (mm, close) => {
      $("[data-x]", mm).onclick = close;
      $("[data-ok]", mm).onclick = async () => { const t = $("#wT", mm).value.trim(); if (!t) return toast("Write the message first"); const r = await App.whisper(m, { text: t }); if (r?.ok) close(); };
    });
    $("[data-jn]", card).onclick = () => {
      const J = m.journal || { entries: [], goals: [] }; if (m.journal) { m.journal.seen = Date.now(); save(); }
      App.modal(`<h2>${esc(m.character || m.player)}'s journal</h2><p style="margin:0;color:var(--dim)">Written on their phone through the table link. Only you and they can see it.</p>
        <div class="sec-h"><h3>Goals</h3><div class="line"></div></div>
        <ul class="checks">${J.goals.map(g => `<li class="${g.done ? "done" : ""}" style="display:block">${g.done ? "✓ " : "○ "}${esc(g.text)}</li>`).join("") || `<li style="display:block;color:var(--faint)">No goals yet.</li>`}</ul>
        <div class="sec-h"><h3>Entries</h3><div class="line"></div></div>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto">${J.entries.map(e => `<div style="border-left:3px solid ${esc(m.color)};padding:4px 10px"><div class="eyebrow">${new Date(e.t).toLocaleString()}</div><div style="white-space:pre-wrap">${esc(e.text)}</div></div>`).join("") || `<span style="color:var(--faint)">Nothing written yet. Players write in the Journal tab of the table link.</span>`}</div>
        <div class="foot"><button class="btn primary" data-x>Close</button></div>`, (mm, close) => { $("[data-x]", mm).onclick = close; });
      render();
    };
    $("[data-rm]", card).onclick = () => App.confirm(`Remove ${m.character || m.player || "this character"}?`, "Their sheet is deleted. Past sessions keep their history.", "Remove", () => { C().party = C().party.filter(x => x !== m); save(); render(); pushParty(); });
    $("[data-portrait]", card).onclick = () => { const f = h(`<input type="file" accept="image/*">`); f.onchange = async () => { if (f.files[0]) { m.portrait = await shrinkImage(f.files[0], 320); save(); render(); pushParty(); } }; f.click(); };
    $$(".resrc", card).forEach(rd => {
      const x = res(m, rd.dataset.res);
      const upd = () => { save(); render(); pushParty(); syncCombat(m); };
      $("[data-cur]", rd).onchange = e => { x.cur = e.target.value === "" ? "" : Number(e.target.value); upd(); };
      $("[data-max]", rd).onchange = e => { x.max = e.target.value === "" ? "" : Number(e.target.value); if (x.cur === "") x.cur = x.max; upd(); };
      $$("[data-d]", rd).forEach(b => b.onclick = () => { x.cur = (Number(x.cur) || 0) + Number(b.dataset.d); if (x.max !== "" && x.cur > Number(x.max)) x.cur = Number(x.max); upd(); });
    });
    $$("[data-statv]", card).forEach(i => i.oninput = () => { (m.stats ||= {})[i.dataset.statv] = i.value; touch(); });
    $$("[data-stat]", card).forEach(b => b.onclick = e => {
      const v = m.stats?.[b.dataset.stat]; const num = parseInt(v);
      if (isNaN(num)) return toast(`Give ${b.dataset.stat} a number first`);
      const expr = (L.roll || "1d20+{value}").replace(/\{value\}/g, num).replace(/\+-/g, "-");
      App.roll(expr, b.dataset.stat, { secret: e.shiftKey, who: m.character || m.player });
    });
    $$("[data-cond]", card).forEach(b => b.onclick = () => { m.conds.splice(+b.dataset.cond, 1); save(); render(); pushParty(); });
    $(".cond-in", card).onkeydown = e => { if (e.key === "Enter" && e.target.value.trim()) { (m.conds ||= []).push(e.target.value.trim()); save(); render(); pushParty(); } };
    $$("[data-tab]", card).forEach(b => b.onclick = () => { m._tab = +b.dataset.tab; render(); });
    $(".ctext", card).oninput = e => { (m.text ||= {})[e.target.dataset.field] = e.target.value; touch(); };
  }
  function syncCombat(m) {
    const cb = C().combat; if (!cb) return;
    const x = cb.list.find(y => y.ref === m.id); if (!x) return;
    const hp = m.res?.HP; if (hp) { x.hp = hp.cur; x.max = hp.max; save(); import("./combat.js").then(mod => mod.pushCombat()); }
  }
  function layoutModal() {
    const L = sheetLayout();
    App.modal(`<h2>Sheet layout</h2><p style="margin:0;color:var(--dim)">Shape the character sheet to your system. One per line.</p>
      <div class="grid3" style="grid-template-columns:1fr 1fr 1fr">
        <label class="f"><span>Stats</span><textarea id="lS" rows="8">${esc(L.stats.join("\n"))}</textarea></label>
        <label class="f"><span>Resources (with max)</span><textarea id="lR" rows="8">${esc(L.resources.join("\n"))}</textarea></label>
        <label class="f"><span>Text tabs</span><textarea id="lF" rows="8">${esc(L.fields.join("\n"))}</textarea></label>
      </div>
      <label class="f"><span>Stat roll</span><input type="text" id="lRoll" class="mono" value="${esc(L.roll)}"></label>
      <div class="row" style="gap:6px;align-items:center"><span class="eyebrow">Start from</span>${Object.keys(SHEET_PRESETS).map(k => `<button class="chip" data-preset="${esc(k)}">${esc(k)}</button>`).join("")}</div>
      <p class="md-help" style="margin:0"><code>{value}</code> is the stat. Examples: <code>1d20+{value}</code> (add the stat), <code>{value}d6&gt;=5</code> (dice pool, count 5s and 6s), <code>1d100&lt;={value}</code> (roll under the stat), <code>2d6+{value}</code>, <code>4dF+{value}</code> (Fate: results read off the ladder, +2 Fair, +3 Good…). Shift-click a stat for a secret roll. Name a resource <b>HP</b> to link it to the combat tracker.</p>
      <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save layout</button></div>`, (mm, close) => {
      $("[data-x]", mm).onclick = close;
      $$("[data-preset]", mm).forEach(b => b.onclick = () => { const P = SHEET_PRESETS[b.dataset.preset]; $("#lS", mm).value = P.stats.join("\n"); $("#lR", mm).value = P.resources.join("\n"); $("#lF", mm).value = P.fields.join("\n"); $("#lRoll", mm).value = P.roll; toast(`${b.dataset.preset} layout filled in. Save to use it`); });
      $("[data-ok]", mm).onclick = () => {
        const lines = id => $(id, mm).value.split("\n").map(s => s.trim()).filter(Boolean);
        Object.assign(L, { stats: lines("#lS"), resources: lines("#lR"), fields: lines("#lF").length ? lines("#lF") : ["Notes"], roll: $("#lRoll", mm).value.trim() || "1d20+{value}" });
        save(); close(); render(); App.botConfig?.();
      };
    });
  }
  render(); pushParty();
  return { show() { render(); }, refresh() { render(); pushParty(); } };
}
