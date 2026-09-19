// ---- paper: the only thing in a unit worth nothing that is still worth taking ----
// Phase 1 of docs/EPHEMERA.md: the object, THE BOARD, and two kinds of paper.
//
//   bill     an auction bill for a sale a few days out, in a town you can reach.
//            Finding one does not predict the future, it PLANS it: the promise is
//            written onto the world (`world.papers`) and `genDay` honours it when
//            that morning comes, so a bill is true by construction, never a guess.
//   catalog  a torn catalog page that prints a whole set at once, so a half-built
//            set stops being a surprise and becomes a list you are working from.
//
// Paper is generated blank — genLocker only decides whether a unit has one and what
// kind. Everything it actually says is filled in the moment you find it (`paperFound`),
// because that is when the town, the day and the sets you are chasing are known.
// It never reaches the stash, costs no van space, and cannot be sold.
'use strict';

const PAPER_RATE = 0.08;            // units carrying a piece of paper
const BILL_DAYS = [2, 6];           // how far out a bill's sale is, from the day you read it
const LETTER_DAYS = [3, 8];         // how far out the same person's other unit comes up
const PHOTO_DAYS = [2, 7];          // how far out the photographed room turns up

// what a printed bill shouts about each kind of unit. All caps, cheap ink, one breath.
const BILL_COPY = {
  hoarder: 'FULL UNIT — CONTENTS OF A LIFETIME — NOTHING SORTED, NOTHING PULLED',
  musician: 'MUSICAL — INSTRUMENTS, AMPS, ROAD CASES — ONE OWNER, ONE BAND',
  grandma: 'ESTATE LOT — FURNITURE, LINENS, GLASS, JEWELRY — A WHOLE HOUSE',
  workshop: 'SHOP CONTENTS — TOOLS, BENCHES, HARDWARE, ODD LOTS — BRING A TRUCK',
  shopStock: 'RETAIL LIQUIDATION — FIXTURES, SMALLWARES, STOCK ON HAND',
  smuggler: 'SOLD AS-IS. NO DESCRIPTION AVAILABLE. NO EXCEPTIONS. NO REFUNDS.',
  timeCapsule: 'UNOPENED SINCE THE OWNER STOPPED PAYING — SEALED, DUSTED, UNTOUCHED',
  oddball: 'CONTENTS UNKNOWN. VIEWING FROM THE DOORWAY ONLY. BRING YOUR OWN LIGHT.',
  officeSurplus: 'COMMERCIAL LOT — DESKS, FILES, CHAIRS, ELECTRONICS — CLEARED IN ONE DAY',
};
// the small print, rotated so two bills never read quite the same
const BILL_TERMS = [
  'CASH ONLY · AS-IS, WHERE-IS · ALL SALES FINAL',
  'BIDDER NUMBER REQUIRED · UNIT MUST BE CLEARED SAME DAY',
  'NO EARLY VIEWING · DOORWAY ONLY · BRING YOUR OWN LOCK',
  'CASH ONLY · THE YARD IS NOT RESPONSIBLE FOR ANYTHING',
  'ALL UNITS SOLD BY THE UNIT · NOTHING SOLD PIECEMEAL',
];
const BILL_HEADS = ['PUBLIC AUCTION', 'STORAGE AUCTION', 'LIEN SALE', 'AUCTION NOTICE', 'DELINQUENT UNIT SALE'];

// ---- Phase 2: the letter and the receipt ----
// A letter is the only thing in the game that puts a NAME on a unit. The office
// never says one out loud (`OWNER_LINES` are all anonymous on purpose) — the
// paperwork does. Finding one promises that person's other unit, days out.
const LETTER_HEADS = [
  { id: 'rent', from: 'PAST DUE — RENT NOTICE', line: 'Unit contents subject to lien sale if the balance is not settled.' },
  { id: 'kin', from: 'A LETTER, HANDWRITTEN', line: 'We cannot keep paying for a room full of things nobody is going to want.' },
  { id: 'bank', from: 'NOTICE OF CLOSURE', line: 'The account referenced above has been closed. This is our final correspondence.' },
  { id: 'returned', from: 'RETURNED TO SENDER', line: 'NO SUCH ADDRESS · NOT KNOWN AT THIS NUMBER · DO NOT FORWARD' },
  { id: 'insure', from: 'POLICY LAPSE NOTICE', line: 'Coverage on the stored property has lapsed. The property remains stored.' },
];
// names for a unit whose owner was nobody in particular
const LETTER_NAMES = [
  'Arthur Selby', 'Bernice Thorpe', 'Clifford Novak', 'Doreen Hartnett', 'Eugene Mabry',
  'Frances Ivey', 'Gerald Bexley', 'Harriet Dunphy', 'Irene Lamphere', 'Jerome Wexler',
  'Kathleen Rasch', 'Leonard Oberlin', 'Marlene Kilgore', 'Norman Farrow', 'Opal Underhill',
  'Ramona Quillen', 'Stanley Ekstrom', 'Thelma Gilliam', 'Vernon Alderman', 'Curtis Yates',
];

// A receipt settles what one of the eleven myth objects actually is, before you ever
// bid on it. It does not remove the burn — every myth you have no paper for still
// wears the legend's face — it just means this one time you can know.
const RECEIPT_HEADS = [
  { id: 'appraisal', from: 'CERTIFICATE OF APPRAISAL', by: 'examined and reported by' },
  { id: 'pawn', from: 'PAWN TICKET', by: 'taken in and held by' },
  { id: 'insure', from: 'SCHEDULE OF INSURED ITEMS', by: 'listed and valued by' },
  { id: 'estate', from: 'ESTATE INVENTORY', by: 'catalogued by' },
];
const RECEIPT_HOUSES = ['Halloran & Sons', 'Kestrel Appraisal Co.', 'M. Dunphy, Valuer',
  'The Bonded Assay Office', 'Rideout Brothers', 'County Estate Services'];
// what the paper concludes, either way
const RECEIPT_REAL = ['GENUINE. Documented and consistent throughout.', 'AUTHENTIC — provenance holds up under examination.',
  'NO GROUNDS TO DOUBT IT. It is what it is claimed to be.', 'VERIFIED. The marks are right and they are old.'];
const RECEIPT_FAKE = ["A REPRODUCTION. Convincing at arm's length. Not at six inches.",
  'NOT GENUINE. The materials are wrong and they are new.', 'A COPY, and not an especially careful one.',
  'WITHOUT MERIT. Whoever sold this knew exactly what they were doing.'];

