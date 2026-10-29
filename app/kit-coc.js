// Call of Cthulhu kit: a 1920s Forge, random tables and a ready-to-play investigation.
// Everything here is written for this app. Mythos names are from H. P. Lovecraft's stories that are
// in the public domain (ghouls, the Necronomicon, the Pnakotic Manuscripts). Nothing is
// taken from Chaosium's books; Call of Cthulhu is Chaosium's trademark and is used only to name the game.
import { pick, wpick, cap, rnd } from "./util.js";

// ---------- names: America in the 1920s ----------
const FIRST = {
  f: ["Agnes", "Alice", "Beatrice", "Clara", "Dorothy", "Edith", "Eleanor", "Esther", "Florence", "Frances", "Grace", "Hazel", "Helen", "Ida", "Irene", "Josephine", "Lillian", "Louise", "Mabel", "Margaret", "Marion", "Mildred", "Opal", "Pearl", "Ruth", "Sadie", "Thelma", "Vera", "Viola", "Winifred"],
  m: ["Albert", "Arthur", "Chester", "Clarence", "Earl", "Edgar", "Elmer", "Ernest", "Floyd", "Frank", "Harold", "Herbert", "Homer", "Howard", "Leonard", "Lester", "Lloyd", "Milton", "Oscar", "Ralph", "Roy", "Silas", "Stanley", "Thaddeus", "Vernon", "Walter", "Wendell", "Wilbur", "Willis", "Virgil"],
  n: ["Francis", "Jean", "Marion", "Leslie", "Carroll", "Lynn", "Shirley", "Evelyn"],
};
const NAMES = {
  yankee: { label: "Old New England", last: ["Abbott", "Bradford", "Cabot", "Chandler", "Coffin", "Derby", "Eames", "Fairfield", "Gilman", "Hale", "Hawthorne", "Kimball", "Lowell", "Peabody", "Pickering", "Prescott", "Sargent", "Thayer", "Whitcombe", "Winslow"] },
  irish: { label: "Irish", last: ["Brennan", "Callahan", "Doyle", "Fitzgerald", "Flanagan", "Kerrigan", "Mahoney", "McCarthy", "Mulligan", "O'Brien", "O'Hara", "Quinn", "Reilly", "Sullivan", "Walsh"], f: ["Bridget", "Kathleen", "Maeve", "Nora", "Siobhan"], m: ["Declan", "Eamon", "Michael", "Patrick", "Seamus"] },
  italian: { label: "Italian", last: ["Benedetti", "Bruno", "Caruso", "Colombo", "DeLuca", "Esposito", "Ferraro", "Galli", "Marino", "Romano", "Rossi", "Russo", "Santoro", "Vitale"], f: ["Antonia", "Carmela", "Lucia", "Rosa", "Teresa"], m: ["Angelo", "Carlo", "Giuseppe", "Salvatore", "Vincenzo"] },
  polish: { label: "Polish", last: ["Dabrowski", "Kaminski", "Kowalski", "Lewandowski", "Majewski", "Nowak", "Sadowski", "Wisniewski", "Zielinski"], f: ["Halina", "Jadwiga", "Stasia", "Wanda"], m: ["Jozef", "Kazimierz", "Stanislaw", "Tadeusz"] },
  german: { label: "German", last: ["Albrecht", "Becker", "Engel", "Fischer", "Hartmann", "Kessler", "Krueger", "Muller", "Schaefer", "Vogel", "Weber"], f: ["Greta", "Hilde", "Liesel"], m: ["Friedrich", "Heinrich", "Otto"] },
  jewish: { label: "Jewish", last: ["Abrams", "Bernstein", "Cohen", "Feldman", "Goldberg", "Klein", "Levy", "Rosen", "Shapiro", "Weiss"], f: ["Miriam", "Rivka", "Sarah"], m: ["Isaac", "Jacob", "Samuel"] },
  portuguese: { label: "Portuguese", last: ["Almeida", "Correia", "Ferreira", "Medeiros", "Pacheco", "Silva", "Sousa", "Teixeira"], f: ["Conceição", "Maria"], m: ["Manuel", "João"] },
};
const GENDERS = { f: "Women's names", m: "Men's names", n: "Either" };
function makeName(anc, g) {
  const t = NAMES[anc] || NAMES.yankee; g = g || pick(["f", "m"]);
  const own = t[g] && rnd(2) ? t[g] : FIRST[g] || FIRST.m;
  return `${pick(own)} ${pick(t.last)}`;
}

