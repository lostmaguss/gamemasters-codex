// Cairn kit: a by-the-book character generator, Forge tables, random tables and a ready-to-play adventure.
// Cairn is by Yochai Gal (CC-BY-SA 4.0). Its rules are summarized in rules-notes.js; every table, name,
// background and the adventure here are original writing for the app.
import { pick, cap, rnd } from "./util.js";
import * as F from "./genre-fantasy.js";

const d = n => rnd(n) + 1, d3 = () => d(6) + d(6) + d(6);

// ---- character generation ----
// [background, two starting items]; an item is a name, or [name, bulky]
const BACKGROUNDS = [
  ["Alchemist's apprentice", ["Vial of acid (d6, one use)", "Mortar and pestle"]],
  ["Beekeeper", ["Smoker and veil", "Jar of honey (eat: recover all HP)"]],
  ["Bone-setter", ["Bandages and splints (3 uses)", "Bone saw (d6)"]],
  ["Charcoal burner", ["Shovel (d6)", "Tinderbox"]],
  ["Cutpurse", ["Lockpicks", "A stolen signet ring"]],
  ["Ferryman", ["Rope, 50 ft", "Grappling hook"]],
  ["Fletcher", ["Bundle of arrows", "Whittling knife"]],
  ["Gravedigger", ["Shovel (d6)", "Lantern"]],
  ["Hedge-witch", ["@spellbook", "Bundle of dried herbs"]],
  ["Herbalist", ["Healing poultice (2 uses)", "Sickle (d6)"]],
  ["Hunter", ["Snares (3)", "Skinning knife (d6)"]],
  ["Lamplighter", ["Lantern", "Flask of oil (3 uses)"]],
  ["Sellsword", ["Whetstone", "An old regimental badge"]],
  ["Miner", [["Pickaxe (d8, bulky)", true], "Candles (5)"]],
  ["Minstrel", ["Lute", "Fine clothes"]],
  ["Pilgrim", ["Holy symbol", "Walking staff (d6)"]],
  ["Poacher", ["Snares (3)", "Caltrops"]],
  ["Rat-catcher", ["A ferret in a cage", "Poisoned bait (3 uses)"]],
  ["Scribe", ["Ink, quill and parchment", "A blank journal"]],
  ["Smuggler", ["Forged papers", "A knife in the boot (d6)"]],
];
const WHY = ["Your home burned and no one will say who set the fire", "You owe money to the wrong family", "A dream keeps showing you the same hill", "Your mentor vanished in the woods", "You were exiled for something you didn't do", "You were exiled for something you did", "You want to see what lies past the river", "A debt of honor sends you after someone", "You found a map in a dead man's coat", "Your village sent you to find help"];
const WEAPONS = [["Dagger (d6)"], ["Dagger (d6)"], ["Cudgel (d6)"], ["Staff (d6)"], ["Hand axe (d6)"], ["Sword (d8)"], ["Sword (d8)"], ["Mace (d8)"], ["Spear (d8)"], ["Shortbow (d6)"], ["Sling (d4)"], ["Halberd (d10, bulky)", true], ["War hammer (d10, bulky)", true], ["Longbow (d8, bulky)", true], ["Crossbow (d8, bulky)", true]];
const GEAR = ["Rope, 50 ft", "Pulleys", "Candles (5)", "Chain, 10 ft", "Chalk", "Crowbar", "Tinderbox", "Grappling hook", "Hammer and spikes", "Waterskin", "Lantern", "Flask of oil (3 uses)", "Padlock and key", "Manacles", "Mirror", ["Pole, 10 ft (bulky)", true], "Sack", ["Tent (bulky)", true], "Fishing net", "Bear trap"];
const TOOLS = ["Saw", "Bucket", "Caltrops", "Chisel", "Drill", "Fishing rod", "Marbles", "Glue", "Pick", "Hourglass", "Tongs", "Lockpicks", "Metal file", "Nails", "Incense", "Sponge", "Magnifying lens", "Perfume", "Horn", "Bottle of strong spirits"];
const TRINKETS = ["a bone die", "a dried flower in a locket", "a tin whistle", "a map with a hole burned through it", "a letter you never sent", "a wooden toy horse", "a glass eye", "a coin from a land no one has heard of", "a lock of hair tied with red thread", "a tiny silver bell", "a carved bone flute", "a jar of salt", "a small portrait of a stranger", "a key to nothing you know", "a fox tooth on a string", "a broken compass that points home", "a deck of worn cards", "a blackened ring", "a lucky hare's foot", "a smooth river stone with a hole in it"];
const SPELLS = ["Sleep", "Light", "Charm", "Ward", "Fog", "Knock", "Arcane Eye", "Hover", "Web", "Shroud", "Speak with Dead", "Gust", "Mirror Self", "Telekinesis", "Command", "Sense Magic", "Frost Bite", "Mend", "Beast Tongue", "Grasping Roots"];
const TRAITS = {
  physique: ["athletic", "brawny", "gaunt", "hulking", "lanky", "scrawny", "short", "stout", "towering", "wiry", "broad", "delicate"],
  skin: ["freckled", "scarred", "weathered", "pale", "ruddy", "tattooed", "pockmarked", "sunburnt", "smooth", "ink-stained"],
  hair: ["braided", "cropped", "wild", "greasy", "shaved", "curly", "matted", "long", "thinning", "silver-streaked"],
  face: ["hawkish", "round", "hollow-cheeked", "broken-nosed", "soft", "sharp", "square", "crooked-toothed", "kindly", "heavy-browed"],
  speech: ["blunt", "mumbling", "gravelly", "quick", "booming", "whispery", "formal", "lilting", "stuttering", "dry"],
  clothing: ["patched", "tattered", "fine but worn", "stained", "practical", "oversized", "faded", "homespun", "mud-caked", "borrowed"],
  virtue: ["brave", "honest", "loyal", "generous", "patient", "curious", "merciful", "humble", "steadfast", "cheerful"],
  vice: ["greedy", "cowardly", "boastful", "lazy", "suspicious", "vain", "rash", "bitter", "stubborn", "gluttonous"],
};
const BONDS = ["Someone in the party saved your life once. You haven't repaid it", "You and another party member share a secret you swore to keep", "A sibling went into the woods a year ago and never came back", "You carry a letter for someone in the next village", "You owe a witch a favor, and she will ask for it", "Your old crew thinks you're dead. You'd like to keep it that way", "You promised a dying stranger you'd bury their ring at a cairn", "A noble family wants you back, dead or alive", "You were the only survivor of a caravan ambush", "You stole something from a temple and it still whispers to you"];

