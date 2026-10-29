// Dice notation: 2d6+3, d20, 4d6dl1, 2d20kh1+5, d%, 3d8-1d4, 3d6! (exploding), 4d6r1 (reroll 1s once), 4dF (Fate)
const rand = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n + 1; };
const FATE = { 1: -1, 2: -1, 3: 0, 4: 0, 5: 1, 6: 1 };
// custom dice with your own faces (symbols, words, values), rolled as 3d[boon]
let CUSTOM = [];
export function setCustomDice(list) { CUSTOM = Array.isArray(list) ? list : []; }
export const findCustom = name => CUSTOM.find(d => d.name.trim().toLowerCase() === String(name).trim().toLowerCase());
// the definitions a roll uses, so another window can read it too
export function customFor(expr) { return [...String(expr).toLowerCase().matchAll(/d\[([^\]]+)\]/g)].map(m => findCustom(m[1])).filter(Boolean); }
export function parseRoll(expr, custom) {
  if (custom) setCustomDice([...CUSTOM.filter(d => !custom.some(c => c.name === d.name)), ...custom]);
  const src = String(expr).toLowerCase().replace(/\[[^\]]*\]/g, m => m.replace(/\s+/g, "\u00a0")).replace(/\s+/g, "").replace(/\u00a0/g, " ");
  if (!src) throw new Error("Type a roll, like 2d6+3");
  const re = /([+-]?)(?:(\d*)d(\d+|%|f|\[[^\]]+\])(!)?(r\d+)?((?:kh|kl|dh|dl|k|d)\d+)?((?:>=|<=|>|<)\d+)?|(\d+))/y;
  const terms = []; let pos = 0, dice = 0;
  while (pos < src.length) {
    re.lastIndex = pos; const m = re.exec(src);
    if (!m) throw new Error(`Can't read "${src.slice(pos)}"`);
    if (terms.length && !m[1]) throw new Error("Put + or - between parts");
    pos = re.lastIndex;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[8] != null) { terms.push({ sign, flat: +m[8] }); continue; }
    const fate = m[3] === "f";
    let custom = null;
    if (m[3][0] === "[") { custom = findCustom(m[3].slice(1, -1)); if (!custom) throw new Error(`No custom die called "${m[3].slice(1, -1)}". Make it in the Dice view`); }
    const count = m[2] ? +m[2] : 1, sides = custom ? custom.faces.length : fate ? 6 : m[3] === "%" ? 100 : +m[3];
    if (count < 1) throw new Error("Roll at least one die");
    if (sides < 2 || sides > 1000) throw new Error("Dice need 2 to 1000 sides");
    dice += count;
    if (dice > 40) throw new Error("That's a lot of dice. Keep it to 40 per roll");
    let keep = null;
    if (m[6]) { const k = m[6].match(/(kh|kl|dh|dl|k|d)(\d+)/); keep = { mode: k[1] === "k" ? "kh" : k[1] === "d" ? "dl" : k[1], n: +k[2] }; }
    let target = null;
    if (m[7]) { const t = m[7].match(/(>=|<=|>|<)(\d+)/); target = { op: t[1], n: +t[2] }; }
    const explode = !!m[4] && !fate && !custom && sides > 1, reroll = m[5] ? +m[5].slice(1) : 0;
    if (reroll >= sides) throw new Error("Rerolling every result would never stop");
    terms.push({ sign, count, sides, keep, target, fate, explode, reroll, custom });
  }
  return terms;
}
export function diceGroups(terms) { return terms.filter(t => t.flat == null).map(t => ({ sides: t.sides, count: t.count, fate: t.fate, faces: t.custom ? t.custom.faces.map(f => f.label) : null })); }

