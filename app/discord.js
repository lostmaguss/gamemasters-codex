// Discord: post rolls, handouts, turn order and recaps to a channel through a webhook.
import { t } from "./i18n.js";
import { $, $$, esc, icon, toast, uid, toDataURL } from "./util.js";
import { C, S, save } from "./store.js";
import { breakdown, critLabel, shownTotal, successWord } from "./roll.js";

const COLOR = { roll: 0xff7a3d, crit: 0xffcf5a, fumble: 0xff5555, info: 0x5865f2, handout: 0xefe4cf, combat: 0xf39da8, ok: 0x6bd17d, no: 0xff6b6b };
export function settings(c = C()) { return (c.discord ||= { hooks: [], channel: null, autoRolls: false, autoHandouts: false, autoRounds: false, name: "" }); }
const hookFor = (c, id) => { const d = settings(c); return d.hooks.find(h => h.id === (id || d.channel)) || d.hooks[0]; };
export const connected = (c = C()) => !!hookFor(c);

let queue = Promise.resolve();
export function post(payload, { file, files, hook, quiet } = {}) {
  const c = C(), h = hookFor(c, hook);
  if (!h) { if (!quiet) toast("Connect a Discord channel first (campaign menu → Discord)"); return Promise.resolve(false); }
  if (!window.codex?.discord) { if (!quiet) toast("Posting to Discord works in the desktop app"); return Promise.resolve(false); }
  const body = { username: settings(c).name || c.name || "Gamemaster's Codex", allowed_mentions: { parse: [] }, ...payload };
  // one post at a time keeps Discord's rate limit happy and the order right
  queue = queue.then(async () => {
    const r = await window.codex.discord({ url: h.url, payload: body, file, files });
    if (!r.ok && !quiet) toast(`Discord: ${r.error || "post failed (" + r.status + ")"}`);
    await new Promise(res => setTimeout(res, 350));
    return r.ok;
  });
  return queue;
}

