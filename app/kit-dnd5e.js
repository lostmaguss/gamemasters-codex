// D&D 5e kit: Forge tables, random tables and a ready-to-play adventure for levels 1 to 3.
// Monster names, magic items and rules terms come from the System Reference Document 5.1
// (Wizards of the Coast, CC-BY-4.0). The adventure, the tables and all descriptions are written for this app.
import { pick, cap } from "./util.js";
import * as F from "./genre-fantasy.js";

// ---------- Forge ----------
const DRAGONBORN = { label: "Dragonborn", pre: ["Ar", "Bal", "Don", "Ghe", "Hes", "Kri", "Med", "Meh", "Nad", "Pan", "Rho", "Sha", "Sor", "Tor", "Bir", "Dar", "Har", "Kav", "Mis", "Sur"], f: ["ia", "ra", "nn", "ys", "ira", "ela", "ix"], m: ["ash", "ar", "ex", "ak", "um", "jhan", "inn", "ior"], n: ["ish", "ek", "ro", "an"], clan: ["Ashkarrion", "Brazenthal", "Corruvax", "Durnhalisk", "Embervaast", "Ghelmorax", "Irrisvaal", "Kethrandor", "Morvanthis", "Ostrakhul", "Pyrothaan", "Quorrinax", "Sarvethiel", "Thundrakis", "Velkarrhun", "Zarthenyx"] };
const NAMES = { ...F.NAMES, dragonborn: DRAGONBORN, orc: { ...F.NAMES.orc, label: "Half-orc" }, infernal: { ...F.NAMES.infernal, label: "Tiefling" } };
function makeName(anc, g) {
  if (anc !== "dragonborn") return F.makeName(anc, g);
  const t = DRAGONBORN; g = g || pick(["f", "m", "n"]);
  return `${cap((pick(t.pre) + pick(t[g])).toLowerCase())} ${pick(t.clan)}`;
}

const SRD_ITEMS = [
  // [name, rarity, kind, what it does]
  ["Potion of Healing", "Common", "potion", "Drink it to regain 2d4 + 2 hit points."],
  ["Potion of Climbing", "Common", "potion", "For an hour you gain a climbing speed equal to your walking speed, and advantage on checks to climb."],
  ["Spell Scroll (1st level)", "Common", "wondrous", "Holds one 1st-level spell. Anyone with the spell on their class list can read it to cast it once."],
  ["Potion of Greater Healing", "Uncommon", "potion", "Drink it to regain 4d4 + 4 hit points."],
  ["Bag of Holding", "Uncommon", "wondrous", "Holds up to 500 pounds in a pocket of extradimensional space, and always weighs 15 pounds."],
  ["Cloak of Protection", "Uncommon", "wondrous", "+1 to AC and saving throws while worn (requires attunement)."],
  ["Boots of Elvenkind", "Uncommon", "wondrous", "Your steps make no sound, and you have advantage on Stealth checks that rely on moving silently."],
  ["Cloak of Elvenkind", "Uncommon", "wondrous", "With the hood up, Perception checks to see you have disadvantage and your Stealth checks to hide have advantage (attunement)."],
  ["Goggles of Night", "Uncommon", "wondrous", "Darkvision out to 60 feet, or 60 feet more if you already have it."],
  ["Immovable Rod", "Uncommon", "wondrous", "Press the button and it stays fixed in place, holding up to 8,000 pounds."],
  ["Rope of Climbing", "Uncommon", "wondrous", "Sixty feet of silk rope that moves, knots and fastens itself on command."],
  ["Sending Stones", "Uncommon", "wondrous", "A matched pair. Once a day, the holder of one can cast sending to whoever holds the other."],
  ["Wand of Magic Missiles", "Uncommon", "wondrous", "7 charges. Spend 1 or more to cast magic missile, one spell level higher per extra charge."],
  ["Wand of Web", "Uncommon", "wondrous", "7 charges. Spend 1 to cast web (save DC 15). Requires a spellcaster to attune."],
  ["Weapon, +1", "Uncommon", "weapon", "+1 to attack and damage rolls made with this magic weapon."],
  ["Shield, +1", "Uncommon", "armor", "+1 AC on top of the shield's normal bonus."],
  ["Gauntlets of Ogre Power", "Uncommon", "armor", "Your Strength score is 19 while you wear them (attunement)."],
  ["Driftglobe", "Uncommon", "wondrous", "A glass sphere that casts light or daylight and floats along beside you."],
  ["Pearl of Power", "Uncommon", "wondrous", "Once a day, a spellcaster can use it to recover one spent spell slot of 3rd level or lower (attunement)."],
  ["Javelin of Lightning", "Uncommon", "weapon", "Throw it and speak the word: it becomes a 120-foot line of lightning (4d6, DC 13 Dex save for half)."],
  ["Ring of Protection", "Rare", "wondrous", "+1 to AC and saving throws (attunement)."],
  ["Flame Tongue", "Rare", "weapon", "Speak the command word and flames burst from the blade: +2d6 fire damage on a hit, and it sheds bright light (attunement)."],
  ["Necklace of Fireballs", "Rare", "wondrous", "Pull off a bead and throw it: it explodes as a 3rd-level fireball. Comes with 1d6 + 3 beads."],
  ["Bracers of Defense", "Rare", "armor", "+2 AC while you wear no armor and no shield (attunement)."],
  ["Weapon, +2", "Rare", "weapon", "+2 to attack and damage rolls made with this magic weapon."],
  ["Amulet of Health", "Rare", "wondrous", "Your Constitution score is 19 while you wear it (attunement)."],
];
const KIND = { weapon: "Weapon", armor: "Armor & shields", wondrous: "Wondrous item", potion: "Potion" };
const ITEM = {
  types: KIND, pool: ["weapon", "armor", "wondrous", "wondrous", "potion", "potion"],
  init(type) { const it = pick(SRD_ITEMS.filter(x => x[2] === type)); return { type, srd: it, rarity: it[1] }; },
  title: c => c.srd[0],
  sub: c => `${c.srd[1]} ${KIND[c.type].toLowerCase()} · SRD 5.1`,
  power: c => c.srd[3],
  rarity: [["Common", 30], ["Uncommon", 50], ["Rare", 20]],
  // the SRD's price guide by rarity
  value: { Common: "50 to 100 gp", Uncommon: "101 to 500 gp", Rare: "501 to 5,000 gp", "Very rare": "5,001 to 50,000 gp", Legendary: "50,001 gp or more" },
  look: F.ITEM.look, quirk: ["the previous owner's initials are scratched into it", "smells faintly of pipe smoke", "is slightly too small for a human hand", "has a wizard's inventory number painted on it", "came wrapped in a page torn from a prayer book", "hums a single note when moonlight touches it", ...F.T.quirkI.slice(0, 6)], history: F.ITEM.history,
};

