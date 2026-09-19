// ---- the drive home: the place from outside, for a second and a half ----
// You go home every single day of a career, so this is a TRANSITION, not a scene:
// about a second and a half of the house from the road, headlights swinging across
// it. Short enough that it reads as flow rather than as something
// to skip, and a click or Escape drops you straight through it.
//
// Two nights earn more than that and get a held beat with a line over it: the very
// first load you ever bring home, and the first night the yard belongs to you.
// Everything the unload does has already happened by the time this draws — this is
// only the picture, so skipping it can never cost you anything.
'use strict';

// long enough for what is playing over it (user, 2026-09-16: "the audio goes longer than the cutscene").
// The CONTINUE button still appears at 1.4s, so nobody who wants to get on with it is held up.
const DH_SECS = 2.4;              // an ordinary night
const DH_HELD = 6.6;              // a night that has something to say, and a narrator saying it
const DH_LINES = {
  first: 'The first load. None of it is yours, exactly. It is just yours now.',
  yard: 'The lights are on because you pay for them now.',
};

function driveHomeBeat() {
  if (G.demo) return false;                 // a ?demo= state is a fixed picture, never a transition
  const first = !G.world.droveHome;
  G.world.droveHome = true;
  const owned = typeof yardOwned === 'function' && yardOwned();
  const war = G.world.arcs && G.world.arcs.spiteWar;                    // the night of the first spite war: the diner has an opinion
  const diner = !!(war && war.day === G.day && !war.dinerSaid);
  const kind = first ? 'first' : (owned && !G.world.droveHomeOwned ? 'yard' : (diner ? 'diner' : null));
  if (kind === 'yard') G.world.droveHomeOwned = true;
  if (kind === 'diner') war.dinerSaid = true;
  G.driveHome = { t: 0, kind, len: kind ? DH_HELD : DH_SECS, line: kind === 'diner' ? spiteWarDinerLine(war) : null };
  G.mode = 'drivehome';
  _musicPoll = 0;
  return true;
}
function driveHomeEnd() {
  if (!G.driveHome) return;
  G.driveHome = null;
  G.mode = 'sell';
  _musicPoll = 0;
  saveMid('sell');
}

function drawDriveHome(dt) {
  const dh = G.driveHome;
  dh.t += dt;
  const p = clamp(dh.t / dh.len, 0, 1);

  // the house from the road. Its own art if it exists, the garage darkened if not.
  if (!drawBG()) px(g, 0, 0, W, H, '#0a0b12');
  px(g, 0, 0, W, H, 'rgba(4,5,11,' + (hasArt('bg_house') ? 0.34 : 0.62).toFixed(2) + ')');

  // headlights swinging across the front and going out — drawn, so there is motion
  // here on day one with no art made at all
  const sweep = clamp(dh.t / (dh.len * 0.55), 0, 1);
  const hx = -260 + sweep * (W + 520);
  const warm = 0.30 * (1 - sweep) + 0.05;
  const grad = g.createLinearGradient(hx - 260, 0, hx + 260, 0);
  grad.addColorStop(0, 'rgba(255,214,150,0)');
  grad.addColorStop(0.5, 'rgba(255,214,150,' + warm.toFixed(3) + ')');
  grad.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // the nights that have something to say
  if (dh.kind && dh.t > 0.9) {
    if (!dh.spoke) { dh.spoke = true; if (DH_LINES[dh.kind]) speak(['nar_home_' + dh.kind], true); }   // the narrator keeps to the two once-a-career nights
    const tf = clamp((dh.t - 0.9) / 0.6, 0, 1);
    g.globalAlpha = tf;
    const lines = wrapText(dh.line || DH_LINES[dh.kind], 58).slice(0, 2);
    px(g, 0, 92, W, lines.length * 26 + 24, 'rgba(5,6,10,0.55)');
    for (let i = 0; i < lines.length; i++) T(W / 2, 104 + i * 26, lines[i], PAL.paper, 20, 'center');
    g.globalAlpha = 1;
  }

  // out through black, so the garage screen arrives clean
  if (p > 0.86) px(g, 0, 0, W, H, 'rgba(4,5,11,' + ((p - 0.86) / 0.14).toFixed(3) + ')');

  hot(0, 0, W, H, () => driveHomeEnd(), { focusable: false });
  if (dh.kind && dh.t > 1.4) button(W / 2 - 70, H - 44, 140, 30, 'CONTINUE', () => driveHomeEnd(), { col: PAL.slate, fs: 14 });
  if (dh.t >= dh.len && !G.demoFreeze) driveHomeEnd();
}
