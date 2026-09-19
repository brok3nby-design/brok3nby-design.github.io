// ---- clues: what a thing tells you when you lift it, and what it says up close ----
// Nothing here is a stat. A box that rattles is a box that rattles; whether
// you stop and think about it is the game. Every line is seeded on the item,
// so the same box says the same thing every time you pick it up.
'use strict';

// ---- sensory tells (the dig panel): weight, sound, and the shape of a false bottom ----
// Lines that should change a LOAD/LEAVE decision are "strong"; the day's generator
// lets one box a day say one of those (it.tellOk). Everything else stays a murmur.
const STRONG_TELLS = ['The bottom sounds wrong. Thick.', 'You feel the corner of something tucked inside.',
  'Paper slides around in there.', 'Something metallic knocks against the side.', 'Something small rolls when you tilt it.',
  'Heavy. Whatever is in there, there is a lot of it.', 'Heavier than it looks.'];
function sensoryStrength(it) {
  if (it.legendary || it.fake || it.lux) return 'ceremony';
  const s = _sensoryRaw(it);
  return s && STRONG_TELLS.includes(s) ? 'strong' : (s ? 'soft' : null);
}
function sensoryLine(it) {
  const s = _sensoryRaw(it);
  if (!s || it.legendary || it.fake || it.lux || it.tellOk || !STRONG_TELLS.includes(s)) return s;
  // over budget: the box still makes a sound, just not a useful one
  return it.loot && it.loot.length ? 'Something shifts inside.' : null;
}
function _sensoryRaw(it) {
  const seed = it.hseed || it.uid * 977;
  const R = RNG(seed + 91);
  // the myths: heavy. The fakes: usually heavy too. Usually.
  if (it.legendary || it.fake) {
    if (it.fake && R.chance(0.25)) return 'Lighter than you expected.';
    return 'Heavier than it looks.';
  }
  if (it.lux) return R.chance(0.5) ? 'Lighter than it looks.' : null;
  // a false bottom that is really there: the same roll LOOK CLOSER will make
  if (HIDDEN_RATES[it.base] && !it.locked && RNG(seed + 31).chance(HIDDEN_RATES[it.base])) {
    if (R.chance(0.7)) return 'The bottom sounds wrong. Thick.';
  }
  if (it.loot && it.locked) {
    let v = 0; for (const l of it.loot) v += l.val;
    return v >= 300 ? 'Heavy. Whatever is in there, there is a lot of it.' : 'Heavy, the way a safe is heavy.';
  }
  if (it.loot && it.loot.length) {
    let v = 0; for (const l of it.loot) v += l.val;
    const opts = [];
    if (it.loot.some((l) => l.cash)) opts.push('Paper slides around in there.');
    if (it.loot.some((l) => METAL_BASES.includes(l.base))) opts.push('Something metallic knocks against the side.');
    if (it.loot.some((l) => l.cat === 'jewelry')) opts.push('Something small rolls when you tilt it.');
    if (v >= 400) opts.push('Heavier than it looks.');
    opts.push('Something shifts inside.');
    return R.chance(0.8) ? R.pick(opts) : null;
  }
  if (it.container && it.loot && !it.loot.length) return R.chance(0.35) ? 'Hollow. It rattles like an empty thing.' : null;
  // a rummage that will really find something: the same roll again
  if (!it.container && RNG(seed + 53).chance(0.18)) {
    return R.chance(0.5) ? 'You feel the corner of something tucked inside.' : null;
  }
  return null;
}

// ---- the mark at home: the rummage or the false bottom that will really find something ----
// The same two rolls LOOK CLOSER makes (inspectZoneClick), asked ahead of time, so the haul
// can put a small mark on the few things worth ten more seconds — and none on the rest.
// A sealed box is not marked until it is unpacked; a locked one never is.
function worthALook(it) {
  if (!it || it.cash || it.legendary || it.setComplete || it.locked || it.loot) return false;
  const seed = it.hseed || it.uid * 977;
  if (!it.rummaged && RNG(seed + 53).chance(0.18)) return true;
  if (HIDDEN_RATES[it.base] && !it.hiddenChecked && RNG(seed + 31).chance(HIDDEN_RATES[it.base])) return true;
  return false;
}

// fully inspected: nothing left that LOOK CLOSER could do to it — appraised, gone through,
// the false bottom (if it could have one) checked, the box emptied, the pile flipped.
// The check on the haul cell; the dot above is the opposite state.
function fullyInspected(it) {
  if (!it || it.cash || it.locked) return false;
  if (!it.searched) return false;
  if (it.loot) return false;
  if (it.container && !it.opened) return false;
  if (MEDIA_KINDS[it.base] && !it.mediaDone) return false;
  if (!it.rummaged && !it.legendary && !it.setComplete) return false;
  if (HIDDEN_RATES[it.base] && !it.hiddenChecked) return false;
  return true;
}

