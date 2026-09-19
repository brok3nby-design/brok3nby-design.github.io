// ---- hands: keyboard and controller, over the same hotspots the mouse uses ----
// Every screen already lists what can be clicked (hotspots, rebuilt each
// frame). Focus is a rectangle remembered between frames and re-found by its
// geometry; arrows and the d-pad move it to the nearest target in that
// direction, Enter and A press it, Escape and B back out, PageUp/PageDown and
// the bumpers scroll where the wheel scrolls, Start pauses. The focused thing
// counts as hovered, so tooltips and highlights come for free. Focus switches
// on at the first key or pad input and off at the first mouse movement. The
// ring is drawn last, after everything else.
'use strict';

// what to land on when a screen changes and the old target is gone (tried in order, by button label)
const FOCUS_DEFAULT = {
  title: [/^CONTINUE/, /^NEW GAME/],
  seedpick: [/^DIG THIS WORLD/],
  yard: [/^LOOK INSIDE|^BID BLIND/, /^GO HOME/],
  peek: [/^JOIN  \(/, /^WALK AWAY/],           // JOIN (5 ENERGY), then WALK AWAY
  auction: [/^STOP HERE|^KEEP PUSHING/, /^SAY: /, /^CALL THEM OUT|^CALLED OUT/, /^\$[\d,]+$/, /^(LOUD|QUIET)  \(|^STEADY$/, /^START |^BID \+|^IN \+/, /^START DIGGING|^LET IT GO|^OUT$|^BACK TO THE YARD/],
  dig: [/^LOAD IT/, /^LOAD UP/],
  reveal: [/^PICK IT UP|^PUT IT ON THE TABLE/],
  arrive: [/^CONTINUE/],
  credits: [/^CONTINUE/],
  sell: [/^END DAY/],
  summary: [/^NEXT DAY/],
  paper: [/^PUT THE PAPER DOWN/],
  map: [/^DRIVE OUT|^CANCEL THE TRIP/, /^BACK TO THE YARD/],
  codex: [/^BACK/],
  tv: [/^SKIP|^TURN IT OFF/],
  closed: [/^BACK TO THE MENU/],
  pause: [/^RESUME/],
  modal: [/^MAKE AN OFFER/, /./],
  inspect: [/^SEARCH|^▸/, /^DONE/],
};
const focus = { on: false, rect: null, pad: { buttons: [], held: null, repeatAt: 0 } };

function focusTargets() { return hotspots.filter((h) => h.focusable !== false && h.w > 0 && h.h > 0); }
function focusKey() { return G.paused ? 'pause' : (G.modal ? 'modal' : (G.homeInspect ? 'inspect' : G.mode)); }
// the target under the remembered rectangle, if this frame still has it
function focusCurrent() {
  const r = focus.rect;
  if (!r) return null;
  return focusTargets().find((h) => h.x === r.x && h.y === r.y && h.w === r.w && h.h === r.h) || null;
}
function focusSet(h) {
  focus.rect = h ? { x: h.x, y: h.y, w: h.w, h: h.h } : null;
  if (h) { mouse.x = h.x + h.w / 2; mouse.y = h.y + h.h / 2; }   // focus is hover
}
function focusDefault() {
  const all = focusTargets();
  if (!all.length) return null;
  // greyed buttons can be focused now (so their hint can be read), but a screen never OPENS on one
  const live = all.filter((h) => !h.disabled);
  const ts = live.length ? live : all;
  for (const re of (FOCUS_DEFAULT[focusKey()] || [])) {
    const m = ts.find((h) => h.label && re.test(h.label));
    if (m) return m;
  }
  if (focus.rect) {
    const cx = focus.rect.x + focus.rect.w / 2, cy = focus.rect.y + focus.rect.h / 2;
    return ts.reduce((a, b) => (dist2(b, cx, cy) < dist2(a, cx, cy) ? b : a));
  }
  return ts.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
}
function dist2(h, x, y) { const dx = h.x + h.w / 2 - x, dy = h.y + h.h / 2 - y; return dx * dx + dy * dy; }
// wake the ring; the press that wakes it does nothing else (returns true when it just woke)
function focusOn() {
  const woke = !focus.on;
  focus.on = true;
  if (!focusCurrent()) focusSet(focusDefault());
  return woke;
}
// nearest target in a direction: the gap between edges along the axis, and a heavy penalty for drifting across it
function focusMove(dx, dy) {
  if (focusOn()) return;
  const cur = focusCurrent() || focusDefault();
  if (!cur) return;
  if (dx && cur.onAxis) { cur.onAxis(dx); return; }       // a fader: left and right turn it instead of leaving it
  const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
  let best = null, bestD = Infinity;
  for (const h of focusTargets()) {
    if (h === cur || (h.x === cur.x && h.y === cur.y && h.w === cur.w && h.h === cur.h)) continue;
    const hx = h.x + h.w / 2, hy = h.y + h.h / 2;
    let gap, drift;
    if (dx) {
      if ((hx - cx) * dx <= 0) continue;
      gap = dx > 0 ? h.x - (cur.x + cur.w) : cur.x - (h.x + h.w);
      drift = Math.abs(hy - cy);
    } else {
      if ((hy - cy) * dy <= 0) continue;
      gap = dy > 0 ? h.y - (cur.y + cur.h) : cur.y - (h.y + h.h);
      drift = Math.abs(hx - cx);
    }
    const d = Math.max(0, gap) + drift * 2.5;
    if (d < bestD) { bestD = d; best = h; }
  }
  if (best) focusSet(best);
}
// Tab: reading order, rows first
function focusStep(dir) {
  if (focusOn()) return;
  const ts = focusTargets().slice().sort((a, b) => (Math.round(a.y / 8) - Math.round(b.y / 8)) || (a.x - b.x));
  if (!ts.length) return;
  const cur = focusCurrent();
  let i = cur ? ts.indexOf(cur) : -1;
  i = (i + dir + ts.length) % ts.length;
  focusSet(ts[i]);
}
function focusActivate() {
  if (focusOn()) return;
  const h = focusCurrent() || focusDefault();
  if (!h) return;
  focusSet(h);
  initAudio();
  h.cb(h.x + h.w / 2, h.y + h.h / 2);
}

// ---- keyboard ----
window.addEventListener('keyup', (e) => { if (e.key === ' ' && typeof paddleRelease === 'function' && G.auction && G.auction.paddleHeld) paddleRelease(); });
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const nav = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (nav[e.key]) { e.preventDefault(); focusMove(nav[e.key][0], nav[e.key][1]); }
  else if (e.key === ' ' && typeof paddleWantsKey === 'function' && paddleWantsKey()) { e.preventDefault(); if (!e.repeat) paddlePress(); }   // Space is the paddle while it is live
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusActivate(); }
  else if (e.key === 'Tab') { e.preventDefault(); focusStep(e.shiftKey ? -1 : 1); }
  else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); handleWheel(e.key === 'PageUp' ? -1 : 1); }
});

