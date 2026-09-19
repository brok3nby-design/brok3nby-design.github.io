// ---- the soft ending: the yard is for sale, and nobody will say so loudly ----
// Somebody mentions the owner is tired. The paper prints a maybe. A small
// sign goes up. A rival names a number. Then one ordinary conversation at the
// office has a button in it. Buy the yard and the game keeps going; it just
// calls you boss now.
'use strict';

const YARD_PRICE = 90000;
function yardState(world) {
  world.yard = world.yard || { stage: 0, stageDay: 0, paperDay: 0, owned: null, price: YARD_PRICE };
  return world.yard;
}
function yardOwned() { return !!(G.world && G.world.yard && G.world.yard.owned); }

// once a night: the story moves one step when its time has come
function yardNightly() {
  const y = yardState(G.world);
  if (y.owned) return;
  const stamp = (kind, data) => { const e = recordEvent(kind, data || {}); if (e) e.town = 'dustyFlats'; };
  if (y.stage === 0 && (netWorth() >= 25000 || G.day >= 40)) { y.stage = 1; y.stageDay = G.day; stamp('yardRumor'); }
  else if (y.stage === 1 && G.day >= y.stageDay + 3) { y.stage = 2; y.stageDay = G.day; y.paperDay = G.day + 1; }
  else if (y.stage === 2 && G.day >= y.stageDay + 4) { y.stage = 3; y.stageDay = G.day; stamp('yardSign'); }
  else if (y.stage === 3 && G.day >= y.stageDay + 3) { y.stage = 4; y.stageDay = G.day; }
}
// the paper's maybe, on its day
function yardPaper(day, world) {
  const y = world.yard;
  if (!y || y.paperDay !== day) return null;
  return { story: { id: 'yard_sale', kind: 'flavor', headline: 'LOCAL STORAGE YARD MAY CHANGE HANDS', img: 'yard_sale' },
    text: 'The owner of the Dusty Flats yard, who has run three doors a day for longer than the paper has run, was overheard at the diner saying he "might be done." Asked to confirm, he said the coffee was good. Regulars are advised that nothing is for sale. Regulars are advised to keep an eye on the office wall anyway.',
    unitKnown: false, named: null, about: null };
}
function yardAd(declined) {
  const body = [
    'STORAGE YARD. Three rows, office, raccoon. Serious inquiries only. Ask at the office. Do not ask twice.',
    'STORAGE YARD. Still. Ask at the office. You know where the office is.',
    'STORAGE YARD. Serious inquiries. We said serious. The raccoon has an offer in.',
  ];
  return { id: 'ad_yard', kind: 'ad', body: body[Math.min(declined || 0, body.length - 1)] };
}

// the sign on the yard, and the conversation behind it
function yardSignVisible() {
  const y = G.world.yard;
  return G.world.town === 'dustyFlats' && y && y.stage >= 3 && !y.owned;
}
function yardTalk() {
  const y = yardState(G.world);
  if (y.stage < 4) {
    G.modal = { title: 'The office, about the sign:', lines: [
      { text: '"He\'s asking ' + fmt$(y.price) + '. He is not taking offers yet."', col: PAL.white },
      { text: '"Soon, he says. He has been saying soon for a week."', col: PAL.gray },
    ], buttons: [{ label: 'NOT TODAY', cb: () => { G.modal = null; } }] };
    return;
  }
  const can = G.money >= y.price;
  G.modal = { title: 'The office, about the sign:', lines: [
    { text: '"' + fmt$(y.price) + '. He\'ll take it from you. He said so."', col: PAL.white },
    { text: can ? '"Cash, as-is, all sales final. Same as a locker."' : '"When you have it. He is not going anywhere. He says."', col: PAL.gray },
  ], buttons: [
    { label: 'MAKE AN OFFER  ' + fmt$(y.price), cb: () => buyYard(), disabled: !can, col: '#8a6420' },
    { label: 'NOT TODAY', cb: () => { G.modal = null; if (can) y.declined = (y.declined || 0) + 1; } },   // the classified gets ruder
  ] };
}
function buyYard() {
  const y = yardState(G.world);
  if (G.money < y.price) { play('denied'); return; }
  spend(y.price);
  y.owned = G.day;
  const e = recordEvent('yard', { name: 'the yard', amt: y.price });
  if (e) e.town = 'dustyFlats';
  // the deed goes on the museum shelf. It is not for sale. Nothing on that shelf is.
  G.trophies.push({
    uid: nextUid(), hseed: 4177, base: 'deed', cat: 'antiques', spr: 'deed', size: 1, pal: 'gold', cond: 'Mint',
    name: 'Deed to the Dusty Flats Storage Yard', val: y.price, cash: null, container: null, locked: false, opened: false,
    loot: null, legendary: false, searched: true, yardDeed: true, layer: 0, col: 0, wCols: 1,
  });
  play('legendary_fanfare');
  shake(3, 0.4);
  G.modal = { title: 'SOLD. To you.', lines: [
    { text: 'The owner shakes your hand and does not let go for a while.', col: PAL.white },
    { text: '"Three doors a day. Read the paper. You know the rest."', col: PAL.cyan },
    { text: 'The clerk is already repainting a parking space.', col: PAL.gray },
  ], buttons: [{ label: 'NICE', cb: () => { const back = G.mode; G.modal = null; startCredits(back); } }] };   // then the credits roll. Then the game goes on.
}
// what the yard pays its owner, and what it stops charging
function yardIncome() { return yardOwned() ? 120 : 0; }

