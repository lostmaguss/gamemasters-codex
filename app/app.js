import { stashSummary, UNIT as STASH_UNIT } from "./stash.js";
import { t, setLang, LANGS } from "./i18n.js";
import { initPoll } from "./poll.js";
import { SYSTEMS, systemById, applySystem } from "./systems.js";
import { openSettings, applyPrefs, LOOKS, lookFor } from "./settings.js";
import { initChecklist, markSeen } from "./checklist.js";
import { railSwitching } from "./dnd.js";
import { toggleRules, openRules } from "./rulesref.js";
import { packsModal, importModal as importPack } from "./packs.js";
import { initGmRemote, pushGm } from "./gmremote.js";
import { loadLibrary, toCreature, toSpell } from "./library.js";
import { syncCustomDice } from "./customdice.js";
import { initPlayers, tableModal, phoneWhisper, playersOnline } from "./players.js";
import { $, $$, esc, h, icon, toast, uid, keys, isMac } from "./util.js";
import { S, C, loadData, save, flush, onSaved, blankCampaign, undo, redo, onRestore } from "./store.js";
import { Stage } from "./bridge.js";
import { createForge } from "./forge.js";
import { createBoard } from "./board.js";
import { createCodex, md } from "./codex.js";
import { createChronicle } from "./chronicle.js";
import { createDice } from "./dicedesk.js";
import { createPrep } from "./prep.js";
import { createLive } from "./live.js";
import { createTonight } from "./tonight.js";
import { createTables } from "./tables.js";
import { createBestiary } from "./bestiary.js";
import { createSoundEngine } from "./sound.js";
import { parseRoll, diceGroups, buildResult, breakdown, critLabel, shownTotal, DEFAULT_RULES, customFor } from "./roll.js";
import { createCombat } from "./combat.js";
import { createMap } from "./map.js";
import { createParty } from "./party.js";
import { openPalette } from "./palette.js";
import { createBroadcast } from "./broadcast.js";
import { createClocks } from "./clocks.js";
import { unseen, newsHTML, NEWS } from "./whatsnew.js";
import { BEATS } from "./chronicle.js";
import { FX } from "./fx.js";
import * as Discord from "./discord.js";
import { rnd, ls, storeImage, toDataURL, mapStrings } from "./util.js";
import { setGenre } from "./gen.js";
import { starterTables } from "./store.js";

export function applyGenre(c = C()) {
  setGenre(c.genre || "fantasy"); setLang(c.playerLang || "en");
  const look = lookFor(c);
  if (look === "lantern") delete document.documentElement.dataset.look; else document.documentElement.dataset.look = look;
  ls.set("look", look);
}

const VIEWS = [
  { key: "prep", label: "Prep", icon: "book", make: createPrep, group: "Session" },
  { key: "tonight", label: "Tonight", icon: "star", make: createTonight },
  { key: "live", label: "Live", icon: "stream", make: createLive },
  { key: "combat", label: "Combat", icon: "combat", make: createCombat },
  { key: "map", label: "Map", icon: "map", make: createMap },
  { key: "dice", label: "Dice", icon: "dice", make: createDice },
  { key: "broadcast", label: "Stream", icon: "discord", make: createBroadcast },
  { key: "party", label: "Party", icon: "social", make: createParty, group: "Make" },
  { key: "forge", label: "Forge", icon: "forge", make: createForge },
  { key: "tables", label: "Tables", icon: "tables", make: createTables },
  { key: "bestiary", label: "Bestiary", icon: "death", make: createBestiary },
  { key: "codex", label: "Codex", icon: "codex", make: createCodex, group: "World" },
  { key: "board", label: "Board", icon: "board", make: createBoard },
  { key: "clocks", label: "Clocks", icon: "clock", make: createClocks },
  { key: "chronicle", label: "Chronicle", icon: "chronicle", make: createChronicle },
];
const mounted = {};
let current = null;

