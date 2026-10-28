// Players' phones: what each player sees on the table link, and what they can do from it
// (roll their stats onto your table, vote, tap their HP, read whispers). Runs over the table server.
import { $, $$, esc, icon, toast, uid, debounce, copyText } from "./util.js";
import { C, S, save, onSaved } from "./store.js";
import { parseRoll, breakdown, critLabel, shownTotal } from "./roll.js";
import { sheetLayout } from "./party.js";
import { stashSummary } from "./stash.js";
import { pollCounts } from "./poll.js";

const T = () => window.codex?.table;
let App = null, status = { on: false }, online = [];
const subs = new Set();
const prefs = () => (S.data.prefs.table ||= { key: null, port: 7420, hp: true });
const LOOK_OF = { fantasy: "lantern", scifi: "void", cyberpunk: "neon" };

function state() {
  const c = C(), L = sheetLayout(c), p = c.ui.poll, cb = c.combat;
  return {
    campaign: c.name, look: !c.look || c.look === "auto" ? LOOK_OF[c.genre || "fantasy"] : c.look, hpEdit: prefs().hp !== false,
    party: c.party.map(m => ({
      id: m.id, name: m.character || m.player || "?", player: m.player || "", role: m.role || "", color: m.color, portrait: m.portrait || null,
      res: L.resources.map(n => ({ name: n, cur: m.res?.[n]?.cur ?? "", max: m.res?.[n]?.max ?? "" })),
      stats: L.stats.map(n => ({ name: n, value: m.stats?.[n] ?? "" })), conds: m.conds || [],
      text: L.fields.map(f => ({ name: f, body: m.text?.[f] || "" })).filter(x => x.body),
    })),
    poll: p ? { id: p.id, q: p.q, opts: pollCounts(p).map(o => ({ text: o.text, n: o.n })), open: p.open, mine: Object.fromEntries(Object.entries(p.phone || {}).map(([k, v]) => [k, v.idx])) } : null,
    turn: cb?.active && cb.showOnStream ? { round: cb.round, list: cb.list.filter(x => !x.hidden).map((x, i) => ({ name: x.name, color: x.color, current: i === cb.turn, pc: x.kind === "pc" || !!x.ref })) } : null,
    stash: c.stash ? stashSummary(c) : null,
  };
}
const push = debounce(() => { if (status.on) T()?.players(state()); }, 250);
export const playersOnline = () => online;

function inbox(c, id) { return ((c.ui.inbox ||= {})[id] ||= []); }
// a secret for one player's phone; kept so it's still there if they reconnect
export function phoneWhisper(member, { text, title, image }) {
  const c = C(), list = inbox(c, member.id);
  list.unshift({ id: uid(), t: Date.now(), title: title || "", text: text || "", src: image || null });
  list.length = Math.min(list.length, 40); save();
  T()?.inbox(member.id, list);
  return online.includes(member.id);
}

function act(a) {
  const c = C(), m = c.party.find(x => x.id === a.member); if (!m) return;
  const who = m.character || m.player, back = r => T()?.to(m.id, "result", { total: shownTotal(r), label: r.label, expr: r.expr, crit: r.crit, fumble: r.fumble, note: critLabel(r), breakdown: breakdown(r) });
  if (a.type === "check") {
    const v = parseInt(m.stats?.[a.stat]); if (isNaN(v)) return T()?.to(m.id, "result", { error: `${a.stat} has no number yet` });
    const L = sheetLayout(c); let expr = (L.roll || "1d20+{value}").replace(/\{value\}/g, v).replace(/\+-/g, "-");
    App.roll(expr, a.stat, { who, onResult: back }); return;
  }
  if (a.type === "roll") {
    try { parseRoll(a.expr); } catch (e) { return T()?.to(m.id, "result", { error: e.message }); }
    App.roll(a.expr, a.label || "", { who, onResult: back }); return;
  }
  if (a.type === "hp" && prefs().hp !== false) {
    const r = (m.res ||= {})[a.res] ||= { cur: "", max: "" };
    r.cur = (Number(r.cur) || 0) + Number(a.delta || 0); if (r.max !== "" && r.cur > Number(r.max)) r.cur = Number(r.max);
    save(); App.refreshAll(); import("./party.js").then(x => x.pushParty()); return;
  }
  if (a.type === "vote") import("./poll.js").then(x => x.phoneVote(m, a.pollId, a.idx));
}

