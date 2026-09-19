// ---- the toolbox: physical objects, not a skill tree ----
// Tools query facts the generator already wrote. They never reroll a locker.
// They arrive as classified ads at the general store, or turn up in units.
'use strict';

const TOOLS = {
  flashlight: {
    name: 'Flashlight', price: 45, spr: 'toolFlashlight',
    blurb: 'point it into the dark: shapes where you shine it, faint outlines right to the back wall',
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
  // late: the arrangement with Pete. What you leave behind the door he has always cleared for nothing;
  // with this he weighs it and pays you on the way out. A folded card in the glovebox, hence the page.
  peteDeal: {
    name: "Pete's Standing Offer", price: 150, spr: 'toolNotes',
    blurb: 'what you leave in the unit, he pays for by the pound instead of clearing it for free',
    ad: 'PAWN PETE — STANDING OFFER, {price}. Whatever you leave behind the door, I weigh it and I pay you for it. You were leaving it anyway.',
  },
  // late: the eye (IDEAS_TODO 1b, the user's idea). Not a torch and not a loupe. The torch turns the second
  // row into shapes and the loupe reads a thing you can already see; this names ONE thing past the front row
  // outright, and it goes for the thing that most changes what the door is worth - not the nearest, not the
  // biggest. It is WRONG about a quarter of the time, and when it is wrong it names a real thing back there
  // that simply is not the one that matters, because an eye is a judgement and not a manifest. It shares the
  // loupe's sprite, the way Pete's offer shares the notes one.
  goodEye: {
    name: 'An Eye For It', price: 300, spr: 'toolLoupe',
    blurb: 'names one thing past the front row. wrong about a quarter of the time',
    ad: 'ESTATE BUYER RETIRING \u2014 {price} takes the notebooks, the glass and, he says, "the eye." No refunds on the last one.',
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
const TOOL_UNLOCK = { flashlight: 2, mirror: 4, loupe: 6, metalDetector: 8, catalog: 10, peteDeal: 12, goodEye: 14, hiredHand: 16 };

function hasTool(id) { return G.world.tools.includes(id); }

// found in a unit: an unowned tool goes straight into the toolbox
function tryToolPickup(l) {
  if (!l.tool || G.world.tools.includes(l.tool)) return false;
  G.world.tools.push(l.tool);
  return true;
}

// ---- peek queries ----
// what the eye (plus kit) can make of an item from the doorway
// What the doorway shows with nothing pointed at it. The flashlight is not in here any more (user,
// 2026-09-18): it was a switch that turned the whole second row into silhouettes at once, and now it is a torch
// you steer — shapes where you shine it, outlines as far as the back wall (torchLight, in game.js). The long
// look is the other half: it costs energy at this one door and shows the row behind the front PROPERLY.
function peekVisibility(it) {
  if (it.layer === 2) return 'full';
  if (G.cur && G.cur.mirrorUid === it.uid) return 'full';
  if (it.layer === 1 && G.cur && G.cur.longLook) return 'full';
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