const T = {
  occupation: [...F.T.occupation, "acolyte of a small temple", "retired adventurer with a limp", "guild artisan", "folk hero of the next village", "sage who wants a bodyguard", "hedge wizard", "noble's knight", "street urchin who knows every rooftop", "sailor on shore leave", "hermit who came down the mountain"],
  monster: ["owlbear", "pack of gnolls", "ogre", "ghoul pack", "band of hobgoblins", "basilisk", "wight and its zombies", "pair of harpies", "manticore", "young green dragon", "troll", "giant spider nest", "mimic posing as a treasure chest", "gelatinous cube in the old cistern", "bugbear raiding party"],
  foe: ["goblin raiders", "a bandit captain and her crew", "a cult of the Sleeping Wyrm", "hobgoblin legionnaires", "a necromancer's servants", "kobold trappers", "a rival adventuring party", "a corrupt sheriff", "gnoll marauders", "a green hag and her coven"],
  rewardT: {
    easy: ["50 gp and a hot meal", "a Potion of Healing each", "25 gp each and free lodging for a week", "a decent riding horse", "a Spell Scroll of the party's choosing (1st level)"],
    standard: ["150 gp each", "a Bag of Holding", "a +1 weapon from the family armory", "Boots of Elvenkind", "a Wand of Magic Missiles with 4 charges left"],
    hard: ["500 gp each", "a Cloak of Protection", "a Flame Tongue", "a minor title and a small manor", "a Necklace of Fireballs (4 beads)"],
    deadly: ["2,000 gp each", "a Ring of Protection and the lord's favor", "a +2 weapon of legend", "a keep and the land around it", "an Amulet of Health"] },
  rumor: [...F.T.rumor, "A wizard's tower lost its wizard, but not its guardians", "Someone is buying owlbear eggs, no questions asked", "Goblins have learned to make black powder", "A gelatinous cube cleaned out the sewers, and the thieves' guild with it", "The new temple heals anyone, for a price paid later"],
  hook: [...F.T.hook, "The town crier posts a bounty: 50 gp for proof the beast is dead", "A dying knight presses a map into a hero's hand", "A noble's steward hires the party for a 'simple' delivery"],
};

const EXTRA = {
  coin: n => `${n} gp`,
  valuables: ["a silver ewer (25 gp)", "a carved bone statuette (25 gp)", "a gold locket with a portrait (75 gp)", "two bloodstones (50 gp each)", "a moonstone (50 gp)", "a jade figurine of a frog (75 gp)", "a silk robe with gold thread (25 gp)", "an embroidered glove set with jet (25 gp)", "a small gold idol (250 gp)", "a pearl (100 gp)", "an amethyst (100 gp)", "a set of electrum dice (25 gp)"],
  hide: (["under a loose flagstone", "in a false-bottomed chest, trapped with a poison needle (DC 15 to spot)", "inside a hollow statue", "at the bottom of a well", "in a coffin, under the occupant", "behind a secret door (DC 13 Perception)", "sewn into a bedroll", "in a locked iron box (DC 15 thieves' tools)"]),
  activity: ["arguing over loot", "setting an ambush", "torturing a captured scout", "guarding a prisoner", "fleeing from something worse", "performing a ritual", "making camp, half of them asleep", "hunting the party"],
  terrain: ["a rope bridge over a gorge", "a burned-out farmstead", "a flooded crypt (difficult terrain)", "fog-bound marshes (lightly obscured)", "a crumbling watchtower", "a moonlit graveyard", "a forest clearing with standing stones", "a narrow mine shaft with an ore cart"],
  fallback: ["goblins", "wolves", "bandits", "skeletons", "zombies", "an ogre", "giant spiders", "kobolds"],
};

