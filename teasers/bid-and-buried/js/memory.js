// ---- the town's memory: a short list of things the player actually did ----
// Every system that wants to remember something writes a fact here; every
// system that wants to bring something up reads from here. The office, the
// paper, the rivals, the TV and the buyers all drink from this one well, so
// a single event can echo for days without any of them knowing about the
// others. No meter reads it. Nothing counts it at the player.
'use strict';

const EVENT_CAP = 300;

// what an event is keyed on when the same day gets replayed after a quit:
// the same fact about the same thing on the same day is one fact
function _eventKey(k, day, town, data) {
  if (data.uid) return [k, day, town, data.uid].join('|');           // one fact per item per day (a blind sale, say — two of the same thing both count)
  if (data.unit) return [k, day, town, data.unit].join('|');       // one fact per unit per day
  return [k, day, town, data.base || '', data.name || '', data.setId || ''].join('|');
}

// recordEvent('won', { unit, paid, value }) — day and town are stamped on
function recordEvent(kind, data) {
  const w = G.world;
  w.events = w.events || [];
  const ev = Object.assign({ k: kind, day: G.day, town: w.town }, data || {});
  const key = _eventKey(ev.k, ev.day, ev.town, ev);
  if (w.events.some((e) => _eventKey(e.k, e.day, e.town, e) === key)) return null;
  w.events.push(ev);
  if (w.events.length > EVENT_CAP) w.events.splice(0, w.events.length - EVENT_CAP);
  return ev;
}

// the whole memory, or one kind of it; sinceDay keeps old news old
function eventsWhere(kind, opts) {
  const w = G.world, o = opts || {};
  return (w.events || []).filter((e) =>
    (!kind || e.k === kind) &&
    (o.town === undefined || e.town === o.town) &&
    (o.sinceDay === undefined || e.day >= o.sinceDay) &&
    (!o.where || o.where(e)));
}
function lastEvent(kind, opts) {
  const list = eventsWhere(kind, opts);
  return list.length ? list[list.length - 1] : null;
}
function countEvents(kind, opts) { return eventsWhere(kind, opts).length; }

// ---- standing: what a face thinks of you, and how fast it forgets ----
// The auction's moves (calling someone out, running them up, a slip that gets caught)
// cost standing with that face, never sun. A sore face comes out for your doors and bids
// you up (prepNpcsForAuction); one that has it in for you goes a little past its number
// too. Nothing is stored but the last mark and the day it was made: a grudge mends one
// point every STANDING_MEND_DAYS on its own, so a save never needs a nightly pass.
const STANDING_MIN = -5, STANDING_MAX = 3, STANDING_MEND_DAYS = 4, WARM_AT = 2;
const STANDING_AS = { cody: 'duo', kaylee: 'duo' };   // Cody and Kaylee apart for a week are still the one pair, as far as what they think of you
function standingOf(id) {
  id = STANDING_AS[id] || id;
  const s = ((G.world && G.world.rivalMem && G.world.rivalMem.standing) || {})[id];
  if (!s) return 0;
  const mend = Math.floor(Math.max(0, G.day - s.day) / STANDING_MEND_DAYS);
  return s.v < 0 ? Math.min(0, s.v + mend) : Math.max(0, s.v - mend);
}
function standingBump(id, d) {
  id = STANDING_AS[id] || id;
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  mem.standing = mem.standing || {};
  const v = Math.max(STANDING_MIN, Math.min(STANDING_MAX, standingOf(id) + d));
  mem.standing[id] = { v, day: G.day };
  return v;
}
function standingLabel(v) {
  if (v <= -4) return 'has it in for you';
  if (v <= -2) return 'sore at you';
  if (v < 0) return 'a little sore at you';
  if (v >= WARM_AT) return 'warm to you, for now';
  if (v >= 1) return 'nods at you now';
  return 'even with you';
}

// ---- the warm half of standing ----
// Standing has always run -5..+3, but everything hung off the negative half: only a sore face
// changed anything, and 'warm to you, for now' was a label nothing read. This is the other side.
// At WARM_AT a face is warm: no spite number for you in the room, a slightly softer cap, a tip
// through the office, and first refusal on going halves. It cannot be banked - standing mends a
// point every STANDING_MEND_DAYS toward even, so warmth fades unless you keep earning it (letting
// somebody have a door they needed, an arc returned, a favour done).
function warmOn(id) { return standingOf(id) >= WARM_AT; }
// bart, ed and the duo each hand-rolled their own "owes you" window. This is the one idea under
// all three, plus warmth: somebody who is not going to hunt you today.
function owesYou(id, day) {
  const mem = (G.world && G.world.rivalMem) || {};
  const d = day || G.day;
  if (id === 'bart' && (mem.bartOwesUntil || 0) >= d) return true;
  if (id === 'ed' && (mem.edOwesUntil || 0) >= d) return true;
  if (id === 'duo' && (mem.duoOwesUntil || 0) >= d) return true;
  return warmOn(id);
}
// who in this town is warm right now, sorted so the office says the same thing all day
function warmFacesNow() {
  const town = (typeof TOWNS !== 'undefined' && TOWNS[(G.world && G.world.town) || '']) || {};
  const roster = (typeof NPCS !== 'undefined' ? NPCS.map((n) => n.id) : []).concat(town.rivals || []);
  return roster.filter((id, i) => roster.indexOf(id) === i && warmOn(id) && !awayOn(id, G.world, G.day)).sort();
}

// ============ the player, as the rivals see them ============
// Nothing is tracked but what already happened: the last dozen doors you won.
// If most of them had music gear up front, you collect music gear. Everybody
// at the yard has noticed. Nobody will show you a number about it.
const HABIT_LABEL = {
  furniture: 'the furniture', antiques: 'the antiques', music: 'the music gear', tools: 'the tools',
  electronics: 'the electronics', jewelry: 'the jewelry', collectibles: 'the collectibles', weird: 'the weird stuff',
};
function playerHabits() {
  const wins = eventsWhere('won').filter((e) => e.day < G.day).slice(-12);   // only past mornings count: a replayed day reads the same
  const cats = {};
  let safes = 0, ed = 0;
  for (const e of wins) {
    for (const c of (e.doorCats || [])) cats[c] = (cats[c] || 0) + 1;
    if (e.doorSafe) safes++;
    if (e.edTier === 'hot' || e.edTier === 'warm') ed++;
  }
  const h = { cats: [], safes: false, followsEd: false, wins: wins.length };
  if (wins.length < 6) return h;
  for (const c in cats) {
    if (c === 'junk') continue;
    const bar = c === 'furniture' ? 0.7 : 0.45;              // everybody's door has a couch on it
    if (cats[c] >= 5 && cats[c] / wins.length >= bar) h.cats.push(c);
  }
  h.safes = safes >= 4;
  h.followsEd = ed >= 5;
  return h;
}
// which of the player's habits this door plays to: [] when none
function doorMatchesHabit(locker, habits) {
  const h = habits || playerHabits();
  const out = [];
  for (const it of locker.items) {
    if (it.layer !== 2) continue;
    if (h.cats.includes(it.cat) && !out.includes(it.cat)) out.push(it.cat);
    if (h.safes && it.loot && it.locked && !out.includes('safe')) out.push('safe');
  }
  return out;
}

// ============ the town talking back ============
// Every consumer below reads the same log and marks what it has already said,
// so one fact can echo through the office, the auction, the paper and the set
// without any of them knowing the others exist.
function _said(e, who) { e.told = e.told || {}; return !!e.told[who]; }
function _say(e, who) { e.told = e.told || {}; e.told[who] = true; }
// a thing's name without its grade or its own article, so "the {name}" reads right
function _plainName(e) { return (e.name || 'thing').replace(/^(Dusty|Worn|Clean|Mint) /, '').replace(/^(The|THE) /, ''); }
function _aName(e) { const n = _plainName(e).toLowerCase(); return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n; }
function _fill(t, e) {
  const you = playerEpithet(e.town);
  return t.replace(/\{name\}/g, _plainName(e).toLowerCase())
    .replace(/\{u\}/g, e.unit || '?').replace(/\{amt\}/g, fmt$(e.amt || e.paid || e.val || 0))
    .replace(/\{town\}/g, (TOWNS[e.town] || {}).name || 'town')
    .replace(/\{you\}/g, you).replace(/\{You\}/g, you.charAt(0).toUpperCase() + you.slice(1));
}
// what a town calls you, by how often it has watched you win there. Not a rank: a noun phrase the paper and the clerk use
function playerEpithet(townId) {
  const w = G.world, tid = townId || w.town;
  if (typeof yardOwned === 'function' && yardOwned() && tid === 'dustyFlats') return 'the one who owns the yard';
  const wins = countEvents('won', { town: tid });
  if (wins >= 12) return 'the one who reads the paper';
  if (wins >= 6) return 'a regular';
  if (wins >= 2 || tid === 'dustyFlats') return 'a bidder';
  return 'an out-of-town bidder';
}
// how a rival has been doing against you lately: three doors ahead and they are cocky, three behind and they are wary.
// Ed is left out; Ed has his own arc.
function rivalStance(id, day) {
  if (id === 'ed' || id === 'crowd') return null;
  const since = (day || G.day) - 20;
  let taken = 0, beaten = 0;
  for (const e of (G.world.events || [])) {
    if (e.day < since) continue;
    if (e.k === 'lost' && e.contested && e.rival === id) taken++;
    else if (e.k === 'won' && (e.fought || []).includes(id)) beaten++;     // they led it and you took it; being in the room does not count
  }
  if (taken - beaten >= 3) return 'cocky';
  if (beaten - taken >= 3) return 'wary';
  return null;
}
const STANCE_LINES = {
  cocky: {
    sal: ['"Oh good. You." Sal cracks his knuckles. He has been winning.', '"Let me guess. You\'ll fold at the number." Sal grins.'],
    bart: ['"Still here?" Bart settles in. He has taken enough of your doors to sound bored.'],
    dutch: ['"Yip." Dutch looks at you the way he looks at a door he already owns.'],
    duo: ['"It\'s them again." "We beat them last time." "We beat them EVERY time."'],
    default: ['{name} does not look at you. {name} has not needed to lately.'],
  },
  wary: {
    sal: ['Sal sees you and says nothing. Sal has not said nothing before.'],
    bart: ['Bart checks his money clip when you walk up. He never used to.'],
    dutch: ['"...yip." Dutch, quieter than usual. He has lost a few to you.'],
    duo: ['"Don\'t bid against them." "I\'m NOT." They are, but carefully.'],
    default: ['{name} watches you count your change. {name} has stopped bidding first.'],
  },
};
// one opener per auction at most, in the voice of whoever has a stance, sharing the gossip's slot
function stanceLine(npcs) {
  const opts = [];
  for (const a of npcs) {
    if (!a.active || a.crowd || !a.stance) continue;
    const pool = STANCE_LINES[a.stance][a.def.id] || STANCE_LINES[a.stance].default;
    opts.push({ who: a.def.id, pool, name: a.def.name });
  }
  if (!opts.length) return null;
  const R = dayR('stance', G.cur ? G.cur.num : 0);
  if (!R.chance(0.4)) return null;
  const o = R.pick(opts);
  return { who: o.who, text: R.pick(o.pool).replace(/\{name\}/g, o.name) };
}

// ---- the office: one line on the yard, the day after, in the town where it happened ----
const OFFICE_LINES = {
  left: ["Roy's wife bought that {name} you left in unit {u}. She is very pleased with herself.",
         'The clerk mentions, unprompted, the {name} still sitting in unit {u} when the hauler came.',
         'Unit {u}: the {name} you walked away from went to a man from the diner. He paid cash.'],
  legend: ['The office has framed the clipping about the {name}. Your name is spelled wrong.',
           'The clerk asks if it is true about the {name}. Then answers herself: it is true.'],
  fake: ['The office is still laughing about the {name}. Gently. Mostly.',
         'The clerk keeps a {name} on the desk now. A joke. Probably a joke.'],
  perfectVan: ["The clerk says nobody has packed a van that tight since '88. He was the one in '88.",
               'Word around the office is you loaded unit {u} "like a puzzle." That is a compliment here.'],
  broke: ['The clerk asks, gently, whether you ate today.', 'There is a coffee waiting on the counter. Nobody will say who left it.'],
  crushed: ['The clerk asks how the {name} rode home. He already knows how it rode home.',
            '"Route 9," the clerk says, about the {name}, and nothing else. It is an apology.'],
  bigSale: ['Word is you sold a {name} for {amt}. The clerk wants to know to whom.',
            'The {amt} you got for the {name} came up at the diner. Twice.',
            'The clerk has a cousin who "would have paid more" for the {name}. The clerk always has that cousin.'],
  setDone: ['The office heard about the {name}. The clerk asks if it seats six. It seats six.',
            'The clerk asks whether the {name} is "for sale or for keeping." He nods at either answer.'],
  tidy13: ['The clerk says unit 13 was "like that" this morning. He has stopped asking who.',
           'The clerk found unit 13 swept. The broom is his. He has not lent it to anyone.'],
  keyUsed: ['The clerk heard about the key. "From another unit? Another TOWN?" He has to sit down.'],
  yardRumor: ['The clerk says the owner has been "talking about the coast." He says it quietly, and then looks at the office door.',
              '"He\'s tired," the clerk says, about the owner, about nothing, and goes back to the ledger.'],
  yardSign: ['The clerk has put a small sign on the wall. "He asked me not to make it big."',
             '"Bart came by about the sign," the clerk says. "He was laughed at. It was a good laugh."'],
  yard: ['"Morning, boss." The clerk has been practicing that. It shows.',
         'The clerk has painted a parking space with your name on it. The spelling is close.',
         'Deposits the raccoon has been informed of the change in ownership. He has not changed his behavior.'],
  provenance: ['The clerk has heard the {name} has a name now. She would like to see it. Everyone would.'],
  overpaid: ['The clerk saw what came out of unit {u}. He saw what you paid. He is being very kind about it.',
             'Word is unit {u} cost {amt}. The clerk has started a pool on whether you will say why.'],
  sameThing: ['The clerk asks, carefully, about the {name}. The fourth one. He has been counting.',
              'There is a {name} on the clerk\'s desk now. He says it is not a comment.'],
  blindWin: ['You bought unit {u} without looking inside. The clerk has told that story twice already this morning.',
             'The clerk calls unit {u} "the blind one." So does everyone.'],
  comeback: ['The clerk says the coffee is still free. It is not. He pours it anyway.',
             '"Told them you\'d be back," the clerk says. He told nobody. He is pleased.'],
  raccoon: ['The clerk saw Deposits with your {name}. He did not intervene. "Union rules."',
            'The clerk has posted a notice about the raccoon. The raccoon has posted one back.'],
};
// the second time, and the third, the office says something else: mundane stupidity is remembered too
const OFFICE_LINES_N = {
  fake: {
    2: ['"Again," the clerk says, about the {name}. Just that.', 'The clerk does not laugh about the {name} this time. That is worse.'],
    3: ['The office keeps a shelf for the things you have bought that turned out plastic. It has a label now.',
        'Three. The clerk holds up three fingers and does not say what they are for.'],
  },
  raccoon: {
    2: ['The vest was ironed this time. The clerk noticed. Everybody noticed.'],
    3: ['The raccoon left a receipt for the {name}. The clerk has filed it.'],
    4: ['Deposits the raccoon has a bidder number. It is 89. The clerk will not say who sold it to him.'],
  },
};
function _nthPool(table, e) {
  const t = table[e.k];
  if (!t) return null;
  const n = countEvents(e.k, { where: (x) => x.day <= e.day });
  const keys = Object.keys(t).map(Number).filter((k) => k <= n);
  return keys.length ? t[Math.max.apply(null, keys)] : null;
}
// ---- the shed: the place you keep things you do not understand yet ----
// One line under the shelves. It changes with what is on them and how long it
// has been there. It never counts anything at you.
function shedMusing() {
  const held = allHeld();
  const age = (it) => G.day - (it.shedDay || G.day);
  const opts = [];
  const keys = held.filter((it) => it.base === 'oddKey');
  const locks = held.filter((it) => it.keyId && it.locked);
  for (const k of keys) {
    if (locks.some((l) => l.keyId === k.keyId)) opts.push('The odd key and the odd lock are on the same shelf. Go on.');
    else if (age(k) >= 3) opts.push('An odd key in the drawer. ' + age(k) + ' days now. It fits something. Somewhere.');
    else opts.push('An odd key. You kept it. You are not sure why yet.');
  }
  for (const it of held) {
    if (it.prov && it.prov.kind === 'anchor' && !it.provResolved) {
      const proof = held.some((o) => o.prov && o.prov.id === it.prov.id && o.prov.kind === 'proof');
      opts.push(proof ? 'The photograph and the ' + _plainName(it).toLowerCase() + ' are in the same room now. Look closer.'
        : 'The ' + _plainName(it).toLowerCase() + ' still has a scratch you cannot read. Yet.');
    }
    if (it.prov && it.prov.kind === 'proof' && !held.some((o) => o.prov && o.prov.id === it.prov.id && o.prov.kind === 'anchor'))
      opts.push('A photograph of somebody holding something you do not have.');
    if (it.fake && it.searched) opts.push('The ' + _plainName(it).toLowerCase() + '. Plastic. You keep it anyway.');
    if (it.storyPayoff) opts.push('The ' + _plainName(it).toLowerCase() + ". Somebody's whole story, on a shelf.");
  }
  if (held.some((it) => it.set && !it.setComplete)) opts.push('Matching grain, waiting on the rest of the family.');
  if (!opts.length) return 'the shed. sorted, safe, and off the books.';
  return opts[(G.day + opts.length) % opts.length];
}

function officeLine() {
  const scrap = scrapTaleLine();                    // the hauler's story keeps its slot
  if (scrap) return scrap;
  // a want ad in the paper: the clerk makes sure you saw it, once
  const wc = publicCommissions().find((c) => !c.officeSaid);
  if (wc) {
    wc.officeSaid = true;
    const bd = BUYERS.find((b) => b.id === wc.buyer);
    return 'The clerk taps the Gazette. "' + (bd ? bd.name.split(' ')[1] : 'A dealer') + ' has a want ad in. A ' + wc.name + '. Pays well over the usual."';
  }
  // the office notices what you keep, and for how long
  for (const it of allHeld()) {
    if (it.officeAsked) continue;
    if (it.base === 'oddKey' && G.day - (it.shedDay || G.day) >= 8) { it.officeAsked = true; return 'The clerk asks if you ever found what that key fits. You have not. He nods like that is normal.'; }
    if (it.prov && it.prov.kind === 'anchor' && !it.provResolved && G.day - (it.shedDay || G.day) >= 10) { it.officeAsked = true; return 'The clerk asks about the ' + _plainName(it).toLowerCase() + '. She read something in the paper. So did you.'; }
  }
  const w = G.world;
  const cands = (w.events || []).filter((e) => OFFICE_LINES[e.k] && e.town === w.town && e.day < G.day && G.day - e.day <= 10 && !_said(e, 'office'));
  if (!cands.length) return null;
  const e = cands[0];
  _say(e, 'office');
  const R = RNG(strHash('office' + G.worldSeed + '_' + e.day + '_' + e.k));
  return _fill(R.pick(_nthPool(OFFICE_LINES_N, e) || OFFICE_LINES[e.k]), e);
}

