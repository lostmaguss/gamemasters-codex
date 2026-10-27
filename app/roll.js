// Dice notation: 2d6+3, d20, 4d6dl1, 2d20kh1+5, d%, 3d8-1d4
export function parseRoll(expr) {
  const src = String(expr).replace(/\s+/g, "").toLowerCase();
  if (!src) throw new Error("Type a roll, like 2d6+3");
  const re = /([+-]?)(?:(\d*)d(\d+|%)((?:kh|kl|dh|dl|k|d)\d+)?((?:>=|<=|>|<)\d+)?|(\d+))/y;
  const terms = []; let pos = 0, dice = 0;
  while (pos < src.length) {
    re.lastIndex = pos; const m = re.exec(src);
    if (!m) throw new Error(`Can't read "${src.slice(pos)}"`);
    if (terms.length && !m[1]) throw new Error("Put + or - between parts");
    pos = re.lastIndex;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[6] != null) { terms.push({ sign, flat: +m[6] }); continue; }
    const count = m[2] ? +m[2] : 1, sides = m[3] === "%" ? 100 : +m[3];
    if (count < 1) throw new Error("Roll at least one die");
    if (sides < 2 || sides > 1000) throw new Error("Dice need 2 to 1000 sides");
    dice += count;
    if (dice > 40) throw new Error("That's a lot of dice. Keep it to 40 per roll");
    let keep = null;
    if (m[4]) { const k = m[4].match(/(kh|kl|dh|dl|k|d)(\d+)/); keep = { mode: k[1] === "k" ? "kh" : k[1] === "d" ? "dl" : k[1], n: +k[2] }; }
    let target = null;
    if (m[5]) { const t = m[5].match(/(>=|<=|>|<)(\d+)/); target = { op: t[1], n: +t[2] }; }
    terms.push({ sign, count, sides, keep, target });
  }
  return terms;
}
export function diceGroups(terms) { return terms.filter(t => t.flat == null).map(t => ({ sides: t.sides, count: t.count })); }

// Crit rules per campaign: which die counts, and whether high or low is good.
export const DEFAULT_RULES = { critDie: 20, critMode: "high", initHigh: true };
const hit = (v, t) => t.op === ">=" ? v >= t.n : t.op === "<=" ? v <= t.n : t.op === ">" ? v > t.n : v < t.n;
export function buildResult({ id, expr, label, who, rules }, terms, values) {
  rules = { ...DEFAULT_RULES, ...(rules || {}) };
  let total = 0, mod = 0, gi = 0, successMode = false; const groups = [];
  for (const t of terms) {
    if (t.flat != null) { total += t.sign * t.flat; mod += t.sign * t.flat; continue; }
    const rolls = values[gi++].map(v => ({ v, dropped: false }));
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
    groups.push({ sides: t.sides, count: t.count, sign: t.sign, keep: t.keep, target: t.target, rolls });
  }
  // a natural crit only counts when one die of the deciding kind decides the roll
  let crit = false, fumble = false;
  if (rules.critMode !== "none" && groups.length === 1) {
    const g = groups[0], kept = g.rolls.filter(r => !r.dropped);
    if (kept.length === 1 && (rules.critDie === "any" || Number(rules.critDie) === g.sides)) {
      const v = kept[0].v, best = rules.critMode === "low" ? 1 : g.sides, worst = rules.critMode === "low" ? g.sides : 1;
      crit = v === best; fumble = v === worst;
    }
  }
  const r = { id, expr, label: label || "", who: who || "", groups, mod, total, at: Date.now(), crit, fumble, rules };
  if (successMode) {
    r.successMode = true;
    const one = groups.length === 1 && groups[0].rolls.length === 1 && !mod;
    if (one) { r.single = groups[0].rolls[0].v; r.success = !!groups[0].rolls[0].hit; }
  }
  return r;
}
export function critLabel(r) {
  if (r.success != null && !r.crit && !r.fumble) return r.success ? "Success" : "Failure";
  const v = r.groups[0]?.rolls.find(x => !x.dropped)?.v;
  return r.crit ? `Critical · natural ${v}` : r.fumble ? `Fumble · natural ${v}` : r.success != null ? (r.success ? "Success" : "Failure") : "";
}
export function shownTotal(r) { return r.single != null ? r.single : r.total; }
export function breakdown(r) {
  const parts = r.groups.map((g, i) => {
    const vals = g.rolls.map(x => x.dropped ? `(${x.v})` : g.target ? (x.hit ? `${x.v}✓` : `${x.v}`) : x.v).join(" ");
    const k = (g.keep ? g.keep.mode + g.keep.n : "") + (g.target ? g.target.op + g.target.n : "");
    return `${i || g.sign < 0 ? (g.sign < 0 ? "− " : "+ ") : ""}${g.count}d${g.sides}${k} [${vals}]`;
  });
  if (r.mod) parts.push((r.mod < 0 ? "− " : "+ ") + Math.abs(r.mod));
  if (r.successMode && r.single == null) parts.push(`= ${r.total} success${r.total === 1 ? "" : "es"}`);
  return parts.join(" ");
}
// marks for the 3D tray: per group/roll -> dropped/max/min
export function markFor(r, gi, ri) {
  const g = r.groups[gi]; const x = g && g.rolls[ri]; if (!x) return {};
  if (g.target) return { dropped: x.dropped, max: x.hit, min: !x.hit && !x.dropped };
  const low = r.rules?.critMode === "low";
  const top = !x.dropped && x.v === g.sides, bottom = !x.dropped && x.v === 1 && g.sides > 2;
  return { dropped: x.dropped, max: low ? bottom : top, min: low ? top : bottom };
}
