// Cyberpunk genre pack: neon streets, megacorps, chrome and data.
import { pick, wpick, cap, rnd } from "./util.js";

const FIRST = {
  f: ["Mara", "Yuki", "Ines", "Dasha", "Nia", "Lena", "Rosa", "Kira", "Amara", "Sol", "Petra", "Mei", "Zara", "Lucia", "Hana", "Adaeze", "Noor", "Vera", "Tamsin", "Ximena"],
  m: ["Dex", "Kenji", "Marco", "Ivan", "Tomas", "Rafa", "Jin", "Omar", "Viktor", "Kofi", "Leon", "Sasha", "Dmitri", "Hiro", "Mateo", "Emeka", "Arjun", "Niko", "Bastian", "Ezra"],
  n: ["Ash", "Quinn", "Rook", "Sky", "Rei", "Jules", "Echo", "Lux", "Nova", "Wren", "Kai", "Remy", "Sable", "Onyx", "Indigo"],
};
const LAST = ["Okafor", "Tanaka", "Reyes", "Volkov", "Park", "Silva", "Novak", "Mendez", "Ishikawa", "Kowalski", "Haddad", "Osei", "Duarte", "Lindqvist", "Nakamura", "Petrov", "Achebe", "Moreau", "Castellanos", "Zhang"];
const HANDLE = ["Razor", "Glitch", "Static", "Ghost", "Halo", "Chrome", "Patch", "Neon", "Cipher", "Rust", "Vandal", "Spider", "Zero", "Hex", "Bishop", "Saint", "Viper", "Wire", "Lucky", "Smoke", "Jackknife", "Daemon", "Brick", "Kitsune", "Echo", "Mantis"];
const CORP_LAST = ["Vance", "Takeda", "Ashgrove", "Kessler", "Montague", "Arasaka-Vale", "Whitlock", "Kurosawa", "Delacroix", "Sterling", "Harrow", "Ishida-Crane"];
const NOMAD_CLAN = ["Dustrunners", "Iron Coyotes", "Salt Kings", "Long Road", "Black Wind", "Rattlers", "Sunburn Family", "Highway Saints"];
const NET_A = ["null", "zer0", "ghost", "black", "deep", "cold", "dead", "silent", "glass", "void"], NET_B = ["pointer", "_kid", "ICE", "byte", "loop", "socket", "daemon", "fox", "proxy", "signal"];

export const NAMES = {
  street: { label: "Street" }, corp: { label: "Corporate" }, nomad: { label: "Nomad" }, runner: { label: "Netrunner" },
};
export const GENDERS = { f: "Feminine", m: "Masculine", n: "Neutral" };
export function makeName(o, g) {
  g = g || pick(["f", "m", "n"]);
  const first = pick(FIRST[g]);
  if (o === "corp") return `${first} ${pick(CORP_LAST)}${rnd(3) ? "" : " III"}`;
  if (o === "nomad") return `${first} of the ${pick(NOMAD_CLAN)}`;
  if (o === "runner") return `${pick(NET_A)}${pick(NET_B)}`;
  return rnd(2) ? `${first} "${pick(HANDLE)}" ${pick(LAST)}` : `${pick(HANDLE)}`;
}

