// ---- the phone on the garage wall (the user's idea, 2026-09-17) ----
// "phone calls from rivals and/or npcs. A phone rings at home, they have something they want, or want you to do,
// like part of the story stuff. You can say yes, or no, that has consequences. On a phone call a large image of
// the npc pops up left side, and right side is the chatter, and questions to answer."
//
// It is built on the favour engine's rules (memory.js, IDEAS_TODO 7), because those rules were right and a second
// set would only disagree with them:
//   * The ask costs something real, and YES is never a free "be nice" button.
//   * The nasty answer pays NOW. If it did not, nobody would pick it and it would be decoration.
//   * Neutral is a real position, not a soft no.
//   * NOTHING resolves inside the conversation. What you said lands a morning or two later, through the channels
//     the game already has: standing, the office line, and the paper.
// What the phone adds is a place and a moment - the evening, the garage, a voice you did not expect - and two kinds
// of call that could only happen here:
//   TENANT  the person whose unit you bought rings about one thing in it. The name is the one the door, the walk
//           and the dig all showed you (it.fromTenant), so the tenant backstories stop being flavour and start
//           costing something.
//   BRIBE   a rival pays you to stay out of their way tomorrow. The promise is enforced at the rope, and whether
//           you kept it is what lands.
// It rings from the SECOND evening, because the user plays two or three days at a time and the favour asks in the
// yard do not start until day 18. One call in the air at a time, never on top of a live favour, never in a demo.
'use strict';

const CALL_FROM = 2;              // the second evening: inside the dealt opening week
const CALL_EVERY = 3;             // after the first, no more often than every third evening
const CALL_CHANCE = 0.6;          // and not every evening that could
const CALL_RING_AFTER = 1.6;      // seconds of a quiet garage before it rings
const CALL_RING_GAP = 2.3;        // between rings
const CALL_RINGS = 6;             // then it gives up
const CALL_LINE_GAP = 1.0;        // the caller's lines arrive one at a time
const CALL_TENANT_DUE = 2;        // a tenant's call comes back two mornings later
const CALL_TENANT_OFFER = 0.4;    // what they can afford: well under what it is worth
const CALL_TENANT_NASTY = 1.8;    // what you can make them pay
const CALL_BRIBE = [60, 120];     // before the town's price multiplier
const CALL_ASKED_KEEP = 40;       // things a tenant has already rung about, so nobody rings twice for one
// ---- Buzz rings with a tip (user, 2026-09-19: "go with your picks, build Buzz first") ----
// The house auctioneer, late, a little sheepish: he saw tomorrow's paperwork and will say which door he would
// bring money for - not what is in it. YES pays for it and one door wears BUZZ'S TIP on its card in the morning;
// he is right (it is the dearest door on the row) BUZZ_TIP_RIGHT of the time and not the rest, so it is a rumour
// and the doorway still has to be read. The nasty answer gets the tip for nothing by threatening to tell the
// office - and for BUZZ_SORE_DAYS he opens every door of yours a step higher, in the words the gavel already
// uses for the whale and the big spender. At most once every BUZZ_CALL_GAP evenings, and never the night before
// you leave town (the tip would be about a row you will not stand at).
const BUZZ_TIP_PRICE = [50, 100];     // before the town's price multiplier
const BUZZ_TIP_RIGHT = 0.75;
const BUZZ_SORE_DAYS = 7;
const BUZZ_CALL_GAP = 6;
const BUZZ_CALL_CHANCE = 0.35;        // of an evening the phone would ring anyway
// ---- the clerk rings with an errand (user, 2026-09-19: "build the clerk next") ----
// A family needs their mother's unit cleared by tomorrow and cannot pay a hauler; the regulars would go through it
// for the good stuff and leave the rest on the floor. The job is real work the next morning at the yard (CLEAR THE
// UNIT, ERRAND_ENERGY), and the reward is the office's, not money: a favour, the clerk's trust (clerkTrust counts
// every errand, memory.js ERRAND_TRUST), and whatever the family did not want. YES is a promise, and a promise not
// kept costs trust; MAYBE leaves the job on the board with nobody counting on you; NO costs nothing; the nasty
// answer charges the office ERRAND_FEE now, and the clerk writes that down whether you turn up or not.
const ERRAND_ENERGY = 25;
const ERRAND_FEE = 100;               // before the town's price multiplier
const ERRAND_NICE = 0.15;             // the chance the family left something worth having
const CLERK_CALL_GAP = 7;
const CLERK_CALL_CHANCE = 0.3;        // of an evening the phone would ring anyway, once Buzz has not
// ---- a buyer rings with an order (user, 2026-09-19: "build the buyer next") ----
// A dealer from the want ads wants one particular thing for a customer and would rather not print it in the
// Gazette, where everybody reads it. It is a want ad of your own (world.commissions, `phone: true`): the same
// DELIVER on the sell screen and the same office help finding one on the row, at BUYER_ORDER_MULT instead of the
// paper's double, and never printed. YES takes a deposit and a promise: deliver in BUYER_ORDER_DAYS for triple,
// and it counts twice toward making them a regular; miss it and the deposit goes back out of your pocket and they
// do not ring for BUYER_COLD_DAYS. MAYBE puts it in the paper as an ordinary ad. The nasty answer takes twice the
// deposit and promises nothing - and if nothing comes, that dealer pays you less for a fortnight and tells the others.
const BUYER_CALL_CHANCE = 0.3;
const BUYER_CALL_GAP = 7;
const BUYER_ORDER_DAYS = 5;
const BUYER_ORDER_MULT = 3;
const BUYER_DEPOSIT = 40;             // before the town's price multiplier
const BUYER_COLD_DAYS = 14;
const BUYER_GRUDGE = 0.9, BUYER_GRUDGE_OTHERS = 0.95, BUYER_GRUDGE_DAYS = 14;

// the first thing each of them says when you pick up. Their voice, not a template: the whole call rests on it.
const CALL_OPENERS = {
  bart: 'It’s Bart. Don’t hang up.',
  dutch: 'YIP — sorry. Sorry. It’s Dutch. Habit.',
  bev: 'It’s Bev. I’ll be quick, I’m on the church phone.',
  pruitt: 'Pruitt. By the pound. You know the one.',
  vera: 'Darling. It’s Vera. Don’t sound so surprised.',
  cobb: 'Cobb here. We’ve never really talked.',
  dee: 'Sister Dee. I hope I’m not calling during supper.',
  charlie: 'Hey! Charlie. From the yard? Charlie.',
  tuck: '...  It’s Tuck.',
  hattie: 'Hattie, from the paper. This is off the record, which means nothing.',
  dex: 'Yo. Dex. Not filming. Promise. Mostly.',
  priscilla: 'Priscilla Mint. I’ll keep this brief, and so will you.',
  // their week apart: one of them, calling behind the other's back
  cody: 'It’s Cody. Kaylee doesn’t know I’m calling.',
  kaylee: 'It’s Kaylee. Don’t tell Cody I rang.',
};

