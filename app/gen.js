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
