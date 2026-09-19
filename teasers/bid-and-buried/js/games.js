// ---- the consoles, and the games that went in them ----
// Ten systems from the shelf of a certain decade, every one of them renamed a
// notch sideways, and ten games each, renamed the same way. A console is a
// container with one slot (a cartridge or a disc may be in it). A shoebox of
// cartridges opens like a pile of tapes, one at a time, with two or three
// keepers per system worth real money. Nothing here is the story. All of it
// was somebody's Saturday. Cover art slots: media/md_<art>.png (64x88).
'use strict';

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
