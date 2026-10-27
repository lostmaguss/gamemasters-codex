// "What's new" after an update, so features don't go unnoticed.
import { esc } from "./util.js";
export const NEWS = [
  { v: "1.10.0", title: "Loot, encounters & music", items: ["Forge: Loot hoards and Encounters (built from your own bestiary when you have one)", "Codex page templates for NPCs, places, factions, quests and items", "Countdown timer on stream from the Stream view", "Music: add your own tracks and play them as a playlist", "F1 shows every keyboard shortcut"] },
  { v: "1.9.0", title: "Homebrew dice & world web", items: ["Exploding dice (3d6!), rerolls (4d6r1) and Fate dice (4dF) as real 3D dice", "World web: one click turns your Codex links into a corkboard of strings", "Show any Codex page on stream, or introduce it with a name card", "Introduce tonight's cast straight from Live", "Ctrl + and Ctrl − make the whole interface bigger or smaller"] },
  { v: "1.8.0", title: "Atmosphere & safety", items: ["Weather on stream: rain, snow, fog, embers, storm flashes, night tint, neon glitch (Stream and Live)", "Soundscapes: save a mix of loops (and weather) and start it with one click", "Daily automatic backups, restore from the campaign menu", "Ctrl+L logs what just happened from any screen"] },
  { v: "1.7.0", title: "Broadcast", items: ["Stream view: Starting soon countdown, chapter title, Previously on…, Break and end-card scenes", "Name cards that introduce characters TV-style", "Progress clocks for factions and threats, optionally on stream", "World calendar with your own months, weekdays and events"] },
  { v: "1.6.0", title: "Party sheets & search", items: ["Party view: character sheets with your own stats, resources and tabs", "Stat rolls follow your system: 1d20+{value}, dice pools, roll-under", "Party health bar on stream", "Ctrl+K finds anything and rolls anything"] },
  { v: "1.5.0", title: "Battle map", items: ["Maps with a grid, tokens and fog of war you paint away", "Tokens straight from the combat tracker", "The map on the stream window, fog and all"] },
  { v: "1.4.0", title: "Discord", items: ["Connect Discord channels with a webhook (campaign menu)", "Post rolls, handouts, turn order and recaps automatically or by button"] },
  { v: "1.3.0", title: "Sci-fi & cyberpunk", items: ["Genre setting: the Forge, sounds, tables, dice and app look change with it", "Neon and Void looks, new dice and table surfaces"] },
  { v: "1.2.0", title: "Combat & rules", items: ["Combat tracker with conditions that count down, turn order on stream", "Rules: which die crits, high or low is good, initiative order", "Roll-under (1d100<=45) and dice pools (8d6>=5)"] },
];
const cmp = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
export function unseen(seen) { return NEWS.filter(n => !seen || cmp(n.v, seen) > 0); }
export function newsHTML(list) {
  return list.map(n => `<section class="news"><div class="news-v mono">${esc(n.v)}</div><div><h3>${esc(n.title)}</h3><ul>${n.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div></section>`).join("");
}