// ---- the credits: after the yard is yours, and from the title once it is ----
// A slow scroll. You, the people you bid against, the towns you saw, who made
// the pictures, who made everything else, and the raccoon. Then CONTINUE,
// because the game does not end. It just calls you boss now.
const CREDITS_MAKER = 'one person, a van, and a lot of coffee';   // put your name here
function creditsLines() {
  const L = [];
  const h = (t) => { L.push({ t: '', s: 14 }); L.push({ t, c: PAL.gold, s: 20, b: true }); };
  const l = (t, c) => L.push({ t, c: c || PAL.white, s: 16 });
  L.push({ t: 'YOU MADE IT', c: PAL.yellow, s: 44, b: true, logo: true });
  l('the yard is yours. the game does not end. it just calls you boss now.', PAL.gray);
  h('STARRING');
  l('you, ' + playerEpithet('dustyFlats'));
  l(G.worldSeedText ? 'in the world called "' + G.worldSeedText + '"' : 'in world ' + G.worldSeed, PAL.gray);
  h('THE YARD');
  for (const n of ['The Auctioneer', 'The Office', "Roy's Cousin", 'The Scrap Hauler', 'Pawn Pete']) l(n);
  h('THE PEOPLE YOU BID AGAINST');
  const rivals = NPCS.concat(Object.keys(EXTRA_NPCS).map((k) => EXTRA_NPCS[k])).filter((d) => codexMet(d.id)).map((d) => d.name);
  if (rivals.length) for (const n of rivals) l(n); else l('nobody. that cannot be right.', PAL.gray);
  h('THE PEOPLE WHO PAID');
  for (const b of BUYERS) if (b.id !== 'pete' && codexMet(b.id)) l(b.name);
  h('THE HIGHWAY');
  const seen = TOWN_ORDER.filter((id) => (G.world.visited || []).includes(id) || G.world.town === id);
  for (const id of seen) l(TOWNS[id].name);
  const unseen = TOWN_ORDER.length - seen.length;
  if (unseen > 0) l('and ' + unseen + ' town' + (unseen === 1 ? '' : 's') + ' you never saw', PAL.gray);
  h('THE BOOKS');
  l('day ' + G.day + '.  ' + countEvents('won') + ' doors taken.  ' + G.foundLegends.length + ' myth' + (G.foundLegends.length === 1 ? '' : 's') + '.  ' + G.trophies.length + ' on the shelf.', PAL.gray);
  h('IMAGES');
  l('generated with ChatGPT and Grok, from prompts in docs/ART_PROMPTS.md', PAL.gray);
  h('VOICE, MUSIC, WORDS, CODE');
  l(CREDITS_MAKER);
  h('AND');
  l('Deposits, the raccoon.');
  l('he had an offer in.', PAL.gray);
  L.push({ t: '', s: 30 });
  l('three doors a day. read the paper.', PAL.gold);
  return L;
}
function startCredits(back) {
  G.credits = { back: back || 'title', t: 0, y: H + 10, lines: creditsLines(), done: false };
  G.mode = 'credits';
  _musicPoll = 0;
  speak(['nar_credits'], true);        // the last thing he says, and the last time you hear him
}
function endCredits() {
  if (!G.credits) return;
  const back = G.credits.back;
  G.credits = null;
  G.mode = back;
  _musicPoll = 0;
}
function drawCredits(dt) {
  const c = G.credits;
  if (!drawBG()) px(g, 0, 0, W, H, '#07080c');
  px(g, 0, 0, W, H, 'rgba(4,5,9,0.55)');
  c.t += dt;
  let total = 0;
  for (const ln of c.lines) total += ln.s + 10;
  const endY = H / 2 - total + 60;                    // the last line parks just under the middle
  if (!c.done) {
    c.y -= 28 * dt;
    if (c.y <= endY) { c.y = endY; c.done = true; }
  }
  let y = c.y;
  for (const ln of c.lines) {
    if (ln.t && y > -60 && y < H + 20) {
      if (ln.logo) T(W / 2, y, ln.t, ln.c, ln.s, 'center', true, LOGO_FONT);
      else T(W / 2, y, ln.t, ln.c, ln.s, 'center', !!ln.b);
    }
    y += ln.s + 10;
  }
  px(g, 0, 0, W, 40, 'rgba(4,5,9,0.5)'); px(g, 0, H - 64, W, 64, 'rgba(4,5,9,0.5)');
  // a click hurries it along; the button ends it
  hot(0, 0, W, H - 70, () => { if (!c.done) { c.y = endY; c.done = true; } else endCredits(); }, { focusable: false });
  if (c.done || c.t > 3) button(W / 2 - 80, H - 54, 160, 36, 'CONTINUE', () => endCredits(), { col: c.done ? PAL.dgreen : PAL.slate, fs: 15 });
}
