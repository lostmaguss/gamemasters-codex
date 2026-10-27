// Ctrl+K: one box to find anything or do anything.
import { $, $$, esc, h, icon, toast } from "./util.js";
import { C } from "./store.js";
import { parseRoll } from "./roll.js";
import { rollTable } from "./tables.js";
import { BUILTIN } from "./sound.js";

export function openPalette(App, VIEWS) {
  if ($(".palette-back")) return;
  const back = h(`<div class="palette-back"><div class="palette"><div class="pl-in">${icon("search")}<input type="text" id="plQ" placeholder="Search everything, or type a roll like 2d6+3" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><ul id="plL"></ul><div class="pl-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Shift</kbd>+<kbd>Enter</kbd> secret roll</span></div></div></div>`);
  document.body.append(back);
  const q = $("#plQ", back), list = $("#plL", back);
  let items = [], sel = 0;
  const close = () => { back.remove(); removeEventListener("keydown", onKey, true); };
  back.addEventListener("mousedown", e => { if (e.target === back) close(); });

  function all() {
    const c = C(), out = [];
    VIEWS.forEach(v => out.push({ kind: "Go to", label: v.label, icon: v.icon, run: () => App.go(v.key) }));
    const cmd = (label, ic, run, kw = "") => out.push({ kind: "Do", label, icon: ic, run, kw });
    cmd("Open the stream window", "stream", () => App.stage.open(), "stream discord share");
    cmd("New note in the Codex", "codex", () => App.go("codex", { title: "New page " + new Date().toLocaleTimeString() }), "page write");
    cmd("Rules & genre settings", "gear", () => App.rulesModal(), "settings crit initiative");
    cmd("Discord settings", "discord", () => App.discord.discordModal(App), "webhook");
    cmd("Whisper to a player (Discord DM)", "lock", () => App.whisperPicker({ ask: true }), "secret private dm message");
    cmd("Stop all sounds", "sound", () => App.sound.send({ op: "stopAll", fade: 1 }), "silence mute");
    cmd("Take the handout off stream", "image", () => App.hideHandout(), "hide");
    ["npc", "place", "mission", "item"].forEach(k => cmd(`Generate ${k === "npc" ? "an NPC" : k === "item" ? "an item" : "a " + k}`, "forge", () => App.go("forge", { draw: k }), "forge random"));
    c.notes.forEach(n => out.push({ kind: n.cat, label: n.title || "Untitled", icon: "codex", sub: (n.body || "").slice(0, 80), run: () => App.go("codex", { note: n.id }) }));
    c.sessions.forEach(s => {
      const open = () => s.status === "planned" ? App.go("prep") : App.go("chronicle", { session: s.id });
      out.push({ kind: "Session", label: `Session ${s.num}${s.title ? ": " + s.title : ""}`, icon: "chronicle", run: open });
      (s.beats || []).filter(b => b.text).forEach(b => out.push({ kind: `Session ${s.num} scene`, label: b.text.replace(/\[\[|\]\]/g, "").slice(0, 90), icon: b.type, run: open }));
      (s.quotes || []).filter(q => q.line).forEach(q => out.push({ kind: `Quote · S${s.num}`, label: `“${q.line.slice(0, 80)}”`, sub: q.who, icon: "social", run: open }));
    });
    c.bestiary.forEach(x => out.push({ kind: "Creature", label: x.name, icon: "death", sub: x.kind, run: () => App.go("bestiary", { creature: x.id }) }));
    c.party.forEach(m => out.push({ kind: "Party", label: m.character || m.player, icon: "social", sub: m.role, run: () => App.go("party") }));
    c.tables.forEach(t => out.push({ kind: "Roll table", label: t.name, icon: "tables", run: () => { const r = rollTable(c, t.id); toast(`${t.name}: ${r.text}`); } }));
    c.handouts.forEach(hd => out.push({ kind: "Show handout", label: hd.title || "Handout", icon: "image", run: () => App.showHandout(hd) }));
    (c.maps || []).forEach(m => out.push({ kind: "Map", label: m.name, icon: "map", run: () => { c.ui.map = m.id; App.go("map"); } }));
    [...BUILTIN.sfx, ...c.sounds.filter(s => s.cat === "sfx")].forEach(s => out.push({ kind: "Play effect", label: s.name, icon: "sound", run: () => App.sound.send({ op: "play", key: s.id + ":" + Date.now(), sound: s.synth ? { synth: s.synth } : { url: `codexmedia://media/${encodeURIComponent(s.file)}` }, loop: false, vol: .9 }) }));
    return out;
  }
  const base = all();
  function score(it, words) {
    const hay = `${it.label} ${it.kind} ${it.sub || ""} ${it.kw || ""}`.toLowerCase(), lab = it.label.toLowerCase();
    let s = 0;
    for (const w of words) { const i = hay.indexOf(w); if (i < 0) return -1; s += lab.startsWith(w) ? 30 : lab.includes(w) ? 15 : 5; }
    return s + (it.kind === "Go to" ? 4 : 0);
  }
  function update() {
    const v = q.value.trim(), words = v.toLowerCase().split(/\s+/).filter(Boolean);
    items = [];
    const rollExpr = v.replace(/^(r|roll)\s+/i, "");
    if (/^[\dd%(]/i.test(rollExpr) || /^(r|roll)\s+/i.test(v)) { try { parseRoll(rollExpr); items.push({ kind: "Roll", label: rollExpr, icon: "dice", run: e => App.roll(rollExpr, "", { secret: e?.shiftKey }) }); } catch {} }
    items.push(...(words.length ? base.map(it => [score(it, words), it]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).map(([, it]) => it) : base.filter(it => it.kind === "Go to" || it.kind === "Do")).slice(0, 60));
    sel = 0; draw();
  }
  function draw() {
    list.innerHTML = items.map((it, i) => `<li class="${i === sel ? "on" : ""}" data-i="${i}">${icon(it.icon || "search")}<span class="pl-l">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span><span class="pl-k">${esc(it.kind)}</span></li>`).join("") || `<li class="none">Nothing found.</li>`;
    $$("li[data-i]", list).forEach(li => { li.onmousemove = () => { if (sel !== +li.dataset.i) { sel = +li.dataset.i; draw(); } }; li.onclick = e => go(e); });
    list.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  }
  function go(e) { const it = items[sel]; if (!it) return; close(); it.run(e); }
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); draw(); }
    if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); go(e); }
  }
  addEventListener("keydown", onKey, true);
  q.oninput = update; update(); q.focus();
}
