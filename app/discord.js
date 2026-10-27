// Discord: post rolls, handouts, turn order and recaps to a channel through a webhook.
import { $, $$, esc, icon, toast, uid } from "./util.js";
import { C, save } from "./store.js";
import { breakdown, critLabel, shownTotal } from "./roll.js";

const COLOR = { roll: 0xff7a3d, crit: 0xffcf5a, fumble: 0xff5555, info: 0x5865f2, handout: 0xefe4cf, combat: 0xf39da8, ok: 0x6bd17d, no: 0xff6b6b };
export function settings(c = C()) { return (c.discord ||= { hooks: [], channel: null, autoRolls: false, autoHandouts: false, autoRounds: false, name: "" }); }
const hookFor = (c, id) => { const d = settings(c); return d.hooks.find(h => h.id === (id || d.channel)) || d.hooks[0]; };
export const connected = (c = C()) => !!hookFor(c);

let queue = Promise.resolve();
export function post(payload, { file, hook, quiet } = {}) {
  const c = C(), h = hookFor(c, hook);
  if (!h) { if (!quiet) toast("Connect a Discord channel first (campaign menu → Discord)"); return Promise.resolve(false); }
  if (!window.codex?.discord) { if (!quiet) toast("Posting to Discord works in the desktop app"); return Promise.resolve(false); }
  const body = { username: settings(c).name || c.name || "Gamemaster's Codex", allowed_mentions: { parse: [] }, ...payload };
  // one post at a time keeps Discord's rate limit happy and the order right
  queue = queue.then(async () => {
    const r = await window.codex.discord({ url: h.url, payload: body, file });
    if (!r.ok && !quiet) toast(`Discord: ${r.error || "post failed (" + r.status + ")"}`);
    await new Promise(res => setTimeout(res, 350));
    return r.ok;
  });
  return queue;
}

export function postRoll(r, opts) {
  if (r.secret) return;
  const color = r.crit ? COLOR.crit : r.fumble ? COLOR.fumble : r.success === true ? COLOR.ok : r.success === false ? COLOR.no : COLOR.roll;
  const banner = critLabel(r);
  return post({ embeds: [{ color, author: { name: r.label || r.expr }, title: `${shownTotal(r)}${r.successMode && r.single == null ? ` success${r.total === 1 ? "" : "es"}` : ""}${banner ? `  ·  ${banner}` : ""}`, description: "`" + breakdown(r) + "`" }] }, opts);
}
export function postHandout(hd, opts) {
  if (hd.type === "image") {
    const ext = (hd.src.match(/data:image\/(\w+)/) || [, "png"])[1].replace("jpeg", "jpg");
    const name = `handout.${ext}`;
    return post({ embeds: [{ color: COLOR.handout, title: hd.title || "Handout", image: { url: `attachment://${name}` } }] }, { ...opts, file: { dataURL: hd.src, name } });
  }
  return post({ embeds: [{ color: COLOR.handout, title: hd.title || "Handout", description: String(hd.text || "").slice(0, 4000) }] }, opts);
}
export function postCombat(state, opts) {
  if (!state.show) return;
  const lines = state.list.map(x => `${x.current ? "▶ **" : "　"}${x.name}${x.current ? "**" : ""}${x.status && x.kind !== "pc" ? ` · *${x.status}*` : ""}${x.conds.length ? ` · ${x.conds.join(", ")}` : ""}`);
  return post({ embeds: [{ color: COLOR.combat, title: `Round ${state.round}`, description: lines.join("\n").slice(0, 4000) }] }, opts);
}
export function postText(title, text, opts) {
  // Discord embeds cap at 4096 characters, so long recaps go out in parts
  const parts = []; let rest = String(text || "");
  while (rest.length) { let cut = rest.length > 3900 ? rest.lastIndexOf("\n", 3900) : rest.length; if (cut < 1000) cut = Math.min(3900, rest.length); parts.push(rest.slice(0, cut)); rest = rest.slice(cut); }
  return Promise.all(parts.map((p, i) => post({ embeds: [{ color: COLOR.info, title: i ? `${title} (cont.)` : title, description: p }] }, opts)));
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
    </div>
    <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
    const rows = $("#dhRows", m);
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
      Object.assign(d, { hooks: draft.filter(h => h.url), channel: def, name: $("#dhName", m).value.trim(), autoRolls: $("#dhR", m).checked, autoHandouts: $("#dhH", m).checked, autoRounds: $("#dhC", m).checked });
      if (!d.hooks.some(h => h.id === d.channel)) d.channel = d.hooks[0]?.id || null;
      save(); close(); toast(d.hooks.length ? "Discord settings saved" : "Discord disconnected"); App.refreshAll();
    };
    draw();
  });
}
