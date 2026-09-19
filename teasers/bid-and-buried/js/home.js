// ---- home inspection: home is Unpacking ----
// The yard is a dirty five-minute look through a door. Home is where you take
// a thing apart. Depth is uneven on purpose: a garbage bag is two clicks,
// a steamer trunk is a short story.
'use strict';

// named compartments per base — loot is split across these, opened one by one
const INSPECT_ZONES = {
  dresser:     ['top drawer', 'middle drawer', 'bottom drawer'],
  wardrobe:    ['left door', 'right door'],
  trunk:       ['lift the tray', 'under the tray'],
  filing:      ['top drawer', 'middle drawer', 'bottom drawer'],
  suitcase:    ['main compartment', 'side pocket'],
  box:         ['open the flaps'],
  crate:       ['pry the lid'],
  garbage:     ['untie the bag'],
  guitarCase:  ['unlatch the case'],
  vinylCrate:  ['flip through the records'],
  till:        ['pop the drawer'],
  barrel:      ['look inside'],
  diningTable: ['the shallow drawer'],
  // the consoles: one slot each
  woodConsole: ['the cartridge slot'], greyConsole: ['the cartridge slot'], masterConsole: ['the cartridge slot'],
  snesConsole: ['the cartridge slot'], genesisConsole: ['the cartridge slot'], n64Console: ['the cartridge slot'],
  gameboyHandheld: ['the cartridge slot'], gamegearHandheld: ['the cartridge slot'],
  psxConsole: ['the disc tray'], dreamConsole: ['the disc tray'],
};
// where a false bottom might plausibly hide, and how often it actually does
const HIDDEN_RATES = {
  trunk: 0.25, dresser: 0.15, suitcase: 0.18, filing: 0.12,
  wardrobe: 0.12, box: 0.05, crate: 0.08, guitarCase: 0.15,
};

// really going through a thing — every item gets one honest rummage.
// This is where the tucked-away money lives (the appraiser only prices things).
const RUMMAGE_LABELS = {
  furniture: 'check under and behind',
  antiques: 'look it over for marks',
  music: 'open every latch and flap',
  tools: 'shake out the case',
  electronics: 'pop the back panel',
  jewelry: 'check the box and clasp',
  collectibles: 'go through it piece by piece',
  weird: 'examine it. carefully.',
  junk: 'give it a proper shake',
};

