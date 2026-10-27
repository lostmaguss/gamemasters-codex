// Corkboard canvas: index cards on an infinite cork surface, tied together with yarn.
import { $, $$, esc, h, icon, toast, uid, storeImage } from "./util.js";
import { C, save } from "./store.js";

const COLORS = ["paper", "mustard", "rose", "lichen", "sky", "plum", "ink"];
const YARN = { red: "#c42f2f", black: "#241c1f", white: "#f2ece2", green: "#3f8a4b" };
const KIND_LABEL = { npc: "NPC", place: "Place", mission: "Mission", item: "Item" };
let corkURL = null;
function cork() {
  if (corkURL) return corkURL;
  const S = 380, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
  g.fillStyle = "#a9794b"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 1 + Math.random() * 4.5, l = Math.random();
    g.fillStyle = l < .45 ? `rgba(70,38,16,${.15 + Math.random() * .35})` : l < .8 ? `rgba(196,150,98,${.2 + Math.random() * .35})` : `rgba(40,20,8,${.3 + Math.random() * .3})`;
    g.beginPath(); g.ellipse(x, y, r, r * (.5 + Math.random() * .6), Math.random() * 3, 0, 7); g.fill();
    // wrap edges so the tile repeats without seams
    if (x < 6 || y < 6) { g.beginPath(); g.ellipse(x + (x < 6 ? S : 0), y + (y < 6 ? S : 0), r, r * .7, 0, 0, 7); g.fill(); }
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? "255,230,200" : "30,15,5"},${Math.random() * .12})`; g.fillRect(Math.random() * S, Math.random() * S, 1, 1); }
  return corkURL = cv.toDataURL("image/png");
}
export function shrinkImage(file, max = 900) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const img = new Image(); img.onerror = rej;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas"); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        storeImage(cv.toDataURL("image/jpeg", .86)).then(res, rej);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

export function createBoard(el, App) {
  el.innerHTML = `<div class="board">
    <div class="board-bar">
      <div class="board-tabs" id="bTabs"></div>
      <button class="btn sm icon ghost" id="bAdd" title="New board">${icon("plus")}</button>
      <div class="tool-sep"></div>
      <button class="btn sm" id="tNote" title="Add a note (or double-click the cork)">${icon("plus")} Note</button>
      <button class="btn sm" id="tHead" title="Add a heading strip">${icon("type")} Heading</button>
      <button class="btn sm" id="tImg" title="Add an image (or paste / drop one)">${icon("image")} Image</button>
      <button class="btn sm" id="tRef" title="Pin a Codex note">${icon("codex")} From Codex</button>
      <button class="btn sm" id="tWeb" title="Build a board of everything in the Codex, tied by its [[links]]">${icon("link")} World web</button>
      <div class="tool-sep"></div>
      <button class="btn sm icon ghost" id="zOut" title="Zoom out">−</button><span class="zoom-out" id="zLbl">100%</span><button class="btn sm icon ghost" id="zIn" title="Zoom in">+</button>
      <button class="btn sm icon ghost" id="zFit" title="Fit everything">${icon("fit")}</button>
    </div>
    <div class="board-view" id="bView" tabindex="0">
      <div class="board-bg" id="bBg"></div>
      <div class="board-world" id="bWorld"><div id="bCards"></div><svg class="strings" id="bStr"></svg></div>
      <div class="board-hint"><b>Double-click</b> to add a note · drag a <b>pin</b> onto another card to tie yarn · <b>scroll</b> to zoom · drag the cork to pan</div>
      <div class="minimap" id="bMini" title="Click to jump"><canvas width="360" height="240"></canvas></div>
    </div>
    <input type="file" id="bFile" accept="image/*" hidden>
  </div>`;
  const view = $("#bView", el), world = $("#bWorld", el), cardsEl = $("#bCards", el), svg = $("#bStr", el), bg = $("#bBg", el);
  bg.style.backgroundImage = `url(${cork()})`;
  const st = { sel: null, mode: null };
  const B = () => { const c = C(); let b = c.boards.find(x => x.id === c.ui.board); if (!b) { b = c.boards[0]; c.ui.board = b.id; } return b; };
  const V = () => (B().view ||= { x: 0, y: 0, z: 1 });

  // ---------- view ----------
  function applyView() {
    const v = V();
    world.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
    bg.style.backgroundSize = `${380 * v.z}px`; bg.style.backgroundPosition = `${v.x}px ${v.y}px`;
    $("#zLbl", el).textContent = Math.round(v.z * 100) + "%";
    drawMini();
  }
  function zoomAt(f, cx, cy) {
    const v = V(), r = view.getBoundingClientRect();
    cx ??= r.width / 2; cy ??= r.height / 2;
    const nz = Math.min(2.5, Math.max(.2, v.z * f));
    const wx = (cx - v.x) / v.z, wy = (cy - v.y) / v.z;
    v.x = cx - wx * nz; v.y = cy - wy * nz; v.z = nz; applyView(); saveSoon();
  }
  let sv; const saveSoon = () => { clearTimeout(sv); sv = setTimeout(save, 400); };
  function toWorld(clientX, clientY) { const v = V(), r = view.getBoundingClientRect(); return { x: (clientX - r.left - v.x) / v.z, y: (clientY - r.top - v.y) / v.z }; }
  function bounds() {
    const ks = B().cards; if (!ks.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of ks) { const e = cardsEl.querySelector(`[data-id="${k.id}"]`); const hh = e ? e.offsetHeight : 160; x0 = Math.min(x0, k.x); y0 = Math.min(y0, k.y); x1 = Math.max(x1, k.x + k.w); y1 = Math.max(y1, k.y + hh); }
    return { x0, y0, x1, y1 };
  }
  function fit() {
    const b = bounds(), r = view.getBoundingClientRect(); if (!b) return;
    const z = Math.min(1.3, (r.width - 120) / (b.x1 - b.x0), (r.height - 140) / (b.y1 - b.y0));
    const v = V(); v.z = Math.max(.2, z); v.x = (r.width - (b.x1 - b.x0) * v.z) / 2 - b.x0 * v.z; v.y = (r.height - (b.y1 - b.y0) * v.z) / 2 - b.y0 * v.z + 10;
    applyView(); saveSoon();
  }
  let miniT;
  function drawMini() {
    clearTimeout(miniT); miniT = setTimeout(() => {
      const cv = $("#bMini canvas", el), g = cv.getContext("2d"), b = bounds(), r = view.getBoundingClientRect(), v = V();
      g.clearRect(0, 0, cv.width, cv.height);
      if (!b) return;
      const vx0 = -v.x / v.z, vy0 = -v.y / v.z, vx1 = vx0 + r.width / v.z, vy1 = vy0 + r.height / v.z;
      const X0 = Math.min(b.x0, vx0) - 40, Y0 = Math.min(b.y0, vy0) - 40, X1 = Math.max(b.x1, vx1) + 40, Y1 = Math.max(b.y1, vy1) + 40;
      const s = Math.min(cv.width / (X1 - X0), cv.height / (Y1 - Y0));
      const ox = (cv.width - (X1 - X0) * s) / 2, oy = (cv.height - (Y1 - Y0) * s) / 2;
      const css = getComputedStyle(document.documentElement);
      for (const k of B().cards) {
        const e = cardsEl.querySelector(`[data-id="${k.id}"]`);
        g.fillStyle = k.color === "ink" ? "#5a4a50" : css.getPropertyValue(k.color === "paper" ? "--paper" : "--c-" + k.color).trim() || "#eee";
        g.fillRect(ox + (k.x - X0) * s, oy + (k.y - Y0) * s, Math.max(2, k.w * s), Math.max(2, (e ? e.offsetHeight : 150) * s));
      }
      g.strokeStyle = "#ff7a3d"; g.lineWidth = 2; g.strokeRect(ox + (vx0 - X0) * s, oy + (vy0 - Y0) * s, (vx1 - vx0) * s, (vy1 - vy0) * s);
      cv._map = { X0, Y0, s, ox, oy };
    }, 60);
  }
  $("#bMini", el).onclick = e => {
    const cv = $("#bMini canvas", el), m = cv._map; if (!m) return;
    const rr = cv.getBoundingClientRect(); const px = (e.clientX - rr.left) / rr.width * cv.width, py = (e.clientY - rr.top) / rr.height * cv.height;
    const wx = (px - m.ox) / m.s + m.X0, wy = (py - m.oy) / m.s + m.Y0, r = view.getBoundingClientRect(), v = V();
    v.x = r.width / 2 - wx * v.z; v.y = r.height / 2 - wy * v.z; applyView(); saveSoon();
  };

  // ---------- tabs ----------
  function renderTabs() {
    const c = C(), tabs = $("#bTabs", el);
    tabs.innerHTML = c.boards.map(b => `<button class="board-tab ${b.id === B().id ? "on" : ""}" data-id="${b.id}" title="Double-click to rename, right-click for options">${esc(b.name)}</button>`).join("");
    $$(".board-tab", tabs).forEach(t => {
      t.onclick = () => { C().ui.board = t.dataset.id; st.sel = null; render(); save(); };
      t.ondblclick = () => renameBoard(c.boards.find(b => b.id === t.dataset.id));
      t.oncontextmenu = e => { e.preventDefault(); const b = c.boards.find(x => x.id === t.dataset.id); App.menu(t, [
        { text: "Rename board", icon: "type", run: () => renameBoard(b) },
        { text: "Duplicate board", icon: "copy", run: () => { const nb = JSON.parse(JSON.stringify(b)); nb.id = uid(); nb.name = b.name + " copy"; const map = {}; nb.cards.forEach(k => { const n = uid(); map[k.id] = n; k.id = n; }); nb.links.forEach(l => { l.id = uid(); l.a = map[l.a]; l.b = map[l.b]; }); c.boards.push(nb); c.ui.board = nb.id; save(); render(); } },
        { text: "Delete board", icon: "trash", run: () => {
          if (c.boards.length < 2) return toast("This is your only board");
          App.confirm(`Delete "${b.name}"?`, `Its ${b.cards.length} cards and strings go with it.`, "Delete board", () => { c.boards = c.boards.filter(x => x.id !== b.id); c.ui.board = c.boards[0].id; save(); render(); });
        } },
      ]); };
    });
  }
  function renameBoard(b) {
    App.modal(`<h2>Board name</h2><label class="f"><span>Name</span><input type="text" id="bn" value="${esc(b.name)}"></label><div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
      const ok = () => { b.name = $("#bn", m).value.trim() || "Board"; save(); close(); renderTabs(); };
      $("[data-x]", m).onclick = close; $("[data-ok]", m).onclick = ok; $("#bn", m).onkeydown = e => e.key === "Enter" && ok(); $("#bn", m).select();
    });
  }
  $("#bAdd", el).onclick = () => { const c = C(); const b = { id: uid(), name: `Board ${c.boards.length + 1}`, cards: [], links: [], view: { x: 0, y: 0, z: 1 } }; c.boards.push(b); c.ui.board = b.id; save(); render(); renameBoard(b); };

  // ---------- cards ----------
  function cardHTML(k) {
    let inner = "";
    if (k.type === "note") inner = `<div class="bx" data-edit="text">${esc(k.text)}</div>`;
    else if (k.type === "heading") inner = `<div class="bt" data-edit="title">${esc(k.title || "Heading")}</div>`;
    else if (k.type === "gen") inner = `<div class="bkind">${KIND_LABEL[k.kind] || "Card"}</div><div class="bt" data-edit="title">${esc(k.title)}</div><div class="bx" data-edit="text">${esc(k.text)}</div>`;
    else if (k.type === "image") inner = `<img src="${k.src}" alt=""><div class="bx" data-edit="text">${esc(k.text || "")}</div>`;
    else if (k.type === "ref") {
      const n = C().notes.find(x => x.id === k.ref);
      inner = n ? `<div class="bkind">Codex · ${esc(n.cat)}</div><span class="open-ref" data-open>open</span><div class="bt">${esc(n.title || "Untitled")}</div><div class="bx">${esc((n.body || "").replace(/[#*\[\]]/g, "").replace(/\n+/g, " ").slice(0, 170))}${(n.body || "").length > 170 ? "…" : ""}</div>`
        : `<div class="bkind">Codex</div><div class="bt">Missing note</div><div class="bx">This note was deleted.</div>`;
    }
    const sw = COLORS.map(cc => `<span class="sw c-${cc} ${cc === k.color ? "on" : ""}" data-color="${cc}" title="${cc}"></span>`).join("");
    const pin = k.color === "ink" ? "#ff7a3d" : k.color === "rose" ? "#2f6fb0" : "#d23b3b";
    return `<div class="bcard t-${k.type} c-${k.color} ${st.sel?.id === k.id ? "sel" : ""}" data-id="${k.id}" style="left:${k.x}px;top:${k.y}px;width:${k.w}px;transform:rotate(${k.rot || 0}deg);z-index:${k.z || 1}">
      <div class="pin" style="--pin:${pin}" title="Drag onto another card to tie yarn"></div>${inner}
      <div class="bc-tools">${sw}<button class="tb" data-show title="Show on stream">${icon("stream")}</button><button class="tb" data-dup title="Duplicate (Ctrl+D)">${icon("copy")}</button><button class="tb" data-del title="Delete (Del)">${icon("trash")}</button></div>
      <div class="bc-resize" title="Drag to resize"></div></div>`;
  }
  function renderCards() { cardsEl.innerHTML = B().cards.map(cardHTML).join(""); }
  function pinPos(k) { return { x: k.x + k.w / 2, y: k.y + 1 }; }
  function yarnPath(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const sag = Math.min(140, d * .22);
    return `M${a.x},${a.y} Q${(a.x + b.x) / 2},${(a.y + b.y) / 2 + sag} ${b.x},${b.y}`;
  }
  function renderLinks(tmp) {
    const b = B(), byId = Object.fromEntries(b.cards.map(k => [k.id, k]));
    let out = "";
    for (const l of b.links) {
      const A = byId[l.a], Bk = byId[l.b]; if (!A || !Bk) continue;
      const p = yarnPath(pinPos(A), pinPos(Bk));
      out += `<path class="yarn ${st.sel?.id === l.id ? "sel" : ""}" d="${p}" stroke="${YARN[l.color] || YARN.red}"/><path class="hit" data-link="${l.id}" d="${p}"/>`;
    }
    if (tmp) out += `<path class="yarn tmp" d="${yarnPath(tmp.a, tmp.b)}" stroke="${YARN.red}"/>`;
    svg.innerHTML = out;
    $$(".link-tools", world).forEach(x => x.remove());
    if (st.sel?.kind === "link") {
      const l = b.links.find(x => x.id === st.sel.id); const A = l && byId[l.a], Bk = l && byId[l.b];
      if (A && Bk) {
        const a = pinPos(A), c = pinPos(Bk), d = Math.hypot(c.x - a.x, c.y - a.y);
        const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2 + Math.min(140, d * .22) / 2;
        const t = h(`<div class="bc-tools link-tools" style="display:flex;position:absolute;left:${mx}px;top:${my}px;transform:translate(-50%,-50%) scale(${1 / V().z});z-index:100002;bottom:auto">
          ${Object.entries(YARN).map(([n, col]) => `<span class="sw ${l.color === n ? "on" : ""}" data-yarn="${n}" style="background:${col}" title="${n} yarn"></span>`).join("")}
          <button class="tb" data-unlink title="Cut the string">${icon("x")}</button></div>`);
        $$("[data-yarn]", t).forEach(s => s.onclick = () => { l.color = s.dataset.yarn; save(); renderLinks(); });
        $("[data-unlink]", t).onclick = () => { b.links = b.links.filter(x => x.id !== l.id); st.sel = null; save(); renderLinks(); };
        t.addEventListener("pointerdown", e => e.stopPropagation());
        world.append(t);
      }
    }
  }
  function render() { renderTabs(); renderCards(); renderLinks(); applyView(); }
  function select(sel) {
    st.sel = sel;
    $$(".bcard", cardsEl).forEach(e => e.classList.toggle("sel", sel?.kind === "card" && e.dataset.id === sel.id));
    renderLinks();
  }
  function addCard(k, edit = true) {
    const b = B(); const maxZ = Math.max(1, ...b.cards.map(x => x.z || 1));
    const card = { id: uid(), w: 220, rot: (Math.random() * 4 - 2).toFixed(2), z: maxZ + 1, color: "mustard", title: "", text: "", ...k };
    b.cards.push(card); save(); renderCards(); select({ kind: "card", id: card.id }); drawMini();
    if (edit) { const e = cardsEl.querySelector(`[data-id="${card.id}"] [data-edit]`); if (e) beginEdit(e, card); }
    return card;
  }
  function centerWorld() { const r = view.getBoundingClientRect(); return toWorld(r.left + r.width / 2, r.top + r.height / 2); }
  function deleteSel() {
    const b = B(); if (!st.sel) return;
    if (st.sel.kind === "card") { b.cards = b.cards.filter(k => k.id !== st.sel.id); b.links = b.links.filter(l => l.a !== st.sel.id && l.b !== st.sel.id); }
    else b.links = b.links.filter(l => l.id !== st.sel.id);
    st.sel = null; save(); renderCards(); renderLinks(); drawMini();
  }
  function duplicateSel() {
    if (st.sel?.kind !== "card") return; const k = B().cards.find(x => x.id === st.sel.id); if (!k) return;
    const { id, ...rest } = k; addCard({ ...rest, x: k.x + 30, y: k.y + 30 }, false);
  }
  function beginEdit(e, k) {
    if (e.isContentEditable) return;
    const field = e.dataset.edit;
    e.contentEditable = "plaintext-only"; e.focus();
    const sel = getSelection(); sel.selectAllChildren(e); sel.collapseToEnd();
    const done = () => {
      e.contentEditable = "false"; e.removeEventListener("blur", done);
      const v = e.innerText.replace(/\n$/, "");
      if (k[field] !== v) { k[field] = v; save(); }
      if (k.type === "note" && !v.trim()) { B().cards = B().cards.filter(x => x.id !== k.id); save(); renderCards(); }
      renderLinks(); drawMini();
    };
    e.addEventListener("blur", done);
    e.onkeydown = ev => { if (ev.key === "Escape" || (ev.key === "Enter" && (ev.ctrlKey || field === "title"))) { ev.preventDefault(); e.blur(); } ev.stopPropagation(); };
  }

  // ---------- pointer ----------
  view.addEventListener("pointerdown", e => {
    if (e.target.closest(".bc-tools")) return;
    const cardEl = e.target.closest(".bcard");
    const editing = e.target.closest("[contenteditable='plaintext-only']");
    if (editing) return;
    view.focus({ preventScroll: true });
    const b = B();
    if (e.button === 1 || !cardEl) {
      if (e.target.closest("[data-link]")) { select({ kind: "link", id: e.target.dataset.link }); return; }
      select(null);
      st.mode = { t: "pan", sx: e.clientX, sy: e.clientY, vx: V().x, vy: V().y };
      view.classList.add("panning"); view.setPointerCapture(e.pointerId); return;
    }
    const k = b.cards.find(x => x.id === cardEl.dataset.id); if (!k) return;
    if (e.target.classList.contains("pin")) {
      st.mode = { t: "link", from: k }; view.classList.add("linking"); view.setPointerCapture(e.pointerId); e.preventDefault(); return;
    }
    const maxZ = Math.max(1, ...b.cards.map(x => x.z || 1));
    if ((k.z || 1) < maxZ) { k.z = maxZ + 1; cardEl.style.zIndex = k.z; }
    select({ kind: "card", id: k.id });
    if (e.target.classList.contains("bc-resize")) { st.mode = { t: "resize", k, el: cardEl, sx: e.clientX, w: k.w }; }
    else st.mode = { t: "drag", k, el: cardEl, sx: e.clientX, sy: e.clientY, x: k.x, y: k.y, moved: false };
    view.setPointerCapture(e.pointerId);
  });
  view.addEventListener("pointermove", e => {
    const m = st.mode; if (!m) return; const z = V().z;
    if (m.t === "pan") { V().x = m.vx + e.clientX - m.sx; V().y = m.vy + e.clientY - m.sy; applyView(); }
    if (m.t === "drag") {
      const dx = (e.clientX - m.sx) / z, dy = (e.clientY - m.sy) / z;
      if (Math.abs(dx) + Math.abs(dy) > 2) m.moved = true;
      m.k.x = Math.round(m.x + dx); m.k.y = Math.round(m.y + dy);
      m.el.style.left = m.k.x + "px"; m.el.style.top = m.k.y + "px"; renderLinks();
    }
    if (m.t === "resize") { m.k.w = Math.max(140, Math.round(m.w + (e.clientX - m.sx) / z)); m.el.style.width = m.k.w + "px"; renderLinks(); }
    if (m.t === "link") { renderLinks({ a: pinPos(m.from), b: toWorld(e.clientX, e.clientY) }); }
  });
  const endPointer = e => {
    const m = st.mode; if (!m) return; st.mode = null;
    view.classList.remove("panning", "linking");
    if (m.t === "link") {
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest(".bcard");
      const b = B();
      if (target && target.dataset.id !== m.from.id) {
        const exists = b.links.find(l => (l.a === m.from.id && l.b === target.dataset.id) || (l.b === m.from.id && l.a === target.dataset.id));
        if (!exists) { const l = { id: uid(), a: m.from.id, b: target.dataset.id, color: "red" }; b.links.push(l); save(); }
      }
      renderLinks();
    }
    if (m.t === "pan") saveSoon();
    if ((m.t === "drag" && m.moved) || m.t === "resize") { save(); drawMini(); }
  };
  view.addEventListener("pointerup", endPointer);
  view.addEventListener("pointercancel", endPointer);
  view.addEventListener("dblclick", e => {
    const cardEl = e.target.closest(".bcard");
    if (!cardEl) { const p = toWorld(e.clientX, e.clientY); addCard({ type: "note", x: Math.round(p.x - 110), y: Math.round(p.y - 30), color: COLORS[1 + Math.floor(Math.random() * 5)] }); return; }
    const k = B().cards.find(x => x.id === cardEl.dataset.id); if (!k) return;
    if (k.type === "ref") { App.go("codex", { note: k.ref }); return; }
    const ed = e.target.closest("[data-edit]") || cardEl.querySelector("[data-edit]");
    if (ed) beginEdit(ed, k);
  });
  view.addEventListener("click", e => {
    const sw = e.target.closest("[data-color]"), cardEl = e.target.closest(".bcard");
    if (sw && cardEl) { const k = B().cards.find(x => x.id === cardEl.dataset.id); k.color = sw.dataset.color; save(); renderCards(); renderLinks(); drawMini(); return; }
    if (e.target.closest("[data-del]")) { deleteSel(); return; }
    if (e.target.closest("[data-dup]")) { duplicateSel(); return; }
    if (e.target.closest("[data-show]") && cardEl) {
      const k = B().cards.find(x => x.id === cardEl.dataset.id);
      if (k.type === "image") App.showHandout({ id: k.id, type: "image", src: k.src, title: k.text || "" });
      else if (k.type === "heading") App.showHandout({ id: k.id, type: "text", style: "plain", title: k.title, text: "" });
      else if (k.type === "ref") { const n = C().notes.find(x => x.id === k.ref); App.showHandout({ id: k.id, type: "text", style: "parchment", title: n?.title || "", text: (n?.body || "").replace(/\[\[|\]\]|\*\*|^#+\s*/gm, "") }); }
      else App.showHandout({ id: k.id, type: "text", style: k.type === "gen" ? "parchment" : "card", title: k.title || "", text: k.text || "" });
      return;
    }
    if (e.target.closest("[data-open]") && cardEl) { const k = B().cards.find(x => x.id === cardEl.dataset.id); App.go("codex", { note: k.ref }); }
  });
  view.addEventListener("wheel", e => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const onKey = e => {
    if (el.closest("[hidden]") || document.querySelector(".modal-back")) return;
    if (e.target.closest("input,textarea,select,[contenteditable='plaintext-only']")) return;
    if ((e.key === "Delete" || e.key === "Backspace") && st.sel) { e.preventDefault(); deleteSel(); }
    if (e.key === "Escape") select(null);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSel(); }
    if (e.key === "n" && !e.ctrlKey) { const p = centerWorld(); addCard({ type: "note", x: p.x - 110, y: p.y - 40 }); e.preventDefault(); }
  };
  addEventListener("keydown", onKey);
  const onPaste = async e => {
    if (el.closest("[hidden]") || e.target.closest("input,textarea,[contenteditable='plaintext-only']")) return;
    const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/"));
    if (f) { e.preventDefault(); const p = centerWorld(); addCard({ type: "image", src: await shrinkImage(f), x: p.x - 130, y: p.y - 100, w: 260, color: "paper" }, false); return; }
    const t = e.clipboardData?.getData("text/plain"); if (t && t.trim()) { const p = centerWorld(); addCard({ type: "note", text: t.trim().slice(0, 2000), x: p.x - 110, y: p.y - 40 }, false); }
  };
  addEventListener("paste", onPaste);
  view.addEventListener("dragover", e => e.preventDefault());
  view.addEventListener("drop", async e => {
    e.preventDefault(); const files = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/"));
    let i = 0; for (const f of files) { const p = toWorld(e.clientX, e.clientY); addCard({ type: "image", src: await shrinkImage(f), x: p.x - 130 + i * 30, y: p.y - 100 + i * 30, w: 260, color: "paper" }, false); i++; }
  });

  // ---------- toolbar ----------
  $("#tNote", el).onclick = () => { const p = centerWorld(); addCard({ type: "note", x: Math.round(p.x - 110 + Math.random() * 60), y: Math.round(p.y - 60 + Math.random() * 40) }); };
  $("#tHead", el).onclick = () => { const p = centerWorld(); addCard({ type: "heading", title: "New heading", x: Math.round(p.x - 160), y: Math.round(p.y - 120), w: 320, color: "paper" }); };
  $("#tImg", el).onclick = () => $("#bFile", el).click();
  $("#bFile", el).onchange = async e => { const f = e.target.files[0]; if (!f) return; const p = centerWorld(); addCard({ type: "image", src: await shrinkImage(f), x: p.x - 130, y: p.y - 100, w: 260, color: "paper" }, false); e.target.value = ""; };
  $("#tRef", el).onclick = () => {
    const notes = C().notes;
    if (!notes.length) return toast("Your Codex is empty. Write a note there first");
    App.modal(`<h2>Pin from the Codex</h2><input type="search" id="rq" placeholder="Search notes"><div id="rl" style="display:flex;flex-direction:column;gap:4px;max-height:50vh;overflow:auto"></div>`, (m, close) => {
      const draw = () => {
        const q = $("#rq", m).value.toLowerCase();
        $("#rl", m).innerHTML = notes.filter(n => !q || (n.title + n.body).toLowerCase().includes(q)).slice(0, 80).map(n => `<button class="cx-item" data-id="${n.id}"><b>${esc(n.title || "Untitled")}</b><span>${esc(n.cat)} · ${esc((n.body || "").slice(0, 80))}</span></button>`).join("");
        $$("[data-id]", m).forEach(b => b.onclick = () => { const p = centerWorld(); const n = notes.find(x => x.id === b.dataset.id); addCard({ type: "ref", ref: n.id, x: p.x - 120, y: p.y - 80, w: 240, color: { Locations: "lichen", NPCs: "rose", Quests: "mustard", Items: "plum", Factions: "sky" }[n.cat] || "paper" }, false); close(); });
      };
      $("#rq", m).oninput = draw; draw();
    });
  };
  $("#tWeb", el).onclick = () => {
    const c = C(), notes = c.notes.filter(n => n.title);
    if (notes.length < 2) return toast("Write a few Codex pages that link each other with [[Title]] first");
    const links = [], byTitle = new Map(notes.map(n => [n.title.toLowerCase(), n]));
    for (const n of notes) for (const m of String(n.body || "").matchAll(/\[\[([^\]]+)\]\]/g)) { const t = byTitle.get(m[1].trim().toLowerCase()); if (t && t !== n && !links.some(l => (l[0] === n && l[1] === t) || (l[0] === t && l[1] === n))) links.push([n, t]); }
    const linked = notes.filter(n => links.some(l => l[0] === n || l[1] === n));
    const use = (linked.length >= 2 ? linked : notes).slice(0, 60);
    const order = ["NPCs", "Factions", "Locations", "Quests", "Items", "Lore", "Other"];
    use.sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat));
    const R = 160 + use.length * 32, color = { Locations: "lichen", NPCs: "rose", Quests: "mustard", Items: "plum", Factions: "sky" };
    const cards = use.map((n, i) => { const a = i / use.length * Math.PI * 2 - Math.PI / 2; return { id: uid(), type: "ref", ref: n.id, w: 230, x: Math.round(R + Math.cos(a) * R), y: Math.round(R * .8 + Math.sin(a) * R * .8), rot: (Math.random() * 4 - 2).toFixed(2), z: 1, color: color[n.cat] || "paper", title: "", text: "" }; });
    const idOf = n => cards[use.indexOf(n)]?.id;
    const b = { id: uid(), name: "World web", cards: [{ id: uid(), type: "heading", title: c.name, x: Math.round(R - 150), y: Math.round(R * .8 - 30), w: 300, color: "paper", rot: "0", z: 2, text: "" }, ...cards], links: links.filter(l => idOf(l[0]) && idOf(l[1])).map(l => ({ id: uid(), a: idOf(l[0]), b: idOf(l[1]), color: "red" })), view: { x: 40, y: 20, z: .6 } };
    c.boards.push(b); c.ui.board = b.id; save(); render(); setTimeout(fit, 80);
    toast(`World web: ${cards.length} pages, ${b.links.length} strings`);
  };
  $("#zIn", el).onclick = () => zoomAt(1.2); $("#zOut", el).onclick = () => zoomAt(1 / 1.2); $("#zFit", el).onclick = fit;
  new ResizeObserver(() => drawMini()).observe(view);

  render();
  return {
    show() { renderCards(); renderLinks(); applyView(); },
    refresh() { render(); },
    destroy() { removeEventListener("keydown", onKey); removeEventListener("paste", onPaste); },
  };
}
