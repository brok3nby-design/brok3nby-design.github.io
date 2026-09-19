// ---- towns: arguments, not new item folders ----
// One shared locker function. A town supplies price level, bid step, archetype
// weights, which sets are legal, buyer money, paper voice, and its lie rate.
// The map is visible on day one and mostly unusable. That is the point.
'use strict';

const TOWNS = {
  dustyFlats: {
    id: 'dustyFlats', name: 'Dusty Flats', tier: 0,
    paperName: 'THE DUSTY FLATS GAZETTE',
    tagline: '"All the junk that\'s fit to print"',
    blurb: 'home. three units, familiar faces, $25 raises.',
    priceMult: 1, bidStep: 25,
    crowdCapMult: 1,
    lieRate: 0.12,
    sets: ['sundayTable', 'tourBag'],
    archBoost: null,
    dayCapBase: 1500, dayCapPerDay: 220,
    gasCost: 0,
    rivals: [],
    map: [120, 430],
    myths: ['goldJacket', 'goonMap', 'moonRock'],
    gate: null,
    arrival: ['You pull into Dusty Flats with the sunrise. The water tower still says DUS Y FLA S.',
              '"Back already," says the clerk, pleased. Deposits the raccoon watches you park.',
              'Home. The clerk has your coffee poured before the van stops.'],
  },
  redMesa: {
    id: 'redMesa', name: 'Red Mesa', tier: 1,
    tint: { col: 'rgba(226,132,86,0.16)', mode: 'multiply' },    // red rock, hard noon
    paperName: 'THE RED MESA LEDGER',
    tagline: '"We print what we can prove. Mostly."',
    blurb: 'fewer friendly faces. pricier doors. the paper hedges.',
    priceMult: 1.6, bidStep: 50,
    crowdCapMult: 2.4,
    lieRate: 0.22,
    sets: ['sundayTable', 'backline'],
    archBoost: { shopStock: 6, smuggler: 5, timeCapsule: 4 },
    dayCapBase: 2800, dayCapPerDay: 300,
    gasCost: 60,
    rivals: ['vera', 'tuck'],
    myths: ['jewelEgg'],
    map: [300, 368],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 4000 },
    arrival: ['"Bidder number, van, name." The Red Mesa clerk checks all three. Slowly.',
              '"Red Mesa remembers you." It is not clear whether that is good.',
              'Vera nods at your van. Tuck nods at nothing. You have been here enough.'],
  },
  // ---- the rest of the map. locked. looming. ----
  // Salt Lick: the ugliest doors on the highway. Cheap, dusty, boxes everywhere,
  // and now and then the worst-looking unit on the row has one good thing in a
  // garbage bag. The lesson: never price a locker by its furniture.
  saltLick: {
    id: 'saltLick', name: 'Salt Lick', tier: 1,
    tint: { col: 'rgba(255,246,222,0.16)', mode: 'screen' },     // bleached: salt light on everything
    paperName: 'THE SALT LICK SHOPPER',
    tagline: '"Free. Worth every penny."',
    blurb: 'a dirt town like home, but the dirt is saltier. cheap doors. full boxes.',
    priceMult: 0.8, bidStep: 25,
    crowdCapMult: 0.7,
    lieRate: 0.15,
    sets: ['sundayTable', 'tourBag'],
    archBoost: { hoarder: 10, workshop: 4, officeSurplus: 2 },
    dayCapBase: 1300, dayCapPerDay: 200,
    gasCost: 45,
    rivals: ['bev', 'pruitt'],
    myths: ['nugget'],
    map: [238, 458],
    gate: { bidderNumber: true, netWorth: 2200 },
    // the rules it bends
    junkBias: 0.15,               // more junk on every door
    containerBoost: 1,            // one more container per unit actually holds something
    containerPoolShift: 0.35,     // boxes and bags lean toward household goods, not underwear
    condWeights: [45, 30, 20, 5], // salt air. everything is a grade dustier
    sleeperRate: 0.3,             // a junk unit hides one good small thing in a bag
    bluffTells: 0.5,              // honest paper, dishonest confidence: half the yard chatter is theater
    noiseSpread: 1.6,             // and everybody but Ed guesses loud
    arrival: ['"Bidder number?" The Salt Lick clerk squints at it. "Huh. Real."',
              '"You again." He says it like a compliment. In Salt Lick it is one.',
              'Bev looks up from her boxes when you park. That is a greeting here.'],
  },
  // Gypsum City: the paper is always right about the story and almost never
  // about the door. The watchmaker's unit is on the row today. It is not unit
  // 18. Read the fronts, match the story, ignore the number.
  gypsumCity: {
    id: 'gypsumCity', name: 'Gypsum City', tier: 2,
    tint: { col: 'rgba(240,240,232,0.10)', mode: 'screen' },     // chalk-white civic light
    paperName: 'THE GYPSUM CITY CORRECTION',
    tagline: '"We stand by our errors."',
    blurb: 'the paper names the wrong unit on purpose, they say. the story is always real.',
    priceMult: 1.3, bidStep: 50,
    crowdCapMult: 1.6,
    lieRate: 0.7,
    sets: ['sundayTable', 'backline'],
    archBoost: { timeCapsule: 4, officeSurplus: 4, grandma: 2 },
    dayCapBase: 2400, dayCapPerDay: 280,
    gasCost: 90,
    rivals: ['hattie', 'delgado'],
    myths: ['deed'],
    map: [198, 282],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 7000 },
    // the rules it bends
    paperHintRate: 0.95,          // the lead is nearly always about one of today's doors
    paperNamesUnit: 1,            // and it always prints a number
    paperSecondHint: 0.5,         // half the days, a second story about a second door. also numbered. also wrong.
    arrival: ['"Name?" The Gypsum City clerk writes it down. Wrong.',
              '"Oh, the one from the paper." You were not in the paper. You will be.',
              'The editor waves from the newsstand. He has printed your unit number. It is wrong.'],
  },
  // Bent Fork: two auctioneers, one yard, thirty years of not speaking. Which
  // one has the gavel today changes how fast the room moves, how proud the
  // rivals get, and how much they let slip. Same locker, different game.
  bentFork: {
    id: 'bentFork', name: 'Bent Fork', tier: 2,
    tint: { col: 'rgba(170,184,190,0.18)', mode: 'multiply' },   // overcast river valley
    paperName: 'THE BENT FORK TINES',
    tagline: '"Two sides to every story. We print both."',
    blurb: 'two auctioneers. they hate each other. check who has the gavel before you bid.',
    priceMult: 1.4, bidStep: 50,
    crowdCapMult: 1.8,
    lieRate: 0.18,
    sets: ['sundayTable', 'tourBag'],
    archBoost: { workshop: 5, grandma: 4 },
    dayCapBase: 2600, dayCapPerDay: 290,
    gasCost: 105,
    rivals: ['dee', 'cobb'],
    myths: ['gavel'],
    map: [362, 272],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 8000 },
    // the rule it bends
    auctioneer: ['ray', 'lyle'],  // one of them per day, seeded
    arrival: ['Ray says "who\'s this" and the Reverend says "welcome, friend" at the same moment. They do not look at each other.',
              '"The out-of-towner." Both auctioneers claim you now. Neither has asked.',
              'Your name is on the yard board. In two handwritings.'],
  },
  // Marrow Creek: nobody stores anything ordinary. A whole archetype that only
  // lives here, boxes that lean weird, named junk twice as often, unit 13
  // sorting itself most weeks, and Creepy Carl in town more days than not.
  marrowCreek: {
    id: 'marrowCreek', name: 'Marrow Creek', tier: 2,
    tint: { col: 'rgba(120,170,120,0.22)', mode: 'multiply' },   // sodium lamp and fog, a sickly green
    paperName: 'THE MARROW CREEK ECHO',
    tagline: '"We heard it too."',
    blurb: 'nobody stores anything ordinary in Marrow Creek. price it anyway.',
    priceMult: 1.3, bidStep: 50,
    crowdCapMult: 1.5,
    lieRate: 0.2,
    sets: ['sundayTable', 'backline'],
    archBoost: { oddball: 75, hoarder: -8, grandma: -9, workshop: -7, shopStock: -5, officeSurplus: -6, musician: -6 },
    dayCapBase: 2500, dayCapPerDay: 280,
    gasCost: 120,
    rivals: ['ferrell', 'wanda'],
    myths: ['jarThing'],
    map: [472, 330],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 7500 },
    // the rules it bends
    namedJunkRate: 0.12,          // things that should not exist, four times as often
    containerPoolShift: 0.4,      // and the boxes lean weird
    containerPoolTarget: 'weirdy',
    tidyRate: 0.12,               // unit 13 sorts itself most weeks
    buyerBias: { carl: 6, randy: 2, alice: 1, gina: 1 },   // Carl is in town more days than not
    frontDressing: true,          // the front row always looks good. that is the trap
    emptyFlexBias: 6,             // and dressed-up empty units look like myth holes
    arrival: ['The Marrow Creek clerk does not ask your name. He seems to know it. Nobody told him.',
              '"You came back." The clerk sounds surprised. Most people do not.',
              'A mannequin in unit 13 has been turned to face the gate. Toward your van.'],
  },
  // Vermillion: velvet and chrome. The maker is everything and the finish
  // lies about it. Brands hide until the loupe or the appraiser, brand
  // multipliers are stretched, and the gilt lamp is the cheap one this week.
  vermillion: {
    id: 'vermillion', name: 'Vermillion', tier: 3,
    tint: { col: 'rgba(200,110,120,0.16)', mode: 'multiply' },   // velvet and evening
    paperName: 'THE VERMILLION REGISTER',
    tagline: '"Society. Property. Provenance."',
    blurb: 'velvet and chrome. the maker is everything, and the finish lies about it.',
    priceMult: 2.0, bidStep: 100,
    crowdCapMult: 2.6,
    lieRate: 0.15,
    sets: ['sundayTable', 'backline'],
    archBoost: { grandma: 6, timeCapsule: 6, shopStock: 3, hoarder: -10 },
    dayCapBase: 3800, dayCapPerDay: 380,
    gasCost: 160,
    rivals: ['vale', 'charlie'],
    myths: ['cameo'],
    map: [418, 182],
    gate: { bidderNumber: true, vanCap: 60, netWorth: 14000 },
    buyerBias: { alice: 4, randy: 2, gina: 1, carl: 1 },
    // the rules it bends
    hideBrandsAtDoor: true,       // brand shows at the loupe or the appraiser, never on the pull
    brandSpread: 1.6,             // brand multipliers stretched: Rustwood .33x, Goldtop 13x
    estSpread: 1.8,               // the dig estimate is twice as vague
    condWeights: [20, 30, 35, 15],
    peekLimit: 2,                 // viewings by appointment: two doors a day. The third you bid blind, or not at all
    arrival: ['"Number?" The Vermillion clerk looks at your laminated card the way one looks at a sandwich.',
              '"Ah. The one with the eye." Somebody has been talking about you.',
              'Your bidder card is brass now. Engraved. Nobody will say who paid for it.'],
  },
  // Kettle Basin: climate controlled. Everything survives, everybody knows it,
  // opening bids start high, and a Mint piece packed into a full van rides home
  // one grade worse. The question is no longer "is it valuable" but "is the
  // condition premium worth this bidding war".
  kettleBasin: {
    id: 'kettleBasin', name: 'Kettle Basin', tier: 3,
    tint: { col: 'rgba(214,232,255,0.20)', mode: 'screen' },     // cold fluorescent white
    paperName: 'THE KETTLE BASIN THERMOSTAT',
    tagline: '"Seventy-two degrees. Forty percent. Always."',
    blurb: 'the units are climate controlled. the people are not. mint is common, and it bruises.',
    priceMult: 1.9, bidStep: 100,
    crowdCapMult: 2.4,
    lieRate: 0.12,
    sets: ['sundayTable', 'tourBag', 'backline'],
    archBoost: { timeCapsule: 8, grandma: 4, hoarder: -8 },
    dayCapBase: 3600, dayCapPerDay: 360,
    gasCost: 170,
    rivals: ['priscilla', 'garrity'],
    myths: ['stampSheet'],
    map: [540, 238],
    gate: { bidderNumber: true, vanCap: 60, netWorth: 15000 },
    // the rules it bends
    condWeights: [4, 14, 46, 36], // Mint is a third of everything
    minBidMult: 1.6,              // the yard knows what it has
    rivalCapBonus: 0.1,           // and so does everyone else
    crushRate: 0.35,              // a van packed past 85% bruises one good piece on the way home
    arrival: ['"Seventy-two degrees," says the Kettle Basin clerk, instead of hello.',
              '"Pack lighter this time." The clerk knows about the van. Everybody knows about the van.',
              'Garrity nods at you from across the lot. Garrity does not nod.'],
  },
  // Chrome Springs: the rich lot. Everything costs four times as much, half the
  // shine is plate, the fakes are good, and the two people you bid against
  // could buy the yard. The clerk learns your name. Slowly.
  chromeSprings: {
    id: 'chromeSprings', name: 'Chrome Springs', tier: 4,
    tint: { col: 'rgba(240,196,96,0.18)', mode: 'multiply' },    // gold. it is always gold here
    paperName: 'THE CHROME SPRINGS COURIER',
    tagline: '"Discretion assured. Prices are not."',
    blurb: 'the rich lot. spectacular doors, expensive mistakes. the clerk laughs at your name, for now.',
    priceMult: 3.2, bidStep: 200,
    crowdCapMult: 4.5,
    lieRate: 0.2,
    sets: ['sundayTable', 'tourBag', 'backline'],
    archBoost: { timeCapsule: 6, shopStock: 4, smuggler: 4, hoarder: -12, officeSurplus: -6 },
    dayCapBase: 7000, dayCapPerDay: 700,
    gasCost: 220,
    rivals: ['ilse', 'dex'],
    myths: ['pageantCrown'],
    map: [516, 92],
    gate: { bidderNumber: true, vanCap: 90, netWorth: 40000 },
    buyerBias: { alice: 3, carl: 2, randy: 2, gina: 1 },
    // the rules it bends
    fakeRate: 0.35,               // sophisticated fakes
    luxJunkRate: 0.35,            // luxury junk: it looks like six thousand dollars until somebody with a loupe laughs
    hideBrandsAtDoor: true,
    brandSpread: 1.3,
    condWeights: [15, 25, 40, 20],
    // the crowd here does not bring chairs. It raises a finger, once, from the back
    crowd: {
      tag: 'no chairs. no coffee. money.',
      lines: {
        raise: ['Someone at the back raised a finger.', 'A finger, at the back. The auctioneer saw it.',
          'Somebody by the door nods a quarter inch. That is a bid here.', 'A card is lifted at the back and lowered again.'],
        fold: ['The back of the room is still.', 'The finger does not go up again.', 'Nobody at the back moves.'],
        win:  ['Somebody at the back takes it. A driver comes forward to pay.', 'It goes to the back of the room. Nobody caught a name. Nobody was meant to.'],
        settle: 'The back of the room is still.',
        quiet: 'still',
      },
    },
    // what the clerk says, by how many times you have pulled in
    arrival: ['"Name?" The clerk does not look up.', '"Oh. You." The clerk looks up this time.',
              '"We\'ve been expecting you." Your card is already on the desk.'],
  },
};
const TOWN_ORDER = ['dustyFlats', 'saltLick', 'redMesa', 'gypsumCity', 'bentFork',
  'marrowCreek', 'vermillion', 'kettleBasin', 'chromeSprings'];

