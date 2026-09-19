// ---- palette + procedural pixel sprites (hi-detail: smalls 24x24, bigs 48-class) ----
'use strict';

const PAL = {
  ink:   '#1a1c2c', navy:  '#29366f', slate: '#333c57', dgray: '#566c86',
  gray:  '#94b0c2', lmetal:'#c7d6e2', white: '#f4f4f4', red:   '#b13e53',
  dred:  '#7d2b3d', lred:  '#d9626f', orange:'#ef7d57', yellow:'#ffcd75',
  green: '#38b764', dgreen:'#257179', blue:  '#3b5dc9', lblue: '#41a6f6',
  cyan:  '#73eff7', purple:'#5d275d', pink:  '#e86a8a', lpink: '#f7b8cc',
  wood:  '#a5673f', dwood: '#7a4a2b', lwood: '#c98d5a', pwood: '#e0b380',
  skin:  '#f0c297', skin2: '#c78d5e', hair:  '#3b2a1a', gold:  '#f5c542',
  dgold: '#c9962a', ggold: '#ffe9a8', paper: '#e8dcc0', dpaper:'#c9b98f',
};

// brand/material palettes: a base, b shadow, c light, d accent
const BRAND_PALS = {
  wood:  { a: PAL.wood,   b: PAL.dwood, c: PAL.lwood,  d: PAL.pwood },
  dark:  { a: PAL.slate,  b: PAL.ink,   c: PAL.dgray,  d: PAL.gray },
  red:   { a: PAL.red,    b: PAL.dred,  c: PAL.lred,   d: PAL.orange },
  gold:  { a: PAL.gold,   b: PAL.dgold, c: PAL.ggold,  d: PAL.yellow },
  blue:  { a: PAL.blue,   b: PAL.navy,  c: PAL.lblue,  d: PAL.cyan },
  teal:  { a: PAL.dgreen, b: PAL.navy,  c: PAL.green,  d: PAL.cyan },
  white: { a: PAL.white,  b: PAL.gray,  c: '#ffffff',  d: PAL.dgray },
  pink:  { a: PAL.pink,   b: PAL.purple,c: PAL.lpink,  d: PAL.white },
  gray:  { a: PAL.gray,   b: PAL.dgray, c: PAL.lmetal, d: PAL.white },
};

function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.4);
    g.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}
function ring(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let a = 0; a < 96; a++) {
    const t = (a / 96) * Math.PI * 2;
    g.fillRect(cx + Math.round(Math.cos(t) * r), cy + Math.round(Math.sin(t) * r), 1, 1);
  }
}
// outline + fill
function oRect(g, x, y, w, h, fill) {
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 1, y + 1, w - 2, h - 2, fill);
}
// filled box with top/left light + bottom/right shade, inside an ink outline
function bevelBox(g, x, y, w, h, base, light, shadow) {
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 1, y + 1, w - 2, h - 2, base);
  px(g, x + 1, y + 1, w - 2, 1, light);
  px(g, x + 1, y + 1, 1, h - 2, light);
  px(g, x + 1, y + h - 2, w - 2, 1, shadow);
  px(g, x + w - 2, y + 1, 1, h - 2, shadow);
}
// horizontal wood-grain strokes
function grain(g, x, y, w, h, c, seed, n) {
  const r = RNG(seed || 7);
  g.fillStyle = c;
  for (let i = 0; i < (n || 5); i++)
    g.fillRect(x + r.i(0, Math.max(0, w - 8)), y + r.i(0, h - 1), r.i(4, 9), 1);
}
function speck(g, x, y, w, h, c, seed, n) {
  const r = RNG(seed || 3);
  g.fillStyle = c;
  for (let i = 0; i < (n || 6); i++) g.fillRect(x + r.i(0, w - 1), y + r.i(0, h - 1), 1, 1);
}
function sparkle(g, x, y, c) {
  g.fillStyle = c || '#ffffff';
  g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
}
// one cardboard body at any size: flaps open or taped shut, a label, a stain.
// Every box in the family draws from this so five sizes read as one product line.
function cardboard(g, w, h, r) {
  const closed = r.chance(0.35);
  const fh = Math.max(5, Math.round(h * 0.18));      // flap band across the top
  const by = fh, bh = h - fh;
  px(g, 1, by - 1, w - 2, bh, PAL.ink);
  px(g, 2, by, w - 4, bh - 2, PAL.lwood);
  px(g, 2, by, w - 4, 3, PAL.wood);
  px(g, 2, by, 2, bh - 2, PAL.pwood); px(g, w - 4, by, 2, bh - 2, PAL.dwood);
  if (closed) {
    px(g, 1, by - 3, w - 2, 5, PAL.ink); px(g, 2, by - 2, w - 4, 3, PAL.pwood);
    px(g, Math.round(w / 2) - 3 + r.i(-5, 5), by - 3, 6, bh + 2, PAL.dpaper);   // tape down the seam
  } else {
    const fw = Math.round(w / 2) - 3;
    px(g, 0, 1, fw, fh, PAL.ink); px(g, 1, 2, fw - 2, fh - 2, PAL.pwood);
    px(g, w - fw, 1, fw, fh, PAL.ink); px(g, w - fw + 1, 2, fw - 2, fh - 2, PAL.pwood);
    px(g, fw + 1, by, 4, bh - 2, PAL.dpaper);                                   // the gap between them
  }
  const lw = Math.max(9, Math.round(w * 0.3)), lh = Math.max(6, Math.round(h * 0.16));
  const lx = r.i(4, Math.max(5, w - lw - 4)), ly = by + r.i(3, Math.max(4, bh - lh - 4));
  px(g, lx, ly, lw, lh, r.chance(0.25) ? '#e8d090' : PAL.paper);                // shipping label
  px(g, lx + 2, ly + 2, Math.max(4, lw - 6), 1, PAL.dgray);
  px(g, lx + 2, ly + 4, r.i(4, Math.max(5, lw - 8)), 1, PAL.dgray);
  if (r.chance(0.4)) px(g, r.i(3, Math.max(4, w - 12)), h - Math.round(bh * 0.3), r.i(5, 10), 5, 'rgba(90,74,43,0.35)');
  if (r.chance(0.3)) pline(g, r.i(5, 18), by + 2, r.i(Math.round(w / 2), w - 6), h - 3, 1, PAL.wood);
  speck(g, 3, h - Math.round(bh * 0.35), w - 7, 7, PAL.dwood, r.i(1, 99), r.i(3, 7));
}
// pixel line of thickness t
function pline(g, x0, y0, x1, y1, t, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  g.fillStyle = c;
  for (let i = 0; i <= n; i++)
    g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), t, t);
}

function S(w, h, draw) { return { w, h, draw }; }