export function rollEmbed(r) {
  const color = r.crit ? COLOR.crit : r.fumble ? COLOR.fumble : r.success === true ? COLOR.ok : r.success === false ? COLOR.no : COLOR.roll;
  const banner = critLabel(r, t);
  return { color, author: { name: [r.who, r.label || r.expr].filter(Boolean).join(" · ") }, title: `${shownTotal(r)}${r.successMode && r.single == null ? " " + successWord(r, t) : ""}${banner ? `  ·  ${banner}` : ""}`, description: "`" + breakdown(r) + "`" };
}
export function postRoll(r, opts) {
  if (r.secret) return;
  return post({ embeds: [rollEmbed(r)] }, opts);
}
export async function postHandout(hd, opts) {
  if (hd.type === "image") {
    const src = await toDataURL(hd.src);
    const ext = (src.match(/data:image\/(\w+)/) || [, "png"])[1].replace("jpeg", "jpg");
    const name = `handout.${ext}`;
    return post({ embeds: [{ color: COLOR.handout, title: hd.title || t("Handout"), image: { url: `attachment://${name}` } }] }, { ...opts, file: { dataURL: src, name } });
  }
  return post({ embeds: [{ color: COLOR.handout, title: hd.title || t("Handout"), description: String(hd.text || "").slice(0, 4000) }] }, opts);
}
export function postCombat(state, opts) {
  if (!state.show) return;
  const lines = state.list.map(x => `${x.current ? "▶ **" : "　"}${x.name}${x.current ? "**" : ""}${x.status && x.kind !== "pc" ? ` · *${x.status}*` : ""}${x.conds.length ? ` · ${x.conds.join(", ")}` : ""}`);
  return post({ embeds: [{ color: COLOR.combat, title: t("Round {n}", { n: state.round }), description: lines.join("\n").slice(0, 4000) }] }, opts);
}
export function postText(title, text, opts) {
  // Discord embeds cap at 4096 characters, so long recaps go out in parts
  const parts = []; let rest = String(text || "");
  while (rest.length) { let cut = rest.length > 3900 ? rest.lastIndexOf("\n", 3900) : rest.length; if (cut < 1000) cut = Math.min(3900, rest.length); parts.push(rest.slice(0, cut)); rest = rest.slice(cut); }
  return Promise.all(parts.map((p, i) => post({ embeds: [{ color: COLOR.info, title: i ? `${title} (cont.)` : title, description: p }] }, opts)));
}
// the session's recap card: highlights, quotes, MVP, loot, decisions, cliffhanger,
// with up to four of the pictures shown that night as a gallery
export async function postRecap(s, opts = {}) {
  const c = C(), strip = t => String(t || "").replace(/\[\[([^\]]+)\]\]/g, "$1");
  const clip = (t, n) => { t = String(t); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
  const field = (name, lines, n = 1000) => lines.length ? [{ name, value: clip(lines.join("\n"), n), inline: false }] : [];
  const stars = (s.beats || []).filter(b => b.star && b.text).map(b => "- " + strip(b.text));
  const happened = stars.length ? stars : (s.beats || []).filter(b => b.text).slice(-5).map(b => "• " + strip(b.text));
  const quotes = (s.quotes || []).filter(q => q.line).slice(0, 3).map(q => `> "${q.line}" (${q.who || "someone"})`);
  const sp = Object.entries(s.spotlight || {}).sort((a, b) => b[1] - a[1]), top = sp[0]?.[1] || 0;
  const mvps = s.mvp ? [c.party.find(m => m.id === s.mvp)].filter(Boolean) : top ? sp.filter(x => x[1] === top).map(([id]) => c.party.find(m => m.id === id)).filter(Boolean) : [];
  const loot = (s.loot || []).filter(l => l.item).map(l => l.item + (l.to ? ` → ${l.to}` : ""));
  const votes = (s.beats || []).filter(b => /^The party voted:/.test(b.text || "")).map(b => "Vote: " + b.text.replace(/^The party voted:\s*/, ""));
  const next = c.ui.cast?.next;
  const imgs = [];
  for (const id of (s.shown || []).slice(-4)) {
    const hd = c.handouts.find(h => h.id === id); if (!hd || hd.type !== "image" || !hd.src) continue;
    try { const src = await toDataURL(hd.src); const ext = (src.match(/data:image\/(\w+)/) || [, "png"])[1].replace("jpeg", "jpg"); imgs.push({ dataURL: src, name: `pic${imgs.length}.${ext}`, title: hd.title }); } catch {}
  }
  const url = "https://github.com/lostmaguss/gamemasters-codex"; // shared url groups the images into one gallery
  const main = {
    color: COLOR.crit, url, title: clip(`${t("Session {n}", { n: s.num })}${s.title ? ": " + s.title : ""}`, 250),
    description: clip([s.ingame && `*${s.ingame}*`, happened.length ? "" : strip(s.recap)].filter(Boolean).join("\n"), 2000) || undefined,
    fields: [...field(t(stars.length ? "Highlights" : "What happened"), happened), ...field(t("Said at the table"), quotes), ...field(t("MVP"), mvps.map(m => `🏆 ${m.character || m.player}`)), ...field(t("The party decided"), votes), ...field(t("Loot"), [loot.join(", ")].filter(Boolean)), ...field(t("Where we left off"), s.cliff ? [`||${strip(s.cliff)}||`] : []), ...field(t("Next session"), next ? [next] : [])],
    footer: { text: [c.name, s.hours ? t("{h} h played", { h: s.hours }) : ""].filter(Boolean).join(" · ") },
  };
  if (imgs[0]) main.image = { url: `attachment://${imgs[0].name}` };
  const embeds = [main, ...imgs.slice(1).map(f => ({ url, image: { url: `attachment://${f.name}` } }))];
  return post({ embeds }, { ...opts, files: imgs.map(({ dataURL, name }) => ({ dataURL, name })) });
}
export function postCard(title, sub, fields, opts) {
  return post({ embeds: [{ color: COLOR.info, title, description: sub ? `*${sub}*` : "", fields: fields.slice(0, 20).map(([name, value]) => ({ name, value: String(value).slice(0, 1000) || "—", inline: false })) }] }, opts);
}