// ---- media titles. Entries: [title, note, artId?] / keepers add [lo, hi] ----
// An artId means the title has a COVER: drop pixel art in media\md_<artId>.png
// (64x88) and the case shows it when unpacked. No artId = generic filler case.
const TAPE_TITLES = [
  ["WEDDING '8{n}", 'taped over with fishing shows'],
  ['BUCKAROO BONANZA {n}', 'a rental. never returned.', 'buckaroo'],
  ["JUNIOR'S FIRST STEPS", 'the label is in two handwritings'],
  ['AEROBICS: FEEL THE BURN', 'the spine is worn white', 'aerobics'],
  ['CHRISTMAS {n}{n2}', 'someone wrote "the good one"'],
  ['TAPE 4 (DO NOT WATCH)', 'no other label'],
  ['COUNTY FAIR HIGHLIGHTS', 'tracking damage, probably'],
  ['THE BIG GAME', 'recorded off channel 6'],
  ['HOME MOVIES: LAKE TRIP', 'sand in the case'],
  ['M*A*S*H FINALE + NEWS', 'everyone taped this one'],
  ['GARDEN TIPS W/ DOLORES', 'a sticky note: "return to Dolores"'],
  ['[NO LABEL]', 'rewound, at least'],
  ['GRADUATION + 20 MIN OF STATIC', 'the static is the good part, somebody wrote'],
  ["DAD'S SHOWS DO NOT TAPE OVER", 'taped over. twice.'],
  ['SOAP OPERAS, WEEK OF THE 14TH', 'labeled in three colors of ink'],
  ['THE LAKE HOUSE (NOT THE MOVIE)', 'an actual lake house. an actual family. a long summer'],
];
const TAPE_KEEPERS = [
  // the five movies of the decade, on tape (MOVIES in items.js; the sixth field is the movie id, for the books)
  ['THE GOONDOCK KIDS', 'rental sticker still on it. the late fee, by now, is a house', 30, 75, 'goondocks', 'goondocks'],
  ["FERRIS WHEELER'S DAY OFF", 'recorded off cable, ads and all. the ads are the good part now', 25, 65, 'ferris', 'ferris'],
  ['BUNK BROTHERS', 'somebody wrote "prestige" on the label and underlined it', 20, 55, 'bunk', 'bunk'],
  ['NEBRASKA JONES AND THE LOST LOCKER', 'the tape is worn at one scene. you know which', 35, 80, 'nebraska', 'nebraska'],
  ['SPACE MEATBALLS', 'the case has been chewed, possibly by the tenant', 25, 65, 'meatballs', 'meatballs'],
  ['SEALED: MOONBEAM RANGERS', 'still in shrink wrap. collectors circle this one', 45, 90, 'moonbeam'],
  ["'74 TITLE FIGHT (MASTER)", 'a broadcast master. someone will want this', 60, 120, 'titlefight'],
  ['BANNED TOY COMMERCIAL REEL', 'pulled from air. very sought after', 40, 85, 'toyreel'],
  ['LOCAL UFO FOOTAGE, RAW', 'grainy. famous. never debunked', 50, 110, 'ufo'],
  ['CHANNEL 9 OUTTAKES, DO NOT AIR', 'they aired. once. the station still gets letters', 40, 95, 'channel9'],
];
const DVD_TITLES = [
  ['BUCKAROO BONANZA: THE MOVIE', 'the case is empty. of course it is', 'buckaroo'],
  ['ULTIMATE ABS {n}', 'unopened since the resolution'],
  ['DIE HARDER-ISH', 'a rental store sleeve inside', 'dieharderish'],
  ['REGIONAL INSURANCE TRAINING VOL {n}', 'someone kept this on purpose'],
  ['KARAOKE HITS OF THE {n}0S', 'disc is in backwards', 'karaoke'],
  ["SOMEBODY'S WEDDING (BURNED COPY)", 'sharpie label, two names crossed out'],
  ['SHARK TORNADO {n}', 'the spine is sun-bleached white', 'sharktornado'],
  ['[NO CASE, JUST DISCS]', 'a spindle of mysteries'],
  ['YOGA FOR THE INFLEXIBLE', 'the disc is scratched only at the beginning'],
  ['COUNTY FAIR: THE DOCUMENTARY', 'runtime four hours. it was a good year'],
  ['COMEDY SPECIAL (RECALLED)', 'the jokes are fine. the special guest was not'],
];
const DVD_KEEPERS = [
  // the same five, on disc, with the extras nobody watched
  ['THE GOONDOCK KIDS: SPECIAL EDITION', 'two discs. the second one is a map. the map is wrong', 25, 60, 'goondocks', 'goondocks'],
  ["FERRIS WHEELER'S DAY OFF (ANNIVERSARY)", 'a commentary track by the car', 20, 50, 'ferris', 'ferris'],
  ['BUNK BROTHERS: UNRATED', 'unrated means longer. it did not need to be longer', 15, 45, 'bunk', 'bunk'],
  ['NEBRASKA JONES: THE COLLECTION', 'four films in one case. the fourth disc is missing. good', 30, 70, 'nebraska', 'nebraska'],
  ['SPACE MEATBALLS: THE DISC', 'the menu screen plays a joke for eleven minutes before it lets you in', 20, 55, 'meatballs', 'meatballs'],
  ['DIRECTOR\'S CUT, RECALLED PRINT', 'recalled over a lawsuit. collectors hunt it', 40, 90, 'recalledcut'],
  ['SEALED FIRST PRESSING, HOLO COVER', 'the hologram cover run. worth real money', 50, 110, 'holopress'],
  ['CRITERION-LOOKING BOX SET', 'numbered spine. somebody catalogs these', 45, 95],
];
const CASSETTE_TITLES = [
  ['ROAD TRIP MIX {n}', 'track list in ballpoint, fading', 'roadmix'],
  ['FOR JUNE (DO NOT PLAY)', 'the label says everything and nothing'],
  ["PASTOR'S SERMONS, JULY", 'recorded over something louder'],
  ['GUITAR IDEAS {n}AM', 'mostly humming. some genius, maybe'],
  ['ANSWERING MACHINE BACKUP', 'sixteen beeps of other people\'s lives'],
  ['SPANISH LESSON {n}', 'stops abruptly at lesson three'],
  ['WEDDING BAND DEMO', 'they were tighter than you\'d think', 'weddingband'],
  ['[UNLABELED, CHEWED]', 'the tape hangs out like a tongue'],
  ['SONGS FOR THE DRIVE HOME', 'side B is one song, nine times'],
  ['DICTATION: MEMOIR, CH. 1-3', 'the M is mispronounced every time. on purpose, maybe'],
  ['BIRDS OF THE COUNTY (FIELD RECORDING)', 'one of the birds is a man'],
];
const CASSETTE_KEEPERS = [
  ['LOCAL PUNK DEMO, 12 COPIES MADE', 'the band got famous. this did not', 55, 130, 'punkdemo'],
  ['RADIO AIRCHECK, THE LAST NIGHT', 'the station burned down the next day', 40, 90],
  ['UNRELEASED SONG (REAL? MAYBE)', 'sounds a lot like somebody famous', 60, 140, 'unreleased'],
];
const BLURAY_TITLES = [
  ['4K REMASTER: EXPLOSIONS III', 'the plastic still smells new', 'explosions'],
  ['PRESTIGE DRAMA, SEASON {n}', 'watched once, judged forever'],
  ['STEELBOOK, SLIGHTLY DENTED', 'the dent is the story'],
  ['CONCERT FILM: LOUD FOREVER', 'the neighbors remember this one', 'loudforever'],
  ['KIDS MOVIE, STICKY', 'do not ask what the sticky is'],
  ['[SCREENER — NOT FOR RESALE]', 'well. here we are'],
  ['NATURE: THE DESERT AT NIGHT', 'watched for the sound. never for the picture'],
  ['ACTION PACK, 6 FILMS, 1 GOOD', 'somebody wrote which one. it is wrong'],
];
const BLURAY_KEEPERS = [
  ['OOP LIMITED STEELBOOK #0042', 'out of print, numbered. forum famous', 45, 100, 'steelbook'],
  ['FESTIVAL SCREENER, WATERMARKED', 'should not exist outside the festival', 50, 115],
];
const EDISON_TITLES = [
  ['PARLOR WALTZ NO. {n}', 'a quarter inch thick and proud of it', 'parlorwaltz'],
  ['COMIC MONOLOGUE (1917)', 'the joke no longer lands. it is fascinating', 'comicmono'],
  ['HYMNS FOR THE HOME', 'played every Sunday until it wasn\'t'],
  ['REGIMENTAL MARCH NO. {n}', 'you can hear the room they stood in'],
  ['[CRACKED CLEAN THROUGH]', 'held together by its own label'],
  ['A SPEECH BY THE MAYOR (1911)', 'the mayor is shouting. the mayor is always shouting'],
  ['DANCE BAND, HOTEL ROOF', 'you can hear somebody drop a glass and laugh'],
];
const EDISON_KEEPERS = [
  ['UNLISTED MATRIX — TEST PRESSING', 'not in any catalog. archives will call back fast', 90, 220, 'testpressing'],
  ['HOME RECORDING: A FAMILY SINGS', 'someone\'s great-grandmother, alive in the grooves', 70, 160],
  ['BANNED COMIC SONG, WITHDRAWN', 'withdrawn in 1921. infamous among collectors', 80, 190],
];
const COMIC_TITLES = [
  ['SUPERGUY #{n}{n2}', 'a run of hundreds. this is one of the hundreds', 'cx_superguy'],
  ['RATMAN #{n}{n2}', 'the sidekick era. everyone kept these. that is the problem', 'cx_ratman'],
  ['WANDER WOMAN #{n}{n2}', 'the lasso is drawn wrong on the cover. famously', 'cx_wander'],
  ['CAPTAIN AMERICANA #{n}{n2}', 'punching a submarine on the cover', 'cx_americana'],
  ['SPECTACULAR SPIDER-GUY #{n}{n2}', 'the clone one. do not ask which clone', 'cx_spiderguy'],
  ['IRONY MAN #{n}{n2}', 'the armor changes every cover. it never mattered', 'cx_ironyman'],
  ['THORR #{n}{n2}', 'speaks in fake old english the whole issue', 'cx_thorr'],
  ['DARE-DOUBTFUL #{n}{n2}', 'the yellow costume era. they tried', 'cx_daredoubtful'],
  ['GREEN LAMPPOST #{n}{n2}', 'the oath is printed inside the cover. someone memorized it', 'cx_lamppost'],
  ['THE FLUSH #{n}{n2}', 'he runs fast. the plots do not', 'cx_flush'],
  ['AQUARIUM MAN #{n}{n2}', 'he talks to fish. the fish deliberate', 'cx_aquarium'],
  ['GHOST RIDDER #{n}{n2}', 'flaming skull, tasteful flames', 'cx_ghostridder'],
  ['SILVER SURFBOARD #{n}{n2}', 'space, hunger, one shiny board', 'cx_surfboard'],
  ['SWAMP THINGY #{n}{n2}', 'the moody one. the writers went strange here, in a good way', 'cx_swampthingy'],
  ['SPAWNED #1', 'a #1. so were nine million other copies. the bag is worth more', 'cx_spawned'],
  ['THE SANDYMAN #{n}{n2}', 'goth kids guarded these with their lives', 'cx_sandyman'],
  ['HECKBOY #{n}{n2}', 'big red fella, tiny reading glasses on the cover', 'cx_heckboy'],
  ['ARTIE COMICS #{n}{n2}', 'two girls, one burger joint, sixty years of it', 'cx_artie'],
  ['CONRAD THE LIBRARIAN #{n}{n2}', 'sword, loincloth, overdue notices', 'cx_conrad'],
  ['TALES FROM THE CRAWLSPACE #{n}', 'the horror host makes a pun on every cover', 'cx_crawlspace'],
  ['THE PUNCHISHER #{n}{n2}', 'a skull shirt and a grievance', 'cx_punchisher'],
  ['THE DARK NIGHT RETURNS #{n}', 'the gritty one. every copy is somebody\'s favorite', 'cx_darknight'],
];
const COMIC_KEEPERS = [
  ['AMUSING FANTASY #15', 'first appearance of the Spider-Guy. bagged, boarded, prayed over', 90, 200, 'cx_amusing'],
  ['TRACTION COMICS #1', 'the caped one lifts a tractor. the corner is soft. the wallet opens anyway', 80, 180, 'cx_traction'],
  ['DEFECTIVE COMICS #27', 'the Ratman debut. somebody stored it flat. bless them', 75, 170, 'cx_defective'],
  ['THE IMPROBABLE BULK #1', 'grey on the cover, green forever after. the printing error made it famous', 55, 130, 'cx_bulk'],
  ['EX-MEN #1', 'the school for gifted litigants. first class photo', 50, 120, 'cx_exmen'],
  ['FANTASTICAL FOUR #1', 'four of them, one stretched clean off the cover', 55, 125, 'cx_ffour'],
  ['KARATE TORTOISES #1', 'black and white, printed in somebody\'s garage. worth more than the garage', 45, 110, 'cx_tortoises'],
  ['WATCHERMEN #1', 'a smiley pin on the cover with one drop of something on it', 40, 95, 'cx_watchermen'],
];

// every media pile opens the same way: one spine at a time
const MEDIA_KINDS = {
  vhs:         { word: 'tape', n: [4, 5], keeperChance: 0.22, titles: TAPE_TITLES, keepers: TAPE_KEEPERS, caseCol: '#16161e', caseLabel: 'VHS' },
  dvdStack:    { word: 'case', n: [4, 6], keeperChance: 0.18, titles: DVD_TITLES, keepers: DVD_KEEPERS, caseCol: '#26262e', caseLabel: 'DVD' },
  cassettes:   { word: 'cassette', n: [4, 6], keeperChance: 0.2, titles: CASSETTE_TITLES, keepers: CASSETTE_KEEPERS, caseCol: '#3a3428', caseLabel: 'CASSETTE' },
  blurayBox:   { word: 'case', n: [3, 5], keeperChance: 0.16, titles: BLURAY_TITLES, keepers: BLURAY_KEEPERS, caseCol: '#173a5a', caseLabel: 'BLU-RAY' },
  edisonDiscs: { word: 'disc', n: [3, 5], keeperChance: 0.3, titles: EDISON_TITLES, keepers: EDISON_KEEPERS, keeperCat: 'antiques', caseCol: '#8a7a58', caseLabel: 'EDISON DISC' },
  comicBox:    { word: 'comic', n: [4, 6], keeperChance: 0.22, titles: COMIC_TITLES, keepers: COMIC_KEEPERS, keeperCat: 'collectibles', caseCol: '#ddd6c2', caseLabel: 'COMIC' },
};
Object.assign(MEDIA_KINDS, GAME_MEDIA_KINDS);      // the ten shoeboxes of cartridges and discs (games.js)
// every cover slot the loader should probe (media\md_<id>.png)
const MEDIA_ART_IDS = (() => {
  const ids = new Set();
  for (const k in MEDIA_KINDS) {
    for (const t of MEDIA_KINDS[k].titles) if (t[2]) ids.add(t[2]);
    for (const t of MEDIA_KINDS[k].keepers) if (t[4]) ids.add(t[4]);
  }
  // the five films also exist as rolled one-sheets, which are their own artwork:
  // a poster is not a box cover (items.js, the `movies` variant)
  for (const m of MOVIES) ids.add('poster_' + m.id);
  return Array.from(ids);
})();

