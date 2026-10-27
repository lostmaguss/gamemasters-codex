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
    ui: {},
  };
}

export function starterTables() {
  const t = (name, folder, rows) => ({ id: uid(), name, folder, rows: rows.map(r => Array.isArray(r) ? { id: uid(), w: r[0], text: r[1] } : { id: uid(), w: 1, text: r }), hist: [] });
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
  c.party = p.map(([player, character, role, color]) => ({ id: uid(), player, character, role, color }));
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
  c.handouts = [{ id: uid(), title: "A note under the door", type: "text", style: "letter", text: "They know about the maps.\nCome to the shrine before the bell, or don't come at all.\n\n— Y." }];
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
  S.data = d;
  return d;
}

let timer = null, pending = false;
export function save() {
  pending = true; clearTimeout(timer);
  listeners.forEach(f => f("saving"));
  timer = setTimeout(flush, 450);
}
export async function flush() {
  clearTimeout(timer); if (!pending) return; pending = false;
  const txt = JSON.stringify(S.data);
  try {
    if (window.codex) await window.codex.save(txt); else localStorage.setItem("codex-data", txt);
    listeners.forEach(f => f("saved"));
  } catch (e) { listeners.forEach(f => f("error")); toast("Couldn't save: " + (e.message || e)); }
}
addEventListener("beforeunload", () => { if (pending) flush(); });
