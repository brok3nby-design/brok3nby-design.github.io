// ---- authored lockers, object histories, and keys that fit something later ----
// Procedural generation stays the backbone. These are the exceptions: a door
// arranged to tell a story, an object whose past comes out over weeks, and a
// key you keep in the shed because you have a feeling. Nothing here has a
// checklist. The player notices, or does not.
'use strict';

// ============ locker stories ============
// bigs: [base, layer] reserved like set pieces (non-big bases fall through to
// the containers). smalls: [base, name?, note?] tucked into containers. payoff:
// the one object that is not what the door says, with the note LOOK CLOSER
// reads off it. tags: a marker scrawl on a box of that base.
const LOCKER_STORIES = {
  divorce: {
    name: 'The Divorce', arch: 'grandma', minTier: 1, cols: 8, weight: 3,
    bigs: [['dresser', 2], ['mattress', 1], ['golfClubs', 2], ['garbage', 1], ['lamp', 0]],
    smalls: [['photo', 'Photograph, Face Down', 'A wedding. Somebody has been cut out with scissors. Neatly.']],
    payoff: { base: 'watch', name: 'Gold Watch, Engraved', val: 520, into: ['garbage', 'dresser'],
      note: 'Engraved: "Forever." Under it, scratched in with a key, a date.' },
    flavor: 'Half a bedroom. Exactly half.',
    owner: 'Tenant listed as "him." The clerk was told not to ask.',
    tags: { garbage: 'HIS' },
  },
  magician: {
    name: 'The Failed Magician', arch: 'hoarder', minTier: 1, cols: 8, weight: 3,
    bigs: [['trunk', 2], ['rabbitCage', 2], ['box', 1], ['mannequin', 0], ['suitcase', 1]],
    smalls: [['cards', null, null], ['magicKit', null, null], ['magicKit', null, 'The false bottom is the trick. There is no false bottom. That is also the trick.']],
    payoff: { base: 'jarSpecimen', name: 'The Thing That Was Not Part of the Trick', val: 640, into: ['trunk', 'box'],
      note: 'The label says PROP. The label is lying. Something in there is holding still on purpose.' },
    flavor: 'A rabbit cage. No rabbit. A great many scarves.',
    owner: 'Tenant performed at the bingo hall until he did not.',
    tags: { box: 'ACT 2' },
  },
  prepper: {
    name: 'The Prepper', arch: 'workshop', minTier: 1, cols: 9, weight: 3,
    bigs: [['canCrate', 2], ['canCrate', 1], ['barrel', 2], ['radio', 1], ['filing', 1], ['lockbox', 0], ['ladder', 0]],
    smalls: [['diary', 'Notebook of Dates', 'Every page is a date and a reason. The reasons stop in March.']],
    payoff: { base: 'goldBar', name: 'Gold Bar, Assay Stamped', val: 1100, into: ['lockbox', 'filing'],
      note: 'Assay stamp, 1978. He was ready for the end of the world. He was not ready for rent.' },
    flavor: 'Cans. Water. A radio that only receives.',
    owner: 'Tenant paid five years in advance, once. Then never again.',
    tags: { canCrate: 'ROTATE' },
  },
  kidLeftHome: {
    name: 'The Kid Who Left Home', arch: 'timeCapsule', minTier: 1, cols: 8, weight: 3,
    bigs: [['console', 2], ['skateboard', 2], ['mattress', 1], ['box', 1], ['bookshelf', 0]],
    smalls: [['poster', null, null], ['diary', 'School Notebook', 'Every margin is a drawing of the same car.'], ['walkman', null, null]],
    payoff: { base: 'comic', name: 'Comic, First Issue, Bagged', val: 780, into: ['box'],
      note: 'Bagged and boarded by a kid who did not know why. The kid was right.' },
    flavor: 'Posters still on the walls. Of the unit.',
    owner: 'Tenant was seventeen when the rent started. The rent is older than that now.',
    tags: { box: 'MY STUFF. DO NOT.' },
  },
  failedBusiness: {
    name: 'The Failed Business', arch: 'officeSurplus', minTier: 1, cols: 9, weight: 3,
    bigs: [['filing', 2], ['officeChair', 2], ['box', 1], ['box', 1], ['till', 0], ['typewriter', 1], ['neon', 0]],
    smalls: [['diary', 'Receipt Book', 'Carbon copies. The last twenty are blank.']],
    payoff: { base: 'prototype', name: 'Prototype, Serial 0001', val: 620, into: ['box', 'filing'],
      note: 'The one they built before they built the company. The company is gone. This is not.' },
    flavor: 'Inventory tags on everything. Prices crossed out twice.',
    owner: 'Tenant was a company. The company was one man.',
    tags: { box: 'INVENTORY' },
  },
  weddingOff: {
    name: "The Wedding That Didn't Happen", arch: 'grandma', minTier: 1, cols: 8, weight: 2,
    bigs: [['wardrobe', 2], ['trunk', 2], ['box', 1], ['box', 1], ['mirror', 0], ['dresser', 1]],
    smalls: [['china', null, 'A service for twelve, still in the tissue.'], ['photo', 'Photograph, Engagement', 'Two people, very sure. The frame is new. The photo is not.'], ['cards', null, null]],
    payoff: { base: 'ring', name: 'Engagement Ring, Never Given', val: 480, into: ['trunk', 'dresser'],
      note: 'The box has never been opened by anyone but the person who bought it. The receipt is folded inside. It is dated the day before.' },
    flavor: 'Tissue paper. A great deal of tissue paper.',
    owner: 'Tenant rented the unit for "a month, until after." After what, the clerk did not ask.',
    tags: { box: 'RSVP' },
  },
  barClosed: {
    name: 'The Bar That Closed', arch: 'shopStock', minTier: 1, cols: 9, weight: 2,
    bigs: [['neon', 2], ['till', 2], ['barrel', 1], ['vinylCrate', 1], ['box', 1], ['stereo', 0], ['mirror', 0]],
    smalls: [['diary', 'Bar Tab Ledger', 'Forty names. Thirty-eight paid up. Two are underlined.'], ['cards', null, null], ['harmonica', null, null]],
    payoff: { base: 'wine', name: 'The Bottle Behind the Bar, 1961, Unopened', val: 560, into: ['barrel', 'box'],
      note: 'A bottle every bar keeps for the night it closes. The bar closed. Nobody opened it. Nobody had the heart.' },
    flavor: 'A neon sign, unplugged. A stool with one name carved in it.',
    owner: 'Tenant closed the place on a Tuesday. He locked up, drove here, and locked up again.',
    tags: { box: 'GLASSWARE' },
  },
  nightShift: {
    name: 'The Night Shift', arch: 'workshop', minTier: 1, cols: 8, weight: 2,
    bigs: [['filing', 2], ['radio', 2], ['officeChair', 1], ['box', 1], ['ladder', 0], ['lockbox', 0]],
    smalls: [['diary', 'Logbook, Nights', 'Every page: "all quiet." Except one. That page says "again."'], ['walkman', null, null], ['knife', null, null]],
    payoff: { base: 'camera', name: 'Camera, One Roll Exposed, the Night of the Fire', val: 520, into: ['lockbox', 'filing'],
      note: 'Thirty-six exposures, all used, the night the Silver Dollar burned. Nobody developed them. Somebody decided not to.' },
    flavor: 'A thermos. A flashlight. A chair that faced the door for years.',
    owner: 'Tenant worked nights at a place that no longer has nights.',
    tags: { box: 'INCIDENT REPORTS' },
  },
  salesman: {
    name: 'The Traveling Salesman', arch: 'shopStock', minTier: 1, cols: 8, weight: 2,
    bigs: [['suitcase', 2], ['suitcase', 1], ['box', 2], ['till', 1], ['typewriter', 0], ['mannequin', 1]],
    smalls: [['cards', null, 'A deck with one card missing. The card is in the other suitcase.'], ['diary', 'Route Book', 'Nine towns, one line each. The last line is "home?" with the question mark.'], ['massager', null, null]],
    payoff: { base: 'watch', name: 'Gold Watch, Twenty-Five Years, From a Company That Folded', val: 450, into: ['suitcase', 'box'],
      note: 'Engraved with a company name nobody remembers and a year the company did not reach. He kept it wound.' },
    flavor: 'Two suitcases, packed. One has never been unpacked.',
    owner: 'Tenant listed his address as "the road." The clerk wrote it down.',
    tags: { box: 'SAMPLES' },
  },
  collectorUnknowing: {
    name: "The Collector Who Didn't Know", arch: 'grandma', minTier: 1, cols: 8, weight: 3,
    bigs: [['dresser', 2], ['lamp', 2], ['vinylCrate', 1], ['box', 1], ['armchair', 0]],
    smalls: [['china', null, null], ['teddy', null, null]],
    payoff: { base: 'records', name: 'Test Pressing, One of Ten', val: 920, into: ['vinylCrate', 'box'],
      note: 'A white label. A pencil number: 3/10. She played it at Christmas and put it back.' },
    flavor: 'Doilies. Lamps. Nothing to see. That is what everyone will think.',
    owner: 'Tenant kept a tidy house and a tidier unit.',
    tags: {},
  },
};
// which story today, if the contract calls for one: none twice inside twenty days
function pickStory(R, town, world, day) {
  const seen = world.storiesSeen || {};
  const cands = Object.keys(LOCKER_STORIES).filter((id) => {
    const s = LOCKER_STORIES[id];
    return (town.tier || 0) >= (s.minTier || 0) && !(seen[id] && day - seen[id] < 20);
  });
  if (!cands.length) return null;
  return R.wpick(cands.map((id) => [id, LOCKER_STORIES[id].weight || 1]));
}