// ---- shared helpers other views call ----
export const App = {
  go(key, arg) { show(key, arg); },
  save,
  modal(html, mount) {
    const back = h(`<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`);
    const close = () => { back.remove(); removeEventListener("keydown", onKey, true); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    addEventListener("keydown", onKey, true);
    back.addEventListener("mousedown", e => { if (e.target === back) close(); });
    document.body.append(back);
    mount?.(back.firstElementChild, close);
    if (!back.contains(document.activeElement)) (back.querySelector("input[type=text],input[type=search],textarea") || back.querySelector("input,select,button"))?.focus();
    return close;
  },
  menu(anchor, items) {
    $$(".menu").forEach(m => m.remove());
    const m = h(`<div class="menu" role="menu"></div>`);
    for (const it of items) {
      if (it === "-") { m.append(h("<hr>")); continue; }
      if (it.label && !it.run) { m.append(h(`<div class="lbl eyebrow">${esc(it.label)}</div>`)); continue; }
      const b = h(`<button class="${it.cur ? "cur" : ""}">${it.icon ? icon(it.icon) : ""}<span>${esc(it.text)}</span></button>`);
      b.onclick = () => { m.remove(); it.run(); };
      m.append(b);
    }
    document.body.append(m);
    const r = anchor.getBoundingClientRect();
    m.style.left = Math.min(r.left, innerWidth - m.offsetWidth - 8) + "px"; m.style.top = (r.bottom + 6) + "px";
    setTimeout(() => addEventListener("mousedown", function off(e) { if (!m.contains(e.target)) { m.remove(); removeEventListener("mousedown", off); } }), 0);
  },
  // pin something from anywhere onto the current board
  pinToBoard(card) {
    const c = C(); const bid = c.ui.board || c.boards[0].id; const b = c.boards.find(x => x.id === bid) || c.boards[0];
    const v = b.view || { x: 0, y: 0, z: 1 };
    const host = $("#views").getBoundingClientRect();
    const x = (host.width / 2 - v.x) / v.z - 120 + Math.random() * 120, y = (host.height / 2 - v.y) / v.z - 100 + Math.random() * 80;
    const maxZ = Math.max(1, ...b.cards.map(k => k.z || 1));
    b.cards.push({ id: uid(), x, y, w: 250, rot: (Math.random() * 4 - 2).toFixed(2), z: maxZ + 1, color: "paper", title: "", text: "", ...card });
    save(); mounted.board?.refresh();
    toast("Pinned to " + b.name);
  },
  refreshAll() { for (const k in mounted) if (k !== current) mounted[k].refresh?.(); mounted[current]?.refresh?.(); },

  // ---- rolls from anywhere: stream window when open (unless secret), otherwise right here ----
  roll(expr, label = "", { secret = false, who = "", id = uid(), onResult } = {}) {
    let terms; try { terms = parseRoll(expr); } catch (e) { toast(e.message); return; }
    // a player's roll gets their sheet color on the dice
    const pc = who && C().party.find(m => (m.character || m.player) === who);
    const req = { id, expr, label, who, rules: C().rules, color: pc?.color || null, custom: customFor(expr) };
    if (onResult) App._rollCbs.set(id, onResult);
    if (!secret && App.streamLive) { Stage.roll(req); rollToast({ ...req, pending: true }); return; }
    const vals = diceGroups(terms).map(g => Array.from({ length: g.count }, () => rnd(g.sides) + 1));
    const r = buildResult(req, terms, vals); r.secret = secret;
    App.recordRoll(r); rollToast(r);
    const cb = App._rollCbs.get(id); if (cb) { App._rollCbs.delete(id); cb(r); }
    return r;
  },
  recordRoll(r) {
    const c = C(); c.rolls.unshift(r); c.rolls.length = Math.min(c.rolls.length, 80); save();
    if (!r.secret && Discord.settings(c).autoRolls && Discord.connected(c)) Discord.postRoll(r, { quiet: true });
    mounted.dice?.addLog?.(r);
  },
  _rollCbs: new Map(),
  logBeat(type, text, quiet) {
    const s = C().sessions.find(x => x.status === "live");
    if (!s) { toast("Start a session (Prep or Live) to log scenes"); return; }
    s.beats.push({ id: uid(), type, text, star: false }); save();
    if (!quiet) toast(`Logged in Session ${s.num}`);
  },
  // ---- handouts on the stream window ----
  onAir: null, _air: new Set(),
  onAirChange(fn) { App._air.add(fn); },
  showHandout(hd) {
    App.onAir = hd; Stage.show(hd); App._air.forEach(f => f());
    // remember what was shown tonight, for the recap's pictures
    const live = C().sessions.find(x => x.status === "live"); if (live && hd.id && !(live.shown ||= []).includes(hd.id)) { live.shown.push(hd.id); save(); }
    if (Discord.settings().autoHandouts && Discord.connected()) Discord.postHandout(hd, { quiet: true });
  },
  discord: Discord,
  hideHandout() { App.onAir = null; Stage.hide(); App._air.forEach(f => f()); },
};

// ---- name cards on the stream window ----
App.lowerThird = x => { Stage.overlay({ kind: "lower", show: true, id: uid(), name: x.name, sub: x.sub || "", color: x.color || "#ff7a3d", portrait: x.portrait || null, secs: 8 }); if (!App.streamLive) Stage.open(); toast(`Introducing ${x.name}`); };

// ---- atmosphere on the stream window ----
App.fx = {
  get state() { return (C().ui.fx ||= { on: {}, level: .6 }); },
  push() { Stage.overlay({ kind: "fx", ...this.state }); },
  toggle(k) { const s = this.state; s.on[k] = !s.on[k]; save(); this.push(); App._fxSubs.forEach(f => f()); },
  setAll(on, level) { const s = this.state; s.on = { ...on }; if (level != null) s.level = level; save(); this.push(); App._fxSubs.forEach(f => f()); },
  level(v) { this.state.level = v; save(); this.push(); },
  controls(box) {
    const draw = () => {
      const s = this.state;
      box.innerHTML = `<div class="chips fx-chips">${Object.entries(FX).map(([k, f]) => `<button class="chip ${s.on[k] ? "on" : ""}" data-fx="${k}">${f.label}</button>`).join("")}</div>
        <label class="fx-lvl"><span class="eyebrow">Strength</span><input type="range" min=".15" max="1" step=".05" value="${s.level}"></label>`;
      box.querySelectorAll("[data-fx]").forEach(b => b.onclick = () => { this.toggle(b.dataset.fx); if (!App.streamLive) toast("Open the stream window to see it"); });
      box.querySelector("input").oninput = e => this.level(+e.target.value);
    };
    App._fxSubs.add(draw); draw();
  },
};
App._fxSubs = new Set();

// ---- sound router: plays in the stream window (so screen share carries it) or in this window ----
const localSound = createSoundEngine();
App.sound = {
  out: ls.get("sound.out", "stream"), master: ls.get("sound.master", .8), active: new Map(), subs: new Set(),
  target() { return this.out === "stream" && App.streamLive ? "stream" : "local"; },
  exec(t, cmd) { t === "stream" ? Stage.sound(cmd) : localSound.run(cmd); },
  send(cmd) {
    this.exec(this.target(), cmd);
    if (cmd.op === "play" && cmd.loop) this.active.set(cmd.key, cmd);
    if (cmd.op === "vol" && this.active.has(cmd.key)) this.active.get(cmd.key).vol = cmd.vol;
    if (cmd.op === "stop") this.active.delete(cmd.key);
    if (cmd.op === "stopAll") this.active.clear();
    this.subs.forEach(f => f());
  },
  move(from, to) {
    if (from === to) return;
    this.exec(from, { op: "stopAll", fade: .8 });
    this.exec(to, { op: "master", vol: this.master });
    for (const cmd of this.active.values()) this.exec(to, { ...cmd, fade: 1 });
  },
  setOut(o) { const from = this.target(); this.out = o; ls.set("sound.out", o); this.move(from, this.target()); this.subs.forEach(f => f()); },
  setMaster(v) { this.master = v; ls.set("sound.master", v); this.exec(this.target(), { op: "master", vol: v }); },
  streamChanged(on) {
    if (this.out !== "stream") return;
    if (on) { setTimeout(() => this.move("local", "stream"), 900); }
    else { for (const cmd of this.active.values()) localSound.run({ ...cmd, fade: 1 }); }
    this.subs.forEach(f => f());
  },
  onChange(fn) { this.subs.add(fn); },
};
localSound.run({ op: "master", vol: App.sound.master });

function rollToast(r) {
  let box = $("#rollToasts"); if (!box) { box = h(`<div id="rollToasts" class="roll-toasts"></div>`); document.body.append(box); }
  if (current === "dice" && !r.secret) return;
  const el = h(`<div class="rtoast ${r.crit ? "crit" : r.fumble ? "fumble" : ""} ${r.secret ? "secret" : ""}" data-id="${r.id}">
    <div class="rt-l">${r.secret ? icon("lock") + " Secret · " : ""}${r.who ? `<span style="color:var(--ember)">${esc(r.who)}</span> · ` : ""}${esc(r.label || r.expr)}</div>
    <div class="rt-v">${r.pending ? "…" : shownTotal(r)}</div><div class="rt-b mono">${r.pending ? "rolling on the stream window" : esc([critLabel(r), breakdown(r)].filter(Boolean).join(" · "))}</div></div>`);
  box.prepend(el); while (box.children.length > 4) box.lastChild.remove();
  el.onclick = () => el.remove();
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, r.pending ? 15000 : 7000);
}
function onStageResult(r) {
  if (App._initWait?.id === r.id) { const w = App._initWait; App._initWait = null; App.recordRoll(r); w.apply(r); const pend = document.querySelector(`.rtoast[data-id="${r.id}"]`); pend?.remove(); if (current !== "dice") rollToast(r); return; }
  App.recordRoll(r); botReply(r);
  const rcb = App._rollCbs.get(r.id); if (rcb) { App._rollCbs.delete(r.id); rcb(r); }
  const pend = document.querySelector(`.rtoast[data-id="${r.id}"]`); pend?.remove();
  if (current === "dice") mounted.dice?.showResult?.(r); else rollToast(r);
}

