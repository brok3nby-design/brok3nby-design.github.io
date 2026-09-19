// ---- the dev room: everything the game can show or say, on demand ----
// Every rival's card and every recorded line, every background and commercial
// frame with its motion clip, every arrival card, the cold open, the credits,
// every track — without waiting for the town, the day or the auction that would
// normally earn it. Nothing here changes the career (the one button that does,
// UNLOCK THE LEDGER, says so). Opened from the pause menu; DEV_ROOM = false hides
// the button for a shipped build.
'use strict';

const DEV_ROOM = true;
const DEV_TABS = [['voices', 'VOICES'], ['faces', 'FACES'], ['motion', 'MOTION'], ['tv', 'TV'], ['cards', 'CARDS'], ['music', 'MUSIC'], ['breakout', 'BREAKOUT']];
let _devSeq = [];                 // takes still to play from a PLAY ALL: one at a time, in order

function openDev() {
  if (G.mode === 'dev') return;
  G.devBack = G.mode;
  G.devTab = G.devTab || 'voices';
  G.devScroll = 0;
  G.devView = null;
  G.devMusic = null;
  G.paused = false;
  G.mode = 'dev';
}
function closeDev() {
  _devSeq = [];
  voFlush(true);
  G.devView = null; G.devMusic = null;
  G.mode = G.devBack || 'title';
  G.devBack = null;
  _musicPoll = 0;
}
function devEscape() {
  if (G.devView) { G.devView = null; return; }
  closeDev();
}
function devWheel(dir) {
  if (G.devView) return;
  G.devScroll = clamp((G.devScroll || 0) + dir * 40, 0, G.devScrollMax || 0);
}

// every slot with a file, by prefix — the code's own lists first, then anything
// else the loader found under that prefix (a trailer line, an extra take slot)
function devSlots(prefix, known) {
  const set = new Set((known || []).filter((n) => n.startsWith(prefix)));
  for (const k in _snd) if (k.startsWith(prefix) && _snd[k].length) set.add(k);
  return Array.from(set);
}
function devTakes(slot) { return (_snd[slot] || []).length; }
function devSay(slot) {
  _devSeq = [];
  if (!speakOneOf([slot], true, { cooldown: 0 })) toast('no file for ' + slot + ' yet', PAL.orange, 2.5);
}
function devSayAll(slots) {
  _devSeq = [];
  for (const s of slots) for (const e of (_snd[s] || [])) _devSeq.push({ base: s, take: e.take });
  if (!_devSeq.length) { toast('nothing recorded for this one yet', PAL.orange, 2.5); return; }
  voFlush(true);
}
function devPumpSeq() {
  if (!_devSeq.length || _voCur || _voBusy) return;
  const n = _devSeq.shift();
  speakTake(n.base, n.take, true);
}

// a grid of slot buttons: name, take count, greyed when nothing is recorded
function devSlotGrid(x, y, w, slots, strip, cols) {
  cols = cols || 6;
  const gap = 6, bw = Math.floor((w - gap * (cols - 1)) / cols), bh = 22;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i], n = devTakes(s);
    const bx = x + (i % cols) * (bw + gap), by = y + Math.floor(i / cols) * (bh + 4);
    let label = strip ? s.replace(strip, '') : s;
    if (n > 1) label += ' ×' + n;
    button(bx, by, bw, bh, label, () => devSay(s), { fs: 11, col: n ? PAL.dgreen : PAL.slate, disabled: !n });
  }
  return y + Math.ceil(slots.length / cols) * (bh + 4);
}

