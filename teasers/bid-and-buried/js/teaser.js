// ---- js/teaser.js: the website teaser's director ----
// Loaded ONLY by teaser/index.html, after every game script. The game runs as itself — its
// auction, its dig, its garage, its voices — and this file stands beside it and steers:
// one seeded world, one unit dressed for the purpose, one rival (Eagle Ed) whose paddle is
// scripted for the drama, and a line under the picture saying what to do next. Nothing in
// here reaches the real game's save: the Store is swapped for memory and G.demo is set, so
// every "never in a demo world" gate in the game holds (no saves, no arcs, no phone, no
// interruptions, no cold open).
//
// The beats: JOIN (Buzz opens, and introduces Ed with his own recorded card) -> the sale (Ed
// is sweating at $175; you bid; the count runs; Ed finds his nerve at the wire; you bid again;
// Ed folds; SOLD, with the cheer, the gavel and the sting) -> the dig (front to back, the
// LOAD/LEAVE panel, and one epic thing loose at the back that gets the first-find ceremony)
// -> home (the haul; LOOK CLOSER on one dressed trunk: its drawers, the rummage, the false
// bottom - all real hits) -> the end card, and the link to the game page.
'use strict';

(function () {
  const D = window.BB_TEASER = Object.assign(window.BB_TEASER || {}, {
    version: 2, active: false, phase: 'start', seed: 4242, edN: 0, pulls: 0, finds: 0,
    coach: '', t: 0, done: false, unit: null, trunkUid: null, epicUid: null,
    reactions: [],                  // faces whose reaction files the page ships (none yet)
  });
  const FULL = 'https://brok3nbydesign.com/bid-and-buried.html';
  const OPEN_BID = 175;             // where Ed is standing when you walk up
  const ED_CAP = 200;               // his number: close enough that the honest strip reads "sweating"

  // ---- the site's storage is not ours: everything the game would remember goes to memory ----
  const mem = {};
  Store.get = (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null);
  Store.set = (k, v) => { mem[k] = String(v); return true; };
  Store.remove = (k) => { delete mem[k]; };
  G.demo = 'teaser';
  // no pause menu (faders, MOTION, the seed, DEV ROOM, save & quit): Escape only ever backs out of a card here,
  // and the header's menu icon is not drawn. No Ledger either: the game's books are the game's.
  Object.defineProperty(G, 'paused', { get: () => false, set() {}, configurable: true });
  openCodex = function () {};

  // ---- the parent page, if any (README: Embedding). Counts only, one exact origin, never "*". ----
  const embedded = (() => { try { return window.parent && window.parent !== window; } catch (e) { return false; } })();
  function post(event, extra) {
    const origin = D.parentOrigin;
    if (!origin || !embedded || origin === '*' || !/^https?:\/\/[^/]+$/.test(origin)) return;
    try { window.parent.postMessage(Object.assign({ type: 'bb-teaser', v: 2, event }, extra || {}), origin); } catch (e) { /* no listener, no harm */ }
  }
  let _lastH = 0;
  function postHeight() {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (h !== _lastH) { _lastH = h; post('resize', { height: h }); }
  }

  // ---- art: the short list this page ships, asked for directly (no numbered-take probing) ----
  D.loadArt = function () {
    const one = (src, store, key, front) => queueImage(src, (im) => { (store[key] = store[key] || []).push(im); }, () => {}, front);
    one('backgrounds/bg_auction.jpg', _bg, 'bg_auction', true);
    one('backgrounds/bg_dig.jpg', _bg, 'bg_dig');
    one('backgrounds/bg_home.jpg', _bg, 'bg_home');
    one('npcs/npc_ed.png', _npcImg, 'ed', true);
    one('npcs/npc_buzz.jpg', _npcImg, 'buzz', true);
    one('npcs/npc_buzz_talk.jpg', _npcImg, 'buzz_talk', true);
    askCutout('ed', true);
  };

  // ---- the canvas fits the page, not the window ----
  const stage = document.getElementById('stage');
  function fitCanvas() {
    const bw = Math.max(300, stage.clientWidth || window.innerWidth);
    const bh = Math.max(200, (window.innerHeight || H) - 150);
    const s = Math.max(0.3, Math.min(bw / W, bh / H, 3));
    const cssW = Math.floor(W * s), cssH = Math.floor(H * s);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    VIEW = cv.width / W;
    g.imageSmoothingEnabled = false;
    postHeight();
  }
  sizeCanvas = fitCanvas;                       // the game's own resize listener holds the old reference; ours runs too
  window.addEventListener('resize', fitCanvas);
  document.addEventListener('fullscreenchange', () => setTimeout(fitCanvas, 50));
  fitCanvas();

  // ================= the world =================
  function buildWorld() {
    newGame(D.seed);                            // G.demo: no cold open. startDay lands on the paper; we never show it
    G.world.opening = false; G.world.bidderNumber = true; G.world.tools = [];
    G.world.visited = ['dustyFlats']; G.world.town = 'dustyFlats'; G.world.noArcs = true;
    G.day = 9; G.money = 1500;
    startDay();
    G.world.firstEpicDay = 0;                   // the first epic pull of a career gets the ceremony: this is that career
    G.world.saidLook = true;                    // the appraiser's one-time "have a look yourself" nudge: not over a ninety-second run
    // Buzz has met everybody here but one: the card is Ed's
    G.world.met = NPCS.map((n) => n.id).concat(Object.keys(EXTRA_NPCS)).filter((id) => id !== 'ed');
    const lk = pickUnit();
    dressUnit(lk);
    G.cur = lk; G.peekT = 1;
    G.today.peeked = [lk.num];
    G.toast = null; G.modal = null; G.floats = [];
    D.unit = lk.num;
  }
  // the roomiest door on the row: more to dig, more front row to read
  function pickUnit() {
    const row = G.today.lockers.slice();
    row.sort((a, b) => (b.cols - a.cols) || (b.items.length - a.items.length));
    return row[0];
  }
  // the teaser's few plants, all made of the game's own parts: one epic thing loose in the dark
  // (the dealt opening's fifth-morning rule), one trunk up front whose drawers, rummage and false
  // bottom all pay (the seeds LOOK CLOSER rolls, chosen so they land), a wad of cash in the front row
  function dressUnit(lk) {
    const R = RNG(strHash('teaser_' + D.seed + '_' + lk.num));
    const items = lk.items;
    const loose = (it) => !it.set && !it.container && !it.onUid && !it.stackedUid && !it.cash && !it.legendary && !it.fake;
    // the epic: a sleeper-pool thing at $850-1,250, in the back row, in place of something cheap
    const e = makeItem(R.wpick(SLEEPER_POOL), R);
    e.val = R.i(850, 1250); e.cond = 'Clean'; e.layer = 0; e.wCols = 1;
    const back = items.filter((it) => it.layer === 0 && loose(it));
    if (back.length) { const v = R.pick(back); e.col = v.col; items[items.indexOf(v)] = e; }
    else { e.col = R.i(0, Math.max(0, (lk.cols || 8) - 1)); items.push(e); }
    D.epicUid = e.uid;
    // the trunk: swapped into the front row for a loose junk thing, or found there already
    let trunk = items.find((it) => it.layer === 2 && it.container && !it.locked && HIDDEN_RATES[it.base] && !it.onUid && !it.stackedUid);
    if (!trunk) {
      const front = items.filter((it) => it.layer === 2 && loose(it) && (it.cat === 'junk' || it.val < 40));
      const v = front.length ? R.pick(front) : null;
      trunk = makeItem('trunk', R);
      if (v) { trunk.layer = 2; trunk.col = v.col; trunk.wCols = Math.max(1, Math.min(trunk.wCols, v.wCols)); items[items.indexOf(v)] = trunk; }
      else { trunk.layer = 2; trunk.col = 0; items.push(trunk); }
    }
    trunk.loot = [makeItem('watch', R), makeItem('diary', R), makeItem('cashWad', R)];
    trunk.opened = false; trunk.locked = false;
    // a seed for which every roll LOOK CLOSER makes says yes: the rummage (seed+53 at 18%), the false bottom (seed+31 at the base's rate)
    for (let h = 1000; h < 200000; h++) {
      if (RNG(h + 53).chance(0.18) && RNG(h + 31).chance(HIDDEN_RATES[trunk.base] || 0.25) && RNG(h + 53).f() < 0.55) { trunk.hseed = h; break; }
    }
    D.trunkUid = trunk.uid;
    // money up front: the coin sound is half the reason people dig
    if (!items.some((it) => it.cash && it.layer === 2)) placeFront(R, lk, 'cashWad');
    for (const it of items) { it.uid = it.uid || nextUid(); }
    recomputeValue(lk);
    lk.minBid = 100;
  }

  // ================= the sale =================
  function startTeaserAuction() {
    D.edN = 0;
    startAuction();
    const au = G.auction;
    const ed = au.npcs.find((a) => a.def && a.def.id === 'ed');
    for (const a of au.npcs) {
      if (a === ed) { a.active = true; a.broke = false; a.folded = false; }
      else { a.active = false; a.folded = true; a.broke = false; }
    }
    ed.tellMode = 'honest'; ed.pressLeft = 0; ed.spiteCap = 0; ed.pushBack = null; ed.everLed = true; ed.lateBid = false;
    ed.cap = ED_CAP; ed.budgetCap = Math.max(ed.budgetCap || 0, 2200); ed.topRaise = OPEN_BID; ed.needs = false;
    au.interrupt = null; au.tenant = null; au.spiteWar = null; au.dutch = null; au.sealed = null; au.phone = null; au.feudSaid = true;
    // the room so far, written the way a sale in progress reads: the crowd opened it, Ed took it, the crowd settled
    au.queue.length = 0;
    au.log = [
      { text: 'Bidding against: Eagle Ed', col: PAL.gray, showBid: 0, showLeader: null },
      { text: 'Somebody in the lawn chairs opens it.  ' + fmt$(100), col: PAL.white, sfx: 'npc', amt: 100, showBid: 100, showLeader: 'the crowd' },
      { text: 'Ed adjusts his glasses. Raise.  ' + fmt$(125), col: PAL.white, sfx: 'npc', amt: 125, npcId: 'ed', showBid: 125, showLeader: 'Eagle Ed' },
      { text: 'The lawn chairs come back once.  ' + fmt$(150), col: PAL.white, sfx: 'npc', amt: 150, showBid: 150, showLeader: 'the crowd' },
      { text: '"The math still works."  ' + fmt$(OPEN_BID), col: PAL.white, sfx: 'npc', amt: OPEN_BID, npcId: 'ed', showBid: OPEN_BID, showLeader: 'Eagle Ed' },
      { text: 'The crowd settles down.', col: PAL.dgray, sfx: 'fold', showBid: OPEN_BID, showLeader: 'Eagle Ed' },
    ];
    au.bid = OPEN_BID; au.leader = ed; au.shownBid = OPEN_BID; au.shownLeader = 'Eagle Ed'; au.lastRivalLead = 'ed';
    au.raisesBy = { ed: 2 }; au.lineAt = G.time; au.bidAt = G.time; au.closing = 0; au.closingT = 0;
    au.doorT = 1; au.doorInit = true;
    au.beat = true;                             // the queue is empty: the gavel turns to you. "Would you give - two hundred?"
    // Buzz's card for the new face, if the dice did not already deal it (he was 'met' by nobody here)
    if (G.mode !== 'npcIntro') { codexNoteMet('ed'); npcIntroQueue(['ed'], 'auction'); }
    // the card IS the opening here: not "who'll start me" and then the card, the card. His line starts at once
    // and is allowed to finish over the sale if the visitor is quick with LET'S GO (see npcIntroEnd below)
    voFlush(true);
    speak(['auc_intro_ed'], true, { cooldown: 0 });
    D.phase = 'auction';
  }
  // Ed's paddle, scripted: decision 1 he holds (the count starts on you), decision 2 he finds his nerve
  // at the wire (the late-bid sting, "New money"), decision 3 he is past his number and folds. After that
  // he stays folded. Nobody else in the room bids at all.
  const _npcWants = npcWants;
  npcWants = function (a, target, leaderIsYou, R, auc, leader) {
    if (!D.active || !a || !a.def) return _npcWants(a, target, leaderIsYou, R, auc, leader);
    if (a.def.id !== 'ed') return false;
    D.edN++;
    if (D.edN === 1) { a.cap = Math.max(a.cap, target); return false; }                 // still in, saying nothing
    if (D.edN === 2) { a.cap = Math.max(a.cap, target); a.pressLeft = 0; return true; }  // the late paddle
    a.cap = Math.min(a.cap, target - 1); a.pressLeft = 0; a.spiteCap = 0; return false;  // past the number: the fold branch
  };
  // LET'S GO in the teaser does not cut Buzz off mid-introduction: the card goes, the line finishes over the room
  const _npcIntroEnd = npcIntroEnd;
  npcIntroEnd = function () {
    if (!D.active || !G.npcIntro || G.npcIntro.replay) return _npcIntroEnd();
    G.mode = G.npcIntro.back; G.npcIntro = null; _musicPoll = 0;
  };
  // the directed sale has one answer: your paddle. Holding off or walking away is the full game's.
  const _holdOff = holdOff, _playerPass = playerPass;
  holdOff = function () { if (!D.active || D.phase !== 'auction') return _holdOff(); play('denied'); say('Not today: this door is yours if you want it. BID.'); };
  playerPass = function () { if (!D.active || D.phase !== 'auction') return _playerPass(); play('denied'); say('Walk away from Ed? Not in the teaser. BID.'); };

  // ================= the frame, wrapped: the game draws, then the director draws over it =================
  const _frame = frame;
  frame = function (t) {
    _frame(t);
    if (!D.active) return;
    try { overlay(); } catch (e) { /* the director never breaks the game's frame */ }
  };
  function overlay() {
    g.setTransform(VIEW, 0, 0, VIEW, 0, 0);
    if (D.phase === 'start') { drawStartCard(); return; }
    if (D.phase === 'end') { drawEndCard(); return; }
    watch();
    touchDig();
    ring();
  }
  // the dig only makes the thing under the mouse clickable, so a tap with no hover before it lands on nothing
  // (the game's open thread on touch). Every pullable thing gets its own hotspot here, and the panel opens beside it.
  function touchDig() {
    if (D.phase !== 'dig' || G.mode !== 'dig' || G.inspect || G.modal || !G.cur) return;
    for (const it of G.cur.items) {
      if (!isAccessible(it, G.cur.items)) continue;
      const r = itemRect(it);
      hot(r.x, r.y, r.w, r.h, () => { mouse.x = r.x + r.w / 2; mouse.y = r.y + r.h / 2; pullItem(it); }, { focusable: false });
    }
  }
  // the pulse round the thing to press next: found by the label the game gave its button
  let _ringRe = null, _ringRect = null;
  function ringOn(re) { _ringRe = re; _ringRect = null; }
  function ringRect(rect) { _ringRe = null; _ringRect = rect; }
  function ring() {
    let r = _ringRect;
    if (!r && _ringRe) { const h = hotspots.find((s) => s.label && _ringRe.test(s.label) && !s.disabled); if (h) r = { x: h.x, y: h.y, w: h.w, h: h.h }; }
    if (!r) return;
    const p = 0.5 + 0.5 * Math.sin(G.time * 5);
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,205,117,' + (0.45 + 0.55 * p).toFixed(2) + ')';
    g.strokeRect(r.x - 4 - p * 2, r.y - 4 - p * 2, r.w + 8 + p * 4, r.h + 8 + p * 4);
  }

  // ---- what to say, from the state, every frame: the line under the picture and the ring on the canvas ----
  const coachEl = document.getElementById('coach');
  function say(text, done) {
    if (D.coach === text) return;
    D.coach = text;
    coachEl.textContent = text;
    coachEl.classList.toggle('done', !!done);
    postHeight();
  }
  function watch() {
    const au = G.auction;
    if (G.mode === 'npcIntro') { say('Buzz introduces the competition. Every face in this game gets a card like this, once.'); ringOn(/^LET'S GO$|^NEXT$/); return; }
    if (D.phase === 'auction') {
      if (!au) return;
      if (au.done && G.cur.won) {
        if (auctionBusy()) { say('SOLD to you. The room has a word about it, then the door is yours.'); ringOn(null); return; }
        say('SOLD to you. The room heard it. Now the door is yours to empty: START DIGGING.'); ringOn(/^START DIGGING$/); return;
      }
      if (au.done) { say('The room moved on. Restart to try that door again.'); ringOn(null); return; }
      if (au.leader === 'you' && au.closing) { say(D.edN >= 3 ? 'Ed is past his number and out. Let the gavel finish: once... twice...' : 'The count is on you. Ed is not moving... yet.'); ringOn(null); return; }
      if (au.leader === 'you') { say('Yours for the moment. Nobody bids against himself: the hammer does the rest.'); ringOn(null); return; }
      if (D.edN >= 2) { say('Ed found his nerve at the wire. One more paddle takes it off him: BID.'); ringOn(/^(BID|IN) \+/); return; }
      say("Eagle Ed is sweating: his number is close. Take the door off him. BID +$25.");
      ringOn(/^(BID|IN) \+/);
      return;
    }
    if (D.phase === 'dig') {
      if (G.mode === 'reveal') { say('This is why you dig. One in every unit, some days. PICK IT UP.'); ringOn(/^PICK IT UP$/); return; }
      if (G.inspect) { say('You pulled it out. Load it in the van, or leave it on the floor.'); ringOn(/^LOAD/); return; }
      const left = G.cur.items.length;
      const trunk = G.cur.items.find((it) => it.uid === D.trunkUid);
      const epic = G.cur.items.find((it) => it.uid === D.epicUid);
      // the two plants have to come home: the trunk (front row) first, then the epic thing at the back
      const next = nextPull();
      if (!next) { say(left ? 'That is plenty for one door. The rest is for the scrap man. LOAD UP & LEAVE.' : 'Empty. LOAD UP & LEAVE.'); ringOn(/^LOAD UP/); return; }
      const name = BASE_BY_ID[next.base].name.toLowerCase();
      if (next === trunk) say(D.pulls ? 'The ' + name + ' next. Something shifts inside it.' : 'Your unit. Front stuff first: pull the ' + name + '.');
      else if (next === epic) say('The back row is clear. Something is down there. Pull it.');
      else if (trunk) say('The ' + name + ' is in the way of the ' + BASE_BY_ID[trunk.base].name.toLowerCase() + '. Front to back: it comes out first.');
      else say('Front to back: the ' + name + ' is in the way of whatever is at the back. Pull it.');
      ringRect(itemRect(next));
      return;
    }
  }
  function itemRect(it) {
    const p = itemDrawPos(lkFrameX(G.cur), 62, it);
    return { x: p.x, y: p.y, w: p.w, h: p.h };
  }
  // the thing to pull to get at `target`: itself if nothing is in front of it, else whatever is in the way
  // (the thing stacked on it, or anything in a nearer row over its columns), nearest the door first
  function wayTo(target, depth) {
    const items = G.cur.items;
    if (!target || !items.includes(target)) return null;
    if (isAccessible(target, items)) return target;
    if ((depth || 0) > 8) return null;
    const cands = [];
    if (target.stackedUid) { const s = items.find((o) => o.uid === target.stackedUid); if (s) cands.push(s); }
    for (const o of items) {
      if (o === target || o.layer <= target.layer) continue;
      if (o.col <= target.col + target.wCols - 1 && target.col <= o.col + o.wCols - 1) cands.push(o);
    }
    cands.sort((a, b) => b.layer - a.layer);
    for (const c of cands) if (isAccessible(c, items)) return c;
    for (const c of cands) { const w = wayTo(c, (depth || 0) + 1); if (w) return w; }
    return null;
  }
  // what the coach points at in the dig: the trunk (front row) first, then the epic thing at the back
  function nextPull() {
    const trunk = G.cur.items.find((it) => it.uid === D.trunkUid);
    const epic = G.cur.items.find((it) => it.uid === D.epicUid);
    return (trunk && wayTo(trunk)) || (epic && wayTo(epic)) || null;
  }
  D.nextPull = nextPull;

  // ---- the counters the director reads: pulls, finds, and the phase changes the game makes on its own ----
  const _pullItem = pullItem;
  pullItem = function (it) {
    const before = G.cur ? G.cur.items.length : 0;
    _pullItem(it);
    if (D.active && G.cur && G.cur.items.length < before) D.pulls++;
  };
  const _startDig = startDig;
  startDig = function () { _startDig(); if (D.active) { D.phase = 'dig'; D.pulls = 0; say(''); } };
  // LOAD UP & LEAVE is the end of play: no leave check, no yard, no garage. The game unloads the van
  // and goes through the haul the way an evening at home would (every box opened, the trunk's rummage
  // and false bottom tried, everything appraised), and the results screen shows what that turned up.
  const _tryDriveHome = tryDriveHome, _driveHome = driveHome;
  tryDriveHome = function () { if (!D.active || D.phase !== 'dig') return _tryDriveHome(); if (!G.inspect) driveHome(); };
  driveHome = function () {
    _driveHome();
    if (!D.active || D.phase !== 'dig') return;
    try { finishRun(); } catch (e) { D.results = D.results || { haul: [], lines: [], cash: 0, worth: 0, trunkName: 'the trunk' }; }
    endTeaser();
  };
  function finishRun() {
    const wasMuted = _muted; _muted = true;       // the evening happens in a second, silently
    try {
      goHome();                                   // unload the van into the haul (the game's own)
      const lines = [];
      for (const it of G.stash.slice()) if (it.loot && !it.locked) for (const l of emptyContainer(it, true)) if (l.col !== PAL.dgray) lines.push(l);   // a box with nothing in it says nothing here
      const trunk = G.stash.find((it) => it.uid === D.trunkUid);
      if (trunk) {
        openInspect(trunk);
        const HI = G.homeInspect;
        if (HI) {
          for (const z of HI.zones) if (z.kind === 'rummage' || z.kind === 'falseBottom') inspectZoneClick(z);
          for (const l of HI.log) if (l.find || l.col === PAL.yellow || l.col === PAL.green) lines.push({ text: l.text, col: l.col });
        }
        G.homeInspect = null;
      }
      for (const it of G.stash) if (!it.cash && !it.searched && !it.loot && !it.locked) searchItem(it);
      D.finds = lines.length;
      const haul = G.stash.filter((it) => !it.cash).slice().sort((a, b) => (b.val || 0) - (a.val || 0));
      let worth = 0; for (const it of haul) worth += it.val || 0;
      D.results = { haul, lines, cash: (G.dayStats && G.dayStats.cashFound) || 0, worth, trunkName: trunk ? dName(trunk) : 'the trunk' };
    } finally { _muted = wasMuted; }
  }

  // ================= the two cards of our own =================
  function drawStartCard() {
    px(g, 0, 0, W, H, '#0b0c12');
    const R = RNG(77);
    g.fillStyle = 'rgba(120,130,160,0.05)';
    for (let i = 0; i < 160; i++) g.fillRect(R.i(0, W - 4), R.i(0, H - 2), R.i(2, 6), 1);
    T(W / 2, 96, 'BID & BURIED', PAL.yellow, 64, 'center', false, LOGO_FONT);
    T(W / 2, 168, 'buy blind. dig deep. get rich.', PAL.gray, 18, 'center');
    const lines = ['Dusty Flats, a Tuesday. Three units on the row and a crowd in lawn chairs.',
      'Eagle Ed has the notebook out on unit ' + (D.unit || '?') + '. So do you, sort of.',
      'One door: the bidding, the dig, and what came home.'];
    for (let i = 0; i < lines.length; i++) T(W / 2, 214 + i * 26, lines[i], PAL.paper, 17, 'center');
    button(W / 2 - 170, 318, 340, 52, 'JOIN THE AUCTION', () => begin(false), { col: PAL.dgreen, fs: 22 });
    button(W / 2 - 110, 384, 220, 34, 'join with the sound off', () => begin(true), { col: PAL.slate, fs: 14 });
    T(W / 2, 440, 'about a minute. the game\'s own voices and sounds.', PAL.dgray, 13, 'center');
    T(W / 2, 460, 'website teaser - the full game is at brok3nbydesign.com', PAL.dgray, 13, 'center');
  }
  function drawEndCard() {
    px(g, 0, 0, W, H, '#0b0c12');
    if (_bg.bg_dig && _bg.bg_dig[0]) { g.globalAlpha = 0.22; drawCoverBG(_bg.bg_dig[0], _bg.bg_dig[0].naturalWidth, _bg.bg_dig[0].naturalHeight); g.globalAlpha = 1; }
    const R = D.results || { haul: [], lines: [], cash: 0, worth: 0, trunkName: 'the trunk' };
    const paid = G.cur ? G.cur.paid || 0 : 0;
    T(W / 2, 14, 'HOME. THE HAUL, GONE THROUGH.', PAL.yellow, 36, 'center', false, LOGO_FONT);
    T(W / 2, 54, 'Paid ' + fmt$(paid) + ' at the hammer.   Cash out of the boxes: ' + fmt$(R.cash) + '.   The rest appraises at ' + fmt$(R.worth) + '.', PAL.paper, 15, 'center');
    // left: what came home, biggest first
    const gx = 34, gy = 90, cw = 116, ch = 88, cols = 4;
    const shown = R.haul.slice(0, 12);
    for (let i = 0; i < shown.length; i++) {
      const it = shown[i], x = gx + (i % cols) * cw, y = gy + Math.floor(i / cols) * ch;
      px(g, x, y, cw - 6, ch - 6, PAL.ink); px(g, x + 2, y + 2, cw - 10, ch - 10, '#1d1a2a');
      const tier = tierOf(it.val || 0);
      px(g, x + 2, y + 2, cw - 10, 3, tier.col);
      const spr = getSprite(it.spr, it.pal, it.cond, it.uid);
      const sc = Math.min(40 / spr.width, 40 / spr.height, 2), dw = Math.round(spr.width * sc), dh = Math.round(spr.height * sc);
      g.drawImage(spr, x + Math.round((cw - 6 - dw) / 2), y + 6 + Math.round((40 - dh) / 2), dw, dh);
      const nf = fitLines(dName(it), cw - 14, [12, 11], 2, true);
      for (let k = 0; k < nf.lines.length; k++) T(x + (cw - 6) / 2, y + 47 + k * 12, nf.lines[k], PAL.white, nf.fs, 'center', true);
      T(x + (cw - 6) / 2, y + 71, fmt$(it.val || 0), tier.col, 13, 'center', true);
    }
    if (R.haul.length > 12) T(gx, gy + 3 * ch + 2, '...and ' + (R.haul.length - 12) + ' more', PAL.dgray, 12);
    // right: what the evening found
    const rx = 516, rw = 412;
    px(g, rx - 8, 86, rw + 16, 262, 'rgba(10,12,20,0.7)');
    T(rx, 94, 'AT HOME, WITH THE LIGHT ON', PAL.gray, 12, 'left', true);
    T(rx, 110, 'The ' + String(R.trunkName).toLowerCase().replace(/^(dusty|worn|clean|mint) /, '') + ', gone through:', PAL.white, 14);
    let ly = 132;
    for (const l of R.lines.slice(0, 8)) {
      const f = fitLines(l.text, rw, [13, 12], 2, true);
      for (const line of f.lines) { T(rx, ly, line, l.col || PAL.paper, f.fs); ly += 16; }
      ly += 3;
      if (ly > 330) break;
    }
    if (!R.lines.length) T(rx, ly, 'Nothing hidden this time. It happens.', PAL.dgray, 13);
    T(W / 2, 360, 'That was one door of one afternoon. The full game is sixty of them: nine towns, twenty-one rivals who keep score,', PAL.paper, 14, 'center');
    T(W / 2, 378, 'a paper that gets things wrong on purpose, and a legend in every county that nobody tells the same way.', PAL.paper, 14, 'center');
    button(W / 2 - 190, 410, 380, 52, 'SEE THE GAME PAGE', () => { try { window.open(FULL, '_blank', 'noopener'); } catch (e) { location.href = FULL; } }, { col: PAL.orange, fs: 22 });
    button(W / 2 - 110, 470, 220, 30, 'PLAY THE TEASER AGAIN', () => restart(), { col: PAL.slate, fs: 13 });
    T(W / 2, 512, 'BID & BURIED  -  buy blind. dig deep. get rich.   |   independently created by Brok3n by Design', PAL.dgray, 12, 'center');
  }

  // ================= the run =================
  function begin(muted) {
    initAudio();
    if (muted && !_muted) toggleMute();
    if (!muted && _muted) toggleMute();
    syncSoundButton();
    buildWorld();
    startTeaserAuction();
    say('');
    post('started', { seed: D.seed });
  }
  function endTeaser() {
    if (D.done) return;
    D.done = true; D.phase = 'end';
    G.homeInspect = null; G.modal = null; G.cellMenu = null; G.toast = null; G.floats = [];
    G.mode = 'teaserEnd';                       // nothing in the game draws this mode; the director does
    voFlush(true);
    _musicPoll = 0;
    say('One door of one day. The game page has the rest.', true);
    ringOn(null);
    post('completed', { seed: D.seed, pulls: D.pulls, finds: D.finds });
    postHeight();
  }
  function restart() {
    D.done = false; D.phase = 'start'; D.edN = 0; D.pulls = 0; D.finds = 0; D.coach = ''; D.results = null;
    voFlush(true);
    G.auction = null; G.dig = null; G.inspect = null; G.homeInspect = null; G.modal = null; G.reveal = null; G.npcIntro = null;
    G.mode = 'teaserStart';
    _musicPoll = 0;
    say('');
    ringOn(null);
  }
  // skip ahead: whatever beat is on, jump to the next one, the honest way (the game does the work)
  function skip() {
    if (!D.active) return;
    if (D.phase === 'start') { begin(false); return; }
    if (G.mode === 'npcIntro') { npcIntroEnd(); return; }
    if (D.phase === 'auction') {
      const au = G.auction;
      if (!au || au.done) { if (G.cur && G.cur.won) startDig(); return; }
      voFlush(true);
      const ed = au.npcs.find((a) => a.def && a.def.id === 'ed');
      if (ed) { ed.folded = true; ed.cap = Math.min(ed.cap, au.bid); }
      au.bid = Math.max(au.bid, OPEN_BID) + (au.step || 25); au.leader = 'you'; au.closing = 0; au.queue.length = 0;
      au.queue.push({ text: 'You bid ' + fmt$(au.bid) + '.', col: PAL.cyan, sfx: 'pbid', amt: au.bid, showBid: au.bid, showLeader: 'you' });
      D.edN = 3;
      soldToYou(au);
      return;
    }
    if (D.phase === 'dig') {
      if (G.mode === 'reveal') endReveal();
      if (G.inspect) decideInspect(true);
      if (G.modal) G.modal = null;
      let guard = 14, n;
      while (guard-- > 0 && (n = nextPull())) {
        pullItem(n);
        if (G.mode === 'reveal') endReveal();
        if (G.inspect) decideInspect(true);
      }
      tryDriveHome();
      return;
    }
  }

  // ---- the page's buttons ----
  function syncSoundButton() {
    const b = document.getElementById('btnSound');
    b.textContent = 'Sound: ' + (_muted ? 'off' : 'on');
    b.setAttribute('aria-pressed', _muted ? 'false' : 'true');
  }
  document.getElementById('btnSound').addEventListener('click', () => { initAudio(); toggleMute(); syncSoundButton(); });
  document.getElementById('btnFull').addEventListener('click', () => toggleFullscreen());
  document.getElementById('btnRestart').addEventListener('click', () => restart());
  document.getElementById('skip').addEventListener('click', (e) => { e.preventDefault(); skip(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') setTimeout(syncSoundButton, 0); });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => postHeight()).observe(document.documentElement);

  // ---- boot: the game booted on its title screen; we take it from there ----
  let q = {};
  try { q = Object.fromEntries(new URLSearchParams(location.search)); } catch (e) { q = {}; }
  if (q.seed && /^\d{1,10}$/.test(q.seed)) D.seed = Number(q.seed) >>> 0;
  else if (q.seed) D.seed = strHash(q.seed);
  D.active = true;
  {
    // the unit number on the start card comes from the world, so build it once now (cheap) and again at JOIN
    try { buildWorld(); } catch (e) { /* the card can say "?" */ }
    G.mode = 'teaserStart';
  }
  syncSoundButton();
  say('');
  post('ready', { height: Math.ceil(document.documentElement.getBoundingClientRect().height) });
  D.begin = begin; D.skip = skip; D.restart = restart; D.endTeaser = endTeaser; D.buildWorld = buildWorld; D.startTeaserAuction = startTeaserAuction;
})();