// ---- rivals bring it up at the next auction, in their own voices ----
const RIVAL_GOSSIP = {
  won: { who: ['sal', 'bart'], test: (e) => e.paid > e.value * 0.9,
    lines: { sal: ['"Heard you paid {amt} for unit {u}. I\'d have let you have it for more."', '"Unit {u}. {amt}. I told everyone."'],
             bart: ['"{amt} for {u}? Son, I\'ve tipped valets less and gotten more."'] } },
  bargain: { who: ['bart', 'ed'], test: (e) => e.k === 'won' && e.paid < e.value * 0.25,
    lines: { bart: ['"You stole unit {u} out from under me. I noticed. I don\'t forget."'],
             ed: ['"Unit {u}. {amt}. The math was there for anyone." Ed does not look up.'] } },
  legend: { who: ['dutch', 'sal', 'ed', 'bart', 'duo'], lines: { dutch: ['"YIIIP. The {name} guy. YIP." Dutch points at you.'], sal: ['"The {name}. Sure. Bet it\'s plastic." Sal knows it is not.'],
    ed: ['"The {name}." Ed closes the notebook. "I had that unit at eleven hundred." He opens it again.'], bart: ['"Heard you found the {name}. I found a dresser." Bart does not sound pleased about the dresser.'],
    duo: ['"That\'s the {name} person." "Don\'t POINT." "I\'m not POINTING."'] } },
  fake: { who: ['sal', 'duo', 'dutch', 'bart'], lines: { sal: ['"How\'s the {name}? Still plastic?" Sal is delighted.', '"Ask him about the {name}." Sal, to the crowd.'],
    duo: ['"That\'s the {name} person." "Don\'t POINT."'], dutch: ['"Nope." Dutch, about the {name}, kindly. It is the only time he has said it.'],
    bart: ['"I bought a fake once." Bart, unprompted. "It was a horse."'] } },
  setDone: { who: ['ed', 'bart', 'duo'], lines: { ed: ['"The {name}. I watched the pieces go by for weeks." Ed nods once.'], bart: ['"Heard you put a whole set together. Cute."'],
    duo: ['"They finished the {name}." "WE could finish a set." "We could not finish a sandwich."'] } },
  left: { who: ['sal', 'bart'], test: (e) => e.val >= 250, lines: { sal: ['"Left a {name} in unit {u}, I heard. Generous." Sal did not get it either.'], bart: ['"A {name}. In the dark. Son." Bart shakes his head.'] } },
  lost: { who: [], test: (e) => e.contested, lines: {} },   // the rival who took it fills in below
  perfectVan: { who: ['dutch'], lines: { dutch: ['"YIP." Dutch mimes a very full van. "Yip."'] } },
  crushed: { who: ['sal'], lines: { sal: ['"How\'d the {name} ride? Bumpy?" Sal grins.'] } },
  keyUsed: { who: ['ed', 'dutch'], lines: { ed: ['"You kept the key." Ed writes something. "I would not have kept the key."'], dutch: ['"The KEY guy. Yip." Dutch nods at you with real respect.'] } },
  yardRumor: { who: ['ed', 'sal'], lines: { ed: ['"The old man\'s selling the yard." Ed, to his notebook. "Somebody should buy it who reads."'], sal: ['"Heard the yard\'s going up. Bet YOU can\'t afford it." Sal hopes that is true.'] } },
  yardSign: { who: ['bart', 'ed'], lines: { bart: ['"I offered the old man seventy for the yard. He laughed. He\'s holding out for ninety." Bart is not laughing.'], ed: ['"Ninety thousand for the yard." Ed does the math out loud. "It pays. Slowly."'] } },
  yard: { who: ['bart', 'sal', 'ed', 'dutch'], lines: { bart: ['"Landlord." Bart tips his hat. It is not entirely a joke.'], sal: ['"So we pay YOU now." Sal is furious. Sal is also here, so.'], ed: ['"Congratulations." Ed means it. He writes down the date.'], dutch: ['"YIIIP." Dutch, about the yard, about you, about everything.'] } },
  provenance: { who: ['ed', 'sal', 'bart'], lines: { ed: ['"The {name}. I saw the scratch. I did not see the story." Ed, quietly.'], sal: ['"So it\'s got a NAME now. Great. Still a {name}."'], bart: ['"Heard you found out what you had. Rare, that. Finding out."'] } },
  overpaid: { who: ['sal', 'bart', 'duo'], lines: { sal: ['"{amt} for unit {u}. I watched what came out. I am still watching."', '"Unit {u}. {amt}. Say it out loud. Slowly."'],
    bart: ['"Son, I overpay on purpose. What was your excuse for unit {u}?"'], duo: ['"They paid {amt} for {u}." "We KNOW." "For AIR."'] } },
  sameThing: { who: ['sal', 'dutch'], lines: { sal: ['"Another {name}. What is it with you and the {name}?"'], dutch: ['"Yip." Dutch nods at the {name} in your van. He has seen it before. He has seen it four times.'] } },
  blindWin: { who: ['vale', 'charlie', 'sal'], lines: { vale: ['"Unit {u}. Unseen. One admires the nerve, if not the method."'],
    charlie: ['"You bid on a door you never OPENED. That is money or madness." Charlie is delighted either way.'], sal: ['"Bought {u} blind, I heard. I\'d have sold you my van blind."'] } },
  comeback: { who: ['dutch', 'bart', 'sal'], lines: { dutch: ['"YIP." Dutch, about you being back. He noticed you were gone.'],
    bart: ['"Heard you were down to gas money. Heard you\'re not. Good." Bart means it, briefly.'], sal: ['"Back from the dead. Great. I had your parking space."'] } },
  raccoon: { who: ['dutch', 'sal', 'bart'], lines: { dutch: ['"Yip." Dutch, about the raccoon, with real sympathy.'],
    sal: ['"Heard the raccoon got your {name}. He has better taste than you."'], bart: ['"A raccoon. Son, I have been robbed by bankers. A raccoon is a compliment."'] } },
  // you bid somebody past their own number and let them have it: they know
  ranUp: { who: 'winner', any: ['"Unit {u}." A long look at you. The sentence does not get finished.', '"{amt} over my number. I did the sum on the drive home."',
                                '"Unit {u}. I know what that was." Said quietly, which is worse.'] },
  // the second fake and every one after: nobody is gentle any more
  fakeAgain: { who: ['sal', 'duo', 'ed'], lines: { sal: ['"Another one? ANOTHER one?" Sal, about the {name}, to the whole yard.'],
    duo: ['"They bought another {name}." "The PLASTIC kind?" "The plastic kind."'], ed: ['"The {name}." Ed writes a small mark in the notebook. It is a tally.'] } },
};
const LOST_GLOAT = {
  bart: '"Still thinking about unit {u}? I\'m not."', sal: '"Unit {u} was MINE. Say it."', ed: '"Unit {u}. You stopped one raise short." Ed underlines something.',
  dutch: '"Unit {u}? YIIIP." He means: his.', duo: '"We got {u}." "WE got {u}." They agree, for once.',
  vera: '"Unit {u} sold in the city already. Twice."', tuck: 'Tuck nods at you. Unit {u}. He remembers.',
  bev: '"The boxes in {u} were full, by the way." Bev, kindly.', pruitt: '"Unit {u} weighed out fine." Pruitt slaps the tailgate.',
  hattie: '"Unit {u} was in the PAPER. You read it. I read it better."', delgado: '"Unit {u}. Not the one they printed. Told you."',
  dee: '"Unit {u} went to a good home." Dee smiles at you. It is not unkind.', cobb: '"Unit {u} had a compressor. You blinked."',
  ferrell: '"Unit {u} was normal. NORMAL. I needed that."', wanda: '"Unit {u} had something in it. Carl was pleased."',
  vale: '"Unit {u} had a name in it. You did not know the name."', charlie: '"Unit {u} SHONE. You let it go."',
  priscilla: '"Unit {u} was Mint. You hesitated. Mint does not wait."', garrity: '"Unit {u} is accessioned." Garrity, flatly.',
  ilse: 'The Baroness glances at you. Unit {u}. That is all she needs to say.', dex: '"Unit {u}, man. Vibes. You didn\'t feel them."',
};
function rivalGossip(npcs) {
  const w = G.world;
  const active = npcs.filter((a) => a.active && !a.crowd).map((a) => a.def.id);
  const cands = (w.events || []).filter((e) => e.day < G.day && G.day - e.day <= 8 && !_said(e, 'rival'));
  const opts = [];
  for (const e of cands) {
    if (e.k === 'lost' && e.contested && active.includes(e.rival) && LOST_GLOAT[e.rival]) opts.push({ e, who: e.rival, line: LOST_GLOAT[e.rival], react: 'win' });
    let kind = e.k === 'won' && e.paid < e.value * 0.25 ? 'bargain' : e.k;
    if (kind === 'fake' && countEvents('fake', { where: (x) => x.day <= e.day }) >= 2) kind = 'fakeAgain';
    const g = RIVAL_GOSSIP[kind];
    if (!g || (g.test && !g.test(e))) continue;
    const whoList = g.who === 'winner' ? [e.rival] : g.who;     // 'winner': the one it happened to, whoever that was
    for (const who of whoList) if (active.includes(who) && ((g.lines && g.lines[who]) || g.any)) opts.push({ e, who, line: null, pool: (g.lines && g.lines[who]) || g.any, react: (kind === 'ranUp' || kind === 'tookNeed' || kind === 'edNotebookKept' || kind === 'spiteWar') ? 'glare' : ((kind === 'letHaveIt' || kind === 'edNotebookReturned' || kind === 'tenantSoldBack') ? 'warm' : 'scoff') });
  }
  if (!opts.length) return null;
  const R = dayR('gossip', G.cur ? G.cur.num : 0);
  if (!R.chance(0.4)) return null;
  const o = R.pick(opts);
  _say(o.e, 'rival');
  return { who: o.who, text: _fill(o.line || R.pick(o.pool), o.e), react: o.react };
}

// ---- the paper: a callback runs two days after the fact, wherever you are ----
// No flags here: genPaper must give the same paper on a reload, so the day
// offset alone decides. Day + 2, one story, the first fact of the day that fits.
const PAPER_CALLBACKS = {
  left: { headline: 'LOCAL BIDDER LEAVES {NAME} BEHIND; HAULER "STILL SMILING"',
    body: '{You} cleared unit {u} at the {town} yard and drove off without a {name} that, sources say, "was right there." The scrap hauler declined to say what he did with it. He was eating a very good lunch.', img: 'cb_left' },
  legend: { headline: 'IT WAS REAL: THE {NAME} SURFACES AT {TOWN} STORAGE AUCTION',
    body: 'The {name}, a story every child in the county grew up on, came out of a storage unit in {town} this week in the hands of {you}. The historical society has asked to see it. So has everyone else.', img: 'cb_legend' },
  fake: { headline: 'BIDDER "CERTAIN" HE FOUND THE {NAME}; APPRAISER "CERTAIN" HE DID NOT',
    body: 'The excitement lasted from the yard in {town} to the appraiser\'s bench. "It had the face," the bidder said. The appraiser said the other thing. The object is described as "convincing at a distance and disappointing up close," like the county fair.', img: 'cb_fake' },
  perfectVan: { headline: 'VAN LOADED "TO THE OUNCE" AT {TOWN} YARD; ONLOOKERS APPLAUD',
    body: '{You} left the {town} yard with a van so exactly full that the door closed on its own. Old-timers compared it to the great pack of \'88. The bidder declined to comment, being unable to see out the back.', img: 'cb_van' },
  setDone: { headline: 'COMPLETE SET ASSEMBLED FROM STORAGE UNITS; COLLECTORS "TRAVELLING"',
    body: 'Over several weeks and, sources say, several towns, {you} has reassembled a {name} from pieces scattered across delinquent units. Specialists have been seen on the highway. The paper has been asked to print the bidder\'s name and, for once, has declined.', img: 'cb_set' },
  bigSale: { headline: '{NAME} SELLS FOR {AMT}; BUYER "WOULD HAVE PAID MORE"',
    body: 'A {name} pulled from a storage unit changed hands this week for {amt}. The buyer, asked whether it was a fair price, laughed for some time. The seller has not been seen at the diner, which regulars take as a sign.', img: 'cb_sale' },
  ranUp: { headline: '{NAME} PAYS {AMT} OVER "OWN NUMBER" AT {TOWN} YARD; BLAMES "THAT ONE"',
    body: '{name} took unit {u} at the {town} yard this week for a figure witnesses describe as "not the number he walked in with." Asked what happened, the buyer pointed across the yard at {you}, who was already in the van. The yard has no comment. The van had gone.', img: 'cb_ranup' },
  commission: { headline: 'WANT AD ANSWERED: {NAME} DELIVERED TO {TOWN} DEALER',
    body: '{You} walked into a dealer\'s shop in {town} this week with a {name}, the exact thing the dealer had been advertising for in these pages. The dealer paid {amt} and, witnesses say, "held it like a baby." The paper would like to remind readers that the want ads work.', img: 'cb_sale' },
  nextDoorLie: { headline: 'BIDDER "HAD THE UNIT NEXT DOOR"; NEXT DOOR HAS BEEN EMPTY SINCE 1981',
    body: '{You} told the {town} yard this week that the unit beside unit {u} "had nothing in it," and then bought unit {u} for {amt}. The office confirms the unit next door has stood empty since 1981. What came out of unit {u} did not fit in one trip.', img: 'cb_ranup' },
  crushed: { headline: 'ROUTE 9 CLAIMS ANOTHER {NAME}; "PACK LESS," SAYS EVERYONE',
    body: 'A {name} that left the {town} yard in fine condition arrived home a grade worse, having ridden under everything else. The county has no plans to fix Route 9. The county would like bidders to fix their packing.', img: 'cb_crushed' },
  keyUsed: { headline: 'KEY FROM ONE UNIT OPENS BOX FROM ANOTHER; CLERK "NEEDS A MINUTE"',
    body: '{You} produced a key found days earlier in a different unit, in some accounts a different town, and opened a {name} with it in front of witnesses. "It fit," said one. "It just fit." The clerk has asked that nobody explain it to him.', img: 'cb_key' },
  provenance: { headline: 'IT HAS A NAME: {NAME} IDENTIFIED FROM A PHOTOGRAPH',
    body: 'An object that came out of a storage unit as ordinary goods has been identified, by {you} holding a photograph up to it in a garage, as the {name}. The historical society has asked for both. The bidder has declined, politely, twice.', img: 'cb_provenance' },
  yard: { headline: 'STORAGE YARD CHANGES HANDS; NEW OWNER "ONE OF US," SAYS CLERK',
    body: 'The Dusty Flats yard has been sold to a bidder regulars describe as "the one who reads the paper." The previous owner has left for the coast with, sources say, a single box. The new owner has kept the auctioneer, the clerk and the raccoon, in that order of difficulty. Three doors a day. Read the paper.', img: 'cb_yard' },
  broke: { headline: 'LOCAL BIDDER "DOWN TO GAS MONEY," DINER EXTENDS TAB',
    body: '{You} at the {town} yard has been seen taking odd jobs and eating pie on credit. "It happens to everybody once," said the auctioneer. "The ones who come back are the ones who come back." The tab stands.', img: 'cb_broke' },
  overpaid: { headline: 'UNIT {U} SELLS FOR {AMT}; CONTENTS DESCRIBED AS "MOSTLY AIR"',
    body: '{You} paid {amt} for unit {u} at the {town} yard and drove home with, by the hauler\'s count, "a front row and a feeling." Nobody at the diner would say the number out loud. Somebody wrote it on a napkin.', img: 'cb_broke' },
  comeback: { headline: 'LOCAL BIDDER "BACK FROM THE DEAD"; DINER TAB SETTLED IN FULL',
    body: '{You}, last seen taking odd jobs at the {town} yard for gas money, settled the diner tab this week and bought a slice for the table. "Never doubted it," said the auctioneer, who had. The pie is no longer on the house.', img: 'cb_broke' },
  blindWin: { headline: 'BIDDER BUYS UNIT {U} UNSEEN; "IT WAS FINE," SAYS BIDDER, UNCONVINCINGLY',
    body: 'With the {town} yard\'s viewings used up, {you} bid on unit {u} without ever seeing past the door and took it for {amt}. Asked what was inside, the bidder said "things." Asked which things, the bidder left.', img: 'cb_van' },
  // ---- the push, in print (the user's 2026-09-18 auction brief, built 2026-09-19) ----
  // {Rival} is the rival's name as written (the other placeholders lowercase it). Never a pronoun: the cast is mixed.
  pushStuck: { headline: 'BIDDER BUYS UNIT {U} "TO MAKE A POINT"; POINT UNCLEAR',
    body: '{Rival} spent a sale at the {town} yard this week running {you} up, and the rest of the day owning unit {u}. "I was only..." {Rival} began at the diner, and did not finish. The unit is described as "not what anybody wanted, least of all the owner."', img: 'cb_push' },
  pushedBack: { headline: 'UNIT {U} SELLS OVER THE ODDS; RIVAL "WAS NEVER BUYING"',
    body: '{You} took unit {u} at the {town} yard this week at a price {Rival} had spent the whole sale arranging. "We\'re square now," {Rival} told the diner, twice, and paid for nobody\'s pie.', img: 'cb_push' },
  bluffCalled: { headline: 'BIDDER WINS UNIT NOBODY WANTED, INCLUDING BIDDER',
    body: '{You} spent a sale at the {town} yard pushing the price on unit {u}, until the other paddle simply went down. "Go on, then," said {Rival}. The winning bid was {amt}. Regulars are calling it a lesson; the winner is calling it nothing at all.', img: 'cb_push' },
  pushWarning: { headline: 'YARD OFFICE POSTS NOTICE: "THE PRICE IS NOT A GAME"',
    body: 'A handwritten sign went up in the {town} yard office window this week. It reads, in full, "THE PRICE IS NOT A GAME." The clerk would not say who it was for. He looked at {you} the whole time he was not saying it.', img: 'cb_clerk' },
  // sold to Pete with the flag still on, and it was real (docs/APPRAISAL.md §8). Never the
  // thing, never you, never the number — only the chain: auction, Pete, money. {hint}
  // is the category at most: "something with strings on it".
  soldBlind: { headline: 'PETE SHUTS THE SHOP; "NOT SAYING"',                 // short: the third slot clips long headlines, and the quote is the point
    body: 'A neighbour reports Pete drove out to the city yesterday with {hint} in the back seat under a blanket. He bought it, he says, "off a fella at the auction." He would not say what he got for it. He was smiling when he would not say.', img: 'cb_pawn' },
};

// ---- the paper, afterwards (docs/APPRAISAL.md §8) ----
// Which real blind sales surface, and how: decided by hash on the event, so the same
// morning prints the same paper on a reload. A fake sold blind is silence, always.
const SOLD_BLIND_NOTE = 0.34;
const BLIND_HINTS = {
  music: 'something with strings on it', furniture: 'something with drawers', antiques: 'something older than the shop',
  jewelry: 'something small enough to close a hand around', collectibles: 'something in a frame', tools: 'something heavy, in a case',
  electronics: 'something with a cord', weird: 'something under a blanket', junk: 'something',
};
function blindHint(e) { const b = BASE_BY_ID[e.base]; return BLIND_HINTS[b ? b.cat : 'junk'] || 'something'; }
function soldBlindNote(worldSeed, e) {
  if (!e || e.k !== 'soldBlind' || !e.real) return null;
  const R = RNG(strHash('blindnote' + worldSeed + '_' + e.day + '_' + (e.uid || e.base)));
  if (!R.chance(SOLD_BLIND_NOTE)) return null;
  return R.chance(0.5) ? 'story' : 'ad';
}
// the smaller way it surfaces: at the top of that morning's classifieds (stories.js)
const PAWN_ADS = [
  'WANTED: more like the last one. Will pay finder\'s price. Ask for Pete. — P.S. No, I won\'t tell you.',
  'PAWN SHOP closed this week. Back Monday. Pete is "away." Do not ask the neighbours; the neighbours will tell you.',
  'FOR SALE: nothing, for once. Pete has gone to the city with {hint} and a blanket. Ring twice anyway.',
];
// one regret at a time. The kinds that are the player's own mistake share a budget,
// so a week is never all regret; a regret that ran marks the morning it ran.
const REGRET_KINDS = ['left', 'soldBlind'];
const REGRET_GAP = 4;
// the counterweight: some mornings it is somebody else's mistake in print, naming a
// rival you have met. Only when the callback slot would otherwise be empty.
const RIVAL_BURNED = [
  { headline: 'COLLECTOR DISPUTES SALE; SIGNED GUITAR "ENTHUSIASTICALLY FAKE"',
    body: 'A signed guitar bought at auction last month has been called "enthusiastically fake" by two appraisers, one of them twice. The buyer is not commenting. {rival} is not commenting either, and has asked this paper to note that the two facts are unrelated.' },
  { headline: '{RIVAL} "STANDS BY" PURCHASE; APPRAISER STANDS BY DOOR',
    body: 'The item {rival} carried out of the {town} yard with both arms has been described, by the one professional who would look at it, as "a very good photograph of the thing it is not." {rival} stands by the purchase. The appraiser stood by the door, and then went through it.' },
  { headline: 'PAWN SHOP DECLINES ITEM; PETE "HAS SEEN ONE BEFORE"',
    body: 'Pete has declined to buy a thing brought in from the auction by {rival}, on the grounds that he "has seen one before, and it was also this one." {rival} left with it. It has not been seen since, which, Pete says, "is the correct thing for it to do."' },
];
const RIVAL_BURNED_GAP = 10;
function rivalBurned(worldSeed, day, world) {
  if (day < 6) return null;
  if (world.burnedDay && world.burnedDay !== day && day - world.burnedDay < RIVAL_BURNED_GAP) return null;
  const met = (world.met || []).filter((id) => NPCS.some((n) => n.id === id) || EXTRA_NPCS[id]);
  if (!met.length) return null;
  const R = RNG(strHash('burned' + worldSeed + '_' + day));
  if (!R.chance(0.12)) return null;
  const id = R.pick(met), def = NPCS.find((n) => n.id === id) || EXTRA_NPCS[id];
  const t = R.pick(RIVAL_BURNED);
  world.burnedDay = day;
  const sub = (s) => s.replace(/\{rival\}/g, def.name).replace(/\{RIVAL\}/g, def.name.toUpperCase()).replace(/\{town\}/g, (TOWNS[world.town] || {}).name || 'town');
  return { story: { id: 'cb_burned_' + day, kind: 'callback', headline: sub(t.headline), img: 'cb_fake' }, text: sub(t.body), unitKnown: false, named: null, about: null };
}
// a town's own paper can get a callback its own way
const PAPER_CALLBACKS_TOWN = {
  gypsumCity: {
    yard: { headline: 'DUSTY FLATS STORAGE YARD SOLD TO RACCOON; CLERK "STANDS BY IT"',
      body: 'The Dusty Flats yard has changed hands, and this paper has it on good authority that the buyer is Deposits, the raccoon, who could not be reached. A correction may follow. The yard\'s new owner, whoever it is, has kept the auctioneer, the clerk and, sources say, the raccoon.', img: 'cb_yard' },
  },
};
function paperCallback(worldSeed, day, world) {
  const ev = world.events || [];
  let cands = ev.filter((e) => PAPER_CALLBACKS[e.k] && e.day === day - 2 && (e.k !== 'bigSale' || e.amt >= 800)
    && (e.k !== 'bluffCalled' || e.onPurpose)                              // only the drop the yard saw coming
    && (e.k !== 'soldBlind' || soldBlindNote(worldSeed, e) === 'story'));
  // one regret at a time: if one ran lately, today's is passed over (it was a two-day story; it is gone)
  const regretLately = ev.some((e) => REGRET_KINDS.includes(e.k) && e.paperDay && e.paperDay !== day && e.paperDay > day - REGRET_GAP);
  if (regretLately) cands = cands.filter((e) => !REGRET_KINDS.includes(e.k));
  if (!cands.length) return rivalBurned(worldSeed, day, world);
  const e = cands[0];
  if (REGRET_KINDS.includes(e.k)) e.paperDay = day;                       // same morning on a reload: same mark, same paper
  const t = ((PAPER_CALLBACKS_TOWN[world.town] || {})[e.k]) || PAPER_CALLBACKS[e.k];
  const sub = (s) => _fill(s, e).replace(/\{NAME\}/g, _plainName(e).toUpperCase())
    .replace(/\{TOWN\}/g, ((TOWNS[e.town] || {}).name || 'town').toUpperCase()).replace(/\{AMT\}/g, fmt$(e.amt || e.paid || 0)).replace(/\{U\}/g, e.unit || '?')
    .replace(/\{hint\}/g, blindHint(e)).replace(/\{Rival\}/g, e.rivalName || 'somebody');
  return { story: { id: 'cb_' + e.k + '_' + e.day, kind: 'callback', headline: sub(t.headline), img: t.img }, text: sub(t.body), unitKnown: false, named: null, about: null };
}

// a roll that cannot be rerolled: seeded on the world, the day and a tag.
// Anything that decides whether the town noticed something rolls with this.
function dayR(tag, extra) {
  return RNG(strHash(tag + '_' + G.worldSeed + '_' + G.day + '_' + (extra === undefined ? '' : extra)));
}

