// ---- the item card: provenance, at the verdict (docs/APPRAISAL.md §9) ----
// Quiet, then bang. The reveal at the pull stays exactly what it was — that is the beat
// of not knowing yet. THIS lands when somebody qualified says what the thing is, and
// only for the one that mattered: a real legend, a number that moved by real money, or
// a big one. One a day, so it stays an event. It is the same press as the rival card
// (halftone, a burst of lines) and a different page: centred, level, coloured by tier.
// Diagonal for people, centred for objects, and there is no third style.
//
// The museum reopens it (ITS CARD ★): one card, two contexts, built once.
'use strict';

const IC_MOVE = 300;               // a verdict that moved the number by this much earns the card
const IC_BIG = 800;                // or a thing worth this much, confirmed
const IC_T = { veil: 0.15, band: 0.35, thing: 0.55, name: 0.75, rows: 0.95, row: 0.08 };
const IC_DONE = IC_T.rows + 4 * IC_T.row + 0.15;

function itemCardQualifies(it) {
  if (it.legendary) return true;
  const claim = it.claimWas != null ? it.claimWas : it.val;
  return Math.abs(it.val - claim) >= IC_MOVE || it.val >= IC_BIG;
}
function whoSaid(by) {
  if (by === 'appraiser') return APPRAISER.name;
  if (by === 'paper') return 'the paperwork';
  const b = BUYERS.find((x) => x.id === by);
  return b ? b.name : (by || 'nobody');
}
// at a verdict: the card, or nothing. Deferred means it waits for the modal in front of it.
function itemCardMaybe(it, res, back, defer) {
  if (G.demo) return false;
  if (!itemCardQualifies(it)) return false;
  if (G.world.cardDay === G.day) return false;
  G.world.cardDay = G.day;
  if (defer) { G.cardQueued = { it, res: res || null, back: back || G.mode }; return true; }
  itemCardStart(it, res, back || G.mode, false);
  return true;
}
function itemCardStart(it, res, back, replay) {
  G.itemCard = { it, res: res || null, back: back || 'sell', replay: !!replay, t: 0, snap: false, stung: false };
  G.mode = 'itemcard';
  _musicDuck = 0.25; _musicPoll = 0;
}
function itemCardShow(it, back) { itemCardStart(it, null, back || G.mode, true); }
function itemCardEnd() {
  if (!G.itemCard) return;
  G.mode = G.itemCard.back;
  G.itemCard = null;
  _musicDuck = 1; _musicPoll = 0;
}

// a darker cut of a hex colour, for the band under the tier's own colour
function icShade(hex, k) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return '#333c57';
  const c = (s) => Math.max(0, Math.min(255, Math.round(parseInt(s, 16) * k))).toString(16).padStart(2, '0');
  return '#' + c(m[1]) + c(m[2]) + c(m[3]);
}
function icNameSize(name) {
  for (const s of [40, 34, 28, 24]) {
    g.font = 'bold ' + s + 'px ' + LOGO_FONT;
    if (g.measureText(name).width <= 720) return s;
  }
  return 22;
}
// the plate: where it came from, who said what it is, and what you believed
function itemCardRows(it) {
  const town = it.fromTown && TOWNS[it.fromTown] ? TOWNS[it.fromTown].name : null;
  const found = (it.fromDay ? 'day ' + it.fromDay : 'some day') + (town ? '  ·  ' + town : '') + (it.fromUnit ? '  ·  unit ' + it.fromUnit : '');
  const rows = [['FOUND', found]];
  if (it.verdictBy) rows.push(['VERDICT', 'day ' + it.verdictDay + '  ·  ' + whoSaid(it.verdictBy)]);
  if (it.verdictNote) rows.push(['', it.verdictNote]);
  const claim = it.claimWas;
  if (claim != null && claim !== it.val) rows.push(['THOUGHT', fmt$(claim), fmt$(it.val)]);     // the strike is the whole point
  else rows.push(['WORTH', fmt$(it.val)]);
  return rows;
}

