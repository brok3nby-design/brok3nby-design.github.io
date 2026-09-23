// ---- the walk down the row: all three doors, one look each, before you choose ----
// IDEAS_TODO 6, the user, 2026-09-17: "a cinematic introduction peek to each locker... a couple of items in
// the first locker, a couple in the second and a couple in the third, and they could mention this is the one
// in the newspaper... teasing all three lockers at once." And after it, "if a player does want to look in it
// again, they can" — so this never replaces the peek, it only walks you past the doors on the way to it.
//
// Trimmed on purpose, because the one real risk in the idea is that it runs in front of EVERY auction:
//   - ONE thing a door, not a couple — the same first thing the peek's tour would point at (peekTourPick), so
//     the door never tells you something at the rope and something else up close.
//   - WALK_SECS a door, click for the next, SKIP or Escape to leave. The user asked for three or four seconds;
//     two, which I first suggested, was too short to read a tenant's line and a hint in.
//   - NOT EVERY DAY: the first morning in a town, and any morning the paper's lead printed a door number
//     (walkDue). That is every day of the dealt opening week, where the user plays, and about a third of the
//     mornings after it, which keeps it an event rather than a toll.
// Nothing here is intelligence the doorway would not give you: the front row as the doorway shows it, the
// peek's own hint, the tenant, and the door's reason if it already has a public one. "THE ONE IN THE PAPER" is
// the number the paper PRINTED, which on some mornings is the paper being wrong — that is the player's problem.
'use strict';

const WALK_SECS = 3.0;            // one door at least: up, the eye goes to one thing, the name
const WALK_HOLD_MAX = 14;         // and at most, whatever Buzz is still saying

