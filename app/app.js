import { $, $$, esc, h, icon, toast, uid } from "./util.js";
import { S, C, loadData, save, flush, onSaved, blankCampaign } from "./store.js";
import { Stage } from "./bridge.js";
import { createForge } from "./forge.js";
import { createBoard } from "./board.js";
import { createCodex } from "./codex.js";
import { createChronicle } from "./chronicle.js";
import { createDice } from "./dicedesk.js";
import { createPrep } from "./prep.js";
import { createLive } from "./live.js";
import { createTables } from "./tables.js";
import { createBestiary } from "./bestiary.js";
import { createSoundEngine } from "./sound.js";
import { parseRoll, diceGroups, buildResult, breakdown, critLabel, shownTotal, DEFAULT_RULES } from "./roll.js";
import { createCombat } from "./combat.js";
import { rnd, ls } from "./util.js";

const VIEWS = [
  { key: "prep", label: "Prep", icon: "book", make: createPrep, group: "Session" },
  { key: "live", label: "Live", icon: "stream", make: createLive },
  { key: "combat", label: "Combat", icon: "combat", make: createCombat },
  { key: "dice", label: "Dice", icon: "dice", make: createDice },
  { key: "forge", label: "Forge", icon: "forge", make: createForge, group: "Make" },
  { key: "tables", label: "Tables", icon: "tables", make: createTables },
  { key: "bestiary", label: "Bestiary", icon: "death", make: createBestiary },
  { key: "codex", label: "Codex", icon: "codex", make: createCodex, group: "World" },
  { key: "board", label: "Board", icon: "board", make: createBoard },
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
    back.querySelector("input,textarea,select,button")?.focus();
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
  roll(expr, label = "", { secret = false } = {}) {
    let terms; try { terms = parseRoll(expr); } catch (e) { toast(e.message); return; }
    const req = { id: uid(), expr, label, rules: C().rules };
    if (!secret && App.streamLive) { Stage.roll(req); rollToast({ ...req, pending: true }); return; }
    const vals = diceGroups(terms).map(g => Array.from({ length: g.count }, () => rnd(g.sides) + 1));
    const r = buildResult(req, terms, vals); r.secret = secret;
    App.recordRoll(r); rollToast(r);
    return r;
  },
  recordRoll(r) {
    const c = C(); c.rolls.unshift(r); c.rolls.length = Math.min(c.rolls.length, 80); save();
    mounted.dice?.addLog?.(r);
  },
  logBeat(type, text, quiet) {
    const s = C().sessions.find(x => x.status === "live");
    if (!s) { toast("Start a session (Prep or Live) to log scenes"); return; }
    s.beats.push({ id: uid(), type, text, star: false }); save();
    if (!quiet) toast(`Logged in Session ${s.num}`);
  },
  // ---- handouts on the stream window ----
  onAir: null, _air: new Set(),
  onAirChange(fn) { App._air.add(fn); },
  showHandout(hd) { App.onAir = hd; Stage.show(hd); App._air.forEach(f => f()); },
  hideHandout() { App.onAir = null; Stage.hide(); App._air.forEach(f => f()); },
};

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
    <div class="rt-l">${r.secret ? icon("lock") + " Secret · " : ""}${esc(r.label || r.expr)}</div>
    <div class="rt-v">${r.pending ? "…" : shownTotal(r)}</div><div class="rt-b mono">${r.pending ? "rolling on the stream window" : esc([critLabel(r), breakdown(r)].filter(Boolean).join(" · "))}</div></div>`);
  box.prepend(el); while (box.children.length > 4) box.lastChild.remove();
  el.onclick = () => el.remove();
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, r.pending ? 15000 : 7000);
}
function onStageResult(r) {
  App.recordRoll(r);
  const pend = document.querySelector(`.rtoast[data-id="${r.id}"]`); pend?.remove();
  if (current === "dice") mounted.dice?.showResult?.(r); else rollToast(r);
}

function buildRail() {
  const rail = $("#rail");
  rail.innerHTML = VIEWS.map((v, i) => `${v.group && i ? `<div class="rail-sep"></div>` : ""}<a href="#" data-v="${v.key}" title="${v.label} (Ctrl+${i + 1})">${icon(v.icon)}<span>${v.label}</span></a>`).join("") + `<div class="grow"></div>`;
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
  S.data.currentId = id; save();
  for (const k in mounted) { mounted[k].destroy?.(); delete mounted[k]; }
  $("#views").innerHTML = ""; current = null;
  renderCampName(); show(C().ui.view || "forge");
}

function renameModal(c) {
  App.modal(`<h2>Campaign</h2>
    <label class="f"><span>Name</span><input type="text" id="mName" value="${esc(c.name)}"></label>
    <label class="f"><span>Tagline</span><input type="text" id="mTag" value="${esc(c.tagline || "")}" placeholder="Grim frontier fantasy · Fridays on Discord"></label>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    const ok = () => { c.name = $("#mName", m).value.trim() || "Untitled campaign"; c.tagline = $("#mTag", m).value.trim(); save(); renderCampName(); close(); App.refreshAll(); };
    $("[data-ok]", m).onclick = ok; $("#mName", m).onkeydown = e => e.key === "Enter" && ok();
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
    const palette = ["#ef7f8f", "#c39bd3", "#a7cf9e", "#8fc3d9", "#f0c35a", "#ff9a66", "#e2e2e2"];
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
export function rulesModal() {
  const c = C(); const R = { ...DEFAULT_RULES, ...(c.rules || {}) };
  App.modal(`<h2>Rules & genre</h2>
    <label class="f"><span>Genre</span><select id="rgG"><option value="fantasy">Fantasy</option><option value="scifi">Sci-fi</option><option value="cyberpunk">Cyberpunk</option></select></label>
    <p class="md-help" style="margin:-6px 0 0">Changes what the Forge generates and which built-in sounds and starter tables you get.</p>
    <div class="two">
      <label class="f"><span>Critical die</span><select id="rgD"><option value="20">d20</option><option value="100">d100 (percentile)</option><option value="10">d10</option><option value="12">d12</option><option value="6">d6</option><option value="any">Any single die</option></select></label>
      <label class="f"><span>What's good</span><select id="rgM"><option value="high">High rolls (max = critical, 1 = fumble)</option><option value="low">Low rolls (1 = critical, max = fumble)</option><option value="none">No criticals</option></select></label>
    </div>
    <label class="f"><span>Initiative order</span><select id="rgI"><option value="high">Highest goes first</option><option value="low">Lowest goes first</option></select></label>
    <p class="md-help" style="margin:0">For roll-under systems, roll against a target: <code>1d100&lt;=45</code> shows Success or Failure. For dice pools, count hits: <code>8d6&gt;=5</code>.</p>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
    $("#rgG", m).value = c.genre || "fantasy"; $("#rgD", m).value = String(R.critDie); $("#rgM", m).value = R.critMode; $("#rgI", m).value = R.initHigh ? "high" : "low";
    $("[data-x]", m).onclick = close;
    $("[data-ok]", m).onclick = () => {
      const d = $("#rgD", m).value; const g = $("#rgG", m).value;
      c.rules = { critDie: d === "any" ? "any" : Number(d), critMode: $("#rgM", m).value, initHigh: $("#rgI", m).value === "high" };
      const changedGenre = (c.genre || "fantasy") !== g; c.genre = g;
      save(); ls.set("rules", c.rules); close(); if (changedGenre) App.genreChanged?.(c); App.refreshAll(); toast("Rules saved");
    };
  });
}
App.rulesModal = rulesModal;

function confirmModal(title, text, okText, run) {
  App.modal(`<h2>${esc(title)}</h2><p style="margin:0;color:var(--dim)">${esc(text)}</p><div class="foot"><button class="btn ghost" data-x>Keep it</button><button class="btn primary" data-ok style="background:var(--bad);border-color:var(--bad)">${esc(okText)}</button></div>`,
    (m, close) => { $("[data-x]", m).onclick = close; $("[data-ok]", m).onclick = () => { close(); run(); }; });
}
App.confirm = confirmModal;
App.partyModal = partyModal;

function campaignMenu() {
  const c = C();
  App.menu($("#campBtn"), [
    { label: "Campaigns" },
    ...S.data.campaigns.map(x => ({ text: x.name, cur: x.id === c.id, icon: x.id === c.id ? "book" : "", run: () => switchCampaign(x.id) })),
    { text: "New campaign", icon: "plus", run: () => { const n = blankCampaign("New campaign"); S.data.campaigns.push(n); switchCampaign(n.id); renameModal(n); } },
    "-",
    { text: "Rename campaign", icon: "type", run: () => renameModal(c) },
    { text: "Party & players", icon: "social", run: partyModal },
    { text: "Rules & genre", icon: "gear", run: rulesModal },
    "-",
    { text: "Export backup…", icon: "save", run: async () => {
      const name = `${c.name.replace(/[^\w\- ]+/g, "").trim() || "campaign"}-${new Date().toISOString().slice(0, 10)}.json`;
      const txt = JSON.stringify({ version: 1, campaigns: [c], currentId: c.id }, null, 1);
      if (window.codex) { const p = await window.codex.exportData(txt, name); if (p) toast("Backup saved"); }
      else toast("Export works in the desktop app");
    } },
    { text: "Import backup…", icon: "copy", run: async () => {
      if (!window.codex) return toast("Import works in the desktop app");
      const txt = await window.codex.importData(); if (!txt) return;
      try {
        const d = JSON.parse(txt); const list = d.campaigns || [d];
        for (const x of list) { if (!x || !x.name) continue; if (S.data.campaigns.some(y => y.id === x.id)) x.id = uid(); const b = blankCampaign(); for (const k in b) if (x[k] == null) x[k] = b[k]; S.data.campaigns.push(x); }
        save(); switchCampaign(list[list.length - 1].id); toast("Imported " + list.length + " campaign" + (list.length > 1 ? "s" : ""));
      } catch { toast("That file isn't a Codex backup"); }
    } },
    ...(window.codex ? [{ text: "Open save folder", icon: "book", run: () => window.codex.openFolder() }, { text: "Check for updates", icon: "reroll", run: checkUpdates }] : []),
    "-",
    { text: "Delete this campaign", icon: "trash", run: () => {
      if (S.data.campaigns.length < 2) return toast("Make another campaign first; you need at least one");
      confirmModal(`Delete ${c.name}?`, "Every note, board, session and roll in it is removed. Export a backup first if you might want it back.", "Delete campaign", () => {
        S.data.campaigns = S.data.campaigns.filter(x => x.id !== c.id); switchCampaign(S.data.campaigns[0].id); toast("Campaign deleted");
      });
    } },
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
  const st = $("#saveState");
  onSaved(s => { st.className = "save-state no-drag " + s; st.textContent = s === "saving" ? "Saving…" : s === "error" ? "Not saved" : "Saved"; });
  const sb = $("#streamBtn");
  const setLive = on => {
    const was = !!App.streamLive;
    sb.classList.toggle("live", on); $("#streamLbl").textContent = on ? "Stream window live" : "Stream window"; App.streamLive = on; mounted.dice?.streamState?.(on);
    if (was !== on) App.sound.streamChanged(on);
    if (!on && App.onAir) { App.onAir = null; App._air.forEach(f => f()); }
  };
  Stage.onResult(onStageResult);
  import("./combat.js").then(m => m.pushCombat());
  if (window.codex?.update) window.codex.update.onState(updateState);
  Stage.onState(setLive);
  Stage.isOpen().then(setLive);
  sb.onclick = () => App.streamLive ? App.menu(sb, [
    { text: "Bring stream window forward", icon: "stream", run: Stage.open },
    ...(App.onAir ? [{ text: "Take the handout down", icon: "image", run: App.hideHandout }] : []),
    { text: "Clear the table", icon: "trash", run: Stage.clear },
    { text: "Close stream window", icon: "x", run: Stage.close },
  ]) : Stage.open();
  addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) { e.preventDefault(); show(VIEWS[+e.key - 1].key); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); flush(); toast("Saved"); }
  });
}

// ---- updates ----
function updateState(u) {
  const pill = $("#updPill");
  if (u.state === "ready") { pill.hidden = false; pill.textContent = `Update ${u.version || ""} ready · restart`; pill.onclick = () => { flush(); window.codex.update.install(); }; }
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
  buildRail(); wireChrome(); renderCampName(); ls.set("rules", C().rules);
  show(C().ui.view || "prep");
})();
