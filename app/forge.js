import { $, $$, esc, h, icon, toast, copyText, uid } from "./util.js";
import { C, save } from "./store.js";
import { GEN, NAMES, makeName } from "./gen.js";

const KIND_META = {
  npc: { icon: "social", color: "rose", blurb: "Faces & secrets" },
  place: { icon: "explore", color: "lichen", blurb: "Where it happens" },
  mission: { icon: "travel", color: "mustard", blurb: "Jobs with a twist" },
  item: { icon: "loot", color: "plum", blurb: "Loot with a past" },
  loot: { icon: "save", color: "sky", blurb: "Hoards and stashes" },
  encounter: { icon: "combat", color: "paper", blurb: "Trouble on the road" },
};

export function createForge(el, App) {
  const c = () => C();
  const st = { kind: c().ui.forgeKind || "npc", opts: c().ui.forgeOpts || {}, cur: null };
  el.innerHTML = `<div class="forge">
    <aside class="forge-side">
      <div><div class="eyebrow" style="margin-bottom:10px">Pick a deck</div><div class="decks" id="fDecks"></div></div>
      <div id="fOpts" style="display:flex;flex-direction:column;gap:16px"></div>
      <button class="btn primary draw-btn" id="fDraw">Draw a card <span class="mono" style="font-size:11px;opacity:.7">SPACE</span></button>
      <div class="quick-names">
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><h3 style="font-size:22px">Names, fast</h3><button class="btn sm" id="qnGo">${icon("reroll")} 12 more</button></div>
        <select id="qnAnc" aria-label="Ancestry" style="margin-bottom:10px"></select>
        <div class="chips" id="qnList"></div>
        <div class="eyebrow" style="margin-top:8px">Click a name to copy it</div>
      </div>
    </aside>
    <div class="forge-table" id="fTable">
      <div class="tcard-wrap"><article class="tcard" id="fCard"></article></div>
      <div class="card-actions" id="fActs"></div>
      <div class="draws"><div class="row" style="justify-content:space-between"><div class="eyebrow">Drawn lately</div><button class="btn ghost sm" id="fClear">Clear</button></div><div class="draws-row" id="fDraws"></div></div>
    </div>
  </div>`;

  function opts(kind) { const o = {}; for (const k in GEN[kind].opts) o[k] = st.opts[kind + "." + k] || "any"; return o; }
  function draw(kind = st.kind, deal = true) {
    const g = GEN[kind], ctx = g.init(opts(kind)), f = {};
    for (const [k, [, fn]] of Object.entries(g.fields)) f[k] = fn(ctx, f);
    st.cur = { id: uid(), kind, ctx, title: g.title(ctx), fields: f };
    remember(); renderCard(deal);
  }
  function remember() {
    const r = c().recent; const i = r.findIndex(x => x.id === st.cur.id);
    if (i >= 0) r.splice(i, 1);
    r.unshift(st.cur); r.length = Math.min(r.length, 24); save(); renderDraws();
  }
  function text(cur = st.cur, withTitle = true) {
    const g = GEN[cur.kind]; const lines = withTitle ? [cur.title, g.sub(cur.ctx, cur.fields), ""] : [g.sub(cur.ctx, cur.fields), ""];
    for (const [k, [lab]] of Object.entries(g.fields)) if (!(g.hidden || []).includes(k)) lines.push(`${lab}: ${cur.fields[k]}`);
    return lines.join("\n");
  }
  function renderDecks() {
    $("#fDecks", el).innerHTML = Object.entries(KIND_META).map(([k, m]) =>
      `<button class="deck k-${k} ${k === st.kind ? "on" : ""}" data-k="${k}">${icon(m.icon)}<div><b>${GEN[k].label}</b><br><small>${m.blurb}</small></div></button>`).join("");
    $$(".deck", el).forEach(b => b.onclick = () => { st.kind = b.dataset.k; c().ui.forgeKind = st.kind; renderDecks(); renderOpts(); draw(); });
  }
  function renderOpts() {
    const g = GEN[st.kind], box = $("#fOpts", el); box.innerHTML = "";
    for (const [k, o] of Object.entries(g.opts)) {
      const grp = h(`<div class="opt-group"><div class="eyebrow">${esc(o.label)}</div><div class="chips"></div></div>`);
      const cur = st.opts[st.kind + "." + k] || "any";
      for (const [v, lab] of Object.entries(o.choices)) {
        const b = h(`<button class="chip ${v === cur ? "on" : ""}">${esc(lab)}</button>`);
        b.onclick = () => { st.opts[st.kind + "." + k] = v; c().ui.forgeOpts = st.opts; save(); renderOpts(); draw(); };
        grp.lastChild.append(b);
      }
      box.append(grp);
    }
  }
  function renderCard(deal) {
    const cur = st.cur, g = GEN[cur.kind], m = KIND_META[cur.kind], card = $("#fCard", el);
    card.className = `tcard k-${cur.kind}`;
    const rows = Object.entries(g.fields).filter(([k]) => !(g.hidden || []).includes(k)).map(([k, [lab]]) =>
      `<dt>${esc(lab)}</dt><dd class="v">${esc(cur.fields[k])}</dd><dd><button class="rr" data-f="${k}" title="Reroll ${esc(lab.toLowerCase())}">${icon("reroll")}</button></dd>`).join("");
    card.innerHTML = `<div class="corner">${icon(m.icon)}${esc(g.label)}</div>
      <div class="ttl"><h2>${esc(cur.title)}</h2><button class="rr" id="fReT" title="New name">${icon("reroll")}</button></div>
      <div class="sub">${esc(g.sub(cur.ctx, cur.fields))}</div>
      <dl>${rows}</dl>`;
    if (deal) { card.classList.remove("deal"); void card.offsetWidth; card.classList.add("deal"); }
    $("#fReT", card).onclick = () => { cur.title = g.title(cur.ctx); remember(); renderCard(false); };
    $$("[data-f]", card).forEach(b => b.onclick = () => {
      const k = b.dataset.f; cur.fields[k] = g.fields[k][1](cur.ctx, cur.fields);
      if (k === "rarity" && cur.fields.value) cur.fields.value = g.fields.value[1](cur.ctx, cur.fields);
      remember(); renderCard(false);
    });
    const hid = (g.hidden || []).map(k => `<button class="btn sm ghost" data-hf="${k}">${icon("reroll")} ${esc(g.fields[k][0])}</button>`).join("");
    const encBtn = cur.kind === "encounter" && cur.ctx.creature ? `<button class="btn" id="aFight">${icon("combat")} Add to tonight's encounters</button>` : "";
    $("#fActs", el).innerHTML = `${encBtn}${["loot", "item"].includes(cur.kind) ? `<button class="btn" id="aStash" title="Add the coin and things to the party stash">${icon("loot")} To stash</button>` : ""}<button class="btn" id="aSave">${icon("save")} Save to Codex</button><button class="btn" id="aPin">${icon("pin")} Pin to board</button><button class="btn" id="aCopy">${icon("copy")} Copy</button><button class="btn" id="aPost" title="Post this card to Discord">${icon("discord")} Post</button>${hid}`;
    $$("[data-hf]", el).forEach(b => b.onclick = () => { const k = b.dataset.hf; cur.fields[k] = g.fields[k][1](cur.ctx, cur.fields); if (k === "rarity") cur.fields.value = g.fields.value[1](cur.ctx, cur.fields); remember(); renderCard(false); });
    $("#aCopy", el).onclick = () => copyText(text());
    $("#aStash", el)?.addEventListener("click", () => import("./stash.js").then(({ addToStash, fromForgeCard }) => { const got = addToStash(fromForgeCard(cur, g)); toast(got.length ? `To the stash: ${got.join(", ")}` : "Nothing to stash"); App.refreshAll(); }));
    $("#aFight", el)?.addEventListener("click", () => import("./bestiary.js").then(({ nextPlanned }) => {
      const c = C(), s = nextPlanned(c), x = c.bestiary.find(y => y.id === cur.ctx.creature); if (!x) return;
      const n = parseInt((cur.title.match(/×(\d+)/) || [, 1])[1]), hp = parseInt(x.stats?.HP || x.hp) || 0;
      s.plan.encounters.push({ id: uid(), creature: x.id, count: n, hp: Array(n).fill(hp) }); save(); toast(`Added ${n} × ${x.name} to Session ${s.num}`);
    }));
    $("#aPost", el).onclick = () => App.discord.postCard(cur.title, g.sub(cur.ctx, cur.fields), Object.entries(g.fields).filter(([k]) => !(g.hidden || []).includes(k) && !["secret", "hidden", "twist"].includes(k)).map(([k, [lab]]) => [lab, cur.fields[k]])).then(ok => ok && toast("Posted to Discord (secrets left out)"));
    $("#aSave", el).onclick = () => {
      const notes = c().notes; const ex = notes.find(n => n.forgeId === cur.id);
      const body = text(cur, false).replace(/^([^:\n]+): /gm, "**$1:** ");
      if (ex) { ex.title = cur.title; ex.body = body; ex.updated = Date.now(); toast("Updated in Codex"); }
      else { notes.unshift({ id: uid(), forgeId: cur.id, title: cur.title, cat: g.noteCat, tags: "", body, updated: Date.now() }); toast(`Saved to Codex · ${g.noteCat}`); }
      save(); App.refreshAll();
    };
    $("#aPin", el).onclick = () => {
      const lines = Object.entries(g.fields).filter(([k]) => !(g.hidden || []).includes(k)).slice(0, 4).map(([k, [lab]]) => `${lab}: ${cur.fields[k]}`);
      App.pinToBoard({ type: "gen", kind: cur.kind, color: m.color, title: cur.title, text: g.sub(cur.ctx, cur.fields) + "\n\n" + lines.join("\n") });
    };
  }
  function renderDraws() {
    const row = $("#fDraws", el); const r = c().recent;
    row.innerHTML = r.length ? "" : `<div style="color:var(--faint);font-size:14px">Cards you draw stack up here.</div>`;
    for (const x of r) {
      if (!GEN[x.kind]) continue;
      const b = h(`<button class="mini k-${x.kind}"><small>${esc(GEN[x.kind].label)}</small><b>${esc(x.title)}</b></button>`);
      b.onclick = () => { st.cur = x; st.kind = x.kind; renderDecks(); renderOpts(); renderCard(true); };
      row.append(b);
    }
  }
  function quickNames() {
    const a = $("#qnAnc", el).value, box = $("#qnList", el); box.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const anc = a === "any" ? Object.keys(NAMES)[Math.floor(Math.random() * Object.keys(NAMES).length)] : a;
      const n = makeName(anc); const b = h(`<button class="chip" title="${esc(NAMES[anc].label)}">${esc(n)}</button>`);
      b.onclick = () => copyText(n, `Copied ${n}`); box.append(b);
    }
  }
  $("#qnAnc", el).innerHTML = `<option value="any">Any ancestry</option>` + Object.entries(NAMES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
  $("#qnAnc", el).onchange = quickNames; $("#qnGo", el).onclick = quickNames;
  $("#fDraw", el).onclick = () => draw();
  $("#fClear", el).onclick = () => { c().recent = st.cur ? [st.cur] : []; save(); renderDraws(); };
  const onKey = e => {
    if (el.hidden || el.closest("[hidden]")) return;
    if (e.code === "Space" && !e.target.closest("input,textarea,select,button,[contenteditable]") && !document.querySelector(".modal-back")) { e.preventDefault(); draw(); }
  };
  addEventListener("keydown", onKey);

  renderDecks(); renderOpts(); quickNames();
  const last = c().recent[0];
  if (last && GEN[last.kind] && last.kind === st.kind) { st.cur = last; renderCard(true); renderDraws(); } else draw();
  return { refresh() { renderDraws(); }, show(arg) { if (arg?.draw) { st.kind = arg.draw; renderDecks(); renderOpts(); draw(); } }, destroy() { removeEventListener("keydown", onKey); } };
}
