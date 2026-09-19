// ---- late night TV: commercials on the garage set ----
// A spot is a handful of still frames with one caption each. Every caption is
// a voice take (cm_<id>_01 ... matches the frame number), every frame is a
// picture you paint (commercials/cm_<id>_1.jpg ...), and a spot can carry its
// own jingle (music_cm_<id>) or ride the house track (music_tv).
// The set switches on between the last sale and the day's ledger, some nights.
// Rare on purpose: one spot a night at most, and each spot airs a couple of
// times ever. Rewatch anything you have seen from THE LEDGER > TV GUIDE.
'use strict';

const TV_FRAME_SECS = 4.6;          // auto-advance; clicking the screen is faster
const TV_TAIL = 0.5;                // a frame holds until its line is done, then this much longer
const TV_HOLD_MAX = 12;             // and never longer than this, whatever is still talking
const CM_W = 480, CM_H = 270;       // frame art size, same as a background

// who's buying tomorrow — the same calendar the paper reads
function tvTomorrow(id) {
  try { return genSpecialists(G.worldSeed, G.day + 1, curTown()).some((s) => s.def.id === id); } catch (e) { return false; }
}
function tvMet(id) { return (G.world.met || []).includes(id); }

const COMMERCIALS = [
  { id: 'scrap', title: 'HIGHWAY SCRAP & SALVAGE', sponsor: 'the scrap hauler', chance: 0.7, max: 2,
    when: () => !!(G.world.scrapTold && G.world.scrapTold.length),
    captions: [
      "You leave it. I take it. That's the whole deal.",
      "Storage units, barns, your uncle's garage. If it's got weight, it's got a price.",
      'Two dollars a bulk. Cash. No questions. Well. One question.',
      '...Did you know this was in there? No? Great. Neither did I.',
    ] },
  { id: 'pete', title: "PAWN PETE'S", sponsor: 'Pawn Pete', chance: 0.5, max: 2,
    when: () => G.day >= 2,
    captions: [
      "PAWN PETE'S. Open late. Open early. Open, basically.",
      "Guitars, tools, TVs, your grandmother's ring. Pete doesn't judge. Pete counts.",
      'No questions asked. No answers given. No refunds, obviously.',
      "Pawn Pete's. Everything's worth somethin'. Just not what you think.",
    ] },
  { id: 'alice', title: 'ANTIQUE ALICE', sponsor: 'Antique Alice', chance: 0.6, max: 3,
    when: () => tvTomorrow('alice'),
    captions: [
      "Your grandmother's things. My prices.",
      'Furniture, silver, jewelry. If it has a history, I have a client.',
      'I pay in cash, dear. I pay well. I pay once.',
      'Antique Alice. Rolling into town tomorrow. Dust things off.',
    ] },
  { id: 'randy', title: "RIFF RANDY'S RECORDS", sponsor: 'Riff Randy', chance: 0.6, max: 3,
    when: () => tvTomorrow('randy'),
    captions: [
      "RIFF RANDY'S! Records, amps, guitars, and whatever THAT is!",
      "Tube amps. Real vinyl. Tapes if you're desperate. He is.",
      'Randy pays DOUBLE for gear that still hums. Bring it in. Plug it in. Cash it in.',
      "Riff Randy's. In town tomorrow. Turn it up.",
    ] },
  { id: 'gina', title: "GINA'S GARAGE", sponsor: 'Gearhead Gina', chance: 0.6, max: 3,
    when: () => tvTomorrow('gina'),
    captions: [
      "Gina's Garage. If it's got a motor, a cord, or a grudge, bring it.",
      "Tools, electronics, power anything. Gina doesn't care about the box. She cares if it works.",
      "Working? Full price. Not working? Show her anyway. She's curious.",
      "Gina's Garage. Tomorrow only. Wipe the oil off first.",
    ] },
  { id: 'carl', title: 'CARL', sponsor: 'Creepy Carl', chance: 0.6, max: 3,
    when: () => tvTomorrow('carl'),
    captions: [
      '...Is this on?',
      'I pay triple. For the weird ones. You know which ones.',
      "Don't ask what for.",
      'Carl. Tomorrow. The van with no windows.',
    ] },
  { id: 'motors', title: 'DUSTY FLATS MOTORS', sponsor: 'the van lot', chance: 0.6, max: 2,
    when: () => !!(G.paper && G.paper.vanAd && G.vanCap < G.paper.vanAd.cap),
    captions: [
      'DUSTY FLATS MOTORS! Where the price is wrong and so is the mileage!',
      'Panel vans! Box trucks! Something that was a bus! We finance nobody!',
      "Haul more junk per trip. That's not a slogan, that's math.",
      'Dusty Flats Motors. Come on down. Bring a jumper cable.',
    ] },
  { id: 'store', title: 'THE GENERAL STORE', sponsor: 'the general store', chance: 0.5, max: 2,
    when: () => !!(G.paper && G.paper.toolAd && !G.world.tools.includes(G.paper.toolAd.tool)),
    captions: [
      "The General Store. We've had it since before you needed it.",
      'Flashlights. Mirrors. Loupes. Metal detectors. Books that know things.',
      "Every tool in the store was somebody's lucky charm. Now it's on sale.",
      'The General Store. Check the classifieds. Then check your pockets.',
    ] },
  { id: 'roy', title: "ROY'S COUSIN", sponsor: "Roy's cousin", chance: 0.45, max: 2,
    when: () => !!G.world.restoredEver || G.stash.some((it) => it.cond === 'Dusty' || it.cond === 'Worn'),
    captions: [
      'Got a dresser that looks like it lost a fight?',
      "Roy's cousin fixes it. Overnight. Forty dollars. Don't ask about Roy.",
      "Before. After. Don't ask which is which.",
      "Roy's cousin. By morning. Mostly.",
    ] },
  { id: 'office', title: 'A MESSAGE FROM YOUR STORAGE FACILITY', sponsor: 'the office', chance: 0.4, max: 2,
    when: () => G.day >= 3,
    // the same spot reads differently once the yard is yours, and once the raccoon has a record
    titleNow: () => (yardOwned() ? 'A MESSAGE FROM YOUR OWN STORAGE FACILITY' : 'A MESSAGE FROM YOUR STORAGE FACILITY'),
    caption: (f) => (f === 3 && countEvents('raccoon') >= 2 ? 'Deposits the raccoon is not an employee. We have asked him to stop wearing the vest.' : null),
    captions: [
      'This is a message from the storage facility you already forgot about.',
      "Pay your rent. Clean your unit. Get a bidder number. It's laminated.",
      'Units left unpaid go to auction. Units left unclean go to the scrap man.',
      "Remember: someone will go through your things. Make sure it's you.",
    ] },
  { id: 'bart', title: 'BIG BART', sponsor: 'Big Bart', chance: 0.45, max: 2,
    when: () => tvMet('bart'),
    captions: [
      'Big Bart here. You know me. Everybody knows me.',
      'I buy units. I buy buildings. I bought this commercial.',
      "Bidding against me? That's adorable. Bring cash. Bring a lot.",
      'Big Bart. Deep pockets. Short patience.',
    ] },
  { id: 'dutch', title: "DUTCH'S TIRE & LUBE", sponsor: 'Yiip Dutch', chance: 0.45, max: 2,
    when: () => tvMet('dutch'),
    captions: [
      "This is Dutch, for Dutch's Tire and Lube.",
      'YIIIP.',
      'Yip.',
      "Dutch's Tire and Lube. Yiip.",
    ] },
  // Channel 9's community board: the want ads exist, and the paper has them (step 5)
  { id: 'wanted', title: 'CHANNEL 9 COMMUNITY BOARD', sponsor: 'Channel 9', chance: 0.45, max: 3,
    when: () => typeof publicCommissions === 'function' && publicCommissions().length > 0,
    captions: [
      'This is the Channel 9 Community Board, where the county posts what it needs.',
      'This week, local dealers are looking for some very specific things. The Gazette has the want ads.',
      'If you have it, they will pay for it. If you do not have it, somebody in a storage unit does.',
    ] },
  // not a commercial: the local news, the night after something real came out of a unit
  { id: 'news', title: 'CHANNEL 9 ACTION NEWS', sponsor: 'Channel 9', chance: 0.9, max: 6,
    when: () => { const e = lastEvent('legend'); return !!e && G.day - e.day <= 2 && !(e.told && e.told.tv); },
    onAir: () => { const e = lastEvent('legend'); if (e) { e.told = e.told || {}; e.told.tv = true; } },
    captions: [
      'Good evening. Our top story tonight: a storage unit, a bidder, and a legend.',
      'Sources at the yard confirm it: the story every kid in the county grew up on is real, and it was in a box.',
      'The bidder could not be reached for comment. The bidder was, we are told, "counting."',
      'Channel 9 will have more as this develops. It will not develop. Good night.',
    ] },
  { id: 'duo', title: 'C&K RESALE', sponsor: 'Cody & Kaylee', chance: 0.5, max: 2,
    when: () => tvMet('duo') && !duoSplitOn(G.world, G.day),   // no joint commercial the week they are apart
    captions: [
      "Hi, we're Cody and Kaylee, and we... no, YOU say it.",
      'We buy storage units and sell the good stuff online. He does the lifting.',
      "She does the talking. Clearly. ...I'm on camera, Cody.",
      "C&K Resale. Come see us. We're the ones arguing.",
    ] },
];
const COMMERCIAL_BY_ID = {};
for (const c of COMMERCIALS) { c.frames = c.captions.length; COMMERCIAL_BY_ID[c.id] = c; }

