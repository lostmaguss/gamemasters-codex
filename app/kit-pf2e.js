// Pathfinder 2e kit: Forge tables, random tables and a ready-to-play adventure for levels 1 to 3.
// Creatures come from the library (Paizo's Monster Core under the ORC License). The adventure, its places,
// people and gods, and every table are original writing; no setting material (Golarion) is used.
import { pick, cap } from "./util.js";
import * as F from "./genre-fantasy.js";

const GOBLIN = { label: "Goblin", pre: ["Ak", "Bik", "Dra", "Fum", "Grim", "Hep", "Krag", "Lub", "Mog", "Nix", "Pok", "Rot", "Skab", "Tik", "Vog", "Zit"], f: ["ka", "ie", "zle", "pa", "na"], m: ["gut", "nob", "zag", "rik", "bo", "nik"], n: ["bit", "ik", "ee", "o"], clan: ["Burnt-Tooth", "Skinnybones", "Mudlicker", "Firebiter", "Kettlehead", "Thistlechewer"] };
const NAMES = { ...F.NAMES, goblin: GOBLIN, infernal: { ...F.NAMES.infernal, label: "Nephilim" } };
function makeName(anc, g) {
  if (anc !== "goblin") return F.makeName(anc, g);
  g = g || pick(["f", "m", "n"]);
  return `${cap((pick(GOBLIN.pre) + pick(GOBLIN[g])).toLowerCase())} ${pick(GOBLIN.clan)}`;
}

// a few common items with their level, as printed in the remastered core rules
const PF_ITEMS = [
  ["Minor healing potion", 1, "potion", "Drink it to regain 1d8 Hit Points."],
  ["Lesser healing potion", 3, "potion", "Drink it to regain 2d8+5 Hit Points."],
  ["Minor elixir of life", 1, "potion", "Regain 1d6 Hit Points and gain +1 to saves against diseases and poisons for 10 minutes."],
  ["Antidote (lesser)", 1, "potion", "+2 item bonus to Fortitude saves against poisons for 6 hours."],
  ["Everburning torch", 1, "wondrous", "A torch whose flame never goes out and gives no heat."],
  ["Weapon potency rune (+1)", 2, "weapon", "Etched on a weapon: +1 item bonus to attack rolls with it."],
  ["Striking rune", 4, "weapon", "Etched on a weapon: it deals two weapon damage dice instead of one."],
  ["Armor potency rune (+1)", 5, "armor", "Etched on armor: +1 item bonus to AC."],
  ["Bag of holding (type I)", 4, "wondrous", "Holds up to 25 Bulk of items, and always counts as 1 Bulk."],
  ["Scroll of a 1st-rank spell", 1, "wondrous", "Holds one 1st-rank spell. A caster with the spell on their list can cast it once."],
  ["Wand of a 1st-rank spell", 3, "wondrous", "Cast the spell once a day. Overcharging it risks breaking the wand."],
];
const KIND = { weapon: "Rune", armor: "Armor rune", wondrous: "Wondrous item", potion: "Consumable" };
const ITEM = {
  types: KIND, pool: ["weapon", "armor", "wondrous", "wondrous", "potion", "potion"],
  init(type) { const it = pick(PF_ITEMS.filter(x => x[2] === type)); return { type, pf: it, rarity: "Common" }; },
  title: c => c.pf[0], sub: c => `Item ${c.pf[1]} · ${KIND[c.type].toLowerCase()}`, power: c => c.pf[3],
  rarity: [["Common", 85], ["Uncommon", 13], ["Rare", 2]],
  value: { Common: "worth about its level times 10 gp at low levels", Uncommon: "hard to buy; worth more to the right collector", Rare: "not for sale anywhere ordinary" },
  look: F.ITEM.look, quirk: F.ITEM.quirk, history: F.ITEM.history,
};

