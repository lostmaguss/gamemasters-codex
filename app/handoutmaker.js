// Handout maker: fill in a template (letter, wanted poster, newspaper, decree, data pad, chat log) and it's
// drawn as a picture handout you can show on stream, send to phones or post to Discord.
import { $, $$, esc, h, icon, toast, uid, storeImage } from "./util.js";
import { C, save } from "./store.js";
import { shrinkImage } from "./board.js";

const FONT = { black: '"Grenze Gotisch", serif', hand: '"IM Fell English", Georgia, serif', sans: '"IBM Plex Sans Condensed", sans-serif', mono: '"JetBrains Mono", monospace', tech: '"Oxanium", sans-serif', cyber: '"Chakra Petch", sans-serif' };
// the same text always gives the same stains and grain
function rng(seed) { let a = 0; for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) | 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function wrap(g, text, maxW) {
  const out = [];
  for (const para of String(text || "").split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const w of para.split(/\s+/)) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
function text(g, str, x, y, maxW, lh, { align = "left", max = 999 } = {}) {
  g.textAlign = align; const lines = wrap(g, str, maxW).slice(0, max);
  lines.forEach((l, i) => g.fillText(l, x, y + i * lh)); return y + lines.length * lh;
}
function paper(g, W, H, base, edge, seed, stains = true) {
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < .5 ? "80,50,20" : "255,250,235"},${r() * .05})`; g.fillRect(r() * W, r() * H, 2, 2); }
  if (stains) for (let i = 0; i < 5; i++) { const x = r() * W, y = r() * H, s = 60 + r() * 200, gr = g.createRadialGradient(x, y, s * .2, x, y, s); gr.addColorStop(0, "rgba(120,80,30,.08)"); gr.addColorStop(.8, "rgba(120,80,30,.04)"); gr.addColorStop(1, "rgba(120,80,30,0)"); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); }
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, edge); g.fillStyle = v; g.fillRect(0, 0, W, H);
}
function seal(g, x, y, R, color, letter) {
  g.save(); const r = rng(letter + color);
  g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, k = R * (1 + (r() - .5) * .12); g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); } g.closePath();
  g.fillStyle = color; g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 12; g.shadowOffsetY = 4; g.fill(); g.shadowColor = "transparent";
  g.beginPath(); g.arc(x, y, R * .66, 0, 7); g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = R * .07; g.stroke();
  g.fillStyle = "rgba(0,0,0,.32)"; g.font = `700 ${R * .8}px ${FONT.black}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText((letter || "?").slice(0, 1).toUpperCase(), x, y + R * .04);
  g.restore(); g.textBaseline = "alphabetic";
}
function photo(g, img, x, y, w, hh, { sepia = true } = {}) {
  g.save(); g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(x, y, w, hh);
  if (img) { const s = Math.max(w / img.width, hh / img.height), iw = img.width * s, ih = img.height * s; g.beginPath(); g.rect(x, y, w, hh); g.clip(); if (sepia) g.filter = "sepia(.7) contrast(1.05)"; g.drawImage(img, x + (w - iw) / 2, y + (hh - ih) / 2, iw, ih); g.filter = "none"; }
  g.restore(); g.strokeStyle = "rgba(40,25,10,.6)"; g.lineWidth = 4; g.strokeRect(x, y, w, hh);
}

