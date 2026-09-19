// Speck Studio — one editor, one visual language, thousands of creations.
//
// The rule that makes this a system rather than a pile of special cases:
//
//     BASE OBJECT  +  PLAYER VISUAL DESIGN  =  CUSTOMISED OBJECT
//
// A template owns everything about *gameplay* — its size, whether it blocks
// walking, what it is when placed in the world, what it costs. A design owns
// only *pixels*. Repainting a chair never makes it a different chair, and the
// editor never has to know what a chair is.
//
// Adding a new editable thing is therefore a content task: append a template
// below and the studio can already edit it, preview it, randomise it, save it
// and (if it's placeable) let the player put it down.
(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const specks = node ? require('./specks') : root.Specks;
  const props = node ? require('./props') : root.Props;
  if (node) module.exports = factory(specks, props);
  else root.Studio = factory(specks, props);
})(typeof self !== 'undefined' ? self : this, function (Specks, Props) {

  const FORMAT = 1;          // bump when the saved shape changes; migrate, never wipe
  const MAX_DESIGNS = 120;   // per player
  const MAX_COLORS = 62;     // one char each in the packed form
  const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const HEX = /^#[0-9a-f]{6}$/i;

  // ---- categories -----------------------------------------------------------
  const CATS = [
    { id: 'portrait', label: 'portraits', icon: '🧬', blurb: 'the close-up behind your one pixel' },
    { id: 'furniture', label: 'furniture', icon: '🪑', blurb: 'things to put in your home' },
    { id: 'decor', label: 'decor', icon: '🖼', blurb: 'rugs, paintings, banners, signs' },
    { id: 'yard', label: 'yard', icon: '🌿', blurb: 'fences, gates and paths — these join up to their neighbours on their own' },
    { id: 'prop', label: 'props', icon: '🗿', blurb: 'stones, tombs, ruins and leavings — what the world is dressed with' },
    { id: 'building', label: 'building', icon: '🚪', blurb: 'doors, windows, walls and trim' },
    { id: 'pattern', label: 'patterns', icon: '🧵', blurb: 'tiling cloth — the same weave can dress a rug, a banner and a bed' },
    { id: 'stamp', label: 'stamps', icon: '🔖', blurb: 'little marks to press onto anything you are making' },
    { id: 'palette', label: 'palettes', icon: '🎨', blurb: 'colours worth keeping — save a set, wear it on anything' },
    { id: 'emblem', label: 'emblems', icon: '🛡', blurb: 'your mark — for banners and, later, your territory' },
  ];

  // How a placed design behaves. This is the *gameplay* half of the equation and
  // it belongs to the template, never to the player's pixels.
  const BEHAVIOUR = {
    solid: { blocks: true, label: 'blocks the way' },
    pass: { blocks: false, label: 'you can walk over it' },
    door: { blocks: false, label: 'a doorway — walk through it' },
    wall: { blocks: true, label: 'a wall section' },
  };

  // ---- templates ------------------------------------------------------------
  const TPL = {};

  const PLACEABLE = ['furniture', 'decor', 'building', 'yard'];

  function T(def) {
    def.w = def.w || def.px[0].length;
    def.h = def.h || def.px.length;
    def.behaviour = def.behaviour || (PLACEABLE.includes(def.cat) ? 'solid' : null);
    def.place = PLACEABLE.includes(def.cat);
    if (!def.tags) def.tags = [];
    // `fieldChars` names the palette letters that make up an object's *cloth* —
    // the part a pattern is allowed to fill. It's resolved once, here, into
    // positions, because a design's letters get reassigned every time it's
    // packed but the shape of its cloth never moves.
    if (def.fieldChars) {
      def.field = [];
      for (let y = 0; y < def.h; y++) {
        for (let x = 0; x < def.w; x++) {
          if (def.fieldChars.includes(def.px[y][x])) def.field.push(y * def.w + x);
        }
      }
    }
    TPL[def.id] = def;
    return def;
  }

  // The first Specks. They were the game's original portraits and they stay
  // exactly what they were — now they're simply templates like everything else.
  const SPECK_SUB = {
    blob: 'weird', cat: 'animals', frog: 'animals', ghost: 'undead',
    mushroom: 'plants', robot: 'robots', bee: 'animals', slime: 'weird',
    owl: 'animals', crab: 'animals', star: 'objects', skull: 'undead',
    sprout: 'plants', snowman: 'objects', knight: 'people', bat: 'animals',
  };
  for (const sp of (Specks && Specks.SPECKS) || []) {
    T({
      id: sp.id, name: sp.name, cat: 'portrait', sub: SPECK_SUB[sp.id] || 'weird',
      pal: sp.pal, px: sp.px, origin: 'speck',
    });
  }

  // ---- more portraits -------------------------------------------------------
  const P = (id, name, sub, pal, px) => T({ id, name, cat: 'portrait', sub, pal, px });

  P('villager', 'Villager', 'people',
    { '.': null, s: '#e8c39e', h: '#6b4527', c: '#4a7c9b', e: '#12202c' }, [
    '............', '....hhhh....', '...hhhhhh...', '...hssssh...',
    '...seesse...', '...ssssss...', '...sssss....', '....cccc....',
    '...cccccc...', '...cccccc...', '....cc.cc...', '............']);

  P('miner', 'Miner', 'people',
    { '.': null, s: '#e8c39e', h: '#fbbf24', c: '#5b4636', e: '#12202c', l: '#fde047' }, [
    '............', '...hhhhhh...', '..hhhlhhhh..', '..hhhhhhhh..',
    '...ssssss...', '...seesse...', '...ssssss...', '....ssss....',
    '...cccccc...', '..cccccccc..', '..cc.cc.cc..', '............']);

  P('wizard', 'Wizard', 'people',
    { '.': null, r: '#7c3aed', s: '#e8c39e', w: '#e5e7eb', e: '#12202c', y: '#fde047' }, [
    '.....yy.....', '....rrrr....', '...rrrrrr...', '..rrrrrrrr..',
    '...ssssss...', '...seesse...', '...swwwws...', '...wwwwww...',
    '..rrwwwwrr..', '..rrrrrrrr..', '...rrrrrr...', '............']);

  P('archer', 'Archer', 'people',
    { '.': null, s: '#e8c39e', h: '#3f6b3a', c: '#4f6b3a', e: '#12202c', b: '#8a5f38' }, [
    '............', '....hhhh..b.', '...hhhhhh.b.', '...ssssss.b.',
    '...seesse.b.', '...ssssss.b.', '....ssss..b.', '...ccccc..b.',
    '..cccccc..b.', '..cccccc....', '...cc.cc....', '............']);

  P('fox', 'Fox', 'animals',
    { '.': null, a: '#f97316', w: '#fef3c7', e: '#12202c', n: '#1c1917' }, [
    '............', '..a......a..', '..aa....aa..', '..aaaaaaaa..',
    '.aaaaaaaaaa.', '.aaeaaaaeaa.', '.awaaaaaawa.', '..awwnnwwa..',
    '..awwwwwwa..', '...awwwwa...', '....aaaa....', '............']);

  P('turtle', 'Turtle', 'animals',
    { '.': null, s: '#3f6b3a', d: '#2b4a28', k: '#8fbf6a', e: '#12202c' }, [
    '............', '....ssss....', '..ssdssdss..', '.sdssddssds.',
    '.ssddssddss.', '.sdssddssds.', '..ssdssdss..', '..kksssskk..',
    '.kkekkkkekk.', '..kk....kk..', '............', '............']);

  P('snail', 'Snail', 'animals',
    { '.': null, s: '#c9a227', d: '#8a6f1a', b: '#a3e635', e: '#12202c' }, [
    '............', '..b......b..', '..b..sss.b..', '..b.sdddss..',
    '....sdssds..', '...bsdsdsd..', '...bsddds...', '..bbbsss....',
    '.bbebbbbb...', '.bbbbbbbbb..', '..bbbbbbb...', '............']);

  P('drone', 'Drone', 'robots',
    { '.': null, m: '#94a3b8', d: '#475569', e: '#38bdf8', y: '#fde047' }, [
    '............', '.dd......dd.', '.dmmd..dmmd.', '..dd....dd..',
    '....mmmm....', '...mddddm...', '...deeeed...', '...deyyed...',
    '...mddddm...', '....mmmm....', '.....dd.....', '............']);

  P('sentry', 'Sentry', 'robots',
    { '.': null, m: '#a8a29e', d: '#57534e', e: '#f87171', y: '#fbbf24' }, [
    '.....y......', '.....d......', '...mmmmmm...', '..mdddddm...',
    '..mdeeedm...', '..mddddddm..', '...mmmmmm...', '..mmdddmm...',
    '..mdmmmmdm..', '..mm....mm..', '..dd....dd..', '............']);

  P('dragonling', 'Dragonling', 'fantasy',
    { '.': null, s: '#16a34a', d: '#14532d', e: '#fde047', w: '#65a30d' }, [
    '............', '..d......d..', '..dd....dd..', '.wddssssddw.',
    '.wdssssssdw.', '.wseessseew.', '.wsssssssss.', '..sssddsss..',
    '..dssssssd..', '...dssssd...', '....d..d....', '............']);

  P('fairy', 'Fairy', 'fantasy',
    { '.': null, w: '#a5f3fc', s: '#fce7f3', h: '#f472b6', e: '#12202c' }, [
    '............', '....hhhh....', '...hssssh...', '...seesse...',
    'w..ssssss..w', 'ww..ssss..ww', 'www.hhhh.www', 'ww.hhhhhh.ww',
    'w..hhhhhh..w', '....hhhh....', '.....hh.....', '............']);

  P('golem', 'Golem', 'fantasy',
    { '.': null, r: '#78716c', d: '#44403c', e: '#22d3ee', m: '#a8a29e' }, [
    '............', '..rrrrrrrr..', '.rdrrrrrrdr.', '.rreerreerr.',
    '.rrrrrrrrrr.', '.rrmmrrmmrr.', '.rrrrrrrrrr.', 'rrrrddddrrrr',
    'rr.rrrrrrr.r', '...rrrrrr...', '...dd..dd...', '............']);

  P('imp', 'Imp', 'monsters',
    { '.': null, s: '#dc2626', d: '#7f1d1d', e: '#fde047', t: '#fef3c7' }, [
    '............', '..d......d..', '..dd....dd..', '...ssssss...',
    '..ssssssss..', '..seesssee..', '..ssssssss..', '..stttttts..',
    '...ssssss...', '..dssssssd..', '...d....d...', '............']);

  P('eyeball', 'Watcher', 'monsters',
    { '.': null, w: '#f8fafc', i: '#7c3aed', e: '#12202c', v: '#f87171' }, [
    '............', '....wwww....', '..wwwwwwww..', '.wwwwwwwwww.',
    '.wwwiiiiww.v', 'vwwiieeiiww.', '.wwiieeiiww.', 'v.wwiiiiww.v',
    '.wwwwwwwwww.', '..wwwwwwww..', '....wwww....', '............']);

  P('zombie', 'Zombie', 'undead',
    { '.': null, s: '#84cc16', d: '#3f6212', e: '#12202c', c: '#57534e' }, [
    '............', '...dddddd...', '..dssssssd..', '..ssssssss..',
    '..seessess..', '..ssssssss..', '..sdssssds..', '...cccccc...',
    '..cccccccc..', 'ss.cccccc.ss', '...cc..cc...', '............']);

  P('wraith', 'Wraith', 'undead',
    { '.': null, m: '#475569', l: '#94a3b8', e: '#22d3ee' }, [
    '............', '....llll....', '...llllll...', '..lmmmmmml..',
    '..leemmeel..', '..mmmmmmmm..', '..mmmmmmmm..', '.mmmmmmmmmm.',
    '.m.mmmmmm.m.', '..m.m..m.m..', '............', '............']);

  P('cactus', 'Cactus', 'plants',
    { '.': null, g: '#16a34a', d: '#14532d', f: '#f472b6', e: '#12202c' }, [
    '.....f......', '....ggg.....', '.g..ggg..g..', 'ggg.ggg.ggg.',
    'gdg.ggg.gdg.', 'ggggggggggg.', '.gg.ggg.gg..', '....geg.....',
    '....ggg.....', '....ggg.....', '...ddddd....', '............']);

  P('flower', 'Bloom', 'plants',
    { '.': null, p: '#f472b6', y: '#fde047', g: '#4d9e3f', d: '#2f6b28' }, [
    '............', '....pppp....', '...pppppp...', '..ppyyyypp..',
    '..ppyyyypp..', '...pppppp...', '....pppp....', '.....gg.....',
    '...g.gg.g...', '...gg.ggg...', '....dddd....', '............']);

  P('lantern', 'Lantern', 'objects',
    { '.': null, m: '#a16207', g: '#fef08a', f: '#f59e0b', d: '#451a03' }, [
    '.....mm.....', '....mddm....', '...mmmmmm...', '...mggggm...',
    '...gffffg...', '...gffffg...', '...gffffg...', '...mggggm...',
    '...mmmmmm...', '....mddm....', '............', '............']);

  P('gem', 'Gem', 'objects',
    { '.': null, a: '#22d3ee', b: '#0e7490', w: '#cffafe' }, [
    '............', '....aaaa....', '...awwwwa...', '..awwaabba..',
    '.awwaaabbba.', '.awaaabbbba.', '.aaaabbbbba.', '..abbbbbba..',
    '...abbbba...', '....abba....', '.....aa.....', '............']);

  P('cloud', 'Drifter', 'weird',
    { '.': null, w: '#e5e7eb', g: '#94a3b8', e: '#12202c' }, [
    '............', '....wwww....', '..wwwwwwww..', '.wwwwwwwwww.',
    'wwweewweewww', 'wwwwwwwwwwww', 'wwwwwwwwwwww', '.wgwwwwwwgw.',
    '..gg.gg.gg..', '...g..g..g..', '............', '............']);

  P('teacup', 'Teacup', 'weird',
    { '.': null, w: '#f8fafc', b: '#7dd3fc', t: '#a16207', e: '#12202c' }, [
    '............', '............', '...b..b..b..', '.wwwwwwww.ww',
    '.wtttttttw.w', '.wtttttttw.w', '.weewweewwww', '.wwwwwwww...',
    '..wwwwww....', '...wwww.....', '..tttttt....', '............']);

  // ---- furniture ------------------------------------------------------------
  // Sixteen pixels square, one world cell when placed. `behaviour` is gameplay:
  // recolouring a table never stops it being something you can't walk through.
  // `use` is the other half of the law: the template says what a thing *does*,
  // your design says what it looks like. Repaint a bed however you like and it
  // is still the bed you wake up in; a chest you drew yourself still holds your
  // things. Function lives here, never in the pixels.
  // `cost` is the third piece of gameplay a template can own, alongside
  // behaviour and use: what it takes to put one down. Most furniture costs
  // nothing but the energy to place it; a thing that unlocks a whole loop
  // should be earned. It lives here so any template can declare one, and so a
  // hearth you designed yourself still costs the same stone as the plain one.
  const F = (id, name, behaviour, pal, px, use, cost) =>
    T({ id, name, cat: 'furniture', sub: 'furniture', behaviour, pal, px, use, cost });

  F('chair', 'Chair', 'solid',
    { '.': null, w: '#8a5f38', d: '#5c3d22', l: '#a9764a' }, [
    '................', '....dddddd......', '....dllllld.....', '....dllllld.....',
    '....dllllld.....', '....dllllld.....', '....dllllld.....', '....dddddddd....',
    '...dwwwwwwwwd...', '...dwwwwwwwwd...', '...dddddddddd...', '...dd......dd...',
    '...dd......dd...', '...dd......dd...', '...dd......dd...', '................']);

  F('stool', 'Stool', 'solid',
    { '.': null, w: '#a9764a', d: '#5c3d22' }, [
    '................', '................', '................', '................',
    '................', '..dddddddddddd..', '..dwwwwwwwwwwd..', '..dwwwwwwwwwwd..',
    '..dddddddddddd..', '...dd......dd...', '...dd......dd...', '...dd......dd...',
    '...dd......dd...', '..ddd......ddd..', '................', '................']);

  F('table', 'Table', 'solid',
    { '.': null, w: '#a9764a', d: '#5c3d22', l: '#c89b6a' }, [
    '................', '................', '..dddddddddddd..', '.dlllllllllllld.',
    '.dwwwwwwwwwwwwd.', '.dwwwwwwwwwwwwd.', '..dddddddddddd..', '...dd......dd...',
    '...dw......wd...', '...dw......wd...', '...dw......wd...', '...dw......wd...',
    '...dw......wd...', '...dd......dd...', '................', '................']);

  F('desk', 'Desk', 'solid',
    { '.': null, w: '#8a5f38', d: '#4a3020', l: '#b5834f', k: '#3d2b1a' }, [
    '................', '................', '.dddddddddddddd.', '.dlllllllllllld.',
    '.dwwwwwwwwwwwwd.', '.dddddddddddddd.', '.dwwwwdddwwwwwd.', '.dwkwwdkdwwkwwd.',
    '.dwwwwdddwwwwwd.', '.dddddddddddddd.', '.dwwwwdddwwwwwd.', '.dwkwwdkdwwkwwd.',
    '.dwwwwdddwwwwwd.', '.dddddddddddddd.', '................', '................']);

  F('bed', 'Bed', 'solid',
    { '.': null, w: '#8a5f38', d: '#5c3d22', s: '#e5e7eb', q: '#7dd3fc', p: '#f8fafc' }, [
    '................', '.dddddddddddddd.', '.dssssssssssssd.', '.dppppssssssssd.',
    '.dppppssssssssd.', '.dssssssssssssd.', '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.',
    '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.',
    '.dqqqqqqqqqqqqd.', '.dddddddddddddd.', '.dd..........dd.', '................'], 'bed');

  F('chest', 'Chest', 'solid',
    { '.': null, w: '#8a5f38', d: '#4a3020', m: '#c9a227', l: '#b5834f' }, [
    '................', '................', '....dddddddd....', '...dlllllllld...',
    '..dwwwwwwwwwwd..', '..dwwwwmmwwwwd..', '..dddddmmddddd..', '..dwwwwmmwwwwd..',
    '..dwwwwwwwwwwd..', '..dwwwwwwwwwwd..', '..dwwwwwwwwwwd..', '..dddddddddddd..',
    '...d........d...', '................', '................', '................'], 'storage');

  // **The one piece of furniture that holds something you cannot lose.** Every
  // look you have ever worn hangs here, and so does the whole premade shelf —
  // and neither costs a design slot, because *cosmetics never compete with
  // progression* and a library slot is progression: it is the same shelf a
  // facade or a hearth of your own has to fit on.
  //
  // Planks off your own bench and cloth for what hangs in it. The two halves of
  // *home comforts* hold hands: the thing that makes your house yours is made
  // at the thing that makes your house work.
  F('wardrobe', 'Wardrobe', 'solid',
    { '.': null, w: '#8a5f38', d: '#4a3020', l: '#b5834f', m: '#c9a227', k: '#2f1e12' }, [
    '................', '...dddddddddd...', '..dwwwwwwwwwwd..', '..dwlllkklllwd..',
    '..dwlllkklllwd..', '..dwllmkkmllwd..', '..dwlllkklllwd..', '..dwlllkklllwd..',
    '..dwwwwkkwwwwd..', '..dwlllkklllwd..', '..dwlllkklllwd..', '..dwlllkklllwd..',
    '..dwlllkklllwd..', '..dwwwwwwwwwwd..', '..dd........dd..', '................'],
    'wardrobe', [['plank', 6], ['fiber', 4]]);

  F('shelf', 'Shelf', 'solid',
    { '.': null, w: '#8a5f38', d: '#4a3020', r: '#dc2626', g: '#16a34a', b: '#3b82f6', y: '#fbbf24' }, [
    '................', '.dddddddddddddd.', '.dwwwwwwwwwwwwd.', '.drr.gg.bb.yy.d.',
    '.drr.gg.bb.yy.d.', '.drr.gg.bb.yy.d.', '.dwwwwwwwwwwwwd.', '.dddddddddddddd.',
    '.dwwwwwwwwwwwwd.', '.dyy.rr.gg.bb.d.', '.dyy.rr.gg.bb.d.', '.dyy.rr.gg.bb.d.',
    '.dwwwwwwwwwwwwd.', '.dddddddddddddd.', '................', '................']);

  F('couch', 'Couch', 'solid',
    { '.': null, c: '#7c3aed', d: '#4c1d95', l: '#a78bfa', w: '#5c3d22' }, [
    '................', '.dddddddddddddd.', '.dlllllllllllld.', '.dccccccccccccd.',
    '.dccccccccccccd.', '.dddddddddddddd.', '.dclcccccccclcd.', '.dclcccccccclcd.',
    '.dclcccccccclcd.', '.dccccccccccccd.', '.dddddddddddddd.', '..w..........w..',
    '..w..........w..', '..w..........w..', '................', '................']);

  F('lamp', 'Lamp', 'solid',
    { '.': null, s: '#a8a29e', d: '#57534e', g: '#fde047', f: '#f59e0b' }, [
    '................', '....gggggggg....', '...gffffffffg...', '..gffffffffffg..',
    '..gffffffffffg..', '...gffffffffg...', '....gggggggg....', '.......ss.......',
    '.......ss.......', '.......ss.......', '.......ss.......', '.......ss.......',
    '.....dddddd.....', '....dddddddd....', '................', '................']);

  // Tilled earth. Sow a seed and it remembers when — the crop's whole life is
  // one timestamp, so a garden ripens whether or not anyone is watching.
  F('plot', 'Garden Plot', 'pass',
    { '.': null, d: '#5b4630', e: '#6b543a', f: '#4a3826', r: '#7a6045' }, [
    '................', '.rrrrrrrrrrrrrr.', '.rddddddddddddr.', '.rdeeeeeeeeeedr.',
    '.rdefffffffffdr.', '.rdefdddddddfdr.', '.rdefdeeeeedfdr.', '.rdefdeffffdfdr.',
    '.rdefdeffffdfdr.', '.rdefdeeeeedfdr.', '.rdefdddddddfdr.', '.rdefffffffffdr.',
    '.rdeeeeeeeeeedr.', '.rddddddddddddr.', '.rrrrrrrrrrrrrr.', '................'], 'crop');

  // A pot over a fire. What a harvest is *for* — grain and pumpkin are worth
  // more cooked than sold, and a dish puts health and energy back.
  F('hearth', 'Hearth', 'solid',
    { '.': null, p: '#3f4750', h: '#5a636d', s: '#7c848c', d: '#4e565e', f: '#f59e0b', y: '#fde047' }, [
    '................', '................', '.....pppppp.....', '....p......p....',
    '...phhhhhhhhp...', '...pppppppppp...', '....pppppppp....', '.....p....p.....',
    '..d..ffffff..d..', '..ds.fyyyyf.sd..', '..dssffyyffssd..', '.dssdsffffsdssd.',
    '.dsdddssssdddsd.', '..ddddddddddd...', '................', '................'],
    'cook', [['stone', 8], ['wood', 3]]);

  // **The stone you raise yourself.** Every town has had one since the day towns
  // existed; this is the first one a player puts down. It is a template like any
  // other — behaviour, use and cost all declared here — which is why joining a
  // holding to the travel network needed no new build tool, no new message and
  // no new cell kind: it is furniture that happens to be a door to the far side
  // of the world. Repaint it in the workshop and it still carries you.
  //
  // The price is the gate, not a level. Granite is a hill away and iron is
  // underground, so a stone in your yard says you have been somewhere.
  F('waystone', 'Waystone', 'solid',
    { '.': null, s: '#6b7280', d: '#3f4750', l: '#9aa3ad', g: '#7dd3fc', w: '#e0f2fe' }, [
    '................', '......dddd......', '.....dsssssd....', '....dsslllssd...',
    '....dsslllssd...', '....dsglllgsd...', '....dsgwwwgsd...', '....dsgwgwgsd...',
    '....dsgwwwgsd...', '....dsglllgsd...', '....dsslllssd...', '....dsssssssd...',
    '...ddsssssssdd..', '..dddddddddddd..', '................', '................'],
    'waystone', [['granite', 12], ['iron_ore', 4], ['rope', 3]]);

  F('planter', 'Planter', 'solid',
    { '.': null, g: '#16a34a', d: '#14532d', p: '#c2410c', b: '#7c2d12', f: '#f472b6' }, [
    '................', '.......f........', '....g..g..g.....', '...gdg.gdg.gg...',
    '...gggdgggdgg...', '....gggggggg....', '.....gggggg.....', '......gdg.......',
    '......ggg.......', '....pppppppp....', '...pppppppppp...', '...pbbbbbbbbp...',
    '...pppppppppp...', '....pppppppp....', '................', '................']);

  // A seat with a back on it, which is the only difference between furniture and
  // an argument about who is in charge. Drawn for the keep at Kingsreach and left
  // placeable like everything else — cosmetics have never competed with
  // progression in this game, and a speck who wants a throne in their shack has
  // earned the joke.
  F('throne', 'Throne', 'solid',
    { '.': null, d: '#4b5563', s: '#6b7280', c: '#b91c1c', g: '#c9a227' }, [
    '................', '.......gg.......', '.....dddddd.....', '.....dccccd.....',
    '.....dccccd.....', '.....dcggcd.....', '.....dcggcd.....', '.....dccccd.....',
    '.....dccccd.....', '...ssssssssss...', '...sccccccccs...', '...ssssssssss...',
    '...ss......ss...', '...ss......ss...', '..sss......sss..', '................']);

  // Light that stands in the middle of a room rather than hanging on its wall.
  // A hall wants a fire down each side of the floor you walk up.
  F('brazier', 'Brazier', 'solid',
    { '.': null, d: '#3f4750', s: '#5a636d', f: '#f59e0b', y: '#fde047', w: '#fff7ed' }, [
    '................', '.......f........', '......fyf.......', '......fyyf......',
    '.....fyyyyf.....', '.....fywwyf.....', '.....ffyyff.....', '..dddddddddddd..',
    '..dssssssssssd..', '...dssssssssd...', '....dssssssd....', '......dssd......',
    '.......ss.......', '.......ss.......', '.....dddddd.....', '................']);

  // ---- decor ----------------------------------------------------------------
  const D = (id, name, behaviour, pal, px, fieldChars, use) =>
    T({ id, name, cat: 'decor', sub: 'decor', behaviour, pal, px, fieldChars, use });

  D('rug', 'Rug', 'pass',
    { '.': null, a: '#b91c1c', b: '#fbbf24', c: '#7f1d1d', d: '#fef3c7' }, [
    '................', '.cccccccccccccc.', '.cbbbbbbbbbbbbc.', '.cbaaaaaaaaaabc.',
    '.cbadddddddaabc.', '.cbadbbbbbbdabc.', '.cbadbaaaaabdbc.', '.cbadbadddabdbc.',
    '.cbadbadddabdbc.', '.cbadbaaaaabdbc.', '.cbadbbbbbbdabc.', '.cbadddddddaabc.',
    '.cbaaaaaaaaaabc.', '.cbbbbbbbbbbbbc.', '.cccccccccccccc.', '................'], 'ad');

  D('painting', 'Painting', 'wall',
    { '.': null, f: '#a16207', d: '#451a03', s: '#7dd3fc', g: '#4ade80', b: '#166534', y: '#fde047' }, [
    '................', '.dddddddddddddd.', '.dffffffffffffd.', '.dfssssssssssfd.',
    '.dfsssyysssssfd.', '.dfssssssssssfd.', '.dfsssssssbbsfd.', '.dfssbbbsbbbsfd.',
    '.dfsbbbbbbbbbfd.', '.dfggggggggggfd.', '.dfggbggggbggfd.', '.dfggggggggggfd.',
    '.dffffffffffffd.', '.dddddddddddddd.', '................', '................'], 'sgby');

  D('banner', 'Banner', 'wall',
    { '.': null, p: '#7c3aed', d: '#4c1d95', y: '#fde047', w: '#e9d5ff' }, [
    '..dddddddddddd..', '..pppppppppppp..', '..pppppppppppp..', '..ppppyyyypppp..',
    '..pppyywwyyppp..', '..ppyywwwwyypp..', '..ppyywwwwyypp..', '..pppyywwyyppp..',
    '..ppppyyyypppp..', '..pppppppppppp..', '..pppppppppppp..', '..dpppppppppdd..',
    '...dppppppppd...', '....dppppppd....', '.....dppppd.....', '......dddd......'], 'pyw');

  D('flag', 'Flag', 'solid',
    { '.': null, m: '#5c3d22', r: '#dc2626', w: '#fef2f2', d: '#7f1d1d' }, [
    '..m.............', '..m.rrrrrrrrrr..', '..m.rrrrrrrrrd..', '..m.rrrwwwwrrd..',
    '..m.rrwwwwwwrd..', '..m.rrwwwwwwrd..', '..m.rrrwwwwrrd..', '..m.rrrrrrrrrd..',
    '..m.rrrrrrrrd...', '..m.ddddddd.....', '..m.............', '..m.............',
    '..m.............', '.mmm............', 'mmmmm...........', '................'], 'rw');

  // A bedroll is where you sleep, so it is a **bed**: you wake on it if anything
  // puts you down. That matters the moment specks start at a camp, which has a
  // bedroll and no bed frame — without this you would wake at the starter gate
  // instead of at your own fire, which is the whole point of waking somewhere.
  D('bedding', 'Bedding', 'pass',
    { '.': null, q: '#7dd3fc', d: '#0369a1', p: '#f8fafc', s: '#e0f2fe' }, [
    '.dddddddddddddd.', '.dppppppppppppd.', '.dppssssssssppd.', '.dppppppppppppd.',
    '.dddddddddddddd.', '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.',
    '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.',
    '.dqqqqqqqqqqqqd.', '.dqqqqqqqqqqqqd.', '.dddddddddddddd.', '................'], 'q', 'bed');

  D('sign_board', 'Sign Board', 'solid',
    { '.': null, w: '#b5834f', d: '#5c3d22', t: '#3d2b1a', m: '#8a5f38' }, [
    '................', '.dddddddddddddd.', '.dwwwwwwwwwwwwd.', '.dwttttwwttttwd.',
    '.dwwwwwwwwwwwwd.', '.dwttwwttwwttwd.', '.dwwwwwwwwwwwwd.', '.dwttttwwttttwd.',
    '.dwwwwwwwwwwwwd.', '.dddddddddddddd.', '.......mm.......', '.......mm.......',
    '.......mm.......', '.....dddddd.....', '................', '................']);

  // ---- props ----------------------------------------------------------------
  // The world's dressing, drawn in `public/props.js` and registered here so they
  // are templates like everything else: the studio can already edit them, the
  // palette already recolours them, and collision comes from `behaviour` rather
  // than from anything about how they look.
  //
  // Unlike furniture these go on the *open map*, which is why only the world's
  // owner may put one down — see `prop` in server.js.
  for (const p of (Props && Props.PROPS) || []) {
    T({ id: p.id, name: p.name, cat: 'prop', sub: p.sub, behaviour: p.behaviour, pal: Props.PAL, px: p.px });
  }

  // ---- the yard -------------------------------------------------------------
  // Fences and paths are the first pieces that care what's *next to them*. Each
  // one is drawn as its fully connected shape — a core in the middle and four
  // arms reaching to the edges — and `arms` says where those arms are. A cell
  // with no neighbour on a side simply doesn't draw that arm, so one sprite
  // covers all sixteen connection shapes and a run of fence joins up on its own.
  //
  // The arms are *positions*, never palette letters, for exactly the reason
  // `field` is: a design's letters get reassigned on every pack, but the shape
  // of the thing never moves. So a fence you painted yourself still connects.
  //
  // `join` is the family. Everything in the fence family joins everything else
  // in it, so a wooden run can turn into a hedge and back with a gate in the
  // middle and still read as one line.
  const FENCE_ARMS = { n: [5, 0, 6, 4], e: [12, 5, 4, 6], s: [5, 12, 6, 4], w: [0, 5, 4, 6] };
  const PATH_ARMS = { n: [3, 0, 10, 3], e: [13, 3, 3, 10], s: [3, 13, 10, 3], w: [0, 3, 3, 10] };
  // Fencing a yard should cost something, or enclosing an acre is just clicking.
  // The amounts are deliberately small — one log a panel — so the cost is a
  // reason to go and gather, never a reason not to build. A dirt path is free,
  // so there's always something you can lay with nothing in your pack.
  const Y = (id, name, behaviour, join, arms, cost, pal, px) =>
    T({ id, name, cat: 'yard', sub: join === 'path' ? 'paths' : 'fences', behaviour, pal, px, join, arms, cost });

  Y('fence', 'Fence', 'solid', 'fence', FENCE_ARMS, [['wood', 1]],
    { '.': null, p: '#4a3020', l: '#b5834f', w: '#8a5f38', r: '#6b4527' }, [
    '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....',
    '....pppppppp....', 'wwwwpllllllpwwww', 'wwwwplwwwwlpwwww', '....plwrrwlp....',
    '....plwrrwlp....', 'wwwwplwwwwlpwwww', 'wwwwpllllllpwwww', '....pppppppp....',
    '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....']);

  Y('fence_stone', 'Garden Wall', 'solid', 'fence', FENCE_ARMS, [['stone', 2]],
    { '.': null, a: '#4e545b', b: '#868d95', c: '#a8afb7' }, [
    '.....abbcba.....', '.....abbbca.....', '.....abbbba.....', '.....abbbba.....',
    '....aaaaaaaa....', 'aaaaacbbbbbaaaaa', 'bbbbabcbbbbabbcb', 'bbbbabbcbbbabbbc',
    'cbbbabbbcbbabbbb', 'bcbbabbbbcbabbbb', 'aaaaabbbbbcaaaaa', '....aaaaaaaa....',
    '.....abbbba.....', '.....abbbba.....', '.....acbbba.....', '.....abcbba.....']);

  Y('fence_hedge', 'Hedge', 'solid', 'fence', FENCE_ARMS, [['fiber', 1]],
    { '.': null, d: '#1f4a22', g: '#2f6b30', h: '#3f8a3f', f: '#7ec46a' }, [
    '.....dhhfgd.....', '.....dgghhd.....', '.....dfgggd.....', '.....dhhhfd.....',
    '....dddddddd....', 'dddddhhfgggddddd', 'hhfgdgghhhfdgggh', 'gghhdfgggghdhfgg',
    'fgggdhhhfggdghhh', 'hhhfdggghhhdgggg', 'dddddhfggggddddd', '....dddddddd....',
    '.....dggghd.....', '.....dhfggd.....', '.....dghhhd.....', '.....dggggd.....']);

  // The way through your own fence. Four corner posts and an opening on both
  // axes, so it reads as a gate whichever way the line happens to run.
  Y('gate', 'Gate', 'pass', 'fence', FENCE_ARMS, [['wood', 2]],
    { '.': null, p: '#4a3020', l: '#b5834f', w: '#8a5f38' }, [
    '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....',
    '....pp....pp....', 'wwwwpl....lpwwww', 'wwww........wwww', '................',
    '................', 'wwww........wwww', 'wwwwpl....lpwwww', '....pp....pp....',
    '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....', '.....ww..ww.....']);

  // Paths tile edge to edge, so every texture here has a period that divides 16
  // and a run of them reads as one surface rather than a row of tiles.
  Y('path_dirt', 'Dirt Path', 'pass', 'path', PATH_ARMS, null,
    { '.': null, a: '#5b4c34', b: '#6b5a3e', c: '#7d6a4a' }, [
    '...bbbbacbbbb...', '...bbbbbacbbb...', '...bbbbbbacbb...', 'bbacbbbbbbacbbbb',
    'bbbacbbbbbbacbbb', 'bbbbacbbbbbbacbb', 'bbbbbacbbbbbbacb', 'bbbbbbacbbbbbbac',
    'cbbbbbbacbbbbbba', 'acbbbbbbacbbbbbb', 'bacbbbbbbacbbbbb', 'bbacbbbbbbacbbbb',
    'bbbacbbbbbbacbbb', '...bacbbbbbba...', '...bbacbbbbbb...', '...bbbacbbbbb...']);

  Y('path_stone', 'Flagstones', 'pass', 'path', PATH_ARMS, [['stone', 1]],
    { '.': null, a: '#7a8087', b: '#8b9099', c: '#a5abb4', d: '#565b61' }, [
    '...dcccdcccdc...', '...dcbbdcbbdc...', '...dcbadcbbdc...', 'dddddddddddddddd',
    'cccdcccdcccdcccd', 'cbbdcbbdcbbdcbbd', 'cbadcbbdcbadcbbd', 'dddddddddddddddd',
    'cccdcccdcccdcccd', 'cbbdcbbdcbbdcbbd', 'cbbdcbadcbbdcbad', 'dddddddddddddddd',
    'cccdcccdcccdcccd', '...dcbbdcbbdc...', '...dcbbdcbadc...', '...dddddddddd...']);

  Y('path_brick', 'Brick Path', 'pass', 'path', PATH_ARMS, [['brick', 1]],
    { '.': null, r: '#a8503a', h: '#c26a4e', k: '#8f4130', m: '#6b5648' }, [
    '...hhhhmhhhhh...', '...krrrmrrrkr...', '...rrrkmrrrrr...', 'mmmmmmmmmmmmmmmm',
    'hhhmhhhhhhhmhhhh', 'rrrmrrrkrrrmrrrk', 'rrkmrrrrrrkmrrrr', 'mmmmmmmmmmmmmmmm',
    'hhhhhhhmhhhhhhhm', 'rrrkrrrmrrrkrrrm', 'rrrrrrkmrrrrrrkm', 'mmmmmmmmmmmmmmmm',
    'hhhmhhhhhhhmhhhh', '...mrrrkrrrmr...', '...mrrrrrrkmr...', '...mmmmmmmmmm...']);

  // ---- building parts -------------------------------------------------------
  // These skin cells the game already understands. A custom door is still a
  // door: you walk through it. That's the whole point of the split.
  // `slot` is what part of a building this piece can be: a roof texture will
  // never be offered as a door, and a door will never be tiled across a wall.
  const B = (id, name, slot, behaviour, pal, px, fieldChars) =>
    T({ id, name, cat: 'building', sub: slot, slot, behaviour, pal, px, fieldChars });

  B('door_plain', 'Plank Door', 'door', 'door',
    { '.': null, w: '#8a5f38', d: '#4a3020', k: '#c9a227', l: '#a9764a' }, [
    '.dddddddddddddd.', '.dlllllllllllld.',
    '.dwwwwwwwwwwwwd.', '.dwddddddddddwd.', '.dwdwwwwwwwwdwd.', '.dwdwwwwwwwwdwd.',
    '.dwdwwwwwwwwdwd.', '.dwddddddddddwd.', '.dwwwwwwwwwwwwd.', '.dwwwwwwwwkwwwd.',
    '.dwddddddddddwd.', '.dwdwwwwwwwwdwd.', '.dwdwwwwwwwwdwd.', '.dwddddddddddwd.',
    '.dwwwwwwwwwwwwd.', '.dddddddddddddd.']);

  B('door_arch', 'Arched Door', 'door', 'door',
    { '.': null, w: '#7a4a2a', d: '#3d2416', k: '#c9a227', l: '#a9764a' }, [
    '.....dddddd.....', '...ddlllllldd...', '..dlwwwwwwwwld..', '.dlwwwwwwwwwwld.',
    '.dwwwwddwwddwwd.', '.dwwwwddwwddwwd.', '.dwwwwddwwddwwd.', '.dwwwwddwwddwwd.',
    '.dwwwwddwwddwwd.', '.dwwwwwwwwwwwwd.', '.dwwwkwwwwwwwwd.', '.dwwwwwwwwwwwwd.',
    '.dwwddwwwwddwwd.', '.dwwddwwwwddwwd.', '.dwwwwwwwwwwwwd.', '.dddddddddddddd.']);

  B('window_plain', 'Square Window', 'window', 'wall',
    { '.': null, f: '#8a5f38', d: '#4a3020', g: '#9cc8e8', s: '#e0f2fe' }, [
    '.dddddddddddddd.', '.dffffffffffffd.', '.dfggggggggggfd.', '.dfgssgggggggfd.',
    '.dfgsggggggggfd.', '.dfggggggggggfd.', '.dfggggggggggfd.', '.dffffffffffffd.',
    '.dffffffffffffd.', '.dfggggggggggfd.', '.dfggggggggggfd.', '.dfggggggggggfd.',
    '.dfggggggggggfd.', '.dfggggggggggfd.', '.dffffffffffffd.', '.dddddddddddddd.']);

  B('window_round', 'Round Window', 'window', 'wall',
    { '.': null, f: '#8a8d92', d: '#4a4d52', g: '#9cc8e8', s: '#e0f2fe' }, [
    '.....dddddd.....', '...dddffffddd...', '..dffggggggffd..', '.dffgssgggggffd.',
    '.dfggsggggggggd.', 'dffgggggggggggfd', 'dfgggggggggggggd', 'dfgggggggggggggd',
    'dfgggggggggggggd', 'dfgggggggggggggd', 'dffgggggggggggfd', '.dfggggggggggfd.',
    '.dffggggggggffd.', '..dffggggggffd..', '...dddffffddd...', '.....dddddd.....']);

  B('wall_stone', 'Stone Wall', 'wall', 'wall',
    { '.': null, a: '#8a8d92', b: '#6f7276', c: '#5b5f66', d: '#a3a6ab' }, [
    'ddaaaaddaaaaddaa', 'aabbaabbaabbaabb', 'cbbbbccbbbbccbbc', 'ccbbccbbccbbccbb',
    'aaccaaccaaccaacc', 'ddaaddaaddaaddaa', 'bbaabbbbaabbbbaa', 'bccbbccbbccbbccb',
    'ccbbccbbccbbccbb', 'aaccaaccaaccaacc', 'ddaaddaaddaaddaa', 'aabbaabbaabbaabb',
    'cbbccbbccbbccbbc', 'ccaaccaaccaaccaa', 'aaddaaddaaddaadd', 'bbaabbaabbaabbaa'], 'abcd');

  B('wall_plank', 'Plank Wall', 'wall', 'wall',
    { '.': null, a: '#a9764a', b: '#8a5f38', c: '#5c3d22', d: '#c89b6a' }, [
    'aaaaaaaaaaaaaaaa', 'dddddddddddddddd', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc',
    'aaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaa', 'dddddddddddddddd', 'cccccccccccccccc',
    'bbbbbbbbbbbbbbbb', 'aaaaaaaaaaaaaaaa', 'dddddddddddddddd', 'cccccccccccccccc',
    'aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'dddddddddddddddd', 'cccccccccccccccc'], 'abcd');

  B('wall_plaster', 'Plaster Wall', 'wall', 'wall',
    { '.': null, a: '#e7e2d4', b: '#d6cfbc', c: '#c2b9a2', d: '#f5f1e6' }, [
    'aaaadaaaaaaabaaa', 'aaaaaaaabaaaaaaa', 'abaaaaaaaaaadaaa', 'aaaaaacaaaaaaaaa',
    'daaaaaaaaabaaaaa', 'aaaabaaaaaaaaaad', 'aaaaaaaaadaaabaa', 'aacaaaaaaaaaaaaa',
    'aaaaaadaaaaaacaa', 'abaaaaaaaaaaaaaa', 'aaaaaaabaaadaaaa', 'aaadaaaaaaaaaaba',
    'caaaaaaaaaaaaaaa', 'aaaaabaaaadaaaaa', 'aaaaaaaaaaaaaaac', 'aadaaaacaaaaaaaa'], 'abcd');

  B('roof_shingle', 'Shingles', 'roof', 'wall',
    { '.': null, a: '#4a5568', b: '#2d3748', c: '#718096', d: '#1a202c' }, [
    'aaaacaaaacaaaaca', 'aaaacaaaacaaaaca', 'bbbbbbbbbbbbbbbb', 'dddddddddddddddd',
    'caaaacaaaacaaaac', 'caaaacaaaacaaaac', 'bbbbbbbbbbbbbbbb', 'dddddddddddddddd',
    'aaaacaaaacaaaaca', 'aaaacaaaacaaaaca', 'bbbbbbbbbbbbbbbb', 'dddddddddddddddd',
    'caaaacaaaacaaaac', 'caaaacaaaacaaaac', 'bbbbbbbbbbbbbbbb', 'dddddddddddddddd'], 'abcd');

  B('roof_thatch', 'Thatch', 'roof', 'wall',
    { '.': null, a: '#b8944a', b: '#8f7033', c: '#d4b26a', d: '#6b5424' }, [
    'acabacaabacabaca', 'cabaacabaacabaac', 'abacabaacabacaba', 'baacabaacabaacab',
    'dddbdddbdddbdddb', 'acabacaabacabaca', 'cabaacabaacabaac', 'abacabaacabacaba',
    'baacabaacabaacab', 'dbdddbdddbdddbdd', 'acabacaabacabaca', 'cabaacabaacabaac',
    'abacabaacabacaba', 'baacabaacabaacab', 'ddbdddbdddbdddbd', 'acabacaabacabaca'], 'abcd');

  B('roof_tile', 'Clay Tiles', 'roof', 'wall',
    { '.': null, a: '#b0492e', b: '#8a3520', c: '#d1694a', d: '#5c2214' }, [
    'caaabcaaabcaaabc', 'aaaabaaaabaaaaba', 'aaaabaaaabaaaaba', 'dddddddddddddddd',
    'abcaaabcaaabcaaa', 'abaaaabaaaabaaaa', 'abaaaabaaaabaaaa', 'dddddddddddddddd',
    'caaabcaaabcaaabc', 'aaaabaaaabaaaaba', 'aaaabaaaabaaaaba', 'dddddddddddddddd',
    'abcaaabcaaabcaaa', 'abaaaabaaaabaaaa', 'abaaaabaaaabaaaa', 'dddddddddddddddd'], 'abcd');

  B('trim_wood', 'Wood Trim', 'trim', 'wall',
    { '.': null, w: '#a9764a', d: '#5c3d22', l: '#c89b6a' }, [
    'dddddddddddddddd', 'llllllllllllllll', 'wwwwwwwwwwwwwwww', 'wwddwwddwwddwwdd',
    'wwwwwwwwwwwwwwww', 'dddddddddddddddd', 'wwwwwwwwwwwwwwww', 'wddwwddwwddwwddw',
    'wwwwwwwwwwwwwwww', 'llllllllllllllll', 'wwwwwwwwwwwwwwww', 'wwddwwddwwddwwdd',
    'wwwwwwwwwwwwwwww', 'dddddddddddddddd', 'llllllllllllllll', 'dddddddddddddddd'], 'wdl');

  B('trim_stone', 'Stone Trim', 'trim', 'wall',
    { '.': null, a: '#a3a6ab', b: '#6f7276', c: '#4a4d52' }, [
    'cccccccccccccccc', 'aaaaaaaaaaaaaaaa', 'abbaabbaabbaabba', 'aaaaaaaaaaaaaaaa',
    'cccccccccccccccc', 'aaaaaaaaaaaaaaaa', 'baabbaabbaabbaab', 'aaaaaaaaaaaaaaaa',
    'cccccccccccccccc', 'aaaaaaaaaaaaaaaa', 'abbaabbaabbaabba', 'aaaaaaaaaaaaaaaa',
    'cccccccccccccccc', 'aaaaaaaaaaaaaaaa', 'baabbaabbaabbaab', 'cccccccccccccccc'], 'abc');

  B('found_block', 'Block Footing', 'foundation', 'wall',
    { '.': null, a: '#57534e', b: '#44403c', c: '#78716c', d: '#292524' }, [
    'ccaaccaaccaaccaa', 'aaaaaaaaaaaaaaaa', 'dddddddddddddddd', 'aaccaaccaaccaacc',
    'aaaaaaaaaaaaaaaa', 'dddddddddddddddd', 'ccaaccaaccaaccaa', 'aaaaaaaaaaaaaaaa',
    'dddddddddddddddd', 'aaccaaccaaccaacc', 'aaaaaaaaaaaaaaaa', 'dddddddddddddddd',
    'ccaaccaaccaaccaa', 'bbbbbbbbbbbbbbbb', 'dddddddddddddddd', 'bbbbbbbbbbbbbbbb'], 'abcd');

  B('sign_hanging', 'Hanging Sign', 'sign', 'wall',
    { '.': null, w: '#b5834f', d: '#5c3d22', t: '#3d2b1a', y: '#fde047' }, [
    'dddddddddddddddd', 'dwwwwwwwwwwwwwwd', 'dwyywwwwwwwwyywd', 'dwwwwwwwwwwwwwwd',
    'dwwttwwwwwwttwwd', 'dwwttwwwwwwttwwd', 'dwwwwwwwwwwwwwwd', 'dwwtttwwwwtttwwd',
    'dwwtttwwwwtttwwd', 'dwwwwwwwwwwwwwwd', 'dwwttwwwwwwttwwd', 'dwwttwwwwwwttwwd',
    'dwwwwwwwwwwwwwwd', 'dwyywwwwwwwwyywd', 'dwwwwwwwwwwwwwwd', 'dddddddddddddddd']);

  B('sign_plaque', 'Plaque', 'sign', 'wall',
    { '.': null, a: '#a3a6ab', d: '#4a4d52', t: '#2f3237' }, [
    'dddddddddddddddd', 'daaaaaaaaaaaaaad', 'daaaaaaaaaaaaaad', 'daattaattaattaad',
    'daattaattaattaad', 'daaaaaaaaaaaaaad', 'daaaaaaaaaaaaaad', 'daattaattaaaaaad',
    'daattaattaaaaaad', 'daaaaaaaaaaaaaad', 'daaaaaaaaaaaaaad', 'daattaattaattaad',
    'daattaattaattaad', 'daaaaaaaaaaaaaad', 'daaaaaaaaaaaaaad', 'dddddddddddddddd']);

  // ---- building silhouettes -------------------------------------------------
  // The outside of a building is a *shape* with named parts, not a canvas. This
  // grid says which pixel is roof, which is wall, which is the doorway; the
  // player picks what each part is made of and nothing they choose can move a
  // wall or an entrance. Footprint, interior size and the doorstep all come from
  // the structure itself and are never consulted here — that's the safety.
  //
  //   r roof   w wall   t trim   d door   n window   f foundation   s sign
  const SLOT_CHARS = { r: 'roof', w: 'wall', t: 'trim', d: 'door', n: 'window', f: 'foundation', s: 'sign' };
  const SLOTS = ['roof', 'wall', 'trim', 'door', 'window', 'foundation', 'sign'];
  const OBJECT_SLOTS = ['door', 'window', 'sign']; // fitted to their opening, not tiled
  const BUILDINGS = {};

  function BLD(def) {
    def.w = def.px[0].length;
    def.h = def.px.length;
    // Object slots are fitted to the hole they sit in, so each separate opening
    // needs its own box — two windows shouldn't share one stretched pane.
    def.box = new Array(def.w * def.h).fill(null);
    const seen = new Array(def.w * def.h).fill(false);
    for (let y = 0; y < def.h; y++) {
      for (let x = 0; x < def.w; x++) {
        const i = y * def.w + x;
        if (seen[i]) continue;
        const ch = def.px[y][x];
        if (!OBJECT_SLOTS.includes(SLOT_CHARS[ch])) continue;
        const region = [];
        const stack = [[x, y]];
        let x0 = x, x1 = x, y0 = y, y1 = y;
        while (stack.length) { // flood the opening to find how big it is
          const [cx, cy] = stack.pop();
          if (cx < 0 || cy < 0 || cx >= def.w || cy >= def.h) continue;
          const j = cy * def.w + cx;
          if (seen[j] || def.px[cy][cx] !== ch) continue;
          seen[j] = true;
          region.push(j);
          if (cx < x0) x0 = cx; if (cx > x1) x1 = cx;
          if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        const box = { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
        for (const j of region) def.box[j] = box;
      }
    }
    def.slots = SLOTS.filter(s => def.px.join('').split('').some(c => SLOT_CHARS[c] === s));
    BUILDINGS[def.id] = def;
    return def;
  }

  BLD({
    id: 'cottage', name: 'Cottage', foot: 12,
    px: [
      '...........rr...........', '..........rrrr..........', '.........rrrrrr.........',
      '........rrrrrrrr........', '.......rrrrrrrrrr.......', '......rrrrrrrrrrrr......',
      '.....rrrrrrrrrrrrrr.....', '....rrrrrrrrrrrrrrrr....', '...rrrrrrrrrrrrrrrrrr...',
      '..rrrrrrrrrrrrrrrrrrrr..', '.rrrrrrrrrrrrrrrrrrrrrr.', 'rrrrrrrrrrrrrrrrrrrrrrrr',
      'tttttttttttttttttttttttt', '.wwwwwwwwwwwwwwwwwwwwww.', '.wwwwwwwsssssssswwwwwww.',
      '.wwwwwwwsssssssswwwwwww.', '.wwwwwwwsssssssswwwwwww.', '.wwnnnnnwwwwwwwwnnnnnww.',
      '.wwnnnnnwwwwwwwwnnnnnww.', '.wwnnnnnwwwwwwwwnnnnnww.', '.wwnnnnnwwwwwwwwnnnnnww.',
      '.wwwwwwwwwwwwwwwwwwwwww.', '.wwwwwwwwtddddtwwwwwwww.', '.wwwwwwwwtddddtwwwwwwww.',
      '.wwwwwwwwtddddtwwwwwwww.', '.wwwwwwwwtddddtwwwwwwww.', '.wwwwwwwwtddddtwwwwwwww.',
      'ffffffffffddddffffffffff', 'ffffffffffddddffffffffff', 'ffffffffffffffffffffffff',
    ],
  });

  BLD({
    id: 'longhall', name: 'Long Hall', foot: 12,
    px: [
      '......rrrrrrrrrrrr......', '.....rrrrrrrrrrrrrr.....', '....rrrrrrrrrrrrrrrr....',
      '...rrrrrrrrrrrrrrrrrr...', '..rrrrrrrrrrrrrrrrrrrr..', '.rrrrrrrrrrrrrrrrrrrrrr.',
      'rrrrrrrrrrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrrrrrrrrrr', 'tttttttttttttttttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwww', 'wwnnnnwwwwssssswwwnnnnww', 'wwnnnnwwwwssssswwwnnnnww',
      'wwnnnnwwwwwwwwwwwwnnnnww', 'wwnnnnwwwwwwwwwwwwnnnnww', 'wwwwwwwwwwwwwwwwwwwwwwww',
      'tttttttttttttttttttttttt', 'wwwwwwwwwwwwwwwwwwwwwwww', 'wwnnnnwwwtddddtwwwnnnnww',
      'wwnnnnwwwtddddtwwwnnnnww', 'wwnnnnwwwtddddtwwwnnnnww', 'wwnnnnwwwtddddtwwwnnnnww',
      'wwwwwwwwwtddddtwwwwwwwww', 'wwwwwwwwwtddddtwwwwwwwww', 'ffffffffffddddffffffffff',
      'ffffffffffddddffffffffff', 'ffffffffffffffffffffffff',
    ],
  });

  BLD({
    id: 'tower', name: 'Tower', foot: 12,
    px: [
      '.........rrrr.........', '........rrrrrr........', '.......rrrrrrrr.......',
      '......rrrrrrrrrr......', '.....rrrrrrrrrrrr.....', '....rrrrrrrrrrrrrr....',
      '...rrrrrrrrrrrrrrrr...', '..rrrrrrrrrrrrrrrrrr..', 'tttttttttttttttttttttt',
      '..wwwwwwwwwwwwwwwwww..', '..wwwwwwnnnnnnwwwwww..', '..wwwwwwnnnnnnwwwwww..',
      '..wwwwwwnnnnnnwwwwww..', '..wwwwwwwwwwwwwwwwww..', '..tttttttttttttttttt..',
      '..wwwwwwwwwwwwwwwwww..', '..wwwnnnnwwwwnnnnwww..', '..wwwnnnnwwwwnnnnwww..',
      '..wwwnnnnwwwwnnnnwww..', '..wwwwwwwwwwwwwwwwww..', '..wwwwwssssssswwwwww..',
      '..wwwwwssssssswwwwww..', '..wwwwwwwwwwwwwwwwww..', '..wwwwtddddddtwwwwww..',
      '..wwwwtddddddtwwwwww..', '..wwwwtddddddtwwwwww..', '..wwwwtddddddtwwwwww..',
      '..ffffffddddddffffff..', '..ffffffddddddffffff..', '..ffffffffffffffffff..',
    ],
  });

  BLD({
    id: 'stockade', name: 'Stockade', foot: 24,
    px: [
      '..........rrrrrrrrrr..............rrrrrrrr..........',
      '.........rrrrrrrrrrrr...........rrrrrrrrrrr.........',
      '........rrrrrrrrrrrrrr.........rrrrrrrrrrrrr........',
      '.......rrrrrrrrrrrrrrrr.......rrrrrrrrrrrrrrr.......',
      '......rrrrrrrrrrrrrrrrrr.....rrrrrrrrrrrrrrrrr......',
      '......tttttttttttttttttt.....ttttttttttttttttt......',
      '......wwwwwwwwwwwwwwwwww.....wwwwwwwwwwwwwwwww......',
      '......wwwnnnnwwwwnnnnwww.....wwwnnnnwwwnnnnwww......',
      '......wwwnnnnwwwwnnnnwww.....wwwnnnnwwwnnnnwww......',
      '......wwwwwwwwwwwwwwwwww.....wwwwwwwwwwwwwwwww......',
      '......ffffffffffffffffff.....fffffffffffffffff......',
      'tttttttttttttttttttttttttttttttttttttttttttttttttttt',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      'wwnnnnwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwnnnnww',
      'wwnnnnwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwnnnnww',
      'wwwwwwwwwwwwwwwwwwsssssssssssssswwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwsssssssssssssswwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwttttddddddddttttwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwttttddddddddttttwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwttttddddddddttttwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwttttddddddddttttwwwwwwwwwwwwwwwwwwww',
      'wwwwwwwwwwwwwwwwttttddddddddttttwwwwwwwwwwwwwwwwwwww',
      'ffffffffffffffffffffddddddddffffffffffffffffffffffff',
      'ffffffffffffffffffffddddddddffffffffffffffffffffffff',
      'ffffffffffffffffffffffffffffffffffffffffffffffffffff',
    ],
  });

  // What a building wears when nobody has chosen anything yet.
  const DEFAULT_FACADE = {
    roof: 'roof_shingle', wall: 'wall_plank', trim: 'trim_wood',
    door: 'door_plain', window: 'window_plain',
    foundation: 'found_block', sign: 'sign_hanging',
  };

  // a brand-new facade follows nothing and overrides nothing — it simply wears
  // the defaults until you choose otherwise
  const defaultFacade = bldId => ({ b: BUILDINGS[bldId] ? bldId : 'cottage', style: null, own: {} });

  // Compose the outside of a building. Surfaces (roof, wall, trim, foundation)
  // tile their texture; openings (door, window, sign) are fitted to the hole
  // they sit in. `pick` hands back a design for a slot — a template or one of
  // the player's own, the composer doesn't care which.
  function composeFacade(bld, pick, night) {
    const out = new Array(bld.w * bld.h).fill(null);
    const got = {};
    for (let y = 0; y < bld.h; y++) {
      for (let x = 0; x < bld.w; x++) {
        const slot = SLOT_CHARS[bld.px[y][x]];
        if (!slot) continue;
        if (got[slot] === undefined) {
          const d = pick(slot);
          got[slot] = d ? { d, cells: unpack(d) } : null;
        }
        const g = got[slot];
        if (!g) continue;
        const i = y * bld.w + x;
        let col;
        if (OBJECT_SLOTS.includes(slot)) {
          const b = bld.box[i];
          const sx = Math.min(g.d.w - 1, Math.floor((x - b.x0) * g.d.w / b.w));
          const sy = Math.min(g.d.h - 1, Math.floor((y - b.y0) * g.d.h / b.h));
          col = g.cells[sy * g.d.w + sx];
          // A door with rounded corners must show wall behind it, not a hole
          // through the building — whatever shape the player draws.
          if (!col && got.wall !== null) {
            if (got.wall === undefined) {
              const wd = pick('wall');
              got.wall = wd ? { d: wd, cells: unpack(wd) } : null;
            }
            if (got.wall) col = got.wall.cells[(y % got.wall.d.h) * got.wall.d.w + (x % got.wall.d.w)];
          }
        } else {
          col = g.cells[(y % g.d.h) * g.d.w + (x % g.d.w)];
        }
        // after dark the glass catches the lamps inside
        if (col && night && slot === 'window' && lum(col) > 0.45) col = mix(col, '#ffd98a', 0.75);
        out[i] = col;
      }
    }
    return out;
  }

  function mix(a, b, t) {
    const p = i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
    return '#' + [1, 3, 5].map(i => p(i).toString(16).padStart(2, '0')).join('');
  }

  // ---- style sets -----------------------------------------------------------
  // A style is a look you can put on every building you own at once: what the
  // roof is made of, the walls, the trim — plus your emblem and an accent colour.
  // Buildings *inherit* it, and any single building can still overrule any single
  // part of it. That cascade is the whole idea:
  //
  //     this building's own choice  >  the style it follows  >  the default
  //
  const STYLE_FORMAT = 1;
  const MAX_STYLES = 24;

  function validateStyle(st) {
    if (!st || typeof st !== 'object') return 'not a style';
    if (st.slots && typeof st.slots !== 'object') return 'bad slots';
    if (st.accent && !HEX.test(st.accent)) return 'bad accent colour';
    return null;
  }

  function sanitizeStyle(st, ownDesigns) {
    const slots = {};
    for (const slot of SLOTS) {
      const ref = st.slots && st.slots[slot];
      if (slotFits(ref, slot, ownDesigns)) slots[slot] = ref;
    }
    const emblem = (ownDesigns || []).find(d => d.id === st.emblem && d.cat === 'emblem')
      || (TPL[st.emblem] && TPL[st.emblem].cat === 'emblem' ? TPL[st.emblem] : null);
    return {
      v: STYLE_FORMAT, id: st.id,
      name: String(st.name || 'style').replace(/[<>&]/g, '').trim().slice(0, 24) || 'style',
      slots, emblem: emblem ? st.emblem : null,
      accent: HEX.test(st.accent || '') ? st.accent : '#7dd3fc',
      fav: st.fav ? 1 : 0, at: st.at || Date.now(), up: Date.now(),
    };
  }

  // is this reference a real filler for this slot, either a template or one of
  // the player's own designs?
  function slotFits(ref, slot, ownDesigns) {
    if (TPL[ref] && TPL[ref].slot === slot) return true;
    const own = (ownDesigns || []).find(d => d.id === ref);
    return !!(own && TPL[own.tpl] && TPL[own.tpl].slot === slot);
  }

  const styleRefs = st => {
    const out = Object.values((st && st.slots) || {}).filter(r => !TPL[r]);
    if (st && st.emblem && !TPL[st.emblem]) out.push(st.emblem);
    return [...new Set(out)];
  };

  // The cascade, resolved to the concrete list of fillers a building wears. This
  // is what gets drawn and what travels to other players — they never need the
  // style itself, only its outcome.
  function resolveFacade(f, style, ownDesigns) {
    const bld = BUILDINGS[f && f.b] ? f.b : 'cottage';
    const own = (f && f.own) || {};
    const slots = {};
    for (const slot of BUILDINGS[bld].slots) {
      if (slotFits(own[slot], slot, ownDesigns)) { slots[slot] = own[slot]; continue; }
      // your mark goes on the sign unless this building insists otherwise
      if (slot === 'sign' && style && style.emblem) { slots[slot] = style.emblem; continue; }
      if (style && slotFits(style.slots[slot], slot, ownDesigns)) { slots[slot] = style.slots[slot]; continue; }
      slots[slot] = DEFAULT_FACADE[slot];
    }
    return { b: bld, slots };
  }

  // Only appearance may be set. Anything that isn't a real slot filler is
  // dropped rather than trusted — a facade can never carry geometry.
  function cleanFacade(f, ownDesigns) {
    const bld = BUILDINGS[f && f.b] ? f.b : 'cottage';
    const own = {};
    for (const slot of BUILDINGS[bld].slots) {
      const ref = f && f.own && f.own[slot];
      if (slotFits(ref, slot, ownDesigns)) own[slot] = ref;
    }
    return { b: bld, style: (f && typeof f.style === 'string') ? f.style : null, own };
  }

  const facadeRefs = f => {
    const out = Object.values((f && f.own) || {}).filter(r => !TPL[r]);
    if (f && f.slots) out.push(...Object.values(f.slots).filter(r => !TPL[r]));
    return [...new Set(out)];
  };

  // ---- patterns -------------------------------------------------------------
  // Eight by eight and made to tile: what matters is that the right edge meets
  // the left and the bottom meets the top. A pattern is never placed on its own —
  // it dresses the cloth of something else, which is what makes one weave
  // reusable across a rug, a banner, a bed and a wall.
  const PT = (id, name, pal, px) => T({ id, name, cat: 'pattern', sub: 'pattern', pal, px });

  PT('stripes', 'Stripes', { a: '#e5e7eb', b: '#475569' }, [
    'aaaabbbb', 'aaaabbbb', 'aaaabbbb', 'aaaabbbb',
    'aaaabbbb', 'aaaabbbb', 'aaaabbbb', 'aaaabbbb']);

  PT('checks', 'Checks', { a: '#f8fafc', b: '#1f2937' }, [
    'aaaabbbb', 'aaaabbbb', 'aaaabbbb', 'aaaabbbb',
    'bbbbaaaa', 'bbbbaaaa', 'bbbbaaaa', 'bbbbaaaa']);

  PT('diagonal', 'Diagonal', { a: '#fbbf24', b: '#7c2d12' }, [
    'aabbaabb', 'abbaabba', 'bbaabbaa', 'baabbaab',
    'aabbaabb', 'abbaabba', 'bbaabbaa', 'baabbaab']);

  PT('weave', 'Weave', { a: '#a9764a', b: '#5c3d22', c: '#c89b6a' }, [
    'aaacbbbc', 'aaacbbbc', 'aaacbbbc', 'cccccccc',
    'bbbcaaac', 'bbbcaaac', 'bbbcaaac', 'cccccccc']);

  PT('dots', 'Dots', { a: '#7dd3fc', b: '#0c4a6e' }, [
    'aaaaaaaa', 'aabbaaaa', 'aabbaaaa', 'aaaaaaaa',
    'aaaaaaaa', 'aaaaaabb', 'aaaaaabb', 'aaaaaaaa']);

  PT('diamonds', 'Diamonds', { a: '#2f6b28', b: '#a3e635', c: '#166534' }, [
    'aaabaaab', 'aabcbaab', 'abcccbaa', 'bcccccba',
    'abcccbaa', 'aabcbaab', 'aaabaaab', 'aaaaaaaa']);

  PT('chevron', 'Chevron', { a: '#f472b6', b: '#831843' }, [
    'aabbbbaa', 'abbaabba', 'bbaaaabb', 'baaaaaab',
    'aabbbbaa', 'abbaabba', 'bbaaaabb', 'baaaaaab']);

  PT('brick', 'Brick', { a: '#b45309', b: '#78350f', c: '#d6d3d1' }, [
    'aaaaaaac', 'aaaaaaac', 'aaaaaaac', 'cccccccc',
    'aaacaaaa', 'aaacaaaa', 'aaacaaaa', 'cccccccc']);

  PT('waves', 'Waves', { a: '#0e7490', b: '#22d3ee', c: '#cffafe' }, [
    'aabbccbb', 'aaabbccb', 'baaabbcc', 'cbaaabbc',
    'ccbaaabb', 'bccbaaab', 'bbccbaaa', 'abbccbaa']);

  PT('starry', 'Starry', { a: '#1e1b4b', b: '#fde047', c: '#a5b4fc' }, [
    'aaacaaaa', 'aabaaaaa', 'abbbaaca', 'aabaaaaa',
    'aaaaabaa', 'acaabbba', 'aaaaabaa', 'aaaaaaaa']);

  // ---- stamps ---------------------------------------------------------------
  // Little decals you press onto whatever you're making. Empty pixels stay
  // empty, so a stamp lands on top of your work rather than punching a hole.
  const ST = (id, name, pal, px) => T({ id, name, cat: 'stamp', sub: 'stamp', pal, px });

  ST('stamp_heart', 'Heart', { '.': null, r: '#dc2626', l: '#fca5a5' }, [
    '.rr..rr.', 'rllrrllr', 'rlrrrrlr', 'rrrrrrrr',
    '.rrrrrr.', '..rrrr..', '...rr...', '........']);

  ST('stamp_star', 'Star', { '.': null, y: '#fde047', o: '#f59e0b' }, [
    '...yy...', '...yy...', '.yyyyyy.', 'yyyoyoyy',
    '.yyyyyy.', '..yooy..', '.yo..oy.', '........']);

  ST('stamp_skull', 'Skull', { '.': null, w: '#f8fafc', e: '#1f2937' }, [
    '.wwwwww.', 'wwwwwwww', 'weewweew', 'weewweew',
    'wwwwwwww', 'wwewewww', '.wwwwww.', '..w.w.w.']);

  ST('stamp_leaf', 'Leaf', { '.': null, g: '#4ade80', d: '#166534' }, [
    '.....gg.', '...ggggg', '..gggdgg', '.gggdggg',
    'gggdgggg', 'ggdggg..', 'dgggg...', 'dd......']);

  ST('stamp_crown', 'Crown', { '.': null, y: '#fbbf24', o: '#b45309', r: '#dc2626' }, [
    'y......y', 'yy.rr.yy', 'yyy..yyy', 'yyyyyyyy',
    'yyryyryy', 'yyyyyyyy', 'oooooooo', '........']);

  ST('stamp_moon', 'Moon', { '.': null, w: '#fef3c7', g: '#d6d3d1' }, [
    '..wwww..', '.wwwwgw.', 'wwwgwww.', 'wwwwww..',
    'wwwwww..', 'wwgwww..', '.wwwww..', '..wwww..']);

  ST('stamp_paw', 'Paw', { '.': null, b: '#78350f', l: '#a16207' }, [
    '.bb..bb.', '.bb..bb.', 'bb....bb', 'bb....bb',
    '..bbbb..', '.bllllb.', 'bllllllb', '.bbbbbb.']);

  ST('stamp_anchor', 'Anchor', { '.': null, s: '#94a3b8', d: '#334155' }, [
    '...ss...', '..sddss.', '...ss...', '.ssssss.',
    '...ss...', 's..ss..s', 'sd.ss.ds', '.ssssss.']);

  ST('stamp_rune', 'Rune', { '.': null, c: '#22d3ee', d: '#0e7490' }, [
    '..cccc..', '.cd..dc.', 'cd....dc', 'c..cc..c',
    'c..cc..c', 'cd....dc', '.cd..dc.', '..cccc..']);

  ST('stamp_bloom', 'Bloom', { '.': null, p: '#f472b6', y: '#fde047', g: '#4ade80' }, [
    '..pp.pp.', '.pppppp.', 'ppyyyypp', 'ppyyyypp',
    '.pppppp.', '..pppp..', '...gg...', '..gg.g..']);

  // ---- palettes -------------------------------------------------------------
  // A palette is just a design eight pixels wide and one tall. That means it
  // saves, renames, duplicates and shows up in My Designs with no extra code —
  // it rides the same rails as everything else.
  const PL = (id, name, colours) => T({
    id, name, cat: 'palette', sub: 'palette', w: 8, h: 1,
    pal: colours.reduce((o, c, i) => (o[CHARS[i]] = c, o), { '.': null }),
    px: [colours.map((_, i) => CHARS[i]).join('')],
  });

  PL('pal_forest', 'Forest', ['#0f2417', '#1e4d2b', '#2f6b28', '#4d9e3f', '#84cc16', '#a3e635', '#d9f99d', '#f7fee7']);
  PL('pal_ember', 'Ember', ['#1c0a05', '#450a0a', '#7f1d1d', '#b91c1c', '#ea580c', '#f59e0b', '#fbbf24', '#fef3c7']);
  PL('pal_frost', 'Frost', ['#0c1a2b', '#0c4a6e', '#0369a1', '#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd', '#f0f9ff']);
  PL('pal_dusk', 'Dusk', ['#1e1b4b', '#312e81', '#4c1d95', '#7c3aed', '#a78bfa', '#c4b5fd', '#e9d5ff', '#faf5ff']);
  PL('pal_bone', 'Bone', ['#111827', '#374151', '#57534e', '#78716c', '#a8a29e', '#d6d3d1', '#e7e5e4', '#fafaf9']);
  PL('pal_candy', 'Candy', ['#500724', '#9d174d', '#db2777', '#f472b6', '#fb923c', '#fde047', '#a5f3fc', '#fdf2f8']);

  // ---- emblems --------------------------------------------------------------
  const E = (id, name, pal, px) => T({ id, name, cat: 'emblem', sub: 'emblem', pal, px });

  E('emblem_shield', 'Shield', { '.': null, a: '#7dd3fc', b: '#0369a1', w: '#f8fafc' }, [
    '............', '.aaaaaaaaaa.', '.abbbbbbbba.', '.abwwbbwwba.',
    '.abwwbbwwba.', '.abbbwwbbba.', '.abbwwwwbba.', '.abbbbbbbba.',
    '..abbbbbba..', '...abbbba...', '....abba....', '.....aa.....']);

  E('emblem_leaf', 'Leaf', { '.': null, g: '#4ade80', d: '#166534', s: '#a16207' }, [
    '............', '.....gg.....', '...gggggg...', '..gggddggg..',
    '.ggggddgggg.', '.gggdddgggg.', '.ggggddgggg.', '..gggddggg..',
    '...gggdgg...', '.....s......', '.....s......', '.....s......']);

  E('emblem_flame', 'Flame', { '.': null, r: '#dc2626', o: '#f97316', y: '#fde047' }, [
    '.....r......', '....rr......', '...rror.....', '...rooor....',
    '..rrooorr...', '..roooyor...', '..rooyyoor..', '..rooyyyor..',
    '...royyor...', '...rooor....', '....rrr.....', '............']);

  // ---- packing --------------------------------------------------------------
  // Designs are stored as a palette plus rows of characters, exactly like the
  // templates are authored — a 16×16 design costs a few hundred bytes, not a
  // PNG. Every design carries its format version so old ones can be migrated.
  function pack(colors, w, h) {
    const pal = { '.': null };
    const byColor = new Map();
    let n = 0;
    const rows = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        const c = colors[y * w + x];
        if (!c) { row += '.'; continue; }
        let ch = byColor.get(c);
        if (ch === undefined) {
          if (n >= MAX_COLORS) { row += '.'; continue; }
          ch = CHARS[n++];
          byColor.set(c, ch);
          pal[ch] = c;
        }
        row += ch;
      }
      rows.push(row);
    }
    return { px: rows, pal };
  }

  function unpack(d) {
    const out = new Array(d.w * d.h).fill(null);
    for (let y = 0; y < d.h; y++) {
      const row = d.px[y] || '';
      for (let x = 0; x < d.w; x++) out[y * d.w + x] = d.pal[row[x]] || null;
    }
    return out;
  }

  const blank = (w, h) => new Array(w * h).fill(null);

  // ---- designs --------------------------------------------------------------
  function fromTemplate(tpl, name) {
    return {
      v: FORMAT, id: null, tpl: tpl.id, cat: tpl.cat,
      name: name || tpl.name, w: tpl.w, h: tpl.h,
      px: tpl.px.slice(), pal: Object.assign({}, tpl.pal),
      fav: 0, at: 0, up: 0,
    };
  }

  // A portrait design and the [dx,dy,colour] body the game has always stored are
  // the same thing seen from two sides. Nothing about existing saves changes.
  function toBody(d) {
    const cells = unpack(d);
    const out = [];
    for (let y = 0; y < d.h; y++) {
      for (let x = 0; x < d.w; x++) {
        const c = cells[y * d.w + x];
        if (c) out.push([x - (d.w >> 1), y - (d.h >> 1), c]);
      }
    }
    return out;
  }

  function fromBody(body, w, h) {
    w = w || 12; h = h || 12;
    const cells = blank(w, h);
    for (const [dx, dy, c] of body || []) {
      const x = dx + (w >> 1), y = dy + (h >> 1);
      if (x >= 0 && y >= 0 && x < w && y < h) cells[y * w + x] = c;
    }
    return cells;
  }

  // Server-side gate. Anything that fails comes back with a reason rather than
  // being silently dropped, so the client can say what went wrong.
  function validate(d) {
    if (!d || typeof d !== 'object') return 'not a design';
    const tpl = TPL[d.tpl];
    if (!tpl) return 'unknown template';
    if (d.w !== tpl.w || d.h !== tpl.h) return 'wrong size for that template';
    if (!Array.isArray(d.px) || d.px.length !== d.h) return 'bad pixel rows';
    for (const row of d.px) {
      if (typeof row !== 'string' || row.length !== d.w) return 'bad pixel row';
    }
    if (!d.pal || typeof d.pal !== 'object') return 'bad palette';
    const keys = Object.keys(d.pal);
    if (keys.length > MAX_COLORS + 1) return 'too many colours';
    for (const k of keys) {
      const v = d.pal[k];
      if (v === null) continue;
      if (typeof v !== 'string' || !HEX.test(v)) return 'bad colour';
    }
    return null;
  }

  function sanitize(d) {
    const tpl = TPL[d.tpl];
    const clean = {
      v: FORMAT, id: d.id, tpl: d.tpl, cat: tpl.cat,
      name: String(d.name || tpl.name).replace(/[<>&]/g, '').trim().slice(0, 24) || tpl.name,
      w: tpl.w, h: tpl.h,
      px: d.px.map(r => String(r).slice(0, tpl.w)),
      pal: {}, fav: d.fav ? 1 : 0,
      at: d.at || Date.now(), up: Date.now(),
    };
    for (const [k, v] of Object.entries(d.pal)) {
      if (k.length !== 1) continue;
      clean.pal[k] = v === null ? null : String(v);
    }
    return clean;
  }

  // Older saves arrive here first. Right now there is only format 1; the shape
  // exists so that when there's a format 2 nobody loses their creations.
  function migrate(d) {
    if (!d) return null;
    if (!d.v) d.v = FORMAT;
    return d;
  }

  // ---- blueprints -----------------------------------------------------------
  // A blueprint is a room you already built, saved so you can build it again:
  // a rectangle of interior cells plus the designs the furniture in it points
  // at. It stores *references*, not copies, so repainting a chair repaints it
  // in every room stamped from the same blueprint. Deleting a design a
  // blueprint needs is refused, same as one that's still standing.
  const BP_FORMAT = 1;
  const MAX_BLUEPRINTS = 40;
  const BP_MAX = 24;                                          // biggest rectangle you may take
  const BP_KINDS = ['paint', 'wall', 'door', 'window', 'bench', 'art'];

  // The cabinet is what makes a building a home — it is never captured and never
  // stamped over, so a blueprint can't take one away or hand you a second.
  function blueprintFrom(cells, x0, y0, w, h, name) {
    const out = [];
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cv = cells.get((x0 + dx) + ',' + (y0 + dy));
        if (!cv || !BP_KINDS.includes(cv.k)) continue;
        out.push(cv.k === 'art' ? [dx, dy, cv.k, cv.c, cv.d, cv.tpl] : [dx, dy, cv.k, cv.c]);
      }
    }
    return { v: BP_FORMAT, id: null, name: name || 'room', w, h, cells: out, fav: 0, at: 0, up: 0 };
  }

  function validateBlueprint(bp) {
    if (!bp || typeof bp !== 'object') return 'not a blueprint';
    if (!(bp.w >= 1 && bp.w <= BP_MAX && bp.h >= 1 && bp.h <= BP_MAX)) return `blueprints go up to ${BP_MAX}×${BP_MAX}`;
    if (!Array.isArray(bp.cells)) return 'bad cells';
    if (bp.cells.length > BP_MAX * BP_MAX) return 'too many cells';
    for (const c of bp.cells) {
      if (!Array.isArray(c) || c.length < 4) return 'bad cell';
      const [dx, dy, k, col] = c;
      if (!Number.isInteger(dx) || !Number.isInteger(dy)) return 'bad cell position';
      if (dx < 0 || dy < 0 || dx >= bp.w || dy >= bp.h) return 'cell outside the blueprint';
      if (!BP_KINDS.includes(k)) return 'that kind of cell cannot be saved';
      if (typeof col !== 'string' || !HEX.test(col)) return 'bad colour';
      if (k === 'art' && (typeof c[4] !== 'string' || !TPL[c[5]])) return 'bad furniture reference';
    }
    return null;
  }

  const sanitizeBlueprint = bp => ({
    v: BP_FORMAT, id: bp.id,
    name: String(bp.name || 'room').replace(/[<>&]/g, '').trim().slice(0, 24) || 'room',
    w: bp.w | 0, h: bp.h | 0,
    cells: bp.cells.map(c => c[2] === 'art' ? [c[0] | 0, c[1] | 0, c[2], c[3], c[4], c[5]] : [c[0] | 0, c[1] | 0, c[2], c[3]]),
    fav: bp.fav ? 1 : 0, at: bp.at || Date.now(), up: Date.now(),
  });

  const blueprintRefs = bp => [...new Set((bp && bp.cells || []).filter(c => c[2] === 'art').map(c => c[4]))];

  // ---- procedural variation -------------------------------------------------
  // Random must produce something *readable*. Rather than scattering pixels, we
  // keep the template's shape and give it a coherent new palette: the design's
  // colours are ranked by brightness and remapped onto a generated ramp, so the
  // shading that made the sprite legible survives the recolour.
  const rnd = () => Math.random();

  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const v = l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
      return Math.round(255 * v).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }

  const lum = hex => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  };

  // a small harmonious ramp: a base hue, its shade, a highlight and an accent
  function palette(n, r) {
    r = r || rnd;
    const base = r() * 360;
    const scheme = r();
    const accent = base + (scheme < 0.34 ? 180 : scheme < 0.67 ? 140 : 40);
    const sat = 0.35 + r() * 0.45;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const useAccent = n > 2 && i === n - 1 && r() < 0.6;
      out.push(hsl(useAccent ? accent : base + (r() - 0.5) * 18, sat, 0.2 + t * 0.62));
    }
    return out;
  }

  function recolor(d, r) {
    const used = Object.entries(d.pal).filter(([, v]) => v).sort((a, b) => lum(a[1]) - lum(b[1]));
    const ramp = palette(used.length, r);
    const pal = { '.': null };
    used.forEach(([k], i) => { pal[k] = ramp[i]; });
    return Object.assign({}, d, { pal, up: Date.now() });
  }

  // ---- patterns, stamps and palettes ---------------------------------------
  // The three ways one design gets reused inside another. All of them work on
  // the same packed pixels, so a pattern made for a rug drops onto a banner or
  // a bed without knowing either of them exists.

  const patternable = tplId => !!(TPL[tplId] && TPL[tplId].field && TPL[tplId].field.length);

  // Fill an object's cloth with a tiling pattern, leaving its frame alone. The
  // pattern repeats from the object's own top-left, so two rugs side by side
  // line up rather than drifting.
  function applyPattern(d, pat) {
    const tpl = TPL[d.tpl];
    if (!tpl || !tpl.field) return d;
    const cells = unpack(d);
    const pcells = unpack(pat);
    for (const i of tpl.field) {
      const x = i % d.w, y = (i / d.w) | 0;
      cells[i] = pcells[(y % pat.h) * pat.w + (x % pat.w)];
    }
    return Object.assign({}, d, pack(cells, d.w, d.h), { up: Date.now() });
  }

  // Press a stamp onto a grid, centred where you clicked. Empty stamp pixels
  // leave what's underneath, so stamps sit on top of your work.
  function stampInto(cells, w, h, stamp, cx, cy) {
    const s = unpack(stamp);
    const ox = cx - (stamp.w >> 1), oy = cy - (stamp.h >> 1);
    for (let y = 0; y < stamp.h; y++) {
      for (let x = 0; x < stamp.w; x++) {
        const col = s[y * stamp.w + x];
        if (!col) continue;
        const tx = ox + x, ty = oy + y;
        if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        cells[ty * w + tx] = col;
      }
    }
    return cells;
  }

  // the colours a design actually uses, darkest first — this is what "save the
  // palette of the thing I'm looking at" produces
  const paletteOf = d => Object.values(d.pal).filter(Boolean)
    .filter((c, i, a) => a.indexOf(c) === i).sort((a, b) => lum(a) - lum(b));

  // Wear a saved palette. The design's own colours are ranked by brightness and
  // spread across the new ramp, so its shading survives whatever you dress it in
  // — a six-colour sprite in a three-colour palette still reads as itself.
  function applyPalette(d, colours) {
    if (!colours || !colours.length) return d;
    const used = Object.entries(d.pal).filter(([, v]) => v).sort((a, b) => lum(a[1]) - lum(b[1]));
    const pal = { '.': null };
    used.forEach(([k], i) => {
      const t = used.length === 1 ? 0 : i / (used.length - 1);
      pal[k] = colours[Math.round(t * (colours.length - 1))];
    });
    return Object.assign({}, d, { pal, up: Date.now() });
  }

  // a palette design built out of whatever colours you hand it
  function paletteDesign(colours, name) {
    const eight = [];
    for (let i = 0; i < 8; i++) {
      const t = colours.length === 1 ? 0 : i / 7;
      eight.push(colours[Math.round(t * (colours.length - 1))] || colours[colours.length - 1]);
    }
    const d = fromTemplate(TPL.pal_forest, name || 'my colours');
    return Object.assign(d, pack(eight, 8, 1));
  }

  // Mutate keeps the palette's character and nudges it, then flips a few pixels
  // on the silhouette's edge — enough to feel different, never enough to break.
  function mutate(d, r) {
    r = r || rnd;
    const pal = { '.': null };
    const shift = (r() - 0.5) * 40;
    for (const [k, v] of Object.entries(d.pal)) {
      if (!v) continue;
      const l = lum(v);
      pal[k] = hsl(hueOf(v) + shift, 0.3 + r() * 0.5, Math.max(0.12, Math.min(0.9, l + (r() - 0.5) * 0.18)));
    }
    const rows = d.px.slice();
    const inks = Object.keys(pal).filter(k => pal[k]);
    const flips = 2 + Math.floor(r() * 5);
    for (let i = 0; i < flips && inks.length; i++) {
      const y = Math.floor(r() * d.h);
      const x = Math.floor(r() * d.w);
      const row = rows[y];
      if (!row) continue;
      // only touch a cell that already has a neighbour, so nothing floats away
      const near = (xx, yy) => rows[yy] && rows[yy][xx] && rows[yy][xx] !== '.';
      if (!(near(x - 1, y) || near(x + 1, y) || near(x, y - 1) || near(x, y + 1))) continue;
      const ch = row[x] === '.' ? inks[Math.floor(r() * inks.length)] : '.';
      rows[y] = row.slice(0, x) + ch + row.slice(x + 1);
    }
    return Object.assign({}, d, { px: rows, pal, up: Date.now() });
  }

  function hueOf(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
    if (!dl) return 0;
    let h;
    if (mx === r) h = ((g - b) / dl) % 6;
    else if (mx === g) h = (b - r) / dl + 2;
    else h = (r - g) / dl + 4;
    return h * 60;
  }

  // a whole random design from a random template in a category
  function randomDesign(cat, r) {
    r = r || rnd;
    const pool = list(cat);
    const tpl = pool[Math.floor(r() * pool.length)];
    const d = recolor(fromTemplate(tpl), r);
    d.name = tpl.name;
    return d;
  }

  const list = cat => Object.values(TPL).filter(t => !cat || t.cat === cat);
  const subs = cat => [...new Set(list(cat).map(t => t.sub))];
  const blocks = tplId => {
    const t = TPL[tplId];
    return !!(t && t.behaviour && BEHAVIOUR[t.behaviour] && BEHAVIOUR[t.behaviour].blocks);
  };
  // what happens when you click this thing — 'bed', 'storage', or nothing
  const useOf = tplId => (TPL[tplId] && TPL[tplId].use) || null;
  // what it takes to put one down, over and above the energy — [[id, n], …]
  const costOf = tplId => (TPL[tplId] && TPL[tplId].cost) || null;
  // which family this piece joins up with — 'fence', 'path', or nothing
  const joinOf = tplId => (TPL[tplId] && TPL[tplId].join) || null;
  // where its four arms live, so a side with no neighbour can be left undrawn
  const armsOf = tplId => (TPL[tplId] && TPL[tplId].arms) || null;
  // n, e, s, w — the order of the bits in a connection mask
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const ARM_KEYS = ['n', 'e', 's', 'w'];
  // every template that does this job, so a starter home can be furnished from
  // the library rather than from hard-coded art
  const withUse = use => Object.values(TPL).filter(t => t.use === use);

  return {
    FORMAT, MAX_DESIGNS, MAX_COLORS, CATS, BEHAVIOUR, TPL,
    BP_FORMAT, MAX_BLUEPRINTS, BP_MAX, BP_KINDS,
    blueprintFrom, validateBlueprint, sanitizeBlueprint, blueprintRefs,
    BUILDINGS, SLOTS, SLOT_CHARS, OBJECT_SLOTS, DEFAULT_FACADE,
    defaultFacade, composeFacade, cleanFacade, facadeRefs,
    STYLE_FORMAT, MAX_STYLES, validateStyle, sanitizeStyle, styleRefs, slotFits, resolveFacade,
    list, subs, blocks, useOf, costOf, withUse, patternable,
    joinOf, armsOf, DIRS, ARM_KEYS,
    pack, unpack, blank, fromTemplate, toBody, fromBody,
    validate, sanitize, migrate,
    palette, recolor, mutate, randomDesign, hsl, lum,
    applyPattern, stampInto, paletteOf, applyPalette, paletteDesign,
  };
});