const PLACE_TYPES = { tavern: "Speakeasy / diner", settlement: "Town", dungeon: "Old house / ruin", shop: "Shop / business", landmark: "Wild place", temple: "Church / institution" };
const T = {
  occupation: ["antiquarian", "librarian", "mill hand", "night watchman", "country doctor", "parish priest", "reporter for the local paper", "bootlegger", "police detective", "private investigator", "college professor", "nurse", "dilettante with family money", "spiritualist medium", "fisherman", "undertaker", "railroad porter", "jazz musician", "telephone operator", "lawyer", "bank clerk", "farmer", "asylum orderly", "museum curator", "taxi driver", "shopkeeper", "veteran of the Great War", "chauffeur", "housemaid", "photographer"],
  age: ["young", "young", "adult", "adult", "adult", "middle-aged", "middle-aged", "old", "very old"],
  look: ["wire spectacles mended with thread", "a good suit gone shiny at the elbows", "a cough that won't leave", "nicotine-yellow fingers", "a shrapnel scar along the jaw", "rouge a little too bright", "a black armband for someone recent", "hands that never stop shaking", "a cheap fedora pulled low", "pale, as if they never see the sun", "a gold tooth they flash when they smile", "a war medal on a worn coat", "eyes red from no sleep", "mud on their shoes, always", "smells of mothballs and lavender"],
  manner: ["polite and careful", "nervous, glances at the windows", "brusque, busy, impatient", "too friendly to strangers", "suspicious of 'city folk'", "pious, crosses themselves often", "drinks a little before answering", "talks too much when afraid", "proud and stiff", "kind, worn down by grief", "cagey, answers questions with questions", "eager to help, maybe too eager"],
  voice: ["a thick Boston accent", "speaks softly, as if the walls listen", "clipped, like a telegram", "a laugh that comes too late", "mumbles, hard to hear", "an Old Country accent", "long pauses before every answer", "calls everyone 'mister' or 'missus'", "quotes the Bible", "whistles through a gap in their teeth"],
  quirk: ["keeps the lights on all night", "won't go near the water", "collects newspaper clippings about the dead", "counts the church bells that don't ring", "has a dog that won't stop growling at them", "sleepwalks", "draws the same symbol without noticing", "always locks the door twice", "carries a rosary and a revolver", "refuses to look in mirrors"],
  want: ["to find a missing relative", "to keep their job at the mill", "to be left alone", "to get out of this town", "to know what happened to their spouse", "money for a sick child", "a drink, and then another", "to bury the past", "the truth printed in the paper", "to be believed"],
  secret: ["is a member of the cult, a frightened one", "saw something at the falls and told no one", "is being paid by the mill owner to watch strangers", "is hiding someone in their cellar", "has been dreaming of tunnels every night", "stole a book from the library's locked room", "took money to look the other way", "has a relative who 'went under the falls'", "knows the bell's clapper is missing, and who took it", "isn't fully human anymore, and suspects it"],
  setA: ["Ashby", "Kings", "Fall", "Hollow", "Bramble", "Cold", "Raven", "Salt", "Stone", "Thorn", "Willow", "Elm", "Gray", "Marble"],
  setB: [" Falls", "port", " Mills", "ton", " Crossing", "field", "bury", " Harbor", "ham", " Junction", "wick", " Center"],
  shopKind: ["pharmacy", "antiques dealer", "funeral parlor", "hardware store", "bookshop", "pawnbroker", "photography studio", "general store"],
  setSize: ["mill town of a few thousand", "fishing village with one road in", "college town with old money", "dying farm town", "railroad junction town", "harbor town gone to seed", "resort town, closed for the season"],
  feat: {
    tavern: ["a back room behind a fake cold-storage door", "a piano nobody plays, that sometimes plays", "a police captain who drinks free", "a booth where the same stranger sits every night", "a bartender who knows everyone's secrets", "a cellar door chained from the inside"],
    settlement: ["a church bell that hasn't rung in two years", "a mill that runs all night", "a town green with a hanging tree", "a lighthouse that's been dark for decades", "a train that stops but nobody gets off", "a graveyard bigger than the town"],
    dungeon: ["a sealed room with a fresh smell of earth", "stairs going down further than the house is tall", "portraits with the eyes scratched out", "a library of books in no known language", "claw marks inside a coffin", "a well in the cellar, covered with a millstone"],
    shop: ["a back room for 'special customers'", "a clock that runs backwards", "a ledger of sales to people long dead", "shelves of jars with unlabeled things in them", "a shopkeeper who never seems to sleep", "a basement that floods every full moon"],
    landmark: ["a ring of stones the cows won't graze near", "a waterfall that drowns out every other sound", "a lone tree with nails driven into it", "a quarry pool with no bottom", "a hill where compasses spin", "a marsh where lights move at night"],
    temple: ["a crypt that's newer than the church", "a stained-glass window of a saint nobody can name", "an asylum ward that's always locked", "a university museum with a cabinet nobody opens", "a hospital morgue with too few bodies", "a meeting hall with a symbol painted over"],
  },
  impression: ["Clean, quiet, and too tidy", "Everything smells of damp wool", "The windows are all painted shut", "The air is cold and still", "Faded wallpaper and new locks", "A radio plays dance music to nobody", "Mud tracked everywhere, then scrubbed", "Dim electric light that hums"],
  sense: ["the roar of the falls under everything", "coal smoke and wet leaves", "carbolic soap and something sweet underneath", "a dripping tap that never stops", "machinery thumping through the walls", "church incense and cigarettes", "low tide and rotten fish", "chalk dust and old paper"],
  present: ["a pair of mill foremen in their Sunday suits", "a reporter pretending to read a newspaper", "a sheriff's deputy who won't meet your eye", "a widow in black asking everyone the same question", "children playing a game about 'going under'", "a traveling salesman with nothing in his case", "a priest who leaves when you enter", "a drunk who seems to know your name"],
  rumor: ["The mill hasn't lost a single day's work, even the night three men disappeared", "Old Doctor Pell's boy went up to the falls with a camera and never came back", "The bell at St. Brendan's stopped ringing the week Mr. Crane paid to fix it", "There are tunnels behind the falls, older than the town", "Someone's been digging in the paupers' field", "The library keeps a locked room, and the key went missing", "Dogs won't walk past the mill at night", "Every year, someone 'moves away' in October"],
  hidden: ["a trapdoor to a cellar dug into rock", "a cult meets here after midnight", "a body in the root cellar, half-eaten", "a strange symbol under the carpet", "a hidden diary in the chimney", "a passage to the old tunnels", "someone watching through a hole in the wall", "the owner has been dead a week, and someone is living as them"],
  hook: ["A letter arrives from someone they once helped, begging them to come", "A newspaper clipping is pushed under their door, with a name circled", "A dead friend's will leaves them a house, and a key", "A stranger on the train presses a notebook into their hands and gets off", "Their landlady hasn't come out of her room in three days", "A telegram: COME AT ONCE. TELL NO ONE."],
  patronRole: ["a frightened widow", "the town doctor", "a newspaper editor", "a college dean", "a parish priest", "a wealthy collector", "a police captain off the record", "a dying professor", "a missing man's sister", "a lawyer settling an estate"],
  objective: [w => `Find out what happened to ${pick(w.who)} at ${w.place}`, w => `Recover ${pick(w.obj)} from ${w.place}`, w => `Investigate ${pick(w.mystery)} in ${w.place}`, w => `Stop ${pick(w.foe)} before the next new moon`, w => `Get ${pick(w.who)} safely out of ${w.place}`, w => `Destroy ${pick(w.obj)} before anyone else reads it`, w => `Find the link between ${pick(w.foe)} and ${w.place}`],
  obj: ["a water-stained diary", "a copy of the Necronomicon, or what someone thinks is one", "a fragment of the Pnakotic Manuscripts", "a photograph that shows too much", "a carved idol of green stone", "a wax cylinder recording", "a professor's last letter", "a ring set with a stone that isn't a stone"],
  who: ["a missing reporter", "a mill hand's husband", "a child who walks in her sleep", "a professor on sabbatical", "a sailor who came back wrong", "a medium who heard something real", "the doctor's brother", "a night watchman"],
  monster: ["ghouls", "a faceless flying thing", "a thing in the well", "a man who is no longer a man", "a cult and the thing they feed", "deep things under the harbor", "the dead that walk", "a colour that shouldn't exist"],
  mystery: ["a string of disappearances", "graves found empty", "a church bell that won't ring", "the same dream shared by a whole street", "a mill that never stops running", "a drowned man who walked home", "strange lights over the quarry", "a sealed room with fresh footprints inside"],
  foe: ["a mill owner's secret society", "a coven of respectable townsfolk", "bootleggers who found something in their cellar", "a professor who went too far", "a family that has always been here", "a cult that calls itself a social club", "the ghouls under the cemetery", "a dead man's will, carried out by the living"],
  complication: ["The police are paid not to see", "The witness is too frightened to talk", "Someone burned the records last night", "The client is hiding something", "A storm closes the only road", "One of the investigators is being followed", "The town doesn't want strangers here", "The key witness turns up dead"],
  twist: ["The client is one of them", "The missing man left willingly", "The cult is trying to keep something down, not let it out", "The monster was once someone they loved", "Two of the townsfolk are the same person", "The book is a forgery, and the real one is worse", "The investigators were invited for a reason"],
  deadline: ["before the new moon", "by Halloween", "before the funeral", "before the night shift", "within three days", "before the last train out", "no deadline, but people keep vanishing"],
  rewardT: { easy: ["a modest fee and a train ticket home", "a dinner and a favor", "the client's gratitude"], standard: ["a $50 fee", "a rare book from the client's library", "a friend in the police"], hard: ["$200 and expenses", "a letter of introduction to a powerful collector", "a lead on a bigger mystery"], deadly: ["the client's estate", "knowledge no one should have", "their lives, and the town's"] },
  misA: ["Silent", "Drowned", "Hollow", "Black", "Last", "Crooked", "Pale", "Unquiet", "Lost", "Whispering"],
  misN: ["Bell", "Falls", "Mill", "Shift", "Ledger", "Lantern", "Hymn", "Cellar", "Well", "Letter"],
};
function placeName(type) {
  switch (type) {
    case "tavern": return pick([`${makeName(pick(Object.keys(NAMES))).split(" ")[1]}'s Diner`, `The ${pick(["Blue", "Red", "Gilded", "Owl", "Anchor"])} ${pick(["Room", "Club", "Lounge", "Grill"])}`, `${pick(["Sal's", "Mickey's", "Rosie's", "Doc's"])} (a speakeasy behind a barbershop)`]);
    case "settlement": return pick(T.setA) + pick(T.setB);
    case "dungeon": return pick([`The ${makeName("yankee").split(" ")[1]} House`, `The Old ${pick(["Mill", "Asylum", "Quarry", "Farm", "Lighthouse", "Orphanage"])}`, `The ${pick(["Burned", "Shut", "Sunken"])} ${pick(["Church", "Mansion", "Cannery"])}`]);
    case "shop": return `${makeName(pick(Object.keys(NAMES))).split(" ")[1]}'s ${pick(["Pharmacy", "Antiques", "Funeral Parlor", "Hardware", "Books", "Pawn & Loan", "Photography Studio"])}`;
    case "landmark": return `${pick(["Hangman's", "Witch's", "Miller's", "Cutter's", "Dead Man's", "Lantern"])} ${pick(["Falls", "Hill", "Quarry", "Swamp", "Woods", "Point", "Bridge"])}`;
    case "temple": return pick([`St. ${pick(["Brendan's", "Agnes's", "Jude's", "Mary's"])} Church`, `${pick(T.setA)} Asylum`, `${makeName("yankee").split(" ")[1]} Memorial Library`, `${pick(["Halloway", "Wexley", "Pelham"])} College Museum`]);
  }
}
const missionPlace = () => placeName(pick(["settlement", "dungeon", "landmark", "temple", "tavern"]));

