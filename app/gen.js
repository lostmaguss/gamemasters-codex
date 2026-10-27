// Random tables and generators for NPCs, places, missions and items. System-neutral.
import { pick, wpick, cap, rnd } from "./util.js";

// ---------- NAMES ----------
export const NAMES = {
  human:{label:"Human",
    pre:["Al","Bran","Cor","Ed","Gar","Hal","Is","Jor","Kel","Lor","Mar","Ned","Os","Per","Ro","Sam","Tor","Wil","Ber","Ced","Dun","El","Fen","Gil","Hen","Ivo","Mae","Ros","Tam","Ver"],
    f:["a","ia","wyn","eth","elle","ine","ora","issa","ra","anne","ey","da"], m:["ric","an","dor","mund","ton","win","ald","ard","us","en","ek","o"], n:["el","yn","ry","is","e","ley"],
    s1:["Ash","Black","Brook","Copper","Dun","Fair","Gold","Hal","Mill","Red","Stone","Thorn","Wolf","Marsh","Hollow","Crane","Har","Wex"], s2:["wood","ford","well","ridge","smith","hand","water","field","more","wick","ley","brook","cott","by"]},
  elf:{label:"Elf",
    pre:["Ae","Cael","El","Fae","Gal","Ith","Lae","Mel","Nae","Syl","Tha","Va","Ary","Ili","Rua","Eri","Lue","Oro"], mid:["la","ra","the","ri","na","va","li","sa","","",""],
    f:["iel","wen","ith","ys","ara","eth","ie","anna"], m:["ion","as","or","ir","ael","en","anor","un"], n:["ae","yr","is","el","ien"],
    s1:["Moon","Star","Silver","Dawn","Leaf","Mist","Wind","Sun","Night","Amber","Frost","Willow"], s2:["whisper","song","bough","shade","gleam","brook","thread","bloom","veil","fall"]},
  dwarf:{label:"Dwarf",
    pre:["Bal","Bor","Dor","Dur","Grim","Kaz","Thor","Brun","Har","Mor","Rur","Thra","Vond","Ul","Gund","Hel","Ost","Bek"],
    f:["dis","ra","hild","wynn","a","ga","ella","run","li"], m:["in","ek","ar","grim","dain","rik","uk","or","ur","li"], n:["ri","an","ok","ett"],
    s1:["Iron","Stone","Anvil","Deep","Copper","Granite","Flint","Ember","Battle","Coal","Gold","Rune"], s2:["beard","fist","hammer","delve","forge","shield","brow","mantle","heart","braid"]},
  halfling:{label:"Halfling",
    pre:["Pip","Ros","Mer","Bel","Cor","Fen","Mil","Tob","Wil","Lil","Per","Daf","Bram","Nel","Sam","Tam","Odo","Mar"],
    f:["pa","ie","ly","la","ella","ina","sy","y","igold"], m:["o","in","ry","wick","bo","ble","on","ert","adoc"], n:["kin","y","el","ie"],
    s1:["Tea","Under","Good","Green","Thistle","Brandy","Honey","Apple","Hill","Bramble","Took","Burrow"], s2:["leaf","bough","barrel","foot","bottom","hill","dew","wick","bank","topple"]},
  gnome:{label:"Gnome",
    pre:["Bim","Fizz","Nim","Tink","Zook","Wren","Pell","Orri","Quil","Bod","Dimm","Jeb","Sprock","Lop","Kip","Fen"],
    f:["ella","sy","bina","ka","ie","ni"], m:["ble","wick","nik","ix","zo","dle","bin","o"], n:["pip","sy","ka","bit"],
    s1:["Cog","Gear","Spark","Fuse","Tinker","Whistle","Brass","Glitter","Copper","Bolt"], s2:["spinner","wobble","sprocket","top","nozzle","whirr","fuddle","bottle","nock"]},
  orc:{label:"Orc",
    pre:["Gro","Ur","Mag","Dra","Ka","Sho","Gor","Ruk","Zar","Tug","Brak","Ug","Vol","Nar","Shak","Ghor","Yaz","Khol"],
    f:["a","ka","ra","za","sha","gha","ush"], m:["ash","ug","ak","gul","nak","oth","mok","ruk","dar"], n:["ga","ok","ush","ek"],
    clan:["Bloodfang","Ashjaw","Blackmaw","Ironhide","Stormtusk","Bonegnaw","Redscar","Grimtooth","Skullhewer","Mudbelly"]},
  infernal:{label:"Infernal",
    pre:["Az","Bel","Kri","Mal","Ner","Zer","Vex","Ira","Ory","Sar","Lev","Mor","Xa","Nym"],
    f:["iel","eth","ira","ys","ia","ess"], m:["ax","os","ion","ekh","on","uth"], n:["is","ai","ex","yr"],
    virtue:["Hope","Despair","Ash","Silence","Penance","Ruin","Reverie","Mercy","Sorrow","Vigil","Ember","Last-Light"]},
};
const GENDERS = {f:"Feminine", m:"Masculine", n:"Neutral"};
export function makeName(anc, g){
  const t = NAMES[anc]; g = g || pick(["f","m","n"]);
  let first = pick(t.pre) + (t.mid ? pick(t.mid) : "") + pick(t[g]);
  first = cap(first.toLowerCase());
  let last;
  if (t.clan) last = "of the " + pick(t.clan) + " clan";
  else if (t.virtue) return first + " " + (rnd(2) ? "called " + pick(t.virtue) : "");
  else last = cap((pick(t.s1) + pick(t.s2)).toLowerCase());
  return (first + " " + last).trim();
}

