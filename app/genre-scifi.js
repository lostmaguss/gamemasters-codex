// Sci-fi genre pack: ships, stations, frontier worlds and things that shouldn't exist.
import { pick, wpick, cap, rnd } from "./util.js";

const FIRST = {
  f: ["Ada", "Imani", "Sela", "Juno", "Talia", "Orla", "Vesna", "Maren", "Kaya", "Lyra", "Esme", "Noa", "Riya", "Calla", "Thea"],
  m: ["Teo", "Cass", "Idris", "Dorian", "Marek", "Anson", "Kael", "Jasper", "Rhys", "Tobias", "Amos", "Ilya", "Zane", "Felix", "Oren"],
  n: ["Sasha", "Rin", "Ellis", "Arden", "Blue", "Sol", "Tam", "River", "Kit", "Lark"],
};
const LAST = ["Varkas", "Okonkwo", "Halvorsen", "Ibarra", "Chen-Reyes", "Mbeki", "Sørensen", "Abara", "Kovac", "Delgado", "Achterberg", "Nakashima", "Quill", "Rask", "Tal"];
const ALIEN_A = ["Zh'", "Ix", "Vae", "Qor", "Tal", "Sss", "Ur", "Kel", "Ny", "Oth"], ALIEN_B = ["karri", "il", "tharn", "esh", "uun", "orra", "ix", "vel", "zaa", "mok"];
const SYN = ["KT", "RX", "AL", "M0", "EV", "DX", "SN", "OR"], SYN_NICK = ["Kit", "Rex", "Al", "Mo", "Eve", "Dex", "Sunny", "Oracle", "Patch", "Tin"];
export const NAMES = { spacer: { label: "Spacer" }, core: { label: "Core worlder" }, colonist: { label: "Colonist" }, synth: { label: "Synthetic" }, alien: { label: "Alien" } };
export const GENDERS = { f: "Feminine", m: "Masculine", n: "Neutral" };
export function makeName(o, g) {
  g = g || pick(["f", "m", "n"]);
  if (o === "alien") return `${pick(ALIEN_A)}${pick(ALIEN_B)}${rnd(2) ? " " + pick(ALIEN_A).replace("'", "") + pick(ALIEN_B) : ""}`;
  if (o === "synth") { const i = rnd(SYN.length); return `${SYN[i]}-${rnd(90) + 10} "${SYN_NICK[i]}"`; }
  if (o === "core") return `${pick(FIRST[g])} ${pick(LAST)}-${pick(LAST)}`;
  if (o === "colonist") return `${pick(FIRST[g])} ${pick(LAST)} of ${pick(["Kepler's Rest", "New Ithaca", "Dustfall", "Harrow's Reach", "Tau Station"])}`;
  return `${pick(FIRST[g])} ${pick(LAST)}`;
}