// ============ provenance: an object whose past comes out over weeks ============
// anchor: the object, as first found (its note is what LOOK CLOSER reads).
// paper: a story that runs `after` days once you HOLD the anchor. proof: an
// object the director places in a later unit, `after` days on. resolved: what
// the anchor becomes when you look closer at it while holding the proof.
const PROVENANCE = {
  // a hand-labelled cartridge, a kid in a paper crown, a county that still talks about the score
  champCart: {
    town: 'gypsumCity', minDay: 12,
    anchor: { base: 'cartNes', name: 'Grey 8-Bit Cartridge, Hand-Labelled', val: 30,
      note: 'Masking tape over the real label: "TOURNAMENT — K.T. — DO NOT RESET." If the battery held, the score is still on it.' },
    paper: { after: 3, headline: 'THE KID WHO BEAT THE COUNTY: "THE CARTRIDGE IS OUT THERE"',
      body: 'In 1990 a twelve-year-old from Gypsum City won the tri-county championship on a score the organisers called impossible and the losers called a lie. The cartridge with the score on it went into a shoebox, the shoebox went into a unit, and the unit went delinquent. "It is out there," says the former champion, now forty-seven and a dental hygienist. "Somebody is going to blow into it."',
      img: 'prov_champ' },
    proof: { after: 7, base: 'photo', name: 'Photograph: a Kid at a Television, 1990',
      note: 'A kid in a paper crown, a score on the screen with too many digits, and a cartridge held up like a fish.' },
    resolved: { name: "Kenny Tolliver's Tournament Cartridge", val: 1200,
      lines: ['The crown in the photograph is on the TV in the photograph. The cartridge in the kid\'s hand has this label on it.',
              'The battery held. The score is the score in the picture. Nobody blew into it.'] },
  },
  redMesaGuitar: {
    town: 'redMesa', minDay: 8,
    anchor: { base: 'guitar', name: 'Fendrix Guitar', val: 420,
      note: 'Scratched beneath the bridge: "R.J. — Amarillo \'63".' },
    paper: { after: 3, headline: 'LOCAL BAND REUNION MARKS ANNIVERSARY OF THE RED MESA FIRE',
      body: 'Sixty years since the Silver Dollar burned mid-set, the surviving members of the Amarillo Kings met at the diner. The frontman, R.J. Calloway, walked out through the smoke that night with his guitar and never played it again. "He scratched something under the bridge," says the drummer. "Never told us what. Never sold it, either."',
      img: 'prov_redmesa' },
    proof: { after: 7, base: 'photo', name: 'Photograph: a Band on a Flatbed, 1963',
      note: 'Five men, one truck, one guitar held up to the camera. The headstock is chipped on the left. So is yours.' },
    resolved: { name: "R.J. Calloway's Guitar", val: 3400,
      lines: ['You hold the photograph up to the guitar. The chip on the headstock. The same chip.',
              'Under the bridge: R.J. Amarillo \'63. The band in the picture is the Amarillo Kings.',
              'This is the guitar that walked out of the Red Mesa fire.'] },
  },
  mayorTypewriter: {
    town: 'dustyFlats', minDay: 6,
    anchor: { base: 'typewriter', name: 'Typewriter', val: 60,
      note: 'The M sticks. Somebody has written "damn M" on the underside, in pencil, many times.' },
    paper: { after: 3, headline: 'FORMER MAYOR\'S LOST MEMOIR "TYPED ON A MACHINE THAT STUCK ON M"',
      body: 'Mayor Hollis Brand wrote four hundred pages about Dusty Flats and never published them. "Every M was drawn in by hand," says his daughter. "He cursed that machine. He loved it more than the office." The manuscript is missing. So is the machine.',
      img: 'prov_mayor' },
    proof: { after: 7, base: 'photo', name: 'Photograph: a Man at a Desk, 1971',
      note: 'A man in a bolo tie at a typewriter, two fingers raised over the keys, mid-curse.' },
    resolved: { name: "Mayor Brand's Typewriter", val: 1400,
      lines: ['The desk in the photograph. The machine on it. The M key sitting a hair crooked, like yours.',
              'Four hundred pages of hand-drawn Ms came out of this thing.'] },
  },
};
function provState(world, id) {
  world.prov = world.prov || {};
  return (world.prov[id] = world.prov[id] || { planted: null, held: null, proofPlanted: null, resolved: null });
}
// what the director wants to plant today, if anything: {id, kind} or null
function provPlanFor(worldSeed, day, town, world) {
  for (const id in PROVENANCE) {
    const c = PROVENANCE[id], st = provState(world, id);
    const R = RNG(strHash('prov' + id + '_' + worldSeed + '_' + day));
    if (!st.planted && c.town === town.id && day >= c.minDay && R.chance(0.12)) return { id, kind: 'anchor' };
    if (st.held && !st.proofPlanted && day >= st.held + c.proof.after && R.chance(0.35)) return { id, kind: 'proof' };
  }
  return null;
}
// nightly: does the player hold the anchor yet? (the paper and the proof wait for this)
function provNightly() {
  for (const id in PROVENANCE) {
    const st = provState(G.world, id);
    if (!st.held && allHeld().some((it) => it.prov && it.prov.id === id && it.prov.kind === 'anchor')) st.held = G.day;
  }
}
// the paper's step, on the day it is due
function provPaper(day, world) {
  for (const id in PROVENANCE) {
    const c = PROVENANCE[id], st = (world.prov || {})[id];
    if (st && st.held && day === st.held + c.paper.after) {
      return { story: { id: 'prov_' + id, kind: 'provenance', headline: c.paper.headline, img: c.paper.img }, text: c.paper.body, unitKnown: false, named: null, about: null };
    }
  }
  return null;
}
// LOOK CLOSER at the anchor while holding the proof: the connection is made
function provTryResolve(it) {
  if (!it.prov || it.prov.kind !== 'anchor' || it.provResolved) return false;
  const c = PROVENANCE[it.prov.id];
  if (!c) return false;
  const proof = allHeld().find((o) => o.prov && o.prov.id === it.prov.id && o.prov.kind === 'proof');
  if (!proof) return false;
  for (const l of c.resolved.lines) ilog(l, PAL.gold);
  it.name = c.resolved.name; it.preName = null; it.hideBrand = false;
  it.val = c.resolved.val; it.searched = true; it.provResolved = true;
  provState(G.world, it.prov.id).resolved = G.day;
  recordEvent('provenance', { name: c.resolved.name, base: it.base, val: it.val });
  play('legendary_fanfare');
  return true;
}

