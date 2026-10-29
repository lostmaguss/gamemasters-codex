// Daggerheart kit: Forge tables, random tables and a ready-to-play adventure for level 1 (tier 1).
// Adversaries, ancestries, communities, classes and domain cards come from the Daggerheart SRD
// (© Critical Role, LLC, used under the Darrington Press Community Gaming License). The adventure and
// every table are original writing.
import { pick, cap } from "./util.js";
import * as F from "./genre-fantasy.js";

// ancestries that aren't in the fantasy pack share one name style, with a family name from the valley
const WILD = { pre: ["Ash", "Bri", "Cael", "Dov", "Ember", "Fen", "Grell", "Hask", "Iri", "Jun", "Kesh", "Loam", "Mire", "Nell", "Oro", "Pell", "Quill", "Rook", "Sedge", "Tam", "Vael", "Wick", "Yarrow", "Zeph"], f: ["a", "ine", "ra", "wyn", "elle", "is"], m: ["an", "o", "ric", "en", "us", "ark"], n: ["el", "y", "ie", "et"] };
const W = label => ({ label, wild: true });
const NAMES = { human: F.NAMES.human, elf: F.NAMES.elf, dwarf: F.NAMES.dwarf, halfling: F.NAMES.halfling, orc: F.NAMES.orc, infernal: { ...F.NAMES.infernal, label: "Infernis" },
  katari: W("Katari"), ribbet: W("Ribbet"), faun: W("Faun"), galapa: W("Galapa"), firbolg: W("Firbolg"), clank: W("Clank"), drakona: W("Drakona"), fungril: W("Fungril"), simiah: W("Simiah"), faerie: W("Faerie"), giant: W("Giant"), goblin: W("Goblin") };
function makeName(anc, g) {
  if (!NAMES[anc]?.wild) return F.makeName(anc, g);
  g = g || pick(["f", "m", "n"]);
  const h = F.NAMES.human;
  return `${cap((pick(WILD.pre) + pick(WILD[g])).toLowerCase())} ${cap((pick(h.s1) + pick(h.s2)).toLowerCase())}`;
}

const T = {
  occupation: [...F.T.occupation.slice(0, 20), "orchard keeper", "beekeeper", "lamplighter", "river pilot", "hedge witch", "wandering bard", "retired guardian", "tinker", "mushroom forager"],
  monster: ["Jagged Knife bandits", "a dire wolf pack", "a cave ogre", "a bear driven mad by hunger", "shambling zombies", "giant rats in the granary", "skeleton warriors from an old battlefield", "a minor demon slipped its binding", "a young ice dragon", "cultists of the Hollow Fang"],
  foe: ["the Jagged Knife bandits", "a cult of the Hollow Fang", "a corrupt magistrate", "a minor demon and its servants", "a bear-lord of the deep woods", "grave robbers", "a rival party of treasure hunters", "a jealous hedge witch"],
  rewardT: { easy: ["a handful of gold", "a hot meal and a warm bed", "a minor health potion"], standard: ["a bag of gold", "a family heirloom weapon", "a blessing from the village shrine"], hard: ["two bags of gold", "a magic trinket", "a deed to an orchard"], deadly: ["a chest of gold", "a legendary weapon", "a seat on the town council"] },
  rumor: [...F.T.rumor.slice(0, 5), "The old orchard's great tree is weeping black sap", "The Jagged Knife gang has a new paymaster, and new knives", "Someone saw a light in the root cellar under the cider house", "Apples from the east field taste of ash"],
};
const EXTRA = {
  coin: n => { const h = Math.max(1, Math.round(n / 10)); return h < 10 ? `${h} handful${h > 1 ? "s" : ""} of gold` : h < 100 ? `${Math.round(h / 10)} bag${h >= 15 ? "s" : ""} of gold` : `${Math.round(h / 100)} chest of gold`; },
  valuables: ["a silver hair comb", "a jar of honey that never runs out", "a carved wooden songbird", "a ring with a tiny map inside", "a pouch of river pearls", "a bard's lucky pick", "a glass apple, warm to the touch", "a cloak pin shaped like a fox"],
  hide: ["in the hollow of a tree", "under the cider press", "inside a beehive (careful)", "in the rafters of the barn", "at the bottom of the mill pond", "in a fox's den", "behind the shrine's altar stone", "wrapped in a scarecrow's coat"],
  activity: ["stealing a cart of apples", "setting an ambush", "arguing about the split", "guarding a prisoner", "chanting around a fire", "digging in the orchard", "fleeing from something", "hunting the party"],
  terrain: ["an orchard at dusk, mist between the trees", "a mill with its wheel turning", "a sunken road between hedges", "a root cellar with low beams", "a riverbank in reeds", "a ruined watchtower", "a forest clearing with a stone circle", "a cider house during a festival"],
  fallback: ["Jagged Knife bandits", "dire wolves", "giant rats", "skeleton warriors", "shambling zombies", "a cave ogre", "a bear", "cultists"],
};
export const forge = { NAMES, makeName, T, EXTRA, LABELS: { ancestry: "Ancestry", foes: "Danger", origin: "Ancestry" }, DIFF: { easy: "Easy", standard: "Standard", hard: "Hard", deadly: "Deadly" } };