const ITEM = {
  types: { tome: "Book or paper", artifact: "Artifact", weapon: "Period weapon", gear: "Investigator's gear" },
  pool: ["tome", "tome", "artifact", "artifact", "weapon", "gear"],
  init(type) { return { type, base: pick({ tome: ["diary", "grimoire", "letter bundle", "scrapbook", "treatise", "ship's log", "sermon book"], artifact: ["idol", "ring", "mask", "mirror", "bell clapper", "box", "amulet", "skull"], weapon: [".38 revolver", ".45 automatic", "double-barreled shotgun", "straight razor", "trench knife", "blackjack", "deer rifle"], gear: ["camera", "flashlight", "doctor's bag", "lock picks", "field glasses", "phonograph", "pocket watch"] }[type]) }; },
  title(c) {
    if (c.type === "tome") return pick([`The ${pick(["Diary", "Journal", "Confessions", "Notebook"])} of ${makeName(pick(Object.keys(NAMES)))}`, `${pick(["Of", "On"])} ${pick(["the Things Below", "Hidden Waters", "the Gnawing Dark", "Doorways", "Feeding the Dead", "the Silent Bell"])}`, `${pick(["Notes", "Letters", "Sermons"])} from ${pick(T.setA)}${pick(T.setB)}`]);
    if (c.type === "artifact") return `${pick(["Green stone", "Black iron", "Bone", "Tarnished silver", "Ivory", "Salt-crusted"])} ${c.base}`;
    return cap(c.base);
  },
  sub: (c, f) => `${f.rarity} ${c.base}`,
  power(c) {
    if (c.type === "tome") return pick(["Reading it takes a week and costs 1d4 Sanity. Teaches one spell, badly translated", "Describes the tunnels under a nearby town, with a map", "Names the cult's members, in code", "Holds a ritual that keeps something asleep", "A long, careful account of a ghoul's life, written by the ghoul"]);
    if (c.type === "artifact") return pick(["Cold to the touch. Animals flee from it", "Whoever holds it dreams of a door underground", "Rings faintly when something unnatural is near", "Makes the bearer hard to notice in the dark", "Something wants it back"]);
    if (c.type === "weapon") return pick(["Reliable, oiled, ready", "Jams on a roll of 96 or more", "Was used in a murder that was never solved", "Has the initials of a dead policeman", "Loaded with silver bullets someone made by hand"]);
    return pick(["In good working order", "Belonged to the missing man", "Has one last photograph still in it", "Engraved with a name and a date", "Better than it looks"]);
  },
  rarity: [["Ordinary", 40], ["Unusual", 35], ["Rare", 20], ["Unique", 5]],
  value: { Ordinary: "a few dollars", Unusual: "tens of dollars to a collector", Rare: "hundreds of dollars, to the right people", Unique: "priceless, and dangerous to own" },
  look: ["water-stained and swollen", "wrapped in oilcloth", "smells of the grave", "marked with a symbol nobody recognizes", "newer than it should be", "carefully mended many times", "covered in fingerprints of something with too many fingers"],
  quirk: ["it's warm, always", "it's never where you left it", "dogs bark at it", "it makes the lights flicker", "it has a name written inside, yours", "none that anyone has noticed"],
  history: ["found in a dead man's coat", "sold at an estate auction for almost nothing", "brought back from France by a soldier who wouldn't speak of it", "stolen from a college library's locked room", "dug up in a farmer's field", "given by a stranger on a train", "left on the church steps"],
};