const T = {
  occupation: [...F.T.occupation, "road warden", "caravan master", "lantern-keeper", "toll collector", "itinerant alchemist", "goblin cook (reformed)", "bridge engineer"],
  monster: ["goblin warband", "kobold trap-makers", "forest troll", "ogre warrior and its goblin servants", "pack of wolves", "skeleton guards in an old fort", "griffon guarding its nest", "young horned dragon", "orc scrapper mercenaries", "zombie shamblers in the marsh"],
  foe: ["the Burnt-Tooth goblins", "orc scrapper mercenaries", "a rival merchant house", "a cult of the Ash Lantern", "kobold trappers", "a bandit queen and her crew", "a necromancer's apprentice", "an ogre who thinks it's a king"],
  rewardT: { easy: ["15 gp and supper", "a minor healing potion each", "a scroll of a 1st-rank spell"], standard: ["40 gp each", "a +1 weapon potency rune", "a bag of holding (type I)"], hard: ["100 gp each", "a striking rune", "a wand of a 1st-rank spell"], deadly: ["300 gp each", "an armor potency rune and a land grant", "the merchant house's favor"] },
  rumor: [...F.T.rumor.slice(0, 6), "The lantern-shrines on the old road have gone dark, one by one", "Goblins are singing songs about a new boss", "Someone is paying for griffon feathers", "The waystation on the moor has lights on, and nobody lives there"],
};
const EXTRA = {
  coin: n => `${n} gp`,
  valuables: ["a silver holy symbol (5 gp)", "a jade comb (10 gp)", "a lesser gem (10 gp)", "a gold ring (20 gp)", "an embroidered banner (5 gp)", "a set of brass scales (8 gp)", "an amber pendant (15 gp)", "a silvered dagger (12 gp)"],
  hide: ["under a loose stone in the hearth", "in a goblin's 'secret' hole (DC 14 Perception)", "inside a hollow log", "in a locked strongbox (DC 15 Thievery)", "in a dead traveler's pack", "behind a false wall (DC 17 Perception)", "under the bridge, wrapped in oilcloth", "in a crow's nest of shiny things"],
  activity: ["setting snares", "arguing over who's boss", "roasting a stolen sheep", "guarding a prisoner", "painting war-marks", "digging for something", "making camp", "hunting the party"],
  terrain: ["a narrow road between steep banks", "a rope bridge over a ravine", "a ruined waystation", "a misty moor with standing stones", "a goblin warren", "a dark pine forest", "a river ford in flood", "a hilltop griffon nest"],
  fallback: ["goblin warriors", "wolves", "kobold warriors", "skeleton guards", "zombie shamblers", "an ogre warrior", "orc scrappers", "a forest troll"],
};
export const forge = { NAMES, makeName, T, ITEM, EXTRA, LABELS: { ancestry: "Ancestry", foes: "Threat", origin: "Ancestry" }, DIFF: { easy: "Trivial", standard: "Moderate", hard: "Severe", deadly: "Extreme" } };