function buildRail() {
  const rail = $("#rail");
  rail.innerHTML = VIEWS.map((v, i) => `${v.group && i ? `<div class="rail-sep"></div>` : ""}<a href="#" data-v="${v.key}" title="${v.label}${i < 10 ? ` (${keys("Ctrl+" + (i + 1) % 10)})` : ""}">${icon(v.icon)}<span>${v.label}</span></a>`).join("") + `<div class="grow"></div>`;
  $$("a", rail).forEach(a => a.onclick = e => { e.preventDefault(); show(a.dataset.v); });
}
function show(key, arg) {
  const v = VIEWS.find(x => x.key === key) || VIEWS[0];
  const host = $("#views");
  if (!mounted[v.key]) {
    const el = h(`<section class="view-pane" data-pane="${v.key}" style="height:100%"></section>`);
    host.append(el); mounted[v.key] = v.make(el, App);
  }
  $$(".view-pane", host).forEach(p => p.hidden = p.dataset.pane !== v.key);
  $$("#rail a").forEach(a => a.classList.toggle("on", a.dataset.v === v.key));
  if (current !== v.key) mounted[current]?.hide?.();
  current = v.key; mounted[v.key].show?.(arg);
  C().ui.view = v.key;
}

function renderCampName() { $("#campName").textContent = C().name || "Untitled campaign"; document.title = `${C().name} · Gamemaster's Codex`; }
function switchCampaign(id) {
  S.data.currentId = id; save(); syncCustomDice(); setLang(C().playerLang || "en"); ls.set("rules", C().rules); App.botConfig?.();
  for (const k in mounted) { mounted[k].destroy?.(); delete mounted[k]; }
  $("#views").innerHTML = ""; current = null;
  renderCampName(); show(C().ui.view || "prep");
}