// ---- Phase 3: the photograph and the packing list ----
// These two look backwards and forwards instead of sideways. A photograph is about
// DIGGING — it pictures a room you have not stood in yet, and one thing in it that
// will be in the dark rows, so you spend daylight you would otherwise have saved.
// A packing list is about the haul you already have: what was in that unit when
// somebody sealed it, ticked against what actually came home.
const PHOTO_ROOMS = [
  'A living room, shot from the doorway. Somebody is out of frame.',
  'A garage, strip light on, everything squared away for the last time.',
  'A back bedroom with the bed already gone.',
  'A shop counter, closed sign turned, stock still on the shelves.',
  'A kitchen at night. The flash has caught the window.',
  'A porch in summer. Half the picture is the dog.',
  'A basement, boxes to the ceiling, one aisle left through them.',
  'A hallway, framed photographs down one wall, all of them turned around.',
];
// things worth photographing, and worth digging for
const PHOTO_THINGS = [['guitar', 4], ['radio', 3], ['typewriter', 3], ['camera', 3], ['stereo', 2],
  ['neon', 2], ['trunk', 3], ['dresser', 2], ['china', 3], ['vase', 2], ['amp', 2], ['globe', 2],
  ['mirror', 2], ['harmonica', 2], ['watch', 1], ['medal', 2]];

// A list is the one kind of paper this game lets be WRONG, because a manifest is
// exactly the document that goes out of date. It is never only a lie: every stale
// list carries the tell that gives it away, printed on its face, so reading it
// carefully beats both trusting it and ignoring it.
const LIST_HEADS = ['CONTENTS — DO NOT LOSE', 'PACKED BY:', 'INVENTORY, UNIT', 'WHAT WENT IN', 'BOX LIST'];
const LIST_STALE = [
  { id: 'earlier', tell: 'One line is crossed out in different ink.', line: 'somebody got to this before the yard did' },
  { id: 'wrongUnit', tell: 'The unit number at the top has been written over twice.', line: 'this list was packed for a different door' },
  { id: 'olddate', tell: 'The date is four years before the rent stopped.', line: 'they packed it, then kept coming back' },
];

// ---- Phase 5 of docs/APPRAISAL.md: the certificate ----
// A typed certificate, an authentication card, a repair ticket that names the maker.
// Paperwork is the free route to a verdict, and the one that can convict: a receipt
// settles a legend's flag, a photograph vouches for the thing it pictured, and a
// certificate settles a maker's mark — either the one you are already holding (the
// payoff) or one a few days out that the world then makes true (the lead).
const CERT_HEADS = [
  { id: 'coa', from: 'CERTIFICATE OF AUTHENTICITY', by: 'examined and certified by' },
  { id: 'card', from: 'AUTHENTICATION CARD', by: 'registered with' },
  { id: 'repair', from: 'REPAIR TICKET', by: 'serviced and identified by' },
  { id: 'dealer', from: "DEALER'S GUARANTEE", by: 'guaranteed by' },
];
const CERT_REAL = ['THE MARK IS RIGHT, and the work is right underneath it.', 'GENUINE. Maker, period and materials all agree.',
  'AS DESCRIBED. We would buy it back at the price we sold it.'];
const CERT_FAKE = ['THE MARK IS A STAMP. The work underneath it is anybody\'s.', 'NOT AS MARKED. Right look, wrong maker — a very good try.',
  'A LOOKALIKE. Sold as one; do not let anybody tell you otherwise.'];
const CERT_DAYS = [2, 7];
// the things a certificate could be about: anything with a maker worth claiming
function certBases() {
  return Object.values(BASE_BY_ID).filter((b) => b.brands && b.brands.some((br) => br[1] >= 2) && !b.legendary && !b.setOnly && !b.cash && !b.container);
}
// the strongest maker a base can carry — the one a certificate would bother naming
function certMaker(baseId) {
  const b = BASE_BY_ID[baseId];
  const br = ((b && b.brands) || []).slice().sort((p, q) => q[1] - p[1])[0];
  return br ? br[0] : 'Unmarked';
}

// the kinds. `weight` is the share of the paper pool; `when` gates a kind entirely.
const PAPERS = [
  { id: 'bill', kind: 'bill', stock: 'flyer', name: 'Auction Bill', weight: 6,
    when: () => billTowns().length > 0 },
  { id: 'catalog', kind: 'catalog', stock: 'catalog', name: 'Catalog Page', weight: 5,
    when: () => typeof SETS !== 'undefined' && Object.keys(SETS).length > 0 },
  { id: 'letter', kind: 'letter', stock: 'letter', name: "Somebody's Mail", weight: 5,
    when: () => billTowns().length > 0 },
  { id: 'receipt', kind: 'receipt', stock: 'receipt', name: 'A Receipt', weight: 4,
    when: () => receiptMyths().length > 0 },
  { id: 'certificate', kind: 'certificate', stock: 'certificate', name: 'A Certificate', weight: 4,
    when: () => certBases().length > 0 },
  { id: 'photo', kind: 'photo', stock: 'photo', name: 'A Photograph', weight: 5,
    when: () => billTowns().length > 0 },
  { id: 'list', kind: 'list', stock: 'notepaper', name: 'A Packing List', weight: 4,
    when: () => true },
  // IDEAS_TODO 11: somebody's paper, in somebody else's unit. Only while there is a fragment left to find.
  { id: 'cast', kind: 'cast', stock: 'receipt', name: 'Somebody You Know', weight: 5,
    when: () => typeof castPick === 'function' && CAST_PAPERS.some((c) => !castKnown(c.id)) },
];
const PAPER_BY_ID = {};
for (const p of PAPERS) PAPER_BY_ID[p.id] = p;
// blank paper art the loader should probe: papers\pp_<stock>.png (192x224, the card's own
// shape). The game writes every word onto them, so the art itself carries no text.
const PAPER_STOCKS = Array.from(new Set(PAPERS.map((p) => p.stock)));

// ---- generation: blank paper, in a box, rarely ----
// Called from genLocker. Pure: it only decides that a unit has a paper and which
// kind, never what the paper says.
function rollPaper(R, containers, town) {
  if (!R.chance(townRule('paperRate', town) || PAPER_RATE)) return null;
  const it = makeItem('paper', R);
  it.paper = { id: R.wpick(PAPERS.map((p) => [p.id, p.weight])), read: false };
  it.val = 1;
  const open = holdersFor(containers, it, true);
  if (!open.length) return null;                       // no box to hide it in, no paper
  const tgt = R.pick(open);
  tgt.loot = tgt.loot || [];
  tgt.loot.push(it);
  return it;
}

// ---- finding one: this is where a piece of paper decides what it says ----
// towns the player could actually drive to, so a bill is never a tip you cannot use
function billTowns() {
  const out = [];
  for (const tid of TOWN_ORDER) {
    const t = TOWNS[tid];
    if (!t) continue;
    if (tid === G.world.town || (G.world.visited || []).includes(tid) || townGateStatus(t).ok) out.push(tid);
  }
  return out;
}
// the archetypes a bill could name: what this game actually rolls
function billArchIds() { return Object.keys(ARCHETYPES).filter((k) => BILL_COPY[k]); }