// ---- tapes you can actually watch ----
// A few keepers are not just a cover: put a clip next to one and LOOK CLOSER grows a
// PLAY button, and the case turns into a little screen. One or two clips each — short,
// silent, looping, the way a tape looks when somebody finally puts it in the machine.
// Files are `tapes\tp_<art>_1.mp4` (and `_2`), keyed off the cover's own art id, so a
// tape without clips behaves exactly as it always did. Prompts are in docs/MOTION.md.
const PLAYABLE_TAPES = ['channel9', 'ufo', 'toyreel', 'titlefight', 'goondocks', 'ferris', 'bunk', 'nebraska', 'meatballs'];
const TAPE_CLIPS = 2;              // how many clips a tape may carry
const _tapeVid = {};               // '<art>_<n>' -> { el, used }
function tapeClipCount(art) {
  if (!art) return 0;
  let n = 0;
  for (let i = 1; i <= TAPE_CLIPS; i++) if (_tapeVid[art + '_' + i]) n++;
  return n;
}

// ---- compartments: the drawers, doors and lids of a container ----
// State lives on the item (it.comp) so a drawer searched from the home page
// and a drawer searched in the closer look are the same drawer. Remaining
// loot is dealt across the still-closed compartments, seeded per item.
function ensureComps(it) {
  if (!it.comp) {
    const names = INSPECT_ZONES[it.base] || ['open it up'];
    it.comp = names.map((label) => ({ label, done: false, found: null }));
  }
  return it.comp;
}
function dealLoot(it) {
  const comps = ensureComps(it);
  const deal = comps.map(() => []);
  const loot = it.loot || [];
  let open = [];
  for (let i = 0; i < comps.length; i++) if (!comps[i].done) open.push(i);
  if (!open.length && loot.length) {           // every drawer shut but something still inside: one more look
    comps.push({ label: 'the back', done: false, found: null });
    deal.push([]); open = [comps.length - 1];
  }
  const R = RNG((it.hseed || it.uid * 977) + 11);
  for (let i = 0; i < loot.length; i++) deal[open[R.i(0, open.length - 1)]].push(loot[i]);
  return deal;
}
// anything real that comes out during a closer look also shows up IN the
// closer look — a little row of the things themselves, not just log lines
function noteFound(x) {
  const HI = G.homeInspect;
  if (HI) (HI.found = HI.found || []).push(x);
}
// pull one loot item out of a container: cash converts, tools go to the
// toolbox, everything else joins the stash. Returns the line for the log.
function takeLoot(it, l) {
  if (it.loot) { const li = it.loot.indexOf(l); if (li >= 0) it.loot.splice(li, 1); }
  if (l.cash) {
    // a wad tops out at $260 and a coin jar at $70, so the old $300 gate meant
    // coin_big could never fire on anything that came out of a box
    gain(l.val); play(l.val >= 150 ? 'coin_big' : 'coin');
    G.dayStats.cashFound += l.val;
    return { t: l.name + '  +' + fmt$(l.val), c: PAL.yellow, find: true };
  }
  // paper never reaches the stash: it is worth nothing, weighs nothing, and goes
  // straight onto THE BOARD, where it is worth something tomorrow instead
  if (l.paper) {
    const rec = paperFound(l);
    play('search_find');
    const what = { bill: 'a printed auction bill', catalog: 'a page torn from a catalog', letter: "somebody's mail", receipt: 'a receipt',
      certificate: 'a certificate', photo: 'a photograph', list: 'a packing list' }[rec.kind] || 'a piece of paper';
    // a certificate about the thing you are already holding settles it right here (docs/APPRAISAL.md §7)
    if (rec.kind === 'certificate' && rec.data.uid) {
      const mine = allHeld().find((x) => x.uid === rec.data.uid);
      if (mine && mine.unverified) { const pv = paperVerdict(mine, rec); if (pv) ilog(pv.text, pv.col); }
    }
    return { t: what + ' — onto THE BOARD', c: PAL.cyan };
  }
  if (tryToolPickup(l)) {
    play('search_find');
    return { t: l.name + ' — into the TOOLBOX', c: PAL.lblue, find: true };
  }
  l.uid = l.uid || nextUid();
  l.shedDay = l.shedDay || G.day;     // the day it came out of the box
  l.homeDay = G.day;                  // freshly opened: it sorts as new
  autoPriceJunk(l);
  if (it.fromUnit) { l.fromUnit = it.fromUnit; l.fromDay = it.fromDay; l.fromTown = it.fromTown; l.fromArch = it.fromArch; l.fromTell = it.fromTell; l.fromTenant = it.fromTenant || null; }   // it came from the same door
  G.stash.push(l);
  noteFound(l);
  trackAcquire(l);
  const [lo, hi] = estRange(l);
  if (l.legendary) { foundLegendary(l); play('legendary_fanfare'); }
  else if (l.fakeEst) play('pull_epic');
  return { t: dName(l) + '  (' + fmt$(lo) + '–' + fmt$(hi) + ')', c: l.fakeEst ? PAL.gold : tierOf(l.val).col, find: true };
}
// one sound for what a drawer actually gave up, over the top of the per-item clinks.
// The dig has had this since day one (pullItem's rare/epic branch); opening a safe
// had nothing, so a wad of hundreds and a bag of socks sounded identical. Loudest
// thing wins, once — never one chime per item.
function haulFanfare(loot) {
  if (!loot || !loot.length || _unpacking) return;     // UNPACK EVERYTHING plays one fanfare at the end, not one per drawer
  let cash = 0, best = 0, legend = false;
  for (const l of loot) {
    if (l.cash) cash += l.val;
    else { if (l.val > best) best = l.val; if (l.legendary) legend = true; }
  }
  if (legend) return;                                  // legendary_fanfare already said it
  if (cash >= 250) { play('jackpot', 0.95); return; }
  const t = tierOf(Math.max(best, cash)).name;
  if (t === 'epic') play('pull_epic');
  else if (t === 'rare') play('pull_rare');
  else if (t === 'good') play('pull_good');            // finally used: pull_good was dead code
}

// search one compartment: everything dealt to it comes out, the box remembers
function searchComp(it, idx, items) {
  const c = ensureComps(it)[idx];
  if (c.done) return [];
  c.done = true;
  c.found = items.map((l) => takeLoot(it, l));
  haulFanfare(items);
  if (!c.found.length) c.found = [{ t: 'nothing but dust.', c: PAL.dgray }];
  if (it.loot && !it.loot.length && it.comp.every((x) => x.done)) { it.loot = null; it.opened = true; autoPriceJunk(it); }
  return c.found;
}

function openInspect(it) {
  play('container_open', 0.6);         // hands on it: a drawer, a lid, a bag
  const zones = [];
  const R = RNG((it.hseed || it.uid * 977) + 11);
  const media = MEDIA_KINDS[it.base];
  if (media) {
    // deterministic per item, so a finished pile can still be flipped through
    const n = R.i(media.n[0], media.n[1]);
    const keeperAt = R.chance(media.keeperChance) ? R.i(0, n - 1) : -1;
    for (let i = 0; i < n; i++) {
      if (i === keeperAt) {
        const k = R.pick(media.keepers);
        zones.push({
          kind: 'tape', label: media.word + ': ' + k[0],
          title: k[0], note: k[1], art: k[4] || null, done: !!it.mediaDone,
          keeper: { name: k[0], note: k[1], val: R.i(k[2], k[3]), cat: media.keeperCat, movie: k[5] || null },
        });
      } else {
        const t = R.pick(media.titles);
        const title = t[0].replace('{n}', String(R.i(2, 9))).replace('{n2}', String(R.i(0, 9)));
        zones.push({ kind: 'tape', label: media.word + ': ' + title, title, note: t[1], art: t[2] || null, done: !!it.mediaDone });
      }
    }
  } else if (it.container && !it.locked) {
    // every drawer, door and lid — already-searched ones show what came out
    const comps = ensureComps(it);
    const deal = dealLoot(it);
    for (let i = 0; i < comps.length; i++) {
      zones.push({ kind: 'compartment', idx: i, label: comps[i].label, items: deal[i], done: comps[i].done });
    }
  }
  if (!it.cash && !it.legendary && !it.setComplete && !it.rummaged) {
    zones.push({ kind: 'rummage', label: RUMMAGE_LABELS[it.cat] || 'go through it properly' });
  }
  if (HIDDEN_RATES[it.base] && !it.hiddenChecked) zones.push({ kind: 'falseBottom', label: 'feel around for a false bottom' });
  // the item itself already has a cover (a movie, a game, a comic pulled from a pile
  // some earlier visit): show it right away, not just while flipping through the pile
  const ownArt = it.art || (it.game && it.game.art) || null;
  G.homeInspect = { it, zones, log: [], playing: null, showCase: ownArt ? { kind: it.base, art: ownArt, title: dName(it), note: it.note, keeper: true } : null };
  // the flag, said plainly, has its own fixed spot up top now (drawHomeInspect,
  // docs/APPRAISAL.md §9) — no need to seed it into the notes as well
  // set pieces tell their story the moment you really look at them
  seedInspectLog(it);
}