export const T = {
  occupation: ["fixer", "netrunner", "ripperdoc", "street samurai", "corporate exec", "media journalist", "noodle-bar owner", "black-market arms dealer", "data courier", "gang lieutenant", "cyberpsycho squad cop", "AV pilot", "club DJ", "street medic", "techie who fixes anything", "corp security guard", "smuggler", "braindance editor", "ex-military merc", "street preacher of the Machine", "trauma-team paramedic", "pawn shop chromer", "corporate sleeper agent", "drone racer"],
  age: ["young", "young", "adult", "adult", "adult", "middle-aged", "middle-aged", "old", "very old"],
  look: ["chrome jaw that clicks when they talk", "neon tattoos that pulse with their heartbeat", "mirrorshade eye implants", "a corporate suit worth more than your car", "synthetic skin peeling at the wrist", "one arm visibly military-grade", "hair dyed toxic green, shaved on one side", "a respirator mask, always", "subdermal LEDs spelling a gang sign", "an old bullet hole they never got fixed", "spotless white sneakers, everything else filthy", "a datajack port behind each ear", "chrome fingers that drum constantly", "a holographic face filter that glitches"],
  manner: ["paranoid, checks every exit", "slick and smiling, like a salesman", "burned-out and flat", "jittery from too many stims", "ice cold professional", "loud and reckless", "suspicious of anyone with chrome", "idealistic, dangerously so", "bored and expensive", "polite in a way that feels like a threat"],
  voice: ["speaks through a voice modulator", "mixes three languages per sentence", "never uses names, only handles", "talks in corporate euphemisms", "whispers like the walls are bugged (they are)", "laughs at nothing", "calls everyone 'choom'", "reads their messages out loud mid-conversation", "long pauses while their implant buffers"],
  quirk: ["collects pre-collapse vinyl", "refuses to go online", "keeps a real paper notebook", "feeds stray cats on the rooftop", "pays only in cash", "has a pet drone they named", "won't let anyone see their real face", "tips absurdly well", "quotes old movies"],
  want: ["enough eddies to get out of the city", "revenge on the corp that burned them", "a cure for cyberpsychosis creeping in", "to find a sister who disappeared into a corp lab", "to buy back their own memories", "a clean identity", "to be famous on the feeds", "to own the block they grew up on", "a way off the grid for good"],
  secret: ["is a corporate informant", "is running a stolen identity", "owes a gang more than they can pay", "has a kill switch in their head and doesn't know who holds it", "is an AI construct riding a body", "sold the crew out last time", "is dying and hiding it", "is a wanted cop killer", "has a backup of someone's mind in their deck"],
  impression: ["Neon soaks everything in pink and blue", "Rain hammers the overhang, steam everywhere", "Too clean. Corporate clean", "Every surface is covered in ads that know your name", "Dark except for a single flickering sign", "Packed, loud, and smelling of synth-meat", "Security cameras track you as you move", "A hush, like everyone's waiting for something"],
  sense: ["a bass line you feel in your teeth", "ozone and frying noodles", "sirens a few blocks away", "drone rotors overhead", "the hum of a server farm", "wet concrete and cheap perfume", "an ad jingle stuck on loop", "gunfire, distant, routine"],
  present: ["a gang crew counting money", "a corp suit way out of their depth", "a ripperdoc between patients", "a netrunner jacked in and drooling", "two cops on the take", "a kid selling stolen chrome", "a fixer holding court", "a cyberpsycho who hasn't snapped yet"],
  rumor: ["A megacorp is buying up the whole district", "Someone's selling military chrome out of a food truck", "A rogue AI is haunting the local net", "The cops stopped answering calls in the Combat Zone", "A braindance going around shows something the corp wants buried", "A fixer died, and their client list is up for grabs", "The new street drug lets you see the net with your eyes", "An orbital station went dark last night"],
  hidden: ["a hidden server rack running something illegal", "a body in the freezer", "a backdoor into corp security", "a sniper nest on the roof", "a black clinic in the basement", "a stash of untraceable eddies", "a tracking device on everyone who enters"],
  hook: ["A fixer slides a chip across the table", "Someone dies right in front of you, and their deck is still warm", "Your face just showed up on a wanted feed", "A stranger pays your tab and asks for a ride", "The power dies across ten blocks"],
  feat: {
    bar: ["a stage with a holographic band", "booths with privacy jammers", "a back room for deals", "a wall of trophies from dead runners"],
    corp: ["a lobby with a real tree in it", "biometric doors everywhere", "a server core three floors down", "an executive floor with its own security force"],
    clinic: ["a chair with restraints", "jars of spare eyes", "a tank of something growing", "a stolen military surgery rig"],
    market: ["stalls selling chrome by weight", "a gun range in a shipping container", "a noodle stall run by a robot", "a fence who takes anything"],
    squat: ["barricades of old cars", "a generator everybody shares", "kids running drones", "murals of fallen gang members"],
    net: ["an architecture that bends wrong", "black ICE coiled around the data", "ghosts of dead runners", "a door that opens onto someone's memories"],
  },
  patronRole: ["a fixer with a reputation", "a desperate corp defector", "a gang boss", "a journalist on a deadline", "a mysterious AI", "a grieving parent", "a corporate VP with deniable funds", "a ripperdoc owed a favor", "a nomad clan elder", "an ex-cop gone private"],
  objective: [
    w => `Extract ${pick(w.who)} from ${w.place}`, w => `Steal ${pick(w.obj)} from ${w.place}`, w => `Plant ${pick(w.obj)} inside ${w.place}`,
    w => `Escort ${pick(w.who)} across the city alive`, w => `Find out who's behind ${pick(w.mystery)}`, w => `Take down ${pick(w.foe)} at ${w.place}`,
    w => `Wipe all records of ${pick(w.who)} from ${w.place}`, w => `Recover ${pick(w.obj)} before ${pick(w.foe)} does`, w => `Protect ${w.place} from ${pick(w.foe)} for one night`],
  obj: ["a prototype cyberdeck", "a biochip with someone's mind on it", "a crate of military chrome", "the source code for a rogue AI", "a braindance recording of a murder", "a corp exec's private keys", "an experimental combat drug", "a data shard in someone's skull"],
  who: ["a corp scientist", "a kidnapped netrunner", "a witness to a corp murder", "a gang leader's kid", "a rogue AI's host body", "a defecting exec", "an informant in witness protection"],
  mystery: ["a string of cyberpsycho attacks", "missing street kids", "a blackout across the district", "bodies with their implants harvested", "a feed hijack nobody can trace"],
  foe: ["corp security", "a cyberpsycho", "a gang of chromed-up enforcers", "black ICE", "a rival crew", "a corrupt police unit", "a corporate assassin", "a rogue combat drone"],
  monster: ["cyberpsycho", "combat drone", "chromed enforcer", "corp kill team"],
  complication: ["The client is a corp plant", "Another crew got the same job", "The target is broadcasting live", "The building goes into lockdown", "A netrunner is already inside the system", "The cops show up early, and they're bought", "Someone on the crew has a tracker in them", "The payment is in a currency that just crashed"],
  twist: ["The client wants the crew dead after", "The 'target' hired them first", "The data is a copy of one of the crew's minds", "It's a test for a corp recruitment program", "The AI is the client", "The gang and the corp are the same people"],
  deadline: ["before the shift change at 03:00", "before the data auto-wipes in 6 hours", "before the corp audit tomorrow", "tonight, or it's over", "before the stock market opens", "no deadline, but every hour costs eddies"],
  rewardT: { easy: ["2,000 eddies", "a favor from the fixer", "free chrome repairs"], standard: ["10,000 eddies", "a clean ID", "a military-grade implant"], hard: ["50,000 eddies", "a corp-grade cyberdeck", "a safehouse off the grid"], deadly: ["250,000 eddies", "a way out of the city forever", "the client's leverage over a megacorp"] },
  misA: ["Neon", "Silent", "Black", "Glass", "Chrome", "Dead", "Static", "Burning", "Hollow", "Midnight"],
  misN: ["Protocol", "Signal", "Ledger", "Ghost", "Handshake", "Firewall", "Exit", "Payload", "Blackout", "Contract"],
  setSize: [],
};
export const PLACE_TYPES = { bar: "Bar / club", corp: "Corp facility", clinic: "Ripperdoc clinic", market: "Night market", squat: "Gang turf / squat", net: "Net node" };
const PLACE_A = ["Afterlife", "Neon", "Lizzie's", "Cherry", "Static", "Chrome", "Velvet", "Last", "Red", "Sakura", "Glitch", "Blue"];
const PLACE_N = ["Lounge", "Lotus", "Box", "Hole", "Garden", "Club", "Bar", "Den", "Pit", "Arcade"];
const CORP = ["Kessler-Vance", "Orbital Dynamics", "Takeda BioSystems", "Helix Arms", "Montague Data", "Ashgrove Pharma", "Sentinel Security", "NeoNet"];
export function placeName(type) {
  switch (type) {
    case "bar": return `The ${pick(PLACE_A)} ${pick(PLACE_N)}`;
    case "corp": return `${pick(CORP)} ${pick(["Tower", "Arcology", "Research Annex", "Data Center", "Distribution Hub", "Black Site"])}`;
    case "clinic": return `${pick(FIRST.n)}'s ${pick(["Chrome Shop", "Clinic", "Body Works", "Mods", "Back Room"])}`;
    case "market": return `${pick(["Kabuki", "Old Pier", "Overpass", "Undercity", "Container Row", "Sector 9"])} Night Market`;
    case "squat": return `${pick(["The Stacks", "Rust Block", "Tower 13", "The Pit", "Dead Mall", "Old Metro"])}`;
    case "net": return `${pick(["Subnet", "Node", "Datafort", "Ghost Server", "Archive"])} ${pick(["7", "Omega", "Lazarus", "Echo", "K-11", "Hydra"])}`;
  }
}
export function missionPlace() { return placeName(pick(Object.keys(PLACE_TYPES))); }