function drawDev() {
  if (G.devView) { drawDevView(); return; }
  px(g, 0, 0, W, H, '#111320');
  px(g, 0, 0, W, 36, PAL.ink);
  px(g, 0, 34, W, 2, PAL.slate);
  T(16, 6, 'DEV ROOM', '#c9a2ff', 24, 'left', true, LOGO_FONT);
  let tx = 176;
  for (const [id, label] of DEV_TABS) {
    button(tx, 5, 90, 26, label, () => { G.devTab = id; G.devScroll = 0; _devSeq = []; }, { col: G.devTab === id ? '#5a3a6e' : PAL.slate, fs: 12 });
    tx += 96;                                 // seven tabs now (BREAKOUT, 2026-09-18): narrower, so they clear BACK
  }
  button(W - 108, 5, 92, 26, 'BACK', () => closeDev(), { col: PAL.dgreen, fs: 13 });
  devPumpSeq();

  g.save();
  g.beginPath(); g.rect(0, 40, W, 456); g.clip();
  let y = 48 - (G.devScroll || 0);
  if (G.devTab === 'voices') y = drawDevVoices(y);
  else if (G.devTab === 'faces') y = drawDevFaces(y);
  else if (G.devTab === 'motion') y = drawDevMotion(y);
  else if (G.devTab === 'tv') y = drawDevTv(y);
  else if (G.devTab === 'cards') y = drawDevCards(y);
  else if (G.devTab === 'breakout') y = drawDevBreakout(y);
  else y = drawDevMusic(y);
  g.restore();
  G.devScrollMax = Math.max(0, (y + (G.devScroll || 0)) - 490);
  const playing = _voCur ? 'playing' + (_devSeq.length ? ' · ' + _devSeq.length + ' more queued' : '') : '';
  T(24, 500, 'nothing here touches the save' + (G.devScrollMax ? '   ·   wheel to scroll' : '') + (playing ? '   ·   ' + playing : ''), PAL.dgray, 13);
  if (_voCur || _devSeq.length) button(W - 130, 496, 112, 22, 'STOP VOICE', () => { _devSeq = []; voFlush(true); }, { col: PAL.dred, fs: 11 });
}

// ---- VOICES: every bank, every slot, a button each; PLAY ALL runs a character's whole bank ----
function devPerson(y, id, name, blurb, slots, extra) {
  panel(24, y, W - 48, 74, '#1d2030', '#4b5478');
  px(g, 32, y + 13, 48, 48, PAL.ink);
  drawPortrait(id, 34, y + 15, 44, 44);
  T(90, y + 8, name, PAL.white, 14, 'left', true);
  T(90, y + 26, blurb, PAL.gray, 11);
  const total = slots.reduce((a, s) => a + devTakes(s), 0);
  T(90, y + 42, total ? total + ' file' + (total === 1 ? '' : 's') + ' recorded' : 'nothing recorded yet', total ? PAL.green : PAL.dgray, 11);
  button(90, y + 54, 76, 18, 'PLAY ALL', () => devSayAll(slots), { fs: 10, col: total ? '#5a3a6e' : PAL.slate, disabled: !total });
  if (extra) extra(y);
  let bx = 310, by = y + 8;
  for (const s of slots) {
    const n = devTakes(s);
    const label = s.replace(/^(npc|auc_intro)_[a-z0-9]+_?/i, '') || 'intro';
    const w = 14 + Math.max(52, label.length * 6.4 + (n > 1 ? 22 : 0));
    if (bx + w > W - 30) { bx = 310; by += 22; }
    button(bx, by, w, 18, label + (n > 1 ? ' ×' + n : ''), () => devSay(s), { fs: 10, col: n ? PAL.dgreen : PAL.slate, disabled: !n });
    bx += w + 6;
  }
  return y + 80;
}
function drawDevVoices(y) {
  T(24, y, 'BUZZ KETTLEMAN  —  the house auctioneer', PAL.gray, 14, 'left', true);
  // what the colours mean (user, 2026-09-19: "the dev room showed it grey, I don't know what that means")
  T(W - 24, y + 2, 'green = the game found the file (click to hear it)  ·  grey = no file found', PAL.dgray, 12, 'right'); y += 20;
  y = devSlotGrid(24, y, W - 48, devSlots('auc_', AUC_VO).filter((s) => !s.startsWith('auc_intro_')), 'auc_') + 8;
  T(24, y, 'THE NUMBERS', PAL.gray, 14, 'left', true); y += 20;
  y = devSlotGrid(24, y, W - 48, NUM_NAMES, 'num_', 9) + 8;
  T(24, y, 'THE NARRATOR', PAL.gray, 14, 'left', true); y += 20;
  y = devSlotGrid(24, y, W - 48, devSlots('nar_', NARRATOR_VO), 'nar_') + 12;
  T(24, y, 'THE ANSWERING MACHINE  —  the machine, the clerk, Buzz', PAL.gray, 14, 'left', true); y += 20;
  y = devSlotGrid(24, y, W - 48, typeof VM_VO !== 'undefined' ? VM_VO : [], 'vm_') + 12;
  T(24, y, 'RIVALS  —  intro card line, then their own bank', PAL.gray, 14, 'left', true); y += 20;
  for (const d of NPCS.concat(Object.values(EXTRA_NPCS))) {
    const slots = ['auc_intro_' + d.id].concat(devSlots('npc_' + d.id + '_', NPC_VO));
    y = devPerson(y, d.id, d.name, d.tag, slots);
  }
  y += 8;
  T(24, y, 'BUYERS', PAL.gray, 14, 'left', true); y += 20;
  for (const b of BUYERS) y = devPerson(y, b.id, b.name, b.blurb, devSlots('npc_' + b.id + '_', NPC_VO));
  y += 8;
  T(24, y, 'COMMERCIALS  —  one line per frame; AIR IT plays the whole spot on the garage TV', PAL.gray, 14, 'left', true); y += 20;
  for (const c of COMMERCIALS) {
    panel(24, y, W - 48, 34, '#1d2030', '#4b5478');
    T(34, y + 10, c.title, PAL.white, 13, 'left', true);
    T(200, y + 11, 'paid for by ' + c.sponsor, PAL.gray, 11);
    const v = _snd['cm_' + c.id] || [];
    for (let f = 1; f <= c.frames; f++) {
      const has = v.some((e) => e.take === f);
      button(420 + (f - 1) * 58, y + 7, 52, 20, 'line ' + f, () => { _devSeq = []; speakTake('cm_' + c.id, f, true); }, { fs: 10, col: has ? PAL.dgreen : PAL.slate, disabled: !has });
    }
    button(W - 130, y + 7, 100, 20, 'AIR IT', () => tvStart(c, 'dev'), { fs: 11, col: '#5a3a6e' });
    y += 40;
  }
  return y;
}