// Crit rules per campaign: which die counts, and whether high or low is good.
export const DEFAULT_RULES = { critDie: 20, critMode: "high", initHigh: true };
const hit = (v, t) => t.op === ">=" ? v >= t.n : t.op === "<=" ? v <= t.n : t.op === ">" ? v > t.n : v < t.n;
export function buildResult({ id, expr, label, who, rules, color }, terms, values) {
  rules = { ...DEFAULT_RULES, ...(rules || {}) };
  let total = 0, mod = 0, gi = 0, successMode = false; const groups = [];
  for (const t of terms) {
    if (t.flat != null) { total += t.sign * t.flat; mod += t.sign * t.flat; continue; }
    let rolls = values[gi++].map(v => ({ v, dropped: false }));
    if (t.fate) rolls.forEach(r => { r.face = r.v; r.v = FATE[r.v] ?? 0; });
    // custom faces: the symbol is what you read, the face's number (if any) is what adds up
    if (t.custom) rolls.forEach(r => { const f = t.custom.faces[r.v - 1] || {}; r.face = r.v; r.sym = f.label || ""; r.v = Number(f.value) || 0; });
    if (t.reroll) rolls.forEach(r => { if (r.v <= t.reroll) { r.was = r.v; r.v = rand(t.sides); } });
    if (t.explode) {
      const out = [];
      for (const r of rolls) { out.push(r); let last = r.v, n = 0; while (last === t.sides && n++ < 20) { last = rand(t.sides); out.push({ v: last, dropped: false, ex: true }); } }
      rolls = out;
    }
    if (t.keep) {
      const order = rolls.map((r, i) => i).sort((a, b) => rolls[a].v - rolls[b].v);
      const n = Math.min(t.keep.n, rolls.length); let drop = [];
      if (t.keep.mode === "kh") drop = order.slice(0, rolls.length - n);
      if (t.keep.mode === "kl") drop = order.slice(n);
      if (t.keep.mode === "dl") drop = order.slice(0, n);
      if (t.keep.mode === "dh") drop = order.slice(rolls.length - n);
      drop.forEach(i => rolls[i].dropped = true);
    }
    if (t.target) { successMode = true; rolls.forEach(r => r.hit = !r.dropped && hit(r.v, t.target)); total += t.sign * rolls.filter(r => r.hit).length; }
    else total += t.sign * rolls.filter(r => !r.dropped).reduce((s, r) => s + r.v, 0);
    groups.push({ sides: t.sides, count: t.count, sign: t.sign, keep: t.keep, target: t.target, fate: t.fate, explode: t.explode, reroll: t.reroll, rolls, custom: t.custom ? t.custom.name : null, symbolic: t.custom ? !t.custom.faces.some(f => f.value !== "" && f.value != null && !isNaN(Number(f.value))) : false });
  }
  // a natural crit only counts when one die of the deciding kind decides the roll
  let crit = false, fumble = false;
  if (rules.critMode !== "none" && groups.length === 1 && !groups[0].fate && !groups[0].custom) {
    const g = groups[0], kept = g.rolls.filter(r => !r.dropped);
    if (kept.length === 1 && (rules.critDie === "any" || Number(rules.critDie) === g.sides)) {
      const v = kept[0].v, best = rules.critMode === "low" ? 1 : g.sides, worst = rules.critMode === "low" ? g.sides : 1;
      crit = v === best; fumble = v === worst;
    }
  }
  const r = { id, expr, label: label || "", who: who || "", color: color || null, groups, mod, total, at: Date.now(), crit, fumble, rules };
  // tally the symbols on custom dice: "⚔×2 ✦×1"
  // a face of pure symbols ("⚔✦") counts each one; words ("Hit") count whole
  const parts = s => /[\p{L}\p{N}]/u.test(s) ? [s] : typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter().segment(s)].map(x => x.segment).filter(x => x.trim()) : [...s];
  const tally = {}; for (const g of groups) if (g.custom) for (const x of g.rolls) if (!x.dropped && x.sym) for (const k of parts(x.sym)) tally[k] = (tally[k] || 0) + 1;
  if (Object.keys(tally).length) r.tally = Object.entries(tally).map(([k, n]) => n > 1 ? `${k}×${n}` : k).join("  ");
  if (groups.length && groups.every(g => g.symbolic) && !mod) r.symbolic = true;
  if (successMode) {
    r.successMode = true;
    const one = groups.length === 1 && groups[0].rolls.length === 1 && !mod;
    if (one) { r.single = groups[0].rolls[0].v; r.success = !!groups[0].rolls[0].hit; }
  }
  return r;
}
const fmt = (s, v) => v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m) : s;
// tr: a translator for what players see (i18n.js t); the GM's screens use English
// the Fate ladder: what a Fate roll's total means
export const LADDER = { 8: "Legendary", 7: "Epic", 6: "Fantastic", 5: "Superb", 4: "Great", 3: "Good", 2: "Fair", 1: "Average", 0: "Mediocre", "-1": "Poor", "-2": "Terrible", "-3": "Catastrophic", "-4": "Horrifying" };
export const ladder = n => LADDER[Math.max(-4, Math.min(8, n))];
const isFate = r => r.groups?.some(g => g.fate) && !r.successMode;
export function critLabel(r, tr = fmt) {
  if (r.tally && !r.symbolic) return r.tally;
  if (isFate(r)) return tr(ladder(r.total));
  if (r.success != null && !r.crit && !r.fumble) return tr(r.success ? "Success" : "Failure");
  const v = r.groups[0]?.rolls.find(x => !x.dropped)?.v;
  return r.crit ? tr("Critical · natural {v}", { v }) : r.fumble ? tr("Fumble · natural {v}", { v }) : r.success != null ? tr(r.success ? "Success" : "Failure") : "";
}
export const successWord = (r, tr = fmt) => tr(r.total === 1 ? "success" : "successes");
export function shownTotal(r) { return r.symbolic ? (r.tally || "–") : r.single != null ? r.single : isFate(r) && r.total > 0 ? "+" + r.total : r.total; }
export function breakdown(r) {
  const parts = r.groups.map((g, i) => {
    const show = x => g.custom ? (x.sym || "·") : g.fate ? (x.v > 0 ? "+" : x.v < 0 ? "−" : "0") : (x.was != null ? `${x.was}→` : "") + x.v + (g.explode && x.v === g.sides ? "!" : "");
    const vals = g.rolls.map(x => x.dropped ? `(${show(x)})` : g.target ? (x.hit ? `${show(x)}✓` : show(x)) : show(x)).join(" ");
    const k = (g.explode ? "!" : "") + (g.reroll ? "r" + g.reroll : "") + (g.keep ? g.keep.mode + g.keep.n : "") + (g.target ? g.target.op + g.target.n : "");
    return `${i || g.sign < 0 ? (g.sign < 0 ? "− " : "+ ") : ""}${g.count}d${g.custom ? `[${g.custom}]` : g.fate ? "F" : g.sides}${k} [${vals}]`;
  });
  if (r.mod) parts.push((r.mod < 0 ? "− " : "+ ") + Math.abs(r.mod));
  if (r.successMode && r.single == null) parts.push(`= ${r.total} success${r.total === 1 ? "" : "es"}`);
  return parts.join(" ");
}
// marks for the 3D tray: per group/roll -> dropped/max/min
export function markFor(r, gi, ri) {
  const g = r.groups[gi]; const x = g && g.rolls.filter(y => !y.ex)[ri]; if (!x) return {};
  if (g.target) return { dropped: x.dropped, max: x.hit, min: !x.hit && !x.dropped };
  if (g.fate) return { dropped: false, max: x.v > 0, min: x.v < 0 };
  const low = r.rules?.critMode === "low";
  const top = !x.dropped && x.v === g.sides, bottom = !x.dropped && x.v === 1 && g.sides > 2;
  return { dropped: x.dropped, max: low ? bottom : top, min: low ? top : bottom };
}