const CALL_KINDS = {
  tenant: {
    lines: (c) => [
      'Hello? Is this — sorry. My name is ' + c.name + '. The storage place gave me this number.',
      'You bought unit ' + c.unit + ' ' + c.when + '. That was mine.',
      'There’s a ' + c.noun + ' in there. It won’t mean much to you. It means something to me.',
      'I can give you ' + fmt$(c.offer) + ' for it. It’s what I have.',
    ],
    answers: (c) => ({
      yes: { label: 'IT’S YOURS', hint: 'the ' + c.noun + ' goes back, for ' + fmt$(c.offer) + '. The office hears about it.', col: 'dgreen' },
      maybe: { label: 'LET ME LOOK FOR IT', hint: 'you keep it, and decide nothing. They wait by the phone.', col: 'slate' },
      no: { label: 'IT’S MINE NOW', hint: 'you keep it. That is the rule, and they know the rule.', col: 'navy' },
      nasty: { label: 'IT’LL COST YOU', hint: fmt$(c.nasty) + ' today, which they will pay. And then tell people.', col: 'red' },
    }),
    say: {
      yes: 'It’s yours. Come and get it.',
      maybe: 'Let me have a look for it.',
      no: 'Sorry. It’s mine now.',
      nasty: 'It’ll cost you. More than that.',
    },
    close: {
      yes: 'Thank you. I’ll come by the yard for it. Thank you.',
      maybe: 'Would you? I’ll wait. I’ve got nothing but time now.',
      no: '...Right. No, I understand. It’s yours now. That’s how it works.',
      nasty: 'That’s — fine. Fine. I’ll find it. Where do I bring it?',
    },
  },
  buyer: {
    lines: (c) => [
      'Is this the one who reads the want ads? It’s ' + c.buyerName + '.',
      'I’ve got a customer who wants a ' + c.thing + ', and I haven’t got one. I’d rather not print it: everybody reads the Gazette.',
      'Find me one in ' + BUYER_ORDER_DAYS + ' days and I’ll pay three times what it’s worth. ' + fmt$(c.deposit) + ' up front, so you know I’m serious.',
    ],
    answers: (c) => ({
      yes: { label: 'I’LL FIND ONE', hint: fmt$(c.deposit) + ' now. Triple in ' + BUYER_ORDER_DAYS + ' days, or pay it back.', col: 'dgreen' },
      maybe: { label: 'PUT IT IN THE PAPER', hint: 'no deposit. An ordinary want ad, at double.', col: 'slate' },
      no: { label: 'NOT MY TRADE', hint: 'nothing. They will ask somebody else.', col: 'navy' },
      nasty: { label: 'DOUBLE THE DEPOSIT', hint: fmt$(c.deposit * 2) + ' now, no promise. Miss it and they talk.', col: 'red' },
    }),
    say: (c) => ({
      yes: 'I’ll find you one.',
      maybe: 'Put it in the paper. If I find one, I find one.',
      no: 'Not my trade, sorry.',
      nasty: 'Make the deposit ' + fmt$(c.deposit * 2) + ' and I’ll look.',
    }),
    close: (c) => ({
      yes: 'Good. Bring it to me, not to anybody else. I’ll know.',
      maybe: 'The paper, then. Everybody reads the paper. Fine.',
      no: 'Fair enough. I’ll ask around.',
      nasty: '...' + fmt$(c.deposit * 2) + '. Fine. You had better find it.',
    }),
  },
  clerk: {
    lines: (c) => [
      'It’s the office. The clerk. Sorry to ring you at home.',
      'There’s a unit that needs clearing by tomorrow. The ' + c.family + ' family. Their mother’s. She passed in the spring.',
      'They can’t pay what a hauler charges, and I can’t ask the regulars. They’d go through it for the good stuff and leave the rest on the floor.',
      'It’s a morning’s work. Whatever they don’t want, you keep. The office would owe you one.',
    ],
    answers: (c) => ({
      yes: { label: 'I’LL DO IT', hint: 'tomorrow, ' + ERRAND_ENERGY + ' energy at the yard. A favour, and his trust.', col: 'dgreen' },
      maybe: { label: 'IF I’VE GOT TIME', hint: 'the job waits on the board. Nobody is counting on you.', col: 'slate' },
      no: { label: 'CAN’T, SORRY', hint: 'nothing lost. He will do it himself, on his lunch.', col: 'navy' },
      nasty: { label: 'FOR ' + fmt$(c.fee) + ' I WILL', hint: fmt$(c.fee) + ' now, from the office. You still do the job. He remembers.', col: 'red' },
    }),
    say: (c) => ({                                                    // the fee is the town's, so it is said as a number
      yes: 'I’ll do it. First thing.',
      maybe: 'If I’ve got time tomorrow, I’ll do it.',
      no: 'Can’t, sorry.',
      nasty: 'For ' + fmt$(c.fee) + ', I will.',
    }),
    close: (c) => ({
      yes: 'Thank you. I mean it. I’ll leave the key at the window.',
      maybe: 'Right. Well. The key will be at the window either way.',
      no: 'Right. No, of course. I’ll manage.',
      nasty: '...' + fmt$(c.fee) + '. Fine. It’s the office’s money. I’ll leave it with the key.',
    }),
  },
  buzz: {
    lines: (c) => [
      'It’s Buzz. From the yard. Don’t tell the office I called.',
      'I was in the back this afternoon when they did tomorrow’s paperwork. I saw things. I’m not supposed to see things.',
      'One of tomorrow’s doors, I’d bring money for. I won’t say what’s in it. I’ll say which one.',
      fmt$(c.price) + ' and it’s yours. A man’s gotta eat. Some days a man’s gotta eat twice.',
    ],
    answers: (c) => ({
      yes: { label: 'WHICH ONE?', hint: fmt$(c.price) + ' now. One door wears BUZZ’S TIP tomorrow. Usually right.', col: 'dgreen' },
      maybe: { label: 'CALL ME BACK', hint: 'no money, no tip. He will not call back: tomorrow is too late.', col: 'slate' },
      no: { label: 'NOT INTERESTED', hint: 'free. He will find somebody who is.', col: 'navy' },
      nasty: { label: 'OR I TELL THE OFFICE', hint: 'the tip for nothing. And for a week he opens your doors a step higher.', col: 'red' },
    }),
    say: {
      yes: 'Which one?',
      maybe: 'Call me back tomorrow.',
      no: 'Not interested, Buzz.',
      nasty: 'Tell me for free, or I tell the office you’re selling tips.',
    },
    close: {
      yes: 'Look for my mark on the card. And you never heard it from me. You never heard anything from me.',
      maybe: 'Tomorrow’s too late, friend. That’s the whole point of tonight.',
      no: 'Suit yourself. Somebody’s gonna want it.',
      nasty: '...Huh. Okay. Look for my mark. And friend? I’ve got a long memory and a short gavel.',
    },
  },
  bribe: {
    lines: (c) => [
      CALL_OPENERS[c.who] || ('It’s ' + c.nameShort + '.'),
      'I’m going after a door tomorrow, and I’d rather not be looking at your paddle while I do.',
      fmt$(c.bribe) + ', cash. You sit out whatever door I’m on. That’s it. That’s the whole deal.',
    ],
    answers: (c) => ({
      yes: { label: 'DEAL', hint: fmt$(c.bribe) + ' now. Tomorrow you stay out of whatever door ' + c.nameShort + ' is on.', col: 'dgreen' },
      maybe: { label: 'SEE HOW I FEEL', hint: 'no money, no promise. They remember being kept waiting.', col: 'slate' },
      no: { label: 'NOT FOR SALE', hint: 'free, and free to bid. They will remember you said it.', col: 'navy' },
      nasty: { label: 'DOUBLE IT', hint: fmt$(c.bribe * 2) + ' now, and still promised. Nobody forgets being shaken down.', col: 'red' },
    }),
    say: {
      yes: 'Deal.',
      maybe: 'Let me see how I feel in the morning.',
      no: 'Not for sale.',
      nasty: 'Double it, and you’ve got a deal.',
    },
    close: {
      yes: 'Good. Pleasure doing business.',
      maybe: 'Suit yourself. The offer’s gone at midnight.',
      no: 'Huh. Okay. Remember you said that.',
      nasty: 'Double. ...Fine. But you had better be nowhere near my paddle tomorrow.',
    },
  },
};
// what you say, and what they say back, for each favour. The ask and the four buttons are the favour engine's
// own (FAVOUR_KINDS); these are only the words, because the yard's were written for across a rope.
const FAVOUR_PHONE_WORDS = {
  cash: {
    say: { yes: 'I can lend you that.', maybe: 'Ask me again Thursday.', no: 'Not this time.', nasty: 'I can lend it. It’ll cost you sixty on top.' },
    close: { yes: 'You’re a lifesaver. Thursday. I swear it.', maybe: 'Thursday, then. Right.', no: '...Fair enough.', nasty: 'Sixty. Right. ...Fine. Thursday.' },
  },
  thing: {
    say: { yes: 'Go on, then. It’s yours.', maybe: 'Ask me again Thursday.', no: 'Not this time.', nasty: 'Sure. I’ll put it aside for you.' },
    close: { yes: 'I won’t forget it. I’ll come round for it.', maybe: 'Thursday. I’ll hold you to that.', no: 'Right. Well. Worth asking.', nasty: 'You’re a good one. Thursday, then.' },
  },
  side: {
    say: { yes: 'I’m with you. Your end of the row.', maybe: 'Let me think about it.', no: 'I’m staying out of it.', nasty: 'I’m with you. Course I am.' },
    close: { yes: 'Knew it. The other one’s going to be furious.', maybe: 'Think fast. It’s a short week.', no: 'Suit yourself.', nasty: 'Good. Don’t tell them I rang.' },
  },
};
CALL_KINDS.favour = {
  lines: (c) => [CALL_OPENERS[c.who] || ('It’s ' + c.nameShort + '.'), favourAskText(c.f)],
  answers: (c) => {
    const k = FAVOUR_KINDS[c.f.kind];
    return {
      yes: { label: String(k.yes).replace('{NAME}', c.nameShort.toUpperCase()), hint: k.yesHint, col: 'dgreen' },
      maybe: { label: FAVOUR_MAYBE, hint: FAVOUR_MAYBE_HINT, col: 'slate' },
      no: { label: FAVOUR_NO, hint: FAVOUR_NO_HINT, col: 'navy' },
      nasty: { label: k.nasty, hint: k.nastyHint, col: 'red' },
    };
  },
  say: (c) => (FAVOUR_PHONE_WORDS[c.f.kind] || FAVOUR_PHONE_WORDS.cash).say,
  close: (c) => (FAVOUR_PHONE_WORDS[c.f.kind] || FAVOUR_PHONE_WORDS.cash).close,
};
// the ask in their words: "something of mine" becomes the actual thing when it is a thing
function favourAskText(f) {
  const kind = FAVOUR_KINDS[f.kind];
  return (f.kind === 'thing' && f.thingName) ? kind.ask.replace('something of mine, near enough', 'that ' + f.thingName + ' of yours') : kind.ask;
}
// `say` and `close` are fixed for the tenant and the bribe, and depend on the ask for a favour
function callSay(c) { const s = CALL_KINDS[c.kind].say; return (typeof s === 'function' ? s(c) : s)[c.answer]; }
function callClose(c) { const s = CALL_KINDS[c.kind].close; return (typeof s === 'function' ? s(c) : s)[c.answer]; }
// a favour asked this morning rings tonight. A thing that has gone since breakfast turns it into a cash ask.
function favourCallFor(f) {
  if (f.kind === 'thing' && !(G.stash || []).concat(G.keeps || []).some((x) => x && x.uid === f.thingUid)) {
    const t = favourThingFor();
    if (t) { f.thingUid = t.uid; f.thingName = dName(t); f.thingVal = t.val; }
    else { f.kind = 'cash'; f.thingUid = null; f.thingName = null; f.thingVal = 0; }
  }
  const def = rivalDef(f.who);
  return { kind: 'favour', who: f.who, nameShort: def ? shortRivalName(def) : f.who, f };
}
const CALL_ANSWERS = ['yes', 'maybe', 'no', 'nasty'];
const CALL_ANSWER_ORDER = ['yes', 'maybe', 'no', 'nasty'];

