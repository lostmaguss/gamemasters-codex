// Campaign data: one JSON file on disk (via the Electron preload), localStorage when run in a browser.
import { uid, toast } from "./util.js";

export const S = { data: null };
const listeners = new Set();
export const onSaved = fn => listeners.add(fn);

export function blankCampaign(name = "New campaign") {
  return {
    id: uid(), name, created: Date.now(), tagline: "",
    party: [], notes: [], sessions: [],
    boards: [{ id: uid(), name: "Main board", cards: [], links: [], view: { x: 0, y: 0, z: 1 } }],
    recent: [], rolls: [], presets: [
      { id: uid(), name: "Attack", expr: "1d20" }, { id: uid(), name: "Ability check", expr: "1d20" },
    ],
    tables: starterTables(), bestiary: [], sounds: [], handouts: [],
    statTemplate: ["HP", "Defense", "Speed", "Might", "Agility", "Wits", "Will"],
    rules: { critDie: 20, critMode: "high", initHigh: true }, genre: "fantasy",
    ui: {},
  };
}

const T_CYBER_RUMOR = ["A megacorp is buying the whole district", "Someone's selling military chrome out of a food truck", "A rogue AI is haunting the local subnet", "The cops stopped answering calls in the Combat Zone", "A braindance shows something the corp wants buried", "A fixer died and their client list is up for grabs", "The new street drug lets you see the net with your eyes", "An orbital station went dark last night"];
export function starterTables(genre = "fantasy") {
  const t = (name, folder, rows) => ({ id: uid(), name, folder, rows: rows.map(r => Array.isArray(r) ? { id: uid(), w: r[0], text: r[1] } : { id: uid(), w: 1, text: r }), hist: [] });
  if (genre === "cyberpunk") return [
    t("Street encounter", "Cyberpunk · Encounters", ["{1d6+1} gangers shaking down a vendor", "A cyberpsycho episode two blocks over, sirens incoming", "A corp AV lands and a kill team steps out", "A street kid offers to sell you your own stolen data", "A trauma team extraction in progress. Don't get in the way", "A drone falls out of the sky, still twitching", "Cops running a checkpoint, scanning implants", "A braindance addict stumbling into traffic", "A fixer's runner with a package and a bullet wound", "A blackout rolls across the block: @{Night weather}", "A street preacher who knows your name", "A rival crew, also casing the same job"]),
    t("Night weather", "Cyberpunk · World", [[3, "Acid drizzle, neon smearing in the puddles"], [2, "Smog so thick the drones fly low"], [2, "Dry, hot, the AC failing everywhere"], [1, "A real storm. Power flickers citywide"], [1, "Ash from a refinery fire upwind"], [1, "Clear night, rare enough that people stop to look"]]),
    t("Street rumor", "Cyberpunk · Social", T_CYBER_RUMOR),
    t("Pocket loot", "Cyberpunk · Loot", ["{2d6}0 eddies on a cred chip", "A burner phone with one saved contact", "A used inhaler of black-market stims", "A data shard labelled 'DO NOT'", "A gang token worth a favor", "A corp keycard, three days expired", "A photo of the target, with your face circled", "Spare optics in a jar", "A pistol with the serial burned off", "Nothing but a receipt from a noodle bar"]),
    t("Netrun glitch", "Cyberpunk · Net", ["Black ICE wakes up", "The system notices you and sends a polite warning", "You find someone else already inside", "A ghost of a dead runner offers help", "Your deck overheats: {1d6} damage", "The data is fake, a honeypot", "A door opens into the corp's camera feeds", "The AI talks to you directly"]),
    t("Complication", "Cyberpunk · Plot", ["The client's account just got frozen", "The cops show up and they're on someone's payroll", "A crew member's implant gets a remote shutdown order", "The target livestreams the whole thing", "The building AI locks every door", "A rival fixer outbids your client mid-job", "The car you stole has a tracker", "The data is encrypted with a crew member's biometrics"]),
  ];
  if (genre === "scifi") return [
    t("Deep space encounter", "Sci-fi · Encounters", ["A derelict tumbling slowly, no transponder", "Pirates demanding cargo: {1d4+1} ships", "A Union patrol requesting inspection", "A distress call with a 200-year-old timestamp", "An asteroid field that wasn't on the charts", "A colony ship drifting with its crew in cryo", "Something huge passes under the ship, on sensors only", "A trader offering fuel at a suspicious price", "Another ship mirroring your course exactly", "Space weather: @{Ship malfunction}"]),
    t("Ship malfunction", "Sci-fi · Ship", ["Life support at {2d4}0%", "Jump drive misfires", "A hull breach in the cargo bay", "The AI reboots and forgets the crew", "Gravity cuts out for an hour", "Sensors show a contact that isn't there", "Power surge fries the galley", "A coolant leak in engineering"]),
    t("Station rumor", "Sci-fi · Social", ["The station's AI has been lying to the governor", "A ship docked with no crew aboard", "Someone's buying up all the medgel", "The Union is about to seal off the sector", "A precursor ruin was found on the moon below", "The water recycler is making people sick", "A famous bounty hunter just arrived", "Dock 7 is closed and nobody says why"]),
    t("Salvage find", "Sci-fi · Loot", ["{2d6}00 credits of scrap", "A working navigation core", "A cryo pod, occupied", "An unregistered AI chip", "Military rations, decades old", "A flight recorder with the last minutes erased", "An alien artifact humming quietly", "A crate of medgel injectors"]),
    t("Alien world weather", "Sci-fi · World", [[3, "Thin air, cold, clear"], [2, "Dust storms that strip paint"], [2, "Acid rain"], [1, "Electrical storms with green lightning"], [1, "Spore season. Everything is glowing"], [1, "Gravity tides shift at dusk"]]),
    t("Complication", "Sci-fi · Plot", ["The cargo is alive", "Customs impounds the ship", "A crew member is infected", "The jump window closes early", "The client is a Union agent", "Oxygen leak, {1d6} hours left", "A stowaway is discovered", "The AI refuses an order"]),
  ];
  return [
    t("Weather", "World", [[3, "Clear and cold"], [2, "Low fog that hides the road"], [2, "Steady drizzle"], [2, "Hard rain, rivers rising"], [1, "Thunderstorm. Lightning strikes something nearby"], [1, "Biting wind from the north"], [1, "Early snow"], [1, "A red sky nobody can explain"]]),
    t("Road encounter", "Encounters", ["{1d6+1} bandits demanding a toll", "A merchant caravan with a broken axle", "Weather turns: @{Weather}", "Pilgrims singing hymns to a dead god", "{2d4} starving wolves", "A wounded knight begging for help", "A roadside shrine with fresh offerings, and fresh blood", "An abandoned cart, the cookfire still warm", "A Crown patrol checking papers", "A child alone on the road, with no footprints behind them", "Rival adventurers after the same thing", "A crow that won't stop following the party"]),
    t("Tavern rumor", "Social", ["The old mine reopened, but the miners don't come home", "A dragon was seen over the hills, or a very large bird", "The baron's heir is an impostor", "Someone is paying gold for black cats", "The river ran red for an hour last week", "A ghost ship docks on moonless nights", "The priest hasn't aged in forty years", "The bandits on the north road are unpaid soldiers", "A tower appeared overnight in the marsh", "The well water lets you hear the dead"]),
    t("Trinket", "Loot", ["A glass eye that follows movement", "A tin soldier missing its head", "A love letter, never sent", "A key that's always warm", "A tooth carved with a tiny map", "A music box that plays a song nobody knows", "A coin from a kingdom that doesn't exist", "A vial of sand that falls upward", "A wedding ring engraved with your name", "A pressed flower that never wilts", "A deck of cards with one card missing", "A compass pointing at the nearest grave"]),
    t("Dungeon dressing", "Encounters", ["Scratch marks counting days on the wall", "A collapsed statue, face down", "Puddles that don't reflect anything", "A cold draft from a solid wall", "Bones arranged in a careful spiral", "A cell door, unlocked, swinging slowly", "Old campfire ashes and a torn map", "Fresh footprints that stop mid-room", "A mural of the party, faded with age", "Candles still burning, no one in sight"]),
    t("Complication", "Plot", ["An ally betrays them for a better offer", "The authorities arrive at the worst moment", "The thing they need was moved last night", "A storm cuts them off", "Someone they trust is an impostor", "The reward was a lie", "A rival gets there first", "An innocent is caught in the middle", "The magic fails at the crucial moment", "An old enemy calls in a debt"]),
    t("Hit location", "Combat", [[1, "Head"], [2, "Left arm"], [2, "Right arm"], [4, "Torso"], [1, "Left leg"], [1, "Right leg"]]),
  ];
}