export const TEMPLATES = [
  { id: "letter", name: "Letter", desc: "Handwritten, sealed in wax", w: 1200, h: 1600,
    fields: [["to", "To", "text", "My dear Aldric,"], ["body", "Letter", "area", "They know about the maps. Burn this once you've read it, and come to the shrine before the bell, or don't come at all."], ["from", "Signed", "text", "Y."], ["seal", "Wax colour", "color", "#8e1b1b"]],
    draw(g, v) {
      paper(g, 1200, 1600, "#e9dbbd", "rgba(90,55,20,.45)", v.body);
      g.fillStyle = "#2c1d12"; g.font = `64px ${FONT.hand}`; g.textBaseline = "alphabetic";
      let y = text(g, v.to, 120, 250, 960, 76);
      g.font = `58px ${FONT.hand}`; y = text(g, v.body, 120, y + 60, 960, 86, { max: 12 });
      g.font = `italic 68px ${FONT.hand}`; g.textAlign = "right"; g.fillText(v.from, 1080, Math.min(1360, y + 100)); g.textAlign = "left";
      if (v.seal) seal(g, 600, 1470, 82, v.seal, v.from || "Y");
    } },
  { id: "wanted", name: "Wanted poster", desc: "Portrait, crime and reward", w: 1200, h: 1700,
    fields: [["head", "Heading", "text", "WANTED"], ["sub", "Under it", "text", "Dead or alive"], ["img", "Portrait", "image", ""], ["name", "Name", "text", "Ysolde the Bell-Ringer"], ["crime", "For", "area", "Sedition, arson at the Millford granary, and ringing the drowned bell"], ["reward", "Reward", "text", "500 Crown silver"]],
    draw(g, v, img) {
      paper(g, 1200, 1700, "#dcc597", "rgba(70,40,10,.55)", v.name);
      g.fillStyle = "#2a170b"; g.textAlign = "center"; g.font = `900 230px ${FONT.black}`; g.fillText(v.head || "WANTED", 600, 270);
      g.font = `700 64px ${FONT.black}`; g.fillText(v.sub, 600, 360);
      photo(g, img, 250, 420, 700, 640);
      g.font = `900 88px ${FONT.black}`; text(g, v.name, 600, 1180, 1040, 90, { align: "center", max: 2 });
      g.font = `44px ${FONT.hand}`; const y = text(g, v.crime, 600, 1310, 980, 56, { align: "center", max: 4 });
      g.font = `700 54px ${FONT.black}`; g.fillText("Reward", 600, Math.min(1560, y + 80)); g.font = `900 92px ${FONT.black}`; g.fillText(v.reward, 600, Math.min(1650, y + 170));
      g.textAlign = "left";
    } },
  { id: "news", name: "Newspaper", desc: "Masthead, headline, two columns", w: 1400, h: 1800,
    fields: [["paper", "Paper's name", "text", "The Millford Crier"], ["date", "Date and price", "text", "2nd of Ashfall · One copper"], ["headline", "Headline", "text", "Bell Rings at Midnight, Dogs Fall Silent"], ["sub", "Under the headline", "text", "Magistrate Hale silent as townsfolk demand answers"], ["img", "Picture (optional)", "image", ""], ["body", "Story", "area", "The drowned shrine's bell, silent for forty years, rang out over Millford shortly after midnight. Witnesses report every dog in the town howled at once, then stopped.\n\nThe Crown garrison has closed the river road. A reward is said to be offered for information about a woman seen near the shrine."]],
    draw(g, v, img) {
      paper(g, 1400, 1800, "#efe8d8", "rgba(60,50,30,.3)", v.headline, false);
      g.fillStyle = "#151210"; g.textAlign = "center"; g.font = `900 150px ${FONT.black}`; g.fillText(v.paper, 700, 190);
      g.fillRect(80, 225, 1240, 5); g.font = `600 32px ${FONT.sans}`; g.fillText(v.date, 700, 270); g.fillRect(80, 292, 1240, 2);
      g.font = `900 104px ${FONT.black}`; let y = text(g, v.headline, 700, 410, 1240, 104, { align: "center", max: 2 });
      g.font = `italic 44px ${FONT.hand}`; y = text(g, v.sub, 700, y + 10, 1200, 52, { align: "center", max: 2 }) + 20;
      if (img) { photo(g, img, 80, y, 1240, 560); y += 600; }
      g.font = `42px ${FONT.hand}`; g.textAlign = "left";
      const lines = wrap(g, v.body, 590), per = Math.floor((1740 - y) / 56), col1 = lines.slice(0, per), col2 = lines.slice(per, per * 2);
      col1.forEach((l, i) => g.fillText(l, 80, y + 40 + i * 56)); col2.forEach((l, i) => g.fillText(l, 730, y + 40 + i * 56));
      g.fillRect(699, y, 2, Math.min(per, Math.max(col1.length, col2.length, 1)) * 56 + 12);
    } },
  { id: "decree", name: "Royal decree", desc: "Formal proclamation", w: 1200, h: 1600,
    fields: [["head", "Heading", "text", "By Order of the Crown"], ["body", "Decree", "area", "Be it known that the river road is closed to all travellers until the bell is silenced. Any person found at the drowned shrine after dark shall be held for questioning."], ["by", "Issued by", "text", "Magistrate Corwin Hale"], ["seal", "Seal colour", "color", "#1f3f8e"]],
    draw(g, v) {
      paper(g, 1200, 1600, "#ece0c4", "rgba(80,55,25,.4)", v.body);
      g.strokeStyle = "#6b4a1e"; g.lineWidth = 6; g.strokeRect(60, 60, 1080, 1480); g.lineWidth = 2; g.strokeRect(80, 80, 1040, 1440);
      g.fillStyle = "#2a1a0c"; g.textAlign = "center"; g.font = `900 96px ${FONT.black}`; let y = text(g, v.head, 600, 260, 960, 100, { align: "center", max: 2 });
      g.font = `48px ${FONT.hand}`; y = text(g, v.body, 600, y + 70, 900, 70, { align: "center", max: 12 });
      g.font = `italic 50px ${FONT.hand}`; g.fillText(v.by, 600, Math.min(1300, y + 80));
      if (v.seal) seal(g, 600, 1410, 78, v.seal, v.by || "C"); g.textAlign = "left";
    } },
  { id: "datapad", name: "Data pad", desc: "Sci-fi message on a screen", w: 1600, h: 1000,
    fields: [["from", "From", "text", "ORBITAL STATION KESTREL · COMMS"], ["subject", "Subject", "text", "Distress beacon, 200 years old"], ["body", "Message", "area", "Signal source confirmed: colony ship Meridian, last logged 2187. Life support reads active. Crew manifest lists 412 souls in cryo.\n\nDo not dock. Repeat: do not dock."], ["accent", "Screen colour", "color", "#39d0c0"]],
    draw(g, v) {
      const a = v.accent || "#39d0c0";
      g.fillStyle = "#070d12"; g.fillRect(0, 0, 1600, 1000);
      const gl = g.createRadialGradient(800, 500, 100, 800, 500, 900); gl.addColorStop(0, a + "22"); gl.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gl; g.fillRect(0, 0, 1600, 1000);
      g.strokeStyle = a; g.lineWidth = 3; g.strokeRect(50, 50, 1500, 900);
      g.fillStyle = a; g.fillRect(50, 50, 1500, 90); g.fillStyle = "#070d12"; g.font = `700 40px ${FONT.tech}`; g.fillText(v.from, 90, 108);
      g.fillStyle = a; g.font = `700 54px ${FONT.tech}`; text(g, v.subject, 90, 230, 1420, 60, { max: 2 });
      g.font = `36px ${FONT.mono}`; g.fillStyle = "#cfeeea"; text(g, v.body, 90, 340, 1420, 54, { max: 10 });
      for (let y = 0; y < 1000; y += 4) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, y, 1600, 2); }
      g.fillStyle = a; g.font = `24px ${FONT.mono}`; g.fillText("■ END OF TRANSMISSION", 90, 910);
    } },
  { id: "chat", name: "Chat log", desc: "Cyberpunk messages, one per line", w: 1200, h: 1600,
    fields: [["title", "Thread", "text", "FIXER · encrypted"], ["lines", "Messages (Name: text, one per line; 'me' is the right side)", "area", "Rogue: job's off. corp knows.\nme: knows what?\nRogue: everything. ditch the car\nRogue: and the implant. they can track it\nme: on my way"], ["accent", "Colour", "color", "#ff2e88"]],
    draw(g, v) {
      const a = v.accent || "#ff2e88";
      g.fillStyle = "#0d0b12"; g.fillRect(0, 0, 1200, 1600);
      g.fillStyle = "#1b1624"; g.fillRect(0, 0, 1200, 150); g.fillStyle = a; g.font = `700 52px ${FONT.cyber}`; g.textAlign = "center"; g.fillText(v.title, 600, 95); g.textAlign = "left";
      let y = 220;
      for (const raw of String(v.lines || "").split("\n").filter(x => x.trim()).slice(0, 12)) {
        const m = raw.match(/^([^:]{1,24}):\s*(.*)$/), who = m ? m[1].trim() : "", msg = m ? m[2] : raw, me = /^me$/i.test(who);
        g.font = `48px ${FONT.sans}`; const L = wrap(g, msg, 720).slice(0, 4), bw = Math.min(820, Math.max(...L.map(l => g.measureText(l).width)) + 64), bh = L.length * 60 + 44, x = me ? 1140 - bw : 60;
        if (!me && who) { g.fillStyle = a; g.font = `700 30px ${FONT.cyber}`; g.fillText(who.toUpperCase(), 70, y - 12); }
        g.fillStyle = me ? a : "#241d31"; g.beginPath(); g.roundRect(x, y, bw, bh, 18); g.fill();
        g.fillStyle = me ? "#14000a" : "#ece8f5"; g.font = `48px ${FONT.sans}`; L.forEach((l, i) => g.fillText(l, x + 32, y + 66 + i * 60));
        y += bh + (me ? 34 : 64); if (y > 1500) break;
      }
    } },
];

