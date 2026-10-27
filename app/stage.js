// Stream window: only the dice table, built to be screen-shared.
import { $, $$, uid, ls } from "./util.js";
import { parseRoll, diceGroups, buildResult, markFor } from "./roll.js";
import { DiceTray, THEMES, FELTS, setDiceSound } from "./dice3d.js";
import { dieIcon, createOverlay } from "./diceui.js";
import { Stage } from "./bridge.js";
import { createSoundEngine } from "./sound.js";
import { drawMap, loadImg, loadFresh, fitView, makeFogTexture } from "./maprender.js";

(async function () {
  const applyLook = l => { if (!l || l === "lantern") delete document.documentElement.dataset.look; else document.documentElement.dataset.look = l; };
  applyLook(ls.get("look", "lantern"));
  try { await document.fonts.load(`700 40px ${getComputedStyle(document.documentElement).getPropertyValue("--display")}`); } catch {}
  const host = $("#tray");
  const tray = new DiceTray(host, { theme: ls.get("dice.theme", "ember"), felt: ls.get("dice.felt", "oxblood") });
  const ov = createOverlay(host);
  setDiceSound(ls.get("dice.sound", true));
  const hist = $("#hist");
  let busy = Promise.resolve();

  function addHist(r) {
    const li = document.createElement("li"); li.className = r.crit ? "crit" : r.fumble ? "fumble" : "";
    li.innerHTML = `<span></span><b></b>`; li.firstChild.textContent = r.label || r.expr; li.lastChild.textContent = r.total;
    hist.prepend(li); while (hist.children.length > 7) hist.lastChild.remove();
  }
  function roll(req) {
    busy = busy.then(async () => {
      let terms; try { terms = parseRoll(req.expr); } catch { return; }
      ov.hide();
      const values = await tray.roll(diceGroups(terms));
      const r = buildResult(req, terms, values);
      tray.mark(tray.physicalIndex().map(([gi, ri]) => markFor(r, gi, ri)));
      ov.show(r); addHist(r); Stage.sendResult(r);
    });
  }
  Stage.onRoll(roll);
  const sound = createSoundEngine();
  Stage.onSound(cmd => sound.run(cmd));
  // handouts: shown big over the table, players see them through the screen share
  const ho = $("#handout");
  Stage.onShow(hd => {
    ho.innerHTML = ""; ho.className = "handout";
    const card = document.createElement("div");
    if (hd.type === "image") {
      card.className = "ho-img"; const img = new Image(); img.src = hd.src; card.append(img);
      if (hd.title) { const t = document.createElement("div"); t.className = "ho-cap"; t.textContent = hd.title; card.append(t); }
    } else {
      card.className = "ho-txt s-" + (hd.style || "letter");
      if (hd.title) { const t = document.createElement("h2"); t.textContent = hd.title; card.append(t); }
      const b = document.createElement("div"); b.className = "ho-body"; b.textContent = hd.text || ""; card.append(b);
    }
    ho.append(card); ho.hidden = false; void ho.offsetWidth; ho.classList.add("in");
  });
  // overlays: the combat turn order (and later the map and scenes)
  const strip = $("#strip");
  // battle map: drawn over the dice table while it's on stream; roll results still show on top
  const mapc = $("#mapc"), mctx = mapc.getContext("2d"), fogTex = makeFogTexture();
  const MS = { map: null, img: null, fog: null, tokens: [], follow: null, current: null };
  let mraf = 0;
  const mrender = () => { if (!mraf) mraf = requestAnimationFrame(mdraw); };
  function mdraw() {
    mraf = 0; if (!MS.map) return;
    const dpr = devicePixelRatio || 1, W = mapc.clientWidth, H = mapc.clientHeight;
    if (mapc.width !== Math.round(W * dpr)) { mapc.width = W * dpr; mapc.height = H * dpr; }
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let view = fitView(MS.map, W, H, 10);
    if (MS.follow) { const z = W / MS.follow.span; view = { z, x: W / 2 - MS.follow.cx * z, y: H / 2 - MS.follow.cy * z }; }
    drawMap(mctx, W, H, { map: { ...MS.map, tokens: MS.tokens }, img: MS.img, fog: MS.fog, view, gm: false, current: MS.current, fogTex });
  }
  new ResizeObserver(mrender).observe(mapc);
  Stage.onOverlay(async o => {
    if (o.kind === "map") {
      document.body.classList.toggle("has-map", !!o.show); mapc.hidden = !o.show;
      if (!o.show) { MS.map = null; return; }
      if (!MS.map || MS.map.id !== o.id || MS.src !== o.src) { MS.img = await loadImg(o.src); MS.src = o.src; MS.fog = null; }
      MS.map = { id: o.id, w: o.w, h: o.h, grid: o.grid, fogOn: o.fogOn };
      mrender(); return;
    }
    if (o.kind === "mapstate") {
      if (MS.map && o.id !== MS.map.id) return;
      MS.follow = o.follow; MS.current = o.current;
      MS.tokens = await Promise.all((o.tokens || []).map(async t => ({ ...t, _img: t.img ? await loadImg(t.img) : null })));
      if (o.fog) { const fi = await loadFresh(o.fog); MS.fog = fi; }
      mrender(); return;
    }
    if (o.kind === "party") {
      const pb = $("#partybar"); pb.hidden = !o.show; if (!o.show) return;
      pb.innerHTML = o.list.map(() => `<div class="pb-c"><i class="pb-p"></i><div class="pb-t"><b></b><div class="pb-bar"><i></i></div><span class="pb-k"></span></div></div>`).join("");
      $$(".pb-c", pb).forEach((el, i) => {
        const m = o.list[i], pct = m.max ? Math.max(0, Math.min(100, m.hp / m.max * 100)) : 100;
        el.style.setProperty("--mc", m.color); el.querySelector("b").textContent = m.name;
        el.querySelector(".pb-bar i").style.width = pct + "%"; el.querySelector(".pb-bar i").style.background = pct <= 25 ? "var(--bad)" : pct <= 50 ? "var(--crit)" : "var(--mc)";
        el.querySelector(".pb-k").textContent = [m.max ? `${m.hp}/${m.max}` : "", ...m.conds].filter(Boolean).join(" · ");
        const p = el.querySelector(".pb-p"); if (m.portrait) p.style.backgroundImage = `url(${m.portrait})`; else p.textContent = (m.name || "?")[0];
        el.classList.toggle("down", m.max > 0 && m.hp <= 0);
      });
      return;
    }
    if (o.kind !== "combat") return;
    document.body.classList.toggle("has-strip", !!o.show);
    if (!o.show) { strip.hidden = true; strip.innerHTML = ""; return; }
    strip.hidden = false;
    const cur = o.list.findIndex(x => x.current);
    strip.innerHTML = `<div class="st-round"><span>Round</span><b>${o.round}</b></div><div class="st-list">${o.list.map((x, i) => {
      const pct = x.max ? Math.max(0, Math.min(100, x.hp / x.max * 100)) : null;
      return `<div class="st-c ${x.current ? "cur" : ""} ${x.status === "Down" ? "down" : ""} ${i < cur ? "done" : ""}" style="--kc:${x.color}">
        <b></b>${pct != null ? `<div class="st-hp"><i style="width:${pct}%"></i></div>` : `<span class="st-s">${x.status}</span>`}${x.conds.length ? `<span class="st-k"></span>` : ""}</div>`; }).join("")}</div>`;
    // names and conditions are set as text so nothing a GM types can break the page
    $$(".st-c", strip).forEach((el, i) => { el.querySelector("b").textContent = o.list[i].name; const k = el.querySelector(".st-k"); if (k) k.textContent = o.list[i].conds.join(" · "); });
    strip.querySelector(".cur")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
  Stage.onHide(() => { ho.classList.remove("in"); ho.classList.add("out"); setTimeout(() => { ho.hidden = true; ho.innerHTML = ""; }, 450); });
  Stage.onClear(() => { tray.clear(); ov.hide(); });
  Stage.onClose(() => window.close());
  Stage.hello();

  const q = $("#quick");
  q.innerHTML = [4, 6, 8, 10, 12, 20, 100].map(s => `<button class="dpick" data-s="${s}" title="Roll a d${s}">${dieIcon(s)}d${s}</button>`).join("");
  $$("[data-s]", q).forEach(b => b.onclick = () => roll({ id: uid(), expr: "1d" + b.dataset.s, label: "", rules: ls.get("rules", null) }));
  const th = $("#theme"), fe = $("#felt");
  th.innerHTML = Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join(""); th.value = ls.get("dice.theme", "ember");
  fe.innerHTML = Object.entries(FELTS).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join(""); fe.value = ls.get("dice.felt", "oxblood");
  th.onchange = () => { ls.set("dice.theme", th.value); tray.setTheme(th.value); };
  fe.onchange = () => { ls.set("dice.felt", fe.value); tray.setFelt(fe.value); };
  // the desk and this window share settings through localStorage
  addEventListener("storage", e => {
    if (e.key === "codex:dice.theme") { const v = JSON.parse(e.newValue); th.value = v; tray.setTheme(v); }
    if (e.key === "codex:dice.felt") { const v = JSON.parse(e.newValue); fe.value = v; tray.setFelt(v); }
    if (e.key === "codex:dice.sound") setDiceSound(JSON.parse(e.newValue));
    if (e.key === "codex:look") applyLook(JSON.parse(e.newValue));
  });
  const toggleClean = () => document.body.classList.toggle("clean");
  const full = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});
  $("#clean").onclick = toggleClean; $("#full").onclick = full;
  addEventListener("keydown", e => {
    if (e.target.closest("select")) return;
    if (e.key === "h" || e.key === "H") toggleClean();
    if (e.key === "f" || e.key === "F") full();
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); roll({ id: uid(), expr: "1d20", label: "", rules: ls.get("rules", null) }); }
  });
  // the control bar fades out when the mouse rests, so viewers see a clean table
  const bar = $("#bar"), hint = $("#hint"); let idle;
  const wake = () => { bar.classList.remove("away"); hint.style.opacity = 1; clearTimeout(idle); idle = setTimeout(() => { bar.classList.add("away"); hint.style.opacity = 0; }, 2500); };
  addEventListener("mousemove", wake); wake();
})();