// ---- Buzz walks the row with you (user, 2026-09-19) ----
// "It's too quick. It should have Buzz introducing them, and various teaser things to say - things related to
// the owner sometimes, things related to an item in there. Like 'oh, that looks valuable, probably', and many
// other funny ways to pump up the locker." So each door gets one line of Buzz's hype, recorded as a take of
// its own (auc_tease_<kind>_NN: the caption and the voice are always the same words), picked for what the
// doorway actually shows: the kind of thing the light found, the tenant, the paper, a door packed to the roof
// or nearly empty. Hype, never intelligence: every line fits the door it is said about and none says what it
// is worth. The first door opens with his walk-on line and the last closes with his send-off. A door holds
// until he is done (or, with no take recorded, long enough to read him), so the walk is his pace now.
const TEASE = {
  any: [
    'Oh, that looks valuable. Probably.',
    "I've got a good feeling about this one, folks. I had a good feeling about lunch, too, and look how that went.",
    'Now THAT is a door with potential. Legally I have to say every door has potential.',
    "Somebody paid rent on this for years. You don't do that for nothing. Usually.",
    "Take a good look, folks. That's all you get. A look.",
    "I'm not saying there's treasure in there. I'm not saying there isn't. I'm saying bring money.",
    "Smell that? That's opportunity. Or mildew. Both, sometimes.",
    "If I didn't have this gavel, I'd be bidding on this one myself.",
  ],
  owner: [
    'The last tenant had taste. Questionable taste, but taste.',
    "Whoever rented this never missed a payment. Until they missed all of 'em.",
    'Whoever packed this knew exactly what they were doing. Or had no idea. Hard to say from here.',
    "Somebody's whole life in a ten-by-ten. Let's give it a good home. For money.",
  ],
  furniture: ['Solid wood, folks. I can tell from here. I can\'t, but I\'m confident.',
    "That's a piece of furniture your grandmother would've fought somebody for."],
  antiques: ['That is OLD. Old is good. Old is money. Old is also me.',
    "They don't make 'em like that anymore. They don't make 'em at all anymore."],
  music: ['Is that an instrument? Somebody had a dream, folks. Now you can have it.',
    'Music gear! Every band that ever broke up left something in a unit like this.'],
  tools: ["Tools! A working person's door. Heavy, honest, sells every time.",
    'Look at that. Somebody fixed things for a living. Somebody here is about to fix a price.'],
  electronics: ["Electronics! Does it work? Who knows! That's the fun!",
    'Plug that in and it could be worth a fortune. Or it could catch fire. Stand back and bid.'],
  jewelry: ["Something shiny back there, folks. I'm not saying gold. My eyes are saying gold.",
    'Small things are the dangerous ones. Small and shiny will ruin your whole budget.'],
  collectibles: ["Collectors, wake up. This one's for you. Everybody else, wake up anyway.",
    'Somebody collected that on purpose. On PURPOSE, folks.'],
  weird: ["I have no idea what that is. That's either very good or very bad.",
    "Now that's... something. I'll let you decide what."],
  boxes: ["Boxes, folks! Taped shut! Anything could be in a box. That's the whole point of a box.",
    "A lot of boxes back there. Most of them are boxes of boxes. One of them isn't."],
  paper: ['You read about this one in the paper, folks. So did everybody else.',
    "Front page! Well. Page three. It's in the paper, that's what counts."],
  full: ["Packed to the ceiling! You're gonna need a bigger van. Everybody always needs a bigger van."],
  empty: ["Not much up front. Sometimes that's where they hide the good stuff. Sometimes it's just empty."],
};
const WALK_START = 'Morning, folks! Let\'s take a little walk down the row before the paddles come out.';
const WALK_END = "That's the row. Look all you like. Then bid like you mean it.";
const WALK_FULL_BULK = 90, WALK_EMPTY_N = 4;
function teaseSlot(kind) { return 'auc_tease_' + kind; }
function teaseRecorded(base, take) { const v = typeof _snd !== 'undefined' && _snd[base]; return !!(v && v.some((e) => e.take === take)); }
// what the doorway shows, as the kinds of line that fit it
function teaseKinds(lk, it) {
  const out = [];
  const lead = G.today && G.today.facts && G.today.facts.lead;
  if (lead && lead.named === lk.num) out.push({ k: 'paper', w: 3 });
  if (it && !it.locked) {                    // a lockbox says what it is on its own label; he does not guess at it
    const cat = it.cat;
    if (TEASE[cat]) out.push({ k: cat, w: 2.5 });
    else if (it.container) out.push({ k: 'boxes', w: 2.5 });
  }
  if (lk.items.filter((x) => x.container && !x.locked).length >= 3) out.push({ k: 'boxes', w: 1 });
  const bulk = lk.items.reduce((a, x) => a + (x.size || 1), 0);
  if (bulk >= WALK_FULL_BULK) out.push({ k: 'full', w: 2 });
  else if (lk.items.length <= WALK_EMPTY_N) out.push({ k: 'empty', w: 2 });
  if (typeof tenantFor === 'function' && tenantFor(lk)) out.push({ k: 'owner', w: 1 });
  out.push({ k: 'any', w: 1.5 });
  return out;
}
// one line for this door: seeded on the morning and the door, never twice in one walk, and not one of the
// last few he said on earlier mornings if anything else fits
function pickTease(lk, it, used) {
  const R = RNG(strHash('tease_' + G.worldSeed + '_' + G.day + '_' + lk.num));
  const recent = (G.world && G.world.teaseRecent) || [];
  const opts = [];
  for (const c of teaseKinds(lk, it)) {
    const lines = TEASE[c.k];
    for (let i = 0; i < lines.length; i++) {
      const id = c.k + '_' + (i + 1);
      if (used.includes(id)) continue;
      opts.push({ id, k: c.k, take: i + 1, text: lines[i], w: c.w / lines.length * (recent.includes(id) ? 0.1 : 1) });
    }
  }
  if (!opts.length) return null;
  let r = R.f() * opts.reduce((a, o) => a + o.w, 0);
  for (const o of opts) { r -= o.w; if (r <= 0) return o; }
  return opts[opts.length - 1];
}
// what Buzz says at this door, in order: his walk-on first, his send-off last
function walkSay(w, i) {
  const lk = w.doors[i];
  const say = [];
  if (i === 0) say.push({ base: 'auc_walk_start', take: 0, text: WALK_START });
  const t = pickTease(lk, walkLook(lk), w.used);
  if (t) { w.used.push(t.id); say.push({ base: teaseSlot(t.k), take: t.take, text: t.text, id: t.id }); }
  if (i === w.doors.length - 1) say.push({ base: 'auc_walk_end', take: 0, text: WALK_END });
  return say;
}
// the line being said now: started once, its take played if there is one, finished when the voice is (or
// when it has been up long enough to read). True while there is still something to say at this door.
function walkSayTick(w) {
  const cur = w.say[w.sayI];
  if (!cur) return false;
  if (!cur.started) {
    cur.started = true; cur.t0 = w.t;
    const canHear = !_muted && !_voiceMuted && VOL.voice > 0;
    cur.rec = canHear && (cur.take ? teaseRecorded(cur.base, cur.take) : !!voEl(cur.base));
    if (cur.rec) { if (cur.take) speakTake(cur.base, cur.take, false); else speak([cur.base], false, { cooldown: 0 }); }
    if (cur.id) {
      const m = G.world; m.teaseRecent = (m.teaseRecent || []).filter((x) => x !== cur.id).concat([cur.id]).slice(-10);
    }
  }
  const up = w.t - cur.t0;
  const read = 1.4 + cur.text.split(/ +/).length / 3.2;
  const done = cur.rec ? (up > 0.5 && voIdle()) : up > read;
  if (done || up > WALK_HOLD_MAX) { w.sayI++; return w.sayI < w.say.length; }
  return true;
}
const WALK_OPEN = 0.45;           // the door going up
const WALK_LOOK = 0.6;            // the light finding the one thing

