// bb-core.js — built by tools/build_teaser.py from the game's own source files.
// Do not edit here: change the game, rebuild. Files, in the game's load order:
// util.js, sprites.js, items.js, games.js, oddments.js, sets.js, town.js, tools.js, gen.js, lockerstories.js, clues.js
// Built 2026-09-12
'use strict';

// ======================================================================
// js/util.js
// ======================================================================
// ---- utilities: seeded RNG, formatting, helpers ----


function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// RNG wrapper with helpers
function RNG(seed) {
  const f = mulberry32(seed);
  return {
    f: () => f(),                                   // [0,1)
    i: (a, b) => a + Math.floor(f() * (b - a + 1)), // int inclusive
    r: (a, b) => a + f() * (b - a),                 // float range
    pick: (arr) => arr[Math.floor(f() * arr.length)],
    chance: (p) => f() < p,
    shuf: (arr) => {
      const c = arr.slice();
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      return c;
    },
    // weighted pick: [[value, weight], ...]
    wpick: (pairs) => {
      let total = 0;
      for (const p of pairs) total += p[1];
      let roll = f() * total;
      for (const p of pairs) { roll -= p[1]; if (roll <= 0) return p[0]; }
      return pairs[pairs.length - 1][0];
    },
  };
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

function fmt$(n) {
  n = Math.round(n);
  const neg = n < 0; n = Math.abs(n);
  let s = String(n);
  let out = '';
  while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3); }
  return (neg ? '-$' : '$') + s + out;
}

let _uidCounter = 1;
function nextUid() { return _uidCounter++; }

// simple string hash for deterministic per-item seeds
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---- storage: one door to the outside. Swap the inside for a file on disk
// (Steam) and nothing else in the game notices. Keys and values are strings;
// the game never touches localStorage directly.
const Store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ok */ } },
};

// ======================================================================
// js/sprites.js
// ======================================================================
// ---- palette + procedural pixel sprites (hi-detail: smalls 24x24, bigs 48-class) ----


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

// ======================================================================
// js/items.js
// ======================================================================
// ---- item definitions + instantiation ----


// condition: [label, value mult, weight]
const CONDS = [
  ['Dusty', 0.7, 35],
  ['Worn', 0.85, 30],
  ['Clean', 1.0, 25],
  ['Mint', 1.55, 10],
];

const CATS = {
  furniture:    { label: 'Furniture',    col: PAL.lwood },
  antiques:     { label: 'Antique',      col: PAL.gold },
  music:        { label: 'Music',        col: PAL.pink },
  tools:        { label: 'Tools',        col: PAL.orange },
  electronics:  { label: 'Electronics',  col: PAL.lblue },
  jewelry:      { label: 'Jewelry',      col: PAL.cyan },
  collectibles: { label: 'Collectible',  col: PAL.green },
  weird:        { label: 'Weird',        col: PAL.purple },
  junk:         { label: 'Junk',         col: PAL.dgray },
  cash:         { label: 'Cash',         col: PAL.yellow },
};

// brands: [label, mult, palKey, weight]
const BASES = [
  // ---------- big locker items ----------
  { id: 'dresser', name: 'Dresser', cat: 'furniture', val: 90, size: 8, spr: 'dresser', big: 1, pal: 'wood',
    container: { n: [2, 4], pool: 'home' },
    brands: [['Pine', 0.8, 'wood', 5], ['Oak', 1.2, 'wood', 3], ['Mahogany', 2.2, 'red', 1]] },
  { id: 'wardrobe', name: 'Wardrobe', cat: 'furniture', val: 120, size: 9, spr: 'wardrobe', big: 1, pal: 'wood',
    container: { n: [2, 4], pool: 'home' },
    brands: [['Pine', 0.8, 'wood', 5], ['Walnut', 1.5, 'dark', 2], ['Antique', 2.5, 'red', 1]] },
  { id: 'mattress', name: 'Mattress', cat: 'junk', val: 14, size: 9, spr: 'mattress', big: 1 },
  { id: 'couch', name: 'Couch', cat: 'furniture', val: 80, size: 9, spr: 'couch', big: 1, pal: 'teal',
    brands: [['Floral', 0.8, 'pink', 4], ['Leather', 1.8, 'wood', 2], ['Velvet', 1.4, 'red', 2]] },
  { id: 'armchair', name: 'Armchair', cat: 'furniture', val: 55, size: 6, spr: 'armchair', big: 1, pal: 'red',
    brands: [['Plaid', 0.9, 'teal', 3], ['Leather', 1.7, 'wood', 1]] },
  { id: 'bookshelf', name: 'Bookshelf', cat: 'furniture', val: 70, size: 7, spr: 'bookshelf', big: 1, pal: 'wood',
    brands: [['Particleboard', 0.6, 'wood', 4], ['Oak', 1.4, 'wood', 2], ["Lawyer's", 2.4, 'dark', 1]] },
  // the cardboard ladder. `cap` is the biggest single thing that will go in it,
  // in the same units as `size` — a shoebox does not hold an arcade cabinet, and
  // an appliance carton is exactly the thing that does. See `contCap` in gen.js.
  { id: 'boxSmall', name: 'Small Carton', cat: 'junk', val: 4, size: 2, spr: 'boxSmall', big: 1,
    container: { n: [1, 2], pool: 'any', cap: 1 } },
  { id: 'box', name: 'Cardboard Box', cat: 'junk', val: 6, size: 3, spr: 'box', big: 1,
    container: { n: [1, 3], pool: 'any', cap: 1 } },
  { id: 'boxLarge', name: 'Moving Box', cat: 'junk', val: 8, size: 5, spr: 'boxLarge', big: 1,
    container: { n: [2, 5], pool: 'any', cap: 3 } },
  { id: 'boxWardrobe', name: 'Wardrobe Box', cat: 'junk', val: 12, size: 7, spr: 'boxWardrobe', big: 1,
    container: { n: [1, 4], pool: 'any', cap: 5 } },
  { id: 'applianceCarton', name: 'Appliance Carton', cat: 'junk', val: 14, size: 9, spr: 'boxHuge', big: 1,
    container: { n: [1, 2], pool: 'any', cap: 9 } },
  { id: 'crate', name: 'Wood Crate', cat: 'junk', val: 10, size: 4, spr: 'crate', big: 1,
    container: { n: [1, 3], pool: 'any', cap: 2 } },
  // paper is worth nothing and never reaches the stash: it goes on THE BOARD (ephemera.js)
  { id: 'paper', name: 'Loose Paper', cat: 'junk', val: 1, size: 1, spr: 'paper' },
  { id: 'barrel', name: 'Old Barrel', cat: 'junk', val: 12, size: 4, spr: 'barrel', big: 1 },
  { id: 'safe', name: 'Locked Safe', cat: 'weird', val: 40, size: 8, spr: 'safe', big: 1,
    container: { n: [1, 3], pool: 'rich', locked: 1 } },
  { id: 'fridge', name: 'Fridge', cat: 'electronics', val: 85, size: 9, spr: 'fridge', big: 1 },
  { id: 'washer', name: 'Washing Machine', cat: 'electronics', val: 80, size: 8, spr: 'washer', big: 1 },
  { id: 'tv', name: 'CRT Television', cat: 'electronics', val: 55, size: 5, spr: 'tv', big: 1, pal: 'wood',
    brands: [['Zenit', 1, 'wood', 4], ['Trinitone', 1.7, 'dark', 2]] },
  { id: 'tire', name: 'Spare Tire', cat: 'junk', val: 14, size: 4, spr: 'tire', big: 1 },
  { id: 'bike', name: 'Bicycle', cat: 'tools', val: 130, size: 7, spr: 'bike', big: 1, pal: 'red',
    brands: [['Rusty', 0.5, 'teal', 4], ['Roadster', 1.3, 'blue', 3], ['Vintage Racer', 2.6, 'red', 1]] },
  { id: 'guitar', name: 'Guitar', cat: 'music', val: 140, size: 4, spr: 'guitar', big: 1, pal: 'wood',
    brands: [['Rustwood', 0.5, 'wood', 4], ['Fendrix', 2.2, 'red', 2], ['Goldtop', 5, 'gold', 1]] },
  { id: 'guitarCase', name: 'Guitar Case', cat: 'music', val: 60, size: 4, spr: 'guitarCase', big: 1, pal: 'dark',
    container: { n: [1, 1], pool: 'music' } },
  { id: 'amp', name: 'Tube Amp', cat: 'music', val: 110, size: 5, spr: 'amp', big: 1, pal: 'dark',
    brands: [['Practice', 0.6, 'gray', 3], ['Stack', 1.6, 'dark', 2], ['Boutique', 3, 'red', 1]] },
  { id: 'vinylCrate', name: 'Crate of Records', cat: 'music', val: 65, size: 4, spr: 'vinylCrate', big: 1,
    container: { n: [1, 2], pool: 'music' },
    brands: [['Scratched', 0.7, 'wood', 3], ['Curated', 1.9, 'wood', 1]] },
  { id: 'keyboard', name: 'Synth Keyboard', cat: 'music', val: 100, size: 5, spr: 'keyboard', big: 1, pal: 'dark',
    brands: [['Toy', 0.4, 'gray', 3], ['Analog', 2.2, 'dark', 1]] },
  { id: 'lamp', name: 'Floor Lamp', cat: 'furniture', val: 28, size: 3, spr: 'lamp', big: 1, pal: 'teal',
    brands: [['Wobbly', 0.7, 'teal', 4], ["Banker's", 1.9, 'gold', 2], ['Tiffany-ish', 3.4, 'red', 1]] },
  { id: 'rugRolled', name: 'Rolled Rug', cat: 'furniture', val: 45, size: 5, spr: 'rugRolled', big: 1, pal: 'red',
    brands: [['Shag', 0.7, 'teal', 3], ['Persian', 2.8, 'red', 1]] },
  { id: 'mirror', name: 'Mirror', cat: 'antiques', val: 65, size: 5, spr: 'mirror', big: 1,
    brands: [['Tarnished', 0.6, 'gray', 4], ['Gilt', 1.3, 'gold', 3], ['Venetian', 2.8, 'gold', 1]] },
  { id: 'painting', name: 'Framed Painting', cat: 'antiques', val: 70, size: 3, spr: 'painting', big: 1,
    brands: [['Motel Art', 0.5, 'wood', 4], ['Landscape', 1.2, 'wood', 3], ['Signed', 3.5, 'gold', 1]] },
  { id: 'toolbox', name: 'Toolbox', cat: 'tools', val: 50, size: 3, spr: 'toolbox', big: 1, pal: 'red',
    container: { n: [1, 2], pool: 'tools' } },
  { id: 'workbench', name: 'Workbench', cat: 'tools', val: 95, size: 8, spr: 'workbench', big: 1 },
  { id: 'drill', name: 'Power Drill', cat: 'tools', val: 65, size: 3, spr: 'drill', big: 1, pal: 'blue',
    brands: [['NoName', 0.6, 'gray', 3], ['DeWatt', 1.5, 'gold', 2]] },
  { id: 'filing', name: 'Filing Cabinet', cat: 'furniture', val: 45, size: 7, spr: 'filing', big: 1,
    container: { n: [1, 3], pool: 'papers' } },
  { id: 'trunk', name: 'Trunk', cat: 'antiques', val: 85, size: 6, spr: 'trunk', big: 1, pal: 'wood',
    container: { n: [2, 4], pool: 'home' },
    brands: [['Musty', 0.8, 'wood', 4], ['Steamer', 1.2, 'wood', 3], ["Captain's", 2.4, 'dark', 1]] },
  { id: 'sewing', name: 'Sewing Machine', cat: 'antiques', val: 90, size: 5, spr: 'sewing', big: 1,
    brands: [['Rusty', 0.6, 'gray', 4], ['Treadle', 1.6, 'dark', 2], ['Featherweight', 2.9, 'dark', 1]] },
  { id: 'typewriter', name: 'Typewriter', cat: 'antiques', val: 80, size: 3, spr: 'typewriter', big: 1,
    brands: [['Sticky', 0.7, 'gray', 4], ['Corona-ish', 1.5, 'dark', 2], ["Novelist's", 2.8, 'dark', 1]] },
  { id: 'radio', name: 'Radio', cat: 'antiques', val: 75, size: 3, spr: 'radio', big: 1, pal: 'wood',
    brands: [['Crackly', 0.7, 'wood', 4], ['Cathedral', 1.8, 'wood', 2], ['Prewar', 3, 'dark', 1]] },
  { id: 'fan', name: 'Desk Fan', cat: 'junk', val: 18, size: 3, spr: 'fan', big: 1 },
  { id: 'vhs', name: 'Box of VHS Tapes', cat: 'junk', val: 10, size: 3, spr: 'vhs', big: 1 },
  { id: 'mannequin', name: 'Mannequin', cat: 'weird', val: 45, size: 5, spr: 'mannequin', big: 1 },
  { id: 'tuba', name: 'Tuba', cat: 'music', val: 120, size: 5, spr: 'tuba', big: 1,
    brands: [['Dented', 0.6, 'gold', 3], ['Marching', 1.2, 'gold', 2], ['Symphony', 2.4, 'gold', 1]] },
  { id: 'arcade', name: 'Arcade Cabinet', cat: 'electronics', val: 260, size: 9, spr: 'arcade', big: 1, pal: 'blue',
    brands: [['Beat-up', 0.6, 'teal', 3], ['Classic', 1.6, 'blue', 2], ['Prototype', 4, 'red', 1]] },
  { id: 'till', name: 'Cash Register', cat: 'electronics', val: 85, size: 4, spr: 'till', big: 1,
    container: { n: [1, 1], pool: 'cashy' } },
  { id: 'neon', name: 'Neon Sign', cat: 'electronics', val: 110, size: 4, spr: 'neon', big: 1,
    brands: [['Flickering', 0.8, 'blue', 3], ['Working', 1.5, 'blue', 2]] },
  { id: 'skis', name: 'Skis', cat: 'collectibles', val: 40, size: 4, spr: 'skis', big: 1, pal: 'blue',
    brands: [['Wooden', 1, 'wood', 3], ['Racing', 1.9, 'red', 1]] },
  { id: 'garbage', name: 'Garbage Bag', cat: 'junk', val: 2, size: 3, spr: 'garbage', big: 1,
    container: { n: [0, 2], pool: 'trash' } },
  { id: 'microwave', name: 'Microwave', cat: 'electronics', val: 45, size: 4, spr: 'microwave', big: 1 },
  { id: 'stereo', name: 'Stereo', cat: 'electronics', val: 95, size: 4, spr: 'stereo', big: 1, pal: 'dark',
    brands: [['Boombox', 0.7, 'gray', 3], ['Hi-Fi', 1.6, 'dark', 2], ['Quadraphonic', 2.6, 'dark', 1]] },
  { id: 'officeChair', name: 'Office Chair', cat: 'furniture', val: 40, size: 5, spr: 'officeChair', big: 1, pal: 'dark',
    brands: [['Squeaky', 0.7, 'gray', 3], ['Ergonomic', 1.5, 'blue', 2], ['Executive', 2.4, 'dark', 1]] },
  { id: 'suitcase', name: 'Suitcase', cat: 'collectibles', val: 35, size: 4, spr: 'suitcase', big: 1, pal: 'red',
    container: { n: [1, 3], pool: 'home' },
    brands: [['Battered', 0.8, 'teal', 3], ['Leather', 1.6, 'wood', 2], ['Diplomat', 2.6, 'dark', 1]] },
  { id: 'birdcage', name: 'Birdcage', cat: 'weird', val: 55, size: 4, spr: 'birdcage', big: 1 },
  { id: 'globe', name: 'Globe', cat: 'antiques', val: 70, size: 3, spr: 'globe', big: 1,
    brands: [['Schoolroom', 0.8, 'blue', 3], ['Brass-Stand', 1.9, 'gold', 2], ["Explorer's", 3, 'gold', 1]] },
  { id: 'ladder', name: 'Stepladder', cat: 'tools', val: 45, size: 6, spr: 'ladder', big: 1 },
  { id: 'golfClubs', name: 'Golf Bag', cat: 'collectibles', val: 110, size: 5, spr: 'golfClubs', big: 1, pal: 'red',
    brands: [['Rusty', 0.6, 'teal', 3], ['Tour', 1.8, 'red', 1]] },
  // ---------- set pieces (never spawn loose — placed by set contracts) ----------
  { id: 'diningTable', name: 'Dining Table', cat: 'furniture', val: 95, size: 8, spr: 'diningTable', big: 1, pal: 'wood', setOnly: 1,
    container: { n: [0, 1], pool: 'home' } },           // one shallow drawer
  { id: 'diningChair', name: 'Dining Chair', cat: 'furniture', val: 26, size: 3, spr: 'diningChair', big: 1, pal: 'wood', setOnly: 1 },
  { id: 'tableLeaf', name: 'Table Leaf', cat: 'furniture', val: 12, size: 2, spr: 'tableLeaf', pal: 'wood', setOnly: 1 },
  { id: 'tablecloth', name: 'Linen Tablecloth', cat: 'antiques', val: 8, size: 1, spr: 'tablecloth', setOnly: 1 },
  { id: 'gravyBoat', name: 'Gravy Boat', cat: 'antiques', val: 40, size: 1, spr: 'gravyBoat', setOnly: 1 },
  { id: 'tourGolfBag', name: 'Golf Bag', cat: 'collectibles', val: 95, size: 5, spr: 'golfClubs', big: 1, pal: 'red', setOnly: 1 },
  { id: 'ironSet', name: 'Iron Set', cat: 'collectibles', val: 30, size: 2, spr: 'ironSet', setOnly: 1 },
  { id: 'ballCan', name: 'Coffee Can of Balls', cat: 'collectibles', val: 12, size: 1, spr: 'ballCan', setOnly: 1 },
  { id: 'scorecard', name: 'Signed Scorecard', cat: 'collectibles', val: 35, size: 1, spr: 'scorecard', setOnly: 1 },
  { id: 'stageGuitar', name: 'Stage Guitar', cat: 'music', val: 120, size: 4, spr: 'guitar', big: 1, pal: 'wood', setOnly: 1 },
  { id: 'stageCase', name: 'Road Case', cat: 'music', val: 55, size: 4, spr: 'guitarCase', big: 1, pal: 'dark', setOnly: 1,
    container: { n: [0, 1], pool: 'music' } },
  { id: 'stageAmp', name: 'Stage Amp', cat: 'music', val: 100, size: 5, spr: 'amp', big: 1, pal: 'dark', setOnly: 1 },
  { id: 'stagePedal', name: 'Boxed Pedal', cat: 'music', val: 60, size: 1, spr: 'pedal', setOnly: 1 },

  // ---------- media (each opens tape-by-tape at home) ----------
  { id: 'dvdStack', name: 'Stack of DVDs', cat: 'junk', val: 8, size: 2, spr: 'dvdStack', big: 1 },
  { id: 'comicBox', name: 'Long Box of Comics', cat: 'junk', val: 10, size: 3, spr: 'comicBox', big: 1 },
  { id: 'blurayBox', name: 'Box of Blu-rays', cat: 'junk', val: 14, size: 3, spr: 'blurayBox', big: 1 },
  { id: 'cassettes', name: 'Shoebox of Cassettes', cat: 'junk', val: 6, size: 2, spr: 'cassettes', big: 1 },
  { id: 'edisonDiscs', name: 'Edison Disc Records', cat: 'antiques', val: 95, size: 3, spr: 'edisonDiscs', big: 1 },

  // ---------- the mean shelf: weapons and worse ----------
  { id: 'guillotine', name: 'Stage Guillotine', cat: 'weird', val: 380, size: 8, spr: 'guillotine', big: 1 },
  { id: 'bearTrap', name: 'Bear Trap', cat: 'weird', val: 110, size: 3, spr: 'bearTrap', big: 1 },
  { id: 'cagedBones', name: 'Caged Critter Skeleton', cat: 'weird', val: 140, size: 4, spr: 'cagedBones', big: 1 },
  { id: 'skullMount', name: 'Longhorn Skull', cat: 'weird', val: 120, size: 3, spr: 'skullMount', big: 1 },

  // ---------- the safe family (all locked; locksmith price scales) ----------
  { id: 'lockbox', name: 'Lockbox', cat: 'weird', val: 25, size: 3, spr: 'lockbox', big: 1,
    container: { n: [1, 2], pool: 'cashy', locked: 1, crack: 30 } },
  { id: 'strongbox', name: 'Strongbox', cat: 'weird', val: 45, size: 5, spr: 'strongbox', big: 1,
    container: { n: [1, 2], pool: 'rich', locked: 1, crack: 45 } },
  { id: 'gunSafe', name: 'Gun Safe', cat: 'weird', val: 90, size: 8, spr: 'gunSafe', big: 1,
    container: { n: [1, 3], pool: 'guns', locked: 1, crack: 75 } },
  { id: 'floorSafe', name: 'Floor Safe', cat: 'weird', val: 60, size: 9, spr: 'floorSafe', big: 1,
    container: { n: [2, 3], pool: 'rich', locked: 1, crack: 90 } },

  // ---------- small / loot items ----------
  { id: 'records', name: 'Rare Records', cat: 'music', val: 55, size: 1, spr: 'records' },
  { id: 'harmonica', name: 'Harmonica', cat: 'music', val: 40, size: 1, spr: 'harmonica' },
  { id: 'mic', name: 'Vintage Microphone', cat: 'music', val: 120, size: 1, spr: 'mic' },
  { id: 'pedal', name: 'Effects Pedal', cat: 'music', val: 85, size: 1, spr: 'pedal' },
  { id: 'comic', name: 'Old Comic Book', cat: 'collectibles', val: 90, size: 1, spr: 'comic' },
  { id: 'cards', name: 'Trading Cards', cat: 'collectibles', val: 110, size: 1, spr: 'cards' },
  { id: 'gameCart', name: 'Game Cartridge', cat: 'collectibles', val: 140, size: 1, spr: 'gameCart' },
  { id: 'medal', name: 'War Medal', cat: 'collectibles', val: 150, size: 1, spr: 'medal' },
  { id: 'silverware', name: 'Silverware Set', cat: 'antiques', val: 100, size: 1, spr: 'silverware' },
  { id: 'china', name: 'China Plate', cat: 'antiques', val: 80, size: 1, spr: 'china' },
  { id: 'vase', name: 'Ceramic Vase', cat: 'antiques', val: 85, size: 1, spr: 'vase' },
  { id: 'wine', name: 'Dusty Wine Bottle', cat: 'antiques', val: 130, size: 1, spr: 'wine' },
  { id: 'urn', name: 'Sealed Urn', cat: 'weird', val: 60, size: 1, spr: 'urn' },
  { id: 'knife', name: 'Hunting Knife', cat: 'weird', val: 75, size: 1, spr: 'knife' },
  { id: 'revolver', name: 'Old Revolver', cat: 'weird', val: 200, size: 1, spr: 'revolver' },
  { id: 'massager', name: 'Personal Massager', cat: 'weird', val: 90, size: 1, spr: 'massager' },
  { id: 'underwear', name: 'Vintage Underwear', cat: 'junk', val: 3, size: 1, spr: 'underwear' },
  { id: 'teddy', name: 'One-eyed Teddy', cat: 'junk', val: 7, size: 1, spr: 'teddy' },
  { id: 'diary', name: "Someone's Diary", cat: 'weird', val: 45, size: 1, spr: 'diary' },
  { id: 'wrench', name: 'Wrench Set', cat: 'tools', val: 55, size: 1, spr: 'wrench' },
  { id: 'walkman', name: 'Cassette Walkman', cat: 'electronics', val: 80, size: 1, spr: 'walkman' },
  { id: 'camera', name: 'Film Camera', cat: 'electronics', val: 115, size: 1, spr: 'camera' },
  { id: 'sword', name: 'Cavalry Saber', cat: 'weird', val: 220, size: 1, spr: 'sword' },
  { id: 'machete', name: 'Machete', cat: 'weird', val: 90, size: 1, spr: 'machete' },
  { id: 'crossbow', name: 'Hunting Crossbow', cat: 'weird', val: 160, size: 1, spr: 'crossbow' },
  { id: 'shotgun', name: 'Double-Barrel Shotgun', cat: 'weird', val: 260, size: 1, spr: 'shotgun' },
  { id: 'derringer', name: 'Pocket Derringer', cat: 'weird', val: 140, size: 1, spr: 'derringer' },
  { id: 'jarSpecimen', name: 'Something in a Jar', cat: 'weird', val: 95, size: 1, spr: 'jarSpecimen' },
  { id: 'brooch', name: 'Silver Brooch', cat: 'jewelry', val: 180, size: 1, spr: 'brooch' },
  { id: 'pearls', name: 'String of Pearls', cat: 'jewelry', val: 240, size: 1, spr: 'pearls' },
  { id: 'tiara', name: 'Rhinestone Tiara', cat: 'jewelry', val: 350, size: 1, spr: 'tiara' },
  { id: 'pocketWatch', name: 'Pocket Watch', cat: 'jewelry', val: 200, size: 1, spr: 'pocketWatch' },
  { id: 'ring', name: 'Gold Ring', cat: 'jewelry', val: 300, size: 1, spr: 'ring' },
  { id: 'necklace', name: 'Ruby Necklace', cat: 'jewelry', val: 260, size: 1, spr: 'necklace' },
  { id: 'watch', name: 'Wristwatch', cat: 'jewelry', val: 150, size: 1, spr: 'watch',
    brands: [['Quartz', 0.6, 'gray', 4], ['Rolodex', 3.5, 'gold', 1]] },
  { id: 'gem', name: 'Loose Gemstone', cat: 'jewelry', val: 480, size: 1, spr: 'gem' },
  { id: 'goldBar', name: 'Gold Bar', cat: 'jewelry', val: 750, size: 1, spr: 'goldBar' },
  { id: 'rareTape', name: 'Sealed VHS', cat: 'collectibles', val: 60, size: 1, spr: 'rareTape', setOnly: 1 },

  // ---------- toolbox drops (physical finds — never in random pools) ----------
  { id: 'toolFlashlight', name: 'Flashlight', cat: 'tools', val: 18, size: 1, spr: 'toolFlashlight', setOnly: 1, tool: 'flashlight' },
  { id: 'toolMirror', name: 'Inspection Mirror', cat: 'tools', val: 24, size: 1, spr: 'toolMirror', setOnly: 1, tool: 'mirror' },
  { id: 'toolLoupe', name: "Jeweler's Loupe", cat: 'tools', val: 30, size: 1, spr: 'toolLoupe', setOnly: 1, tool: 'loupe' },
  { id: 'toolDetector', name: 'Metal Detector', cat: 'tools', val: 36, size: 2, spr: 'toolDetector', setOnly: 1, tool: 'metalDetector' },
  { id: 'toolCatalog', name: "Appraiser's Pocket Guide", cat: 'tools', val: 48, size: 1, spr: 'toolCatalog', setOnly: 1, tool: 'catalog' },
  { id: 'toolNotes', name: "Ed's Leftover Notes", cat: 'tools', val: 5, size: 1, spr: 'toolNotes', setOnly: 1, tool: 'edNotes' },
  { id: 'cashWad', name: 'Wad of Cash', cat: 'cash', val: 0, size: 1, spr: 'cashWad', cash: [40, 260] },
  { id: 'coinJar', name: 'Coin Jar', cat: 'cash', val: 0, size: 1, spr: 'coinJar', cash: [10, 70] },

  // ---------- movie props (only ever placed as named junk) ----------
  { id: 'rubySlippers', name: 'Ruby Slippers', cat: 'collectibles', val: 120, size: 1, spr: 'rubySlippers', setOnly: 1 },
  { id: 'hockeyMask', name: 'Hockey Mask', cat: 'weird', val: 60, size: 1, spr: 'hockeyMask', setOnly: 1 },
  { id: 'propHilt', name: 'Prop Sword Hilt', cat: 'collectibles', val: 80, size: 1, spr: 'propHilt', setOnly: 1 },
  { id: 'fluxGadget', name: 'Blinking Movie Gadget', cat: 'weird', val: 90, size: 1, spr: 'fluxGadget', setOnly: 1 },

  // ---------- legendaries (world-unique) ----------
  { id: 'goldJacket', name: 'THE Gold Jacket', cat: 'collectibles', val: 5000, size: 2, spr: 'goldJacket', legendary: 1 },
  { id: 'moonRock', name: 'Moon Rock', cat: 'weird', val: 4200, size: 1, spr: 'moonRock', legendary: 1 },
  { id: 'jewelEgg', name: 'Jeweled Egg', cat: 'jewelry', val: 6000, size: 1, spr: 'jewelEgg', legendary: 1 },
  { id: 'goonMap', name: "One-Eyed Willy's Map", cat: 'collectibles', val: 4500, size: 1, spr: 'goonMap', legendary: 1 },
  { id: 'nugget', name: 'The Dry Creek Nugget', cat: 'collectibles', val: 3800, size: 1, spr: 'nugget', legendary: 1 },
  { id: 'deed', name: 'The Original Deed to Gypsum City', cat: 'antiques', val: 4600, size: 1, spr: 'deed', legendary: 1 },
  { id: 'gavel', name: "The Founders' Gavel", cat: 'antiques', val: 4000, size: 1, spr: 'gavel', legendary: 1 },
  { id: 'jarThing', name: 'The Marrow Creek Thing (in its jar)', cat: 'weird', val: 4400, size: 2, spr: 'jarThing', legendary: 1 },
  { id: 'cameo', name: "Lady Vermillion's Cameo", cat: 'jewelry', val: 5200, size: 1, spr: 'cameo', legendary: 1 },
  { id: 'stampSheet', name: 'The Inverted Kettle Sheet', cat: 'collectibles', val: 5600, size: 1, spr: 'stampSheet', legendary: 1 },
  { id: 'pageantCrown', name: 'The Pageant Crown of Chrome Springs', cat: 'jewelry', val: 9000, size: 2, spr: 'pageantCrown', legendary: 1 },

  // ---------- false positives: same sprite, same name, plastic heart ----------
  { id: 'fakeJacket', name: 'THE Gold Jacket', cat: 'weird', val: 90, size: 2, spr: 'goldJacket', setOnly: 1, fakeOf: 'goldJacket' },
  { id: 'fakeRock', name: 'Moon Rock', cat: 'weird', val: 60, size: 1, spr: 'moonRock', setOnly: 1, fakeOf: 'moonRock' },
  { id: 'fakeEgg', name: 'Jeweled Egg', cat: 'weird', val: 130, size: 1, spr: 'jewelEgg', setOnly: 1, fakeOf: 'jewelEgg' },
  { id: 'fakeMap', name: "One-Eyed Willy's Map", cat: 'weird', val: 45, size: 1, spr: 'goonMap', setOnly: 1, fakeOf: 'goonMap' },
  { id: 'fakeNugget', name: 'The Dry Creek Nugget', cat: 'weird', val: 25, size: 1, spr: 'nugget', setOnly: 1, fakeOf: 'nugget', fakeTag: 'pyrite' },
  { id: 'fakeDeed', name: 'The Original Deed to Gypsum City', cat: 'weird', val: 40, size: 1, spr: 'deed', setOnly: 1, fakeOf: 'deed', fakeTag: 'forgery' },
  { id: 'fakeGavel', name: "The Founders' Gavel", cat: 'weird', val: 30, size: 1, spr: 'gavel', setOnly: 1, fakeOf: 'gavel', fakeTag: 'souvenir' },
  { id: 'fakeJarThing', name: 'The Marrow Creek Thing (in its jar)', cat: 'weird', val: 55, size: 2, spr: 'jarThing', setOnly: 1, fakeOf: 'jarThing', fakeTag: 'rubber' },
  { id: 'fakeCameo', name: "Lady Vermillion's Cameo", cat: 'weird', val: 60, size: 1, spr: 'cameo', setOnly: 1, fakeOf: 'cameo', fakeTag: 'paste' },
  { id: 'fakeStampSheet', name: 'The Inverted Kettle Sheet', cat: 'weird', val: 35, size: 1, spr: 'stampSheet', setOnly: 1, fakeOf: 'stampSheet', fakeTag: 'reprint' },
  { id: 'fakePageantCrown', name: 'The Pageant Crown of Chrome Springs', cat: 'weird', val: 150, size: 2, spr: 'pageantCrown', setOnly: 1, fakeOf: 'pageantCrown', fakeTag: 'rhinestone' },

  // ---------- story pieces, proofs and keys (only ever placed by lockerstories.js) ----------
  { id: 'photo', name: 'Photograph', cat: 'collectibles', val: 8, size: 1, spr: 'photo', setOnly: 1 },
  { id: 'rabbitCage', name: 'Rabbit Cage', cat: 'weird', val: 30, size: 4, spr: 'rabbitCage', big: 1 , setOnly: 1 },
  { id: 'magicKit', name: 'Magic Kit', cat: 'weird', val: 25, size: 1, spr: 'magicKit', setOnly: 1 },
  { id: 'canCrate', name: 'Crate of Cans', cat: 'junk', val: 12, size: 4, spr: 'canCrate', big: 1, setOnly: 1,
    container: { n: [1, 2], pool: 'trash' } },
  { id: 'console', name: 'Game Console', cat: 'electronics', val: 60, size: 3, spr: 'console', big: 1, setOnly: 1,
    brands: [['Beige', 0.8, 'gray', 4], ['Launch Edition', 2.4, 'dark', 1]] },
  { id: 'skateboard', name: 'Skateboard', cat: 'collectibles', val: 28, size: 3, spr: 'skateboard', big: 1, setOnly: 1 },
  { id: 'poster', name: 'Rolled Poster', cat: 'collectibles', val: 6, size: 1, spr: 'poster', setOnly: 1 },
  { id: 'prototype', name: 'Prototype Sample', cat: 'collectibles', val: 40, size: 1, spr: 'prototype', setOnly: 1 },
  { id: 'oddKey', name: 'Odd Key', cat: 'weird', val: 5, size: 1, spr: 'oddKey', setOnly: 1 },

  // ---------- the raccoon's calling card ----------
  { id: 'tinyVest', name: 'A Tiny Vest, Neatly Folded', cat: 'weird', val: 35, size: 1, spr: 'tinyVest', setOnly: 1 },
  // ...and what he leaves behind. Front row, some mornings. He was here. He may still be.
  { id: 'droppings', name: 'Raccoon Droppings', cat: 'junk', val: 1, size: 1, spr: 'droppings', setOnly: 1,
    note: 'Recent. Or not. You are not an expert. The office says the same about the tenant.' },

  // ---------- the decade: things a certain kind of unit was full of, none of them the story ----------
  { id: 'ouijaBoard', name: 'Talking Board', cat: 'weird', val: 45, size: 1, spr: 'ouijaBoard',
    note: 'The planchette is taped to the lid. Somebody wanted it to stay put.' },
  { id: 'cabbageDoll', name: 'Cabbage Crop Kid', cat: 'collectibles', val: 60, size: 1, spr: 'cabbageDoll',
    note: 'Adoption papers in the box. The name is Delbert. Somebody chose that.' },
  { id: 'instantCamera', name: 'Instant Camera', cat: 'electronics', val: 70, size: 1, spr: 'instantCamera',
    note: 'One shot left in the pack. It has been one shot left since 1986.' },
  { id: 'floppyBox', name: 'Box of Floppy Disks', cat: 'collectibles', val: 15, size: 1, spr: 'floppyBox',
    note: 'Labels: TAXES 1988, GAMES, GAMES 2, DO NOT ERASE. The last one is blank.' },
  { id: 'trashCards', name: 'Trash Can Kids Cards', cat: 'collectibles', val: 55, size: 1, spr: 'trashCards',
    note: 'A rubber band around them, and the rubber band has given up. The gum is a fossil.' },
  { id: 'homeComputer', name: 'Breadbox Home Computer, 64K', cat: 'electronics', val: 140, size: 2, spr: 'homeComputer', big: 1,
    note: 'A program on the tape drive. Ten lines. Line 20 says GOTO 10.' },
  { id: 'fruitComputer', name: 'Fruit II Home Computer', cat: 'electronics', val: 220, size: 3, spr: 'fruitComputer', big: 1,
    note: 'The monitor is the colour of old teeth. It still boots. It asks for a disk you do not have.' },
  { id: 'woodConsole', name: 'Woodgrain Game Console', cat: 'electronics', val: 90, size: 2, spr: 'woodConsole', big: 1,
    container: { n: [1, 1], pool: 'slot_atari' },
    note: 'Fake wood on the front, real dust in the slot. Six switches. None of them is off.' },
  { id: 'greyConsole', name: 'Grey 8-Bit Console', cat: 'electronics', val: 110, size: 2, spr: 'greyConsole', big: 1,
    container: { n: [1, 1], pool: 'slot_nes' },
    note: 'Somebody blew into every cartridge in this box. It never helped. They kept doing it.' },
  // ---------- the rest of the shelf: every console has one slot, and something may be in it ----------
  { id: 'masterConsole', name: 'Red-Stripe 8-Bit Console', cat: 'electronics', val: 70, size: 2, spr: 'masterConsole', big: 1,
    container: { n: [1, 1], pool: 'slot_master' },
    note: 'A card slot and a cartridge slot. The card slot has a card in it that is not a game. It is a library card.' },
  { id: 'snesConsole', name: 'Lavender-Button 16-Bit Console', cat: 'electronics', val: 130, size: 2, spr: 'snesConsole', big: 1,
    container: { n: [1, 1], pool: 'slot_snes' },
    note: 'The plastic has gone the colour of weak tea on one side. It sat in a window. It sat there for years.' },
  { id: 'genesisConsole', name: 'Black 16-Bit Console', cat: 'electronics', val: 120, size: 2, spr: 'genesisConsole', big: 1,
    container: { n: [1, 1], pool: 'slot_genesis' },
    note: 'A gold badge on the lid says 16-BIT, in case you were wondering. Somebody was.' },
  { id: 'gameboyHandheld', name: 'Grey Brick Handheld', cat: 'electronics', val: 60, size: 1, spr: 'gameboyHandheld',
    container: { n: [1, 1], pool: 'slot_gameboy' },
    note: 'Four batteries in it, dead since a road trip. A name in marker on the back. A second name over the first.' },
  { id: 'gamegearHandheld', name: 'Black Widescreen Handheld', cat: 'electronics', val: 65, size: 1, spr: 'gamegearHandheld',
    container: { n: [1, 1], pool: 'slot_gamegear' },
    note: 'Six batteries for three hours, and a car adapter still coiled around it. The car is not here.' },
  { id: 'n64Console', name: 'Three-Pronged Console', cat: 'electronics', val: 140, size: 2, spr: 'n64Console', big: 1,
    container: { n: [1, 1], pool: 'slot_n64' },
    note: 'One controller, the stick worn loose from a game about a boat race. The expansion slot has something in it.' },
  { id: 'psxConsole', name: 'Grey Disc Console', cat: 'electronics', val: 110, size: 2, spr: 'psxConsole', big: 1,
    container: { n: [1, 1], pool: 'slot_psx' },
    note: 'Upside down. Everybody ran it upside down. It works upside down. Nobody knows why.' },
  { id: 'dreamConsole', name: 'White Swirl Disc Console', cat: 'electronics', val: 160, size: 2, spr: 'dreamConsole', big: 1,
    container: { n: [1, 1], pool: 'slot_dreamcast' },
    note: 'A memory card with a tiny screen in the controller. It is playing a tiny game. It has been for years.' },
  // the games: which one is decided by the roll (SYSTEMS in games.js)
  { id: 'cartAtari', name: 'Woodgrain-Console Cartridge', cat: 'collectibles', val: 10, size: 1, spr: 'cartAtari', variants: 'games:atari' },
  { id: 'cartMaster', name: 'Red-Stripe Cartridge', cat: 'collectibles', val: 12, size: 1, spr: 'cartMaster', variants: 'games:master' },
  { id: 'cartNes', name: 'Grey 8-Bit Cartridge', cat: 'collectibles', val: 12, size: 1, spr: 'cartNes', variants: 'games:nes' },
  { id: 'cartSnes', name: '16-Bit Cartridge', cat: 'collectibles', val: 14, size: 1, spr: 'cartSnes', variants: 'games:snes' },
  { id: 'cartGenesis', name: 'Black 16-Bit Cartridge', cat: 'collectibles', val: 12, size: 1, spr: 'cartGenesis', variants: 'games:genesis' },
  { id: 'cartGameboy', name: 'Handheld Cartridge', cat: 'collectibles', val: 10, size: 1, spr: 'cartGameboy', variants: 'games:gameboy' },
  { id: 'cartGamegear', name: 'Widescreen Handheld Cartridge', cat: 'collectibles', val: 10, size: 1, spr: 'cartGamegear', variants: 'games:gamegear' },
  { id: 'cartN64', name: 'Sixty-Four Cartridge', cat: 'collectibles', val: 16, size: 1, spr: 'cartN64', variants: 'games:n64' },
  { id: 'discPsx', name: 'Grey Disc Console Game', cat: 'collectibles', val: 12, size: 1, spr: 'discPsx', variants: 'games:psx' },
  { id: 'discDream', name: 'Swirl Disc Console Game', cat: 'collectibles', val: 16, size: 1, spr: 'discDream', variants: 'games:dreamcast' },
  // the shoeboxes: opened one game at a time at home (MEDIA_KINDS, from GAME_MEDIA_KINDS)
  { id: 'cartsAtari', name: 'Shoebox of Woodgrain-Console Cartridges', cat: 'junk', val: 12, size: 2, spr: 'cartBox', pal: 'wood', big: 1 },
  { id: 'cartsMaster', name: 'Shoebox of Red-Stripe Cartridges', cat: 'junk', val: 12, size: 2, spr: 'cartBox', pal: 'red', big: 1 },
  { id: 'cartsNes', name: 'Shoebox of Grey 8-Bit Cartridges', cat: 'junk', val: 14, size: 2, spr: 'cartBox', pal: 'white', big: 1 },
  { id: 'cartsSnes', name: 'Shoebox of 16-Bit Cartridges', cat: 'junk', val: 14, size: 2, spr: 'cartBox', pal: 'blue', big: 1 },
  { id: 'cartsGenesis', name: 'Shoebox of Black 16-Bit Cartridges', cat: 'junk', val: 14, size: 2, spr: 'cartBox', pal: 'dark', big: 1 },
  { id: 'cartsGameboy', name: 'Shoebox of Handheld Cartridges', cat: 'junk', val: 12, size: 1, spr: 'cartBox', pal: 'teal', big: 1 },
  { id: 'cartsGamegear', name: 'Shoebox of Widescreen Handheld Cartridges', cat: 'junk', val: 12, size: 1, spr: 'cartBox', pal: 'dark', big: 1 },
  { id: 'cartsN64', name: 'Shoebox of Sixty-Four Cartridges', cat: 'junk', val: 16, size: 2, spr: 'cartBox', pal: 'gold', big: 1 },
  { id: 'discsPsx', name: 'Spindle of Grey Disc Console Games', cat: 'junk', val: 12, size: 2, spr: 'cartBox', pal: 'white', big: 1 },
  { id: 'discsDream', name: 'Spindle of Swirl Disc Console Games', cat: 'junk', val: 14, size: 2, spr: 'cartBox', pal: 'pink', big: 1 },
  { id: 'pinball', name: 'Pinball Machine', cat: 'electronics', val: 320, size: 9, spr: 'pinball', big: 1, pal: 'red',
    note: 'The high score is three initials. The third one is scratched out. By hand. Recently.' },
  // ---------- the unmentionables: the office has blurred these. There is nothing under the blur. That is the joke. ----------
  { id: 'adultNovelty', name: 'Novelty Item, Adult', cat: 'weird', val: 40, size: 1, spr: 'censored', censored: 1,
    note: 'You look. You put it back. You do not tell the appraiser.' },
  { id: 'nightstandDrawer', name: 'The Nightstand Drawer, Contents Of', cat: 'weird', val: 35, size: 1, spr: 'censored', censored: 1,
    note: 'Everything a nightstand drawer has, in a bag, in the order it was in the drawer.' },
  { id: 'mechanicsCalendar', name: 'A Calendar, 1987, Mechanics', cat: 'weird', val: 25, size: 1, spr: 'censored', censored: 1,
    note: 'Twelve months. Twelve wrenches. The wrenches are not the point of the calendar.' },
  { id: 'mattressMagazine', name: 'A Magazine From Under the Mattress', cat: 'weird', val: 20, size: 1, spr: 'censored', censored: 1,
    note: 'It was under the mattress. It is still, in a sense, under the mattress.' },
  { id: 'notBridgeCards', name: 'A Deck of Cards, Not for Bridge', cat: 'weird', val: 30, size: 1, spr: 'censored', censored: 1,
    note: 'Fifty-two cards. The queen of hearts is the least of it.' },
  { id: 'wrongPoster', name: 'A Poster, Rolled, Wrong Way', cat: 'weird', val: 22, size: 1, spr: 'censored', censored: 1,
    note: 'Rolled with the picture out. Somebody rolled it back the right way. Somebody rolled it wrong again.' },
  { id: 'notTaxesBox', name: 'A Box Marked TAXES That Is Not Taxes', cat: 'weird', val: 150, size: 2, spr: 'censored', censored: 1,
    note: 'The box says TAXES in three places. It has never held a tax. Carl has asked about this box by name.' },
  { id: 'generousCostume', name: 'A Costume, Sized Generously', cat: 'weird', val: 60, size: 2, spr: 'censored', censored: 1,
    note: 'A costume for one occasion. The occasion is not on the calendar. The calendar is in the same unit.' },
  // ---------- oddments: twelve families of small strange things; the roll picks one (ODDMENTS in oddments.js) ----------
  { id: 'oddTokens', name: 'Token', cat: 'collectibles', val: 8, size: 1, spr: 'oddToken', pal: 'gold', variants: 'oddment:tokens' },
  { id: 'oddKeys', name: 'Old Key', cat: 'weird', val: 8, size: 1, spr: 'oddKey', pal: 'gold', variants: 'oddment:keys' },
  { id: 'oddKitchen', name: 'Kitchen Gadget', cat: 'antiques', val: 8, size: 1, spr: 'oddTool', pal: 'wood', variants: 'oddment:kitchen' },
  { id: 'oddOccult', name: 'Novelty of the Occult', cat: 'weird', val: 8, size: 1, spr: 'oddCase', pal: 'red', variants: 'oddment:occult' },
  { id: 'oddMedical', name: 'Medical Curiosity', cat: 'antiques', val: 8, size: 1, spr: 'oddCase', pal: 'white', variants: 'oddment:medical' },
  { id: 'oddSurvival', name: 'Emergency Item', cat: 'tools', val: 8, size: 1, spr: 'oddTin', pal: 'teal', variants: 'oddment:survival' },
  { id: 'oddOutdoors', name: 'Outdoor Tool', cat: 'tools', val: 8, size: 1, spr: 'oddTool', pal: 'dark', variants: 'oddment:outdoors' },
  { id: 'oddRoad', name: 'Glove-Box Thing', cat: 'tools', val: 8, size: 1, spr: 'oddGadget', pal: 'blue', variants: 'oddment:road' },
  { id: 'oddGadgets', name: 'Pocket Gadget', cat: 'electronics', val: 8, size: 1, spr: 'oddGadget', pal: 'dark', variants: 'oddment:gadgets' },
  { id: 'oddDesk', name: 'Desk Thing', cat: 'collectibles', val: 8, size: 1, spr: 'oddPaper', pal: 'wood', variants: 'oddment:desk' },
  { id: 'oddPhoto', name: 'Optical Curiosity', cat: 'electronics', val: 8, size: 1, spr: 'oddGadget', pal: 'gold', variants: 'oddment:photo' },
  { id: 'oddWardrobe', name: 'Dresser-Top Thing', cat: 'antiques', val: 8, size: 1, spr: 'oddCase', pal: 'pink', variants: 'oddment:wardrobe' },
  // a rolled movie poster: which movie is decided by the roll (MOVIES)
  { id: 'moviePoster', name: 'Rolled Movie Poster', cat: 'collectibles', val: 12, size: 1, spr: 'moviePoster', variants: 'movies' },
  // ...and, once in a very long while, the raccoon himself. You do not load him. He knows that.
  { id: 'liveRaccoon', name: 'A Raccoon. Alive.', cat: 'weird', val: 1, size: 2, spr: 'liveRaccoon', setOnly: 1 },
];

// the five movies of the decade, as the county remembers them (titles bent enough to be ours):
// they turn up as VHS and DVD keepers (home.js) and as rolled posters. id → [title, poster note, poster value]
const MOVIES = [
  { id: 'goondocks', title: 'THE GOONDOCK KIDS', poster: ['Poster: THE GOONDOCK KIDS', 'A map, a pirate ship, seven kids on bikes. The corner says "never say die." Somebody added "we didn\'t."', 40] },
  { id: 'ferris', title: "FERRIS WHEELER'S DAY OFF", poster: ["Poster: FERRIS WHEELER'S DAY OFF", 'A kid in a leather jacket leaning on a car that is not his. Somebody drew a moustache on him, then erased it.', 35] },
  { id: 'bunk', title: 'BUNK BROTHERS', poster: ['Poster: BUNK BROTHERS', 'Two grown men in a bunk bed. The tagline is one word and the word is "Prestige."', 30] },
  { id: 'nebraska', title: 'NEBRASKA JONES AND THE LOST LOCKER', poster: ['Poster: NEBRASKA JONES AND THE LOST LOCKER', 'A hat, a whip, a storage door with a boulder behind it. Rolled the wrong way for thirty years.', 45] },
  { id: 'meatballs', title: 'SPACE MEATBALLS', poster: ['Poster: SPACE MEATBALLS', 'A helmet the size of a car. A tagline about the schwartz, spelled wrong on purpose, then right.', 35] },
];
// what the office blurs: never described, never drawn, always a little more than Pete would say
const UNMENTIONABLES = ['adultNovelty', 'nightstandDrawer', 'mechanicsCalendar', 'mattressMagazine', 'notBridgeCards', 'wrongPoster', 'notTaxesBox', 'generousCostume'];
// the things of the decade: own every one of them once and it goes in the books
const EIGHTIES = ['ouijaBoard', 'cabbageDoll', 'instantCamera', 'floppyBox', 'trashCards', 'homeComputer', 'fruitComputer', 'woodConsole', 'greyConsole', 'pinball', 'walkman', 'arcade'];

const BASE_BY_ID = {};
for (const b of BASES) BASE_BY_ID[b.id] = b;

// the town whose units are being generated right now (genDay sets it). Some
// towns keep things nicer than others; the condition roll asks here first.
let GEN_TOWN = null;
function rollCond(R) {
  const w = GEN_TOWN && GEN_TOWN.condWeights;
  return R.wpick(CONDS.map((c, i) => [c, w ? w[i] : c[2]]));
}

const BIG_BASES = BASES.filter((b) => b.big && !b.setOnly);
const SMALL_BASES = BASES.filter((b) => !b.big && !b.legendary && !b.setOnly);
const LEGENDARY_BASES = BASES.filter((b) => b.legendary);

// value tiers for reveal color / flair
function tierOf(v) {
  if (v < 30) return { name: 'junk', col: PAL.dgray };
  if (v < 120) return { name: 'common', col: PAL.white };
  if (v < 300) return { name: 'good', col: PAL.green };
  if (v < 800) return { name: 'rare', col: PAL.lblue };
  if (v < 2500) return { name: 'epic', col: PAL.pink };
  return { name: 'LEGENDARY', col: PAL.gold };
}

// create a concrete item instance from a base
// setCtx: {setId, role, brand: [label, mult, palKey], brandLocked} — set pieces
// share the instance's brand roll, and locked pieces hide it until appraised.
function makeItem(baseId, R, setCtx) {
  const b = BASE_BY_ID[baseId];
  const it = {
    uid: nextUid(),
    hseed: R.i(1, 999999999),     // stable per-item seed (uids reroll on load)
    base: b.id,
    cat: b.cat,
    spr: b.spr,
    size: b.size,
    pal: b.pal || 'wood',
    cond: null,
    name: b.name,
    val: b.val,
    cash: null,
    container: null,
    locked: false,
    opened: false,
    loot: null,
    legendary: !!b.legendary,
    // placement (set by locker gen)
    layer: 0, col: 0, wCols: 1,
  };

  if (b.cash) {
    it.cash = R.i(b.cash[0], b.cash[1]);
    it.val = it.cash;
    it.cond = 'Clean';
  } else if (b.legendary) {
    it.cond = 'Mint';
  } else if (b.fakeOf) {
    // wears the legend's face until an appraiser touches it
    it.cond = 'Clean';
    it.fake = true;
    it.val = Math.max(1, Math.round(b.val * R.r(0.85, 1.2)));
    it.fakeEst = [R.i(2400, 3400), R.i(5200, 8200)];
  } else if (setCtx) {
    // set piece: brand comes from the set instance, not a fresh roll
    const br = setCtx.brand;
    let brandM = 1;
    if (setCtx.brandLocked) {
      it.name = br[0] + ' ' + b.name;
      brandM = br[1];
      if (br[2]) it.pal = br[2];
      it.hideBrand = true;                       // pedigree shows at appraisal, not at the door
    }
    const cd = rollCond(R);
    it.cond = cd[0];
    it.preName = cd[0] + ' ' + b.name;
    it.name = cd[0] + ' ' + it.name;
    it.val = Math.max(1, Math.round(b.val * brandM * cd[1] * R.r(0.9, 1.15)));
    it.set = { id: setCtx.setId, role: setCtx.role, brand: br[0] };
    it.brandM = Math.round(brandM * 100) / 100;   // recorded, so a pedigree claim can be struck back out to the plain thing (APPRAISAL.md)
  } else {
    // brand roll
    let brandM = 1;
    if (b.brands) {
      const br = R.wpick(b.brands.map((x) => [x, x[3] || 1]));
      it.name = br[0] + ' ' + b.name;
      brandM = br[1];
      if (br[2]) it.pal = br[2];
      const spread = GEN_TOWN && GEN_TOWN.brandSpread;
      if (spread && spread !== 1) brandM = Math.pow(brandM, spread);   // Vermillion: the gap between makers yawns
      if (GEN_TOWN && GEN_TOWN.hideBrandsAtDoor) {
        it.hideBrand = true;                                           // the maker shows at the loupe or the appraiser
        const alt = R.pick(b.brands);                                  // and the finish is no help at all
        if (alt[2]) it.pal = alt[2];
      }
    }
    it.brandM = Math.round(brandM * 100) / 100;
    // condition roll
    const cd = rollCond(R);
    it.cond = cd[0];
    if (it.hideBrand) it.preName = cd[0] + ' ' + b.name;
    it.name = cd[0] + ' ' + it.name;
    it.val = Math.max(1, Math.round(b.val * brandM * cd[1] * R.r(0.9, 1.15)));
  }

  if (b.container) {
    it.container = { pool: b.container.pool, n: b.container.n.slice(), cap: b.container.cap };
    it.locked = !!b.container.locked;
    it.crackCost = b.container.crack || 60;
  }
  if (b.tool) it.tool = b.tool;
  if (b.note) it.note = b.note;                                        // a fixed line for LOOK CLOSER
  if (b.censored) { it.censored = true; it.name = b.name; it.preName = null; }   // the office has blurred it; no condition grade on a thing nobody will describe
  if (b.variants && b.variants.indexOf('games:') === 0) rollGame(it, b, b.variants.slice(6));   // a cartridge is one game in particular (games.js)
  else if (b.variants && b.variants.indexOf('oddment:') === 0) rollOddment(it, b, b.variants.slice(8));   // a drawer thing is one thing in particular (oddments.js)
  else if (b.variants === 'movies') {                                  // a rolled poster is one movie in particular
    const m = MOVIES[it.hseed % MOVIES.length];
    it.movie = m.id;
    it.art = 'poster_' + m.id;           // its own one-sheet, falling back to the film's cover if unmade
    it.name = (it.cond ? it.cond + ' ' : '') + m.poster[0];
    it.preName = null;
    it.note = m.poster[1];
    it.val = Math.max(1, Math.round(m.poster[2] * (it.val / Math.max(1, b.val))));
  }
  const sp = SPRITES[b.spr] || SPRITES.mystery;
  it.wCols = Math.max(1, Math.ceil(sp.w / 48));
  return it;
}

// ======================================================================
// js/games.js
// ======================================================================
// ---- the consoles, and the games that went in them ----
// Ten systems from the shelf of a certain decade, every one of them renamed a
// notch sideways, and ten games each, renamed the same way. A console is a
// container with one slot (a cartridge or a disc may be in it). A shoebox of
// cartridges opens like a pile of tapes, one at a time, with two or three
// keepers per system worth real money. Nothing here is the story. All of it
// was somebody's Saturday. Cover art slots: media/md_<art>.png (64x88).


// games: [title, LOOK CLOSER note, value, art id]. value >= 60 makes it a keeper in the shoebox.
const SYSTEMS = {
  atari: {
    id: 'atari', label: 'WOODGRAIN', console: 'woodConsole', cart: 'cartAtari', pile: 'cartsAtari', word: 'cartridge', caseCol: '#4a3826',
    games: [
      ['KOMBAT TANKS', 'came with the console. two tanks, one label, twenty-seven variations', 6, 'at_tanks'],
      ['PITFALLS!', 'a man, a vine, a crocodile. the label has the patch instructions on it', 12, 'at_pitfalls'],
      ['ADVENTURING', 'a square that is a knight. there is a secret room. the label does not say so', 60, 'at_adventuring'],
      ['ASTEROIDZ', 'the label is a painting of a spaceship the game does not contain', 8, 'at_asteroidz'],
      ['MISSILE COMMANDER', 'the label art is the end of the world. the game is a trackball', 10, 'at_missile'],
      ['SPACE INTRUDERS', 'the cartridge that sold the console. the label agrees', 9, 'at_intruders'],
      ['PAK-MAN', 'the bad port. everybody bought it. everybody remembers', 5, 'at_pakman'],
      ["YARR'S REVENGE", 'a fly, a shield, a cannon. the best one. the label knows', 15, 'at_yarr'],
      ['THE EXTRA TERRIBLE', 'they buried thousands of these in a landfill. this one got away', 20, 'at_terrible'],
      ['AIR RAID-ISH', 'blue cartridge, a handle on top, no box. collectors call it the blue one and pay like it', 380, 'at_airraid'],
    ],
  },
  master: {
    id: 'master', label: 'RED STRIPE', console: 'masterConsole', cart: 'cartMaster', pile: 'cartsMaster', word: 'cartridge', caseCol: '#2a2a30',
    games: [
      ['ALEX KIDDE IN MIRACLE WORLD', 'built into the console, but here it is on a card anyway', 12, 'ms_alexkidde'],
      ['FANTASY STAR', 'a woman with a sword on the label. the game is thirty hours. the label is not', 60, 'ms_fantasy'],
      ['WONDER LAD III', 'a dragon curse, a snake, a mouse. the label art is a lie about the mouse', 30, 'ms_wonderlad'],
      ['SONICK THE HEDGEHOG', 'the 8-bit one. different levels. somebody wrote "the real one" on it', 14, 'ms_sonick'],
      ['SHINOBEE', 'a ninja on the label with a dog. the dog is the best part', 16, 'ms_shinobee'],
      ['OUT RAN', 'a red car on the label. the car is not for sale. the cartridge is', 10, 'ms_outran'],
      ['AFTER BURNT', 'a jet on the label doing something jets do not do', 8, 'ms_afterburnt'],
      ['R-TYPO', 'the hard one. the label shows the boss you never reached', 22, 'ms_rtypo'],
      ['CASTLE OF DELUSION', 'a mouse in a castle. the mouse is somebody\'s. not ours', 18, 'ms_delusion'],
      ['ZILLIONS', 'a laser-tag game the console understood. the cartridge is rarer than the gun', 75, 'ms_zillions'],
    ],
  },
  nes: {
    id: 'nes', label: 'GREY 8-BIT', console: 'greyConsole', cart: 'cartNes', pile: 'cartsNes', word: 'cartridge', caseCol: '#8a8a92',
    games: [
      ['SUPER PLUMBER BROS.', 'the label is worn white where thumbs went', 8, 'nes_plumber'],
      ['THE LEGEND OF ZELMA', 'gold cartridge. somebody kept it in a sock', 90, 'nes_zelma'],
      ['METRONOID', 'the password is written on the back in pencil', 25, 'nes_metronoid'],
      ['GIGA MAN 2', 'a name scratched into the plastic: DEREK', 30, 'nes_gigaman'],
      ['CONTRABAND', 'thirty lives, if you know the code. everybody knew the code', 22, 'nes_contraband'],
      ['DUCK HUNCH', 'came with a plastic gun. the gun is elsewhere', 6, 'nes_duckhunch'],
      ['TETRIX', 'the label has a coffee ring the shape of a T', 10, 'nes_tetrix'],
      ['CASTLEMANIA', 'a whip on the label, a rental sticker over the whip', 28, 'nes_castlemania'],
      ['PUNCH-IN!!', 'somebody circled the champion and wrote "liar"', 35, 'nes_punchin'],
      ['STADIUM EVENTS-ISH', 'a store-only cartridge. the store closed. collectors know', 400, 'nes_stadium'],
    ],
  },
  snes: {
    id: 'snes', label: '16-BIT', console: 'snesConsole', cart: 'cartSnes', pile: 'cartsSnes', word: 'cartridge', caseCol: '#b8b8c4',
    games: [
      ['SUPER PLUMBER WORLD', 'a dinosaur on the label. the dinosaur has a name and it is not on the label', 12, 'snes_plumberworld'],
      ['THE LEGEND OF ZELMA: A LINK TO THE PASTA', 'the map poster is still in the box. folded wrong', 40, 'snes_pasta'],
      ['SUPER METRONOID', 'somebody\'s save is on it: 2:58, 100%. do not overwrite', 60, 'snes_metronoid'],
      ['CHRONO TRICKER', 'a rental that was never returned in 1995. the fee is a car now', 120, 'snes_chrono'],
      ['MONKEY KING COUNTRY', 'the label has a banana sticker on it from actual bananas', 18, 'snes_monkey'],
      ['STREET BRAWLER II TURBO', 'the label is worn through at the fighter with the fireball', 15, 'snes_brawler'],
      ['SUPER PLUMBER KART', 'a name on the back: "MINE - KAYLEE". then "NO - CODY"', 20, 'snes_kart'],
      ['G-ZERO', 'the fastest game anyone owned. the cartridge smells like ozone', 14, 'snes_gzero'],
      ['EARTHBOUNCE', 'the big box, the guide, the scratch-and-sniff cards. all of it', 300, 'snes_earthbounce'],
      ['STAR FOXX', 'a chip inside that made the polygons. it still makes them', 22, 'snes_starfoxx'],
    ],
  },
  genesis: {
    id: 'genesis', label: '16-BIT BLACK', console: 'genesisConsole', cart: 'cartGenesis', pile: 'cartsGenesis', word: 'cartridge', caseCol: '#1a1a1e',
    games: [
      ['SONICK THE HEDGEHOG', 'came with the console. the console did not come with the box', 8, 'gen_sonick'],
      ['SONICK 2', 'a two-tailed fox on the label. two tails is the whole joke', 12, 'gen_sonick2'],
      ['STREETS OF RAGER 2', 'the music was better than the game. the game was great', 35, 'gen_rager'],
      ['GOLDEN HATCHET', 'a dwarf, an amazon, a barbarian, a label that has seen things', 20, 'gen_hatchet'],
      ['ALTERED BEEF', 'RISE FROM YOUR GRAVE, the label says. it means the cartridge', 15, 'gen_beef'],
      ['ECKO THE DOLPHIN', 'the hardest game about a dolphin ever made. somebody finished it. it says so', 18, 'gen_ecko'],
      ['MORTAL WOMBAT', 'the blood code is written on the label. A, B, A, C, A, B, B', 25, 'gen_wombat'],
      ['FANTASY STAR IV', 'a long one. the save battery has held since the Clinton years', 110, 'gen_fantasy'],
      ['TOEJELLY & EARL', 'two aliens, one cartridge, a label that funks', 70, 'gen_toejelly'],
      ['GUNSTAR ZEROES', 'the good one. the one everybody says is the good one', 130, 'gen_gunstar'],
    ],
  },
  gameboy: {
    id: 'gameboy', label: 'HANDHELD', console: 'gameboyHandheld', cart: 'cartGameboy', pile: 'cartsGameboy', word: 'cartridge', caseCol: '#8a9a7a',
    games: [
      ['TETRIX', 'the one that came in every box. this is that copy', 6, 'gb_tetrix'],
      ['POCKET CRITTERS: CRIMSON', 'a save with a critter at level 100 named after a dog', 40, 'gb_critters'],
      ['SUPER PLUMBER LAND', 'the label is scratched to the plastic. it was loved', 10, 'gb_plumberland'],
      ["THE LEGEND OF ZELMA: LONK'S AWAKENING", 'a game about a dream. the label is faded like one', 30, 'gb_lonk'],
      ["KIRBEE'S DREAM LAND", 'a pink thing on the label. the pink thing eats everything', 14, 'gb_kirbee'],
      ['METRONOID II', 'in a case. the case is worth more than most of the shoebox', 60, 'gb_metronoid2'],
      ['WARRIO LAND', 'a moustache on the label that could shade a porch', 16, 'gb_warrio'],
      ["MONKEY KONG '94", 'a hundred levels. somebody wrote "101" on the back and underlined it', 22, 'gb_monkeykong'],
      ['DR. PLUMBER', 'a doctor who is also a plumber. nobody asked', 8, 'gb_drplumber'],
      ['POCKET CRITTERS: GILT', 'sealed. in 1999 somebody decided not to open it, and then kept deciding', 250, 'gb_gilt'],
    ],
  },
  gamegear: {
    id: 'gamegear', label: 'WIDESCREEN', console: 'gamegearHandheld', cart: 'cartGamegear', pile: 'cartsGamegear', word: 'cartridge', caseCol: '#1e1e24',
    games: [
      ['SONICK THE HEDGEHOG', 'six batteries for three hours. the label is fine', 8, 'gg_sonick'],
      ['COLUMNZ', 'jewels fall. the label has jewels. the cartridge has no jewels', 6, 'gg_columnz'],
      ['SHINOBEE', 'a ninja in a small window. the label says it is the same ninja', 12, 'gg_shinobee'],
      ['STREETS OF RAGER', 'the label promises a city. the screen is four inches', 14, 'gg_rager'],
      ["TAIL'S ADVENTURE", 'the fox got his own game. the fox got a bomb. the label shows the bomb', 60, 'gg_tails'],
      ['ECKO THE DOLPHIN', 'the dolphin, smaller. still furious', 10, 'gg_ecko'],
      ['MORTAL WOMBAT II', 'the blood is in this one. the label says so, in blood', 15, 'gg_wombat2'],
      ['SHINING FORK', 'a whole war on a cartridge the size of a matchbook', 35, 'gg_fork'],
      ['RESTAR', 'a star with arms. the label makes it look easy. it is not easy', 30, 'gg_restar'],
      ['DEFENDERS OF OASYS', 'in the box, with the manual. the manual has a map. the map is right', 65, 'gg_oasys'],
    ],
  },
  n64: {
    id: 'n64', label: 'SIXTY-FOUR', console: 'n64Console', cart: 'cartN64', pile: 'cartsN64', word: 'cartridge', caseCol: '#4a4a56',
    games: [
      ['SUPER PLUMBER 64', 'a hundred and twenty stars. a save with a hundred and nineteen', 14, 'n64_plumber64'],
      ['THE LEGEND OF ZELMA: OCARINA OF THYME', 'the gold cartridge. somebody kept the box. the box is here', 40, 'n64_thyme'],
      ['GOLDEN EYE PATCH 007', 'four players, one screen, and a rule about the short man', 20, 'n64_eyepatch'],
      ['PLUMBER KART 64', 'a battle mode that ended friendships. the label is cheerful', 18, 'n64_kart'],
      ['STAR FOXX 64', 'a rumble pack came with it. the pack is elsewhere. the barrel roll is here', 16, 'n64_starfoxx'],
      ['BANJO-KAZOO', 'a bear with a bird in his backpack. the label makes it sound normal', 22, 'n64_banjo'],
      ['SUPER SMUSH BROS.', 'the label is everybody. the cartridge is a fight', 25, 'n64_smush'],
      ['MONKEY KONG 64', 'came with an expansion pack. the pack is in the console. probably', 15, 'n64_monkey'],
      ["MAJORCA'S MASK", 'a moon with a face on the label. three days, over and over', 65, 'n64_majorca'],
      ["CLAYBRAWLER-ISH: THE SCULPTOR'S CUT", 'a rental-only cartridge. the rental store is a dentist now', 350, 'n64_sculptor'],
    ],
  },
  psx: {
    id: 'psx', label: 'GREY DISC', console: 'psxConsole', cart: 'discPsx', pile: 'discsPsx', word: 'disc', caseCol: '#8a8a94',
    games: [
      ['FINAL FANTASIA VII', 'three discs. disc one is scratched where the flower girl is', 25, 'ps_fantasia7'],
      ['METAL GEARS SOLID', 'a box on the cover. a man in the box. the disc knows your memory card', 30, 'ps_gears'],
      ['CRUSH BANDICOOT', 'an orange thing spinning. the disc is scratched in a spiral, appropriately', 12, 'ps_crush'],
      ['SPYROW THE DRAGON', 'a purple dragon and a hundred gems. the case has one gem, glued', 14, 'ps_spyrow'],
      ['RESIDENT WEEVIL', 'a mansion, a door, a loading screen. the disc is the loading screen', 20, 'ps_weevil'],
      ['GRAND TURISMO', 'a car on the cover. six hundred more inside. the manual is a phone book', 8, 'ps_turismo'],
      ['TOMB RAIDERS', 'triangles in a tank top. the cover is the triangles', 10, 'ps_raiders'],
      ['TEKKENN 3', 'a demo disc taped inside. the demo disc is also great', 12, 'ps_tekkenn'],
      ['CASTLEMANIA: SYMPHONY OF THE NIGHTSHIFT', 'the long box. the soundtrack disc. a miserable pile of secrets', 140, 'ps_nightshift'],
      ['SUIKODEN-ISH II', 'a hundred and eight friends and a print run of nine. this is one of the nine', 260, 'ps_suiko'],
    ],
  },
  dreamcast: {
    id: 'dreamcast', label: 'SWIRL DISC', console: 'dreamConsole', cart: 'discDream', pile: 'discsDream', word: 'disc', caseCol: '#e8e4dc',
    games: [
      ['SONICK ADVENTURE', 'a whale chases you on the cover. it chases you in the game too', 14, 'dc_sonick'],
      ['SHENMOO', 'a man looking for sailors. the disc is disc one of three. so was the man', 30, 'dc_shenmoo'],
      ['JET SET RADIATOR', 'a kid on skates with a spray can. the cover is graffiti about the cover', 40, 'dc_radiator'],
      ['CRAZY TAXIS', 'the customer is going to the burger place. the customer is always going there', 16, 'dc_taxis'],
      ['SOULCALIBRE', 'a sword on the cover taller than the man holding it. the disc is perfect', 18, 'dc_soulcalibre'],
      ['FANTASY STAR ONLINE', 'online. the servers are gone. the cover does not know', 22, 'dc_fso'],
      ['POWER STONES', 'a dozen fighters and a dozen stones. the disc has a tiny scratch and a big heart', 35, 'dc_powerstones'],
      ['SKIES OF ARCADEIA', 'a boy, an airship, two discs, a sky. one disc is missing. the sky is here', 90, 'dc_skies'],
      ['FISHMAN', 'a fish with a face who talks to you through a microphone. the microphone is in the box. he is not', 60, 'dc_fishman'],
      ['SPACE CHANNEL 6', 'a reporter who dances. channel 6 is our channel. the disc does not know that either', 25, 'dc_channel6'],
    ],
  },
};
const SYSTEM_IDS = Object.keys(SYSTEMS);
const KEEPER_VAL = 60;                                   // a game worth this much is a keeper in the shoebox
// what a base name says about the system it belongs to (cart, pile or console)
const SYSTEM_OF = {};
for (const sid of SYSTEM_IDS) { const s = SYSTEMS[sid]; SYSTEM_OF[s.cart] = sid; SYSTEM_OF[s.pile] = sid; SYSTEM_OF[s.console] = sid; }
// the shoebox kinds, merged into MEDIA_KINDS by home.js: fillers as titles, the valuable ones as keepers
const GAME_MEDIA_KINDS = {};
for (const sid of SYSTEM_IDS) {
  const s = SYSTEMS[sid];
  GAME_MEDIA_KINDS[s.pile] = {
    word: s.word, n: [3, 5], keeperChance: 0.3,
    titles: s.games.filter((g) => g[2] < KEEPER_VAL).map((g) => [g[0], g[1], g[3]]),
    keepers: s.games.filter((g) => g[2] >= KEEPER_VAL).map((g) => [g[0], g[1], Math.round(g[2] * 0.8), Math.round(g[2] * 1.3), g[3]]),
    caseCol: s.caseCol, caseLabel: s.label, itemBase: s.cart, system: sid,
  };
}
// a cartridge or disc becomes one game in particular (makeItem, variants 'games:<sid>')
function rollGame(it, b, sid) {
  const s = SYSTEMS[sid];
  if (!s) return;
  const g0 = s.games[it.hseed % s.games.length];
  it.game = { system: sid, title: g0[0], art: g0[3] };
  it.name = (it.cond ? it.cond + ' ' : '') + g0[0];
  it.preName = null;
  it.note = g0[1];
  it.val = Math.max(1, Math.round(g0[2] * (it.val / Math.max(1, b.val))));
}

// ======================================================================
// js/oddments.js
// ======================================================================
// ---- oddments: three hundred small strange things, one sentence each ----
// The tape piles taught the trick: one case sprite, many titles. Here it is
// again for everything else a drawer can hold. Twelve families, each a base
// (`oddTokens`, `oddKitchen`...) whose roll picks one entry; the entry brings
// its name, its value, its shape (one of ten small sprites) and the line LOOK
// CLOSER reads. A few in every family are worth real money. None of them is
// the story. All of them were somebody's. Names are bent where a real brand
// would have stood; the checker keeps them bent.


// shape -> sprite id (sprites.js). A family base gives the palette; the shape gives the outline.
const ODD_SHAPES = { tin: 'oddTin', case: 'oddCase', tool: 'oddTool', key: 'oddKey', token: 'oddToken', paper: 'oddPaper', kit: 'oddKit', gadget: 'oddGadget', bottle: 'oddBottle', brass: 'oddBrass' };
const ODD_KEEPER_VAL = 60;

// entries: [name, shape, value, LOOK CLOSER note]. {place} becomes one of this town's places, {town} the town.
const ODDMENTS = {
  tokens: [
    ['Vending-Machine Token', 'token', 3, 'Good for one item from a machine that was hauled away in 1991. The item is still in it.'],
    ['Arcade Token, Closed Arcade', 'token', 6, 'The arcade closed. The token did not get the memo. It is still good, somewhere, for one play of something.'],
    ['Wooden Nickel', 'token', 2, 'Somebody took it. Somebody was told not to.'],
    ['Tax Token, One Mill', 'token', 4, 'A tenth of a cent, in aluminium, from a state that decided to be exact about it.'],
    ['Milk Token', 'token', 5, 'One quart, from a dairy that is now a subdivision named after the dairy.'],
    ['Bus Token', 'token', 3, 'The route number is stamped on it. The route was cancelled. The token waits at the stop.'],
    ['Car-Wash Token', 'token', 2, 'One wash. The car wash is a bank. The bank does not wash cars, though it has been asked.'],
    ['Pizza-Arcade Token, Unknown Mouse', 'token', 8, 'A mouse in a hat on one side. Not the famous mouse. A mouse that wanted to be.'],
    ['Casino Chip, Demolished Casino', 'token', 80, 'A hundred-dollar chip from a casino that is a parking lot. The chip has not been told. Collectors have.'],
    ['Brass Coat-Check Token', 'token', 6, 'Number 44. The coat is not here. The coat was never picked up. Neither, in a way, was the person.'],
    ['Cloakroom Ticket Dispenser', 'gadget', 25, 'A roll of tickets, half gone. Whoever tore the last one was wearing something worth checking.'],
    ['Bowling Shoe Size Tags', 'token', 5, 'A ring of brass tags, sizes 6 through 13. Size 11 is missing. Size 11 is always missing.'],
    ['Parking Validation Stamp', 'tool', 7, 'VALIDATED, it says, in purple. It still says it. Nobody honours it.'],
    ['Coin-Operated Binocular Token', 'token', 4, 'Two minutes of the view from a lookout the highway now bypasses.'],
    ['Pool-Hall Chalk Holder', 'brass', 12, 'A brass cup for a cube of chalk, engraved with a name, which is scratched, and a second name, which is not.'],
    ['Mechanical Billiard Counter', 'gadget', 30, 'Two rows of beads on a wire. Somebody was winning. Somebody stopped counting.'],
    ['Bingo Cage', 'brass', 45, 'A wire cage with all seventy-five balls. B-7 is worn smoother than the rest. Draw your own conclusions.'],
    ['Bingo Dauber Collection', 'kit', 8, 'Eleven daubers in a shoebox, every colour, one of them named MAVIS in nail polish.'],
    ['Bridge Card Scorer', 'gadget', 9, 'A little dial for keeping score at bridge. Set to a number that would have ended a friendship.'],
    ['Automatic Card Shuffler', 'gadget', 14, 'Hand-cranked. It shuffles. It also, according to the tape on the side, "CHEATS."'],
    ['Leather Dice Cup', 'case', 10, 'Five dice inside, two of them loaded. The honest three are worn. The loaded two are not.'],
    ['Magnetic Travel Chess Set', 'case', 12, 'A game in progress, held by magnets. White is losing. White has been losing since a bus in 1978.'],
    ['Solitaire Peg Board', 'tool', 6, 'One peg left, in the centre. Somebody solved it, once, and never touched it again.'],
    ['Cribbage Board, Antler', 'brass', 65, 'A cribbage board cut from an antler, pegs of bone. Fifteen-two, fifteen-four, and a pair is eight, in a hand nobody has held for forty years.'],
    ['Cash-Register Key', 'key', 6, 'Brass, stamped with a number. The register it opens went for scrap. It still turns in your fingers like it means something.'],
  ],
  keys: [
    ['Skeleton Key Ring, No Locks', 'key', 8, 'Nine skeleton keys on a ring. None of them is the key. You know which key.'],
    ['Locksmith Practice Keys', 'key', 12, 'A set of blanks and a cutaway lock for learning, from a correspondence course. Lesson nine was never sent for.'],
    ['Safe-Deposit-Box Key', 'key', 15, 'Box 311, a bank that merged, a branch that closed. The box is still there, in a basement, being patient.'],
    ['Railway Switch Key', 'key', 22, 'A big brass key for a switch on a line that has not seen a train since the mill closed. The switch is still set for the mill.'],
    ['Elevator Service Key', 'key', 10, 'It opens the panel in any elevator of one make. Nobody should have it. Somebody did.'],
    ['Hotel Room Key, Diamond Tag', 'key', 14, 'A brass key on a plastic diamond the size of a hand: SUNSET MOTEL, 6. DROP IN ANY MAILBOX. Nobody did.'],
    ['Mechanical Parking Meter Key', 'key', 9, 'Opens the coin box on a meter the town replaced with a machine that takes cards. The machine has no key. That is the point of it.'],
    ['Vending-Route Key Ring', 'key', 11, 'Forty keys, one for every machine on a route. Every machine on the route is gone. Every key still works, on nothing.'],
    ['Church Basement Key', 'key', 7, 'A tag in an old hand: BASEMENT, DO NOT LEND. Lent.'],
    ['Padlock Collection, Cut', 'kit', 10, 'A bag of padlocks, every one cut through with bolt cutters, kept anyway. Whoever cut them wanted the record.'],
    ['Handcuff Key, Novelty', 'key', 5, 'Stamped NOVELTY on one side and, more worryingly, nothing on the other.'],
    ['Piano Key, Loose', 'key', 4, 'An ivory from a piano. Middle C, by the wear. The piano is firewood. The note is not.'],
    ['Diary Key', 'key', 6, 'Tiny, brass, on a ribbon. The diary is in a different unit. The diary is always in a different unit.'],
    ['Watchman\'s Clock Key', 'key', 18, 'A key station from a night watchman\'s round. He turned it at 2 a.m. for thirty years, and then, one night, did not.'],
    ['Jail Cell Key, County', 'key', 60, 'A big iron key stamped with the county name. It came from a jail that became a museum that became a bar. The bar keeps asking for it back.'],
    ['Post Office Box Key', 'key', 8, 'Box 88. The number, again. Somebody in this county has always had box 88.'],
    ['Steamer Trunk Key, No Trunk', 'key', 5, 'The trunk would have been worth something. The key is worth this.'],
    ['Clock-Winding Key', 'key', 9, 'A double-ended key for a mantel clock. The clock stopped at ten past four. The key is why.'],
    ['Roller-Skate Key', 'key', 7, 'On a string, for the skates that clamped to shoes. It has been around a neck. The string knows.'],
    ['Key to the City, Small Town', 'key', 70, 'A gilt key on a ribbon, presented to somebody for something in a town that does not, strictly, have a gate. The engraving names them. The paper did not.'],
  ],
  kitchen: [
    ['Church-Key Can Opener', 'tool', 3, 'The pointed kind. It opened a thousand cans and one argument.'],
    ['Advertising Opener-Corkscrew-Knife', 'tool', 8, 'Three tools in one, from a hardware store that was two tools in one. The knife is the only sharp part of the deal.'],
    ['Ice Pick, Branded Handle', 'tool', 6, 'An ice house on the handle. The ice house delivered in blocks. The pick remembers the blocks.'],
    ['Squirrel Nutcracker', 'brass', 18, 'A cast-iron squirrel that cracks a walnut in its jaws. It has cracked a finger. It would again.'],
    ['Mechanical Apple Peeler', 'tool', 22, 'Clamps to the table, cranks, peels an apple in one long ribbon. The ribbon was the point. Nobody ate the apple.'],
    ['Hand-Crank Egg Beater', 'tool', 7, 'Two beaters, one crank, a squeak that meant Sunday.'],
    ['Potato Ricer', 'tool', 9, 'A great hinged thing that forced potatoes through holes. The holes are full of 1974.'],
    ['Butter Mold, Wooden', 'tool', 20, 'A carved cow on the plunger. Every pound of butter in one house had this cow on top of it. The cow is worn to a suggestion.'],
    ['Sugar Nippers', 'tool', 35, 'Iron nippers for breaking sugar off a loaf, from when sugar came in loaves. Nobody alive has used them for that. Somebody alive has used them for something.'],
    ['Waffle-Pattern Sandwich Press', 'tool', 12, 'Cast iron, on long handles, held over a fire. The waffle pattern is on the press, the sandwich, and, once, a hand.'],
    ['Toast Rack, Silver Plate', 'brass', 14, 'Five slots, so five slices of toast can go cold at the same time, elegantly.'],
    ['Egg Coddler', 'bottle', 9, 'A porcelain cup with a screw-on lid, for coddling an egg, which is a thing the egg did not ask for.'],
    ['Pie Bird', 'bottle', 11, 'A ceramic blackbird that stands in a pie and lets the steam out through its beak. It has seen the inside of a hundred pies and says nothing.'],
    ['Pickle Grabber', 'tool', 5, 'A spring-loaded claw for getting a pickle out of a jar. It works on pickles and on nothing else, and somebody tried.'],
    ['Cherry Pitter', 'tool', 8, 'A little plunger that shoots the stone out of a cherry, and, if you hold it wrong, across the kitchen.'],
    ['Meat Tenderizer, Tiny Hammer', 'tool', 6, 'A hammer with a waffle face. It has tenderised meat and settled one dispute about a recipe.'],
    ['Manual Bean Slicer', 'tool', 10, 'Feed a bean in, crank, and out comes the bean in ribbons. A machine for one vegetable, made by people who meant it.'],
    ['Hand-Crank Flour Sifter', 'tool', 7, 'A tin cup with a crank. A dusting of flour in the mesh from a cake nobody remembers.'],
    ['Plaid Vacuum Bottle', 'bottle', 12, 'Tartan on the outside, glass on the inside, coffee still, faintly, on the air of it.'],
    ['Lunchbox Vacuum Insert', 'bottle', 6, 'The little bottle that lived inside the lunchbox. The lunchbox is elsewhere. The soup is a memory.'],
    ['Stacking Picnic Cups', 'tin', 8, 'Six aluminium cups that nest into one, each a different colour, each tasting faintly of every drink of 1962.'],
    ['Folding Camping Toaster', 'tool', 7, 'A wire thing that folds flat and toasts bread over a fire, unevenly, which was part of it.'],
    ['Collapsible Drinking Cup', 'tin', 5, 'Rings of tin that telescope into a cup. It collapsed, once, mid-drink, and was kept as a warning.'],
    ['Enamel Camping Percolator', 'tin', 16, 'Blue speckled enamel, a glass knob on top, and coffee that has never once been good and was never once refused.'],
    ['Promotional Bottle Opener, Ridiculous Shape', 'tool', 6, 'A bottle opener shaped like a tire. Or a tooth. From a tire shop, or a dentist. The shop is not saying.'],
    ['Silent Butler', 'brass', 12, 'A hinged brass pan for sweeping crumbs off a tablecloth. Named for the man it replaced.'],
    ['Crumb Sweeper, Table', 'tool', 6, 'A little roller for crumbs, from a dining room where crumbs were an event.'],
    ['Mustache Cup', 'bottle', 15, 'A teacup with a ledge inside to keep a moustache dry. The moustache is gone. The ledge waits.'],
    ['Gelatin Mold, Fish', 'tin', 7, 'A copper mold in the shape of a fish, for a gelatin salad in the shape of a fish, for a party in the shape of 1958.'],
    ['Cake Breaker', 'tool', 6, 'A comb for angel food cake. It combs cake. Somebody was asked why and could not say.'],
    ['Grapefruit Spoon, Serrated', 'tool', 3, 'A spoon with teeth. Every house had one. No house had two.'],
    ['Nut Grinder, Glass Jar', 'bottle', 9, 'A crank on top, a jar below, nuts in the middle, once, in 1969.'],
    ['Hand-Crank Ice Crusher', 'tool', 14, 'A cast-iron mouth for ice. It has crushed ice for drinks and one wedding ring, on purpose.'],
    ['Coffee Grinder, Box Mill', 'tool', 60, 'A wooden box with a drawer and a crank and a cast-iron top. It has ground coffee every morning of a marriage and is worth more than the marriage said it was.'],
    ['Aspic Cutters, Boxed', 'tin', 25, 'A tin of tiny tin cutters, shapes for aspic: a spade, a heart, a crescent, a fish. Aspic is over. The tin does not accept this.'],
  ],
  occult: [
    ['Planchette, No Board', 'tool', 12, 'The heart-shaped pointer from a talking board, without the board. It still points. At the door, mostly.'],
    ['Fortune-Telling Fish', 'paper', 2, 'A sliver of red cellophane that curls in your palm. It says you are FICKLE. It says that to everyone.'],
    ['Mystic Answer Sphere, Knockoff', 'gadget', 8, 'A black ball with a window. Shake it. "OUTLOOK NOT SO GOOD." Shake it again. Same.'],
    ['Mood Ring Display Card', 'paper', 10, 'A card of twelve mood rings from a drugstore counter, all of them black, which the card says means "tense." The card has been tense since 1976.'],
    ['Brass Divining Pendulum', 'brass', 14, 'A brass weight on a chain, for asking questions. It swings yes. It swings yes to everything. That is how it was sold.'],
    ['Palmistry Hand', 'brass', 28, 'A ceramic hand with the lines and mounts labelled. The life line has been worn down by thumbs checking it against their own.'],
    ['Phrenology Head', 'brass', 150, 'A ceramic head mapped into faculties: HOPE, WIT, SECRETIVENESS. The SECRETIVENESS region has a chip out of it. Collectors want the head. The head wants to tell you about yourself.'],
    ['Miniature Crystal Ball', 'bottle', 20, 'Glass, on a brass stand, the size of a plum. It shows the room, upside down. That is all it has ever shown.'],
    ['Zodiac Wheel Calculator', 'paper', 6, 'A cardboard wheel that tells you who you should marry by month. It has been consulted. It was wrong, and married anyway.'],
    ['Biorhythm Calculator', 'gadget', 9, 'A plastic slide chart for your physical, emotional and intellectual cycles. All three were set to a bad week in 1979 and left there.'],
    ['Dream Interpretation Wheel', 'paper', 5, 'Turn to your dream, read your fate. TEETH FALLING OUT: money trouble. It has been turned to TEETH a great deal.'],
    ['Hypnosis Spiral Disk', 'paper', 7, 'A cardboard spiral on a spindle. Spin it and stare. You are getting sleepy. You are getting nothing else.'],
    ['Spirit Photography Kit, Box Only', 'paper', 15, 'A box that promised to photograph the departed. The box is empty. Make of that what the box would like you to.'],
    ['Vampire-Hunting Kit, Tourist', 'kit', 45, 'A velvet case with a wooden stake, a crucifix, a vial, and a receipt from a gift shop in a town with a castle-shaped motel.'],
    ['Monster-Tracking Kit, Tourist', 'kit', 18, 'Plaster, a tape measure, a field guide to three monsters, all of them local. The plaster has been mixed. Something was measured.'],
    ['Bigfoot Footprint Casting Kit', 'kit', 22, 'Plaster and a frame. One cast inside, size 19, with a heel that looks a lot like a boot with a sock over it. Or does not. Decide.'],
    ['UFO Detector, Novelty', 'gadget', 16, 'A box with a needle and a light. The light is on. The light has been on since it was switched on. The instructions call this "a reading."'],
    ['Ghost-Hunting Cassette Recorder', 'gadget', 24, 'A recorder with a tape labelled EVP, SESSION 4. Sessions one to three are not in the unit. Session four is very quiet, and then it is not.'],
    ['Dowsing Rods, Velvet Case', 'kit', 30, 'Two brass L-rods in velvet. They cross over water, the case says. They crossed over the auctioneer, once. He took it well.'],
    ['Rabbit\'s Foot Keychain', 'token', 3, 'Dyed green. It was not lucky for the rabbit, the old joke goes. It has not been lucky for anyone since either.'],
    ['Lucky Horseshoe, Engraved', 'brass', 12, 'A horseshoe with a name engraved on it: DOLORES. Hung open end up, to hold the luck. It was hung upside down for a decade first.'],
    ['Four-Leaf Clover, Laminated', 'paper', 4, 'Found in 1981, laminated in 1981, carried until the lamination gave up. Four leaves. Somebody checked.'],
    ['Holy Water Vial, Gift Shop', 'bottle', 5, 'A tiny bottle labelled HOLY WATER, from a gift shop on a highway. Half full. Half used. On something.'],
    ['Worry Stone', 'token', 3, 'A smooth stone with a thumb-shaped dip worn deeper than the stone was sold with. That is a lot of worry.'],
    ['Pocket Prayer Book, Hidden Compartment', 'paper', 35, 'A little leather prayer book with a hollow behind the psalms. Something was kept in it. Something small and folded and not a psalm.'],
    ['Tarot Deck, One Card Missing', 'paper', 20, 'Seventy-seven cards. The missing one is the Tower. Somebody took the Tower out of the deck on purpose. It did not help.'],
    ['Tea-Leaf Reading Cup', 'bottle', 14, 'A cup with symbols printed inside the bowl and a saucer that explains them. A ring is coming. A ring was always coming.'],
    ['Seance Trumpet, Tin', 'brass', 40, 'A tin cone, painted with a luminous band, through which the dead were said to speak at a table in this county in 1922. The dead said very little. The medium said the rest.'],
    ['Lucky Coin, Two-Headed', 'token', 8, 'Heads. Heads. Heads. It has won a great many coin tosses and one black eye.'],
    ['Evil-Eye Bead on a Nail', 'token', 4, 'A blue glass eye, on the nail it hung from over a door. The door is gone. The eye kept watching.'],
  ],
  medical: [
    ['Snake-Bite Kit, Plastic Case', 'case', 8, 'A little case with a blade, a suction cup and instructions that every doctor since has begged people not to follow.'],
    ['Smelling-Salts Container', 'bottle', 12, 'A silver vinaigrette with a grille in the lid. It still works. Do not check.'],
    ['Ear Trumpet', 'brass', 55, 'A brass horn that goes in the ear. It has heard forty years of one family and repeated none of it.'],
    ['Mechanical Hearing Aid', 'gadget', 30, 'A box the size of a cigarette case, worn on the chest, with a wire to the ear. It amplified everything, including the things said about it.'],
    ['Glass Eye in a Case', 'case', 70, 'A hand-painted glass eye, hazel, in a velvet-lined case. It matches somebody. It watches everybody.'],
    ['Dental Impression, Plaster', 'tin', 9, 'A set of teeth in plaster, upper and lower, with a name written on the base. A smile, in a way, kept.'],
    ['Doctor\'s Head Mirror', 'brass', 25, 'The round mirror with the hole in it, on a headband. It threw light down throats in three counties.'],
    ['Medicine Spoon, Stamped', 'tool', 7, 'A pewter spoon with the doses stamped into the bowl: TEASPOON, DESSERT, TABLE. Every one of them tasted the same.'],
    ['Glass Medicine-Dropper Case', 'case', 6, 'Three droppers in a hinged case, one of them still with something in it, which is not medicine, or is not any more.'],
    ['Fever Thermometer Case', 'case', 5, 'A nickel case for a glass thermometer. The thermometer is in it. The thermometer reads a fever from 1955, permanently.'],
    ['Doctor\'s House-Call Bag', 'kit', 65, 'A black leather bag with the brass frame and the doctor\'s initials. Empty, except for a lozenge and a note that reads "Mrs. Tolliver, again."'],
    ['First-Aid Tin, Bizarre Compartments', 'tin', 10, 'A tin with a compartment for everything: gauze, salts, a razor, a rubber tube, and one marked simply LEECH.'],
    ['Camp Surgical Tool Roll', 'kit', 40, 'A canvas roll of steel: probes, a small saw, forceps. Field issue. It has been used in a field, on something, once.'],
    ['Military Foot-Powder Tin', 'tin', 4, 'Half a tin of powder from a war. The feet it was for have long since marched off.'],
    ['Gas-Mask Carrying Bag', 'kit', 14, 'A canvas bag with a strap, stencilled. The mask is not in it. A sandwich, at some point, was.'],
    ['Metal Hot-Water Bottle', 'bottle', 11, 'A flat copper bottle with a screw cap, warmed a bed for fifty winters and scalded one foot.'],
    ['Ice Bag, Screw Cap', 'bottle', 5, 'A rubber bag with a wide screw cap for ice, applied to heads after ideas.'],
    ['Heating Pad Controller, Brown Plastic', 'gadget', 6, 'A brown plastic dial: LOW, MED, HI. It is set to HI. It has been set to HI since it was plugged in.'],
    ['Brass Bed Warmer', 'brass', 60, 'A brass pan on a long handle, for coals, slid between the sheets on a winter night. It has singed one quilt and warmed a great many arguments.'],
    ['Fly-Catching Bottle', 'bottle', 28, 'A blown-glass trap with a moat for sugar water. Flies went in. Flies did not come out. Two are still in it, from a summer with a year on it.'],
    ['Truss, Boxed', 'case', 9, 'A medical truss in its original box, with a diagram that has been looked at once and closed quickly.'],
    ['Electric Shock Machine, Quack', 'gadget', 60, 'A wooden box with two brass handles and a crank. It cured nervous complaints, the label says. It caused several.'],
    ['Pill Roller, Brass', 'brass', 35, 'A brass and wood board for rolling a strip of paste into pills. A pharmacist rolled a town\'s worth on it. The grooves are still faintly bitter.'],
    ['Leech Jar, Empty', 'bottle', 45, 'A pharmacy jar, LEECHES in gilt on the glass. No leeches. The gilt is the value. The word is the fun.'],
    ['Eye Bath, Glass', 'bottle', 6, 'A little glass cup the shape of an eye socket. It has held water and, in a pinch, gin.'],
  ],
  survival: [
    ['Fallout Shelter Water Can', 'tin', 20, 'A seventeen-gallon can stencilled with the civil-defense mark. Empty. It was filled once, in a basement, with real fear in it.'],
    ['Emergency Drinking-Water Ration Tin', 'tin', 8, 'Water, in a tin, from 1962, for after. It was never after. The tin is heavy.'],
    ['Roadside Flare Kit', 'kit', 10, 'Three flares in a tin, gone soft. Do not light them. Somebody did, at a picnic, in 1983, and the picnic ended.'],
    ['Hand-Crank Emergency Siren', 'gadget', 40, 'Turn the handle and it howls. It was on a school roof. It came down when the school did. It still howls, if you let it.'],
    ['Pocket Geiger Counter', 'gadget', 60, 'A yellow box with a wand. It clicks at a lantern mantle, a watch dial and, faintly, at one unit on the row, which the office would rather not discuss.'],
    ['Civil-Defense Armband', 'paper', 9, 'A yellow armband with the mark on it. Whoever wore it had a whistle and a list and no idea.'],
    ['Blackout Curtain Kit', 'kit', 12, 'Black cloth, tacks, a leaflet about what to do when the sirens went. The sirens, here, never went. The tacks are still in the paper.'],
    ['Waterproof Match Safe', 'tin', 7, 'A brass tube with a screw cap and matches from a war. They will strike. They will not be asked to.'],
    ['Storm-Match Tin', 'tin', 5, 'Matches that burn in wind and rain, a tin that says so, and one burnt one put back as proof.'],
    ['Fire-Starting Lens Card', 'paper', 3, 'A credit-card lens for lighting tinder with the sun. It lit a leaflet about itself, once, by accident.'],
    ['Signal Mirror, Sighting Hole', 'gadget', 9, 'A steel mirror with a hole in the middle for aiming a flash at an aircraft. It signalled a crop duster, who waved.'],
    ['Folding Army Can Opener', 'tool', 2, 'The tiny hinged one on a chain. Every soldier had one. Every soldier has still, in a drawer.'],
    ['Mess-Kit Utensil Set', 'tool', 6, 'Knife, fork and spoon that clip together, from a kit that fed one man on one hill.'],
    ['Camp Soap Leaves', 'paper', 3, 'A booklet of soap you tear a page from. Half used. The pages washed hands in a river with a name.'],
    ['Paper Soap Packet', 'paper', 2, 'A packet of soap-paper from a motel. The motel had one tissue-thin idea about luxury and this was it.'],
    ['Water Purification Tablets, Old Bottle', 'bottle', 6, 'A brown bottle, tablets fused into one tablet. Not for use. A prop, from a hike somebody planned and did not take.'],
    ['Emergency Blanket, Ancient Packaging', 'paper', 4, 'A foil blanket in a packet from a decade with a bolder font. It has never been opened. It has been sat on.'],
    ['Hand Warmer, Velvet Pouch', 'case', 10, 'A little metal warmer in a velvet bag. It burned a fuel stick and kept one pair of hands alive on one bad night.'],
    ['Catalytic Pocket Warmer', 'gadget', 12, 'Chrome, the size of a flask, with a burner head under the lid. It warmed a duck blind for twenty seasons and one glove compartment for the rest.'],
    ['Reusable Metal Hand Warmer', 'gadget', 8, 'Click the disc inside and it goes hot. The disc has been clicked. It is not going hot again.'],
    ['Boot Dryer Inserts', 'tool', 5, 'Two cedar forms with heating elements, for boots that came in wet from a life that was mostly wet.'],
    ['Snowshoe Repair Kit', 'kit', 9, 'Rawhide, a needle, wax, in a tin, for a pair of snowshoes that were repaired more than they were worn.'],
    ['Tire-Chain Repair Links', 'tin', 4, 'A tin of cross-chain links and a tool. Repaired a chain on a pass in a storm, once. The tin is dented from being thrown.'],
    ['Ice Cleats, Leather Straps', 'tool', 11, 'Iron spikes on leather straps that buckled over boots. They walked to a barn every morning of a winter that did not end.'],
    ['Survival Whistle, Thermometer', 'gadget', 5, 'A plastic whistle with a compass in the cap and a thermometer down the side, all three of them approximate.'],
    ['Whistle with a Compass in It', 'gadget', 4, 'The compass points a little east of north. The whistle is loud. Between them, somebody got found.'],
    ['Tornado Radio, Enormous Antenna', 'gadget', 25, 'A weather radio with an antenna longer than the radio. It went off at 3 a.m. in 1989 and everybody went to the cellar, and nothing came, and nobody was sorry.'],
    ['Lightning Detector Radio', 'gadget', 14, 'A novelty radio that crackles when lightning is near. It crackles at the fridge. It crackled, once, correctly, and nobody believed it.'],
    ['Air-Raid Warden\'s Rattle', 'tool', 30, 'A wooden football rattle stamped for a warden. Swung in a drill in 1943 by a man who took it very seriously, in a town nobody was going to bomb.'],
    ['Fallout Shelter Sign, Tin', 'paper', 45, 'The yellow and black sign, three triangles. It came off a post office. It is the most reassuring thing in the unit and the least.'],
  ],
  outdoors: [
    ['Fish Bonker', 'tool', 9, 'A short club with a lanyard, for the last word with a fish. It has had the last word many times.'],
    ['Brass Fishing Scale', 'brass', 18, 'A spring scale with a hook, brass, reading to fifty pounds. Nothing it weighed was fifty pounds. Every story about it was.'],
    ['Depth Finder, Weighted Line', 'tool', 5, 'A lead weight on a marked line. It finds the depth by being dropped in. Technology.'],
    ['Pocket Tackle Box, Handmade Lures', 'case', 30, 'A little tin of lures somebody made from spoons, feathers and a bottle cap. The bottle-cap one caught the most. It says so, in scratches.'],
    ['Frog Gig Head', 'tool', 6, 'Four barbed tines for a pole. Frogs, a summer, a kid, a bucket. The kid is sixty.'],
    ['Fish Stringer', 'tool', 3, 'A chain with clips, for keeping the catch in the water. It has held the catch. It has held the wallet, once, by mistake.'],
    ['Minnow Bucket', 'tin', 8, 'A galvanised bucket with an inner bucket full of holes. It smells the way it smells. That is the smell of being eleven.'],
    ['Luminous Compass', 'gadget', 14, 'A brass compass with markings that glow, a little, still. It found north for a scout troop and a deer camp and, once, a bar.'],
    ['Surveyor\'s Chain', 'tool', 40, 'Sixty-six feet of linked steel, one hundred links. It measured the county. The county disagreed and was measured again.'],
    ['Folding Carpenter\'s Rule', 'tool', 6, 'A boxwood rule that folds in four. Every number on it is the width of something in a house that is now a different house.'],
    ['Plumb Bob, Brass', 'brass', 12, 'A brass weight on a string. It finds straight down. It has found straight down in every building on Main Street, including the crooked one.'],
    ['Chalk-Line Reel', 'tool', 5, 'A reel of string in blue chalk. It snapped a line across every floor a man ever laid. The chalk is still on the string, and on his hands, somewhere.'],
    ['Hand Brace and Bits', 'tool', 22, 'A crank drill from before electricity, with a roll of bits. It made every hole in a barn. The barn stands. Good bits.'],
    ['Push Screwdriver, Spiral', 'tool', 16, 'Push the handle and the bit spins. Magic, in 1950. Still a little magic.'],
    ['Hand-Crank Drill', 'tool', 12, 'Gears on the side, a crank, a chuck. Slower than anything. Quieter than everything.'],
    ['Oil Can, Long Spout', 'tin', 7, 'A tin oil can with a spout as long as your arm. It oiled one hinge for forty years. The hinge still squeaks.'],
    ['Fishing-Line Knot Gauge', 'paper', 3, 'A card of knots with holes to practice them through. The clinch knot hole is worn. The blood knot hole is not.'],
    ['Pocket Weather Station', 'gadget', 15, 'A brass case with a thermometer, a compass and a tiny barometer. All three agree it is a fine day. It is a locker.'],
    ['Storm Glass', 'bottle', 60, 'A sealed glass tube of liquid that grows crystals before weather. It grew crystals before a hailstorm, a divorce and a tax audit, and takes credit for all three.'],
    ['Floating-Bulb Thermometer', 'bottle', 25, 'A tall glass cylinder with coloured glass bulbs that rise and sink with the heat. The lowest one has never once risen. It is a pessimist.'],
    ['Barometer, Wooden Case', 'gadget', 35, 'A round dial in a walnut case: STORMY, RAIN, CHANGE, FAIR, VERY DRY. The needle is on CHANGE. The needle is always on CHANGE.'],
    ['Weather Forecasting Wheel', 'paper', 4, 'A cardboard wheel: line up the wind and the sky and read the forecast. It has been right about as often as the radio.'],
    ['Moon-Phase Calculator', 'paper', 6, 'A paper dial for the phase of the moon on any night until 2050. Set to a full moon in 1988. Something was planned.'],
    ['Tide Calculator', 'paper', 8, 'A tide dial for a coast four hundred miles from here. Somebody in this county thought about the sea every day.'],
    ['Farmer\'s Almanac, Annotated', 'paper', 18, 'An almanac from 1971 with notes in every margin: FROST, LATE. RAIN, NO. BEANS, YES. The beans were the only thing it got right.'],
    ['Seed Company Rain Gauge', 'bottle', 7, 'A glass tube on a stake with a seed company\'s name. It measured one summer of drought in a number that made a man sit down.'],
    ['Trap-Setting Tongs', 'tool', 20, 'Long iron tongs for setting a jaw trap without losing a hand. Somebody lost the hand anyway, the story goes, setting it without them.'],
    ['Duck Call, Hand-Turned', 'tool', 45, 'A duck call turned from a single piece of cocobolo, with a maker\'s mark. It calls ducks. It has called a game warden.'],
    ['Creel, Wicker', 'kit', 30, 'A wicker fish basket with a leather strap, worn to the shape of one hip. There is a fly hooked inside the lid, still tied.'],
    ['Hand-Line Winder, Whalebone', 'tool', 70, 'A hand-line winder carved from bone, scrimshawed with a ship, from a coast this county has never seen. How it got here is the story. Nobody knows it.'],
  ],
  road: [
    ['Spark-Plug Cleaner', 'gadget', 8, 'A little sandblaster for spark plugs, from a gas station that also sold pie. The plugs are gone. The pie is spoken of.'],
    ['Pen-Shaped Tire Gauge', 'tool', 3, 'The pencil kind. It has been in a shirt pocket for a quarter-century, reading pressures nobody adjusted.'],
    ['Radiator Cap Thermometer', 'gadget', 20, 'A radiator cap with a dial on top, so you could watch the engine boil from the hood ornament. Some people did.'],
    ['Windshield Frost Scraper, Advertising', 'tool', 2, 'A plastic scraper from an insurance agent. It has scraped forty winters and one bumper sticker.'],
    ['Trouble-Light Reel', 'gadget', 14, 'A caged bulb on fifty feet of cord that reels back in, sometimes, when asked. It lit every repair a man ever regretted.'],
    ['Magnetic Dashboard Compass', 'gadget', 6, 'A little ball compass that sticks to the dash. It has pointed north, roughly, through every state with a number on it.'],
    ['Road Atlas, Handwritten Routes', 'paper', 22, 'An atlas with routes drawn on every page in three colours of pen. One route goes to a town that is not on the map. The route is confident.'],
    ['CB Radio Emergency Kit', 'kit', 18, 'A CB, a magnetic antenna, a card of codes. Somebody was Rubber Duck on channel 19 for one summer and never got over it.'],
    ['Magnetic CB Antenna', 'tool', 7, 'A whip antenna on a magnet, for the roof. It was pulled off in a car wash. It was reattached. It was pulled off in the same car wash.'],
    ['Radar Detector, 1980s', 'gadget', 15, 'A black box with a red light. It went off at every bank and one microwave. It saved a man a ticket, once, and cost him a marriage, in a way.'],
    ['Airsickness Bag, Defunct Airline', 'paper', 5, 'A paper bag with the logo of an airline that merged, then merged, then vanished. Unused. Framed, once, by somebody with a sense of humour.'],
    ['Hotel Sewing Kit, Vanished Hotel', 'case', 4, 'Two needles, four colours of thread, a hotel name. The hotel is a parking structure. The thread is still good.'],
    ['Airline Grooming Kit', 'case', 6, 'A little zip case: comb, toothbrush, a tiny tube. First class, on a route that no longer exists, in a year with better legroom.'],
    ['Shoe-Shine Travel Kit', 'case', 7, 'A tin with a brush, a cloth, and polish gone to stone. The shoes it shone walked into a job interview in 1979 and got it.'],
    ['Folding Pocket Ashtray', 'tin', 4, 'A little tin that opens into an ashtray, for smoking in places that were about to stop allowing it.'],
    ['Cigarette Case with Lighter', 'case', 16, 'A chrome case with a lighter built into the lid. Engraved with initials. Full of cigarettes from the year it was engraved.'],
    ['Tabletop Cigarette Dispenser', 'gadget', 24, 'Press a lever and a little bird picks a cigarette out and offers it. The bird is missing a head. It still offers.'],
    ['Ceramic Tire Ashtray', 'tin', 9, 'A rubber tire from a tire company with a glass ashtray in the middle. The tire company is real. The tire is not.'],
    ['Matchbook Collection, Closed Restaurants', 'paper', 25, 'A shoebox of matchbooks from every restaurant that ever closed in {town}, including {place}. One from every one. Somebody ate their way through the county and kept the fire.'],
    ['Highway Map, Free, Gas Station', 'paper', 4, 'A free map from a gas station chain, folded wrong for fifty years. The route to the coast is marked. Nobody went.'],
    ['Motel Key Fob Collection', 'kit', 60, 'A ring of twenty plastic motel key fobs from twenty motels along one highway, every one saying DROP IN ANY MAILBOX. Somebody drove that highway and never once did.'],
    ['Car Radio Knob, Loose', 'gadget', 2, 'One knob, from a radio, from a car, from a life. It still turns something, somewhere.'],
    ['Trunk-Lid Emergency Kit', 'kit', 12, 'Jumper cables, a flare, a can of something that inflates a tire and a note that says "CALL DALE FIRST."'],
    ['Toll Ticket Collection', 'paper', 6, 'A rubber-banded stack of toll tickets from a turnpike. Every trip, saved. Every trip, the same trip.'],
  ],
  gadgets: [
    ['Cassette Head-Cleaning Kit', 'case', 4, 'A cassette that cleans the heads, and a bottle of fluid that cleaned one head and then evaporated, forever.'],
    ['VHS Rewinder', 'gadget', 8, 'A box shaped like a car that rewinds tapes so the VCR does not have to. It has rewound a marriage\'s worth of movies and one wedding, many times.'],
    ['VHS Tape Eraser', 'gadget', 14, 'A bulk eraser, a heavy block that wipes a tape in a pass. Somebody wiped something with it. The tape it wiped is in the unit. Blank.'],
    ['Cassette Splicing Block', 'tool', 6, 'A little aluminium block with a groove and a razor, for cutting tape. Somebody edited one song out of a mix. The song was the point.'],
    ['Reel-to-Reel Tape Splicer', 'tool', 18, 'A splicing block for quarter-inch tape, with a tin of splicing tape and a razor blade gone brown.'],
    ['Answering-Machine Tape', 'case', 5, 'A microcassette labelled OUTGOING. The outgoing message is a man clearing his throat for twenty seconds and then hanging up.'],
    ['Microcassette Recorder', 'gadget', 16, 'A pocket recorder with a tape in it. The tape is a dentist dictating a filling and then, unmistakably, singing.'],
    ['Telephone Pickup Coil', 'gadget', 7, 'A suction cup with a wire for recording phone calls off the handset. Somebody recorded calls. Somebody was, it turns out, right to.'],
    ['Pocket Television', 'gadget', 60, 'A black-and-white TV the size of a paperback, with a tuning wheel. It gets one channel. It gets Channel 6.'],
    ['Electronic Spelling Dictionary', 'gadget', 6, 'A grey plastic slab that spells words when asked. It cannot spell "definitely." Neither could the owner.'],
    ['Talking Calculator', 'gadget', 12, 'It says the numbers as you press them, in a voice like a robot with a cold. It has said "SEVEN" more than any other number. Nobody knows why.'],
    ['Electronic Organizer, Tiny Keyboard', 'gadget', 9, 'A pocket organizer with forty names in it, thirty of them dead, one of them the owner, in case.'],
    ['Databank Watch', 'gadget', 20, 'A wristwatch with a calculator keyboard on the face, for a man who needed to divide in a hurry and wanted everyone to know.'],
    ['Mechanical Pedometer', 'gadget', 10, 'Clip it to your belt and it counts steps with a little pendulum. It counted a walk from a wedding to a bus station and stopped there.'],
    ['Slide Rule', 'tool', 15, 'Bamboo and ivory-look plastic, in a leather case, with a name on the case in gold. It put something into orbit, or its owner said it did.'],
    ['Circular Slide Rule', 'gadget', 25, 'A round slide rule the size of a coaster. It multiplied on an aircraft carrier, the engraving says. The carrier is razor blades now.'],
    ['Pocket Adding Machine', 'gadget', 18, 'A tin machine with a stylus for adding columns. The last sum on it is $4,212.07, and it was, whoever added it, too much.'],
    ['Mechanical Tally Counter', 'gadget', 6, 'A steel clicker for counting things. It reads 8,819. Nobody knows what. The office has theories.'],
    ['Pocket Transistor Radio, Leather Case', 'gadget', 22, 'A transistor radio in a leather case with a wrist strap. It got the game. It got the game on a night in 1968 that a man never stopped talking about.'],
    ['Wire Recorder Spool', 'case', 35, 'A spool of steel wire from a recorder older than tape. Something is on it. Nothing in this county can play it. Somebody in the city can, and will want it.'],
    ['Digital Watch, First Kind', 'gadget', 30, 'A red LED watch: press the button to see the time, for a second, at a cost of the battery. It told the time to a room full of people who asked to see it do that.'],
    ['Handheld Electronic Football', 'gadget', 28, 'A red plastic slab where dashes play football with a beep. Somebody beat the computer in 1979 and wrote the score on the back, and it was not a good score.'],
    ['Pager, Belt Clip', 'gadget', 5, 'A pager with a number on the display, still. Whoever paged is still waiting.'],
    ['Metronome, Wind-Up', 'gadget', 20, 'A pyramid metronome, wound, ticking at a tempo a child hated for six years of lessons and then, at forty, missed.'],
  ],
  desk: [
    ['Rotary Address Book', 'gadget', 8, 'Slide the pointer to a letter and the lid pops open to it. Every name under D has been crossed out but one.'],
    ['Rotary Card File', 'gadget', 14, 'A wheel of index cards on a spindle. Every plumber, dentist and cousin in the county, in a hand that got shakier toward W.'],
    ['Telephone Index Wheel', 'gadget', 6, 'A little wheel of names by the phone. The phone was on a wall. The wall is a wall.'],
    ['Embossing Label Maker', 'gadget', 12, 'Squeeze and it punches letters into plastic tape. Everything in one house was labelled. The label maker was labelled LABEL MAKER.'],
    ['Label Tape Wheel', 'tin', 3, 'A wheel of black embossing tape with one word already punched into it: MINE.'],
    ['Rubber Date Stamp, Thirty-Year-Old Dates', 'tool', 5, 'A band stamp with years that end in 1994. The last date set is a Friday in 1993. Something was received that Friday.'],
    ['Library Date-Due Stamp', 'tool', 10, 'A stamp from a library. The last date due is decades past. The book is, somewhere, very overdue.'],
    ['Check-Writing Machine', 'gadget', 30, 'A cast-iron machine that presses the amount into a cheque so nobody can alter it. Somebody altered one anyway. That is why it was sold.'],
    ['Credit-Card Imprinter', 'gadget', 15, 'The knuckle-buster: slide the bar over the card and the carbon takes the numbers. It took the numbers of every regular at one diner. The carbons are in the unit.'],
    ['Coin Wrapper Machine', 'gadget', 12, 'A tube and a plunger for rolling coins. It rolled a paper route into a bicycle, one summer, in quarters.'],
    ['Mechanical Receipt Stamper', 'gadget', 9, 'PAID, it says, with a date wheel. It has said PAID to a great many bills and one bad cheque, in error.'],
    ['Desktop Finger Moistener', 'tin', 4, 'A little tin of sticky stuff for the finger that sorts paper. Every office had one. Every office pretended not to.'],
    ['Envelope Moistener Wheel', 'gadget', 3, 'A wheel in a water reservoir for licking envelopes without licking envelopes. The water is 1985.'],
    ['Stamp Hinge Packet', 'paper', 2, 'A thousand little gummed hinges for mounting stamps, from a collection that was sold, then bought back, then sold.'],
    ['Stamp Watermark Tray', 'tin', 6, 'A black tray for watermark fluid. Somebody looked very hard at very small things for a very long time.'],
    ['Postage Scale, Brass', 'brass', 20, 'A little brass balance for letters, with the rates from a year when a letter cost a coin.'],
    ['Letter-Opening Machine', 'gadget', 25, 'A hand-cranked machine that slices a hundred envelopes a minute. It opened somebody\'s mail for years. Somebody else\'s, too.'],
    ['Fountain-Pen Filling Tool', 'tool', 4, 'A lever for filling a pen, in a case, with a nib that is not the pen\'s. Somebody was fixing pens. Somebody was good at it.'],
    ['Ink Blotter, Advertising', 'paper', 5, 'A blotter card from a funeral home, blotted with somebody\'s signature, backwards, a hundred times.'],
    ['Blotting-Paper Rocker', 'tool', 12, 'A curved wooden rocker for blotting wet ink. It rocked over deeds and a divorce and a letter that was never sent.'],
    ['Desk Sand Shaker', 'bottle', 28, 'A pewter shaker for sand, for drying ink, from before blotting paper. The sand is still in it. So is a little ink.'],
    ['Wax Seal Kit', 'case', 14, 'Sticks of red wax and a brass seal with an initial. The initial is not anybody\'s in the county. Letters went out under it anyway.'],
    ['Brass Letter Scale', 'brass', 35, 'A brass balance with weights in a fitted box. It weighed letters to a lawyer and, when the lawyer stopped answering, to a newspaper.'],
    ['Newspaper Clipping Press', 'tool', 9, 'Two boards and a screw, for pressing clippings flat. The clippings inside are all about one person, and none of them is kind.'],
    ['Flower Press', 'tool', 7, 'Two boards, four screws, a pressed rose gone to paper. From a bouquet. The bouquet had an occasion. The occasion is not written down.'],
    ['Herbarium Plant Press', 'tool', 22, 'A proper press with straps and blotters, with forty specimens labelled in Latin by a schoolteacher who knew all of them and was not asked.'],
    ['Bug Pinning Case', 'case', 60, 'A glass-lidded case of beetles on pins, labelled by a child, in 1961, with the exact spot in the county each was caught. The spots are subdivisions.'],
    ['Butterfly Specimen Envelopes', 'paper', 6, 'Glassine envelopes, a butterfly in each, folded, waiting for a case that was never built.'],
    ['Telephone Sanitizer Spray', 'bottle', 3, 'An office spray for the mouthpiece of a phone that six people shared and one person worried about.'],
    ['Paperweight, Glass, Bubble', 'bottle', 15, 'A glass dome with one bubble in it. It held down forty years of paper and one resignation letter, unsent, until the drawer.'],
  ],
  photo: [
    ['Folding Opera Glasses', 'gadget', 18, 'Mother-of-pearl, folding, in a case. They saw one opera, in the city, and a great many high-school plays after.'],
    ['Monocle in a Case', 'case', 25, 'A monocle on a ribbon. Somebody in this county wore a monocle, on purpose, and was not talked out of it.'],
    ['Pocket Telescope, Brass', 'brass', 30, 'A three-draw brass telescope. It watched ships, the engraving claims. Here, it watched the neighbours.'],
    ['Stereoscope Viewer', 'gadget', 35, 'A wooden viewer for stereo cards, with a card in it: NIAGARA FALLS, 1904, in three dimensions and two shades of brown.'],
    ['Reel Viewer, Strange Tourism Reels', 'gadget', 14, 'A red plastic viewer and six reels from towns nobody has toured: a salt mine, a rope museum, a place that was mostly a sign.'],
    ['3D Postcard Viewer', 'gadget', 6, 'A cardboard viewer for lenticular postcards. One card inside: a horse, winking, from a motel gift shop.'],
    ['Film-Slide Sorter', 'gadget', 8, 'A lit panel for sorting slides. Somebody sorted a life onto it, and then into a box, and then here.'],
    ['Slide Carousel, Loaded', 'case', 12, 'Eighty slides of a vacation. Slide forty-one is a man asleep in a chair. He is in every slide after it.'],
    ['8mm Film Splicer', 'tool', 10, 'A splicer for home movies, with a bottle of cement gone to glue. It joined a birthday to a Christmas to a funeral, in that order.'],
    ['Film Leader Countdown Strip', 'paper', 3, 'A strip of countdown leader, 8, 7, 6. It counted down to a film that is not in the unit. It counts still.'],
    ['Home-Movie Title-Card Kit', 'kit', 9, 'Plastic letters and a felt board for titling home movies. The letters left spell OUR TRIP. The letters missing spelled where.'],
    ['Flash Cube', 'gadget', 2, 'A cube of four flashbulbs, three used. The fourth was saved for something that never quite happened.'],
    ['Flip-Flash Bar', 'gadget', 3, 'A bar of ten bulbs, all used, from one party, in one evening, by one person who wanted every minute.'],
    ['Instant-Film Cold Clip', 'tool', 4, 'A metal clip to keep an instant photo warm while it developed in the cold. It warmed a picture of a snowman. The snowman is on it, faintly.'],
    ['Camera Self-Timer, Clockwork', 'gadget', 10, 'A little clockwork timer that screws into the shutter, so the photographer could run into the picture. He never made it in time. There are eleven photos of his back.'],
    ['Bulb Shutter Release', 'tool', 5, 'A rubber bulb on a tube. Squeeze and the shutter opens. A portrait was taken with it of somebody who would not smile, and it is a wonderful portrait.'],
    ['Light Meter, Leather Case', 'gadget', 16, 'A meter with a needle that swings at the sky. It has measured a thousand skies. It measures this unit as "dim."'],
    ['Darkroom Timer', 'gadget', 12, 'A big-faced timer with a glow dial. It timed prints in a bathroom with a towel under the door. Somebody\'s whole twenties.'],
    ['Darkroom Safe Light', 'gadget', 9, 'A red lamp for the darkroom. Everything under it looked like a crime scene. Some of it was a birthday.'],
    ['Film Developing Tank', 'tin', 8, 'A black tank with a reel. It developed rolls of film, and with them, a marriage, a rift, a reconciliation, in negatives.'],
    ['Negative Retouching Pencils', 'kit', 6, 'Pencils for fixing faces on negatives. Somebody fixed a great many faces. Their own, mostly.'],
    ['Passport Photo Cutter', 'tool', 7, 'A guillotine for passport photos. It cut a hundred faces to size. A hundred people wanted to be somewhere else.'],
    ['School Photo Comb', 'tool', 1, 'The free black comb from picture day, still in its paper sleeve. Hair was combed. The photo was terrible anyway.'],
    ['Souvenir Photo Viewer Keychain', 'gadget', 3, 'A tiny viewer on a keychain with one picture in it: a lookout, a family, a wind that ruined every hairdo. It was the best day.'],
    ['Penny-Viewer Souvenir Scope', 'gadget', 5, 'A little scope from a souvenir stand with a picture of the stand in it. The stand is the whole view. It was always the whole view.'],
    ['Box Camera, Cardboard', 'case', 45, 'A box camera with a film still in it, twelve exposures, eight taken. Nobody has developed the eight. The appraiser has stopped asking about the four.'],
    ['Magic Lantern Slides, Hand-Coloured', 'case', 80, 'A box of glass lantern slides, hand-coloured, of a circus that came through the county once and never again. The elephant is pink. It was.'],
  ],
  wardrobe: [
    ['Funeral-Home Fan', 'paper', 6, 'A cardboard fan on a stick from a funeral home, with a painting of a sunset on it. It fanned three generations through three services and a heat wave.'],
    ['Mourning Jewelry Box', 'case', 30, 'A black lacquer box of jet beads and a brooch. Worn for a year, as was done, and then put away, as was done.'],
    ['Hair Keepsake Locket', 'case', 60, 'A locket with a braid of hair behind glass, brown, and an initial. Somebody was loved. Somebody kept the proof.'],
    ['Memorial Photo Pin', 'token', 12, 'A pin with a photograph under celluloid: a young man, a uniform, a date. Worn on a coat until the coat wore out.'],
    ['Ceramic False-Teeth Holder', 'bottle', 9, 'A little ceramic dish shaped like an open mouth, for teeth, overnight. Somebody thought this was funny. Somebody was right.'],
    ['Porcelain Shaving Mug', 'bottle', 14, 'A shaving mug with a name in gilt: HAROLD. It sat in a barber shop rack with forty others. Harold came in on Saturdays.'],
    ['Razor Blade Bank', 'tin', 5, 'A tin with a slot for used blades and no way to get them out. It is full. It has been full since 1961. It is very heavy for its size.'],
    ['Barber\'s Neck Duster', 'tool', 6, 'A soft brush for the back of a neck. It has dusted a thousand necks with talc and one with something that was not talc.'],
    ['Straight-Razor Strop', 'tool', 10, 'A leather strop on a hook. The razor was stropped on it every morning by a man who never once cut himself, and said so.'],
    ['Electric Hot-Comb Heater', 'gadget', 12, 'A little heater a comb sat in, for straightening hair, in a kitchen, on Saturday nights, with the radio on.'],
    ['Stove-Heated Curling Iron', 'tool', 8, 'An iron with wooden handles, heated on a stove, tested on paper. The paper is still in the drawer, scorched.'],
    ['Hair Tonic Bottle', 'bottle', 7, 'A bottle of green tonic, half full, from a barber shop that promised a lot of things to a lot of heads.'],
    ['Powder Compact, Puff', 'case', 16, 'An enamelled compact with a mirror and a puff, and powder the colour of somebody who is no longer that colour.'],
    ['Glove Stretcher', 'tool', 9, 'Wooden tongs for stretching the fingers of kid gloves. Gloves were a thing. So were fingers, apparently, that needed stretching.'],
    ['Hat Stretcher', 'tool', 14, 'A wooden thing with a screw that opens to stretch a hat. It stretched one hat, for one head, that got bigger, as the story goes.'],
    ['Collar Box', 'case', 18, 'A round leather box for detachable collars, with four collars in it, starched, waiting for a shirt and a Sunday.'],
    ['Collar Stays in a Tin', 'tin', 3, 'A tin of collar stays, plastic and brass, one of them silver, one of them lost, according to a note.'],
    ['Tie Press', 'tool', 10, 'A wooden press for ties, for a man who owned two ties and pressed them both.'],
    ['Travel Trouser Press', 'tool', 12, 'A folding press, for trousers, for a salesman, for a motel, for a life lived in creases.'],
    ['Advertising Pants Hanger', 'tool', 4, 'A wooden hanger from a clothier that closed in a year on the hanger. It has hung one pair of pants and one grudge.'],
    ['Pocket Shoehorn, Silver', 'tool', 15, 'A silver shoehorn the length of a finger, engraved, from a wedding. The marriage is not engraved. The shoehorn is.'],
    ['Garment Brush, Leather Case', 'case', 8, 'A clothes brush in a case, from a hotel, for a coat that had somewhere to be.'],
    ['Mothball Tin', 'tin', 3, 'A tin of mothballs. The smell is the smell. It is the smell of every closet that ever held a wool coat and a secret.'],
    ['Cedar Moth Blocks', 'tool', 4, 'Six blocks of cedar, for the moths, who did not care, and ate the sweater anyway.'],
    ['Closet Deodorizer, Flower', 'tin', 2, 'A plastic flower that hung in a closet and smelled of a flower no garden has grown.'],
    ['Handheld Rug Beater', 'tool', 12, 'A looped wire beater for rugs on a line. It beat rugs. It beat one rug so hard that a coin came out of it, and the coin is the story.'],
    ['Shoe-Stretching Forms', 'tool', 9, 'Wooden feet with a screw for stretching shoes. They have been every size. They have been in every shoe in a house.'],
    ['Wooden Sock-Darning Egg', 'tool', 5, 'A wooden egg on a handle for darning socks. Darned a thousand socks. Some of them twice. Thrift, in one object.'],
    ['Buttonhook, Old Boots', 'tool', 8, 'A hook for the buttons on boots that had buttons. Silver handle. The boots are gone. The hook remembers every one.'],
    ['Folding Travel Clothesline', 'tool', 3, 'A line that stretches between two hooks in a motel bathroom. It dried the same shirt in forty rooms.'],
    ['Beaded Evening Bag, Empty', 'case', 35, 'A beaded bag from the twenties with a chain handle. Empty except for a ticket stub, a dance card, and a name written in pencil and then rubbed out.'],
    ['Spats, Pair', 'kit', 20, 'Grey felt spats with buttons, for a man who wanted his shoes to look like they had shoes.'],
    ['Corsage Pin Box', 'case', 6, 'A box of pearl-headed pins for corsages, from a florist, for proms. One pin is bent. One prom went badly.'],
    ['Hatpin, Twelve Inches', 'tool', 25, 'A hatpin the length of a forearm with a jet head. It held a hat on in a wind and, once, a man off at a dance.'],
  ],
};

const ODD_FAMILY_BASE = { tokens: 'oddTokens', keys: 'oddKeys', kitchen: 'oddKitchen', occult: 'oddOccult', medical: 'oddMedical', survival: 'oddSurvival',
  outdoors: 'oddOutdoors', road: 'oddRoad', gadgets: 'oddGadgets', desk: 'oddDesk', photo: 'oddPhoto', wardrobe: 'oddWardrobe' };
const ODD_FAMILIES = Object.keys(ODDMENTS);
// weighted pick lists: a keeper is a quarter as likely as an ordinary thing
const _oddPickLists = {};
for (const fam of ODD_FAMILIES) {
  const list = [];
  ODDMENTS[fam].forEach((e, i) => { const n = e[2] >= ODD_KEEPER_VAL ? 1 : 4; for (let k = 0; k < n; k++) list.push(i); });
  _oddPickLists[fam] = list;
}
// a family base becomes one thing in particular (makeItem, variants 'oddment:<family>')
function rollOddment(it, b, fam) {
  const list = ODDMENTS[fam];
  if (!list) return;
  const idx = _oddPickLists[fam][it.hseed % _oddPickLists[fam].length];
  const e = list[idx];
  const town = (typeof GEN_TOWN !== 'undefined' && GEN_TOWN) || (typeof curTown === 'function' ? curTown() : null);
  const places = town && typeof TOWN_PLACES !== 'undefined' ? (TOWN_PLACES[town.id] || TOWN_PLACES.dustyFlats || []) : [];
  const place = places.length ? places[it.hseed % places.length] : 'the diner';
  it.oddment = fam + ':' + idx;
  it.name = (it.cond ? it.cond + ' ' : '') + e[0];
  it.preName = null;
  it.spr = ODD_SHAPES[e[1]] || 'oddTin';
  it.note = e[3].replace(/\{place\}/g, place).replace(/\{town\}/g, town ? town.name : 'town');
  it.val = Math.max(1, Math.round(e[2] * (it.val / Math.max(1, b.val))));
  if (e[2] >= ODD_KEEPER_VAL) it.keeper = true;
}

// ======================================================================
// js/sets.js
// ======================================================================
// ---- collectible sets: one loud piece, dull matching pieces, tiny proofs ----
// A lonely set piece is almost normal value. Completing the set is the spike.
// The yard never names a set. Appraisal at home is where the brand slaps you.


const SETS = {
  sundayTable: {
    id: 'sundayTable',
    name: 'The Sunday Table',
    completeName: (brand) => 'The Sunday Table, ' + brand + ', 6-cover',
    // role -> base item + how many the finished set needs
    roles: {
      anchor: { base: 'diningTable', n: 1 },
      chair:  { base: 'diningChair', n: 4 },
      leaf:   { base: 'tableLeaf',   n: 1 },
      cloth:  { base: 'tablecloth',  n: 1 },
      boat:   { base: 'gravyBoat',   n: 1 },
    },
    roleLabel: { anchor: 'the table', chair: 'chair', leaf: 'the leaf', cloth: 'the cloth', boat: 'the gravy boat' },
    proofRoles: ['leaf', 'cloth', 'boat'],      // traps never place these
    brandLocked: ['anchor', 'chair', 'leaf'],   // matching grain or it does not count
    pityRole: 'boat',                            // director may place this after enough dry teases
    // shared brand roll: [label, mult, palKey, weight]
    brands: [['Pine', 0.8, 'wood', 5], ['Oak', 1.2, 'wood', 3], ['Mahogany', 2.0, 'red', 1]],
    richBrand: 'Mahogany', richBrandMinDay: 6,   // no mahogany dining rooms in week one
    completeMult: 3.0,
    completeSpr: 'diningTableSet',
    completeSize: 16,
    completeCat: 'furniture',
    archBias: [['grandma', 7], ['timeCapsule', 3]],
    peekFlavor: [
      'Someone ate here for thirty years.',
      'Chair legs poke out from under a tarp.',
      'A long shape under a moving blanket. Family-sized.',
    ],
    appraiseFlavor: 'That grain... this belonged to a dining set.',
    // container bases each hidden piece likes, in preference order
    containerPrefs: {
      leaf:  ['box', 'trunk', 'crate'],
      cloth: ['dresser', 'suitcase', 'trunk', 'wardrobe'],
      boat:  ['diningTable', 'lockbox', 'trunk', 'dresser', 'box'],
    },
    containerTag: { leaf: 'KITCHEN' },           // the box gets a marker scrawl
  },

  tourBag: {
    id: 'tourBag',
    name: 'The Tour Bag',
    completeName: (brand) => 'The Tour Bag, ' + brand + ", '62 Season",
    roles: {
      anchor: { base: 'tourGolfBag', n: 1 },
      irons:  { base: 'ironSet',     n: 2 },
      balls:  { base: 'ballCan',     n: 1 },
      card:   { base: 'scorecard',   n: 1 },
    },
    roleLabel: { anchor: 'the bag', irons: 'iron set', balls: 'the ball can', card: 'the scorecard' },
    // what LOOK CLOSER says about each piece: information, never a count
    lore: { anchor: 'A leather tag on the strap: a season, a name, a course that closed. The pockets are empty. The pockets were not always empty.',
            irons: 'The grips have been re-wrapped in the same tape as a bag you may or may not have.',
            balls: 'A can of balls, unopened, from a season somebody wanted to remember unopened.',
            card: 'A scorecard, one round, every hole filled in. The back says "keep with the bag."' },
    proofRoles: ['balls', 'card'],
    brandLocked: ['anchor', 'irons'],
    pityRole: 'card',
    brands: [['Duffer', 0.7, 'teal', 5], ['ProLine', 1.3, 'blue', 3], ['Tour Issue', 2.2, 'red', 1]],
    richBrand: 'Tour Issue', richBrandMinDay: 8,
    completeMult: 3.0,
    completeSpr: 'golfClubs',
    completeSize: 10,
    completeCat: 'collectibles',
    archBias: [['timeCapsule', 6], ['grandma', 2], ['officeSurplus', 2]],
    peekFlavor: [
      'A golf bag leans on the door like it owns the place.',
      'Somebody loved these clubs more than the family.',
    ],
    appraiseFlavor: 'Tournament gear. This traveled as a set.',
    containerPrefs: {
      irons: ['crate', 'box', 'toolbox'],
      balls: ['box', 'crate', 'toolbox'],
      card:  ['filing', 'suitcase', 'trunk', 'box'],
    },
    containerTag: {},
  },

  backline: {
    id: 'backline',
    name: 'The Backline',
    completeName: (brand) => 'The Backline, ' + brand + ', Gig-Ready',
    roles: {
      anchor: { base: 'stageGuitar', n: 1 },
      case:   { base: 'stageCase',   n: 1 },
      amp:    { base: 'stageAmp',    n: 1 },
      pedal:  { base: 'stagePedal',  n: 1 },
    },
    roleLabel: { anchor: 'the guitar', case: 'the road case', amp: 'the amp', pedal: 'the boxed pedal' },
    lore: { anchor: 'A set list is still taped to the side. The last song is crossed out.',
            case: 'Foam cut to the shape of one guitar. Not any guitar. One.',
            amp: 'The tolex is scuffed in a pattern that matches a road case you may or may not have.',
            pedal: 'Factory box, band tape over the factory tape. Somebody wrote "DO NOT SELL" and then, later, "sell."' },
    proofRoles: ['pedal'],
    brandLocked: ['anchor', 'amp', 'pedal'],
    pityRole: 'pedal',
    brands: [['Rustwood', 0.7, 'wood', 4], ['Fendrix', 1.5, 'red', 3], ['Goldtop', 2.6, 'gold', 1]],
    richBrand: 'Goldtop', richBrandMinDay: 10,
    completeMult: 3.2,
    completeSpr: 'guitar',
    completeSize: 12,
    completeCat: 'music',
    archBias: [['musician', 8], ['timeCapsule', 2]],
    peekFlavor: [
      'An amp faces the door, cord coiled like it expects to be needed.',
      'A case wearing stickers from towns that no longer exist.',
    ],
    appraiseFlavor: 'Stage gear, matched. Somebody gigged this exact rig.',
    containerPrefs: {
      pedal: ['box', 'crate', 'stageCase', 'guitarCase'],
    },
    containerTag: { pedal: 'PEDALS' },
  },
};

function setRoleList(def) {
  const out = [];
  for (const role in def.roles) for (let i = 0; i < def.roles[role].n; i++) out.push(role);
  return out;
}

const COND_RANK = { Dusty: 0, Worn: 1, Clean: 2, Mint: 3 };

// count APPRAISED pieces the player holds that would count toward (setId, brand)
function setPieceCounts(lists, setId, brand) {
  const def = SETS[setId];
  const counts = {};
  const pieces = {};
  for (const role in def.roles) { counts[role] = 0; pieces[role] = []; }
  for (const list of lists) {
    for (const it of list) {
      if (!it.set || it.set.id !== setId || !it.searched || it.setComplete) continue;
      const role = it.set.role;
      if (def.brandLocked.includes(role) && it.set.brand !== brand) continue;
      if (counts[role] >= def.roles[role].n) continue;    // spares don't count twice
      counts[role]++;
      pieces[role].push(it);
    }
  }
  return { counts, pieces };
}

function setMissingText(def, counts) {
  const missing = [];
  for (const role in def.roles) {
    const need = def.roles[role].n - counts[role];
    if (need <= 0) continue;
    if (role === 'chair') missing.push(need + ' chair' + (need > 1 ? 's' : ''));
    else missing.push(def.roleLabel[role]);
  }
  return missing.join(', ');
}

function setIsComplete(def, counts) {
  for (const role in def.roles) if (counts[role] < def.roles[role].n) return false;
  return true;
}

// value of the assembled set: ~3x the scattered total, unless the condition is wrecked
function assembleValue(def, pieceList) {
  let sum = 0, dusty = 0, worst = 3;
  for (const it of pieceList) {
    sum += it.val;
    const r = COND_RANK[it.cond] == null ? 2 : COND_RANK[it.cond];
    if (r === 0) dusty++;
    if (r < worst) worst = r;
  }
  const mult = Math.max(1.8, def.completeMult - dusty * 0.25);
  const condLabel = ['Dusty', 'Worn', 'Clean', 'Mint'][worst];
  return { val: Math.round(sum * mult / 10) * 10, cond: condLabel };
}

// ======================================================================
// js/town.js
// ======================================================================
// ---- towns: arguments, not new item folders ----
// One shared locker function. A town supplies price level, bid step, archetype
// weights, which sets are legal, buyer money, paper voice, and its lie rate.
// The map is visible on day one and mostly unusable. That is the point.


const TOWNS = {
  dustyFlats: {
    id: 'dustyFlats', name: 'Dusty Flats', tier: 0,
    paperName: 'THE DUSTY FLATS GAZETTE',
    tagline: '"All the junk that\'s fit to print"',
    blurb: 'home. three units, familiar faces, $25 raises.',
    priceMult: 1, bidStep: 25,
    crowdCapMult: 1,
    lieRate: 0.12,
    sets: ['sundayTable', 'tourBag'],
    archBoost: null,
    dayCapBase: 1500, dayCapPerDay: 220,
    gasCost: 0,
    rivals: [],
    map: [120, 430],
    myths: ['goldJacket', 'goonMap', 'moonRock'],
    gate: null,
    arrival: ['You pull into Dusty Flats with the sunrise. The water tower still says DUS Y FLA S.',
              '"Back already," says the clerk, pleased. Deposits the raccoon watches you park.',
              'Home. The clerk has your coffee poured before the van stops.'],
  },
  redMesa: {
    id: 'redMesa', name: 'Red Mesa', tier: 1,
    tint: { col: 'rgba(226,132,86,0.16)', mode: 'multiply' },    // red rock, hard noon
    paperName: 'THE RED MESA LEDGER',
    tagline: '"We print what we can prove. Mostly."',
    blurb: 'fewer friendly faces. pricier doors. the paper hedges.',
    priceMult: 1.6, bidStep: 50,
    crowdCapMult: 2.4,
    lieRate: 0.22,
    sets: ['sundayTable', 'backline'],
    archBoost: { shopStock: 6, smuggler: 5, timeCapsule: 4 },
    dayCapBase: 2800, dayCapPerDay: 300,
    gasCost: 60,
    rivals: ['vera', 'tuck'],
    myths: ['jewelEgg'],
    map: [300, 368],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 4000 },
    arrival: ['"Bidder number, van, name." The Red Mesa clerk checks all three. Slowly.',
              '"Red Mesa remembers you." It is not clear whether that is good.',
              'Vera nods at your van. Tuck nods at nothing. You have been here enough.'],
  },
  // ---- the rest of the map. locked. looming. ----
  // Salt Lick: the ugliest doors on the highway. Cheap, dusty, boxes everywhere,
  // and now and then the worst-looking unit on the row has one good thing in a
  // garbage bag. The lesson: never price a locker by its furniture.
  saltLick: {
    id: 'saltLick', name: 'Salt Lick', tier: 1,
    tint: { col: 'rgba(255,246,222,0.16)', mode: 'screen' },     // bleached: salt light on everything
    paperName: 'THE SALT LICK SHOPPER',
    tagline: '"Free. Worth every penny."',
    blurb: 'a dirt town like home, but the dirt is saltier. cheap doors. full boxes.',
    priceMult: 0.8, bidStep: 25,
    crowdCapMult: 0.7,
    lieRate: 0.15,
    sets: ['sundayTable', 'tourBag'],
    archBoost: { hoarder: 10, workshop: 4, officeSurplus: 2 },
    dayCapBase: 1300, dayCapPerDay: 200,
    gasCost: 45,
    rivals: ['bev', 'pruitt'],
    myths: ['nugget'],
    map: [238, 458],
    gate: { bidderNumber: true, netWorth: 2200 },
    // the rules it bends
    junkBias: 0.15,               // more junk on every door
    containerBoost: 1,            // one more container per unit actually holds something
    containerPoolShift: 0.35,     // boxes and bags lean toward household goods, not underwear
    condWeights: [45, 30, 20, 5], // salt air. everything is a grade dustier
    sleeperRate: 0.3,             // a junk unit hides one good small thing in a bag
    bluffTells: 0.5,              // honest paper, dishonest confidence: half the yard chatter is theater
    noiseSpread: 1.6,             // and everybody but Ed guesses loud
    arrival: ['"Bidder number?" The Salt Lick clerk squints at it. "Huh. Real."',
              '"You again." He says it like a compliment. In Salt Lick it is one.',
              'Bev looks up from her boxes when you park. That is a greeting here.'],
  },
  // Gypsum City: the paper is always right about the story and almost never
  // about the door. The watchmaker's unit is on the row today. It is not unit
  // 18. Read the fronts, match the story, ignore the number.
  gypsumCity: {
    id: 'gypsumCity', name: 'Gypsum City', tier: 2,
    tint: { col: 'rgba(240,240,232,0.10)', mode: 'screen' },     // chalk-white civic light
    paperName: 'THE GYPSUM CITY CORRECTION',
    tagline: '"We stand by our errors."',
    blurb: 'the paper names the wrong unit on purpose, they say. the story is always real.',
    priceMult: 1.3, bidStep: 50,
    crowdCapMult: 1.6,
    lieRate: 0.7,
    sets: ['sundayTable', 'backline'],
    archBoost: { timeCapsule: 4, officeSurplus: 4, grandma: 2 },
    dayCapBase: 2400, dayCapPerDay: 280,
    gasCost: 90,
    rivals: ['hattie', 'delgado'],
    myths: ['deed'],
    map: [198, 282],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 7000 },
    // the rules it bends
    paperHintRate: 0.95,          // the lead is nearly always about one of today's doors
    paperNamesUnit: 1,            // and it always prints a number
    paperSecondHint: 0.5,         // half the days, a second story about a second door. also numbered. also wrong.
    arrival: ['"Name?" The Gypsum City clerk writes it down. Wrong.',
              '"Oh, the one from the paper." You were not in the paper. You will be.',
              'The editor waves from the newsstand. He has printed your unit number. It is wrong.'],
  },
  // Bent Fork: two auctioneers, one yard, thirty years of not speaking. Which
  // one has the gavel today changes how fast the room moves, how proud the
  // rivals get, and how much they let slip. Same locker, different game.
  bentFork: {
    id: 'bentFork', name: 'Bent Fork', tier: 2,
    tint: { col: 'rgba(170,184,190,0.18)', mode: 'multiply' },   // overcast river valley
    paperName: 'THE BENT FORK TINES',
    tagline: '"Two sides to every story. We print both."',
    blurb: 'two auctioneers. they hate each other. check who has the gavel before you bid.',
    priceMult: 1.4, bidStep: 50,
    crowdCapMult: 1.8,
    lieRate: 0.18,
    sets: ['sundayTable', 'tourBag'],
    archBoost: { workshop: 5, grandma: 4 },
    dayCapBase: 2600, dayCapPerDay: 290,
    gasCost: 105,
    rivals: ['dee', 'cobb'],
    myths: ['gavel'],
    map: [362, 272],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 8000 },
    // the rule it bends
    auctioneer: ['ray', 'lyle'],  // one of them per day, seeded
    arrival: ['Ray says "who\'s this" and the Reverend says "welcome, friend" at the same moment. They do not look at each other.',
              '"The out-of-towner." Both auctioneers claim you now. Neither has asked.',
              'Your name is on the yard board. In two handwritings.'],
  },
  // Marrow Creek: nobody stores anything ordinary. A whole archetype that only
  // lives here, boxes that lean weird, named junk twice as often, unit 13
  // sorting itself most weeks, and Creepy Carl in town more days than not.
  marrowCreek: {
    id: 'marrowCreek', name: 'Marrow Creek', tier: 2,
    tint: { col: 'rgba(120,170,120,0.22)', mode: 'multiply' },   // sodium lamp and fog, a sickly green
    paperName: 'THE MARROW CREEK ECHO',
    tagline: '"We heard it too."',
    blurb: 'nobody stores anything ordinary in Marrow Creek. price it anyway.',
    priceMult: 1.3, bidStep: 50,
    crowdCapMult: 1.5,
    lieRate: 0.2,
    sets: ['sundayTable', 'backline'],
    archBoost: { oddball: 75, hoarder: -8, grandma: -9, workshop: -7, shopStock: -5, officeSurplus: -6, musician: -6 },
    dayCapBase: 2500, dayCapPerDay: 280,
    gasCost: 120,
    rivals: ['ferrell', 'wanda'],
    myths: ['jarThing'],
    map: [472, 330],
    gate: { bidderNumber: true, vanCap: 52, netWorth: 7500 },
    // the rules it bends
    namedJunkRate: 0.12,          // things that should not exist, four times as often
    containerPoolShift: 0.4,      // and the boxes lean weird
    containerPoolTarget: 'weirdy',
    tidyRate: 0.12,               // unit 13 sorts itself most weeks
    buyerBias: { carl: 6, randy: 2, alice: 1, gina: 1 },   // Carl is in town more days than not
    frontDressing: true,          // the front row always looks good. that is the trap
    emptyFlexBias: 6,             // and dressed-up empty units look like myth holes
    arrival: ['The Marrow Creek clerk does not ask your name. He seems to know it. Nobody told him.',
              '"You came back." The clerk sounds surprised. Most people do not.',
              'A mannequin in unit 13 has been turned to face the gate. Toward your van.'],
  },
  // Vermillion: velvet and chrome. The maker is everything and the finish
  // lies about it. Brands hide until the loupe or the appraiser, brand
  // multipliers are stretched, and the gilt lamp is the cheap one this week.
  vermillion: {
    id: 'vermillion', name: 'Vermillion', tier: 3,
    tint: { col: 'rgba(200,110,120,0.16)', mode: 'multiply' },   // velvet and evening
    paperName: 'THE VERMILLION REGISTER',
    tagline: '"Society. Property. Provenance."',
    blurb: 'velvet and chrome. the maker is everything, and the finish lies about it.',
    priceMult: 2.0, bidStep: 100,
    crowdCapMult: 2.6,
    lieRate: 0.15,
    sets: ['sundayTable', 'backline'],
    archBoost: { grandma: 6, timeCapsule: 6, shopStock: 3, hoarder: -10 },
    dayCapBase: 3800, dayCapPerDay: 380,
    gasCost: 160,
    rivals: ['vale', 'charlie'],
    myths: ['cameo'],
    map: [418, 182],
    gate: { bidderNumber: true, vanCap: 60, netWorth: 14000 },
    buyerBias: { alice: 4, randy: 2, gina: 1, carl: 1 },
    // the rules it bends
    hideBrandsAtDoor: true,       // brand shows at the loupe or the appraiser, never on the pull
    brandSpread: 1.6,             // brand multipliers stretched: Rustwood .33x, Goldtop 13x
    estSpread: 1.8,               // the dig estimate is twice as vague
    condWeights: [20, 30, 35, 15],
    peekLimit: 2,                 // viewings by appointment: two doors a day. The third you bid blind, or not at all
    arrival: ['"Number?" The Vermillion clerk looks at your laminated card the way one looks at a sandwich.',
              '"Ah. The one with the eye." Somebody has been talking about you.',
              'Your bidder card is brass now. Engraved. Nobody will say who paid for it.'],
  },
  // Kettle Basin: climate controlled. Everything survives, everybody knows it,
  // opening bids start high, and a Mint piece packed into a full van rides home
  // one grade worse. The question is no longer "is it valuable" but "is the
  // condition premium worth this bidding war".
  kettleBasin: {
    id: 'kettleBasin', name: 'Kettle Basin', tier: 3,
    tint: { col: 'rgba(214,232,255,0.20)', mode: 'screen' },     // cold fluorescent white
    paperName: 'THE KETTLE BASIN THERMOSTAT',
    tagline: '"Seventy-two degrees. Forty percent. Always."',
    blurb: 'the units are climate controlled. the people are not. mint is common, and it bruises.',
    priceMult: 1.9, bidStep: 100,
    crowdCapMult: 2.4,
    lieRate: 0.12,
    sets: ['sundayTable', 'tourBag', 'backline'],
    archBoost: { timeCapsule: 8, grandma: 4, hoarder: -8 },
    dayCapBase: 3600, dayCapPerDay: 360,
    gasCost: 170,
    rivals: ['priscilla', 'garrity'],
    myths: ['stampSheet'],
    map: [540, 238],
    gate: { bidderNumber: true, vanCap: 60, netWorth: 15000 },
    // the rules it bends
    condWeights: [4, 14, 46, 36], // Mint is a third of everything
    minBidMult: 1.6,              // the yard knows what it has
    rivalCapBonus: 0.1,           // and so does everyone else
    crushRate: 0.35,              // a van packed past 85% bruises one good piece on the way home
    arrival: ['"Seventy-two degrees," says the Kettle Basin clerk, instead of hello.',
              '"Pack lighter this time." The clerk knows about the van. Everybody knows about the van.',
              'Garrity nods at you from across the lot. Garrity does not nod.'],
  },
  // Chrome Springs: the rich lot. Everything costs four times as much, half the
  // shine is plate, the fakes are good, and the two people you bid against
  // could buy the yard. The clerk learns your name. Slowly.
  chromeSprings: {
    id: 'chromeSprings', name: 'Chrome Springs', tier: 4,
    tint: { col: 'rgba(240,196,96,0.18)', mode: 'multiply' },    // gold. it is always gold here
    paperName: 'THE CHROME SPRINGS COURIER',
    tagline: '"Discretion assured. Prices are not."',
    blurb: 'the rich lot. spectacular doors, expensive mistakes. the clerk laughs at your name, for now.',
    priceMult: 3.2, bidStep: 200,
    crowdCapMult: 4.5,
    lieRate: 0.2,
    sets: ['sundayTable', 'tourBag', 'backline'],
    archBoost: { timeCapsule: 6, shopStock: 4, smuggler: 4, hoarder: -12, officeSurplus: -6 },
    dayCapBase: 7000, dayCapPerDay: 700,
    gasCost: 220,
    rivals: ['ilse', 'dex'],
    myths: ['pageantCrown'],
    map: [516, 92],
    gate: { bidderNumber: true, vanCap: 90, netWorth: 40000 },
    buyerBias: { alice: 3, carl: 2, randy: 2, gina: 1 },
    // the rules it bends
    fakeRate: 0.35,               // sophisticated fakes
    luxJunkRate: 0.35,            // luxury junk: it looks like six thousand dollars until somebody with a loupe laughs
    hideBrandsAtDoor: true,
    brandSpread: 1.3,
    condWeights: [15, 25, 40, 20],
    // the crowd here does not bring chairs. It raises a finger, once, from the back
    crowd: {
      tag: 'no chairs. no coffee. money.',
      lines: {
        raise: ['Someone at the back raised a finger.', 'A finger, at the back. The auctioneer saw it.',
          'Somebody by the door nods a quarter inch. That is a bid here.', 'A card is lifted at the back and lowered again.'],
        fold: ['The back of the room is still.', 'The finger does not go up again.', 'Nobody at the back moves.'],
        win:  ['Somebody at the back takes it. A driver comes forward to pay.', 'It goes to the back of the room. Nobody caught a name. Nobody was meant to.'],
        settle: 'The back of the room is still.',
        quiet: 'still',
      },
    },
    // what the clerk says, by how many times you have pulled in
    arrival: ['"Name?" The clerk does not look up.', '"Oh. You." The clerk looks up this time.',
              '"We\'ve been expecting you." Your card is already on the desk.'],
  },
};
const TOWN_ORDER = ['dustyFlats', 'saltLick', 'redMesa', 'gypsumCity', 'bentFork',
  'marrowCreek', 'vermillion', 'kettleBasin', 'chromeSprings'];

// ---- town rules: the knobs a town may turn. Missing = Dusty Flats behavior ----
// A town that bends a rule sets the key on its pack; everything else falls
// through to these defaults, so an unopened town plays exactly like home.
const TOWN_RULES = {
  condWeights: null,      // [Dusty, Worn, Clean, Mint] weights; null = CONDS defaults (Kettle Basin keeps things nice)
  junkBias: 0,            // added to every archetype's junk share (Salt Lick)
  containerBoost: 0,      // extra containers that actually hold something (Salt Lick)
  containerPoolShift: 0,  // chance a box/bag draws from containerPoolTarget instead of trash (Salt Lick, Marrow Creek)
  containerPoolTarget: 'home',
  tidyRate: 0.035,        // chance unit 13 sorted itself overnight (Marrow Creek runs hot)
  buyerBias: null,        // {buyerId: weight} for who visits; null = two at random
  brandSpread: 1,         // brand multiplier exponent (Vermillion stretches the gap between makers)
  estSpread: 1,           // how vague the dig estimate is (Vermillion)
  minBidMult: 1,          // opening bids (Kettle Basin starts high)
  rivalCapBonus: 0,       // added to every rival's cap multiplier (Kettle Basin collectors)
  crushRate: 0,           // chance a van packed past 85% bruises one Mint/Clean piece (Kettle Basin)
  luxJunkRate: 0,         // chance a unit carries one piece of luxury junk with a huge fake estimate (Chrome Springs)
  arrival: null,          // clerk lines by visit count, or null for the plain sunrise toast
  tint: null,             // {col, mode} washed over the yard, the peek and the auction, under the UI (a town's light)
  crowd: null,            // {tag, lines} to replace the lawn-chair crowd at the auction (Chrome Springs)
  bluffTells: 0,          // chance a rival tell at the peek is theater about nothing (Salt Lick)
  noiseSpread: 1,         // how much wider everybody's estimate wobbles, Ed excepted (Salt Lick)
  frontDressing: false,   // the good-looking things face the door, junk hides behind (Marrow Creek)
  emptyFlexBias: 0,       // extra weight on dressed-up empty units (Marrow Creek)
  peekLimit: 0,           // doors you may look inside per day; 0 = all. The rest you bid blind (Vermillion)
  sleeperRate: 0,         // chance a junk-heavy unit hides one good small thing in a bag (Salt Lick)
  namedJunkRate: 0.03,    // named junk per unit (Marrow Creek runs hot)
  fakeRate: 0.18,         // convincing fakes on a myth-owner day (Chrome Springs runs hot)
  hideBrandsAtDoor: false,// brands read only through the loupe or at home (Vermillion)
  paperHintRate: 0.7,     // chance the lead story is a real hint about one of today's units
  paperNamesUnit: 0.45,   // chance that hint prints a unit number (lieRate decides if it is the right one)
  paperSecondHint: 0,     // chance the third slot is a second hint about a second unit (Gypsum City)
  auctioneer: 'default',  // who runs the gavel; a list means one is picked per day (Bent Fork)
};
function townRule(key, town) {
  const t = town || curTown();
  return (t && t[key] !== undefined && t[key] !== null) ? t[key] : TOWN_RULES[key];
}

// ---- auctioneers: the same locker plays differently under a different gavel ----
// The auction runs at the speed of the voice: a line with a clip holds the
// floor until the clip ends, then voGap seconds of air. bidPace / foldPace are
// for SILENT lines (no clip recorded, voice muted): seconds a bid or a fold
// hangs in the air. turnBeat: the pause after the room goes quiet with a rival
// on top, before the buttons come back (the gavel turning to you). press: how
// willing proud rivals are to go past their number. rejoin: how often a folded
// pair comes back. hesitation: seconds before the auctioneer needles a silent
// player. raiseMult: how big a rival's raise is under this gavel (momentum).
// tellMult: how much the yard lets slip at the peek (a slow room talks more).
// face: the portrait, npcs/npc_<face>.jpg (+ npc_<face>_talk.jpg while he speaks).
const AUCTIONEERS = {
  // the house gavel: Buzz Kettleman, ex drive-time radio. Fast mouth, normal hammer.
  default: {
    id: 'default', name: 'Buzz Kettleman', blurb: 'drive-time radio gavel; has not stopped talking since the station let him go.',
    face: 'buzz',
    bidPace: 1.2, foldPace: 0.7, voGap: 0.25, turnBeat: 0.8,
    pressMult: 1, rejoinMult: 1, hesitation: 7, raiseMult: 1, tellMult: 1,
    voice: 'auc',           // voice bank prefix (auc_open_ready, ...)
  },
  // Bent Fork, side A: Rapid Ray. Fast gavel, big jumps, no patience for pride.
  ray: {
    id: 'ray', name: 'Rapid Ray Dunmore', blurb: "fast gavel, double raises, blink and it's sold.",
    face: 'ray',
    bidPace: 0.6, foldPace: 0.4, voGap: 0.1, turnBeat: 0.4,
    pressMult: 0.5, rejoinMult: 0.4, hesitation: 4, raiseMult: 2, tellMult: 0.8,
    voice: 'auc',           // one recorded voice for every gavel (set 'ray' to probe a ray_ bank; scripted in VOICE_SCRIPT.md, not planned)
  },
  // Bent Fork, side B: the Reverend. Slow gavel, everybody gets talked back in, and the yard gossips.
  lyle: {
    id: 'lyle', name: 'Rev. Lyle Pettibone', blurb: 'slow gavel, sermons between bids, folded hands come back.',
    face: 'lyle',
    bidPace: 1.8, foldPace: 1.0, voGap: 0.5, turnBeat: 1.2,
    pressMult: 1.7, rejoinMult: 2, hesitation: 12, raiseMult: 1, tellMult: 1.6,
    voice: 'auc',           // same: Buzz's bank; 'lyle' would probe a lyle_ bank
  },
};
// does this town change gavels day to day?
function townHasGavels() { return Array.isArray(townRule('auctioneer')); }
function curAuctioneer(day) {
  const a = townRule('auctioneer');
  if (Array.isArray(a)) {
    const R = RNG(strHash('gavel_' + G.worldSeed + '_' + (day || G.day) + '_' + curTown().id));
    return AUCTIONEERS[R.pick(a)] || AUCTIONEERS.default;
  }
  return AUCTIONEERS[a] || AUCTIONEERS.default;
}

function curTown() {
  return TOWNS[(G.world && G.world.town) || 'dustyFlats'] || TOWNS.dustyFlats;
}

// gate check: [ok, [{label, ok}]] — the clerk goes down his little list
function townGateStatus(town) {
  if (!town.gate) return { ok: true, checks: [] };
  const checks = [];
  if (town.gate.bidderNumber) checks.push({ label: 'a bidder number', ok: !!G.world.bidderNumber });
  if (town.gate.vanCap) checks.push({ label: 'a van that is not embarrassing (' + town.gate.vanCap + '+ bulk)', ok: G.vanCap >= town.gate.vanCap });
  if (town.gate.netWorth) checks.push({ label: 'a name the clerk has heard (' + fmt$(town.gate.netWorth) + ' net worth)', ok: netWorth() >= town.gate.netWorth });
  return { ok: checks.every((c) => c.ok), checks };
}

// ======================================================================
// js/tools.js
// ======================================================================
// ---- the toolbox: physical objects, not a skill tree ----
// Tools query facts the generator already wrote. They never reroll a locker.
// They arrive as classified ads at the general store, or turn up in units.


const TOOLS = {
  flashlight: {
    name: 'Flashlight', price: 45, spr: 'toolFlashlight',
    blurb: 'shapes in the second row become silhouettes',
    ad: 'FLASHLIGHT — {price} at the general store. See what the sun refuses to.',
  },
  mirror: {
    name: 'Inspection Mirror', price: 60, spr: 'toolMirror',
    blurb: 'angle it right and one stacked thing shows itself',
    ad: 'INSPECTION MIRROR, telescoping — {price}. Look on top of what you cannot touch.',
  },
  loupe: {
    name: "Jeweler's Loupe", price: 75, spr: 'toolLoupe',
    blurb: 'read the make of one item per unit, from the door',
    ad: "JEWELER'S LOUPE — {price}. Brands, grains, hallmarks. One good look is all you get.",
  },
  metalDetector: {
    name: 'Metal Detector', price: 90, spr: 'toolDetector',
    blurb: 'it sings when the dark has metal in it',
    ad: 'METAL DETECTOR, army surplus — {price}. Finds safes, tools, regret.',
  },
  catalog: {
    name: "Appraiser's Pocket Guide", price: 120, spr: 'toolCatalog',
    blurb: 'matches grain against sets you have appraised',
    ad: "APPRAISER'S POCKET GUIDE, dog-eared — {price}. Know what belongs to what.",
  },
  edNotes: {
    name: "Ed's Leftover Notes", price: 0, spr: 'toolNotes',
    blurb: 'a stray page of the notebook. an extra tell, never a price',
    dropOnly: true,
  },
  // late: the one tool that is a person. He opens every box the night the van comes in
  // (UNPACK EVERYTHING, done for you). He does not read, rummage, or feel for false
  // bottoms — LOOK CLOSER is still yours.
  hiredHand: {
    name: 'Hired Hand', price: 260, spr: 'toolHand',
    blurb: "Roy's nephew. unpacks the van the night it comes home. opens boxes, reads nothing",
    ad: "HELP WANTED, FOUND — {price}. Roy's nephew. Strong back, opens boxes, asks no questions. Evenings.",
  },
};
const TOOL_UNLOCK = { flashlight: 2, mirror: 4, loupe: 6, metalDetector: 8, catalog: 10, hiredHand: 16 };

function hasTool(id) { return G.world.tools.includes(id); }

// found in a unit: an unowned tool goes straight into the toolbox
function tryToolPickup(l) {
  if (!l.tool || G.world.tools.includes(l.tool)) return false;
  G.world.tools.push(l.tool);
  return true;
}

// ---- peek queries ----
// what the eye (plus kit) can make of an item from the doorway
function peekVisibility(it) {
  if (it.layer === 2) return 'full';
  if (G.cur && G.cur.mirrorUid === it.uid) return 'full';
  if (it.layer === 1 && hasTool('flashlight')) return 'sil';
  return 'none';
}

// the one stacked thing the mirror can reach in this unit
function computeMirrorUid(lk) {
  if (!hasTool('mirror')) { lk.mirrorUid = null; return; }
  const cands = lk.items.filter((it) => it.onUid && it.layer < 2);
  if (!cands.length) { lk.mirrorUid = null; return; }
  cands.sort((a, b) => (a.hseed || a.uid) - (b.hseed || b.uid));
  lk.mirrorUid = cands[0].uid;
}

const METAL_BASES = ['safe', 'gunSafe', 'floorSafe', 'strongbox', 'lockbox', 'till',
  'wrench', 'drill', 'knife', 'revolver', 'medal', 'goldBar', 'ring', 'necklace',
  'watch', 'gem', 'bike', 'sewing', 'typewriter', 'silverware'];
function detectorLine(lk) {
  let n = 0;
  for (const it of lk.items) {
    if (it.layer < 2 && METAL_BASES.includes(it.base)) n++;
    if (it.loot) for (const l of it.loot) if (METAL_BASES.includes(l.base)) n++;
  }
  if (n === 0) return 'The detector stays quiet.';
  if (n <= 2) return 'The detector chirps at the dark.';
  return 'The detector is SINGING.';
}

// grain check: a visible piece of a set the player has already appraised
function catalogLine(lk) {
  for (const it of lk.items) {
    if (it.layer !== 2 || !it.set) continue;
    if (G.world.setsAppraised.includes(it.set.id)) {
      return 'Pocket guide: this grain matches a set you have appraised.';
    }
  }
  return null;
}

// a stray notebook page — usually right, occasionally stale
const ED_NOTES_LINES = {
  junkPile: '"weight and dust. thin margin."',
  themeShowcase: '"door says what it is. rare enough."',
  setTease: '"matching grain somewhere in the back."',
  setTrap: '"loud up front. too quiet behind it."',
  cashBox: '"small box, worn hinges. opened often."',
  emptyFlex: '"dressed-up door. the echo says empty."',
  mythHole: '"something in there hums. not the good hum."',
};
function edNotesLine(lk) {
  const R = RNG(strHash('ednotes' + G.worldSeed + '_' + G.day + '_' + lk.num));
  if (!R.chance(0.55)) return null;
  let c = lk.contract;
  if (R.chance(0.25)) {                            // the page is old. things move.
    const keys = Object.keys(ED_NOTES_LINES).filter((k) => k !== c && k !== 'mythHole');
    c = R.pick(keys);
  }
  return "Ed's note on this row: " + (ED_NOTES_LINES[c] || ED_NOTES_LINES.junkPile);
}

// loupe: one focused read per unit
function loupeRead(it) {
  G.cur.loupeUid = it.uid;
  play('search_find');
  if (it.set && SETS[it.set.id]) {
    const locked = SETS[it.set.id].brandLocked.includes(it.set.role);
    if (locked) return '"' + it.set.brand + '. Matching grain on the edge."';
    return '"' + it.name.replace(/^(Dusty|Worn|Clean|Mint) /, '') + '. The good kind."';
  }
  return it.name + (it.container ? ' — something shifts inside when you lean in.' : '');
}

// morning wear-and-tear: bulbs die, pages blow away
function toolBreakage() {
  const R = RNG(strHash('break' + G.worldSeed + '_' + G.day));
  if (hasTool('flashlight') && R.chance(0.05)) {
    G.world.tools = G.world.tools.filter((t) => t !== 'flashlight');
    return 'Your flashlight died in the night. The store sells another.';
  }
  if (hasTool('edNotes') && R.chance(0.08)) {
    G.world.tools = G.world.tools.filter((t) => t !== 'edNotes');
    return "Ed's page blew out of the van somewhere on Route 9.";
  }
  return null;
}

// ======================================================================
// js/gen.js
// ======================================================================
// ---- locker generation, contracts, archetypes, NPCs, buyers ----
// Generation runs in passes: contract -> furniture grammar -> set/cash injector
// -> tell/lie -> value clamp. Truth first, then the door.


// boxes come in five sizes and the small ones are far commoner: most of what
// anybody packs is book-sized, and an appliance carton is a thing you notice
const GENERIC_JUNK = [
  ['mattress', 3], ['boxSmall', 3], ['box', 4], ['boxLarge', 2], ['boxWardrobe', 1], ['applianceCarton', 1],
  ['crate', 4], ['barrel', 3], ['tire', 3],
  ['fan', 3], ['vhs', 3], ['dvdStack', 2], ['cassettes', 2], ['comicBox', 2], ['lamp', 2], ['garbage', 6],
];

const SMALL_POOLS = {
  home:   [['underwear', 4], ['teddy', 3], ['diary', 3], ['coinJar', 3], ['china', 2], ['silverware', 2],
           ['watch', 2], ['massager', 2], ['cashWad', 2], ['brooch', 1], ['pocketWatch', 1], ['pearls', 1],
           ['knife', 1], ['necklace', 1], ['ring', 1], ['revolver', 1],
           ['cabbageDoll', 1], ['instantCamera', 1], ['moviePoster', 1], ['floppyBox', 1]],   // the decade, in the drawers
  rich:   [['cashWad', 4], ['ring', 3], ['necklace', 3], ['watch', 2], ['gem', 2], ['medal', 2],
           ['wine', 2], ['brooch', 2], ['pearls', 2], ['pocketWatch', 2], ['tiara', 1], ['goldBar', 1]],
  music:  [['records', 4], ['harmonica', 3], ['pedal', 3], ['mic', 2], ['cashWad', 1]],
  tools:  [['wrench', 5], ['knife', 2], ['walkman', 1], ['coinJar', 1]],
  papers: [['diary', 4], ['comic', 3], ['cards', 3], ['medal', 1], ['cashWad', 1], ['trashCards', 2], ['floppyBox', 2], ['moviePoster', 2]],
  cashy:  [['cashWad', 5], ['coinJar', 4]],
  trash:  [['underwear', 4], ['teddy', 2], ['diary', 1], ['coinJar', 1], ['cashWad', 1]],
  guns:   [['revolver', 4], ['shotgun', 3], ['knife', 3], ['derringer', 2], ['machete', 2], ['crossbow', 2], ['medal', 2], ['sword', 1], ['cashWad', 2]],
  weirdy: [['urn', 3], ['massager', 3], ['underwear', 3], ['jarSpecimen', 2], ['teddy', 2], ['diary', 2], ['knife', 2], ['machete', 1], ['revolver', 1], ['ouijaBoard', 2], ['trashCards', 1]],
  any:    [['underwear', 3], ['teddy', 3], ['coinJar', 3], ['diary', 2], ['china', 2], ['walkman', 2],
           ['comic', 2], ['camera', 1], ['cashWad', 2], ['watch', 1], ['urn', 1],
           ['instantCamera', 1], ['moviePoster', 1], ['trashCards', 1], ['ouijaBoard', 1], ['cartAtari', 1], ['cartN64', 1]],
};
// every console's one slot draws from its own system's games (games.js)
for (const sid of SYSTEM_IDS) SMALL_POOLS['slot_' + sid] = [[SYSTEMS[sid].cart, 1]];
SMALL_POOLS.home.push(['cartNes', 1], ['gameboyHandheld', 1]);
SMALL_POOLS.papers.push(['cartSnes', 1], ['cartGameboy', 1], ['cartGenesis', 1]);
SMALL_POOLS.weirdy.push(['cartMaster', 1]);
// the oddments: twelve families of drawer things, each where that kind of drawer is (oddments.js)
SMALL_POOLS.home.push(['oddKitchen', 3], ['oddWardrobe', 2], ['oddMedical', 1], ['oddDesk', 1], ['oddPhoto', 1]);
SMALL_POOLS.papers.push(['oddDesk', 3], ['oddTokens', 2], ['oddKeys', 1], ['oddPhoto', 1]);
SMALL_POOLS.tools.push(['oddOutdoors', 3], ['oddRoad', 3], ['oddSurvival', 2], ['oddGadgets', 1]);
SMALL_POOLS.weirdy.push(['oddOccult', 4], ['oddMedical', 1], ['oddKeys', 1]);
SMALL_POOLS.any.push(['oddTokens', 1], ['oddKitchen', 1], ['oddOccult', 1], ['oddGadgets', 1], ['oddKeys', 1]);
SMALL_POOLS.cashy.push(['oddTokens', 2]);
SMALL_POOLS.trash.push(['oddKeys', 1], ['oddTokens', 1], ['oddRoad', 1]);

const ARCHETYPES = {
  hoarder: {
    w: 22, label: "Hoarder's Unit", valueMult: 1,
    theme: [['box', 6], ['crate', 5], ['vhs', 4], ['dvdStack', 3], ['comicBox', 2], ['blurayBox', 2], ['cassettes', 2], ['mannequin', 2], ['fan', 3], ['filing', 2], ['barrel', 3], ['tire', 3], ['garbage', 5], ['suitcase', 2], ['birdcage', 1], ['cagedBones', 1], ['guillotine', 1],
      ['cartsNes', 1], ['cartsGameboy', 1], ['cartsGamegear', 1], ['cartsMaster', 1]],
    themeCats: ['junk', 'weird'], junkShare: 0.55, smallPool: 'weirdy',
    flavor: ['Stuffed floor to ceiling.', 'Smells like old newspapers.', 'The door barely closed.'],
  },
  musician: {
    w: 14, label: "Musician's Storage", valueMult: 1,
    theme: [['guitar', 5], ['guitarCase', 4], ['amp', 5], ['vinylCrate', 4], ['keyboard', 3], ['cassettes', 2], ['tuba', 2], ['stereo', 3]],
    themeCats: ['music'], junkShare: 0.35, smallPool: 'music',
    flavor: ['Neighbors complained about noise for years.', 'A guitar pick was found by the door.', 'Stickers all over the walls.'],
  },
  grandma: {
    w: 16, label: "Grandma's Estate", valueMult: 1,
    theme: [['dresser', 5], ['wardrobe', 3], ['mirror', 3], ['sewing', 3], ['radio', 3], ['trunk', 3], ['painting', 3], ['rugRolled', 2], ['armchair', 3], ['edisonDiscs', 1], ['globe', 1], ['suitcase', 2], ['birdcage', 1]],
    themeCats: ['antiques', 'furniture'], junkShare: 0.3, smallPool: 'home',
    flavor: ['Smells faintly of lavender.', 'Doilies visible from the door.', 'Everything is wrapped in old quilts.'],
  },
  workshop: {
    w: 14, label: 'Old Workshop', valueMult: 1,
    theme: [['workbench', 4], ['toolbox', 5], ['drill', 4], ['bike', 3], ['crate', 3], ['skis', 2], ['ladder', 3], ['bearTrap', 1], ['lockbox', 1]],
    themeCats: ['tools'], junkShare: 0.35, smallPool: 'tools',
    flavor: ['Oil stains on the concrete.', 'Sawdust everywhere.', 'A half-finished birdhouse sits up front.'],
  },
  shopStock: {
    w: 12, label: 'Dead Shop Stock', valueMult: 1.1,
    theme: [['arcade', 3], ['neon', 3], ['till', 4], ['tv', 4], ['box', 4], ['blurayBox', 3], ['dvdStack', 3], ['mannequin', 3], ['filing', 2], ['microwave', 2], ['stereo', 2], ['pinball', 2],
      ['discsPsx', 1], ['discsDream', 1], ['cartsN64', 1], ['psxConsole', 1]],
    themeCats: ['electronics'], junkShare: 0.3, smallPool: 'cashy',
    flavor: ["Boxes have price stickers.", "A 'CLOSING SALE' sign leans on the wall.", 'Inventory sheets taped to the door.'],
  },
  smuggler: {
    w: 6, label: "Smuggler's Cache", valueMult: 1.15,
    theme: [['box', 5], ['crate', 5], ['barrel', 4], ['safe', 2], ['trunk', 3], ['filing', 2], ['strongbox', 2], ['lockbox', 2], ['gunSafe', 2], ['bearTrap', 1], ['cagedBones', 1], ['suitcase', 2]],
    themeCats: ['junk'], junkShare: 0.5, smallPool: 'rich', sneaky: true,
    flavor: ['The lock was replaced twice.', 'Paid cash. Fake name.', 'Something rattles when trucks pass by.'],
  },
  timeCapsule: {
    w: 6, label: 'Time Capsule', valueMult: 1.35,
    theme: [['tv', 3], ['radio', 4], ['typewriter', 4], ['vinylCrate', 3], ['trunk', 3], ['bike', 3], ['painting', 3], ['edisonDiscs', 2], ['cassettes', 2], ['skis', 2], ['globe', 2], ['stereo', 2], ['suitcase', 2], ['skullMount', 1], ['guillotine', 1], ['golfClubs', 2],
      ['homeComputer', 2], ['fruitComputer', 1], ['woodConsole', 2], ['greyConsole', 2], ['pinball', 1], ['vhs', 2],   // the decade, in the back
      ['masterConsole', 1], ['snesConsole', 1], ['genesisConsole', 1], ['n64Console', 1], ['psxConsole', 1], ['dreamConsole', 1],
      ['cartsAtari', 1], ['cartsNes', 1], ['cartsSnes', 1], ['cartsGenesis', 1]],                                       // and the rest of the shelf
    themeCats: ['antiques', 'collectibles'], junkShare: 0.25, smallPool: 'any',
    flavor: ['Untouched since 1987.', 'The calendar on the wall is decades old.', 'A thick, even layer of dust on everything.'],
  },
  // lives only where a town boosts it up from zero (Marrow Creek). Nothing in
  // here is for anything. Somebody paid rent on it for years.
  oddball: {
    w: 0, label: 'Nobody Normal', valueMult: 1.2,
    theme: [['mannequin', 5], ['birdcage', 4], ['cagedBones', 3], ['guillotine', 2], ['skullMount', 3], ['bearTrap', 3], ['globe', 2], ['trunk', 3], ['barrel', 3], ['crate', 3], ['box', 3], ['neon', 2], ['arcade', 1], ['safe', 1], ['suitcase', 2], ['garbage', 2]],
    themeCats: ['weird'], junkShare: 0.2, smallPool: 'weirdy',
    flavor: ['A mannequin faces the door. It was turned that way on purpose.', 'The tenant paid in coins. Foreign ones.',
             'Something is humming in there, and it is not a fridge.', 'The manager will not go in after dark. He said so twice.',
             'Every box is labeled with a single letter. Not the same letter.'],
  },
  officeSurplus: {
    w: 8, label: 'Office Surplus', valueMult: 0.95, allowDupes: true,
    theme: [['filing', 6], ['box', 5], ['officeChair', 5], ['typewriter', 4], ['till', 3], ['microwave', 3], ['ladder', 2], ['neon', 1], ['lockbox', 1]],
    themeCats: ['furniture', 'electronics'], junkShare: 0.25, smallPool: 'papers',
    flavor: ["A whole company's office packed into one unit.", 'Inventory tags on everything.', 'Smells like toner and bankruptcy.'],
  },
};

const OWNER_LINES = [
  'Tenant paid the first year in quarters. Rolled.',
  'Tenant listed an emergency contact. The contact has never heard of him.',
  'Tenant visited every Sunday for two years, then not at all.',
  'Manager remembers the tenant "had a way of looking at the back wall."',
  'Tenant asked, at signing, whether the units were "soundproof." They are not.',
  'Rent was paid by three different people, none of them the tenant.',
  'The tenant\'s handwriting on the form has been described as "upset."',
  'Tenant left a forwarding address. It is this unit.',
  'Unit belonged to a retired dentist.',
  'Owner skipped town overnight.',
  '14 months delinquent.',
  "Neighbors say the owner was 'quiet'.",
  'Previous owner won a radio contest once.',
  'Rent was paid in crumpled fives.',
  'Manager says the owner cried when they lost it.',
  'Nobody ever saw the owner twice.',
];

const LOCKER_COLS = 8;

// ============ persistent world / director state ============
// Saved with the game. genDay only READS it; commitDay advances it once per
// real day, so reloading a morning regenerates the same day.
function defaultWorld() {
  return {
    town: 'dustyFlats',
    travelTo: null,
    bidderNumber: false,
    opening: true,              // the first five mornings at home are dealt, not rolled (see OPENING)
    tools: [],
    met: [],                    // rival + buyer ids the player has shared a yard or a sale with
    visited: [],                // town ids driven into
    rivalMem: {},
    setsAppraised: [],          // set ids the player has put a loupe to at home
    setsCompleted: [],          // {id, brand, day}
    clippings: [],              // {id, img, headline, day, town}: every time the paper wrote about you, framed on the museum wall
    setDrought: {},             // setId -> no set contracts until this day
    openSets: [],               // {id, setId, brand:[label,mult,pal], remaining:[roles], born}
    pity: {},                   // setId -> dry teases since the proof object showed
    brandLean: {},              // setId -> brand label the player is visibly collecting
    papers: [],                 // every piece of paper you have found, live and dead (see ephemera.js)
    events: [],                 // what the town remembers (see memory.js)
    career: { bases: {} },      // running counts the log cannot recompute once it is capped (see careerBook() in memory.js: THE BOOKS)
    achieved: {},               // id -> day, for the things worth writing down once (ACHIEVEMENTS in memory.js)
    raresSeen: {},              // rare event id -> day it last happened
    foreshadow: null,           // {lastDay, printed}: what the paper hinted at, and when
    director: {
      dawnMoney: 1500,
      lastSetDay: 0,
      heat: {},                 // archId -> recent-appearance heat
      spec: {},                 // the specialness budget: lastStory, lastBlend, lastRead (days)
    },
  };
}

function commitDay(world, today, playerMoney) {
  const dir = world.director;
  for (const k in dir.heat) dir.heat[k] = Math.round(dir.heat[k] * 0.7 * 100) / 100;
  for (const lk of today.lockers) dir.heat[lk.archId] = (dir.heat[lk.archId] || 0) + 1;
  // the specialness budget remembers what fired
  dir.spec = dir.spec || {};
  if (today.facts.storyToday) dir.spec.lastStory = today.facts.day;
  if (today.facts.blendToday) dir.spec.lastBlend = today.facts.day;
  if (today.facts.readDay) dir.spec.lastRead = today.facts.day;
  // the director plans further ahead than the player can see: when a story
  // door runs, the next one is already on the calendar (a week and change
  // out), so the paper can foreshadow it without lying. A day that passes
  // without the door (you were home) just pushes it a little further on.
  {
    const Rn = RNG(strHash('nextstory' + (G && G.worldSeed) + '_' + today.facts.day));
    if (today.facts.storyToday) {
      dir.spec.nextStoryDay = today.facts.day + 7 + Rn.i(0, 6);
      dir.spec.nextStoryId = null;
    } else if (dir.spec.nextStoryDay && today.facts.day >= dir.spec.nextStoryDay) {
      dir.spec.nextStoryDay = today.facts.day + 1 + Rn.i(0, 2);
    }
  }
  // what the paper printed about today's doors, for tomorrow's corrections box
  if (today.facts.lead) world.lastLead = Object.assign({ day: today.facts.day }, today.facts.lead);
  // stories rest a while after they run; planted histories are planted
  world.storiesSeen = world.storiesSeen || {};
  world.personasSeen = world.personasSeen || {};
  world.pairsSeen = world.pairsSeen || {};
  if (today.facts.rare) { world.raresSeen = world.raresSeen || {}; world.raresSeen[today.facts.rare] = today.facts.day; }
  for (const lk of today.lockers) {
    if (lk.story) world.storiesSeen[lk.story] = today.facts.day;
    if (lk.story && dir.spec.nextStoryDay && !dir.spec.nextStoryId) {
      // and which story: chosen now, from what any highway town can host, so the paper knows what to hint at
      const Rs = RNG(strHash('nextstoryid' + (G && G.worldSeed) + '_' + today.facts.day));
      dir.spec.nextStoryId = pickStory(Rs, { tier: 1 }, world, dir.spec.nextStoryDay);
    }
    if (lk.persona) world.personasSeen[lk.persona] = today.facts.day;
    if (lk.pair) world.pairsSeen[lk.pair] = today.facts.day;
    if (lk.rare) { world.raresSeen = world.raresSeen || {}; world.raresSeen[lk.rare] = today.facts.day; }
    if (lk.provPlant) {
      const [id, kind] = lk.provPlant.split(':');
      const st = provState(world, id);
      if (kind === 'anchor') st.planted = today.facts.day; else st.proofPlanted = today.facts.day;
    }
  }

  // new set instances open for business...
  for (const inst of (today.facts.newInstances || [])) {
    if (!world.openSets.some((o) => o.id === inst.id)) world.openSets.push(inst);
  }
  // ...then placed pieces leave their instance, whether or not anyone bought them
  const teased = {};
  for (const lk of today.lockers) {
    if (lk.contract === 'setTease' || lk.contract === 'setTrap') dir.lastSetDay = today.facts.day;
    for (const p of (lk.setPlaced || [])) {
      const def = SETS[p.setId];
      teased[p.setId] = teased[p.setId] || { proof: false };
      if (def && p.role === def.pityRole) teased[p.setId].proof = true;
      if (p.instanceId) {
        const inst = world.openSets.find((o) => o.id === p.instanceId);
        if (inst) {
          const ri = inst.remaining.indexOf(p.role);
          if (ri >= 0) inst.remaining.splice(ri, 1);
        }
      }
    }
  }
  world.openSets = world.openSets.filter((o) => o.remaining.length > 0);
  for (const sid in teased) world.pity[sid] = teased[sid].proof ? 0 : (world.pity[sid] || 0) + 1;
  if (world.pendingBlurbDay && today.facts.day >= world.pendingBlurbDay) {
    world.pendingBlurb = null;
    world.pendingBlurbDay = 0;
  }
  dir.dawnMoney = playerMoney;
}

// ============ contracts: the unit's job for today ============
function townLegalSets(town, world, day) {
  return (town.sets || Object.keys(SETS)).filter((s) => SETS[s] && !(world.setDrought[s] > day));
}
// ---- the opening: the first five mornings at home are dealt, not rolled ----
// Each morning teaches one thing by being it: the stuff, the bidders, the paper,
// the price, the find. Nothing is explained. The seed still rolls every item;
// the script only decides each door's job and who turns up, so two players on
// one seed share the same lockers. Leave Dusty Flats early and it simply stops.
const OPENING = {
  1: ['honest', 'junk', 'cash'],       // look at the stuff: one door tells the truth, one is junk, one has money in a box
  2: ['dull', 'plain', 'junk'],        // watch who bids: a dull front with the value behind it, and Ed folds at the number
  3: ['plain', 'cash', 'junk'],        // read the paper: the lead names the wrong door for the first time
  4: ['trap', 'plain', 'junk'],        // winning is not earning: a big unit with a dressed front and nothing behind it, and Bart comes out for it
  5: ['epic', 'plain', 'junk'],        // this is why I dig: one real thing in the dark at the back
};
const OPENING_CONTRACT = { honest: 'themeShowcase', junk: 'junkPile', cash: 'cashBox', dull: 'themeShowcase', trap: 'emptyFlex', epic: 'themeShowcase', plain: 'themeShowcase' };
// what the paper does those mornings: which door the lead is about, whether it prints the number, whether the number is right, and the store's ad
const OPENING_PAPER = {
  1: { lead: 'honest', name: 1, lie: 0 },
  2: { lead: 'dull', name: 1, lie: 0, tool: 'flashlight' },
  3: { lead: 'plain', name: 1, lie: 1 },
  4: { lead: 'trap', name: 1, lie: 0, tool: 'mirror' },
  5: { lead: null },
};
function openingDay(world, town, day) {
  return (world && world.opening && town && town.id === 'dustyFlats' && OPENING[day]) ? day : 0;
}
// who is in the room on a dealt door: the first morning is Ed and Sal and no Bart; later mornings put the right rival on the right door
function openingRoster(locker, day) {
  if (!locker.opening) return null;
  if (day === 1) return { ed: 1, sal: 1, bart: 0 };
  if (day === 2 && locker.opening === 'dull') return { ed: 1 };
  if (day === 4 && locker.opening === 'trap') return { bart: 1 };
  if (day === 5 && locker.opening === 'epic') return { ed: 1 };
  return null;
}

function rollDayPlan(R, day, world, town) {
  const dir = world.director;
  const od = openingDay(world, town, day);
  if (od) {
    const roles = R.shuf(OPENING[od]);
    return { contracts: roles.map((r) => OPENING_CONTRACT[r]), honestIdx: roles.indexOf('honest'), opening: roles };
  }
  const flush = dir.dawnMoney > 4000, broke = dir.dawnMoney < 300;
  const w = { junkPile: 16, themeShowcase: 26, setTease: 6, setTrap: 3, cashBox: 8, emptyFlex: 5 };
  if (flush) { w.emptyFlex += 7; w.setTrap += 5; }
  if (town.tier >= 1) { w.setTrap += 2; w.emptyFlex += 2; }   // meaner yards play meaner games
  w.emptyFlex += townRule('emptyFlexBias', town);
  // the specialness budget: an authored door about once a week, never more
  const spec = dir.spec || {};
  if (town.tier >= 1 && day - (spec.lastStory || -99) >= 7) w.story = 7;
  const plannedStory = town.tier >= 1 && spec.nextStoryDay === day && day - (spec.lastStory || -99) >= 7;   // the door the paper has been hinting at
  const legalSets = townLegalSets(town, world, day);
  if (!legalSets.length) { w.setTease = 0; w.setTrap = 0; }

  const contracts = [];
  for (let i = 0; i < 3; i++) {
    let c = R.wpick(Object.keys(w).map((k) => [k, w[k]]).filter((p) => p[1] > 0));
    // one set-flavored unit per day is plenty
    if ((c === 'setTease' || c === 'setTrap') && contracts.some((x) => x === 'setTease' || x === 'setTrap'))
      c = 'themeShowcase';
    contracts.push(c);
  }
  // overdue for a tease: the director forces one
  if (legalSets.length && day - dir.lastSetDay >= R.i(4, 5) &&
      !contracts.some((c) => c === 'setTease' || c === 'setTrap')) {
    contracts[R.i(0, 2)] = 'setTease';
  }
  if (plannedStory && !contracts.includes('story')) contracts[R.i(0, 2)] = 'story';
  // broke player gets one unit where the visible value is honest, so they can eat
  let honestIdx = -1;
  if (broke) {
    honestIdx = contracts.findIndex((c) => c !== 'setTease' && c !== 'setTrap' && c !== 'story');   // the planned door keeps its day
    if (honestIdx < 0) honestIdx = contracts.findIndex((c) => c !== 'story');
    if (honestIdx < 0) honestIdx = 0;
    contracts[honestIdx] = 'themeShowcase';
  }
  return { contracts, honestIdx };
}

function rollSetBrand(R, def, day, world, setId, avoidLean) {
  const lean = world.brandLean && world.brandLean[setId];
  if (lean && !avoidLean && R.chance(0.55)) {
    const b = def.brands.find((x) => x[0] === lean);
    if (b && !(b[0] === def.richBrand && day < def.richBrandMinDay)) return b.slice(0, 3);
  }
  for (let t = 0; t < 6; t++) {
    const b = R.wpick(def.brands.map((x) => [x, x[3] || 1]));
    if (b[0] === def.richBrand && day < def.richBrandMinDay) continue;
    if (avoidLean && lean && b[0] === lean && t < 4) continue;   // traps wear the wrong grain
    return b.slice(0, 3);
  }
  return def.brands[0].slice(0, 3);
}

// resolve which pieces of which set land today
function planSet(R, day, world, contract, town) {
  const legal = townLegalSets(town, world, day);
  if (!legal.length) return null;
  const setId = R.pick(legal);
  const def = SETS[setId];

  const dullRoles = Object.keys(def.roles).filter((r) => r !== 'anchor' && !def.proofRoles.includes(r));

  if (contract === 'setTrap') {
    // the loud piece, none of the proof objects, its own (often wrong) brand
    const roles = ['anchor'];
    if (dullRoles.length && R.chance(0.4)) roles.push(R.pick(dullRoles));
    return { setId, brand: rollSetBrand(R, def, day, world, setId, true), roles, trap: true, instanceId: null };
  }

  let inst = world.openSets.find((o) => o.setId === setId);
  let newInstance = null;
  if (!inst) {
    inst = {
      id: 'si' + day + '_' + R.i(100, 999), setId,
      brand: rollSetBrand(R, def, day, world, setId),
      remaining: setRoleList(def), born: day,
    };
    newInstance = inst;
  }
  const rem = inst.remaining.slice();
  const roles = [];
  const take = (role) => {
    const i = rem.indexOf(role);
    if (i >= 0) { rem.splice(i, 1); roles.push(role); return true; }
    return false;
  };
  if (R.chance(0.75)) take('anchor');
  const dullN = R.i(1, 3);
  for (let i = 0; i < dullN; i++) if (dullRoles.length) take(R.pick(dullRoles));
  for (const pr of def.proofRoles) if (R.chance(0.35)) take(pr);
  if ((world.pity[setId] || 0) >= 3 && def.pityRole) take(def.pityRole);
  while (roles.length < 2 && rem.length) take(rem[0]);
  if (!roles.length) return null;
  return { setId, brand: inst.brand, roles, trap: false, instanceId: inst.id, newInstance };
}

// ============ the myth calendar ============
// Every ~12 days, one town "owns" the rumor. Most days the myth is not in the
// three units. Some days it is in a container. Some days a very good fake is.
const MYTH_FAKES = { goldJacket: 'fakeJacket', moonRock: 'fakeRock', jewelEgg: 'fakeEgg', goonMap: 'fakeMap', nugget: 'fakeNugget', deed: 'fakeDeed', gavel: 'fakeGavel', jarThing: 'fakeJarThing',
  cameo: 'fakeCameo', stampSheet: 'fakeStampSheet', pageantCrown: 'fakePageantCrown' };
// luxury junk: it photographs like money. The appraiser needs one word.
// [base, name, real value, what the appraiser calls it, est range at the door]
const LUX_JUNK = [
  { base: 'lamp', name: 'Gold-Plated Floor Lamp', val: 40, tag: 'plated', est: [1800, 3400] },
  { base: 'painting', name: '"Original" Oil, Signed Illegibly', val: 35, tag: 'print', est: [2200, 5000] },
  { base: 'rugRolled', name: 'Silk Persian Runner', val: 50, tag: 'machine-made', est: [1600, 3800] },
  { base: 'mirror', name: 'Venetian Mirror, Gilt', val: 45, tag: 'resin frame', est: [1400, 2900] },
  { base: 'watch', name: 'Swiss Chronograph', val: 30, tag: 'quartz movement', est: [2400, 4600] },
  { base: 'necklace', name: 'Diamond Rivière', val: 45, tag: 'glass', est: [3000, 6500] },
  { base: 'wine', name: '1961 Bordeaux, Sealed', val: 20, tag: 'vinegar', est: [1200, 2800] },
  { base: 'pearls', name: 'South Sea Strand', val: 40, tag: 'shell bead', est: [1500, 3200] },
  { base: 'goldBar', name: 'Gold Bar, Stamped GOLD', val: 30, tag: 'brass', est: [2600, 5200] },
  { base: 'camera', name: 'Leica-Style Rangefinder', val: 25, tag: 'toy', est: [1300, 2600] },
  { base: 'pocketWatch', name: 'Railroad Pocket Watch, Engraved', val: 35, tag: 'no movement', est: [1100, 2400] },
  { base: 'painting', name: 'Old Master, Attributed', val: 40, tag: 'poster, varnished', est: [3500, 7000] },
];
// what a careful packer hides in a bag of junk: small, good, and worth the whole door
const SLEEPER_POOL = [['watch', 3], ['pocketWatch', 3], ['ring', 3], ['brooch', 2], ['medal', 2],
  ['camera', 2], ['pearls', 2], ['gem', 2], ['goldBar', 1]];
function mythEpochOwner(worldSeed, day) {
  const epoch = Math.floor((day - 1) / 12);
  const Rm = RNG(strHash('myth' + worldSeed + '_' + epoch));
  const owners = Object.keys(TOWNS).filter((t) => TOWNS[t].myths && TOWNS[t].myths.length);
  return { epoch, ownerId: owners.length ? Rm.pick(owners) : null };
}
function mythPlanFor(worldSeed, day, town, foundLegends) {
  const { epoch, ownerId } = mythEpochOwner(worldSeed, day);
  if (!ownerId || town.id !== ownerId) return null;
  const myths = TOWNS[ownerId].myths.filter((m) => !foundLegends.includes(m));
  if (!myths.length) return null;
  const myth = myths[epoch % myths.length];      // the rumor rotates; the town remembers them all
  const Rd = RNG(strHash('mythday' + worldSeed + '_' + day));
  if (Rd.chance(0.16)) return { base: myth, real: true };
  if (Rd.chance(townRule('fakeRate', town))) return { base: MYTH_FAKES[myth], real: false };
  return null;
}

// named junk that should not exist: common sprite, ugly condition, stupid value
const NAMED_JUNK = [
  { base: 'radio', name: 'Prewar Radio, Serial No. 0001', val: 750, cond: 'Dusty' },
  { base: 'arcade', name: 'Prototype Cabinet: "MOON MINER 2"', val: 950, cond: 'Dusty' },
  { base: 'diary', name: 'A Diary That Names Spite Sal', val: 320, cond: 'Worn', blurb: 'sal_diary' },
  { base: 'teddy', name: 'One-eyed Teddy (the other eye was a diamond)', val: 400, cond: 'Dusty' },
  { base: 'harmonica', name: "Harmonica Engraved 'TO ELVIS FROM MOM'", val: 620, cond: 'Worn' },
  { base: 'globe', name: "Globe With a Country That Doesn't Exist", val: 380, cond: 'Dusty' },
  { base: 'skis', name: 'Skis Signed by an Olympian Who Was Disqualified', val: 300, cond: 'Worn' },
  { base: 'urn', name: "Urn Labeled 'NOT GRANDPA'", val: 340, cond: 'Dusty' },
  { base: 'lamp', name: 'Lamp Made From a Trophy Made From a Lamp', val: 220, cond: 'Worn' },
  { base: 'camera', name: 'Camera With One Exposure Left Since 1979', val: 410, cond: 'Dusty' },
  { base: 'medal', name: 'Medal for Something the Army Will Not Confirm', val: 560, cond: 'Worn' },
  // props from movies nobody will name for legal reasons
  { base: 'rubySlippers', name: 'Ruby Slippers (screen-worn, size 6)', val: 800, cond: 'Worn' },
  { base: 'hockeyMask', name: 'Hockey Mask, Painted. Unsettling.', val: 450, cond: 'Dusty' },
  { base: 'propHilt', name: 'Prop "Laser Sword" Hilt, Signed', val: 650, cond: 'Worn' },
  { base: 'fluxGadget', name: 'Blinking "Time Circuit" Movie Prop', val: 700, cond: 'Dusty' },
];

function pickArch(R, set, world, todayCounts, town) {
  if (set) {
    const def = SETS[set.setId];
    for (let t = 0; t < 4; t++) {
      const a = R.wpick(def.archBias);
      if ((todayCounts[a] || 0) < 2) return a;
    }
  }
  const heat = (world.director && world.director.heat) || {};
  const boost = (town && town.archBoost) || {};
  // a town may boost an archetype up from zero (Marrow Creek's oddballs) or push a
  // normal one down; anything at or below zero is simply not on the row here
  const pairs = Object.keys(ARCHETYPES).map((k) => {
    let wt = (ARCHETYPES[k].w + (boost[k] || 0)) / (1 + (heat[k] || 0) * 0.35);
    if ((todayCounts[k] || 0) >= 2) wt = 0.001;      // never three of a kind in one yard
    return [k, wt];
  }).filter((p) => p[1] > 0);
  return R.wpick(pairs);
}

// ============ furniture grammar ============
// duplicate suppression: NO doubles per locker, except natural multiples
// (boxes/crates/tapes/garbage) — and 'allowDupes' archetypes (company storage)
// where multiples are the whole point.
// nobody packs one box. The big cartons are rarer, so they repeat less.
const DUP_OK = { box: 3, boxSmall: 3, boxLarge: 2, boxWardrobe: 2, crate: 3, vhs: 3, garbage: 3 };
function dupCap(id, arch) {
  if (arch.allowDupes) return 5;
  return DUP_OK[id] || 1;
}
function pickBigId(R, arch, used, junkShare) {
  for (let t = 0; t < 9; t++) {
    let id;
    if (R.chance(junkShare)) id = R.wpick(GENERIC_JUNK);
    else if (R.chance(0.75)) id = R.wpick(arch.theme);
    else id = R.pick(BIG_BASES).id;
    if ((used[id] || 0) < dupCap(id, arch)) return id;
  }
  const fresh = BIG_BASES.filter((b) => !used[b.id]);
  return fresh.length ? R.pick(fresh).id : R.pick(BIG_BASES).id;
}

// pack one layer: reserved (set) items claim random slots first, junk fills in
function packLayerR(R, arch, layer, minN, maxN, used, reservedItems, junkShare, cols) {
  const items = [];
  const iv = [[0, cols || LOCKER_COLS]];      // free [start,end) column intervals
  const fitOpts = (w) => {
    const opts = [];
    for (const seg of iv) for (let c = seg[0]; c + w <= seg[1]; c++) opts.push(c);
    return opts;
  };
  const occupy = (col, w) => {
    for (let i = 0; i < iv.length; i++) {
      const a = iv[i][0], b = iv[i][1];
      if (col >= a && col + w <= b) {
        const rep = [];
        if (a < col) rep.push([a, col]);
        if (col + w < b) rep.push([col + w, b]);
        iv.splice(i, 1, ...rep);
        return;
      }
    }
  };
  for (const it of reservedItems) {
    const opts = fitOpts(it.wCols);
    if (!opts.length) { it._unplaced = true; continue; }
    it.layer = layer;
    it.col = R.pick(opts);
    occupy(it.col, it.wCols);
    items.push(it);
  }
  const n = Math.max(0, R.i(minN, maxN) - items.length);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < 5; t++) {
      const id = pickBigId(R, arch, used, junkShare);
      const it = makeItem(id, R);
      const opts = fitOpts(it.wCols);
      if (!opts.length) continue;
      it.layer = layer;
      it.col = R.pick(opts);
      occupy(it.col, it.wCols);
      used[id] = (used[id] || 0) + 1;
      items.push(it);
      break;
    }
  }
  return items;
}

// pile smaller things on top of flat-topped items — lockers are STACKED
// the tall cartons (wardrobe, appliance) are deliberately not here: nobody stacks
// on top of a box they cannot see over
const FLAT_TOPS = ['dresser', 'workbench', 'couch', 'crate', 'box', 'boxSmall', 'boxLarge', 'filing', 'trunk',
  'washer', 'fridge', 'amp', 'tv', 'safe', 'armchair', 'till', 'vinylCrate', 'barrel',
  'microwave', 'suitcase', 'strongbox', 'floorSafe', 'stereo'];
const STACK_POOL = [['box', 3], ['boxSmall', 3], ['toolbox', 2], ['tv', 2], ['radio', 2], ['typewriter', 2],
  ['vhs', 3], ['fan', 2], ['lamp', 2], ['vinylCrate', 2], ['painting', 2], ['till', 1], ['amp', 1], ['crate', 2],
  ['garbage', 3], ['microwave', 2], ['suitcase', 2], ['lockbox', 1], ['stereo', 1]];

function stackingPass(items, arch, R, used) {
  for (const base of items.slice()) {
    if (!FLAT_TOPS.includes(base.base) || base.onUid || base.stackedUid) continue;
    if (!R.chance(0.6)) continue;
    for (let tries = 0; tries < 3; tries++) {
      const pickId = R.chance(0.35) ? R.wpick(arch.theme) : R.wpick(STACK_POOL);
      if ((used[pickId] || 0) >= dupCap(pickId, arch)) continue;
      used[pickId] = (used[pickId] || 0) + 1;
      const s = makeItem(pickId, R);
      const spr = SPRITES[s.spr] || SPRITES.mystery;
      if (spr.h > 48 || s.wCols > base.wCols) continue;
      s.layer = base.layer;
      s.col = base.col;
      s.wCols = base.wCols;
      s.onUid = base.uid;
      s.liftPx = (SPRITES[base.spr] || SPRITES.mystery).h - 2;
      base.stackedUid = s.uid;
      items.push(s);
      break;
    }
  }
}

// ---- what fits in what ----
// A container's `cap` is the biggest single thing it will swallow, in the same
// units as `size`. Nothing checked this before, which is how a prototype arcade
// cabinet (size 9) ended up inside a cardboard box (size 3): the named-junk pass
// picked a container at random and pushed. A container without its own cap gets a
// modest one from its own size, so anything added later is sane by default.
// The authored `SMALL_POOLS` are exempt — a guitar case is meant to hold a guitar.
function contCap(c) {
  if (!c) return 0;
  const spec = c.container;
  if (!spec) return 0;
  if (spec.cap != null) return spec.cap;
  return Math.max(1, Math.floor((c.size || 3) / 2));
}
function canHold(c, it) { return !!(c && c.container) && (it.size || 1) <= contCap(c); }
// the containers here that could actually take this thing
function holdersFor(list, it, openOnly) {
  return list.filter((c) => c.container && (!openOnly || !c.locked) && canHold(c, it));
}
// the smallest carton that would hold it — what to reach for when nothing in the
// unit fits and a box has to be conjured
const BOX_LADDER = ['boxSmall', 'box', 'boxLarge', 'boxWardrobe', 'applianceCarton'];
function boxBaseFor(it) {
  for (const b of BOX_LADDER) if (canHold(BASE_BY_ID[b], it)) return b;
  return 'applianceCarton';
}

function fillContainer(it, arch, R, town) {
  let key = arch.sneaky && it.container.pool !== 'cashy' ? 'rich' : it.container.pool;
  // some towns pack their boxes with care: the bag holds dishes, not underwear
  const shift = townRule('containerPoolShift', town);
  if (shift > 0 && (key === 'any' || key === 'trash') && R.chance(shift)) key = townRule('containerPoolTarget', town);
  const pool = SMALL_POOLS[key] || SMALL_POOLS.any;
  const n = R.i(it.container.n[0], it.container.n[1]);
  it.loot = it.loot || [];
  for (let i = 0; i < n; i++) it.loot.push(makeItem(R.wpick(pool), R));
  // smuggler bonus cash
  if (arch.sneaky && R.chance(0.5)) it.loot.push(makeItem('cashWad', R));
}

// unit 13's night shift: everything squared away, big stuff first
function tidyLocker(lk) {
  for (let L = 0; L <= 2; L++) {
    const floor = lk.items.filter((it) => it.layer === L && !it.onUid);
    floor.sort((a, b) => b.wCols - a.wCols || a.uid - b.uid);
    let col = 0;
    for (const it of floor) {
      if (col + it.wCols > (lk.cols || LOCKER_COLS)) break;
      it.col = col; col += it.wCols;
    }
    for (const it of lk.items) {
      if (it.layer === L && it.onUid) {
        const under = lk.items.find((o) => o.uid === it.onUid);
        if (under) { it.col = under.col; it.wCols = under.wCols; }
      }
    }
  }
}

// replace a dull item with a fresh base (used for guaranteed containers)
// the good-looking loose things face the door, the junk hides behind them
function dressFront(items) {
  const loose = (it) => !it.set && !it.onUid && !it.stackedUid && !it.container;
  const front = items.filter((it) => it.layer === 2 && loose(it));
  const back = items.filter((it) => it.layer < 2 && loose(it));
  for (const f of front) {
    const better = back.filter((b) => b.wCols === f.wCols && b.val > f.val * 1.5);
    if (!better.length) continue;
    const b = better.reduce((a, c) => (c.val > a.val ? c : a));
    const fl = f.layer, fc = f.col;
    f.layer = b.layer; f.col = b.col; b.layer = fl; b.col = fc;
    back.splice(back.indexOf(b), 1);
  }
}
// the opposite: the dull loose things face the door and the value waits in the dark
function dullFront(items) {
  const loose = (it) => !it.set && !it.onUid && !it.stackedUid && !it.container && !it.cash;
  const front = items.filter((it) => it.layer === 2 && loose(it));
  const back = items.filter((it) => it.layer < 2 && loose(it));
  for (const f of front) {
    const duller = back.filter((b) => b.wCols === f.wCols && b.val < f.val * 0.6);
    if (!duller.length) continue;
    const b = duller.reduce((a, c) => (c.val < a.val ? c : a));
    const fl = f.layer, fc = f.col;
    f.layer = b.layer; f.col = b.col; b.layer = fl; b.col = fc;
    back.splice(back.indexOf(b), 1);
  }
}
// put a small thing in the FRONT row where the door can see it: a free
// column first, else in place of something cheap. Returns the item or null.
function placeFront(R, lk, baseId) {
  const items = lk.items;
  const cols = lk.cols || 8;
  const taken = new Set();
  for (const it of items) if (it.layer === 2 && !it.onUid) for (let c = it.col; c < it.col + it.wCols; c++) taken.add(c);
  const free = [];
  for (let c = 0; c < cols; c++) if (!taken.has(c)) free.push(c);
  const it = makeItem(baseId, R);
  it.wCols = 1;
  if (free.length) { it.layer = 2; it.col = R.pick(free); items.push(it); return it; }
  const victims = items.filter((o) => o.layer === 2 && !o.set && !o.container && !o.legendary && !o.note && !o.pair && !o.persona && !o.stackedUid && !o.onUid && o.wCols === 1 && (o.cat === 'junk' || o.val < 30));
  if (!victims.length) return null;
  const v = R.pick(victims);
  it.layer = 2; it.col = v.col;
  items[items.indexOf(v)] = it;
  return it;
}
function swapInBase(R, items, baseId) {
  const victims = items.filter((it) => !it.set && !it.container && !it.legendary && !it.note && !it.pair && !it.persona && !it.paperwork &&
    !it.stackedUid && (it.cat === 'junk' || it.val < 30));   // never the other half of a pair, anything with a note on it, or a thing a paper promised
  if (!victims.length) return null;
  const v = R.pick(victims);
  const n = makeItem(baseId, R);
  n.layer = v.layer; n.col = v.col; n.wCols = Math.max(n.wCols, 1);
  if (n.wCols > v.wCols) n.wCols = v.wCols;
  if (v.onUid) {
    n.onUid = v.onUid; n.liftPx = v.liftPx;
    const under = items.find((o) => o.uid === v.onUid);
    if (under) under.stackedUid = n.uid;
  }
  items[items.indexOf(v)] = n;
  return n;
}

// tuck a small set piece into a container the set likes
function placeSetSmall(R, s, items) {
  const prefs = (s.def.containerPrefs && s.def.containerPrefs[s.role]) || [];
  let target = null;
  for (const base of prefs) {
    const cands = items.filter((it) => it.container && it.base === base && canHold(it, s.it));
    if (cands.length) { target = R.pick(cands); break; }
  }
  if (!target) {
    const cands = holdersFor(items, s.it, true);
    if (cands.length) target = R.pick(cands);
  }
  if (!target) target = swapInBase(R, items, boxBaseFor(s.it));
  if (!target) return false;
  target.loot = target.loot || [];
  target.loot.push(s.it);
  const tag = s.def.containerTag && s.def.containerTag[s.role];
  if (tag && BOX_LADDER.includes(target.base)) target.tag = tag;
  return true;
}

// ============ the locker itself ============
// two owners in one door: the first packs seventy percent of it, the second the rest
function blendedArch(a, b) {
  const ta = a.theme.reduce((s, p) => s + p[1], 0), tb = b.theme.reduce((s, p) => s + p[1], 0);
  return Object.assign({}, a, {
    theme: a.theme.map((p) => [p[0], p[1] / ta * 70]).concat(b.theme.map((p) => [p[0], p[1] / tb * 30])),
    themeCats: a.themeCats.concat(b.themeCats.filter((c) => !a.themeCats.includes(c))),
    junkShare: a.junkShare * 0.7 + b.junkShare * 0.3,
    allowDupes: a.allowDupes || b.allowDupes,
  });
}
function genLocker(R, num, legendsLeft, plan) {
  const trueArch = ARCHETYPES[plan.archId];
  const blend = plan.blendArch ? ARCHETYPES[plan.blendArch] : null;
  const arch = blend ? blendedArch(trueArch, blend) : trueArch;
  const used = {};
  const emptyFlex = plan.contract === 'emptyFlex';
  const town = plan.town || TOWNS.dustyFlats;
  const baseJunk = Math.min(0.85, (plan.contract === 'junkPile' ? Math.min(0.85, arch.junkShare + 0.3) : arch.junkShare)
    + townRule('junkBias', town));

  // -- set pieces to physically reserve --
  const setBigs = [];
  const setSmalls = [];
  const setPlaced = [];
  for (const sp of [plan.set, plan.spill]) {
    if (!sp) continue;
    const def = SETS[sp.setId];
    for (const role of sp.roles) {
      const rd = def.roles[role];
      const b = BASE_BY_ID[rd.base];
      const it = makeItem(rd.base, R, {
        setId: sp.setId, role, brand: sp.brand,
        brandLocked: def.brandLocked.includes(role),
      });
      const rec = { setId: sp.setId, role, brand: sp.brand[0], instanceId: sp.instanceId, trap: !!sp.trap };
      if (b.big) setBigs.push({ it, rec });
      else setSmalls.push({ it, role, def, rec });
    }
  }

  // hold one chair back to stack on the table, under a tarp so to speak
  let stackChair = null;
  const anchorEntry = setBigs.find((e) => e.it.set.role === 'anchor');
  if (anchorEntry) {
    const ci = setBigs.findIndex((e) => e.it.set.role === 'chair');
    if (ci >= 0 && R.chance(0.6)) stackChair = setBigs.splice(ci, 1)[0];
  }

  const reserved = [[], [], []];
  for (const e of setBigs) {
    const layer = e.it.set.role === 'anchor' ? (R.chance(0.7) ? 2 : 1) : R.i(0, 1);
    reserved[layer].push(e.it);
    used[e.it.base] = (used[e.it.base] || 0) + 1;
  }
  // -- an authored door: its pieces are reserved the way set pieces are --
  const story = plan.story ? LOCKER_STORIES[plan.story] : null;
  const storySmalls = [];
  if (story) {
    for (const [base, layer] of story.bigs) {
      const b = BASE_BY_ID[base];
      if (!b) continue;
      const it = makeItem(base, R);
      it.story = plan.story;
      if (story.tags && story.tags[base]) it.tag = story.tags[base];
      if (b.big) { reserved[layer].push(it); used[base] = (used[base] || 0) + 1; }
      else storySmalls.push(it);
    }
    for (const [base, name, note] of story.smalls) {
      const it = makeItem(base, R);
      if (name) { it.name = name; it.preName = null; it.hideBrand = false; }
      if (note) it.note = note;
      it.story = plan.story;
      storySmalls.push(it);
    }
  }

  const cols = plan.cols || LOCKER_COLS;
  const fillN = cols <= 5 ? [2, 3] : (cols >= 9 ? [5, 7] : [4, 6]);
  const items = [];
  for (let L = 0; L <= 2; L++) {
    // empty flex: the front row is dressed up, the back is a shrug
    const js = emptyFlex ? (L === 2 ? 0.05 : 0.9) : baseJunk;
    items.push(...packLayerR(R, arch, L, fillN[0], fillN[1], used, reserved[L], js, cols));
  }
  // safety net: re-home anything that could not fit its layer
  for (const e of setBigs) {
    if (!e.it._unplaced) continue;
    delete e.it._unplaced;
    const v = swapInBase(R, items, e.it.base);   // brutal but guaranteed
    if (v) {
      e.it.layer = v.layer; e.it.col = v.col; e.it.wCols = v.wCols;
      if (v.onUid) {
        e.it.onUid = v.onUid; e.it.liftPx = v.liftPx;
        const under = items.find((o) => o.uid === v.onUid);
        if (under) under.stackedUid = e.it.uid;
      }
      items[items.indexOf(v)] = e.it;
    } else { e.it.layer = 0; e.it.col = 0; items.push(e.it); }
  }
  for (const e of setBigs) setPlaced.push(e.rec);

  // -- honest tell: one theme item visible if the theme lives deeper --
  const isTheme = (it) => arch.themeCats.includes(it.cat);
  const deepTheme = items.some((it) => it.layer < 2 && isTheme(it));
  const frontTheme = items.some((it) => it.layer === 2 && isTheme(it));
  if (deepTheme && !frontTheme && !arch.sneaky) {
    const front = items.filter((it) => it.layer === 2 && !it.set && !it.stackedUid);
    if (front.length) {
      const victim = front[Math.floor(R.f() * front.length)];
      for (let tries = 0; tries < 6; tries++) {
        const candId = R.wpick(arch.theme);
        if ((used[candId] || 0) >= dupCap(candId, arch)) continue;
        const cand = makeItem(candId, R);
        if (cand.wCols <= victim.wCols) {
          used[candId] = (used[candId] || 0) + 1;
          used[victim.base] = Math.max(0, (used[victim.base] || 1) - 1);
          cand.layer = 2; cand.col = victim.col; cand.wCols = victim.wCols;
          items[items.indexOf(victim)] = cand;
          break;
        }
      }
    }
  }

  // -- lie pass: traps and sneaks sometimes wear the wrong flavor --
  let flavor = story ? story.flavor : R.pick(arch.flavor);
  let flavorLie = false;
  const flavor2 = blend ? R.pick(blend.flavor) : null;    // the second owner leaves a second line
  if (!story && (plan.contract === 'setTrap' || arch.sneaky) && R.chance(0.5)) {
    const boost = (town && town.archBoost) || {};
    const others = Object.keys(ARCHETYPES).filter((k) => k !== plan.archId && (ARCHETYPES[k].w > 0 || (boost[k] || 0) > 0));
    flavor = R.pick(ARCHETYPES[R.pick(others)].flavor);
    flavorLie = true;
  }

  // -- stacking --
  if (stackChair && anchorEntry) {
    const t = anchorEntry.it, c = stackChair.it;
    c.layer = t.layer; c.col = t.col; c.wCols = t.wCols;
    c.onUid = t.uid;
    c.liftPx = (SPRITES[t.spr] || SPRITES.mystery).h - 2;
    t.stackedUid = c.uid;
    items.push(c);
    setPlaced.push(stackChair.rec);
  }
  stackingPass(items, arch, R, used);

  // -- Marrow Creek dresses the front row: the good-looking things face the door, the junk hides --
  if (townRule('frontDressing', town) || plan.opening === 'trap') dressFront(items);
  // -- the opening's second morning: a dull front with the value behind it, so the bidders are the tell --
  if (plan.opening === 'dull') dullFront(items);
  // -- a junk pile packed by somebody in particular, some days: one person's things step in for the generic junk --
  let persona = null;
  // a letter you found promised this person's other unit today: it ignores the junk-pile
  // gate and the fortnight cooldown, because it was promised and a promise is kept
  const planted = plan.persona ? JUNK_PERSONAS.find((x) => x.id === plan.persona) : null;
  if (planted && !story && !plan.myth) {
    if (applyPersona(R, items, planted)) persona = planted;
  } else if (plan.contract === 'junkPile' && !story && !plan.myth && R.chance(0.4)) {
    const seen = plan.personasSeen || {};
    const fresh = JUNK_PERSONAS.filter((p) => !(seen[p.id] > (plan.day || 0) - 15));   // nobody packs two units a fortnight
    const p = R.pick(fresh.length ? fresh : JUNK_PERSONAS);
    if (applyPersona(R, items, p)) persona = p;
  }

  // -- containers: only some hold anything. Figures. --
  const containers = items.filter((it) => it.container);
  const filled = R.shuf(containers).slice(0, R.i(1, 3) + townRule('containerBoost', town));
  for (const it of containers) {
    if (emptyFlex) { it.loot = []; continue; }
    if (filled.includes(it)) fillContainer(it, blend && R.chance(0.3) ? blend : trueArch, R, town);
    else it.loot = it.loot || [];
  }

  // -- the sleeper: a junk unit with one good small thing in a bag. Salt Lick's whole lesson. --
  const sleeperRate = townRule('sleeperRate', town);
  if (sleeperRate > 0 && !plan.myth && !emptyFlex && (plan.contract === 'junkPile' || baseJunk >= 0.5) && R.chance(sleeperRate)) {
    const open = containers.filter((it) => !it.locked);
    const pref = open.filter((it) => ['garbage', 'box', 'crate', 'suitcase'].includes(it.base));
    const tgt = pref.length ? R.pick(pref) : (open.length ? R.pick(open) : null);
    if (tgt) {
      const s = makeItem(R.wpick(SLEEPER_POOL), R);
      s.val = Math.round(s.val * R.r(2.2, 3.4));
      s.sleeper = true;
      tgt.loot = tgt.loot || [];
      tgt.loot.push(s);
    }
  }

  // -- cash box: one strongbox is the real deal --
  if (plan.contract === 'cashBox') {
    let box = containers.find((it) => ['lockbox', 'till', 'strongbox', 'safe', 'floorSafe'].includes(it.base));
    if (!box) box = swapInBase(R, items, 'lockbox');
    if (box) {
      box.loot = box.loot || [];
      const n = R.i(2, 3);
      for (let i = 0; i < n; i++) box.loot.push(makeItem('cashWad', R));
      if (R.chance(0.3)) box.loot.push(makeItem('ring', R));
    }
  }

  // -- small set pieces slip into containers --
  for (const s of setSmalls) {
    if (placeSetSmall(R, s, items)) setPlaced.push(s.rec);
  }

  // -- story smalls and the story's one real object --
  const tuckInto = (it, prefs) => {
    let tgt = null;
    for (const b of (prefs || [])) {
      const c = items.filter((x) => x.container && x.base === b && canHold(x, it));
      if (c.length) { tgt = R.pick(c); break; }
    }
    if (!tgt) { const c = holdersFor(items, it, true); if (c.length) tgt = R.pick(c); }
    // nothing here is big enough: bring in a carton that is
    if (!tgt) { tgt = swapInBase(R, items, boxBaseFor(it)); if (tgt) containers.push(tgt); }
    if (!tgt) return false;
    tgt.loot = tgt.loot || [];
    tgt.loot.push(it);
    return true;
  };
  if (story) {
    for (const s of storySmalls) tuckInto(s, ['box', 'trunk', 'dresser', 'suitcase']);
    const p = story.payoff;
    const it = makeItem(p.base, R);
    it.name = p.name; it.preName = null; it.hideBrand = false;
    it.val = p.val; it.cond = 'Clean'; it.note = p.note; it.story = plan.story; it.storyPayoff = true;
    if (p.cat) it.cat = p.cat;
    tuckInto(it, p.into);
  }

  // -- an object with a past: the anchor, or the proof that names it --
  let provPlaced = false;
  if (plan.prov) {
    const c = PROVENANCE[plan.prov.id];
    if (plan.prov.kind === 'anchor') {
      const v = swapInBase(R, items, c.anchor.base);
      if (v) {
        v.name = v.cond + ' ' + c.anchor.name; v.preName = null; v.hideBrand = false;
        v.val = c.anchor.val; v.note = c.anchor.note; v.prov = { id: plan.prov.id, kind: 'anchor' };
        provPlaced = true;
      }
    } else {
      const it = makeItem(c.proof.base, R);
      it.name = c.proof.name; it.note = c.proof.note; it.val = 12; it.cond = 'Worn';
      it.prov = { id: plan.prov.id, kind: 'proof' };
      provPlaced = tuckInto(it, ['box', 'dresser', 'trunk', 'filing', 'suitcase']);
    }
  }

  // -- the key, or the lock it fits --
  if (plan.keyPlan) {
    if (plan.keyPlan.kind === 'key') {
      const k = makeItem('oddKey', R);
      k.keyId = plan.keyPlan.id; k.cond = 'Worn'; k.name = 'Worn Odd Key';
      k.note = 'A key to something. Not a padlock. Not a door. The bow is stamped with a number that matches nothing here.';
      tuckInto(k, ['box', 'dresser', 'filing', 'suitcase', 'trunk']);
    } else {
      let box = containers.find((it) => it.locked);
      if (!box) { box = swapInBase(R, items, 'lockbox'); if (box) containers.push(box); }
      if (box) {
        box.keyId = plan.keyPlan.id;
        box.loot = box.loot || [];
        box.loot.push(makeItem(R.wpick(SMALL_POOLS.rich), R), makeItem(R.wpick(SMALL_POOLS.rich), R), makeItem('cashWad', R));
        box.note = 'The lock is odd. Not a padlock. An old key lock, and the key is not here.';
      }
    }
  }

  // -- tools turn up as stained gear in filing cabinets and boxes --
  if (plan.ownedTools && !emptyFlex) {
    const TOOL_DROP_BASES = { flashlight: 'toolFlashlight', mirror: 'toolMirror', loupe: 'toolLoupe', metalDetector: 'toolDetector', catalog: 'toolCatalog', edNotes: 'toolNotes' };
    const cands = Object.keys(TOOL_DROP_BASES).filter((t) => !plan.ownedTools.includes(t) && (t !== 'edNotes' || (plan.day || 0) >= 5));
    if (cands.length && R.chance(0.055)) {
      const drop = makeItem(TOOL_DROP_BASES[R.pick(cands)], R);
      const pref = containers.filter((it) => ['filing', 'box', 'toolbox', 'crate'].includes(it.base) && !it.locked);
      const tgt = pref.length ? R.pick(pref) : containers.find((it) => !it.locked);
      if (tgt) { tgt.loot = tgt.loot || []; tgt.loot.push(drop); }
    }
  }

  // -- the myth slot: calendar-seeded, buried in a container you almost scrapped --
  let seededLegend = null;
  if (plan.myth) {
    const mythIt = makeItem(plan.myth.base, R);
    // a locked box first, then one that already holds something, then anything —
    // but it has to be a thing the myth would actually go inside
    let tgt = holdersFor(containers, mythIt).filter((it) => it.locked);
    if (!tgt.length) tgt = holdersFor(containers, mythIt).filter((it) => it.loot && it.loot.length);
    if (!tgt.length) tgt = holdersFor(containers, mythIt);
    let home = tgt.length ? R.pick(tgt) : swapInBase(R, items, 'trunk');
    if (home) {
      home.loot = home.loot || [];
      home.loot.push(mythIt);
      if (plan.myth.real) seededLegend = mythIt;
    }
  }

  // -- the thing in the photograph: layer 0, the dark, where daylight is the price --
  let photoIt = null;
  if (plan.photoBase && BASE_BY_ID[plan.photoBase]) {
    photoIt = makeItem(plan.photoBase, R);
    const back = items.filter((o) => o.layer === 0 && !o.set && !o.container && !o.cash && !o.onUid && !o.stackedUid && !o.legendary);
    if (back.length) {
      const v = R.pick(back);
      photoIt.layer = 0; photoIt.col = v.col; photoIt.wCols = Math.min(photoIt.wCols, v.wCols);
      items[items.indexOf(v)] = photoIt;
    } else {
      // nothing at the back to step aside: it goes in anyway, at the back, in its own column
      photoIt.layer = 0; photoIt.col = R.i(0, Math.max(0, cols - 1)); photoIt.wCols = 1;
      items.push(photoIt);
    }
  }

  // -- the thing on the certificate: it wears the maker's mark the paper vouched for, or lied about --
  let certIt = null;
  if (plan.certBase && BASE_BY_ID[plan.certBase]) {
    certIt = makeItem(plan.certBase, R);
    certIt.paperwork = true;                         // a later swap-in must not overwrite the thing the paper promised
    const bb = BASE_BY_ID[plan.certBase];
    const br = (bb.brands || []).slice().sort((p, q) => q[1] - p[1])[0];
    if (br) {
      certIt.val = Math.max(1, Math.round(certIt.val / (certIt.brandM || 1) * br[1]));
      certIt.brandM = Math.round(br[1] * 100) / 100;
      certIt.name = (certIt.cond ? certIt.cond + ' ' : '') + br[0] + ' ' + bb.name;
      if (certIt.hideBrand) certIt.preName = (certIt.cond ? certIt.cond + ' ' : '') + bb.name;
      if (br[2]) certIt.pal = br[2];
    }
    const mid = items.filter((o) => o.layer === 1 && !o.set && !o.container && !o.cash && !o.onUid && !o.stackedUid && !o.legendary);
    const pool = mid.length ? mid : items.filter((o) => !o.set && !o.container && !o.cash && !o.onUid && !o.stackedUid && !o.legendary);
    if (pool.length) {
      const v = R.pick(pool);
      certIt.layer = v.layer; certIt.col = v.col; certIt.wCols = Math.min(certIt.wCols, v.wCols);
      items[items.indexOf(v)] = certIt;
    } else { certIt.layer = 1; certIt.col = R.i(0, Math.max(0, cols - 1)); certIt.wCols = 1; items.push(certIt); }
  }

  // -- paper: worth nothing, and the only thing here that pays tomorrow (ephemera.js) --
  if (!emptyFlex && !plan.opening) rollPaper(R, containers, town);

  // -- named junk that should not exist (rare, never on a myth day) --
  if (!plan.myth && !emptyFlex && R.chance(townRule('namedJunkRate', town))) {
    const nj = R.pick(NAMED_JUNK);
    const it = makeItem(nj.base, R);
    it.name = nj.name;
    it.preName = null; it.hideBrand = false;
    it.cond = nj.cond;
    it.val = Math.round(nj.val * R.r(0.9, 1.1));
    it.named = true;
    if (nj.blurb) it.blurb = nj.blurb;
    // it has to fit. A cabinet goes in a carton that size or it stands on the floor
    // like anything else that big — the same branch the lux junk below has always had.
    const open = holdersFor(containers, it, true);
    const tgt = open.length ? R.pick(open) : null;
    if (tgt) { tgt.loot = tgt.loot || []; tgt.loot.push(it); }
    else {
      const v = swapInBase(R, items.filter((o) => o.layer === 2 && !o.set && !o.stackedUid && !o.onUid), nj.base) || swapInBase(R, items, nj.base);
      if (v) {
        it.layer = v.layer; it.col = v.col; it.wCols = v.wCols;
        if (v.onUid) { it.onUid = v.onUid; it.liftPx = v.liftPx; const under = items.find((o) => o.uid === v.onUid); if (under) under.stackedUid = it.uid; }
        if (v.stackedUid) { const over = items.find((o) => o.uid === v.stackedUid); if (over) over.onUid = it.uid; it.stackedUid = v.stackedUid; }
        items[items.indexOf(v)] = it;
      }
    }
  }

  // -- luxury junk (Chrome Springs): one flashy thing that is worth nothing, up front where it shines --
  const luxRate = townRule('luxJunkRate', town);
  if (luxRate > 0 && !plan.myth && !emptyFlex && R.chance(luxRate)) {
    const lj = R.pick(LUX_JUNK);
    const it = makeItem(lj.base, R);
    it.name = lj.name; it.preName = null; it.hideBrand = false;
    it.val = lj.val; it.cond = 'Clean'; it.lux = lj.tag;
    it.fakeEst = [Math.round(lj.est[0] * (plan.priceMult || 1) / 100) * 100, Math.round(lj.est[1] * (plan.priceMult || 1) / 100) * 100];
    if (BASE_BY_ID[lj.base].big) {
      const v = swapInBase(R, items.filter((o) => o.layer === 2 && !o.set && !o.stackedUid && !o.onUid), lj.base) || swapInBase(R, items, lj.base);
      if (v) {
        it.layer = v.layer; it.col = v.col; it.wCols = v.wCols;
        if (v.onUid) { it.onUid = v.onUid; it.liftPx = v.liftPx; const under = items.find((o) => o.uid === v.onUid); if (under) under.stackedUid = it.uid; }
        if (v.stackedUid) { const over = items.find((o) => o.uid === v.stackedUid); if (over) over.onUid = it.uid; it.stackedUid = v.stackedUid; }
        items[items.indexOf(v)] = it;
      }
    } else {
      const open = holdersFor(containers.filter((c) => c.loot), it, true);
      const any = open.length ? open : holdersFor(containers, it, true);
      const tgt = any.length ? R.pick(any) : null;
      if (tgt) { tgt.loot = tgt.loot || []; tgt.loot.push(it); }
      else { const v = swapInBase(R, items, lj.base); if (v) { it.layer = v.layer; it.col = v.col; it.wCols = v.wCols; items[items.indexOf(v)] = it; } }
    }
  }

  // -- value pass: archetype and town multipliers, then clamp to the day's economy --
  const vMult = arch.valueMult * (plan.priceMult || 1);
  for (const it of items) {
    if (!it.cash) it.val = Math.round(it.val * vMult);
    if (it.loot) for (const l of it.loot) { if (!l.cash) l.val = Math.round(l.val * vMult); }
  }
  const sumValue = () => {
    let v = 0;
    for (const it of items) { v += it.val; if (it.loot) for (const l of it.loot) v += l.val; }
    return v;
  };
  let value = sumValue();
  if (plan.dayCap && value > plan.dayCap && plan.contract !== 'mythHole') {
    // cash and a legend keep their number no matter what, so the whole reduction has to
    // come out of everything else. Scaling the entire sum instead leaves the door over
    // the cap by however much cash is buried in it — which is what used to happen.
    let fixed = 0;
    for (const it of items) {
      if (it.cash || it.legendary) fixed += it.val;
      if (it.loot) for (const l of it.loot) if (l.cash || l.legendary) fixed += l.val;
    }
    const rest = value - fixed;
    const sc = rest > 0 ? Math.max(0.05, (plan.dayCap - fixed) / rest) : 1;
    for (const it of items) {
      if (!it.legendary && !it.cash) it.val = Math.max(1, Math.round(it.val * sc));
      if (it.loot) for (const l of it.loot) { if (!l.legendary && !l.cash) l.val = Math.max(1, Math.round(l.val * sc)); }
    }
    value = sumValue();
  }
  // honest unit: the door does not undersell — someone broke can eat today
  if (plan.honest) {
    const fronts = items.filter((it) => it.layer === 2 && !it.cash && !it.set);
    if (fronts.length) {
      const best = fronts.reduce((a, b) => (a.val > b.val ? a : b));
      if (best.val < 140) { best.val = R.i(140, 190); value = sumValue(); }
    }
  }

  // -- the opening's dealt doors are priced to teach, not rolled --
  const looseOf = (it) => !it.set && !it.cash && !it.container && !it.onUid;
  if (plan.opening === 'dull') {
    // the second morning: nothing worth a look up front (the dresser included; what it holds stays hidden),
    // and enough in the dark that Ed reads it warm or hot whatever the door shows
    for (const it of items) if (it.layer === 2 && !it.set && !it.cash && it.val > 30) it.val = R.i(8, 30);
    value = sumValue();
    let vis = 0;
    for (const it of items) if (it.layer === 2) vis += it.val;
    const need = Math.max(900, Math.ceil(vis * 4.2));
    const back = items.filter((it) => it.layer < 2 && looseOf(it));
    if (value < need && back.length) { const b = back.reduce((a, c) => (c.val > a.val ? c : a)); b.val += need - value + R.i(60, 220); value = sumValue(); }
  }
  if (plan.opening === 'trap') {
    // the fourth morning: a good front row and air behind it (the empty dressers included)
    for (const it of items) if (it.layer < 2 && !it.set && !it.cash && it.val > 25) it.val = R.i(5, 25);
    value = sumValue();
  }
  // -- the opening's fifth morning: one real thing, loose, in the dark at the back. This is why you dig. --
  if (plan.opening === 'epic') {
    const victims = items.filter((it) => it.layer === 0 && !it.set && !it.container && !it.onUid && !it.stackedUid && !it.cash);
    const e = makeItem(R.wpick(SLEEPER_POOL), R);
    e.val = R.i(850, 1250);
    e.layer = 0; e.wCols = 1;
    if (victims.length) { const v = R.pick(victims); e.col = v.col; items[items.indexOf(v)] = e; }
    else { e.col = R.i(0, cols - 1); items.push(e); }
    value = sumValue();
    // this morning exists to teach, so it cannot be left to the dice: Ed has to read
    // the find door warm or hot (`edTier` wants hidden-to-visible past 3.2), and the
    // front row gets quieter until he does
    const visOf = () => { let v = 0; for (const it of items) if (it.layer === 2) v += it.val; return v; };
    for (let guard = 0; guard < 10 && value / Math.max(20, visOf()) <= 3.4; guard++) {
      const fronts = items.filter((it) => it.layer === 2 && !it.set && !it.cash && it.val > 6);
      if (!fronts.length) break;
      const loudest = fronts.reduce((a, b) => (a.val > b.val ? a : b));
      loudest.val = Math.max(5, Math.round(loudest.val * 0.5));
      value = sumValue();
    }
  }
  // what the door showed that gave the owner away, for the appraiser to mention later (never for a mixed owner or an authored door)
  const tellIt = items.filter((it) => it.layer === 2 && !it.set && !it.cash && isTheme(it)).sort((a, b) => b.val - a.val)[0];
  const doorTell = (!blend && !story && tellIt) ? BASE_BY_ID[tellIt.base].name.toLowerCase() : null;

  // set peek flavor: the door can show a table and a feeling, never a name
  let setPeek = null;
  const sp0 = plan.set;
  if (sp0) {
    const anchorIt = items.find((it) => it.set && it.set.id === sp0.setId && it.set.role === 'anchor' && it.layer === 2);
    if (anchorIt) setPeek = R.pick(SETS[sp0.setId].peekFlavor);
  }

  const step = plan.bidStep || 25;
  const sizeFactor = (cols <= 5 ? 0.6 : (cols >= 9 ? 1.4 : 1)) * townRule('minBidMult', town);
  return {
    num,
    archId: plan.archId,
    blendId: plan.blendArch || null,
    flavor2,
    contract: plan.contract,
    cols,
    sizeLabel: cols <= 5 ? '5x5' : (cols >= 9 ? '10x20' : '10x10'),
    items,
    flavor,
    flavorLie,
    setPeek,
    setPlaced,
    honest: !!plan.honest,
    opening: plan.opening || null,
    doorTell,
    story: plan.story || null,
    provPlant: plan.prov && provPlaced ? plan.prov.id + ':' + plan.prov.kind : null,
    owner: story ? story.owner : (persona ? persona.owner : R.pick(OWNER_LINES)),
    persona: persona ? persona.id : null,
    letterName: (plan.persona && persona && persona.id === plan.persona && persona.name) || null,   // the name on the paperwork you already have
    photoBase: photoIt ? plan.photoBase : null,      // you have a picture of this room, and of what is at the back of it
    certBase: certIt ? plan.certBase : null,         // you have paperwork on one thing in here
    value,
    seededLegend: seededLegend ? seededLegend.base : null,
    sold: false,
    won: false,
    minBid: Math.max(step, Math.round(step * R.i(2, 5) * sizeFactor / step) * step),
  };
}

// ---- rival bidders ----
// press: reluctant raises past their own number when a human is winning —
// pride, not math. Ed has no press. Ed has a notebook.
const NPCS = [
  { id: 'bart', name: 'Big Bart', tag: 'deep pockets',
    intro: "Aaand look who it is — Big Bart, folks. Deep pockets, deeper patience. Good luck outbiddin' that wallet.",
    noise: [0.75, 1.3], capMult: 0.55, press: 2, raise: [50, 100], joinChance: 0.85, budget: 3200,
    voiceGain: 1.1,                       // his takes came in quiet: +10% on every npc_bart_* and cm_bart_* line
    // Bart buys with his eyes: an impressive door is worth more to him than what is behind it
    est: (lk) => lk.value * 0.6 + visibleValue(lk) * 1.6,
    lines: { raise: ["Bart tips his hat and raises.", '"Pocket change."', 'Bart waves a fat money clip.',
                     '"Add a zero, I don\'t care."', 'Bart checks his gold watch. Raise.', '"My accountant needs a hobby."',
                     '"Keep up, small-timers."', 'Bart yawns and doubles down.', '"I\'ve tipped more than that."'],
             fold: ['"Not worth my gas money." Bart folds.', 'Bart shrugs and steps back.', '"Y\'all fight over the scraps."',
                    '"Even I have standards. Barely."', 'Bart checks his phone. He\'s done.', '"Beneath me. Next unit."'],
             win:  ['Bart buys another one like it\'s groceries.', '"Wrap it up." Bart wins again.',
                    '"Put it with the others." Bart wins.', 'Bart wins without breaking eye contact with his sandwich.',
                    '"That\'s a rounding error to me."'] } },
  { id: 'sal', name: 'Spite Sal', tag: 'bids YOU up',
    intro: "Spite Sal's in the house, folks! He don't even want it — he just wants YOU to pay for it.",
    noise: [0.5, 1.4], capMult: 0.34, press: 1, spiteMult: 0.55, raise: [25, 50], joinChance: 0.8, budget: 1300,
    voiceGain: 1.2,   // his recorded take came in quiet; bump it 20% rather than re-record or hand-edit the file
    lines: { raise: ['Sal grins at you and raises.', '"You want it? Pay for it."', 'Sal bids without even looking.',
                     '"Oops, my hand went up."', 'Sal stares directly at YOU and bids.', '"I don\'t even want it. Raise."',
                     '"This is fun for me."', 'Sal raises out of pure principle.', '"Your face made me do it."'],
             fold: ['Sal mutters something and quits.', 'Sal kicks a rock and folds.', '"Fine. FINE."',
                    'Sal folds and blames the sun.', '"I hope it\'s full of spiders."', 'Sal walks off mid-sentence.'],
             win:  ['Sal wins it. He looks miserable already.', 'Sal wins and immediately regrets it.',
                    '"Great. Now I have to haul it." Sal wins.', 'Sal wins, purely to spite everyone.',
                    'Sal wins and glares at his own wallet.'] } },
  { id: 'ed', name: 'Eagle Ed', tag: 'sharp eyes',
    intro: "Eagle Ed's got the notebook out, folks. When Ed's hand goes up, the math already checked out.",
    noise: [0.92, 1.08], capMult: 0.46, press: 0, raise: [25, 50], joinChance: 0.75, budget: 2200,
    lines: { raise: ['Ed adjusts his glasses. Raise.', 'Ed nods slowly and bids.', '"Mm. I\'ll go up."',
                     'Ed circles something in his notebook. Bid.', '"The math still works."', 'Ed raises without looking up.',
                     '"Margin\'s still there."', 'Ed taps his pencil twice. That\'s a bid.', '"I counted the boxes. Raise."'],
             fold: ['Ed checks his notebook and passes.', '"Not for me." Ed folds.', 'Ed underlines something and steps back.',
                    '"Past the number." Ed is out.', 'Ed closes the notebook. Done.', '"You\'re overpaying. Enjoy."'],
             win:  ['Ed collects his prize with a tiny smile.', '"As calculated." Ed wins.',
                    'Ed wins and writes down the exact time.', '"Within budget." A rare Ed smile.',
                    'Ed wins. The notebook approves.'] } },
  { id: 'dutch', name: 'Yiip Dutch', tag: 'you can hear him coming',
    intro: "You don't see Dutch comin', folks, you HEAR him comin'. Give it up for Yiip Dutch!",
    noise: [0.7, 1.2], capMult: 0.5, press: 1, raise: [25, 50], joinChance: 0.55, budget: 2000,
    // the yip is the signature, but he's not just noise: he wants YOU paying more than it's worth,
    // and he'll tell you so. Dismissive on the way out, insufferable on the way to the van.
    lines: { raise: ['"YIIIP!"', '"YIIIP!" Dutch doesn\'t blink.', 'Dutch points at the sky. "Yiip."',
                     '"YIIIP." He says it like punctuation.', 'From three rows away: "YIIIP!"',
                     '"Yiiiiiiip." That one had extra I\'s.', 'Dutch cups his hands: "YIIIP!"',
                     'A distant echo answers Dutch\'s "YIIIP!"', 'Dutch bids with both eyebrows and one "YIP."',
                     '"Keep goin\'. I got all day." Yip.', '"That\'s not even my money you\'re chasin\'." Yip.',
                     'Dutch smirks. "Dig deeper." Yip.', '"Y\'all are gonna thank me for this later." Yip.'],
             fold: ['Dutch goes quiet. Unsettling.', '"...nope." Dutch is out.', 'Dutch shakes his head. First time for everything.',
                    'Dutch whispers "yip" but means no.', 'Dutch saves his voice for the next one.',
                    'No yip. The crowd is worried about him.',
                    '"Nah. Not worth that junk." Dutch backs off.', '"You can have it." Dutch waves it off, unbothered.',
                    'Dutch looks at the number and shrugs. "Yip means no, too."'],
             win:  ['"YIIIP!" Dutch takes it.', 'Dutch wins it with one syllable.',
                    'The winning "YIIIP!" sets a personal record.', 'Dutch wins and high-fives a stranger.',
                    '"YIP." Efficient. Devastating. His.',
                    '"That\'s how it\'s done, folks." Dutch, king of this yard, wins.',
                    '"Yip. I win. Try to act surprised." Dutch takes it.', 'Dutch doesn\'t celebrate. He never has to.',
                    '"Yip. Load it up." Dutch is already walking to the van.', '"That\'s a yip." Flat. Satisfied. His.'] } },
  // one paddle, two people, zero agreement. They fold in halves and come back in halves.
  { id: 'duo', name: 'Cody & Kaylee', tag: 'one bidder. two opinions.',
    intro: "Cody and Kaylee are back, folks — one paddle, two opinions. Let's see who's holdin' it today.",
    noise: [0.7, 1.25], capMult: 0.5, press: 2, raise: [25, 50], joinChance: 0.7, budget: 2000,
    // Cody sees tools, Kaylee sees the little boxes. When both have a reason, nobody backs down.
    est: (lk) => {
      let m = 1;
      if (catShare(lk, ['tools', 'electronics']) >= 0.4) m += 0.2;
      if (catShare(lk, ['jewelry', 'collectibles', 'antiques']) >= 0.35) m += 0.2;
      return lk.value * m;
    },
    lines: { raise: ['"Bid." "I AM bidding." Kaylee raises.', 'Cody raises. Kaylee sighs. Loudly.',
                     '"We talked about this." "We did NOT." Raise.', 'Kaylee bids without looking at him.',
                     '"Fine. FINE." Cody\'s hand goes up.', 'They both raise at once. It counts once.',
                     '"Babe. BABE." A bid, somehow.', 'Kaylee: "Go." Cody: "I\'m going." Bid.',
                     '"It\'s for the shop." "It\'s for YOU." Raise.'],
             fold: ['"That\'s it, we\'re done." Cody folds. Kaylee does not agree.', 'Kaylee walks off. Cody stays. Nobody bids.',
                    '"Told you." "You did NOT tell me." They\'re out.', 'They fold, in two different directions.',
                    'Cody checks the joint account. Fold.', '"We are NOT overpaying again." Out.'],
             rejoin: ['Kaylee grabs his arm. "We are NOT losing this." They\'re back.', 'Cody turns around. "One more." Kaylee already has the paddle up.',
                      '"I changed my mind." "You don\'t GET to—" Back in.', 'They come back, mid-argument, paddle first.'],
             win:  ['They win it. The celebration turns into a discussion.', '"See?!" "See WHAT?" They win.',
                    'Cody wins it. Kaylee takes the paddle away.', 'They win, and immediately argue about who carries it.',
                    '"We did it." "I did it." Sold to the couple.'] } },
];

// buyer one-liners shown as a toast when you sell to them
const BUYER_QUIPS = {
  pete:  ['"No questions asked."', '"Cash. Gone. Next."', '"I\'ve seen worse. Barely."',
          '"Everything\'s worth somethin\'."', '"Don\'t tell me where it\'s from."', '"Pleasure doin\' whatever this was."'],
  alice: ['"Oh, LOVELY."', '"This belongs in a better home. Mine."', '"Exquisite. Ish."',
          '"My clients will fight over this."', '"You have an eye, dear."', '"Wrap it in tissue, please."'],
  randy: ['"Siiick."', '"This goes on the wall."', '"Dude. DUDE."',
          '"You know what this is?? You don\'t. It\'s rad."', '"The tour van needs this."', '"Cash for culture, my friend."'],
  gina:  ['"Now THAT works."', '"Solid piece of kit."', '"I can fix the rest."',
          '"Torque\'s still good. Deal."', '"Plug it in and she purrs."', '"You found this in a LOCKER?"'],
  carl:  ['"...thank you." (too long a pause)', '"It SPEAKS to me."', '"The collection grows."',
          '"I have just the shelf for this."', '"Yes. Yesss."', '"Do not ask what it\'s for."'],
};

// per-town named faces — about two per town, authored, never generated
const EXTRA_NPCS = {
  vera: { id: 'vera', name: 'Velvet Vera', tag: 'flips to city buyers',
    intro: "Velvet Vera just rolled in, folks. She's not buyin' it for herself — she's buyin' it for the city, and the city pays double.",
    noise: [0.85, 1.15], capMult: 0.55, press: 1, raise: [50, 100], joinChance: 0.7, budget: 2600,
    lines: { raise: ['Vera raises without smudging her lipstick.', '"The city will pay double. Raise."',
                     'Vera checks a little gold notebook. Up.', '"Darling, I was bidding before you parked."',
                     '"Mm. Mine."', 'Vera lifts two lacquered fingers.'],
             fold: ['"Not for my clientele." Vera is done.', 'Vera examines her nails. Out.',
                    '"Let the locals have it."', 'Vera folds like it was her idea all along.'],
             win:  ['"Wrap it. The city is waiting." Vera wins.', 'Vera wins and tips the auctioneer.',
                    '"Exactly as appraised." Vera collects.'] } },
  tuck: { id: 'tuck', name: 'Taciturn Tuck', tag: 'nods. wins. leaves.',
    intro: "Taciturn Tuck's here, folks. He won't say much. He don't need to.",
    noise: [0.8, 1.1], capMult: 0.48, press: 1, raise: [50, 50], joinChance: 0.6, budget: 1900,
    lines: { raise: ['Tuck nods.', 'A single nod.', 'Tuck lifts one finger.', 'Tuck adjusts his hat. That counts.',
                     'The nod again.'],
             fold: ['Tuck looks at the horizon.', 'Tuck is already walking away.', 'No nod. Nothing.'],
             win:  ['Tuck nods once more and pays cash.', 'Tuck wins. Total words spoken: zero.'] } },
  // ---- Salt Lick: two people who price a unit by something other than what it is ----
  // Bev only sees the boxes. Her number IS what the containers hold, so when she
  // pushes on an ugly door, the bags are full; when she folds early, they are air.
  bev: { id: 'bev', name: 'Boxcar Bev', tag: 'only looks at the boxes',
    intro: "Boxcar Bev's in the crowd, folks, and she is not lookin' at your furniture. She is lookin' at your boxes.",
    noise: [0.8, 1.2], capMult: 0.6, press: 1, raise: [25, 50], joinChance: 0.75, budget: 1100,
    est: (lk) => {
      let boxes = 0, rest = 0;
      for (const it of lk.items) {
        if (it.container) { boxes += it.val; if (it.loot) for (const l of it.loot) boxes += l.val; }
        else rest += it.val;
      }
      return boxes * 1.5 + rest * 0.15;
    },
    lines: { raise: ['"Boxes. I want the boxes."', 'Bev counts the cardboard again. Raise.', '"Never mind the couch."',
                     'Bev taps a box with her toe from the door. Bid.', '"The tape\'s new on that one. Up."',
                     'Bev raises without looking above knee height.', '"Somebody packed those careful."',
                     '"Keep the furniture. I\'ll take the rest."', 'Bev lifts her clipboard. That counts.'],
             fold: ['"Empty. I can hear it." Bev is out.', 'Bev shakes her head at a box. Done.',
                    '"Nothing in \'em. Enjoy the couch."', 'Bev is already eyeing the next door\'s boxes.',
                    '"Taped once, never opened. Nope."', '"Boxes are for show. Pass."'],
             win:  ['Bev wins it and goes straight for the boxes.', '"Mine. The boxes, I mean." Bev wins.',
                    'Bev wins and opens the first box before she\'s paid.', '"Told you. Careful packers." Bev collects.',
                    'Bev wins and ignores the furniture entirely.'] } },
  // Pruitt buys by the pound. Heavy doors excite him, light ones bore him, and
  // what a unit is worth never enters into it. His enthusiasm is a scale.
  pruitt: { id: 'pruitt', name: 'By-the-Pound Pruitt', tag: 'bids by weight',
    intro: "By-the-Pound Pruitt just backed his truck up. He don't care what's in there, folks — he cares what it weighs.",
    noise: [0.9, 1.1], capMult: 0.5, press: 2, raise: [25, 25], joinChance: 0.7, budget: 900,
    estRaw: true,                 // dollars per pound, not item values: scaled for the town at the auction
    est: (lk) => {
      let bulk = 0;
      for (const it of lk.items) { bulk += it.size; if (it.loot) for (const l of it.loot) bulk += l.size; }
      return bulk * PRUITT_PER_BULK;
    },
    lines: { raise: ['"That\'s a heavy door." Pruitt raises.', 'Pruitt sniffs. "Iron in there." Up.',
                     '"By the pound, it\'s a deal."', 'Pruitt slaps the truck bed. Bid.',
                     '"I don\'t care what it is. I care what it weighs."', 'Pruitt raises a finger. The scale tattoo one.',
                     '"Scrap don\'t lie." Raise.', '"My springs can take it."',
                     'Pruitt bids and checks the tires on his own truck.'],
             fold: ['"Too light. Pass." Pruitt is out.', 'Pruitt kicks the door frame. "Hollow." Done.',
                    '"Nothing in there worth the diesel."', 'Pruitt folds and studies the next unit\'s floor for drag marks.',
                    '"Paper and pillows. No."', 'Pruitt spits. That means no.'],
             win:  ['Pruitt wins and backs the truck up before the gavel lands.', '"Weigh it out." Pruitt wins.',
                    'Pruitt wins it by the pound.', '"Heavy\'s happy." Pruitt collects.',
                    'Pruitt wins and starts loading with his shoulders.'] } },
  // ---- Gypsum City: one believes the paper, one refuses to. The truth is on the doors. ----
  // Hattie bids the printed number. Whatever unit the Correction names, she wants;
  // whatever it does not name, she barely sees. She is a decoy that thinks it is a reader.
  hattie: { id: 'hattie', name: 'Headline Hattie', tag: 'bids whatever the paper printed',
    intro: "Headline Hattie's got the paper folded to page one, folks. If it was in print, she is in.",
    noise: [0.85, 1.15], capMult: 0.55, press: 1, raise: [50, 100], joinChance: 0.8, budget: 2000,
    est: (lk) => paperNamedUnits().includes(lk.num) ? lk.value * 1.6 : lk.value * 0.5,
    lines: { raise: ['"It was in the PAPER." Hattie raises.', 'Hattie taps the headline with a fingernail. Bid.',
                     '"Page one. Column one. Up."', 'Hattie reads the unit number off the clipping. Raise.',
                     '"I don\'t guess. I READ."', 'Hattie bids without lowering the newspaper.',
                     '"They wouldn\'t print it if it wasn\'t so."', 'Hattie underlines something and raises.',
                     '"The editor and I go to the same church."'],
             fold: ['"Not in the paper. Not for me." Hattie is out.', 'Hattie folds the paper, and then herself.',
                    '"Wrong unit, dear."', 'Hattie checks the clipping again. Passes.',
                    '"The story said EIGHTEEN."', 'Hattie is already reading tomorrow\'s edition. Somehow.'],
             win:  ['"As printed." Hattie wins.', 'Hattie wins and asks the clerk for a copy of the paper. For the file.',
                    'Hattie wins it. She will frame the clipping.', '"Told you. Page one." Hattie collects.',
                    'Hattie wins and reads the story aloud to the door.'] } },
  // Delgado has been burned. He bids the doors the paper did NOT name, on principle,
  // and pointedly ignores the one it did. On the days the paper is right, he is wrong.
  delgado: { id: 'delgado', name: 'Two-Doors Delgado', tag: 'bids whatever the paper skipped',
    intro: "Two-Doors Delgado's here, folks, and he is bidding on whatever that paper did NOT tell you about.",
    noise: [0.85, 1.15], capMult: 0.5, press: 1, raise: [50, 50], joinChance: 0.75, budget: 1800,
    est: (lk) => paperNamedUnits().includes(lk.num) ? lk.value * 0.45 : lk.value * 1.3,
    lines: { raise: ['"Not in the paper. Good." Delgado raises.', 'Delgado bids with the paper under his boot.',
                     '"They never print the right one."', 'Delgado raises and does not look at the clipping.',
                     '"Fool me twice." Up.', 'Delgado lifts two fingers. Two doors. Raise.',
                     '"The number\'s a decoy. Always is."', 'Delgado bids like a man settling a grudge.',
                     '"Read between the doors."'],
             fold: ['"That\'s the one they printed. No." Delgado is out.', 'Delgado folds and glares at the newsstand.',
                    '"Paper door. Somebody else\'s problem."', 'Delgado walks. On principle.',
                    '"I got fooled by that rag once."', 'Delgado shakes his head at the whole row.'],
             win:  ['"See? Not the one they printed." Delgado wins.', 'Delgado wins and tears the front page in half.',
                    'Delgado wins the door nobody wrote about.', '"Two doors down. Every time." Delgado collects.',
                    'Delgado wins and buys the editor a coffee. Slowly.'] } },
  // ---- Bent Fork: one bids under the Reverend, one under Ray, and each knows one kind of thing ----
  // Dee knows wood. Her number is the furniture and the antiques, wherever they
  // sit, and she only comes out when the Reverend has the gavel.
  dee: { id: 'dee', name: 'Sister Dee', tag: 'knows furniture. only bids under the Reverend',
    intro: "Sister Dee's in the room, folks. She knows her wood, and she is only bidding today because the Reverend's got the gavel.",
    noise: [0.85, 1.15], capMult: 0.55, press: 1, raise: [50, 50], joinChance: 0.5, budget: 2200,
    under: { lyle: 0.9, ray: 0.12 },
    est: (lk) => catSplitValue(lk, ['furniture', 'antiques'], 1.4, 0.35),
    lines: { raise: ['Dee touches the doorframe like a pew. Raise.', '"That\'s walnut. I can smell walnut."',
                     '"The Reverend would want me to." Up.', 'Dee bids with a small nod to the pulpit.',
                     '"Somebody loved that dresser."', 'Dee raises and folds her hands.',
                     '"Dovetails. Real ones." Bid.', '"Grain like that doesn\'t lie."',
                     'Dee bids like she is tithing.'],
             fold: ['"Particleboard." Dee is out.', 'Dee shakes her head at the furniture. Done.',
                    '"Nothing in there with a soul."', 'Dee folds and hums a hymn.',
                    '"Not under this gavel. Not for me."', '"The wood says no."'],
             win:  ['Dee wins and thanks the Reverend, not the auctioneer.', '"It\'s going to a good home." Dee wins.',
                    'Dee wins and lays a hand on the dresser.', '"Bless it." Dee collects.',
                    'Dee wins, quietly, the way she does everything.'] } },
  // Cobb knows tools and anything with a cord. He is Ray's man: fast money, fast hands,
  // and no interest in a room that takes its time.
  cobb: { id: 'cobb', name: 'Slim Cobb', tag: 'knows tools. only bids under Ray',
    intro: "Slim Cobb's here for anything with a cord on it, folks. Fast hands, fast money, no patience for doilies.",
    noise: [0.85, 1.15], capMult: 0.55, press: 2, raise: [50, 100], joinChance: 0.5, budget: 2000,
    under: { ray: 0.9, lyle: 0.12 },
    est: (lk) => catSplitValue(lk, ['tools', 'electronics'], 1.4, 0.35),
    lines: { raise: ['"Compressor. Back left." Cobb raises.', 'Cobb bids before Ray finishes the number.',
                     '"Cords. I see cords." Up.', 'Cobb snaps his fingers. That\'s a bid.',
                     '"That drill\'s got a battery in it."', '"Keep it moving, Ray." Raise.',
                     'Cobb raises with a grease-black thumb.', '"Iron in there. Good iron."',
                     '"I don\'t sit through sermons. Raise."'],
             fold: ['"Doilies. No." Cobb is out.', 'Cobb checks his watch. Done.',
                    '"Nothing in there that plugs in."', 'Cobb folds and heads for the truck.',
                    '"Too slow. Too soft. Pass."', '"Sell it to the church lady."'],
             win:  ['"Sold. Next." Cobb wins.', 'Cobb wins and is already loading the compressor.',
                    'Cobb wins it in the time it takes Ray to inhale.', '"Fast money." Cobb collects.',
                    'Cobb wins and does not look back.'] } },
  // ---- Marrow Creek: one man cannot price anything weird, one woman prices nothing else ----
  // Ferrell wants a normal unit and this is the wrong town for it. His number is the
  // ordinary goods; the weird ones might as well be air. When Ferrell pushes here,
  // the unit is secretly normal.
  ferrell: { id: 'ferrell', name: 'Cousin Ferrell', tag: "can't price anything weird",
    intro: "Cousin Ferrell just walked in hopin' for a normal dresser, folks. Bless his heart. Wrong town.",
    noise: [0.85, 1.15], capMult: 0.55, press: 1, raise: [50, 50], joinChance: 0.75, budget: 1900,
    est: (lk) => catSplitValue(lk, ['weird'], 0.15, 1.0),
    lines: { raise: ['"Finally. A dresser." Ferrell raises.', 'Ferrell bids and does not look at the mannequin.',
                     '"Normal stuff. Thank God." Up.', 'Ferrell raises with his eyes closed. It helps.',
                     '"I can sell a couch. I can\'t sell... that."', 'Ferrell bids on the parts he understands.',
                     '"Nothing in there is looking at me. Raise."', '"Regular people lived here. Once."',
                     'Ferrell raises and keeps his back to the jars.'],
             fold: ['"What IS that." Ferrell is out.', 'Ferrell folds and washes his hands, somehow.',
                    '"No. Nope. No."', 'Ferrell steps back from the door. Then further back.',
                    '"I don\'t price nightmares."', 'Ferrell folds and looks at the sky for a while.'],
             win:  ['Ferrell wins and checks the unit for eyes before loading.', '"Normal. Please be normal." Ferrell wins.',
                    'Ferrell wins and hires two teenagers to carry the weird parts.', '"A dresser. I got a dresser." Ferrell collects.',
                    'Ferrell wins and does not open the trunk. Ever.'] } },
  // Wanda is a taxidermist and Carl's supplier. Her number is the weird, doubled;
  // the normal goods are packing material. When Wanda pushes, the strange is in there.
  wanda: { id: 'wanda', name: 'Wanda Voss', tag: 'prices nothing but the strange',
    intro: "Wanda Voss is here, folks, and she is not lookin' at your furniture. She's lookin' for somethin' with a pulse. Or somethin' that used to have one.",
    noise: [0.85, 1.15], capMult: 0.55, press: 2, raise: [50, 100], joinChance: 0.8, budget: 2400,
    est: (lk) => catSplitValue(lk, ['weird'], 2.2, 0.5),
    lines: { raise: ['"Oh, there\'s something in there." Wanda raises.', 'Wanda smiles at the birdcage. Bid.',
                     '"Carl will want that." Up.', 'Wanda raises without blinking. She rarely blinks.',
                     '"The jar. I want the jar."', '"Somebody in there was a collector. Of what, we\'ll see."',
                     'Wanda lifts one gloved finger.', '"You can keep the furniture. The rest is mine."',
                     '"It\'s still got its eyes. Raise."'],
             fold: ['"Just furniture." Wanda is out.', 'Wanda looks bored at a perfectly nice dresser. Done.',
                    '"Nothing alive in there. Or formerly."', 'Wanda folds and peels off a glove.',
                    '"Too normal. Ferrell can have it."', '"Carl wouldn\'t even look at it."'],
             win:  ['Wanda wins and asks for the unit to be left dark until she comes back.', '"Mine. Don\'t touch the jars." Wanda wins.',
                    'Wanda wins and makes a phone call. Carl picks up on the first ring.', '"Perfect. Every bit of it." Wanda collects.',
                    'Wanda wins and loads the strangest thing first, gently.'] } },
  // ---- Vermillion: one reads makers through the door, one reads the shine ----
  // Vale carries a loupe and uses it on the door seam. His number is the premium
  // makers, wherever they sit; a plain unit bores him. When Vale leans in, there
  // is a name in there worth knowing.
  vale: { id: 'vale', name: 'Adrien Vale', tag: 'reads the maker, not the finish',
    intro: "Adrien Vale just stepped in with his loupe out, folks. If there's a maker's mark on that door, he already saw it.",
    noise: [0.9, 1.1], capMult: 0.6, press: 1, raise: [50, 100], joinChance: 0.75, budget: 6000,
    est: (lk) => {
      let premium = 0, rest = 0;
      const add = (it) => { if (it.cash) return; if ((it.brandM || 1) >= 1.8) premium += it.val; else rest += it.val; };
      for (const it of lk.items) { add(it); if (it.loot) for (const l of it.loot) add(l); }
      return premium * 1.5 + rest * 0.3;
    },
    lines: { raise: ['"Goldtop." Vale raises without explaining.', 'Vale breathes on his loupe and lifts a finger.',
                     '"The maker\'s mark is under the dust. Up."', '"One does not confuse walnut with a stain."',
                     'Vale raises and says a word in French.', '"The finish is a costume. The bones are real."',
                     '"Provenance, darling. Raise."', 'Vale bids like a man correcting an error.',
                     '"I saw the stamp from the door."'],
             fold: ['"Veneer." Vale is finished.', 'Vale caps the loupe. Done.', '"Nothing in there has a name."',
                    '"Gilt over pine. No."', 'Vale folds and inspects his cuffs.', '"Chrome. Merely chrome."'],
             win:  ['"As expected." Vale wins.', 'Vale wins and has it wrapped in cloth before it moves.',
                    '"The name alone was worth it." Vale collects.', 'Vale wins and does not look pleased. He never does.',
                    '"Send it to the workshop." Vale wins.'] } },
  // Charlie sees the shine and nothing else. His number is the front row, times
  // whatever it looks like. He will push a flashy door to the moon and ignore a
  // plain one hiding a Goldtop.
  charlie: { id: 'charlie', name: 'Chrome Charlie', tag: 'pays for the shine',
    intro: "Chrome Charlie's here, folks! If it shines, he is bidding. He does not care what it actually is.",
    noise: [0.8, 1.3], capMult: 0.6, press: 2, raise: [50, 100], joinChance: 0.8, budget: 4500,
    est: (lk) => visibleValue(lk) * 2.4,
    lines: { raise: ['"Look at it SHINE." Charlie raises.', 'Charlie checks his reflection in the door and bids.',
                     '"That\'s gold. That\'s obviously gold."', 'Charlie raises with a pinky ring.',
                     '"Velvet. I can see velvet from here."', '"If it gleams, it\'s mine."',
                     'Charlie bids at whatever is catching the light.', '"Chrome don\'t lie."',
                     '"Somebody rich packed that. Rich people don\'t pack junk."'],
             fold: ['"It\'s... brown." Charlie is out.', 'Charlie squints at the dull front row. Pass.',
                    '"Nothing sparkles. Nothing for me."', 'Charlie folds and polishes his ring instead.',
                    '"Looks like my grandma\'s garage. No."', '"Matte. Ugh."'],
             win:  ['Charlie wins and immediately Windexes something.', '"SHINY." Charlie wins.',
                    'Charlie wins it and takes a photo with it.', '"Told you. Gold." Charlie collects.',
                    'Charlie wins and drives it home with the top down.'] } },
  // ---- Kettle Basin: one prices condition, one only appears when there is condition to price ----
  // Priscilla wants Mint and pays for it. Her number is the grade of what is in
  // the dark; a Dusty unit is beneath her, a Mint one gets her whole purse.
  priscilla: { id: 'priscilla', name: 'Priscilla Mint', tag: 'pays for condition',
    intro: "Priscilla Mint just put her gloves on, folks. One scratch and she is out — but Mint condition, she will spend it all.",
    noise: [0.9, 1.1], capMult: 0.6, press: 1, raise: [50, 100], joinChance: 0.8, budget: 5500,
    est: (lk) => {
      let v = 0;
      const add = (it) => { if (it.cash) return; v += it.val * (it.cond === 'Mint' ? 1.6 : (it.cond === 'Clean' ? 0.8 : 0.25)); };
      for (const it of lk.items) { add(it); if (it.loot) for (const l of it.loot) add(l); }
      return v;
    },
    lines: { raise: ['"Not a scratch on it." Priscilla raises.', 'Priscilla raises in white gloves.',
                     '"Original box. ORIGINAL box."', '"Mint. Say it with me."', 'Priscilla bids and does not touch anything.',
                     '"Seventy-two degrees for twenty years. Raise."', '"Condition is the whole price."',
                     'Priscilla lifts a gloved finger exactly once.', '"It has never seen the sun."'],
             fold: ['"Dusty." Priscilla is out.', '"Somebody TOUCHED it."', 'Priscilla folds and sanitizes her hands.',
                    '"A chip. I saw a chip."', '"Worn is worthless."', 'Priscilla is done, and offended.'],
             win:  ['Priscilla wins and has it bubble-wrapped in the doorway.', '"Museum grade." Priscilla wins.',
                    'Priscilla wins and forbids the loaders from breathing on it.', '"Perfect. As it should be." Priscilla collects.',
                    'Priscilla wins, in gloves, and pays in crisp bills.'] } },
  // Garrity buys for a museum and does not come for ordinary doors. If he is in
  // the room at all, the unit holds Mint, and he will go to seventy cents on the dollar.
  garrity: { id: 'garrity', name: '"Gloves" Garrity', tag: 'only appears for the good units',
    intro: "Well would you look at that, folks — Gloves Garrity's in the room. When Garrity shows up, there is something real behind that door.",
    noise: [0.95, 1.05], capMult: 0.7, press: 0, raise: [50, 50], joinChance: 0.1, budget: 7000,
    join: (lk) => (mintCount(lk) >= 11 ? 0.9 : 0.08),  // a third of Kettle Basin is Mint; he comes for the top quarter of units
    lines: { raise: ['Garrity raises. The room goes quiet.', '"Acquisition budget." Garrity, flatly.',
                     'Garrity nods to the auctioneer like a man signing for a delivery.', '"The museum will want that."',
                     'Garrity raises without checking a number. He has the number.', '"Provenance is fine. Continue."',
                     'A gloved hand goes up.', '"Up." Garrity does not elaborate.', '"We can go further than you can."'],
             fold: ['"Past the line." Garrity is out.', 'Garrity closes a small leather folder.', '"Not for the collection."',
                    'Garrity steps back precisely one pace.', '"The board would not approve."', 'Garrity folds. Nobody saw him decide.'],
             win:  ['Garrity wins for the museum. It will have a plaque.', '"Crate it." Garrity wins.',
                    'Garrity wins and two men in white gloves appear from nowhere.', '"Accessioned." Garrity collects.',
                    'Garrity wins. The plaque will not mention you.'] } },
  // ---- Chrome Springs: old money and new money, and neither one needs the locker ----
  // The Baroness is accurate and will go to eighty cents on the dollar. Where she
  // stops is the truth, and she stops rarely.
  ilse: { id: 'ilse', name: 'Baroness Ilse von Tesh', tag: 'old money. exact. relentless',
    intro: "The Baroness has arrived, folks. Ilse von Tesh — old money, exact numbers, and she does not blink.",
    noise: [0.95, 1.05], capMult: 0.8, press: 0, raise: [25, 25], joinChance: 0.6, budget: 20000,
    lines: { raise: ['The Baroness inclines her head one degree. Raise.', '"Continue." A raise, apparently.',
                     'Her driver raises the paddle. She does not look at it.', '"I have already valued it."',
                     'The Baroness raises and checks a watch older than the town.', '"Yes."',
                     '"We are not finished."', 'A raise, delivered by eyebrow.', '"It will hang in the east wing."'],
             fold: ['"No." The Baroness is done.', 'The Baroness looks away. That is a fold.', '"Beyond its worth. Unlike me."',
                    'Her driver lowers the paddle. She never moved.', '"Let the child have it."', '"Vulgar." Out.'],
             win:  ['The Baroness wins. Somebody else will carry it.', '"Naturally." The Baroness wins.',
                    'The Baroness wins and leaves before the gavel finishes.', '"Have it cleaned." The Baroness collects.',
                    'The Baroness wins without ever saying a number.'] } },
  // Dex made his money last year and values things by feel. His feel is terrible.
  // He will pay four times value for a door he likes and nothing for one he doesn't.
  dex: { id: 'dex', name: 'Dex Mordant', tag: 'new money. all feel. no math',
    intro: "Dex Mordant just walked in on a phone call, folks. New money, no ceiling, and he is filmin' this for the socials.",
    noise: [0.4, 1.7], capMult: 0.6, press: 2, raise: [25, 50], joinChance: 0.7, budget: 30000,
    lines: { raise: ['"Love it. Love it. Raise." Dex, from his phone.', 'Dex bids with a thumbs up. It counts.',
                     '"Vibes are immaculate." Up.', 'Dex raises and asks what a 10x10 is.',
                     '"Money is a construct. Raise."', '"I\'ll flip it. Or keep it. Raise."',
                     'Dex bids twice by accident and lets it ride.', '"This is content." Raise.',
                     '"What\'s the ceiling? There\'s no ceiling."'],
             fold: ['"Bad energy." Dex is out.', 'Dex got a text. He\'s done.', '"Not on brand."',
                    'Dex folds and starts a podcast about it.', '"My guy says no." Nobody knows his guy.', '"Pass. Wait, no. Pass."'],
             win:  ['Dex wins and films himself winning.', '"Let\'s GO." Dex wins.', 'Dex wins and asks where it ships.',
                    '"Asset acquired." Dex collects.', 'Dex wins and forgets by lunch.'] } },
};
function mintCount(lk) {
  let m = 0;
  for (const it of lk.items) { if (it.cond === 'Mint') m++; if (it.loot) for (const l of it.loot) if (l.cond === 'Mint') m++; }
  return m;
}
// what a unit is worth to somebody who only knows one kind of thing
function catSplitValue(lk, cats, knownMult, restMult) {
  let known = 0, rest = 0;
  const add = (it) => { if (it.cash) return; if (cats.includes(it.cat)) known += it.val; else rest += it.val; };
  for (const it of lk.items) { add(it); if (it.loot) for (const l of it.loot) add(l); }
  return known * knownMult + rest * restMult;
}
function catShare(lk, cats) {
  let known = 0, all = 0;
  const add = (it) => { if (it.cash) return; all += it.val; if (cats.includes(it.cat)) known += it.val; };
  for (const it of lk.items) { add(it); if (it.loot) for (const l of it.loot) add(l); }
  return all ? known / all : 0;
}
const PRUITT_PER_BULK = 13;   // what a pound of somebody else's life is worth to him (his median lands on true value)

// the crowd: nameless, cheap, and gone by the second real raise
const CROWD_DEF = {
  id: 'crowd', name: 'The Crowd', tag: 'lawn chairs, coffee, opinions', raise: [25, 25],
  lines: {
    raise: ['A hand goes up in the back.', "Somebody's cousin nods. That's a bid.",
      'A stranger in a lawn chair bids.', 'Two folding chairs confer. One bids.',
      'A thermos is raised meaningfully.'],
    fold: ['The crowd goes quiet.', 'The lawn chairs are out.', 'The back row returns to its coffee.'],
    win:  ['A stranger hauls it off. Nobody caught his name.', 'The crowd takes this one home.',
      'Somebody\'s cousin wins it and looks terrified.'],
  },
};

// a town may bring a different crowd (Chrome Springs brings no chairs): same id, its own lines
const _crowdDefs = {};
function crowdDefFor(town) {
  const c = town && town.crowd;
  if (!c) return CROWD_DEF;
  if (!_crowdDefs[town.id]) _crowdDefs[town.id] = Object.assign({}, CROWD_DEF, { tag: c.tag || CROWD_DEF.tag, lines: Object.assign({}, CROWD_DEF.lines, c.lines || {}) });
  return _crowdDefs[town.id];
}

function prepNpcsForAuction(locker, R, world, day) {
  const mem = (world && world.rivalMem) || {};
  const town = TOWNS[(world && world.town) || 'dustyFlats'] || TOWNS.dustyFlats;
  const vis = visibleValue(locker);
  const pm = town.priceMult || 1;
  const roster = NPCS.concat((town.rivals || []).map((id) => EXTRA_NPCS[id]).filter(Boolean));
  // does this door play to what you always buy, on a day the room is allowed to say so?
  const read = (G.today && G.today.facts && G.today.facts.readDay) ? doorMatchesHabit(locker) : [];
  const spread = townRule('noiseSpread', town);      // Salt Lick: everybody guesses louder (Ed excepted)
  const list = roster.map((n) => {
    let join = n.joinChance;
    let spiteMult = n.spiteMult || 0;
    // Bart only leaves the truck when the door looks embarrassing
    if (n.id === 'bart') join = vis >= 240 * pm ? 0.9 : 0.12;
    // Sal remembers getting sniped. For a few days, loudly.
    if (n.id === 'sal' && (mem.salGrudgeUntil || 0) >= (day || 0)) { join = 0.95; spiteMult = 0.8; }
    // Sal has read you: a door with your kind of thing on it brings him out, and up
    if (n.id === 'sal' && read.length) { join = Math.max(join, 0.9); spiteMult = Math.max(spiteMult, 0.7); }
    // some people only come out for one auctioneer, or for one kind of door
    if (n.under) { const a = curAuctioneer(day); if (n.under[a.id] !== undefined) join = n.under[a.id]; }
    if (n.join) join = n.join(locker);
    // the opening deals the room as well as the doors
    const op = openingRoster(locker, day);
    if (op && op[n.id] !== undefined) join = op[n.id] ? 1 : 0;
    // most people price the unit. Some price the boxes, or the weight. Item
    // values already carry the town's prices, so only an estimate built from
    // something else (Pruitt's dollars per pound) is scaled up for the town.
    const sp = n.id === 'ed' ? 1 : spread;
    const est = (n.est ? n.est(locker) * (n.estRaw ? pm : 1) : locker.value) * R.r(1 - (1 - n.noise[0]) * sp, 1 + (n.noise[1] - 1) * sp);
    const budgetCap = Math.round(n.budget * pm);
    // how they have been doing against you lately: cocky goes a little further and pushes once more, wary stops a little short
    const stance = (typeof rivalStance === 'function') ? rivalStance(n.id, day) : null;
    const stanceCap = stance === 'cocky' ? 0.05 : (stance === 'wary' ? -0.05 : 0);
    return {
      def: n,
      est,
      cap: Math.min(budgetCap, Math.round(est * (n.capMult + townRule('rivalCapBonus', town) + stanceCap))),
      spiteCap: spiteMult ? Math.min(budgetCap, Math.round(est * spiteMult)) : 0,
      budgetCap,
      pressLeft: (n.press || 0) + (stance === 'cocky' ? 1 : 0),
      stance,
      active: R.chance(join),
      folded: false,
    };
  });
  list.push({
    def: crowdDefFor(town), crowd: true, est: 0,
    cap: Math.round(R.i(3, 9) * 25 * (town.crowdCapMult || 1)),
    spiteCap: 0,
    active: true, folded: false,
  });
  return list;
}

// visible front value (what everyone can see from the door)
function visibleValue(locker) {
  let v = 0;
  for (const it of locker.items) if (it.layer === 2) v += it.val;
  return v;
}

// Pre-auction tells: Ed reads the hidden/visible ratio and his body leaks it.
// Fifty-odd lines, seeded per unit so a locker keeps its story all day.
const ED_TELLS = {
  hot: [
    'Eagle Ed is PACING. He keeps staring into the back corner.',
    'Ed walked past this door four times. He never walks.',
    'Ed is doing long division in the margin of his notebook.',
    "Ed's pencil snapped. He's sharpening it with a pocket knife.",
    'Ed asked the manager how long unit was rented. He never asks.',
    'Ed is standing very still and breathing like a man counting.',
    'Ed circled something in the notebook, then circled the circle.',
    "Ed's left eye is twitching. Locals call that his tell of tells.",
    'Ed pretended to tie his shoe in front of this door. Both shoes.',
    'Ed has not checked his phone once. Not once.',
    'Ed keeps glancing at YOU, then at the door, then back at you.',
    'Ed wrote a number, covered it with his thumb, and smiled.',
    'Ed muttered "carrying costs" and started nodding to himself.',
    'Ed sniffed the door seam. Twice. He knows something about air.',
    'Ed asked Dutch to stand somewhere else. Dutch was blocking his view of the back.',
    'Ed has a second pencil out. Two pencils is a number he likes.',
    'Ed is not eating. Ed always eats. Ed is not eating.',
    'Ed asked the clerk for the tenant\'s move-in date and did the subtraction in his head. Out loud.',
    'Ed put his hand flat on this door and held it there. Temperature, he says. It is not temperature.',
  ],
  warm: [
    'Eagle Ed squints into the dark and scribbles in his notebook.',
    'Ed leans in, hums one flat note, and writes something short.',
    'Ed taps the door twice and listens like a doctor.',
    "Ed's notebook is open to a fresh page. That's not nothing.",
    'Ed counted the visible boxes on his fingers, then frowned.',
    'Ed tilts his head at the stack in there like it owes him money.',
    'Ed drew a little sketch of the doorway. He keeps those.',
    'Ed asked nobody in particular what year the renter moved in.',
    'Ed stood at the exact center of the door for a long moment.',
    'Ed underlined something. From here it looked like one word.',
    'Ed did the slow whistle. Quiet, but you heard it.',
    'Ed checked the sun, then the shadows inside. Depth math.',
    'Ed wrote something, looked at the door, and added a question mark.',
    'Ed paced once. Only once. He is deciding whether to pace.',
    'Ed asked the clerk if the tenant "packed it himself." Then he wrote down the answer.',
    'Ed looked at this door, then at his shoes, then at the door again. The shoes were fine.',
    'Ed is standing at the edge of the shadow inside, not the edge of the door. He measures shadows.',
  ],
  cold: [
    'Eagle Ed glances in, yawns, and checks his phone.',
    'Ed looked in for exactly one second and kept walking.',
    "Ed didn't even open the notebook. Sat on it, actually.",
    'Ed is at the snack table. He is committed to the snack table.',
    'Ed offered to sell HIS spot in line. To anyone.',
    "Ed whispered 'weight' to Dutch and shook his head.",
    'Ed is doing the crossword. In pen. That confident.',
    'Ed pointed his chin at the door and made the so-so hand.',
    'Ed is retying the twine on his notebook. Housekeeping day.',
    'Ed already wandered to the next unit. His feet voted.',
    'Ed mouthed a number at the door and laughed a little.',
    'Ed is feeding crumbs to Deposits the raccoon. On purpose.',
    'Ed put the notebook in his back pocket. He does not sit on it by accident.',
    'Ed told Bart this one was "all his." Bart did not hear the tone.',
    'Ed is explaining carrying costs to the crowd. Nobody asked. He is bored.',
    'Ed let Sal stand in front of him at this door. Ed never lets Sal stand in front of him.',
    'Ed wrote one word for this unit and closed the book on the pencil. The pencil is still in there.',
  ],
};
// Ed's tier for a unit: what the notebook really says
function edTier(locker) {
  const vis = Math.max(20, visibleValue(locker));
  const ratio = locker.value / vis;
  if (ratio > 5 || locker.value > 2600) return 'hot';
  if (ratio > 3.2) return 'warm';
  if (locker.value < 700) return 'cold';
  return null;
}
// the other regulars leak things too — flavor first, information second
const RIVAL_TELLS = {
  bartHot: [
    "Bart parked the big truck sideways. He's planning on hauling.",
    'Bart already peeled bills off his clip. Warm-up money.',
    'Bart told his driver to stay close. The DRIVER came today.',
    'Bart is smiling at this door like it owes him a steak.',
    "Bart called someone and said 'yeah, the good kind.'",
    'Bart tipped his hat to the door itself. The door.',
    'Bart sent his driver to measure the door. With a tape. The driver did it.',
    'Bart is not looking at this unit, which is how Bart looks at a unit he wants.',
    "Bart said 'that'll do' to nobody, and it was about this door.",
  ],
  bartCold: [
    'Bart looked in and checked his watch, which is his whole review.',
    "Bart asked if there's a better yard in this town. Out loud.",
    'Bart is eating a sandwich facing away from this unit.',
    "Bart's money clip never left the pocket. It always comes out.",
    'Bart offered to buy this unit for the crowd "as a joke." Nobody laughed. He meant it.',
    'Bart yawned at this door so hard his hat moved.',
    'Bart asked the clerk if this row "gets sun." It was about the value. It is always about the value.',
  ],
  salGrudge: [
    'Sal is only looking at whatever YOU look at. Including this.',
    "Sal asked the clerk what number YOU are. He knows your number.",
    'Sal cracked his knuckles when you walked up. All ten.',
    "Sal told the crowd he's 'not even here for the units' today.",
    'Sal is standing exactly where you were standing a minute ago. On purpose.',
    'Sal wrote your number on his hand. Then he looked at his hand for a while.',
    '"Whatever they bid, plus twenty-five." Sal, to himself, about you, loudly.',
  ],
  dutchNoise: [
    'Dutch cleared his throat for a full ten seconds. Warming up.',
    'Dutch is here early, humming. Nobody knows the tune.',
    'Dutch said "yip" to a bird. The bird left. An omen, maybe.',
    'Dutch is doing neck stretches like this is a sporting event.',
    'Somebody sold Dutch a coffee. Whole yard braces for volume.',
    'Dutch practiced one "yip" at the fence, quietly, like a man tuning a guitar.',
    'Dutch has a lozenge. Dutch does not take lozenges lightly.',
    'A child asked Dutch what "yip" means. Dutch said "yip." The child understood.',
  ],
  // they have noticed what you buy. {cat} is the thing on the door that gave you away.
  readYou: [
    '"There it is. {cat}. He\'s in." Sal, not quietly.',
    'Sal looked at {cat} in there, then at you, and smiled with too many teeth.',
    'Ed wrote your name next to this unit. Then he underlined {cat}.',
    'Dutch pointed at {cat}, then at you, and said "yip" like a verdict.',
    'Bart nudged Sal and nodded at {cat}. Then at you. Then at his money clip.',
    'Somebody in the crowd said "that\'s the {cat} one" and did not mean the unit.',
  ],
  readSafe: [
    'Sal tapped the safe in there and looked straight at you. He knows.',
    'Ed wrote "safe" and your name on the same line.',
    '"He\'ll want the box," Bart said, about you, to nobody.',
  ],
  readEd: [
    'Ed noticed you watching him. He is now watching you watch him.',
    'Ed did his whole routine facing away from you. On purpose.',
    'Ed closed the notebook when you looked over. Then opened it. Then looked at you.',
  ],
  // the couple: he sees tools, she sees the little boxes, and the argument is the information
  duoCody: [
    'Cody is pointing at something in the back and saying "compressor" like a prayer.',
    'Cody: "That\'s a DeWatt." Kaylee: "That\'s a box." Cody is right about this one.',
    'Cody walked past this door and stopped mid-sentence. Kaylee kept walking. Then came back.',
    'Cody has his hands on his hips at this unit. That is his buying posture.',
  ],
  duoKaylee: [
    'Kaylee has her arms crossed at this door, which means she wants it.',
    'Kaylee: "The little box. Under the lamp." Cody did not see a box.',
    'Kaylee said "vintage" at this unit and Cody groaned out loud.',
    'Kaylee took a photo of this door. She does not take photos of doors.',
  ],
  duoSplit: [
    'They are arguing at this door. He says "tools." She says "the box." They are pointing at different things.',
    'Cody wants this one. Kaylee wants this one. That has never happened before.',
    'For once they agree, which means they will not stop bidding.',
  ],
  // Salt Lick regulars. Bev reads boxes; Pruitt reads weight. Both leak.
  bevFull: [
    'Bev has been staring at the boxes in this one for ten minutes.',
    'Bev asked the clerk who packed this unit. Then she wrote it down.',
    'Bev is smiling at a cardboard box. Nobody smiles at cardboard.',
    'Bev pressed her ear to a box in there. She nodded.',
  ],
  bevEmpty: [
    'Bev flicked a box in there with her boot and walked off.',
    'Bev looked at the boxes, sighed, and went for coffee.',
    '"Air. That\'s air in boxes." Bev was not asked.',
    'Bev lifted one bag with a finger. One finger was enough.',
  ],
  pruittHeavy: [
    'Pruitt backed his truck up to this door before the auction started.',
    'Pruitt is looking at the floor in there. Drag marks. Deep ones.',
    'Pruitt whistled at this door. He weighs things by ear.',
    'Pruitt checked his own tires after looking in. Twice.',
  ],
  pruittLight: [
    'Pruitt kicked this door and listened. He did not like the sound.',
    "Pruitt didn't bother walking over. His truck stayed parked.",
    '"Feathers," Pruitt said, to nobody, about this unit.',
    'Pruitt looked in, shrugged, and went back to his sandwich.',
  ],
  // Gypsum City regulars. One reads the paper. One reads the paper and does the opposite.
  hattieNamed: [
    "Hattie has the paper folded open to this unit's number. She circled it. Twice.",
    'Hattie read the headline out loud at this door. To the door.',
    'Hattie asked the clerk to confirm the number. "It\'s in the PAPER."',
    'Hattie is guarding this door with a rolled-up newspaper.',
  ],
  delgadoNamed: [
    'Delgado glanced at the paper, glanced at this door, and laughed once.',
    '"That rag." Delgado spat near this unit and moved on.',
    'Delgado is deliberately not looking at this door. It is a performance.',
  ],
  delgadoSkipped: [
    'Delgado is standing in front of this door like he already owns it.',
    '"Not in the paper. Good." Delgado, about this unit, to his truck.',
    'Delgado counted two doors over from the printed one and stopped here.',
  ],
  // Bent Fork regulars. Each knows one kind of thing, and shows it.
  deeWood: [
    'Dee ran a hand along a dresser edge in there and closed her eyes.',
    'Dee whispered "dovetails" at this door and crossed herself.',
    'Dee has been looking at the grain in this unit the way other people look at scripture.',
    'Dee asked the clerk if the tenant "kept a nice house." She already knew.',
  ],
  cobbIron: [
    'Cobb sniffed this door. "Two-stroke," he said, to nobody.',
    'Cobb counted cords through the gap under the door. On his fingers.',
    'Cobb is leaning on his truck facing this unit with his keys already out.',
    'Cobb tapped a toolbox in there with his boot and grinned at the sound.',
  ],
  // Marrow Creek regulars. One flinches at the strange; one collects it.
  ferrellCalm: [
    'Ferrell looks relieved at this door. Nothing in there is looking back.',
    'Ferrell said "oh thank God, a couch" at this unit. Out loud.',
    'Ferrell has been standing at this door like it is the only normal thing in town.',
  ],
  wandaKeen: [
    'Wanda pressed her face to the gap under this door and inhaled.',
    'Wanda made a phone call at this door. Short. She said "yes" twice.',
    'Wanda took off one glove at this unit. Nobody knows what that means. Everybody knows.',
    'Wanda is humming at this door. The tune is not one you know.',
  ],
  // Vermillion. One reads the maker; one reads the light.
  valeLoupe: [
    'Vale put a loupe to the door seam and said one word in French.',
    'Vale looked past the shiny thing in front and smiled at something dull.',
    'Vale asked the clerk to spell the tenant\'s name. Then he nodded.',
    'Vale is standing very still at this door. He only stands still for names.',
  ],
  charlieShine: [
    'Charlie is admiring his reflection in something in this unit.',
    '"Now THAT\'S a door." Charlie, loudly, about this one.',
    'Charlie has his sunglasses off for this unit. He never takes them off.',
  ],
  // Kettle Basin. One prices the grade; one only turns up when the grade is there.
  priscillaMint: [
    'Priscilla put on a second pair of gloves at this door.',
    '"Untouched," Priscilla whispered at this unit, the way other people say "amen."',
    'Priscilla is measuring the humidity at this door with a little brass gauge.',
  ],
  garrityHere: [
    'Garrity is here. Garrity is never here.',
    'A man in white gloves is standing behind the crowd, looking only at this door.',
    'Garrity\'s car is parked at this unit. It is not a car that parks at storage yards.',
  ],
  // Chrome Springs. One already knows; one is guessing with other people\'s money.
  ilseKnows: [
    'The Baroness had her driver photograph this door. Once. From the correct angle.',
    'The Baroness said "yes" at this unit before anyone asked her anything.',
    'The Baroness has already valued this one. You can tell by how bored she looks.',
  ],
  dexNoise: [
    'Dex is bidding on something on his phone. It might be this unit. It might be a boat.',
    'Dex asked if this unit "comes with the building."',
    'Dex is filming himself pointing at this door. The caption is already wrong.',
  ],
};
// what the Salt Lick pair would notice about a unit, if they are in town
function lockerBulk(locker) {
  let b = 0;
  for (const it of locker.items) { b += it.size; if (it.loot) for (const l of it.loot) b += l.size; }
  return b;
}
function lockerFullBoxes(locker) {
  let n = 0;
  for (const it of locker.items) if (it.container && it.loot && it.loot.length) n++;
  return n;
}
function edTellInfo(locker, world, day) {
  const mem = (world && world.rivalMem) || {};
  const tier = edTier(locker);
  // taken too many of his units: half the time the notebook closes, half the
  // time it stays open and lies. Ed wants you to THINK he saw something.
  // ...and a player who follows Ed everywhere gets a false trail one time in four
  const shadowed = day && world && playerHabits().followsEd && RNG(strHash('edshadow' + (G && G.worldSeed) + '_' + day + '_' + locker.num)).chance(0.25);
  if (((mem.edQuietUntil || 0) >= (day || 0) && day) || shadowed) {
    const Rq = RNG(strHash('edquiet' + (G && G.worldSeed) + '_' + day + '_' + locker.num));
    if (!shadowed && Rq.chance(0.5)) return null;
    const wrong = ['hot', 'warm', 'cold'].filter((t) => t !== tier);
    const fake = Rq.pick(wrong);
    return { tier: fake, text: Rq.pick(ED_TELLS[fake]), misleading: true };
  }
  if (!tier) return null;
  const R = RNG(strHash('tell' + (G && G.worldSeed) + '_' + (day || 0) + '_' + locker.num));
  return { tier, text: R.pick(ED_TELLS[tier]) };
}
function edTell(locker, world, day) {
  const t = edTellInfo(locker, world, day);
  return t ? t.text : null;
}
// a second voice around the yard, when there is something worth muttering
function rivalTell(locker, world, day) {
  const R = RNG(strHash('rtell' + (G && G.worldSeed) + '_' + (day || 0) + '_' + locker.num));
  if (!R.chance(0.45 * (curAuctioneer(day).tellMult || 1))) return null;   // a slow room gossips more
  const mem = (world && world.rivalMem) || {};
  const town = TOWNS[(world && world.town) || 'dustyFlats'] || TOWNS.dustyFlats;
  const vis = visibleValue(locker);
  const opts = [];
  if (vis >= 240 * (town.priceMult || 1)) opts.push('bartHot');
  else if (vis < 120 * (town.priceMult || 1)) opts.push('bartCold');
  if ((mem.salGrudgeUntil || 0) >= (day || 0)) opts.push('salGrudge');
  if (R.chance(0.5)) opts.push('dutchNoise');
  const cody = catShare(locker, ['tools', 'electronics']) >= 0.4;
  const kaylee = catShare(locker, ['jewelry', 'collectibles', 'antiques']) >= 0.35;
  if (cody && kaylee) opts.push('duoSplit');
  else if (cody) opts.push('duoCody');
  else if (kaylee) opts.push('duoKaylee');
  // the room has read you: a door that plays to your habit gets pointed at, on the week's read day
  const habits = playerHabits();
  const match = doorMatchesHabit(locker, habits);
  const readDay = !!(G.today && G.today.facts && G.today.facts.readDay);
  if (readDay && match.some((m) => m !== 'safe')) { opts.push('readYou'); opts.push('readYou'); }
  if (readDay && match.includes('safe')) opts.push('readSafe');
  if (readDay && habits.followsEd && edTier(locker)) opts.push('readEd');
  const locals = town.rivals || [];
  if (locals.includes('bev')) {
    const full = lockerFullBoxes(locker);          // top third of units / bottom tenth
    if (full >= 4) opts.push('bevFull');
    else if (full <= 1) opts.push('bevEmpty');
  }
  if (locals.includes('pruitt')) {
    const bulk = lockerBulk(locker);               // heaviest fifth / lightest quarter
    if (bulk >= 90) opts.push('pruittHeavy');
    else if (bulk <= 65) opts.push('pruittLight');
  }
  if (locals.includes('dee') && catShare(locker, ['furniture', 'antiques']) >= 0.55) opts.push('deeWood');
  if (locals.includes('cobb') && catShare(locker, ['tools', 'electronics']) >= 0.45) opts.push('cobbIron');
  if (locals.includes('ferrell') && catShare(locker, ['weird']) < 0.15) opts.push('ferrellCalm');
  if (locals.includes('wanda') && catShare(locker, ['weird']) >= 0.4) opts.push('wandaKeen');
  if (locals.includes('vale')) {
    let premium = false;
    for (const it of locker.items) { if ((it.brandM || 1) >= 1.8) premium = true; if (it.loot) for (const l of it.loot) if ((l.brandM || 1) >= 1.8) premium = true; }
    if (premium) opts.push('valeLoupe');
  }
  if (locals.includes('charlie') && vis >= 400 * (town.priceMult || 1)) opts.push('charlieShine');
  if (locals.includes('priscilla') || locals.includes('garrity')) {
    const mint = mintCount(locker);
    if (locals.includes('priscilla') && mint >= 11) opts.push('priscillaMint');
    if (locals.includes('garrity') && mint >= 11) opts.push('garrityHere');
  }
  if (locals.includes('ilse') && locker.value / Math.max(20, vis) > 3) opts.push('ilseKnows');
  if (locals.includes('dex') && R.chance(0.4)) opts.push('dexNoise');
  if (locals.includes('hattie') || locals.includes('delgado')) {
    const named = paperNamedUnits().includes(locker.num);
    if (named && locals.includes('hattie')) opts.push('hattieNamed');
    if (locals.includes('delgado')) opts.push(named ? 'delgadoNamed' : 'delgadoSkipped');
  }
  if (!opts.length) return null;
  let pool = R.pick(opts);
  // Salt Lick: everybody but Ed performs certainty. Half the chatter is theater about nothing.
  const bluff = townRule('bluffTells', town);
  if (bluff > 0 && R.chance(bluff)) {
    const stagey = ['bartHot', 'bartCold', 'dutchNoise', 'bevFull', 'bevEmpty', 'pruittHeavy', 'pruittLight'].filter((k) => k.startsWith('bart') || k.startsWith('dutch') || locals.includes(k.replace(/Full|Empty|Heavy|Light/, '')));
    pool = R.pick(stagey);
  }
  let line = R.pick(RIVAL_TELLS[pool]);
  if (pool === 'readYou') {
    const cat = match.find((m) => m !== 'safe');
    line = line.replace('{cat}', HABIT_LABEL[cat] || cat);
    line = line.replace(/^"There it is\. the /, '"There it is. The ');
  }
  return line;
}

// ---- buyers ----
const BUYERS = [
  { id: 'pete', name: 'Pawn Pete', cats: null, mult: 0.45, cash: Infinity,
    blurb: 'buys ANYTHING, pays badly' },
  { id: 'alice', name: 'Antique Alice', cats: ['furniture', 'antiques', 'jewelry'], mult: 1.8, cash: 800,
    blurb: 'furniture, antiques & jewelry' },
  { id: 'randy', name: 'Riff Randy', cats: ['music', 'collectibles'], mult: 2.0, cash: 700,
    blurb: 'music gear & collectibles' },
  { id: 'gina', name: 'Gearhead Gina', cats: ['tools', 'electronics'], mult: 1.7, cash: 750,
    blurb: 'tools & electronics' },
  { id: 'carl', name: 'Creepy Carl', cats: ['weird'], mult: 3.0, cash: 550,
    blurb: 'pays TRIPLE for weird stuff' },
  // the certified appraiser (APPRAISAL.md §4): buys nothing, vouches for anything, charges by the look
  { id: 'appraiser', name: 'Mrs. Odell', appraiser: true, cats: [], mult: 0, cash: 0, fee: 40, perVisit: 3,
    blurb: 'certified appraiser. buys nothing' },
];
const SPECIALISTS = BUYERS.filter((b) => b.id !== 'pete' && !b.appraiser);

// the appraiser keeps her own calendar: every APPRAISER_EVERY days on a phase the world
// picks, plus the odd extra morning. Pure, so the paper can say "tomorrow" and be right,
// and the gap is never longer than APPRAISER_EVERY — a flagged thing always has a date.
const APPRAISER_EVERY = 5;
function genAppraiser(worldSeed, day) {
  if (day < 3) return false;                                                   // not before the opening has settled
  const phase = strHash('apprphase' + worldSeed) % APPRAISER_EVERY;
  if (day % APPRAISER_EVERY === phase) return true;
  return RNG(strHash('apprday' + worldSeed + '_' + day)).chance(0.15);
}

// who's buying is pure calendar — the paper can safely predict tomorrow
function genSpecialists(worldSeed, day, town) {
  const R = RNG(strHash('spec' + worldSeed + '_' + day));
  const pm = (town && town.priceMult) || 1;
  const bias = town && town.buyerBias;
  let two;
  if (bias) {
    // some towns have a regular: weighted draw, two different faces
    const first = R.wpick(SPECIALISTS.map((b) => [b, bias[b.id] || 1]));
    const second = R.wpick(SPECIALISTS.filter((b) => b !== first).map((b) => [b, bias[b.id] || 1]));
    two = [first, second];
  } else two = R.shuf(SPECIALISTS).slice(0, 2);
  return two.map((b) => ({ def: b, cash: Math.round(b.cash * pm) }));
}

function genDay(worldSeed, day, foundLegends, world) {
  world = world || defaultWorld();
  const town = TOWNS[world.town] || TOWNS.dustyFlats;
  const R = RNG(strHash('day' + worldSeed + '_' + day + '_' + town.id));
  const legendsLeft = LEGENDARY_BASES.map((b) => b.id).filter((id) => !foundLegends.includes(id));
  const dayPlan = rollDayPlan(R, day, world, town);
  const dayCap = town.dayCapBase + day * town.dayCapPerDay;

  const archCounts = {};
  const plans = [];
  let billTaken = false;                 // a bill only ever claims one of the three doors
  for (let i = 0; i < 3; i++) {
    let contract = dayPlan.contracts[i];
    let set = null;
    if (contract === 'setTease' || contract === 'setTrap') {
      set = planSet(R, day, world, contract, town);
      if (!set) contract = 'themeShowcase';
    }
    let archId = pickArch(R, set, world, archCounts, town);
    // an authored door: the story picks the owner, and the size
    let story = null;
    if (contract === 'story') {
      const specP = (world.director && world.director.spec) || {};
      const planned = specP.nextStoryDay === day && specP.nextStoryId && LOCKER_STORIES[specP.nextStoryId] &&
        (town.tier || 0) >= (LOCKER_STORIES[specP.nextStoryId].minTier || 0) && !plans.some((p) => p.story) ? specP.nextStoryId : null;
      story = planned || pickStory(R, town, world, day);
      if (story) archId = LOCKER_STORIES[story].arch;
      else contract = 'themeShowcase';
    }
    // a bill you found days ago advertised this morning, in this town: one door is that
    // kind, so the flyer told the truth. It goes last, after the story and the set have
    // had their say — those doors are already spoken for — and claims only one door.
    let billedHere = false;
    const promised = billFor(world, day, town.id);
    if (promised && !billTaken && !set && !story && ARCHETYPES[promised.data.archId]) {
      archId = promised.data.archId; billedHere = true; billTaken = true;
    }
    archCounts[archId] = (archCounts[archId] || 0) + 1;
    // mixed owners, past the home yard and past the first week: a musician's unit packed by his daughter
    let blendArch = null;
    const spec = (world.director && world.director.spec) || {};
    if (town.tier >= 1 && !set && !story && day >= 8 && day - (spec.lastBlend || -99) >= 5 && R.chance(0.08)) {
      const boost = town.archBoost || {};
      const cands = Object.keys(ARCHETYPES).filter((k) => k !== archId && (ARCHETYPES[k].w > 0 || (boost[k] || 0) > 0));
      if (cands.length) blendArch = R.pick(cands);
    }
    // unit sizes: little 5x5s, the standard row, and the odd double-wide.
    // set-tease units stay standard or bigger — the table needs the room.
    let cols = R.wpick([[5, 18], [8, 64], [9, 18]]);
    if (set && cols < 8) cols = 8;
    if (story) cols = LOCKER_STORIES[story].cols || 8;
    if (dayPlan.opening && dayPlan.opening[i] === 'trap') cols = 9;   // the opening's trap is a double-wide with a good front row and air behind it
    plans.push({
      billed: billedHere,
      contract, archId, blendArch, set, story, spill: null, dayCap, day, cols, town,
      bidStep: town.bidStep, priceMult: town.priceMult,
      ownedTools: world.tools || [], honest: i === dayPlan.honestIdx,
      opening: dayPlan.opening ? dayPlan.opening[i] : null,
      personasSeen: world.personasSeen || {},
    });
  }
  const od = dayPlan.opening ? day : 0;               // a dealt morning: no myth, no history, just the lesson

  // sometimes the pieces are split across units — chairs here, table there
  const teaseIdx = plans.findIndex((p) => p.set && !p.set.trap);
  if (teaseIdx >= 0 && plans[teaseIdx].set.roles.length >= 3 && R.chance(0.15)) {
    const sp = plans[teaseIdx].set;
    const j = R.pick([0, 1, 2].filter((i) => i !== teaseIdx));
    const moved = [];
    const nMove = R.i(1, 2);
    for (let k = 0; k < nMove && sp.roles.length > 1; k++) {
      const mi = sp.roles.findIndex((r) => r !== 'anchor');
      if (mi < 0) break;
      moved.push(sp.roles.splice(mi, 1)[0]);
    }
    if (moved.length) plans[j].spill = { setId: sp.setId, brand: sp.brand, roles: moved, instanceId: sp.instanceId, trap: false };
  }

  // the myth calendar decides if today is the day
  let mythPlan = od ? null : mythPlanFor(worldSeed, day, town, foundLegends);
  // a receipt is a standing document, and a document with nothing to settle is no use:
  // holding one nudges the thing it names to actually turn up
  if (!mythPlan) mythPlan = receiptSummon(world, worldSeed, day, town, foundLegends);
  // and whichever way it turned up, the paper settles what it is, before you ever bid
  mythPlan = receiptVerdict(world, mythPlan);
  if (mythPlan) {
    const cands = [0, 1, 2].filter((i) => !plans[i].set);
    const mi = cands.length ? R.pick(cands) : 0;
    plans[mi].myth = mythPlan;
    if (mythPlan.real) plans[mi].contract = 'mythHole';
  }
  // a letter promised this person's other unit today. It goes to the door most able to
  // hold somebody's things: a myth door and a story door will not take one, and a wide
  // junk pile has the most loose ordinary stuff for their kit to step into.
  {
    const promise = letterFor(world, day, town.id);
    if (promise) {
      const ideal = [0, 1, 2].filter((i) => !plans[i].story && !plans[i].set && !plans[i].myth && plans[i].contract !== 'emptyFlex');
      // a door with air behind it or a set already in it is a worse home for somebody's
      // things, but a broken promise is worse than either
      const cands = ideal.length ? ideal : [0, 1, 2].filter((i) => !plans[i].story && !plans[i].myth);
      cands.sort((a2, b2) => (plans[b2].contract === 'junkPile') - (plans[a2].contract === 'junkPile') || plans[b2].cols - plans[a2].cols);
      if (cands.length) plans[cands[0]].persona = promise.data.personaId;
    }
  }
  // a photograph promised this room today: the thing in it is here, at the back,
  // where it costs daylight to reach. That is the whole point of the picture.
  {
    const promise = photoFor(world, day, town.id);
    if (promise) {
      const cands = [0, 1, 2].filter((i) => !plans[i].story && !plans[i].myth && plans[i].contract !== 'emptyFlex');
      const pick = cands.length ? cands : [0, 1, 2].filter((i) => !plans[i].story && !plans[i].myth);
      if (pick.length) plans[R.pick(pick)].photoBase = promise.data.base;
    }
  }
  // a certificate promised a thing today: it is here, wearing the maker's mark the paper vouched for
  {
    const promise = certFor(world, day, town.id);
    if (promise) {
      const cands = [0, 1, 2].filter((i) => !plans[i].story && !plans[i].myth && plans[i].contract !== 'emptyFlex' && !plans[i].photoBase);
      const pick = cands.length ? cands : [0, 1, 2].filter((i) => !plans[i].story && !plans[i].myth);
      if (pick.length) plans[R.pick(pick)].certBase = promise.data.base;
    }
  }
  // an object with a past, or the proof of one, goes into an ordinary door
  const provPlan = od ? null : provPlanFor(worldSeed, day, town, world);
  if (provPlan) {
    const cands = [0, 1, 2].filter((i) => !plans[i].set && !plans[i].story && !plans[i].myth);
    if (cands.length) plans[R.pick(cands)].prov = provPlan;
  }
  // the key calendar: a key one day, its lock a few days on
  const keyPlan = keyPlanFor(worldSeed, day);
  if (keyPlan) {
    const cands = [0, 1, 2].filter((i) => !plans[i].myth && !plans[i].prov);
    if (cands.length) plans[R.pick(cands)].keyPlan = keyPlan;
  }

  GEN_TOWN = town;                                // makeItem reads the town's condition weights
  // a bill that could not find a door (every one was a set or a story) still has to be
  // true when you get there. Last resort: a set door, which can belong to anyone.
  {
    const promise = billFor(world, day, town.id);
    if (promise && !billTaken && ARCHETYPES[promise.data.archId]) {
      const p = plans.find((x) => !x.story && !x.myth);
      if (p) { p.archId = promise.data.archId; p.billed = true; billTaken = true; }
    }
  }
  const lockers = plans.map((p, i) => genLocker(R, R.i(11, 99) * 10 + i + 1, legendsLeft, p));
  GEN_TOWN = null;

  // unit 13 occasionally sorts itself overnight
  if (R.chance(townRule('tidyRate', town))) {
    const lk = R.pick(lockers);
    lk.num = 13;
    lk.flavor = 'Boxes stacked by morning, neater than any tenant left them.';
    lk.tidied = true;
    tidyLocker(lk);
  }

  // -- a pair: two ordinary things in one ordinary door whose details point at each other. One a day at most, on three days in ten --
  // (its own roll, so the day's other dice are not disturbed)
  const Rp = RNG(strHash('pair' + worldSeed + '_' + day + '_' + town.id));
  if (Rp.chance(0.3)) {
    const cands = lockers.filter((lk) => !lk.story && !lk.persona && !lk.seededLegend && !lk.provPlant && !lk.opening &&
      !(lk.setPlaced && lk.setPlaced.length) && lk.contract !== 'mythHole' && lk.contract !== 'emptyFlex');
    if (cands.length) {
      const seen = world.pairsSeen || {};
      const lk = Rp.pick(cands);
      const fresh = PAIRS.filter((p) => !(seen[p.id] > day - 20));      // the same two things do not turn up twice in a month
      const fits = fresh.filter((p) => !lk.items.some((it) => it.base === p.a.base || it.base === p.b.base));   // and not a second typewriter
      const pool = fits.length ? fits : (fresh.length ? fresh : PAIRS);
      const pair = Rp.pick(pool);
      if (applyPair(Rp, lk, pair)) lk.pair = pair.id;
    }
  }

  // -- the rare days: about one morning in fifty something happens that the paper will need a sentence for --
  // (its own dice; never during the opening; never twice the same thing inside two months)
  let rare = null;
  if (!od) {
    const Rr = RNG(strHash('rare' + worldSeed + '_' + day + '_' + town.id));
    if (Rr.chance(0.02)) {
      const seen = world.raresSeen || {};
      const fresh = RARE_EVENTS.filter((r) => !(seen[r.id] > day - 60));
      if (fresh.length) {
        const r = Rr.pick(fresh);
        const cands = lockers.filter((lk) => !lk.story && !lk.persona && !lk.pair && !lk.seededLegend && !lk.provPlant && !lk.opening &&
          !(lk.setPlaced && lk.setPlaced.length) && lk.contract !== 'mythHole');
        if (r.apply) { const lk = cands.length ? Rr.pick(cands) : null; if (lk && r.apply(Rr, lk)) { lk.rare = r.id; rare = r.id; } }
        else rare = r.id;                                    // a person, not a door: the auction reads it
      }
    }
  }

  // -- what the raccoon leaves behind: some mornings a front row has his droppings in it. He may be in there. He probably is not. --
  if (!od) {
    const Rd = RNG(strHash('droppings' + worldSeed + '_' + day + '_' + town.id));
    if (Rd.chance(0.04)) {
      const cands = lockers.filter((lk) => !lk.rare && !lk.story && !lk.opening && lk.contract !== 'mythHole');
      if (cands.length) { const lk = Rd.pick(cands); if (placeFront(Rd, lk, 'droppings')) { lk.droppings = true; recomputeValue(lk); } }
    }
  }

  // -- the unmentionable: about one door in twenty-five carries something the office has blurred. In a box, more often than not. --
  if (!od) {
    const Ru = RNG(strHash('censor' + worldSeed + '_' + day + '_' + town.id));
    if (Ru.chance(0.04)) {
      const cands = lockers.filter((lk) => !lk.rare && !lk.story && !lk.opening && lk.contract !== 'mythHole');
      if (cands.length) {
        const lk = Ru.wpick(cands.map((l) => [l, l.archId === 'hoarder' || l.archId === 'oddball' ? 3 : 1]));   // hoarders and Marrow Creek lean in
        const base = Ru.pick(UNMENTIONABLES);
        const cens = makeItem(base, Ru);
        const open = lk.items.filter((x) => x.container && x.loot && !x.locked && canHold(x, cens));
        if (open.length && Ru.chance(0.7)) { Ru.pick(open).loot.push(cens); lk.censored = true; }
        else if (swapInBase(Ru, lk.items, base)) lk.censored = true;
        if (lk.censored) recomputeValue(lk);
      }
    }
  }

  const specialists = genSpecialists(worldSeed, day, town);
  const appraiser = genAppraiser(worldSeed, day);                 // her folding table, on her own calendar

  // the specialness budget, part two: one box a day may say something you should act on
  const strong = [];
  for (const lk of lockers) for (const it of lk.items) if (sensoryStrength(it) === 'strong') strong.push(it);
  if (strong.length) R.pick(strong).tellOk = true;
  // ...and the room reads you out loud about once a week, on a day a door plays to your habit
  const spec = (world.director && world.director.spec) || {};
  const habits = playerHabits();
  const readDay = day - (spec.lastRead || -99) >= 7 && lockers.some((lk) => doorMatchesHabit(lk, habits).length > 0);

  let opening = null;
  if (od) {
    const op = OPENING_PAPER[od] || {};
    const leadIdx = op.lead ? plans.findIndex((p) => p.opening === op.lead) : -1;
    opening = { day: od, roles: plans.map((p) => p.opening), leadIdx, nameRate: op.name || 0, lieRate: op.lie || 0, tool: op.tool || null };
  }
  const facts = {
    day,
    contracts: lockers.map((lk) => lk.contract),
    setsToday: [],
    newInstances: plans.filter((p) => p.set && p.set.newInstance).map((p) => p.set.newInstance),
    readDay,
    storyToday: lockers.some((lk) => lk.story),
    blendToday: lockers.some((lk) => lk.blendId),
    opening,
    rare,
  };
  for (const lk of lockers) {
    for (const p of (lk.setPlaced || [])) {
      if (!facts.setsToday.some((s) => s.setId === p.setId)) {
        facts.setsToday.push({ setId: p.setId, trap: p.trap });
      }
    }
  }

  return { lockers, specialists, appraiser, facts };
}

// ======================================================================
// js/lockerstories.js
// ======================================================================
// ---- authored lockers, object histories, and keys that fit something later ----
// Procedural generation stays the backbone. These are the exceptions: a door
// arranged to tell a story, an object whose past comes out over weeks, and a
// key you keep in the shed because you have a feeling. Nothing here has a
// checklist. The player notices, or does not.


// ============ locker stories ============
// bigs: [base, layer] reserved like set pieces (non-big bases fall through to
// the containers). smalls: [base, name?, note?] tucked into containers. payoff:
// the one object that is not what the door says, with the note LOOK CLOSER
// reads off it. tags: a marker scrawl on a box of that base.
const LOCKER_STORIES = {
  divorce: {
    name: 'The Divorce', arch: 'grandma', minTier: 1, cols: 8, weight: 3,
    bigs: [['dresser', 2], ['mattress', 1], ['golfClubs', 2], ['garbage', 1], ['lamp', 0]],
    smalls: [['photo', 'Photograph, Face Down', 'A wedding. Somebody has been cut out with scissors. Neatly.']],
    payoff: { base: 'watch', name: 'Gold Watch, Engraved', val: 520, into: ['garbage', 'dresser'],
      note: 'Engraved: "Forever." Under it, scratched in with a key, a date.' },
    flavor: 'Half a bedroom. Exactly half.',
    owner: 'Tenant listed as "him." The clerk was told not to ask.',
    tags: { garbage: 'HIS' },
  },
  magician: {
    name: 'The Failed Magician', arch: 'hoarder', minTier: 1, cols: 8, weight: 3,
    bigs: [['trunk', 2], ['rabbitCage', 2], ['box', 1], ['mannequin', 0], ['suitcase', 1]],
    smalls: [['cards', null, null], ['magicKit', null, null], ['magicKit', null, 'The false bottom is the trick. There is no false bottom. That is also the trick.']],
    payoff: { base: 'jarSpecimen', name: 'The Thing That Was Not Part of the Trick', val: 640, into: ['trunk', 'box'],
      note: 'The label says PROP. The label is lying. Something in there is holding still on purpose.' },
    flavor: 'A rabbit cage. No rabbit. A great many scarves.',
    owner: 'Tenant performed at the bingo hall until he did not.',
    tags: { box: 'ACT 2' },
  },
  prepper: {
    name: 'The Prepper', arch: 'workshop', minTier: 1, cols: 9, weight: 3,
    bigs: [['canCrate', 2], ['canCrate', 1], ['barrel', 2], ['radio', 1], ['filing', 1], ['lockbox', 0], ['ladder', 0]],
    smalls: [['diary', 'Notebook of Dates', 'Every page is a date and a reason. The reasons stop in March.']],
    payoff: { base: 'goldBar', name: 'Gold Bar, Assay Stamped', val: 1100, into: ['lockbox', 'filing'],
      note: 'Assay stamp, 1978. He was ready for the end of the world. He was not ready for rent.' },
    flavor: 'Cans. Water. A radio that only receives.',
    owner: 'Tenant paid five years in advance, once. Then never again.',
    tags: { canCrate: 'ROTATE' },
  },
  kidLeftHome: {
    name: 'The Kid Who Left Home', arch: 'timeCapsule', minTier: 1, cols: 8, weight: 3,
    bigs: [['console', 2], ['skateboard', 2], ['mattress', 1], ['box', 1], ['bookshelf', 0]],
    smalls: [['poster', null, null], ['diary', 'School Notebook', 'Every margin is a drawing of the same car.'], ['walkman', null, null]],
    payoff: { base: 'comic', name: 'Comic, First Issue, Bagged', val: 780, into: ['box'],
      note: 'Bagged and boarded by a kid who did not know why. The kid was right.' },
    flavor: 'Posters still on the walls. Of the unit.',
    owner: 'Tenant was seventeen when the rent started. The rent is older than that now.',
    tags: { box: 'MY STUFF. DO NOT.' },
  },
  failedBusiness: {
    name: 'The Failed Business', arch: 'officeSurplus', minTier: 1, cols: 9, weight: 3,
    bigs: [['filing', 2], ['officeChair', 2], ['box', 1], ['box', 1], ['till', 0], ['typewriter', 1], ['neon', 0]],
    smalls: [['diary', 'Receipt Book', 'Carbon copies. The last twenty are blank.']],
    payoff: { base: 'prototype', name: 'Prototype, Serial 0001', val: 620, into: ['box', 'filing'],
      note: 'The one they built before they built the company. The company is gone. This is not.' },
    flavor: 'Inventory tags on everything. Prices crossed out twice.',
    owner: 'Tenant was a company. The company was one man.',
    tags: { box: 'INVENTORY' },
  },
  weddingOff: {
    name: "The Wedding That Didn't Happen", arch: 'grandma', minTier: 1, cols: 8, weight: 2,
    bigs: [['wardrobe', 2], ['trunk', 2], ['box', 1], ['box', 1], ['mirror', 0], ['dresser', 1]],
    smalls: [['china', null, 'A service for twelve, still in the tissue.'], ['photo', 'Photograph, Engagement', 'Two people, very sure. The frame is new. The photo is not.'], ['cards', null, null]],
    payoff: { base: 'ring', name: 'Engagement Ring, Never Given', val: 480, into: ['trunk', 'dresser'],
      note: 'The box has never been opened by anyone but the person who bought it. The receipt is folded inside. It is dated the day before.' },
    flavor: 'Tissue paper. A great deal of tissue paper.',
    owner: 'Tenant rented the unit for "a month, until after." After what, the clerk did not ask.',
    tags: { box: 'RSVP' },
  },
  barClosed: {
    name: 'The Bar That Closed', arch: 'shopStock', minTier: 1, cols: 9, weight: 2,
    bigs: [['neon', 2], ['till', 2], ['barrel', 1], ['vinylCrate', 1], ['box', 1], ['stereo', 0], ['mirror', 0]],
    smalls: [['diary', 'Bar Tab Ledger', 'Forty names. Thirty-eight paid up. Two are underlined.'], ['cards', null, null], ['harmonica', null, null]],
    payoff: { base: 'wine', name: 'The Bottle Behind the Bar, 1961, Unopened', val: 560, into: ['barrel', 'box'],
      note: 'A bottle every bar keeps for the night it closes. The bar closed. Nobody opened it. Nobody had the heart.' },
    flavor: 'A neon sign, unplugged. A stool with one name carved in it.',
    owner: 'Tenant closed the place on a Tuesday. He locked up, drove here, and locked up again.',
    tags: { box: 'GLASSWARE' },
  },
  nightShift: {
    name: 'The Night Shift', arch: 'workshop', minTier: 1, cols: 8, weight: 2,
    bigs: [['filing', 2], ['radio', 2], ['officeChair', 1], ['box', 1], ['ladder', 0], ['lockbox', 0]],
    smalls: [['diary', 'Logbook, Nights', 'Every page: "all quiet." Except one. That page says "again."'], ['walkman', null, null], ['knife', null, null]],
    payoff: { base: 'camera', name: 'Camera, One Roll Exposed, the Night of the Fire', val: 520, into: ['lockbox', 'filing'],
      note: 'Thirty-six exposures, all used, the night the Silver Dollar burned. Nobody developed them. Somebody decided not to.' },
    flavor: 'A thermos. A flashlight. A chair that faced the door for years.',
    owner: 'Tenant worked nights at a place that no longer has nights.',
    tags: { box: 'INCIDENT REPORTS' },
  },
  salesman: {
    name: 'The Traveling Salesman', arch: 'shopStock', minTier: 1, cols: 8, weight: 2,
    bigs: [['suitcase', 2], ['suitcase', 1], ['box', 2], ['till', 1], ['typewriter', 0], ['mannequin', 1]],
    smalls: [['cards', null, 'A deck with one card missing. The card is in the other suitcase.'], ['diary', 'Route Book', 'Nine towns, one line each. The last line is "home?" with the question mark.'], ['massager', null, null]],
    payoff: { base: 'watch', name: 'Gold Watch, Twenty-Five Years, From a Company That Folded', val: 450, into: ['suitcase', 'box'],
      note: 'Engraved with a company name nobody remembers and a year the company did not reach. He kept it wound.' },
    flavor: 'Two suitcases, packed. One has never been unpacked.',
    owner: 'Tenant listed his address as "the road." The clerk wrote it down.',
    tags: { box: 'SAMPLES' },
  },
  collectorUnknowing: {
    name: "The Collector Who Didn't Know", arch: 'grandma', minTier: 1, cols: 8, weight: 3,
    bigs: [['dresser', 2], ['lamp', 2], ['vinylCrate', 1], ['box', 1], ['armchair', 0]],
    smalls: [['china', null, null], ['teddy', null, null]],
    payoff: { base: 'records', name: 'Test Pressing, One of Ten', val: 920, into: ['vinylCrate', 'box'],
      note: 'A white label. A pencil number: 3/10. She played it at Christmas and put it back.' },
    flavor: 'Doilies. Lamps. Nothing to see. That is what everyone will think.',
    owner: 'Tenant kept a tidy house and a tidier unit.',
    tags: {},
  },
};
// which story today, if the contract calls for one: none twice inside twenty days
function pickStory(R, town, world, day) {
  const seen = world.storiesSeen || {};
  const cands = Object.keys(LOCKER_STORIES).filter((id) => {
    const s = LOCKER_STORIES[id];
    return (town.tier || 0) >= (s.minTier || 0) && !(seen[id] && day - seen[id] < 20);
  });
  if (!cands.length) return null;
  return R.wpick(cands.map((id) => [id, LOCKER_STORIES[id].weight || 1]));
}

// ============ provenance: an object whose past comes out over weeks ============
// anchor: the object, as first found (its note is what LOOK CLOSER reads).
// paper: a story that runs `after` days once you HOLD the anchor. proof: an
// object the director places in a later unit, `after` days on. resolved: what
// the anchor becomes when you look closer at it while holding the proof.
const PROVENANCE = {
  // a hand-labelled cartridge, a kid in a paper crown, a county that still talks about the score
  champCart: {
    town: 'gypsumCity', minDay: 12,
    anchor: { base: 'cartNes', name: 'Grey 8-Bit Cartridge, Hand-Labelled', val: 30,
      note: 'Masking tape over the real label: "TOURNAMENT — K.T. — DO NOT RESET." If the battery held, the score is still on it.' },
    paper: { after: 3, headline: 'THE KID WHO BEAT THE COUNTY: "THE CARTRIDGE IS OUT THERE"',
      body: 'In 1990 a twelve-year-old from Gypsum City won the tri-county championship on a score the organisers called impossible and the losers called a lie. The cartridge with the score on it went into a shoebox, the shoebox went into a unit, and the unit went delinquent. "It is out there," says the former champion, now forty-seven and a dental hygienist. "Somebody is going to blow into it."',
      img: 'prov_champ' },
    proof: { after: 7, base: 'photo', name: 'Photograph: a Kid at a Television, 1990',
      note: 'A kid in a paper crown, a score on the screen with too many digits, and a cartridge held up like a fish.' },
    resolved: { name: "Kenny Tolliver's Tournament Cartridge", val: 1200,
      lines: ['The crown in the photograph is on the TV in the photograph. The cartridge in the kid\'s hand has this label on it.',
              'The battery held. The score is the score in the picture. Nobody blew into it.'] },
  },
  redMesaGuitar: {
    town: 'redMesa', minDay: 8,
    anchor: { base: 'guitar', name: 'Fendrix Guitar', val: 420,
      note: 'Scratched beneath the bridge: "R.J. — Amarillo \'63".' },
    paper: { after: 3, headline: 'LOCAL BAND REUNION MARKS ANNIVERSARY OF THE RED MESA FIRE',
      body: 'Sixty years since the Silver Dollar burned mid-set, the surviving members of the Amarillo Kings met at the diner. The frontman, R.J. Calloway, walked out through the smoke that night with his guitar and never played it again. "He scratched something under the bridge," says the drummer. "Never told us what. Never sold it, either."',
      img: 'prov_redmesa' },
    proof: { after: 7, base: 'photo', name: 'Photograph: a Band on a Flatbed, 1963',
      note: 'Five men, one truck, one guitar held up to the camera. The headstock is chipped on the left. So is yours.' },
    resolved: { name: "R.J. Calloway's Guitar", val: 3400,
      lines: ['You hold the photograph up to the guitar. The chip on the headstock. The same chip.',
              'Under the bridge: R.J. Amarillo \'63. The band in the picture is the Amarillo Kings.',
              'This is the guitar that walked out of the Red Mesa fire.'] },
  },
  mayorTypewriter: {
    town: 'dustyFlats', minDay: 6,
    anchor: { base: 'typewriter', name: 'Typewriter', val: 60,
      note: 'The M sticks. Somebody has written "damn M" on the underside, in pencil, many times.' },
    paper: { after: 3, headline: 'FORMER MAYOR\'S LOST MEMOIR "TYPED ON A MACHINE THAT STUCK ON M"',
      body: 'Mayor Hollis Brand wrote four hundred pages about Dusty Flats and never published them. "Every M was drawn in by hand," says his daughter. "He cursed that machine. He loved it more than the office." The manuscript is missing. So is the machine.',
      img: 'prov_mayor' },
    proof: { after: 7, base: 'photo', name: 'Photograph: a Man at a Desk, 1971',
      note: 'A man in a bolo tie at a typewriter, two fingers raised over the keys, mid-curse.' },
    resolved: { name: "Mayor Brand's Typewriter", val: 1400,
      lines: ['The desk in the photograph. The machine on it. The M key sitting a hair crooked, like yours.',
              'Four hundred pages of hand-drawn Ms came out of this thing.'] },
  },
};
function provState(world, id) {
  world.prov = world.prov || {};
  return (world.prov[id] = world.prov[id] || { planted: null, held: null, proofPlanted: null, resolved: null });
}
// what the director wants to plant today, if anything: {id, kind} or null
function provPlanFor(worldSeed, day, town, world) {
  for (const id in PROVENANCE) {
    const c = PROVENANCE[id], st = provState(world, id);
    const R = RNG(strHash('prov' + id + '_' + worldSeed + '_' + day));
    if (!st.planted && c.town === town.id && day >= c.minDay && R.chance(0.12)) return { id, kind: 'anchor' };
    if (st.held && !st.proofPlanted && day >= st.held + c.proof.after && R.chance(0.35)) return { id, kind: 'proof' };
  }
  return null;
}
// nightly: does the player hold the anchor yet? (the paper and the proof wait for this)
function provNightly() {
  for (const id in PROVENANCE) {
    const st = provState(G.world, id);
    if (!st.held && allHeld().some((it) => it.prov && it.prov.id === id && it.prov.kind === 'anchor')) st.held = G.day;
  }
}
// the paper's step, on the day it is due
function provPaper(day, world) {
  for (const id in PROVENANCE) {
    const c = PROVENANCE[id], st = (world.prov || {})[id];
    if (st && st.held && day === st.held + c.paper.after) {
      return { story: { id: 'prov_' + id, kind: 'provenance', headline: c.paper.headline, img: c.paper.img }, text: c.paper.body, unitKnown: false, named: null, about: null };
    }
  }
  return null;
}
// LOOK CLOSER at the anchor while holding the proof: the connection is made
function provTryResolve(it) {
  if (!it.prov || it.prov.kind !== 'anchor' || it.provResolved) return false;
  const c = PROVENANCE[it.prov.id];
  if (!c) return false;
  const proof = allHeld().find((o) => o.prov && o.prov.id === it.prov.id && o.prov.kind === 'proof');
  if (!proof) return false;
  for (const l of c.resolved.lines) ilog(l, PAL.gold);
  it.name = c.resolved.name; it.preName = null; it.hideBrand = false;
  it.val = c.resolved.val; it.searched = true; it.provResolved = true;
  provState(G.world, it.prov.id).resolved = G.day;
  recordEvent('provenance', { name: c.resolved.name, base: it.base, val: it.val });
  play('legendary_fanfare');
  return true;
}

// ============ keys ============
// Once an epoch, a key turns up in a box. A few days later, somewhere, a lock
// it fits. Both days are fixed by the seed, so the pair is fair, and nothing
// tells you they belong together but the shape of the key.
function keyPlanFor(worldSeed, day) {
  const epoch = Math.floor((day - 1) / 12);
  // a lock can fall in the epoch after its key, so both this epoch's pair and the last one's are checked
  for (const ep of [epoch, epoch - 1]) {
    if (ep < 0) continue;
    const R = RNG(strHash('keys' + worldSeed + '_' + ep));
    const keyDay = ep * 12 + R.i(1, 5);
    // never the same week: the waiting is the point. Capped at the epoch's last
    // day so the lock can never land on the next epoch's key day and be lost
    // (genDay takes one key plan a day, and the newer key would win).
    const lockDay = Math.min(keyDay + R.i(7, 11), ep * 12 + 12);
    const id = 'key' + ep;
    if (day === keyDay) return { id, kind: 'key' };
    if (day === lockDay) return { id, kind: 'lock' };
  }
  return null;
}
function heldKeyFor(it) {
  if (!it.keyId) return null;
  return allHeld().find((k) => k.base === 'oddKey' && k.keyId === it.keyId) || null;
}

// ============ junk personas ============
// A junk pile is still somebody's. Some days the generic junk steps aside for
// one person's things: nine lamps, a closed gym, the church sale nobody ended.
// No money in them. The point is that a person packed this. kit: [base, count]
// swapped in for loose junk of the same width, the front row first so the
// door says it; owner: the office's line at the peek; note: what LOOK CLOSER
// reads off one of them.
// `name` is the person behind the unit. The office never says it out loud and the
// yard panel never shows it — only their paperwork does, when you find some (ephemera.js).
const JUNK_PERSONAS = [
  { id: 'lampGuy', name: 'Wendell Corliss', owner: 'Tenant paid in exact change and asked if the unit had an outlet. It does not.',
    kit: [['lamp', 5], ['box', 1]], noteBase: 'lamp', note: 'A tag on the cord: "WORKS." Every lamp in here has a tag. One is telling the truth.',
    special: (placed, R) => { const lamps = placed.filter((it) => it.base === 'lamp'); if (lamps.length) { const l = R.pick(lamps); l.val = 40; l.note = 'This one works. The others are for parts, or for company.'; } } },
  { id: 'gymClosed', name: 'Marlene Kilgore', owner: 'Tenant ran a gym above the hardware store. Membership was "lifetime." So was the lease, briefly.',
    kit: [['mirror', 1], ['mattress', 1], ['bike', 1], ['tire', 1], ['fan', 1]], noteBase: 'mirror', note: 'A phrase painted across the glass: "NO EXCUSE\'S." It is still, somehow, motivating.' },
  { id: 'weddingHappened', name: 'Doreen Hartnett', owner: 'The unit was rented the Monday after the wedding. The card on file says "Mr. and Mrs." The signature says "Mrs."',
    kit: [['diningChair', 4], ['tablecloth', 2], ['vase', 1], ['teddy', 1]], noteBase: 'vase', note: 'The centerpiece. Forty were rented for the day. This is the one that was not returned.' },
  { id: 'tapeGuy', name: 'Curtis Yates', owner: 'Tenant recorded everything. The labels are dates. The dates are all Tuesdays.',
    kit: [['vhs', 4], ['cassettes', 2], ['tv', 1]], noteBase: 'vhs', note: 'Labelled by date and channel. Every Tuesday for six years. Nothing else, ever.' },
  { id: 'cook', name: 'Eugene Mabry', owner: 'Tenant ran a diner for eleven weeks. The menu is stapled inside the door. Everything was $4.',
    kit: [['microwave', 1], ['canCrate', 2], ['china', 1], ['barrel', 1]], noteBase: 'canCrate', note: 'Restaurant-size cans. Beans, beans, peaches, beans. Dated. Not this decade.' },
  { id: 'churchSale', name: 'Bernice Thorpe', owner: 'The church rented the unit for "the sale." The sale was in 1994. The unit was never given up.',
    kit: [['diningChair', 3], ['box', 2], ['painting', 1], ['records', 1]], noteBase: 'painting', note: 'A landscape, signed "Pastor Bill," with a $12 sticker. It did not sell in 1994 either.' },
  { id: 'modelRailroader', name: 'Arthur Selby', owner: 'Tenant built a town in here. The boxes are labelled by street. The streets are real. The town is not.',
    kit: [['box', 3], ['workbench', 1], ['lamp', 1], ['toolbox', 1]], noteBase: 'box', note: 'Labelled "MAIN ST — DO NOT TIP." Inside, presumably, Main Street.' },
  { id: 'ladderMan', name: 'Clifford Novak', owner: 'Tenant owned ladders. Only ladders. Neighbors say he never went up any of them.',
    kit: [['ladder', 3], ['toolbox', 1], ['tire', 1]], noteBase: 'ladder', note: 'Painted on the rail: "THE GOOD ONE." Every ladder in here says that.' },
];
// swap the kit in for loose junk of the same width, the front row first; returns true if anything landed
function applyPersona(R, items, p) {
  // anything loose and ordinary can step aside, empty boxes included (this runs before the boxes are filled)
  const victims = items.filter((it) => !it.set && !it.onUid && !it.stackedUid && !it.cash && !it.loot && !it.legendary && !it.fake)
    .sort((a, b) => (b.layer - a.layer) || (a.col - b.col));
  const placed = [];
  for (const [base, count] of p.kit) {
    for (let c = 0; c < count; c++) {
      const it = makeItem(base, R);
      const vi = victims.findIndex((v) => v.wCols >= it.wCols);
      if (vi < 0) continue;
      const v = victims.splice(vi, 1)[0];
      it.layer = v.layer; it.col = v.col;
      if (it.wCols > v.wCols) it.wCols = v.wCols;
      it.persona = p.id;
      items[items.indexOf(v)] = it;
      placed.push(it);
    }
  }
  if (!placed.length) return false;
  const target = placed.find((it) => it.base === p.noteBase) || placed[0];
  target.note = p.note;
  if (p.special) p.special(placed, R);
  return true;
}

// ============ the rare days ============
// About one morning in fifty. Four things, each about once in two hundred
// days: a raccoon living in a unit (LEAVE IT is the only button; the vest
// turns up in the van anyway), a door that is nothing but lamps and one of
// them works, the day Sal looks at a door and leaves ("dentist"), and the
// Baroness's chair, which is an ordinary chair with a plaque, and Carl pays
// double. Each gets one line in the next morning's paper. Nothing counts them.
const RARE_EVENTS = [
  { id: 'raccoon', apply: (R, lk) => {
    const it = swapInBase(R, lk.items, 'liveRaccoon');
    if (!it) return false;
    it.leaveOnly = true; it.note = 'It is looking at you. It has a receipt.';
    it.name = 'A Raccoon. Alive.'; it.preName = null; it.cond = 'Clean';   // no condition grade. He would object.
    lk.flavor2 = 'Something in the back row breathes.';
    placeFront(R, lk, 'droppings');                                        // and the front row says so, to anyone who reads it
    recomputeValue(lk);
    return true;
  } },
  { id: 'nineLamps', apply: (R, lk) => {
    // nine means nine: a door without nine loose ordinary things to step aside is not the door
    const room = lk.items.filter((it) => !it.set && !it.onUid && !it.stackedUid && !it.cash && !it.loot && !it.legendary && !it.fake && !it.note).length;
    if (room < 9) return false;
    const p = { id: 'nineLamps', kit: [['lamp', 9]], noteBase: 'lamp', note: 'The bulb is warm. Somebody was just here. Or the lamp does not care.',
      special: (placed, R2) => { const one = R2.pick(placed); one.tag = 'WORKS'; one.val = Math.max(one.val, 600); one.name = 'Working ' + one.name; } };
    if (!applyPersona(R, lk.items, p) || lk.items.filter((it) => it.base === 'lamp').length < 9) return false;
    lk.owner = 'Tenant is listed as "lamps." That is the whole entry.';
    recomputeValue(lk);
    return true;
  } },
  { id: 'salDentist' },   // a person, not a door: startAuction reads today.facts.rare
  { id: 'baroness', apply: (R, lk) => {
    const it = swapInBase(R, lk.items, 'armchair');
    if (!it) return false;
    it.baroness = true; it.name = "The Baroness's Chair"; it.preName = null;
    it.note = 'A brass plaque on the back: THE BARONESS. The county has never had one. The chair does not know that.';
    recomputeValue(lk);
    return true;
  } },
];

// ============ pairs ============
// Two ordinary things in one ordinary door whose details point at each other:
// the same date, the same initials, the same motel. One a day at most, on
// three days in ten. The player invents the story before the game says
// anything, which is the whole idea. a goes loose where junk was; b goes in an
// open container when there is one.
const PAIRS = [
  { id: 'motel', a: { base: 'photo', note: 'Two people outside the Sunset Motel, room 6. The back says 6/14/88.' },
    b: { base: 'ring', note: 'Engraved inside: "6/14/88 — room 6." Somebody kept the joke. Somebody kept the ring.' } },
  { id: 'tube', a: { base: 'wrench', note: 'Taped to the handle, a receipt: one tube, type 7A, "for the radio." Never fitted.' },
    b: { base: 'radio', note: 'The back is off. One tube missing, type 7A. Somebody got as far as the receipt.' } },
  { id: 'luggage', a: { base: 'teddy', note: 'A luggage tag on its paw: "BENT FORK — DO NOT LOSE." It was lost.' },
    b: { base: 'suitcase', note: 'The same luggage tag, torn: "— DO NOT LOSE." The other half is on something small.' } },
  { id: 'setlist', a: { base: 'amp', note: 'A setlist taped to the top. "Roy\'s, Friday. Do NOT play the long one."' },
    b: { base: 'guitarCase', note: 'Inside the lid, the same handwriting: "Roy\'s, Friday. LONG ONE." Underlined twice. They played it.' } },
  { id: 'initials', a: { base: 'pocketWatch', note: 'Engraved: "To H.L.F., forty years." The forty years are worn smooth.' },
    b: { base: 'brooch', note: 'On the back, in a different hand: "H.L.F. — from the other one."' } },
  { id: 'lowE', a: { base: 'typewriter', note: 'The E strikes low. Anything typed on this has a low E.' },
    b: { base: 'photo', note: 'A letter, photographed so it could not be lost. Every E sits low on the line. Signed "yours, still."' } },
  { id: 'diner', a: { base: 'china', note: 'Diner china. The rim says EAT in green. Somebody kept one plate.' },
    b: { base: 'silverware', note: 'Diner flatware, EAT stamped on every handle. Somebody took the whole drawer.' } },
  { id: 'bib41', a: { base: 'skis', note: 'Bib number 41 still safety-pinned to the strap. Kettle Basin Winter Classic, 1979.' },
    b: { base: 'medal', note: 'Kettle Basin Winter Classic, 1979. Third. The ribbon has been re-sewn twice.' } },
];
function recomputeValue(lk) {
  let v = 0;
  for (const it of lk.items) { v += it.val; if (it.loot) for (const l of it.loot) v += l.val; }
  lk.value = v;
}
function applyPair(R, lk, pair) {
  const items = lk.items;
  const a = swapInBase(R, items, pair.a.base);
  if (!a) return false;
  a.note = pair.a.note; a.pair = pair.id;
  // the other half hides in a container only if it would physically go in one
  const half = makeItem(pair.b.base, R);
  const open = items.filter((x) => x.container && x.loot && !x.locked && x !== a && canHold(x, half));
  if (open.length) {
    const b = half;
    b.note = pair.b.note; b.pair = pair.id;
    R.pick(open).loot.push(b);
  } else {
    const b = swapInBase(R, items, pair.b.base);
    // the first half is already swapped in by here, so backing out still changes the door
    if (!b) { a.note = null; a.pair = null; recomputeValue(lk); return false; }
    b.note = pair.b.note; b.pair = pair.id;
  }
  recomputeValue(lk);
  return true;
}

// ======================================================================
// js/clues.js
// ======================================================================
// ---- clues: what a thing tells you when you lift it, and what it says up close ----
// Nothing here is a stat. A box that rattles is a box that rattles; whether
// you stop and think about it is the game. Every line is seeded on the item,
// so the same box says the same thing every time you pick it up.


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

// ======================================================================
// lifted from js/stories.js: the places in town the drawer things mention
const TOWN_PLACES = { dustyFlats: ["the diner"] };
