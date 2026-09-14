/* DOQI five-question teaser: UI controller.
 * Plain browser JS, no build step, no storage, no network beyond same-folder assets.
 * State lives in memory only and is wiped on Restart / Retake.
 */
(function () {
  "use strict";

  var CONFIG = window.DOQI_TEASER_CONFIG || {};
  var DATA = window.DOQI_TEASER_DATA;
  var CORE = window.DOQI_CORE;
  var PROJECT_URL = CONFIG.projectUrl || "https://brok3nbydesign.com/doqi.html";
  var MESSAGE_VERSION = 1;

  var $ = function (id) { return document.getElementById(id); };

  // ---------- assets ----------
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  var ASSETS = {
    badge: function (title) { return "assets/badges/" + slug(title) + ".webp"; },
    trait: function (name) { return "assets/traits/" + slug(name) + ".jpg"; },
    stamp: "assets/stamp.webp",
    sfx: {
      select: "assets/audio/answer_select_sfx.ogg",
      sign: "assets/audio/signing_sfx.ogg",
      result: "assets/audio/laststage_sfx.ogg"
    },
    narration: function (sourceIndex) { return "assets/audio/sloan_q" + sourceIndex + ".ogg"; }
  };

  // ---------- state ----------
  var state = {
    screen: "intro",
    index: 0,
    answers: [],
    result: null,
    soundOn: false,
    cardUrl: null
  };
  function resetAnswers() {
    state.answers = DATA.questions.map(function () { return null; });
    state.result = null;
    state.index = 0;
    if (state.cardUrl) { try { URL.revokeObjectURL(state.cardUrl); } catch (e) {} }
    state.cardUrl = null;
  }
  resetAnswers();

  var reducedMotion = false;
  try { reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  // ---------- embedding / postMessage ----------
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
  if (inIframe) document.body.classList.add("tz--embed");

  function allowedParentOrigin() {
    var list = Array.isArray(CONFIG.parentOrigins) ? CONFIG.parentOrigins : [];
    if (!inIframe || !list.length) return null;
    var candidates = [];
    try {
      if (location.ancestorOrigins && location.ancestorOrigins.length) candidates.push(location.ancestorOrigins[0]);
    } catch (e) {}
    try { if (document.referrer) candidates.push(new URL(document.referrer).origin); } catch (e) {}
    for (var i = 0; i < candidates.length; i++) {
      if (list.indexOf(candidates[i]) >= 0) return candidates[i];
    }
    return null;
  }
  var PARENT_ORIGIN = allowedParentOrigin();

  function docHeight() {
    // Measure the content (the <main> block plus its bottom padding), not the
    // viewport: inside an iframe the document is never shorter than the frame,
    // which would make resize messages self-fulfilling.
    var app = document.getElementById("app");
    if (app) return Math.ceil(app.offsetTop + app.offsetHeight + 8);
    var d = document.documentElement, b = document.body;
    return Math.ceil(Math.max(b.scrollHeight, b.offsetHeight, d.scrollHeight, d.offsetHeight));
  }
  function emit(event, extra) {
    if (!PARENT_ORIGIN) return;
    var msg = { source: "doqi-teaser", version: MESSAGE_VERSION, event: event };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) msg[k] = extra[k];
    try { window.parent.postMessage(msg, PARENT_ORIGIN); } catch (e) {}
  }
  var resizeTimer = null;
  function emitResize() {
    if (!PARENT_ORIGIN) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { emit("resize", { height: docHeight() }); }, 60);
  }
  if (PARENT_ORIGIN && "ResizeObserver" in window) {
    new ResizeObserver(emitResize).observe(document.body);
  }

  // ---------- sound ----------
  var audioSupported = (function () {
    try { var a = document.createElement("audio"); return !!a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') !== ""; }
    catch (e) { return false; }
  })();
  var players = {};
  var narrationPlayer = null;
  function play(url, volume) {
    if (!state.soundOn || !audioSupported) return;
    try {
      var a = players[url];
      if (!a) { a = new Audio(url); a.preload = "auto"; players[url] = a; }
      a.pause(); a.currentTime = 0; a.volume = volume == null ? 0.6 : volume;
      a.play().catch(function () {});
    } catch (e) {}
  }
  function stopNarration() {
    try { if (narrationPlayer) { narrationPlayer.pause(); narrationPlayer.currentTime = 0; } } catch (e) {}
  }
  function narrate(question) {
    stopNarration();
    if (!state.soundOn || !audioSupported) return;
    try {
      narrationPlayer = new Audio(ASSETS.narration(question.sourceIndex));
      narrationPlayer.volume = 1;
      narrationPlayer.play().catch(function () {});
    } catch (e) {}
  }
  function stopAllAudio() {
    stopNarration();
    for (var k in players) { try { players[k].pause(); } catch (e) {} }
  }
  function updateSoundButton() {
    var b = $("btn-sound");
    b.setAttribute("aria-pressed", state.soundOn ? "true" : "false");
    $("sound-label").textContent = state.soundOn ? "Sound on" : "Sound off";
    b.firstElementChild.textContent = state.soundOn ? "🔊" : "🔇";
    b.title = state.soundOn ? "Sound is on. Turn off answer sounds and narration." : "Sound is off. Turn on answer sounds and narration.";
    if (!audioSupported) {
      b.disabled = true;
      b.title = "Sound unavailable: this browser cannot play the teaser's OGG audio.";
      $("sound-label").textContent = "No sound";
    }
  }

  // ---------- screens ----------
  var SCREENS = ["intro", "question", "processing", "result"];
  function showScreen(name, focusEl) {
    state.screen = name;
    SCREENS.forEach(function (s) { $("screen-" + s).hidden = s !== name; });
    var chip = $("chip");
    if (name === "intro") { chip.textContent = "CLASSIFIED // PRE-SCREEN"; chip.classList.remove("tz-chip--ok"); }
    if (name === "processing") { chip.textContent = "PROCESSING // DO NOT LEAVE"; chip.classList.remove("tz-chip--ok"); }
    if (name === "result") { chip.textContent = "PROVISIONAL // FILE OPENED"; chip.classList.add("tz-chip--ok"); }
    updateTicks();
    if (focusEl) { try { focusEl.focus({ preventScroll: false }); } catch (e) { try { focusEl.focus(); } catch (e2) {} } }
    try { window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }); } catch (e) {}
    emitResize();
  }
  function updateTicks() {
    var ticks = $("ticks").children;
    var done = state.screen === "result" || state.screen === "processing" ? DATA.questions.length
      : state.screen === "question" ? state.index : 0;
    for (var i = 0; i < ticks.length; i++) ticks[i].classList.toggle("on", i < done);
  }

  // ---------- question rendering ----------
  function renderQuestion() {
    var i = state.index;
    var q = DATA.questions[i];
    var total = DATA.questions.length;
    var chip = $("chip");
    chip.textContent = "CLASSIFIED // SIM-" + q.sourceIndex;
    chip.classList.remove("tz-chip--ok");
    $("q-count").textContent = "Question " + (i + 1) + " of " + total;
    $("q-text").textContent = q.text;
    var opts = $("q-opts");
    opts.innerHTML = "";
    q.options.forEach(function (opt, idx) {
      var label = document.createElement("label");
      label.className = "tz-opt";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "answer";
      input.value = String(idx);
      input.id = "opt-" + i + "-" + idx;
      input.checked = state.answers[i] === idx;
      if (input.checked) label.classList.add("is-checked");
      input.addEventListener("change", function () { selectAnswer(idx, true); });
      var key = document.createElement("span");
      key.className = "key";
      key.setAttribute("aria-hidden", "true");
      key.textContent = String(idx + 1);
      var txt = document.createElement("span");
      txt.className = "txt";
      txt.textContent = opt.text;
      label.appendChild(input);
      label.appendChild(key);
      label.appendChild(txt);
      opts.appendChild(label);
    });
    $("q-error").hidden = true;
    $("btn-back").disabled = i === 0;
    $("btn-next").textContent = i === total - 1 ? "Submit for review" : "Next";
    $("btn-next").setAttribute("aria-disabled", state.answers[i] === null ? "true" : "false");
    $("bar").style.width = Math.round((i / total) * 100) + "%";
    updateTicks();
    narrate(q);
  }

  function selectAnswer(idx, viaUser) {
    var i = state.index;
    var changed = state.answers[i] !== idx;
    state.answers[i] = idx; // replaces the previous answer; never accumulates
    var labels = $("q-opts").children;
    for (var k = 0; k < labels.length; k++) {
      labels[k].classList.toggle("is-checked", k === idx);
      labels[k].firstElementChild.checked = k === idx;
    }
    $("q-error").hidden = true;
    $("btn-next").setAttribute("aria-disabled", "false");
    if (viaUser && changed) play(ASSETS.sfx.select, 0.6);
  }

  function goToQuestion(i, focusFirst) {
    state.index = i;
    renderQuestion();
    showScreen("question", $("q-count"));
  }

  function next() {
    var i = state.index;
    if (state.answers[i] === null) {
      $("q-error").hidden = false;
      var first = $("q-opts").querySelector("input");
      if (first) first.focus();
      emitResize();
      return;
    }
    if (i + 1 < DATA.questions.length) {
      goToQuestion(i + 1);
    } else {
      submit();
    }
  }
  function back() {
    if (state.index > 0) goToQuestion(state.index - 1);
  }

  // ---------- completion ----------
  var PROC_LINES = ["Filing responses", "Cross-referencing traits", "Stamping the file", "Assigning a desk"];
  function submit() {
    if (!CORE.isComplete(DATA, state.answers)) {
      // Find the first missing answer and go there.
      for (var k = 0; k < state.answers.length; k++) {
        if (state.answers[k] === null) { goToQuestion(k); $("q-error").hidden = false; return; }
      }
      return;
    }
    stopNarration();
    play(ASSETS.sfx.sign, 0.7);
    state.result = CORE.evaluate(DATA, state.answers);
    showScreen("processing");
    var lineEl = $("proc-line");
    var step = 0;
    lineEl.textContent = PROC_LINES[0];
    var total = reducedMotion ? 250 : 1400;
    var timer = setInterval(function () {
      step++;
      if (step < PROC_LINES.length) lineEl.textContent = PROC_LINES[step];
    }, Math.max(60, total / PROC_LINES.length));
    setTimeout(function () {
      clearInterval(timer);
      if (state.screen !== "processing") return; // restarted mid-way
      renderResult();
    }, total);
  }

  function renderResult() {
    var r = state.result;
    if (!r) return;
    var badge = $("r-badge");
    badge.src = ASSETS.badge(r.best.title);
    badge.alt = "Badge art for " + r.best.title;
    $("r-title").textContent = r.best.title;
    $("r-level").textContent = "Clearance level " + r.best.level;
    $("r-strength").textContent = "Match strength " + r.strengthPercent + "%";
    $("r-desc").textContent = r.best.description;
    $("r-work").textContent = r.workspace;
    var ul = $("r-traits");
    ul.innerHTML = "";
    r.topTraits.forEach(function (t) {
      var li = document.createElement("li");
      var img = document.createElement("img");
      img.src = ASSETS.trait(t.name);
      img.alt = "";
      img.width = 44; img.height = 44;
      var div = document.createElement("div");
      var name = document.createElement("span");
      name.className = "name"; name.textContent = t.name;
      var score = document.createElement("span");
      score.className = "score"; score.textContent = "+" + t.score;
      var tag = document.createElement("span");
      tag.className = "tag"; tag.textContent = t.tagline;
      div.appendChild(name); div.appendChild(score); div.appendChild(tag);
      li.appendChild(img); li.appendChild(div);
      ul.appendChild(li);
    });
    var runner = "";
    if (r.runnerUp) runner = "Also under review: " + r.runnerUp.title + ".";
    if (r.tie && CORE.TIE_RULE_TEXT[r.tieRule]) runner += " " + CORE.TIE_RULE_TEXT[r.tieRule];
    $("r-runner").textContent = runner;
    $("link-project").href = PROJECT_URL;
    var full = $("link-full");
    if (CONFIG.fullTestUrl && /^https:\/\//.test(CONFIG.fullTestUrl)) { full.href = CONFIG.fullTestUrl; full.hidden = false; }
    else full.hidden = true;
    showScreen("result", $("r-title"));
    play(ASSETS.sfx.result, 0.5);
    emit("completed", {});
  }

  // ---------- restart / retake ----------
  function restart(toIntro) {
    stopAllAudio();
    resetAnswers();
    closeDialogs();
    if (toIntro) {
      showScreen("intro", $("btn-begin"));
    } else {
      goToQuestion(0);
    }
  }

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  // ---------- dialogs ----------
  function openDialog(dlg) {
    try { if (typeof dlg.showModal === "function") { dlg.showModal(); return; } } catch (e) {}
    dlg.setAttribute("open", "");
  }
  function closeDialogs() {
    ["dlg-card", "dlg-copy"].forEach(function (id) {
      var d = $(id);
      try { if (d.open) d.close(); } catch (e) { d.removeAttribute("open"); }
    });
  }
  document.querySelectorAll("dialog [data-close]").forEach(function (b) {
    b.addEventListener("click", function () { closeDialogs(); });
  });

  // ---------- copy ----------
  function copyResult() {
    if (!state.result) return;
    var text = CORE.resultText(state.result, { projectUrl: PROJECT_URL });
    var done = function () { toast("Result text copied to clipboard."); };
    var fail = function () {
      // Legacy path, then manual fallback.
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select(); ta.setSelectionRange(0, text.length);
        var ok = document.execCommand && document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) { done(); return; }
      } catch (e) {}
      $("dlg-copy-text").value = text;
      openDialog($("dlg-copy"));
      try { $("dlg-copy-text").focus(); $("dlg-copy-text").select(); } catch (e) {}
    };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else {
      fail();
    }
  }

  // ---------- PNG card ----------
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("image failed: " + src)); };
      img.src = src;
    });
  }
  function wrapText(ctx, text, maxWidth) {
    var words = text.replace(/\s+/g, " ").trim().split(" ");
    var lines = [], line = "";
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  var MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
  var SANS = '"Inter", "Segoe UI", Roboto, system-ui, -apple-system, sans-serif';

  function drawCard(r) {
    var W = 1200, H = 630;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    // ground
    var g = ctx.createRadialGradient(W / 2, H * 0.3, 40, W / 2, H * 0.3, W * 0.8);
    g.addColorStop(0, "#832615"); g.addColorStop(0.6, "#501b0f"); g.addColorStop(1, "#2a0e08");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,192,88,0.06)"; ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
    for (var y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }

    // glass card
    roundRect(ctx, 36, 36, W - 72, H - 72, 18);
    ctx.fillStyle = "rgba(12,6,4,0.9)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,192,88,0.55)"; ctx.lineWidth = 2; ctx.stroke();
    // screws
    [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
      ctx.fillStyle = "#5d4037"; ctx.fill(); ctx.strokeStyle = "rgba(255,192,88,0.4)"; ctx.lineWidth = 1; ctx.stroke();
    });

    // header
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffc058";
    ctx.font = "700 15px " + MONO;
    ctx.letterSpacing = "4px";
    ctx.fillText("DEPARTMENT OF QUESTIONABLE INVENTIONS", 70, 62);
    ctx.fillStyle = "#fff8e1";
    ctx.font = "900 24px " + MONO;
    ctx.letterSpacing = "3px";
    ctx.fillText("FIELD EVALUATION  ·  FIVE-QUESTION PREVIEW", 70, 86);
    // chip
    ctx.letterSpacing = "2px";
    ctx.font = "700 13px " + MONO;
    var chipText = "PROVISIONAL // FILE OPENED";
    var cw = ctx.measureText(chipText).width + 24;
    roundRect(ctx, W - 70 - cw, 66, cw, 30, 5);
    ctx.fillStyle = "rgba(127,224,163,0.12)"; ctx.fill();
    ctx.strokeStyle = "rgba(127,224,163,0.7)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#7fe0a3"; ctx.fillText(chipText, W - 70 - cw + 12, 74);
    // divider
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.moveTo(70, 128); ctx.lineTo(W - 70, 128); ctx.stroke();

    // badge frame
    var bx = 70, by = 150, bs = 330;
    roundRect(ctx, bx, by, bs, bs, 12);
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,192,88,0.45)"; ctx.lineWidth = 1.5; ctx.stroke();

    var tx = bx + bs + 34, tw = W - 70 - tx;
    ctx.letterSpacing = "3px";
    ctx.fillStyle = "#ffc058"; ctx.font = "700 14px " + MONO;
    ctx.fillText("PROVISIONAL CLASSIFICATION", tx, 150);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#fff8e1"; ctx.font = "900 44px " + SANS;
    var titleLines = wrapText(ctx, r.best.title, tw);
    var ty = 172;
    titleLines.forEach(function (l) { ctx.fillText(l, tx, ty); ty += 50; });

    // pills
    ctx.font = "700 14px " + MONO; ctx.letterSpacing = "1.5px";
    var pills = ["CLEARANCE LEVEL " + r.best.level, "MATCH STRENGTH " + r.strengthPercent + "%"];
    var px = tx;
    pills.forEach(function (p) {
      var pw = ctx.measureText(p).width + 26;
      roundRect(ctx, px, ty + 4, pw, 30, 15);
      ctx.fillStyle = "rgba(255,192,88,0.12)"; ctx.fill();
      ctx.strokeStyle = "#ffc058"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "#ffefc9"; ctx.fillText(p, px + 13, ty + 12);
      px += pw + 10;
    });
    ty += 48;

    // description
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#ffebcd"; ctx.font = "italic 500 21px " + SANS;
    var descLines = wrapText(ctx, r.best.description, tw).slice(0, 5);
    descLines.forEach(function (l) { ctx.fillText(l, tx, ty); ty += 28; });
    ty += 8;

    // traits
    ctx.fillStyle = "#ffc058"; ctx.font = "700 13px " + MONO; ctx.letterSpacing = "2px";
    ctx.fillText("TRAITS ON RECORD", tx, ty); ty += 20;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#fff8e1"; ctx.font = "700 19px " + SANS;
    ctx.fillText(r.topTraits.map(function (t) { return t.name + " +" + t.score; }).join("   ·   "), tx, ty);

    // footer
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.moveTo(70, H - 108); ctx.lineTo(W - 70, H - 108); ctx.stroke();
    ctx.fillStyle = "#ffebcd"; ctx.font = "500 15px " + SANS;
    ctx.fillText("Five-question fictional preview. Not the full assessment and not a real psychological evaluation.", 70, H - 96);
    ctx.fillStyle = "#ffc058"; ctx.font = "700 15px " + MONO; ctx.letterSpacing = "1px";
    ctx.fillText(PROJECT_URL.replace(/^https?:\/\//, ""), 70, H - 74);
    ctx.fillStyle = "#ffebcd"; ctx.font = "600 14px " + MONO; ctx.letterSpacing = "1px";
    ctx.fillText("Independently created by Brok3n by Design.", 70, H - 54);

    return Promise.all([loadImage(ASSETS.badge(r.best.title)), loadImage(ASSETS.stamp)]).then(function (imgs) {
      var badge = imgs[0], stamp = imgs[1];
      var scale = Math.min((bs - 24) / badge.width, (bs - 24) / badge.height);
      var bw = badge.width * scale, bh = badge.height * scale;
      ctx.drawImage(badge, bx + (bs - bw) / 2, by + (bs - bh) / 2, bw, bh);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(W - 150, H - 120);
      ctx.rotate(-0.2);
      ctx.drawImage(stamp, -70, -70, 140, 140);
      ctx.restore();
      return canvas;
    });
  }

  function downloadCard() {
    if (!state.result) return;
    var btn = $("btn-download");
    btn.disabled = true;
    drawCard(state.result).then(function (canvas) {
      return new Promise(function (resolve, reject) {
        try {
          canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error("toBlob returned null")); }, "image/png");
        } catch (e) { reject(e); }
      });
    }).then(function (blob) {
      if (state.cardUrl) { try { URL.revokeObjectURL(state.cardUrl); } catch (e) {} }
      state.cardUrl = URL.createObjectURL(blob);
      $("dlg-card-img").src = state.cardUrl;
      var save = $("dlg-card-save");
      save.href = state.cardUrl;
      save.download = "doqi-teaser-" + slug(state.result.best.title) + ".png";
      openDialog($("dlg-card"));
      try { save.focus(); } catch (e) {}
    }).catch(function (err) {
      // Typical cause: page opened from file:// (tainted canvas) or images blocked.
      toast("Could not render the card here. Try the hosted version, or copy the result text instead.");
      try { console.warn("DOQI teaser card export failed:", err); } catch (e) {}
    }).then(function () { btn.disabled = false; });
  }

  // ---------- keyboard ----------
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var anyDialogOpen = document.querySelector("dialog[open]");
    if (anyDialogOpen) {
      if (e.key === "Escape") { e.preventDefault(); closeDialogs(); }
      return;
    }
    var target = e.target;
    var tag = target && target.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" && target.type !== "radio") return;
    if (state.screen === "question") {
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4 && DATA.questions[state.index].options[n - 1]) {
        e.preventDefault();
        selectAnswer(n - 1, true);
        var input = $("opt-" + state.index + "-" + (n - 1));
        if (input) input.focus();
        return;
      }
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        next();
      }
    } else if (state.screen === "intro" && e.key === "Enter" && tag !== "BUTTON" && tag !== "A") {
      e.preventDefault();
      begin();
    }
  });

  // ---------- visibility ----------
  document.addEventListener("visibilitychange", function () {
    document.body.classList.toggle("is-hidden", document.hidden);
    if (document.hidden) {
      try { if (narrationPlayer && !narrationPlayer.paused) narrationPlayer.pause(); } catch (e) {}
    }
  });

  // ---------- wiring ----------
  function begin() {
    play(ASSETS.sfx.sign, 0.7);
    resetAnswers();
    goToQuestion(0);
  }
  $("btn-begin").addEventListener("click", begin);
  // Next is a submit button so Enter / mobile "Go" still work; the click handler
  // prevents the form submission so next() runs exactly once per activation.
  $("btn-next").addEventListener("click", function (e) { e.preventDefault(); next(); });
  $("screen-question").addEventListener("submit", function (e) { e.preventDefault(); next(); });
  $("btn-back").addEventListener("click", back);
  $("btn-restart").addEventListener("click", function () { restart(true); });
  $("btn-retake").addEventListener("click", function () { restart(false); });
  $("btn-copy").addEventListener("click", copyResult);
  $("btn-download").addEventListener("click", downloadCard);
  $("btn-sound").addEventListener("click", function () {
    state.soundOn = !state.soundOn;
    updateSoundButton();
    if (!state.soundOn) stopAllAudio();
    else if (state.screen === "question") narrate(DATA.questions[state.index]);
  });
  $("foot-project").href = PROJECT_URL;
  $("link-project").href = PROJECT_URL;
  updateSoundButton();
  showScreen("intro");

  // Expose a tiny read-only hook for automated tests (no state mutation).
  window.__doqiTeaser = {
    get screen() { return state.screen; },
    get index() { return state.index; },
    get answers() { return state.answers.slice(); },
    get result() { return state.result; },
    get parentOrigin() { return PARENT_ORIGIN; }
  };

  emit("ready", { height: docHeight() });
})();