function drawItemCard(dt) {
  const ic = G.itemCard, it = ic.it, col = tierOf(it.val).col;
  ic.t += dt;
  const t = (!_motion || ic.snap) ? IC_DONE : ic.t;
  if (t >= IC_T.thing && !ic.stung) { ic.stung = true; play('sting_verdict', 0.8); }

  if (!drawBG()) px(g, 0, 0, W, H, '#0b0c12');
  px(g, 0, 0, W, H, 'rgba(4,5,11,' + (0.86 * niAt(t, 0, IC_T.veil)).toFixed(2) + ')');

  // ---- the band: centred and level. Ceremony, not motion ----
  const by = 96, bh = 228, cy = by + 112;
  const bw = niAt(t, IC_T.veil, 0.25);
  const half = Math.round((W + 40) * bw / 2);
  if (half > 0) {
    px(g, W / 2 - half, by, half * 2, bh, icShade(col, 0.42));
    px(g, W / 2 - half, by, half * 2, 8, col);
    px(g, W / 2 - half, by + bh - 6, half * 2, 6, col);
    if (half > 8) { g.globalAlpha = 0.16; g.drawImage(npcHalftone(), W / 2 - half, by, half * 2, bh); g.globalAlpha = 1; }
  }
  // ---- lines, slow and even, from behind the thing ----
  const burst = niAt(t, IC_T.band - 0.1, 0.3);
  if (burst > 0.01) {
    g.save();
    g.translate(W / 2, cy);
    g.rotate(G.time * 0.03);
    const rad = 1400 * burst;
    for (let i = 0; i < 36; i++) {
      const a0 = (i / 36) * Math.PI * 2, wd = 0.006 + (i % 2) * 0.004;
      g.globalAlpha = i % 2 ? 0.05 : 0.14;
      g.fillStyle = i % 2 ? '#f4f4f4' : col;
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(a0 - wd) * rad, Math.sin(a0 - wd) * rad);
      g.lineTo(Math.cos(a0 + wd) * rad, Math.sin(a0 + wd) * rad);
      g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
  }
  // ---- the thing, big, settling into place ----
  const ts = niAt(t, IC_T.thing - 0.15, 0.3);
  if (ts > 0.01) {
    const spr = getSprite(it.spr, it.pal, it.cond, it.hseed || it.uid);
    const sc = Math.min(6, Math.floor(196 / spr.height), Math.floor(320 / spr.width)) || 1;
    const scale = 1 + (1 - ts) * 0.35;
    const dw = spr.width * sc * scale, dh = spr.height * sc * scale;
    g.globalAlpha = ts;
    g.drawImage(spr, Math.round(W / 2 - dw / 2), Math.round(cy - dh / 2), Math.round(dw), Math.round(dh));
    g.globalAlpha = 1;
  }
  // ---- the name, centred, with a hard shadow ----
  const nm = niAt(t, IC_T.name, 0.16);
  if (nm > 0.01) {
    const name = dName(it).toUpperCase(), ns = icNameSize(name), ny = by + bh + 12 + (1 - nm) * 10;
    g.globalAlpha = nm;
    T(W / 2 + 4, ny + 4, name, PAL.ink, -ns, 'center', true, LOGO_FONT);
    T(W / 2, ny, name, '#f4f4f4', -ns, 'center', true, LOGO_FONT);
    g.globalAlpha = 1;
  }
  // ---- the plate: provenance ----
  const rows = itemCardRows(it);
  const px0 = 200, pw = 560, py = 384, ph = 12 + rows.length * 22 + 6;
  const pa = niAt(t, IC_T.rows - 0.05, 0.14);
  if (pa > 0.01) {
    g.globalAlpha = pa;
    px(g, px0, py, pw, ph, 'rgba(9,10,19,0.90)');
    px(g, px0, py, pw, 3, col);
    g.globalAlpha = 1;
  }
  for (let i = 0; i < rows.length; i++) {
    const a = niAt(t, IC_T.rows + i * IC_T.row, 0.12);
    if (a < 0.01) continue;
    const y = py + 12 + i * 22, r = rows[i];
    g.globalAlpha = a;
    if (r[0]) T(px0 + 16, y + 1, r[0], PAL.gray, 12, 'left', true);
    if (r[0] === 'THOUGHT') {
      // the number you believed, struck through, and the number it is
      const was = r[1], now = r[2], arrow = '   →   ';
      T(px0 + pw - 16, y, was + arrow + now, '#f4f4f4', 14, 'right');
      g.font = '14px ' + FONT;
      const wAll = g.measureText(was + arrow + now).width, wWas = g.measureText(was).width;
      px(g, Math.round(px0 + pw - 16 - wAll), y + 8, Math.round(wWas), 2, PAL.red);
      T(px0 + pw - 16, y, now, PAL.yellow, 14, 'right', true);
    } else if (r[0]) T(px0 + pw - 16, y, r[1], r[0] === 'WORTH' ? PAL.yellow : '#f4f4f4', 14, 'right', r[0] === 'WORTH');
    else T(W / 2, y, r[1], col, 13, 'center');                                            // the reason, in their words
    g.globalAlpha = 1;
  }
  // the first click finishes the flourish; the next one puts the card down
  hot(0, 0, W, H - 44, () => { if (ic.t < IC_DONE && !ic.snap) ic.snap = true; else itemCardEnd(); }, { focusable: false });
  button(W / 2 - 70, H - 36, 140, 28, ic.replay ? 'CLOSE' : 'ALL RIGHT', () => itemCardEnd(), { col: PAL.slate, fs: 14 });
}
