// Cyberpunk RED kit: Forge additions, random tables and a ready-to-play gig for a starting crew.
// Everything is original writing for this app: the city, corps, gangs and people are invented, and no text
// is taken from R. Talsorian Games' books. Role, stat and skill names are used only so the sheets fit the game.
import { pick } from "./util.js";

const T = {
  rewardT: { easy: ["500eb each", "a favor from the fixer", "free repairs at a friendly ripperdoc"], standard: ["1,000eb each", "a used cyberdeck", "a clean SIN and a new apartment"], hard: ["2,500eb each", "military cyberware, installed", "the fixer's best contact"], deadly: ["10,000eb each", "a corp's secrets to sell", "a way out of Port Halcyon"] },
  foe: ["Halvorsen Biotic security", "the Static Saints", "the Rust Choir", "a corp kill team", "a cyberpsycho on a combat drug", "a rogue AI in the old net", "dirty cops from Precinct 9", "a rival crew"],
  monster: ["cyberpsycho", "combat drone", "chromed gang enforcer", "corp kill team", "black ICE in the old net", "police heavy-response squad"],
  rumor: ["Halvorsen Biotic is testing something in the Lowmarket water", "The Static Saints took the Hollow Tower and nobody's taken it back", "A braindance editor went missing with a recording that's worth killing for", "There's a pirate radio station that still broadcasts from the old harbor crane", "Precinct 9 stopped answering calls from the Lowmarket", "A dead netrunner's ghost is still in the tower's servers"],
};
const EXTRA = {
  coin: n => `${n * 10}eb`,
  valuables: ["a cred chip with 200eb", "a used cyberoptic, still working", "a data shard labelled DON'T", "a vial of combat stims", "a corp keycard, three days expired", "a pistol with the serial burned off", "a rare vinyl record", "a box of pre-collapse cigarettes"],
  hide: ["inside a vending machine", "taped under a car", "in a cloud locker, password unknown", "behind a neon sign", "in a fridge full of synth-noodles", "inside a dead drone", "in a server rack", "in someone's cyberarm"],
  activity: ["shaking down a vendor", "running a deal", "patrolling for the corp", "racing bikes", "jacked in, guards watching", "loading a van", "partying on stolen stims", "hunting the crew"],
  terrain: ["a rain-slick rooftop", "a crowded night market", "a flooded metro tunnel", "the gutted floors of a dead arcology", "a club with strobe lights", "a parking garage", "a container port", "a neon-lit alley"],
  fallback: ["Static Saints gangers", "Halvorsen security", "a cyberpsycho", "a combat drone", "dirty cops", "a rival crew", "netrunners", "a kill team"],
};
export const forge = { T, EXTRA };

export function tables(t) {
  const f = "Cyberpunk RED";
  return [
    t("Gig complication", `${f} · Gigs`, ["The client is a corp plant", "Another crew got the same gig", "The target has already been snatched", "The building's security got upgraded last night", "The fixer took a cut nobody agreed to", "The getaway driver flatlines", "The data's encrypted and the key is in someone's head", "It's a setup: the cops are waiting", "The target doesn't want to be rescued", "A media is filming the whole thing"]),
    t("Night market deal", `${f} · Street`, ["Noodles that taste almost like real chicken, 10eb", "A used cyberoptic, fell off a truck, 500eb", "A burner phone with one saved contact, 50eb", "Synth-coffee strong enough to wake the dead, 5eb", "Ammo with no serials, 100eb a box", "A street doc offering 'discounts' on chrome", "A fortune teller with a cyberdeck", "A kid selling maps of the old metro, 20eb"]),
    t("Netrun hazard", `${f} · Net`, ["A wall of static: the next Interface check is harder", "Black ICE wakes up and goes for the runner's brain", "A demon program watches, and reports back", "The architecture loops: you're back at the start", "A file that's bait. Opening it pings corp security", "An old AI fragment asks for help", "The connection drops. Meatspace guards are coming", "Someone else is in here with you"]),
    t("Cyberware glitch", `${f} · Chrome`, ["Your optics flash a corp ad at the worst moment", "Your arm's grip locks for a turn", "Your audio picks up a radio station, loudly", "Your internal agent reads your messages aloud", "A firmware update starts. You can't stop it", "Your skin weave itches. Badly", "Your reflexes fire a half-second early", "Your cyberware pings its manufacturer with your location"]),
    t("Corp response", `${f} · Heat`, ["Nothing. Yet", "A polite call from corp security", "Your accounts are frozen", "A drone follows you home", "A kill team is assigned, but slow", "A bounty goes out on the crew", "Your fixer stops answering", "A media is paid to smear you"]),
    t("Screamsheet headline", `${f} · Media`, ["HALVORSEN BIOTIC DENIES LOWMARKET WATER RUMORS", "STATIC SAINTS CLAIM HOLLOW TOWER", "PRECINCT 9 BUDGET CUT AGAIN", "PIRATE RADIO 'DEAD AIR' STILL ON AIR", "CYBERPSYCHO RAMPAGE IN THE NIGHT MARKET, 4 DEAD", "BRAINDANCE EDITOR MISSING, FANS WORRIED", "PORT HALCYON MAYOR: 'THE CITY IS SAFE'", "CORP STOCKS UP 12% AFTER 'INCIDENT'"]),
    t("Street NPC", `${f} · Street`, ["A ripperdoc with shaky hands and steady prices", "A gang kid with a borrowed gun and a lot to prove", "A corp suit who took a wrong turn", "A nomad trucker passing through", "A cop who wants a bribe, or a friend", "A fixer's runner with a package and a bullet wound", "A street preacher who knows your name", "A vendor who sees everything and says nothing"]),
    t("Getaway", `${f} · Gigs`, ["The van won't start", "Traffic jam: the whole freeway is stopped", "A police AV is overhead", "The bridge is up", "A gang roadblock ahead", "A clean run, for once", "Someone's tracking the car", "The driver wants double, now"]),
  ];
}

