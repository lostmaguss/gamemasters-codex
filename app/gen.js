// Generators for NPCs, places, missions and items. The tables come from the campaign's genre pack.
import { pick, wpick, cap, rnd } from "./util.js";
import * as fantasy from "./genre-fantasy.js";
import * as cyberpunk from "./genre-cyberpunk.js";
import * as scifi from "./genre-scifi.js";

export const GENRES = { fantasy: { label: "Fantasy", ...fantasy }, scifi: { label: "Sci-fi", ...scifi }, cyberpunk: { label: "Cyberpunk", ...cyberpunk } };
let P = GENRES.fantasy;
export function setGenre(g) { P = GENRES[g] || GENRES.fantasy; }
export const genre = () => P;
// compatibility exports used by the quick-name box
export const NAMES = new Proxy({}, { get: (_, k) => P.NAMES[k], ownKeys: () => Reflect.ownKeys(P.NAMES), getOwnPropertyDescriptor: (_, k) => ({ enumerable: true, configurable: true, value: P.NAMES[k] }) });
export const makeName = (a, g) => P.makeName(a, g);

const T = () => P.T;
export const GEN = {
  npc: {
    label: "NPC", noteCat: "NPCs",
    get opts() { return { ancestry: { label: P.LABELS.ancestry, choices: { any: "Any", ...Object.fromEntries(Object.entries(P.NAMES).map(([k, v]) => [k, v.label])) } }, gender: { label: "Name style", choices: { any: "Any", ...P.GENDERS } } }; },
    init(o) { return { genre: P.label, anc: o.ancestry === "any" || !P.NAMES[o.ancestry] ? pick(Object.keys(P.NAMES)) : o.ancestry, g: o.gender === "any" ? pick(["f", "m", "n"]) : o.gender }; },
    title: c => P.makeName(c.anc, c.g),
    sub: (c, f) => `${P.NAMES[c.anc]?.label || ""} · ${cap(f.age)} ${f.occupation}`,
    fields: {
      occupation: ["Occupation", () => pick(T().occupation)], age: ["Age", () => pick(T().age)], look: ["Look", () => cap(pick(T().look))],
      manner: ["Manner", () => cap(pick(T().manner))], voice: ["Voice", () => cap(pick(T().voice))], quirk: ["Quirk", () => cap(pick(T().quirk))],
      want: ["Wants", () => cap(pick(T().want))], secret: ["Secret", () => cap(pick(T().secret))],
    },
    hidden: ["occupation", "age"],
  },
  place: {
    label: "Place", noteCat: "Locations",
    get opts() { return { type: { label: "Type", choices: { any: "Any", ...P.PLACE_TYPES } } }; },
    init(o) {
      const type = o.type === "any" || !P.PLACE_TYPES[o.type] ? pick(Object.keys(P.PLACE_TYPES)) : o.type;
      return { genre: P.label, type, extra: type === "settlement" ? pick(T().setSize) : type === "shop" ? pick(T().shopKind) : "" };
    },
    title: c => P.placeName(c.type),
    sub: c => (P.PLACE_TYPES[c.type] || c.type) + (c.extra ? " · " + cap(c.extra) : ""),
    fields: {
      impression: ["First look", () => pick(T().impression)], feature: ["Notable", c => cap(pick(T().feat[c.type] || T().impression))],
      sense: ["Sounds & smells", () => cap(pick(T().sense))], present: ["Who's here", () => cap(pick(T().present))],
      rumor: ["Rumor", () => pick(T().rumor)], hidden: ["Secret", () => cap(pick(T().hidden))], hook: ["Hook", () => pick(T().hook)],
    },
  },
  mission: {
    label: "Mission", noteCat: "Quests",
    get opts() { return { diff: { label: P.LABELS.foes, choices: { any: "Any", ...P.DIFF } } }; },
    init(o) { return { genre: P.label, diff: o.diff === "any" ? pick(["easy", "standard", "standard", "hard", "deadly"]) : o.diff }; },
    title: () => `The ${pick(T().misA)} ${pick(T().misN)}`,
    sub: c => P.DIFF[c.diff] + " job",
    fields: {
      patron: ["Patron", () => `${P.makeName(pick(Object.keys(P.NAMES)))}, ${pick(T().patronRole)}`],
      objective: ["The job", () => pick(T().objective)({ ...T(), place: P.missionPlace() })],
      deadline: ["Deadline", () => cap(pick(T().deadline))], complication: ["Complication", () => pick(T().complication)],
      twist: ["Twist", () => pick(T().twist)], reward: ["Reward", c => cap(pick(T().rewardT[c.diff]))],
    },
  },
  item: {
    label: "Item", noteCat: "Items",
    get opts() { return { type: { label: "Type", choices: { any: "Any", ...P.ITEM.types } } }; },
    init(o) { const type = o.type === "any" || !P.ITEM.types[o.type] ? pick(P.ITEM.pool) : o.type; return { genre: P.label, ...P.ITEM.init(type) }; },
    title: c => P.ITEM.title(c),
    sub: (c, f) => P.ITEM.sub(c, f),
    fields: {
      rarity: ["Rarity", () => wpick(P.ITEM.rarity)], look: ["Look", () => cap(pick(P.ITEM.look))],
      power: ["Power", c => P.ITEM.power(c)], quirk: ["Quirk", () => cap(pick(P.ITEM.quirk))],
      history: ["History", () => cap(pick(P.ITEM.history))], value: ["Worth", (c, f) => cap(P.ITEM.value[f.rarity] || Object.values(P.ITEM.value)[0])],
    },
    hidden: ["rarity"],
  },
};

