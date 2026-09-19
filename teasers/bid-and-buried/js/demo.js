// ---- demo states: one screen, built from the seed, for screenshots and playtest sheets ----
// Open the game with ?demo=<name> and it lands on that screen in a known
// state (seed 4242, day 12, Salt Lick): tools/shots.py takes the nine
// Steam-style screenshots this way. Nothing here is reachable from play.
'use strict';

const DEMO_SEED = 4242;
function demoBase(day, town) {
  newGame(DEMO_SEED);
  G.world.opening = false;
  G.world.bidderNumber = true;
  G.world.tools = ['flashlight', 'mirror', 'loupe'];
  G.world.visited = ['dustyFlats', town || 'saltLick'];
  G.world.town = town || 'saltLick';
  G.world.noArcs = true;         // screenshots and the trailer stay out of Bart's week
  G.day = day || 12;
  G.money = 3200;
  startDay();
  G.toast = null;
}
// a won door, dug a few pulls in
function demoDig(pulls, leaveOne) {
  demoBase();
  G.cur = G.today.lockers[1];
  G.cur.won = true; G.cur.paid = 300;
  startDig();
  for (let i = 0; i < pulls; i++) {
    const acc = G.cur.items.filter((it) => isAccessible(it, G.cur.items));
    if (!acc.length) break;
    acc.sort((a, b) => b.val - a.val);
    pullItem(acc[0]);
    if (G.mode === 'reveal') endReveal();
    if (G.inspect && !(leaveOne && i === pulls - 1)) decideInspect(true);
  }
  G.toast = null;
}
const DEMOS = {
  paper: () => { demoBase(); G.mode = 'paper'; },
  yard: () => { demoBase(); G.mode = 'yard'; },
  peek: () => { demoBase(); G.cur = G.today.lockers[1]; G.peekT = 1; G.mode = 'peek'; },
  auction: () => { demoBase(); G.cur = G.today.lockers[1]; G.peekT = 1; startAuction(); if (G.mode === 'npcIntro') npcIntroEnd(); playerBid(curTown().bidStep); },
  dig: () => { demoDig(4, true); },
  home: () => {
    demoDig(6, false);
    driveHome();
    goHome();
    G.homeTab = 'stash'; G.sellSel = 0;
    const it = G.stash.find((x) => x.loot) || G.stash[0];
    if (it) { G.sellSel = G.stash.indexOf(it); openInspect(it); }
    G.toast = null;
  },
  map: () => { demoBase(); G.mapSel = 'gypsumCity'; G.mode = 'map'; },
  tv: () => { demoBase(); G.mode = 'sell'; tvStart(COMMERCIAL_BY_ID.pete, 'sell'); G.demoFreeze = true; },   // back to the garage it aired in: a demo has no day to summarise
  reveal: () => {
    demoDig(3, false);
    const it = makeItem('goldJacket', RNG(7));
    it.legendary = true; it.searched = true; it.cond = 'Mint'; it.name = BASE_BY_ID.goldJacket.name;
    startReveal(it, 'myth');
    G.reveal.t = 3.4;
  },
  museum: () => {
    demoBase();
    const R = RNG(5);
    const mk = (b) => { const it = makeItem(b, R); it.searched = true; it.cond = 'Clean'; return it; };
    const leg = mk('moonRock'); leg.legendary = true; leg.name = BASE_BY_ID.moonRock.name; leg.val = 4200;
    const deed = { uid: nextUid(), hseed: 4177, base: 'deed', cat: 'antiques', spr: 'deed', size: 1, pal: 'gold', cond: 'Mint',
      name: 'Deed to the Dusty Flats Storage Yard', val: 90000, searched: true, yardDeed: true, layer: 0, col: 0, wCols: 1 };
    G.trophies = [mk('typewriter'), leg, mk('radio'), mk('camera'), deed];
    const def = SETS.tourBag, br = def.brands[0];
    for (const role in def.roles) for (let i = 0; i < def.roles[role].n; i++) { const p = makeItem(def.roles[role].base, R, { setId: 'tourBag', role, brand: br, brandLocked: def.brandLocked.includes(role) }); p.searched = true; G.stash.push(p); }
    assembleSet('tourBag', br[0]);
    if (G.mode === 'reveal') endReveal();
    G.modal = null;
    const set = G.stash.find((x) => x.setComplete);
    if (set) keepTrophy(set);
    G.world.clippings = [
      { id: 'a', img: 'cb_legend', headline: 'LOCAL BIDDER FINDS THE MOON ROCK', day: 4, town: 'dustyFlats' },
      { id: 'b', img: 'cb_van', headline: 'VAN PACKED TO THE ROOF', day: 9, town: 'saltLick' },
      { id: 'c', img: 'cb_set', headline: 'THE TOUR BAG, REASSEMBLED', day: 11, town: 'saltLick' },
    ];
    G.mode = 'sell'; G.homeTab = 'trophy'; G.sellSel = 1;
    G.toast = null;
  },
  summary: () => {
    demoDig(6, false); driveHome();
    G.world.events.push({ k: 'left', day: G.day, town: G.world.town, unit: G.cur.num, name: 'Oak Dresser', base: 'dresser', val: 400 });
    G.dayStats.raisesBy = { sal: 5 };
    G.mode = 'sell'; endDay(); if (G.mode === 'tv') tvEnd();
    G.toast = null;
  },
  ledger: () => { demoBase(); openCodex('people'); },
  books: () => {
    demoBase();
    bump('spentAuction', 4325); bump('sales', 6120); bump('gas', 105); bump('won', 9); bump('lost', 4);
    bumpIn('townWins', 'dustyFlats', 6); bumpIn('townWins', 'saltLick', 3); bumpIn('beat', 'sal', 4); bumpIn('beatenBy', 'bart', 3);
    bump('abandoned', 31); bump('abandonedValue', 1240); bump('boxes', 22); bump('edFooled', 1); bump('garbage', 7); bump('petesTake', 410); bump('oddJobs', 3);
    bookDoor(1410, 533, 'a shop that closed'); bookDoor(-620, 901, 'a grandma');
    checkAchievements();
    openCodex('books');
  },
  // the flag (docs/APPRAISAL.md phase 1): a fake Moon Rock, self-appraised, wearing the legend's price
  flag: () => {
    demoBase();
    const fake = makeItem('fakeRock', RNG(99));
    G.stash = [fake];
    searchItem(fake);
    G.mode = 'sell'; G.homeTab = 'stash'; G.sellSel = 0; G.sellScroll = 0;
    G.toast = null;
  },
  // Pete's two prices (docs/APPRAISAL.md phase 2): the same fake, and the conversation open
  pawn: () => {
    DEMOS.flag();
    peteTalk(G.stash[0]);
  },
  // the verdicts (docs/APPRAISAL.md phase 3): the appraiser in town, Alice too, a flagged fake and a flagged brand claim
  verdict: () => {
    DEMOS.flag();
    G.today.appraiser = true;
    G.today.specialists = [{ def: BUYERS.find((b) => b.id === 'alice'), cash: 800 }, G.today.specialists[0]];
    const fb = Object.values(BASE_BY_ID).find((b) => b.brands && !b.legendary && !b.setOnly && !b.cash && b.cat === 'furniture').id;
    let br = null;
    for (let s = 1; s < 200 && !(br && br.brandM >= 2); s++) { br = makeItem(fb, RNG(s)); br.hideBrand = false; br.preName = null; }
    G.stash.push(br);
    searchItem(br);
    G.sellSel = 0;
  },
  // the paper, afterwards (docs/APPRAISAL.md phase 4): a real thing sold blind two days ago, and Pete has gone to the city
  pawnpaper: () => {
    demoBase();
    let uid = 1;
    while (uid < 2000 && soldBlindNote(G.worldSeed, { k: 'soldBlind', day: G.day - 2, uid, real: true }) !== 'story') uid++;
    G.world.events.push({ k: 'soldBlind', day: G.day - 2, town: G.world.town, uid, base: 'guitar', name: 'Signed Guitar', claim: 500, paid: 135, gamble: true, real: true, val: 1000 });
    G.paper = genPaper(G.worldSeed, G.day, G.today, G.foundLegends, G.seenStories, G.world, G.vanCap);
    G.mode = 'paper';
  },
  // the paperwork (docs/APPRAISAL.md phase 5): a certificate on the board, naming a thing a few days out
  paperwork: () => {
    demoBase();
    const pit = makeItem('paper', RNG(3)); pit.paper = { id: 'certificate' };
    paperFound(pit);
    const pit2 = makeItem('paper', RNG(4)); pit2.paper = { id: 'receipt' };
    paperFound(pit2);
    G.mode = 'sell'; G.homeTab = 'board'; G.sellSel = -1; G.boardScroll = 0;
    G.toast = null;
  },
  // the item card (docs/APPRAISAL.md phase 6): a real Moon Rock, found on day 9, named by Mrs. Odell today
  itemcard: () => {
    demoBase();
    const leg = makeItem('moonRock', RNG(21));
    leg.fromDay = 9; leg.fromUnit = 118; leg.fromTown = 'saltLick';
    G.stash = [leg];
    searchItem(leg);
    G.today.appraiser = true; G.world.appraiserUsed = null;
    deliverVerdict(leg, 'appraiser');
    G.mode = 'sell';
    itemCardStart(leg, null, 'sell', false);
    G.itemCard.snap = true; G.itemCard.stung = true;
    G.toast = null;
  },
  // the piles (docs/APPRAISAL.md phase 7): two things on hold, the HOLDING view open on one of them
  hold: () => {
    demoDig(6, false);
    driveHome();
    goHome();
    for (const it of G.stash) if (!it.searched && !it.loot && !it.locked) searchItem(it);      // the haul comes home unappraised
    const searched = G.stash.filter((it) => it.searched && !it.loot && !it.locked && !it.cash);
    let held = 0;
    for (const it of searched) { if (held >= 2) break; const hb = holdForBuyer(it); if (hb) { holdItem(it, hb); held++; } }   // held for their buyer, in the stash
    G.homeTab = held ? 'keeps' : 'stash'; G.sellSort = 'new'; G.sellSel = 0; G.sellScroll = 0;
    G.modal = null; G.toast = null;
  },
  // RUN THEM UP: a rival pushed past their own number, the room asking STOP HERE or ONE MORE
  runup: () => {
    DEMOS.auction();
    const au = G.auction;
    const t = au.npcs.find((n) => n.active && !n.crowd);
    if (!t) return;
    au.queue.length = 0; au.holdVO = false; au.beat = false; au.turnT = 0; au.closing = 0; au.roomHeld = false; G.modal = null;
    au.bid = Math.ceil(Math.max(au.bid, t.cap) / au.step) * au.step + au.step;   // a real paddle number: a step past theirs au.leader = t; t.everLed = true; t.topRaise = au.bid;
    au.shownBid = au.bid; au.shownLeader = t.def.name;
    au.runUp = { id: t.def.id, to: au.bid + 8 * au.step, askedPride: false };
    const pool = (FACE_TELLS[t.def.id] || FACE_TELLS_ANY).pride;
    au.events = [{ kind: 'pride', who: t.def.id, text: pool[0].replace(/\{name\}/g, shortRivalName(t.def)) }];
    runUpTick(au, 0.1);
  },
  // a rival's splash card, held at the end of its flourish
  rival: () => {
    demoBase();
    G.world.events.push({ k: 'lost', day: 6, town: 'saltLick', unit: 118, contested: true, rival: 'dutch' },
      { k: 'won', day: 8, town: 'saltLick', unit: 204, fought: ['dutch'] },
      { k: 'won', day: 11, town: 'saltLick', unit: 331, fought: ['dutch', 'sal'] });
    npcIntroQueue(['dutch'], 'yard');
    G.npcIntro.snap = true; G.npcIntro.slammed = true;
    G.demoFreeze = true;
  },
  arrive: () => { demoBase(); startArrive(TOWNS.saltLick, TOWNS.saltLick.arrival[0]); G.arrive.t = 2.8; G.demoFreeze = true; },
  credits: () => { demoBase(); startCredits('title'); G.credits.y = 30; },
  title: () => { G.mode = 'title'; },
};
function demoState(name) {
  const fn = DEMOS[name];
  if (!fn) return false;
  G.demo = true;                 // saveGame refuses while a demo state is up
  G.demoFreeze = false;
  fn();
  return true;
}
(() => {
  if (typeof location === 'undefined') return;
  const m = /[?&]demo=([A-Za-z]+)/.exec(location.search);   // a capital in a state name must not silently miss
  if (m) demoState(m[1]);
})();