// the myths a receipt could settle: still out there, and in a town you could drive to
const FAKE_TO_MYTH = {};
for (const m in MYTH_FAKES) FAKE_TO_MYTH[MYTH_FAKES[m]] = m;
function receiptMyths() {
  const reach = billTowns();
  const out = [];
  for (const tid of reach) {
    for (const m of (TOWNS[tid].myths || [])) {
      if ((G.foundLegends || []).includes(m)) continue;                        // already yours; nothing left to settle
      if ((G.world.papers || []).some((p) => p.kind === 'receipt' && p.data.myth === m)) continue;   // one paper each
      out.push({ myth: m, town: tid });
    }
  }
  return out;
}

// ---- paper with the cast's names on it (IDEAS_TODO 11; built 2026-09-16) ----
// The ephemera already fills units with bills, mail, receipts and photographs. These are the same thing about
// the PEOPLE. The discipline is the one the 300 oddments proved: ONE SENTENCE, imply and never explain, and
// never a biography. A pawn ticket in Sal's name and a date. Four tyres, cash, no receipt number.
// They are findable in ANYBODY's unit - that is what sells it. These people have been circling the same
// county for thirty years and their paper ends up in strangers' storage.
// Each one is worth about nothing in money. What it buys is a LINE: once you have read it, that rival has
// something new to say at the rope (rivalLine), and an object has turned into knowledge.
const CAST_PAPERS = [
  { id: 'sal_ticket', who: 'sal', stock: 'receipt', head: 'PAWN TICKET \u2014 UNREDEEMED',
    body: 'One gent\'s wristwatch, held against forty dollars. Signed S. Vance, never collected.',
    line: '"I have had things in hock in this county too, you know." Sal says it to the door, not to you.' },
  { id: 'ed_photo', who: 'ed', stock: 'photo', head: 'SNAPSHOT, UNDATED',
    body: 'Two men at a yard sale, squinting. The younger one is writing in a green notebook.',
    line: 'Ed writes, then looks up at you, then writes again. He has decided you already know.' },
  { id: 'bart_invoice', who: 'bart', stock: 'notepaper', head: 'INVOICE \u2014 PAST DUE',
    body: 'Four tyres, cash, no receipt number. Addressed to B. Hollis and stamped twice.',
    line: '"Everybody\'s been behind on something." Bart does not say what. Bart never says what.' },
  { id: 'dutch_note', who: 'dutch', stock: 'notepaper', head: 'A NOTE, TORN AT THE FOLD',
    body: '"Tell Dutch the dog is fine and stop asking." No signature, no date, no address.',
    line: 'Dutch yips once, quietly, and looks at you as though you said something.' },
  { id: 'bev_list', who: 'bev', stock: 'notepaper', head: 'CHURCH SALE \u2014 GOODS IN',
    body: 'Forty boxes promised, thirty-one delivered, and a line through the last name on the list.',
    line: '"I have been short before." Bev underlines something on the clipboard that is not there.' },
  { id: 'vera_card', who: 'vera', stock: 'letter', head: 'A CARD, NO ENVELOPE',
    body: '"The city is not everything, darling." Written to V. and never posted.',
    line: 'Vera looks at you over the sunglasses for exactly as long as it takes to be rude.' },
  { id: 'pruitt_slip', who: 'pruitt', stock: 'receipt', head: 'SCALE HOUSE \u2014 WEIGH SLIP',
    body: 'Gross, tare, net, and a dispute number circled twice in a different pen.',
    line: '"The scale was wrong that day." Pruitt says it to the tailgate. It has been years.' },
  { id: 'duo_receipt', who: 'duo', stock: 'receipt', head: 'C&K RESALE \u2014 CUSTOMER COPY',
    body: 'One dining set, paid in full. Two signatures, and the second one is much larger.',
    line: '"We had a shop." "We HAVE a shop." "We had a shop." They say it in front of everybody.' },
];
const CAST_BY_ID = {};
for (const c of CAST_PAPERS) CAST_BY_ID[c.id] = c;
// the fragments you have read, on the world, so a save keeps them
function castKnown(id) {
  const w = G.world;
  return !!(w && w.castRead && w.castRead.indexOf(id) >= 0);
}
function castKnowsAbout(who) {
  const w = G.world;
  if (!w || !w.castRead) return null;
  for (const id of w.castRead) { const c = CAST_BY_ID[id]; if (c && c.who === who) return c; }
  return null;
}
function castLearn(id) {
  const w = G.world;
  if (!w || !CAST_BY_ID[id]) return false;
  w.castRead = w.castRead || [];
  if (w.castRead.indexOf(id) >= 0) return false;
  w.castRead.push(id);
  recordEvent('castPaper', { who: CAST_BY_ID[id].who, id });
  return true;
}
// which fragment this piece of paper is: somebody whose paper you have not read yet, weighted to faces you
// have actually met, because a stranger's pawn ticket is just a pawn ticket
function castPick(R) {
  const left = CAST_PAPERS.filter((c) => !castKnown(c.id));
  if (!left.length) return null;
  const met = left.filter((c) => typeof codexMet === 'function' && codexMet(c.who));
  const pool = (met.length && R.chance(0.75)) ? met : left;
  return R.pick(pool);
}
function drawCastFace(x, y, w, h, p) {
  const c = CAST_BY_ID[p.data.cast];
  if (!c) return;
  // TEXT_FLOOR means a "9px" label is really drawn at 12, so a long docket line ran out through
  // both sides of the card. The card is only 168 wide: make the head fit it, whatever it says.
  T(x + w / 2, y + 12, fitLines(c.head, w - 20, [9], 1, true).lines[0], '#4a3f2e', 9, 'center', true);
  px(g, x + 12, y + 26, w - 24, 1, 'rgba(60,50,35,0.35)');
  const lines = wrapText(c.body, 26).slice(0, 5);
  for (let i = 0; i < lines.length; i++) T(x + 12, y + 34 + i * 13, lines[i], '#4a3f2e', 10);
  const d = (typeof rivalDef === 'function') ? rivalDef(c.who) : null;
  T(x + w / 2, y + h - 20, d ? d.name.toUpperCase() : c.who.toUpperCase(), '#6b3a2a', 10, 'center', true);
}