// ---- FACES: every rival's splash card, met or not ----
function drawDevFaces(y) {
  T(24, y, 'RIVAL BIDDERS  —  click a card for the splash intro (Buzz says the line, the sting lands)', PAL.gray, 14, 'left', true); y += 20;
  const rivals = NPCS.concat(Object.values(EXTRA_NPCS));
  for (let i = 0; i < rivals.length; i++) {
    const d = rivals[i];
    const home = TOWN_ORDER.filter((tid) => (TOWNS[tid].rivals || []).includes(d.id)).map((tid) => TOWNS[tid].name).join(', ') || 'Dusty Flats and the road';
    const rx = 24 + (i % 4) * 230, ry = y + Math.floor(i / 4) * 78;
    codexCard(rx, ry, 222, 70, true, d.name, [{ t: d.tag, c: PAL.orange }, { t: home + (codexMet(d.id) ? '  ·  met' : '  ·  not met yet') }], { portrait: d.id });
    hot(rx, ry, 222, 70, () => { play('ui_click', 0.5); npcIntroShow(d.id, 'dev'); });
  }
  y += Math.ceil(rivals.length / 4) * 78 + 8;
  T(24, y, 'BUYERS', PAL.gray, 14, 'left', true); y += 20;
  for (let i = 0; i < BUYERS.length; i++) {
    const b = BUYERS[i];
    codexCard(24 + (i % 4) * 230, y + Math.floor(i / 4) * 78, 222, 70, true, b.name, [{ t: b.blurb, c: PAL.cyan }, { t: codexMet(b.id) || b.id === 'pete' ? 'met' : 'not met yet' }], { portrait: b.id });
  }
  y += Math.ceil(BUYERS.length / 4) * 78 + 12;
  // the one thing in here that writes to the save, and it says so
  const all = rivals.map((d) => d.id).concat(BUYERS.map((b) => b.id));
  const unmet = all.filter((id) => !codexMet(id));
  button(24, y, 300, 28, unmet.length ? 'UNLOCK THE LEDGER  (' + unmet.length + ' not met)' : 'THE LEDGER KNOWS EVERYBODY', () => { for (const id of all) codexNoteMet(id); toast('every face is met in THE LEDGER now — this is saved with the career', PAL.cyan, 4); }, { fs: 12, col: unmet.length ? PAL.dred : PAL.slate, disabled: !unmet.length });
  T(334, y + 8, 'marks every rival and buyer as met in THE LEDGER > PEOPLE. This one changes the save.', PAL.dgray, 11);
  return y + 40;
}

