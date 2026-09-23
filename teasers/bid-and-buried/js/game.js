// ---- Bid & Buried: main game (960x540) ----
'use strict';

const cv = document.getElementById('game');
const g = cv.getContext('2d');
const W = 960, H = 540;             // logical layout units
const RS = 2;                       // sprite render scale (art px -> logical px)
const FONT = "'Rubik', 'Segoe UI', sans-serif";
const LOGO_FONT = "'VT323', Consolas, monospace";
try {
  document.fonts.load("20px 'VT323'");
  document.fonts.load("20px 'Rubik'");
  document.fonts.load("bold 20px 'Rubik'");
} catch (e) { /* fonts optional */ }

// ============ canvas scaling + fullscreen ============
// The backing store runs at native device resolution; all drawing happens in
// 960x540 logical units through a transform. Text rasterizes at full device
// res (sharp), sprites stay nearest-neighbor chunky (on purpose).
let VIEW = 1;                       // device px per logical px
function sizeCanvas() {
  const ww = window.innerWidth || W, wh = window.innerHeight || H;
  const s = Math.max(0.4, Math.min(ww / W, wh / H, 4));   // fractional fill — no dead space
  const cssW = Math.floor(W * s), cssH = Math.floor(H * s);
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  VIEW = cv.width / W;
  g.imageSmoothingEnabled = false;                // reset by canvas resize
}
window.addEventListener('resize', sizeCanvas);
document.addEventListener('fullscreenchange', sizeCanvas);
sizeCanvas();

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    (document.documentElement.requestFullscreen && document.documentElement.requestFullscreen() || Promise.resolve()).catch(() => {});
  } else if (document.exitFullscreen) document.exitFullscreen();
}

// ============ input ============
const mouse = { x: -99, y: -99 };
cv.addEventListener('mousemove', (e) => {
  const r = cv.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top) * (H / r.height);
  focus.on = false;                              // the mouse moved: hands back to the mouse
});
cv.addEventListener('mouseleave', () => { mouse.x = -99; mouse.y = -99; });
// the paddle (HOLD TO STAY IN): pressed on the way down, let go anywhere on the way up
cv.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  const pr = G.auction && G.auction.paddleRect;
  if (pr && paddleLive() && inRect(x, y, pr.x, pr.y, pr.w, pr.h)) { initAudio(); paddlePress(); }
});
window.addEventListener('mouseup', () => { if (G.auction && G.auction.paddleHeld) paddleRelease(); });
cv.addEventListener('click', (e) => {
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  initAudio();
  handleClick(x, y);
});
cv.addEventListener('wheel', (e) => { handleWheel(Math.sign(e.deltaY)); e.preventDefault(); }, { passive: false });
// right-click: the verbs on the thing itself (IDEAS_TODO 5). Never behind a modal, the pause menu or the closer look.
cv.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (G.modal || G.paused || G.homeInspect) { G.cellMenu = null; return; }
  const r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * (W / r.width);
  const y = (e.clientY - r.top) * (H / r.height);
  initAudio();
  if (!handleRightClick(x, y)) G.cellMenu = null;      // right-clicking nothing puts it away
});
// Escape, the B button, Start: back out of whatever is open, else pause
function escapeAction() {
  if (G.paused) G.paused = false;
  else if (G.modal) { G.modal = null; if (G.auction) G.auction.roomHeld = false; }   // a menu over the room lets it go
  else if (G.cellMenu) G.cellMenu = null;
  else if (G.homeInspect) G.homeInspect = null;
  else if (G.mode === 'auction' && G.auction && G.auction.lookAgain) G.auction.lookAgain = false;
  else if (G.mode === 'auction' && auctionMenuOpen(G.auction)) closeMoveMenu();   // a card, the slip, the panel, a question: put it away
  else if (G.mode === 'paper' || G.mode === 'map') G.mode = 'yard';
  else if (G.mode === 'closed' || G.mode === 'seedpick') G.mode = 'title';
  else if (G.mode === 'tv') tvEnd();
  else if (G.mode === 'npcIntro') npcIntroEnd();
  else if (G.mode === 'itemcard') itemCardEnd();
  else if (G.mode === 'verdict') endVerdict();
  else if (G.mode === 'firstmorning') firstMorningEnd();
  else if (G.mode === 'walkdown') walkEnd();
  else if (G.mode === 'voicemail') vmEnd();                // the machine: stop the tape
  else if (G.mode === 'phone' && G.call) {                 // ringing: let it ring. Hung up on: hang up. Mid-call: an answer is owed
    if (G.call.state === 'ringing') callLetRing(); else if (G.call.state === 'close') callHangUp();
  }
  else if (G.mode === 'drivehome') driveHomeEnd();
  else if (G.mode === 'arrive') endArrive();
  else if (G.mode === 'credits') endCredits();
  else if (G.mode === 'codex') closeCodex();
  else if (G.mode === 'dev') devEscape();
  else if (G.mode !== 'title' && G.mode !== 'sheet') G.paused = true;
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  if (e.key === 'Escape') escapeAction();
});

// everything clickable this frame. opts: label (buttons, for focus defaults),
// focusable:false (a region the keyboard should skip), onAxis(dir) (a fader)
let hotspots = [];
// right-click lives in its own list: the keyboard never lands on these, and a left click never fires one
let rightspots = [];
function rhot(x, y, w, h, cb) { rightspots.push({ x, y, w, h, cb }); }
function handleRightClick(x, y) {
  for (let i = rightspots.length - 1; i >= 0; i--) {
    const r = rightspots[i];
    if (inRect(x, y, r.x, r.y, r.w, r.h)) { r.cb(x, y); return true; }
  }
  return false;
}
function hot(x, y, w, h, cb, opts) {
  const o = { x, y, w, h, cb };
  if (opts) { if (opts.label) o.label = opts.label; if (opts.focusable === false) o.focusable = false; if (opts.onAxis) o.onAxis = opts.onAxis; if (opts.disabled) o.disabled = true; }
  hotspots.push(o);
}
function inRect(px, py, x, y, w, h) { return px >= x && px < x + w && py >= y && py < y + h; }
function handleClick(x, y) {
  for (let i = hotspots.length - 1; i >= 0; i--) {
    const h = hotspots[i];
    if (inRect(x, y, h.x, h.y, h.w, h.h)) { h.cb(x, y); return; }
  }
}

// ============ audio: file-based SFX with synth fallback ============
// Drop files into sounds/ — see docs/SOUNDS.md. Missing files fall back to synth beeps.
let AC = null;
function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  startMusic();
}
function beep(freq, dur, type, vol, delay) {
  if (!AC || _muted || VOL.sfx <= 0) return;
  try {
    const t0 = AC.currentTime + (delay || 0);
    const o = AC.createOscillator(), gn = AC.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    gn.gain.setValueAtTime((vol || 0.08) * VOL.sfx, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn); gn.connect(AC.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* audio unavailable */ }
}

// synth fallbacks
const SYNTH = {
  ui_click: () => beep(700, 0.04, 'square', 0.035),
  tv_on: () => { beep(220, 0.05, 'square', 0.04); beep(880, 0.12, 'sine', 0.05, 0.05); },
  tv_off: () => { beep(660, 0.05, 'square', 0.04); beep(110, 0.18, 'sine', 0.05, 0.05); },
  denied: () => beep(140, 0.12, 'sawtooth', 0.06),
  door_roll: () => { for (let i = 0; i < 6; i++) beep(110 + (i % 2) * 40, 0.05, 'sawtooth', 0.04, i * 0.07); },
  pull_junk: () => beep(180, 0.09, 'triangle', 0.1),
  pull_common: () => beep(300, 0.09, 'triangle', 0.1),
  pull_good: () => beep(440, 0.09, 'triangle', 0.1),
  pull_rare: () => { beep(587, 0.09, 'triangle', 0.1); beep(880, 0.1, 'triangle', 0.09, 0.08); },
  pull_epic: () => { beep(740, 0.09, 'triangle', 0.1); beep(1108, 0.12, 'triangle', 0.09, 0.08); },
  legendary_fanfare: () => { beep(660, 0.1, 'square', 0.1, 0); beep(880, 0.1, 'square', 0.1, 0.1); beep(1174, 0.24, 'square', 0.1, 0.2); },
  container_open: () => { beep(200, 0.06, 'square', 0.06); beep(320, 0.08, 'square', 0.06, 0.07); },
  safe_clunk: () => beep(75, 0.16, 'sine', 0.14),
  safe_crack: () => { beep(500, 0.04, 'square', 0.05); beep(500, 0.04, 'square', 0.05, 0.12); beep(90, 0.2, 'sine', 0.12, 0.3); },
  van_load: () => beep(220, 0.07, 'sine', 0.1),
  van_unload: () => beep(170, 0.07, 'sine', 0.08),
  scrap: () => { beep(120, 0.1, 'sawtooth', 0.06); beep(90, 0.12, 'sawtooth', 0.06, 0.09); },
  coin: () => { beep(660, 0.07); beep(880, 0.1, 'square', 0.08, 0.07); },
  bid_player: () => beep(520, 0.08),
  bid_rival: () => beep(330, 0.08),
  // the gavel bang, then two rising notes — docs/SOUNDS.md asks for a thud under the
  // notes, which the old two-beep version never actually had
  auction_win: () => { beep(65, 0.22, 'sine', 0.22); beep(90, 0.08, 'square', 0.1, 0.02); beep(392, 0.1, 'square', 0.09, 0.16); beep(523, 0.16, 'square', 0.1, 0.26); },
  auction_lose: () => { beep(330, 0.12, 'triangle', 0.08); beep(247, 0.18, 'triangle', 0.08, 0.12); },
  search_rummage: () => { beep(150, 0.05, 'triangle', 0.06); beep(190, 0.05, 'triangle', 0.06, 0.09); beep(160, 0.05, 'triangle', 0.06, 0.18); },
  search_find: () => { beep(880, 0.07, 'square', 0.08); beep(1318, 0.1, 'square', 0.08, 0.07); },
  day_end: () => { beep(523, 0.12, 'triangle', 0.08); beep(392, 0.12, 'triangle', 0.08, 0.13); beep(330, 0.2, 'triangle', 0.08, 0.26); },
  coin_big: () => { beep(660, 0.07); beep(880, 0.08, 'square', 0.08, 0.07); beep(1174, 0.14, 'square', 0.08, 0.15); },
  // the dig, by material: what your hands hear
  pull_wood: () => { beep(120, 0.08, 'triangle', 0.12); beep(90, 0.1, 'sine', 0.1, 0.05); },
  pull_metal: () => { beep(900, 0.03, 'square', 0.08); beep(300, 0.12, 'sawtooth', 0.07, 0.03); },
  pull_cardboard: () => { beep(200, 0.04, 'sawtooth', 0.04); beep(170, 0.04, 'sawtooth', 0.04, 0.05); beep(210, 0.05, 'sawtooth', 0.03, 0.1); },
  pull_cloth: () => beep(160, 0.12, 'sine', 0.05),
  pull_glass: () => { beep(1400, 0.05, 'sine', 0.07); beep(2100, 0.08, 'sine', 0.05, 0.05); },
  // the object sounds (2026-09-18): each falls back to the material recording the thing used to get
  pull_bag: () => play('pull_cardboard'),   // until it is recorded: the cardboard sound it used to get
  pull_game: () => play('pull_metal'),   // until it is recorded: the metal sound it used to get
  pull_paper: () => play('pull_cardboard'),   // until it is recorded: the cardboard sound it used to get
  pull_tapes: () => play('pull_cardboard'),   // until it is recorded: the cardboard sound it used to get
  pull_instrument: () => play('pull_wood'),   // until it is recorded: the wood sound it used to get
  pull_toy: () => play('pull_cloth'),   // until it is recorded: the cloth sound it used to get
  pull_barrel: () => play('pull_metal'),   // until it is recorded: the metal sound it used to get
  pull_bike: () => play('pull_metal'),   // until it is recorded: the metal sound it used to get
  pull_keys: () => play('pull_metal'),   // until it is recorded: the metal sound it used to get
  pull_golf: () => play('pull_metal'),   // until it is recorded: the metal sound it used to get
  pull_watch: () => play('pull_glass'),   // until it is recorded: the glass sound it used to get
  pull_kitchen: () => play('pull_glass'),   // until it is recorded: the glass sound it used to get
  door_slam: () => { beep(70, 0.25, 'sine', 0.18); beep(140, 0.06, 'square', 0.08); },
  // the reveal: the room goes quiet, then one clear note
  reveal_hum: () => { beep(55, 1.6, 'sine', 0.12); beep(82, 1.6, 'sine', 0.06, 0.2); },
  reveal_sting: () => { beep(523, 0.3, 'triangle', 0.08); beep(784, 0.5, 'triangle', 0.08, 0.25); beep(1046, 0.9, 'sine', 0.07, 0.5); },
  sell_cash: () => { beep(660, 0.07); beep(880, 0.1, 'square', 0.08, 0.07); },
  // what money and weight sound like coming off the pile
  pull_cash: () => { beep(1800, 0.05, 'triangle', 0.03); beep(2400, 0.06, 'triangle', 0.03, 0.05); beep(1500, 0.05, 'triangle', 0.03, 0.11); },
  pull_heavy: () => { beep(48, 0.3, 'sine', 0.16); beep(95, 0.08, 'square', 0.05, 0.02); },
  // the verdict: cloth and glass while she looks it over, then either the stamp (sting_verdict) or the claim dying
  // a phone on a garage wall: two quick trills of a bell, the way the old ones rang
  vm_beep: () => { beep(1000, 0.32, 'sine', 0.05, 0); },   // the answering machine's beep (phone.js)
  phone_ring: () => { for (let i = 0; i < 8; i++) beep(i % 2 ? 740 : 880, 0.055, 'triangle', 0.045, i * 0.062); for (let i = 0; i < 8; i++) beep(i % 2 ? 740 : 880, 0.055, 'triangle', 0.045, 0.62 + i * 0.062); },
  verdict_loupe: () => { beep(140, 0.12, 'sine', 0.05); beep(190, 0.1, 'triangle', 0.04, 0.14); beep(120, 0.16, 'sine', 0.04, 0.3); },
  verdict_false: () => { beep(220, 0.18, 'sawtooth', 0.07); beep(150, 0.42, 'sine', 0.09, 0.16); },
  // the item card lands behind the thing: a low note, then a clear one a fifth up — a stamp on a document, not a smack
  sting_verdict: () => { beep(196, 0.9, 'sine', 0.09); beep(294, 0.7, 'triangle', 0.07, 0.3); beep(392, 0.8, 'sine', 0.06, 0.55); },
  // a rival's card hits the plate: a low thud with a bright edge on it, comic-book loud
  sting_slam: () => { beep(70, 0.3, 'sine', 0.2); beep(140, 0.09, 'square', 0.09); beep(330, 0.06, 'square', 0.05, 0.03); },
  // pulling into a town for the first time: a low note under a rising one, a name on a sign
  sting_arrive: () => { beep(110, 0.7, 'sine', 0.1); beep(392, 0.25, 'triangle', 0.07, 0.15); beep(523, 0.6, 'triangle', 0.07, 0.4); },
  // the set is whole: a warm chord, no fanfare. It counts.
  set_complete: () => { beep(392, 0.9, 'triangle', 0.06); beep(494, 0.9, 'triangle', 0.06, 0.08); beep(587, 1.1, 'triangle', 0.06, 0.16); beep(784, 0.6, 'sine', 0.05, 0.5); },
  // the yard approves: a quick rising whoop under the hammer (record a real cheer over it)
  // scattered claps (short random-pitched taps, standing in for applause noise)
  // under the same rising whoop the old version had on its own
  crowd_cheer: () => {
    for (let i = 0; i < 14; i++) beep(1100 + Math.random() * 700, 0.02, 'square', 0.025 + Math.random() * 0.02, Math.random() * 0.6);
    beep(392, 0.08, 'square', 0.05); beep(523, 0.09, 'square', 0.06, 0.06); beep(659, 0.1, 'square', 0.06, 0.12); beep(784, 0.16, 'square', 0.07, 0.18); beep(659, 0.12, 'triangle', 0.05, 0.26);
  },
  // the room leans in: a low swell up a third (record a real "oooh" over it)
  crowd_ooh: () => { beep(196, 0.5, 'sine', 0.07); beep(247, 0.55, 'sine', 0.07, 0.12); beep(294, 0.5, 'sine', 0.05, 0.3); },
  // a shaft of light on the good stuff: a held chord, high and thin (record a real choir-ahh over it)
  heavenly: () => { beep(523, 1.1, 'sine', 0.05); beep(659, 1.1, 'sine', 0.05, 0.08); beep(784, 1.2, 'sine', 0.05, 0.16); beep(1046, 1.5, 'sine', 0.04, 0.3); },
  // the hammer came down your way: a beat after the cheer, the door is yours
  sting_win: () => { beep(196, 0.5, 'sine', 0.12); beep(392, 0.14, 'square', 0.07, 0.06); beep(523, 0.14, 'square', 0.07, 0.16); beep(659, 0.16, 'square', 0.08, 0.26); beep(784, 0.5, 'triangle', 0.08, 0.38); },
  // real money out of a box: a run up the coins with something under it
  jackpot: () => { beep(660, 0.06, 'square', 0.07); beep(880, 0.06, 'square', 0.07, 0.06); beep(1046, 0.07, 'square', 0.07, 0.12); beep(1318, 0.28, 'square', 0.08, 0.19); beep(147, 0.4, 'sine', 0.1, 0.19); },
  // the silence between "going once" and whatever happens next, filled instead of
  // dead — a tight roll that builds, a placeholder for a real recorded drum roll
  sting_closing: () => { for (let i = 0; i < 20; i++) beep(150 + (i % 2) * 55, 0.05, 'square', 0.04 + i * 0.0012, i * 0.115); },
  // one beat of a heart, lub-dub: re-triggered under "going twice", faster as the room heats up
  heartbeat: () => { beep(58, 0.11, 'sine', 0.28); beep(46, 0.15, 'sine', 0.22, 0.17); },
  // the silence breaks: somebody bid at the very last second
  sting_latebid: () => { beep(90, 0.08, 'square', 0.17); beep(760, 0.05, 'square', 0.08, 0.03); beep(520, 0.06, 'square', 0.07, 0.1); },
  sting_dusk: () => { beep(660, 0.25, 'sine', 0.05); beep(495, 0.35, 'sine', 0.05, 0.28); beep(330, 0.6, 'triangle', 0.04, 0.6); },   // the sun at 10: two soft falling notes and a low one that hangs
  unpack_all: () => { for (let i = 0; i < 5; i++) { beep(140 + i * 20, 0.06, 'square', 0.06, i * 0.11); beep(90, 0.05, 'triangle', 0.05, i * 0.11 + 0.03); } },   // UNPACK EVERYTHING: a whole van's worth of lids, one after another
};
const VOICE_LEGACY = ['vo_start', 'vo_bid_a', 'vo_bid_b', 'vo_bid_c', 'vo_once', 'vo_twice', 'vo_sold', 'vo_nosale'];
// auctioneer VO bank — tags follow docs/AUCTIONEER_SCRIPT.md / docs/AUCTIONEER.md
const AUC_VO = [
  'auc_rules_long', 'auc_rules_stinger',
  'auc_limit_named', 'auc_limit_close', 'auc_limit_out',           // recorded for the old limit (removed 2026-09-13); now: a run-up starts, a face sweats, you hold off
  'auc_flavor_lighter',                                             // day wallets: somebody in the room already bought on this row today
  'auc_rep_whale', 'auc_rep_shark',                                 // the yard's name for you opens your door a step higher
  'auc_second_look',                                                // SAY SOMETHING: "Buzz, can we get a second look?"
  'auc_big_spender',                                                // postures: you won LOUD yesterday, the office opens you higher
  'auc_peek_open', 'auc_peek_timesup',
  'auc_open_ready', 'auc_open_howmuch', 'auc_start_needbid',
  'auc_open_lower',        // nobody will start it: he takes a step off the opening price, once (2026-09-20)
  'auc_chant_igot', 'auc_chant_wouldyougive', 'auc_chant_now',
  'auc_pressure',
  'auc_react_big', 'auc_react_min', 'auc_react_war', 'auc_react_back',   // the size and shape of a bid gets a comment
  'auc_react_late',        // a bid lands during the count — the silence breaks
  'auc_closing_call',      // "Anyone? Anyone?" — Buzz fills the once/twice gap sometimes, alongside the roll
  'auc_once', 'auc_twice', 'auc_lastcall', 'auc_fairwarning',
  'auc_sold', 'auc_sold_yourway', 'auc_paythelady', 'auc_nextunit', 'auc_nobid',
  'auc_flavor_hot', 'auc_flavor_junk', 'auc_flavor_gambler',
  'auc_flavor_money',      // Chrome Springs: the gavel talks about money, not lockers
  'auc_flavor_censor',     // the one in the corner that nobody discusses
  'auc_regulars', 'auc_grudge',   // a face he has seen before is back (the log names them, so these stay general)
  // walking the row (walkdown.js, 2026-09-19): his walk-on, his send-off, and a teaser a door by what the doorway shows
  'auc_walk_start', 'auc_walk_end',
  'auc_tease_any', 'auc_tease_owner', 'auc_tease_paper', 'auc_tease_full', 'auc_tease_empty', 'auc_tease_boxes',
  'auc_tease_furniture', 'auc_tease_antiques', 'auc_tease_music', 'auc_tease_tools', 'auc_tease_electronics',
  'auc_tease_jewelry', 'auc_tease_collectibles', 'auc_tease_weird',
];
// spoken bid amounts: num_25 ... num_3000 (see docs/AUCTIONEER.md for the ladder)
const NUM_LADDER = (() => {
  const a = [];
  for (let v = 25; v <= 500; v += 25) a.push(v);
  for (let v = 550; v <= 1000; v += 50) a.push(v);
  for (let v = 1100; v <= 2000; v += 100) a.push(v);
  a.push(2250, 2500, 2750, 3000);
  return a;
})();
const NUM_NAMES = NUM_LADDER.map((v) => 'num_' + v);
const MUSIC_NAMES = ['music_theme', 'music_title', 'music_yard', 'music_auction', 'music_dig', 'music_home', 'music_summary', 'music_credits'];
for (const tid of TOWN_ORDER) MUSIC_NAMES.push('music_town_' + tid);   // a town's own yard track, when you make one
// per-character voice slots: rivals bark/win/fold, buyers react to a sale
const NPC_VO = [];
for (const id of NPCS.map((n) => n.id).concat(Object.keys(EXTRA_NPCS))) NPC_VO.push('npc_' + id + '_bid', 'npc_' + id + '_win', 'npc_' + id + '_fold');
NPC_VO.push('npc_duo_rejoin');     // Kaylee drags Cody back in
NPC_VO.push('npc_ed_scrap');        // Ed heard about what you left in the dark
for (const id of ['pete', 'alice', 'randy', 'gina', 'carl']) NPC_VO.push('npc_' + id + '_buy');
// Buzz's own line introducing a rival, the first time they share a yard with you (see docs/NPC_INTROS.md)
const NPC_INTRO_VO = NPCS.map((n) => n.id).concat(Object.keys(EXTRA_NPCS)).map((id) => 'auc_intro_' + id);
// THE NARRATOR: not the auctioneer. A second voice, dry and unhurried, heard only at
// the moments that happen once in a career — the cold open, the first load home, the
// night the yard is yours. Never on anything that repeats. See docs/VOICE_SCRIPT.md.
const NARRATOR_VO = FM_VOICE_IDS.slice()   // each beat's take, and the old one still standing in for a new one
  .concat(['nar_home_first', 'nar_home_yard', 'nar_credits'])
  .concat(TOWN_ORDER.map((t) => 'nar_town_' + t));   // the first morning in each town, once each
// a gavel with its own voice prefix (AUCTIONEERS[k].voice !== 'auc') gets a bank of its own:
// ray_open_ready, ray_num_250 ... Today every gavel speaks with the one recorded house bank, so this is empty
const GAVEL_VO = [];
for (const k in AUCTIONEERS) {
  const v = AUCTIONEERS[k].voice;
  if (!v || v === 'auc') continue;
  for (const n of AUC_VO) if (n !== 'auc_flavor_money' && n !== 'auc_flavor_censor') GAVEL_VO.push(v + n.slice(3));   // the money and censor lines are the house gavel's only
  for (const n of NUM_NAMES) GAVEL_VO.push(v + '_' + n);
}
// ambience loops: one under the home screen, one per town's yard, plus the
// auction's own optional crowd layer, on top of the town bed (see docs/MUSIC.md)
const AMB_NAMES = ['amb_home', 'amb_auction', 'amb_crowd_hot', 'amb_rain'].concat(TOWN_ORDER.map((tid) => 'amb_town_' + tid));
// stings: the first time you pull into a town (sting_arrive, or a town's own sting_town_<id>)
const STING_NAMES = TOWN_ORDER.map((tid) => 'sting_town_' + tid);
const ALL_SOUND_NAMES = Object.keys(SYNTH).concat(VOICE_LEGACY, AUC_VO, NUM_NAMES, MUSIC_NAMES, AMB_NAMES, NPC_VO, NPC_INTRO_VO, NARRATOR_VO, TV_SOUND_NAMES, GAVEL_VO, STING_NAMES);
const MAX_VARIANTS = 12;  // name.ogg, name_01.ogg ... name_12.ogg — number them contiguously

const _snd = {};          // base name -> [HTMLAudioElement, ...] (all loaded takes)
const _lastTake = {};     // base name -> the take that played last, so it does not play next
let _muted = false;               // session-only: the game always starts with sound (M toggles)
let _voiceMuted = false;          // Buzz and the rivals only — music, sfx and ambience keep playing

// ---- four buses: music, ambience, effects, voice. Faders in the pause menu, kept across games ----
const VOL = { music: 1, amb: 1, sfx: 1, voice: 1 };
(function loadVol() {
  try {
    const v = JSON.parse(Store.get('plVol') || '{}');
    for (const k in VOL) if (typeof v[k] === 'number') VOL[k] = clamp(v[k], 0, 1);
  } catch (e) { /* defaults */ }
})();
function setVol(bus, v) {
  VOL[bus] = clamp(Math.round(v * 10) / 10, 0, 1);
  Store.set('plVol', JSON.stringify(VOL));
  if (bus === 'music' && _musicEl) _musicEl.volume = musicVolNow();
  if (bus === 'amb' && _amb) _amb.vol = AMB_VOL * VOL.amb;   // ambStep applies it next frame
}

// The registry holds URLs, not players. Browsers cap live media players (Chrome
// desktop around seventy-five, phones far fewer) and stall the rest, so with a
// thousand candidate files a probe per <audio> element quietly loses tracks.
// Existence is checked with a HEAD request over http (a metadata-only probe on
// file://, released as soon as it answers), six at a time, and an element is
// made only when a sound actually plays.
function loadSoundFiles() {
  const exts = ['ogg', 'mp3', 'wav'];
  const canFetch = location.protocol !== 'file:' && typeof fetch === 'function';
  // fastest path: sounds/manifest.js (a script tag in index.html, so it works from a
  // double-clicked index.html too; tools/make_manifest.py writes it). Then, to catch files
  // added since the manifest was written: the dev server's listing over http, or a probe of
  // whatever the manifest did not name on file://. A stale manifest only delays, never hides.
  const fromManifest = typeof SOUND_MANIFEST !== 'undefined' && Array.isArray(SOUND_MANIFEST) && SOUND_MANIFEST.length;
  if (fromManifest) registerFiles(SOUND_MANIFEST);
  // the website teaser (teaser/, js/teaser.js) ships a manifest of exactly the files it uses: nothing to list, nothing to probe
  if (typeof window !== 'undefined' && window.BB_TEASER) { /* manifest only */ }
  else if (canFetch) {
    (fromManifest ? Promise.reject(new Error('have manifest')) : fetch('sounds/manifest.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no manifest'))))
      .then((list) => registerFiles(list)))
      .catch(() => fetch('sounds/', { cache: 'no-store' })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error('no listing'))))
        .then((html) => {
          const files = [];
          const re = /href="([^"?#]+\.(?:ogg|mp3|wav))"/gi;
          let m;
          while ((m = re.exec(html))) files.push(decodeURIComponent(m[1].split('/').pop()));
          if (!files.length) throw new Error('empty listing');
          registerFiles(files);
        })
        // last resort: probe for whatever nothing has named yet. This runs even when a
        // manifest was loaded — a manifest written before your last recording session
        // would otherwise hide those files completely on a server with no directory
        // listing, which is a miserable way to lose an afternoon's takes.
        .catch(() => probeAll()));
  } else probeAll();

  // a list of filenames becomes the registry: bare names and contiguous _01.. takes, the game's own extension order.
  // Registering the same file twice (manifest, then listing) is harmless: a url is kept once.
  function add(b, url, take) {
    const list = (_snd[b] = _snd[b] || []);
    if (!list.some((e) => e.url === url)) list.push({ url, take });
  }
  // Takes may be numbered any of these ways: pull_metal.wav (the first), pull_metal-2.wav,
  // pull_metal_2.wav, pull_metal_02.wav. Gaps are fine. One file per stem, best extension wins.
  function registerFiles(list) {
    const known = new Set(ALL_SOUND_NAMES);
    const best = {};
    for (const f0 of list) {
      const f = String(f0);
      const m = /^(.+)\.(ogg|mp3|wav)$/i.exec(f);
      if (!m) continue;
      const stem = m[1], ext = m[2].toLowerCase();
      let base = stem, take = 0;
      const t = /^(.+?)[-_](\d{1,2})$/.exec(stem);
      if (t && known.has(t[1]) && !known.has(stem)) { base = t[1]; take = parseInt(t[2], 10); }
      if (!known.has(base)) continue;
      const cur = best[stem];
      if (!cur || exts.indexOf(ext) < exts.indexOf(cur.ext)) best[stem] = { ext, base, take, file: f };
    }
    for (const stem in best) add(best[stem].base, 'sounds/' + best[stem].file, best[stem].take);
  }

  // the slow path: ask for every candidate, most of which are not there
  const queue = [];
  let inFlight = 0;
  const LANES = canFetch ? 12 : 6;          // http: the browser queues past six per host anyway; file://: stay well under the player cap
  function pump() {
    while (inFlight < LANES && queue.length) {
      const job = queue.shift();
      inFlight++;
      job(() => { inFlight--; pump(); });
    }
  }
  function probeMedia(url, cb) {
    const el = new Audio();
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      el.onloadedmetadata = null; el.onerror = null;
      try { el.removeAttribute('src'); el.load(); } catch (e) { /* ok */ }   // give the player back
      cb(ok);
    };
    el.onloadedmetadata = () => done(true);
    el.onerror = () => done(false);
    el.preload = 'metadata';
    el.src = url;
  }
  function exists(url, cb) {
    queue.push((done) => {
      const finish = (ok) => { done(); cb(ok); };
      if (canFetch) fetch(url, { method: 'HEAD', cache: 'no-store' }).then((r) => finish(r.ok)).catch(() => probeMedia(url, finish));
      else probeMedia(url, finish);
    });
    pump();
  }
  // probe base+suffix, all three extensions at once; report hit/miss so
  // numbered takes can chain (_01 -> _02 -> ...) and stop at the first gap
  function probe(base, suf, onDone) {
    let left = exts.length, hit = null;
    for (const x of exts) {
      const url = 'sounds/' + base + suf + '.' + x;
      exists(url, (ok) => {
        if (ok && (!hit || exts.indexOf(x) < exts.indexOf(hit.x))) hit = { url, x };
        if (--left) return;
        if (hit) { add(base, hit.url, suf ? parseInt(suf.slice(1), 10) : 0); onDone(true); }
        else onDone(false);
      });
    }
  }
  // take n may be written _0n, -n or _n; the chain stops at the first number that is none of them
  function chainVariants(base, n) {
    if (n > MAX_VARIANTS) return;
    const sufs = ['_' + String(n).padStart(2, '0'), '-' + n, '_' + n];
    const tryAt = (i) => {
      if (i >= sufs.length) return;
      probe(base, sufs[i], (ok) => { if (ok) chainVariants(base, n + 1); else tryAt(i + 1); });
    };
    tryAt(0);
  }
  function probeAll() {
    // what a player is most likely to have goes first: effects, the house auctioneer and his
    // numbers (the first bank anyone records), music, ambience; then the other voice banks.
    // Anything the manifest already named is skipped.
    const first = [].concat(Object.keys(SYNTH), AUC_VO, NUM_NAMES, MUSIC_NAMES, AMB_NAMES);
    const seen = new Set(first);
    const order = first.concat(ALL_SOUND_NAMES.filter((n) => !seen.has(n)));
    for (const b of order) {
      if (_snd[b] && _snd[b].length) continue;
      probe(b, '', () => {});
      chainVariants(b, 1);
    }
  }
}
// a fresh player for a file in the registry
function mediaFor(e) { const el = new Audio(e.url); el.preload = 'auto'; return el; }
// pictures first: backdrops, faces and frames beat ~900 sound probes to the wire
setTimeout(loadSoundFiles, 1200);

function sndGet(name) {
  const v = _snd[name];
  if (!v || !v.length) return null;
  if (v.length === 1) return v[0];
  // never the same take twice running: two takes alternate, more take turns at random
  let i = (Math.random() * v.length) | 0;
  if (v[i] === _lastTake[name]) i = (i + 1 + ((Math.random() * (v.length - 1)) | 0)) % v.length;
  _lastTake[name] = v[i];
  return v[i];
}

const _sfxProto = {};     // url -> an element kept for cloning: effects are small and frequent
// returns the playing clip (or null on a synth fallback / muted / missing) so a
// call site that needs to cut a sound short — the closing roll, mid-bid — can
function play(name, vol) {
  if (_muted || VOL.sfx <= 0) return null;
  const e = sndGet(name);
  if (e) {
    try {
      const proto = _sfxProto[e.url] || (_sfxProto[e.url] = mediaFor(e));
      const c = proto.cloneNode();
      c.volume = clamp((vol == null ? 0.8 : vol) * VOL.sfx, 0, 1);
      c.play().catch(() => {});
      return c;
    } catch (err) { /* ok */ }
  } else if (SYNTH[name]) SYNTH[name]();
  return null;
}

// ---- auctioneer voice queue: clips play one after another, never overlapping ----
const VO_ALIAS = {
  auc_open_ready: 'vo_start', auc_open_howmuch: 'vo_start', auc_start_needbid: 'vo_start',
  auc_once: 'vo_once', auc_twice: 'vo_twice', auc_fairwarning: 'vo_twice',
  auc_sold: 'vo_sold', auc_sold_yourway: 'vo_sold', auc_nobid: 'vo_nosale',
  // Cody and Kaylee's week apart: each one speaks from the pair's recorded bank
  npc_cody_bid: 'npc_duo_bid', npc_cody_fold: 'npc_duo_fold', npc_cody_win: 'npc_duo_win',
  npc_kaylee_bid: 'npc_duo_bid', npc_kaylee_fold: 'npc_duo_fold', npc_kaylee_win: 'npc_duo_win',
};
// today's gavel speaks first, from its own bank; the house auctioneer covers any line it lacks
function voEl(name) {
  const v = curAuctioneer().voice;
  if (v && v !== 'auc') {
    const alt = name.startsWith('auc_') ? v + name.slice(3) : (name.startsWith('num_') ? v + '_' + name : null);
    if (alt) { const el = sndGet(alt); if (el) return el; }
  }
  return sndGet(name) || (VO_ALIAS[name] ? sndGet(VO_ALIAS[name]) : null);
}
// Clips never overlap, and chatter is cheap: no take twice running, a cooldown
// per line, a budget per auction (pumpQueue), a queue three deep where a newer
// bid throws away older chatter, and the gavel cuts rivals off mid-line. The
// auctioneer is never cut mid-word, and a chant is composed from the bid the
// room has heard at the moment it actually starts, so it never reads a stale
// number. Silence beats repetition.
const VO_COOLDOWN = { bid: 6, line: 6, flavor: 20, react: 7 };   // seconds by kind; gavel and chant have none
const VO_DEPTH = 3;
const _voLastAt = {};
let _voQ = [], _voBusy = false, _voSeq = [], _voCur = null;
let _voN = 0;                                             // clips accepted so far; pumpQueue reads it to know a line was voiced
function voIdle() { return !_voBusy && _voQ.length === 0 && _voSeq.length === 0; }
// is the gavel himself talking right now? (rival chatter does not count)
function gavelTalking() { return !!(_voCur && (_voCur._kind === 'gavel' || _voCur._kind === 'chant' || _voCur._kind === 'flavor' || _voCur._kind === 'react')); }
function voKind(name) {
  if (/^num_|_num_|_chant_/.test(name)) return 'chant';
  if (/_react_/.test(name)) return 'react';
  if (/^(auc|ray|lyle|vo)_(open|start|once|twice|lastcall|fairwarning|sold|paythelady|nextunit|nobid|rules)/.test(name)) return 'gavel';
  if (/_bid$/.test(name)) return 'bid';
  if (/_(flavor|peek|pressure)/.test(name)) return 'flavor';
  return 'line';                                          // fold, win, rejoin, buy, scrap, commercials
}
// drop everything waiting; cut rival chatter mid-line, let the auctioneer finish his word (hard: cut anything)
function voFlush(hard) {
  _voQ.length = 0; _voSeq.length = 0;
  if (_voCur && (hard || (_voCur._kind !== 'gavel' && _voCur._kind !== 'chant'))) {
    try { _voCur.pause(); } catch (e) { /* ok */ }
    _voCur = null; _voBusy = false;
  } else if (hard) {
    _voBusy = false;   // a hard flush is a clean slate either way — nothing should
  }                      // be able to leave the queue thinking it's busy forever
}
function _voEnqueue(entry) {
  // a newer bid replaces older chatter; a chant replaces only older chants (it reads its number when it starts,
  // so a rival's bid line ahead of it is not stale - it used to be thrown out with the chants, which is why a
  // rival was so rarely heard while the gavel was mid-word, 2026-09-19); the gavel always finds room
  if (entry.kind === 'bid') _voQ = _voQ.filter((q) => q.kind !== 'bid' && q.kind !== 'chant');
  else if (entry.kind === 'chant') _voQ = _voQ.filter((q) => q.kind !== 'chant');
  if (_voQ.length >= VO_DEPTH) { if (entry.kind === 'gavel') _voQ.shift(); else return false; }
  _voQ.push(entry);
  _voN++;
  return true;
}
function speak(names, flush, opts) {
  if (_muted || _voiceMuted || VOL.voice <= 0) return;
  opts = opts || {};
  if (flush) voFlush();
  let added = false;
  for (const n of names) {
    const kind = opts.kind || voKind(n);
    const cd = opts.cooldown != null ? opts.cooldown : (VO_COOLDOWN[kind] || 0);
    if (cd && G.time - (_voLastAt[n] || -99) < cd) continue;   // said that too recently
    const el = voEl(n);
    if (!el) continue;
    if (_voEnqueue({ el, kind, name: n })) { _voLastAt[n] = G.time; added = true; }
  }
  if (added) pumpVO();
}
// play take N of a slot (npc_ed_scrap_03 for n=3); any take if that one is missing. No cooldown: these are deliberate
function speakTake(base, n, flush) {
  if (_muted || _voiceMuted || VOL.voice <= 0) return;
  const v = _snd[base];
  if (!v || !v.length) return;
  const el = v.find((e) => e.take === n) || v[(Math.random() * v.length) | 0];
  if (flush) voFlush();
  if (_voEnqueue({ el, kind: 'line', name: base })) pumpVO();
}
function speakOneOf(names, flush, opts) {
  const avail = names.filter((n) => voEl(n));
  if (!avail.length) return false;
  speak([avail[(Math.random() * avail.length) | 0]], flush, opts);
  return true;
}
// the first of these that exists, in order — for a beat that wants THE take, with a fallback
function speakFirstOf(names, flush, opts) {
  const n = names.find((x) => voEl(x));
  if (!n) return false;
  speak([n], flush, opts);
  return true;
}
// a clip sequence decided at the moment it starts (the chant reads the live bid)
function speakLazy(kind, build) {
  if (_muted || _voiceMuted || VOL.voice <= 0) return;
  if (_voEnqueue({ kind, lazy: build })) pumpVO();
}
// a slot name like npc_sal_bid maps back to that rival's own def, so one
// recorded bank can be boosted (or cut) without re-recording or hand-editing
// the file. Undefined/1 for everyone who hasn't asked for it.
function voiceGainFor(name) {
  if (!name) return 1;
  const m = /^(?:npc|cm)_([A-Za-z0-9]+)_/.exec(name);      // a rival's bids, and his commercial: same voice, same gain
  if (!m) return 1;
  const def = NPCS.find((n) => n.id === m[1]) || EXTRA_NPCS[m[1]];
  return (def && def.voiceGain) || 1;
}
function pumpVO() {
  if (_voBusy || _muted || _voiceMuted) return;
  let el = null, kind = null, name = null;
  if (_voSeq.length) { const s = _voSeq.shift(); el = s.el; kind = s.kind; }
  else {
    const q = _voQ.shift();
    if (!q) return;
    if (q.lazy) {
      const names = q.lazy() || [];
      const els = names.map((n) => voEl(n)).filter(Boolean);
      if (!els.length) { pumpVO(); return; }
      _voSeq = els.slice(1).map((e) => ({ el: e, kind: q.kind }));
      el = els[0]; kind = q.kind;
    } else { el = q.el; kind = q.kind; name = q.name; }
  }
  _voBusy = true;
  try {
    const c = mediaFor(el);
    c._kind = kind;
    c.volume = clamp(0.95 * VOL.voice * voiceGainFor(name), 0, 1);
    _voCur = c;
    const done = () => { if (_voCur === c) _voCur = null; _voBusy = false; pumpVO(); };
    c.onended = done;
    c.onerror = done;
    c.play().catch(() => done());
  } catch (e) { _voCur = null; _voBusy = false; }
}
// live chant: "I got {bid} — would you give {ask}?" from number clips, read off the bid the room has heard when it plays
function sayChant() {
  speakLazy('chant', () => {
    const au = G.auction;
    if (!au || au.done) return null;
    const bid = au.shownBid || au.bid, ask = bid + (au.step || 25);
    if (bid > 0 && voEl('auc_chant_igot') && voEl('num_' + bid) && voEl('auc_chant_wouldyougive') && voEl('num_' + ask)) {
      const seq = ['auc_chant_igot', 'num_' + bid, 'auc_chant_wouldyougive', 'num_' + ask];
      if (Math.random() < 0.3 && voEl('auc_chant_now')) seq.push('auc_chant_now');
      return seq;
    }
    const legacy = ['vo_bid_a', 'vo_bid_b', 'vo_bid_c'].filter((n) => voEl(n));
    return legacy.length ? [legacy[(Math.random() * legacy.length) | 0]] : null;
  });
}
// per-screen music: each mode gets its own track, falling back to music_theme
const MODE_MUSIC = {
  title: 'music_title', seedpick: 'music_title', yard: 'music_yard', peek: 'music_yard', walkdown: 'music_yard',
  auction: 'music_auction', dig: 'music_dig', sell: 'music_home', phone: 'music_home', voicemail: 'music_home',
  summary: 'music_summary', paper: 'music_yard', sheet: null, codex: 'music_yard', tv: 'music_tv',
  arrive: 'music_yard', credits: 'music_credits',
};
let _musicEl = null, _musicName = null, _musicPoll = 0;
let _musicDuck = 1;                 // 1 = normal; the reveal pulls it down so the room can go quiet
// the music sits back as an auction heats up (down to 65%), so the chant and the crowd come forward
function musicVolNow() {
  const heat = G.mode === 'auction' && G.auction ? (G.auction.heat || 0) : 0;
  return clamp(0.25 * _musicDuck * (1 - 0.35 * heat) * VOL.music, 0, 1);
}
// ---- the records still play (easter egg; user's idea, 2026-09-16) ----
// The tapes already play video on the garage TV. The old music does the same thing for the ear: keep a
// record, a crate of vinyl or an Edison disc in the garage and THAT is what the garage plays that night.
// Which track a disc carries is decided by the object itself (its own hseed), so one particular record is
// always the same record, and two of them are two different nights. It has to be gone through first - a
// crate nobody has looked inside is not a record yet, it is a crate.
// Missing files fall straight back to music_home, so the slots can be filled one at a time.
const DISC_BASES = ['records', 'vinylCrate', 'edisonDiscs'];
const PLAYABLE_DISCS = ['porchlight', 'wurlitzer', 'lastdance', 'saltflats', 'revival', 'closing'];
function discOf(it) {
  if (!it || !DISC_BASES.includes(it.base)) return null;
  if (typeof fullyInspected === 'function' && !fullyInspected(it)) return null;
  return PLAYABLE_DISCS[(it.hseed || it.uid || 0) % PLAYABLE_DISCS.length];
}
function discsHeld() {
  const out = [];
  const all = (typeof allHeld === 'function') ? allHeld() : [];
  for (const it of all) { const d = discOf(it); if (d && out.indexOf(d) < 0) out.push(d); }
  return out;
}
// what the garage plays tonight: one of your own records, if any of them still play
function homeDiscNow() {
  const list = discsHeld();
  if (!list.length) return null;
  const id = list[(G.day || 1) % list.length];
  return _snd['music_disc_' + id] ? 'music_disc_' + id : null;
}

function updateMusic(dt) {
  if (_musicEl) _musicEl.volume = musicVolNow();
  ambTickAll(dt);                        // the loops cross their seams every frame; which loop plays is the poll's job
  _musicPoll -= dt;
  if (_musicPoll > 0) return;
  _musicPoll = 0.5;
  updateAmbience();
  updateAmbCrowd();
  let want = MODE_MUSIC[G.mode];
  if (G.mode === 'sell') { const d = homeDiscNow(); if (d) want = d; }   // a record of yours is on, not the house tune
  if (G.mode === 'tv' && G.tv && _snd['music_cm_' + G.tv.spot.id]) want = 'music_cm_' + G.tv.spot.id;   // a spot's own jingle
  if (G.mode === 'dev' && G.devMusic) want = G.devMusic === '-' ? null : G.devMusic;                    // the dev room's jukebox
  if (G.mode === 'closed') want = null;
  else if (want === undefined) want = 'music_theme';
  if (want === 'music_yard' && _snd['music_town_' + curTown().id]) want = 'music_town_' + curTown().id;   // this town has its own tune
  if (want === 'music_credits' && !_snd.music_credits) want = 'music_title';                              // the credits roll to the title theme until they have their own
  if (want && !_snd[want]) want = _snd.music_theme ? 'music_theme' : null;
  if (!want) {
    if (_musicEl) { _musicEl.pause(); _musicEl = null; _musicName = null; }
    return;
  }
  if (_muted) return;
  if (want !== _musicName) {
    if (_musicEl) _musicEl.pause();
    startMusicTake(want);
  }
  if (_musicEl.paused) _musicEl.play().catch(() => {});
}
// one file loops; a slot with several takes (music_town_saltLick, -2, -3) is a jukebox: a random one
// starts, and when it ends the next one plays, never the same take twice running (sndGet's rule)
function startMusicTake(name) {
  const el = mediaFor(sndGet(name));
  _musicEl = el; _musicName = name;
  el.loop = _snd[name].length === 1;
  el.volume = musicVolNow();
  try { el.currentTime = 0; } catch (e) { /* ok */ }
  if (!el.loop) el.addEventListener('ended', () => {
    if (_musicEl !== el || _musicName !== name) return;    // the screen moved on; whatever plays now is right
    startMusicTake(name);
    if (!_muted) _musicEl.play().catch(() => {});
  });
}
// ---- a loop that does not stutter (2026-09-18) ----
// The ambience used to be one <audio> with loop = true: the file ends, it jumps back to the start, with a hard
// cut at the seam and no idea how long the file is. Several of the loops on disk are 1.7-2 seconds long, so
// the crowd under the auction went round every two seconds (user: "sounded like a crowd on loop"). Now:
//   - a take under AMB_MIN_SECS is not played at all. Two seconds of room going round is a stutter, and
//     silence is better than that; the to-do sheet lists it as too short to loop, to be remade.
//   - every pass crosses into the next over AMB_XF seconds (equal-power), so a good loop has no seam,
//     and a sound with several takes picks a fresh one each time round.
// A loop object is stepped every frame (ambStep, from updateMusic); which loop plays is still decided on
// the half-second poll, same as before.
const AMB_MIN_SECS = 4;           // refuses the 1.7-2s files; the 5-7s ones on disk still play (the user heard only the short ones go wrong)
const AMB_XF = 1.5;
const _ambShort = {};              // url -> its length in seconds, for a take measured too short to loop
function ambTakes(name) { return (_snd[name] || []).filter((e) => !_ambShort[e.url]); }
function ambUsable(name) { return ambTakes(name).length > 0; }
function ambNewEl(name) {
  const list = ambTakes(name);
  if (!list.length) return null;
  let e = list[(Math.random() * list.length) | 0];
  if (list.length > 1 && e === _lastTake[name]) e = list[(list.indexOf(e) + 1) % list.length];
  _lastTake[name] = e;
  const el = mediaFor(e);
  el.loop = false; el.volume = 0; el._url = e.url;
  return el;
}
function ambLoop(name) { return { name, cur: ambNewEl(name), next: null, xf: 0, fadeIn: 0, vol: 0 }; }
function ambStop(L) { if (L) for (const el of [L.cur, L.next]) if (el) { try { el.pause(); } catch (e) { /* ok */ } } }
// one frame of a loop: wait for its length, refuse it if it is too short, play it, cross the seam.
// Returns false once the loop has nothing left it is willing to play.
function ambStep(L, dt) {
  if (!L) return false;
  if (!L.cur) { L.cur = ambNewEl(L.name); if (!L.cur) return false; }
  const el = L.cur;
  const len = el.duration;
  if (!(len > 0) || !isFinite(len)) return true;      // not measured yet: nothing plays until it is
  if (len < AMB_MIN_SECS) {
    _ambShort[el._url] = len;
    try { el.pause(); } catch (e) { /* ok */ }
    L.cur = null;
    return ambUsable(L.name);                          // another take may be long enough
  }
  if (el.ended && !L.next) { L.cur = ambNewEl(L.name); L.fadeIn = 1; return !!L.cur; }   // a slow frame missed the seam
  if (el.paused && !el.ended) el.play().catch(() => {});
  L.fadeIn = Math.min(1, L.fadeIn + dt / 0.4);          // in softly, not with a click
  const xfLen = Math.min(AMB_XF, len * 0.2);            // a short loop gets a short seam, so the crossfade never eats it
  if (!L.next && len - el.currentTime <= xfLen) {
    L.next = ambNewEl(L.name); L.xf = 0; L.xfLen = xfLen;
    if (L.next) L.next.play().catch(() => {});
  }
  if (L.next) {
    L.xf += dt;
    // the fade follows the AUDIO's clock: a throttled tab runs a few frames a second while the sound plays on
    // in real time, and a fade timed by frames arrived after the old pass had already ended (seen 2026-09-18)
    const xl = L.xfLen || AMB_XF;
    const pr = clamp(Math.max((el.currentTime - (len - xl)) / xl, L.xf / xl), 0, 1);
    el.volume = clamp(L.vol * L.fadeIn * Math.cos(pr * Math.PI / 2), 0, 1);
    L.next.volume = clamp(L.vol * Math.sin(pr * Math.PI / 2), 0, 1);
    if (pr >= 1 || el.ended) { try { el.pause(); } catch (e) { /* ok */ } L.cur = L.next; L.next = null; }
  } else el.volume = clamp(L.vol * L.fadeIn, 0, 1);
  return true;
}
// every loop, every frame
function ambTickAll(dt) {
  if (_amb && !ambStep(_amb, dt)) { ambStop(_amb); _amb = null; _ambName = null; }
  if (_ambCrowd && !ambStep(_ambCrowd, dt)) { ambStop(_ambCrowd); _ambCrowd = null; }
  if (_ambHot && !ambStep(_ambHot, dt)) { ambStop(_ambHot); _ambHot = null; }
}

// ---- ambience: one quiet loop under the music. amb_home at home, amb_town_<id> around a town's yard ----
const AMB_VOL = 0.5;
const MODE_AMB = { sell: 'amb_home', phone: 'amb_home', yard: 'town', peek: 'town', walkdown: 'town', auction: 'town', paper: 'town', arrive: 'town' };
let _amb = null, _ambName = null;
function updateAmbience() {
  let want = MODE_AMB[G.mode] || null;
  if (want === 'town') want = 'amb_town_' + curTown().id;
  if (want && want.indexOf('amb_town_') === 0 && typeof stormNow === 'function' && stormNow() && ambUsable('amb_rain')) want = 'amb_rain';   // the storm drowns the town out
  if (want && !ambUsable(want)) want = null;
  if (!want || _muted || VOL.amb <= 0) {
    if (_amb) { ambStop(_amb); _amb = null; _ambName = null; }
    return;
  }
  if (want !== _ambName) { ambStop(_amb); _amb = ambLoop(want); _ambName = want; }
  _amb.vol = AMB_VOL * VOL.amb;
}
// a second, subtler layer: a soft crowd murmur under the auction only, on top
// of the town's own ambience rather than instead of it. Missing amb_auction =
// silence, same contract as everything else here — nothing else changes.
const AMB_CROWD_VOL = 0.22;
const AMB_CROWD_HOT_VOL = 0.5;      // the hot layer at full heat (amb_crowd_hot); silent when the room is cold
let _ambCrowd = null, _ambHot = null;
// the murmur follows the room's heat (auctionHeat): the bed climbs from its quiet floor to
// about two and a half times that at a full-on war, and the hot layer, if there is one on
// disk, comes in underneath it from nothing. Both go when the screen does.
function updateAmbCrowd() {
  const heat = (G.auction && G.mode === 'auction') ? (G.auction.heat || 0) : 0;
  const on = G.mode === 'auction' && ambUsable('amb_auction');
  if (!on || _muted || VOL.amb <= 0) {
    if (_ambCrowd) { ambStop(_ambCrowd); _ambCrowd = null; }
  } else {
    if (!_ambCrowd) _ambCrowd = ambLoop('amb_auction');
    _ambCrowd.vol = AMB_CROWD_VOL * (1 + 1.6 * heat) * VOL.amb;
  }
  const hot = G.mode === 'auction' && ambUsable('amb_crowd_hot');
  if (!hot || _muted || VOL.amb <= 0) {
    if (_ambHot) { ambStop(_ambHot); _ambHot = null; }
    return;
  }
  if (!_ambHot) _ambHot = ambLoop('amb_crowd_hot');
  _ambHot.vol = AMB_CROWD_HOT_VOL * Math.pow(heat, 1.5) * VOL.amb;
}
// ---- the heartbeat under the count (user, 2026-09-18: "why not a heartbeat for as long as the drum roll?") ----
// It used to beat under "going twice" only. Now it starts with "going once", slow, and quickens all the way
// to the hammer like a drum roll — about 63 a minute to about 160, and faster still in a hot room — louder
// as it goes. A bid ends the count, and with it the heartbeat: it stops dead, which is the best sting there
// is, and when the count starts again it starts again slow. One recorded beat, repeated by the game, so the
// tempo can follow the room; a single long recording could not stop the instant somebody bids.
const HEART_SLOW = 0.95, HEART_FAST = 0.38;       // seconds between beats at the start and the end of the count
function heartProgress(a, closeWait) {             // 0 as "going once" lands .. 1 as the hammer falls
  const inStage = clamp((a.closingT || 0) / Math.max(0.1, closeWait), 0, 1);
  return a.closing === 2 ? 0.5 + inStage / 2 : inStage / 2;
}
function heartTick(a, dt, closeWait) {
  if (!a.closing || a.done) { a.heartStage = 0; return; }
  if (a.heartStage !== a.closing) { a.heartStage = a.closing; if (a.closing === 1) a.heartT = 0.25; }   // first beat just after "going once"
  a.heartT = (a.heartT == null ? 0.25 : a.heartT) - dt;
  if (a.heartT > 0) return;
  const p = heartProgress(a, closeWait), heat = a.heat || 0;
  a.heartT = Math.max(0.3, HEART_SLOW + (HEART_FAST - HEART_SLOW) * p - 0.12 * heat);
  play('heartbeat', clamp(0.4 + 0.45 * p + 0.15 * heat, 0, 1));
}
// how hot the room is, 0..1, from things everybody in it can see: how far the bid has
// climbed over the opener (eight times it is a full war), how many named faces are still
// in, a rally between rivals, and the count. Never the door's real value or a rival's
// number — the sound must not know more than the player does. Eased in drawAuction.
function auctionHeat(au) {
  if (!au || !G.cur || au.done) return 0;
  if (au.dutch) { const d = au.dutch; return d.started ? clamp(0.25 + 0.6 * (1 - (d.price - d.floor) / Math.max(1, d.start - d.floor)), 0, 1) : 0.2; }   // the clock: hotter the lower it gets
  const min = G.cur.minBid || 25, b = au.shownBid || 0;
  if (b <= 0) return 0;
  let h = Math.log2(Math.max(1, b / min)) / 3;
  const inIt = au.npcs.filter((a) => a.active && !a.crowd && !au.shownFolded[a.def.id]).length;
  h += 0.06 * Math.min(4, inIt) + ((au.rivalRun || 0) >= 3 ? 0.15 : 0) + (au.closing ? 0.15 : 0);
  return clamp(h, 0, 1);
}

// ---- background images: backgrounds/bg_<screen>[_01|_02].jpg, procedural fallback ----
const BG_NAMES = ['bg_title', 'bg_title_owned', 'bg_yard', 'bg_auction', 'bg_dig', 'bg_home', 'bg_house', 'bg_summary', 'bg_map', 'bg_museum', 'bg_credits'];
for (const tid of TOWN_ORDER) BG_NAMES.push('bg_town_' + tid);       // a town's own yard, when you paint one
// which backgrounds may move (2026-09-12): only the screens you pass through — the title,
// the credits, the drive home. A screen you sit on for minutes (the yard, an auction, the
// dig, home, the map, the museum, the summary) stays a still: a loop under a long read is
// a distraction, not a mood. Clips for the others are never even fetched.
const MOTION_BG = new Set(['bg_title', 'bg_title_owned', 'bg_credits', 'bg_house']);
const OPENING_CLIP_RATE = 0.75;                                       // the cold open's clips run a little slow — it is a film, not a loop
const MODE_BG = {
  title: 'bg_title', seedpick: 'bg_title', yard: 'bg_yard', peek: 'bg_yard', walkdown: 'bg_yard',
  auction: 'bg_auction', dig: 'bg_dig', reveal: 'bg_dig', sell: 'bg_home', phone: 'bg_home', voicemail: 'bg_home', summary: 'bg_summary',
  map: 'bg_map', tv: 'bg_home', credits: 'bg_credits', drivehome: 'bg_house',
};
// a town's light, washed over the yard, the peek and the auction before the UI goes on
function drawTint() {
  const t = townRule('tint');
  if (!t || !t.col) return;
  g.save();
  g.globalCompositeOperation = t.mode || 'multiply';
  px(g, 0, 0, W, H, t.col);
  g.restore();
}

// ---- the storm (day 21): rain over the play screens, drawn, so it rains with no art at all ----
const STORM_MODES = { yard: 1, peek: 1, walkdown: 1, auction: 1, dig: 1 };
const _rain = [];
function drawRain(dt) {
  if (!_rain.length) for (let i = 0; i < 150; i++) _rain.push({ x: Math.random() * (W + 120), y: Math.random() * H, len: 8 + Math.random() * 10, spd: 420 + Math.random() * 260 });
  px(g, 0, 0, W, H, 'rgba(18,26,42,0.28)');                            // a grey lid on the day
  g.fillStyle = 'rgba(185,205,235,0.5)';
  const step = dt || 0;
  for (const d of _rain) {
    d.y += d.spd * step; d.x -= d.spd * 0.22 * step;
    if (d.y > H) { d.y = -d.len; d.x = Math.random() * (W + 120); }
    for (let k = 0; k < d.len; k += 2) g.fillRect(Math.round(d.x - k * 0.22), Math.round(d.y + k), 1, 2);
  }
}
// ---- physicality: the screen jolts, the dust falls ----
let _shake = { t: 0, dur: 0, amp: 0 };
function shake(amp, dur) { _shake = { t: dur, dur, amp }; }
const _dust = [];
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    _dust.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, ttl: 0.5 + Math.random() * 0.4,
      c: Math.random() < 0.5 ? 'rgba(200,180,140,0.7)' : 'rgba(120,100,70,0.6)' });
  }
}
function drawDust(dt) {
  for (let i = _dust.length - 1; i >= 0; i--) {
    const d = _dust[i];
    d.ttl -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 160 * dt;
    if (d.ttl <= 0) { _dust.splice(i, 1); continue; }
    g.fillStyle = d.c; g.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
  }
}
// ---- one lane queue for every picture the game asks for ----
// A browser opens about six connections to a host, and the game asks for several hundred
// pictures, most of which are not there. Fired all at once they fill every lane, and the one
// picture somebody is actually looking at then waits behind a few hundred dead probes: with
// real reaction art in (over a megabyte each) a rival's face could not arrive before the sale
// was over. Everything goes through here now, a few at a time, in the order it was asked for.
// `front` is for art wanted on screen now (a rival's reactions, their pop-up cutout); it goes
// ahead of the boot queue. A picture that lands or misses hands its lane straight to the next
// one, and a picture that is half fetched (the .jpg missed, try the .png) goes to the head of
// the queue: whole pictures arrive sooner than eleven half-done chains.
// The sounds have their own lanes; this is the pictures.
const IMG_LANES = 6;
const _imgQ = [], _imgQNow = [];
let _imgOpen = 0;
function imgPump() {
  while (_imgOpen < IMG_LANES && (_imgQNow.length || _imgQ.length)) {
    const job = (_imgQNow.length ? _imgQNow : _imgQ).shift();
    _imgOpen++;
    job();
  }
}
function queueImage(src, onload, onerror, front, resuming) {
  const job = () => {
    const im = new Image();
    let settled = false;
    const done = (fn) => { if (settled) return; settled = true; _imgOpen--; fn(); imgPump(); };
    im.onload = () => done(() => onload(im));
    im.onerror = () => done(() => onerror());
    im.src = src;
  };
  job.src = src;                       // so promoteImages() can find it again while it waits
  const q = front ? _imgQNow : _imgQ;
  if (resuming) q.unshift(job); else q.push(job);
  imgPump();
}
// move everything still waiting whose name starts with `prefix` to the front of the queue. A picture the
// screen is about to draw should not sit behind two hundred probes it does not need (2026-09-21).
function promoteImages(prefix) {
  for (let i = _imgQ.length - 1; i >= 0; i--) {
    if (_imgQ[i].src && _imgQ[i].src.indexOf(prefix) === 0) _imgQNow.unshift(_imgQ.splice(i, 1)[0]);
  }
  imgPump();
}
// the title screen's own art goes to the wire first (the logo, then its backdrop); the
// several hundred other probes wait a beat so they never queue in front of it
const _bg = {};
// a background nothing answered to: no file of that name, so the screen's own drawn stand-in IS the picture
// and there is nothing to wait for. Filled by the probes below; empty means "still on its way".
const _bgMiss = {};
const VIDEO_EXTS = ['mp4', 'webm'];
const _bgVid = {}, _cmVid = {};          // key -> { el, used }
// the first morning's four frames: openings/op_<id>.jpg, with clips over them
const _opImg = {}, _opVid = {};
let _motion = Store.get('plMotion') !== '0';
loadLogo();
loadImageVariants('backgrounds/bg_title', 'bg_title', _bg, null, false, false, () => { _bgMiss.bg_title = true; });
loadVideo('backgrounds/bg_title', 'bg_title', _bgVid);
// ---- the menu's line-up, chosen before any art is asked for ----
// The cutouts sit near the end of loadArtLater behind every background, photo and portrait, and they are
// PNGs of a megabyte and a half, so left in that queue the title crowd turns up long after anybody has
// clicked NEW GAME. The four the menu wants are drawn first and jump the queue; the other seventeen are
// fetched at their usual place in the order, and askCutout makes sure nothing is asked for twice.
const TITLE_CAST_N = 4;
const TITLE_CAST_IDS = RNG((Math.random() * 1e9) | 0).shuf(NPC_CUT_IDS.slice()).slice(0, TITLE_CAST_N);
const _cutAsked = {};
function askCutout(id, front) {
  if (_cutAsked[id]) {
    // asked for already, but a card wants it NOW and it is still in the slow queue: promote it rather
    // than ask twice, which would push a second copy of the same picture into the variant list
    if (front && !(_cutImg[id] || []).length) { promoteImages('npcs/npc_' + id + '_cut'); promoteImages('npcs/reactions/npc_' + id + '_cut'); }
    return;
  }
  _cutAsked[id] = true;
  loadImageVariants('npcs/npc_' + id + '_cut', id, _cutImg, ['png'], false, front,
    () => loadImageVariants('npcs/reactions/npc_' + id + '_cut', id, _cutImg, ['png'], false, front));
}
if (!(typeof window !== 'undefined' && window.BB_TEASER)) for (const id of TITLE_CAST_IDS) askCutout(id, true);   // the teaser has no title screen
setTimeout(loadArtLater, 300);
function loadArtLater() {
  if (typeof window !== 'undefined' && window.BB_TEASER) { if (typeof window.BB_TEASER.loadArt === 'function') window.BB_TEASER.loadArt(); return; }   // the teaser ships a short list and asks for only that
  for (const b of BG_NAMES) if (b !== 'bg_title') { loadImageVariants('backgrounds/' + b, b, _bg, null, false, false, () => { _bgMiss[b] = true; }); if (MOTION_BG.has(b)) loadVideo('backgrounds/' + b, b, _bgVid); }
  for (const c of COMMERCIALS) for (let f = 1; f <= c.frames; f++) loadVideo('commercials/cm_' + c.id + '_' + f, c.id + '_' + f, _cmVid);
  for (const b of NP_IMAGE_IDS) loadImageVariants('newspaper/np_' + b, b, _npImg);
  for (const tid of TOWN_ORDER) loadImageVariants('towns/tn_' + tid, tid, _townImg, ['png', 'jpg']);
  // a remade .png wins over the old .jpg - and an idle saved in npcs\reactions\ is found there too, the same
  // way a reaction saved in npcs\ is (user, 2026-09-23: Ed's idle went in with his reactions and his card fell
  // back to the drawn sprite). Neither folder is the wrong one now.
  for (const id of Object.keys(PORTRAITS)) loadImageVariants('npcs/npc_' + id, id, _npcImg, ['png', 'jpg'], false, false,
    () => loadImageVariants('npcs/reactions/npc_' + id, id, _npcImg, ['png', 'jpg']));
  for (const a of Object.values(AUCTIONEERS)) loadImageVariants('npcs/npc_' + a.face + '_talk', a.face + '_talk', _npcImg);   // the gavel, mouth open
  for (const f of AUC_UI_ART) loadImageVariants('ui/' + f.replace(/\.\w+$/, ''), f.replace(/\.\w+$/, ''), _uiImg, [f.split('.').pop()], true);   // optional auction screen art
  for (const id of NPC_CUT_IDS) askCutout(id);                                                                              // background-free, for the splash card (the menu's four are already away)
  for (const c of COMMERCIALS) for (let f = 1; f <= c.frames; f++) loadImageVariants('commercials/cm_' + c.id + '_' + f, c.id + '_' + f, _cmImg, ['jpg', 'png']);
  for (const b of MEDIA_ART_IDS) loadImageVariants('media/md_' + b, b, _mediaImg, ['png', 'jpg']);
  for (const st of PAPER_STOCKS) loadImageVariants('papers/pp_' + st, st, _paperImg, ['png', 'jpg']);
  // the handful of tapes that can actually be watched (home.js, PLAYABLE_TAPES)
  for (const t of PLAYABLE_TAPES) for (let n = 1; n <= TAPE_CLIPS; n++) loadVideo('tapes/tp_' + t + '_' + n, t + '_' + n, _tapeVid);
  for (const o of FM_ART_IDS) { loadImageVariants('openings/op_' + o, o, _opImg); loadVideo('openings/op_' + o, o, _opVid, OPENING_CLIP_RATE); }
}
// ---- image loading with numbered variants (name.jpg, name_01.jpg ... _12) ----
// opaque art (backgrounds, photos, covers) is .jpg; .png is probed second so
// a stray png still works. Only the logo needs transparency (see loadLogo).
// lean: only follow the numbered chain if the bare name or _01 answers (for big optional banks like the reactions)
function loadImageVariants(pathPrefix, key, store, exts, lean, front, onNone) {
  exts = exts || ['jpg', 'png'];
  function probe(suf, onDone) {
    function tryExt(i) {
      if (i >= exts.length) { onDone(false); return; }
      queueImage(pathPrefix + suf + '.' + exts[i],
        (im) => { (store[key] = store[key] || []).push(im); onDone(true); },
        () => tryExt(i + 1), front, i > 0);
    }
    tryExt(0);
  }
  // takes: name_01 ... name_12, or the way sounds are named by hand, name_2 / name-2
  // (the second file is 2). Contiguous: the chain stops at the first number nothing answers to.
  function chain(n) {
    if (n > MAX_VARIANTS) return;
    const sufs = ['_' + String(n).padStart(2, '0'), '_' + (n + 1), '-' + (n + 1)];
    (function trySuf(i) {
      if (i >= sufs.length) return;
      probe(sufs[i], (ok) => { if (ok) chain(n + 1); else trySuf(i + 1); });
    })(0);
  }
  // `onNone`: nothing answered to the name at all, so the caller may look somewhere else (lean), or
  // write the slot off as unpainted (the backgrounds, so a screen knows to stop waiting for one)
  if (lean) { probe('', (ok) => { if (ok) chain(1); else probe('_01', (ok1) => { if (ok1) chain(2); else if (onNone) onNone(); }); }); return; }
  probe('', (ok) => { if (!ok && onNone) onNone(); });
  chain(1);
}

// ---- motion: a clip with a still's name plays over that still ----
// backgrounds/bg_title.mp4 over bg_title.jpg, commercials/cm_pete_2.mp4 over cm_pete_2.jpg
// (.webm works too). Muted, looping, drawn every frame at the still's size; the still shows
// until the clip has a frame and stays as the fallback, so a missing clip changes nothing.
// A clip is only fetched past its header once its screen is up, and pauses when the screen
// leaves. MOTION in the pause menu turns them all off (plMotion). See docs/MOTION.md.
// `rate`: playback speed for the clip (the cold open runs its frames a little slow)
function loadVideo(pathPrefix, key, store, rate) {
  if (typeof document === 'undefined' || !document.createElement) return;
  function tryExt(i) {
    if (i >= VIDEO_EXTS.length) return;
    const el = document.createElement('video');
    const rec = { el, used: -1 };
    el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'metadata';
    if (rate) { el.defaultPlaybackRate = rate; el.playbackRate = rate; }
    el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
    el.addEventListener('error', () => { if (store[key] === rec) delete store[key]; tryExt(i + 1); });
    el.src = pathPrefix + '.' + VIDEO_EXTS[i];
    store[key] = rec;
  }
  tryExt(0);
}
// the clip for a slot if it can be drawn this frame (starts it if it is not playing)
function useVideo(store, key) {
  const rec = store[key];
  if (!rec || !_motion) return null;
  const el = rec.el;
  rec.used = G.time;
  if (el.paused) { el.preload = 'auto'; el.play().catch(() => {}); }
  return el.readyState >= 2 ? el : null;
}
// ---- a mouth that reads as speech (user, 2026-09-20: "you have his flipping back and forth and it looks odd") ----
// Swapping the shut frame for the open one on a fixed beat is a metronome, and at three flips a second the
// eye reads it as a glitch rather than a man talking. A mouth is open MOST of the time and shuts briefly,
// unevenly, between words. Three sines that do not divide into each other give that for nothing, and it
// needs no new art — though a second talk frame (npc_<face>_talk_02) makes it better for free.
function mouthOpen(t) {
  const s = Math.sin(t * 8.7) + 0.7 * Math.sin(t * 5.1 + 1.3) + 0.5 * Math.sin(t * 2.3 + 0.7);
  return s > -0.62;
}
function hasArt(name) { return !!((_bg[name] && _bg[name].length) || _bgVid[name]); }
// clips nobody has drawn for half a second stop decoding
function updateVideos() {
  for (const store of [_bgVid, _cmVid, _tapeVid, _opVid]) for (const k in store) {
    const r = store[k];
    if (r.used >= 0 && G.time - r.used > 0.5) { r.used = -1; if (!r.el.paused) r.el.pause(); }
  }
}
// ---- the paddle: hold to stay in (docs/AUCTION_OVERHAUL.md step 6, behind a toggle, off by default) ----
// With the paddle on, the auction is one input: hold the button (or Space, or the A button)
// and your paddle answers every raise by the minimum after a breath; let go and you are out,
// and the count starts on whoever is left — press again before the last word and that is a
// bid at the wire. The wallet is the only ceiling: at the edge of your money the hand comes
// down on its own. RUN THEM UP still runs by itself against one face.
let _paddle = Store.get('plPaddle') === '1';
function togglePaddle() {
  _paddle = !_paddle;
  Store.set('plPaddle', _paddle ? '1' : '0');
  if (G.auction) { G.auction.paddleHeld = false; G.auction.paddleRelease = false; }
}
function paddleLive() { return _paddle && G.mode === 'auction' && !!G.auction && !G.auction.done && !G.modal && !G.paused && !G.auction.lookAgain; }
function paddleWantsKey() { return paddleLive(); }
function paddlePress() {
  const au = G.auction;
  if (!paddleLive() || au.paddleHeld || auctionMenuOpen(au)) return;
  if (au.quietLeft > 0 && !au.closing) { play('denied'); toast('You are sitting this part out.', PAL.gray); return; }
  au.paddleHeld = true; au.paddleRelease = false; au.paddleT = 0;
  const step = (au.step || 25) * (au.posture === 'loud' ? 2 : 1);
  // the wallet: a hand that cannot go higher does not go up
  const next = au.bid === 0 ? G.cur.minBid : au.bid + step;
  if (next > bidCeiling()) { au.paddleHeld = false; play('denied'); toast('Nothing left to bid with.', PAL.red); return; }
  play('ui_click', 0.4);
  if (au.bid === 0 && au.leader === null) { playerBid(0); return; }                   // a hand up opens it
  if (au.closing && au.leader && au.leader !== 'you' && !auctionBusy()) playerBid(step);   // in the count on them: a bid at the wire
}
function paddleRelease() {
  const au = G.auction;
  if (!au || !au.paddleHeld) return;
  au.paddleHeld = false; au.paddleT = 0;
  au.paddleRelease = true;                    // paddleTick turns it into a hold-off once the room is quiet
}
// the paddle answers when the room waits on you; a let-go becomes the hold that starts the count
function paddleTick(a, dt) {
  if (!_paddle || !a || a.done || a.roomHeld || a.runUp) return false;
  const step = (a.step || 25) * (a.posture === 'loud' ? 2 : 1);
  if (a.paddleHeld) {
    if (!a.leader || a.leader === 'you') return false;
    const target = a.bid + step;
    if (target > bidCeiling()) {
      // the wallet pulls the hand down: you hold, and the count starts
      a.paddleHeld = false;
      qLine('Your wallet. Your hand comes down.', PAL.cyan);
      if (!a.closing) holdOff();
      return true;
    }
    if (a.closing) { playerBid(step); return true; }       // the count is on them and your hand is still up
    a.paddleT = (a.paddleT || 0) + dt;
    if (a.paddleT < (a.auc.turnBeat || 0.8) * 0.6) return true;
    a.paddleT = 0;
    playerBid(step);
    return true;
  }
  if (a.paddleRelease) {
    a.paddleRelease = false;
    if (a.leader && a.leader !== 'you' && !a.closing) { holdOff(); return true; }
  }
  return false;
}
function toggleMotion() {
  _motion = !_motion;
  Store.set('plMotion', _motion ? '1' : '0');
  if (!_motion) for (const store of [_bgVid, _cmVid, _tapeVid, _opVid]) for (const k in store) { store[k].used = -1; if (!store[k].el.paused) store[k].el.pause(); }
}

// newspaper photos: newspaper/np_<img>[_01...].jpg (loaded by loadArtLater)
const _npImg = {};

// town postcards for the ledger: towns/tn_<townId>[_01...].png (160x120, png first) — prompts in docs/ART_PROMPTS.md
const _townImg = {};

// photo art (painted portraits, media covers): the user's files are big — a
// nearest-neighbor downscale turns them to fuzz, and a forced square squishes
// them. Smooth-scale, keep the image's own shape, letterbox inside the box.
// Pixel-art canvases (sprites, fallback faces) never come through here.
function drawPhotoFit(img, x, y, w, h) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  g.imageSmoothingEnabled = false;
}
// fill a box and crop the overflow, keeping the picture's own shape. drawImage on its
// own STRETCHES to the box, which was quietly widening every newspaper photo by up to
// a fifth. Editorial crop is what a paper does anyway; distortion is not.
function drawPhotoFill(img, x, y, w, h) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  g.imageSmoothingEnabled = false;
  g.restore();
}
// painted faces: npcs/npc_<id>[_01...].jpg (any shape; drawn to fit). The pixel
// portrait in sprites.js is the fallback, so the game never waits on art.
const _npcImg = {};
// Cody and Kaylee's week apart: until npcs\npc_cody.jpg and npc_kaylee.jpg exist, each card is their own half of the
// pair's portrait, a square around the face (Cody is the left of the frame, Kaylee the right).
// Measured again on 2026-09-20: the user remade npc_duo on magenta and it came back LANDSCAPE (1397x1126,
// where it had been 1126x1397), so the old squares pointed at the wrong part of the picture — Cody's took
// in half of Kaylee. `s` is a square of `s * width` pixels; x is a fraction of the width, y of the height.
const PORTRAIT_HALF = { cody: { from: 'duo', x: 0.26, y: 0.13, s: 0.30 }, kaylee: { from: 'duo', x: 0.505, y: 0.155, s: 0.295 } };
// EVERY rival's idle portrait is a figure on flat magenta. That is the user's standing rule, said again on
// 2026-09-20 ("as i said several times, the idle image for all the rivals will be magenta background"), and
// it is why the file's name is not the test any more: it used to key .png only, so an idle saved as a .jpg
// would have carried its magenta onto every card. The test is the TOP TWO CORNERS (a face runs off the
// bottom edge by design, so the bottom two are shirt). A reaction painted on a room background fails that
// test and is drawn as it is, which is what stops the key punching holes through anything pink inside a
// picture — a shirt, a sign, a sunset.
// Keyed PLAIN: no white sticker edge. That edge belongs to the splash cutout, which stands on a colour
// sweep with nothing round it; a face card already has a frame, and the sticker read as a halo on it.
// keyOut caches the result on the image and hands back null until it has decoded.
function keyedFace(im) {
  if (!im || typeof keyOut !== 'function') return im;
  if (im._onMagenta === undefined) {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    if (!w || !h) return im;                                            // not decoded yet: ask again next frame
    let hits = 0, unreadable = false;
    try {
      const c = document.createElement('canvas'); c.width = 1; c.height = 1;
      const x = c.getContext('2d');
      for (const [px0, py0] of [[1, 1], [w - 2, 1]]) {        // the TOP corners: a face runs off the bottom edge by design
        x.clearRect(0, 0, 1, 1); x.drawImage(im, px0, py0, 1, 1, 0, 0, 1, 1);
        const d = x.getImageData(0, 0, 1, 1).data;
        if (d[3] < 40 || (d[0] > 180 && d[2] > 180 && d[1] < 90)) hits++;   // magenta, or already see-through
      }
    } catch (e) { unreadable = true; }
    // A file:// page taints the canvas the moment a local picture is drawn into it, so getImageData throws
    // and we cannot look at the corners at all. That used to mean "not on magenta", which is why every idle
    // portrait kept its magenta background when the game was opened by double-clicking index.html, while the
    // splash cutouts - which go through keyOut's SVG-filter path - keyed perfectly (user, 2026-09-21: "why
    // are the idle images, still showing the magenta?"). Unreadable is NOT an answer: hand it to keyOut,
    // whose filter removes magenta and leaves everything else exactly as it was.
    im._onMagenta = unreadable || hits === 2;
  }
  if (!im._onMagenta) return im;
  let cut = null;
  try { cut = keyOut(im, true); } catch (e) { cut = null; }
  return cut || im;
}
// ---- a face drawn small in its own frame (user, 2026-09-20: "Sal is a little to small in his idle pose ...
// enlarge sals idle to match ed size. Its ok if you cutt off sholders, the breakout is where it shines") ----
// The idle portraits are framed by whoever drew them and they do not all sit at the same size: Ed fills his
// frame from 14% down, Sal starts at 28% and his head is a fifth smaller, so on a card he read as standing
// further back than everybody else. Rather than touch the user's file (never), the card shows a WINDOW of
// the picture: [x, y, size] as fractions of the source, the size being the same fraction of both sides so
// the picture's own shape is kept and the fitted box does not move. Sal's window puts the top of his cap
// exactly where the top of Ed's beanie is and makes his head the same height; his shoulders run out of the
// sides, which is what the breakout pictures are for.
// [x, y, width] keeps the picture's own shape (a plain zoom); [x, y, width, height] takes a window of a
// DIFFERENT shape, which is what a wide picture needs to fill a nearly square card. Cody and Kaylee's
// portrait came back landscape, so fitted whole it sat in a letterbox and the pair — and every breakout
// lined up on them — came out small (user, 2026-09-20: "cody and kaylee break outs are not properly
// sized, they shrink"). Their window is the pair, cut to the card's own shape.
const PORTRAIT_CROP = {
  sal: [0.102, 0.170, 0.797],
  dutch: [0.0815, 0.0902, 0.837],
  duo: [0.082, 0.0611, 0.791, 0.937],
};
function cropW(c) { return c ? c[2] : 1; }
function cropH(c) { return c ? (c[3] == null ? c[2] : c[3]) : 1; }
// the window of a portrait a card shows, in source pixels
function portraitWindow(id, iw, ih) {
  const c = PORTRAIT_CROP[id];
  if (!c || !iw || !ih) return { sx: 0, sy: 0, sw: iw, sh: ih, s: 1 };
  const sw = iw * cropW(c), sh = ih * cropH(c);
  return { sx: clamp(iw * c[0], 0, iw - sw), sy: clamp(ih * c[1], 0, ih - sh), sw, sh, s: cropW(c) };
}
// the shape of what the card actually draws: the picture's own, or its window's
function cardAspect(id) {
  const c = PORTRAIT_CROP[id], pa = portraitAspect(id);
  return c ? pa * (cropW(c) / cropH(c)) : pa;
}
function drawPortrait(id, x, y, w, h) {
  const list = _npcImg[id];
  if (list && list.length) {
    const im = keyedFace(list[strHash(id + '_' + G.day) % list.length]);
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (PORTRAIT_CROP[id] && iw && ih) {
      const win = portraitWindow(id, iw, ih);
      const sc = Math.min(w / win.sw, h / win.sh), dw = win.sw * sc, dh = win.sh * sc;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(im, win.sx, win.sy, win.sw, win.sh, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      g.imageSmoothingEnabled = false;
      return;
    }
    drawPhotoFit(im, x, y, w, h);
    return;
  }
  const half = PORTRAIT_HALF[id], hl = half && _npcImg[half.from];
  // keyed like any other idle: the pair's portrait is on magenta too, and a square cut out of it is still magenta
  const im = hl && hl.length ? keyedFace(hl[strHash(half.from + '_' + G.day) % hl.length]) : null;
  const iw = im ? (im.naturalWidth || im.width) : 0, ih = im ? (im.naturalHeight || im.height) : 0;
  if (iw && ih) {
    const s = Math.min(iw, ih, Math.round(half.s * iw));
    const sx = Math.min(iw - s, Math.round(half.x * iw)), sy = Math.min(ih - s, Math.round(half.y * ih));
    const d = Math.min(w, h);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(im, sx, sy, s, s, x + (w - d) / 2, y + (h - d) / 2, d, d);
    g.imageSmoothingEnabled = false;
    return;
  }
  g.drawImage(getPortrait(id), x, y, w, h);
}
// ---- rival reactions: npcs/reactions/npc_<id>_<key>[_02 ... _12].jpg (prompts: tools/reaction_prompts.py) ----
// The face card shows the reaction for what that face is doing; without the file, the plain portrait.
// `hold`: seconds a quick reaction stays up. The lasting ones (fold, the tell states, the hammer) follow the sale.
// In the order worth making them (the asset sheet lists them this way).
const REACTIONS = {
  fold: { when: 'they drop out' },
  win: { when: 'they take the door (and on the next morning\'s postcard)' },
  bid: { hold: 1.6, when: 'they raise' },
  sweat: { when: 'SWEATING' },
  pride: { when: 'PAST IT' },
  warm: { when: 'WANTS IT' },
  beaten: { when: 'you took a door they were bidding on' },
  flinch: { hold: 0.6, when: 'a jump bid or a bid at the wire' },
  believe: { hold: 3, when: 'they believe what you said' },
  scoff: { hold: 3, when: 'they do not believe what you said' },
  glare: { hold: 3, when: 'called out, named, pointed at, or remembering what you did' },
};
const REACTION_KEYS = Object.keys(REACTIONS);
const REACTION_SKIP = { ed: ['believe'], ilse: ['believe', 'scoff'] };   // Ed never believes you; the Baroness never hears you
function reactionKeysFor(id) { return REACTION_KEYS.filter((k) => !(REACTION_SKIP[id] || []).includes(k)); }
function reactionSlots() {
  const out = [];
  for (const id of NPC_CUT_IDS) for (const k of reactionKeysFor(id)) out.push('npc_' + id + '_' + k);
  return out;
}
// ---- breakout reactions (user, 2026-09-18) ----
// "It would be cool if they pop out of their box: the same size head and body, it just goes outside the border,
// like it is breaking out of it." Not the scrapped pop-up (a big figure jumping into the scene): the same card
// and the same size figure, with the paddle, the pointing finger or the thrown-up hands crossing the card's
// border for the moment the reaction lasts. The art is the reaction on a bigger canvas - empty space above and
// to both sides - with a see-through or flat magenta background (keyOut takes either), saved as
// npcs/reactions/npc_<id>_<key>_out.png. Inside the box it draws exactly where the plain portrait sits; the
// parts outside are drawn again after every card (drawBreakouts), so they go OVER the border and the next card.
// The body still stops at the bottom edge, as the plain portrait does.
// Where the portrait sits inside each picture is REACT_ALIGN (npcs/reactions/align.js, written by the dev room's
// BREAKOUT tab): [x, y, w] of the portrait's rectangle as fractions of the picture. Without an entry, the shape the
// prompts ask for: a quarter of the portrait's width either side and a quarter of its height above.
const BREAKOUT_KEYS = ['bid', 'flinch', 'glare', 'win'];   // not fold: a folded card is dimmed for the rest of the sale, and a hand out of it all sale is clutter
const REACT_ALIGN_DEFAULT = [1 / 6, 0.2, 2 / 3];
function breakoutSlots() {
  const out = [];
  for (const id of NPC_CUT_IDS) for (const k of BREAKOUT_KEYS) if (reactionKeysFor(id).includes(k)) out.push('npc_' + id + '_' + k + '_out');
  return out;
}
(function loadReactAlign() {
  try {
    if (typeof document === 'undefined' || !document.head) return;
    const s = document.createElement('script');
    s.src = 'npcs/reactions/align.js?v=' + Date.now();
    s.onerror = () => {};
    document.head.appendChild(s);
  } catch (e) { /* no table: the default shape */ }
})();
const _boEdits = {};                     // the dev room's unsaved nudges, by file name; they show at once
function imgFileName(im) { try { return decodeURIComponent(String(im.src || '').split('/').pop().split('?')[0]); } catch (e) { return ''; } }
function reactAlign(file) {
  if (_boEdits[file]) return _boEdits[file];
  const t = (typeof window !== 'undefined' && window.REACT_ALIGN) || {};
  return t[file] || REACT_ALIGN_DEFAULT;
}
// has this picture actually been lined up, or is the default shape standing in? The default assumes a
// breakout framed exactly to the prompt, and the user's do not always come back that way — their tool crops
// the sides, so they leave room and let the line-up sort it out (2026-09-20). A breakout whose line-up is
// only a guess is not shown in the GAME: the head would sit somewhere confident and wrong, which is worse
// than the ordinary reaction it falls back to. The dev room draws it regardless, so it can be lined up
// there (AUTO, or the arrows) and saved, and from that moment it plays.
function reactAligned(file) {
  if (_boEdits[file]) return true;
  const t = (typeof window !== 'undefined' && window.REACT_ALIGN) || {};
  return !!t[file];
}
function portraitAspect(id) {
  const l = _npcImg[id], im = l && l[0];
  const iw = im && (im.naturalWidth || im.width), ih = im && (im.naturalHeight || im.height);
  return iw && ih ? iw / ih : 0.75;
}
// where a breakout picture lands, given the box its plain portrait would be fitted into
function breakoutDest(id, im, x, y, w, h) {
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  const pa = cardAspect(id);
  const dh = Math.min(h, w / pa), dw = dh * pa;                 // what the card draws, fitted, as drawPortrait does
  const Dx = x + (w - dw) / 2, Dy = y + (h - dh) / 2;
  // REACT_ALIGN says where the WHOLE portrait picture sits inside the breakout, so the sum has to be done
  // against the whole picture. A card that crops in on its portrait (PORTRAIT_CROP) shows only a window of
  // it, so work out where the whole one would be at that magnification and line the breakout up with that.
  // Whatever the window's shape, the whole portrait keeps its own: Fw/Fh comes back to the picture's aspect.
  const c = PORTRAIT_CROP[id];
  const Fw = dw / cropW(c), Fh = dh / cropH(c);
  const Fx = Dx - (c ? c[0] : 0) * Fw, Fy = Dy - (c ? c[1] : 0) * Fh;
  const [rx, ry, rw] = reactAlign(imgFileName(im));
  const k = Fw / (rw * iw);
  return { x: Fx - rx * iw * k, y: Fy - ry * ih * k, w: iw * k, h: ih * k, portrait: { x: Dx, y: Dy, w: dw, h: dh } };
}
let _breakouts = [];
// inside the box now; the rest after every card has been drawn
function drawBreakout(id, im, x, y, w, h) {
  const cut = keyOut(im);
  if (!cut) return false;
  const d = breakoutDest(id, im, x, y, w, h);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(cut, d.x, d.y, d.w, d.h);
  g.imageSmoothingEnabled = false;
  _breakouts.push({ cut, d, box: { x, y, w, h }, alpha: g.globalAlpha });
  return true;
}
function drawBreakouts() {
  for (const b of _breakouts) {
    g.save();
    g.globalAlpha = b.alpha;
    g.beginPath();
    g.rect(0, 0, W, b.box.y + b.box.h);                        // nothing below the card's bottom edge
    g.rect(b.box.x, b.box.y, b.box.w, b.box.h);                // and not the box itself: that is already drawn
    g.clip('evenodd');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(b.cut, b.d.x, b.d.y, b.d.w, b.d.h);
    g.imageSmoothingEnabled = false;
    g.restore();
  }
  _breakouts = [];
}
const _reactImg = {}, _reactAsked = {};
// asked for the first time a face is drawn, not at boot: 21 rivals x 11 would be a lot of empty knocks
function loadReactions(id) {
  if (!id || _reactAsked[id] || id === 'crowd') return;
  if (typeof window !== 'undefined' && window.BB_TEASER && !(window.BB_TEASER.reactions || []).includes(id)) return;   // the teaser ships reactions for nobody it does not list
  _reactAsked[id] = true;
  // npcs/reactions/ first; a reaction saved beside the portraits in npcs/ is found too (2026-09-17: Bart's and the
  // duo's were made there, and the user's files are never moved for them)
  for (const k of reactionKeysFor(id)) {
    const name = 'npc_' + id + '_' + k;
    loadImageVariants('npcs/reactions/' + name, id + '_' + k, _reactImg, null, true, true,
      () => loadImageVariants('npcs/' + name, id + '_' + k, _reactImg, null, true, true));
    // ...and a breakout saved beside the portraits is found too. It was not, until 2026-09-20: the plain
    // reactions had this fallback and the _out pictures did not, so fourteen of the sixteen the user had
    // made - every one of Sal's, Dutch's and the duo's, saved in npcs\ - never loaded in the game at all.
    if (BREAKOUT_KEYS.includes(k)) loadImageVariants('npcs/reactions/' + name + '_out', id + '_' + k + '_out', _reactImg, ['png', 'jpg'], true, false,
      () => loadImageVariants('npcs/' + name + '_out', id + '_' + k + '_out', _reactImg, ['png', 'jpg'], true, false));
  }
}
// a face reacts: quick ones fade after `hold`; sticky ones (the hammer) stay for the rest of the sale
function setReact(id, key, sticky) {
  const au = G.auction;
  if (!au || !id || !REACTIONS[key]) return;
  au.react = au.react || {};
  const prev = au.react[id];
  if (prev && prev.sticky && !sticky) return;
  au.react[id] = { key, at: G.time, n: ((prev && prev.n) || 0) + 1, sticky: !!sticky };
}
// ---- a reaction leaves slower than it arrives (user, 2026-09-17) ----
// The cut IN was right: a startle has to be instant or it does not read as one. The cut BACK was the same
// hard switch, so a face snapped between two pictures and a second later snapped back, which reads as a
// glitch rather than a reaction. Now the tail of a quick reaction dissolves into the face underneath it.
// Only the quick ones fade (flinch, bid, believe, scoff, glare); fold and the tell states are where the
// face has ARRIVED, not something passing over it, so they still land and stay.
// Never more than 45% of a short hold, or a 0.6 s flinch would be fading for most of its life.
const REACTION_FADE = 0.38;
function reactionFadeFor(key) { return Math.min(REACTION_FADE, (REACTIONS[key] && REACTIONS[key].hold ? REACTIONS[key].hold : 2) * 0.45); }
// what a face settles back to once whatever just happened has passed over it
function faceResting(a) {
  const au = G.auction;
  if (!au || !a || a.crowd || !a.def) return null;
  const id = a.def.id, r = (au.react || {})[id];
  if (r && r.sticky) return r.key;
  if (au.shownFolded && au.shownFolded[id]) return 'fold';
  if (au.done || !a.active) return null;
  const leads = !!au.shownLeader && au.shownLeader === a.def.name;
  const st = tellState(a, au.shownBid || 0, leads);
  return (st === 'warm' || st === 'sweat' || st === 'pride') ? st : null;
}
// what this face is doing right now, as far as the room has seen
function faceReaction(a) {
  const au = G.auction;
  if (!au || !a || a.crowd || !a.def) return null;
  const id = a.def.id, r = (au.react || {})[id];
  if (r && r.sticky) return r.key;
  if (au.shownFolded && au.shownFolded[id]) return 'fold';
  if (r && G.time - r.at < (REACTIONS[r.key].hold || 2)) return r.key;
  return faceResting(a);
}
// one reaction's picture, a look chosen by `salt` so it is not always the same one
function drawReaction(id, key, x, y, w, h, salt, opts) {
  loadReactions(id);
  if (opts && opts.breakout && key) {
    const bl = _reactImg[id + '_' + key + '_out'];
    const bim = bl && bl.length ? bl[strHash(id + '_' + key + '_' + salt) % bl.length] : null;
    if (bim && reactAligned(imgFileName(bim)) && drawBreakout(id, bim, x, y, w, h)) return;
  }
  const list = key && _reactImg[id + '_' + key];
  if (list && list.length) drawPhotoFit(keyedFace(list[strHash(id + '_' + key + '_' + salt) % list.length]), x, y, w, h);
  else drawPortrait(id, x, y, w, h);
}
function drawFace(a, x, y, w, h, opts) {
  const au = G.auction, key = faceReaction(a), id = a.def.id;
  const base = G.day + '_' + (G.cur ? G.cur.num : 0) + '_';
  if (!key) { loadReactions(id); drawPortrait(id, x, y, w, h); return; }
  const r = au && au.react && au.react[id];
  // a quick reaction picks a new look every time it fires; a lasting state keeps one look for the sale
  const quick = !!(r && r.key === key && !r.sticky && REACTIONS[key].hold);
  const n = quick ? r.n : 0;
  // the tail of a quick one dissolves back: the face it is settling to underneath, the reaction fading off it
  const fd = quick ? reactionFadeFor(key) : 0;
  const left = quick ? (r.at + REACTIONS[key].hold) - G.time : 99;
  if (quick && left < fd) {
    const under = faceResting(a);
    if (under) drawReaction(id, under, x, y, w, h, base + '0');
    else { loadReactions(id); drawPortrait(id, x, y, w, h); }
    const ga = g.globalAlpha;
    g.globalAlpha = ga * clamp(left / fd, 0, 1);
    drawReaction(id, key, x, y, w, h, base + n, opts);
    g.globalAlpha = ga;
    return;
  }
  drawReaction(id, key, x, y, w, h, base + n, opts);
}
// the gavel's face on the bid panel: npcs/npc_<face>.jpg, and npc_<face>_talk.jpg
// while he is actually speaking (gavel, chant, flavor clips). Without a talk
// frame the still bobs instead, so a half-made bank still reads as a man talking.
function drawGavelPortrait(x, y, w, h) {
  const a = G.auction.auc, face = a.face || 'buzz';
  const talking = gavelTalking();
  const talk = _npcImg[face + '_talk'];
  px(g, x - 2, y - 2, w + 4, h + 4, talking ? PAL.yellow : '#5a6488');
  px(g, x, y, w, h, '#1a1626');
  if (talking && talk && talk.length) drawPhotoFit(keyedFace(talk[strHash(face + '_' + G.day) % talk.length]), x, y, w, h);
  else drawPortrait(face, x, y - (talking && ((G.time * 8) | 0) % 2 ? 1 : 0), w, h);
  T(x + w / 2, y + h + 3, a.name, talking ? PAL.yellow : PAL.gray, 11, 'center');
}

// commercial frames: commercials/cm_<spot>_<frame>[_01...].jpg (480x270) — see docs/TV.md
const _cmImg = {};

// media covers: media/md_<id>[_01...].png (64x88, png first — they keep their alpha) — prompts in docs/ART_PROMPTS.md
const _mediaImg = {};

// paper stocks: papers/pp_<stock>[_01...].png (192x256, transparent around the paper) — see docs/EPHEMERA.md
const _paperImg = {};

// ---- the Bid & Buried logo: backgrounds/Bid_Buried_logo.png ----
// cropped to its content at load so the title layout stays tight no matter
// how much padding the export carries; text fallback only once the file has
// proven absent (while it loads, the title shows nothing in its place)
let _logoCv = null;
let _logoState = 'loading';           // loading | ok | missing
function _logoProcess(src) {
  try {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const cg = c.getContext('2d');
    cg.drawImage(src, 0, 0);
    const data = cg.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 <= x0 || y1 <= y0) { x0 = 0; y0 = 0; x1 = c.width - 1; y1 = c.height - 1; }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    _logoCv = out;
  } catch (e) { _logoCv = src; }    // file:// taints the canvas — draw it uncropped
  _logoState = 'ok';
}
function loadLogo() {
  const url = 'backgrounds/Bid_Buried_logo.png';
  function viaImg() {
    const im = new Image();
    im.onload = () => _logoProcess(im);
    im.onerror = () => { _logoState = 'missing'; };
    im.src = url;
  }
  if (window.fetch && window.createImageBitmap) {
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error('missing'); return r.blob(); })
      .then((b) => createImageBitmap(b))
      .then((bmp) => _logoProcess(bmp))
      .catch(() => viaImg());        // file:// blocks fetch — the old way still works
  } else viaImg();
}

let _bgPick = { mode: null, img: null };
// A painted backdrop is a big .jpg and the first seconds after boot are the busiest the download lanes ever
// get, so the title used to draw its pixel-art stand-in — a row of drawn lockers — and then swap the photo in
// over it a second later (user, 2026-09-20: "the old pixel background shows for a second before the real one
// does"). Now a screen whose art has not landed yet, and has not been written off as unpainted, simply holds
// on black for the first few seconds of a session and fades the picture up when it arrives. Nothing flashes.
const BG_WAIT = 6, BG_FADE = 0.4;
const _bgHeld = {};
let _onArt = false;                 // a painted backdrop is up: text gets a shadow this frame
// fill the screen keeping the source's own aspect, cropping the overflow from
// the middle. A 16:9 file lands exactly; a generator's taller clip (the title
// mp4 came out 3:2) fills the frame instead of squeezing and "shrinking".
function drawCoverBG(el, iw, ih) {
  if (!iw || !ih || Math.abs(iw / ih - W / H) < 0.01) { g.drawImage(el, 0, 0, W, H); return; }
  const s = Math.max(W / iw, H / ih);
  const sw = W / s, sh = H / s;
  g.drawImage(el, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, H);
}
function drawBG() {
  let want = MODE_BG[G.mode];
  if (want === 'bg_dig' && G.mode === 'reveal' && G.reveal && G.reveal.kind === 'set') want = 'bg_home';   // a set comes together in the garage
  if (want === 'bg_home' && G.mode === 'sell' && G.homeTab === 'trophy' && hasArt('bg_museum')) want = 'bg_museum';
  if (want === 'bg_yard' && hasArt('bg_town_' + curTown().id)) want = 'bg_town_' + curTown().id;
  if (want === 'bg_title' && titleOwned() && hasArt('bg_title_owned')) want = 'bg_title_owned';   // the yard on the title screen is yours
  const list = want && _bg[want];
  const clip = want && useVideo(_bgVid, want);
  if ((!list || !list.length) && !clip) {
    // still on the wire: hold on black rather than flashing the drawn stand-in under it
    if (want && !_bgMiss[want] && G.time < BG_WAIT) { _bgHeld[want] = G.time; px(g, 0, 0, W, H, '#07080c'); _onArt = false; return true; }
    return false;
  }
  const held = _bgHeld[want];
  const fade = held == null ? 1 : clamp((G.time - held) / BG_FADE, 0, 1);
  if (fade >= 1) delete _bgHeld[want]; else px(g, 0, 0, W, H, '#07080c');
  g.globalAlpha = fade;
  if (list && list.length) {
    if (_bgPick.mode !== want) _bgPick = { mode: want, img: list[(Math.random() * list.length) | 0] };
    drawCoverBG(_bgPick.img, _bgPick.img.naturalWidth, _bgPick.img.naturalHeight);
  } else px(g, 0, 0, W, H, '#07080c');
  if (clip) drawCoverBG(clip, clip.videoWidth, clip.videoHeight);   // the still moves
  g.globalAlpha = 1;
  // a touch of dusk so the UI reads over bright skies
  px(g, 0, 0, W, H, G.mode === 'title' ? 'rgba(6,8,16,0.14)' : 'rgba(6,8,16,0.26)');
  _onArt = true;
  return true;
}
function startMusic() { _musicPoll = 0; }
function toggleMute() {
  _muted = !_muted;
  if (_muted) { if (_musicEl) _musicEl.pause(); ambStop(_amb); _amb = null; _ambName = null; ambStop(_ambCrowd); _ambCrowd = null; ambStop(_ambHot); _ambHot = null; voFlush(true); }
  _musicPoll = 0;
}
// Buzz and the rivals, alone — the room stays on: music, sound effects and
// ambience keep going. For anyone who wants the auction without the auctioneer.
function toggleVoiceMute() {
  _voiceMuted = !_voiceMuted;
  if (_voiceMuted) voFlush(true);
}

// ============ draw helpers ============
// no text smaller than this: a handheld screen at arm's length is the target.
// A negative size asks for exactly that size (placeholder filenames in tiny art slots).
const TEXT_FLOOR = 12;
function textSize(size) { if (!size) return 15; return size < 0 ? -size : Math.max(size, TEXT_FLOOR); }
function T(x, y, str, col, size, align, bold, font) {
  size = textSize(size);
  g.font = (bold ? 'bold ' : '') + size + 'px ' + (font || FONT);
  g.textAlign = align || 'left';
  g.textBaseline = 'top';
  if (_onArt && col !== PAL.ink) {              // 1px ink shadow keeps text legible on painted art
    g.fillStyle = 'rgba(8,8,14,0.85)';
    g.fillText(str, x + 1, y + 1);
  }
  g.fillStyle = col || PAL.white;
  g.fillText(str, x, y);
}
// a dark backing strip for a loose line of text sitting straight on the art
function stripT(x, y, str, col, size, align, bold) {
  size = textSize(size);
  g.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
  const tw = Math.ceil(g.measureText(str).width);
  const left = align === 'right' ? x - tw : (align === 'center' ? x - tw / 2 : x);
  px(g, Math.round(left) - 6, y - 3, tw + 12, size + 7, 'rgba(10,12,20,0.66)');
  T(x, y, str, col, size, align, bold);
}
// framed box: ink outline, a lighter edge, then the fill — the edge is what
// separates a panel from a painted backdrop
function panel(x, y, w, h, fill, border) {
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 2, y + 2, w - 4, h - 4, border || '#4b5478');
  px(g, x + 4, y + 4, w - 8, h - 8, fill || PAL.navy);
}
function button(x, y, w, h, label, cb, opts) {
  opts = opts || {};
  const over = inRect(mouse.x, mouse.y, x, y, w, h);
  const hov = over && !opts.disabled;
  const base = opts.disabled ? PAL.slate : (opts.col || PAL.blue);
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 2, y + 2, w - 4, h - 4, hov ? PAL.lblue : base);
  px(g, x + 2, y + 2, w - 4, 2, 'rgba(255,255,255,0.25)');
  px(g, x + 2, y + h - 4, w - 4, 2, 'rgba(0,0,0,0.25)');
  let fs = opts.fs || Math.min(18, h - 12);
  // a label wider than the button steps down a size at a time (to 11) instead of spilling past the edges
  g.font = textSize(fs) + 'px ' + FONT;
  while (fs > 11 && g.measureText(label).width > w - 12) { fs--; g.font = textSize(fs) + 'px ' + FONT; }
  T(x + w / 2, y + (h - fs) / 2 - 1, label, opts.disabled ? PAL.dgray : PAL.white, fs, 'center');
  buttonHot(x, y, w, h, label, cb, opts, over);
}
// What every button does after it is drawn. A disabled one still answers - with a no, and with its hint - rather
// than vanishing from focus and letting a click fall straight through to whatever happens to be underneath it
// (a greyed CALLED OUT on a rival's card used to close the whole card).
function buttonHot(x, y, w, h, label, cb, opts, over) {
  if (over && opts.hint) _btnTip = { cx: x + w / 2, top: y, text: opts.hint };
  if (!opts.disabled) hot(x, y, w, h, () => { play('ui_click', 0.5); cb(); }, { label });
  else hot(x, y, w, h, () => play('denied'), { label, disabled: true });
}
// the auction's own button: still a rectangle, but not always the SAME rectangle —
// used only for the six controls on the bid screen, everywhere else keeps button() as
// it was. opts.shape: 'square' (sharp corners, a plain solid border), 'round' (rounded
// corners, a lighter inner ring on top of the border), 'pill' (fully rounded ends, a
// bolder two-tone border) — three plain, ordinary shapes, not an invented language.
function auctionButton(x, y, w, h, label, cb, opts) {
  opts = opts || {};
  const over = inRect(mouse.x, mouse.y, x, y, w, h);
  const hov = over && !opts.disabled;
  const base = opts.disabled ? PAL.slate : (opts.col || PAL.blue);
  const shape = opts.shape || 'square';
  const r = shape === 'pill' ? h / 2 : (shape === 'round' ? 9 : 0);
  const borderW = shape === 'pill' ? 3 : 2;
  function roundedPath(inset) {
    const s = inset || 0, rr = Math.max(0, r - s);
    const x0 = x + s, y0 = y + s, x1 = x + w - s, y1 = y + h - s;
    g.beginPath();
    if (!rr) { g.rect(x0, y0, x1 - x0, y1 - y0); return; }
    g.moveTo(x0 + rr, y0);
    g.lineTo(x1 - rr, y0); g.arcTo(x1, y0, x1, y0 + rr, rr);
    g.lineTo(x1, y1 - rr); g.arcTo(x1, y1, x1 - rr, y1, rr);
    g.lineTo(x0 + rr, y1); g.arcTo(x0, y1, x0, y1 - rr, rr);
    g.lineTo(x0, y0 + rr); g.arcTo(x0, y0, x0 + rr, y0, rr);
    g.closePath();
  }
  roundedPath(0); g.fillStyle = PAL.ink; g.fill();
  roundedPath(borderW); g.fillStyle = hov ? PAL.lblue : base; g.fill();
  // the border itself reads differently per shape, not just the corners: round gets a
  // thin light ring just inside the border, pill gets a bolder one — square stays plain
  if (shape !== 'square') {
    roundedPath(borderW + 1);
    g.lineWidth = shape === 'pill' ? 2 : 1;
    g.strokeStyle = shape === 'pill' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)';
    g.stroke();
  }
  roundedPath(borderW); g.save(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x, y, w, 3);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y + h - 3, w, 3);
  g.restore();
  const fs = opts.fs || Math.min(18, h - 12);
  T(x + w / 2, y + (h - fs) / 2 - 1, label, opts.disabled ? PAL.dgray : PAL.white, fs, 'center');
  buttonHot(x, y, w, h, label, cb, opts, over);
}
function bar(x, y, w, h, frac, col, bg) {
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 2, y + 2, w - 4, h - 4, bg || PAL.slate);
  const fw = Math.round((w - 4) * clamp(frac, 0, 1));
  if (fw > 0) {
    px(g, x + 2, y + 2, fw, h - 4, col);
    px(g, x + 2, y + 2, fw, 2, 'rgba(255,255,255,0.3)');
  }
}
// a fader: label, a notch down, the bar (click anywhere on it), a notch up
function slider(x, y, w, label, bus, col) {
  const v = VOL[bus];
  T(x, y + 4, label, PAL.gray, 13);
  const bx = x + 74, bw = w - 74 - 56;
  button(bx, y, 24, 22, '<', () => setVol(bus, v - 0.1), { fs: 15, col: PAL.slate, disabled: v <= 0 });
  bar(bx + 28, y + 4, bw, 14, v, col || PAL.green);
  for (let i = 1; i < 10; i++) px(g, bx + 28 + 2 + Math.round((bw - 4) * i / 10), y + 6, 1, 10, 'rgba(0,0,0,0.25)');
  hot(bx + 28, y, bw, 22, (cx) => { setVol(bus, ((cx == null ? mouse.x : cx) - (bx + 30)) / (bw - 4)); play('ui_click', 0.5); },
    { label: 'fader ' + label, onAxis: (d) => { setVol(bus, VOL[bus] + d * 0.1); play('ui_click', 0.5); } });
  button(bx + 28 + bw + 4, y, 24, 22, '>', () => setVol(bus, v + 0.1), { fs: 15, col: PAL.slate, disabled: v >= 1 });
}
// hover info in its own little panel — never text draped over an edge
// A hint is a sentence, sometimes three of them (the three ways in at the door, 2026-09-20). It used to be set
// on ONE line whatever its length, so anything past about eighty characters ran off both edges of the screen.
// It wraps by measure now and the box grows to what it holds.
const TIP_MAX_W = 560, TIP_MAX_LINES = 5;
function drawTooltip(cx, topY, text, col) {
  let fs = 14;
  let lines = wrapPx(text, TIP_MAX_W - 22, fs);
  if (lines.length > 2) { fs = 12; lines = wrapPx(text, TIP_MAX_W - 20, fs); }
  if (lines.length > TIP_MAX_LINES) { lines = lines.slice(0, TIP_MAX_LINES); lines[TIP_MAX_LINES - 1] = lines[TIP_MAX_LINES - 1].replace(/[\s,;:]+$/, '') + '…'; }
  const step = fs + 5;
  g.font = textSize(fs) + 'px ' + FONT;
  let tw = 0;
  for (const l of lines) tw = Math.max(tw, Math.ceil(g.measureText(l).width));
  tw = Math.min(tw + 22, TIP_MAX_W);
  const th = 8 + lines.length * step;
  const x = clamp(Math.round(cx - tw / 2), 8, W - tw - 8);
  const y = clamp(topY - 8 - th, 42, H - th - 8);
  px(g, x - 2, y - 2, tw + 4, th + 4, PAL.ink);
  px(g, x, y, tw, th, '#2c3044');
  px(g, x, y, tw, 2, '#404663');
  for (let i = 0; i < lines.length; i++) T(x + tw / 2, y + 4 + i * step, lines[i], col || PAL.white, fs, 'center');
  px(g, clamp(Math.round(cx) - 3, x + 6, x + tw - 12), y + th, 7, 3, PAL.ink);   // pointer nub
}
// hovering a tiny 24px icon (the found-items row in LOOK CLOSER): a bigger look,
// same pixel-art cap as the grid (drawIcon never upscales past 2x), plus its name
function drawIconZoom(cx, topY, it) {
  const bw = 132, bh = 108;
  const x = clamp(Math.round(cx - bw / 2), 8, W - bw - 8);
  const y = Math.max(42, topY - bh - 8);
  px(g, x - 2, y - 2, bw + 4, bh + 4, PAL.ink);
  px(g, x, y, bw, bh, '#2c3044');
  px(g, x, y, bw, 2, '#404663');
  drawIcon(it, x + (bw - 48) / 2, y + 6, 48);
  // by measure, and three lines if it needs them: counting 20 characters of 12px bold ran 64 of the
  // game's 362 item names out through the sides of this 132px box (measured 2026-09-18). There is room
  // for a third line between the icon and the bottom edge.
  const lines = fitLines(dName(it), bw - 10, [12], 3, true).lines;
  let ly = y + bh - 18 - (lines.length - 1) * 13;
  for (const line of lines) { T(x + bw / 2, ly, line, PAL.white, 12, 'center', true); ly += 13; }
  px(g, clamp(Math.round(cx) - 3, x + 6, x + bw - 12), y + bh, 7, 3, PAL.ink);   // pointer nub
}

function wrapText(s, maxChars) {
  const words = String(s).split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur ? cur + ' ' : '') + w;
  }
  if (cur) lines.push(cur);
  return lines;
}
// wrapText counts characters, which is only a guess at how wide a line will be: in a proportional
// font "WILLIAM" and "ill" measure the same by that count. Headlines are set big, in caps, and have
// real names in them, so the guess was wrong often enough that 46 of the paper's 194 headlines ran
// out through the column rule and 15 more stopped mid-sentence with no mark (measured 2026-09-16).
// These two wrap and size by what the type actually measures.
function wrapPx(s, maxPx, fs, bold, font) {
  g.font = (bold ? 'bold ' : '') + textSize(fs) + 'px ' + (font || FONT);
  const words = String(s).split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && g.measureText(t).width > maxPx) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
// the biggest size in sizes[] that sets s in maxLines or fewer — a sub-editor dropping a long
// headline a point rather than cutting it. If even the smallest will not go, the last line is cut
// with an ellipsis, so it reads as shortened instead of simply stopping.
function fitLines(s, maxPx, sizes, maxLines, bold, font) {
  let lines = [];
  for (const fs of sizes) {
    lines = wrapPx(s, maxPx, fs, bold, font);
    if (lines.length <= maxLines) return { fs, lines };
  }
  const fs = sizes[sizes.length - 1];
  lines = lines.slice(0, maxLines);
  let last = lines[maxLines - 1] || '';
  g.font = (bold ? 'bold ' : '') + textSize(fs) + 'px ' + (font || FONT);
  while (last.length > 1 && g.measureText(last + '…').width > maxPx) last = last.slice(0, -1);
  lines[maxLines - 1] = last.replace(/[\s,;:]+$/, '') + '…';
  return { fs, lines };
}
function drawIcon(item, x, y, sz) {
  const spr = getSprite(item.spr, item.pal, item.cond, item.uid);
  const sc = Math.min(sz / spr.width, sz / spr.height, 2);
  const dw = Math.max(1, Math.round(spr.width * sc)), dh = Math.max(1, Math.round(spr.height * sc));
  g.drawImage(spr, Math.round(x + (sz - dw) / 2), Math.round(y + (sz - dh) / 2), dw, dh);
}

// ============ game state ============
const SAVE_KEY = 'pixelLockerSaveV1';
const SAVE_BAK = SAVE_KEY + '_bak';     // last good save, in case the new one lands broken
const SAVE_VER = 2;                     // bump when a save needs migrating; migrateSave() fills the gaps
const G = {
  mode: 'title',
  money: 1500, day: 1, worldSeed: 1, worldSeedText: null, seedPick: [0, 0, 0], foundLegends: [],
  daylight: 100, vanCap: 40,
  stash: [], van: [],               // the one van: packed at the doors, unloaded at home
  today: null, cur: null, auction: null, dig: null, inspect: null,
  sellSel: -1, sellScroll: 0, pileScroll: 0,
  modal: null, toast: null, floats: [],
  dayEarned: 0, daySpent: 0, dayStats: null,
  time: 0, sheetScroll: 0, rulesPlayed: false, paused: false, paper: null,
  trophies: [], keeps: [], seenStories: [], homeTab: 'stash', boardScroll: 0,
  mapSel: null,
  world: defaultWorld(),
};

// everything the player is holding, wherever it lives
function allHeld() { return G.stash.concat(G.keeps, G.trophies); }

// what an item is called before it's been appraised — set pieces keep their
// pedigree to themselves until you put a loupe to them at home
function dName(it) {
  return (it.hideBrand && (!it.searched || it.unverified) && it.preName) ? it.preName : it.name;   // a flagged pedigree stays a Dresser until verified
}

function newDayStats() {
  return {
    acquired: [],        // {name,val,cat,spr,pal,cond,uid}
    cashFound: 0,
    lockersWon: 0, paidForLockers: 0,
    soldCount: 0, soldTotal: 0,
    scrappedCount: 0, scrapValue: 0,
    dumpFee: 0,
    leftBehindCount: 0, leftBehindValue: 0,
    setLost: 0,
    sunWarn30: false, sunWarn10: false,   // the two low-sun warnings, each said once a day
    searchFinds: 0,
    peteGenerous: false,
  };
}
function trackAcquire(it) {
  G.dayStats.acquired.push({ name: dName(it), val: it.val, cat: it.cat, spr: it.spr, pal: it.pal, cond: it.cond, uid: it.uid });
  // the fourth of the same thing worth having, once per thing: the town keeps count so it can ask
  const c = (G.world.career = G.world.career || {});
  c.bases = c.bases || {};
  const n = (c.bases[it.base] = (c.bases[it.base] || 0) + 1);
  if (n === 4 && !it.cash && !it.loot && !it.container && it.cat !== 'junk' && (it.val >= 120 || it.cat === 'weird')) recordEvent('sameThing', { base: it.base, name: BASE_BY_ID[it.base].name, n });
  if (it.base === 'garbage') bump('garbage');                 // bags of actual garbage, bought, for the books
  if (it.baroness) recordEvent('baroness', { name: it.name, base: it.base });
}

// How long a message stays up. The callers' own numbers (2.4s by default) were too quick to read (user,
// 2026-09-18) — the clerk's day-one bay message is forty words and had six seconds. Now it stays for
// at least the time it takes to read, at about three words a second plus two to notice it: never under
// four seconds, never over fourteen. A caller asking for longer still gets longer.
const TOAST_MIN = 4, TOAST_MAX = 14;
function toastTime(text, ttl) {
  const words = String(text).split(/\s+/).filter(Boolean).length;
  return clamp(Math.max(ttl || 0, 2 + words / 3), TOAST_MIN, TOAST_MAX);
}
// Only one message shows at a time, and a new one used to simply replace the old — so a quick "Pull what is
// in front of it first" wiped out a story you were halfway through reading. A new message still shows AT ONCE
// (a warning answers what you just did, so it cannot wait its turn), but if it cuts off a longer one that had
// time left, that one comes back when the short one is gone, with the time it had left. The same message
// fired again does not restart or stack; it just stays up. (2026-09-18)
const TOAST_RESUME = 2.5;          // an interrupted message is worth bringing back if it had this long left
function toast(text, col, ttl, who) {
  const cur = G.toast, next = { text, col: col || PAL.white, ttl: toastTime(text, ttl), who: who || null, age: 0 };
  if (cur && cur.text === text) { cur.ttl = Math.max(cur.ttl, next.ttl); return; }
  // one level of memory: the message this one cut off, or the one the last short message was already holding
  const keep = cur && cur.ttl > TOAST_RESUME && next.ttl < cur.ttl ? cur : (cur && cur.back) || null;
  if (keep) keep.back = null;
  next.back = keep;
  G.toast = next;
}
function addFloat(text, col, x, y) { G.floats.push({ text, col, x, y, ttl: 1.7 }); }
function gain(n, why) { G.money += n; G.dayEarned += n; if (why) toast(why + '  +' + fmt$(n), PAL.green); }
function spend(n) { G.money -= n; G.daySpent += n; }
function stashValue() { let v = 0; for (const it of G.stash) v += it.val; return v; }
function trophyValue() {
  let v = 0; for (const it of G.trophies) if (it.searched) v += it.val;
  return v;
}
function netWorth() { return Math.round(G.money + (appraisedValue() + trophyValue()) * 0.6); }
function takeFromLists(it) {
  for (const list of [G.stash, G.keeps, G.trophies]) {
    const i = list.indexOf(it);
    if (i >= 0) { list.splice(i, 1); return true; }
  }
  return false;
}
function keepTrophy(it) {
  takeFromLists(it);
  G.trophies.push(it);
  G.sellSel = -1;
  toast('Onto the shelf it goes.', PAL.gold);
}
function returnTrophy(it) {
  takeFromLists(it);
  delete it.holdFor;
  it.homeDay = G.day;                     // back in the haul: it sorts as new again
  G.stash.push(it);
  G.sellSel = -1;
}
// the shed out back — where the set hunt (the STASH tab) lives
function setAside(it) {
  takeFromLists(it);
  delete it.holdFor; delete it.heldFor;   // plain TO STASH: kept, not waiting for anybody
  it.shedDay = it.shedDay || G.day;       // the shed remembers when a thing arrived
  it.homeDay = G.day;
  G.keeps.push(it);
  G.sellSel = -1;
  play('van_load');
  toast('Into the stash. The raccoon has not figured out the latch.', PAL.cyan);
}

// ---- the haul, sorted: today's dig on top; the SORT chip cycles ----
// 'new' uses the day a thing reached the garage (homeDay; older saves fall
// back to the day it was pulled). The others sort on what the player can
// already see: the appraised price, or the middle of the "looks like" range.
const SELL_SORTS = ['new', 'value', 'type', 'rarity'];
// ---- the piles (docs/APPRAISAL.md §10; HOLD reworked after the 2026-09-15 playtest) ----
// The haul is what you have not decided about. Deciding takes it out of the haul: TO STASH (the shed out back),
// SELL (a buyer), TROPHY (the museum), or HOLD FOR <BUYER>: when the specialist who pays best for a thing is not in
// town, it waits in the stash marked for them, and the evening they are in town it comes back into the haul with a
// notice. The old HOLD flag hid things inside the haul where nobody could find them; it is gone, and old saves let go.
function bestBuyerFor(it) {
  if (!it || it.cash || it.cat === 'junk') return null;
  return SPECIALISTS.filter((b) => (b.cats || []).includes(it.cat)).sort((x, y) => y.mult - x.mult)[0] || null;
}
function buyerInTown(id) { return !!(G.today && (G.today.specialists || []).some((s) => s.def.id === id)); }
function buyerShort(b) { return b.name.split(' ').slice(-1)[0]; }
// HOLD FOR: an appraised, vouched-for thing whose best buyer is somewhere else today
function holdForBuyer(it) {
  if (!it || !it.searched || it.unverified || it.loot || it.locked || it.cash || it.restoring) return null;
  const b = bestBuyerFor(it);
  return b && !buyerInTown(b.id) ? b : null;
}
function holdItem(it, b) {
  b = b || holdForBuyer(it);
  if (!b) return false;
  takeFromLists(it);
  delete it.hold; delete it.heldFor;
  it.holdFor = b.id;
  it.shedDay = it.shedDay || G.day;
  it.homeDay = G.day;
  G.keeps.push(it);
  G.sellSel = -1;
  play('van_load');
  toast('In the stash, held for ' + b.name + '. You will hear the evening they are in town.', PAL.cyan, 3.5);
  return true;
}
function releaseItem(it) { delete it.holdFor; delete it.heldFor; delete it.hold; G.sellSel = -1; play('ui_click', 0.5); }
function heldCount() { return G.keeps.filter((t) => t.holdFor).length; }
// old saves: anything under the old flag comes back into view in the haul
function letGoOldHolds() { for (const t of G.stash) if (t.hold) delete t.hold; }
// coming home (goHome): what waited for a buyer who is in town tonight goes back into the haul, with a notice
function returnHeldForBuyers() {
  letGoOldHolds();
  const back = G.keeps.filter((t) => t.holdFor && buyerInTown(t.holdFor));
  if (!back.length) return null;
  const byBuyer = {};
  for (const t of back) {
    takeFromLists(t);
    t.heldFor = t.holdFor; delete t.holdFor;
    t.homeDay = G.day;                      // sorts as new: on top of the haul
    G.stash.push(t);
    (byBuyer[t.heldFor] = byBuyer[t.heldFor] || []).push(t);
  }
  const lines = [];
  for (const id of Object.keys(byBuyer)) {
    const bb = BUYERS.find((x) => x.id === id);
    lines.push({ text: (bb ? bb.name : 'A buyer') + ' is in town tonight.', col: PAL.cyan });
    for (const t of byBuyer[id].slice(0, 6)) lines.push({ text: dName(t) + '  —  ' + fmt$(shownVal(t)), col: PAL.white });
    if (byBuyer[id].length > 6) lines.push({ text: '...and ' + (byBuyer[id].length - 6) + ' more.', col: PAL.dgray });
  }
  lines.push({ text: 'Out of the stash and back in the haul, marked for them.', col: PAL.gray });
  G.holdNotice = { title: back.length === 1 ? 'Something you held is wanted:' : 'Things you held are wanted:', lines, money: true };
  return back;
}
const TIER_RANK = { junk: 0, common: 1, good: 2, rare: 3, epic: 4, LEGENDARY: 5 };
// grid-cell backing by tier, dark enough that the icon still owns the cell
const CELL_BG = { junk: '#2c2c30', common: '#2a2540', good: '#203028', rare: '#1e2a4a', epic: '#301f4a', LEGENDARY: '#3a2d14' };
function sortEstVal(it) { if (it.searched || it.cash) return it.val; const [lo, hi] = estRange(it); return (lo + hi) / 2; }
function homeDayOf(it) { return it.homeDay !== undefined ? it.homeDay : (it.fromDay !== undefined ? it.fromDay : -1); }
function sortedView(list) {
  const m = G.sellSort || 'new';
  const v = list.slice();
  const cats = Object.keys(CATS);
  if (m === 'value') v.sort((a, b) => sortEstVal(b) - sortEstVal(a));
  else if (m === 'type') v.sort((a, b) => (cats.indexOf(a.cat) - cats.indexOf(b.cat)) || (sortEstVal(b) - sortEstVal(a)));
  else if (m === 'rarity') v.sort((a, b) => (TIER_RANK[tierOf(sortEstVal(b)).name] || 0) - (TIER_RANK[tierOf(sortEstVal(a)).name] || 0) || (sortEstVal(b) - sortEstVal(a)));
  else v.sort((a, b) => homeDayOf(b) - homeDayOf(a));   // stable: within a day, pull order holds
  return v;
}

// what an unappraised item "looks worth" — deterministic per item
function estRange(it) {
  if (it.fakeEst) return it.fakeEst;          // it looks EXACTLY like the real thing
  const R2 = RNG(it.uid * 131 + 9);
  const sp = townRule('estSpread');                 // Vermillion: the eye is twice as unsure
  const lo = Math.max(1, Math.round(it.val * R2.r(0.55, 0.75) / sp / 5) * 5);
  const hi = Math.max(lo + 5, Math.round(it.val * R2.r(1.2, 1.5) * sp / 5) * 5);
  return [lo, hi];
}

// does the saved game own the yard? (the title screen asks before any world is loaded)
let _titleOwned = null, _titleSeed = null, _titleSeedRead = false;
function titleOwned() {
  if (_titleOwned === null) { const d = readSave(); _titleOwned = !!(d && d.world && d.world.yard && d.world.yard.owned); }
  return _titleOwned;
}
function titleSeed() {
  if (!_titleSeedRead) { const d = readSave(); _titleSeed = d ? (d.worldSeedText || d.worldSeed) : null; _titleSeedRead = true; }
  return _titleSeed;
}
function saveGame(mid) {
  if (G.demo) return;                          // a ?demo= state never overwrites a real career
  _titleOwned = null; _titleSeedRead = false;
  const json = JSON.stringify({
    v: SAVE_VER,
    money: G.money, day: G.day, worldSeed: G.worldSeed, worldSeedText: G.worldSeedText || null,
    foundLegends: G.foundLegends, stash: G.stash, van: G.van, vanCap: G.vanCap,
    trophies: G.trophies, keeps: G.keeps, seenStories: G.seenStories,
    world: G.world,
    mid: mid || null,                          // mid-day resume point; endDay's save clears it
  });
  const prev = Store.get(SAVE_KEY);
  Store.set(SAVE_BAK, prev || json);           // yesterday's save survives a bad write today
  Store.set(SAVE_KEY, json);
}
// quitting mid-day used to roll the morning back and replay the auctions.
// Now the yard and the garage checkpoint themselves: enough to rebuild the
// evening on top of the seeded day (money and stash ride the full save).
function saveMid(mode) {
  saveGame({
    mode,
    daylight: G.daylight,
    peeked: (G.today && G.today.peeked) || [],
    sold: G.today ? G.today.lockers.filter((lk) => lk.sold).map((lk) => lk.num) : [],
    passed: G.today ? G.today.lockers.filter((lk) => lk.passed).map((lk) => lk.num) : [],
    pulled: G.today ? G.today.lockers.filter((lk) => lk.pulled).map((lk) => lk.num) : [],
    order: G.today ? G.today.lockers.map((lk) => lk.num) : [],
  });
}
// plain junk needs no appraiser: its price is its price the moment it lands
// in the haul. Junk wearing a secret (a note, a name, a fake, a keeper still
// inside) keeps its question mark — the appraisal is the discovery.
function hiddenUpside(it) {
  return !!(it.note || it.named || it.fake || it.fakeEst || it.lux || it.set || it.keeper || it.movie || it.game
    || it.prov || it.legendary || it.censored || it.locked || it.loot || (MEDIA_KINDS[it.base] && !it.mediaDone));
}
function autoPriceJunk(it) {
  if (it.cat === 'junk' && !it.searched && !hiddenUpside(it)) it.searched = true;
}
// ---- the one van ----
function vanUsed() { return G.van.reduce((a, it) => a + it.size, 0); }
// ---- the first day, the van takes everything (playtest 2026-09-16, the user's idea) ----
// (2026-09-19, the user: "I don't like the BAY thing first day. Let's just say your van has unlimited room
// first day." The borrowed unit next door is gone from every screen; the rule under it is the same. The names
// below - bayOn, BAY_CAP, bayNotice - are only names now.)
// Day one is the one day you cannot judge what to leave behind: nothing has been appraised, no buyer
// has paid you yet, and the van's number means nothing to you. Leaving ten things in the dark that
// first afternoon is not a decision, it is a blind cut, and it teaches the wrong lesson. So the yard
// lets a first-timer's van take everything for the day: haul the lot, decide at home. ENERGY is
// still the real limit (every pull costs 2 + size/3 whatever the space), so this is not free money —
// it moves day one's limit onto the one number a new player can actually read. That night at the
// garage a note says the van's forty bulk is the rule from tomorrow,
// which is when the bigger vans in the paper start to mean something.
// The van itself never changes: G.vanCap is still the van you own, so the ads, the town gates, the
// codex and the squirrel's missing row all keep reading it. Only the dig and the load ask vanCapNow().
const BAY_CAP = 99999;
function bayOn() {
  if (!G.world || G.demo) return false;
  return typeof openingDay === 'function' && openingDay(G.world, curTown(), G.day) === 1;
}
// the bay on day one, less whatever somebody talked you into carrying for them this week (IDEAS_TODO 7)
function vanCapNow() { return bayOn() ? BAY_CAP : Math.max(1, G.vanCap - (typeof favourBulkToday === 'function' ? favourBulkToday() : 0)); }
function vanStripText() { return bayOn() ? 'Van: ' + vanUsed() + ' loaded, no limit today' : 'Van: ' + vanUsed() + '/' + G.vanCap; }
// at the garage on the first night: from tomorrow, the van has a limit
function bayNoticeCheck() {
  if (!bayOn() || G.world.baySaid) return;
  G.world.baySaid = true;
  // on the answering machine now, in the clerk's voice (phone.js, 2026-09-19); the box is kept only if it cannot play
  if (typeof vmClerk === 'function') { vmClerk('vm_clerk_firstday', 'From tomorrow: ' + G.vanCap + ' bulk in the van. A bigger van is worth watching the paper for.'); return; }
  G.bayNotice = {
    title: 'First day done.',
    lines: [
      { text: 'Today the van took everything you pulled. First days are like that.', col: PAL.white },
      { text: 'From tomorrow it holds ' + G.vanCap + ' bulk, and not a pound more. What does not fit stays at the door.', col: PAL.white },
      { text: 'A bigger van is worth watching the paper for.', col: PAL.gray },
    ],
  };
}

function unloadVan() {
  for (const it of G.van) {
    delete it.carried; it.loaded = false;
    it.homeDay = G.day;
    autoPriceJunk(it);
    G.stash.push(it);
  }
  if (G.van.length) play('van_unload');
  G.van = [];
}
function goHome() {
  bayNoticeCheck();                        // the first night: from tomorrow the van has a limit
  if (typeof vmEvening === 'function') vmEvening();   // and whatever else the office wants to say tonight, on the machine
  unloadVan();
  returnHeldForBuyers();                   // a buyer you held something for is in town tonight: it comes back into the haul
  G.pendingUnpack = hasTool('hiredHand');   // he opens the boxes tonight; the summary lands once the garage is on screen
  G.sellSel = -1; G.sellScroll = 0;
  G.mode = 'sell';
  saveMid('sell');
  driveHomeBeat();          // the house from the road, on the way in (drivehome.js)
}
// the newest save that parses; the backup if the main one is torn
function readSave() {
  for (const key of [SAVE_KEY, SAVE_BAK]) {
    const raw = Store.get(key);
    if (!raw) continue;
    try {
      const d = JSON.parse(raw);
      if (d && typeof d.day === 'number' && typeof d.worldSeed === 'number') return d;
    } catch (e) { /* torn; try the backup */ }
  }
  return null;
}
// older saves get every field they are missing; the world only ever grows
function migrateSave(d) {
  d.v = d.v || 1;
  d.world = Object.assign(defaultWorld(), d.world || {});
  d.world.director = Object.assign(defaultWorld().director, d.world.director || {});
  d.world.events = d.world.events || [];
  d.foundLegends = d.foundLegends || []; d.stash = d.stash || []; d.vanCap = d.vanCap || 40;
  d.trophies = d.trophies || []; d.keeps = d.keeps || []; d.seenStories = d.seenStories || [];
  d.v = SAVE_VER;
  return d;
}
function hasSave() { return !!readSave(); }
function peekSaveDay() { const d = readSave(); return d ? d.day : null; }
function loadGame() {
  const d = readSave();
  if (!d) return false;
  migrateSave(d);
  G.money = d.money; G.day = d.day; G.worldSeed = d.worldSeed; G.worldSeedText = d.worldSeedText || null;
  G.foundLegends = d.foundLegends; G.stash = d.stash; G.van = d.van || []; G.vanCap = d.vanCap;
  G.trophies = d.trophies; G.keeps = d.keeps; G.seenStories = d.seenStories;
  G.world = d.world;
  G._resumeMid = d.mid || null;
  for (const it of allHeld()) {
    it.uid = nextUid();
    autoPriceJunk(it);                // saves from before junk priced itself
    if (it.loot) for (const l of it.loot) l.uid = nextUid();
  }
  for (const it of G.van) it.uid = nextUid();
  return true;
}
// pick the day back up where it was left: doors already hammered stay sold,
// the sun stays where it stood, and the screen is the one that was quit
function applyResume() {
  const m = G._resumeMid;
  G._resumeMid = null;
  if (!m) return;
  G.daylight = m.daylight != null ? m.daylight : G.daylight;
  G.today.peeked = m.peeked || [];
  if (m.order && m.order.length === G.today.lockers.length) G.today.lockers.sort((a, b) => m.order.indexOf(a.num) - m.order.indexOf(b.num));   // a door the office moved stays moved
  for (const lk of G.today.lockers) {
    if (m.sold && m.sold.includes(lk.num)) lk.sold = true;
    if (m.passed && m.passed.includes(lk.num)) lk.passed = true;
    if (m.pulled && m.pulled.includes(lk.num)) lk.pulled = true;
  }
  for (const e of G.world.events || []) {
    if (e.k !== 'soldWithout' || e.day !== G.day || e.town !== G.world.town) continue;
    const lk = G.today.lockers.find((d) => d.num === e.unit);
    if (lk) { lk.sold = true; lk.soldTo = e.rival; lk.soldFor = e.bid; }
  }
  G.sellSel = -1; G.sellScroll = 0;
  G.mode = m.mode === 'sell' ? 'sell' : 'yard';
}
function newGame(seed) {
  G.money = 1500; G.day = 1; G.worldSeed = (seed !== undefined && seed !== null) ? (seed >>> 0) : ((Math.random() * 1e9) | 0);
  G.worldSeedText = null;
  G.foundLegends = []; G.stash = []; G.van = []; G.vanCap = 40;
  G.trophies = []; G.keeps = []; G.seenStories = []; G.homeTab = 'stash';
  G.world = defaultWorld();
  startDay();
  startFirstMorning();          // the cold open, once, before the first paper ever lands
}
function startDay() {
  G.daylight = 100; G.dayEarned = 0; G.daySpent = 0;
  G.dayStats = newDayStats();
  G.inspect = null;
  G.homeInspect = null;
  G.world.visited = G.world.visited || [];
  if (!G.world.visited.includes(G.world.town)) G.world.visited.push(G.world.town);
  G.today = genDay(G.worldSeed, G.day, G.foundLegends, G.world);
  G.today.letGo = pickLetGo();      // yesterday's door that got away, for the postcard in the yard
  postCommission();                 // a buyer's want ad goes in before the presses run
  bartTruckTick();                  // Big Bart's truck: smoking, in the shop, back (the first rival arc)
  clerkWarnTick();                  // the clerk's warning: Bart has been asking about your number (day 6)
  pushWarnTick();                   // the clerk's other warning: you have been running people up all week
  edNotebookTick();                 // Eagle Ed's notebook: lost, found in a door, back (the second)
  duoSplitTick();                   // Cody and Kaylee: two trucks, a week apart, back together (the third)
  tenantTick();                     // Merle Tuttle at the rope: the tenant's old unit (day 12)
  rivalUnitTick();                  // a rival's own unit is on the row, and they are watching it (day 26 on)
  rivalGoalTick();                  // somebody is working towards something over a fortnight (day 12 on)
  awayTick();                       // somebody takes a week off: seeded per town, and hungry when they get back
  favourTick();                     // somebody pulls you aside and asks you for something (day 18 on)
  buzzTipPlace();                   // Buzz sold you a tip last night: one door wears his mark (phone.js)
  callSettle(G.world);              // what you said on the phone a night or two ago comes back (phone.js)
  interviewTick();                  // Channel 9 wants a word (day 15)
  stormTick();                      // the storm: rain over the yard (day 21)
  holidayTick();                    // Buzz's last day before a holiday (day 28)
  formatTick();                     // the week's format door: a Dutch clock (day 8 on)
  unitAuctionTick();                // the rent ran out on your own unit: it is on the row this morning
  pickDoorReason();                 // one door this morning has a reason that is not "maybe antiques"
  pickSecondReason();               // and about one morning a week, a second door does too, pulling the other way
  G.paper = genPaper(G.worldSeed, G.day, G.today, G.foundLegends, G.seenStories, G.world, vanBaseCap());
  G.today.peeked = [];                            // viewings used today (towns with an appointment limit)
  // what the lead story printed, so tomorrow's paper can correct itself
  const lead = G.paper.lead;
  if (lead && lead.story && lead.story.kind === 'arch_hint') G.today.facts.lead = { named: lead.named, about: lead.about, arch: lead.story.arch };
  const tidy = G.today.lockers.find((lk) => lk.tidied);
  if (tidy) recordEvent('tidy13', { unit: tidy.num });      // the town noticed. the town always notices.
  recordClippings(G.paper);         // when the paper writes about you, the clipping goes on the museum wall
  G.mode = 'paper';                 // morning paper lands on the doorstep
}
function recordClippings(paper) {
  if (!paper) return;
  for (const s of [paper.lead, paper.second, paper.third]) {
    if (!s || !s.story || s.story.kind !== 'callback') continue;
    G.world.clippings = G.world.clippings || [];
    if (!G.world.clippings.some((c) => c.id === s.story.id)) G.world.clippings.push({ id: s.story.id, img: s.story.img, headline: s.story.headline, day: G.day, town: G.world.town });
  }
}

// the brand the player is visibly collecting — the director leans that way
function computeBrandLean() {
  const lean = {}, tally = {};
  for (const it of allHeld()) {
    if (!it.set || !it.searched || it.setComplete) continue;
    const def = SETS[it.set.id];
    if (!def || !def.brandLocked.includes(it.set.role)) continue;
    tally[it.set.id] = tally[it.set.id] || {};
    tally[it.set.id][it.set.brand] = (tally[it.set.id][it.set.brand] || 0) + 1;
  }
  for (const sid in tally) {
    let best = null, bn = 0;
    for (const b in tally[sid]) if (tally[sid][b] > bn) { bn = tally[sid][b]; best = b; }
    if (bn >= 2) lean[sid] = best;      // two matching pieces = you're collecting
  }
  return lean;
}

// Roy's cousin works nights: one item, one condition step, forty bucks
function processRestorations() {
  let done = null;
  for (const it of allHeld()) {
    if (!it.restoring) continue;
    it.restoring = false;
    const steps = ['Dusty', 'Worn', 'Clean', 'Mint'];
    const i = steps.indexOf(it.cond);
    if (i >= 0 && i < 2) {
      const from = steps[i], to = steps[i + 1];
      const mults = { Dusty: 0.7, Worn: 0.85, Clean: 1.0, Mint: 1.55 };
      it.cond = to;
      it.val = Math.max(1, Math.round(it.val * mults[to] / mults[from]));
      if (it.name && it.name.indexOf(from) === 0) it.name = to + it.name.slice(from.length);
      if (it.preName && it.preName.indexOf(from) === 0) it.preName = to + it.preName.slice(from.length);
      done = it;
    }
  }
  return done;
}

// exactly-once-per-real-day bookkeeping, then the sun comes up
// ---- what the raccoon is after (user's design, 2026-09-21; docs/RACCOON.md) ----
// "What if there is an item or two that is junk, it's worthless, but if you have it in your inventory at
// night... the raccoon likes a certain junk, the player won't know this... you collect them, and you need
// to make sort of a junk set for the raccoon."
//
// He does not want a BASE - he wants a THING. Whether this particular one is sticky is a hash of its uid,
// so: no new items, no change to any pool, and not one extra draw in the generator (a draw there would
// have moved every locker of every seed). About one thing in a door or two qualifies, and the card says so
// in the same sensory voice everything else uses. Nothing anywhere says what it is for.
//
// The whole loop runs on verbs that already exist: things in the HAUL are out; things in the STASH are
// behind the latch he has never worked out. Leaving a sticky thing out is the entire move.
const RAC_SET_N = 5;                       // five, and you are square with him
const RAC_WANT_ODDS = 7;                   // one uid in this many, among cheap small junk: about one door in four or five
const RAC_COME = 0.85;                     // he does not miss one that is out
const RAC_LINES_WANT = [
  'sticky. not with paint.',
  'it smells faintly of something sweet.',
  'somebody spilled something on this, a long time ago.',
];
function racWantsIt(it) {
  if (!it || it.loot || it.legendary || it.setComplete || it.leaveOnly) return false;
  if ((it.val || 0) > 14 || (it.size || 1) > 3) return false;
  return strHash('rac' + (it.uid || it.base || '')) % RAC_WANT_ODDS === 0;
}
function racWantLine(it) {
  return RAC_LINES_WANT[strHash('racline' + (it.uid || '')) % RAC_LINES_WANT.length];
}
function racArcs() { const w = G.world; if (!w) return {}; w.arcs = w.arcs || {}; return w.arcs; }
function racCount() { return racArcs().racSet || 0; }
function racSquare() { return racCount() >= RAC_SET_N; }
// the ordinary night's roll, in its own stream so the evening can ask the same question the night will
function racNightRoll(day) { return RNG(strHash('racroll' + G.worldSeed + '_' + (day == null ? G.day : day))); }
// is he coming tonight? Asked by the night, and by the drive home three hours earlier
function racComingTonight() {
  if (!G.world || G.demo) return false;
  if (G.stash && G.stash.some(racWantsIt)) return true;         // something he wants is sitting out
  if (racSquare()) return false;                                // square with you: he leaves your things alone
  return racNightRoll().chance(0.025);
}

// Deposits the raccoon has seniority, a vest, and no scruples
// Two kinds of night. One: something he WANTS is out in the haul, and he comes for it - that is the set,
// and it is the only thing that counts toward it. Two: an ordinary night, the old one-in-forty, and he
// takes whatever small thing is lying about. Once you are square (RAC_SET_N) the second kind stops: he
// does not steal from a man who has been leaving things out for him.
function raccoonVisit() {
  const R = RNG(strHash('raccoon' + G.worldSeed + '_' + G.day));
  const take = (it, gift) => {
    G.stash.splice(G.stash.indexOf(it), 1);
    const vest = makeItem('tinyVest', R);
    vest.searched = true;
    G.stash.push(vest);
    recordEvent('raccoon', { name: dName(it), base: it.base, val: it.val, gift: !!gift });
    bump('raccoon');
    if (gift) {
      const a = racArcs();
      a.racSet = Math.min(RAC_SET_N, (a.racSet || 0) + 1);
      a.racLast = G.day;
      recordEvent('racGift', { name: dName(it), n: a.racSet });
    }
    return dName(it);
  };
  const wanted = racSquare() ? [] : G.stash.filter(racWantsIt);    // square: he leaves your things where they are
  if (wanted.length) {
    if (!R.chance(RAC_COME)) return null;              // once in a while he has a night off
    return take(R.pick(wanted), true);
  }
  if (racSquare()) return null;
  if (!racNightRoll().chance(0.025)) return null;
  const small = G.stash.filter((it) => it.size <= 2 && !it.setComplete && !it.loot);
  if (!small.length) return null;
  return take(R.pick(small), false);
}
// ---- what being square with him is worth (late, rare, and never a certainty) ----
// Something goes over in the dark at the back of the room and the man who was leading loses his place:
// he misses one turn. Sometimes the crowd just laughs and he bids anyway - the roll decides, once a sale.
function racHelpRoll(au) {
  if (!au || au.done || au.racTried || !racSquare() || G.demo) return;
  if (!au.leader || au.leader === 'you' || !au.leader.def || au.leader.crowd) return;
  au.racTried = true;
  const R = RNG(strHash('rachelp' + G.worldSeed + '_' + G.day + '_' + (G.cur ? G.cur.num : 0)));
  if (!R.chance(0.16)) return;                           // a sale in six or so, and a quarter of those come to nothing
  if (R.chance(0.25)) {                                  // it happens, and it does not work
    roomEvent('raccoon', 'Something goes over at the back of the room. The crowd laughs. ' + shortRivalName(au.leader.def) + ' does not look up.');
    return;
  }
  au.racSkip = true;
  roomEvent('raccoon', 'Something goes over in the dark at the back. Every head in the room turns, and ' + shortRivalName(au.leader.def) + ' loses the thread.');
}

// inventory pressure: your own unit isn't free either
function storageRent() {
  if (yardOwned()) return 0;                      // you do not pay rent to yourself
  let bulk = 0;
  for (const it of G.stash.concat(G.keeps)) bulk += it.size;
  if (bulk <= 40) return 0;
  const fee = Math.ceil((bulk - 40) / 2);
  spend(fee);
  return fee;
}

// ---- a unit of your own (playtest 2026-09-16, the user's idea) ----
// The overflow fee was already here, as an invisible bleed: anything over 40 bulk across the haul and the
// stash cost a little money every night and the player never saw where it went (storageRent). This turns that
// into a place. You rent a unit at the yard: a number on a door, UNIT_CAP of bulk, UNIT_RENT a week on the
// weekly bill. What is in it does not count against the 40 at home, so renting trades a nightly bleed for a
// fixed rent — and what you put in there is out of reach. Fetching is a trip: energy, and only what the van
// can carry, in the town the unit is in.
// And it can be taken off you. Miss the rent and it goes on the bill; a week past due (UNIT_GRACE) the yard
// does to you exactly what you have been doing to other people all game: your unit goes on the row, with your
// things in it, and you can bid for it or watch somebody else take it home.
const UNIT_CAP = 60, UNIT_RENT = 40, UNIT_GRACE = 7, UNIT_FETCH_ENERGY = 20;
function unitOf(w) { w = w || G.world; return w ? (w.unit || null) : null; }
function unitBulk(u) { u = u || unitOf(); let b = 0; if (u) for (const it of u.items) b += it.size; return b; }
function unitHere(w) { const u = unitOf(w); return u && u.town === (w || G.world).town ? u : null; }
function unitRoom(u) { u = u || unitOf(); return u ? UNIT_CAP - unitBulk(u) : 0; }
function rentUnit() {
  if (unitOf() || G.money < UNIT_RENT) { play('denied'); return false; }
  const num = RNG(strHash('myunit_' + G.worldSeed + '_' + G.day)).i(100, 999);
  spend(UNIT_RENT);
  G.world.unit = { num, town: G.world.town, items: [], since: G.day, owed: 0, dueSince: 0 };
  play('coin');
  clerkSay('unit');
  toast('Unit ' + num + ' is yours, ' + fmt$(UNIT_RENT) + ' a week on the bill. The clerk writes your name in pencil.', PAL.cyan, 4);
  recordEvent('unitRented', { unit: num });
  return true;
}
function giveUpUnit() {
  const u = unitOf();
  if (!u || u.items.length) { play('denied'); return false; }
  toast('You hand the key back. Unit ' + u.num + ' goes back on the board, empty.', PAL.gray, 3.4);
  G.world.unit = null;
  return true;
}
// at home: a thing goes out to the unit instead of cluttering the stash
function unitPut(it) {
  const u = unitOf();
  if (!u || !it || it.size > unitRoom(u)) { play('denied'); return false; }
  takeFromLists(it);
  delete it.holdFor; delete it.heldFor;
  it.inUnit = true;
  u.items.push(it);
  G.sellSel = -1;
  play('van_load');
  toast('Out to unit ' + u.num + ' on the next run past the yard.', PAL.cyan, 3);
  return true;
}
// at the yard: a trip out to the unit. Energy, and only what the van will carry home.
function unitFetch(it) {
  const u = unitHere();
  if (!u || !it) return false;
  if (vanUsed() + it.size > vanCapNow()) { play('denied'); clerkPop('The van will not take it. Go home and unload first.', PAL.red, 3); return false; }
  if (!u.fetchedToday) {
    if (G.daylight < UNIT_FETCH_ENERGY) { play('denied'); toast('Not enough energy for the drive out there.', PAL.red, 3); return false; }
    G.daylight -= UNIT_FETCH_ENERGY; sunCheck();
    u.fetchedToday = G.day;
  }
  u.items.splice(u.items.indexOf(it), 1);
  delete it.inUnit;
  G.van.push(it);
  play('van_load');
  return true;
}
function openUnitFetch() {
  const u = unitHere();
  if (!u) return;
  const rows = u.items.slice(0, 6).map((it) => ({
    label: dName(it) + '  (' + it.size + ')',
    cb: () => { unitFetch(it); openUnitFetch(); },
    col: PAL.dgreen,
  }));
  G.modal = {
    title: 'Unit ' + u.num + '  ·  ' + unitBulk(u) + ' / ' + UNIT_CAP + ' bulk',
    lines: [
      { text: u.items.length ? 'Load what the van will take. The rest keeps.' : 'Empty. Just the echo and a bit of grit.', col: PAL.white },
      { text: (u.fetchedToday === G.day ? 'You have already driven out today.' : 'The drive out costs ' + UNIT_FETCH_ENERGY + ' energy, once today.') + '   Van: ' + vanUsed() + '/' + vanCapNow(), col: PAL.dgray },
    ],
    buttons: rows.concat([{ label: 'DONE', cb: () => { G.modal = null; }, col: PAL.slate }]),
  };
}
// the weekly bill, after the office's own: rent, and what happens when it is not paid
function unitWeekly() {
  const u = unitOf();
  if (!u) return null;
  if (G.money >= UNIT_RENT && !u.owed) { spend(UNIT_RENT); return { text: 'Rent on unit ' + u.num + ': -' + fmt$(UNIT_RENT) + '.', col: PAL.gray }; }
  u.owed += UNIT_RENT;
  if (u.dueSince == null || u.dueSince <= 0) u.dueSince = G.day;   // the week starts the first time it goes unpaid
  recordEvent('unitOwed', { unit: u.num, owed: u.owed });
  const left = UNIT_GRACE - (G.day - u.dueSince);
  if (left <= 0) {
    G.world.unitAuctionDay = G.day + 1;
    return { text: 'Unit ' + u.num + ' is a month behind. The office has cut the lock and put it on the row for tomorrow.', col: PAL.red };
  }
  return { text: 'Rent on unit ' + u.num + ' went unpaid: ' + fmt$(u.owed) + ' owed. They cut the lock in ' + left + ' days.', col: PAL.red };
}
function payUnitRent() {
  const u = unitOf();
  if (!u || !u.owed || G.money < u.owed) { play('denied'); return false; }
  spend(u.owed);
  u.owed = 0; u.dueSince = 0;
  G.world.unitAuctionDay = null;
  play('coin');
  toast('Paid up. The lock on unit ' + u.num + ' is yours again.', PAL.green, 3.4);
  return true;
}
// the morning it is sold: one door on the row IS your unit, with your things in it
function unitAuctionTick() {
  const w = G.world, u = unitOf(w);
  if (!u || !w.unitAuctionDay || w.unitAuctionDay !== G.day) return;      // an unset day must never match one
  if (u.town !== w.town || !G.today || !G.today.lockers) return;
  const lk = G.today.lockers.filter((d) => !d.story && !d.rare && !d.opening && !d.tenantDoor && !d.edNotebook && !d.format && !d.reason).pop() || G.today.lockers[G.today.lockers.length - 1];
  if (!lk) return;
  lk.num = u.num;
  lk.items = [];
  let col = 0;
  for (const it of u.items) {
    it.layer = 2; it.col = col % (lk.cols || 8); it.wCols = Math.max(1, it.wCols || 1);
    if (col >= (lk.cols || 8)) it.layer = 1;
    lk.items.push(it);
    col++;
  }
  lk.value = u.items.reduce((a, it) => a + (it.val || 0), 0);
  lk.minBid = Math.max(curTown().bidStep || 25, Math.round((u.owed || UNIT_RENT) / 25) * 25);
  lk.yourUnit = true;
  lk.owner = 'you, until the rent ran out';
  lk.flavor = 'Everybody at the rope knows whose this was. Nobody says it.';
  lk.flavor2 = null; lk.setPeek = null; lk.doorTell = null; lk.photoBase = null; lk.certBase = null; lk.letterName = null;
  recordEvent('unitSold', { unit: u.num, worth: lk.value });
  // the lock is cut and the key is the office's again: whatever happens on the row now, the unit is not yours.
  // Win it and you dig your own things out of it like anybody else's door; lose it and you watch them go.
  w.unit = null; w.unitAuctionDay = null;
}
function advanceDay() {
  const restored = processRestorations();
  const broke = toolBreakage();
  provNightly();                                  // an object with a past notices it has an owner
  yardNightly();                                  // and the yard's own story takes its next step
  paperNightly();                                 // a sale you did not drive to is a sale you missed
  const rentIn = yardIncome();
  if (rentIn) gain(rentIn);
  const stolen = raccoonVisit();
  const rent = storageRent();
  const bill = weeklyBill();                      // every seventh night: the shed, the number, the gas card
  const unitBill = (G.day >= NUT_EVERY && G.day % NUT_EVERY === 0) ? unitWeekly() : null;   // and the rent on your own door
  G.world.brandLean = computeBrandLean();
  checkAchievements();                            // the night writes down anything the evening missed (no toast: you are asleep)
  commitDay(G.world, G.today, G.money);
  let arrived = null;
  if (G.money < 150) recordEvent('broke', { money: G.money });
  else {
    // back on your feet, once, after the diner tab: the town noticed you were gone
    const lb = lastEvent('broke'), lc = lastEvent('comeback');
    if (lb && (!lc || lc.day < lb.day) && netWorth() >= 3000) recordEvent('comeback', { amt: netWorth() });
  }
  if (G.world.travelTo && TOWNS[G.world.travelTo]) {
    G.world.town = G.world.travelTo;
    G.world.travelTo = null;
    arrived = TOWNS[G.world.town];
  }
  G.day++;
  const firstVisit = !!arrived && !(G.world.visited || []).includes(arrived.id);
  if (arrived) recordEvent('arrive', { name: arrived.id, first: firstVisit });
  startDay();
  // the first time, a town gets a ceremony: the postcard, the name, the clerk. After that, a toast.
  if (firstVisit) startArrive(arrived, arrived.arrival ? arrived.arrival[0] : null);
  if (stolen) {
    // the raccoon's calling card escalates: a vest, an ironed vest, a receipt, a bidder number
    const n = countEvents('raccoon');
    const gifts = racCount();
    const took = countEvents('racGift') > 0 && (G.world.arcs || {}).racLast === G.day - 1;
    const tail = took
      ? (gifts >= RAC_SET_N ? 'The receipt says PAID IN FULL. There is no more room on it.'
        : 'A tiny vest was left in its place. The receipt has ' + ['one', 'two', 'three', 'four', 'five'][gifts - 1] + ' marks on it now.')
      : (n <= 1 ? 'A tiny vest was left, neatly folded.' : (n === 2 ? 'The vest was ironed this time.' : (n === 3 ? 'He left a receipt.' : 'The receipt has a bidder number on it. 89.')));
    toast('The ' + stolen + ' is gone. ' + tail, took ? PAL.cyan : PAL.orange, 4);
  } else if (firstVisit) { /* the arrival scene carries the clerk's line */ }
  else if (arrived && arrived.arrival) {
    // the clerk's greeting keeps count of you
    const n = countEvents('arrive', { where: (e) => e.name === arrived.id });
    toast(arrived.arrival[Math.min(Math.max(0, n - 1), arrived.arrival.length - 1)], PAL.cyan, 4);
  } else if (arrived) toast('You pull into ' + arrived.name + ' with the sunrise.', PAL.cyan, 3.6);
  else if (bill) toast(bill.text, bill.col, 4.2);
  else if (rentIn && G.world.town === 'dustyFlats') toast('The tenants paid. +' + fmt$(rentIn) + '. It is your yard.', PAL.green, 3);
  else if (restored) toast("Roy's cousin dropped off the " + BASE_BY_ID[restored.base].name + '. ' + restored.cond + ' now.', PAL.cyan, 3.4);
  else if (broke) toast(broke, PAL.orange, 3.4);
  else if (unitBill) toast(unitBill.text, unitBill.col, 4.2);
  else if (rent > 0) toast('Storage on the overflow stash: -' + fmt$(rent) + '. Sell faster.', PAL.gray, 3);
  saveGame();
}

// ============ locker rendering ============
const LK = { cols: 8, colW: 100, pad: 8, frameW: 816, frameH: 320 };

function itemDrawPos(lx, ly, it) {
  const spr = SPRITES[it.spr] || SPRITES.mystery;
  const floorY = ly + LK.frameH - 14;
  const bottoms = [floorY - 56, floorY - 28, floorY];
  const w = spr.w * RS, h = spr.h * RS;
  const x = lx + LK.pad + it.col * LK.colW + Math.floor((LK.colW * it.wCols - w) / 2);
  const y = bottoms[it.layer] - (it.liftPx || 0) * RS - h;
  return { x, y, w, h };
}

function isAccessible(it, items) {
  if (it.stackedUid && items.some((o) => o.uid === it.stackedUid)) return false;
  const a0 = it.col, a1 = it.col + it.wCols - 1;
  for (const o of items) {
    if (o === it || o.layer <= it.layer) continue;
    const b0 = o.col, b1 = o.col + o.wCols - 1;
    if (a0 <= b1 && b0 <= a1) return false;
  }
  return true;
}

// the frame flexes with the unit: 5x5 broom closets up to 10x20 double-wides
function lkFrameW(lk) { return ((lk && lk.cols) || LK.cols) * LK.colW + 2 * LK.pad; }
function lkFrameX(lk) { return Math.round((W - lkFrameW(lk)) / 2); }

// unlit depth: the interior fades into darkness toward the back wall,
// so a front-row-only peek reads as "dark in there", not "empty in there"
function drawDoorwayGloom(x, y, fw) {
  fw = fw || LK.frameW;
  const grd = g.createLinearGradient(0, y, 0, y + LK.frameH);
  grd.addColorStop(0, 'rgba(4,5,11,0.88)');
  grd.addColorStop(0.55, 'rgba(4,5,11,0.48)');
  grd.addColorStop(1, 'rgba(4,5,11,0.04)');
  g.fillStyle = grd;
  g.fillRect(x + 1, y + 1, fw - 2, LK.frameH - 6);
}

function drawLockerFrame(x, y, openFrac, fw) {
  fw = fw || LK.frameW;
  px(g, x - 10, y - 30, fw + 20, LK.frameH + 44, PAL.slate);
  px(g, x - 10, y - 30, fw + 20, 4, '#3e4763');
  px(g, x - 6, y - 24, fw + 12, 16, PAL.orange);
  px(g, x - 6, y - 24, fw + 12, 3, '#f9a583');
  px(g, x - 6, y - 11, fw + 12, 3, '#b85a3c');
  for (let i = 0; 60 + i * 170 < fw - 30; i++) px(g, x + 60 + i * 170, y - 20, 4, 8, '#8a4a2e');
  px(g, x - 2, y - 2, fw + 4, LK.frameH + 4, PAL.ink);
  px(g, x, y, fw, LK.frameH, '#20222e');
  for (let i = 0; 6 + i * 28 < fw - 8; i++) {
    px(g, x + 6 + i * 28, y + 4, 5, LK.frameH - 26, '#262a3a');
    px(g, x + 6 + i * 28, y + 4, 1, LK.frameH - 26, '#2e3346');
  }
  px(g, x + fw / 2, y + 2, 2, 14, '#12131c');
  disc(g, x + fw / 2 + 1, y + 20, 5, PAL.ggold);
  disc(g, x + fw / 2 + 1, y + 19, 2, '#ffffff');
  g.fillStyle = 'rgba(255,233,168,0.05)';
  g.beginPath(); g.moveTo(x + fw / 2 - 4, y + 22);
  g.lineTo(x + fw / 2 - 150, y + LK.frameH); g.lineTo(x + fw / 2 + 156, y + LK.frameH);
  g.lineTo(x + fw / 2 + 8, y + 22); g.fill();
  px(g, x + 2, y + LK.frameH - 22, fw - 4, 20, '#3a3f52');
  px(g, x + 2, y + LK.frameH - 22, fw - 4, 2, '#4a5068');
  px(g, x + Math.round(fw * 0.11), y + LK.frameH - 12, 60, 1, '#2c3042');
  px(g, x + Math.round(fw * 0.59), y + LK.frameH - 8, 90, 1, '#2c3042');
  px(g, x + Math.round(fw * 0.76), y + LK.frameH - 16, 40, 1, '#2c3042');
  if (openFrac < 1) {
    const dh = Math.round((LK.frameH - 6) * (1 - openFrac));
    for (let yy = 0; yy < dh; yy += 22) {
      const sh = Math.min(22, dh - yy);
      px(g, x + 1, y + 1 + yy, fw - 2, sh, PAL.dgray);
      if (sh > 4) {
        px(g, x + 1, y + 1 + yy, fw - 2, 3, PAL.gray);
        px(g, x + 1, y + 1 + yy + sh - 2, fw - 2, 2, PAL.slate);
      }
    }
    px(g, x + 1, y + dh - 4, fw - 2, 5, PAL.slate);
    px(g, x + fw / 2 - 30, y + dh - 8, 60, 6, PAL.ink);
  }
}

// ---- the torch (user, 2026-09-18) ----
// "Instead of the flashlight showing a row, can we have the mouse over light up the area, so it moves with the
// mouse? It can show right to the wall." It is a pool of light that follows the pointer inside the doorway.
// What it finds gets fainter the deeper it is: things in the middle row come up as clear shapes, things
// against the back wall as faint outlines — never what they are or what they are worth. Reach, not detail;
// the long look is the detail. A controller steers it with the right stick; with only a keyboard, and no
// stick touched, it sweeps slowly across the doorway on its own so nobody is left without it.
const TORCH_R = 105;                     // the pool's radius, a little over one column either side
let _torch = null;
function torchNow(lx, ly, fw) {
  if (!hasTool('flashlight') || !G.cur || (G.peekT || 0) < 1) return null;
  const t = _torch || (_torch = { x: lx + fw / 2, y: ly + LK.frameH * 0.62, stickAt: -99 });
  if (!(typeof focus !== 'undefined' && focus.on)) {
    if (!inRect(mouse.x, mouse.y, lx, ly, fw, LK.frameH)) return null;     // point it outside and it is off
    t.x = mouse.x; t.y = mouse.y;
    return t;
  }
  const P = focus.pad || {}, rx = P.rx || 0, ry = P.ry || 0;
  if (Math.abs(rx) > 0.15 || Math.abs(ry) > 0.15) { t.x += rx * 9; t.y += ry * 9; t.stickAt = G.time; }
  else if (G.time - t.stickAt > 3) { t.x = lx + fw / 2 + Math.sin(G.time * 0.6) * (fw / 2 - 60); t.y = ly + LK.frameH * 0.62; }
  t.x = clamp(t.x, lx, lx + fw); t.y = clamp(t.y, ly, ly + LK.frameH);
  return t;
}
// how lit a thing is, 0..1: by how far the pool's centre is from the nearest edge of it, so a big thing
// catches the light at its edge the way it would
function torchLight(p, t) {
  if (!t) return 0;
  const nx = clamp(t.x, p.x, p.x + p.w), ny = clamp(t.y, p.y, p.y + p.h);
  const d = Math.hypot(t.x - nx, t.y - ny);
  const s = clamp(1 - d / TORCH_R, 0, 1);
  return s * s * (3 - 2 * s);            // smooth at the rim, not a hard circle
}
// the light on the back wall, drawn before the things in front of it, so what it finds stands dark against it
function drawTorchPool(t) {
  const grd = g.createRadialGradient(t.x, t.y, 4, t.x, t.y, TORCH_R * 1.25);
  grd.addColorStop(0, 'rgba(255,228,170,0.30)');
  grd.addColorStop(0.55, 'rgba(255,214,150,0.12)');
  grd.addColorStop(1, 'rgba(255,214,150,0)');
  g.fillStyle = grd;
  g.fillRect(t.x - TORCH_R * 1.3, t.y - TORCH_R * 1.3, TORCH_R * 2.6, TORCH_R * 2.6);
}
// how strongly the torch shows a thing at each depth: the middle row plainly, the back wall barely
const TORCH_DEPTH = [0.5, 1, 1];

// doorway rendering: the front row for free, deeper rows only through the kit
function drawLockerItems(x, y, items, opts) {
  opts = opts || {};
  let hoverIt = null;
  for (let layer = 0; layer <= 2; layer++) {
    for (const it of items) {
      if (it.layer !== layer) continue;
      let vis = 'full', lit = 0;
      const p = itemDrawPos(x, y, it);
      if (opts.doorway) {
        vis = peekVisibility(it);
        if (vis === 'none') {
          if (opts.alone) vis = 'sil';                                        // a minute alone: the shapes in the dark
          else if (opts.torch && (lit = torchLight(p, opts.torch) * TORCH_DEPTH[layer]) > 0.02) vis = 'lit';   // in the torchlight
          else continue;
        }
      }
      const shade = (vis === 'sil' || vis === 'lit') ? 3 : (layer === 0 ? 2 : (layer === 1 ? 1 : 0));
      const spr = getSprite(it.spr, it.pal, it.cond, it.uid, shade);
      if (vis === 'full') px(g, p.x + 4, p.y + p.h - 3, p.w - 8, 4, 'rgba(0,0,0,0.35)');
      if (vis === 'lit') g.globalAlpha = lit;
      g.drawImage(spr, p.x, p.y, p.w, p.h);
      g.globalAlpha = 1;
    }
  }
  if (opts.interactive || opts.peek) {
    for (let layer = 2; layer >= 0 && !hoverIt; layer--) {
      for (const it of items) {
        if (it.layer !== layer) continue;
        const p = itemDrawPos(x, y, it);
        // a thing in the dark can be pointed at only while the torch is really on it
        if (opts.doorway && peekVisibility(it) === 'none' && !opts.alone && !(opts.torch && torchLight(p, opts.torch) * TORCH_DEPTH[layer] > 0.35)) continue;
        if (inRect(mouse.x, mouse.y, p.x, p.y, p.w, p.h) && (opts.peek || isAccessible(it, items))) { hoverIt = it; break; }
      }
    }
    if (hoverIt) {
      const p = itemDrawPos(x, y, hoverIt);
      g.strokeStyle = opts.peek ? PAL.gray : PAL.yellow; g.lineWidth = 2;
      g.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    }
  }
  return hoverIt;
}

// ============ header ============
function drawSpeakerIcon(x, y) {
  px(g, x, y + 5, 4, 6, PAL.gray);
  px(g, x + 4, y + 3, 3, 10, PAL.gray);
  px(g, x + 5, y + 1, 2, 2, PAL.gray); px(g, x + 5, y + 13, 2, 2, PAL.gray);
  if (_muted) {
    px(g, x + 9, y + 4, 2, 2, PAL.red); px(g, x + 11, y + 6, 2, 2, PAL.red); px(g, x + 13, y + 8, 2, 2, PAL.red);
    px(g, x + 13, y + 4, 2, 2, PAL.red); px(g, x + 11, y + 6, 2, 2, PAL.red); px(g, x + 9, y + 8, 2, 2, PAL.red);
  } else {
    px(g, x + 9, y + 6, 2, 4, PAL.green);
    px(g, x + 12, y + 4, 2, 8, PAL.green);
  }
}
function drawFullscreenIcon(x, y) {
  const c = PAL.gray;
  px(g, x, y, 5, 2, c); px(g, x, y, 2, 5, c);
  px(g, x + 9, y, 5, 2, c); px(g, x + 12, y, 2, 5, c);
  px(g, x, y + 12, 5, 2, c); px(g, x, y + 9, 2, 5, c);
  px(g, x + 9, y + 12, 5, 2, c); px(g, x + 12, y + 9, 2, 5, c);
}
// a little microphone — Buzz and the rivals, not the room. A red cross when
// voice-muted, same convention as the speaker icon's own red X.
function drawVoiceIcon(x, y) {
  const c = PAL.gray;
  px(g, x + 3, y, 6, 8, c);                                    // the mic head
  px(g, x + 2, y + 1, 1, 6, c); px(g, x + 9, y + 1, 1, 6, c);   // rounded sides
  px(g, x + 2, y + 8, 1, 2, c); px(g, x + 9, y + 8, 1, 2, c);   // the cage, opening
  px(g, x + 3, y + 10, 6, 1, c);                                // ...around the base
  px(g, x + 5, y + 10, 2, 3, c);                                // the stand
  px(g, x + 3, y + 13, 6, 1, c);                                // the foot
  if (_voiceMuted) {
    for (let i = 0; i < 5; i++) {
      px(g, x + i * 3, y - 1 + i * 3, 2, 2, PAL.red);
      px(g, x + 12 - i * 3, y - 1 + i * 3, 2, 2, PAL.red);
    }
  }
}
// ---- the sun: one pool of daylight for the whole day (ENERGY on screen since 2026-09-13; the code keeps its old name) ----
// Nothing on the clock ends the day for you; the sun just runs out, and then
// all that is left is the drive home. The bar was the only word on it, and a
// bar says "some" — so now it says the number, turns red when it is low, and
// explains itself on hover. Two toasts a day when it gets there, never more.
let _sunHover = false;
// ---- a button's hint (IDEAS_TODO 10; fixed 2026-09-17) ----
// A hotspot's `label` is the button's NAME: keyboard focus finds its defaults by it and the tests find buttons by
// it, so it stays the button's own text. What a button is FOR is `opts.hint`, shown while it is hovered - and focus
// moves the mouse onto what it focuses, so the keyboard and the pad read it too. button() used to drop the hint on
// the floor (it never read opts.label at all), which is why the intel buttons at the door and the LOUD and QUIET
// buttons had explanations written for them that nobody had ever seen.
let _btnTip = null;
function sunCol() { return G.daylight <= 10 ? PAL.red : (G.daylight <= 30 ? PAL.orange : PAL.yellow); }
// how many more things in this unit the sun could still buy: cheapest first,
// so it is the most it could be, not a promise about any one item
function pullsLeft() {
  if (!G.cur || !G.cur.items) return 0;
  const costs = G.cur.items.map((it) => pullCost(it)).sort((a, b) => a - b);
  let sun = G.daylight, n = 0;
  for (const c of costs) { if (c > sun) break; sun -= c; n++; }
  return n;
}
// after anything spends sun: a word at 30 and a word at 10, once each. Returns
// true when it spoke, so the caller can keep its own toast out of the way.
function sunCheck() {
  const d = G.dayStats;
  if (!d) return false;
  const n = Math.max(0, Math.round(G.daylight));
  if (G.daylight <= 10 && !d.sunWarn10) { d.sunWarn10 = true; d.sunWarn30 = true; play('sting_dusk', 0.7); toast('Running on fumes — ' + n + ' energy left. A pull or two at most, then home.', PAL.red, 4); return true; }
  if (G.daylight <= 30 && !d.sunWarn30) { d.sunWarn30 = true; toast('Energy is getting low: ' + n + ' left. A pull is 2–6, an auction 5, an odd job 30.', PAL.orange, 4); return true; }
  return false;
}
// the thermos by the energy bar: cap, steel body, a band that takes the bar's colour
function drawThermos(x, y, col) {
  px(g, x + 2, y, 6, 3, PAL.ink); px(g, x + 3, y + 1, 4, 1, PAL.red);
  px(g, x, y + 3, 10, 16, PAL.ink); px(g, x + 1, y + 4, 8, 14, PAL.lmetal);
  px(g, x + 1, y + 9, 8, 4, col);
  px(g, x + 2, y + 4, 1, 14, 'rgba(255,255,255,0.35)');
}
function drawSunTip() {
  const n = Math.max(0, Math.round(G.daylight));
  const lines = [
    ['ENERGY ' + n + ' of 100 — what you have left in you today', PAL.orange, true],
    ['Every move at the yard spends it: looking inside a door is free, joining an', PAL.white],
    ['auction is 5, each pull is 2–6 by size, an odd job is 30.', PAL.white],
    ['It never ends the day on you. When it is gone, all that is left is to go home.', PAL.gray],
  ];
  if (G.mode === 'dig' && G.cur && G.cur.items.length) {
    const k = pullsLeft();
    lines.push([k ? 'Enough for about ' + k + ' more of the ' + G.cur.items.length + ' still in this unit.' : 'Not enough for one more pull in this unit.', k ? PAL.yellow : PAL.red, true]);
  } else if (n < 5) lines.push(['Too low to join another auction today.', PAL.red, true]);
  else if (n < 30) lines.push(['Too low for an odd job. Enough for ' + Math.floor(n / 5) + ' more auction' + (Math.floor(n / 5) === 1 ? '' : 's') + '.', PAL.yellow, true]);
  const tw = 560, th = 16 + lines.length * 19;
  const x = 380, y = 40;
  px(g, x - 2, y - 2, tw + 4, th + 4, PAL.ink);
  px(g, x, y, tw, th, '#2c3044');
  px(g, x, y, tw, 2, '#404663');
  for (let i = 0; i < lines.length; i++) T(x + 12, y + 8 + i * 19, lines[i][0], lines[i][1], 14, 'left', !!lines[i][2]);
}
function drawHeader(sub) {
  px(g, 0, 0, W, 36, PAL.ink);
  px(g, 0, 34, W, 2, PAL.slate);
  T(16, 8, 'DAY ' + G.day, PAL.gray, 20, 'left', true);
  T(110, 5, fmt$(G.money), PAL.yellow, 26, 'left', true);
  const sc = sunCol();
  const blink = G.daylight <= 10 && Math.floor(G.time * 2) % 2 === 0;
  // ENERGY (called SUN until 2026-09-13): the word sits right against the bar, a thermos in front of it
  // EX is where the word ENERGY ends. It sat at 502, which put the number at x 682 and the auction's
  // "DOOR 3/3 · UNIT 999" starts at 681: they touched (user, 2026-09-18). At 422 there is about 80px to the
  // label on the right and 85 to the money on the left, even at $9,999,999.
  const EX = 422;
  g.font = 'bold ' + textSize(16) + 'px ' + FONT;
  const ew = g.measureText('ENERGY').width;
  T(EX, 10, 'ENERGY', blink ? PAL.white : sc, 16, 'right', G.daylight <= 30);
  drawThermos(Math.round(EX - ew - 16), 8, sc);
  bar(EX + 6, 9, 140, 18, G.daylight / 100, sc);
  T(EX + 152, 10, String(Math.max(0, Math.round(G.daylight))), sc, 16, 'left', true);
  const hx = Math.round(EX - ew - 20);
  _sunHover = G.mode !== 'title' && inRect(mouse.x, mouse.y, hx, 4, EX + 180 - hx, 30);
  if (sub) T(844, 10, sub, PAL.gray, 16, 'right');
  if (!(typeof window !== 'undefined' && window.BB_TEASER)) {   // the website teaser has no pause menu, so no icon for one
    px(g, 860, 11, 18, 3, PAL.gray); px(g, 860, 17, 18, 3, PAL.gray); px(g, 860, 23, 18, 3, PAL.gray);
    hot(854, 6, 28, 26, () => { if (G.mode !== 'title') G.paused = !G.paused; });
  }
  drawSpeakerIcon(896, 10);
  hot(892, 6, 22, 24, () => toggleMute());
  // fullscreen moved to the pause menu (it already has its own button there) —
  // this slot is the voice-only mute now: Buzz and the rivals, not the room
  drawVoiceIcon(930, 10);
  hot(924, 6, 24, 24, () => toggleVoiceMute());
}

// ============ TITLE ============
// ---- the rivals on the title (IDEAS_TODO 8; the user's idea, 2026-09-17) ----
// "what if on the main screen we incorporate all the rivals, so people can see there'll be characters to
// deal with" — the menu was a logo over an empty yard, and the whole middle of this game is people.
//
// This is what the splash cutouts are FOR. Twenty-one of them exist, background-free, and the user's own
// ruling on the pop that used to use them (2026-09-16) was that the art is good and only the USE was wrong:
// "we can use it elsewhere just not for that purpose". A line-up on the menu is that elsewhere.
//
// Four of the twenty-one, drawn once a launch, so the menu is not the same photograph every time and a
// returning player gets a small "oh, it's Bart today". They stand along the bottom edge and the menu is
// drawn over them, so nothing here can ever get between a player and the buttons.
const TITLE_CAST_H = 214, TITLE_CAST_ALPHA = 0.72;
const TITLE_CAST_X = [4, 116, 664, 782];      // two either side, clear of the button column at x 350..730
const _castSeen = {};                          // id -> the moment its art first showed up, so each fades in on arrival
function drawTitleCast() {
  for (let i = 0; i < TITLE_CAST_IDS.length; i++) {
    const id = TITLE_CAST_IDS[i], im = npcCutout(id);
    if (!im || !im.height) continue;            // still on its way, or no cutout for that face: the slot stays empty
    if (_castSeen[id] === undefined) _castSeen[id] = G.time;
    // up out of the dark as it lands. 0.72, not solid: the logo is the loudest thing on this screen and has
    // to stay so. At 0.5 they read as ghosts rather than people, which is the opposite of the point.
    const a = clamp((G.time - _castSeen[id]) * 1.6, 0, 1);
    g.globalAlpha = TITLE_CAST_ALPHA * a;
    g.drawImage(im, TITLE_CAST_X[i], H + 8 - TITLE_CAST_H, Math.round(TITLE_CAST_H * im.width / im.height), TITLE_CAST_H);
    g.globalAlpha = 1;
  }
}
function drawTitle() {
  if (!drawBG()) {
    px(g, 0, 0, W, H, '#101219');
    px(g, 0, 0, W, 90, '#0c0e15');
    for (let i = 0; i < 9; i++) {
      const ux = 12 + i * 106, uw = 96;
      px(g, ux, 92, uw, 190, i % 2 ? '#2a3145' : '#38415c');
      px(g, ux, 92, uw, 10, PAL.orange);
      px(g, ux, 92, uw, 3, '#f9a583');
      for (let r = 0; r < 15; r++) px(g, ux + 3, 108 + r * 11, uw - 6, 4, i % 2 ? '#222738' : '#2e364d');
      px(g, ux + uw / 2 - 12, 262, 24, 8, '#1c202e');
      px(g, ux + 8, 96, 14, 8, PAL.paper);
    }
    px(g, 0, 282, W, H - 282, '#171a24');
    px(g, 0, 282, W, 3, '#232838');
  }
  if (_logoCv) {
    const maxW = 680, maxH = 246;
    const sc = Math.min(maxW / _logoCv.width, maxH / _logoCv.height);
    const dw = Math.round(_logoCv.width * sc), dh = Math.round(_logoCv.height * sc);
    const lx = Math.round((W - dw) / 2), lyy = Math.max(26, Math.round((296 - dh) / 2));
    g.imageSmoothingEnabled = true;          // smooth downscale; the art stays chunky
    g.drawImage(_logoCv, lx, lyy, dw, dh);
    g.imageSmoothingEnabled = false;
    T(W / 2, lyy + dh + 8, (titleOwned() ? 'your yard. three doors a day. read the paper.' : 'buy blind. dig deep. get rich.'), PAL.gray, 18, 'center');
  } else if (_logoState === 'missing' || G.time > 4) {   // the painted logo is on its way: no stand-in flashes before it
    T(W / 2 + 5, 125, 'BID & BURIED', PAL.ink, 88, 'center', true, LOGO_FONT);
    T(W / 2, 120, 'BID & BURIED', PAL.yellow, 88, 'center', true, LOGO_FONT);
    T(W / 2 + 1, 121, 'BID & BURIED', '#fff3d6', 88, 'center', false, LOGO_FONT);
    T(W / 2, 210, (titleOwned() ? 'your yard. three doors a day. read the paper.' : 'buy blind. dig deep. get rich.'), PAL.gray, 22, 'center');
  }
  drawTitleCast();
  let by = 312;
  button(W / 2 - 130, by, 200, 46, 'NEW GAME', () => newGame(), { fs: 22 });
  // the world seed is a feature: pick three words, tell a friend, dig the same lockers
  button(W / 2 + 76, by, 54, 46, 'SEED', () => openSeedPick(), { fs: 14, col: PAL.slate });
  by += 54;
  if (hasSave()) { button(W / 2 - 130, by, 260, 46, 'CONTINUE  (DAY ' + (peekSaveDay() || '?') + ')', () => { if (loadGame()) { startDay(); applyResume(); } }, { fs: 20, col: PAL.dgreen }); by += 54; }
  button(W / 2 - 130, by, 260, 40, 'QUIT', () => quitGame(), { fs: 18, col: PAL.slate });
  // the cast, from the menu: who you will be bidding against, and what a career teaches you about them
  button(W / 2 - 254, by, 114, 40, 'THE PEOPLE', () => openCodexFromTitle(), { fs: 14, col: PAL.slate });
  // he is up on the office roof in the owned yard's art, where he has been silent since the day it was
  // painted. The rect is measured off the picture: about a sixth across, a fifth down (2026-09-21).
  if (titleOwned() && hasArt('bg_title_owned')) hot(132, 92, 52, 50, () => racSay('rac_roof'), { label: 'the raccoon', focusable: false });
  if (titleOwned()) button(W / 2 + 140, by, 110, 40, 'CREDITS', () => { if (hasSave()) loadGame(); startCredits('title'); }, { fs: 15, col: PAL.slate });   // the yard is yours: the credits are too
  by += 50;
  const sd = titleSeed();
  stripT(W / 2, by + 2, 'a storage auction treasure hunt — v0.5   ·   M: mute   F: fullscreen' + (sd !== null ? '   ·   world seed ' + (typeof sd === 'string' ? sd.toUpperCase() : sd) : ''), PAL.gray, 15, 'center');
}

// ---- a world of your own: three words. Same words, same lockers, for anyone who types them ----
const SEED_WORDS = [
  ['dusty', 'rusty', 'salty', 'velvet', 'chrome', 'hollow', 'mint', 'bent', 'gilt', 'late', 'odd', 'loud', 'quiet', 'broke', 'lucky', 'plated',
    'sealed', 'locked', 'borrowed', 'honest', 'crooked', 'moonlit', 'sunburnt', 'forgotten', 'delinquent', 'patient', 'greedy', 'sleepy', 'nervous', 'proud', 'plain', 'fancy',
    'humble', 'stubborn', 'tidy', 'damp', 'brass', 'oak', 'pine', 'mahogany', 'chipped', 'dented', 'folded', 'taped', 'wrapped', 'buried', 'blind', 'deep',
    'rich', 'sharp', 'dull', 'heavy', 'hasty', 'sour', 'sweet', 'cold', 'warm', 'dry', 'thick', 'cheap', 'dear', 'last', 'first', 'second'],
  ['raccoon', 'ladder', 'gavel', 'dresser', 'trunk', 'lockbox', 'kettle', 'barrel', 'tuba', 'typewriter', 'mannequin', 'teddy', 'harmonica', 'lamp', 'mirror', 'safe',
    'wardrobe', 'suitcase', 'guitar', 'amplifier', 'radio', 'globe', 'skis', 'urn', 'jar', 'crown', 'egg', 'nugget', 'deed', 'cameo', 'map', 'jacket',
    'rock', 'photo', 'key', 'ticket', 'receipt', 'postcard', 'clipping', 'notebook', 'thermos', 'clipboard', 'toothpick', 'coffee', 'pie', 'van', 'truck', 'tire',
    'fence', 'tower', 'doorway', 'padlock', 'shelf', 'drawer', 'flashlight', 'loupe', 'detector', 'catalog', 'vest', 'crate', 'box', 'bag', 'tape', 'towel'],
  ['sunday', 'tuesday', 'morning', 'dusk', 'midnight', 'noon', 'august', 'october', 'county', 'highway', 'yard', 'office', 'diner', 'motel', 'bingo', 'scrapyard',
    'courthouse', 'pulpit', 'podium', 'lobby', 'corridor', 'basin', 'springs', 'creek', 'flats', 'mesa', 'canyon', 'ridge', 'valley', 'crossing', 'junction', 'depot',
    'station', 'market', 'fair', 'parade', 'auction', 'ledger', 'gazette', 'register', 'echo', 'courier', 'thermostat', 'shopper', 'tines', 'correction', 'rent', 'rumor',
    'number', 'epoch', 'calendar', 'drought', 'harvest', 'season', 'weekend', 'payday', 'closing', 'opening', 'ending', 'chapter', 'page', 'column', 'brief', 'ad'],
];
function seedTextOf(p) { return SEED_WORDS[0][p[0]] + ' ' + SEED_WORDS[1][p[1]] + ' ' + SEED_WORDS[2][p[2]]; }
function openSeedPick() {
  G.seedPick = SEED_WORDS.map((l) => (Math.random() * l.length) | 0);
  G.mode = 'seedpick';
}
function drawSeedPick() {
  if (!drawBG()) px(g, 0, 0, W, H, '#14161f');
  px(g, 0, 0, W, H, 'rgba(6,8,16,0.35)');
  stripT(W / 2, 40, 'PICK A WORLD', PAL.yellow, 34, 'center', true);
  stripT(W / 2, 90, 'Three words. Same words, same lockers, for anyone who types them.', PAL.gray, 16, 'center');
  const p = G.seedPick;
  for (let i = 0; i < 3; i++) {
    const cx = 160 + i * 320;
    panel(cx - 104, 160, 208, 84, '#1d2030');
    T(cx, 188, SEED_WORDS[i][p[i]].toUpperCase(), PAL.white, 26, 'center', true);
    button(cx - 150, 182, 40, 40, '<', () => { p[i] = (p[i] + SEED_WORDS[i].length - 1) % SEED_WORDS[i].length; }, { fs: 20, col: PAL.slate });
    button(cx + 110, 182, 40, 40, '>', () => { p[i] = (p[i] + 1) % SEED_WORDS[i].length; }, { fs: 20, col: PAL.slate });
  }
  const text = seedTextOf(p);
  stripT(W / 2, 262, 'world seed ' + strHash(text), PAL.dgray, 13, 'center');
  button(W / 2 - 130, 300, 260, 46, 'DIG THIS WORLD', () => { newGame(strHash(text)); G.worldSeedText = text; }, { fs: 20, col: PAL.dgreen });
  button(W / 2 - 130, 356, 124, 36, 'SHUFFLE', () => { G.seedPick = SEED_WORDS.map((l) => (Math.random() * l.length) | 0); }, { fs: 15, col: PAL.slate });
  button(W / 2 + 6, 356, 124, 36, 'TYPE ONE', () => {
    const s = window.prompt('World seed (a number, or any words). Leave blank for a random world.', text);
    if (s === null) return;
    const t = s.trim();
    if (t === '') { newGame(); return; }
    if (/^\d+$/.test(t)) { newGame(parseInt(t, 10)); return; }
    newGame(strHash(t)); G.worldSeedText = t;
  }, { fs: 15, col: PAL.slate });
  button(W / 2 - 130, 402, 260, 34, 'BACK', () => { G.mode = 'title'; }, { fs: 15, col: PAL.slate });
}
// the browser only lets a page close itself when a script opened it; when it
// refuses, the lights go out and the tab is safe to shut by hand
function quitGame() {
  if (_musicEl) { try { _musicEl.pause(); } catch (e) { /* ok */ } }
  if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { /* ok */ } }
  try { window.close(); } catch (e) { /* ok */ }
  setTimeout(() => { if (!window.closed) G.mode = 'closed'; }, 150);
}
function drawClosed() {
  px(g, 0, 0, W, H, '#07080c');
  T(W / 2, 200, 'CLOSED FOR THE NIGHT', PAL.yellow, 44, 'center', true, LOGO_FONT);
  T(W / 2, 256, 'The browser will not let the game shut its own tab.', PAL.gray, 17, 'center');
  T(W / 2, 280, 'It is safe to close this tab now.', PAL.gray, 17, 'center');
  button(W / 2 - 110, 340, 220, 40, 'BACK TO THE MENU', () => { G.mode = 'title'; _musicPoll = 0; }, { fs: 16, col: PAL.slate });
}

// ============ ARRIVAL ============
// The first time you pull into a town: black, the postcard, the name in the
// paper's own face, a sting, the clerk. Four seconds. A click skips it.
function startArrive(town, line, back) {
  G.arrive = { town: town.id, t: 0, line: line || ('You pull into ' + town.name + ' with the sunrise.'), stung: false, back: back || null };
  G.mode = 'arrive';
  _musicPoll = 0;
}
const ARRIVE_HOLD_MAX = 20;          // a card waits for its narrator, but not for ever
function endArrive() {
  if (!G.arrive) return;
  voFlush(true);                     // CONTINUE cuts the narrator: nothing from the card talks over the paper
  const back = G.arrive.back;          // the dev room replays a card and wants it back; play lands on the paper
  G.arrive = null;
  G.mode = back || 'paper';
  _musicPoll = 0;
}
function drawArrive(dt) {
  const a = G.arrive;
  const town = TOWNS[a.town] || curTown();
  a.t += dt;
  px(g, 0, 0, W, H, '#050609');
  const pw = 480, ph = 360, pxx = Math.round((W - pw) / 2), pyy = 36;
  // the postcard, three times its size, out of the dark
  const pf = clamp((a.t - 0.35) / 0.8, 0, 1);
  if (pf > 0) {
    g.globalAlpha = pf;
    px(g, pxx - 10, pyy - 10, pw + 20, ph + 20, '#e8e0cc');
    px(g, pxx - 10, pyy + ph + 4, pw + 20, 6, '#cfc3a4');
    const list = _townImg[a.town];
    if (list && list.length) g.drawImage(list[0], pxx, pyy, pw, ph);
    else {
      px(g, pxx, pyy, pw, ph, '#d6c9a8');
      g.fillStyle = '#b8a982';
      for (let yy = 12; yy < ph - 12; yy += 18) for (let xx = (yy / 18) % 2 ? 21 : 12; xx < pw - 12; xx += 18) g.fillRect(pxx + xx, pyy + yy, 6, 6);
      T(pxx + pw / 2, pyy + ph / 2 - 30, '[ TOWN ]', '#6b5f45', 20, 'center', true);
      T(pxx + pw / 2, pyy + ph / 2, 'towns/tn_' + a.town + '.png', '#6b5f45', 13, 'center');
    }
    g.globalAlpha = 1;
  }
  // the name, in the masthead face, over the bottom of the card
  if (a.t > 1.2) {
    if (!a.stung) { a.stung = true; play(_snd['sting_town_' + a.town] ? 'sting_town_' + a.town : 'sting_arrive', 0.9); }
    const nf = clamp((a.t - 1.2) / 0.5, 0, 1);
    g.globalAlpha = nf;
    const ny = pyy + ph - 78 + Math.round((1 - nf) * 10);
    px(g, pxx, ny - 8, pw, 74, 'rgba(6,6,12,0.74)');
    T(W / 2 + 3, ny + 3, town.name.toUpperCase(), PAL.ink, 56, 'center', true, LOGO_FONT);
    T(W / 2, ny, town.name.toUpperCase(), PAL.paper, 56, 'center', true, LOGO_FONT);
    g.globalAlpha = 1;
  }
  // the clerk
  if (a.t > 2.2) {
    // the narrator reads the town in, once ever, with the words that are on screen
    if (!a.spoke) { a.spoke = true; speak(['nar_town_' + a.town], true, { cooldown: 0 }); }   // once a career: never refused as a repeat
    const cf = clamp((a.t - 2.2) / 0.5, 0, 1);
    g.globalAlpha = cf;
    const lines = fitLines(a.line, W - 80, [17, 16, 15], 2).lines;   // by measure, and marked if ever cut
    for (let i = 0; i < lines.length; i++) T(W / 2, 428 + i * 22, lines[i], PAL.cyan, 17, 'center');
    g.globalAlpha = 1;
  }
  hot(0, 0, W, H - 66, () => { if (a.t < 3) a.t = 3; else endArrive(); }, { focusable: false });
  if (a.t > 3) button(W / 2 - 80, H - 54, 160, 36, 'CONTINUE', () => endArrive(), { col: PAL.slate, fs: 15 });
  // It closed itself at 4.8s whatever was happening, and the narrator does not start until 2.2 — so a town
  // line of six seconds ("...The water tower still says DUS Y FLA S.") was cut from the screen mid-sentence
  // and carried on over the paper (found 2026-09-18, when Dusty Flats' card became the end of the opening).
  // Now the card holds until the voice is done, a moment more, and never past ARRIVE_HOLD_MAX.
  if (a.spoke && a.voiceEnd == null && !_voCur) a.voiceEnd = a.t;
  const voiceDone = a.voiceEnd != null && a.t > a.voiceEnd + 0.8;
  if (a.t > 4.8 && !G.demoFreeze && (voiceDone || a.t > ARRIVE_HOLD_MAX)) endArrive();
}

// ============ YARD ============
function drawYard() {
  if (!drawBG()) {
    px(g, 0, 0, W, H, '#171a24');
    px(g, 0, 330, W, 210, '#1d2130');
  }
  drawTint();
  drawHeader(curTown().name.toUpperCase());
  // the rules, once, here — after the paper, in his own room. The long take first; the stinger if that is all there is
  if (!G.rulesPlayed && speakFirstOf(['auc_rules_long', 'auc_rules_stinger'])) G.rulesPlayed = true;   // waits for the file to be found, then once
  stripT(24, 46, "TODAY'S AUCTIONS", PAL.white, 26, 'left', true);
  stripT(936, 54, 'in town today: ' + G.today.specialists.map((s) => s.def.name).join(' + '), PAL.cyan, 17, 'right');

  for (let i = 0; i < 3; i++) {
    const lk = G.today.lockers[i];
    const x = 24 + i * 312, y = 88, w = 288, h = 234;
    px(g, x - 6, y - 6, w + 12, h + 12, PAL.slate);
    px(g, x - 6, y - 6, w + 12, 24, PAL.orange);
    px(g, x - 6, y - 6, w + 12, 3, '#f9a583');
    T(x + w / 2, y - 3, 'UNIT ' + lk.num, PAL.ink, 19, 'center', true);
    T(x - 2, y - 1, ['1ST', '2ND', '3RD'][i], '#7d2b3d', 13, 'left', true);          // the row sells in this order
    if (lk.sizeLabel) T(x + w + 2, y - 1, lk.sizeLabel, '#7d2b3d', 13, 'right', true);
    if (lk.won && (lk.flipped || lk.leftAll)) {
      panel(x, y + 18, w, h - 18, '#20222e');
      T(x + w / 2, y + 80, lk.flipped ? 'FLIPPED' : 'LEFT', lk.flipped ? PAL.yellow : PAL.gray, 34, 'center', true);
      T(x + w / 2, y + 120, lk.flipped ? 'to Pawn Pete, unopened' : 'the yard is clearing it', PAL.dgray, 16, 'center');
    } else if (lk.won) {
      panel(x, y + 18, w, h - 18, '#20222e');
      T(x + w / 2, y + 80, 'CLEARED', PAL.green, 34, 'center', true);
      T(x + w / 2, y + 120, 'nice haul', PAL.dgray, 17, 'center');
    } else if (lk.sold) {
      px(g, x, y + 18, w, h - 18, PAL.dgray);
      for (let r = 0; r < 13; r++) px(g, x + 3, y + 24 + r * 16, w - 6, 6, PAL.gray);
      px(g, x + 30, y + 86, w - 60, 50, PAL.ink);
      px(g, x + 33, y + 89, w - 66, 44, PAL.red);
      T(x + w / 2, y + 94, 'SOLD', PAL.ink, 38, 'center', true);
      const buyer = lk.soldTo ? rivalDef(lk.soldTo) : null;
      if (buyer) stripT(x + w / 2, y + 150, 'to ' + buyer.name + ', ' + fmt$(lk.soldFor), PAL.white, 16, 'center');
    } else if (lk.shut) {                     // let go, and nobody would have it: put away for today
      px(g, x, y + 18, w, h - 18, PAL.dgray);
      for (let r = 0; r < 13; r++) px(g, x + 3, y + 24 + r * 16, w - 6, 6, PAL.gray);
      px(g, x + 24, y + 86, w - 48, 50, PAL.ink);
      px(g, x + 27, y + 89, w - 54, 44, PAL.slate);
      T(x + w / 2, y + 96, 'NOT TODAY', PAL.paper, 28, 'center', true);
      stripT(x + w / 2, y + 150, 'the clerk put the file away', PAL.white, 14, 'center');
    } else if (lk.pulled) {                   // an interruption: the tenant paid, and the door is off the row
      px(g, x, y + 18, w, h - 18, PAL.dgray);
      for (let r = 0; r < 13; r++) px(g, x + 3, y + 24 + r * 16, w - 6, 6, PAL.gray);
      px(g, x + 24, y + 86, w - 48, 50, PAL.ink);
      px(g, x + 27, y + 89, w - 54, 44, PAL.paper);
      T(x + w / 2, y + 96, 'PULLED', PAL.ink, 30, 'center', true);
      stripT(x + w / 2, y + 150, 'the tenant paid up at the window', PAL.white, 14, 'center');
    } else {
      px(g, x, y + 18, w, h - 18, PAL.dgray);
      for (let r = 0; r < 13; r++) px(g, x + 3, y + 24 + r * 16, w - 6, 6, PAL.gray);
      px(g, x + w / 2 - 22, y + h - 24, 44, 12, PAL.slate);
      px(g, x + 20, y + 30, 130, 26, PAL.paper);
      px(g, x + 20, y + 30, 130, 26, 'rgba(26,28,44,0.12)');
      T(x + 28, y + 34, 'opens at ' + fmt$(lk.minBid), PAL.ink, 18);
      {
        const qw = doorQueueWord(lk), up = doorIsUp(lk);
        g.font = 'bold ' + textSize(up ? 13 : 12) + 'px ' + FONT;
        const qwW = Math.ceil(g.measureText(qw).width) + 16;
        px(g, x + 20, y + 62, qwW, 20, PAL.ink);
        T(x + 28, y + 65, qw, up ? PAL.yellow : PAL.gray, up ? 13 : 12, 'left', true);
        if (lk.buzzTip) {                                  // the tip you paid Buzz for last night (phone.js)
          g.font = 'bold ' + textSize(12) + 'px ' + FONT;
          const tw = Math.ceil(g.measureText('BUZZ’S TIP').width) + 16;
          px(g, x + 26 + qwW, y + 62, tw, 20, '#3a2a10');
          T(x + 34 + qwW, y + 65, 'BUZZ’S TIP', PAL.gold, 12, 'left', true);
        }
      }
      // the door's reason, stamped on it: a want ad, your shed, a rival who needs it
      const rw = reasonShown(lk) ? reasonWords(lk.reason) : (FORMAT_WORDS[lk.format] || null);   // or the week's format
      if (rw) {
        const pulse = 0.75 + 0.25 * Math.sin(G.time * 3);
        px(g, x + 12, y + 88, w - 24, 22, PAL.ink);
        g.globalAlpha = pulse; px(g, x + 14, y + 90, 4, 18, rw.col); g.globalAlpha = 1;
        T(x + 24, y + 92, rw.tag, rw.col, 13, 'left', true);
        const subL = wrapText(rw.sub, 36).slice(0, 2);                  // two short lines fit above LOOK INSIDE
        for (let k = 0; k < subL.length; k++) stripT(x + 14, y + 116 + k * 17, subL[k], PAL.white, 12);
      }
      // viewings by appointment: past the limit, a door can only be bid on blind
      const limit = townRule('peekLimit');
      const peeked = G.today.peeked || [];
      const canPeek = !limit || peeked.includes(lk.num) || peeked.length < limit;
      if (!canPeek) {
        T(x + w / 2, y + 120, 'no more viewings today', PAL.dgray, 13, 'center');
        button(x + 64, y + 156, 160, 38, 'BID BLIND', () => {
          G.peekT = 1;
          joinDoor(lk);
        }, { fs: 18, col: PAL.dred, disabled: !doorIsUp(lk) || G.daylight < 5 || G.money < lk.minBid });
      } else button(x + 64, y + 156, 160, 38, 'LOOK INSIDE', () => {
        G.cur = lk; G.peekT = 0; G.mode = 'peek'; G.peekTour = null;
        if (limit && !peeked.includes(lk.num)) peeked.push(lk.num);
        play('door_roll'); shake(2, 0.35);
        if (Math.random() < 0.6) speak(['auc_peek_open']);
        const tell = edTellInfo(lk, G.world, G.day);
        if (tell && Math.random() < 0.5) {
          if (tell.tier === 'hot') speakOneOf(['auc_flavor_hot', 'auc_flavor_gambler']);
          else if (tell.tier === 'cold') speakOneOf(['auc_flavor_junk']);
        } else if (curTown().id === 'chromeSprings' && Math.random() < 0.4) speak(['auc_flavor_money']);   // the gavel here talks about money
      }, { fs: 18 });
      if (doorIsUp(lk)) button(x + 64, y + 200, 160, 24, 'LET IT SELL', () => letItSell(lk), { fs: 13, col: PAL.dgray, label: doorWaits(lk) ? 'the clerk holds it to the end of the row' : 'it sells to the room without you, out of tonight\'s money' });
    }
  }

  stripT(24, 344, vanStripText() + '   |   Haul: ' + G.stash.length + '   |   Stash: ' + G.keeps.length + '   |   ' + fmt$(verifiedValue()) + ' appraised' + (unverifiedValue() ? '   |   ' + fmt$(unverifiedValue()) + ' unverified' : ''), PAL.gray, 16);
  if (G.world.travelTo) stripT(24, 368, 'Leaving tonight for ' + TOWNS[G.world.travelTo].name + '. Gas is paid.', PAL.cyan, 16);
  else {
    // a buyer you held something for is in town: say so in the morning; the haul gets it back tonight
    const waitingHeld = (G.keeps || []).filter((t) => t.holdFor && buyerInTown(t.holdFor));
    if (waitingHeld.length) {
      const wb = BUYERS.find((x) => x.id === waitingHeld[0].holdFor);
      stripT(24, 368, wb.name + ' is in town: ' + waitingHeld.length + (waitingHeld.length === 1 ? ' thing' : ' things') + ' you held back in the haul tonight.', PAL.cyan, 15);
    }
  }
  // the weekly bill: owed, due tonight, or due tomorrow night
  if (G.world.nut) stripT(936, 368, 'The van is in the shop. Pay the ' + fmt$(G.world.nut.owed) + ' at the office.', PAL.red, 15, 'right');
  else if (!(typeof yardOwned === 'function' && yardOwned()) && G.day >= NUT_EVERY - 1 && nutDueDay(G.day) - G.day <= 1)
    stripT(936, 368, 'Weekly bill ' + (nutDueDay(G.day) === G.day ? 'tonight' : 'tomorrow night') + ': ' + fmt$(nutAmount(nutDueDay(G.day))), PAL.orange, 15, 'right');
  if (G.officeDay !== G.day) { G.officeDay = G.day; G.officeText = regularTip() || rivalUnitOfficeLine() || rivalGoalOfficeLine() || favourOfficeLine() || callOfficeLine() || warmTip() || awayArcOfficeLine() || bartArcOfficeLine() || edArcOfficeLine() || duoArcOfficeLine() || tenantArcOfficeLine() || interviewOfficeLine() || stormOfficeLine() || holidayOfficeLine() || formatOfficeLine() || reasonOfficeLine() || officeLine(); }   // one line a day, decided once: a regular's tip outranks the rest
  const tale = G.officeText;
  if (tale) {
    const tl = wrapText(tale, yardSignVisible() ? 80 : 92);        // short of the office-wall sign when it is up
    for (let i = 0; i < Math.min(2, tl.length); i++) stripT(24, 388 + i * 20, tl[i], PAL.orange, 16);
  }
  // the bottom of the yard (playtest 2026-09-15): GO HOME is the big one; THE PAPER and THE OFFICE are the two
  // you visit most mornings; the odd job sits on its own row above them with what it is beside it (second pass: its
  // two lines under the button ran into the tip strip); THE MAP and THE LEDGER sit on a row of their own
  const canJob = G.daylight >= 30;
  const jobPay = (G.money < 150 && G.world.town === 'dustyFlats') ? 80 : 60;   // down to gas money at home: the clerk rounds up
  const errand = typeof errandToday === 'function' ? errandToday() : null;
  if (errand) {
    // the clerk's errand from last night's call takes the odd job's place until it is done (phone.js)
    const promised = errand.answer !== 'maybe';
    button(24, 432, 150, 26, 'CLEAR THE UNIT  −' + ERRAND_ENERGY, () => doErrand(), { disabled: G.daylight < ERRAND_ENERGY, col: promised ? '#8a5a20' : PAL.dgreen, fs: 12 });
    stripT(182, 438, 'the ' + errand.family + ' family\'s unit, for the clerk: ' + ERRAND_ENERGY + ' energy.' + (promised ? ' you said you would.' : ' nobody is counting on you.'), promised ? PAL.orange : PAL.gray, 12);
  } else button(24, 432, 124, 26, 'ODD JOB +$' + jobPay, () => {
    G.daylight -= 30;
    const warned = sunCheck();                                   // the sun's word wins the one toast slot
    gain(jobPay, warned ? null : (jobPay > 60 ? 'Odd job. The clerk rounds up' : 'Odd job')); play('coin');
    bump('oddJobs'); G.dayStats.oddJobs = (G.dayStats.oddJobs || 0) + 1;
  }, { disabled: !canJob, col: PAL.dgreen, fs: 12 });
  if (!errand) stripT(156, 438, 'sweep up for the clerk: 30 energy for ' + fmt$(jobPay) + '. worth it on a broke day.', PAL.gray, 12);
  button(24, 466, 170, 42, 'THE PAPER', () => { G.mode = 'paper'; }, { col: PAL.blue, fs: 18 });
  button(202, 466, 170, 42, 'THE OFFICE', () => openOffice(), { col: G.world.nut ? PAL.dred : '#8a5a20', fs: 18 });
  button(636, 446, 300, 62, 'GO HOME — UNLOAD & SELL', () => goHome(), { col: PAL.purple, fs: 18 });
  {
    const myUnit = unitHere();
    if (myUnit) {
      const behind = !!myUnit.owed;
      button(380, 466, 170, 42, 'YOUR UNIT ' + myUnit.num, () => openUnitFetch(),
        { col: behind ? PAL.dred : PAL.navy, fs: 15 });
      stripT(380, 512, behind ? fmt$(myUnit.owed) + ' behind — pay at the office' : unitBulk(myUnit) + '/' + UNIT_CAP + ' bulk out there', behind ? PAL.lred : PAL.gray, 12);
    }
  }
  button(24, 514, 84, 22, 'THE MAP', () => { G.mapSel = G.world.town; G.mode = 'map'; }, { col: PAL.slate, fs: 11 });
  button(114, 514, 100, 22, 'THE LEDGER', () => openCodex(), { col: PAL.slate, fs: 11 });
  if (townHasGavels()) {
    const auc = curAuctioneer();
    stripT(228, 518, auc.name + ' has the gavel today. ' + auc.blurb, PAL.orange, 14);
  } else if (buzzAwayNow()) stripT(228, 518, 'Buzz is on holiday. The Reverend has the gavel this week: slow, and folded hands come back.', PAL.orange, 14);
  else if (yardOwned() && G.world.town === 'dustyFlats') stripT(228, 518, 'Your spot. Painted. Nobody parks there.', PAL.gold, 14);
  else stripT(228, 518, edNotebookGone(G.world, G.day) ? 'Tip: Eagle Ed lost his notebook. Watching him is worth nothing right now.' : (duoSplitOn(G.world, G.day) ? 'Tip: Cody and Kaylee split up. When they both want a door, let them fight over it.' : (stormNow() ? 'Tip: half the yard stayed home. The doors open cheap, and every pull costs one more in the mud.' : 'Tip: watch Eagle Ed before you bid. He knows things.')), PAL.gray, 14);
  // a small sign on the office wall. Nobody made it big on purpose.
  if (yardSignVisible()) {
    const sx2 = 760, sy2 = 366;
    px(g, sx2 - 2, sy2 - 2, 176, 40, PAL.ink);
    px(g, sx2, sy2, 172, 36, PAL.dwood);
    px(g, sx2 + 3, sy2 + 3, 166, 30, PAL.paper);
    T(sx2 + 86, sy2 + 5, 'FOR SALE', '#7d2b3d', 15, 'center', true);
    T(sx2 + 86, sy2 + 21, 'ask at the office', '#3d3626', 10, 'center');
    hot(sx2, sy2, 172, 36, () => yardTalk());
  } else if (yardOwned() && G.world.town === 'dustyFlats') {
    // the same nail, a different sign. Nobody made this one big either.
    const sx2 = 760, sy2 = 366;
    px(g, sx2 - 2, sy2 - 2, 176, 40, PAL.ink);
    px(g, sx2, sy2, 172, 36, PAL.dwood);
    px(g, sx2 + 3, sy2 + 3, 166, 30, PAL.paper);
    T(sx2 + 86, sy2 + 5, 'UNDER NEW MANAGEMENT', '#3d3626', 12, 'center', true);
    T(sx2 + 86, sy2 + 21, 'same three doors', '#7d2b3d', -10, 'center');
  }
  // Deposits, on the office roof, some mornings. Nobody points. Everybody sees.
  if (dayR('raccoonSight').chance(0.06)) drawRaccoon(806, 350);
  if (G.today.letGo && !G.today.letGo.shown && !G.modal) drawLetGo(G.today.letGo);   // the one that got away
  else if (G.today.clerkWarn && !G.modal) drawClerkWarn();                            // the clerk's warning (day 6)
  else if (G.today.pushWarn && !G.modal) drawPushWarn();                              // the clerk: you push too much
  else if (G.today.interview && !G.modal) drawInterview();                            // Channel 9 wants a word (day 15)
  else if (G.today.favour && !G.modal) drawFavour();                                  // somebody wants something (day 18 on)
}

// ============ PEEK ============
// what you can tell about an item from the doorway
// a raccoon, twenty pixels of one, on a roof line: grey, a mask, a striped tail, no business being there
function drawRaccoon(x, y) {
  const fur = '#6f6d76', dark = '#2a2730', light = '#d8d5de';
  for (let i = 0; i < 5; i++) px(g, x - 6 + i * 2, y + 6 - (i > 2 ? 1 : 0), 2, 2, i % 2 ? dark : fur);   // the tail, striped
  px(g, x + 3, y + 3, 12, 6, fur);                                    // body
  px(g, x + 12, y + 1, 7, 5, fur);                                    // head
  px(g, x + 12, y, 2, 2, fur); px(g, x + 17, y, 2, 2, fur);           // ears
  px(g, x + 13, y + 2, 6, 2, dark);                                   // the mask
  px(g, x + 14, y + 2, 1, 1, light); px(g, x + 17, y + 2, 1, 1, light);   // eyes
  px(g, x + 5, y + 9, 2, 1, dark); px(g, x + 11, y + 9, 2, 1, dark);  // feet
}
// ---- an eye for what nobody else sees (IDEAS_TODO 1b; built 2026-09-16) ----
// One thing past the front row, named outright. It picks the thing that most changes what the door is worth,
// which is the only version of this that is interesting: naming the nearest thing is noise, and naming
// everything turns the peek into a readout and kills the guessing the first three weeks are built on.
// EYE_WRONG of the time it names a real thing back there that is not the one that matters - so the eye is a
// judgement you learn to weigh, like the clerk's word, and not a manifest.
const EYE_WRONG = 0.25;
function eyeRead(lk) {
  if (!lk || !hasTool('goodEye')) return null;
  const dark = (lk.items || []).filter((it) => it.layer < 2 && !it.cash && !it.onUid
    && (typeof peekVisibility !== 'function' || peekVisibility(it) !== 'full'));
  if (!dark.length) return null;
  const R = RNG(strHash('eye_' + G.worldSeed + '_' + G.day + '_' + lk.num));
  const sorted = dark.slice().sort((a, b) => (b.val || 0) - (a.val || 0));
  const wrong = sorted.length > 1 && R.chance(EYE_WRONG);
  const pick = wrong ? R.pick(sorted.slice(1)) : sorted[0];
  return 'Something back there is a ' + String(dName(pick)).toLowerCase() + '. You would put money on it.';
}

function peekHint(it) {
  const b = BASE_BY_ID[it.base];
  let tip;
  if (it.locked) tip = 'locked — a locksmith could open it';
  else if (it.base === 'droppings') tip = 'he was here. He may still be. Listen.';
  else if (it.censored) tip = 'the office blurred that one. Nobody will say why.';
  else if (it.container) tip = 'has storage. Could hold anything. Or nothing.';
  else tip = ({
    furniture: 'buyers like furniture clean', antiques: "Antique Alice's territory",
    music: 'Riff Randy pays for music gear', tools: "Gearhead Gina's kind of thing",
    electronics: 'worth more if it still works', collectibles: 'the right collector pays up',
    weird: 'Creepy Carl pays triple for weird', jewelry: 'small, shiny, valuable',
    junk: 'scrap weight, mostly', cash: 'money is money',
  })[it.cat] || CATS[it.cat].label;
  return b.name + (it.tag ? ' (marked "' + it.tag + '")' : '') + '  —  ' + tip;
}
// ---- the peek's tour (playtest 2026-09-16, the user's idea) ----
// A dim unit full of pixel-art shapes is noise until you have learned the sprites, so a new player does not
// know WHERE TO LOOK. After the door finishes going up, the eye travels: two or three things in the front
// row get the ring and the same line hovering them would give (peekHint) — what the thing is, and what it
// might be worth caring about. Never a number: what it is actually worth is what the loupe, the appraiser
// and the dig are for, and the whole room full of bluffing rivals rests on nobody knowing it yet.
// Rules it lives by: only things already on screen (peekVisibility 'full'), never a flashlight silhouette
// (that shape is exactly what the dark is keeping), never the want-ad's thing (it has its own ring already),
// seeded per unit so a door always points at the same things, once per door a day, and it stops the instant
// you move the mouse — you looking for yourself is the whole point of it.
// 1.55s a thing: 1.3 was too fast to read (user, 2026-09-16), and the 2.1 that fixed it made the first
// six seconds at every door a wait (user, 2026-09-20: "the initial 3 peak phase is a little slow"). This
// is between them, and the whole tour is under five seconds — still yours to end with one twitch of the mouse.
const PEEK_TOUR_HOLD = 1.55, PEEK_TOUR_MAX = 3, PEEK_TOUR_FADE = 0.26;
// which things in the front row the eye goes to, in order. Pulled out of peekTourStart so the walk down the
// row (walkdown.js) points at the SAME first thing the peek will — a door never contradicts itself.
function peekTourPick(lk) {
  if (!lk) return [];
  const pool = lk.items.filter((it) => peekVisibility(it) === 'full'
    && !(lk.reason && lk.reason.uid === it.uid)      // the want ad already has its own ring on it
    && !it.cash);                                    // loose money points at itself
  // the ones with something to say first (a box that could hold anything, something locked, something
  // marked), then the rest — but seeded, so the same door always walks your eye the same way
  const R = RNG(strHash('peektour_' + G.worldSeed + '_' + G.day + '_' + lk.num));
  const worth = (it) => (it.locked ? 3 : 0) + (it.container ? 2 : 0) + (it.tag ? 1 : 0);
  return R.shuf(pool).sort((a, b) => worth(b) - worth(a)).slice(0, PEEK_TOUR_MAX);
}
function peekTourStart(lk) {
  if (!lk || lk.tourDone || G.demo || !_motion) return;
  const list = peekTourPick(lk);
  if (!list.length) { lk.tourDone = true; return; }
  G.peekTour = { list, at: G.time, mx: mouse.x, my: mouse.y };
}
function peekTourStop(lk) { if (lk) lk.tourDone = true; G.peekTour = null; }
// which thing the eye is on, or null once it has walked the row (or you took over)
function peekTourNow() {
  const t = G.peekTour;
  if (!t) return null;
  if (Math.abs(mouse.x - t.mx) + Math.abs(mouse.y - t.my) > 4) { peekTourStop(G.cur); return null; }   // your hand is on it now
  const i = Math.floor((G.time - t.at) / PEEK_TOUR_HOLD);
  if (i < 0 || i >= t.list.length) { peekTourStop(G.cur); return null; }
  if (t.lit !== i) { t.lit = i; play('ui_click', 0.3); }        // a small sound as each one comes out of the dark
  return t.list[i];
}
// how far into this one's moment we are: the dark closes in and the words come up over PEEK_TOUR_FADE
function peekTourFade() {
  const t = G.peekTour;
  if (!t) return 1;
  const since = G.time - t.at;
  const within = since - Math.floor(since / PEEK_TOUR_HOLD) * PEEK_TOUR_HOLD;
  return clamp(within / PEEK_TOUR_FADE, 0, 1);
}
// ---- the intel phase at the door (IDEAS_TODO 12; built 2026-09-16) ----
// The user asked whether bidding should have a timer. The answer recorded in IDEAS_TODO was: yes to an intel
// phase priced in energy, NO to a countdown. This is the yes half, and there is deliberately no clock anywhere
// in it. The tension the game is built on is "I do not know what is in there", not "hurry up"; real-time
// pressure already lives where it belongs, in Rapid Ray's Dutch clock once a week.
// Everything here is drawn from the SAME 100 energy that pulling things out of the unit costs later, so
// buying certainty at the door means digging less afterwards. That is the squeeze, and it needs no timer.
// One of each per door, and JOIN (5) is the threshold out of the phase and into the bidding.
// ---- the three ways in, as a choice you can read (the user's rework, 2026-09-20; docs/AUCTION_REDESIGN.md §1) ----
// "The joining loud and quiet and regular is still not very clear. The buttons are ugly. I don't like that it
// shows the energy and the stuff on there either - that needs to go on a hover." So: three cards, one under the
// other, each with a name, ONE line about the room you are about to walk into, and its energy as a chip. The
// rule, the cost in words and what it costs you ride on the hover. The line is read from the room `startAuction`
// will actually deal (roomPreview, the same seed), so which card is right changes with the morning - a face who
// is sore at you, one who would push you if they knew, a yard that has you down as money.
const STANCES = [
  { id: 'join', title: 'IN THE CROWD', col: PAL.dgreen,
    rule: 'The middle of the crowd. Some see you, some do not. You read every face, and nobody has a reason to single you out.',
    cost: 5 },
  { id: 'loud', title: 'UP FRONT', col: '#8a5a20',
    rule: 'Where everybody can see you. You look like money and you look serious: nervous paddles fold, and jump bids land harder. But the yard marks you as money for the day, nobody believes a word you say, and a face you push will happily leave the door with you.',
    cost: 8 },   // 5 + POSTURES.loud.cost, spelled out: POSTURES is declared further down (a check keeps them equal)
  { id: 'quiet', title: 'AT THE BACK', col: PAL.navy,
    rule: 'A paddle and no face. Nobody knows who is bidding, so pushing costs you nothing and nobody comes for you after. But you cannot read a face from back there, Buzz can miss you at the wire, and down to the last two they find out anyway.',
    cost: 10 },  // 5 + POSTURES.quiet.cost
];
// the room this door will actually deal, worked out once and kept on the door
let _roomPeek = { key: null, list: [] };            // kept here, not on the door: the door is saved, and a room is not
function roomPreview(lk) {
  if (!lk || G.demo) return [];
  const key = G.day + '_' + lk.num + '_' + (G.world ? G.world.town : '');
  if (_roomPeek.key === key) return _roomPeek.list;
  let list = [];
  try {
    const R = RNG(strHash('auction' + G.worldSeed + '_' + G.day + '_' + lk.num));
    list = prepNpcsForAuction(lk, R, G.world, G.day).filter((n) => n.active && !n.crowd);
  } catch (e) { list = []; }
  _roomPeek = { key, list };
  return list;
}
function stanceName(id) { const s = STANCES.find((x) => x.id === id); return s ? s.title : id; }
// one line about today's room for a card, or the plain truth when the room has nothing to add
// (not stanceLine: that name belongs to the rivals' own stance lines in memory.js)
function stanceToday(lk, id) {
  const room = roomPreview(lk);
  const sore = room.filter((n) => standingOf(n.def.id) <= -2);
  const mem = (G.world && G.world.rivalMem) || {};
  const owed = room.filter((n) => (mem.owedPush || {})[n.def.id] != null && G.day - mem.owedPush[n.def.id] <= (typeof PUSHBACK_DAYS === 'number' ? PUSHBACK_DAYS : 3));
  const n = room.length;
  if (id === 'join') {
    if (!n) return 'Nobody much is out for this one.';
    if (sore.length) return 'You read every face — and ' + (sore.length === 1 ? shortRivalName(sore[0].def) + ' is sore at you' : sore.length + ' of them are sore at you') + '.';
    return 'You read every face. Nobody singles you out.';
  }
  if (id === 'loud') {
    if (G.today && G.today.markedMoney) return 'The yard already has you down as money today.';
    if (room.some((x) => x.def.id === 'sal')) return 'Sal is out for this one, and Sal loves an audience.';
    if (n >= 4) return n + ' faces to lean on. Some of them lean back.';
    return 'They see the money. The nervous ones fold early.';
  }
  if (owed.length) return (owed.length === 1 ? shortRivalName(owed[0].def) + ' owes you a push' : owed.length + ' of them owe you a push') + ' — and cannot pay it to a stranger.';
  if (sore.length) return (sore.length === 1 ? shortRivalName(sore[0].def) + ' is sore at you' : sore.length + ' here are sore at you') + ', and cannot see who is bidding.';
  return 'A paddle, not a face. You cannot read them either.';
}
function stanceHint(lk, s, canJoin) {
  const short = s.cost + ' energy. ';
  if (!canJoin) return short + s.rule;
  if (G.daylight < s.cost) return 'not enough energy: it takes ' + s.cost + '. ' + s.rule;
  return short + s.rule;
}
// a card: the name, what it means this morning, and the energy as a chip in the corner
// ---- the peek's buttons, given some weight (user, 2026-09-20: "they need some love they are ugly") ----
// A flat rectangle with a word in it is a placeholder, not a button. These are stamped tin: an ink edge all
// round, a lit line along the top and a dark one under the bottom so the face stands proud, and a colour
// stripe down the left saying what KIND of thing it is. Hovering lights the top edge; a spent one sinks flat
// and greys. Nothing here is new art - it is four one-pixel rectangles and the right colours.
function drawChunky(x, y, w, h, o) {
  const live = !o.off && !o.done;
  const face = o.done ? '#232736' : (live ? (o.over ? '#38415c' : '#282f45') : '#1b1d27');
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 1, y + 1, w - 2, h - 2, face);
  px(g, x + 1, y + 1, w - 2, 1, live ? (o.over ? '#63709a' : '#454e6d') : '#232733');   // the light on top
  px(g, x + 1, y + h - 2, w - 2, 1, '#14161f');                                         // the shadow under
  if (o.col) px(g, x + 1, y + 1, 4, h - 2, live ? o.col : '#2a2e3c');                   // whose kind of thing it is
}
// a price, stamped into the face rather than written in the sentence
function drawCostChip(x, y, w, h, n, col, sub) {
  px(g, x, y, w, h, '#14161f');
  px(g, x + 1, y + 1, w - 2, h - 2, '#1e2130');
  T(x + w / 2, y + (sub ? 3 : Math.round((h - 15) / 2)), String(n), col, 14, 'center', true);
  if (sub) T(x + w / 2, y + h - 12, sub, PAL.dgray, 9, 'center');
}
function drawStanceCard(lk, s, x, y, w, h, canJoin) {
  const enough = G.daylight >= s.cost;
  const on = canJoin && enough;
  const over = inRect(mouse.x, mouse.y, x, y, w, h);
  drawChunky(x, y, w, h, { over, off: !on, col: s.col });
  T(x + 14, y + 2, s.title, on ? PAL.white : PAL.dgray, 14, 'left', true);
  const line = fitLines(stanceToday(lk, s.id), w - 62, [11, 11], 1);
  T(x + 14, y + 16, line.lines[0], on ? PAL.gray : PAL.dgray, line.fs, 'left');
  drawCostChip(x + w - 38, y + 3, 32, h - 6, s.cost, enough ? (on ? PAL.yellow : PAL.dgray) : PAL.red, 'nrg');
  buttonHot(x, y, w, h, s.title, () => {
    if (s.id === 'join' && Math.random() < 0.5) speak(['auc_peek_timesup'], true);
    joinDoor(lk, s.id === 'join' ? undefined : s.id);
  }, { disabled: !on, hint: stanceHint(lk, s, canJoin) }, over);
}
const INTEL = {
  look: { label: 'LOOK AGAIN', short: 'LOOK AGAIN', cost: 3, col: '#3f6fa8', hint: 'what the front row is worth, near enough' },
  deep: { label: 'A LONG LOOK', short: 'LONG LOOK', cost: 6, col: '#2f8a7a', hint: 'the row behind the front one, properly: what each thing is, not just its shape' },
  ed: { label: 'WATCH ED', short: 'WATCH ED', cost: 4, col: '#8a5a20', hint: "whatever Eagle Ed's face says about this door" },
};
const INTEL_ORDER = ['look', 'deep', 'ed'];
// The peek draws the unit shorter than the other screens do (user, 2026-09-20: "make the locker a little
// smaller so the text below fits better"). It is the same door drawn the same size - everything inside is
// placed off the FLOOR, so a shorter frame only lowers the ceiling. Nothing moves and nothing is scaled;
// the tallest thing in the game is 176px and still clears it by a good margin.
const PEEK_FRAME_H = 262;
function intelState(lk) { return (lk.intel = lk.intel || {}); }
function intelDone(lk, id) { return !!(lk && intelState(lk)[id]); }
function intelCan(lk, id) {
  if (!lk || !INTEL[id] || intelDone(lk, id)) return false;
  if (G.daylight < INTEL[id].cost) return false;
  if (id === 'ed') return !(typeof edNotebookGone === 'function' && edNotebookGone(G.world, G.day));
  return true;
}
// what the button says when it is greyed: the same checks as intelCan, in the same order, in words. A greyed
// LONG LOOK that only said what a long look does was no help to somebody holding the torch that made it pointless.
function intelWhy(lk, id) {
  const def = INTEL[id];
  if (!lk || !def) return '';
  if (intelDone(lk, id)) return 'done at this door already';
  if (id === 'ed' && typeof edNotebookGone === 'function' && edNotebookGone(G.world, G.day)) return 'Ed is not writing anything down this week';
  if (G.daylight < def.cost) return 'not enough energy: it takes ' + def.cost;
  return def.hint;
}
function intelBuy(lk, id) {
  if (!intelCan(lk, id)) { play('denied'); return false; }
  G.daylight -= INTEL[id].cost;
  if (typeof sunCheck === 'function') sunCheck();
  intelState(lk)[id] = true;
  const R = RNG(strHash('intel' + G.worldSeed + '_' + G.day + '_' + lk.num + '_' + id));
  if (id === 'look') {
    // the front row, appraised by eye: near enough, never exact
    const vis = visibleValue(lk);
    const lo = Math.max(5, Math.round(vis * R.r(0.7, 0.9) / 5) * 5), hi = Math.round(vis * R.r(1.1, 1.35) / 5) * 5;
    lk.intelLine = 'You take your time over the front row. About ' + fmt$(lo) + ' to ' + fmt$(hi) + ' of it, at a guess.';
  } else if (id === 'deep') {
    lk.longLook = true;
    lk.intelLine = 'You take your time and let your eyes get used to it. You can make out the row behind the front one now.';
  } else {
    const tier = (typeof edTier === 'function') ? edTier(lk) : null;
    lk.intelLine = tier === 'hot' ? 'Ed looks at this door twice and writes something down. He does not write much.'
      : tier === 'warm' ? 'Ed looks at it, then at his notebook, then at it again.'
      : tier === 'cold' ? 'Ed reads the door for a second and looks at the next one along.'
      : 'Ed looks at it the way he looks at everything. You learn nothing, which is its own answer.';
  }
  if (typeof toast === 'function') toast(lk.intelLine, PAL.cyan, 4.5);   // said out loud: the door's own flavour owns the space under it
  play('ui_click', 0.6);
  return true;
}

function drawPeek() {
  const wasFrameH = LK.frameH;
  LK.frameH = PEEK_FRAME_H;
  try { drawPeekBody(); } finally { LK.frameH = wasFrameH; }
}
function drawPeekBody() {
  if (!drawBG()) px(g, 0, 0, W, H, '#171a24');
  drawTint();
  drawHeader('UNIT ' + G.cur.num + '  ·  ' + (G.cur.sizeLabel || '10x10'));
  G.peekT = Math.min(1, (G.peekT || 0) + 0.03);
  computeMirrorUid(G.cur);
  const fw = lkFrameW(G.cur);
  const lx = lkFrameX(G.cur), ly = 66;
  drawLockerFrame(lx, ly, G.peekT, fw);
  let hov = null;
  if (G.peekT >= 0.15) {
    g.save();
    g.beginPath();
    g.rect(lx, ly + (LK.frameH - 6) * (1 - G.peekT), fw, (LK.frameH - 6) * G.peekT + 6);
    g.clip();
    drawDoorwayGloom(lx, ly, fw);
    // the torch waits while the eye's own tour of the front row is still going, so the two never fight
    const torch = (G.peekTour && typeof peekTourNow === 'function' && peekTourNow()) ? null : torchNow(lx, ly, fw);
    if (torch) drawTorchPool(torch);
    hov = drawLockerItems(lx, ly, G.cur.items, { peek: G.peekT >= 1, doorway: true, alone: !!G.cur.alone, torch });
    g.restore();
  }
  // the eye travels the front row, once, the moment the door is all the way up
  if (G.peekT >= 1 && !G.cur.tourDone && !G.peekTour) peekTourStart(G.cur);
  const tourIt = G.peekT >= 1 ? peekTourNow() : null;
  if (tourIt) {
    const tp = itemDrawPos(lx, ly, tourIt);
    const fade = peekTourFade();
    // the rest of the unit goes dark around it, like a torch swung across the doorway. Four flat
    // rectangles rather than a radial gradient: it is the right look for pixel art, and it draws the
    // same everywhere. The user wanted this to feel like a teaser, not a label (playtest 2026-09-16).
    const dark = 'rgba(4,5,11,' + (0.62 * fade).toFixed(2) + ')';
    const y1 = ly + LK.frameH;
    const bx0 = tp.x - 10, by0 = tp.y - 10, bx1 = tp.x + tp.w + 10, by1 = tp.y + tp.h + 10;
    px(g, lx, ly, fw, Math.max(0, by0 - ly), dark);
    px(g, lx, by1, fw, Math.max(0, y1 - by1), dark);
    px(g, lx, by0, Math.max(0, bx0 - lx), Math.max(0, by1 - by0), dark);
    px(g, bx1, by0, Math.max(0, lx + fw - bx1), Math.max(0, by1 - by0), dark);
    // it has to read at a glance, so the pulse never fades out of sight: a floor of 0.7, where a
    // 0.5 + 0.5 swing bottomed out at nothing at all and the ring simply vanished every other beat.
    g.globalAlpha = fade * (0.7 + 0.3 * Math.sin(G.time * 5)); g.strokeStyle = PAL.yellow; g.lineWidth = 3;
    g.strokeRect(tp.x - 4, tp.y - 4, tp.w + 8, tp.h + 8); g.globalAlpha = 1;
  }
  // the want ad's thing, or the piece for your shed: ringed in the front row
  if (G.peekT >= 1 && G.cur.reason && G.cur.reason.uid) {
    const rit = G.cur.items.find((it) => it.uid === G.cur.reason.uid && it.layer === 2);
    if (rit) {
      const rp = itemDrawPos(lx, ly, rit), rw2 = reasonWords(G.cur.reason);
      g.globalAlpha = 0.55 + 0.45 * Math.sin(G.time * 4); g.strokeStyle = rw2 ? rw2.col : PAL.gold; g.lineWidth = 2;
      g.strokeRect(rp.x - 3, rp.y - 3, rp.w + 6, rp.h + 6); g.globalAlpha = 1;
    }
  }

  // owned tools ride along as chips down the left edge
  let tip = null;
  const chips = G.world.tools;
  for (let i = 0; i < chips.length; i++) {
    const cx = 26, cy = 70 + i * 40;
    const tdef = TOOLS[chips[i]];
    const over = inRect(mouse.x, mouse.y, cx, cy, 32, 32);
    px(g, cx - 2, cy - 2, 36, 36, PAL.ink);
    px(g, cx, cy, 32, 32, over ? '#2c3046' : '#20222e');
    g.drawImage(getSprite(tdef.spr, 'wood', 'Clean', 3), cx + 4, cy + 4, 24, 24);
    if (over) tip = { cx: cx + 90, top: cy + 26, t: tdef.name + ' — ' + tdef.blurb, c: PAL.lblue };
  }

  // hover info rides in a tooltip panel; the bottom line stays ambient
  if (!tip && hov) {
    const p = itemDrawPos(lx, ly, hov);
    const acx = p.x + p.w / 2, atop = p.y;
    const vis = peekVisibility(hov);
    // something the torch has found says only what the torch can tell you: its shape, or barely that
    if (vis === 'none' && !G.cur.alone) tip = { cx: acx, top: atop, c: PAL.gray,
      t: hov.layer === 0 ? 'Something right at the back, against the wall. The torch will not tell you what.'
        : 'A shape in the torchlight. The flashlight only promises so much.' };
    else if (vis === 'none') tip = { cx: acx, top: atop, c: PAL.gray, t: 'A shape in the dark. That is as far as that goes.' };
    else if (G.cur.loupeUid === hov.uid) tip = { cx: acx, top: atop, t: G.cur.loupeLine || peekHint(hov), c: PAL.yellow };
    else if (hasTool('loupe') && !G.cur.loupeUid && G.peekT >= 1) {
      tip = { cx: acx, top: atop, t: peekHint(hov) + '   [click: read it with the loupe]', c: PAL.yellow };
      hot(p.x, p.y, p.w, p.h, () => { G.cur.loupeLine = loupeRead(hov); });
    } else tip = { cx: acx, top: atop, t: peekHint(hov), c: PAL.yellow };
  }
  stripT(lx, ly + LK.frameH + 6, hasTool('flashlight') ? "It's dark past the front row. Point the flashlight into it." : "You can look from the door. It's dark past the front row.", PAL.gray, 13);

  // ---- the two panels under the door (user's rework, 2026-09-20) ----
  // "the info panel below it, make it only about the locker. any rival info put in a notification bubble or
  // the right side." So the left panel is THE DOOR and nothing else - the owner, the tenant, what your own
  // eyes and tools make of it, why it matters this morning - and everything the yard is DOING moves to its
  // own panel on the right, over the three ways in. They are two different kinds of knowing and they were
  // fighting for the same four rows.
  panel(24, 352, 560, 118, '#20222e');
  // the door gets a person's name on it, in the header, where it costs none of the four info rows below
  const tenant = tenantFor(G.cur);
  T(40, 357, 'UNIT ' + G.cur.num + (tenant ? '  \u00b7  ' + tenant.name : ''), PAL.yellow, 15, 'left', true);
  // Four lines fit and the door usually has more than four things to say, so the order here decides
  // what you actually get to read. It used to be the order the lines happened to be written in, which
  // put the owner's flavour first and every instrument last. Measured 2026-09-16 over 1,200 doors with
  // the full kit: the free atmosphere showed 100% of the time, Ed's notes 47%, the metal detector 15%,
  // and the Good Eye — which costs $300 — **5%**. You bought it and it spoke at one door in twenty.
  //
  // Each source now gets a rank, and the panel fills row by row taking every source's FIRST line
  // before any source gets a second, so no one talker can shut the others out. The ranking is by how
  // much a line actually tells you about THIS door: the eye names a real object in the dark, so it
  // outranks the detector, which is a three-state gauge and says the same thing all week.
  const sources = [];
  const src = (rank, text, col) => { if (text) sources.push({ p: rank, lines: wrapText(text, 60), c: col }); };
  // the first two mornings show the owner's line and Ed, nothing else; the rest of the yard starts talking on the third
  const od = openingDay(G.world, curTown(), G.day);
  const early = od && od <= 2;
  src(0, '"' + G.cur.flavor + '"  —  ' + G.cur.owner, PAL.white);   // the door has to speak first
  if (tenant) src(0, tenant.short, PAL.gray);                       // and then whoever it was before it was a number
  { const e = eyeRead(G.cur); src(1, e, PAL.gold); }                // names a thing: the best line at the door
  // what the ROOM is doing goes to its own panel on the right; none of it is about what is in there
  const room = [];
  const roomSrc = (text, col) => { if (text) room.push({ t: text, c: col }); };
  const tell = edTell(G.cur, G.world, G.day);
  roomSrc(tell || (edNotebookGone(G.world, G.day) ? 'Eagle Ed is not writing anything down. He keeps patting his pockets.' : null), tell ? PAL.cyan : PAL.gray);
  if (!early) roomSrc(rivalTell(G.cur, G.world, G.day), PAL.orange);
  if (hasTool('edNotes')) roomSrc(edNotesLine(G.cur), PAL.gray);
  if (G.cur.loupeLine) src(4, 'Loupe: ' + G.cur.loupeLine, PAL.yellow);
  if (hasTool('catalog')) src(5, catalogLine(G.cur), PAL.yellow);
  if (hasTool('metalDetector')) src(7, detectorLine(G.cur), PAL.lblue);
  const reasonW = reasonShown(G.cur) ? reasonWords(G.cur.reason) : (FORMAT_WORDS[G.cur.format] || null);   // why this door, of the three, matters this morning
  if (reasonW) src(8, reasonW.peek, reasonW.col);
  // the office never names anybody. Your paperwork does, and this is that name.
  if (G.cur.letterName) src(9, 'The card on this one says ' + G.cur.letterName + '. You have their mail on the board.', PAL.gold);
  // the room in your photograph. What was in the picture is in here, at the back.
  if (G.cur.photoBase) src(9, 'This is the room in your photograph. The ' + (BASE_BY_ID[G.cur.photoBase] || {}).name.toLowerCase() + ' is in here somewhere, and it will not be near the door.', PAL.gold);
  if (G.cur.setPeek && !(od && od < 4)) src(9, G.cur.setPeek, PAL.gray);
  if (G.cur.flavor2) src(10, '"' + G.cur.flavor2 + '"', PAL.gray);   // a second voice from the same door
  // five rows: the door got a row back when the room moved out, and the unit above is drawn shorter
  const INFO_ROWS = 5;
  sources.sort((a, b) => a.p - b.p);
  const infoLines = [], total = sources.reduce((n, s) => n + s.lines.length, 0);
  // Decide how many rows each source gets first, then print them in rank order, each source's rows
  // together. Taking lines round-robin instead split one sentence across the panel with other people's
  // lines in between ("…Nobody ever" / the eye / the detector / "saw the owner twice.").
  const take = sources.map(() => 0);
  let rows = INFO_ROWS;
  for (let i = 0; i < sources.length && rows > 0; i++) { take[i] = 1; rows--; }        // everyone gets a word in
  for (let i = 0; i < sources.length && rows > 0; i++) {                               // spare rows finish sentences
    const more = Math.min(rows, sources[i].lines.length - take[i]); take[i] += more; rows -= more; }
  for (let i = 0; i < sources.length; i++) {
    for (let k = 0; k < take[i]; k++) {
      let t = sources[i].lines[k];
      // a source cut short says so, rather than stopping dead ("…You would put")
      if (k === take[i] - 1 && take[i] < sources[i].lines.length) t = t.replace(/[\s,;:]+$/, '') + '…';
      infoLines.push({ t, c: sources[i].c });
    }
  }
  let yy = 378;
  // when there is more than will fit, say so — but in the header, where there is empty room, rather
  // than spending one of the rows on a note about the rows you cannot have
  if (total > INFO_ROWS) T(568, 360, '+' + (total - INFO_ROWS) + ' more said at this door', PAL.dgray, 12, 'right');
  for (const l of infoLines) { T(40, yy, l.t, l.c, 13); yy += 15; }

  // ---- THE ROOM: everything the yard is doing, on the right where the ways in are ----
  {
    const RX = 600, RY = 352, RW = 336, RH = 56;
    panel(RX, RY, RW, RH, '#22202c');
    T(RX + 12, RY + 5, 'THE ROOM', PAL.dgray, 11, 'left', true);
    const lines = [];
    for (const r of room) for (const t of wrapPx(r.t, RW - 24, 12)) lines.push({ t, c: r.c });
    if (!lines.length) lines.push({ t: 'Nobody is giving anything away this morning.', c: PAL.dgray });
    const SHOW = 2;
    for (let i = 0; i < Math.min(SHOW, lines.length); i++) {
      let t = lines[i].t;
      if (i === SHOW - 1 && lines.length > SHOW) t = t.replace(/[\s,;:]+$/, '') + '…';
      T(RX + 12, RY + 21 + i * 15, t, lines[i].c, 12, 'left');
    }
    // the rest is a hover away, so a busy morning never eats the panel
    if (lines.length > SHOW) {
      const more = lines.length - SHOW;
      const mx = RX + RW - 78, my = RY + 4;
      const over = inRect(mouse.x, mouse.y, mx, my, 72, 16);
      px(g, mx, my, 72, 16, over ? '#3a3350' : '#2a2638');
      T(mx + 36, my + 2, '+' + more + ' more', over ? PAL.yellow : PAL.gray, 11, 'center', true);
      if (over) tip = { cx: mx + 36, top: my, t: room.map((r) => r.t).join('  ·  '), c: PAL.orange };
    }
  }

  // the intel phase: what you spend here you cannot dig with later. No clock (IDEAS_TODO 12).
  {
    // Out of the info panel and into a row of their own (user, 2026-09-20): they are things you DO, not
    // things the door said. The cost is a chip on the right of each button, never part of the name.
    T(32, 478, 'BEFORE YOU BID', PAL.dgray, 11, 'left', true);
    for (let i = 0; i < INTEL_ORDER.length; i++) {
      const id = INTEL_ORDER[i], def = INTEL[id];
      const done = intelDone(G.cur, id), can = intelCan(G.cur, id);
      const bx0 = 32 + i * 182, by0 = 490, bw0 = 176, bh0 = 28;
      const over = inRect(mouse.x, mouse.y, bx0, by0, bw0, bh0);
      drawChunky(bx0, by0, bw0, bh0, { over, off: !can, done, col: def.col });
      T(bx0 + 14, by0 + 7, done ? def.short + ' \u2713' : def.short, done ? PAL.dgray : (can ? PAL.white : PAL.dgray), 13, 'left', true);
      if (!done) drawCostChip(bx0 + bw0 - 36, by0 + 4, 30, bh0 - 8, def.cost, G.daylight >= def.cost ? (can ? PAL.yellow : PAL.dgray) : PAL.red);
      buttonHot(bx0, by0, bw0, bh0, def.short, () => intelBuy(G.cur, id), { disabled: done || !can, hint: can ? def.cost + ' energy. ' + def.hint : intelWhy(G.cur, id) }, over);
    }
  }
  const isUp = doorIsUp(G.cur);
  const canJoin = isUp && G.daylight >= 5 && G.money >= G.cur.minBid;
  // one line above the cards: why you cannot go in, or what going in is going to cost you at the far end
  T(600, 412, 'HOW YOU GO IN', PAL.dgray, 11, 'left', true);
  {
    // the one thing worth saying beside that label, kept short enough to sit next to it (the long version is
    // on the card hints and the yard card): why you cannot go in, or what the van cannot carry out
    let warn = null, wc = PAL.orange;
    if (!isUp) { const upD = nextDoor(); warn = upD ? 'unit ' + upD.num + ' sells first' : 'not up yet'; }
    else if (!canJoin) { warn = G.money < G.cur.minBid ? 'not enough cash' : 'not enough energy'; wc = PAL.red; }
    else {
      // more in there than the van can take, and until Pete's standing offer the rest is a bill, not a gift.
      // Priced off bulk, which is the one thing a doorway shows you honestly — so it warns without telling.
      const est = dumpFeeEstimate(G.cur);
      if (est > 0) warn = 'over the van: ~' + fmt$(est) + ' to clear';
    }
    if (warn) { const wf = fitLines(warn, 230, [11, 10], 1); T(936, 413, wf.lines[0], wc, wf.fs, 'right'); }
  }
  // the three ways in, one under the other (docs/AUCTION_REDESIGN.md §1)
  for (let i = 0; i < STANCES.length; i++) drawStanceCard(G.cur, STANCES[i], 600, 424 + i * 30, 336, 28, canJoin);
  if (isUp) {
    button(600, 516, 162, 18, 'BACK TO THE ROW', () => { G.mode = 'yard'; }, { col: PAL.slate, fs: 11 });
    button(770, 516, 166, 18, 'LET IT SELL', () => { if (letItSell(G.cur)) G.mode = 'yard'; }, { col: PAL.dgray, fs: 11,
      hint: doorWaits(G.cur) ? 'the clerk holds it to the end of the row' : 'it sells to the room without you, out of tonight\'s money' });
  } else button(600, 516, 336, 18, 'BACK TO THE ROW', () => { G.mode = 'yard'; }, { col: PAL.slate, fs: 11 });
  if (!tip && tourIt) {                       // the tour's word, exactly what hovering it would have said
    const tp2 = itemDrawPos(lx, ly, tourIt);
    tip = { cx: tp2.x + tp2.w / 2, top: tp2.y, t: peekHint(tourIt), c: PAL.yellow };
  }
  if (tip) {
    const tf = tourIt && !hov ? peekTourFade() : 1;     // the tour's word rises with its light
    if (tf < 1) g.globalAlpha = tf;
    drawTooltip(tip.cx, tip.top, tip.t, tip.c);
    g.globalAlpha = 1;
  }
}

// ============ AUCTION ============
// ---- THE OFFICE (docs/AUCTION_OVERHAUL_2.md step 5): pay the weekly bill, spend a favour ----
// Favours come from paying the weekly bill on time (memory.js). Coffee is cash, once a day. Every
// other favour waits while the bill is unpaid.
function rowUntouched() { return (G.today && G.today.lockers || []).every((d) => !d.sold && !d.won && !d.passed); }
function officeRows() {
  const w = G.world, f = favoursNow(), owed = !!w.nut;
  const open = ((G.today && G.today.lockers) || []).filter((d) => !d.won && !d.sold);
  const rows = [];
  if (owed) rows.push({ id: 'pay', label: 'PAY THE BILL', text: 'You owe ' + fmt$(w.nut.owed) + '. The van is in the shop until you do.', ok: G.money >= w.nut.owed });
  const myU = unitOf();
  if (myU && myU.owed) rows.push({ id: 'unitpay', label: 'PAY THE UNIT', text: 'Unit ' + myU.num + ' is ' + fmt$(myU.owed) + ' behind. They cut the lock when it runs out.', ok: G.money >= myU.owed });
  if (!myU) rows.push({ id: 'unitrent', label: 'RENT A UNIT', text: fmt$(UNIT_RENT) + ' a week for ' + UNIT_CAP + ' bulk of your own. What is in it is not in your way at home.', ok: G.money >= UNIT_RENT });
  else if (!myU.items.length && myU.town === G.world.town) rows.push({ id: 'unitdrop', label: 'HAND THE KEY BACK', text: 'Unit ' + myU.num + ' is empty. Stop the rent.', ok: !myU.owed });
  rows.push({ id: 'coffee', label: 'COFFEE ($10)', text: 'Coffee for the room. They go easier on you today, and fewer of them act.', ok: !G.today.coffee && G.money >= 10, used: !!G.today.coffee });
  rows.push({ id: 'move', label: 'MOVE MY DOOR', text: 'One favour. Pick a door to sell first. Only before anything on the row has sold.', ok: !owed && f > 0 && rowUntouched() && open.length >= 2 && !G.today.movedDoor, used: !!G.today.movedDoor });
  // the ladder: the everyday rungs are free, the exact one costs a favour and only family gets it
  const askable = !!clerkRumourTarget();
  rows.push({ id: 'ask', label: 'ASK AROUND', text: 'Free. What he will say about today\'s row \u2014 ' + CLERK_TIER_WORDS[clerkTier()] + '.',
    ok: !owed && askable && !G.today.askedAround, used: !!G.today.askedAround });
  if (clerkTier() === 'family') rows.push({ id: 'whole', label: 'THE WHOLE OF IT', text: 'One favour. Which door, whereabouts in it, and who is paying. He will be right.',
    ok: !owed && f > 0 && askable && !G.today.wholeOfIt, used: !!G.today.wholeOfIt });
  rows.push({ id: 'word', label: 'A QUIET WORD', text: 'One favour. Which door did the tenant cry about? The clerk will point.', ok: !owed && f > 0 && !G.today.quietWord && open.length > 0, used: !!G.today.quietWord });
  rows.push({ id: 'alone', label: 'A MINUTE ALONE', text: 'One favour. The shapes past the front row of one door, before anybody else.', ok: !owed && f > 0 && open.some((d) => !d.alone) });
  return rows;
}
function openOffice() { clerkSay('window'); G.modal = { title: 'The office.', draw: drawOffice }; }
function drawOffice() {
  const rows = officeRows(), w = G.world;
  const mw = 720, rh = 46, mx = Math.round((W - mw) / 2);
  const mh = 86 + rows.length * (rh + 6) + 48, my = Math.max(8, Math.round((H - mh) / 2));
  px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.yellow);
  panel(mx, my, mw, mh, '#242737');
  T(mx + mw / 2, my + 10, 'The office.', PAL.yellow, 24, 'center', true);
  T(mx + mw / 2, my + 44, 'Favours owed to you: ' + favoursNow() + '.  ' + (w.nut ? 'Favours wait until the bill is paid.' : 'Pay the weekly bill on time and they owe you one more.'), PAL.dgray, 13, 'center');
  T(mx + mw / 2, my + 60, 'The clerk: ' + CLERK_TIER_WORDS[clerkTier()] + '.', clerkTier() === 'stranger' ? PAL.dgray : (clerkTier() === 'family' ? PAL.gold : PAL.cyan), 12, 'center');
  let y = my + 72;
  for (const r of rows) {
    const hov = r.ok && inRect(mouse.x, mouse.y, mx + 16, y, mw - 32, rh);
    px(g, mx + 16, y, mw - 32, rh, PAL.ink);
    px(g, mx + 18, y + 2, mw - 36, rh - 4, !r.ok ? '#1b1d28' : (hov ? '#34405e' : '#2c3246'));
    T(mx + 30, y + 14, r.label, r.ok ? PAL.yellow : PAL.dgray, 14, 'left', true);
    T(mx + 196, y + 15, r.used ? 'done today.' : r.text, r.ok ? PAL.white : '#4a5068', 13);
    if (r.ok) hot(mx + 16, y, mw - 32, rh, () => { play('ui_click', 0.5); officeDo(r.id); }, { label: r.label });
    y += rh + 6;
  }
  button(mx + mw / 2 - 80, y + 4, 160, 34, 'BACK', () => { G.modal = null; }, { col: PAL.slate, fs: 16 });
}
function spendFavour() { G.world.favours = Math.max(0, favoursNow() - 1); bump('favoursUsed'); }
function officeDo(id) {
  const row = officeRows().find((r) => r.id === id);
  if (!row || !row.ok) { play('denied'); return; }
  const open = G.today.lockers.filter((d) => !d.won && !d.sold);
  if (id === 'pay') { G.modal = null; payNut(); return; }
  if (id === 'unitpay') { G.modal = null; payUnitRent(); return; }
  if (id === 'unitrent') { G.modal = null; rentUnit(); return; }
  if (id === 'unitdrop') { G.modal = null; giveUpUnit(); return; }
  if (id === 'coffee') {
    G.modal = null; spend(10); G.today.coffee = true; bump('coffees');
    clerkSay('coffee');
    toast('"Coffee\'s on the new face." The yard warms up a degree.', PAL.cyan, 3);
    return;
  }
  if (id === 'ask') {
    G.modal = null;
    G.today.askedAround = true;
    G.officeDay = G.day;
    G.officeText = clerkRumour(false) || G.officeText;
    clerkSay('ask');
    return;
  }
  if (id === 'whole') {
    G.modal = null; spendFavour();
    G.today.wholeOfIt = true;
    G.officeDay = G.day;
    G.officeText = clerkRumour(true) || G.officeText;
    clerkSay('whole');
    return;
  }
  if (id === 'word') {
    G.modal = null; spendFavour();
    const best = open.slice().sort((a, b) => b.value - a.value)[0];
    G.today.quietWord = best.num;
    G.officeDay = G.day;
    G.officeText = 'The clerk lowers his voice. "Unit ' + best.num + '. The tenant cried at the gate when we cut the lock."';
    clerkSay('word');
    return;
  }
  // a door to choose: move it to the front, or have a minute alone with it
  const cands = id === 'move' ? G.today.lockers.slice(1).filter((d) => !d.won && !d.sold) : open.filter((d) => !d.alone);
  G.modal = {
    title: id === 'move' ? 'Which door sells first?' : 'A minute alone with which door?',
    lines: [{ text: id === 'move' ? 'It goes to the front of the row. The others move down.' : 'The clerk gives you the key for one minute. You see the shapes past the front row.', col: PAL.white }],
    buttons: cands.slice(0, 3).map((d) => ({ label: 'UNIT ' + d.num, cb: () => { G.modal = null; if (id === 'move') moveDoor(d); else minuteAlone(d); }, col: PAL.dgreen }))
      .concat([{ label: 'BACK', cb: () => openOffice(), col: PAL.slate }]),
  };
}
function moveDoor(lk) {
  const row = G.today.lockers, i = row.indexOf(lk);
  if (i <= 0 || !rowUntouched()) return false;
  spendFavour();
  row.splice(i, 1); row.unshift(lk);
  G.today.movedDoor = lk.num;
  clerkSay('swap');
  toast('The clerk swaps two cards on the board. Unit ' + lk.num + ' sells first.', PAL.cyan, 3);
  return true;
}
function minuteAlone(lk) {
  spendFavour();
  lk.alone = true;
  const limit = townRule('peekLimit'), peeked = G.today.peeked || (G.today.peeked = []);
  if (limit && !peeked.includes(lk.num)) peeked.push(lk.num);
  G.cur = lk; G.peekT = 0; G.mode = 'peek'; G.peekTour = null;
  play('door_roll');
  clerkSay('minute');
  toast('"One minute. I am counting." The clerk is counting.', PAL.cyan, 3);
}
// ---- a partner for a big door: halves, one bidder, they pick first ----
const PARTNER_FACES = ['bart', 'duo', 'bev', 'vera', 'pruitt', 'cobb', 'dee', 'charlie', 'dex', 'tuck', 'priscilla', 'hattie'];
const PARTNER_TRADE = { dee: ['furniture', 'antiques'], cobb: ['tools', 'electronics'], charlie: ['collectibles', 'jewelry'], priscilla: ['antiques', 'jewelry'], vera: ['antiques', 'furniture'], dex: ['weird', 'collectibles'], bev: ['collectibles'], pruitt: ['junk', 'tools'] };
function partnerOfferFor(lk) {
  if (!G.today || G.today.partnerOffered || lk.partnerAsked || G.day < 6) return null;
  const town = curTown(), pm = town.priceMult || 1;
  if (lk.minBid < 150 * pm && visibleValue(lk) < 500 * pm) return null;
  const roster = NPCS.map((n) => n.id).concat(town.rivals || []);
  const cands = PARTNER_FACES.filter((id) => roster.includes(id) && standingOf(id) >= 0 && rivalSpentToday(id) === 0 && !(id === 'duo' && duoSplitOn(G.world, G.day)) && !awayOn(id, G.world, G.day));   // no pair to go halves with the week they are apart, and nobody offers halves from out of town
  if (!cands.length) return null;
  const R = dayR('partner', lk.num);
  // a warm face is the one who actually sidles over: likelier to ask at all, and picked ahead of the rest
  const warmCands = cands.filter((id) => warmOn(id));
  if (!R.chance(warmCands.length ? 0.75 : 0.5)) return null;
  return rivalDef(R.pick(warmCands.length ? warmCands : cands));
}
function setPartner(id) {
  const au = G.auction, a = au.npcs.find((n) => n.def.id === id);
  if (!a) return;
  a.active = false; a.partner = true;
  au.partner = { id, name: a.def.name, left: a.budgetCap || 0 };
  qLine(a.def.name + ' stands next to you. Today you are one bidder: halves on the price, and ' + shortRivalName(a.def) + ' picks first.', PAL.cyan);
}
// the most you can bid: your money, or with a partner, twice the smaller half
function bidCeiling() {
  const au = G.auction;
  return au && au.partner ? 2 * Math.min(G.money, au.partner.left) : G.money;
}
function partnerWants(id, it) {
  const trade = PARTNER_TRADE[id] || [];
  let v = claimOn(it) ? claimedValue(it) : it.val;
  if (it.loot) for (const l of it.loot) v += l.val;
  return v * (trade.includes(it.cat) ? 1.5 : 1);
}
// turn and turn about, the partner first. Sometimes they go straight for the safe.
function partnerTakesHalf(lk) {
  const def = rivalDef(lk.partner);
  if (!def || lk.partnerSplit || !G.dig) return [];
  lk.partnerSplit = true;
  const mine = G.dig.pile.filter((it) => it.loaded && !it.carried);
  if (!mine.length) return [];
  const R = dayR('partnerpick', lk.num);
  const order = mine.slice().sort((a, b) => partnerWants(def.id, b) - partnerWants(def.id, a));
  const safe = order.find((it) => it.loot && it.locked);
  if (safe && R.chance(0.5)) { order.splice(order.indexOf(safe), 1); order.unshift(safe); }
  const took = order.filter((it, i) => i % 2 === 0);
  for (const it of took) {
    const k = G.dig.pile.indexOf(it);
    if (k >= 0) { G.dig.pile.splice(k, 1); G.dig.loadedSize -= it.size; }
  }
  lk.partnerTook = took.map((it) => dName(it));
  const nm = shortRivalName(def);
  toast(nm + ' takes their half: ' + lk.partnerTook.slice(0, 2).join(', ') + (took.length > 2 ? ' and ' + (took.length - 2) + ' more' : '') + '.', PAL.orange, 4);
  return took;
}
// ---- postures (docs/AUCTION_OVERHAUL_2.md step 4): how you stand in the room, paid in energy ----
// Chosen at the door (JOIN / LOUD / QUIET) and changeable once a sale. They change how your bids
// read, not what you can afford.
//  LOUD: your raises come two steps at a time, the crowd reacts, and faces near their number
//   flinch out. The bill: the room marks you as money for the rest of the day in this town (every
//   face +10% at your later doors, Sal's spite on), nobody believes a word you say today, a win
//   gets you written down as a big spender (tomorrow's doors here open a step higher), and a call-
//   out from your feet makes you the bully for a week.
//  QUIET: you sit out the next QUIET_RAISES rival raises (or until the count starts). The room
//   thinks you are out: they relax (numbers -10%) and stop acting (bluffers turn honest). Your first
//   bid back is the surprise: Buzz reacts, the room flinches, two faces turn suspicious (one more
//   press), and the softest one folds because it thought it was over.
//  SNIPER is not a posture you choose; it is a name you earn (noteSnipe / sniperNow).
const POSTURES = {
  steady: { label: 'STEADY', cost: 0, hint: 'as you are. you read every face, and see the moment somebody you are pushing hits their number - but they see it is you.' },
  loud: { label: 'LOUD', cost: 3, hint: 'jump bids, the crowd reacts, nervous faces fold. but the room marks you as money: push anybody and they will happily leave it with you.' },
  quiet: { label: 'QUIET', cost: 5, hint: 'a paddle at the back: nobody knows who is bidding, so no grudges. but you cannot read their faces, and Buzz can miss you at the wire. down to the last two, they find out.' },
};
// ---- the three ways into a room, rebuilt around the push (user, 2026-09-18) ----
// "Quiet: your bids are not visible to anyone, the rivals don't know who is bidding, until the last two. There
// should be a bonus and a negative. Loud: you are more intimidating, but some negative that fits. The regular
// join should have its own benefit." None is always right; which is right depends on the door, the face and
// your history with it:
//   STEADY - reads. The tells show, and while you push somebody the room stops the moment they are at their
//            number (the room asks: STOP HERE or ONE MORE): the safe way to push. But they see who it is, so it costs standing.
//   LOUD   - wants the door. Scares the nervous out, as before; but push anybody from your feet and they would
//            gladly leave it with you (LOUD_PUSH_GIVE): the room drops doors on the loud.
//   QUIET  - hides. Walk in quiet and your paddle is 'the back of the room': pushing costs no standing, the room
//            relaxes. But you are blind - no tells (CAN'T SEE) - and Buzz can miss a paddle at the back at the wire
//            (QUIET_MISS). When it is down to you and one face, they turn round (quietReveal): somebody sore digs
//            in out of spite, somebody warm puts the paddle down, and anybody you were pushing now knows.
const QUIET_MISS = 0.25, LOUD_PUSH_GIVE = 0.8, QUIET_SPITE = 1.25;
function quietHidden(au) { return !!(au && au.posture === 'quiet' && au.anon && !au.anonRevealed); }
const QUIET_RAISES = 4;
// ---- where you stand (IDEAS_TODO 9; the user's idea, 2026-09-17) ----
// The user asked for a choice of where to stand in the room - down the front, on your own, or next to
// somebody - and worried, rightly, that it must not have an answer that always works.
//
// Half of that idea was already built: POSTURES above own how you CARRY yourself, and a second menu on the
// same axis would have been two menus doing one job. What is genuinely new is standing next to a PERSON,
// which is not a posture at all - it is a relationship - so this acts on THAT ONE FACE and never on the room.
//
// Once a sale, before you have bid (you pick your spot when you walk in, not after you have shown your hand),
// and it is chosen from the face menu, which already exists: no new screen, and ignoring it entirely costs
// nothing. What standing there gets you depends on WHO and on where you stand with them (standingOf, warmOn),
// so the right answer changes with the room and with your own history, which is the no-dominant-strategy
// answer. A few faces are fixed because their character demands it.
const BESIDE_COST = 2;
const BESIDE_FIXED = { sal: 'spite', ed: 'notes', ilse: 'none' };
function besideKindFor(id) {
  if (BESIDE_FIXED[id]) return BESIDE_FIXED[id];
  if (standingOf(id) <= -2) return 'spite';    // somebody sore at you takes the company personally
  if (warmOn(id)) return 'talk';               // somebody warm to you would rather talk than bid
  return 'read';
}
function besideCan(a) {
  const au = G.auction;
  if (!au || au.done || !a || a.crowd || a.folded || !a.active || !a.def) return false;
  if (au.beside || au.pbids > 0) return false;             // one spot a sale, and you pick it before you bid
  return besideKindFor(a.def.id) === 'none' || G.daylight >= BESIDE_COST;
}
// what the button on their card says. The cost rides in the label the way LOUD +3 does at the door, and so
// does the reason it is off, because button() ignores opts.label and registers no hotspot at all once a
// button is disabled — a disabled button has no other way to speak. Ten characters is what 73px holds here.
function besideLabel(a) {
  const au = G.auction;
  if (!au || !a || !a.def) return 'STAND BY';
  if (au.beside) return au.beside === a.def.id ? 'STANDING' : 'SPOT TAKEN';
  if (au.pbids > 0) return 'TOO LATE';
  if (besideKindFor(a.def.id) === 'none') return 'STAND BY';          // she does not notice, so it is free
  if (G.daylight < BESIDE_COST) return 'NO ENERGY';
  return 'STAND BY ' + BESIDE_COST;
}
// go and stand there. Everything it does, it does to them.
function standBy(a) {
  const au = G.auction;
  if (!besideCan(a)) { play('denied'); return false; }
  const id = a.def.id, nm = shortRivalName(a.def), kind = besideKindFor(id);
  au.beside = id; au.besideKind = kind;
  // the Baroness does not notice you are there, so you have not actually done anything and it costs nothing
  if (kind !== 'none') { G.daylight -= BESIDE_COST; sunCheck(); }
  closeMoveMenu();
  play('ui_click', 0.7);
  bump('stoodBy');
  if (kind === 'spite') {
    // they take it personally: a number they will go to purely because it is you standing there
    a.spiteCap = Math.min(a.budgetCap || Infinity, Math.max(a.spiteCap || 0, Math.round(a.cap * 1.25)));
    qLine('You go and stand by ' + nm + '. ' + nm + ' looks at you, and then at the door, and something changes about how much it is worth.', PAL.red);
  } else if (kind === 'talk') {
    // half their mind is on the conversation, which is a bidder's whole problem
    a.cap = Math.max(G.cur.minBid || 0, Math.round(a.cap * 0.86));
    qLine('You go and stand by ' + nm + ', who would honestly rather talk than bid, and does.', PAL.green);
  } else if (kind === 'notes') {
    // over his shoulder. A band, never a number — and a band that sits a little off the truth as often as
    // not, because a source that is never wrong kills the guessing the first three weeks are built on.
    // Ed is the best read in this yard. Ed is not an oracle, and his handwriting is his own.
    const skew = 0.85 + (strHash('ednote' + G.worldSeed + '_' + G.day + '_' + G.cur.num) % 61) / 200;   // 0.85 .. 1.15
    const v = (G.cur.value || 0) * skew;
    const lo = Math.max(5, Math.round(v * 0.7 / 25) * 25), hi = Math.round(v * 1.4 / 25) * 25;
    qLine('You stand where you can see Ed\u2019s notebook. He has written a number on this door, and underlined it: somewhere around ' + fmt$(lo) + ' to ' + fmt$(hi) + '.', PAL.cyan);
  } else if (kind === 'none') {
    qLine('You go and stand by the Baroness. The Baroness continues not to know that you exist.', PAL.dgray);
  } else {
    // the trade: this close they stop performing at you, and they can see your face just as well
    a.tellMode = 'honest';
    a.pressLeft = (a.pressLeft || 0) + 1;
    qLine('You go and stand by ' + nm + '. This close nobody can act, which cuts both ways.', PAL.cyan);
  }
  return true;
}
// ---- what the room reads on YOU (docs/AUCTION_SPEC.md; 2026-09-22) ----
// The spec's best line, and the one thing this room could not do: "The player also leaks. NPCs can read
// the player." Every rival has a tell; you had none. So: a heat that is yours, hidden, this door only.
//
// It rises on the things that show a man wants something - bidding the moment the door opens, jumping in
// steps of more than one, standing down the front, and hardest of all the quiet man at the back who says
// nothing all sale and then bids at the count. It falls while you hold off. Nothing is ever drawn as a
// meter: what you see is a face turning to look at you and a line in the log.
const PH_MARK = 58, PH_FADE = 34, PH_MAX = 100;
const PH = {
  join_loud: 10,            // you stood up as you walked in
  raise_loud: 8,
  raise_steady: 4,
  raise_quiet_early: 3,
  raise_quiet_late: 12,     // the sniper, at the count, after a whole sale of nothing
  jump: 6,                  // more than one step at a time
  first: 5,                 // you opened the door yourself
  hold: -6,                 // you let it go round without you
  look: -3,                 // a man taking a proper look is not a man in a hurry
};
function pHeat(au) { return (au && au.pheat) || 0; }
function pHeatAdd(au, n) {
  if (!au || au.done || !n) return;
  au.pheat = clamp((au.pheat || 0) + n, 0, PH_MAX);
}
// who is actually reading you: nerve, or history. The nervous ones are watching the door like everyone else.
// (whether they are in this sale at all is the caller's business - this is only about the kind of person)
function readsYou(a) {
  if (!a || a.crowd || !a.def) return false;
  if ((a.def.press || 0) >= 2) return true;
  const id = a.def.id;
  if (typeof standingOf === 'function' && Math.abs(standingOf(id)) >= 2) return true;   // you two have history
  return typeof tellKnown === 'function' && !!tellKnown(id);                            // a face you have learned learns back
}
const MARK_LINES = [
  '{name} stops watching the door and starts watching you.',
  '{name} has worked out which one of these you came for.',
  '{name} looks at you, then at the door, then at you again.',
  '{name} is not bidding on the locker any more. {name} is bidding on you.',
];
const UNMARK_LINES = [
  '{name} loses interest in you and goes back to the door.',
  '{name} decides you are not the story after all.',
];
// the room's turn: who has noticed, and what it costs you
function pHeatTick(au) {
  if (!au || au.done || !au.npcs) return;
  const seen = !quietHidden(au);
  for (const a of au.npcs) {
    if (!a || a.crowd || !a.def) continue;
    if (a.marked) {
      // it fades when you stop feeding it: a man who has gone quiet is not worth watching
      if (pHeat(au) <= PH_FADE) {
        a.marked = false;
        if (a.markCap) { a.cap = Math.max(0, a.cap - a.markCap); a.markCap = 0; }
        qLine(RNG(strHash('unmark' + G.worldSeed + '_' + G.day + '_' + a.def.id)).pick(UNMARK_LINES).replace(/\{name\}/g, shortRivalName(a.def)), PAL.gray);
      }
      continue;
    }
    if (!seen || a.markedOnce || pHeat(au) < PH_MARK || !readsYou(a) || !a.active || a.folded) continue;
    // one of them, not all of them: the first reader to notice takes the mark this sale
    a.marked = true; a.markedOnce = true;
    // a door somebody wants is a door worth having: they find a little more for it, and never past the wallet
    const room = Math.max(0, (a.budgetCap == null ? Infinity : a.budgetCap) - a.cap);
    a.markCap = Math.min(Math.round(a.cap * 0.15), room === Infinity ? Math.round(a.cap * 0.15) : room);
    a.cap += a.markCap;
    setReact(a.def.id, 'glare');
    bookWrite(a.def.splitFrom || a.def.id, 'counter', 'watches you when you bid like you want it', false);
    qLine(RNG(strHash('mark' + G.worldSeed + '_' + G.day + '_' + a.def.id)).pick(MARK_LINES).replace(/\{name\}/g, shortRivalName(a.def)), PAL.orange);
    roomEvent('marked', shortRivalName(a.def) + ' is watching you.', a.def.id);
    bump('marked');
    break;
  }
}

// ---- THE BOOK (docs/AUCTION_SPEC.md; 2026-09-22) ----
// Three slots a face and no more: what they WANT, their TELL, and their COUNTER - the thing they do back
// to you. Filled by standing in the room, never handed over, never a number. A slot says how sure you are
// (1..3) and goes up when the same thing happens again; a thing you SEE overwrites a thing you were TOLD,
// and a rumour never overwrites a sighting. The paper can poison a slot, and the first time it should be
// able to burn you: a want you read about reads exactly like a want you watched.
const BOOK_SLOTS = ['want', 'tell', 'counter'];
const BOOK_TELL_REPEAT = 2;
function bookAll() {
  const w = G.world;
  if (!w) return {};
  w.arcs = w.arcs || {};
  return (w.arcs.book = w.arcs.book || {});
}
function bookOf(id) { const b = bookAll(); return (b[id] = b[id] || {}); }
function bookHas(id) { const e = bookAll()[id]; return !!e && BOOK_SLOTS.some((k) => e[k]); }
function bookWrite(id, slot, text, poisoned) {
  if (!id || !text || BOOK_SLOTS.indexOf(slot) < 0) return null;
  const e = bookOf(id), cur = e[slot];
  if (cur && cur.t === text) {                       // the same thing again: you are surer of it
    cur.conf = Math.min(3, (cur.conf || 1) + 1);
    if (!poisoned) cur.poisoned = false;
    return cur;
  }
  if (cur && !cur.poisoned && poisoned) return cur;   // you watched it happen; the paper does not get a vote
  if (cur && !cur.poisoned && (cur.conf || 1) > 1) { cur.conf -= 1; return cur; }   // one contradiction is not a rewrite
  e[slot] = { t: text, conf: 1, poisoned: !!poisoned, day: G.day };
  return e[slot];
}
// what a door is mostly made of, in the one word a person would use
function bookDoorWord(lk) {
  if (!lk || !lk.items) return null;
  const by = {};
  for (const it of lk.items) by[it.cat] = (by[it.cat] || 0) + (it.val || 0);
  let best = null;
  for (const c in by) if (!best || by[c] > by[best]) best = c;
  return best && CATS[best] ? CATS[best].label.toLowerCase() : null;
}
const BOOK_WANT = (word) => 'wants the ' + word;          // short: the Ledger card has one row for this
const BOOK_TELLS = { honest: 'sweats when he is near his number', act: 'the nerves are an act' };
// at the hammer: who wanted what, and did you see it happen
function bookAfterSale(au) {
  if (!au || !G.cur || G.demo) return;
  const seen = !quietHidden(au);
  const word = bookDoorWord(G.cur);
  for (const a of au.npcs || []) {
    if (!a || a.crowd || !a.def || !a.def.id) continue;
    const id = a.def.splitFrom || a.def.id;
    if (seen && word && a.needs && a.active) bookWrite(id, 'want', BOOK_WANT(word), false);
    const known = typeof tellKnown === 'function' ? tellKnown(id) : null;
    if (known && BOOK_TELLS[known]) bookWrite(id, 'tell', BOOK_TELLS[known], false);
  }
}
// ---- what the paper reckons somebody collects, which is not the same as knowing ----
const BOOK_RUMOUR_WORDS = ['tools', 'furniture', 'jewelry', 'electronics', 'antiques', 'collectibles'];
function bookRumour(worldSeed, day, town) {
  if (!town) return null;
  const R = RNG(strHash('bookrum' + worldSeed + '_' + day + '_' + town.id));
  if (!R.chance(0.3)) return null;
  // the town's own faces if it has any (Dusty Flats lists none: the roster IS its room), never the crowd
  const pool = (town.rivals && town.rivals.length ? town.rivals : NPCS.map((n) => n.id)).filter((x) => x !== 'crowd');
  if (!pool.length) return null;
  const id = R.pick(pool.slice());
  const d = typeof rivalDef === 'function' ? rivalDef(id) : null;
  if (!d) return null;
  const word = R.pick(BOOK_RUMOUR_WORDS.slice());
  return { id, word, line: 'They say ' + shortRivalName(d) + ' has been buying nothing but ' + word + ' lately.' };
}
// and it only gets into your book if you actually read the paper
function bookReadPaper() {
  if (!G.today || G.demo) return null;
  const r = bookRumour(G.worldSeed, G.day, curTown());
  if (!r || G.today.bookRumourRead) return null;
  G.today.bookRumourRead = true;
  bookWrite(r.id, 'want', BOOK_WANT(r.word), true);
  return r;
}
// the one line the Ledger has room for: the surest thing you know about them
function bookLine(id) {
  const e = bookAll()[id];
  if (!e) return '';
  let best = null, bestSlot = null;
  for (const k of BOOK_SLOTS) if (e[k] && (!best || (e[k].conf || 1) > (best.conf || 1))) { best = e[k]; bestSlot = k; }
  if (!best) return '';
  const dots = '\u25cf'.repeat(Math.max(1, Math.min(3, best.conf || 1)));
  // 'wants the tools' and 'runs you up when you push him' are sentences already; only a tell needs saying
  return (bestSlot === 'tell' ? 'tell: ' : '') + best.t + ' ' + dots;
}

// ---- LAST LOOK: the one play at the wire (docs/AUCTION_SPEC.md, the Knock; 2026-09-22) ----
// One energy, once a sale, and only while the gavel is counting. It buys one true sentence about the man
// who is leading - where the price sits against the number he walked in with, in words - and a beat and a
// half of held count to do something about it. Then the count carries on exactly where it was: a play, not
// a pause button. The room can still take the door off you while you are admiring what you learned.
const LASTLOOK_COST = 1, LASTLOOK_HOLD = 1.6;
const LASTLOOK_BANDS = [
  [0.98, '{name} is at the end of it. One more and they are out.', 'sweat'],
  [0.85, '{name} is close to whatever number they came in with.', 'sweat'],
  [0.65, '{name} has a little left and does not love spending it.', 'pride'],
  [0, '{name} has plenty left. They would go again twice over.', 'glare'],
];
function lastLookReady(au) {
  return !!au && !au.done && !au.lastLook && !!au.closing && !!au.leader && au.leader !== 'you' && !au.dutch && !au.sealed;
}
// what the price says about the man leading it - and what an act can still hide
function lastLookRead(au, a) {
  const cap = Math.max(1, a.cap || 0);
  let r = (au.bid || 0) / cap;
  // a face that is performing reads a band the wrong way, unless you have learned him or looked at him
  const fooled = a.tellMode && a.tellMode !== 'honest' && !lookKnows(au, a.def.id) && tellKnown(a.def.id) !== 'act';
  if (fooled) r = r >= 0.85 ? 0.5 : Math.min(1.2, r + 0.4);
  for (const [at, text, react] of LASTLOOK_BANDS) if (r >= at) return { text: text.replace(/\{name\}/g, shortRivalName(a.def)), react, fooled };
  return { text: shortRivalName(a.def) + ' gives you nothing at all.', react: 'glare', fooled };
}
// from the back you cannot see his face, so you read the room: is anybody else going to answer that?
function lastLookRoom(au) {
  const others = au.npcs.filter((n) => n !== au.leader && n.active && !n.folded && !n.crowd && (n.cap || 0) > (au.bid || 0));
  return others.length
    ? { text: 'Somebody back here is still holding a paddle. That number is not the end of it.', react: null }
    : { text: 'Nobody in here is going to answer that. It is between you and the gavel.', react: null };
}
function takeLastLook() {
  const au = G.auction;
  if (!lastLookReady(au)) { play('denied'); return false; }
  if (G.daylight < LASTLOOK_COST) { play('denied'); toast('Nothing left in you for one more look.', PAL.red); return false; }
  G.daylight -= LASTLOOK_COST; sunCheck();
  au.lastLook = true;
  // the crowd has no face to read, and from the back you cannot see the one there is: either way you read
  // the ROOM instead - whether anybody else in here is going to answer that number
  const blind = quietHidden(au) || !!au.leader.crowd || !au.leader.def;
  const read = blind ? lastLookRoom(au) : lastLookRead(au, au.leader);
  if (read.react && !blind) setReact(au.leader.def.id, read.react);
  au.lookHold = LASTLOOK_HOLD;                    // the count holds its breath while you decide
  play('ui_click', 0.5);
  qLine(read.text, PAL.lblue);
  bump('lastLooks');
  return true;
}

// ---- THE LOOK: one look a door, and where you stand decides what it shows you ----
// (docs/AUCTION_SPEC.md slice 1, 2026-09-22.) The postures were three ways to be SEEN; this is the half
// that was missing - three ways to SEE. It costs energy, it happens before the first bid, and it can be
// wrong, like every other thing in this game that tells you something.
const LOOK_COST = { steady: 2, loud: 2, quiet: 1 };
const LOOK_RIGHT = { loud: 0.85, steady: 0.62, quiet: 0.6 };      // how often it is true, by where you stood
const LOOK_KIND = { loud: 'unit', steady: 'face', quiet: 'field' };
const LOOK_UNIT_TRUE = [
  'That cabinet at the back is not particle board.',
  'Water line up the left wall. Something got wet in here, once.',
  'The boxes at the back are labelled, and labelled the same. Somebody packed this one on purpose.',
  'There is a tool chest in the shadow with a real name on it.',
  'Everything at the back is wrapped. Wrapped is somebody who meant to come back.',
];
const LOOK_UNIT_FALSE = [
  'Looks like a clean household unit. Nothing in the dark worth the walk.',
  'Somebody has been in here before the lock went on. It is picked over.',
  'It is all flat pack and bin bags past the front row.',
];
const LOOK_FIELD_WORDS = ['Nobody in here', 'One of them', 'Two of them', 'Three of them', 'Four of them', 'Five of them', 'Half the room'];
function lookField(n) {
  const w = LOOK_FIELD_WORDS[Math.max(0, Math.min(LOOK_FIELD_WORDS.length - 1, n))];
  return n <= 0 ? 'Nobody in here means it. You are bidding against the room\'s manners.'
    : w + ' mean' + (n === 1 ? 's' : '') + ' it. This will not be cheap.';
}
// the one worth naming: whoever wants this door most, or - for a false read - somebody who does not
function lookFace(au, R, right) {
  const live = au.npcs.filter((a) => a.active && !a.crowd && a.def);
  if (!live.length) return null;
  const keen = live.filter((a) => a.needs), idle = live.filter((a) => !a.needs);
  const pick = right ? (keen.length ? R.pick(keen) : R.pick(live)) : (idle.length ? R.pick(idle) : R.pick(live));
  const nm = shortRivalName(pick.def);
  const wants = right ? !!pick.needs : !pick.needs;                // what the note CLAIMS, true or not
  return { id: pick.def.id, text: wants
    ? nm + ' came for this one. Watch what they do when it gets to the money.'
    : nm + ' looked once and stopped looking. They are here out of habit.' };
}
// You can look for as long as you have not put your own hand up. The room opening the bidding does not
// close it - it is your first raise that does, because from then on you are in it and looking at nothing
// (2026-09-22: the first cut closed the window at the room's first bid and it was gone in two seconds).
function lookReady(au) {
  return !!au && !au.done && !au.look && !au.dutch && !au.sealed && !au.closing && !(au.pbids > 0) && !au.runUp;
}
// what a look costs where you are standing now
function lookCost(au) { return LOOK_COST[(au && au.posture) || 'steady'] || 2; }
function takeLook() {
  const au = G.auction;
  if (!lookReady(au)) { play('denied'); return false; }
  const posture = au.posture || 'steady';
  const cost = lookCost(au);
  if (G.daylight < cost) { play('denied'); toast('Not enough energy left to look properly.', PAL.red); return false; }
  G.daylight -= cost; sunCheck();
  const R = RNG(strHash('look_' + G.worldSeed + '_' + G.day + '_' + (G.cur ? G.cur.num : 0)));
  // tired eyes are worse eyes (the spec's own note): a long day costs you a step of reliability
  const right = R.chance((LOOK_RIGHT[posture] || 0.6) - (G.daylight < 20 ? 0.12 : 0));
  const kind = LOOK_KIND[posture] || 'face';
  let note = null;
  if (kind === 'unit') {
    note = { kind, right, text: R.pick(right ? LOOK_UNIT_TRUE : LOOK_UNIT_FALSE) };
    G.cur.lookTight = right ? 1 : -1;                    // the guess tightens - round the truth, or not
  } else if (kind === 'field') {
    const keen = au.npcs.filter((a) => a.active && !a.crowd && a.needs).length;
    const n = right ? keen : Math.max(0, keen + R.pick([-2, -1, 1, 2]));
    note = { kind, right, n, text: lookField(n) };
  } else {
    const f = lookFace(au, R, right);
    note = f ? { kind, right, id: f.id, text: f.text } : { kind, right, text: 'Nothing on any of them. They are all pretending, or none of them are.' };
  }
  au.look = note;
  pHeatAdd(au, PH.look);                             // a man taking a proper look is not a man in a hurry
  play('ui_click', 0.5);
  qLine('You take a proper look. ' + note.text, PAL.lblue);
  bump('looks');
  return true;
}
// a face you looked at reads honest for the rest of this sale: an act shows as an act
function lookKnows(au, id) { return !!(au && au.look && au.look.right && au.look.kind === 'face' && au.look.id === id); }

function setPosture(p, atDoor) {
  const au = G.auction;
  if (!au || au.done || !POSTURES[p] || au.posture === p) return false;
  if (!atDoor && au.postureSwitched) return false;
  const cost = POSTURES[p].cost;
  if (G.daylight < cost) { play('denied'); toast('Not enough energy for that.', PAL.red); return false; }
  if (!atDoor) au.postureSwitched = true;
  if (cost) { G.daylight -= cost; sunCheck(); }
  au.posture = p;
  if (p !== 'quiet') au.quietLeft = 0;
  if (p === 'loud') {
    if (G.today) G.today.markedMoney = true;
    pHeatAdd(au, PH.join_loud);
    bump('loudSales');
    qLine('You stand up, and you stay standing. The whole yard can hear your paddle.', PAL.cyan);
  } else if (p === 'quiet') {
    // no more sitting out (that was the old QUIET): you bid from the start, from the back. Hidden only if you
    // have not bid yet - go quiet after the room has watched you raise and they know perfectly well where you went.
    au.quietLeft = 0; au.quietSat = 0; au.quietT = 0;
    au.anon = !(au.pbids > 0); au.anonRevealed = false;
    bump('quietSales');
    qLine(au.anon ? 'You take a seat at the back. From here you are a paddle, not a face.'
      : 'You sit down at the back. They saw you bid; they know where you went. But the room relaxes.', PAL.cyan);
    for (const a of au.npcs) {
      if (!a.active || a.crowd || a.folded) continue;
      a.cap = Math.min(a.budgetCap || Infinity, Math.round(a.cap * 0.9));   // nobody pushing: they relax
      if (a.tellMode === 'bluff') a.tellMode = 'honest';                    // nobody to perform for
    }
  } else qLine('You settle back into the usual.', PAL.cyan);
  return true;
}
function openPostureMenu() {
  const au = G.auction;
  if (!au || au.done || au.postureSwitched) return;
  closeMoveMenu();
  au.postureOpen = true; au.roomHeld = true;
}
// QUIET: while you sit, the room carries on without you — a breath, then a turn of the room; if nobody
// moves, the count starts on whoever leads, and the count is where you may come back in
function quietTick(a, dt) {
  if (!(a.quietLeft > 0) || a.done || a.closing || a.roomHeld) return false;
  a.quietT = (a.quietT || 0) + dt;
  if (a.quietT < RAISE_PACE) return true;
  a.quietT = 0;
  const b0 = a.bid;
  resolveNpcs(1);
  if (a.leader === null && a.bid === 0) {
    a.quietLeft = 0;
    qLine('Nobody opens it. The gavel looks at you after all.', PAL.gray);
    return true;
  }
  if (a.bid === b0 && a.leader && a.leader !== 'you' && !a.done) {
    a.quietLeft = 0;
    a.closing = 1; a.closingT = 0; a.closingRollPlayed = false;
    qLine('Going once...', PAL.yellow, 'once');
  }
  return true;
}
// down to you and one face, and they turn round to see who the paddle at the back is
function quietRevealDue(au) {
  if (!quietHidden(au) || au.done || !(au.pbids > 0)) return null;
  const left = au.npcs.filter((n) => n.active && !n.crowd && !n.folded && !(au.shownFolded && au.shownFolded[n.def.id]));
  return left.length === 1 ? left[0] : null;
}
function quietReveal(au) {
  const t = quietRevealDue(au);
  if (!t) return false;
  au.anonRevealed = true;
  bump('comebacks');
  const id = t.def.id, nm = shortRivalName(t.def);
  qLine('"And look who it is at the back!"', PAL.orange);
  speak(['auc_react_back']);
  roomFlinch(au, 'you', false);
  const sore = standingOf(id) <= -2, warm = typeof warmOn === 'function' && warmOn(id);
  let text, react;
  if (sore) {
    t.cap = Math.min(t.budgetCap || Infinity, Math.round(Math.max(t.cap, au.bid) * QUIET_SPITE));
    text = nm + ' turns round and sees who it is. Now it is personal.'; react = 'glare';
  } else if (warm) {
    t.cap = Math.min(t.cap, au.bid);
    text = nm + ' sees it is you, tips a hat, and lowers the paddle.'; react = 'warm';
  } else { text = nm + ' turns round to look. So it was you.'; react = 'glare'; }
  // and if you were the one pushing them, they know that now too
  const pushed = (au.runUp && au.runUp.id === id) || (au.runUpEnded && au.runUpEnded.id === id);
  if (pushed) { standingBump(id, -1); text += ' And it was you pushing.'; }
  setReact(id, react);
  au.queue.push({ text, col: sore ? PAL.lred : (warm ? PAL.green : PAL.gray), sfx: 'aside', npcId: id, react, showBid: au.bid, showLeader: leaderLabel() });
  return true;
}
function quietComeback(au, R) {
  bump('comebacks');
  qLine('"And look who is still here!"', PAL.orange);
  speak(['auc_react_back']);
  roomFlinch(au, 'you', false);
  const room = au.npcs.filter((a) => a.active && !a.crowd && !a.folded && !a.def.phone);
  const sus = R.shuf(room).slice(0, 2);
  for (const a of sus) {
    a.pressLeft = (a.pressLeft || 0) + 1;
    au.queue.push({ text: shortRivalName(a.def) + ' narrows their eyes. Suspicious now.', col: PAL.gray, sfx: 'aside', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
  }
  const soft = room.filter((a) => !sus.includes(a) && a.cap <= au.bid * 1.25).sort((x, y) => x.cap - y.cap)[0];
  if (soft) {
    soft.folded = true;
    const nm = shortRivalName(soft.def);
    au.queue.push({ text: nm + ' thought it was over. ' + nm + ' is out.', col: PAL.dgray, sfx: 'fold', npcId: soft.def.id, showBid: au.bid, showLeader: leaderLabel() });
  }
}
// ---- the sniper: three sales running where every bid you made was in the count ----
const SNIPE_HATERS = ['sal', 'dutch', 'bart', 'dex'];                  // they take it personally
const SNIPE_FOLDERS = ['ed', 'tuck', 'priscilla', 'vera', 'ilse'];      // they saw it coming, and step back anyway
function sniperNow() { return ((G.world && G.world.rivalMem && G.world.rivalMem.sniperUntil) || 0) >= G.day; }
function noteSnipe(au) {
  if (!(au.pbids > 0)) return;
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  if (au.pbidsInCount === au.pbids) {
    mem.snipeRun = (mem.snipeRun || 0) + 1;
    if (mem.snipeRun >= 3) {
      if (!sniperNow()) recordEvent('sniper', { unit: G.cur.num });
      mem.sniperUntil = G.day + 7;
    }
  } else mem.snipeRun = 0;
}
// Sal says it out loud on a day he is reading you
function sniperCall(au) {
  if (!au || !sniperNow() || !G.dayStats || G.dayStats.saidSniper) return;
  if (!(G.today && G.today.facts && G.today.facts.readDay)) return;
  if (!au.npcs.some((a) => a.active && a.def.id === 'sal')) return;
  G.dayStats.saidSniper = true;
  qLine('"Watch the count, folks. This one only bids at the wire." Sal points at you.', PAL.red);
}
// ---- the row (docs/AUCTION_OVERHAUL_2.md step 1): the three doors sell in order ----
// Join the third door and the first two go under the hammer first, without you; whoever buys
// them pays out of today's wallet (rivalSpentToday) and comes to your door with less. A door
// the room will not open at its price stays on the row ('passed'). Authored doors (a story, a
// myth, a rare day, the opening's dealt doors) never sell without you: they wait.
const ORDER_WORDS = ['first', 'second', 'third'];
function rivalDef(id) { return NPCS.find((x) => x.id === id) || EXTRA_NPCS[id] || DUO_HALVES[id] || (id === 'phone' ? PHONE_DEF : (id === 'crowd' ? crowdDefFor(curTown()) : null)); }
function doorWaits(d) { return !!(d.story || d.seededLegend || d.provPlant || d.rare || d.opening || d.contract === 'mythHole'); }
// THE ROW IS WALKED IN ORDER (user, 2026-09-18: "should a player be able to start an auction on the 3rd locker
// when the 2nd or 1st hasn't sold yet? It doesn't seem to matter what you start with, even though it says up next.")
// It did not matter in the opening week, which is all anybody plays at first: every dealt door 'waits', so
// joining door three left one and two standing. Now only the door that is up can be joined. You can still LOOK
// INSIDE any of them — scouting the third while the first is up is the whole point — and the door that is up
// can be let go: it sells to the room without you, out of tonight's money (LET IT SELL, letItSell). A door that
// never sells without you (doorWaits) is not skipped past and lost: the clerk holds it to the end of the row.
function doorOpen(d) { return !d.won && !d.sold && !d.shut; }
function nextDoor() {
  const row = (G.today && G.today.lockers) || [];
  return row.find((d) => doorOpen(d) && !d.passed && !d.heldBack)   // in order
    || row.find((d) => doorOpen(d) && d.heldBack && !d.passed)      // then what the clerk held to the end
    || row.find((d) => doorOpen(d) && d.passed)                     // then what nobody bid on, still standing
    || null;
}
function doorIsUp(lk) { return !!lk && lk === nextDoor(); }
// the order words a door wears on the yard and at the peek
function doorQueueWord(lk) {
  if (doorIsUp(lk)) return 'UP NOW';
  if (lk.heldBack) return 'HELD TO THE END';
  if (lk.passed) return 'NOBODY BID. STILL HERE';
  return 'SELLS ' + (['1ST', '2ND', '3RD'][(G.today.lockers || []).indexOf(lk)] || 'LATER');
}
function letItSell(lk) {
  if (!doorIsUp(lk)) { play('denied'); return null; }
  const others = G.today.lockers.some((d) => d !== lk && doorOpen(d) && !d.passed);
  if (lk.passed || (lk.heldBack && !others)) {
    lk.shut = true;
    toast('Unit ' + lk.num + ' stays shut today. The clerk puts the file away.', PAL.gray);
  } else if (doorWaits(lk)) {
    if (others) { lk.heldBack = true; clerkSay('paperwork'); toast('"That one\'s got paperwork," says the clerk. Unit ' + lk.num + ' goes to the end of the row.', PAL.cyan); }
    else { lk.shut = true; clerkSay('shut'); toast('Unit ' + lk.num + ' stays shut today. The clerk puts the file away.', PAL.gray); }
  } else {
    const r = sellWithoutYou(lk);
    toast(r.passed ? 'Nobody bids on unit ' + lk.num + '. It stays on the row.'
      : 'Unit ' + lk.num + ' goes to ' + r.rival.name + ' for ' + fmt$(r.price) + ' while you wait by the van.', r.passed ? PAL.gray : PAL.white);
  }
  play('ui_click', 0.6);
  saveGame();
  return lk;
}
function doorsAhead(lk) {
  const row = (G.today && G.today.lockers) || [], i = row.indexOf(lk);
  return i < 0 ? [] : row.slice(0, i).filter((d) => doorOpen(d) && !d.passed && !doorWaits(d));
}
// the room settles a door among itself: the deepest number takes it a step past the second, never past its own
// ---- what you let go: the best plain thing a rival pulled from a door you did not take, on a postcard next morning ----
// Myths, fakes, set pieces and story payoffs never go on it (they belong to their own stories). 'lost': you bid and
// stopped; 'watched': you stood in the room and never bid; 'walked': it sold while you were somewhere else (only a
// door with something worth $150 in it earns a card).
function bestPlainItem(lk) {
  let best = null;
  const consider = (it) => { if (!it || it.cash || it.legendary || it.fakeEst || it.storyPayoff || it.set || !it.spr || !(it.val > 0)) return; if (!best || it.val > best.val) best = it; };
  for (const it of (lk && lk.items) || []) { consider(it); if (it.loot) for (const l of it.loot) consider(l); }
  return best;
}
function noteLetGo(lk, rivalId, price, how) {
  if (!lk || !rivalId || rivalId === 'crowd' || !G.world) return;
  const it = bestPlainItem(lk);
  if (!it) return;
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  mem.letGo = (mem.letGo || []).filter((e) => G.day - e.day <= 1 && !(e.day === G.day && e.unit === lk.num));
  mem.letGo.push({ day: G.day, town: G.world.town, unit: lk.num, rival: rivalId, price, how, name: it.name, spr: it.spr, pal: it.pal, cond: it.cond, uid: it.uid, val: it.val, doorValue: lk.value || 0 });
}
// the morning: yesterday's best letting-go, if there was one worth a card
function pickLetGo() {
  const mem = (G.world && G.world.rivalMem) || {};
  const c = (mem.letGo || []).filter((e) => e.day === G.day - 1 && (e.how !== 'walked' || e.val >= 150));
  if (!c.length) return null;
  const score = (e) => e.val * (e.how === 'walked' ? 0.6 : 1);
  c.sort((a, b) => score(b) - score(a));
  return Object.assign({ shown: false }, c[0]);
}
function letGoLines(c, nm) {
  const how = c.how === 'lost' ? 'You stopped bidding. ' + nm + ' paid ' + fmt$(c.price) + '.'
    : (c.how === 'watched' ? 'You stood there. ' + nm + ' took it for ' + fmt$(c.price) + '.' : 'You were not there. ' + nm + ' got it for ' + fmt$(c.price) + '.');
  const worth = Math.max(5, Math.round(c.val / 5) * 5);
  const good = c.doorValue >= c.price * 1.5, bad = c.doorValue < c.price * 0.8;
  return [{ t: how, c: '#3d3626' }, { t: 'Best thing in it: ' + c.name + ', about ' + fmt$(worth) + '.', c: '#2a2417', b: true },
    { t: good ? 'It was worth staying for.' : (bad ? 'Letting it go was the right call.' : 'About what it cost them.'), c: good ? '#7d2b3d' : (bad ? '#3d5a2a' : '#3d3626') }];
}
// a postcard over the yard: slides up, sits a few seconds, a click anywhere puts it down
function drawLetGo(c) {
  if (c.at == null) c.at = G.time;
  const t = G.time - c.at;
  if (t > 7) { c.shown = true; return; }
  const ease = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3), fade = t > 6.6 ? Math.max(0, (7 - t) / 0.4) : 1;
  g.globalAlpha = 0.55 * fade; px(g, 0, 0, W, H, '#08080e'); g.globalAlpha = fade;
  const mw = 560, mh = 236, mx = (W - mw) / 2, my = Math.round((H - mh) / 2 + (1 - ease) * 60);
  px(g, mx + 8, my + 10, mw, mh, 'rgba(0,0,0,0.45)');
  px(g, mx - 2, my - 2, mw + 4, mh + 4, '#2a2417');
  px(g, mx, my, mw, mh, '#e6dcc2');
  px(g, mx, my, mw, 3, '#f4ecd8'); px(g, mx, my, 3, mh, '#f4ecd8');
  px(g, mx, my + mh - 3, mw, 3, '#cfc3a4'); px(g, mx + mw - 3, my, 3, mh, '#cfc3a4');
  const def = rivalDef(c.rival), nm = def ? shortRivalName(def) : 'Somebody';
  T(mx + 18, my + 12, 'YESTERDAY  ·  UNIT ' + c.unit, '#7d2b3d', 18, 'left', true);
  // the stamp: what it went for
  px(g, mx + mw - 78, my + 10, 64, 44, '#7d2b3d'); px(g, mx + mw - 75, my + 13, 58, 38, '#e6dcc2');
  T(mx + mw - 46, my + 17, fmt$(c.price), '#7d2b3d', 13, 'center', true);
  T(mx + mw - 46, my + 34, 'SOLD', '#7d2b3d', 11, 'center');
  // the face that took it, pleased about it
  px(g, mx + 16, my + 44, 124, 124, '#2a2417');
  drawReaction(c.rival, 'win', mx + 18, my + 46, 120, 120, 'letgo_' + c.day + '_' + c.unit);
  T(mx + 78, my + 174, nm, '#2a2417', 13, 'center', true);
  // the thing
  const ix = mx + 152, iy = my + 44;
  px(g, ix, iy, 124, 124, '#d6caa9');
  if (c.spr) {
    try {
      const sp = getSprite(c.spr, c.pal || 'wood', c.cond || 'Clean', c.uid || 1);
      const sc = Math.max(1, Math.floor(Math.min(112 / sp.width, 112 / sp.height)));
      const dw = sp.width * sc, dh = sp.height * sc;
      g.drawImage(sp, ix + Math.round((124 - dw) / 2), iy + Math.round((124 - dh) / 2), dw, dh);
    } catch (e) { /* a sprite that will not draw leaves the frame empty */ }
  }
  let ty = my + 52;
  for (const l of letGoLines(c, nm)) { for (const ln of wrapText(l.t, 30)) { T(mx + 290, ty, ln, l.c, 14, 'left', !!l.b); ty += 18; } ty += 6; }
  T(mx + mw / 2, my + mh - 20, 'click to put it down', '#8a7d5c', 11, 'center');
  g.globalAlpha = 1;
  hot(0, 0, W, H, () => { c.shown = true; play('ui_click', 0.5); }, { label: 'put the postcard down' });
}
// ---- Channel 9 wants a word (the interview, day 15): a card over the yard, three answers, a week of being called it ----
function drawInterview() {
  if (G.today.interviewAt == null) G.today.interviewAt = G.time;
  const t = G.time - G.today.interviewAt, ease = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3);
  px(g, 0, 0, W, H, 'rgba(8,8,14,0.62)');
  hot(0, 0, W, H, () => {}, { label: 'the interview', focusable: false });   // nothing behind it answers while the camera is on
  const mw = 640, mh = 334, mx = (W - mw) / 2, my = Math.round((H - mh) / 2 + (1 - ease) * 50);
  px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.red);
  panel(mx, my, mw, mh, '#1d2030');
  px(g, mx, my, mw, 30, '#7d2b3d');
  T(mx + 14, my + 7, 'CHANNEL 9 ACTION NEWS', PAL.white, 15, 'left', true);
  if (Math.floor(G.time * 2) % 2 === 0) px(g, mx + mw - 66, my + 10, 10, 10, PAL.red);
  T(mx + mw - 50, my + 7, 'LIVE', PAL.white, 14, 'left', true);
  // Dana
  px(g, mx + 18, my + 46, 124, 124, PAL.ink);
  drawPortrait('reporter', mx + 20, my + 48, 120, 120);
  T(mx + 80, my + 178, REPORTER.name.toUpperCase(), PAL.white, 12, 'center', true);
  T(mx + 80, my + 194, 'Channel 9', PAL.gray, 11, 'center');
  const bx = mx + 190, bw = mw - 190 - 18;
  T(bx, my + 44, '"Folks at home want to know."', PAL.yellow, 16, 'left', true);
  T(bx, my + 66, '"What\'s your secret out here?"', PAL.yellow, 16, 'left', true);
  T(bx, my + 94, 'Whatever you say, the yard says it back to you all week.', PAL.gray, 12);
  for (let i = 0; i < INTERVIEW_ANSWERS.length; i++) {
    const a = INTERVIEW_ANSWERS[i], by = my + 120 + i * 68;
    button(bx, by, bw, 34, '"' + a.say + '"', () => interviewAnswer(a.name), { col: PAL[a.col], fs: 15 });
    T(bx + 4, by + 38, a.hint, PAL.gray, 11);
  }
}
// the ask: a face, a sentence, four positions. Every hint says what that answer costs, because the cost is the decision.
function drawFavour() {
  const f = favourLive(G.world);
  if (!f) { G.today.favour = false; return; }
  if (G.today.favourAt == null) G.today.favourAt = G.time;
  const t = G.time - G.today.favourAt, ease = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3);
  px(g, 0, 0, W, H, 'rgba(8,8,14,0.62)');
  hot(0, 0, W, H, () => {}, { label: 'the ask', focusable: false });
  const mw = 664, mh = 362, mx = (W - mw) / 2, my = Math.round((H - mh) / 2 + (1 - ease) * 50);
  px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.cyan);
  panel(mx, my, mw, mh, '#1d2030');
  px(g, mx, my, mw, 30, '#2f4a58');
  const def = rivalDef(f.who);
  T(mx + 14, my + 7, 'A WORD, AWAY FROM THE ROPE', PAL.white, 15, 'left', true);
  px(g, mx + 18, my + 46, 124, 124, PAL.ink);
  drawPortrait(f.who, mx + 20, my + 48, 120, 120);
  T(mx + 80, my + 178, String(def ? shortRivalName(def) : f.who).toUpperCase(), PAL.white, 12, 'center', true);
  T(mx + 80, my + 194, standingLabel(standingOf(f.who)), PAL.gray, 11, 'center');
  const bx = mx + 190, bw = mw - 190 - 18;
  const kind = FAVOUR_KINDS[f.kind];
  const askText = (f.kind === 'thing' && f.thingName) ? kind.ask.replace('something of mine, near enough', 'that ' + f.thingName + ' of yours') : kind.ask;
  const lines = wrapText('"' + askText + '"', 44).slice(0, 3);
  for (let i = 0; i < lines.length; i++) T(bx, my + 42 + i * 21, lines[i], PAL.yellow, 15, 'left', true);
  const yesLabel = String(kind.yes).replace('{NAME}', String(def ? shortRivalName(def) : f.who).toUpperCase());
  const rows = [
    { a: 'yes', label: yesLabel, hint: kind.yesHint, col: 'dgreen' },
    { a: 'maybe', label: FAVOUR_MAYBE, hint: FAVOUR_MAYBE_HINT, col: 'slate' },
    { a: 'no', label: FAVOUR_NO, hint: FAVOUR_NO_HINT, col: 'navy' },
    { a: 'nasty', label: kind.nasty, hint: kind.nastyHint, col: 'red' },
  ];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], by = my + 120 + i * 58;
    button(bx, by, bw, 30, r.label, () => favourAnswer(r.a), { col: PAL[r.col], fs: 14 });
    T(bx + 4, by + 34, r.hint, PAL.gray, 11);
  }
}
// ---- the clerk's warning (day 6): a card at the office window, one thing to know about Big Bart ----
function drawClerkWarn() {
  drawClerkCard('clerkWarnAt', [
    { t: '"Word to the wise."', c: PAL.yellow, s: 15, b: true },
    { t: '"Big Bart\'s been asking about your number. What you buy. What you pay."', c: PAL.yellow, s: 15 },
    { t: '"Bart doesn\'t ask about people. He asks about money he\'s short of."', c: PAL.yellow, s: 15 },
    { t: 'For a few days Bart will be at your doors, sizing you up.', c: PAL.gray, s: 12 },
  ], clerkWarnSeen, 'warn_bart');
}
// the clerk's other warning (2026-09-19): you have been running people up all week
function drawPushWarn() {
  const n = G.today.pushWarnN || PUSH_WARN_AT;
  drawClerkCard('pushWarnAt', [
    { t: '"A word, before you go out there."', c: PAL.yellow, s: 15, b: true },
    { t: '"You\'ve run people up ' + n + ' times this week. They\'ve noticed. So have I."', c: PAL.yellow, s: 15 },
    { t: '"Folks stop coming to a yard where the price is a game. Do it again this week and it goes on your account."', c: PAL.yellow, s: 15 },
    { t: 'For a week, every push costs ' + fmt$(PUSH_FEE) + ' at the office, and the clerk thinks less of you for it.', c: PAL.gray, s: 12 },
  ], pushWarnSeen, 'warn_push');
}
// ---- THE CLERK, OUT LOUD (user, 2026-09-20: "do the clerk voice") ----
// He ran the office for the whole game as text. These are the moments he actually says something to you,
// and every one of them recurs, which is what makes a take worth recording. Two rules hold the bank
// together: **no line carries a number or a unit number** — the screen shows those, so one take fits every
// time it happens, the same discipline the answering machine was written to — and he is `kind: 'line'`, so
// he never fights the gavel. A slot with no file is silence; nothing waits on him.
// every moment he speaks, in the order a career meets them. Declared as a list, like every other bank, so
// the asset sheet, the dev room's VOICES page and the tests all read the same twelve names.
const CLERK_VO = ['clerk_window', 'clerk_ask', 'clerk_whole', 'clerk_word', 'clerk_coffee', 'clerk_swap',
  'clerk_minute', 'clerk_unit', 'clerk_paperwork', 'clerk_shut', 'clerk_warn_bart', 'clerk_warn_push'];
function clerkSay(slot) {
  if (typeof speak !== 'function') return;
  speak(['clerk_' + slot], false, { kind: 'line', cooldown: 0 });
}
// ---- the raccoon, who talks (docs/RACCOON.md; user, 2026-09-21) ----
// "I want the raccoon to have a voice, and I'm gonna make it sound really deep and smart or something...
// he doesn't maybe have to speak right away. Maybe if a player clicks on him."
//
// He is already in the game four times over and has never made a sound: living in a unit (the rare
// story, LEAVE IT is the only button), in your garage overnight taking one small thing and leaving a
// tiny vest, on the office roof once the yard is yours, and in the ending with an offer in on the place.
// So: he is silent until he is CLICKED, one line a visit, and nothing he says is ever a hint - if a line
// ever tells you what is in the unit, it is wrong. One slot per line, the way the answering machine
// does it, so the words on screen are the words in the file and a take can never land under the wrong
// line. No line carries a number or a name, so one take fits every door, every town, every day.
const RAC_LINES = {
  // The first click of a career - he has been in four places and never made a sound
  rac_first_01: "Ah. You can see me. That happens about once a season.",
  rac_first_02: "Most people look straight past. You looked. I'll allow it.",
  rac_first_03: "Yes. I live here. No, there is no paperwork.",
  // In the unit, clicked
  rac_unit_01: "You are not the first to open this door. You are the first to look up.",
  rac_unit_02: "Everything in this room was once somebody's good idea.",
  rac_unit_03: "Storage is the word people use when they mean 'later'.",
  rac_unit_04: "A box is a promise to a future self. Most of them default.",
  rac_unit_05: "You have bought a room full of postponements.",
  rac_unit_06: "I don't own it. I live in it. Legally that is the weaker claim, and yet.",
  rac_unit_07: "Nothing in here is lost. It is merely stored, which is worse.",
  rac_unit_08: "You call it junk because it stopped being useful to you.",
  rac_unit_09: "I have read every label in this unit. They are lies of scale.",
  rac_unit_10: "People rent these to avoid a decision. You have just bought the decision.",
  rac_unit_11: "That is not a stain. That is a summer.",
  rac_unit_12: "Take whatever you like. Leave the insulation.",
  rac_unit_13: "Your flashlight is unnecessary. I know what is in here by weight.",
  rac_unit_14: "Do not move the couch. I have a system.",
  rac_unit_15: "I was here before the padlock. I will be here after the sale.",
  rac_unit_16: "I am not a pest. I am a tenant with an unconventional lease.",
  // Clicked again, same visit
  rac_again_01: "Yes. Still here.",
  rac_again_02: "Clicking me will not lower the price.",
  rac_again_03: "We are both waiting for you to decide.",
  rac_again_04: "I have nothing further. That is rare, for me.",
  rac_again_05: "You are enjoying this more than I am, and I am the one who lives here.",
  // You leave the unit to him
  rac_leave_01: "A sound decision. Possibly your first today.",
  rac_leave_02: "The door comes down. The evening resumes.",
  rac_leave_03: "I'll tell the others you were reasonable.",
  rac_leave_04: "Go well. Do not think about this room at two in the morning.",
  // The tiny vest, clicked - the morning after he has been in your garage
  rac_stash_01: "You left it out. I assumed it was a gift.",
  rac_stash_02: "The vest is a fair trade. It fits me and it did not fit you.",
  rac_stash_03: "Your latch is an opinion, not a mechanism.",
  rac_stash_04: "Consider it storage. I am holding it for you.",
  // On the office roof, once the yard is yours
  rac_roof_01: "Congratulations. You now own the building I sleep on.",
  rac_roof_02: "A landlord at last. It suits you less than you hoped.",
  rac_roof_03: "We are colleagues now. Do not make it strange.",
  rac_roof_04: "I have watched four people buy this yard. You are the quiet one.",
  // Rare, in place of an ordinary line in the unit
  rac_rare_01: "I have seen inside the unit next to this one. You should bid on it.",
  rac_rare_02: "One day you will store something here, and I will look after it.",
  rac_rare_03: "There is a man who comes at night and takes nothing. I have not worked him out either.",
};
const RAC_VO = Object.keys(RAC_LINES);
const RAC_RARE = 0.09;                 // now and then, in the unit, he says one of the three
function racPick(bank) {
  const keys = RAC_VO.filter((k) => k.indexOf(bank + '_') === 0);
  return keys.length ? keys[(Math.random() * keys.length) | 0] : null;
}
// one line, said out loud if the take is recorded and always shown as he says it
function racSay(bank) {
  const w = G.world;
  if (w && !w.racMet) { w.racMet = true; bank = 'rac_first'; }          // the first click of a career is the joke
  else if (bank === 'rac_unit' && Math.random() < RAC_RARE) bank = 'rac_rare';
  const key = racPick(bank);
  if (!key) return null;
  if (typeof speak === 'function') speak([key], false, { kind: 'line', cooldown: 0 });
  toast(RAC_LINES[key], PAL.lblue, 4.6, 'raccoon');
  return key;
}
function drawClerkCard(atKey, lines, onDone, voice) {
  if (G.today[atKey] == null) { G.today[atKey] = G.time; if (voice) clerkSay(voice); }   // he starts talking as the card lands
  const t = G.time - G.today[atKey], ease = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3);
  px(g, 0, 0, W, H, 'rgba(8,8,14,0.62)');
  hot(0, 0, W, H, () => {}, { label: 'the clerk', focusable: false });           // the yard waits while he talks
  const mw = 600, mh = 250, mx = (W - mw) / 2, my = Math.round((H - mh) / 2 + (1 - ease) * 50);
  px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.yellow);
  panel(mx, my, mw, mh, '#22252f');
  px(g, mx, my, mw, 28, '#3a3f58');
  T(mx + 14, my + 6, 'THE OFFICE WINDOW', PAL.white, 15, 'left', true);
  px(g, mx + 18, my + 42, 124, 124, PAL.ink);
  drawPortrait('clerk', mx + 20, my + 44, 120, 120);
  T(mx + 80, my + 174, 'THE CLERK', PAL.white, 12, 'center', true);
  // measured, not counted (wrapText guesses in a proportional font)
  let ly = my + 44;
  for (const l of lines) { for (const ln of wrapPx(l.t, mw - 180, l.s, !!l.b)) { T(mx + 162, ly, ln, l.c, l.s, 'left', !!l.b); ly += l.s + 5; } ly += 4; }
  button(mx + mw - 150, my + mh - 46, 132, 32, 'NOTED', () => onDone(), { col: PAL.slate, fs: 15 });
}
// ---- mid-sale interruptions (docs/AUCTION_OVERHAUL_2.md section 6; built 2026-09-15) ----
// Rare and seeded (interruptPick: 6% of sales from day 4, own dice per door and day), at most one a day and three days
// apart, never on an opening day, a door with a story of its own, or a sale that already has a story pop in it:
//   late    at the first "going once", a face that stayed out comes through the gate and bids once if the number allows
//   phone   at the same moment Buzz takes a bid on his line: PHONE_DEF takes a seat in the face row
//   power   at the third paddle the lights go out: the count, the log and the tells wait POWER_SECS, and every number
//           in the room is read again a little differently (x0.85 to x1.15, on its own dice)
//   pulled  before the first bid the tenant pays up at the window: the door is off the row, the walk over refunded
// Each lands in the paper the next morning (event `interruption`). Never in a demo world (noArcs).
const INTERRUPT_CHANCE = 0.06, INTERRUPT_GAP = 3, INTERRUPT_FROM = 4, POWER_SECS = 4.5;
const INTERRUPT_KINDS = [['late', 3], ['phone', 2], ['power', 2], ['pulled', 1]];
function interruptPick(lk, day) {
  const w = G.world, d = day == null ? G.day : day;
  if (!w || w.noArcs || G.demo || !lk || d < INTERRUPT_FROM) return null;
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], d)) return null;
  if (lk.reason || lk.story || lk.rare || lk.opening || lk.tenantDoor || lk.edNotebook || lk.seededLegend || lk.pulled || lk.format) return null;
  const R = RNG(strHash('interrupt_' + G.worldSeed + '_' + d + '_' + lk.num));
  if (!R.chance(INTERRUPT_CHANCE)) return null;
  return R.wpick(INTERRUPT_KINDS);
}
function interruptArm(au, kind) {
  if (!au || !kind || !G.cur) return false;
  if (kind === 'late') {
    const c = au.npcs.filter((n) => !n.crowd && !n.active && !n.broke && !n.partner && !n.def.splitFrom && (n.budgetCap || 0) >= (G.cur.minBid || 0) * 2);
    if (!c.length) kind = 'phone';
    else {
      const unspent = c.filter((n) => !n.spentToday);
      const pick = RNG(strHash('late_' + G.worldSeed + '_' + G.day + '_' + G.cur.num)).pick(unspent.length ? unspent : c);
      au.interrupt = { kind, id: pick.def.id, fired: false };
    }
  }
  if (kind === 'phone' || kind === 'power') au.interrupt = { kind, fired: false };
  G.today.interrupted = kind; G.world.lastInterruptDay = G.day;
  if (kind === 'pulled') { au.interrupt = { kind, fired: true }; interruptPulled(au); }
  return true;
}
// "Going once—" "WAIT." (pumpQueue, the first count)
function interruptArrive(au) {
  const it = au.interrupt;
  if (!it || it.fired) return;
  it.fired = true;
  let a, text, caption;
  if (it.kind === 'late') {
    a = au.npcs.find((n) => n.def.id === it.id);
    if (!a) return;
    a.active = true; a.folded = false; a.late = true; a.lateBid = true;
    a.tellMode = a.tellMode || 'silent'; a.toldTell = a.toldTell || {};
    text = a.def.name + ' comes through the gate at a run, paddle already up. ' + (a.spentToday ? 'Late.' : 'Late, and not a dollar spent today.');
    caption = shortRivalName(a.def).toUpperCase() + (a.def.id === 'duo' ? ' ARE LATE' : ' IS LATE');
  } else {
    const R = RNG(strHash('phone_' + G.worldSeed + '_' + G.day + '_' + G.cur.num));
    const budget = Math.round(PHONE_DEF.budget * (curTown().priceMult || 1));
    const est = (G.cur.value || 0) * R.r(PHONE_DEF.noise[0], PHONE_DEF.noise[1]);
    a = { def: PHONE_DEF, est, cap: Math.min(budget, Math.round(est * PHONE_DEF.capMult)), spiteCap: 0, budgetCap: budget, pressLeft: 0, stance: null,
      spentToday: 0, broke: false, active: true, folded: false, tellMode: 'silent', toldTell: {}, lateBid: true };
    const ci = au.npcs.findIndex((n) => n.crowd);
    au.npcs.splice(ci < 0 ? au.npcs.length : ci, 0, a);
    text = 'A phone rings behind the podium. Buzz picks it up, listens, and holds up a finger. "Folks, I have a bid on the phone."';
    caption = 'A BID ON THE PHONE';
  }
  au.queue.push({ text, col: PAL.orange, sfx: 'aside', npcId: a.def.id, react: 'bid', pop: { kind: 'arc', caption }, showBid: au.bid, showLeader: leaderLabel() });
  roomEvent('enter', a.def.name + ' is in, late.');
  recordEvent('interruption', { unit: G.cur.num, kind: it.kind, rival: a.def.id });
}
// the third paddle (pumpQueue): the lights go out
function interruptPower(au) {
  const it = au.interrupt;
  if (!it || it.fired) return;
  it.fired = true;
  au.queue.unshift({ text: 'The lights go out. The whole row. Somebody drops a paddle. Buzz, into the dark: "Nobody move."', col: PAL.orange, sfx: 'aside', showBid: au.bid, showLeader: leaderLabel(),
    then: () => { au.darkUntil = G.time + POWER_SECS; } });
  for (const n of au.npcs) {                   // in the dark, everybody reads the door again
    if (n.crowd || !n.active) continue;
    const Rn = RNG(strHash('dark_' + G.worldSeed + '_' + G.day + '_' + G.cur.num + '_' + n.def.id));
    n.cap = Math.max(0, Math.min(n.budgetCap || Infinity, Math.round(n.cap * Rn.r(0.85, 1.15))));
  }
  recordEvent('interruption', { unit: G.cur.num, kind: 'power' });
}
// before the first bid (interruptArm): the door is off the row
function interruptPulled(au) {
  const lk = G.cur;
  au.queue.length = 0;
  au.queue.push({ text: 'Before the first bid, the manager walks out waving a receipt. The tenant of unit ' + lk.num + ' paid up at the window this morning, mostly in coins. The door is off the row.', col: PAL.orange, sfx: 'aside', showBid: 0, showLeader: null });
  au.done = true; au.leader = null; au.bid = 0;     // nobody's paddle counts on a door that was never for sale
  lk.pulled = true; lk.passed = true;
  G.daylight += 5;                                 // the walk over is on the office
  recordEvent('interruption', { unit: lk.num, kind: 'pulled' });
}
// ---- the Dutch clock (docs/AUCTION_OVERHAUL.md 11 and the second pass's step 7: the first format; built 2026-09-15) ----
// Once a week from day 8 (formatDayFor: a seeded day in each week), one ordinary door on the row sells on a clock, and
// Rapid Ray comes up from Bent Fork to call it (his pace; Buzz's recorded bank, as every gavel). The price starts high
// (four times the opening, or 1.6 times what the door shows, to the step) and drops about DUTCH_STEPS steps to the
// opening, DUTCH_TICK apart. Nobody raises: every face in the room has one number it will shout at (dutchAt: its own
// number times a nerve of 0.78 to 1, on its own dice; the crowd shouts at its number), and the first price at or under the
// deepest of them is theirs. SHOUT takes it at the price on the clock; LET IT GO runs the clock out without you. Honest faces
// lean in as it nears their number (wants it, then sweating), an act leans in early, a silent face shows nothing. After the
// hammer the cards on the table say what every face was waiting for. Posture, SAY SOMETHING and the moves wait; story beats
// and interruptions leave the door alone. The paper has who shouted, and at what. Never in a demo world.
const DUTCH_FROM = 8, DUTCH_TICK = 0.85, DUTCH_STEPS = 14;
const FORMAT_ROTATION = ['dutch', 'phone', 'sealed', 'bulk'];      // one special format a week, turn and turn about
const DUTCH_WORDS = { col: PAL.cyan, tag: 'DUTCH CLOCK', sub: 'Rapid Ray starts high and comes down. First voice takes it.', railA: 'starts high, comes down', railB: 'first voice takes it',
  peek: 'Rapid Ray is calling this one on a clock: the price starts high and drops, and the first voice to shout takes it. Nobody raises. Nobody waits long.' };
// ---- the crate sale (IDEAS_TODO 3's bulk lot; built 2026-09-16) ----
// The other three formats change how the BIDDING works. This one changes what you WIN: a row of crates sold
// as one lot, where the van is the whole problem. Late game only, at the user's instruction - halfway through
// a career at the earliest, because early on it is not a decision, it is just stress. By then you have the
// van, the money and the confidence to want it.
// It does not merge the row's other doors into one (which would collapse a three-door morning and ripple
// through everything that counts on it). It swells ONE door with crates until its bulk is well past anything
// you can carry, so winning it means standing in a unit you own and choosing what to leave - which is where
// Pete's standing offer and a rented unit of your own both suddenly matter.
const BULK_FROM = 30, BULK_CRATES = [6, 10], BULK_INSIDE = [2, 4];
const BULK_FILL = ['box', 'boxSmall', 'records', 'cassettes', 'vhs', 'tire', 'toolbox', 'lamp', 'fan', 'china',
  'skis', 'comicBox', 'paper', 'teddy', 'barrel', 'suitcase', 'mattress', 'dvdStack'];
const BULK_WORDS = { col: PAL.orange, tag: 'THE CRATE SALE', sub: 'One lot, one price. All of it, or none of it.',
  railA: 'one lot, one price', railB: 'all of it, or none of it',
  peek: 'Buzz is selling this one as a single lot: every crate on the floor goes together, at one price, to one bidder. Nobody splits it and nobody picks. If you take it you are taking all of it, and the van is not going to be the answer.' };
function bulkArm(lk) {
  const R = dayR('bulk' + lk.num);
  const cols = lk.cols || 8;
  const n = R.i(BULK_CRATES[0], BULK_CRATES[1]);
  for (let i = 0; i < n; i++) {
    const c = makeItem(R.chance(0.65) ? 'crate' : 'boxLarge', R);
    c.layer = i < cols ? 2 : (i < cols * 2 ? 1 : 0);
    c.col = i % cols;
    c.wCols = Math.max(1, c.wCols || 1);
    c.loot = c.loot || [];
    const inside = R.i(BULK_INSIDE[0], BULK_INSIDE[1]);
    for (let j = 0; j < inside; j++) c.loot.push(makeItem(R.pick(BULK_FILL), R));
    lk.items.push(c);
  }
  let v = 0;
  for (const x of lk.items) { v += x.val || 0; if (x.loot) for (const l of x.loot) v += l.val || 0; }
  lk.value = v;
  lk.bulkLot = n;
  lk.bulkSize = lk.items.reduce((a, x) => a + (x.size || 0) + ((x.loot || []).reduce((b, l) => b + (l.size || 0), 0)), 0);
  // to the TOWN's step, not to 25: Chrome Springs bids in 200s and a lot has to open on a number the room can say
  const step = curTown().bidStep || 25;
  lk.minBid = Math.max(step, Math.round(v * 0.18 / step) * step);
  lk.flavor = 'The whole floor goes at once. Buzz is not counting the crates and neither is anybody else.';
}
// how far past the van a lot actually is, for the card and the room
function bulkOverVan(lk) {
  const cap = (typeof vanCapNow === 'function') ? vanCapNow() : (G.vanCap || 40);
  return Math.max(0, (lk.bulkSize || 0) - cap);
}

function formatDayFor(day) {
  const wk = Math.floor((day - 1) / 7);
  if (wk < 1) return null;
  return wk * 7 + 1 + RNG(strHash('formatDay_' + G.worldSeed + '_' + wk)).i(1, 6);
}
function formatKindFor(day) {
  const wk = Math.floor((day - 1) / 7);
  if (wk < 1) return null;
  const k = FORMAT_ROTATION[(wk - 1) % FORMAT_ROTATION.length];
  // the crate sale is late game only (user, 2026-09-16): before then the week takes the next format instead
  if (k === 'bulk' && day < BULK_FROM) return FORMAT_ROTATION[wk % FORMAT_ROTATION.length];
  return k;
}
function formatsArc(world) { const w = world || G.world; if (!w) return {}; w.arcs = w.arcs || {}; return (w.arcs.formats = w.arcs.formats || {}); }
// the morning (startDay, after the beats, before the door reasons): the week's clock door
function formatTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today || !G.today.lockers) return;
  const arc = formatsArc(w);
  if (arc.off || G.day < DUTCH_FROM || formatDayFor(G.day) !== G.day) return;
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day)) return;
  const doors = G.today.lockers.filter((lk) => !lk.won && !lk.sold && !lk.story && !lk.rare && !lk.opening && !lk.seededLegend && !lk.pair && !lk.tenantDoor && !lk.edNotebook && !lk.reason);
  if (!doors.length) return;
  const lk = dayR('formatDoor').pick(doors);
  lk.format = formatKindFor(G.day);
  if (lk.format === 'bulk') bulkArm(lk);        // the crate sale is decided here, not at the rope: it is what you win
  if (arc.day !== G.day) { arc.day = G.day; arc.say = lk.format; arc.unit = lk.num; }
}
function formatOfficeLine() {
  const arc = (G.world && G.world.arcs && G.world.arcs.formats) || null;
  if (!arc || !arc.say) return null;
  const kind = arc.say;
  arc.say = null;
  if (arc.day !== G.day) return null;
  if (kind === 'phone') return '"Somebody phoned a number in for unit ' + arc.unit + ' and left it on the book. Buzz answers for them. You will not get a look at who you are bidding against."';
  if (kind === 'sealed') return '"Unit ' + arc.unit + ' goes on slips today. One number each, written down, highest takes it, and a tie goes to the room. Write an odd number."';
  if (kind === 'bulk') return '"Unit ' + arc.unit + ' is a crate sale. The whole floor as one lot, one price, no picking. Measure your van before you put your hand up."';
  return G.world.town === 'bentFork' ? '"Rapid Ray is calling unit ' + arc.unit + ' on a clock today. Starts high, comes down, first voice takes it. Do not blink."'
    : '"Rapid Ray drove up from Bent Fork to call unit ' + arc.unit + ' on a clock. Starts high, comes down, first voice takes it. Do not blink."';
}
// startAuction: Ray takes the gavel, sets the clock, and every face in the room picks its number
function dutchArm(au) {
  const lk = G.cur, step = au.step || 25;
  const start = Math.ceil(Math.max((lk.minBid || 0) * 6, visibleValue(lk) * 2.2) / step) * step;   // well over the room: read off what the door shows, never off anybody's number
  const floor = lk.minBid || step;
  const tick = Math.max(step, Math.round((start - floor) / DUTCH_STEPS / step) * step);
  au.auc = AUCTIONEERS.ray;
  au.dutch = { start, floor, tick, price: start, started: false, t: 0, recorded: false };
  for (const a of au.npcs) {
    if (a.crowd) { a.dutchAt = a.cap; continue; }
    const Rn = RNG(strHash('dutch_' + G.worldSeed + '_' + G.day + '_' + lk.num + '_' + a.def.id));
    a.dutchAt = Math.floor(Math.min(a.budgetCap || Infinity, a.cap * Rn.r(0.78, 1)) / step) * step;
  }
  au.queue.push({ text: 'Rapid Ray Dunmore takes the gavel for this one. "My rules, folks. I start at ' + fmt$(start) + ' and I come down. First voice takes it. Nobody raises."', col: PAL.orange, sfx: 'aside', showBid: 0, showLeader: null });
}
// what a face shows as the clock comes down toward its number
function dutchTell(a, price) {
  const d = G.auction && G.auction.dutch;
  if (!d || !d.started || !a || a.crowd || a.dutchAt == null || !a.active || !a.tellMode || a.tellMode === 'silent') return 'cool';
  const r = price / Math.max(1, a.dutchAt);
  if (a.tellMode === 'honest') return r <= 1.1 ? 'sweat' : (r <= 1.3 ? 'warm' : 'cool');
  return (r > 1.3 && r <= 1.7) ? 'sweat' : 'cool';                 // an act leans in early
}
function dutchRecord(au, who, price, rival) {
  if (au.dutch.recorded) return;
  au.dutch.recorded = true;
  recordEvent('dutchClock', { unit: G.cur.num, who, price, rival: rival || null });
}
// pumpQueue, while the queue is quiet: one tick of the clock
function dutchTick(au, dt) {
  const d = au.dutch;
  d.t += dt;
  if (d.t < DUTCH_TICK) return;
  d.t = 0;
  if (!d.started) { d.started = true; au.shownBid = d.price; au.bidAt = G.time; return; }   // the first number is Ray's, not anybody's to take
  if (d.price - d.tick < d.floor) { dutchNoSale(au); return; }
  d.price -= d.tick;
  au.shownBid = d.price; au.bidAt = G.time;
  const ready = au.npcs.filter((n) => n.active && !n.folded && n.dutchAt != null && n.dutchAt >= d.price);
  if (ready.length) {
    ready.sort((x, y) => (y.dutchAt - x.dutchAt) || ((x.crowd ? 1 : 0) - (y.crowd ? 1 : 0)));
    dutchShout(au, ready[0]);
    return;
  }
  if (voIdle() && voEl('num_' + d.price)) speak(['num_' + d.price]);
}
function dutchShout(au, a) {
  const price = au.dutch.price;
  au.bid = price; au.leader = a; a.everLed = true; a.topRaise = price;
  const nm = a.crowd ? 'Somebody in the crowd' : shortRivalName(a.def);
  au.queue.push({ text: '"MINE!" ' + nm + (a.def.id === 'duo' ? ' shout at ' : ' shouts at ') + fmt$(price) + '.', col: PAL.orange, sfx: 'aside', npcId: a.def.id, react: 'bid', showBid: price, showLeader: leaderLabel() });
  dutchRecord(au, a.crowd ? 'crowd' : 'rival', price, a.crowd ? null : a.def.id);
  loseAuction();
}
function dutchPlayerShout() {
  const au = G.auction, d = au && au.dutch;
  if (!d || au.done || !d.started) return;
  if (d.price > bidCeiling()) { play('denied'); toast('Not with what is in your pocket.', PAL.red, 2); return; }
  au.bid = d.price; au.leader = 'you'; au.pbids = (au.pbids || 0) + 1;
  callBidCheck();
  play('bid_player');
  qLine('"MINE!" You shout it at ' + fmt$(d.price) + '.', PAL.cyan, 'shout', d.price);
  dutchRecord(au, 'you', d.price, null);
  soldToYou(au);
}
function dutchNoSale(au) {
  const d = au.dutch;
  au.shownBid = d.price;
  au.queue.push({ text: 'The clock hits ' + fmt$(d.price) + ' and nobody says a word. Rapid Ray shrugs. "Nobody? Then nobody." No sale.', col: PAL.gray, sfx: 'nosale', showBid: d.price, showLeader: null });
  au.done = true;
  dutchRecord(au, 'nobody', d.price, null);
}
// LET IT GO: the clock runs out without you, and the deepest number still takes it
function dutchWalk(au) {
  const d = au.dutch;
  qLine('You step back from the rope. The clock keeps coming down without you.', PAL.gray);
  const ready = au.npcs.filter((n) => n.active && !n.folded && n.dutchAt != null && n.dutchAt >= d.floor).sort((x, y) => (y.dutchAt - x.dutchAt) || ((x.crowd ? 1 : 0) - (y.crowd ? 1 : 0)));
  let p = d.started ? d.price : Math.max(d.floor, d.start - d.tick);   // nobody takes the first number
  d.started = true;
  const top = ready[0];
  while ((!top || p > top.dutchAt) && p - d.tick >= d.floor) p -= d.tick;
  d.price = p; au.shownBid = p;
  if (!top || p > top.dutchAt) { dutchNoSale(au); return; }
  dutchShout(au, top);
}
// ---- the absentee (the second format; built 2026-09-15) ----
// The formats take turns week by week (FORMAT_ROTATION): a Dutch clock one week, an absentee bid the next. On an absentee
// door somebody has left a number with the office: Buzz opens the sale on it (phoneArm) and answers for them all the way up.
// The phone is a face in the row with no face: it never hesitates (npcWants), never folds early, never flinches at a loud
// bid or a jump, has no tells, no spite and no pride, and raises by exactly one step. The only way past it is over its
// number, and nothing in the room tells you where that is until the cards are on the table. Never in a demo world.
const ABSENTEE_OPEN = [1.2, 1.6], ABSENTEE_CAP = [0.7, 1.1];
const PHONE_WORDS = { col: PAL.lblue, tag: 'ABSENTEE BID ON THE BOOK', sub: 'Somebody phoned a number in. Buzz answers for them.',
  railA: 'the phone answers', railB: 'every raise, no tells',
  peek: 'Somebody has left a number for this one with the office, and Buzz will answer for them. No face, no tells, and it does not get tired. You only find out what it was willing to pay when it stops.' };
// ---- the one-number round (the third format; built 2026-09-16) ----
// The formats take turns week by week (FORMAT_ROTATION): Rapid Ray's clock, then an absentee on the book, then this.
// Buzz sells this one on slips. Everybody writes ONE number and hands it in; nobody answers anybody, there are no
// raises and no count. Then he reads them out lowest first and the highest takes it at what they wrote, so the whole
// sale is the one guess you make before anything is read out. A tie goes to the room, which makes a round number a
// dangerous one. The faces show nothing while they write (no tells to read), the moves and the posture are away, and
// the cards at the end say what every slip said. Never in a demo world.
const SEALED_SPREAD = [0.82, 1.06];
const SEALED_WORDS = { col: PAL.green, tag: 'ONE NUMBER EACH', sub: 'Everybody writes one number. The highest takes it.',
  railA: 'one number, written down', railB: 'no raises, ties to the room',
  peek: 'Buzz is selling this one on slips: everybody writes a single number and hands it in, and he reads them out lowest first. The highest takes it at what they wrote. Nobody gets to answer anybody, and a tie goes to the room, so a round number is a dangerous one.' };
function sealedArm(au) {
  const lk = G.cur, step = au.step || 25;
  for (const a of au.npcs) {
    if (a.crowd) { a.sealedAt = Math.floor((a.cap || 0) / step) * step; continue; }
    const Rn = RNG(strHash('sealed_' + G.worldSeed + '_' + G.day + '_' + lk.num + '_' + a.def.id));
    a.sealedAt = Math.floor(Math.min(a.budgetCap || Infinity, a.cap * Rn.r(SEALED_SPREAD[0], SEALED_SPREAD[1])) / step) * step;
  }
  au.sealed = { mine: Math.max(lk.minBid || step, step), handed: false, read: false, recorded: false };
  au.queue.push({ text: 'Buzz comes down the row with a fistful of slips. "New way on this one, folks. One number each, written down. Hand it in and I read them out, lowest first. Highest takes it at what they wrote. Ties go to the room. Nobody raises, nobody gets a second look."', col: PAL.orange, sfx: 'aside', showBid: 0, showLeader: null });
}
// the bar: your number goes up and down before it is handed in, never past what you can pay
function sealedAdd(n) {
  const au = G.auction, sl = au && au.sealed;
  if (!sl || sl.handed || au.done) return;
  const step = au.step || 25, floor = G.cur.minBid || step;
  const want = sl.mine + n;
  if (want > bidCeiling()) { play('denied'); toast('Not with what is in your pocket.', PAL.red, 2); return; }
  sl.mine = Math.max(floor, want);
}
function sealedHandIn() {
  const au = G.auction, sl = au && au.sealed;
  if (!sl || sl.handed || au.done) return;
  const floor = G.cur.minBid || (au.step || 25);
  if (sl.mine < floor || sl.mine > bidCeiling()) { play('denied'); return; }
  sl.handed = true;
  au.pbids = (au.pbids || 0) + 1;
  callBidCheck();                               // a slip is a bid
  play('bid_player');
  qLine('You write ' + fmt$(sl.mine) + ', fold the slip once and hand it in.', PAL.cyan, 'pbid', sl.mine);
  sealedRead(au);
}
// NO NUMBER: the slip goes back empty, and the room still opens theirs
function sealedWalk(au) {
  au.sealed.handed = false;
  qLine('You hand the slip back with nothing written on it.', PAL.gray);
  sealedRead(au);
}
function sealedRecord(au, who, price, rival) {
  if (au.sealed.recorded) return;
  au.sealed.recorded = true;
  recordEvent('sealedBid', { unit: G.cur.num, who, price, rival: rival || null });
}
// Buzz opens them: lowest first, highest last, and that one is the sale
function sealedRead(au) {
  const sl = au.sealed, lk = G.cur, step = au.step || 25, floor = lk.minBid || step;
  sl.read = true;
  const slips = [];
  for (const a of au.npcs) {
    if (!a.active || a.folded || a.sealedAt == null || a.sealedAt < floor) continue;
    slips.push({ a, n: a.sealedAt });
  }
  if (sl.handed && sl.mine >= floor) slips.push({ a: 'you', n: sl.mine });
  if (!slips.length) {
    au.queue.push({ text: 'Buzz opens every slip, one after another, and finds nothing on any of them worth reading out. "Well. That is that." No sale.', col: PAL.gray, sfx: 'nosale', showBid: 0, showLeader: null });
    au.done = true;
    sealedRecord(au, 'nobody', 0, null);
    return;
  }
  // ties go to the room: on the same number yours is read first, and the room's slip is the one left standing
  slips.sort((x, y) => (x.n - y.n) || ((x.a === 'you' ? 0 : 1) - (y.a === 'you' ? 0 : 1)));
  for (const s of slips) {
    const mine = s.a === 'you';
    const nm = mine ? 'Yours' : (s.a.crowd ? 'Somebody in the crowd' : shortRivalName(s.a.def));
    au.queue.push({ text: '"' + fmt$(s.n) + '." ' + nm + '.', col: mine ? PAL.cyan : PAL.gray, sfx: 'aside', npcId: mine ? null : s.a.def.id, showBid: s.n, showLeader: null });
  }
  const top = slips[slips.length - 1];
  if (top.a === 'you') {
    au.bid = top.n; au.leader = 'you';
    sealedRecord(au, 'you', top.n, null);
    soldToYou(au);
    return;
  }
  const w = top.a;
  au.bid = top.n; au.leader = w; w.everLed = true; w.topRaise = top.n;
  sealedRecord(au, w.crowd ? 'crowd' : 'rival', top.n, w.crowd ? null : w.def.id);
  loseAuction();
}
const FORMAT_WORDS = { dutch: DUTCH_WORDS, phone: PHONE_WORDS, sealed: SEALED_WORDS, bulk: BULK_WORDS };
function phoneArm(au) {
  const lk = G.cur, step = au.step || 25;
  const R = RNG(strHash('absentee_' + G.worldSeed + '_' + G.day + '_' + lk.num));
  const budget = Math.round(PHONE_DEF.budget * (curTown().priceMult || 1));
  const cap = Math.min(budget, Math.max((lk.minBid || 0) + step * 2, Math.round((lk.value || 0) * R.r(ABSENTEE_CAP[0], ABSENTEE_CAP[1]))));
  const open = Math.max(lk.minBid || step, Math.floor(Math.min(cap, (lk.minBid || 0) * R.r(ABSENTEE_OPEN[0], ABSENTEE_OPEN[1])) / step) * step);
  const a = { def: PHONE_DEF, est: cap, cap, spiteCap: 0, budgetCap: budget, pressLeft: 0, stance: null,
    spentToday: 0, broke: false, active: true, folded: false, tellMode: 'silent', toldTell: {}, everLed: true, topRaise: open };
  const ci = au.npcs.findIndex((n) => n.crowd);
  au.npcs.splice(ci < 0 ? au.npcs.length : ci, 0, a);
  au.bid = open; au.leader = a;
  au.absentee = { open, cap };
  au.queue.push({ text: 'Buzz sets the phone on the podium. "Before we start, folks: there is an absentee bid on the book for unit ' + lk.num + '. ' + fmt$(open) + ', left this morning. They are on the line, and I answer for them."', col: PAL.orange, sfx: 'aside', npcId: 'phone', react: 'bid', pop: { kind: 'arc', caption: 'A BID ON THE BOOK' }, showBid: open, showLeader: leaderLabel() });
  recordEvent('absenteeBid', { unit: lk.num, open });
}
function sellWithoutYou(lk) {
  const R = RNG(strHash('offsale' + G.worldSeed + '_' + G.day + '_' + lk.num));
  const step = curTown().bidStep || 25;
  const all = prepNpcsForAuction(lk, R, G.world, G.day, { without: true });
  applyNeed(lk, all);                                   // the one who needed it is there without you too
  // Cody and Kaylee's week apart: with the other one in the room, each goes as far as their spite number
  const halves = duoHalvesIn(all);
  const reach = (a) => (halves && a.def.splitFrom) ? Math.max(a.cap, a.spiteCap || 0) : a.cap;
  // the crowd is in this too now (user, 2026-09-20: "maybe even buy one once in a while"). It was filtered
  // out, so a door no named face wanted simply passed - and the back row, which had been bidding all
  // morning, was never allowed to take one home.
  const room = all.filter((a) => a.active && reach(a) >= lk.minBid).sort((a, b) => reach(b) - reach(a));
  if (!room.length) { lk.passed = true; return { lk, passed: true }; }
  const top = room[0], second = room[1];
  const ceil = Math.max(lk.minBid, Math.floor(reach(top) / step) * step);
  const price = second ? Math.min(ceil, Math.max(lk.minBid, Math.ceil(reach(second) / step) * step + step)) : lk.minBid;
  lk.sold = true; lk.soldTo = top.crowd ? 'crowd' : top.def.id; lk.soldFor = price;
  const soldE = { unit: lk.num, rival: top.def.id, bid: price, value: lk.value };
  if (halves) soldE.halves = true;
  recordEvent('soldWithout', soldE);
  if (!top.crowd) noteLetGo(lk, top.def.id, price, 'walked');   // the crowd has no memory of you: nobody to owe
  return { lk, rival: top.def, price, crowd: !!top.crowd };
}
function joinDoor(lk, posture) {
  if (!doorIsUp(lk)) {
    const up = nextDoor();
    play('denied');
    if (up) toast('Unit ' + lk.num + ' is not up yet. Unit ' + up.num + ' sells first — bid on it, or let it sell.', PAL.orange);
    return;
  }
  G.cur = lk;
  if (G.daylight < 5 + ((POSTURES[posture] || POSTURES.steady).cost) || G.money < lk.minBid) { play('denied'); return; }
  // a big door: somebody may offer to go halves, once a day, before you walk in
  if (!lk.partnerAsked) {
    const pd = partnerOfferFor(lk);
    if (pd) {
      lk.partnerAsked = true; G.today.partnerOffered = true;
      const nm = shortRivalName(pd);
      G.modal = {
        title: pd.name + ' sidles over.',
        lines: [{ text: '"Halves on unit ' + lk.num + '? We bid as one. I pick first when it comes out."', col: PAL.white },
                { text: nm + ' stays out of the bidding and pays half of whatever it goes for. What comes out gets split, turn and turn about, ' + nm + ' first.', col: PAL.dgray }],
        buttons: [
          { label: 'GO HALVES', cb: () => { G.modal = null; lk.partnerWith = pd.id; joinDoor(lk, posture); }, col: PAL.dgreen },
          { label: 'ALONE', cb: () => { G.modal = null; joinDoor(lk, posture); }, col: PAL.slate },
        ],
      };
      return;
    }
  }
  startAuction(null, posture);
}
function reportSales(sales) {
  for (const x of sales || []) {
    if (x.passed) qLine('Nobody bid on unit ' + x.lk.num + '. It is still on the row.', PAL.gray);
    else qLine('Unit ' + x.lk.num + ' went to ' + x.rival.name + ' for ' + fmt$(x.price) + ' while you waited.', PAL.gray);
  }
}
// `sales`: the doors ahead that just sold without you (joinDoor), told first; `posture`: how you walked in
// ---- who gets it going (docs/AUCTION_REDESIGN.md §4; the user, 2026-09-20) ----
// "I noticed in some of the bidding you always have to start things off... Buzz will ask who's going to get us
// going, and the NPCs can also start the bidding." Before this, one seeded roll at the top of the sale sometimes
// had the room open for you and otherwise the first number was always yours. Now the sale opens on a BEAT: Buzz
// asks, nothing happens for OPEN_WAIT, and a face who wants the door may take it (the room's own npcRound, so
// they open at a number they would have paid anyway). Nobody after two goes and **Buzz drops the opening price
// once** - which is worth knowing, because a door nobody will open at $150 is a door nobody wants at $150.
// After that it is yours to start or leave. You can bid straight through any of it; the beat only holds the room.
const OPEN_WAIT = 2.2, OPEN_TRIES = 3;
const OPEN_CHANCE = [0.45, 0.6, 0.35];        // how likely the room is to speak first, try by try
function openingBeatOn(a) { return !!(a && a.openBeat && !a.done && a.bid === 0 && !a.leader && !a.closing && !a.dutch && !a.sealed); }
// Buzz takes a step off the opening price, once, when nobody will start it
function lowerOpening(a) {
  const step = a.step || 25, was = G.cur.minBid || step;
  const now = Math.max(step, was - step * (was >= step * 4 ? 2 : 1));
  if (now >= was) return false;
  G.cur.minBid = now;
  qLine('"Nobody at ' + fmt$(was) + '? All right - ' + fmt$(now) + ' to start. Give me ' + fmt$(now) + ' and we are away."', PAL.orange);
  speakOneOf(['auc_open_lower'], false, { cooldown: 0 });
  return true;
}
// the beat itself, from pumpQueue: true while the room is still deciding whether to open
function openBeatTick(a, dt) {
  if (!openingBeatOn(a)) return false;
  const ob = a.openBeat;
  ob.t = (ob.t || 0) + dt;
  if (ob.t < OPEN_WAIT) return true;
  ob.t = 0; ob.n = (ob.n || 0) + 1;
  const R = RNG(strHash('openbeat' + G.worldSeed + '_' + G.day + '_' + G.cur.num + '_' + ob.n));
  if (R.chance(OPEN_CHANCE[Math.min(ob.n, OPEN_CHANCE.length) - 1])) {
    npcRound();                                    // somebody wants it enough to say a number first
    if (a.bid > 0) { a.openBeat = null; return true; }
  }
  if (ob.n === 2 && !ob.dropped) { ob.dropped = true; if (!lowerOpening(a)) ob.n = OPEN_TRIES; }
  if (ob.n >= OPEN_TRIES) {
    a.openBeat = null;
    qLine('"Somebody has to start it, folks. It might as well be somebody with a van."', PAL.orange);
  }
  return true;
}
function startAuction(sales, posture) {
  G.daylight -= 5;
  sunCheck();
  const R = RNG(strHash('auction' + G.worldSeed + '_' + G.day + '_' + G.cur.num));
  G.auction = {
    R,
    npcs: prepNpcsForAuction(G.cur, R, G.world, G.day),
    bid: 0, leader: null,
    shownBid: 0, shownLeader: null,       // what the room has HEARD so far
    shownFolded: {},
    step: curTown().bidStep,
    stepScale: curTown().bidStep / 25,
    auc: curAuctioneer(),                 // whose gavel: pace, pressure, patience
    log: [], queue: [], qt: 0,
    holdVO: false, holdT: 0,              // the line on the floor is still being spoken
    turnT: 0, beat: false,                // the breath before the gavel turns to you
    closing: 0, closingT: 0,              // the hammer: 1 = once said, 2 = twice said
    lineAt: -9, bidAt: -9,                // when the newest line / bid landed (the log glows, the panel flashes)
    events: [],                           // what the room just did (a run-up stops on a face's pride); the last few only
    calledOut: null, slipped: null, runUp: null,   // the moves, one of each a sale (docs/AUCTION_OVERHAUL.md step 4)
    said: [],                             // SAY SOMETHING: every line said this sale, and who believed it
    faceLeft: FACE_MAX, face: null,       // a face of your own (IDEAS_TODO 6): one a sale, and the room reads it
    posture: 'steady', postureSwitched: false, quietLeft: 0, quietSat: 0,   // postures (docs/AUCTION_OVERHAUL_2.md step 4)
    beside: null, besideKind: null,       // who you went and stood next to, and what that got you
    pbids: 0, pbidsInCount: 0,            // your bids this sale, and how many were at the wire (the sniper)
    wayShown: {},                         // rivals whose way of bidding the log has explained this sale
    done: false,
  };
  for (const a of G.auction.npcs) dealTell(a);
  const needy = applyNeed(G.cur, G.auction.npcs);   // somebody needs this door: here, higher, and it shows
  if (needy) needy.tellMode = 'honest';
  if (spiteWarReady()) spiteWarArm(G.auction);      // the first spite war (day 3 on): Sal walks over, whatever this door is
  if (sales) reportSales(sales);
  // the yard's name for you opens this door a step higher: the gavel noticed the money, or the office noticed the eye
  const yname = yardName();
  if (yname && !G.cur.repBumped) {
    G.cur.repBumped = true;
    G.cur.minBid += G.auction.step || 25;
    if (yname === 'whale') { qLine('"For our friend with the deep pockets, we open this one a little higher."', PAL.orange); speak(['auc_rep_whale']); }
    else { qLine('"The office knows your face. This one opens a little higher."', PAL.orange); speak(['auc_rep_shark']); }
  }
  // the week after Channel 9: the gavel says so, once
  const tvn = tvNameNow(), tmem = G.world.rivalMem = G.world.rivalMem || {};
  if ((tvn === 'whale' || tvn === 'shark') && tmem.tvStarSaid !== G.world.rivalMem.tvName.from) {
    tmem.tvStarSaid = G.world.rivalMem.tvName.from;
    qLine('"Folks, we have a TV star with us. Channel 9 says they ' + (tvn === 'whale' ? 'pay what it takes' : 'only buy steals') + '. Let\'s find out."', PAL.orange);
  }
  // you won LOUD in this town yesterday: the office wrote you down as a big spender
  const bigSp = (G.world.rivalMem || {}).bigSpender;
  if (bigSp && bigSp.town === G.world.town && bigSp.day === G.day - 1 && !G.cur.spenderBumped) {
    G.cur.spenderBumped = true;
    G.cur.minBid += G.auction.step || 25;
    qLine('"The office says you like to spend. We open this one a little higher."', PAL.orange);
    speak(['auc_big_spender']);
  }
  // you leaned on Buzz over the phone: for a week, your doors open a step higher (phone.js)
  if (typeof buzzSoreNow === 'function' && buzzSoreNow() && !G.cur.buzzBumped) {
    G.cur.buzzBumped = true;
    G.cur.minBid += G.auction.step || 25;
    qLine('"For our friend with the telephone manners, we open this one a little higher."', PAL.orange);
  }
  if (G.cur.partnerWith) setPartner(G.cur.partnerWith);
  if (posture && posture !== 'steady') setPosture(posture, true);
  pickPushBack(G.auction);                          // somebody here means to run YOU up (after the posture: quiet hides you from it)
  speakOneOf(['auc_open_ready', 'auc_open_howmuch', 'auc_start_needbid']);
  // anybody active here for the first time gets Buzz's intro card before the bidding opens
  // (Cody or Kaylee on their own is the pair, as far as the Ledger and the intro cards go)
  const freshFaces = G.auction.npcs.filter((a) => a.active && !a.crowd && !codexMet(a.def.splitFrom || a.def.id)).map((a) => a.def.splitFrom || a.def.id).filter((id, i, arr) => arr.indexOf(id) === i);
  for (const a of G.auction.npcs) if (a.active) codexNoteMet(a.def.splitFrom || a.def.id);
  if (townHasGavels()) qLine(G.auction.auc.name + ' takes the gavel. ' + G.auction.auc.blurb, PAL.orange);
  const names = G.auction.npcs.filter((a) => a.active).map((a) => a.def.name);
  qLine(names.length ? 'Bidding against: ' + names.join(', ') : 'Nobody else showed up...', PAL.gray);
  // day wallets: somebody stayed in the truck because of an earlier door, or is here with less than they came with
  const brokeFace = G.auction.npcs.find((a) => a.broke);
  if (brokeFace) qLine(brokeFace.def.name + ' sits this one out. The money went on an earlier door.', PAL.gray);
  const reasonR = reasonShown(G.cur) ? reasonWords(G.cur.reason) : null;
  if (reasonR && needy) G.auction.queue.push({ text: reasonR.room, col: PAL.orange, sfx: 'aside', npcId: needy.def.id, react: 'warm', pop: reasonR.pop || null, showBid: 0, showLeader: null });
  else if (reasonR && G.cur.reason.kind !== 'need' && reasonR.room) qLine(reasonR.room, PAL.cyan);
  // Big Bart's truck: the first room he walks into that week, and the first after it is back
  const bartBeat = G.auction.npcs.some((n) => n.def.id === 'bart' && n.active) ? bartArcAuctionBeat() : null;
  if (bartBeat) G.auction.queue.push({ text: bartBeat.text, col: PAL.orange, sfx: 'aside', npcId: 'bart', react: bartBeat.react, pop: { kind: 'arc', caption: bartBeat.caption }, showBid: 0, showLeader: null });
  const edBeat = G.auction.npcs.some((n) => n.def.id === 'ed' && n.active) ? edArcAuctionBeat() : null;
  if (edBeat) G.auction.queue.push({ text: edBeat.text, col: PAL.orange, sfx: 'aside', npcId: 'ed', react: edBeat.react, pop: { kind: 'arc', caption: edBeat.caption }, showBid: 0, showLeader: null });
  const duoBeat = duoArcAuctionBeat(G.auction.npcs);          // Cody and Kaylee: the first room with both of them in it, and the first after
  if (duoBeat) G.auction.queue.push({ text: duoBeat.text, col: PAL.orange, sfx: 'aside', npcId: duoBeat.id, react: duoBeat.react, pop: { kind: 'arc', caption: duoBeat.caption }, showBid: 0, showLeader: null });
  holidayRoomLines(G.auction);                                   // Buzz's holiday: the speech, and the word when he is back
  if (stormNow() && !stormArc(G.world).roomSaid) {              // the storm: the gavel has a word for whoever came out
    stormArc(G.world).roomSaid = G.day;
    qLine('Buzz, from under a golf umbrella: "Those of you who came out in this, God bless. The rest of you are home, dry, and wrong."', PAL.orange);
  }
  // two locals with history, both in this one: the room knows before you do
  {
    const fa = G.auction.npcs.find((n) => n.feud && n.active && !n.crowd);
    const fb = fa ? G.auction.npcs.find((n) => n.def.id === fa.feud) : null;
    if (fa && fb && !G.auction.feudSaid) {
      G.auction.feudSaid = true;
      G.auction.queue.push({ text: shortRivalName(fa.def) + ' and ' + shortRivalName(fb.def) + ' have been doing this to each other for years. They have both seen the other one is here.', col: PAL.orange, sfx: 'aside', npcId: fa.def.id, react: 'glare', showBid: 0, showLeader: null });
    }
  }
  if (G.auction.spiteWar && !G.auction.spiteWar.said) {
    G.auction.spiteWar.said = true;
    G.auction.queue.push({ text: 'Spite Sal walks over from the next door. He was not going to bid on this one. He is looking at you, not at the door.', col: PAL.orange, sfx: 'aside', npcId: 'sal', react: 'glare', pop: { kind: 'arc', caption: 'SPITE WAR' }, showBid: 0, showLeader: null });
  }
  // Merle Tuttle's old unit (the tenant, day 12): he is at the rope, and he has a word for the paddles
  if (G.cur.tenantDoor && !G.cur.won && !G.cur.sold) {
    G.auction.tenant = { n: 0, i: 0, last: -9 };
    G.auction.queue.push({ text: TENANT.name + ', who rented this unit until the rent ran out, is at the rope in a bowling shirt. He would like a word with every bidder.', col: PAL.orange, sfx: 'aside', npcId: 'tenant', pop: { kind: 'arc', caption: 'THE TENANT IS HERE' }, showBid: 0, showLeader: null });
  }
  if (((G.world.rivalMem || {}).townLikesUntil || 0) >= G.day && dayR('liked', G.cur.num).chance(0.3)) qLine('Somebody in the crowd points at you: "That\'s the one who sold Merle his trophy back." A little applause.', PAL.cyan);
  if (G.dayStats && !G.dayStats.saidLighter && G.auction.npcs.some((a) => a.active && !a.crowd && a.spentToday > 0)) {
    G.dayStats.saidLighter = true;
    qLine('"Some of you are lighter than you were at nine."', PAL.orange);
    speak(['auc_flavor_lighter']);
  }
  sniperCall(G.auction);
  // no new faces today: the gavel welcomes one of the regulars back instead, some mornings
  if (!freshFaces.length) npcRegularBeat(G.auction.npcs);
  // the one in the corner: the gavel will not discuss it, and says so
  if (G.cur.items.some((it) => it.censored && it.layer === 2)) {
    qLine('"Folks, we don\'t discuss the one in the corner. Start me anyway."', PAL.orange);
    speak(['auc_flavor_censor']);
  }
  // the rare day Sal looks at a door and leaves before the first bid
  if (G.today.facts && G.today.facts.rare === 'salDentist') {
    const sal = G.auction.npcs.find((a) => a.active && a.def.id === 'sal');
    if (sal && !countEvents('salDentist', { where: (e) => e.day === G.day })) {
      sal.active = false; sal.folded = true;
      qLine('Sal looks at the door for a long moment. "Dentist," he says, to nobody, and leaves.', PAL.orange);
      recordEvent('salDentist', { unit: G.cur.num });
    }
  }
  // the auctioneer knows your face by now, or does not
  const rep = repLine(countEvents('won', { town: G.world.town }));
  if (rep && dayR('rep', G.cur.num).chance(0.35)) qLine(rep, PAL.gray);
  edScrapGossip();
  slipFallout();
  // somebody in the room remembers something you did
  const gossip = rivalGossip(G.auction.npcs);
  if (gossip) G.auction.queue.push({ text: gossip.text, col: PAL.cyan, sfx: 'gossip', npcId: gossip.who, react: gossip.react, showBid: 0, showLeader: null });
  else {
    // or somebody who has been winning against you, or losing to you, lets it show
    const st = stanceLine(G.auction.npcs);
    if (st) G.auction.queue.push({ text: st.text, col: PAL.cyan, sfx: 'gossip', npcId: st.who, showBid: 0, showLeader: null });
  }
  // and a door that plays to your habit gets called out before the first bid
  const read = G.today.facts.readDay ? doorMatchesHabit(G.cur) : [];
  const salHere = G.auction.npcs.some((a) => a.active && a.def.id === 'sal');
  if (read.length && salHere && dayR('readcall', G.cur.num).chance(0.6)) {
    const what = read[0] === 'safe' ? 'the box' : (HABIT_LABEL[read[0]] || read[0]).replace(/^the /, '');
    qLine('"' + what.charAt(0).toUpperCase() + what.slice(1) + '. He\'s in." Sal cracks his knuckles.', PAL.red);
  }
  // some mornings a paddle is up before you have finished your coffee
  // a rare interruption: never on a sale that already has a story in it, one a day, three days apart
  const ik = (!G.auction.queue.some((l) => l.pop) && !G.today.interrupted && G.day - (G.world.lastInterruptDay == null ? -99 : G.world.lastInterruptDay) >= INTERRUPT_GAP) ? interruptPick(G.cur) : null;
  if (ik) interruptArm(G.auction, ik);
  if (G.cur.format === 'dutch' && !G.auction.done) dutchArm(G.auction);   // the week's Dutch clock: Rapid Ray's rules
  if (G.cur.format === 'phone' && !G.auction.done) phoneArm(G.auction);   // or the week's absentee, already on the book
  if (G.cur.format === 'sealed' && !G.auction.done) sealedArm(G.auction);   // or the week's one-number round, everybody writing
  if (!G.auction.done && !G.auction.dutch && !G.auction.sealed) G.auction.openBeat = { t: 0, n: 0, dropped: false };   // Buzz asks; the room may answer
  G.auction.doorT = 1; G.auction.doorInit = false;   // the renderer throws it open on its first frame (aucDoorTick)
  G.mode = 'auction';
  callAuctionReminder();
  if (freshFaces.length && !G.auction.done) npcIntroQueue(freshFaces, 'auction');
}
// Ed's dry word about what you left behind. No names, no numbers, so the same
// recorded line fits every locker. Text index = voice take (npc_ed_scrap_0N).
const ED_SCRAP_LINES = [
  '"Heard you left something in the dark last time." Ed does not look up. "The hauler didn\'t."',
  '"The scrap man\'s still smiling about your last unit." Ed turns a page.',
  '"Word at the office is you walk away from money." Ed writes something down. "Noted."',
  '"I know what you left behind." A pause. "I wouldn\'t have."',
];
function edScrapGossip() {
  const gs = G.world.scrapGossip;
  if (!gs || gs.town !== G.world.town || gs.left <= 0 || G.day - gs.day > 6) { if (gs) G.world.scrapGossip = null; return; }
  const ed = G.auction.npcs.find((a) => a.def.id === 'ed' && a.active);
  const R = dayR('edscrap', G.cur.num);
  if (!ed || !R.chance(0.4)) return;
  gs.left--;
  if (gs.left <= 0) G.world.scrapGossip = null;
  const n = R.i(0, ED_SCRAP_LINES.length - 1);
  qLine(ED_SCRAP_LINES[n], PAL.cyan, 'edscrap', n + 1);
}
// reputation, by how many doors you have taken in this town. Never a number.
function repLine(wins) {
  const tier = curTown().tier || 0;
  if (yardOwned() && G.world.town === 'dustyFlats') return '"Morning, boss." The auctioneer touches his hat. He still takes your money.';
  if (wins === 0) return tier >= 2 ? '"Number?" The auctioneer does not look up.' : null;
  if (wins <= 2) return 'The auctioneer glances at your number. Twice.';
  if (wins <= 7) return 'The auctioneer nods at you. He knows the number now.';
  return '"Our regular," the auctioneer says, to the crowd, about you.';
}
function leaderLabel() {
  const au = G.auction;
  return au.leader === 'you' ? 'you' : (au.leader ? au.leader.def.name : null);
}
function qLine(text, col, sfx, amt) {
  const au = G.auction;
  au.queue.push({ text, col: col || PAL.white, sfx, amt, showBid: au.bid, showLeader: leaderLabel() });
}
// the room is still doing something: lines waiting, a clip on the floor, a beat
// not yet taken (so the buttons never flicker on for the frame between the last
// line and the beat), or the beat itself
function auctionBusy() {
  const a = G.auction;
  return a.queue.length > 0 || !!a.holdVO || !!a.beat || (a.turnT || 0) > 0;
}
// a click on the log hurries it: the waiting line comes now, rival chatter is cut, the gavel finishes his word
function hurryAuction() {
  const a = G.auction;
  if (!a) return;
  a.qt = 0; a.holdVO = false; a.turnT = 0;
  if (a.closing) a.closingT = 99;      // impatient? the hammer moves to its next word
  voFlush();
}
// the gavel notices the SIZE of a bid: a jump gets a whoop, the bare minimum
// gets a dry one, and a rally between rivals gets called like a horse race.
// When a reaction plays it takes the chant's turn — variety over repetition.
function sayReact(prev, amt, a) {
  if (!prev || !amt || amt <= prev) return false;
  const step = a.step || 25;
  const delta = amt - prev;
  if ((a.rivalRun || 0) >= 3 && Math.random() < 0.35) { a.rivalRun = 0; return speakOneOf(['auc_react_war']); }
  if (delta >= step * 3 && Math.random() < 0.5) return speakOneOf(['auc_react_big']);
  if (delta === step && Math.random() < 0.25) return speakOneOf(['auc_react_min']);
  return false;
}
// the room has gone quiet with a rival on top: the gavel turns to you. "Would you give — two hundred?"
function sayAsk() {
  speakLazy('chant', () => {
    const au = G.auction;
    if (!au || au.done || au.leader === 'you') return null;
    const ask = (au.shownBid || au.bid) + (au.step || 25);
    return (voEl('auc_chant_wouldyougive') && voEl('num_' + ask)) ? ['auc_chant_wouldyougive', 'num_' + ask] : null;
  });
}
const VO_HOLD_MAX = 6;              // seconds a line may hold the floor for its clip, in case one never ends
// the tension roll under the count: started once per "going once"/"going twice",
// cut clean the instant the silence resolves — a late bid, the next count, or the
// sale — so it never fights the line that answers it.
function stopClosingRoll(a) {
  if (a.closingRollEl) { try { a.closingRollEl.pause(); } catch (e) { /* ok */ } a.closingRollEl = null; }
}
function pumpQueue(dt) {
  const a = G.auction;
  if (a.roomHeld) return;                    // the room is frozen while a menu is open on it
  if ((a.doorT == null ? 1 : a.doorT) < 1) return;   // the door is still going up: nobody says anything yet
  if (a.darkUntil) {                         // the power is out: the count, the log and the tells all wait
    if (G.time < a.darkUntil) return;
    a.darkUntil = 0;
    a.queue.unshift({ text: 'The lights come back on. Everybody is looking at the door again, a little differently.', col: PAL.gray, sfx: 'aside', showBid: a.bid, showLeader: leaderLabel() });
    a.qt = 0;
  }
  // the auction runs at the speed of the voice: a spoken line holds the floor
  // until its clip is done, then a breath (voGap). Silence uses the timers.
  if (a.holdVO) {
    a.holdT += dt;
    if (!voIdle() && a.holdT < VO_HOLD_MAX) return;
    a.holdVO = false;
    a.qt = a.auc.voGap || 0.25;
  }
  if (!a.queue.length) {
    if (a.dutch && !a.done) { dutchTick(a, dt); return; }   // the Dutch clock: nothing to wait on but the next step down
    // the rally just ended: one beat, and the gavel asks you for the next number
    if (a.beat) {
      a.beat = false;
      if (!a.done && a.leader && a.leader !== 'you' && !a.closing && !(a.quietLeft > 0)) { a.turnT = a.auc.turnBeat || 0.8; a.pressT = 0; sayAsk(); }
    }
    if (a.turnT > 0) { a.turnT -= dt; return; }
    if (openBeatTick(a, dt)) return;              // nobody has opened yet: the room gets its chance first
    // a run-up bids for you against one face (RUN THEM UP); the paddle answers while your hand is up
    quietReveal(a);                               // down to the last two: they turn round
    if (quietTick(a, dt)) return;
    if (runUpTick(a, dt)) return;
    if (paddleTick(a, dt)) return;
    // the room went quiet — yours to lose (you held off) or yours to win (nobody
    // challenged your last bid): the hammer falls in real time either way, once...
    // twice... gone. A bid (yours, or a rival's at the wire) stops it.
    if (a.closing && !a.done && a.leader) {
      // the count just landed and the room's gone quiet — fill it instead of
      // leaving it dead air, once per "once"/"twice", cut clean at the resolution
      if (!a.closingRollPlayed) {
        a.closingRollPlayed = true;
        a.closingRollEl = play('sting_closing', 0.55);
        // once in a while, Buzz fills the gap too, alongside the roll, not instead
        // of it — decided once per "once"/"twice" here, not re-rolled every frame
        a.closingCallDue = Math.random() < 0.4;
      }
      if (a.lookHold > 0) { a.lookHold = Math.max(0, a.lookHold - dt); return; }   // LAST LOOK: the held breath
      a.closingT += dt;
      // wait exactly as long as the roll actually runs, not a fixed guess independent
      // of it — a recorded clip a second short (or long) of that guess used to leave
      // dead air, or get cut off, before the room reacted. Falls back to the old pace
      // formula only until the clip's real length is known (or there's no clip at all).
      const rollDur = a.closingRollEl && isFinite(a.closingRollEl.duration) ? a.closingRollEl.duration : null;
      const closeWait = (rollDur != null ? rollDur + 0.2 : (a.auc.bidPace || 0.55) * 2 + 1.6) + (sniperNow() && a.leader === 'you' ? 0.5 : 0);   // a known sniper gets a slower count
      heartTick(a, dt, closeWait);
      // partway through the gap — never right on top of "Going once" finishing, never
      // so late it steps on the resolution — "Anyone? Anyone?" over the roll, not over it
      if (a.closingCallDue && a.closingT > closeWait * 0.5) {
        a.closingCallDue = false;
        speakOneOf(['auc_closing_call'], false, { kind: 'flavor' });
      }
      if (a.closingT > closeWait) {
        a.closingT = 0;
        stopClosingRoll(a);
        const b0 = a.bid, hadYou = a.leader === 'you';
        if (a.closing === 1 && a.interrupt && !a.interrupt.fired && (a.interrupt.kind === 'late' || a.interrupt.kind === 'phone')) interruptArrive(a);   // "Going once" "WAIT."
        const qWire = a.queue.length;
        npcRound();                              // somebody can always find their nerve at the last second
        if (a.bid > b0) {
          a.closing = 0; a.closingRollPlayed = false;
          play('sting_latebid', 0.85);
          speak(['auc_react_late'], true);
          qLine(hadYou ? 'A late bid!' : 'New money — we go again!', PAL.orange, 'late');
          if (hadYou && a.leader && a.leader !== 'you') roomEvent('late', a.leader.def.name + ' came in at the wire.');
        }
        else if (a.closing === 1) { a.closing = 2; a.closingRollPlayed = false; a.heartT = 0.35; qLine('Going twice...', PAL.yellow, 'twice'); }
        else {
          a.closing = 0;
          // Whatever the room muttered while it was losing its nerve waits its turn: the hammer goes first.
          // The SHRUGS do not come back at all - soldToYou says the whole room let it go in one line, and
          // four separate "kicks a rock and folds" landing on top of your win is the pile-on the user was
          // describing. Anything else they said (a dig, a story beat) still lands, after the sale.
          const muttered = a.queue.splice(qWire).filter((l) => l.sfx !== 'fold');
          if (hadYou) soldToYou(a); else loseAuction();
          for (const l of muttered) a.queue.push(l);
        }
      }
      return;
    }
    // auctioneer works the crowd while you hesitate
    if (!a.done && a.leader && a.leader !== 'you' && voIdle()) {
      a.pressT = (a.pressT || 0) + dt;
      if (a.pressT > a.auc.hesitation) { a.pressT = 0; if (Math.random() < 0.5) speak(['auc_pressure']); }
    }
    return;
  }
  a.qt -= dt;
  if (a.qt <= 0) {
    const l = a.queue.shift();
    a.log.push(l);
    if (a.log.length > 12) a.log.shift();
    a.lineAt = G.time; a.beat = true;
    const prevShown = a.shownBid;
    if (l.showBid !== undefined) {
      if (l.showBid !== a.shownBid) a.bidAt = G.time;
      a.shownBid = l.showBid; a.shownLeader = l.showLeader;
    }
    // a raise lands here, in step with the number actually changing on screen —
    // drawAuction picks this up once (it knows where the card is) and clears it
    if ((l.sfx === 'npc' || l.sfx === 'pbid') && l.amt != null && prevShown != null && l.amt > prevShown) {
      a.pendingFloat = { npcId: l.sfx === 'pbid' ? 'you' : l.npcId, amt: l.amt - prevShown };
      // a jump (three steps or more) lands on the whole room: every other face flinches, the crowd goes "ooh"
      if (prevShown > 0 && l.amt - prevShown >= (a.step || 25) * 3) roomFlinch(a, l.sfx === 'pbid' ? 'you' : l.npcId, true);
    }
    if (l.npcId) setReact(l.npcId, l.react || ((l.sfx === 'npc' || l.sfx === 'rejoin') ? 'bid' : (l.sfx === 'fold' ? 'fold' : null)));
    // the cutout pop, rare and never blocking: a story beat, a rival's big jump, the one who held it folding, the winner at the hammer
    if (l.pop && l.npcId) aucPop(a, l.npcId, l.pop.kind, l.pop.caption, true);
    else if (l.npcId && l.sfx === 'npc' && prevShown > 0 && l.amt - prevShown >= (a.step || 25) * 4) aucPop(a, l.npcId, 'jump');
    else if (l.npcId && l.sfx === 'fold' && a.lastRivalLead === l.npcId) aucPop(a, l.npcId, 'fold');
    else if (l.npcId && l.sfx === 'lose') aucPop(a, l.npcId, 'win');
    if (l.sfx === 'npc' && l.npcId) a.lastRivalLead = l.npcId;
    if ((l.sfx === 'npc' || l.sfx === 'pbid') && a.interrupt && a.interrupt.kind === 'power' && !a.interrupt.fired && !a.done) { a.paddlesSeen = (a.paddlesSeen || 0) + 1; if (a.paddlesSeen >= 3) interruptPower(a); }
    if (l.sfx === 'fold' && l.npcId) a.shownFolded[l.npcId] = true;
    if (l.sfx === 'rejoin' && l.npcId) a.shownFolded[l.npcId] = false;
    // bids get room to land, and a line may ask for more of it (`gap`): the hammer takes nearly a second of
    // nothing before the room is allowed to react, so winning it is a moment and not a queue entry
    a.qt = l.gap != null ? l.gap : ((l.sfx === 'npc' || l.sfx === 'pbid' || l.sfx === 'edscrap' || l.sfx === 'gossip') ? a.auc.bidPace : a.auc.foldPace);
    const voN0 = _voN;
    if (l.sfx === 'npc') {
      play('bid_rival');
      a.rivalRun = (a.rivalRun || 0) + 1;
      if (a.quietLeft > 0 && !a.closing) { a.quietLeft--; a.quietSat++; }   // one more raise you sat through
      if (l.npcId) {
        // the chatter budget: a rival's first two raises are voiced, the rest two times in five
        a.saidBid = a.saidBid || {};
        const n = (a.saidBid[l.npcId] = (a.saidBid[l.npcId] || 0) + 1);
        if (n <= 2 || Math.random() < 0.4) speak(['npc_' + l.npcId + '_bid']);
      }
      if (!sayReact(prevShown, l.amt, a)) sayChant();
    } else if (l.sfx === 'pbid') {
      a.rivalRun = 0;
      if (a.posture === 'loud') { roomFlinch(a, 'you', true); if (!(Math.random() < 0.6 && speakOneOf(['auc_react_big']))) sayChant(); }   // on your feet: the yard reacts to every paddle
      else if (!sayReact(prevShown, l.amt, a)) sayChant();
    }
    else if (l.sfx === 'fold') { if (l.npcId) speak(['npc_' + l.npcId + '_fold']); }
    else if (l.sfx === 'rejoin') {
      if (l.npcId) speak(['npc_' + l.npcId + '_rejoin']);
      if (Math.random() < 0.4) speak(['auc_react_back']);
    }
    else if (l.sfx === 'tell') { if (l.arith) speakOneOf(['auc_limit_close'], false, { kind: 'flavor' }); }   // "Somebody's doing arithmetic over there."
    else if (l.sfx === 'edscrap') speakTake('npc_ed_scrap', l.amt);
    else if (l.sfx === 'once') speak(['auc_once'], true);
    else if (l.sfx === 'late') roomFlinch(a, null, false);
    else if (l.sfx === 'twice') speakOneOf(['auc_twice', 'auc_fairwarning', 'auc_lastcall'], true);
    else if (l.sfx === 'sold') {
      play('auction_win');
      play('crowd_cheer', 0.9);
      speakOneOf(['auc_sold_yourway', 'auc_sold'], true);
      if (Math.random() < 0.4) speak(['auc_paythelady']);
      // the hammer lands with some weight behind it, and the sting comes a beat
      // later (drawAuction) so the cheer and the gavel are not all one noise —
      // the burst lands right on the number that just settled, not screen-centre
      const heat = G.auction.heat || 0;
      shake(3 + 3 * heat, 0.4 + 0.2 * heat);
      spawnDust(420, 76, 16 + Math.round(12 * heat));
      G.auction.wonAt = G.time; G.auction.stung = false;
      for (const f of G.auction.npcs) if (f.active && !f.crowd && f.everLed) setReact(f.def.id, 'beaten', true);   // you took it off them
    } else if (l.sfx === 'lose') {
      play('auction_lose');
      speakOneOf(['auc_sold'], true);
      if (l.npcId) { speak(['npc_' + l.npcId + '_win']); setReact(l.npcId, 'win', true); }
      else if (Math.random() < 0.5) speak(['auc_nextunit']);
    } else if (l.sfx === 'nosale') speak(['auc_nobid'], true);
    a.holdVO = _voN !== voN0; a.holdT = 0;                  // something got said: the next line waits for it
    if (a.tenant && !l.heckle && (l.sfx === 'npc' || l.sfx === 'pbid' || l.sfx === 'sold' || l.sfx === 'lose')) tenantHeckle(a, l);   // Merle has a word for it
    else if (!l.heckle && G.cur && G.cur.rivalUnit && (l.sfx === 'npc' || l.sfx === 'pbid' || l.sfx === 'sold' || l.sfx === 'lose')) rivalUnitWatch(a, l);   // and they are standing right there
    if (l.then) l.then();
  }
}
// the whole room takes a hit: every face but the one who did it jolts for a third of a
// second (drawAuction reads flinchAt), and the crowd lets out an "ooh"
function roomFlinch(a, byId, ooh) {
  a.flinchAt = G.time; a.flinchBy = byId;
  for (const f of a.npcs || []) if (f.active && !f.crowd && f.def.id !== byId && !(a.shownFolded && a.shownFolded[f.def.id])) setReact(f.def.id, 'flinch');
  if (ooh) play('crowd_ooh', 0.5);
}
// every rival decision rolls on the auction's own seed: reloading the morning
// and bidding the same way meets the same room making the same choices
// a rival's line for the moment, from the pool that fits the moment (Sal keeps a set for when the yard is yours)
function rivalLine(def, kind, R, over) {
  if (def.splitFrom && kind === 'raise' && over === def.other && R.chance(0.7)) return R.pick(def.over);   // Cody over Kaylee, Kaylee over Cody
  if (def.id === 'bart' && BART_BROKE_LINES[kind] && bartBrokeOn(G.world, G.day)) return R.pick(BART_BROKE_LINES[kind]);   // his week in the shop
  if (def.id === 'ed' && ED_LOST_LINES[kind] && edNotebookGone(G.world, G.day)) return R.pick(ED_LOST_LINES[kind]);        // no notebook
  // IDEAS_TODO 11: you found their paper in somebody else's unit. Once in a while they say the thing it implies.
  if (typeof castKnowsAbout === 'function' && (kind === 'raise' || kind === 'fold') && R.chance(0.12)) {
    const c = castKnowsAbout(def.splitFrom || def.id);
    if (c) return c.line;
  }
  const owned = def.linesOwned && def.linesOwned[kind] && yardOwned() && G.world.town === 'dustyFlats' && R.chance(0.35);
  return R.pick(owned ? def.linesOwned[kind] : def.lines[kind]);
}
// spite bites on you, unless somebody pointed it elsewhere (POINT SAL): then on them
function spiteBites(a, leader) {
  if (a.spiteOn) return !!(leader && leader !== 'you' && leader.def && leader.def.id === a.spiteOn);
  return leader === 'you';
}
function npcWants(a, target, leaderIsYou, R, auc, leader) {
  if (a.spiteWar && a.spiteCap && target <= a.spiteCap && spiteBites(a, leader === undefined ? (leaderIsYou ? 'you' : null) : leader)) return true;   // the first spite war: every paddle of yours, answered
  if (a.lateBid) { a.lateBid = false; if (target <= a.cap && target <= (a.budgetCap || Infinity)) return true; }   // through the gate late: one bid, if the number allows
  if (pushingYou(a) && leaderIsYou && target > a.cap) return target <= a.pushBack.to && target <= (a.budgetCap || Infinity) && R.chance(PUSHBACK_NERVE);   // not for the door: for you
  if (a.def.phone) return target <= a.cap && target <= (a.budgetCap || Infinity);   // a number on the book does not hesitate
  // A professional answers almost every time; the back row is slower to get a hand up, which is what keeps
  // a crowd with a real number from filling the log with "a hand goes up in the back" (2026-09-20).
  if (target <= a.cap) return R.chance(a.crowd ? 0.6 : 0.95);
  if (spiteBites(a, leader === undefined ? (leaderIsYou ? 'you' : null) : leader) && a.spiteCap && target <= a.spiteCap) return a.spiteWar ? true : R.chance(0.6);   // the first spite war: every paddle
  // pride: a reluctant raise past their own number — once or twice, never past the wallet
  if (a.pressLeft > 0 && target <= a.cap * 1.35 && target <= (a.budgetCap || Infinity)) {
    if (R.chance((a.pressLeft >= 2 ? 0.45 : 0.25) * (auc ? auc.pressMult : 1))) { a.pressLeft--; return true; }
  }
  return false;
}
// one pass over the room: every rival gets ONE decision against the live bid.
// Later hands in the pass react to earlier raises, so a flurry still happens —
// but it is one exchange, not the whole war, and then it is your turn again.
function npcRound() {
  const au = G.auction, R = au.R, auc = au.auc || AUCTIONEERS.default;
  let raisedAny = false;
  pHeatTick(au);                                     // before they answer: who has noticed you, and who has stopped
  // the whole room turned to look at the noise: this round does not happen. One round only, and the late
  // chances during the count still fire, so it buys you the gavel's first "going once" and nothing more.
  if (au.racSkip) { au.racSkip = null; return false; }
  for (const a of R.shuf(au.npcs)) {
    if (!a.active || au.leader === a) continue;
    if (a.folded) {
      // some pairs fold in two halves. The other half drags them back in, once.
      const back = a.def.lines.rejoin && !a.rejoined && au.leader !== null
        && au.bid + R.pick(a.def.raise) * (au.stepScale || 1) <= (a.budgetCap || Infinity) && R.chance(0.4 * auc.rejoinMult);
      if (!back) continue;
      a.rejoined = true; a.folded = false;
      a.cap = Math.round(a.cap * 1.3); a.pressLeft = Math.max(a.pressLeft, 1);
      au.queue.push({ text: R.pick(a.def.lines.rejoin), col: PAL.orange, sfx: 'rejoin', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
      roomEvent('rejoin', a.def.name + ' is back in.');
    }
    const target = (au.leader === null && au.bid === 0)
      ? G.cur.minBid
      : au.bid + ((a.def.id === 'bart' && bartBrokeOn(G.world, G.day)) ? (au.step || 25) : R.pick(a.def.raise) * (au.stepScale || 1) * (auc.raiseMult || 1));   // broke: the smallest step
    if (npcWants(a, target, au.leader === 'you', R, auc, au.leader)) {
      const pushed = pushingYou(a) && target > a.cap;          // past their number, and only because it is you
      const spite = target > a.cap && !pushed;
      const first = !a.everLed, prevBid = au.bid, over = (au.leader && au.leader !== 'you' && au.leader.def) ? au.leader.def.id : null, wasYou = au.leader === 'you';
      au.bid = target; au.leader = a;
      a.everLed = true;
      if (!a.crowd) { au.raisesBy = au.raisesBy || {}; au.raisesBy[a.def.id] = (au.raisesBy[a.def.id] || 0) + 1; a.topRaise = Math.max(a.topRaise || 0, target); }   // who fought you, by the count
      au.queue.push({ text: rivalLine(a.def, 'raise', R, over) + '  ' + fmt$(target), col: spite ? PAL.red : PAL.white, sfx: 'npc', amt: target, npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
      if (pushed) pushBackAside(a, target); else tellAside(a, target, spite);
      if (a.spiteWar && wasYou && au.spiteWar) {                   // the first spite war: he answered you, and the first time the log says how to beat him
        au.spiteWar.answered++;
        if (!au.spiteWar.told) { au.spiteWar.told = true; au.queue.push({ text: SPITE_WAR_TELL, col: PAL.cyan, sfx: 'aside', npcId: 'sal', react: 'glare', showBid: au.bid, showLeader: leaderLabel() }); }
      }
      // the first paddle from a named face says who they are and how they price a door
      if (first && !a.crowd) {
        const way = wayAside(a);
        if (way) au.queue.push({ text: way, col: PAL.dgray, sfx: 'aside', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
        roomEvent('enter', a.def.name + ' is in.' + (way ? ' ' + way : ''));
      } else if (!a.crowd && prevBid > 0 && target - prevBid >= (au.step || 25) * 3) roomEvent('jump', a.def.name + ' jumped it to ' + fmt$(target) + '.');
      raisedAny = true;
      continue;
    }
    // declined. Out of number, spite, and pride? Then it's a fold.
    const canSpite = spiteBites(a, au.leader) && a.spiteCap && target <= a.spiteCap;
    const canPress = a.pressLeft > 0 && target <= a.cap * 1.35 && target <= (a.budgetCap || Infinity);
    if (target > a.cap && !canSpite && !canPress) {
      a.folded = true;
      au.queue.push({ text: rivalLine(a.def, 'fold', R), col: PAL.dgray, sfx: 'fold', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
      if (a.everLed && !a.crowd) roomEvent('fold', a.def.name + ' is out.');
    } else tellAside(a, au.bid, false);        // still in, saying nothing: the body talks anyway
  }
  return raisedAny;
}
// ---- live tells: the faces in the room show where they are against their own number ----
// Every named rival is dealt a mode for the sale on its own dice: honest (the face tracks
// the number), silent (nothing shows), or bluff (they act nervous early and go cold when
// it actually gets close). A slow gavel's room leaks more; Salt Lick's theater bluffs
// more; a few people are who they are (Tuck says nothing, Dex hides nothing). The Ledger
// learns a face after enough sales: an honest sweat is worth money, a known act is a
// thing to bid straight through.
const TELL_BIAS = {
  tuck: { silent: 0.7 }, ilse: { silent: 0.85 }, ed: { silent: 0.5 }, garrity: { silent: 0.6 },
  sal: { bluff: 0.35 }, dutch: { bluff: 0.3 }, vera: { bluff: 0.3 }, delgado: { bluff: 0.25 },
  dex: { honest: 0.9 }, bart: { honest: 0.75 }, duo: { honest: 0.8 }, ferrell: { honest: 0.8 }, cody: { honest: 0.8 }, kaylee: { honest: 0.8 },
};
const TELL_SWEAT = 0.85, TELL_WARM = 0.6;          // honest: how far up their number the face changes
const TELL_ACT_LO = 0.3, TELL_ACT_HI = 0.6;        // bluff: the window where the act plays
function dealTell(a) {
  if (a.crowd) { a.tellMode = 'silent'; return; }
  const R = RNG(strHash('tell' + G.worldSeed + '_' + G.day + '_' + (G.cur ? G.cur.num : 0) + '_' + a.def.id));
  const auc = curAuctioneer();
  const bias = TELL_BIAS[a.def.id] || {};
  let bluff = bias.bluff != null ? bias.bluff : 0.15 + 0.4 * (townRule('bluffTells') || 0);
  let silent = bias.silent != null ? bias.silent : Math.min(0.5, Math.max(0.1, 0.25 / (auc.tellMult || 1)));
  if (bias.honest != null) { const rest = 1 - bias.honest; const t = bluff + silent || 1; bluff = rest * bluff / t; silent = rest * silent / t; }
  if (G.today && G.today.coffee) bluff *= 0.5;                      // coffee for the room: fewer of them act
  const roll = R.f();
  a.tellMode = roll < bluff ? 'bluff' : (roll < bluff + silent ? 'silent' : 'honest');
  a.toldTell = {};
}
// what the face shows at this bid: cool / warm / sweat / pride (pride only on a paddle past
// the number — you cannot hide a bid you just made). Bluff sweats early and cools when close.
function tellState(a, bid, leading) {
  if (a && pushingYou(a) && bid > a.cap) return pushReadable(a) ? 'push' : 'cool';   // they are not looking at the door
  if (!a || a.crowd || !a.cap || !a.tellMode || a.tellMode === 'silent') return 'cool';
  const r = bid / a.cap;
  if (r > 1) return leading ? 'pride' : (a.tellMode === 'honest' ? 'sweat' : 'cool');
  if (a.tellMode === 'honest') return r >= TELL_SWEAT ? 'sweat' : (r >= TELL_WARM ? 'warm' : 'cool');
  return (r >= TELL_ACT_LO && r < TELL_ACT_HI) ? 'sweat' : 'cool';
}
// what the Ledger has learned about a face: 'honest' (their sweat pays), 'act' (it does not), or null
function tellKnown(id) {
  const mem = (G.world && G.world.rivalMem) || {};
  const paid = (mem.tellPaid || {})[id] || 0, lied = (mem.tellLied || {})[id] || 0;
  if (lied >= 2 && lied >= paid) return 'act';
  if (paid >= 3 && paid > lied * 2) return 'honest';
  return null;
}
const TELL_STRIP = { push: { t: 'pushing you', c: PAL.orange }, warm: { t: 'wants it', c: PAL.yellow }, sweat: { t: 'sweating', c: PAL.lblue }, pride: { t: 'past it', c: PAL.lred }, act: { t: 'acting', c: PAL.dgray }, mark: { t: 'watching you', c: PAL.orange } };
// the written tell, once per state per sale, in the queue right behind the paddle it belongs to
function tellAside(a, bid, spite) {
  const au = G.auction;
  if (!au || a.crowd || !a.tellMode || a.tellMode === 'silent') return;
  if (au.darkUntil && G.time < au.darkUntil) return;   // nobody reads a face in the dark
  const st = spite ? 'pride' : tellState(a, bid, false);
  if (st !== 'sweat' && st !== 'pride') return;
  a.toldTell = a.toldTell || {};
  if (a.toldTell[st]) return;
  a.toldTell[st] = true;
  const pool = (FACE_TELLS[a.def.id] || {})[st] || FACE_TELLS_ANY[st];
  let text = au.R.pick(pool).replace(/\{name\}/g, shortRivalName(a.def));
  const known = st === 'sweat' ? tellKnown(a.def.id) : null;
  if (known === 'honest') text += ' You know this one. They are close.';
  else if (known === 'act') text += " You've seen this act before.";
  au.queue.push({ text, col: st === 'pride' ? PAL.lred : PAL.lblue, sfx: 'tell', npcId: a.def.id, react: st, showBid: au.bid, showLeader: leaderLabel(),
    arith: st === 'sweat' && known !== 'act' && Math.random() < 0.4 });
  if (st === 'sweat' && known !== 'act') roomEvent('tell', shortRivalName(a.def) + ' looks close to their number.', a.def.id);
  if (st === 'pride') roomEvent('pride', text, a.def.id);
}
// the sale is over: did the sweat mean anything? Three honest ones and the Ledger trusts a
// face; two acts and it stops believing them.
function learnTells(au) {
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  mem.tellPaid = mem.tellPaid || {}; mem.tellLied = mem.tellLied || {};
  for (const a of au.npcs) {
    if (!a.active || a.crowd || !a.toldTell || !a.toldTell.sweat) continue;
    const k = a.tellMode === 'honest' ? 'tellPaid' : (a.tellMode === 'bluff' ? 'tellLied' : null);
    if (k) mem[k][a.def.id] = (mem[k][a.def.id] || 0) + 1;
  }
}
// ============ the moves: CALL THEM OUT, LET SOMETHING SLIP, RUN THEM UP ============
// One of each a sale. They cost standing with a face (memory.js), never sun. A click on
// a face that is still in it opens the menu; a slip is a button by the door.
function faceClick(a) {
  const au = G.auction;
  if (G.auction && G.auction.dutch && !G.auction.done) { toast('No time for that. The clock is running.', PAL.gray, 2); return; }
  if (G.auction && G.auction.sealed && !G.auction.done) { toast('Nothing to say to them. Everybody is writing.', PAL.gray, 2); return; }
  if (a.def && a.def.phone) { toast('You cannot call out a telephone. Buzz covers the receiver anyway.', PAL.gray, 3); return; }
  if (!au || au.done || a.crowd || a.folded || !a.active) { npcIntroShow(a.def.id, 'auction'); return; }
  openFaceMenu(a);
}
// every in-screen state closes the same way, and the room goes on
function closeMoveMenu() { const au = G.auction; if (au) { au.sel = null; au.selMode = null; au.slipOpen = false; au.postureOpen = false; au.ask = null; au.roomHeld = false; } }
function openFaceMenu(a) {
  const au = G.auction;
  if (!au || !a) return;
  closeMoveMenu();
  au.sel = a.def.id; au.selMode = 'menu';
  au.roomHeld = true;                                  // the room holds while you size somebody up
}
// "You sure about that?" — across the room, by name. Somebody near their number steps
// back. Somebody who was not takes it personally and comes for you. You cannot know which
// without a tell, and it costs a point of standing either way (two if it backfires).
const CALLOUT_LINES = {
  fold: ['{name} looks at the door. Then at the ground. The paddle stays down.', '{name} opens their mouth, closes it, and steps back.', '"...Yeah." {name} is done.'],
  backfire: ['{name} turns all the way around. "Sure about YOURS?"', '{name} laughs once, without any fun in it, and lifts the paddle higher.', '"Now I want it." {name} means it.'],
  laugh: ['{name} laughs. It is not a mean laugh. It is worse.', '{name} does not look over. "Bid or don\'t."'],
};
const CALLOUT_SPECIAL = {
  sal: { always: 'backfire', backfire: ['Sal\'s grin comes all the way back. "There you are."', '"Oh, I\'m sure." Sal is looking at you now, not the door.'] },
  ilse: { always: 'laugh', laugh: ['The Baroness does not acknowledge that she was spoken to.'] },
  tuck: { fold: ['Tuck looks at you for a long time. Then he puts his hands in his pockets.'], laugh: ['Tuck looks at you for a long time. Then he raises the paddle.'] },
  dex: { fold: ['"Yeah no, you\'re right, you\'re right." Dex puts the phone down.'], backfire: ['"Bro." Dex is filming you now.'] },
  ed: { fold: ['Ed closes the notebook and nods, once, like you said something he already knew.'], backfire: ['Ed writes your name down. He did not need to look up to spell it.'] },
};
function callOut(a) {
  const au = G.auction, R = au.R;
  closeMoveMenu();
  if (!au || au.done || au.calledOut) return;
  au.calledOut = a.def.id;
  const nm = shortRivalName(a.def), sp = CALLOUT_SPECIAL[a.def.id] || {};
  qLine('You, across the room: "You sure about that, ' + nm + '?"', PAL.cyan);
  const near = au.bid >= a.cap * 0.85;
  const loud = au.posture === 'loud';
  let out = sp.always || (near ? (R.chance(loud ? 0.85 : 0.7) ? 'fold' : 'backfire') : (R.chance(0.75) ? 'backfire' : 'laugh'));
  if (loud) {                                         // on your feet, shouting across the yard: that is a bully, and the yard remembers a week
    const m = G.world.rivalMem = G.world.rivalMem || {};
    if ((m.bullyUntil || 0) < G.day) qLine('The yard will remember that for a week.', PAL.gray);
    m.bullyUntil = G.day + 7;
  }
  if (pushingYou(a) && au.bid > a.cap && !sp.always) {
    // they are past their own number and only because of you: said out loud, they are caught
    a.pushBack.off = true; a.cap = Math.min(a.cap, au.bid); a.pressLeft = 0; a.spiteCap = 0;
    standingBump(a.def.id, -1);
    au.queue.push({ text: nm + ' grins, caught, and the paddle goes down. The back row saw it too.', col: PAL.green, sfx: 'aside', npcId: a.def.id, react: 'glare', showBid: au.bid, showLeader: leaderLabel() });
    bump('calledOut'); bump('pushCaught');
    recordEvent('callout', { unit: G.cur.num, rival: a.def.id, out: 'caught' });
    return;
  }
  const line = R.pick(sp[out] || CALLOUT_LINES[out]).replace(/\{name\}/g, nm);
  standingBump(a.def.id, out === 'backfire' ? -2 : -1);
  if (out === 'fold') {
    // the next number is past them now: they fold on their own paddle, in their own words
    a.cap = Math.min(a.cap, au.bid); a.pressLeft = 0; a.spiteCap = 0;
    au.queue.push({ text: line, col: PAL.dgray, sfx: 'aside', npcId: a.def.id, react: 'glare', showBid: au.bid, showLeader: leaderLabel() });
  } else if (out === 'backfire') {
    a.spiteCap = Math.max(a.spiteCap || 0, Math.min(a.budgetCap || Infinity, Math.round(a.cap * 1.25)));
    a.pressLeft = (a.pressLeft || 0) + 1;
    au.queue.push({ text: line, col: PAL.lred, sfx: 'aside', npcId: a.def.id, react: 'glare', showBid: au.bid, showLeader: leaderLabel() });
  } else au.queue.push({ text: line, col: PAL.gray, sfx: 'aside', npcId: a.def.id, react: 'glare', showBid: au.bid, showLeader: leaderLabel() });
  bump('calledOut');
  recordEvent('callout', { unit: G.cur.num, rival: a.def.id, out });
}
// RUN THEM UP: pick a face and a number, and your paddle answers theirs by the minimum until
// they are past their own number (their pride shows — the room asks if you stop there) or
// your number is reached (you let them have it). If they step back first, the door is yours
// at your own bid: they called it. Anybody else taking the lead breaks the run and asks.
// The number you had to pick first was the wrong question (user, 2026-09-20: "there shouldn't be a set amount
// where you're going to try to run someone up, that doesn't make sense in my opinion"). You simply start pushing
// now - their face and your money in front of you - and STOP PUSHING is on the bar the whole time. The wallet is
// still the wall (bidCeiling), and every ask that used to stop the run still stops it.
function openRunUp(a) {
  const au = G.auction;
  if (!au || au.done || au.runUp || au.leader === 'you') return;
  if (au.bid + (au.step || 25) > bidCeiling()) { closeMoveMenu(); play('denied'); toast('Nothing to push with.', PAL.red); return; }
  closeMoveMenu();
  startRunUp(a, bidCeiling());
}
function stopRunUp(quiet) {
  const au = G.auction;
  if (!au || !au.runUp) return;
  const t = au.npcs.find((n) => n.def.id === au.runUp.id);
  au.runUpEnded = au.runUp; au.runUp = null;
  if (!quiet) qLine('You stop answering' + (t ? ' ' + shortRivalName(t.def) : '') + '. The number stands where it is.', PAL.cyan);
}
// ---- rivals push you back (the user's 2026-09-18 auction brief, built 2026-09-19) ----
// You can run a face up; now a face can run YOU up. One face at a door, at most, bids against your paddle past
// their own number - not for the door, for you - and stops where they dare (PUSHBACK_REACH over their number,
// never past the wallet). Why them, in the order it is checked:
//   even  - you pushed them in the last PUSHBACK_DAYS days and they saw it was you (rivalMem.owedPush)
//   sore  - standing -2 or worse
//   loud  - you were LOUD today: the yard thinks you will pay anything, and somebody means to find out
// Never on the first day, never a face who is warm to you or needs this door, never in the first spite war
// (that is its own fight), and never if you walked in QUIET: they cannot push a paddle they cannot see.
// How you know: while they are past their number their strip reads PUSHING YOU and the log says what they are
// doing - if you can read them. STEADY always reads it; LOUD reads only an honest face; the first push-back of a
// career is always shown, so it can be learned. What you can do about it, and none of it is always right:
//   pay it   - win anyway, over the odds. They are square with you (+1), and they will not push you over it again.
//   stop     - HOLD OFF while they lead past their number and it is theirs, at a price they never meant to pay.
//              The back row loves it; they blame you (-1), and the debt stands.
//   call it  - CALL THEM OUT while they are past their number and they are caught: the paddle goes down.
const PUSHBACK_DAYS = 3, PUSHBACK_EVEN = 0.6, PUSHBACK_SORE = 0.25, PUSHBACK_LOUD = 0.3;
const PUSHBACK_REACH = 1.4, PUSHBACK_NERVE = 0.9;
function pushingYou(a) { return !!(a && a.pushBack && !a.pushBack.off); }
function pushBackWhy(a) {
  const id = a.def.id, m = (G.world && G.world.rivalMem) || {};
  const owed = m.owedPush && m.owedPush[id];
  if (owed != null && G.day - owed <= PUSHBACK_DAYS) return { why: 'even', p: PUSHBACK_EVEN };
  if (standingOf(id) <= -2) return { why: 'sore', p: PUSHBACK_SORE };
  if (G.today && G.today.markedMoney) return { why: 'loud', p: PUSHBACK_LOUD };
  return null;
}
function pickPushBack(au) {
  if (!au || !G.world || G.demo || !G.cur || au.anon || au.spiteWar) return null;
  if (typeof openingDay === 'function' && openingDay(G.world, curTown(), G.day) === 1) return null;   // day one should not punish
  if (au.npcs.some((n) => n.pushBack)) return null;
  const R = RNG(strHash('pushback' + G.worldSeed + '_' + G.day + '_' + G.cur.num));   // its own dice: the room's are untouched
  for (const a of au.npcs) {
    if (!a.active || a.crowd || a.broke || a.def.phone || a.needs || warmOn(a.def.id)) continue;
    const w = pushBackWhy(a);
    if (!w || !R.chance(w.p)) continue;
    const to = Math.min(a.budgetCap || Infinity, Math.round(Math.max(a.cap || 0, G.cur.minBid || 0) * PUSHBACK_REACH));
    if (!(to > (a.cap || 0))) continue;                 // no room past their number to push with
    a.pushBack = { why: w.why, to, told: false, hit: 0 };
    return a;
  }
  return null;
}
// can you see it on them? STEADY reads it; LOUD reads only an honest face; the first one of a career always shows
function pushReadable(a) {
  const au = G.auction;
  if (!au || quietHidden(au)) return false;
  if (!(careerBook().pushedBackSeen > 0)) return true;
  return au.posture === 'steady' || a.tellMode === 'honest';
}
const PUSHBACK_TELLS = {
  even: '{name} has not forgotten the last door. They are not bidding on this one. They are bidding on you.',
  sore: '{name} is not looking at the door. {name} is looking at you.',
  loud: '{name} heard you all morning and thinks you will pay anything. They mean to find out.',
};
function pushBackAside(a, bid) {
  const au = G.auction, pb = a.pushBack;
  pb.hit = Math.max(pb.hit || 0, bid);
  if (a.def) bookWrite(a.def.splitFrom || a.def.id, 'counter', 'runs you up when you push him', false);
  if (pb.told || !pushReadable(a)) return;
  pb.told = true;
  if (!(careerBook().pushedBackSeen > 0)) bump('pushedBackSeen');
  au.queue.push({ text: PUSHBACK_TELLS[pb.why].replace(/\{name\}/g, shortRivalName(a.def)) + ' Stop, and it is theirs.', col: PAL.orange, sfx: 'tell', npcId: a.def.id, react: 'glare', showBid: au.bid, showLeader: leaderLabel() });
  roomEvent('pushback', a.def.name + ' is pushing you.');
}
// the hammer, either way
function pushBackSettle(au, wonByYou) {
  const a = au.npcs.find((n) => pushingYou(n) && n.pushBack.hit > (n.cap || 0));
  if (!a) return false;
  const id = a.def.id, nm = shortRivalName(a.def), m = G.world.rivalMem = G.world.rivalMem || {};
  if (wonByYou) {
    // you paid it: they got what they came for, and now you are square
    const over = Math.max(0, au.bid - a.cap);
    standingBump(id, 1);
    if (m.owedPush) delete m.owedPush[id];
    au.queue.push({ text: nm + ' was never buying. That was ' + fmt$(over) + ' of you, and ' + nm + ' looks very pleased about it. You are square now.', col: PAL.orange, sfx: 'aside', npcId: id, react: 'win', showBid: au.bid, showLeader: 'you' });
    recordEvent('pushedBack', { unit: G.cur.num, rival: id, rivalName: a.def.name, amt: over, paid: au.bid, why: a.pushBack.why });
    bump('pushedBack');
  } else {
    // you stopped, and they are left holding a door they never wanted
    standingBump(id, -1);
    au.queue.push({ text: nm + ' was only pushing you. Now ' + nm + ' owns it, at ' + fmt$(au.bid) + '. The back row enjoys that very much.', col: PAL.green, sfx: 'aside', npcId: id, react: 'glare', showBid: au.bid, showLeader: leaderLabel(), then: () => play('crowd_ooh', 0.7) });
    recordEvent('pushStuck', { unit: G.cur.num, rival: id, rivalName: a.def.name, amt: au.bid - a.cap, paid: au.bid });
    bump('pushStuck');
  }
  a.pushBack.off = true;
  return true;
}
// ---- the room calls your bluff (the user's 2026-09-18 auction brief, built 2026-09-19) ----
// Push once and it is a move. Push every day and it is a habit, and the yard learns habits. Every push they
// could see (not from the back) is written down (event 'pushed'); count the ones in the last BLUFF_WINDOW days
// and, from the second on, a face you start pushing may simply let you have it: they answer a raise or two to
// look interested, then lower the paddle and leave the door with you, at your own number - the drop
// (soldToYou's runUp branch: DIG IT / FLIP TO PETE / LEAVE IT). How likely: BLUFF_CALL by how many pushes they
// have seen, plus the face's own nose (BLUFF_NOSE: Ed writes it all down, Sal would rather fight than be clever,
// the Baroness does not notice you). You are warned: the moment you start, somebody in the room says it out
// loud once you have pushed twice this week, and the push picker says how many times the yard has seen you do it.
// Nothing about it is always right: a face at their number still steps back for real, and a push on a face
// who calls it can still be a door you wanted - pushing is a gamble on the door as well as the face.
// QUIET hides it: a push from the back is not written down and cannot be called.
const BLUFF_WINDOW = 7;
const BLUFF_CALL = [0, 0, 0.2, 0.35, 0.5, 0.6];        // by pushes the yard has seen this week (before this one)
const BLUFF_NOSE = { ed: 0.2, tuck: 0.1, garrity: 0.1, dex: -0.1, sal: -1, ilse: -1 };
function pushesSeen() { return countEvents('pushed', { sinceDay: G.day - BLUFF_WINDOW + 1 }); }
function bluffCallChance(a, seen) {
  const n = seen == null ? pushesSeen() : seen;
  const base = BLUFF_CALL[Math.min(BLUFF_CALL.length - 1, n)];
  if (!base) return 0;
  return Math.max(0, Math.min(0.85, base + (BLUFF_NOSE[a.def.id] || 0)));
}
const BLUFF_MUTTER = [
  'Somebody near the back, not quietly: "Here we go again."',
  'A voice from the crowd: "That one does this every day."',
  '"Watch - they do not even want it," somebody says, loud enough.',
];
const BLUFF_CALL_LINES = [
  '{name} smiles and lowers the paddle. "Go on, then. It\'s yours."',
  '{name} looks right at you and folds their arms. "No. You have it."',
  '{name} shrugs. "I have seen you do this all week. Enjoy it."',
];
function bluffCallRoll(au, a) {
  const seen = pushesSeen();
  if (seen >= 2) {
    au.queue.push({ text: au.R.pick(BLUFF_MUTTER), col: PAL.orange, sfx: 'aside', showBid: au.bid, showLeader: leaderLabel() });
    roomEvent('mutter', 'The room has seen you push before.');
  }
  const p = bluffCallChance(a, seen);
  const R = RNG(strHash('bluffcall' + G.worldSeed + '_' + G.day + '_' + G.cur.num + '_' + a.def.id));   // its own dice
  if (p > 0 && R.chance(p)) a.callsBluff = { after: 1 + (R.chance(0.5) ? 1 : 0), done: false, seen };
}
function bluffCallNow(au, t) {
  t.callsBluff.done = true;
  t.cap = Math.min(t.cap, au.bid); t.pressLeft = 0; t.spiteCap = 0;
  if (t.pushBack) t.pushBack.off = true;
  au.bluffCalledBy = t.def.id;
  au.queue.push({ text: au.R.pick(BLUFF_CALL_LINES).replace(/\{name\}/g, shortRivalName(t.def)), col: PAL.lred, sfx: 'fold', npcId: t.def.id, react: 'glare', showBid: au.bid, showLeader: leaderLabel() });
  roomEvent('bluffcall', t.def.name + ' called your bluff.');
  bump('bluffsCalledOnYou');
}
// ---- the clerk's warning about pushing (the user's 2026-09-18 auction brief, built 2026-09-19) ----
// A yard lives on people believing the price. PUSH_WARN_AT pushes the room saw in a week and, the next morning,
// the clerk calls you to the office window (the same card as Bart's warning): he has noticed, and from now on it
// goes on your account. For PUSH_WARN_DAYS after that, every push you are seen making costs PUSH_FEE (paid, or on
// the weekly bill if you are short - and a bill unpaid costs a van row) and the clerk's trust (clerkTrust takes a
// point for each, up to PUSH_TRUST_MAX), which is the office's rumours, favours and tier. Once a week at most,
// never on the first day, and never the same morning as Bart's warning. A push from the back is never seen.
// It is a price, not a ban: a push that wins you the door you wanted can still be worth fifty dollars.
const PUSH_WARN_AT = 3, PUSH_WARN_DAYS = 7, PUSH_FEE = 50, PUSH_TRUST_MAX = 4;
function pushWarnDay() { const m = (G.world && G.world.rivalMem) || {}; return m.pushWarnDay; }
function pushWarnedNow() { const d = pushWarnDay(); return d != null && G.day >= d && G.day - d < PUSH_WARN_DAYS; }
function pushWarnTick() {
  const w = G.world;
  if (!w || w.noArcs || G.demo || !G.today) return;
  if (G.today.clerkWarn) return;                            // one thing at the window a morning: this waits for tomorrow
  if (typeof openingDay === 'function' && openingDay(w, TOWNS[w.town], G.day) === 1) return;
  const m = w.rivalMem = w.rivalMem || {};
  if (m.pushWarnDay != null && G.day - m.pushWarnDay < PUSH_WARN_DAYS) return;   // once a week at most
  const n = countEvents('pushed', { sinceDay: G.day - PUSH_WARN_DAYS, where: (e) => e.day < G.day });
  if (n < PUSH_WARN_AT) return;
  m.pushWarnDay = G.day;
  G.today.pushWarn = true; G.today.pushWarnN = n;
  recordEvent('pushWarning', { n });
  bump('pushWarnings');
}
function pushWarnSeen() {
  if (G.today) G.today.pushWarn = false;
  play('ui_click', 0.5);
}
function startRunUp(a, to) {
  const au = G.auction;
  closeMoveMenu();
  au.runUp = { id: a.def.id, to, askedPride: false, hidden: quietHidden(au) };
  au.runUpT = 0;
  if (!quietHidden(au)) {
    standingBump(a.def.id, -1);                         // they notice who keeps answering them - unless they cannot see you
    const m = G.world.rivalMem = G.world.rivalMem || {};
    (m.owedPush = m.owedPush || {})[a.def.id] = G.day; // and they mean to pay it back (pickPushBack)
    bluffCallRoll(au, a);                               // pushed too often lately? they may just let you have it
    const warned = pushWarnedNow();
    recordEvent('pushed', { unit: G.cur.num, rival: a.def.id, warned });
    if (warned) {                                       // the clerk told you: it goes on your account
      if (G.money >= PUSH_FEE) { spend(PUSH_FEE); qLine('At the office window the clerk writes something down. ' + fmt$(PUSH_FEE) + ', like he said.', PAL.orange); }
      else { dumpOwe(PUSH_FEE); qLine('At the office window the clerk writes something down. ' + fmt$(PUSH_FEE) + ' on your bill, like he said.', PAL.orange); }
      bump('pushFees');
    }
  }
  qLine(quietHidden(au) ? 'From the back, you start answering ' + shortRivalName(a.def) + '. Every time. They cannot see who.'
    : 'You start answering ' + shortRivalName(a.def) + '. Every time.', PAL.cyan);
  if (au.posture === 'loud' && !a.pushedLoud) {
    // they have watched you on your feet all sale: they would happily leave it with you
    a.pushedLoud = true;
    a.cap = Math.max(au.bid || 0, Math.round(a.cap * LOUD_PUSH_GIVE));
    qLine(shortRivalName(a.def) + ' has watched you on your feet all sale. They would happily leave this one with you.', PAL.orange);
  }
  qLine('"They\'ve named a number, folks, and they\'re not saying it."', PAL.orange);
  speak(['auc_limit_named']);
  if (au.leader === a && !au.closing) { au.runUpT = RAISE_PACE; }
}
function runUpTick(a, dt) {
  const ru = a.runUp;
  if (!ru || a.done || a.closing || a.roomHeld) return false;
  const t = a.npcs.find((n) => n.def.id === ru.id);
  if (!t || !a.leader || a.leader === 'you') return false;
  const nm = shortRivalName(t.def);
  if (a.leader !== t) {
    // somebody else took it off them: the run is broken, and the room asks
    const other = a.leader;
    a.runUp = null; a.roomHeld = true;
    a.ask = {                                          // the question is the newest line; the bar is the answers
      title: 'Somebody else is in it.',
      lines: [{ text: other.def.name + ' took the lead off ' + nm + '. The bid is ' + fmt$(a.bid) + '.', col: PAL.white },
              { text: 'Keep pushing whoever leads, bid it yourself, or leave it with them?', col: PAL.yellow }],
      buttons: [
        { label: 'KEEP PUSHING', cb: () => { closeMoveMenu(); a.runUp = { id: other.def.id, to: ru.to, askedPride: false }; }, col: PAL.red },
        { label: 'BID MYSELF', cb: closeMoveMenu, col: PAL.slate },
        { label: 'LEAVE IT', cb: () => { closeMoveMenu(); a.runUpEnded = ru; playerPass(); }, col: PAL.dgreen },
      ],
    };
    return true;
  }
  // past their own number on their own paddle: what you were waiting for
  const pride = (a.events || []).find((e) => e.kind === 'pride' && e.who === ru.id);
  if (pride && !ru.askedPride) {
    ru.askedPride = true;
    a.events = a.events.filter((e) => e !== pride);
    a.roomHeld = true;
    a.ask = {
      title: nm + (t.def.id === 'duo' ? ' are' : ' is') + ' past the number.',   // Cody and Kaylee are two people
      lines: [{ text: pride.text, col: PAL.lred }, { text: 'The bid is ' + fmt$(a.bid) + '. Stop here and it is theirs, at that price.', col: PAL.yellow }],
      buttons: [
        { label: 'STOP HERE', cb: () => { closeMoveMenu(); a.runUpEnded = ru; a.runUp = null; playerPass(); }, col: PAL.dgreen },
        { label: 'ONE MORE', cb: closeMoveMenu, col: PAL.red },
      ],
    };
    return true;
  }
  // STEADY reads it: the next raise of yours is past what they will pay. One more and it is probably yours.
  if (a.posture === 'steady' && !ru.warnedNear && a.bid + (a.step || 25) > (t.cap || 0) && a.bid + (a.step || 25) <= ru.to) {
    ru.warnedNear = true;
    a.roomHeld = true;
    a.ask = {
      title: nm + (t.def.id === 'duo' ? ' are' : ' is') + ' at their number.',
      lines: [{ text: 'You can see it from here: the jaw, the paddle hand. One more from you and they step back.', col: PAL.white },
              { text: 'The bid is ' + fmt$(a.bid) + '. Stop now and it is theirs. One more and it is probably yours.', col: PAL.yellow }],
      buttons: [
        { label: 'STOP HERE', cb: () => { closeMoveMenu(); a.runUpEnded = ru; a.runUp = null; playerPass(); }, col: PAL.dgreen },
        { label: 'ONE MORE', cb: closeMoveMenu, col: PAL.red },
      ],
    };
    return true;
  }
  if (a.bid >= ru.to || a.bid + (a.step || 25) > bidCeiling()) {
    a.runUpEnded = ru; a.runUp = null;
    qLine('Far enough. You let ' + nm + ' have it.', PAL.cyan);
    playerPass();
    return true;
  }
  a.runUpT = (a.runUpT || 0) + dt;
  if (a.runUpT < RAISE_PACE) return true;
  a.runUpT = 0;
  ru.raises = (ru.raises || 0) + 1;
  // the raise they have decided not to answer: out before the room answers your paddle, and said after it
  const calling = t.callsBluff && ru.raises >= t.callsBluff.after && !t.callsBluff.done;
  if (calling) { t.folded = true; t.rejoined = true; }
  playerBid(a.step || 25);
  if (calling) bluffCallNow(a, t);
  return true;
}
// LET SOMETHING SLIP, as a deck (docs/AUCTION_OVERHAUL_2.md step 3). A handful of things you can say
// out loud about a door, true or not. Each has an audience (who can believe it), an effect (what
// believing it does to their number) and a bill. Each line once a sale, and every line after the
// first is believed half as much: the room has heard you. Who believes still depends on the face
// (Ed never, Hattie nearly always), your standing, and how often you have been caught. A cool or
// hot line is settled when the door is dug (settleSlip) and felt in that yard later (slipFallout).
// Ed writes it down, the Baroness does not hear it, and Dutch repeats it louder and wrong.
const SLIP_BELIEVES = { ed: 0, ilse: 0.1, tuck: 0.3, garrity: 0.3, sal: 0.4, vale: 0.45, bart: 0.65, duo: 0.75, ferrell: 0.85, hattie: 0.9, dex: 0.9 };
function slipBelieveChance(a) {
  if (G.today && G.today.markedMoney) return 0;          // you were LOUD today: nobody believes a word
  const mem = G.world.rivalMem || {};
  let p = SLIP_BELIEVES[a.def.id] != null ? SLIP_BELIEVES[a.def.id] : 0.6;
  const sv = standingOf(a.def.id);
  if (sv >= 1) p += 0.15; else if (sv <= -1) p -= 0.25;
  p -= 0.2 * Math.min(2, mem.slipsCaught || 0);
  return Math.max(0, Math.min(0.95, p));
}
// aud: the faces it is aimed at (they believe at full chance, everyone else at `others`);
// no aud: everyone at `audMult`. mult: what believing does to their number.
// ---- a face of your own at the rope (IDEAS_TODO 6; built 2026-09-16) ----
// The rivals have tells and some of them act; you only had postures. Now you can PERFORM, and the room reads
// you through the machinery it already uses to decide whether to believe what you say (slipBelieveChance):
// your standing with that face, how many times the yard has caught you at it before (slipsCaught), and the
// fade that makes every extra thing you do this sale less convincing. Going LOUD sets markedMoney, which makes
// slipBelieveChance return 0 - on a day you have already told the yard you are money, nobody buys a face at
// all. That is the pairing with LOUD and QUIET rather than a replacement for them.
// ONE face a sale. There are exactly two of them, so letting you wear both would be no limit at all.
// Each is a real gamble with opposite outcomes, which is what stops it being a formula to master:
//   CERTAIN  believed -> they stop pushing you and shade their number down. Seen through -> they push harder.
//   RATTLED  believed -> they smell the kill and climb PAST their own number. Seen through -> they ease off.
// So CERTAIN is how you buy cheap and RATTLED is how you run somebody up, and each one, read wrong, does the
// exact opposite to you. Being caught costs nothing today; it costs belief for the rest of the career.
const FACE_MAX = 1;
const FACE_CERTAIN_CAP = 0.95, FACE_RATTLED_CAP = 1.08;
function facesLeft(au) { au = au || G.auction; return au ? (au.faceLeft == null ? FACE_MAX : au.faceLeft) : 0; }
// ---- ten things to say for each way in (docs/AUCTION_REDESIGN.md §3; the user, 2026-09-19) ----
// "Each of these phases should have like ten things each that are related to their stage. The big thing about
// these different stages is the things you get to say and try to manipulate other buyers - you could try to get
// other rivals to run each other up."
// So every row now says WHERE it can be said (`where`: the three ways in, by their door names - join / loud /
// quiet), and there are three sets of about ten. What changes with where you stand is not only the wording:
//   UP FRONT  you are seen and heard. The lines are public, direct and personal, and they cost standing.
//   AT THE BACK  nobody knows who said it: the lines cost NO standing and are never written down against you
//                (`anon`), but they are believed a little less, because a voice is not a face.
//   IN THE CROWD  the old deck: a bit of both, and the two performances, which need to be seen.
// The new rows all run through one handler (`sayMove`), so each is a short spec rather than its own code path:
//   room  everybody's number moves by `mult`; `press` adds or clears a push; `fold` folds anybody already past it
//   aim   one face (the leader, or whoever the door plays to) takes it
//   lead  the one in front: dared, they spend their number NOW and have nothing left
//   crowd the room bids it up one step without your paddle
//   hurry the count starts, if the room lets it
const SAY_MOVES = [
  // ---------- UP FRONT: said to the whole yard, with your name on it ----------
  { id: 'allday', kind: 'move', label: 'ALL DAY', where: ['loud'],
    say: ['"I\'ll be here all day, folks."', '"I\'ve got nowhere to be."'],
    hint: 'nervous paddles come down. the stubborn ones dig in.',
    eff: { type: 'room', mult: 0.9, press: -1, sawPress: 1 } },
  { id: 'mine', kind: 'move', label: "THAT ONE'S MINE", where: ['loud'],
    say: ['"That one\'s mine, folks. Save yourselves the arm."'],
    hint: 'anybody already at their number steps off. anybody who is not takes it personally.',
    eff: { type: 'room', mult: 0.88, fold: true, sawSpite: 1.2, cost: 1 } },
  { id: 'roll', kind: 'move', label: 'SHOW THE ROLL', where: ['loud'],
    say: ['(you count it out where they can see it, slowly)'],
    hint: 'they price you, not the door: their numbers drop. and every one of them remembers it.',
    eff: { type: 'room', mult: 0.85, costAll: 1 } },
  { id: 'best', kind: 'move', label: 'NAME YOUR BEST', where: ['loud'],
    say: ['"Go on. Name your best number and we\'ll all go home."'],
    hint: 'dare whoever leads: they spend their whole number now, and have nothing after it. or they sit on it and smile.',
    eff: { type: 'lead', cost: 1 } },
  { id: 'anyone', kind: 'move', label: 'ANYBODY ELSE?', where: ['loud'],
    say: ['"Anybody else? No? Buzz, take it."'],
    hint: 'hurry the hammer while they are thinking. one of them will not like being hurried.',
    eff: { type: 'hurry', sawPress: 1 } },
  // ---------- AT THE BACK: a voice, not a face. No standing, and never written down ----------
  { id: 'rumour', kind: 'move', label: 'START SOMETHING', where: ['quiet'],
    say: ['"...heard the office had it flagged."', '"...somebody said this one was already picked over."'],
    hint: 'a rumour from nobody in particular. every number comes down a little, and nobody knows who said it.',
    eff: { type: 'room', mult: 0.88, anon: true } },
  { id: 'overheard', kind: 'move', label: 'LET THEM OVERHEAR', where: ['quiet'],
    say: ['(you say it to the man beside you, at exactly the wrong volume)'],
    hint: 'one face hears what you wanted them to hear. their number drops, and it cost you nothing.',
    eff: { type: 'aim', mult: 0.78, anon: true } },
  { id: 'whisper', kind: 'move', label: 'TALK IT UP TO ONE', where: ['quiet'],
    say: ['(you tell the man beside you what you think it is worth, and let it travel)'],
    hint: 'one face climbs. let them spend it on somebody else.',
    eff: { type: 'aim', mult: 1.22, press: 1, anon: true } },
  { id: 'nudge', kind: 'move', label: 'NUDGE THE FRONT ROW', where: ['quiet'],
    say: ['(you lean forward and say two words to a man with a paddle)'],
    hint: 'somebody else raises it for you. your paddle never moves, and their money is the one going.',
    eff: { type: 'crowd', anon: true } },
  { id: 'leaving', kind: 'move', label: 'MAKE FOR THE DOOR', where: ['quiet'],
    say: ['(you pick up your coat and start for the gate)'],
    hint: 'the room decides it is over. everybody relaxes, and nobody is watching the back.',
    eff: { type: 'room', mult: 0.94, press: -1, anon: true } },
  { id: 'grumble', kind: 'move', label: 'GRUMBLE', where: ['quiet'],
    say: ['"...prices in here lately."', '"...paying yard rates for other people\'s rubbish."'],
    hint: 'the whole room remembers what everything cost last week. a little comes off every number.',
    eff: { type: 'room', mult: 0.95, anon: true } },
  { id: 'cough', kind: 'move', label: 'COUGH', where: ['quiet'],
    say: ['(you cough, once, at exactly the wrong moment)'],
    hint: 'only while the hammer is coming down: Buzz loses his place and has to start the count again.',
    eff: { type: 'stall', anon: true } },
  // ---------- IN THE CROWD: the middle. One of the yard's own questions. ----------
  { id: 'askbuzz', kind: 'move', label: 'ASK BUZZ', where: ['join'],
    say: ['"Buzz — anything on the paperwork for this one?"'],
    hint: 'a fair question, asked in front of everybody. Buzz answers, and the room hears it the way it wants to.',
    eff: { type: 'room', mult: 0.93, buzz: true } },
];
const SAY_DECK = [
  { id: 'mildew', kind: 'cool', label: 'IT SMELLS', where: ['join', 'loud'], say: ['"Smells like mildew from here, folks."', '"That\'s wet cardboard. You can smell it from here."'],
    hint: 'box and condition people believe it. their numbers drop.', aud: ['bev', 'priscilla', 'dee', 'cobb', 'hattie', 'ferrell', 'duo', 'bart', 'charlie'], audMult: 1, others: 0.5, mult: 0.8 },
  { id: 'marantz', kind: 'heat', label: 'THE GOOD STUFF', where: ['join', 'loud'], say: ['"That\'s a Marantz box in the back."', '"Somebody packed that like it mattered."'],
    hint: 'maker, shine and feel people believe it. their numbers climb.', aud: ['vale', 'charlie', 'dex', 'wanda', 'vera', 'garrity'], audMult: 1, others: 0.4, mult: 1.25 },
  { id: 'nextdoor', kind: 'cool', label: 'I HAD THE NEXT ONE', where: ['join', 'loud'], say: ['"I had the unit next to this one. Nothing."'],
    hint: 'everybody, a little. win it and it is good: the paper prints it.', aud: null, audMult: 0.5, others: 0.5, mult: 0.9 },
  { id: 'name', kind: 'cool', label: 'NAME ONE', where: ['join', 'loud'], hint: 'one face re-reads it low, in their own trade. costs a point with them.' },
  { id: 'point', kind: 'point', label: 'POINT SAL', where: ['join', 'loud', 'quiet'], hint: "Sal's spite turns on somebody else. they will know you did it - unless they cannot see you." },
  { id: 'feud', kind: 'point', label: 'THOSE TWO', where: ['join', 'loud', 'quiet'], hint: 'remind two people who hate each other why. from the back, nobody knows who reminded them.' },
  { id: 'certain', kind: 'face', label: 'LOOK CERTAIN', where: ['join', 'loud'], say: ['(you set your jaw, look at the door, and do not look at the price)'],
    hint: 'let them think you will not stop. believed, they stop pushing. seen through, they push harder.' },
  { id: 'rattled', kind: 'face', label: 'LOOK RATTLED', where: ['join', 'loud'], say: ['(you check your pocket, twice, and let the room see you do it)'],
    hint: 'let them think you are nearly out. believed, they climb past their own number. seen through, they ease off.' },
  { id: 'look', kind: 'look', label: 'SECOND LOOK', where: ['join', 'loud', 'quiet'], say: ['"Buzz, can we get a second look?"'], hint: 'the whole room looks again. their numbers move. 3 energy.', cost: 3 },
  { id: 'quiet', kind: 'posture', label: 'SAY NOTHING', where: ['join', 'loud'], say: ['(nothing, loudly)'], hint: 'take the back row: a paddle and no face, and nothing you say after it is traced to you. 5 energy, your one change.' },
].concat(SAY_MOVES);
// where you are standing, in the deck's own words: the door calls them join / loud / quiet
function sayWhere(au) { const p = (au && au.posture) || 'steady'; return p === 'steady' ? 'join' : p; }
function sayRowHere(line, au) { return !line.where || line.where.includes(sayWhere(au)); }
// NAME ONE, in their own trade
const SAY_NAME_LINES = {
  pruitt: '"{name}, that is all cardboard. You can hear it."',
  bev: '"{name}, those boxes are empty. Look how they sit."',
  hattie: '"{name}, the paper had the wrong unit. Again."',
  delgado: '"{name}, the paper got this one right for once."',
  charlie: '"{name}, that shine is foil."',
  priscilla: '"{name}, there is a water line on everything."',
  vale: '"{name}, that stamp is a knockoff."',
  cobb: '"{name}, those tools are all rust."',
  dee: '"{name}, that is veneer. Every piece."',
  wanda: '"{name}, it is not strange. It is just old."',
  bart: '"{name}, the front row is all there is."',
  dex: '"{name}, bad vibes. Trust me."',
};
const SAY_NAME_ANY = '"{name}, there is nothing in there. I looked."';
// POINT SAL, at somebody whose trade the door plays to
const POINT_THING = { dee: 'furniture', cobb: 'tools', pruitt: 'scrap by the pound', bev: 'boxes', wanda: 'the weird stuff', vale: 'a name brand',
  charlie: 'chrome', priscilla: 'mint', hattie: 'the one in the paper', delgado: 'the one the paper skipped', bart: 'the front row' };
function sayFace(a) { return a && a !== 'you' && a.active && !a.crowd && !a.folded; }
function nameTarget(au) {
  if (sayFace(au.leader)) return au.leader;
  const room = au.npcs.filter(sayFace);
  return room.find((a) => SAY_NAME_LINES[a.def.id]) || room[0] || null;
}
function pointTarget(au, sal) {
  const room = au.npcs.filter((a) => sayFace(a) && a !== sal);
  return room.find((a) => a.def.id === 'dee' || a.def.id === 'cobb') || (sayFace(au.leader) && au.leader !== sal ? au.leader : null) || room[0] || null;
}
// the two with history, if they are both still standing. Either the feud already caught today, or they
// are simply both here and you are about to remind them (feudStokeLine).
function feudFacesIn(au) {
  const lit = au.npcs.find((a) => sayFace(a) && a.feud);
  if (lit) { const o = au.npcs.find((x) => sayFace(x) && x.def.id === lit.feud); if (o) return [lit, o]; }
  const pair = (typeof feudPairFor === 'function') ? feudPairFor(G.world.town) : null;
  if (!pair) return null;
  const a = au.npcs.find((x) => sayFace(x) && x.def.id === pair[0] && !x.def.splitFrom);
  const b = au.npcs.find((x) => sayFace(x) && x.def.id === pair[1] && !x.def.splitFrom);
  return a && b ? [a, b] : null;
}
function feudStokeLine(a, b) {
  return '"' + shortRivalName(a.def) + '. You know ' + shortRivalName(b.def) + ' says you only buy what nobody else wanted."';
}
function pointLine(other) {
  const nm = shortRivalName(other.def);
  return '"Sal. Sal. It is ' + (POINT_THING[other.def.id] || nm + "'s kind of thing") + ', Sal. It is for ' + nm + '."';
}
// what the deck offers right now: each row open, said, or not possible here
function sayRows() {
  const au = G.auction;
  const said = (au && au.said) || [];
  return SAY_DECK.filter((line) => sayRowHere(line, au)).map((line) => {
    const used = said.some((x) => x.id === line.id);
    let ok = !!au && !au.done && !used, text = line.say ? line.say[0] : '', target = null;
    if (line.kind === 'move') {
      const eff = line.eff || {};
      if (eff.type === 'lead') { target = au && sayFace(au.leader) ? au.leader : null; ok = ok && !!target; if (!target) text = 'nobody is in front to dare.'; }
      else if (eff.type === 'aim') { target = au ? nameTarget(au) : null; ok = ok && !!target; if (!target) text = 'nobody here to aim it at.'; }
      else if (eff.type === 'crowd') { ok = ok && !!au && au.npcs.some((a) => sayFace(a) && a !== au.leader); if (!ok && !used) text = 'nobody beside you worth the words.'; }
      else if (eff.type === 'hurry') ok = ok && !!au && !au.closing && !!au.leader;
      else if (eff.type === 'stall') { ok = ok && !!au && !!au.closing; if (!ok && !used) text = 'nothing to interrupt yet.'; }
      else ok = ok && !!au && au.npcs.some(sayFace);
    }
    if (line.id === 'name') {
      target = au ? nameTarget(au) : null; ok = ok && !!target;
      text = target ? (SAY_NAME_LINES[target.def.id] || SAY_NAME_ANY).replace(/\{name\}/g, shortRivalName(target.def)) : 'nobody here to name.';
    } else if (line.id === 'point') {
      const sal = au ? au.npcs.find((a) => a.def.id === 'sal' && sayFace(a)) : null;
      target = sal ? pointTarget(au, sal) : null; ok = ok && !!target;
      text = target ? pointLine(target) : (sal ? 'nobody here to point Sal at.' : 'Sal is not in this one.');
    } else if (line.id === 'feud') {
      const pair = au ? feudFacesIn(au) : null;
      target = pair ? pair[0] : null; ok = ok && !!pair;
      text = pair ? feudStokeLine(pair[0], pair[1]) : 'nobody here with that kind of history.';
    } else if (line.kind === 'face') { ok = ok && facesLeft(au) > 0 && au.npcs.some(sayFace); text = line.say[0]; }
    else if (line.id === 'look') ok = ok && G.daylight >= line.cost;
    else if (line.id === 'quiet') ok = ok && au.posture !== 'quiet' && !au.postureSwitched && G.daylight >= POSTURES.quiet.cost;
    return { line, ok, used, text, target };
  });
}
function openSlipMenu() {
  const au = G.auction;
  if (!au || au.done || !sayRows().some((r) => r.ok)) return;
  closeMoveMenu();
  au.slipOpen = true; au.roomHeld = true;             // the slip rises out of the log
}
// ---- the room answers what you said, in its own voices (AUCTION_NOTES 2026-09-14: "make the systems speak") ----
// cy / cn: a cool line (it smells, I had the next one) believed / shrugged off; hy / hn: a hot line; ny / nn: NAME ONE
// aimed at them; fold: the sentence was the last straw. Ed and the Baroness keep their own fixed answers.
const SAY_REACT = {
  bart: { cy: 'Bart squints at the door. "Mildew." He says it like it cost him money.', cn: 'Bart laughs at you. Big laugh. Bigger than it needed to be.',
    hy: "Bart leans in. If it's good enough to lie about, it's good enough for Bart.", hn: '"Son, I can see the door from here." Bart does not move.',
    ny: 'Bart looks at the front row for a long time. It stops looking so good.', nn: '"I know what I see, son." Bart keeps his paddle up.',
    fold: 'Bart tucks the paddle under his arm. "Front row\'s all there is. The kid\'s right."' },
  sal: { cy: 'Sal sniffs. Loudly. At you.', cn: '"Oh, NOW he\'s an expert." Sal is enjoying this.',
    hy: 'Sal\'s eyebrows go up. Then they go up at you.', hn: 'Sal mouths "liar" across the yard. Warmly.',
    ny: 'Sal looks at the door, then at you. He is doing sums about you, not the door.', nn: '"Say my name again." Sal is thrilled.',
    fold: 'Sal spits. "Keep your mildew." Out.' },
  dutch: { cy: 'Dutch wrinkles his nose so hard his hat moves.', cn: 'Dutch yips at you. It is a skeptical yip.',
    hy: 'Dutch lets out a small, greedy yip.', hn: '"YIP." Dutch does not believe you, at volume.',
    ny: 'Dutch goes quiet. Nobody has ever seen Dutch go quiet.', nn: '"NOT ME. YIP."',
    fold: 'Dutch yips once, sadly, and wanders off.' },
  duo: { cy: 'Kaylee elbows Cody. "He said mildew." "I HEARD."', cn: '"He\'s lying." "How do you know?" "He\'s got a face."',
    hy: '"Did you hear that?" "The box?" "THE BOX, Cody."', hn: 'Cody starts to believe you. Kaylee stops him with one look.',
    ny: 'Cody and Kaylee argue about you in a whisper. Kaylee wins. The number goes down.', nn: '"He\'s trying to split us up." "We\'re not splitting up." "I KNOW."',
    fold: 'Kaylee takes the paddle off Cody. "We\'re done here."' },
  vera: { cy: 'Vera texts her city buyer the word "mildew."', cn: 'Vera does not look up from her phone.',
    hy: 'Vera photographs the door for her buyer. Twice.', hn: '"My buyer checks, darling." Vera smiles without meaning it.',
    ny: 'Vera\'s buyer replies with a thumbs-down. Vera sighs.', nn: '"I don\'t sell your opinions, darling."',
    fold: 'Vera\'s buyer says no. Vera says no. Out.' },
  tuck: { cy: 'Tuck sniffs the air once.', cn: 'Tuck looks at you. That is all.',
    hy: 'Tuck tilts his hat back half an inch.', hn: 'Tuck does not look at the door, or at you.',
    ny: 'Tuck nods, very slightly, which for Tuck is a speech.', nn: 'Tuck looks at you until you look away.',
    fold: 'Tuck touches his hat and walks to the truck.' },
  bev: { cy: 'Bev pokes the nearest box with her boot. It squishes. Or she thinks it does.', cn: '"Boxes don\'t smell, love. People do."',
    hy: 'Bev counts the boxes again, faster.', hn: 'Bev taps a box. Hollow. She looks at you like you owe her.',
    ny: 'Bev looks at the boxes like a friend who lied to her.', nn: '"I count, love. I don\'t listen."',
    fold: 'Bev folds her hands on her paddle. "Wet boxes. No thank you."' },
  pruitt: { cy: 'Pruitt frowns. Wet weighs more, but it pays less.', cn: '"Smell don\'t weigh nothing." Pruitt slaps the tailgate.',
    hy: 'Pruitt licks his thumb and holds it up, as if the door has weather.', hn: '"Heavy is heavy." Pruitt is not interested in brands.',
    ny: 'Pruitt knocks on the doorframe. It sounds like cardboard. He hates that.', nn: '"I can hear a pound from here." Pruitt stays.',
    fold: 'Pruitt climbs into the truck. "Cardboard. All of it."' },
  hattie: { cy: 'Hattie checks the paper for mildew. The paper did not mention it. She believes you anyway.', cn: '"The paper didn\'t say that." Hattie folds the paper sharply.',
    hy: 'Hattie underlines something in the paper that is not there.', hn: '"If it was good, dear, it would be in the paper."',
    ny: 'Hattie rereads the column. It suddenly seems to be about a different unit.', nn: '"I read it in the paper, dear. You said it in a yard."',
    fold: 'Hattie folds the paper away. "Misprint."' },
  delgado: { cy: 'Delgado glances at the other doors, which suddenly look better.', cn: 'Delgado ignores you. You are not the paper, but you are close.',
    hy: 'Delgado stops looking at the other doors.', hn: '"The good ones are never the loud ones."',
    ny: 'Delgado looks at the other two doors like old friends.', nn: '"I pick the doors nobody talks about. You are talking."',
    fold: 'Delgado shrugs. "There\'s always the next door." He leaves for it.' },
  dee: { cy: 'Sister Dee presses a hand to her chest. Mildew and good wood do not mix.', cn: '"Oak doesn\'t smell, dear."',
    hy: 'Sister Dee closes her eyes and says a short word to the furniture.', hn: 'Dee looks at you the way the Reverend looks at the collection plate.',
    ny: 'Sister Dee looks at the dresser again, forgives it, and lets it go.', nn: '"I know wood, dear." Dee stays.',
    fold: 'Sister Dee blesses the door and walks away from it.' },
  cobb: { cy: 'Cobb spits. "Rust." He believes it because he wants to.', cn: '"Tools don\'t care what it smells like."',
    hy: 'Cobb turns a wrench over in his pocket, twice, quick.', hn: 'Cobb squints. "Brand?" You don\'t answer. He doesn\'t move.',
    ny: 'Cobb looks at the toolbox, then at the rust on it, then at you.', nn: '"I\'ve heard rust before. That ain\'t rust."',
    fold: 'Cobb pockets his wrench. "Rust. Knew it."' },
  ferrell: { cy: 'Ferrell looks worried. He was already worried. Now it smells.', cn: 'Ferrell does not know what mildew smells like and is not going to ask.',
    hy: 'Ferrell asks the man next to him what a Marantz is, and gets his hopes up.', hn: 'Ferrell can\'t price a Marantz, so he doesn\'t.',
    ny: 'Ferrell is sure now. He was not sure about anything before.', nn: '"I don\'t know what\'s in there, and neither do you."',
    fold: 'Ferrell steps back. "Too weird. Or too wet. Either way."' },
  wanda: { cy: 'Wanda smiles at the word mildew. Strange things live in mildew.', cn: 'Wanda does not care about the smell. Wanda cares about the corner.',
    hy: 'Wanda loses interest. Good things are boring.', hn: '"A Marantz is a radio, dear. I don\'t bid on radios."',
    ny: 'Wanda looks at the strange thing again. It looks less strange. She is sad.', nn: '"It\'s strange. I know strange."',
    fold: 'Wanda sighs. "Ordinary after all." Out.' },
  vale: { cy: 'Vale touches his glasses. Damp ruins a finish, not a maker.', cn: '"The maker is the maker." Vale smells nothing.',
    hy: 'Vale\'s eyebrows lift one millimetre. For Vale, that is shouting.', hn: '"A Marantz box is not a Marantz." Vale is correct and insufferable.',
    ny: 'Vale looks at the stamp again. He no longer loves the stamp.', nn: '"I read stamps for a living."',
    fold: 'Vale puts his glasses away. "A knockoff. Pity."' },
  charlie: { cy: 'Charlie\'s grin drops a notch. Nothing shiny smells like that.', cn: 'Charlie polishes his sunglasses. The shine is still there.',
    hy: 'Charlie takes his sunglasses off to see the good stuff better.', hn: '"If it was good it\'d be out front, chief."',
    ny: 'Charlie looks at the chrome again. It looks like foil now.', nn: '"Foil don\'t shine like that." Charlie stays.',
    fold: 'Charlie puts the sunglasses back on. "Foil." Out.' },
  priscilla: { cy: 'Priscilla takes one step back from the door. Damp is the enemy.', cn: '"I check condition myself, thank you."',
    hy: 'Priscilla puts on a second pair of gloves.', hn: '"Packed carefully is not the same as kept carefully."',
    ny: 'Priscilla finds the water line you mentioned. It may not be there. She sees it.', nn: '"I have seen the finish. It is fine."',
    fold: 'Priscilla removes her gloves one finger at a time. Out.' },
  garrity: { cy: 'Garrity flexes one glove. The acquisition budget reconsiders.', cn: 'Garrity does not respond to the public.',
    hy: 'Garrity makes a note. Garrity never makes notes.', hn: '"Unverified." Garrity, flatly.',
    ny: 'Garrity checks a list. The door is no longer on the list.', nn: '"Noted. Disregarded."',
    fold: 'Garrity closes the folder. "Not collection grade."' },
  dex: { cy: '"Ew. Vibes are off." Dex tells his phone.', cn: 'Dex films you saying it. He believes nothing, on camera.',
    hy: '"Yo, a MARANTZ." Dex does not know what that is and loves it.', hn: '"Bro, I\'m not a nerd." Dex raises out of spite.',
    ny: 'Dex reads his comments. They agree with you. He is shaken.', nn: '"Bro\'s scared." Dex stays in.',
    fold: 'Dex stops filming. "Vibes are dead." He leaves.' },
  ed: { nn: 'Ed writes your name down.' },
  ilse: { nn: 'The Baroness does not acknowledge that she was spoken to.' },
};
const SAY_REACT_ANY = {
  cy: '{name} looks at the door again. Not fondly.', cn: '{name} does not look over.',
  hy: '{name} looks at the door again, harder.', hn: '{name} shrugs you off.',
  ny: '{name} looks at the door, then at you, then at the door. The number just got smaller.', nn: '{name} does not look at the door. They look at you.',
  fold: '{name} heard that, looked at the door, and is out.',
};
// Buzz heard it too, and repeats it to the whole yard, slightly wrong
const BUZZ_REPEAT = {
  mildew: ['"Mildew, the man says! Folks, mildew is CHARACTER!"', '"Wet cardboard! That is a LOT of cardboard, folks!"'],
  marantz: ['"A Marantz! I do not know what that is, but it sounds EXPENSIVE, folks!"', '"The good stuff, he says! Give me the good-stuff price!"'],
  nextdoor: ['"The unit next door had nothing! This is not the unit next door, folks!"'],
};
function reactLine(id, key, nm) {
  const own = SAY_REACT[id] && SAY_REACT[id][key];
  return (own || SAY_REACT_ANY[key]).replace(/\{name\}/g, nm);
}
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
// its own dice: flavor never moves a rival's decision
function sayFlavorR(id) { const au = G.auction; return RNG(strHash('sayflavor' + G.worldSeed + '_' + G.day + '_' + (G.cur ? G.cur.num : 0) + '_' + id + '_' + ((au && au.said) ? au.said.length : 0))); }
// ---- the new rows, run from one place (docs/AUCTION_REDESIGN.md §3) ----
// Every one is a gamble on being believed, exactly as the old deck is: `slipBelieveChance` per face, halved
// again for every line you have already said this sale. What a row does when it lands is its `eff`:
//   mult      their number, multiplied (never past their wallet)
//   press     a push added (1) or taken away (-1)
//   fold      anybody already past their number steps off here
//   sawPress  what it does to the ones who did NOT buy it (a bluff they see is an invitation)
//   sawSpite  and what it does to their spite number
//   cost      standing with the face it was aimed at; costAll, standing with everybody
//   anon      said from the back: no standing, nothing written down, and believed a little less
//   buzz      Buzz answers it out loud
const SAY_ANON_BELIEF = 0.85;        // a voice is not a face: believed a little less from the back
function sayAnon(au, eff) { return !!(eff && eff.anon) && quietHidden(au); }
function sayMove(au, row, entry, fade) {
  const R = au.R, eff = row.line.eff || {}, anon = sayAnon(au, eff);
  const room = au.npcs.filter(sayFace);
  const aside = (a, text, col, react) => au.queue.push({ text, col: col || PAL.gray, sfx: 'aside', npcId: a.def.id, react, showBid: au.bid, showLeader: leaderLabel() });
  const move = (a, m) => {
    a.cap = Math.min(a.budgetCap || Infinity, Math.max(G.cur.minBid || 0, Math.round(a.cap * m)));
    if (a.spiteCap) a.spiteCap = Math.min(a.budgetCap || Infinity, Math.round(a.spiteCap * m));
  };
  const believes = (a) => R.chance(slipBelieveChance(a) * fade * (anon ? SAY_ANON_BELIEF : 1));
  // said out loud, in the voice of where you are standing
  qLine(anon ? 'From somewhere at the back: ' + R.pick(row.line.say) : 'You, loud enough: ' + R.pick(row.line.say), PAL.cyan);
  if (eff.buzz) { qLine('"Nothing on the paperwork, folks. Same as every other door."', PAL.orange); speak(['auc_second_look']); }
  if (!anon && eff.costAll) for (const a of room) standingBump(a.def.id, -eff.costAll);
  // ---- one face: aimed, or whoever is in front ----
  if (eff.type === 'aim' || eff.type === 'lead') {
    const t = row.target;
    if (!t) return;
    if (!anon && eff.cost) standingBump(t.def.id, -eff.cost);
    const nm = shortRivalName(t.def);
    if (!believes(t)) {
      aside(t, eff.type === 'lead' ? nm + ' smiles and does not move. The number stays where it is.' : nm + ' is not listening to that.', PAL.dgray, 'scoff');
      if (eff.sawPress) t.pressLeft = (t.pressLeft || 0) + eff.sawPress;
      return;
    }
    entry.believers.push(t.def.id);
    if (eff.type === 'lead') {
      // dared in front of everybody: they put their whole number up now, and have nothing behind it
      const to = Math.min(t.budgetCap || Infinity, Math.max(au.bid + (au.step || 25), t.cap || 0));
      if (to > au.bid) {
        au.bid = to; au.leader = t; t.everLed = true; t.topRaise = Math.max(t.topRaise || 0, to);
        au.queue.push({ text: '"Fine." ' + nm + ' names it: ' + fmt$(to) + '.', col: PAL.orange, sfx: 'npc', amt: to, npcId: t.def.id, react: 'bid', showBid: to, showLeader: leaderLabel() });
      }
      t.cap = au.bid; t.pressLeft = 0; t.spiteCap = 0;
      aside(t, nm + ' has nothing behind that. One more from anybody and it is over.', PAL.cyan, 'sweat');
      return;
    }
    if (eff.mult) move(t, eff.mult);
    if (eff.press) t.pressLeft = Math.max(0, (t.pressLeft || 0) + eff.press);
    aside(t, eff.mult && eff.mult < 1 ? nm + ' hears it, looks again, and thinks less of the door.'
      : nm + ' hears it and looks at the door like it owes them money.', eff.mult && eff.mult < 1 ? PAL.cyan : PAL.orange, eff.mult && eff.mult < 1 ? 'believe' : 'warm');
    return;
  }
  // ---- somebody else raises it for you ----
  if (eff.type === 'crowd') {
    const other = room.find((a) => a !== au.leader && a.cap > au.bid + (au.step || 25)) || room.find((a) => a !== au.leader);
    if (!other || !believes(other)) { qLine('Nobody bites. The paddle beside you stays down.', PAL.dgray); return; }
    const to = au.bid > 0 ? au.bid + (au.step || 25) : (G.cur.minBid || au.step || 25);
    if (to > (other.budgetCap || Infinity)) { qLine('The man beside you looks at the number, and then at his shoes.', PAL.dgray); return; }
    entry.believers.push(other.def.id);
    au.bid = to; au.leader = other; other.everLed = true; other.topRaise = Math.max(other.topRaise || 0, to);
    au.queue.push({ text: shortRivalName(other.def) + ' puts a hand up. ' + fmt$(to) + '. Not a penny of it yours.', col: PAL.white, sfx: 'npc', amt: to, npcId: other.def.id, react: 'bid', showBid: to, showLeader: leaderLabel() });
    return;
  }
  // ---- the count, broken ----
  if (eff.type === 'stall') {
    au.closing = 0; au.closingT = 0; au.closingRollPlayed = false; stopClosingRoll(au);
    qLine('Somebody coughs. Buzz loses his place, looks up, and starts the count again.', PAL.orange);
    return;
  }
  // ---- the hammer, hurried ----
  if (eff.type === 'hurry') {
    const stubborn = room.find((a) => !believes(a));
    if (stubborn) { aside(stubborn, shortRivalName(stubborn.def) + ' does not care to be hurried.', PAL.lred, 'glare'); stubborn.pressLeft = (stubborn.pressLeft || 0) + (eff.sawPress || 1); }
    if (au.leader && au.leader !== 'you' && !au.closing) { qLine('Buzz takes you at your word. "Going once..."', PAL.orange); holdOff(); }
    else qLine('Buzz looks at the room. The room looks back.', PAL.gray);
    return;
  }
  // ---- everybody ----
  const heard = [], saw = [];
  for (const a of room) (believes(a) ? heard : saw).push(a);
  for (const a of heard) {
    entry.believers.push(a.def.id);
    if (eff.mult) move(a, eff.mult);
    if (eff.press) a.pressLeft = Math.max(0, (a.pressLeft || 0) + eff.press);
    if (eff.fold && au.bid > 0 && a !== au.leader && a.cap <= au.bid && !a.folded) {
      a.folded = true;
      au.queue.push({ text: reactLine(a.def.id, 'fold', shortRivalName(a.def)), col: PAL.dgray, sfx: 'fold', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
    }
  }
  for (const a of saw) {
    if (eff.sawPress) a.pressLeft = (a.pressLeft || 0) + eff.sawPress;
    if (eff.sawSpite) a.spiteCap = Math.min(a.budgetCap || Infinity, Math.round(Math.max(a.spiteCap || 0, a.cap || 0) * eff.sawSpite));
  }
  if (heard.length) {
    const one = heard[0];
    aside(one, shortRivalName(one.def) + (eff.mult && eff.mult > 1 ? ' hears it and wants it more.' : ' hears it. The paddle hand slows down.'), eff.mult && eff.mult > 1 ? PAL.orange : PAL.cyan, eff.mult && eff.mult > 1 ? 'warm' : 'believe');
    if (heard.length > 1) qLine(heard.length + ' of them take it in.', PAL.gray);
  }
  if (saw.length) {
    const one = saw[0];
    aside(one, shortRivalName(one.def) + ' does not buy a word of it.', PAL.dgray, 'scoff');
    if (saw.length > 1) qLine(saw.length + ' of them are not buying it.', PAL.dgray);
  }
  // from the back, nobody knows whose voice that was: it is never written down against you
  if (!anon && saw.length) { const mem = G.world.rivalMem = G.world.rivalMem || {}; mem.slipsCaught = (mem.slipsCaught || 0) + 1; }
}
function sayLine(id) {
  const au = G.auction;
  const row = au ? sayRows().find((r) => r.line.id === id) : null;
  closeMoveMenu();
  if (!au || au.done || !row || !row.ok) return;
  const R = au.R, line = row.line;
  if (id === 'quiet') {
    au.said.push({ id, kind: 'posture', believers: [] });
    qLine('You open your mouth, look at the door, and close it again. Everybody sees you do it.', PAL.cyan);
    setPosture('quiet', false);
    return;
  }
  const fade = Math.pow(0.5, au.said.length);            // the room has heard you
  const entry = { id, kind: line.kind, believers: [] };
  au.said.push(entry);
  au.slipped = au.slipped || id;
  au.slipEdThere = au.slipEdThere || au.npcs.some((a) => a.active && a.def.id === 'ed');
  bump('slips');
  const aside = (a, text, col, react) => au.queue.push({ text, col: col || PAL.gray, sfx: 'aside', npcId: a.def.id, react, showBid: au.bid, showLeader: leaderLabel() });
  const move = (a, m) => {
    a.cap = Math.min(a.budgetCap || Infinity, Math.round(a.cap * m));
    if (a.spiteCap) a.spiteCap = Math.min(a.budgetCap || Infinity, Math.round(a.spiteCap * m));
  };
  const room = au.npcs.filter(sayFace);
  if (line.kind === 'move') { sayMove(au, row, entry, fade); return; }
  if (id === 'look') {
    G.daylight -= line.cost; sunCheck();
    qLine('You: ' + line.say[0], PAL.cyan);
    qLine('"Take your look, folks. Everybody gets one."', PAL.orange);
    speak(['auc_second_look']);
    for (const a of room) move(a, R.r(0.85, 1.2));
    qLine('The whole room looks again. A few faces change.', PAL.gray);
    au.lookAgain = true;
  } else if (line.kind === 'face') {
    au.faceLeft = facesLeft(au) - 1;
    au.face = { kind: id, at: G.time };
    qLine('You: ' + line.say[0], PAL.cyan);
    const believers = [], saw = [];
    for (const a of room) (R.chance(slipBelieveChance(a) * fade) ? believers : saw).push(a);
    for (const a of believers) {
      entry.believers.push(a.def.id);
      if (id === 'certain') { a.pressLeft = 0; a.cap = Math.max(G.cur.minBid || 0, Math.round(a.cap * FACE_CERTAIN_CAP)); }
      else { a.pressLeft = (a.pressLeft || 0) + 1; a.cap = Math.min(a.budgetCap || Infinity, Math.round(a.cap * FACE_RATTLED_CAP)); }
    }
    for (const a of saw) {
      if (id === 'certain') a.pressLeft = (a.pressLeft || 0) + 1;   // a bluff they can see is an invitation
      else a.pressLeft = 0;                                          // steady, after all: nothing to hurry for
    }
    // being caught does not cost you today. It costs you the next time you try it, and the time after that.
    if (saw.length) { const mem = G.world.rivalMem = G.world.rivalMem || {}; mem.slipsCaught = (mem.slipsCaught || 0) + 1; }
    if (believers.length) {
      const one = believers[0];
      aside(one, id === 'certain'
        ? shortRivalName(one.def) + ' looks at your face, then at the door, and lowers the paddle a little.'
        : shortRivalName(one.def) + ' sees you check your pocket. The paddle comes up.', id === 'certain' ? PAL.cyan : PAL.orange, id === 'certain' ? 'cool' : 'warm');
      if (believers.length > 1) qLine(believers.length + ' of them buy it.', PAL.gray);
    }
    if (saw.length) {
      const one = saw[0];
      aside(one, shortRivalName(one.def) + ' has seen that face before. On better actors.', PAL.dgray, 'scoff');
      if (saw.length > 1) qLine(saw.length + ' of them are not buying it.', PAL.dgray);
    }
  } else if (id === 'point') {
    const sal = au.npcs.find((a) => a.def.id === 'sal'), other = row.target;
    qLine('You, loud enough: ' + row.text, PAL.cyan);
    standingBump('sal', -1);                              // Sal remembers who pointed
    if (R.chance(slipBelieveChance(sal) * fade)) {
      sal.spiteOn = other.def.id;
      sal.spiteCap = Math.min(sal.budgetCap || Infinity, Math.max(sal.spiteCap || 0, Math.round((sal.est || sal.cap) * 0.6)));
      standingBump(other.def.id, -2);                     // and they know who set him on them
      entry.believers.push('sal');
      aside(sal, 'Sal turns and looks at ' + shortRivalName(other.def) + ' for a long time.', PAL.orange, 'glare');
      aside(other, shortRivalName(other.def) + ' sees Sal looking, and then sees you.', PAL.dgray, 'glare');
    } else {
      sal.spiteCap = Math.min(sal.budgetCap || Infinity, Math.round(Math.max(sal.spiteCap || 0, (sal.est || sal.cap) * 0.55) * 1.25));
      aside(sal, '"Nice try," Sal says. He is looking at you now.', PAL.lred, 'glare');
    }
  } else if (id === 'feud') {
    const pair = feudFacesIn(au), one = pair[0], other = pair[1];
    qLine('You, loud enough: ' + row.text, PAL.cyan);
    standingBump(one.def.id, -1); standingBump(other.def.id, -1);   // saying it out loud costs you with both of them
    if (R.chance(slipBelieveChance(one) * fade)) {
      for (const [x, y] of [[one, other], [other, one]]) {
        x.spiteOn = y.def.id; x.feud = y.def.id;
        x.spiteCap = Math.min(x.budgetCap || Infinity, Math.max(x.spiteCap || 0, Math.round((x.cap || x.est || 0) * 1.6)));
      }
      entry.believers.push(one.def.id);
      aside(one, shortRivalName(one.def) + ' does not look at you. ' + shortRivalName(one.def) + ' looks at ' + shortRivalName(other.def) + '.', PAL.orange, 'glare');
      aside(other, shortRivalName(other.def) + ' heard that, and heard who said it.', PAL.lred, 'glare');
    } else {
      aside(one, '"Old news." ' + shortRivalName(one.def) + ' does not take the bait. Neither of them does.', PAL.dgray, 'scoff');
    }
  } else if (id === 'name') {
    const a = row.target;
    qLine('You, loud enough: ' + row.text, PAL.cyan);
    standingBump(a.def.id, -1);                           // you said their name out loud
    const p = Math.min(0.95, slipBelieveChance(a) + (SAY_NAME_LINES[a.def.id] ? 0.1 : 0)) * fade;
    const nm = shortRivalName(a.def);
    if (a.def.id !== 'ed' && a.def.id !== 'ilse' && R.chance(p)) {
      move(a, R.r(0.55, 0.8));
      a.believed = 'cool';
      entry.believers.push(a.def.id);
      if (au.bid > 0 && a !== au.leader && a.cap < au.bid) {
        a.folded = true;                                  // talked out of it, in their own trade
        au.queue.push({ text: reactLine(a.def.id, 'fold', nm), col: PAL.dgray, sfx: 'fold', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
      } else aside(a, reactLine(a.def.id, 'ny', nm), null, 'believe');
    } else aside(a, reactLine(a.def.id, 'nn', nm), PAL.dgray, 'glare');
  } else {
    qLine('You, loud enough: ' + R.pick(line.say), PAL.cyan);
    // every face answers, but the log only carries the two answers that matter most (a fold always shows)
    const answers = [];
    const cool = line.kind === 'cool';
    for (const a of room) {
      const nm = shortRivalName(a.def);
      if (a.def.id === 'ed') { answers.push({ a, text: 'Ed writes something down. It is not what you said.', pri: 1.2, col: PAL.dgray, yes: false, react: 'scoff' }); continue; }
      if (a.def.id === 'ilse') { answers.push({ a, text: 'The Baroness does not appear to have heard.', pri: 1.1, col: PAL.dgray, yes: false }); continue; }
      const inTrade = !!(line.aud && line.aud.includes(a.def.id));
      const aud = line.aud ? (inTrade ? line.audMult : line.others) : line.audMult;
      if (!R.chance(slipBelieveChance(a) * aud * fade)) {
        const own = !!(SAY_REACT[a.def.id] && SAY_REACT[a.def.id][cool ? 'cn' : 'hn']);
        answers.push({ a, text: reactLine(a.def.id, cool ? 'cn' : 'hn', nm), pri: own ? 1 : 0.5, col: PAL.dgray, yes: false, react: 'scoff' });
        continue;
      }
      move(a, line.mult);
      a.believed = line.kind;
      entry.believers.push(a.def.id);
      // the sentence was the last straw: under the bid now, and not the one holding it
      if (cool && au.bid > 0 && a !== au.leader && a.cap < au.bid) {
        a.folded = true;
        answers.push({ a, text: reactLine(a.def.id, 'fold', nm), pri: 3, fold: true, yes: true });
        continue;
      }
      answers.push({ a, text: reactLine(a.def.id, cool ? 'cy' : 'hy', nm), pri: inTrade ? 2.5 : 2, col: PAL.gray, yes: true, react: 'believe' });
    }
    const shown = answers.filter((x) => x.fold);
    for (const x of answers.slice().sort((p1, p2) => p2.pri - p1.pri)) { if (shown.length >= Math.max(2, shown.filter((y) => y.fold).length)) break; if (!x.fold) shown.push(x); }
    for (const x of answers) {
      if (!shown.includes(x)) continue;
      if (x.fold) au.queue.push({ text: x.text, col: PAL.dgray, sfx: 'fold', npcId: x.a.def.id, showBid: au.bid, showLeader: leaderLabel() });
      else aside(x.a, x.text, x.col, x.react);
    }
    const restYes = answers.filter((x) => !shown.includes(x) && x.yes).length, restNo = answers.filter((x) => !shown.includes(x) && !x.yes).length;
    const bits = [];
    if (restYes) bits.push((restYes === 1 ? 'One more believes it' : (COUNT_WORDS[restYes] || restYes).replace(/^./, (c) => c.toUpperCase()) + ' more believe it'));
    if (restNo) bits.push((bits.length ? (COUNT_WORDS[restNo] || restNo) : (COUNT_WORDS[restNo] || String(restNo)).replace(/^./, (c) => c.toUpperCase())) + (restNo === 1 ? ' shrugs it off' : ' shrug it off'));
    if (bits.length) qLine(bits.join('. ') + '.', PAL.dgray);
    if (!entry.believers.length && !answers.some((x) => x.a.def.id === 'ed' || x.a.def.id === 'ilse')) qLine('Nobody looks over.', PAL.dgray);
    // Buzz repeats it to the yard, slightly wrong, about half the time
    const fr = sayFlavorR(id);
    if (BUZZ_REPEAT[id] && fr.chance(0.5)) qLine(fr.pick(BUZZ_REPEAT[id]), PAL.orange);
    // Dutch heard it too, and tells the room the opposite, louder
    const dutch = room.find((a) => a.def.id === 'dutch');
    if (dutch) {
      aside(dutch, line.kind === 'cool' ? '"YIIIP! HE SAYS IT\'S THE GOOD STUFF!" Dutch repeats it louder, and wrong.' : '"YIIIP! HE SAYS IT STINKS!" Dutch repeats it louder, and wrong.', PAL.orange);
      for (const a of room) {
        if (a === dutch || entry.believers.includes(a.def.id) || a.def.id === 'ed' || a.def.id === 'ilse') continue;
        if (R.chance(0.5)) move(a, line.kind === 'cool' ? 1.1 : 0.9);
      }
    }
  }
  recordEvent('slip', { unit: G.cur.num, kind: id, believers: entry.believers.length });
}
// the hammer is down on a door somebody said things about: which were true? Settled now, felt the
// next time you share a yard with the people who believed you (slipFallout). A cool line is a lie
// on a good door, a hot one on a poor door. Liars' believers lose two points; the truth earns one.
function settleSlip(au) {
  const said = (au.said || []).filter((x) => x.kind === 'cool' || x.kind === 'heat');
  if (!said.length) return;
  const lk = G.cur, pm = curTown().priceMult || 1, vis = visibleValue(lk);
  const good = lk.value > Math.max(300 * pm, vis * 2), poor = lk.value < Math.max(150 * pm, vis * 1.2);
  const lies = said.filter((x) => (x.kind === 'cool' ? good : poor));
  const truths = said.filter((x) => !lies.includes(x));
  const uniq = (arr) => Array.from(new Set(arr));
  const lied = uniq([].concat(...lies.map((x) => x.believers)));
  const told = uniq([].concat(...truths.map((x) => x.believers))).filter((id) => !lied.includes(id));
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  mem.slipFallout = { day: G.day, town: G.world.town, kind: (lies[0] || said[0]).kind, lie: lies.length > 0,
    believers: lies.length ? lied : told, truthBelievers: lies.length ? told : [], edThere: !!au.slipEdThere };
  // "I had the next one. Nothing." — and then you bought it, and it was good. The paper prints it.
  if (au.leader === 'you' && good && said.some((x) => x.id === 'nextdoor')) recordEvent('nextDoorLie', { unit: lk.num, paid: au.bid });
}
const SLIP_CAUGHT_LINES = {
  cool: ['"Mildew," {name} says, to nobody in particular. "Sure."', '{name} looks at you and says nothing. It was a good unit.'],
  heat: ['"The good stuff," {name} says, looking straight at you. "Sure."', '"Marantz," {name} says. It is not a question any more.'],
};
function slipFallout() {
  const mem = G.world.rivalMem || {};
  const f = mem.slipFallout;
  if (!f || f.day >= G.day) return;
  if (G.day - f.day > 8) { mem.slipFallout = null; return; }
  if (f.town !== G.world.town) return;                    // it waits for the yard where it was said
  mem.slipFallout = null;
  const au = G.auction, R = dayR('slipfall', G.cur.num);
  if (!f.lie) {
    // you told them the truth and it cost them nothing: that is worth a little
    for (const id of f.believers) standingBump(id, 1);
    return;
  }
  bump('slipsCaught');
  mem.slipsCaught = (mem.slipsCaught || 0) + 1;
  for (const id of f.believers) standingBump(id, -2);
  for (const id of f.truthBelievers || []) standingBump(id, 1);   // the ones you told the truth to that day
  const here = au.npcs.filter((a) => a.active && !a.crowd && f.believers.includes(a.def.id));
  if (here.length) {
    const a = R.pick(here);
    qLine(R.pick(SLIP_CAUGHT_LINES[f.kind]).replace(/\{name\}/g, shortRivalName(a.def)), PAL.lred);
  }
  if (f.edThere) {
    mem.edQuietUntil = Math.max(mem.edQuietUntil || 0, G.day + 7);
    qLine('Ed closes the notebook when you walk past. He saw the door.', PAL.cyan);
  }
  recordEvent('slipCaught', { unit: G.cur.num, kind: f.kind, believers: f.believers.length });
}
const FACE_TELLS_ANY = {
  sweat: ['{name} wipes a palm on a trouser leg.', '{name} looks at the door, then at the ground.', "{name}'s paddle hand has started to shake.", '{name} counts something on two fingers and stops.'],
  pride: ['{name} is past the number now. Everybody can see it.', '{name} bids like a person who has stopped doing sums.'],
};
const FACE_TELLS = {
  bart: { sweat: ['Bart rubs the back of his neck. Twice.', 'Bart looks at his truck. Then at the door. Then at the truck.'], pride: ['Bart is red in the face and bidding anyway.', 'Bart bids without looking at the door. That is not about the door.'] },
  sal: { sweat: ['Sal is chewing the inside of his cheek.', "Sal's grin has gone somewhere. He's doing math."], pride: ['Sal is past his own number and he knows it. He is looking at you.', "Sal bids with his teeth showing. That one wasn't for the door."] },
  ed: { sweat: ['Ed closes the notebook. He does not open it again.', 'Ed taps the pencil on his knee, fast.'], pride: ['Ed writes a number, crosses it out, and bids over it.'] },
  dutch: { sweat: ['The yip has gone quiet. Dutch is just standing there.', 'Dutch clears his throat instead of yipping. Twice.'], pride: ["Dutch yips at a number he can't afford. Everybody heard it."] },
  duo: { sweat: ['Kaylee has Cody by the sleeve. He is not raising it.', 'Cody and Kaylee are whispering. Neither one is smiling.'], pride: ["Cody bids over Kaylee's head. Kaylee has left."] },
  vera: { sweat: ['Vera checks her phone. The buyer has not answered.', 'Vera does the city sum on her fingers and frowns.'], pride: ['Vera bids without the phone. That is her own money now.'] },
  tuck: { sweat: ['Tuck takes his hat off. Puts it back on.', 'Tuck looks at his boots.'], pride: ['Tuck says a word. Nobody has heard him say a word.'] },
  bev: { sweat: ['Bev has stopped tapping the boxes.', 'Bev squints at a box like it owes her money.'], pride: ['Bev bids past the boxes. There are only so many boxes.'] },
  pruitt: { sweat: ['Pruitt looks at the truck bed. He is weighing it in his head.', 'Pruitt slaps the truck, softer this time.'], pride: ['Pruitt bids a number no pound of anything is worth.'] },
  hattie: { sweat: ['Hattie folds the paper in half. Then in half again.', "Hattie reads the same line of the paper a third time."], pride: ['Hattie bids past what the paper said. The paper is on the ground.'] },
  delgado: { sweat: ['Delgado glances at the other doors.', "Delgado's paddle is low. He is thinking about the next one."], pride: ['Delgado bids like a man who forgot there are two other doors.'] },
  dee: { sweat: ['Sister Dee closes her eyes for a second.', 'Dee has her hand flat on her purse.'], pride: ['Sister Dee bids past the furniture. The Reverend looks at her.'] },
  cobb: { sweat: ['Cobb spits. Not near anyone. Just spits.', 'Cobb turns a wrench over in his pocket.'], pride: ['Cobb bids a number a tool has never cost.'] },
  ferrell: { sweat: ['Ferrell is asking somebody what that thing in the back is.', 'Ferrell looks worried about something in the door he cannot name.'], pride: ['Ferrell bids on a thing he still cannot name.'] },
  wanda: { sweat: ['Wanda has gone very still.', "Wanda's fingers are drumming something in a pattern."], pride: ['Wanda bids with both hands. That is a first.'] },
  vale: { sweat: ["Vale checks a mark on the visible piece again. He didn't like it the first time.", 'Vale tilts his head at the door and does not tilt it back.'], pride: ['Vale bids past the maker. There is nothing else in there he wants.'] },
  charlie: { sweat: ['Charlie has stopped looking at the shiny thing.', 'Charlie polishes his sunglasses. On the front of his shirt.'], pride: ['Charlie bids with the sunglasses off. It has stopped being fun.'] },
  priscilla: { sweat: ['Priscilla finds a scratch she had not seen. She says nothing.', 'Priscilla takes her gloves off. Then puts them on.'], pride: ['Priscilla bids past condition. She looks surprised at herself.'] },
  garrity: { sweat: ['Garrity flexes one glove.', 'Garrity looks at his watch. He never looks at his watch.'], pride: ['Garrity bids over budget. There is no one to call.'] },
  ilse: { sweat: ['The Baroness inclines her head half a degree less.', "The driver's paddle is a shade slower to rise."], pride: ['The Baroness bids past her own valuation. The driver looks alarmed.'] },
  dex: { sweat: ['Dex has stopped filming. The phone is in his pocket.', 'Dex says "okay okay okay" to nobody.'], pride: ['Dex bids and says "whatever" to the camera. The camera is off.'] },
};
// the room did something a person sitting on a number would want to know about: a
// new paddle, a jump, a comeback, somebody who was fighting you giving up, a bid at the
// wire. A run-up reads a face's pride from these and stops to ask.
function roomEvent(kind, text, who) {
  const au = G.auction;
  if (!au || au.done) return;
  au.events = au.events || [];
  au.events.push({ kind, text, who });
  if (au.events.length > 8) au.events.shift();
}
// how a rival prices a door, in one line, so the roster reads like a second peek: if
// Pruitt stays in, it is heavy. Told on their first paddle of a sale, three sales per
// rival per career, then assumed known (the Ledger keeps the tag).
const WAY_LINES = {
  bart: 'Bart bids what he can see from the door.',
  sal: 'Sal bids against you, not the door.',
  ed: 'Ed bids the back of the unit. He did the math.',
  dutch: 'Dutch bids to hear himself. Then he bids to make you pay.',
  duo: 'Cody and Kaylee bid two opinions at once.',
  cody: 'Cody bids the tools, and over Kaylee on principle.',
  kaylee: 'Kaylee bids the little boxes, and over Cody on principle.',
  vera: 'Vera bids what the city will pay her for it.',
  tuck: 'Tuck bids what it is worth. Never a dollar more.',
  bev: 'Bev bids the boxes. Nothing else in there counts.',
  pruitt: 'Pruitt bids by the pound. If he stays in, it is heavy.',
  hattie: 'Hattie bids whatever the paper printed.',
  delgado: 'Delgado bids the doors the paper skipped.',
  dee: 'Dee bids furniture. Only furniture.',
  cobb: 'Cobb bids tools. Only tools.',
  ferrell: "Ferrell can't price anything weird, so he doesn't.",
  wanda: 'Wanda bids the strange. Nothing else.',
  vale: "Vale bids the maker's name, not the finish.",
  charlie: 'Charlie bids the shine up front.',
  priscilla: 'Priscilla bids condition. A scratch costs you her.',
  garrity: 'Garrity only comes for the good ones. He came.',
  ilse: 'The Baroness bids the exact number. She is never wrong about it.',
  dex: 'Dex bids on feel. He has no idea.',
};
function wayAside(a) {
  const au = G.auction;
  if (!au || a.crowd || au.wayShown[a.def.id]) return null;
  au.wayShown[a.def.id] = true;
  const line = WAY_LINES[a.def.id] || (a.def.tag ? a.def.name + ': ' + a.def.tag + '.' : null);
  if (!line) return null;
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  mem.wayTold = mem.wayTold || {};
  if ((mem.wayTold[a.def.id] || 0) >= 3) return null;
  mem.wayTold[a.def.id] = (mem.wayTold[a.def.id] || 0) + 1;
  return line;
}
// cards on the table: the hammer is down, and everybody's number comes out. What Bart
// would have gone to is the whole reason a win at $275 feels like a steal, and it is how
// a player learns the room. Numbers are floored to the bid step (the last paddle they
// would actually have raised).
function shortRivalName(def) {
  return def.name.replace(/^(Big|Spite|Eagle|Yiip|Velvet|Taciturn|Boxcar|By-the-Pound|Headline|Two-Doors|Sister|Slim|Cousin|Chrome|Baroness) /, '').replace(/^"Gloves" /, '').replace(/ von Tesh$/, '');
}
// ---- the rules you learn: how each face prices a door, read off their number at the hammer and checked on doors you dig ----
// `test` reads one fact about the door's real contents (doorFacts), in that face's own trade. At the hammer a face that
// led and had at least 85% of the final "reads it high" (says the door is `yes`); one that never led and had under 60%
// "reads it low" (says `no`). Only a door you win and dig proves them right or wrong. Three right, with at least twice as
// many right as wrong, and the Ledger writes the rule down. Fitted on 15,060 faces in 1,080 simulated sales (2026-09-14):
// each fact holds on about half the doors that face attends, and the reads land about 70-98% right.
// No rule for Sal and Dutch (they price you), the Baroness (buys what she likes), Dex (prices the vibes) or Garrity
// (showing up is his whole tell).
const RIVAL_RULES = {
  pruitt: { test: (f) => f.heavyForValue >= 1.08, yes: 'heavy for the money', no: 'light for the money' },
  bev: { test: (f) => f.boxShare >= 0.48, yes: 'mostly boxes', no: 'not much in boxes' },
  bart: { test: (f) => f.visibleRatio >= 2.4, yes: 'good stuff up front', no: 'thin up front' },
  charlie: { test: (f) => f.visibleShare >= 0.25, yes: 'the shine is up front', no: 'nothing shiny up front' },
  ed: { test: (f) => f.visibleShare < 0.29, yes: 'good in the back', no: 'what you see is it' },
  dee: { test: (f) => f.furnRatio >= 2.7, yes: 'real furniture', no: 'no furniture worth it' },
  cobb: { test: (f) => f.toolRatio >= 2.0, yes: 'real tools', no: 'no tools worth it' },
  wanda: { test: (f) => f.weirdShare >= 0.13, yes: 'strange', no: 'ordinary' },
  ferrell: { test: (f) => f.weirdShare < 0.19, yes: 'ordinary', no: 'strange' },
  vale: { test: (f) => f.premiumRatio >= 2.5, yes: 'good makers', no: 'no names' },
  priscilla: { test: (f) => f.condRatio >= 3.5, yes: 'kept nice', no: 'beat up' },
  vera: { test: (f) => f.valueRatio >= 12, yes: 'worth city money', no: 'not worth the drive' },
  duo: { test: (f) => f.cityRatio >= 1.85, yes: 'collectibles', no: 'no collectibles' },
  tuck: { test: (f) => f.valueRatio >= 10.7, yes: 'worth it', no: 'not worth it' },
  hattie: { test: (f) => f.named, yes: 'in the paper', no: 'not in the paper' },
  delgado: { test: (f) => !f.named, yes: 'not in the paper', no: 'in the paper' },
};
function doorFacts(lk) {
  let bulk = 0, total = 0;
  const v = { box: 0, furn: 0, tool: 0, weird: 0, premium: 0, cond: 0, city: 0 };
  const add = (it, inBox) => {
    if (it.cash) return;
    total += it.val;
    if (it.container || inBox) v.box += it.val;
    if (['furniture', 'antiques'].includes(it.cat)) v.furn += it.val;
    if (['tools', 'electronics'].includes(it.cat)) v.tool += it.val;
    if (it.cat === 'weird') v.weird += it.val;
    if ((it.brandM || 1) >= 1.8) v.premium += it.val;
    if (it.cond === 'Mint' || it.cond === 'Clean') v.cond += it.val;
    if (['antiques', 'jewelry', 'collectibles'].includes(it.cat)) v.city += it.val;
  };
  for (const it of lk.items) { bulk += it.size; add(it, false); if (it.loot) for (const l of it.loot) { bulk += l.size; add(l, true); } }
  const open = lk.minBid || 1, vis = visibleValue(lk);
  return {
    heavyForValue: lk.value ? bulk * PRUITT_PER_BULK / lk.value : 0,
    boxShare: total ? v.box / total : 0, weirdShare: total ? v.weird / total : 0,
    furnRatio: v.furn / open, toolRatio: v.tool / open, premiumRatio: v.premium / open, condRatio: v.cond / open, cityRatio: v.city / open,
    visibleShare: lk.value ? vis / lk.value : 0, visibleRatio: vis / open, valueRatio: (lk.value || 0) / open,
    named: typeof paperNamedUnits === 'function' && paperNamedUnits().includes(lk.num),
  };
}
// what a face's revealed number said about the door: 'high', 'low', or nothing worth reading
function faceRead(a, shown, final) {
  if (!RIVAL_RULES[a.def.id] || !final) return null;
  if (a.def.id === 'ed' && edNotebookGone(G.world, G.day)) return null;   // a guess teaches you nothing about him
  if (a.everLed && shown >= final * 0.85) return 'high';
  if (!a.everLed && shown < final * 0.6) return 'low';
  return null;
}
function ruleLearned(id) { const m = ((G.world.rivalMem || {}).rules || {})[id]; return !!RIVAL_RULES[id] && !!m && m.right >= 3 && m.right >= m.wrong * 2; }
function ruleShort(id) { return 'stays in: ' + RIVAL_RULES[id].yes; }
// the van pulls out of a door you won: the dig has shown whether each face read it right
function checkRules(lk) {
  if (!lk || !lk.readings || lk.rulesChecked) return;
  lk.rulesChecked = true;
  const mem = G.world.rivalMem = G.world.rivalMem || {};
  mem.rules = mem.rules || {};
  G.dayStats.rulesToday = G.dayStats.rulesToday || [];
  for (const r of lk.readings) {
    const rule = RIVAL_RULES[r.id], def = rivalDef(r.id);
    if (!rule || !def) continue;
    const right = (r.read === 'high') === r.trait;
    const was = ruleLearned(r.id);
    const m = mem.rules[r.id] = mem.rules[r.id] || { right: 0, wrong: 0 };
    if (right) m.right++; else m.wrong++;
    const nm = shortRivalName(def);
    G.dayStats.rulesToday.push(nm + ': ' + (right ? 'right' : 'wrong') + '. It was ' + (r.trait ? rule.yes : rule.no) + '.');
    if (!was && ruleLearned(r.id)) {
      m.learnedDay = G.day;
      recordEvent('ruleLearned', { rival: r.id });
      toast('You have ' + nm + ' figured out. In the Ledger: ' + ruleShort(r.id) + '.', PAL.lblue, 4);
    }
  }
}
function cardsOnTable(au) {
  learnTells(au);
  settleSlip(au);
  noteSnipe(au);
  const step = au.step || 25, final = au.bid;
  const winner = au.leader;
  const parts = [];
  for (const a of au.npcs) {
    if (!a.active || a.crowd || a === winner) continue;
    const n = Math.max(0, Math.floor(a.cap / step) * step);
    a.shownCap = n;
    const nm = shortRivalName(a.def);
    if (au.dutch) { const wait = Math.max(0, a.dutchAt || 0); a.shownCap = wait; parts.push(nm + (wait >= (G.cur.minBid || 0) ? ' was waiting for ' + fmt$(wait) + '.' : ' was never going to shout.')); continue; }
    if (au.sealed) { const wrote = Math.max(0, a.sealedAt || 0); a.shownCap = wrote; parts.push(nm + (wrote >= (G.cur.minBid || 0) ? ' wrote ' + fmt$(wrote) + '.' : ' wrote nothing.')); continue; }
    let part;
    if (a.feud && a.everLed && a.spiteCap && (a.topRaise || 0) > a.cap) {
      const o = au.npcs.find((x) => x.def && x.def.id === a.feud);
      part = nm + "'s real number was " + fmt$(n) + '. The rest was for ' + (o ? shortRivalName(o.def) : 'the other one') + '.';
    } else if (a.everLed && a.spiteCap && (a.topRaise || 0) > a.cap) part = nm + "'s real number was " + fmt$(n) + '. The rest was for you.';
    else if (n >= final) part = nm + ' had ' + fmt$(n) + ' in it and blinked.';
    else if (a.everLed) part = nm + ' would have gone to ' + fmt$(n) + '.';
    else if (n < (G.cur.minBid || 0)) part = nm + ' was never in it (' + fmt$(n) + ').';
    else part = nm + ' had ' + fmt$(n) + ' and never showed it.';
    // what that number says about the door, in this face's own trade (the dig will say whether it was right)
    const read = faceRead(a, n, final), rule = RIVAL_RULES[a.def.id];
    if (read) {
      a.read = read;
      part = part.replace(/\.$/, '') + ' (reads ' + (read === 'high' ? rule.yes : rule.no) + ').';
    }
    parts.push(part);
  }
  // only a door you win gets dug in front of you: that is the only door that can check the reads
  if (winner === 'you') {
    const facts = doorFacts(G.cur);
    G.cur.readings = au.npcs.filter((a) => a.active && !a.crowd && a.read && RIVAL_RULES[a.def.id]).map((a) => ({ id: a.def.id, read: a.read, trait: !!RIVAL_RULES[a.def.id].test(facts) }));
  }
  // a machine has no face to keep: beaten or not, the absentee's number comes out
  if (winner && winner.def && winner.def.phone) parts.push('The phone hangs up. It had ' + fmt$(Math.max(0, Math.floor(winner.cap / step) * step)) + '.');
  if (!parts.length) { au.revealed = true; return; }   // an empty room still gets its price stamp
  au.queue.push({ text: 'Cards on the table: ' + parts.join(' '), col: PAL.gray, sfx: 'cards', showBid: final, showLeader: leaderLabel(), then: () => { au.revealed = true; } });
}
// rounds: 1 = one turn of the room (after your bid), 40 = they battle it out
// to the end without you (you passed, or nobody has bid yet)
function resolveNpcs(rounds) {
  const au = G.auction;
  const n = rounds || 1;
  let guard = 0;
  while (guard++ < 40) { if (!npcRound() || guard >= n) break; }
  // nobody challenged you this round — the gavel starts the count, not an instant sale.
  // The same real-time closing ticks HOLD OFF uses (pumpQueue) fire npcRound() again
  // before each "going", so someone still in it (or a folded rival with a comeback in
  // them) gets one more genuine shot at a late bid before it's actually sold.
  if (au.leader === 'you' && !au.closing && !au.done) {
    au.closing = 1; au.closingT = 0; au.closingRollPlayed = false;
    qLine('Going once...', PAL.yellow, 'once');
  }
}
// the room stayed quiet through both counts: fold whoever is still standing and close it out
// ---- THE HAMMER LANDS FIRST (user, 2026-09-20) ----
// "when you are about to win the bid, you win it, but a rival might say something so it stops the heartbeat
// and the winning feeling." It did: this queued a line for EVERY face still standing - "Bart shakes his
// head." "Sal shakes his head." - and only then the sale. So the count ran out, the heartbeat stopped dead,
// and you sat through three rivals giving up one at a time before anything told you that you had won.
//
// Now the order is the one the room actually has: SOLD, and then the room takes it in. And the room takes
// it in ONCE, in a single line, however many of them were still holding a paddle - four separate shrugs was
// the deflation, not the shrugging.
function soldToYou(au) {
  const standing = au.npcs.filter((a) => a.active && !a.folded);
  for (const a of standing) a.folded = true;
  au.queue.push({ text: 'SOLD to YOU for ' + fmt$(au.bid) + '!', col: PAL.green, sfx: 'sold', gap: (au.auc.foldPace || 0.5) + 0.9, showBid: au.bid, showLeader: 'you', then: () => winAuction() });
  {
    const named = standing.filter((a) => !a.crowd);
    const names = named.map((a) => shortRivalName(a.def));
    let text = null, who = null;
    // Cody and Kaylee are two people under one name, the way the rest of the room's lines already treat them
    if (names.length === 1) { text = names[0] + (named[0].def.id === 'duo' ? ' let it go.' : ' lets it go.'); who = named[0].def.id; }
    else if (names.length > 1) text = names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' let it go.';
    else if (standing.length) { const c = standing[0]; text = (c.def.lines && c.def.lines.settle) || 'The crowd settles down.'; who = 'crowd'; }
    if (text) au.queue.push({ text, col: PAL.dgray, sfx: 'fold', npcId: who, showBid: au.bid, showLeader: 'you' });
  }
  pushBackSettle(au, true);                             // somebody was running you up, and you paid it
  if (au.runUp) {
    // you were pushing somebody and they stepped back: the door is yours, and you did not want it
    const t = au.npcs.find((n) => n.def.id === au.runUp.id);
    au.queue.push({ text: au.bluffCalledBy === au.runUp.id
      ? 'The yard knew you were pushing. The door is yours, at your own number.'
      : (t ? shortRivalName(t.def) : 'They') + ' called it. The door is yours, at your own number.', col: PAL.orange, sfx: 'aside', showBid: au.bid, showLeader: 'you' });
    // the drop (user, 2026-09-18): the whole room saw it, and it is funny to everybody but you
    au.queue.push({ text: '"SOLD - to the one who did not want it!" The back row loses it.', col: PAL.orange, sfx: 'aside', showBid: au.bid, showLeader: 'you', then: () => play('crowd_ooh', 0.7) });
    G.cur.dropped = { rival: au.runUp.id, paid: au.bid };
    bump('bluffCalled');
    recordEvent('bluffCalled', { unit: G.cur.num, rival: au.runUp.id, rivalName: t ? t.def.name : null, paid: au.bid, onPurpose: au.bluffCalledBy === au.runUp.id });
    au.runUp = null;
  }
  cardsOnTable(au);
  bookAfterSale(au);
  au.done = true;
}
function playerBid(inc) {
  const au = G.auction, R = au.R;
  // you are already the high bidder: there is nobody to outbid but yourself, and
  // raising here used to reset the hammer and let you run the price up alone
  if (au.leader === 'you') { play('denied'); return; }
  if (au.quietLeft > 0 && !au.closing) { play('denied'); toast('You are sitting this part out.', PAL.gray); return; }
  // a paddle at the back is easy to miss when the count is running
  if (quietHidden(au) && au.closing && au.R.chance(QUIET_MISS)) { play('denied'); toast('Buzz does not see the paddle at the back. Wave it again.', PAL.orange); return; }
  if (au.posture === 'loud' && au.bid > 0) inc = Math.max(inc, (au.step || 25) * 2);   // on your feet, nothing small
  // what this raise says about you, to anybody in here who is reading (2026-09-22)
  {
    const p = au.posture || 'steady';
    let heat = p === 'loud' ? PH.raise_loud : (p === 'quiet' ? (au.closing ? PH.raise_quiet_late : PH.raise_quiet_early) : PH.raise_steady);
    if (inc > (au.step || 25)) heat += PH.jump;                       // a jump is a man in a hurry
    if (!au.leader && !au.bid) heat += PH.first;                      // and opening it yourself is showing your hand
    if (!(au.pbids > 0) && au.closing) heat += PH.raise_quiet_late;   // silent all sale, then in at the count
    pHeatAdd(au, heat);
  }
  const target = (au.bid === 0 ? G.cur.minBid : au.bid + inc);
  if (target > bidCeiling()) { play('denied'); return; }
  racHelpRoll(au);                                   // square with the raccoon: he is somewhere in the dark
  const jump = au.bid > 0 ? Math.round(inc / (au.step || 25)) : 0;
  // opening the bidding yourself is showing your hand. Sal likes a shown hand.
  if (au.bid === 0 && au.leader === null) {
    const sal = au.npcs.find((a) => a.active && a.def.id === 'sal' && !a.folded);
    if (sal && sal.spiteCap) sal.spiteCap = Math.min(sal.budgetCap || Infinity, Math.round(sal.spiteCap * 1.25));
  }
  au.bid = target; au.leader = 'you';
  callBidCheck();                               // you were paid to sit this one out (phone.js)
  // a bid stops the hammer mid-word — and if the room had already gone quiet on
  // it, this is a save at the buzzer, not just a bid, and it gets treated like one
  const wasClosing = !!au.closing;
  au.closing = 0; au.closingT = 0; au.closingRollPlayed = false;
  if (wasClosing) { stopClosingRoll(au); play('sting_latebid', 0.85); speak(['auc_react_late'], true); }
  play('bid_player');
  qLine(quietHidden(au) ? 'A paddle at the back: ' + fmt$(target) + '.' : 'You bid ' + fmt$(target) + '.', PAL.cyan, 'pbid', target);
  au.pbids = (au.pbids || 0) + 1;
  if (wasClosing) au.pbidsInCount = (au.pbidsInCount || 0) + 1;
  if (au.posture === 'quiet' && au.quietSat > 0 && !au.cameBack) { au.cameBack = true; quietComeback(au, R); }
  // LOUD: a face already near their number flinches out at the noise
  if (au.posture === 'loud') for (const a of au.npcs) {
    if (!a.active || a.folded || a.crowd || a.def.phone) continue;   // the phone does not flinch
    if (target > a.cap * 0.8 && R.chance(0.3)) {
      a.folded = true;
      au.queue.push({ text: shortRivalName(a.def) + ' flinches at the noise and steps back.', col: PAL.dgray, sfx: 'fold', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
    }
  }
  // a known sniper, at the wire: some faces saw it coming and step back anyway
  if (wasClosing && sniperNow()) for (const a of au.npcs) {
    if (!a.active || a.folded || a.crowd || !SNIPE_FOLDERS.includes(a.def.id)) continue;
    if (target > a.cap * 0.8 && R.chance(0.5)) {
      a.folded = true;
      au.queue.push({ text: shortRivalName(a.def) + ' saw that coming, and steps back anyway.', col: PAL.dgray, sfx: 'fold', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
    }
  }
  // a big jump reads as deep pockets: a rival already near their number can be scared straight out
  if (jump >= 4) for (const a of au.npcs) {
    if (!a.active || a.folded || a.crowd || a.def.phone) continue;   // the phone does not flinch
    if (target > a.cap * 0.85 && R.chance(0.35)) {
      a.folded = true;
      au.queue.push({ text: a.def.name + ' blinks at the jump and steps back.', col: PAL.dgray, sfx: 'fold', npcId: a.def.id, showBid: au.bid, showLeader: leaderLabel() });
    }
  }
  // the minimum raise reads as a thin wallet: pride finds one more press in it
  if (jump === 1 && R.chance(0.3)) {
    const proud = au.npcs.filter((a) => a.active && !a.folded && !a.crowd && a.pressLeft > 0 && a.pressLeft < 3);
    if (proud.length) R.pick(proud).pressLeft++;
  }
  resolveNpcs(1);
}
// ---- RUN THEM UP's clockwork: the pace an automatic raise waits, and the number chips its picker offers ----
const RAISE_PACE = 0.7;               // a breath after the gavel asks, then the raise lands
// four round numbers above `from`, inside your money: the run-up picker's chips. A ladder
// through the range a door actually sells in — off a $50 opener: 150, 250, 400, 600 —
// not multiples of the opener (1.25x, 1.6x… of $50 all rounded to the same $100, and
// the wallet filled the last slot: "100, 150, then 1500").
function numberChips(from) {
  const money = G.money;
  const base = Math.max(from, 100);
  const mults = base < 150 ? [1.5, 2.5, 4, 6] : [1.4, 1.9, 2.6, 3.5];   // a cheap door climbs steeper
  const r = (v) => Math.ceil(v / 50) * 50;
  const out = [];
  let last = from;
  for (const m of mults) {
    const v = Math.max(r(base * m), last + 50);
    if (v > money) break;
    out.push(v); last = v;
  }
  if (out.length < 2 && money > from && !out.includes(money)) out.push(money);   // broke: the top of the wallet is the ladder
  return out.slice(0, 4);
}
// the probe: stay in, say nothing, and let the room show its hand. If somebody
// raises, you learned who is still interested. If nobody moves, the hammer
// starts falling — and you can still jump back in until the last word.
function holdOff() {
  pHeatAdd(G.auction, PH.hold);                     // you look like a man who can take it or leave it
  const au = G.auction;
  if (!au.leader || au.leader === 'you' || au.done || au.closing) return;
  au.pressT = 0;
  const b0 = au.bid;
  qLine('You hold. The gavel looks around the room.', PAL.gray);
  if (au.log.concat(au.queue).some((l) => l.sfx === 'pbid') && Math.random() < 0.4) {
    qLine('"That\'s their number, folks. They\'re holding it. Anybody else?"', PAL.orange);
    speak(['auc_limit_out']);
  }
  resolveNpcs(1);
  if (au.bid === b0 && !au.done) { au.closing = 1; au.closingT = 0; au.closingRollPlayed = false; qLine('Going once...', PAL.yellow, 'once'); }
}
function playerPass() {
  const au = G.auction;
  if (au.dutch && !au.done) { dutchWalk(au); return; }   // the Dutch clock runs out without you
  if (au.sealed && !au.done) { sealedWalk(au); return; }   // the one-number round opens the slips without yours
  if (au.runUp) au.runUpEnded = au.runUp;  // loseAuction reads whether the push was deliberate
  if (au.leader === null) {
    resolveNpcs(40);
    if (au.leader && au.leader !== 'you') loseAuction();
    else if (!au.done) {
      qLine('No bids. The unit stays locked.', PAL.gray, 'nosale');
      au.done = true;
    }
  } else if (au.leader !== 'you') {
    resolveNpcs(40);              // step out and the rest of the room finishes the fight
    loseAuction();
  }
}
// a rival takes it. The town remembers who, and whether you were ever in it.
function loseAuction() {
  const au = G.auction, w = au.leader;
  au.queue.push({ text: rivalLine(w.def, 'win', au.R) + ' (' + fmt$(au.bid) + ')', col: PAL.orange, sfx: 'lose', npcId: w.def.id, showBid: au.bid, showLeader: leaderLabel(), then: () => { G.cur.sold = true; } });
  const contested = au.log.concat(au.queue).some((l) => l.sfx === 'pbid');
  // they went past their own number against you and you let them keep it — on purpose (RUN
  // THEM UP) or by dropping out under a spite bid (the bait). Either way they will work it out.
  const stuck = contested && pushingYou(w) && pushBackSettle(au, false);   // they were pushing you, and you stopped
  const over = (!stuck && !w.crowd && w.everLed && (w.topRaise || 0) > w.cap) ? au.bid - w.cap : 0;
  if (over > 0 && contested) {
    const deliberate = !!(au.runUp || (au.runUpEnded && au.runUpEnded.id === w.def.id));
    au.runUp = null;
    au.queue.push({ text: shortRivalName(w.def) + ' paid ' + fmt$(over) + ' over their own number. Somebody will do that sum for them on the drive home.', col: PAL.green, sfx: 'aside', showBid: au.bid, showLeader: leaderLabel() });
    recordEvent('ranUp', { unit: G.cur.num, rival: w.def.id, name: w.def.name, amt: over, paid: au.bid, deliberate });
    bump('ranUp');
    // the first spite war was his idea: it costs you nothing with him. And from the back they never saw who it was.
    if (!au.spiteWar && !quietHidden(au)) standingBump(w.def.id, -2);
  }
  au.runUp = null;
  cardsOnTable(au);
  const lostE = { unit: G.cur.num, rival: w.def.id, bid: au.bid, value: G.cur.value, contested };
  if (duoHalvesIn(au.npcs)) lostE.halves = true;               // Cody and Kaylee's week apart: both of them were in it
  recordEvent('lost', lostE);
  if (au.spiteWar && (au.pbids || 0) > 0) spiteWarSettle(w.def.id === 'sal' ? 'salStuck' : 'salQuit', au.bid);
  // the feud settled it between themselves, over the odds: the paper notices two people being silly
  if (w.feud && (w.topRaise || 0) > w.cap) recordEvent('feud', { unit: G.cur.num, rival: w.def.id, other: w.feud, price: au.bid });
  if (!w.crowd) noteLetGo(G.cur, w.def.id, au.bid, contested ? 'lost' : 'watched');
  // they needed it, you were right there, and you let them have it: that is owed
  if (!contested && w.needs && G.cur.reason && G.cur.reason.kind === 'need') {
    standingBump(w.def.id, 1);
    recordEvent('letHaveIt', { unit: G.cur.num, rival: w.def.id });
    au.queue.push({ text: shortRivalName(w.def) + ' looks over at you and nods. You let them have it. That is owed.', col: PAL.green, sfx: 'aside', npcId: w.def.id, react: 'win', showBid: au.bid, showLeader: leaderLabel() });
  }
  bookAfterSale(au);
  au.done = true;
  bump('lost');
  if (!w.crowd) bumpIn('beatenBy', w.def.splitFrom || w.def.id);
  tallyRaises(au);
}
// something the office blurred, anywhere in the door
function lockerHasCensored(lk) {
  return lk.items.some((it) => it.censored || (it.loot && it.loot.some((l) => l.censored)));
}
// the day remembers who raised against you, and how often
function tallyRaises(au) {
  if (!au.raisesBy) return;
  G.dayStats.raisesBy = G.dayStats.raisesBy || {};
  for (const id in au.raisesBy) G.dayStats.raisesBy[id] = (G.dayStats.raisesBy[id] || 0) + au.raisesBy[id];
  au.raisesBy = null;
}
// ---- a door dropped on you (user, 2026-09-18): "it could happen you get it dropped on you. And if you have room,
// good, but most likely you will have to make choices so you can get the 3rd locker." What you can do about it:
//   DIG IT ANYWAY - it is a door; dig it. Costs the energy you were saving.
//   FLIP TO PETE  - Pawn Pete takes it unopened, on what the front row shows (PETE_FLIP of it), never more
//                   than DROP_FLIP_CAP of what you paid: quick money, always a loss, and you never learn
//                   what was at the back of it.
//   LEAVE IT      - walk away and pay the yard to clear it sealed (the haul-off, by the truckload).
//   GIVE IT BACK  - on the opening days, once a career: the clerk refunds you. Day one should not punish;
//                   the lesson is what a drop is, not what it costs.
const PETE_FLIP = 0.45, DROP_FLIP_CAP = 0.7;
function dropOptions(lk) {
  const paid = lk.paid || 0;
  const sealed = lk.items.filter((it) => !it.cash);
  const flip = Math.max(5, Math.min(Math.round(paid * DROP_FLIP_CAP / 5) * 5, Math.round(visibleValue(lk) * PETE_FLIP / 5) * 5));
  const leave = (dumpFeeOn() && !dumpWaived()) ? dumpFeeFor([], sealed) : 0;
  const opening = typeof openingDay === 'function' && !!openingDay(G.world, curTown(), G.day);
  return { flip, leave, giveBack: opening && !G.world.dropForgiven };
}
function dropDone(lk, how) {
  recordEvent('dropped', { unit: lk.num, how, paid: lk.paid || 0, value: lk.value });
  bump('dropped_' + how);
  G.auction = null;
  G.mode = 'yard';
  saveGame();
}
function dropFlip(lk) {
  const o = dropOptions(lk);
  lk.flipped = true; lk.flipGot = o.flip;
  gain(o.flip, 'Pawn Pete takes unit ' + lk.num + ' off your hands, unopened.');
  dropDone(lk, 'flip');
}
function dropLeave(lk) {
  const o = dropOptions(lk);
  lk.leftAll = true;
  if (o.leave > 0) {
    if (G.money >= o.leave) { spend(o.leave); toast('You walk away from unit ' + lk.num + '. The yard clears it: ' + fmt$(o.leave) + '.', PAL.gray); }
    else { dumpOwe(o.leave); toast('You walk away from unit ' + lk.num + '. The clearing, ' + fmt$(o.leave) + ', goes on your bill.', PAL.orange); }
  } else toast('You walk away from unit ' + lk.num + '. The clerk waves the clearing off.', PAL.gray);
  dropDone(lk, 'leave');
}
function dropGiveBack(lk) {
  if (!dropOptions(lk).giveBack) { play('denied'); return; }
  G.world.dropForgiven = G.day;
  const back = lk.paid || 0;
  G.money += back; G.daySpent = Math.max(0, (G.daySpent || 0) - back);
  if (G.dayStats) { G.dayStats.lockersWon = Math.max(0, (G.dayStats.lockersWon || 0) - 1); G.dayStats.paidForLockers = Math.max(0, (G.dayStats.paidForLockers || 0) - back); }
  lk.won = false; lk.shut = true; lk.givenBack = true;
  toast('"First one\'s on the house," says the clerk, and tears up the slip. ' + fmt$(back) + ' back. "Next one you keep."', PAL.cyan);
  dropDone(lk, 'giveBack');
}
function winAuction() {
  const share = G.auction.partner ? Math.ceil(G.auction.bid / 2) : G.auction.bid;   // a partner pays the other half
  spend(share);
  G.cur.won = true;
  G.cur.paid = share;
  if (G.auction.spiteWar && (G.auction.pbids || 0) > 0) spiteWarSettle('youPaid', G.auction.bid);   // you won Sal's war, at his price
  if (G.auction.partner) {
    G.cur.partner = G.auction.partner.id;
    recordEvent('partnered', { unit: G.cur.num, rival: G.auction.partner.id, bid: G.auction.bid - share });
    bump('partnered');
    standingBump(G.auction.partner.id, 1);
  }
  if (G.auction.posture === 'loud') { const m = G.world.rivalMem = G.world.rivalMem || {}; m.bigSpender = { town: G.world.town, day: G.day }; }   // the office writes it down
  G.dayStats.lockersWon++;
  G.dayStats.paidForLockers += share;
  // you took a door somebody needed, in front of them
  const needer = (G.cur.reason && G.cur.reason.kind === 'need') ? G.auction.npcs.find((n) => n.needs && n.active) : null;
  if (needer) {
    standingBump(needer.def.id, -1);
    recordEvent('tookNeed', { unit: G.cur.num, rival: needer.def.id });
    G.auction.queue.push({ text: shortRivalName(needer.def) + ' needed that one. Everybody saw who took it.', col: PAL.lred, sfx: 'aside', npcId: needer.def.id, react: 'beaten', showBid: G.auction.bid, showLeader: 'you' });
  }
  // the fact of it: what the door showed, what it cost, who was in the room
  const doorCats = [], doorBases = [];
  let doorSafe = false;
  for (const it of G.cur.items) {
    if (it.layer !== 2) continue;
    if (!doorCats.includes(it.cat)) doorCats.push(it.cat);
    if (!doorBases.includes(it.base)) doorBases.push(it.base);
    if (it.loot && it.locked) doorSafe = true;
  }
  recordEvent('won', {
    unit: G.cur.num, paid: G.auction.bid, value: G.cur.value, arch: G.cur.archId, contract: G.cur.contract,
    cols: G.cur.cols, doorCats, doorBases, doorSafe, edTier: edTier(G.cur),
    against: G.auction.npcs.filter((a) => a.active && !a.crowd).map((a) => a.def.id),
    fought: G.auction.npcs.filter((a) => a.active && !a.crowd && a.everLed).map((a) => a.def.id),   // the ones who led at some point and lost it to you
  });
  // Vermillion: a door bought without a viewing is its own story
  const blind = !!townRule('peekLimit') && !(G.today.peeked || []).includes(G.cur.num);
  if (blind) recordEvent('blindWin', { unit: G.cur.num, paid: G.auction.bid, amt: G.auction.bid, value: G.cur.value });
  if (G.cur.rare === 'nineLamps') recordEvent('nineLamps', { unit: G.cur.num });
  // the books
  bump('spentAuction', share); bump('won'); bumpIn('townWins', G.world.town);
  for (const id of G.auction.npcs.filter((a) => a.active && !a.crowd && a.everLed).map((a) => a.def.splitFrom || a.def.id).filter((id, i, arr) => arr.indexOf(id) === i)) bumpIn('beat', id);
  if (blind) bump('blind');
  const edSaid = edTellInfo(G.cur, G.world, G.day);
  if (edSaid && edSaid.misleading) bump('edFooled');         // the notebook lied, and you bought it anyway
  G.cur.blind = blind;
  tallyRaises(G.auction);

  // rival memory: short fuse, not a campaign
  const mem = G.world.rivalMem;
  const sal = G.auction.npcs.find((a) => a.def.id === 'sal');
  if (sal && sal.active && sal.everLed) {
    mem.salSnipes = (mem.salSnipes || 0) + 1;
    if (mem.salSnipes >= 2) {
      mem.salSnipes = 0;
      mem.salGrudgeUntil = G.day + 4;
      toast('Sal watches you count your change. He does not blink.', PAL.red, 3);
    }
  }
  if (sal && sal.active && lockerHasCensored(G.cur)) toast('Sal, on the way past: "Enjoy the... item."', PAL.red, 3);
  if (edTellInfo(G.cur, null, 0)) {          // Ed had this one calculated
    mem.edTaken = (mem.edTaken || 0) + 1;
    if (mem.edTaken >= 3) {
      mem.edTaken = 0;
      mem.edQuietUntil = G.day + 5;
      toast('Ed closes his notebook when you walk past.', PAL.cyan, 3);
    }
  }
}
// ---- the room-first auction screen (docs/AUCTION_SCREEN_PLAN.md, built 2026-09-14) ----
// The room is the picture, the number is the loudest thing, the newest log line is the question. One thing is
// selected at a time: a face (au.sel, grown in place), the SAY SOMETHING slip (au.slipOpen), the posture panel
// (au.postureOpen) or a question the run-up asks (au.ask, in the log with its answers on the bar). Each one holds
// the room (au.roomHeld); Escape or a click on the stage puts it away. Nothing opens a pop-up over a sale.
// Optional art (ui\paddle.png, ui\ticket.png, ui\stage_strip.jpg): drawn shapes stand in without it.
const _uiImg = {};
const AUC_UI_ART = ['paddle.png', 'ticket.png', 'stage_strip.jpg'];
function auctionMenuOpen(au) { return !!(au && (au.sel || au.slipOpen || au.postureOpen || au.ask)); }
function aucCardRects(n) {
  const gap = 8, w = n <= 4 ? 140 : Math.floor((736 - gap * (n - 1)) / n);
  const total = n * w + Math.max(0, n - 1) * gap, x0 = 208 + Math.round((736 - total) / 2);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + i * (w + gap), y: 158, w, h: 168 });
  return out;
}
function aucChant(au) {
  if (au.dutch && !au.done) return au.dutch.started ? '"' + fmt$(au.dutch.price) + '... anybody? Shout it."' : '"My rules. I start high."';
  if (au.sealed && !au.done) return au.sealed.handed ? '"Slips in. Let us have a look at them."' : '"One number, folks. Write it down."';
  if (au.done) return G.cur.won ? '"Sold, to you."' : (au.leader && au.leader !== 'you' ? '"Sold."' : (G.cur.pulled ? '"That one is pulled, folks."' : '"No sale."'));
  if (!au.shownBid) return '"Who starts me at ' + fmt$(G.cur.minBid) + '?"';
  if (au.shownLeader === 'you') return '"' + fmt$(au.shownBid) + ', do I hear more?"';
  return '"Would you give ' + fmt$(au.shownBid + (au.step || 25)) + '?"';
}
// where your price landed against the numbers the room showed at the hammer (public by then)
function aucPriceStamp(au) {
  if (!au.done || !au.revealed) return null;
  const step = au.step || 25;
  let top = null;
  for (const n of au.npcs) if (n.active && !n.crowd && n !== au.leader && n.shownCap != null && (!top || n.shownCap > top.shownCap)) top = n;
  if (au.dutch && au.leader === 'you') {       // the clock: how early you shouted
    if (!top || top.shownCap < (G.cur.minBid || 0)) return { head: 'NOBODY ELSE WAS GOING TO SHOUT', col: PAL.orange, lines: ['it would have come down to ' + fmt$(G.cur.minBid)] };
    const early = au.bid - top.shownCap;
    return { head: early <= step * 2 ? 'FIRST VOICE, JUST IN TIME' : 'FIRST VOICE, ' + fmt$(early) + ' EARLY', col: early <= step * 2 ? PAL.green : PAL.orange, lines: [shortRivalName(top.def) + ' was waiting for ' + fmt$(top.shownCap)] };
  }
  if (au.sealed && au.leader === 'you') {       // the slips: how much of your number you did not need
    if (!top || top.shownCap < (G.cur.minBid || 0)) return { head: 'NOBODY ELSE WROTE A NUMBER', col: PAL.green, lines: ['you wrote ' + fmt$(au.bid)] };
    const by = au.bid - top.shownCap;
    return { head: by <= step ? 'WON IT BY A HAIR' : 'WON IT BY ' + fmt$(by), col: by <= step * 2 ? PAL.green : PAL.orange, lines: [shortRivalName(top.def) + ' wrote ' + fmt$(top.shownCap)] };
  }
  let yourTop = 0;
  for (const l of au.log.concat(au.queue)) if (l.sfx === 'pbid' && (l.amt || 0) > yourTop) yourTop = l.amt;
  if (au.leader === 'you') {
    if (!top || top.shownCap < (G.cur.minBid || 0)) return { head: 'NOBODY ELSE WANTED IT', col: PAL.green, lines: ['you paid ' + fmt$(au.bid)] };
    const had = shortRivalName(top.def) + ' had ' + fmt$(top.shownCap);
    if (au.bid <= top.shownCap) return { head: 'UNDER THE ROOM', col: PAL.green, lines: [had] };
    if (au.bid - top.shownCap <= step * 2) return { head: "AT THE ROOM'S NUMBER", col: PAL.gray, lines: [had] };
    return { head: 'OVER THE ROOM BY ' + fmt$(au.bid - top.shownCap), col: PAL.orange, lines: [had] };
  }
  if (au.leader && au.leader.def) return { head: 'WENT TO ' + shortRivalName(au.leader.def).toUpperCase() + ' FOR ' + fmt$(au.bid), col: PAL.orange, lines: [yourTop ? 'you stopped at ' + fmt$(yourTop) : 'you never bid'] };
  return null;
}
// `t`: how long the paddle has been up, so it arrives with some weight in it - a hand throws a paddle up,
// it overshoots, it settles (2026-09-21). Anything over a second is a paddle that is simply up.
function drawAucPaddle(x, by, up, grey, slam, t) {
  const spring = up && t != null && t < 1 ? Math.exp(-6 * t) * Math.sin(t * 17) * 7 : 0;
  const hy = Math.round(by - (up ? 46 + (slam ? 5 : 0) + spring : 26));
  if (up && !grey) { g.globalAlpha *= 0.35; px(g, x + 1, by - 3, 14, 3, '#05060a'); g.globalAlpha /= 0.35; }   // its shadow on the card
  const img = _uiImg.paddle && _uiImg.paddle[0];
  if (img) {
    g.globalAlpha *= grey ? 0.4 : (up ? 1 : 0.75);
    g.drawImage(img, x, hy, 16, 27);
    g.globalAlpha = grey ? g.globalAlpha / 0.4 : (up ? g.globalAlpha : g.globalAlpha / 0.75);
    return;
  }
  px(g, x + 6, hy + 14, 4, by - hy - 14, grey ? '#3a3f58' : PAL.dwood);
  px(g, x, hy, 16, 15, PAL.ink);
  px(g, x + 1, hy + 1, 14, 13, grey ? '#4a4f66' : (up ? PAL.paper : '#b8ab8a'));
  if (!grey) px(g, x + 4, hy + 5, 8, 3, up ? PAL.red : '#8a7d5c');
}
// ---- the rail: the door as a reminder, the row, your names, one slot for what matters now ----
// ---- what the door LOOKS like it is worth (user's rework, 2026-09-20) ----
// "replace the 1st 2nd door etc with a estimated locker value from view. It can show the player what its
// estimated to be worth from the door and maybe a little extra for whats behind. And also on this screen it
// can say how much you are potentially overpaying or saving. It will help with the suspense."
//
// The rule this has to live by is the one the whole game rests on: the door must not become a readout. So
// the front row is counted honestly - you can SEE it - and widened by how little you did at the door; and
// the back is a GUESS, made the way a person makes one, off how many shapes are in there and what the front
// row averages, NEVER off what those things are actually worth. The number is wrong often, and it is meant
// to be: it is the guess you are bidding against, not the answer.
//
// Seeded per door per day, so it does not wander while you are bidding, and rounded to $25 so it reads as a
// guess rather than a figure somebody worked out.
function doorEstimate(lk) {
  if (!lk || !lk.items) return null;
  const R = RNG(strHash('est_' + G.worldSeed + '_' + G.day + '_' + lk.num));
  const it = lk.intel || {};
  const r25 = (n) => Math.max(0, Math.round(n / 25) * 25);
  // What you have actually SEEN. A long look is the whole point of the second row: it moves those things
  // out of the guessing and into the counting, which is what makes six energy at the door worth spending.
  const deep = !!(lk.longLook || it.deep);
  const seenN = lk.items.filter((x) => x.layer === 2 || (deep && x.layer === 1));
  const darkN = lk.items.filter((x) => !(x.layer === 2 || (deep && x.layer === 1)));
  const seenVal = seenN.reduce((t, x) => t + (x.val || 0), 0);
  // how sure you are of what you saw: a proper look tightens it, the loupe a shade more
  let band = it.look ? 0.16 : 0.3;
  if (deep) band -= 0.05;
  if (lk.loupeUid) band -= 0.03;
  if (lk.lookTight) band -= 0.05;                 // you went and looked at it yourself, from the front
  const fLo = r25(seenVal * (1 - band)), fHi = r25(seenVal * (1 + band));
  // and the dark: shapes, priced at what the things you CAN see average. Deliberately generous at the top
  // end and thin at the bottom, because that is how a person guesses at a room they cannot see into - and
  // because a guess that is only ever too low is a sum, not a guess.
  const per = seenN.length ? seenVal / seenN.length : 30 * ((curTown() || {}).priceMult || 1);
  // Tuned by measuring sixty real doors: the hunch is off by up to four tenths either way, and the band
  // round it is 28%. That lands the true worth INSIDE the guess a little under half the time, and wrong in
  // both directions the rest - twelve doors in sixty worth less than they looked, twenty worth more. A
  // wider band was useless (it spanned three times the answer) and a narrower one made the guess a sum.
  // A look from the front narrows the dark: you were close enough to see the shapes. A look that was WRONG
  // narrows it just as confidently round a number that is not the one (2026-09-22) - the point of a source
  // that can lie is that it never feels like one.
  let mid = darkN.length * per * R.r(0.7, 1.4);
  if (lk.lookTight === 1) mid = darkN.length * per * R.r(0.92, 1.12);
  else if (lk.lookTight === -1) mid = darkN.length * per * R.pick([0.45, 1.75]);
  const spread = deep ? 0.18 : (lk.lookTight ? 0.14 : 0.28);
  const bLo = r25(mid * (1 - spread)), bHi = r25(mid * (1 + spread));
  return { front: visibleValue(lk), seenVal, fLo, fHi, bLo, bHi, lo: fLo + bLo, hi: fHi + bHi, backN: darkN.length, deep };
}
// the live half: what the number on the block is against that guess
function estVerdict(est, bid) {
  if (!est) return null;
  if (bid < est.lo) return { t: '~' + fmt$(est.lo - bid) + ' under the guess', c: PAL.green };
  if (bid > est.hi) return { t: '~' + fmt$(bid - est.hi) + ' over the guess', c: PAL.red };
  return { t: 'right about what it looks worth', c: PAL.yellow };
}
function drawAucRail(au, menu) {
  const x = 16, w = 180;
  panel(x, 44, w, 84, '#15171f', '#3a3f58');
  const afw = lkFrameW(G.cur);
  const sc = Math.min((w - 8) / (afw + 20), 80 / 364);
  g.save(); g.beginPath(); g.rect(x + 2, 46, w - 4, 80); g.clip();
  g.translate(Math.round(x + (w - (afw + 20) * sc) / 2), 46 - Math.round(24 * sc)); g.scale(sc, sc);
  drawLockerFrame(10, 30, 1, afw);
  drawDoorwayGloom(10, 30, afw);
  drawLockerItems(10, 30, G.cur.items, { doorway: true });
  g.restore();
  const sawIt = !townRule('peekLimit') || (G.today.peeked || []).includes(G.cur.num);
  if (sawIt) {
    const hov = !menu && inRect(mouse.x, mouse.y, x, 44, w, 84);
    px(g, x + w - 78, 110, 74, 15, hov ? PAL.yellow : 'rgba(20,18,32,0.85)');
    T(x + w - 41, 111, 'LOOK AGAIN', hov ? PAL.ink : PAL.gray, 10, 'center', true);
    if (!menu) hot(x, 44, w, 84, () => { au.lookAgain = true; }, { label: 'LOOK AGAIN' });
  }
  // what it looks like it is worth, from the door. This is where the row of three used to be: which door of
  // the day you are stood at is on the yard screen, and it never changed a bid (user, 2026-09-20).
  panel(x, 136, w, 82, '#15171f', '#3a3f58');
  const est = sawIt ? doorEstimate(G.cur) : null;
  // your ticket for this door, where the row of stubs used to be: the art slot keeps its job, and the
  // number on it is drawn in ink over the stub so the picture can never garble it
  const tk = _uiImg.ticket && _uiImg.ticket[0];
  if (tk) {
    g.drawImage(tk, x + 6, 138, 40, 17);
    T(x + 26, 141, String(G.cur.num), PAL.ink, 11, 'center', true);
    T(x + 50, 140, 'LOOKS WORTH', PAL.dgray, 10, 'left', true);
  } else T(x + 8, 140, 'WHAT IT LOOKS WORTH', PAL.dgray, 10, 'left', true);
  if (!est) {
    T(x + 8, 158, 'you did not look', PAL.dgray, 12);
    T(x + 8, 174, 'at this one.', PAL.dgray, 12);
    T(x + 8, 194, 'everything from here', PAL.dgray, 11);
    T(x + 8, 206, 'is the room talking.', PAL.dgray, 11);
  } else {
    T(x + 8, 156, est.deep ? 'what you saw' : 'front row', PAL.gray, 11);
    T(x + w - 8, 155, fmt$(est.fLo) + '–' + fmt$(est.fHi), PAL.white, 12, 'right');
    T(x + 8, 172, est.deep ? 'and the back wall' : 'and the dark', PAL.gray, 11);
    T(x + w - 8, 171, est.bHi > 0 ? '+' + fmt$(est.bLo) + '–' + fmt$(est.bHi) : 'nothing much', est.deep ? PAL.lblue : PAL.dgray, 12, 'right');
    px(g, x + 8, 190, w - 16, 1, '#2e3244');
    T(x + 8, 197, 'A GUESS', PAL.dgray, 10, 'left', true);
    T(x + w - 8, 194, fmt$(est.lo) + '–' + fmt$(est.hi), PAL.yellow, 14, 'right', true);
    if (!menu && inRect(mouse.x, mouse.y, x, 136, w, 82)) {
      _btnTip = { cx: x + w / 2, top: 136, text: 'What the front row is worth, near enough, plus what a room that shape might be hiding. The dark is a guess, and a guess is wrong often. That is the job.' };
    }
  }
  // the yard's names for you
  const yname = yardName(), names = [];
  if (yname === 'whale') names.push('THE WHALE'); else if (yname === 'shark') names.push('THE SHARK');
  if (sniperNow()) names.push('THE SNIPER');
  let cx = x;
  for (const nm of names) {
    g.font = 'bold ' + textSize(11) + 'px ' + FONT;
    const cw = Math.ceil(g.measureText(nm).width) + 12;
    px(g, cx, 226, cw, 18, '#3a2a18');
    T(cx + 6, 229, nm, PAL.orange, 11, 'left', true);
    cx += cw + 4;
  }
  // one slot: the price stamp, your partner, the sit, or why this door matters
  const sy = 250;
  panel(x, sy, w, 146, '#15171f', '#3a3f58');
  const lines = [];
  const stamp = aucPriceStamp(au);
  if (au.look) {                                   // what the look told you, for as long as the door is open
    lines.push({ t: 'YOU LOOKED', c: PAL.lblue, s: 12, b: true });
    const lw = wrapText(au.look.text, 26);
    for (let i = 0; i < Math.min(3, lw.length); i++) lines.push({ t: i === 2 && lw.length > 3 ? lw[i].replace(/\s*\S*$/, '...') : lw[i], c: PAL.white, s: 12 });
    lines.push({ t: '', c: PAL.gray, s: 4 });
  }
  if (stamp) { lines.push({ t: stamp.head, c: stamp.col, s: 13, b: true }); for (const l of stamp.lines) lines.push({ t: l, c: PAL.gray, s: 12 }); }
  else if (au.partner) {
    const pd = rivalDef(au.partner.id), pn = pd ? shortRivalName(pd) : au.partner.name;
    lines.push({ t: 'WITH ' + pn.toUpperCase(), c: PAL.cyan, s: 13, b: true }, { t: 'halves on the price', c: PAL.gray, s: 12 }, { t: pn + ' picks first', c: PAL.gray, s: 12 });
  } else if (au.quietLeft > 0 && !au.closing) {
    lines.push({ t: 'SITTING QUIET', c: PAL.lblue, s: 13, b: true }, { t: au.quietLeft + ' more raise' + (au.quietLeft === 1 ? '' : 's'), c: PAL.gray, s: 12 }, { t: 'the room thinks you are out', c: PAL.dgray, s: 12 });
  } else if (FORMAT_WORDS[G.cur.format] && !au.done) {
    const fw = FORMAT_WORDS[G.cur.format];
    lines.push({ t: fw.tag, c: fw.col, s: 12, b: true }, { t: fw.railA, c: PAL.gray, s: 12 }, { t: fw.railB, c: PAL.gray, s: 12 });
  } else if (reasonShown(G.cur) && typeof reasonWords === 'function' && reasonWords(G.cur.reason)) {
    const rw = reasonWords(G.cur.reason);
    lines.push({ t: rw.tag, c: rw.col, s: 12, b: true }, { t: rw.sub, c: PAL.gray, s: 12 });
  }
  let ly = sy + 8;
  for (const l of lines) for (const ln of wrapText(l.t, 24)) { if (ly > sy + 120) break; T(x + 8, ly, ln, l.c, l.s, 'left', !!l.b); ly += l.s + 4; }
  if (!stamp && !au.partner && !(au.quietLeft > 0 && !au.closing) && G.cur.reason && G.cur.reason.kind === 'tenant') {   // Merle, at the rope
    px(g, x + 8, sy + 76, 54, 54, PAL.ink);
    drawPortrait('tenant', x + 10, sy + 78, 50, 50);
    T(x + 70, sy + 82, TENANT.short.toUpperCase(), PAL.white, 12, 'left', true);
    T(x + 70, sy + 98, 'rented it', PAL.gray, 12);
    T(x + 70, sy + 112, 'heckling', PAL.lred, 12);
  }
  // where the IN / OUT tally used to be: what the number on the block is against that guess. Who is still
  // in is on their own cards, dimmed the moment they fold, and a count of them never changed a bid; this
  // does (user, 2026-09-20: "it can say how much you are potentially overpaying or saving").
  px(g, x + 6, sy + 106, w - 12, 1, '#2e3244');
  if (est) {
    const bid = au.shownBid || au.bid || G.cur.minBid || 0;
    const v = estVerdict(est, bid);
    T(x + 8, sy + 113, 'AT ' + fmt$(bid), PAL.white, 13, 'left', true);
    const vf = fitLines(v.t, w - 16, [12, 11], 2);
    for (let i = 0; i < vf.lines.length; i++) T(x + 8, sy + 129 + i * 13, vf.lines[i], v.c, vf.fs);
  } else {
    T(x + 8, sy + 113, 'AT ' + fmt$(au.shownBid || au.bid || G.cur.minBid || 0), PAL.white, 13, 'left', true);
    T(x + 8, sy + 129, 'and no idea if that is a lot', PAL.dgray, 11);
  }
}
// ---- Buzz, the number, the chant, the crowd ----
function drawAucStage(au, dt) {
  panel(208, 44, 736, 106, '#171926', '#3a3f58');
  drawGavelPortrait(216, 50, 80, 80);
  // what the gavel says, beside the gavel (playtest 2026-09-15): who leads, and his line, bigger
  const leaderNpc = au.shownLeader && au.shownLeader !== 'you' ? au.npcs.find((n) => n.def.name === au.shownLeader) : null;
  const ln = au.shownLeader === 'you' ? 'YOU lead!' : (au.shownLeader ? (leaderNpc ? shortRivalName(leaderNpc.def) : au.shownLeader) + ' leads' : 'no bids yet');
  const clockOn = !!au.dutch && !au.done, sealedOn = !!au.sealed && !au.done;
  const topLine = clockOn ? 'THE CLOCK IS RUNNING' : (sealedOn ? (au.sealed.handed ? 'SLIPS ARE IN' : 'NUMBERS IN THE HAT') : ln);
  T(310, 54, topLine, clockOn || sealedOn ? PAL.orange : (au.shownLeader === 'you' ? PAL.green : PAL.white), 20, 'left', true);
  const chant = wrapText(aucChant(au), 24).slice(0, 2);
  for (let k = 0; k < chant.length; k++) T(310, 82 + k * 22, chant[k], PAL.orange, 18);
  // the number, on its own, bigger
  const bidFlash = G.time - (au.bidAt || -9) < 0.4;
  const cx = 672;
  // Buzz's panel is y 44..150, so its middle is 97. A 58px number drawn from ny has its middle at ny+29,
  // which puts ny at 66 — and leaves the GOING ONCE line at 128 clear underneath it.
  let nx = cx, ny = 66;
  const shk = (au.closing ? 1.6 : 0) + 2.2 * au.heat * au.heat;   // restless during the count, and the hotter the war the more so
  if (shk > 0.2) { nx += (Math.random() - 0.5) * shk * 2; ny += (Math.random() - 0.5) * shk * 2; }
  const num = fmt$(au.dutch && !au.done ? (au.dutch.started ? au.dutch.price : au.dutch.start)
    : (sealedOn ? au.sealed.mine : (au.shownBid === 0 ? G.cur.minBid : au.shownBid)));
  T(nx, ny, num, bidFlash ? PAL.white : PAL.yellow, 58, 'center', true);
  g.font = 'bold ' + textSize(58) + 'px ' + FONT;
  const nw = g.measureText(num).width;
  if (au.closing && !au.done) {
    g.globalAlpha = 0.65 + 0.35 * Math.sin(G.time * 7);
    T(cx, 128, au.closing >= 2 ? 'GOING TWICE...' : 'GOING ONCE...', PAL.yellow, 18, 'center', true);
    g.globalAlpha = 1;
  } else if (clockOn) {
    g.globalAlpha = 0.7 + 0.3 * Math.sin(G.time * 6);
    T(cx, 128, au.dutch.started ? 'GOING DOWN. FIRST VOICE TAKES IT' : 'STARTS HIGH, COMES DOWN', PAL.orange, 15, 'center', true);
    g.globalAlpha = 1;
  } else if (sealedOn) {
    T(cx, 128, au.sealed.handed ? 'YOUR SLIP IS IN' : 'YOUR NUMBER. ONE ONLY.', PAL.green, 15, 'center', true);
  } else if (au.shownBid === 0) T(cx, 128, 'to start', PAL.gray, 15, 'center');
  if (au.pendingFloat && au.pendingFloat.npcId === 'you') { addFloat('+' + fmt$(au.pendingFloat.amt), PAL.green, Math.min(760, cx + nw / 2 + 8), 104); au.pendingFloat = null; }
  drawDust(dt || 0);
  const crowd = au.npcs.find((n) => n.crowd && n.active);
  if (crowd) {
    const quiet = !!au.shownFolded[crowd.def.id];
    panel(812, 50, 124, 48, '#1b1d2a', quiet ? '#3a3f58' : (au.heat > 0.7 ? PAL.orange : '#5a6488'));
    T(821, 58, 'CROWD', quiet ? PAL.dgray : PAL.white, 12, 'left', true);
    const pips = quiet ? 0 : Math.round(au.heat * 5);
    for (let k = 0; k < 5; k++) px(g, 870 + k * 12, 60, 9, 9, k < pips ? (k >= 3 ? PAL.orange : PAL.yellow) : '#2e3244');
    T(821, 78, quiet ? 'quiet now' : (au.heat > 0.7 ? 'on its feet' : (au.heat > 0.35 ? 'leaning in' : 'watching')), PAL.gray, 11);
    if (au.look && au.look.kind === 'field') T(821, 90, au.look.n > 0 ? au.look.n + ' of them mean it' : 'none of them mean it', PAL.lblue, 11);
  }
}
// ---- one face card ----
function drawAucCard(au, a, r, menu) {
  const { x, y: ry, w, h } = r, id = a.def.id;
  const leads = !au.done && !!au.shownLeader && au.shownLeader === a.def.name;
  const out = !a.active || !!au.shownFolded[id];
  const winner = au.done && au.leader === a;
  const base = menu && !au.ask ? 0.4 : 1;
  const ph = h - 40;                                    // the portrait takes everything between the name and the strip
  // ---- the row breathes, the lit man stands up, the folded one lies down (2026-09-21) ----
  // Three cards side by side went very still between bids, and a lead was announced by rings pulsing round
  // the frame - a UI effect on a picture of a person. So: everybody sways a little, on their own phase; the
  // one who leads lifts off the row and catches the light; the one who is out tips and settles like a card
  // laid face-down on a table. Nothing here needs new art.
  const ph2 = strHash(id) % 628 / 100;                  // his own phase, so the row is never in step
  const bob = out || au.done ? 0 : Math.sin(G.time * 0.85 + ph2) * 0.9;
  const lift = leads || winner ? 2 : 0;
  const y = Math.round(ry + bob - lift + (out ? 3 : 0));
  const tilt = out ? (strHash(id) % 2 ? 1 : -1) * 0.022 : 0;   // a degree and a quarter, either way
  g.save();
  if (tilt) { g.translate(x + w / 2, y + h / 2); g.rotate(tilt); g.translate(-(x + w / 2), -(y + h / 2)); }
  g.globalAlpha = base;
  if (lift) {                                            // it is off the table now, so it throws a shadow
    g.globalAlpha = base * 0.5; px(g, x + 1, y + h + 3, w - 2, 3, 'rgba(0,0,0,0.9)');
    g.globalAlpha = base * 0.28; px(g, x + 4, y + h + 6, w - 8, 3, 'rgba(0,0,0,0.9)');
    g.globalAlpha = base;
  }
  const border = leads || winner ? 3 : 2;
  px(g, x - border, y - border, w + border * 2, h + border * 2, leads || winner ? PAL.yellow : (out ? '#252838' : '#7c86b0'));
  px(g, x, y, w, h, out ? '#181a24' : '#242737');
  px(g, x, y, w, 16, leads || winner ? PAL.yellow : '#2e3244');
  T(x + w / 2, y + 2, shortRivalName(a.def), leads || winner ? PAL.ink : (out ? PAL.gray : PAL.white), 12, 'center', true);
  g.globalAlpha = base * (out ? 0.45 : 1);
  px(g, x + 3, y + 18, w - 6, ph, '#1a1626');
  const fl = G.time - (au.flinchAt == null ? -9 : au.flinchAt);
  const jolt = (fl >= 0 && fl < 0.35 && au.flinchBy !== id && !out) ? Math.round(Math.sin(fl * 40) * 3 * (1 - fl / 0.35)) : 0;
  g.save(); g.beginPath(); g.rect(x + 3, y + 18, w - 6, ph); g.clip();
  drawFace(a, x + 3 + jolt, y + 18 - Math.abs(jolt), w - 6, ph, { breakout: !out });   // a folded-out face stays in its box
  g.restore();
  // the light in the room falls on whoever is leading it, and everybody else stands half a step back
  if (leads || winner) {
    const gr = g.createLinearGradient(0, y + 18, 0, y + 18 + ph);
    gr.addColorStop(0, 'rgba(255,212,120,0.26)');
    gr.addColorStop(0.55, 'rgba(255,196,96,0.10)');
    gr.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = gr; g.fillRect(x + 3, y + 18, w - 6, ph);
  } else if (!out && !au.done && au.shownLeader) px(g, x + 3, y + 18, w - 6, ph, 'rgba(6,7,14,0.22)');
  if (out) {                                             // a folded corner, so a laid-down card reads at a glance
    g.fillStyle = 'rgba(10,11,18,0.85)';
    g.beginPath(); g.moveTo(x + w - 3, y + 18); g.lineTo(x + w - 3, y + 40); g.lineTo(x + w - 25, y + 18); g.closePath(); g.fill();
    px(g, x + w - 20, y + 20, 15, 2, '#6b2f36');
  }
  // where you are standing: a tab clipped to the card's own edge, on the side you are on
  if (au.beside === id && !out) {
    px(g, x - 3, y + 18, 3, ph, PAL.cyan);
    px(g, x - 3, y + 18, 30, 15, PAL.cyan);              // top corner: the paddle lives in the bottom one
    T(x + 12, y + 20, 'YOU', PAL.ink, 10, 'center', true);
  }
  const rr = au.react && au.react[id];
  const raised = !out && !au.done && (leads || (!!rr && rr.key === 'bid' && G.time - rr.at < 1.6));
  drawAucPaddle(x + 7, y + 16 + ph, raised, out, raised && !!rr && rr.key === 'bid' && G.time - rr.at < 0.2,
    raised && rr && rr.key === 'bid' ? G.time - rr.at : 9);
  // what they spent on the row, or that they need this one: a tag on the picture, not a row of its own
  const spent = a.crowd ? 0 : rivalSpentToday(id);
  const badge = a.needs ? 'NEEDS IT' : (spent > 0 ? 'SPENT ' + fmt$(spent) : '');
  if (badge) {
    g.font = 'bold ' + textSize(10) + 'px ' + FONT;
    const bw = Math.ceil(g.measureText(badge).width) + 8;
    px(g, x + w - 3 - bw, y + 18, bw, 15, 'rgba(20,18,32,0.88)');
    T(x + w - 7, y + 20, badge, a.needs ? PAL.orange : PAL.gray, 10, 'right', true);
  }
  g.globalAlpha = base;
  // the strip: one word. After the hammer, the truth.
  let stT = '', stC = PAL.dgray, icon = null;
  if (au.done && au.revealed && winner) { stT = 'WON ' + fmt$(au.bid); stC = PAL.yellow; }
  else if (au.done && au.revealed && a.active && a.shownCap != null) { stT = 'HAD ' + fmt$(a.shownCap); stC = PAL.yellow; }
  else if (!a.active) stT = 'SAT OUT';
  else if (au.shownFolded[id]) { stT = 'OUT'; stC = PAL.red; }
  else if (!au.done && quietHidden(au)) { stT = "CAN'T SEE"; stC = PAL.dgray; }   // from the back you do not see their faces
  else if (!au.done) {
    let st = au.dutch ? dutchTell(a, au.dutch.price) : ((au.sealed && !au.sealed.read) ? 'cool' : tellState(a, au.shownBid || 0, leads));
    if (a.marked && !quietHidden(au) && st !== 'push') st = 'mark';   // they are reading you, and it shows
    // a face you took your look at reads honest for the rest of the sale: the act shows as an act
    if (st === 'sweat' && (tellKnown(id) === 'act' || (lookKnows(au, id) && a.tellMode !== 'honest'))) st = 'act';
    const strip = TELL_STRIP[st];
    // No tell showing. The strip used to say SILENT under every quiet face, which is a word that never
    // changed and told you nothing; where they stand with you does change, and is worth the row (2026-09-21).
    if (strip) { stT = strip.t.toUpperCase(); stC = strip.c; icon = st; }
    else if (!a.crowd) {
      const sv = standingOf(id);
      if (sv <= -2) { stT = 'SORE AT YOU'; stC = PAL.lred; }
      else if (sv >= (typeof WARM_AT === 'number' ? WARM_AT : 2)) { stT = 'WARM TO YOU'; stC = PAL.green; }
      else if (sv < 0) { stT = 'A LITTLE SORE'; stC = PAL.orange; }
      else if (sv >= 1) { stT = 'NODS AT YOU'; stC = PAL.gray; }
      else { stT = '—'; stC = PAL.dgray; }
    } else stT = '—';
  }
  const sy = y + h - 21;
  px(g, x + 3, sy, w - 6, 18, 'rgba(20,18,32,0.9)');
  if (stT) {
    if (icon === 'sweat' || icon === 'act') { px(g, x + 8, sy + 4, 2, 4, PAL.lblue); px(g, x + 7, sy + 7, 4, 3, PAL.lblue); px(g, x + 13, sy + 8, 2, 3, PAL.lblue); }
    else if (icon === 'pride') { px(g, x + 7, sy + 4, 3, 8, PAL.lred); px(g, x + 11, sy + 6, 3, 6, PAL.lred); }
    else if (icon === 'warm') { const pu = 0.5 + 0.5 * Math.sin(G.time * 4); g.globalAlpha = base * (0.5 + 0.5 * pu); px(g, x + 8, sy + 6, 5, 5, PAL.yellow); g.globalAlpha = base; }
    T(icon ? x + 18 : x + w / 2, sy + 3, stT, stC, 11, icon ? 'left' : 'center', true);
  }
  g.globalAlpha = 1;
  g.restore();                                           // the tilt, if this one is laid down
  if (au.pendingFloat && au.pendingFloat.npcId === id) { addFloat('+' + fmt$(au.pendingFloat.amt), PAL.yellow, x + w / 2 - 16, y + 60); au.pendingFloat = null; }
  // the hotspot stays where the card SITS, not where it sways: a button that moves is a button you miss
  if (!menu) hot(x, ry, w, h, () => faceClick(a), { label: (au.done || a.folded || !a.active ? 'about ' : 'work on ') + a.def.name });
}
// ---- a face, grown in place: who they are to you, and what you can do to them ----
function drawAucSelected(au, faces) {
  const a = au.npcs.find((n) => n.def.id === au.sel);
  if (!a || au.done) { closeMoveMenu(); return; }
  const rects = aucCardRects(faces.length), i = faces.indexOf(a);
  const r0 = rects[i] || { x: 512, y: 158, w: 128, h: 176 };
  const w = 250, h = 256, x = clamp(Math.round(r0.x + r0.w / 2 - w / 2), 212, 944 - w), y = 144;
  hot(208, 40, 736, 364, closeMoveMenu, { label: 'close', focusable: false });   // the stage around it puts it back
  px(g, x - 3, y - 3, w + 6, h + 6, PAL.yellow);
  panel(x, y, w, h, '#242737');
  const id = a.def.id, nm = shortRivalName(a.def);
  T(x + w / 2, y + 6, a.def.name, PAL.yellow, 15, 'center', true);
  px(g, x + 10, y + 26, 96, 96, '#1a1626');
  drawFace(a, x + 10, y + 26, 96, 96);
  const sv = standingOf(id);
  let st = tellState(a, au.shownBid || 0, au.shownLeader === a.def.name);
  if (st === 'sweat' && (tellKnown(id) === 'act' || (lookKnows(au, id) && a.tellMode !== 'honest'))) st = 'act';
  const strip = TELL_STRIP[st];
  const right = [quietHidden(au) ? { t: "CAN'T SEE FROM THE BACK", c: PAL.dgray, b: true } : { t: strip ? strip.t.toUpperCase() : 'SILENT', c: strip ? strip.c : PAL.dgray, b: true },
    { t: standingLabel(sv), c: sv <= -4 ? PAL.red : (sv < 0 ? PAL.orange : (sv > 0 ? PAL.green : PAL.gray)) }];
  if (a.needs) right.push({ t: 'needs this one', c: PAL.orange });
  const spent = rivalSpentToday(id);
  if (spent > 0) right.push({ t: 'spent ' + fmt$(spent) + ' today', c: PAL.gray });
  let ty = y + 28;
  for (const it of right) for (const ln of wrapText(it.t, 18)) { if (ty > y + 110) break; T(x + 114, ty, ln, it.c, 12, 'left', !!it.b); ty += 15; }
  // what the yard has seen you do lately, on the card of the face you are thinking of pushing
  const seenN = !quietHidden(au) ? pushesSeen() : 0;
  const warn = !quietHidden(au) && pushWarnedNow() ? 'The clerk warned you: a push costs ' + fmt$(PUSH_FEE) + ' at the office, and he will think less of you.'
    : seenN >= 1 ? 'The yard has seen you push ' + (seenN === 1 ? 'once' : seenN === 2 ? 'twice' : seenN + ' times') + ' this week.'
    + (seenN >= 2 ? ' They may just let you have it.' : ' Do it again and they start to notice.') : null;
  const way = warn ? wrapPx(warn, w - 20, 11) : wrapText(WAY_LINES[id] || (a.def.tag + '.'), 38);
  for (let k = 0; k < Math.min(3, way.length); k++) T(x + 10, y + 128 + k * 14, way[k], warn ? (seenN >= 2 || pushWarnedNow() ? PAL.orange : PAL.gray) : PAL.gray, 11);
  const by = y + 176;
  {
    const usedCall = !!au.calledOut, usedRun = !!au.runUp || !!au.runUpEnded || au.leader === 'you';
    button(x + 10, by, 112, 30, usedCall ? 'CALLED OUT' : 'CALL THEM OUT', () => callOut(a), { col: '#8a5a20', fs: 11, disabled: usedCall });
    button(x + 128, by, 112, 30, au.runUp ? 'RUNNING UP' : 'RUN THEM UP', () => openRunUp(a), { col: PAL.red, fs: 11, disabled: usedRun });
    T(x + 66, by + 32, '\u22121 standing', PAL.dgray, 10, 'center');
    T(x + 184, by + 32, '\u22121 standing', PAL.dgray, 10, 'center');
    // where you stand is a choice about a PERSON, so it belongs on their card. The cost and the reason ride
    // in the LABEL, the way LOUD +3 does at the door: button() ignores opts.label and drops the hotspot
    // entirely once a button is disabled, so a disabled button cannot say anything for itself any other way.
    const here = au.beside === id, canStand = besideCan(a);
    button(x + 10, by + 48, 73, 24, besideLabel(a), () => standBy(a), { col: here ? PAL.dgreen : PAL.navy, fs: 11, disabled: !canStand,
      hint: 'stand next to ' + shortRivalName(a.def) + ' for this sale. What it gets you depends on who they are - and on you.' });
    button(x + 89, by + 48, 73, 24, 'ABOUT', () => { closeMoveMenu(); npcIntroShow(id, 'auction'); }, { col: PAL.slate, fs: 11 });
    button(x + 168, by + 48, 73, 24, 'BACK', closeMoveMenu, { col: PAL.slate, fs: 11 });
  }
}
// ---- SAY SOMETHING: a paper slip out of the log, the faces still visible above it ----
function drawSaySlip(au) {
  const rows = sayRows();
  const x = 208, w = 736, rh = 22, h = 34 + rows.length * rh + 22, y = Math.min(300, 498 - h);
  hot(0, 36, W, H - 36, closeMoveMenu, { label: 'close', focusable: false });
  px(g, x + 6, y + 8, w, h, 'rgba(0,0,0,0.4)');
  px(g, x - 2, y - 2, w + 4, h + 4, '#2a2417');
  px(g, x, y, w, h, '#e6dcc2');
  px(g, x, y, w, 3, '#f4ecd8');
  T(x + 12, y + 7, 'SAY SOMETHING ABOUT THE DOOR', '#7d2b3d', 14, 'left', true);
  const heard = (au.said || []).length;
  T(x + w - 12, y + 9, heard ? 'the room has heard you: believed half as much each time' : 'out loud. true or not. a lie is found out at the dig.', '#6a5d44', 11, 'right');
  let ry = y + 28, hint = null;
  for (const r of rows) {
    const hov = r.ok && inRect(mouse.x, mouse.y, x + 6, ry, w - 12, rh - 2);
    px(g, x + 6, ry, w - 12, rh - 2, hov ? '#d6caa9' : (r.ok ? '#efe6cf' : '#ddd3bb'));
    T(x + 14, ry + 4, fitLines(r.line.label, 150, [12, 11, 10], 1, true).lines[0], r.ok ? '#7d2b3d' : '#a89c80', 12, 'left', true);   // never into the line's own column
    T(x + 176, ry + 4, r.text, r.ok ? '#2a2417' : '#a89c80', 12);
    if (r.used) T(x + w - 14, ry + 4, 'said.', '#8a7d5c', 11, 'right');
    else if (r.line.cost) T(x + w - 14, ry + 4, r.line.cost + ' energy', '#8a7d5c', 11, 'right');
    if (hov) hint = r.line.hint;
    if (r.ok) hot(x + 6, ry, w - 12, rh - 2, () => { play('ui_click', 0.5); sayLine(r.line.id); }, { label: 'SAY: ' + r.line.label });
    ry += rh;
  }
  T(x + 12, ry + 4, hint || 'pick one, or click away.', '#6a5d44', 11);
}
// ---- the posture chip's panel: the other two ways to stand, and what they cost ----
function drawPosturePanel(au) {
  const others = ['steady', 'loud', 'quiet'].filter((k) => k !== au.posture);
  const x = 712, w = 232, h = 28 + others.length * 48, y = 398 - h;
  hot(0, 36, W, H - 36, closeMoveMenu, { label: 'close', focusable: false });
  px(g, x - 3, y - 3, w + 6, h + 6, PAL.yellow);
  panel(x, y, w, h, '#242737');
  T(x + 10, y + 7, 'Now ' + POSTURES[au.posture].label + '. You can change once.', PAL.white, 12, 'left', true);
  let by = y + 26;
  for (const k of others) {
    const P = POSTURES[k];
    button(x + 8, by, w - 16, 26, P.label + (P.cost ? '  (' + P.cost + ' energy)' : ''), () => { closeMoveMenu(); setPosture(k, false); },
      { col: k === 'loud' ? '#8a5a20' : (k === 'quiet' ? PAL.navy : PAL.dgreen), fs: 12, disabled: G.daylight < P.cost });
    T(x + 10, by + 29, P.hint.length > 40 ? P.hint.slice(0, 39) + '\u2026' : P.hint, PAL.gray, 10);
    by += 48;
  }
}
// ---- the log: three lines, the newest one is the question ----
function drawAucLog(au, busy) {
  // taller, with room above and below the lines so the panel never clips them (playtest 2026-09-15)
  panel(208, 334, 736, 66, '#181a24', au.ask ? PAL.yellow : '#5a6488');
  if (au.ask) {
    T(220, 340, au.ask.title, PAL.yellow, 15, 'left', true);
    const body = wrapText(au.ask.lines.map((l) => l.text).join(' '), 100).slice(0, 2);
    for (let k = 0; k < body.length; k++) T(220, 360 + k * 17, body[k], k === 0 ? PAL.white : PAL.gray, 13);
    return;
  }
  const flow = [], newest = au.log[au.log.length - 1];
  for (const l of au.log) for (const ln of wrapText(l.text, 96)) flow.push({ s: ln, col: l.col, fresh: l === newest });
  const tail = flow.slice(-3);
  const glow = G.time - (au.lineAt || -9) < 0.7;
  for (let i = 0; i < tail.length; i++) {
    const ly = 341 + i * 19, f = tail[i];
    if (f.fresh && glow) px(g, 212, ly - 2, 728, 18, 'rgba(255,205,117,0.14)');
    g.globalAlpha = f.fresh ? 1 : 0.55;
    T(220, ly, f.s, f.col, 14, 'left', f.fresh);
    g.globalAlpha = 1;
  }
  if (busy) hot(208, 334, 736, 66, hurryAuction, { label: 'hurry the auction', focusable: false });
}
// ---- the verb bar: five slots; the count, the paddle, the sit and a question each reshape it ----
// It sat at 406 with the help line, the van and eighty empty pixels under it (user, 2026-09-20: "the buttons
// need to align better with the bottom of the page - there's some gap there"). AUC_BAR_Y drops it, SAY
// SOMETHING takes the whole height beside it (drawAucChips), and the help line and the van strip fill what is left.
const AUC_BAR_Y = 410, AUC_BAR_H = 64;
// what your paddle is actually doing, in the words of where you are standing (2026-09-20)
function bidWord(au, amt) {
  if (au.posture === 'loud') return 'SHOUT +' + fmt$(amt);
  if (au.posture === 'quiet') return 'NOD +' + fmt$(amt);
  return 'BID +' + fmt$(amt);
}
function drawAucBar(au, busy, menu) {
  const Y = AUC_BAR_Y, HH = AUC_BAR_H;
  const slot = (i, span) => ({ x: 16 + i * 138, w: 130 * span + 8 * (span - 1) });
  if (au.ask) {
    const bs = au.ask.buttons, n = bs.length, bw = Math.floor((682 - 8 * (n - 1)) / n);
    for (let i = 0; i < n; i++) auctionButton(16 + i * (bw + 8), Y, bw, HH, bs[i].label, bs[i].cb, { col: bs[i].col, fs: 17, shape: 'square' });
    return;
  }
  if (au.done) {
    if (busy) return;
    const s = slot(0, 2);
    if (G.cur.won && G.cur.dropped) {
      // dropped on you: a door you only meant to push. The dig is one answer of four (dropOptions).
      const o = dropOptions(G.cur);
      button(s.x, Y, s.w, HH, 'DIG IT ANYWAY', () => startDig(), { col: PAL.orange, fs: 18 });
      const s2 = slot(2, 1), s3 = slot(3, 1), s4 = slot(4, 1);
      button(s2.x, Y, s2.w, HH, 'FLIP TO PETE +' + fmt$(o.flip), () => dropFlip(G.cur), { col: PAL.dgreen, fs: 12, hint: 'Pawn Pete takes it unopened, on what he can see from the door. Quick, and always a loss.' });
      button(s3.x, Y, s3.w, HH, o.leave ? 'LEAVE IT -' + fmt$(o.leave) : 'LEAVE IT', () => dropLeave(G.cur), { col: PAL.dred, fs: 13, hint: 'walk away and pay the yard to clear it, sealed. Saves your energy for the next door.' });
      if (o.giveBack) button(s4.x, Y, s4.w, HH, 'GIVE IT BACK', () => dropGiveBack(G.cur), { col: PAL.slate, fs: 13, hint: 'the clerk takes it off your hands and refunds you - once, while you are new here' });
      // to the right of the five slots, where the side chips were: above them it sat on the log's bottom edge
      stripT(712, Y + 8, "It's yours.", PAL.orange, 17, 'left', true);
      stripT(712, Y + 32, "You didn't want it.", PAL.orange, 15, 'left');
    } else if (G.cur.won) {
      // the beat after the cheer: the yard quiets, and then it lands that it is yours
      if (au.wonAt && !au.stung && G.time - au.wonAt > 0.55) { au.stung = true; play('sting_win', 0.95); }
      button(s.x, Y, s.w, HH, 'START DIGGING', () => startDig(), { col: PAL.orange, fs: 20 });
      stripT(s.x + s.w + 16, Y + 18, 'The unit is YOURS. Time to dig.', PAL.green, 20, 'left', true);
    } else button(s.x, Y, s.w, HH, 'BACK TO THE YARD', () => { G.mode = 'yard'; }, { col: PAL.slate, fs: 19 });
    return;
  }
  if (au.sealed) {                           // the one-number round: set your number, hand it in, or write nothing
    const sl = au.sealed, stp = au.step || 25, floor = G.cur.minBid || stp, ceil = bidCeiling();
    const w3 = slot(0, 3), s4s = slot(3, 1), s5s = slot(4, 1);
    if (sl.handed) {
      auctionButton(w3.x, Y, w3.w, HH, 'SLIP IS IN  ' + fmt$(sl.mine), () => {}, { disabled: true, col: PAL.green, fs: 20, shape: 'square' });
      auctionButton(s4s.x, Y, s4s.w, HH, 'HIGHEST TAKES IT', () => {}, { disabled: true, fs: 12, shape: 'round' });
      return;
    }
    const a1 = slot(0, 1), a2 = slot(1, 1), a3 = slot(2, 1);
    auctionButton(a1.x, Y, a1.w, HH, '-$' + stp, () => sealedAdd(-stp), { disabled: menu || sl.mine - stp < floor, col: PAL.slate, fs: 17, shape: 'square' });
    auctionButton(a2.x, Y, a2.w, HH, '+$' + stp, () => sealedAdd(stp), { disabled: menu || sl.mine + stp > ceil, col: PAL.dgreen, fs: 17, shape: 'square' });
    auctionButton(a3.x, Y, a3.w, HH, '+$' + stp * 4, () => sealedAdd(stp * 4), { disabled: menu || sl.mine + stp * 4 > ceil, col: PAL.dgreen, fs: 17, shape: 'square' });
    auctionButton(s4s.x, Y, s4s.w, HH, 'HAND IT IN', () => sealedHandIn(), { disabled: menu || sl.mine < floor || sl.mine > ceil, col: PAL.orange, fs: 17, shape: 'square' });
    auctionButton(s5s.x, Y, s5s.w, HH, 'NO NUMBER', () => playerPass(), { disabled: menu, col: PAL.red, fs: 15, shape: 'pill' });
    return;
  }
  if (au.dutch) {                            // the Dutch clock: one word, and the way out
    const d = au.dutch, s = slot(0, 3), s4c = slot(3, 1), s5c = slot(4, 1);
    g.globalAlpha = d.started ? 0.85 + 0.15 * Math.sin(G.time * 8) : 1;
    auctionButton(s.x, Y, s.w, HH, d.started ? 'SHOUT!  ' + fmt$(d.price) : 'THE CLOCK IS SETTING', () => dutchPlayerShout(), { disabled: !d.started || menu || d.price > bidCeiling(), col: PAL.orange, fs: 22, shape: 'square' });
    g.globalAlpha = 1;
    auctionButton(s4c.x, Y, s4c.w, HH, 'FIRST VOICE', () => {}, { disabled: true, fs: 13, shape: 'round' });
    auctionButton(s5c.x, Y, s5c.w, HH, 'LET IT GO', () => playerPass(), { disabled: menu, col: PAL.red, fs: 16, shape: 'pill' });
    return;
  }
  const dis = busy || menu;
  if (au.runUp) {
    // a push is running: the one button that matters is the one that ends it
    const t = au.npcs.find((n) => n.def.id === au.runUp.id);
    const s12 = slot(0, 3), s4r = slot(3, 1), s5r = slot(4, 1);
    auctionButton(s12.x, Y, s12.w, HH, 'STOP PUSHING', () => stopRunUp(), { col: PAL.orange, fs: 20, shape: 'square', disabled: menu,
      hint: 'stop answering them. Whatever the number is, it stands.' });
    auctionButton(s4r.x, Y, s4r.w, HH, t ? 'PUSHING ' + shortRivalName(t.def).toUpperCase() : 'PUSHING', () => {}, { disabled: true, fs: 12, shape: 'round' });
    auctionButton(s5r.x, Y, s5r.w, HH, 'LET IT GO', () => { stopRunUp(true); playerPass(); }, { disabled: menu, col: PAL.red, fs: 16, shape: 'pill' });
    return;
  }
  const openLbl = au.bid === 0;
  const st = (au.step || 25) * (au.posture === 'loud' ? 2 : 1);   // LOUD: the buttons say what your paddle actually does
  const sitting = au.quietLeft > 0 && !au.closing;
  const yours = au.leader === 'you';                               // the bid is already yours: nothing to raise
  const ceil = bidCeiling();
  const wide = slot(0, 3), s4 = slot(3, 1), s5 = slot(4, 1);
  if (_paddle) {
    const held = !!au.paddleHeld;
    const lbl = sitting ? 'SITTING (' + au.quietLeft + ')' : (held ? (yours ? 'YOURS. HOLD IT.' : 'IN. HOLD IT.') : (openLbl ? 'HOLD TO OPEN AT ' + fmt$(G.cur.minBid) : 'HOLD TO STAY IN'));
    g.globalAlpha = held ? 0.75 + 0.25 * Math.sin(G.time * 6) : 1;
    auctionButton(wide.x, Y, wide.w, HH, lbl, () => {}, { col: held ? PAL.green : PAL.dgreen, fs: 18, shape: 'square', disabled: sitting || menu });
    g.globalAlpha = 1;
    au.paddleRect = { x: wide.x, y: Y, w: wide.w, h: HH };
    auctionButton(s4.x, Y, s4.w, HH, 'LET GO TO HOLD', () => {}, { disabled: true, fs: 13, shape: 'round' });
  } else {
    au.paddleRect = null;
    if (sitting) auctionButton(wide.x, Y, wide.w, HH, 'SITTING (' + au.quietLeft + ')', () => {}, { disabled: true, fs: 18, shape: 'square' });
    else if (au.closing && au.leader && !yours) {
      // the count on them: in by a step, or a jump that scares the room
      const s12 = slot(0, 2), s3 = slot(2, 1);
      auctionButton(s12.x, Y, s12.w, HH, 'IN +$' + st, () => playerBid(st), { disabled: dis || au.bid + st > ceil, col: PAL.dgreen, fs: 20, shape: 'square' });
      auctionButton(s3.x, Y, s3.w, HH, 'JUMP +$' + st * 4, () => playerBid(st * 4), { disabled: dis || au.bid + st * 4 > ceil, col: '#8a5a20', fs: 15, shape: 'square' });
    } else {
      const s1 = slot(0, 1), s2 = slot(1, 1), s3 = slot(2, 1);
      auctionButton(s1.x, Y, s1.w, HH, openLbl ? 'START ' + fmt$(G.cur.minBid) : bidWord(au, st), () => playerBid(st), { disabled: dis || yours || (openLbl ? G.cur.minBid : au.bid + st) > ceil, col: PAL.dgreen, fs: 17, shape: 'square' });
      auctionButton(s2.x, Y, s2.w, HH, '+$' + st * 2, () => playerBid(st * 2), { disabled: dis || yours || openLbl || au.bid + st * 2 > ceil, col: PAL.dgreen, fs: 17, shape: 'square' });
      auctionButton(s3.x, Y, s3.w, HH, '+$' + st * 4, () => playerBid(st * 4), { disabled: dis || yours || openLbl || au.bid + st * 4 > ceil, col: PAL.dgreen, fs: 17, shape: 'square' });
    }
    const canHold = !dis && au.leader && au.leader !== 'you' && !au.closing && !sitting;
    const holdLbl = au.closing ? (yours ? 'GOING, GOING...' : 'HOLDING...') : 'HOLD OFF';
    auctionButton(s4.x, Y, s4.w, HH, holdLbl, () => holdOff(), { disabled: !canHold, col: PAL.slate, fs: au.closing ? 13 : 16, shape: 'round' });
  }
  auctionButton(s5.x, Y, s5.w, HH, au.closing && au.leader && !yours ? 'OUT' : 'LET IT GO', () => playerPass(), { disabled: dis || yours, col: PAL.red, fs: 16, shape: 'pill' });
}
// ---- the side chips: how you stand, and something to say ----
function drawAucChips(au, menu) {
  if (au.done || au.dutch || au.sealed) return;             // on a clock, or writing a number, there is nothing to say and no way to stand but ready
  // talking is meant to be half of this (user, 2026-09-20: "saying stuff in the bidding I think I want it to be
  // sort of a big part of it, so that should be a little more prominent"), so it is as big as the bidding itself,
  // and says how many things you have left to say. Where you stand and who you push are chips under it.
  const n = (au.said || []).length, left = sayRows().filter((r) => r.ok).length;
  auctionButton(712, AUC_BAR_Y, 232, AUC_BAR_H, 'SAY SOMETHING' + (n ? ' (' + n + ')' : ''), () => (au.slipOpen ? closeMoveMenu() : openSlipMenu()),
    { col: left ? '#5a3a6e' : PAL.slate, fs: 17, shape: 'square', disabled: !left || (menu && !au.slipOpen),
      hint: left ? 'one thing out loud. Whoever believes it bids like it.' : 'nothing left to say at this door' });
  T(828, AUC_BAR_Y + AUC_BAR_H - 20, left ? left + (left === 1 ? ' thing left to say' : ' things left to say') : 'said your piece', PAL.dgray, 11, 'center');
  const P = POSTURES[au.posture || 'steady'];
  const pid = au.posture || 'steady';
  const where = typeof stanceName === 'function' ? stanceName(pid === 'steady' ? 'join' : pid) : P.label;
  auctionButton(712, 480, lookReady(au) ? 76 : 112, 24, where, () => (au.postureOpen ? closeMoveMenu() : openPostureMenu()),
    { col: au.posture === 'loud' ? '#8a5a20' : (au.posture === 'quiet' ? PAL.navy : PAL.slate), fs: 11, shape: 'round', disabled: !!au.postureSwitched || (menu && !au.postureOpen),
      hint: au.postureSwitched ? 'you have moved once already this sale' : 'where you are standing: ' + P.hint });
  // RUN THEM UP was only ever on a face's own card, and a player who wanted exactly this did not know it existed
  // (user, 2026-09-18: "lets give players the option to bid up rivals, with no intent to buy"). Here it is aimed
  // at whoever leads - the one you would push - and opens their card at the number chips.
  const lead = au.leader && au.leader !== 'you' && !au.leader.crowd ? au.leader : null;
  // THE LOOK (2026-09-22): while it is still there the row carries three chips instead of two, because a
  // look is the other half of where you are standing and belongs beside it, not buried in a menu.
  const lookOn = lookReady(au);
  const runX = lookOn ? 872 : 830, runW = lookOn ? 72 : 114;
  if (lookOn) {
    const lc = lookCost(au);
    const kindWord = { unit: 'at the unit', face: 'at the faces', field: 'at the room' }[LOOK_KIND[au.posture || 'steady']];
    auctionButton(792, 480, 76, 24, 'LOOK \u2013' + lc, () => takeLook(),
      { col: PAL.navy, fs: 11, shape: 'round', disabled: G.daylight < lc || menu,
        hint: 'one look at this door, ' + kindWord + ' - that is what standing ' + (au.posture === 'loud' ? 'at the front' : (au.posture === 'quiet' ? 'at the back' : 'in the room')) + ' shows you. ' + lc + ' energy, and only until you bid. It can be wrong.' });
  }
  // LAST LOOK lives where the run-up chip does, because the run-up is dead once the count starts: one look
  // at the man who is leading, and a beat and a half to act on it (2026-09-22)
  if (au.closing && !au.done) {
    const can = lastLookReady(au);
    auctionButton(runX, 480, runW, 24, au.lastLook ? 'LOOKED' : 'LAST LOOK \u2013' + LASTLOOK_COST, () => takeLastLook(),
      { col: PAL.navy, fs: 11, shape: 'round', disabled: !can || G.daylight < LASTLOOK_COST || menu,
        hint: au.lastLook ? 'you have had your look at this one'
          : (quietHidden(au) ? 'from back here you cannot see his face - but you can see whether anybody else is going to answer. Holds the count a moment.'
            : 'one look at the man leading it: how close the price is to the number he came in with. Holds the count a moment, then it goes on.') });
    return;
  }
  const usedRun = !!au.runUp || !!au.runUpEnded;
  auctionButton(runX, 480, runW, 24, au.runUp ? 'RUNNING UP...' : (lead && !lookOn ? 'RUN ' + shortRivalName(lead.def).toUpperCase() + ' UP \u25B8' : 'RUN UP \u25B8'),
    () => { if (lead) openRunUp(lead); },
    { col: PAL.red, fs: 11, shape: 'round', disabled: !lead || usedRun || !!au.closing || au.quietLeft > 0 || (menu && au.selMode !== 'runup'),
      hint: 'answer whoever leads, every time, until you press STOP. If they step back first, the door is yours - and you wanted it or you did not.'
        + (pushWarnedNow() && !quietHidden(au) ? '  The clerk warned you: ' + fmt$(PUSH_FEE) + ' at the office.' : '') });
}
// ---- the cutout pop (IDEAS_TODO 2, built 2026-09-15, OFF since 2026-09-15) ----
// The user turned it off: "it doesnt look good". `POPS_ON` is the whole switch — flip it to true and every trigger
// below works again (a jump of four steps or more, the fold, the hammer, the story beats). If it comes back, the
// bigger cutout also wants the gavel's panel drawn after the pop in `drawAuction`, or his head covers the number.
// What it did: a rival stepped into the frame for about two seconds at a big moment ----
// A jump of four steps or more, the rival who held it folding, the winner at the hammer, and story beats (Bart's truck).
// Never takes input and never holds the room; two a sale at most, five seconds apart (a story beat skips the wait).
// Sized 292 tall with an 18 px caption before it was switched off; the drawing below is parked, not deleted.
// Art: the splash cutout (npcs\npc_<id>_cut.png, the bid pose); optional npc_<id>_cut_fold.png and npc_<id>_cut_win.png.
// The nine fold/win cutouts that were made went to _unused\npcs\ on 2026-09-17 (scrapped; off every sheet and prompt doc).
const POPS_ON = false;                       // the one switch: off 2026-09-15 at the user's word
const POP_MAX = 2, POP_GAP = 5, POP_DUR = 1.9;
// the fold and win poses are asked for the first time a rival pops, not at boot (the first pop uses the bid pose)
const _popCutsAsked = {};
function loadPopCuts(id) {
  if (_popCutsAsked[id]) return;
  _popCutsAsked[id] = true;
  for (const k of ['fold', 'win']) loadImageVariants('npcs/npc_' + id + '_cut_' + k, id + '_' + k, _cutImg, ['png'], true, true);
}
function aucPop(au, id, kind, caption, story) {
  if (!POPS_ON) return false;                  // off: the moment still plays as a line, and no cutout art is fetched
  if (!au || !id || id === 'crowd') return false;
  const def = rivalDef(id);
  if (!def && !(story && caption)) return false;          // a story beat can pop somebody who is not bidding (the tenant)
  loadPopCuts(id);
  au.pops = au.pops || 0;
  if (au.pops >= POP_MAX) return false;
  if (!story && G.time - (au.popAt == null ? -99 : au.popAt) < POP_GAP) return false;
  const nm = def ? shortRivalName(def).toUpperCase() : '';
  const verb = def && def.id === 'duo' ? { jump: ' JUMP IT', fold: ' ARE OUT', win: ' TAKE IT' } : { jump: ' JUMPS IT', fold: ' IS OUT', win: ' TAKES IT' };
  au.pop = { id, kind, at: G.time, caption: caption || (nm + (verb[kind] || '')) };
  au.pops++; au.popAt = G.time;
  return true;
}
function drawAucPop(au, faces) {
  const p = au.pop;
  if (!p) return;
  const t = G.time - p.at;
  if (t < 0 || t > POP_DUR) { au.pop = null; return; }
  const inT = niEase(Math.min(1, t / 0.18)), outT = t > POP_DUR - 0.25 ? (t - (POP_DUR - 0.25)) / 0.25 : 0;
  const img = (p.kind === 'fold' && npcCutout(p.id + '_fold')) || (p.kind === 'win' && npcCutout(p.id + '_win')) || npcCutout(p.id);
  const rects = aucCardRects(faces.length), i = faces.findIndex((f) => f.def.id === p.id);
  const cx = i >= 0 ? rects[i].x + rects[i].w / 2 : 820;
  const hh = 292, ww = img ? Math.round(hh * img.width / img.height) : 210;
  const x = clamp(Math.round(cx - ww / 2), 212, 940 - ww);
  const y = Math.round(424 - hh + (1 - inT) * 80 + outT * (p.kind === 'fold' ? 90 : 30));
  g.save();
  g.beginPath(); g.rect(208, 44, 736, 358); g.clip();                  // his legs stop at the log line, the bar stays clear
  g.globalAlpha = 1 - outT;
  if (img) {
    if (p.kind === 'fold' && !(_cutImg[p.id + '_fold'] || []).length) g.filter = 'grayscale(0.85) brightness(0.8)';   // no fold pose yet: the bid pose, drained, sinking away
    g.drawImage(img, x, y, ww, hh);
    g.filter = 'none';
  } else {
    px(g, x - 3, y + hh - 216, 216, 216, PAL.ink);
    drawPortrait(p.id, x, y + hh - 213, 210, 210);
  }
  g.font = 'bold ' + textSize(18) + 'px ' + FONT;
  const cw = Math.ceil(g.measureText(p.caption).width) + 24;
  const lx = clamp(Math.round(cx - cw / 2), 212, 940 - cw), ly = Math.max(158, y + 10);
  px(g, lx - 2, ly - 2, cw + 4, 32, PAL.ink);
  px(g, lx, ly, cw, 28, p.kind === 'fold' ? PAL.slate : (p.kind === 'win' ? PAL.orange : PAL.yellow));
  T(lx + cw / 2, ly + 5, p.caption, p.kind === 'fold' ? PAL.white : PAL.ink, 18, 'center', true);
  g.restore();
  g.globalAlpha = 1;
}
// ---- the door goes up (playtest 2026-09-16, the user's idea: "make the auction bidding part start a little better") ----
// A sale used to simply be there. Now the room opens the way the peek does: Buzz throws the door up, the
// contents wipe into view behind it, and only then does anybody say anything. It is the same drawn door as
// everywhere else (drawLockerFrame's open fraction) and the same door_roll the peek plays, so it costs no
// art and no new sound. The room holds while it rises: the queue waits (pumpQueue), the bar is dead, and
// the first line lands on an open door.
// The renderer starts it, not startAuction: anything that never draws (every headless test) keeps doorT at
// 1 and behaves exactly as it always has. A ?demo= screen and MOTION: OFF skip it too.
const DOOR_RISE = 0.028;                    // a touch slower than the peek's 0.03: this one is the curtain
// PARKED (user, 2026-09-16): "the sorta reveal before the locker... a quick shot of the locker before the
// bidding. Remove that entirely." The machinery is left in one piece behind this flag, the same way POPS_ON
// parks the cutout pop, so it is one word to bring back and nothing else in the sale had to be unpicked.
const DOOR_ON = false;
function aucDoorStart(au) {
  au.doorInit = true;
  if (!DOOR_ON || !_motion || G.demo) return;   // parked; MOTION: OFF; and the fixed demo screens
  au.doorT = 0;
  play('door_roll'); shake(2, 0.35);
}
function aucDoorTick(au, dt) {
  // a frame with no time in it is not a frame. Every headless draw (the whole regression suite, which
  // draws a room some two dozen times) passes dt 0, or nothing at all, and none of those may start a
  // door: the room's queue waits on the door, so a door nobody is watching would hold the sale forever.
  if (!au.doorInit) { if (!(dt > 0)) return false; aucDoorStart(au); }
  if ((au.doorT == null ? 1 : au.doorT) >= 1) return false;
  au.doorT = Math.min(1, au.doorT + Math.max(1, dt * 60) * DOOR_RISE);
  return au.doorT < 1;
}
// the door itself, over the room: the unit's own frame, its gloom and its front row wiping into view
function drawAucDoor(au) {
  const t = au.doorT == null ? 1 : au.doorT;
  if (t >= 1) return;
  const fw = lkFrameW(G.cur), sc = Math.min(1, 736 / (fw + 20), 300 / (LK.frameH + 40));
  g.save();
  g.globalAlpha = 0.9; px(g, 0, 0, W, H, '#05060c'); g.globalAlpha = 1;
  g.translate(Math.round((W - fw * sc) / 2), 70); g.scale(sc, sc);
  // the frame (and its shutter) first, then the contents clipped into the gap under the slats —
  // the peek's order. The other way round, the frame repaints its own empty interior over the lot
  // and the unit reads as bare all the way up.
  drawLockerFrame(0, 0, t, fw);
  if (t >= 0.12) {                          // the contents wipe down as the slats go up, exactly as the peek does
    g.save();
    g.beginPath();
    g.rect(0, (LK.frameH - 6) * (1 - t), fw, (LK.frameH - 6) * t + 6);
    g.clip();
    drawDoorwayGloom(0, 0, fw);
    drawLockerItems(0, 0, G.cur.items, { doorway: true });
    g.restore();
  }
  g.restore();
  T(W / 2, 400, 'UNIT ' + G.cur.num, PAL.yellow, 26, 'center', true);
  T(W / 2, 432, t < 0.85 ? '"Let us have a look at her."' : 'the room leans in...', PAL.orange, 16, 'center');
}
function drawAuction(dt) {
  if (!drawBG()) px(g, 0, 0, W, H, '#14161f');
  drawTint();
  const au = G.auction;
  drawHeader('UNIT ' + G.cur.num);
  // the room's heat, eased so the sound and the shake never jump with a single line
  const heatTarget = auctionHeat(au);
  au.heat = (au.heat || 0) + (heatTarget - (au.heat || 0)) * Math.min(1, (dt || 0) * 1.5);
  const rising = aucDoorTick(au, dt);
  const busy = auctionBusy() || rising, menu = auctionMenuOpen(au);
  const faces = au.npcs.filter((a) => !a.crowd && !a.partner && (a.active || a.broke)).slice(0, 7);
  const strip = _uiImg.stage_strip && _uiImg.stage_strip[0];
  if (strip) { g.globalAlpha = 0.7; g.drawImage(strip, 208, 150, 736, 190); g.globalAlpha = 1; }
  drawAucRail(au, menu);
  drawAucStage(au, dt);
  const rects = aucCardRects(faces.length);
  if (!faces.length) T(576, 230, 'no named faces today', PAL.dgray, 14, 'center');
  for (let i = 0; i < faces.length; i++) if (au.sel !== faces[i].def.id) drawAucCard(au, faces[i], rects[i], menu);
  drawBreakouts();                        // hands and paddles over the borders, on top of every card
  drawAucLog(au, busy && !menu);
  drawAucBar(au, busy, menu);
  drawAucChips(au, menu);
  if (au.darkUntil && G.time < au.darkUntil) {       // the power is out: the stage and the rail go dark, the bar still works
    g.globalAlpha = 0.82; px(g, 208, 44, 736, 358, '#04050a'); px(g, 16, 44, 180, 352, '#04050a'); g.globalAlpha = 1;
    T(576, 206, 'THE POWER IS OUT', PAL.gray, 20, 'center', true);
    T(576, 234, 'the count waits. everybody is reading the door again.', PAL.dgray, 13, 'center');
  }
  if (!menu) drawAucPop(au, faces);
  drawAucDoor(au);                           // the curtain, over everything, only while it is coming up
  const sitting = au.quietLeft > 0 && !au.closing, yours = au.leader === 'you';
  let help = '';
  if (au.ask) help = 'the room is waiting on your answer.';
  else if (au.sel) help = 'the room holds while you size them up. click the stage or press Escape to put them back.';
  else if (au.runUp) help = 'your paddle answers theirs, every time. STOP PUSHING when you have had enough - or when they have.';
  else if (au.slipOpen) help = 'say one thing out loud. whoever believes it bids like it.';
  else if (au.postureOpen) help = 'change how you stand, once this sale.';
  else if (openingBeatOn(au)) help = 'nobody has opened yet. Somebody here might - or you can start it yourself.';
  else if (!au.done) help = sitting ? 'sitting quiet: the room thinks you are out. ' + au.quietLeft + ' more raise' + (au.quietLeft === 1 ? '' : 's') + ', or the count, and you can come back in.'
    : _paddle ? 'hold the paddle (or SPACE, or A) to stay in. let go and the count starts on them. click a face to work them.'
    : (yours ? 'the bid is yours. nobody bids against himself — the hammer does the rest.' : 'hold off to see who is still in. click a face to call them out or run them up.');
  if (busy && !menu && !au.done) help = (help ? help + '   ' : '') + '(click the log to hurry)';
  if (help) { const hf = fitLines(help, 690, [12, 11], 2); for (let i = 0; i < hf.lines.length; i++) T(16, 481 + i * 14, hf.lines[i], PAL.dgray, hf.fs); }
  stripT(16, 512, vanStripText() + '   |   Energy: ' + Math.max(0, Math.round(G.daylight)), PAL.gray, 14);
  if (au.sel) drawAucSelected(au, faces);
  else if (au.slipOpen) drawSaySlip(au);
  else if (au.postureOpen) drawPosturePanel(au);

  // ---- LOOK AGAIN: the doorway view back up full size, the room on hold ----
  if (au.lookAgain) {
    const afw = lkFrameW(G.cur);
    hotspots = [];
    px(g, 0, 0, W, H, 'rgba(8,8,14,0.86)');
    const s2 = Math.min(1, 900 / (afw + 20), 430 / 364);
    g.save(); g.translate(Math.round((W - (afw + 20) * s2) / 2), 36); g.scale(s2, s2);
    drawLockerFrame(10, 30, 1, afw);
    drawDoorwayGloom(10, 30, afw);
    drawLockerItems(10, 30, G.cur.items, { doorway: true });
    g.restore();
    T(W / 2, 10, 'ANOTHER LOOK — UNIT ' + G.cur.num, PAL.yellow, 16, 'center', true);
    button(W / 2 - 100, H - 56, 200, 40, 'BACK TO THE BID', () => { au.lookAgain = false; }, { col: PAL.slate, fs: 16 });
  }
}

// ============ DIG ============
function startDig() {
  // one van for the whole day: what you packed at earlier doors is already in
  // the pile, loaded and marked, and can be dropped here to make room (the
  // scrap man eats whatever you leave)
  G.dig = { pile: [], loadedSize: 0, cash: 0 };
  // whose these were, said once, here, because this is the moment you are actually standing in it. Said
  // before the first-day line so that on the one morning both apply, the first-day line is what stays up.
  { const ten = tenantFor(G.cur); if (ten) toast(ten.line, PAL.gray, 5); }
  if (bayOn() && !G.world.baySeen) { G.world.baySeen = true; clerkPop('First day: your van has room for EVERYTHING. Pull whatever you like - it all goes home with you tonight. From tomorrow, the van has a limit.', PAL.cyan, 6); }
  for (const it of G.van) { it.loaded = true; it.carried = true; G.dig.pile.push(it); G.dig.loadedSize += it.size; }
  G.van = [];
  G.pileScroll = 0;
  G.inspect = null;
  G.mode = 'dig';
}
function pullCost(it) { return 2 + Math.ceil(it.size / 3) + ((typeof stormNow === 'function' && stormNow()) ? 1 : 0); }   // the storm: every pull in the mud takes one more
function tryLoad(it) {
  if (G.dig.loadedSize + it.size <= vanCapNow()) { it.loaded = true; G.dig.loadedSize += it.size; return true; }
  it.loaded = false; return false;
}
function pullItem(it) {
  if (G.inspect) return;
  const cost = pullCost(it);
  if (G.daylight < cost) { play('denied'); toast('Not enough energy — that one costs ' + cost + ', you have ' + Math.max(0, Math.round(G.daylight)) + '.', PAL.red); return; }
  G.daylight -= cost;
  sunCheck();
  const idx = G.cur.items.indexOf(it);
  G.cur.items.splice(idx, 1);

  if (it.cash) {
    play('pull_cash', 0.7);                // paper slides before the register rings
    gain(it.val); play(it.val >= 300 ? 'coin_big' : 'coin');
    G.dayStats.cashFound += it.val;
    if (G.dig) G.dig.cash = (G.dig.cash || 0) + it.val;   // the door's line counts it
    addFloat('+' + fmt$(it.val), PAL.yellow, mouse.x, mouse.y - 12);
    return;
  }
  // the pull: what it is made of, then what it is worth
  pullSound(it);
  const t = tierOf(it.val);
  if (t.name === 'rare' || t.name === 'epic') { play('pull_' + t.name); play('crowd_ooh', t.name === 'epic' ? 0.9 : 0.55); }
  if (it.size >= 6) { play('pull_heavy', 0.6); shake(Math.min(4, it.size / 3), 0.25); }   // weight has a sound of its own
  const dp = itemDrawPos(lkFrameX(G.cur), 62, it);
  spawnDust(dp.x + dp.w / 2, dp.y + dp.h, 4 + Math.min(10, it.size));
  if (it.loot && it.locked) play('safe_clunk');
  trackAcquire(it);
  G.inspectAt = { x: mouse.x, y: mouse.y };   // the decision panel opens where the hand already is
  // where it came from, for the appraiser to mention what the door already said
  it.fromUnit = G.cur.num; it.fromDay = G.day; it.fromTown = G.world.town; it.fromArch = G.cur.archId; it.fromTell = G.cur.doorTell || null;
  { const ten = typeof tenantFor === 'function' ? tenantFor(G.cur) : null; it.fromTenant = ten ? ten.name : null; }   // who rings about it (phone.js)   // provenance: the card reads it back
  // a myth, or something wearing its face: the room goes quiet for a moment
  if (it.legendary || it.fake) { if (it.legendary) foundLegendary(it); startReveal(it); return; }
  // the first real find of a career gets the same moment, once. This is why you dig.
  if (!G.world.firstEpicDay && !it.loot && tierOf(it.val).name === 'epic') { G.world.firstEpicDay = G.day; startReveal(it, 'first'); return; }
  G.inspect = it;                       // hold it up — decide LOAD or LEAVE
}
// what a thing sounds like coming off the pile
// ---- the object sounds (user, 2026-09-18): "a box of games, or a console, can be a game sound; bags can
// sound like bags, and other objects that have distinct sounds." A thing with a sound of its own plays it;
// until that sound is recorded it plays exactly what it always did (its material, below), so nothing in
// the game changes until a file lands. Recording one is all it takes — no code.
const PULL_KINDS = {
  pull_bag: 'garbage',
  pull_game: 'cartsAtari cartsMaster cartsNes cartsSnes cartsGenesis cartsGameboy cartsGamegear cartsN64 discsPsx discsDream cartAtari cartMaster cartNes cartSnes cartGenesis cartGameboy cartGamegear cartN64 discPsx discDream gameCart console woodConsole greyConsole masterConsole snesConsole genesisConsole gameboyHandheld gamegearHandheld n64Console psxConsole dreamConsole arcade pinball homeComputer fruitComputer floppyBox',
  pull_paper: 'paper comic comicBox cards trashCards notBridgeCards diary deed fakeDeed poster moviePoster wrongPoster photo oddPhoto scorecard stampSheet fakeStampSheet mechanicsCalendar mattressMagazine goonMap fakeMap notTaxesBox',
  pull_tapes: 'vhs dvdStack blurayBox cassettes rareTape records vinylCrate edisonDiscs',
  pull_instrument: 'guitar guitarCase stageGuitar stageCase amp stageAmp stagePedal pedal keyboard tuba harmonica mic',
  pull_toy: 'teddy cabbageDoll magicKit',
  pull_barrel: 'barrel canCrate',
  pull_bike: 'bike',
  pull_keys: 'typewriter till sewing',
  pull_golf: 'golfClubs tourGolfBag ironSet ballCan',
  pull_watch: 'pocketWatch watch',
  pull_kitchen: 'silverware gravyBoat oddKitchen',
};
const PULL_KIND_OF = {};
for (const k in PULL_KINDS) for (const b of PULL_KINDS[k].split(' ')) PULL_KIND_OF[b] = k;
function pullSound(it) {
  const own = PULL_KIND_OF[it.base];
  if (own && _snd[own] && _snd[own].length) { play(own); return; }
  const b = it.base, c = it.cat;
  let m = 'pull_wood';
  if (c === 'junk' && b !== 'mattress' && b !== 'tire') m = 'pull_cardboard';
  if (['box', 'crate', 'garbage', 'canCrate', 'poster', 'comic', 'comicBox', 'photo', 'diary', 'cards', 'records', 'vhs', 'dvdStack', 'cassettes'].includes(b)) m = 'pull_cardboard';
  if (['mattress', 'rugRolled', 'couch', 'armchair', 'tablecloth', 'underwear', 'teddy', 'suitcase', 'goldJacket', 'fakeJacket'].includes(b)) m = 'pull_cloth';
  if (c === 'tools' || c === 'electronics' || ['safe', 'gunSafe', 'floorSafe', 'strongbox', 'lockbox', 'till', 'filing', 'ladder', 'bearTrap', 'guillotine', 'barrel', 'birdcage', 'rabbitCage', 'oddKey', 'goldBar', 'medal'].includes(b)) m = 'pull_metal';
  if (c === 'jewelry' || ['china', 'wine', 'urn', 'jarSpecimen', 'mirror', 'lamp', 'gem', 'jewelEgg', 'fakeEgg', 'moonRock', 'fakeRock'].includes(b)) m = 'pull_glass';
  play(m);
}

// ============ THE REVEAL ============
// A myth comes out of a box the way a myth should: the music drops, the dust
// settles, and for a few seconds there is nothing on screen but the thing.
// The fake gets exactly the same treatment. That is the point of the fake.
const REVEAL_LINES = [
  'Everyone in the county has a story about this.',
  'You have read about this. Everyone has.',
  'It was in a box. It was in a box the whole time.',
  'The paper said it was out there. The paper was right, or somebody wanted it to be.',
  'Somebody wrapped this in a towel and walked away from it. On purpose, or not.',
  'You have heard three versions of the story. None of them said it would be this small.',
  'The rent on this unit was fourteen months late. For this.',
];
// the first real find, before anyone has read about anything
const FIRST_FIND_LINES = [
  'Not a myth. Better: real, and yours.',
  'The door said nothing about this. Doors rarely do.',
  'Somebody packed this last, so it would be found first. It was not.',
  'Fourteen months of rent, and this is the thing that was worth keeping.',
  'This is why you dig.',
];
// kinds: 'myth' (a legend, or a fake wearing its face), 'first' (your first
// epic, in the opening), 'set' (the pieces come together at home; extra
// carries {pieces, modal, sub})
function startReveal(it, kind, extra) {
  G.reveal = Object.assign({ it, t: 0, stung: false, kind: kind || 'myth' }, extra || {});
  G.mode = 'reveal';
  _musicDuck = 0.12;
  play('reveal_hum');
  shake(4, 0.5);
  spawnDust(W / 2, H / 2 + 60, 24);
}
function endReveal() {
  const r = G.reveal;
  const it = r.it;
  G.reveal = null;
  _musicDuck = 1;
  if (r.kind === 'set') {                  // back to the garage, with the old modal waiting
    G.mode = 'sell';
    G.inspect = null;
    if (r.modal) G.modal = r.modal;
    return;
  }
  G.mode = 'dig';
  G.inspect = it;
}
function drawReveal(dt) {
  const r = G.reveal;
  const isSet = r.kind === 'set';
  if (isSet) { if (!drawBG()) px(g, 0, 0, W, H, '#151220'); drawHeader('HOME'); }
  else drawDig();                          // the unit stays behind the moment
  hotspots = [];
  r.t += dt;
  const it = r.it;
  const fade = Math.min(1, r.t / 0.8);
  px(g, 0, 0, W, H, 'rgba(6,6,12,' + (0.86 * fade).toFixed(2) + ')');
  // a soft light, and the thing in it
  const rise = Math.min(1, r.t / 1.2);
  const cy = H / 2 - 20 - (1 - rise) * 30;
  const spr = getSprite(it.spr, it.pal, it.cond, it.hseed || it.uid);
  const sc = Math.min(6, Math.floor(200 / spr.height), Math.floor(320 / spr.width));
  const dw = spr.width * sc, dh = spr.height * sc;
  g.globalAlpha = fade;
  const glow = g.createRadialGradient(W / 2, cy, 10, W / 2, cy, 220);
  glow.addColorStop(0, 'rgba(255,230,160,0.28)'); glow.addColorStop(1, 'rgba(255,230,160,0)');
  g.fillStyle = glow; g.fillRect(W / 2 - 240, cy - 240, 480, 480);
  g.drawImage(spr, Math.round(W / 2 - dw / 2), Math.round(cy - dh / 2), dw, dh);
  g.globalAlpha = 1;
  // a set: the pieces it was, arranged around what it is now, sliding in one by one
  if (isSet && r.pieces && r.pieces.length) {
    const n = r.pieces.length;
    for (let i = 0; i < n; i++) {
      const p = r.pieces[i];
      const pf = clamp((r.t - 0.3 - i * 0.12) / 0.6, 0, 1);
      if (pf <= 0) continue;
      const ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      const rad = 236 - pf * 36;
      const ps = getSprite(p.spr, p.pal, p.cond, p.hseed || p.uid);
      const psc = Math.max(1, Math.min(3, Math.floor(64 / ps.height), Math.floor(84 / ps.width)));
      const pw = ps.width * psc, ph = ps.height * psc;
      g.globalAlpha = fade * pf * 0.9;
      g.drawImage(ps, Math.round(W / 2 + Math.cos(ang) * rad - pw / 2), Math.round(cy + Math.sin(ang) * rad * 0.58 - ph / 2), pw, ph);
    }
    g.globalAlpha = 1;
  }
  drawDust(dt);
  const first = r.kind === 'first';
  if (r.t > 1.4) {
    if (!r.stung) {
      r.stung = true;
      play(isSet ? 'set_complete' : 'reveal_sting');
      if (r.kind === 'myth') play('heavenly', 0.8);   // legend and fake alike — the fake wears the whole face
    }
    const a = Math.min(1, (r.t - 1.4) / 0.6);
    g.globalAlpha = a;
    T(W / 2, cy + dh / 2 + 30, first ? dName(it) : it.name, PAL.gold, isSet ? 24 : 30, 'center', true);
    if (first) { const [lo, hi] = estRange(it); T(W / 2, cy + dh / 2 + 62, 'looks worth ' + fmt$(lo) + ' – ' + fmt$(hi), PAL.yellow, 17, 'center'); }
    if (isSet && r.sub) T(W / 2, cy + dh / 2 + 58, r.sub, PAL.yellow, 16, 'center');
    g.globalAlpha = 1;
  }
  if (r.t > 2.4) {
    const a = Math.min(1, (r.t - 2.4) / 0.6);
    g.globalAlpha = a;
    const pool = first ? FIRST_FIND_LINES : REVEAL_LINES;
    T(W / 2, cy + dh / 2 + (first ? 90 : (isSet ? 84 : 72)), isSet ? 'Matching grain. It counts.' : pool[(it.hseed || it.uid) % pool.length], PAL.gray, 16, 'center');
    g.globalAlpha = 1;
  }
  if (r.t > 3.2) {
    button(W / 2 - 110, H - 78, 220, 40, isSet ? 'PUT IT ON THE TABLE' : 'PICK IT UP', () => endReveal(), { col: PAL.dgreen, fs: 18 });
  }
}
function decideInspect(load) {
  const it = G.inspect;
  if (!it) return;
  G.inspect = null;
  G.dig.pile.push(it);
  if (load && it.leaveOnly) load = false;   // no
  if (load) {
    // vanCapNow, not G.vanCap: this is the decision panel every pull goes through, so a first day that
    // frees the dig but clamps here looks to the player exactly like no free day at all (playtest 2026-09-16)
    if (G.dig.loadedSize + it.size <= vanCapNow()) {
      it.loaded = true; G.dig.loadedSize += it.size;
      play('van_load');
    } else { it.loaded = false; play('denied'); clerkPop('Van is full — it stays on the ground', PAL.orange); }
  } else {
    it.loaded = false;
    play('van_unload');
  }
  // containers stay SEALED — you haul them home full and empty them there
}
// empty a container at home: cash converts, items join the stash (unappraised)
function emptyContainer(it, quiet) {
  if (!it.loot || it.locked) return [];
  if (!quiet) play('container_open');
  bump('boxes');
  const lines = [];
  const deal = dealLoot(it);                    // every still-shut drawer, door and lid
  const comps = it.comp;
  for (let i = 0; i < comps.length; i++) {
    if (comps[i].done) continue;
    const found = searchComp(it, i, deal[i]);
    for (const f of found) if (f.c !== PAL.dgray) lines.push({ text: comps[i].label + ':  ' + f.t, col: f.c });
  }
  it.loot = null;
  it.opened = true;
  if (!lines.length) lines.push({ text: '...empty. Figures.', col: PAL.dgray });
  return lines;
}
// UNPACK EVERYTHING (2026-09-12): every unlocked box in the haul, emptied in one go —
// the unpacking is mechanical, so the game can do it; the examining (the rummage, the
// false bottom, the writing, the tapes) stays in LOOK CLOSER, which is the part with
// decisions in it. What comes out joins the haul unappraised; the boxes stay as boxes,
// priced on the spot; a media pile inside a box comes out as a pile, still shut,
// because flipping through it is LOOK CLOSER's (keepers and all — the collector
// achievements read that path, and this one never touches a pile). Locked things stay
// locked. `auto`: the hired hand did it the night the van came in.
let _unpacking = false;                 // haulFanfare stays quiet until the one fanfare at the end
function unpackTargets() { return G.stash.filter((t) => t.loot && !t.locked && !MEDIA_KINDS[t.base]); }
function unpackAll(auto) {
  const targets = unpackTargets();
  if (!targets.length) { if (!auto) toast('Nothing sealed in the haul.', PAL.gray); return false; }
  const before = G.stash.length, cashBefore = G.money;
  _unpacking = true;
  try { for (const t of targets) emptyContainer(t, true); } finally { _unpacking = false; }
  const items = G.stash.slice(before);
  const cash = G.money - cashBefore;
  play('unpack_all');
  haulFanfare(items.concat(cash > 0 ? [{ cash: true, val: cash }] : []));
  const piles = items.filter((l) => MEDIA_KINDS[l.base]);
  const lines = [{ text: targets.length + (targets.length === 1 ? ' box' : ' boxes') + ' emptied  ·  ' + items.length + (items.length === 1 ? ' thing' : ' things') + ' into the haul' + (cash > 0 ? '  ·  ' + fmt$(cash) + ' in cash' : ''), col: PAL.white }];
  const notable = items.filter((l) => !MEDIA_KINDS[l.base]).sort((a, b) => b.val - a.val).slice(0, 8);
  for (const l of notable) { const [lo, hi] = estRange(l); lines.push({ text: dName(l) + '  (' + fmt$(lo) + '–' + fmt$(hi) + ')', col: l.legendary || l.fakeEst ? PAL.gold : tierOf(l.val).col }); }
  const rest = items.length - piles.length - notable.length;
  if (rest > 0) lines.push({ text: '...and ' + rest + ' more.', col: PAL.dgray });
  if (piles.length) lines.push({ text: piles.length + (piles.length === 1 ? ' media pile set out' : ' media piles set out') + ' — flip through ' + (piles.length === 1 ? 'it' : 'them') + ' in LOOK CLOSER.', col: PAL.cyan });
  const marks = G.stash.filter(worthALook).length;
  if (marks) lines.push({ text: marks + (marks === 1 ? ' thing is' : ' things are') + ' marked worth a closer look.', col: PAL.cyan });
  if (!items.length && cash <= 0) lines.push({ text: '...all of it empty. Figures.', col: PAL.dgray });
  G.modal = { title: auto ? 'The hired hand unpacked the van:' : 'You unpack everything:', lines, money: true };
  G.sellSel = -1;
  return true;
}
function foundLegendary(it) {
  if (!G.foundLegends.includes(it.base)) { G.foundLegends.push(it.base); bump('myths'); }
  recordEvent('legend', { base: it.base, name: it.name, unit: G.cur ? G.cur.num : 0 });
  toast('!!! LEGENDARY FIND: ' + it.name + ' !!!', PAL.gold, 4);
}
// what is still sealed and un-pulled, if you drove off right now — the same
// items driveHome() itself would count as left behind in the dark. Never the
// true value: half of them are unsearched, and this is not where that leaks.
function pendingLeftBehind() {
  let count = 0;
  for (const it of G.cur.items) {
    count++;
    if (it.loot) count += it.loot.length;
  }
  return count;
}
// is there anything still reachable AND affordable? Daylight is a whole-day
// pool (startDay, peeks, odd jobs and every pull all draw from the same 100),
// and it is entirely normal to run it out partway through a locker — that is
// not a choice to reconsider, GO BACK could not buy anything more either way.
function canStillPullMore() {
  return G.cur.items.some((it) => isAccessible(it, G.cur.items) && pullCost(it) <= G.daylight);
}
// LOAD UP & LEAVE: the review, every time there is anything to review. A full van
// or an empty clock used to be treated as "no real choice" and skipped the warning
// entirely, which is exactly when it is easiest to drive off never having noticed
// a locked safe two feet from where you were digging. So: everything staying on the
// left — still sealed in the unit, or on the floor for the scrap man, junk or not —
// the van on the right, and a click on anything moves it. Floor to van, van to
// floor; a sealed thing gets pulled, for the sun it always cost, and the decision
// panel opens like any pull. Still no values on the sealed side: half of them are
// unsearched, and this is not where that leaks.
function leaveCheckStaying() {
  const items = G.cur.items;
  const sealed = items.slice().sort((a, b) => (isAccessible(b, items) ? 1 : 0) - (isAccessible(a, items) ? 1 : 0));
  return sealed.map((it) => ({ it, sealed: true }))
    .concat(G.dig.pile.filter((it) => !it.loaded && !it.leaveOnly).map((it) => ({ it, sealed: false })));
}
function tryDriveHome() {
  if (!leaveCheckStaying().length) { driveHome(); return; }
  const m = { title: 'Leaving something behind?', lines: [], scrollL: 0, scrollR: 0 };
  m.onWheel = (dir) => { if (mouse.x < W / 2) m.scrollL += dir * 6; else m.scrollR += dir * 6; };   // the column under the mouse
  m.draw = () => drawLeaveCheck(m);
  G.modal = m;
}
function drawLeaveCheck(m) {
  const left = leaveCheckStaying();
  const van = G.dig.pile.filter((it) => it.loaded);
  const mx = 30, my = 30, mw = 900, mh = 496;
  px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.yellow);
  panel(mx, my, mw, mh, '#242737');
  T(mx + mw / 2, my + 8, m.title, PAL.yellow, 24, 'center', true);
  const sealedN = pendingLeftBehind();
  const floor = left.filter((e) => !e.sealed);
  let scrap = 0; for (const e of floor) scrap += e.it.size * 2;
  const bits = [];
  const peteTake = peteClearValue(G.cur.items);
  if (sealedN) bits.push(sealedN + (sealedN === 1 ? ' thing' : ' things') + ' still sealed in the unit'
    + (peteTake ? ' — Pete pays ' + fmt$(peteTake) + ' for the lot' : ', never pulled'));
  // the scrap man's number is only yours to see once you can actually sell him the lot (peteDeal).
  // Until then what you leave behind is HIS, for nothing, and the panel does not tempt you with a figure.
  if (floor.length) bits.push(floor.length + ' on the floor' + (peteClearsUp() ? ' for the scrap man (' + fmt$(scrap) + ')' : ' for the hauler'));
  T(mx + mw / 2, my + 40, bits.join('   ·   '), PAL.orange, 15, 'center');
  // what it costs to walk away from this, moving as things cross the divide. A bill you watched yourself
  // run up is a decision; one that arrives after the door comes down is a punishment (IDEAS_TODO 3).
  const fee = dumpFeeNow();

  const cw = 66, ch = 62, cols = 6, rows = 5, per = cols * rows;
  const lx = mx + 18, rx = mx + mw - 18 - cols * cw, gy = my + 94;
  px(g, W / 2 - 1, my + 62, 2, rows * (ch + 4) + 6, PAL.slate);
  T(lx, my + 62, 'STAYING HERE', PAL.white, 17, 'left', true);
  if (fee > 0) {
    const off = dumpWaived();
    const fl = fitLines(off ? 'haul-off ' + fmt$(fee) + ' — on the yard today' : 'HAUL-OFF  −' + fmt$(fee), W / 2 - 24 - (lx + 132), [off ? 13 : 17, 13, 12], 1, !off);
    T(W / 2 - 12, my + (off ? 66 : 62), fl.lines[0], off ? PAL.cyan : PAL.red, fl.fs, 'right', !off);
  }
  T(lx, my + 80, 'tab = sealed, click to pull (costs energy)  ·  no tab = floor, click to load', PAL.dgray, 11);
  const bay = bayOn();
  const full = !bay && G.dig.loadedSize >= G.vanCap;
  T(rx, my + 62, 'IN THE VAN', PAL.white, 17, 'left', true);
  // the first day's note goes on the line below the header, which has room for it (2026-09-17)
  if (bay) T(rx, my + 80, G.dig.loadedSize + ' loaded  ·  no limit today, your first day  ·  click to unload', PAL.cyan, 11, 'left');
  else {
    T(rx + 118, my + 64, G.dig.loadedSize + ' / ' + G.vanCap, full ? PAL.red : PAL.gray, 16, 'left', true);
    bar(rx + 200, my + 65, cols * cw - 204, 14, G.dig.loadedSize / G.vanCap, full ? PAL.red : PAL.green);
    T(rx, my + 80, 'click to unload it', PAL.dgray, 11);
  }

  let tip = null;
  const grid = (list, x0, key, isLeft) => {
    const max = Math.max(0, Math.ceil(list.length / cols) - rows) * cols;
    m[key] = clamp(m[key], 0, max);
    const start = m[key];
    for (let i = 0; i < per; i++) {
      const idx = start + i;
      if (idx >= list.length) break;
      const e = list[idx], it = isLeft ? e.it : e, sealed = isLeft && e.sealed;
      const cx = x0 + (i % cols) * cw, cy = gy + Math.floor(i / cols) * (ch + 4);
      const hov = inRect(mouse.x, mouse.y, cx, cy, cw - 4, ch);
      const blocked = sealed && !isAccessible(it, G.cur.items);
      drawPileCell(it, cx, cy, cw, ch, hov, blocked ? 'blocked' : sealed);
      const name = sealed ? BASE_BY_ID[it.base].name : dName(it);
      const cost = sealed ? pullCost(it) : 0;
      if (hov) {
        let t;
        if (blocked) t = name + ' — blocked, pull what is in front of it first';
        else if (sealed) t = cost <= G.daylight ? 'PULL: ' + name + ' (' + cost + ' energy) — then decide, like any pull' : name + ' — ' + cost + ' energy to pull, you have ' + Math.max(0, Math.round(G.daylight));
        else {
          const [lo, hi] = estRange(it);
          t = name + '  (' + (it.searched ? fmt$(shownVal(it)) : 'est ' + fmt$(lo) + '–' + fmt$(hi)) + ')'
            + (it.loaded ? (it.carried ? '  — from an earlier door; click to drop it for scrap' : '  — click to unload') : '  — click to load');
        }
        tip = { cx: cx + (cw - 4) / 2, top: cy, t, c: sealed ? (blocked ? PAL.dgray : PAL.yellow) : PAL.white };
      }
      hot(cx, cy, cw - 4, ch, () => {
        if (blocked) { play('denied'); toast('Pull what is in front of it first.', PAL.red); }
        else if (sealed) {
          if (cost > G.daylight) { play('denied'); toast('Not enough energy — that one costs ' + cost + ', you have ' + Math.max(0, Math.round(G.daylight)) + '.', PAL.red); }
          else { G.modal = null; pullItem(it); }                  // back to the room, the decision panel open
        }
        else if (it.loaded) { it.loaded = false; G.dig.loadedSize -= it.size; play('van_unload'); }
        else if (G.dig.loadedSize + it.size <= vanCapNow()) { it.loaded = true; G.dig.loadedSize += it.size; play('van_load'); }
        else { play('denied'); clerkPop('No room — unload something first', PAL.red); }
      });
    }
    if (list.length > per) T(x0 + cols * cw - 4, gy + rows * (ch + 4) - 2, (start + per < list.length ? '+' + (list.length - start - per) + ' more  ·  ' : '') + 'wheel to scroll', PAL.dgray, 11, 'right');
    if (!list.length) T(x0 + cols * cw / 2, gy + 40, isLeft ? 'nothing — the room is clear' : 'the van is empty', PAL.dgray, 15, 'center');
  };
  grid(left, lx, 'scrollL', true);
  grid(van, rx, 'scrollR', false);

  T(mx + mw / 2, my + mh - 66, 'Once that door comes down, whatever is still in there stays in there.', PAL.gray, 15, 'center');
  button(mx + mw / 2 - 236, my + mh - 46, 220, 34, 'GO BACK', () => { G.modal = null; }, { col: PAL.slate, fs: 16 });
  button(mx + mw / 2 + 16, my + mh - 46, 220, 34, 'LEAVE IT', () => { G.modal = null; driveHome(); }, { col: PAL.red, fs: 16 });
  if (tip) drawTooltip(tip.cx, tip.top, tip.t, tip.c);
}
// what a door's take is worth to the door's line: a thing that rests on a claim counts at its claim,
// and remembers the number it was counted at (doorWorth) so the line can be corrected when it settles
function doorWorthOf(items) {
  let v = 0;
  const count = (it) => { const c = claimOn(it) ? claimedValue(it) : it.val; it.doorWorth = c; v += c; };
  for (const it of items) { count(it); if (it.loot) for (const l of it.loot) count(l); }
  return v;
}
function driveHome() {
  if (G.inspect) return;
  // Kettle Basin: a van packed to the roof bruises one good piece on the road
  let crushed = null;
  const crushRate = townRule('crushRate');
  if (crushRate > 0 && G.dig.loadedSize >= vanCapNow() * 0.85) {
    const R = dayR('crush', G.cur.num);
    if (R.chance(crushRate)) {
      const fragile = G.dig.pile.filter((it) => it.loaded && !it.cash && !it.loot && (it.cond === 'Mint' || it.cond === 'Clean'));
      if (fragile.length) {
        crushed = R.pick(fragile);
        const from = crushed.cond, to = from === 'Mint' ? 'Clean' : 'Worn';
        const mults = { Worn: 0.85, Clean: 1.0, Mint: 1.55 };
        crushed.cond = to;
        crushed.val = Math.max(1, Math.round(crushed.val * mults[to] / mults[from]));
        if (crushed.name && crushed.name.indexOf(from) === 0) crushed.name = to + crushed.name.slice(from.length);
        if (crushed.preName && crushed.preName.indexOf(from) === 0) crushed.preName = to + crushed.preName.slice(from.length);
        recordEvent('crushed', { unit: G.cur.num, name: crushed.name, base: crushed.base, from, to });
      }
    }
  }
  if (G.cur.partner) partnerTakesHalf(G.cur);     // their half leaves with them before anything is loaded or scrapped
  let scrapTotal = 0, setLost = 0;
  const packed = G.dig.pile.filter((it) => it.loaded && !it.carried);   // this door's take
  // decided BEFORE the loop below flips `loaded` off: everything after it that asks
  // "what stayed?" reads these, never the flag. Reading the flag afterwards made every
  // pulled item look left behind, and the gossip named your best find as the one
  // the hauler got — the Hendrix guitar you drove home with, "left in the dark".
  const loadedNow = G.dig.pile.filter((it) => it.loaded);
  const stayed = G.dig.pile.filter((it) => !it.loaded && !it.leaveOnly);
  for (const it of G.dig.pile) {
    if (it.loaded) { it.loaded = false; delete it.carried; G.van.push(it); }   // it rides along; the haul happens at home
    else if (it.leaveOnly) continue;                        // the raccoon is not scrap. The raccoon is a tenant.
    else {
      scrapTotal += it.size * 2;
      G.dayStats.scrappedCount++;
      G.dayStats.scrapValue += it.val;
      if (it.set) setLost++;
      if (it.loot) for (const l of it.loot) { G.dayStats.scrapValue += l.val; if (l.set) setLost++; }   // crushed with contents...
    }
  }
  // the standing offer: he pays by the pound for whatever is still behind the door (G.cur.items is
  // still everything that stayed — the count below reads the same list)
  const peteTotal = peteClearValue(G.cur.items);
  // without the standing offer none of it is yours: Pete clears the unit and keeps what he clears
  if (!peteClearsUp()) scrapTotal = 0;
  if (scrapTotal > 0) gain(scrapTotal);
  if (peteTotal > 0) { gain(peteTotal); G.dayStats.soldCount++; G.dayStats.soldTotal += peteTotal; }
  // said at the very end, with the haul-off, so whichever way the leftovers went the line with the number on
  // it is the one left on screen. It used to be said here and then quietly overwritten by the flavour below.
  let leftoversLine = null;
  if (scrapTotal + peteTotal > 0) {
    play('scrap');
    leftoversLine = peteTotal > 0
      ? 'Pete backs the truck in: +' + fmt$(scrapTotal + peteTotal) + ' for the lot. He does not ask what any of it was.'
      : 'Leftovers scrapped for ' + fmt$(scrapTotal);
  }
  // the haul-off bill: what you left is a job somebody now has to do, and until Pete's standing offer it
  // is billed to you. These are the same two lists drawLeaveCheck priced, so the panel never lied to you.
  const dumpBill = dumpFeeOn() ? dumpFeeFor(stayed, G.cur.items) : 0;
  let dumpOwing = 0;
  if (dumpBill > 0 && !dumpWaived()) {
    const paid = Math.min(G.money, dumpBill);
    if (paid > 0) spend(paid);
    dumpOwing = dumpBill - paid;
    if (dumpOwing > 0) dumpOwe(dumpOwing);
    bump('dumpFees', dumpBill);
    G.dayStats.dumpFee += dumpBill;
    play('coin');
  }
  play('door_slam'); shake(3, 0.3);        // the door comes down on whatever is left
  let lbCount = 0, lbVal = 0;
  for (const it of G.cur.items) {
    lbCount++; lbVal += it.val;
    if (it.set) setLost++;
    if (it.loot) for (const l of it.loot) { lbCount++; lbVal += l.val; if (l.set) setLost++; }
  }
  G.dayStats.leftBehindCount += lbCount;
  G.dayStats.leftBehindValue += lbVal;
  G.dayStats.setLost += setLost;
  // the best thing still on the floor when the van pulled out (a dropped
  // carried item was left, but not left IN this unit — the gossip skips it)
  let left = null;
  const consider = (it) => { if (!it.cash && (!left || it.val > left.val)) left = it; };
  for (const it of stayed) if (!it.carried) { consider(it); if (it.loot) for (const l of it.loot) consider(l); }
  for (const it of G.cur.items) { consider(it); if (it.loot) for (const l of it.loot) consider(l); }
  if (left && (left.val >= 100 || left.set || left.legendary)) {
    recordEvent('left', { unit: G.cur.num, name: left.name, base: left.base, val: left.val, set: !!left.set, legendary: !!left.legendary, safe: !!(left.loot && left.locked) });
  }
  if (G.dig.loadedSize === vanCapNow()) recordEvent('perfectVan', { unit: G.cur.num, cap: G.vanCap });
  // paid for the front row and a feeling: what came home was worth far less than the number
  let hauled = 0;
  for (const it of packed) { hauled += it.val; if (it.loot) for (const l of it.loot) hauled += l.val; }
  const over = G.cur.paid >= 200 && G.cur.paid > 1.6 * (hauled + scrapTotal);
  if (over) recordEvent('overpaid', { unit: G.cur.num, paid: G.cur.paid, amt: G.cur.paid, val: hauled });
  // the books: what this door was worth to you, and what you walked away from
  bookDoor(hauled + scrapTotal - (G.cur.paid || 0), G.cur.num, (ARCHETYPES[G.cur.archId] || {}).label || 'a unit');
  // the door's line: paid, and what came home worth as far as anybody can tell yet (claims at their claim)
  recordDoor({ unit: G.cur.num, paid: G.cur.paid || 0, worth: doorWorthOf(packed) + scrapTotal + (G.dig.cash || 0) });
  checkRules(G.cur);                                // the door is open now: were the faces right about it?
  bump('abandoned', lbCount); bump('abandonedValue', lbVal);
  if (crushed) bump('crushed');
  if (G.cur.blind && over) bump('blindRegret');
  // something the paper will decline to describe came home
  const blurred = loadedNow.find((it) => it.censored || (it.loot && it.loot.some((l) => l.censored)));   // (the flag is off by now — the list, not the flag)
  if (blurred) { recordEvent('unmentionable', { unit: G.cur.num, name: blurred.censored ? blurred.name : 'a box' }); bump('unmentionables'); }
  // the raccoon you left where he was: the vest turns up in the van anyway
  const raccoonLeft = G.dig.pile.some((it) => it.leaveOnly && !it.loaded) || G.cur.items.some((it) => it.leaveOnly);
  if (raccoonLeft) {
    const vest = makeItem('tinyVest', dayR('vest', G.cur.num));
    vest.searched = true;
    G.van.push(vest);                          // on the passenger seat, riding home with the rest
    recordEvent('rareRaccoon', { unit: G.cur.num });
  }
  scrapGuyNotices(stayed);
  const wasFull = G.dig.loadedSize >= vanCapNow();
  G.cur.sold = true;
  G.dig = null;
  G.mode = 'yard';
  saveMid('yard');                             // the trip home is a checkpoint
  if (raccoonLeft) toast('There is a tiny vest on the passenger seat. You did not put it there.', PAL.cyan, 4);
  else if (crushed) toast('The van rode heavy. The ' + BASE_BY_ID[crushed.base].name.toLowerCase() + ' came home ' + crushed.cond + '.', PAL.orange, 3.6);
  else if (setLost > 0) toast('Matching wood left in the dark...', PAL.red, 3.2);
  else if (wasFull) clerkPop('The van is packed to the roof. Make room at the next door, or go home and unload.', PAL.orange, 3.6);
  else if (lbCount > 0) {
    // honest either way, but not the same tone: leaving reachable stuff on
    // the table reads as a choice; running out of daylight was never one
    const chose = canStillPullMore();
    toast(chose ? lbCount + ' items left behind in the dark...' : 'Ran out of energy — ' + lbCount + (lbCount === 1 ? ' thing' : ' things') + ' stayed sealed.', chose ? PAL.dgray : PAL.orange, 3);
  }
  // the bill goes last on purpose: toast() keeps one line, and of everything that just happened this is the
  // one with a number on it. The flavour above it is still in the day's summary either way.
  if (leftoversLine) toast(leftoversLine, PAL.green, 4);
  if (dumpBill > 0) {
    if (dumpWaived()) toast('Clearing what you left: ' + fmt$(dumpBill) + '. "First one\'s on the yard," says the clerk. "Enjoy it."', PAL.cyan, 4.5);
    else if (dumpOwing > 0) clerkPop('The haul-off is ' + fmt$(dumpBill) + ' and you had ' + (dumpBill === dumpOwing ? 'nothing' : fmt$(dumpBill - dumpOwing)) + '. The office put ' + fmt$(dumpOwing) + ' on your tab.', PAL.red, 5);
    else toast('The yard clears what you left behind: −' + fmt$(dumpBill) + '.', PAL.orange, 4);
  }
}
// the scrap hauler clears out what you leave. Once in a while he finds
// something he shouldn't have, and the office hears about it. Rare on
// purpose: one tale per town, only for a real find, and not every time.
// `stayed`: the pile items that did not get in the van — passed in, because by the
// time this runs driveHome has already cleared every `loaded` flag
function scrapGuyNotices(stayed) {
  const W0 = G.world;
  W0.scrapTold = W0.scrapTold || [];
  if (W0.scrapTale || W0.scrapTold.includes(W0.town)) return;
  let best = null;
  const look = (it) => { if (!it.cash && (!best || it.val > best.val)) best = it; };
  for (const it of (stayed || [])) { look(it); if (it.loot) for (const l of it.loot) look(l); }
  for (const it of G.cur.items) { look(it); if (it.loot) for (const l of it.loot) look(l); }
  if (!best) return;
  const big = best.legendary || best.set || best.val >= 300;
  if (!big || !dayR('scraptale', G.cur.num).chance(0.6)) return;
  W0.scrapTale = { town: W0.town, unit: G.cur.num, name: best.name, val: best.val, day: G.day, seenDay: null };
  W0.scrapTold.push(W0.town);
  recordEvent('scrapTale', { unit: G.cur.num, name: best.name, val: best.val });
}
function scrapTaleLine() {
  const t = G.world.scrapTale;
  if (!t || t.town !== G.world.town || G.day <= t.day) return null;
  if (!t.seenDay) {
    t.seenDay = G.day;
    toast('The office has a story about unit ' + t.unit + '...', PAL.orange, 3.5);
    G.world.scrapGossip = { town: t.town, day: G.day, left: 2 };   // Ed heard too. Ed hears everything.
  }
  if (t.seenDay !== G.day) { G.world.scrapTale = null; return null; }
  const v = [
    'The scrap hauler cleared unit {u} after you left. He pulled out a {n}. The office is still talking about it.',
    'Word from the office: the scrap guy found a {n} in unit {u} the day you walked. He bought lunch for everyone.',
    'Unit {u}, after you left: the hauler nearly crushed a {n}. Then he looked at it. The office knows your name now.',
  ][strHash(t.name + t.unit) % 3];
  return v.replace('{u}', t.unit).replace('{n}', t.name);
}
function drawInspectPanel() {
  const it = G.inspect;
  const w = 320;
  // first pass: work out how much this particular thing actually has to say —
  // a legendary find with a sense line and an odd lock says a lot more than a
  // plain dresser — so the panel (and the buttons under it) can grow to fit it
  // instead of the buttons sitting at a fixed height and getting walked on.
  const spr = getSprite(it.spr, it.pal, it.cond, it.uid);
  const sc = Math.max(2, Math.min(4, Math.floor((w - 60) / spr.width), Math.floor(150 / spr.height)));
  const dw = spr.width * sc, dh = spr.height * sc;
  const nameFit = fitLines(dName(it), w - 16, [19, 17, 16, 15], 2, true), nameLines = nameFit.lines;   // by measure: 24 characters dropped a word from 3 names
  const [lo, hi] = estRange(it);
  const extra = [];                                // optional lines under the basics, top to bottom
  if (it.legendary) extra.push({ t: '!!! ONE OF A KIND !!!', c: PAL.gold, fs: 17, b: true });
  else if (it.loot && it.locked) extra.push({ t: 'LOCKED — locksmith wants ' + fmt$(it.crackCost || 60), c: PAL.cyan, fs: 15 });
  else if (it.loot) extra.push({ t: 'something shifts around inside...', c: PAL.cyan, fs: 15 });
  if (it.cond === 'Mint' && townRule('crushRate') > 0 && !it.loot) extra.push({ t: 'mint rides badly in a packed van', c: PAL.orange, fs: 14 });
  const sense = sensoryLine(it);                   // what your hands notice that your eyes did not
  if (sense) extra.push({ t: sense, c: PAL.lblue, fs: 14 });
  if (racWantsIt(it)) extra.push({ t: racWantLine(it), c: PAL.lblue, fs: 14 });   // the raccoon's whole intel, and it never says so
  if (it.keyId && it.locked) extra.push({ t: 'an odd lock. not a padlock.', c: PAL.gold, fs: 14 });
  const contentBottom = 36 + dh + 14 + nameLines.length * 22 + 24 + 20 + extra.length * 18;
  const h = Math.max(336, contentBottom + 66);     // 336 covers the ordinary case exactly as before

  // beside the click that pulled it, so the eye and the mouse stay put
  const at = G.inspectAt || { x: W - w - 24, y: H / 2 };
  let x = at.x + 18;
  if (x + w > W - 8) x = at.x - w - 18;
  x = clamp(Math.round(x), 8, W - w - 8);
  const y = clamp(Math.round(at.y - h / 2), 46, H - h - 8);
  // Nothing behind the card takes a click. A modal clears the hotspots when it opens; this panel does not,
  // so a miss on LOAD IT or LEAVE IT landed on the pile underneath and quietly loaded or unloaded something
  // else (user, 2026-09-21: "if you miss the leave or load it button, you click under it and deselect stuff
  // accidentally"). The decision stays until it is made.
  hot(0, 0, W, H, () => {}, { focusable: false, label: 'the card is waiting' });
  px(g, x - 3, y - 3, w + 6, h + 6, PAL.yellow);
  panel(x, y, w, h, '#242737');
  T(x + w / 2, y + 8, 'YOU PULLED OUT:', PAL.gray, 15, 'center');

  px(g, x + (w - dw) / 2 - 6, y + 26, dw + 12, dh + 12, '#1a1c28');
  g.drawImage(spr, x + (w - dw) / 2, y + 32, dw, dh);
  // the raccoon, and the vest he leaves behind him: click him and he says something (docs/RACCOON.md).
  // Nothing tells you to. The cursor turning into a hand over a live animal is the whole invitation.
  if (it.leaveOnly || it.base === 'tinyVest') {
    hot(x + (w - dw) / 2 - 6, y + 26, dw + 12, dh + 12, () => {
      racSay(it.base === 'tinyVest' ? 'rac_stash' : (it.racSaid ? 'rac_again' : 'rac_unit'));
      it.racSaid = true;
    }, { label: 'the raccoon', focusable: false });
  }

  let yy = y + 36 + dh + 14;
  for (const line of nameLines) { T(x + w / 2, yy, line, PAL.white, nameFit.fs, 'center', true); yy += 22; }
  T(x + w / 2, yy + 2, 'looks worth ' + fmt$(lo) + ' – ' + fmt$(hi), PAL.yellow, 17, 'center'); yy += 24;
  T(x + w / 2, yy, CATS[it.cat].label + '   |   bulk ' + it.size + '   |   ' + (it.cond || '?'), PAL.gray, 15, 'center'); yy += 20;
  for (const e of extra) { T(x + w / 2, yy, e.t, e.c, e.fs, 'center', !!e.b); yy += 18; }

  if (it.edNotebook) {                    // Eagle Ed's notebook: the one thing you can hand back across the yard
    T(x + w / 2, y + h - 70, 'Every page is a unit number and a price.', PAL.cyan, 13, 'center');
    button(x + 14, y + h - 52, 140, 40, 'GIVE IT BACK', () => edNotebookChoice(it, 'returned'), { col: PAL.dgreen, fs: 16 });
    button(x + w - 154, y + h - 52, 140, 40, 'KEEP IT', () => edNotebookChoice(it, 'kept'), { col: PAL.red, fs: 16 });
    return;
  }
  if (it.theirs && rivalUnitCanGive()) {   // the one thing in their unit that is worth nothing and still hurts
    const dg = rivalDef(it.theirs);
    T(x + w / 2, y + h - 70, (dg ? shortRivalName(dg) : 'They') + ' is at the rope. It is worth ' + fmt$(it.val) + ' to anybody else.', PAL.cyan, 13, 'center');
    button(x + 14, y + h - 52, 140, 40, 'GIVE IT BACK', () => rivalUnitGive(it), { col: PAL.dgreen, fs: 16 });
    button(x + w - 154, y + h - 52, 140, 40, 'KEEP IT', () => decideInspect(true), { col: PAL.red, fs: 16 });
    return;
  }
  if (it.tenantTrophy && tenantCanSellBack()) {   // Merle's trophy, on Merle's day: he is at the van with twenty dollars
    T(x + w / 2, y + h - 70, TENANT.short + ' is at the van with ' + fmt$(TENANT_PAYS) + '. He can have one.', PAL.cyan, 13, 'center');
    button(x + 10, y + h - 52, 118, 40, 'SELL IT BACK ' + fmt$(TENANT_PAYS), () => tenantSellBack(it), { col: PAL.purple, fs: 14 });
    const fitsT = G.dig.loadedSize + it.size <= vanCapNow();
    button(x + 134, y + h - 52, 88, 40, 'LOAD IT', () => decideInspect(true), { disabled: !fitsT, col: PAL.dgreen, fs: 16 });
    button(x + 228, y + h - 52, 84, 40, 'LEAVE IT', () => decideInspect(false), { col: PAL.red, fs: 16 });
    return;
  }
  if (it.leaveOnly) {                     // the raccoon. There is one button. He knows which.
    T(x + w / 2, y + h - 66, 'It is looking at you. It is not getting in the van.', PAL.cyan, 13, 'center');
    button(x + w / 2 - 80, y + h - 52, 160, 40, 'LEAVE IT', () => { racSay('rac_leave'); decideInspect(false); }, { col: PAL.red, fs: 19 });
    return;
  }
  const fits = G.dig.loadedSize + it.size <= vanCapNow();
  button(x + 14, y + h - 52, 140, 40, 'LOAD IT', () => decideInspect(true), { disabled: !fits, col: PAL.dgreen, fs: 19 });
  button(x + w - 154, y + h - 52, 140, 40, 'LEAVE IT', () => decideInspect(false), { col: PAL.red, fs: 19 });
  if (!fits) T(x + w / 2, y + h - 66, 'van is full!', PAL.red, 14, 'center');
}
// one tile of the pile: the dig screen's bottom rows and the leave check share it.
// `sealed`: still in the unit, never pulled — the tile shows what a pull would cost
// instead of the size and the load light, because there is nothing to load yet.
function drawPileCell(it, cx, cy, cw, ch, hovRow, sealed) {
  px(g, cx, cy, cw - 4, ch, PAL.ink);
  px(g, cx + 2, cy + 2, cw - 8, ch - 4, hovRow ? '#2c3046' : (sealed ? '#2b2620' : (it.loaded ? '#1e2c26' : '#26202a')));
  if (it.carried) px(g, cx + 2, cy + 2, cw - 8, 3, PAL.cyan);   // riding along from an earlier door
  else if (sealed) px(g, cx + 2, cy + 2, cw - 8, 3, PAL.orange); // still in the unit
  drawIcon(it, cx + 8, cy + 4, 46);
  if (sealed === 'blocked') { px(g, cx + 2, cy + 2, cw - 8, ch - 4, 'rgba(8,8,14,0.55)'); T(cx + (cw - 4) / 2, cy + ch - 17, 'blocked', PAL.dgray, 11, 'center'); }
  else if (sealed) {
    const lbl = pullCost(it) + ' energy';
    g.font = textSize(13) + 'px ' + FONT;
    T(cx + 6, cy + ch - 17, lbl, PAL.orange, g.measureText(lbl).width > cw - 14 ? 11 : 13);
  } else T(cx + 6, cy + ch - 17, 's' + it.size, PAL.gray, 13);
  if (!sealed) {
    px(g, cx + cw - 20, cy + 5, 13, 13, PAL.ink);
    px(g, cx + cw - 18, cy + 7, 9, 9, it.loaded ? PAL.green : PAL.slate);
  }
  if (it.loot) { px(g, cx + 4, cy + 5, 12, 10, PAL.ink); px(g, cx + 6, cy + 7, 8, 6, it.locked ? PAL.cyan : PAL.orange); }
}
function drawDig() {
  if (!drawBG()) px(g, 0, 0, W, H, '#14161f');
  drawHeader('DIG — UNIT ' + G.cur.num);
  const fw = lkFrameW(G.cur);
  const lx = lkFrameX(G.cur), ly = 62;
  drawLockerFrame(lx, ly, 1, fw);
  drawDoorwayGloom(lx, ly, fw);
  const hov = drawLockerItems(lx, ly, G.cur.items, { interactive: !G.inspect });
  if (G.mode === 'dig') drawDust(1 / 60);
  let digTip = null;
  if (hov) {
    const p = itemDrawPos(lx, ly, hov);
    digTip = {
      cx: p.x + p.w / 2, top: p.y, c: PAL.yellow,
      t: 'PULL: ' + BASE_BY_ID[hov.base].name + (hov.tag ? ' (marked "' + hov.tag + '")' : '')
        + '  (' + pullCost(hov) + ' energy)'
        + (hov.locked ? ' — locked, haul it home' : (hov.container ? ' — has storage' : ''))
        + (hov.size >= 8 ? ' — heavy' : ''),
    };
    if (!G.inspect) hot(p.x, p.y, p.w, p.h, () => pullItem(hov));
  }

  panel(24, 400, 300, 128, '#20222e');
  T(38, 408, 'VAN', bayOn() ? PAL.cyan : PAL.white, 22, 'left', true);
  if (bayOn()) {
    T(90, 410, G.dig.loadedSize + ' loaded', PAL.cyan, 19);
    // what it means, in as many words (user, 2026-09-16: "where is it? what goes in it?"; 2026-09-19: just the van)
    T(38, 434, 'first day: no limit on the van.', PAL.cyan, 13);
    T(38, 450, 'pull anything: it all comes home tonight.', PAL.cyan, 13);
  } else {
    // vanCapNow, not G.vanCap: a box you agreed to carry for somebody is space you have not got today
    const capNow = vanCapNow();
    T(90, 410, G.dig.loadedSize + ' / ' + capNow, G.dig.loadedSize >= capNow ? PAL.red : PAL.gray, 19);
    bar(160, 408, 148, 20, G.dig.loadedSize / capNow, G.dig.loadedSize >= capNow ? PAL.red : PAL.green);
    // what you leave behind is not your money until you can sell it to him (user, 2026-09-16) — and since
    // 2026-09-17 it is not free either, so the strip carries the running bill while you are still digging.
    // "what you leave is Pete's" simply stopped being true the day the yard began charging to clear it.
    const digFee = dumpFeeNow();
    T(38, 436, peteClearsUp() ? 'leftovers scrap @ $2/size'
      : dumpWaived() ? 'haul-off is on the yard today'
      : digFee ? 'haul-off so far: −' + fmt$(digFee) : 'nothing to haul off',
      peteClearsUp() || dumpWaived() || !digFee ? PAL.dgray : PAL.red, 15);
  }
  if (!G.inspect) button(38, 476, 168, 34, 'LOAD UP & LEAVE', () => tryDriveHome(), { col: PAL.orange, fs: 14 });
  else { px(g, 38, 476, 168, 34, PAL.ink); px(g, 40, 478, 164, 30, '#2a2d3d'); T(122, 484, 'deciding...', PAL.dgray, 14, 'center'); }

  const px0 = 340, py0 = 400, cw = 66, ch = 62;
  const perPage = 18;
  const start = clamp(G.pileScroll, 0, Math.max(0, G.dig.pile.length - perPage));
  G.pileScroll = start;
  for (let i = 0; i < perPage; i++) {
    const idx = start + i;
    if (idx >= G.dig.pile.length) break;
    const it = G.dig.pile[idx];
    const cx = px0 + (i % 9) * cw, cy = py0 + Math.floor(i / 9) * (ch + 4);
    const hovRow = inRect(mouse.x, mouse.y, cx, cy, cw - 4, ch);
    drawPileCell(it, cx, cy, cw, ch, hovRow, false);
    if (hovRow) {
      const [lo, hi] = estRange(it);
      digTip = {
        cx: cx + (cw - 4) / 2, top: cy, c: PAL.white,
        t: dName(it) + '  (' + (it.searched ? fmt$(shownVal(it)) : 'est ' + fmt$(lo) + '–' + fmt$(hi)) + ')'
          + (it.carried ? '  — from an earlier door; click to drop it for scrap' : '  —  click to ' + (it.loaded ? 'unload' : 'load')),
      };
    }
    hot(cx, cy, cw - 4, ch, () => {
      if (it.loaded) { it.loaded = false; G.dig.loadedSize -= it.size; play('van_unload'); }
      else if (G.dig.loadedSize + it.size <= vanCapNow()) { it.loaded = true; G.dig.loadedSize += it.size; play('van_load'); }
      else { play('denied'); clerkPop('No room — unload something first', PAL.red); }
    });
  }
  if (G.dig.pile.length > perPage) stripT(936, 384, 'wheel: more items', PAL.gray, 15, 'right');
  // the hint line under the frame is the sun's when the sun is the problem
  const low = !G.inspect && G.daylight <= 12 && G.cur.items.length > 0;
  const k = low ? pullsLeft() : 0;
  stripT(lx, ly + LK.frameH + 2,
    G.inspect ? 'Decide: load it or leave it.'
      : (low ? (k ? 'ENERGY ' + Math.max(0, Math.round(G.daylight)) + ' — enough for about ' + k + ' more pull' + (k === 1 ? '' : 's') + '. Then load up and go.'
        : "RUNNING ON FUMES — nothing left to pull with. Load up and go.")
        : 'Click an unblocked item to pull it out. Front stuff first!'),
    low ? PAL.red : PAL.gray, 15, 'left', low);
  if (digTip) drawTooltip(digTip.cx, digTip.top, digTip.t, digTip.c);
  if (G.inspect) drawInspectPanel();
}

// ============ SELL / HOME ============
// ---- Pete's standing offer (playtest 2026-09-16, the user's correction) ----
// Whatever you cannot carry out stays in the unit, and Pete clears it for nothing: that is the arrangement
// the yard has always had with him, and you never see a penny of it. This is the arrangement you can make
// instead, once you can afford it (the general store carries it from day 12): when the door comes down he
// weighs what is still in there and pays you for it.
// It is poor money on purpose — PETE_CLEAR_PER_SIZE a bulk, half what the scrap man gives you for something
// you pulled out yourself, because Pete is the one doing the lifting. It must never make leaving a good
// thing behind the right call. What it is for is the rest: the tired end of a big unit, the things you were
// always going to walk away from, which used to be worth exactly nothing to you.
const PETE_CLEAR_PER_SIZE = 1;
// ---- the haul-off bill (IDEAS_TODO 3; the user's idea, 2026-09-17) ----
// A yard holds an auction because it does not want to empty the unit. Winning a door moves that job to you,
// so walking away from half of it was never going to be free. Until Pete's standing offer (`peteDeal`, day
// 12) the yard bills you to clear what you left; after it, the SAME two numbers with the sign flipped pay
// you instead. cost -> profit, one hinge, and the tool upgrade finally means something.
// The fee is DEARER than the payout, and that gap is the point: a hauler charges labour to make a thing go
// away, a dealer pays salvage because he can sell it on. The difference between those two prices is the
// whole reason Pete's deal is worth buying, and it is why a yard holds an auction rather than a clear-out.
// Loose things cost more than sealed ones - sorting a strewn floor is work, an untouched unit is a truck and
// a shovel - which quietly teaches the right habit: if you are not taking it, do not unpack it.
// Measured over 45 generated doors (median bulk 72 against a 40 van): a lean door costs nothing, a median
// one about $64, a stuffed one $130. Against a $150-$400 door that is a real number and never a ruinous one.
const DUMP_FLOOR_PER_SIZE = 3, DUMP_SEALED_PER_SIZE = 2;
// The one day nobody can price a haul-off is the day before they have ever paid one, so day one is on the
// yard - the same day the van takes everything, and for the same reason. The number is still SHOWN: day one must
// not punish, but it may certainly explain.
function dumpWaived() { return bayOn(); }
function dumpFeeOn() { return !peteClearsUp(); }
// what clearing this lot costs: what you pulled and left by the pound, what never came out by the truckload
function dumpFeeFor(floor, sealed) {
  let v = 0;
  for (const it of floor || []) v += Math.max(1, it.size || 1) * DUMP_FLOOR_PER_SIZE;
  for (const it of sealed || []) v += Math.max(1, it.size || 1) * DUMP_SEALED_PER_SIZE;
  return Math.round(v);
}
// the figure at the door, before a paddle goes up: what the van cannot take, priced as a sealed haul-off.
// Bulk is the one thing a doorway tells you honestly - you can see a unit is stacked to the roof, you simply
// cannot see what any of it is worth - so pricing the clear-out off it leaks nothing the eye was not given.
function dumpFeeEstimate(lk) {
  if (!lk || !dumpFeeOn() || dumpWaived()) return 0;
  let bulk = 0;
  for (const it of lk.items || []) bulk += Math.max(1, it.size || 1);
  const over = bulk - vanCapNow();
  return over > 0 ? Math.round(over * DUMP_SEALED_PER_SIZE / 5) * 5 : 0;
}
// short at the gate: the office carries it, on the same tab as the weekly bill, so it has the same teeth
// already built (favours wait, the clerk goes cold, PAY THE BILL is in the office). No van row, though -
// the shop taking a row is the WEEKLY bill's punishment, and this is not that bill.
// what walking out of this unit right this second would cost. The dig strip and the leave-check panel both
// read it, so the two can never quote different numbers at each other. driveHome cannot: by the time it
// charges, the `loaded` flags are already cleared, so it prices the `stayed` list it captured before that.
function dumpFeeNow() {
  if (!G.cur || !G.dig || !dumpFeeOn()) return 0;
  const st = leaveCheckStaying();
  return dumpFeeFor(st.filter((e) => !e.sealed).map((e) => e.it), st.filter((e) => e.sealed).map((e) => e.it));
}
function dumpOwe(amt) {
  const w = G.world;
  if (w.nut) w.nut.owed += amt;
  else w.nut = { owed: amt, since: G.day, lostRow: 0 };
  recordEvent('dumpOwed', { unit: G.cur ? G.cur.num : 0, amt, owed: w.nut.owed });
  bump('dumpOwed', amt);
  return w.nut.owed;
}
function peteClearsUp() { return typeof hasTool === 'function' && hasTool('peteDeal'); }
// what he will hand over for what is still behind the door
function peteClearValue(items) {
  if (!peteClearsUp()) return 0;
  let v = 0;
  for (const it of items || []) v += Math.max(1, it.size || 1) * PETE_CLEAR_PER_SIZE;
  return Math.round(v);
}
function offersFor(it) {
  const out = [];
  for (const s of [{ def: BUYERS[0], cash: Infinity }, ...G.today.specialists]) {
    const b = s.def;
    if (it.locked) continue;
    if (b.cats && !b.cats.includes(it.cat) && !(it.baroness && b.id === 'carl')) continue;   // Carl will cross a category line for the Baroness
    if (b.cats && (!it.searched || it.unverified)) continue;   // specialists want appraised goods — and vouched-for ones
    if (it.censored && b.id === 'alice') continue;                    // not in her shop
    let mult = (b.id === 'pete' && G.money < 150) ? 0.5 : b.mult;   // Pete, when you are down to gas money: fifty cents and pity
    if (b.cats && tvNameNow() === 'whale') mult *= TV_WHALE_BUYERS;     // they saw you on Channel 9: the whale gets a tenth more
    if (b.cats && typeof buyerGrudgeMult === 'function') mult *= buyerGrudgeMult(b.id);   // a deposit taken and nothing delivered (phone.js)
    if (it.baroness && b.id === 'carl') mult *= 2;                    // Carl pays double for the Baroness's chair. Carl has reasons.
    if (it.censored && b.id === 'carl') mult *= 3;                    // and triple for the blurred ones. Carl has more reasons.
    if (!it.searched && !b.cats && claimOn(it)) {
      // never even appraised, but it would flag: Pete still pays for the object, never the story
      out.push({ s, b, kind: 'object', price: Math.max(1, Math.round(objectValue(it) * mult)), can: true, clientCall: false });
      continue;
    }
    if (it.unverified && !b.cats) {
      // a flagged thing: the object, or his gamble on the claim (peteTalk says both out loud)
      out.push({ s, b, kind: 'object', price: Math.max(1, Math.round(objectValue(it) * mult)), can: true, clientCall: false });
      out.push({ s, b, kind: 'gamble', price: Math.max(1, Math.round(it.claim * PETE_GAMBLE)), can: true, clientCall: false });
      continue;
    }
    const price = Math.max(1, Math.round(it.val * mult));
    const clientCall = !!it.setComplete && !!b.cats;   // for a full set, they phone a client
    out.push({ s, b, price, can: s.cash >= price || clientCall, clientCall });
  }
  return out;
}
function sellItem(it, offer) {
  if (!offer.clientCall) offer.s.cash -= offer.price;
  gain(offer.price);
  play(offer.price >= 300 ? 'coin_big' : 'sell_cash');
  speak(['npc_' + offer.b.id + '_buy']);
  G.dayStats.soldCount++; G.dayStats.soldTotal += offer.price;
  bump('sales', offer.price);
  if (offer.b.id === 'pete') bump('petesTake', Math.max(0, it.val - offer.price));   // what Pete kept, by his own arithmetic
  // sold with the flag still on it: nobody in the room knows what it was, so the
  // sale is never a "legendary" sale here. The verdict nobody saw goes on the
  // record as soldBlind — that is what the paper will hint at, days later (§8).
  const blind = !!it.unverified;
  if ((offer.price >= 500 || (!blind && it.legendary) || it.setComplete || it.named)) {
    recordEvent('bigSale', { name: dName(it), base: it.base, buyer: offer.b.id, amt: offer.price, legendary: !!it.legendary && !blind, set: it.setComplete || null, blind });
  }
  if (blind) recordEvent('soldBlind', { uid: it.uid, base: it.base, name: dName(it), claim: it.claim, paid: offer.price, gamble: offer.kind === 'gamble', real: !(it.fake || it.lux), val: it.val });
  takeFromLists(it);
  G.sellSel = -1;
  const shortName = offer.b.name.split(' ')[1] || offer.b.name;
  if (blind) {
    // Pete never says what he thinks it is. He says what he paid for.
    toast(offer.kind === 'gamble' ? '"My chances. My problem."  — Pete' : '"' + fmt$(offer.price) + '. It\'s a ' + objectNoun(it) + '."  — Pete', PAL.gray, 3);
    return;
  }
  if (offer.clientCall) { toast('"My client wires the money. Wrap it carefully."  — ' + shortName, PAL.gold, 3); return; }
  // the blurred ones: Carl asks for more, Pete says nothing at all
  if (it.censored) {
    if (offer.b.id === 'carl') { bump('asIs'); toast('"...are there more?"  — Carl', PAL.pink, 3); }
    else if (offer.b.id === 'pete') toast('Pete says nothing. Pete puts it under the counter.', PAL.gray, 3);
    else toast('"I\'ll take it. We will not discuss it."  — ' + shortName, PAL.gray, 3);
    return;
  }
  // the buyers remember too: a fake, a plated thing, the real thing
  if (it.fake) { toast((offer.b.id === 'carl' ? '"The plastic one. I have the others."' : '"Plastic. I know. Everybody knows."') + '  — ' + shortName, PAL.gray); return; }
  if (it.lux) { toast('"Plated. Yeah. It still shines in the window."  — ' + shortName, PAL.gray); return; }
  if (it.legendary) { toast((offer.b.id === 'carl' ? '"...the real one. Yes. YES."' : '"I\'m going to need a bigger safe."') + '  — ' + shortName, PAL.gold, 3); return; }
  const quips = BUYER_QUIPS[offer.b.id];
  if (quips) toast(quips[(Math.random() * quips.length) | 0] + '  — ' + shortName, PAL.gray);
}

// the brand the player holds most of (locked pieces only) — for proof pieces
function bestHeldBrand(setId) {
  const t = {};
  for (const it of allHeld()) {
    if (!it.set || it.set.id !== setId || !it.searched || it.setComplete) continue;
    if (!SETS[setId].brandLocked.includes(it.set.role)) continue;
    t[it.set.brand] = (t[it.set.brand] || 0) + 1;
  }
  let best = null, bn = -1;
  for (const b in t) if (t[b] > bn) { bn = t[b]; best = b; }
  return best;
}

// merge the scattered pieces into the thing they always were
function assembleSet(setId, brand) {
  const def = SETS[setId];
  const res = setPieceCounts([G.stash, G.keeps, G.trophies], setId, brand);
  if (!setIsComplete(def, res.counts)) { play('denied'); return; }
  const all = [];
  for (const role in res.pieces) for (const it of res.pieces[role]) all.push(it);
  let scattered = 0;
  for (const it of all) scattered += it.val;
  const av = assembleValue(def, all);
  for (const it of all) takeFromLists(it);
  const bdef = def.brands.find((b) => b[0] === brand);
  const item = {
    uid: nextUid(), base: def.roles.anchor.base, cat: def.completeCat, spr: def.completeSpr,
    size: def.completeSize, pal: (bdef && bdef[2]) || 'wood', cond: av.cond,
    name: def.completeName(brand), val: av.val, cash: null, container: null,
    locked: false, opened: false, loot: null, legendary: false,
    searched: true, setComplete: setId, set: null,
    layer: 0, col: 0, wCols: 2,
  };
  G.stash.push(item);
  G.world.setsCompleted.push({ id: setId, brand, day: G.day });
  recordEvent('setDone', { setId, brand, name: item.name, val: av.val });
  bump('sets');
  G.world.setDrought[setId] = G.day + 8;      // the director rests that story a while
  item.homeDay = G.day;
  G.homeTab = 'stash';
  G.sellSel = 0; G.sellSort = 'new';       // the finished set lands on top of the sorted haul
  G.sellScroll = 0;
  // the ceremony: the pieces around the whole thing, one chord, then the numbers
  const modal = {
    title: 'THE SET IS COMPLETE', lines: [
      { text: item.name, col: PAL.gold },
      { text: 'Assembled: ' + fmt$(av.val) + '   (' + av.cond + ')', col: PAL.yellow },
      { text: 'Scattered, it was worth ' + fmt$(scattered) + '. Completion pays.', col: PAL.gray },
    ],
  };
  startReveal(item, 'set', { pieces: all, modal, sub: 'Assembled: ' + fmt$(av.val) + '   (' + av.cond + ')' });
  saveGame();
}
function crackSafe(it) {
  // a key you kept, from a box you opened days ago, in a town you left
  const key = heldKeyFor(it);
  if (key) {
    play('search_find');
    takeFromLists(key);
    it.locked = false;
    recordEvent('keyUsed', { name: BASE_BY_ID[it.base].name, base: it.base, keyId: it.keyId });
    bump('keys');
    const had = (it.loot || []).slice();
    const lines = emptyContainer(it, true);
    haulFanfare(had);
    lines.unshift({ text: 'The key fits. Of course it fits. You knew.', col: PAL.gold });
    G.modal = { title: 'The key turns:', lines };
    return;
  }
  const cost = it.crackCost || 60;
  if (G.money < cost) { play('denied'); toast('Locksmith wants ' + fmt$(cost) + '.', PAL.red); return; }
  spend(cost);
  play('safe_crack');
  it.locked = false;
  const had = (it.loot || []).slice();          // what was in there, before it is emptied out
  const lines = emptyContainer(it, true);
  haulFanfare(had);                             // a safe with money in it should sound like one
  if (lines.length === 1 && lines[0].text.indexOf('empty') >= 0) lines[0] = { text: 'Nothing. NOTHING!', col: PAL.red };
  G.modal = { title: 'The safe swings open:', lines };
}
// ============ appraisal, in two steps (docs/APPRAISAL.md) ============
// APPRAISE ALL prices everything, instantly, for nothing — same as it always has.
// But some things come out FLAGGED: a claimed value the game will not stand behind
// until somebody qualified looks. A fake wears the legend's face and its price; a
// gold-plated lamp claims what it photographs like. Phase 1 only plants the flag:
// VERIFY is the second step, and for now it is free and instant. The appraiser,
// the fee and the schedule (docs/APPRAISAL.md §4) go in front of it later.

// why a self-appraisal will not vouch for this item, or null for a plain thing
function claimOn(it) {
  if (it.fake || it.legendary) return 'legend';
  if (it.lux) return 'lux';
  if (it.storyPayoff) return 'story';
  if (hasTool('catalog')) return null;          // the pocket guide: grain and a maker's stamp you can read yourself
  if (it.hideBrand && it.preName) return 'pedigree';
  if ((it.brandM || 1) >= 2) return 'brand';
  return null;
}
// what it is worth if it is what it looks like. Only a fake and lux junk claim more
// than they are; everything else claims its own number and simply lacks the vouch.
function claimedValue(it) {
  const b = BASE_BY_ID[it.base];
  if (it.fake && b && b.fakeOf && BASE_BY_ID[b.fakeOf]) return BASE_BY_ID[b.fakeOf].val;
  if (it.lux && it.fakeEst) return Math.round((it.fakeEst[0] + it.fakeEst[1]) / 2 / 50) * 50;
  return it.val;
}
// the number the player is allowed to see
function shownVal(it) { return it.unverified ? it.claim : it.val; }

// ---- Pete's arithmetic on a flagged thing (docs/APPRAISAL.md §5) ----
// He pays for the OBJECT — a rock, a lamp, a guitar — and it is the same number
// whether the claim is true or not, so the price itself can never tell you the
// verdict. Or he takes the gamble himself: a fixed slice of the claim, well under
// what he would pay for the real thing once verified (0.45 × claim: he is carrying
// the risk and wants paying for it) and well over the object. Tune in play; §13.
const PETE_GAMBLE = 0.27;
function objectValue(it) {
  const b = BASE_BY_ID[it.base];
  if (it.legendary) { const f = MYTH_FAKES[it.base]; return f && BASE_BY_ID[f] ? BASE_BY_ID[f].val : it.val; }   // a legend, priced as a rock
  if (it.fake) return b ? b.val : it.val;                                                                  // the flat base, not the rolled val: it must equal the legend's number exactly
  if (it.lux) return it.val;                                                                               // already the object's number
  if (it.storyPayoff) return b ? b.val : it.val;
  return Math.max(1, Math.round(it.val / (it.brandM || 1)));                                              // the brand struck back out
}
// what he calls it. He never calls it what it might be.
const OBJECT_NOUNS = { goldJacket: 'jacket', moonRock: 'rock', jewelEgg: 'egg', goonMap: 'map', nugget: 'rock', deed: 'piece of paper',
  gavel: 'hammer', jarThing: 'jar', cameo: 'brooch', stampSheet: 'sheet of stamps', pageantCrown: 'tiara' };
function objectNoun(it) {
  const b = BASE_BY_ID[it.base], myth = it.legendary ? it.base : (b && b.fakeOf);
  if (myth && OBJECT_NOUNS[myth]) return OBJECT_NOUNS[myth];
  return b ? b.name.toLowerCase() : 'thing';
}
// two numbers, one conversation. He does not say which he thinks it is; he is not paid to.
function peteTalk(it) {
  const offers = offersFor(it), obj = offers.find((o) => o.kind === 'object'), gam = offers.find((o) => o.kind === 'gamble');
  if (!obj || !gam) return;
  const noun = objectNoun(it);
  G.modal = {
    title: 'Pete looks at the ' + noun + '.',
    lines: [
      { text: '"' + fmt$(obj.price) + '. It\'s a ' + noun + '."', col: PAL.white },
      { text: '"Or ' + fmt$(gam.price) + ', and I take my chances on it."', col: PAL.yellow },   // fits the box on one line
      { text: 'He does not say which he thinks it is.', col: PAL.dgray },
    ],
    buttons: [
      { label: 'TAKE ' + fmt$(obj.price), cb: () => { G.modal = null; sellItem(it, obj); }, col: PAL.slate },
      { label: 'TAKE ' + fmt$(gam.price), cb: () => { G.modal = null; sellItem(it, gam); }, col: '#8a5a20' },
      { label: 'KEEP IT', cb: () => { G.modal = null; }, col: PAL.blue },
    ],
  };
}
const CLAIM_LINES = {
  legend: 'if it is what it looks like.',
  lux: 'it photographs like money.',
  story: 'if the story holds.',
  pedigree: 'there is a mark under the dust nobody has read yet.',
  brand: 'the stamp says so. Somebody should read it properly.',
};
// what "unverified" actually means, said once, plainly, wherever a flagged
// price first shows its face — the question was "what does a claim mean?"
const CLAIM_TAIL = 'That is a claim, not a fact. Get it verified.';
// appraisal: the value, the brand, the belonging. Never a treasure hunt —
// hidden money lives in LOOK CLOSER, where hands actually go through things.
function searchItem(it) {
  it.searched = true;
  const why = claimOn(it);
  if (!why) return verdictLine(it);
  it.unverified = true;
  it.claim = claimedValue(it);
  it.claimKind = why;                                 // who can answer it depends on what kind of claim it is
  const pp = paperFor(it);                            // paperwork in your pocket settles it on the spot, for nothing (docs/APPRAISAL.md §7)
  if (pp) { const pv = paperVerdict(it, pp); if (pv) return pv; }
  return { text: dName(it) + ' — ' + fmt$(it.claim) + ', ' + CLAIM_LINES[why] + '  ' + CLAIM_TAIL, col: PAL.orange };
}
// the second opinion: the flag comes off and the truth lands — up, down, or the same
function verifyItem(it) {
  if (!it.unverified) return null;
  delete it.unverified; delete it.claim;
  doorSettle(it);                                     // the door it came out of is worth what it really is, now
  return verdictLine(it);
}
// ============ the verdicts (docs/APPRAISAL.md §4, §6) ============
// Nobody vouches for free. A category buyer will say what a thing is when it is in
// their trade — a maker's mark, a pedigree, a story — and then make their offer. The
// appraiser will say what anything is, at a fee, three looks a visit. A rock is
// nobody's trade but hers. And a brand claim can come back wrong.
const BUYER_CLAIMS = ['brand', 'pedigree', 'story'];
const CLAIM_FALSE_RATE = 0.33;
const APPRAISER = BUYERS.find((b) => b.appraiser);
// decided by hash, not by a roll: it never moves a snapshot, and the same dresser is
// the same dresser on every reload
function claimFalseFor(it) {
  if ((it.claimKind || claimOn(it)) !== 'brand') return null;
  const h = strHash('claim' + G.worldSeed + '_' + (it.hseed || it.uid) + '_' + it.base);
  if (h % 1000 >= CLAIM_FALSE_RATE * 1000) return null;
  if (/\bSigned\b/.test(it.name)) return 'nobody';
  return (h >> 10) % 2 ? 'stamped' : 'lookalike';
}
const CLAIM_FALSE = {
  stamped: { tag: 'stamped', line: '"The stamp is a stamp. They sold thousands like this."' },
  lookalike: { tag: 'lookalike', line: '"Right look. Wrong maker. Somebody was hoping."' },
  nobody: { tag: 'signed by nobody', line: '"It is signed. It is just not by anybody."' },
};
const CLAIM_TRUE_LINES = ['"Right maker. Right decade. Right everything."', '"It is what it says it is. That is rarer than you would think."', '"Genuine. Do not let anybody tell you different."'];
function appraiserLooksLeft() {
  const u = G.world.appraiserUsed;
  return APPRAISER.perVisit - (u && u.day === G.day ? u.n : 0);
}
// days until she is next in town (0 = today), read off her own calendar
function nextAppraiserIn() {
  for (let d = 0; d <= APPRAISER_EVERY + 1; d++) if (genAppraiser(G.worldSeed, G.day + d)) return d;
  return APPRAISER_EVERY;
}
// who can answer this claim today
function verdictRoutes(it) {
  const kind = it.claimKind || claimOn(it);
  const buyers = !it.unverified ? [] : G.today.specialists.map((s) => s.def).filter((b) => b.cats && b.cats.includes(it.cat) && BUYER_CLAIMS.includes(kind));
  return { buyers, appraiser: !!(it.unverified && G.today.appraiser) };
}
// the line under the number: who can look at it, and when
function routeLine(it) {
  const r = verdictRoutes(it);
  if (r.buyers.length) return r.buyers.map((b) => b.name.split(' ')[1] || b.name).join(' or ') + ' can vouch for it — ask below';
  if (r.appraiser) return 'the appraiser is in town — ' + fmt$(APPRAISER.fee) + ' a look';
  const n = nextAppraiserIn();
  return n ? 'nobody in town can vouch for it. the appraiser is back in ' + n + (n === 1 ? ' day' : ' days') : 'nobody in town can vouch for it today';
}
// the verdict lands. A false brand claim is struck back to the plain thing first; then
// the old reveal runs (a fake is named, lux junk is named, a legend is confirmed).
function deliverVerdict(it, by, force) {
  if (!it.unverified) return null;
  const kind = it.claimKind || claimOn(it), claim = it.claim;
  // paperwork can say what it says (force: 'true', or a false-claim tag); otherwise the hash decides
  const f = force === 'true' ? null : (force || claimFalseFor(it));
  if (f) {
    it.val = objectValue(it);
    it.brandM = 1;
    it.name = (it.cond ? it.cond + ' ' : '') + BASE_BY_ID[it.base].name + ' (' + CLAIM_FALSE[f].tag + ')';
  }
  it.verdict = f || 'true'; it.verdictBy = by; it.verdictDay = G.day;
  // what the card will print back (itemcard.js): the number you believed, and the reason in their words
  it.claimWas = claim;
  it.verdictNote = f ? CLAIM_FALSE[f].line
    : it.fake ? '"It had the face. It never had the heart."'
    : it.lux ? '"' + it.lux + '. That is the whole verdict."'
    : it.legendary ? '"I have read about this."'
    : (kind === 'brand' ? CLAIM_TRUE_LINES[strHash(it.base + '_' + it.uid) % CLAIM_TRUE_LINES.length] : '');
  const res = verifyItem(it);
  recordEvent('verdict', { uid: it.uid, base: it.base, name: it.name, by, real: !f && !it.fake && !it.lux, claim, val: it.val });
  if (f) return { text: it.name + ' — ' + fmt$(it.val) + '.  ' + CLAIM_FALSE[f].line, col: PAL.orange };
  if (kind === 'brand') return { text: it.name + ' — ' + fmt$(it.val) + '.  ' + CLAIM_TRUE_LINES[strHash(it.base + '_' + it.uid) % CLAIM_TRUE_LINES.length], col: tierOf(it.val).col };
  return res;
}
// in their trade: free, and then they make their offer
function buyerVerdict(it, b) {
  if (!verdictRoutes(it).buyers.includes(b)) return false;
  play('search_rummage');
  const res = deliverVerdict(it, b.id);
  if (!itemCardMaybe(it, res, G.mode) && !startVerdict(it, res, b.id, null)) G.modal = { title: (b.name.split(' ')[1] || b.name) + ' looks it over:', lines: [res] };
  return true;
}
// anything, for the fee, three a visit. The count lives on the world so a reload cannot reset it.
function appraiserVerdict(it) {
  if (!it.unverified || !G.today.appraiser) return false;
  const left = appraiserLooksLeft();
  if (left <= 0) { play('denied'); toast('"Three. I said three."  — Mrs. Odell', PAL.red); return false; }
  if (G.money < APPRAISER.fee) { play('denied'); toast('Mrs. Odell wants ' + fmt$(APPRAISER.fee) + ' before she looks.', PAL.red); return false; }
  spend(APPRAISER.fee);
  bump('appraisalFees', APPRAISER.fee);
  const u = G.world.appraiserUsed;
  G.world.appraiserUsed = { day: G.day, n: (u && u.day === G.day ? u.n : 0) + 1 };
  play('search_rummage');
  const res = deliverVerdict(it, 'appraiser');
  const now = appraiserLooksLeft();
  const leftLine = now ? now + ' more look' + (now === 1 ? '' : 's') + ' today.' : 'That is her three for today.';
  if (itemCardMaybe(it, res, G.mode)) toast(leftLine, PAL.gray, 3);
  else if (!startVerdict(it, res, 'appraiser', leftLine)) G.modal = { title: 'Mrs. Odell finishes looking:', lines: [res, { text: leftLine, col: PAL.dgray }] };
  return true;
}
function verdictLine(it) {
  // the fake: it had the face. it never had the heart.
  if (it.fake) {
    delete it.fakeEst;
    recordEvent('fake', { base: it.base, name: it.name });
    bump('fakes');
    it.name = it.name + ' (' + (BASE_BY_ID[it.base].fakeTag || 'plastic') + ')';
    return { text: it.name + ' — ' + fmt$(it.val) + '.  "Hm." Somebody in this town will still pay.', col: PAL.orange };
  }
  // luxury junk: it looked like a fortune from the door. The appraiser needed one word.
  if (it.lux) {
    delete it.fakeEst;
    recordEvent('lux', { base: it.base, name: it.name, val: it.val });
    it.name = it.name + ' (' + it.lux + ')';
    return { text: it.name + ' — ' + fmt$(it.val) + '.  The appraiser did not even pick it up.', col: PAL.orange };
  }
  // the one real thing in an authored door
  if (it.storyPayoff) return { text: it.name + ' — ' + fmt$(it.val) + '.  Now that is a story.', col: PAL.gold };
  // the real thing: the appraiser sits down
  if (it.legendary) return { text: it.name + ' — ' + fmt$(it.val) + '.  The appraiser sits down. "I have read about this."', col: PAL.gold };
  // the blurred ones: the appraiser prices it from across the room
  if (it.censored) return { text: it.name + ' — ' + fmt$(it.val) + '.  The appraiser did not pick it up. The appraiser did not look.', col: PAL.pink };
  // named junk that should not exist
  if (it.named) {
    recordEvent('named', { base: it.base, name: it.name, val: it.val });
    if (it.blurb) { G.world.pendingBlurb = it.blurb; G.world.pendingBlurbDay = G.day + 1; }
    return { text: it.name + ' — ' + fmt$(it.val) + ". It shouldn't exist. It does. It's yours.", col: PAL.gold };
  }
  // set pieces: the appraisal is where the brand and the belonging land
  if (it.set && SETS[it.set.id]) {
    const def = SETS[it.set.id];
    const first = G.world.setsAppraised.indexOf(it.set.id) < 0;
    if (first) G.world.setsAppraised.push(it.set.id);
    return {
      text: it.name + ' — ' + fmt$(it.val) + (first ? '.  ' + def.appraiseFlavor : '.'),
      col: first ? PAL.cyan : tierOf(it.val).col,
    };
  }
  // the first appraisal out of a door names what the door already told you
  const tell = appraiserTell(it);
  return { text: it.name + ' — ' + fmt$(it.val) + (tell ? '.  ' + tell : ''), col: tierOf(it.val).col };
}
function searchAll() {
  const targets = G.stash.filter((it) => !it.searched && !it.locked && !it.loot);
  if (!targets.length) return;
  play('search_rummage');
  const done = targets.map((it) => ({ it, line: searchItem(it) }));
  G.modal = appraisalSheet(done);
}
// ---- the appraisal, as a sheet (user, 2026-09-19: "it's all aligned center... put it aligned left and group
// items together") ----
// One line a thing, ranged left like a list you can run your eye down, and grouped: the claims that still need
// somebody qualified first (they are the ones you have to act on), then each kind of thing, dearest first, with
// the group's count and total on its header. The same line twice (four bags of the same junk) is one line, x4.
// It scrolls when the haul is bigger than the box, where the old modal stopped at thirteen and said "...and 9 more".
function appraisalSheet(done) {
  const groups = {};
  for (const d of done) {
    const key = d.it.unverified ? 'claim' : (d.it.cat || 'junk');
    (groups[key] = groups[key] || []).push(d);
  }
  const order = ['claim'].concat(Object.keys(CATS).filter((k) => k !== 'cash' && k !== 'junk'), ['junk', 'cash']);
  const rows = [];
  for (const key of order.concat(Object.keys(groups).filter((k) => !order.includes(k)))) {
    const list = groups[key];
    if (!list || !list.length) continue;
    list.sort((a, b) => shownVal(b.it) - shownVal(a.it));
    const total = list.reduce((a, d) => a + (shownVal(d.it) || 0), 0);
    const name = key === 'claim' ? 'NEEDS VERIFYING' : ((CATS[key] && CATS[key].label) || key).toUpperCase();
    rows.push({ head: true, text: name + '  ·  ' + list.length + '  ·  ' + fmt$(total) + (key === 'claim' ? '  ·  claims, not facts: get them verified' : ''), col: key === 'claim' ? PAL.orange : ((CATS[key] && CATS[key].col) || PAL.gray) });
    const seen = [];
    for (const d of list) {
      const text = key === 'claim' ? d.line.text.replace('  ' + CLAIM_TAIL, '') : d.line.text;   // said once, on the header
      const same = seen.find((r) => r.text === text && r.col === d.line.col);
      if (same) { same.n++; continue; }
      const r = { text, col: d.line.col, n: 1 };
      seen.push(r); rows.push(r);
    }
  }
  const m = { title: 'You appraise the haul:', rows, scroll: 0, money: true };
  m.draw = () => drawAppraisalSheet(m);
  m.onWheel = (dir) => { m.scroll = clamp(m.scroll + dir * 3, 0, m.scrollMax || 0); };
  return m;
}
function drawAppraisalSheet(m) {
  const mw = 760, mh = 470, mx = (W - mw) / 2, my = (H - mh) / 2;
  px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.yellow);
  panel(mx, my, mw, mh, '#242737');
  T(mx + 24, my + 14, m.title, PAL.yellow, 24, 'left', true);
  // every row wrapped once, by measure, into the lines it will draw
  const tx = mx + 28, textW = mw - 80, fs = 15, step = 20;
  const lines = [];
  for (const r of m.rows) {
    if (r.head) { lines.push({ head: true, text: r.text, col: r.col }); continue; }
    const txt = r.n > 1 ? r.text + '  (x' + r.n + ')' : r.text;
    const wr = wrapPx(txt, textW - 14, fs);
    for (let k = 0; k < wr.length; k++) lines.push({ text: wr[k], col: r.col, indent: k > 0 });
  }
  const top = my + 52, room = Math.floor((mh - 52 - 56) / step);
  m.scrollMax = Math.max(0, lines.length - room);
  m.scroll = clamp(m.scroll || 0, 0, m.scrollMax);
  const shown = lines.slice(m.scroll, m.scroll + room);
  for (let i = 0; i < shown.length; i++) {
    const l = shown[i], y = top + i * step;
    if (l.head) {
      px(g, tx - 6, y - 2, textW + 12, step - 2, 'rgba(255,255,255,0.05)');
      px(g, tx - 6, y - 2, 3, step - 2, l.col);
      T(tx + 2, y, l.text, l.col, 13, 'left', true);
    } else moneyLineT(tx + 14 + (l.indent ? 14 : 0), y, l.text, l.col, fs, 'left');
  }
  if (m.scrollMax > 0) {
    // where you are in it, and that there is more
    const trackH = room * step, bh = Math.max(20, Math.round(trackH * room / lines.length));
    const by = top + Math.round((trackH - bh) * (m.scroll / m.scrollMax));
    px(g, mx + mw - 18, top, 4, trackH, '#1a1c28');
    px(g, mx + mw - 18, by, 4, bh, PAL.slate);
    T(mx + 24, my + mh - 40, m.scroll < m.scrollMax ? 'scroll for more' : 'that is everything', PAL.dgray, 12, 'left');
  }
  button(mx + mw / 2 - 70, my + mh - 46, 140, 34, 'NICE', () => { G.modal = null; }, { col: PAL.blue, fs: 18 });
}
function appraisedValue() {
  let v = 0; for (const it of G.stash.concat(G.keeps)) if (it.searched) v += it.val;
  return v;
}
// what the screen may add up: vouched-for goods, and the claims, kept apart.
// appraisedValue() above keeps counting the hidden truth so netWorth and every
// gate on it behave exactly as they did before the flag existed.
function verifiedValue() {
  let v = 0; for (const it of G.stash.concat(G.keeps)) if (it.searched && !it.unverified) v += it.val;
  return v;
}
function unverifiedValue() {
  let v = 0; for (const it of G.stash.concat(G.keeps)) if (it.unverified) v += it.claim;
  return v;
}
function searchOne(it) {
  play('search_rummage');
  const res = searchItem(it);
  G.modal = { title: 'You size up the ' + BASE_BY_ID[it.base].name + ':', lines: [res], money: true };
}
// ---- the verdict, given its moment (IDEAS_TODO 5: the appraisal deserves more; built 2026-09-16) ----
// Somebody putting a number on a thing is one of the game's payoffs, and it passed as a line in a modal.
// itemCardMaybe already gives the big ones a card, but it fires once a day and only for things that qualify,
// so the ordinary verdict - the one that decides whether the claim you paid for was ever real - said nothing.
// This is the moment it deserves, built out of what is already here: the garage behind it, the thing in the
// light, and the buyer's OWN portrait at 140 px instead of the 28 px it gets on the buyers' row. No new art is
// needed; it is the user's art, finally big. Flat rects rather than a radial gradient, so it draws headless.
const VERDICT_LAND = 1.8, VERDICT_NOTE = 2.6, VERDICT_OUT = 3.2;
function verdictWasGood(it) { return !(it.fake || it.lux || (it.verdict && it.verdict !== 'true')); }
function startVerdict(it, res, who, tail, back) {
  if (G.demo) return false;                       // demo states are fixed pictures: they keep the old modal
  G.verdict = { it, res: res || null, who: who || 'appraiser', tail: tail || null, t: 0, stung: false, back: back || G.mode };
  G.mode = 'verdict';
  _musicDuck = 0.18;
  play('verdict_loupe');
  return true;
}
function endVerdict() {
  const v = G.verdict;
  if (!v) return;
  G.verdict = null;
  _musicDuck = 1;
  G.mode = v.back || 'sell';
  if (v.tail) toast(v.tail, PAL.gray, 3);         // "that is her three for today" still gets said
}
function verdictWho(v) {
  return v.who === 'appraiser' ? APPRAISER : (BUYERS.find((b) => b.id === v.who) || APPRAISER);
}
// what kind of claim was on it, in the plate's few words
const VERDICT_CLAIM_WORDS = { legend: 'it has the look of a legend', lux: 'it looks like money', story: 'a story came with it',
  pedigree: 'a mark under the dust', brand: 'a maker\'s stamp' };
// the one-word ruling, for the plate
function verdictRuling(it) {
  if (it.verdict && it.verdict !== 'true') return (CLAIM_FALSE[it.verdict] ? CLAIM_FALSE[it.verdict].tag : 'not what it claimed').toUpperCase();
  if (it.fake) return 'A FAKE';
  if (it.lux) return 'LOOKS, NOTHING ELSE';
  if (it.legendary) return 'THE REAL THING';
  return 'GENUINE';
}
// the plate beside the thing (2026-09-17: "it needs to be bigger, and maybe more info"). Two halves: what you
// walked in knowing, shown from the start, and what the look told you, which lands with the number.
// Rows are [label, text, colour]; nothing here decides anything, it only reads the item back.
function verdictRows(it, landed) {
  const rows = [];
  const cat = CATS[it.cat];
  rows.push(['KIND', (cat ? cat.label : 'Thing') + (it.cond ? '  ·  ' + String(it.cond).toLowerCase() : ''), cat ? cat.col : PAL.white]);
  if (it.fromDay || it.fromUnit) {
    const town = it.fromTown && TOWNS[it.fromTown] ? TOWNS[it.fromTown].name : null;
    rows.push(['FOUND', (it.fromDay ? 'day ' + it.fromDay : 'some day') + (town ? '  ·  ' + town : '') + (it.fromUnit ? '  ·  unit ' + it.fromUnit : ''), PAL.gray]);
  }
  if (it.claimKind && VERDICT_CLAIM_WORDS[it.claimKind]) rows.push(['THE CLAIM', VERDICT_CLAIM_WORDS[it.claimKind], PAL.gray]);
  if (it.claimWas != null) rows.push(['YOU BELIEVED', fmt$(it.claimWas), PAL.yellow]);
  if (!landed) return rows;
  const good = verdictWasGood(it);
  rows.push(['THE RULING', verdictRuling(it), good ? PAL.green : PAL.orange]);
  const tier = tierOf(it.val);
  rows.push(['WORTH', fmt$(it.val) + '  ·  ' + tier.name, tier.col]);
  if (it.claimWas != null && it.claimWas !== it.val) {
    const d = it.val - it.claimWas;
    rows.push(['AGAINST THE CLAIM', (d > 0 ? '+' : '-') + fmt$(Math.abs(d)), d > 0 ? PAL.green : PAL.red]);
  }
  if (it.set && typeof SETS !== 'undefined' && SETS[it.set.id]) rows.push(['BELONGS TO', SETS[it.set.id].name || 'a set', PAL.cyan]);
  // what Pete would have paid without the look: the object, or his gamble on the claim (the same sums as peteTalk)
  if (it.claimWas != null) {
    const pm = (G.money < 150) ? 0.5 : BUYERS[0].mult;
    const obj = Math.max(1, Math.round(objectValue(it) * pm)), gam = Math.max(1, Math.round(it.claimWas * PETE_GAMBLE));
    rows.push(['PETE, BLIND', fmt$(obj) + ' for the ' + objectNoun(it) + '  ·  ' + fmt$(gam) + ' gamble', PAL.gray]);
  }
  // who pays most for it tonight, now that it is vouched for
  let best = null;
  for (const o of offersFor(it)) if (o.can && (!best || o.price > best.price)) best = o;
  if (best) rows.push(['BEST OFFER TODAY', best.b.name + '  ·  ' + fmt$(best.price), PAL.white]);
  return rows;
}
function drawVerdict(dt) {
  const v = G.verdict;
  if (!v) return;
  if (!drawBG()) px(g, 0, 0, W, H, '#151220');
  drawHeader('HOME');
  hotspots = [];
  v.t += dt;
  const it = v.it, good = verdictWasGood(it), landed = v.t > VERDICT_LAND;
  const fade = Math.min(1, v.t / 0.6);
  px(g, 0, 0, W, H, 'rgba(6,6,12,' + (0.9 * fade).toFixed(2) + ')');
  // ---- whoever is looking: the left column, bigger than they ever get on the buyers' row ----
  const def = verdictWho(v);
  g.globalAlpha = fade;
  px(g, 36, 80, 196, 196, good || !landed ? '#2a2c3c' : '#4a2c20');
  drawPortrait(def.id, 40, 84, 188, 188);
  g.globalAlpha = 1;
  const nm = fitLines(def.name, 196, [19, 16, 14], 1, true);
  T(134, 300, nm.lines[0], PAL.white, nm.fs, 'center', true);
  T(134, 322, !landed ? 'turning it over…' : (good ? 'satisfied.' : 'not convinced.'), !landed ? PAL.dgray : (good ? PAL.green : PAL.orange), 14, 'center');
  if (v.tail && landed) {
    const tl = fitLines(String(v.tail), 196, [13, 12], 2);
    for (let i = 0; i < tl.lines.length; i++) T(134, 346 + i * 16, tl.lines[i], PAL.dgray, tl.fs, 'center');
  }
  // ---- the thing, in a light built from flat rects: the middle of the screen, as big as it will go ----
  const spr = getSprite(it.spr, it.pal, it.cond, it.hseed || it.uid);
  const sc = Math.max(1, Math.min(12, Math.floor(232 / spr.height), Math.floor(300 / spr.width)));
  const dw = spr.width * sc, dh = spr.height * sc;
  const cx = 428, cy = 226;
  g.globalAlpha = fade;
  for (let i = 5; i >= 1; i--) px(g, cx - 120 - i * 10, cy - 104 - i * 8, 240 + i * 20, 208 + i * 16, 'rgba(255,230,160,0.04)');
  px(g, cx - 150, cy + 124, 300, 3, 'rgba(255,230,160,0.18)');           // the bench it sits on
  g.drawImage(spr, Math.round(cx - dw / 2), Math.round(cy + 122 - dh), dw, dh);
  g.globalAlpha = 1;
  // the name gives nothing away until the number lands: "(stamped)" is the verdict
  const shown = landed ? dName(it) : dName(it).replace(/\s*\([^)]*\)\s*$/, '');
  const nl = fitLines(shown, 340, [20, 17, 15], 2, true);
  for (let i = 0; i < nl.lines.length; i++) T(cx, 50 + i * 22 + (nl.lines.length === 1 ? 12 : 0), nl.lines[i], PAL.white, nl.fs, 'center', true);
  if (landed) {
    if (!v.stung) { v.stung = true; play(good ? 'sting_verdict' : 'verdict_false'); shake(good ? 2 : 5, 0.35); }
    g.globalAlpha = Math.min(1, (v.t - VERDICT_LAND) / 0.5);
    T(cx, 378, fmt$(it.val), good ? ((tierOf(it.val) || {}).col || PAL.gold) : PAL.orange, 52, 'center', true);
    g.globalAlpha = 1;
  }
  // ---- the plate: what you knew, then what the look told you ----
  const px0 = 626, pw = 298, rows = verdictRows(it, landed), known = verdictRows(it, false).length;
  g.globalAlpha = fade;
  px(g, px0, 54, pw, 408, 'rgba(20,22,34,0.92)');
  px(g, px0, 54, pw, 3, good || !landed ? PAL.gold : PAL.orange);
  g.globalAlpha = 1;
  T(px0 + 14, 72, landed ? 'WHAT THE LOOK FOUND' : 'WHAT YOU WALKED IN WITH', PAL.gold, 13, 'left', true);
  const rh = Math.min(40, Math.floor(364 / Math.max(1, rows.length)));
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], y = 94 + i * rh;
    g.globalAlpha = i < known ? fade : Math.min(1, Math.max(0, (v.t - VERDICT_LAND - (i - known) * 0.12) / 0.4));
    T(px0 + 14, y, r[0], PAL.dgray, 12, 'left');
    const fl = fitLines(r[1], pw - 28, rows.length > 8 ? [15, 13, 12] : [16, 14, 12], 1, true);
    T(px0 + 14, y + 15, fl.lines[0], r[2] || PAL.white, fl.fs, 'left', true);
  }
  g.globalAlpha = 1;
  // ---- the reason, in their words ----
  if (v.t > VERDICT_NOTE) {
    g.globalAlpha = Math.min(1, (v.t - VERDICT_NOTE) / 0.5);
    const note = it.verdictNote || (v.res && v.res.text) || '';
    const q = fitLines(String(note), 560, [17, 15, 13], 2);
    for (let i = 0; i < q.lines.length; i++) T(cx - 96, 446 + i * 22, q.lines[i], good ? PAL.gray : PAL.orange, q.fs, 'center');
    g.globalAlpha = 1;
  }
  if (v.t > VERDICT_OUT) button(636, H - 70, 278, 40, 'TAKE IT BACK', () => endVerdict(), { col: PAL.dgreen, fs: 18 });
}
// ---- who is buying, and where the rows go (IDEAS_TODO 5: the buyers read better; built 2026-09-16) ----
// Two faults. The list was in a fixed order with Pete always on top, even on a night a specialist paid four
// times as much - the number you most want was the one you had to hunt for. And the rows were a fixed 38 px
// from a buyersY that moves (a set line or a want ad pushes it down), so on any night the appraiser was in
// town the fourth row ran under the UNPACK ALL / APPRAISE ALL buttons and the last face was cut in half.
// Now: whoever pays most sits directly under the price, the people with nothing to say tonight collapse to one
// line instead of a row each, and the rows are sized to the gap that is actually there, so they cannot overflow
// at any buyersY. Pure, so the regression can measure it without drawing a frame.
const BUYERS_BOTTOM = 414;                     // the bulk buttons start at 418: never draw past this
function buyerLayout(sel, present, buyersY, baseRowH) {
  const offers = (typeof offersFor === 'function') ? offersFor(sel) : [];
  const offerOf = (d) => offers.find((o) => o.b.id === d.id) || null;
  const keen = [], cold = [];
  for (const s of present) {
    if (s.def.appraiser) { keen.push(s); continue; }                       // she is an action, not an offer
    if (offerOf(s.def)) { keen.push(s); continue; }
    if (sel && sel.unverified && typeof verdictRoutes === 'function' && verdictRoutes(sel).buyers.includes(s.def)) { keen.push(s); continue; }
    cold.push(s);                                                          // no offer and nothing to ask
  }
  // best number first; the appraiser always last, because she is the fallback, not the sale
  keen.sort((a, b) => {
    if (a.def.appraiser !== b.def.appraiser) return a.def.appraiser ? 1 : -1;
    const pa = (offerOf(a.def) || {}).price || 0, pb = (offerOf(b.def) || {}).price || 0;
    return pb - pa;
  });
  let bestId = null, bestPrice = 0;
  for (const s of keen) { const o = offerOf(s.def); if (o && o.can && o.price > bestPrice) { bestPrice = o.price; bestId = s.def.id; } }
  const coldH = cold.length ? 16 : 0;
  const room = Math.max(0, BUYERS_BOTTOM - buyersY - coldH);
  const rowH = Math.max(24, Math.min(baseRowH, keen.length ? Math.floor(room / keen.length) : baseRowH));
  return { keen, cold, rowH, compact: rowH < 34, offerOf, bestId, bestPrice,
    coldY: buyersY + keen.length * rowH + 4,
    bottom: buyersY + keen.length * rowH + coldH };
}
// ---- the verbs on the thing itself (IDEAS_TODO 5: less mouse mileage; built 2026-09-16) ----
// The verbs used to live only on the far right: select a cell on the left, then travel 560 px to act on it.
// The same verbs now sit on the cell. Nothing here is new power - every row is a button that already exists
// in the detail panel, calling the same function - it is the same decision with the walk taken out.
const CELL_MENU_W = 176, CELL_MENU_ROW = 26;
// the one verb that says what is actually left to do to a thing. Shared with the detail panel below, so the
// cell and the panel can never drift apart and offer two different words for the same click.
function lookVerb(it) {
  if (it.loot && !it.locked) return 'OPEN';
  const isPile = !!MEDIA_KINDS[it.base];
  if (isPile && !it.mediaDone) return 'FLIP THROUGH';
  return (it.opened || (!it.container && !isPile && !it.locked)) ? 'LOOK IT OVER' : 'LOOK CLOSER';
}
function cellMenuRows(it) {
  const rows = [];
  if (!it || it.cash) return rows;                     // a stack of cash has nothing to decide
  if (G.homeTab === 'trophy') {
    rows.push({ t: 'ITS CARD ★', c: '#8a5a20', f: () => itemCardShow(it, 'sell') });
    rows.push({ t: 'RETURN TO HAUL', c: PAL.slate, f: () => returnTrophy(it) });
    return rows;
  }
  const keepsTab = G.homeTab === 'keeps';
  if (it.locked) rows.push(heldKeyFor(it)
    ? { t: 'TRY THE KEY', c: '#8a6420', f: () => crackSafe(it) }
    : { t: 'CRACK IT  ' + fmt$(it.crackCost || 60), c: PAL.blue, f: () => crackSafe(it) });
  else rows.push({ t: lookVerb(it), c: it.loot ? PAL.orange : (worthALook(it) ? PAL.dgreen : PAL.blue), f: () => openInspect(it) });
  // selling: the best offer actually on the table tonight - the same number the buyer rows would show
  if (!it.locked && !it.loot && it.searched && !it.unverified) {
    const here = [BUYERS[0].id].concat(((G.today && G.today.specialists) || []).map((s) => s.def.id));
    let best = null;
    for (const o of offersFor(it)) if (o.can && here.includes(o.b.id) && (!best || o.price > best.price)) best = o;
    if (best) rows.push({ t: 'SELL ' + String(buyerShort(best.b)).toUpperCase() + '  ' + fmt$(best.price), c: PAL.dgreen, f: () => sellItem(it, best) });
  }
  if (keepsTab) rows.push({ t: 'BACK TO HAUL', c: PAL.slate, f: () => returnTrophy(it) });
  else if (!it.locked && !it.loot) rows.push({ t: 'TO STASH ▸', c: PAL.dgreen, f: () => setAside(it) });
  if (!it.locked && !it.loot && it.searched) rows.push({ t: 'TROPHY ★', c: '#8a6420', f: () => keepTrophy(it) });
  return rows;
}
function openCellMenu(it, idx, x, y) {
  const rows = cellMenuRows(it);
  if (!rows.length) { G.cellMenu = null; return; }
  const h = rows.length * CELL_MENU_ROW + 8;
  G.cellMenu = { idx, rows, x: Math.max(4, Math.min(x, W - CELL_MENU_W - 6)), y: Math.max(4, Math.min(y, H - h - 6)) };
  play('ui_click', 0.4);
}
function drawCellMenu() {
  const m = G.cellMenu;
  if (!m) return;
  hot(0, 0, W, H, () => { G.cellMenu = null; }, { focusable: false });   // anywhere else puts it away
  const h = m.rows.length * CELL_MENU_ROW + 8;
  px(g, m.x - 2, m.y - 2, CELL_MENU_W + 4, h + 4, PAL.ink);
  px(g, m.x, m.y, CELL_MENU_W, h, '#241f36');
  for (let i = 0; i < m.rows.length; i++) {
    const r = m.rows[i], ry = m.y + 4 + i * CELL_MENU_ROW;
    button(m.x + 4, ry, CELL_MENU_W - 8, CELL_MENU_ROW - 3, r.t, () => { G.cellMenu = null; r.f(); }, { col: r.c, fs: 12 });
  }
}
function drawSell() {
  if (!drawBG()) px(g, 0, 0, W, H, '#151220');
  // evening in the garage: one lamp's worth of warmth over everything
  g.save(); g.globalCompositeOperation = 'screen'; px(g, 0, 0, W, H, 'rgba(255,150,60,0.09)'); g.restore();
  drawHeader('HOME');
  for (const s of G.today.specialists) codexNoteMet(s.def.id);
  if (G.today.appraiser) codexNoteMet('appraiser');
  // a card the paperwork earned waits for the modal and the closer look to clear, then lands
  if (G.cardQueued && !G.modal && !G.homeInspect) { const q = G.cardQueued; G.cardQueued = null; itemCardStart(q.it, q.res, 'sell', false); }
  // the hired hand's night's work, once the garage is actually on screen
  if (G.pendingUnpack && !G.modal && !G.homeInspect) { G.pendingUnpack = false; unpackAll(true); }
  if (G.stash.some((t) => t.hold)) letGoOldHolds();
  // what you held for a buyer who is in town tonight: the notice, once the garage is clear
  if (G.holdNotice && !G.modal && !G.homeInspect && !G.pendingUnpack) { G.modal = G.holdNotice; G.holdNotice = null; play('ui_click', 0.6); }
  // the first night, once the garage is clear: the word that the van has a limit from tomorrow
  if (G.bayNotice && !G.modal && !G.homeInspect && !G.pendingUnpack) { G.modal = G.bayNotice; G.bayNotice = null; play('ui_click', 0.6); }
  if (!(typeof vmTick === 'function' && vmTick())) phoneTick();   // the answering machine first (phone.js), then the phone on the wall

  // ---- inventory grid (STASH / THE SHED / MUSEUM tabs) ----
  const trophyTab = G.homeTab === 'trophy';
  const keepsTab = G.homeTab === 'keeps';
  const boardTab = G.homeTab === 'board';
  const list = trophyTab ? G.trophies : (keepsTab ? G.keeps : G.stash);
  panel(24, 46, 552, 458, boardTab ? '#241a12' : (trophyTab ? '#241d15' : (keepsTab ? '#15201f' : '#1d1a2a')));
  button(36, 54, 100, 28, 'HAUL (' + G.stash.length + ')', () => { G.homeTab = 'stash'; G.sellSel = -1; G.sellScroll = 0; }, { col: G.homeTab === 'stash' ? PAL.blue : PAL.slate, fs: 13 });   // the undecided
  button(144, 54, 100, 28, 'STASH (' + G.keeps.length + ')', () => { G.homeTab = 'keeps'; G.sellSel = -1; G.sellScroll = 0; }, { col: keepsTab ? PAL.dgreen : PAL.slate, fs: 13 });
  button(252, 54, 104, 28, 'MUSEUM (' + G.trophies.length + ')', () => { G.homeTab = 'trophy'; G.sellSel = -1; G.sellScroll = 0; }, { col: trophyTab ? '#8a6420' : PAL.slate, fs: 13 });
  {
    const live = livePapers().length, all = (G.world.papers || []).length;
    button(448, 54, 112, 28, 'BOARD (' + (live || all) + ')', () => { G.homeTab = 'board'; G.sellSel = -1; G.boardScroll = 0; },
      { col: boardTab ? '#8a6a44' : (live ? PAL.cyan : PAL.slate), fs: 13 });
  }
  if (!trophyTab && !boardTab) {
    const sm = SELL_SORTS.includes(G.sellSort) ? G.sellSort : 'new';   // an old save's HOLDING view falls back to NEW
    G.sellSort = sm;
    button(362, 54, 84, 28, sm.toUpperCase() + ' ▾', () => {
      G.sellSort = SELL_SORTS[(SELL_SORTS.indexOf(sm) + 1) % SELL_SORTS.length];
      G.sellSel = -1;
    }, { col: PAL.slate, fs: 11 });
  }
  if (boardTab) {
    const live = livePapers().filter((x) => x.kind === 'bill').length;
    T(560, 54, live ? live + (live === 1 ? ' sale coming' : ' sales coming') : 'nothing coming up', live ? PAL.cyan : PAL.dgray, 13, 'right');
    T(560, 72, 'worth nothing. worth taking.', PAL.dgray, 12, 'right');
  } else if (trophyTab) {
    T(456, 6, 'shelf value: ' + fmt$(trophyValue()), PAL.gold, 15, 'right');
    const shown = G.trophies[G.sellSel];
    const plaque = shown && (shown.legendary || shown.provResolved || shown.yardDeed);
    T(560, 72, plaque ? 'a brass plaque. your name, spelled right.' : 'not for sale', plaque ? PAL.gold : PAL.dgray, 12, 'right');
  } else if (keepsTab) {
    let kv = 0; for (const t of G.keeps) if (t.searched) kv += t.val;
    // the stash is soft-capped by rent: every bulk over 40 across haul + stash costs a fee tonight (storageRent)
    let bulk = 0; for (const t of G.stash.concat(G.keeps)) bulk += t.size;
    const owned = typeof yardOwned === 'function' && yardOwned();
    T(572, 507, 'set aside: ' + fmt$(kv) + '  ·  bulk ' + bulk + ' / 40', bulk > 40 && !owned ? PAL.orange : PAL.cyan, 13, 'right');
    T(572, 523, owned ? 'your yard. no rent.' : bulk > 40 ? 'over the line — rent tonight' : 'raccoon-proof', bulk > 40 && !owned ? PAL.orange : PAL.dgray, 12, 'right');
  } else {
    const unsearchedN = G.stash.filter((t) => !t.searched && !t.locked && !t.loot).length;
    const sealedN = G.stash.filter((t) => t.loot && !t.locked).length;
    const lockedN = G.stash.filter((t) => t.locked).length;
    const lookN = G.stash.filter(worthALook).length;
    // under the grid, beside THE LEDGER: it used to sit in the header and ran over the energy label (playtest 2026-09-15)
    T(572, 507, 'appraised: ' + fmt$(verifiedValue()) + (unverifiedValue() ? '  ·  ' + fmt$(unverifiedValue()) + ' unverified' : ''), PAL.yellow, 13, 'right');
    T(572, 523, (sealedN ? sealedN + ' sealed  ' : '') + (lockedN ? lockedN + ' locked  ' : '') + (unsearchedN ? unsearchedN + ' unappraised  ' : '') + (lookN ? lookN + ' worth a look  ' : '') + (heldCount() ? heldCount() + ' held in the stash' : ''), PAL.dgray, 12, 'right');
  }
  const view = trophyTab ? list : sortedView(list);

  const COLS = 8, ROWS = 6, CS = 67;
  const cellHot = (it, idx, cx, cy) => {
    hot(cx, cy, CS - 5, CS - 5, () => {
      // a second click on the same thing is picking it up
      const now = performance.now();
      const dbl = G.sellSel === idx && G._cellClickAt && now - G._cellClickAt < 400 && !it.cash;
      G.sellSel = idx; G._cellClickAt = now;
      if (dbl) openInspect(it);
    });
    // and the right button puts that thing's verbs under the cursor, where the eye already is
    rhot(cx, cy, CS - 5, CS - 5, (mx, my) => { G.sellSel = idx; openCellMenu(it, idx, mx, my); });
  };
  const totalRows = boardTab ? 0 : (trophyTab ? museumRows(list) : Math.ceil(list.length / COLS));
  if (boardTab) drawBoard(36, 92, 528, 388);
  else if (trophyTab) drawMuseum(list, COLS, CS, cellHot);
  else {
    G.sellScroll = clamp(G.sellScroll, 0, Math.max(0, totalRows - ROWS));
    let sellTip = null;                    // the dot and the check explain themselves on hover
    for (let i = 0; i < COLS * ROWS; i++) {
      const idx = G.sellScroll * COLS + i;
      const cx = 36 + (i % COLS) * CS, cy = 92 + Math.floor(i / COLS) * CS;
      if (idx >= view.length) {
        px(g, cx, cy, CS - 5, CS - 5, '#221e30');
        continue;
      }
      const it = view[idx];
      const sel = G.sellSel === idx;
      const hov = inRect(mouse.x, mouse.y, cx, cy, CS - 5, CS - 5);
      px(g, cx, cy, CS - 5, CS - 5, sel ? PAL.yellow : PAL.ink);
      // the cell wears its tier: junk grey at a glance, the good stuff warm
      const tint = it.cat === 'junk' ? 'junk' : ((it.searched || it.cash) ? tierOf(shownVal(it)).name : null);   // a flagged fake still glows like a legend
      px(g, cx + 2, cy + 2, CS - 9, CS - 9, CELL_BG[tint] || '#2a2540');
      if (hov) px(g, cx + 2, cy + 2, CS - 9, CS - 9, 'rgba(255,255,255,0.07)');
      drawIcon(it, cx + 7, cy + 3, 48);
      if (it.locked) {                       // lock badge
        px(g, cx + CS - 22, cy + 4, 14, 12, PAL.ink);
        px(g, cx + CS - 20, cy + 6, 10, 8, PAL.cyan);
        px(g, cx + CS - 17, cy + 2, 4, 4, PAL.cyan);
      } else if (it.loot) {                  // sealed-container badge
        px(g, cx + CS - 22, cy + 4, 14, 12, PAL.ink);
        px(g, cx + CS - 20, cy + 6, 10, 8, PAL.orange);
        px(g, cx + CS - 16, cy + 8, 2, 4, PAL.ink);
      } else if (!it.searched) {
        T(cx + 6, cy + 2, '?', PAL.yellow, 16, 'left', true);
      }
      // the mark, bottom-left: a cyan dot = its rummage or false bottom will really find
      // something (worthALook); a green check = fully inspected, nothing left to do to it
      const look = worthALook(it), done = !look && fullyInspected(it);
      // junk that has not been gone through: Pete's truck will not take it, and the cell says so
      const unchecked = !look && !done && it.cat === 'junk' && !it.cash && !it.locked;
      if (unchecked) {
        px(g, cx + 3, cy + CS - 16, 9, 13, PAL.ink);
        px(g, cx + 6, cy + CS - 14, 3, 7, PAL.orange);
        px(g, cx + 6, cy + CS - 6, 3, 3, PAL.orange);
      }
      if (look) { px(g, cx + 4, cy + CS - 13, 8, 8, PAL.ink); px(g, cx + 6, cy + CS - 11, 4, 4, PAL.cyan); }
      else if (done) {
        px(g, cx + 3, cy + CS - 15, 11, 10, PAL.ink);
        px(g, cx + 5, cy + CS - 10, 2, 2, PAL.green); px(g, cx + 7, cy + CS - 8, 2, 2, PAL.green);
        px(g, cx + 9, cy + CS - 10, 2, 2, PAL.green); px(g, cx + 11, cy + CS - 12, 2, 2, PAL.green);
      }
      if (hov && (look || done)) sellTip = { cx: cx + (CS - 5) / 2, top: Math.floor(i / COLS) === 0 ? cy + CS + 32 : cy, c: look ? PAL.cyan : PAL.green,   // the top row's tip sits under the cell, off the tab buttons
        t: look ? 'worth a closer look — going through it (or its false bottom) will turn something up' : 'fully inspected — appraised, gone through, nothing left to open or find' };
      if (hov && unchecked) sellTip = { cx: cx + (CS - 5) / 2, top: Math.floor(i / COLS) === 0 ? cy + CS + 32 : cy, c: PAL.orange,
        t: 'not gone through yet. Pete will not take it until you have' };
      // held for a buyer (in the stash, cyan) or back for one who is in town tonight (in the haul, green): their initial, top-left
      const hbId = it.holdFor || (it.heldFor && buyerInTown(it.heldFor) ? it.heldFor : null);
      const hbDef = hbId ? BUYERS.find((x) => x.id === hbId) : null;
      if (hbDef && it.searched) {
        px(g, cx + 3, cy + 3, 14, 13, PAL.ink); px(g, cx + 4, cy + 4, 12, 11, it.holdFor ? PAL.cyan : PAL.green);
        T(cx + 10, cy + 3, buyerShort(hbDef)[0], PAL.ink, 11, 'center', true);
        if (hov && !sellTip) sellTip = { cx: cx + (CS - 5) / 2, top: Math.floor(i / COLS) === 0 ? cy + CS + 32 : cy, c: it.holdFor ? PAL.cyan : PAL.green,
          t: it.holdFor ? 'held for ' + hbDef.name + ' — back in the haul the evening they are in town' : hbDef.name + ' is in town tonight — you held this for them' };
      }
      if (it.searched) T(cx + (CS - 5) / 2, cy + CS - 21, fmt$(shownVal(it)), it.unverified ? PAL.orange : PAL.gray, 12, 'center');   // the claim, never the truth
      cellHot(it, idx, cx, cy);
    }
    if (sellTip) drawTooltip(sellTip.cx, sellTip.top, sellTip.t, sellTip.c);
  }
  // the appraiser, the first time a sealed box comes home: hands find what prices miss
  if (!trophyTab && !keepsTab && !G.world.saidLook && list.some((it) => it.loot && !it.locked)) {
    G.world.saidLook = true;
    toast('"Have a look yourself first. It\'s free."  — the appraiser, waving you off', PAL.cyan, 4.5);
  } else if (!trophyTab && !keepsTab && G.money < 150 && !G.dayStats.peteGenerous && list.length) {
    G.dayStats.peteGenerous = true;
    toast('Pete is feeling generous today. He is not. Fifty cents on the dollar, and pity.', PAL.gray, 4);
  }
  if (list.length === 0 && !boardTab) {
    T(300, trophyTab ? 200 : 240, trophyTab ? 'empty shelves. they are patient.'
      : (keepsTab ? 'the stash out back. set pieces live well here.' : 'nothing here yet — go win a locker!'), PAL.dgray, 18, 'center');
  }
  if (totalRows > (trophyTab ? MUSEUM_ROWS : ROWS)) T(560, 488, 'wheel to scroll', PAL.dgray, 13, 'right');
  if (boardTab) T(40, 486, 'paper sells for nothing. it is the only thing here that pays tomorrow.', '#c8a678', 13);
  else if (trophyTab) T(40, 486, 'the museum wing. every mogul has one.', PAL.gold, 13);
  else if (keepsTab) T(40, 486, shedMusing(), PAL.cyan, 13);
  else T(40, 486, 'in town: ' + G.today.specialists.map((s) => s.def.name + ' (' + fmt$(s.cash) + ')').join('  ·  ') + (G.today.appraiser ? '  ·  Mrs. Odell, appraising (' + appraiserLooksLeft() + ' looks left)' : ''), PAL.cyan, 13);

  // ---- detail panel ----
  const bx = 600, bw = 336;
  panel(bx, 46, bw, 364, '#231f36');
  const sel = G.sellSel >= 0 && G.sellSel < view.length ? view[G.sellSel] : null;
  if (!sel) {
    // the set in the corner, on its crate. Some nights it is already warming up.
    const on = drawHomeTv(bx + bw / 2 - 48, 96);
    T(bx + bw / 2, 210, on ? 'the set is warming up. something is on tonight.' : 'the set is off. nothing on tonight.', on ? PAL.cyan : PAL.dgray, 12, 'center');
    T(bx + bw / 2, 262, trophyTab ? 'select a trophy' : 'select an item', PAL.dgray, 17, 'center');
    T(bx + bw / 2, 288, trophyTab ? 'it is not for sale. nothing here is.' : 'empty it · search it · sell it', PAL.dgray, 13, 'center');
    T(bx + bw / 2, 306, 'double-click a thing to open it · right-click for its verbs', PAL.dgray, 11, 'center');
    // the whole van's worth of boxes, opened at once — the unpacking is the game's job, the looking is yours
    if (!trophyTab && !keepsTab && !boardTab) {
      const n = unpackTargets().length;
      button(bx + bw / 2 - 112, 322, 224, 30, n ? 'UNPACK EVERYTHING  (' + n + ')' : 'NOTHING TO UNPACK', () => unpackAll(false), { col: n ? PAL.orange : PAL.slate, fs: 13, disabled: !n });
      T(bx + bw / 2, 358, 'every unlocked box, emptied into the haul. media piles', PAL.dgray, 11, 'center');
      T(bx + bw / 2, 372, 'stay whole to flip through; locked things stay locked.', PAL.dgray, 11, 'center');
      if (hasTool('hiredHand')) T(bx + bw / 2, 390, 'the hired hand does this the night the van comes in.', PAL.lblue, 11, 'center');
    }
  } else {
    const spr = getSprite(sel.spr, sel.pal, sel.cond, sel.uid);
    const sc = Math.max(1, Math.min(3, Math.floor(92 / spr.height), Math.floor(200 / spr.width)));
    const dw = spr.width * sc, dh = spr.height * sc;
    px(g, bx + bw / 2 - 60, 50, 120, 100, '#1a1626');
    g.drawImage(spr, bx + (bw - dw) / 2, 50 + (100 - dh) / 2, dw, dh);
    if (!sel.cash) {
      // the portrait is the door: click it, or the big label right under it. A sealed,
      // unlocked thing says OPEN — LOOK CLOSER used to sit right next to OPEN IT UP
      // below, two buttons for one action — and goes back to saying LOOK CLOSER once
      // there is something to look closer AT.
      const stillSealed = sel.loot && !sel.locked;
      // the verb says what is actually left to do: OPEN a sealed box, FLIP THROUGH a pile,
      // LOOK IT OVER (the rummage, the false bottom, the writing) once the box is empty
      const verb = lookVerb(sel);
      hot(bx + bw / 2 - 60, 50, 120, 100, () => { play('ui_click', 0.5); openInspect(sel); });
      button(bx + bw / 2 - 84, 154, 168, 22, verb, () => openInspect(sel), { col: stillSealed ? PAL.orange : (worthALook(sel) ? PAL.dgreen : PAL.blue), fs: 13 });
    }
    if (sel.restoring) { T(bx + 16, 58, 'out for', PAL.cyan, 11); T(bx + 16, 71, 'restoration', PAL.cyan, 11); }
    // by measure: counting 26 characters cut "...Shoebox of Woodgrain-Console Cartridges" to two lines
    // and quietly dropped the word that said what was in the box
    const nameFit = fitLines(dName(sel), bw - 16, [16, 15, 14, 13], 2, true);
    for (let i = 0; i < nameFit.lines.length; i++) T(bx + bw / 2, 182 + i * 19, nameFit.lines[i], PAL.white, nameFit.fs, 'center', true);
    T(bx + bw / 2, 220, CATS[sel.cat].label + '  ·  bulk ' + sel.size + '  ·  ' + (sel.cond || '?'), PAL.gray, 13, 'center');
    // a fake wears the legend's face here too: same badge, same gold, until it is verified
    const facesLegend = sel.legendary || (sel.fake && !(sel.searched && !sel.unverified));
    const leg = facesLegend ? 'ONE OF A KIND  ·  ' : '';
    if (sel.locked) T(bx + bw / 2, 237, 'LOCKED — locksmith wants ' + fmt$(sel.crackCost || 60), PAL.cyan, 14, 'center');
    else if (sel.loot) T(bx + bw / 2, 237, leg + 'sealed — something may be inside', PAL.orange, 14, 'center');
    else if (sel.searched) T(bx + bw / 2, 234, leg + fmt$(shownVal(sel)), sel.unverified ? PAL.orange : (sel.legendary || sel.setComplete ? PAL.gold : PAL.yellow), 20, 'center', true);
    else { const [lo, hi] = estRange(sel); T(bx + bw / 2, 237, leg + 'looks like ' + fmt$(lo) + ' – ' + fmt$(hi), facesLegend ? PAL.gold : PAL.gray, 14, 'center'); }

    // the appraiser's verdict on a set piece: what it belongs to, what's missing
    let buyersY = 290, actionY = 258, buyersRowH = 38;
    let setLine2 = null, canAssemble = false, assembleBrand = null;
    // a flagged pedigree piece keeps its set to itself until it is verified — nothing leaks through the set line
    const setDef = sel.set && sel.searched && !sel.unverified && !sel.setComplete ? SETS[sel.set.id] : null;
    if (sel.unverified && !trophyTab) {
      // the flag: the number above is a claim, and these lines say who can answer it (docs/APPRAISAL.md §4).
      // No keep row here — the buyers need the room, and the closer look still has TO STASH.
      const rl = wrapText('UNVERIFIED — ' + routeLine(sel), 38).slice(0, 2);
      for (let i = 0; i < rl.length; i++) T(bx + 16 + 118, 252 + i * 14, rl[i], PAL.orange, 12, 'center');
      // waiting for a verdict is the commonest reason to park a thing: in the stash, where it stays in sight
      if (!keepsTab) button(bx + bw - 88, 250, 76, 26, 'TO STASH ▸', () => setAside(sel), { col: PAL.slate, fs: 11 });
      buyersY = 284; buyersRowH = 30;
    }
    if (setDef) {
      assembleBrand = setDef.brandLocked.includes(sel.set.role) ? sel.set.brand : (bestHeldBrand(sel.set.id) || sel.set.brand);
      const res = setPieceCounts([G.stash, G.keeps, G.trophies], sel.set.id, assembleBrand);
      canAssemble = setIsComplete(setDef, res.counts);
      setLine2 = canAssemble ? 'every piece is here.' : 'incomplete — missing: ' + setMissingText(setDef, res.counts);
      T(bx + bw / 2, 252, setDef.name + '  ·  ' + assembleBrand, canAssemble ? PAL.green : PAL.orange, 12, 'center', true);
      T(bx + bw / 2, 265, setLine2.length > 52 ? setLine2.slice(0, 51) + '…' : setLine2, canAssemble ? PAL.green : PAL.orange, 12, 'center');
      actionY = 280; buyersY = 312; buyersRowH = 32;
    } else if (sel.setComplete) {
      T(bx + bw / 2, 252, 'an assembled set — collectors will travel', PAL.gold, 12, 'center');
      actionY = 268; buyersY = 300; buyersRowH = 34;
    } else if (!trophyTab && commissionFor(sel)) {
      // somebody put this exact thing in the paper
      const wc = commissionFor(sel), wb = BUYERS.find((b) => b.id === wc.buyer);
      T(bx + 16, 254, (wc.phone ? 'YOUR ORDER for ' : 'WANTED by ') + (wb ? wb.name : 'a dealer') + ' · until day ' + wc.until, PAL.gold, 12, 'left', true);
      button(bx + bw - 124, 248, 112, 22, 'DELIVER ' + fmt$(commissionPrice(sel, wc)), () => deliverCommission(sel, wc), { col: '#8a6420', fs: 12 });
      actionY = 274; buyersY = 306; buyersRowH = 33;
    }

    // primary action (a flagged thing has no row here — see above)
    if (sel.unverified && !trophyTab) { /* the route lines took the room */ } else if (trophyTab) {
      button(bx + 58, actionY, 220, 28, 'RETURN TO HAUL', () => returnTrophy(sel), { col: PAL.slate, fs: 15 });
      // the card it earned (or would have): provenance, on demand — the museum's version of the ledger
      button(bx + 58, actionY + 34, 220, 26, 'ITS CARD ★', () => itemCardShow(sel, 'sell'), { col: '#8a5a20', fs: 13 });
      T(bx + bw / 2, actionY + 72, 'on display. it makes the room.', PAL.gold, 13, 'center');
    } else if (sel.locked && heldKeyFor(sel)) button(bx + 58, actionY, 220, 28, 'TRY THE KEY', () => crackSafe(sel), { col: '#8a6420', fs: 15 });
    else if (sel.locked) button(bx + 58, actionY, 220, 28, 'CRACK IT   ' + fmt$(sel.crackCost || 60), () => crackSafe(sel), { col: PAL.blue, fs: 15 });
    else if (sel.loot) { /* OPEN, up by the portrait, is the only button this needs */ }
    else if (!sel.searched) {
      // the appraisal happens in the closer look, or in one sweep — not here
      if (keepsTab) button(bx + 58, actionY, 220, 28, 'OUT TO THE HAUL ▸', () => returnTrophy(sel), { col: PAL.slate, fs: 14 });
    } else if (canAssemble) {
      button(bx + 38, actionY, 260, 28, 'COMPLETE THE SET ★', () => assembleSet(sel.set.id, assembleBrand), { col: '#8a6420', fs: 15 });
    } else if (keepsTab) {
      button(bx + 58, actionY, 220, 28, 'BACK TO HAUL', () => returnTrophy(sel), { col: PAL.slate, fs: 15 });
      const hf = sel.holdFor ? BUYERS.find((x) => x.id === sel.holdFor) : null;
      if (hf) { T(bx + bw / 2, actionY + 33, 'held for ' + hf.name + ' — back when they are in town', PAL.cyan, 11, 'center'); buyersY += 16; }
    } else {
      // ways to decide: keep it, hold it for the buyer who pays best (when they are not in town), show it off.
      // Selling is the buyers below.
      const hb = holdForBuyer(sel);
      if (hb) {
        button(bx + 12, actionY, 96, 28, 'TO STASH ▸', () => setAside(sel), { col: PAL.dgreen, fs: 12 });
        button(bx + 114, actionY, 120, 28, 'HOLD FOR ' + buyerShort(hb).toUpperCase(), () => holdItem(sel, hb), { col: PAL.navy, fs: 11 });
        button(bx + 240, actionY, 84, 28, 'TROPHY ★', () => keepTrophy(sel), { col: '#8a6420', fs: 12 });
      } else {
        button(bx + 12, actionY, 150, 28, 'TO STASH ▸', () => setAside(sel), { col: PAL.dgreen, fs: 13 });
        button(bx + 174, actionY, 150, 28, 'TROPHY ★', () => keepTrophy(sel), { col: '#8a6420', fs: 13 });
      }
      if (sel.heldFor && buyerInTown(sel.heldFor)) {
        const bb = BUYERS.find((x) => x.id === sel.heldFor);
        T(bx + bw / 2, actionY + 33, 'you held this for ' + bb.name + ': buying tonight', PAL.green, 11, 'center'); buyersY += 16;
      }
    }

    // buyers — only once the appraiser has put a number on it
    if (!trophyTab && !sel.locked && !sel.loot && !sel.searched) {
      T(bx + bw / 2, 296, 'appraise it before you keep it or sell it —', PAL.dgray, 13, 'center');
      T(bx + bw / 2, 312, 'in the closer look, or APPRAISE ALL below', PAL.dgray, 13, 'center');
    } else if (!trophyTab && !sel.locked && !sel.loot) {
      const present = [{ def: BUYERS[0], cash: Infinity }, ...G.today.specialists];
      if (G.today.appraiser) present.push({ def: APPRAISER, cash: 0 });        // her folding table, at the end of the row
      const lay = buyerLayout(sel, present, buyersY, buyersRowH);
      const rowH = lay.rowH, compact = lay.compact;
      for (let i = 0; i < lay.keen.length; i++) {
        const s = lay.keen[i];
        const y = buyersY + i * rowH;
        px(g, bx + 10, y, bw - 20, rowH - 4, '#1c1830');
        drawPortrait(s.def.id, bx + 16, y + 3, rowH - 10, rowH - 10);
        T(bx + 56, y + (compact ? 6 : 4), s.def.name, PAL.white, compact ? 13 : 14, 'left', true);
        if (s.def.appraiser) {
          // the appraiser: a fee, three looks, anything — and she buys nothing
          const left = appraiserLooksLeft();
          if (!compact) T(bx + 56, y + 20, fmt$(APPRAISER.fee) + ' a look  ·  ' + left + ' left today', PAL.dgray, 11);
          if (sel.unverified) button(bx + bw - 130, y + 4, 116, rowH - 10, 'VERDICT ' + fmt$(APPRAISER.fee), () => appraiserVerdict(sel), { disabled: left <= 0 || G.money < APPRAISER.fee, col: '#8a5a20', fs: 13 });
          else T(bx + bw - 20, y + (compact ? 7 : 10), sel.searched ? 'nothing to add' : 'appraise it first', PAL.dgray, 12, 'right');
          continue;
        }
        if (!compact) T(bx + 56, y + 20, s.cash === Infinity ? 'always buying' : fmt$(s.cash) + ' left', PAL.dgray, 11);
        const offer = lay.offerOf(s.def);
        if (sel.unverified && verdictRoutes(sel).buyers.includes(s.def)) {
          // in their trade: they will say what it is, for nothing, and then make their offer
          button(bx + bw - 130, y + 4, 116, rowH - 10, 'ASK ' + (s.def.name.split(' ')[1] || s.def.name).toUpperCase(), () => buyerVerdict(sel, s.def), { col: PAL.dgreen, fs: 13 });
        } else if (offer && sel.unverified && !s.def.cats) {
          // a flagged thing: Pete has two numbers for it, and says them out loud (peteTalk)
          button(bx + bw - 130, y + 4, 116, rowH - 10, 'PAWN ▸', () => peteTalk(sel), { col: PAL.dgreen, fs: 13 });
        } else if (offer) {
          // unappraised: Pete pays off the true value, price hidden so the button cannot leak it
          const lbl = (!sel.searched && !s.def.cats) ? 'PAWN ???' : 'SELL ' + fmt$(offer.price);
          // the best number in the room wears the brighter green: the eye should land on it first
          button(bx + bw - 130, y + 4, 116, rowH - 10, lbl, () => sellItem(sel, offer), { disabled: !offer.can, col: (lay.bestId === s.def.id ? PAL.green : PAL.dgreen), fs: 13 });
        }
      }
      // the ones with nothing to say tonight take one line between them, not a row each
      if (lay.cold.length) {
        const names = lay.cold.map((s) => buyerShort(s.def)).join(', ');
        T(bx + bw / 2, lay.coldY, (sel.unverified ? 'wants it verified: ' : 'not interested: ') + names, PAL.dgray, 11, 'center');
      }
    } else if (!trophyTab) {
      T(bx + bw / 2, 300, sel.locked ? 'crack it open before anything else' : 'empty it before selling', PAL.dgray, 13, 'center');
    }
  }

  // ---- bulk actions (they work the stash pile) ----
  const stashTab = G.homeTab === 'stash';
  const searchable = !stashTab ? 0 : G.stash.filter((t) => !t.searched && !t.locked && !t.loot).length;
  // UNPACK ALL sits on this row too, so a selected item or another tab never hides it (playtest 2026-09-15)
  const unpackN = unpackTargets().length;
  button(bx, 418, 164, 34, unpackN ? 'UNPACK ALL (' + unpackN + ')' : 'NOTHING TO UNPACK', () => { G.homeTab = 'stash'; G.sellSel = -1; unpackAll(false); }, { disabled: !unpackN, col: PAL.orange, fs: 13 });
  button(bx + 172, 418, 164, 34, 'APPRAISE ALL' + (searchable ? ' (' + searchable + ')' : ''), () => searchAll(), { disabled: !searchable, col: PAL.dgreen, fs: 13 });
  // junk only, and only junk with nothing left inside: an unsearched pile of
  // tapes can hide a keeper, so it stays out of Pete's truck until it is done
  // and only junk you have actually been through: an unexamined thing is not Pete's to take, and the
  // cell wears a ! until it is done (user, 2026-09-16). Junk you want kept goes TO STASH first.
  const junk = !stashTab ? [] : G.stash.filter((t) => t.cat === 'junk' && !t.locked && !t.loot && !(MEDIA_KINDS[t.base] && !t.mediaDone) && fullyInspected(t));
  const peteMult = G.money < 150 ? 0.5 : 0.45;             // the same rate offersFor gives Pete on a broke day
  const junkTotal = junk.reduce((a, t) => a + Math.max(1, Math.round(t.val * peteMult)), 0);
  // INSPECT 1 BY 1 (2026-09-19): every thing still wearing a ! in the closer look, one after another (home.js)
  const tourN = stashTab ? inspectTourList().length : 0;
  button(bx + 172, 458, 164, 28, tourN ? 'INSPECT 1 BY 1 (' + tourN + ')' : 'ALL INSPECTED', () => startInspectTour(),
    { disabled: !tourN, col: PAL.navy, fs: 13, hint: 'the closer look on everything not fully looked at yet, one at a time' });
  button(bx, 458, 164, 28, junk.length ? 'DUMP JUNK  +' + fmt$(junkTotal) : 'DUMP JUNK', () => {
    for (const t of junk) {
      const p = Math.max(1, Math.round(t.val * peteMult));
      gain(p); G.dayStats.soldCount++; G.dayStats.soldTotal += p;
      G.stash.splice(G.stash.indexOf(t), 1);
    }
    play('coin'); G.sellSel = -1;
  }, { disabled: !junk.length, col: PAL.slate, fs: 13, hint: 'Pete takes every piece of junk you have been through. Keepers pulled out of a pile are not junk and stay.' });
  button(bx, 492, 336, 40, 'END DAY  (SLEEP)', () => endDay(), { col: PAL.purple, fs: 18 });
  button(24, 508, 140, 28, 'THE LEDGER', () => openCodex(), { col: PAL.slate, fs: 13 });
  drawWallPhone(172, 508);
}
// ---- the phone on the garage wall (user, 2026-09-20: "we need a little spot for the phone... a little light
// blinking so that we can check them when we want") ----
// New messages still play themselves when you walk in; this is the rest of it: a light that says something is
// waiting, and a handset you can pick up whenever you like to hear the last few again (vmSaved / vmOpen).
function drawWallPhone(x, y) {
  const waiting = (G.vmQueue || []).length, tape = typeof vmSaved === 'function' ? vmSaved().length : 0;
  const on = waiting || tape;
  const w = 150, h = 28;
  const over = inRect(mouse.x, mouse.y, x, y, w, h);
  px(g, x, y, w, h, PAL.ink);
  px(g, x + 2, y + 2, w - 4, h - 4, on ? (over ? '#2f3a58' : '#242c44') : '#1c1e29');
  // the handset, drawn small
  px(g, x + 8, y + 9, 22, 6, on ? '#7c86b0' : '#3a3f58');
  px(g, x + 6, y + 6, 7, 9, on ? '#7c86b0' : '#3a3f58'); px(g, x + 25, y + 6, 7, 9, on ? '#7c86b0' : '#3a3f58');
  const blink = waiting && Math.floor(G.time * 2) % 2 === 0;
  px(g, x + w - 14, y + 10, 8, 8, waiting ? (blink ? PAL.red : '#5a2020') : (tape ? PAL.dgreen : '#23262f'));
  T(x + 38, y + 7, waiting ? waiting + ' NEW MESSAGE' + (waiting === 1 ? '' : 'S') : (tape ? 'MESSAGES' : 'NO MESSAGES'),
    waiting ? PAL.white : (tape ? PAL.gray : PAL.dgray), 12, 'left', !!waiting);
  buttonHot(x, y, w, h, waiting ? 'NEW MESSAGES' : 'MESSAGES', () => vmOpen(), { disabled: !on,
    hint: waiting ? 'the machine has something new on it' : (tape ? 'the last few messages, again' : 'nothing on the machine') }, over);
}

// ============ THE MUSEUM ============
// Shelves, in the order you kept things. A brass plaque under a legend, a
// resolved provenance, the deed. Completed sets on their own table. On the
// wall, a framed clipping for every time the paper wrote about you. It fills
// as the career does. Nothing to buy, nothing to manage.
const MUSEUM_ROWS = 4;                       // shelf and table rows on screen at once; the wall has the rest
function museumLayout(trophies) {
  const shelves = [], table = [];
  for (let i = 0; i < trophies.length; i++) (trophies[i].setComplete ? table : shelves).push(i);
  return { shelves, table };
}
function museumRowList(trophies, cols) {
  const m = museumLayout(trophies);
  const rows = [];
  const shelfRows = Math.max(3, Math.ceil(m.shelves.length / cols));
  for (let r = 0; r < shelfRows; r++) rows.push({ kind: 'shelf', idxs: m.shelves.slice(r * cols, r * cols + cols) });
  const tableRows = Math.max(1, Math.ceil(m.table.length / cols));
  for (let r = 0; r < tableRows; r++) rows.push({ kind: 'table', idxs: m.table.slice(r * cols, r * cols + cols) });
  return rows;
}
function museumRows(trophies) { return museumRowList(trophies, 8).length; }
function hasPlaque(it) { return !!(it.legendary || it.provResolved || it.yardDeed); }
function drawMuseum(list, COLS, CS, cellHot) {
  const rows = museumRowList(list, COLS);
  G.sellScroll = clamp(G.sellScroll, 0, Math.max(0, rows.length - MUSEUM_ROWS));
  const left = 32, span = COLS * CS + 3;
  let tip = null;
  for (let r = 0; r < MUSEUM_ROWS; r++) {
    const row = rows[G.sellScroll + r];
    if (!row) break;
    const cy = 92 + r * CS;
    if (row.kind === 'shelf') {
      px(g, left, cy + CS - 9, span, 5, '#5c4a2a'); px(g, left, cy + CS - 9, span, 1, '#8a7040');
      px(g, left, cy + CS - 4, span, 3, 'rgba(0,0,0,0.35)');
    } else {
      // the set table: a long low thing with a cloth on it
      px(g, left + 6, cy + CS - 14, span - 12, 10, '#5a2a2a'); px(g, left + 6, cy + CS - 14, span - 12, 2, '#8a4a44');
      px(g, left + 14, cy + CS - 4, 6, 5, '#3b2d1e'); px(g, left + span - 20, cy + CS - 4, 6, 5, '#3b2d1e');
      if (!row.idxs.length) T(left + span / 2, cy + 22, 'the set table. every piece, or nothing.', '#8a7a68', 12, 'center');
    }
    for (let c = 0; c < COLS; c++) {
      const idx = row.idxs[c];
      if (idx === undefined) continue;
      const it = list[idx];
      const cx = 36 + c * CS;
      const sel = G.sellSel === idx;
      const hov = inRect(mouse.x, mouse.y, cx, cy, CS - 5, CS - 5);
      if (sel || hov) { px(g, cx, cy, CS - 5, CS - 9, sel ? 'rgba(255,214,102,0.22)' : 'rgba(255,255,255,0.07)'); if (sel) px(g, cx, cy + CS - 11, CS - 5, 2, PAL.yellow); }
      drawIcon(it, cx + 7, cy + 1, 48);
      if (hasPlaque(it)) {                   // brass, two engraved lines, no reading it from here
        px(g, cx + 15, cy + CS - 20, 32, 10, PAL.ink);
        px(g, cx + 16, cy + CS - 19, 30, 8, '#c9a24a');
        px(g, cx + 19, cy + CS - 17, 24, 1, '#5a4416'); px(g, cx + 21, cy + CS - 14, 20, 1, '#5a4416');
      }
      cellHot(it, idx, cx, cy);
    }
  }
  // the wall
  const clips = G.world.clippings || [];
  const wy = 366;
  px(g, left, wy - 6, span, 1, '#4b3d2a');
  T(36, wy, clips.length ? 'THE WALL' : 'THE WALL  ·  bare. the paper has not written about you yet.', clips.length ? '#c9a24a' : '#5a4a3a', 12, 'left', true);
  const FW = 58, FH = 36, PITCH = 67, MAXW = 16;
  const shown = clips.slice(-MAXW);
  for (let i = 0; i < shown.length; i++) {
    const c = shown[i];
    const fx = 40 + (i % 8) * PITCH, fy = wy + 20 + Math.floor(i / 8) * (FH + 14);
    px(g, fx - 4, fy - 4, FW + 8, FH + 8, '#2a2417'); px(g, fx - 2, fy - 2, FW + 4, FH + 4, '#d6c9a8');
    const imgs = _npImg[c.img];
    if (imgs && imgs.length) drawPhotoFill(imgs[0], fx, fy, FW, FH);
    else {
      px(g, fx, fy, FW, FH, '#e6dcc2');
      px(g, fx + 4, fy + 4, FW - 8, 3, '#2a2417');
      for (let ln = 0; ln < 4; ln++) px(g, fx + 4, fy + 11 + ln * 6, FW - 8 - (ln % 2) * 10, 2, '#9a8c6a');
    }
    px(g, fx, fy, FW, FH, 'rgba(120,90,40,0.18)');   // sun on the glass
    if (inRect(mouse.x, mouse.y, fx - 4, fy - 4, FW + 8, FH + 8)) tip = { cx: fx + FW / 2, top: fy + FH + 6, t: c.headline + '  ·  day ' + c.day + ', ' + ((TOWNS[c.town] || {}).name || 'the paper'), c: PAL.paper };
  }
  if (clips.length > MAXW) T(left + span, wy, '+' + (clips.length - MAXW) + ' older, under these', '#5a4a3a', 12, 'right');
  if (tip) drawTooltip(tip.cx, tip.top, tip.t, tip.c);
}

// ============ SUMMARY ============
const MOGULS = [
  ['Spite Sal', 3200], ['Yiip Dutch', 5500], ['Gearhead Gina', 8000], ['Eagle Ed', 15000],
  ['Antique Alice', 32000], ['Big Bart', 75000], ['The Landlord', 250000],
];
const TIER_ORDER = ['junk', 'common', 'good', 'rare', 'epic', 'LEGENDARY'];
function endDay() {
  play('day_end');
  const st = G.dayStats;
  const tiers = {};
  for (const t of TIER_ORDER) tiers[t] = 0;
  let best = null;
  for (const a of st.acquired) {
    tiers[tierOf(a.val).name]++;
    if (!best || a.val > best.val) best = a;
  }
  G.summary = {
    earned: G.dayEarned, spent: G.daySpent,
    tiers, best,
    collectibles: st.acquired.filter((a) => a.cat === 'collectibles').length,
    sunUsed: Math.round(100 - G.daylight),
    doors: doorLog().filter((d) => d.day === G.day).map((d) => Object.assign({}, d)),
    doorCount: Math.min(10, doorLog().length), margin: doorMargin(), yardName: yardName(), sniper: sniperNow(),
    st,
    episode: daySummary(),                 // the day, told back: a headline and two or three lines
  };
  noteAchievements();
  if (!tvTryAir('summary')) G.mode = 'summary';
  saveGame();
}
// anything newly worth writing down gets one line, once
function noteAchievements() {
  const fresh = checkAchievements();
  if (fresh.length) toast('"' + fresh[0].name + '." That goes in the books.' + (fresh.length > 1 ? ' So does one more.' : ''), PAL.gold, 4);
}
function drawSummary() {
  if (!drawBG()) px(g, 0, 0, W, H, '#101219');
  const S1 = G.summary, st = S1.st;
  const ep = S1.episode || { headline: 'DAY ' + G.day + ' COMPLETE', lines: [] };
  stripT(W / 2, 16, ep.headline, PAL.yellow, ep.headline.length > 30 ? 26 : 32, 'center', true);

  // ---- the number that matters, before anything else ----
  const net = S1.earned - S1.spent;
  const netCol = net > 0 ? PAL.green : (net < 0 ? PAL.red : PAL.gray);
  stripT(W / 2, 56, 'TODAY:  ' + (net >= 0 ? '+' : '−') + fmt$(Math.abs(net)) + '   (in +' + fmt$(S1.earned) + '  ·  out −' + fmt$(S1.spent) + ')', netCol, 24, 'center', true);

  // ---- today's money (bright: this day). the career totals ride underneath, dimmed ----
  panel(24, 96, 288, 330, '#1a1d2b', '#5a6488');
  T(40, 104, "TODAY'S MONEY", PAL.yellow, 17, 'left', true);
  const L = 40, R1 = 292;
  let ly = 130;
  function row(label, val, col) { T(L, ly, label, PAL.gray, 15); T(R1, ly - 1, val, col || PAL.white, 16, 'right'); ly += 23; }
  row('lockers won', st.lockersWon + (st.lockersWon ? '  (−' + fmt$(st.paidForLockers) + ')' : ''), st.lockersWon ? PAL.orange : PAL.dgray);
  // each door's line: paid, what came home worth, and Buzz's one word for it
  for (const d of (S1.doors || []).slice(0, 3)) {
    T(L + 12, ly - 4, d.unit + ':  ' + fmt$(d.paid) + ' → ' + fmt$(d.worth), PAL.dgray, 12);
    T(R1, ly - 4, DOOR_WORDS[d.verdict], DOOR_WORD_COL[d.verdict], 12, 'right', true);
    ly += 16;
  }
  row('items sold', st.soldCount + '  (+' + fmt$(st.soldTotal) + ')', st.soldCount ? PAL.green : PAL.dgray);
  row('cash found', '+' + fmt$(st.cashFound), st.cashFound ? PAL.yellow : PAL.dgray);
  row('scrap money', st.scrappedCount + ' items', PAL.gray);
  if (st.dumpFee) row('haul-off', '−' + fmt$(st.dumpFee), PAL.red);
  row('energy used', S1.sunUsed + '%', PAL.orange);
  px(g, L, ly, 252, 2, PAL.slate); ly += 8;
  T(L, ly, 'NET TODAY', PAL.white, 17, 'left', true);
  T(R1, ly - 3, (net >= 0 ? '+' : '−') + fmt$(Math.abs(net)), netCol, 22, 'right', true); ly += 34;
  // the career, quieter
  px(g, 32, ly - 4, 272, 92, '#161826');
  T(L, ly + 2, 'CASH', PAL.dgray, 13); T(R1 - 8, ly + 1, fmt$(G.money), PAL.yellow, 15, 'right'); ly += 20;
  T(L, ly + 2, 'HAUL (APPRAISED)', PAL.dgray, 13); T(R1 - 8, ly + 1, fmt$(verifiedValue()), PAL.gray, 15, 'right'); ly += 20;
  T(L, ly + 2, 'NET WORTH', PAL.gray, 14, 'left', true); T(R1 - 8, ly - 1, fmt$(netWorth()), PAL.cyan, 20, 'right', true);

  // ---- today's haul, as the things themselves ----
  panel(328, 96, 304, 330, '#1a1d2b', '#5a6488');
  T(344, 104, "TODAY'S HAUL — " + st.acquired.length + ' ITEMS', PAL.yellow, 17, 'left', true);
  const tierCols = { junk: PAL.dgray, common: PAL.white, good: PAL.green, rare: PAL.lblue, epic: PAL.pink, LEGENDARY: PAL.gold };
  const got = st.acquired.slice().sort((a, b) => b.val - a.val);
  const perRow = 6, cell = 44, maxShow = 18;
  for (let i = 0; i < Math.min(got.length, maxShow); i++) {
    const a2 = got[i];
    const cx2 = 344 + (i % perRow) * (cell + 2), cy2 = 128 + Math.floor(i / perRow) * (cell + 2);
    px(g, cx2, cy2, cell, cell, PAL.ink);
    px(g, cx2 + 1, cy2 + 1, cell - 2, cell - 2, CELL_BG[tierOf(a2.val).name] || '#2a2540');
    drawIcon(a2, cx2 + 6, cy2 + 2, cell - 12);
    px(g, cx2 + 1, cy2 + cell - 3, cell - 2, 2, tierCols[tierOf(a2.val).name]);
  }
  if (got.length > maxShow) T(616, 128 + 3 * (cell + 2) + 2, '+' + (got.length - maxShow) + ' more', PAL.dgray, 12, 'right');
  if (!got.length) T(480, 180, 'nothing came home today', PAL.dgray, 14, 'center');
  // one quiet line of tier counts, only what actually happened
  const tierBits = TIER_ORDER.filter((t) => S1.tiers[t] > 0).map((t) => S1.tiers[t] + ' ' + t);
  T(344, 272, tierBits.join('  ·  ') || '—', PAL.gray, 12);
  let ty = 292;
  if (st.searchFinds > 0) { T(344, ty, 'found tucked away: ' + st.searchFinds, PAL.cyan, 13); ty += 18; }
  if (st.leftBehindCount > 0) { T(344, ty, 'left behind: ' + st.leftBehindCount + ' (~' + fmt$(st.leftBehindValue) + ')', PAL.red, 13); ty += 18; }
  if (st.setLost > 0) { T(344, ty, 'matching pieces lost: ' + st.setLost, PAL.red, 13, 'left', true); ty += 18; }
  for (const r of (st.rulesToday || []).slice(0, 2)) { if (ty > 324) break; T(344, ty, r.length > 44 ? r.slice(0, 43) + '…' : r, PAL.lblue, 12); ty += 16; }   // the dig checked the room's reads
  if (S1.best) {
    px(g, 344, 340, 272, 2, PAL.slate);
    T(344, 348, 'BEST FIND', PAL.gray, 13);
    const spr = getSprite(S1.best.spr, S1.best.pal, S1.best.cond, S1.best.uid);
    const sc = Math.min(2, 52 / spr.height, 70 / spr.width);
    const dw = Math.max(1, Math.round(spr.width * sc)), dh = Math.max(1, Math.round(spr.height * sc));
    g.drawImage(spr, 350 + Math.round((70 - dw) / 2), 366 + Math.round((52 - dh) / 2), dw, dh);
    let by = 364;
    for (const line of wrapText(S1.best.name, 18).slice(0, 2)) { T(428, by, line, tierOf(S1.best.val).col, 15); by += 17; }
    T(428, by + 2, fmt$(S1.best.val), PAL.yellow, 18, 'left', true);
  }

  // ---- mogul ladder: the career, dimmed next to the day ----
  panel(648, 96, 288, 330, '#161826');
  T(664, 104, 'MOGUL LADDER', PAL.dgray, 15, 'left', true);
  const ladder = MOGULS.map((m) => ({ name: m[0], v: m[1], you: false }));
  ladder.push({ name: 'YOU', v: netWorth(), you: true });
  ladder.sort((a, b) => b.v - a.v);
  for (let i = 0; i < ladder.length; i++) {
    const Ld = ladder[i];
    T(664, 132 + i * 27, (i + 1) + '. ' + Ld.name, Ld.you ? PAL.yellow : '#6b7695', 16, 'left', Ld.you);
    T(920, 132 + i * 27, fmt$(Ld.v), Ld.you ? PAL.yellow : '#4a5570', 15, 'right');
  }
  T(664, 132 + ladder.length * 27 + 8, 'trophies on the shelf: ' + G.trophies.length, PAL.gold, 14);
  // the last ten doors, and what the yard has started calling you for them
  let my = 132 + ladder.length * 27 + 30;
  if (S1.doorCount) {
    const m = S1.margin || 0;
    T(664, my, 'last ' + S1.doorCount + ' door' + (S1.doorCount === 1 ? '' : 's') + ': ' + (m >= 0 ? '+' : '−') + fmt$(Math.abs(m)), m >= 0 ? PAL.green : PAL.red, 14);
    my += 20;
  }
  if (S1.yardName) { T(664, my, 'the yard calls you ' + (S1.yardName === 'whale' ? 'THE WHALE' : 'THE SHARK'), S1.yardName === 'whale' ? PAL.lred : PAL.cyan, 15, 'left', true); my += 18; }
  if (S1.sniper) T(664, my, 'the count calls you THE SNIPER', PAL.orange, 13, 'left', true);

  // ---- the day, told back ----
  panel(24, 432, 912, 58, '#1a1d2b');
  for (let i = 0; i < Math.min(3, ep.lines.length); i++) T(40, 438 + i * 16, ep.lines[i].t, ep.lines[i].c, 13);
  // the world you are in, for telling somebody
  T(24, 508, 'world  ' + seedLabel(), PAL.dgray, 13);
  button(24 + Math.ceil(g.measureText('world  ' + seedLabel()).width) + 16, 504, 58, 22, 'COPY', () => copySeed(), { col: PAL.slate, fs: 12 });
  button(W / 2 - 130, 496, 260, 40, 'NEXT DAY', () => advanceDay(), { col: PAL.dgreen, fs: 20 });
}

// ============ modal + toast + floats ============
// a centred line whose dollar figures stand out: words in the line's colour, money bold in its own
function moneyLineT(cx, y, text, col, size, align) {
  const left = align === 'left';                      // cx is then the left edge (the appraisal sheet)
  const parts = String(text).split(/(\$[\d,]+(?:\s?[–-]\s?\$[\d,]+)?)/);
  if (parts.length === 1) { T(cx, y, text, col, size, left ? 'left' : 'center'); return; }
  const mcol = (col === PAL.yellow || col === PAL.gold) ? PAL.white : PAL.yellow;
  const sz = textSize(size), widths = [];
  for (let i = 0; i < parts.length; i++) { g.font = (i % 2 ? 'bold ' : '') + sz + 'px ' + FONT; widths.push(g.measureText(parts[i]).width); }
  let x = left ? cx : cx - widths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) T(x, y, parts[i], i % 2 ? mcol : col, size, 'left', i % 2 === 1);
    x += widths[i];
  }
}
function drawModal() {
  const m = G.modal;
  px(g, 0, 0, W, H, 'rgba(8,8,14,0.75)');
  if (m.draw) { m.draw(); return; }   // a screen of its own (the leave check) that still closes like a modal
  // a line (an appraisal with a tell tacked on, say) can run well past the box at 18px —
  // wrap it, then cap the total so a long haul can't push the box off-screen
  // A clipping is set like a newspaper, not like a dialogue box: a big headline over small body copy, and
  // that copy ranged LEFT. Centring article-length text is what made it hard to read (user, 2026-09-16) —
  // every line starts in a different place, so the eye has to find the start of each one.
  const isPaper = !!m.paper;
  const titleFs = isPaper ? 30 : 24, titleStep = isPaper ? 33 : 28;
  const bodyFs = isPaper ? 15 : 18, bodyStep = isPaper ? 20 : 24;
  const bodyMax = isPaper ? 20 : 16;
  const mw = 620;
  let wrapped = [];
  // the body wraps by measure too, but set to the widest line the old character counts were already
  // producing across every string in the game (62 chars of newsprint = 537px, 44 chars of an appraisal
  // = 457px). So nothing reflows, and a line of unusually wide type is caught here instead of running
  // out through the side of the box.
  const bodyPx = isPaper ? 540 : 470;
  for (const l of m.lines) for (const t of wrapPx(l.text, bodyPx, bodyFs)) wrapped.push({ text: t, col: l.col });
  if (wrapped.length > bodyMax) { wrapped = wrapped.slice(0, bodyMax - 1); wrapped.push({ text: '...(more not shown)', col: PAL.dgray }); }
  // the title can be a full newspaper headline now (readStory) — set that to fit as well. The box grows
  // with it, and the longest story in the game still leaves better than 200px of screen to spare.
  const titleFit = fitLines(m.title, mw - 60, isPaper ? [titleFs, 28, 26, 24] : [titleFs, 22, 20], isPaper ? 4 : 3, true, isPaper ? LOGO_FONT : null);
  const titleLines = titleFit.lines;
  const titleH = titleLines.length * titleStep;
  const mh = 110 + (titleH - titleStep) + wrapped.length * bodyStep;
  const mx = (W - mw) / 2, my = (H - mh) / 2;
  if (m.paper) {
    // a clipping off the same page: newsprint, the page's own shadow and bevelled edge, ink for type
    px(g, mx + 8, my + 10, mw, mh, 'rgba(0,0,0,0.45)');
    px(g, mx - 2, my - 2, mw + 4, mh + 4, '#2a2417');
    px(g, mx, my, mw, mh, '#e6dcc2');
    px(g, mx, my, mw, 3, '#f4ecd8'); px(g, mx, my, 3, mh, '#f4ecd8');                 // the light edge, top and left
    px(g, mx, my + mh - 3, mw, 3, '#cfc3a4'); px(g, mx + mw - 3, my, 3, mh, '#cfc3a4'); // the shade, bottom and right
    for (let i = 0; i < titleLines.length; i++) T(mx + mw / 2, my + 14 + i * titleStep, titleLines[i], '#2a2417', titleFit.fs, 'center', true, LOGO_FONT);
    px(g, mx + 30, my + 14 + titleH + 2, mw - 60, 2, '#2a2417');
  } else {
    px(g, mx - 3, my - 3, mw + 6, mh + 6, PAL.yellow);
    panel(mx, my, mw, mh, '#242737');
    for (let i = 0; i < titleLines.length; i++) T(mx + mw / 2, my + 14 + i * titleStep, titleLines[i], PAL.yellow, titleFit.fs, 'center', true);
  }
  const bodyTop = my + 14 + titleH + (isPaper ? 14 : 10);
  for (let i = 0; i < wrapped.length; i++) {
    if (m.money) moneyLineT(mx + mw / 2, bodyTop + i * bodyStep, wrapped[i].text, wrapped[i].col, bodyFs);   // appraisals: the dollar figures in their own colour
    else if (isPaper) T(mx + 34, bodyTop + i * bodyStep, wrapped[i].text, wrapped[i].col, bodyFs, 'left');   // ranged left, like a column of print
    else T(mx + mw / 2, bodyTop + i * bodyStep, wrapped[i].text, wrapped[i].col, bodyFs, 'center');
  }
  if (m.buttons) {
    // a conversation with choices in it: the buttons share the bottom row (three of them
    // — Pete's two prices and a way out — have to narrow to fit the box)
    const gap = 16, bw = Math.min(220, Math.floor((mw - 40 - gap * (m.buttons.length - 1)) / m.buttons.length));
    const total = m.buttons.length * bw + (m.buttons.length - 1) * gap;
    let bx2 = mx + mw / 2 - total / 2;
    for (const b of m.buttons) {
      button(bx2, my + mh - 46, bw, 34, b.label, b.cb, { col: b.col || PAL.blue, fs: 16, disabled: !!b.disabled });
      bx2 += bw + gap;
    }
  } else if (m.paper) button(mx + mw / 2 - 110, my + mh - 46, 220, 34, m.ok || 'BACK TO THE PAPER', () => { G.modal = null; }, { col: PAL.dgreen, fs: 15 });
  else button(mx + mw / 2 - 70, my + mh - 46, 140, 34, m.ok || 'NICE', () => { G.modal = null; }, { col: PAL.blue, fs: 18 });
}
// ---- a message somebody says, instead of a banner nobody does ----
// The van's rules arrived as a bar across the top of the screen in nobody's voice. The user, 2026-09-21:
// "those pop up messages, about the van limit etc. Lets have those actually be a pop up clerk message. So
// when they speak, have the pop up show right side, and the info in a speach bubble near them."
// So a message can carry a speaker: the man himself slides in on the right, the words sit in a bubble
// beside him with a tail pointing at him. Same timing, same one-at-a-time rule, same click to dismiss.
const POP_SIZE = 148;
const POP_NAMES = { clerk: 'THE CLERK', raccoon: 'THE RACCOON' };
function popName(who) {
  if (POP_NAMES[who]) return POP_NAMES[who];
  const d = typeof rivalDef === 'function' ? rivalDef(who) : null;
  return String((d && d.name) || who).toUpperCase();
}
// the office, saying it to your face: the van, the room in it, and what the yard charges to clear a door
function clerkPop(text, col, ttl, slot) {
  toast(text, col, ttl, 'clerk');
  if (slot && typeof clerkSay === 'function') clerkSay(slot);
}
function drawSpeakerToast(t) {
  const ease = 1 - Math.pow(1 - clamp(t.age / 0.24, 0, 1), 3);
  // he comes in from the right, unless something is already open there (the pull card, which is where the
  // raccoon is standing when he speaks, and where "no room" is answering from) - then he comes in the other
  // side and the bubble turns round with him (2026-09-21)
  const onLeft = !!(G.inspect || G.itemCard);
  const slide = Math.round((1 - ease) * 70) * (onLeft ? -1 : 1);
  const fx = (onLeft ? 14 : W - 14 - POP_SIZE) + slide, fy = Math.round((H - POP_SIZE) / 2) - 30;
  // the words first, so the bubble is measured before anything is drawn
  const fit = fitLines(t.text, 430, [18, 17, 16, 15], 5, true);
  g.font = 'bold ' + textSize(fit.fs) + 'px ' + FONT;
  let tw = 0;
  for (const ln of fit.lines) tw = Math.max(tw, Math.ceil(g.measureText(ln).width));
  const lh = textSize(fit.fs) + 5, bw = Math.min(444, tw + 30), bh = 16 + fit.lines.length * lh;
  const bx = onLeft ? Math.min(W - 10 - bw, fx + POP_SIZE + 20) : Math.max(10, fx - 20 - bw), by = fy + 14;
  px(g, bx + 4, by + 5, bw, bh, 'rgba(0,0,0,0.45)');
  px(g, bx, by, bw, bh, '#e8dfc8');                       // the phone's paper colour: the game's voice-of-somebody
  px(g, bx, by, bw, 3, t.col);                            // the message's own colour, along the top
  g.fillStyle = '#e8dfc8';                                // the tail, pointing at him, whichever side he is on
  const tx = onLeft ? bx : bx + bw, td = onLeft ? -14 : 14;
  g.beginPath(); g.moveTo(tx, by + 24); g.lineTo(tx + td, by + 34); g.lineTo(tx, by + 44); g.closePath(); g.fill();
  for (let i = 0; i < fit.lines.length; i++) T(bx + 15, by + 9 + i * lh, fit.lines[i], '#2a2320', fit.fs, 'left', true);
  px(g, fx - 4, fy - 4, POP_SIZE + 8, POP_SIZE + 26, 'rgba(12,12,20,0.88)');
  px(g, fx, fy, POP_SIZE, POP_SIZE, PAL.ink);
  if (t.who === 'raccoon') {                              // he has no portrait and would not sit for one
    const spr = getSprite('liveRaccoon', null, 'Clean', 3);
    const sc = Math.floor(Math.min((POP_SIZE - 16) / spr.width, (POP_SIZE - 16) / spr.height));
    g.imageSmoothingEnabled = false;
    g.drawImage(spr, Math.round(fx + (POP_SIZE - spr.width * sc) / 2), Math.round(fy + (POP_SIZE - spr.height * sc) / 2),
      spr.width * sc, spr.height * sc);
  } else drawPortrait(t.who, fx + 2, fy + 2, POP_SIZE - 4, POP_SIZE - 4);
  T(fx + POP_SIZE / 2, fy + POP_SIZE + 4, popName(t.who), PAL.white, 12, 'center', true);
  const off = () => { if (G.toast) G.toast.ttl = Math.min(G.toast.ttl, 0.25); };
  hot(bx, by, bw, bh, off, { focusable: false, label: 'dismiss' });
  hot(fx, fy, POP_SIZE, POP_SIZE + 20, off, { focusable: false, label: 'dismiss' });
}
function drawToast(dt) {
  if (!G.toast) return;
  G.toast.ttl -= dt;
  G.toast.age = (G.toast.age || 0) + dt;
  if (G.toast.ttl <= 0) { G.toast = G.toast.back || null; return; }   // the message it interrupted, if any, comes back
  g.globalAlpha = clamp(G.toast.ttl, 0, 1);
  if (G.toast.who) { drawSpeakerToast(G.toast); g.globalAlpha = 1; return; }
  // Measured, not counted. The width was `text.length * 10` against a 19px PROPORTIONAL font on a 960 screen,
  // so anything past about ninety characters overflowed and was cut off at BOTH edges — the bay's
  // instructions on day one, the raccoon, and every tenant's story. It drops a size or takes a second line
  // instead now, and the panel is measured to whichever lines it ends up with (2026-09-17).
  // bigger (user, 2026-09-18): 22 down to 17, and three lines before it gives up a size
  // and no wider than 720: a forty-word line set across the whole screen is hard to read and covers more
  const fit = fitLines(G.toast.text, 720, [22, 20, 18, 17], 3, true);
  g.font = 'bold ' + textSize(fit.fs) + 'px ' + FONT;
  let tw = 0;
  for (const ln of fit.lines) tw = Math.max(tw, Math.ceil(g.measureText(ln).width));
  tw = Math.min(W - 8, tw + 40);
  const lh = textSize(fit.fs) + 4, th = 14 + fit.lines.length * lh;
  // It used to sit at y 2, on top of the menu bar (0..36) — over the day, the money and the energy you were
  // trying to read (user, 2026-09-18). It hangs just below the bar now, like a note clipped under it. The
  // closer look fills the screen from the top, so there it still goes along the bottom edge.
  const ty = G.homeInspect ? H - 2 - th : 42;
  const tx = (W - tw) / 2;
  px(g, tx + 4, ty + 5, tw, th, 'rgba(0,0,0,0.45)');           // a shadow, so it reads as lying over the screen
  panel(tx, ty, tw, th, '#242737');
  px(g, tx + 3, ty + 3, tw - 6, 2, G.toast.col);                 // a strip of its own colour along the top edge
  for (let i = 0; i < fit.lines.length; i++) T(W / 2, ty + 8 + i * lh, fit.lines[i], G.toast.col, fit.fs, 'center', true);
  // It stays up long enough to read now, which is also long enough to be in the way once you have:
  // click it and it goes. Drawn last, so it is the top thing under the mouse; never a focus stop.
  hot(tx, ty, tw, th, () => { if (G.toast) G.toast.ttl = Math.min(G.toast.ttl, 0.25); }, { focusable: false, label: 'dismiss' });
  g.globalAlpha = 1;
}
function drawFloats(dt) {
  for (const f of G.floats) {
    f.ttl -= dt; f.y -= 26 * dt;
    g.globalAlpha = clamp(f.ttl, 0, 1);
    T(f.x + 2, f.y + 2, f.text, PAL.ink, 20, 'left', true);
    T(f.x, f.y, f.text, f.col, 20, 'left', true);
    g.globalAlpha = 1;
  }
  G.floats = G.floats.filter((f) => f.ttl > 0);
}

// ============ THE GAZETTE ============
function npImageSlot(imgId, x, y, w, h) {
  px(g, x - 2, y - 2, w + 4, h + 4, '#2a2417');
  const list = _npImg[imgId];
  if (list && list.length) {
    drawPhotoFill(list[strHash(imgId + '_' + G.day) % list.length], x, y, w, h);
  } else {
    px(g, x, y, w, h, '#d6c9a8');
    g.fillStyle = '#b8a982';
    for (let yy = 4; yy < h - 4; yy += 6)
      for (let xx = (yy / 6) % 2 ? 7 : 4; xx < w - 4; xx += 6) g.fillRect(x + xx, y + yy, 2, 2);
    T(x + w / 2, y + h / 2 - 16, '[ PHOTO ]', '#6b5f45', 13, 'center', true);
    T(x + w / 2, y + h / 2 + 2, 'np_' + imgId + '.jpg', '#6b5f45', -10, 'center');   // a filename in a 120px slot: exact size
  }
}
// the printed column is a fixed size; the story is not. When the text runs
// past what the column can hold, "continued" opens the whole thing in a modal
// (drawModal already wraps and scrolls long text — see the LOOK CLOSER fix).
function readStory(headline, text) {
  G.modal = { title: headline, lines: [{ text, col: '#2a2417' }], paper: true, ok: 'BACK TO THE PAPER' };   // the rest of the column, on the same newsprint
}
function drawPaper() {
  bookReadPaper();                                  // what you read about them goes in the book, true or not
  px(g, 0, 0, W, H, '#0e0f16');
  const sx = 80, sy = 14, sw = 800, sh = 512;
  px(g, sx + 8, sy + 10, sw, sh, 'rgba(0,0,0,0.45)');
  px(g, sx, sy, sw, sh, '#e6dcc2');
  px(g, sx, sy, sw, 3, '#f4ecd8');
  px(g, sx, sy + sh - 3, sw, 3, '#cfc3a4');
  const INK = '#2a2417', SOFT = '#3d3626', FADE = '#6b5f45';
  const twn = curTown();
  T(W / 2, sy + 8, twn.paperName || 'THE GAZETTE', INK, twn.paperName && twn.paperName.length > 24 ? 42 : 46, 'center', true, LOGO_FONT);
  px(g, sx + 30, sy + 60, sw - 60, 3, INK);
  T(W / 2, sy + 68, 'Day ' + G.day + ' Edition   ·   25 cents   ·   ' + (twn.tagline || ''), FADE, 13, 'center');
  px(g, sx + 30, sy + 90, sw - 60, 2, INK);
  const p = G.paper;
  if (p) {
    // ---- lead story ----
    const lx = sx + 30, lw = 460;
    let yy = sy + 102;
    if (p.lead) {
      const leadHl = fitLines(p.lead.story.headline, lw, [23, 21, 19, 17], 2, true);
      for (const line of leadHl.lines) { T(lx, yy, line, INK, leadHl.fs, 'left', true); yy += 26; }
      yy += 4;
      const leadTop = yy;
      const leadLines = wrapText(p.lead.text, 64);
      const leadCut = leadLines.length > 5;
      for (const line of (leadCut ? leadLines.slice(0, 4) : leadLines.slice(0, 5))) { T(lx, yy, line, SOFT, 13); yy += 17; }
      if (leadCut) {
        T(lx, yy, 'continued — click to read the rest »', PAL.dred, 13, 'left', true);
        hot(lx - 4, leadTop - 4, lw, yy - leadTop + 18, () => readStory(p.lead.story.headline, p.lead.text), { label: 'read the rest of the story' });
        yy += 17;
      }
      yy += 6;
      npImageSlot(p.lead.story.img || p.lead.story.id, lx, yy, 240, 148);
      if (p.lead.unitKnown) {
        T(lx + 256, yy + 4, 'EDITOR\'S NOTE:', FADE, 11, 'left', true);
        for (let i = 0; i < 2; i++) T(lx + 256, yy + 20 + i * 15, ['the unit in question goes', 'under the hammer TODAY.'][i], SOFT, 12);
      }
      yy += 156;
    }
    // the bottom band (briefs and the button) starts here; nothing above may cross it
    const bandY = sy + sh - 64;
    // ---- third story strip under lead ----
    if (p.third) {
      px(g, lx, yy, lw, 1, '#a89a78'); yy += 7;
      const thHl = p.third.story.headline;
      T(lx, yy, fitLines(thHl, lw, [15], 1, true).lines[0], INK, 15, 'left', true); yy += 19;
      const thTop = yy;
      const thLines = wrapText(p.third.text, 68);
      const thCut = thLines.length > 2;
      for (const line of (thCut ? thLines.slice(0, 1) : thLines.slice(0, 2))) { if (yy + 15 > bandY - 4) break; T(lx, yy, line, SOFT, 12); yy += 15; }
      if (thCut && yy + 15 <= bandY - 4) { T(lx, yy, 'continued »', PAL.dred, 12, 'left', true); yy += 15; }
      if (thCut) hot(lx - 4, thTop - 4, lw, yy - thTop + 4, () => readStory(p.third.story.headline, p.third.text), { label: 'read the rest of the story' });
    }
    // ---- right column ----
    const rx = sx + 520, rw = 250;
    px(g, rx - 14, sy + 100, 1, bandY - sy - 110, '#a89a78');
    let ry = sy + 102;
    if (p.second) {
      T(rx, ry, p.second.story.kind === 'buyer_hint' ? 'TOMORROW' : (PAPER_KICKER[twn.id] || 'AROUND TOWN'), PAL.dred, 11, 'left', true); ry += 15;
      const secHl = fitLines(p.second.story.headline, rw, [16, 15, 14, 13], 3, true);
      const hl = secHl.lines;
      for (const line of hl) { T(rx, ry, line, INK, secHl.fs, 'left', true); ry += 19; }
      ry += 2;
      const secTop = ry;
      const secCap = hl.length > 2 ? 4 : 5;
      const secLines = wrapText(p.second.text, 40);
      const secCut = secLines.length > secCap;
      for (const line of (secCut ? secLines.slice(0, secCap - 1) : secLines.slice(0, secCap))) { T(rx, ry, line, SOFT, 12); ry += 15; }
      if (secCut) {
        T(rx, ry, 'continued »', PAL.dred, 12, 'left', true);
        hot(rx - 4, secTop - 4, rw, ry - secTop + 16, () => readStory(p.second.story.headline, p.second.text), { label: 'read the rest of the story' });
        ry += 15;
      }
      ry += 6;
      npImageSlot(p.second.story.img || p.second.story.id, rx, ry, 150, 84);
      ry += 96;
    }
    // ---- classifieds: the general store's tool ad rides on top, the van lot under it ----
    // the ads share what is left above the bottom band: two paid ads squeeze to fit, classifieds fill any room after
    const showToolAd = p.toolAd && !G.world.tools.includes(p.toolAd.tool);
    const showVanAd = p.vanAd && vanBaseCap() < p.vanAd.cap;
    const want = p.wantAd && openCommissions().some((c) => c.id === p.wantAd.id) ? p.wantAd : null;
    const paid = (showToolAd ? 1 : 0) + (showVanAd ? 1 : 0) + (want ? 1 : 0);
    const room = bandY - 6 - ry;
    const adH = paid ? Math.max(48, Math.min(74, Math.floor((room - 4 * paid) / paid))) : 0;
    const drawPaidAd = (copy, price, canBuy, cb) => {
      px(g, rx, ry, rw, adH, INK);
      px(g, rx + 2, ry + 2, rw - 4, adH - 4, '#e6dcc2');
      g.strokeStyle = INK; g.lineWidth = 1;
      g.strokeRect(rx + 5.5, ry + 5.5, rw - 11, adH - 11);
      const adLines = wrapText(copy, 36).slice(0, adH >= 70 ? 2 : 1);
      for (let i = 0; i < adLines.length; i++) T(rx + rw / 2, ry + 9 + i * 15, adLines[i], SOFT, 12, 'center');
      button(rx + rw / 2 - 56, ry + adH - 26, 112, 20, canBuy ? 'BUY  ' + fmt$(price) : 'NO CASH', cb, { col: PAL.dgreen, fs: 12, disabled: !canBuy });
      ry += adH + 4;
    };
    if (want) {
      // WANTED: a buyer's want ad — no button; you deliver it from the sell screen at home
      const wb = BUYERS.find((b) => b.id === want.buyer);
      px(g, rx, ry, rw, adH, INK);
      px(g, rx + 2, ry + 2, rw - 4, adH - 4, '#efe3bf');
      g.strokeStyle = PAL.dred; g.lineWidth = 1;
      g.strokeRect(rx + 5.5, ry + 5.5, rw - 11, adH - 11);
      // everything in here wraps and is kept inside the box: a long buyer name, or a long thing's name, used
      // to run straight out through the border of the ad (user, 2026-09-16)
      T(rx + rw / 2, ry + 8, 'WANTED: ' + (wb ? String(buyerShort(wb)).toUpperCase() : 'A DEALER'), PAL.dred, 12, 'center', true);
      // and vertically too: when three ads share the column the box is only 44 tall, which is the headline
      // and ONE line. Anything cut short says so rather than running out through the bottom border.
      // one line gets the short copy: "any condition" is filler, "double" is the entire point of the ad
      const wantMax = adH >= 58 ? 2 : 1;
      const wantAll = wrapText(wantMax > 1 ? aThing(want.name) + ', any condition. Double the usual.'
        : aThing(want.name) + '. Double.', 30);
      const wantCopy = wantAll.slice(0, wantMax);
      if (wantAll.length > wantMax && wantCopy.length) wantCopy[wantCopy.length - 1] = wantCopy[wantCopy.length - 1].replace(/[\s,]+$/, '') + '…';
      for (let i = 0; i < wantCopy.length; i++) T(rx + rw / 2, ry + 22 + i * 14, wantCopy[i], SOFT, 12, 'center');
      const have = allHeld().some((it) => it.base === want.base);
      const tailY = ry + 22 + wantCopy.length * 14 + 1;
      if (tailY + 12 <= ry + adH - 5) T(rx + rw / 2, tailY, 'Until day ' + want.until + '.' + (have ? ' You have one.' : ''), have ? PAL.dred : FADE, 11, 'center', have);
      ry += adH + 4;
    }
    if (showToolAd) {
      const td = TOOLS[p.toolAd.tool];
      const copy = (td.ad || (td.name + ' — {price}.')).replace('{price}', fmt$(p.toolAd.price));
      drawPaidAd(copy, p.toolAd.price, G.money >= p.toolAd.price, () => {
        if (G.money < p.toolAd.price) { play('denied'); return; }
        spend(p.toolAd.price);
        G.world.tools.push(p.toolAd.tool);
        play('coin');
        toast(td.name + ' — in the van. It goes where you go.', PAL.lblue, 3);
        saveGame();
      });
    }
    if (showVanAd) {
      drawPaidAd('DUSTY FLATS MOTORS — ' + (p.vanAd.name || 'panel van') + ', ' + p.vanAd.cap + ' bulk. Haul more junk per trip.', p.vanAd.price, G.money >= p.vanAd.price, () => {
        if (G.money < p.vanAd.price) { play('denied'); return; }
        spend(p.vanAd.price);
        G.vanCap = p.vanAd.cap - ((G.world.nut && G.world.nut.lostRow) || 0);   // a van in the shop stays in the shop
        play('van_load');
        toast('The new van coughs, then purrs. ' + p.vanAd.cap + ' bulk.', PAL.green, 3);
        saveGame();
      });
    }
    for (const ad of p.ads.slice(0, 2)) {
      if (ry + 58 > bandY - 6) break;                 // no room left above the briefs: the classifieds wait for tomorrow
      px(g, rx, ry, rw, 58, INK);
      px(g, rx + 2, ry + 2, rw - 4, 54, '#e6dcc2');
      g.strokeStyle = INK; g.lineWidth = 1;
      g.strokeRect(rx + 5.5, ry + 5.5, rw - 11, 47);
      const adLines = wrapText(ad.body, 36).slice(0, 3);
      for (let i = 0; i < adLines.length; i++)
        T(rx + rw / 2, ry + 29 - adLines.length * 7.5 + i * 15, adLines[i], SOFT, 12, 'center');
      ry += 66;
    }
  }
  // briefs: three lines across the foot of the page, in this paper's voice, one of them about yesterday
  if (p.briefs && p.briefs.length) {
    const bxx = sx + 258, byy = sy + sh - 64;
    px(g, sx + 30, byy - 6, sw - 60, 1, '#a89a78');
    T(bxx, byy - 2, 'BRIEFS', PAL.dred, 10, 'left', true);
    let by2 = byy + 12;
    for (const b of p.briefs.slice(0, 3)) { T(bxx, by2, wrapText(b, 82)[0], SOFT, 11); by2 += 14; }
  }
  button(sx + 20, sy + sh - 48, 220, 36, 'PUT THE PAPER DOWN', () => leavePaper(), { col: PAL.dgreen, fs: 15 });
}

// ============ THE MAP ============
// a hand-inked road map: the highway winds through nine towns. Click a dot.
const MAP_INK = '#2a2417';
function drawMap() {
  if (!drawBG()) px(g, 0, 0, W, H, '#16130d');
  drawHeader('THE MAP');
  const cur = curTown();
  if (!G.mapSel || !TOWNS[G.mapSel]) G.mapSel = cur.id;

  // -- the paper itself --
  const px0 = 26, py0 = 46, pw = 580, ph = 452;
  px(g, px0 + 6, py0 + 8, pw, ph, 'rgba(0,0,0,0.45)');
  px(g, px0, py0, pw, ph, '#d9c9a3');
  px(g, px0, py0, pw, 3, '#efe3c2');
  px(g, px0, py0 + ph - 3, pw, 3, '#b3a37d');
  px(g, px0, py0, 3, ph, '#e5d7b3');
  px(g, px0 + pw - 3, py0, 3, ph, '#b3a37d');
  px(g, px0 + ((pw / 3) | 0), py0 + 2, 1, ph - 4, 'rgba(90,74,43,0.16)');       // fold lines
  px(g, px0 + ((pw * 2 / 3) | 0), py0 + 2, 1, ph - 4, 'rgba(90,74,43,0.16)');
  px(g, px0 + 2, py0 + ((ph / 2) | 0), pw - 4, 1, 'rgba(90,74,43,0.12)');
  const Rm = RNG(4171);
  g.fillStyle = 'rgba(122,100,60,0.28)';
  for (let i = 0; i < 110; i++) g.fillRect(px0 + Rm.i(4, pw - 8), py0 + Rm.i(4, ph - 8), Rm.i(1, 2), 1);
  px(g, px0 + pw - 130, py0 + ph - 60, 90, 34, 'rgba(122,100,60,0.15)');        // coffee ring corner
  ring(g, px0 + pw - 85, py0 + ph - 43, 14, 'rgba(122,100,60,0.3)');

  // title block + compass
  T(px0 + 18, py0 + 10, 'THE HIGHWAY', MAP_INK, 30, 'left', true, LOGO_FONT);
  T(px0 + 20, py0 + 40, 'gas is money. money is gas.', 'rgba(90,74,43,0.8)', 12);
  ring(g, px0 + pw - 44, py0 + 40, 15, MAP_INK);
  pline(g, px0 + pw - 44, py0 + 30, px0 + pw - 44, py0 + 50, 1, MAP_INK);
  pline(g, px0 + pw - 54, py0 + 40, px0 + pw - 34, py0 + 50 - 10, 0, MAP_INK);
  px(g, px0 + pw - 56, py0 + 38, 24, 1, MAP_INK);
  T(px0 + pw - 47, py0 + 16, 'N', MAP_INK, 13, 'left', true);

  // ridge doodles up top, because every map has them
  for (let i = 0; i < 6; i++) {
    const hx = px0 + 70 + i * 26, hy = py0 + 88 + (i % 2) * 5;
    pline(g, hx, hy, hx + 10, hy - 9, 1, 'rgba(90,74,43,0.5)');
    pline(g, hx + 10, hy - 9, hx + 20, hy, 1, 'rgba(90,74,43,0.5)');
  }

  // -- the road, town to town --
  for (let i = 1; i < TOWN_ORDER.length; i++) {
    const a = TOWNS[TOWN_ORDER[i - 1]].map, b = TOWNS[TOWN_ORDER[i]].map;
    pline(g, a[0], a[1], b[0], b[1], 5, '#a5885a');
    pline(g, a[0] + 1, a[1] + 1, b[0] + 1, b[1] + 1, 3, '#6b4f2a');
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let d = 6; d < n; d += 14) {
      const t0 = d / n, t1 = Math.min(1, (d + 6) / n);
      pline(g, Math.round(a[0] + (b[0] - a[0]) * t0), Math.round(a[1] + (b[1] - a[1]) * t0),
        Math.round(a[0] + (b[0] - a[0]) * t1), Math.round(a[1] + (b[1] - a[1]) * t1), 1, '#e8dcc0');
    }
  }

  // -- towns --
  for (const id of TOWN_ORDER) {
    const t = TOWNS[id];
    const tx = t.map[0], ty = t.map[1];
    const isCur = id === cur.id, isSel = id === G.mapSel;
    if (isSel) { disc(g, tx, ty, 10, 'rgba(244,244,244,0.9)'); }
    disc(g, tx, ty, 7, MAP_INK);
    disc(g, tx, ty, 5, t.stub ? '#8a7a58' : (isCur ? PAL.green : PAL.orange));
    if (t.stub) { px(g, tx - 2, ty - 2, 5, 4, MAP_INK); px(g, tx - 1, ty - 4, 3, 2, MAP_INK); }
    if (isCur) {                                                   // your van, parked
      px(g, tx + 7, ty - 15, 14, 9, MAP_INK);
      px(g, tx + 8, ty - 14, 12, 7, PAL.cyan);
      px(g, tx + 8, ty - 14, 5, 3, '#bff5ff');
      disc(g, tx + 10, ty - 5, 2, MAP_INK); disc(g, tx + 17, ty - 5, 2, MAP_INK);
    }
    const name = t.name;
    const lw2 = name.length * 7 + 10;
    const lx2 = tx + (tx > 470 ? -lw2 - 12 : 11);
    px(g, lx2, ty - 7, lw2, 15, isSel ? 'rgba(255,248,224,0.95)' : 'rgba(233,220,187,0.8)');
    px(g, lx2, ty + 7, lw2, 1, 'rgba(42,36,23,0.35)');
    T(lx2 + 5, ty - 6, name, t.stub ? '#6b5f45' : MAP_INK, 12, 'left', !t.stub);
    hot(Math.min(tx - 14, lx2), ty - 16, lw2 + 28, 32, () => { G.mapSel = id; play('ui_click', 0.4); });
  }

  // -- the clerk's window: details for the selected town --
  const sel = TOWNS[G.mapSel];
  panel(616, 46, 320, 388, '#20222e');
  T(632, 56, sel.name.toUpperCase(), sel.stub ? PAL.gray : PAL.yellow, 22, 'left', true);
  for (let p2 = 0; p2 <= sel.tier; p2++) px(g, 634 + p2 * 9, 84, 6, 9, sel.stub ? PAL.dgray : PAL.orange);
  let iy = 102;
  for (const line of wrapText(sel.blurb, 36)) { T(632, iy, line, PAL.gray, 14); iy += 18; }
  iy += 8;
  const cost = Math.max(sel.gasCost || 0, cur.gasCost || 0);
  if (sel.id !== cur.id) { T(632, iy, 'gas from ' + cur.name + ':  ' + fmt$(cost), PAL.dgray, 13); iy += 24; }
  if (sel.id === cur.id) {
    T(632, iy, 'YOU ARE HERE.', PAL.green, 18, 'left', true); iy += 26;
    T(632, iy, 'three doors a day. read the paper.', PAL.dgray, 13);
  } else if (sel.stub) {
    for (const line of wrapText("The clerk looks straight through you. This yard isn't taking new faces yet. Keep climbing.", 36)) {
      T(632, iy, line, PAL.dgray, 14); iy += 18;
    }
  } else {
    const gate = townGateStatus(sel);
    T(632, iy, 'THE CLERK CHECKS THE LIST:', PAL.gray, 13, 'left', true); iy += 20;
    for (const c of gate.checks) {
      px(g, 632, iy + 2, 9, 9, c.ok ? PAL.green : PAL.red);
      for (const line of wrapText(c.label, 34)) { T(648, iy, line, c.ok ? PAL.gray : PAL.red, 13); iy += 16; }
      iy += 5;
    }
    if (!gate.ok) {
      T(632, iy + 4, 'no list, no gate. come back heavier.', PAL.dgray, 12);
    } else if (G.world.travelTo === sel.id) {
      button(632, 388, 288, 34, 'CANCEL THE TRIP', () => {
        G.world.travelTo = null;
        gain(cost);
        toast('You unpack the road snacks.', PAL.gray);
      }, { col: PAL.slate, fs: 15 });
    } else if (G.world.travelTo) {
      T(632, iy + 4, 'already leaving for ' + TOWNS[G.world.travelTo].name + ' tonight.', PAL.cyan, 12);
    } else {
      button(632, 388, 288, 34, 'DRIVE OUT TONIGHT — GAS ' + fmt$(cost), () => {
        if (G.money < cost) { play('denied'); toast('Not enough gas money.', PAL.red); return; }
        spend(cost);
        bump('gas', cost);
        G.world.travelTo = sel.id;
        play('van_load');
        toast('Leaving for ' + sel.name + ' tonight.', PAL.cyan);
      }, { col: PAL.dgreen, fs: 13, disabled: G.money < cost });
    }
  }

  // -- the office window --
  if (!G.world.bidderNumber) {
    panel(616, 440, 320, 46, '#241f2e');
    T(628, 447, 'BIDDER NUMBER — required at every', PAL.gray, 12);
    T(628, 461, 'yard past Dusty Flats. Office sells them.', PAL.gray, 12);
    button(846, 448, 78, 30, '$75', () => {
      if (G.money < 75) { play('denied'); return; }
      spend(75);
      G.world.bidderNumber = true;
      play('coin');
      toast('Number 88. Try not to lose it.', PAL.yellow);
      saveGame();
    }, { col: PAL.dgreen, fs: 14, disabled: G.money < 75 });
  } else {
    T(616, 452, 'bidder number 88, laminated. almost spelled right.', PAL.dgray, 12);
  }
  button(616, 492, 320, 36, 'BACK TO THE YARD', () => { G.mode = 'yard'; }, { col: PAL.slate, fs: 15 });
}

// ============ pause menu ============
function drawPauseMenu() {
  px(g, 0, 0, W, H, 'rgba(8,8,14,0.82)');
  const pw = 400, px0 = W / 2 - pw / 2;                    // wide enough that no label leaves its button (playtest 2026-09-15)
  panel(px0, 36, pw, 480, '#1d2030');
  T(W / 2, 44, 'PAUSED', PAL.yellow, 30, 'center', true);
  if (typeof DEV_ROOM !== 'undefined' && DEV_ROOM) button(px0 + pw - 84, 46, 72, 22, 'DEV ROOM', () => openDev(), { col: '#5a3a6e', fs: 10 });
  // the world, for telling somebody: the three words, or the number
  T(px0 + 20, 84, 'world  ' + seedLabel(), PAL.gray, 12);
  button(px0 + pw - 84, 80, 72, 22, 'COPY', () => copySeed(), { col: PAL.slate, fs: 12 });
  button(W / 2 - 140, 110, 280, 36, 'RESUME', () => { G.paused = false; }, { fs: 17 });
  button(W / 2 - 140, 152, 280, 36, 'READ THE GAZETTE', () => { if (G.paper) { G.paused = false; G.mode = 'paper'; } }, { fs: 15, disabled: !G.paper, col: PAL.dgreen });
  button(W / 2 - 140, 194, 280, 36, 'THE LEDGER', () => openCodex(), { fs: 15, col: PAL.blue });
  // four faders, one per bus; M still mutes the lot
  px(g, px0 + 16, 242, pw - 32, 1, '#4b5478');
  T(px0 + 20, 248, 'SOUND', PAL.white, 13, 'left', true);
  button(px0 + pw - 108, 244, 96, 20, _muted ? 'MUTED (M)' : 'MUTE (M)', () => toggleMute(), { fs: 11, col: _muted ? PAL.dred : PAL.slate });
  slider(px0 + 20, 270, pw - 40, 'music', 'music', PAL.purple);
  slider(px0 + 20, 296, pw - 40, 'ambience', 'amb', PAL.green);
  slider(px0 + 20, 322, pw - 40, 'effects', 'sfx', PAL.orange);
  slider(px0 + 20, 348, pw - 40, 'voices', 'voice', PAL.cyan);
  // the sound check: what the loader found, and a button that makes the auctioneer say something
  const sr = soundReport();
  T(px0 + 20, 377, sr.text, sr.ok ? PAL.gray : PAL.orange, 12);
  button(px0 + pw - 96, 373, 84, 20, 'SAY IT', () => {
    if (_muted) toggleMute();
    if (VOL.voice <= 0) setVol('voice', 0.8);
    if (!speakOneOf(['auc_open_ready', 'auc_rules_stinger', 'auc_pressure', 'auc_sold'], true, { cooldown: 0 })) toast(sr.why, PAL.orange, 4);
  }, { fs: 11, col: sr.ok ? PAL.dgreen : PAL.slate });
  px(g, px0 + 16, 398, pw - 32, 1, '#4b5478');
  const tw = 116, tx = W / 2 - (tw * 3 + 16) / 2;
  button(tx, 404, tw, 30, 'FULLSCREEN', () => toggleFullscreen(), { fs: 11, col: PAL.slate });
  button(tx + tw + 8, 404, tw, 30, _motion ? 'MOTION: ON' : 'MOTION: OFF', () => toggleMotion(), { fs: 11, col: _motion ? PAL.slate : PAL.dgray });
  button(tx + (tw + 8) * 2, 404, tw, 30, _paddle ? 'PADDLE: HOLD' : 'PADDLE: CLICK', () => togglePaddle(), { fs: 11, col: _paddle ? PAL.dgreen : PAL.dgray });
  button(W / 2 - 140, 442, 280, 32, 'SAVE & QUIT TO MENU', () => { saveGame(); G.paused = false; G.mode = 'title'; }, { fs: 14, col: PAL.red });
  T(W / 2, 478, 'quitting keeps money & stash —', PAL.dgray, 12, 'center');
  T(W / 2, 490, 'the day restarts from morning', PAL.dgray, 12, 'center');
}
// what the sound loader has found so far, in one line, and why the auctioneer would be silent
function soundReport() {
  let voice = 0;
  for (const n of [].concat(AUC_VO, NUM_NAMES, GAVEL_VO, NPC_VO)) if (_snd[n]) voice += _snd[n].length;
  const bank = !!(_snd.auc_open_ready || _snd.auc_start_needbid || _snd.vo_start);
  const manifest = typeof SOUND_MANIFEST !== 'undefined' && Array.isArray(SOUND_MANIFEST) ? SOUND_MANIFEST.length : 0;
  let why = null;
  if (!voice) why = manifest ? 'no voice files in the manifest: record them into sounds\\ and run tools/make_manifest.py' : 'no sounds/manifest.js: run python tools/make_manifest.py, then reload';
  else if (!bank) why = 'voice files found, but no auctioneer bank (auc_open_ready_01.mp3 and friends)';
  else if (_muted) why = 'muted (M)';
  else if (VOL.voice <= 0) why = 'the voices fader is at zero';
  const text = voice ? 'voice files: ' + voice + (bank ? ' · auctioneer ready' : ' · no auctioneer bank') + (manifest ? '' : ' · no manifest') : (manifest ? 'no voice files found yet' : 'no sounds/manifest.js');
  return { ok: !why, why: why || '', text, voice, bank, manifest };
}

// ============ sprite sheet debug (?sheet) ============
function drawSheet() {
  px(g, 0, 0, W, H, '#14161f');
  const ids = Object.keys(SPRITES);
  const cols = 8, cw = 118, chh = 128;
  let maxY = 0;
  for (let i = 0; i < ids.length; i++) {
    const cx = 8 + (i % cols) * cw, cy = 30 + Math.floor(i / cols) * chh - G.sheetScroll;
    maxY = Math.max(maxY, 30 + Math.floor(i / cols) * chh + chh);
    if (cy < -chh || cy > H) continue;
    panel(cx, cy, cw - 6, chh - 6, '#1d2030');
    const spr = getSprite(ids[i], 'wood', 'Clean', 5);
    const sc = Math.min((cw - 20) / spr.width, (chh - 34) / spr.height, 2);
    g.drawImage(spr, cx + (cw - 6 - spr.width * sc) / 2, cy + 6, spr.width * sc, spr.height * sc);
    T(cx + (cw - 6) / 2, cy + chh - 26, ids[i], PAL.gray, 14, 'center');
  }
  const pids = Object.keys(PORTRAITS);
  for (let i = 0; i < pids.length; i++) {
    const cx = 8 + i * cw, cy = maxY - G.sheetScroll;
    panel(cx, cy, cw - 6, 110, '#1d2030');
    drawPortrait(pids[i], cx + 24, cy + 8, 64, 64);
    T(cx + (cw - 6) / 2, cy + 82, pids[i], PAL.gray, 14, 'center');
  }
  T(8, 4, 'SPRITE SHEET — wheel to scroll', PAL.yellow, 18);
}

// ============ wheel ============
function handleWheel(dir) {
  if (G.modal && G.modal.onWheel) { G.modal.onWheel(dir); return; }
  if (G.mode === 'sell' && G.homeTab === 'board') {
    G.boardScroll = clamp((G.boardScroll || 0) + dir, 0, 99);   // drawBoard clamps to the real row count
  } else if (G.mode === 'sell') {
    const n = (G.homeTab === 'trophy' ? G.trophies : (G.homeTab === 'keeps' ? G.keeps : G.stash)).length;
    const max = G.homeTab === 'trophy' ? museumRows(G.trophies) - MUSEUM_ROWS : Math.ceil(n / 8) - 6;
    G.sellScroll = clamp(G.sellScroll + dir, 0, Math.max(0, max));
  }
  if (G.mode === 'dig') G.pileScroll = clamp(G.pileScroll + dir * 9, 0, Math.max(0, (G.dig ? G.dig.pile.length : 0) - 18));
  if (G.mode === 'sheet') G.sheetScroll = Math.max(0, G.sheetScroll + dir * 60);
  if (G.mode === 'codex') G.codexScroll = clamp((G.codexScroll || 0) + dir * 40, 0, G.codexScrollMax || 0);
  if (G.mode === 'dev') devWheel(dir);
}

// ============ main loop ============
if (location.search.indexOf('sheet') >= 0) G.mode = 'sheet';
let lastT = 0;
let _rafPending = false;
function scheduleFrame() {
  if (_rafPending) return;
  _rafPending = true;
  requestAnimationFrame((t) => { _rafPending = false; frame(t); });
}
function frame(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  G.time += dt;
  updateMusic(dt);
  updateVideos();
  focusTick();                                   // the controller, if one is plugged in
  hotspots = [];
  rightspots = [];
  _onArt = false;
  g.setTransform(VIEW, 0, 0, VIEW, 0, 0);
  g.clearRect(0, 0, W, H);
  if (_shake.t > 0) {
    _shake.t -= dt;
    const a = _shake.amp * Math.max(0, _shake.t / _shake.dur);
    g.translate(Math.round((Math.random() - 0.5) * 2 * a), Math.round((Math.random() - 0.5) * 2 * a));
  }

  if (G.mode === 'title') drawTitle();
  else if (G.mode === 'seedpick') drawSeedPick();
  else if (G.mode === 'reveal') drawReveal(dt);
  else if (G.mode === 'yard') drawYard();
  else if (G.mode === 'peek') drawPeek();
  else if (G.mode === 'walkdown') drawWalk(dt);
  else if (G.mode === 'phone') drawPhone(dt);
  else if (G.mode === 'voicemail') drawVoicemail(dt);
  else if (G.mode === 'auction') { pumpQueue(dt); drawAuction(dt); }
  else if (G.mode === 'dig') drawDig();
  else if (G.mode === 'sell') {
    drawSell();
    if (G.homeInspect) { hotspots = []; rightspots = []; drawHomeInspect(); }
    else drawCellMenu();
  }
  else if (G.mode === 'summary') drawSummary();
  else if (G.mode === 'paper') drawPaper();
  else if (G.mode === 'map') drawMap();
  else if (G.mode === 'sheet') drawSheet();
  else if (G.mode === 'closed') drawClosed();
  else if (G.mode === 'codex') drawCodex();
  else if (G.mode === 'tv') drawTv();
  else if (G.mode === 'npcIntro') drawNpcIntro(dt);
  else if (G.mode === 'itemcard') drawItemCard(dt);
  else if (G.mode === 'verdict') drawVerdict(dt);
  else if (G.mode === 'firstmorning') drawFirstMorning(dt);
  else if (G.mode === 'drivehome') drawDriveHome(dt);
  else if (G.mode === 'arrive') drawArrive(dt);
  else if (G.mode === 'credits') drawCredits(dt);
  else if (G.mode === 'dev') drawDev();

  if (STORM_MODES[G.mode] && typeof stormNow === 'function' && stormNow()) drawRain(dt);   // the storm (day 21)
  if (_sunHover && !G.modal && !G.paused) drawSunTip();   // over the screen, under the modal
  _sunHover = false;
  if (G.modal || G.paused) _btnTip = null;            // the screen's own buttons are behind it now
  if (G.modal) { hotspots = []; rightspots = []; drawModal(); }
  if (G.paused) { hotspots = []; rightspots = []; drawPauseMenu(); }
  if (_btnTip) drawTooltip(_btnTip.cx, _btnTip.top, _btnTip.text, PAL.white);   // a hovered, or focused, button's hint
  _btnTip = null;
  drawToast(dt);
  drawFloats(dt);
  drawFocus();                                   // the ring, last, over everything

  // the top one under the mouse decides: a hand for a live button, a no for a greyed one
  let top = null;
  for (const h of hotspots) if (inRect(mouse.x, mouse.y, h.x, h.y, h.w, h.h)) top = h;
  cv.style.cursor = !top ? 'default' : (top.disabled ? 'not-allowed' : 'pointer');

  scheduleFrame();
}
scheduleFrame();
// hidden tabs starve requestAnimationFrame — keep the world turning anyway
setInterval(() => { if (performance.now() - lastT > 400) frame(performance.now()); }, 300);
