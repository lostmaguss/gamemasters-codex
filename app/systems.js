// Game system templates: one pick sets up the rules, the party sheet, the bestiary's stat block,
// the quick rolls and the genre. Everything can be changed afterwards.
// Bestiary blocks keep HP and Defense first: combat, prep and print read those two by name.
const d20 = { critDie: 20, critMode: "high", initHigh: true };
const pct = { critDie: 100, critMode: "low", initHigh: true };
const none = { critDie: 20, critMode: "none", initHigh: true };
const P = (...pairs) => pairs.map(([name, expr]) => ({ name, expr }));

export const SYSTEMS = [
  { id: "dnd5e", name: "D&D 5e", blurb: "d20 + modifier, crits on a natural 20", genre: "fantasy", rules: d20,
    sheet: { stats: ["STR", "DEX", "CON", "INT", "WIS", "CHA", "Proficiency", "Initiative", "Perception"], resources: ["HP", "Temp HP", "Hit Dice", "Spell slots", "Inspiration"], fields: ["Attacks", "Features & traits", "Spells", "Inventory", "Notes"], roll: "1d20+{value}" },
    monster: ["HP", "Defense", "Speed", "STR", "DEX", "CON", "INT", "WIS", "CHA", "CR"],
    presets: P(["Attack", "1d20"], ["Advantage", "2d20kh1"], ["Disadvantage", "2d20kl1"], ["Death save", "1d20"], ["Ability scores", "4d6dl1"]),
    note: "Put modifiers on the sheet (+3, not 16)." },
  { id: "pf2e", name: "Pathfinder 2e", blurb: "d20 + modifier, hero points, three actions", genre: "fantasy", rules: d20,
    sheet: { stats: ["Str", "Dex", "Con", "Int", "Wis", "Cha", "Perception", "Fortitude", "Reflex", "Will", "Athletics", "Acrobatics", "Stealth", "Arcana", "Diplomacy"], resources: ["HP", "Hero Points", "Focus Points", "Spell slots"], fields: ["Strikes", "Feats", "Spells", "Inventory", "Notes"], roll: "1d20+{value}" },
    monster: ["HP", "Defense", "Speed", "Perception", "Fortitude", "Reflex", "Will", "Level"],
    presets: P(["Strike", "1d20"], ["Recall Knowledge", "1d20"], ["Flat check", "1d20"], ["Hero point reroll", "1d20"]),
    note: "Defense is AC. Beat the DC by 10 for a critical success." },
  { id: "pf1e", name: "Pathfinder 1e / 3.5", blurb: "d20 + modifier, saves and BAB", genre: "fantasy", rules: d20,
    sheet: { stats: ["Str", "Dex", "Con", "Int", "Wis", "Cha", "BAB", "CMB", "Fortitude", "Reflex", "Will", "Initiative"], resources: ["HP", "Spells per day"], fields: ["Attacks", "Feats", "Spells", "Inventory", "Notes"], roll: "1d20+{value}" },
    monster: ["HP", "Defense", "Speed", "Fortitude", "Reflex", "Will", "CR"],
    presets: P(["Attack", "1d20"], ["Confirm crit", "1d20"], ["Ability scores", "4d6dl1"]),
    note: "Defense is AC." },
  { id: "osr", name: "OSR / old-school", blurb: "B/X, OSE, Knave: d20, 3d6 down the line", genre: "fantasy", rules: d20,
    sheet: { stats: ["STR", "DEX", "CON", "INT", "WIS", "CHA", "Save"], resources: ["HP", "Torches", "Rations"], fields: ["Gear", "Spells", "Notes"], roll: "1d20+{value}" },
    monster: ["HP", "Defense", "Speed", "HD", "Morale"],
    presets: P(["Attack", "1d20"], ["Reaction", "2d6"], ["Morale", "2d6"], ["Wandering monster", "1d6"], ["Stats (3d6)", "3d6"]),
    note: "" },
  { id: "daggerheart", name: "Daggerheart", blurb: "2d12 Hope and Fear + trait", genre: "fantasy", rules: none,
    sheet: { stats: ["Agility", "Strength", "Finesse", "Instinct", "Presence", "Knowledge", "Evasion"], resources: ["HP", "Stress", "Hope", "Armor"], fields: ["Experiences", "Domain cards", "Inventory", "Notes"], roll: "2d12+{value}" },
    monster: ["HP", "Defense", "Stress", "Difficulty", "Thresholds"],
    presets: P(["Duality roll", "2d12"], ["Advantage", "2d12+1d6"], ["Disadvantage", "2d12-1d6"], ["Adversary attack", "1d20"]),
    note: "Defense is the adversary's Difficulty." },
  { id: "coc", name: "Call of Cthulhu 7e", blurb: "Roll d100 under your skill", genre: "fantasy", rules: pct,
    sheet: { stats: ["Spot Hidden", "Listen", "Library Use", "Psychology", "Persuade", "Stealth", "Dodge", "Fighting", "Firearms", "First Aid", "Occult", "Luck"], resources: ["HP", "Sanity", "Magic Points", "Luck"], fields: ["Characteristics", "Backstory", "Gear", "Notes"], roll: "1d100<={value}" },
    monster: ["HP", "Defense", "Speed", "STR", "CON", "POW", "Sanity loss"],
    presets: P(["Bonus die", "2d100kl1"], ["Penalty die", "2d100kh1"], ["Sanity loss", "1d6"], ["Luck", "1d100"]),
    note: "A 1 is a critical, 100 a fumble." },
  { id: "pbta", name: "Powered by the Apocalypse", blurb: "2d6 + stat: 10+ hit, 7–9 mixed", genre: "fantasy", rules: none,
    sheet: { stats: ["Cool", "Hard", "Hot", "Sharp", "Weird"], resources: ["Harm", "Experience"], fields: ["Moves", "Gear", "Bonds", "Notes"], roll: "2d6+{value}" },
    monster: ["HP", "Defense", "Harm", "Instinct"],
    presets: P(["Move", "2d6"], ["Harm", "1d6"]),
    note: "Rename the stats for Dungeon World, Masks or Monster of the Week." },
  { id: "blades", name: "Blades in the Dark", blurb: "Pool of d6, keep the highest", genre: "fantasy", rules: none,
    sheet: { stats: ["Hunt", "Study", "Survey", "Tinker", "Finesse", "Prowl", "Skirmish", "Wreck", "Attune", "Command", "Consort", "Sway"], resources: ["Stress", "Trauma", "Harm", "Coin"], fields: ["Special abilities", "Friends & rivals", "Load", "Notes"], roll: "{value}d6kh1" },
    monster: ["HP", "Defense", "Tier", "Threat"],
    presets: P(["Fortune roll", "2d6kh1"], ["Zero dots", "2d6kl1"], ["Resistance", "2d6kh1"], ["Engagement", "2d6kh1"]),
    note: "6 is a full success, 4–5 a partial." },
  { id: "vtm5", name: "Vampire V5", blurb: "d10 pool, count 6+", genre: "fantasy", rules: none,
    sheet: { stats: ["Strength", "Dexterity", "Stamina", "Charisma", "Manipulation", "Composure", "Intelligence", "Wits", "Resolve"], resources: ["Health", "Willpower", "Hunger", "Humanity"], fields: ["Skills", "Disciplines", "Touchstones", "Notes"], roll: "{value}d10>=6" },
    monster: ["HP", "Defense", "Pool", "Blood Potency"],
    presets: P(["Rouse check", "1d10>=6"], ["Frenzy", "3d10>=6"]),
    note: "Put attribute + skill together in the stat for the pool." },
  { id: "savage", name: "Savage Worlds", blurb: "Exploding trait die, wild die", genre: "fantasy", rules: none,
    sheet: { stats: ["Agility", "Smarts", "Spirit", "Strength", "Vigor", "Fighting", "Shooting", "Notice", "Athletics"], resources: ["Wounds", "Fatigue", "Bennies"], fields: ["Edges", "Hindrances", "Gear", "Notes"], roll: "1d{value}!" },
    monster: ["HP", "Defense", "Pace", "Toughness"],
    presets: P(["Wild die", "1d6!"], ["Soak", "1d6!"], ["Initiative card", "1d54"]),
    note: "Write the die size on the sheet: 8 for d8. Defense is Parry." },
  { id: "fate", name: "Fate Core", blurb: "4dF + skill, the ladder", genre: "fantasy", rules: none,
    sheet: { stats: ["Athletics", "Burglary", "Contacts", "Crafts", "Deceive", "Drive", "Empathy", "Fight", "Investigate", "Lore", "Notice", "Physique", "Provoke", "Rapport", "Resources", "Shoot", "Stealth", "Will"], resources: ["Physical stress", "Mental stress", "Fate points"], fields: ["Aspects", "Stunts", "Consequences", "Notes"], roll: "4dF+{value}" },
    monster: ["HP", "Defense", "Aspects", "Skills"],
    presets: P(["Fate roll", "4dF"]), note: "" },
  { id: "fae", name: "Fate Accelerated", blurb: "4dF + approach", genre: "fantasy", rules: none,
    sheet: { stats: ["Careful", "Clever", "Flashy", "Forceful", "Quick", "Sneaky"], resources: ["Stress", "Fate points"], fields: ["Aspects", "Stunts", "Consequences", "Notes"], roll: "4dF+{value}" },
    monster: ["HP", "Defense", "Aspects"],
    presets: P(["Fate roll", "4dF"]), note: "" },
  { id: "cpred", name: "Cyberpunk RED", blurb: "d10 + stat + skill", genre: "cyberpunk", rules: { critDie: 10, critMode: "high", initHigh: true },
    sheet: { stats: ["INT", "REF", "DEX", "TECH", "COOL", "WILL", "LUCK", "MOVE", "BODY", "EMP"], resources: ["HP", "Humanity", "Luck", "Eurobucks"], fields: ["Skills", "Cyberware", "Weapons", "Notes"], roll: "1d10+{value}" },
    monster: ["HP", "Defense", "Speed", "REF", "DEX", "BODY", "Armor"],
    presets: P(["Check", "1d10"], ["Initiative", "1d10"], ["Death save", "1d10"], ["Crit injury", "2d6"]),
    note: "Defense is armor SP. 10 explodes, 1 bites back." },
  { id: "shadowrun", name: "Shadowrun 6e", blurb: "d6 pool, count 5s and 6s", genre: "cyberpunk", rules: none,
    sheet: { stats: ["Body", "Agility", "Reaction", "Strength", "Willpower", "Logic", "Intuition", "Charisma", "Edge", "Magic/Resonance"], resources: ["Physical", "Stun", "Edge", "Nuyen"], fields: ["Skills", "Gear & cyberware", "Contacts", "Notes"], roll: "{value}d6>=5" },
    monster: ["HP", "Defense", "Speed", "Pool", "Armor"],
    presets: P(["Initiative", "1d6"], ["Soak", "6d6>=5"]),
    note: "Put attribute + skill together in the stat for the pool." },
  { id: "mothership", name: "Mothership", blurb: "d100 under stat, stress and panic", genre: "scifi", rules: pct,
    sheet: { stats: ["Strength", "Speed", "Intellect", "Combat", "Sanity", "Fear", "Body"], resources: ["Health", "Wounds", "Stress"], fields: ["Skills", "Loadout", "Trinket & patch", "Notes"], roll: "1d100<={value}" },
    monster: ["HP", "Defense", "Speed", "Combat", "Instinct"],
    presets: P(["Advantage", "2d100kl1"], ["Disadvantage", "2d100kh1"], ["Panic", "1d20"], ["Wound", "1d10"]),
    note: "Doubles are criticals, a 1 is the best roll." },
  { id: "traveller", name: "Traveller", blurb: "2d6 + modifiers, 8+ succeeds", genre: "scifi", rules: none,
    sheet: { stats: ["STR", "DEX", "END", "INT", "EDU", "SOC", "Pilot", "Gun Combat", "Electronics", "Admin"], resources: ["HP", "Credits"], fields: ["Skills", "Career", "Gear", "Notes"], roll: "2d6+{value}" },
    monster: ["HP", "Defense", "Speed", "Armour"],
    presets: P(["Check", "2d6"], ["Boon", "3d6kh2"], ["Bane", "3d6kl2"], ["Damage", "3d6"]),
    note: "Put the DM (modifier) on the sheet." },
  { id: "starwars", name: "Star Wars-style d6", blurb: "Pool of d6, add it up", genre: "scifi", rules: none,
    sheet: { stats: ["Dexterity", "Knowledge", "Mechanical", "Perception", "Strength", "Technical", "Blaster", "Dodge", "Piloting"], resources: ["Wounds", "Force Points", "Character Points"], fields: ["Skills", "Gear", "Notes"], roll: "{value}d6" },
    monster: ["HP", "Defense", "Speed", "Blaster"],
    presets: P(["Wild die", "1d6!"]), note: "" },
  { id: "homebrew", name: "Homebrew d20", blurb: "Four simple stats, start here and change anything", genre: "fantasy", rules: d20,
    sheet: { stats: ["Might", "Agility", "Wits", "Will"], resources: ["HP"], fields: ["Abilities", "Inventory", "Notes"], roll: "1d20+{value}" },
    monster: ["HP", "Defense", "Speed", "Might", "Agility", "Wits", "Will"],
    presets: P(["Attack", "1d20"], ["Ability check", "1d20"]), note: "" },
];
export const systemById = id => SYSTEMS.find(s => s.id === id);

// apply a system to a campaign. Existing characters keep their numbers; only the layout changes.
export function applySystem(c, id, uid) {
  const s = systemById(id); if (!s) return;
  c.system = s.id;
  c.rules = { ...s.rules };
  c.sheet = JSON.parse(JSON.stringify(s.sheet));
  c.statTemplate = [...s.monster];
  // keep the GM's own quick rolls, add the system's that aren't there yet
  c.presets ||= [];
  const have = new Set(c.presets.map(p => p.name.toLowerCase()));
  for (const p of s.presets) if (!have.has(p.name.toLowerCase())) c.presets.push({ id: uid(), ...p });
}