export function tables(t) {
  const f = "Pathfinder 2e";
  return [
    t("Road encounter (levels 1-3)", `${f} · Encounters`, ["{1d4+1} goblin warriors in an ambush, singing loudly enough to ruin it", "A pack of {1d3+1} wolves following the caravan", "Kobold warriors with a net trap across the road (DC 16 Perception to spot)", "An ogre warrior demanding a toll in food", "Orc scrappers who'd rather sell their swords than swing them", "A griffon diving at the pack horses", "A broken cart and a merchant who is not what they seem", "Skeleton guards marching a patrol route from a war long over", "A traveling priest offering blessings, and asking odd questions", "Weather turns: @{Weather}"]),
    t("Hazard (levels 1-3)", `${f} · Hazards`, ["Hidden pit: Stealth DC 18 to notice, Reflex DC 18 or fall 10 ft (1d6 bludgeoning)", "Spear launcher: Stealth DC 20, +12 to hit, 2d6 piercing. Thievery DC 18 to disable", "Slippery rope bridge: Acrobatics DC 15 to cross at full speed, or fall into the water", "Yellow mold: Perception DC 17 to spot; spores, Fortitude DC 16 or sickened 1", "Collapsing ceiling: Reflex DC 17, 2d8 bludgeoning, half on a success", "Poisoned lock: Thievery DC 17 to open safely; Fortitude DC 16 or 1d6 poison", "Haunted lantern: Religion DC 16 to calm; Will DC 16 or frightened 1", "Flooded tunnel: Athletics DC 15 to swim, hold your breath"]),
    t("Treasure (levels 1-3)", `${f} · Loot`, ["{2d6} sp", "{3d6} cp and a lucky copper", "{1d6+2} gp", "{2d6} gp in a merchant's purse", "A minor healing potion", "An everburning torch", "A scroll of a 1st-rank spell", "A lesser gem (10 gp) and a love note", "{1d4} gp and an elaborate map to nowhere", "A minor elixir of life"]),
    t("Critical success flavor", `${f} · Combat`, ["The blow lands where armor meets skin. They gasp", "Your strike turns them halfway around", "A perfect hit. An ally cheers", "You hit something important. They stagger", "The spell hits dead center, sparks dancing", "Your feint works so well they swing at nothing"]),
    t("Critical failure flavor", `${f} · Combat`, ["Your foot catches a root. You're off-balance", "Your weapon bites the ground and sticks", "You swing at a shadow. The real foe grins", "Your spell fizzles with a sad pop", "You drop a pouch. Coins scatter", "You bump an ally and they glare"]),
    t("Hero Point moment", `${f} · Play`, ["A clever plan that makes the table laugh", "Staying behind so others can flee", "A perfect in-character line", "Helping a player who is having a rough night", "Bringing snacks (we don't judge)", "Risking everything for an NPC"]),
    t("Village trouble", `${f} · Plot`, ["The well has gone sour", "A goblin is hiding in the bakery, terrified", "Two families are feuding over a fence", "The shrine's lantern won't light", "A merchant was robbed on the road last night", "Children have found a cave and won't say where", "The miller is selling flour mixed with chalk", "Someone keeps leaving dead crows on the reeve's door"]),
    t("Exploration complication", `${f} · Exploration`, ["Fog: Perception checks to see far are at a -2 penalty", "The trail splits and both ways look used", "A rockslide blocks the path: Athletics DC 15 to climb", "Rations spoiled overnight", "A pack animal goes lame", "Tracks in the mud, bigger than any wolf", "A storm forces the party to shelter", "The map is wrong"]),
  ];
}

export const adventure = { title: "The Lantern Road", blurb: "Levels 1 to 3, four sessions. Escort a caravan along a road whose lantern-shrines are going dark: goblins, a haunted waystation, and a troll under the Weeping Bridge." };