const GENRE_NAME = { fantasy: "Fantasy", scifi: "Sci-fi", cyberpunk: "Cyberpunk" };
const sysCards = sel => SYSTEMS.map(s => `<button type="button" class="syscard ${s.id === sel ? "on" : ""}" data-sys="${s.id}"><b>${esc(s.name)}</b><span>${esc(s.blurb)}</span><em>${GENRE_NAME[s.genre]}</em></button>`).join("");
// new campaign: a name, and the game it runs on, which sets up rules, sheets, bestiary and quick rolls
export function newCampaignModal() {
  let pick = "homebrew";
  App.modal(`<h2>New campaign</h2>
    <label class="f"><span>Name</span><input type="text" id="ncName" placeholder="The Ash Crown"></label>
    <label class="f"><span>Tagline</span><input type="text" id="ncTag" placeholder="Grim frontier fantasy · Fridays on Discord"></label>
    <div class="f"><span>Game system</span><div class="sysgrid" id="ncSys">${sysCards(pick)}</div></div>
    <p class="md-help" id="ncNote" style="margin:0"></p>
    <label class="toggle"><input type="checkbox" id="ncLib" checked> ${icon("book")} Fill the Bestiary and Codex from the system's library (monsters, spells, gear)</label>
    <p class="md-help" style="margin:0">Unofficial and not affiliated with any publisher. Sources and licenses: <a href="#" id="ncLegal">Legal & credits</a>.</p>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Create campaign</button></div>`, (m, close) => {
    $("#ncLegal", m).onclick = e => { e.preventDefault(); close(); legalModal(); };
    const note = () => { const s = systemById(pick); $("#ncNote", m).textContent = `Sets the dice and crits, the party sheet (${s.sheet.stats.slice(0, 4).join(", ")}…), the bestiary's stat block and quick rolls${s.genre !== "fantasy" ? `, plus ${GENRE_NAME[s.genre].toLowerCase()} generators and look` : ""}. ${s.note} You can change all of it later.`; };
    $$("[data-sys]", m).forEach(b => b.onclick = () => { pick = b.dataset.sys; $$("[data-sys]", m).forEach(x => x.classList.toggle("on", x === b)); note(); });
    note();
    $("[data-x]", m).onclick = close;
    const ok = async () => {
      const s = systemById(pick), n = blankCampaign($("#ncName", m).value.trim() || "New campaign");
      const L = $("#ncLib", m).checked && (await loadLibrary())[s.id];
      if (L) { n.bestiary = L.creatures.map(r => toCreature(s, r)); n.notes = L.spells.map(r => toSpell(s, r)); }
      n.tagline = $("#ncTag", m).value.trim() || `${s.name} · ${GENRE_NAME[s.genre].toLowerCase()}`;
      n.genre = s.genre; n.tables = starterTables(s.genre); n.presets = [];
      applySystem(n, s.id, uid);
      S.data.campaigns.push(n); close(); App.genreChanged(n, true); switchCampaign(n.id);
      toast(`${n.name} is ready: ${s.name}${L ? `, with ${n.bestiary.length} creatures and ${n.notes.length} ${L.label.toLowerCase()}` : ""}`);
    };
    $("[data-ok]", m).onclick = ok; $("#ncName", m).onkeydown = e => { if (e.key === "Enter") ok(); }; $("#ncName", m).focus();
  });
}
// licenses and credits for the game content, trademarks and software (app/LEGAL.md)
export function legalModal() { settings("legal"); }
App.legalModal = legalModal;
function renameModal(c) {
  App.modal(`<h2>Campaign</h2>
    <label class="f"><span>Name</span><input type="text" id="mName" value="${esc(c.name)}"></label>
    <label class="f"><span>Tagline</span><input type="text" id="mTag" value="${esc(c.tagline || "")}" placeholder="Grim frontier fantasy · Fridays on Discord"></label>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    const ok = () => { c.name = $("#mName", m).value.trim() || "Untitled campaign"; c.tagline = $("#mTag", m).value.trim(); save(); renderCampName(); close(); App.refreshAll(); };
    $("[data-ok]", m).onclick = ok; $("#mName", m).onkeydown = e => { if (e.key === "Enter") ok(); }; $("#mName", m).select();
  });
}
export function partyModal() {
  const c = C();
  const draft = c.party.map(p => ({ ...p }));
  App.modal(`<h2>The party</h2><p style="margin:0;color:var(--dim)">Players and their characters. Used for attendance, spotlight and loot in the Chronicle.</p>
    <div id="pRows" style="display:flex;flex-direction:column;gap:8px"></div>
    <button class="btn sm" id="pAdd" style="align-self:flex-start">${icon("plus")} Add member</button>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save party</button></div>`, (m, close) => {
    const rows = $("#pRows", m);
    const palette = ["#d9776f", "#a98fb6", "#8fb07f", "#7fa8bd", "#d4a54a", "#e08a55", "#cfc8bf"];
    const draw = () => {
      rows.innerHTML = `<div class="party-row eyebrow"><span></span><span>Player</span><span>Character</span><span>Role / class</span><span></span></div>` +
        draft.map((p, i) => `<div class="party-row" data-i="${i}"><input type="color" value="${esc(p.color)}" data-k="color" aria-label="Color"><input type="text" value="${esc(p.player)}" data-k="player" placeholder="Player"><input type="text" value="${esc(p.character)}" data-k="character" placeholder="Character"><input type="text" value="${esc(p.role)}" data-k="role" placeholder="Role"><button class="btn sm icon ghost danger" data-del title="Remove">${icon("x")}</button></div>`).join("");
      $$(".party-row[data-i]", rows).forEach(r => {
        const p = draft[+r.dataset.i];
        $$("[data-k]", r).forEach(inp => inp.oninput = () => p[inp.dataset.k] = inp.value);
        $("[data-del]", r).onclick = () => { draft.splice(+r.dataset.i, 1); draw(); };
      });
    };
    $("#pAdd", m).onclick = () => { draft.push({ id: uid(), player: "", character: "", role: "", color: palette[draft.length % palette.length] }); draw(); $$(".party-row input[data-k=player]", rows).pop()?.focus(); };
    $("[data-x]", m).onclick = close;
    $("[data-ok]", m).onclick = () => { c.party = draft.filter(p => p.player || p.character); save(); close(); App.refreshAll(); };
    draw();
  });
}
export function rulesModal() { settings("rules"); }
App.rulesModal = rulesModal;
App.genreChanged = (c, quiet) => {
  if (c.stash && ["gold", "credits", "eddies"].includes(c.stash.unit)) c.stash.unit = STASH_UNIT[c.genre] || c.stash.unit;
  const have = new Set(c.tables.map(t => t.name.toLowerCase() + "|" + (t.folder || "")));
  const add = starterTables(c.genre).filter(t => !have.has(t.name.toLowerCase() + "|" + (t.folder || "")));
  c.tables.push(...add);
  const dice = { fantasy: ["ember", "oxblood"], cyberpunk: ["neon", "neon"], scifi: ["hull", "deck"] }[c.genre];
  ls.set("dice.theme", dice[0]); ls.set("dice.felt", dice[1]);
  applyGenre(c); save();
  if (!quiet) toast(`Switched to ${({ fantasy: "fantasy", cyberpunk: "cyberpunk", scifi: "sci-fi" })[c.genre]}${add.length ? `. Added ${add.length} starter tables` : ""}`);
};

function confirmModal(title, text, okText, run) {
  App.modal(`<h2>${esc(title)}</h2><p style="margin:0;color:var(--dim)">${esc(text)}</p><div class="foot"><button class="btn ghost" data-x>Keep it</button><button class="btn primary" data-ok style="background:var(--bad);border-color:var(--bad)">${esc(okText)}</button></div>`,
    (m, close) => { $("[data-x]", m).onclick = close; $("[data-ok]", m).onclick = async () => { close(); await flush(); await run(); if (/^delete/i.test(okText)) undoToast("Deleted"); else if (/^remove/i.test(okText)) undoToast("Removed"); }; });
}
// "Deleted · Undo": every change is in the undo history, so a delete can always come back
export function undoToast(msg) { toast(msg, { action: "Undo", run: doUndo }); }
App.undoToast = undoToast;
async function doUndo() { if (await undo()) toast("Undone", { action: "Redo", run: doRedo }); else toast("Nothing to undo"); }
async function doRedo() { if (await redo()) toast("Redone", { action: "Undo", run: doUndo }); else toast("Nothing to redo"); }
App.undo = doUndo; App.redo = doRedo;
// after undo/redo the data under every view changed: rebuild them
onRestore(() => {
  syncCustomDice(); setLang(C().playerLang || "en"); ls.set("rules", C().rules); applyGenre(C()); App.botConfig?.();
  const v = current; for (const k in mounted) { mounted[k].destroy?.(); delete mounted[k]; }
  $("#views").innerHTML = ""; current = null; renderCampName(); show(v || C().ui.view || "prep");
  import("./combat.js").then(m => m.pushCombat?.()).catch(() => {});
});
App.confirm = confirmModal;
App.partyModal = () => App.go("party");
App.stage = Stage;

async function exportBackup() {
  const c = C();
      const name = `${c.name.replace(/[^\w\- ]+/g, "").trim() || "campaign"}-${new Date().toISOString().slice(0, 10)}.json`;
      // exports carry their images inside, so a backup works on any computer
      const copy = await mapStrings(JSON.parse(JSON.stringify({ version: 1, campaigns: [c], currentId: c.id })), v => v.startsWith("codexmedia://media/") && !/\.(mp3|ogg|wav|m4a|flac|webm|opus)$/i.test(v) ? toDataURL(v).catch(() => v) : v);
      const txt = JSON.stringify(copy, null, 1);
      if (window.codex) { const p = await window.codex.exportData(txt, name); if (p) toast("Backup saved"); }
      else toast("Export works in the desktop app");
}
async function importBackup() {
      if (!window.codex) return toast("Import works in the desktop app");
      const txt = await window.codex.importData(); if (!txt) return;
      try {
        const d = JSON.parse(txt); const list = d.campaigns || [d];
        for (const x of list) { if (!x || !x.name) continue; if (S.data.campaigns.some(y => y.id === x.id)) x.id = uid(); const b = blankCampaign(); for (const k in b) if (x[k] == null) x[k] = b[k]; S.data.campaigns.push(x); }
        save(); switchCampaign(list[list.length - 1].id); toast("Imported " + list.length + " campaign" + (list.length > 1 ? "s" : ""));
      } catch { toast("That file isn't a Codex backup"); }
}
function deleteCampaign() {
  const c = C();
  if (S.data.campaigns.length < 2) return toast("Make another campaign first; you need at least one");
  confirmModal(`Delete ${c.name}?`, "Every note, board, session and roll in it is removed. Ctrl+Z brings it back until you close the app.", "Delete campaign", () => {
    S.data.campaigns = S.data.campaigns.filter(x => x.id !== c.id); switchCampaign(S.data.campaigns[0].id);
  });
}
function setZoom(z) {
  z = Math.round(Math.max(.7, Math.min(1.5, z)) * 10) / 10; S.data.prefs.zoom = z; save();
  if (window.codex?.zoom) window.codex.zoom(z); else document.body.style.zoom = z;
}
async function legalText() {
  let txt = "";
  try { txt = window.codex?.legal ? await window.codex.legal() : await (await fetch("LEGAL.md")).text(); } catch {}
  return txt || "# Legal notices\n\nThe notices file is missing from this build. See LEGAL.md in the app's source.";
}
const settingsCtx = {
  keys, renderCampName: () => renderCampName(), setZoom, helpSheet: () => helpSheet(), showNews: () => showNews(NEWS), checkUpdates: () => checkUpdates(),
  applyGenre: c => applyGenre(c), remount: () => { for (const k in mounted) { mounted[k].destroy?.(); delete mounted[k]; } $("#views").innerHTML = ""; const v = current; current = null; show(v || "prep"); },
  discordConnected: () => Discord.connected(), discordModal: () => Discord.discordModal(App), tableModal: () => tableModal(), printModal: () => import("./print.js").then(x => x.printModal(App)),
  exportBackup, importBackup, restoreModal: () => restoreModal(), deleteCampaign, legalText,
};
export function settings(tab) { openSettings(App, settingsCtx, tab); }
App.settings = settings; App.packs = () => packsModal(App); App.settingsRemount = () => settingsCtx.remount(); App.tableModal = () => tableModal(); App.discordConnected = () => Discord.connected();
function campaignMenu() {
  const c = C();
  App.menu($("#campBtn"), [
    { label: "Campaigns" },
    ...S.data.campaigns.map(x => ({ text: x.name, cur: x.id === c.id, icon: x.id === c.id ? "book" : "", run: () => switchCampaign(x.id) })),
    { text: "New campaign", icon: "plus", run: newCampaignModal },
    "-",
    { text: `Settings (${keys("Ctrl+,")})`, icon: "gear", run: () => settings() },
    { text: "Party & sheets", icon: "social", run: () => App.go("party") },
    { text: Discord.connected() ? "Discord (connected)" : "Connect Discord…", icon: "discord", run: () => Discord.discordModal(App) },
    { text: "Table link: phones & OBS…", icon: "stream", run: () => tableModal() },
    { text: "Print…", icon: "book", run: () => import("./print.js").then(x => x.printModal(App)) },
    "-",
    { text: "What's new", icon: "star", run: () => showNews(NEWS) },
    { text: "Keyboard shortcuts (F1)", icon: "type", run: helpSheet },
  ]);
}

function wireChrome() {
  const W = window.codex?.win;
  if (!W) $("#winctl").hidden = true;
  else {
    $("#wMin").onclick = W.min; $("#wMax").onclick = W.max; $("#wClose").onclick = async () => { await flush(); W.close(); };
    W.onState(({ max }) => $("#wMax").innerHTML = max ? `<svg class="ic" viewBox="0 0 24 24"><path d="M8 8h11v11H8zM5 16V5h11"/></svg>` : `<svg class="ic" viewBox="0 0 24 24"><path d="M5 5h14v14H5z"/></svg>`);
  }
  $("#campBtn").onclick = campaignMenu;
  $("#searchBtn").onclick = () => openPalette(App, VIEWS);
  $("#rulesBtn").onclick = () => toggleRules(App);
  // a homebrew pack dropped anywhere on the window opens its preview
  addEventListener("dragover", e => { if ([...(e.dataTransfer?.types || [])].includes("Files")) e.preventDefault(); });
  addEventListener("drop", async e => {
    const f = [...(e.dataTransfer?.files || [])].find(x => /\.codexpack$/i.test(x.name)); if (!f) return;
    e.preventDefault(); importPack(App, await f.text());
  });
  App.rules = q => openRules(App, q ? { q } : {});
  const st = $("#saveState");
  onSaved(s => { st.className = "save-state no-drag " + s; st.textContent = s === "saving" ? "Saving…" : s === "error" ? "Not saved" : "Saved"; });
  const sb = $("#streamBtn");
  const setLive = on => {
    const was = !!App.streamLive;
    if (on) markSeen("stage"); if (was !== on) pushGm();
    sb.classList.toggle("live", on); $("#streamLbl").textContent = on ? "Stream window live" : "Stream window"; App.streamLive = on; mounted.dice?.streamState?.(on);
    if (was !== on) App.sound.streamChanged(on);
    if (!on && App.onAir) { App.onAir = null; App._air.forEach(f => f()); }
  };
  Stage.onResult(onStageResult);
  App.fx.push();
  import("./combat.js").then(m => m.pushCombat());
  if (window.codex?.update) window.codex.update.onState(updateState);
  document.body.classList.add("os-" + (window.codex?.platform || "web"));
  $("#searchBtn kbd").textContent = keys("Ctrl K"); $("#searchBtn").title = keys("Search and commands (Ctrl+K)");
  syncCustomDice(); wireBot(); initPoll(App); initPlayers(App);
  Stage.onState(setLive);
  Stage.isOpen().then(setLive);
  App.tableMode = async () => {
    const api = window.codex?.stage; if (!api) return toast("Table mode works in the desktop app");
    const list = await api.screens(), others = list.filter(d => !d.primary);
    if (!others.length) return toast("Connect a TV or second monitor first, then try again");
    const go = async id => { const r = await api.toScreen(id); toast(r.ok ? "Player display is on the second screen. Press Esc there, or use this menu, to bring it back" : r.error); };
    if (others.length === 1) return go(others[0].id);
    App.menu(sb, others.map(d => ({ text: `Show on ${d.label}`, icon: "stream", run: () => go(d.id) })));
  };
  sb.onclick = () => App.streamLive ? App.menu(sb, [
    { text: "Player display on second screen (TV)", icon: "fit", run: App.tableMode },
    { text: "Back to a normal window", icon: "max", run: () => window.codex?.stage.windowed() },
    { text: "Bring stream window forward", icon: "stream", run: Stage.open },
    ...(App.onAir ? [{ text: "Take the handout down", icon: "image", run: App.hideHandout }] : []),
    { text: "Clear the table", icon: "trash", run: Stage.clear },
    { text: "Close stream window", icon: "x", run: Stage.close },
  ]) : App.menu(sb, [
    { text: "Open stream window (for Discord)", icon: "stream", run: Stage.open },
    { text: "Player display on second screen (TV at the table)", icon: "fit", run: App.tableMode },
  ]);
  addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && /^[0-9]$/.test(e.key)) { const v = VIEWS[(+e.key + 9) % 10]; if (v) { e.preventDefault(); show(v.key); } }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(App, VIEWS); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") { e.preventDefault(); quickLog(); }
    if (e.key === "F1") { e.preventDefault(); helpSheet(); }
    if (e.key === "F2") { e.preventDefault(); toggleRules(App); }
    if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "-")) { e.preventDefault(); zoomBy(e.key === "-" ? -.1 : .1); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); flush(); toast("Saved"); }
    if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); settings(); }
    // text fields keep their own undo; everywhere else Ctrl+Z steps back through the campaign
    const typing = e.target.closest?.("input, textarea, select, [contenteditable=true]") && e.target.type !== "checkbox" && e.target.type !== "range";
    if ((e.ctrlKey || e.metaKey) && !typing && !document.querySelector(".modal-back")) {
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); doRedo(); }
    }
  });
}

function showNews(list) {
  App.modal(`<h2>What's new</h2><div class="news-list">${newsHTML(list)}</div><div class="foot"><button class="btn primary" data-ok>Let's play</button></div>`, (m, close) => { $("[data-ok]", m).onclick = close; });
}
async function restoreModal() {
  const list = await window.codex.backups();
  if (!list.length) return toast("No backups yet. One is made each day the app saves");
  App.modal(`<h2>Restore a backup</h2><p style="margin:0;color:var(--dim)">The app keeps one copy of all your campaigns per day, for 14 days. Restoring replaces everything with that day's copy. Your current data is kept as today's backup first.</p>
    <div style="display:flex;flex-direction:column;gap:4px;max-height:50vh;overflow:auto">${list.map(f => `<button class="cx-item" data-f="${esc(f)}"><b>${esc(f.replace("codex-", "").replace(".json", ""))}</b></button>`).join("")}</div>`, (m, close) => {
    $$("[data-f]", m).forEach(b => b.onclick = () => App.confirm(`Restore ${b.querySelector("b").textContent}?`, "Everything goes back to how it was that day.", "Restore", async () => {
      try {
        const d = JSON.parse(await window.codex.restore(b.dataset.f));
        if (!d.campaigns?.length) throw new Error("empty");
        S.data = d; await flush(); save(); close(); switchCampaign(d.currentId || d.campaigns[0].id); toast("Backup restored");
      } catch { toast("That backup couldn't be read"); }
    }));
  });
}
function helpSheet() {
  const rows = [["Anywhere", [["Ctrl+K", "Search everything, run commands, type a roll"], ["Ctrl+L", "Log what just happened (live session)"], ["Ctrl+1…9, Ctrl+0", "Jump to a section"], ["Ctrl+S", "Save now"], ["Ctrl+,", "Settings"], ["Ctrl+Z · Ctrl+Shift+Z", "Undo · redo (outside text boxes)"], ["Ctrl + / Ctrl −", "Bigger / smaller interface"], ["F1", "This sheet"], ["F2", "Rules reference"]]],
    ["Dice", [["Enter", "Throw"], ["Shift+Enter", "Secret roll"], ["Shift-click a die", "Throw it right away"], ["Right-click a die", "Take it out of the pool"], ["2d20kh1 · 4d6dl1", "Keep highest / drop lowest"], ["3d6! · 4d6r1 · 4dF", "Exploding · reroll 1s · Fate"], ["1d100<=45 · 8d6>=5", "Roll-under target · count hits"]]],
    ["Combat", [["Space", "Next turn (or start)"], ["7 · +5 · =20 in HP box", "Damage · heal · set"]]],
    ["Map", [["M R H B", "Move · Reveal · Hide · Box"], ["Right-drag", "Pan"], ["Delete", "Remove the selected token"]]],
    ["Board", [["Double-click", "New note"], ["Drag a pin onto a card", "Tie yarn"], ["N · Ctrl+D · Delete", "New note · duplicate · delete"], ["Paste / drop an image", "Pin it"]]],
    ["Forge & Tables", [["Space", "Draw a card (Forge)"], ["R", "Roll the open table"]]],
    ["Stream window", [["H", "Hide roll history"], ["F", "Fullscreen"], ["Space", "Roll a d20"]]]];
  App.modal(`<h2>Shortcuts</h2><div class="help-grid">${rows.map(([t, list]) => `<section><h3>${t}</h3><dl>${list.map(([k, d]) => `<dt><kbd>${esc(keys(k))}</kbd></dt><dd>${esc(d)}</dd>`).join("")}</dl></section>`).join("")}</div><div class="foot"><button class="btn primary" data-ok>Got it</button></div>`, (m, close) => { $("[data-ok]", m).onclick = close; m.style.width = "min(900px, 100%)"; });
}
App.help = helpSheet;
function zoomBy(d) {
  const cur = S.data.prefs.zoom || 1, z = Math.round(Math.max(.7, Math.min(1.5, cur + d)) * 10) / 10;
  S.data.prefs.zoom = z; save();
  if (window.codex?.zoom) window.codex.zoom(z); else document.body.style.zoom = z;
  toast(`Zoom ${Math.round(z * 100)}%`);
}
function quickLog() {
  const s = C().sessions.find(x => x.status === "live");
  if (!s) return toast("Start a session to log what happens");
  App.modal(`<h2>Log it</h2><div class="chips" id="qlT">${Object.entries(BEATS).map(([k, b], i) => `<button class="chip ${i === 1 ? "on" : ""}" data-t="${k}" style="--bt:${b.color}">${icon(k)} ${b.label}</button>`).join("")}</div>
    <input type="text" id="qlX" placeholder="What just happened?"><label class="toggle"><input type="checkbox" id="qlS"> Key moment</label><p class="md-help" style="margin:0">Enter saves. Logged to Session ${esc(s.num)}.</p>`, (m, close) => {
    let type = "social";
    $$("[data-t]", m).forEach(b => b.onclick = () => { type = b.dataset.t; $$("[data-t]", m).forEach(x => x.classList.toggle("on", x === b)); $("#qlX", m).focus(); });
    $("#qlX", m).focus();
    $("#qlX", m).onkeydown = e => { if (e.key === "Enter" && e.target.value.trim()) { s.beats.push({ id: uid(), type, text: e.target.value.trim(), star: $("#qlS", m).checked }); save(); close(); toast(`Logged in Session ${s.num}`); } };
  });
}

// ---- whispers: a private message to one player through the bot ----
App.whisper = async (member, { text, title, image }) => {
  const name = member.character || member.player;
  // the table link: kept in their phone's Secrets tab, even if they connect later
  const tableOn = !!S.data.prefs.table?.on;
  if (tableOn) phoneWhisper(member, { text, title, image });
  if (!member.discordId || !App._botOnline) {
    if (tableOn) { toast(playersOnline().includes(member.id) ? `Whispered to ${name}'s phone` : `Saved for ${name}: they'll see it when they open the table link`); return { ok: true }; }
    if (!window.codex?.bot) return toast("Whispers work in the desktop app with the table link or the dice bot");
    return toast(`${name} hasn't used the bot yet. Ask them to type /me once, or turn on the table link (campaign menu)`);
  }
  const file = image ? { dataURL: await toDataURL(image), name: "secret." + ((await toDataURL(image)).match(/data:image\/(\w+)/)?.[1] || "png").replace("jpeg", "jpg") } : null;
  const r = await window.codex.bot.dm({ userId: member.discordId, content: text || "", title: title || "", file });
  toast(r.ok ? `Whispered to ${member.character || member.player}` : `Whisper failed: ${r.error}`);
  return r;
};
App.whisperPicker = (payload) => {
  const party = C().party;
  if (!party.length) return toast("Add your party first");
  App.modal(`<h2>Whisper to…</h2><p style="margin:0;color:var(--dim)">Goes to their phone (table link) and/or a private Discord message from your dice bot. Only that player sees it.</p>
    ${payload.ask ? `<label class="f"><span>Message</span><textarea id="wT" rows="4" placeholder="You notice the magistrate's hand is shaking."></textarea></label>` : ""}
    <div class="chips">${party.map(m => `<button class="chip" data-w="${m.id}" style="border-color:${esc(m.color)}">${esc(m.character || m.player)}${m.discordId || S.data.prefs.table?.on ? "" : " (not linked yet)"}</button>`).join("")}</div>`, (m, close) => {
    $$("[data-w]", m).forEach(b => b.onclick = async () => {
      const mem = party.find(x => x.id === b.dataset.w), text = payload.ask ? $("#wT", m).value.trim() : payload.text;
      if (payload.ask && !text) return toast("Write the message first");
      const r = await App.whisper(mem, { ...payload, text }); if (r?.ok) close();
    });
  });
};