// ============ THE BOOKS: counters kept at the moment, not recomputed ============
// The log is capped at 300 facts; these are the running totals the Ledger's
// last page reads. Every number is written where it happens (winAuction,
// sellItem, driveHome...). Nothing here is shown before day ten.
function careerBook() {
  const c = (G.world.career = G.world.career || {});
  c.bases = c.bases || {};
  const zero = ['spentAuction', 'sales', 'petesTake', 'gas', 'won', 'lost', 'abandoned', 'abandonedValue', 'myths', 'fakes', 'sets', 'keys',
    'boxes', 'edFooled', 'raccoon', 'garbage', 'crushed', 'blind', 'blindRegret', 'oddJobs', 'unmentionables', 'asIs',
    'calledOut', 'slips', 'slipsCaught', 'ranUp', 'bluffCalled', 'loudSales', 'quietSales', 'comebacks',
    'pushedBack', 'pushStuck', 'pushCaught', 'pushedBackSeen', 'bluffsCalledOnYou', 'pushWarnings', 'pushFees', 'errands',
    'commissions', 'nutPaid', 'nutMissed', 'favoursUsed', 'partnered', 'coffees'];
  for (const k of zero) if (typeof c[k] !== 'number') c[k] = 0;
  c.townWins = c.townWins || {}; c.beat = c.beat || {}; c.beatenBy = c.beatenBy || {}; c.movies = c.movies || {};
  c.keepersFound = c.keepersFound || {};   // every named shoebox/case keeper ever pulled, by 'base::name' — the record for the collector achievements
  return c;
}
function bump(key, n) { const c = careerBook(); c[key] = (c[key] || 0) + (n === undefined ? 1 : n); return c[key]; }
function bumpIn(map, key, n) { const c = careerBook(); c[map][key] = (c[map][key] || 0) + (n === undefined ? 1 : n); }
// the door that paid best, and the one that hurt most: net of what came home against what it cost
// ---- the door's line (docs/AUCTION_OVERHAUL_2.md step 2) ----
// Every door you win gets one line when the van pulls out: what you paid, what came home
// worth, and Buzz's one word for it. Worth counts a claim at its claim (a fake is its legend
// until somebody says otherwise), so the line never knows more than you do; when the claim
// settles, the line is corrected (doorSettle, from verifyItem). The last ten lines are your
// margin, and they give you a name in the yard.
const DOOR_LOG_KEEP = 20;
const DOOR_WORDS = { steal: 'STEAL', fair: 'FAIR', paidUp: 'PAID UP', bath: 'TOOK A BATH' };
const DOOR_WORD_COL = { steal: '#38b764', fair: '#94b0c2', paidUp: '#ef7d57', bath: '#d9626f' };
function doorVerdict(paid, worth) {
  const net = worth - paid, r = paid > 0 ? worth / paid : Infinity;
  if (r >= 2 && net >= 100) return 'steal';
  if (net >= -50) return 'fair';                      // a few dollars either way is a fair door
  if (r >= 0.625) return 'paidUp';
  return 'bath';
}
function doorLog() { const w = G.world; w.doorLog = w.doorLog || []; return w.doorLog; }
function recordDoor(entry) {
  const log = doorLog();
  const e = Object.assign({ day: G.day, town: G.world.town }, entry);
  e.verdict = doorVerdict(e.paid, e.worth);
  log.push(e);
  if (log.length > DOOR_LOG_KEEP) log.splice(0, log.length - DOOR_LOG_KEEP);
  return e;
}
// a claim settled: the door it came out of is worth what the thing really is, now
function doorSettle(it) {
  if (!it || it.doorWorth == null) return null;
  const e = doorLog().find((d) => d.day === it.fromDay && d.unit === it.fromUnit && d.town === it.fromTown);
  const delta = it.val - it.doorWorth;
  it.doorWorth = it.val;
  if (!e || !delta) return e || null;
  const was = e.verdict;
  e.worth = Math.max(0, e.worth + delta);
  e.verdict = doorVerdict(e.paid, e.worth);
  if (was !== e.verdict) e.turned = was;
  return e;
}
// the yard's name for you, off the last ten doors: three baths make the whale, three steals
// the shark. Three doors in a row without one wears the name off. Both at once: the fresher.
function yardName(log) {
  const tv = typeof tvNameNow === 'function' ? tvNameNow() : null;   // what you told Channel 9 outranks the doors, for a week
  if (tv) return tv === 'nobody' ? null : tv;
  const last = (log || doorLog()).slice(-10);
  const tail = last.slice(-3);
  const count = (v) => last.filter((d) => d.verdict === v).length;
  const worn = (v) => tail.length === 3 && tail.every((d) => d.verdict !== v);
  const whale = count('bath') >= 3 && !worn('bath');
  const shark = count('steal') >= 3 && !worn('steal');
  if (whale && shark) { const at = (v) => last.map((d) => d.verdict).lastIndexOf(v); return at('bath') > at('steal') ? 'whale' : 'shark'; }
  return whale ? 'whale' : (shark ? 'shark' : null);
}
function doorMargin(log) { return (log || doorLog()).slice(-10).reduce((a, d) => a + (d.worth - d.paid), 0); }
// ============ purpose (docs/AUCTION_OVERHAUL_2.md step 5) ============
// ---- commissions: a buyer's want ad in the paper. A door with that thing in it is worth more to
// you than to anybody in the room, and holding one in the shed is a plan, not clutter. Delivered
// from the sell screen at double that buyer's usual price, wherever they are. Three delivered and
// the buyer is a regular who phones the office with a door tip now and then.
// COMMISSION_FROM was 6, which meant a player testing two or three days never learned that buyers ask
// for things at all — the whole thread was invisible for the first working week (playtest 2026-09-16).
// The first one now lands on day 2 and is not left to the coin: a new player meets the idea while the
// opening week is still teaching, and the planted want-ad door (pickDoorReason, day 3 on) has something
// to point at. After that first one it goes back to the usual dice.
const COMMISSION_FROM = 2;
const COMMISSION_DAYS = 5, COMMISSION_OPEN_MAX = 2, COMMISSION_GAP = 3, COMMISSION_MULT = 2, REGULAR_AT = 3;
function openCommissions(world) {
  const w = world || G.world;
  return ((w && w.commissions) || []).filter((c) => !c.done && c.until >= G.day);
}
// the ones in the Gazette. A phone order (phone.js) is between you and the dealer: never printed.
function publicCommissions(world) { return openCommissions(world).filter((c) => !c.phone); }
// posted in the morning, before the paper prints (startDay). Seeded; posting twice the same day does nothing.
function postCommission(force) {
  const w = G.world;
  w.commissions = w.commissions || [];
  for (const c of w.commissions) if (!c.done && c.until < G.day) c.expired = true;
  if (w.commissions.length > 12) w.commissions = w.commissions.filter((c) => !c.done && !c.expired).concat(w.commissions.filter((c) => c.done || c.expired).slice(-6));
  if (G.day < COMMISSION_FROM || w.commissions.some((c) => c.posted === G.day)) return null;
  // "never posted one" has to read as long ago, not as day zero: with the old day-6 floor `0 > day - 3`
  // was harmlessly false, but on day 2 it is `0 > -1`, which blocked the very first ad we just moved early
  if (publicCommissions(w).length >= COMMISSION_OPEN_MAX || (w.commissionLast || -99) > G.day - COMMISSION_GAP) return null;
  const R = dayR('commission');
  if (!force && G.day > COMMISSION_FROM && !R.chance(0.5)) return null;   // the first one always comes
  const buyer = R.pick(SPECIALISTS);
  const bases = BASES.filter((b) => buyer.cats.includes(b.cat) && !b.legendary && !b.fakeOf && !b.storyOnly && b.val >= 30 && b.val <= 400);
  if (!bases.length) return null;
  const base = R.pick(bases);
  const c = { id: 'wc_' + G.day, buyer: buyer.id, base: base.id, name: base.name, posted: G.day, until: G.day + COMMISSION_DAYS, done: false };
  w.commissions.push(c);
  w.commissionLast = G.day;
  return c;
}
function commissionFor(it) {
  if (!it || !it.searched || it.unverified || it.locked || it.loot) return null;
  return openCommissions().find((c) => c.base === it.base) || null;
}
function commissionPrice(it, c) {
  const b = BUYERS.find((x) => x.id === c.buyer);
  return Math.max(1, Math.round(it.val * (b ? b.mult : 1) * (c.mult || COMMISSION_MULT)));   // a phone order pays its own
}
function deliverCommission(it, c) {
  const w = G.world, b = BUYERS.find((x) => x.id === c.buyer);
  const price = commissionPrice(it, c);
  gain(price);
  play(price >= 300 ? 'coin_big' : 'sell_cash');
  if (b) speak(['npc_' + b.id + '_buy']);
  G.dayStats.soldCount++; G.dayStats.soldTotal += price;
  bump('sales', price); bump('commissions');
  c.done = true; c.doneDay = G.day;
  w.regulars = w.regulars || {};
  const before = w.regulars[c.buyer] || 0;
  const n = (w.regulars[c.buyer] = before + (c.phone && c.promised ? 2 : 1));   // a promise kept on the phone counts twice
  recordEvent('commission', { buyer: c.buyer, name: dName(it), base: it.base, amt: price });
  if (before < REGULAR_AT && n >= REGULAR_AT) recordEvent('regular', { buyer: c.buyer });
  takeFromLists(it);
  G.sellSel = -1;
  const who = b ? b.name.split(' ')[1] : 'The dealer';
  toast(before < REGULAR_AT && n >= REGULAR_AT ? '"You keep finding what I need. I\'ll keep an eye out for you, too."  — ' + who : '"Exactly what I asked for."  — ' + who + ', ' + fmt$(price), PAL.gold, 3.4);
  return price;
}
// a regular phones the office some mornings: the door on today's row with the most of their trade in it
function regularTip() {
  const w = G.world, reg = w.regulars || {};
  const pm = (TOWNS[w.town] || {}).priceMult || 1;
  const row = ((G.today && G.today.lockers) || []).filter((d) => !d.won && !d.sold);
  for (const id of Object.keys(reg).sort()) {
    if (reg[id] < REGULAR_AT) continue;
    const b = BUYERS.find((x) => x.id === id);
    if (!b || !b.cats || !dayR('regtip', id).chance(0.3)) continue;
    let best = null, bv = 0;
    for (const d of row) {
      let v = 0;
      for (const it of d.items) { if (b.cats.includes(it.cat)) v += it.val; if (it.loot) for (const l of it.loot) if (b.cats.includes(l.cat)) v += l.val; }
      if (v > bv) { bv = v; best = d; }
    }
    if (best && bv >= 150 * pm) return b.name + ' called the office: "Unit ' + best.num + '. There is ' + (CATS[b.cats.find((ct) => best.items.some((it) => it.cat === ct))] || CATS[b.cats[0]]).label.toLowerCase() + ' in there worth your morning."';
  }
  return null;
}
// a warm face phones the office some mornings: a door worth being in the room for, or a warning
// off one. Never a number and never a list - what somebody would actually say across a yard.
function warmTip() {
  const row = ((G.today && G.today.lockers) || []).filter((d) => !d.won && !d.sold);
  if (row.length < 2) return null;
  for (const id of warmFacesNow()) {
    if (!dayR('warmtip', id).chance(0.45)) continue;
    const d = (typeof rivalDef === 'function') ? rivalDef(id) : null;
    if (!d) continue;
    const who = (typeof shortRivalName === 'function') ? shortRivalName(d) : d.name;
    let best = row[0], worst = row[0];
    for (const lk of row) { if (lk.value > best.value) best = lk; if (lk.value < worst.value) worst = lk; }
    if (best === worst) return null;
    return dayR('warmwhich', id).chance(0.4)
      ? who + ' called the office, quietly. "Unit ' + worst.num + ' is not what it looks like. I would leave it."'
      : who + ' called the office, quietly. "Unit ' + best.num + '. Be in the room for that one."';
  }
  return null;
}
// ---- one door a morning has a reason (AUCTION_NOTES 2026-09-14, build order 3) ----
// Different valuations for different people is what stops a sale collapsing into whoever has the biggest bag.
// From day 3, one unsold door gets one reason, loud on the yard card, the office board, the peek and the room:
//   want — an open want ad's item sits in the front row (planted if no door has one): worth double to you, not to them
//   set  — a front-row piece of a set you already hold two or more pieces of (never named: "goes with your shed")
//   need — a rival in town needs this door, for a reason of their own, read only off the front row. They come out
//          with a bigger number and cannot hide it. Let them have it (be in the room, do not bid) and they owe you;
//          take it and they remember.
// Nothing here reads what is hidden in the dark: a need's test looks at the front row only.
const RIVAL_NEEDS = {
  bart: { why: 'his truck needs a transmission', test: (lk, f) => f.vis >= 200 * f.pm,
    office: '"Big Bart was in at seven. Truck trouble. He wants unit {u} and told the whole yard why."',
    room: '"This one fixes my truck." Bart says it to everybody. Twice.',
    taken: ['"Unit {u} was my transmission." Bart is not smiling.'], owed: ['"Unit {u}. The truck runs. I owe you, son."'] },
  dutch: { why: 'the tire shop is behind on rent', test: () => true,
    office: '"Dutch was yelling about rent before the gate opened. He wants unit {u}. Loudly."',
    room: '"I NEED THIS ONE. RENT. YIP." Dutch means every word of it.',
    taken: ['"Unit {u} was my rent." A quiet yip, for Dutch.'], owed: ['"You let me have {u}. YIIIP." It is a grateful yip.'] },
  duo: { why: 'she says there is a safe in it and he says there is not', test: (lk, f) => f.containers >= 1,
    office: '"Cody and Kaylee have a bet on unit {u}. She says there is a safe in it. He says there is not. Now they both need it."',
    room: '"There is a SAFE in there." "There is NOT." They both raise a hand for it.',
    taken: ['"We never found out about the safe." "Because of THEM." Unit {u}.'], owed: ['"There was no safe." "There WAS a safe." Unit {u}. They both wave at you.'] },
  vera: { why: 'her city buyer wants something from this yard by Friday', test: (lk, f) => f.city >= 1,
    office: '"Velvet Vera\'s buyer called here looking for her. She wants unit {u}. The city is waiting."',
    room: '"My buyer is waiting on this one, darling." Vera does not blink.',
    taken: ['"My buyer asked about unit {u}. I said a local took it." Vera, coldly.'], owed: ['"Unit {u} made my Friday, darling. I remember favours."'] },
  tuck: { why: 'nobody knows, but he said so out loud, which is new', test: () => true,
    office: '"Tuck said four words this morning. Three of them were unit {u}."',
    room: 'Tuck looks at the door and says one word: "Mine." Everybody hears it.',
    taken: ['Tuck looks at you. Unit {u}. He does not nod.'], owed: ['Tuck touches his hat at you. Unit {u}. That is a lot, for Tuck.'] },
  bev: { why: 'she promised the church sale forty boxes by Sunday', test: (lk, f) => f.containers >= 2,
    office: '"Boxcar Bev promised the church sale forty boxes by Sunday. She is counting on unit {u}. She said counting."',
    room: '"Forty boxes by Sunday." Bev writes this door on her clipboard. Underlines it.',
    taken: ['"The church sale was short on Sunday. Unit {u}." Bev, kindly, which is worse.'], owed: ['"Unit {u} filled the church sale. The Reverend says thank you. So do I."'] },
  pruitt: { why: 'he is a load short for the smelter this week', test: (lk, f) => f.bulk >= 10,
    office: '"Pruitt is a load short for the smelter. He looked at unit {u} and licked his thumb."',
    room: '"I\'m a load short." Pruitt slaps the tailgate, facing this door.',
    taken: ['"Smelter paid me for half a load. Unit {u}." Pruitt, to the tailgate.'], owed: ['"Unit {u} weighed out. I owe you a pound or two."'] },
  hattie: { why: 'the paper printed this unit, and she needs it to be true', test: (lk) => typeof paperNamedUnits === 'function' && paperNamedUnits().includes(lk.num),
    office: '"Headline Hattie has the clipping. She needs unit {u} to be what the paper said."',
    room: '"The PAPER said this one." Hattie holds the clipping up to the door.',
    taken: ['"The paper was RIGHT about unit {u}. And you took it." Hattie folds the clipping sharply.'], owed: ['"Unit {u}. You let me have my headline, dear. I will say so."'] },
  delgado: { why: 'it is the one door the paper did not print', test: (lk) => typeof paperNamedUnits === 'function' && paperNamedUnits().length > 0 && !paperNamedUnits().includes(lk.num),
    office: '"Delgado says unit {u} is the only door the paper left alone. He needs that one."',
    room: '"This is the one they did not print." Delgado steps on the newspaper.',
    taken: ['"Unit {u} was the quiet one. You made it loud." Delgado.'], owed: ['"Unit {u}. Nobody printed it, nobody saw. Thank you."'] },
  dee: { why: 'the church hall needs chairs before the Sunday supper', test: (lk, f) => f.furn >= 1,
    office: '"Sister Dee needs chairs for the Sunday supper. She has been praying at unit {u}."',
    room: 'Sister Dee closes her eyes at this door. "The supper needs it."',
    taken: ['"The supper stood up this week. Unit {u}." Dee forgives you. Visibly.'], owed: ['"Unit {u} seated twelve on Sunday. Bless you."'] },
  cobb: { why: 'his shop is a compressor short and a week behind', test: (lk, f) => f.tools >= 1,
    office: '"Slim Cobb is a week behind and a compressor short. He wants unit {u}."',
    room: '"Compressor\'s in there, I can feel it." Cobb chews the toothpick flat.',
    taken: ['"Still a week behind. Unit {u}." Cobb snaps a toothpick.'], owed: ['"Unit {u} got the shop running. You need a tire, you ask."'] },
  ferrell: { why: 'he needs one normal door to calm down', test: (lk, f) => f.weird === 0,
    office: '"Cousin Ferrell needs one normal door to calm down. Unit {u} looks normal. He keeps saying so."',
    room: '"This one is normal. Please." Ferrell holds his paddle with both hands.',
    taken: ['"Unit {u} was normal and you TOOK it." Ferrell, shaking.'], owed: ['"Unit {u} was so normal. Thank you. I slept."'] },
  wanda: { why: 'Carl is waiting on her for something strange', test: (lk, f) => f.weird >= 1,
    office: '"Wanda Voss says Carl is waiting on something strange. She picked unit {u}."',
    room: 'Wanda smiles at the door. "Carl will be so pleased." Nobody likes that sentence.',
    taken: ['"Carl is disappointed about unit {u}." Wanda says it very calmly.'], owed: ['"Unit {u}. Carl says thank you. Carl does not usually say things."'] },
  vale: { why: 'a client of his is one fine piece short', test: (lk, f) => f.city >= 1,
    office: '"Adrien Vale has a client one piece short. He looked at unit {u} through the loupe for a long time."',
    room: '"My client needs this one." Vale does not remove the loupe to say it.',
    taken: ['"My client asked about unit {u}. I said a local." Vale, pained.'], owed: ['"Unit {u} completed a client. I am, briefly, in your debt."'] },
  charlie: { why: 'his showroom has an empty shelf and a party on Saturday', test: (lk, f) => f.vis >= 300 * f.pm,
    office: '"Chrome Charlie has a party Saturday and an empty shelf. Unit {u} is shiny enough, he says."',
    room: '"That goes on my shelf by Saturday." Charlie points at the door with a ring.',
    taken: ['"The shelf was empty at the party. Unit {u}." Charlie, sunglasses on.'], owed: ['"Unit {u} was the hit of the party. You come by, you get a drink."'] },
  priscilla: { why: 'her display case has a gap in it', test: (lk, f) => f.nice >= 2,
    office: '"Priscilla Mint has a gap in her display case. She has decided unit {u} fills it."',
    room: '"There is a gap in my case." Priscilla puts on a second pair of gloves.',
    taken: ['"The gap is still there. Unit {u}." Priscilla dabs her mouth.'], owed: ['"Unit {u} closed the gap. You have my gratitude, in writing."'] },
  garrity: { why: 'the museum board meets on Friday', test: (lk, f) => f.mint >= 1,
    office: '"Gloves Garrity says the board meets Friday. Unit {u} is on his list."',
    room: '"The board meets Friday." Garrity has written this door in the folder.',
    taken: ['"The board asked about unit {u}." Garrity, flatly. It is the worst thing he has ever said.'], owed: ['"Unit {u} is accessioned. The board has noted your name."'] },
  ilse: { why: 'she wants it, and that is the whole reason', test: (lk, f) => f.vis >= 250 * f.pm,
    office: '"The Baroness sent her driver. Unit {u}. That was the whole message."',
    room: 'The Baroness looks at this door. Only this door. The room notices.',
    taken: ['The Baroness looks straight through you. Unit {u}.'], owed: ['The Baroness inclines her head at you. Unit {u}. Her driver tips his cap.'] },
  dex: { why: 'he promised his followers a storage unit reveal tonight', test: () => true,
    office: '"Dex Mordant promised his followers a reveal tonight. Unit {u}. He is already filming the door."',
    room: '"Chat, THIS is the one." Dex films the door, then films himself.',
    taken: ['"Chat is mad about unit {u}. At YOU." Dex.'], owed: ['"Unit {u} got a million views. Shout-out to you, man."'] },
};
// who took it / who owed you, in the yard the next time
RIVAL_GOSSIP.tookNeed = { who: 'winner', lines: {} };
RIVAL_GOSSIP.letHaveIt = { who: 'winner', lines: {} };
for (const id of Object.keys(RIVAL_NEEDS)) { RIVAL_GOSSIP.tookNeed.lines[id] = RIVAL_NEEDS[id].taken; RIVAL_GOSSIP.letHaveIt.lines[id] = RIVAL_NEEDS[id].owed; }
// what the doorway shows, counted: the only thing a need may read
function frontFacts(lk) {
  const town = TOWNS[(G.world && G.world.town) || 'dustyFlats'] || {};
  const f = { pm: town.priceMult || 1, vis: visibleValue(lk), containers: 0, city: 0, furn: 0, tools: 0, weird: 0, nice: 0, mint: 0, bulk: 0 };
  for (const it of lk.items) {
    if (it.layer !== 2 || it.cash || (typeof peekVisibility === 'function' && peekVisibility(it) === 'none')) continue;
    f.bulk += it.size || 0;
    if (it.container) f.containers++;
    if (['antiques', 'jewelry', 'collectibles'].includes(it.cat)) f.city++;
    if (['furniture', 'antiques'].includes(it.cat)) f.furn++;
    if (['tools', 'electronics'].includes(it.cat)) f.tools++;
    if (it.cat === 'weird') f.weird++;
    if (it.cond === 'Mint' || it.cond === 'Clean') f.nice++;
    if (it.cond === 'Mint') f.mint++;
  }
  return f;
}
function frontRow(lk) { return lk.items.filter((it) => it.layer === 2 && !it.cash && (typeof peekVisibility !== 'function' || peekVisibility(it) !== 'none')); }
function shedSetCount(setId) {
  let n = 0;
  for (const list of [G.stash || [], G.keeps || [], G.trophies || []]) for (const it of list) if (it.set && it.set.id === setId && it.searched && !it.setComplete) n++;
  return n;
}
// the morning (startDay, after the want ads go in): at most one door gets a reason
function pickDoorReason() {
  const w = G.world, T = G.today;
  if (!T || !T.lockers || G.day < 3) return null;
  if (T.reason) return T.reason;                            // a story already gave a door its reason this morning (Ed's notebook)
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return null;
  const R = dayR('doorReason');
  const doors = T.lockers.filter((lk) => !lk.won && !lk.sold && !lk.story && !lk.rare && !lk.opening && !lk.seededLegend && !lk.pair && !lk.format);   // the week's Dutch clock is reason enough
  if (!doors.length) return null;
  const set = (lk, r) => { lk.reason = Object.assign({ unit: lk.num }, r); T.reason = lk.reason; return lk.reason; };
  // 1. a want ad: a door already showing the thing, else (most mornings) the office finds one
  for (const c of openCommissions(w).slice().sort((a, b) => a.until - b.until)) {
    for (const lk of doors) {
      const it = frontRow(lk).find((x) => x.base === c.base && !x.set && !x.legendary);
      if (it) return set(lk, { kind: 'want', uid: it.uid, cid: c.id, buyer: c.buyer, name: c.name, until: c.until });
    }
    const probe = makeItem(c.base, RNG(strHash('probe' + c.base)));
    if ((probe.wCols || 1) > 1 || probe.container || !R.chance(0.6)) continue;
    // never a second one of the same thing: the office found THE radio, not another radio
    const clean = doors.filter((d) => !d.items.some((x) => x.base === c.base || (x.loot && x.loot.some((l) => l.base === c.base))));
    if (!clean.length) continue;
    const lk = R.pick(clean);
    // IDEAS_TODO 8: a wanted thing sitting in the front row reads as a fetch quest. Most mornings the office's
    // plant goes in DEEP, where the peek cannot read it and the clerk is the only way to learn which door it is
    // in (IDEAS_TODO 10). Some mornings it is still right there, so the thread never becomes pure faith in him.
    const bury = R.chance(WANT_BURY);
    const it = bury ? placeDeep(R, lk, c.base) : placeFront(R, lk, c.base);
    if (!it) continue;
    it.val = Math.max(1, Math.round(it.val * ((TOWNS[w.town] || {}).priceMult || 1)));
    let v = 0; for (const x of lk.items) { v += x.val; if (x.loot) for (const l of x.loot) v += l.val; }
    // the door still has to respect the morning's value cap: the office plants a thing, it does not smuggle a
    // fortune in. Shed loose junk to make room; if it still will not fit, leave this door alone and try another.
    // (The same exemptions the sweep allows: an honest door, the opening's find, a pair and a myth hole.)
    const town0 = TOWNS[w.town] || TOWNS.dustyFlats;
    const cap = (lk.contract === 'mythHole' || lk.honest || lk.opening === 'epic' || lk.pair)
      ? Infinity : (town0.dayCapBase + G.day * town0.dayCapPerDay) * 1.05 + 5;
    if (v > cap) {
      const junk = lk.items.filter((x) => x !== it && !x.onUid && !x.set && !x.legendary && !x.note && !x.pair && !x.container && !x.paperwork && (x.cat === 'junk' || x.val < 30)).sort((a, b) => b.val - a.val);
      while (v > cap && junk.length) { const j = junk.shift(); lk.items.splice(lk.items.indexOf(j), 1); v -= j.val; }
    }
    if (v > cap) {
      // Giving up on this door still LEAVES it changed: the shed above has already spliced junk out, and
      // placeDeep may have replaced a victim rather than appended, so the door cannot simply be handed back
      // with its old number on it. Re-add it. Without this the locker kept a value its items no longer came
      // to — found 2026-09-17 on vermillion/broke day 3, a $44 ghost in a door nobody had touched.
      const i0 = lk.items.indexOf(it);
      if (i0 >= 0) lk.items.splice(i0, 1);
      let v2 = 0; for (const x of lk.items) { v2 += x.val; if (x.loot) for (const l of x.loot) v2 += l.val; }
      lk.value = v2;
      continue;
    }
    lk.value = v;
    return set(lk, { kind: 'want', uid: it.uid, cid: c.id, buyer: c.buyer, name: c.name, until: c.until, planted: true, buried: bury });
  }
  // 2. a piece that goes with what is in your shed
  { const f = findSetOn(doors); if (f) return set(f.lk, f.r); }
  // Big Bart's week in the shop: one morning (not the first) he needs a door, the cheapest one he can still afford
  const bArc = w.arcs && w.arcs.bartTruck;
  if (bArc && bartBrokeOn(w, G.day) && !bArc.needDay && G.day > bArc.shopDay) {
    const cheap = doors.slice().sort((x, y) => (x.minBid || 0) - (y.minBid || 0))[0];
    bArc.needDay = G.day;
    return set(cheap, { kind: 'need', rival: 'bart' });
  }
  // 3. a rival in town needs one of these doors
  { const f = findNeedOn(doors, R, w); if (f) return set(f.lk, f.r); }
  return null;
}
// ---- the finders, so a morning can use one and a rare morning can use two (IDEAS_TODO 8) ----
// Pulled out of pickDoorReason without moving a single RNG draw, so the first reason of the morning is
// dealt exactly as it always was.
function findSetOn(doors) {
  for (const lk of doors) {
    for (const it of frontRow(lk)) {
      if (!it.set || it.legendary) continue;
      const have = shedSetCount(it.set.id);
      if (have >= 2) return { lk, r: { kind: 'set', uid: it.uid, setId: it.set.id, have, name: (BASE_BY_ID[it.base] && BASE_BY_ID[it.base].name) || 'piece' } };
    }
  }
  return null;
}
function findNeedOn(doors, R, w) {
  const town = TOWNS[w.town] || TOWNS.dustyFlats;
  const roster = ['bart', 'dutch', 'duo'].concat(town.rivals || []).filter((id, i, a) => a.indexOf(id) === i && RIVAL_NEEDS[id] && !(id === 'duo' && duoSplitOn(w, G.day)));   // no pair to need a door the week they are apart
  const opts = [];
  for (const id of roster) for (const lk of doors) if (RIVAL_NEEDS[id].test(lk, frontFacts(lk))) opts.push({ id, lk });
  if (!opts.length || !R.chance(0.75)) return null;
  const o = R.pick(opts);
  return { lk: o.lk, r: { kind: 'need', rival: o.id } };
}
// a want ad's thing already sitting in somebody's front row. No planting here: the office plants at most one
// thing a morning, and a second planted item would read as the yard arranging itself around you.
function findWantOn(doors, w) {
  for (const c of openCommissions(w).slice().sort((a, b) => a.until - b.until)) {
    for (const lk of doors) {
      const it = frontRow(lk).find((x) => x.base === c.base && !x.set && !x.legendary);
      if (it) return { lk, r: { kind: 'want', uid: it.uid, cid: c.id, buyer: c.buyer, name: c.name, until: c.until } };
    }
  }
  return null;
}
// ---- two doors that both matter (IDEAS_TODO 8; built 2026-09-16) ----
// A rare morning where two of the three doors carry a reason and you cannot have both. The rules the idea
// set for itself, kept:
//   * RARE. About one morning a week, seeded on the day, and never before TWO_DOOR_FROM.
//   * The third door stays PLAINLY ORDINARY - there must still be an unflagged door left when this is done,
//     or the morning is a carnival and the specialness budget means nothing.
//   * The two reasons PULL DIFFERENT WAYS. Never two want ads: one of the pair is always the want (money,
//     and a regular fed) and the other is a set piece for your shed or a rival who needs it (standing).
//     The choice is which relationship to feed, not which door pays more.
//   * The row sells in order, so if the second one is behind the first you commit before you see it. That
//     tension is free and is deliberately left alone.
const TWO_DOOR_FROM = 10, TWO_DOOR_CHANCE = 0.14;
function pickSecondReason() {
  const w = G.world, T = G.today;
  if (!T || !T.lockers || !T.reason || T.reason2) return null;
  if (G.day < TWO_DOOR_FROM) return null;
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return null;
  if (!dayR('twoDoors').chance(TWO_DOOR_CHANCE)) return null;
  const doors = T.lockers.filter((lk) => !lk.reason && !lk.won && !lk.sold && !lk.story && !lk.rare && !lk.opening && !lk.seededLegend && !lk.pair && !lk.format);
  if (doors.length < 2) return null;                    // one of them has to stay an ordinary door
  const R = dayR('doorReason2');
  const first = T.reason.kind;
  let f = null;
  if (first === 'want') f = findSetOn(doors) || findNeedOn(doors, R, w);      // money first, then the relationship
  else if (first === 'set' || first === 'need') f = findWantOn(doors, w);     // the other way about
  if (!f) return null;
  f.lk.reason = Object.assign({ unit: f.lk.num, second: true }, f.r);
  T.reason2 = f.lk.reason;
  return T.reason2;
}
// ---- the clerk, and how well he knows you (IDEAS_TODO 10; built 2026-09-16) ----
// The office already sold information and already had a spendable currency in favours. What it did not have
// was anything that ACCUMULATES - every bill paid on time, every coffee, Merle's trophy handed back, Ed's
// notebook returned, all of it either evaporated or turned into one token. clerkTrust adds it up out of the
// career book and the event log, so no new bookkeeping is needed and a long game appears behind the weekly
// bill. The ladder is PRECISION, not content: the same fact, sharper the better he knows you.
//   stranger  "Somebody's been asking after one of these. That's all I've got."
//   known     "It's not the first door."
//   trusted   "Second one. Don't make me say it twice."
//   family    "Second door, behind the wardrobe. And she's paying double for it."   <- costs a favour
// He is repeating office gossip, not reading a manifest, so THE FREE RUNGS ARE SOMETIMES WRONG. The rung you
// pay a favour for is exact: paying for a wrong answer reads as a cheat rather than a rumour.
const CLERK_KNOWN = 4, CLERK_TRUSTED = 9, CLERK_FAMILY = 15, CLERK_WRONG = 0.25;
const WANT_BURY = 0.65;
function clerkTrust() {
  const w = G.world;
  if (!w) return 0;
  const c = (typeof careerBook === 'function') ? careerBook() : {};
  const evs = w.events || [];
  let t = 0;
  t += (c.nutPaid || 0) * 2;                                   // the backbone: the weekly bill, paid on time
  t -= (c.nutMissed || 0) * 3;                                 // missing one costs more than paying one earns
  t += Math.min(4, c.coffees || 0);                            // coffee for the room, up to a point
  if (evs.some((e) => e.k === 'tenantSoldBack')) t += 3;       // you sold Merle his own trophy back
  if (evs.some((e) => e.k === 'edNotebookReturned')) t += 2;   // and you gave Ed his notebook
  if (evs.some((e) => e.k === 'unitOwed')) t -= 2;             // your own rent went behind, in his office
  // errands he rang you about (phone.js): done, done for money, or promised and never done
  let er = 0;
  for (const e of evs) if (e.k === 'errand') er += ERRAND_TRUST[e.how] || 0;
  t += Math.max(-4, Math.min(4, er));
  t -= Math.min(typeof PUSH_TRUST_MAX === 'number' ? PUSH_TRUST_MAX : 4, evs.filter((e) => e.k === 'pushed' && e.warned).length);   // he warned you about pushing, and you did
  if (w.nut) t = Math.min(t, CLERK_KNOWN - 1);                 // while you owe him, he is nobody's friend
  return Math.max(0, t);
}
const ERRAND_TRUST = { yes: 2, maybe: 1, nasty: -1, yesSkipped: -2, nastySkipped: -3 };
function clerkTier() {
  const t = clerkTrust();
  return t >= CLERK_FAMILY ? 'family' : (t >= CLERK_TRUSTED ? 'trusted' : (t >= CLERK_KNOWN ? 'known' : 'stranger'));
}
const CLERK_TIER_WORDS = { stranger: 'he does not know you', known: 'he knows your face', trusted: 'he trusts you', family: 'he talks to you like family' };
// what there is to talk about this morning: the want ad's door
function clerkRumourTarget() {
  const T = G.today;
  if (!T || !T.lockers) return null;
  return T.lockers.find((lk) => !lk.won && !lk.sold && lk.reason && lk.reason.kind === 'want') || null;
}
const CLERK_ORD = ['first', 'second', 'third', 'fourth', 'fifth'];
function clerkRumour(exact) {
  const lk = clerkRumourTarget();
  if (!lk) return null;
  const row = (G.today.lockers || []).filter((d) => !d.won && !d.sold);
  const tier = exact ? 'family' : (clerkTier() === 'family' ? 'trusted' : clerkTier());
  if (tier === 'stranger') return '"Somebody\'s been asking after one of these. That\'s all I\'ve got."';
  const r = lk.reason;
  const b = BUYERS.find((x) => x.id === r.buyer);
  const bn = b ? b.name : 'A dealer';
  // he is repeating gossip: on the free rungs he is sometimes wrong, and you find that out by bidding
  const wrong = !exact && dayR('clerkwrong').chance(CLERK_WRONG);
  const realIdx = row.indexOf(lk);
  const others = row.filter((d) => d !== lk);
  if (tier === 'known') {
    // the door it is NOT. Wrong means he rules out the one it is actually in.
    const ruled = wrong ? lk : (others[0] || lk);
    return '"It\'s not the ' + (CLERK_ORD[row.indexOf(ruled)] || 'first') + ' door."';
  }
  const named = wrong && others.length ? others[0] : lk;
  if (!wrong) r.told = true;                                   // his word turns the card on
  if (tier === 'trusted') return '"' + cap1(CLERK_ORD[row.indexOf(named)] || 'first') + ' one. Don\'t make me say it twice."';
  const hide = r.buried ? 'behind something, not up front' : 'right in the front';
  return '"' + cap1(CLERK_ORD[row.indexOf(named)] || 'first') + ' door, ' + hide + '. And ' + bn + ' is paying double for it."';
}
function cap1(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }
// a buried want ad is a fact about the ROW, not a stamp on a door: nothing shows it until the clerk says which
function reasonShown(lk) {
  const r = lk && lk.reason;
  if (!r) return null;
  if (r.kind === 'want' && r.buried && !r.told) return null;
  return r;
}
// the words for a reason, wherever it is shown
function reasonWords(r) {
  if (!r) return null;
  const u = r.unit;
  if (r.kind === 'want') {
    const b = BUYERS.find((x) => x.id === r.buyer);
    const bn = b ? b.name : 'A dealer', short = bn.split(' ').slice(-1)[0];
    // an order they phoned in (phone.js) is yours alone, and pays triple
    const pc = ((G.world && G.world.commissions) || []).find((x) => x.id === r.cid);
    const phone = !!(pc && pc.phone);
    const kind = phone ? 'YOUR ORDER' : 'WANT AD', pays = phone ? 'triple' : 'double';
    const still = phone ? bn + '\'s order with you is still open.' : bn + '\'s ad is still in the paper.';
    if (r.buried) return { col: PAL.gold, tag: kind + ': ' + short.toUpperCase() + ' PAYS ' + pays.toUpperCase(), sub: r.name + ', somewhere in there',
      office: '"' + still + ' The ' + r.name.toLowerCase() + ' is in unit ' + u + ' somewhere. Not where you can see it."',
      peek: kind + ': ' + bn + ' pays ' + pays + ' for a ' + r.name.toLowerCase() + ' until day ' + r.until + '. The clerk says it is in here. You cannot see it from the rope.',
      room: 'You know something the room does not: there is a ' + r.name.toLowerCase() + ' in there, and ' + bn + ' pays ' + pays + ' for it.' };
    return { col: PAL.gold, tag: kind + ': ' + short.toUpperCase() + ' PAYS ' + pays.toUpperCase(), sub: r.name + ', front row',
      office: '"' + still + ' Unit ' + u + ' has a ' + r.name.toLowerCase() + ' right in the front."',
      peek: kind + ': ' + bn + ' pays ' + pays + ' for a ' + r.name.toLowerCase() + ' until day ' + r.until + '. There is one in the front row.',
      room: 'You know something the room does not: ' + bn + ' pays ' + pays + ' for that ' + r.name.toLowerCase() + '.' };
  }
  if (r.kind === 'ednote') {
    return { col: PAL.lblue, tag: "ED'S NOTEBOOK IS IN HERE", sub: 'front row. Ed wants it back', office: null,
      peek: "That green notebook in the front row is Eagle Ed's. He has been standing at this door since six. He wants it back.",
      room: 'Eagle Ed is here for one thing, and it is green.', pop: { kind: 'arc', caption: 'ED WANTS IT BACK' } };
  }
  if (r.kind === 'tenant') {
    return { col: PAL.orange, tag: 'THE TENANT IS HERE', sub: TENANT.short + ' wants his bowling trophies back', office: null,
      peek: 'The man in the bowling shirt at the rope is ' + TENANT.name + '. He rented this unit. The trophies in the front row are his, he cannot pay for them, and he has opinions about everyone who bids.',
      room: null };
  }
  if (r.kind === 'set') {
    return { col: PAL.cyan, tag: 'GOES WITH YOUR SHED', sub: r.name + ', you have ' + r.have + ' like it',
      office: null,
      peek: 'That ' + r.name.toLowerCase() + ' looks like it goes with the ' + r.have + ' pieces in your shed. It might.',
      room: 'That ' + r.name.toLowerCase() + ' might finish something in your shed. The room does not know that.' };
  }
  const need = RIVAL_NEEDS[r.rival], def = rivalDef(r.rival);
  if (!need || !def) return null;
  const nm = shortRivalName(def), verb = def.id === 'duo' ? 'need' : 'needs';   // Cody and Kaylee are two people
  return { col: PAL.orange, tag: nm.toUpperCase() + ' ' + verb.toUpperCase() + ' THIS ONE', sub: need.why, office: need.office.replace(/\{u\}/g, u),
    peek: nm + ' ' + verb + ' this one: ' + need.why + '. Let them have it and they owe you. Take it and they remember.',
    room: need.room };
}
function reasonOfficeLine() {
  const r = G.today && G.today.reason;
  const lk = r && G.today.lockers.find((d) => d.num === r.unit);
  if (!r || !lk || lk.won || lk.sold) return null;
  const words = reasonWords(r);
  return words && words.office;
}
// the room for a door somebody needs: they come out, higher, and the tell is honest
function applyNeed(lk, npcs) {
  const r = lk && lk.reason;
  if (r && r.kind === 'ednote') {                          // Ed at the door with his notebook in the front row
    const e = npcs.find((n) => n.def.id === 'ed' && !n.crowd);
    if (!e || (e.budgetCap || 0) < (lk.minBid || 0)) return null;
    e.active = true; e.broke = false; e.needs = true;
    e.cap = Math.min(e.budgetCap, Math.round(Math.max(e.cap, (lk.minBid || 0) * 2) * 2));
    e.pressLeft = (e.pressLeft || 0) + 2;
    return e;
  }
  if (r && r.kind === 'tenant') {                        // Merle's old unit: Sal comes to buy it out from under him
    const s = npcs.find((n) => n.def.id === 'sal' && !n.crowd);
    if (s && (s.budgetCap || 0) >= (lk.minBid || 0)) {
      s.active = true; s.broke = false;
      s.cap = Math.min(s.budgetCap, Math.max(s.cap, Math.round((lk.minBid || 0) * 3), Math.round((lk.value || 0) * 1.1)));
      s.spiteCap = Math.min(s.budgetCap, Math.round(s.cap * 1.2));
      s.pressLeft = (s.pressLeft || 0) + 1;
    }
    return null;
  }
  if (!r || r.kind !== 'need') return null;
  const a = npcs.find((n) => n.def.id === r.rival && !n.crowd);
  if (!a || (a.budgetCap || 0) < (lk.minBid || 0)) return null;
  a.active = true; a.broke = false; a.needs = true;
  a.cap = Math.min(a.budgetCap, Math.round(Math.max(a.cap, (lk.minBid || 0) * 1.5) * 1.5));
  a.pressLeft = (a.pressLeft || 0) + 1;
  return a;
}
// ---- Big Bart's truck: the first rival arc (IDEAS_TODO 3, the beat sheet's day 10; built 2026-09-15) ----
// Day 7 on: the truck comes in smoking (the office says so, once). From day 10 (or the first morning after): it is in
// the shop for five days. Bart walks in, bids out of a fifth of his usual wallet, raises by the smallest step, folds
// early, and one of those mornings needs a door to pay for the transmission. The morning it comes back depends on that
// week: let him have a door he needed and he owes you (a tip on a door, a point of standing); take one off him and he
// runs you up for a week. Once per world; never in a demo world (demoBase sets world.noArcs).
const BART_SMOKE_DAY = 7, BART_SHOP_DAY = 10, BART_SHOP_DAYS = 5;
const BART_BROKE_LINES = {
  raise: ['Bart raises by the smallest step there is. He checked his wallet first.', '"I can go that far." Bart does not say how far.', 'Bart bids with the paddle held low, like it is heavy.'],
  fold: ['Bart counts his cash, twice, and folds.', '"Not this week." Bart puts the paddle down.', 'Bart looks at the door like it owes him a transmission.'],
  win: ['Bart takes it and pays in small bills.', '"The truck thanks you." Bart counts it out slowly.'],
};
function bartArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.bartTruck = w.arcs.bartTruck || {}); }
function bartBrokeOn(world, day) {
  const a = world && world.arcs && world.arcs.bartTruck;
  return !!(a && a.shopDay != null && !a.backDay && day >= a.shopDay && day < a.shopDay + BART_SHOP_DAYS);
}
// the morning (startDay, before the door reasons): move the arc along
function bartTruckTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo) return;
  const arc = bartArc(w);
  if (arc.backDay) return;
  if (arc.shopDay == null && !arc.smokeDay && G.day >= BART_SMOKE_DAY && G.day < BART_SHOP_DAY) { arc.smokeDay = G.day; arc.say = 'smoke'; return; }
  if (arc.shopDay == null && G.day >= BART_SHOP_DAY) {
    arc.shopDay = G.day; arc.say = 'shop';
    recordEvent('bartTruckShop', { day: G.day - 1 });                 // it went out on the flatbed last night: this morning's paper has it
    return;
  }
  if (arc.shopDay != null && G.day >= arc.shopDay + BART_SHOP_DAYS) {
    const inWeek = (e) => e.rival === 'bart' && e.day >= arc.shopDay && e.day < arc.shopDay + BART_SHOP_DAYS;
    const evs = w.events || [];
    const helped = evs.some((e) => e.k === 'letHaveIt' && inWeek(e)), crossed = evs.some((e) => e.k === 'tookNeed' && inWeek(e));
    arc.outcome = crossed ? 'crossed' : (helped ? 'helped' : 'neutral');   // taking it off him outweighs the rest
    arc.backDay = G.day; arc.say = 'back_' + arc.outcome;
    const mem = w.rivalMem = w.rivalMem || {};
    if (arc.outcome === 'helped') { standingBump('bart', 1); mem.bartOwesUntil = G.day + 10; }
    if (arc.outcome === 'crossed') mem.bartGrudgeUntil = G.day + 7;
    recordEvent('bartTruckBack', { day: G.day - 1, outcome: arc.outcome });
  }
}
// the office board, the morning something happened (one line, once)
function bartArcOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.bartTruck) || null;
  if (!arc || !arc.say) return null;
  const k = arc.say;
  arc.say = null;
  if (k === 'smoke') return '"Big Bart\'s truck came in smoking this morning. He parked it where everybody could see it and stood in front of it."';
  if (k === 'shop') return '"Big Bart\'s truck went out on a flatbed last night. He walked here. He says he is fine. Watch his paddle this week."';
  if (k === 'back_helped') {
    const row = ((G.today && G.today.lockers) || []).filter((d) => !d.won && !d.sold);
    const best = row.slice().sort((x, y) => visibleValue(y) - visibleValue(x))[0];
    return '"Big Bart honked twice coming in. Truck\'s back. He says to tell you unit ' + (best ? best.num : '?') + ' is worth your morning. He owes you one."';
  }
  if (k === 'back_crossed') return '"Big Bart\'s truck is back. So is Bart. He parked it facing your van and he is in a mood about his week."';
  return '"Big Bart\'s truck is back from the shop. He drove it round the yard twice so everybody saw."';
}
// at the sale: the first room he walks into that week, and the first after the truck is back
function bartArcAuctionBeat() {
  const arc = (G.world && G.world.arcs && G.world.arcs.bartTruck) || null;
  if (!arc || G.demo || (G.world && G.world.noArcs)) return null;
  if (bartBrokeOn(G.world, G.day) && !arc.walkedIn) { arc.walkedIn = G.day; return { text: 'Big Bart walks in. On foot. Everybody knows where the truck is.', caption: 'ON FOOT THIS WEEK', react: 'sweat' }; }
  if (arc.backDay && arc.backDay <= G.day && !arc.drovenIn) {
    arc.drovenIn = G.day;
    if (arc.outcome === 'crossed') return { text: 'Big Bart leans on the truck and stares at you. The truck is back. The grudge came with it.', caption: 'BART IS BACK', react: 'glare' };
    if (arc.outcome === 'helped') return { text: 'Big Bart tips his hat at you from the truck. He owes you one, and he wants you to know it.', caption: 'BART IS BACK', react: 'win' };
    return { text: 'Big Bart pulls into the yard in the truck, loud about it.', caption: 'BART IS BACK', react: 'bid' };
  }
  return null;
}
// ---- Eagle Ed's notebook: the second rival arc (the beat sheet's day 18; built 2026-09-15) ----
// Day 18 (or the first morning after): the notebook is gone. For three days Ed bids on guesses: his number swings as
// wide as Dex's, his doorway tell says nothing, the yard's "watch Ed" tip turns into a warning, and nothing he does
// counts toward the rule you learn about him. Day 21: it turns up in the front row of one door; that door's reason is
// Ed's notebook, and Ed is at that door with twice his number. Dig it out yourself and choose: GIVE IT BACK (standing +2,
// the next morning a torn-out page names a door, and his tell never lies to you for ten days) or KEEP IT (his notes are
// your tool; standing -3, his notebook closes on you for ten days). Anybody else getting the door ends it quietly.
// Once per world; never in a demo world.
const ED_LOST_DAY = 18, ED_LOST_DAYS = 3;
const ED_LOST_LINES = {
  raise: ['Ed bids without writing anything down. It visibly costs him.', 'Ed raises and pats the pocket where the notebook goes. Nothing there.', '"Probably." Ed has never said probably.'],
  fold: ['Ed folds. He was guessing, and he hates guessing.', 'Ed pats his pockets, all of them, and steps back.', 'Ed looks at the door like a stranger. Out.'],
  win: ['Ed takes it and does not look pleased. He does not know if he should be.', 'Ed wins it on a guess and writes that down on his hand.'],
};
function edArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.edNotebook = w.arcs.edNotebook || {}); }
function edNotebookGone(world, day) {
  const a = world && world.arcs && world.arcs.edNotebook;
  return !!(a && a.lostDay != null && day >= a.lostDay && day < a.lostDay + ED_LOST_DAYS);
}
// the morning (startDay, before the door reasons)
function edNotebookTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo) return;
  const arc = edArc(w);
  if (arc.doneDay) return;
  if (arc.lostDay == null) {
    if (G.day >= ED_LOST_DAY) { arc.lostDay = G.day; arc.say = 'lost'; recordEvent('edNotebookLost', { day: G.day - 1 }); }
    return;
  }
  if (arc.foundDay == null) {
    if (G.day < arc.lostDay + ED_LOST_DAYS) return;
    const doors = ((G.today && G.today.lockers) || []).filter((lk) => !lk.won && !lk.sold && !lk.story && !lk.rare && !lk.opening && !lk.seededLegend && !lk.pair);
    if (!doors.length) return;                                  // no ordinary door this morning: it turns up tomorrow
    const R = dayR('edNotebook');
    const lk = R.pick(doors);
    const it = placeFront(R, lk, 'diary');
    if (!it) return;
    it.name = "Eagle Ed's Notebook"; it.preName = null; it.hideBrand = false; it.val = 1; it.cond = 'Worn'; it.cat = 'weird'; it.edNotebook = true;
    it.note = 'Green cover. EAGLE ED inside, underlined twice. Every page is a unit number and a price, and most of the prices are right.';
    let v = 0; for (const x of lk.items) { v += x.val; if (x.loot) for (const l of x.loot) v += l.val; }
    lk.value = v;
    lk.edNotebook = true;
    arc.foundDay = G.day; arc.unit = lk.num; arc.say = 'found';
    lk.reason = { kind: 'ednote', unit: lk.num, uid: it.uid };
    G.today.reason = lk.reason;
    return;
  }
  if (G.day > arc.foundDay) {
    const evs = w.events || [];
    const sale = evs.find((e) => (e.k === 'lost' || e.k === 'soldWithout') && e.unit === arc.unit && e.day === arc.foundDay);
    const who = sale ? sale.rival : null;
    const outcome = arc.choice || (who === 'ed' ? 'edBought' : (who ? 'rivalReturned' : 'clerk'));
    arc.outcome = outcome; arc.who = who; arc.doneDay = G.day; arc.say = 'done_' + outcome;
    const mem = w.rivalMem = w.rivalMem || {};
    if (outcome === 'returned') mem.edOwesUntil = G.day + 10;
    if (outcome === 'kept') mem.edQuietUntil = Math.max(mem.edQuietUntil || 0, G.day + 10);
    recordEvent('edNotebookBack', { day: G.day - 1, outcome, rival: who });
  }
}
// dug out of the door you won: the choice
function edNotebookChoice(it, choice) {
  const arc = edArc(G.world);
  arc.choice = choice;
  if (G.inspect === it) G.inspect = null;
  if (choice === 'returned') {
    standingBump('ed', 2);
    recordEvent('edNotebookReturned', { unit: G.cur ? G.cur.num : 0 });
    toast('You walk it over. Ed takes it with both hands and does not say anything for a while.', PAL.cyan, 4);
  } else {
    standingBump('ed', -3);
    if (!hasTool('edNotes')) G.world.tools.push('edNotes');
    recordEvent('edNotebookKept', { unit: G.cur ? G.cur.num : 0 });
    toast('It goes in your jacket. Across the yard, Ed stops writing.', PAL.orange, 4);
  }
  play('ui_click', 0.6);
}
function edArcOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.edNotebook) || null;
  if (!arc || !arc.say) return null;
  const k = arc.say;
  arc.say = null;
  if (k === 'lost') return '"Eagle Ed went through every bin behind the office this morning. He has lost his notebook. Do not mention it."';
  if (k === 'found') return '"Somebody saw a green notebook in the front row of unit ' + arc.unit + '. Eagle Ed has been standing at that door since six."';
  if (k === 'done_returned') {
    const row = ((G.today && G.today.lockers) || []).filter((d) => !d.won && !d.sold);
    const best = row.slice().sort((x, y) => (y.value || 0) - (x.value || 0))[0];
    return '"Eagle Ed left a page on your van. One line: unit ' + (best ? best.num : '?') + ', and \'worth it.\' He owes you."';
  }
  if (k === 'done_kept') return '"Eagle Ed bought a new notebook at the general store. He wrote one thing on the first page and looked at you while he did it."';
  if (k === 'done_edBought') return '"Eagle Ed bought his own notebook back yesterday. He is not discussing the price."';
  if (k === 'done_rivalReturned') { const d = rivalDef(arc.who); return '"' + (d ? d.name : 'Somebody') + ' gave Eagle Ed his notebook back. Ed bought them a coffee, which nobody has ever seen him do."'; }
  return '"The clerk found Eagle Ed\'s notebook and handed it over. Ed checked every page before he said thank you."';
}
// at the sale: the first room he walks into without it
function edArcAuctionBeat() {
  const arc = (G.world && G.world.arcs && G.world.arcs.edNotebook) || null;
  if (!arc || G.demo || (G.world && G.world.noArcs)) return null;
  if (edNotebookGone(G.world, G.day) && !arc.walkedIn) { arc.walkedIn = G.day; return { text: 'Eagle Ed stands at the back with no notebook. He looks like a man who has lost his glasses.', caption: 'NO NOTEBOOK', react: 'sweat' }; }
  return null;
}
RIVAL_GOSSIP.edNotebookReturned = { who: ['ed'], lines: { ed: ['"Page nineteen." Ed nods at you. "Thank you."', 'Ed taps the green notebook and nods at you. That is a lot, for Ed.'] } };
RIVAL_GOSSIP.edNotebookKept = { who: ['ed'], lines: { ed: ['Ed writes your name on the first page of a new notebook. You watch him do it.', 'Ed opens a new notebook, looks at you, and closes it again.'] } };
// ---- Cody & Kaylee split: the third rival arc (the beat sheet's day 24; built 2026-09-15) ----
// Day 22 on: they come in two trucks (the office says so, once). From day 24 (or the first morning after) they are apart
// for a week: the pair's paddle is two (DUO_HALVES in gen.js), Cody pricing the tools and Kaylee the little boxes, and
// whenever one has the lead the other goes past their own number to take it off them. None of it is aimed at you: sit
// out and let them, and they pay each other's prices out of their own day wallets. The week decides the morning they come
// back: two or more doors won with both of them in the room, and more than you let go, is `united` (they made up over
// you: standing -2 and a week of being run up); two or more doors they both wanted that you let go (never bid on, or
// sold without you), and more than you took, is `thanks` (standing +1; for ten days no spite on you and a lower number);
// else `neutral`. Once per world; never in a demo world.
const DUO_FIGHT_DAY = 22, DUO_SPLIT_DAY = 24, DUO_SPLIT_DAYS = 7;
function duoArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.duoSplit = w.arcs.duoSplit || {}); }
function duoSplitOn(world, day) {
  const a = world && world.arcs && world.arcs.duoSplit;
  return !!(a && a.splitDay != null && !a.backDay && day >= a.splitDay && day < a.splitDay + DUO_SPLIT_DAYS);
}
// both of them in one room (an auction's faces, or a room settled without you)
function duoHalvesIn(npcs) {
  return !!npcs && ['cody', 'kaylee'].every((id) => npcs.some((n) => n.def && n.def.id === id && n.active));
}
// the week, counted: doors you won with both of them in the room, and doors both of them were in that you let go
function duoSplitTally(w, arc) {
  let middle = 0, letGo = 0;
  for (const e of w.events || []) {
    if (e.day < arc.splitDay || e.day >= arc.splitDay + DUO_SPLIT_DAYS) continue;
    const ag = e.against || [];
    if (e.k === 'won' && ag.includes('cody') && ag.includes('kaylee')) middle++;
    else if (e.halves && ((e.k === 'lost' && !e.contested) || e.k === 'soldWithout')) letGo++;
  }
  return { middle, letGo };
}
// the morning (startDay, after Ed's, before the door reasons)
function duoSplitTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo) return;
  const arc = duoArc(w);
  if (arc.backDay) return;
  if (arc.splitDay == null && !arc.fightDay && G.day >= DUO_FIGHT_DAY && G.day < DUO_SPLIT_DAY) { arc.fightDay = G.day; arc.say = 'fight'; return; }
  if (arc.splitDay == null && G.day >= DUO_SPLIT_DAY) {
    arc.splitDay = G.day; arc.say = 'split';
    recordEvent('duoSplitUp', { day: G.day - 1 });                    // C&K Resale shut last night: this morning's paper has it
    return;
  }
  if (arc.splitDay != null && G.day >= arc.splitDay + DUO_SPLIT_DAYS) {
    const t = duoSplitTally(w, arc);
    arc.middle = t.middle; arc.letGo = t.letGo;
    // what you did in their week decides the morning they come back. Playing both ends is the worst of it:
    // they compare notes, and the thing they agree about is you. Backing one is its own ending — half a
    // friend and half an enemy, which is not the same as staying out of it.
    arc.outcome = arc.betrayed ? 'united'
      : (arc.side ? 'sided'
        : ((t.middle >= 2 && t.middle > t.letGo) ? 'united' : ((t.letGo >= 2 && t.letGo > t.middle) ? 'thanks' : 'neutral')));
    arc.backDay = G.day; arc.say = 'back_' + arc.outcome;
    const mem = w.rivalMem = w.rivalMem || {};
    if (arc.outcome === 'united') { standingBump('duo', -2); mem.duoGrudgeUntil = G.day + 7; }
    if (arc.outcome === 'thanks') { standingBump('duo', 1); mem.duoOwesUntil = G.day + 10; }
    // sided: the one you backed is grateful and the one you crossed is not, and they share a paddle again.
    // Standing is shared between them (STANDING_AS), so it nets out at nothing — the ease is shorter than
    // a clean 'thanks', and half of that truck has not forgotten.
    if (arc.outcome === 'sided') mem.duoOwesUntil = G.day + 5;
    recordEvent('duoBackTogether', { day: G.day - 1, outcome: arc.outcome });
  }
}
function duoArcOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.duoSplit) || null;
  if (!arc || !arc.say) return null;
  const k = arc.say;
  arc.say = null;
  if (k === 'fight') return '"Cody and Kaylee came in two trucks this morning. Nobody has ever seen them in two trucks."';
  if (k === 'split') return '"Cody and Kaylee have split up. They are both still coming, one paddle each. When they both want a door, stay out of the middle."';
  if (k === 'back_united') return '"Cody and Kaylee are back together. They made up in the parking lot, and from what I heard, it was mostly about you."';
  if (k === 'back_thanks') return '"Cody and Kaylee came in one truck. Kaylee says thanks for staying out of it. Cody says it too, a second later. They will go easy on you for a while."';
  if (k === 'back_sided') {
    const arc2 = (G.world && G.world.arcs && G.world.arcs.duoSplit) || {};
    const backed = arc2.side === 'cody' ? 'Cody' : 'Kaylee', crossed = arc2.side === 'cody' ? 'Kaylee' : 'Cody';
    return '"Cody and Kaylee are back on one paddle. ' + backed + ' says you stood with them all week. ' + crossed + ' was standing right there when they said it."';
  }
  return '"Cody and Kaylee are back together. One truck, one paddle, two opinions. Like nothing happened."';
}
// the half you are standing with this week, if you took a side and did not sell them both out
function duoSideNow(world, day) {
  const w = world || G.world;
  const a = w && w.arcs && w.arcs.duoSplit;
  if (!a || !a.side || a.betrayed) return null;
  return (typeof duoSplitOn === 'function' && duoSplitOn(w, day == null ? G.day : day)) ? a.side : null;
}
// at the sale: the first room with both of them in it that week, and the first with the pair after
function duoArcAuctionBeat(npcs) {
  const arc = (G.world && G.world.arcs && G.world.arcs.duoSplit) || null;
  if (!arc || G.demo || (G.world && G.world.noArcs)) return null;
  if (duoSplitOn(G.world, G.day) && !arc.walkedIn && duoHalvesIn(npcs)) {
    arc.walkedIn = G.day;
    return { id: 'kaylee', text: 'Cody stands at one end of the row. Kaylee stands at the other. One paddle each, and neither of them will look over.', caption: 'SPLIT UP', react: 'scoff' };
  }
  if (arc.backDay && arc.backDay <= G.day && !arc.backIn && (npcs || []).some((n) => n.def && n.def.id === 'duo' && n.active)) {
    arc.backIn = G.day;
    if (arc.outcome === 'united') return { id: 'duo', text: 'Cody and Kaylee walk in holding hands and look straight at you. They agree about one thing now.', caption: 'BACK TOGETHER', react: 'glare' };
    if (arc.outcome === 'thanks') return { id: 'duo', text: 'Kaylee waves at you across the yard. Cody waves too, a second later.', caption: 'BACK TOGETHER', react: 'warm' };
    if (arc.outcome === 'sided') return { id: 'duo', text: (arc.side === 'cody' ? 'Cody' : 'Kaylee') + ' nods at you. The other one is holding the paddle, and does not.', caption: 'BACK TOGETHER', react: 'scoff' };
    return { id: 'duo', text: 'Cody and Kaylee are back on one paddle, already arguing about who holds it.', caption: 'BACK TOGETHER', react: 'bid' };
  }
  return null;
}
// ---- the tenant: Merle Tuttle wants his bowling trophies back (the beat sheet's day 12, comic; built 2026-09-15) ----
// Day 12 (or the first ordinary morning after): the man who rented one of today's doors is at the rope. Two of his
// bowling trophies sit in that door's front row (a story-only base), the door's reason is `tenant` (yard stamp THE TENANT
// IS HERE), the paper ran his eviction, and the office warns you he will be commenting. At the sale he pops in, sits on
// the rail and heckles the paddles (tenantHeckle: the first one always, then at most every other one, nine a sale, and
// the hammer). Sal comes to that door to buy it out from under him, past his usual number. Win it and pull a trophy:
// SELL IT BACK for the twenty dollars Merle has (one, not both). The next morning settles it: soldBack (an office favour,
// and for a week the crowd goes easy on you), kept, salBought (on Sal's dashboard, not for sale; his Ledger card says so
// for ten days), rivalBought, or unsold. The paper runs it every way. Once per world; never in a demo world.
const TENANT = { name: 'Merle Tuttle', short: 'Merle' };
const TENANT_DAY = 12, TENANT_PAYS = 20;
const TENANT_TROPHIES = [
  { name: "Merle Tuttle's Bowling Trophy, 1987", val: 30, note: 'County lanes, league champion. The little gold bowler has lost his ball.' },
  { name: "Merle Tuttle's Bowling Trophy, 1989 (Runner-Up)", val: 18, note: 'Runner-up. Somebody scratched ROBBED into the plinth with a key.' },
];
const TENANT_HECKLES = {
  you: ['Merle, from the rope: "Oh, look at Moneybags. Those are REGULATION trophies, pal."',
    'Merle, from the rope: "You don\'t even BOWL. Look at your wrists."',
    'Merle, from the rope: "That\'s my 1987 in there. You weren\'t even in the county in 1987."',
    'Merle, from the rope: "Bid higher. No, don\'t. No, DO. I can\'t watch this."',
    'Merle, to the crowd: "This one bids like he throws gutters."'],
  rival: ['Merle, from the rope: "{name}? {name} couldn\'t pick up a seven-ten split with a forklift."',
    'Merle, from the rope: "Put the paddle down, {name}. Those trophies have seen things."',
    'Merle, from the rope: "{name} is bidding on my LIFE, everybody. Round of applause for {name}."',
    'Merle, from the rope: "I know your mother, {name}. She bowls a ninety."'],
  sal: ['Merle, from the rope: "SAL. Sal, I swear, if my trophies end up on your dashboard—"',
    'Merle, to the crowd: "Everybody look at Sal. Sal has never bowled a strike in his life."',
    'Merle, from the rope: "You don\'t even WANT them, Sal. You just want me not to have them."'],
  crowd: ['Merle, from the rope: "The CROWD? Half of you owe me money."',
    'Merle, from the rope: "Oh, now the folding chairs want in. Beautiful."'],
  soldYou: ['Merle, from the rope: "Take care of them. Dust them. TALK to them."',
    'Merle, from the rope: "Fine. FINE. I\'ll be by your van."'],
  soldSal: ['Merle sits down on the gravel. "Not SAL. Anybody but Sal."'],
  soldRival: ['Merle, from the rope: "{name}. Of course. OF COURSE."',
    'Merle throws his hat on the ground, then picks it up again, because it is his only hat.'],
};
function tenantArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.tenant = w.arcs.tenant || {}); }
// his trophy, pulled from his door on his day, and he has not had one back yet
function tenantCanSellBack() {
  const a = (G.world && G.world.arcs && G.world.arcs.tenant) || null;
  return !!(a && a.doorDay === G.day && !a.soldBack && !a.doneDay && G.cur && G.cur.tenantDoor);
}
// the morning (startDay, after the rival arcs, before the door reasons)
function tenantTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo) return;
  const arc = tenantArc(w);
  if (arc.doneDay) return;
  if (arc.doorDay == null) {
    if (G.day < TENANT_DAY || !G.today || !G.today.lockers || G.today.reason) return;   // a story already has this morning: tomorrow
    if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
    const doors = G.today.lockers.filter((lk) => !lk.won && !lk.sold && !lk.story && !lk.rare && !lk.opening && !lk.seededLegend && !lk.pair && !lk.edNotebook);
    if (!doors.length) return;
    const R = dayR('tenant');
    const lk = R.pick(doors);
    let made = 0;
    for (const spec of TENANT_TROPHIES) {
      const it = placeFront(R, lk, 'bowlingTrophy');
      if (!it) break;
      it.name = spec.name; it.preName = null; it.hideBrand = false; it.val = spec.val; it.cond = 'Worn';
      it.note = spec.note; it.tenantTrophy = true;
      made++;
    }
    if (!made) return;
    let v = 0; for (const x of lk.items) { v += x.val; if (x.loot) for (const l of x.loot) v += l.val; }
    lk.value = v;
    lk.tenantDoor = true;
    lk.reason = { kind: 'tenant', unit: lk.num };
    G.today.reason = lk.reason;
    arc.doorDay = G.day; arc.unit = lk.num; arc.town = w.town; arc.say = 'here';
    recordEvent('tenantEvicted', { day: G.day - 1 });              // the paper had it this morning
    return;
  }
  if (G.day > arc.doorDay) {
    const evs = w.events || [];
    const same = (e) => e.unit === arc.unit && e.day === arc.doorDay && e.town === arc.town;
    const won = evs.some((e) => e.k === 'won' && same(e));
    const sale = evs.find((e) => (e.k === 'lost' || e.k === 'soldWithout') && same(e));
    const who = sale ? sale.rival : null;
    const outcome = arc.soldBack ? 'soldBack' : (won ? 'kept' : (who === 'sal' ? 'salBought' : (who ? 'rivalBought' : 'unsold')));
    arc.outcome = outcome; arc.who = who; arc.doneDay = G.day; arc.say = 'done_' + outcome;
    const mem = w.rivalMem = w.rivalMem || {};
    if (outcome === 'soldBack') { w.favours = Math.min(FAVOUR_MAX, favoursNow() + 1); mem.townLikesUntil = G.day + 7; }
    if (outcome === 'salBought') mem.salTrophiesUntil = G.day + 10;
    recordEvent('tenantBack', { day: G.day - 1, outcome, rival: who });
  }
}
// pulled in the dig: over the rope for the twenty dollars he has, once
function tenantSellBack(it) {
  if (!it || G.inspect !== it || !tenantCanSellBack()) return;
  const arc = tenantArc(G.world);
  arc.soldBack = it.uid; arc.soldName = it.name;
  G.inspect = null;                                                  // it goes to Merle, not into the pile
  gain(TENANT_PAYS);
  if (G.dayStats) { G.dayStats.soldCount = (G.dayStats.soldCount || 0) + 1; G.dayStats.soldTotal = (G.dayStats.soldTotal || 0) + TENANT_PAYS; }
  recordEvent('tenantSoldBack', { unit: G.cur ? G.cur.num : 0, name: it.name });
  toast('Merle pays twenty dollars in ones and a coupon for a free game. He hugs the trophy.', PAL.cyan, 4.5);
  play('coin');
}
// a paddle just landed (pumpQueue): Merle has a word for it, on his own dice so the room's decisions never move
function tenantHeckle(a, l) {
  const t = a.tenant;
  if (!t) return;
  const k = t.i = (t.i || 0) + 1;
  const R = RNG(strHash('heckle' + G.worldSeed + '_' + G.day + '_' + (G.cur ? G.cur.num : 0) + '_' + k));
  const d = l.npcId && l.npcId !== 'crowd' ? rivalDef(l.npcId) : null;
  let pool;
  if (l.sfx === 'sold') pool = TENANT_HECKLES.soldYou;
  else if (l.sfx === 'lose') pool = l.npcId === 'sal' ? TENANT_HECKLES.soldSal : TENANT_HECKLES.soldRival;
  else {
    if (t.n >= 9) return;
    if (t.n > 0 && (k - t.last < 2 || !R.chance(0.55))) return;     // not every paddle, never two in a row
    pool = l.sfx === 'pbid' ? TENANT_HECKLES.you : (l.npcId === 'sal' ? TENANT_HECKLES.sal : (l.npcId === 'crowd' ? TENANT_HECKLES.crowd : TENANT_HECKLES.rival));
  }
  if (!d) pool = pool.filter((s) => s.indexOf('{name}') < 0).length ? pool.filter((s) => s.indexOf('{name}') < 0) : TENANT_HECKLES.crowd;
  t.n++; t.last = k;
  a.queue.unshift({ text: R.pick(pool).replace(/\{name\}/g, d ? shortRivalName(d) : ''), col: PAL.lred, sfx: 'heckle', heckle: true, showBid: l.showBid, showLeader: l.showLeader });
}
function tenantArcOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.tenant) || null;
  if (!arc || !arc.say) return null;
  const k = arc.say;
  arc.say = null;
  if (k === 'here') return '"The fella who rented unit ' + arc.unit + ' is out by the rope in a bowling shirt. Merle Tuttle. He wants his trophies back, he cannot pay for them, and he will be commenting on the bids."';
  if (k === 'done_soldBack') return '"Merle Tuttle came by at seven to show me his trophy. Twice. The whole yard heard what you did. The office owes you one."';
  if (k === 'done_kept') return '"Merle Tuttle wants you to know he has your plate number. He wants you to know he is not going to do anything with it. He just has it."';
  if (k === 'done_salBought') return '"Sal bought Merle\'s old unit. The trophies are on Sal\'s dashboard. Merle offered him forty dollars. Sal laughed for a full minute."';
  if (k === 'done_rivalBought') { const d = rivalDef(arc.who); return '"' + (d ? d.name : 'Somebody') + ' bought Merle\'s old unit and sold him a trophy back for ten dollars. Merle is telling everyone it was fifty."'; }
  return '"Nobody bid on Merle\'s old unit. The office let him take his trophies. He took a stapler too. We are letting that go."';
}
RIVAL_GOSSIP.tenantSoldBack = { who: ['bart', 'dutch', 'duo'], lines: {
  bart: ['"Sold Merle his trophy back for twenty bucks. Son, you are soft. I like it."'],
  dutch: ['"Yip." Dutch nods at you. It is a kind yip. It is about Merle.'],
  duo: ['"They sold Merle his trophy back." "That\'s SWEET." "That\'s BAD BUSINESS." "It\'s both."'] } };
