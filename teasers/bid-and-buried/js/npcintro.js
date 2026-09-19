// ---- rival intros: the first time you share a yard with someone, Buzz makes it a thing ----
// A one-card cutscene: a full portrait, the name, Buzz's own line about them (his voice,
// not theirs — same recorded bank as everything else he says). Fires once per rival per
// save, right before an auction with a new face actually starts bidding. Click a rival's
// card during bidding, or their card in THE LEDGER > PEOPLE, to pull the same card back up
// any time — no requeue, nothing re-marked.
'use strict';

function npcIntroDef(id) { return id === 'crowd' ? null : (NPCS.find((n) => n.id === id) || EXTRA_NPCS[id]); }

// ---- the regulars: the gavel notices a face he has seen before ----
// The cutscene only plays once per rival, ever. After that the room still changes
// shape every morning, so on some mornings Buzz says so: one returning face, called
// out by name, and the line knows whether that one has been beating you lately.
// Never on a morning that already ran an intro — one welcome per auction is plenty.
const REGULAR_LINES = {
  // they have been winning against you lately
  cocky: ['"Careful with {name} today — he\'s been eating good lately."',
    '"{name}\'s here, and {name}\'s been on a run. You know that better than me."',
    '"Look who it is. {name} still owes this yard a bad day."',
    '"{name}. Been a while since anybody outbid him. Any volunteers?"',
    '"{name}\'s back, and he brought whatever he made off the last one."'],
  // you have been beating them lately
  wary: ['"{name}\'s back for another go. Be gentle with him."',
    '"{name}\'s here. He remembers last time. I certainly do."',
    '"Welcome back, {name}. Sit anywhere. Bid anything."',
    '"{name} returns, folks. Hope springs eternal."',
    '"{name}\'s in the room and he\'s pretending he isn\'t looking at you."'],
  // no history worth naming yet
  flat: ['"Same faces, same trouble. {name}\'s with us again."',
    '"{name}\'s back in the yard. Let\'s make him pay for it."',
    '"Morning, {name}. Money still folds the same way."',
    '"I see {name} out there. Nobody act surprised."',
    '"{name} again. Some people just like doors."'],
};
// one line, or nothing. Seeded on the day and the unit, so reloading cannot reroll it.
function npcRegularBeat(npcs) {
  const back = npcs.filter((a) => a.active && !a.crowd && codexMet(a.def.id));
  if (!back.length) return false;
  const R = dayR('regulars', G.cur ? G.cur.num : 0);
  if (!R.chance(0.4)) return false;                 // most mornings he just calls the room
  // somebody with a history gets named first; otherwise anybody who turned up
  const hot = back.filter((a) => rivalStance(a.def.id));
  const who = R.pick(hot.length ? hot : back);
  const st = rivalStance(who.def.id) || 'flat';
  qLine(R.pick(REGULAR_LINES[st] || REGULAR_LINES.flat).replace(/\{name\}/g, who.def.name), PAL.orange);
  speak([st === 'flat' ? 'auc_regulars' : 'auc_grudge']);
  return true;
}

// queue one or more new faces before the bidding actually opens
function npcIntroQueue(ids, back) {
  const list = (ids || []).filter((id) => npcIntroDef(id));
  if (!list.length) return false;
  G.npcIntro = { ids: list, i: 0, back: back || G.mode, replay: false, t: 0 };
  G.mode = 'npcIntro';
  speak(['auc_intro_' + list[0]], true);
  return true;
}
// pull one rival's card back up on demand — a click during bidding, or from the ledger
function npcIntroShow(id, back) {
  if (!npcIntroDef(id)) return;
  G.npcIntro = { ids: [id], i: 0, back: back || G.mode, replay: true, t: 0 };
  G.mode = 'npcIntro';
  speak(['auc_intro_' + id], true);
}
function npcIntroNext() {
  const ni = G.npcIntro;
  if (!ni) return;
  ni.i++;
  ni.t = 0; ni.snap = false; ni.slammed = false;    // every face gets its own entrance
  if (ni.i >= ni.ids.length) { npcIntroEnd(); return; }
  speak(['auc_intro_' + ni.ids[ni.i]], true);
}
function npcIntroEnd() {
  if (!G.npcIntro) return;
  voFlush(true);
  G.mode = G.npcIntro.back;
  G.npcIntro = null;
  _musicPoll = 0;
}

