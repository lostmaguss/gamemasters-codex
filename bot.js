// Player dice bot: players type /roll in Discord, the dice land on the GM's stream window,
// and the bot answers with the result. Runs in the main process with the GM's own bot token.
const { ipcMain } = require("electron");

let client = null, status = { state: "off" }, desk = null, appId = null, stats = [], lastChannel = null;
const pending = new Map();
const polls = new Map(); // party votes: id -> { msg, q, opts, votes: Map(userId -> { idx, name }) }
const COMMANDS = () => {
  const { SlashCommandBuilder } = require("discord.js");
  return [
    new SlashCommandBuilder().setName("roll").setDescription("Roll dice on the GM's table")
      .addStringOption(o => o.setName("dice").setDescription("Like 1d20+5, 2d6, 4dF, 8d6>=5").setRequired(true))
      .addStringOption(o => o.setName("for").setDescription("What it's for, like Stealth").setRequired(false)),
    new SlashCommandBuilder().setName("r").setDescription("Short for /roll")
      .addStringOption(o => o.setName("dice").setDescription("Like 1d20+5").setRequired(true))
      .addStringOption(o => o.setName("for").setDescription("What it's for").setRequired(false)),
    new SlashCommandBuilder().setName("check").setDescription("Roll one of your character's stats")
      .addStringOption(o => { o.setName("stat").setDescription("Which stat").setRequired(true); if (stats.length) o.addChoices(...stats.slice(0, 25).map(x => ({ name: x, value: x }))); return o; })
      .addIntegerOption(o => o.setName("bonus").setDescription("Extra bonus or penalty, like 2 or -1").setRequired(false)),
    new SlashCommandBuilder().setName("init").setDescription("Roll your initiative into the GM's combat tracker")
      .addStringOption(o => o.setName("dice").setDescription("Leave empty to use the table's rule").setRequired(false)),
    new SlashCommandBuilder().setName("me").setDescription("See your character sheet (only you see it)"),
    new SlashCommandBuilder().setName("stash").setDescription("See the party's money and loot"),
  ].map(c => c.toJSON());
};
const tell = () => desk && !desk.isDestroyed() && desk.webContents.send("bot:status", { ...status, invite: appId ? `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=2048` : null });

function handle(i) {
  const cmd = i.commandName === "r" ? "roll" : i.commandName || "roll";
  const who = i.member?.displayName || i.user?.globalName || i.user?.username || "Player";
  const names = [i.member?.displayName, i.user?.globalName, i.user?.username].filter(Boolean);
  if (i.channelId) lastChannel = i.channelId;
  const id = "bot-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const t = setTimeout(() => { pending.delete(id); i.editReply({ content: "The GM's table didn't answer. Is Gamemaster's Codex open?" }).catch(() => {}); }, 30000);
  pending.set(id, { i, t });
  const args = { dice: i.options.getString("dice"), label: i.options.getString("for") || "", stat: i.options.getString?.("stat"), bonus: i.options.getInteger?.("bonus") };
  return i.deferReply({ ephemeral: cmd === "me" }).then(() => desk && desk.webContents.send("bot:roll", { id, cmd, expr: args.dice, label: args.label, args, who, names, userId: i.user?.id || null, channelId: i.channelId || null }));
}
async function register() {
  if (!client?.isReady?.()) return;
  for (const g of client.guilds.cache.values()) await g.commands.set(COMMANDS()).catch(() => {});
}