// ============ keys ============
// Once an epoch, a key turns up in a box. A few days later, somewhere, a lock
// it fits. Both days are fixed by the seed, so the pair is fair, and nothing
// tells you they belong together but the shape of the key.
function keyPlanFor(worldSeed, day) {
  const epoch = Math.floor((day - 1) / 12);
  // a lock can fall in the epoch after its key, so both this epoch's pair and the last one's are checked
  for (const ep of [epoch, epoch - 1]) {
    if (ep < 0) continue;
    const R = RNG(strHash('keys' + worldSeed + '_' + ep));
    const keyDay = ep * 12 + R.i(1, 5);
    // never the same week: the waiting is the point. Capped at the epoch's last
    // day so the lock can never land on the next epoch's key day and be lost
    // (genDay takes one key plan a day, and the newer key would win).
    const lockDay = Math.min(keyDay + R.i(7, 11), ep * 12 + 12);
    const id = 'key' + ep;
    if (day === keyDay) return { id, kind: 'key' };
    if (day === lockDay) return { id, kind: 'lock' };
  }
  return null;
}
function heldKeyFor(it) {
  if (!it.keyId) return null;
  return allHeld().find((k) => k.base === 'oddKey' && k.keyId === it.keyId) || null;
}

// ============ junk personas ============
// A junk pile is still somebody's. Some days the generic junk steps aside for
// one person's things: nine lamps, a closed gym, the church sale nobody ended.
// No money in them. The point is that a person packed this. kit: [base, count]
// swapped in for loose junk of the same width, the front row first so the
// door says it; owner: the office's line at the peek; note: what LOOK CLOSER
// reads off one of them.
// `name` is the person behind the unit. The office never says it out loud and the
// yard panel never shows it — only their paperwork does, when you find some (ephemera.js).
// ---- who had it before you (IDEAS_TODO 5; the user's idea, 2026-09-17) ----
// Every door already carried an owner LINE - a fact off the office form - but never a PERSON. A yard of
// numbered doors reads as inventory; a yard of people reads as a town, and the user's note on all of this
// was that it should not feel like a generic storage-locker game. So every ordinary unit now has a tenant:
// a name, what they were, and how it ended.
//
// It is fiction, not intelligence. The trade follows the ARCHETYPE, which the doorway already told you, and
// the ending comes from a pool that knows nothing whatever about what is inside, so no part of it can be
// read backwards into what the unit is worth. Rumour beats readout, and this is not even rumour: it is only
// somebody's life, and the one thing it is allowed to do is make leaving it behind feel like something.
//
// Every line is written WITHOUT gendered pronouns and must stay that way: the name and the line are drawn
// from separate pools, so a "he" written in here lands on a Loretta one door in two.
//
// Seeded off the door itself, so a unit is the same person however often the morning is reloaded. A door
// that already names somebody keeps theirs - an authored story, a packed persona, your own unit sold out
// from under you, a rival's - and tenantFor gives back null for those, so the screens fall back to `owner`.
const TENANT_FIRST = ['Wendell', 'Marlene', 'Doreen', 'Curtis', 'Eugene', 'Bernice', 'Arthur', 'Clifford',
  'Loretta', 'Harold', 'Vernon', 'Delia', 'Norma', 'Roy', 'Alvin', 'Faye', 'Gaylord', 'Hazel', 'Dwight',
  'Orville', 'Maybelle', 'Lester', 'Glenna', 'Rufus', 'Earlene', 'Chester', 'Iva', 'Virgil'];
