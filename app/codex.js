// The Codex: world notes as a small wiki. [[Title]] links notes together; backlinks show who mentions a page.
import { $, $$, esc, h, icon, toast, uid, debounce } from "./util.js";
import { C, save } from "./store.js";

export const CATS = { Locations: "#b8d8a8", NPCs: "#f39da8", Factions: "#a8d3e4", Quests: "#f2c75c", Items: "#cfb2e2", Lore: "#efe4cf", Other: "#8a7d78" };

// Markdown-lite: # headings, **bold**, *italic*, - lists, > quotes, [[wiki links]]
export function md(src, notes) {
  const titles = new Map(notes.map(n => [String(n.title).toLowerCase(), n]));
  const inline = s => esc(s)
    .replace(/\[\[([^\]]+)\]\]/g, (_, t) => { const n = titles.get(t.trim().toLowerCase()); return `<a class="wl ${n ? "" : "missing"}" data-wl="${esc(t.trim())}">${esc(t.trim())}</a>`; })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  const out = []; let list = null;
  for (const raw of String(src || "").split("\n")) {
    const l = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(l)) { if (!list) { list = []; } list.push(`<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (!l.trim()) continue;
    const m = l.match(/^(#{1,3})\s+(.*)/);
    if (m) out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
    else if (l.startsWith(">")) out.push(`<blockquote>${inline(l.replace(/^>\s?/, ""))}</blockquote>`);
    else out.push(`<p>${inline(l)}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("");
}
export function mentions(text, title) { return title && String(text || "").toLowerCase().includes(`[[${String(title).toLowerCase()}]]`); }

export function createCodex(el, App) {
  const st = { cat: "All", q: "", sel: null, mode: "read" };
  el.innerHTML = `<div class="codex">
    <nav class="cx-cats" id="cxCats"></nav>
    <div class="cx-list">
      <div class="head"><button class="btn primary" id="cxNew">${icon("plus")} New page</button><input type="search" id="cxQ" placeholder="Search the Codex"></div>
      <ul class="cx-items" id="cxItems"></ul>
    </div>
    <div class="cx-page" id="cxPage"></div>
  </div>`;
  const notes = () => C().notes;
  const cur = () => notes().find(n => n.id === st.sel);

  function renderCats() {
    const counts = {}; notes().forEach(n => counts[n.cat] = (counts[n.cat] || 0) + 1);
    $("#cxCats", el).innerHTML = `<div class="eyebrow" style="padding:4px 10px 8px">Sections</div>` + ["All", ...Object.keys(CATS)].map(c =>
      `<button class="cx-cat ${st.cat === c ? "on" : ""}" data-c="${c}"><span class="sq" style="background:${c === "All" ? "var(--ember)" : CATS[c]}"></span>${c}<span class="n">${c === "All" ? notes().length : counts[c] || 0}</span></button>`).join("");
    $$(".cx-cat", el).forEach(b => b.onclick = () => { st.cat = b.dataset.c; renderCats(); renderList(); });
  }
  function filtered() {
    const q = st.q.toLowerCase();
    return notes().filter(n => (st.cat === "All" || n.cat === st.cat) && (!q || `${n.title} ${n.tags} ${n.body}`.toLowerCase().includes(q)))
      .sort((a, b) => (b.pinned | 0) - (a.pinned | 0) || (b.updated || 0) - (a.updated || 0));
  }
  function renderList() {
    const ul = $("#cxItems", el), list = filtered();
    ul.innerHTML = list.length ? list.map(n => `<li><button class="cx-item ${n.id === st.sel ? "on" : ""}" data-id="${n.id}"><b>${n.pinned ? "★ " : ""}${esc(n.title || "Untitled")}</b><span><span class="sq" style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${CATS[n.cat] || CATS.Other};margin-right:6px"></span>${esc(n.cat)}${n.tags ? " · " + esc(n.tags) : ""}</span></button></li>`).join("")
      : `<li style="padding:16px;color:var(--faint)">${notes().length ? "Nothing matches." : "No pages yet."}</li>`;
    $$(".cx-item", ul).forEach(b => b.onclick = () => open(b.dataset.id));
  }
  function open(id, mode) { st.sel = id; if (mode) st.mode = mode; C().ui.note = id; renderList(); renderPage(); }

  function backlinks(n) {
    const c = C(), out = [];
    for (const o of c.notes) if (o.id !== n.id && mentions(o.body, n.title)) out.push({ kind: "note", id: o.id, label: o.title });
    for (const s of c.sessions) {
      const blob = [s.beats?.map(b => b.text).join("\n"), s.cliff, s.recap].join("\n");
      if (mentions(blob, n.title)) out.push({ kind: "session", id: s.id, label: `Session ${s.num}${s.title ? ": " + s.title : ""}` });
    }
    return out;
  }
  function renderPage() {
    const page = $("#cxPage", el), n = cur();
    if (!n) {
      page.innerHTML = `<div class="empty"><h3>The Codex is your world's memory</h3><p>Places, people, factions and lore. Link pages with <span class="mono">[[double brackets]]</span>, and every page shows what mentions it.</p><button class="btn primary" id="cxE">${icon("plus")} Write the first page</button></div>`;
      $("#cxE", page).onclick = newPage; return;
    }
    const bl = backlinks(n);
    page.innerHTML = `<div class="cx-toolbar">
        <div class="mode-seg"><button data-m="read" class="${st.mode === "read" ? "on" : ""}">Read</button><button data-m="write" class="${st.mode === "write" ? "on" : ""}">Write</button></div>
        <div style="flex:1"></div>
        <button class="btn sm" id="cxPin">${icon("pin")} Pin to board</button>
        <button class="btn sm ghost" id="cxStar">${icon("star")} ${n.pinned ? "Unstar" : "Star"}</button>
        <button class="btn sm ghost danger" id="cxDel">${icon("trash")} Delete</button>
      </div>
      <div class="manuscript" id="cxBody"></div>`;
    const body = $("#cxBody", page);
    if (st.mode === "read") {
      body.innerHTML = `<h1 class="cx-title">${esc(n.title || "Untitled")}</h1>
        <div class="meta"><span class="tag" style="border-color:${CATS[n.cat]};color:${CATS[n.cat]}">${esc(n.cat)}</span>${(n.tags || "").split(",").map(t => t.trim()).filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join("")}<span>Edited ${new Date(n.updated || Date.now()).toLocaleDateString()}</span></div>
        <div class="prose">${md(n.body, notes()) || `<p style="color:var(--faint)">Nothing written yet. Switch to Write.</p>`}</div>
        <div class="backlinks"><div class="eyebrow" style="margin-bottom:8px">Mentioned in</div><div class="chips">${bl.length ? bl.map(b => `<button class="chip" data-bl="${b.kind}:${b.id}">${icon(b.kind === "note" ? "codex" : "chronicle")} ${esc(b.label)}</button>`).join("") : `<span style="color:var(--faint);font-size:14px">Nothing links here yet. Write [[${esc(n.title)}]] anywhere to connect it.</span>`}</div></div>`;
      body.ondblclick = e => { if (!e.target.closest("a,button")) { st.mode = "write"; renderPage(); } };
    } else {
      body.innerHTML = `<div class="cx-edit">
        <input class="title-in" id="eT" type="text" value="${esc(n.title)}" placeholder="Page title">
        <div class="grid3">
          <label class="f"><span>Section</span><select id="eC">${Object.keys(CATS).map(c => `<option ${c === n.cat ? "selected" : ""}>${c}</option>`).join("")}</select></label>
          <label class="f" style="grid-column:span 2"><span>Tags</span><input type="text" id="eG" value="${esc(n.tags)}" placeholder="act 2, north, villain"></label>
        </div>
        <textarea class="body-in" id="eB" placeholder="Write freely. [[Link another page]] by its title.">${esc(n.body)}</textarea>
        <div class="md-help"><code># Heading</code> · <code>**bold**</code> · <code>*italic*</code> · <code>- list</code> · <code>&gt; quote</code> · <code>[[Page title]]</code> links a page (missing ones are created when you click them)</div>
      </div>`;
      const touch = debounce(() => { n.updated = Date.now(); save(); renderList(); renderCats(); }, 300);
      $("#eT", body).oninput = e => { n.title = e.target.value; touch(); };
      $("#eC", body).onchange = e => { n.cat = e.target.value; touch(); };
      $("#eG", body).oninput = e => { n.tags = e.target.value; touch(); };
      $("#eB", body).oninput = e => { n.body = e.target.value; touch(); };
      if (!n.title) $("#eT", body).focus();
    }
    $$("[data-m]", page).forEach(b => b.onclick = () => { st.mode = b.dataset.m; renderPage(); });
    $("#cxPin", page).onclick = () => App.pinToBoard({ type: "ref", ref: n.id, w: 240, color: { Locations: "lichen", NPCs: "rose", Quests: "mustard", Items: "plum", Factions: "sky" }[n.cat] || "paper" });
    $("#cxStar", page).onclick = () => { n.pinned = !n.pinned; save(); renderList(); renderPage(); };
    $("#cxDel", page).onclick = () => App.confirm(`Delete "${n.title || "Untitled"}"?`, "The page is removed. Board cards that point to it will show as missing.", "Delete page", () => {
      C().notes = notes().filter(x => x.id !== n.id); st.sel = null; save(); renderCats(); renderList(); renderPage();
    });
    $$("[data-wl]", page).forEach(a => a.onclick = () => followLink(a.dataset.wl));
    $$("[data-bl]", page).forEach(b => b.onclick = () => { const [k, id] = b.dataset.bl.split(":"); if (k === "note") open(id, "read"); else App.go("chronicle", { session: id }); });
  }
  function followLink(title) {
    const n = notes().find(x => String(x.title).toLowerCase() === title.toLowerCase());
    if (n) return open(n.id, "read");
    const nn = { id: uid(), title, cat: "Other", tags: "", body: "", updated: Date.now() };
    notes().unshift(nn); save(); renderCats(); open(nn.id, "write"); toast(`Created "${title}"`);
  }
  function newPage() {
    const n = { id: uid(), title: "", cat: st.cat === "All" ? "Lore" : st.cat, tags: "", body: "", updated: Date.now() };
    notes().unshift(n); save(); renderCats(); open(n.id, "write");
  }
  $("#cxNew", el).onclick = newPage;
  $("#cxQ", el).oninput = e => { st.q = e.target.value; renderList(); };
  st.sel = C().ui.note && notes().some(n => n.id === C().ui.note) ? C().ui.note : notes()[0]?.id;
  renderCats(); renderList(); renderPage();
  return {
    show(arg) { if (arg?.note) open(arg.note, "read"); else if (arg?.title) followLink(arg.title); else { renderCats(); renderList(); if (st.mode === "read") renderPage(); } },
    refresh() { renderCats(); renderList(); if (st.mode === "read" || !cur()) renderPage(); },
  };
}