// ---- town rules: the knobs a town may turn. Missing = Dusty Flats behavior ----
// A town that bends a rule sets the key on its pack; everything else falls
// through to these defaults, so an unopened town plays exactly like home.
const TOWN_RULES = {
  condWeights: null,      // [Dusty, Worn, Clean, Mint] weights; null = CONDS defaults (Kettle Basin keeps things nice)
  junkBias: 0,            // added to every archetype's junk share (Salt Lick)
  containerBoost: 0,      // extra containers that actually hold something (Salt Lick)
  containerPoolShift: 0,  // chance a box/bag draws from containerPoolTarget instead of trash (Salt Lick, Marrow Creek)
  containerPoolTarget: 'home',
  tidyRate: 0.035,        // chance unit 13 sorted itself overnight (Marrow Creek runs hot)
  buyerBias: null,        // {buyerId: weight} for who visits; null = two at random
  brandSpread: 1,         // brand multiplier exponent (Vermillion stretches the gap between makers)
  estSpread: 1,           // how vague the dig estimate is (Vermillion)
  minBidMult: 1,          // opening bids (Kettle Basin starts high)
  rivalCapBonus: 0,       // added to every rival's cap multiplier (Kettle Basin collectors)
  crushRate: 0,           // chance a van packed past 85% bruises one Mint/Clean piece (Kettle Basin)
  luxJunkRate: 0,         // chance a unit carries one piece of luxury junk with a huge fake estimate (Chrome Springs)
  arrival: null,          // clerk lines by visit count, or null for the plain sunrise toast
  tint: null,             // {col, mode} washed over the yard, the peek and the auction, under the UI (a town's light)
  crowd: null,            // {tag, lines} to replace the lawn-chair crowd at the auction (Chrome Springs)
  bluffTells: 0,          // chance a rival tell at the peek is theater about nothing (Salt Lick)
  noiseSpread: 1,         // how much wider everybody's estimate wobbles, Ed excepted (Salt Lick)
  frontDressing: false,   // the good-looking things face the door, junk hides behind (Marrow Creek)
  emptyFlexBias: 0,       // extra weight on dressed-up empty units (Marrow Creek)
  peekLimit: 0,           // doors you may look inside per day; 0 = all. The rest you bid blind (Vermillion)
  sleeperRate: 0,         // chance a junk-heavy unit hides one good small thing in a bag (Salt Lick)
  namedJunkRate: 0.03,    // named junk per unit (Marrow Creek runs hot)
  fakeRate: 0.18,         // convincing fakes on a myth-owner day (Chrome Springs runs hot)
  hideBrandsAtDoor: false,// brands read only through the loupe or at home (Vermillion)
  paperHintRate: 0.7,     // chance the lead story is a real hint about one of today's units
  paperNamesUnit: 0.45,   // chance that hint prints a unit number (lieRate decides if it is the right one)
  paperSecondHint: 0,     // chance the third slot is a second hint about a second unit (Gypsum City)
  auctioneer: 'default',  // who runs the gavel; a list means one is picked per day (Bent Fork)
};
function townRule(key, town) {
  const t = town || curTown();
  return (t && t[key] !== undefined && t[key] !== null) ? t[key] : TOWN_RULES[key];
}