// is this a morning to walk the row
function walkDue() {
  if (G.demo || !_motion || !G.today || !G.today.lockers || !G.today.lockers.length) return false;
  if (G.today.walked) return false;                                   // once a morning
  const lead = G.today.facts && G.today.facts.lead;
  if (lead && lead.named) return true;                                // the paper printed a door number
  if (G.day === 1) return true;                                       // the first morning of a career
  // the first morning in a new town: the arrival is written down on the day it happens
  return eventsWhere('arrive').some((e) => e.day === G.day && e.first);
}
// the paper goes down: walk the row if the morning calls for it, otherwise straight to the yard
function leavePaper() {
  if (walkDue()) startWalk();
  else G.mode = 'yard';
}
function startWalk(back) {
  const doors = (G.today && G.today.lockers) || [];
  if (!doors.length) { G.mode = back || 'yard'; return false; }
  G.today.walked = true;
  G.walk = { i: 0, t: 0, doors, keepCur: G.cur, back: back || 'yard', rolled: false, used: [] };
  G.walk.say = walkSay(G.walk, 0); G.walk.sayI = 0;
  G.mode = 'walkdown';
  return true;
}
function walkNext() {
  const w = G.walk;
  if (!w) return;
  w.i++; w.t = 0; w.rolled = false;
  if (w.i >= w.doors.length) { walkEnd(); return; }
  if (typeof voFlush === 'function') voFlush(true);    // a click on: he stops mid-word, like anybody would
  w.say = walkSay(w, w.i); w.sayI = 0;
}
function walkEnd() {
  const w = G.walk;
  if (!w) return;
  G.walk = null;
  if (typeof voFlush === 'function') voFlush(true);
  G.cur = w.keepCur || null;           // peekVisibility reads G.cur: it was each door in turn, hand it back
  G.mode = w.back;
}
// the one thing the eye goes to at this door, and what the door says for itself
function walkLook(lk) {
  const saved = G.cur;
  G.cur = lk;
  const it = peekTourPick(lk)[0] || null;
  G.cur = saved;
  return it;
}
function walkTags(lk) {
  const tags = [];
  const lead = G.today && G.today.facts && G.today.facts.lead;
  if (lead && lead.named === lk.num) tags.push({ t: 'THE ONE IN THE PAPER', c: PAL.paper });
  if (lk.buzzTip) tags.push({ t: 'BUZZ’S TIP', c: PAL.gold });
  const r = typeof reasonShown === 'function' ? reasonShown(lk) : null;
  const rw = r && typeof reasonWords === 'function' ? reasonWords(r) : null;
  if (rw && rw.tag) tags.push({ t: rw.tag, c: rw.col || PAL.gold });
  return tags;
}