// ---- player rolls from the Discord bot ----
const botPending = new Set();
function botReply(r) {
  if (!botPending.has(r.id)) return;
  botPending.delete(r.id);
  window.codex.bot.reply({ id: r.id, ok: true, embed: Discord.rollEmbed(r) });
}
function wireBot() {
  const B = window.codex?.bot; if (!B) return;
  B.onStatus(st => { App._botOnline = st.state === "online"; App._botStatus?.(st); if (st.state === "online" && !App._botToasted) { App._botToasted = true; toast(`Dice bot online as ${st.tag}`); } });
  B.onRoll(req => {
    const fail = error => B.reply({ id: req.id, ok: false, error });
    if (req.channelId && S.data.prefs.bot && S.data.prefs.bot.channel !== req.channelId) { S.data.prefs.bot.channel = req.channelId; save(); }
    const c = C(), names = (req.names || [req.who]).map(n => String(n).toLowerCase());
    const member = c.party.find(m => (req.userId && m.discordId === req.userId) || (m.discord && names.includes(String(m.discord).trim().replace(/^@/, "").toLowerCase())));
    // remember the player's Discord account so whispers can reach them
    if (member && req.userId && member.discordId !== req.userId) { member.discordId = req.userId; save(); }
    const unlinked = t("I don't know which character you play. Ask the GM to put your Discord name ({who}) on your party sheet.", { who: req.who });
    if (req.cmd === "check") {
      if (!member) return fail(unlinked);
      const stat = req.args.stat, v = parseInt(member.stats?.[stat]);
      if (isNaN(v)) return fail(t("{name} has no number for {stat} yet.", { name: member.character || member.player, stat }));
      const L = c.sheet || { roll: "1d20+{value}" };
      let expr = (L.roll || "1d20+{value}").replace(/\{value\}/g, v).replace(/\+-/g, "-");
      if (req.args.bonus) expr += (req.args.bonus > 0 ? "+" : "-") + Math.abs(req.args.bonus);
      botPending.add(req.id);
      const r = App.roll(expr, `${stat}${req.args.bonus ? ` (${req.args.bonus > 0 ? "+" : ""}${req.args.bonus})` : ""}`, { who: member.character || req.who, id: req.id });
      if (r) botReply(r); return;
    }
    if (req.cmd === "init") {
      if (!member) return fail(unlinked);
      const cb = c.combat; const x = cb?.list.find(y => y.ref === member.id);
      if (!x) return fail(t("You're not in the GM's combat tracker yet. Ask the GM to add the party."));
      let expr = req.args.dice;
      if (!expr) { const v = parseInt(member.stats?.[cb.pcStat || "Agility"]); expr = "1d20" + (isNaN(v) || !v ? "" : (v > 0 ? "+" : "-") + Math.abs(v)); }
      try { parseRoll(expr); } catch (e) { return fail(t("Couldn't read \"{expr}\": {error}", { expr, error: e.message })); }
      const r = App.roll(expr, "Initiative", { who: member.character || req.who, id: req.id });
      const apply = res => { x.init = res.total; x.tie = Math.random(); import("./combat.js").then(m => { if (!cb.active) m.sortCombat(cb); save(); m.pushCombat(); mounted.combat?.refresh?.(); }); const order = cb.list.indexOf(x) + 1; B.reply({ id: req.id, ok: true, embed: { ...Discord.rollEmbed(res), footer: { text: t("Initiative set") + (cb.active ? "" : " · " + t("you're #{n} of {m}", { n: order, m: cb.list.length })) } } }); };
      if (r) apply(r); else App._initWait = { id: req.id, apply };
      return;
    }
    if (req.cmd === "stash") {
      const s = stashSummary(c);
      B.reply({ id: req.id, ok: true, embed: { color: 0xf0c35a, title: t("{campaign}: party stash", { campaign: c.name }), description: `**${s.money}**\n\n${s.items.length ? s.items.map(x => `• ${x}`).join("\n").slice(0, 3800) : t("*No loot yet.*")}` } });
      return;
    }
    if (req.cmd === "me") {
      if (!member) return fail(unlinked);
      const L = c.sheet || { stats: [], resources: [] };
      const res = (L.resources || []).map(n => { const x = member.res?.[n] || {}; return `**${n}** ${x.cur ?? "?"}/${x.max ?? "?"}`; }).join("  ·  ");
      const stats = (L.stats || []).map(n => `${n} **${member.stats?.[n] ?? "–"}**`).join("  ·  ");
      B.reply({ id: req.id, ok: true, embed: { color: parseInt(String(member.color || "#ff7a3d").slice(1), 16) || 0xff7a3d, title: member.character || member.player, description: [member.role, res, stats, member.conds?.length ? `*${member.conds.join(", ")}*` : ""].filter(Boolean).join("\n\n") } });
      return;
    }
    try { parseRoll(req.expr); } catch (e) { return fail(t("Couldn't read \"{expr}\": {error}", { expr: req.expr, error: e.message })); }
    botPending.add(req.id);
    const r = App.roll(req.expr, req.label, { who: member?.character || req.who, id: req.id });
    if (r) botReply(r);
  });
  const sendCfg = () => B.config({ stats: (C().sheet?.stats || []).slice(0, 25), lang: C().playerLang || "en" });
  B.onStatus(st => { if (st.state === "online") sendCfg(); });
  App.botConfig = sendCfg;
  const p = S.data.prefs.bot; if (p?.token && p.on) B.start(p.token);
}

