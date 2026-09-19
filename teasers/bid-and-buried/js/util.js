// ---- utilities: seeded RNG, formatting, helpers ----
'use strict';

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

// a thing's name with the right word in front of it, for a sentence that starts with it: "A Radio",
// "An Armchair", "Trading Cards" (a plural takes none), and a name that brings its own article keeps it —
// "A Tiny Vest, Neatly Folded", not "A A Tiny Vest" (the want ad printed exactly that; user, 2026-09-18).
// The noun that counts is the one before " of ": "A Crate of Records", "A String of Pearls".
function aThing(name) {
  const n = String(name || '').trim();
  if (/^(a|an|the|some)\s/i.test(n)) return n;
  const head = n.split(/\s+of\s+/i)[0].trim().split(/\s+/).pop() || '';
  if (/[^s]s$/i.test(head)) return n;                       // plural: "Trading Cards", "Skis"
  if (/^(uni|use|usu|eu|one)/i.test(n)) return 'A ' + n;    // a vowel that sounds like a Y or a W
  return (/^[aeiou]/i.test(n) ? 'An ' : 'A ') + n;
}
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