const TENANT_LAST = ['Trask', 'Lamb', 'Hollis', 'Dreyer', 'Pike', 'Vance', 'Sturgis', 'Quill', 'Fenner',
  'Dabney', 'Ogle', 'Mullins', 'Tate', 'Rourke', 'Bly', 'Castle', 'Loomis', 'Prosser', 'Winch', 'Hake',
  'Bream', 'Cargill', 'Dunphy', 'Estes', 'Farrow', 'Gant', 'Hobbs', 'Ivers', 'Jessup', 'Keck'];
// what they were, by what kind of door it is. Kept under about 42 characters so the name and the trade
// together still set on ONE line of the peek panel, which wraps at 60.
const TENANT_TRADES = {
  hoarder: ['never threw out a jar or a receipt', 'filled this unit in a fortnight',
    'kept the good things at the very back', 'took it for "a few weeks, tops," in 1989',
    'told the office it was mostly paperwork'],
  musician: ['played bass in four bands, none twice', 'taught guitar behind the record shop',
    'booked the function room every Friday', 'was going to get the band back together',
    'ran sound at the fairground for years'],
  grandma: ['raised five children in a house long gone', 'kept the good china for a visit',
    'went into the home the week this was taken', 'wrapped every last thing in a quilt',
    'left it all to a nephew who never came'],
  workshop: ['fixed lawnmowers for thirty years', 'could mend anything but the one that went',
    'built half a boat in here', 'ran the hardware place on Front Street',
    'kept every tool sharp and every receipt'],
  shopStock: ['ran the shop until the mall opened', 'bought out a failing shop, then failed too',
    'had a closing sale that ran for a year', 'sold electricals, then videos, then air',
    'packed it all the night the lease ran out'],
  smuggler: ['paid cash and spelled the name two ways', 'came at night, and never for long',
    'changed the lock twice without asking', 'gave an address that is a car park',
    'asked at signing who else had a key'],
  timeCapsule: ['locked it in 1974 and never came back', 'went west for work, meaning to send for it',
    'paid by standing order for twenty years', 'packed it for a move that never happened',
    'wrote the date on every box, then stopped'],
  oddball: ['gave an occupation nobody has heard of', 'is remembered as "the one with the hat"',
    'never explained it, and was never asked', 'rented two units and used only the odd one',
    'is vividly remembered here for nothing'],
  officeSurplus: ['managed a branch that closed in a memo', 'was told to clear the office by Friday',
    'ran the region until it was reorganised', 'kept the files because somebody said to',
    'signed on paper that stopped counting'],
};
// and how it ended. Picked apart from the trade and from anything in the unit, so it can never be a tell.
const TENANT_ENDINGS = [
  'The rent stopped in March. The number on file rings a diner.',
  'Eleven months behind, and no forwarding address worth a stamp.',
  'The last payment came in an envelope with no note in it.',
  'Nobody in the office remembers the face. Two of them remember the car.',
  'Two payments were missed, then eight, then the lock came off.',
  'The emergency contact on the form has never heard the name.',
  'The letters went out. The letters came back.',
  'Paid a year ahead, then nothing at all, and no explanation given.',
  'The office rang the number on file for six weeks running.',
  'Whatever happened, it happened somewhere else.',
  'It was paid for long after anybody last came to look in it.',
  'A cousin rang once to ask what was in it, and never rang again.',
  'Last seen at the gate in October, in no particular hurry.',
  'The forwarding address on the form is this unit.',
];
// the tenant of an ordinary door, or null where somebody is already named
function tenantFor(lk, day) {
  if (!lk || lk.story || lk.persona || lk.yourUnit || lk.rivalUnit) return null;
  const trades = TENANT_TRADES[lk.archId] || TENANT_TRADES.hoarder;
  const R = RNG(strHash('tenant_' + (day === undefined ? (typeof G !== 'undefined' ? G.day : 0) : day) + '_' + lk.num + '_' + (lk.archId || '')));
  const name = R.pick(TENANT_FIRST) + ' ' + R.pick(TENANT_LAST);
  const short = name + ' ' + R.pick(trades) + '.';
  return { name, short, line: short + ' ' + R.pick(TENANT_ENDINGS) };
}