const SPRITES = {

  // ================= BIG / LOCKER ITEMS =================

  dresser: S(48, 44, (g, C) => {
    px(g, 3, 40, 6, 4, PAL.ink); px(g, 39, 40, 6, 4, PAL.ink);      // legs
    bevelBox(g, 1, 4, 46, 37, C.a, C.c, C.b);
    px(g, 1, 4, 46, 4, PAL.ink); px(g, 2, 5, 44, 2, C.d);           // top slab
    for (let i = 0; i < 3; i++) {
      const dy = 10 + i * 10;
      bevelBox(g, 5, dy, 38, 9, C.a, C.c, C.b);
      px(g, 6, dy + 8, 36, 1, PAL.ink);
      px(g, 20, dy + 3, 8, 3, PAL.ink); px(g, 21, dy + 3, 6, 2, PAL.gold);  // handle
    }
    grain(g, 3, 6, 42, 2, C.b, 11, 3);
  }),

  wardrobe: S(48, 72, (g, C) => {
    px(g, 4, 68, 7, 4, PAL.ink); px(g, 37, 68, 7, 4, PAL.ink);
    bevelBox(g, 1, 6, 46, 63, C.a, C.c, C.b);
    px(g, 1, 2, 46, 6, PAL.ink); px(g, 2, 3, 44, 4, C.c);           // crown
    px(g, 23, 8, 2, 59, PAL.ink);                                    // door split
    bevelBox(g, 5, 12, 15, 48, C.a, C.d, C.b);                       // inset panels
    bevelBox(g, 28, 12, 15, 48, C.a, C.d, C.b);
    px(g, 19, 30, 3, 8, PAL.ink); px(g, 19, 31, 2, 6, PAL.gold);     // handles
    px(g, 26, 30, 3, 8, PAL.ink); px(g, 27, 31, 2, 6, PAL.gold);
    grain(g, 6, 14, 13, 44, C.b, 21, 4); grain(g, 29, 14, 13, 44, C.b, 22, 4);
  }),

  mattress: S(48, 80, (g) => {
    px(g, 4, 2, 40, 76, PAL.ink);
    px(g, 5, 3, 38, 74, PAL.white);
    px(g, 6, 3, 36, 2, '#ffffff');
    px(g, 5, 3, 38, 10, PAL.lblue);                                  // top band
    for (let i = 0; i < 4; i++) {
      px(g, 5, 18 + i * 16, 38, 3, PAL.lblue);
      px(g, 5, 21 + i * 16, 38, 1, PAL.gray);
    }
    for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 2; xx++)
      { px(g, 15 + xx * 16, 26 + yy * 16, 2, 2, PAL.dgray); }        // buttons
    px(g, 5, 3, 2, 74, PAL.gray); px(g, 41, 3, 2, 74, PAL.gray);     // piping
    px(g, 12, 56, 14, 9, 'rgba(180,160,110,0.45)');                  // the stain
    px(g, 14, 58, 9, 5, 'rgba(180,160,110,0.5)');
  }),

  couch: S(96, 44, (g, C) => {
    px(g, 6, 40, 7, 4, PAL.ink); px(g, 83, 40, 7, 4, PAL.ink);
    bevelBox(g, 10, 6, 76, 12, C.a, C.c, C.b);                       // back
    px(g, 14, 9, 32, 7, C.b); px(g, 50, 9, 32, 7, C.b);              // back seams
    bevelBox(g, 1, 10, 12, 31, C.a, C.c, C.b);                       // arms
    bevelBox(g, 83, 10, 12, 31, C.a, C.c, C.b);
    bevelBox(g, 11, 18, 74, 23, C.a, C.c, C.b);                      // base
    bevelBox(g, 14, 20, 34, 12, C.c, C.d, C.b);                      // cushions
    bevelBox(g, 49, 20, 34, 12, C.c, C.d, C.b);
    px(g, 15, 30, 32, 1, C.b); px(g, 50, 30, 32, 1, C.b);
  }),

  armchair: S(48, 44, (g, C) => {
    px(g, 5, 40, 6, 4, PAL.ink); px(g, 37, 40, 6, 4, PAL.ink);
    bevelBox(g, 8, 4, 32, 14, C.a, C.c, C.b);
    bevelBox(g, 1, 12, 10, 29, C.a, C.c, C.b);
    bevelBox(g, 37, 12, 10, 29, C.a, C.c, C.b);
    bevelBox(g, 9, 16, 30, 25, C.a, C.c, C.b);
    bevelBox(g, 12, 19, 24, 12, C.c, C.d, C.b);                      // seat cushion
    px(g, 13, 29, 22, 1, C.b);
  }),

  diningTable: S(96, 40, (g, C) => {
    // legs
    px(g, 20, 13, 4, 23, PAL.ink); px(g, 72, 13, 4, 23, PAL.ink);    // back pair
    px(g, 6, 14, 5, 26, PAL.ink); px(g, 7, 15, 3, 24, C.b);
    px(g, 85, 14, 5, 26, PAL.ink); px(g, 86, 15, 3, 24, C.b);
    // apron with one shallow drawer
    px(g, 4, 10, 88, 8, PAL.ink); px(g, 5, 11, 86, 6, C.a);
    px(g, 40, 12, 16, 5, PAL.ink); px(g, 41, 13, 14, 3, C.c);
    px(g, 46, 14, 4, 1, PAL.gold);                                    // knob
    // top slab
    px(g, 0, 2, 96, 9, PAL.ink);
    px(g, 1, 3, 94, 7, C.a);
    px(g, 1, 3, 94, 2, C.c);
    px(g, 1, 8, 94, 2, C.b);
    grain(g, 4, 5, 88, 3, C.b, 31, 9);
    px(g, 47, 3, 2, 7, C.b);                                          // leaf seam
  }),

  diningChair: S(26, 38, (g, C) => {
    // back posts + slats
    px(g, 4, 1, 4, 22, PAL.ink); px(g, 5, 2, 2, 20, C.a);
    px(g, 18, 1, 4, 22, PAL.ink); px(g, 19, 2, 2, 20, C.a);
    px(g, 6, 4, 14, 3, PAL.ink); px(g, 7, 5, 12, 1, C.c);
    px(g, 6, 10, 14, 3, PAL.ink); px(g, 7, 11, 12, 1, C.c);
    // seat
    px(g, 2, 20, 22, 6, PAL.ink); px(g, 3, 21, 20, 4, C.a); px(g, 3, 21, 20, 1, C.c);
    // legs
    px(g, 3, 26, 3, 12, PAL.ink); px(g, 20, 26, 3, 12, PAL.ink);
    px(g, 8, 26, 2, 9, C.b); px(g, 16, 26, 2, 9, C.b);
    grain(g, 4, 22, 18, 2, C.b, 17, 3);
  }),

  tableLeaf: S(24, 24, (g, C) => {
    px(g, 1, 8, 22, 9, PAL.ink);
    px(g, 2, 9, 20, 7, C.a);
    px(g, 2, 9, 20, 2, C.c);
    px(g, 2, 14, 20, 2, C.b);
    grain(g, 3, 10, 18, 4, C.b, 41, 4);
    px(g, 4, 17, 2, 2, PAL.gray); px(g, 18, 17, 2, 2, PAL.gray);      // alignment pegs
  }),

  tablecloth: S(24, 24, (g) => {
    px(g, 2, 5, 20, 14, PAL.ink);
    px(g, 3, 6, 18, 12, PAL.paper);
    px(g, 3, 6, 18, 2, '#fff7e6');
    px(g, 3, 10, 18, 1, PAL.dpaper);                                  // fold lines
    px(g, 3, 14, 18, 1, PAL.dpaper);
    for (let i = 0; i < 9; i++) px(g, 3 + i * 2, 18, 1, 1, PAL.dpaper); // lace scallop
    px(g, 6, 8, 3, 1, PAL.red); px(g, 15, 12, 3, 1, PAL.red);         // embroidered sprigs
  }),

  ironSet: S(24, 24, (g, C) => {
    // a bundle of golf irons, grips up
    for (let i = 0; i < 4; i++) {
      const x = 5 + i * 4;
      px(g, x, 2, 2, 5, PAL.ink); px(g, x, 2, 1, 4, C.a);            // grips
      px(g, x, 7, 1, 12, PAL.gray);                                   // shafts
      px(g, x - 1, 19, 4, 3, PAL.lmetal); px(g, x - 1, 19, 4, 1, '#ffffff');  // heads
    }
    px(g, 3, 12, 18, 2, PAL.dwood);                                   // strap
  }),
  ballCan: S(24, 24, (g) => {
    px(g, 5, 5, 14, 16, PAL.ink);
    px(g, 6, 6, 12, 14, PAL.red);
    px(g, 6, 6, 12, 3, PAL.lred);
    px(g, 6, 11, 12, 5, PAL.paper);                                   // label
    px(g, 7, 13, 10, 1, PAL.dgray);
    disc(g, 9, 4, 2, PAL.white); disc(g, 14, 3, 2, PAL.white);        // balls on top
    px(g, 8, 3, 1, 1, '#ffffff'); px(g, 13, 2, 1, 1, '#ffffff');
    px(g, 6, 19, 12, 1, PAL.dred);
  }),
  scorecard: S(24, 24, (g) => {
    px(g, 3, 4, 18, 16, PAL.ink);
    px(g, 4, 5, 16, 14, PAL.paper);
    px(g, 4, 5, 16, 3, PAL.dgreen);                                   // header band
    for (let i = 0; i < 4; i++) px(g, 6, 10 + i * 2, 12 - (i === 3 ? 6 : 0), 1, PAL.dgray);
    pline(g, 8, 16, 17, 14, 1, PAL.blue);                             // the signature
    pline(g, 14, 15, 16, 17, 1, PAL.blue);
    px(g, 18, 4, 3, 3, PAL.dpaper);                                   // dog ear
  }),

  // ---- the ten shapes of an oddment: the family gives the palette, the roll gives the name ----
  oddTin: S(24, 24, (g, C, R) => {
    const r = R.i(0, 2);
    if (r === 0) { disc(g, 12, 12, 9, PAL.ink); disc(g, 12, 12, 8, C.a); disc(g, 12, 11, 6, C.c); disc(g, 12, 12, 3, C.b); }   // a round tin
    else { px(g, 3, 6, 18, 14, PAL.ink); px(g, 4, 7, 16, 12, C.a); px(g, 4, 7, 16, 3, C.c); px(g, 7, 11, 10, 5, C.d); px(g, 8, 12, 8, 1, C.c); }   // a rectangular one, a label
    px(g, 5, 20, 14, 1, 'rgba(0,0,0,0.25)');
  }),
  oddCase: S(24, 24, (g, C, R) => {
    px(g, 2, 6, 20, 14, PAL.ink); px(g, 3, 7, 18, 12, C.a);
    px(g, 3, 7, 18, 5, C.c); px(g, 3, 12, 18, 1, PAL.ink);                                     // the lid, the hinge line
    px(g, 11, 12, 2, 3, R.chance(0.5) ? '#c9a24a' : PAL.gray);                                 // the clasp
    if (R.chance(0.5)) px(g, 6, 15, 12, 2, C.d);                                               // a strap, or not
    px(g, 4, 20, 16, 1, 'rgba(0,0,0,0.25)');
  }),
  oddTool: S(24, 24, (g, C, R) => {
    const k = R.i(0, 2);
    if (k === 0) { px(g, 4, 14, 14, 4, C.d); px(g, 5, 15, 12, 1, C.c); px(g, 16, 8, 5, 12, PAL.lmetal); px(g, 17, 6, 3, 3, PAL.gray); }      // a handle and a business end
    else if (k === 1) { px(g, 3, 10, 18, 3, PAL.lmetal); px(g, 3, 13, 18, 2, PAL.gray); px(g, 10, 4, 4, 6, C.d); px(g, 9, 3, 6, 2, C.c); }    // a crank thing
    else { px(g, 6, 3, 3, 18, C.d); px(g, 15, 3, 3, 18, C.d); px(g, 4, 3, 16, 3, PAL.lmetal); px(g, 6, 20, 12, 1, PAL.gray); }              // tongs, a press
    px(g, 4, 21, 16, 1, 'rgba(0,0,0,0.25)');
  }),
  oddKey: S(24, 24, (g, C, R) => {
    disc(g, 8, 8, 5, PAL.ink); disc(g, 8, 8, 4, C.c); disc(g, 8, 8, 2, PAL.ink);                 // the bow, with a hole
    px(g, 11, 7, 10, 3, PAL.ink); px(g, 12, 8, 9, 1, C.c);                                      // the shank
    px(g, 17, 10, 2, 3, PAL.ink); px(g, 20, 10, 2, 2, PAL.ink);                                 // the bit
    if (R.chance(0.6)) { disc(g, 6, 16, 4, PAL.ink); disc(g, 6, 16, 3, C.a); px(g, 4, 15, 4, 1, C.c); }   // a tag, or a ring
    else { px(g, 4, 14, 8, 6, PAL.ink); px(g, 5, 15, 6, 4, PAL.paper); }
    px(g, 4, 21, 16, 1, 'rgba(0,0,0,0.25)');
  }),
  oddToken: S(24, 24, (g, C, R) => {
    disc(g, 12, 12, 8, PAL.ink); disc(g, 12, 12, 7, C.a); disc(g, 12, 12, 5, C.c);
    disc(g, 12, 12, 3, C.a);
    if (R.chance(0.5)) px(g, 10, 11, 4, 2, C.d); else px(g, 11, 9, 2, 6, C.d);                 // a bar, or a numeral, unreadable
    px(g, 6, 21, 12, 1, 'rgba(0,0,0,0.25)');
  }),
  oddPaper: S(24, 24, (g, C, R) => {
    if (R.chance(0.5)) { px(g, 4, 3, 16, 18, PAL.ink); px(g, 5, 4, 14, 16, PAL.paper); px(g, 7, 7, 10, 1, C.d); px(g, 7, 10, 8, 1, PAL.dgray); px(g, 7, 13, 9, 1, PAL.dgray); }   // a card, a booklet
    else { disc(g, 12, 12, 9, PAL.ink); disc(g, 12, 12, 8, PAL.paper); disc(g, 12, 12, 5, C.c); disc(g, 12, 12, 1, PAL.ink); px(g, 12, 4, 1, 8, PAL.dgray); }   // a wheel
    px(g, 5, 21, 14, 1, 'rgba(0,0,0,0.25)');
  }),
  oddKit: S(24, 24, (g, C, R) => {
    px(g, 2, 8, 20, 10, PAL.ink); px(g, 3, 9, 18, 8, C.a);                                       // a roll, or a pouch
    px(g, 3, 9, 18, 2, C.c); px(g, 3, 15, 18, 2, C.b);
    px(g, 8, 8, 2, 10, C.d); px(g, 14, 8, 2, 10, C.d);                                          // the ties
    if (R.chance(0.5)) px(g, 18, 6, 3, 14, PAL.lmetal);                                          // something steel showing at the end
    px(g, 4, 19, 16, 1, 'rgba(0,0,0,0.25)');
  }),
  oddGadget: S(24, 24, (g, C, R) => {
    bevelBox(g, 4, 4, 16, 16, C.a, C.c, C.b);
    px(g, 6, 6, 12, 5, PAL.ink); px(g, 7, 7, 10, 3, R.chance(0.5) ? '#2a3a2a' : '#1a2a3a'); px(g, 8, 8, 4, 1, PAL.green);   // a window, a reading
    for (let i = 0; i < 3; i++) px(g, 7 + i * 4, 14, 2, 2, PAL.gray);                            // buttons
    if (R.chance(0.4)) disc(g, 17, 16, 2, C.d);                                                  // a dial
    px(g, 5, 21, 14, 1, 'rgba(0,0,0,0.25)');
  }),
  oddBottle: S(24, 24, (g, C, R) => {
    const wide = R.chance(0.5);
    if (wide) { px(g, 6, 8, 12, 13, PAL.ink); px(g, 7, 9, 10, 11, C.c); px(g, 8, 10, 3, 8, 'rgba(255,255,255,0.35)'); px(g, 9, 5, 6, 4, PAL.ink); px(g, 10, 6, 4, 2, C.d); }   // a jar with a lid
    else { px(g, 9, 3, 6, 4, PAL.ink); px(g, 10, 4, 4, 2, C.d); px(g, 7, 7, 10, 14, PAL.ink); px(g, 8, 8, 8, 12, C.c); px(g, 9, 9, 2, 9, 'rgba(255,255,255,0.35)'); px(g, 9, 13, 6, 4, PAL.paper); }   // a bottle with a label
    px(g, 6, 21, 12, 1, 'rgba(0,0,0,0.25)');
  }),
  oddBrass: S(24, 24, (g, C, R) => {
    const k = R.i(0, 2);
    if (k === 0) { disc(g, 12, 10, 7, PAL.ink); disc(g, 12, 10, 6, '#c9a24a'); disc(g, 11, 9, 3, '#e8d090'); px(g, 11, 16, 2, 5, '#8a6a20'); }   // a pan, a dish
    else if (k === 1) { px(g, 4, 14, 16, 6, PAL.ink); px(g, 5, 15, 14, 4, '#c9a24a'); px(g, 10, 4, 4, 10, '#c9a24a'); px(g, 8, 3, 8, 2, '#e8d090'); }   // a stand, a scale
    else { px(g, 5, 5, 14, 14, PAL.ink); px(g, 6, 6, 12, 12, '#c9a24a'); px(g, 8, 8, 8, 8, '#a8842a'); px(g, 9, 9, 3, 3, '#e8d090'); }             // a block, a head
    px(g, 5, 21, 14, 1, 'rgba(0,0,0,0.25)');
  }),
  // the censor mosaic: pastel blocks and a black bar. There is no picture under it. There never was.
  censored: S(28, 28, (g, C, R) => {
    const tones = ['#e8c4b0', '#d9a88c', '#f0d8c8', '#c89a86', '#b8a0a8', '#d8c0b8', '#a88a90', '#e0b8a0'];
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      if ((x === 0 || x === 5) && (y === 0 || y === 5)) continue;                              // rounded off at the corners
      px(g, 2 + x * 4, 2 + y * 4, 4, 4, tones[R.i(0, tones.length - 1)]);
    }
    px(g, 1, 12, 26, 6, PAL.ink);                                                               // the bar
    px(g, 3, 13, 22, 1, '#2e2e36');
    for (let i = 0; i < 3; i++) px(g, 6 + i * 6, 14, 3, 2, PAL.white);                          // three dots of small print nobody can read
    px(g, 2, 26, 24, 1, 'rgba(0,0,0,0.25)');
  }),
  // what Deposits leaves in a front row: three of them, and a fly
  droppings: S(24, 24, (g) => {
    px(g, 5, 15, 6, 4, '#3a2a1e'); px(g, 6, 14, 4, 1, '#4a382a');
    px(g, 11, 16, 7, 4, '#3a2a1e'); px(g, 12, 15, 5, 1, '#4a382a');
    px(g, 9, 12, 4, 3, '#3a2a1e'); px(g, 10, 11, 2, 1, '#4a382a');
    px(g, 4, 20, 16, 1, 'rgba(0,0,0,0.25)');
    px(g, 17, 8, 2, 1, PAL.ink); px(g, 16, 7, 1, 1, PAL.ink); px(g, 19, 7, 1, 1, PAL.ink);   // the fly
  }),
  // ---- the decade ----
  ouijaBoard: S(24, 24, (g) => {
    px(g, 2, 4, 20, 16, PAL.ink); px(g, 3, 5, 18, 14, '#d9c7a0');
    px(g, 5, 7, 14, 1, PAL.ink); px(g, 5, 10, 14, 1, PAL.ink); px(g, 5, 13, 14, 1, PAL.ink);   // the alphabet, in rows
    px(g, 4, 6, 3, 2, PAL.dgray); px(g, 17, 6, 3, 2, PAL.dgray);                             // sun and moon corners
    px(g, 8, 15, 8, 2, PAL.ink); px(g, 10, 14, 4, 1, PAL.ink);                               // GOODBYE
    px(g, 13, 8, 4, 4, '#c9a24a'); px(g, 14, 9, 2, 2, PAL.ink);                              // the planchette, taped down
  }),
  cabbageDoll: S(24, 24, (g) => {
    px(g, 6, 2, 12, 20, PAL.ink); px(g, 7, 3, 10, 18, '#e8d7a8');                            // the box window
    disc(g, 12, 9, 4, '#f0c8a0'); disc(g, 12, 7, 4, '#c9a24a');                              // a round head, yarn hair
    px(g, 10, 9, 1, 1, PAL.ink); px(g, 13, 9, 1, 1, PAL.ink); px(g, 11, 11, 2, 1, PAL.red);   // eyes, a mouth
    px(g, 8, 14, 8, 6, PAL.pink); px(g, 9, 15, 6, 1, PAL.white);                             // a frock, a collar
    px(g, 7, 19, 10, 2, PAL.dpaper);                                                          // the papers, inside
  }),
  instantCamera: S(24, 24, (g) => {
    bevelBox(g, 3, 8, 18, 12, '#e8e0cc', PAL.white, PAL.gray);
    px(g, 3, 8, 18, 3, PAL.ink); px(g, 4, 9, 16, 1, '#3a3d4d');                              // the dark top
    disc(g, 12, 14, 3, PAL.ink); disc(g, 12, 14, 2, '#22242e'); px(g, 11, 13, 1, 1, PAL.cyan);   // the lens
    px(g, 5, 12, 3, 2, PAL.red); px(g, 5, 15, 3, 1, PAL.yellow); px(g, 5, 17, 3, 1, PAL.green); px(g, 5, 19, 3, 1, PAL.blue);   // the stripe
    px(g, 6, 20, 12, 2, PAL.white); px(g, 7, 21, 10, 1, PAL.dpaper);                         // the one photo, coming out
  }),
  floppyBox: S(24, 24, (g) => {
    px(g, 2, 6, 20, 16, PAL.ink); px(g, 3, 7, 18, 14, '#7a7488');
    for (let i = 0; i < 6; i++) { px(g, 4 + i * 3, 8, 2, 12, i % 2 ? '#2a2a34' : '#3a3a48'); px(g, 4 + i * 3, 9, 2, 2, PAL.paper); }   // disks, edge on, labels
    px(g, 3, 5, 18, 2, '#5a5468');                                                            // the lid, open
  }),
  trashCards: S(24, 24, (g) => {
    px(g, 5, 5, 12, 16, PAL.ink); px(g, 6, 6, 10, 14, PAL.paper);
    px(g, 7, 7, 8, 8, PAL.green); px(g, 9, 9, 4, 4, '#f0c8a0'); px(g, 10, 10, 1, 1, PAL.ink); px(g, 12, 10, 1, 1, PAL.ink);   // a kid, green, unwell
    px(g, 7, 16, 8, 2, PAL.red); px(g, 8, 16, 6, 2, PAL.yellow);                             // the name banner
    px(g, 4, 11, 16, 2, '#9a8c6a');                                                           // the rubber band that gave up
    px(g, 15, 4, 4, 4, PAL.pink);                                                              // the gum
  }),
  homeComputer: S(44, 24, (g) => {
    bevelBox(g, 1, 8, 42, 14, '#c9bfa6', '#e8e0cc', '#8a7f6a');                              // the breadbox
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) px(g, 5 + c * 3, 11 + r * 3, 2, 2, r === 2 && c > 2 && c < 9 ? '#8a7f6a' : '#4a4438');   // keys
    px(g, 34, 10, 6, 2, PAL.red); px(g, 34, 13, 6, 2, PAL.dgray);                             // the badge, the power light
    px(g, 8, 2, 28, 6, PAL.ink); px(g, 9, 3, 26, 4, '#2a3a5a'); px(g, 10, 4, 10, 1, PAL.cyan); // a monitor behind it, one line of BASIC
  }),
  fruitComputer: S(44, 40, (g) => {
    bevelBox(g, 6, 2, 32, 24, '#d9cfb0', '#efe7cc', '#9a8f78');                               // the monitor
    px(g, 9, 5, 26, 16, PAL.ink); px(g, 10, 6, 24, 14, '#1a2a1a');
    px(g, 12, 8, 14, 1, PAL.green); px(g, 12, 11, 8, 1, PAL.green); px(g, 12, 14, 4, 2, PAL.green);   // green phosphor, a prompt
    bevelBox(g, 1, 27, 42, 11, '#d9cfb0', '#efe7cc', '#9a8f78');                              // the keyboard case
    for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) px(g, 5 + c * 3, 30 + r * 3, 2, 2, '#5a5448');
    px(g, 36, 30, 4, 4, PAL.red); px(g, 36, 31, 4, 1, PAL.orange); px(g, 36, 32, 4, 1, PAL.green); px(g, 36, 33, 4, 1, PAL.blue);   // the fruit badge, striped
  }),
  woodConsole: S(40, 20, (g) => {
    bevelBox(g, 1, 6, 38, 12, PAL.ink, PAL.slate, PAL.ink);
    grain(g, 3, 8, 34, 5, PAL.dwood, 3, 8); px(g, 3, 8, 34, 5, 'rgba(110,70,40,0.55)');       // fake wood, real dust
    for (let i = 0; i < 6; i++) px(g, 5 + i * 5, 14, 3, 2, PAL.lmetal);                        // six switches
    px(g, 15, 2, 10, 5, PAL.ink); px(g, 16, 3, 8, 3, '#3a3d4d'); px(g, 19, 3, 2, 1, PAL.red);   // the cartridge, in the slot
    px(g, 30, 2, 6, 4, PAL.ink); px(g, 31, 3, 4, 2, PAL.gray);                                 // a joystick base
  }),
  greyConsole: S(40, 20, (g) => {
    bevelBox(g, 1, 6, 38, 12, '#a8a8b0', '#d0d0d6', '#6a6a72');
    px(g, 3, 8, 24, 2, '#8a8a92'); px(g, 3, 12, 24, 1, '#8a8a92');                            // the lid grooves
    px(g, 28, 9, 8, 6, PAL.ink); px(g, 29, 10, 6, 4, '#3a3a44'); px(g, 30, 11, 2, 2, PAL.red);   // the door, the light
    px(g, 6, 3, 12, 4, PAL.ink); px(g, 7, 4, 10, 2, '#6a6a72'); px(g, 12, 4, 1, 2, PAL.red);   // a controller, the red buttons
    px(g, 20, 1, 8, 6, '#6a6a72'); px(g, 21, 2, 6, 4, PAL.gray);                               // a cartridge on top, blown into
  }),
  // ---- the rest of the shelf: eight more consoles, ten cartridges and discs, one shoebox ----
  masterConsole: S(40, 20, (g) => {
    bevelBox(g, 1, 6, 38, 12, '#1e1e24', '#3a3a44', PAL.ink);
    px(g, 3, 8, 34, 2, PAL.red);                                                                // the red stripe
    px(g, 6, 12, 12, 4, PAL.ink); px(g, 7, 13, 10, 2, '#3a3a44');                               // the cartridge slot
    px(g, 22, 12, 12, 3, PAL.ink); px(g, 23, 13, 10, 1, '#3a3a44');                             // the card slot
    px(g, 30, 3, 8, 4, PAL.ink); px(g, 31, 4, 6, 2, PAL.gray);                                  // a pad on top
  }),
  snesConsole: S(40, 20, (g) => {
    bevelBox(g, 1, 7, 38, 11, '#c8c8d0', '#e6e6ec', '#8a8a96');
    px(g, 4, 9, 14, 6, '#a8a8b4'); px(g, 5, 10, 12, 4, PAL.ink);                                 // the slot, a cartridge in it
    px(g, 6, 8, 10, 3, '#8a8a96');
    px(g, 24, 10, 5, 3, PAL.purple); px(g, 31, 10, 5, 3, '#6a6a76');                            // the purple slider, the grey one
    px(g, 24, 14, 12, 1, '#8a8a96');
    px(g, 26, 2, 12, 5, PAL.ink); px(g, 27, 3, 10, 3, '#c8c8d0'); px(g, 34, 4, 1, 1, PAL.purple); px(g, 32, 3, 1, 1, PAL.green);   // a pad, four colours, two shown
  }),
  genesisConsole: S(40, 20, (g) => {
    bevelBox(g, 1, 7, 38, 11, '#14141a', '#2e2e36', PAL.ink);
    disc(g, 20, 12, 5, '#2a2a32'); disc(g, 20, 12, 3, '#c9a24a'); px(g, 18, 11, 4, 1, PAL.ink);   // the round lid, the gold badge
    px(g, 4, 9, 8, 5, PAL.ink); px(g, 5, 10, 6, 3, '#2e2e36');                                  // the slot
    px(g, 30, 10, 6, 2, PAL.gray); px(g, 30, 13, 6, 1, PAL.red);                                // switch, power light
    px(g, 4, 2, 12, 5, PAL.ink); px(g, 5, 3, 10, 3, '#2e2e36'); px(g, 12, 4, 1, 1, PAL.red);    // a pad, three buttons, one drawn
  }),
  gameboyHandheld: S(24, 24, (g) => {
    bevelBox(g, 6, 1, 12, 22, '#b8b8b0', '#d8d8d0', '#7a7a72');
    px(g, 7, 3, 10, 8, '#5a5a62'); px(g, 8, 4, 8, 6, '#7a8a5a'); px(g, 9, 5, 4, 1, '#3a4a2a');   // the green screen, one line on it
    px(g, 8, 13, 3, 3, PAL.ink); px(g, 9, 12, 1, 5, PAL.ink);                                   // the cross
    disc(g, 14, 15, 1, '#8a2040'); disc(g, 16, 14, 1, '#8a2040');                              // A and B, red-ish
    px(g, 9, 19, 3, 1, PAL.gray); px(g, 13, 19, 3, 1, PAL.gray);                               // select, start
    px(g, 8, 1, 8, 1, '#7a7a72');                                                               // the cartridge, just showing
  }),
  gamegearHandheld: S(24, 24, (g) => {
    bevelBox(g, 1, 6, 22, 12, '#16161c', '#2e2e36', PAL.ink);
    px(g, 7, 8, 10, 8, PAL.ink); px(g, 8, 9, 8, 6, '#2a4a8a'); px(g, 9, 10, 3, 2, PAL.cyan);     // the wide screen, in colour
    px(g, 3, 10, 3, 3, '#3a3a44'); px(g, 4, 9, 1, 5, '#3a3a44');                                // the cross
    disc(g, 19, 11, 1, PAL.red); disc(g, 20, 13, 1, PAL.red);                                   // the buttons
    px(g, 10, 4, 4, 2, '#2e2e36');                                                              // the cartridge, on top
  }),
  n64Console: S(40, 20, (g) => {
    bevelBox(g, 1, 9, 38, 9, '#3a3a44', '#5a5a66', PAL.ink);
    px(g, 6, 8, 6, 2, '#2a2a32'); px(g, 28, 8, 6, 2, '#2a2a32');                                // the raised ends
    px(g, 14, 5, 12, 5, PAL.ink); px(g, 15, 6, 10, 3, '#5a5a66'); px(g, 17, 7, 6, 1, PAL.gray);  // a cartridge in the slot
    px(g, 8, 13, 4, 2, PAL.red); px(g, 28, 13, 4, 2, PAL.gray);                                 // power, reset
    px(g, 30, 1, 8, 5, PAL.ink); px(g, 31, 2, 6, 3, '#5a5a66'); px(g, 34, 3, 1, 1, PAL.yellow); px(g, 32, 4, 1, 1, PAL.green);   // a three-pronged pad, roughly
  }),
  psxConsole: S(40, 20, (g) => {
    bevelBox(g, 1, 7, 38, 11, '#b8b8c0', '#dcdce2', '#7a7a86');
    disc(g, 24, 12, 6, '#a4a4ae'); disc(g, 24, 12, 4, '#b8b8c0'); disc(g, 24, 12, 1, PAL.ink);   // the round lid
    px(g, 5, 9, 6, 3, PAL.gray); px(g, 5, 14, 6, 2, PAL.gray);                                  // power, open
    px(g, 12, 9, 2, 2, PAL.green);
    px(g, 3, 1, 12, 6, PAL.ink); px(g, 4, 2, 10, 4, '#b8b8c0'); px(g, 11, 3, 1, 1, PAL.green); px(g, 12, 4, 1, 1, PAL.red); px(g, 10, 4, 1, 1, PAL.pink); px(g, 11, 5, 1, 1, PAL.blue);   // a pad, four shapes
  }),
  dreamConsole: S(40, 20, (g) => {
    bevelBox(g, 1, 7, 38, 11, '#e8e4dc', '#f8f6f0', '#a8a49c');
    disc(g, 20, 12, 6, '#d8d4cc'); disc(g, 20, 12, 4, '#e8e4dc');                              // the round lid
    px(g, 19, 10, 2, 1, PAL.orange); px(g, 21, 11, 1, 2, PAL.orange); px(g, 19, 13, 2, 1, PAL.orange); px(g, 18, 11, 1, 2, PAL.orange);   // the swirl, as far as four pixels go
    px(g, 4, 9, 5, 2, PAL.gray); px(g, 4, 13, 5, 2, PAL.gray);
    px(g, 30, 2, 8, 5, PAL.ink); px(g, 31, 3, 6, 3, '#e8e4dc'); px(g, 33, 4, 2, 1, '#2a4a8a');   // a pad with a tiny screen in it
  }),
  cartAtari: S(24, 24, (g) => {
    px(g, 7, 2, 10, 20, PAL.ink); px(g, 8, 3, 8, 18, '#1e1e24');
    px(g, 9, 4, 6, 9, '#c8a24a'); px(g, 10, 5, 4, 3, '#8a2040'); px(g, 10, 9, 4, 2, PAL.ink);   // a painted label, a title
    px(g, 8, 15, 8, 3, '#3a2a1e'); grain(g, 8, 15, 8, 3, '#5a4a2e', 2, 3);                     // the woodgrain stripe
    px(g, 6, 20, 12, 2, '#3a3a44');                                                             // the ridged grip
  }),
  cartMaster: S(24, 24, (g) => {
    px(g, 6, 3, 12, 18, PAL.ink); px(g, 7, 4, 10, 16, '#16161c');
    px(g, 8, 5, 8, 10, PAL.white); px(g, 9, 6, 6, 6, '#2a4a8a'); px(g, 9, 13, 6, 1, PAL.red);   // the white label, a grid picture, the stripe
    px(g, 7, 17, 10, 2, '#2e2e36');
  }),
  cartNes: S(24, 24, (g) => {
    px(g, 4, 4, 16, 16, PAL.ink); px(g, 5, 5, 14, 14, '#8a8a92');
    for (let i = 0; i < 4; i++) px(g, 5, 6 + i * 3, 3, 1, '#6a6a72');                          // the ridges
    px(g, 9, 6, 9, 10, PAL.ink); px(g, 10, 7, 7, 8, '#1e1e24'); px(g, 11, 8, 5, 4, '#2a4a8a'); px(g, 11, 13, 5, 1, PAL.white);   // the black label, a pixel picture
    px(g, 5, 17, 14, 2, '#6a6a72');
  }),
  cartSnes: S(24, 24, (g) => {
    px(g, 5, 4, 14, 16, PAL.ink); px(g, 6, 5, 12, 14, '#a8a8b4');
    px(g, 6, 5, 12, 2, '#c8c8d0'); px(g, 7, 4, 10, 1, '#c8c8d0');                               // the rounded top
    px(g, 8, 8, 8, 8, PAL.ink); px(g, 9, 9, 6, 6, '#8a2040'); px(g, 10, 10, 4, 2, PAL.yellow);   // the label, airbrushed
    px(g, 6, 17, 12, 2, '#8a8a96');
  }),
  cartGenesis: S(24, 24, (g) => {
    px(g, 5, 4, 14, 16, PAL.ink); px(g, 6, 5, 12, 14, '#16161c');
    px(g, 8, 6, 8, 9, PAL.ink); px(g, 9, 7, 6, 7, '#2a2a32'); px(g, 9, 7, 6, 2, PAL.red); px(g, 10, 10, 4, 3, '#2a4a8a');   // the black label, a grid, red band
    px(g, 6, 16, 12, 3, '#2e2e36'); px(g, 10, 17, 4, 1, '#c9a24a');                            // the gold line
  }),
  cartGameboy: S(24, 24, (g) => {
    px(g, 7, 6, 10, 12, PAL.ink); px(g, 8, 7, 8, 10, '#8a8a82');
    px(g, 9, 8, 6, 6, '#e8e0cc'); px(g, 10, 9, 4, 3, '#5a5a62'); px(g, 10, 13, 4, 1, PAL.red);   // the small label
    px(g, 8, 15, 8, 1, '#6a6a62'); px(g, 9, 6, 6, 1, '#6a6a62');                                // the notch
  }),
  cartGamegear: S(24, 24, (g) => {
    px(g, 7, 6, 10, 12, PAL.ink); px(g, 8, 7, 8, 10, '#16161c');
    px(g, 9, 8, 6, 6, '#2a4a8a'); px(g, 10, 9, 4, 3, PAL.cyan); px(g, 10, 13, 4, 1, PAL.white);   // the blue label
    px(g, 8, 15, 8, 1, '#2e2e36');
  }),
  cartN64: S(24, 24, (g) => {
    px(g, 5, 5, 14, 14, PAL.ink); px(g, 6, 6, 12, 12, '#3a3a44');
    px(g, 6, 6, 12, 2, '#5a5a66');
    px(g, 8, 8, 8, 8, PAL.ink); px(g, 9, 9, 6, 6, '#2a2a32'); px(g, 10, 10, 4, 4, PAL.yellow); px(g, 11, 11, 2, 2, PAL.red);   // the label, chunky
    px(g, 7, 17, 10, 1, '#5a5a66');
  }),
  discPsx: S(24, 24, (g) => {
    px(g, 4, 3, 16, 18, PAL.ink); px(g, 5, 4, 14, 16, '#e8e4dc');                              // the jewel case
    px(g, 5, 4, 3, 16, '#16161c');                                                               // the black spine
    disc(g, 13, 12, 6, '#d0d0d8'); disc(g, 13, 12, 5, '#a8a8b4'); disc(g, 13, 12, 2, '#e8e4dc'); disc(g, 13, 12, 1, PAL.ink);   // the disc, silver
    px(g, 9, 6, 8, 2, '#8a2040');                                                                // a title band
  }),
  discDream: S(24, 24, (g) => {
    px(g, 4, 3, 16, 18, PAL.ink); px(g, 5, 4, 14, 16, '#f4f2ec');                              // the white case
    disc(g, 12, 12, 6, '#d0d0d8'); disc(g, 12, 12, 5, '#b8c4d8'); disc(g, 12, 12, 2, '#f4f2ec'); disc(g, 12, 12, 1, PAL.ink);   // the disc, bluish
    px(g, 6, 5, 4, 1, PAL.orange); px(g, 9, 6, 1, 1, PAL.orange); px(g, 6, 7, 3, 1, PAL.orange);   // the swirl
    px(g, 7, 18, 10, 1, '#a8a49c');
  }),
  cartBox: S(40, 24, (g, C) => {
    px(g, 2, 8, 36, 14, PAL.ink); px(g, 3, 9, 34, 12, C.a);                                     // the shoebox
    px(g, 3, 9, 34, 2, C.c); px(g, 3, 19, 34, 2, C.b);
    for (let i = 0; i < 5; i++) { px(g, 6 + i * 6, 3, 5, 8, PAL.ink); px(g, 7 + i * 6, 4, 3, 6, i % 2 ? '#8a8a92' : '#2a2a32'); px(g, 7 + i * 6, 5, 3, 2, i % 3 === 0 ? PAL.red : (i % 3 === 1 ? '#2a4a8a' : PAL.yellow)); }   // cartridges standing up, labels out
    px(g, 6, 13, 12, 3, C.d); px(g, 7, 14, 10, 1, C.c);                                          // a label on the box, unreadable
  }),
  pinball: S(48, 88, (g, C) => {
    px(g, 6, 2, 36, 30, PAL.ink); bevelBox(g, 7, 3, 34, 28, C.a, C.c, C.b);                  // the backglass
    px(g, 10, 6, 28, 18, '#1a1626'); px(g, 12, 8, 24, 3, PAL.yellow); px(g, 12, 13, 14, 2, PAL.pink); px(g, 12, 17, 20, 2, PAL.cyan);   // the art
    px(g, 12, 22, 24, 3, PAL.ink); px(g, 13, 23, 22, 1, PAL.red);                             // the score, three initials, one scratched
    px(g, 20, 23, 2, 1, PAL.dgray);
    for (let i = 0; i < 14; i++) px(g, 3 + i * 3, 32, 2, 2, i % 2 ? PAL.yellow : PAL.orange); // the bulbs along the top of the box
    px(g, 2, 34, 44, 36, PAL.ink); bevelBox(g, 3, 35, 42, 34, C.a, C.c, C.b);                 // the cabinet, sloped
    px(g, 6, 38, 36, 28, '#2a2a3a'); px(g, 7, 39, 34, 26, '#e8e0cc');                          // the playfield glass
    disc(g, 14, 46, 3, PAL.red); disc(g, 26, 44, 3, PAL.red); disc(g, 34, 52, 3, PAL.red);    // bumpers
    px(g, 12, 60, 8, 2, PAL.blue); px(g, 28, 60, 8, 2, PAL.blue);                               // flippers
    disc(g, 22, 56, 1, PAL.lmetal);                                                             // the ball, mid-air, forever
    px(g, 44, 50, 3, 6, PAL.ink); px(g, 45, 51, 1, 4, PAL.red);                                // the plunger
    px(g, 4, 70, 4, 16, PAL.ink); px(g, 40, 70, 4, 16, PAL.ink); px(g, 5, 71, 2, 14, PAL.slate); px(g, 41, 71, 2, 14, PAL.slate);   // legs
    px(g, 8, 70, 32, 3, '#2a2a3a');
  }),
  moviePoster: S(24, 24, (g) => {
    px(g, 5, 2, 14, 20, PAL.ink); px(g, 6, 3, 12, 18, PAL.paper);
    px(g, 6, 3, 12, 2, PAL.dpaper); px(g, 6, 19, 12, 2, PAL.dpaper);
    px(g, 8, 6, 8, 9, '#2a3a5a'); px(g, 9, 7, 6, 3, PAL.orange); px(g, 10, 11, 4, 3, PAL.yellow);   // a big sky, a bigger title
    px(g, 7, 16, 10, 1, PAL.dgray); px(g, 8, 17, 8, 1, PAL.dgray);                           // the credits block nobody reads
    px(g, 3, 4, 3, 3, PAL.red); px(g, 18, 15, 3, 3, PAL.red);                                 // rental stickers
  }),
  // Deposits himself, sitting in the back row like he pays rent. He does not pay rent.
  liveRaccoon: S(36, 24, (g) => {
    const fur = '#6f6d76', dark = '#2a2730', light = '#d8d5de';
    for (let i = 0; i < 6; i++) px(g, 2 + i * 3, 12 - (i > 3 ? 2 : 0), 3, 4, i % 2 ? dark : fur);   // the tail, striped
    px(g, 12, 8, 16, 11, fur);                                          // body
    px(g, 24, 4, 10, 8, fur);                                           // head
    px(g, 24, 2, 3, 3, fur); px(g, 31, 2, 3, 3, fur);                   // ears
    px(g, 25, 6, 9, 3, dark);                                           // the mask
    px(g, 26, 7, 2, 1, light); px(g, 31, 7, 2, 1, light);               // eyes. on you.
    px(g, 33, 9, 2, 2, dark);                                           // nose
    px(g, 14, 19, 3, 2, dark); px(g, 23, 19, 3, 2, dark);               // feet
    px(g, 10, 21, 24, 2, 'rgba(0,0,0,0.25)');
  }),
  tinyVest: S(24, 24, (g) => {
    // raccoon-sized. neatly folded. deeply incriminating.
    px(g, 5, 6, 14, 13, PAL.ink);
    px(g, 6, 7, 12, 11, PAL.red);
    px(g, 6, 7, 12, 2, PAL.lred);
    px(g, 11, 7, 2, 11, PAL.ink);                                     // opening
    px(g, 8, 10, 2, 2, PAL.gold); px(g, 14, 10, 2, 2, PAL.gold);     // brass buttons
    px(g, 8, 14, 2, 2, PAL.gold); px(g, 14, 14, 2, 2, PAL.gold);
    px(g, 5, 4, 5, 3, PAL.ink); px(g, 14, 4, 5, 3, PAL.ink);         // little shoulders
    px(g, 6, 5, 3, 2, PAL.red); px(g, 15, 5, 3, 2, PAL.red);
    px(g, 4, 19, 16, 2, 'rgba(0,0,0,0.25)');
  }),

  toolFlashlight: S(24, 24, (g) => {
    px(g, 2, 9, 8, 7, PAL.ink); px(g, 3, 10, 6, 5, PAL.yellow);       // head
    px(g, 9, 10, 12, 5, PAL.ink); px(g, 10, 11, 10, 3, PAL.red);      // body
    px(g, 10, 11, 10, 1, PAL.lred);
    px(g, 13, 10, 2, 1, PAL.ink); px(g, 13, 9, 2, 2, PAL.gray);      // switch
    px(g, 0, 7, 2, 2, PAL.ggold); px(g, 0, 13, 2, 2, PAL.ggold);     // beam hint
    px(g, 1, 10, 1, 3, PAL.ggold);
  }),
  toolMirror: S(24, 24, (g) => {
    disc(g, 9, 8, 7, PAL.ink);
    disc(g, 9, 8, 6, PAL.gray);
    disc(g, 9, 8, 4, PAL.lmetal);
    px(g, 6, 5, 3, 2, '#ffffff');                                     // glint
    pline(g, 13, 13, 20, 20, 2, PAL.ink);                             // telescoping arm
    pline(g, 14, 13, 19, 18, 1, PAL.gray);
    px(g, 19, 19, 4, 4, PAL.ink); px(g, 20, 20, 2, 2, PAL.red);       // grip
  }),
  toolLoupe: S(24, 24, (g) => {
    disc(g, 10, 10, 8, PAL.ink);
    disc(g, 10, 10, 7, PAL.gold);
    disc(g, 10, 10, 5, '#bfe8f2');
    px(g, 7, 7, 2, 2, '#ffffff');
    pline(g, 16, 16, 21, 21, 3, PAL.ink);
    pline(g, 17, 17, 20, 20, 1, PAL.dwood);
  }),
  toolDetector: S(24, 24, (g) => {
    pline(g, 16, 2, 8, 16, 2, PAL.ink);
    pline(g, 16, 3, 9, 15, 1, PAL.gray);                              // shaft
    px(g, 15, 0, 6, 4, PAL.ink); px(g, 16, 1, 4, 2, PAL.red);         // grip
    px(g, 2, 17, 14, 5, PAL.ink);                                     // coil plate
    px(g, 3, 18, 12, 3, PAL.dgreen);
    ring(g, 9, 19, 3, PAL.green);
    px(g, 18, 6, 3, 3, PAL.ink); px(g, 19, 7, 1, 1, PAL.green);       // meter blip
  }),
  toolCatalog: S(24, 24, (g) => {
    px(g, 3, 3, 18, 18, PAL.ink);
    px(g, 4, 4, 16, 16, PAL.dred);
    px(g, 4, 4, 3, 16, PAL.red);                                      // spine
    px(g, 9, 7, 9, 2, PAL.ggold); px(g, 9, 11, 7, 1, PAL.dpaper);    // title
    px(g, 9, 14, 8, 1, PAL.dpaper);
    px(g, 18, 4, 2, 5, PAL.paper);                                    // dog-ear bookmark
    px(g, 4, 19, 16, 1, PAL.paper);                                   // page edge
  }),
  toolNotes: S(24, 24, (g) => {
    px(g, 4, 2, 15, 20, PAL.ink);
    px(g, 5, 3, 13, 18, PAL.paper);
    px(g, 5, 3, 13, 2, PAL.dpaper);                                   // worn top
    for (let i = 0; i < 6; i++) px(g, 7, 7 + i * 2, 9 - (i % 3), 1, PAL.dgray);
    px(g, 12, 15, 4, 3, PAL.dgray);                                   // a little wardrobe doodle
    px(g, 13, 16, 1, 1, PAL.paper);
    px(g, 5, 19, 13, 2, 'rgba(120,110,88,0.5)');                      // coffee ring corner
  }),
  toolHand: S(24, 24, (g) => {                                        // a work glove: the hired hand
    for (let i = 0; i < 4; i++) { px(g, 7 + i * 3, 2, 3, 8, PAL.ink); px(g, 8 + i * 3, 3, 1, 6, PAL.dwood); }   // four fingers
    px(g, 6, 8, 13, 12, PAL.ink);
    px(g, 7, 9, 11, 10, PAL.dwood);                                   // the palm, leather
    px(g, 2, 10, 5, 6, PAL.ink); px(g, 3, 11, 3, 4, PAL.dwood);      // thumb
    px(g, 9, 12, 7, 1, PAL.ink);                                      // the crease
    px(g, 7, 19, 11, 3, PAL.ink); px(g, 8, 20, 9, 1, PAL.red);       // the cuff stripe
  }),

  // ================= MEDIA SHELF =================
  dvdStack: S(32, 30, (g, C, r) => {
    r = r || RNG(7);
    const cols = ['#3a3050', '#203a4a', '#4a2030', '#2a3a2a', '#3a2a20', PAL.slate];
    let y = 26;
    const n = r.i(4, 6);
    for (let i = 0; i < n; i++) {
      const w = r.i(22, 27), x = r.i(2, 30 - w);
      px(g, x, y - 3, w, 4, PAL.ink);
      px(g, x + 1, y - 2, w - 2, 2, r.pick(cols));
      if (r.chance(0.7)) px(g, x + r.i(3, 8), y - 2, r.i(6, 10), 1, PAL.gray);   // spine title
      y -= 4;
    }
    px(g, 4, 27, 24, 2, 'rgba(0,0,0,0.3)');
  }),
  comicBox: S(34, 22, (g, C, r) => {
    r = r || RNG(7);
    px(g, 1, 5, 32, 16, PAL.ink); px(g, 2, 6, 30, 14, PAL.paper);      // the long box
    px(g, 2, 6, 30, 2, PAL.dpaper);                                    // lid crease
    px(g, 2, 18, 30, 2, PAL.dpaper);
    const cols = [PAL.red, PAL.blue, PAL.green, PAL.yellow, PAL.purple, PAL.orange];
    for (let i = 0; i < 9; i++) {                                      // bagged spines, leaning
      const sx = 4 + i * 3;
      px(g, sx, 8 + (i % 2), 2, 9 - (i % 2), r.pick(cols));
      if (r.chance(0.4)) px(g, sx, 9, 2, 1, PAL.white);
    }
    px(g, 3, 20, 28, 1, 'rgba(0,0,0,0.3)');
  }),
  blurayBox: S(44, 30, (g, C, r) => {
    r = r || RNG(7);
    px(g, 1, 10, 42, 19, PAL.ink); px(g, 2, 11, 40, 17, PAL.lwood); px(g, 2, 11, 40, 2, PAL.wood);
    const blues = ['#1d4a7a', '#2a5a9a', '#173a5a', '#2a4a8a'];
    for (let i = 0; i < 5; i++) {
      const lean2 = r.chance(0.3) ? 1 : 0;
      px(g, 4 + i * 8, 3 + lean2, 7, 20 - lean2, PAL.ink);
      px(g, 5 + i * 8, 4 + lean2, 5, 18 - lean2, r.pick(blues));
      px(g, 5 + i * 8, 4 + lean2, 5, 2, '#4a8ad0');                  // the blue bar
      if (r.chance(0.6)) px(g, 5 + i * 8, r.i(9, 16), 5, 3, PAL.white);
    }
    px(g, 2, 26, 40, 2, PAL.dwood);
  }),
  cassettes: S(36, 26, (g, C, r) => {
    r = r || RNG(7);
    px(g, 1, 8, 34, 17, PAL.ink);                                     // shoebox
    px(g, 2, 9, 32, 15, '#b3a37d'); px(g, 2, 9, 32, 3, '#c9b98f');
    const tapeCols = [PAL.slate, '#20222e', PAL.dred, '#3a3050'];
    for (let i = 0; i < 4; i++) {
      const x = 4 + i * 8, tilt = r.i(0, 2);
      px(g, x, 3 + tilt, 7, 9, PAL.ink);
      px(g, x + 1, 4 + tilt, 5, 7, r.pick(tapeCols));
      px(g, x + 1, 5 + tilt, 5, 2, r.chance(0.5) ? PAL.paper : '#e8d090');   // label
      px(g, x + 2, 8 + tilt, 1, 1, PAL.gray); px(g, x + 4, 8 + tilt, 1, 1, PAL.gray);  // hubs
    }
    px(g, 4, 20, r.i(8, 14), 3, PAL.dpaper);                          // SALE sticker
  }),
  edisonDiscs: S(44, 34, (g, C, r) => {
    r = r || RNG(7);
    bevelBox(g, 1, 8, 42, 25, PAL.wood, PAL.lwood, PAL.dwood);
    px(g, 2, 9, 40, 2, PAL.ink);
    for (let i = 0; i < 6; i++) {                                      // thick discs on edge
      const x = 5 + i * 6;
      px(g, x, 2 + (i % 2), 4, 26, PAL.ink);
      px(g, x + 1, 3 + (i % 2), 2, 24, i === 2 && r.chance(0.6) ? '#3a2a1a' : '#14151d');
    }
    px(g, 30, 12, 11, 14, PAL.dpaper);                                 // one in its sleeve
    disc(g, 35, 19, 4, '#8a7a58'); disc(g, 35, 19, 1, PAL.ink);
    px(g, 4, 28, 20, 2, 'rgba(0,0,0,0.25)');
  }),

  // ================= THE MEAN SHELF =================
  guillotine: S(48, 66, (g, C, r) => {
    r = r || RNG(7);
    px(g, 4, 60, 40, 6, PAL.ink); px(g, 5, 61, 38, 4, PAL.dwood);     // base
    px(g, 8, 2, 5, 59, PAL.ink); px(g, 9, 3, 3, 57, PAL.wood);        // posts
    px(g, 35, 2, 5, 59, PAL.ink); px(g, 36, 3, 3, 57, PAL.wood);
    px(g, 8, 0, 32, 5, PAL.ink); px(g, 9, 1, 30, 3, PAL.dwood);       // crossbar
    const bladeY = r.i(10, 22);
    px(g, 13, bladeY, 22, 3, PAL.ink);                                 // blade mount
    for (let i = 0; i < 11; i++) px(g, 13 + i * 2, bladeY + 3, 2, 4 - (i % 2), PAL.lmetal);  // angled edge
    px(g, 13, bladeY, 22, 2, PAL.gray);
    pline(g, 23, 2, 23, bladeY, 1, '#8a7a58');                         // rope
    px(g, 12, 44, 24, 4, PAL.ink); px(g, 13, 45, 22, 2, PAL.wood);    // neck stock
    disc(g, 24, 46, 3, PAL.ink);
    px(g, 40, 8, 4, 3, PAL.dred);                                      // old paint? we hope
  }),
  bearTrap: S(40, 22, (g, C, r) => {
    r = r || RNG(7);
    px(g, 6, 16, 28, 4, PAL.ink); px(g, 7, 17, 26, 2, PAL.dgray);     // base plate
    disc(g, 20, 16, 3, PAL.gray);                                      // trigger pan
    for (const s of [-1, 1]) {                                         // open jaws
      for (let i = 0; i < 7; i++) {
        const x = 20 + s * (3 + i * 2);
        px(g, x, 12 - i, 2, 4 + (i % 2), PAL.gray);
        px(g, x, 8 - i, 1, 3, PAL.lmetal);                             // teeth
      }
    }
    pline(g, 6, 18, 1, 21, 1, PAL.dgray);                              // chain
    disc(g, 2, 20, 1, PAL.gray); disc(g, 4, 19, 1, PAL.gray);
    if (r.chance(0.4)) px(g, r.i(10, 26), 14, 3, 1, PAL.dred);         // don't ask
  }),
  cagedBones: S(40, 42, (g, C, r) => {
    r = r || RNG(7);
    px(g, 6, 2, 28, 4, PAL.ink); px(g, 18, 0, 4, 4, PAL.ink);         // cage top + ring
    px(g, 4, 36, 32, 5, PAL.ink); px(g, 5, 37, 30, 3, PAL.dwood);     // base
    for (let i = 0; i < 6; i++) px(g, 7 + i * 5, 5, 2, 32, PAL.dgray); // bars (behind bones)
    const bx2 = r.i(12, 18);
    disc(g, bx2, 26, 4, '#d8d2c0'); disc(g, bx2, 26, 1, PAL.ink);     // wee skull + socket
    px(g, bx2 - 1, 29, 5, 2, '#d8d2c0');                               // jaw
    px(g, bx2 + 4, 24, 8, 2, '#c8c2b0');                               // spine
    for (let i = 0; i < 3; i++) px(g, bx2 + 5 + i * 2, 26, 1, 4, '#c8c2b0');   // ribs
    pline(g, bx2 + 11, 25, bx2 + 14, 30, 1, '#c8c2b0');                // tail
    px(g, bx2 - 2, 33, 3, 1, '#c8c2b0'); px(g, bx2 + 4, 33, 3, 1, '#c8c2b0');  // paws, at rest
    for (let i = 0; i < 6; i++) px(g, 7 + i * 5, 5, 1, 32, PAL.gray);  // bar highlights (in front)
    if (r.chance(0.5)) { px(g, 26, 10, 6, 4, PAL.dpaper); }            // faded tag: name unknown
  }),
  skullMount: S(44, 28, (g, C, r) => {
    r = r || RNG(7);
    px(g, 16, 20, 12, 7, PAL.ink); px(g, 17, 21, 10, 5, '#d8d2c0');   // snout
    disc(g, 22, 14, 7, PAL.ink); disc(g, 22, 14, 6, '#e4dece');       // cranium
    disc(g, 19, 13, 2, PAL.ink); disc(g, 25, 13, 2, PAL.ink);         // sockets
    px(g, 20, 23, 1, 2, PAL.ink); px(g, 23, 23, 1, 2, PAL.ink);      // nasal slits
    for (const s of [-1, 1]) {                                         // the horns
      pline(g, 22 + s * 6, 12, 22 + s * 15, 6, 2, '#c8bfa4');
      pline(g, 22 + s * 15, 6, 22 + s * 19, 2 + r.i(0, 3), 2, '#b3a37d');
      px(g, 22 + s * 19 - 1, 2, 2, 2, '#8a7a58');                      // dark tips
    }
    if (r.chance(0.4)) px(g, 18, 17, 8, 1, 'rgba(90,74,43,0.5)');      // crack
  }),
  jarSpecimen: S(24, 24, (g, C, r) => {
    r = r || RNG(7);
    px(g, 6, 2, 12, 3, PAL.ink); px(g, 7, 3, 10, 1, '#8a7a58');       // rusty lid
    px(g, 5, 5, 14, 17, PAL.ink);
    px(g, 6, 6, 12, 15, '#2e4234');                                    // murk
    px(g, 6, 6, 12, 3, '#3a5240');
    const ex = r.i(9, 13);
    disc(g, ex, r.i(11, 15), 2, '#d8d2c0'); disc(g, ex, 13, 1, PAL.ink);   // ...an eye?
    pline(g, ex - 3, 17, ex + 3, 18, 1, '#4a6250');                    // a shape best left vague
    px(g, 7, 7, 2, 12, 'rgba(255,255,255,0.14)');                      // glass shine
    px(g, 6, 22, 12, 1, 'rgba(0,0,0,0.3)');
  }),

  // ================= WEAPONS (smalls) =================
  sword: S(24, 24, (g) => {
    pline(g, 4, 20, 17, 7, 2, PAL.lmetal);                             // blade
    pline(g, 5, 21, 18, 8, 1, PAL.gray);
    px(g, 16, 9, 5, 5, PAL.ink); px(g, 17, 10, 3, 3, PAL.gold);       // guard
    pline(g, 19, 5, 21, 3, 2, PAL.dwood);                              // grip
    disc(g, 22, 2, 1, PAL.gold);                                       // pommel
    sparkle(g, 7, 17, '#ffffff');
  }),
  machete: S(24, 24, (g) => {
    pline(g, 3, 19, 15, 7, 3, PAL.gray);                               // broad blade
    pline(g, 4, 18, 15, 7, 1, PAL.lmetal);
    px(g, 3, 20, 4, 2, PAL.gray);                                      // squared tip
    pline(g, 16, 8, 20, 4, 3, PAL.ink);
    pline(g, 17, 8, 20, 5, 1, PAL.dwood);                              // handle
    px(g, 15, 6, 2, 2, PAL.dgray);                                     // rivet
  }),
  crossbow: S(24, 24, (g) => {
    pline(g, 12, 4, 12, 20, 3, PAL.dwood);                             // stock
    pline(g, 4, 8, 20, 8, 2, PAL.ink);                                 // bow arms
    pline(g, 4, 8, 4, 12, 1, PAL.gray); pline(g, 20, 8, 20, 12, 1, PAL.gray);
    pline(g, 4, 12, 20, 12, 1, '#c8c2b0');                             // string
    px(g, 11, 2, 3, 4, PAL.lmetal);                                    // bolt tip
    px(g, 10, 16, 5, 3, PAL.wood);                                     // grip
  }),
  shotgun: S(24, 24, (g) => {
    pline(g, 3, 8, 15, 8, 2, PAL.dgray);                               // barrels
    pline(g, 3, 10, 15, 10, 2, PAL.gray);
    px(g, 2, 8, 2, 4, PAL.ink);                                        // muzzle
    px(g, 14, 7, 4, 6, PAL.ink); px(g, 15, 8, 2, 4, PAL.dwood);       // breech
    pline(g, 17, 10, 21, 16, 3, PAL.ink);
    pline(g, 18, 10, 21, 15, 1, PAL.wood);                             // stock
    px(g, 15, 13, 2, 3, PAL.dgray);                                    // trigger guard
  }),
  derringer: S(24, 24, (g) => {
    px(g, 5, 9, 10, 3, PAL.ink); px(g, 6, 10, 8, 1, PAL.lmetal);      // stubby barrel
    px(g, 13, 8, 5, 6, PAL.ink); px(g, 14, 9, 3, 4, PAL.gray);        // frame
    pline(g, 16, 13, 18, 17, 3, PAL.ink);
    px(g, 16, 14, 2, 3, '#8a5a34');                                    // bird's-head grip
    px(g, 13, 13, 2, 2, PAL.gray);                                     // trigger
    px(g, 5, 8, 2, 1, PAL.white);                                      // sight glint
  }),

  // ================= JEWELS =================
  brooch: S(24, 24, (g) => {
    disc(g, 12, 12, 7, PAL.ink);
    disc(g, 12, 12, 6, PAL.lmetal);
    ring(g, 12, 12, 5, PAL.gray);
    disc(g, 12, 12, 3, PAL.purple);                                    // amethyst
    px(g, 11, 10, 2, 2, '#c88ad0');
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2;
      px(g, 12 + Math.round(Math.cos(t) * 7), 12 + Math.round(Math.sin(t) * 7), 1, 1, PAL.lmetal);  // filigree
    }
    sparkle(g, 16, 8, '#ffffff');
  }),
  pearls: S(24, 24, (g) => {
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2;
      const px2 = 12 + Math.round(Math.cos(t) * 7), py2 = 13 + Math.round(Math.sin(t) * 6);
      disc(g, px2, py2, 2, PAL.ink);
      disc(g, px2, py2, 1, '#f0ead8');
      if (a % 3 === 0) px(g, px2 - 1, py2 - 1, 1, 1, '#ffffff');
    }
    px(g, 11, 4, 3, 3, PAL.gold);                                      // clasp
  }),
  tiara: S(24, 24, (g) => {
    for (let x = 3; x < 21; x++) {
      const arc = Math.round(Math.sqrt(Math.max(0, 81 - (x - 12) * (x - 12))) * 0.55);
      px(g, x, 19 - arc, 1, 2, PAL.lmetal);                            // band
    }
    for (const [sx2, h] of [[6, 4], [12, 7], [18, 4]]) {
      px(g, sx2 - 1, 12 - h, 2, h, PAL.lmetal);                        // points
      disc(g, sx2, 11 - h, 1, sx2 === 12 ? PAL.cyan : PAL.pink);       // stones
    }
    sparkle(g, 12, 3, '#ffffff');
    px(g, 3, 20, 18, 1, 'rgba(0,0,0,0.25)');
  }),
  pocketWatch: S(24, 24, (g) => {
    pline(g, 16, 2, 20, 6, 1, PAL.gold);                               // chain
    disc(g, 18, 3, 1, PAL.dgold);
    px(g, 10, 4, 4, 3, PAL.dgold);                                     // crown
    disc(g, 12, 13, 8, PAL.ink);
    disc(g, 12, 13, 7, PAL.gold);
    disc(g, 12, 13, 5, '#f4eed8');                                     // face
    pline(g, 12, 13, 12, 9, 1, PAL.ink); pline(g, 12, 13, 15, 13, 1, PAL.ink);  // hands
    ring(g, 12, 13, 6, PAL.dgold);
    px(g, 8, 8, 2, 1, '#ffffff');
  }),

  // ================= PROPS FROM PICTURES =================
  rubySlippers: S(24, 24, (g, C, r) => {
    r = r || RNG(7);
    for (const [ox, oy] of [[2, 2], [11, 0]]) {
      px(g, ox + 2, oy + 12, 9, 5, PAL.ink);                           // shoe body
      px(g, ox + 3, oy + 13, 7, 3, PAL.red);
      px(g, ox + 1, oy + 15, 4, 3, PAL.ink); px(g, ox + 2, oy + 16, 2, 1, PAL.dred);  // toe
      px(g, ox + 9, oy + 17, 2, 4, PAL.ink); px(g, ox + 9, oy + 17, 1, 3, PAL.dred);  // heel
      disc(g, ox + 4, oy + 12, 1, PAL.lred);                           // bow
      for (let i = 0; i < 4; i++) px(g, ox + 3 + r.i(0, 6), oy + 13 + r.i(0, 2), 1, 1, '#ff9aa8');  // sequins
    }
    sparkle(g, 7, 8, '#ffffff'); sparkle(g, 18, 5, '#ffc4d0');
  }),
  hockeyMask: S(24, 24, (g) => {
    disc(g, 12, 12, 9, PAL.ink);
    disc(g, 12, 12, 8, '#e8e4d8');
    disc(g, 9, 9, 2, PAL.ink); disc(g, 15, 9, 2, PAL.ink);            // eye holes
    px(g, 11, 13, 2, 2, PAL.ink);                                      // nose
    for (let i = 0; i < 3; i++) { px(g, 8 + i * 4, 16, 1, 2, PAL.ink); px(g, 8 + i * 4, 19, 1, 1, PAL.ink); }  // vents
    pline(g, 7, 5, 10, 7, 1, PAL.dred); pline(g, 17, 6, 14, 8, 1, PAL.dred);  // the red marks
    pline(g, 12, 3, 12, 5, 1, PAL.dred);
    px(g, 4, 11, 2, 1, PAL.gray); px(g, 18, 11, 2, 1, PAL.gray);      // strap studs
  }),
  propHilt: S(24, 24, (g) => {
    pline(g, 8, 18, 15, 6, 4, PAL.ink);                                // hilt body
    pline(g, 9, 17, 15, 7, 2, PAL.lmetal);
    px(g, 8, 17, 3, 3, PAL.dgray);                                     // pommel
    px(g, 13, 8, 3, 2, PAL.red);                                       // the button
    px(g, 15, 5, 3, 3, PAL.gray);                                      // emitter
    px(g, 16, 3, 1, 2, '#bff5ff');                                     // a whisper of glow
    px(g, 11, 13, 2, 1, PAL.ink); px(g, 12, 11, 2, 1, PAL.ink);       // grip ridges
  }),
  fluxGadget: S(24, 24, (g, C, r) => {
    r = r || RNG(7);
    px(g, 4, 5, 16, 15, PAL.ink);
    px(g, 5, 6, 14, 13, PAL.slate);
    px(g, 5, 6, 14, 2, PAL.dgray);
    // three lit tubes in a Y that no one can explain
    pline(g, 12, 16, 12, 12, 1, PAL.yellow);
    pline(g, 12, 12, 9, 8, 1, PAL.yellow);
    pline(g, 12, 12, 15, 8, 1, PAL.yellow);
    disc(g, 9, 8, 1, '#fff3b0'); disc(g, 15, 8, 1, '#fff3b0'); disc(g, 12, 16, 1, '#fff3b0');
    px(g, 6, 17, r.i(2, 4), 1, PAL.red);                               // warning tape
    px(g, 16, 7, 2, 1, PAL.green);                                     // a light that means something
  }),

  // ================= the map =================
  goonMap: S(24, 24, (g, C, r) => {
    r = r || RNG(7);
    px(g, 2, 4, 20, 16, PAL.ink);
    px(g, 3, 5, 18, 14, '#d9c9a3');                                    // parchment
    px(g, 3, 5, 18, 2, '#e8dcc0');
    px(g, 3, 17, 18, 2, '#b3a37d');
    px(g, 1, 4, 3, 16, PAL.ink); px(g, 2, 5, 1, 14, '#8a7a58');       // curled edge
    for (let i = 0; i < 5; i++) px(g, 5 + i * 3, 9 + (i % 2), 2, 1, PAL.dred);   // dotted trail
    pline(g, 16, 13, 18, 15, 1, PAL.dred); pline(g, 18, 13, 16, 15, 1, PAL.dred); // X
    disc(g, 7, 14, 2, 'rgba(90,74,43,0.6)');                           // coffee? blood? age?
    px(g, 12, 6, 4, 3, 'rgba(42,36,23,0.5)');                          // a scribbled skull
    px(g, 2, 20, 20, 1, 'rgba(0,0,0,0.3)');
  }),

  rareTape: S(24, 24, (g) => {
    px(g, 2, 6, 20, 13, PAL.ink);
    px(g, 3, 7, 18, 11, '#20222e');
    px(g, 3, 7, 18, 2, '#3a405a');
    px(g, 5, 10, 14, 6, PAL.paper);                                   // label
    px(g, 6, 11, 12, 1, PAL.dgray); px(g, 6, 13, 9, 1, PAL.dgray);
    disc(g, 8, 17, 1, PAL.dgray); disc(g, 16, 17, 1, PAL.dgray);      // reels peek
    px(g, 2, 5, 20, 1, 'rgba(255,255,255,0.35)');                     // shrink wrap shine
    px(g, 20, 8, 1, 9, 'rgba(255,255,255,0.3)');
    sparkle(g, 20, 5, '#ffffff');
  }),

  gravyBoat: S(24, 24, (g) => {
    px(g, 3, 18, 18, 3, PAL.ink); px(g, 4, 19, 16, 1, PAL.white);     // saucer
    px(g, 5, 10, 13, 8, PAL.ink);
    px(g, 6, 11, 11, 6, PAL.white);
    px(g, 6, 11, 11, 2, '#ffffff');
    px(g, 3, 8, 4, 4, PAL.ink); px(g, 4, 9, 3, 2, PAL.white);         // spout
    px(g, 17, 11, 4, 5, PAL.ink); px(g, 18, 12, 2, 3, '#e7edf4');     // handle
    px(g, 6, 14, 11, 1, PAL.blue);                                     // china band
    px(g, 8, 12, 2, 1, PAL.blue); px(g, 12, 12, 2, 1, PAL.blue);      // floral dabs
  }),

  // the assembled Sunday Table — chairs tucked in, cloth on, boat out
  diningTableSet: S(96, 46, (g, C) => {
    // two chairs peeking up behind the table
    for (const cx of [10, 72]) {
      px(g, cx, 0, 3, 16, PAL.ink); px(g, cx + 11, 0, 3, 16, PAL.ink);
      px(g, cx + 1, 1, 1, 14, C.a); px(g, cx + 12, 1, 1, 14, C.a);
      px(g, cx + 2, 3, 10, 2, PAL.ink); px(g, cx + 3, 4, 8, 1, C.c);
      px(g, cx + 2, 8, 10, 2, PAL.ink);
    }
    // legs
    px(g, 8, 20, 5, 26, PAL.ink); px(g, 9, 21, 3, 24, C.b);
    px(g, 83, 20, 5, 26, PAL.ink); px(g, 84, 21, 3, 24, C.b);
    px(g, 22, 19, 4, 23, PAL.ink); px(g, 70, 19, 4, 23, PAL.ink);
    // apron
    px(g, 5, 16, 86, 8, PAL.ink); px(g, 6, 17, 84, 6, C.a);
    // cloth over the top, hanging at the ends
    px(g, 2, 8, 92, 9, PAL.ink);
    px(g, 3, 9, 90, 7, PAL.paper);
    px(g, 3, 9, 90, 2, '#fff7e6');
    px(g, 3, 16, 8, 6, PAL.paper); px(g, 85, 16, 8, 6, PAL.paper);    // overhang
    px(g, 3, 21, 8, 1, PAL.dpaper); px(g, 85, 21, 8, 1, PAL.dpaper);
    for (let i = 0; i < 22; i++) px(g, 5 + i * 4, 15, 2, 1, PAL.dpaper); // lace edge
    // gravy boat on top, proud
    px(g, 42, 2, 12, 6, PAL.ink);
    px(g, 43, 3, 10, 4, PAL.white);
    px(g, 40, 1, 3, 3, PAL.ink); px(g, 41, 2, 2, 1, PAL.white);
    px(g, 53, 3, 3, 3, PAL.ink); px(g, 54, 4, 1, 1, '#e7edf4');
    px(g, 44, 5, 8, 1, PAL.blue);
    sparkle(g, 60, 4, '#ffffff');
  }),

  bookshelf: S(48, 64, (g, C) => {
    bevelBox(g, 1, 1, 46, 62, C.a, C.c, C.b);
    px(g, 4, 4, 40, 56, C.b);
    const spines = [PAL.red, PAL.blue, PAL.green, PAL.yellow, PAL.purple, PAL.orange, PAL.lblue, PAL.dgreen];
    for (let s = 0; s < 3; s++) {
      const sy = 5 + s * 19;
      px(g, 4, sy + 15, 40, 3, C.a); px(g, 4, sy + 15, 40, 1, C.c);  // shelf
      let x = 6;
      const r = RNG(50 + s);
      while (x < 40) {
        const w = r.i(3, 5), hh = r.i(10, 14);
        px(g, x, sy + 15 - hh, w, hh, spines[r.i(0, spines.length - 1)]);
        px(g, x, sy + 15 - hh, w, 1, 'rgba(255,255,255,0.35)');
        x += w + 1;
      }
    }
  }),

  box: S(48, 36, (g, C, r) => {
    r = r || RNG(7);
    const closed = r.chance(0.35);
    px(g, 2, 8, 44, 27, PAL.ink);
    px(g, 3, 9, 42, 25, PAL.lwood);
    px(g, 3, 9, 42, 3, PAL.wood);
    px(g, 3, 9, 2, 25, PAL.pwood); px(g, 43, 9, 2, 25, PAL.dwood);
    if (closed) {
      px(g, 2, 6, 44, 5, PAL.ink); px(g, 3, 7, 42, 3, PAL.pwood);    // folded shut
      px(g, 20 + r.i(-6, 6), 6, 6, 29, PAL.dpaper);                   // tape strip
    } else {
      px(g, 1, 2, 20, 8, PAL.ink); px(g, 2, 3, 18, 6, PAL.pwood);    // open flaps
      px(g, 27, 2, 20, 8, PAL.ink); px(g, 28, 3, 18, 6, PAL.pwood);
      px(g, 22, 9, 4, 25, PAL.dpaper);
    }
    const lx2 = r.i(6, 26), ly2 = r.i(13, 22);
    px(g, lx2, ly2, r.i(10, 15), 8, r.chance(0.25) ? '#e8d090' : PAL.paper);  // label
    px(g, lx2 + 2, ly2 + 2, 8, 1, PAL.dgray); px(g, lx2 + 2, ly2 + 4, r.i(4, 7), 1, PAL.dgray);
    if (r.chance(0.4)) { px(g, r.i(4, 34), 27, r.i(5, 9), 5, 'rgba(90,74,43,0.35)'); }  // water stain
    if (r.chance(0.3)) pline(g, r.i(6, 20), 10, r.i(22, 40), 33, 1, PAL.wood);          // crease
    speck(g, 4, 26, 40, 7, PAL.dwood, r.i(1, 99), r.i(3, 7));
  }),

  // the rest of the cardboard family, drawn from one body so five sizes of box
  // read as the same product line. A carton you can lift with one hand and a
  // carton an appliance came in should not look alike, and should not hold
  // the same things — see `contCap` in gen.js.
  // somebody's paperwork, folded once and forgotten in a box
  paper: S(24, 20, (g, C, r) => {
    r = r || RNG(7);
    px(g, 2, 3, 20, 16, PAL.ink);
    px(g, 3, 4, 18, 14, PAL.paper);
    px(g, 3, 4, 18, 3, PAL.dpaper);                        // the fold, gone brown
    for (let i = 0; i < 4; i++) px(g, 5, 9 + i * 2, r.i(6, 14), 1, PAL.dgray);
    if (r.chance(0.4)) px(g, 15, 13, 5, 4, '#b8a06a');     // a stamp, or a stain
  }),
  boxSmall: S(36, 26, (g, C, r) => cardboard(g, 36, 26, r || RNG(7))),
  boxLarge: S(48, 48, (g, C, r) => cardboard(g, 48, 48, r || RNG(7))),
  boxWardrobe: S(48, 72, (g, C, r) => {
    r = r || RNG(7);
    cardboard(g, 48, 72, r);
    px(g, 8, 30, 32, 3, PAL.ink); px(g, 9, 31, 30, 1, PAL.dpaper);        // the hanging-bar slot
    px(g, 6, 44, 10, 6, PAL.ink); px(g, 7, 45, 8, 4, PAL.pwood);          // a hand hole
    px(g, 32, 44, 10, 6, PAL.ink); px(g, 33, 45, 8, 4, PAL.pwood);
  }),
  boxHuge: S(48, 84, (g, C, r) => {
    r = r || RNG(7);
    cardboard(g, 48, 84, r);
    // the shipping stencil: something big came in this, and it says so sideways
    px(g, 7, 34, 34, 12, 'rgba(40,32,20,0.18)');
    for (let i = 0; i < 4; i++) px(g, 10 + i * 8, 37, 5, 6, PAL.dgray);
    px(g, 16, 58, 16, 10, PAL.paper); px(g, 18, 61, 12, 1, PAL.dgray); px(g, 18, 64, 8, 1, PAL.dgray);
    if (r.chance(0.5)) { px(g, 6, 72, 12, 5, 'rgba(90,74,43,0.4)'); }     // it sat on a wet floor
  }),

  crate: S(48, 36, (g, C, r) => {
    r = r || RNG(7);
    bevelBox(g, 1, 1, 46, 34, PAL.wood, PAL.lwood, PAL.dwood);
    for (let i = 1; i < 3; i++) px(g, 2, 1 + i * 11, 44, 2, PAL.ink);
    px(g, 2, 2, 4, 32, PAL.lwood); px(g, 42, 2, 4, 32, PAL.dwood);   // frame
    const flip = r.chance(0.5);
    for (let i = 0; i < 9; i++) px(g, flip ? 38 - i * 5 : 6 + i * 5, 6 + i * 3, 4, 2, PAL.dwood);
    const sx2 = r.i(8, 24), sy2 = r.i(6, 20);
    px(g, sx2, sy2, 16, 8, PAL.dwood);                                // stencil block
    px(g, sx2 + 2, sy2 + 2, 12, 1, PAL.pwood); px(g, sx2 + 2, sy2 + 5, r.i(6, 10), 1, PAL.pwood);
    if (r.chance(0.35)) px(g, r.i(4, 36), r.i(4, 28), 2, r.i(4, 8), PAL.ink);   // split plank
    if (r.chance(0.3)) { const nx = r.i(6, 40); px(g, nx, r.i(4, 30), 2, 2, PAL.gray); }  // stray nail
  }),

  barrel: S(44, 54, (g) => {
    px(g, 3, 2, 38, 50, PAL.ink);
    px(g, 4, 3, 36, 48, PAL.wood);
    for (let i = 0; i < 5; i++) px(g, 8 + i * 7, 3, 2, 48, PAL.dwood);  // staves
    px(g, 5, 3, 3, 48, PAL.lwood);
    px(g, 2, 10, 40, 5, PAL.ink); px(g, 3, 11, 38, 3, PAL.dgray); px(g, 3, 11, 38, 1, PAL.gray);
    px(g, 2, 39, 40, 5, PAL.ink); px(g, 3, 40, 38, 3, PAL.dgray); px(g, 3, 40, 38, 1, PAL.gray);
    px(g, 6, 4, 32, 2, PAL.lwood);                                    // top rim light
  }),

  safe: S(48, 48, (g) => {
    px(g, 3, 44, 8, 4, PAL.ink); px(g, 37, 44, 8, 4, PAL.ink);
    bevelBox(g, 1, 1, 46, 44, PAL.slate, PAL.dgray, PAL.ink);
    bevelBox(g, 5, 5, 38, 36, PAL.slate, PAL.dgray, PAL.ink);        // door
    disc(g, 22, 22, 9, PAL.ink);
    disc(g, 22, 22, 7, PAL.gray);
    disc(g, 22, 22, 4, PAL.slate);
    px(g, 21, 14, 2, 4, PAL.white);                                   // dial marker
    px(g, 15, 21, 3, 2, PAL.lmetal); px(g, 30, 21, 3, 2, PAL.lmetal);
    px(g, 36, 16, 4, 12, PAL.ink); px(g, 37, 17, 2, 10, PAL.gray);   // handle
    for (const [rx, ry] of [[7, 7], [39, 7], [7, 37], [39, 37]])
      { px(g, rx, ry, 2, 2, PAL.gray); }                              // rivets
  }),

  fridge: S(48, 80, (g) => {
    bevelBox(g, 2, 1, 44, 76, PAL.white, '#ffffff', PAL.gray);
    px(g, 3, 24, 42, 3, PAL.gray); px(g, 3, 24, 42, 1, PAL.dgray);   // door split
    px(g, 7, 5, 3, 14, PAL.ink); px(g, 8, 6, 1, 12, PAL.lmetal);     // freezer handle
    px(g, 7, 30, 3, 26, PAL.ink); px(g, 8, 31, 1, 24, PAL.lmetal);   // main handle
    px(g, 38, 2, 6, 74, 'rgba(86,108,134,0.25)');                    // side shade
    px(g, 16, 34, 14, 10, PAL.yellow);                                // note
    px(g, 18, 37, 10, 1, PAL.dgray); px(g, 18, 40, 7, 1, PAL.dgray);
    px(g, 20, 33, 4, 2, PAL.red);                                     // magnet
    px(g, 3, 77, 42, 2, PAL.ink);
  }),

  washer: S(48, 56, (g) => {
    bevelBox(g, 2, 2, 44, 52, PAL.white, '#ffffff', PAL.gray);
    px(g, 3, 3, 42, 10, PAL.gray); px(g, 3, 12, 42, 1, PAL.dgray);   // control panel
    px(g, 7, 5, 6, 5, PAL.slate); px(g, 16, 5, 6, 5, PAL.slate);
    disc(g, 38, 7, 3, PAL.ink); disc(g, 38, 7, 2, PAL.red);
    disc(g, 24, 33, 15, PAL.ink);
    disc(g, 24, 33, 13, PAL.lmetal);
    disc(g, 24, 33, 10, PAL.navy);
    disc(g, 24, 33, 8, PAL.slate);
    g.fillStyle = PAL.lblue;                                          // glass glare arc
    g.fillRect(18, 27, 6, 2); g.fillRect(17, 29, 4, 2);
    px(g, 3, 51, 42, 3, PAL.gray);
  }),

  tv: S(48, 40, (g, C) => {
    px(g, 6, 36, 6, 4, PAL.ink); px(g, 36, 36, 6, 4, PAL.ink);
    bevelBox(g, 1, 1, 46, 36, C.a, C.c, C.b);
    px(g, 5, 5, 28, 26, PAL.ink);
    px(g, 6, 6, 26, 24, PAL.navy);
    px(g, 7, 7, 24, 22, '#1f2a52');
    g.fillStyle = PAL.lblue; g.fillRect(8, 8, 8, 4); g.fillRect(8, 12, 4, 3);   // glare
    px(g, 36, 6, 8, 8, PAL.ink); disc(g, 40, 10, 3, PAL.gray); px(g, 40, 8, 1, 2, PAL.ink);
    px(g, 36, 17, 8, 8, PAL.ink); disc(g, 40, 21, 3, PAL.gray); px(g, 42, 21, 2, 1, PAL.ink);
    for (let i = 0; i < 4; i++) px(g, 36, 27 + i * 2, 8, 1, C.b);    // speaker slits
  }),

  tire: S(44, 44, (g) => {
    disc(g, 22, 22, 20, PAL.ink);
    disc(g, 22, 22, 18, PAL.slate);
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2;
      px(g, 22 + Math.round(Math.cos(t) * 17) - 1, 22 + Math.round(Math.sin(t) * 17) - 1, 2, 2, PAL.ink);
    }
    disc(g, 22, 22, 11, PAL.ink);
    disc(g, 22, 22, 9, PAL.gray);
    disc(g, 22, 22, 8, PAL.dgray);
    disc(g, 22, 22, 3, PAL.slate);
    for (let a = 0; a < 5; a++) {
      const t = (a / 5) * Math.PI * 2 - Math.PI / 2;
      px(g, 22 + Math.round(Math.cos(t) * 5.5), 22 + Math.round(Math.sin(t) * 5.5), 2, 2, PAL.slate);
    }
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(12, 8, 8, 2); g.fillRect(10, 11, 5, 2);
  }),

  bike: S(96, 56, (g, C) => {
    // wheels: tire, rim, spokes, hub
    for (const cx of [24, 72]) {
      ring(g, cx, 37, 16, PAL.ink);
      ring(g, cx, 37, 15, '#22242e');
      ring(g, cx, 37, 14, PAL.ink);
      ring(g, cx, 37, 12, PAL.gray);
      for (let a = 0; a < 10; a++) {
        const t = (a / 10) * Math.PI * 2;
        pline(g, cx, 37, cx + Math.cos(t) * 11, 37 + Math.sin(t) * 11, 1, PAL.dgray);
      }
      disc(g, cx, 37, 3, PAL.ink); disc(g, cx, 37, 2, PAL.gray);
    }
    // frame diamond: BB(48,41) head(67,15) seat(39,13)
    pline(g, 67, 15, 48, 41, 3, C.b);                    // down tube
    pline(g, 68, 16, 50, 40, 1, C.c);
    pline(g, 39, 13, 48, 41, 3, C.a);                    // seat tube
    pline(g, 40, 14, 67, 14, 3, C.a);                    // top tube
    pline(g, 41, 13, 66, 13, 1, C.c);
    pline(g, 48, 41, 24, 37, 2, C.b);                    // chainstay
    pline(g, 39, 15, 24, 36, 2, C.a);                    // seat stay
    pline(g, 67, 15, 72, 36, 3, C.a);                    // fork
    pline(g, 68, 15, 73, 35, 1, C.c);
    // seat + post
    px(g, 37, 11, 3, 3, C.b);
    px(g, 31, 7, 14, 4, PAL.ink); px(g, 32, 6, 10, 3, PAL.slate);
    // handlebar + stem
    px(g, 66, 9, 3, 7, PAL.slate);
    px(g, 62, 7, 14, 3, PAL.ink); px(g, 74, 8, 4, 5, PAL.slate);
    px(g, 62, 7, 4, 3, PAL.slate);
    // crank + pedals + chain
    disc(g, 48, 41, 5, PAL.ink); ring(g, 48, 41, 4, PAL.dgray); disc(g, 48, 41, 2, PAL.gray);
    pline(g, 48, 41, 54, 48, 2, PAL.slate); px(g, 52, 48, 8, 3, PAL.ink);
    pline(g, 48, 41, 42, 34, 2, PAL.slate);
    pline(g, 26, 40, 44, 43, 1, PAL.dgray);
  }),

  guitar: S(32, 76, (g, C) => {
    oRect(g, 11, 1, 10, 10, C.b);                                     // headstock
    for (let i = 0; i < 3; i++) { px(g, 9, 3 + i * 3, 2, 2, PAL.gray); px(g, 21, 3 + i * 3, 2, 2, PAL.gray); }
    px(g, 13, 11, 6, 22, PAL.ink); px(g, 14, 11, 4, 22, C.b);        // neck
    for (let i = 0; i < 5; i++) px(g, 14, 14 + i * 4, 4, 1, PAL.gray); // frets
    disc(g, 16, 46, 12, PAL.ink); disc(g, 16, 60, 14, PAL.ink);      // body outline
    disc(g, 16, 46, 11, C.a); disc(g, 16, 60, 13, C.a);
    disc(g, 12, 44, 4, C.c); disc(g, 11, 56, 5, C.c);                // top-left light
    disc(g, 16, 52, 5, PAL.ink);                                      // soundhole
    disc(g, 16, 52, 4, '#120f18');
    ring(g, 16, 52, 5, PAL.dgold);
    px(g, 12, 64, 9, 3, PAL.ink); px(g, 13, 65, 7, 1, C.d);          // bridge
    px(g, 15, 14, 1, 48, 'rgba(255,255,255,0.5)');                    // strings
    px(g, 17, 14, 1, 48, 'rgba(255,255,255,0.3)');
  }),

  guitarCase: S(36, 80, (g, C) => {
    disc(g, 18, 12, 10, PAL.ink); disc(g, 18, 62, 15, PAL.ink);
    px(g, 8, 12, 20, 50, PAL.ink);
    disc(g, 18, 12, 8, C.a); disc(g, 18, 62, 13, C.a);
    px(g, 10, 12, 16, 50, C.a);
    px(g, 10, 12, 3, 50, C.c); disc(g, 15, 10, 3, C.c);
    px(g, 17, 14, 2, 56, C.b);                                        // center seam
    for (const ly of [24, 42, 58]) { px(g, 7, ly, 4, 6, PAL.ink); px(g, 8, ly + 1, 2, 4, PAL.gray); }  // latches
    px(g, 28, 34, 5, 14, PAL.ink); px(g, 29, 36, 3, 10, C.b);        // handle
    px(g, 13, 50, 10, 8, PAL.yellow);                                 // sticker
    px(g, 15, 52, 6, 1, PAL.ink); px(g, 15, 55, 4, 1, PAL.ink);
  }),

  amp: S(48, 40, (g, C) => {
    bevelBox(g, 1, 1, 46, 38, C.a, C.c, C.b);
    px(g, 4, 4, 40, 8, PAL.ink);                                      // control strip
    px(g, 5, 5, 38, 6, PAL.slate);
    for (let k = 0; k < 4; k++) { disc(g, 10 + k * 8, 8, 2, PAL.gray); px(g, 10 + k * 8, 6, 1, 1, PAL.ink); }
    disc(g, 41, 8, 1, PAL.red);                                       // pilot light
    px(g, 4, 14, 40, 22, PAL.ink);
    px(g, 5, 15, 38, 20, '#4a3f34');                                  // grille
    speck(g, 5, 15, 38, 20, '#665949', 9, 60);
    speck(g, 5, 15, 38, 20, '#2e2721', 10, 40);
    px(g, 7, 30, 12, 4, C.d); px(g, 8, 31, 10, 2, PAL.ink);          // logo badge
    px(g, 2, 37, 6, 3, PAL.ink); px(g, 40, 37, 6, 3, PAL.ink);
  }),

  vinylCrate: S(48, 32, (g) => {
    bevelBox(g, 1, 6, 46, 25, PAL.wood, PAL.lwood, PAL.dwood);
    const cs = [PAL.red, PAL.blue, PAL.yellow, PAL.green, PAL.purple, PAL.white, PAL.orange, PAL.cyan];
    for (let i = 0; i < 8; i++) {
      const lean = i % 3 === 0 ? 1 : 0;
      px(g, 4 + i * 5, 2 + lean, 4, 26 - lean, PAL.ink);
      px(g, 5 + i * 5, 3 + lean, 2, 24 - lean, cs[i]);
    }
    disc(g, 40, 8, 6, PAL.ink); disc(g, 40, 8, 5, '#22242e'); disc(g, 40, 8, 2, PAL.red);  // record peeking
    px(g, 2, 7, 44, 2, PAL.lwood);
  }),

  keyboard: S(96, 40, (g, C) => {
    // X-stand
    for (let i = 0; i < 10; i++) { px(g, 20 + i * 2, 18 + i * 2, 3, 2, PAL.slate); px(g, 74 - i * 2, 18 + i * 2, 3, 2, PAL.slate); }
    bevelBox(g, 2, 2, 92, 18, C.a, C.c, C.b);
    px(g, 6, 8, 68, 9, PAL.ink);
    px(g, 7, 9, 66, 7, PAL.white);
    for (let i = 0; i < 16; i++) px(g, 11 + i * 4, 9, 1, 7, PAL.gray);
    for (let i = 0; i < 16; i++) if (i % 7 !== 2 && i % 7 !== 6) px(g, 10 + i * 4, 9, 2, 4, PAL.ink);
    disc(g, 80, 12, 3, PAL.slate); disc(g, 80, 12, 2, PAL.dgray);    // pitch wheel
    for (let k = 0; k < 4; k++) px(g, 86, 5 + k * 4, 6, 2, [PAL.red, PAL.green, PAL.yellow, PAL.cyan][k]);
    px(g, 8, 4, 20, 2, C.d);
  }),

  lamp: S(28, 64, (g, C) => {
    px(g, 6, 1, 16, 2, PAL.ink);
    for (let i = 0; i < 9; i++) px(g, 5 - Math.floor(i / 3) + i, 0, 1, 1, PAL.ink);
    // shade trapezoid
    for (let yy = 0; yy < 16; yy++) {
      const half = 8 + Math.floor(yy * 0.45);
      px(g, 14 - half, 2 + yy, half * 2, 1, C.a);
      px(g, 14 - half, 2 + yy, 2, 1, C.c);
      px(g, 12 + half - 2, 2 + yy, 2, 1, C.b);
    }
    px(g, 14 - 8, 2, 16, 1, C.c);
    px(g, 3, 18, 22, 2, PAL.ink);
    px(g, 8, 20, 12, 2, PAL.yellow); px(g, 11, 22, 6, 1, PAL.ggold); // glow under shade
    px(g, 13, 22, 3, 36, PAL.ink); px(g, 14, 22, 1, 36, PAL.dgray);  // pole
    disc(g, 14, 59, 6, PAL.ink); disc(g, 14, 58, 5, PAL.slate); px(g, 10, 56, 6, 1, PAL.dgray);
  }),

  rugRolled: S(24, 72, (g, C) => {
    px(g, 4, 3, 16, 66, PAL.ink);
    px(g, 5, 4, 14, 64, C.a);
    px(g, 5, 4, 3, 64, C.c);
    px(g, 16, 4, 3, 64, C.b);
    for (let i = 0; i < 6; i++) {
      px(g, 5, 9 + i * 11, 14, 3, C.d);
      px(g, 5, 12 + i * 11, 14, 1, C.b);
    }
    disc(g, 12, 6, 7, PAL.ink);
    disc(g, 12, 6, 6, C.a);
    ring(g, 12, 6, 4, C.b); ring(g, 12, 6, 2, C.b);                  // spiral end
    px(g, 3, 34, 18, 3, PAL.dwood); px(g, 3, 35, 18, 1, PAL.wood);   // strap
  }),

  mirror: S(40, 68, (g) => {
    px(g, 8, 62, 10, 4, PAL.ink); px(g, 24, 62, 10, 4, PAL.ink);     // feet
    // ornate frame
    px(g, 4, 2, 32, 60, PAL.dgold);
    px(g, 6, 4, 28, 56, PAL.gold);
    px(g, 8, 6, 24, 52, PAL.dgold);
    disc(g, 20, 2, 3, PAL.gold); disc(g, 5, 4, 2, PAL.gold); disc(g, 34, 4, 2, PAL.gold);  // crown knobs
    px(g, 9, 7, 22, 50, PAL.lblue);
    g.fillStyle = PAL.cyan;
    for (let i = 0; i < 14; i++) g.fillRect(11 + i, 10 + i, 2, 1);
    for (let i = 0; i < 20; i++) g.fillRect(14 + i * 0.5 | 0, 20 + i, 1, 1);
    px(g, 10, 8, 3, 10, '#e0f6ff');
    sparkle(g, 27, 14, '#ffffff');
  }),

  painting: S(48, 36, (g) => {
    px(g, 1, 1, 46, 34, PAL.dgold);
    px(g, 3, 3, 42, 30, PAL.gold);
    px(g, 5, 5, 38, 26, PAL.dgold);
    px(g, 6, 6, 36, 24, PAL.lblue);                                   // sky
    disc(g, 34, 12, 4, PAL.yellow); disc(g, 33, 11, 2, PAL.ggold);   // sun
    px(g, 6, 18, 36, 6, PAL.dgreen);                                  // far hills
    px(g, 6, 16, 12, 4, PAL.dgreen); px(g, 20, 17, 10, 3, PAL.dgreen);
    px(g, 6, 24, 36, 6, PAL.green);                                   // near field
    px(g, 10, 26, 5, 2, PAL.dgreen); px(g, 26, 27, 6, 2, PAL.dgreen);
    px(g, 6, 6, 36, 1, 'rgba(255,255,255,0.4)');
  }),

  toolbox: S(44, 28, (g, C) => {
    bevelBox(g, 1, 8, 42, 19, C.a, C.c, C.b);
    px(g, 2, 13, 40, 2, PAL.ink);                                     // lid seam
    px(g, 12, 1, 20, 8, PAL.ink); px(g, 13, 2, 18, 6, C.a); px(g, 13, 2, 18, 2, C.c);  // handle arch
    px(g, 17, 3, 10, 3, '#0d0e14');
    px(g, 19, 14, 6, 5, PAL.ink); px(g, 20, 15, 4, 3, PAL.gray);     // latch
    for (const rx of [4, 38]) px(g, rx, 10, 2, 2, C.b);
    px(g, 6, 20, 8, 1, C.b); px(g, 28, 22, 10, 1, C.b);              // scratches
  }),

  workbench: S(96, 48, (g) => {
    // top
    px(g, 1, 8, 94, 10, PAL.ink);
    px(g, 2, 9, 92, 8, PAL.wood);
    px(g, 2, 9, 92, 2, PAL.pwood);
    grain(g, 4, 12, 88, 4, PAL.dwood, 31, 8);
    // vise
    px(g, 82, 2, 12, 8, PAL.ink); px(g, 83, 3, 10, 6, PAL.dgray);
    px(g, 86, 0, 4, 4, PAL.gray); px(g, 94, 4, 2, 4, PAL.gray);
    // tools on top
    px(g, 8, 4, 14, 3, PAL.gray); disc(g, 8, 5, 2, PAL.gray);        // wrench
    px(g, 30, 5, 10, 2, PAL.red); px(g, 40, 5, 6, 2, PAL.gray);      // screwdriver
    px(g, 52, 3, 8, 5, PAL.blue); px(g, 60, 4, 5, 2, PAL.gray);      // drill-ish
    // legs + shelf
    px(g, 6, 18, 6, 30, PAL.dwood); px(g, 84, 18, 6, 30, PAL.dwood);
    px(g, 6, 18, 2, 30, PAL.wood); px(g, 84, 18, 2, 30, PAL.wood);
    px(g, 4, 30, 88, 6, PAL.ink); px(g, 5, 31, 86, 4, PAL.wood);
    px(g, 14, 24, 10, 7, PAL.dgreen); px(g, 15, 23, 8, 1, PAL.gray); // paint can
    px(g, 60, 27, 14, 4, PAL.dpaper);                                 // rag
  }),

  drill: S(40, 28, (g, C) => {
    px(g, 2, 4, 24, 12, PAL.ink);                                     // body
    px(g, 3, 5, 22, 10, C.a);
    px(g, 3, 5, 22, 3, C.c);
    px(g, 3, 12, 22, 3, C.b);
    for (let i = 0; i < 4; i++) px(g, 6 + i * 4, 7, 2, 4, C.b);      // vents
    px(g, 26, 6, 5, 8, PAL.ink); px(g, 27, 7, 3, 6, PAL.dgray);      // chuck
    px(g, 27, 7, 3, 2, PAL.gray);
    px(g, 31, 9, 8, 2, PAL.gray); px(g, 31, 9, 8, 1, PAL.lmetal);    // bit
    px(g, 38, 8, 2, 4, PAL.gray);
    px(g, 9, 16, 8, 9, PAL.ink);                                      // pistol grip
    px(g, 10, 17, 6, 7, C.b);
    px(g, 10, 17, 2, 7, C.a);
    px(g, 17, 16, 3, 5, PAL.ink); px(g, 18, 17, 1, 3, PAL.gray);     // trigger
    px(g, 7, 24, 13, 4, PAL.ink); px(g, 8, 25, 11, 2, PAL.slate);    // battery pack
    px(g, 8, 25, 11, 1, PAL.dgray);
    px(g, 5, 6, 8, 2, C.d);                                           // brand stripe
  }),

  filing: S(40, 64, (g) => {
    bevelBox(g, 2, 1, 36, 62, PAL.dgray, PAL.gray, PAL.slate);
    for (let i = 0; i < 3; i++) {
      const dy = 4 + i * 20;
      bevelBox(g, 5, dy, 30, 17, PAL.gray, PAL.lmetal, PAL.slate);
      px(g, 12, dy + 3, 16, 5, PAL.white); px(g, 14, dy + 5, 12, 1, PAL.dgray);  // label
      px(g, 14, dy + 11, 12, 3, PAL.ink); px(g, 15, dy + 12, 10, 1, PAL.lmetal); // handle
    }
    px(g, 34, 56, 3, 4, PAL.slate);                                   // dent
  }),

  trunk: S(48, 36, (g, C) => {
    // dome lid
    px(g, 2, 8, 44, 6, PAL.ink);
    px(g, 4, 4, 40, 6, PAL.ink);
    px(g, 8, 2, 32, 4, PAL.ink);
    px(g, 5, 5, 38, 4, C.a); px(g, 9, 3, 30, 3, C.a);
    px(g, 9, 3, 30, 1, C.c);
    bevelBox(g, 2, 12, 44, 22, C.a, C.c, C.b);
    for (const bx of [10, 34]) { px(g, bx, 2, 4, 32, PAL.dwood); px(g, bx, 2, 1, 32, PAL.lwood); }  // straps
    px(g, 20, 14, 8, 9, PAL.ink); px(g, 21, 15, 6, 7, PAL.gold); px(g, 23, 18, 2, 3, PAL.dgold);    // hasp
    for (const [cx, cy] of [[3, 12], [43, 12], [3, 31], [43, 31]]) px(g, cx, cy, 3, 3, PAL.dgold);   // brass corners
  }),

  sewing: S(48, 40, (g) => {
    px(g, 1, 31, 46, 8, PAL.ink); px(g, 2, 32, 44, 6, PAL.wood); px(g, 2, 32, 44, 2, PAL.pwood);  // wooden base
    // machine body: pillar + arm + head (chunky)
    px(g, 4, 2, 12, 30, PAL.ink);
    px(g, 5, 3, 10, 28, '#262a38');
    px(g, 5, 3, 3, 28, '#3a405a');
    px(g, 4, 2, 32, 12, PAL.ink);
    px(g, 5, 3, 30, 10, '#262a38');
    px(g, 5, 3, 30, 3, '#3a405a');
    px(g, 30, 12, 10, 12, PAL.ink);                                   // head
    px(g, 31, 13, 8, 10, '#262a38');
    px(g, 33, 24, 2, 6, PAL.gray); px(g, 34, 28, 1, 3, PAL.lmetal);  // needle bar
    px(g, 24, 28, 14, 4, PAL.lblue);                                  // fabric
    px(g, 26, 29, 4, 1, PAL.blue);
    disc(g, 43, 10, 5, PAL.ink); disc(g, 43, 10, 4, PAL.slate); ring(g, 43, 10, 3, PAL.gray); disc(g, 43, 10, 1, PAL.gray);  // hand wheel
    px(g, 8, 0, 2, 4, PAL.gray); px(g, 6, 0, 6, 2, PAL.red);         // spool
    for (const [dx, dy] of [[10, 7], [15, 9], [20, 7], [25, 9]]) px(g, dx, dy, 3, 2, PAL.gold);  // gold filigree
    px(g, 8, 16, 4, 2, PAL.gold); px(g, 8, 22, 4, 2, PAL.gold);
    px(g, 5, 30, 34, 2, PAL.slate);                                   // deck
  }),

  typewriter: S(44, 30, (g) => {
    px(g, 12, 1, 20, 10, PAL.paper); px(g, 13, 2, 18, 1, '#ffffff'); // paper
    px(g, 14, 4, 14, 1, PAL.dgray); px(g, 14, 6, 10, 1, PAL.dgray);
    px(g, 4, 9, 36, 6, PAL.ink); px(g, 5, 10, 34, 4, PAL.slate);     // carriage
    disc(g, 3, 12, 3, PAL.ink); disc(g, 3, 12, 2, PAL.dgray);        // roller knobs
    disc(g, 41, 12, 3, PAL.ink); disc(g, 41, 12, 2, PAL.dgray);
    bevelBox(g, 4, 15, 36, 13, PAL.slate, PAL.dgray, PAL.ink);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 8 - r; k++)
      { px(g, 8 + r * 2 + k * 4, 18 + r * 3, 2, 2, PAL.white); }     // key rows
    px(g, 16, 26, 12, 1, PAL.gray);                                   // space bar
  }),

  radio: S(44, 30, (g, C) => {
    bevelBox(g, 2, 4, 40, 24, C.a, C.c, C.b);
    px(g, 5, 0, 1, 5, PAL.gray); px(g, 5, 0, 4, 1, PAL.gray);        // antenna
    disc(g, 31, 15, 8, PAL.ink); disc(g, 31, 15, 7, PAL.paper);
    px(g, 31, 10, 1, 5, PAL.red);                                     // needle
    ring(g, 31, 15, 5, PAL.dpaper);
    for (let i = 0; i < 6; i++) px(g, 7, 8 + i * 3, 12, 2, C.b);     // speaker slats
    disc(g, 9, 24, 2, PAL.gray); disc(g, 17, 24, 2, PAL.gray);
  }),

  fan: S(36, 48, (g) => {
    ring(g, 18, 14, 13, PAL.ink);
    ring(g, 18, 14, 12, PAL.gray);
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2;
      for (let rr = 3; rr < 12; rr += 2)
        px(g, 18 + Math.round(Math.cos(t) * rr), 14 + Math.round(Math.sin(t) * rr), 1, 1, PAL.dgray);
    }
    disc(g, 12, 10, 5, 'rgba(148,176,194,0.5)'); disc(g, 24, 18, 5, 'rgba(148,176,194,0.5)');  // blade blur
    disc(g, 18, 14, 3, PAL.ink); disc(g, 18, 14, 2, PAL.gray);
    px(g, 16, 27, 4, 12, PAL.ink); px(g, 17, 28, 2, 10, PAL.dgray);
    px(g, 8, 39, 20, 4, PAL.ink); px(g, 9, 40, 18, 2, PAL.slate);
    px(g, 6, 43, 24, 3, PAL.ink);
  }),

  vhs: S(44, 28, (g, C, r) => {
    r = r || RNG(7);
    px(g, 1, 6, 42, 21, PAL.ink); px(g, 2, 7, 40, 19, PAL.lwood); px(g, 2, 7, 40, 2, PAL.wood);  // box
    const spineCols = ['#20222e', PAL.slate, '#2c3046', PAL.dred, PAL.navy];
    for (let i = 0; i < 3; i++) {
      const lean = i === 1 && r.chance(0.4) ? 1 : 0;
      px(g, 4 + i * 13, 2 + lean, 11, 22 - lean, PAL.ink);
      px(g, 5 + i * 13, 3 + lean, 9, 20 - lean, r.pick(spineCols));
      if (r.chance(0.8)) {
        px(g, 6 + i * 13, 4 + lean + r.i(0, 8), 7, 6, r.chance(0.2) ? '#e8d090' : PAL.white);
        px(g, 7 + i * 13, 6 + lean + 0, 5, 1, PAL.dgray);
      }
    }
    px(g, 2, 24, 40, 2, PAL.dwood);
    if (r.chance(0.3)) px(g, r.i(4, 34), 8, 6, 2, PAL.dpaper);        // stray sticker
  }),

  mannequin: S(32, 76, (g) => {
    disc(g, 16, 8, 6, PAL.ink); disc(g, 16, 8, 5, PAL.paper); disc(g, 14, 6, 2, '#fff6e0');
    px(g, 14, 14, 4, 4, PAL.paper);                                   // neck
    px(g, 8, 18, 16, 26, PAL.ink);
    px(g, 9, 19, 14, 24, PAL.paper);
    px(g, 9, 19, 3, 24, '#fff6e0');
    px(g, 10, 30, 12, 1, PAL.dpaper);                                 // waist seam
    px(g, 6, 20, 3, 8, PAL.ink); px(g, 23, 20, 3, 8, PAL.ink);       // arm stumps
    px(g, 14, 44, 4, 24, PAL.ink); px(g, 15, 44, 2, 24, PAL.dgray);  // pole
    px(g, 6, 68, 20, 4, PAL.ink); px(g, 7, 69, 18, 2, PAL.slate);
  }),

  tuba: S(44, 56, (g) => {
    // bell (top) — deep horn
    disc(g, 18, 17, 16, PAL.ink);
    disc(g, 18, 17, 15, PAL.gold);
    ring(g, 18, 17, 15, PAL.dgold);
    disc(g, 18, 17, 10, PAL.dgold);
    disc(g, 18, 17, 7, '#5c4310');
    disc(g, 18, 17, 4, '#141018');
    disc(g, 11, 10, 3, PAL.ggold);                                    // shine
    // body loop below bell: fat U of tubing
    px(g, 8, 32, 6, 16, PAL.ink); px(g, 9, 33, 4, 14, PAL.gold); px(g, 9, 33, 1, 14, PAL.ggold);
    px(g, 26, 30, 6, 18, PAL.ink); px(g, 27, 31, 4, 16, PAL.gold); px(g, 27, 31, 1, 16, PAL.ggold);
    px(g, 8, 46, 24, 6, PAL.ink); px(g, 9, 47, 22, 4, PAL.gold); px(g, 9, 47, 22, 1, PAL.dgold);
    px(g, 8, 30, 6, 4, PAL.dgold); px(g, 26, 28, 6, 4, PAL.dgold);   // loop shoulders
    // valves w/ finger buttons
    for (let v = 0; v < 3; v++) {
      px(g, 33 + v * 4, 33, 3, 9, PAL.ink);
      px(g, 34 + v * 4, 34, 1, 7, PAL.gray);
      px(g, 33 + v * 4, 31, 3, 2, PAL.lmetal);
    }
    px(g, 33, 42, 11, 3, PAL.dgold);                                  // valve casing
    px(g, 38, 26, 5, 2, PAL.gray); px(g, 41, 24, 3, 3, PAL.lmetal);  // mouthpiece
  }),

  arcade: S(48, 88, (g, C) => {
    bevelBox(g, 2, 2, 44, 84, C.a, C.c, C.b);
    px(g, 2, 2, 6, 84, C.b);                                          // side art panel
    px(g, 3, 10, 4, 30, C.d); px(g, 3, 50, 4, 20, C.d);
    px(g, 8, 4, 36, 10, PAL.ink);                                     // marquee
    px(g, 9, 5, 34, 8, PAL.navy);
    px(g, 12, 7, 6, 4, PAL.cyan); px(g, 20, 7, 6, 4, PAL.yellow); px(g, 28, 7, 6, 4, PAL.pink); px(g, 36, 7, 5, 4, PAL.green);
    px(g, 9, 16, 34, 26, PAL.ink);                                    // screen bezel
    px(g, 11, 18, 30, 22, '#10122b');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++)
      { px(g, 14 + i * 5, 21 + r * 4, 3, 2, [PAL.green, PAL.cyan, PAL.pink][r]); }  // invaders
    px(g, 24, 36, 3, 2, PAL.white);                                   // ship
    px(g, 8, 44, 36, 12, PAL.ink);                                    // control deck
    px(g, 9, 45, 34, 10, C.b);
    px(g, 14, 46, 2, 5, PAL.gray); disc(g, 15, 45, 3, PAL.red);      // joystick
    disc(g, 28, 49, 3, PAL.yellow); disc(g, 36, 49, 3, PAL.cyan);
    px(g, 12, 62, 24, 12, PAL.ink); px(g, 13, 63, 22, 10, C.b);      // coin door
    px(g, 21, 65, 6, 2, PAL.gray); px(g, 21, 69, 6, 3, PAL.slate);
    px(g, 8, 80, 32, 4, PAL.ink);                                     // kick plate
  }),

  till: S(40, 32, (g) => {
    bevelBox(g, 2, 6, 36, 20, PAL.gray, PAL.lmetal, PAL.slate);
    px(g, 4, 2, 16, 6, PAL.ink); px(g, 5, 3, 14, 4, '#1f3b2c');      // amount window
    px(g, 7, 4, 3, 2, PAL.green); px(g, 12, 4, 3, 2, PAL.green);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++)
      { px(g, 6 + k * 6, 10 + r * 5, 4, 3, PAL.white); px(g, 6 + k * 6, 12 + r * 5, 4, 1, PAL.dgray); }
    disc(g, 34, 10, 3, PAL.ink); px(g, 36, 8, 3, 2, PAL.gray);       // crank
    px(g, 2, 26, 36, 5, PAL.ink); px(g, 3, 27, 34, 3, PAL.dgray);    // drawer
    px(g, 17, 28, 6, 1, PAL.gold);
  }),

  neon: S(48, 32, (g) => {
    bevelBox(g, 1, 1, 46, 30, '#232537', PAL.slate, PAL.ink);
    for (const [cx, cy] of [[4, 4], [43, 4], [4, 27], [43, 27]]) px(g, cx, cy, 2, 2, PAL.gray);
    // O P E N tubes with glow
    const gl = 'rgba(232,106,138,0.35)';
    px(g, 5, 8, 10, 16, gl); px(g, 16, 8, 9, 16, gl); px(g, 26, 8, 9, 16, gl); px(g, 36, 8, 9, 16, gl);
    const c = PAL.lpink;
    // O
    px(g, 7, 10, 6, 12, c); px(g, 9, 12, 2, 8, '#232537');
    // P
    px(g, 17, 10, 2, 12, c); px(g, 19, 10, 4, 2, c); px(g, 21, 12, 2, 3, c); px(g, 19, 15, 3, 2, c);
    // E
    px(g, 27, 10, 2, 12, c); px(g, 29, 10, 4, 2, c); px(g, 29, 15, 3, 2, c); px(g, 29, 20, 4, 2, c);
    // N — one leg flickered dim
    px(g, 37, 10, 2, 12, '#a15a72'); px(g, 43, 10, 2, 12, c);
    px(g, 39, 13, 1, 3, c); px(g, 40, 15, 1, 3, c); px(g, 41, 17, 1, 3, c);
  }),

  skis: S(24, 84, (g, C) => {
    for (const [sx, P1, P2] of [[3, C.a, C.c], [13, C.b, C.a]]) {
      px(g, sx, 6, 7, 74, PAL.ink);
      px(g, sx + 1, 7, 5, 72, P1);
      px(g, sx + 1, 7, 2, 72, P2);
      px(g, sx + 1, 2, 5, 6, PAL.ink);                                // curved tip
      px(g, sx + 2, 1, 3, 4, P1);
      px(g, sx + 1, 30, 5, 12, PAL.slate);                            // binding
      px(g, sx + 2, 32, 3, 3, PAL.gray);
      px(g, sx + 1, 60, 5, 2, PAL.white);                             // stripe
    }
  }),

  garbage: S(36, 26, (g, C, r) => {
    r = r || RNG(7);
    const bagCol = r.chance(0.25) ? '#2e3324' : '#22242e';           // some bags ran out of black
    const hi = r.chance(0.25) ? '#4a5038' : '#3a3d4d';
    disc(g, 18, 16, 9, PAL.ink);
    px(g, 4, 12, 28, 12, PAL.ink);
    px(g, 5, 13, 26, 10, bagCol);
    disc(g, r.i(10, 14), 16, 6, bagCol); disc(g, r.i(22, 27), 15, r.i(5, 7), bagCol);   // lumps
    px(g, r.i(6, 10), 14, 5, 2, hi); px(g, r.i(18, 22), 12, 6, 2, hi);                   // shine
    const knotX = r.i(13, 20);
    px(g, knotX + 2, 6, 4, 6, PAL.ink); px(g, knotX + 3, 7, 2, 4, bagCol);              // tied top
    px(g, knotX, 4, 3, 3, bagCol); px(g, knotX + 5, 4, 3, 3, bagCol);                    // knot ears
    if (r.chance(0.35)) { px(g, r.i(6, 26), 22, r.i(2, 4), 2, PAL.paper); }             // something poking out
    if (r.chance(0.6)) { const fx = r.i(26, 33); px(g, fx, r.i(4, 9), 1, 1, PAL.dgray); px(g, fx + 2, r.i(3, 8), 1, 1, PAL.dgray); }  // flies
  }),

  microwave: S(44, 26, (g) => {
    bevelBox(g, 1, 2, 42, 22, PAL.gray, PAL.lmetal, PAL.slate);
    px(g, 4, 5, 26, 16, PAL.ink);
    px(g, 5, 6, 24, 14, '#22242e');
    px(g, 6, 7, 22, 2, '#3a3d4d');
    px(g, 27, 6, 2, 14, PAL.gray);                                   // door handle
    px(g, 33, 6, 8, 4, '#1f3b2c'); px(g, 34, 7, 3, 2, PAL.green);   // clock
    for (let r = 0; r < 3; r++) px(g, 33, 13 + r * 3, 8, 2, PAL.dgray);
  }),

  stereo: S(44, 34, (g, C) => {
    bevelBox(g, 1, 1, 42, 32, C.a, C.c, C.b);
    px(g, 4, 4, 36, 8, PAL.ink);                                     // tuner window
    px(g, 5, 5, 34, 6, '#1a2c38');
    px(g, 7, 7, 20, 2, PAL.cyan); px(g, 24, 6, 1, 4, PAL.red);      // dial + needle
    px(g, 4, 15, 16, 8, PAL.ink); px(g, 5, 16, 14, 6, '#22242e');   // cassette slot
    px(g, 7, 18, 3, 2, PAL.dgray); px(g, 13, 18, 3, 2, PAL.dgray);
    disc(g, 30, 19, 4, PAL.ink); disc(g, 30, 19, 3, PAL.gray);      // knobs
    disc(g, 38, 19, 3, PAL.ink); disc(g, 38, 19, 2, PAL.gray);
    for (let i = 0; i < 6; i++) px(g, 5 + i * 6, 26, 3, 5 - (i % 3), PAL.green);  // EQ
  }),

  officeChair: S(36, 52, (g, C) => {
    bevelBox(g, 6, 2, 24, 20, C.a, C.c, C.b);                       // backrest
    px(g, 9, 5, 18, 14, C.b);
    bevelBox(g, 4, 24, 28, 8, C.a, C.c, C.b);                       // seat
    px(g, 16, 32, 4, 10, PAL.dgray); px(g, 17, 32, 2, 10, PAL.gray); // gas lift
    for (const [dx, dy] of [[-12, 6], [-6, 8], [0, 9], [6, 8], [12, 6]]) {
      pline(g, 18, 42, 18 + dx, 42 + dy, 2, PAL.slate);
      disc(g, 18 + dx, 43 + dy, 2, PAL.ink);
    }
  }),

  suitcase: S(44, 30, (g, C) => {
    px(g, 17, 1, 10, 5, PAL.ink); px(g, 19, 2, 6, 3, '#0d0e14');    // handle
    bevelBox(g, 1, 5, 42, 24, C.a, C.c, C.b);
    px(g, 2, 15, 40, 2, PAL.ink);                                    // seam
    px(g, 8, 11, 4, 6, PAL.gray); px(g, 32, 11, 4, 6, PAL.gray);    // latches
    px(g, 9, 12, 2, 2, PAL.ink); px(g, 33, 12, 2, 2, PAL.ink);
    px(g, 26, 19, 12, 8, PAL.paper);                                 // travel sticker
    px(g, 28, 21, 8, 2, PAL.red); px(g, 28, 24, 5, 1, PAL.blue);
  }),

  birdcage: S(32, 52, (g) => {
    px(g, 14, 0, 4, 4, PAL.dgold);                                   // hook
    for (let yy = 0; yy < 14; yy++) {
      const half = Math.round(12 * Math.sin(((yy + 4) / 36) * Math.PI));
      px(g, 16 - half, 4 + yy, half * 2, 1, yy % 3 ? '#0000' : 'rgba(201,150,42,0)');
    }
    // dome + bars
    disc(g, 16, 16, 13, 'rgba(0,0,0,0)');
    ring(g, 16, 16, 12, PAL.dgold);
    for (let i = 0; i < 7; i++) px(g, 5 + i * 4, 16, 2, 28, PAL.dgold);
    px(g, 4, 14, 24, 2, PAL.gold);
    px(g, 4, 44, 24, 4, PAL.ink); px(g, 5, 45, 22, 2, PAL.dgold);   // tray
    px(g, 10, 34, 12, 2, PAL.wood);                                  // perch (empty...)
    px(g, 4, 48, 24, 2, PAL.ink);
  }),

  globe: S(32, 42, (g) => {
    disc(g, 16, 15, 13, PAL.ink);
    disc(g, 16, 15, 12, PAL.blue);
    px(g, 8, 8, 7, 5, PAL.green); px(g, 18, 12, 8, 6, PAL.green);   // continents
    px(g, 11, 20, 6, 4, PAL.green); px(g, 21, 6, 4, 3, PAL.green);
    disc(g, 11, 10, 2, '#7db8f7');                                   // shine
    for (let a = 0; a < 20; a++) {                                   // meridian arc
      const t = -0.6 + (a / 20) * 2.4;
      px(g, 16 + Math.round(Math.sin(t) * 14), 15 - Math.round(Math.cos(t) * 14), 2, 2, PAL.dgold);
    }
    px(g, 14, 29, 4, 6, PAL.dgold);
    px(g, 8, 35, 16, 3, PAL.ink); px(g, 9, 36, 14, 2, PAL.dwood);
  }),

  ladder: S(28, 72, (g) => {
    px(g, 4, 2, 5, 68, PAL.ink); px(g, 5, 3, 3, 66, PAL.orange);
    px(g, 19, 2, 5, 68, PAL.ink); px(g, 20, 3, 3, 66, PAL.orange);
    px(g, 5, 3, 1, 66, '#f9a583'); px(g, 20, 3, 1, 66, '#f9a583');
    for (let i = 0; i < 6; i++) {
      px(g, 8, 8 + i * 11, 12, 4, PAL.ink);
      px(g, 9, 9 + i * 11, 10, 2, PAL.gray);
    }
    px(g, 10, 30, 3, 2, PAL.white); px(g, 16, 52, 4, 2, PAL.dgreen); // paint drips
  }),

  golfClubs: S(30, 62, (g, C) => {
    px(g, 8, 2, 3, 16, PAL.gray); disc(g, 7, 2, 3, PAL.slate);      // driver
    px(g, 14, 0, 2, 18, PAL.gray); px(g, 13, 0, 4, 3, PAL.lmetal);  // iron
    px(g, 20, 3, 2, 15, PAL.gray); px(g, 19, 3, 4, 2, PAL.lmetal);
    px(g, 4, 16, 22, 42, PAL.ink);
    px(g, 5, 17, 20, 40, C.a);
    px(g, 5, 17, 4, 40, C.c);
    px(g, 5, 30, 20, 4, C.b);                                        // band
    px(g, 8, 38, 8, 10, PAL.ink); px(g, 9, 39, 6, 8, C.b);          // pocket
    px(g, 25, 20, 3, 24, PAL.dwood);                                 // strap
    px(g, 3, 58, 24, 3, PAL.ink);
  }),

  lockbox: S(26, 18, (g) => {
    bevelBox(g, 1, 4, 24, 13, PAL.dgray, PAL.gray, PAL.slate);
    px(g, 2, 8, 22, 1, PAL.ink);                                     // lid seam
    px(g, 9, 1, 8, 4, PAL.ink); px(g, 10, 2, 6, 2, PAL.gray);       // handle
    px(g, 11, 11, 4, 4, PAL.ink); px(g, 12, 12, 2, 2, PAL.gold);    // keyhole
  }),

  strongbox: S(40, 28, (g) => {
    bevelBox(g, 1, 3, 38, 24, PAL.slate, PAL.dgray, PAL.ink);
    px(g, 6, 3, 4, 24, PAL.dgray); px(g, 30, 3, 4, 24, PAL.dgray);  // bands
    px(g, 2, 10, 36, 1, PAL.ink);
    px(g, 16, 12, 8, 8, PAL.ink);                                    // hasp + padlock
    px(g, 17, 13, 6, 3, PAL.gray);
    disc(g, 20, 19, 3, PAL.gold); px(g, 19, 19, 2, 3, PAL.dgold);
    for (const [rx, ry] of [[3, 5], [36, 5], [3, 24], [36, 24]]) px(g, rx, ry, 2, 2, PAL.gray);
  }),

  gunSafe: S(32, 64, (g) => {
    bevelBox(g, 2, 1, 28, 60, '#26332b', '#3d4f43', PAL.ink);
    px(g, 5, 4, 22, 54, '#1e2922');
    px(g, 6, 5, 20, 52, '#26332b');
    px(g, 22, 10, 6, 8, PAL.ink); px(g, 23, 11, 4, 6, PAL.gray);    // keypad
    px(g, 23, 12, 1, 1, PAL.green); px(g, 25, 12, 1, 1, PAL.red);
    px(g, 8, 20, 3, 26, PAL.ink); px(g, 9, 21, 1, 24, PAL.lmetal);  // long handle
    px(g, 10, 50, 14, 4, PAL.dgold);                                 // brand plate
    px(g, 3, 61, 6, 3, PAL.ink); px(g, 23, 61, 6, 3, PAL.ink);
  }),

  floorSafe: S(44, 40, (g) => {
    px(g, 3, 36, 8, 4, PAL.ink); px(g, 33, 36, 8, 4, PAL.ink);
    bevelBox(g, 1, 1, 42, 36, PAL.slate, PAL.dgray, PAL.ink);
    bevelBox(g, 6, 5, 32, 28, PAL.slate, PAL.dgray, PAL.ink);
    disc(g, 20, 18, 8, PAL.ink);
    disc(g, 20, 18, 6, PAL.gray);
    ring(g, 20, 18, 4, PAL.slate);
    px(g, 19, 11, 2, 3, PAL.white);
    px(g, 32, 14, 4, 10, PAL.ink); px(g, 33, 15, 2, 8, PAL.lmetal); // handle
    for (const [rx, ry] of [[8, 7], [34, 7], [8, 30], [34, 30]]) px(g, rx, ry, 3, 3, PAL.gray);
  }),

  // ================= SMALL / LOOT (24x24) =================

  records: S(24, 24, (g) => {
    px(g, 2, 6, 14, 16, PAL.ink); px(g, 3, 7, 12, 14, PAL.red);
    px(g, 5, 3, 14, 16, PAL.ink); px(g, 6, 4, 12, 14, PAL.blue);
    px(g, 7, 5, 4, 4, PAL.white);
    disc(g, 17, 15, 6, PAL.ink); disc(g, 17, 15, 5, '#22242e');
    disc(g, 17, 15, 2, PAL.yellow); ring(g, 17, 15, 4, '#3a3d4d');
  }),
  comic: S(24, 24, (g) => {
    px(g, 3, 1, 18, 22, PAL.ink); px(g, 4, 2, 16, 20, PAL.yellow);
    px(g, 4, 2, 16, 5, PAL.red); px(g, 6, 3, 10, 2, PAL.white);      // masthead
    disc(g, 11, 13, 4, PAL.blue); px(g, 9, 16, 4, 5, PAL.blue);      // hero
    px(g, 15, 9, 4, 4, PAL.orange); px(g, 16, 8, 2, 6, PAL.orange);  // burst
    px(g, 4, 20, 16, 2, PAL.dpaper);
  }),
  cards: S(24, 24, (g) => {
    px(g, 1, 5, 12, 16, PAL.ink); px(g, 2, 6, 10, 14, PAL.gray);
    px(g, 5, 3, 12, 17, PAL.ink); px(g, 6, 4, 10, 15, PAL.dpaper);
    px(g, 9, 1, 13, 19, PAL.ink); px(g, 10, 2, 11, 17, PAL.white);
    px(g, 11, 3, 9, 10, PAL.lblue);
    disc(g, 15, 7, 2, PAL.skin); px(g, 13, 9, 5, 3, PAL.red);        // player portrait
    px(g, 11, 14, 7, 1, PAL.dgray); px(g, 11, 16, 5, 1, PAL.dgray);
  }),
  silverware: S(24, 24, (g) => {
    px(g, 4, 2, 2, 18, PAL.gray); px(g, 3, 2, 1, 5, PAL.gray); px(g, 6, 2, 1, 5, PAL.gray);
    px(g, 4, 2, 1, 18, PAL.lmetal);                                   // fork
    px(g, 11, 2, 2, 18, PAL.gray); disc(g, 12, 4, 3, PAL.gray); disc(g, 11, 3, 1, PAL.lmetal);  // spoon
    px(g, 18, 2, 2, 12, PAL.lmetal); px(g, 17, 2, 1, 10, PAL.gray);  // knife
    px(g, 17, 14, 4, 7, PAL.dwood);
    px(g, 2, 20, 20, 3, PAL.dred);                                    // cloth roll
  }),
  china: S(24, 24, (g) => {
    disc(g, 12, 12, 11, PAL.ink);
    disc(g, 12, 12, 10, PAL.white);
    disc(g, 12, 12, 7, '#e7edf4');
    ring(g, 12, 12, 9, PAL.blue);
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2;
      px(g, 12 + Math.round(Math.cos(t) * 8), 12 + Math.round(Math.sin(t) * 8), 1, 1, PAL.blue);
    }
    disc(g, 12, 12, 2, PAL.blue); px(g, 10, 10, 1, 1, PAL.lblue);
  }),
  vase: S(24, 24, (g) => {
    px(g, 9, 1, 6, 3, PAL.ink); px(g, 10, 2, 4, 2, PAL.dgreen);
    px(g, 8, 4, 8, 3, PAL.dgreen);
    for (let yy = 0; yy < 12; yy++) {
      const half = 4 + Math.round(Math.sin((yy / 12) * Math.PI) * 4);
      px(g, 12 - half, 7 + yy, half * 2, 1, PAL.dgreen);
      px(g, 12 - half, 7 + yy, 2, 1, PAL.green);
    }
    px(g, 8, 19, 8, 3, PAL.ink); px(g, 9, 20, 6, 2, PAL.navy);
    px(g, 9, 9, 2, 6, PAL.cyan);                                      // glaze shine
    px(g, 13, 12, 6, 1, PAL.navy); px(g, 15, 10, 1, 5, PAL.navy);    // motif
  }),
  wine: S(24, 24, (g) => {
    px(g, 9, 1, 4, 3, PAL.dred);                                      // foil
    px(g, 10, 3, 2, 6, PAL.ink); px(g, 10, 4, 1, 5, '#2e1a24');
    px(g, 7, 9, 8, 14, PAL.ink);
    px(g, 8, 10, 6, 12, '#3a2030');
    px(g, 8, 10, 2, 12, '#573046');
    px(g, 7, 13, 8, 6, PAL.paper); px(g, 8, 15, 6, 1, PAL.dgray); px(g, 8, 17, 4, 1, PAL.dred);
    speck(g, 7, 9, 8, 14, PAL.dpaper, 15, 6);                         // dust
  }),
  urn: S(24, 24, (g) => {
    px(g, 10, 0, 4, 2, PAL.dgold); px(g, 11, 0, 2, 1, PAL.gold);     // finial
    px(g, 7, 2, 10, 3, PAL.ink); px(g, 8, 3, 8, 2, PAL.dgold);       // lid
    px(g, 6, 5, 12, 14, PAL.ink);
    px(g, 7, 6, 10, 12, PAL.slate);
    px(g, 7, 6, 3, 12, PAL.dgray);
    px(g, 4, 8, 2, 6, PAL.ink); px(g, 18, 8, 2, 6, PAL.ink);         // handles
    px(g, 8, 11, 8, 2, PAL.dgold);                                    // engraved band
    px(g, 7, 19, 10, 3, PAL.ink); px(g, 8, 20, 8, 2, PAL.dgold);
  }),
  harmonica: S(24, 24, (g) => {
    px(g, 1, 8, 22, 8, PAL.ink);
    px(g, 2, 9, 20, 6, PAL.lmetal);
    px(g, 2, 9, 20, 1, '#ffffff');
    px(g, 2, 9, 20, 2, PAL.gold); px(g, 2, 14, 20, 1, PAL.dgold);    // plates
    for (let i = 0; i < 7; i++) px(g, 4 + i * 3, 11, 2, 3, PAL.ink); // holes
    px(g, 1, 8, 3, 8, PAL.gray); px(g, 20, 8, 3, 8, PAL.gray);
  }),
  mic: S(24, 24, (g) => {
    disc(g, 12, 6, 6, PAL.ink);
    disc(g, 12, 6, 5, PAL.gray);
    speck(g, 8, 2, 9, 8, PAL.dgray, 21, 14);                          // mesh
    disc(g, 10, 4, 1, '#ffffff');
    px(g, 10, 12, 4, 8, PAL.ink); px(g, 11, 12, 2, 8, PAL.slate);    // taper body
    px(g, 11, 20, 2, 2, PAL.dgray);
    px(g, 13, 21, 4, 1, PAL.dgray); px(g, 16, 19, 3, 2, PAL.dgray);  // cable curl
  }),
  pedal: S(24, 24, (g) => {
    bevelBox(g, 2, 3, 20, 18, PAL.orange, '#f9a583', PAL.dred);
    disc(g, 8, 8, 2, PAL.ink); disc(g, 8, 8, 1, PAL.white);          // knobs
    disc(g, 16, 8, 2, PAL.ink); disc(g, 16, 8, 1, PAL.white);
    px(g, 6, 12, 12, 3, PAL.paper); px(g, 8, 13, 8, 1, PAL.ink);     // label
    disc(g, 12, 18, 3, PAL.ink); disc(g, 12, 18, 2, PAL.gray); px(g, 11, 17, 1, 1, '#ffffff');  // switch
    px(g, 0, 9, 2, 3, PAL.gray); px(g, 22, 9, 2, 3, PAL.gray);       // jacks
  }),
  wrench: S(24, 24, (g) => {
    pline(g, 6, 18, 17, 7, 3, PAL.gray);                              // shaft
    pline(g, 7, 17, 17, 7, 1, PAL.lmetal);
    // open-end jaw (top right): two prongs
    pline(g, 17, 7, 21, 3, 3, PAL.gray);
    px(g, 15, 2, 4, 3, PAL.gray); px(g, 20, 6, 3, 4, PAL.gray);
    px(g, 18, 4, 3, 3, '#14161f');                                    // jaw gap
    px(g, 15, 2, 2, 2, PAL.lmetal);
    // box end (bottom left)
    disc(g, 6, 18, 4, PAL.gray);
    disc(g, 6, 18, 2, '#14161f');
    px(g, 4, 15, 2, 1, PAL.lmetal);
    sparkle(g, 19, 12, '#ffffff');
  }),
  gameCart: S(24, 24, (g) => {
    px(g, 4, 2, 16, 20, PAL.ink);
    px(g, 5, 3, 14, 18, PAL.dgray);
    for (let i = 0; i < 3; i++) px(g, 6, 4 + i * 2, 12, 1, PAL.slate);  // grip ridges
    px(g, 6, 10, 12, 9, PAL.white);
    px(g, 7, 11, 10, 5, PAL.blue);
    px(g, 9, 12, 3, 3, PAL.yellow); px(g, 13, 12, 3, 2, PAL.red);    // label art
    px(g, 7, 17, 8, 1, PAL.dgray);
  }),
  walkman: S(24, 24, (g) => {
    bevelBox(g, 3, 3, 18, 18, PAL.blue, PAL.lblue, PAL.navy);
    px(g, 6, 7, 12, 8, PAL.ink); px(g, 7, 8, 10, 6, '#22242e');      // window
    disc(g, 10, 11, 2, PAL.white); disc(g, 15, 11, 2, PAL.white);    // reels
    disc(g, 10, 11, 1, PAL.ink); disc(g, 15, 11, 1, PAL.ink);
    px(g, 6, 17, 3, 2, PAL.gray); px(g, 11, 17, 3, 2, PAL.gray); px(g, 16, 17, 2, 2, PAL.orange);
    px(g, 21, 6, 2, 6, PAL.gray);                                     // clip
  }),
  knife: S(24, 24, (g) => {
    for (let i = 0; i < 10; i++) px(g, 2 + i, 12 - i, 4, 2, PAL.lmetal);
    for (let i = 0; i < 10; i++) px(g, 2 + i, 13 - i, 1, 1, PAL.gray);
    px(g, 12, 2, 2, 2, PAL.lmetal);                                   // tip
    px(g, 11, 12, 3, 4, PAL.dgold);                                   // guard
    for (let i = 0; i < 5; i++) px(g, 13 + i, 15 + i, 4, 2, PAL.dwood);
    for (let i = 0; i < 5; i++) px(g, 13 + i, 16 + i, 4, 1, PAL.wood);
  }),
  cashWad: S(24, 24, (g) => {
    px(g, 2, 8, 20, 12, PAL.ink);
    px(g, 3, 9, 18, 10, PAL.green);
    px(g, 3, 9, 18, 2, '#5ed188');
    px(g, 3, 17, 18, 2, PAL.dgreen);
    for (let i = 0; i < 4; i++) px(g, 4, 11 + i * 2, 16, 1, 'rgba(37,113,121,0.55)');  // bill edges
    px(g, 9, 7, 6, 14, PAL.paper);                                    // band
    px(g, 11, 12, 2, 3, PAL.dgreen); px(g, 10, 11, 1, 1, PAL.dgreen);// $
  }),
  coinJar: S(24, 24, (g) => {
    px(g, 6, 1, 12, 3, PAL.ink); px(g, 7, 2, 10, 2, PAL.dgray);      // lid
    px(g, 4, 4, 16, 18, PAL.ink);
    px(g, 5, 5, 14, 16, 'rgba(115,239,247,0.35)');
    px(g, 5, 12, 14, 9, PAL.dgold);                                   // coin heap
    for (const [cx, cy] of [[8, 13], [12, 12], [16, 14], [10, 16], [14, 17]])
      { disc(g, cx, cy, 2, PAL.gold); px(g, cx - 1, cy - 1, 1, 1, PAL.ggold); }
    px(g, 6, 6, 2, 14, 'rgba(255,255,255,0.5)');                      // glass shine
  }),
  goldBar: S(24, 24, (g) => {
    for (let yy = 0; yy < 8; yy++) px(g, 5 - Math.floor(yy / 3), 8 + yy, 14 + Math.floor(yy / 3) * 2, 1, PAL.ink);
    for (let yy = 1; yy < 7; yy++) px(g, 6 - Math.floor(yy / 3), 9 + yy, 12 + Math.floor(yy / 3) * 2, 1, PAL.gold);
    px(g, 6, 9, 12, 2, PAL.ggold);
    px(g, 5, 14, 15, 1, PAL.dgold);
    px(g, 8, 11, 8, 3, PAL.dgold); px(g, 9, 12, 6, 1, PAL.gold);     // stamp
    sparkle(g, 5, 8, '#ffffff'); sparkle(g, 19, 12, '#fff3c0');
  }),
  ring: S(24, 24, (g) => {
    ring(g, 12, 14, 7, PAL.dgold);
    ring(g, 12, 14, 6, PAL.gold);
    ring(g, 12, 14, 5, PAL.dgold);
    px(g, 9, 5, 6, 4, PAL.ink);
    px(g, 10, 4, 4, 5, PAL.cyan);
    px(g, 10, 4, 2, 2, '#d9fbff');
    px(g, 8, 7, 2, 2, PAL.gold); px(g, 14, 7, 2, 2, PAL.gold);       // prongs
    sparkle(g, 15, 3, '#ffffff');
  }),
  necklace: S(24, 24, (g) => {
    for (let a = 0; a < 20; a++) {
      const t = Math.PI * (0.15 + (a / 20) * 0.7);
      px(g, 12 + Math.round(Math.cos(t) * 9), 4 + Math.round(Math.sin(t) * 9), 1, 1, PAL.gold);
    }
    px(g, 11, 13, 3, 2, PAL.dgold);
    px(g, 10, 15, 5, 5, PAL.ink);
    px(g, 11, 16, 3, 3, PAL.red);
    px(g, 11, 16, 1, 1, PAL.lred);
    sparkle(g, 16, 18, '#ffd9e2');
  }),
  watch: S(24, 24, (g) => {
    px(g, 9, 1, 6, 5, PAL.dwood); px(g, 10, 1, 2, 5, PAL.wood);      // strap up
    px(g, 9, 18, 6, 5, PAL.dwood); px(g, 10, 18, 2, 5, PAL.wood);
    disc(g, 12, 12, 7, PAL.ink);
    disc(g, 12, 12, 6, PAL.gold);
    disc(g, 12, 12, 4, PAL.white);
    px(g, 12, 9, 1, 3, PAL.ink); px(g, 12, 12, 3, 1, PAL.ink);       // hands
    px(g, 20, 11, 2, 2, PAL.gold);                                    // crown
    px(g, 9, 8, 2, 1, PAL.ggold);
  }),
  gem: S(24, 24, (g) => {
    px(g, 7, 5, 10, 3, PAL.ink); px(g, 8, 6, 8, 2, PAL.cyan);
    px(g, 5, 8, 14, 4, PAL.ink); px(g, 6, 9, 12, 2, PAL.lblue);
    px(g, 7, 12, 10, 3, PAL.ink); px(g, 8, 12, 8, 3, PAL.blue);
    px(g, 9, 15, 6, 3, PAL.ink); px(g, 10, 15, 4, 2, PAL.navy);
    px(g, 11, 17, 2, 2, PAL.ink);
    px(g, 8, 6, 3, 2, '#d9fbff'); px(g, 6, 9, 2, 1, '#d9fbff');
    sparkle(g, 17, 4, '#ffffff'); sparkle(g, 4, 14, '#bff5ff');
  }),
  camera: S(24, 24, (g) => {
    px(g, 2, 7, 20, 13, PAL.ink);
    px(g, 3, 8, 18, 11, PAL.slate);
    px(g, 3, 8, 18, 4, PAL.gray);                                     // top plate
    px(g, 8, 4, 6, 3, PAL.ink); px(g, 9, 5, 4, 2, PAL.gray);         // prism
    disc(g, 12, 14, 5, PAL.ink);
    disc(g, 12, 14, 4, PAL.dgray);
    disc(g, 12, 14, 2, PAL.navy);
    px(g, 10, 12, 1, 1, PAL.lblue);
    px(g, 18, 9, 3, 2, PAL.red);                                      // shutter
    px(g, 4, 9, 3, 2, PAL.white);                                     // flash
  }),
  revolver: S(24, 24, (g) => {
    px(g, 2, 8, 14, 3, PAL.ink); px(g, 3, 9, 12, 1, PAL.gray);       // barrel
    px(g, 2, 7, 2, 1, PAL.gray);                                      // sight
    px(g, 8, 11, 6, 5, PAL.ink); px(g, 9, 12, 4, 3, PAL.dgray);      // cylinder
    px(g, 10, 13, 1, 1, PAL.ink); px(g, 12, 13, 1, 1, PAL.ink);
    px(g, 15, 11, 2, 2, PAL.ink);                                     // hammer
    for (let i = 0; i < 5; i++) px(g, 12 + i, 15 + i, 4, 2, PAL.dwood);
    for (let i = 0; i < 5; i++) px(g, 12 + i, 16 + i, 4, 1, PAL.wood);
    px(g, 9, 16, 3, 3, PAL.ink);                                      // trigger guard
  }),
  massager: S(24, 24, (g) => {
    disc(g, 12, 6, 5, PAL.ink);
    disc(g, 12, 6, 4, PAL.pink);
    disc(g, 10, 4, 1, PAL.lpink);
    px(g, 9, 10, 6, 8, PAL.ink); px(g, 10, 11, 4, 7, PAL.pink);      // shaft
    px(g, 10, 11, 1, 7, PAL.lpink);
    px(g, 8, 18, 8, 5, PAL.ink); px(g, 9, 19, 6, 3, PAL.purple);     // base
    disc(g, 12, 20, 1, PAL.white);                                    // dial
  }),
  underwear: S(24, 24, (g) => {
    px(g, 2, 6, 20, 5, PAL.ink);
    px(g, 3, 7, 18, 3, PAL.white);                                    // waistband
    px(g, 3, 10, 18, 4, PAL.pink);
    px(g, 3, 14, 6, 4, PAL.pink); px(g, 15, 14, 6, 4, PAL.pink);
    px(g, 9, 14, 6, 2, PAL.pink);
    px(g, 4, 11, 3, 2, PAL.lpink);
    px(g, 11, 12, 2, 2, PAL.red); px(g, 10, 11, 1, 1, PAL.red); px(g, 13, 11, 1, 1, PAL.red);  // heart
    for (let i = 0; i < 6; i++) px(g, 4 + i * 3, 17, 1, 1, PAL.lpink);  // lace dots
  }),
  teddy: S(24, 24, (g) => {
    disc(g, 7, 5, 3, PAL.ink); disc(g, 17, 5, 3, PAL.ink);
    disc(g, 7, 5, 2, PAL.wood); disc(g, 17, 5, 2, PAL.dwood);
    disc(g, 12, 9, 6, PAL.ink); disc(g, 12, 9, 5, PAL.lwood);
    disc(g, 12, 11, 3, PAL.pwood);                                    // muzzle
    px(g, 9, 7, 2, 2, PAL.ink);                                       // button eye
    px(g, 14, 7, 1, 1, PAL.ink); px(g, 16, 7, 1, 1, PAL.ink); px(g, 15, 8, 1, 1, PAL.ink);  // X eye
    px(g, 11, 11, 2, 1, PAL.ink);
    px(g, 8, 14, 8, 8, PAL.ink); px(g, 9, 15, 6, 6, PAL.lwood);
    px(g, 5, 15, 3, 5, PAL.ink); px(g, 16, 15, 3, 5, PAL.ink);
    px(g, 6, 16, 2, 3, PAL.wood); px(g, 17, 16, 1, 3, PAL.wood);
    px(g, 11, 17, 1, 3, PAL.dwood); px(g, 12, 18, 2, 1, PAL.dwood);  // stitch
  }),
  medal: S(24, 24, (g) => {
    px(g, 8, 1, 8, 8, PAL.ink);
    px(g, 9, 2, 3, 7, PAL.red); px(g, 12, 2, 3, 7, PAL.white);
    px(g, 9, 6, 6, 3, PAL.blue);
    disc(g, 12, 15, 6, PAL.ink);
    disc(g, 12, 15, 5, PAL.gold);
    ring(g, 12, 15, 4, PAL.dgold);
    // star
    px(g, 12, 12, 1, 2, PAL.dgold); px(g, 10, 14, 5, 1, PAL.dgold);
    px(g, 11, 15, 3, 1, PAL.dgold); px(g, 10, 17, 2, 1, PAL.dgold); px(g, 13, 17, 2, 1, PAL.dgold);
    sparkle(g, 16, 11, '#fff3c0');
  }),
  diary: S(24, 24, (g) => {
    px(g, 3, 2, 17, 20, PAL.ink);
    px(g, 4, 3, 15, 18, PAL.purple);
    px(g, 4, 3, 3, 18, '#733a73');
    px(g, 6, 5, 11, 4, PAL.dgold); px(g, 7, 6, 9, 2, PAL.gold);      // title plate
    px(g, 18, 9, 4, 6, PAL.ink); px(g, 19, 10, 2, 4, PAL.gold);      // clasp
    px(g, 8, 13, 8, 1, 'rgba(255,255,255,0.25)'); px(g, 8, 16, 6, 1, 'rgba(255,255,255,0.25)');
  }),
  bowlingTrophy: S(22, 28, (g) => {
    // the little gold bowler on the rim, mid-throw (his ball is long gone)
    px(g, 9, 0, 4, 3, PAL.ink); px(g, 10, 0, 2, 2, PAL.gold);                // head
    px(g, 8, 2, 5, 5, PAL.ink); px(g, 9, 3, 3, 3, PAL.gold);                 // body
    px(g, 12, 2, 4, 3, PAL.ink); px(g, 13, 3, 2, 1, PAL.gold);               // arm, swung back
    px(g, 8, 6, 6, 3, PAL.ink); px(g, 9, 6, 1, 2, PAL.gold); px(g, 12, 6, 1, 2, PAL.gold);   // legs, in stride
    // the cup
    px(g, 4, 8, 14, 2, PAL.ink); px(g, 5, 8, 12, 1, PAL.ggold);              // rim
    px(g, 5, 10, 12, 6, PAL.ink); px(g, 6, 10, 10, 5, PAL.gold);             // bowl
    px(g, 6, 15, 10, 2, PAL.ink); px(g, 7, 15, 8, 1, PAL.gold);              // the taper
    px(g, 7, 10, 2, 4, PAL.ggold); px(g, 14, 10, 2, 5, PAL.dgold);           // light and shade
    px(g, 1, 9, 4, 7, PAL.ink); px(g, 2, 10, 2, 1, PAL.gold); px(g, 2, 10, 1, 4, PAL.gold); px(g, 2, 13, 3, 1, PAL.gold);    // left handle
    px(g, 17, 9, 4, 7, PAL.ink); px(g, 18, 10, 2, 1, PAL.gold); px(g, 19, 10, 1, 4, PAL.gold); px(g, 17, 13, 3, 1, PAL.gold); // right handle
    // stem, foot and plinth
    px(g, 9, 17, 4, 5, PAL.ink); px(g, 10, 17, 2, 4, PAL.dgold);
    px(g, 7, 20, 8, 2, PAL.ink); px(g, 8, 20, 6, 1, PAL.gold);
    px(g, 3, 22, 16, 6, PAL.ink); px(g, 4, 23, 14, 4, PAL.dwood);            // wooden plinth
    px(g, 7, 24, 8, 2, PAL.gold); px(g, 8, 24, 6, 1, PAL.ggold);             // the plate
    sparkle(g, 15, 11, '#fff3c0');
  }),

  // ================= LEGENDARIES =================
  goldJacket: S(40, 40, (g) => {
    // hanger hook
    px(g, 19, 0, 2, 4, PAL.gray); px(g, 17, 0, 4, 1, PAL.gray);
    // shoulders + torso silhouette
    px(g, 6, 6, 28, 4, PAL.ink);                                      // shoulder line
    px(g, 10, 5, 20, 3, PAL.ink);
    px(g, 11, 6, 18, 2, PAL.gold);
    px(g, 7, 7, 26, 2, PAL.gold);
    // sleeves flared out
    px(g, 3, 9, 8, 22, PAL.ink); px(g, 4, 10, 6, 20, PAL.gold);
    px(g, 4, 10, 2, 20, PAL.ggold);
    px(g, 29, 9, 8, 22, PAL.ink); px(g, 30, 10, 6, 20, PAL.gold);
    px(g, 34, 10, 2, 20, PAL.dgold);
    px(g, 4, 30, 6, 3, PAL.dgold); px(g, 30, 30, 6, 3, PAL.dgold);   // cuffs
    // torso, open front showing dark shirt
    px(g, 11, 9, 18, 28, PAL.ink);
    px(g, 12, 10, 16, 26, PAL.gold);
    px(g, 17, 10, 6, 24, '#141018');                                  // open V / shirt
    px(g, 15, 10, 3, 8, PAL.ggold); px(g, 22, 10, 3, 8, PAL.ggold);  // lapels
    px(g, 13, 34, 14, 3, PAL.dgold);                                  // hem
    px(g, 12, 10, 2, 24, PAL.ggold);                                  // left body light
    for (const [sx, sy] of [[7, 14], [33, 22], [14, 24], [26, 15], [9, 27], [25, 31]]) sparkle(g, sx, sy, '#ffffff');
  }),
  // ---- story pieces ----
  photo: S(24, 24, (g) => {
    px(g, 3, 4, 18, 17, PAL.ink); px(g, 4, 5, 16, 15, PAL.paper);
    px(g, 5, 6, 14, 12, '#8a7050'); px(g, 5, 6, 14, 4, '#b09070');       // sepia sky
    px(g, 9, 9, 4, 6, '#3a2a1a'); px(g, 10, 8, 2, 2, '#d8b898');          // a figure
    px(g, 14, 11, 3, 4, '#3a2a1a'); px(g, 15, 10, 1, 1, '#d8b898');        // another
    px(g, 5, 15, 14, 3, '#5a4a30');                                       // ground
    px(g, 4, 5, 16, 1, PAL.white); px(g, 4, 19, 16, 1, PAL.dpaper);       // the border
    px(g, 16, 6, 3, 2, 'rgba(255,255,255,0.35)');                         // a glare
  }),
  rabbitCage: S(44, 36, (g) => {
    px(g, 2, 6, 40, 28, PAL.ink); px(g, 3, 7, 38, 26, '#2a2a30');
    for (let x = 6; x < 40; x += 5) px(g, x, 8, 1, 24, PAL.lmetal);       // bars
    for (let y = 12; y < 32; y += 6) px(g, 4, y, 36, 1, PAL.gray);
    px(g, 2, 30, 40, 4, PAL.ink); px(g, 3, 31, 38, 2, PAL.dwood);         // tray
    px(g, 8, 27, 12, 3, '#8a7a40');                                       // straw
    px(g, 26, 2, 12, 5, PAL.ink); px(g, 27, 3, 10, 3, PAL.red);           // a scarf caught on top
    px(g, 20, 3, 4, 4, PAL.ink); px(g, 21, 4, 2, 2, PAL.gold);            // the latch
  }),
  magicKit: S(24, 24, (g) => {
    px(g, 3, 12, 18, 9, PAL.ink); px(g, 4, 13, 16, 7, '#2a1a3a');         // top hat brim/box
    px(g, 7, 4, 10, 9, PAL.ink); px(g, 8, 5, 8, 8, '#1a1a2a');            // the hat
    px(g, 8, 10, 8, 2, PAL.red);                                          // hat band
    pline(g, 2, 21, 20, 3, 1, PAL.ink); pline(g, 3, 20, 19, 4, 1, PAL.white);   // wand
    px(g, 17, 3, 3, 3, PAL.white);                                        // wand tip
    sparkle(g, 21, 8, PAL.yellow);
  }),
  canCrate: S(44, 30, (g, C, r) => {
    px(g, 2, 8, 40, 20, PAL.ink); px(g, 3, 9, 38, 18, PAL.dwood);
    px(g, 3, 9, 38, 2, PAL.wood); px(g, 3, 25, 38, 2, '#3a2a1a');
    for (let i = 0; i < 6; i++) {                                         // cans on top
      const x = 5 + i * 6;
      px(g, x, 2, 5, 8, PAL.ink); px(g, x + 1, 3, 3, 6, PAL.lmetal);
      px(g, x + 1, 5, 3, 2, i % 2 ? PAL.red : PAL.green);                 // labels
    }
    px(g, 6, 14, 32, 8, '#2a1a0a'); px(g, 8, 16, 28, 4, PAL.paper);       // stencil strip
  }),
  console: S(40, 24, (g) => {
    px(g, 2, 8, 30, 14, PAL.ink); px(g, 3, 9, 28, 12, PAL.gray);
    px(g, 3, 9, 28, 3, PAL.lmetal);                                       // top
    px(g, 8, 13, 14, 2, PAL.ink); px(g, 9, 13, 12, 1, '#2a2a30');         // cartridge slot
    px(g, 24, 15, 5, 3, PAL.red); px(g, 26, 16, 1, 1, PAL.white);         // power switch
    px(g, 33, 12, 6, 9, PAL.ink); px(g, 34, 13, 4, 7, PAL.dgray);         // controller
    px(g, 35, 14, 2, 2, PAL.red); px(g, 35, 17, 2, 2, PAL.lblue);
    pline(g, 31, 15, 33, 15, 1, PAL.ink);
  }),
  skateboard: S(40, 18, (g) => {
    px(g, 2, 4, 36, 6, PAL.ink); px(g, 3, 5, 34, 4, PAL.dwood);
    px(g, 3, 5, 34, 1, PAL.wood);
    px(g, 1, 6, 2, 3, PAL.ink); px(g, 37, 6, 2, 3, PAL.ink);              // kick tails
    px(g, 8, 10, 6, 5, PAL.ink); px(g, 9, 11, 4, 3, PAL.orange);          // wheels
    px(g, 26, 10, 6, 5, PAL.ink); px(g, 27, 11, 4, 3, PAL.orange);
    px(g, 12, 6, 16, 2, PAL.red); px(g, 16, 6, 3, 2, PAL.white);          // a sticker
  }),
  poster: S(24, 24, (g) => {
    px(g, 6, 2, 12, 20, PAL.ink); px(g, 7, 3, 10, 18, PAL.paper);
    px(g, 7, 3, 10, 2, PAL.dpaper); px(g, 7, 19, 10, 2, PAL.dpaper);
    px(g, 9, 7, 6, 8, PAL.red); px(g, 10, 8, 4, 6, PAL.pink);             // a face, a band, a car
    px(g, 8, 16, 8, 1, PAL.dgray);
    px(g, 4, 8, 3, 3, PAL.ink); px(g, 17, 14, 3, 3, PAL.ink);             // tape corners
  }),
  prototype: S(24, 24, (g) => {
    px(g, 3, 6, 18, 14, PAL.ink); px(g, 4, 7, 16, 12, PAL.slate);
    px(g, 4, 7, 16, 2, PAL.gray);
    px(g, 7, 11, 5, 4, PAL.ink); px(g, 8, 12, 3, 2, PAL.green);           // a readout
    px(g, 14, 11, 3, 3, PAL.ink); px(g, 15, 12, 1, 1, PAL.red);           // a light
    px(g, 6, 17, 12, 1, PAL.paper);                                       // masking-tape label
    px(g, 10, 3, 4, 3, PAL.ink); px(g, 11, 2, 2, 2, PAL.lmetal);          // an antenna stub
    px(g, 17, 5, 5, 1, PAL.dgray);                                        // a wire that goes nowhere
  }),
  oddKey: S(24, 24, (g) => {
    disc(g, 7, 8, 5, PAL.ink); disc(g, 7, 8, 4, '#8a6a2a'); disc(g, 7, 8, 2, PAL.ink);    // the bow
    px(g, 6, 5, 2, 1, PAL.ggold);
    pline(g, 10, 10, 20, 20, 3, PAL.ink); pline(g, 10, 10, 20, 20, 1, '#8a6a2a');          // the shank
    px(g, 17, 20, 4, 2, PAL.ink); px(g, 18, 20, 2, 1, '#8a6a2a');                          // the bit
    px(g, 19, 17, 3, 2, PAL.ink); px(g, 20, 17, 1, 1, '#8a6a2a');
    px(g, 5, 7, 4, 2, '#3a2a10');                                                          // a stamped number, unreadable
  }),
  // Lady Vermillion's Cameo: a shell profile in a gold oval. She is not smiling.
  cameo: S(24, 24, (g) => {
    for (let yy = 0; yy < 20; yy++) {
      const half = Math.round(8 * Math.sqrt(1 - Math.pow((yy - 9.5) / 10, 2)));
      px(g, 12 - half - 1, 2 + yy, half * 2 + 2, 1, PAL.ink);
    }
    for (let yy = 1; yy < 19; yy++) {
      const half = Math.round(7 * Math.sqrt(1 - Math.pow((yy - 9.5) / 9.5, 2)));
      px(g, 12 - half, 2 + yy, half * 2, 1, PAL.gold);
      px(g, 12 - half, 2 + yy, 1, 1, PAL.ggold);
    }
    for (let yy = 3; yy < 17; yy++) {
      const half = Math.round(5 * Math.sqrt(1 - Math.pow((yy - 9.5) / 7.5, 2)));
      px(g, 12 - half, 2 + yy, half * 2, 1, '#c8735a');                // coral ground
    }
    px(g, 10, 6, 4, 8, PAL.paper); px(g, 9, 8, 2, 4, PAL.paper);      // the profile
    px(g, 13, 9, 2, 1, PAL.paper); px(g, 13, 11, 1, 1, PAL.paper);    // nose, chin
    px(g, 9, 5, 5, 2, PAL.dpaper); px(g, 8, 6, 2, 3, PAL.dpaper);     // hair
    px(g, 11, 15, 3, 2, PAL.paper);                                   // neck
    sparkle(g, 19, 3, PAL.ggold);
  }),
  // the Inverted Kettle Sheet: a block of stamps, one printed upside down, worth a house
  stampSheet: S(24, 24, (g) => {
    px(g, 2, 3, 20, 18, PAL.ink);
    px(g, 3, 4, 18, 16, PAL.paper);
    for (let i = 0; i < 4; i++) px(g, 3 + i * 5, 4, 1, 16, PAL.dpaper);   // perforations
    for (let j = 0; j < 4; j++) px(g, 3, 4 + j * 5, 18, 1, PAL.dpaper);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = 5 + i * 5, y = 6 + j * 5;
      px(g, x, y, 3, 3, PAL.lblue);                                    // a blue kettle
      px(g, x + 1, i === 1 && j === 1 ? y + 2 : y, 1, 1, PAL.navy);   // the middle one is upside down
    }
    px(g, 3, 20, 18, 1, 'rgba(0,0,0,0.2)');
    sparkle(g, 21, 2, PAL.white);
  }),
  // the Pageant Crown: real stones on a real band. Somebody's daughter cried when it went into storage.
  pageantCrown: S(32, 24, (g) => {
    for (let x = 3; x < 29; x++) {
      const arc = Math.round(Math.sqrt(Math.max(0, 169 - (x - 16) * (x - 16))) * 0.5);
      px(g, x, 19 - arc, 1, 3, PAL.gold);
      px(g, x, 19 - arc, 1, 1, PAL.ggold);
    }
    for (const [sx2, h, c] of [[6, 5, PAL.pink], [11, 8, PAL.cyan], [16, 11, PAL.white], [21, 8, PAL.cyan], [26, 5, PAL.pink]]) {
      px(g, sx2 - 1, 13 - h, 2, h + 2, PAL.gold);                    // points
      px(g, sx2 - 1, 13 - h, 1, h, PAL.ggold);
      disc(g, sx2, 12 - h, 2, PAL.ink); disc(g, sx2, 12 - h, 1, c);  // stones
    }
    px(g, 8, 17, 16, 1, PAL.red);                                     // velvet band
    sparkle(g, 16, 0, '#ffffff'); sparkle(g, 28, 6, PAL.ggold); sparkle(g, 3, 8, PAL.ggold);
  }),
  // the Marrow Creek Thing: a big jar, old fluid, a shape that is mostly not looking at you
  jarThing: S(24, 32, (g) => {
    px(g, 7, 1, 10, 4, PAL.ink); px(g, 8, 2, 8, 2, PAL.dgray);        // lid
    px(g, 4, 5, 16, 25, PAL.ink);
    px(g, 5, 6, 14, 23, '#5a6a3a');                                   // old fluid
    px(g, 5, 6, 14, 3, '#7a8a4a');                                    // the surface, lighter
    px(g, 6, 7, 2, 20, 'rgba(255,255,255,0.18)');                     // glass highlight
    disc(g, 12, 18, 5, '#2a2a22');                                    // the shape
    disc(g, 11, 17, 4, '#3a3a2c');
    px(g, 8, 22, 3, 5, '#2a2a22'); px(g, 14, 21, 2, 6, '#2a2a22');    // something like limbs
    px(g, 13, 16, 3, 3, PAL.white); px(g, 14, 17, 1, 1, PAL.ink);     // one eye. open.
    px(g, 4, 28, 16, 2, '#3a4a2a');                                   // sediment
    px(g, 6, 12, 1, 1, '#9aaa6a'); px(g, 16, 9, 1, 1, '#9aaa6a');     // a bubble, a bubble
    px(g, 5, 24, 5, 3, PAL.paper); px(g, 6, 25, 3, 1, PAL.dgray);     // the label, unreadable
  }),
  // the Founders' Gavel: black walnut, a brass band, a head worn flat on one side by thirty years of one man
  gavel: S(24, 24, (g) => {
    pline(g, 5, 19, 15, 9, 2, PAL.ink);                               // handle outline
    pline(g, 6, 18, 14, 10, 1, PAL.dwood);
    px(g, 14, 3, 8, 8, PAL.ink);                                      // head
    px(g, 15, 4, 6, 6, PAL.dwood);
    px(g, 15, 4, 6, 2, PAL.wood);                                     // top light
    px(g, 17, 4, 2, 6, PAL.gold); px(g, 17, 4, 2, 1, PAL.ggold);       // brass band
    px(g, 20, 9, 1, 1, '#2a1a0a');                                    // the worn flat side
    px(g, 4, 18, 3, 3, PAL.ink); px(g, 5, 19, 1, 1, PAL.gold);         // handle cap
    px(g, 2, 21, 10, 2, PAL.ink); px(g, 3, 21, 8, 1, PAL.dwood);       // the block
    sparkle(g, 21, 2, PAL.ggold);
  }),
  // the original deed: brown iron-gall ink, a wax seal cracked through the G
  deed: S(24, 24, (g) => {
    px(g, 3, 2, 18, 20, PAL.ink);
    px(g, 4, 3, 16, 18, PAL.dpaper);
    px(g, 4, 3, 16, 2, PAL.paper); px(g, 4, 19, 16, 2, '#a8946a');   // curl top, shadow bottom
    px(g, 6, 7, 12, 1, '#5a3a1a'); px(g, 6, 9, 10, 1, '#5a3a1a');     // brown lines of ink
    px(g, 6, 11, 12, 1, '#5a3a1a'); px(g, 6, 13, 8, 1, '#5a3a1a');
    px(g, 6, 5, 8, 1, '#3a2410');                                     // the heading, darker
    disc(g, 16, 16, 3, PAL.dred); disc(g, 16, 16, 2, PAL.red);        // wax seal
    px(g, 16, 14, 1, 5, PAL.dred);                                    // the crack through it
    px(g, 2, 1, 2, 22, PAL.ink); px(g, 20, 1, 2, 22, PAL.ink);        // rolled edges
    px(g, 2, 2, 1, 20, '#a8946a'); px(g, 21, 2, 1, 20, '#a8946a');
  }),
  // the Dry Creek Nugget: a fist of gold that has been in a sock since 1881
  nugget: S(24, 24, (g) => {
    disc(g, 12, 13, 9, PAL.ink);
    disc(g, 12, 13, 8, PAL.dgold);
    disc(g, 10, 11, 5, PAL.gold);
    disc(g, 15, 9, 3, PAL.gold); disc(g, 8, 16, 3, PAL.dgold);        // lumps
    px(g, 7, 8, 3, 2, PAL.ggold); px(g, 13, 7, 2, 2, PAL.ggold);       // the shine on top
    px(g, 15, 16, 3, 3, '#7a5a14'); px(g, 9, 18, 2, 2, '#7a5a14');     // quartz-dark pits
    px(g, 18, 12, 2, 2, PAL.white); px(g, 17, 14, 1, 1, PAL.white);   // a fleck of quartz
    sparkle(g, 20, 5, PAL.ggold); sparkle(g, 3, 19, '#fff3b0');
  }),
  moonRock: S(28, 24, (g) => {
    disc(g, 14, 13, 10, PAL.ink);
    disc(g, 14, 13, 9, PAL.dgray);
    disc(g, 10, 10, 3, PAL.slate); disc(g, 18, 16, 2, PAL.slate); disc(g, 17, 9, 1, PAL.slate);  // craters
    disc(g, 9, 9, 1, PAL.gray);
    px(g, 13, 6, 2, 3, PAL.cyan); px(g, 20, 13, 2, 2, PAL.cyan); px(g, 8, 17, 2, 2, PAL.cyan);   // crystals
    px(g, 13, 5, 1, 1, '#d9fbff'); px(g, 20, 12, 1, 1, '#d9fbff');
    sparkle(g, 23, 6, '#bff5ff');
  }),
  jewelEgg: S(24, 32, (g) => {
    for (let yy = 0; yy < 20; yy++) {
      const half = Math.round(7.5 * Math.sqrt(1 - Math.pow((yy - 11) / 12, 2)) + (yy < 8 ? -1 + yy * 0.12 : 0));
      px(g, 12 - half, 3 + yy, half * 2, 1, PAL.gold);
      px(g, 12 - half, 3 + yy, 2, 1, PAL.ggold);
      px(g, 10 + half, 3 + yy, 1, 1, PAL.dgold);
    }
    px(g, 5, 12, 14, 2, PAL.red);                                     // band
    px(g, 11, 8, 3, 3, PAL.cyan); px(g, 7, 16, 2, 2, PAL.green); px(g, 15, 16, 2, 2, PAL.blue);
    px(g, 8, 24, 8, 2, PAL.dgold); px(g, 6, 26, 12, 3, PAL.ink); px(g, 7, 27, 10, 2, PAL.dgold);  // stand
    sparkle(g, 16, 6, '#ffffff');
  }),

  mystery: S(32, 32, (g) => {
    bevelBox(g, 2, 2, 28, 28, PAL.purple, '#8a4a8a', '#3a1a3a');
    px(g, 11, 8, 10, 3, PAL.yellow); px(g, 18, 11, 3, 4, PAL.yellow);
    px(g, 14, 15, 4, 4, PAL.yellow); px(g, 14, 23, 4, 3, PAL.yellow);
  }),
};