function drawWalk(dt) {
  const w = G.walk;
  if (!w) return;
  const lk = w.doors[w.i];
  if (!lk) { walkEnd(); return; }
  w.t += dt;
  G.cur = lk;                          // for peekVisibility and the mirror, exactly as the peek has it
  if (!drawBG()) px(g, 0, 0, W, H, '#171a24');
  drawTint();
  drawHeader('THE ROW  ·  ' + (w.i + 1) + ' OF ' + w.doors.length);
  if (!w.rolled) { w.rolled = true; play('door_roll', 0.35); }

  // the door, going up, at exactly the place and size the peek draws it
  const fw = lkFrameW(lk), lx = lkFrameX(lk), ly = 66;
  const up = clamp(w.t / WALK_OPEN, 0, 1);
  drawLockerFrame(lx, ly, up, fw);
  if (up >= 0.15) {
    g.save();
    g.beginPath();
    g.rect(lx, ly + (LK.frameH - 6) * (1 - up), fw, (LK.frameH - 6) * up + 6);
    g.clip();
    drawDoorwayGloom(lx, ly, fw);
    drawLockerItems(lx, ly, lk.items, { doorway: true });           // no hover, no clicks: you are walking past
    g.restore();
  }

  // the light finds one thing, and says what hovering it at the peek would say
  const it = walkLook(lk);
  let tip = null;
  if (it && w.t > WALK_LOOK) {
    const f = clamp((w.t - WALK_LOOK) / 0.35, 0, 1);
    const p = itemDrawPos(lx, ly, it);
    const dark = 'rgba(4,5,11,' + (0.6 * f).toFixed(2) + ')';
    const y1 = ly + LK.frameH;
    const bx0 = p.x - 10, by0 = p.y - 10, bx1 = p.x + p.w + 10, by1 = p.y + p.h + 10;
    px(g, lx, ly, fw, Math.max(0, by0 - ly), dark);
    px(g, lx, by1, fw, Math.max(0, y1 - by1), dark);
    px(g, lx, by0, Math.max(0, bx0 - lx), Math.max(0, by1 - by0), dark);
    px(g, bx1, by0, Math.max(0, lx + fw - bx1), Math.max(0, by1 - by0), dark);
    g.globalAlpha = f * (0.7 + 0.3 * Math.sin(G.time * 5)); g.strokeStyle = PAL.yellow; g.lineWidth = 3;
    g.strokeRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8); g.globalAlpha = 1;
    tip = { cx: p.x + p.w / 2, top: p.y, t: peekHint(it), a: f };
  }

  // the door's own card along the foot: its number, whose it was, and anything the town already says about it
  const cy = 400;
  px(g, 0, cy - 8, W, H - (cy - 8), 'rgba(8,9,15,0.8)');   // to the foot of the screen: the pips, the hint and SKIP sit on it too
  const ten = typeof tenantFor === 'function' ? tenantFor(lk) : null;
  T(40, cy, 'UNIT ' + lk.num + (ten ? '  ·  ' + ten.name : ''), PAL.yellow, 20, 'left', true);
  const says = ten ? ten.short : (lk.owner || '');
  if (says) {
    const fl = fitLines(says, 400, [16, 14, 13], 3);                 // the left half: Buzz has the right
    for (let k = 0; k < fl.lines.length; k++) T(40, cy + 28 + k * 19, fl.lines[k], PAL.gray, fl.fs, 'left');
  }
  let tx = 40;
  for (const tg of walkTags(lk)) {
    g.font = 'bold ' + textSize(12) + 'px ' + FONT;
    const tw = Math.ceil(g.measureText(tg.t).width) + 14;
    if (tx + tw > W - 40) break;
    if (tx + tw > 440) break;
    px(g, tx, cy + 88, tw, 20, 'rgba(40,36,24,0.9)');
    T(tx + 7, cy + 91, tg.t, tg.c, 12, 'left', true);
    tx += tw + 8;
  }

  // where you are on the row, and the way out
  for (let k = 0; k < w.doors.length; k++) px(g, W / 2 - w.doors.length * 9 + k * 18, H - 18, 12, 5, k === w.i ? PAL.yellow : '#2a3145');
  hot(0, 0, W, H, () => walkNext(), { focusable: false });
  button(W - 124, H - 34, 106, 26, 'SKIP', () => walkEnd(), { col: PAL.slate, fs: 13 });
  T(W - 136, H - 28, 'click for the next door', PAL.gray, 12, 'right');

  // Buzz, on the right of the card: his face, and what he is saying about this door
  const talking = !G.demoFreeze ? walkSayTick(w) : true;
  const cur = w.say[Math.min(w.sayI, w.say.length - 1)];
  {
    const ps = 92, pxx = W - 18 - ps, pyy = cy - 2;
    const talkImg = _npcImg.buzz_talk, speaking = cur && cur.rec && !voIdle();
    px(g, pxx - 2, pyy - 2, ps + 4, ps + 4, speaking ? PAL.yellow : '#5a6488');
    px(g, pxx, pyy, ps, ps, '#1a1626');
    if (speaking && talkImg && talkImg.length && mouthOpen(G.time)) drawPhotoFit(keyedFace(talkImg[strHash('buzztalk_' + w.i) % talkImg.length]), pxx, pyy, ps, ps);
    else drawPortrait('buzz', pxx, pyy, ps, ps);
    if (cur && cur.started !== false && w.sayI < w.say.length) {
      const bx = 460, bw = pxx - 14 - bx;
      const fl = fitLines('"' + cur.text + '"', bw - 20, [16, 15, 14, 13], 3);
      const bh = 26 + fl.lines.length * 19;
      px(g, bx, cy - 2, bw, bh, 'rgba(34,31,22,0.95)');
      px(g, bx, cy - 2, 3, bh, PAL.yellow);
      px(g, bx + bw, cy + 16, 8, 8, 'rgba(34,31,22,0.95)');             // the tail, towards him
      T(bx + 12, cy + 3, 'BUZZ', PAL.yellow, 11, 'left', true);
      for (let k = 0; k < fl.lines.length; k++) T(bx + 12, cy + 19 + k * 19, fl.lines[k], PAL.white, fl.fs, 'left');
    }
  }

  if (tip) { g.globalAlpha = tip.a; drawTooltip(tip.cx, tip.top, tip.t, PAL.yellow); g.globalAlpha = 1; }
  if (w.t > WALK_SECS && !talking && !G.demoFreeze) walkNext();
}