export const T = {
  occupation: ["freighter captain", "salvage diver", "ship's engineer", "station security chief", "xenobiologist", "smuggler", "colonial marine", "corporate liaison", "asteroid miner", "navigator", "bounty hunter", "medic", "AI technician", "terraformer", "diplomat", "relic hunter", "dock boss", "cult prophet", "pilot for hire", "data broker"],
  age: ["young", "young", "adult", "adult", "adult", "middle-aged", "middle-aged", "old", "ancient by spacer standards"],
  look: ["vacuum-burn scars across the neck", "a cybernetic eye with a cracked lens", "spacer-thin, tall from low gravity", "a faded unit patch on a worn flight jacket", "skin with an alien bioluminescent tint", "a breathing tube clipped to the collar", "tattooed star charts on both arms", "a synthetic body that's almost too perfect", "frostbitten fingers from a cryo accident", "an immaculate officer's uniform, no insignia"],
  manner: ["calm in a crisis, useless at parties", "quietly devout", "cynical, counts every credit", "eager, too trusting", "follows protocol to the letter", "haunted, doesn't sleep", "talks to the ship like it's alive", "charming liar", "cold and curious", "loyal to a dead captain"],
  voice: ["uses military time for everything", "speaks through a translator with a lag", "hums old Earth songs", "drawls like a frontier colonist", "precise, no wasted words", "swears in three dead languages", "asks the ship's AI before answering"],
  quirk: ["keeps a plant alive on every ship", "won't go into cryo", "collects alien coins", "has a superstition about airlocks", "cooks real food in zero-g", "names every drone"],
  want: ["to pay off the ship", "to find out what happened to their old crew", "to get home to a planet that might not exist", "a clean record", "first contact, on their terms", "to destroy the AI that killed their family", "one big score and retirement on a garden world"],
  secret: ["is a deep-cover agent for the Union", "is a synthetic and doesn't know it", "infected with something alien", "stole the ship", "was a pirate", "has a bounty on their head in three systems", "knows the coordinates of a precursor site"],
  impression: ["Flickering emergency lights and recycled air", "Clean, white, and far too quiet", "Gravity's a little off", "Every surface hums with machinery", "Frost on the inside of the viewports", "Crowded with traders from a dozen worlds", "Alien growth creeping over the bulkheads"],
  sense: ["the drone of life support", "a warning chime nobody turns off", "ozone and machine oil", "dripping coolant", "distant hull groans", "an alien song through the vents", "the static of a dead channel"],
  present: ["a dock crew on strike", "a customs officer looking for a bribe", "a lone survivor in a pressure suit", "pilgrims bound for a holy moon", "a corporate survey team", "a synth with no memory of arriving"],
  rumor: ["A derelict is broadcasting a distress call from 200 years ago", "The colony's water is making people dream the same dream", "The corp is quarantining a moon and won't say why", "A ship came back from the jump with no crew", "Someone found a precursor artifact in the asteroid belt", "The station AI has started asking questions"],
  hidden: ["a second crew compartment not on the schematics", "an alien egg sac in the cargo hold", "a corporate black box recording everything", "a stowaway in the vents", "a reactor that's quietly failing", "a body in cryo that isn't supposed to be there"],
  hook: ["A distress beacon pings on an unregistered frequency", "The ship's AI wakes the crew early", "Customs impounds the cargo", "A stranger offers triple pay, no questions", "The jump drive fails mid-transit"],
  feat: {
    station: ["a ring-shaped promenade with fake sky", "a zero-g market in the hub", "a sealed-off deck nobody mentions", "a chapel built from a ship's hull"],
    derelict: ["frozen crew still at their posts", "a corridor that loops", "power that comes on only when you leave", "an AI that thinks it's still the old year"],
    colony: ["prefab domes half-buried in dust", "a terraforming tower that's stopped", "a cemetery that's grown too fast", "a market of salvaged ship parts"],
    ship: ["a cargo bay too big for the ship", "a captain's cabin locked from inside", "a ship's cat that knows things", "a jump drive older than anyone aboard"],
    ruin: ["geometry that hurts to look at", "glyphs that rearrange themselves", "a chamber with breathable air", "a door that opens only for one of the crew"],
    planet: ["twin suns and endless dusk", "storms of glass sand", "a jungle that moves at night", "an ocean that sings"],
  },
  patronRole: ["a corporate fixer", "a desperate colony governor", "a Union intelligence officer", "a smuggler queen", "a dying scientist", "an alien envoy", "a ship's AI", "a salvage guild boss", "a religious order", "an insurance investigator"],
  objective: [
    w => `Salvage ${pick(w.obj)} from ${w.place}`, w => `Escort ${pick(w.who)} to ${w.place}`, w => `Investigate ${pick(w.mystery)} at ${w.place}`,
    w => `Smuggle ${pick(w.obj)} past a Union blockade`, w => `Rescue ${pick(w.who)} from ${pick(w.foe)}`, w => `Clear ${w.place} of ${pick(w.foe)}`,
    w => `Recover the flight recorder from ${w.place}`, w => `Make first contact at ${w.place}`, w => `Hold ${w.place} until the relief fleet arrives`],
  obj: ["a precursor artifact", "a cryo pod with a VIP inside", "a navigation core with forbidden coordinates", "a crate of terraforming seeds", "an AI core", "a prototype jump drive", "a sample of alien biomatter", "the colony's charter"],
  who: ["a defecting scientist", "a colony's last doctor", "an alien diplomat", "the heir to a shipping empire", "a synthetic who knows too much", "a war criminal"],
  mystery: ["a ship that came back empty", "a colony that stopped transmitting", "crew members waking with the same scars", "signals coming from inside a dead star", "a station losing an hour every night"],
  foe: ["pirates", "a corporate kill team", "a rogue security AI", "alien hunters", "Union marines", "a hive of something that eats metal", "a cult of the void"],
  monster: ["xenomorph", "rogue AI drone", "void-touched crew", "swarm"],
  complication: ["The jump drive needs repairs, mid-job", "Life support has two days left", "The client is under quarantine", "A rival salvage crew is already docked", "The Union is watching", "Something followed them out of the jump", "The cargo is alive"],
  twist: ["The derelict is their own ship, from the future", "The colony is fine, the patron is the threat", "The AI was protecting everyone", "The aliens are refugees", "The artifact is a beacon, and it just switched on", "The crew's memories were edited"],
  deadline: ["before the orbit decays", "before the jump window closes", "in 72 hours, ship time", "before the relief fleet arrives", "before the oxygen runs out"],
  rewardT: { easy: ["5,000 credits", "a full refuel and resupply", "a favor from the dock boss"], standard: ["25,000 credits", "a ship upgrade", "clean transponder codes"], hard: ["100,000 credits", "salvage rights to the whole wreck", "a military-grade weapon system"], deadly: ["a ship of their own", "precursor tech", "a pardon from the Union"] },
  misA: ["Silent", "Cold", "Last", "Dark", "Broken", "Distant", "Red", "Hollow", "Drifting", "Burning"],
  misN: ["Signal", "Orbit", "Horizon", "Beacon", "Passage", "Star", "Harbor", "Echo", "Covenant", "Vector"],
};
export const PLACE_TYPES = { station: "Space station", derelict: "Derelict ship", colony: "Colony", ship: "Ship", ruin: "Alien ruin", planet: "Planet" };
const GREEK = ["Alpha", "Kappa", "Sigma", "Tau", "Omega", "Delta", "Epsilon", "Zeta"];
export function placeName(type) {
  switch (type) {
    case "station": return `${pick(["Halcyon", "Meridian", "Ceres", "Anchor", "Bastion", "Waypoint", "Gateway"])} Station`;
    case "derelict": return `The ${pick(["Endurance", "Morning Star", "Calypso", "Requiem", "Prospect", "Lantern", "Ishtar"])} (derelict)`;
    case "colony": return `${pick(["New", "Port", "Fort", ""])} ${pick(["Ithaca", "Kepler", "Dustfall", "Harrow", "Eden", "Tranquility", "Amber"])}`.trim();
    case "ship": return `The ${pick(["Rusty", "Wandering", "Lucky", "Iron", "Silver", "Black"])} ${pick(["Marlin", "Comet", "Albatross", "Gambit", "Saint", "Mule"])}`;
    case "ruin": return `${pick(["The Spire", "The Hollow", "The Lattice", "The Vault", "The Choir"])} of ${pick(GREEK)} ${rnd(9) + 1}`;
    case "planet": return `${pick(GREEK)} ${pick(["Ceti", "Draconis", "Pavonis", "Eridani", "Lyrae"])} ${pick(["b", "c", "d", "IV", "VII"])}`;
  }
}
export function missionPlace() { return placeName(pick(Object.keys(PLACE_TYPES))); }