// turn a blank paper into a real one. Returns the record that goes on the board.
function paperFound(it) {
  const def = PAPER_BY_ID[(it.paper && it.paper.id) || 'bill'] || PAPERS[0];
  const R = RNG(strHash('paper' + G.worldSeed + '_' + G.day + '_' + (it.uid || 1)));
  const rec = {
    uid: nextUid(), id: def.id, kind: def.kind, stock: def.stock,
    day: G.day, town: G.world.town, unit: it.fromUnit || (G.cur && G.cur.num) || null,
    data: {}, dead: false,
  };
  if (def.kind === 'bill') {
    const towns = billTowns();
    // the town you are standing in, or one down the highway — weighted to somewhere else,
    // because a bill that sends you nowhere is not a reason to drive
    const away = towns.filter((t) => t !== G.world.town);
    const tid = (away.length && R.chance(0.6)) ? R.pick(away) : (towns.length ? R.pick(towns) : G.world.town);
    const archId = R.pick(billArchIds());
    rec.data = {
      town: tid, day: G.day + R.i(BILL_DAYS[0], BILL_DAYS[1]), archId,
      head: R.pick(BILL_HEADS), copy: BILL_COPY[archId], terms: R.pick(BILL_TERMS),
    };
  } else if (def.kind === 'cast') {
    const c = castPick(R);
    if (!c) { rec.data = { cast: null }; return rec; }
    rec.stock = c.stock;                                   // a pawn ticket is a receipt, a snapshot is a photo
    rec.data = { cast: c.id, who: c.who };
    castLearn(c.id);                                       // finding it is reading it: the line is yours now
  } else if (def.kind === 'catalog') {
    // a set you have already started is worth more than one you have never seen
    const open = (G.world.openSets || []).map((o) => o.setId).filter((s) => SETS[s]);
    const ids = Object.keys(SETS);
    rec.data = { setId: open.length && R.chance(0.7) ? R.pick(open) : R.pick(ids) };
  } else if (def.kind === 'letter') {
    // whose unit was this? If somebody in particular packed it, the mail says so;
    // otherwise the mail is the only place this person's name has ever appeared.
    const here = (G.cur && G.cur.persona) || null;
    const per = here ? JUNK_PERSONAS.find((x) => x.id === here) : null;
    // their OTHER unit: someone whose things we can recognise when we get there
    const pool = JUNK_PERSONAS.filter((x) => x.name);
    const them = per || R.pick(pool);
    const towns = billTowns();
    const away = towns.filter((t) => t !== G.world.town);
    const head = R.pick(LETTER_HEADS);
    rec.data = {
      name: them.name, personaId: them.id,
      town: (away.length && R.chance(0.55)) ? R.pick(away) : G.world.town,
      day: G.day + R.i(LETTER_DAYS[0], LETTER_DAYS[1]),
      from: head.from, line: head.line, found: false,
    };
  } else if (def.kind === 'photo') {
    // a room you have not stood in yet, and one thing in it. The thing will be in the
    // dark rows, where you only reach it by spending daylight you meant to keep.
    const towns = billTowns();
    const away = towns.filter((t) => t !== G.world.town);
    const base = BASE_BY_ID[R.wpick(PHOTO_THINGS)] || BASE_BY_ID.guitar;
    rec.data = {
      base: base.id, thing: base.name, room: R.pick(PHOTO_ROOMS),
      town: (away.length && R.chance(0.5)) ? R.pick(away) : G.world.town,
      day: G.day + R.i(PHOTO_DAYS[0], PHOTO_DAYS[1]), found: false,
    };
  } else if (def.kind === 'list') {
    // a manifest needs a unit with a history behind it. Without one this paper was
    // never a list: it turns into the photograph somebody also left in the box.
    const built = buildList(R, it);
    if (built) rec.data = built;
    else {
      const towns2 = billTowns();
      const away2 = towns2.filter((t) => t !== G.world.town);
      const base2 = BASE_BY_ID[R.wpick(PHOTO_THINGS)] || BASE_BY_ID.guitar;
      rec.id = 'photo'; rec.kind = 'photo'; rec.stock = 'photo';
      rec.data = {
        base: base2.id, thing: base2.name, room: R.pick(PHOTO_ROOMS),
        town: (away2.length && R.chance(0.5)) ? R.pick(away2) : G.world.town,
        day: G.day + R.i(PHOTO_DAYS[0], PHOTO_DAYS[1]), found: false,
      };
    }
  } else if (def.kind === 'certificate') {
    // holding a claim it can settle? Six times in ten it is about THAT one, and it settles
    // it the moment it is read (the payoff). Otherwise it names a thing a few days out, in
    // a town you can reach, and genDay makes the thing true to the paper (the lead).
    const head = R.pick(CERT_HEADS);
    const towns = billTowns(), away = towns.filter((t) => t !== G.world.town);
    const held = allHeld().filter((x) => x.unverified && (x.claimKind || '') === 'brand');
    if (held.length && R.chance(0.6)) {
      const x = R.pick(held);
      const f = claimFalseFor(x);                          // the truth already decided for it: the paper agrees
      rec.data = {
        base: x.base, thing: BASE_BY_ID[x.base].name, maker: certMaker(x.base), uid: x.uid, town: G.world.town, day: G.day,
        real: !f, tag: f, from: head.from, by: head.by, house: R.pick(RECEIPT_HOUSES),
        verdict: R.pick(f ? CERT_FAKE : CERT_REAL), found: true, used: false, settled: false,
      };
    } else {
      const base = R.pick(certBases());
      const real = !R.chance(CLAIM_FALSE_RATE);
      rec.data = {
        base: base.id, thing: base.name, maker: certMaker(base.id), uid: null,
        town: (away.length && R.chance(0.5)) ? R.pick(away) : G.world.town,
        day: G.day + R.i(CERT_DAYS[0], CERT_DAYS[1]), real, tag: real ? null : R.pick(['stamped', 'lookalike']),
        from: head.from, by: head.by, house: R.pick(RECEIPT_HOUSES),
        verdict: R.pick(real ? CERT_REAL : CERT_FAKE), found: false, used: false, settled: false,
      };
    }
  } else {
    // a receipt: one of the eleven, settled either way, and true when you get there
    const cands = receiptMyths();
    const pick = cands.length ? R.pick(cands) : { myth: 'moonRock', town: 'dustyFlats' };
    const head = R.pick(RECEIPT_HEADS);
    const real = R.chance(0.42);          // slightly more often a warning than a green light
    const base = BASE_BY_ID[pick.myth];
    rec.data = {
      myth: pick.myth, town: pick.town, real,
      thing: base ? base.name : pick.myth,
      from: head.from, by: head.by, house: R.pick(RECEIPT_HOUSES),
      verdict: R.pick(real ? RECEIPT_REAL : RECEIPT_FAKE),
      tag: real ? null : (BASE_BY_ID[MYTH_FAKES[pick.myth]] || {}).fakeTag || 'plastic',
      used: false,
    };
  }
  G.world.papers = G.world.papers || [];
  G.world.papers.push(rec);
  return rec;
}

