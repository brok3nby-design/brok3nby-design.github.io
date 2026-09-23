// ---- the ledger: everything you have unlocked, met, or driven through ----
// Three pages. Unknown things stay on the page, greyed, so the shape of what
// is still out there is visible. Nothing here is generated: it reads the
// same tables the game plays from.
'use strict';

const CODEX_TABS = [['unlocks', 'UNLOCKS'], ['people', 'PEOPLE'], ['places', 'PLACES'], ['tv', 'TV GUIDE'], ['books', 'THE BOOKS']];
const BOOKS_OPEN_DAY = 10;      // the last page stays shut until there is a career to add up
// faces without a portrait: the town runs on them anyway
const CODEX_TOWNFOLK = [
  { name: 'The Auctioneer', tag: 'cash only. as-is. all sales final.', met: () => true },
  { name: 'The Office', tag: 'sells bidder numbers. remembers what you leave.', met: () => true },
  { name: "Roy's Cousin", tag: 'restores dusty and worn pieces overnight, $40', met: () => (G.world.restoredEver || false) },
  { name: 'The Scrap Hauler', tag: 'clears what you leave behind. sometimes he looks first.', met: () => !!(G.world.scrapTold && G.world.scrapTold.length) },
];

function openCodex(tab) {
  if (G.mode === 'codex') return;
  G.codexBack = G.mode;
  G.codexTab = tab || G.codexTab || 'unlocks';
  G.codexScroll = 0;
  G.paused = false;
  G.mode = 'codex';
}
// ---- THE PEOPLE, from the main menu (user, 2026-09-20) ----
// "create a spot in main menu to look at all the rivals and their info. Perhaps general info and it has more
// that can be unlocked." The Ledger's PEOPLE page already is exactly that - the whole cast on one page
// whether or not you have met them, with what you have learned about each filled in as you learn it - and it
// was only ever reachable from inside a run. From the title it reads the SAVE, so a career's worth of
// learning is there between sessions; with no save it is the whole cast, locked, which is a fair advert for
// what is in there. Nothing on the page writes, so the borrowed world is handed straight back on the way out.
function openCodexFromTitle() {
  if (G.mode === 'codex') return;
  const d = (typeof readSave === 'function') ? readSave() : null;
  G.codexPeek = { world: G.world, day: G.day };
  if (d && d.world) { G.world = d.world; G.day = d.day || 1; }
  openCodex('people');
}
function closeCodex() {
  if (G.codexPeek) { G.world = G.codexPeek.world; G.day = G.codexPeek.day; G.codexPeek = null; }
  G.mode = G.codexBack || 'yard';
  G.codexBack = null;
}

// what the player has run into — kept on the world so it saves
function codexMet(id) { return (G.world.met || []).includes(id); }
function codexNoteMet(id) {
  G.world.met = G.world.met || [];
  if (!G.world.met.includes(id)) G.world.met.push(id);
}
function codexVisited(id) { return (G.world.visited || []).includes(id) || G.world.town === id; }