export function tables(t) {
  const f = "Daggerheart";
  return [
    t("Fear move ideas", `${f} · GM`, ["Spend a Fear: an adversary acts out of turn and goes for the weakest", "Spend a Fear: the ground gives way, everyone in Close range makes an Agility roll", "Spend a Fear: reinforcements arrive at Far range", "Spend a Fear: a light goes out, and the next roll is with disadvantage", "Spend a Fear: reveal that the ally was lying", "Spend a Fear: the countdown ticks twice", "Spend a Fear: something they care about is threatened", "Spend a Fear: the adversary's true form shows itself"]),
    t("Hope moment", `${f} · Play`, ["A friend shouts your name and you remember why you came", "A song from home drifts across the battlefield", "You catch the light of dawn on your blade", "A stranger thanks you for something you did long ago", "Your companion laughs at exactly the wrong moment", "You find a token you thought you'd lost"]),
    t("Tier 1 loot", `${f} · Loot`, ["A handful of gold and a lucky button", "A minor health potion", "A minor stamina potion", "A whistle that calls a small bird", "A map with one road marked in red", "A bag of gold sewn into a coat", "A lantern that burns without oil for one night", "A dagger with a name engraved on the blade", "A charm that hums when someone lies", "Two handfuls of gold and a love letter"]),
    t("Environment feature", `${f} · Scenes`, ["Mist: everything beyond Close range is obscured", "A rickety bridge that someone has to hold steady", "A crowd that panics and surges", "A fire spreading through dry grass", "Falling apples, rotten and slick underfoot", "A bell that, if rung, calls the whole village", "Deep mud: moving from Close to Far takes your whole action", "A tree that whispers the name of whoever touches it"]),
    t("Adversary twist", `${f} · Scenes`, ["They're fighting under orders they hate", "One of them knows a hero's family", "They're protecting something small and helpless", "They surrender the moment the leader falls", "They were paid in gold that's cursed", "They've been told the heroes are the villains"]),
    t("Countdown idea", `${f} · GM`, ["The bridge collapses in 4", "The ritual completes in 6", "The bandits escape with the cart in 3", "The fire reaches the granary in 5", "Reinforcements arrive in 4", "The demon's binding fails in 6"]),
    t("Campfire question", `${f} · Play`, ["What did you leave behind to come here?", "Who in the party would you trust with your life, and why?", "What's the last thing that made you laugh?", "What do you fear will happen if you fail?", "What song does your family sing at harvest?", "What would you do with a chest of gold?"]),
    t("Village trouble", `${f} · Plot`, ["The cider press broke right before the festival", "A child has gone missing in the orchard", "The beehives are empty, every one", "Two families argue over a boundary stone", "A traveling merchant sells fake cures", "The shrine's flame went out on its own"]),
  ];
}