// ---- the packing list ----
// A manifest for the unit this paper came out of: what somebody wrote down when they
// sealed it. Rows are stored as bases and ticked LIVE against what you hold, so the
// list keeps updating as you open the rest of the boxes.
function buildList(R, it) {
  const unit = it.fromUnit || (G.cur && G.cur.num) || 0;
  const mine = allHeld().filter((x) => x.fromUnit === unit);
  const rows = [];
  const push = (base, state) => {
    if (!base || !BASE_BY_ID[base] || rows.some((r) => r.base === base)) return;
    rows.push({ base, name: BASE_BY_ID[base].name, state });
  };
  for (const x of mine.slice(0, 4)) push(x.base, 'held');
  // what you walked away from, if the yard remembers you doing it
  for (const e of eventsWhere('left', { where: (ev) => ev.unit === unit })) push(e.base, 'gone');
  // and one thing still packed: a list is worth something only if it sends you somewhere
  const sealed = allHeld().filter((x) => x.container && x.loot && !x.opened);
  let packed = null;
  if (sealed.length) {
    const box = R.pick(sealed);
    const extra = makeItem(R.wpick(SLEEPER_POOL), R);
    extra.fromUnit = box.fromUnit || unit; extra.fromDay = box.fromDay || G.day;
    box.loot.push(extra);
    packed = extra.base;
    push(extra.base, 'packed');
  }
  // NO PADDING. Every line on this list has to be a thing that was really in that unit:
  // a manifest that invents entries is a lie with no tell, and a lie with no tell is the
  // one thing this system does not do. Too few true lines and it is not a list at all.
  if (rows.length < 2) return null;
  // some lists are out of date, and say so if you look
  const stale = R.chance(0.35) ? R.pick(LIST_STALE) : null;
  return {
    unit, head: R.pick(LIST_HEADS), rows: rows.slice(0, 6), packed,
    stale: stale ? stale.id : null, tell: stale ? stale.tell : null, staleLine: stale ? stale.line : null,
  };
}
// tick the manifest against what is actually in your hands, right now
function listRows(p) {
  const held = allHeld();
  return (p.data.rows || []).map((r) => {
    const have = held.some((x) => x.base === r.base && x.fromUnit === p.data.unit);
    const inBox = !have && held.some((x) => x.loot && x.loot.some((l) => l.base === r.base));
    return { name: r.name, state: have ? 'held' : (inBox || r.state === 'packed' ? 'packed' : r.state) };
  });
}

// a bill or a letter whose day has come and gone stops being a promise. A receipt has
// no clock at all — it is a standing document, and it waits.
function paperNightly() {
  const seen = (G.today && G.today.lockers) || [];
  for (const p of (G.world.papers || [])) {
    if (p.dead) continue;
    if (p.kind === 'letter' && !p.data.found && seen.some((lk) => lk.letterName === p.data.name)) p.data.found = true;
    if (p.kind === 'photo' && !p.data.found && seen.some((lk) => lk.photoBase === p.data.base)) p.data.found = true;
    if (p.kind === 'list') continue;                    // a manifest has no clock; it just gets truer
    if (p.kind === 'certificate') {
      // the lead's promise lapses if the thing came and went unseen; the document itself does not
      if (!p.data.found && seen.some((lk) => lk.certBase === p.data.base)) p.data.found = true;
      if (!p.data.found && !p.data.settled && G.day > p.data.day) p.dead = true;
      continue;
    }
    if (p.kind === 'receipt') {
      // did the thing it settles actually turn up today? Then the paper did its job.
      if (!p.data.used && seen.some((lk) => (lk.items || []).some((it) => it.base === p.data.myth ||
        (BASE_BY_ID[it.base] && BASE_BY_ID[it.base].fakeOf === p.data.myth) ||
        ((it.loot || []).some((l) => l.base === p.data.myth || (BASE_BY_ID[l.base] && BASE_BY_ID[l.base].fakeOf === p.data.myth)))))) p.data.used = true;
      continue;
    }
    if ((p.kind === 'bill' || p.kind === 'letter' || p.kind === 'photo') && G.day > p.data.day) p.dead = true;
  }
}
function livePapers() { return (G.world.papers || []).filter((p) => !p.dead); }
function deadPapers() { return (G.world.papers || []).filter((p) => p.dead); }
// the promise a bill makes, for genDay to keep. Deterministic: it reads only the world.
function billFor(world, day, townId) {
  return (world.papers || []).find((p) => p.kind === 'bill' && !p.dead && p.data.day === day && p.data.town === townId) || null;
}
// the same, for a letter: this person's other unit turns up here today
function letterFor(world, day, townId) {
  return (world.papers || []).find((p) => p.kind === 'letter' && !p.dead && p.data.day === day && p.data.town === townId) || null;
}
// A receipt with nothing to settle is a dead letter. Holding one makes the thing it
// names more willing to turn up: the same myth the town is already rotating toward,
// on a day the calendar left empty. It never invents a myth the town does not own,
// never resurrects one already found, and never changes what the thing IS — only
// whether today is the day you meet it. `receiptVerdict` still decides the verdict.
// Waiting for the rumor to rotate back to this town takes most of a career, so a paper
// in your pocket does not wait for it. It still cannot invent a myth the town does not
// own, or one already found — it just means you came here looking, and looking works.
const RECEIPT_SUMMON = 0.12;
function receiptSummon(world, worldSeed, day, town, foundLegends) {
  const live = (world.papers || []).filter((p) => p.kind === 'receipt' && !p.dead && !p.data.used && p.data.town === town.id);
  if (!live.length) return null;
  const mine = (town.myths || []).filter((m) => !foundLegends.includes(m));
  const want = live.map((p) => p.data.myth).filter((m) => mine.includes(m));
  if (!want.length) return null;
  const Rs = RNG(strHash('receiptday' + worldSeed + '_' + day + '_' + town.id));
  if (!Rs.chance(RECEIPT_SUMMON)) return null;
  return { base: want[Rs.i(0, want.length - 1)], real: true };   // receiptVerdict has the last word
}

// the promise a photograph makes: that room, that day, and the thing in it
function photoFor(world, day, townId) {
  return (world.papers || []).find((p) => p.kind === 'photo' && !p.dead && p.data.day === day && p.data.town === townId) || null;
}
// the promise a certificate makes: that thing, wearing that maker's mark, that day
function certFor(world, day, townId) {
  return (world.papers || []).find((p) => p.kind === 'certificate' && !p.dead && !p.data.uid && p.data.day === day && p.data.town === townId) || null;
}

