// bb-teaser.js — the page: one locker on a canvas, the controls in plain HTML.
// Phases: door (look from the doorway) -> dig (front to back) -> keep (the van)
// -> done (the haul). Nothing here touches the full game's save; the teaser
// stores one thing, the sound preference, and survives storage being blocked.
'use strict';

(function () {
  const cfg = () => (typeof window !== 'undefined' && window.BB_TEASER_CONFIG) || {};
  const FULL_PROJECT = 'https://brok3nbydesign.com/bid-and-buried.html';
  const CANVAS_W = 540, CANVAS_H = 376;
  const LX = 12, LY = 34;                         // where the frame sits on the teaser canvas
  const reduceMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  // ---- storage, tolerated when blocked ----
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* blocked: fine */ } },
  };

  // ---- the parent page, if any (README: "Embedding") ----
  const embedded = (() => { try { return window.parent && window.parent !== window; } catch (e) { return false; } })();
  function post(event, extra) {
    const origin = cfg().parentOrigin;
    if (!origin || !embedded || origin === '*' || !/^https?:\/\/[^/]+$/.test(origin)) return;
    try { window.parent.postMessage(Object.assign({ type: 'bb-teaser', v: 1, event }, extra || {}), origin); } catch (e) { /* no listener, no harm */ }
  }
  let _lastH = 0;
  function postHeight() {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (h !== _lastH) { _lastH = h; post('resize', { height: h }); }
  }

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const canvas = $('scene');
  const g = canvas.getContext('2d');
  const panel = $('panel');
  const statusEl = $('status');
  const titleEl = $('sceneTitle');
  const seedLine = $('seedLine');

  // ---- state ----
  const S = {
    lk: null, phase: 'door', finds: [], kept: [], cap: 0,
    token: 0,                     // bumped on every new locker; stale callbacks check it
    gloom: 1, open: 1,            // 1 = dark past the front row / door fully up
    anims: [], raf: 0, hover: null, picked: null,
    sound: false, lastSig: null, seedFromUrl: null, startPhase: null,
    done: false,
  };

  // ---- sound: a few synthesized notes, off until asked for ----
  let AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } return AC; }
  function tone(freq, dur, type, gain, when) {
    const c = ac(); if (!c || !S.sound) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator(), v = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(v); v.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function thud(dur, gain) {
    const c = ac(); if (!c || !S.sound) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const v = c.createGain(); v.gain.value = gain || 0.5;
    src.connect(f); f.connect(v); v.connect(c.destination); src.start();
  }
  const SFX = {
    click() { tone(880, 0.05, 'square', 0.04); },
    pull(it) { thud(0.16, it.size >= 6 ? 0.7 : 0.4); },
    coin() { tone(1320, 0.09, 'sine', 0.07); tone(1760, 0.14, 'sine', 0.07, 0.07); },
    tier(name) {
      if (name === 'good') tone(660, 0.12, 'triangle', 0.06);
      else if (name === 'rare') { tone(660, 0.1, 'triangle', 0.06); tone(990, 0.16, 'triangle', 0.06, 0.09); }
      else if (name === 'epic' || name === 'LEGENDARY') { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, i * 0.09)); }
    },
    door() { thud(0.5, 0.35); },
    van() { tone(220, 0.2, 'sawtooth', 0.05); tone(196, 0.3, 'sawtooth', 0.05, 0.15); },
  };
  function setSound(on) {
    S.sound = !!on;
    const b = $('btnSound');
    b.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
    b.textContent = 'Sound: ' + (S.sound ? 'on' : 'off');
    store.set('bbTeaserSound', S.sound ? '1' : '0');
    if (S.sound) { const c = ac(); if (c && c.state === 'suspended') c.resume(); SFX.click(); }
  }

  // ---- drawing: the game's own locker frame (js/game.js drawLockerFrame, drawDoorwayGloom) ----
  function drawFrame(x, y, openFrac, fw) {
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
  function drawGloom(x, y, fw, alpha) {
    const grd = g.createLinearGradient(0, y, 0, y + LK.frameH);
    grd.addColorStop(0, 'rgba(4,5,11,' + (0.88 * alpha).toFixed(3) + ')');
    grd.addColorStop(0.55, 'rgba(4,5,11,' + (0.48 * alpha).toFixed(3) + ')');
    grd.addColorStop(1, 'rgba(4,5,11,' + (0.04 * alpha).toFixed(3) + ')');
    g.fillStyle = grd;
    g.fillRect(x + 1, y + 1, fw - 2, LK.frameH - 6);
  }
  // a sprite, or the mystery crate when one cannot be drawn (missing art is a crate, on purpose)
  function spriteFor(it, shade) {
    try { return getSprite(it.spr, it.pal, it.cond, it.uid, shade); }
    catch (e) { try { return getSprite('mystery', 'wood', 'Dusty', 1, shade); } catch (e2) { return null; } }
  }
  function visibleItems() {
    if (!S.lk) return [];
    return S.phase === 'door' ? S.lk.items.filter((it) => it.layer === 2) : S.lk.items;
  }
  function draw() {
    const lk = S.lk;
    px(g, 0, 0, CANVAS_W, CANVAS_H, '#14161f');
    if (!lk) return;
    const fw = lkFrameW(lk);
    drawFrame(LX, LY, S.open, fw);
    if (S.open <= 0.02) return;
    g.save();
    g.beginPath();
    g.rect(LX, LY + (LK.frameH - 6) * (1 - S.open), fw, (LK.frameH - 6) * S.open + 6);
    g.clip();
    if (S.gloom > 0) drawGloom(LX, LY, fw, S.gloom);
    const items = visibleItems();
    for (let layer = 0; layer <= 2; layer++) {
      for (const it of items) {
        if (it.layer !== layer) continue;
        const p = itemDrawPos(LX, LY, it);
        const shade = layer === 0 ? 2 : (layer === 1 ? 1 : 0);
        const spr = spriteFor(it, shade);
        px(g, p.x + 4, p.y + p.h - 3, p.w - 8, 4, 'rgba(0,0,0,0.35)');
        if (spr) g.drawImage(spr, p.x, p.y, p.w, p.h);
        else { px(g, p.x, p.y, p.w, p.h, PAL.dwood); }
      }
    }
    // things on their way out
    for (const a of S.anims) {
      if (a.kind !== 'pull') continue;
      const p = a.pos, t = a.t;
      g.globalAlpha = 1 - t;
      if (a.spr) g.drawImage(a.spr, p.x, p.y - t * 46, p.w, p.h);
      g.globalAlpha = 1;
    }
    // the picked (door phase) or hovered item gets the game's outline
    const mark = S.picked || S.hover;
    if (mark && items.includes(mark)) {
      const p = itemDrawPos(LX, LY, mark);
      g.strokeStyle = S.phase === 'door' ? PAL.gray : PAL.yellow; g.lineWidth = 2;
      g.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    }
    g.restore();
  }

  // ---- animation: only runs while something moves; sleeps when the tab is hidden ----
  let _lastTs = 0;
  function tick(ts) {
    S.raf = 0;
    const dt = Math.min(0.05, (ts - (_lastTs || ts)) / 1000);
    _lastTs = ts;
    let busy = false;
    for (const a of S.anims) { a.t = Math.min(1, a.t + dt / a.dur); if (a.t < 1) busy = true; }
    S.anims = S.anims.filter((a) => a.t < 1 || (a.onDone && (a.onDone(), false)));
    if (S.openTarget != null && S.open !== S.openTarget) { S.open = Math.min(S.openTarget, S.open + dt * 2.2); busy = true; }
    if (S.gloomTarget != null && S.gloom !== S.gloomTarget) { S.gloom = Math.max(S.gloomTarget, S.gloom - dt * 2.4); busy = true; }
    draw();
    if (busy && !document.hidden) S.raf = requestAnimationFrame(tick);
    else { _lastTs = 0; if (busy) S.paused = true; }
  }
  function animating() { return S.anims.length > 0 || (S.openTarget != null && S.open !== S.openTarget) || (S.gloomTarget != null && S.gloom !== S.gloomTarget); }
  function kick() {
    if (document.hidden) { S.paused = true; return; }
    if (!S.raf) { _lastTs = 0; S.raf = requestAnimationFrame(tick); }
    // frames stop when a tab is hidden, minimised or throttled: if a half-second
    // animation is still going after this long, it is not going to finish on its own
    clearTimeout(S.wd);
    const tok = S.token;
    S.wd = setTimeout(() => { if (tok !== S.token || !animating()) return; if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; } settle(); }, 1500);
  }
  function resume() { if (!document.hidden && animating()) { S.paused = false; kick(); } }
  function settle() {                 // reduced motion, a new locker, or a stalled frame loop: no in-betweens
    clearTimeout(S.wd);
    for (const a of S.anims) { a.t = 1; if (a.onDone) a.onDone(); }
    S.anims = [];
    if (S.openTarget != null) S.open = S.openTarget;
    if (S.gloomTarget != null) S.gloom = S.gloomTarget;
    draw();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; } S.paused = animating(); }
    else resume();
  });
  window.addEventListener('focus', resume);
  window.addEventListener('pageshow', resume);

  // ---- pointer on the canvas ----
  function canvasPoint(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (CANVAS_W / r.width), y: (ev.clientY - r.top) * (CANVAS_H / r.height) };
  }
  function itemAt(pt) {
    const items = visibleItems();
    // topmost first: front layer, stacked things before what they sit on
    const order = items.slice().sort((a, b) => (b.layer - a.layer) || ((b.onUid ? 1 : 0) - (a.onUid ? 1 : 0)));
    for (const it of order) {
      const p = itemDrawPos(LX, LY, it);
      if (pt.x >= p.x && pt.x < p.x + p.w && pt.y >= p.y && pt.y < p.y + p.h) return it;
    }
    return null;
  }
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    const it = itemAt(canvasPoint(ev));
    if (it !== S.hover) { S.hover = it; canvas.style.cursor = it ? 'pointer' : 'default'; draw(); }
  });
  canvas.addEventListener('pointerleave', () => { if (S.hover) { S.hover = null; draw(); } });
  canvas.addEventListener('click', (ev) => {
    const it = itemAt(canvasPoint(ev));
    if (!it) return;
    if (S.phase === 'door') pickAtDoor(it);
    else if (S.phase === 'dig') tryPull(it);
  });

  // ---- helpers for the panel ----
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function iconCanvas(it, size) {
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr; c.height = size * dpr; c.className = 'ico'; c.setAttribute('aria-hidden', 'true');
    const cg = c.getContext('2d');
    cg.imageSmoothingEnabled = false;
    const spr = spriteFor(it, 0);
    if (spr) {
      const sc = Math.min((size * dpr) / spr.width, (size * dpr) / spr.height, 2 * dpr);
      const dw = Math.max(1, Math.round(spr.width * sc)), dh = Math.max(1, Math.round(spr.height * sc));
      cg.drawImage(spr, Math.round((size * dpr - dw) / 2), Math.round((size * dpr - dh) / 2), dw, dh);
    }
    return c;
  }
  function button(label, cls, onClick) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.type = 'button';
    b.addEventListener('click', () => { SFX.click(); onClick(); });
    return b;
  }
  function say(text) { statusEl.textContent = text || ''; }
  function focusLater(node) { if (node) setTimeout(() => { try { node.focus({ preventScroll: false }); } catch (e) { /* ok */ } }, 0); }   // a timer, not a frame: frames can stop, focus must not
  function describeScene() {
    const lk = S.lk;
    if (!lk) return 'Storage unit, door closed.';
    if (S.phase === 'door') {
      const names = frontRow(lk).map(baseName);
      return 'Storage unit ' + lk.num + ', door up. Front row, left to right: ' + names.join(', ') + '. It is dark behind them.';
    }
    if (S.phase === 'dig') return 'Storage unit ' + lk.num + ', ' + lk.items.length + ' things still inside, lit front to back.';
    return 'Storage unit ' + lk.num + ', emptied.';
  }
  function setTitle() {
    const lk = S.lk;
    titleEl.textContent = '';
    titleEl.append('UNIT ' + lk.num + ' ');
    const sm = el('small', null, '· 5x5 · Dusty Flats');
    titleEl.appendChild(sm);
    canvas.setAttribute('aria-label', describeScene());
    seedLine.textContent = '';
    const a = el('a', null, 'locker #' + lk.seed);
    a.href = '?seed=' + lk.seed;
    a.title = 'This exact locker again';
    seedLine.append('· ', a);
  }

  // ================= phases =================
  function newLocker(seed) {
    S.token++;
    S.anims = [];
    clearTimeout(S.wd);
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    S.paused = false;
    S.lk = nextTeaserLocker(S.lastSig, seed);
    S.lastSig = S.lk.sig;
    S.finds = []; S.kept = []; S.cap = 0; S.picked = null; S.hover = null; S.done = false;
    S.phase = 'door';
    S.gloom = 1; S.gloomTarget = null;
    S.open = reduceMotion() ? 1 : 0; S.openTarget = 1;
    setTitle();
    renderDoor();
    say('');
    if (S.open < 1) { SFX.door(); kick(); } else draw();
    postHeight();
  }

  // ---- door: look from the doorway ----
  function renderDoor() {
    const lk = S.lk;
    panel.innerHTML = '';
    const h = el('h2', null, 'LOOK FROM THE DOOR'); h.tabIndex = -1;
    panel.appendChild(h);
    panel.appendChild(el('p', 'lead', 'You can see the front row. It is dark past that. The door and the office are the only clues.'));
    panel.appendChild(el('p', 'quote', teaserDoorLine(lk)));
    panel.appendChild(el('p', 'owner', teaserOwnerLine(lk)));
    panel.appendChild(el('h3', null, 'What you can see (tap one)'));
    const ul = el('ul', 'items'); ul.id = 'frontList';
    for (const it of frontRow(lk)) {
      const li = el('li');
      const b = el('button', 'item front'); b.type = 'button';
      b.setAttribute('aria-label', baseName(it) + ', front row. What does the yard know?');
      b.appendChild(iconCanvas(it, 40));
      const nm = el('span', 'name', baseName(it));
      b.appendChild(nm);
      b.dataset.uid = it.uid;
      b.addEventListener('click', () => pickAtDoor(it));
      li.appendChild(b); ul.appendChild(li);
    }
    panel.appendChild(ul);
    const hint = el('div', 'hint'); hint.id = 'doorHint'; hint.setAttribute('aria-live', 'polite');
    hint.textContent = 'Tap a thing in the front row and the yard tells you what it knows.';
    panel.appendChild(hint);
    const priceP = el('p', null); priceP.style.marginTop = '12px';
    priceP.appendChild(el('span', 'muted', 'Buzz opens at '));
    priceP.appendChild(el('span', 'price', fmt$(lk.price)));
    priceP.appendChild(el('span', 'muted', '. No rivals today: this is the teaser, not the auction.'));
    panel.appendChild(priceP);
    const act = el('div', 'actions');
    act.appendChild(button('Buy it · ' + fmt$(lk.price), 'primary', startDig));
    act.appendChild(button('Walk away (new locker)', 'ghost', () => newLocker()));
    panel.appendChild(act);
    focusLater(h);
  }
  function pickAtDoor(it) {
    S.picked = it;
    draw();
    const hint = $('doorHint');
    if (hint) hint.textContent = peekHint(it);
    for (const b of panel.querySelectorAll('#frontList .item')) b.classList.toggle('selected', Number(b.dataset.uid) === it.uid);
    SFX.click();
  }

  // ---- dig: front to back ----
  function startDig() {
    S.phase = 'dig';
    S.picked = null;
    S.gloomTarget = 0;
    if (reduceMotion()) S.gloom = 0;
    canvas.setAttribute('aria-label', describeScene());
    renderDig(null, true);
    say('Sold. Yours for ' + fmt$(S.lk.price) + '. Now dig it out, front to back.');
    kick();
    postHeight();
  }
  function renderDig(newFinds, entering) {
    const lk = S.lk;
    panel.innerHTML = '';
    const h = el('h2', null, 'DIG IT OUT'); h.tabIndex = -1;
    panel.appendChild(h);
    if (entering) focusLater(h);
    panel.appendChild(el('p', 'lead', lk.items.length
      ? 'Front stuff first. Anything behind something is blocked until that is out of the way. Boxes open on the tailgate.'
      : 'Empty. The scrap man is already looking at the pile.'));
    if (lk.items.length) {
      panel.appendChild(el('h3', null, 'Still in the unit (' + lk.items.length + ')'));
      const ul = el('ul', 'items'); ul.id = 'pileList';
      for (const it of pileOrder(lk)) {
        const li = el('li');
        const b = el('button', 'item' + (it.layer === 2 ? ' front' : '')); b.type = 'button';
        const acc = isAccessible(it, lk.items);
        const where = (['back row', 'middle', 'front row'][it.layer]) + (it.onUid ? ', on top' : '');
        if (!acc) b.setAttribute('aria-disabled', 'true');
        b.setAttribute('aria-label', baseName(it) + ', ' + where + (acc ? '. Pull it out.' : '. Blocked: pull what is in front of it first.'));
        b.appendChild(iconCanvas(it, 40));
        const nm = el('span', 'name', baseName(it));
        nm.appendChild(el('span', 'sub', where));
        b.appendChild(nm);
        b.dataset.uid = it.uid;
        b.addEventListener('click', () => tryPull(it));
        li.appendChild(b); ul.appendChild(li);
      }
      panel.appendChild(ul);
    }
    panel.appendChild(el('h3', null, 'Your finds (' + S.finds.length + ')'));
    const finds = el('div', 'finds'); finds.id = 'findList';
    if (!S.finds.length) finds.appendChild(el('p', 'muted', 'Nothing yet. Pull something.'));
    for (let i = S.finds.length - 1; i >= 0; i--) finds.appendChild(findCard(S.finds[i], newFinds && newFinds.includes(S.finds[i])));
    panel.appendChild(finds);
    const act = el('div', 'actions');
    const load = button(lk.items.length ? 'Stop digging · load the van' : 'Load the van', lk.items.length ? 'warm' : 'primary', startKeep);
    if (!S.finds.length) load.disabled = true;
    load.id = 'btnLoad';
    act.appendChild(load);
    panel.appendChild(act);
  }
  function findCard(it, isNew) {
    const tier = findTier(it);
    const c = el('div', 'card' + (it.fromLoot ? ' loot' : '') + (isNew ? ' new' : ''));
    c.style.setProperty('--tier', tier.col);
    c.appendChild(iconCanvas(it, 48));
    c.appendChild(el('div', 'name', (it.fromLoot ? 'inside: ' : '') + it.name));
    c.appendChild(el('div', 'val', it.cash ? '+' + fmt$(it.val) : findValueLabel(it)));
    const catLabel = CATS[it.cat] ? CATS[it.cat].label : it.cat;
    const tierLabel = tier.name.toLowerCase() === String(catLabel).toLowerCase() ? tier.name : tier.name + ' · ' + catLabel;
    c.appendChild(el('div', 'tier', it.cash ? 'cash · in your pocket' : (tierLabel + (it.size ? ' · bulk ' + it.size : ''))));
    const d = findDetail(it);
    if (d) c.appendChild(el('div', 'detail', d));
    return c;
  }
  function tryPull(it) {
    if (S.phase !== 'dig' || !S.lk) return;
    if (!isAccessible(it, S.lk.items)) { say('Pull what is in front of it first.'); SFX.click(); return; }
    const pos = itemDrawPos(LX, LY, it);
    const spr = spriteFor(it, it.layer === 0 ? 2 : (it.layer === 1 ? 1 : 0));
    const finds = pullFind(S.lk, it);
    if (!finds) return;
    for (const f of finds) { if (f !== it) f.fromLoot = true; S.finds.push(f); }
    SFX.pull(it);
    let best = 'junk';
    const RANK = { junk: 0, common: 1, good: 2, rare: 3, epic: 4, LEGENDARY: 5 };
    for (const f of finds) {
      if (f.cash) SFX.coin();
      const t = findTier(f).name;
      if (RANK[t] > RANK[best]) best = t;
    }
    if (RANK[best] >= 2) setTimeout(((tok) => () => { if (tok === S.token) SFX.tier(best); })(S.token), 160);
    if (!reduceMotion()) { S.anims.push({ kind: 'pull', pos, spr, t: 0, dur: 0.42 }); kick(); } else draw();
    const cashHere = finds.filter((f) => f.cash).reduce((a, f) => a + f.val, 0);
    const words = [it.name + (it.loot && it.loot.length ? ', with ' + it.loot.length + ' thing' + (it.loot.length === 1 ? '' : 's') + ' inside' : '')];
    if (!it.cash) words.push(findValueLabel(it));
    if (cashHere) words.push('cash ' + fmt$(cashHere));
    say('Pulled: ' + words.join(' · ') + '.');
    canvas.setAttribute('aria-label', describeScene());
    renderDig(finds);
    // keep the keyboard where the work is: the next thing that can come out, else the van
    const next = panel.querySelector('#pileList .item:not([aria-disabled="true"])');
    focusLater(next || $('btnLoad'));
    postHeight();
  }

  // ---- keep: what fits in the van ----
  function startKeep() {
    if (!S.finds.length) return;
    S.phase = 'keep';
    S.cap = vanCapFor(S.finds);
    S.kept = [];
    S.gloomTarget = null;
    canvas.setAttribute('aria-label', describeScene());
    settle();
    renderKeep();
    say('Van space: ' + S.cap + ' bulk. Choose what rides home.');
    postHeight();
  }
  function keptBulk() { return S.kept.reduce((a, f) => a + (f.size || 1), 0); }
  function renderKeep() {
    panel.innerHTML = '';
    const h = el('h2', null, 'WHAT WOULD YOU KEEP?'); h.tabIndex = -1;
    panel.appendChild(h);
    panel.appendChild(el('p', 'lead', 'The van holds ' + S.cap + ' bulk. What stays goes to the scrap man, and the town sometimes notices.'));
    const van = el('div', 'van');
    const bar = el('div', 'bar'); bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', 'Van space used');
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', String(S.cap)); bar.setAttribute('aria-valuenow', String(keptBulk()));
    const fill = el('span'); fill.style.width = Math.round(100 * keptBulk() / S.cap) + '%';
    if (keptBulk() >= S.cap) bar.classList.add('full');
    bar.appendChild(fill);
    van.appendChild(el('span', 'num', 'VAN'));
    van.appendChild(bar);
    van.appendChild(el('span', 'num', keptBulk() + ' / ' + S.cap));
    panel.appendChild(van);
    const list = el('div', 'keep-list');
    const goods = S.finds.filter((f) => !f.cash);
    for (const f of goods) {
      const inVan = S.kept.includes(f);
      const fits = inVan || keptBulk() + (f.size || 1) <= S.cap;
      const row = el('div', 'keep-row' + (inVan ? ' in' : ''));
      row.appendChild(iconCanvas(f, 40));
      const nm = el('div', 'name', f.name);
      const tier = findTier(f);
      nm.style.color = tier.col;
      nm.appendChild(el('div', 'sub', findValueLabel(f) + ' · bulk ' + (f.size || 1) + (fits || inVan ? '' : ' · will not fit')));
      row.appendChild(nm);
      const b = button(inVan ? 'In the van' : 'Keep', inVan ? 'primary small' : 'ghost small', () => toggleKeep(f));
      b.setAttribute('aria-pressed', inVan ? 'true' : 'false');
      b.setAttribute('aria-label', (inVan ? 'Take out of the van: ' : 'Keep: ') + f.name);
      if (!fits) { b.setAttribute('aria-disabled', 'true'); b.disabled = true; }
      row.appendChild(b);
      list.appendChild(row);
    }
    if (!goods.length) list.appendChild(el('p', 'muted', 'Nothing but cash came out. Cash rides in your pocket.'));
    panel.appendChild(list);
    const cash = S.finds.filter((f) => f.cash).reduce((a, f) => a + f.val, 0);
    if (cash) panel.appendChild(el('p', 'cash-line', 'Cash in hand: ' + fmt$(cash) + ' (already yours, takes no room)'));
    const act = el('div', 'actions');
    act.appendChild(button('Drive home', 'primary', finish));
    panel.appendChild(act);
  }
  function toggleKeep(f) {
    const i = S.kept.indexOf(f);
    if (i >= 0) S.kept.splice(i, 1);
    else if (keptBulk() + (f.size || 1) <= S.cap) S.kept.push(f);
    else { say('Will not fit. Take something out first.'); return; }
    say(S.kept.includes(f) ? f.name + ' is in the van. ' + keptBulk() + ' of ' + S.cap + ' used.' : f.name + ' left on the pile.');
    const idx = Array.from(panel.querySelectorAll('.keep-row .btn')).findIndex((b) => b.getAttribute('aria-label').endsWith(f.name));
    renderKeep();
    const btns = panel.querySelectorAll('.keep-row .btn');
    focusLater(btns[idx] || btns[0]);
  }

  // ---- done: the haul ----
  function finish() {
    S.phase = 'done';
    S.done = true;
    SFX.van();
    const sum = haulSummary(S.lk, S.finds, S.kept, S.lk.price);
    panel.innerHTML = '';
    const h = el('h2', null, 'THE HAUL'); h.tabIndex = -1;
    panel.appendChild(h);
    panel.appendChild(el('p', 'headline', sum.headline));
    const t = el('table', 'tally');
    const rows = [['Paid at the door', '-' + fmt$(S.lk.price)], ['In the van (' + S.kept.length + ')', fmt$(sum.keptVal)], ['Cash found', fmt$(sum.cash)], ['Left for the scrap man', fmt$(sum.leftVal)]];
    for (const [k, v] of rows) { const tr = el('tr'); tr.appendChild(el('td', null, k)); tr.appendChild(el('td', null, v)); t.appendChild(tr); }
    const net = el('tr', 'net' + (sum.net < 0 ? ' loss' : '')); net.appendChild(el('td', null, 'Net, before the buyers haggle')); net.appendChild(el('td', null, (sum.net < 0 ? '-' : '+') + fmt$(Math.abs(sum.net)))); t.appendChild(net);
    panel.appendChild(t);
    const ul = el('ul', 'lines');
    for (const line of sum.lines) ul.appendChild(el('li', null, line));
    panel.appendChild(ul);
    if (sum.best) {
      panel.appendChild(el('h3', null, 'Best thing in the van'));
      const b = findCard(sum.best, false); b.classList.add('best'); b.classList.remove('loot');
      panel.appendChild(b);
    }
    panel.appendChild(el('p', 'muted', 'In the full game the buyers, the paper and the rivals all have something to say about this tomorrow.')).style.marginTop = '10px';
    const act = el('div', 'actions');
    act.appendChild(button('New locker', 'primary', () => newLocker()));
    act.appendChild(button('Restart this unit', 'ghost', () => newLocker(S.lk.seed)));
    const a = el('a', 'btn warm', 'The full project →'); a.href = FULL_PROJECT; a.rel = 'noopener';
    act.appendChild(a);
    panel.appendChild(act);
    say('Home. ' + sum.headline);
    canvas.setAttribute('aria-label', describeScene());
    focusLater(h);
    post('completed', { seed: S.lk.seed, found: S.finds.length, kept: S.kept.length });
    postHeight();
  }

  // ================= boot =================
  function boot() {
    let q = {};
    try { q = Object.fromEntries(new URLSearchParams(location.search)); } catch (e) { q = {}; }
    S.seedFromUrl = parseSeed(q.seed);
    S.startPhase = q.start || null;
    setSound(store.get('bbTeaserSound') === '1');
    $('btnNew').addEventListener('click', () => { SFX.click(); newLocker(); });
    $('btnRestart').addEventListener('click', () => { SFX.click(); if (S.lk) newLocker(S.lk.seed); });
    $('btnSound').addEventListener('click', () => setSound(!S.sound));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = CANVAS_W * dpr; canvas.height = CANVAS_H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    newLocker(S.seedFromUrl);
    if (S.startPhase === 'dig') { settle(); startDig(); settle(); }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => postHeight()).observe(document.documentElement);
    window.addEventListener('load', postHeight);
    post('ready', { height: Math.ceil(document.documentElement.getBoundingClientRect().height) });
    // fonts land late on a slow line; the canvas has no text, so nothing waits on them
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(postHeight).catch(() => {});
  }
  // a hook for tests and for the studio page, read-only
  window.BB_TEASER = { state: S, newLocker, version: 1 };
  boot();
})();