// a card: portrait or sprite on the left, name and two lines on the right
function codexCard(x, y, w, h, known, title, lines, face) {
  panel(x, y, w, h, known ? '#1d2030' : '#15171f', known ? '#4b5478' : '#2a2e40');
  const fx = x + 10, fy = y + Math.round((h - 44) / 2);
  px(g, fx - 2, fy - 2, 48, 48, PAL.ink);
  px(g, fx, fy, 44, 44, known ? '#262a3c' : '#1a1c26');
  if (face) {
    g.globalAlpha = known ? 1 : 0.28;
    if (face.portrait) drawPortrait(face.portrait, fx + 2, fy + 2, 40, 40);
    else if (face.spr) {
      const sp = getSprite(face.spr, face.pal || 'wood', 'Clean', 7);
      const sc = Math.min(40 / sp.width, 40 / sp.height, 2);
      const dw = Math.max(1, Math.round(sp.width * sc)), dh = Math.max(1, Math.round(sp.height * sc));
      g.drawImage(sp, fx + Math.round((44 - dw) / 2), fy + Math.round((44 - dh) / 2), dw, dh);
    }
    g.globalAlpha = 1;
  }
  if (face && face.icon) codexIcon(face.icon, fx + 2, fy + 2, known);
  if (!face || (!known && face.hide)) T(fx + 22, fy + 12, '?', PAL.dgray, 22, 'center', true);
  const tx = x + 64, tw = w - 74;
  g.font = 'bold 13px ' + FONT;
  let ttl = title;
  while (ttl.length > 4 && g.measureText(ttl).width > tw) ttl = ttl.slice(0, -2) + '\u2026';
  T(tx, y + 7, ttl, known ? PAL.white : PAL.dgray, 13, 'left', true);
  // every line wraps; the card shows as many rows as it has room for
  const maxCh = Math.floor(tw / 6.1), rows = Math.floor((h - 26) / 14);
  const flat = [];
  for (const l of lines) { if (!l.t) continue; for (const ln of wrapText(l.t, maxCh)) flat.push({ s: ln, c: l.c }); }
  let ly = y + 24;
  const shown = flat.slice(0, rows);
  // a card with more to say than room to say it ends on an ellipsis: it used to stop dead mid-word, which
  // reads as a bug rather than as a card that is full (2026-09-20)
  if (flat.length > shown.length && shown.length) shown[shown.length - 1] = { s: shown[shown.length - 1].s.replace(/[\s,;:+]+$/, '') + '\u2026', c: shown[shown.length - 1].c };
  for (const l of shown) { T(tx, ly, l.s, known ? (l.c || PAL.gray) : '#3f465c', 12); ly += 14; }
}
// little pictures for the things that have no sprite: a van, a laminated card
function codexIcon(kind, x, y, known) {
  const a = known ? PAL.gray : '#2c3040', b = known ? PAL.lmetal : '#363b4e', k = PAL.ink;
  if (kind === 'van') {
    px(g, x + 4, y + 12, 32, 18, k); px(g, x + 6, y + 14, 28, 14, a);          // body
    px(g, x + 26, y + 16, 8, 6, known ? PAL.cyan : '#3a4256');                    // windscreen
    px(g, x + 8, y + 16, 12, 8, b);                                              // panel
    px(g, x + 8, y + 28, 8, 8, k); px(g, x + 24, y + 28, 8, 8, k);               // wheels
    px(g, x + 10, y + 30, 4, 4, b); px(g, x + 26, y + 30, 4, 4, b);
  } else if (kind === 'card') {
    px(g, x + 6, y + 8, 28, 24, k); px(g, x + 8, y + 10, 24, 20, known ? PAL.paper : '#2c3040');
    px(g, x + 11, y + 14, 18, 3, known ? PAL.dpaper : '#363b4e');
    px(g, x + 11, y + 20, 12, 2, known ? PAL.dgray : '#363b4e');
    px(g, x + 11, y + 24, 14, 2, known ? PAL.dgray : '#363b4e');
    if (known) T(x + 30, y + 15, '88', PAL.ink, 9, 'right', true);
  } else if (kind === 'tv') {
    px(g, x + 5, y + 8, 30, 24, k); px(g, x + 7, y + 10, 26, 20, known ? '#4a3a2a' : '#2c3040');
    px(g, x + 9, y + 12, 18, 16, known ? PAL.cyan : '#363b4e');                     // screen
    if (known) { px(g, x + 9, y + 12, 18, 2, 'rgba(255,255,255,0.35)'); px(g, x + 9, y + 20, 18, 1, 'rgba(0,0,0,0.3)'); }
    px(g, x + 29, y + 13, 3, 3, known ? PAL.gold : '#363b4e'); px(g, x + 29, y + 19, 3, 3, known ? PAL.gray : '#363b4e');   // knobs
    px(g, x + 14, y + 2, 2, 7, k); px(g, x + 24, y + 2, 2, 7, k);                    // rabbit ears
    px(g, x + 12, y + 32, 16, 3, k);                                                  // feet
  }
}

function drawCodex() {
  if (!drawBG()) px(g, 0, 0, W, H, '#111320');
  px(g, 0, 0, W, 36, PAL.ink);
  px(g, 0, 34, W, 2, PAL.slate);
  T(16, 6, G.codexPeek ? 'THE PEOPLE' : 'THE LEDGER', PAL.yellow, 24, 'left', true, LOGO_FONT);
  let tx = 190;
  // from the menu there is no run to have unlocks, places, a TV guide or books in, so there is one page
  for (const [id, label] of (G.codexPeek ? CODEX_TABS.filter(([i]) => i === 'people') : CODEX_TABS)) {
    const on = G.codexTab === id;
    const shut = id === 'books' && G.day < BOOKS_OPEN_DAY;
    button(tx, 5, 118, 26, label, () => { G.codexTab = id; G.codexScroll = 0; }, { col: on ? PAL.blue : (shut ? '#2e3244' : PAL.slate), fs: 12 });
    tx += 124;
  }
  button(W - 124, 5, 108, 26, 'BACK', () => closeCodex(), { col: PAL.dgreen, fs: 13 });

  if (G.codexTab === 'unlocks') drawCodexUnlocks();
  else if (G.codexTab === 'people') drawCodexPeople();
  else if (G.codexTab === 'tv') drawCodexTv();
  else if (G.codexTab === 'books') drawCodexBooks();
  else drawCodexPlaces();
}

