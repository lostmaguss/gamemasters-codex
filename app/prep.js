// Session prep: everything for the next session on one page, then "Start session" hands it to Live.
import { rate, meterHTML, creatureHP, creatureDPR } from "./difficulty.js";
import { $, $$, esc, h, icon, toast, uid, debounce } from "./util.js";
import { C, save } from "./store.js";
import { nextPlanned } from "./bestiary.js";
import { CATS } from "./codex.js";

export function startSession(App, s) {
  const c = C();
  c.sessions.forEach(x => { if (x.status === "live" && x !== s) x.status = "played"; });
  s.status = "live"; s.date ||= new Date().toISOString().slice(0, 10);
  s.plan.startedAt = Date.now();
  if (!Object.keys(s.attendance || {}).length) s.attendance = Object.fromEntries(c.party.map(m => [m.id, true]));
  save(); App.go("live"); toast(`Session ${s.num} has started`);
  if (App.discord?.settings().autoSessions && App.discord.connected()) App.discord.postText(`Session ${s.num}${s.title ? ": " + s.title : ""} begins`, (s.recap ? "**Previously on…**\n" + s.recap.replace(/\[\[|\]\]/g, "") : "Take your seats.") + (s.ingame ? `\n\n*${s.ingame}*` : ""), { quiet: true });
}

