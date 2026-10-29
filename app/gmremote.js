// GM remote: run the table from your own phone. It has its own secret link (not the players' one),
// sees the turn order, scene, party and handouts, and can advance turns, apply damage, roll and show things.
import { $, esc, icon, toast, uid } from "./util.js";
import { S, C, save, onSaved } from "./store.js";
import { combat, advanceTurn, applyDamage, combatChanged } from "./combat.js";
import { res, pushParty } from "./party.js";
import { nextPlanned } from "./bestiary.js";
import { shownTotal, critLabel, breakdown } from "./roll.js";
import { Stage } from "./bridge.js";
import { t } from "./i18n.js";
import { startTable } from "./players.js";

const T = () => window.codex?.table;
let App = null, timer = null;

function state() {
  const c = C(), b = combat(), s = c.sessions.find(x => x.status === "live") || nextPlanned(c, false), P = s?.plan || {};
  return {
    campaign: c.name, at: Date.now(),
    session: s ? { num: s.num, title: s.title || "", live: s.status === "live", startedAt: P.startedAt || null } : null,
    combat: { active: !!b.active, round: b.round, list: b.list.map((x, i) => ({ id: x.id, name: x.name, kind: x.kind, hp: x.hp, max: x.max, cur: b.active && i === b.turn, conds: (x.conds || []).map(k => k.name), color: x.color || null })) },
    party: c.party.map(m => { const hp = res(m, "HP"); return { id: m.id, name: m.character || m.player || "Unnamed", color: m.color, hp: hp.cur, max: hp.max }; }),
    plan: { start: P.start || "", scenes: (P.scenes || []).map(x => ({ id: x.id, text: x.text, done: !!x.done })), secrets: (P.secrets || []).map(x => ({ id: x.id, text: x.text, done: !!x.done })) },
    presets: (c.presets || []).slice(0, 16).map(p => ({ name: p.name, expr: p.expr })),
    handouts: c.handouts.map(h => ({ id: h.id, title: h.title || "Untitled", type: h.type })), onAir: App.onAir?.id || null,
    stream: !!App.streamLive, lang: S.data.prefs.deskLang || "en",
  };
}
export function pushGm() { clearTimeout(timer); timer = setTimeout(() => T()?.gmState(state()), 120); }

function act(a) {
  const c = C(), b = combat();
  switch (a.type) {
    case "hello": return pushGm();
    case "next": case "prev": advanceTurn(a.type === "next" ? 1 : -1); break;
    case "dmg": { const x = b.list.find(y => y.id === a.id); if (x && applyDamage(x, a.raw)) combatChanged(); break; }
    case "pc": {
      const m = c.party.find(p => p.id === a.id); if (!m) break; const hp = res(m, "HP");
      hp.cur = (Number(hp.cur) || 0) + Number(a.delta || 0);
      const x = b.list.find(y => y.kind === "pc" && y.ref === m.id); if (x) { x.hp = hp.cur; combatChanged(); } else { save(); pushParty(); }
      break;
    }
    case "roll": App.roll(String(a.expr || "1d20"), String(a.label || ""), { secret: !!a.secret, onResult: r => T()?.gmResult({ total: shownTotal(r), label: r.label, expr: r.expr, note: critLabel(r, t), breakdown: breakdown(r), secret: !!a.secret, id: uid() }) }); return;
    case "plan": {
      const s = c.sessions.find(x => x.status === "live") || nextPlanned(c, false); const L = s?.plan?.[a.kind === "secret" ? "secrets" : "scenes"];
      const x = L?.find(y => y.id === a.id); if (x) { x.done = !!a.done; save(); if (a.done && a.kind === "secret" && s.status === "live") App.logBeat?.("discovery", `Revealed: ${x.text}`, true); }
      break;
    }
    case "log": if (String(a.text || "").trim()) App.logBeat?.("social", String(a.text).trim().slice(0, 500)); break;
    case "show": { const h = c.handouts.find(x => x.id === a.id); if (h) App.showHandout(h); break; }
    case "hide": App.hideHandout?.(); break;
    case "break": Stage.overlay({ kind: "scene", show: true, type: "brb", campaign: c.name, tagline: c.tagline || "", title: t("Short break"), sub: t("Grab a drink. Back soon."), endsAt: Date.now() + (Number(a.min) || 10) * 60000 }); if (!App.streamLive) Stage.open(); break;
    case "sceneOff": Stage.overlay({ kind: "scene", show: false }); break;
    case "stage": Stage.open(); break;
  }
  App.refreshAll?.(); pushGm();
}

export function initGmRemote(app) {
  App = app; if (!T()?.onGm) return;
  T().onGm(act);
  onSaved(s => { if (s === "saved") pushGm(); });
  addEventListener("codex:combat", pushGm);
  App.gmRemote = gmRemoteModal;
}

// the desk's panel: a QR code for the GM's own phone
export async function gmRemoteModal() {
  if (!T()) return toast("The GM remote works in the desktop app");
  let info = await T().info();
  if (!info.on || !info.gmUrl) { toast("Turning on the table link…"); info = await startTable(); if (!info?.on) return; info = await T().info(); }
  const url = info.gmPublicUrl || info.gmUrl, svg = await T().qr(url);
  App.modal(`<h2>Your GM remote</h2>
    <p style="margin:0;color:var(--dim)">Scan this with <b>your</b> phone to run the table from it: next turn, damage, party health, rolls, scenes, secrets, handouts and the break screen. ${info.gmPublicUrl ? "It works from anywhere while the internet link is on." : "Your phone needs to be on the same Wi-Fi."}</p>
    <div class="gm-qr">${svg}</div>
    <div class="row" style="gap:6px"><input type="text" class="mono" readonly value="${esc(url)}" style="flex:1"><button class="btn" id="gmCopy">${icon("copy")} Copy</button></div>
    <p class="md-help" style="margin:0;color:var(--bad)">Keep this link to yourself: whoever has it can control the game. Players use the table link.</p>
    <div class="foot"><button class="btn primary" data-x>Done</button></div>`, (m, close) => {
    $("[data-x]", m).onclick = close;
    $("#gmCopy", m).onclick = () => navigator.clipboard.writeText(url).then(() => toast("Copied"));
  });
  pushGm();
}