// sound slots the loader should probe: one voice bank + one optional jingle per spot
const TV_SOUND_NAMES = ['music_tv', 'tv_on', 'tv_off'];
for (const c of COMMERCIALS) TV_SOUND_NAMES.push('cm_' + c.id, 'music_cm_' + c.id);

function tvAired(id) { return ((G.world.tvAired || {})[id]) || 0; }

// what tonight's slot holds, decided by the day's dice and nothing else: the
// same answer every time it is asked, so the set in the corner can warm up
// all evening before it actually comes on
function tvPick() {
  const pool = COMMERCIALS.filter((c) => tvAired(c.id) < c.max && c.when());
  if (!pool.length) return null;
  const R = dayR('tv');                          // the set's schedule cannot be rerolled by reloading
  const rolled = pool.filter((c) => R.chance(c.chance));
  if (!rolled.length) return null;
  // the never-aired spot wins the slot; otherwise any of them
  const fresh = rolled.filter((c) => tvAired(c.id) === 0);
  return R.pick(fresh.length ? fresh : rolled);
}
// the set decides whether tonight gets a spot. Returns true if it took over.
function tvTryAir(back) {
  const spot = tvPick();
  if (!spot) return false;
  G.world.tvAired = G.world.tvAired || {};
  G.world.tvAired[spot.id] = tvAired(spot.id) + 1;
  if (spot.onAir) spot.onAir();
  tvStart(spot, back);
  return true;
}
function tvStart(spot, back) {
  G.tv = { spot, frame: 0, frameStart: G.time, back: back || 'summary', spoke: false, endedAt: null };
  G.mode = 'tv';
  _musicDuck = 0.3;                   // the set is on: the room's music goes under it
  _musicPoll = 0;
  play('tv_on', 0.6);
  speakTake('cm_' + spot.id, 1, true);
  G.tv.spoke = true;
}
function tvNext() {
  const tv = G.tv;
  if (!tv) return;
  tv.frame++;
  if (tv.frame >= tv.spot.frames) { tvEnd(); return; }
  tv.frameStart = G.time;
  tv.spoke = false; tv.endedAt = null;
  speakTake('cm_' + tv.spot.id, tv.frame + 1, true);
  tv.spoke = true;
}
function tvEnd() {
  const tv = G.tv;
  if (!tv) return;
  play('tv_off', 0.6);
  voFlush(true);                      // stop whatever's left (SKIP can still cut a line short)
  G.tv = null;
  G.mode = tv.back;
  _musicDuck = 1;                     // and comes back up for the summary
  _musicPoll = 0;
}