// ================= PORTRAITS (32x32) =================
function faceBase(g, skin, shade) {
  px(g, 7, 8, 18, 16, PAL.ink);
  px(g, 8, 9, 16, 14, skin);
  px(g, 21, 10, 3, 12, shade);                                        // cheek shade
  px(g, 10, 26, 12, 6, PAL.ink);
  px(g, 11, 27, 10, 5, PAL.slate);                                    // shoulders
  px(g, 13, 23, 6, 3, skin);                                          // neck
}
function eyes(g, x1, x2, y, c) {
  px(g, x1, y, 3, 3, PAL.white); px(g, x2, y, 3, 3, PAL.white);
  px(g, x1 + 1, y + 1, 2, 2, c || PAL.ink); px(g, x2 + 1, y + 1, 2, 2, c || PAL.ink);
}
const PORTRAITS = {
  vera: (g) => {
    px(g, 0, 0, 32, 32, '#241a20');
    faceBase(g, PAL.skin, PAL.skin2);
    // sculpted dark hair, velvet collar, city-money earrings
    px(g, 6, 6, 20, 6, PAL.ink);
    px(g, 6, 8, 4, 12, PAL.ink); px(g, 22, 8, 4, 12, PAL.ink);
    px(g, 7, 7, 18, 2, '#3a2a3a');
    eyes(g, 11, 18, 14, PAL.purple);
    px(g, 11, 13, 3, 1, PAL.ink); px(g, 18, 13, 3, 1, PAL.ink);      // sharp brows
    px(g, 14, 20, 4, 1, PAL.red);                                     // lipstick
    px(g, 8, 19, 2, 2, PAL.gold); px(g, 22, 19, 2, 2, PAL.gold);     // earrings
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.purple); // velvet
    px(g, 14, 27, 4, 2, PAL.white);
  },
  tuck: (g) => {
    px(g, 0, 0, 32, 32, '#1c1e18');
    faceBase(g, PAL.skin2, '#a06a40');
    // hat low, eyes lower, mouth optional
    px(g, 4, 6, 24, 4, PAL.ink);
    px(g, 6, 2, 20, 5, PAL.dwood); px(g, 6, 6, 20, 2, PAL.wood);     // brim shadow hat
    px(g, 4, 8, 24, 3, 'rgba(10,10,16,0.55)');
    eyes(g, 11, 18, 13, PAL.ink);
    px(g, 11, 12, 3, 2, PAL.ink); px(g, 18, 12, 3, 2, PAL.ink);      // heavy lids
    px(g, 13, 21, 6, 1, '#8a5a34');                                   // a line, not a mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.dwood);  // duster
  },
  bev: (g) => {
    px(g, 0, 0, 32, 32, '#22201a');
    faceBase(g, PAL.skin, PAL.skin2);
    // grey bob under a knit cap, reading glasses on a cord, a clipboard edge
    px(g, 6, 5, 20, 5, PAL.dgreen); px(g, 7, 4, 18, 2, PAL.green);   // knit cap
    px(g, 6, 9, 3, 10, PAL.lmetal); px(g, 23, 9, 3, 10, PAL.lmetal);  // the bob
    eyes(g, 11, 18, 14, PAL.ink);
    px(g, 10, 13, 5, 1, PAL.dgray); px(g, 17, 13, 5, 1, PAL.dgray);   // glasses tops
    px(g, 10, 17, 5, 1, PAL.dgray); px(g, 17, 17, 5, 1, PAL.dgray);
    px(g, 15, 15, 2, 1, PAL.dgray);                                   // bridge
    px(g, 13, 21, 6, 1, '#b0603a');                                   // a flat, judging mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.dwood);  // barn coat
    px(g, 20, 25, 6, 7, PAL.ink); px(g, 21, 26, 4, 6, PAL.paper);    // clipboard
    px(g, 22, 27, 2, 1, PAL.dgray); px(g, 22, 29, 2, 1, PAL.dgray);
  },
  pruitt: (g) => {
    px(g, 0, 0, 32, 32, '#1e1a16');
    faceBase(g, PAL.skin2, '#a06a40');
    // welder's cap, sun squint, a jaw like a tailgate
    px(g, 5, 5, 22, 5, PAL.ink); px(g, 6, 4, 20, 5, PAL.red);        // welder's cap
    px(g, 6, 9, 20, 1, PAL.dred);
    px(g, 7, 20, 18, 4, '#a06a40');                                   // heavy jaw
    px(g, 11, 14, 3, 2, PAL.ink); px(g, 18, 14, 3, 2, PAL.ink);       // squint
    px(g, 10, 13, 4, 1, PAL.ink); px(g, 18, 13, 4, 1, PAL.ink);       // brows
    px(g, 13, 21, 6, 1, PAL.ink);                                     // a line for a mouth
    px(g, 24, 15, 1, 5, '#7a4a2a');                                   // grease on the cheek
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.slate);  // coveralls
    px(g, 12, 28, 2, 3, PAL.orange);                                  // safety strap
  },
  hattie: (g) => {
    px(g, 0, 0, 32, 32, '#221c1c');
    faceBase(g, PAL.skin, PAL.skin2);
    // church hat with a pin, tight curls, the paper held up like scripture
    px(g, 4, 5, 24, 4, PAL.purple); px(g, 8, 1, 16, 5, PAL.purple);   // the hat
    px(g, 20, 3, 2, 2, PAL.gold);                                      // hat pin
    px(g, 6, 9, 3, 6, PAL.lmetal); px(g, 23, 9, 3, 6, PAL.lmetal);     // curls
    eyes(g, 11, 18, 14, PAL.ink);
    px(g, 11, 12, 3, 1, PAL.ink); px(g, 18, 12, 3, 1, PAL.ink);       // raised brows
    px(g, 14, 20, 4, 2, PAL.red);                                     // a pursed mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.pink);   // Sunday cardigan
    px(g, 2, 22, 9, 10, PAL.ink); px(g, 3, 23, 7, 9, PAL.paper);      // the paper, held up
    px(g, 4, 25, 5, 1, PAL.dgray); px(g, 4, 27, 5, 1, PAL.dgray); px(g, 4, 29, 3, 1, PAL.dgray);
  },
  delgado: (g) => {
    px(g, 0, 0, 32, 32, '#1a1c1e');
    faceBase(g, PAL.skin2, '#a06a40');
    // flat cap, mustache, a face that has been fooled once and not since
    px(g, 5, 6, 22, 4, PAL.ink); px(g, 6, 4, 20, 4, PAL.dgray);       // flat cap
    px(g, 4, 9, 24, 1, PAL.ink);                                      // brim
    eyes(g, 11, 18, 14, PAL.ink);
    px(g, 10, 13, 5, 1, PAL.ink); px(g, 17, 13, 5, 1, PAL.ink);       // low brows
    px(g, 12, 19, 8, 2, PAL.ink);                                     // the mustache
    px(g, 13, 22, 6, 1, '#8a5a34');                                   // set mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.dwood);  // canvas jacket
    px(g, 22, 26, 8, 6, PAL.ink); px(g, 23, 27, 6, 5, PAL.paper);     // a torn paper, tucked
    px(g, 24, 28, 4, 1, PAL.dgray); px(g, 26, 26, 3, 2, '#1a1c1e');   // ripped corner
  },
  dee: (g) => {
    px(g, 0, 0, 32, 32, '#1c1a22');
    faceBase(g, PAL.skin, PAL.skin2);
    // grey hair pinned back, a high collar, a small cross, eyes half closed in appraisal
    px(g, 6, 5, 20, 5, PAL.lmetal); px(g, 6, 8, 3, 8, PAL.lmetal); px(g, 23, 8, 3, 8, PAL.lmetal);
    px(g, 8, 4, 16, 2, PAL.gray);
    px(g, 11, 14, 3, 2, PAL.ink); px(g, 18, 14, 3, 2, PAL.ink);       // half-closed eyes
    px(g, 11, 13, 3, 1, PAL.dgray); px(g, 18, 13, 3, 1, PAL.dgray);
    px(g, 13, 21, 6, 1, '#b0603a');                                   // patient mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.navy);   // Sunday navy
    px(g, 12, 25, 8, 2, PAL.white);                                   // high collar
    px(g, 15, 28, 2, 3, PAL.gold); px(g, 14, 29, 4, 1, PAL.gold);     // a small cross
  },
  cobb: (g) => {
    px(g, 0, 0, 32, 32, '#1a1a1a');
    faceBase(g, PAL.skin2, '#a06a40');
    // trucker cap, narrow face, a toothpick, a grease smear
    px(g, 5, 5, 22, 4, PAL.ink); px(g, 6, 3, 20, 4, PAL.orange);      // cap
    px(g, 8, 4, 16, 2, PAL.white);                                    // cap front panel
    px(g, 4, 9, 24, 1, PAL.ink);                                      // brim
    eyes(g, 11, 18, 14, PAL.ink);
    px(g, 10, 13, 4, 1, PAL.ink); px(g, 18, 13, 4, 1, PAL.ink);
    px(g, 14, 21, 5, 1, PAL.ink); px(g, 19, 20, 4, 1, PAL.paper);     // mouth + toothpick
    px(g, 8, 17, 2, 4, '#5a3a1a');                                    // grease smear
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.dgray);  // shop shirt
    px(g, 12, 28, 3, 2, PAL.red);                                     // name patch
  },
  ferrell: (g) => {
    px(g, 0, 0, 32, 32, '#1c1e1c');
    faceBase(g, PAL.skin, PAL.skin2);
    // side-parted hair, sweat, wide eyes, a polo buttoned to the top
    px(g, 7, 5, 18, 4, PAL.dwood); px(g, 7, 6, 4, 6, PAL.dwood);      // hair
    px(g, 11, 13, 3, 3, PAL.white); px(g, 18, 13, 3, 3, PAL.white);   // wide eyes
    px(g, 12, 14, 1, 1, PAL.ink); px(g, 19, 14, 1, 1, PAL.ink);
    px(g, 11, 12, 3, 1, PAL.ink); px(g, 18, 12, 3, 1, PAL.ink);       // brows up
    px(g, 22, 11, 1, 2, PAL.cyan); px(g, 9, 15, 1, 2, PAL.cyan);       // sweat
    px(g, 13, 21, 6, 1, '#b0603a');                                   // tight mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.dgreen); // polo
    px(g, 15, 26, 2, 2, PAL.white);                                   // buttoned to the top
  },
  wanda: (g) => {
    px(g, 0, 0, 32, 32, '#161418');
    faceBase(g, '#e8d8c8', '#c8b0a0');
    // black bob, black gloves, a calm that is not quite right
    px(g, 5, 4, 22, 6, PAL.ink); px(g, 5, 8, 4, 12, PAL.ink); px(g, 23, 8, 4, 12, PAL.ink);   // bob
    px(g, 6, 5, 20, 1, '#3a2a3a');
    eyes(g, 11, 18, 14, PAL.purple);
    px(g, 11, 13, 3, 1, PAL.ink); px(g, 18, 13, 3, 1, PAL.ink);       // level brows
    px(g, 13, 20, 6, 1, PAL.dred);                                    // a thin, pleased mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, '#2a1a2a');   // dark coat
    px(g, 21, 26, 7, 6, PAL.ink); px(g, 22, 27, 5, 5, '#111'); px(g, 23, 28, 3, 1, '#2a2a2a');   // a gloved hand
  },
  vale: (g) => {
    px(g, 0, 0, 32, 32, '#1e1a1e');
    faceBase(g, '#e8d0b8', '#c8a890');
    // slicked hair, a loupe in one eye, a silk collar
    px(g, 7, 4, 18, 5, PAL.ink); px(g, 7, 5, 18, 1, '#3a3a4a');       // slick
    px(g, 6, 8, 3, 6, PAL.ink); px(g, 23, 8, 3, 6, PAL.ink);
    px(g, 11, 14, 3, 3, PAL.white); px(g, 12, 15, 1, 1, PAL.ink);     // one eye
    px(g, 17, 13, 5, 5, PAL.gold); px(g, 18, 14, 3, 3, PAL.cyan);     // the loupe
    px(g, 19, 15, 1, 1, PAL.ink);
    px(g, 11, 13, 3, 1, PAL.ink);
    px(g, 13, 21, 6, 1, '#8a4a3a');                                   // a thin, unimpressed mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, '#2a1a2a');   // dark jacket
    px(g, 13, 26, 6, 2, PAL.red); px(g, 15, 27, 2, 3, PAL.red);       // silk cravat
  },
  charlie: (g) => {
    px(g, 0, 0, 32, 32, '#1a1c22');
    faceBase(g, '#e0b090', '#c89070');
    // tan, sunglasses, a grin, a chrome collar chain
    px(g, 6, 5, 20, 5, PAL.dwood); px(g, 7, 4, 18, 2, '#8a6a3a');     // swept hair
    px(g, 9, 12, 6, 4, PAL.ink); px(g, 17, 12, 6, 4, PAL.ink);        // sunglasses
    px(g, 10, 13, 4, 2, PAL.lmetal); px(g, 18, 13, 4, 2, PAL.lmetal); // the chrome lenses
    px(g, 15, 13, 2, 1, PAL.ink);
    px(g, 12, 20, 8, 2, PAL.white); px(g, 12, 20, 8, 1, PAL.ink);     // a big grin
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.white);   // white jacket
    px(g, 12, 27, 8, 1, PAL.lmetal); px(g, 14, 28, 4, 1, PAL.gold);   // chain
  },
  priscilla: (g) => {
    px(g, 0, 0, 32, 32, '#1c1e24');
    faceBase(g, PAL.skin, PAL.skin2);
    // a pale updo, pearl earrings, white gloves held up and away from everything
    px(g, 8, 2, 16, 7, PAL.lmetal); px(g, 6, 6, 20, 3, PAL.lmetal);   // the updo
    px(g, 10, 1, 12, 2, PAL.white);
    eyes(g, 11, 18, 14, PAL.ink);
    px(g, 11, 12, 3, 1, PAL.ink); px(g, 18, 12, 3, 1, PAL.ink);       // raised, judging
    px(g, 8, 19, 2, 2, PAL.white); px(g, 22, 19, 2, 2, PAL.white);    // pearls
    px(g, 14, 21, 4, 1, PAL.red);                                     // a small precise mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.lpink);   // pale suit
    px(g, 22, 23, 7, 9, PAL.ink); px(g, 23, 24, 5, 8, PAL.white);     // white glove, raised
    px(g, 24, 23, 1, 2, PAL.white); px(g, 26, 23, 1, 2, PAL.white);
  },
  garrity: (g) => {
    px(g, 0, 0, 32, 32, '#16181c');
    faceBase(g, PAL.skin2, '#a06a40');
    // bald, rimless glasses, a dark suit, and the white gloves
    px(g, 8, 8, 16, 2, '#c8a080');                                    // shine on the scalp
    px(g, 10, 13, 5, 3, 'rgba(180,200,220,0.35)'); px(g, 17, 13, 5, 3, 'rgba(180,200,220,0.35)');
    px(g, 15, 14, 2, 1, PAL.lmetal);                                  // rimless bridge
    px(g, 11, 14, 3, 1, PAL.ink); px(g, 18, 14, 3, 1, PAL.ink);       // level, patient eyes
    px(g, 13, 21, 6, 1, '#8a5a34');
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, '#1a1a22');   // black suit
    px(g, 14, 26, 4, 2, PAL.white); px(g, 15, 28, 2, 2, PAL.dgray);   // shirt, tie
    px(g, 2, 24, 7, 8, PAL.ink); px(g, 3, 25, 5, 7, PAL.white);       // gloved hand, folded
  },
  ilse: (g) => {
    px(g, 0, 0, 32, 32, '#1a1418');
    faceBase(g, '#e8d8c8', '#c8b0a0');
    // silver hair swept up, a fur collar, pearls, and no expression whatsoever
    px(g, 7, 2, 18, 7, PAL.lmetal); px(g, 6, 7, 20, 2, PAL.gray);
    px(g, 9, 1, 14, 2, PAL.white);
    px(g, 11, 14, 3, 2, PAL.ink); px(g, 18, 14, 3, 2, PAL.ink);       // half-lidded
    px(g, 11, 12, 3, 1, PAL.ink); px(g, 18, 12, 3, 1, PAL.ink);
    px(g, 13, 21, 6, 1, PAL.dred);                                    // a line
    px(g, 8, 24, 16, 4, '#5a4a3a'); px(g, 7, 25, 18, 2, '#7a6a5a');   // fur collar
    px(g, 11, 23, 10, 1, PAL.white); px(g, 12, 24, 8, 1, PAL.white);  // pearls, two rows
    px(g, 10, 28, 12, 4, PAL.ink); px(g, 11, 29, 10, 3, '#2a1a22');
  },
  dex: (g) => {
    px(g, 0, 0, 32, 32, '#14181c');
    faceBase(g, PAL.skin, PAL.skin2);
    // a fade, tinted glasses, a hoodie under a blazer, a phone at eye level
    px(g, 7, 5, 18, 4, PAL.ink); px(g, 8, 4, 16, 2, '#2a2a2a');       // the fade
    px(g, 10, 12, 5, 4, 'rgba(240,120,60,0.6)'); px(g, 17, 12, 5, 4, 'rgba(240,120,60,0.6)');   // amber lenses
    px(g, 15, 13, 2, 1, PAL.ink); px(g, 9, 13, 1, 1, PAL.ink); px(g, 22, 13, 1, 1, PAL.ink);
    px(g, 13, 20, 6, 2, PAL.white); px(g, 13, 20, 6, 1, PAL.ink);     // grin
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, PAL.navy);    // blazer
    px(g, 14, 26, 4, 6, PAL.dgray);                                   // hoodie under it
    px(g, 23, 12, 6, 10, PAL.ink); px(g, 24, 13, 4, 8, PAL.cyan);     // the phone, always up
  },
  crowd: (g) => {
    px(g, 0, 0, 32, 32, '#171a24');
    // three nobodies in hats, back row of every auction
    for (const [hx, hy, hat] of [[3, 10, PAL.dwood], [12, 6, PAL.slate], [21, 11, PAL.dgreen]]) {
      px(g, hx, hy + 6, 8, 10, PAL.ink);
      px(g, hx + 1, hy + 7, 6, 8, PAL.skin2);
      px(g, hx - 1, hy + 2, 10, 4, PAL.ink);
      px(g, hx, hy + 3, 8, 2, hat);                                   // brim + crown
      px(g, hx + 1, hy, 6, 3, hat);
      px(g, hx + 2, hy + 9, 1, 2, PAL.ink); px(g, hx + 5, hy + 9, 1, 2, PAL.ink);
    }
    px(g, 0, 26, 32, 6, PAL.ink);
    px(g, 1, 27, 30, 5, PAL.slate);                                   // a fence of shoulders
  },
  bart: (g) => {
    faceBase(g, PAL.skin, '#dba87e');
    px(g, 3, 8, 26, 3, PAL.dwood); px(g, 6, 2, 20, 7, PAL.dwood);    // cowboy hat
    px(g, 6, 2, 20, 2, PAL.wood); px(g, 3, 8, 26, 1, PAL.wood);
    px(g, 12, 4, 8, 2, PAL.dred);                                     // hat band
    eyes(g, 11, 18, 13);
    px(g, 10, 12, 4, 1, PAL.dwood); px(g, 18, 12, 4, 1, PAL.dwood);  // brows
    px(g, 10, 18, 12, 3, PAL.dgray); px(g, 10, 20, 3, 2, PAL.dgray); px(g, 19, 20, 3, 2, PAL.dgray); // mustache
    px(g, 11, 28, 10, 4, PAL.dwood);
    px(g, 15, 27, 2, 3, PAL.gold); px(g, 14, 26, 4, 2, PAL.slate);   // bolo
  },
  sal: (g) => {
    faceBase(g, PAL.skin2, '#a3743f');
    px(g, 6, 4, 20, 6, PAL.red); px(g, 2, 8, 12, 3, PAL.red);        // cap tilted
    px(g, 6, 4, 20, 2, PAL.lred); px(g, 20, 5, 4, 4, PAL.dred);
    eyes(g, 11, 18, 13);
    px(g, 10, 12, 4, 2, PAL.hair); px(g, 18, 11, 4, 2, PAL.hair);    // angry brows
    px(g, 12, 19, 8, 2, PAL.ink); px(g, 11, 20, 2, 1, PAL.ink);      // frown
    speck(g, 9, 16, 14, 7, 'rgba(59,42,26,0.5)', 41, 16);            // stubble
    px(g, 11, 27, 10, 5, PAL.dgreen);
  },
  ed: (g) => {
    faceBase(g, PAL.skin, '#dba87e');
    px(g, 6, 3, 20, 7, PAL.dgreen); px(g, 6, 8, 20, 2, PAL.green);   // beanie
    px(g, 8, 12, 7, 6, PAL.ink); px(g, 17, 12, 7, 6, PAL.ink);       // big glasses
    px(g, 9, 13, 5, 4, '#bfe9f2'); px(g, 18, 13, 5, 4, '#bfe9f2');
    px(g, 10, 14, 2, 2, PAL.ink); px(g, 19, 14, 2, 2, PAL.ink);
    px(g, 15, 14, 2, 1, PAL.ink);                                     // bridge
    px(g, 13, 20, 6, 1, PAL.ink);
    px(g, 24, 9, 3, 6, PAL.yellow); px(g, 24, 8, 3, 2, PAL.pink);    // pencil behind ear
    px(g, 11, 27, 10, 5, PAL.navy);
  },
  dutch: (g) => {  // the YIIIP guy: black cap, aviators, goatee, mouth mid-yiip
    faceBase(g, PAL.skin, '#dba87e');
    px(g, 6, 3, 20, 5, PAL.ink); px(g, 2, 7, 13, 3, PAL.ink);
    px(g, 6, 3, 20, 2, PAL.slate);
    px(g, 9, 11, 6, 5, PAL.dgold); px(g, 17, 11, 6, 5, PAL.dgold);   // aviators
    px(g, 10, 12, 4, 3, '#2e2318'); px(g, 18, 12, 4, 3, '#2e2318');
    px(g, 15, 13, 2, 1, PAL.dgold);
    px(g, 10, 12, 2, 1, PAL.lblue); px(g, 18, 12, 2, 1, PAL.lblue);
    px(g, 12, 18, 8, 4, PAL.ink);                                     // mouth wide open
    px(g, 13, 19, 6, 2, '#7d2b3d');
    px(g, 11, 21, 10, 2, PAL.hair); px(g, 14, 22, 4, 1, PAL.hair);   // goatee
    px(g, 11, 27, 10, 5, PAL.dgreen);
    px(g, 13, 27, 6, 2, PAL.white);                                   // polo collar
  },
  duo: (g) => {  // two faces, one frame: him in a backwards cap, her mid-sentence
    px(g, 0, 0, 32, 32, '#1d1a22');
    // Cody, left
    px(g, 2, 9, 13, 14, PAL.ink); px(g, 3, 10, 11, 12, PAL.skin);
    px(g, 2, 6, 13, 4, PAL.ink); px(g, 3, 7, 11, 3, PAL.blue); px(g, 12, 8, 4, 2, PAL.blue);   // cap, backwards
    px(g, 4, 13, 3, 1, PAL.hair); px(g, 10, 13, 3, 1, PAL.hair);                                // brows
    px(g, 5, 14, 2, 2, PAL.ink); px(g, 10, 14, 2, 2, PAL.ink);                                  // eyes
    px(g, 6, 19, 5, 1, PAL.ink);                                                                // flat mouth
    speck(g, 4, 17, 9, 4, 'rgba(59,42,26,0.45)', 77, 9);                                        // stubble
    px(g, 3, 24, 11, 8, PAL.ink); px(g, 4, 25, 9, 7, PAL.dgreen);                               // tee
    // Kaylee, right
    px(g, 17, 9, 13, 14, PAL.ink); px(g, 18, 10, 11, 12, '#f3c9a0');
    px(g, 17, 6, 13, 4, PAL.ink); px(g, 18, 7, 11, 3, '#5a3a1e');                               // hairline
    px(g, 26, 2, 5, 9, PAL.ink); px(g, 27, 3, 3, 7, '#5a3a1e');                                 // high ponytail
    px(g, 20, 13, 2, 2, PAL.white); px(g, 25, 13, 2, 2, PAL.white);
    px(g, 20, 13, 2, 1, PAL.ink); px(g, 25, 13, 2, 1, PAL.ink);                                 // eyes, rolled
    px(g, 22, 18, 4, 3, PAL.ink); px(g, 23, 19, 2, 1, PAL.lred);                                // mid-word
    px(g, 17, 17, 2, 3, PAL.gold); px(g, 29, 17, 2, 3, PAL.gold);                               // hoops
    px(g, 18, 24, 11, 8, PAL.ink); px(g, 19, 25, 9, 7, PAL.pink);                               // top
  },
  // Cody and Kaylee's week apart: one face each (with the pair's photo, game.js crops their half of it: PORTRAIT_HALF)
  cody: (g) => {
    px(g, 0, 0, 32, 32, '#1d1a22');
    faceBase(g, PAL.skin, PAL.skin2);
    px(g, 6, 4, 20, 7, PAL.ink); px(g, 7, 5, 18, 5, PAL.blue); px(g, 23, 9, 5, 2, PAL.blue);   // cap, backwards
    px(g, 11, 12, 3, 1, PAL.hair); px(g, 18, 12, 3, 1, PAL.hair);                               // brows
    eyes(g, 11, 18, 14, PAL.ink);
    speck(g, 9, 18, 14, 5, 'rgba(59,42,26,0.45)', 77, 12);                                       // stubble
    px(g, 13, 21, 6, 1, PAL.ink);                                                                // flat mouth
    px(g, 11, 27, 10, 5, '#23284a');                                                             // hoodie
  },
  kaylee: (g) => {
    px(g, 0, 0, 32, 32, '#1d1a22');
    faceBase(g, '#f3c9a0', PAL.skin);
    px(g, 6, 5, 20, 5, PAL.ink); px(g, 7, 6, 18, 3, '#5a3a1e');                                  // hairline
    px(g, 6, 9, 3, 11, '#5a3a1e'); px(g, 23, 9, 3, 11, '#5a3a1e');
    px(g, 22, 0, 7, 7, PAL.ink); px(g, 23, 1, 5, 5, '#5a3a1e');                                  // high ponytail
    px(g, 11, 14, 3, 3, PAL.white); px(g, 18, 14, 3, 3, PAL.white);
    px(g, 12, 14, 2, 1, PAL.ink); px(g, 19, 14, 2, 1, PAL.ink);                                  // eyes, rolled
    px(g, 14, 20, 4, 3, PAL.ink); px(g, 15, 21, 2, 1, PAL.lred);                                 // mid-word
    px(g, 7, 17, 2, 3, PAL.gold); px(g, 23, 17, 2, 3, PAL.gold);                                 // hoops
    px(g, 11, 27, 10, 5, PAL.pink);                                                              // top
  },
  // Merle Tuttle, the tenant (day 12): comb-over, a grievance, a bowling shirt
  tenant: (g) => {
    px(g, 0, 0, 32, 32, '#1e1a1a');
    faceBase(g, PAL.skin2, '#a3743f');
    px(g, 8, 7, 16, 2, PAL.hair); px(g, 10, 6, 11, 1, PAL.hair);              // the comb-over, doing its best
    px(g, 10, 12, 4, 1, PAL.ink); px(g, 18, 12, 4, 1, PAL.ink);               // brows, down
    eyes(g, 11, 18, 14, PAL.ink);
    px(g, 12, 20, 8, 2, PAL.ink); px(g, 13, 21, 6, 1, PAL.lred);              // mid-complaint
    px(g, 11, 27, 10, 5, '#2f8f8a'); px(g, 15, 27, 2, 5, PAL.white);          // bowling shirt, and its stripe
  },
  // Dana Bixby, Channel 9 Action News (the interview, day 15): helmet hair, a red blazer, a smile with a deadline
  reporter: (g) => {
    px(g, 0, 0, 32, 32, '#1a1c2a');
    faceBase(g, '#f0c49c', PAL.skin);
    px(g, 6, 3, 20, 8, PAL.ink); px(g, 7, 4, 18, 6, '#c89a4a');               // helmet hair
    px(g, 5, 8, 4, 12, PAL.ink); px(g, 6, 9, 3, 10, '#c89a4a'); px(g, 23, 8, 4, 12, PAL.ink); px(g, 23, 9, 3, 10, '#c89a4a');
    eyes(g, 11, 18, 14, PAL.blue);
    px(g, 13, 20, 6, 2, PAL.ink); px(g, 14, 20, 4, 1, PAL.white);             // the smile
    px(g, 11, 27, 10, 5, PAL.red); px(g, 14, 27, 4, 3, PAL.white);            // blazer, blouse
  },
  // the office clerk (the clerk's warning, day 6): a green visor, reading glasses, a cardigan, a long week
  clerk: (g) => {
    px(g, 0, 0, 32, 32, '#1c1f1a');
    faceBase(g, PAL.skin, PAL.skin2);
    px(g, 8, 6, 16, 2, PAL.hair);                                             // what is left of the hair
    px(g, 5, 8, 22, 3, PAL.ink); px(g, 6, 9, 20, 1, '#3f8a4a');               // green eyeshade
    px(g, 9, 13, 6, 4, PAL.ink); px(g, 17, 13, 6, 4, PAL.ink); px(g, 15, 14, 2, 1, PAL.ink);   // reading glasses
    px(g, 10, 14, 4, 2, '#cfe3e8'); px(g, 18, 14, 4, 2, '#cfe3e8');
    px(g, 11, 15, 2, 1, PAL.ink); px(g, 19, 15, 2, 1, PAL.ink);
    px(g, 13, 21, 6, 1, PAL.ink);                                             // a mouth that has seen things
    px(g, 11, 27, 10, 5, '#6b5a3a'); px(g, 15, 27, 2, 5, '#4a3f2a');          // cardigan
  },
  // the phone bidder (an interruption): Buzz's desk phone, receiver off the hook, ringing
  phone: (g) => {
    px(g, 0, 0, 32, 32, '#1a1c28');
    px(g, 6, 16, 20, 12, PAL.ink); px(g, 7, 17, 18, 10, '#c9b98f');           // the body
    px(g, 11, 19, 10, 7, PAL.ink);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) px(g, 12 + c * 3, 20 + r * 3, 2, 2, '#e8dcc0');   // the keypad
    px(g, 4, 8, 24, 6, PAL.ink); px(g, 5, 9, 22, 4, '#c9b98f');                // the receiver, lifted
    px(g, 4, 12, 5, 5, PAL.ink); px(g, 23, 12, 5, 5, PAL.ink);
    pline(g, 26, 17, 29, 26, 1, PAL.ink);                                       // the cord
    px(g, 27, 3, 2, 3, PAL.yellow); px(g, 30, 6, 2, 2, PAL.yellow);             // ringing
  },
  // somebody on the other end of the phone you have never seen: a stranger, or whoever had the unit you bought.
  // Head and shoulders in shadow against a lamp-lit wall, so it reads as a PERSON and not a phone (phone.js).
  caller: (g) => {
    px(g, 0, 0, 32, 32, '#2a2330');
    px(g, 0, 0, 32, 10, '#3a2f38');                                            // the lamp's light on the wall behind
    px(g, 11, 5, 10, 11, '#121018'); px(g, 10, 7, 12, 7, '#121018');          // the head
    px(g, 13, 15, 6, 3, '#121018');                                           // the neck
    px(g, 5, 18, 22, 14, '#121018'); px(g, 3, 22, 26, 10, '#121018');         // shoulders
    px(g, 21, 8, 4, 7, '#1c1a24'); px(g, 23, 14, 3, 6, '#1c1a24');            // a receiver held to the ear
    px(g, 11, 6, 1, 8, '#4a3e48');                                            // the one edge the lamp catches
  },
  pete: (g) => {
    faceBase(g, PAL.skin2, '#a3743f');
    px(g, 8, 7, 16, 2, '#b98850');                                    // bald shine
    px(g, 10, 6, 4, 1, '#e8c9a0');
    eyes(g, 11, 18, 12);
    px(g, 10, 11, 4, 1, PAL.hair); px(g, 18, 11, 4, 1, PAL.hair);
    px(g, 12, 18, 8, 2, PAL.ink); px(g, 12, 17, 2, 1, PAL.ink); px(g, 18, 17, 2, 1, PAL.ink);  // grin
    px(g, 13, 19, 6, 1, PAL.white);
    px(g, 11, 27, 10, 5, PAL.dwood);
    for (let i = 0; i < 5; i++) px(g, 12 + i * 2, 26, 1, 1, PAL.gold);  // chain
  },
  alice: (g) => {
    faceBase(g, PAL.skin, '#dba87e');
    px(g, 7, 4, 18, 6, PAL.gray); px(g, 11, 1, 10, 4, PAL.gray);     // bun
    px(g, 7, 4, 18, 2, PAL.lmetal);
    eyes(g, 11, 18, 13);
    px(g, 8, 13, 3, 4, PAL.gray); px(g, 21, 13, 3, 4, PAL.gray);     // hair sides
    px(g, 13, 19, 6, 1, PAL.dred);                                    // lips
    px(g, 10, 12, 3, 1, PAL.gray); px(g, 19, 12, 3, 1, PAL.gray);
    px(g, 11, 27, 10, 5, PAL.purple);
    for (let i = 0; i < 5; i++) px(g, 12 + i * 2, 25, 2, 2, PAL.white);  // pearls
  },
  randy: (g) => {
    faceBase(g, PAL.skin, '#dba87e');
    px(g, 6, 4, 20, 5, PAL.hair); px(g, 5, 8, 5, 16, PAL.hair); px(g, 22, 8, 5, 16, PAL.hair);  // long hair
    px(g, 6, 4, 20, 2, '#5a4128');
    px(g, 9, 12, 6, 4, PAL.ink); px(g, 17, 12, 6, 4, PAL.ink);       // shades
    px(g, 10, 13, 4, 2, PAL.purple); px(g, 18, 13, 4, 2, PAL.purple);
    px(g, 15, 13, 2, 1, PAL.ink);
    px(g, 13, 20, 6, 1, PAL.ink);
    px(g, 11, 27, 10, 5, PAL.dred);
    px(g, 14, 28, 4, 3, PAL.white);                                   // band tee
  },
  gina: (g) => {
    faceBase(g, PAL.skin2, '#a3743f');
    px(g, 6, 4, 20, 5, PAL.blue); px(g, 22, 6, 8, 3, PAL.blue);      // backwards cap
    px(g, 6, 4, 20, 2, PAL.lblue);
    px(g, 5, 9, 4, 10, PAL.hair);                                     // ponytail wisp
    eyes(g, 11, 18, 13);
    px(g, 10, 12, 4, 1, PAL.hair); px(g, 18, 12, 4, 1, PAL.hair);
    speck(g, 10, 17, 5, 2, '#a3743f', 51, 4); speck(g, 17, 17, 5, 2, '#a3743f', 52, 4);  // freckles
    px(g, 13, 20, 6, 1, PAL.ink);
    px(g, 11, 27, 10, 5, PAL.orange);
    px(g, 12, 28, 3, 2, PAL.slate);                                   // wrench in pocket
  },
  carl: (g) => {
    px(g, 5, 3, 22, 26, PAL.ink);
    px(g, 6, 4, 20, 24, PAL.slate);                                   // hood
    px(g, 6, 4, 20, 2, PAL.dgray);
    px(g, 9, 9, 14, 13, '#e8d9c8');                                   // pale face
    px(g, 10, 12, 4, 4, PAL.white); px(g, 18, 12, 4, 4, PAL.white);  // WIDE eyes
    px(g, 11, 13, 2, 2, PAL.ink); px(g, 19, 13, 2, 2, PAL.ink);
    px(g, 14, 19, 4, 1, PAL.ink);                                     // tiny mouth
    px(g, 10, 26, 12, 6, PAL.ink); px(g, 11, 27, 10, 5, '#22242e');
  },
  // the certified appraiser: silver bun, half-moon glasses low on the nose, charcoal cardigan, one eyebrow up
  appraiser: (g) => {
    px(g, 0, 0, 32, 32, '#1c1a24');
    faceBase(g, PAL.skin, PAL.skin2);
    px(g, 9, 5, 14, 4, PAL.lmetal); px(g, 12, 3, 8, 3, PAL.lmetal);     // silver hair, pulled tight
    px(g, 13, 2, 6, 2, PAL.gray);                                       // the bun
    px(g, 18, 11, 5, 1, PAL.hair);                                      // one eyebrow up
    px(g, 9, 13, 5, 3, PAL.ink); px(g, 18, 13, 5, 3, PAL.ink);          // half-moon glasses
    px(g, 10, 14, 3, 1, PAL.white); px(g, 19, 14, 3, 1, PAL.white);
    px(g, 14, 15, 4, 1, PAL.ink);                                       // the bridge
    px(g, 13, 20, 6, 1, PAL.skin2);                                     // a mouth that has finished deciding
    px(g, 8, 24, 16, 8, '#3a3a44'); px(g, 15, 25, 2, 7, PAL.lmetal);     // charcoal cardigan, a row of buttons
    px(g, 11, 26, 2, 2, PAL.gold);                                      // the enamel pin
  },
  // the gavels (town.js AUCTIONEERS.face). Buzz: ex drive-time radio, headset, pompadour, mouth never shut
  buzz: (g) => {
    px(g, 0, 0, 32, 32, '#1e1a2a');
    faceBase(g, PAL.skin, PAL.skin2);
    px(g, 7, 4, 18, 5, PAL.hair); px(g, 9, 2, 12, 3, PAL.hair);       // pompadour
    px(g, 6, 4, 20, 1, PAL.dgray);                                     // headband
    px(g, 5, 10, 2, 8, PAL.ink); px(g, 25, 10, 2, 8, PAL.ink);        // headset cups
    eyes(g, 11, 18, 13, PAL.ink);
    px(g, 12, 18, 8, 4, PAL.ink); px(g, 13, 19, 6, 2, PAL.white);     // wide open, all teeth
    px(g, 27, 15, 1, 6, PAL.dgray); px(g, 24, 20, 4, 2, PAL.dgray);   // boom mic
    px(g, 11, 27, 10, 5, PAL.orange); px(g, 14, 27, 4, 5, PAL.yellow);// loud shirt, louder tie
  },
  // Rapid Ray: red ball cap, squint, already shouting the next number
  ray: (g) => {
    px(g, 0, 0, 32, 32, '#1a2020');
    faceBase(g, PAL.skin2, '#a8734a');
    px(g, 6, 5, 20, 5, PAL.red); px(g, 4, 9, 24, 2, PAL.dred);         // ball cap, brim
    px(g, 11, 13, 3, 1, PAL.ink); px(g, 18, 13, 3, 1, PAL.ink);       // squint
    px(g, 12, 18, 8, 3, PAL.ink);                                     // shouting
    px(g, 11, 27, 10, 5, PAL.lblue);                                  // work shirt
  },
  // the Reverend: preacher's brim, white collar, patient
  lyle: (g) => {
    px(g, 0, 0, 32, 32, '#201c18');
    faceBase(g, PAL.skin, PAL.skin2);
    px(g, 8, 3, 16, 6, PAL.ink); px(g, 3, 8, 26, 2, PAL.ink);         // wide brim
    px(g, 8, 6, 16, 1, PAL.slate);                                    // hatband
    eyes(g, 11, 18, 14, PAL.dgray);
    px(g, 13, 20, 6, 1, PAL.ink);                                     // patient mouth
    px(g, 11, 27, 10, 5, PAL.ink); px(g, 13, 26, 6, 2, PAL.white);    // black coat, white collar
  },
};

