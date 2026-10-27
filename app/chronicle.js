// The Chronicle: one spread per session, plus the thread of the whole campaign across the top.
import { $, $$, esc, h, icon, toast, uid, copyText, debounce } from "./util.js";
import { C, save } from "./store.js";
import { md } from "./codex.js";

export const BEATS = {
  combat:    { label: "Combat",      color: "#ff6b6b" },
  social:    { label: "Roleplay",    color: "#f39da8" },
  explore:   { label: "Exploration", color: "#b8d8a8" },
  discovery: { label: "Discovery",   color: "#a8d3e4" },
  loot:      { label: "Loot",        color: "#f2c75c" },
  twist:     { label: "Twist",       color: "#cfb2e2" },
  travel:    { label: "Travel",      color: "#d8b48a" },
  rest:      { label: "Rest",        color: "#8fa3c9" },
  death:     { label: "Death",       color: "#e8e1d6" },
};
const MOODS = ["Combat-heavy", "Roleplay", "Mystery", "Horror", "Comedy", "Exploration", "Heist", "Intrigue", "Tragedy", "Travel", "Boss fight", "Downtime"];
const PIPS = { 1: "none", 2: "-6px -6px 0 var(--c), 6px 6px 0 var(--c)", 3: "-7px -7px 0 var(--c), 7px 7px 0 var(--c)", 4: "-6px -6px 0 var(--c), 6px -6px 0 var(--c), -6px 6px 0 var(--c), 6px 6px 0 var(--c)", 5: "-7px -7px 0 var(--c), 7px -7px 0 var(--c), -7px 7px 0 var(--c), 7px 7px 0 var(--c)" };

function blankSession(c) {
  const prev = [...c.sessions].sort((a, b) => (b.num || 0) - (a.num || 0))[0];
  return {
    id: uid(), num: (prev?.num || 0) + 1, title: "", date: new Date().toISOString().slice(0, 10), ingame: "", hours: "",
    moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "",
    attendance: Object.fromEntries(c.party.map(m => [m.id, true])), spotlight: {}, mvp: null,
    loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: Date.now(),
  };
}

