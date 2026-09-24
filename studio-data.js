/* Shared project catalogue. Keep public availability separate from production methods. */
globalThis.B3DProjects = [
  {id:'glass-and-fortune',title:'Glass & Fortune',category:'development',status:'Private alpha · teaser live',hook:'Bend the roll. Cheat fate.',description:'A tactile roguelike built around five glass dice, risky combinations, and a masked fortune-teller who never gives you the whole truth.',image:'images/dice/glass-01.png',accent:'#c1a5ff',teaser:'teasers/glass-and-fortune/',teaserCta:'Play dice teaser'},
  {id:'bid-and-buried',title:'Bid & Buried',category:'development',status:'In development · teaser live',hook:'Buy blind. Dig deep. Get rich.',description:'Peek inside a locker, buy it, dig front to back, and choose what earns space in your van.',image:'images/locker/buried-05.png',accent:'#f4bc70',teaser:'teasers/bid-and-buried/',teaserCta:'Play locker teaser'},
  {id:'speck',title:'Speck',category:'development',status:'Private development · teaser live',hook:'Start small. Leave something behind.',description:'A shared survival sandbox about beginning as almost nothing, shaping the objects around you, and turning an empty patch of world into home.',image:'images/speck/speck_01.png',accent:'#a6e8ae',teaser:'teasers/speck/',teaserCta:'Open Speck Studio'},
  {id:'wrfm',title:'WRFM Radio',category:'play',status:'Listen live',hook:'Smooth jazz for people who ship code.',description:'Genuinely good, vocal-free smooth jazz you can leave on all day, hosted by Vera Lang with strange callers and developer-minded commercials.',image:'images/wrfm/wrfm_03.png',accent:'#ff7181',liveUrl:'https://brok3nby-design.github.io/wrfm/',liveCta:'Listen live'},
  {id:'pocket-wilds',title:'Pocket Wilds',category:'play',status:'Playable beta',hook:'Explore the wilds. Face the dice.',description:'A retro fantasy adventure where free-roaming exploration gives way to tactical dice battles when a boss seals the door.',image:'images/pocket-wilds-1.png',accent:'#ffd166',teaser:'teasers/pocket-wilds/',teaserCta:'Play boss fight teaser'},
  {id:'labyrinth-fate',title:'The Maze',category:'development',status:'In development',hook:'The world remembers the roll.',description:'A narrative dice game about choices, chance, and the consequences you carry through a hostile maze.',image:'images/studio/labyrinth-fate.svg',accent:'#bd9bda'},
  {id:'macabre-dolls',title:'Macabre Dolls',category:'experiments',status:'Concept · not developed',hook:'Every doll has a past.',description:'A collection of haunting artwork and card-game ideas. A concept archive, with no playable game or teaser.',image:'images/dolls/creepy-dolls_1.jpg',accent:'#e0a6b0'},
  {id:'juicebox',title:'Juicebox',category:'experiments',status:'Film experiment',hook:'Small format. Strange possibilities.',description:'An experimental short film in early development, exploring character, voice, and self-contained stories.',image:'images/studio/juicebox.svg',accent:'#ff9eab'},
  {id:'graffiti',title:'Graffiti',category:'play',status:'Live guestbook',hook:'Draw something small. Leave it behind.',description:'A shared pixel-art guestbook where every visitor can draw, sign, and leave a permanent mark on the wall.',image:'images/graffiti/graffiti_logo.png',accent:'#ff5b38',liveUrl:'graffiti/',liveCta:'Sign the guestbook'},
  {id:'doqi',title:'DOQI',category:'experiments',status:'Prototype · on hold · teaser live',hook:'Your answers have been filed.',description:'The Department of Questionable Inventions: a satirical personality game about ridiculous decisions and their consequences.',image:'images/doqi/doqi_01.jpg',accent:'#a4c9ff',teaser:'teasers/doqi/',teaserCta:'Try five-question teaser'}
];
// Content remaining is an asset/content estimate, not overall game completion.
const progressReports = {
  'glass-and-fortune': {remaining:15, testing:'Steam & itch demo · within 2 months', release:'Q1–Q2 2027', hours:'Approx. 30 hours'},
  'bid-and-buried': {remaining:50, testing:'Q1–Q2 2027', release:'Q4 2027', hours:'Approx. 30–40 hours'},
  'speck': {remaining:65, testing:'Q1–Q2 2027', release:'Q4 2027', hours:'Approx. 24 hours'},
  'wrfm': {remaining:85, testing:'Not for sale', release:'Free to play · Q1–Q2 2027', hours:'Approx. 60 hours'},
  'pocket-wilds': {remaining:65, testing:'Q1–Q2 2027', release:'Q3–Q4 2027', hours:'Approx. 30 hours'},
  'doqi': {remaining:40, testing:'2028', release:'2028', hours:'Approx. 60 hours'},
  'macabre-dolls': {remaining:25, testing:'No ETA', release:'No ETA', hours:'Approx. 40 hours'},
  'graffiti': {remaining:null, testing:'Live now', release:'Live now', hours:'Not yet reported'}
};
const projectOrder = ['glass-and-fortune','bid-and-buried','speck','wrfm','pocket-wilds','doqi','macabre-dolls','labyrinth-fate','juicebox','graffiti'];
globalThis.B3DProjects.sort((a,b)=>projectOrder.indexOf(a.id)-projectOrder.indexOf(b.id));
for (const project of globalThis.B3DProjects) project.progress = progressReports[project.id] || {remaining:null, testing:'No ETA', release:'No ETA', hours:'Not yet reported'};