RIVAL_GOSSIP.tenantBack = { who: ['sal'], test: (e) => e.outcome === 'salBought', lines: {
  sal: ['Sal taps the little gold bowler on his dashboard and waves at you with it.', '"Merle offered forty. FORTY." Sal wipes his eyes.'] } };
// ---- somebody is away this week (IDEAS_TODO 2's last rival bullet; built 2026-09-16) ----
// Unlike the three scripted arcs, this is a fact about a TOWN and a career, seeded like a feud: about half of
// towns have one face who takes a week off somewhere in days AWAY_FROM..AWAY_UNTIL, for a reason of their own.
// They are simply NOT IN THE ROOM for AWAY_DAYS - dropped from the roster, so no paddle, no tell, no partner
// offer, no tip. That is a window, and it is meant to be used: the doors they always come out for are suddenly
// cheaper. The bill comes due when they get back. A week of missed doors means a full wallet and a bigger
// number for AWAY_HUNGRY_DAYS, so the week is a loan, not a gift. Never in a demo world, never Cody and Kaylee
// (their split is its own arc), and never two people at once.
const AWAY_TOWNS = 0.5, AWAY_DAYS = 7, AWAY_FROM = 9, AWAY_UNTIL = 46, AWAY_HUNGRY_DAYS = 3, AWAY_HUNGRY = 1.25;
const AWAY_WHY = {
  bart: ['hauling a load to his brother in law', 'at a truck auction two states over'],
  ed: ['at a coin show', 'sitting with his mother in the hospital'],
  dutch: ['at the tire wholesalers', 'burying an uncle. YIP, quietly'],
  bev: ['driving the church sale to the coast', 'at her granddaughter\'s wedding'],
  pruitt: ['following the smelter price south', 'in a dispute with the scale house'],
  vera: ['with her buyer in the city', 'at an estate sale nobody else was asked to'],
  tuck: ['nobody knows. Tuck did not say', 'gone. Tuck left a note. The note said "back"'],
  hattie: ['chasing a story two counties over', 'at a newspaper convention, she says'],
  cobb: ['at his daughter\'s', 'having his shoulder done'],
  dee: ['at the furniture market', 'moving her mother into a home'],
  charlie: ['at a collectors\' fair', 'in a dispute with a grading service'],
  priscilla: ['at an auction she calls "a proper one"', 'having her rings valued, again'],
  dex: ['at a swap meet in the desert', 'gone to see a man about a two headed calf'],
};
const AWAY_FACES = Object.keys(AWAY_WHY);
// one face, one week, per town per career: seeded, so a reload finds the same empty spot in the room
function awayPlanFor(townId) {
  const t = (typeof TOWNS !== 'undefined') && TOWNS[townId];
  if (!t) return null;
  const R = RNG(strHash('away_' + (G && G.worldSeed) + '_' + townId));
  if (!R.chance(AWAY_TOWNS)) return null;                      // plenty of towns keep everybody all month
  // only somebody who would OTHERWISE BE IN THAT ROOM: the core faces who travel everywhere (bart, ed, dutch)
  // plus this town's own locals. Picking a face who never comes to this yard is an absence nobody can feel -
  // no empty chair, no window on their doors, no hungry week when they get back, and a Ledger card that lies.
  const pool = AWAY_FACES.filter((id) => NPCS.some((n) => n.id === id) || (t.rivals || []).includes(id));
  if (!pool.length) return null;
  const id = R.pick(pool);
  const from = R.i(AWAY_FROM, AWAY_UNTIL);
  return { id, from, why: R.pick(AWAY_WHY[id] || ['away']) };
}
function awayPlanNow(world, day) {
  const w = world || G.world;
  if (!w || w.noArcs || G.demo) return null;
  return awayPlanFor(w.town) || null;
}
// is this face out of town right now?
function awayOn(id, world, day) {
  const p = awayPlanNow(world, day);
  const d = (day == null ? G.day : day);
  return !!(p && p.id === id && d >= p.from && d < p.from + AWAY_DAYS);
}
// just back, and behind on the month: a full wallet and a bigger number for a few days
function awayHungryOn(id, world, day) {
  const p = awayPlanNow(world, day);
  const d = (day == null ? G.day : day);
  return !!(p && p.id === id && d >= p.from + AWAY_DAYS && d < p.from + AWAY_DAYS + AWAY_HUNGRY_DAYS);
}
function awayFaceNow(world, day) {
  const p = awayPlanNow(world, day);
  return (p && awayOn(p.id, world, day)) ? p : null;
}
// the morning it starts and the morning they are back: one line each, once (startDay, beside the other arcs)
function awayTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo) return;
  const p = awayPlanNow(w, G.day);
  if (!p) return;
  const arc = (w.arcs = w.arcs || {}, w.arcs.away = w.arcs.away || {});
  const key = w.town + '_' + p.from;
  if (arc.key !== key) { arc.key = key; arc.gone = false; arc.back = false; }
  if (!arc.gone && G.day >= p.from && G.day < p.from + AWAY_DAYS) {
    arc.gone = true; arc.say = 'gone';
    recordEvent('rivalAway', { day: G.day - 1, rival: p.id, why: p.why });
    return;
  }
  if (arc.gone && !arc.back && G.day >= p.from + AWAY_DAYS) {
    arc.back = true; arc.say = 'back';
    recordEvent('rivalBack', { day: G.day - 1, rival: p.id });
  }
}
function awayArcOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.away) || null;
  if (!arc || !arc.say) return null;
  const k = arc.say;
  arc.say = null;
  const p = awayPlanNow(G.world, G.day);
  const d = p && (typeof rivalDef === 'function') ? rivalDef(p.id) : null;
  const name = d ? d.name : 'One of the regulars';
  if (k === 'gone') return '"' + name + ' is away this week - ' + (p ? p.why : 'away') + '. Whatever they always come out for, nobody is coming out for it."';
  return '"' + name + ' is back. A week of doors missed, and a week of money saved. Mind the first few mornings."';
}
// ---- favours, and taking sides (IDEAS_TODO 7; built 2026-09-16) ----
// The biggest story idea on the list, built to its own design notes. A face pulls you aside and ASKS YOU FOR
// SOMETHING, and you answer from four positions. The rules that shape it:
//   * The ask costs something real. YES takes van bulk, cash, or a thing you were going to sell - never a
//     free "be nice" button. The cost IS the decision.
//   * The nasty answer pays NOW. Charging interest, or selling the thing you promised, puts real money in
//     your pocket today. If it did not, nobody would ever pick it and it would be decoration.
//   * Neutral is a real position, not a soft no. "Ask me Thursday" costs nothing and gains nothing today,
//     and they remember being made to wait: it is marked on the arc (hedged) for whatever comes next.
//   * NOTHING resolves inside the conversation. Every answer books an outcome FAVOUR_DUE days out, and it
//     comes back through channels the game already has: standing, the event log, the office line, the paper.
// One favour live at a time, from FAVOUR_FROM, never in a demo world. It was day 18 (mid-game, the user's first
// call); once the asks rang the phone the user moved them to day 3 (2026-09-17), inside the week they play.
const FAVOUR_FROM = 3, FAVOUR_EVERY = 6, FAVOUR_CHANCE = 0.55, FAVOUR_DUE = 3;
const FAVOUR_BULK = 12, FAVOUR_CASH = 120, FAVOUR_INTEREST = 60;
const FAVOUR_THING_CHEAP = 0.35;                 // what "sell it to me cheap" actually means
const FAVOUR_FACES = ['bart', 'dutch', 'bev', 'pruitt', 'vera', 'cobb', 'dee', 'charlie', 'tuck', 'hattie', 'dex', 'priscilla'];
const FAVOUR_KINDS = {
  space: {
    ask: 'Carry this home in your van and hold it till Thursday. I am full and the gate shuts at six.',
    yes: 'TAKE IT HOME', yesHint: 'costs ' + FAVOUR_BULK + ' bulk of van, every day until Thursday',
    nasty: 'TAKE IT AND SELL IT', nastyHint: 'you keep the space AND the money. They come looking Thursday.',
  },
  cash: {
    ask: 'I am $' + FAVOUR_CASH + ' short on a door I have wanted for a month. Thursday, I swear it.',
    yes: 'LEND IT', yesHint: 'costs $' + FAVOUR_CASH + ' now, back Thursday',
    nasty: 'LEND IT, WITH INTEREST', nastyHint: 'they pay $' + (FAVOUR_CASH + FAVOUR_INTEREST) + ' back, and say so all over the yard.',
  },
  thing: {
    ask: 'You have something of mine, near enough. Sell it to me cheap and I will not forget it.',
    yes: 'LET THEM HAVE IT', yesHint: 'you lose the thing, for about a third of its number',
    nasty: 'PROMISE IT, SELL IT ELSEWHERE', nastyHint: 'full price today, from somebody else. They are still waiting Thursday.',
  },
  // the week Cody and Kaylee are apart (IDEAS_TODO 7, the one the user called the obvious first one).
  // This ask costs you nothing today. It costs you the OTHER ONE, for the rest of their week, in the room.
  side: {
    ask: 'Stand at my end of the row this week. That is all I am asking. You know what they are like.',
    yes: 'BACK {NAME}', yesHint: 'they go easy on your doors. The other one comes for them, all week.',
    nasty: 'BACK THEM, AND TELL THE OTHER', nastyHint: '$' + (FAVOUR_INTEREST + 40) + ' from each of them today. It is a small yard, and it is a long week.',
  },
};
// Where each ask reaches you (the user, 2026-09-17: "yes move the favours onto the phone"). Three of the four
// work down a phone line and ring the garage that evening. Carrying a box home in your van only makes sense at
// the yard, beside the van, so that one is still asked across the rope.
const FAVOUR_VIA = { space: 'yard', cash: 'phone', thing: 'phone', side: 'phone' };
function favourVia(kind) { return FAVOUR_VIA[kind] || 'yard'; }
const FAVOUR_NO = 'NOT THIS TIME', FAVOUR_NO_HINT = 'no cost, no gain. They will remember you said it.';
const FAVOUR_MAYBE = 'ASK ME THURSDAY', FAVOUR_MAYBE_HINT = 'you keep everything and decide nothing. So do they.';
const FAVOUR_ANSWERS = ['yes', 'maybe', 'no', 'nasty'];
function favourState(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.favour = w.arcs.favour || {}); }
function favourLive(world) { const f = favourState(world); return (f.day != null && !f.answer) ? f : null; }
function favourPending(world) { const f = favourState(world); return (f.answer && !f.settled) ? f : null; }
// van bulk a kept promise is using up: the ask has to cost something real, on the days it is owed
function favourBulkToday() {
  const f = favourPending(G.world);
  return (f && f.kind === 'space' && f.answer === 'yes' && G.day < f.due) ? FAVOUR_BULK : 0;
}
// who is around to ask, and would still speak to you
function favourAskerFor(world, day) {
  const w = world || G.world;
  const town = (typeof TOWNS !== 'undefined' && TOWNS[w.town]) || {};
  const roster = (typeof NPCS !== 'undefined' ? NPCS.map((n) => n.id) : []).concat(town.rivals || []);
  const pool = FAVOUR_FACES.filter((id) => roster.includes(id)
    && !(typeof awayOn === 'function' && awayOn(id, w, day))          // nobody asks a favour from out of town
    && (typeof standingOf !== 'function' || standingOf(id) > -3));    // and somebody who has it in for you asks you nothing
  if (!pool.length) return null;
  return RNG(strHash('favour_' + (G && G.worldSeed) + '_' + day + '_' + w.town)).pick(pool);
}
// what they would want: only an ask the day can actually carry
// `phoneOnly`: the dealt opening keeps its yard to itself, so on those mornings only an ask that rings the phone
function favourKindFor(world, day, who, phoneOnly) {
  const R = RNG(strHash('favourkind_' + (G && G.worldSeed) + '_' + day + '_' + who));
  const kinds = phoneOnly ? ['cash'] : ['space', 'cash'];
  if (favourThingFor()) kinds.push('thing');
  return R.pick(kinds);
}
// a thing of yours they could plausibly want: appraised, vouched for, worth having
function favourThingFor() {
  const all = (G.stash || []).concat(G.keeps || []);
  const ok = all.filter((it) => it && it.searched && !it.unverified && !it.locked && !it.loot && !it.cash && (it.val || 0) >= 80);
  if (!ok.length) return null;
  return ok.slice().sort((a, b) => (b.val || 0) - (a.val || 0))[0];
}
// the morning (startDay): one live ask at a time, and a reload the same morning asks again until you answer
function favourTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today) return;
  favourSettle(w);
  const f = favourState(w);
  // still waiting on you: across the rope for a yard ask, or on the phone tonight (phone.js) for the rest
  if (f.day != null && !f.answer) { if (f.via !== 'phone') G.today.favour = true; return; }
  if (f.answer && !f.settled) return;                                      // one at a time
  // their week apart outranks the ordinary ask: it is the one with a side in it
  if (typeof duoSplitOn === 'function' && duoSplitOn(w, G.day)) {
    const arc = duoArc(w);
    if (!arc.side && !arc.sideAsked && !arc.betrayed && arc.sideRefused !== true) {
      const half = RNG(strHash('duoside_' + (G && G.worldSeed) + '_' + (arc.splitDay || 0))).pick(['cody', 'kaylee']);
      w.arcs.favour = { day: G.day, who: half, kind: 'side', via: favourVia('side'), lastDay: f.lastDay, hedged: f.hedged };
      return;                                                          // it rings tonight: one half, calling behind the other's back
    }
  }
  if (G.day < FAVOUR_FROM) return;
  // the dealt opening (days 1-5 at home) is scripted door by door, so nothing may land on its yard. An ask that
  // rings the phone that evening touches none of it, so those still come; the van-box ask waits for day 6.
  const inOpening = typeof openingDay === 'function' && !!openingDay(w, TOWNS[w.town], G.day);
  if (f.lastDay != null && G.day < f.lastDay + FAVOUR_EVERY) return;
  if (!RNG(strHash('favourday_' + (G && G.worldSeed) + '_' + G.day)).chance(FAVOUR_CHANCE)) return;
  const who = favourAskerFor(w, G.day);
  if (!who) return;
  const kind = favourKindFor(w, G.day, who, inOpening);
  const thing = kind === 'thing' ? favourThingFor() : null;
  if (kind === 'thing' && !thing) return;
  const keep = { lastDay: f.lastDay, hedged: f.hedged };
  w.arcs.favour = { day: G.day, who, kind, via: favourVia(kind), lastDay: keep.lastDay, hedged: keep.hedged,
    thingUid: thing ? thing.uid : null, thingName: thing ? dName(thing) : null, thingVal: thing ? thing.val : 0 };
  if (w.arcs.favour.via !== 'phone') G.today.favour = true;
}
// what you said. Nothing lands now except the cost of saying it.
// `phone`: answered down the line (phone.js). The costs are identical; only the in-person asides are left out,
// because nobody "walks off" or "hands you" anything on a telephone. The call's own last word says it instead.
function favourAnswer(answer, phone) {
  const w = G.world, f = favourLive(w);
  if (!f || !FAVOUR_ANSWERS.includes(answer)) return false;
  const def = (typeof rivalDef === 'function') ? rivalDef(f.who) : null;
  const who = def ? shortRivalName(def) : 'They';
  if (answer === 'yes' || answer === 'nasty') {
    if (f.kind === 'cash') {
      if (G.money < FAVOUR_CASH) { play('denied'); toast('You do not have it to lend.', PAL.red); return false; }
      spend(FAVOUR_CASH);
    } else if (f.kind === 'thing') {
      const it = favourFindThing(f);
      if (!it) { play('denied'); toast('You do not have it any more.', PAL.red); return false; }
      const paid = Math.max(1, Math.round((it.val || 0) * (answer === 'yes' ? FAVOUR_THING_CHEAP : 1)));
      favourTakeThing(it); gain(paid);
      if (!phone) toast(answer === 'yes' ? who + ' hands you ' + fmt$(paid) + ' and takes it. "I will not forget it."'
        : 'Sold, at the full number: ' + fmt$(paid) + '. ' + who + ' is still expecting it Thursday.',
        answer === 'yes' ? PAL.cyan : PAL.orange, 4);
    } else if (f.kind === 'space' && answer === 'nasty') {
      const paid = FAVOUR_INTEREST + 40;
      gain(paid);
      if (!phone) toast('You sell it before the gate shuts. ' + fmt$(paid) + '. Thursday is Thursday.', PAL.orange, 4);
    } else if (f.kind === 'side' && answer === 'nasty') {
      const paid = (FAVOUR_INTEREST + 40) * 2;              // both of them pay you to stand at their end
      gain(paid);
      if (!phone) toast('Both of them think you are standing at their end. ' + fmt$(paid) + '.', PAL.orange, 4);
    }
  }
  if (f.kind === 'side') {
    const arc = duoArc(w);
    arc.sideAsked = G.day;
    if (answer === 'yes') { arc.side = f.who; if (!phone) toast(who + ' nods at you from their end of the row. The other one saw that.', PAL.cyan, 4); }
    else if (answer === 'nasty') { arc.side = f.who; arc.betrayed = true; }
    else if (answer === 'no') { arc.sideRefused = true; if (!phone) toast('"Suit yourself." They both hear you say it.', PAL.gray, 4); }
    else arc.sideHedged = true;
  }
  f.answer = answer;
  f.due = G.day + FAVOUR_DUE;
  f.lastDay = G.day;
  f.settled = false;
  if (G.today) G.today.favour = false;
  recordEvent('favour', { who: f.who, kind: f.kind, answer, day: G.day });
  play('ui_click', 0.6);
  if (phone) { /* the call's own closing line says it */ }
  else if (answer === 'maybe') toast(who + ' looks at you a second longer than is comfortable, and walks off.', PAL.gray, 4);
  else if (answer === 'no') toast(who + ' nods once. "Fair enough." It is not fair enough.', PAL.gray, 4);
  else if (answer === 'yes' && f.kind === 'space') toast('It is in the van. ' + FAVOUR_BULK + ' bulk, until Thursday.', PAL.cyan, 4);
  else if (answer === 'yes' && f.kind === 'cash') toast(fmt$(FAVOUR_CASH) + ' out of your pocket. Thursday.', PAL.cyan, 4);
  return true;
}
function favourFindThing(f) {
  const all = (G.stash || []).concat(G.keeps || []);
  return all.find((it) => it && it.uid === f.thingUid) || null;
}
function favourTakeThing(it) {
  for (const list of [G.stash, G.keeps]) { const i = list.indexOf(it); if (i >= 0) { list.splice(i, 1); return; } }
}
// Thursday. Everything lands here, days after you said it — never in the conversation.
function favourSettle(world) {
  const w = world || G.world;
  const f = favourState(w);
  if (!f.answer || f.settled || G.day < f.due) return;
  f.settled = true;
  f.settledDay = G.day;
  const a = f.answer;
  const def = (typeof rivalDef === 'function') ? rivalDef(f.who) : null;
  const who = def ? shortRivalName(def) : 'They';
  let bump = 0, say = null;
  if (a === 'yes') {
    bump = 2;
    if (f.kind === 'cash') { gain(FAVOUR_CASH); say = '"' + who + ' paid you back at the gate this morning, in front of everybody."'; }
    else if (f.kind === 'space') say = '"' + who + ' came for their box. They told the whole office you held it."';
    else say = '"' + who + ' has it on their own shelf now. They keep telling people where it came from."';
  } else if (a === 'maybe') {
    f.hedged = true;                       // they remember being made to wait
    say = '"' + who + ' sorted it out without you in the end. They mentioned that. Twice."';
  } else if (a === 'no') {
    bump = -1;
    say = '"' + who + ' asked somebody else. They got it done."';
  } else {
    bump = -3;
    if (f.kind === 'cash') { gain(FAVOUR_CASH + FAVOUR_INTEREST); say = '"' + who + ' paid your interest. They counted it out loud so the queue could hear."'; }
    else say = '"' + who + ' went looking for their thing this morning. It is a small yard."';
  }
  if (bump && typeof standingBump === 'function') standingBump(f.who, bump);
  f.say = say;
  recordEvent('favourDone', { who: f.who, kind: f.kind, answer: a, bump });
}
function favourOfficeLine() {
  const f = (G.world && G.world.arcs && G.world.arcs.favour) || null;
  if (!f || !f.say) return null;
  const s = f.say;
  f.say = null;
  return s;
}