function callState(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.call = w.arcs.call || {}); }
function callLive(world) { const c = callState(world); return (c.day != null && !c.answer) ? c : null; }
function callPending(world) { const c = callState(world); return (c.answer && !c.settled) ? c : null; }

// "yesterday", "the other day", "last week" - how a person who is upset says when
function callWhen(fromDay, day) {
  const d = day - (fromDay || day);
  return d <= 1 ? 'yesterday' : (d <= 3 ? 'the other day' : 'last week');
}
// somebody whose unit you bought, about one thing of theirs you still have
function tenantCallFor(w, day) {
  const asked = w.arcs.callAsked || [];
  const all = (G.stash || []).concat(G.keeps || []);
  // appraised and vouched for, so the numbers on the phone tell you nothing the loupe has not already told you
  const cands = all.filter((it) => it && it.fromTenant && it.fromUnit && it.searched && !it.unverified && !it.locked
    && !it.cash && !it.loot && (it.val || 0) >= 15 && it.fromDay != null
    && day - it.fromDay >= 1 && day - it.fromDay <= 10 && !asked.includes(it.uid));
  if (!cands.length) return null;
  // they ring about the personal thing before the valuable one
  const personal = (it) => (it.note ? 3 : 0) + (['jewelry', 'collectibles', 'antiques'].includes(it.cat) ? 2 : 0);
  const it = RNG(strHash('tenantcall_' + G.worldSeed + '_' + day)).shuf(cands).sort((a, b) => personal(b) - personal(a))[0];
  const b = BASE_BY_ID[it.base];
  return {
    kind: 'tenant', name: it.fromTenant, unit: it.fromUnit, when: callWhen(it.fromDay, day),
    itemUid: it.uid, noun: (b ? b.name : 'thing').toLowerCase(), itemVal: it.val,
    offer: Math.max(20, Math.round(it.val * CALL_TENANT_OFFER / 5) * 5),
    nasty: Math.max(40, Math.round(it.val * CALL_TENANT_NASTY / 5) * 5),
  };
}
// a rival paying you to stay out of their way tomorrow
function bribeCallFor(w, day) {
  if (w.travelTo) return null;                                        // you are leaving town: nobody pays for that
  const town = (typeof TOWNS !== 'undefined' && TOWNS[w.town]) || {};
  const roster = (typeof NPCS !== 'undefined' ? NPCS.map((n) => n.id) : []).concat(town.rivals || []);
  const pool = FAVOUR_FACES.filter((id) => roster.includes(id)
    && !(typeof awayOn === 'function' && awayOn(id, w, day + 1))      // not around tomorrow: nothing to pay for
    && standingOf(id) > -3);                                          // somebody with it in for you does not ring
  if (!pool.length) return null;
  const R = RNG(strHash('bribecall_' + G.worldSeed + '_' + day));
  const who = R.pick(pool);
  const def = rivalDef(who);
  const pm = town.priceMult || 1;
  return { kind: 'bribe', who, nameShort: def ? shortRivalName(def) : who,
    bribe: Math.round(R.i(CALL_BRIBE[0], CALL_BRIBE[1]) * pm / 5) * 5, promiseDay: day + 1 };
}
// Buzz, with something to sell about tomorrow's row
function buzzCallFor(w, day) {
  if (w.travelTo) return null;                                         // you are leaving: his tip is about a row you will not see
  const last = w.arcs.buzzCallLast;
  if (last != null && day - last < BUZZ_CALL_GAP) return null;
  const R = RNG(strHash('buzzcall_' + G.worldSeed + '_' + day));
  if (!R.chance(BUZZ_CALL_CHANCE)) return null;
  const pm = ((typeof TOWNS !== 'undefined' && TOWNS[w.town]) || {}).priceMult || 1;
  return { kind: 'buzz', who: 'buzz', price: Math.round(R.i(BUZZ_TIP_PRICE[0], BUZZ_TIP_PRICE[1]) * pm / 5) * 5, tipDay: day + 1 };
}
// the clerk, with a job for the office
function clerkCallFor(w, day) {
  if (w.travelTo) return null;                                         // the job is here tomorrow, and you will not be
  const last = w.arcs.clerkCallLast;
  if (last != null && day - last < CLERK_CALL_GAP) return null;
  const R = RNG(strHash('clerkcall_' + G.worldSeed + '_' + day));
  if (!R.chance(CLERK_CALL_CHANCE)) return null;
  const pm = ((typeof TOWNS !== 'undefined' && TOWNS[w.town]) || {}).priceMult || 1;
  const family = typeof TENANT_LAST !== 'undefined' ? R.pick(TENANT_LAST) : 'Hollis';
  return { kind: 'clerk', who: 'clerk', family, fee: Math.round(ERRAND_FEE * pm / 5) * 5, jobDay: day + 1, town: w.town };
}
// a dealer, with an order of their own
function buyerCallFor(w, day) {
  if (typeof COMMISSION_FROM !== 'undefined' && day < COMMISSION_FROM) return null;
  const last = w.arcs.buyerCallLast;
  if (last != null && day - last < BUYER_CALL_GAP) return null;
  const R = RNG(strHash('buyercall_' + G.worldSeed + '_' + day));
  if (!R.chance(BUYER_CALL_CHANCE)) return null;
  const cold = w.arcs.buyerCold || {};
  const pool = SPECIALISTS.filter((b) => !((cold[b.id] || 0) >= day));
  if (!pool.length) return null;
  const b = R.pick(pool);
  // something in their trade you have not already got, and that is not already wanted
  const held = new Set((G.stash || []).concat(G.keeps || [], G.trophies || []).map((it) => it && it.base));
  const wanted = new Set(((w.commissions) || []).filter((c) => !c.done && c.until >= day).map((c) => c.base));
  const bases = BASES.filter((x) => b.cats.includes(x.cat) && !x.legendary && !x.fakeOf && !x.storyOnly && x.val >= 30 && x.val <= 400 && !held.has(x.id) && !wanted.has(x.id));
  if (!bases.length) return null;
  const base = R.pick(bases);
  const pm = ((typeof TOWNS !== 'undefined' && TOWNS[w.town]) || {}).priceMult || 1;
  return { kind: 'buyer', who: b.id, buyerName: b.name, base: base.id, thing: base.name.toLowerCase(), name: base.name,
    deposit: Math.round(BUYER_DEPOSIT * pm / 5) * 5 };
}
// the week after a dealer was stiffed: what they (and, less, the others) pay you
function buyerGrudgeMult(id) {
  const gr = G.world && G.world.arcs && G.world.arcs.buyerGrudge;
  if (!gr || gr.until < G.day) return 1;
  return id === gr.id ? BUYER_GRUDGE : BUYER_GRUDGE_OTHERS;
}
// the job at the yard today, if there is one to do
function errandToday() {
  const c = callState(G.world);
  if (c.kind !== 'clerk' || !c.answer || c.errandDone || c.jobDay !== G.day || c.town !== G.world.town) return null;
  if (c.answer !== 'yes' && c.answer !== 'maybe' && c.answer !== 'nasty') return null;
  return c;
}
// CLEAR THE UNIT: a morning's work, and what the family left
function doErrand() {
  const c = errandToday();
  if (!c) return false;
  if (G.daylight < ERRAND_ENERGY) { play('denied'); toast('Not enough energy for a morning\'s clearing.', PAL.red); return false; }
  G.daylight -= ERRAND_ENERGY;
  const warned = sunCheck();
  c.errandDone = true;
  const R = RNG(strHash('errand_' + G.worldSeed + '_' + G.day));
  const small = BASES.filter((b) => b.val > 0 && b.val <= 40 && (b.size || 1) <= 3 && !b.legendary && !b.fakeOf && !b.storyOnly && !b.container && ['junk', 'furniture', 'antiques', 'tools'].includes(b.cat));
  const nice = BASES.filter((b) => b.val >= 60 && b.val <= 250 && (b.size || 1) <= 2 && !b.legendary && !b.fakeOf && !b.storyOnly && !b.container && ['antiques', 'jewelry', 'collectibles'].includes(b.cat));
  const got = [];
  const n = R.i(2, 3);
  for (let i = 0; i < n && small.length; i++) got.push(makeItem(R.pick(small).id, R));
  if (nice.length && R.chance(ERRAND_NICE)) got.push(makeItem(R.pick(nice).id, R));
  for (const it of got) { it.homeDay = G.day; it.fromErrand = c.family; G.stash.push(it); }
  if (c.answer !== 'nasty') G.world.favours = Math.min(FAVOUR_MAX, favoursNow() + 1);   // the office owes you one
  recordEvent('errand', { how: c.answer, family: c.family });
  bump('errands');
  play('van_load');
  if (!warned) toast('You clear the ' + c.family + ' unit. ' + (got.length ? got.length + ' things the family did not want go home with you tonight.' : 'Nothing worth keeping.') + (c.answer !== 'nasty' ? ' The office owes you one.' : ''), PAL.cyan);
  return true;
}
// the morning after: one door on the row wears his mark (startDay, before callSettle)
function buzzTipPlace() {
  const c = callState(G.world);
  if (c.kind !== 'buzz' || !c.tipPaid || c.tipPlaced || c.tipDay !== G.day || !G.today || !G.today.lockers) return null;
  const row = G.today.lockers.filter((lk) => !lk.won && !lk.sold);
  if (!row.length) return null;
  c.tipPlaced = true;
  const best = row.slice().sort((a, b) => (b.value || 0) - (a.value || 0))[0];
  const R = RNG(strHash('buzztip_' + G.worldSeed + '_' + G.day));
  const others = row.filter((lk) => lk !== best);
  const right = !others.length || R.chance(BUZZ_TIP_RIGHT);
  const lk = right ? best : R.pick(others);
  lk.buzzTip = true;
  c.tipRight = right; c.tipUnit = lk.num;
  return lk;
}
// the week after you leaned on him: your doors open a step higher (startAuction)
function buzzSoreNow() { const m = (G.world && G.world.rivalMem) || {}; return (m.buzzSoreUntil || 0) >= G.day; }
// tonight's call, or null. A call you reloaded out of rings again until you answer it.
function callFor(w, day) {
  if (!w || w.noArcs || G.demo) return null;
  const fv = favourLive(w);
  if (fv && fv.via === 'phone') return favourCallFor(fv);          // somebody asked for something: it rings
  const st = callState(w);
  if (st.day === day && !st.answer) return st;
  if (st.day === day) return null;                                    // one a night
  if (st.answer && !st.settled) return null;                          // one thing in the air at a time
  if (day < CALL_FROM) return null;
  if (favourLive(w) || favourPending(w)) return null;                 // the yard's ask and the phone never pile up
  if (st.everRang) {
    if (st.lastDay != null && day < st.lastDay + CALL_EVERY) return null;
    if (!RNG(strHash('callday_' + G.worldSeed + '_' + day)).chance(CALL_CHANCE)) return null;
  }
  // Buzz first, then the clerk, each on their own dice, so the tenant and the bribe below roll exactly as they always have
  const z = buzzCallFor(w, day);
  if (z) { w.arcs.buzzCallLast = day; w.arcs.call = Object.assign({ day, lastDay: day, everRang: true }, z); return w.arcs.call; }
  const ck = clerkCallFor(w, day);
  if (ck) { w.arcs.clerkCallLast = day; w.arcs.call = Object.assign({ day, lastDay: day, everRang: true }, ck); return w.arcs.call; }
  const by = buyerCallFor(w, day);
  if (by) { w.arcs.buyerCallLast = day; w.arcs.call = Object.assign({ day, lastDay: day, everRang: true }, by); return w.arcs.call; }
  // the tenant is the one that is about something YOU did, so it wins a tie more often than not
  const t = tenantCallFor(w, day), b = bribeCallFor(w, day);
  const pick = (t && b) ? (RNG(strHash('callkind_' + G.worldSeed + '_' + day)).chance(0.6) ? t : b) : (t || b);
  if (!pick) return null;
  w.arcs.call = Object.assign({ day, lastDay: day, everRang: true }, pick);
  return w.arcs.call;
}