export const adventure = { title: "The Hungry Root", blurb: "Level 1, four sessions. Bandits raid an orchard village, the great tree weeps black sap, and something bound beneath its roots is waking." };

export function campaign({ blank, uid, lib, sys, toCreature }) {
  const c = blank("The Hungry Root");
  c.tagline = "Daggerheart · level 1 · a ready-to-play adventure";
  c.stash = { money: 2, unit: "handfuls of gold", items: [], log: [] };
  const now = Date.now(), note = (title, cat, tags, body, extra = {}) => ({ id: uid(), title, cat, tags, body, updated: now, ...extra });
  const S = a => Object.fromEntries(["Agility", "Strength", "Finesse", "Instinct", "Presence", "Knowledge", "Evasion"].map((k, i) => [k, a[i]]));
  const pc = (character, role, color, stats, hp, armor, text, stress = 6) => ({ id: uid(), player: "", character, role, color, stats, res: { HP: { cur: hp, max: hp }, Stress: { cur: 0, max: stress }, Hope: { cur: 2, max: 6 }, Armor: { cur: armor, max: armor } }, conds: [], text });
  c.party = [
    pc("Bramble Stonehide", "Galapa guardian (Ridgeborne)", "#9bb08a", S(["0", "+2", "-1", "+1", "+1", "0", "9"]), 7, 4,
      { Experiences: "Held the pass alone +2\nKnows every mountain road +2", "Domain cards": "Valor & Blade\nI Am Your Shield (Valor)\nNot Good Enough (Blade)", Inventory: "Battleaxe (Strength, Melee)\nChainmail (Armor 4, thresholds 9/17 with Shell)\nTorch, rope, a minor health potion, a handful of gold", Notes: "Galapa: Shell adds Proficiency to damage thresholds; Retract to take less damage\nRidgeborne: Steady (advantage on rolls to climb and keep footing)" }),
    pc("Sable Quickpaw", "Katari rogue (Slyborne)", "#cf8577", S(["+1", "-1", "+2", "+1", "0", "0", "12"]), 6, 3,
      { Experiences: "Grew up picking pockets in the market +2\nNever forgets a face +2", "Domain cards": "Midnight & Grace\nPick and Pull (Midnight)\nDeft Deceiver (Grace)", Inventory: "Dagger (Finesse, Melee), small dagger (off-hand)\nLeather armor (Armor 3, thresholds 7/14)\nLockpicks, a minor health potion, a handful of gold", Notes: "Katari: Feline Instincts (reroll an Agility roll by spending Hope), retracting claws\nSlyborne: Scoundrel (advantage when negotiating with criminals)\nRogue: Sneak Attack when an ally is in Melee with the target or you're hidden" }),
    pc("Wren Ashby", "Human bard (Wanderborne)", "#d4a54a", S(["0", "-1", "+1", "0", "+2", "+1", "10"]), 5, 3,
      { Experiences: "Sang for a duke once +2\nKnows a song for every occasion +2", "Domain cards": "Grace & Codex\nInspirational Words (Grace)\nBook of Ava (Codex)", Inventory: "Rapier (Presence, Melee)\nGambeson (Armor 3, thresholds 6/12)\nA lute, a minor health potion, a handful of gold", Notes: "Human: High Stamina (+1 Stress slot), Adaptability\nWanderborne: Nomadic Pack (pull out a useful mundane item once a session)\nBard: Rally (give the party Rally Dice)" }, 7),
    pc("Old Moss", "Firbolg druid (Wildborne)", "#8daebe", S(["0", "+1", "-1", "+2", "0", "+1", "10"]), 6, 3,
      { Experiences: "Raised by the forest's bears +2\nCan find water anywhere +2", "Domain cards": "Sage & Arcana\nVicious Entangle (Sage)\nRune Ward (Arcana)", Inventory: "Shortstaff (Instinct, Close, magic)\nLeather armor (Armor 3, thresholds 7/14)\nHerbs, a minor health potion, a handful of gold", Notes: "Firbolg: Charge, Unshakable\nWildborne: Lightfoot (move without a sound in the wild)\nDruid: Beastform, Wildtouch" }),
  ];
  const fromLib = n => { const r = lib?.creatures.find(x => x[0] === n); return r ? toCreature(sys, r) : null; };
  const lack = fromLib("Jagged Knife Lackey"), band = fromLib("Jagged Knife Bandit"), rat = fromLib("Giant Rat"), wolf = fromLib("Dire Wolf"), zom = fromLib("Shambling Zombie"), fang = fromLib("Cult Fang"), demon = fromLib("Minor Demon"), skel = fromLib("Skeleton Warrior");
  const boss = band && { ...band, id: uid(), name: "Tallow Grim", kind: "Jagged Knife leader", notes: "Bandit stat block. Hired by the Hollow Fang to scare the village off the orchard. Owes the cult money and fears it more than the heroes." };
  const priest = fang && { ...fang, id: uid(), name: "Brother Hask", kind: "Hollow Fang priest", notes: "Cult Fang stat block. The village's beekeeper, in daylight. He's feeding the bound demon to make it grant his wish: his drowned daughter back." };
  c.bestiary = [lack, band, boss, rat, wolf, zom, fang, priest, skel, demon].filter(Boolean);
  for (const b of c.bestiary) b.tags = `${b.tags || "Daggerheart"}, hollowmere`;

  const N = {
    town: note("Hollowmere", "Locations", "village, start", "# Hollowmere\nAn orchard village in a green valley, famous for cider. Two hundred souls, one inn (the **Bent Bough**), a mill, and the **Great Tree**, older than anyone remembers, at the heart of the orchard.\n\n- [[Elder Rowan Thistle]] leads the village council\n- The harvest festival is in three days\n- Bandits have raided the outer farms twice this month", { pinned: true }),
    tree: note("The Great Tree", "Locations", "landmark, act 3", "An ancient apple tree, wide as a house. Its sap has turned black and its apples taste of ash.\n\nBeneath its roots, sealed by the first settlers, sleeps a [[Minor Demon]] bound in a cage of living wood. The tree keeps it asleep, and the tree is dying."),
    cellar: note("The Cider-House Cellar", "Locations", "dungeon, act 2", "Under the old cider house, a cellar opens into the root tunnels of the Great Tree. Giant rats, shambling zombies (the cult's mistakes), and the Hollow Fang's shrine."),
    rowan: note("Elder Rowan Thistle", "NPCs", "patron", "Village elder, seventy, kind, stubborn. **Offers:** a bag of gold and the festival's first cup of cider. **Wants:** the bandits gone before the festival."),
    hask: note("Brother Hask", "NPCs", "villain", "The beekeeper. Gentle, grieving, desperate. His daughter drowned in the mill pond last spring. The demon under the tree has promised to bring her back.\n\n**Can be talked down:** if someone reaches his grief (Presence, with Hope)."),
    tallow: note("Tallow Grim", "NPCs", "bandit leader", "Leader of the Jagged Knife bandits. Loud, nervous, in debt to the cult. **Will deal:** for safe passage out of the valley and a handful of gold."),
    fang: note("The Hollow Fang", "Factions", "cult", "Six villagers who meet in the cider-house cellar. They feed the bound demon to weaken the tree, so it can be freed and grant their wishes. They've hired the Jagged Knife bandits to keep people away from the orchard."),
    knife: note("The Jagged Knife", "Factions", "bandits", "A dozen bandits from the hills. Rough, cheap, not cruel when they can help it. Most would rather be paid than fight."),
    q1: note("Stop the bandit raids", "Quests", "act 1", "Before the harvest festival in three days. Reward: a bag of gold."),
    q2: note("Heal the Great Tree", "Quests", "act 3", "The tree's black sap means it's dying. If it dies, whatever it holds goes free."),
  };
  c.notes = [...Object.values(N), ...(lib?.spells || []).map(r => ({ id: uid(), title: r[0], cat: "Spells", tags: `Daggerheart, ${r[1]}`, body: r[2], updated: now, lib: sys.id }))];
  const b = c.boards[0], card = (type, x, y, w, color, title, text, extra = {}) => ({ id: uid(), type, x, y, w, color, rot: (Math.random() * 4 - 2).toFixed(2), title, text, z: 1, ...extra });
  const h1 = card("heading", 40, 30, 360, "paper", "Why is the Great Tree dying?", "");
  const r1 = card("ref", 60, 150, 230, "lichen", "", "", { ref: N.tree.id }), r2 = card("ref", 380, 150, 230, "rose", "", "", { ref: N.fang.id }), r3 = card("ref", 700, 150, 230, "mustard", "", "", { ref: N.knife.id });
  const n1 = card("note", 260, 410, 240, "paper", "", "Bees from Hask's hives, dead, around the tree's roots.");
  b.cards = [h1, r1, r2, r3, n1]; b.links = [{ id: uid(), a: r2.id, b: r3.id, color: "red" }, { id: uid(), a: n1.id, b: r1.id, color: "black" }]; b.view = { x: 40, y: 30, z: .9 };
  c.clocks = [
    { id: uid(), name: "Fear", segs: 12, filled: 2, color: "#a98fb6", note: "The GM's Fear. Gain it when players roll with Fear; spend it to make moves.", onStream: false },
    { id: uid(), name: "The binding fails", segs: 6, filled: 2, color: "#cf8577", note: "Countdown. Ticks each night the cult feeds the demon. Full: the demon is free.", onStream: false },
  ];
  c.rep = [{ id: uid(), note: N.knife.id, v: -1 }, { id: uid(), name: "Village of Hollowmere", v: 1 }];
  c.calendar = { months: ["Snowmoon", "Thawmoon", "Seedmoon", "Blossommoon", "Greenmoon", "Sunmoon", "Honeymoon", "Grainmoon", "Applemoon", "Leafmoon", "Frostmoon", "Starmoon"].map(n => ({ name: n, days: 28 })), weekdays: ["Rootday", "Leafday", "Rainday", "Sunday", "Moonday", "Starday", "Restday"], year: 304, month: 8, day: 12, era: "", events: [{ id: uid(), month: 8, day: 15, title: "Hollowmere harvest festival" }] };
  c.handouts = [
    { id: uid(), title: "Notice at the Bent Bough", type: "text", style: "parchment", text: "HELP WANTED\n\nBandits raid our farms. The festival is in three days.\nA bag of gold to whoever drives them off, and the first cup of cider.\n\nRowan Thistle, for the council of Hollowmere" },
    { id: uid(), title: "Page from Hask's diary", type: "text", style: "letter", text: "It spoke again tonight, from under the roots. It says it remembers her laugh. It says it can give it back.\nThe tree is in the way. The tree has always been in the way." },
  ];
  const t = s => ({ id: uid(), text: s, done: false });
  const P = (num, title, plan) => ({ id: uid(), num, title, status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + num, plan: { cast: [], encounters: [], handouts: [], ...plan } });
  c.sessions = [{
    id: uid(), num: 1, title: "Welcome to Hollowmere", date: "", ingame: "12 Applemoon, 304", hours: 1, moods: ["Roleplay"], ambience: "Bees, wind in the orchard", example: true,
    beats: [{ id: uid(), type: "social", text: "The heroes arrive for the harvest festival and meet [[Elder Rowan Thistle]].", star: false }, { id: uid(), type: "discovery", text: "Black sap weeps from [[The Great Tree]]. The apples taste of ash.", star: true }, { id: uid(), type: "social", text: "Campfire questions at the Bent Bough: each hero says what they left behind.", star: false }],
    quotes: [{ id: uid(), who: "Old Moss", line: "The tree is not sick. The tree is afraid." }],
    cliff: "Shouts from the east farm: torches, bandits, and the sound of a cart being dragged away.",
    recap: "The heroes came to Hollowmere for the harvest festival. The Great Tree at the heart of the orchard is weeping black sap, and its apples taste of ash. Then, as night fell, torches appeared at the east farm: the bandits were back.",
    attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "Session zero: characters, connections and campfire questions", threads: [{ id: uid(), text: "Why is the Great Tree dying?", done: false }], scars: [], worked: "", change: "", rating: 0, prep: [], created: now,
  },
  P(2, "Knives in the Orchard", { start: "The east farm's barn is burning. Bandits are dragging away a cart of apples, laughing, and one of them has a child by the collar.", scenes: [t("Fight the raiders at the east farm"), t("Chase them through the misty orchard"), t("Tallow Grim's camp in the hills: fight, or deal"), t("Learn who's paying the bandits")], secrets: [t("The bandits are paid by the Hollow Fang to keep people out of the orchard"), t("Tallow owes the cult money and is afraid of it"), t("The cult meets in the cider-house cellar")], cast: [N.rowan.id, N.tallow.id, N.knife.id], treasure: [t("Bandit purses: two handfuls of gold"), t("A minor health potion each from the grateful farmers")] }),
  P(3, "The Cider-House Cellar", { start: "The cider house is dark. Behind the barrels, a trapdoor. Below, the smell of earth, rot, and honey.", scenes: [t("Giant rats in the root tunnels"), t("Shambling zombies: the cult's failed attempts"), t("The Hollow Fang's shrine and Hask's diary"), t("The cultists catch them, or they catch the cultists")], secrets: [t("Brother Hask is the beekeeper"), t("He wants his drowned daughter back"), t("The demon is lying to him")], cast: [N.cellar.id, N.fang.id], treasure: [t("The shrine's offering bowl: a bag of gold"), t("A charm that hums when someone lies")] }),
  P(4, "Heart of the Old Tree", { start: "Midnight on festival eve. Lanterns glow in the orchard. Under the Great Tree, the Hollow Fang is chanting, and the roots are moving.", scenes: [t("The cult's ritual at the Great Tree"), t("Reach Brother Hask, or stop him"), t("The Minor Demon breaks loose"), t("Heal the tree: an Instinct or Knowledge roll with Hope, and something precious given")], secrets: [t("The tree can be healed if someone shares a true memory of loss with it"), t("If Hask is talked down, he helps rebind the demon")], cast: [N.hask.id, N.tree.id], treasure: [t("The festival's reward: a bag of gold and the first cup of cider"), t("A seed from the Great Tree: plant it, and something will grow")] }),
  ];
  c.sessions[1].recap = c.sessions[0].recap;
  const by = n => c.bestiary.find(x => x.name === n), E = (n, k) => { const x = by(n); return x && { id: uid(), creature: x.id, count: k, hp: Array(k).fill(Number(x.stats.HP) || 1) }; };
  c.sessions[1].plan.encounters = [E("Jagged Knife Lackey", 4), E("Jagged Knife Bandit", 2), E("Tallow Grim", 1)].filter(Boolean);
  c.sessions[2].plan.encounters = [E("Giant Rat", 4), E("Shambling Zombie", 2), E("Cult Fang", 2)].filter(Boolean);
  c.sessions[3].plan.encounters = [E("Brother Hask", 1), E("Cult Fang", 2), E("Minor Demon", 1)].filter(Boolean);
  return c;
}