// ---------- TABLES ----------
export const T = {
  occupation:["blacksmith","innkeeper","smuggler","priest of a minor god","caravan guard","herbalist","cartographer","retired soldier","fence","noble's steward","ratcatcher","bard","tax collector","ferryman","gravedigger","alchemist's apprentice","bounty hunter","fortune teller","shipwright","beekeeper","city watch sergeant","pickpocket","scribe","hedge witch","mercenary captain","horse trader","exiled knight","wandering monk","dockworker","jeweler","tanner","street preacher","courier","tavern cook","falconer","miner","astrologer","debt collector","chandler","physician"],
  age:["young","young","adult","adult","adult","middle-aged","middle-aged","old","very old"],
  look:["burn scar across one cheek","immaculate clothes, always one size too large","missing two fingers on the left hand","braided beard threaded with copper rings","eyes of different colors","towering and stooped, as if apologizing for it","ink-stained fingers","smells strongly of cloves","a nose broken more than once","wears a holy symbol of a dead god","freckles and a gap-toothed grin","an eyepatch embroidered with a rose","shaved head covered in tattoos","limps, carries a carved cane","fingernails painted black","jewelry made of teeth","sunburned and wind-cracked","perfectly still hands","a hood they never lower","bright red coat, patched at the elbows","rings on every finger","faint glowing veins on the wrists","soot-smudged face","a pet rat on the shoulder"],
  manner:["friendly but nosy","suspicious of everyone","overly formal","nervous, talks too fast","blunt to the point of rudeness","flirtatious","bored and sarcastic","pious, quotes scripture","boastful","melancholy","cheerful in a forced way","calculating","paranoid","generous to a fault","quietly furious","absent-minded","proud and touchy","tired, has seen too much","greedy but honest","dramatic"],
  voice:["speaks slowly, weighing every word","laughs at their own jokes","whispers, as if someone is listening","uses the party's names constantly","answers questions with questions","heavy rural accent","clipped military speech","hums between sentences","calls everyone 'friend'","repeats the last word you said","overly long words, often wrong","drops into song when nervous","talks about themself in the third person","sniffs before every sentence"],
  quirk:["collects buttons","always eating something","counts things compulsively","refuses to say a certain name","talks to a dead spouse","terrified of birds","bets on everything","keeps a tiny journal of insults","never sits with their back to a door","cannot read but pretends to","sleeps only during the day","keeps a lock of hair from every lover","writes bad poetry","constantly cleaning a blade","believes they are cursed"],
  want:["to pay off a crushing debt","revenge on a former partner","to find a missing child","to leave this town forever","respect from their family","a cure for a slow illness","to be left alone","to win back a lost love","to rise in the guild","a forbidden book","proof their god is real","to hide what they did last winter","enough coin to buy a ship","to protect their neighborhood","to see the sea before they die"],
  secret:["is a spy for a rival power","killed someone and buried them under the floor","is secretly nobility in hiding","owes money to a crime lord","is being blackmailed","worships a forbidden power","is not who they claim to be","knows where a treasure is hidden","is slowly turning into something else","sold out the last group of adventurers","has a twin nobody knows about","is an informant for the watch","stole their current identity","can hear the dead","is planning to flee tonight"],
  // places
  tavA:["Gilded","Drunken","Rusty","Laughing","Crooked","Sleeping","Prancing","Broken","Silver","Wandering","Salty","Howling","One-Eyed","Velvet","Last","Copper"],
  tavN:["Goose","Flagon","Griffin","Anchor","Lantern","Boar","Kettle","Wyvern","Stag","Barrel","Crown","Mermaid","Owl","Tankard","Hound","Candle"],
  tavR:["Rest","Hearth","Respite","Cellar","Taproom","Welcome"],
  setA:["Ash","Black","Bright","Cold","Elder","Grey","High","Iron","Mill","Oak","Raven","Salt","Stone","Thorn","Wolf","Frost","Amber","Mire","Hollow","Wren"],
  setB:["ford","haven","hollow","moor","wick","gate","mere","fall","reach","stead","crossing","vale","watch","burg","march","holm"],
  setSize:["hamlet of a few dozen souls","fishing village","walled market town","sprawling river city","mining camp","fortified border town","pilgrim town around a shrine","half-abandoned village"],
  dunA:["Sunken","Forgotten","Shattered","Weeping","Hollow","Black","Drowned","Ember","Silent","Bleeding","Gnawed","Pale"],
  dunN:["Crypt","Vault","Halls","Labyrinth","Tower","Catacombs","Temple","Mine","Spire","Barrow","Cistern","Keep"],
  dunO:["the Ash King","Whispers","the Pale Moon","Iron Teeth","the Hundred Doors","Lost Saints","the Serpent","Endless Night","the Glass Witch","Rot","the First Flame"],
  shopKind:["alchemist","blacksmith","curio dealer","bookseller","tailor","fletcher","herbalist","map-maker","pawnbroker","enchanter","apothecary","armorer"],
  shopN:["Wares","Curiosities","Emporium","Workshop","Remedies","Goods","Sundries","Supplies"],
  lmA:["Whispering","Hanged Man's","Crow's","Giant's","Witch's","Broken","Bleak","Moonlit","Weeping","Drowned","Singing","Red"],
  lmN:["Falls","Hill","Oak","Pass","Fen","Stones","Gorge","Marsh","Lake","Woods","Cairn","Bridge"],
  tmpK:["Shrine","Temple","Chapel","Sanctum","Abbey","Grotto"],
  tmpA:["Silent","Burning","Veiled","Drowned","Golden","Hungering","Twin","Starlit","Weeping","Iron"],
  tmpN:["Mother","Flame","Watcher","Tide","Lantern","Wolf","Harvest","Moon","Gate","Shepherd"],
  impression:["Warm light and too many people for the space","Quiet. Too quiet for this time of day","Everything is slightly damp","It looks recently, hastily repaired","Rich once, now fraying at every edge","Smoke hangs low and blue","Every surface is covered in carved names","Cold, despite the season","Brightly painted, aggressively cheerful","Overgrown, nature taking it back","Crowded with stalls and shouting","A strange hush falls as you enter"],
  sense:["dripping water and distant chanting","woodsmoke and roasting meat","wet stone and old incense","a fiddle playing the same tune over and over","rot, faintly sweet","fresh bread and horse dung","salt wind and creaking timber","bells, always slightly out of tune","dogs barking somewhere below","pipe smoke and spilled ale","ozone, like before a storm","lavender burned to cover something worse"],
  present:["a pair of off-duty guards losing at cards","a soaked messenger looking for someone by name","a noble slumming in disguise","pilgrims bound for a shrine","a rival adventuring party","a sleeping drunk with an expensive sword","a child selling 'treasure maps'","a merchant with an armed escort","a hooded figure who leaves when you arrive","a bard working on a song about the party","a priest collecting for the poor","nobody, and the door was unlocked"],
  rumor:["The old mine reopened, but the miners don't come home","A dragon was seen over the hills, or a very large bird","The baron's heir is an impostor","Someone is paying gold for black cats","The river ran red for an hour last week","A ghost ship docks on moonless nights","The local priest hasn't aged in forty years","Bandits on the north road are ex-soldiers who were never paid","A wizard's tower appeared overnight in the marsh","The well water lets you hear the dead"],
  hidden:["a trapdoor to a smugglers' tunnel","the owner is a retired assassin","a cursed object is bricked into the wall","a cult meets here after midnight","the floor is rigged to collapse","someone is watching through a hole in the wall","a portal sealed with rusted chains","bodies in the cellar, freshly salted","the building is alive, slowly","a stash of stolen tax money"],
  hook:["A stranger pays for the party's drinks and asks a favor","A fight breaks out, and someone is clearly the target","The party is mistaken for someone else","A notice board offers a reward with a familiar face","Someone collapses and whispers a name","A child hands the party a sealed letter"],
  feat:{
    tavern:["a stuffed owlbear head that blinks","a fighting pit in the back room","a wall of unpaid tabs going back decades","a cellar door nobody is allowed to open","a famous hero's sword above the bar","a fortune-telling machine that is sometimes right"],
    settlement:["a giant toppled statue in the square","a gallows that's never empty","a bridge guarded by a tollkeeper troll","a wall built around something old","a market that runs only at night","a bell tower that rings itself"],
    dungeon:["a staircase that loops","a flooded hall with something swimming","doors marked with the party's names","a great mechanical heart, still beating","walls covered in screaming faces","a throne room with a living king, centuries old"],
    shop:["items that rearrange themselves overnight","a caged imp that does the accounts","shelves stacked to the ceiling with jars of eyes","a back room for 'special customers'","a strict no-touching policy, enforced by a golem","a cat that seems to own the place"],
    landmark:["a ring of standing stones humming at dusk","a lone tree hung with hundreds of keys","a frozen waterfall in summer","a giant's bones half-sunk in the earth","a lake that reflects a different sky","an old battlefield where swords still stand"],
    temple:["an eternal flame that's starting to flicker","a statue that weeps real tears","confession booths with no one behind the screen","a crypt of saints that is missing one","murals that change after each visit","a reliquary holding a still-beating heart"],
  },
  // missions
  patronRole:["a desperate farmer","a guildmaster","a widowed noble","a temple elder","a fence with a grudge","the city watch captain","a dying wizard","a child with a jar of copper","a merchant prince","a rival adventurer","a masked stranger","the local crime boss","a ghost","a frightened scholar","a mercenary company","the baron's spymaster"],
  objective:[
    w=>`Retrieve ${pick(w.obj)} from ${w.place}`, w=>`Escort ${pick(w.who)} safely to ${w.place}`,
    w=>`Hunt the ${pick(w.monster)} terrorizing ${w.place}`, w=>`Investigate ${pick(w.mystery)} at ${w.place}`,
    w=>`Rescue ${pick(w.who)} held by ${pick(w.foe)}`, w=>`Deliver ${pick(w.obj)} to ${w.place} before it's too late`,
    w=>`Sabotage ${pick(w.foe)} and their plans at ${w.place}`, w=>`Defend ${w.place} from ${pick(w.foe)} for three nights`,
    w=>`Steal ${pick(w.obj)} from ${pick(w.foe)}`, w=>`Broker a truce between two feuding families at ${w.place}`,
    w=>`Find out who murdered ${pick(w.who)}`, w=>`Clear ${w.place} of ${pick(w.foe)}`],
  obj:["a sealed reliquary","the baron's signet ring","a ledger of bribes","a dragon egg","a map tattooed on a dead man's back","a stolen holy relic","a cursed crown","a crate of black powder","a captive spirit in a lantern","an unfinished spellbook","the deed to a mine","a vial of plague cure"],
  who:["the mayor's daughter","a disgraced priest","a smuggler who knows too much","an orphan with strange powers","a foreign envoy","the patron's brother","a famous bard","a goblin defector","a witness to a royal crime","a half-mad prophet"],
  monster:["wyvern","pack of ghouls","shapeshifter","river troll","giant spider brood","headless rider","swamp hag","corrupted bear","stone-eating wurm","wailing banshee"],
  mystery:["a string of disappearances","livestock found drained of blood","a sealed room with a corpse inside","songs heard from an empty church","a plague of nightmares","an ever-burning fire","missing shipments","the dead walking at dusk"],
  foe:["a bandit gang","a cult of the drowned god","a corrupt magistrate","goblin raiders","a rogue mage","slavers","a renegade knight order","a pack of werewolves","a necromancer's servants","a rival thieves' guild"],
  complication:["Another party has been hired for the same job","The patron is lying about why","The target is sympathetic","A storm cuts off the road","The authorities want it stopped","Someone in the party is recognized","Time moves strangely there","It's a trap meant for someone else","The reward is already spent by the patron","A beloved NPC is caught in the middle"],
  twist:["The patron is the real villain","The 'monster' is protecting something","The object is a fake, and the patron knows","The victim staged it all","Two of the foes are the same person","The place is a prison, not a hideout","Completing it starts a war","The patron dies before paying","It was a test from a powerful faction","The foes were once heroes"],
  deadline:["by the next full moon","before the festival ends","within three days","before the snow closes the pass","before the trial at dawn","before the ship sails","no deadline, but rivals are moving","tonight"],
  rewardT:{
    easy:["a purse of silver","free room and board for a month","a favor from the guild","a decent horse","a minor healing potion each"],
    standard:["a heavy purse of gold","a family heirloom weapon","a writ of pardon","a deed to a small property","an introduction to a powerful patron"],
    hard:["a chest of gold and gems","a magic item of their choosing","a minor noble title","the patron's undying loyalty","a map to a legendary hoard"],
    deadly:["a fortune that changes their lives","a legendary item","land and a keep","a wish, carefully worded","the gratitude of a crown"]},
  misA:["Silent","Drowned","Last","Crimson","Broken","Hollow","Ninth","Gilded","Pale","Burning","Bitter","Iron"],
  misN:["Bell","Crown","Oath","Lantern","Ledger","Heir","Seal","Harvest","Debt","Map","Hymn","Tithe"],
  // items
  base:{weapon:["longsword","dagger","warhammer","spear","shortbow","crossbow","greataxe","rapier","flail","quarterstaff","sling","scythe","glaive","handaxe"],
        armor:["chain shirt","breastplate","leather jerkin","shield","helm","gauntlets","cloak","boots","bracers","scale coat"],
        wondrous:["ring","amulet","lantern","compass","bell","hand mirror","music box","quill","coin","mask","hourglass","key","pocket watch","deck of cards","candle"],
        potion:["vial","flask","phial","draught","tincture"]},
  mat:["Bone","Obsidian","Starsteel","Bloodiron","Moonsilver","Ashwood","Glass","Coral","Dragonhorn","Cold-forged","Black Oak","Sunbronze"],
  suf:["Embers","the Tide","Hollow Stars","Whispers","Last Light","the Wolf","Mercy","Ruin","the Deep","Frost","Thorns","the Unseen","Storms","Ashes"],
  epi1:["Dusk","Grave","Storm","Oath","Ember","Night","Woe","Frost","Dawn","Grief","Thorn","Soul"],
  epi2:["reaver","bane","song","breaker","fang","keeper","bite","caller","whisper","render","ward","light"],
  potColor:["Crimson","Smoky","Iridescent","Inky","Golden","Milky","Bubbling","Glowing green","Ice-blue","Murky"],
  potKind:["Draught","Elixir","Tonic","Brew","Philter"],
  potFx:[["Stoneskin","skin hardens to stone for a short time; you can't run"],["Far Sight","see through the eyes of a nearby bird"],["Featherfall","fall slowly as a leaf until you land"],["Tongues","understand and speak any language for an hour"],["Fire Breath","exhale a gout of flame three times"],["Shadows","become nearly invisible in dim light"],["Courage","immune to fear; reckless bravado"],["Second Wind","heal grievous wounds, then sleep deeply"],["Truth","for ten minutes you cannot lie"],["Gills","breathe underwater for an hour"],["Giant Strength","strength of an ogre, clumsiness to match"],["Forgetting","erase the last day from your memory"]],
  rarity:[["Common",30],["Uncommon",30],["Rare",22],["Very rare",12],["Legendary",5],["Artifact",1]],
  value:{"Common":"a few silver to the right buyer","Uncommon":"tens of gold","Rare":"hundreds of gold","Very rare":"thousands of gold","Legendary":"a small fortune; kings would bargain","Artifact":"priceless; wars have been fought over it"},
  itLook:["etched with tiny moving runes","warm to the touch, always","wrapped in faded red silk","notched and battle-scarred","inlaid with mother-of-pearl","hums faintly at night","smells of the sea","covered in scratched tally marks","set with a cloudy gem that stares","lighter than it should be","bound in black leather and silver wire","pristine, as if never used","crude, but the craft is ancient","faintly translucent at the edges"],
  power:["glows softly when enemies are near","once per day, rewinds the last few seconds for the wielder","strikes with cold that slows the target","lets the bearer speak with beasts","sheds light only the bearer can see","returns to its owner's hand when called","shrugs off the first hit each day","can be commanded to burst into flame","whispers warnings in the bearer's sleep","lets the bearer walk on water for a minute","drinks a little blood to grant a burst of speed","marks a target; the bearer always knows where they are","silences everything within a few paces","stores one spell or ability to release later","lets the bearer see invisible things","makes the bearer impossible to track","turns aside arrows once per fight","stuns a foe with a thunderous crack","reveals lies as a sour taste","calls a spectral hound once per day"],
  quirkI:["the bearer can't stop humming","attracts cats","whispers its previous owner's name","goes dull and cold in holy places","must be fed a drop of wine each night","the bearer's shadow lags behind","grows heavier when the bearer lies","refuses to work for left-handed people","sings loudly when drawn","none that anyone has noticed. Yet."],
  history:["forged for a queen who was betrayed with it","taken from a dragon's hoard, and the dragon wants it back","the last relic of a fallen knightly order","made by a smith who sold their soul to finish it","dredged up from a drowned city","won in a card game against a devil","buried with a hero who doesn't rest easy","stolen from a temple vault decades ago","made as a wedding gift that ended in murder","nobody knows; it just keeps turning up"],
};