// ---- loot and encounters (work in every genre) ----
import { C as __C } from "./store.js";
const EXTRA = {
  fantasy: { coin: n => `${n} gold`, valuables: ["a silver chalice", "three uncut rubies", "a jade figurine of a fox", "a gold-threaded tapestry", "a pouch of pearls", "an ivory chess set", "a noble's signet ring", "a jeweled dagger sheath", "a crown of beaten bronze", "a bag of moonstones"], hide: ["under a loose flagstone", "sewn into a coat lining", "in a false-bottomed chest", "inside a hollow statue", "in a dead man's boot", "at the bottom of a well", "behind a painting", "in a locked iron box, key missing"],
    activity: ["arguing over loot", "setting an ambush", "burying something", "guarding a prisoner", "fleeing from something worse", "performing a ritual", "making camp", "hunting the party"], terrain: ["a narrow bridge over a gorge", "a burned-out farmstead", "a flooded crypt", "thick fog in the marshes", "a crumbling watchtower", "a moonlit graveyard", "a crowded market", "a forest clearing with standing stones"],
    fallback: ["bandits", "wolves", "goblin raiders", "skeletons", "cultists", "a troll", "giant spiders", "a wyvern"] },
  cyberpunk: { coin: n => `${n * 50} eddies`, valuables: ["a cred chip with no owner", "military-grade optics", "a crate of designer stims", "a rare vinyl record", "black-market cyberware", "a corp exec's watch", "a data shard worth killing for", "untraceable weapons"], hide: ["in a vending machine", "inside a dead drone", "in a cloud locker, password unknown", "taped under a car", "in a fridge full of synth-meat", "in a server rack", "behind a neon sign", "inside someone's arm"],
    activity: ["shaking down a vendor", "running a deal", "torturing an informant", "patrolling for the corp", "racing bikes", "jacked in, guards watching", "loading a truck", "hunting the crew"], terrain: ["a rain-slick rooftop", "a crowded night market", "an abandoned metro tunnel", "a corp lobby", "a club with strobe lights", "a parking garage", "a shipping yard", "a neon-lit alley"],
    fallback: ["gangers", "corp security", "a cyberpsycho", "a combat drone", "cops on the take", "a rival crew", "netrunners", "a kill team"] },
  scifi: { coin: n => `${n * 100} credits`, valuables: ["a crate of medgel", "starship parts", "a working AI core", "a vial of rare isotopes", "alien crystals", "navigation data", "a captain's log", "terraforming seeds"], hide: ["in a cryo pod", "behind a maintenance panel", "in the ship's ballast", "inside a sealed airlock", "in a drone's cargo bay", "under the reactor shielding", "in a dead suit's pocket", "on a derelict's bridge"],
    activity: ["salvaging a wreck", "boarding a ship", "repairing a breach", "guarding a dig site", "holding hostages", "fleeing a quarantine", "scanning for the crew", "hunting in the vents"], terrain: ["a zero-g cargo bay", "a derelict corridor with failing lights", "an asteroid surface", "a station promenade", "a jungle under twin suns", "a reactor room", "a crashed shuttle", "a frozen research outpost"],
    fallback: ["pirates", "security drones", "xenomorphs", "Union marines", "a rogue AI", "void cultists", "salvagers", "a bounty hunter"] },
};
const X = () => EXTRA[Object.keys(GENRES).find(k => GENRES[k] === P)] || EXTRA.fantasy;
const MULT = { easy: 1, standard: 3, hard: 10, deadly: 40 };
function bestiaryPick(diff) {
  const c = __C(); const want = { easy: [1, 2], standard: [2, 3], hard: [3, 4], deadly: [4, 5] }[diff];
  const fit = (c?.bestiary || []).filter(x => (x.threat || 1) >= want[0] && (x.threat || 1) <= want[1]);
  const all = fit.length ? fit : c?.bestiary || [];
  return all.length ? pick(all) : null;
}
GEN.loot = {
  label: "Loot", noteCat: "Items",
  get opts() { return { diff: { label: P.LABELS.foes, choices: { any: "Any", ...P.DIFF } } }; },
  init(o) { return { genre: P.label, diff: o.diff === "any" ? pick(["easy", "standard", "standard", "hard", "deadly"]) : o.diff }; },
  title: c => pick(["A hidden stash", "The haul", "Spoils", "What they left behind", "A lucky find", "The cache"]),
  sub: c => `${P.DIFF[c.diff]} hoard`,
  fields: {
    coin: ["Coin", c => X().coin((rnd(20) + 5) * MULT[c.diff])],
    valuables: ["Valuables", c => Array.from({ length: Math.min(3, 1 + (c.diff === "hard") + 2 * (c.diff === "deadly")) }, () => pick(X().valuables)).join(", ")],
    item: ["Item", c => { const r = wpick(P.ITEM.rarity); const it = P.ITEM.init(pick(P.ITEM.pool)); return `${P.ITEM.title(it)} (${r.toLowerCase()})`; }],
    odd: ["Odd find", () => cap(pick(P.ITEM.history))],
    where: ["Hidden", () => cap(pick(X().hide))],
  },
};
GEN.encounter = {
  label: "Encounter", noteCat: "Quests",
  get opts() { return { diff: { label: P.LABELS.foes, choices: { any: "Any", ...P.DIFF } } }; },
  init(o) { const diff = o.diff === "any" ? pick(["easy", "standard", "standard", "hard", "deadly"]) : o.diff; const x = bestiaryPick(diff); return { genre: P.label, diff, creature: x?.id || null, cname: x?.name || null }; },
  title: c => cap(c.cname ? `${c.cname}${{ easy: "", standard: "s", hard: " pack", deadly: " horde" }[c.diff] && c.diff !== "easy" ? " ×" + ({ standard: 2 + rnd(2), hard: 3 + rnd(3), deadly: 5 + rnd(4) }[c.diff]) : ""}` : pick(X().fallback)),
  sub: c => `${P.DIFF[c.diff]} encounter${c.cname ? " · from your bestiary" : ""}`,
  fields: {
    doing: ["Doing", () => cap(pick(X().activity))],
    where: ["Where", () => cap(pick(X().terrain))],
    twist: ["Twist", () => pick(T().complication)],
    loot: ["Carrying", c => X().coin((rnd(10) + 2) * MULT[c.diff]) + ", " + pick(X().valuables)],
    flee: ["If it goes badly", () => pick(["They surrender and offer information", "Reinforcements arrive in two rounds", "They flee toward something worse", "One of them begs for mercy and knows a secret", "They take a hostage", "The ground gives way"])],
  },
};