// the set in the corner of the garage. Dark most nights. On the nights a spot
// will air it is already warming up while you sort the stash: nobody says so.
function drawHomeTv(x, y) {
  const on = !!tvPick();
  const sw = 96, sh = 64;
  if (on) {
    const flick = 0.05 + 0.04 * Math.abs(Math.sin(G.time * 7.3)) + (((G.time * 24) | 0) % 11 === 0 ? 0.07 : 0);
    px(g, x - 34, y - 26, sw + 68, sh + 70, 'rgba(150,180,240,' + flick.toFixed(3) + ')');
  }
  px(g, x - 10, y - 8, sw + 20, sh + 30, PAL.ink);
  px(g, x - 8, y - 6, sw + 16, sh + 26, '#4a3a2a');
  px(g, x - 8, y - 6, sw + 16, 2, '#6b573f');
  px(g, x - 3, y - 3, sw + 6, sh + 6, '#1b1a20');
  if (on) {
    const R = RNG((G.time * 24) | 0);
    px(g, x, y, sw, sh, '#26304a');
    g.fillStyle = 'rgba(190,200,220,0.32)';
    for (let i = 0; i < 70; i++) g.fillRect(x + R.i(0, sw - 4), y + R.i(0, sh - 2), R.i(2, 6), 1);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 12; i++) g.fillRect(x + R.i(0, sw - 12), y + R.i(0, sh - 2), R.i(6, 12), 1);
    const band = ((G.time * 40) | 0) % (sh + 20) - 10;
    px(g, x, y + Math.max(0, band), sw, 3, 'rgba(255,255,255,0.10)');
  } else {
    px(g, x, y, sw, sh, '#101218');
    px(g, x + 8, y + 6, 26, 10, 'rgba(255,255,255,0.05)');   // the window, in the glass
  }
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let yy = y; yy < y + sh; yy += 3) g.fillRect(x, yy, sw, 1);
  px(g, x + sw + 2, y + 8, 5, 5, PAL.gold); px(g, x + sw + 2, y + 18, 5, 5, PAL.gray);   // knobs
  px(g, x + 10, y + sh + 12, 10, 8, PAL.ink); px(g, x + sw - 20, y + sh + 12, 10, 8, PAL.ink);   // feet
  return on;
}

