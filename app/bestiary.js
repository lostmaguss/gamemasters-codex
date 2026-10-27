// Bestiary: creatures with a stat layout you define for your own system. Ability rolls are clickable.
import { $, $$, esc, h, icon, toast, uid, debounce, ls } from "./util.js";
import { C, save } from "./store.js";
import { shrinkImage } from "./board.js";

const skull = on => `<svg class="ic skull ${on ? "on" : ""}" viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.3 4 3 5v3h8v-3c1.7-1 3-2.5 3-5a7 7 0 0 0-7-7zM9.5 10h.01M14.5 10h.01M10 21h4"/></svg>`;

export function nextPlanned(c, create = true) {
  let s = c.sessions.filter(x => x.status === "planned" || x.status === "live").sort((a, b) => (a.num || 0) - (b.num || 0))[0];
  if (!s && create) {
    const num = Math.max(0, ...c.sessions.map(x => Number(x.num) || 0)) + 1;
    s = { id: uid(), num, title: "", status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: Date.now() };
    c.sessions.push(s);
  }
  if (s) s.plan ||= { start: "", scenes: [], secrets: [], cast: [], encounters: [], treasure: [], handouts: [] };
  return s;
}

export function createBestiary(el, App) {
  const st = { sel: C().ui.creature, q: "", edit: false, secret: ls.get("bst.secret", false) };
  el.innerHTML = `<div class="bestiary">
    <aside class="tb-list"><div class="head"><div class="row"><button class="btn primary" id="bNew" style="flex:1">${icon("plus")} New creature</button><button class="btn icon" id="bTpl" title="Stat block layout">${icon("gear")}</button></div><input type="search" id="bQ" placeholder="Search the bestiary"></div><div class="tb-items" id="bItems"></div></aside>
    <section class="bst-stage" id="bStage"></section>
  </div>`;
  const B = () => C().bestiary;
  const cur = () => B().find(x => x.id === st.sel);
  const touch = debounce(() => { save(); renderList(); }, 300);

  function renderList() {
    const q = st.q.toLowerCase();
    const list = B().filter(x => !q || `${x.name} ${x.kind} ${x.tags}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
    $("#bItems", el).innerHTML = list.map(x => `<button class="cx-item ${x.id === st.sel ? "on" : ""}" data-id="${x.id}"><b>${esc(x.name || "Unnamed")}</b><span class="threat-line">${[1, 2, 3, 4, 5].map(i => skull(i <= (x.threat || 0))).join("")} <span>${esc(x.kind || "")}</span></span></button>`).join("")
      || `<p style="padding:14px;color:var(--faint)">${B().length ? "No matches." : "No creatures yet."}</p>`;
    $$("[data-id]", $("#bItems", el)).forEach(b => b.onclick = () => { st.sel = b.dataset.id; C().ui.creature = st.sel; st.edit = false; renderList(); renderCard(); });
  }
  function rollAbility(x, a) { if (!a.roll) return; App.roll(a.roll, `${x.name}: ${a.name}`, { secret: st.secret }); }
  function renderCard() {
    const box = $("#bStage", el), x = cur(), tpl = C().statTemplate;
    if (!x) { box.innerHTML = `<div class="empty"><h3>A bestiary for your own system</h3><p>Set the stat block layout your homebrew uses (the gear button), then make creatures. Ability rolls become one-click buttons.</p><button class="btn primary" id="bE">${icon("plus")} First creature</button></div>`; $("#bE", box).onclick = newCreature; return; }
    x.stats ||= {}; x.abilities ||= [];
    const bar = `<div class="bst-bar"><div class="mode-seg"><button data-m="view" class="${!st.edit ? "on" : ""}">View</button><button data-m="edit" class="${st.edit ? "on" : ""}">Edit</button></div>
      <label class="toggle"><input type="checkbox" id="bSecret" ${st.secret ? "checked" : ""}> ${icon("lock")} Secret rolls</label><div style="flex:1"></div>
      <button class="btn sm" id="bEnc">${icon("combat")} Add to next session</button><button class="btn sm" id="bPin">${icon("pin")} Pin to board</button>
      <button class="btn sm ghost" id="bDup">${icon("copy")}</button><button class="btn sm ghost danger" id="bDel">${icon("trash")}</button></div>`;
    if (!st.edit) {
      box.innerHTML = bar + `<article class="mcard">
        ${x.img ? `<div class="mimg" style="background-image:url(${x.img})"></div>` : ""}
        <div class="mhead"><div><h2>${esc(x.name || "Unnamed")}</h2><div class="mkind">${esc(x.kind || "")}${x.tags ? ` · ${esc(x.tags)}` : ""}</div></div><div class="threat" title="Threat ${x.threat || 0}/5">${[1, 2, 3, 4, 5].map(i => skull(i <= (x.threat || 0))).join("")}</div></div>
        <div class="mstats">${tpl.map(k => `<div class="mstat ${k.toLowerCase() === "hp" ? "hp" : ""}"><span>${esc(k)}</span><b>${esc(x.stats[k] ?? "—")}</b></div>`).join("")}</div>
        <div class="mabil">${x.abilities.map(a => `<div class="ab"><div class="ab-h"><b>${esc(a.name)}</b>${a.roll ? `<button class="rollchip" data-roll="${a.id}" title="Roll ${esc(a.roll)}${st.secret ? " secretly" : ""}">${icon("dice")} ${esc(a.roll)}</button>` : ""}</div>${a.text ? `<p>${esc(a.text)}</p>` : ""}</div>`).join("") || `<p style="opacity:.6">No abilities yet. Switch to Edit.</p>`}</div>
        ${x.notes ? `<div class="msec"><span class="eyebrow">Tactics & notes</span><p>${esc(x.notes)}</p></div>` : ""}
        ${x.loot ? `<div class="msec"><span class="eyebrow">Loot</span><p>${esc(x.loot)}</p></div>` : ""}
      </article>`;
      $$("[data-roll]", box).forEach(b => b.onclick = () => rollAbility(x, x.abilities.find(a => a.id === b.dataset.roll)));
    } else {
      box.innerHTML = bar + `<article class="mcard editing">
        <div class="mhead"><div style="flex:1;display:flex;flex-direction:column;gap:6px"><input class="m-name" type="text" data-k="name" value="${esc(x.name)}" placeholder="Creature name"><div class="row"><input type="text" data-k="kind" value="${esc(x.kind)}" placeholder="Kind (undead beast, elite soldier…)" style="flex:1"><input type="text" data-k="tags" value="${esc(x.tags)}" placeholder="tags" style="flex:1"></div></div>
          <div class="threat edit" title="Threat">${[1, 2, 3, 4, 5].map(i => `<button data-threat="${i}">${skull(i <= (x.threat || 0))}</button>`).join("")}</div></div>
        <div class="mstats">${tpl.map(k => `<label class="mstat ${k.toLowerCase() === "hp" ? "hp" : ""}"><span>${esc(k)}</span><input type="text" data-stat="${esc(k)}" value="${esc(x.stats[k] ?? "")}"></label>`).join("")}</div>
        <div class="mabil">${x.abilities.map(a => `<div class="ab edit" data-ab="${a.id}"><div class="row"><input type="text" data-ak="name" value="${esc(a.name)}" placeholder="Ability or attack" style="flex:2"><input type="text" class="mono" data-ak="roll" value="${esc(a.roll)}" placeholder="1d20+4 (optional)" style="flex:1"><button class="btn sm icon ghost danger" data-abdel title="Remove">${icon("x")}</button></div><textarea data-ak="text" rows="2" placeholder="What it does">${esc(a.text)}</textarea></div>`).join("")}
          <button class="btn sm" id="abAdd">${icon("plus")} Add ability</button></div>
        <label class="f msec"><span>Tactics & notes</span><textarea data-k="notes" rows="3">${esc(x.notes)}</textarea></label>
        <label class="f msec"><span>Loot</span><input type="text" data-k="loot" value="${esc(x.loot)}"></label>
        <div class="row msec"><button class="btn sm" id="bImg">${icon("image")} ${x.img ? "Change" : "Add"} picture</button>${x.img ? `<button class="btn sm ghost" id="bImgX">Remove picture</button>` : ""}<input type="file" id="bFile" accept="image/*" hidden></div>
      </article>`;
      $$("[data-k]", box).forEach(i => i.oninput = () => { x[i.dataset.k] = i.value; touch(); });
      $$("[data-stat]", box).forEach(i => i.oninput = () => { x.stats[i.dataset.stat] = i.value; if (i.dataset.stat.toLowerCase() === "hp") x.hp = i.value; touch(); });
      $$("[data-threat]", box).forEach(b => b.onclick = () => { const v = +b.dataset.threat; x.threat = x.threat === v ? v - 1 : v; save(); renderCard(); renderList(); });
      $$("[data-ab]", box).forEach(d => { const a = x.abilities.find(y => y.id === d.dataset.ab); $$("[data-ak]", d).forEach(i => i.oninput = () => { a[i.dataset.ak] = i.value; touch(); }); $("[data-abdel]", d).onclick = () => { x.abilities = x.abilities.filter(y => y !== a); save(); renderCard(); }; });
      $("#abAdd", box).onclick = () => { x.abilities.push({ id: uid(), name: "", roll: "", text: "" }); save(); renderCard(); $$("[data-ak=name]", el).pop()?.focus(); };
      $("#bImg", box).onclick = () => $("#bFile", box).click();
      $("#bFile", box).onchange = async e => { const f = e.target.files[0]; if (f) { x.img = await shrinkImage(f, 700); save(); renderCard(); } };
      if ($("#bImgX", box)) $("#bImgX", box).onclick = () => { delete x.img; save(); renderCard(); };
      if (!x.name) $(".m-name", box).focus();
    }
    $$("[data-m]", box).forEach(b => b.onclick = () => { st.edit = b.dataset.m === "edit"; renderCard(); });
    $("#bSecret", box).onchange = e => { st.secret = e.target.checked; ls.set("bst.secret", st.secret); renderCard(); };
    $("#bEnc", box).onclick = () => {
      const s = nextPlanned(C()); const hp = parseInt(x.stats.HP || x.hp) || 0;
      const ex = s.plan.encounters.find(e => e.creature === x.id);
      if (ex) { ex.count++; ex.hp.push(hp); } else s.plan.encounters.push({ id: uid(), creature: x.id, count: 1, hp: [hp] });
      save(); toast(`Added to Session ${s.num}'s encounters`); App.refreshAll();
    };
    $("#bPin", box).onclick = () => App.pinToBoard({ type: "gen", kind: "creature", color: "ink", title: x.name, text: `${x.kind || ""}\n${tpl.filter(k => x.stats[k]).map(k => `${k} ${x.stats[k]}`).join(" · ")}\n\n${x.abilities.map(a => `${a.name}${a.roll ? ` (${a.roll})` : ""}`).join("\n")}` });
    $("#bDup", box).onclick = () => { const n = JSON.parse(JSON.stringify(x)); n.id = uid(); n.name += " (copy)"; n.abilities.forEach(a => a.id = uid()); B().push(n); st.sel = n.id; save(); renderList(); renderCard(); };
    $("#bDel", box).onclick = () => App.confirm(`Delete ${x.name || "this creature"}?`, "It's removed from the bestiary and from planned encounters.", "Delete creature", () => {
      C().bestiary = B().filter(y => y !== x); C().sessions.forEach(s => { if (s.plan) s.plan.encounters = s.plan.encounters.filter(e => e.creature !== x.id); });
      st.sel = B()[0]?.id; save(); renderList(); renderCard();
    });
  }
  function newCreature() {
    const x = { id: uid(), name: "", kind: "", tags: "", threat: 1, hp: "", stats: {}, abilities: [{ id: uid(), name: "Attack", roll: "1d20", text: "" }], notes: "", loot: "" };
    B().push(x); st.sel = x.id; st.edit = true; save(); renderList(); renderCard();
  }
  $("#bNew", el).onclick = newCreature;
  $("#bQ", el).oninput = e => { st.q = e.target.value; renderList(); };
  $("#bTpl", el).onclick = () => {
    const c = C();
    App.modal(`<h2>Stat block layout</h2><p style="margin:0;color:var(--dim)">The stats every creature in this campaign has, in order. Match your homebrew system. Name one of them <b>HP</b> and it's used for hit point tracking in Live.</p>
      <textarea id="tplT" rows="8">${esc(c.statTemplate.join("\n"))}</textarea><div class="md-help">One stat per line.</div>
      <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save layout</button></div>`, (m, close) => {
      $("[data-x]", m).onclick = close;
      $("[data-ok]", m).onclick = () => { c.statTemplate = $("#tplT", m).value.split("\n").map(s => s.trim()).filter(Boolean); save(); close(); renderCard(); };
    });
  };
  if (!cur()) st.sel = B()[0]?.id;
  renderList(); renderCard();
  return { refresh() { renderList(); renderCard(); }, show(arg) { if (arg?.creature) { st.sel = arg.creature; st.edit = false; } renderList(); renderCard(); } };
}
