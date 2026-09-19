// ---- more mouths: extra auction lines, tells and gloats, folded into the rivals at load ----
// Writing passes land here so gen.js stays about generation. Every rival gets
// more ways to raise, fold and win; every tell pool gets deeper; the crowd
// gets opinions. Same voices, more of them.
'use strict';

const EXTRA_LINES = {
  bart: {
    raise: ['"I own a bank. Raise."', 'Bart bids with the hand that is not holding the sandwich.', '"Let\'s not make a thing of this."',
            'Bart raises like a man paying for gas.', '"You\'re costing me nothing. Up."'],
    fold: ['"I\'ve got three of those at home." Bart is out.', 'Bart stands, stretches, and that is the fold.', '"Y\'all enjoy the exercise."'],
    win: ['"Somebody load that. Not me." Bart wins.', 'Bart wins and looks mildly inconvenienced by it.'],
  },
  sal: {
    raise: ['"I don\'t need it. I need YOU not to have it."', 'Sal bids with his whole face.', '"Twenty-five more. And another twenty-five. For flavor."',
            'Sal raises and points at you with his chin.', '"Go on. Cry about it. Raise."'],
    fold: ['"Enjoy your garbage." Sal is out.', 'Sal folds so hard his cap comes off.', '"I was never bidding. I was TESTING you."'],
    win: ['Sal wins and does a small, terrible dance.', '"MINE. Ha. Mine." Sal has already forgotten what it is.'],
  },
  ed: {
    raise: ['"Still inside the number." Raise.', 'Ed turns a page and bids on the way through.', '"Carrying cost is fine. Up."',
            'Ed nods, once, at nobody. That is a bid.', '"I priced the back row. Raise."'],
    fold: ['"That\'s the number. I\'m done." Ed underlines it.', 'Ed puts the pencil away. The pencil does not come back out.', '"Somebody wants it more than it\'s worth. Fine."'],
    win: ['"Under." Ed wins. He means under the number.', 'Ed wins and writes down what he will do with it, in order.'],
  },
  dutch: {
    raise: ['"YIIIP!" It rattled the door.', 'Dutch bids with a "yip" so short it was almost polite.', '"Yip yip yip." Three raises? No. One. He was enjoying it.',
            'A "YIP" from the truck. Dutch is in the truck. Dutch is still bidding.', '"Y-I-I-P." He spelled it. It counts.'],
    fold: ['"...yip." Down, not up. Dutch is out.', 'Dutch takes his cap off. That is a fold and also a moment.', 'No yip. A long one.'],
    win: ['"YIIIIIP!" Dutch wins and hugs the auctioneer.', 'Dutch wins and says nothing, which frightens everyone.'],
  },
  duo: {
    raise: ['"It\'s for the SHOP." "We don\'t HAVE a shop." Raise.', 'Kaylee raises. Cody raises her raise. The auctioneer counts one.', '"I said WE. WE are bidding."',
            'Cody bids and immediately looks at Kaylee to see if that was allowed.', '"Fine. FINE. Up." Nobody is sure who said it.'],
    fold: ['"We are leaving." "YOU are leaving." Nobody leaves. They fold.', 'Kaylee folds by taking the paddle and sitting on it.', '"I\'ll remember this." "You won\'t." Out.'],
    rejoin: ['"I changed my mind." "You don\'t HAVE a mind—" The paddle is up again.', 'Cody grabs the paddle back. Kaylee lets him. That means yes.'],
    win: ['They win it. They are already arguing about the van.', '"Told you." "You told me NOT to." Sold to the couple.'],
  },
  vera: {
    raise: ['"The city, darling. The city." Raise.', 'Vera raises with the little finger. It is enough.', '"I have a client for that. I have a client for everything."'],
    fold: ['"Not even for the city." Vera is done.', 'Vera looks at her watch, which is worth more than the unit. Out.'],
    win: ['"Wrap it twice." Vera wins.', 'Vera wins and tips the crowd, somehow.'],
  },
  tuck: {
    raise: ['Tuck moves his hat back a quarter inch. Bid.', 'Tuck exhales. Up.', 'A nod you could miss. The auctioneer did not.'],
    fold: ['Tuck looks at his boots. Done.', 'Tuck is gone. Nobody saw him go.'],
    win: ['Tuck wins. He was already walking to the truck.', 'Tuck pays. Tuck leaves. Tuck won, technically.'],
  },
  bev: {
    raise: ['"The tape\'s the good tape." Raise.', 'Bev bids and counts boxes on her fingers at the same time.', '"That box is heavier on the left. Up."'],
    fold: ['"Bags. Not boxes. Bags." Bev is out.', 'Bev tuts at a box and folds.'],
    win: ['Bev wins and asks the clerk for a box cutter, please.', '"Right. The boxes." Bev collects.'],
  },
  pruitt: {
    raise: ['"Heavy\'s heavy." Raise.', 'Pruitt raises and the tailgate creaks in sympathy.', '"Scale says yes."'],
    fold: ['"Light as a lie." Pruitt is out.', 'Pruitt folds and pats his truck, sorry.'],
    win: ['Pruitt wins and backs up so fast the crowd steps aside.', '"By the pound." Pruitt collects. By the pound.'],
  },
  hattie: {
    raise: ['"The paper does not LIE." Raise.', 'Hattie raises the clipping and the paddle together.', '"Column one. Above the fold. Up."'],
    fold: ['"Not the printed number. Not interested."', 'Hattie folds the paper along its creases. Out.'],
    win: ['"As it was written." Hattie wins.', 'Hattie wins and tucks the clipping into the unit\'s lock.'],
  },
  delgado: {
    raise: ['"Wrong door in the paper. Right door here." Raise.', 'Delgado bids and does not look at the newsstand. That is effort.', '"They printed twelve. This is not twelve. Up."'],
    fold: ['"Too many people read the paper today." Delgado is out.', 'Delgado folds and buys a paper, to tear it.'],
    win: ['"Not in print. Mine." Delgado wins.', 'Delgado wins and nods at the editor across the street. The editor does not nod back.'],
  },
  dee: {
    raise: ['"Quarter-sawn. I can see it from here." Raise.', 'Dee raises and thanks the Reverend, under her breath.', '"Somebody dusted that dresser every Sunday. Up."'],
    fold: ['"Laminate." Dee is out, gently.', 'Dee folds and blesses the unit anyway.'],
    win: ['"It will be loved." Dee wins.', 'Dee wins and asks the loaders to lift with their legs, please.'],
  },
  cobb: {
    raise: ['"Battery\'s still good. Raise."', 'Cobb bids with a wrench in his other hand.', '"Compressor, drill, a something. Up."'],
    fold: ['"Doilies and dishes. Pass."', 'Cobb folds and checks the time on a watch he fixed himself.'],
    win: ['"Load the heavy stuff first." Cobb wins.', 'Cobb wins before Ray finishes the word.'],
  },
  ferrell: {
    raise: ['"A couch. A normal couch. RAISE."', 'Ferrell bids with his eyes on the couch and off everything else.', '"Please just be furniture."'],
    fold: ['"There\'s a jar. There\'s a JAR." Ferrell is out.', 'Ferrell folds and stands a little further from the door.'],
    win: ['"Normal. Normal. Normal." Ferrell wins and does not open the trunk.', 'Ferrell wins and checks under the couch. Just checking.'],
  },
  wanda: {
    raise: ['"Something in there is watching. Raise."', 'Wanda bids with a gloved finger and no expression.', '"Carl will want the whole shelf."'],
    fold: ['"Nothing with eyes." Wanda is out.', 'Wanda folds and puts her glove back on.'],
    win: ['"Leave the lights off." Wanda wins.', 'Wanda wins and hums the same tune as before.'],
  },
  vale: {
    raise: ['"The mark is real. Raise."', 'Vale raises and adjusts his cuff. The cuff was fine.', '"One recognizes a maker. Up."'],
    fold: ['"Painted. Not lacquered. No."', 'Vale folds and says something in French that sounds expensive.'],
    win: ['"Naturally." Vale wins.', 'Vale wins and has it wrapped before the gavel stops moving.'],
  },
  charlie: {
    raise: ['"SHINE. Raise."', 'Charlie bids at his own reflection.', '"Chrome and velvet, baby."'],
    fold: ['"Beige. No."', 'Charlie folds and polishes his sunglasses on his shirt.'],
    win: ['"GLEAM." Charlie wins.', 'Charlie wins and immediately wipes the door.'],
  },
  priscilla: {
    raise: ['"Not one fingerprint. Raise."', 'Priscilla bids and does not touch the paddle. Somehow.', '"Original tags. UP."'],
    fold: ['"A scratch. I felt it from here."', 'Priscilla folds and wipes her hands, which never touched anything.'],
    win: ['"Gloves on. Everyone." Priscilla wins.', 'Priscilla wins and has the unit sealed until the wrap arrives.'],
  },
  garrity: {
    raise: ['"The board has approved." Raise.', 'Garrity raises without expression. He has one expression.', '"Museum grade. Continue."'],
    fold: ['"Below the standard." Garrity is out.', 'Garrity closes the folder. The folder is the fold.'],
    win: ['"Acquired." Garrity wins.', 'Garrity wins. Two men in gloves are already there.'],
  },
  ilse: {
    raise: ['The Baroness lifts an eyebrow one millimeter. Raise.', '"The driver will manage." That was a bid.', '"Yes. Obviously."'],
    fold: ['"Beneath the house." The Baroness is done.', 'The Baroness turns to the window. There is no window. It is a fold.'],
    win: ['"Have it sent." The Baroness wins.', 'The Baroness wins and does not learn what it was.'],
  },
  dex: {
    raise: ['"Raise. Also, what is this." Dex.', 'Dex bids from a livestream.', '"The algorithm says yes."'],
    fold: ['"Vibes off. Out."', 'Dex folds and posts about it.'],
    win: ['"Flipped it already. Before I won it." Dex wins.', 'Dex wins and asks what a 10x10 is, again.'],
  },
};
const EXTRA_CROWD = {
  raise: ['A man in a lawn chair raises without getting up.', 'Somebody\'s grandmother bids. Firmly.', 'A hand goes up in the back and stays up. That is several bids.'],
  fold: ['The lawn chairs fold, literally.', 'A thermos is lowered. The crowd is out.'],
  win: ['A stranger wins it and asks where the units are. He is standing in front of them.', 'The crowd takes it. Nobody will say who.'],
};
const EXTRA_TELLS = {
  bevFull: ['Bev has a box cutter out already. She has not won anything.', 'Bev asked for the tenant\'s name, then said "yes, that one," and nodded at the boxes.'],
  bevEmpty: ['Bev lifted a box one-handed and put it back with two fingers.', '"Packing peanuts," Bev said, to nobody, about this unit.'],
  pruittHeavy: ['Pruitt walked in a circle around this door like a man measuring a truck bed.', 'Pruitt kicked the door frame. It did not ring. He grinned.'],
  pruittLight: ['Pruitt looked in, said "hollow," and went to look at a tire.', 'Pruitt did not even take his hands out of his pockets at this one.'],
  hattieNamed: ['Hattie has underlined the unit number in three colors.', 'Hattie is reading the story aloud to a woman who has already read it.'],
  delgadoNamed: ['Delgado tore this unit\'s number out of the paper and dropped it in the bin.', 'Delgado said "printed" like it was a diagnosis.'],
  delgadoSkipped: ['Delgado has his back to the printed door and his eyes on this one.', '"Unmentioned. Good." Delgado, about this unit.'],
  deeWood: ['Dee tapped the door twice, softly, the way you test a pew.', 'Dee closed her eyes at this door and said a word. It was "walnut."'],
  cobbIron: ['Cobb crouched and looked under the door for a power cord. He found one.', 'Cobb said "two-stroke" again. He says it when he is happy.'],
  ferrellCalm: ['Ferrell looked in this one and did not flinch. First time all week.', 'Ferrell called this unit "a relief." Out loud.'],
  wandaKeen: ['Wanda drew a small circle on the door with her finger. Then wiped it away.', 'Wanda asked the clerk whether this tenant "kept anything alive." The clerk did not answer.'],
  valeLoupe: ['Vale looked in, said one word in French, and closed his eyes like a man tasting something.', 'Vale asked the clerk to spell the tenant\'s surname. Twice. Then he smiled.'],
  charlieShine: ['Charlie took his sunglasses off at this door and put them back on, moved.', '"Look at THAT." Charlie, to the door, about the door.'],
  priscillaMint: ['Priscilla changed gloves at this door. Fresh pair. From a sealed bag.', 'Priscilla whispered "untouched" and touched nothing.'],
  garrityHere: ['A folder is open. Garrity is writing in it. He is looking at this door.', 'Two men in white gloves are standing behind Garrity. They were not here a minute ago.'],
  ilseKnows: ['The Baroness said a number to her driver, quietly. It was about this door.', 'The Baroness has not looked at this door twice. She did not need to once.'],
  dexNoise: ['Dex asked if this unit "has good light." For photos.', 'Dex is livestreaming this door. Forty people are watching. None of them know why.'],
};
const EXTRA_GOSSIP = {
  won: { vera: ['"{amt} for unit {u}, darling? The city would have paid you double for the door."'], hattie: ['"Unit {u} was in the PAPER at {amt}. You paid MORE than the paper."'],
         ilse: ['"Unit {u}." The Baroness pauses. "{amt}." She does not finish the thought. She does not need to.'] },
  legend: { wanda: ['"The {name}. Carl has not slept. Neither have I." Wanda, pleased.'], vale: ['"The {name}. Authentic, I hear. I hear everything." Vale adjusts his cuff.'],
            priscilla: ['"The {name}. In what CONDITION?" Priscilla needs to know.'] },
  fake: { charlie: ['"The {name}! Did it SHINE though?" Charlie means it kindly.'], hattie: ['"The paper said the {name} was out there. The paper did not say it was plastic."'] },
  bargain: { cobb: ['"Unit {u} for {amt}. Fast hands." Cobb approves.'], dee: ['"Unit {u} went cheap. Somebody was meant to have it." Dee smiles.'] },
  keyUsed: { delgado: ['"A key from another town. See? Nothing is where they print it."'], pruitt: ['"A key. Weighs nothing. Opened a box that weighed plenty." Pruitt respects that.'] },
};

