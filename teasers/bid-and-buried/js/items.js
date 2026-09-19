// ---- item definitions + instantiation ----
'use strict';

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
  // story-only (the tenant, day 12): never rolled into a locker or a want ad, only planted
  { id: 'bowlingTrophy', name: 'Bowling Trophy', cat: 'collectibles', val: 30, size: 1, spr: 'bowlingTrophy', storyOnly: true },
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
const SMALL_BASES = BASES.filter((b) => !b.big && !b.legendary && !b.setOnly && !b.storyOnly);
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
    it.brandM = Math.round(brandM * 100) / 100;   // recorded, so a pedigree claim can be struck back out to the plain thing (docs/APPRAISAL.md)
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