// ---- auctioneers: the same locker plays differently under a different gavel ----
// The auction runs at the speed of the voice: a line with a clip holds the
// floor until the clip ends, then voGap seconds of air. bidPace / foldPace are
// for SILENT lines (no clip recorded, voice muted): seconds a bid or a fold
// hangs in the air. turnBeat: the pause after the room goes quiet with a rival
// on top, before the buttons come back (the gavel turning to you). press: how
// willing proud rivals are to go past their number. rejoin: how often a folded
// pair comes back. hesitation: seconds before the auctioneer needles a silent
// player. raiseMult: how big a rival's raise is under this gavel (momentum).
// tellMult: how much the yard lets slip at the peek (a slow room talks more).
// face: the portrait, npcs/npc_<face>.jpg (+ npc_<face>_talk.jpg while he speaks).
const AUCTIONEERS = {
  // the house gavel: Buzz Kettleman, ex drive-time radio. Fast mouth, normal hammer.
  default: {
    id: 'default', name: 'Buzz Kettleman', blurb: 'drive-time radio gavel; has not stopped talking since the station let him go.',
    face: 'buzz',
    bidPace: 1.2, foldPace: 0.7, voGap: 0.25, turnBeat: 0.8,
    pressMult: 1, rejoinMult: 1, hesitation: 7, raiseMult: 1, tellMult: 1,
    voice: 'auc',           // voice bank prefix (auc_open_ready, ...)
  },
  // Bent Fork, side A: Rapid Ray. Fast gavel, big jumps, no patience for pride.
  ray: {
    id: 'ray', name: 'Rapid Ray Dunmore', blurb: "fast gavel, double raises, blink and it's sold.",
    face: 'ray',
    bidPace: 0.6, foldPace: 0.4, voGap: 0.1, turnBeat: 0.4,
    pressMult: 0.5, rejoinMult: 0.4, hesitation: 4, raiseMult: 2, tellMult: 0.8,
    voice: 'auc',           // one recorded voice for every gavel (set 'ray' to probe a ray_ bank; scripted in docs/VOICE_SCRIPT.md, not planned)
  },
  // Bent Fork, side B: the Reverend. Slow gavel, everybody gets talked back in, and the yard gossips.
  lyle: {
    id: 'lyle', name: 'Rev. Lyle Pettibone', blurb: 'slow gavel, sermons between bids, folded hands come back.',
    face: 'lyle',
    bidPace: 1.8, foldPace: 1.0, voGap: 0.5, turnBeat: 1.2,
    pressMult: 1.7, rejoinMult: 2, hesitation: 12, raiseMult: 1, tellMult: 1.6,
    voice: 'auc',           // same: Buzz's bank; 'lyle' would probe a lyle_ bank
  },
};
// does this town change gavels day to day?
function townHasGavels() { return Array.isArray(townRule('auctioneer')); }
function curAuctioneer(day) {
  const a = townRule('auctioneer');
  if (Array.isArray(a)) {
    const R = RNG(strHash('gavel_' + G.worldSeed + '_' + (day || G.day) + '_' + curTown().id));
    return AUCTIONEERS[R.pick(a)] || AUCTIONEERS.default;
  }
  const who = AUCTIONEERS[a] || AUCTIONEERS.default;
  // Buzz's week off (memory.js, the beat sheet's day 28): the Reverend covers every sale Buzz would have called
  if (who.id === 'default' && typeof buzzAwayOn === 'function' && buzzAwayOn(G.world, day || G.day)) return AUCTIONEERS.lyle;
  return who;
}

function curTown() {
  return TOWNS[(G.world && G.world.town) || 'dustyFlats'] || TOWNS.dustyFlats;
}

// gate check: [ok, [{label, ok}]] — the clerk goes down his little list
function townGateStatus(town) {
  if (!town.gate) return { ok: true, checks: [] };
  const checks = [];
  if (town.gate.bidderNumber) checks.push({ label: 'a bidder number', ok: !!G.world.bidderNumber });
  if (town.gate.vanCap) checks.push({ label: 'a van that is not embarrassing (' + town.gate.vanCap + '+ bulk)', ok: G.vanCap >= town.gate.vanCap });
  if (town.gate.netWorth) checks.push({ label: 'a name the clerk has heard (' + fmt$(town.gate.netWorth) + ' net worth)', ok: netWorth() >= town.gate.netWorth });
  return { ok: checks.every((c) => c.ok), checks };
}