// ---- THE BOOKS: the career, added up. Shut until day ten. ----
// Two columns of what happened and one of what was written down. No bars, no
// percentages, nothing to fill. The silly column is the true one.
function booksRows() {
  const c = careerBook();
  const rn = (id) => { const n = NPCS.find((x) => x.id === id) || EXTRA_NPCS[id]; return n ? n.name : 'nobody'; };
  const tn = (id) => (TOWNS[id] || {}).name || 'nowhere';
  const door = (d) => (d ? 'unit ' + d.unit + ', ' + d.name + ' · ' + tn(d.town) + ', day ' + d.day + ' · ' + (d.net >= 0 ? '+' : '-') + fmt$(Math.abs(d.net)) : 'none yet');
  const tw = topOf(c.townWins), bt = topOf(c.beat), bb = topOf(c.beatenBy);
  const left = [
    ['spent at auction', fmt$(c.spentAuction)],
    ['sold for', fmt$(c.sales)],
    ['gas', fmt$(c.gas)],
    ['doors won / lost', c.won + ' / ' + c.lost],
    ['best door', door(c.best)],
    ['worst door', door(c.worst)],
    ['the yard that likes you', tw ? tn(tw.id) + ' (' + tw.n + ' doors)' : 'none yet'],
    ['beaten most often', bt ? rn(bt.id) + ', ' + bt.n + ' time' + (bt.n === 1 ? '' : 's') : 'nobody'],
    ['beat you most often', bb ? rn(bb.id) + ', ' + bb.n + ' time' + (bb.n === 1 ? '' : 's') : 'nobody'],
    ['left in the dark', c.abandoned + ' things, about ' + fmt$(c.abandonedValue)],
    ['myths / fakes', c.myths + ' / ' + c.fakes],
    ['sets completed', String(c.sets)],
    ['keys that fit', String(c.keys)],
  ];
  const right = [
    ['boxes opened', String(c.boxes)],
    ['times Ed fooled you', String(c.edFooled)],
    ['raccoon losses', String(c.raccoon)],
    ...(typeof racCount === 'function' && racCount() ? [['the raccoon\'s account', racCount() + ' of ' + RAC_SET_N]] : []),
    ['bags of actual garbage bought', String(c.garbage)],
    ['things crushed on Route 9', String(c.crushed)],
    ["Pete's take", fmt$(c.petesTake)],
    ['blind bids won / regretted', c.blind + ' / ' + c.blindRegret],
    ['odd jobs worked', String(c.oddJobs)],
    ['faces called out', String(c.calledOut)],
    ['things said out loud / caught out', c.slips + ' / ' + c.slipsCaught],
    ['rivals run past their number', String(c.ranUp)],
    ['run-ups that stuck to you', String(c.bluffCalled)],
    ['last ten doors, net', (doorMargin() >= 0 ? '+' : '-') + fmt$(Math.abs(doorMargin()))],
    ['steals / baths, last ten', doorLog().slice(-10).filter((d) => d.verdict === 'steal').length + ' / ' + doorLog().slice(-10).filter((d) => d.verdict === 'bath').length],
    ['what the yard calls you', yardName() === 'whale' ? 'the whale' : (yardName() === 'shark' ? 'the shark' : 'nothing yet')],
    ['sales stood LOUD / sat QUIET', c.loudSales + ' / ' + c.quietSales],
    ['quiet comebacks', String(c.comebacks)],
    ['commissions delivered', String(c.commissions)],
    ['weekly bills paid / missed', c.nutPaid + ' / ' + c.nutMissed],
    ['office favours used', String(c.favoursUsed)],
    ['doors split with a partner', String(c.partnered)],
    ['faces you have figured out', String(Object.keys(RIVAL_RULES).filter((id) => ruleLearned(id)).length) + ' of ' + Object.keys(RIVAL_RULES).length],
  ];
  return { left, right };
}
function drawCodexBooks() {
  if (G.day < BOOKS_OPEN_DAY) {
    T(W / 2, 220, 'THE BOOKS', PAL.dgray, 22, 'center', true);
    T(W / 2, 256, 'shut until day ' + BOOKS_OPEN_DAY + '. there is not enough to add up yet.', PAL.dgray, 14, 'center');
    T(W / 2, 278, 'day ' + G.day + ' now. keep going.', '#3f465c', 13, 'center');
    return;
  }
  const rows = booksRows();
  const col = (x, w, title, list, y0) => {
    T(x, y0, title, PAL.gray, 14, 'left', true);
    let y = y0 + 20;
    for (const [k, v] of list) {
      T(x, y, k, PAL.dgray, 12);
      const lines = wrapText(v, Math.floor(w / 6.4));
      T(x + w, y, lines[0], PAL.white, 12, 'right');
      if (lines.length > 1) { y += 14; T(x + w, y, lines[1], PAL.white, 12, 'right'); }
      y += 17;
    }
    return y;
  };
  col(24, 400, 'THE LEDGER', rows.left, 46);
  col(452, 220, 'THE OTHER COLUMN', rows.right, 46);
  // for the record: what has been written down, and the shape of what has not
  T(700, 46, 'FOR THE RECORD', PAL.gray, 14, 'left', true);
  const got = G.world.achieved || {};
  // 31 entries at 17px from y 66 ran to 576: through the footer and off the bottom of the screen, so the
  // last five were never seen. The hidden ones not yet found now share ONE line (they are secrets — a
  // row of "? ? ?" per secret only counted them out loud), and if the list still will not fit above the
  // footer the rows close up rather than run off.
  const shown = ACHIEVEMENTS.filter((a) => !a.hidden || got[a.id]);
  const secret = ACHIEVEMENTS.length - shown.length;
  const step = Math.min(17, Math.floor((494 - 66) / (shown.length + (secret ? 1 : 0))));
  let y = 66, tip = null;
  for (const a of shown) {
    const on = !!got[a.id];
    px(g, 700, y + 3, 7, 7, on ? PAL.gold : '#2e3244');
    T(712, y, a.name, on ? PAL.gold : '#3f465c', 12, 'left', on);
    if (on) T(936, y, 'day ' + got[a.id], PAL.dgray, 11, 'right');
    if (inRect(mouse.x, mouse.y, 700, y - 2, 236, step - 1)) tip = { cx: 818, top: y + 14, t: on ? a.line : 'not yet.', c: on ? PAL.gold : PAL.dgray };
    y += step;
  }
  if (secret) T(700, y, '? ? ?   and ' + secret + ' more nobody talks about', '#3f465c', 12);
  T(24, 500, 'numbers, for once. the other column is the true one.', PAL.dgray, 13);
  if (tip) drawTooltip(tip.cx, tip.top, tip.t, tip.c);
}