export const forge = { NAMES, makeName, T, ITEM, EXTRA, LABELS: { ancestry: "Race", foes: "Difficulty", origin: "Race" }, DIFF: { easy: "Easy", standard: "Medium", hard: "Hard", deadly: "Deadly" } };

// ---------- random tables ----------
export function tables(t) {
  const f = "D&D 5e";
  return [
    t("Wilderness encounter (levels 1-4)", `${f} · Encounters`, ["{1d4+2} goblins with a captured merchant tied to a pony", "{1d3+1} wolves circling a wounded deer, then the party", "A bandit toll on the bridge: {1d4+3} bandits, one with a crossbow on the far bank", "An owlbear's den. The cubs are cute. The mother is not", "A pair of harpies singing from the cliffs above the road", "Kobold trappers: the road ahead is lined with snares (DC 12 Perception to spot)", "A lost dwarf prospector who swears there's gold in the next valley", "{1d6+2} zombies shambling out of a flooded barrow", "A druid who asks the party to leave the forest by sundown", "An ogre arguing with a bridge it thinks is talking back", "A merchant caravan that will trade at fair prices, and a spy riding with it", "Weather turns: @{Weather}"]),
    t("Dungeon encounter (levels 1-4)", `${f} · Encounters`, ["{2d4} skeletons standing guard, waiting for a password nobody remembers", "A gelatinous cube in a corridor exactly its width", "{1d4+1} giant rats nesting in old grain sacks", "A mimic posing as the only door out", "A bugbear sleeping on a pile of stolen boots", "{1d6} kobolds and a trap they're very proud of", "A ghoul gnawing on a fresh adventurer, and that adventurer's map", "An orc war band of {1d4+2} looking for their missing chief", "A friendly goblin who will sell out its tribe for a sweet roll", "A zombie still wearing a guild badge, and a coin purse"]),
    t("Trap", `${f} · Dungeon`, ["Pit trap: DC 12 Perception to spot the seam, DC 12 Dexterity save or fall 10 ft (1d6 bludgeoning)", "Poison needle in a lock: DC 15 to spot, 1 piercing and DC 11 Constitution save or poisoned for an hour", "Swinging blade across the corridor: +5 to hit, 1d10 slashing. A pressure plate sets it off", "Falling net from the ceiling: DC 10 Dexterity save or restrained (DC 10 Strength to escape)", "Collapsing stairs turn into a ramp: DC 13 Dexterity save or slide into the room below", "Rune of fire on a door: DC 12 Dexterity save, 2d6 fire, half on a success", "Poison gas fills a sealed room: DC 13 Constitution save each round or 1d8 poison", "Rolling stone down a sloped hall: DC 15 Dexterity save or 2d10 bludgeoning and knocked prone"]),
    t("Pocket treasure (levels 1-4)", `${f} · Loot`, ["{5d6} cp", "{4d6} sp", "{3d6} gp", "{2d6} gp and a lucky rabbit's foot", "{1d6} gp and a love letter in Elvish", "{3d6} sp and a gambling marker from a local tavern", "A gemstone worth 10 gp and a hand-drawn map", "{2d6} gp in coins from a kingdom that fell a century ago", "A Potion of Healing in a cracked bottle", "{4d6} gp sewn into a coat lining"]),
    t("Minor magic item", `${f} · Loot`, SRD_ITEMS.filter(x => x[1] !== "Rare").map(([n, r, , d]) => [r === "Common" ? 3 : 1, `${n} (${r.toLowerCase()}): ${d}`])),
    t("NPC attitude", `${f} · Social`, [[2, "Hostile: wants the party gone, or worse"], [4, "Indifferent: helps if it costs nothing"], [3, "Friendly: helps if it's not too risky"], [1, "Friendly, and has heard of the party"]]),
    t("Town encounter", `${f} · Encounters`, ["A pickpocket tries the party's purses (Sleight of Hand +4)", "A town guard patrol asks for names and business", "A street preacher warns that the Sleeping Wyrm is waking", "A noble's carriage nearly runs someone over, and doesn't stop", "A tavern brawl spills into the street", "A child sells 'genuine' treasure maps for a copper", "A merchant offers a deal that is far too good", "A funeral procession for someone the party met yesterday", "A wizard's familiar has escaped and the wizard offers a reward", "A wanted poster with one hero's face on it"]),
    t("Dungeon room", `${f} · Dungeon`, ["Barracks: rotten bunks, a stash under the third bed", "Shrine to a forgotten god, the offering bowl still wet", "Flooded hall, waist deep (difficult terrain), something moving", "Library with books that crumble when opened, except one", "Kitchen, a cauldron still warm", "Armory, mostly rust, one weapon gleaming", "Prison cells, one prisoner left, and they're glad to see you", "Treasure vault, already looted, a trap still armed", "Throne room, the throne sized for something much larger", "Collapsed cave-in, a draft from the other side", "Alchemist's lab, labels in a language nobody reads", "Crypt, the lids slid aside from within"]),
    t("Quest hook", `${f} · Plot`, ["The mill's millstone was stolen overnight. Nobody can lift one of those", "A cleric's holy symbol went cold. She wants to know why", "The baron pays 100 gp for the head of the owlbear eating his sheep", "A wizard needs an escort to the tower he was thrown out of", "Children are leaving their beds at night and walking into the woods", "A dwarf clan wants their ancestor's axe back from the goblins who took it", "The ferryman won't cross after dark anymore, and won't say why", "A dragon's shed scale is worth a fortune. Someone found one in the hills", "A noble wedding needs guards who aren't on anyone's payroll", "The graveyard's oldest crypt is open, and empty"]),
    t("Critical hit flavor", `${f} · Combat`, ["The blow spins them around: they drop what they're holding", "A ringing hit to the helmet. They see stars", "The strike lands exactly where an old wound was", "The weapon bites deep. They stagger back 5 ft", "A perfect strike. Someone watching gasps", "Armor straps cut: their AC drops by 1 until they fix it"]),
    t("Fumble flavor", `${f} · Combat`, ["The weapon slips and lands 10 ft away", "You overextend. The next attack against you has advantage", "Your shield arm tangles with your cloak", "You strike the wall. Sparks, and a bad sound from your blade", "You step on something that squeals", "A swing so wide you nearly hit an ally. They glare"]),
    t("Downtime complication", `${f} · Plot`, ["A rival spreads rumors about the party", "The temple wants a donation, loudly", "A creditor from a past life finds them", "An apprentice burns down part of the workshop", "The tavern they're staying at is raided by the guard", "An old friend shows up needing a place to hide"]),
  ];
}