// ---- the evening: once the garage is clear, it rings ----
function phoneTick() {
  if (G.mode !== 'sell' || G.call || G.demo || !G.world || G.world.noArcs || !G.today) return;
  // everything else the evening has to say goes first: the unpack, a held thing wanted, the clerk's notice, a card
  if (G.modal || G.homeInspect || G.pendingUnpack || G.holdNotice || G.bayNotice || G.cardQueued) { G.today.phoneQuietAt = null; return; }
  if (G.today.phoneRang) return;
  if (G.today.phoneQuietAt == null) { G.today.phoneQuietAt = G.time; return; }
  if (G.time - G.today.phoneQuietAt < CALL_RING_AFTER) return;
  G.today.phoneRang = true;                                           // decided once an evening, rung or not
  const c = callFor(G.world, G.day);
  if (c) startCall(c);
}
function startCall(c) {
  G.call = { c, state: 'ringing', t: 0, rings: 0, ringAt: -9, shown: 0, lineAt: 0, back: G.mode || 'sell' };
  G.mode = 'phone';
  _musicDuck = 0.3;
  return true;
}
function callPickUp() {
  const k = G.call;
  if (!k || k.state !== 'ringing') return;
  k.state = 'talk'; k.t = 0; k.shown = 1; k.lineAt = 0;
  play('ui_click', 0.7);
}
// LET IT RING: they know you were home. It books as a hedge, which is exactly what not picking up is.
function callLetRing() {
  const k = G.call;
  if (!k || k.state !== 'ringing') return;
  callAnswer('maybe', true);
}
function callLines(c) { return CALL_KINDS[c.kind].lines(c); }