// `find` marks a line as an object actually coming out of the thing, as opposed to
// flavour about it. Those get drawn bold on a lit band so the eye lands on them.
// seedInspectLog runs twice on a fresh appraisal (once on open, once after APPRAISE
// IT, since the second pass needs it.searched for the set flavour lines) — harmless
// for a set piece, whose line can genuinely change, but it repeated itself word for
// word on anything plain. Never say the same line to the same person twice in a row.
function ilog(text, col, find) {
  const L = G.homeInspect.log;
  if (L.length && L[L.length - 1].text === text) return;
  L.push({ text, col: col || PAL.gray, find: !!find });
  if (L.length > 12) L.shift();
}

function seedInspectLog(it) {
  if (it.setComplete) { ilog('Set for six. Nobody has to know what you paid.', PAL.gold); return; }
  if (it.set) {
    const role = it.set.role, sid = it.set.id;
    const holdsAnchor = allHeld().some((o) => o.set && o.set.id === sid && o.set.role === 'anchor' && o.searched && o !== it);
    // sets with their own lore say it here; the Sunday Table keeps its hand-written lines below
    const def = SETS[sid];
    if (def && def.lore && def.lore[role]) {
      ilog(def.lore[role], PAL.cyan);
      if (role !== 'anchor' && holdsAnchor && it.searched) ilog('It belongs with the one you have. You can tell from across the room.', PAL.green);
      return;
    }
    if (role === 'anchor') {
      ilog('Underside: slots for a leaf. The slots are empty.', PAL.cyan);
      const hasLeaf = allHeld().some((o) => o.set && o.set.role === 'leaf' && o.set.brand === it.set.brand && o.searched);
      if (hasLeaf && it.searched) ilog('Your leaf fits. Of course it fits.', PAL.green);
    } else if (role === 'chair' && it.searched) {
      if (holdsAnchor) ilog('You hold it against the table. The grain lines up.', PAL.green);
      else if (G.world.setsAppraised.includes(sid)) ilog('That grain again. It belongs to something.', PAL.cyan);
    } else if (role === 'cloth') {
      ilog('It unfolds to seat six. Pressed edges. A Sunday cloth.', PAL.cyan);
    } else if (role === 'boat') {
      ilog("A maker's stamp under the glaze. This wasn't cheap china.", PAL.cyan);
    } else if (role === 'leaf' && it.searched) {
      if (holdsAnchor) ilog('Same wood as your table. It wants to go home.', PAL.green);
    }
    return;
  }
  if (it.locked) { ilog(heldKeyFor(it) ? 'An odd lock. You have an odd key. You have had it for a while.' : 'Locked tight. The locksmith takes cash, not curiosity.', PAL.cyan); return; }
  // an object with a past, and the proof of it in the same hands: the connection is made here
  if (provTryResolve(it)) return;
  if (it.provResolved) { ilog('It has a name now. Everyone who sees it will know it.', PAL.gold); return; }
  if (MEDIA_KINDS[it.base] && it.mediaDone) { ilog('You already went through every last one.', PAL.dgray); return; }
  if (it.container && it.opened) { ilog('Already emptied. The drawers remember what was in them.', PAL.dgray); return; }
  // up close, some things carry a year, a serial, a name. Write it down. It may matter later.
  const detail = it.note || detailLine(it);
  if (detail) ilog(detail, it.note ? PAL.gold : PAL.cyan);
  if (!it.container && !MEDIA_KINDS[it.base] && !detail) {
    ilog(['Solid. Ordinary. Honest.', 'You turn it over twice. Nothing surprising.',
          'It is exactly what it looks like.'][(it.hseed || it.uid) % 3], PAL.dgray);
  }
}

// what the left pane shows when a case is pulled out of the pile
function caseOf(z, it) {
  return { kind: it.base, art: z.art, title: z.title, note: z.note, keeper: !!z.keeper };
}

function inspectZoneClick(z) {
  const HI = G.homeInspect, it = HI.it;
  if (z.done) {
    if (z.kind === 'tape') { HI.showCase = caseOf(z, it); HI.playing = null; }   // flip back through the pile
    return;
  }
  z.done = true;
  if (z.kind === 'compartment') {
    play('container_open');
    const found = searchComp(it, z.idx, z.items);
    for (const f of found) ilog(z.label + ': ' + f.t, f.c, f.find);
  } else if (z.kind === 'tape') {
    play('search_rummage');
    HI.showCase = caseOf(z, it); HI.playing = null;
    if (z.keeper) {
      const media = MEDIA_KINDS[it.base] || {};
      const kb = media.itemBase && BASE_BY_ID[media.itemBase];    // a shoebox keeper is a real cartridge or disc
      const tape = {
        uid: nextUid(), base: kb ? kb.id : 'rareTape', cat: z.keeper.cat || 'collectibles', spr: kb ? kb.spr : 'rareTape', size: 1,
        pal: 'dark', cond: 'Clean', name: z.keeper.name, val: z.keeper.val,
        cash: null, container: null, locked: false, opened: false, loot: null,
        legendary: false, searched: true, layer: 0, col: 0, wCols: 1,
        hseed: (it.hseed || 1) + 77,
      };
      if (z.keeper.movie) { tape.movie = z.keeper.movie; bumpIn('movies', z.keeper.movie); }   // one of the five, for the books
      if (media.system) { tape.game = { system: media.system, title: z.keeper.name, art: z.art || null }; tape.note = z.keeper.note; }
      // every named keeper, by which box it came out of and which one it was —
      // one shared record the comics/records/games achievements all read from
      bumpIn('keepersFound', it.base + '::' + z.keeper.name);
      if (media.system) bumpIn('keepersFound', 'gameSystem::' + media.system);
      tape.art = z.art || null;   // every kind of keeper (not just games) keeps its cover, so a later LOOK CLOSER can still show it
      tape.homeDay = G.day;
      G.stash.push(tape);
      noteFound(tape);
      trackAcquire(tape);
      play('search_find');
      ilog(z.label + ' -- ' + z.keeper.note + '.  (' + fmt$(z.keeper.val) + ')', PAL.green, true);
    } else {
      ilog(z.label + ' -- ' + z.note.replace(/\.$/, '') + '.', PAL.gray);
    }
    if (!HI.zones.some((x) => x.kind === 'tape' && !x.done)) { it.mediaDone = true; autoPriceJunk(it); }
  } else if (z.kind === 'rummage') {
    it.rummaged = true;
    play('search_rummage');
    const R = RNG((it.hseed || it.uid * 977) + 53);
    if (R.chance(0.18)) {
      play('search_find');
      G.dayStats.searchFinds++;
      const roll = R.f();
      if (roll < 0.55) {
        const amt = R.i(10, 90);
        gain(amt); G.dayStats.cashFound += amt;
        ilog('Tucked away in there: ' + fmt$(amt) + ' in creased bills.', PAL.yellow, true);
      } else if (roll < 0.85) {
        const found = makeItem(R.wpick(SMALL_POOLS.any), R);
        if (found.cash) {
          gain(found.val); G.dayStats.cashFound += found.val;
          ilog('Hidden inside: ' + found.name + '  +' + fmt$(found.val), PAL.yellow, true);
        } else {
          found.searched = true;
          found.homeDay = G.day;
          G.stash.push(found);
          noteFound(found);
          trackAcquire(found);
          ilog('Hidden inside: ' + found.name + '  (' + fmt$(found.val) + ')', tierOf(found.val).col, true);
        }
      } else {
        it.val = Math.round(it.val * 1.15);
        ilog(it.searched
          ? 'You clean it up properly. Worth more now: ' + fmt$(it.val) + '.'
          : 'You clean it up properly. It will show better.', PAL.green);
      }
    } else {
      ilog('You go through it top to bottom. Nothing you did not already know.', PAL.dgray);
    }
  } else if (z.kind === 'falseBottom') {
    it.hiddenChecked = true;
    play('search_rummage');
    const R = RNG((it.hseed || it.uid * 977) + 31);
    if (R.chance(HIDDEN_RATES[it.base] || 0)) {
      play('search_find');
      G.dayStats.searchFinds++;
      if (R.chance(0.55)) {
        const amt = R.i(30, 140);
        gain(amt); G.dayStats.cashFound += amt;
        ilog('The bottom lifts. ' + fmt$(amt) + ' in old bills, flat as leaves.', PAL.yellow, true);
      } else {
        const l = makeItem(R.wpick(SMALL_POOLS[R.chance(0.5) ? 'rich' : 'papers']), R);
        if (l.cash) { gain(l.val); G.dayStats.cashFound += l.val; ilog('The bottom lifts. ' + l.name + '  +' + fmt$(l.val), PAL.yellow, true); }
        else {
          l.searched = true;
          l.homeDay = G.day;
          G.stash.push(l);
          noteFound(l);
          trackAcquire(l);
          ilog('The bottom lifts. ' + l.name + ' (' + fmt$(l.val) + '), hidden on purpose.', tierOf(l.val).col, true);
        }
      }
    } else {
      ilog('You tap the bottom. Solid. Just a bottom.', PAL.dgray);
    }
  }
}

