// Speck — the prop library: things the Before left, and things people left after.
//
// Every one of these is 16×16 like any other template, and every one is drawn
// through the same small kit — light from the top left, one stone palette, one
// wood palette, a bed of shadow under anything that stands — so a broken pillar
// and a cart wheel look like they were left in the same world by the same
// weather. See LORE.md: the Before moved earth, it did not decorate.
//
// `behaviour` is gameplay, exactly as it is for furniture: solid things you walk
// around, pass things you walk over. Painting one a different colour never
// changes that.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Props = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const PAL = { '.': null, k: '#3b4148', a: '#565d66', b: '#767d86', c: '#959ca5', d: '#b3bac2', q: '#4e4a42', w: '#6d685d', e: '#8a8478', r: '#a49d8f', n: '#3a2617', m: '#5c3d22', o: '#7d5433', p: '#9c6c45', g: '#b8b2a0', h: '#d8d2c0', i: '#4a3226', j: '#6e4a34', l: '#8f6549', s: '#25562a', t: '#357a38', u: '#4f9e3f', v: '#8ccf6a', x: '#c46a7a', y: '#d9b45a', z: '#7a8fc4', D: '#10141a', E: '#1b2129', W: '#2c6f96', V: '#4a95bd', A: '#6b6155', B: '#928779', C: '#c9bfae', X: '#2a2f26' };

  const PROPS = [
    { id: 'standing_stone', name: 'Standing Stone', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '.....teeee......', '.....twwwwq.....',
      '.....ewwwwq.....', '.....ewwwwq.....', '.....ewwwwq.....', '.....trwwrq.....',
      '.....erwwrq.....', '.....swwwwq.....', '.....trwwwq.....', '.....swwwwq.....',
      '....XewwwwqXX...', '...XXqqqqqqXXX..', '....XXXXXXXXX...', '........X.......',
    ] },
    { id: 'leaning_stone', name: 'Leaning Stone', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '........eqqqq...', '........eqqq....',
      '.......eqqqq....', '.......eqqqq....', '......eqqqq.....', '......eqqqq.....',
      '......eqqqq.....', '.....tqqqq......', '.....eqqqq......', '.....eqqqq......',
      '....eqqqqXXXX...', '...XeqqqqXXXXX..', '....XXXXXXXXX...', '........X.......',
    ] },
    { id: 'fallen_stone', name: 'Fallen Stone', sub: 'stones', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '................', '................',
      '..eeeeeeteeeeq..', '..twrwwwwwrwwq..', '..swwwwwrwwwwqX.', '.XqqqqqqqqqqqqXX',
      '..XXXXXXXXXXXXX.', '........X.......', '................', '................',
    ] },
    { id: 'trilithon', name: 'Trilithon', sub: 'stones', behaviour: 'solid', px: [
      '................', '.eeeeeeeeeeeeeq.', '.ewwwwwwwwwwwwq.', '.qqqqqqqqqqqqqq.',
      '..eeeq....eeeq..', '..ewwq....ewwq..', '..ewwq....ewwq..', '..ewwq....ewwq..',
      '..twwq....ewwq..', '..ewwq....ewwq..', '..ewwq....ewwq..', '..ewwq....ewwq..',
      '..ewwq..X.ewwq..', '..qqqqXXXXqqqqX.', '.XXXXXXXXXXXXXXX', '..XXXXXXXXXXXXX.',
    ] },
    { id: 'obelisk', name: 'Obelisk', sub: 'stones', behaviour: 'solid', px: [
      '.......e........', '......eeeq......', '......ewwq......', '......ewwq......',
      '......eqqq......', '......ewwq......', '......ewwq......', '......eqqq......',
      '......ewwq......', '......ewwq......', '......eqqq......', '......ewwq......',
      '......ewwq......', '....eeeeeeeq....', '....qqqqqqqqX...', '.....XXXXXXX....',
    ] },
    { id: 'broken_obelisk', name: 'Broken Obelisk', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '................', '.......w........', '.......ts.......', '......ewwq......',
      '......ewwq......', '......ewwq......', '.eeeq.ewwq......', '..qqq.ewwq......',
      '......swwq......', '....eeeeeeeqX...', '...XqqqqqqqqXX..', '....XXXXXXXXX...',
    ] },
    { id: 'cairn', name: 'Cairn', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '................', '......tcc.......',
      '......aaaa......', '......cccca.....', '.....cbbbba.....', '.....aaaaaa.....',
      '....tcccccca....', '....cbbbbbba....', '....aaaaaaaa....', '...ccccccccca...',
      '...tbbbbbbbbaX..', '..XaaaaaaaaaaXX.', '...XXXXXXXXXXX..', '........X.......',
    ] },
    { id: 'stone_circle_mark', name: 'Circle Stone', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '................', '.......eeeq.....', '......ewwwq.....', '......errrq.....',
      '......rrwrr.....', '......rwwwr.....', '......rrwrr.....', '......errrq.....',
      '.....XewwwqX....', '....XXqqqqqXX...', '.....XXXXXXX....', '........X.......',
    ] },
    { id: 'glyph_stone', name: 'Glyph Stone', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '................', '....eeeeeeeq....',
      '....ewwwwwwq....', '....ewDwwDwq....', '....ewDDDDwq....', '....ewwwwwwq....',
      '....ewDwwDwq....', '....ewDwwDwq....', '....ewwwwwwq....', '....ewwDwwwq....',
      '....ewwDwwwqX...', '...XqqqqqqqqXX..', '....XXXXXXXXX...', '........X.......',
    ] },
    { id: 'waymarker', name: 'Waymarker', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '.....ddddda.....', '.....aaaaaa.....', '......ccca......', '......cbba......',
      '......ckka......', '......ckba......', '......cbba......', '......cbba......',
      '......cbbaX.....', '.....XaaaaXX....', '......XXXXX.....', '........X.......',
    ] },
    { id: 'boulder', name: 'Boulder', sub: 'stones', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '.......bbb......', '.....bdcbbbs....', '....cdddcccbb...', '...bdddddccbbb..',
      '..bccdddccccbbb.', '..bbccdccccbbbb.', '..bbcccccccbbb..', '...bbbbcbbbbbb..',
      '..XXbbbbbbbbbXX.', '...aaaaaaaaaaa..', '.......bbb......', '................',
    ] },
    { id: 'rock_cluster', name: 'Rocks', sub: 'stones', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '........b.......', '.......dbb......',
      '....cbbbbbb.....', '..cccccbbbcb....', '..bbcbbbbccccb..', '...bbbbbbbcbbbb.',
      '..XXXbXXXbbbbbX.', '...XXXXXXXXbXX..', '........X.......', '................',
    ] },
    { id: 'barrow', name: 'Barrow', sub: 'tombs', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '................', '................', '......uuut......', '....uuuuuuutt...',
      '..tuuuuuuuuuttt.', '..uuuueeequuutt.', '.ttuuueDDquutttt', '..ttuueDDqutttt.',
      '..tttteDDqttttt.', '.sssssqDDqsssssX', '..XXXXXtttXXXXX.', '........X.......',
    ] },
    { id: 'tomb_door', name: 'Tomb Door', sub: 'tombs', behaviour: 'solid', px: [
      '................', '................', '..eeeeeeeeseeq..', '..ewwwwwwwwwwq..',
      '..swwwwwwwwwwq..', '..errrrrrrrrrq..', '..ewwbbbbbkwwq..', '..ewwbDDDDkwwq..',
      '..ewwbDDDDkwwq..', '..ewwbDDDDkwwq..', '..ewwbDDDDkwwq..', '..ewwbDDDDkwwq..',
      '..swwbDDDDkwwq..', '..qqqkDDDDkqqq..', '..XXXXXXXXXXXXX.', '...XXXXXXXXXXX..',
    ] },
    { id: 'sarcophagus', name: 'Sarcophagus', sub: 'tombs', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '....cccccccca...', '..ecbbbbrbbbaq..', '..eaaaarrraaaq..', '..ewwwwrrrwwwq..',
      '..ewwwrrrrrwwq..', '..ewwwwrrrwwwq..', '..ewwwwrrrwwwq..', '..ewwwwwrwwwwq..',
      '..qqqqqqqqqqqqX.', '.XXXXXXXXXXXXXXX', '..XXXXXXXXXXXXX.', '........X.......',
    ] },
    { id: 'grave_slab', name: 'Slab', sub: 'tombs', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '..eeeesseseesq..', '..swwwwwwwwwwq..',
      '..ewqqqqqqqqwq..', '..ewwwwwwwwwwq..', '..ewqqqqqqwwwq..', '..qqqqqqqqqqqqX.',
      '.XXXXXXXXXXXXXXX', '..XXXXXXXXXXXXX.', '........X.......', '................',
    ] },
    { id: 'grave_marker', name: 'Grave Marker', sub: 'tombs', behaviour: 'solid', px: [
      '................', '................', '................', '........c.......',
      '.......ccc......', '......cccc......', '......cccca.....', '......cbcba.....',
      '......ckbka.....', '......cbbba.....', '......cbkba.....', '......cbbba.....',
      '......cbbba.....', '.....XaaaaaX....', '......XXXXX.....', '........X.......',
    ] },
    { id: 'bone_pile', name: 'Bones', sub: 'tombs', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '.....h..........', '....hhh.........',
      '...hDhDhggggh...', '....hhh.gh......', '.....hggX..gh...', '...hgXXggggXXX..',
      '..XXXhgXXghXXXX.', '...XXXXXXXXXXX..', '........X.......', '................',
    ] },
    { id: 'skull', name: 'Skull', sub: 'tombs', behaviour: 'pass', px: [
      '................', '................', '................', '........h.......',
      '......hhhhh.....', '.....hhhhhhh....', '.....hhhhhhh....', '....hhDDhDDhh...',
      '.....hhhghhh....', '.....hggDggh....', '.....ggggggg....', '......DgDgD.....',
      '....XXXXgXXXX...', '........X.......', '................', '................',
    ] },
    { id: 'urn', name: 'Urn', sub: 'tombs', behaviour: 'solid', px: [
      '................', '................', '................', '......wwww......',
      '.....ewwwww.....', '......wewww.....', '.....weeewww....', '.....eeeeeww....',
      '....wweeewwww...', '.....wwewwww....', '.....wwwwwww....', '......qqqqq.....',
      '......qqqqq.....', '....XXXXXXXXX...', '........X.......', '................',
    ] },
    { id: 'pillar', name: 'Pillar', sub: 'ruins', behaviour: 'solid', px: [
      '................', '....rrrrrrrq....', '....rwwwwwwq....', '....qqqqqqq.....',
      '.....ewwwwq.....', '.....erwwqq.....', '.....erwwqq.....', '.....erwwqq.....',
      '.....erwwqq.....', '.....erwwqq.....', '.....erwwqq.....', '.....erwwqq.....',
      '.....ewwwwq.....', '....eeeeeeeq....', '....qqqqqqqqX...', '.....XXXXXXX....',
    ] },
    { id: 'broken_pillar', name: 'Broken Pillar', sub: 'ruins', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '................', '................', '................', '......teee......',
      '.....erwwq......', '.....erwwqq.....', '.....trwwqq.....', '.....erwwqq.....',
      '.....ewwwwq.....', '....teeeeeeq....', '....qqqqqqqqX...', '.....XXXXXXX....',
    ] },
    { id: 'pillar_base', name: 'Pillar Base', sub: 'ruins', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '................', '................',
      '................', '...eeeesrteeq...', '...ewrrrrrrrq...', '...ewwwwrwwwq...',
      '...qqqqqqqqqq...', '...XXXXXXXXXXX..', '....XXXXXXXXX...', '........X.......',
    ] },
    { id: 'fallen_column', name: 'Fallen Column', sub: 'ruins', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '................', '..ereeereeereeq.',
      '.ewwwwwwwwwwwwq.', '.ewwwwwwwwwwwwq.', '.qqqqqqqqqqqqq..', '.XXXXXXXXXXXXXXX',
      '..XXXXXXXXXXXXX.', '........X.......', '................', '................',
    ] },
    { id: 'arch', name: 'Arch', sub: 'ruins', behaviour: 'solid', px: [
      '...eewww.wwwee..', '..eewww...wwwee.', '.eeww.......wwee', '.ewww.......wwwe',
      '.ewwq......eewwe', '.ewwq......ewwwe', '.ewwq......ewwq.', '.ewwq......ewwq.',
      '.ewwq......ewwq.', '.ewwq......ewwq.', '.ewwq......ewwq.', '.ewwq......ewwq.',
      '.ewwq...X..ewwq.', '.qqqqXXXXXXqqqq.', '.XXXXXXXXXXXXXXX', '..XXXXXXXXXXXXX.',
    ] },
    { id: 'broken_arch', name: 'Broken Arch', sub: 'ruins', behaviour: 'solid', px: [
      '...wwwww........', '..wwwww.........', '.wwws...........', '.wwww...........',
      '.twwq...........', '.wwwq...........', '.ewwq...........', '.ewwq...........',
      '.ewwq...........', '.ewwq...........', '.swwq......eee..', '.ewwq......ewwq.',
      '.twwq...X..ewwq.', '..qqqXXXXXXqqqq.', '..XXXXXXXXXXXXX.', '...XXXXXXXXXXX..',
    ] },
    { id: 'wall_stub', name: 'Ruined Wall', sub: 'ruins', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '....qsqe...eqeq.', '...qqqqq..qqqqq.', '..eqeqeqeqeqeqeq', '..qqqqqqqqqqqqqq',
      '.eqeqeqeqeqeqeq.', '.qqqqqqqqqqqqqq.', '..eqeqeqeqeqeqeq', '..qqqqqqqqqqqqqq',
      '.tqeqeqeqeqeqeq.', '.qqqqqqqqqqqqqqX', '..XXXXXXXXXXXXX.', '........X.......',
    ] },
    { id: 'foundation', name: 'Foundation', sub: 'ruins', behaviour: 'pass', px: [
      '................', '................', '.ew.wwwwwwwwwwq.', '.e............q.',
      '.e........ss..q.', '.e............q.', '..............q.', '.s...........sq.',
      '.e..........s.q.', '.t............q.', '..............q.', '.e............q.',
      '.ss...........q.', '.eqq.qqq.qqqq.q.', '................', '................',
    ] },
    { id: 'steps', name: 'Steps', sub: 'ruins', behaviour: 'pass', px: [
      '................', '................', '................', '.eeeeeseeeeeeeq.',
      '.qqqqqqqqqqqqqq.', '..teeeeeeeeeeq..', '..qqqqqqqqqqqq..', '...seeeeeeeeq...',
      '...qqqqqqqqqq...', '....eeeeeeeq....', '....qqqqqqqq....', '.....eeeeeq.....',
      '.....qqqqqq.....', '................', '................', '................',
    ] },
    { id: 'stair_down', name: 'Stair Down', sub: 'ruins', behaviour: 'pass', px: [
      '................', '.eeeeeeeeeeeeeq.', '.ewwwwwwwwwwwwq.', '.ewkkkkkkkkkkwq.',
      '.ewkkkkkkkkkkwq.', '.ewwkkkkkkkkwwq.', '.ewwkkkkkkkkwwq.', '.ewwwkkkkkkwwwq.',
      '.ewwwkkkkkkwwwq.', '.ewwwwDDDDwwwwq.', '.ewwwwDDDDwwwwq.', '.ewwwwDDDDwwwwq.',
      '.ewwwwDDDDwwwwq.', '.ewwwwDDDDwwwwq.', '.qqqqqqqqqqqqqq.', '................',
    ] },
    { id: 'threshold', name: 'Threshold', sub: 'ruins', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '.seq........etq.', '.ewq........ewq.', '.ewq........ewq.', '.ewq........ewq.',
      '.qqqeeteeeeeqqq.', '.ewwwwwwwwwwwwq.', '.qqqqqqqqqqqqqq.', '..XXXXXXXXXXXXX.',
      '.XXXXXXXXXXXXXXX', '..XXXXXXXXXXXXX.', '........X.......', '................',
    ] },
    { id: 'rubble', name: 'Rubble', sub: 'ruins', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '...e............', '.eq......es.....',
      '.qqe....eqe.....', '.qqq...eqq......', '.......eX.tq....', '.eXXXXXqXXqqXXX.',
      '.XXeXXXXXXeqXXXX', '..XqXXXXXXXXXXX.', '........X.......', '................',
    ] },
    { id: 'flagstones', name: 'Flagstones', sub: 'ruins', behaviour: 'pass', px: [
      '................', '..eq.eeq..s..ee.', '.ewq.ewq.....esq', '.qq..qqq.....sqq',
      '................', '.eeq..eq.eeq.eeq', '.esq.ewq.ewq.ewq', '..qq.qqq.qq..qqq',
      '..........s.....', '.seq.esq.eeq.eeq', '.ewq.ewq.ewq.ewq', '..qq.qqq.qqq.qsq',
      '......s.........', '..eq.eeq.eeq.eeq', '.ewq.ewq.ewq.swq', '.qqq.qqq.qqq.qq.',
    ] },
    { id: 'black_slab', name: 'Black Slab', sub: 'ruins', behaviour: 'solid', px: [
      '................', '....kkkkkkkD....', '....kaEEEEED....', '....kDDDDDDD....',
      '....kEEEEEED....', '....kEEEEEED....', '....kDDDDDDD....', '....kEEEEEED....',
      '....kEEEEEED....', '....kDDDDDDD....', '....kEEEEEED....', '....kEEEEEED....',
      '....kEEEEEED....', '....DDDDDDDDX...', '...XXXXXXXXXXX..', '....XXXXXXXXX...',
    ] },
    { id: 'square_hole', name: 'Square Hole', sub: 'ruins', behaviour: 'pass', px: [
      '................', '................', '..eeeeeeeeeeeq..', '..ewwwwwwwwwwq..',
      '..ewkkkkkkkkwq..', '..ewDDDDDDDDwq..', '..ewDDDDDDDDwq..', '..ewDDDDDDDDwq..',
      '..ewDDDDDDDDwq..', '..ewDDDDDDDDwq..', '..ewDDDDDDDDwq..', '..ewDDDDDDDDwq..',
      '..ewwwwwwwwwwq..', '..qqqqqqqqqqqq..', '................', '................',
    ] },
    { id: 'well', name: 'Well', sub: 'ruins', behaviour: 'solid', px: [
      '................', '................', '...oooooooooo...', '...on...i..on...',
      '...on...i..on...', '...on.wwitwon...', '...onweeieeon...', '...nnee.i.ennw..',
      '...wt.DDDDD.ew..', '...weDDDDDDDew..', '...se.DDDDD.ew..', '...wwee.D.eewt..',
      '....sweeeeeww...', '...XXXwwwwwXXX..', '....XXXXXXXXX...', '........X.......',
    ] },
    { id: 'dead_tree', name: 'Dead Tree', sub: 'left', behaviour: 'solid', px: [
      '................', '........m.......', '........m.......', '....m...m...mm..',
      '..mm.m..m.......', '......moon.m..m.', '.......mmnm.....', '.......omm......',
      '.......omn......', '.......omn......', '.......omn......', '.......omn......',
      '.......omn......', '.....XXnnnXX....', '....XXXXXXXXX...', '.....XXXXXXX....',
    ] },
    { id: 'stump', name: 'Stump', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '................', '.......mos......', '.....soooooo....', '....mopppppom...',
      '....ooponopoo...', '...mmopppppomm..', '....mooooooom...', '....mmmmommms...',
      '...nnnnnnnnnnn..', '....XXXmmmXXX...', '........X.......', '................',
    ] },
    { id: 'log', name: 'Fallen Log', sub: 'left', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '.opooooooooooon.', '.nnnmmmmmmmmmmn.',
      '.npnmnmmmmmmmmn.', '.nnnmmmnmnmmmmn.', '.npnnnnnnnnnnnn.', '.XXXXXXXXXXXXXXX',
      '..XXXXXXXXXXXXX.', '........X.......', '................', '................',
    ] },
    { id: 'driftwood', name: 'Driftwood', sub: 'left', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '........B.......', '.......B........', '.....BB..A.BBC..',
      '....BBBBBBAAAA..', '.CBBBAAAAAAA....', '.AAAA...X...A...', '..XXXXXXXXXXXXX.',
      '........X.......', '................', '................', '................',
    ] },
    { id: 'wreck_ribs', name: 'Wreck', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '................', '....mn..........',
      '....mn.mn.......', '....mn.mn.mn....', '...mn..mn.mn....', '...mn..mt.mn..m.',
      '...mn..mn.mn..m.', '...mn..mn.mn..t.', '...ms.sn..mn..m.', '..ms..mnX.ms.m..',
      '..mnXXmnnnnnsnn.', '.nnnnnnnXXmnXmXX', '..XXXXmsXXmnXXX.', '........X.......',
    ] },
    { id: 'anchor', name: 'Anchor', sub: 'left', behaviour: 'solid', px: [
      '................', '........l.......', '......ll.ll.....', '........li......',
      '.....jjjjjjjj...', '........ji......', '........ji......', '........ji......',
      '........ji......', '........ji......', '....j...ji...j..', '....jj..ji..jj..',
      '.....jjXjiXjj...', '....XXjjjjjjX...', '.....XXXXXXX....', '........X.......',
    ] },
    { id: 'mooring_post', name: 'Mooring Post', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '................', '........p.......',
      '......ppppp.....', '......ompn......', '......ommn......', '.....iiimn......',
      '.....jjjiiii....', '......omjjjj....', '......omms......', '......ommn......',
      '......ommt......', '.....XnnnsXX....', '........X.......', '................',
    ] },
    { id: 'cart_wheel', name: 'Cart Wheel', sub: 'left', behaviour: 'pass', px: [
      '................', '................', '......mmmmm.....', '....mmoomoomm...',
      '...mmo..m.oomm..', '...mom..m..mom..', '..moo.m.i.m.oom.', '..mo...iii...om.',
      '..mmmmiiiiimmmm.', '..mo...iii...om.', '..mo..m.i....om.', '...momXXmXXmom..',
      '...mmooXmXoomm..', '....mmoomoomm...', '......mmmmm.....', '................',
    ] },
    { id: 'crate', name: 'Crate', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '................', '................',
      '...pnnnnnnnnn...', '...opmmmmmmpn...', '...ompmmmmpmn...', '...ommpmmpmmn...',
      '...ommmppmmmn...', '...ommmppmmmn...', '...ommpmmpmmn...', '...ompmmmmpmn...',
      '...opmmmmmmpn...', '...pnnnnnnnnpX..', '....XXXXXXXXX...', '........X.......',
    ] },
    { id: 'barrel', name: 'Barrel', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '........p.......', '....ppppppppp...',
      '......mopmm.....', '.....iiiiiii....', '....mooooommm...', '....mooooommm...',
      '...mooooooomm...', '...iiiiiiiiiii..', '...mmooooommmm..', '....mooooommm...',
      '....iiiiiiiii...', '....XmmmmmmmX...', '.....XmmmmmX....', '.......mmm......',
    ] },
    { id: 'campfire', name: 'Cold Fire', sub: 'left', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '......bbbbb.....', '....bb..A..bb...', '...bbAn.ACnAbb..',
      '...b..AnCnA.Ab..', '...b.AAnnnAA.b..', '...bA.nACAnA.b..', '...bb.A.A.AAbb..',
      '....bbb.A..bb...', '......bbbbb.....', '................', '................',
    ] },
    { id: 'signpost', name: 'Old Signpost', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '................', '.......on.......',
      '..ppppppn.......', '..pnnnnnn.......', '..nntnnnn.......', '.......on.......',
      '.......on.......', '.......on.......', '.......os.......', '.......on.......',
      '.......on.......', '.....XXnnXXX....', '........X.......', '................',
    ] },
    { id: 'lantern_post', name: 'Lantern Post', sub: 'left', behaviour: 'solid', px: [
      '................', '........l.......', '.....llllli.....', '.....lyyyyi.....',
      '.....lyCCyi.....', '.....lyyyyi.....', '.....iiiiii.....', '.......li.......',
      '.......li.......', '.......li.......', '.......li.......', '.......li.......',
      '.......li.......', '.....XXiiXXX....', '........X.......', '................',
    ] },
    { id: 'bell', name: 'Bell', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '..oooooooooooo..', '..on........on..',
      '..on..llll..on..', '..on..llll..on..', '..on..llll..on..', '..on.llllll.on..',
      '..on.llllll.on..', '..on.llllll.on..', '..on.jjjjjj.on..', '..on....i...on..',
      '..on....X...on..', '..nnXXXXXXXXnn..', '........X.......', '................',
    ] },
    { id: 'chain', name: 'Chain', sub: 'left', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '............jj..', '............jjj.', '..jjj.....jjjjj.',
      '..j.j....jjj....', '..jjjjjjjjjj....', '....jjjj.j......', '.....jjjjj......',
      '................', '................', '................', '................',
    ] },
    { id: 'ladder', name: 'Ladder', sub: 'left', behaviour: 'pass', px: [
      '................', '....o.....on....', '....on....on....', '....onooooon....',
      '....on....on....', '....on....on....', '....onooooon....', '....on....on....',
      '....on....on....', '....onooooon....', '....on....on....', '....on....on....',
      '....onooooon....', '....on....on....', '....nn....nn....', '................',
    ] },
    { id: 'cage', name: 'Cage', sub: 'left', behaviour: 'solid', px: [
      '................', '................', '................', '...lllllllll.l..',
      '...j.j.j.j.j.j..', '...j.j...j.j.j..', '.....j.j.j.j.j..', '...j.j.j.j.j.j..',
      '...j.j.j.j.j.j..', '...j.j.j.j.j.j..', '...j.j.j.j.j.j..', '.....j.j.j.j.j..',
      '...j.j.jXj.j.j..', '...iiiiiiiiiii..', '...XXXXXXXXXXX..', '....XXXXXXXXX...',
    ] },
    { id: 'bramble', name: 'Bramble', sub: 'growth', behaviour: 'solid', px: [
      '................', '................', '................', '...ss.s....s....',
      '...t.ss.txt.st..', '....t..st...s...', '...tt.tts.......', '....tt..t.sx....',
      '...tt..t.s......', '...ttst.........', '...ts..s........', '.......stt.tt...',
      '......xsstt..tt.', '......ss.tx.....', '........t.......', '................',
    ] },
    { id: 'reeds', name: 'Reeds', sub: 'growth', behaviour: 'pass', px: [
      '................', '................', '..u.............', '.uu.u...........',
      '.uu.u.t.........', '.uu.utt...u.....', '.uu.utt...u.....', '.uu.utt...u.u...',
      '.utuutt.t.u.u...', '..uu.tttt.u.uu..', '..uutt.tt..uuu..', '..uutt.t.t.u.u..',
      '..uutt..tt.uu...', '..uutt..tt.uu...', '..uutt..tt.uu...', '................',
    ] },
    { id: 'fern', name: 'Fern', sub: 'growth', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '................', '................',
      '.......u.u......', '....uu.u.u.uu...', '......tt.tt.....', '...ut.t.t.t.tu..',
      '.....ttttttt....', '..uuttttst......', '................', '................',
    ] },
    { id: 'flowers', name: 'Wildflowers', sub: 'growth', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '.............x..', '...z.....z..vtv.', '..vtv...vtv..t..', '...ty.z..t...t..',
      '..yvtvtv.t...t..', '.vtztxt..t......', '..vtttt.vtv.....', '..ttttt..t......',
      '..tt.t...t......', '...t.t...t......', '................', '................',
    ] },
    { id: 'tall_grass', name: 'Tall Grass', sub: 'growth', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '................', 't....t...t......',
      't.t..t...t.....t', 't.tuut...tt....t', 'ttttut.t.tu...ut', '.tttutttttuu..ut',
      '.tttu.ttttuu..u.', '.utut.tututu.utt', 'uttut.tutuut.utt', 'uttut.tutuut.utt',
    ] },
    { id: 'mushroom_ring', name: 'Ring of Caps', sub: 'growth', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '.......xxx......', '...xxx..C..xxx..', '....C...B...C...', '....B.......B...',
      '..xxx.......xxx.', '...C.........C..', '...B.........B..', '...xxx.....xxx..',
      '....C..xxx..C...', '....B...C...B...', '........B.......', '................',
    ] },
    { id: 'hedge_ball', name: 'Overgrowth', sub: 'growth', behaviour: 'solid', px: [
      '................', '................', '.......ttt......', '....stsutttt....',
      '....tvuuuuttt...', '...tuuuuuuuttt..', '...vuuuuuuutts..', '..tsvuuuvsuuttt.',
      '..ttusuvusutvtt.', '..ttuuvuuustsst.', '...ttuuuuuttst..', '...ttttutttttt..',
      '...XtttttstttX..', '..XXXtttvttssXX.', '...XXXXtttXXXX..', '........X.......',
    ] },
    { id: 'vine_stone', name: 'Vined Stone', sub: 'growth', behaviour: 'solid', px: [
      '................', '................', '................', '....teeeeeeq....',
      '....twtwuwwq....', '....twtwtwwq....', '....twtutwtu....', '....twtutwtut...',
      '....twuwtwtut...', '....uwtuuutqt...', '....tutwtwtqt...', '....twtutwtut...',
      '....uwuwtwtqt...', '...XtqtqtqtutX..', '....XXXXXXXXX...', '........X.......',
    ] },
    { id: 'roots', name: 'Roots', sub: 'growth', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', 'mmmmmmttmmmmmmmm', '................',
      '........snnsnnnn', 'nsnnnsnn........', '....mmmmnsnnnnnn', 'mmsmmmmm....mmst',
      'mmmmmmmt........', 'mmsmmtmsmmmmmmms', '................', '................',
    ] },
    { id: 'shell_pile', name: 'Shells', sub: 'shore', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '................', '................', '.....h....h.....', '....hgh..hgh....',
      '.....hhC..h.....', '....CCghC...h...', '...CCgCC...hgh..', '..CgCC..X...h...',
      '...CXXXXXXXXXX..', '........X.......', '................', '................',
    ] },
    { id: 'tide_pool', name: 'Tide Pool', sub: 'shore', behaviour: 'pass', px: [
      '................', '................', '................', '................',
      '......bbbbb.....', '....bbWVWWWbb...', '...bbVVVCVVWbb..', '..bbVVVVVVCWWbb.',
      '..bVVVVVVVVVCWb.', '..bWVVVVVVVWWWb.', '..bWVVVVVVVWWWb.', '..bbWWWVWWCWWbb.',
      '...bbWWWWWWWbb..', '....bbWWWWWbb...', '......bbbbb.....', '................',
    ] },
    { id: 'jetty_post', name: 'Jetty Posts', sub: 'shore', behaviour: 'solid', px: [
      '................', '................', '................', '...pn.......pn..',
      '...on.......on..', '...on...pn..on..', '...on...on..on..', '...on...on..on..',
      '...on...on..on..', '...on...on..os..', '...on...os..on..', '...on...os..on..',
      '...ot...os..os..', '...nn...on..nn..', '..XXXXXXonXXXXX.', '........nn......',
    ] },
    { id: 'net', name: 'Torn Net', sub: 'shore', behaviour: 'pass', px: [
      '................', '................', '................', '.BBBBBBBB.......',
      '..BA....BBBBBBB.', '..B.....B.....B.', '.BBBBBBBB..B....', '..B..B..BBBBBBB.',
      '...B..B..B.....B', '.BBBBBBB.B..B..B', '...B..B..BBABBBB', '...B..B..B..B..B',
      '.BBBBBBB.B..B..B', '...B..B..BBBBB.B', '................', '................',
    ] },
    { id: 'cave_mouth', name: 'Cave Mouth', sub: 'shore', behaviour: 'pass', px: [
      '................', '.ccccccccccccca.', '.cbbbbbbbbbbbba.', '.cbbbbbbbbbbbba.',
      '.cbbbbbbbbbbbba.', '.cbbbbbbbbbbbba.', '.cbbbbbbbbbbbba.', '.cbbbbDDDDDbbba.',
      '.sbbDDDDDDDDDba.', '.cbDDDDDDDDDDDa.', '.cbDDDDDDDDDDDa.', '.cDDDDDDDDDDDDD.',
      '.cDDDDDDDDDDDDD.', '.cDDDDDDDDDDDDD.', '.aaaaDDDDDDDaaa.', '................',
    ] },
  ];
  return { PAL, PROPS };
});
