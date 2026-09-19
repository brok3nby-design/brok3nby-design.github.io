// ---- the first morning: the cold open on a brand new career ----
// Six beats before the first paper ever lands. It says what a storage auction IS, who
// else turns up, why anybody keeps at it and where the road goes — then hands you to the
// town you start in, which gets its own arrival card like every other town. One voice,
// the narrator's; Buzz says the rules at the yard, after the paper — a film and a man
// talking over it were fighting each other.
//
// It plays ONCE, on a genuinely new game, and never again — the same discipline as
// the town arrival card and the rival intros. Click for the next beat, SKIP or Escape
// to leave. Every frame takes a motion clip (openings\op_<id>.mp4) over its still,
// and falls back to a background you already have rather than a placeholder where
// there is a sensible one.
'use strict';

const FM_SECS = 5.2;              // how long a beat holds on its own
const FM_FADE = 0.7;              // the picture coming out of black
const FM_TEXT = 1.1;              // the line arriving after it
const FM_TAIL = 0.6;              // the beat holds until its voice is done, then this much longer
const FM_HOLD_MAX = 45;           // and never longer than this, whatever is still talking

// Six beats: what this is, where it happens, that it is you, who else is there, WHY
// anybody keeps at it, and what you have. Every one borrows a background you already own,
// so the cold open looks finished on a fresh install and only gets better as its own frames
// are painted.
//
// The fourth is the one that is not orientation (IDEAS_TODO 7; the user, 2026-09-17:
// "we kind of have to somewhere, if there is a main story, tease that"). The other four
// tell you how the game works and none of them says why you would still be here on day
// thirty. There IS a main thread — mythEpochOwner gives each town a legendary object per
// twelve days, with rumours, a key day and a lock day — and the opening pointed at none
// of it. So one beat points at it, and NEVER NAMES THE THING. Naming it would spoil the
// single discovery the whole game is built around, and "no two people tell it the same
// way" is the honest version anyway: every source in this game is wrong sometimes.
// It sits before the van, which is the road out and has to be the last thing said.
//
// THE GAME'S OPENING, NOT THE TOWN'S (user, 2026-09-18): "the game isn't really about Dusty Flats. Dusty
// Flats is just the starting city." The yard beat used to stamp DUSTY FLATS across the screen with the
// town's own sting, so the town's introduction was knotted into the game's. It is gone from here. The film
// is about the game — the lockers, you, the people, the legend, the road — and when it ends, the town you
// start in gets its OWN arrival card, the same one every other town gets (startArrive), with its postcard,
// its sting and the narrator line already recorded for it. Dusty Flats had that card all along; a new game
// counted the town as visited, so it never played.
//
// The rivals beat is the one the game was missing (same day): "I don't want this to just be a bidding
// game." Winning is not only having the most money; the people in the room remember what you did. The beat
// names nobody and explains no rule — you meet them one at a time at the yard and learn them by playing.
// Their cutouts stand in the frame, the way they do on the title screen.
//
// A beat can name its own `voice` take, and a `fallback` for while that take is not recorded yet: the old
// words with the old take, so the caption on screen never disagrees with the voice saying it.
const FIRST_MORNING = [
  { id: 'door', bg: 'bg_dig',
    line: 'Somebody rented a room, filled it, and then stopped paying for it.' },
  { id: 'yard', bg: 'bg_title',
    line: 'The yard takes the room back. What is inside goes to whoever turns up.' },
  { id: 'office', bg: 'bg_auction',
    line: "That's you." },                            // the narrator's too. Buzz says the rules at the yard, after the paper
  { id: 'rivals', bg: 'bg_title', cast: true,
    line: "You won't be the only one who turns up. Same faces, town after town, and every one of them keeps score. "
      + 'Money buys you the locker. The people in the room decide what it costs.' },
  { id: 'legend', bg: 'bg_museum',
    line: 'Everybody out here has a story about the one that got away. Some door nobody looked at twice, '
      + 'and what was found at the back of it. No two people tell it the same way.' },
  // the id stays 'van' so its painted frame and clip (openings\op_van) keep working; only the words moved on
  { id: 'van', bg: 'bg_yard', voice: 'nar_open_road',
    line: () => fmt$(G.money) + ', a van, and a road with a yard in every town on it. '
      + 'Everybody starts in the same place. Nobody starts owning it.',
    fallback: { voice: 'nar_open_van',
      line: () => fmt$(G.money) + ', a van, and a row of doors nobody has opened in years. '
        + 'The paper lands at six — read it before you bid.' } },
];
const FM_ART_IDS = FIRST_MORNING.map((b) => b.id);
// every narrator take the film can use: each beat's own, and any fallback still standing in for one
const FM_VOICE_IDS = FIRST_MORNING.map((b) => b.voice || 'nar_open_' + b.id)
  .concat(FIRST_MORNING.filter((b) => b.fallback).map((b) => b.fallback.voice));

