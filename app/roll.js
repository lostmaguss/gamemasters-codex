// Dice notation: 2d6+3, d20, 4d6dl1, 2d20kh1+5, d%, 3d8-1d4
export function parseRoll(expr) {
  const src = String(expr).replace(/\s+/g, "").toLowerCase();
  if (!src) throw new Error("Type a roll, like 2d6+3");
  const re = /([+-]?)(?:(\d*)d(\d+|%)((?:kh|kl|dh|dl|k|d)\d+)?|(\d+))/y;
  const terms = []; let pos = 0, dice = 0;
  while (pos < src.length) {
    re.lastIndex = pos; const m = re.exec(src);
    if (!m) throw new Error(`Can't read "${src.slice(pos)}"`);
    if (terms.length && !m[1]) throw new Error("Put + or - between parts");
    pos = re.lastIndex;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[5] != null) { terms.push({ sign, flat: +m[5] }); continue; }
    const count = m[2] ? +m[2] : 1, sides = m[3] === "%" ? 100 : +m[3];
    if (count < 1) throw new Error("Roll at least one die");
    if (sides < 2 || sides > 1000) throw new Error("Dice need 2 to 1000 sides");
    dice += count;
    if (dice > 40) throw new Error("That's a lot of dice. Keep it to 40 per roll");
    let keep = null;
    if (m[4]) { const k = m[4].match(/(kh|kl|dh|dl|k|d)(\d+)/); keep = { mode: k[1] === "k" ? "kh" : k[1] === "d" ? "dl" : k[1], n: +k[2] }; }
    terms.push({ sign, count, sides, keep });
  }
  return terms;
}
export function diceGroups(terms) { return terms.filter(t => t.flat == null).map(t => ({ sides: t.sides, count: t.count })); }

export function buildResult({ id, expr, label, who }, terms, values) {
  let total = 0, mod = 0, gi = 0; const groups = [];
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
    total += t.sign * rolls.filter(r => !r.dropped).reduce((s, r) => s + r.v, 0);
    groups.push({ sides: t.sides, count: t.count, sign: t.sign, keep: t.keep, rolls });
  }
  const d20 = groups.filter(g => g.sides === 20);
  const kept = d20.flatMap(g => g.rolls.filter(r => !r.dropped));
  const single = d20.length === 1 && kept.length === 1 && groups.length === 1;
  return { id, expr, label: label || "", who: who || "", groups, mod, total, at: Date.now(),
    crit: single && kept[0].v === 20, fumble: single && kept[0].v === 1 };
}
export function breakdown(r) {
  const parts = r.groups.map((g, i) => {
    const vals = g.rolls.map(x => x.dropped ? `(${x.v})` : x.v).join(" ");
    const k = g.keep ? g.keep.mode + g.keep.n : "";
    return `${i || g.sign < 0 ? (g.sign < 0 ? "− " : "+ ") : ""}${g.count}d${g.sides}${k} [${vals}]`;
  });
  if (r.mod) parts.push((r.mod < 0 ? "− " : "+ ") + Math.abs(r.mod));
  return parts.join(" ");
}
// marks for the 3D tray: per group/roll -> dropped/max/min
export function markFor(r, gi, ri) {
  const g = r.groups[gi]; const x = g && g.rolls[ri]; if (!x) return {};
  return { dropped: x.dropped, max: !x.dropped && x.v === g.sides, min: !x.dropped && x.v === 1 && g.sides > 2 };
}