// ---- MOTION: every still that can carry a clip, and whether it does ----
function devClipRow(y, title, items) {
  T(24, y, title, PAL.gray, 14, 'left', true); y += 20;
  const cols = 4, gap = 6, bw = Math.floor((W - 48 - gap * (cols - 1)) / cols), bh = 24;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const bx = 24 + (i % cols) * (bw + gap), by = y + Math.floor(i / cols) * (bh + 4);
    const clip = !!it.store[it.key], still = it.still();
    const label = it.label + (clip ? '  ▶ clip' : (still ? '  still only' : '  nothing yet'));
    button(bx, by, bw, bh, label, () => { G.devView = it; }, { fs: 11, col: clip ? PAL.dgreen : (still ? PAL.slate : '#2e3244'), disabled: !clip && !still });
  }
  return y + Math.ceil(items.length / cols) * (bh + 4) + 8;
}
function drawDevMotion(y) {
  T(24, y, 'green = has a motion clip (click to watch it full screen)  ·  grey = still only  ·  MOTION is ' + (_motion ? 'ON' : 'OFF (pause menu)'), PAL.dgray, 12); y += 18;
  y = devClipRow(y, 'BACKGROUNDS  (only the pass-through screens move: MOTION_BG in game.js)', BG_NAMES.map((b) => ({ label: b + (MOTION_BG.has(b) ? '' : ' (still by design)'), store: _bgVid, key: b, still: () => (_bg[b] || [])[0] || null, fit: 'cover' })));
  y = devClipRow(y, 'THE FIRST MORNING', FM_ART_IDS.map((o) => ({ label: 'op_' + o, store: _opVid, key: o, still: () => (_opImg[o] || [])[0] || null, fit: 'cover' })));
  const tv = [];
  for (const c of COMMERCIALS) for (let f = 1; f <= c.frames; f++) tv.push({ label: 'cm_' + c.id + '_' + f, store: _cmVid, key: c.id + '_' + f, still: () => (_cmImg[c.id + '_' + f] || [])[0] || null, fit: 'cover' });
  y = devClipRow(y, 'TV FRAMES', tv);
  const tapes = [];
  for (const t of PLAYABLE_TAPES) for (let n = 1; n <= TAPE_CLIPS; n++) tapes.push({ label: 'tp_' + t + '_' + n, store: _tapeVid, key: t + '_' + n, still: () => null, fit: 'contain' });
  y = devClipRow(y, 'TAPES  (no still — they play inside the case in LOOK CLOSER)', tapes);
  return y;
}
function drawDevView() {
  const v = G.devView;
  px(g, 0, 0, W, H, '#05060a');
  const clip = useVideo(v.store, v.key);
  const still = v.still();
  const el = clip || still;
  if (el) {
    const iw = clip ? clip.videoWidth : el.naturalWidth, ih = clip ? clip.videoHeight : el.naturalHeight;
    if (v.fit === 'contain' && iw && ih) {
      const s = Math.min((W - 80) / iw, (H - 90) / ih);
      const dw = Math.round(iw * s), dh = Math.round(ih * s);
      g.drawImage(el, Math.round((W - dw) / 2), Math.round((H - 50 - dh) / 2), dw, dh);
    } else drawCoverBG(el, iw, ih);
  } else T(W / 2, H / 2, 'nothing loaded for ' + v.label, PAL.dgray, 16, 'center');
  px(g, 0, H - 44, W, 44, 'rgba(5,6,10,0.8)');
  T(20, H - 32, v.label + (clip ? '  ·  clip ' + clip.videoWidth + 'x' + clip.videoHeight : (still ? '  ·  still only' : '')) + (!_motion ? '  ·  MOTION is OFF in the pause menu, so only the still shows' : ''), PAL.white, 14);
  button(W - 124, H - 38, 104, 30, 'BACK', () => { G.devView = null; }, { col: PAL.slate, fs: 14 });
  hot(0, 0, W, H - 44, () => { G.devView = null; }, { focusable: false });
}

// ---- TV: air any spot ----
function drawDevTv(y) {
  T(24, y, 'LATE NIGHT TV  —  every spot, whether or not the town has earned it', PAL.gray, 14, 'left', true); y += 20;
  for (const c of COMMERCIALS) {
    let clips = 0, stills = 0;
    for (let f = 1; f <= c.frames; f++) { if (_cmVid[c.id + '_' + f]) clips++; if ((_cmImg[c.id + '_' + f] || []).length) stills++; }
    const v = (_snd['cm_' + c.id] || []).length;
    codexCard(24, y, W - 48 - 130, 52, true, c.title, [{ t: 'paid for by ' + c.sponsor + '  ·  ' + c.frames + ' frames: ' + stills + ' stills, ' + clips + ' clips, ' + v + ' lines' + (c.when && !c.when() ? '  ·  would not air tonight' : '  ·  could air tonight'), c: PAL.gray }], { icon: 'tv' });
    button(W - 148, y + 11, 124, 30, 'AIR IT', () => tvStart(c, 'dev'), { fs: 13, col: '#5a3a6e' });
    y += 58;
  }
  return y;
}

