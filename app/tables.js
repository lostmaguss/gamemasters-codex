// Custom random tables. Rows can hold inline dice {2d6} and roll other tables with @{Table name}.
import { $, $$, esc, h, icon, toast, uid, rnd, copyText, debounce } from "./util.js";
import { C, save } from "./store.js";
import { parseRoll } from "./roll.js";

export function quickRoll(expr) {
  const terms = parseRoll(expr); let total = 0; const bits = [];
  for (const t of terms) {
    if (t.flat != null) { total += t.sign * t.flat; continue; }
    const vals = Array.from({ length: t.count }, () => rnd(t.sides) + 1).sort((a, b) => b - a);
    let kept = vals;
    if (t.keep) { const n = Math.min(t.keep.n, vals.length); kept = t.keep.mode === "kh" ? vals.slice(0, n) : t.keep.mode === "kl" ? vals.slice(-n) : t.keep.mode === "dl" ? vals.slice(0, vals.length - n) : vals.slice(n); }
    total += t.sign * kept.reduce((s, v) => s + v, 0); bits.push(vals.join(" "));
  }
  return { total, detail: bits.join(" | ") };
}
const findTable = (c, ref) => c.tables.find(t => t.id === ref) || c.tables.find(t => t.name.toLowerCase() === String(ref).trim().toLowerCase());

export function rollTable(c, ref, depth = 0) {
  const t = findTable(c, ref);
  if (!t) return { text: `[no table "${ref}"]`, html: `<em class="miss">no table “${esc(ref)}”</em>` };
  const rows = t.rows.filter(r => r.text.trim());
  if (!rows.length) return { table: t, text: "(empty table)", html: "<em>(empty table)</em>" };
  const total = rows.reduce((s, r) => s + Math.max(1, Number(r.w) || 1), 0);
  let n = rnd(total) + 1, k = n, row = rows[0];
  for (const r of rows) { k -= Math.max(1, Number(r.w) || 1); if (k <= 0) { row = r; break; } }
  let text = "", html = "";
  const re = /\{([^}]+)\}|@\{([^}]+)\}/g; let last = 0, m;
  while ((m = re.exec(row.text))) {
    const before = row.text.slice(last, m.index); text += before; html += esc(before); last = re.lastIndex;
    if (m[0].startsWith("@")) {
      if (depth > 5) { text += m[0]; html += esc(m[0]); continue; }
      const sub = rollTable(c, m[2], depth + 1); text += sub.text; html += `<span class="nest" title="@{${esc(m[2])}}">${sub.html}</span>`;
    } else {
      try { const r = quickRoll(m[1]); text += r.total; html += `<span class="inl" title="${esc(m[1])}: ${esc(r.detail)}">${r.total}</span>`; } catch { text += m[0]; html += esc(m[0]); }
    }
  }
  text += row.text.slice(last); html += esc(row.text.slice(last));
  return { table: t, num: n, die: total, text, html };
}