export const adventure = { title: "Dead Air", blurb: "A starting crew, three sessions. Get a missing braindance editor out of a gang-held tower before a corp kill team does, and decide what to do with the recording everyone wants." };

export function campaign({ blank, uid, lib, sys, toCreature }) {
  const c = blank("Dead Air");
  c.tagline = "Cyberpunk RED · a starting crew · a ready-to-play gig";
  c.stash = { money: 2000, unit: "eb", items: [], log: [] };
  const now = Date.now(), note = (title, cat, tags, body, extra = {}) => ({ id: uid(), title, cat, tags, body, updated: now, ...extra });
  // HP = 10 + 5 × (BODY + WILL) / 2 rounded up, Humanity = EMP × 10
  const K = ["INT", "REF", "DEX", "TECH", "COOL", "WILL", "LUCK", "MOVE", "BODY", "EMP"];
  const pc = (character, role, color, v, text) => { const st = Object.fromEntries(K.map((k, i) => [k, v[i]])); const hp = 10 + 5 * Math.ceil((st.BODY + st.WILL) / 2);
    return { id: uid(), player: "", character, role, color, stats: st, res: { HP: { cur: hp, max: hp }, Humanity: { cur: st.EMP * 10, max: st.EMP * 10 }, Luck: { cur: st.LUCK, max: st.LUCK }, Money: { cur: 500, max: "" } }, conds: [], text }; };
  c.party = [
    pc("Vex Moreno", "Solo · Combat Awareness 4", "#cf8577", [5, 8, 6, 4, 6, 6, 5, 6, 7, 3], { Skills: "Handgun 6, Shoulder Arms 6, Brawling 4, Evasion 6, Athletics 4, Perception 4, Stealth 4, Tactics 4, Resist Torture/Drugs 4", Cyberware: "Cyberarm with popup shield, Wolvers in the other hand, a street-built reflex booster, Biomonitor", Weapons: "Very heavy pistol (4d6), assault rifle (5d6, autofire), wolvers (3d6)\nArmor: light armorjack, SP 11 body and head", Notes: "Owes Mama Juno a favor. Used to work Halvorsen security, until they left her for dead." }),
    pc("Ghost Okonkwo", "Netrunner · Interface 4", "#a98fb6", [8, 6, 5, 6, 5, 5, 6, 5, 4, 6], { Skills: "Basic Tech 6, Electronics/Security Tech 6, Cryptography 4, Library Search 6, Handgun 4, Evasion 4, Stealth 6, Perception 4, Conversation 2", Cyberware: "Neural link, interface plugs, cyberdeck (7 slots: Sword, Armor, See Ya, Eraser, Worm, Banhammer), Chipware: memory chip", Weapons: "Heavy pistol (3d6)\nArmor: kevlar, SP 7", Notes: "Kit Okafor's ex-partner. Built the tower's old net architecture, years ago, on a different job." }),
    pc("Spanner Ruiz", "Tech · Maker 4", "#d4a54a", [7, 5, 6, 8, 4, 5, 5, 5, 6, 5], { Skills: "Basic Tech 6, Cybertech 6, Weaponstech 6, Electronics/Security Tech 6, Land Vehicle Tech 4, Drive Land Vehicle 4, Shoulder Arms 4, Evasion 4, First Aid 4", Cyberware: "Cyberoptics (microoptics, targeting), toolhand", Weapons: "Shotgun (5d6), homemade flashbang x2\nArmor: light armorjack, SP 11", Notes: "Drives the crew's van, the 'Blue Heron'. It mostly works." }),
    pc("Dani Sol", "Media · Credibility 4", "#8daebe", [7, 5, 5, 4, 7, 6, 6, 6, 5, 8], { Skills: "Persuasion 6, Conversation 6, Human Perception 6, Composition 6, Photography/Film 6, Streetwise 6, Bribery 4, Handgun 4, Evasion 4", Cyberware: "Cyberaudio with voice stress analyzer, internal agent, a hidden camera in one eye", Weapons: "Medium pistol (2d6)\nArmor: kevlar, SP 7", Notes: "Runs the pirate radio show 'Dead Air'. Kit Okafor was a source. Wants the recording on the air." }),
  ];
  const fromLib = n => { const r = lib?.creatures.find(x => x[0] === n); return r ? toCreature(sys, r) : null; };
  const punk = fromLib("Chrome Gang Punk"), sec = fromLib("Corporate Security"), run = fromLib("Netrunner"), bounc = fromLib("Street Doc's Bouncer"), psy = fromLib("Cyberpsycho"), cop = fromLib("Psycho Squad Officer");
  const halo = bounc && { ...bounc, id: uid(), name: "Halo", kind: "Static Saints boss", notes: "Street Doc's Bouncer stat block, 45 HP. Runs the Hollow Tower. Charming, chromed, and broke: she'll trade Kit for money or for Halvorsen's head.", hp: "45", stats: { ...bounc.stats, HP: "45" } };
  const reyes = sec && { ...sec, id: uid(), name: "Agent Corvin Reyes", kind: "Halvorsen black ops lead", notes: "Corporate Security stat block, 40 HP, with a smart pistol. Polite, patient, and authorized to kill everyone on floor 31.", hp: "40", stats: { ...sec.stats, HP: "40" } };
  c.bestiary = [punk, halo, sec, reyes, run, psy, cop].filter(Boolean);
  for (const b of c.bestiary) b.tags = `${b.tags || "Cyberpunk RED"}, dead air`;

  const N = {
    city: note("Port Halcyon", "Locations", "city, 2045", "# Port Halcyon, 2045\nA harbor megacity that rebuilt itself on top of its own ruins. Corp towers on the hills, the **Lowmarket** in the flooded streets below.\n\n- **The Lowmarket:** night markets, noodle bars, gang turf\n- **The Hollow Tower:** a half-built arcology, gutted, held by [[The Static Saints]]\n- **Halvorsen Biotic** owns the hill, the water plant, and most of the police\n- **Dead Air:** a pirate radio station in an old harbor crane", { pinned: true }),
    tower: note("The Hollow Tower", "Locations", "arcology, act 2", "Sixty floors, finished to 34, abandoned when the money ran out. [[The Static Saints]] hold floors 1 to 30. Floor 31 is Kit Okafor's studio, behind a vault door. The tower's old **net architecture** still runs, and something lives in it."),
    juno: note("Mama Juno", "NPCs", "fixer", "Fixer who runs the gig from the back of a noodle bar. Sixty, calm, trusted. **Offers:** 1,000eb each to bring Kit Okafor to her, alive. **Secret:** she has a buyer lined up for the recording: Halvorsen's rival, Okami Pharma."),
    kit: note("Kit Okafor", "NPCs", "target", "Braindance editor, 30, brilliant, paranoid. Recorded Halvorsen Biotic testing a combat drug on Lowmarket residents through the water supply.\n\n**Now:** flatlined on floor 31 three days ago when Halvorsen's netrunners fried his rig. His mind left a ghost construct in the tower's net, still guarding the recording."),
    halo: note("Halo", "NPCs", "gang boss", "Boss of [[The Static Saints]]. Tall, chrome jaw, a laugh like a car alarm. Charges a toll for every floor. Hates Halvorsen: the combat drug turned three of her people into cyberpsychos."),
    reyes: note("Agent Corvin Reyes", "NPCs", "villain, corp", "Halvorsen Biotic black ops. Soft-spoken, well-dressed, patient. Wants the recording destroyed and everyone who's seen it gone. Will offer the crew 5,000eb each to walk away."),
    saints: note("The Static Saints", "Factions", "gang", "Chrome gang of the Lowmarket. Hold the Hollow Tower. Loud, proud, and furious about the drug test."),
    halv: note("Halvorsen Biotic", "Factions", "corp", "Pharmaceutical megacorp. Owns the water plant. Testing a combat drug, codename **NIGHTJAR**, on the Lowmarket through the water."),
    rec: note("The NIGHTJAR recording", "Items", "data, mcguffin", "A braindance recording of Halvorsen technicians dosing the Lowmarket water, and a cyberpsycho episode it caused. Worth a fortune to Okami Pharma, a death sentence to whoever holds it, and a riot if it goes on the air."),
    q1: note("Get Kit Okafor out of the Hollow Tower", "Quests", "main", "For Mama Juno. 1,000eb each. Alive."),
    q2: note("What to do with the recording", "Quests", "choice", "Sell it to Okami Pharma through Juno, sell it back to Halvorsen through Reyes, or put it on the air with Dani."),
  };
  c.notes = [...Object.values(N), ...(lib?.spells || []).map(r => ({ id: uid(), title: r[0], cat: "Spells", tags: `Cyberpunk RED, ${r[1]}`, body: r[2], updated: now, lib: sys.id }))];
  const b = c.boards[0], card = (type, x, y, w, color, title, text, extra = {}) => ({ id: uid(), type, x, y, w, color, rot: (Math.random() * 4 - 2).toFixed(2), title, text, z: 1, ...extra });
  const h1 = card("heading", 40, 30, 360, "paper", "Who wants the recording?", "");
  const r1 = card("ref", 60, 150, 230, "sky", "", "", { ref: N.kit.id }), r2 = card("ref", 380, 150, 230, "rose", "", "", { ref: N.halv.id }), r3 = card("ref", 700, 150, 230, "mustard", "", "", { ref: N.juno.id });
  const n1 = card("note", 240, 410, 240, "paper", "", "Three Static Saints went cyberpsycho the same week. All drank Lowmarket water.");
  b.cards = [h1, r1, r2, r3, n1]; b.links = [{ id: uid(), a: r1.id, b: r2.id, color: "red" }, { id: uid(), a: r3.id, b: r1.id, color: "black" }, { id: uid(), a: n1.id, b: r2.id, color: "red" }]; b.view = { x: 40, y: 30, z: .9 };
  c.clocks = [
    { id: uid(), name: "Halvorsen closes in", segs: 6, filled: 1, color: "#cf8577", note: "Tick when the crew is loud, seen, or slow. 3: a drone tails them. 6: Reyes's kill team hits the tower.", onStream: false },
    { id: uid(), name: "Kit's construct degrades", segs: 4, filled: 1, color: "#8daebe", note: "Tick each hour on floor 31. Full: the ghost is gone, and only the recording's encrypted shell remains.", onStream: false },
  ];
  c.rep = [{ id: uid(), note: N.saints.id, v: 0 }, { id: uid(), note: N.halv.id, v: -1 }];
  c.calendar = { months: [["January", 31], ["February", 28], ["March", 31], ["April", 30], ["May", 31], ["June", 30], ["July", 31], ["August", 31], ["September", 30], ["October", 31], ["November", 30], ["December", 31]].map(([name, days]) => ({ name, days })), weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], year: 2045, month: 10, day: 3, era: "", events: [] };
  c.handouts = [
    { id: uid(), title: "Message from Mama Juno", type: "text", style: "card", text: "Got a gig. Noodle bar on Kettle Street, back booth, midnight.\nBring your whole crew and leave your nerves.\nPays well. Pays better if nobody dies.\n\n- J" },
    { id: uid(), title: "Kit's last message", type: "text", style: "plain", text: "IF YOU'RE READING THIS I'M ALREADY OFFLINE.\nFLOOR 31. VAULT CODE IS THE DAY WE MET.\nDON'T SELL IT. PLAY IT." },
  ];
  const t = s => ({ id: uid(), text: s, done: false });
  const P = (num, title, plan) => ({ id: uid(), num, title, status: "planned", date: "", ingame: "", hours: "", moods: [], ambience: "", beats: [], quotes: [], cliff: "", recap: "", attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "", threads: [], scars: [], worked: "", change: "", rating: 0, prep: [], created: now + num, plan: { cast: [], encounters: [], handouts: [], ...plan } });
  c.sessions = [{
    id: uid(), num: 1, title: "The Meet", date: "", ingame: "November 3rd, 2045", hours: 1, moods: ["Roleplay"], ambience: "Rain on neon, a noodle bar's steam", example: true,
    beats: [{ id: uid(), type: "social", text: "[[Mama Juno]] offers the gig in the back booth: get [[Kit Okafor]] out of [[The Hollow Tower]].", star: false }, { id: uid(), type: "discovery", text: "Ghost gets Kit's last message, sent on a timer three days ago.", star: true }, { id: uid(), type: "social", text: "Dani's show mentions Halvorsen. Twelve minutes later, a drone hovers outside the studio.", star: false }],
    quotes: [{ id: uid(), who: "Mama Juno", line: "Alive, chooms. Dead people don't sign contracts." }],
    cliff: "Outside the noodle bar, a black Halvorsen AV lands across the street. A well-dressed man gets out and smiles at the crew.",
    recap: "Mama Juno hired the crew to pull a braindance editor, Kit Okafor, out of the Hollow Tower. Kit's last message said he was already offline, and that the recording should be played, not sold. Then a Halvorsen AV landed outside, and a well-dressed man smiled at them through the rain.",
    attendance: {}, spotlight: {}, mvp: null, loot: [], xp: "Session zero: crew made, lifepaths tied together", threads: [{ id: uid(), text: "What's on Kit's recording?", done: false }], scars: [], worked: "", change: "", rating: 0, prep: [], created: now,
  },
  P(2, "Floor 31", { start: "Agent Reyes buys the crew a drink they didn't order. 'Five thousand each to go home tonight,' he says. 'It's a generous offer. It's also the only one.'", scenes: [t("Reyes's offer, and walking away from it"), t("The Hollow Tower lobby: Halo's toll"), t("Climbing 30 floors of Static Saints turf: fight, bribe, or sneak"), t("Three cyberpsychos in a cage on floor 22: the drug's victims"), t("The vault on floor 31: Kit's body, and his rig still running")], secrets: [t("Kit is dead; his ghost construct is in the tower's net"), t("Halo will help for a share or for Halvorsen's head"), t("Juno has a buyer: Okami Pharma"), t("Ghost built the tower's old net and knows a back door")], cast: [N.reyes.id, N.halo.id, N.tower.id], treasure: [t("Saints' toll box: 800eb"), t("Kit's cyberdeck, worth 1,500eb")] }),
  P(3, "Dead Air", { start: "Ghost jacks in. The tower's old net opens like a cathedral of static, and at the far end, wearing Kit's face, something says: 'You came.'", scenes: [t("The netrun through the tower's architecture: black ICE and a Halvorsen netrunner"), t("Kit's construct and the recording"), t("Reyes's kill team storms floor 31 (when the clock fills)"), t("Getting out: the roof, the elevator shaft, or Halo's people"), t("The choice: sell to Okami, sell back to Halvorsen, or put it on Dead Air")], secrets: [t("Kit's construct can be copied to Dani's studio, if they get there"), t("Broadcasting starts a riot in the Lowmarket and makes Halvorsen an enemy for life"), t("Okami Pharma will use the recording to buy Halvorsen, not to stop the drug")], cast: [N.kit.id, N.rec.id, N.juno.id], treasure: [t("Juno's pay: 1,000eb each, if Kit's construct counts as alive"), t("Okami's price: 5,000eb each"), t("Fame on the street if it goes on the air")] }),
  ];
  c.sessions[1].recap = c.sessions[0].recap;
  const by = n => c.bestiary.find(x => x.name === n), E = (n, k) => { const x = by(n); return x && { id: uid(), creature: x.id, count: k, hp: Array(k).fill(Number(x.stats.HP) || 20) }; };
  c.sessions[1].plan.encounters = [E("Chrome Gang Punk", 4), E("Halo", 1), E("Cyberpsycho", 1)].filter(Boolean);
  c.sessions[2].plan.encounters = [E("Netrunner", 1), E("Agent Corvin Reyes", 1), E("Corporate Security", 4)].filter(Boolean);
  return c;
}
