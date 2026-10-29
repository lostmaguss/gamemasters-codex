// System kits: a game system's own Forge content, random tables and ready-to-play adventure.
// Systems without a kit use their genre's Forge and starter tables.
import * as dnd5e from "./kit-dnd5e.js";
import * as coc from "./kit-coc.js";
import { uid } from "./util.js";

export const KITS = { dnd5e, coc };
// CoC has its own period tables in place of the fantasy starters
const OWN_STARTERS = new Set(["coc"]);
export const kitFor = id => KITS[id] || null;
export const ownStarters = id => OWN_STARTERS.has(id);

const mk = (name, folder, rows) => ({ id: uid(), name, folder, rows: rows.map(r => Array.isArray(r) ? { id: uid(), w: r[0], text: r[1] } : { id: uid(), w: 1, text: r }), hist: [] });
export const systemTables = id => KITS[id]?.tables(mk) || [];
// add the system's tables a campaign doesn't have yet; returns how many were added
export function addSystemTables(c) {
  const have = new Set(c.tables.map(t => t.name.toLowerCase() + "|" + (t.folder || "")));
  const add = systemTables(c.system).filter(t => !have.has(t.name.toLowerCase() + "|" + (t.folder || "")));
  c.tables.push(...add);
  return add.length;
}