async function start(token) {
  stop();
  if (!token) return;
  const { Client, GatewayIntentBits, Events } = require("discord.js");
  client = new Client({ intents: [GatewayIntentBits.Guilds] });
  status = { state: "connecting" }; tell();
  client.once(Events.ClientReady, async c => {
    appId = c.application?.id || c.user.id;
    status = { state: "online", tag: c.user.tag, servers: c.guilds.cache.size }; tell();
    for (const g of c.guilds.cache.values()) await g.commands.set(COMMANDS()).catch(e => { status = { ...status, warn: `Couldn't add /roll to ${g.name}: ${e.message}` }; tell(); });
  });
  client.on(Events.GuildCreate, g => { g.commands.set(COMMANDS()).catch(() => {}); status.servers = client.guilds.cache.size; tell(); });
  client.on(Events.InteractionCreate, i => {
    if (i.isButton?.() && i.customId.startsWith("poll|")) return vote(i).catch(() => {});
    if (i.isChatInputCommand?.() && ["roll", "r", "check", "init", "me", "stash"].includes(i.commandName)) handle(i).catch(() => {});
  });
  client.on(Events.Error, e => { status = { state: "error", error: String(e.message || e) }; tell(); });
  try { await client.login(token); }
  catch (e) {
    const m = String(e.message || e);
    status = { state: "error", error: /token/i.test(m) ? "Discord rejected the token. Copy it again from the Developer Portal (Bot → Reset Token)." : /ENOTFOUND|ECONN|ETIMEDOUT|network/i.test(m) ? "Couldn't reach Discord. Check your internet connection and try again." : /intent/i.test(m) ? "Discord refused the bot's permissions. Recreate the bot without extra intents." : m };
    client = null; tell();
  }
}
// ---- party votes: buttons under a question in the players' channel ----
const tally = p => p.opts.map((text, idx) => { const v = [...p.votes.values()].filter(x => x.idx === idx); return { text, n: v.length, names: v.map(x => x.name) }; });
const sendVotes = id => { const p = polls.get(id); if (p && desk && !desk.isDestroyed()) desk.webContents.send("bot:vote", { id, opts: tally(p) }); };
async function vote(i) {
  const [, id, idx] = i.customId.split("|"); const p = polls.get(id);
  if (!p || p.closed) return i.reply({ content: "This vote is closed.", ephemeral: true });
  const who = i.member?.displayName || i.user?.globalName || i.user?.username || "Player";
  p.votes.set(i.user?.id || who, { idx: +idx, name: who });
  await i.reply({ content: `You voted: **${p.opts[+idx]}**. Click another option to change your mind.`, ephemeral: true });
  sendVotes(id);
}
const rows = (id, opts, disabled = false) => {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  const out = [];
  for (let r = 0; r < opts.length; r += 5) out.push(new ActionRowBuilder().addComponents(...opts.slice(r, r + 5).map((t, k) => new ButtonBuilder().setCustomId(`poll|${id}|${r + k}`).setLabel(String(t).slice(0, 80)).setStyle(ButtonStyle.Secondary).setDisabled(disabled))));
  return out;
};
async function pickChannel(want) {
  for (const cid of [want, lastChannel]) { if (!cid) continue; const ch = await client.channels.fetch(cid).catch(() => null); if (ch?.isTextBased?.()) return ch; }
  for (const g of client.guilds.cache.values()) {
    if (g.systemChannel) return g.systemChannel;
    const ch = (await g.channels.fetch().catch(() => new Map())).find?.(x => x?.isTextBased?.() && x.permissionsFor?.(g.members.me)?.has?.("SendMessages"));
    if (ch) return ch;
  }
  return null;
}
async function poll({ op, id, q, opts, channel }) {
  const test = process.env.CODEX_BOT_TEST && !client;
  if (op === "open") {
    const p = { q, opts, votes: new Map(), msg: null };
    if (!test) {
      if (!client?.isReady?.()) return { ok: false, error: "The dice bot isn't connected." };
      const ch = await pickChannel(channel); if (!ch) return { ok: false, error: "The bot couldn't find a channel to post in. Have a player use /roll in your game channel once." };
      try { p.msg = await ch.send({ content: `🗳️ **The party decides:** ${q}`, components: rows(id, opts) }); }
      catch (e) { return { ok: false, error: /Missing Access|Missing Permissions/i.test(e.message) ? "The bot isn't allowed to post in that channel. Give it Send Messages there." : String(e.message || e) }; }
    }
    polls.set(id, p); return { ok: true, channel: p.msg?.channelId || null };
  }
  const p = polls.get(id); if (!p) return { ok: true };
  if (op === "close") {
    p.closed = true; const t = tally(p), top = Math.max(0, ...t.map(x => x.n));
    const lines = t.map(x => `${x.n === top && top > 0 ? "**" : ""}${x.text}: ${x.n}${x.n === top && top > 0 ? "**" : ""}${x.names.length ? ` (${x.names.join(", ")})` : ""}`);
    await p.msg?.edit({ content: `🗳️ **The party decided:** ${p.q}\n${lines.join("\n")}`, components: rows(id, p.opts, true) }).catch(() => {});
    polls.delete(id);
  }
  return { ok: true };
}