const EXTRA = {
  coin: n => `$${n * 2}`,
  valuables: ["a gold pocket watch", "a silver flask, engraved", "a string of pearls", "a roll of twenty-dollar bills", "a diamond tie pin", "a bearer bond", "an old Spanish coin", "a cameo brooch"],
  hide: ["under a floorboard", "inside a hollowed-out Bible", "in a coffee tin buried in the garden", "behind a loose brick in the chimney", "sewn into a mattress", "in a safe-deposit box, key missing", "in the false bottom of a steamer trunk", "in a dead man's shoe"],
  activity: ["holding a meeting in robes", "digging in the cemetery", "carrying something heavy wrapped in canvas", "watching the investigators' hotel", "chanting in a cellar", "arguing over money", "burying evidence", "following someone home"],
  terrain: ["a fog-bound cemetery", "a mill floor at night, machines still running", "a flooded cellar", "a narrow tunnel behind a waterfall", "a dark country road", "an abandoned church", "a train platform at midnight", "a boarded-up house in the rain"],
  fallback: ["cultists", "ghouls", "mill thugs", "a corrupt deputy", "a pack of dogs that aren't dogs", "the walking dead", "a hound that walks upright", "bootleggers"],
};

export const forge = { NAMES, GENDERS, makeName, T, PLACE_TYPES, placeName, missionPlace, ITEM, EXTRA, LABELS: { ancestry: "Background", foes: "Danger", origin: "Background" }, DIFF: { easy: "Quiet", standard: "Unsettling", hard: "Dangerous", deadly: "Lethal" } };