// fold everything in
// Sal, once you own the yard he bids at. A third of his raises, when it is yours.
const SAL_OWNED_LINES = {
  raise: ['"Raising. In YOUR yard. Against YOU." Sal enjoys the shape of that.', '"Landlord." Sal raises. He says it like a swear.',
          '"Do I pay you for the door or the privilege?" Sal, raising, to nobody.', 'Sal raises and checks whether you are writing it down. You are the office now.',
          '"I\'d stop bidding in your yard if I had any self-respect." Sal raises.', '"Rent\'s due, boss." Sal raises anyway.'],
  fold: ['"Keep your unit." Sal folds. "Keep your yard."', 'Sal folds and mutters something about the parking space.'],
  win: ['"Mine. In your yard. Put that in the paper." Sal wins.', 'Sal wins one under your own sign and looks straight at the office.'],
};
(function mergeExtraLines() {
  for (const id in EXTRA_LINES) {
    const def = NPCS.find((n) => n.id === id) || EXTRA_NPCS[id];
    if (!def) continue;
    for (const k in EXTRA_LINES[id]) def.lines[k] = (def.lines[k] || []).concat(EXTRA_LINES[id][k]);
  }
  const sal = NPCS.find((n) => n.id === 'sal');
  if (sal) sal.linesOwned = SAL_OWNED_LINES;
  for (const k in EXTRA_CROWD) CROWD_DEF.lines[k] = (CROWD_DEF.lines[k] || []).concat(EXTRA_CROWD[k]);
  for (const k in EXTRA_TELLS) RIVAL_TELLS[k] = (RIVAL_TELLS[k] || []).concat(EXTRA_TELLS[k]);
  for (const kind in EXTRA_GOSSIP) {
    const g = RIVAL_GOSSIP[kind];
    if (!g) continue;
    for (const who in EXTRA_GOSSIP[kind]) {
      if (!g.who.includes(who)) g.who.push(who);
      g.lines[who] = (g.lines[who] || []).concat(EXTRA_GOSSIP[kind][who]);
    }
  }
})();