export function campaign({ blank, uid, lib, sys, toCreature }) {
  const c = blank("The Lantern Road");
  c.tagline = "Pathfinder 2e · levels 1 to 3 · a ready-to-play adventure";
  c.stash = { money: 0, unit: "gp", items: [], log: [] };
  const now = Date.now(), note = (title, cat, tags, body, extra = {}) => ({ id: uid(), title, cat, tags, body, updated: now, ...extra });
  const S = (a) => Object.fromEntries(["Str", "Dex", "Con", "Int", "Wis", "Cha", "Perception", "Fortitude", "Reflex", "Will", "Athletics", "Acrobatics", "Stealth", "Arcana", "Diplomacy"].map((k, i) => [k, a[i]]));
  const pc = (character, role, color, stats, hp, text) => ({ id: uid(), player: "", character, role, color, stats, res: { HP: { cur: hp, max: hp }, "Hero Points": { cur: 1, max: 3 }, "Focus Points": { cur: text.focus || 0, max: text.focus || 0 } }, conds: [], text: { Strikes: text.Strikes, Feats: text.Feats, Spells: text.Spells || "", Inventory: text.Inventory, Notes: text.Notes || "" } });
  c.party = [
    pc("Brannoc Vale", "Human fighter 1", "#8fb07f", S(["+4", "+2", "+2", "+0", "+1", "+0", "+6", "+7", "+7", "+4", "+7", "+5", "+2", "+0", "+0"]), 20,
      { Strikes: "Longsword +9 (versatile P), 1d8+4 slashing\nLongbow +7 (deadly d10, range 100 ft), 1d8 piercing", Feats: "AC 18 (chain mail, shield raised 20)\nReactive Strike\nShield Block\nSudden Charge (2 actions: Stride twice, then Strike)", Inventory: "Chain mail, steel shield, longsword, longbow and 20 arrows, adventurer's pack, 8 gp" }),
    pc("Odda Stonevow", "Dwarf cleric 1 (warpriest)", "#d9776f", S(["+1", "+0", "+2", "+0", "+4", "+1", "+7", "+7", "+3", "+9", "+4", "+0", "+0", "+0", "+4"]), 20,
      { Strikes: "Mace +4 (shove), 1d6+1 bludgeoning\nSling +3 (range 50 ft), 1d6 piercing", Feats: "AC 16 (scale mail)\nDarkvision\nDivine font: 4 extra heal spells\nShield Block", Spells: "Spell DC 17, attack +7\nCantrips: divine lance, light, shield, stabilize\n1st rank (2): bless, heal\nFont: 4 heal\nThe Lantern-Keeper: patron of travelers and shrines", Inventory: "Scale mail, mace, sling, religious symbol, healer's toolkit, 6 gp" }),
    pc("Nix Kettlehead", "Goblin rogue 1 (thief)", "#d4a54a", S(["+0", "+4", "+1", "+1", "+0", "+3", "+5", "+4", "+9", "+5", "+0", "+7", "+7", "+1", "+6"]), 15,
      { Strikes: "Dogslicer +7 (agile, backstabber, finesse), 1d6+4 slashing (thief adds Dex)\nShortbow +7 (deadly d10, range 60 ft), 1d6 piercing\nSneak Attack +1d6 against off-guard foes", Feats: "AC 18 (studded leather)\nSurprise Attack\nNimble Dodge\nBurn It! (fire does a little extra)", Inventory: "Studded leather, 2 dogslicers, shortbow and 20 arrows, thieves' toolkit, a pet rat named Lord Biscuit, 5 gp" }),
    pc("Liriel Thane", "Elf wizard 1", "#a98fb6", S(["+0", "+2", "+1", "+4", "+1", "+0", "+4", "+4", "+5", "+6", "+0", "+2", "+2", "+7", "+0"]), 13,
      { Strikes: "Staff +3 (two-hand d8), 1d4 bludgeoning\nSpell attack +7", Feats: "AC 15\nLow-light vision\nArcane bond\nReach Spell", Spells: "Spell DC 17, attack +7\nCantrips: electric arc, ignition, detect magic, light, telekinetic hand\n1st rank (2 + 1 school): force barrage, mystic armor, sure strike\nThe old road's map is copied in the back of the spellbook", Inventory: "Spellbook, staff, material component pouch, scholar's kit, 4 gp", focus: 1 }),
  ];

  const fromLib = n => { const r = lib?.creatures.find(x => x[0] === n); return r ? toCreature(sys, r) : null; };
  const own = (name, kind, threat, vals, abil, notes) => toCreature(sys, [name, kind, threat, vals, abil, notes]);
  const named = (base, name, kind, notes, hp) => base && { ...base, id: uid(), name, kind, notes, ...(hp ? { hp: String(hp), stats: { ...base.stats, HP: String(hp) } } : {}) };
  const gob = fromLib("Goblin Warrior"), wolf = fromLib("Wolf"), kob = fromLib("Kobold Warrior"), skel = fromLib("Skeleton Guard"), zom = fromLib("Zombie Shambler"), orc = fromLib("Orc Scrapper"), griffon = fromLib("Griffon"), troll = fromLib("Forest Troll");
  const boss = named(orc, "Krull the Hired Blade", "Orc scrapper captain", "Orc Scrapper with 32 HP. Paid by Velka Strand to make the caravan fail. Will switch sides for double pay.", 32);
  const wraith = own("Lantern Wisp", "Creature 2 · haunt, spirit", 2, ["22", "19", "fly 40 ft", "+8", "+5", "+11", "+7", "2"], [["Cold Glow", "1d20+10", "Ranged 30 ft. Cold.", "2d6+2"], ["Snuff", "", "Lights within 20 ft gutter out. Living creatures nearby: Will DC 18 or frightened 1."]], "The spirit of the waystation's last lantern-keeper. Relights its lantern and calms if someone speaks the old road-blessing (Religion DC 16).");
  c.bestiary = [gob, wolf, kob, skel, zom, orc, boss, wraith, griffon, troll].filter(Boolean);
  for (const b of c.bestiary) b.tags = `${b.tags || "Pathfinder 2e"}, lantern road`;

  const N = {
    town: note("Brindle Crossing", "Locations", "town, start", "# Brindle Crossing\nA river town where the old **Lantern Road** begins. Warehouses, a ferry, and the counting-house of the **Saltwind Company**.\n\n- [[Master Corvin Ashe]] needs his caravan to reach [[Highmoor]] in six days\n- The **Copper Kettle** inn: rooms 5 sp a night\n- Shrine of the Lantern-Keeper: the old priest [[Sister Maud]] tends it", { pinned: true }),
    road: note("The Lantern Road", "Locations", "road, acts 1-3", "Sixty miles of old road over the moors to [[Highmoor]]. Every few miles stands a **lantern-shrine**: a stone post with a lantern blessed by the Lantern-Keeper. Travelers say the lanterns keep the moor's dead quiet.\n\n**Now:** the lanterns are going dark, one by one, from the east."),
    way: note("The Hollow Waystation", "Locations", "ruin, act 2", "A walled waystation halfway along the road, abandoned fifty years. Stables, a well, a chapel with a great lantern.\n\n- The [[Lantern Wisp]] haunts the chapel\n- Skeleton guards still walk the walls\n- The Burnt-Tooth goblins camp in the stables"),
    bridge: note("The Weeping Bridge", "Locations", "bridge, act 3", "A stone bridge over a deep ravine, wet with spray. A forest troll lives beneath it. A griffon nests on the cliff above, and the two hate each other."),
    high: note("Highmoor", "Locations", "town, destination", "A hill town at the road's end, short of salt and medicine for the winter. If the caravan doesn't arrive, people will go hungry."),
    corvin: note("Master Corvin Ashe", "NPCs", "patron, saltwind company", "Caravan master of the Saltwind Company. Sixty, gruff, fair. **Pays:** 40 gp each on arrival, 10 now. **Worried about:** his rival [[Velka Strand]]."),
    velka: note("Velka Strand", "NPCs", "villain, merchant", "Head of Strand & Daughters, the rival merchant house. Charming, ruthless. She hired [[Krull the Hired Blade]] and paid the Burnt-Tooth goblins to snuff the lanterns, so the road gets a bad name and Highmoor buys from her."),
    maud: note("Sister Maud", "NPCs", "priest, ally", "Elderly priest of the Lantern-Keeper in [[Brindle Crossing]]. Gives the party a flask of blessed lamp oil: it relights a dead lantern-shrine. **Knows** the road-blessing that calms a restless lantern spirit."),
    nix: note("The Burnt-Tooth goblins", "Factions", "goblins", "A dozen goblins who love fire more than anything, which is why snuffing lanterns for money upsets them. Their boss, Grizzle, can be talked round with fire tricks or a better offer."),
    q1: note("Get the caravan to Highmoor", "Quests", "main", "Six days, four wagons, salt and medicine. Reward: 40 gp each, 10 paid now."),
    q2: note("Relight the lanterns", "Quests", "side", "Each lantern-shrine relit with Sister Maud's blessed oil keeps the moor's dead quiet. Relight them all for a blessing: each hero gains 1 Hero Point at the start of the final session."),
  };
  c.notes = [...Object.values(N), ...(lib?.spells || []).map(r => ({ id: uid(), title: r[0], cat: "Spells", tags: `Pathfinder 2e, ${r[1]}`, body: r[2], updated: now, lib: sys.id }))];

  const b = c.boards[0], card = (type, x, y, w, color, title, text, extra = {}) => ({ id: uid(), type, x, y, w, color, rot: (Math.random() * 4 - 2).toFixed(2), title, text, z: 1, ...extra });
  const h1 = card("heading", 40, 30, 360, "paper", "Who's snuffing the lanterns?", "");
  const r1 = card("ref", 60, 150, 230, "lichen", "", "", { ref: N.road.id }), r2 = card("ref", 380, 150, 230, "rose", "", "", { ref: N.velka.id }), r3 = card("ref", 700, 150, 230, "mustard", "", "", { ref: N.nix.id });
  const n1 = card("note", 240, 410, 230, "paper", "", "Goblin footprints by every dark lantern, and boot prints too.");
  b.cards = [h1, r1, r2, r3, n1]; b.links = [{ id: uid(), a: r2.id, b: r3.id, color: "red" }, { id: uid(), a: n1.id, b: r1.id, color: "black" }]; b.view = { x: 40, y: 30, z: .9 };

  c.clocks = [
    { id: uid(), name: "Days to Highmoor", segs: 6, filled: 1, color: "#d4a54a", note: "Tick each day on the road. Full and the caravan isn't there: Highmoor buys from Velka Strand.", onStream: true },
    { id: uid(), name: "The moor's dead stir", segs: 6, filled: 2, color: "#cf8577", note: "Tick for every lantern left dark. Full: the dead rise along the road at night.", onStream: false },
  ];
  c.rep = [{ id: uid(), note: N.nix.id, v: -1 }, { id: uid(), name: "Saltwind Company", v: 1 }];
  c.calendar = { months: ["Frostmonth", "Thawmonth", "Seedmonth", "Rainmonth", "Bloommonth", "Sunmonth", "Highmonth", "Harvestmonth", "Leafmonth", "Mistmonth", "Firstsnow", "Deepnight"].map(n => ({ name: n, days: 30 })), weekdays: ["Moonday", "Toilday", "Wealday", "Oathday", "Fireday", "Starday", "Sunday"], year: 812, month: 9, day: 3, era: "", events: [{ id: uid(), month: 9, day: 9, title: "The caravan must reach Highmoor" }] };
  c.handouts = [
    { id: uid(), title: "Saltwind Company notice", type: "text", style: "parchment", text: "GUARDS WANTED\n\nFor a four-wagon caravan on the Lantern Road to Highmoor.\nSix days. 10 gold now, 40 on arrival. Meals provided.\n\nApply to Master Corvin Ashe, Saltwind counting-house, Brindle Crossing." },
    { id: uid(), title: "Goblin ransom note", type: "text", style: "card", text: "WE HAV YOR LANTERN OYL.\nPAY 20 GOLD OR WE DRINK IT.\nNO WE WONT DRINK IT. PAY ANYWAY.\n- GRIZZLE (BOSS)" },
    { id: uid(), title: "Letter in Krull's pack", type: "text", style: "letter", text: "Krull,\nThe lanterns must be dark by the new moon, and the Saltwind wagons must not reach Highmoor. Half now. Half when Corvin Ashe is ruined. Burn this.\n\nV." },
  ];
  const t = s => ({ id: uid(), text: s, done: false });
  const blankS = (num, title, plan) => ({ id: uid(), num, title, status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + num, plan: { cast: [], encounters: [], handouts: [], ...plan } });
  c.sessions = [{
    id: uid(), num: 1, title: "Brindle Crossing", date: "", ingame: "3 Mistmonth, 812", hours: 1, moods: ["Roleplay"], ambience: "Rain on the river, wagon wheels", example: true,
    beats: [{ id: uid(), type: "social", text: "The heroes answer the Saltwind notice and meet [[Master Corvin Ashe]].", star: false }, { id: uid(), type: "discovery", text: "[[Sister Maud]] gives them a flask of blessed lamp oil and warns that the lanterns are going dark.", star: true }, { id: uid(), type: "travel", text: "The caravan rolls out at dawn onto the [[The Lantern Road]].", star: false }],
    quotes: [{ id: uid(), who: "Nix", line: "I'm not saying I'll set anything on fire. I'm saying I could." }],
    cliff: "At dusk on the first day, the next lantern-shrine is dark, and someone has scratched a goblin grin into the post.",
    recap: "The heroes signed on to guard the Saltwind caravan to Highmoor. Sister Maud gave them blessed oil and a warning: the lantern-shrines along the road are going dark. At dusk on the first day they found one snuffed, with a goblin grin scratched into its post.",
    attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "Session zero: characters and the hook", threads: [{ id: uid(), text: "Who is snuffing the lanterns?", done: false }], scars: [], worked: "", change: "", rating: 0, prep: [], created: now,
  },
  blankS(2, "Fire on the Moor", { start: "Goblins drop from the rocks onto the lead wagon, shrieking and waving torches. One is already trying to light the salt on fire. It won't burn. He's furious.", scenes: [t("The goblin ambush: 4 goblin warriors and wolves"), t("Question a goblin: they were paid, by 'boots with silver buckles'"), t("Relight a dark lantern with Sister Maud's oil"), t("Night camp: kobold traps in the dark"), t("Grizzle's ransom note on the morning wagon")], secrets: [t("The goblins were paid to snuff the lanterns, and they hate it"), t("Velka Strand hired an orc mercenary to make sure the caravan fails"), t("Grizzle the goblin boss will switch sides for a good fire trick")], cast: [N.corvin.id, N.nix.id], treasure: [t("Goblin purses: {2d6} sp and a stolen lantern"), t("A minor healing potion in the kobold cache")] }),
  blankS(3, "The Hollow Waystation", { start: "Rain. The waystation's gate stands open. On the wall, two skeletons in rusted mail turn their heads, slowly, toward the wagons.", scenes: [t("Skeleton guards on the walls"), t("The Burnt-Tooth camp in the stables: talk or fight"), t("The chapel and the Lantern Wisp"), t("Krull the Hired Blade arrives with orc scrappers"), t("Krull's pack: Velka's letter")], secrets: [t("The Wisp calms if the road-blessing is spoken (Religion DC 16)"), t("Krull will switch sides for double pay"), t("Velka's letter proves who's behind it")], cast: [N.way.id, N.nix.id], treasure: [t("Chapel offering box: {1d6+2} gp, a scroll of a 1st-rank spell"), t("Krull's purse: 20 gp and Velka's letter")] }),
  blankS(4, "The Weeping Bridge", { start: "The bridge is wet with spray and the ravine roars. Halfway across, the stones shift. Something huge climbs up from beneath.", scenes: [t("The forest troll under the bridge"), t("The griffon on the cliff: enemy of the troll, maybe an ally"), t("Get the wagons across"), t("Highmoor at last, and Velka Strand waiting with her own wagons")], secrets: [t("The troll fears the griffon; a griffon feather in hand makes it hesitate"), t("Showing Velka's letter to Highmoor's council ruins her")], cast: [N.bridge.id, N.high.id, N.velka.id], treasure: [t("Troll's hoard: 30 gp, a +1 weapon potency rune"), t("The reward: 40 gp each, and the Saltwind Company's friendship")] }),
  ];
  c.sessions[1].recap = c.sessions[0].recap;
  const by = n => c.bestiary.find(x => x.name === n)?.id, E = (n, k, hp) => ({ id: uid(), creature: by(n), count: k, hp: Array(k).fill(hp) });
  c.sessions[1].plan.encounters = [E("Goblin Warrior", 4, 6), E("Wolf", 2, 24), E("Kobold Warrior", 3, 12)].filter(e => e.creature);
  c.sessions[2].plan.encounters = [E("Skeleton Guard", 2, 4), E("Lantern Wisp", 1, 22), E("Krull the Hired Blade", 1, 32), E("Orc Scrapper", 2, 24)].filter(e => e.creature);
  c.sessions[3].plan.encounters = [E("Forest Troll", 1, 65), E("Griffon", 1, 45)].filter(e => e.creature);
  for (const s of c.sessions.slice(1)) for (const e of s.plan.encounters) { const x = c.bestiary.find(y => y.id === e.creature); if (x) e.hp = Array(e.count).fill(Number(x.stats.HP) || e.hp[0]); }
  return c;
}