// ---------- GENERATORS ----------
export function placeName(type){
  switch(type){
    case "tavern": return rnd(3) ? `The ${pick(T.tavA)} ${pick(T.tavN)}` : `${makeName("human").split(" ")[0]}'s ${pick(T.tavR)}`;
    case "settlement": return pick(T.setA) + pick(T.setB);
    case "dungeon": return `The ${pick(T.dunA)} ${pick(T.dunN)} of ${pick(T.dunO)}`;
    case "shop": return rnd(2) ? `${makeName(pick(Object.keys(NAMES))).split(" ")[0]}'s ${pick(T.shopN)}` : `The ${pick(T.tavA)} ${pick(T.tavN)}`;
    case "landmark": return `${pick(T.lmA)} ${pick(T.lmN)}`;
    case "temple": return `${pick(T.tmpK)} of the ${pick(T.tmpA)} ${pick(T.tmpN)}`;
  }
}
export const PLACE_TYPES = {tavern:"Tavern",settlement:"Settlement",dungeon:"Dungeon / ruin",shop:"Shop",landmark:"Wild landmark",temple:"Temple / shrine"};
function missionPlace(){ const t = pick(["settlement","dungeon","landmark","temple","tavern"]); return placeName(t); }

export const GEN = {
  npc:{
    label:"NPC", noteCat:"NPCs",
    opts:{ancestry:{label:"Ancestry", choices:{any:"Any", ...Object.fromEntries(Object.entries(NAMES).map(([k,v])=>[k,v.label]))}},
          gender:{label:"Name style", choices:{any:"Any", ...GENDERS}}},
    init(o){ return {anc: o.ancestry === "any" ? pick(Object.keys(NAMES)) : o.ancestry, g: o.gender === "any" ? pick(["f","m","n"]) : o.gender}; },
    title:c => makeName(c.anc, c.g),
    sub:(c,f) => `${NAMES[c.anc].label} · ${cap(f.age)} ${f.occupation}`,
    fields:{occupation:["Occupation",()=>pick(T.occupation)], age:["Age",()=>pick(T.age)], look:["Look",()=>cap(pick(T.look))],
      manner:["Manner",()=>cap(pick(T.manner))], voice:["Voice",()=>cap(pick(T.voice))], quirk:["Quirk",()=>cap(pick(T.quirk))],
      want:["Wants",()=>cap(pick(T.want))], secret:["Secret",()=>cap(pick(T.secret))]},
    hidden:["occupation","age"],
  },
  place:{
    label:"Place", noteCat:"Locations",
    opts:{type:{label:"Type", choices:{any:"Any", ...PLACE_TYPES}}},
    init(o){ const type = o.type === "any" ? pick(Object.keys(PLACE_TYPES)) : o.type;
      return {type, extra: type === "settlement" ? pick(T.setSize) : type === "shop" ? pick(T.shopKind) : ""}; },
    title:c => placeName(c.type),
    sub:c => PLACE_TYPES[c.type] + (c.extra ? " · " + cap(c.extra) : ""),
    fields:{impression:["First look",()=>pick(T.impression)], feature:["Notable",c=>cap(pick(T.feat[c.type]))],
      sense:["Sounds & smells",()=>cap(pick(T.sense))], present:["Who's here",()=>cap(pick(T.present))],
      rumor:["Rumor",()=>pick(T.rumor)], hidden:["Secret",()=>cap(pick(T.hidden))], hook:["Hook",()=>pick(T.hook)]},
  },
  mission:{
    label:"Mission", noteCat:"Quests",
    opts:{diff:{label:"Danger", choices:{any:"Any",easy:"Easy",standard:"Standard",hard:"Hard",deadly:"Deadly"}}},
    init(o){ return {diff: o.diff === "any" ? pick(["easy","standard","standard","hard","deadly"]) : o.diff}; },
    title:() => `The ${pick(T.misA)} ${pick(T.misN)}`,
    sub:c => ({easy:"Easy",standard:"Standard",hard:"Hard",deadly:"Deadly"})[c.diff] + " job",
    fields:{patron:["Patron",()=>{ const anc = pick(Object.keys(NAMES)); return `${makeName(anc)}, ${pick(T.patronRole)}`; }],
      objective:["The job",()=>pick(T.objective)({...T, place: missionPlace()})],
      deadline:["Deadline",()=>cap(pick(T.deadline))], complication:["Complication",()=>pick(T.complication)],
      twist:["Twist",()=>pick(T.twist)], reward:["Reward",c=>cap(pick(T.rewardT[c.diff]))]},
  },
  item:{
    label:"Item", noteCat:"Items",
    opts:{type:{label:"Type", choices:{any:"Any",weapon:"Weapon",armor:"Armor",wondrous:"Wondrous",potion:"Potion"}}},
    init(o){ const type = o.type === "any" ? pick(["weapon","weapon","armor","wondrous","wondrous","potion"]) : o.type;
      const c = {type, base: pick(T.base[type])};
      if (type === "potion") c.fx = pick(T.potFx);
      return c; },
    title(c){
      if (c.type === "potion") return `${pick(T.potColor)} ${pick(T.potKind)} of ${c.fx[0]}`;
      const r = rnd(4);
      if (r === 0) return pick(T.epi1) + pick(T.epi2);
      if (r === 1) return `${makeName(pick(Object.keys(NAMES))).split(" ")[0]}'s ${cap(c.base)}`;
      return `${pick(T.mat)} ${cap(c.base)} of ${pick(T.suf)}`;
    },
    sub:(c,f) => `${f.rarity} ${c.type === "potion" ? "potion" : c.base}`,
    fields:{rarity:["Rarity",()=>wpick(T.rarity)], look:["Look",()=>cap(pick(T.itLook))],
      power:["Power",c=> c.type === "potion" ? cap(c.fx[1]) : cap(pick(T.power))], quirk:["Quirk",()=>cap(pick(T.quirkI))],
      history:["History",()=>cap(pick(T.history))], value:["Worth",(c,f)=>cap(T.value[f.rarity] || T.value.Common)]},
    hidden:["rarity"],
  },
};