const JUNK_PERSONAS = [
  { id: 'lampGuy', name: 'Wendell Corliss', owner: 'Tenant paid in exact change and asked if the unit had an outlet. It does not.',
    kit: [['lamp', 5], ['box', 1]], noteBase: 'lamp', note: 'A tag on the cord: "WORKS." Every lamp in here has a tag. One is telling the truth.',
    special: (placed, R) => { const lamps = placed.filter((it) => it.base === 'lamp'); if (lamps.length) { const l = R.pick(lamps); l.val = 40; l.note = 'This one works. The others are for parts, or for company.'; } } },
  { id: 'gymClosed', name: 'Marlene Kilgore', owner: 'Tenant ran a gym above the hardware store. Membership was "lifetime." So was the lease, briefly.',
    kit: [['mirror', 1], ['mattress', 1], ['bike', 1], ['tire', 1], ['fan', 1]], noteBase: 'mirror', note: 'A phrase painted across the glass: "NO EXCUSE\'S." It is still, somehow, motivating.' },
  { id: 'weddingHappened', name: 'Doreen Hartnett', owner: 'The unit was rented the Monday after the wedding. The card on file says "Mr. and Mrs." The signature says "Mrs."',
    kit: [['diningChair', 4], ['tablecloth', 2], ['vase', 1], ['teddy', 1]], noteBase: 'vase', note: 'The centerpiece. Forty were rented for the day. This is the one that was not returned.' },
  { id: 'tapeGuy', name: 'Curtis Yates', owner: 'Tenant recorded everything. The labels are dates. The dates are all Tuesdays.',
    kit: [['vhs', 4], ['cassettes', 2], ['tv', 1]], noteBase: 'vhs', note: 'Labelled by date and channel. Every Tuesday for six years. Nothing else, ever.' },
  { id: 'cook', name: 'Eugene Mabry', owner: 'Tenant ran a diner for eleven weeks. The menu is stapled inside the door. Everything was $4.',
    kit: [['microwave', 1], ['canCrate', 2], ['china', 1], ['barrel', 1]], noteBase: 'canCrate', note: 'Restaurant-size cans. Beans, beans, peaches, beans. Dated. Not this decade.' },
  { id: 'churchSale', name: 'Bernice Thorpe', owner: 'The church rented the unit for "the sale." The sale was in 1994. The unit was never given up.',
    kit: [['diningChair', 3], ['box', 2], ['painting', 1], ['records', 1]], noteBase: 'painting', note: 'A landscape, signed "Pastor Bill," with a $12 sticker. It did not sell in 1994 either.' },
  { id: 'modelRailroader', name: 'Arthur Selby', owner: 'Tenant built a town in here. The boxes are labelled by street. The streets are real. The town is not.',
    kit: [['box', 3], ['workbench', 1], ['lamp', 1], ['toolbox', 1]], noteBase: 'box', note: 'Labelled "MAIN ST — DO NOT TIP." Inside, presumably, Main Street.' },
  { id: 'ladderMan', name: 'Clifford Novak', owner: 'Tenant owned ladders. Only ladders. Neighbors say he never went up any of them.',
    kit: [['ladder', 3], ['toolbox', 1], ['tire', 1]], noteBase: 'ladder', note: 'Painted on the rail: "THE GOOD ONE." Every ladder in here says that.' },
];
// swap the kit in for loose junk of the same width, the front row first; returns true if anything landed
function applyPersona(R, items, p) {
  // anything loose and ordinary can step aside, empty boxes included (this runs before the boxes are filled)
  const victims = items.filter((it) => !it.set && !it.onUid && !it.stackedUid && !it.cash && !it.loot && !it.legendary && !it.fake)
    .sort((a, b) => (b.layer - a.layer) || (a.col - b.col));
  const placed = [];
  for (const [base, count] of p.kit) {
    for (let c = 0; c < count; c++) {
      const it = makeItem(base, R);
      const vi = victims.findIndex((v) => v.wCols >= it.wCols);
      if (vi < 0) continue;
      const v = victims.splice(vi, 1)[0];
      it.layer = v.layer; it.col = v.col;
      if (it.wCols > v.wCols) it.wCols = v.wCols;
      it.persona = p.id;
      items[items.indexOf(v)] = it;
      placed.push(it);
    }
  }
  if (!placed.length) return false;
  const target = placed.find((it) => it.base === p.noteBase) || placed[0];
  target.note = p.note;
  if (p.special) p.special(placed, R);
  return true;
}