// ---- a rival's own unit goes up (IDEAS_TODO 9; built 2026-09-16) ----
// The strongest idea on the list: the premise of the game, turned on somebody you know. One of the three doors
// is a RIVAL'S unit, up because they could not pay, and they are at the rope watching it - not bidding, because
// not being able to pay is why it is up. Merle's day is the template and proves the feeling works.
//   * RARE: once in a career, never recurring, from day RIVAL_UNIT_FROM, and only somebody you have HISTORY
//     with. Ed losing his unit means nothing in week one and a lot in week six.
//   * NEVER A LOOT PINATA: the contents are their trade's ordinary stuff, which is characterisation for free.
//     Bart is tools and a tyre, Ed is filing cabinets and paper, Dutch is tyres, Bev is boxes for the church.
//   * ONE THING IN THERE IS WORTH NOTHING AND STILL HURTS - a photograph, a first notebook, a dog's collar.
//     That is the hook, exactly like Merle's twenty-dollar trophy and Ed's notebook.
//   * IT STICKS: give the thing back (+3 and the office talks), keep the lot (-2, and standing mends slowly),
//     or stand back and let it go to somebody else (+1: they noticed you did not pile on).
const RIVAL_UNIT_FROM = 26, RIVAL_UNIT_CHANCE = 0.45;
const RIVAL_UNIT_KIT = {
  bart: { trade: ['toolbox', 'wrench', 'drill', 'tire', 'barrel', 'workbench'],
    personal: { base: 'teddy', name: 'A photograph of a truck, framed', val: 6, cond: 'Worn',
      note: 'Two men and a flatbed, 1979. One of them is a boy, and he is the one holding the keys.' },
    rope: '"That is my unit." Bart says it once, to nobody in particular, and then does not say anything else.' },
  ed: { trade: ['filing', 'filing', 'boxLarge', 'paper', 'typewriter', 'officeChair'],
    personal: { base: 'diary', name: "Ed's first notebook", val: 5, cond: 'Worn',
      note: 'Unit numbers and prices in a younger hand. The first page says 1988. The last page is not full.' },
    rope: 'Eagle Ed stands at the rope with his hands behind his back and reads the row like it is anybody\'s door.' },
  dutch: { trade: ['tire', 'tire', 'tire', 'barrel', 'toolbox', 'wrench'],
    personal: { base: 'teddy', name: "A dog's collar, tag worn smooth", val: 4, cond: 'Worn',
      note: 'The name has gone off the tag. Dutch knows what it said.' },
    rope: 'Dutch does not yip. The whole yard notices that he does not yip.' },
  bev: { trade: ['boxLarge', 'box', 'boxSmall', 'china', 'crate', 'boxWardrobe'],
    personal: { base: 'paper', name: 'Forty church-sale receipts, rubber-banded', val: 3, cond: 'Worn',
      note: 'Every one signed by the Reverend. The top one is dated last spring.' },
    rope: 'Boxcar Bev has her clipboard with her. She is not writing anything on it.' },
  pruitt: { trade: ['barrel', 'tire', 'crate', 'toolbox', 'wrench', 'mattress'],
    personal: { base: 'medal', name: 'A scale-house medal, 1991', val: 6, cond: 'Worn',
      note: '"Most Accurate." Pruitt has mentioned this exactly once, years ago, to somebody else.' },
    rope: 'Pruitt licks his thumb out of habit, looks at what he is doing, and puts his hand in his pocket.' },
  vera: { trade: ['mirror', 'painting', 'vase', 'trunk', 'china', 'rugRolled'],
    personal: { base: 'paper', name: "A buyer's letter", val: 3, cond: 'Worn',
      note: '"Do not sell this one, darling. Not ever." It is not signed, and it is not about a chair.' },
    rope: 'Velvet Vera watches from the shade with her sunglasses on. She does not take them off.' },
};
const RIVAL_WATCH = {
  you: ['{name} watches you put your paddle up, and says nothing at all.', '{name} is looking at the door. Only at the door.',
    '{name} does the sum in their head while you bid. You can see them do it.'],
  rival: ['{name} watches somebody else bid on their own tyres.', '{name} counts the bids. {name} has always counted.',
    'Somebody at the rope says "rough luck" to {name}. {name} does not answer.'],
  sold: ['{name} is already walking towards the truck.', '"Right," {name} says, to the gate rather than to anybody.'],
};
function rivalUnitArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.rivalUnit = w.arcs.rivalUnit || {}); }
// how much history you have with somebody, and it has to be DURABLE. Standing is the wrong measure on its
// own: it mends a point every STANDING_MEND_DAYS, so a door you stole from Bart in week one has healed to
// nothing by week five and he would never qualify. The event log is what actually remembers - every door you
// took off them, every one you let them have, every run-up, every favour asked and answered.
function rivalHistoryWith(id) {
  const w = G.world;
  if (!w) return 0;
  let n = Math.abs(typeof standingOf === 'function' ? standingOf(id) : 0);
  for (const e of w.events || []) {
    if (e.rival === id || e.who === id || e.other === id || (e.against && e.against.indexOf(id) >= 0)) n++;
  }
  return n;
}
// somebody you have history with, good or bad, who is in town and has a kit
function rivalUnitWhoFor(w, day) {
  const town = (typeof TOWNS !== 'undefined' && TOWNS[w.town]) || {};
  const roster = (typeof NPCS !== 'undefined' ? NPCS.map((n) => n.id) : []).concat(town.rivals || []);
  const pool = Object.keys(RIVAL_UNIT_KIT).filter((id) => roster.includes(id)
    && !(typeof awayOn === 'function' && awayOn(id, w, day))
    && rivalHistoryWith(id) >= 2);
  if (!pool.length) return null;
  // the one you have the most history with, either way
  pool.sort((a, b) => rivalHistoryWith(b) - rivalHistoryWith(a) || (a < b ? -1 : 1));
  return pool[0];
}
function rivalUnitOn() {
  const a = (G.world && G.world.arcs && G.world.arcs.rivalUnit) || null;
  return !!(a && a.doorDay === G.day && !a.doneDay);
}
function rivalUnitCanGive() {
  const a = (G.world && G.world.arcs && G.world.arcs.rivalUnit) || null;
  return !!(a && a.doorDay === G.day && !a.gave && !a.doneDay && G.cur && G.cur.rivalUnit);
}
function rivalUnitTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today || !G.today.lockers) return;
  const arc = rivalUnitArc(w);
  if (arc.doneDay) return;
  if (arc.doorDay != null) {
    if (G.day <= arc.doorDay) return;
    // the morning after: what you did decides what it was worth
    const evs = w.events || [];
    const won = evs.some((e) => e.k === 'won' && e.unit === arc.unit);
    arc.outcome = arc.gave ? 'gaveBack' : (won ? 'kept' : 'stoodBack');
    arc.doneDay = G.day; arc.say = 'done_' + arc.outcome;
    const bump = arc.outcome === 'gaveBack' ? 3 : (arc.outcome === 'kept' ? -2 : 1);
    if (typeof standingBump === 'function') standingBump(arc.who, bump);
    recordEvent('rivalUnitDone', { rival: arc.who, unit: arc.unit, outcome: arc.outcome, bump });
    return;
  }
  if (G.day < RIVAL_UNIT_FROM) return;
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
  if (G.today.reason) return;                                    // a story already has this morning: another day
  if (!RNG(strHash('rivalunit_' + (G && G.worldSeed) + '_' + G.day)).chance(RIVAL_UNIT_CHANCE)) return;
  const who = rivalUnitWhoFor(w, G.day);
  if (!who) return;
  // never a door that is already somebody's story: emptying it would orphan a persona's kit or a plant
  const doors = G.today.lockers.filter((lk) => !lk.won && !lk.sold && !lk.story && !lk.rare && !lk.opening && !lk.seededLegend
    && !lk.pair && !lk.edNotebook && !lk.format && !lk.reason && !lk.persona && !lk.provPlant && !lk.tenantDoor && !lk.yourUnit);
  if (!doors.length) return;
  const R = dayR('rivalunit');
  const lk = R.pick(doors);
  const kit = RIVAL_UNIT_KIT[who];
  // their trade, and nothing else. This is characterisation, not a prize.
  lk.items = [];
  const cols = lk.cols || 8;
  let col = 0;
  for (const base of kit.trade) {
    const it = makeItem(base, R);
    it.layer = col < cols ? 2 : 1; it.col = col % cols; it.wCols = Math.max(1, it.wCols || 1);
    lk.items.push(it); col++;
  }
  // the one that is worth nothing and still hurts, kept out of the front row so the peek cannot cheapen it
  const p = makeItem(kit.personal.base, R);
  p.layer = 1; p.col = (col + 1) % cols; p.wCols = 1;
  p.name = kit.personal.name; p.preName = null; p.hideBrand = false;
  p.val = kit.personal.val; p.cond = kit.personal.cond; p.note = kit.personal.note;
  p.theirs = who;
  lk.items.push(p);
  lk.value = lk.items.reduce((a, x) => a + (x.val || 0), 0);
  // to the TOWN's step, not to 25: Marrow Creek bids in 50s and a door has to open on a number the room can say
  const stepU = curTown().bidStep || 25;
  lk.minBid = Math.max(stepU, Math.round((lk.value * 0.25) / stepU) * stepU);
  lk.rivalUnit = who;
  lk.owner = (rivalDef(who) ? rivalDef(who).name : who) + ', until the rent ran out';
  lk.flavor = 'Everybody at the rope knows whose this is. Nobody says it.';
  lk.flavor2 = null; lk.setPeek = null; lk.doorTell = null; lk.photoBase = null; lk.certBase = null; lk.letterName = null;
  lk.persona = null; lk.provPlant = null; lk.mirrorUid = null;   // whatever this door used to be, it is theirs now
  lk.reason = { kind: 'rivalUnit', unit: lk.num, rival: who };
  G.today.reason = lk.reason;
  arc.doorDay = G.day; arc.unit = lk.num; arc.who = who; arc.town = w.town; arc.say = 'here';
  // IDEAS_TODO 7: if you have been good to them they ask you to take it and hold it. If you crossed them, they just watch.
  arc.asked = (typeof standingOf === 'function' && standingOf(who) >= 1);
  recordEvent('rivalUnitUp', { rival: who, unit: lk.num });
}
// give the thing back, across the yard, the way you can with Ed's notebook
function rivalUnitGive(it) {
  if (!it || !it.theirs || !rivalUnitCanGive()) return;
  const arc = rivalUnitArc(G.world);
  arc.gave = it.uid; arc.gaveName = it.name;
  G.inspect = null;                                              // it goes back to them, not into the van
  const d = rivalDef(arc.who);
  recordEvent('rivalUnitGave', { rival: arc.who, unit: G.cur ? G.cur.num : 0, name: it.name });
  toast((d ? shortRivalName(d) : 'They') + ' takes it in both hands and does not say thank you. They will.', PAL.cyan, 4.5);
  play('ui_click', 0.6);
}
function rivalUnitOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.rivalUnit) || null;
  if (!arc || !arc.say) return null;
  const k = arc.say;
  arc.say = null;
  const d = rivalDef(arc.who);
  const name = d ? d.name : 'A regular';
  const short = d ? shortRivalName(d) : 'They';
  if (k === 'here') return arc.asked
    ? '"' + name + ' could not pay. That is their unit on the row. They asked me to tell you they would rather it was you than anybody else."'
    : '"' + name + ' could not pay. That is their unit on the row, and they are standing right there. We do not make the rules, we just cut the locks."';
  if (k === 'done_gaveBack') return '"' + short + ' came in at seven to tell me what you did. Then they told the man behind them. The whole queue knows."';
  if (k === 'done_kept') return '"' + short + ' has not been in this morning. They have never not been in."';
  return '"' + short + "'s unit went to somebody else. They noticed who did not bid. People do.\"";
}
// a paddle just landed and the person whose unit it is, is standing right there
function rivalUnitWatch(au, l) {
  const arc = (G.world && G.world.arcs && G.world.arcs.rivalUnit) || null;
  if (!arc || !G.cur || !G.cur.rivalUnit) return;
  const t = au.watch = au.watch || { n: 0, last: -9 };
  const k = t.n;
  const R = RNG(strHash('watch' + G.worldSeed + '_' + G.day + '_' + (G.cur ? G.cur.num : 0) + '_' + k));
  if (t.n >= 6) return;
  if (t.n > 0 && !R.chance(0.5)) return;
  const d = rivalDef(arc.who);
  const nm = d ? shortRivalName(d) : 'They';
  const pool = l.sfx === 'sold' || l.sfx === 'lose' ? RIVAL_WATCH.sold : (l.sfx === 'pbid' ? RIVAL_WATCH.you : RIVAL_WATCH.rival);
  t.n++;
  au.queue.unshift({ text: R.pick(pool).replace(/\{name\}/g, nm), col: PAL.dgray, sfx: 'aside', npcId: arc.who, heckle: true, showBid: l.showBid, showLeader: l.showLeader });
}