// ---- compartment pictures: a drawer, a door or a lid, shut or open ----
const COMP_STYLE = {
  dresser: 'drawer', filing: 'drawer', till: 'drawer', diningTable: 'drawer', desk: 'drawer',
  wardrobe: 'door', trunk: 'lid', suitcase: 'lid', box: 'flap', crate: 'lid',
  garbage: 'bag', guitarCase: 'lid', vinylCrate: 'lid', barrel: 'lid',
};
function drawCompIcon(x, y, w, h, it, done, hov) {
  const C = BRAND_PALS[it.pal] || BRAND_PALS.wood;
  const style = COMP_STYLE[it.base] || 'lid';
  const cav = '#0f1018';
  px(g, x, y, w, h, hov ? '#22253a' : '#1a1c28');
  const bw = Math.min(w - 20, 120), bh = h - 14;
  const bx = x + Math.round((w - bw) / 2), by = y + 7;
  if (style === 'drawer') {
    // the cabinet mouth, then the drawer front — pulled out when searched
    px(g, bx, by, bw, bh, PAL.ink);
    px(g, bx + 2, by + 2, bw - 4, bh - 4, cav);
    const fy = done ? by + 8 : by;
    px(g, bx, fy, bw, bh - (done ? 8 : 0), PAL.ink);
    px(g, bx + 2, fy + 2, bw - 4, bh - (done ? 12 : 4), C.a);
    px(g, bx + 2, fy + 2, bw - 4, 2, C.c);
    px(g, bx + 2, fy + bh - (done ? 12 : 4), bw - 4, 2, C.b);
    if (done) { px(g, bx + 6, by + 3, bw - 12, 4, C.d); }               // the drawer's inside edge
    px(g, bx + bw / 2 - 8, fy + Math.round(bh / 2) - (done ? 6 : 2), 16, 4, PAL.ink);
    px(g, bx + bw / 2 - 7, fy + Math.round(bh / 2) - (done ? 5 : 1), 14, 2, PAL.gold);
  } else if (style === 'door') {
    px(g, bx, by, bw, bh, PAL.ink);
    px(g, bx + 2, by + 2, bw - 4, bh - 4, done ? cav : C.a);
    if (done) {
      for (let i = 0; i < 3; i++) px(g, bx + 8, by + 8 + i * Math.round((bh - 16) / 3), bw - 16, 2, '#2a2d40');   // shelves in the dark
      px(g, bx, by, 14, bh, PAL.ink); px(g, bx + 2, by + 2, 10, bh - 4, C.b);                                   // the door, swung
    } else {
      px(g, bx + 6, by + 6, bw - 12, bh - 12, PAL.ink); px(g, bx + 7, by + 7, bw - 14, bh - 14, C.a);
      px(g, bx + 7, by + 7, bw - 14, 2, C.d);
      px(g, bx + bw - 12, by + Math.round(bh / 2) - 6, 3, 12, PAL.ink); px(g, bx + bw - 11, by + Math.round(bh / 2) - 5, 2, 10, PAL.gold);
    }
  } else if (style === 'bag') {
    const col = done ? '#2a2f3a' : '#353b48';
    px(g, bx + 10, by + 10, bw - 20, bh - 10, PAL.ink);
    px(g, bx + 12, by + 12, bw - 24, bh - 14, col);
    px(g, bx + bw / 2 - 6, by, 12, 12, PAL.ink);
    px(g, bx + bw / 2 - 4, by + 2, 8, 10, done ? cav : col);
    if (done) px(g, bx + 16, by + 16, bw - 32, bh - 22, cav);
  } else {
    // a box with a lid: shut, or lifted with the dark inside showing
    const lidH = 10;
    px(g, bx, by + lidH, bw, bh - lidH, PAL.ink);
    px(g, bx + 2, by + lidH + 2, bw - 4, bh - lidH - 4, C.a);
    px(g, bx + 2, by + bh - 4, bw - 4, 2, C.b);
    if (done) {
      px(g, bx + 4, by + lidH + 2, bw - 8, 10, cav);
      px(g, bx - 4, by - 2, bw + 8, lidH, PAL.ink);                      // lid up and back
      px(g, bx - 2, by, bw + 4, lidH - 4, C.c);
    } else {
      px(g, bx - 2, by + 2, bw + 4, lidH, PAL.ink);
      px(g, bx, by + 4, bw, lidH - 4, C.c);
      if (style === 'flap') px(g, bx + bw / 2 - 1, by + 4, 2, lidH - 4, PAL.ink);
      px(g, bx + bw / 2 - 5, by + lidH + 2, 10, 5, PAL.ink); px(g, bx + bw / 2 - 4, by + lidH + 3, 8, 3, PAL.gold);   // clasp
    }
  }
}