function drawCodexUnlocks() {
  // ---- toolbox ----
  T(24, 46, 'THE TOOLBOX', PAL.gray, 14, 'left', true);
  const toolIds = Object.keys(TOOLS);
  for (let i = 0; i < toolIds.length; i++) {
    const id = toolIds[i], td = TOOLS[id];
    const own = hasTool(id);
    const x = 24 + (i % 2) * 232, y = 64 + Math.floor(i / 2) * 70;
    const lines = own ? [{ t: td.blurb, c: PAL.lblue }, { t: 'in the van', c: PAL.green }]
      : [{ t: td.dropOnly ? 'turns up in units, if it turns up' : 'general store from day ' + (TOOL_UNLOCK[id] || '?') + ', about ' + fmt$(td.price) }];
    codexCard(x, y, 224, 64, own, td.name, lines, { spr: td.spr });
  }

  // ---- the van + the number ----
  T(24, 280, 'WHEELS & PAPERWORK', PAL.gray, 14, 'left', true);
  const vans = [['Beater van', 40, 'day one. it runs.'], ['Panel van', 60, 'Dusty Flats Motors, $400'], ['Box truck', 90, 'Dusty Flats Motors, $1,100']];
  for (let i = 0; i < vans.length; i++) {
    const [nm, cap, note] = vans[i];
    const own = (typeof vanBaseCap === 'function' ? vanBaseCap() : G.vanCap) >= cap;
    codexCard(24 + i * 154, 298, 148, 64, own, nm, [{ t: cap + ' bulk' }, { t: own ? ((typeof vanBaseCap === 'function' ? vanBaseCap() : G.vanCap) === cap ? 'driving it now' : 'traded up') : note, c: own ? PAL.green : PAL.gray }], { icon: 'van' });
  }
  const bn = !!G.world.bidderNumber;
  codexCard(24, 368, 456, 64, bn, 'Bidder Number 88', [{ t: 'required at every yard past Dusty Flats' }, { t: bn ? 'laminated. almost spelled right.' : 'the office sells them, $75', c: bn ? PAL.green : PAL.gray }], { icon: 'card' });

  // ---- the myths ----
  T(504, 46, 'THE MYTHS', PAL.gray, 14, 'left', true);
  for (let i = 0; i < LEGENDARY_BASES.length; i++) {
    const b = LEGENDARY_BASES[i];
    const found = G.foundLegends.includes(b.id);
    const home = TOWN_ORDER.find((tid) => (TOWNS[tid].myths || []).includes(b.id));
    const lines = found ? [{ t: CATS[b.cat].label + '  ·  ' + fmt$(b.val), c: PAL.gold }, { t: 'found. the museum wing remembers.', c: PAL.green }]
      : [{ t: 'rumoured around ' + (home ? TOWNS[home].name : 'somewhere') }, { t: 'one of a kind. calendar-seeded.' }];
    codexCard(504, 64 + i * 70, 432, 64, found, found ? b.name : '? ? ?', lines, { spr: b.spr, pal: 'gold', hide: true });
  }

  // ---- the sets ----
  T(504, 350, 'THE SETS', PAL.gray, 14, 'left', true);
  const setIds = Object.keys(SETS);
  for (let i = 0; i < setIds.length; i++) {
    const sd = SETS[setIds[i]];
    const done = (G.world.setsCompleted || []).find((c) => c.id === sd.id);
    const seen = (G.world.setsAppraised || []).includes(sd.id);
    const where = TOWN_ORDER.filter((tid) => (TOWNS[tid].sets || []).includes(sd.id)).map((tid) => TOWNS[tid].name).join(', ');
    const pieces = Object.keys(sd.roles).reduce((a, r) => a + sd.roles[r].n, 0);
    const lines = done ? [{ t: 'completed in ' + done.brand + ', day ' + done.day, c: PAL.gold }, { t: pieces + ' pieces. collectors travelled.', c: PAL.green }]
      : seen ? [{ t: pieces + ' pieces  ·  ' + where }, { t: 'a piece has been under your loupe', c: PAL.cyan }]
        : [{ t: pieces + ' pieces  ·  ' + where }, { t: 'appraise a piece to learn its name' }];
    codexCard(504 + (i % 2) * 220, 368 + Math.floor(i / 2) * 70, 212, 64, seen || !!done, seen || done ? sd.name : '? ? ?', lines, { spr: sd.completeSpr, hide: true });
  }
  T(24, 516, 'greyed: not yet. the shape of what is still out there.', PAL.dgray, 13);
}