// ---- a rival with something to get done (IDEAS_TODO 2's first bullet; built 2026-09-16) ----
// The rivals already NEED single doors (RIVAL_NEEDS, one morning at a time). This is the long version of the
// same idea: one face in town is working towards something over a FORTNIGHT, and what you do at the rope in
// those two weeks either helps them get there or stops them.
//   * It is read entirely off the event log, the way the duo's week apart is - no new bookkeeping at the rope.
//     A door they win is a step. A door you stand back on when they needed it is worth two, because standing
//     back costs you something. A door you take off them (you led, they led first and lost it) sets them back.
//   * You are never told to help. The office says what they are trying to do and the rest is your business.
//   * It pays off IN THE PAPER, which is what the bullet asked for: the morning after the deadline the
//     Shopper prints whether they made it, and the yard reads the same story you do.
// One per career, from day GOAL_FROM, never in a demo world, and only somebody who still speaks to you.
const GOAL_FROM = 12, GOAL_DAYS = 12, GOAL_TARGET = 4;
const RIVAL_GOALS = {
  bev: { what: 'forty boxes for the church sale', short: 'the church sale' },
  pruitt: { what: 'a full load for the smelter', short: 'the smelter load' },
  dutch: { what: 'the back rent on the tyre shop', short: 'the tyre shop' },
  vera: { what: 'an order for her buyer in the city', short: 'the city order' },
  dee: { what: 'chairs enough for the Sunday supper', short: 'the Sunday supper' },
  cobb: { what: 'a workbench fit to sell', short: 'the workbench' },
  bart: { what: 'the money for a second truck', short: 'the second truck' },
  hattie: { what: 'a story the paper will actually run', short: 'her story' },
};
const GOAL_FACES = Object.keys(RIVAL_GOALS);
function goalArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.rivalGoal = w.arcs.rivalGoal || {}); }
function goalLive(world, day) {
  const a = (world || G.world) && ((world || G.world).arcs || {}).rivalGoal;
  const d = day == null ? G.day : day;
  return !!(a && a.day != null && !a.doneDay && d >= a.day && d < a.day + GOAL_DAYS) ? a : null;
}
// how they are getting on, counted off the log rather than tracked at the rope
function goalTally(w, arc) {
  let step = 0, helped = 0, spoiled = 0;
  for (const e of w.events || []) {
    if (e.day < arc.day || e.day >= arc.day + GOAL_DAYS) continue;
    if (e.k === 'letHaveIt' && e.rival === arc.who) { step += 2; helped++; }
    else if (e.k === 'lost' && e.rival === arc.who) step += 1;
    else if (e.k === 'won' && (e.fought || []).indexOf(arc.who) >= 0) { step -= 1; spoiled++; }
  }
  return { step, helped, spoiled };
}
function goalProgress() {
  const arc = goalLive(G.world);
  if (!arc) return null;
  const t = goalTally(G.world, arc);
  return { who: arc.who, what: RIVAL_GOALS[arc.who].what, step: t.step, target: GOAL_TARGET,
    left: Math.max(0, (arc.day + GOAL_DAYS) - G.day) };
}
function rivalGoalTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today) return;
  const arc = goalArc(w);
  if (arc.doneDay) return;
  if (arc.day != null) {
    if (G.day < arc.day + GOAL_DAYS) return;
    // the deadline. What you did about it over the fortnight is the story.
    const t = goalTally(w, arc);
    arc.step = t.step; arc.helped = t.helped; arc.spoiled = t.spoiled;
    arc.made = t.step >= GOAL_TARGET;
    arc.doneDay = G.day;
    arc.say = arc.made ? 'made' : 'missed';
    let bump = 0;
    if (arc.made && t.helped) bump = 2;                       // you stood back for them, more than once
    else if (arc.made) bump = 1;
    else if (t.spoiled >= 2) bump = -2;                       // you took doors off them and they did not get there
    else if (t.spoiled) bump = -1;
    if (bump && typeof standingBump === 'function') standingBump(arc.who, bump);
    recordEvent('rivalGoalDone', { who: arc.who, made: arc.made, step: t.step, helped: t.helped, spoiled: t.spoiled });
    return;
  }
  if (G.day < GOAL_FROM) return;
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
  const town = (typeof TOWNS !== 'undefined' && TOWNS[w.town]) || {};
  const roster = (typeof NPCS !== 'undefined' ? NPCS.map((n) => n.id) : []).concat(town.rivals || []);
  const pool = GOAL_FACES.filter((id) => roster.indexOf(id) >= 0
    && !(typeof awayOn === 'function' && awayOn(id, w, G.day))
    && (typeof standingOf !== 'function' || standingOf(id) > -3));
  if (!pool.length) return;
  const who = RNG(strHash('goal_' + (G && G.worldSeed) + '_' + w.town)).pick(pool);
  // no event when they set out: the office line announces it, and a second brief competing for the morning's
  // three slots pushes a format's own story off the page. What the paper is for here is the PAYOFF.
  arc.who = who; arc.day = G.day; arc.town = w.town; arc.say = 'start';
}
function rivalGoalOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.rivalGoal) || null;
  if (!arc || !arc.say) return null;
  const k = arc.say;
  arc.say = null;
  const d = (typeof rivalDef === 'function') ? rivalDef(arc.who) : null;
  const name = d ? d.name : 'A regular';
  const short = d ? shortRivalName(d) : 'They';
  const g0 = RIVAL_GOALS[arc.who] || { what: 'something' };
  if (k === 'start') return '"' + name + ' is trying to put together ' + g0.what + ' before the month is out. They have been in here every morning asking what is on the row."';
  if (k === 'made') return arc.helped
    ? '"' + short + ' got there. They made a point of telling me you stood back on a couple, and they are not a person who says that sort of thing."'
    : '"' + short + ' got there in the end, with no help from anybody. They mentioned that too."';
  return arc.spoiled
    ? '"' + short + ' did not get there. They have a list of the doors that went elsewhere, and they know who took them."'
    : '"' + short + ' did not get there. Short by a couple. It happens, and it is nobody\'s fault, and they do not believe that either."';
}