// ---- INSPECT 1 BY 1 (user, 2026-09-19) ----
// "At home it can be a lot, looking at everything in the closer look - more so finding everything that is still
// to be fully inspected. A button that finds the items not fully inspected and opens each one in the closer look,
// one at a time... instead of DONE, it says NEXT ITEM. A guided way to see all your items without going all over
// the haul one by one - which a player can still do." The list is exactly what the haul marks with a ! (not
// fullyInspected: unappraised, still sealed, a pile with spines unturned, a false bottom unfelt, never gone
// through). Everything the closer look can do still works; any action that moves the thing along (TO STASH,
// HOLD, TROPHY, SELL JUNK) takes you to the next one, and NEXT ITEM skips it. Something that comes OUT of a box on
// the way is new in the haul, so it joins the end of the queue. The corner x, or Escape, stops the tour.
function inspectTourList() { return G.stash.filter((t) => !t.cash && !t.restoring && !fullyInspected(t)); }
function tourLeft(tour) { return inspectTourList().filter((t) => !tour.seen.includes(t.uid)); }
function startInspectTour() {
  if (!inspectTourList().length) { toast('Everything in the haul has had a proper look.', PAL.gray); return false; }
  G.homeTab = 'stash'; G.sellSel = -1;
  tourNext({ seen: [] });
  return true;
}
function tourNext(tour) {
  const next = tourLeft(tour)[0];
  if (!next) { G.homeInspect = null; toast('That is the whole haul, looked at.', PAL.green); return; }
  tour.seen.push(next.uid);
  openInspect(next);
  G.homeInspect.tour = tour;
}
function drawHomeInspect() {
  const HI = G.homeInspect, it = HI.it;
  px(g, 0, 0, W, H, 'rgba(8,8,14,0.8)');
  const mw = 900, mh = 506;
  const mx = (W - mw) / 2, my = (H - mh) / 2 - 2;
  px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.yellow);
  panel(mx, my, mw, mh, '#242737');

  // left: the thing itself, big — or the case you just pulled from the pile
  const lw = 280;
  px(g, mx + 14, my + 14, lw, 250, '#1a1c28');
  if (HI.showCase) {
    drawMediaCase(mx + 14, my + 14, lw, 250, HI.showCase);
    // the locker version too, badged in the corner — the cover is the close-up, this is what it looks like in the pile
    const bx = mx + 14 + 8, by = my + 14 + 8, bs = 46;
    px(g, bx - 2, by - 2, bs + 4, bs + 4, PAL.ink);
    px(g, bx, by, bs, bs, '#12131c');
    const bspr = getSprite(it.spr, it.pal, it.cond, it.hseed || it.uid);
    const bsc = Math.min((bs - 6) / bspr.width, (bs - 6) / bspr.height, 2);
    const bdw = Math.round(bspr.width * bsc), bdh = Math.round(bspr.height * bsc);
    g.drawImage(bspr, bx + (bs - bdw) / 2, by + (bs - bdh) / 2, bdw, bdh);
  } else {
    const spr = getSprite(it.spr, it.pal, it.cond, it.hseed || it.uid);
    const sc = Math.max(2, Math.min(5, Math.floor((lw - 30) / spr.width), Math.floor(220 / spr.height)));
    const dw = spr.width * sc, dh = spr.height * sc;
    g.drawImage(spr, mx + 14 + (lw - dw) / 2, my + 14 + (250 - dh) / 2, dw, dh);
  }
  let yy = my + 274;
  { const nf = fitLines(dName(it), lw - 8, [18, 17, 16, 15], 2, true);   // by measure, like the paper's headlines
    for (const line of nf.lines) { T(mx + 14 + lw / 2, yy, line, PAL.white, nf.fs, 'center', true); yy += 22; } }
  T(mx + 14 + lw / 2, yy + 2, CATS[it.cat].label + '  ·  ' + (it.cond || '?') + '  ·  bulk ' + it.size, PAL.gray, 14, 'center'); yy += 22;
  if (it.searched) {
    T(mx + 14 + lw / 2, yy, fmt$(shownVal(it)), it.unverified ? PAL.orange : (it.setComplete || it.legendary ? PAL.gold : PAL.yellow), 22, 'center', true);
    if (it.unverified) T(mx + 14 + lw / 2, yy + 24, 'UNVERIFIED', PAL.orange, 12, 'center', true);
  }
  else { const [lo, hi] = estRange(it); T(mx + 14 + lw / 2, yy, 'looks like ' + fmt$(lo) + ' - ' + fmt$(hi), PAL.gray, 15, 'center'); }

  // left-bottom: actions. A clean appraisal lands in the notes; a flagged one
  // gets its own word up top, by the header — see below (docs/APPRAISAL.md §9 reword).
  const ax = mx + 14, aw = lw;
  if (!it.searched && !it.loot && !it.locked) {
    button(ax, my + mh - 100, aw, 32, 'APPRAISE IT', () => {
      play('search_rummage');
      const res = searchItem(it);
      if (!it.unverified) ilog(res.text, res.col);
      seedInspectLog(it);
    }, { col: PAL.dgreen, fs: 16 });
  } else if (it.unverified) {
    // the flag came off APPRAISE; who can answer it is on the sell screen (docs/APPRAISAL.md §4)
    const rl = wrapText('UNVERIFIED — ' + routeLine(it), 46).slice(0, 2);
    for (let i = 0; i < rl.length; i++) T(ax + aw / 2, my + mh - 100 + i * 15, rl[i], PAL.orange, 12, 'center');
  } else if (it.locked) {
    button(ax, my + mh - 100, aw, 32, 'CRACK IT   ' + fmt$(it.crackCost || 60), () => crackSafe(it), { col: PAL.blue, fs: 15 });
  } else if (!it.searched && it.loot) {
    T(ax + aw / 2, my + mh - 92, 'search every compartment, then appraise', PAL.dgray, 13, 'center');
  }
  // Roy's cousin only takes work that pays: the step up has to beat his forty
  const restoring = allHeld().some((o) => o.restoring);
  const RESTORE_MULTS = { Dusty: 0.7, Worn: 0.85, Clean: 1.0, Mint: 1.55 };
  const nextCond = it.cond === 'Dusty' ? 'Worn' : 'Clean';
  const restoredVal = Math.round(it.val * (RESTORE_MULTS[nextCond] || 1) / (RESTORE_MULTS[it.cond] || 1));
  const canRestore = it.searched && !it.unverified && !it.cash && !it.loot && !it.locked && (it.cond === 'Dusty' || it.cond === 'Worn') && !it.restoring   // get it looked at before you pay to polish it
    && it.cat !== 'junk' && restoredVal - it.val > 40;
  if (canRestore) {
    const blocked = restoring || G.money < 40;
    button(ax, my + mh - 62, aw, 32, restoring ? "ROY'S COUSIN IS BUSY TONIGHT" : "ROY'S COUSIN: RESTORE $40 → ~" + fmt$(restoredVal), () => {
      if (restoring || G.money < 40) { play('denied'); return; }
      spend(40);
      it.restoring = true;
      G.world.restoredEver = true;
      ilog("Roy's cousin takes it, and the forty. \"By morning.\"", PAL.cyan);
    }, { col: blocked ? PAL.slate : PAL.purple, disabled: blocked, fs: 13 });
  } else if (it.restoring) {
    T(ax + aw / 2, my + mh - 56, "with Roy's cousin overnight", PAL.cyan, 14, 'center');
  }

  // right: the info spot. A flagged item gets its word here, plainly, and it
  // stays put — not one more line lost in the scrolling notes below.
  const rx = mx + lw + 34, rw = mw - lw - 48;
  if (HI.tour) {
    const k = HI.tour.seen.length, n = k + tourLeft(HI.tour).length;
    T(rx, my + 12, 'INSPECT 1 BY 1  ·  ' + k + ' OF ' + n, PAL.yellow, 15, 'left', true);
  } else T(rx, my + 12, 'TAKE A CLOSER LOOK', PAL.gray, 15, 'left', true);
  let logY = my + 32;
  if (it.unverified) {
    const claimLine = CLAIM_LINES[it.claimKind || claimOn(it)] + '  ' + CLAIM_TAIL;
    const cl = wrapText(claimLine, 52).slice(0, 2);
    const ch = 10 + cl.length * 15;
    px(g, rx, logY, rw, ch, 'rgba(255,150,60,0.12)');
    px(g, rx, logY, 3, ch, PAL.orange);
    for (let i = 0; i < cl.length; i++) T(rx + 10, logY + 12 + i * 15, cl[i], PAL.orange, 12, 'left');
    logY += ch + 8;
  }
  const logH = 96;
  px(g, rx, logY, rw, logH, '#1a1c28');
  px(g, rx, logY, rw, 2, '#2e3248');
  const logLines = [];
  for (const l of HI.log) {
    const parts = wrapText(l.text, 70).slice(0, 2);
    for (let k = 0; k < parts.length; k++) logLines.push({ s: parts[k], c: l.col, find: l.find, head: k === 0 });
  }
  const tail = logLines.slice(-5);
  for (let i = 0; i < tail.length; i++) {
    const ln = tail[i], y = logY + 8 + i * 17;
    // something actually came out: light the row and set it in bold, so a find never
    // reads as one more line of flavour about the drawer it came from
    if (ln.find) {
      px(g, rx + 4, y - 3, rw - 8, 17, 'rgba(255,205,117,0.11)');
      px(g, rx + 4, y - 3, 2, 17, ln.c);
    }
    T(rx + (ln.find ? 12 : 8), y, ln.s, ln.c, 13, 'left', !!ln.find);
  }
  let zy = logY + logH + 10;

  // the set, as the appraiser knows it: yours in color, missing in grey
  const sdef = it.set && SETS[it.set.id];
  if (sdef && G.world.setsAppraised.includes(it.set.id)) {
    const brand = sdef.brandLocked.includes(it.set.role) ? it.set.brand
      : (bestHeldBrand(it.set.id) || it.set.brand);
    const res = setPieceCounts([G.stash, G.keeps, G.trophies], it.set.id, brand);
    const slots = [];
    for (const role in sdef.roles) for (let i = 0; i < sdef.roles[role].n; i++) slots.push(role);
    T(rx, zy, (sdef.name + '  ·  ' + brand).toUpperCase(), PAL.yellow, 12, 'left', true);
    const cell = Math.min(48, Math.floor(rw / slots.length));
    const seen = {};
    const bdef = sdef.brands.find((b) => b[0] === brand);
    const palKey = (bdef && bdef[2]) || 'wood';
    for (let i = 0; i < slots.length; i++) {
      const role = slots[i];
      seen[role] = (seen[role] || 0) + 1;
      const owned = seen[role] <= res.counts[role];
      const cx = rx + i * cell, cy = zy + 16;
      px(g, cx, cy, cell - 4, 42, owned ? '#20301f' : '#181a24');
      px(g, cx, cy + 40, cell - 4, 2, owned ? PAL.green : '#252838');
      const base = BASE_BY_ID[sdef.roles[role].base];
      const sp = getSprite(base.spr, palKey, null, 7, owned ? 0 : 4);
      const s2 = Math.min((cell - 10) / sp.width, 34 / sp.height);
      const dw2 = Math.max(1, Math.round(sp.width * s2)), dh2 = Math.max(1, Math.round(sp.height * s2));
      g.drawImage(sp, cx + Math.round((cell - 4 - dw2) / 2), cy + Math.round((40 - dh2) / 2), dw2, dh2);
    }
    const comp = setIsComplete(sdef, res.counts);
    const msg = comp ? 'all pieces here — COMPLETE THE SET from the shelf'
      : 'still missing: ' + setMissingText(sdef, res.counts);
    T(rx, zy + 62, msg.length > 70 ? msg.slice(0, 69) + '…' : msg, comp ? PAL.green : PAL.orange, 12);
    zy += 82;
  }

  // compartments: a picture of each, what came out of it, and the SEARCH button
  const comps = HI.zones.filter((z) => z.kind === 'compartment');
  const tapes = HI.zones.filter((z) => z.kind === 'tape');
  const extras = HI.zones.filter((z) => z.kind === 'rummage' || z.kind === 'falseBottom');
  const bottomLimit = my + mh - 52;
  if (comps.length) {
    const n = comps.length, gap = 8;
    const cw = Math.floor((rw - gap * (n - 1)) / n);
    const iconH = 56, boxH = 58, btnH = 26;
    for (let i = 0; i < n; i++) {
      const z = comps[i], cx = rx + i * (cw + gap);
      const over = !z.done && inRect(mouse.x, mouse.y, cx, zy, cw, iconH + boxH + btnH + 8);
      T(cx + cw / 2, zy, z.label.toUpperCase(), z.done ? PAL.dgray : PAL.white, 11, 'center', true);
      drawCompIcon(cx, zy + 14, cw, iconH, it, z.done, over);
      const by = zy + 14 + iconH + 4;
      px(g, cx, by, cw, boxH, PAL.ink);
      px(g, cx + 2, by + 2, cw - 4, boxH - 4, '#1a1c28');
      const maxCh = Math.max(12, Math.floor(cw / 6.6));
      if (z.done) {
        const found = it.comp[z.idx].found || [];
        const lines = [];
        for (const f of found) for (const ln of wrapText(f.t, maxCh).slice(0, 2)) lines.push({ s: ln, c: f.c });
        const shown = lines.slice(0, 4);
        for (let k = 0; k < shown.length; k++) T(cx + 6, by + 5 + k * 13, shown[k].s, shown[k].c, 11);
        if (lines.length > 4) T(cx + cw - 6, by + boxH - 14, '+' + (lines.length - 4) + ' more', PAL.dgray, 10, 'right');
      } else {
        T(cx + cw / 2, by + Math.round(boxH / 2) - 7, 'not searched yet', PAL.dgray, 11, 'center');
      }
      const bty = by + boxH + 4;
      if (z.done) { px(g, cx, bty, cw, btnH, '#1e2030'); T(cx + cw / 2, bty + 6, 'SEARCHED', PAL.dgray, 12, 'center', true); }
      else button(cx, bty, cw, btnH, 'SEARCH', () => inspectZoneClick(z), { col: PAL.orange, fs: 13 });
    }
    zy += 14 + iconH + 4 + boxH + 4 + btnH + 10;
  } else if (tapes.length) {
    for (const z of tapes) {
      if (zy + 26 > bottomLimit) break;
      if (z.done) {
        const over = inRect(mouse.x, mouse.y, rx, zy, rw, 26);
        T(rx + 8, zy + 5, '· ' + z.label + (over ? '  [view]' : ''), over ? PAL.gray : PAL.dgray, 13);
        hot(rx, zy, rw, 26, () => inspectZoneClick(z));
      } else {
        // the spine reads as text; the button is just the verb
        T(rx + 8, zy + 5, z.label, PAL.white, 13);
        button(rx + rw - 112, zy, 112, 24, 'SEARCH', () => inspectZoneClick(z), { col: PAL.orange, fs: 12 });
      }
      zy += 29;
    }
    zy += 4;
  } else if (it.locked) {
    T(rx, zy + 4, 'locked. crack it before anything opens.', PAL.dgray, 14); zy += 26;
  } else if (!extras.length) {
    T(rx, zy + 4, 'nothing to open. what you see is what it is.', PAL.dgray, 14); zy += 26;
  }
  // the honest rummage and the false bottom ride underneath
  for (const z of extras) {
    if (zy + 28 > bottomLimit) break;
    if (z.done) T(rx + 8, zy + 6, '· ' + z.label, PAL.dgray, 13);
    else button(rx, zy, rw, 28, '▸ ' + z.label.toUpperCase(), () => inspectZoneClick(z), { col: z.kind === 'falseBottom' ? PAL.slate : PAL.dgreen, fs: 13 });
    zy += 32;
  }

  // what has come out of it so far: the things themselves, in a row — too small
  // to read at 24px, so hovering one shows it bigger (drawIconZoom, capped 2x like the grid)
  if (HI.found && HI.found.length && zy + 54 < bottomLimit) {
    T(rx, zy + 2, 'OUT OF IT — INTO THE HAUL:', PAL.gray, 12, 'left', true);
    const per = Math.floor(rw / 34);
    const shown = HI.found.slice(0, per);
    let hovIt = null, hovX = 0, hovY = 0;
    for (let i = 0; i < shown.length; i++) {
      const fx = rx + i * 34, fy = zy + 18;
      const hov = inRect(mouse.x, mouse.y, fx, fy, 30, 30);
      px(g, fx, fy, 30, 30, hov ? '#2c3044' : '#1a1c28');
      drawIcon(shown[i], fx + 3, fy + 1, 24);
      px(g, fx, fy + 28, 30, 2, tierOf(shown[i].val).col);   // a sliver of its tier
      if (hov) { hovIt = shown[i]; hovX = fx + 15; hovY = fy; }
    }
    if (HI.found.length > per) T(rx + per * 34 + 4, zy + 26, '+' + (HI.found.length - per), PAL.dgray, 12);
    if (hovIt) drawIconZoom(hovX, hovY, hovIt);
    zy += 54;
  }

  // the row under the notes: rip it, move it along (TO STASH, HOLD FOR, TROPHY, or Pete for the junk), done.
  // With the panels it acts on, on the right, not under the picture (playtest 2026-09-15).
  const rowY = Math.min(zy + 6, my + mh - 46);
  const row = [];
  const ripZones = HI.zones.filter((z) => !z.done && (z.kind === 'tape' || (z.kind === 'rummage' && (it.cat === 'junk' || it.base === 'garbage'))));
  if (ripZones.length >= 2) {
    row.push({ label: 'RIP THROUGH IT', col: PAL.orange, fs: 14, cb: () => {
      for (const z of ripZones) inspectZoneClick(z);
      HI.showCase = null;
    } });
  }
  // in the haul and priced: move it along or cash the junk without leaving the panel
  if (G.stash.includes(it) && it.searched && !it.loot && !it.locked && !it.restoring && !it.cash) {
    if (it.cat === 'junk') {
      const peteMult = G.money < 150 ? 0.5 : 0.45;
      const pj = Math.max(1, Math.round(it.val * peteMult));
      const pileWaiting = MEDIA_KINDS[it.base] && !it.mediaDone;   // a pile with spines unturned is not junk yet
      // what Pete is and is not taking (user, 2026-09-19): a keeper that came out of the pile is its own thing in
      // the haul now, not junk, and does not go with the box
      const media = MEDIA_KINDS[it.base];
      const kept = HI.zones.filter((z) => z.kind === 'tape' && z.keeper && z.done).map((z) => z.keeper.name);
      const junkHint = pileWaiting ? 'Go through every ' + media.word + ' first: one of them could be a keeper.'
        : media ? (kept.length ? 'Pete takes the box and the ordinary ' + media.word + 's left in it. ' + kept.join(', ') + ' came out into your haul: not junk, and not sold with it.'
          : 'Pete takes the box. Nothing in it was worth pulling out.')
        : 'Pete takes it for ' + fmt$(pj) + '. Want it kept? Leave it in the haul.';
      row.push({ label: pileWaiting ? 'GO THROUGH IT FIRST' : 'SELL JUNK TO PETE  +' + fmt$(pj), col: PAL.slate, fs: 14, disabled: !!pileWaiting, hint: junkHint, cb: () => {
        gain(pj); G.dayStats.soldCount++; G.dayStats.soldTotal += pj;
        takeFromLists(it);
        play('coin');
        G.homeInspect = null; G.sellSel = -1;
      } });
    } else {
      row.push({ label: 'TO STASH ▸', col: PAL.dgreen, fs: 14, cb: () => { setAside(it); G.homeInspect = null; } });
      const hb = holdForBuyer(it);        // the buyer who pays best is not in town: hold it for them, in the stash
      if (hb) row.push({ label: 'HOLD FOR ' + buyerShort(hb).toUpperCase(), col: PAL.navy, fs: 14, cb: () => { holdItem(it, hb); G.homeInspect = null; } });
      row.push({ label: 'TROPHY ★', col: '#8a6420', fs: 14, cb: () => { keepTrophy(it); G.homeInspect = null; } });
      // out to your own unit: off the 40 at home, and out of reach until you drive for it
      if (typeof unitOf === 'function' && unitOf() && it.size <= unitRoom()) {
        row.push({ label: 'TO THE UNIT', col: PAL.navy, fs: 14, cb: () => { unitPut(it); G.homeInspect = null; } });
      }
    }
  }
  if (HI.tour) {
    // on a tour: anything that moves this one along goes straight to the next, and DONE becomes NEXT ITEM
    const tour = HI.tour;
    for (const b of row) if (b.label !== 'RIP THROUGH IT') { const cb = b.cb; b.cb = () => { cb(); if (!G.modal) tourNext(tour); }; }
    const more = tourLeft(tour).length > 0;
    row.push({ label: more ? 'NEXT ITEM ▸' : 'FINISH', col: more ? PAL.dgreen : PAL.slate, fs: 15, min: 110, cb: () => tourNext(tour) });
  } else row.push({ label: 'DONE', col: PAL.slate, fs: 15, min: 100, cb: () => { G.homeInspect = null; } });
  // each as wide as its words; the whole row a size smaller if it would run past the panel
  let cut = 0, widths = [];
  for (; cut <= 3; cut++) {
    widths = row.map((b) => { g.font = textSize(b.fs - cut) + 'px ' + FONT; return Math.max(b.min || 0, Math.ceil(g.measureText(b.label).width) + 24); });
    if (widths.reduce((sum, v) => sum + v, 0) + 8 * (row.length - 1) <= rw) break;
  }
  cut = Math.min(cut, 3);
  let bx = rx;
  for (let i = 0; i < row.length; i++) {
    const b = row[i];
    button(bx, rowY, widths[i], 30, b.label, b.cb, { col: b.col, fs: b.fs - cut, disabled: b.disabled, hint: b.hint });
    bx += widths[i] + 8;
  }
  // and the escape hatch in the corner, where every window keeps one
  T(mx + mw - 18, my + 6, 'x', PAL.gray, 16, 'center', true);
  hot(mx + mw - 32, my + 2, 30, 24, () => { G.homeInspect = null; });
}

