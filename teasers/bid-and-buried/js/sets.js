// ---- collectible sets: one loud piece, dull matching pieces, tiny proofs ----
// A lonely set piece is almost normal value. Completing the set is the spike.
// The yard never names a set. Appraisal at home is where the brand slaps you.
'use strict';

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