// ---- Channel 9 wants a word: the interview (the beat sheet's day 15; built 2026-09-15) ----
// Day 15 (or the first morning after, outside the opening): the Channel 9 van is at the gate (office line), and the yard
// opens on a one-card interview before anything else. What you say is what the yard calls you for a week, whatever your
// last ten doors say (yardName reads the TV name first): WHALE ("I pay what it takes": the room runs you up and doors open
// a step higher, but the specialists who saw it pay a tenth more), SHARK ("I only buy steals": rivals fold a little
// earlier, doors open a step higher), or NOBODY ("I just like doors": no name at all for the week, even one you earned).
// The next morning's paper quotes you, and Buzz calls you the TV star in the first room. Once per world; never in a demo.
const INTERVIEW_DAY = 15, INTERVIEW_DAYS = 7, TV_WHALE_BUYERS = 1.1;
const REPORTER = { name: 'Dana Bixby', short: 'Dana' };
const INTERVIEW_ANSWERS = [
  { name: 'whale', say: 'I PAY WHAT IT TAKES', hint: 'the room runs you up, doors open higher, buyers pay a tenth more', col: 'blue' },
  { name: 'shark', say: 'I ONLY BUY STEALS', hint: 'rivals fold earlier, doors open a step higher', col: 'red' },
  { name: 'nobody', say: 'I JUST LIKE DOORS', hint: 'no name at all this week, even one the yard already gave you', col: 'slate' },
];
function interviewArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.interview = w.arcs.interview || {}); }
// the name you gave Channel 9, while it lasts: 'whale', 'shark', 'nobody', or null
function tvNameNow() {
  const t = G.world && G.world.rivalMem && G.world.rivalMem.tvName;
  return (t && G.day >= t.from && G.day <= t.until) ? t.name : null;
}
// the morning (startDay): the van comes once; a reload the same morning asks again until you answer
function interviewTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today) return;
  const arc = interviewArc(w);
  if (arc.day != null) { if (arc.day === G.day && !arc.answer) G.today.interview = true; return; }
  if (G.day < INTERVIEW_DAY) return;
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
  arc.day = G.day; arc.say = 'van';
  G.today.interview = true;
}
function interviewAnswer(name) {
  const arc = interviewArc(G.world);
  if (arc.answer || !INTERVIEW_ANSWERS.some((x) => x.name === name)) return;
  arc.answer = name;
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  mem.tvName = { name, from: G.day, until: G.day + INTERVIEW_DAYS - 1 };
  if (G.today) G.today.interview = false;
  if (G.officeText && /Channel 9 van/.test(G.officeText)) G.officeText = '"Dana Bixby got her quote. The van is gone. The yard is already saying it back to you."';   // the board moves on
  recordEvent('tvInterview', { answer: name });
  toast(name === 'nobody' ? 'Dana thanks you for your time. She will not be using any of it.' : 'Dana says it runs tonight. The whole county will have an opinion.', PAL.cyan, 4);
  play('ui_click', 0.6);
}
function interviewOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.interview) || null;
  if (!arc || arc.say !== 'van') return null;
  arc.say = null;
  return '"The Channel 9 van is parked by the gate. Dana Bixby wants a word with you. Whatever you tell her, the yard will be saying it back to you all week."';
}
// ---- the first spite war (the beat sheet's day 3; built 2026-09-15) ----
// From day 3 (the dealt opening week included): the first door you walk into that has no story of its own, Spite Sal
// walks over from wherever he was and goes to war on you, not on the door (spiteWarArm, in startAuction). His own number
// stays small; his spite number goes well past it (four times the opening, or 1.6 times what the door shows, inside his
// wallet), and while it lasts he answers every paddle of yours (npcWants). The first time he answers, the log says what he
// is doing and how to beat him. It only counts once you bid; a door you never bid on leaves the war for the next one. The
// hammer settles it (spiteWarSettle): salStuck (you stopped, and he owns a door he never wanted, past his own number; it was
// his war, so it costs you no standing with him), youPaid (you won it at his price), or salQuit (somebody else took it).
// That night the drive home holds on what the diner said; the next morning's paper has it; Sal brings it up in the room.
// Once per world; never in a demo world.
const SPITE_WAR_DAY = 3;
const SPITE_WAR_TELL = 'Sal is not bidding on the door. He is bidding on you. Stop, and he owns it at his own price.';
function spiteWarArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.spiteWar = w.arcs.spiteWar || {}); }
function spiteWarReady() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || G.day < SPITE_WAR_DAY) return false;
  return !spiteWarArc(w).day;
}
// the door you just walked into: Sal comes over, whatever is behind it
function spiteWarArm(au) {
  const lk = G.cur;
  if (!au || !lk || lk.reason || lk.story || lk.rare || lk.tenantDoor || lk.edNotebook || lk.format) return false;
  const sal = au.npcs.find((n) => n.def.id === 'sal' && !n.crowd);
  if (!sal || (sal.budgetCap || 0) < (lk.minBid || 0) * 3) return false;       // he cannot afford a war today
  sal.active = true; sal.broke = false; sal.folded = false; sal.spiteWar = true;
  sal.spiteCap = Math.min(sal.budgetCap, Math.max(sal.spiteCap || 0, Math.round((lk.minBid || 0) * 4), Math.round(visibleValue(lk) * 1.6)));
  sal.cap = Math.min(sal.cap, Math.round(sal.spiteCap * 0.5));                   // he does not want the door
  au.spiteWar = { answered: 0, told: false, said: false };
  return true;
}
function spiteWarSettle(outcome, price) {
  const arc = spiteWarArc(G.world);
  if (arc.day) return;
  arc.day = G.day; arc.outcome = outcome; arc.unit = G.cur ? G.cur.num : 0; arc.price = price;
  recordEvent('spiteWar', { unit: arc.unit, outcome, paid: price });
}
// the drive home, that night
function spiteWarDinerLine(war) {
  const u = war.unit;
  if (war.outcome === 'salStuck') return 'At the diner, Sal told everybody he meant to buy unit ' + u + '. Nobody believed him. The pie was on him.';
  if (war.outcome === 'youPaid') return 'The diner heard you paid Sal\'s price for unit ' + u + '. Most of the opinions were about Sal. Not all of them.';
  return 'The diner says Sal quit on unit ' + u + ' before you did. Sal says he got bored. Sal does not get bored.';
}
RIVAL_GOSSIP.spiteWar = { who: ['sal'], lines: { sal: ['"Round two, whenever you like." Sal, cheerfully, about unit {u}.', 'Sal waves at you with his paddle. It is not a friendly wave. It is a little friendly.'] } };