// ---- paperwork as a verdict (docs/APPRAISAL.md §7) ----
// The paper you hold that settles THIS thing. A receipt for its myth; a certificate that
// names it (the one in your hands, or the one it sent you to); a photograph of it in the
// room it came out of. Free — and a receipt or a certificate can convict. A photograph
// only ever vouches: it proves the thing was there, which is all a photograph can do.
function paperFor(it) {
  const b = BASE_BY_ID[it.base];
  for (const p of (G.world.papers || [])) {
    if (!p.data || p.data.settled) continue;
    if (p.kind === 'receipt' && (it.legendary || it.fake) && (it.base === p.data.myth || (b && b.fakeOf === p.data.myth))) return p;
    if (p.kind === 'certificate' && p.data.base === it.base && (p.data.uid === it.uid || (!p.data.uid && p.data.found && it.fromDay === p.data.day))) return p;
    if (p.kind === 'photo' && p.data.base === it.base && p.data.found && it.fromDay === p.data.day && !it.fake && !it.legendary && !it.lux) return p;
  }
  return null;
}
const PHOTO_VOUCH = '"That is the room. That is the thing. It was there."';
function paperVerdict(it, p) {
  if (!it.unverified) return null;
  p.data.settled = true; p.data.used = true;
  const force = p.kind === 'photo' ? 'true' : (p.kind === 'certificate' ? (p.data.real ? 'true' : (p.data.tag || 'stamped')) : null);
  const res = deliverVerdict(it, 'paper', force);
  if (!res) return null;
  itemCardMaybe(it, res, G.mode, true);              // deferred: it lands once the appraisal modal is put down (itemcard.js)
  const said = p.kind === 'photo' ? PHOTO_VOUCH : p.data.verdict;
  const what = p.kind === 'receipt' ? 'the receipt' : p.kind === 'photo' ? 'the photograph' : 'the certificate';
  return { text: it.name + ' — ' + fmt$(it.val) + '.  ' + said + '  (' + what + ' in your pocket settled it.)', col: res.col };
}

// a receipt settles the thing it names. Given whatever the myth calendar rolled, this
// returns what the paper says instead — real becomes fake, fake becomes real — so the
// document is right when you finally stand in front of the thing.
function receiptVerdict(world, mythPlan) {
  if (!mythPlan) return mythPlan;
  const myth = mythPlan.real ? mythPlan.base : FAKE_TO_MYTH[mythPlan.base];
  if (!myth) return mythPlan;
  const r = (world.papers || []).find((p) => p.kind === 'receipt' && !p.dead && p.data.myth === myth);
  if (!r) return mythPlan;
  if (r.data.real === mythPlan.real) return mythPlan;
  return r.data.real ? { base: myth, real: true } : { base: MYTH_FAKES[myth], real: false };
}

// what a bill says, as lines, for the board and the ledger
function billLines(p) {
  const t = TOWNS[p.data.town];
  const when = p.data.day - G.day;
  return {
    head: p.data.head,
    where: (t ? t.name : p.data.town).toUpperCase() + ' STORAGE',
    when: 'DAY ' + p.data.day + (p.dead ? '  ·  MISSED' : when <= 0 ? '  ·  TODAY' : '  ·  in ' + when + (when === 1 ? ' day' : ' days')),
    copy: p.data.copy,
    terms: p.data.terms,
  };
}
// every piece of a set, and whether you have it. The whole point of a catalog page.
// Counting goes through setPieceCounts so it obeys the same rules the assembler does:
// a piece only counts once it has been searched, and a brand-locked role has to match.
function catalogRows(p) {
  const def = SETS[p.data.setId];
  if (!def) return [];
  const brand = bestHeldBrand(p.data.setId) || def.brands[0][0];
  const res = setPieceCounts([G.stash, G.keeps, G.trophies], p.data.setId, brand);
  const rows = [];
  for (const role in def.roles) {
    const r = def.roles[role];
    const b = BASE_BY_ID[r.base];
    rows.push({
      role, n: r.n, got: Math.min(res.counts[role] || 0, r.n),
      name: (def.roleLabel && def.roleLabel[role]) || (b ? b.name : r.base),
      locked: (def.brandLocked || []).includes(role),
    });
  }
  return { brand, rows, name: def.name };
}
// a stable handle for one paper: uids are rerolled on load, its content is not
function paperKey(p) { return p.kind + '|' + p.day + '|' + p.town + '|' + (p.unit || 0) + '|' + (p.data.name || p.data.myth || p.data.setId || p.data.archId || p.data.base || ''); }
function paperTitle(p) {
  const t = TOWNS[p.data.town];
  const where = t ? t.name : p.data.town;
  if (p.kind === 'bill') return where + ' — day ' + p.data.day;
  if (p.kind === 'letter') return p.data.name + ' — ' + where + ', day ' + p.data.day;
  if (p.kind === 'receipt') return p.data.thing + ' — ' + (p.data.real ? 'genuine' : 'a fake');
  if (p.kind === 'certificate') return p.data.maker + ' ' + p.data.thing + ' — ' + (p.data.real ? 'as marked' : 'not as marked') + (p.data.uid ? '' : ', ' + where + ', day ' + p.data.day);
  if (p.kind === 'photo') return p.data.thing + ' — ' + where + ', day ' + p.data.day;
  if (p.kind === 'list') return 'the contents of unit ' + p.data.unit + (p.data.stale ? ' (out of date)' : '');
  const def = SETS[p.data.setId];
  return def ? def.name : 'a catalog page';
}

// ---- THE BOARD: the corkboard on the garage wall ----
// Papers are pinned here the moment they come out of a box. Live bills first,
// because a bill is a clock; everything else sits under them. Nothing is ever
// thrown away — a bill whose day has passed just gets stamped and moves down.
const BOARD_ROWS = 2;                 // rows of cards visible at once
function boardCards() { return livePapers().concat(deadPapers()); }

function drawBoard(bx, by, bw, bh) {
  const cards = boardCards();
  // the cork itself
  px(g, bx, by, bw, bh, '#8a6a44');
  const Rk = RNG(11);
  g.fillStyle = 'rgba(60,42,26,0.35)';
  for (let i = 0; i < 340; i++) g.fillRect(bx + Rk.i(0, bw - 2), by + Rk.i(0, bh - 2), Rk.i(1, 3), 1);
  px(g, bx, by, bw, 3, 'rgba(255,235,200,0.14)');
  px(g, bx, by + bh - 3, bw, 3, 'rgba(0,0,0,0.28)');

  if (!cards.length) {
    G.boardScroll = 0;
    T(bx + bw / 2, by + bh / 2 - 28, 'NOTHING PINNED UP YET', '#4a3520', 15, 'center', true);
    T(bx + bw / 2, by + bh / 2 - 4, 'Paper turns up in boxes: a sale bill, a page torn out of a catalog.', '#5c4429', 12, 'center');
    T(bx + bw / 2, by + bh / 2 + 14, 'It is worth nothing. Take it anyway.', '#5c4429', 12, 'center');
    return;
  }

  const cw = 168, chh = 196, gap = 14, cols = Math.max(1, Math.floor((bw - gap) / (cw + gap)));
  const rows = Math.ceil(cards.length / cols);
  G.boardScroll = clamp(G.boardScroll || 0, 0, Math.max(0, rows - BOARD_ROWS));
  g.save();
  g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
  for (let i = 0; i < cards.length; i++) {
    const r = Math.floor(i / cols) - (G.boardScroll || 0);
    if (r < 0 || r >= BOARD_ROWS) continue;
    const x = bx + gap + (i % cols) * (cw + gap), y = by + 12 + r * (chh + gap);
    drawPaperCard(x, y, cw, chh, cards[i]);
  }
  g.restore();
  if (rows > BOARD_ROWS) T(bx + bw - 8, by + bh - 16, 'wheel to scroll', '#5c4429', 11, 'right');
}