export async function renderHandout(tpl, v, img) {
  await Promise.all(Object.values(FONT).flatMap(f => ["400", "700", "italic 400"].map(w => document.fonts.load(`${w} 48px ${f}`).catch(() => {}))));
  const cv = document.createElement("canvas"); cv.width = tpl.w; cv.height = tpl.h;
  const g = cv.getContext("2d"); g.textBaseline = "alphabetic"; tpl.draw(g, v, img); return cv;
}
const loadImage = src => new Promise(r => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });

export function handoutMaker(App, { onDone, start = "letter" } = {}) {
  const st = { tpl: TEMPLATES.find(t => t.id === start) || TEMPLATES[0], v: {}, img: null };
  const reset = () => { st.v = Object.fromEntries(st.tpl.fields.map(f => [f[0], f[3]])); st.img = null; };
  reset();
  App.modal(`<div class="hm"><aside class="hm-tpl">${TEMPLATES.map(t => `<button data-t="${t.id}"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join("")}</aside>
    <div class="hm-form" id="hmForm"></div><div class="hm-prev"><canvas id="hmCv"></canvas></div></div>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn" id="hmShow">${icon("stream")} Save and show</button><button class="btn primary" data-ok>${icon("plus")} Save handout</button></div>`, (m, close) => {
    m.classList.add("wide-hm");
    let pending = 0;
    const preview = async () => {
      const n = ++pending; const cv = await renderHandout(st.tpl, st.v, st.img); if (n !== pending) return;
      const out = $("#hmCv", m), s = Math.min(1, 420 / cv.width, 560 / cv.height); out.width = cv.width * s; out.height = cv.height * s; out.getContext("2d").drawImage(cv, 0, 0, out.width, out.height);
    };
    const form = () => {
      $$("[data-t]", m).forEach(b => b.classList.toggle("on", b.dataset.t === st.tpl.id));
      $("#hmForm", m).innerHTML = `<h2>${esc(st.tpl.name)}</h2>` + st.tpl.fields.map(([k, label, type]) => type === "area" ? `<label class="f"><span>${esc(label)}</span><textarea data-k="${k}" rows="6">${esc(st.v[k])}</textarea></label>`
        : type === "color" ? `<label class="f"><span>${esc(label)}</span><input type="color" data-k="${k}" value="${esc(st.v[k])}"></label>`
        : type === "image" ? `<label class="f"><span>${esc(label)}</span><div class="row" style="gap:6px"><button class="btn sm" data-img>${icon("image")} ${st.img ? "Change picture" : "Pick a picture"}</button>${st.img ? `<button class="btn sm ghost" data-noimg>${icon("x")}</button>` : ""}</div></label>`
        : `<label class="f"><span>${esc(label)}</span><input type="text" data-k="${k}" value="${esc(st.v[k])}"></label>`).join("");
      $$("[data-k]", m).forEach(i => i.oninput = () => { st.v[i.dataset.k] = i.value; preview(); });
      $("[data-img]", m)?.addEventListener("click", () => { const f = h(`<input type="file" accept="image/*">`); f.onchange = async () => { if (!f.files[0]) return; st.imgSrc = await shrinkImage(f.files[0], 1200); st.img = await loadImage(st.imgSrc); form(); preview(); }; f.click(); });
      $("[data-noimg]", m)?.addEventListener("click", () => { st.img = null; st.imgSrc = null; form(); preview(); });
    };
    $$("[data-t]", m).forEach(b => b.onclick = () => { st.tpl = TEMPLATES.find(t => t.id === b.dataset.t); reset(); form(); preview(); });
    $("[data-x]", m).onclick = close;
    const finish = async show => {
      const cv = await renderHandout(st.tpl, st.v, st.img);
      const src = await storeImage(cv.toDataURL("image/jpeg", .9));
      const title = st.v.headline || st.v.name || st.v.subject || st.v.head || st.v.title || st.tpl.name;
      const hd = { id: uid(), title: `${st.tpl.name}: ${String(title).slice(0, 60)}`, type: "image", src, made: { tpl: st.tpl.id, v: st.v } };
      C().handouts.push(hd); save(); close(); onDone?.(hd); toast("Handout saved");
      if (show) App.showHandout(hd);
    };
    $("[data-ok]", m).onclick = () => finish(false);
    $("#hmShow", m).onclick = () => finish(true);
    form(); preview();
  });
}