// ---- the clerk's warning (the beat sheet's day 6; built 2026-09-15) ----
// Day 6 (or the first morning after, never on an opening day, and only before Big Bart's truck goes in the shop): the yard
// opens on a one-card scene at the office window. The clerk has heard Bart asking about your number: what you buy, what you
// pay. For three days Bart comes out to your doors (join at least 0.75) with a little spite in his number (0.4); his Ledger
// card says he is asking about you, and his gossip says so. The day after, his truck comes in smoking. Once per world;
// never in a demo world.
const CLERK_WARN_DAY = 6, CLERK_WARN_DAYS = 3;
function clerkWarnArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.clerkWarn = w.arcs.clerkWarn || {}); }
function bartAskingNow(world, day) { const m = world && world.rivalMem; return !!(m && (m.bartAskingUntil || 0) >= day); }
// the morning (startDay, after Bart's truck, so a world that is already past it never hears the warning)
function clerkWarnTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today) return;
  const arc = clerkWarnArc(w);
  if (arc.day != null) { if (arc.day === G.day && !arc.seen) G.today.clerkWarn = true; return; }
  if (G.day < CLERK_WARN_DAY) return;
  const bArc = w.arcs && w.arcs.bartTruck;
  if (bArc && bArc.shopDay != null) { arc.day = -1; return; }                  // too late: his week in the shop says it louder
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
  arc.day = G.day;
  G.today.clerkWarn = true;
  const mem = w.rivalMem = w.rivalMem || {};
  mem.bartAskingUntil = G.day + CLERK_WARN_DAYS - 1;
  recordEvent('clerkWarning', {});
}
function clerkWarnSeen() {
  clerkWarnArc(G.world).seen = true;
  if (G.today) G.today.clerkWarn = false;
  play('ui_click', 0.5);
}
RIVAL_GOSSIP.clerkWarning = { who: ['bart'], lines: { bart: ['"Heard you\'ve been doing all right." Bart looks at your van like he is pricing it.', '"What\'d you give for that last one? Just asking." Bart is not just asking.'] } };
// ---- the storm (the beat sheet's day 21; built 2026-09-15) ----
// Day 21 (or the first morning after, never on an opening day): rain over the yard all day. The paper warned of it that
// morning (event `storm`), and the office says half the regulars called in wet. Every door still on the row opens at 60%
// of its dry number, to the bid step (stormTick, again on a reload: the row is dealt fresh); in the room every named rival
// is half as likely to have come out and the crowd's number is halved (prepNpcsForAuction); every pull in the mud costs one
// more energy (pullCost). The yard, the peek, the room and the dig draw rain (drawRain), amb_rain replaces the town's loop
// when there is one, and Buzz has a word for whoever came. Ed's notebook can turn up the same morning: applyNeed still
// brings him. Once per world; never in a demo world.
const STORM_DAY = 21, STORM_OPEN = 0.6, STORM_JOIN = 0.5;
function stormArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.storm = w.arcs.storm || {}); }
function stormOn(world, day) { const a = world && world.arcs && world.arcs.storm; return !!(a && a.day > 0 && a.day === day); }
function stormNow() { return !!G.world && stormOn(G.world, G.day); }
function stormTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today || !G.today.lockers) return;
  const arc = stormArc(w);
  if (arc.day != null && arc.day !== G.day) return;
  if (arc.day == null) {
    if (G.day < STORM_DAY) return;
    if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
    arc.day = G.day; arc.say = 'storm';
    recordEvent('storm', { day: G.day - 1 });                    // the county warned of it last night: this morning's paper has it
  }
  const step = (TOWNS[w.town] || {}).bidStep || 25;
  for (const lk of G.today.lockers) {
    if (lk.won || lk.sold || lk.stormCheap) continue;
    lk.dryMinBid = lk.minBid;
    lk.minBid = Math.max(step, Math.round((lk.minBid || 0) * STORM_OPEN / step) * step);
    lk.stormCheap = true;
  }
  G.today.storm = true;
}
function stormOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.storm) || null;
  if (!arc || arc.say !== 'storm') return null;
  arc.say = null;
  if (arc.day !== G.day) return null;                              // a board that was busy that morning does not talk about yesterday's rain
  return '"Half the regulars called in wet. The office knocked every opening down. Mind the mud out there: every pull takes longer."';
}
// ---- Buzz's holiday (the beat sheet's day 28; built 2026-09-15) ----
// Day 28 (or the first morning after, never on an opening day): the paper has Buzz Kettleman's first holiday in eleven
// years, and the office says he has been practising a speech. At the first sale where Buzz has the gavel that day or after
// (a gavel town like Bent Fork waits), he says a word about you to the whole room before the bidding (buzzSpeechLines):
// the two biggest things the month did, in order (a legend out of the dark, Merle's trophy, Ed's notebook, the spite war,
// Bart's truck week, the duo's split, what you told Channel 9, the name the yard gave you), and how many doors you won.
// Then he is away seven days: every sale he would have called goes to the Reverend Lyle Pettibone (curAuctioneer), who
// uses the same recorded bank. His first room back, he says so. Once per world; never in a demo world.
const HOLIDAY_DAY = 28, HOLIDAY_DAYS = 7;
function holidayArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.buzzHoliday = w.arcs.buzzHoliday || {}); }
function buzzAwayOn(world, day) { const a = world && world.arcs && world.arcs.buzzHoliday; return !!(a && a.speechDay > 0 && day > a.speechDay && day <= a.speechDay + HOLIDAY_DAYS); }
function buzzAwayNow() { return !!G.world && buzzAwayOn(G.world, G.day); }
function holidayTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today) return;
  const arc = holidayArc(w);
  if (arc.day != null || G.day < HOLIDAY_DAY) return;
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
  arc.day = G.day; arc.say = 'holiday';
  recordEvent('buzzHolidayNews', { day: G.day - 1 });              // the paper had it this morning
}
function holidayOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.buzzHoliday) || null;
  if (!arc || arc.say !== 'holiday') return null;
  arc.say = null;
  if (arc.day !== G.day) return null;
  return '"Buzz is taking a week off after today. He has been practising a speech at the coffee machine since seven. It is about you."';
}
// the month, as the gavel saw it: an opener, the two biggest things, and the doors
function buzzSpeechLines() {
  const w = G.world, arcs = w.arcs || {}, facts = [];
  const out = (k, v) => arcs[k] && arcs[k].outcome === v;
  if ((G.foundLegends || []).length) facts.push('"This one pulled a real legend out of the dark. I have been up here eleven years. I have seen two."');
  if (out('tenant', 'soldBack')) facts.push('"This is the one who sold Merle Tuttle his bowling trophy back for twenty dollars. Merle cried. I cried. Sal did not cry."');
  if (out('edNotebook', 'returned')) facts.push('"This is the one who gave Eagle Ed his notebook back. Ed told me himself. Ed does not tell me things."');
  if (out('edNotebook', 'kept')) facts.push('"This is the one who kept Eagle Ed\'s notebook. Ed has not blinked since. Do not stand near Ed."');
  if (arcs.spiteWar && arcs.spiteWar.outcome === 'salStuck') facts.push('"This is the one who let Spite Sal buy a door he did not want. Sal still has it. Sal visits it."');
  if (arcs.spiteWar && arcs.spiteWar.outcome === 'youPaid') facts.push('"This is the one who paid Sal\'s price rather than back down. I respect it. I do not understand it."');
  if (out('bartTruck', 'helped')) facts.push('"Big Bart says this one did him a kindness the week his truck was in the shop. Bart had never said kindness out loud. It took him three tries."');
  if (out('bartTruck', 'crossed')) facts.push('"This is the one who took a door off Big Bart the week he was walking. Bart has not forgotten. Bart has a list."');
  if (out('duoSplit', 'united')) facts.push('"Cody and Kaylee got back together over this one. Not in a good way. They agree about exactly one thing now."');
  if (out('duoSplit', 'thanks')) facts.push('"Cody and Kaylee want it known this one stayed out of their business. Kaylee made a card. Cody signed it."');
  const tv = arcs.interview && arcs.interview.answer;
  if (tv === 'whale') facts.push('"On Channel 9 this one said they pay what it takes. The whole yard wrote that down. So did I."');
  if (tv === 'shark') facts.push('"On Channel 9 this one said they only buy steals. Half this room has been counting their change since."');
  const yn = typeof yardName === 'function' ? yardName() : null;
  if (yn === 'whale') facts.push('"All month this one has paid what it takes. Every one of you has a new truck payment because of it."');
  if (yn === 'shark') facts.push('"All month this one has not paid full price for a single door. I have checked. I am a little afraid."');
  const won = countEvents('won', { sinceDay: G.day - 27 });
  if (!facts.length) facts.push(won >= 5 ? '"A month ago nobody knew this one\'s name. Now nobody in this yard can stop saying it. Mostly Sal."'
    : '"This one has stood at the back all month, not bidding much, watching. I see you. I see everything from up here."');
  const lines = ['"Folks, before we start. After today I am taking a week off, my first in eleven years. First I want to say a word about somebody."'];
  lines.push(facts[0]);
  if (facts[1]) lines.push(facts[1]);
  lines.push('"' + (won ? won + (won === 1 ? ' door' : ' doors') + ' this month.' : 'Not one door this month, and I admire the patience.') + ' Be kind to the Reverend while I am gone. He is slower than me. Everyone is."');
  return lines;
}
// startAuction: the speech at the first room Buzz calls on or after the day, and the word when he is back
function holidayRoomLines(au) {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !au) return;
  const arc = holidayArc(w);
  if (!(arc.day > 0)) return;
  const buzz = curAuctioneer().id === 'default';
  if (!arc.speechDay && G.day >= arc.day && buzz) {
    arc.speechDay = G.day;
    const lines = buzzSpeechLines();
    for (let i = 0; i < lines.length; i++) au.queue.push({ text: 'Buzz: ' + lines[i], col: PAL.orange, sfx: 'aside', npcId: i === 0 ? 'buzz' : undefined, pop: i === 0 ? { kind: 'arc', caption: "BUZZ'S LAST DAY" } : undefined, showBid: 0, showLeader: null });
    recordEvent('buzzHoliday', { lines: lines.length });
    return;
  }
  if (arc.speechDay && G.day > arc.speechDay + HOLIDAY_DAYS && !arc.backSaid && buzz) {
    arc.backSaid = G.day;
    au.queue.push({ text: 'Buzz, tanned: "Did you miss me? Do not answer that. The Reverend told me everything, slowly."', col: PAL.orange, sfx: 'aside', showBid: 0, showLeader: null });
  }
}
// ---- the weekly bill: the shed, the bidder number, the gas card. Money only. Paid on time, the office
// owes you a favour. Missed, the van goes in the shop (a row less) and favours wait until you pay.
const NUT_EVERY = 7, NUT_ROW = 10, FAVOUR_MAX = 3;
function nutAmount(day) { return Math.min(300, 80 + 20 * Math.floor(day / NUT_EVERY)); }
function nutDueDay(day) { return Math.ceil(Math.max(day, 1) / NUT_EVERY) * NUT_EVERY; }
function favoursNow() { const w = G.world; return w.favours == null ? 1 : w.favours; }
function vanBaseCap() { return G.vanCap + ((G.world && G.world.nut && G.world.nut.lostRow) || 0); }
// the night of every seventh day (advanceDay, before the date turns). Returns a line for the morning, or null.
function weeklyBill() {
  if (G.day < NUT_EVERY || G.day % NUT_EVERY !== 0) return null;
  if (typeof yardOwned === 'function' && yardOwned()) return null;       // the yard pays its own bills now
  const w = G.world, amt = nutAmount(G.day);
  if (w.nut) {
    w.nut.owed += amt;
    bump('nutMissed');
    recordEvent('nutMissed', { amt, owed: w.nut.owed });
    return { text: 'Another week on the bill: you owe the office ' + fmt$(w.nut.owed) + '. The van stays in the shop.', col: PAL.red };
  }
  if (G.money >= amt) {
    spend(amt);
    w.favours = Math.min(FAVOUR_MAX, favoursNow() + 1);
    bump('nutPaid');
    recordEvent('nutPaid', { amt });
    return { text: 'The weekly bill: -' + fmt$(amt) + ' (the shed, the number, the gas card). Paid on time. The office owes you one.', col: PAL.green };
  }
  const lost = Math.min(NUT_ROW, Math.max(0, G.vanCap - 20));
  G.vanCap -= lost;
  w.nut = { owed: amt, since: G.day, lostRow: lost };
  bump('nutMissed');
  recordEvent('nutMissed', { amt, owed: amt });
  return { text: 'You could not cover the ' + fmt$(amt) + ' weekly bill. The van is in the shop: ' + lost + ' bulk less until you pay at the office.', col: PAL.red };
}
function payNut() {
  const w = G.world;
  if (!w.nut || G.money < w.nut.owed) { play('denied'); return false; }
  spend(w.nut.owed);
  G.vanCap += w.nut.lostRow || 0;
  w.nut = null;
  play('coin');
  toast('Paid. The van is back, all of it. The clerk does not say "finally." He thinks it.', PAL.green, 3.4);
  return true;
}
// the paper runs a notice the two mornings before the bill comes due
function nutBrief(day, world) {
  if (day < NUT_EVERY - 1 || (world && world.yard && world.yard.owned)) return null;
  const due = nutDueDay(day);
  if (due - day > 1) return null;
  return 'NOTICE: the weekly bill (the shed, the bidder number, the gas card) comes due the night of day ' + due + ': ' + fmt$(nutAmount(due)) + '. The office does not take IOUs.';
}
function bookDoor(net, unit, name) {
  const c = careerBook();
  const rec = { net, unit, name, town: G.world.town, day: G.day };
  if (!c.best || net > c.best.net) c.best = rec;
  if (!c.worst || net < c.worst.net) c.worst = rec;
}
function topOf(map) {
  let best = null, bn = 0;
  for (const k in map) if (map[k] > bn) { bn = map[k]; best = k; }
  return best ? { id: best, n: bn } : null;
}

// ============ for the record ============
// About two dozen things worth writing down once. Predicates over the log
// and the books; nothing counts toward a thousand. Six are not listed until
// they happen. One toast, then a line on THE BOOKS page. That is all.
const ACHIEVEMENTS = [
  { id: 'firstDoor', name: 'Your first door', line: 'It was not empty. That is all anyone asks.', test: () => countEvents('won') >= 1 },
  { id: 'number', name: 'Number 88', line: 'Laminated. Almost spelled right.', test: () => !!G.world.bidderNumber },
  { id: 'secondTown', name: 'Past the water tower', line: 'A second yard. A second clerk. The same van.', test: () => (G.world.visited || []).length >= 2 },
  { id: 'fiveTowns', name: 'Half the highway', line: 'Five yards know your number.', test: () => (G.world.visited || []).length >= 5 },
  { id: 'allTowns', name: 'The whole highway', line: 'Nine yards. Nine clerks. One raccoon, somehow.', test: () => (G.world.visited || []).length >= TOWN_ORDER.length },
  { id: 'perfectVan', name: 'The great pack', line: 'The door closed on its own.', test: () => countEvents('perfectVan') >= 1 },
  { id: 'bigSale', name: 'A number with a comma', line: 'The buyer laughed for some time.', test: () => eventsWhere('bigSale').some((e) => e.amt >= 1000) },
  { id: 'myth', name: 'It had the heart', line: 'The real one. You read about it.', test: () => G.foundLegends.length >= 1 },
  { id: 'threeMyths', name: 'The historical society calls', line: 'They would like to see all three. They would like to see you.', test: () => G.foundLegends.length >= 3 },
  { id: 'setDone', name: 'Matching grain', line: 'It counts.', test: () => (G.world.setsCompleted || []).length >= 1 },
  { id: 'provenance', name: 'A name for it', line: 'A photograph held up to a thing in a garage.', test: () => countEvents('provenance') >= 1 },
  { id: 'yard', name: 'Boss', line: 'Three doors a day. Read the paper. You know the rest.', test: () => yardOwned() },
  { id: 'comeback', name: 'The pie is full price again', line: 'The tab is settled. The auctioneer never doubted it. He did.', test: () => countEvents('comeback') >= 1 },
  { id: 'regular', name: 'Our regular', line: 'Ten doors in one yard. The auctioneer says it to the crowd.', test: () => !!topOf(careerBook().townWins) && topOf(careerBook().townWins).n >= 10 },
  { id: 'blind', name: 'Things', line: 'Bought without a viewing. Asked what was inside, you left.', test: () => countEvents('blindWin') >= 1 },
  { id: 'walkedAway', name: 'Left it in the dark', line: 'Something worth real money stayed on the floor. The hauler ate well.', test: () => eventsWhere('left').some((e) => e.val >= 500) },
  { id: 'route9', name: 'Route 9', line: 'It rode under everything. It shows.', test: () => countEvents('crushed') >= 1 },
  { id: 'honestWork', name: 'Honest work', line: 'Ten odd jobs. The clerk stopped rounding up.', test: () => careerBook().oddJobs >= 10 },
  // the bonus one: none of it is the story. All of it was in somebody's unit.
  { id: 'decade', name: 'The decade', line: 'A talking board, a cabbage kid, two computers, two consoles, a box of disks, a walkman, a camera, the cards, the cabinet, the pinball. Somebody\'s whole childhood, one door at a time.', test: () => EIGHTIES.every((b) => (careerBook().bases[b] || 0) >= 1) },
  // the twelve nobody is told about
  { id: 'theKey', name: 'It just fit', line: 'A key from one unit. A box from another. Witnesses.', hidden: true, test: () => countEvents('keyUsed') >= 1 },
  { id: 'fakeKept', name: 'You know what it is', line: 'The plastic one, on the shelf, on purpose.', hidden: true, test: () => G.trophies.some((it) => it.fake) },
  { id: 'raccoon3', name: 'A receipt with a bidder number', line: 'Three visits. He has a system now.', hidden: true, test: () => careerBook().raccoon >= 3 },
  { id: 'tidy3', name: 'Unit 13, three towns', line: 'It sorts itself wherever you go. Nobody was asked.', hidden: true, test: () => new Set(eventsWhere('tidy13').map((e) => e.town)).size >= 3 },
  { id: 'five', name: 'Five of the same', line: 'Nobody has asked. Everybody wants to.', hidden: true, test: () => Object.keys(careerBook().bases).some((b) => careerBook().bases[b] >= 5 && b !== 'garbage' && (BASE_BY_ID[b] || {}).cat !== 'junk') },
  { id: 'notebook', name: 'The notebook lied', line: 'Three times Ed looked at a door and told you the wrong thing. You paid each time.', hidden: true, test: () => careerBook().edFooled >= 3 },
  { id: 'shelf', name: 'The whole shelf', line: 'Every console. Ten slots. Something in most of them. A childhood, in beige plastic.', hidden: true, test: () => SYSTEM_IDS.every((sid) => (careerBook().bases[SYSTEMS[sid].console] || 0) >= 1) },
  { id: 'asIs', name: 'Sold as-is', line: 'Something the office blurred, sold to the one man in the county who asked for more.', hidden: true, test: () => careerBook().asIs >= 1 },
  { id: 'rewind', name: 'Be kind, rewind', line: 'All five movies, out of five different boxes of tapes. The late fees alone.', hidden: true, test: () => { const m = careerBook().movies || {}; return MOVIES.every((mv) => (m[mv.id] || 0) >= 1); } },
  // the three collectors: every named keeper of a kind, out of every box it could have come from
  { id: 'longBox', name: 'Eight for eight', line: 'Every comic worth bagging, out of eight different long boxes. The wallet remembers each one.', hidden: true, test: () => COMIC_KEEPERS.every((k) => !!careerBook().keepersFound['comicBox::' + k[0]]) },
  { id: 'sideB', name: 'Side B', line: 'The demo, the airchecked night, the one that might really be him. All three, out of somebody\'s shoebox of tapes.', hidden: true, test: () => CASSETTE_KEEPERS.every((k) => !!careerBook().keepersFound['cassettes::' + k[0]]) },
  { id: 'blowInTheCartridge', name: 'Blow in the cartridge', line: 'Ten systems, ten shoeboxes, and the one worth digging for in every single one.', hidden: true, test: () => SYSTEM_IDS.every((sid) => !!careerBook().keepersFound['gameSystem::' + sid]) },
];
const ACHIEVEMENT_BY_ID = {};
for (const a of ACHIEVEMENTS) ACHIEVEMENT_BY_ID[a.id] = a;
// what is newly true tonight: written down with the day, once
function checkAchievements() {
  const got = (G.world.achieved = G.world.achieved || {});
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (got[a.id]) continue;
    let hit = false;
    try { hit = !!a.test(); } catch (e) { hit = false; }
    if (hit) { got[a.id] = G.day; fresh.push(a); }
  }
  return fresh;
}

// ============ the day, told back ============
// Two or three lines chosen from what actually happened, and a headline in the
// paper's voice. Seeded: the same day tells the same story.
function daySummary() {
  const st = G.dayStats, day = G.day;
  const R = dayR('episode');
  const todays = (G.world.events || []).filter((e) => e.day === day);
  const ev = (k) => todays.filter((e) => e.k === k);
  const cands = [];   // {w: importance, t, c}
  const add = (w, t, c) => cands.push({ w, t, c: c || PAL.gray });
  for (const e of ev('legend')) add(10, 'The ' + e.name + '. The real one.', PAL.gold);
  for (const e of ev('setDone')) add(9, e.name + ' is whole. Matching grain. It counts.', PAL.gold);
  for (const e of ev('provenance')) add(9, 'The ' + e.name.toLowerCase() + ' has a name now. Everyone who sees it will know it.', PAL.gold);
  for (const e of ev('keyUsed')) add(8, 'A key from another day opened the ' + e.name.toLowerCase() + '. It fit.', PAL.gold);
  for (const e of ev('overpaid')) add(8, 'Unit ' + e.unit + ' cost ' + fmt$(e.paid) + '. What came home fit in one trip.', PAL.orange);
  for (const e of ev('fake')) add(7, 'The ' + e.name.toLowerCase() + ' had the face. It never had the heart.', PAL.orange);
  for (const e of ev('blindWin')) add(7, 'Unit ' + e.unit + ', bought without looking. It had things in it.', PAL.cyan);
  for (const e of ev('left')) add(6, 'The ' + e.name.toLowerCase() + ' stayed in the dark. The hauler was pleased.', PAL.red);
  for (const e of ev('crushed')) add(6, 'The ' + e.name.toLowerCase() + ' rode under everything. It shows.', PAL.orange);
  for (const e of ev('bigSale')) add(6, 'A ' + e.name.toLowerCase() + ' sold for ' + fmt$(e.amt) + '. Somebody laughed for a while.', PAL.green);
  for (const e of ev('lost')) if (e.contested) add(5, 'Unit ' + e.unit + ' went to ' + rivalName(e.rival) + '. You were in it until you were not.', PAL.orange);
  for (const e of ev('won')) if (e.paid < e.value * 0.3 && e.value >= 300) add(6, 'Unit ' + e.unit + ' for ' + fmt$(e.paid) + '. It held ' + fmt$(e.value) + ' worth. Nobody is talking.', PAL.green);
  for (const e of ev('named')) add(5, 'A ' + e.name.toLowerCase() + ' came home. Nobody can explain it.', PAL.pink);
  for (const e of ev('perfectVan')) add(5, 'The van left exactly full. Applause was reported.', PAL.cyan);
  for (const e of ev('salDentist')) add(5, 'Sal looked at unit ' + e.unit + ', said "dentist," and left. Sal has no dentist.', PAL.cyan);
  for (const e of ev('rareRaccoon')) add(6, 'There was a raccoon in unit ' + e.unit + '. There is a vest in the van.', PAL.cyan);
  for (const e of ev('baroness')) add(5, "The Baroness's chair came home. The county has no baroness.", PAL.pink);
  for (const e of ev('nineLamps')) add(5, 'Nine lamps. One works. You will find out which.', PAL.cyan);
  for (const e of ev('unmentionable')) add(4, 'Something came home from unit ' + e.unit + ' that the paper will not describe.', PAL.pink);
  const rb = st.raisesBy || {};
  const top = topOf(rb);
  if (top && top.n >= 4) add(5, rivalName(top.id) + ' raised you ' + top.n + ' times today. Nobody asked why.', PAL.orange);
  if (st.cashFound >= 300) add(4, 'Cash in a box: ' + fmt$(st.cashFound) + '. The best kind of tenant.', PAL.yellow);
  if ((G.paper && [G.paper.lead, G.paper.second, G.paper.third].some((s) => s && s.story && s.story.kind === 'callback'))) add(4, 'The paper wrote about you this morning. You read it twice.', PAL.paper);
  if (st.oddJobs >= 2) add(3, 'Odd jobs. Gas money. It happens to everybody once.', PAL.gray);
  if (st.soldTotal >= 800) add(3, 'The buyers came through: ' + fmt$(st.soldTotal) + ' across the table.', PAL.green);
  if (!cands.length) add(1, R.pick(['Nothing happened. It was fine.', 'A quiet day. The doors stayed shut.', 'Three doors. None of them yours. Tomorrow, three more.']), PAL.dgray);
  const shuf = R.shuf(cands).sort((a, b) => b.w - a.w);      // seeded ties, importance first
  const lines = shuf.slice(0, 3).map((c) => ({ t: c.t, c: c.c }));
  // the headline
  let pool;
  if (ev('legend').length) pool = ['THE REAL ONE.', 'IT HAD THE HEART.', 'THE HISTORICAL SOCIETY HAS BEEN CALLED.'];
  else if (ev('overpaid').length || ev('fake').length) pool = ['ED WAS RIGHT. YOU WERE NOT.', 'THE FRONT ROW LIED.', 'A NUMBER, THEN A FEELING.'];
  else if (ev('won').some((e) => e.paid < e.value * 0.3 && e.value >= 300) || (st.acquired.some((a) => a.val >= 500))) pool = ['SOMETHING WORTH THE DRIVE.', 'THE BACK ROW PAID.', 'THE PAPER WAS RIGHT, FOR ONCE.'];
  else if (!st.lockersWon && ev('lost').some((e) => e.contested)) pool = ['THE YARD KEPT ITS DOORS.', 'OUTBID. AGAIN.', "SOMEBODY ELSE'S HAUL."];
  else if (!st.lockersWon && !ev('lost').length) pool = ['NOTHING HAPPENED. IT WAS FINE.', 'THREE DOORS. NONE OF THEM YOURS.', 'A DAY OF LOOKING.'];
  else if (st.soldTotal >= 800) pool = ['THE BUYERS CAME THROUGH.', 'CASH ON THE TABLE.', 'SOLD, SOLD, SOLD.'];
  else pool = ['A DAY. THREE DOORS.', 'READ THE PAPER. DIG. REPEAT.', 'THE USUAL.', 'THE VAN CAME HOME.'];
  return { headline: 'DAY ' + day + ': ' + R.pick(pool), lines };
}
// the world, as a thing you can hand to someone
function seedLabel() { return G.worldSeedText ? G.worldSeedText + '  (' + G.worldSeed + ')' : String(G.worldSeed); }
function copySeed() {
  const text = G.worldSeedText || String(G.worldSeed);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
  } catch (e) { /* no clipboard here */ }
  toast('World copied: ' + text + '. Same words, same lockers.', PAL.cyan, 3);
}