// lay items into slots in order; a bulky item fills its slot and the next. Leaves one slot free.
function pack(list, n = 10, keepFree = 1) {
  const out = Array(n).fill(null), left = []; let i = 0;
  for (const it of list) {
    const [t, b] = Array.isArray(it) ? it : [it, false], w = b ? 2 : 1;
    if (i + w > n - keepFree) { left.push(t); continue; }
    out[i] = b ? { t, b: true } : { t }; i += w;
  }
  return { slots: out, left };
}

// a new Cairn character: 3d6 STR, DEX and WIL in order, d6 HP, 3d6 gold, a background, traits and gear
export function character({ uid, color }) {
  const name = F.makeName("human", pick(["f", "m", "n"]));
  const [bg, bgItems] = pick(BACKGROUNDS);
  const STR = d3(), DEX = d3(), WIL = d3(), hp = d(6), gold = d3(), age = d(20) + d(20) + 10;
  const a = d(20), hs = d(20);
  const body = a <= 3 ? null : a <= 14 ? ["Brigandine (1 Armor, bulky)", 1] : a <= 19 ? ["Chainmail (2 Armor, bulky)", 2] : ["Plate (3 Armor, bulky)", 3];
  const extra = hs <= 13 ? [] : hs <= 16 ? ["Helmet (+1 Armor)"] : hs <= 19 ? ["Shield (+1 Armor)"] : ["Helmet (+1 Armor)", "Shield (+1 Armor)"];
  const armor = Math.min(3, (body?.[1] || 0) + extra.length);
  const spell = pick(SPELLS), items = bgItems.map(x => x === "@spellbook" ? `Spellbook: ${spell}` : x);
  const w = pick(WEAPONS), T = Object.fromEntries(Object.entries(TRAITS).map(([k, v]) => [k, pick(v)]));
  const list = [...(body ? [[body[0], true]] : []), [w[0], !!w[1]], ...extra, ...items, "Rations (3 uses)", "Torches (3)", pick(GEAR), pick(TOOLS), cap(pick(TRINKETS))];
  const { slots, left } = pack(list);
  return {
    id: uid(), player: "", character: name, role: bg, color, conds: [], slots,
    stats: { STR, DEX, WIL }, statMax: { STR, DEX, WIL },
    res: { HP: { cur: hp, max: hp }, Armor: { cur: armor, max: armor }, Gold: { cur: gold, max: "" } },
    text: {
      Background: `${bg}, age ${age}.\n${pick(WHY)}.`,
      "Traits & bonds": `${cap(T.physique)} physique, ${T.skin} skin, ${T.hair} hair, a ${T.face} face.\n${cap(T.speech)} speech, ${T.clothing} clothes.\n${cap(T.virtue)}, but ${T.vice}.\n\nBond: ${pick(BONDS)}.`,
      "Spellbooks & relics": items.some(x => x.startsWith("Spellbook")) ? `Spellbook: ${spell}. Hold it in both hands and read it aloud to cast; each casting adds a Fatigue.` : "",
      Scars: "",
      Notes: `Rolled STR ${STR}, DEX ${DEX}, WIL ${WIL}. You may swap any two attributes.${left.length ? `\nLeft behind (no room): ${left.join(", ")}.` : ""}`,
    },
  };
}