// ---- CARDS: the films and title cards that play once ----
function drawDevCards(y) {
  T(24, y, 'ARRIVALS  —  the card that plays the first morning in a town', PAL.gray, 14, 'left', true); y += 20;
  for (let i = 0; i < TOWN_ORDER.length; i++) {
    const tid = TOWN_ORDER[i], t = TOWNS[tid];
    const bx = 24 + (i % 3) * 304, by = y + Math.floor(i / 3) * 30;
    button(bx, by, 298, 26, t.name + (_snd['nar_town_' + tid] ? '' : '  (no narrator line yet)'), () => startArrive(t, (t.arrival || [])[0], 'dev'), { fs: 12, col: PAL.dgreen });
  }
  y += Math.ceil(TOWN_ORDER.length / 3) * 30 + 12;
  T(24, y, 'FILMS', PAL.gray, 14, 'left', true); y += 20;
  button(24, y, 298, 26, 'THE FIRST MORNING  (the cold open)', () => { if (!startFirstMorning('dev')) toast('not inside a ?demo= state', PAL.orange); }, { fs: 12, col: PAL.dgreen });
  button(330, y, 298, 26, 'THE CREDITS', () => startCredits('dev'), { fs: 12, col: PAL.dgreen });
  y += 30;
  // the walk down the row: today's three doors, whether or not this morning would have walked it
  button(24, y, 298, 26, 'THE ROW  (walk the three doors)', () => { if (!G.today || !startWalk('dev')) toast('no doors today', PAL.orange); }, { fs: 12, col: PAL.dgreen });
  y += 30;
  T(24, y, 'rival splash cards are on the FACES tab; commercials on TV. Escape backs out of any of them and lands here.', PAL.dgray, 11);
  return y + 24;
}