function sampleCampaign() {
  const c = blankCampaign("The Ash Crown");
  c.tagline = "Frontier dark fantasy · homebrew";
  const p = [["Deniz", "Varka Stormtusk", "Brawler", "#ef7f8f"], ["Ece", "Lirien Moonwhisper", "Hexblade", "#c39bd3"], ["Mert", "Bodo Thistlefoot", "Scout", "#a7cf9e"], ["Selin", "Sister Oriel", "Healer", "#8fc3d9"]];
  const st = [[3, 1, 0, 1, 26], [0, 2, 2, 1, 18], [0, 3, 1, 0, 16], [1, 0, 1, 3, 20]];
  c.party = p.map(([player, character, role, color], i) => ({ id: uid(), player, character, role, color,
    stats: { Might: st[i][0], Agility: st[i][1], Wits: st[i][2], Will: st[i][3] }, res: { HP: { cur: st[i][4], max: st[i][4] } }, conds: [],
    text: { Abilities: ["Rage: double damage for a round, then exhausted", "Hex: curse one target, they roll twice and take the worse", "Sneak attack: +1d6 when unseen", "Mend: heal 1d8+Will, three times a day"][i] } }));
  const n1 = { id: uid(), title: "Millford", cat: "Locations", tags: "river town, act 1", pinned: true, updated: Date.now(),
    body: "# Millford\nA walled river town under the **Ash Crown's** occupation. The mill wheel hasn't turned since the dam was seized.\n\n- Ruled by [[Magistrate Corwin Hale]]\n- The Drunken Lantern is where the resistance meets\n- Rumor: the old well lets you hear the dead" };
  const n2 = { id: uid(), title: "Magistrate Corwin Hale", cat: "NPCs", tags: "villain, millford", updated: Date.now(),
    body: "Collaborator. Polite, tired, and terrified of his own masters.\n\n**Wants:** to keep his daughter out of the Crown's hands.\n**Secret:** he's been feeding the resistance false maps.\n\nRuns [[Millford]] on the Crown's behalf." };
  const n3 = { id: uid(), title: "Example note (delete me)", cat: "Lore", tags: "example", updated: Date.now(),
    body: "This campaign is a sample so you can see how things fit together. Make your own from the campaign menu in the top bar, or edit this one.\n\nLink notes by writing a title in double brackets, like [[Millford]]." };
  c.notes = [n1, n2, n3];
  const b = c.boards[0];
  const k = (type, x, y, w, color, title, text, extra = {}) => ({ id: uid(), type, x, y, w, color, rot: (Math.random() * 4 - 2).toFixed(2), title, text, z: 1, ...extra });
  const h1 = k("heading", 40, 30, 340, "paper", "Who holds Millford?", "");
  const a = k("ref", 60, 150, 240, "lichen", "", "", { ref: n1.id });
  const bb = k("ref", 420, 140, 240, "rose", "", "", { ref: n2.id });
  const cc = k("note", 260, 380, 220, "mustard", "", "The dam. Who controls the water controls the town.");
  const dd = k("note", 560, 400, 230, "sky", "", "Hale's daughter, Ysolde. Last seen at the Shrine of the Veiled Moon.");
  b.cards = [h1, a, bb, cc, dd];
  b.links = [{ id: uid(), a: a.id, b: bb.id, color: "red" }, { id: uid(), a: bb.id, b: dd.id, color: "red" }, { id: uid(), a: a.id, b: cc.id, color: "black" }];
  b.view = { x: 60, y: 40, z: 1 };
  c.bestiary = [
    { id: uid(), name: "Crown Soldier", kind: "Human, trained", tags: "ash crown, millford", threat: 2, hp: "14",
      stats: { HP: "14", Defense: "13", Speed: "Normal", Might: "+2", Agility: "+1", Wits: "0", Will: "+1" },
      abilities: [{ id: uid(), name: "Halberd", roll: "1d20+4", text: "Reach. On a hit: 1d10+2 damage." }, { id: uid(), name: "Halberd damage", roll: "1d10+2", text: "" }, { id: uid(), name: "Shield wall", roll: "", text: "When two soldiers stand together, both get +2 Defense." }],
      notes: "Fights in pairs. Breaks and runs when their sergeant falls.", loot: "{2d6} Crown silver, a passage token" },
    { id: uid(), name: "Drowned Hound", kind: "Undead beast", tags: "shrine, river", threat: 3, hp: "22",
      stats: { HP: "22", Defense: "12", Speed: "Fast", Might: "+3", Agility: "+2", Wits: "-2", Will: "+4" },
      abilities: [{ id: uid(), name: "Bite", roll: "1d20+5", text: "On a hit: 2d6+3 and the target is dragged one step toward water." }, { id: uid(), name: "Bite damage", roll: "2d6+3", text: "" }, { id: uid(), name: "Waterlogged howl", roll: "1d20", text: "Everyone who hears it tests Will against 12 or is shaken for a round." }],
      notes: "Rises from the shrine pool when the bell rings. Fire makes it hesitate.", loot: "A rusted collar with Hale's crest" },
  ];
  c.sessions = [{
    id: uid(), num: 1, title: "Smoke over the River", date: new Date().toISOString().slice(0, 10), ingame: "2nd of Ashfall", hours: 3.5,
    moods: ["Roleplay", "Mystery"], ambience: "Cold rain, river fog", example: true,
    beats: [
      { id: uid(), type: "travel", text: "The party arrives at [[Millford]] on a barge full of salt and smuggled blades.", star: false },
      { id: uid(), type: "social", text: "Varka arm-wrestles a Crown soldier for passage papers, and loses on purpose.", star: true },
      { id: uid(), type: "discovery", text: "Bodo finds Hale's seal on a resistance map. Someone is feeding them lies.", star: true },
      { id: uid(), type: "combat", text: "Ambush in the mill yard. Sister Oriel goes down and gets back up.", star: false },
    ],
    quotes: [{ id: uid(), who: "Bodo", line: "I didn't steal it. I'm just holding it somewhere else." }],
    cliff: "A bell tolls from the drowned shrine, and Hale's daughter answers it.",
    recap: "",
    attendance: Object.fromEntries(c.party.map(m => [m.id, true])),
    spotlight: Object.fromEntries(c.party.map((m, i) => [m.id, [2, 1, 3, 1][i]])),
    mvp: c.party[2].id,
    loot: [{ id: uid(), item: "Purse of Crown silver", to: "Party", value: 40 }, { id: uid(), item: "Ashwood Sling of Whispers", to: "Bodo", value: 120 }],
    xp: "Milestone: reached Millford",
    threads: [{ id: uid(), text: "Who forged Hale's seal?", done: false }, { id: uid(), text: "Find passage papers", done: true }],
    scars: [{ id: uid(), text: "Oriel: burn scar on her left hand from the mill fire" }],
    worked: "The arm-wrestling scene. Everyone leaned in.", change: "The ambush dragged. Fewer goons, more terrain.",
    rating: 4, prep: [{ id: uid(), text: "Map of the drowned shrine", done: false }, { id: uid(), text: "Stat Hale's bodyguard", done: false }],
    created: Date.now(),
  }, {
    id: uid(), num: 2, title: "The Drowned Shrine", status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "",
    attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: Date.now() + 1,
    plan: {
      start: "The bell tolls at midnight. Every dog in Millford starts howling at once, then stops.",
      scenes: [{ id: uid(), text: "Chase Ysolde through the flooded lanes", done: false }, { id: uid(), text: "Hale begs the party, quietly, in his study", done: false }, { id: uid(), text: "The shrine pool and what climbs out", done: false }],
      secrets: [{ id: uid(), text: "Ysolde rings the bell to call the hounds, not to summon anything worse", done: false }, { id: uid(), text: "Hale forged his own seal to protect the resistance", done: false }, { id: uid(), text: "The dam's gatekeeper takes bribes in salt", done: false }],
      cast: [n1.id, n2.id], encounters: [], treasure: [{ id: uid(), text: "Hale's real seal ring", done: false }], handouts: [],
    },
  }];
  c.sessions[1].plan.encounters = [{ id: uid(), creature: c.bestiary[1].id, count: 2, hp: [22, 22] }, { id: uid(), creature: c.bestiary[0].id, count: 2, hp: [14, 14] }];
  c.handouts = [{ id: uid(), title: "A note under the door", type: "text", style: "letter", text: "They know about the maps.\nCome to the shrine before the bell, or don't come at all.\n\nY." }];
  return c;
}

