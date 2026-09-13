// bb-teaser-gen.js — the teaser's generation and rules. No DOM in here, so
// tools/teaser_check.js can run it headless. Everything that decides what is
// in the unit comes from the game's own code in bb-core.js (genLocker,
// makeItem, the archetypes, the pools, the sprites); this file only picks a
// plan, keeps the result bounded, and knows the teaser's few extra rules
// (the van, the finds, the summary).
'use strict';

// ---- the globals the game's core expects from the files the teaser does not load ----
// The core reads G.world for tools (none here), visited towns (none) and the
// town. It never writes a save: the Store adapter is never called.
var G = { world: { tools: [], visited: [], town: 'dustyFlats', setsAppraised: [], openSets: [] }, cur: null, day: 9, worldSeed: 1, today: null };
// paper (bills, letters, photographs) pins to THE BOARD in the full game; the teaser has no board
function rollPaper() { return null; }
// false bottoms (home.js): the odds LOOK CLOSER uses, so the sensory tells match the game
const HIDDEN_RATES = {
  trunk: 0.25, dresser: 0.15, suitcase: 0.18, filing: 0.12,
  wardrobe: 0.12, box: 0.05, crate: 0.08, guitarCase: 0.15,
};

const TEASER = {
  COLS: 5,            // the game's 5x5 unit: compact, still three rows deep
  MAX_FINDS: 16,      // discoveries (things on the floor + what is inside them), hard cap
  MIN_FINDS: 5,
  UNIT_MIN: 3, UNIT_MAX: 148,
  DAY_CAP: 2600,      // the game's value clamp for a day-9 door in Dusty Flats
  VAN_FRAC: 0.45,     // the van takes about this much of what came out, by bulk
  VAN_MIN: 8, VAN_MAX: 18,
  MYTH_RATE: 0.06,    // a legend, or its fake, in a box
  REROLL_TRIES: 12,
};
// what kind of door: the game's contracts, weighted for a teaser (no set teases —
// a set only pays off across days; no story doors — they are authored for a career)
const TEASER_CONTRACTS = [['themeShowcase', 42], ['junkPile', 28], ['cashBox', 18], ['emptyFlex', 7]];

// Dusty Flats, with two of the other towns' habits borrowed so a teaser door
// is never dull: Salt Lick's sleeper in a bag, Marrow Creek's named junk rate
const TEASER_TOWN = Object.assign({}, TOWNS.dustyFlats, { sleeperRate: 0.3, namedJunkRate: 0.09 });

// a 32-bit seed from the crypto well, or a number from the address bar
function freshSeed() {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] >>> 0;
    }
  } catch (e) { /* fall through */ }
  return (Math.floor(Math.random() * 4294967296) ^ (Date.now() & 0xffffffff)) >>> 0;
}
function parseSeed(s) {
  if (s == null || s === '') return null;
  const str = String(s).trim();
  if (/^\d{1,10}$/.test(str)) { const n = Number(str); if (n <= 4294967295) return n >>> 0; }
  return strHash(str);                                     // words work too: ?seed=raccoon
}
// the arrangement, as a string, so two lockers in a row are never the same picture
function lockerSignature(lk) {
  return lk.items.map((it) => it.base + '@' + it.layer + ':' + it.col + (it.onUid ? '^' : '')).sort().join(' ');
}

function countFinds(lk) {
  let n = 0;
  for (const it of lk.items) { n++; if (it.loot) n += it.loot.length; }
  return n;
}
// keep the unit bounded: too many things and the fullest boxes give some back
// (never the myth, never the sleeper, never a named thing, never the cash box's money)
function boundFinds(lk) {
  const keep = (l) => l.legendary || l.fake || l.sleeper || l.named || l.lux;
  let guard = 60;
  while (countFinds(lk) > TEASER.MAX_FINDS && guard-- > 0) {
    const holders = lk.items.filter((it) => it.loot && it.loot.some((l) => !keep(l)))
      .sort((a, b) => b.loot.length - a.loot.length);
    if (!holders.length) break;
    const h = holders[0];
    const i = h.loot.findIndex((l) => !keep(l));
    h.loot.splice(i, 1);
  }
  // still too full (every box holds something special): the cheapest loose junk on
  // the floor goes to the scrap man before the door opens. Taking a thing off the
  // floor only ever unblocks what was behind it.
  guard = 20;
  while (countFinds(lk) > TEASER.MAX_FINDS && guard-- > 0) {
    const loose = lk.items.filter((it) => it.cat === 'junk' && !(it.loot && it.loot.length) && !it.stackedUid && !it.onUid && !keep(it))
      .sort((a, b) => a.val - b.val);
    if (!loose.length) break;
    lk.items.splice(lk.items.indexOf(loose[0]), 1);
  }
  return lk;
}

