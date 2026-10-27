// Dice view on the GM desk. Rolls happen in the 3D tray here, or in the stream window when it's open.
import { $, $$, esc, h, icon, toast, uid, ls } from "./util.js";
import { C, save } from "./store.js";
import { parseRoll, diceGroups, buildResult, markFor, customFor } from "./roll.js";
import { DiceTray, THEMES, FELTS, setDiceSound } from "./dice3d.js";
import { dieIcon, createOverlay, logItem } from "./diceui.js";
import { Stage } from "./bridge.js";
import { customDiceModal } from "./customdice.js";

export function createDice(el, App) {
  const st = { pool: {}, mod: 0, custom: false, pending: null };
  const opt = { theme: ls.get("dice.theme", "ember"), felt: ls.get("dice.felt", "oxblood"), sound: ls.get("dice.sound", true), toStage: ls.get("dice.toStage", true), onTop: ls.get("dice.onTop", false) };
  el.innerHTML = `<div class="dice">
    <div class="tray-host" id="dTray"></div>
    <aside class="dice-side">
      <div>
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 class="side-h" style="margin:0">Build a roll</h3><span class="eyebrow">click adds · right-click removes</span></div>
        <div class="dgrid">${[4, 6, 8, 10, 12, 20, 100].map(s => `<button class="dpick" data-s="${s}" title="d${s}">${dieIcon(s)}d${s}<span class="cnt" data-cnt="${s}"></span></button>`).join("")}<button class="dpick" id="dClr" title="Clear the pool">${icon("x")}<span style="font-size:13px;font-family:var(--body)">Clear</span></button></div>
      </div>
      <div class="row">
        <label class="f" style="flex:1"><span>Roll</span><input type="text" id="dExpr" class="mono" spellcheck="false" value="1d20" placeholder="2d6+3, 4d6dl1, 2d20kh1"></label>
        <label class="f"><span>Modifier</span><div class="stepper"><button data-mod="-1" aria-label="Lower">−</button><output id="dMod">+0</output><button data-mod="1" aria-label="Raise">+</button></div></label>
      </div>
      <label class="f"><span>What's it for?</span><input type="text" id="dLabel" placeholder="Stealth check, Fireball, Goblin attack…"></label>
      <div id="dErr" style="color:var(--bad);font-size:13.5px;min-height:1em;margin-top:-8px"></div>
      <div class="two"><button class="btn" id="dAdv" title="Roll 2d20, keep the higher">Advantage</button><button class="btn" id="dDis" title="Roll 2d20, keep the lower">Disadvantage</button></div>
      <div class="roll-row"><button class="btn primary roll-btn" id="dRoll">Throw the dice <span class="mono" style="font-size:11px;opacity:.6;font-family:var(--mono)">ENTER</span></button>
        <button class="btn roll-btn secret-btn" id="dSecret" title="Roll here only. Never shown on stream (Shift+Enter)">${icon("lock")} Secret</button></div>
      <div>
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 class="side-h" style="margin:0">Saved rolls</h3><button class="btn sm ghost" id="pSave">${icon("plus")} Save current</button></div>
        <div class="presets" id="dPresets"></div>
      </div>
      <div>
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 class="side-h" style="margin:0">Custom dice</h3><button class="btn sm ghost" id="cdNew">${icon("plus")} New die</button></div>
        <div class="presets" id="dCustom"></div>
      </div>
      <div class="stream-card">
        <div class="row" style="justify-content:space-between"><h3 class="side-h" style="margin:0">Stream window</h3><span class="eyebrow" id="sState">Closed</span></div>
        <p>A separate window with just the dice table. In Discord pick <b>Share Screen → Applications → Codex Dice</b>. Your notes stay private on this window.</p>
        <button class="btn primary" id="sOpen">${icon("stream")} Open stream window</button>
        <button class="btn" id="sTv" title="For in-person games: the player display fills a TV or projector">${icon("fit")} Player display on a second screen</button>
        <label class="toggle"><input type="checkbox" id="sTo" ${opt.toStage ? "checked" : ""}> Throw on the stream window while it's open</label>
        <label class="toggle"><input type="checkbox" id="sTop" ${opt.onTop ? "checked" : ""}> Keep it above other windows</label>
      </div>
      <div>
        <h3 class="side-h">Table</h3>
        <div class="two">
          <label class="f"><span>Dice</span><select id="dTheme">${Object.entries(THEMES).map(([k, t]) => `<option value="${k}" ${k === opt.theme ? "selected" : ""}>${t.label}</option>`).join("")}</select></label>
          <label class="f"><span>Surface</span><select id="dFelt">${Object.entries(FELTS).map(([k, t]) => `<option value="${k}" ${k === opt.felt ? "selected" : ""}>${t.label}</option>`).join("")}</select></label>
        </div>
        <label class="toggle" style="margin-top:10px"><input type="checkbox" id="dSound" ${opt.sound ? "checked" : ""}> Dice sounds</label>
        <label class="toggle" style="margin-top:6px"><input type="checkbox" id="dDisc" ${App.discord.settings().autoRolls ? "checked" : ""}> Post public rolls to Discord</label>
      </div>
      <div>
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 class="side-h" style="margin:0">Roll log</h3><button class="btn sm ghost" id="lClr">Clear</button></div>
        <ul class="log" id="dLog"></ul>
      </div>
    </aside></div>`;
  const host = $("#dTray", el);
  const tray = new DiceTray(host, { theme: opt.theme, felt: opt.felt });
  const ov = createOverlay(host);
  setDiceSound(opt.sound);
  const exprIn = $("#dExpr", el), labelIn = $("#dLabel", el), err = $("#dErr", el);

  function exprFromPool() {
    const parts = Object.entries(st.pool).filter(([, n]) => n > 0).sort((a, b) => b[0] - a[0]).map(([s, n]) => `${n}d${s}`);
    let e = parts.join("+") || "1d20";
    if (st.mod) e += (st.mod > 0 ? "+" : "-") + Math.abs(st.mod);
    return e;
  }
  function syncPool() {
    $$("[data-cnt]", el).forEach(x => { const n = st.pool[x.dataset.cnt] || 0; x.textContent = n ? "×" + n : ""; });
    $("#dMod", el).textContent = (st.mod >= 0 ? "+" : "−") + Math.abs(st.mod);
    if (!st.custom) exprIn.value = exprFromPool();
  }
  $$(".dpick[data-s]", el).forEach(b => {
    b.onclick = e => { if (st.custom) { st.pool = {}; st.custom = false; } const s = b.dataset.s; st.pool[s] = Math.min(20, (st.pool[s] || 0) + 1); syncPool(); if (e.shiftKey) roll(); };
    b.oncontextmenu = e => { e.preventDefault(); const s = b.dataset.s; st.pool[s] = Math.max(0, (st.pool[s] || 0) - 1); st.custom = false; syncPool(); };
  });
  $("#dClr", el).onclick = () => { st.pool = {}; st.mod = 0; st.custom = false; syncPool(); };
  $$("[data-mod]", el).forEach(b => b.onclick = () => { st.mod = Math.max(-30, Math.min(30, st.mod + +b.dataset.mod)); if (st.custom) { st.custom = false; } syncPool(); });
  exprIn.oninput = () => { st.custom = true; $$("[data-cnt]", el).forEach(x => x.textContent = ""); };
  const modStr = () => st.mod ? (st.mod > 0 ? "+" : "-") + Math.abs(st.mod) : "";

  async function roll(expr = exprIn.value, label = labelIn.value.trim(), secret = false) {
    err.textContent = "";
    let terms; try { terms = parseRoll(expr); } catch (e) { err.textContent = e.message; return; }
    const req = { id: uid(), expr, label: secret ? (label || "Secret roll") : label, who: "", rules: C().rules, custom: customFor(expr) };
    if (!secret && App.streamLive && opt.toStage) { st.pending = req.id; Stage.roll(req); ov.wait(label || expr); return; }
    ov.hide();
    const values = await tray.roll(diceGroups(terms));
    const r = buildResult(req, terms, values); r.secret = secret;
    tray.mark(tray.physicalIndex().map(([gi, ri]) => markFor(r, gi, ri)));
    ov.show(r); App.recordRoll(r);
  }
  function addLog(r) {
    const log = $("#dLog", el); if (log.querySelector("li.empty")) log.innerHTML = "";
    log.prepend(logItem(r)); while (log.children.length > 80) log.lastChild.remove();
  }

  $("#dRoll", el).onclick = () => roll();
  $("#dSecret", el).onclick = () => roll(undefined, undefined, true);
  $("#dAdv", el).onclick = () => roll("2d20kh1" + modStr(), labelIn.value.trim() || "Advantage");
  $("#dDis", el).onclick = () => roll("2d20kl1" + modStr(), labelIn.value.trim() || "Disadvantage");
  exprIn.onkeydown = labelIn.onkeydown = e => { if (e.key === "Enter") roll(undefined, undefined, e.shiftKey); };
  const onKey = e => {
    if (el.closest("[hidden]") || document.querySelector(".modal-back")) return;
    if (e.key === "Enter" && !e.target.closest("input,textarea,select,button")) { e.preventDefault(); roll(undefined, undefined, e.shiftKey); }
  };
  addEventListener("keydown", onKey);

  function renderCustom() {
    const box = $("#dCustom", el), list = C().customDice || [];
    box.innerHTML = list.length ? list.map(d => `<span class="preset" data-cd="${d.id}" title="Click to roll, right-click to edit">${esc(d.name)} <code>${esc(d.faces.map(f => f.label || "·").join(" "))}</code><button class="x" title="Edit">${icon("gear")}</button></span>`).join("")
      : `<span style="color:var(--faint);font-size:13.5px">Dice with your own symbols: boons, runes, hit/miss…</span>`;
    $$("[data-cd]", box).forEach(b => {
      const d = list.find(x => x.id === b.dataset.cd);
      const edit = () => customDiceModal(App, d, renderCustom);
      b.oncontextmenu = e => { e.preventDefault(); edit(); };
      b.onclick = e => { if (e.target.closest(".x")) return edit(); exprIn.value = `${(exprIn.value.match(new RegExp(`^(\\d+)d\\[${d.name}\\]$`, "i")) || [, 0])[1] * 1 + 1}d[${d.name}]`; exprIn.dispatchEvent(new Event("input")); };
    });
  }
  $("#cdNew", el).onclick = () => customDiceModal(App, null, renderCustom);
  function renderPresets() {
    const box = $("#dPresets", el), list = C().presets || (C().presets = []);
    box.innerHTML = list.length ? list.map(p => `<span class="preset" data-id="${p.id}" title="${esc(p.expr)}">${esc(p.name)} <code>${esc(p.expr)}</code><button class="x" title="Remove">${icon("x")}</button></span>`).join("")
      : `<span style="color:var(--faint);font-size:13.5px">Save attacks and checks you roll a lot.</span>`;
    $$(".preset", box).forEach(b => {
      const p = list.find(x => x.id === b.dataset.id);
      b.onclick = e => { if (e.target.closest(".x")) { C().presets = list.filter(x => x !== p); save(); renderPresets(); return; } roll(p.expr, p.name); };
    });
  }
  $("#pSave", el).onclick = () => {
    const expr = exprIn.value.trim(); try { parseRoll(expr); } catch (e) { err.textContent = e.message; return; }
    App.modal(`<h2>Save this roll</h2><label class="f"><span>Name</span><input type="text" id="pn" value="${esc(labelIn.value)}" placeholder="Longsword, Perception…"></label><div class="mono" style="color:var(--dim)">${esc(expr)}</div><div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
      const ok = () => { C().presets.push({ id: uid(), name: $("#pn", m).value.trim() || expr, expr }); save(); renderPresets(); close(); };
      $("[data-x]", m).onclick = close; $("[data-ok]", m).onclick = ok; $("#pn", m).onkeydown = e => { if (e.key === "Enter") ok(); };
    });
  };
  function renderLog() {
    const log = $("#dLog", el), rolls = C().rolls || [];
    log.innerHTML = rolls.length ? "" : `<li class="empty" style="display:block;color:var(--faint);background:none;border:0;padding:0">Rolls land here, with what each die showed.</li>`;
    rolls.slice(0, 80).forEach(r => log.append(logItem(r)));
  }
  $("#lClr", el).onclick = () => { C().rolls = []; save(); renderLog(); };

  $("#sOpen", el).onclick = () => Stage.open();
  $("#sTv", el).onclick = () => App.tableMode?.();
  $("#sTo", el).onchange = e => { opt.toStage = e.target.checked; ls.set("dice.toStage", opt.toStage); };
  $("#sTop", el).onchange = e => { opt.onTop = e.target.checked; ls.set("dice.onTop", opt.onTop); Stage.onTop(opt.onTop); };
  $("#dTheme", el).onchange = e => { opt.theme = e.target.value; ls.set("dice.theme", opt.theme); tray.setTheme(opt.theme); };
  $("#dFelt", el).onchange = e => { opt.felt = e.target.value; ls.set("dice.felt", opt.felt); tray.setFelt(opt.felt); };
  $("#dDisc", el).onchange = e => { if (e.target.checked && !App.discord.connected()) { e.target.checked = false; App.discord.discordModal(App); return; } App.discord.settings().autoRolls = e.target.checked; save(); };
  $("#dSound", el).onchange = e => { opt.sound = e.target.checked; ls.set("dice.sound", opt.sound); setDiceSound(opt.sound); };
  function streamState(on) {
    $("#sState", el).textContent = on ? "Live" : "Closed"; $("#sState", el).style.color = on ? "var(--ember)" : "";
    $("#sOpen", el).innerHTML = on ? `${icon("stream")} Bring it to the front` : `${icon("stream")} Open stream window`;
    if (on) Stage.onTop(opt.onTop);
  }
  streamState(!!App.streamLive);
  syncPool(); renderPresets(); renderCustom(); renderLog();
  return {
    show() { tray.resize(); },
    refresh() { renderPresets(); renderCustom(); renderLog(); },
    streamState, addLog,
    showResult(r) { if (r.id === st.pending) st.pending = null; ov.show(r); },
    destroy() { removeEventListener("keydown", onKey); tray.dispose(); },
  };
}