export function createPrep(el, App) {
  const st = { sel: null };
  el.innerHTML = `<div class="prep" id="pp"></div>`;
  const touch = debounce(save, 300);
  const planned = () => C().sessions.filter(s => s.status === "planned" || s.status === "live").sort((a, b) => (a.num || 0) - (b.num || 0));
  const prevOf = s => C().sessions.filter(x => x !== s && (!x.status || x.status === "played") && (Number(x.num) || 0) < (Number(s.num) || 0)).sort((a, b) => b.num - a.num)[0];

  function listBlock(arr, key, ph, opts = {}) {
    return `<ul class="checks plan-list" data-list="${key}">${arr.map(t => `<li class="${t.done ? "done" : ""}" data-id="${t.id}">${opts.check === false ? "<span></span>" : `<input type="checkbox" ${t.done ? "checked" : ""}>`}<input type="text" value="${esc(t.text)}" placeholder="${ph}"><button class="x" title="Remove">${icon("x")}</button></li>`).join("")}</ul>
      <button class="btn sm ghost" data-addto="${key}">${icon("plus")} Add</button>`;
  }
  function render() {
    const box = $("#pp", el), c = C(), list = planned();
    let s = list.find(x => x.id === st.sel) || list[0];
    if (!s) {
      const n = Math.max(0, ...c.sessions.map(x => Number(x.num) || 0)) + 1;
      box.innerHTML = `<div class="empty"><h3>Prep the next session</h3><p>One page with the strong start, scenes, secrets to reveal, the cast, encounters and treasure. When you sit down to play, press Start and it all moves to Live.</p><button class="btn primary" id="ppNew">${icon("plus")} Plan session ${n}</button></div>`;
      $("#ppNew", box).onclick = () => { st.sel = nextPlanned(c).id; save(); render(); };
      return;
    }
    st.sel = s.id; s.plan ||= { start: "", scenes: [], secrets: [], cast: [], encounters: [], treasure: [], handouts: [] };
    const P = s.plan, prev = prevOf(s);
    const openThreads = c.sessions.flatMap(o => (o.threads || []).filter(t => !t.done && t.text).map(t => ({ t, o })));
    const ready = [P.start, P.scenes.length, P.secrets.length, P.cast.length, P.encounters.length, P.treasure.length].filter(Boolean).length;
    box.innerHTML = `
      <header class="pp-head">
        <div class="sess-num"><small>Session</small><input type="number" id="ppNum" value="${esc(s.num)}"></div>
        <div style="flex:1;min-width:0">
          <div class="eyebrow">${s.status === "live" ? "Running now" : "Planning"}${list.length > 1 ? ` · <select id="ppPick" style="width:auto;height:24px;padding:0 6px">${list.map(x => `<option value="${x.id}" ${x === s ? "selected" : ""}>Session ${esc(x.num)}${x.title ? ": " + esc(x.title) : ""}</option>`).join("")}</select>` : ""}</div>
          <input class="sess-title" id="ppTitle" type="text" value="${esc(s.title)}" placeholder="Working title for the session">
        </div>
        <div class="pp-go">
          <div class="ready"><b>${ready}/6</b><span>sections ready</span></div>
          ${s.status === "live" ? `<button class="btn primary roll-btn" id="ppLive">${icon("stream")} Back to Live</button>` : `<button class="btn primary roll-btn" id="ppStart">Start session</button>`}
        </div>
      </header>
      <div class="pp-grid">
        <div class="pp-main">
          <section class="pp-card wide"><div class="sec-h"><h3>Where we left off</h3><div class="line"></div></div>
            ${prev ? `<p class="pp-prev"><span class="eyebrow">Session ${esc(prev.num)} ended on</span><br>${esc(prev.cliff || "No cliffhanger written.")}</p>` : `<p class="pp-prev" style="color:var(--faint)">This is the first session.</p>`}
            <label class="f"><span>Previously on… (read aloud)</span><textarea id="ppRecap" rows="3" placeholder="Write it, or draft it from last session's key moments.">${esc(s.recap)}</textarea></label>
            ${prev ? `<button class="btn sm" id="ppDraft" style="margin-top:8px">${icon("reroll")} Draft from Session ${esc(prev.num)}</button>` : ""}
          </section>
          <section class="pp-card wide"><div class="sec-h"><h3>Strong start</h3><div class="line"></div><span class="eyebrow">open on action</span></div>
            <textarea id="ppStartTxt" class="big-field" rows="3" placeholder="The first thing that happens when you say 'Let's begin'.">${esc(P.start)}</textarea></section>
          <section class="pp-card"><div class="sec-h"><h3>Scenes</h3><div class="line"></div></div>${listBlock(P.scenes, "scenes", "A scene that might happen")}</section>
          <section class="pp-card"><div class="sec-h"><h3>Secrets & clues</h3><div class="line"></div></div>${listBlock(P.secrets, "secrets", "Something they could learn")}<p class="md-help">Not tied to a scene. Drop each one wherever it fits; tick it off in Live when it's revealed.</p></section>
          <section class="pp-card wide"><div class="sec-h"><h3>Encounters</h3><div class="line"></div><button class="btn sm" id="ppEnc">${icon("plus")} From bestiary</button></div>
            <div class="enc-list">${P.encounters.map(e => { const x = c.bestiary.find(b => b.id === e.creature); return `<div class="enc" data-e="${e.id}"><span class="threat-line">${x ? [1, 2, 3, 4, 5].map(i => `<svg class="ic skull ${i <= (x.threat || 0) ? "on" : ""}" viewBox="0 0 24 24"><path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.3 4 3 5v3h8v-3c1.7-1 3-2.5 3-5a7 7 0 0 0-7-7z"/></svg>`).join("") : ""}</span><b>${esc(x ? x.name : "Missing creature")}</b><span class="eyebrow">HP ${esc(x?.stats?.HP || x?.hp || "?")}</span><div style="flex:1"></div><div class="stepper sm"><button data-c="-1">−</button><output>${e.count}</output><button data-c="1">+</button></div><button class="btn sm icon ghost danger" data-rm>${icon("x")}</button></div>`; }).join("") || `<p style="color:var(--faint);margin:0">No encounters planned. Add creatures from the bestiary; their HP and attacks appear in Live.</p>`}</div>${P.encounters.length ? `<div class="eyebrow" style="margin:12px 0 6px">If they all fight at once</div>` + meterHTML(rate(P.encounters.flatMap(e => { const x = c.bestiary.find(b => b.id === e.creature); return Array.from({ length: e.count }, () => ({ hp: creatureHP(x), dpr: creatureDPR(x) })); }), c.party)) : ""}</section>
          <section class="pp-card"><div class="sec-h"><h3>Treasure</h3><div class="line"></div></div>${listBlock(P.treasure, "treasure", "Gold, an item, a favor")}</section>
          <section class="pp-card"><div class="sec-h"><h3>Prep checklist</h3><div class="line"></div></div>
            ${prev ? listBlock(prev.prep || (prev.prep = []), "prev-prep", "Map, handout, stat block…") : listBlock(s.prep, "prep", "Map, handout, stat block…")}
            ${prev ? `<p class="md-help">This is the "Prep for next time" list from Session ${esc(prev.num)}.</p>` : ""}</section>
        </div>
        <aside class="pp-side">
          <section><div class="sec-h"><h3>Cast & places</h3><div class="line"></div></div>
            <div class="chips" id="ppCast">${P.cast.map(id => { const n = c.notes.find(x => x.id === id); return n ? `<span class="chip on" data-n="${id}" style="border-color:${CATS[n.cat]}">${esc(n.title)}<button class="x" data-rmcast="${id}">${icon("x")}</button></span>` : ""; }).join("")}</div>
            <button class="btn sm" id="ppCastAdd" style="margin-top:8px">${icon("plus")} From the Codex</button></section>
          <section><div class="sec-h"><h3>Handouts ready</h3><div class="line"></div></div>
            <div class="chips">${c.handouts.map(hd => `<button class="chip ${P.handouts.includes(hd.id) ? "on" : ""}" data-hd="${hd.id}">${icon(hd.type === "image" ? "image" : "codex")} ${esc(hd.title || "Untitled")}</button>`).join("") || `<span style="color:var(--faint);font-size:14px">Make handouts in Live.</span>`}</div></section>
          <section><div class="sec-h"><h3>Open threads</h3><div class="line"></div></div>
            <ul class="checks">${openThreads.map(({ t, o }) => `<li data-th="${o.id}:${t.id}"><input type="checkbox" title="Resolved"><span style="font-size:14px">${esc(t.text)} <span class="carried">· S${esc(o.num)}</span></span><span></span></li>`).join("") || `<li style="color:var(--faint);display:block">Nothing left hanging.</li>`}</ul></section>
          <section><button class="btn sm" id="ppPrint">${icon("book")} Print the session sheet</button> <button class="btn sm ghost danger" id="ppDel">${icon("trash")} Discard this plan</button></section>
        </aside>
      </div>`;
    const b = box;
    $("#ppPick", b)?.addEventListener("change", e => { st.sel = e.target.value; render(); });
    $("#ppNum", b).oninput = e => { s.num = Number(e.target.value) || ""; touch(); };
    $("#ppTitle", b).oninput = e => { s.title = e.target.value; touch(); };
    $("#ppRecap", b).oninput = e => { s.recap = e.target.value; touch(); };
    $("#ppStartTxt", b).oninput = e => { P.start = e.target.value; touch(); };
    $("#ppPrint", b)?.addEventListener("click", () => import("./print.js").then(x => x.printPDF("session")));
    $("#ppDraft", b)?.addEventListener("click", () => {
      const strip = t => String(t || "").replace(/\[\[([^\]]+)\]\]/g, "$1").trim();
      const key = (prev.beats || []).filter(x => x.star && x.text).map(x => strip(x.text));
      const all = key.length ? key : (prev.beats || []).filter(x => x.text).slice(-3).map(x => strip(x.text));
      s.recap = ["Last time…", ...all, prev.cliff ? strip(prev.cliff) : ""].filter(Boolean).join(" ");
      save(); render();
    });
    $$("[data-list]", b).forEach(ul => {
      const key = ul.dataset.list, arr = key === "prev-prep" ? prev.prep : key === "prep" ? s.prep : P[key];
      $$("li", ul).forEach(li => {
        const t = arr.find(x => x.id === li.dataset.id);
        const cb = $("input[type=checkbox]", li); if (cb) cb.onchange = () => { t.done = cb.checked; li.classList.toggle("done", t.done); touch(); };
        const ti = $("input[type=text]", li); ti.oninput = () => { t.text = ti.value; touch(); };
        ti.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $(`[data-addto="${key}"]`, b).click(); } };
        $(".x", li).onclick = () => { arr.splice(arr.indexOf(t), 1); save(); render(); };
      });
    });
    $$("[data-addto]", b).forEach(btn => btn.onclick = () => {
      const key = btn.dataset.addto, arr = key === "prev-prep" ? prev.prep : key === "prep" ? s.prep : P[key];
      arr.push({ id: uid(), text: "", done: false }); save(); render(); $$(`[data-list="${key}"] input[type=text]`, el).pop()?.focus();
    });
    $$(".enc", b).forEach(row => {
      const e = P.encounters.find(x => x.id === row.dataset.e), x = c.bestiary.find(y => y.id === e.creature);
      $$("[data-c]", row).forEach(btn => btn.onclick = () => {
        e.count = Math.max(1, Math.min(30, e.count + +btn.dataset.c));
        const hp = parseInt(x?.stats?.HP || x?.hp) || 0; while (e.hp.length < e.count) e.hp.push(hp); e.hp.length = e.count; save(); render();
      });
      $("[data-rm]", row).onclick = () => { P.encounters = P.encounters.filter(y => y !== e); save(); render(); };
    });
    $("#ppEnc", b).onclick = () => picker("Add from the bestiary", c.bestiary.map(x => ({ id: x.id, title: x.name, sub: x.kind })), id => {
      const x = c.bestiary.find(y => y.id === id), hp = parseInt(x.stats?.HP || x.hp) || 0;
      const ex = P.encounters.find(e => e.creature === id); if (ex) { ex.count++; ex.hp.push(hp); } else P.encounters.push({ id: uid(), creature: id, count: 1, hp: [hp] });
      save(); render();
    }, "The bestiary is empty. Make creatures there first.");
    $("#ppCastAdd", b).onclick = () => picker("Add from the Codex", c.notes.filter(n => !P.cast.includes(n.id)).map(n => ({ id: n.id, title: n.title || "Untitled", sub: n.cat })), id => { P.cast.push(id); save(); render(); }, "The Codex is empty.");
    $$("[data-n]", b).forEach(ch => ch.onclick = e => { if (e.target.closest("[data-rmcast]")) { P.cast = P.cast.filter(x => x !== ch.dataset.n); save(); render(); } else App.go("codex", { note: ch.dataset.n }); });
    $$("[data-hd]", b).forEach(ch => ch.onclick = () => { const id = ch.dataset.hd; P.handouts = P.handouts.includes(id) ? P.handouts.filter(x => x !== id) : [...P.handouts, id]; save(); render(); });
    $$("[data-th]", b).forEach(li => $("input", li).onchange = () => { const [sid, tid] = li.dataset.th.split(":"); const t = c.sessions.find(x => x.id === sid)?.threads.find(x => x.id === tid); if (t) { t.done = true; save(); toast("Thread resolved"); render(); } });
    $("#ppStart", b)?.addEventListener("click", () => startSession(App, s));
    $("#ppLive", b)?.addEventListener("click", () => App.go("live"));
    $("#ppDel", b).onclick = () => App.confirm(`Discard the plan for session ${s.num}?`, s.beats.length ? "This session already has logged scenes; they go too." : "The plan is removed. Nothing else changes.", "Discard plan", () => { C().sessions = c.sessions.filter(x => x !== s); st.sel = null; save(); render(); });
  }
  function picker(title, items, pick, emptyMsg) {
    if (!items.length) return toast(emptyMsg);
    App.modal(`<h2>${esc(title)}</h2><input type="search" id="pkQ" placeholder="Search"><div id="pkL" style="display:flex;flex-direction:column;gap:4px;max-height:52vh;overflow:auto"></div>`, (m, close) => {
      const draw = () => { const q = $("#pkQ", m).value.toLowerCase(); $("#pkL", m).innerHTML = items.filter(i => !q || (i.title + " " + i.sub).toLowerCase().includes(q)).map(i => `<button class="cx-item" data-id="${i.id}"><b>${esc(i.title)}</b><span>${esc(i.sub || "")}</span></button>`).join(""); $$("[data-id]", m).forEach(x => x.onclick = () => { pick(x.dataset.id); close(); }); };
      $("#pkQ", m).oninput = draw; draw();
    });
  }
  render();
  return { show() { render(); }, refresh() { render(); } };
}