// what you said. Nothing lands now except the cost of saying it.
function callAnswer(answer, unanswered) {
  const k = G.call, w = G.world;
  const c = k && k.c;
  if (!c || c.answer || !CALL_ANSWERS.includes(answer)) return false;
  if (c.kind === 'favour') {
    // exactly the favour engine's answer, so the cost, the booking and the settle are the yard's to the penny.
    // If it refuses (nothing to lend, the thing already gone) you are still on the line and can say something else.
    if (!favourAnswer(answer, true)) return false;
    c.answer = answer; c.unanswered = !!unanswered;
    if (unanswered) { vmMissed(c); callHangUp(); }                   // they leave a message (the machine plays it)
    else { k.state = 'close'; k.t = 0; play('ui_click', 0.6); }
    return true;
  }
  if (c.kind === 'tenant') {
    if (answer === 'yes' || answer === 'nasty') {
      const it = (G.stash || []).concat(G.keeps || []).find((x) => x && x.uid === c.itemUid);
      if (!it) { play('denied'); toast('It is not in the garage any more.', PAL.red); return false; }
      for (const list of [G.stash, G.keeps]) { const i = list.indexOf(it); if (i >= 0) { list.splice(i, 1); break; } }
      gain(answer === 'yes' ? c.offer : c.nasty);
    }
    w.arcs.callAsked = (w.arcs.callAsked || []).concat([c.itemUid]).slice(-CALL_ASKED_KEEP);
    c.due = G.day + CALL_TENANT_DUE;
  } else if (c.kind === 'buyer') {
    w.commissions = w.commissions || [];
    if (answer === 'yes' || answer === 'nasty') {
      // an order of your own: never printed, triple, and on the phone's terms
      const dep = answer === 'nasty' ? c.deposit * 2 : c.deposit;
      gain(dep);
      c.cid = 'pc_' + G.day;
      w.commissions.push({ id: c.cid, buyer: c.who, base: c.base, name: c.name, posted: G.day, until: G.day + BUYER_ORDER_DAYS, done: false,
        phone: true, mult: BUYER_ORDER_MULT, deposit: dep, promised: answer === 'yes' });
    } else if (answer === 'maybe') {
      // in the paper, like any other want ad: at the paper's price, for anybody who reads it
      c.cid = 'wc_ph' + G.day;
      w.commissions.push({ id: c.cid, buyer: c.who, base: c.base, name: c.name, posted: G.day + 1, until: G.day + 1 + BUYER_ORDER_DAYS, done: false });
    }
    c.due = G.day + BUYER_ORDER_DAYS + 1;                              // the morning after the order runs out
  } else if (c.kind === 'clerk') {
    if (answer === 'nasty') gain(c.fee);                              // the office pays now; the job is still yours
    c.due = c.jobDay + 1;                                             // the morning after the job, whether it was done
  } else if (c.kind === 'buzz') {
    if (answer === 'yes') {
      if (G.money < c.price) { play('denied'); toast('You have not got ' + fmt$(c.price) + ' on you.', PAL.red); return false; }
      spend(c.price); c.tipPaid = true;
    } else if (answer === 'nasty') {
      c.tipPaid = true; c.threatened = true;
      const m = w.rivalMem = w.rivalMem || {};
      m.buzzSoreUntil = G.day + BUZZ_SORE_DAYS;
    }
    c.due = c.tipDay;                                                // it lands the next morning, with the tip
  } else {
    if (answer === 'yes') { gain(c.bribe); c.promised = true; }
    else if (answer === 'nasty') { gain(c.bribe * 2); c.promised = true; c.shookDown = true; }
    c.due = c.promiseDay + 1;                                         // the morning after the day it was about
  }
  c.answer = answer; c.unanswered = !!unanswered; c.answeredDay = G.day; c.settled = false;
  recordEvent('call', { kind: c.kind, who: c.who || null, name: c.name || null, answer, day: G.day });
  if (unanswered) {
    // nobody picked up: the phone stops, the machine clicks on, and they leave a message
    vmMissed(c);
    callHangUp();
  } else {
    k.state = 'close'; k.t = 0;
    play('ui_click', 0.6);
  }
  return true;
}
function callHangUp() {
  const k = G.call;
  if (!k) return;
  G.call = null;
  _musicDuck = 1;
  G.mode = k.back || 'sell';
}

// ---- the morning after: the promise tested at the rope, and the outcome landing ----
// a bid of yours at a door the promised rival is standing at breaks it, whichever way you bid
function callBidCheck() {
  const c = callState(G.world), au = G.auction;
  if (!c.promised || c.broken || c.promiseDay !== G.day || !au) return;
  const them = au.npcs.find((a) => a.def && a.def.id === c.who && a.active && !a.crowd);
  if (!them) return;
  c.broken = true;
  qLine(shortRivalName(them.def) + ' watches your paddle go up and does not look surprised. You were paid to sit this one out.', PAL.red);
}
// walking into their door is allowed. It is only the paddle that breaks it, so the room reminds you once.
function callAuctionReminder() {
  const c = callState(G.world), au = G.auction;
  if (!c.promised || c.broken || c.promiseDay !== G.day || !au) return;
  const them = au.npcs.find((a) => a.def && a.def.id === c.who && a.active && !a.crowd);
  if (them) qLine(shortRivalName(them.def) + ' catches your eye across the rope and taps a coat pocket. You were paid to sit this one out.', PAL.orange);
}
function callSettle(world) {
  const w = world || G.world;
  const c = callState(w);
  if (!c.answer || c.settled || G.day < c.due) return;
  c.settled = true;
  c.settledDay = G.day;
  let say = null, bump = 0;
  const a = c.answer;
  if (c.kind === 'buyer') {
    const pc = (w.commissions || []).find((x) => x.id === c.cid);
    const done = !!(pc && pc.done), nm = c.buyerName;
    if (a === 'yes') {
      if (done) say = '"' + nm + ' rang to say you are the real thing. Those were the words."';
      else {
        // the deposit goes back, out of your pocket or onto the bill, and they stop ringing for a while
        if (G.money >= c.deposit) spend(c.deposit); else if (typeof dumpOwe === 'function') dumpOwe(c.deposit);
        w.arcs.buyerCold = w.arcs.buyerCold || {};
        w.arcs.buyerCold[c.who] = G.day + BUYER_COLD_DAYS;
        say = '"' + nm + ' rang for the deposit back. We paid it out of your account: ' + fmt$(c.deposit) + '. They said not to expect a call for a while."';
      }
    } else if (a === 'nasty') {
      if (done) say = '"' + nm + ' got the ' + c.thing + '. Did not mention the deposit. Did not have to."';
      else {
        w.arcs.buyerGrudge = { id: c.who, until: G.day + BUYER_GRUDGE_DAYS };
        say = '"' + nm + ' is telling the other dealers about a deposit and a no-show. They are listening."';
      }
    } else if (a === 'maybe') say = done ? '"' + nm + ' says thank you for the ' + c.thing + '. The ad did its job."'
      : '"' + nm + '\'s ad has come out of the paper. Nobody found one."';
    else if (a === 'no') say = '"' + nm + ' found somebody else to look. There is always somebody."';
    if (c.unanswered) say = '"' + nm + ' says they rang your house. Nobody picked up."';
  } else if (c.kind === 'clerk') {
    const fam = 'the ' + c.family + ' family', done = !!c.errandDone;
    if (!done && (a === 'yes' || a === 'nasty')) {
      recordEvent('errand', { how: a + 'Skipped', family: c.family });   // a promise not kept, written down
      if (a === 'nasty') G.world.favours = Math.max(0, favoursNow() - 1);
    }
    if (a === 'yes') say = done ? '"' + fam + ' left a card at the window for you. The clerk put it up where everybody can see it."'
      : '"' + fam + ' waited at the unit all morning. The clerk went and did it himself, on his lunch. He has not said anything. He does not need to."';
    else if (a === 'nasty') say = done ? '"' + fam + ' paid the office, and the office paid you. The clerk wrote it down."'
      : '"You took the office\'s ' + fmt$(c.fee) + ' and never turned up for ' + fam + '. The clerk has written that down too."';
    else if (a === 'maybe') say = done ? '"The clerk says thank you for the ' + c.family + ' unit. He did not think you would come."'
      : '"We got somebody else for the ' + c.family + ' unit. Do not worry about it."';
    else if (a === 'no') say = '"The clerk cleared the ' + c.family + ' unit himself, on his lunch. He did not mention you."';
    else say = '"The clerk says he rang about a job last night. Nobody picked up."';
    if (c.unanswered) say = '"The clerk says he rang about a job last night. Nobody picked up."';
  } else if (c.kind === 'buzz') {
    if (a === 'yes') say = '"Buzz was in early, sitting by the window with his coffee. He would not say why. He winked at nobody in particular."';
    else if (a === 'nasty') say = '"Buzz asked us to tell you he never forgets a face. He said it twice. We do not know what that is about and would like to keep it that way."';
    else if (a === 'no') say = '"Buzz was asking around the office last night for somebody who wanted to buy a tip. We did not ask a tip about what."';
    else say = c.unanswered ? '"Buzz says he rang your house last night. Nobody picked up. He says it is just as well."'
      : '"Buzz says to tell you the offer is closed. He said you would know what that meant."';
  } else if (c.kind === 'tenant') {
    const nm = c.name;
    if (a === 'yes') {
      w.favours = Math.min(FAVOUR_MAX, favoursNow() + 1);            // the office would like to be that kind of place
      say = '"' + nm + ' came by the window to thank whoever it was. The office would like to be the kind of place that happens at. We owe you one."';
    } else if (a === 'nasty') {
      w.favours = Math.max(0, favoursNow() - 1);
      say = '"' + nm + ' paid what you asked, and then told the whole office what you asked. It is a small office."';
    } else if (a === 'no') say = '"' + nm + ' rang here asking about a ' + c.noun + '. We told them the rules. They already knew the rules."';
    else say = c.unanswered ? '"' + nm + ' says they rang your house and nobody picked up. We said you were probably out."'
      : '"' + nm + ' has rung twice asking if you found it. We said you were looking. Were you?"';
  } else {
    const def = rivalDef(c.who), nm = def ? shortRivalName(def) : 'They';
    if (c.promised) {
      if (c.broken) { bump -= 3; say = '"' + nm + ' told the office you took the money and bid anyway. Loudly. By the coffee."'; }
      else { bump += 2; say = '"' + nm + ' says you kept your end. Said it like it surprised them."'; }
      if (c.shookDown) bump -= 2;                                     // on top of it: you made them pay double
    } else if (a === 'no') { bump -= 1; say = '"' + nm + ' found somebody else to stand aside. There is always somebody."'; }
    else { say = c.unanswered ? '"' + nm + ' says they rang you last night. Nobody picked up, apparently."'
      : '"' + nm + ' waited on you till midnight. Then stopped waiting."'; c.hedged = true; }
    if (bump) standingBump(c.who, bump);
  }
  c.say = say;
  c.bump = bump;
  recordEvent('callDone', { kind: c.kind, who: c.who || null, name: c.name || null, answer: a, broken: !!c.broken, bump });
}
function callOfficeLine() {
  const c = G.world && G.world.arcs && G.world.arcs.call;
  if (!c || !c.say) return null;
  const s = c.say;
  c.say = null;
  return s;
}