// ---- one teaser locker from one seed. Same seed, same unit, every time. ----
function makeTeaserLocker(seed) {
  seed = seed >>> 0;
  const R = RNG(seed);
  const town = TEASER_TOWN;
  GEN_TOWN = town;                                   // the condition roll asks here (items.js)
  const archId = pickArch(R, null, { director: {} }, {}, town);
  const contract = R.wpick(TEASER_CONTRACTS);
  const plan = {
    archId, contract, town, cols: TEASER.COLS, day: 9,
    dayCap: TEASER.DAY_CAP, priceMult: 1, bidStep: town.bidStep || 25,
    personasSeen: {},
  };
  // the myth slot: the full game runs a calendar; the teaser rolls dice
  if (contract !== 'emptyFlex' && R.chance(TEASER.MYTH_RATE)) {
    const base = R.pick(LEGENDARY_BASES).id;
    const real = R.chance(0.6);
    plan.myth = { base: real ? base : MYTH_FAKES[base], real };
  }
  const num = R.i(TEASER.UNIT_MIN, TEASER.UNIT_MAX);
  const lk = genLocker(R, num, [], plan);
  boundFinds(lk);
  lk.seed = seed;
  lk.sig = lockerSignature(lk);
  lk.label = (ARCHETYPES[archId] || {}).label || 'Storage Unit';
  lk.price = lk.minBid;                              // what the hammer falls at, rivals or no rivals
  // one strong sensory tell per door, like the day generator does
  const tellers = lk.items.filter((it) => it.loot && it.loot.length);
  if (tellers.length) tellers[R.i(0, tellers.length - 1)].tellOk = true;
  return lk;
}

// a fresh locker that does not repeat the last arrangement (or is thin, or is a
// door with nothing behind it two times running)
function nextTeaserLocker(lastSig, seedOverride) {
  if (seedOverride != null) return makeTeaserLocker(seedOverride);
  let lk = null;
  for (let t = 0; t < TEASER.REROLL_TRIES; t++) {
    lk = makeTeaserLocker(freshSeed());
    if (lk.sig !== lastSig && countFinds(lk) >= TEASER.MIN_FINDS) return lk;
  }
  return lk;
}

// ---- what the door says (the peek) ----
function teaserDoorLine(lk) { return '“' + lk.flavor + '”'; }
function teaserOwnerLine(lk) { return lk.owner; }
// the front row, left to right, what a tap on it says (the game's own peek hint)
function frontRow(lk) {
  return lk.items.filter((it) => it.layer === 2).sort((a, b) => a.col - b.col || (a.onUid ? 1 : -1));
}
function baseName(it) { return (BASE_BY_ID[it.base] || {}).name || it.name; }

// ---- the dig ----
// the pile, front to back, what is still in the unit (the game's dig grid order)
function pileOrder(lk) {
  return lk.items.slice().sort((a, b) => (b.layer - a.layer) || (a.col - b.col) || ((a.onUid ? 0 : 1) - (b.onUid ? 0 : 1)));
}
function accessibleNow(lk) { return lk.items.filter((it) => isAccessible(it, lk.items)); }