export function createTables(el, App) {
  const st = { sel: C().ui.table, q: "" };
  el.innerHTML = `<div class="tables">
    <aside class="tb-list"><div class="head"><div class="row"><button class="btn primary" id="tNew" style="flex:1">${icon("plus")} New table</button><button class="btn" id="tPaste" title="Paste a list">${icon("copy")} Paste</button></div><input type="search" id="tQ" placeholder="Search tables"></div><div class="tb-items" id="tItems"></div></aside>
    <section class="tb-edit" id="tEdit"></section>
    <aside class="tb-roll" id="tRoll"></aside>
  </div>`;
  const T = () => C().tables;
  const cur = () => T().find(t => t.id === st.sel);
  const touch = debounce(() => { save(); renderList(); }, 300);

  function renderList() {
    const q = st.q.toLowerCase(), groups = {};
    T().filter(t => !q || (t.name + " " + t.folder + " " + t.rows.map(r => r.text).join(" ")).toLowerCase().includes(q))
      .forEach(t => (groups[t.folder || "Unsorted"] ||= []).push(t));
    $("#tItems", el).innerHTML = Object.keys(groups).sort().map(f => `<div class="eyebrow tb-folder">${esc(f)}</div>` + groups[f].sort((a, b) => a.name.localeCompare(b.name)).map(t =>
      `<button class="cx-item ${t.id === st.sel ? "on" : ""}" data-id="${t.id}"><b>${esc(t.name || "Untitled table")}</b><span>d${t.rows.reduce((s, r) => s + Math.max(1, Number(r.w) || 1), 0)} · ${t.rows.length} rows</span></button>`).join("")).join("")
      || `<p style="padding:14px;color:var(--faint)">No tables match.</p>`;
    $$("[data-id]", $("#tItems", el)).forEach(b => b.onclick = () => { st.sel = b.dataset.id; C().ui.table = st.sel; renderList(); renderEdit(); renderRoll(); });
  }
  function renderEdit() {
    const box = $("#tEdit", el), t = cur();
    if (!t) { box.innerHTML = `<div class="empty"><h3>Your own random tables</h3><p>Encounters, weather, rumors, loot, anything your world needs. Rows can roll dice like <span class="mono">{2d6}</span> and other tables like <span class="mono">@{Weather}</span>.</p></div>`; return; }
    let acc = 0;
    const folders = [...new Set(T().map(x => x.folder).filter(Boolean))];
    box.innerHTML = `<div class="tb-head">
        <input class="tb-name" id="tName" type="text" value="${esc(t.name)}" placeholder="Table name">
        <div class="row"><label class="f" style="width:200px"><span>Folder</span><input type="text" id="tFolder" list="tFolders" value="${esc(t.folder || "")}" placeholder="Encounters"></label><datalist id="tFolders">${folders.map(f => `<option value="${esc(f)}">`).join("")}</datalist>
        <div class="tb-die">d${t.rows.reduce((s, r) => s + Math.max(1, Number(r.w) || 1), 0)}</div><div style="flex:1"></div>
        <button class="btn sm ghost" id="tDup">${icon("copy")} Duplicate</button><button class="btn sm ghost danger" id="tDel">${icon("trash")} Delete</button></div>
      </div>
      <div class="tb-rows" id="tRows">
        <div class="tb-row eyebrow"><span>Roll</span><span>Weight</span><span>Result</span><span></span></div>
        ${t.rows.map((r, i) => { const w = Math.max(1, Number(r.w) || 1); const a = acc + 1; acc += w; return `<div class="tb-row" data-i="${i}"><span class="rng mono">${a === acc ? a : a + "–" + acc}</span>
          <div class="stepper sm"><button data-w="-1" aria-label="Less likely">−</button><output>${w}</output><button data-w="1" aria-label="More likely">+</button></div>
          <input type="text" value="${esc(r.text)}" placeholder="What happens">
          <span class="ops"><button data-up title="Move up">${icon("up")}</button><button data-down title="Move down">${icon("down")}</button><button data-del title="Remove">${icon("x")}</button></span></div>`; }).join("")}
      </div>
      <button class="btn sm" id="tAddRow" style="align-self:flex-start">${icon("plus")} Add row</button>
      <p class="md-help">Weight makes a row more likely. Inside a row, <code>{2d6}</code> rolls dice and <code>@{Table name}</code> rolls another table. Press Enter in a row to add the next one.</p>`;
    $("#tName", box).oninput = e => { t.name = e.target.value; touch(); };
    $("#tFolder", box).oninput = e => { t.folder = e.target.value; touch(); };
    $$(".tb-row[data-i]", box).forEach(row => {
      const i = +row.dataset.i, r = t.rows[i], inp = $("input", row);
      inp.oninput = () => { r.text = inp.value; touch(); };
      inp.onkeydown = e => {
        if (e.key === "Enter") { e.preventDefault(); t.rows.splice(i + 1, 0, { id: uid(), w: 1, text: "" }); save(); renderEdit(); $$(".tb-row[data-i] input", el)[i + 1]?.focus(); }
        if (e.key === "Backspace" && !inp.value && t.rows.length > 1) { e.preventDefault(); t.rows.splice(i, 1); save(); renderEdit(); $$(".tb-row[data-i] input", el)[Math.max(0, i - 1)]?.focus(); }
      };
      $$("[data-w]", row).forEach(b => b.onclick = () => { r.w = Math.max(1, Math.min(99, (Number(r.w) || 1) + +b.dataset.w)); save(); renderEdit(); renderList(); });
      $("[data-up]", row).onclick = () => { if (i) { t.rows.splice(i - 1, 0, t.rows.splice(i, 1)[0]); save(); renderEdit(); } };
      $("[data-down]", row).onclick = () => { if (i < t.rows.length - 1) { t.rows.splice(i + 1, 0, t.rows.splice(i, 1)[0]); save(); renderEdit(); } };
      $("[data-del]", row).onclick = () => { t.rows.splice(i, 1); save(); renderEdit(); renderList(); };
    });
    $("#tAddRow", box).onclick = () => { t.rows.push({ id: uid(), w: 1, text: "" }); save(); renderEdit(); $$(".tb-row[data-i] input", el).pop()?.focus(); };
    $("#tDup", box).onclick = () => { const n = JSON.parse(JSON.stringify(t)); n.id = uid(); n.name += " copy"; n.hist = []; T().push(n); st.sel = n.id; save(); renderList(); renderEdit(); renderRoll(); };
    $("#tDel", box).onclick = () => App.confirm(`Delete "${t.name}"?`, "Rows that roll this table with @{…} will show it as missing.", "Delete table", () => { C().tables = T().filter(x => x !== t); st.sel = T()[0]?.id; save(); renderList(); renderEdit(); renderRoll(); });
  }
  function resultCard(r) {
    return `<div class="tb-res" data-rid="${r.id}"><div class="tb-res-h"><span class="badge mono">${r.num}<small>/d${r.die}</small></span><span class="eyebrow">${esc(r.name)}</span></div>
      <div class="tb-res-t">${r.html}</div>
      <div class="tb-res-a"><button class="btn sm ghost" data-a="copy" title="Copy">${icon("copy")}</button><button class="btn sm ghost" data-a="pin" title="Pin to board">${icon("pin")}</button><button class="btn sm ghost" data-a="show" title="Show on stream">${icon("stream")}</button><button class="btn sm ghost" data-a="beat" title="Log in tonight's session">${icon("chronicle")}</button></div></div>`;
  }
  function renderRoll() {
    const box = $("#tRoll", el), t = cur();
    if (!t) { box.innerHTML = ""; return; }
    t.hist ||= [];
    box.innerHTML = `<button class="btn primary roll-btn" id="tGo">Roll ${esc(t.name || "table")}</button>
      <div class="row" style="justify-content:space-between"><div class="row" style="gap:6px"><button class="btn sm" data-n="3">×3</button><button class="btn sm" data-n="5">×5</button></div><button class="btn sm ghost" id="tClear">Clear</button></div>
      <div class="tb-results">${t.hist.map(resultCard).join("") || `<p style="color:var(--faint);font-size:14px">Results stack up here. Press R to roll.</p>`}</div>`;
    const go = n => { for (let i = 0; i < n; i++) { const r = rollTable(C(), t.id); t.hist.unshift({ id: uid(), name: t.name, num: r.num, die: r.die, text: r.text, html: r.html }); } t.hist.length = Math.min(t.hist.length, 20); save(); renderRoll(); $(".tb-res", box)?.classList.add("fresh"); };
    $("#tGo", box).onclick = () => go(1);
    $$("[data-n]", box).forEach(b => b.onclick = () => go(+b.dataset.n));
    $("#tClear", box).onclick = () => { t.hist = []; save(); renderRoll(); };
    $$(".tb-res", box).forEach(card => {
      const r = t.hist.find(x => x.id === card.dataset.rid);
      $$("[data-a]", card).forEach(b => b.onclick = () => {
        const a = b.dataset.a;
        if (a === "copy") copyText(r.text);
        if (a === "pin") App.pinToBoard({ type: "note", color: "sky", text: `${r.name} (${r.num}): ${r.text}` });
        if (a === "show") App.showHandout({ type: "text", style: "card", title: r.name, text: r.text });
        if (a === "beat") App.logBeat("discovery", `${r.name}: ${r.text}`);
      });
    });
  }
  function newTable(name = "New table", rows = [""]) {
    const t = { id: uid(), name, folder: "", rows: rows.map(x => typeof x === "string" ? { id: uid(), w: 1, text: x } : { id: uid(), ...x }), hist: [] };
    T().push(t); st.sel = t.id; C().ui.table = t.id; save(); renderList(); renderEdit(); renderRoll();
    return t;
  }
  $("#tNew", el).onclick = () => { newTable(""); $("#tName", el)?.focus(); };
  $("#tPaste", el).onclick = () => App.modal(`<h2>Paste a table</h2><p style="margin:0;color:var(--dim)">One row per line. Ranges like <span class="mono">1-3 Goblins</span> or <span class="mono">4. Ogre</span> are understood, so tables from books and PDFs paste straight in.</p>
    <label class="f"><span>Name</span><input type="text" id="pN" placeholder="Swamp encounters"></label><textarea id="pT" rows="12" placeholder="1-2 A sinkhole opens\n3 Leeches, hundreds\n4-6 A witch's hut on stilts"></textarea>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Make table</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    $("[data-ok]", m).onclick = () => {
      const rows = $("#pT", m).value.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
        const r = l.match(/^(\d+)\s*(?:[-–—]|to)\s*(\d+)[.):\s]+(.*)$/); if (r) return { w: Math.max(1, +r[2] - +r[1] + 1), text: r[3].trim() };
        const s = l.match(/^(\d+)[.):\s]+(.*)$/); if (s) return { w: 1, text: s[2].trim() };
        return { w: 1, text: l.replace(/^[-*•]\s*/, "") };
      });
      if (!rows.length) return toast("Paste at least one line");
      newTable($("#pN", m).value.trim() || "Pasted table", rows); close(); toast(`Made a d${rows.reduce((s, r) => s + r.w, 0)} table`);
    };
  });
  $("#tQ", el).oninput = e => { st.q = e.target.value; renderList(); };
  const onKey = e => { if (el.closest("[hidden]") || document.querySelector(".modal-back") || e.target.closest("input,textarea,select")) return; if (e.key === "r" || e.key === "R") { e.preventDefault(); $("#tGo", el)?.click(); } };
  addEventListener("keydown", onKey);
  if (!cur()) st.sel = T()[0]?.id;
  renderList(); renderEdit(); renderRoll();
  return { refresh() { renderList(); renderEdit(); renderRoll(); }, destroy() { removeEventListener("keydown", onKey); } };
}
