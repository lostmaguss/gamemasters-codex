// Encounter difficulty for homebrew systems: no official tables, just your own numbers.
// Weighs the foes' HP and damage per round against the party's HP, and the head count.
import { esc } from "./util.js";

export const BANDS = [["easy", "Easy", .45], ["standard", "Standard", .85], ["hard", "Hard", 1.3], ["deadly", "Deadly", Infinity]];

// average of a roll like 2d6+3, 1d10-1, 3d8 (keep/drop and targets are ignored)
export function avgRoll(expr) {
  const s = String(expr || "").replace(/\s+/g, ""); if (!/\d*d\d+/i.test(s)) return 0;
  let total = 0;
  for (const m of s.matchAll(/([+-]?)(\d*)d(\d+)/gi)) total += (m[1] === "-" ? -1 : 1) * (+m[2] || 1) * (+m[3] + 1) / 2;
  for (const m of s.replace(/([+-]?)(\d*)d(\d+)(?:[a-z]+\d+)*/gi, "").matchAll(/([+-])(\d+)/g)) total += (m[1] === "-" ? -1 : 1) * +m[2];
  const lead = s.match(/^(\d+)(?=[+-])/); if (lead && !/^\d+d/i.test(s)) total += +lead[1];
  return Math.max(0, total);
}
// best guess at one creature's damage per round: a "damage" roll, or the dice after "On a hit:"
export function creatureDPR(x) {
  if (!x) return 0;
  const cands = [];
  for (const a of x.abilities || []) {
    if (a.roll && /dam|dmg|hurt|wound/i.test(a.name)) cands.push(avgRoll(a.roll));
    for (const m of String(a.text || "").matchAll(/(?:hit|deals?|damage)[^.\d]{0,20}(\d*d\d+(?:\s*[+-]\s*\d+)?)/gi)) cands.push(avgRoll(m[1]));
  }
  return cands.length ? Math.max(...cands) : 0;
}
export const creatureHP = x => parseInt(x?.stats?.HP ?? x?.hp) || 0;

// foes: [{ hp, dpr }]; party: the campaign's characters
export function rate(foes, party) {
  const pHP = party.reduce((s, m) => s + (Number(m.res?.HP?.max) || Number(m.res?.HP?.cur) || 0), 0);
  const n = party.length, f = foes.length;
  if (!f) return null;
  const fHP = foes.reduce((s, x) => s + (x.hp || 0), 0), fDPR = foes.reduce((s, x) => s + (x.dpr || 0), 0);
  if (!pHP || !n) return { band: null, fHP, fDPR, f, n, pHP, why: "Give the party their max HP to rate fights" };
  const hpR = fHP / pHP, dmgR = fDPR ? (fDPR * 4) / pHP : null; // share of the party's HP the foes deal in about 4 rounds
  const score = (dmgR == null ? hpR : (hpR + dmgR) / 2) * Math.pow(f / n, .3);
  const band = BANDS.find(b => score < b[2]);
  return { band: band[0], label: band[1], score, fHP, fDPR, f, n, pHP, roundsToDrop: fDPR ? Math.ceil(pHP / fDPR) : null };
}
export function meterHTML(r, compact = false) {
  if (!r) return "";
  if (!r.band) return `<div class="dmeter none"><span class="carried">${esc(r.why)}</span></div>`;
  const pct = Math.min(100, r.score / 1.8 * 100);
  const facts = [`${r.f} foe${r.f > 1 ? "s" : ""} vs ${r.n}`, `${r.fHP} HP vs ${r.pHP}`, r.fDPR ? `~${Math.round(r.fDPR)} damage a round${r.roundsToDrop ? ` (party down in ~${r.roundsToDrop})` : ""}` : "damage unknown"].join(" · ");
  return `<div class="dmeter d-${r.band} ${compact ? "compact" : ""}" title="Estimated from HP, damage rolls and head count. A guide, not a rule.">
    <b>${r.label}</b><div class="dbar"><i style="width:${pct}%"></i><span style="left:25%"></span><span style="left:47%"></span><span style="left:72%"></span></div>${compact ? "" : `<small>${esc(facts)}</small>`}</div>`;
}