// the new take not recorded yet: the old words and the old take, together
function fmUsesFallback(b) { return !!b.fallback && !(typeof _snd !== 'undefined' && _snd[b.voice] && _snd[b.voice].length); }
function fmVoice(b) { return fmUsesFallback(b) ? b.fallback.voice : (b.voice || 'nar_open_' + b.id); }
function fmLine(b) { const l = fmUsesFallback(b) ? b.fallback.line : b.line; return typeof l === 'function' ? l() : l; }

// The rivals in the frame: the faces you meet first (the road regulars) mixed with ones from further out,
// in an order the world seed picks. The first five are asked for up front as the film starts.
//
// But a cutout is a big picture and the download lanes are busy at boot — measured, one asked for at the
// start of the film took about ten seconds to land. So the beat does not wait on particular faces: when it
// starts it takes the first five of its order that have ARRIVED, and locks them in, so nobody pops into
// the shot halfway. The title screen's four are always in by then, so the yard is never empty.
const FM_CAST_N = 5;
function fmCastIds() {
  const R = RNG(strHash('fmcast_' + G.worldSeed));
  const near = R.shuf(NPCS.map((n) => n.id).filter((id) => NPC_CUT_IDS.includes(id)));
  const far = R.shuf(Object.keys(EXTRA_NPCS).filter((id) => NPC_CUT_IDS.includes(id)));
  // near, far, near, far, near ... so the ones from out of town are not all stood at one end
  const out = [];
  while (near.length || far.length) {
    if (near.length) out.push(near.shift());
    if (far.length) out.push(far.shift());
  }
  return out;
}
function drawFmCast(fm) {
  const ready = (id) => { const im = npcCutout(id); return im && im.height ? im : null; };
  // choose at the start of the beat, from what has arrived; then hold that choice for the whole shot
  if (!fm.castNow || (fm.castNow.length < FM_CAST_N && fm.t < 0.3)) fm.castNow = (fm.cast || []).filter(ready).slice(0, FM_CAST_N);
  const figs = fm.castNow.map((id) => ({ id, im: ready(id) })).filter((f) => f.im);
  if (!figs.length) return;
  const n = figs.length;
  for (let i = 0; i < n; i++) {
    const f = figs[i];
    // knees up, like a film shot: feet go behind the letterbox. The middle one stands a little nearer.
    const h = i === Math.floor(n / 2) ? 330 : (i % 2 ? 300 : 312);
    const w = Math.round(h * f.im.width / f.im.height);
    const cx = Math.round(W * (i + 1) / (n + 1));
    // one at a time, a third of a second apart, each coming up a few pixels as it lands
    const a = clamp((fm.t - 0.35 - i * 0.3) / 0.5, 0, 1);
    if (a <= 0) continue;
    g.globalAlpha = a;
    g.drawImage(f.im, cx - w / 2, H - 40 - h + Math.round((1 - a) * 10), w, h);
  }
  g.globalAlpha = 1;
}

// a fresh career only. Never on a load, never inside a ?demo= state.
function startFirstMorning(back) {
  if (G.demo) return false;
  G.firstMorning = { i: 0, t: 0, spoke: false, back: back || null, cast: fmCastIds() };   // `back`: the dev room replaying it
  for (const id of G.firstMorning.cast.slice(0, FM_CAST_N)) if (typeof askCutout === 'function') askCutout(id, true);
  G.mode = 'firstmorning';
  _musicDuck = 0.1;                                   // the room goes quiet for it
  _musicPoll = 0;
  return true;
}
function firstMorningNext() {
  const fm = G.firstMorning;
  if (!fm) return;
  voFlush(true);                                      // moving on cuts whoever is talking — even Buzz
  fm.i++;
  fm.t = 0; fm.spoke = false; fm.endedAt = null; fm.castNow = null;
  if (fm.i >= FIRST_MORNING.length) firstMorningEnd();
}
function firstMorningEnd() {
  if (!G.firstMorning) return;
  voFlush(true);                                      // nothing from the film bleeds into the paper
  const back = G.firstMorning.back;
  G.firstMorning = null;
  _musicDuck = 1;
  _musicPoll = 0;
  if (back) { G.mode = back; return; }               // the dev room replaying it wants it back
  // then the town you start in gets its own welcome, the card every town gets the first time you pull in —
  // its postcard, its sting, its narrator line — and that card hands on to the paper (endArrive)
  const town = curTown();
  startArrive(town, town.arrival ? town.arrival[0] : null);
}