// the line under a find: its own note first, then what it did when you lifted it,
// then what a closer look finds, then what the yard would say about its kind
const CAT_QUIPS = {
  furniture: 'Buyers like furniture clean.', antiques: "Antique Alice's territory.",
  music: 'Riff Randy pays for music gear.', tools: "Gearhead Gina's kind of thing.",
  electronics: 'Worth more if it still works.', collectibles: 'The right collector pays up.',
  weird: 'Creepy Carl pays triple for weird.', jewelry: 'Small, shiny, valuable.',
  junk: 'Scrap weight, mostly.', cash: 'Money is money.',
};
function findDetail(it) {
  if (it.cash) return 'It converts the moment you touch it.';
  if (it.legendary) return 'Everyone in the county has a story about this. Heavier than it looks.';
  if (it.fake) return sensoryLine(it) || 'Heavier than it looks. Probably.';
  if (it.sleeper) return 'Somebody put this in a bag on purpose. Salt Lick’s whole lesson.';
  if (it.note) return it.note;
  if (it.blurb) return it.blurb;
  if (it.loot && it.loot.length) return sensoryLine(it) || 'Something shifts inside.';
  if (it.container && it.locked) return 'Locked. A locksmith could open it. You are not a locksmith, but you have a screwdriver.';
  if (it.container) return sensoryLine(it) || 'Hollow. It rattles like an empty thing.';
  const d = detailLine(it);
  if (d) return d;
  return CAT_QUIPS[it.cat] || '';
}
// what a find is worth on the card: a legend or its fake stays a claim until an appraiser looks
function findValueLabel(it) {
  if (it.legendary || it.fake) return 'needs an appraiser';
  return fmt$(it.val);
}
function findTier(it) {
  if (it.legendary || it.fake) return { name: 'LEGENDARY', col: PAL.gold };
  return tierOf(it.val);
}
// pull one thing out of the unit: it leaves the floor, its contents come with it
// (the full game opens boxes at home; a teaser opens them on the tailgate)
function pullFind(lk, it) {
  const i = lk.items.indexOf(it);
  if (i < 0 || !isAccessible(it, lk.items)) return null;
  lk.items.splice(i, 1);
  const finds = [it];
  if (it.loot && it.loot.length) for (const l of it.loot) finds.push(l);
  it.opened = true;
  return finds;
}

// ---- the van ----
function vanCapFor(finds) {
  let bulk = 0;
  for (const f of finds) if (!f.cash) bulk += f.size || 1;
  return clamp(Math.round(bulk * TEASER.VAN_FRAC), TEASER.VAN_MIN, TEASER.VAN_MAX);
}
function trueVal(it) { return it.val; }

// ---- the haul summary ----
const ARCH_DONE_LINES = {
  hoarder: "A hoarder's, this lot. The {door} by the door said as much.",
  musician: "Musician's storage. You could tell from the {door}.",
  grandma: "Grandma's estate. You could tell from the {door}.",
  workshop: 'A workshop, cleared out. The {door} up front gave it away.',
  shopStock: 'Dead shop stock. The {door} at the door was the tell.',
  smuggler: "Somebody's cache. The {door} in the doorway should have told you.",
  timeCapsule: 'A time capsule, all of it. The {door} up front was the year.',
  officeSurplus: 'Office surplus. The {door} by the door said so, in triplicate.',
  oddball: 'Nobody normal packed this. The {door} was the warning.',
};
function haulSummary(lk, finds, kept, price) {
  let keptVal = 0, cash = 0, leftVal = 0, keptBulk = 0;
  let best = null;
  for (const f of finds) {
    if (f.cash) { cash += f.val; continue; }
    if (kept.includes(f)) { keptVal += f.val; keptBulk += f.size || 1; if (!best || f.val > best.val) best = f; }
    else leftVal += f.val;
  }
  const worth = keptVal + cash;
  const lines = [];
  if (lk.doorTell && ARCH_DONE_LINES[lk.archId]) lines.push(ARCH_DONE_LINES[lk.archId].replace('{door}', lk.doorTell));
  else lines.push('It was ' + (/^[aeiou]/i.test(lk.label) ? 'an ' : 'a ') + lk.label.replace(/^(the )/i, '').toLowerCase() + '.');
  for (const f of finds) {
    if (f.legendary) lines.push(kept.includes(f) ? 'The appraiser went quiet. It is real. ' + f.name + ': ' + fmt$(f.val) + '.' : 'You left ' + f.name + ' in the dark. It was real.');
    else if (f.fake) lines.push((kept.includes(f) ? 'The appraiser picked it up and put it down. ' : 'You left ') + f.name + (kept.includes(f) ? ': ' : ' behind. ') + (BASE_BY_ID[f.base].fakeTag || 'a fake') + ', worth ' + fmt$(f.val) + '.');
  }
  if (!kept.length && !cash) lines.push('You drove home empty. The scrap man got the rest.');
  else if (!kept.length) lines.push('Nothing in the van but the money. Light on gas, at least.');
  else if (leftVal > worth) lines.push('You left more in the dark than you drove home with. That is the game.');
  else if (leftVal > 0) lines.push('The scrap man got ' + fmt$(leftVal) + ' of it. He usually does.');
  else lines.push('Nothing left behind. Pete will be pleased.');
  const net = worth - price;
  let headline;
  if (net >= 1500) headline = 'A number with a comma in it.';
  else if (net >= 400) headline = 'A good day. Nobody saw it coming.';
  else if (net >= 0) headline = 'You made gas money. Honest work.';
  else if (!kept.length && !cash) headline = 'Blind buy. Empty van.';
  else headline = 'The door lied. Doors do.';
  return { keptVal, cash, worth, leftVal, keptBulk, best, net, lines, headline };
}