// ============ the rare days ============
// About one morning in fifty. Four things, each about once in two hundred
// days: a raccoon living in a unit (LEAVE IT is the only button; the vest
// turns up in the van anyway), a door that is nothing but lamps and one of
// them works, the day Sal looks at a door and leaves ("dentist"), and the
// Baroness's chair, which is an ordinary chair with a plaque, and Carl pays
// double. Each gets one line in the next morning's paper. Nothing counts them.
const RARE_EVENTS = [
  { id: 'raccoon', apply: (R, lk) => {
    const it = swapInBase(R, lk.items, 'liveRaccoon');
    if (!it) return false;
    it.leaveOnly = true; it.note = 'It is looking at you. It has a receipt.';
    it.name = 'A Raccoon. Alive.'; it.preName = null; it.cond = 'Clean';   // no condition grade. He would object.
    lk.flavor2 = 'Something in the back row breathes.';
    placeFront(R, lk, 'droppings');                                        // and the front row says so, to anyone who reads it
    recomputeValue(lk);
    return true;
  } },
  { id: 'nineLamps', apply: (R, lk) => {
    // nine means nine: a door without nine loose ordinary things to step aside is not the door
    const room = lk.items.filter((it) => !it.set && !it.onUid && !it.stackedUid && !it.cash && !it.loot && !it.legendary && !it.fake && !it.note).length;
    if (room < 9) return false;
    const p = { id: 'nineLamps', kit: [['lamp', 9]], noteBase: 'lamp', note: 'The bulb is warm. Somebody was just here. Or the lamp does not care.',
      special: (placed, R2) => { const one = R2.pick(placed); one.tag = 'WORKS'; one.val = Math.max(one.val, 600); one.name = 'Working ' + one.name; } };
    if (!applyPersona(R, lk.items, p) || lk.items.filter((it) => it.base === 'lamp').length < 9) return false;
    lk.owner = 'Tenant is listed as "lamps." That is the whole entry.';
    recomputeValue(lk);
    return true;
  } },
  { id: 'salDentist' },   // a person, not a door: startAuction reads today.facts.rare
  { id: 'baroness', apply: (R, lk) => {
    const it = swapInBase(R, lk.items, 'armchair');
    if (!it) return false;
    it.baroness = true; it.name = "The Baroness's Chair"; it.preName = null;
    it.note = 'A brass plaque on the back: THE BARONESS. The county has never had one. The chair does not know that.';
    recomputeValue(lk);
    return true;
  } },
];

