// Atmosphere on the stream window: weather and mood drawn over the table or map.
export const FX = {
  rain: { label: "Rain" }, snow: { label: "Snow" }, fog: { label: "Drifting fog" }, embers: { label: "Embers" },
  storm: { label: "Storm flashes" }, night: { label: "Night" }, blood: { label: "Blood moon" }, glitch: { label: "Neon glitch" },
};
export function createFx(canvas, tint) {
  const ctx = canvas.getContext("2d");
  let on = {}, level = .6, parts = [], raf = 0, last = 0, nextFlash = 0, flash = 0, glitch = [];
  const W = () => canvas.clientWidth, H = () => canvas.clientHeight;
  function size() { const d = devicePixelRatio || 1; canvas.width = W() * d; canvas.height = H() * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  new ResizeObserver(size).observe(canvas);
  function spawn(kind) {
    const w = W(), h = H();
    if (kind === "rain") return { k: kind, x: Math.random() * w * 1.2, y: -20 - Math.random() * h, v: 900 + Math.random() * 500, l: 14 + Math.random() * 18 };
    if (kind === "snow") return { k: kind, x: Math.random() * w, y: -10 - Math.random() * h, v: 30 + Math.random() * 50, r: 1 + Math.random() * 2.8, p: Math.random() * 6 };
    if (kind === "fog") return { k: kind, x: Math.random() * w, y: Math.random() * h, v: 8 + Math.random() * 18, r: 120 + Math.random() * 220, a: .04 + Math.random() * .06 };
    if (kind === "embers") return { k: kind, x: Math.random() * w, y: h + 10 + Math.random() * 60, v: 30 + Math.random() * 70, r: .8 + Math.random() * 2.2, p: Math.random() * 6, life: 1 };
  }
  function want(kind) { const base = { rain: 260, snow: 160, fog: 14, embers: 70 }[kind] || 0; return on[kind] ? Math.round(base * level) : 0; }
  function loop(t) {
    raf = 0; const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    const w = W(), h = H();
    ctx.clearRect(0, 0, w, h);
    for (const k of ["rain", "snow", "fog", "embers"]) {
      const have = parts.filter(p => p.k === k).length, need = want(k);
      for (let i = have; i < need; i++) parts.push(spawn(k));
      if (have > need) { let drop = have - need; parts = parts.filter(p => !(p.k === k && drop-- > 0)); }
    }
    for (const p of parts) {
      if (p.k === "rain") { p.y += p.v * dt; p.x -= p.v * .15 * dt; ctx.strokeStyle = "rgba(190,210,235,.35)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.l * .15, p.y - p.l); ctx.stroke(); if (p.y > h + 20) Object.assign(p, spawn("rain"), { y: -20 }); }
      if (p.k === "snow") { p.y += p.v * dt; p.p += dt; p.x += Math.sin(p.p) * 20 * dt; ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); if (p.y > h + 10) Object.assign(p, spawn("snow"), { y: -10 }); }
      if (p.k === "fog") { p.x += p.v * dt; const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(200,200,210,${p.a})`); g.addColorStop(1, "rgba(200,200,210,0)"); ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); if (p.x - p.r > w) Object.assign(p, spawn("fog"), { x: -p.r }); }
      if (p.k === "embers") { p.y -= p.v * dt; p.p += dt * 2; p.x += Math.sin(p.p) * 25 * dt; const a = Math.max(0, Math.min(1, p.y / h)); ctx.fillStyle = `rgba(255,${120 + Math.random() * 60 | 0},40,${a * .9})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); if (p.y < -10) Object.assign(p, spawn("embers")); }
    }
    if (on.storm) {
      if (t > nextFlash) { flash = 1; nextFlash = t + 4000 + Math.random() * 9000 / level; }
    }
    if (flash > 0) { ctx.fillStyle = `rgba(230,235,255,${flash * .55})`; ctx.fillRect(0, 0, w, h); flash = Math.max(0, flash - dt * (flash > .5 ? 3 : 1.6)); if (Math.random() < .04 && flash < .4) flash = .8; }
    if (on.glitch) {
      if (Math.random() < .05 * level) glitch = Array.from({ length: 2 + Math.random() * 5 | 0 }, () => ({ y: Math.random() * h, hh: 2 + Math.random() * 18, dx: (Math.random() - .5) * 40, c: Math.random() < .5 ? "rgba(255,46,136,.35)" : "rgba(60,242,255,.3)", life: .08 + Math.random() * .12 }));
      for (const g of glitch) { ctx.fillStyle = g.c; ctx.fillRect(g.dx, g.y, w, g.hh); g.life -= dt; }
      glitch = glitch.filter(g => g.life > 0);
      ctx.fillStyle = "rgba(0,0,0,.08)"; for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    }
    if (parts.length || on.storm || on.glitch || flash > 0) raf = requestAnimationFrame(loop);
  }
  function set(state) {
    on = state.on || {}; level = state.level ?? .6;
    tint.className = "fx-tint" + (on.night ? " night" : "") + (on.blood ? " blood" : "");
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  return { set, strike() { flash = 1; if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } } };
}