// ---------- random tables ----------
export function tables(t) {
  const f = "Call of Cthulhu";
  return [
    t("Strange occurrence", `${f} · Horror`, ["Every clock in the house stops at 3:17", "Wet footprints lead from the river to the front door, and stop", "A dog howls, and every dog in town answers", "The radio picks up a voice saying an investigator's name", "Someone has been in the room. Nothing's missing. Something's been added", "A smell of the grave in the hotel corridor", "The church bell moves, but makes no sound", "A child's drawing shows the investigators, and something behind them", "Scratching under the floorboards, slow and patient", "A photograph develops with one extra person in it"]),
    t("Library research", `${f} · Investigation`, ["A 1793 sermon warns about 'the hungry dead beneath the falls'", "A newspaper from 1871: seven mill workers missing in one October", "A town map with tunnels marked, and later erased", "A professor's marginal notes: 'They trade. The living for the learning.'", "Nothing useful, and the librarian watched you the whole time", "A page has been razored out of the book", "A list of donors to the church. One name appears every year since 1820", "A diary entry: 'The bell keeps them below. Never let it go silent.'"]),
    t("1920s headline", `${f} · Period`, ["DRY AGENTS RAID WATERFRONT; 40 CASES SEIZED", "FLAPPER MARATHON DANCE ENTERS SIXTH DAY", "MILL HAND MISSING, THIRD THIS YEAR", "STRANGE LIGHTS OVER THE QUARRY, FARMERS SAY", "PROFESSOR RETURNS FROM ANTARCTIC SURVEY, WILL NOT SPEAK TO PRESS", "STOCK PRICES REACH NEW HEIGHTS", "GRAVE ROBBERS STRIKE PAUPERS' FIELD AGAIN", "RADIO STATION HEARS 'UNEXPLAINED SIGNAL'", "SHERIFF CALLS DISAPPEARANCES 'RUNAWAYS'", "FISHING FLEET RETURNS EARLY; CREWS SILENT"]),
    t("Temporary insanity", `${f} · Sanity`, ["Flees in blind panic, and comes to somewhere else, an hour later", "Freezes, staring, unable to act until someone shakes them", "Laughs, and can't stop", "Lashes out at the nearest person, sure they're one of them", "Babbles the thing they saw, over and over", "Forgets the last hour entirely", "Becomes certain one of their friends is an impostor", "Starts to pray, in a language they don't know", "Faints dead away", "Calmly does something terrible to make it stop"]),
    t("Phobia", `${f} · Sanity`, ["Fear of the dark (nyctophobia)", "Fear of deep water (thalassophobia)", "Fear of being buried alive (taphophobia)", "Fear of enclosed spaces (claustrophobia)", "Fear of corpses (necrophobia)", "Fear of insects (entomophobia)", "Fear of being touched (haphephobia)", "Fear of bells (campanophobia)", "Fear of dogs (cynophobia)", "Fear of blood (hemophobia)", "Fear of mirrors (catoptrophobia)", "Fear of crowds (ochlophobia)"]),
    t("Mania", `${f} · Sanity`, ["Must wash their hands, again and again", "Keeps every scrap of paper, in case it matters", "Counts everything twice", "Can't sleep without a light on and a weapon in reach", "Writes down everything anyone says", "Collects keys, any keys", "Has to know where every exit is, always", "Draws the symbol, everywhere, without noticing"]),
    t("Mythos tome", `${f} · Mythos`, ["A crumbling copy of the Necronomicon, in a bad Latin translation", "A fragment of the Pnakotic Manuscripts, copied by a monk who went mad", "A minister's journal: 'Of the Hungry Dead'", "A ship's log from a whaler that found an island that isn't there", "A professor's unpublished monograph on burial customs that shouldn't exist", "A scrapbook of disappearances going back two hundred years", "A child's notebook full of rhymes that summon something", "A ledger of 'trades' with names, dates and what was given"]),
    t("A cultist's pockets", `${f} · Loot`, ["A pocketknife and a wax candle stub", "A key to the mill's back gate", "A folded hymn with the words changed", "{2d6} dollars and a train ticket", "A photograph of an investigator", "A ring with the Brotherhood's sign inside the band", "A list of names, some crossed out", "A vial of something thick and dark"]),
    t("Townsperson", `${f} · Social`, ["A widow who wants to talk about her husband, endlessly", "A mill foreman who is too polite", "A child who knows more than she says", "A drunk who saw something at the falls", "A shopkeeper who won't sell to strangers", "A deputy who wants a bribe", "A priest who looks like he hasn't slept", "A reporter from Boston, also asking questions"]),
    t("New England weather", `${f} · Period`, [[3, "Cold drizzle, all day"], [2, "Fog off the river by dusk, thick enough to lose a hand in"], [2, "Bright, cold, wind in the dead leaves"], [1, "A nor'easter: roads flood, lines come down"], [1, "First frost, the falls steaming"], [1, "Thunder with no rain, all night"]]),
    t("Investigation complication", `${f} · Plot`, ["The police take an interest in the investigators", "The hotel says their rooms are needed", "A witness recants", "Their car won't start", "An investigator receives a threatening note", "The newspaper prints their names", "The client stops answering the door", "Evidence goes missing from their room"]),
    t("Omen", `${f} · Horror`, ["Dead birds on the doorstep", "A face at the window, three floors up", "Milk sours as you watch", "A song from childhood, hummed by someone unseen", "The hotel's guest book has your signature, dated tomorrow", "Earth on the bedsheets in the morning"]),
  ];
}

// ---------- the adventure ----------
export const adventure = { title: "The Silence at Ashby Falls", blurb: "1925, a Massachusetts mill town. A reporter is missing, the church bell won't ring, and the night shift keeps getting smaller. Three sessions for 2 to 4 investigators." };