// ============ pairs ============
// Two ordinary things in one ordinary door whose details point at each other:
// the same date, the same initials, the same motel. One a day at most, on
// three days in ten. The player invents the story before the game says
// anything, which is the whole idea. a goes loose where junk was; b goes in an
// open container when there is one.
const PAIRS = [
  { id: 'motel', a: { base: 'photo', note: 'Two people outside the Sunset Motel, room 6. The back says 6/14/88.' },
    b: { base: 'ring', note: 'Engraved inside: "6/14/88 — room 6." Somebody kept the joke. Somebody kept the ring.' } },
  { id: 'tube', a: { base: 'wrench', note: 'Taped to the handle, a receipt: one tube, type 7A, "for the radio." Never fitted.' },
    b: { base: 'radio', note: 'The back is off. One tube missing, type 7A. Somebody got as far as the receipt.' } },
  { id: 'luggage', a: { base: 'teddy', note: 'A luggage tag on its paw: "BENT FORK — DO NOT LOSE." It was lost.' },
    b: { base: 'suitcase', note: 'The same luggage tag, torn: "— DO NOT LOSE." The other half is on something small.' } },
  { id: 'setlist', a: { base: 'amp', note: 'A setlist taped to the top. "Roy\'s, Friday. Do NOT play the long one."' },
    b: { base: 'guitarCase', note: 'Inside the lid, the same handwriting: "Roy\'s, Friday. LONG ONE." Underlined twice. They played it.' } },
  { id: 'initials', a: { base: 'pocketWatch', note: 'Engraved: "To H.L.F., forty years." The forty years are worn smooth.' },
    b: { base: 'brooch', note: 'On the back, in a different hand: "H.L.F. — from the other one."' } },
  { id: 'lowE', a: { base: 'typewriter', note: 'The E strikes low. Anything typed on this has a low E.' },
    b: { base: 'photo', note: 'A letter, photographed so it could not be lost. Every E sits low on the line. Signed "yours, still."' } },
  { id: 'diner', a: { base: 'china', note: 'Diner china. The rim says EAT in green. Somebody kept one plate.' },
    b: { base: 'silverware', note: 'Diner flatware, EAT stamped on every handle. Somebody took the whole drawer.' } },
  { id: 'bib41', a: { base: 'skis', note: 'Bib number 41 still safety-pinned to the strap. Kettle Basin Winter Classic, 1979.' },
    b: { base: 'medal', note: 'Kettle Basin Winter Classic, 1979. Third. The ribbon has been re-sewn twice.' } },
];
function recomputeValue(lk) {
  let v = 0;
  for (const it of lk.items) { v += it.val; if (it.loot) for (const l of it.loot) v += l.val; }
  lk.value = v;
}
function applyPair(R, lk, pair) {
  const items = lk.items;
  const a = swapInBase(R, items, pair.a.base);
  if (!a) return false;
  a.note = pair.a.note; a.pair = pair.id;
  // the other half hides in a container only if it would physically go in one
  const half = makeItem(pair.b.base, R);
  const open = items.filter((x) => x.container && x.loot && !x.locked && x !== a && canHold(x, half));
  if (open.length) {
    const b = half;
    b.note = pair.b.note; b.pair = pair.id;
    R.pick(open).loot.push(b);
  } else {
    const b = swapInBase(R, items, pair.b.base);
    // the first half is already swapped in by here, so backing out still changes the door
    if (!b) { a.note = null; a.pair = null; recomputeValue(lk); return false; }
    b.note = pair.b.note; b.pair = pair.id;
  }
  recomputeValue(lk);
  return true;
}
