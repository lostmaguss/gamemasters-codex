// Draws a battle map (image, grid, tokens, fog) onto a canvas. Used by the GM's map view and the stream window.
const imgCache = new Map();
export function loadImg(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  imgCache.set(src, p); return p;
}
export function loadFresh(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
export function mapSrc(m) { return m.file ? `codexmedia://media/${encodeURIComponent(m.file)}` : m.src; }

// view: { x, y, z } = screen offset and zoom; gm: draw fog see-through and hidden tokens
export function drawMap(ctx, W, H, { map, img, fog, view, gm, current, fogTex }) {
  ctx.save();
  ctx.fillStyle = "#0c0a0b"; ctx.fillRect(0, 0, W, H);
  if (!map || !img) { ctx.restore(); return; }
  ctx.translate(view.x, view.y); ctx.scale(view.z, view.z);
  ctx.drawImage(img, 0, 0, map.w, map.h);
  const g = map.grid || {};
  if (g.show && g.size > 4) {
    ctx.strokeStyle = g.color || "rgba(0,0,0,.35)"; ctx.lineWidth = 1 / view.z;
    ctx.beginPath();
    for (let x = (g.ox || 0) % g.size; x <= map.w; x += g.size) { ctx.moveTo(x, 0); ctx.lineTo(x, map.h); }
    for (let y = (g.oy || 0) % g.size; y <= map.h; y += g.size) { ctx.moveTo(0, y); ctx.lineTo(map.w, y); }
    ctx.stroke();
  }
  const cell = g.size || 70;
  // area templates (circles, cones, lines) sit under the tokens
  for (const a of map.areas || []) drawArea(ctx, a, view);
  for (const t of map.tokens || []) {
    if (t.hidden && !gm) continue;
    const r = (t.size || 1) * cell * .44;
    ctx.save(); ctx.globalAlpha = t.hidden ? .45 : 1;
    if (t.id === current || (t.ref && t.ref === current)) { ctx.beginPath(); ctx.arc(t.x, t.y, r + cell * .12, 0, 7); ctx.fillStyle = "rgba(255,122,61,.35)"; ctx.fill(); ctx.lineWidth = 3 / view.z; ctx.strokeStyle = "#ff7a3d"; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, 7); ctx.fillStyle = t.color || "#f39da8"; ctx.fill();
    ctx.lineWidth = Math.max(2, cell * .06); ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.stroke();
    if (t._img) { ctx.save(); ctx.beginPath(); ctx.arc(t.x, t.y, r * .86, 0, 7); ctx.clip(); const s = r * 1.72; ctx.drawImage(t._img, t.x - s / 2, t.y - s / 2, s, s); ctx.restore(); }
    else {
      ctx.fillStyle = "#1a1517"; ctx.font = `700 ${Math.round(r * .9)}px "IBM Plex Sans Condensed", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((t.name || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase(), t.x, t.y + 1);
    }
    if (t.down) { ctx.strokeStyle = "#ff3b3b"; ctx.lineWidth = r * .18; ctx.beginPath(); ctx.moveTo(t.x - r * .6, t.y - r * .6); ctx.lineTo(t.x + r * .6, t.y + r * .6); ctx.moveTo(t.x + r * .6, t.y - r * .6); ctx.lineTo(t.x - r * .6, t.y + r * .6); ctx.stroke(); }
    if (view.z * r > 14) {
      ctx.font = `600 ${Math.max(11 / view.z, r * .32)}px "IBM Plex Sans Condensed", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const label = t.name || ""; const tw = ctx.measureText(label).width + 10 / view.z;
      ctx.fillStyle = "rgba(20,15,17,.8)"; ctx.fillRect(t.x - tw / 2, t.y + r + 3 / view.z, tw, r * .32 + 6 / view.z);
      ctx.fillStyle = "#f3ebe1"; ctx.fillText(label, t.x, t.y + r + 5 / view.z);
    }
    ctx.restore();
  }
  if (fog && map.fogOn !== false) {
    ctx.save();
    ctx.globalAlpha = gm ? .55 : 1;
    if (!gm) {
      // players see soft-edged fog in the table's darkest tone, not a hard black box
      const off = document.createElement("canvas"); off.width = fog.width; off.height = fog.height;
      const o = off.getContext("2d"); o.filter = "blur(2px)"; o.drawImage(fog, 0, 0); o.filter = "none";
      o.globalCompositeOperation = "source-in"; o.fillStyle = "#100c0e"; o.fillRect(0, 0, off.width, off.height);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, map.w, map.h);
    } else ctx.drawImage(fog, 0, 0, map.w, map.h);
    ctx.restore();
  }
  ctx.restore();
}
export function drawArea(ctx, a, view, live) {
  ctx.save();
  const col = a.color || "#ff7a3d";
  ctx.fillStyle = col + (live ? "40" : "33"); ctx.strokeStyle = col; ctx.lineWidth = 2.5 / view.z;
  const dx = a.x2 - a.x1, dy = a.y2 - a.y1, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  ctx.beginPath();
  if (a.shape === "circle") ctx.arc(a.x1, a.y1, len, 0, 7);
  else if (a.shape === "cone") { ctx.moveTo(a.x1, a.y1); ctx.arc(a.x1, a.y1, len, ang - Math.PI / 6, ang + Math.PI / 6); ctx.closePath(); }
  else if (a.shape === "line") { const w = (a.w || 1) * .5 * (a.cell || 70), nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w; ctx.moveTo(a.x1 + nx, a.y1 + ny); ctx.lineTo(a.x2 + nx, a.y2 + ny); ctx.lineTo(a.x2 - nx, a.y2 - ny); ctx.lineTo(a.x1 - nx, a.y1 - ny); ctx.closePath(); }
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
export function drawRuler(ctx, p1, p2, view, label) {
  ctx.save();
  const a = { x: view.x + p1.x * view.z, y: view.y + p1.y * view.z }, b = { x: view.x + p2.x * view.z, y: view.y + p2.y * view.z };
  ctx.strokeStyle = "#ffcf5a"; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#ffcf5a"; [a, b].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill(); });
  ctx.font = '700 16px "JetBrains Mono", monospace'; const tw = ctx.measureText(label).width + 16;
  ctx.fillStyle = "rgba(20,15,17,.9)"; ctx.fillRect(b.x + 12, b.y - 14, tw, 28);
  ctx.fillStyle = "#ffcf5a"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillText(label, b.x + 20, b.y);
  ctx.restore();
}
export function fitView(map, W, H, pad = 20) {
  if (!map) return { x: 0, y: 0, z: 1 };
  const z = Math.min((W - pad * 2) / map.w, (H - pad * 2) / map.h);
  return { x: (W - map.w * z) / 2, y: (H - map.h * z) / 2, z };
}
export function makeFogTexture() {
  const S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
  g.fillStyle = "#0d0b0c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const r = 4 + Math.random() * 26; g.fillStyle = `rgba(${40 + Math.random() * 30},${30 + Math.random() * 20},${34 + Math.random() * 20},${Math.random() * .12})`; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, r, 0, 7); g.fill(); }
  return cv;
}