export function campaign({ blank, uid, lib, sys, toCreature }) {
  const c = blank("The Silence at Ashby Falls");
  c.tagline = "Call of Cthulhu · 1925 · a ready-to-play investigation";
  c.stash = { money: 115, unit: "dollars", items: [], log: [] };
  const now = Date.now();
  const note = (title, cat, tags, body, extra = {}) => ({ id: uid(), title, cat, tags, body, updated: now, ...extra });

  // investigators. HP = (CON + SIZ) / 10, Sanity = POW, Magic Points = POW / 5
  const inv = (character, role, color, ch, skills, text) => {
    const hp = Math.floor((ch.CON + ch.SIZ) / 10), mp = Math.floor(ch.POW / 5);
    return { id: uid(), player: "", character, role, color, stats: skills, res: { HP: { cur: hp, max: hp }, Sanity: { cur: ch.POW, max: 99 }, "Magic Points": { cur: mp, max: mp }, Luck: { cur: skills.Luck, max: 99 } }, conds: [],
      text: { Characteristics: Object.entries(ch).map(([k, v]) => `${k} ${v}`).join("  ·  "), ...text } };
  };
  const sk = (a) => Object.fromEntries(["Spot Hidden", "Listen", "Library Use", "Psychology", "Persuade", "Stealth", "Dodge", "Fighting", "Firearms", "First Aid", "Occult", "Luck"].map((k, i) => [k, a[i]]));
  c.party = [
    inv("Prof. Harold Whitcombe", "Antiquarian, Halloway College", "#a98fb6", { STR: 45, CON: 55, SIZ: 60, DEX: 50, APP: 55, INT: 80, POW: 65, EDU: 85 }, sk([45, 40, 75, 35, 40, 20, 25, 25, 20, 30, 45, 50]),
      { Backstory: "Taught Thaddeus Pell for two years and liked him. Collects colonial sermons. Has never fired a gun in anger.", Gear: "Reading glasses, notebook, a pocket Latin dictionary, $40", Notes: "Other skills: History 70, Language (Latin) 60, Archaeology 40, Credit Rating 50" }),
    inv("Rosa Delgado", "Private investigator, Boston", "#cf8577", { STR: 60, CON: 65, SIZ: 55, DEX: 70, APP: 60, INT: 70, POW: 55, EDU: 60 }, sk([65, 50, 40, 45, 40, 50, 45, 55, 60, 30, 10, 60]),
      { Backstory: "Ex-Pinkerton. Dr. Pell's letter came with a $50 retainer, which is why she's here. She doesn't believe in ghosts.", Gear: ".38 revolver (1d10, 6 shots), flashlight, lock picks, camera, $25", Notes: "Other skills: Locksmith 50, Law 30, Drive Auto 40" }),
    inv("Agnes Kowalski", "Nurse, Ashby Falls Infirmary", "#8daebe", { STR: 50, CON: 70, SIZ: 50, DEX: 60, APP: 50, INT: 75, POW: 70, EDU: 70 }, sk([50, 45, 35, 55, 40, 25, 30, 25, 20, 70, 15, 45]),
      { Backstory: "Works for Dr. Margaret Pell. Grew up in Ashby Falls. Her cousin Jozef worked the night shift at the mill, and stopped coming to Sunday dinner in August.", Gear: "Medical bag, rosary, a key to the infirmary, $10", Notes: "Other skills: Medicine 50, Language (Polish) 70, Natural World 30" }),
    inv("Frank Callahan", "Reporter, Boston Evening Courier", "#d4a54a", { STR: 55, CON: 60, SIZ: 65, DEX: 55, APP: 65, INT: 70, POW: 50, EDU: 70 }, sk([55, 45, 60, 45, 60, 35, 27, 40, 25, 30, 20, 75]),
      { Backstory: "Thaddeus Pell sent him a telegram two weeks ago: BIG STORY. MILL. BRING CAMERA. That was the last anyone heard. Frank owes Thaddeus a favor and a story.", Gear: "Press camera, notebook, a hip flask, Thaddeus's telegram, $30", Notes: "Other skills: Fast Talk 50, Art (Photography) 45, Drive Auto 30" }),
  ];

  const fromLib = n => { const r = lib?.creatures.find(x => x[0] === n); return r ? toCreature(sys, r) : null; };
  const own = (name, kind, threat, vals, abil, notes) => toCreature(sys, [name, kind, threat, vals, abil, notes]);
  const cultist = fromLib("Cultist"), ghoul = fromLib("Ghoul");
  const crane = own("Josiah Crane", "Human, mill owner, cult leader", 2, ["12", "0", "8", "50", "60", "85", "0/0"], [["Revolver", "1d100<=45", "Firearms (handgun).", "1d10"], ["Dread Whisper", "", "Costs 5 MP and 1d6 Sanity: one sentence into a mind a mile away. He uses it to frighten witnesses."], ["The Calling Under the Stone", "", "Rite. Costs 8 MP. The ghouls of the Undercroft come when he calls, within 1d6 minutes."]], "Calm, generous, a pillar of the town. He believes the trade keeps Ashby Falls alive. He will offer the investigators a place in it.");
  const thug = own("Mill Foreman", "Human, Quiet Brotherhood", 1, ["13", "0", "8", "70", "65", "40", "0/0"], [["Fists", "1d100<=55", "Fighting (brawl).", "1d3+1d4"], ["Cosh", "1d100<=50", "Fighting.", "1d6+1d4"]], "Big, quiet, loyal to Crane because Crane pays and the alternative is worse.");
  const thad = own("Thaddeus Pell, changing", "Human becoming ghoul", 2, ["13", "2", "9", "75", "70", "50", "0/1d4"], [["Claws", "1d100<=45", "Fighting.", "1d6+1d4"], ["Plead", "", "Still Thaddeus, mostly. He begs them to leave, or to kill him. His sister's name can reach him (Persuade)."]], "Two weeks below. Hungry. Ashamed. Still has his camera.");
  c.bestiary = [cultist, thug, crane, ghoul, thad].filter(Boolean);
  for (const b of c.bestiary) b.tags = `${b.tags || "Call of Cthulhu"}, ashby falls`;

  const N = {
    town: note("Ashby Falls", "Locations", "town, 1925", "# Ashby Falls, Massachusetts\nA mill town of 3,000 on the Quill River, two hours by train from Boston. The **falls** roar under every conversation.\n\n- [[Crane Textile Mill]] employs half the town\n- **St. Brendan's**: [[Father Michael Doyle]]. The bell hasn't rung since 1923\n- **The Ashby Falls Gazette**: [[Thaddeus Pell]]'s desk, ransacked\n- **Kerrigan Memorial Library**: [[Ida Kerrigan]], and a locked room\n- **The Pell house** on Elm Street: [[Dr. Margaret Pell]]\n- **The Falls Hotel**: clean, cheap, and the desk clerk reports to Crane", { pinned: true }),
    mill: note("Crane Textile Mill", "Locations", "mill, act 2", "A brick mill on the river, three floors of looms. Runs all night: the **night shift** is 40 men, fewer each month.\n\n- The basement has a door marked BOILER that isn't one. It opens on stairs cut into rock, down to [[The Undercroft]].\n- Foremen wear a small silver pin: a closed mouth. The sign of [[The Quiet Brotherhood]].\n- Night watchman: old Silas Abbott. Drinks. Saw something. Won't say."),
    under: note("The Undercroft", "Locations", "tunnels, act 3", "# The Undercroft\nTunnels behind and below the falls, older than the town. The roar of the water hides any sound.\n\n- **The Trading Room:** a cave with a stone table. The Brotherhood leaves the dead (and lately, the living) here. The ghouls leave books, coins, and knowledge.\n- **The Warrens:** ghoul tunnels going down, and down.\n- **The Bell Chamber:** the missing clapper of St. Brendan's bell, hung on a chain. The ghouls took it. Its ringing kept them below."),
    margaret: note("Dr. Margaret Pell", "NPCs", "client, ally", "Town doctor, forty, widowed in the war, practical. Wrote to the investigators.\n\n**Wants:** her brother [[Thaddeus Pell]] found.\n**Knows:** Thaddeus was writing about the mill. She signs the death certificates in town, and she's noticed the mill's accidents never have bodies.\n**Secret:** Crane paid off her mortgage last year. She didn't ask why."),
    thad: note("Thaddeus Pell", "NPCs", "missing, act 3", "Reporter for the Gazette, 28, curious, reckless. Went into the mill's basement two weeks ago with his camera.\n\n**Now:** alive, below, in [[The Undercroft]]. The ghouls fed him. He is changing into one of them.\n**His notebook** is hidden in the Gazette's darkroom, behind the fixer bottles."),
    crane: note("Josiah Crane", "NPCs", "villain, mill owner", "Owner of [[Crane Textile Mill]], sixty, generous, a deacon at St. Brendan's. Paid to 'repair' the church bell in 1923.\n\n**Believes:** the town survives because of the trade. His grandfather began it. The mill never fails. Nobody starves.\n**Wants:** the investigators gone, bought, or joined.\n**Leads:** [[The Quiet Brotherhood]]."),
    doyle: note("Father Michael Doyle", "NPCs", "priest, ally", "Parish priest of St. Brendan's. Young, tired, frightened. He knows the bell is silent because the clapper is gone, and that Crane's 'repair' took it away. He's found a 1793 sermon in the parish records about 'the hungry dead below the falls'."),
    ida: note("Ida Kerrigan", "NPCs", "librarian, ally", "Librarian, sixty, sharp, nosy. Keeps the library's locked room, where the town's oldest records are. The key went missing in August; she knows who borrowed the room last (Thaddeus Pell)."),
    burke: note("Sheriff Amos Burke", "NPCs", "obstacle", "County sheriff. Calls the disappearances 'runaways'. Paid by Crane, and afraid enough of what he's seen to keep taking the money."),
    lucia: note("Lucia Benedetti", "NPCs", "witness", "Weaver on the day shift. Her husband Angelo went on the night shift in September and didn't come home. She saw foremen carry a long canvas bundle into the boiler room."),
    brother: note("The Quiet Brotherhood", "Factions", "cult, mill", "Crane's society: the foremen, the hotel clerk, a deacon, the sheriff's deputy. A silver pin, a closed mouth. They meet on the new moon in the mill basement.\n\nThey trade with the ghouls of [[The Undercroft]]: the dead from the paupers' field, and the living when the dead run short. In return: old books, old gold, and the mill's luck."),
    ghouls: note("The ghouls of the Undercroft", "Lore", "mythos", "Rubbery, dog-faced, hunched things that feed on the dead. Once human, some of them. They speak, and they bargain.\n\nThe church bell's ringing kept them below for a century. Since the clapper was taken, they come up further each month.\n\n**Sanity:** seeing one, 0/1d6."),
    sermon: note("The 1793 sermon", "Lore", "clue", "From the parish records of St. Brendan's, in Rev. Josiah Crane the Elder's hand:\n\n> *Let the bell be rung at every dusk, that the hungry ones beneath the falls be minded of the Lord, and keep below. And let no man trade with them, for they pay in learning, and learning is the dearest coin of all.*"),
    frag: note("The Pnakotic fragment", "Items", "tome, mythos", "Twelve pages of a copy of the Pnakotic Manuscripts, given to Crane's grandfather by the ghouls. In Crane's study safe.\n\n**Reading:** a week; 1d6 Sanity. Teaches *The Calling Under the Stone* and gives a terrible understanding of what ghouls were."),
    q1: note("Find Thaddeus Pell", "Quests", "act 1-3", "Missing two weeks. Last seen going into the mill at night with his camera. [[Dr. Margaret Pell]] pays expenses."),
    q2: note("Why won't the bell ring?", "Quests", "act 2", "St. Brendan's bell moves but makes no sound. [[Father Michael Doyle]] wants to know why."),
  };
  c.notes = [...Object.values(N), ...(lib?.spells || []).map(r => ({ id: uid(), title: r[0], cat: "Spells", tags: `Call of Cthulhu, ${r[1]}`, body: r[2], updated: now, lib: sys.id }))];

  const b = c.boards[0], card = (type, x, y, w, color, title, text, extra = {}) => ({ id: uid(), type, x, y, w, color, rot: (Math.random() * 4 - 2).toFixed(2), title, text, z: 1, ...extra });
  const h1 = card("heading", 40, 30, 360, "paper", "Where is Thaddeus Pell?", "");
  const r1 = card("ref", 60, 150, 230, "sky", "", "", { ref: N.thad.id }), r2 = card("ref", 380, 150, 230, "rose", "", "", { ref: N.crane.id }), r3 = card("ref", 700, 150, 230, "lichen", "", "", { ref: N.mill.id });
  const n1 = card("note", 200, 410, 230, "mustard", "", "Telegram to Frank: BIG STORY. MILL. BRING CAMERA.");
  const n2 = card("note", 540, 420, 230, "paper", "", "The bell stopped ringing in 1923. Crane paid for the 'repair'.");
  b.cards = [h1, r1, r2, r3, n1, n2];
  b.links = [{ id: uid(), a: r1.id, b: r3.id, color: "red" }, { id: uid(), a: r2.id, b: n2.id, color: "red" }, { id: uid(), a: n1.id, b: r1.id, color: "black" }];
  b.view = { x: 40, y: 30, z: .9 };

  c.clocks = [
    { id: uid(), name: "The Brotherhood notices", segs: 6, filled: 0, color: "#cf8577", note: "Tick when the investigators ask the wrong person or are seen near the mill. 3: they're followed. 6: Crane sends the foremen.", onStream: false },
    { id: uid(), name: "Thaddeus changes", segs: 4, filled: 2, color: "#9bb08a", note: "Tick each day he isn't found. Full: he is a ghoul, and doesn't want to be saved.", onStream: false },
  ];
  c.rep = [{ id: uid(), note: N.brother.id, v: 0 }, { id: uid(), name: "The town of Ashby Falls", v: 0 }];
  c.calendar = { months: [["January", 31], ["February", 28], ["March", 31], ["April", 30], ["May", 31], ["June", 30], ["July", 31], ["August", 31], ["September", 30], ["October", 31], ["November", 30], ["December", 31]].map(([name, days]) => ({ name, days })), weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], year: 1925, month: 9, day: 14, era: "", events: [{ id: uid(), month: 9, day: 17, title: "New moon: the Brotherhood meets" }] };

  c.handouts = [
    { id: uid(), title: "Dr. Pell's letter", type: "text", style: "letter", text: "Ashby Falls, October 9th, 1925\n\nI am told you are discreet. My brother Thaddeus, a reporter for our Gazette, has been missing since the 30th of September. The sheriff calls it a young man's whim. It is not. He was afraid, the last time I saw him, and Thaddeus is never afraid.\n\nI enclose a retainer. Come on the Tuesday train. Tell no one in town why you are here.\n\nMargaret Pell, M.D." },
    { id: uid(), title: "Gazette clipping", type: "text", style: "parchment", text: "MILL HAND MISSING, THIRD THIS YEAR\n\nAngelo Benedetti, 34, of Water Street, failed to return from the night shift at Crane Textile on Sept. 19th. Sheriff Burke believes Benedetti left for work in Providence. Mr. Josiah Crane has offered his family a month's wages." },
    { id: uid(), title: "Page from Thaddeus's notebook", type: "text", style: "card", text: "Sept 29. Silas says they carry them down at 2. Not the dead. Not only.\nThe pin = a closed mouth. 'Quiet.'\nBell clapper GONE. Crane '23.\nTONIGHT. Boiler room. Bring flash." },
  ];

  const t = s => ({ id: uid(), text: s, done: false });
  c.sessions = [{
    id: uid(), num: 1, title: "The Tuesday Train", date: "", ingame: "Tuesday, October 13th, 1925", hours: 1, moods: ["Mystery", "Roleplay"], ambience: "Rain on the train windows, the roar of the falls", example: true,
    beats: [
      { id: uid(), type: "travel", text: "The investigators arrive in [[Ashby Falls]] on the Tuesday train. [[Dr. Margaret Pell]] meets them in the rain.", star: false },
      { id: uid(), type: "discovery", text: "Thaddeus's desk at the Gazette has been ransacked. His camera is gone, his darkroom untouched.", star: true },
      { id: uid(), type: "social", text: "[[Josiah Crane]] stops by the hotel to welcome them to town, and pays for their dinner.", star: false },
    ],
    quotes: [{ id: uid(), who: "Josiah Crane", line: "Ashby Falls looks after its own. I'm sure it will look after you." }],
    cliff: "At two in the morning, the mill's night whistle blows. From the hotel window, Agnes sees foremen carrying a long canvas bundle along the river.",
    recap: "The investigators came to Ashby Falls on the Tuesday train to find Thaddeus Pell, a reporter missing for two weeks. His desk was ransacked. The mill's owner, Josiah Crane, made them welcome, perhaps too welcome. And at two in the morning, the night whistle blew, and men carried something heavy along the river.",
    attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [{ id: uid(), text: "What's in the Gazette's darkroom?", done: false }, { id: uid(), text: "What were the foremen carrying?", done: false }],
    scars: [], worked: "", change: "", rating: 0, prep: [], created: now,
  }, {
    id: uid(), num: 2, title: "The Night Shift", status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + 1,
    plan: {
      start: "Morning. A dead dog on the hotel steps, its throat torn out by something with blunt teeth. The desk clerk is already mopping. 'Raccoons,' he says.",
      scenes: [t("The Gazette darkroom: Thaddeus's notebook behind the fixer bottles (Spot Hidden)"), t("The library's locked room with Ida Kerrigan: the 1793 sermon, the 1871 disappearances (Library Use)"), t("Father Doyle and the silent bell: climb the tower, find the clapper gone"), t("Lucia Benedetti and the canvas bundle"), t("Silas Abbott, the night watchman, drunk and terrified (Psychology, Persuade)"), t("Into the mill at night: the boiler-room door, the stairs cut into rock")],
      secrets: [t("The Quiet Brotherhood's pin is a closed mouth"), t("Crane's 'repair' in 1923 removed the bell's clapper"), t("The ghouls stole the clapper: its ringing kept them below"), t("Thaddeus is alive, below, and changing"), t("Dr. Pell's mortgage was paid by Crane")],
      cast: [N.margaret.id, N.ida.id, N.doyle.id, N.lucia.id, N.crane.id], encounters: [], treasure: [t("Thaddeus's notebook (handout)"), t("A silver Brotherhood pin from Silas")], handouts: [],
    },
  }, {
    id: uid(), num: 3, title: "Beneath the Falls", status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + 2,
    plan: {
      start: "The stairs go down further than the mill is tall. The roar of the falls swallows every sound, even your own breathing. Then a flashlight catches a face that isn't quite a face.",
      scenes: [t("The Trading Room: the stone table, a fresh bundle, coins two hundred years old"), t("Ghouls: bargain, flee, or fight (Sanity 0/1d6)"), t("Thaddeus in the Warrens: save him, or grant his wish"), t("The Bell Chamber: take the clapper back"), t("Crane and the Brotherhood come down for the new moon"), t("Ring the bell at dusk, or bring the tunnel down")],
      secrets: [t("Crane will offer to let them leave, rich, if they say nothing"), t("Thaddeus's camera holds photographs of every Brotherhood member"), t("Ringing the bell with its clapper drives the ghouls below for good, for a while"), t("The ghouls bargain honestly: they'll trade Thaddeus for Crane")],
      cast: [N.crane.id, N.thad.id, N.ghouls.id], encounters: [], treasure: [t("The Pnakotic fragment in Crane's safe"), t("Thaddeus's camera and its photographs"), t("Old coins from the Trading Room: $200, if they dare spend them")], handouts: [],
    },
  }];
  c.sessions[1].recap = c.sessions[0].recap; // the read-aloud opener for the first session they run
  const by = n => c.bestiary.find(x => x.name === n)?.id;
  c.sessions[1].plan.encounters = [{ id: uid(), creature: by("Mill Foreman"), count: 2, hp: [13, 13] }].filter(e => e.creature);
  c.sessions[2].plan.encounters = [{ id: uid(), creature: by("Ghoul"), count: 3, hp: [13, 13, 13] }, { id: uid(), creature: by("Cultist"), count: 3, hp: [11, 11, 11] }, { id: uid(), creature: by("Josiah Crane"), count: 1, hp: [12] }, { id: uid(), creature: by("Thaddeus Pell, changing"), count: 1, hp: [13] }].filter(e => e.creature);
  return c;
}