export function discordModal(App) {
  const c = C(), d = settings(c), draft = d.hooks.map(h => ({ ...h }));
  App.modal(`<h2>Discord</h2>
    <p style="margin:0;color:var(--dim)">Post rolls, handouts, the turn order and session recaps into a Discord channel. In Discord: <b>channel settings → Integrations → Webhooks → New Webhook → Copy Webhook URL</b>, then paste it here. Secret rolls are never posted.</p>
    <div id="dhRows" style="display:flex;flex-direction:column;gap:8px"></div>
    <button class="btn sm" id="dhAdd" style="align-self:flex-start">${icon("plus")} Add a channel</button>
    <label class="f"><span>Post as</span><input type="text" id="dhName" value="${esc(d.name)}" placeholder="${esc(c.name)}"></label>
    <div style="display:flex;flex-direction:column;gap:8px">
      <label class="toggle"><input type="checkbox" id="dhR" ${d.autoRolls ? "checked" : ""}> Post every public roll automatically</label>
      <label class="toggle"><input type="checkbox" id="dhH" ${d.autoHandouts ? "checked" : ""}> Post handouts when I show them on stream</label>
      <label class="toggle"><input type="checkbox" id="dhC" ${d.autoRounds ? "checked" : ""}> Post the turn order at the start of each combat round</label>
      <label class="toggle"><input type="checkbox" id="dhS" ${d.autoSessions ? "checked" : ""}> Post "Previously on…" when a session starts, and a summary when it ends</label>
    </div>
    <div class="bot-box">
      <div class="row" style="justify-content:space-between"><h3 style="font-size:22px">Player dice bot <span class="eyebrow">experimental</span></h3><span class="eyebrow" id="botState">Off</span></div>
      <p style="margin:0;color:var(--dim);font-size:14px">Players type <code>/roll 1d20+5 Stealth</code> in your server; the dice land on your stream window with their name, and the bot replies with the result.</p>
      <details><summary>How to make the bot (5 minutes, once)</summary><ol class="bot-steps">
        <li>Open <b>discord.com/developers/applications</b> → <b>New Application</b>, name it (for example "Codex Dice").</li>
        <li>Go to <b>Bot</b> → <b>Reset Token</b> → copy the token and paste it below. Keep it private, like a password.</li>
        <li>Press <b>Connect</b>. When it says online, open the <b>invite link</b> that appears and add the bot to your server.</li>
        <li>In Discord, type <code>/roll</code>. Rolls only work while this app is open.</li>
        <li>Put each player's Discord name on their party sheet, and they can use <code>/check Agility</code> (their own stat and formula), <code>/init</code> (straight into your combat tracker) , <code>/me</code> (their sheet, only they see it) and <code>/stash</code> (the party's money and loot).</li></ol></details>
      <div class="row"><input type="password" id="botTok" placeholder="Bot token" value="${esc(S.data.prefs.bot?.token || "")}" style="flex:1" autocomplete="off"><button class="btn" id="botGo">Connect</button><button class="btn ghost" id="botOff">Disconnect</button></div>
      <div id="botInv"></div>
    </div>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
    const rows = $("#dhRows", m);
    const showBot = st => {
      if (!$("#botState", m)) return;
      $("#botState", m).textContent = st.state === "online" ? `Online as ${st.tag}${st.servers != null ? ` · ${st.servers} server${st.servers === 1 ? "" : "s"}` : ""}` : st.state === "connecting" ? "Connecting…" : st.state === "error" ? "Not connected" : "Off";
      $("#botState", m).style.color = st.state === "online" ? "var(--good)" : st.state === "error" ? "var(--bad)" : "";
      $("#botInv", m).innerHTML = (st.error ? `<p class="md-help" style="color:var(--bad);margin:0">${esc(st.error)}</p>` : "") + (st.warn ? `<p class="md-help" style="margin:0">${esc(st.warn)}</p>` : "") + (st.invite ? `<p class="md-help" style="margin:0">Invite link (open in your browser): <code class="sel">${esc(st.invite)}</code> <button class="btn sm" id="botCopy">Copy</button></p>` : "");
      $("#botCopy", m)?.addEventListener("click", () => navigator.clipboard.writeText(st.invite).then(() => toast("Invite link copied"), () => toast("Select the link and copy it")));
    };
    if (window.codex?.bot) { window.codex.bot.status().then(showBot); App._botStatus = showBot; }
    $("#botGo", m).onclick = () => { const t = $("#botTok", m).value.trim(); if (!t) return toast("Paste the bot token first"); if (!window.codex?.bot) return toast("The bot works in the desktop app"); S.data.prefs.bot = { token: t, on: true }; save(); window.codex.bot.start(t); };
    $("#botOff", m).onclick = () => { S.data.prefs.bot = { ...(S.data.prefs.bot || {}), on: false }; save(); window.codex?.bot?.stop(); };
    let def = d.channel || draft[0]?.id;
    const draw = () => {
      rows.innerHTML = draft.length ? draft.map((h, i) => `<div class="dh-row" data-i="${i}"><input type="radio" name="dhDef" ${h.id === def ? "checked" : ""} title="Default channel"><input type="text" data-k="name" value="${esc(h.name)}" placeholder="#table" style="width:130px"><input type="text" data-k="url" value="${esc(h.url)}" placeholder="https://discord.com/api/webhooks/…" class="mono" style="flex:1;font-size:12px"><button class="btn sm" data-test>Test</button><button class="btn sm icon ghost danger" data-del>${icon("x")}</button></div>`).join("")
        : `<p style="margin:0;color:var(--faint)">No channels yet.</p>`;
      $$(".dh-row", rows).forEach(r => {
        const h = draft[+r.dataset.i];
        $$("[data-k]", r).forEach(inp => inp.oninput = () => h[inp.dataset.k] = inp.value.trim());
        $("input[type=radio]", r).onchange = () => def = h.id;
        $("[data-del]", r).onclick = () => { draft.splice(+r.dataset.i, 1); draw(); };
        $("[data-test]", r).onclick = async () => {
          if (!window.codex?.discord) return toast("Testing works in the desktop app");
          const res = await window.codex.discord({ url: h.url, payload: { username: $("#dhName", m).value || c.name, embeds: [{ color: COLOR.ok, title: "Codex connected", description: `This channel will get posts from **${c.name}**.` }] } });
          toast(res.ok ? `Posted to ${h.name || "the channel"}` : `Didn't work: ${res.error || res.status}`);
        };
      });
    };
    $("#dhAdd", m).onclick = () => { const h = { id: uid(), name: draft.length ? "" : "#table", url: "" }; draft.push(h); if (!def) def = h.id; draw(); $$(".dh-row input[data-k=url]", rows).pop()?.focus(); };
    $("[data-x]", m).onclick = close;
    $("[data-ok]", m).onclick = () => {
      Object.assign(d, { hooks: draft.filter(h => h.url), channel: def, name: $("#dhName", m).value.trim(), autoRolls: $("#dhR", m).checked, autoHandouts: $("#dhH", m).checked, autoRounds: $("#dhC", m).checked, autoSessions: $("#dhS", m).checked });
      if (!d.hooks.some(h => h.id === d.channel)) d.channel = d.hooks[0]?.id || null;
      save(); close(); toast(d.hooks.length ? "Discord settings saved" : "Discord disconnected"); App.refreshAll();
    };
    draw();
  });
}