function stop() { if (client) { client.destroy().catch?.(() => {}); client = null; } status = { state: "off" }; tell(); }

function setup(getDesk) {
  ipcMain.on("bot:start", (_e, token) => { desk = getDesk(); start(token); });
  ipcMain.on("bot:stop", () => stop());
  ipcMain.handle("bot:status", () => ({ ...status }));
  // whispers: a direct message from the bot to one player
  ipcMain.handle("bot:dm", async (_e, { userId, content, title, file }) => {
    if (process.env.CODEX_BOT_TEST && userId === "test-user") return { ok: true, test: { content, title, file: file?.name } };
    if (!client?.isReady?.()) return { ok: false, error: "The dice bot isn't connected." };
    try {
      const u = await client.users.fetch(userId);
      const msg = { content: content ? content.slice(0, 1900) : undefined, embeds: title ? [{ title, color: 0xcfb2e2, description: content ? undefined : undefined }] : [] };
      if (file?.dataURL) { msg.files = [{ attachment: Buffer.from(file.dataURL.split(",")[1], "base64"), name: file.name || "handout.png" }]; if (title) msg.embeds[0].image = { url: `attachment://${file.name || "handout.png"}` }; }
      if (title && content) { msg.embeds[0].description = content.slice(0, 3900); delete msg.content; }
      await u.send(msg);
      return { ok: true };
    } catch (e) { return { ok: false, error: /Cannot send messages/i.test(e.message) ? "That player doesn't accept DMs from server members. They can allow it in the server's Privacy Settings." : String(e.message || e) }; }
  });
  ipcMain.on("bot:config", (_e, cfg) => { const next = (cfg.stats || []).filter(Boolean); if (JSON.stringify(next) !== JSON.stringify(stats)) { stats = next; register(); } });
  ipcMain.on("bot:result", (_e, { id, ok, error, embed }) => {
    const p = pending.get(id); if (!p) return;
    clearTimeout(p.t); pending.delete(id);
    p.i.editReply(ok ? { embeds: [embed], content: "" } : { content: error || "That roll didn't work." }).catch(() => {});
  });
  ipcMain.handle("bot:poll", (_e, cmd) => { desk = getDesk(); return poll(cmd); });
  // lets the test suite play a fake player without a real Discord connection
  if (process.env.CODEX_BOT_TEST) {
    ipcMain.handle("bot:fake", (_e, { cmd = "roll", dice, label, who, stat, bonus }) => new Promise(res => {
      desk = getDesk();
      const i = { commandName: cmd, options: { getString: k => ({ dice, for: label, stat })[k] ?? null, getInteger: k => k === "bonus" ? bonus ?? null : null }, member: { displayName: who }, user: { username: who.toLowerCase(), id: "test-user" }, deferReply: async () => {}, editReply: async m => res(m) };
      handle(i);
    }));
    ipcMain.handle("bot:fakeVote", (_e, { id, idx, who }) => vote({ customId: `poll|${id}|${idx}`, member: { displayName: who }, user: { id: "u-" + who }, reply: async () => {} }));
  }
}
module.exports = { setup, stop };