export const ITEM = {
  types: { weapon: "Weapon", armor: "Armor / suit", tech: "Tech", ship: "Ship part", alien: "Alien artifact" },
  pool: ["weapon", "weapon", "armor", "tech", "tech", "ship", "alien"],
  base: {
    weapon: ["pulse rifle", "plasma cutter", "coil pistol", "flechette gun", "arc baton", "smart grenade", "boarding axe"],
    armor: ["hardsuit", "vac suit", "kinetic shield", "boarding armor", "stealth weave", "exo-frame"],
    tech: ["scanner", "medgel injector", "hacking spike", "grav boots", "translator", "holo-decoy", "drone"],
    ship: ["jump drive coil", "shield emitter", "targeting array", "cloaking module", "reactor core", "tractor beam"],
    alien: ["humming shard", "seed pod", "crystal lattice", "bone key", "living map", "silver sphere"],
  },
  init(type) { return { type, base: pick(this.base[type]) }; },
  title(c) {
    if (c.type === "alien") return `${pick(["The", "A"])} ${cap(c.base)} of ${pick(["the Choir", "Lost Tau", "the First Ones", "the Deep", "the Silence"])}`;
    return `${pick(["Mk.", "Series ", "Model "])}${rnd(9) + 1} ${cap(c.base)}${rnd(3) ? "" : ` "${pick(["Widowmaker", "Lullaby", "Old Faithful", "Sunrise", "Judge"])}"`}`;
  },
  sub: (c, f) => `${f.rarity} ${c.base}`,
  power: c => cap(pick({
    weapon: ["ignores energy shields", "fires around corners with a tagged target", "silent in vacuum and atmosphere", "overcharges for one devastating shot", "won't fire at its owner"],
    armor: ["sealed for 12 hours in vacuum", "turns aside the first hit each fight", "magnetizes to hulls", "adapts to any atmosphere", "reroutes power to strength"],
    tech: ["reads life signs through bulkheads", "heals a wound in seconds", "talks to any computer", "projects a perfect decoy", "lets you walk on walls"],
    ship: ["one jump with no cooldown", "shrugs off a broadside once", "locks onto anything within a light-second", "hides the ship from scans for an hour", "pulls a ship to a stop"],
    alien: ["shows visions of the place it came from", "opens precursor doors", "heals whoever holds it, slowly changing them", "attracts things from the void", "translates a dead language"],
  }[c.type])),
  rarity: [["Standard issue", 32], ["Civilian", 26], ["Military grade", 20], ["Experimental", 14], ["Alien", 7], ["Precursor", 1]],
  value: { "Standard issue": "a few hundred credits", "Civilian": "a few thousand credits", "Military grade": "tens of thousands of credits", "Experimental": "a corp would kill for it", "Alien": "museums and cults will bid", "Precursor": "beyond price" },
  look: ["scuffed grey with old unit markings", "sleek and white, corporate design", "covered in hand-painted kill marks", "faintly warm and organic to the touch", "military green with stencilled warnings", "patched with parts from five other models"],
  quirk: ["its AI is chatty", "drains power from anything nearby", "only works for one person", "beeps when something alien is close", "has a previous owner's voice log stuck on repeat"],
  history: ["salvaged from a dead warship", "smuggled out of a corporate lab", "the last of its production line", "found on a world with no life", "won in a card game on a mining rig"],
};
export const LABELS = { ancestry: "Origin", foes: "Danger", origin: "Origin" };
export const DIFF = { easy: "Milk run", standard: "Standard", hard: "Dangerous", deadly: "Suicide mission" };