// ============ the splash card ============
// The card is a comic impact frame: a colour sweep across the plate, concentration
// lines bursting from behind the head, halftone over the flats, and a deadpan stat
// block. The joke is the one Scott Pilgrim tells — enormous presentation, mundane
// facts. Every number on it is real and readable elsewhere (the ledger says the same
// things), so the card informs as well as it shows off.

// each rival owns one colour, for life. Hand-picked for the faces you meet most,
// hashed for the rest so a new rival never needs a table edit.
const NPC_HUES = [
  { a: '#b13e53', b: '#7d2b3d' },   // 0 red
  { a: '#ef7d57', b: '#b13e53' },   // 1 orange
  { a: '#ffcd75', b: '#ef7d57' },   // 2 gold
  { a: '#38b764', b: '#257179' },   // 3 green
  { a: '#73eff7', b: '#3b5dc9' },   // 4 cyan
  { a: '#3b5dc9', b: '#29366f' },   // 5 blue
  { a: '#e86a8a', b: '#5d275d' },   // 6 pink
];
const NPC_HUE_PICK = { sal: 0, dutch: 1, bart: 2, ed: 5, duo: 4, vera: 6, crowd: 3 };
function npcHue(id) {
  const i = NPC_HUE_PICK[id];
  return NPC_HUES[i != null ? i : strHash(String(id)) % NPC_HUES.length];
}

// doors they have taken off you, doors you have taken off them — all-time, both ways.
// The same two numbers the regulars beat leans on, only stated out loud.
function npcRecord(id) {
  let took = 0, beat = 0;
  for (const e of (G.world && G.world.events) || []) {
    if (e.k === 'lost' && e.contested && e.rival === id) took++;
    else if (e.k === 'won' && (e.fought || []).includes(id)) beat++;
  }
  return { took: took, beat: beat };
}
const NERVE_WORDS = ['folds early', 'steady', 'will not stop'];
function npcTurnsUp(p) { return p >= 0.8 ? 'most days' : p >= 0.6 ? 'often' : p >= 0.4 ? 'now and then' : 'rarely'; }
// the rating is a joke with real arithmetic under it: wallet plus nerve, capped.
function npcRating(d) { return clamp(Math.round((d.budget || 0) / 500 + (d.press || 0)), 1, 10); }
function npcStatRows(d) {
  const r = npcRecord(d.id), raise = d.raise || [25, 50];
  const rows = [
    ['WALLET', d.budget ? 'about ' + fmt$(d.budget) : 'nobody knows'],
    ['RAISES IN', raise[0] === raise[1] ? fmt$(raise[0]) : fmt$(raise[0]) + '–' + fmt$(raise[1])],
    ['NERVE', NERVE_WORDS[clamp(d.press || 0, 0, 2)]],
    ['TURNS UP', npcTurnsUp(d.joinChance == null ? 0.6 : d.joinChance)],
  ];
  rows.push(['AGAINST YOU', r.took + r.beat ? r.beat + ' – ' + r.took + '  (you–them)' : 'never at the same door']);
  return rows;
}