export function initPlayers(app) {
  App = app; if (!T()) return;
  T().onStatus(s => { status = s; online = s.players || []; subs.forEach(f => f()); if (s.on) push(); });
  T().onAct(act);
  onSaved(st => { if (st === "saved" || st === "saving") push(); });
  if (prefs().on) startTable();
}
// 128-bit keys: the link is the only lock once it's shared over the internet
const newKey = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join("");
export async function startTable() {
  const P = prefs(); P.key ||= newKey();
  const r = await T().start({ port: P.port, key: P.key });
  if (r.error) { toast(`Couldn't start the table link: ${r.error}`); return r; }
  status = r; P.on = true; save(); push();
  for (const m of C().party) { const l = C().ui.inbox?.[m.id]; if (l?.length) T().inbox(m.id, l); }
  return r;
}

// ---- the GM's panel: QR code for phones, links for OBS ----
const OBS = [["", "Everything", "Dice, turn order, party bar, map, scenes, name cards, loot, votes, weather, sound"], ["dice", "Dice only", "Transparent dice that roll over your camera or scene"], ["combat", "Turn order", "The initiative strip"], ["party", "Party bar", "Everyone's health"], ["map", "Battle map", "Map with fog of war"], ["lower,loot,poll,timer,clocks", "Popups", "Name cards, loot reveals, votes, countdown, clocks"], ["scene", "Full-screen scenes", "Starting soon, break, recap…"]];
export function tableModal() {
  if (!T()) return toast("The table link works in the desktop app");
  App.modal(`<h2>Table link</h2><div id="tlBody"></div>`, (m) => {
    const body = $("#tlBody", m);
    const draw = async () => {
      const P = prefs(), s = await T().info();
      if (!s.on) {
        body.innerHTML = `<p style="margin:0;color:var(--dim)">Players open a page on their phone: handouts, the map, turn order, votes, and their own sheet. Tapping a stat rolls the dice on your table. OBS can load your stream overlays from it too.</p>
          <p class="md-help" style="margin:0">Works on your home Wi-Fi: phones need to be on the same network as this computer. The first time, Windows asks to allow the app on your network: pick <b>Private networks</b>.</p>
          <div class="foot"><button class="btn primary" id="tlOn">${icon("stream")} Turn on the table link</button></div>`;
        $("#tlOn", body).onclick = async () => { await startTable(); draw(); };
        return;
      }
      const web = P.mode === "web", tn = s.tunnel || { state: "off" };
      const link = web ? s.publicUrl : s.url;
      const svg = link ? await T().qr(link) : "";
      const party = C().party;
      const webPane = tn.state === "on" ? "" : tn.state === "downloading" ? `<div class="tl-wait"><b>Getting Cloudflare's tunnel helper…</b><div class="dbar" style="margin-top:8px"><i style="width:${Math.round((tn.progress || 0) * 100)}%"></i></div><span class="carried">One-time download, about 55 MB</span></div>`
        : tn.state === "starting" ? `<div class="tl-wait"><b>Connecting to Cloudflare…</b><span class="carried">Usually a few seconds</span></div>`
        : `<div class="tl-wait">${tn.state === "error" ? `<b style="color:var(--bad)">${esc(tn.error)}</b>` : `<b>Players on other networks</b>`}
            <p class="md-help" style="margin:4px 0 10px">Makes a free, secure link through Cloudflare that works from anywhere: their home Wi-Fi or mobile data. Only people with the link can open it. The address changes each time you turn it on.</p>
            <button class="btn primary" id="tlWebOn">${icon("stream")} ${tn.state === "error" ? "Try again" : "Share over the internet"}</button></div>`;
      body.innerHTML = `<div class="seg tl-seg"><button class="${web ? "" : "on"}" data-mode="lan">Same Wi-Fi</button><button class="${web ? "on" : ""}" data-mode="web">Anywhere (internet)</button></div>
        <div class="tl-grid"><div class="tl-qr ${link ? "" : "off"}">${svg || `<div class="tl-noqr">${icon("stream")}</div>`}</div><div>
          ${web && !link ? webPane : `<div class="eyebrow">${web ? "For phones anywhere" : "For phones on your Wi-Fi"}</div><div class="tl-url mono">${esc(link)}</div>
          <div class="row" style="gap:6px;margin-top:8px"><button class="btn sm" id="tlCopy">${icon("copy")} Copy link</button>${web ? `<button class="btn sm ghost" id="tlWebOff">Stop sharing</button>` : ""}<button class="btn sm ghost" id="tlNew" title="Old links and QR codes stop working">New key</button><button class="btn sm ghost" id="tlOff">Turn off</button></div>`}
          <div class="eyebrow" style="margin-top:16px">At the table now</div>
          <div class="chips">${party.map(p => `<span class="chip ${online.includes(p.id) ? "tl-on" : ""}" style="border-color:${esc(p.color)}">${online.includes(p.id) ? "● " : ""}${esc(p.character || p.player)}</span>`).join("") || `<span class="carried">Add your party first</span>`}</div>
          <label class="toggle" style="margin-top:12px"><input type="checkbox" id="tlHp" ${P.hp !== false ? "checked" : ""}> Players can change their own HP and resources</label>
        </div></div>
        <details class="tl-obs"><summary><b>OBS browser sources</b> <span class="carried">· for streaming with OBS instead of a window capture</span></summary>
          <p class="md-help">In OBS: Sources → + → Browser, paste a link, set 1920 × 1080. The background is see-through. Add as many as you like and place them anywhere. While one with dice is open, rolls happen there (you don't need the stream window).</p>
          <div class="tl-obs-list">${OBS.map(([k, n, d]) => { const u = `${s.local}/obs?k=${s.key}${k ? "&only=" + k : ""}`; return `<div class="tl-obs-row"><div><b>${n}</b><span class="carried">${d}</span></div><code class="mono">${esc(u)}</code><button class="tb" data-cp="${esc(u)}" title="Copy">${icon("copy")}</button></div>`; }).join("")}</div>
        </details>
        <div class="foot"><button class="btn primary" data-x>Done</button></div>`;
      $("[data-x]", body).onclick = () => m.closest(".modal-back").remove();
      $("#tlCopy", body)?.addEventListener("click", () => copyText(link, "Link copied"));
      $$("[data-mode]", body).forEach(b => b.onclick = () => { P.mode = b.dataset.mode; save(); draw(); });
      $("#tlWebOn", body)?.addEventListener("click", async () => {
        if ((P.key || "").length < 32) { P.key = newKey(); await startTable(); } // old short keys are too easy to guess on the open internet
        await T().tunnel(true); draw();
      });
      $("#tlWebOff", body)?.addEventListener("click", async () => { await T().tunnel(false); P.mode = "lan"; save(); draw(); });
      $$("[data-cp]", body).forEach(b => b.onclick = () => copyText(b.dataset.cp, "OBS link copied"));
      $("#tlHp", body).onchange = e => { P.hp = e.target.checked; save(); push(); };
      $("#tlOff", body)?.addEventListener("click", async () => { await T().stop(); P.on = false; save(); draw(); });
      $("#tlNew", body)?.addEventListener("click", async () => { const wasWeb = (s.tunnel || {}).state === "on"; P.key = newKey(); await startTable(); if (wasWeb) await T().tunnel(true); draw(); });
    };
    draw();
    const redraw = () => { if (document.body.contains(body)) draw(); else subs.delete(redraw); };
    subs.add(redraw);
  });
}