// what the screen shows while a frame's picture is still missing: static, and the filename
function tvStatic(x, y, w, h, name) {
  px(g, x, y, w, h, '#15161c');
  const R = RNG((G.time * 30) | 0);
  g.fillStyle = 'rgba(180,190,210,0.28)';
  for (let i = 0; i < 420; i++) g.fillRect(x + R.i(0, w - 4), y + R.i(0, h - 2), R.i(2, 5), 2);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let i = 0; i < 90; i++) g.fillRect(x + R.i(0, w - 12), y + R.i(0, h - 2), R.i(6, 12), 2);
  px(g, x + w / 2 - 150, y + h / 2 - 26, 300, 52, 'rgba(8,8,14,0.8)');
  T(x + w / 2, y + h / 2 - 20, '[ NO SIGNAL ]', PAL.gray, 16, 'center', true);
  T(x + w / 2, y + h / 2 + 4, name, PAL.dgray, 12, 'center');
}

function drawTv() {
  if (!drawBG()) px(g, 0, 0, W, H, '#0b0c12');
  px(g, 0, 0, W, H, 'rgba(3,4,9,0.6)');                       // lights off in the garage
  const tv = G.tv, spot = tv.spot;
  // hold each frame until its line is actually done, so the closing caption never
  // gets clipped by the clock — it only ever gets cut short by SKIP or a stuck clip
  if (tv.spoke && !tv.endedAt && !_voCur) tv.endedAt = G.time;
  const voiceDone = !tv.spoke || (tv.endedAt != null && G.time - tv.endedAt > TV_TAIL);
  const held = G.time - tv.frameStart;
  if (held > TV_FRAME_SECS && !G.demoFreeze && (voiceDone || held > TV_HOLD_MAX)) { tvNext(); if (!G.tv) return; }
  const sx = 180, sy = 56, sw = 600, sh = 338;

  // the set: wood-grain cabinet, dark bezel, a little glow spilling out
  px(g, sx - 60, sy + 40, sw + 120, sh - 40, 'rgba(120,150,220,0.06)');
  px(g, sx - 30, sy - 26, sw + 60, sh + 92, PAL.ink);
  px(g, sx - 27, sy - 23, sw + 54, sh + 86, '#4a3a2a');
  px(g, sx - 27, sy - 23, sw + 54, 3, '#6b573f');
  grain(g, sx - 24, sy + sh + 20, sw + 48, 36, '#3a2c20', 5, 14);
  px(g, sx - 12, sy - 12, sw + 24, sh + 24, '#1b1a20');
  px(g, sx - 4, sy - 4, sw + 8, sh + 8, PAL.ink);

  // the picture
  const key = spot.id + '_' + (tv.frame + 1);
  const list = _cmImg[key];
  const clip = useVideo(_cmVid, key);                 // commercials/cm_<spot>_<n>.mp4 moves over the still
  if (clip && tv.clipKey !== key) { tv.clipKey = key; try { clip.currentTime = 0; } catch (e) { /* ok */ } }
  // fill the screen and crop the overflow, so any picture shape reads as broadcast
  function broadcast(im, iw, ih) {
    const sc = Math.max(sw / iw, sh / ih);
    const dw = Math.round(iw * sc), dh = Math.round(ih * sc);
    g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
    g.imageSmoothingEnabled = true;
    g.drawImage(im, sx + Math.round((sw - dw) / 2), sy + Math.round((sh - dh) / 2), dw, dh);
    g.imageSmoothingEnabled = false;
    g.restore();
  }
  if (list && list.length) { const im = list[strHash(key + G.day) % list.length]; broadcast(im, im.width, im.height); }
  else if (!clip) tvStatic(sx, sy, sw, sh, 'commercials/cm_' + key + '.jpg');
  if (clip) broadcast(clip, clip.videoWidth || 480, clip.videoHeight || 270);
  // scanlines + a soft vignette, so even your art looks broadcast
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let yy = sy; yy < sy + sh; yy += 3) g.fillRect(sx, yy, sw, 1);
  px(g, sx, sy, sw, 6, 'rgba(0,0,0,0.25)'); px(g, sx, sy + sh - 6, sw, 6, 'rgba(0,0,0,0.25)');
  px(g, sx, sy, 6, sh, 'rgba(0,0,0,0.25)'); px(g, sx + sw - 6, sy, 6, sh, 'rgba(0,0,0,0.25)');

  // channel bug + sponsor card
  px(g, sx + 10, sy + 8, 74, 18, 'rgba(8,8,14,0.7)');
  T(sx + 47, sy + 10, 'CH 6', PAL.white, 13, 'center', true, LOGO_FONT);
  T(sx + sw - 12, sy + 10, 'LATE NIGHT', 'rgba(255,255,255,0.55)', 11, 'right', true);

  // caption band: the line being said right now (a spot may vary a caption with what the town knows)
  const cap = (spot.caption && spot.caption(tv.frame)) || spot.captions[tv.frame] || '';
  const lines = wrapText(cap, 62).slice(0, 2);
  const bh = 14 + lines.length * 19;
  px(g, sx, sy + sh - bh - 10, sw, bh, 'rgba(8,8,14,0.78)');
  for (let i = 0; i < lines.length; i++) T(sx + sw / 2, sy + sh - bh - 3 + i * 19, lines[i], PAL.yellow, 16, 'center', true);

  // frame dots
  for (let i = 0; i < spot.frames; i++) px(g, sx + sw / 2 - spot.frames * 7 + i * 14, sy + sh + 8, 8, 4, i === tv.frame ? PAL.yellow : '#3a3f52');

  hot(sx, sy, sw, sh, () => tvNext(), { focusable: false });   // click the picture to advance; keys and pads use SKIP
  T(sx, sy + sh + 30, (spot.titleNow ? spot.titleNow() : spot.title) + '   ·   paid for by ' + spot.sponsor, PAL.gray, 12);
  T(sx, sy + sh + 46, 'click the screen for the next shot', PAL.dgray, 11);
  button(sx + sw - 110, sy + sh + 24, 110, 30, tv.back === 'codex' ? 'TURN IT OFF' : 'SKIP', () => tvEnd(), { col: PAL.slate, fs: 13 });
}