// ---- controller (standard mapping: A press, B back, bumpers scroll, Start pause, d-pad or left stick move) ----
function focusTick() {
  const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : null;
  if (!pads) return;
  let gp = null;
  for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected !== false) { gp = pads[i]; break; }
  if (!gp) return;
  const P = focus.pad;
  P.rx = gp.axes[2] || 0; P.ry = gp.axes[3] || 0;     // the right stick: the peek's torch (torchNow)
  const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const edge = (i) => pressed(i) && !P.buttons[i];
  let dx = 0, dy = 0;
  if (pressed(14)) dx = -1; else if (pressed(15)) dx = 1;
  if (pressed(12)) dy = -1; else if (pressed(13)) dy = 1;
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  if (!dx && Math.abs(ax) > 0.5) dx = ax < 0 ? -1 : 1;
  if (!dy && Math.abs(ay) > 0.5) dy = ay < 0 ? -1 : 1;
  const now = performance.now();
  if (dx || dy) {
    const key = dx + ',' + dy;
    if (P.held !== key) { P.held = key; P.repeatAt = now + 350; focusMove(dx, dy); }
    else if (now >= P.repeatAt) { P.repeatAt = now + 130; focusMove(dx, dy); }
  } else P.held = null;
  // the A button is the paddle while it is live: down is a hand up, up is a hand down
  if (typeof paddleWantsKey === 'function' && paddleWantsKey()) { if (pressed(0)) paddlePress(); else if (G.auction && G.auction.paddleHeld) paddleRelease(); }
  else if (edge(0)) focusActivate();
  if (edge(1) || edge(9)) { focus.on = true; escapeAction(); }
  if (edge(4)) handleWheel(-1);
  if (edge(5)) handleWheel(1);
  P.buttons = [];
  for (let i = 0; i < gp.buttons.length; i++) P.buttons[i] = !!(gp.buttons[i] && gp.buttons[i].pressed);
}

// ---- the ring, drawn after everything else ----
function drawFocus() {
  if (!focus.on) return;
  const h = focusCurrent() || focusDefault();
  if (!h) return;
  focusSet(h);
  if (h.w * h.h > W * H * 0.5) return;               // the TV screen is the whole picture; a ring would frame nothing
  const pulse = 0.7 + 0.3 * Math.abs(Math.sin(G.time * 4));
  g.save();
  g.globalAlpha = pulse;
  px(g, h.x - 4, h.y - 4, h.w + 8, 2, PAL.ink); px(g, h.x - 4, h.y + h.h + 2, h.w + 8, 2, PAL.ink);
  px(g, h.x - 4, h.y - 4, 2, h.h + 8, PAL.ink); px(g, h.x + h.w + 2, h.y - 4, 2, h.h + 8, PAL.ink);
  px(g, h.x - 3, h.y - 3, h.w + 6, 2, PAL.yellow); px(g, h.x - 3, h.y + h.h + 1, h.w + 6, 2, PAL.yellow);
  px(g, h.x - 3, h.y - 3, 2, h.h + 6, PAL.yellow); px(g, h.x + h.w + 1, h.y - 3, 2, h.h + 6, PAL.yellow);
  g.restore();
}