// ============ the answering machine (user, 2026-09-19) ============
// "We can use the phone to also talk about the pop-up stuff - van space, first day stuff, that text we made bigger
// and longer. When the player gets home they get a call, or a voicemail. The phone has a voicemail and plays the
// message. I like to use as much audio with text as possible." ... "build it with the clerk as a new voice."
// The machine on the garage wall plays by itself when you get home, the way the phone rings by itself: after the
// unpack and a held thing wanted, before the phone. The machine announces itself (its own two takes), then each
// message: a beep, the caller on the left, their words on the right while the take plays, and PLAY AGAIN / NEXT.
// A message with no take recorded is its words alone. Every recorded message is said as written (the caption is
// the take), so anything that changes - a number, a price - rides underneath as a note, never inside the line.
// What leaves messages: the clerk (a new voice: the first-day van limit, bill night, the night before his pushing
// warning, a job when you let him ring), Buzz when you let him ring, and anybody else you let ring, in words.
// Only evening things: what happens at the dig or the rope stays on screen where you are.
const VM_LINES = {
  vm_machine_one: 'You have one new message.',
  vm_machine_more: 'You have new messages.',
  vm_clerk_firstday: 'It’s the office. The clerk. Today your van took everything you pulled. First days are like that. From tomorrow it holds forty, and not a pound more. What doesn’t fit stays at the door.',
  vm_clerk_bill: 'It’s the office. The weekly bill comes out tonight. The shed, the number, the gas card. Leave enough in the account and the van stays on the road.',
  vm_clerk_billowed: 'It’s the office. It’s bill night again, and you’re still behind. The van stays in the shop until you pay at the window. I’m not chasing you. I’m just saying.',
  vm_clerk_pushwarn: 'It’s the office. Come and see me in the morning, before you go out there. It’s nothing. It’s something.',
  vm_clerk_missed: 'It’s the office. There’s a job tomorrow if you want it. The key’s at the window.',
  vm_buzz_missed: 'It’s Buzz. Never mind. Forget I called. You didn’t hear anything.',
};
const VM_VO = Object.keys(VM_LINES);
const VM_READ = (t) => 1.6 + String(t).split(/ +/).length / 3.2;   // an unrecorded message stays long enough to read
function vmQueue(msg) {
  G.vmQueue = G.vmQueue || [];
  if (msg.slot && G.vmQueue.some((m) => m.slot === msg.slot)) return;   // the same message twice is one message
  G.vmQueue.push(msg);
}
function vmClerk(slot, note) { vmQueue({ from: 'clerk', slot, text: VM_LINES[slot], note: note || null }); }
// on the way in the door: what the office wants to say tonight (goHome)
function vmEvening() {
  const w = G.world;
  if (!w || G.demo) return;
  // bill night: a reminder before it comes out, and the amount under it (the take never says a number)
  if (G.day >= NUT_EVERY && G.day % NUT_EVERY === 0 && !(typeof yardOwned === 'function' && yardOwned())) {
    const amt = nutAmount(G.day);
    vmClerk(w.nut ? 'vm_clerk_billowed' : 'vm_clerk_bill', () => 'Tonight: ' + fmt$(amt) + (w.nut ? ', on top of the ' + fmt$(w.nut.owed) + ' you owe' : '') + '.  You have ' + fmt$(G.money) + '.');
  }
  // the night before his pushing warning: come and see me
  if (typeof PUSH_WARN_AT !== 'undefined') {
    const m = w.rivalMem = w.rivalMem || {}, tmr = G.day + 1;
    const n = countEvents('pushed', { sinceDay: tmr - PUSH_WARN_DAYS, where: (e) => e.day < tmr });
    const warnedLately = m.pushWarnDay != null && tmr - m.pushWarnDay < PUSH_WARN_DAYS;
    if (n >= PUSH_WARN_AT && !warnedLately && m.pushVmDay !== G.day) { m.pushVmDay = G.day; vmClerk('vm_clerk_pushwarn', 'You have pushed somebody ' + n + ' times this week.'); }
  }
}
// you let it ring: they leave a message instead
function vmMissed(c) {
  if (!c) return;
  if (c.kind === 'clerk') { vmClerk('vm_clerk_missed', 'The ' + c.family + ' family\'s unit: CLEAR THE UNIT is on the yard tomorrow.'); return; }
  if (c.kind === 'buzz') { vmQueue({ from: 'buzz', slot: 'vm_buzz_missed', text: VM_LINES.vm_buzz_missed }); return; }
  let text = null, from = c.who || 'caller';
  if (c.kind === 'tenant') { from = 'caller'; text = 'Hello? This is ' + c.name + '. You bought unit ' + c.unit + '. There’s a ' + c.noun + ' in there that was mine. I’ll try the office.'; }
  else if (c.kind === 'bribe') text = (CALL_OPENERS[c.who] || 'It’s ' + c.nameShort + '.') + ' Call me. Or don’t. The offer’s gone at midnight.';
  else if (c.kind === 'favour') text = (CALL_OPENERS[c.who] || 'It’s ' + c.nameShort + '.') + ' I was going to ask you something. Never mind.';
  else if (c.kind === 'buyer') text = 'It’s ' + c.buyerName + '. About a ' + c.thing + '. I’ll put it in the paper, then.';
  if (text) vmQueue({ from, name: c.name || c.buyerName || null, slot: null, text });
}
// once the garage has said everything else, the machine plays
function vmTick() {
  if (G.mode !== 'sell' || G.vm || G.call || !(G.vmQueue && G.vmQueue.length)) return false;
  if (G.modal || G.homeInspect || G.pendingUnpack || G.holdNotice || G.bayNotice || G.cardQueued) return false;
  G.vm = { list: G.vmQueue.splice(0), i: -1, t: 0, started: false, back: 'sell' };
  G.mode = 'voicemail';
  _musicDuck = 0.3;
  return true;
}
function vmCur() { const v = G.vm; return v && v.i >= 0 ? v.list[v.i] : null; }
function vmRecorded(m) { return !!(m && m.slot && typeof voEl === 'function' && voEl(m.slot)) && !_muted && !_voiceMuted && VOL.voice > 0; }
function vmPlay() {
  const v = G.vm;
  if (!v) return;
  v.t = 0; v.started = true;
  if (typeof voFlush === 'function') voFlush(true);
  if (v.i < 0) {
    const slot = v.list.length === 1 ? 'vm_machine_one' : 'vm_machine_more';
    v.rec = vmRecorded({ slot });
    if (v.rec) speak([slot], false, { cooldown: 0, kind: 'line' });
    play('vm_beep', 0.6);
    return;
  }
  const m = vmCur();
  play('vm_beep', 0.6);
  v.rec = vmRecorded(m);
  v.speakAt = v.rec ? 0.55 : null;                                   // the beep, then the voice
}
function vmNext() {
  const v = G.vm;
  if (!v) return;
  v.i++;
  if (v.i >= v.list.length) { vmEnd(); return; }
  vmPlay();
}
function vmEnd() {
  const v = G.vm;
  if (typeof voFlush === 'function') voFlush(true);
  G.vm = null;
  _musicDuck = 1;
  G.mode = (v && v.back) || 'sell';
}
function vmFromName(m) {
  if (m.from === 'clerk') return 'THE CLERK';
  if (m.from === 'buzz') return 'BUZZ KETTLEMAN';
  if (m.from === 'caller') return (m.name || 'SOMEBODY').toUpperCase();
  const b = typeof BUYERS !== 'undefined' && BUYERS.find((x) => x.id === m.from);
  if (b) return b.name.toUpperCase();
  const d = rivalDef(m.from);
  return (d ? d.name : m.from).toUpperCase();
}
// the machine itself, drawn: it needs no art
function drawVmMachine(cx, cy, s, blink) {
  const w = 150 * s, h = 64 * s, x = cx - w / 2, y = cy - h / 2;
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 3 * s, y + 3 * s, w - 6 * s, h - 6 * s, '#2e3246');
  px(g, x + 12 * s, y + 12 * s, 44 * s, 26 * s, '#1a1c28');                    // the tape window
  px(g, x + 18 * s, y + 18 * s, 12 * s, 12 * s, '#4a5068'); px(g, x + 38 * s, y + 18 * s, 12 * s, 12 * s, '#4a5068');
  for (let k = 0; k < 4; k++) px(g, x + 68 * s + k * 18 * s, y + 16 * s, 12 * s, 8 * s, '#4a5068');   // buttons
  px(g, x + 68 * s, y + 34 * s, 66 * s, 10 * s, '#1a1c28');
  px(g, x + w - 20 * s, y + 8 * s, 8 * s, 8 * s, blink ? PAL.red : '#5a2020');   // the light
}
function drawVmLeft(m) {
  const x0 = 26, y0 = 44, w0 = 330, h0 = 392;
  px(g, x0, y0, w0, h0 + 70, 'rgba(12,12,20,0.7)');
  if (!m) {
    drawVmMachine(x0 + w0 / 2, y0 + 190, 1.8, Math.floor(G.time * 2) % 2 === 0);
    T(x0 + w0 / 2, y0 + h0 + 14, 'THE MACHINE', PAL.white, 20, 'center', true);
    T(x0 + w0 / 2, y0 + h0 + 42, 'on the garage wall, under the phone', PAL.gray, 13, 'center');
    return;
  }
  const id = m.from === 'caller' ? 'caller' : m.from;
  const im = (m.from !== 'clerk' && m.from !== 'caller' && typeof npcCutout === 'function') ? npcCutout(m.from) : null;
  if (im && im.height) {
    const hh = h0 - 6, ww = Math.round(hh * im.width / im.height);
    g.drawImage(im, Math.round(x0 + (w0 - ww) / 2), y0 + 4, ww, hh);
  } else drawPortrait(id, x0 + 25, y0 + 50, 280, 280);
  const fl = fitLines(vmFromName(m), w0 - 20, [20, 17, 15], 1, true);
  T(x0 + w0 / 2, y0 + h0 + 14, fl.lines[0], PAL.white, fl.fs, 'center', true);
  T(x0 + w0 / 2, y0 + h0 + 42, 'left a message', PAL.gray, 13, 'center');
}
function drawVoicemail(dt) {
  const v = G.vm;
  if (!v) { G.mode = 'sell'; return; }
  if (!v.started) vmPlay();
  v.t += dt;
  const m = vmCur();
  if (v.speakAt != null && v.t >= v.speakAt) { v.speakAt = null; if (m && m.slot) speak([m.slot], false, { cooldown: 0, kind: 'line' }); }
  if (!drawBG()) px(g, 0, 0, W, H, '#151220');
  px(g, 0, 0, W, H, 'rgba(6,6,12,0.74)');
  drawHeader('HOME');
  drawVmLeft(m);
  const RX = 380, RW = W - RX - 26;
  px(g, RX - 8, 44, RW + 16, H - 60, 'rgba(18,20,30,0.92)');
  px(g, RX - 8, 44, RW + 16, 28, '#2a3048');
  const text = v.i < 0 ? (v.list.length === 1 ? VM_LINES.vm_machine_one : VM_LINES.vm_machine_more) : m.text;
  const read = VM_READ(text);
  const done = v.rec ? (v.t > 0.9 && voIdle() && v.speakAt == null) : v.t > (v.i < 0 ? 1.8 : read);
  if (v.i < 0) {
    T(RX + 6, 50, 'THE MACHINE  ·  ' + v.list.length + ' NEW', PAL.yellow, 14, 'left', true);
    drawVmMachine(RX + RW / 2, 170, 1.4, true);
    T(RX + RW / 2, 250, '"' + text + '"', PAL.white, 20, 'center', true);
    if (done) { vmNext(); return; }
    hot(0, 0, W, H, () => vmNext(), { focusable: false, label: 'the machine' });
    return;
  }
  T(RX + 6, 50, 'THE MACHINE  ·  MESSAGE ' + (v.i + 1) + ' OF ' + v.list.length, PAL.cyan, 14, 'left', true);
  // the words, arriving with the beep; a small tape running while it plays
  const playing = v.t < 0.55 || !done;
  drawVmMachine(RX + RW - 70, 108, 0.7, playing && Math.floor(G.time * 4) % 2 === 0);
  if (v.t > 0.35) {
    let y = 140;
    y += callBubble(RX, y, RW - 60, text, false) + 12;
    const note = typeof m.note === 'function' ? m.note() : m.note;
    if (note) {
      const nl = wrapPx(note, RW - 20, 14);
      for (let k = 0; k < nl.length; k++) T(RX + 4, y + k * 18, nl[k], PAL.yellow, 14, 'left');
    }
  }
  const last = v.i >= v.list.length - 1;
  const bw = 180;
  if (m.slot && v.rec !== undefined && vmRecorded(m)) button(RX + RW / 2 - bw - 8, H - 70, bw, 38, 'PLAY AGAIN', () => vmPlay(), { col: PAL.slate, fs: 15 });
  button(RX + RW / 2 + 8, H - 70, bw, 38, last ? 'DONE' : 'NEXT ▸', () => vmNext(), { col: PAL.dgreen, fs: 16 });
  if (!done) T(RX + RW / 2, H - 22, 'playing...', PAL.dgray, 12, 'center');
}