// one pinned paper. The stock art is the paper; the words are drawn on it.
function drawPaperCard(x, y, w, h, p) {
  const key = paperKey(p);
  const tilt = ((strHash(key) % 5) - 2) * 0.006;               // pinned by hand, not by a machine
  g.save();
  g.translate(x + w / 2, y + h / 2); g.rotate(tilt); g.translate(-(x + w / 2), -(y + h / 2));
  px(g, x + 3, y + 4, w, h, 'rgba(0,0,0,0.28)');               // it casts a shadow on the cork
  const list = (typeof _paperImg !== 'undefined') ? _paperImg[p.stock] : null;
  if (list && list.length) drawPhotoFit(list[strHash(p.stock + '_' + key) % list.length], x, y, w, h);
  else { px(g, x, y, w, h, p.dead ? '#c9bfa6' : '#e9dcbb'); px(g, x, y, w, 4, 'rgba(0,0,0,0.10)'); }
  if (p.kind === 'cast') drawCastFace(x, y, w, h, p);
  else if (p.kind === 'bill') drawBillFace(x, y, w, h, p);
  else if (p.kind === 'letter') drawLetterFace(x, y, w, h, p);
  else if (p.kind === 'receipt') drawReceiptFace(x, y, w, h, p);
  else if (p.kind === 'certificate') drawCertFace(x, y, w, h, p);
  else if (p.kind === 'photo') drawPhotoFace(x, y, w, h, p);
  else if (p.kind === 'list') drawListFace(x, y, w, h, p);
  else drawCatalogFace(x, y, w, h, p);
  if (p.dead) {                                               // the sale happened without you
    px(g, x, y, w, h, 'rgba(70,60,44,0.42)');
    g.save();
    g.translate(x + w / 2, y + h / 2); g.rotate(-0.18);
    T(0, -12, 'MISSED', '#8d2b2b', 22, 'center', true, LOGO_FONT);
    g.restore();
  }
  px(g, x + w / 2 - 4, y - 3, 8, 8, '#b03a3a');                // the pin
  px(g, x + w / 2 - 2, y - 1, 3, 3, '#e07a6a');
  g.restore();
  if (!list || !list.length) T(x + w / 2, y + h - 13, 'papers\pp_' + p.stock + '.png', '#8a7d5e', -10, 'center');
}

function drawBillFace(x, y, w, h, p) {
  const L = billLines(p);
  const soon = !p.dead && p.data.day - G.day <= 1;
  T(x + w / 2, y + 12, L.head, '#2a2417', 12, 'center', true, LOGO_FONT);
  px(g, x + 12, y + 28, w - 24, 1, '#2a2417');
  let ty = y + 34;
  for (const line of wrapText(L.where, 20).slice(0, 2)) { T(x + w / 2, ty, line, '#2a2417', 13, 'center', true); ty += 15; }
  T(x + w / 2, ty + 2, L.when, soon ? '#8d2b2b' : '#4a3f28', 12, 'center', true);
  ty += 22;
  px(g, x + 12, ty, w - 24, 1, '#6b5f45');
  ty += 6;
  for (const line of wrapText(L.copy, 24).slice(0, 4)) { T(x + w / 2, ty, line, '#2a2417', 10, 'center'); ty += 12; }
  for (const line of wrapText(L.terms, 26).slice(0, 2)) { T(x + w / 2, y + h - 30 + (line === L.terms ? 0 : 11), line, '#6b5f45', 9, 'center'); }
}

function drawCatalogFace(x, y, w, h, p) {
  const c = catalogRows(p);
  T(x + w / 2, y + 11, 'FROM THE CATALOG', '#6b5f45', 9, 'center', true);
  let ty = y + 24;
  for (const line of wrapText(c.name || 'a set', 18).slice(0, 2)) { T(x + w / 2, ty, line, '#2a2417', 13, 'center', true, LOGO_FONT); ty += 15; }
  px(g, x + 12, ty + 2, w - 24, 1, '#6b5f45');
  ty += 10;
  for (const row of c.rows.slice(0, 6)) {
    const done = row.got >= row.n;
    T(x + 14, ty, (done ? '\u2713 ' : '\u00b7 ') + row.name + (row.n > 1 ? ' x' + row.n : ''), done ? '#2f5a2a' : '#4a3f28', 11);
    T(x + w - 14, ty, row.got + '/' + row.n, done ? '#2f5a2a' : '#8a7d5e', 11, 'right');
    ty += 13;
  }
  if (c.brand) T(x + w / 2, y + h - 20, 'matched in ' + c.brand, '#6b5f45', 10, 'center');
}

function drawLetterFace(x, y, w, h, p) {
  const d = p.data, t = TOWNS[d.town], when = d.day - G.day;
  T(x + w / 2, y + 11, d.from, '#6b5f45', 9, 'center', true);
  px(g, x + 12, y + 25, w - 24, 1, '#6b5f45');
  T(x + w / 2, y + 32, 'ADDRESSED TO', '#8a7d5e', 9, 'center');
  let ty = y + 44;
  for (const line of wrapText(d.name, 17).slice(0, 2)) { T(x + w / 2, ty, line, '#2a2417', 14, 'center', true, LOGO_FONT); ty += 16; }
  ty += 4;
  for (const line of wrapText(d.line, 26).slice(0, 4)) { T(x + w / 2, ty, line, '#4a3f28', 10, 'center'); ty += 12; }
  px(g, x + 12, y + h - 46, w - 24, 1, '#6b5f45');
  if (d.found) {
    T(x + w / 2, y + h - 38, 'YOU FOUND THE OTHER ONE', '#2f5a2a', 10, 'center', true);
    T(x + w / 2, y + h - 24, (t ? t.name : d.town) + ', day ' + d.day, '#4a3f28', 10, 'center');
  } else {
    T(x + w / 2, y + h - 38, 'ANOTHER UNIT, SAME NAME', '#8d2b2b', 10, 'center', true);
    T(x + w / 2, y + h - 24, (t ? t.name : d.town).toUpperCase() + '  ·  DAY ' + d.day +
      (p.dead ? '  ·  GONE' : when <= 0 ? '  ·  TODAY' : '  ·  in ' + when), p.dead ? '#8a7d5e' : '#2a2417', 10, 'center', true);
  }
}