// ---- BREAKOUT: line each breakout reaction up over its plain portrait (2026-09-18) ----
// An image generator will not put the head in exactly the same place twice, so rather than asking for
// pixel-perfect framing, this shows the plain portrait faintly under the breakout picture and the card's box
// over both; the buttons move and size the picture until the head sits on the head, and SAVE ALL writes
// npcs/reactions/align.js through tools/serve.py. Nudges show at once, in the game too, before saving.
const BO_STEP = 0.004, BO_SCALE = 1.015;
function devBreakoutFiles() {
  const out = [];
  for (const id of NPC_CUT_IDS) {
    loadReactions(id);
    for (const k of BREAKOUT_KEYS) for (const im of (_reactImg[id + '_' + k + '_out'] || [])) out.push({ id, k, im, file: imgFileName(im) });
  }
  return out;
}
// AUTO LINE UP (2026-09-19): find where the plain portrait sits inside a breakout picture by matching the top of
// the head - hat, hair, brow, the part a reaction does not move - at every size and place, small, and keeping the
// closest. Ed's two came out within a pixel or two of a hand measurement. It only fills in the numbers; SAVE ALL
// still writes them, and the arrows still fix anything it got wrong.
const BO_HEAD = [0.25, 0.14, 0.75, 0.36];      // the band of the portrait that is matched: x0, y0, x1, y1 as fractions
function boPixels(im, w, h, sx, sy, sw, sh) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(im, sx || 0, sy || 0, sw || im.width, sh || im.height, 0, 0, w, h);
  return x.getImageData(0, 0, w, h).data;
}
function boAutoAlign(f) {
  const port = (_npcImg[f.id] || [])[0];
  const out = f.im;
  if (!port || !out || !(port.naturalWidth || port.width) || !(out.naturalWidth || out.width)) { toast('Not loaded yet: give it a second and try again.', PAL.orange); return null; }
  const PW = port.naturalWidth || port.width, PH = port.naturalHeight || port.height;
  const OW = out.naturalWidth || out.width, OH = out.naturalHeight || out.height;
  const FX0 = Math.round(BO_HEAD[0] * PW), FY0 = Math.round(BO_HEAD[1] * PH), FX1 = Math.round(BO_HEAD[2] * PW), FY1 = Math.round(BO_HEAD[3] * PH);
  // two passes: a rough search small and wide, then a fine one around the best of it at four times the detail
  const pass = (DS, rws, around) => {
    const ow = Math.round(OW * DS), oh = Math.round(OH * DS);
    const O = boPixels(out, ow, oh);
    let best = null;
    for (const rw of rws) {
      const s = rw * OW / PW, fw = Math.round((FX1 - FX0) * s * DS), fh = Math.round((FY1 - FY0) * s * DS);
      if (fw < 8 || fh < 8 || fw >= ow || fh >= oh) continue;
      const F = boPixels(port, fw, fh, FX0, FY0, FX1 - FX0, FY1 - FY0);
      let x0 = 0, x1 = ow - fw, y0 = 0, y1 = oh - fh;
      if (around) {
        const cx = Math.round(around.px * DS), cy = Math.round(around.py * DS);
        x0 = Math.max(0, cx - 6); x1 = Math.min(ow - fw, cx + 6); y0 = Math.max(0, cy - 6); y1 = Math.min(oh - fh, cy + 6);
      }
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        let d = 0;
        for (let j = 0; j < fh; j += 2) {
          let oi = ((yy + j) * ow + xx) * 4, fi = (j * fw) * 4;
          for (let i = 0; i < fw; i += 2, oi += 8, fi += 8) { const a = O[oi] - F[fi], b = O[oi + 1] - F[fi + 1], c = O[oi + 2] - F[fi + 2]; d += a * a + b * b + c * c; }
        }
        d /= (fw * fh / 4);
        if (!best || d < best.d) best = { d, rw, px: xx / DS, py: yy / DS, s };
      }
    }
    return best;
  };
  let b;
  try {
    const rough = [];
    for (let rw = 0.5; rw <= 0.9001; rw += 0.01) rough.push(rw);
    const b0 = pass(0.1, rough, null);
    if (!b0) return null;
    const fine = [];
    for (let rw = b0.rw - 0.015; rw <= b0.rw + 0.0151; rw += 0.0025) fine.push(rw);
    b = pass(0.25, fine, b0) || b0;
  } catch (e) { toast('Could not read the picture: run the game with python tools/serve.py.', PAL.red, 5); return null; }
  const res = [+((b.px - FX0 * b.s) / OW).toFixed(4), +((b.py - FY0 * b.s) / OH).toFixed(4), +b.rw.toFixed(4)];
  _boEdits[f.file] = res;
  return res;
}
function boAutoAll(files) {
  let n = 0;
  for (const f of files) if (!((window.REACT_ALIGN || {})[f.file]) && !_boEdits[f.file] && boAutoAlign(f)) n++;
  toast(n ? 'Lined up ' + n + ' picture' + (n === 1 ? '' : 's') + '. Check each one, then SAVE ALL.' : 'Nothing new to line up.', n ? PAL.green : PAL.gray);
}
function boNudge(f, dx, dy, ds) {
  const iw = f.im.naturalWidth || f.im.width, ih = f.im.naturalHeight || f.im.height;
  if (!iw || !ih) return;
  const pa = portraitAspect(f.id);
  let [rx, ry, rw] = reactAlign(f.file);
  if (ds) {
    const rh = rw * iw / pa / ih, cx = rx + rw / 2, cy = ry + rh / 2;
    rw = rw / ds;
    const rh2 = rw * iw / pa / ih;
    rx = cx - rw / 2; ry = cy - rh2 / 2;
  }
  _boEdits[f.file] = [rx + dx, ry + dy, rw];
}
function boSave() {
  const table = Object.assign({}, (typeof window !== 'undefined' && window.REACT_ALIGN) || {}, _boEdits);
  if (typeof fetch !== 'function') return;
  fetch('/dev/breakout-align', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(table) })
    .then((r) => {
      if (!r.ok) throw new Error(r.status);
      window.REACT_ALIGN = table;
      for (const k in _boEdits) delete _boEdits[k];
      toast('Saved where ' + Object.keys(table).length + ' breakout picture' + (Object.keys(table).length === 1 ? '' : 's') + ' sit.', PAL.green);
    })
    .catch(() => toast('Could not save: run the game with python tools/serve.py (the stock server cannot write files).', PAL.red, 6));
}
function drawDevBreakout(y) {
  T(24, y, 'BREAKOUT REACTIONS  —  line each picture up so the head sits on the plain portrait\'s head', PAL.gray, 14, 'left', true); y += 20;
  const files = devBreakoutFiles();
  if (!files.length) {
    T(24, y + 6, 'None yet. Save one as npcs\\reactions\\npc_<rival>_<bid|flinch|glare|win>_out.png and it shows up here.', PAL.dgray, 13);
    T(24, y + 26, 'The prompts are in TODO_IMAGES.md, under Breakout reactions.', PAL.dgray, 13);
    return y + 60;
  }
  G.devBo = clamp(G.devBo || 0, 0, files.length - 1);
  // the list
  for (let i = 0; i < files.length; i++) {
    const f = files[i], edited = !!_boEdits[f.file], saved = !!((window.REACT_ALIGN || {})[f.file]);
    const lbl = f.file.replace(/\.(png|jpg)$/, '') + (edited ? '  *' : (saved ? '' : '  (default)'));
    button(24, y + i * 26, 250, 22, fitLines(lbl, 236, [11], 1).lines[0], () => { G.devBo = i; },
      { col: i === G.devBo ? '#5a3a6e' : PAL.slate, fs: 11 });
  }
  button(24, y + files.length * 26 + 6, 250, 24, 'AUTO LINE UP ALL NEW ONES', () => boAutoAll(files), { fs: 11, col: PAL.navy });
  const f = files[G.devBo];
  // the big view: the card's face box at 2.2x, the plain portrait faint in it, the picture over it, whole
  const S = 2.2, bw = Math.round(134 * S), bh = Math.round(128 * S), bx = 300, by = y + 60;
  px(g, bx, by, bw, bh, '#1a1626');
  g.globalAlpha = 0.45; drawPortrait(f.id, bx, by, bw, bh); g.globalAlpha = 1;
  const cut = keyOut(f.im);
  if (cut) {
    const d = breakoutDest(f.id, f.im, bx, by, bw, bh);
    g.globalAlpha = 0.7; g.imageSmoothingEnabled = true; g.drawImage(cut, d.x, d.y, d.w, d.h); g.imageSmoothingEnabled = false; g.globalAlpha = 1;
    g.strokeStyle = PAL.cyan; g.lineWidth = 1; g.strokeRect(d.portrait.x + 0.5, d.portrait.y + 0.5, d.portrait.w - 1, d.portrait.h - 1);
  }
  g.strokeStyle = PAL.yellow; g.lineWidth = 2; g.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
  const [rx, ry, rw] = reactAlign(f.file);
  // under the big view, not over it: a picture reaching up out of the box would sit on top of the words
  // kept to the big view's width: the real-size card sits just to the right of it
  T(bx, by + bh + 8, fitLines(f.file, bw, [13], 1, true).lines[0], PAL.white, 13, 'left', true);
  T(bx, by + bh + 26, 'yellow: the card\'s box   cyan: the plain portrait', PAL.dgray, 11);
  T(bx, by + bh + 40, 'x ' + rx.toFixed(3) + '  y ' + ry.toFixed(3) + '  w ' + rw.toFixed(3) + (_boEdits[f.file] ? '   (not saved)' : ''), _boEdits[f.file] ? PAL.orange : PAL.dgray, 11);
  // the buttons
  const cx = bx + bw + 60;              // clear of the big view, so the real-size card under the buttons does not sit on it
  button(cx, by, 70, 26, 'UP', () => boNudge(f, 0, BO_STEP, 0), { fs: 11 });
  button(cx - 38, by + 30, 70, 26, 'LEFT', () => boNudge(f, BO_STEP, 0, 0), { fs: 11 });
  button(cx + 38, by + 30, 70, 26, 'RIGHT', () => boNudge(f, -BO_STEP, 0, 0), { fs: 11 });
  button(cx, by + 60, 70, 26, 'DOWN', () => boNudge(f, 0, -BO_STEP, 0), { fs: 11 });
  button(cx - 38, by + 100, 70, 26, 'SMALLER', () => boNudge(f, 0, 0, 1 / BO_SCALE), { fs: 11 });
  button(cx + 38, by + 100, 70, 26, 'BIGGER', () => boNudge(f, 0, 0, BO_SCALE), { fs: 11 });
  button(cx - 38, by + 140, 72, 24, 'AUTO', () => boAutoAlign(f), { fs: 11, col: PAL.navy, hint: 'find his head in the picture and line it up for you' });
  button(cx + 38, by + 140, 70, 24, 'RESET', () => { _boEdits[f.file] = REACT_ALIGN_DEFAULT.slice(); }, { fs: 11, col: PAL.dgray });
  button(cx - 38, by + 170, 146, 30, 'SAVE ALL', () => boSave(), { fs: 13, col: PAL.dgreen, disabled: !Object.keys(_boEdits).length });
  // and as it will look: a card at its real size, the picture breaking out of it
  const qx = cx - 38, qy = by + 214, qw = 134, qh = 128;
  px(g, qx - 2, qy - 2, qw + 4, qh + 4, '#7c86b0'); px(g, qx, qy, qw, qh, '#1a1626');
  g.save(); g.beginPath(); g.rect(qx, qy, qw, qh); g.clip();
  const ok = drawBreakout(f.id, f.im, qx, qy, qw, qh);
  g.restore();
  if (ok) drawBreakouts();
  return Math.max(y + files.length * 26, by + bh) + 12;
}