// the case in your hands: format shell, cover art (yours, 64x88, from
// media\md_<id>.png), title and note printed under it
// the artwork for a slot, and what it falls back to. A poster wants its own one-sheet
// (`poster_bunk`); until that exists it borrows the film's cover rather than showing a
// placeholder, because the film already has a face.
function mediaArtList(id) {
  if (!id || typeof _mediaImg === 'undefined') return null;
  const own = _mediaImg[id];
  if (own && own.length) return own;
  if (id.indexOf('poster_') === 0) {
    const cover = _mediaImg[id.slice(7)];
    if (cover && cover.length) return cover;
  }
  return null;
}
function drawMediaCase(x, y, w, h, sc) {
  const kind = MEDIA_KINDS[sc.kind] || {};
  // a rolled poster is not a case: it is paper. No clamshell, no spine, and no
  // PLAY button — the film may have a clip, but you cannot play a poster.
  const poster = sc.kind === 'moviePoster';
  const cw = 148, ch = 200;
  const cx = x + Math.round((w - cw) / 2), cy = y + 8;
  px(g, cx - 3, cy - 3, cw + 6, ch + 6, sc.keeper ? PAL.gold : PAL.ink);
  px(g, cx, cy, cw, ch, poster ? '#e9dcbb' : (kind.caseCol || '#20222e'));
  px(g, cx, cy, cw, 3, 'rgba(255,255,255,0.12)');
  px(g, cx, cy + ch - 3, cw, 3, 'rgba(0,0,0,0.35)');
  if (sc.keeper && !poster) T(cx + cw - 5, cy + 3, '*', PAL.gold, 14, 'right', true);

  // the paper goes almost to the edge; a case insets its cover under the spine
  const ax = poster ? cx + 7 : cx + Math.round((cw - 128) / 2), ay = poster ? cy + 7 : cy + 18;
  const aw = poster ? cw - 14 : 128, ah = poster ? ch - 14 : 176;
  px(g, ax - 2, ay - 2, aw + 4, ah + 4, PAL.ink);
  // a tape with a clip on it: the cover turns into a screen and plays
  const clips = poster ? 0 : tapeClipCount(sc.art);
  const HIp = G.homeInspect;
  if (clips && HIp && HIp.playing != null) {
    const n = ((HIp.playing % clips) + clips) % clips + 1;
    const clip = useVideo(_tapeVid, sc.art + '_' + n);
    px(g, ax, ay, 128, 176, '#101018');
    if (clip) {
      // fill the screen and crop the overflow, the way the garage set does it
      const iw = clip.videoWidth || 16, ih = clip.videoHeight || 9;
      const s = Math.max(128 / iw, 176 / ih);
      const dw = Math.round(iw * s), dh = Math.round(ih * s);
      g.save(); g.beginPath(); g.rect(ax, ay, 128, 176); g.clip();
      g.imageSmoothingEnabled = true;
      g.drawImage(clip, ax + Math.round((128 - dw) / 2), ay + Math.round((176 - dh) / 2), dw, dh);
      g.imageSmoothingEnabled = false;
      g.restore();
    } else {
      const R2 = RNG((G.time * 30) | 0);
      g.fillStyle = 'rgba(180,190,210,0.28)';
      for (let i = 0; i < 90; i++) g.fillRect(ax + R2.i(0, 124), ay + R2.i(0, 174), R2.i(2, 5), 2);
      T(ax + 64, ay + 82, 'TRACKING', PAL.gray, 11, 'center', true);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';                                     // scanlines, always
    for (let yy = ay; yy < ay + 176; yy += 3) g.fillRect(ax, yy, 128, 1);
    px(g, ax, ay, 128, 14, 'rgba(8,8,14,0.7)');
    T(ax + 5, ay + 2, '▶ PLAY', PAL.white, 10, 'left', true);
    if (clips > 1) T(ax + 123, ay + 2, n + '/' + clips, PAL.gray, 10, 'right');
    T(ax + 64, ay + 162, clips > 1 ? 'click for the next one' : 'click to stop', PAL.dgray, 10, 'center');
    hot(ax, ay, 128, 176, () => {
      play('ui_click', 0.4);
      if (clips > 1 && HIp.playing + 1 < clips) HIp.playing++; else HIp.playing = null;
    }, { focusable: false });
    return drawMediaCaseFooter(x, y, w, cy, ch, sc);
  }
  const list = mediaArtList(sc.art);
  if (list && list.length) {
    drawPhotoFit(list[strHash(sc.art + '_' + G.day) % list.length], ax, ay, aw, ah);
  } else if (sc.art) {
    // an authored title waiting on your art: the slot names its file
    px(g, ax, ay, aw, ah, '#d6c9a8');
    g.fillStyle = '#b8a982';
    for (let yy = 4; yy < ah - 4; yy += 6)
      for (let xx = (yy / 6) % 2 ? 7 : 4; xx < aw - 4; xx += 6) g.fillRect(ax + xx, ay + yy, 2, 2);
    T(ax + aw / 2, ay + ah / 2 - 20, poster ? '[ POSTER ]' : '[ COVER ]', '#6b5f45', 12, 'center', true);
    T(ax + aw / 2, ay + ah / 2 - 2, 'md_' + sc.art + '.png', '#6b5f45', -10, 'center');   // a filename in a 64px cover: exact size
  } else {
    // filler stock: a plain printed label, no art slot to chase
    px(g, ax, ay, aw, ah, 'rgba(255,255,255,0.06)');
    px(g, ax + 10, ay + 28, aw - 20, 50, 'rgba(233,220,187,0.9)');
    g.save(); g.beginPath(); g.rect(ax + 10, ay + 28, aw - 20, 50); g.clip();   // a long word stays on the label
    let ty2 = ay + 34;
    for (const line of wrapText(sc.title, 16).slice(0, 3)) { T(ax + aw / 2, ty2, line, '#2a2417', 11, 'center', true); ty2 += 12; }
    g.restore();
    px(g, ax + 24, ay + 118, aw - 40, 3, 'rgba(233,220,187,0.35)');
    px(g, ax + 34, ay + 128, aw - 60, 3, 'rgba(233,220,187,0.22)');
    px(g, ax + 29, ay + 138, aw - 50, 3, 'rgba(233,220,187,0.28)');
  }

  // there is something on this tape: say so, and let them put it in
  if (clips) {
    px(g, ax, ay + 176 - 22, 128, 22, 'rgba(8,8,14,0.82)');
    T(ax + 64, ay + 176 - 17, '▶  PLAY THE TAPE', PAL.cyan, 11, 'center', true);
    hot(ax, ay, 128, 176, () => { play('ui_click', 0.4); if (G.homeInspect) G.homeInspect.playing = 0; },
      { label: 'play the tape', focusable: false });
  }
  drawMediaCaseFooter(x, y, w, cy, ch, sc);
}
// title, note and the close box: shared by the cover and the playing screen
function drawMediaCaseFooter(x, y, w, cy, ch, sc) {
  const ty = cy + ch + 8;
  T(x + w / 2, ty, wrapText(sc.title, 34)[0], sc.keeper ? PAL.gold : PAL.white, 12, 'center', true);
  T(x + w / 2, ty + 15, (sc.note || '').slice(0, 38), PAL.dgray, 12, 'center');
  T(x + w - 10, y + 4, 'x', PAL.gray, 14, 'right', true);
  hot(x + w - 26, y + 2, 24, 20, () => { if (G.homeInspect) { G.homeInspect.showCase = null; G.homeInspect.playing = null; } });
}