// ---- optional cutouts: npcs/npc_<id>_cut.png ----
// The splash is twice the picture if the figure has no background — it can stand
// ON the colour sweep instead of inside a box. Two ways to give it one, and the
// same code takes either: a real transparent PNG, or a flat magenta (#FF00FF)
// backdrop, which is what image generators will actually hand you. Magenta is
// keyed out at load, once, into an offscreen canvas; the file on disk is never
// touched. No cutout for a face just means that face keeps the framed portrait.
const _cutImg = {};
// only the rivals get a splash card, so only the rivals get a cutout slot
const NPC_CUT_IDS = NPCS.map((n) => n.id).concat(Object.keys(EXTRA_NPCS)).filter((id) => id !== 'crowd');
function keyOut(im) {
  if (im._cut !== undefined) return im._cut;
  if (!im.width || !im.height) return null;             // not decoded yet — ask again next frame
  const w = im.width, h = im.height;
  let src = im;
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, w, h), p = d.data;
    let hasAlpha = false;
    for (let i = 3; i < p.length; i += 4) if (p[i] < 240) { hasAlpha = true; break; }
    if (!hasAlpha) {                                    // no alpha: assume a magenta key
      for (let i = 0; i < p.length; i += 4) {
        if (p[i] > 150 && p[i + 2] > 150 && p[i + 1] < p[i] - 60 && p[i + 1] < p[i + 2] - 60) p[i + 3] = 0;
      }
      x.putImageData(d, 0, 0);
    }
    src = c;
  } catch (e) {
    // opened from file://: the browser will not let us READ the pixels. It will still let us
    // draw them through a colour filter, which needs no readback — so key the magenta that way.
    src = keyOutFiltered(im);
    if (!src) {
      im._cut = null;                                   // no filter either: the framed portrait, and say why once
      if (!keyOut.warned) {
        keyOut.warned = true;
        console.warn('cutouts: this page cannot read image pixels (' + location.protocol + ') and has no SVG filter to key with. Serve the game over http://, or export the cutout with real transparency. Using the framed portrait.');
      }
      return null;
    }
  }
  // bake a white sticker edge, so the figure reads against any colour behind it
  const o = document.createElement('canvas');
  o.width = w + 16; o.height = h + 16;
  const q = o.getContext('2d');
  for (let a = 0; a < 12; a++) q.drawImage(src, 8 + Math.round(Math.cos(a / 12 * 6.283) * 5), 8 + Math.round(Math.sin(a / 12 * 6.283) * 5));
  q.globalCompositeOperation = 'source-in';
  q.fillStyle = '#f4f4f4';
  q.fillRect(0, 0, o.width, o.height);
  q.globalCompositeOperation = 'source-over';
  q.drawImage(src, 8, 8);
  im._cut = o;
  return o;
}
// ---- keying without reading a pixel ----
// An SVG filter in the page. Two masks — "not red-ish" (1 − R + G) and "not blue-ish"
// (1 − B + G), each stepped hard near zero — joined with a ∨ b, so only a colour that is
// BOTH red-high and blue-high with green low goes transparent: magenta, and nothing a
// figure is likely to wear. The compositor runs it; JavaScript never sees a pixel, which is
// why it works on file:// where getImageData throws.
function magentaKeyFilter() {
  if (magentaKeyFilter.id !== undefined) return magentaKeyFilter.id;
  magentaKeyFilter.id = null;
  try {
    if (typeof document === 'undefined' || !document.body || !document.body.appendChild) return null;
    const d = document.createElement('div');
    d.style.position = 'absolute'; d.style.width = '0'; d.style.height = '0'; d.style.overflow = 'hidden';
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><filter id="plMagentaKey" color-interpolation-filters="sRGB">'
      + '<feColorMatrix in="SourceGraphic" result="nr" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 1 0 0 1"/>'
      + '<feComponentTransfer in="nr" result="nr2"><feFuncA type="table" tableValues="0 0 1 1 1 1"/></feComponentTransfer>'
      + '<feColorMatrix in="SourceGraphic" result="nb" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 1 -1 0 1"/>'
      + '<feComponentTransfer in="nb" result="nb2"><feFuncA type="table" tableValues="0 0 1 1 1 1"/></feComponentTransfer>'
      + '<feComposite in="nr2" in2="nb2" operator="arithmetic" k1="-1" k2="1" k3="1" k4="0" result="keep"/>'
      + '<feComposite in="SourceGraphic" in2="keep" operator="in"/>'
      + '</filter></svg>';
    document.body.appendChild(d);
    magentaKeyFilter.id = 'plMagentaKey';
  } catch (e) { /* no DOM to speak of */ }
  return magentaKeyFilter.id;
}
// the image, drawn through the key onto a fresh canvas; null if the page has no filter
function keyOutFiltered(im) {
  const fid = magentaKeyFilter();
  if (!fid) return null;
  const c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const x = c.getContext('2d');
  x.filter = 'url(#' + fid + ')';
  x.drawImage(im, 0, 0);
  x.filter = 'none';
  return c;
}

function npcCutout(id) {
  const list = _cutImg[id];
  if (!list || !list.length) return null;
  return keyOut(list[strHash(id + '_' + G.day) % list.length]);
}

// the halftone field, built once: black dots on transparent, denser at the left,
// stretched over the sweep. One cached image beats five thousand rects a frame.
let _niHalf = null;
function npcHalftone() {
  if (_niHalf) return _niHalf;
  const cv2 = document.createElement('canvas');
  cv2.width = 900; cv2.height = 300;
  const h = cv2.getContext('2d');
  h.fillStyle = '#000';
  for (let y = 0; y < 300; y += 7) {
    for (let x = 0; x < 900; x += 7) {
      const f = 1 - x / 900;                       // fades out to the right
      const s = f > 0.66 ? 3 : f > 0.33 ? 2 : 1;
      if (f < 0.12) continue;
      h.fillRect(x + ((y / 7) & 1 ? 3 : 0), y, s, s);
    }
  }
  _niHalf = cv2;
  return cv2;
}