// ---- MUSIC: any track, loop, or sting ----
let _devAmb = null;
function devPlayAmb(name) {
  if (_devAmb) { try { _devAmb.pause(); } catch (e) { /* ok */ } _devAmb = null; }
  const e = sndGet(name);
  if (!e) return;
  _devAmb = mediaFor(e);
  _devAmb.loop = true;
  _devAmb.volume = clamp(AMB_VOL * VOL.amb, 0, 1);
  _devAmb.play().catch(() => {});
}
function drawDevMusic(y) {
  const now = _musicName ? 'now: ' + _musicName : 'now: nothing';
  T(24, y, 'MUSIC  —  ' + now, PAL.gray, 14, 'left', true);
  button(W - 130, y - 3, 106, 20, 'STOP', () => { G.devMusic = '-'; _musicPoll = 0; }, { fs: 11, col: PAL.dred });
  y += 22;
  const tracks = MUSIC_NAMES.concat(['music_tv']).concat(Object.keys(_snd).filter((k) => /^music_(cm_|trailer)/.test(k) && !MUSIC_NAMES.includes(k)));
  const cols = 4, gap = 6, bw = Math.floor((W - 48 - gap * (cols - 1)) / cols);
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i], n = devTakes(t);
    button(24 + (i % cols) * (bw + gap), y + Math.floor(i / cols) * 28, bw, 24, t.replace(/^music_/, '') + (n > 1 ? ' ×' + n : ''), () => { G.devMusic = t; _musicPoll = 0; }, { fs: 11, col: _musicName === t ? '#5a3a6e' : (n ? PAL.dgreen : PAL.slate), disabled: !n });
  }
  y += Math.ceil(tracks.length / cols) * 28 + 10;
  T(24, y, 'AMBIENCE  —  loops under the music', PAL.gray, 14, 'left', true);
  button(W - 130, y - 3, 106, 20, 'STOP', () => { if (_devAmb) { _devAmb.pause(); _devAmb = null; } }, { fs: 11, col: PAL.dred });
  y += 22;
  for (let i = 0; i < AMB_NAMES.length; i++) {
    const a = AMB_NAMES[i], n = devTakes(a);
    button(24 + (i % cols) * (bw + gap), y + Math.floor(i / cols) * 28, bw, 24, a.replace(/^amb_/, '') + (n > 1 ? ' ×' + n : ''), () => devPlayAmb(a), { fs: 11, col: n ? PAL.dgreen : PAL.slate, disabled: !n });
  }
  y += Math.ceil(AMB_NAMES.length / cols) * 28 + 10;
  T(24, y, 'STINGS AND EFFECTS  —  one shot each (synth if no file)', PAL.gray, 14, 'left', true); y += 22;
  const sfx = ['sting_arrive'].concat(STING_NAMES, Object.keys(SYNTH));
  for (let i = 0; i < sfx.length; i++) {
    const s = sfx[i], n = devTakes(s);
    button(24 + (i % 5) * 184, y + Math.floor(i / 5) * 26, 178, 22, s + (n > 1 ? ' ×' + n : ''), () => play(s), { fs: 10, col: n ? PAL.dgreen : PAL.slate });
  }
  return y + Math.ceil(sfx.length / 5) * 26 + 8;
}