function drawFirstMorning(dt) {
  const fm = G.firstMorning;
  const b = FIRST_MORNING[fm.i];
  fm.t += dt;

  px(g, 0, 0, W, H, '#05060a');
  // the picture, out of black. Its own art first, then the background it borrows.
  const fade = clamp(fm.t / FM_FADE, 0, 1);
  const clip = useVideo(_opVid, b.id);
  const own = _opImg[b.id];
  const borrowed = !own || !own.length ? (b.bg && _bg[b.bg]) : null;
  const list = (own && own.length) ? own : borrowed;
  g.globalAlpha = fade;
  if (clip) drawCoverBG(clip, clip.videoWidth, clip.videoHeight);
  else if (list && list.length) drawCoverBG(list[0], list[0].naturalWidth, list[0].naturalHeight);
  else {
    // nothing painted yet: the slot says so, quietly, and the beat still plays
    px(g, 0, 0, W, H, '#12141c');
    const R = RNG(strHash(b.id));
    g.fillStyle = 'rgba(120,130,160,0.05)';
    for (let i = 0; i < 200; i++) g.fillRect(R.i(0, W - 4), R.i(0, H - 2), R.i(2, 6), 1);
    T(W / 2, H / 2 - 26, '[ ' + b.id.toUpperCase() + ' ]', '#3f465c', 15, 'center', true);
    T(W / 2, H / 2 - 4, 'openings\\op_' + b.id + '.jpg', '#3f465c', 12, 'center');
  }
  g.globalAlpha = 1;
  px(g, 0, 0, W, H, 'rgba(5,6,10,' + (0.34 * (1 - fade) + 0.18).toFixed(3) + ')');

  if (b.cast) drawFmCast(fm);

  // letterbox: this is the one part of the game that is a film
  const barH = Math.round(46 * clamp(fm.t / 0.45, 0, 1));
  px(g, 0, 0, W, barH, '#05060a');
  px(g, 0, H - barH, W, barH, '#05060a');

  // the narrator lands with the words, not before them. (The town's name and sting used to be stamped on
  // the yard beat and held him back for them; that is the arrival card's job now.)
  const narratorAt = FM_TEXT * 0.9;
  if (!fm.spoke && fm.t > narratorAt) {
    fm.spoke = true;
    // one voice for the whole film: the narrator. Buzz waits for the yard. No cooldown: a line
    // said in a restarted game a few seconds ago must still be said now (that silence was the
    // bug — the queue thought the narrator was repeating himself), and a hard flush first, so
    // nothing left over can hold the queue busy.
    voFlush(true);
    speak([fmVoice(b)], false, { cooldown: 0 });
  }
  // a beat holds until its voice is done — the long rules take runs well past FM_SECS —
  // and a little after; with nothing recorded, it is simply FM_SECS
  if (fm.spoke && !fm.endedAt && !_voCur) fm.endedAt = fm.t;

  // the line, a beat behind the picture
  if (fm.t > FM_TEXT) {
    const tf = clamp((fm.t - FM_TEXT) / 0.55, 0, 1);
    g.globalAlpha = tf;
    const lines = fitLines(fmLine(b), W - 60, [19, 18, 17], 3).lines;   // by measure, and marked if ever cut
    const ty = H - barH - 34 - (lines.length - 1) * 24;
    px(g, 0, ty - 20, W, lines.length * 24 + 30, 'rgba(5,6,10,0.55)');
    for (let i = 0; i < lines.length; i++) T(W / 2, ty + i * 24, lines[i], PAL.paper, 19, 'center');
    g.globalAlpha = 1;
  }

  // where you are in it
  for (let i = 0; i < FIRST_MORNING.length; i++)
    px(g, W / 2 - FIRST_MORNING.length * 7 + i * 14, H - barH + 14, 8, 4, i === fm.i ? PAL.yellow : '#2a3145');

  hot(0, 0, W, H, () => firstMorningNext(), { focusable: false });
  if (fm.t > 1.2) {
    T(W - 22, H - barH + 12, 'click to continue', PAL.dgray, 11, 'right');
    button(18, H - barH + 6, 96, 26, 'SKIP', () => firstMorningEnd(), { col: PAL.slate, fs: 13 });
  }
  const voiceDone = !fm.spoke || (fm.endedAt != null && fm.t > fm.endedAt + FM_TAIL);
  // with no take recorded a beat is a caption, and a caption holds long enough to read (about three words a
  // second): the rivals line is thirty-odd words and FM_SECS alone gave it five seconds
  // (a beat with its take recorded follows the voice, as it always has)
  const recorded = typeof _snd !== 'undefined' && _snd[fmVoice(b)] && _snd[fmVoice(b)].length;
  const readFor = recorded ? FM_SECS : Math.max(FM_SECS, 1.5 + fmLine(b).split(/ +/).length / 3);
  if (fm.t > readFor && !G.demoFreeze && (voiceDone || fm.t > FM_HOLD_MAX)) firstMorningNext();
}
