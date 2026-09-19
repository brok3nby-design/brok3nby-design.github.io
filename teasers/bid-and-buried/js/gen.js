// ---- locker generation, contracts, archetypes, NPCs, buyers ----
// Generation runs in passes: contract -> furniture grammar -> set/cash injector
// -> tell/lie -> value clamp. Truth first, then the door.
'use strict';

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

// what a floor of bags says for itself at the door. None of these lies: the whole design rests on the
// player being able to see exactly what this is and choosing to bid on it anyway.
const HOARD_FLAVOR = [
  'Bags. Bags on bags. A path worn down the middle of them.',
  'Nothing in here is in a box that was made for it.',
  'Stacked to the ceiling, and none of it stacked well.',
  'The smell reaches the doorway. So does the sight.',
  'Somebody kept everything. Everything is still here.',
];
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
  const w = { junkPile: 16, themeShowcase: 26, setTease: 6, setTrap: 3, cashBox: 8, emptyFlex: 5, hoard: 5 };
  if (flush) { w.emptyFlex += 7; w.setTrap += 5; w.hoard += 3; }   // a rich player has earned a floor full of bags
  if (town.tier >= 1) { w.setTrap += 2; w.emptyFlex += 2; w.hoard += 4; }   // meaner yards play meaner games
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
  if (arch.dupesFor && arch.dupesFor.includes(id)) return 5;   // a blend: only the half that repeats may repeat
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
// the same as placeFront, but out of sight: the office's planted want ad thing, put where the peek cannot
// read it (layer 0 or 1). IDEAS_TODO 8 - a wanted thing sitting in the front row reads as a fetch quest.
function placeDeep(R, lk, baseId) {
  const items = lk.items;
  const cols = lk.cols || 8;
  const layer = R.chance(0.5) ? 0 : 1;
  const taken = new Set();
  for (const it of items) if (it.layer === layer && !it.onUid) for (let c = it.col; c < it.col + it.wCols; c++) taken.add(c);
  const free = [];
  for (let c = 0; c < cols; c++) if (!taken.has(c)) free.push(c);
  const it = makeItem(baseId, R);
  it.wCols = 1;
  // swap for a worthless thing FIRST, unlike placeFront. The back layers usually have room, so appending
  // here would quietly inflate the door past the day's value cap — which it did, on chromeSprings day 6.
  const victims = items.filter((o) => o.layer === layer && !o.set && !o.container && !o.legendary && !o.note && !o.pair && !o.persona && !o.stackedUid && !o.onUid && o.wCols === 1 && (o.cat === 'junk' || o.val < 30));
  if (victims.length) {
    const v = R.pick(victims);
    it.layer = layer; it.col = v.col;
    items[items.indexOf(v)] = it;
    return it;
  }
  if (free.length) { it.layer = layer; it.col = R.pick(free); items.push(it); return it; }
  return null;
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
    // It was `a.allowDupes || b.allowDupes`, so a grandma's unit with an office clear-out blended in got
    // the office's licence to repeat for EVERYTHING — two paintings, two radios, three typewriters loose in
    // one room, which reads as a copy-paste rather than somebody's life. Office surplus repeats its own
    // stock (five of the same chair is exactly what a clear-out looks like); the other half does not.
    // 37 of the 44 doubled items the sweep flagged were this (2026-09-18).
    allowDupes: !!a.allowDupes,
    dupesFor: a.allowDupes ? null : (b.allowDupes ? b.theme.map((p) => p[0]) : null),
  });
}
function genLocker(R, num, legendsLeft, plan) {
  const trueArch = ARCHETYPES[plan.archId];
  const blend = plan.blendArch ? ARCHETYPES[plan.blendArch] : null;
  const arch = blend ? blendedArch(trueArch, blend) : trueArch;
  const used = {};
  const emptyFlex = plan.contract === 'emptyFlex';
  // ---- the hoarder's unit (IDEAS_TODO 4; the user's idea, 2026-09-17) ----
  // "some of the odd lockers can be just full of garbage. There might be one or two valuable items."
  // It is the exact inverse of the empty flex above: that one dresses the FRONT row and leaves air behind
  // it, and this one puts the rubbish where you can see it and hides the one real thing at the back.
  // Two rules it lives by, and neither is negotiable:
  //   1. It must be legible from the doorway. A wall of bags reads instantly in pixel art, so bidding one
  //      up is your own fault and watching a rival win it is funny rather than unfair. Hence 0.97 at layer 2.
  //   2. The good thing is hidden, and it is REAL. All junk and nothing else is a lose button, not a door.
  // It is the partner to the haul-off bill: the one unit that can cost you twice, once at the paddle and
  // again when the yard clears sixty bulk of bags you were never going to carry. The purchase itself is
  // cheap, because the room can see what it is too and nobody runs you up; the real price is the energy to
  // go through it, and the gamble is whether you find the one thing before the light goes.
  const hoard = plan.contract === 'hoard';
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
    // empty flex: the front row is dressed up, the back is a shrug. The hoard is that trick backwards.
    const js = emptyFlex ? (L === 2 ? 0.05 : 0.9) : (hoard ? (L === 2 ? 0.97 : 0.92) : baseJunk);
    // and a hoarder repeats himself: without this the duplicate cap allows three bags and calls it a hoard
    items.push(...packLayerR(R, hoard ? Object.assign({}, arch, { allowDupes: true }) : arch, L, fillN[0], fillN[1], used, reserved[L], js, cols));
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
  let flavor = story ? story.flavor : R.pick(hoard ? HOARD_FLAVOR : arch.flavor);
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
  // a persona is a THEMED junk pile (the lamp man, the ladder man) and a hoard is the opposite idea - a floor
  // of anonymous bags - so the two never share a door. Letting them overlap swapped the wall of bags out for
  // a kit of lamps, which is precisely the thing the hoard has to be legible as.
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

  // -- the hoarder's one or two: forced, because a floor of bags with nothing in it is a lose button --
  if (hoard) {
    const openC = containers.filter((it) => !it.locked);
    const pref = openC.filter((it) => ['garbage', 'box', 'boxSmall', 'crate', 'suitcase'].includes(it.base));
    const pool = (pref.length ? pref : openC).slice();
    const n = R.chance(0.35) ? 2 : 1;
    // A GOOD FIND, NOT A JACKPOT, and the clamp is the whole balance of the door. Left as a plain multiple
    // of the base item the gold bar and the gem in SLEEPER_POOL came out at $1,538 on average and $10,842 at
    // the top, which made a floor of bags the richest door in the game and stood the idea on its head.
    // This band is worth the afternoon it costs to go through the bags, and never worth more than the door.
    // in PRE-multiplier money: every val in here is multiplied by arch.valueMult x priceMult further down,
    // so applying the town's own multiplier here as well counted it twice and put $9,216 in a bin bag.
    for (let k = 0; k < n; k++) {
      const sp = makeItem(R.wpick(SLEEPER_POOL), R);
      sp.val = Math.max(180, Math.min(900, Math.round(sp.val * R.r(2.6, 4.2))));
      sp.sleeper = true;
      if (pool.length) {                              // in a bag, where hands find it and a price list does not
        const tgt = pool.splice(Math.floor(R.f() * pool.length), 1)[0];
        tgt.loot = tgt.loot || [];
        tgt.loot.push(sp);
      } else {
        // nothing open to hide it in: it goes loose in the dark at the back instead, which is still hidden
        sp.layer = 0; sp.wCols = 1; sp.col = R.i(0, (plan.cols || LOCKER_COLS) - 1);
        items.push(sp);
      }
    }
  }
  // -- the sleeper: a junk unit with one good small thing in a bag. Salt Lick's whole lesson. --
  const sleeperRate = townRule('sleeperRate', town);
  if (sleeperRate > 0 && !plan.myth && !emptyFlex && !hoard && (plan.contract === 'junkPile' || baseJunk >= 0.5) && R.chance(sleeperRate)) {
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
    hoard: plan.contract === 'hoard',
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
// Cody & Kaylee's week apart (memory.js, duoSplitTick): the pair's one paddle becomes two, and each prices a door their
// own way. Not in the roster or the Ledger: prepNpcsForAuction puts them where the pair would stand, those days only.
// Each goes past their own number when the other one has the lead (spiteOn), never to spite you.
const DUO_HALVES = {
  cody: { id: 'cody', name: 'Cody', splitFrom: 'duo', other: 'kaylee', tag: 'on his own this week. bids the tools',
    noise: [0.75, 1.25], capMult: 0.5, press: 1, raise: [25, 50], joinChance: 0.5, budget: 1100,
    wants: (lk) => catShare(lk, ['tools', 'electronics']) >= 0.4,
    est: (lk) => lk.value * (catShare(lk, ['tools', 'electronics']) >= 0.4 ? 1.35 : 1),
    lines: { raise: ['Cody bids on his own. He keeps looking at where Kaylee usually stands.', '"I got it. I GOT it." Cody raises. Nobody argues. He misses it.',
                     'Cody raises and checks the joint account. It is not joint this week.', '"It\'s a compressor. I KNOW it\'s a compressor." Raise.'],
             fold: ['Cody folds and texts somebody. It is Kaylee. She does not answer.', '"Whatever. It was a box." Cody is out. He sounds like her.',
                    'Cody puts the paddle down and has nobody to blame for it.'],
             win: ['Cody wins it and turns to say something to Kaylee. She is not there.', '"MINE." Cody takes it. Across the room, Kaylee claps, slowly.'] },
    over: ['"That one\'s MINE." Cody raises over Kaylee without looking at her.', 'Cody raises over Kaylee. She says something the auctioneer pretends not to hear.',
           '"For the SHOP." Cody bids over Kaylee. There is still no shop.', 'Cody jumps in over Kaylee and looks very pleased with himself for a second.'] },
  kaylee: { id: 'kaylee', name: 'Kaylee', splitFrom: 'duo', other: 'cody', tag: 'on her own this week. bids the little boxes',
    noise: [0.75, 1.25], capMult: 0.5, press: 1, raise: [25, 50], joinChance: 0.5, budget: 1100,
    wants: (lk) => catShare(lk, ['jewelry', 'collectibles', 'antiques']) >= 0.35,
    est: (lk) => lk.value * (catShare(lk, ['jewelry', 'collectibles', 'antiques']) >= 0.35 ? 1.35 : 1),
    lines: { raise: ['Kaylee raises with her own paddle. She had it made.', '"I do not need a second opinion." Kaylee bids.',
                     'Kaylee bids without looking at the tools. On purpose.', 'Kaylee raises and takes a photo of the door for nobody.'],
             fold: ['Kaylee folds and writes something in her phone. Probably a list.', '"Not worth it. Tell HIM that." Kaylee is out.',
                    'Kaylee sits down with her arms crossed. That is a fold.'],
             win: ['Kaylee wins it and looks right at Cody.', '"Sold to ME." Kaylee pays in exact change.'] },
    over: ['Kaylee raises over Cody and waves at him with the paddle.', '"Oh, you want it? Cute." Kaylee bids over Cody.',
           'Kaylee bids over Cody without turning around. She knows it is him.', '"We are NOT doing this." Kaylee does this, over Cody.'] },
};
// the phone bidder (an interruption, game.js): an absentee on Buzz's line. Prices the door off what is really in it (it
// read the catalogue), raises one step at a time, a beat late, and shows nothing: there is no face to read.
const PHONE_DEF = { id: 'phone', name: 'The Phone', tag: "an absentee bid on Buzz's line", phone: true,
  noise: [0.85, 1.25], capMult: 0.65, press: 0, raise: [25, 25], joinChance: 0, budget: 3000,
  lines: { raise: ['Buzz, into the receiver: "Yes? Yes." He holds up a finger. The phone bids.', 'A long pause on the line. Then Buzz nods. The phone is in.',
                   'Buzz covers the receiver. "They say yes." Raise.', '"Hold on, folks." Buzz listens. "The phone says one more."'],
           fold: ['Buzz listens, nods, and hangs up. The phone is out.', '"They said, and I quote, absolutely not." The phone is done.'],
           win: ['"Sold, to the phone." Buzz writes down a name he will not read out.', 'Buzz, into the receiver: "It is yours." Somebody somewhere is pleased.'] } };
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

// ---- day wallets (docs/AUCTION_OVERHAUL_2.md step 1): a rival arrives with the day's money, and
// what they pay for one door on the row is gone for the next. Read off the day's facts, so a
// reload mid-day agrees with itself: a door you lost to them ('lost') or one that sold
// without you ('soldWithout'), in this town, today.
function rivalSpentToday(id, world, day) {
  const w = world || G.world, d = day == null ? G.day : day;
  let n = 0;
  for (const e of (w && w.events) || []) if (e.day === d && e.town === w.town && e.rival === id && (e.k === 'lost' || e.k === 'soldWithout' || e.k === 'partnered')) n += e.bid || 0;
  return n;
}
function rivalWallet(n, pm, world, day, locker) {
  const full = Math.round(n.budget * pm);
  const spent = rivalSpentToday(n.id, world, day);
  const beaten = ((world && world.events) || []).some((e) => e.k === 'won' && e.day === day && e.town === world.town && (e.fought || []).includes(n.id));
  const row = (G.today && G.today.lockers) || [];
  const i = row.indexOf(locker);
  const lastDoor = i >= 0 && row.slice(i + 1).every((d) => d.won || d.sold || d.passed);
  return { full, spent, left: Math.max(0, full - spent), beaten, lastDoor };
}
// ---- feuds: two people who see each other at the same yard three times a week (2026-09-16) ----
// A feud is a fact about a TOWN, not about you: its two locals have been at this since long before you
// pulled in, and a world keeps the same pair for good. It does not fire every time they share a room —
// that would be noise by the second week — it catches on about a third of the doors they both want.
// When it catches they aim past their own numbers at EACH OTHER (spiteOn, the same machinery Cody and
// Kaylee use during their week apart), never at you, so the price runs away from both of them and you
// can stand back and let it. What makes it yours is SAY SOMETHING: you can pour fuel on it, and they
// both know who did (sayLine 'feud'). The cards at the end say who was really paying for whom.
const FEUD_TOWNS = 0.6, FEUD_CHANCE = 0.35;
const FEUD_TRAVELLERS = ['bart', 'ed', 'dutch'];      // never Sal (he has spite of his own) or the duo (their arc)
function feudPairFor(townId) {
  const t = TOWNS[townId];
  if (!t) return null;
  const R = RNG(strHash('feud_' + (G && G.worldSeed) + '_' + townId));
  if (!R.chance(FEUD_TOWNS)) return null;             // not every town has one
  const locals = (t.rivals || []).filter(Boolean);
  if (locals.length >= 2) return R.chance(0.75) ? [locals[0], locals[1]] : [locals[R.i(0, locals.length - 1)], R.pick(FEUD_TRAVELLERS)];
  const trav = R.shuf(FEUD_TRAVELLERS.slice());
  return [trav[0], trav[1]];
}
// does it catch on this door? Seeded on the unit, so a reload finds the same room
function feudLitOn(locker, day) {
  return RNG(strHash('feudday_' + (G && G.worldSeed) + '_' + (day || 0) + '_' + (locker ? locker.num : 0))).chance(FEUD_CHANCE);
}
// both of them in the room, and today is a day for it: point them at each other
function applyFeud(list, locker, world, day) {
  if (!world || world.noArcs) return null;            // demo states are fixed pictures, like every other beat
  const town = TOWNS[(world && world.town) || 'dustyFlats'] || TOWNS.dustyFlats;
  const pair = feudPairFor(town.id);
  if (!pair || pair[0] === pair[1]) return null;
  const a = list.find((x) => !x.crowd && x.active && x.def.id === pair[0] && !x.def.splitFrom);
  const b = list.find((x) => !x.crowd && x.active && x.def.id === pair[1] && !x.def.splitFrom);
  if (!a || !b || !feudLitOn(locker, day)) return null;
  for (const [one, other] of [[a, b], [b, a]]) {
    one.spiteOn = other.def.id;
    one.feud = other.def.id;
    one.spiteCap = Math.min(one.budgetCap || Infinity, Math.max(one.spiteCap || 0, Math.round((one.cap || one.est || 0) * 1.4)));
  }
  return [a, b];
}
function prepNpcsForAuction(locker, R, world, day, opts) {
  const mem = (world && world.rivalMem) || {};
  const town = TOWNS[(world && world.town) || 'dustyFlats'] || TOWNS.dustyFlats;
  const vis = visibleValue(locker);
  const pm = town.priceMult || 1;
  let roster = NPCS.concat((town.rivals || []).map((id) => EXTRA_NPCS[id]).filter(Boolean));
  // Cody and Kaylee's week apart: two paddles where the pair's one stood
  if (typeof duoSplitOn === 'function' && duoSplitOn(world, day)) roster = roster.reduce((acc, n) => acc.concat(n.id === 'duo' ? [DUO_HALVES.cody, DUO_HALVES.kaylee] : [n]), []);
  // somebody is away this week: not a quieter paddle, no paddle at all. The room is one face short and you can feel it.
  if (typeof awayOn === 'function') roster = roster.filter((n) => !awayOn(n.id, world, day));
  // does this door play to what you always buy, on a day the room is allowed to say so?
  const read = (G.today && G.today.facts && G.today.facts.readDay) ? doorMatchesHabit(locker) : [];
  const spread = townRule('noiseSpread', town);      // Salt Lick: everybody guesses louder (Ed excepted)
  // the yard's name for you (step 2): a whale gets run up on purpose, a shark gets folded on early.
  // Not on a door that sells without you (opts.without): the name is about you being in the room.
  const yname = (!(opts && opts.without) && typeof yardName === 'function') ? yardName((world && world.doorLog) || []) : null;
  const repMult = yname === 'shark' ? 0.9 : 1;
  const list = roster.map((n) => {
    let join = (n.wants && n.wants(locker)) ? Math.max(n.joinChance, 0.9) : n.joinChance;   // Cody or Kaylee on their own comes out for their kind of door
    let spiteMult = n.spiteMult || 0;
    // Bart only leaves the truck when the door looks embarrassing
    if (n.id === 'bart') join = bartBrokeOn(world, day) ? 0.85 : (vis >= 240 * pm ? 0.9 : 0.12);   // the truck in the shop: he comes to every door
    // Bart's truck came back and he remembers who took a door he needed that week
    if (n.id === 'bart' && (mem.bartGrudgeUntil || 0) >= (day || 0)) { join = Math.max(join, 0.95); spiteMult = Math.max(spiteMult, 0.6); }
    // the clerk's warning (day 6): Bart has been asking about your number, and for three days he comes to see for himself
    if (n.id === 'bart' && !(opts && opts.without) && (mem.bartAskingUntil || 0) >= (day || 0)) { join = Math.max(join, 0.75); spiteMult = Math.max(spiteMult, 0.4); }
    // Cody and Kaylee made up over you: for a week they come out for your doors and run you up
    if (n.id === 'duo' && (mem.duoGrudgeUntil || 0) >= (day || 0)) { join = Math.max(join, 0.9); spiteMult = Math.max(spiteMult, 0.6); }
    if (n.splitFrom) spiteMult = Math.max(spiteMult, 0.8);            // the week apart: past their own number to beat the other one
    // you took a side in their week (IDEAS_TODO 7): the one you backed goes easy on your doors, and the
    // one you crossed comes out for them. This is the whole cost of the ask - it is paid in the room, all week.
    // `aboutYou` is declared further down this function, so the test is spelled out here rather than reached forward to
    if (n.splitFrom && !(opts && opts.without) && typeof duoSideNow === 'function') {
      const side = duoSideNow(world, day);
      if (side === n.id) spiteMult = 0;
      else if (side && side === n.other) { join = Math.max(join, 0.9); spiteMult = Math.max(spiteMult, 0.9); }
    }
    // Sal remembers getting sniped. For a few days, loudly.
    if (n.id === 'sal' && (mem.salGrudgeUntil || 0) >= (day || 0)) { join = 0.95; spiteMult = 0.8; }
    // Sal has read you: a door with your kind of thing on it brings him out, and up
    if (n.id === 'sal' && read.length) { join = Math.max(join, 0.9); spiteMult = Math.max(spiteMult, 0.7); }
    // a face you have worked on (called out, run up, lied to) comes out for your doors and bids you up
    const stnd = (typeof standingOf === 'function') ? standingOf(n.id) : 0;
    if (stnd <= -2) { join = Math.max(join, 0.8); spiteMult = Math.max(spiteMult, stnd <= -4 ? 0.8 : 0.6); }
    if (yname === 'whale') spiteMult = Math.max(spiteMult, 0.55);
    // just back from a week away: a full wallet and a week of doors to make up. They come out, and they come out high.
    const hungry = (typeof awayHungryOn === 'function') && awayHungryOn(n.id, world, day);
    if (hungry) join = Math.max(join, 0.9);
    // some people only come out for one auctioneer, or for one kind of door
    if (n.under) { const a = curAuctioneer(day); if (n.under[a.id] !== undefined) join = n.under[a.id]; }
    if (n.join) join = n.join(locker);
    // IDEAS_TODO 9: their own unit is on the row. They are at the rope, not bidding — not being able to pay
    // is the whole reason it is up there. This sits after n.join so nothing can put them back in the room.
    if (locker && locker.rivalUnit === n.id) join = 0;
    // the opening deals the room as well as the doors
    const op = openingRoster(locker, day);
    if (op && op[n.id] !== undefined) join = op[n.id] ? 1 : 0;
    if (typeof stormOn === 'function' && stormOn(world, day)) join *= STORM_JOIN;   // the storm (day 21): half the yard stayed home
    // most people price the unit. Some price the boxes, or the weight. Item
    // values already carry the town's prices, so only an estimate built from
    // something else (Pruitt's dollars per pound) is scaled up for the town.
    const sp = n.id === 'ed' ? 1 : spread;
    const nz = (n.id === 'ed' && edNotebookGone(world, day)) ? [0.55, 1.5] : n.noise;   // Ed without his notebook: a guess
    const est = (n.est ? n.est(locker) * (n.estRaw ? pm : 1) : locker.value) * R.r(1 - (1 - nz[0]) * sp, 1 + (nz[1] - 1) * sp);
    // what they already paid for an earlier door on this row is not in their pocket for this one
    // (the opening's dealt days keep full wallets: the teaching rooms stay as dealt)
    const fullWallet = Math.round(n.budget * pm);
    const wallet = openingDay(world, town, day) ? { full: fullWallet, spent: 0, left: fullWallet, beaten: false, lastDoor: false } : rivalWallet(n, pm, world, day, locker);
    const budgetCap = (n.id === 'bart' && bartBrokeOn(world, day)) ? Math.min(wallet.left, Math.round(wallet.full * 0.2)) : wallet.left;   // the shop has the rest of it
    let broke = false;
    if (budgetCap < (locker.minBid || 0)) { broke = join >= 0.5; join = 0; }   // spent out: stays in the truck (the roll below still draws)
    // bought already today: warier the rest of the morning. Beaten by you earlier: hotter on the last door
    const mood = wallet.spent > 0 ? 0.8 : ((wallet.beaten && wallet.lastDoor) ? 1.1 : 1);
    // postures (step 4), about you being in the room, so never on a door that sells without you:
    // a day you went LOUD marks you as money in this town (+10%, Sal's spite on); a week as the
    // yard's bully puts a little spite in everybody; a known sniper is hated by a few faces
    const aboutYou = !(opts && opts.without);
    const marked = aboutYou && !!(G.today && G.today.markedMoney);
    if (aboutYou && ((marked && n.id === 'sal') || (mem.bullyUntil || 0) >= (day || 0))) spiteMult = Math.max(spiteMult, 0.5);
    if (aboutYou && (mem.sniperUntil || 0) >= (day || 0) && ['sal', 'dutch', 'bart', 'dex'].includes(n.id)) spiteMult = Math.max(spiteMult, 0.6);
    const moneyMult = marked ? 1.1 : 1;
    if (aboutYou && G.today && G.today.coffee) spiteMult *= 0.5;          // coffee for the room (an office favour): they go easier on you today
    // somebody who owes you - inside one of the arcs' own windows, or simply warm to you - backs off you today
    const owes = aboutYou && (typeof owesYou === 'function') && owesYou(n.id, day || 0);
    if (owes) spiteMult = 0;
    // how they have been doing against you lately: cocky goes a little further and pushes once more, wary stops a little short
    const stance = (typeof rivalStance === 'function') ? rivalStance(n.id, day) : null;
    const stanceCap = (stance === 'cocky' ? 0.05 : (stance === 'wary' ? -0.05 : 0)) + (stnd <= -4 ? 0.1 : 0);   // one who has it in for you goes a little past
    const entry = {
      def: n,
      est,
      cap: Math.min(budgetCap, Math.round(est * (n.capMult + townRule('rivalCapBonus', town) + stanceCap) * mood * repMult * moneyMult * (owes ? 0.85 : 1) * (hungry ? AWAY_HUNGRY : 1))),
      spiteCap: spiteMult ? Math.min(budgetCap, Math.round(est * spiteMult)) : 0,
      budgetCap,
      pressLeft: wallet.spent > 0 ? 0 : (n.press || 0) + (stance === 'cocky' ? 1 : 0) + (mood > 1 ? 1 : 0),
      stance,
      spentToday: wallet.spent,
      broke,
      active: R.chance(join),
      folded: false,
    };
    if (n.splitFrom) entry.spiteOn = n.other;
    return entry;
  });
  // the week after you sold Merle his trophy back, the crowd does not run you up much
  const liked = !(opts && opts.without) && (mem.townLikesUntil || 0) >= (day || 0);
  const wet = typeof stormOn === 'function' && stormOn(world, day);   // the storm: most of the folding chairs stayed home too
  applyFeud(list, locker, world, day);        // two locals who cannot let each other have one
  list.push({
    def: crowdDefFor(town), crowd: true, est: 0,
    cap: Math.round(R.i(3, 9) * 25 * (town.crowdCapMult || 1) * (liked ? 0.5 : 1) * (wet ? 0.5 : 1)),
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
  // the week they are apart (memory.js, duoSplitTick)
  duoApart: [
    'Cody is at this door. Kaylee is at this door. They are standing as far apart as the door allows.',
    'Cody and Kaylee both want this one, separately. Whoever gets in the middle pays for it.',
    'Kaylee saw Cody looking at this door and came straight over to look at it harder.',
  ],
  codyAlone: [
    'Cody has his hands on his hips at this door. Nobody is here to tell him it is a box.',
    'Cody is saying "compressor" at this door to nobody in particular.',
  ],
  kayleeAlone: [
    'Kaylee took a photo of this door and sent it to nobody.',
    'Kaylee has her arms crossed at this door. Cody is not here to groan about it.',
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
  if (day && world && edNotebookGone(world, day)) return null;             // no notebook, nothing to read off him
  const owes = !!(day && (mem.edOwesUntil || 0) >= day);                    // you gave it back: he never plays you
  const tier = edTier(locker);
  // taken too many of his units: half the time the notebook closes, half the
  // time it stays open and lies. Ed wants you to THINK he saw something.
  // ...and a player who follows Ed everywhere gets a false trail one time in four
  const shadowed = day && world && playerHabits().followsEd && RNG(strHash('edshadow' + (G && G.worldSeed) + '_' + day + '_' + locker.num)).chance(0.25);
  if (!owes && (((mem.edQuietUntil || 0) >= (day || 0) && day) || shadowed)) {
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
  if (typeof duoSplitOn === 'function' && duoSplitOn(world, day)) {   // their week apart: the same two tastes, from opposite ends of the row
    if (cody && kaylee) opts.push('duoApart');
    else if (cody) opts.push('codyAlone');
    else if (kaylee) opts.push('kayleeAlone');
  } else if (cody && kaylee) opts.push('duoSplit');
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
  // the certified appraiser (docs/APPRAISAL.md §4): buys nothing, vouches for anything, charges by the look
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
    if (contract === 'hoard') archId = 'hoarder';         // it is a hoarder's unit or it is nothing
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