// a rival's card line changes with what is between you right now
function rivalTagNow(d) {
  const mem = G.world.rivalMem || {};
  const h = playerHabits();
  if (d.id === 'bart' && bartBrokeOn(G.world, G.day)) return 'truck in the shop.';   // short: the card shows three rows
  if (d.id === 'bart' && (mem.bartGrudgeUntil || 0) >= G.day) return 'back. holds a grudge.';
  if (d.id === 'bart' && (mem.bartOwesUntil || 0) >= G.day) return 'back. owes you one.';
  if (d.id === 'bart' && (mem.bartAskingUntil || 0) >= G.day) return 'asking about your number.';
  if (d.id === 'sal' && (mem.salTrophiesUntil || 0) >= G.day) return "has Merle's trophies. won't sell.";
  if (d.id === 'sal' && (mem.salGrudgeUntil || 0) >= G.day) return 'holds a grudge. currently holding one.';
  if (d.id === 'sal' && h.cats.length) return 'bids YOU up. knows what you collect.';
  if (d.id === 'duo' && duoSplitOn(G.world, G.day)) return 'split up. one paddle each.';
  if (d.id === 'duo' && (mem.duoGrudgeUntil || 0) >= G.day) return 'back together. against you.';
  if (d.id === 'duo' && (mem.duoOwesUntil || 0) >= G.day) return 'back together. easy on you.';
  if (d.id === 'ed' && edNotebookGone(G.world, G.day)) return 'notebook missing. guessing.';
  if (d.id === 'ed' && (mem.edOwesUntil || 0) >= G.day) return 'got his notebook back. owes you.';
  if (d.id === 'ed' && (mem.edQuietUntil || 0) >= G.day) return 'sharp eyes. notebook closed, or lying. for now.';
  if (d.id === 'ed' && h.followsEd) return 'sharp eyes. has noticed yours.';
  if (typeof awayOn === 'function' && awayOn(d.id, G.world, G.day)) return 'out of town this week.';
  if (typeof awayHungryOn === 'function' && awayHungryOn(d.id, G.world, G.day)) return d.tag + '. back, and behind.';
  const sv = (typeof standingOf === 'function') ? standingOf(d.id) : 0;
  if (sv <= -4) return d.tag + '. has it in for you.';
  if (sv <= -2) return d.tag + '. sore at you.';
  if (sv >= WARM_AT) return d.tag + '. warm to you, for now.';
  if (sv >= 1) return d.tag + '. nods at you now.';
  const st = rivalStance(d.id);
  if (st === 'cocky') return d.tag + '. your problem, lately.';
  if (st === 'wary') return d.tag + '. has stopped looking at you.';
  return d.tag;
}
// twenty-one rivals, five buyers and the folks around town do not fit one
// screen: the page scrolls (wheel, PageUp/PageDown, the bumpers)
function drawCodexPeople() {
  const off = -(G.codexScroll || 0);
  g.save();
  g.beginPath(); g.rect(0, 40, W, 456); g.clip();
  let y = 46 + off;
  T(24, y, 'RIVAL BIDDERS', PAL.gray, 14, 'left', true);
  const yn = typeof yardName === 'function' ? yardName() : null;
  const snipe = typeof sniperNow === 'function' && sniperNow();
  const names = [];
  if (yn) names.push(yn === 'whale' ? 'THE WHALE: they run you up on purpose' : 'THE SHARK: they fold early, the office opens you higher');
  if (snipe) names.push('THE SNIPER: the count runs longer on you');
  if (names.length) T(936, y, 'the yard calls you ' + names.join('  ·  '), yn === 'whale' ? PAL.lred : (yn ? PAL.cyan : PAL.orange), 13, 'right', true);
  y += 18;
  const rivals = NPCS.concat(Object.values(EXTRA_NPCS), [CROWD_DEF]);
  for (let i = 0; i < rivals.length; i++) {
    const d = rivals[i];
    const met = d.id === 'crowd' || codexMet(d.id);
    const homeTowns = d.id === 'crowd' ? ['every yard'] : TOWN_ORDER.filter((tid) => (TOWNS[tid].rivals || []).includes(d.id)).map((tid) => TOWNS[tid].name);
    const home = homeTowns.join(', ') || 'Dusty Flats and the road';
    // a card is three rows of twenty-four characters, and the full list of towns ate all three of them
    const homeShort = homeTowns.length > 2 ? homeTowns[0] + ' +' + (homeTowns.length - 1) : (homeTowns.join(' & ') || 'Dusty Flats + the road');
    const known = (typeof tellKnown === 'function') ? tellKnown(d.id) : null;
    // what the Ledger has learned about the face outranks where it drinks: the tell line goes second
    const tellLine = known === 'honest' ? 'tell: sweats when close.' : (known === 'act' ? 'tell: nerves are an act.' : '');
    const spentNow = (met && d.id !== 'crowd' && typeof rivalSpentToday === 'function') ? rivalSpentToday(d.id) : 0;
    const ruleM = ((G.world.rivalMem || {}).rules || {})[d.id];
    const ruleLine = (typeof ruleLearned === 'function' && ruleLearned(d.id)) ? ruleShort(d.id) + ' ' + ruleM.right + '/' + (ruleM.right + ruleM.wrong) : '';
    // what is still to come. A card only has room for three rows, so a face you have learned nothing about
    // spends one of them SAYING there is something to learn - that is the part the menu is advertising.
    const toLearn = [];
    if (d.id !== 'crowd' && !tellLine) toLearn.push('their tell');
    if (d.id !== 'crowd' && RIVAL_RULES[d.id] && !ruleLine) toLearn.push('how they bid');
    // one row is what is left after what they are doing today and what you already know, so two things to
    // learn are counted rather than listed
    const learnLine = toLearn.length > 1 ? 'to learn: ' + toLearn.length + ' things' : (toLearn.length ? 'to learn: ' + toLearn[0] : '');
    // what your own notebook says about them, which outranks what is still to learn (2026-09-22)
    const bookL = (typeof bookLine === 'function' && d.id !== 'crowd') ? bookLine(d.id) : '';
    const lines = met ? [{ t: rivalTagNow(d), c: PAL.orange }, { t: bookL, c: PAL.paper }, { t: ruleLine, c: PAL.cyan }, { t: spentNow > 0 ? 'spent ' + fmt$(spentNow) + ' today' : '', c: PAL.yellow }, { t: tellLine, c: PAL.lblue },
      { t: learnLine, c: PAL.dgray },
      { t: 'seen around ' + home + (d.budget ? '  \u00b7  wallet about ' + fmt$(d.budget) : '') }]
      // not met: what they are, where they bid, and that you have not stood next to them yet
      : [{ t: d.tag || '' }, { t: 'bids at ' + homeShort }, { t: 'not met yet' }];
    const rx = 24 + (i % 4) * 230, ry = y + Math.floor(i / 4) * 78;
    codexCard(rx, ry, 222, 70, met, met ? d.name : '? ? ?', lines, { portrait: d.id });
    if (met && d.id !== 'crowd') hot(rx, ry, 222, 70, () => { play('ui_click', 0.5); npcIntroShow(d.id, 'codex'); });
  }
  y += Math.ceil(rivals.length / 4) * 78 + 8;

  T(24, y, 'BUYERS', PAL.gray, 14, 'left', true); y += 18;
  for (let i = 0; i < BUYERS.length; i++) {
    const b = BUYERS[i];
    const met = b.id === 'pete' || codexMet(b.id);
    const inTown = G.today && (b.appraiser ? !!G.today.appraiser : G.today.specialists.some((s) => s.def.id === b.id));
    const how = b.appraiser ? fmt$(b.fee) + ' a look, ' + b.perVisit + ' looks a visit. ' + (inTown ? 'in town today.' : 'every few days; the paper says when.')
      : b.cash === Infinity ? 'always in town. pays ' + Math.round(b.mult * 100) + '% and takes junk by the pile.' : 'pays about ' + Math.round(b.mult * 100) + '% of value. ' + (inTown ? 'in town today.' : 'the paper says when.');
    const regular = ((G.world.regulars || {})[b.id] || 0) >= REGULAR_AT;
    const lines = met ? [{ t: (regular ? 'a regular: calls in door tips. ' : '') + b.blurb, c: regular ? PAL.gold : PAL.cyan }, { t: how, c: inTown ? PAL.green : PAL.gray }]
      : [{ t: b.blurb + '. the paper announces them the day before.' }];
    codexCard(24 + (i % 4) * 230, y + Math.floor(i / 4) * 78, 222, 70, met, met ? b.name : '? ? ?', lines, { portrait: b.id });
  }
  y += Math.ceil(BUYERS.length / 4) * 78 + 8;

  T(24, y, 'AROUND TOWN', PAL.gray, 14, 'left', true); y += 18;
  for (let i = 0; i < CODEX_TOWNFOLK.length; i++) {
    const f = CODEX_TOWNFOLK[i];
    const met = f.met();
    codexCard(24 + i * 230, y, 222, 60, met, f.name, [{ t: f.tag }, { t: met ? '' : 'not yet' }], null);
  }
  y += 66;
  g.restore();
  G.codexScrollMax = Math.max(0, (y - off) - 496);
  // the list is cut at 496, and without an edge the cut ran straight through a card's text four pixels
  // above this line, so the footer read as printed over the card. A bar like the header's gives the
  // scroll a floor, and the fade says there is more below.
  if (G.codexScrollMax && (G.codexScroll || 0) < G.codexScrollMax) {
    const fade = g.createLinearGradient(0, 470, 0, 496);
    fade.addColorStop(0, 'rgba(17,19,32,0)'); fade.addColorStop(1, 'rgba(17,19,32,0.9)');
    g.fillStyle = fade; g.fillRect(0, 470, W, 26);
  }
  px(g, 0, 496, W, H - 496, PAL.ink);
  px(g, 0, 496, W, 2, PAL.slate);
  T(24, 506, 'faces grey out until you have shared a yard, a sale, or a story with them.' + (G.codexScrollMax ? '   \u00b7   wheel to scroll' : ''), PAL.dgray, 13);
}