// ---- updates ----
function updateState(u) {
  const pill = $("#updPill");
  if (u.state === "ready") { pill.hidden = false; pill.textContent = `Update ${u.version || ""} ready · restart`; pill.onclick = () => { flush(); window.codex.update.install(); }; }
  else if (u.state === "available") { pill.hidden = false; pill.textContent = `Update ${u.version || ""} available · download`; pill.onclick = () => window.codex.update.page(); }
  else if (u.state === "downloading") { pill.hidden = false; pill.textContent = `Downloading update ${u.version || ""}…`; pill.onclick = null; }
  else if (u.manual) toast(u.state === "current" ? "You're on the latest version" : u.state === "error" ? "Couldn't check for updates: " + (u.message || "") : "");
}
async function checkUpdates() {
  const v = await window.codex.version();
  const r = await window.codex.update.check();
  if (r.state === "off") toast(`Version ${v}. Automatic updates aren't set up for this build`);
  else if (r.state === "error") toast("Couldn't check for updates: " + r.message);
  else toast(`Version ${v}. Checking for updates…`);
}

(async function boot() {
  await loadData();
  try { await Promise.all([document.fonts.load('700 40px "Grenze Gotisch"'), document.fonts.load('400 15px "IBM Plex Sans Condensed"')]); } catch {}
  applyGenre();
  applyPrefs(); setTimeout(() => initChecklist(App), 400); initGmRemote(App); App.onAirChange(pushGm);
  if (S.data.prefs.zoom && S.data.prefs.zoom !== 1) { if (window.codex?.zoom) window.codex.zoom(S.data.prefs.zoom); else document.body.style.zoom = S.data.prefs.zoom; }
  try { await document.fonts.load(`700 40px ${getComputedStyle(document.documentElement).getPropertyValue("--display")}`); } catch {}
  buildRail(); railSwitching($("#rail"), v => show(v)); wireChrome(); renderCampName(); ls.set("rules", C().rules);
  show(C().ui.view || "prep");
  // one-time move of big embedded images out of the save file
  if (window.codex?.saveMedia && !S.data.prefs.mediaMoved) {
    let n = 0;
    await mapStrings(S.data.campaigns, async v => { if (v.length > 20000 && v.startsWith("data:image")) { n++; return storeImage(v); } return v; });
    S.data.prefs.mediaMoved = true; save(); if (n) console.info(`moved ${n} images to files`);
  }
  // tell people what changed since they last opened the app
  const v = window.codex ? await window.codex.version() : NEWS[0].v;
  const seen = S.data.prefs.seenVersion;
  if (seen !== v) { const list = unseen(seen || "1.1.1"); S.data.prefs.seenVersion = v; save(); if (list.length) setTimeout(() => showNews(list), 600); }
})();