// ---- detail lines (LOOK CLOSER): a year, a serial, a name. Information first, meaning later. ----
// ---- the appraiser names the tell, once per door ----
// The first thing appraised out of a locker gets one extra sentence: what
// kind of person packed it, and which thing in the doorway said so. It is the
// world confirming a read, never a score. Mixed owners and authored doors
// carry no tell (they would lie), and each door says it once.
const ARCH_TELL_LINES = {
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
function appraiserTell(it) {
  if (!it.fromTell || !it.fromArch || !ARCH_TELL_LINES[it.fromArch]) return null;
  const key = it.fromDay + '_' + it.fromUnit;
  const w = G.world;
  w.tellSaid = w.tellSaid || {};
  if (w.tellSaid[key]) return null;
  w.tellSaid[key] = true;
  return ARCH_TELL_LINES[it.fromArch].replace('{door}', it.fromTell);
}

const DETAILS = {
  music: ['Serial {serial} on the plate.', 'A set list taped inside the case: {town}, {year}.',
          'Initials scratched where a thumb would rest: "{init}".', 'A repair tag from {year}, still tied on.'],
  furniture: ['Pencil inside the drawer: "{init}, {year}".', "Movers' chalk on the back: {town}.",
              'A child\'s height marks up one side. The last one says {year}.', 'A maker\'s stamp under the top, half sanded off.'],
  antiques: ['A dealer\'s ticket, {year}, faded to almost nothing.', 'Engraved on the base: "{init}".',
             'An auction lot number from {town}, still glued on.', 'A hairline repair, done well, done long ago.'],
  electronics: ['Serial {serial}. Repair tag from {year}.', 'A name written on the underside in marker: "{init}".',
                'Warranty card in the back panel, never sent. {town}.', 'The dial stops at one station. Somebody\'s station.'],
  tools: ['"{init}" burned into the handle.', 'A union sticker from {town}.',
          'Date stamped in the steel: {year}.', 'The grip is worn to the shape of one hand.'],
  jewelry: ['Engraved inside: "{init}".', 'A jeweler\'s mark from {town}.',
            'The clasp was replaced. The stones were not.', 'A tiny date on the pin: {year}.'],
  collectibles: ['Dated {year} in pencil on the back.', 'A price tag from {town}: forty cents.',
                 'Signed, illegibly, next to "{init}".', 'A newspaper clipping folded inside. {year}.'],
  weird: ['A label, handwritten, one word you cannot read.', 'Somebody wrote a date on it. {year}. Then crossed it out.',
          'Initials: "{init}". Or a warning. Hard to say.', 'It has been repaired. You cannot tell what was broken.',
          'A price tag from {town}. The price has been scratched off by a fingernail.', 'It is warm. It should not be warm.'],
};
// a second helping of details, folded into the first
DETAILS.music.push('A capo left on the third fret. Somebody was mid-song.', 'A phone number on the inside of the case, {town} exchange.');
DETAILS.furniture.push('Under the drawer, a child\'s drawing of a dog. {year}.', 'One leg has been replaced. Well. By somebody who cared.');
DETAILS.antiques.push('A museum accession number, painted over.', 'Initials in the felt underneath: "{init}", and a date, {year}.');
DETAILS.electronics.push('The knob has been turned so often the numbers are gone.', 'A radio station\'s sticker from {town}. Off the air since {year}.');
DETAILS.tools.push('Somebody taped a photo of a dog inside the lid.', 'Sharpened by hand, and often. The edge is a different color.');
DETAILS.jewelry.push('An inscription, half worn: "...always". The first word is gone.', 'The box is from a jeweler in {town} that closed in {year}.');
DETAILS.collectibles.push('A checklist in the back. Every box ticked but one.', 'A dedication: "to {init}, who will understand."');
const _DETAIL_TOWNS = ['Dusty Flats', 'Salt Lick', 'Red Mesa', 'Gypsum City', 'Bent Fork', 'Marrow Creek', 'Vermillion', 'Kettle Basin', 'Chrome Springs'];
// one detail in five names a town, and it is a town you have been to: the world connects up
const TOWN_DETAILS = [
  'A ticket stub in the lining: {town}, row F.',
  'A price tag from a shop in {town}. Half off, then half off again.',
  'A postcard from {town}, used as a coaster. "Wish you were here." Signed by nobody.',
  'Stamped underneath: RENTAL — {town}. Never returned.',
  'A matchbook from a motel in {town}. Two matches left.',
  'A bus schedule for {town}, folded to one departure. Circled.',
];
function _detailTown(R) {
  const visited = ((G.world && G.world.visited) || []).map((id) => (TOWNS[id] || {}).name).filter(Boolean);
  return visited.length ? visited[R.i(0, 99) % visited.length] : R.pick(_DETAIL_TOWNS);
}
function detailLine(it) {
  if (it.cash || it.legendary || it.fake || it.set || it.setComplete || it.named || it.lux) return null;
  const t = DETAILS[it.cat];
  if (!t) return null;
  const R = RNG((it.hseed || it.uid * 977) + 7);
  if (!R.chance(0.45)) return null;
  const A = 'ABCDEFGHJKLMNPRSTVW';
  const pool = R.chance(0.2) ? TOWN_DETAILS : t;
  return R.pick(pool)
    .replace('{year}', String(R.i(1931, 1994)))
    .replace('{serial}', String(R.i(1000, 99999)))
    .replace('{init}', A[R.i(0, A.length - 1)] + '.' + A[R.i(0, A.length - 1)] + '.')
    .replace('{town}', _detailTown(R));
}