// a town postcard: your art from towns/tn_<id>.png, dimmed until you have
// been there; the slot names its own file while it waits
function townImageSlot(tid, x, y, w, h, been) {
  px(g, x - 2, y - 2, w + 4, h + 4, PAL.ink);
  const list = _townImg[tid];
  if (list && list.length) {
    g.drawImage(list[strHash(tid + '_' + G.day) % list.length], x, y, w, h);
    if (!been) px(g, x, y, w, h, 'rgba(12,14,22,0.72)');
  } else {
    px(g, x, y, w, h, been ? '#d6c9a8' : '#3a3730');
    g.fillStyle = been ? '#b8a982' : '#2e2c27';
    for (let yy = 4; yy < h - 4; yy += 6)
      for (let xx = (yy / 6) % 2 ? 7 : 4; xx < w - 4; xx += 6) g.fillRect(x + xx, y + yy, 2, 2);
    T(x + w / 2, y + h / 2 - 14, '[ TOWN ]', been ? '#6b5f45' : '#5a5648', 12, 'center', true);
    T(x + w / 2, y + h / 2 + 2, 'tn_' + tid + '.png', been ? '#6b5f45' : '#5a5648', 9, 'center');
  }
}

function drawCodexPlaces() {
  T(24, 46, 'THE HIGHWAY  ·  ' + TOWN_ORDER.length + ' TOWNS', PAL.gray, 14, 'left', true);
  for (let i = 0; i < TOWN_ORDER.length; i++) {
    const t = TOWNS[TOWN_ORDER[i]];
    const here = G.world.town === t.id;
    const been = codexVisited(t.id);
    const x = 24 + (i % 3) * 306, y = 64 + Math.floor(i / 3) * 142, w = 298, h = 132;
    panel(x, y, w, h, been ? (here ? '#1f2a24' : '#1d2030') : '#15171f', here ? PAL.green : (been ? '#4b5478' : '#2a2e40'));
    // postcard on the left, the write-up on the right
    townImageSlot(t.id, x + 10, y + 10, 120, 90, been);
    T(x + 70, y + h - 24, here ? 'YOU ARE HERE' : (been ? 'visited' : 'never been'), here ? PAL.green : (been ? PAL.cyan : '#3f465c'), 11, 'center', true);
    const tx = x + 142, tw = w - 152;
    const dim = '#3f465c';
    T(tx, y + 8, t.name.toUpperCase(), been ? PAL.white : PAL.dgray, 15, 'left', true);
    T(tx, y + 27, 'tier ' + t.tier + (t.gasCost ? '  ·  gas ' + fmt$(t.gasCost) : (yardOwned() ? '  ·  yours' : '  ·  home')), t.id === 'dustyFlats' && yardOwned() ? PAL.gold : (been ? PAL.gray : dim), 11);
    let ly = y + 42;
    for (const line of wrapText(t.blurb, Math.floor(tw / 6.1)).slice(0, 3)) { T(tx, ly, line, been ? PAL.gray : dim, 12); ly += 14; }
    ly += 2;
    if (t.stub) {
      T(tx, ly, 'the road does not go there yet.', dim, 12); ly += 14;
    } else {
      T(tx, ly, '$' + t.bidStep + ' raises  ·  ' + (t.paperName ? 'has a paper' : 'no paper'), been ? PAL.cyan : dim, 12); ly += 14;
      const m = (t.myths || []).length, s = (t.sets || []).length, r = (t.rivals || []).length;
      T(tx, ly, m + ' myth' + (m === 1 ? '' : 's') + ' · ' + s + ' set' + (s === 1 ? '' : 's') + (r ? ' · ' + r + ' local rival' + (r === 1 ? '' : 's') : ''), been ? PAL.gray : dim, 12); ly += 14;
      if (t.gate) {
        const gs = townGateStatus(t);
        const left = gs.checks.filter((c) => !c.ok).length;
        T(tx, ly, gs.ok ? 'the clerk waves you through' : 'gate: ' + left + ' of ' + gs.checks.length + ' things still wanted', gs.ok ? PAL.green : PAL.orange, 12); ly += 14;
      }
    }
  }
  T(24, 500, 'the map sells the gas. this page just remembers where you have been.', PAL.dgray, 13);
  // the world itself: same words, same lockers, for anyone who types them
  T(24, 518, 'world  ' + seedLabel(), PAL.dgray, 12);
  g.font = '12px ' + FONT;
  button(24 + Math.ceil(g.measureText('world  ' + seedLabel()).width) + 14, 514, 56, 20, 'COPY', () => copySeed(), { col: PAL.slate, fs: 11 });
}