export function C() { return S.data.campaigns.find(c => c.id === S.data.currentId) || S.data.campaigns[0]; }

export async function loadData() {
  let txt = null;
  try { txt = window.codex ? await window.codex.load() : localStorage.getItem("codex-data"); } catch {}
  let d = null;
  try { d = txt ? JSON.parse(txt) : null; } catch { toast("Your save file couldn't be read. Started fresh; the old file is kept as a backup."); }
  if (!d || !Array.isArray(d.campaigns) || !d.campaigns.length) { const c = sampleCampaign(); d = { version: 1, campaigns: [c], currentId: c.id }; }
  for (const c of d.campaigns) { const b = blankCampaign(); for (const k in b) if (c[k] == null) c[k] = b[k]; }
  d.prefs ||= {};
  S.data = d; hist.last = snap();
  return d;
}

// Undo: a snapshot of the campaigns after each save, without view state (ui) or app preferences
const UNDO_MAX = 60;
const hist = { back: [], fwd: [], last: null, restoring: false, restoredAt: -1e9 };
const snap = () => JSON.stringify(S.data.campaigns, (k, v) => k === "ui" ? undefined : v);
function checkpoint() {
  if (hist.restoring) return;
  const now = snap();
  // views rebuilt after an undo fill in defaults (empty sheet fields and such): not a new step
  if (performance.now() - hist.restoredAt < 1500) { hist.last = now; return; }
  if (hist.last != null && now !== hist.last) { hist.back.push(hist.last); if (hist.back.length > UNDO_MAX) hist.back.shift(); hist.fwd.length = 0; }
  hist.last = now;
}
export const canUndo = () => hist.back.length > 0 || pending, canRedo = () => hist.fwd.length > 0;
const restoreListeners = new Set();
export const onRestore = fn => restoreListeners.add(fn);
function restore(json) {
  const ui = Object.fromEntries(S.data.campaigns.map(c => [c.id, c.ui]));
  const list = JSON.parse(json);
  for (const c of list) { c.ui = ui[c.id] || {}; const b = blankCampaign(); for (const k in b) if (c[k] == null) c[k] = b[k]; }
  S.data.campaigns = list;
  if (!list.some(c => c.id === S.data.currentId)) S.data.currentId = list[0].id;
  hist.last = json; hist.restoredAt = performance.now(); hist.restoring = true; save(); hist.restoring = false;
  restoreListeners.forEach(f => f());
}
export async function undo() {
  clearTimeout(timer); if (pending) { checkpoint(); await flush(); }
  if (!hist.back.length) return false;
  hist.fwd.push(hist.last); restore(hist.back.pop()); return true;
}
export async function redo() {
  if (!hist.fwd.length) return false;
  hist.back.push(hist.last); restore(hist.fwd.pop()); return true;
}

let timer = null, pending = false;
export function save() {
  pending = true; clearTimeout(timer);
  listeners.forEach(f => f("saving"));
  timer = setTimeout(flush, 450);
}
export async function flush() {
  clearTimeout(timer); if (!pending) return; pending = false;
  checkpoint();
  const txt = JSON.stringify(S.data);
  try {
    if (window.codex) await window.codex.save(txt); else localStorage.setItem("codex-data", txt);
    listeners.forEach(f => f("saved"));
  } catch (e) { listeners.forEach(f => f("error")); toast("Couldn't save: " + (e.message || e)); }
}
addEventListener("beforeunload", () => { if (pending) flush(); });