// ---- Forge ----
const T = {
  occupation: [...F.T.occupation.slice(0, 16), "charcoal burner", "gravedigger", "hedge-witch", "ferryman", "rat-catcher", "woodcutter", "shepherd", "toll-keeper", "wandering tinker", "barrow-robber"],
  monster: ["a wolf pack driven out of the deep woods", "barrow-dead stirring in their mound", "a bog hag and her crows", "a troll under the old bridge", "goblins in the root-caves", "a pale stag that leads travelers astray", "will-o'-wisps over the marsh", "a giant spider in a hollow oak", "bandits who were honest woodcutters last winter", "a wyrm sleeping on a hoard of tin"],
  foe: ["a bog hag with a long memory", "a barrow lord who wants his crown back", "a bandit chief with a noble's ring", "a cult that feeds a sleeping thing", "a fae lord bored with mortals", "a rival band of grave-robbers", "a reeve who sold the village", "a troll who collects toll in teeth"],
  rewardT: { easy: ["a few gold pieces", "a hot meal and a dry bed", "a jar of healing honey"], standard: ["a purse of gold", "a spellbook", "a relic with one charge"], hard: ["a chest of old coins", "a relic that recharges", "a deed to a mill"], deadly: ["a barrow lord's hoard", "a crown of the old kings", "a seat on the village council"] },
  rumor: [...F.T.rumor.slice(0, 4), "The cairn on the hill weeps water, even in a drought", "A pale stag has been seen at the edge of the village every dawn", "The charcoal burners have stopped coming to market", "Someone is buying old silver at twice its weight", "The river ran cold as winter last night"],
};
export const forge = { T };