export function createChronicle(el, App) {
  const st = { sel: null, mode: "write" };
  el.innerHTML = `<div class="chron"><div class="thread-strip"><div class="thread" id="chThread"></div><div class="stats" id="chStats"></div></div><div class="spread" id="chSpread"></div></div>`;
  const S = () => C().sessions;
  const cur = () => S().find(s => s.id === st.sel);
  const sorted = () => [...S()].sort((a, b) => (a.num || 0) - (b.num || 0) || a.created - b.created);
  const touch = debounce(() => { save(); renderThread(); }, 350);

  function renderThread() {
    const t = $("#chThread", el);
    t.innerHTML = sorted().map(s => `<button class="node ${s.id === st.sel ? "on" : ""} ${s.status === "planned" ? "planned" : s.status === "live" ? "is-live" : ""}" data-id="${s.id}" title="${esc(s.title || "")}${s.status === "planned" ? " (planned)" : ""}">
      <span class="seal">${esc(s.num ?? "?")}</span><span class="nt">${esc(s.title || "Untitled")}</span>
      <span class="pips">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= (s.rating || 0) ? "f" : ""}"></i>`).join("")}</span></button>`).join("") +
      `<button class="node add" id="chAdd" title="Log a new session"><span class="seal">${icon("plus")}</span><span class="nt">New session</span><span class="pips"></span></button>`;
    $$(".node[data-id]", t).forEach(b => b.onclick = () => { st.sel = b.dataset.id; C().ui.session = st.sel; renderThread(); renderSpread(); });
    $("#chAdd", t).onclick = () => { const s = blankSession(C()); S().push(s); st.sel = s.id; st.mode = "write"; save(); renderThread(); renderSpread(); setTimeout(() => $("#sTitle", el)?.focus(), 30); };
    const on = t.querySelector(".node.on"); on?.scrollIntoView({ inline: "center", block: "nearest" });
    const all = S().filter(x => x.status !== "planned"), gp = all.reduce((s, x) => s + (x.loot || []).reduce((a, l) => a + (Number(l.value) || 0), 0), 0);
    const hrs = all.reduce((s, x) => s + (Number(x.hours) || 0), 0);
    const open = all.reduce((s, x) => s + (x.threads || []).filter(t => !t.done).length, 0);
    $("#chStats", el).innerHTML = [[all.length, "Sessions"], [Math.round(hrs * 10) / 10, "Hours"], [gp.toLocaleString(), "Gold looted"], [open, "Open threads"]]
      .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
  }

  function carried(s) {
    return sorted().filter(o => (o.num || 0) < (s.num || 0)).flatMap(o => (o.threads || []).filter(t => !t.done).map(t => ({ t, from: o })));
  }

  function renderSpread() {
    const sp = $("#chSpread", el), s = cur(), c = C();
    if (!s) {
      sp.style.gridTemplateColumns = "1fr";
      sp.innerHTML = `<div class="empty"><h3>Every campaign is a story</h3><p>Log each session as a chapter: the scenes, the lines people still quote, the loot, the threads left dangling.</p><button class="btn primary" id="chE">${icon("plus")} Log session 1</button></div>`;
      $("#chE", sp).onclick = () => $("#chAdd", el).click(); return;
    }
    sp.style.gridTemplateColumns = "";
    const banner = s.status === "planned" ? `<div class="plan-banner">${icon("book")} This session is planned, not played yet. <button class="btn sm" data-goprep>Open prep</button></div>` : s.status === "live" ? `<div class="plan-banner live">${icon("stream")} This session is running now. <button class="btn sm" data-golive>Open Live</button></div>` : "";
    s.beats ||= []; s.quotes ||= []; s.loot ||= []; s.threads ||= []; s.scars ||= []; s.prep ||= []; s.attendance ||= {}; s.spotlight ||= {}; s.moods ||= [];
    const head = `<div class="sess-head">
        <div class="sess-num"><small>Session</small><input type="number" id="sNum" value="${esc(s.num)}" aria-label="Session number"></div>
        <div style="min-width:0">
          <input class="sess-title" id="sTitle" type="text" value="${esc(s.title)}" placeholder="Name this chapter">
          <div class="sess-meta">
            <label class="f"><span>Played on</span><input type="date" id="sDate" value="${esc(s.date)}"></label>
            <label class="f"><span>In-world date</span><input type="text" id="sIngame" value="${esc(s.ingame)}" placeholder="3rd of Frostfall"></label>
            <label class="f"><span>Hours</span><input type="number" step=".5" min="0" id="sHours" value="${esc(s.hours)}" placeholder="3.5"></label>
            <label class="f"><span>Weather & mood</span><input type="text" id="sAmb" value="${esc(s.ambience)}" placeholder="Rain, dread, tavern warmth"></label>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <div class="mode-seg"><button data-m="write" class="${st.mode === "write" ? "on" : ""}">Write</button><button data-m="chapter" class="${st.mode === "chapter" ? "on" : ""}">Chapter</button></div>
          <button class="btn sm" id="sDiscord">${icon("discord")} Copy for Discord</button>
          <button class="btn sm ghost danger" id="sDel">${icon("trash")} Delete</button>
        </div>
      </div>`;
    if (st.mode === "chapter") {
      sp.innerHTML = `<div class="spread-main">${banner}${head}<div class="chapter">${chapterHTML(s, c)}</div></div>${sideHTML(s, c)}`;
    } else {
      sp.innerHTML = `<div class="spread-main">${banner}${head}
        <div class="chips" id="sMoods">${MOODS.map(m => `<button class="chip ${s.moods.includes(m) ? "on" : ""}" data-mood="${m}">${m}</button>`).join("")}</div>
        <div class="sec"><div class="sec-h"><h3>Previously on…</h3><div class="line"></div></div>
          <textarea id="sRecap" class="big-field" rows="3" placeholder="The read-aloud recap you open the next session with.">${esc(s.recap)}</textarea></div>
        <div class="sec"><div class="sec-h"><h3>Scenes</h3><div class="line"></div><span class="eyebrow">${s.beats.length} beats · click an icon to mark a key moment</span></div>
          <div class="beat-add">${Object.entries(BEATS).map(([k, b]) => `<button data-add="${k}" style="--bt:${b.color}">${icon(k)} ${b.label}</button>`).join("")}</div>
          <ol class="beats" id="sBeats"></ol></div>
        <div class="sec"><div class="sec-h"><h3>Said at the table</h3><div class="line"></div><button class="btn sm" id="qAdd">${icon("plus")} Quote</button></div>
          <div class="quotes" id="sQuotes"></div></div>
        <div class="sec"><div class="sec-h"><h3>Cliffhanger</h3><div class="line"></div></div>
          <div class="cliff"><textarea id="sCliff" rows="2" placeholder="Where did you stop? End on the knife's edge.">${esc(s.cliff)}</textarea></div></div>
      </div>${sideHTML(s, c)}`;
      renderBeats(s); renderQuotes(s);
      $$("[data-mood]", sp).forEach(b => b.onclick = () => { const m = b.dataset.mood; s.moods = s.moods.includes(m) ? s.moods.filter(x => x !== m) : [...s.moods, m]; b.classList.toggle("on"); touch(); });
      $$("[data-add]", sp).forEach(b => b.onclick = () => { const beat = { id: uid(), type: b.dataset.add, text: "", star: false }; s.beats.push(beat); save(); renderBeats(s); $(`[data-beat="${beat.id}"] textarea`, sp)?.focus(); });
      $("#qAdd", sp).onclick = () => { s.quotes.push({ id: uid(), who: "", line: "" }); save(); renderQuotes(s); $$("#sQuotes textarea", sp).pop()?.focus(); };
      bindText(sp, s, { sRecap: "recap", sCliff: "cliff" });
    }
    bindText(sp, s, { sTitle: "title", sDate: "date", sIngame: "ingame", sAmb: "ambience" });
    $("#sNum", sp).oninput = e => { s.num = e.target.value === "" ? "" : Number(e.target.value); touch(); };
    $("#sHours", sp).oninput = e => { s.hours = e.target.value; touch(); };
    $$("[data-m]", sp).forEach(b => b.onclick = () => { st.mode = b.dataset.m; renderSpread(); });
    $("#sDiscord", sp).onclick = () => copyText(discordText(s, c), "Recap copied. Paste it in Discord");
    $("#sDel", sp).onclick = () => App.confirm(`Delete session ${s.num}?`, "This chapter and everything logged in it is removed.", "Delete session", () => {
      C().sessions = S().filter(x => x.id !== s.id); st.sel = sorted().pop()?.id || null; save(); renderThread(); renderSpread();
    });
    $$("a.wl", sp).forEach(a => a.onclick = () => App.go("codex", { title: a.dataset.wl }));
    bindSide(sp, s, c);
    $("[data-goprep]", sp)?.addEventListener("click", () => App.go("prep"));
    $("[data-golive]", sp)?.addEventListener("click", () => App.go("live"));
  }

  function bindText(root, obj, map) {
    for (const [id, key] of Object.entries(map)) { const e = $("#" + id, root); if (e) e.oninput = () => { obj[key] = e.value; touch(); }; }
  }
  function autosize(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }

  function renderBeats(s) {
    const ol = $("#sBeats", el);
    if (!s.beats.length) { ol.innerHTML = `<li style="color:var(--faint);padding:6px 0 6px 56px">Add the first scene with the buttons above. One line per beat is enough.</li>`; return; }
    ol.innerHTML = s.beats.map((b, i) => { const B = BEATS[b.type] || BEATS.social; return `<li class="beat ${b.star ? "star" : ""}" data-beat="${b.id}" style="--bt:${B.color}">
      <button class="bico" data-star title="${b.star ? "Key moment" : "Mark as key moment"}">${icon(b.type)}</button>
      <div class="btxt"><div class="bty">${B.label}${b.star ? " · key moment" : ""}</div><textarea rows="1" placeholder="What happened?">${esc(b.text)}</textarea></div>
      <div class="bops"><button data-up title="Move up" ${i ? "" : "disabled"}>${icon("up")}</button><button data-type title="Change type">${icon("reroll")}</button><button data-down title="Move down" ${i < s.beats.length - 1 ? "" : "disabled"}>${icon("down")}</button><button data-del title="Remove">${icon("x")}</button></div></li>`; }).join("");
    $$(".beat", ol).forEach(li => {
      const b = s.beats.find(x => x.id === li.dataset.beat), i = s.beats.indexOf(b), ta = $("textarea", li);
      requestAnimationFrame(() => autosize(ta)); ta.oninput = () => { b.text = ta.value; autosize(ta); touch(); };
      ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const nb = { id: uid(), type: b.type, text: "", star: false }; s.beats.splice(i + 1, 0, nb); save(); renderBeats(s); $(`[data-beat="${nb.id}"] textarea`, el)?.focus(); }
        if (e.key === "Backspace" && !ta.value && s.beats.length) { e.preventDefault(); s.beats.splice(i, 1); save(); renderBeats(s); $$(".beat textarea", el)[Math.max(0, i - 1)]?.focus(); } };
      $("[data-star]", li).onclick = () => { b.star = !b.star; save(); renderBeats(s); };
      $("[data-up]", li).onclick = () => { s.beats.splice(i - 1, 0, s.beats.splice(i, 1)[0]); save(); renderBeats(s); };
      $("[data-down]", li).onclick = () => { s.beats.splice(i + 1, 0, s.beats.splice(i, 1)[0]); save(); renderBeats(s); };
      $("[data-del]", li).onclick = () => { s.beats.splice(i, 1); save(); renderBeats(s); };
      $("[data-type]", li).onclick = e => App.menu(e.currentTarget, Object.entries(BEATS).map(([k, B]) => ({ text: B.label, icon: k, cur: k === b.type, run: () => { b.type = k; save(); renderBeats(s); } })));
    });
  }
  function renderQuotes(s) {
    const box = $("#sQuotes", el);
    box.innerHTML = s.quotes.length ? s.quotes.map((q, i) => `<div class="quote" data-q="${q.id}" style="--r:${[-1.2, .8, -.4, 1.4][i % 4]}deg"><button class="x" title="Remove">${icon("x")}</button><textarea placeholder="The line…">${esc(q.line)}</textarea><input type="text" placeholder="— who said it" value="${esc(q.who)}"></div>`).join("")
      : `<div style="color:var(--faint);font-size:14px">The jokes, threats and accidental prophecies worth remembering.</div>`;
    $$(".quote", box).forEach(d => {
      const q = s.quotes.find(x => x.id === d.dataset.q);
      const ta = $("textarea", d); requestAnimationFrame(() => autosize(ta));
      ta.oninput = () => { q.line = ta.value; autosize(ta); touch(); };
      $("input", d).oninput = e => { q.who = e.target.value; touch(); };
      $(".x", d).onclick = () => { s.quotes = s.quotes.filter(x => x !== q); save(); renderQuotes(s); };
    });
  }

  function sideHTML(s, c) {
    const lootTotal = s.loot.reduce((a, l) => a + (Number(l.value) || 0), 0);
    const carry = carried(s);
    const list = (arr, key, ph) => `<ul class="checks" data-list="${key}">${arr.map(t => `<li class="${t.done ? "done" : ""}" data-id="${t.id}"><input type="checkbox" ${t.done ? "checked" : ""} aria-label="Done"><input type="text" value="${esc(t.text)}" placeholder="${ph}"><button class="x" title="Remove">${icon("x")}</button></li>`).join("")}</ul><button class="btn sm ghost" data-addto="${key}">${icon("plus")} Add</button>`;
    return `<aside class="spread-side">
      <div class="side-box"><h4>${icon("social")} At the table <button class="btn sm ghost act" id="pEdit">Edit party</button></h4>
        ${c.party.length ? c.party.map(m => `<div class="member ${s.attendance[m.id] === false ? "absent" : ""}" data-m="${m.id}" style="--mc:${esc(m.color)}">
          <button class="present ${s.attendance[m.id] !== false ? "on" : ""}" title="Present">${icon("check")}</button>
          <div class="who"><b>${esc(m.character || m.player)}</b><span>${esc(m.player)}${m.role ? " · " + esc(m.role) : ""}</span></div>
          <div class="spot" title="Spotlight this session">${[1, 2, 3].map(i => `<button data-spot="${i}" class="${i <= (s.spotlight[m.id] || 0) ? "on" : ""}">${icon("star")}</button>`).join("")}</div>
          <button class="mvp ${s.mvp === m.id ? "on" : ""}" title="Player of the night">MVP</button></div>`).join("")
          : `<p style="color:var(--faint);font-size:14px;margin:0">Add your players to track attendance, spotlight and an MVP for each night.</p>`}
      </div>
      <div class="side-box"><h4>${icon("loot")} Loot ledger</h4>
        <table class="ledger"><tbody id="lootRows">${s.loot.map(l => `<tr data-id="${l.id}"><td><input type="text" data-k="item" value="${esc(l.item)}" placeholder="Item"></td><td style="width:90px"><input type="text" data-k="to" value="${esc(l.to)}" placeholder="Who"></td><td><input class="val" type="number" data-k="value" value="${esc(l.value)}" placeholder="gp"></td><td><button class="x" title="Remove">×</button></td></tr>`).join("")}</tbody>
        <tfoot><tr><td><button class="btn sm ghost" id="lootAdd">${icon("plus")} Add loot</button></td><td style="text-align:right;color:var(--faint)">Total</td><td class="mono" style="text-align:right">${lootTotal.toLocaleString()} gp</td><td></td></tr></tfoot></table>
        <label class="f" style="margin-top:10px"><span>XP & milestones</span><input type="text" id="sXp" value="${esc(s.xp)}" placeholder="Level 4 after the duel"></label>
      </div>
      <div class="side-box"><h4>${icon("link")} Threads</h4>
        ${carry.length ? `<div class="carried" style="margin-bottom:4px">Still open from earlier sessions</div><ul class="checks">${carry.map(({ t, from }) => `<li data-carry="${from.id}:${t.id}"><input type="checkbox" aria-label="Resolve"><span style="font-size:14px">${esc(t.text)} <span class="carried">· S${esc(from.num)}</span></span><span></span></li>`).join("")}</ul><div class="carried" style="margin:10px 0 4px">New this session</div>` : ""}
        ${list(s.threads, "threads", "A question left hanging")}
      </div>
      <div class="side-box"><h4>${icon("death")} Scars & deaths</h4>${list(s.scars, "scars", "Lost an eye, a friend, a bet")}</div>
      <div class="side-box"><h4>${icon("gear")} GM notes</h4>
        <div class="eyebrow" style="margin-bottom:6px">How did it go?</div>
        <div class="rating" id="sRate">${[1, 2, 3, 4, 5].map(i => `<button data-r="${i}" class="${i <= (s.rating || 0) ? "on" : ""}" title="${i}/5"><i style="--c:${i <= (s.rating || 0) ? "var(--ember-ink)" : "var(--dim)"};box-shadow:${PIPS[i]}"></i></button>`).join("")}</div>
        <label class="f" style="margin-top:10px"><span>What worked</span><textarea id="sWorked" rows="2">${esc(s.worked)}</textarea></label>
        <label class="f" style="margin-top:8px"><span>What to change</span><textarea id="sChange" rows="2">${esc(s.change)}</textarea></label>
      </div>
      <div class="side-box"><h4>${icon("book")} Prep for next time</h4>${list(s.prep, "prep", "Map, stat block, handout…")}</div>
    </aside>`;
  }
  function bindSide(sp, s, c) {
    const side = $(".spread-side", sp);
    $("#pEdit", side).onclick = () => App.partyModal();
    $$(".member", side).forEach(row => {
      const id = row.dataset.m;
      $(".present", row).onclick = () => { s.attendance[id] = s.attendance[id] === false; save(); renderSpread(); };
      $$("[data-spot]", row).forEach(b => b.onclick = () => { const v = +b.dataset.spot; s.spotlight[id] = s.spotlight[id] === v ? v - 1 : v; save(); renderSpread(); });
      $(".mvp", row).onclick = () => { s.mvp = s.mvp === id ? null : id; save(); renderSpread(); };
    });
    $$("#lootRows tr", side).forEach(tr => {
      const l = s.loot.find(x => x.id === tr.dataset.id);
      $$("input", tr).forEach(inp => inp.oninput = () => { l[inp.dataset.k] = inp.dataset.k === "value" ? (inp.value === "" ? "" : Number(inp.value)) : inp.value; touch(); });
      $$("input[data-k=value]", tr).forEach(inp => inp.onchange = () => renderSpread());
      $(".x", tr).onclick = () => { s.loot = s.loot.filter(x => x !== l); save(); renderSpread(); };
    });
    $("#lootAdd", side).onclick = () => { s.loot.push({ id: uid(), item: "", to: "", value: "" }); save(); renderSpread(); $$("#lootRows input[data-k=item]", el).pop()?.focus(); };
    $("#sXp", side).oninput = e => { s.xp = e.target.value; touch(); };
    $$("[data-list]", side).forEach(ul => {
      const key = ul.dataset.list;
      $$("li", ul).forEach(li => {
        const t = s[key].find(x => x.id === li.dataset.id);
        $("input[type=checkbox]", li).onchange = e => { t.done = e.target.checked; li.classList.toggle("done", t.done); touch(); };
        $("input[type=text]", li).oninput = e => { t.text = e.target.value; touch(); };
        $("input[type=text]", li).onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $(`[data-addto="${key}"]`, side).click(); } };
        $(".x", li).onclick = () => { s[key] = s[key].filter(x => x !== t); save(); renderSpread(); };
      });
    });
    $$("[data-addto]", side).forEach(b => b.onclick = () => { const key = b.dataset.addto; s[key].push({ id: uid(), text: "", done: false }); save(); renderSpread(); $$(`[data-list="${key}"] input[type=text]`, el).pop()?.focus(); });
    $$("[data-carry]", side).forEach(li => $("input", li).onchange = () => {
      const [sid, tid] = li.dataset.carry.split(":"); const o = S().find(x => x.id === sid); const t = o?.threads.find(x => x.id === tid);
      if (t) { t.done = true; save(); toast("Thread resolved"); renderSpread(); renderThread(); }
    });
    $$("[data-r]", side).forEach(b => b.onclick = () => { const v = +b.dataset.r; s.rating = s.rating === v ? 0 : v; save(); renderSpread(); renderThread(); });
    bindText(side, s, { sWorked: "worked", sChange: "change" });
  }

  function chapterHTML(s, c) {
    const names = id => c.party.find(m => m.id === id);
    const present = c.party.filter(m => s.attendance[m.id] !== false);
    const mvp = names(s.mvp);
    return `<div class="ch-kicker">Chapter ${esc(s.num)}</div><h1>${esc(s.title || "Untitled")}</h1>
      <div class="ch-meta">${[s.ingame, s.date && new Date(s.date + "T12:00").toLocaleDateString(undefined, { dateStyle: "long" }), s.ambience, s.moods.join(" · ")].filter(Boolean).map(esc).join(" — ")}</div>
      ${s.recap ? `<div class="prose" style="font-style:italic;color:var(--dim)">${md(s.recap, c.notes)}</div>` : ""}
      ${s.beats.map(b => { const B = BEATS[b.type] || BEATS.social; return `<div class="ch-beat ${b.star ? "star" : ""}" style="--bt:${B.color}">${icon(b.type)}<div class="prose" style="font-size:17px">${md(b.text, c.notes) || "<p>…</p>"}</div></div>`; }).join("")}
      ${s.quotes.filter(q => q.line).map(q => `<blockquote>“${esc(q.line)}”<cite>— ${esc(q.who || "someone at the table")}</cite></blockquote>`).join("")}
      ${s.loot.length ? `<p style="margin-top:22px"><strong>Spoils:</strong> ${s.loot.filter(l => l.item).map(l => esc(l.item) + (l.to ? ` (${esc(l.to)})` : "")).join(", ")}</p>` : ""}
      ${present.length ? `<p style="margin-top:8px;color:var(--faint)">At the table: ${present.map(m => esc(m.character || m.player)).join(", ")}${mvp ? ` · MVP: ${esc(mvp.character || mvp.player)}` : ""}</p>` : ""}
      ${s.cliff ? `<div class="ch-cliff">${esc(s.cliff)}</div>` : ""}`;
  }
  function discordText(s, c) {
    const strip = t => String(t || "").replace(/\[\[([^\]]+)\]\]/g, "$1");
    const out = [`# Session ${s.num}: ${s.title || "Untitled"}`];
    const meta = [s.ingame, s.date].filter(Boolean).join(" · "); if (meta) out.push(`*${meta}*`);
    if (s.recap) out.push("", "## Previously on…", strip(s.recap));
    if (s.beats.length) { out.push("", "## What happened"); for (const b of s.beats) if (b.text) out.push(`- **${(BEATS[b.type] || BEATS.social).label}:** ${strip(b.text)}${b.star ? " ⭐" : ""}`); }
    const qs = s.quotes.filter(q => q.line); if (qs.length) { out.push("", "## Said at the table"); for (const q of qs) out.push(`> "${q.line}" — ${q.who || "someone"}`); }
    const loot = s.loot.filter(l => l.item); if (loot.length) out.push("", `**Loot:** ${loot.map(l => l.item + (l.to ? ` → ${l.to}` : "")).join(", ")}`);
    if (s.xp) out.push(`**XP:** ${s.xp}`);
    const mvp = c.party.find(m => m.id === s.mvp); if (mvp) out.push(`**MVP:** ${mvp.character || mvp.player} 🏆`);
    const th = s.threads.filter(t => !t.done && t.text); if (th.length) out.push("", "**Open threads:**", ...th.map(t => `- ${t.text}`));
    if (s.cliff) out.push("", `||${strip(s.cliff)}||`);
    return out.join("\n");
  }

  st.sel = S().some(s => s.id === C().ui.session) ? C().ui.session : (sorted().filter(s => s.status !== "planned").pop() || sorted().pop())?.id || null;
  renderThread(); renderSpread();
  return {
    show(arg) { if (arg?.session) { st.sel = arg.session; st.mode = "write"; } renderThread(); renderSpread(); },
    refresh() { renderThread(); renderSpread(); },
  };
}