export const ITEM = {
  types: { weapon: "Weapon", cyberware: "Cyberware", gear: "Gear", program: "Program", drug: "Stim / drug" },
  pool: ["weapon", "weapon", "cyberware", "cyberware", "gear", "program", "drug"],
  base: {
    weapon: ["smart pistol", "monoblade", "shotgun", "SMG", "sniper rifle", "power knuckles", "taser", "thermal katana", "railgun"],
    cyberware: ["optic implant", "reflex booster", "subdermal armor", "arm blade", "neural link", "synthetic heart", "voice modulator", "smart-link"],
    gear: ["cyberdeck", "stealth jacket", "drone", "medkit", "grappling gun", "lockbreaker", "armored coat", "signal jammer"],
    program: ["ICE breaker", "daemon", "worm", "ghost protocol", "camera spoofer", "neural spike"],
    drug: ["inhaler", "injector", "patch", "capsule"],
  },
  init(type) { return { type, base: pick(this.base[type]), maker: pick(["Militech", "Kessler-Vance", "Takeda", "Helix", "street-built", "Kiroshi", "Arasaka-grade", "prototype"]) }; },
  title(c) {
    if (c.type === "drug") return `${pick(["Black Lace", "Glitter", "Overdrive", "Snow", "Synapse", "Redline", "Ghost"])} ${cap(c.base)}`;
    if (c.type === "program") return `${pick(["Hydra", "Lazarus", "Wraith", "Mongoose", "Kraken", "Silencer"])} ${cap(c.base)}`;
    const r = rnd(3);
    if (r === 0) return `${pick(["Mk.", "Model ", "Type-"])}${rnd(9) + 1} "${pick(HANDLE)}"`;
    return `${c.maker === "street-built" ? "Street-built" : cap(c.maker)} ${cap(c.base)}`;
  },
  sub: (c, f) => `${f.rarity} ${c.base}`,
  power: c => cap(pick({
    weapon: ["rounds curve to follow a tagged target", "silent, leaves no ballistic signature", "overheats into a burst of extra damage", "can be fired remotely through a smart-link", "cuts through standard body armor"],
    cyberware: ["slows the world down for one heartbeat", "sees heat through thin walls", "shrugs off the first hit each fight", "records everything you see", "lets you jump two stories"],
    gear: ["hides you from thermal and cameras for a minute", "breaks any standard lock in seconds", "scouts ahead and streams video", "patches a bleeding wound in one action", "jams all comms in a block"],
    program: ["opens one door in any system", "fries the next netrunner who touches it", "makes cameras loop the last minute", "copies itself into anything you link to", "turns an enemy drone for one round"],
    drug: ["you act twice this round, then crash hard", "no pain for an hour", "perfect focus, terrible paranoia", "you see the net without a deck", "heals fast, ages you a little"],
  }[c.type])),
  rarity: [["Street", 32], ["Common", 26], ["Military", 20], ["Corporate prototype", 14], ["Black market exclusive", 7], ["One of a kind", 1]],
  value: { "Street": "a few hundred eddies", "Common": "a couple thousand eddies", "Military": "tens of thousands of eddies", "Corporate prototype": "priceless to the corp that lost it", "Black market exclusive": "whatever the fixer says", "One of a kind": "people have died for it" },
  look: ["scratched matte black with a corp logo filed off", "chrome so polished it's a mirror", "covered in gang stickers", "military olive with serial numbers", "glowing neon trim", "duct tape holding it together", "still has the hospital barcode"],
  quirk: ["pings its old owner's account every hour", "plays an ad jingle on boot", "runs hot and smells like burnt plastic", "the firmware is in a language nobody reads", "occasionally reboots at the worst time", "has a voice assistant with an attitude"],
  history: ["stolen from a corp convoy", "pulled from a dead cyberpsycho", "won in a street race", "a prototype that was supposed to be destroyed", "bought from a fixer who later vanished", "grown in a lab that doesn't exist on paper"],
};
export const LABELS = { ancestry: "Origin", foes: "Heat", origin: "Origin" };
export const DIFF = { easy: "Low heat", standard: "Standard", hard: "High heat", deadly: "Suicide run" };