// ---- random tables ----
export function tables(t) {
  const f = "Cairn";
  return [
    t("Background", `${f} · Characters`, BACKGROUNDS.map(b => b[0])),
    t("Starting weapon", `${f} · Characters`, WEAPONS.map(w => w[0])),
    t("Expeditionary gear", `${f} · Characters`, GEAR.map(g => Array.isArray(g) ? g[0] : g)),
    t("Tool", `${f} · Characters`, TOOLS),
    t("Trinket", `${f} · Characters`, TRINKETS.map(cap)),
    t("Bond", `${f} · Characters`, BONDS),
    t("Spellbook", `${f} · Magic`, SPELLS),
    t("Relic", `${f} · Magic`, ["Thornwood wand: 3 charges of Grasping Roots. Recharge: plant it in a grave overnight", "Saint's knucklebone: 1 charge, recover all HP. Recharge: a pilgrimage to a shrine", "Drowned bell: 2 charges, everyone who hears it makes a WIL save or flees. Recharge: ring it under water", "Owl-feather cloak: 3 charges of Shroud. Recharge: a night in an owl's tree", "Tin crown: 1 charge, command a dead thing for an hour. Recharge: wear it while you sleep in a barrow", "Glass apple: 1 charge, see through the eyes of whoever eats it. Recharge: leave it in an orchard at the full moon", "Wolf-tooth knife (d6): 2 charges, speak with a beast. Recharge: feed it to a hungry dog", "Lantern of the last watch: 3 charges, its light shows what is hidden. Recharge: fill it with oil from a holy lamp"]),
    t("Wilderness event", `${f} · Travel`, ["An encounter: roll on the woods table", "A sign of something nearby: tracks, spoor, a kill", "The weather turns: everyone without shelter makes a STR save or is deprived tonight", "Lost: the path forks where it shouldn't. A WIL save to find the way", "Fatigue: a hard climb or a river to ford. Each PC adds a Fatigue", "A free choice of discovery: a shrine, a hut, a cairn, a spring", "Quiet: the woods are still. Too still", "A traveler on the road, as lost as you are", "Something of yours goes missing in the night", "A lucky find: berries, a dry cave, a deer trail"]),
    t("Woods encounter", `${f} · Travel`, ["A wolf pack", "A wild boar, wounded and angry", "Bandits who'd rather talk than fight", "A pale stag watching from the trees", "Will-o'-wisps at dusk", "A giant spider's web across the path", "A hedge-witch picking mushrooms", "Goblins arguing over a dead deer", "A charcoal burner's camp, abandoned in a hurry", "A troll asleep under a fallen oak", "Grave-rats pouring out of a hollow log", "A knight without a horse, looking for a fight"]),
    t("Dungeon event", `${f} · Delving`, ["An encounter: something lives here", "A sign: bones, scratches, a fresh torch stub", "The light dims: each torch or lantern loses a use", "Fatigue: tight crawlways and cold stone. Each PC adds a Fatigue", "A shift: a door that was open is closed", "Quiet. Then a sound from further in", "Water rises or a draft blows out a candle", "A free discovery: a hidden niche, an old carving, a way down"]),
    t("Reaction (2d6)", `${f} · GM`, [[1, "2: Hostile, attacks or makes demands"], [2, "3: Wary, wants you gone"], [3, "4: Wary, wants you gone"], [4, "5: Wary, but might trade"], [5, "6: Curious, listens"], [6, "7: Curious, asks questions"], [5, "8: Curious, offers news"], [4, "9: Kind, offers help"], [3, "10: Kind, offers help"], [2, "11: Kind, shares food"], [1, "12: Helpful, joins you for a while"]]),
    t("Omen", `${f} · GM`, ["A crow lands on the shoulder of the next one to speak", "Milk sours in every jug in the village", "A child draws the same hill over and over", "The river runs backwards for a heartbeat", "Every candle in the room leans toward the door", "A stranger's grave appears in the churchyard overnight", "The dogs won't stop howling at the woods", "A white moth follows one of the PCs everywhere"]),
    t("Scar ideas", `${f} · GM`, ["A jagged scar across the face: strangers remember you", "A limp that aches before rain: you always know when weather is coming", "Two fingers lost: you hold a weapon differently now, and better", "Ringing in one ear: you hear things in the quiet that others can't", "A burned hand: fire doesn't frighten you any more", "A white streak in your hair from a fright: the dead hesitate before you", "A cracked rib that set badly: you breathe slow and steady under pressure", "A bite that never quite healed: beasts smell it on you"]),
  ];
}

// ---- ready-to-play adventure ----
export const adventure = { title: "The Weeping Cairn", blurb: "Four sessions in the woods. A charcoal burner robbed an old barrow, the river runs cold, the dead scratch at their coffins, and a bog hag has the crown the barrow lord wants back." };