function drawReceiptFace(x, y, w, h, p) {
  const d = p.data, t = TOWNS[d.town];
  T(x + w / 2, y + 11, d.from, '#6b5f45', 9, 'center', true);
  px(g, x + 12, y + 25, w - 24, 1, '#6b5f45');
  let ty = y + 32;
  for (const line of wrapText(d.thing, 18).slice(0, 2)) { T(x + w / 2, ty, line, '#2a2417', 12, 'center', true, LOGO_FONT); ty += 15; }
  T(x + w / 2, ty + 2, d.by, '#8a7d5e', 9, 'center');
  T(x + w / 2, ty + 14, d.house, '#4a3f28', 10, 'center');
  ty += 32;
  px(g, x + 12, ty, w - 24, 1, '#6b5f45');
  ty += 7;
  for (const line of wrapText(d.verdict, 25).slice(0, 4)) { T(x + w / 2, ty, line, d.real ? '#2f5a2a' : '#8d2b2b', 10, 'center'); ty += 12; }
  T(x + w / 2, y + h - 32, d.real ? 'THE REAL ONE' : 'A FAKE  (' + d.tag + ')', d.real ? '#2f5a2a' : '#8d2b2b', 11, 'center', true);
  T(x + w / 2, y + h - 18, d.used ? 'you have seen it' : 'somewhere near ' + (t ? t.name : d.town), '#6b5f45', 9, 'center');
}

function drawCertFace(x, y, w, h, p) {
  const d = p.data, t = TOWNS[d.town], when = d.day - G.day;
  T(x + w / 2, y + 11, d.from, '#6b5f45', 9, 'center', true);
  px(g, x + 12, y + 25, w - 24, 1, '#6b5f45');
  let ty = y + 32;
  for (const line of wrapText(d.maker + ' ' + d.thing, 18).slice(0, 2)) { T(x + w / 2, ty, line, '#2a2417', 12, 'center', true, LOGO_FONT); ty += 15; }
  T(x + w / 2, ty + 2, d.by, '#8a7d5e', 9, 'center');
  T(x + w / 2, ty + 14, d.house, '#4a3f28', 10, 'center');
  ty += 32;
  px(g, x + 12, ty, w - 24, 1, '#6b5f45');
  ty += 7;
  for (const line of wrapText(d.verdict, 25).slice(0, 4)) { T(x + w / 2, ty, line, d.real ? '#2f5a2a' : '#8d2b2b', 10, 'center'); ty += 12; }
  T(x + w / 2, y + h - 32, d.real ? 'AS MARKED' : 'NOT AS MARKED  (' + d.tag + ')', d.real ? '#2f5a2a' : '#8d2b2b', 11, 'center', true);
  T(x + w / 2, y + h - 18, d.settled ? 'it settled the matter' : d.uid ? 'for the one you are holding' : d.found ? 'you have seen it' :
    (t ? t.name : d.town).toUpperCase() + '  ·  DAY ' + d.day + (p.dead ? '  ·  GONE' : when <= 0 ? '  ·  TODAY' : '  ·  in ' + when), '#6b5f45', 9, 'center');
}

function drawPhotoFace(x, y, w, h, p) {
  const d = p.data, t = TOWNS[d.town], when = d.day - G.day;
  // the picture sits in the polaroid's window; the words go on the white strip below it
  const iw = w - 24, ih = Math.round(h * 0.56), ix = x + 12, iy = y + 12;
  px(g, ix, iy, iw, ih, '#6f6a5c');
  const Rp = RNG(strHash(d.room + d.base));
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 60; i++) g.fillRect(ix + Rp.i(0, iw - 3), iy + Rp.i(0, ih - 2), Rp.i(2, 6), 1);
  px(g, ix, iy, iw, Math.round(ih * 0.35), 'rgba(255,255,255,0.06)');       // a window, or a flash
  const sp = SPRITES[(BASE_BY_ID[d.base] || {}).spr];
  if (sp) {                                                                 // the thing, in the room
    const sc = Math.min(2, Math.floor((ih - 16) / sp.h)) || 1;
    try { g.drawImage(getSprite((BASE_BY_ID[d.base] || {}).spr, (BASE_BY_ID[d.base] || {}).pal, 'Dusty', strHash(d.base)),
      ix + Math.round((iw - sp.w * sc) / 2), iy + ih - sp.h * sc - 6, sp.w * sc, sp.h * sc); } catch (e) { /* the still is enough */ }
  }
  px(g, ix, iy, iw, ih, 'rgba(120,110,80,0.18)');                           // it has aged in a box
  let ty = iy + ih + 8;
  for (const line of wrapText(d.room, 30).slice(0, 3)) { T(x + w / 2, ty, line, '#4a3f28', 10, 'center'); ty += 12; }
  T(x + w / 2, y + h - 34, d.thing.toUpperCase(), '#2a2417', 11, 'center', true);
  T(x + w / 2, y + h - 20, d.found ? 'YOU STOOD IN THAT ROOM' :
    (t ? t.name : d.town).toUpperCase() + '  ·  DAY ' + d.day + (p.dead ? '  ·  GONE' : when <= 0 ? '  ·  TODAY' : '  ·  in ' + when),
    d.found ? '#2f5a2a' : (p.dead ? '#8a7d5e' : '#8d2b2b'), 10, 'center', true);
}

function drawListFace(x, y, w, h, p) {
  const d = p.data, rows = listRows(p);
  T(x + w / 2, y + 12, d.head, '#2a2417', 11, 'center', true, LOGO_FONT);
  T(x + w / 2, y + 26, d.unit ? 'UNIT ' + d.unit : 'UNIT —', '#6b5f45', 10, 'center');
  px(g, x + 12, y + 34, w - 24, 1, '#6b5f45');
  let ty = y + 42;
  for (const r of rows.slice(0, 6)) {
    const col = r.state === 'held' ? '#2f5a2a' : (r.state === 'packed' ? '#8a5a12' : '#8d2b2b');
    const mark = r.state === 'held' ? '✓' : (r.state === 'packed' ? '□' : '✗');
    T(x + 14, ty, mark + ' ' + r.name, col, 11);
    if (r.state === 'gone') px(g, x + 14, ty + 6, w - 28, 1, 'rgba(141,43,43,0.5)');   // struck through: not here
    ty += 14;
  }
  px(g, x + 12, y + h - 46, w - 24, 1, '#6b5f45');
  // the tell. A stale list says so on its own face; that is what makes it fair.
  if (d.tell) {
    let sy = y + h - 40;
    for (const line of wrapText(d.tell, 27).slice(0, 2)) { T(x + w / 2, sy, line, '#8a5a12', 9, 'center'); sy += 11; }
    T(x + w / 2, y + h - 16, d.staleLine, '#8d2b2b', 9, 'center', true);
  } else {
    T(x + w / 2, y + h - 38, 'checked against what came home', '#6b5f45', 9, 'center');
    T(x + w / 2, y + h - 22, '✓ got it   □ still packed   ✗ not here', '#8a7d5e', 9, 'center');
  }
}