// ================= SPRITE CACHE =================
const _spriteCache = {};

function getSprite(sprId, palKey, cond, seed, shade) {
  const key = sprId + '|' + (palKey || '') + '|' + (cond || '') + '|' + (seed || 0) + '|' + (shade || 0);
  if (_spriteCache[key]) return _spriteCache[key];

  const def = SPRITES[sprId] || SPRITES.mystery;
  const cv = document.createElement('canvas');
  cv.width = def.w; cv.height = def.h;
  const g = cv.getContext('2d');
  const C = BRAND_PALS[palKey] || BRAND_PALS.wood;
  // per-instance variety: draw functions may take a third RNG arg so two
  // boxes in one locker stop being twins
  def.draw(g, C, RNG((seed || 1) * 131071 + 977));

  const r = RNG((seed || 1) * 7919 + 13);
  if (cond === 'Dusty') {
    g.fillStyle = 'rgba(120,110,88,0.2)'; g.fillRect(0, 0, def.w, def.h);
    g.fillStyle = 'rgba(170,158,124,0.5)';
    for (let i = 0; i < 6 + def.w * def.h / 70; i++)
      g.fillRect(r.i(0, def.w - 2), r.i(0, def.h - 2), r.i(1, 2), 1);
  } else if (cond === 'Worn') {
    g.fillStyle = 'rgba(26,28,44,0.4)';
    for (let i = 0; i < 3 + def.w * def.h / 130; i++)
      g.fillRect(r.i(1, def.w - 3), r.i(1, def.h - 2), r.i(1, 3), 1);
  } else if (cond === 'Mint') {
    sparkle(g, r.i(3, def.w - 4), r.i(3, (def.h >> 1)), '#ffffff');
    sparkle(g, r.i(3, def.w - 4), r.i((def.h >> 1), def.h - 4), 'rgba(255,255,255,0.7)');
  }

  if (shade) {
    g.globalCompositeOperation = 'source-atop';
    // 3 = flashlight silhouette: a shape in the dark, nothing more
    // 4 = ghost: a piece you don't have yet, waiting in grey
    g.fillStyle = shade === 3 ? 'rgba(10,11,20,0.93)'
      : (shade === 4 ? 'rgba(74,88,110,0.88)'
      : (shade === 1 ? 'rgba(13,14,26,0.34)' : 'rgba(13,14,26,0.58)'));
    g.fillRect(0, 0, def.w, def.h);
    g.globalCompositeOperation = 'source-over';
  }

  _spriteCache[key] = cv;
  return cv;
}

function getPortrait(who) {
  const key = 'face|' + who;
  if (_spriteCache[key]) return _spriteCache[key];
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 32;
  const g = cv.getContext('2d');
  (PORTRAITS[who] || PORTRAITS.pete)(g);
  _spriteCache[key] = cv;
  return cv;
}