export function campaign({ blank, uid, lib, sys, toCreature }) {
  const c = blank("The Weeping Cairn");
  c.tagline = "Cairn · new characters · a ready-to-play adventure";
  c.stash = { money: 15, unit: "gp", items: [], log: [] };
  const now = Date.now(), note = (title, cat, tags, body, extra = {}) => ({ id: uid(), title, cat, tags, body, updated: now, ...extra });
  const pc = (character, role, color, [STR, DEX, WIL], hp, armor, gold, items, text) => ({ id: uid(), player: "", character, role, color, stats: { STR, DEX, WIL }, statMax: { STR, DEX, WIL }, res: { HP: { cur: hp, max: hp }, Armor: { cur: armor, max: armor }, Gold: { cur: gold, max: "" } }, slots: pack(items, 10, 0).slots, conds: [], text });
  c.party = [
    pc("Wenna Thatch", "Gravedigger", "#9bb08a", [13, 9, 12], 4, 1, 8,
      [["Brigandine (1 Armor, bulky)", true], "Shovel (d6)", "Lantern", "Rations (3 uses)", "Flask of oil (2 uses)", "Torches (3)", "Rope, 50 ft", "A charm of grave-dirt in a pouch"],
      { Background: "Gravedigger, age 41.\nYou dug Brackenford's graves for twenty years. Last night you heard them scratching.", "Traits & bonds": "Stout physique, weathered skin, cropped hair, a heavy-browed face.\nBlunt speech, mud-caked clothes.\nSteadfast, but stubborn.\n\nBond: Pip is your sister's boy. You promised to bring him home.", "Spellbooks & relics": "", Scars: "", Notes: "Knows every family in Brackenford and where their dead lie." }),
    pc("Corvin Ashe", "Hedge-witch", "#a98fb6", [7, 11, 15], 3, 0, 6,
      ["Staff (d6)", "Spellbook: Sleep", "Bundle of dried herbs", "Rations (3 uses)", "Torches (3)", "Chalk", "A crow-feather fetish"],
      { Background: "Hedge-witch, age 27.\nMother Sloe taught you your first spell, then tried to keep you. You ran.", "Traits & bonds": "Lanky physique, ink-stained skin, wild hair, a sharp face.\nWhispery speech, patched clothes.\nCurious, but suspicious.\n\nBond: You owe Mother Sloe a favor, and she will ask for it.", "Spellbooks & relics": "Spellbook: Sleep. Hold it in both hands and read it aloud; creatures you can see fall into a light sleep. Each casting adds a Fatigue.", Scars: "", Notes: "Can read the old marks carved on cairns." }),
    pc("Ida Brack", "Sellsword", "#cf8577", [14, 12, 8], 5, 3, 4,
      [["Chainmail (2 Armor, bulky)", true], "Sword (d8)", "Shield (+1 Armor)", "Rations (3 uses)", "Torches (3)", "Whetstone", "An old regimental badge", "Crowbar"],
      { Background: "Sellsword, age 34.\nYour company broke at the Red Ford. You came home with the only armor you own.", "Traits & bonds": "Broad physique, scarred skin, braided hair, a square face.\nGravelly speech, practical clothes.\nLoyal, but rash.\n\nBond: Corvin pulled you out of the river at the Red Ford. You haven't repaid it.", "Spellbooks & relics": "", Scars: "A jagged scar across the jaw from the Red Ford.", Notes: "" }),
    pc("Pip Underhay", "Poacher", "#d4a54a", [9, 15, 11], 4, 1, 10,
      ["Shortbow (d6)", "Dagger (d6)", "Helmet (+1 Armor)", "Quiver of arrows", "Snares (3)", "Caltrops", "Rations (3 uses)", "Torches (3)", "A lucky hare's foot"],
      { Background: "Poacher, age 19.\nYou know the Grey Wold better than the lord's foresters do, and they know it.", "Traits & bonds": "Wiry physique, freckled skin, curly hair, a crooked-toothed face.\nQuick speech, borrowed clothes.\nCheerful, but boastful.\n\nBond: You saw the pale stag first, and it looked right at you.", "Spellbooks & relics": "", Scars: "", Notes: "Moves through the woods without a sound." }),
  ];
  const fromLib = n => { const r = lib?.creatures.find(x => x[0] === n); return r ? toCreature(sys, r) : null; };
  const wolf = fromLib("Wolf"), dead = fromLib("Barrow-dead"), rats = fromLib("Grave-rat swarm"), stag = fromLib("Pale Stag"), wisp = fromLib("Will-o'-wisp"), spider = fromLib("Giant Spider"), boar = fromLib("Wild Boar"), hag = fromLib("Bog Hag"), king = fromLib("Hollow King"), bandit = fromLib("Bandit");
  const sloe = hag && { ...hag, id: uid(), name: "Mother Sloe", kind: "Bog hag of the Grey Wold", notes: "Bog Hag stat block. She has the silver circlet and Lissa's breath in a stoppered bottle. She wants the circlet to command the dead of the barrow; she'll trade the bottle for a name, a memory or a year of someone's life." };
  const burner = bandit && { ...bandit, id: uid(), name: "Desperate charcoal burner", kind: "Aldo's crew", notes: "Bandit stat block. Aldo's friends. They've hidden in the woods since the cairn was opened and attack anyone who comes asking. Morale breaks easily: they want to go home." };
  c.bestiary = [wolf, boar, burner, wisp, stag, spider, rats, dead, sloe, king].filter(Boolean);
  for (const b of c.bestiary) b.tags = `${b.tags || "Cairn"}, weeping cairn`;

  const N = {
    town: note("Brackenford", "Locations", "village, start", "# Brackenford\nA village of sixty souls where the road crosses the river Brack, at the edge of the **Grey Wold**. One alehouse (the **Ferry Post**), a mill, a chapel and a churchyard.\n\n- [[Reeve Hobb Tanner]] runs things, badly\n- The river has run ice-cold for three days, in high summer\n- The dead in the churchyard scratch at their coffins after dark", { pinned: true }),
    wold: note("The Grey Wold", "Locations", "wilderness, act 2", "Old woods of oak and holly, too dark at noon. Charcoal burners work its edges; no one goes deep.\n\n- Wolves, boar and worse\n- Will-o'-wisps over the marsh at its heart\n- The [[Pale Stag]] guards the old paths and leads those who respect it\n\nTravel: one watch to the marsh, one more to [[Mother Sloe's Hut]]. Roll the **Wilderness event** table each watch."),
    hut: note("Mother Sloe's Hut", "Locations", "lair, act 3", "A hut on crooked stilts in the middle of a black bog, hung with bones and bottles. Crows watch from every post.\n\nInside: the silver circlet in a box of salt, Lissa's breath in a stoppered blue bottle, and a cauldron that is never empty."),
    cairn: note("The Weeping Cairn", "Locations", "dungeon, act 4", "A barrow of grey stones on **Tallow Hill**, above the village. Water seeps from between its stones even in a drought, which gives it its name.\n\nAldo dug through the side three nights ago. Inside: a passage, three side chambers of barrow-dead, a flooded crawlway full of grave-rats, and the burial chamber of the [[Hollow King]], whose empty brow wants its circlet back."),
    king: note("The Hollow King", "NPCs", "barrow lord", "A chieftain buried with his war band a thousand years ago. The silver circlet held him asleep, bound to guard the valley. Without it he wakes, and his dead wake with him.\n\n**Wants:** the circlet back on his brow, and the thief's life. **Can be bargained with:** return the circlet and he sleeps again; offer him a new guardian and he might let the thief live."),
    sloe: note("Mother Sloe", "NPCs", "villain", "A bog hag older than the village. Polite, hungry, patient. She tricked Aldo: the circlet in exchange for waking his daughter, a promise she never meant to keep.\n\n**Wants:** to wear the circlet herself and command the barrow's dead. **Fears:** running water and her own true name, which is carved inside the cairn."),
    aldo: note("Aldo Fennick", "NPCs", "the thief", "A charcoal burner, poor and proud. He dug into the cairn to pay his debts and took a silver circlet. The next morning his daughter **Lissa** would not wake. He traded the circlet to [[Mother Sloe]] for a cure that never came.\n\nHe'll confess if shown kindness, or if someone sits with Lissa."),
    hobb: note("Reeve Hobb Tanner", "NPCs", "patron", "The reeve of Brackenford. Fat, fearful, means well. **Offers:** 30 gp from the village chest and free board at the Ferry Post. **Wants:** the dead to stay in the ground before the harvest."),
    lissa: note("Lissa Fennick", "NPCs", "victim", "Aldo's daughter, ten years old. Asleep for three days, cold as river water, breathing frost. Her breath is in Mother Sloe's bottle; open it at her lips and she wakes."),
    q1: note("Lay the dead to rest", "Quests", "main", "The churchyard dead are rising because the Hollow King is awake. Return the circlet to the cairn, or find another way to put him back to sleep. Reward: 30 gp from the reeve."),
    q2: note("Wake Lissa", "Quests", "side", "Get Lissa's breath back from Mother Sloe and open the bottle at her lips."),
  };
  c.notes = [...Object.values(N), ...(lib?.spells || []).map(r => ({ id: uid(), title: r[0], cat: "Spells", tags: `Cairn, ${r[1]}`, body: r[2], updated: now, lib: sys.id }))];
  const b = c.boards[0], card = (type, x, y, w, color, title, text, extra = {}) => ({ id: uid(), type, x, y, w, color, rot: (Math.random() * 4 - 2).toFixed(2), title, text, z: 1, ...extra });
  const h1 = card("heading", 40, 30, 360, "paper", "Why won't the dead stay down?", "");
  const r1 = card("ref", 60, 150, 230, "lichen", "", "", { ref: N.cairn.id }), r2 = card("ref", 380, 150, 230, "rose", "", "", { ref: N.aldo.id }), r3 = card("ref", 700, 150, 230, "mustard", "", "", { ref: N.sloe.id });
  const n1 = card("note", 260, 410, 240, "paper", "", "Fresh digging on the side of Tallow Hill. Charcoal dust on the stones.");
  b.cards = [h1, r1, r2, r3, n1]; b.links = [{ id: uid(), a: r2.id, b: r3.id, color: "red" }, { id: uid(), a: n1.id, b: r1.id, color: "black" }]; b.view = { x: 40, y: 30, z: .9 };
  c.clocks = [
    { id: uid(), name: "The dead rise", segs: 6, filled: 1, color: "#a98fb6", note: "Ticks each night the circlet is away from the cairn. Full: the Hollow King's war band marches on Brackenford.", onStream: false },
    { id: uid(), name: "Lissa's breath", segs: 4, filled: 1, color: "#8daebe", note: "Ticks each dawn. Full: Lissa never wakes.", onStream: false },
  ];
  c.rep = [{ id: uid(), name: "Village of Brackenford", v: 1 }, { id: uid(), note: N.sloe.id, v: 0 }];
  c.calendar = { months: ["Deepwinter", "Thaw", "Sowing", "Blossom", "Highsun", "Haymaking", "Harvest", "Fallow", "Leaffall", "Frost", "Longnight", "Yule"].map(n => ({ name: n, days: 30 })), weekdays: ["Moonday", "Tiwsday", "Wodday", "Thunday", "Freyday", "Starday", "Sunday"], year: 612, month: 5, day: 18, era: "", events: [{ id: uid(), month: 6, day: 1, title: "Harvest begins" }] };
  c.handouts = [
    { id: uid(), title: "Notice at the Ferry Post", type: "text", style: "parchment", text: "WANTED: STOUT HEARTS\n\nThe dead of Brackenford will not lie still.\nThirty gold pieces from the village chest to whoever puts them back to rest.\n\nAsk for the reeve at the Ferry Post." },
    { id: uid(), title: "Aldo's confession", type: "text", style: "letter", text: "I only wanted the silver. I didn't know it was his crown.\nMy Lissa sleeps and breathes frost. The witch in the bog said she'd wake her if I gave it up, and I did, God forgive me, and still my girl sleeps.\nTell the reeve. I can't." },
  ];
  const t = s => ({ id: uid(), text: s, done: false });
  const P = (num, title, plan) => ({ id: uid(), num, title, status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + num, plan: { cast: [], encounters: [], handouts: [], ...plan } });
  c.sessions = [{
    id: uid(), num: 1, title: "Cold Water at Brackenford", date: "", ingame: "18 Highsun, 612", hours: 1, moods: ["Roleplay", "Mystery"], ambience: "River, wind in oak leaves", example: true,
    beats: [{ id: uid(), type: "social", text: "The party reaches Brackenford and finds the ford ice-cold in high summer. [[Reeve Hobb Tanner]] offers 30 gp.", star: false }, { id: uid(), type: "discovery", text: "Scratching from the graves in the churchyard after dark. [[Wenna Thatch]] knows whose graves they are.", star: true }, { id: uid(), type: "social", text: "[[Aldo Fennick]] won't open his door. Inside, his daughter breathes frost.", star: false }],
    quotes: [{ id: uid(), who: "Wenna Thatch", line: "I put them in the ground myself. They're not supposed to knock." }],
    cliff: "Howling from the woods: a wolf pack, driven out of the Grey Wold, runs through the village. Behind them, at the treeline, a pale stag watches.",
    recap: "The party came to Brackenford, where the river runs cold as winter and the dead scratch at their coffins. The reeve offered 30 gold to put them to rest. Aldo the charcoal burner hid behind his door with a sleeping daughter who breathed frost. Then wolves came out of the woods, and something pale watched from the trees.",
    attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [{ id: uid(), text: "Why won't the dead stay down?", done: false }, { id: uid(), text: "What is wrong with Lissa?", done: false }], scars: [], worked: "", change: "", rating: 0, prep: [], created: now,
  },
  P(2, "Into the Grey Wold", { start: "The wolves are gone, two sheep dead in the square. Aldo, white-faced, presses a letter into someone's hand and shuts the door.", scenes: [t("Aldo's confession: the cairn, the circlet, the witch"), t("Into the woods: roll the Wilderness event table each watch"), t("Aldo's crew, hiding in their charcoal camp and ready to fight"), t("The pale stag: follow it with respect and it shows the old path"), t("Will-o'-wisps over the marsh lead the careless into the bog")], secrets: [t("Mother Sloe has the circlet and Lissa's breath"), t("The circlet held the Hollow King asleep"), t("Mother Sloe's true name is carved inside the cairn")], cast: [N.aldo.id, N.hobb.id, N.wold.id], handouts: [], treasure: [t("Aldo's purse: 6 gp"), t("A charcoal burner's map of the woods' paths")] }),
  P(3, "Mother Sloe's Hut", { start: "The bog smells of rot and honey. On crooked stilts, a hut hung with bottles. A voice from inside: 'Come in, come in, my dears. Wipe your feet.'", scenes: [t("Bargain with Mother Sloe: a name, a memory or a year of life"), t("Steal the circlet or Lissa's bottle while she's distracted"), t("If it comes to blows: her crows, her claws, her spells"), t("The giant spider guards the back way out")], secrets: [t("She can't cross running water"), t("Speaking her true name forces her to answer one question truthfully"), t("The blue bottle holds Lissa's breath")], cast: [N.sloe.id, N.hut.id, N.lissa.id], handouts: [], treasure: [t("The silver circlet"), t("Lissa's breath in a blue bottle"), t("A relic from the hag's shelf: roll on the Relic table"), t("A spellbook: roll on the Spellbook table")] }),
  P(4, "The Weeping Cairn", { start: "Night on Tallow Hill. Water runs between the stones like tears. From inside the hole Aldo dug, the sound of something dragging a sword along the floor.", scenes: [t("The passage and the three chambers of barrow-dead"), t("The flooded crawlway: grave-rats in the dark"), t("Mother Sloe's true name carved above the burial chamber"), t("The Hollow King: return the circlet, fight, or bargain")], secrets: [t("Placing the circlet on his brow puts him to sleep at once"), t("He'll let Aldo live if someone swears to tend the cairn"), t("Whoever wears the circlet can command the barrow-dead, and is slowly claimed by them")], cast: [N.king.id, N.cairn.id], handouts: [], treasure: [t("The reeve's reward: 30 gp"), t("Grave goods: 40 gp of old silver (take it and the dead remember)"), t("The Hollow King's sword (d10, bulky): the dead won't strike first at its bearer")] }),
  ];
  c.sessions[1].recap = c.sessions[0].recap;
  const by = n => c.bestiary.find(x => x.name === n), E = (n, k) => { const x = by(n); return x && { id: uid(), creature: x.id, count: k, hp: Array(k).fill(Number(x.stats.HP) || 1) }; };
  c.sessions[1].plan.encounters = [E("Wolf", 3), E("Desperate charcoal burner", 3), E("Will-o'-wisp", 2)].filter(Boolean);
  c.sessions[2].plan.encounters = [E("Mother Sloe", 1), E("Giant Spider", 1)].filter(Boolean);
  c.sessions[3].plan.encounters = [E("Barrow-dead", 4), E("Grave-rat swarm", 1), E("Hollow King", 1)].filter(Boolean);
  return c;
}