// ---------- the adventure ----------
export const adventure = { title: "The Barrow of Thornbury", blurb: "Levels 1 to 3, three sessions. Goblins raid a harvest village, a barrow under Gallows Hill wakes, and a hag in the bog wants a dead king's crown.", };

export function campaign({ blank, uid, lib, sys, toCreature }) {
  const c = blank("The Barrow of Thornbury");
  c.tagline = "D&D 5e · levels 1 to 3 · a ready-to-play adventure";
  c.stash = { money: 0, unit: "gp", items: [], log: [] };
  const now = Date.now();
  const note = (title, cat, tags, body, extra = {}) => ({ id: uid(), title, cat, tags, body, updated: now, ...extra });

  // party: four level-1 heroes from the SRD's races and classes. Players put their own names in.
  const pc = (character, role, color, stats, hp, text) => ({ id: uid(), player: "", character, role, color, stats, res: { HP: { cur: hp, max: hp }, "Hit Dice": { cur: 1, max: 1 }, Inspiration: { cur: 0, max: 1 } }, conds: [], text });
  c.party = [
    pc("Hilde Ironfist", "Hill dwarf cleric (Life) 1", "#d9776f", { STR: "+1", DEX: "-1", CON: "+2", INT: "+0", WIS: "+3", CHA: "+0", Proficiency: "+2", Initiative: "-1", Perception: "+5" }, 11,
      { Attacks: "Warhammer: +3 to hit, 1d8+1 bludgeoning\nLight crossbow: +1 to hit, range 80/320, 1d8-1 piercing", "Features & traits": "AC 18 (chain mail, shield)\nDarkvision 60 ft, dwarven resilience (advantage on saves against poison)\nDisciple of Life: healing spells heal 2 + spell level extra", Spells: "Spell save DC 13, +5 to hit. Slots: 2 (1st)\nCantrips: sacred flame, guidance, light\nPrepared: bless, cure wounds, healing word, shield of faith (plus domain: bless, cure wounds)", Inventory: "Holy symbol of the Hearth Mother, priest's pack, 15 gp" }),
    pc("Tamsin Reed", "Human fighter 1", "#8fb07f", { STR: "+3", DEX: "+1", CON: "+2", INT: "+0", WIS: "+1", CHA: "+0", Proficiency: "+2", Initiative: "+1", Perception: "+3" }, 12,
      { Attacks: "Longsword: +5 to hit, 1d8+3 slashing (1d10+3 two-handed)\nLongbow: +3 to hit, range 150/600, 1d8+1 piercing", "Features & traits": "AC 18 (chain mail, shield) with the Defense style: +1 AC\nSecond Wind: once per rest, bonus action, regain 1d10+1 HP", Spells: "", Inventory: "Explorer's pack, a medal from a war nobody remembers, 10 gp" }),
    pc("Pip Underbough", "Lightfoot halfling rogue 1", "#d4a54a", { STR: "-1", DEX: "+3", CON: "+1", INT: "+1", WIS: "+0", CHA: "+2", Proficiency: "+2", Initiative: "+3", Perception: "+4" }, 9,
      { Attacks: "Shortsword: +5 to hit, 1d6+3 piercing\nShortbow: +5 to hit, range 80/320, 1d6+3 piercing\nSneak Attack: +1d6 once a turn with advantage or an ally next to the target", "Features & traits": "AC 14 (leather)\nLucky: reroll natural 1s on attacks, checks and saves\nNaturally stealthy, thieves' cant, expertise in Stealth and thieves' tools", Spells: "", Inventory: "Thieves' tools, burglar's pack, a stolen silver spoon, 12 gp" }),
    pc("Elowen Ashgrove", "High elf wizard 1", "#a98fb6", { STR: "-1", DEX: "+2", CON: "+1", INT: "+3", WIS: "+1", CHA: "+0", Proficiency: "+2", Initiative: "+2", Perception: "+3" }, 7,
      { Attacks: "Fire bolt: +5 to hit, range 120, 1d10 fire\nDagger: +4 to hit, 1d4+2 piercing", "Features & traits": "AC 12 (15 with mage armor)\nDarkvision 60 ft, fey ancestry, trance\nArcane Recovery: once a day after a short rest, recover a 1st-level slot", Spells: "Spell save DC 13, +5 to hit. Slots: 2 (1st)\nCantrips: fire bolt, mage hand, prestidigitation, light\nSpellbook: burning hands, detect magic, mage armor, magic missile, shield, sleep", Inventory: "Spellbook, component pouch, scholar's pack, a letter from a teacher who disappeared, 9 gp" }),
  ];

  // bestiary: SRD 5.1 stat blocks, from the library where it has them
  const fromLib = n => { const r = lib?.creatures.find(x => x[0] === n); return r ? toCreature(sys, r) : null; };
  const own = (name, kind, threat, vals, abil, notes) => toCreature(sys, [name, kind, threat, vals, abil, notes]);
  const goblin = fromLib("Goblin"), wolf = fromLib("Wolf"), skel = fromLib("Skeleton"), zombie = fromLib("Zombie"), bugbear = fromLib("Bugbear");
  const rat = own("Giant Rat", "Small beast", 1, ["7", "12", "30 ft", "7 (−2)", "15 (+2)", "11 (+0)", "2 (−4)", "10 (+0)", "4 (−3)", "1/8"], [["Bite", "1d20+4", "Melee.", "1d4+2"], ["Pack Tactics", "", "Advantage on attacks when an ally is within 5 ft of the target."], ["Keen Smell", "", "Advantage on Perception checks that rely on smell."]], "Swarms out of the barrow's lower crypts in threes and fours.");
  const wight = own("Wight", "Medium undead, neutral evil", 3, ["45", "14", "30 ft", "15 (+2)", "14 (+2)", "16 (+3)", "10 (+0)", "13 (+1)", "15 (+2)", "3"], [["Multiattack", "", "Two longsword attacks, or one longsword attack and one Life Drain."], ["Longsword", "1d20+4", "Melee.", "1d8+2"], ["Life Drain", "1d20+4", "Necrotic damage; the target's HP maximum drops by the same amount until a long rest (DC 13 Con save). A humanoid killed this way rises as a zombie.", "1d6+2"], ["Longbow", "1d20+4", "Ranged 150/600.", "1d8+2"], ["Sunlight Sensitivity", "", "Disadvantage on attacks and Perception by sight in sunlight."]], "Resistant to necrotic and to nonmagical weapons that aren't silvered. Immune to poison. Speaks Common, slowly, as if remembering how.");
  const hag = own("Green Hag", "Medium fey, neutral evil", 3, ["82", "17", "30 ft, swim 30 ft", "18 (+4)", "12 (+1)", "16 (+3)", "13 (+1)", "14 (+2)", "14 (+2)", "3"], [["Claws", "1d20+6", "Melee.", "2d8+4"], ["Illusory Appearance", "", "Looks like someone else until she takes an action to drop it, or a DC 20 Investigation sees through it."], ["Invisible Passage", "", "Turns invisible until she attacks, casts a spell, or loses concentration."], ["Innate spells", "", "At will: dancing lights, minor illusion, vicious mockery (DC 12)."], ["Mimicry", "", "Mimics animal sounds and voices. DC 14 Insight to tell."]], "Amphibious. Never fights fair: she talks, lies, makes a deal, and only claws when cornered.");
  const chief = bugbear && { ...bugbear, id: uid(), name: "Grukk Bonebreaker", kind: "Bugbear chief", notes: "Bugbear stat block with 35 HP. Rules the Mudfoot goblins because he's the only one Granny Nettle talks to. Hates sunlight, loves honey.", stats: { ...bugbear.stats, HP: "35" }, hp: "35" };
  c.bestiary = [goblin, wolf, rat, skel, zombie, bugbear, chief, wight, hag].filter(Boolean);
  for (const b of c.bestiary) b.tags = `${b.tags || "D&D 5e"}, thornbury`;

  // the Codex
  const N = {
    town: note("Thornbury", "Locations", "village, act 1", "# Thornbury\nA farming village of about two hundred, at the edge of the [[Greywood]]. Thatch roofs, a stone mill, a shrine to the Hearth Mother and one inn, the **Lamb & Lantern**.\n\n- Run by [[Reeve Hollis Marrow]]\n- Harvest Eve is tomorrow: bonfires, cider, and the whole village in the square\n- [[Gallows Hill]] rises north of the fields. Nobody plows its slopes.\n\n**What's wrong:** twenty sheep gone in two weeks, a shepherd missing, and children say they hear singing under the hill at night.", { pinned: true }),
    hill: note("Gallows Hill", "Locations", "barrow, act 2", "# Gallows Hill\nAn old burial mound with a single dead oak on top, where the village hanged thieves a century ago. Inside is the barrow of **[[Sir Aldric the Barrow King]]**.\n\n**Upper barrow:** the [[Mudfoot goblins]] dug in through a badger sett on the west side. Sheep pens, a cookfire, stolen washing.\n**Middle crypts:** the old knights, mostly skeletons that rise if the sealing stones are moved. Giant rats.\n**Deep tomb:** a stone door carved with a crown. Behind it, Sir Aldric, a wight, sleeping on his throne.\n\nThe singing is the goblins: they sing to keep their courage up in the dark."),
    wood: note("Greywood", "Locations", "forest", "Old forest east of [[Thornbury]]. Wolves, woodcutters, and a ring of standing stones the druids still visit. The track through it leads to the [[Nettlemire]]."),
    bog: note("Nettlemire", "Locations", "bog, act 3", "# Nettlemire\nA reed bog two hours east, through the [[Greywood]]. Will-o'-wisp lights at dusk. In the middle, on stilts, the hut of [[Granny Nettle]].\n\n- Waist-deep water: difficult terrain\n- The hut's door is a face. It asks your name. Don't give your real one."),
    reeve: note("Reeve Hollis Marrow", "NPCs", "quest giver, thornbury", "Village headman. Fifty, broad, sunburned, honest, out of his depth.\n\n**Wants:** the sheep back, the shepherd found, and Harvest Eve to go ahead.\n**Offers:** 25 gp each now, 25 more when it's done, and the inn's best rooms.\n**Secret:** his grandfather sealed the barrow and swore the family would keep it shut. The key-stone is in the shrine. He hasn't told anyone."),
    wenna: note("Mother Wenna", "NPCs", "herbalist, ally", "The village herbalist and midwife, eighty if she's a day. Sells Potions of Healing (50 gp) and knows the old stories.\n\n**Knows:** the Barrow King was buried with his crown, and the crown 'keeps him down'. A hag offered her grandmother a bargain once. She said no. Her sister said yes.\n**Secret:** [[Granny Nettle]] is her sister."),
    nettle: note("Granny Nettle", "NPCs", "villain, green hag", "A green hag in the [[Nettlemire]]. Looks like a kindly old woman with a basket of mushrooms, until she doesn't.\n\n**Wants:** the Barrow King's crown. Without it, Sir Aldric wakes and his dead march on Thornbury. She'll bargain to take the village as payment for putting him back to sleep.\n**Plan:** she sent [[Grukk Bonebreaker]] and the [[Mudfoot goblins]] into the barrow to dig for the crown.\n**Bargain:** she keeps her word, exactly, and never the way you meant it."),
    grukk: note("Grukk Bonebreaker", "NPCs", "bugbear, goblin chief", "Bugbear who rules the [[Mudfoot goblins]] by being the biggest. Afraid of [[Granny Nettle]], and of the deep tomb.\n\n**Will deal:** honey, a good weapon, or a way out from under the hag. He'll give up the crown's location if he gets out alive."),
    gob: note("Mudfoot goblins", "Factions", "goblins, barrow", "A dozen goblins (and the shepherd, Jem, alive, their prisoner). Driven out of the hills, promised a village by [[Granny Nettle]]. They raid for sheep because they're hungry, not because they're cruel. Mostly.\n\nThe goblin **Snitwick** wants to be chief. Treat him well and he'll lead the party around the guard posts."),
    aldric: note("Sir Aldric the Barrow King", "Lore", "wight, the barrow", "A knight-lord who held this valley two hundred years ago and wouldn't give it up, even to death. Buried in [[Gallows Hill]] with his crown on his head. The crown holds him asleep.\n\nIf the crown is taken, he wakes in 1d4 days, and the skeletons of his knights rise with him."),
    crown: note("Crown of the Barrow King", "Items", "quest item, cursed", "A circlet of black iron set with a single moonstone. While it sits on Sir Aldric's head, he sleeps.\n\n**Worn by anyone else:** they gain darkvision 60 ft and hear the dead whispering (disadvantage on Wisdom saves against fear). Undead within 30 ft know where they are."),
    q1: note("Find the shepherd and the sheep", "Quests", "act 1", "Jem the shepherd went missing three nights ago on [[Gallows Hill]]. Twenty sheep gone. Reward from [[Reeve Hollis Marrow]]: 25 gp each now, 25 gp each on return."),
    q2: note("Keep the Barrow King asleep", "Quests", "act 2-3", "Whatever happens, the crown must end up back on Sir Aldric's head, or he must be destroyed. [[Granny Nettle]] wants it first."),
  };
  c.notes = [...Object.values(N), ...(lib?.spells || []).map(r => ({ id: uid(), title: r[0], cat: "Spells", tags: `D&D 5e, ${r[1]}`, body: r[2], updated: now, lib: sys.id }))];

  // a clue board
  const b = c.boards[0], card = (type, x, y, w, color, title, text, extra = {}) => ({ id: uid(), type, x, y, w, color, rot: (Math.random() * 4 - 2).toFixed(2), title, text, z: 1, ...extra });
  const h1 = card("heading", 40, 30, 360, "paper", "What's under Gallows Hill?", "");
  const r1 = card("ref", 60, 150, 230, "lichen", "", "", { ref: N.town.id }), r2 = card("ref", 380, 150, 230, "rose", "", "", { ref: N.nettle.id });
  const r3 = card("ref", 700, 150, 230, "sky", "", "", { ref: N.aldric.id }), n1 = card("note", 220, 400, 230, "mustard", "", "Singing under the hill at night. Children heard it first.");
  const n2 = card("note", 560, 420, 230, "paper", "", "Muddy goblin prints, and a bugbear's. Heading north.");
  b.cards = [h1, r1, r2, r3, n1, n2];
  b.links = [{ id: uid(), a: r1.id, b: n1.id, color: "black" }, { id: uid(), a: r2.id, b: r3.id, color: "red" }, { id: uid(), a: n2.id, b: r2.id, color: "red" }];
  b.view = { x: 40, y: 30, z: .9 };

  c.clocks = [
    { id: uid(), name: "The Barrow King wakes", segs: 6, filled: 1, color: "#cf8577", note: "Tick when the goblins dig deeper or the sealing stones move. Full: Sir Aldric rises.", onStream: false },
    { id: uid(), name: "Granny Nettle's patience", segs: 4, filled: 0, color: "#9bb08a", note: "Tick each day the crown isn't brought to her. Full: she comes to Thornbury herself.", onStream: false },
  ];
  c.rep = [{ id: uid(), note: N.gob.id, v: -2 }, { id: uid(), name: "Village of Thornbury", v: 1 }];
  c.calendar = { months: ["Deepwinter", "Clawmelt", "Seedtide", "Rainfall", "Greening", "Highsun", "Midsummer", "Gold", "Harvest", "Leaffall", "Frostrime", "Longnight"].map(n => ({ name: n, days: 30 })), weekdays: ["Moonday", "Earthday", "Fireday", "Waterday", "Windday", "Starday", "Sunday"], year: 1024, month: 8, day: 28, era: "", events: [{ id: uid(), month: 8, day: 29, title: "Harvest Eve in Thornbury" }] };

  c.handouts = [
    { id: uid(), title: "The reeve's letter", type: "text", style: "letter", text: "To any sword or spell for hire,\n\nThornbury needs help. Our sheep are taken by night and our shepherd Jem is three days gone. There is singing under Gallows Hill.\n\n25 gold each now, 25 more when it is done, and the best rooms at the Lamb & Lantern.\n\nHollis Marrow, Reeve" },
    { id: uid(), title: "Carved on the tomb door", type: "text", style: "parchment", text: "HERE SLEEPS ALDRIC, LORD OF THE VALE.\nWHILE THE CROWN SITS, THE KING SITS.\nLIFT IT, AND HE RISES TO TAKE IT BACK." },
    { id: uid(), title: "Granny Nettle's offer", type: "text", style: "card", text: "Bring me the crown, dearies, and I'll sing the old king back to sleep. All I ask is a little something from the village. Just one thing. You'll hardly miss it." },
  ];

  // sessions: a played prologue to show the Chronicle, then three sessions ready to run
  const t = s => ({ id: uid(), text: s, done: false });
  c.sessions = [{
    id: uid(), num: 1, title: "Harvest Eve", date: "", ingame: "28 Harvest, 1024", hours: 1, moods: ["Roleplay"], ambience: "Bonfire smoke, cider, crickets", example: true,
    beats: [
      { id: uid(), type: "social", text: "The heroes arrive in [[Thornbury]] with the reeve's letter and meet [[Reeve Hollis Marrow]] at the Lamb & Lantern.", star: false },
      { id: uid(), type: "discovery", text: "[[Mother Wenna]] tells the story of the Barrow King, and goes pale when someone mentions the bog.", star: true },
      { id: uid(), type: "discovery", text: "Goblin and bugbear tracks in the north field, leading to [[Gallows Hill]].", star: false },
    ],
    quotes: [{ id: uid(), who: "Reeve Hollis", line: "It's only sheep. Mostly sheep. And Jem." }],
    cliff: "As the Harvest Eve bonfires are lit, a goblin war horn sounds from the dark fields.",
    recap: "The heroes reached Thornbury on the eve of the harvest festival. Sheep are vanishing, the shepherd Jem is missing, and children hear singing under Gallows Hill. Old Mother Wenna spoke of a king buried there with his crown. Then, as the bonfires were lit, a goblin war horn sounded from the fields.",
    attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "Session zero: characters made, bonds chosen", threads: [{ id: uid(), text: "Where is Jem the shepherd?", done: false }, { id: uid(), text: "What is Mother Wenna not saying?", done: false }],
    scars: [], worked: "", change: "", rating: 0, prep: [], created: now,
  }, {
    id: uid(), num: 2, title: "Raid on Harvest Eve", status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + 1,
    plan: {
      start: "Goblins burst out of the cornfield on stolen sheep, howling, with torches. One grabs the reeve's daughter's cider jug and runs. Roll initiative.",
      scenes: [t("Fight the raiders in the square: 4 goblins and 2 wolves"), t("Chase the last goblin through the fields at night, or capture one"), t("Question the captured goblin (Snitwick) about the barrow, the bugbear and 'the old woman'"), t("Mother Wenna sells healing potions and warns them about the deep tomb"), t("March to Gallows Hill at dawn, find the badger-sett entrance")],
      secrets: [t("The goblins are hungry, not evil: a hag promised them the village"), t("Jem the shepherd is alive, a prisoner in the upper barrow"), t("The reeve's family sealed the barrow, and the key-stone is in the shrine"), t("Mother Wenna is Granny Nettle's sister"), t("Taking the crown wakes the Barrow King in 1d4 days")],
      cast: [N.reeve.id, N.wenna.id, N.gob.id], encounters: [], treasure: [t("Goblin purses: {3d6} sp and a stolen wedding ring"), t("2 Potions of Healing from Mother Wenna, at half price if they're kind")], handouts: [],
    },
  }, {
    id: uid(), num: 3, title: "Under Gallows Hill", status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + 2,
    plan: {
      start: "The badger sett opens into a low tunnel that smells of sheep and woodsmoke. Somewhere ahead, goblins are singing, badly.",
      scenes: [t("The upper barrow: goblin camp, sheep pens, Jem tied up"), t("Grukk Bonebreaker: fight, bribe with honey, or turn him against the hag"), t("The middle crypts: sealing stones, skeletons and giant rats"), t("The tomb door: read the carving, decide whether to open it"), t("Sir Aldric on his throne, the crown on his head")],
      secrets: [t("Grukk is more afraid of the hag than of the party"), t("Snitwick will lead them around the guard posts for a promise of being chief"), t("The skeletons only rise if a sealing stone is moved"), t("Putting the crown back after taking it works, but only on Aldric's head")],
      cast: [N.grukk.id, N.gob.id, N.aldric.id], encounters: [], treasure: [t("Grukk's hoard: {4d6} gp, a +1 shield"), t("A knight's tomb: a silvered longsword (helps against the wight)"), t("The Crown of the Barrow King, if they dare")], handouts: [],
    },
  }, {
    id: uid(), num: 4, title: "Granny Nettle's Bargain", status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + 3,
    plan: {
      start: "A kindly old woman with a basket of mushrooms is waiting at the inn. She knows their names. 'You have something of mine, dearies.'",
      scenes: [t("Granny Nettle's offer at the inn"), t("Through the Greywood: wolves, will-o'-wisps, a druid's warning"), t("The Nettlemire: the hut on stilts with a door that asks your name"), t("The bargain or the battle with the hag"), t("If the crown was taken: the dead march on Thornbury at midnight")],
      secrets: [t("Her 'one thing' is every child's laughter in the village"), t("She can't enter a house without being invited"), t("Mother Wenna can tell them the hag's true name, which breaks a bargain")],
      cast: [N.nettle.id, N.wenna.id, N.bog.id], encounters: [], treasure: [t("Hag's cauldron: a Potion of Greater Healing, Goggles of Night"), t("The reeve's reward: 25 gp each and the village's thanks")], handouts: [],
    },
  }];
  c.sessions[1].recap = c.sessions[0].recap; // the read-aloud opener for the first session they run
  const by = n => c.bestiary.find(x => x.name === n)?.id;
  c.sessions[1].plan.encounters = [{ id: uid(), creature: by("Goblin"), count: 4, hp: [7, 7, 7, 7] }, { id: uid(), creature: by("Wolf"), count: 2, hp: [11, 11] }].filter(e => e.creature);
  c.sessions[2].plan.encounters = [{ id: uid(), creature: by("Grukk Bonebreaker"), count: 1, hp: [35] }, { id: uid(), creature: by("Goblin"), count: 3, hp: [7, 7, 7] }, { id: uid(), creature: by("Skeleton"), count: 3, hp: [13, 13, 13] }, { id: uid(), creature: by("Giant Rat"), count: 4, hp: [7, 7, 7, 7] }, { id: uid(), creature: by("Wight"), count: 1, hp: [45] }].filter(e => e.creature);
  c.sessions[3].plan.encounters = [{ id: uid(), creature: by("Green Hag"), count: 1, hp: [82] }, { id: uid(), creature: by("Wolf"), count: 3, hp: [11, 11, 11] }, { id: uid(), creature: by("Zombie"), count: 6, hp: [22, 22, 22, 22, 22, 22] }].filter(e => e.creature);
  return c;
}