// ---- the screen: the caller large on the left, the conversation on the right ----
function callBubble(x, y, maxW, text, mine) {
  const lines = wrapPx(text, maxW - 24, 15);
  const h = 12 + lines.length * 19;
  g.font = textSize(15) + 'px ' + FONT;
  let w = 0;
  for (const ln of lines) w = Math.max(w, g.measureText(ln).width);
  w = Math.min(maxW, Math.ceil(w) + 24);
  const bx = mine ? x + maxW - w : x;
  px(g, bx, y, w, h, mine ? '#2c4a3a' : '#e8dfc8');
  px(g, bx, y, w, 2, mine ? '#3e6650' : '#f6efdd');
  for (let i = 0; i < lines.length; i++) T(bx + 12, y + 7 + i * 19, lines[i], mine ? PAL.white : '#2a2320', 15, 'left');
  return h;
}
function drawCallerLeft(c, reveal) {
  const x0 = 26, y0 = 44, w0 = 330, h0 = 392;
  px(g, x0, y0, w0, h0 + 70, 'rgba(12,12,20,0.7)');
  if (!reveal) {
    // nobody knows who it is until the phone is picked up: a shape in lamplight, and a question
    drawPortrait('caller', x0 + 25, y0 + 50, 280, 280);
    T(x0 + w0 / 2, y0 + h0 + 14, 'WHO IS IT?', PAL.white, 20, 'center', true);
    T(x0 + w0 / 2, y0 + h0 + 42, 'you will not know until you pick up', PAL.gray, 13, 'center');
    return;
  }
  if (c.kind === 'buyer') {
    // the dealer, from the buyers' row, big, and how close they are to being a regular of yours
    drawPortrait(c.who, x0 + 25, y0 + 50, 280, 280);
    T(x0 + w0 / 2, y0 + h0 + 14, c.buyerName.toUpperCase(), PAL.white, 20, 'center', true);
    const n = ((G.world.regulars || {})[c.who]) || 0;
    const reg = typeof REGULAR_AT !== 'undefined' ? REGULAR_AT : 3;
    T(x0 + w0 / 2, y0 + h0 + 42, n >= reg ? 'a regular of yours' : (n ? n + ' of ' + reg + ' deliveries to be a regular' : 'you have never sold them a thing'), n >= reg ? PAL.green : PAL.gray, 13, 'center');
  } else if (c.kind === 'clerk') {
    // the man at the office window, off duty, and how well he knows you
    drawPortrait('clerk', x0 + 25, y0 + 50, 280, 280);
    T(x0 + w0 / 2, y0 + h0 + 14, 'THE CLERK', PAL.white, 20, 'center', true);
    const tier = typeof clerkTier === 'function' ? clerkTier() : 'stranger';
    T(x0 + w0 / 2, y0 + h0 + 42, CLERK_TIER_WORDS[tier], tier === 'stranger' ? PAL.gray : PAL.cyan, 13, 'center');
  } else if (c.kind === 'buzz') {
    // the house auctioneer: his own portrait, big, and what he is to you this week
    const im = typeof npcCutout === 'function' ? npcCutout('buzz') : null;
    if (im && im.height) {
      const hh = h0 - 6, ww = Math.round(hh * im.width / im.height);
      g.drawImage(im, Math.round(x0 + (w0 - ww) / 2), y0 + 4, ww, hh);
    } else drawPortrait('buzz', x0 + 25, y0 + 50, 280, 280);
    T(x0 + w0 / 2, y0 + h0 + 14, 'BUZZ KETTLEMAN', PAL.white, 20, 'center', true);
    T(x0 + w0 / 2, y0 + h0 + 42, buzzSoreNow() ? 'still sore about the last call' : 'the house auctioneer, off the clock', buzzSoreNow() ? PAL.orange : PAL.gray, 13, 'center');
  } else if (c.kind === 'bribe' || c.kind === 'favour') {
    const im = typeof npcCutout === 'function' ? npcCutout(c.who) : null;
    if (im && im.height) {
      const hh = h0 - 6, ww = Math.round(hh * im.width / im.height);
      g.drawImage(im, Math.round(x0 + (w0 - ww) / 2), y0 + 4, ww, hh);
    } else drawPortrait(c.who, x0 + 25, y0 + 50, 280, 280);
    const def = rivalDef(c.who);
    T(x0 + w0 / 2, y0 + h0 + 14, (def ? def.name : c.who).toUpperCase(), PAL.white, 20, 'center', true);
    const sv = standingOf(c.who);
    T(x0 + w0 / 2, y0 + h0 + 42, standingLabel(sv), sv < 0 ? PAL.orange : (sv > 0 ? PAL.green : PAL.gray), 13, 'center');
  } else {
    // a tenant has no face in this game, only a voice and a unit number: they stay a shape in the lamplight
    drawPortrait('caller', x0 + 25, y0 + 50, 280, 280);
    const fl = fitLines(c.name.toUpperCase(), w0 - 20, [20, 17, 15], 1, true);
    T(x0 + w0 / 2, y0 + h0 + 14, fl.lines[0], PAL.white, fl.fs, 'center', true);
    T(x0 + w0 / 2, y0 + h0 + 42, 'unit ' + c.unit + '’s tenant', PAL.gray, 13, 'center');
  }
}
function drawPhone(dt) {
  const k = G.call;
  if (!k) { G.mode = 'sell'; return; }
  const c = k.c;
  k.t += dt;
  if (!drawBG()) px(g, 0, 0, W, H, '#151220');
  px(g, 0, 0, W, H, 'rgba(6,6,12,0.74)');
  drawHeader('HOME');
  hot(0, 0, W, H, () => {                                            // a click hurries the caller along
    if (k.state === 'talk' && k.shown < callLines(c).length) { k.shown = callLines(c).length; }
  }, { focusable: false, label: 'the phone' });
  const RX = 380, RW = W - RX - 26;
  px(g, RX - 8, 44, RW + 16, H - 60, 'rgba(18,20,30,0.92)');
  px(g, RX - 8, 44, RW + 16, 28, '#2a3048');

  if (k.state === 'ringing') {
    drawCallerLeft(c, false);
    T(RX + 6, 50, 'THE PHONE  ·  RINGING', PAL.yellow, 14, 'left', true);
    // it rings, pauses, rings: a sound you know from across a room
    if (k.t - k.ringAt >= CALL_RING_GAP) {
      k.ringAt = k.t; k.rings++;
      if (k.rings > CALL_RINGS) { callLetRing(); return; }
      play('phone_ring', 0.8);
    }
    const shake = (k.t - k.ringAt) < 1.1 ? Math.round(Math.sin(k.t * 55) * 4) : 0;
    const hx = RX + RW / 2 + shake, hy = 190;
    px(g, hx - 70, hy - 24, 140, 30, PAL.ink);                        // the handset, drawn: it needs no art
    px(g, hx - 66, hy - 20, 132, 22, '#3a3f58');
    px(g, hx - 74, hy - 30, 36, 44, '#3a3f58'); px(g, hx + 38, hy - 30, 36, 44, '#3a3f58');
    px(g, hx - 50, hy + 16, 100, 70, '#2a2e40'); px(g, hx - 42, hy + 24, 84, 54, '#1c1f2c');
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) px(g, hx - 30 + q * 22, hy + 30 + r * 16, 14, 10, '#4a5068');
    T(RX + RW / 2, 300, 'The phone on the garage wall is ringing.', PAL.white, 18, 'center', true);
    T(RX + RW / 2, 326, k.rings > 1 ? 'Ring ' + Math.min(k.rings, CALL_RINGS) + ' of ' + CALL_RINGS + '.' : 'Nobody rings here.', PAL.gray, 14, 'center');
    button(RX + RW / 2 - 200, 380, 190, 44, 'PICK UP', () => callPickUp(), { col: PAL.dgreen, fs: 18 });
    button(RX + RW / 2 + 10, 380, 190, 44, 'LET IT RING', () => callLetRing(), { col: PAL.slate, fs: 16 });
    T(RX + RW / 2, 436, 'letting it ring is an answer too. They know you were home.', PAL.dgray, 12, 'center');
    return;
  }

  drawCallerLeft(c, true);
  T(RX + 6, 50, k.state === 'close' ? 'THE PHONE  ·  ON THE LINE' : 'THE PHONE  ·  ON THE LINE', PAL.cyan, 14, 'left', true);
  const lines = callLines(c);
  // the caller's lines arrive one at a time; a click brings the rest
  if (k.state === 'talk' && k.shown < lines.length && k.t - k.lineAt >= CALL_LINE_GAP) { k.shown++; k.lineAt = k.t; }
  const said = lines.slice(0, k.state === 'talk' ? k.shown : lines.length).map((t) => ({ t, mine: false }));
  if (k.state === 'close') {
    said.push({ t: callSay(c) || '...', mine: true });
    said.push({ t: callClose(c) || '', mine: false });
  }
  // the conversation, newest at the bottom; the oldest scroll off the top if it runs long
  const top = 84, bottom = k.state === 'talk' && k.shown >= lines.length ? 378 : 470;
  const hs = said.map((s) => { g.font = textSize(15) + 'px ' + FONT; return 12 + wrapPx(s.t, RW - 24 - 60, 15).length * 19; });
  let total = 0, from = said.length;
  while (from > 0 && total + hs[from - 1] + 10 <= bottom - top) { from--; total += hs[from] + 10; }
  let y = top;
  for (let i = from; i < said.length; i++) y += callBubble(RX + (said[i].mine ? 60 : 0), y, RW - 60, said[i].t, said[i].mine) + 10;

  if (k.state === 'talk' && k.shown >= lines.length) {
    const ans = CALL_KINDS[c.kind].answers(c);
    const bw = Math.floor((RW - 12) / 2);
    CALL_ANSWER_ORDER.forEach((a, i) => {
      const r = ans[a], bx = RX + (i % 2) * (bw + 12), by = 388 + Math.floor(i / 2) * 70;
      button(bx, by, bw, 32, r.label, () => callAnswer(a), { col: PAL[r.col], fs: 14 });
      const fl = fitLines(r.hint, bw - 4, [12, 12], 2);
      for (let q = 0; q < fl.lines.length; q++) T(bx + 2, by + 36 + q * 14, fl.lines[q], PAL.gray, fl.fs, 'left');
    });
  } else if (k.state === 'talk') {
    T(RX + RW / 2, 450, 'click to hear the rest', PAL.dgray, 12, 'center');
  }
  if (k.state === 'close' && k.t > 0.6) button(RX + RW / 2 - 90, H - 60, 180, 36, 'HANG UP', () => callHangUp(), { col: PAL.slate, fs: 16 });
}