const NI_SWEEP = 0.20, NI_CARD = 0.36, NI_NAME = 0.48, NI_ROWS = 0.60, NI_ROW_GAP = 0.06;
const NI_DONE = NI_ROWS + 5 * NI_ROW_GAP + 0.12;
function niEase(t) { return t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3); }
function niAt(t, start, len) { return niEase((t - start) / (len || 0.18)); }
// the largest size the name fits the right-hand column at, so a Baroness and a Sal
// both sit on one line
function niNameSize(name) {
  for (const s of [44, 38, 33, 28, 24]) {
    g.font = 'bold ' + s + 'px ' + LOGO_FONT;
    if (g.measureText(name).width <= 468) return s;
  }
  return 24;
}

function drawNpcIntro(dt) {
  const ni = G.npcIntro, d = npcIntroDef(ni.ids[ni.i]), hue = npcHue(d.id);
  ni.t = (ni.t || 0) + (dt || 0);
  // MOTION: OFF in the pause menu means the card is simply there, already assembled
  const t = (!_motion || ni.snap) ? NI_DONE : ni.t;
  if (t >= NI_CARD && !ni.slammed) { ni.slammed = true; play('sting_slam', 0.7); }

  if (!drawBG()) px(g, 0, 0, W, H, '#0b0c12');
  px(g, 0, 0, W, H, 'rgba(4,5,11,0.82)');

  // ---- the sweep: one wide band and two thin stripes, wiping in from the left ----
  const sw = niAt(t, 0, NI_SWEEP), pw = 336, ph = 316, ppx = 64, ppy = 88;
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-0.28);
  const bw = Math.round(1500 * sw);
  px(g, -700, -152, bw, 296, hue.b);
  px(g, -700, -152, bw, 40, hue.a);
  px(g, -700, 120, bw, 16, hue.a);
  px(g, -700, -112, bw, 4, PAL.ink);
  if (bw > 8) {
    g.globalAlpha = 0.20;
    g.drawImage(npcHalftone(), -700, -152, bw, 296);
    g.globalAlpha = 1;
  }
  g.restore();

  // ---- concentration lines, bursting from behind the head ----
  const burst = niAt(t, NI_SWEEP * 0.5, 0.34), lx = ppx + pw / 2, ly = ppy + ph * 0.4;
  if (burst > 0.01) {
    g.save();
    g.translate(lx, ly);
    g.rotate(G.time * 0.05);
    const rad = 1500 * burst;
    for (let i = 0; i < 30; i++) {
      const a0 = (i / 30) * Math.PI * 2, wd = 0.008 + (i % 3) * 0.005;
      g.globalAlpha = i % 3 === 0 ? 0.22 : 0.07;
      g.fillStyle = i % 3 === 0 ? hue.a : '#f4f4f4';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a0 - wd) * rad, Math.sin(a0 - wd) * rad);
      g.lineTo(Math.cos(a0 + wd) * rad, Math.sin(a0 + wd) * rad);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  // ---- the figure, slammed in from the left ----
  // With a cutout he stands on the sweep, bottom-aligned and unframed, which is the
  // whole point of the effect. Without one he gets the framed portrait and a colour
  // sticker offset behind it, which still reads as a comic panel.
  const cs = niAt(t, NI_SWEEP * 0.6, 0.26), cxo = ppx - (1 - cs) * 130, cut = npcCutout(d.id);
  if (cs > 0.01) {
    g.globalAlpha = cs;
    if (cut) {
      const bw2 = 400, bh2 = 356, sc = Math.min(bw2 / cut.width, bh2 / cut.height);
      const dw = Math.round(cut.width * sc), dh = Math.round(cut.height * sc);
      g.drawImage(cut, Math.round(cxo + (pw - dw) / 2), Math.round(ppy + ph - dh + 8), dw, dh);
    } else {
      px(g, cxo + 12, ppy + 12, pw, ph, hue.a);        // the offset block: a printed sticker
      px(g, cxo - 6, ppy - 6, pw + 12, ph + 12, PAL.ink);
      px(g, cxo - 3, ppy - 3, pw + 6, ph + 6, '#f4f4f4');
      px(g, cxo, ppy, pw, ph, '#1a1626');
      drawPortrait(d.id, cxo, ppy, pw, ph);
    }
    g.globalAlpha = 1;
  }

  // ---- the right-hand column: header, name, tag, the arrow, the stats ----
  const rx = 452, rr = 928;
  T(rx, 52, ni.replay ? 'NOW BIDDING AGAINST' : "TONIGHT'S COMPETITION", PAL.gray, 12, 'left', true);
  px(g, rx, 70, rr - rx, 2, hue.a);

  const nm = niAt(t, NI_NAME, 0.16);
  if (nm > 0.01) {
    const name = d.name.toUpperCase(), ns = niNameSize(name), ny = 82 + (1 - nm) * 14;
    g.globalAlpha = nm;
    T(rx + 5, ny + 5, name, PAL.ink, -ns, 'left', true, LOGO_FONT);
    T(rx, ny, name, '#f4f4f4', -ns, 'left', true, LOGO_FONT);
    g.globalAlpha = 1;
    // the arrow: the label points at the man, in case there was any doubt
    px(g, rx - 44, 100, 36, 3, hue.a);
    g.fillStyle = hue.a;
    g.beginPath(); g.moveTo(rx - 48, 92); g.lineTo(rx - 48, 110); g.lineTo(rx - 62, 101); g.closePath(); g.fill();
  }

  // the stat block gets its own dark plate: grey labels over a colour sweep are
  // unreadable, and a card taped over the art is what a comic would do anyway
  const rows = npcStatRows(d), pa = niAt(t, NI_ROWS - 0.06, 0.14);
  if (pa > 0.01) {
    g.globalAlpha = pa;
    px(g, rx - 12, 140, rr - rx + 24, 258, 'rgba(9,10,19,0.90)');
    px(g, rx - 12, 140, 5, 258, hue.a);
    T(rx + 4, 152, d.tag.toUpperCase(), hue.a, 13, 'left', true);
    px(g, rx + 4, 174, rr - rx - 4, 1, 'rgba(148,176,194,0.28)');
    g.globalAlpha = 1;
  }
  for (let i = 0; i < rows.length; i++) {
    const a = niAt(t, NI_ROWS + i * NI_ROW_GAP, 0.14);
    if (a < 0.01) continue;
    const y = 188 + i * 30, ox = (1 - a) * 26;
    g.globalAlpha = a;
    px(g, rx + 4 + ox, y + 21, rr - rx - 4 - ox, 1, 'rgba(148,176,194,0.16)');
    T(rx + 4 + ox, y, rows[i][0], PAL.gray, 12, 'left', true);
    T(rr - 4, y - 1, rows[i][1], '#f4f4f4', 14, 'right');
    g.globalAlpha = 1;
  }
  const ra = niAt(t, NI_ROWS + 5 * NI_ROW_GAP, 0.14);
  if (ra > 0.01) {
    g.globalAlpha = ra;
    px(g, rx + 4, 346, rr - rx - 8, 42, hue.b);
    px(g, rx + 6, 348, rr - rx - 12, 38, PAL.ink);
    T(rx + 20, 359, 'RATING', PAL.gray, 12, 'left', true);
    T(rr - 20, 353, npcRating(d) + ' / 10', PAL.yellow, 24, 'right', true, LOGO_FONT);
    g.globalAlpha = 1;
  }

  // Buzz's line, written out under the plate — same caption-band idea as the TV set,
  // so the beat reads complete long before the line is actually recorded
  const lines = wrapText(d.intro || (d.name + "'s in the room."), 74).slice(0, 2);
  px(g, 0, 410, W, 60, 'rgba(6,7,14,0.78)');
  px(g, 0, 410, W, 3, PAL.ink);
  for (let i = 0; i < lines.length; i++) T(W / 2, 420 + i * 20, lines[i], PAL.cyan, 15, 'center');
  // the first click finishes the flourish; the next one moves on. Nobody has to wait.
  hot(0, 0, W, H - 60, () => { if (ni.t < NI_DONE && !ni.snap) ni.snap = true; else npcIntroNext(); }, { focusable: false });
  button(W / 2 - 90, H - 48, 180, 32, ni.ids.length - ni.i > 1 ? 'NEXT' : (ni.replay ? 'CLOSE' : "LET'S GO"), () => npcIntroNext(), { col: PAL.slate, fs: 14 });
  if (!ni.replay) T(W / 2, 474, 'click anywhere to continue', PAL.dgray, 11, 'center');
}