// ---- TV GUIDE: the ledger page ----
function drawCodexTv() {
  const aired = Object.keys(G.world.tvAired || {}).length;
  T(24, 46, 'LATE NIGHT ON CHANNEL 6  ·  ' + aired + ' of ' + COMMERCIALS.length + ' spots seen', PAL.gray, 14, 'left', true);
  for (let i = 0; i < COMMERCIALS.length; i++) {
    const c = COMMERCIALS[i];
    const n = tvAired(c.id);
    const x = 24 + (i % 3) * 306, y = 64 + Math.floor(i / 3) * 70, w = 298, h = 64;
    const over = n > 0 && inRect(mouse.x, mouse.y, x, y, w, h);
    codexCard(x, y, w, h, n > 0, n > 0 ? c.title : '? ? ?',
      n > 0 ? [{ t: 'paid for by ' + c.sponsor, c: PAL.orange }, { t: 'aired ' + n + (n === 1 ? ' time' : ' times') + (over ? '   ·   click to watch again' : ''), c: over ? PAL.cyan : PAL.gray }]
        : [{ t: 'not aired yet. the set knows when.' }],
      { icon: 'tv' });
    if (n > 0) hot(x, y, w, h, () => { play('ui_click', 0.5); tvStart(c, 'codex'); });
  }
  T(24, 500, 'the garage set flickers on some nights between the last sale and the ledger.', PAL.dgray, 13);
}
