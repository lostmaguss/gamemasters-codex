import { draggable, dropZone } from "./dnd.js";
// Battle map: image + grid + tokens + fog of war you paint away. Mirrors to the stream window.
import { $, $$, esc, h, icon, toast, uid, ls, debounce } from "./util.js";
import { C, save } from "./store.js";
import { Stage } from "./bridge.js";
import { drawMap, loadImg, loadFresh, mapSrc, fitView, drawArea, drawRuler } from "./maprender.js";
import { shrinkImage } from "./board.js";
import { combat } from "./combat.js";

const TOKEN_COLORS = ["#f39da8", "#a8d3e4", "#b8d8a8", "#f2c75c", "#cfb2e2", "#ff9a66", "#e8e1d6", "#7a6f73"];

export function createMap(el, App) {
  const st = { tool: "move", brush: ls.get("map.brush", 60), img: null, fog: null, drag: null, sel: null, box: null };
  el.innerHTML = `<div class="mapv">
    <div class="board-bar map-bar">
      <div class="board-tabs" id="mTabs"></div>
      <button class="btn sm" id="mNew">${icon("image")} New map</button>
      <div class="tool-sep"></div>
      <div class="mode-seg" id="mTools">
        <button data-t="move" title="Move tokens, drag to pan (M)">${icon("fit")} Move</button>
        <button data-t="reveal" title="Paint fog away (R)">${icon("discovery")} Reveal</button>
        <button data-t="hide" title="Paint fog back (H)">${icon("rest")} Hide</button>
        <button data-t="box" title="Drag a box to reveal (B)">${icon("max")} Box</button>
        <button data-t="ruler" title="Measure a distance (D)">${icon("travel")} Measure</button>
        <button data-t="area" title="Place a circle, cone or line (A)">${icon("discovery")} Area</button>
      </div>
      <select id="mShape" title="Area shape" style="width:auto;height:30px"><option value="circle">Circle</option><option value="cone">Cone</option><option value="line">Line</option></select>
      <button class="btn sm ghost" id="mClearAreas" title="Remove all area templates">Clear areas</button>
      <input type="range" id="mBrush" min="10" max="300" value="${st.brush}" title="Brush size">
      <button class="btn sm ghost" id="mAll" title="Reveal the whole map">Reveal all</button>
      <button class="btn sm ghost" id="mNone" title="Cover the whole map in fog">Hide all</button>
      <div class="tool-sep"></div>
      <label class="toggle"><input type="checkbox" id="mStream"> ${icon("stream")} On stream</label>
      <label class="toggle"><input type="checkbox" id="mFollow"> Stream follows my view</label>
    </div>
    <div class="map-body">
      <div class="map-stage" id="mStage"><canvas id="mCanvas"></canvas><div class="board-hint" id="mHint"></div></div>
      <aside class="map-side" id="mSide"></aside>
    </div>
    <input type="file" id="mFile" accept="image/*" hidden>
  </div>`;
  const canvas = $("#mCanvas", el), ctx = canvas.getContext("2d"), stage = $("#mStage", el);
  const ui = () => (C().ui.mapUi ||= { onStream: false, follow: false });
  const maps = () => (C().maps ||= []);
  const M = () => maps().find(m => m.id === C().ui.map) || maps()[0];
  let W = 1, H = 1;

  // ---------- loading ----------
  async function load() {
    const m = M(); st.img = null; st.fog = null;
    if (!m) { render(); return; }
    C().ui.map = m.id;
    st.img = await loadImg(mapSrc(m));
    const fs = Math.min(1, 1024 / m.w) * .5;
    const fc = document.createElement("canvas"); fc.width = Math.max(1, Math.round(m.w * fs)); fc.height = Math.max(1, Math.round(m.h * fs)); fc._s = fs;
    const fx = fc.getContext("2d");
    if (m.fog) { const fi = await loadFresh(m.fog); if (fi) fx.drawImage(fi, 0, 0, fc.width, fc.height); }
    else { fx.fillStyle = "#000"; fx.fillRect(0, 0, fc.width, fc.height); }
    st.fog = fc;
    for (const t of m.tokens || []) if (t.img && !t._img) t._img = await loadImg(t.img);
    if (!m.view) m.view = fitView(m, W, H);
    render(); pushMap(); pushState();
  }
  const saveFog = debounce(() => { const m = M(); if (m && st.fog) { m.fog = st.fog.toDataURL("image/png"); save(); } }, 600);

  // ---------- stream ----------
  function pushMap() {
    const m = M();
    Stage.overlay({ kind: "map", show: !!(m && ui().onStream), id: m?.id, src: m ? mapSrc(m) : null, w: m?.w, h: m?.h, grid: m?.grid, fogOn: m?.fogOn !== false });
  }
  let pt;
  function pushState() {
    clearTimeout(pt); pt = setTimeout(() => {
      const m = M(); if (!m || !ui().onStream) return;
      const cb = combat(), cur = cb.active ? cb.list[cb.turn]?.id : null;
      const v = m.view, follow = ui().follow ? { cx: (W / 2 - v.x) / v.z, cy: (H / 2 - v.y) / v.z, span: W / v.z } : null;
      Stage.overlay({ kind: "mapstate", id: m.id, fog: st.fog ? st.fog.toDataURL("image/png") : null, tokens: (m.tokens || []).filter(t => !t.hidden).map(({ _img, ...t }) => t), areas: m.areas || [], follow, current: cur });
    }, 160);
  }

  // ---------- drawing ----------
  let raf = 0;
  function render() { if (!raf) raf = requestAnimationFrame(draw); }
  function draw() {
    raf = 0; const m = M();
    const dpr = devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cb = combat(), cur = cb.active ? cb.list[cb.turn]?.id : null;
    syncCombatState(m, cb);
    drawMap(ctx, W, H, { map: m, img: st.img, fog: st.fog, view: m?.view || { x: 0, y: 0, z: 1 }, gm: true, current: cur });
    if (m && st.sel) { const t = m.tokens.find(x => x.id === st.sel); if (t) { const v = m.view, r = (t.size || 1) * (m.grid?.size || 70) * .5; ctx.strokeStyle = "#fff"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(v.x + t.x * v.z, v.y + t.y * v.z, r * v.z + 4, 0, 7); ctx.stroke(); ctx.setLineDash([]); } }
    if (st.ruler && m) drawRuler(ctx, st.ruler.p1, st.ruler.p2, m.view, rulerLabel(m, st.ruler.p1, st.ruler.p2));
    if (st.area && m) { ctx.save(); ctx.translate(m.view.x, m.view.y); ctx.scale(m.view.z, m.view.z); drawArea(ctx, st.area, m.view, true); ctx.restore(); drawRuler(ctx, { x: st.area.x1, y: st.area.y1 }, { x: st.area.x2, y: st.area.y2 }, m.view, rulerLabel(m, { x: st.area.x1, y: st.area.y1 }, { x: st.area.x2, y: st.area.y2 })); }
    if (st.box) { ctx.strokeStyle = "#ff7a3d"; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeRect(st.box.x0, st.box.y0, st.box.x1 - st.box.x0, st.box.y1 - st.box.y0); ctx.setLineDash([]); }
    if (st.cursor && (st.tool === "reveal" || st.tool === "hide") && m) { ctx.strokeStyle = st.tool === "reveal" ? "#ffcf5a" : "#9aa"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(st.cursor.x, st.cursor.y, st.brush * m.view.z / 2, 0, 7); ctx.stroke(); }
    if (!m) { ctx.fillStyle = "#b8a79f"; ctx.font = '600 16px "IBM Plex Sans Condensed"'; ctx.textAlign = "center"; ctx.fillText("Add a map image to start: New map, or drop an image here", W / 2, H / 2); }
  }
  function syncCombatState(m, cb) {
    if (!m) return;
    for (const t of m.tokens || []) { const x = t.ref && cb.list.find(y => y.id === t.ref); t.down = !!(x && Number(x.max) > 0 && Number(x.hp) <= 0); }
  }
  function resize() {
    const r = stage.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
    render();
  }
  new ResizeObserver(resize).observe(stage);

  // ---------- coordinates & tools ----------
  function rulerLabel(m, a, b) {
    const g = m.grid || {}, cells = Math.hypot(b.x - a.x, b.y - a.y) / (g.size || 70);
    const per = Number(g.per) || 5, unit = g.unit ?? "ft";
    return `${cells.toFixed(1)} cells${unit ? ` · ${Math.round(cells * per * 10) / 10} ${unit}` : ""}`;
  }
  const toMap = (cx, cy) => { const r = canvas.getBoundingClientRect(), v = M().view; return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z }; };
  const tokenAt = p => { const m = M(), cell = m.grid?.size || 70; return [...(m.tokens || [])].reverse().find(t => Math.hypot(t.x - p.x, t.y - p.y) <= (t.size || 1) * cell * .46); };
  function paint(p, mode) {
    const f = st.fog, g = f.getContext("2d"), s = f._s;
    g.globalCompositeOperation = mode === "reveal" ? "destination-out" : "source-over"; g.fillStyle = "#000";
    g.beginPath(); g.arc(p.x * s, p.y * s, st.brush / 2 * s, 0, 7); g.fill(); g.globalCompositeOperation = "source-over";
  }
  function paintLine(a, b, mode) { const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / (st.brush / 4))); for (let i = 1; i <= n; i++) paint({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }, mode); }
  function snap(t) {
    const m = M(), g = m.grid; if (!g?.show || !g.size) return;
    const odd = (t.size || 1) % 2 === 1, ox = g.ox || 0, oy = g.oy || 0;
    const f = v => odd ? Math.floor(v / g.size) * g.size + g.size / 2 : Math.round(v / g.size) * g.size;
    t.x = f(t.x - ox) + ox; t.y = f(t.y - oy) + oy;
  }
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("pointerdown", e => {
    const m = M(); if (!m) return; canvas.setPointerCapture(e.pointerId);
    const p = toMap(e.clientX, e.clientY);
    if (e.button === 1 || e.button === 2 || (st.tool === "move" && !tokenAt(p)) || e.shiftKey && st.tool === "move") { st.drag = { t: "pan", sx: e.clientX, sy: e.clientY, vx: m.view.x, vy: m.view.y }; if (st.tool === "move") { st.sel = null; renderSide(); } return; }
    if (st.tool === "move") { const t = tokenAt(p); st.sel = t.id; st.drag = { t: "token", tok: t, dx: t.x - p.x, dy: t.y - p.y }; renderSide(); render(); return; }
    if (st.tool === "ruler") { st.ruler = { p1: p, p2: p }; st.drag = { t: "ruler" }; render(); return; }
    if (st.tool === "area") { st.area = { shape: $("#mShape", el).value, x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: "#ff7a3d", cell: m.grid?.size || 70, w: 1 }; st.drag = { t: "area" }; render(); return; }
    if (st.tool === "box") { const r = canvas.getBoundingClientRect(); st.box = { x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top }; st.drag = { t: "box", p0: p }; return; }
    paint(p, st.tool); st.drag = { t: "paint", last: p }; render(); pushState();
  });
  canvas.addEventListener("pointermove", e => {
    const m = M(); if (!m) return; const r = canvas.getBoundingClientRect();
    st.cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
    const d = st.drag;
    if (!d) { if (st.tool === "reveal" || st.tool === "hide") render(); return; }
    const p = toMap(e.clientX, e.clientY);
    if (d.t === "pan") { m.view.x = d.vx + e.clientX - d.sx; m.view.y = d.vy + e.clientY - d.sy; render(); if (ui().follow) pushState(); }
    if (d.t === "token") { d.tok.x = p.x + d.dx; d.tok.y = p.y + d.dy; render(); pushState(); }
    if (d.t === "paint") { paintLine(d.last, p, st.tool); d.last = p; render(); pushState(); }
    if (d.t === "ruler") { st.ruler.p2 = p; render(); }
    if (d.t === "area") { st.area.x2 = p.x; st.area.y2 = p.y; render(); }
    if (d.t === "box") { st.box.x1 = e.clientX - r.left; st.box.y1 = e.clientY - r.top; d.p1 = p; render(); }
  });
  const up = () => {
    const d = st.drag; st.drag = null; if (!d) return;
    if (d.t === "token") { snap(d.tok); save(); render(); pushState(); }
    if (d.t === "ruler") { setTimeout(() => { st.ruler = null; render(); }, 1500); }
    if (d.t === "area") { const a = st.area; st.area = null; if (Math.hypot(a.x2 - a.x1, a.y2 - a.y1) > 5) { (M().areas ||= []).push({ id: uid(), ...a }); save(); pushState(); } render(); }
    if (d.t === "paint") saveFog();
    if (d.t === "pan") save();
    if (d.t === "box" && d.p1) {
      const f = st.fog, s = f._s, g = f.getContext("2d");
      g.clearRect(Math.min(d.p0.x, d.p1.x) * s, Math.min(d.p0.y, d.p1.y) * s, Math.abs(d.p1.x - d.p0.x) * s, Math.abs(d.p1.y - d.p0.y) * s);
      st.box = null; saveFog(); render(); pushState();
    }
    st.box = null;
  };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", () => { st.cursor = null; render(); });
  canvas.addEventListener("wheel", e => {
    const m = M(); if (!m) return; e.preventDefault();
    const r = canvas.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top, v = m.view;
    const nz = Math.min(6, Math.max(.05, v.z * Math.exp(-e.deltaY * .0015)));
    v.x = cx - (cx - v.x) / v.z * nz; v.y = cy - (cy - v.y) / v.z * nz; v.z = nz; render(); if (ui().follow) pushState(); saveView();
  }, { passive: false });
  const saveView = debounce(save, 500);
  dropZone(stage, { accept: p => p.kind === "creature" && !!M(), label: p => `Place ${p.name}`, drop: async (p, e) => {
    const x = C().bestiary.find(y => y.id === p.id), m = M(); if (!x || !m) return;
    const at = toMap(e.clientX, e.clientY), n = m.tokens.filter(t => t.name.startsWith(x.name)).length;
    const t = { id: uid(), name: n ? `${x.name} ${n + 1}` : x.name, color: "#f39da8", size: 1, img: x.img || null, x: at.x, y: at.y }; snap(t);
    if (t.img) t._img = await loadImg(t.img);
    m.tokens.push(t); st.sel = t.id; save(); renderSide(); render(); pushState(); toast(`${t.name} placed`);
  } });
  stage.addEventListener("dragover", e => e.preventDefault());
  stage.addEventListener("drop", e => { e.preventDefault(); const f = [...e.dataTransfer.files].find(x => x.type.startsWith("image/")); if (f) addMap(f); });

  // ---------- maps ----------
  async function addMap(file) {
    toast("Loading map…");
    const data = await shrinkImage(file, 3000);
    const img = await loadImg(data);
    const m = { id: uid(), name: file.name.replace(/\.[^.]+$/, "") || "Map", w: img.naturalWidth, h: img.naturalHeight, grid: { show: true, size: Math.round(Math.min(img.naturalWidth, img.naturalHeight) / 20), ox: 0, oy: 0, color: "rgba(0,0,0,.35)" }, fog: null, fogOn: true, tokens: [], view: null };
    m.src = data;
    maps().push(m); C().ui.map = m.id; save(); renderTabs(); renderSide(); await load(); m.view = fitView(m, W, H); render(); save();
  }
  function renderTabs() {
    $("#mTabs", el).innerHTML = maps().map(m => `<button class="board-tab ${m.id === M()?.id ? "on" : ""}" data-id="${m.id}">${esc(m.name)}</button>`).join("");
    $$(".board-tab", $("#mTabs", el)).forEach(b => b.onclick = () => { C().ui.map = b.dataset.id; st.sel = null; save(); renderTabs(); renderSide(); load(); });
  }
  function renderSide() {
    const box = $("#mSide", el), m = M();
    if (!m) { box.innerHTML = `<div class="empty" style="height:auto;padding-top:40px"><h3>Battle maps</h3><p>Load a map image, lay a grid on it and paint the fog away as the party explores. Turn on "On stream" and your players see it, fog and all.</p><button class="btn primary" id="mE">${icon("image")} Load a map</button></div>`; $("#mE", box).onclick = () => $("#mFile", el).click(); return; }
    const g = m.grid ||= { show: true, size: 70, ox: 0, oy: 0 };
    const sel = m.tokens.find(t => t.id === st.sel);
    box.innerHTML = `<section><div class="sec-h"><h3>Tokens</h3><div class="line"></div></div>
        <div class="row" style="gap:6px;margin-bottom:8px"><button class="btn sm" id="tkCombat">${icon("combat")} From combat</button><button class="btn sm" id="tkAdd">${icon("plus")} Token</button></div>
        <ul class="tk-list">${m.tokens.map(t => `<li class="${t.id === st.sel ? "on" : ""}" data-id="${t.id}"><i style="background:${esc(t.color)}"></i><span>${esc(t.name)}</span><button class="tb" data-hide title="${t.hidden ? "Hidden from players" : "Visible to players"}">${icon(t.hidden ? "lock" : "stream")}</button><button class="tb" data-rm title="Remove">${icon("x")}</button></li>`).join("") || `<li class="none">No tokens yet.</li>`}</ul>
        ${sel ? `<div class="tk-edit"><label class="f"><span>Name</span><input type="text" id="tkN" value="${esc(sel.name)}"></label>
          <div class="row" style="gap:6px">${TOKEN_COLORS.map(c => `<button class="sw ${c === sel.color ? "on" : ""}" data-c="${c}" style="background:${c}"></button>`).join("")}</div>
          <label class="f"><span>Size (cells)</span><div class="stepper sm"><button data-sz="-1">−</button><output>${sel.size || 1}</output><button data-sz="1">+</button></div></label></div>` : ""}
      </section>
      <section><div class="sec-h"><h3>Grid</h3><div class="line"></div></div>
        <label class="toggle"><input type="checkbox" id="gShow" ${g.show ? "checked" : ""}> Show grid and snap tokens</label>
        <div class="row" style="margin-top:8px;gap:8px"><label class="f" style="width:84px"><span>Cell px</span><input type="number" id="gSize" value="${g.size}"></label><label class="f" style="width:70px"><span>Offset X</span><input type="number" id="gOx" value="${g.ox || 0}"></label><label class="f" style="width:70px"><span>Offset Y</span><input type="number" id="gOy" value="${g.oy || 0}"></label></div>
        <div class="row" style="margin-top:8px;gap:8px"><label class="f" style="width:84px"><span>One cell =</span><input type="number" id="gPer" value="${g.per ?? 5}" step="0.5"></label><label class="f" style="width:70px"><span>Unit</span><input type="text" id="gUnit" value="${esc(g.unit ?? "ft")}"></label></div>
        <p class="md-help">Match the cell size to the squares drawn on your map, then nudge the offset until the lines sit on them.</p>
        <label class="toggle"><input type="checkbox" id="fOn" ${m.fogOn !== false ? "checked" : ""}> Fog of war</label>
      </section>
      <section><div class="sec-h"><h3>Map</h3><div class="line"></div></div>
        <label class="f"><span>Name</span><input type="text" id="mName" value="${esc(m.name)}"></label>
        <div class="row" style="margin-top:8px"><button class="btn sm" id="mFit">${icon("fit")} Fit to screen</button><button class="btn sm ghost danger" id="mDel">${icon("trash")} Delete map</button></div>
      </section>`;
    const b = box;
    $("#tkCombat", b).onclick = () => {
      const cb = combat(); if (!cb.list.length) return toast("The combat tracker is empty");
      const cell = g.size || 70, c = C(); let i = 0;
      const v = m.view, cx = (W / 2 - v.x) / v.z, cy = (H / 2 - v.y) / v.z;
      for (const x of cb.list) {
        if (m.tokens.some(t => t.ref === x.id)) continue;
        const cr = x.ref && c.bestiary.find(y => y.id === x.ref), pm = x.ref && c.party.find(y => y.id === x.ref);
        const t = { id: uid(), ref: x.id, name: x.name, color: x.color || (x.kind === "foe" ? "#f39da8" : x.kind === "ally" ? "#b8d8a8" : "#a8d3e4"), size: 1, hidden: x.hidden || false, img: cr?.img || pm?.portrait || null, x: cx + ((i % 6) - 2.5) * cell, y: cy + (Math.floor(i / 6) - .5) * cell };
        snap(t); m.tokens.push(t); i++;
      }
      Promise.all(m.tokens.map(async t => { if (t.img && !t._img) t._img = await loadImg(t.img); })).then(() => { render(); pushState(); });
      save(); renderSide(); toast(i ? `Placed ${i} tokens` : "Everyone in combat already has a token");
    };
    $("#tkAdd", b).onclick = () => { const v = m.view, t = { id: uid(), name: "Token", color: TOKEN_COLORS[m.tokens.length % TOKEN_COLORS.length], size: 1, x: (W / 2 - v.x) / v.z, y: (H / 2 - v.y) / v.z }; snap(t); m.tokens.push(t); st.sel = t.id; save(); renderSide(); render(); pushState(); $("#tkN", el)?.select(); };
    $$(".tk-list li[data-id]", b).forEach(li => {
      const t = m.tokens.find(x => x.id === li.dataset.id);
      li.onclick = e => { if (e.target.closest("button")) return; st.sel = t.id; renderSide(); render(); };
      $("[data-hide]", li).onclick = () => { t.hidden = !t.hidden; save(); renderSide(); render(); pushState(); };
      $("[data-rm]", li).onclick = () => { m.tokens = m.tokens.filter(x => x !== t); if (st.sel === t.id) st.sel = null; save(); renderSide(); render(); pushState(); };
    });
    if (sel) {
      $("#tkN", b).oninput = e => { sel.name = e.target.value; render(); pushState(); saveView(); };
      $$("[data-c]", b).forEach(s => s.onclick = () => { sel.color = s.dataset.c; save(); renderSide(); render(); pushState(); });
      $$("[data-sz]", b).forEach(s => s.onclick = () => { sel.size = Math.max(1, Math.min(6, (sel.size || 1) + +s.dataset.sz)); snap(sel); save(); renderSide(); render(); pushState(); });
    }
    $("#gShow", b).onchange = e => { g.show = e.target.checked; save(); render(); pushMap(); };
    const num = (id, k) => $(id, b).oninput = e => { g[k] = Math.max(k === "size" ? 8 : -9999, Number(e.target.value) || 0); render(); saveView(); pushMap(); };
    num("#gSize", "size"); num("#gOx", "ox"); num("#gOy", "oy");
    $("#gPer", b).oninput = e => { g.per = Number(e.target.value) || 5; saveView(); };
    $("#gUnit", b).oninput = e => { g.unit = e.target.value.trim(); saveView(); };
    $("#fOn", b).onchange = e => { m.fogOn = e.target.checked; save(); render(); pushMap(); pushState(); };
    $("#mName", b).oninput = e => { m.name = e.target.value; saveView(); renderTabs(); };
    $("#mFit", b).onclick = () => { m.view = fitView(m, W, H); render(); save(); pushState(); };
    $("#mDel", b).onclick = () => App.confirm(`Delete "${m.name}"?`, "The map, its fog and tokens are removed.", "Delete map", async () => {
      C().maps = maps().filter(x => x !== m); const f = m.file || (String(m.src).startsWith("codexmedia://") ? decodeURIComponent(m.src.split("/").pop()) : null); if (f) await window.codex?.removeMedia(f); C().ui.map = maps()[0]?.id; save(); renderTabs(); renderSide(); load(); pushMap();
    });
  }
  $("#mClearAreas", el).onclick = () => { const m = M(); if (m) { m.areas = []; save(); render(); pushState(); } };
  function setTool(t) { st.tool = t; $$("#mTools button", el).forEach(b => b.classList.toggle("on", b.dataset.t === t)); canvas.style.cursor = t === "move" ? "grab" : "crosshair"; $("#mHint", el).innerHTML = { move: "<b>Drag</b> tokens to move them · drag empty space or <b>right-drag</b> to pan · <b>scroll</b> to zoom", reveal: "<b>Paint</b> to reveal what the players can see · <b>right-drag</b> pans", hide: "<b>Paint</b> fog back over areas · <b>right-drag</b> pans", box: "<b>Drag a box</b> to reveal a room", ruler: "<b>Drag</b> to measure · set the units in Grid", area: "<b>Drag</b> from the center or origin to place an area · players see it · <b>Clear areas</b> removes them" }[t]; render(); }
  $$("#mTools button", el).forEach(b => b.onclick = () => setTool(b.dataset.t));
  $("#mBrush", el).oninput = e => { st.brush = +e.target.value; ls.set("map.brush", st.brush); };
  $("#mAll", el).onclick = () => { if (!st.fog) return; st.fog.getContext("2d").clearRect(0, 0, st.fog.width, st.fog.height); saveFog(); render(); pushState(); };
  $("#mNone", el).onclick = () => { if (!st.fog) return; const g = st.fog.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, st.fog.width, st.fog.height); saveFog(); render(); pushState(); };
  $("#mNew", el).onclick = () => $("#mFile", el).click();
  $("#mFile", el).onchange = e => { const f = e.target.files[0]; if (f) addMap(f); e.target.value = ""; };
  $("#mStream", el).checked = ui().onStream; $("#mFollow", el).checked = ui().follow;
  $("#mStream", el).onchange = e => { ui().onStream = e.target.checked; save(); if (e.target.checked && !App.streamLive) Stage.open(); pushMap(); pushState(); toast(e.target.checked ? "Map is on the stream window" : "Map taken off stream"); };
  $("#mFollow", el).onchange = e => { ui().follow = e.target.checked; save(); pushState(); };
  const onKey = e => {
    if (el.closest("[hidden]") || document.querySelector(".modal-back") || e.target.closest("input,textarea,select")) return;
    const k = { m: "move", r: "reveal", h: "hide", b: "box", d: "ruler", a: "area" }[e.key.toLowerCase()]; if (k && !e.metaKey && !e.ctrlKey) setTool(k);
    if ((e.key === "Delete" || e.key === "Backspace") && st.sel) { const m = M(); m.tokens = m.tokens.filter(t => t.id !== st.sel); st.sel = null; save(); renderSide(); render(); pushState(); App.undoToast?.("Token removed"); }
  };
  addEventListener("keydown", onKey);
  const onCombat = () => { render(); pushState(); };
  addEventListener("codex:combat", onCombat);
  setTool("move"); renderTabs(); renderSide(); resize(); load();
  return {
    show() { resize(); render(); renderSide(); },
    refresh() { renderTabs(); renderSide(); render(); pushState(); },
    combatChanged() { render(); pushState(); },
    destroy() { removeEventListener("keydown", onKey); removeEventListener("codex:combat", onCombat); },
  };
}
