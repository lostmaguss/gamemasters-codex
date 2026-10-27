// Player dice bot: players type /roll in Discord, the dice land on the GM's stream window,
// and the bot answers with the result. Runs in the main process with the GM's own bot token.
const { ipcMain } = require("electron");

let client = null, status = { state: "off" }, desk = null, appId = null;
const pending = new Map();
const COMMANDS = () => {
  const { SlashCommandBuilder } = require("discord.js");
  return [
    new SlashCommandBuilder().setName("roll").setDescription("Roll dice on the GM's table")
      .addStringOption(o => o.setName("dice").setDescription("Like 1d20+5, 2d6, 4dF, 8d6>=5").setRequired(true))
      .addStringOption(o => o.setName("for").setDescription("What it's for, like Stealth").setRequired(false)),
    new SlashCommandBuilder().setName("r").setDescription("Short for /roll")
      .addStringOption(o => o.setName("dice").setDescription("Like 1d20+5").setRequired(true))
      .addStringOption(o => o.setName("for").setDescription("What it's for").setRequired(false)),
  ].map(c => c.toJSON());
};
const tell = () => desk && !desk.isDestroyed() && desk.webContents.send("bot:status", { ...status, invite: appId ? `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot%20applications.commands&permissions=2048` : null });

function handle(i) {
  const expr = i.options.getString("dice"), label = i.options.getString("for") || "";
  const who = i.member?.displayName || i.user?.globalName || i.user?.username || "Player";
  const id = "bot-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const t = setTimeout(() => { pending.delete(id); i.editReply({ content: "The GM's table didn't answer. Is Gamemaster's Codex open?" }).catch(() => {}); }, 30000);
  pending.set(id, { i, t });
  return i.deferReply().then(() => desk && desk.webContents.send("bot:roll", { id, expr, label, who }));
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
  client.on(Events.InteractionCreate, i => { if (i.isChatInputCommand?.() && (i.commandName === "roll" || i.commandName === "r")) handle(i).catch(() => {}); });
  client.on(Events.Error, e => { status = { state: "error", error: String(e.message || e) }; tell(); });
  try { await client.login(token); }
  catch (e) {
    const m = String(e.message || e);
    status = { state: "error", error: /token/i.test(m) ? "Discord rejected the token. Copy it again from the Developer Portal (Bot → Reset Token)." : /ENOTFOUND|ECONN|ETIMEDOUT|network/i.test(m) ? "Couldn't reach Discord. Check your internet connection and try again." : /intent/i.test(m) ? "Discord refused the bot's permissions. Recreate the bot without extra intents." : m };
    client = null; tell();
  }
}
function stop() { if (client) { client.destroy().catch?.(() => {}); client = null; } status = { state: "off" }; tell(); }

function setup(getDesk) {
  ipcMain.on("bot:start", (_e, token) => { desk = getDesk(); start(token); });
  ipcMain.on("bot:stop", () => stop());
  ipcMain.handle("bot:status", () => ({ ...status }));
  ipcMain.on("bot:result", (_e, { id, ok, error, embed }) => {
    const p = pending.get(id); if (!p) return;
    clearTimeout(p.t); pending.delete(id);
    p.i.editReply(ok ? { embeds: [embed] } : { content: error || "That roll didn't work." }).catch(() => {});
  });
  // lets the test suite play a fake player without a real Discord connection
  if (process.env.CODEX_BOT_TEST) {
    ipcMain.handle("bot:fake", (_e, { dice, label, who }) => new Promise(res => {
      desk = getDesk();
      const i = { options: { getString: k => k === "dice" ? dice : label }, member: { displayName: who }, deferReply: async () => {}, editReply: async m => res(m) };
      handle(i);
    }));
  }
}
module.exports = { setup, stop };