// what the teaser tells a test harness or the page about a locker, in one object
function describeLocker(lk) {
  return {
    seed: lk.seed, num: lk.num, arch: lk.archId, label: lk.label, contract: lk.contract,
    items: lk.items.length, finds: countFinds(lk), value: lk.value, price: lk.price, sig: lk.sig,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeTeaserLocker, nextTeaserLocker, pullFind, accessibleNow, pileOrder, frontRow, haulSummary, vanCapFor, countFinds, describeLocker, parseSeed, TEASER };
}

// ---- locker geometry and the front-to-back rule (from js/game.js, verbatim) ----
// the teaser does not load game.js (it is the whole game), so the four things
// the dig needs from it live here, unchanged
const RS = 2;                                                     // sprite render scale (art px -> logical px)
const LK = { cols: 8, colW: 100, pad: 8, frameW: 816, frameH: 320 };
function itemDrawPos(lx, ly, it) {
  const spr = SPRITES[it.spr] || SPRITES.mystery;
  const floorY = ly + LK.frameH - 14;
  const bottoms = [floorY - 56, floorY - 28, floorY];
  const w = spr.w * RS, h = spr.h * RS;
  const x = lx + LK.pad + it.col * LK.colW + Math.floor((LK.colW * it.wCols - w) / 2);
  const y = bottoms[it.layer] - (it.liftPx || 0) * RS - h;
  return { x, y, w, h };
}
function isAccessible(it, items) {
  if (it.stackedUid && items.some((o) => o.uid === it.stackedUid)) return false;
  const a0 = it.col, a1 = it.col + it.wCols - 1;
  for (const o of items) {
    if (o === it || o.layer <= it.layer) continue;
    const b0 = o.col, b1 = o.col + o.wCols - 1;
    if (a0 <= b1 && b0 <= a1) return false;
  }
  return true;
}
function lkFrameW(lk) { return ((lk && lk.cols) || LK.cols) * LK.colW + 2 * LK.pad; }
// what the yard says about a thing in the front row (js/game.js peekHint, verbatim)
function peekHint(it) {
  const b = BASE_BY_ID[it.base];
  let tip;
  if (it.locked) tip = 'locked — a locksmith could open it';
  else if (it.base === 'droppings') tip = 'he was here. He may still be. Listen.';
  else if (it.censored) tip = 'the office blurred that one. Nobody will say why.';
  else if (it.container) tip = 'has storage — could hold anything. Or nothing.';
  else tip = ({
    furniture: 'buyers like furniture clean', antiques: "Antique Alice's territory",
    music: 'Riff Randy pays for music gear', tools: "Gearhead Gina's kind of thing",
    electronics: 'worth more if it still works', collectibles: 'the right collector pays up',
    weird: 'Creepy Carl pays triple for weird', jewelry: 'small, shiny, valuable',
    junk: 'scrap weight, mostly', cash: 'money is money',
  })[it.cat] || CATS[it.cat].label;
  return b.name + (it.tag ? ' (marked "' + it.tag + '")' : '') + '  —  ' + tip;
}
