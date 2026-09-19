// Speck Studio — website teaser.
//
// The editing core here is a port of the game's own studio (public/client.js:
// applyTool, flood, pushUndo/undo/redo, pack/unpack via Studio) drawn onto one
// canvas instead of a grid of divs, so it can zoom, pan and take touch. The data
// model is not a port at all: specks.js, props.js, studio.js and studio-file.js
// are the game's files, byte for byte. A design made here is a design the game
// can hold, because it is built with the game's own code.
//
// Nothing leaves the device. There is no network code in this file.
(function () {
  'use strict';

  const CONFIG = window.SPECK_TEASER_CONFIG || {};
  const PARENT_ORIGIN = typeof CONFIG.parentOrigin === 'string' ? CONFIG.parentOrigin.trim() : '';
  const MSG_VERSION = 1;
  const DRAFT_KEY = 'speck-teaser-draft-v1';
  const PREF_KEY = 'speck-teaser-prefs-v1';
  const APP_VERSION = '1.0.0';

  // the game's default swatches, from client.js
  const PALETTE = ['#7dd3fc', '#4ade80', '#f472b6', '#fbbf24', '#f87171', '#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#f9a8d4', '#e5e7eb', '#94a3b8'];

  // A manageable subset of the game's 177 templates: a character, some
  // furniture and decor, and a tiling pattern. Any valid template can still be
  // *opened* from a file, because the whole template book ships with the page.
  const SUBSET = {
    portrait: ['blob', 'cat', 'frog', 'ghost', 'mushroom', 'robot', 'owl', 'knight', 'fox', 'villager', 'wizard', 'dragonling'],
    furniture: ['chair', 'stool', 'table', 'bed', 'chest', 'lamp', 'shelf', 'couch'],
    decor: ['rug', 'painting', 'banner', 'flag'],
    pattern: ['stripes', 'checks', 'brick', 'waves', 'starry', 'diamonds'],
  };
  const CAT_LABEL = { portrait: 'Portraits (12×12)', furniture: 'Furniture (16×16)', decor: 'Decor (16×16)', pattern: 'Tiles (8×8)' };

  const $ = id => document.getElementById(id);
  const board = $('board');
  const ctx = board.getContext('2d');
  const stage = $('stage');
  const live = $('live');

  // ---- state ---------------------------------------------------------------
  let tpl = Studio.TPL.blob;
  let W = 12, H = 12;
  let cells = Studio.blank(W, H);     // flat W*H array of '#rrggbb' | null
  let tool = 'pencil';
  let color = '#4ade80';
  let mirror = false;
  let grid = true;
  let zoom = 24;                      // screen px per cell (CSS px)
  let panX = 0, panY = 0;             // CSS px offset of the canvas's top-left inside the stage
  let cursor = { x: 5, y: 5, on: false };
  let hover = null;
  let dirty = false;                  // changed since the last "Save editable design"
  let everExported = false;
  const undoStack = [], redoStack = [];

  // ---- storage, guarded ----------------------------------------------------
  // Every touch of localStorage is wrapped: private windows, blocked third-party
  // storage inside an iframe and full quotas all throw, and none of them should
  // stop somebody drawing. `?nostorage=1` simulates a blocked browser for tests.
  const noStorage = /[?&]nostorage=1/.test(location.search);
  const store = {
    ok: false,
    get(k) { if (noStorage) throw new Error('blocked'); return localStorage.getItem(k); },
    set(k, v) { if (noStorage) throw new Error('blocked'); localStorage.setItem(k, v); },
    del(k) { if (noStorage) throw new Error('blocked'); localStorage.removeItem(k); },
  };
  try { store.set('speck-teaser-probe', '1'); store.del('speck-teaser-probe'); store.ok = true; } catch (e) { store.ok = false; }
  $('storageCard').hidden = store.ok;

  const prefs = (() => { try { return JSON.parse(store.get(PREF_KEY) || '{}') || {}; } catch (e) { return {}; } })();
  const savePrefs = () => { try { store.set(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* off */ } };

  // ---- sound, off until asked ----------------------------------------------
  let soundOn = false;
  let audio = null;
  function blip(freq, ms, gain) {
    if (!soundOn) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = gain || 0.03;
      o.connect(g).connect(audio.destination);
      const t = audio.currentTime;
      o.start(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (ms || 60) / 1000);
      o.stop(t + (ms || 60) / 1000 + 0.02);
    } catch (e) { /* no audio here */ }
  }
  function setSound(on) {
    soundOn = !!on;
    const b = $('btnSound');
    b.setAttribute('aria-pressed', String(soundOn));
    b.textContent = soundOn ? '🔊 Sound on' : '🔇 Sound off';
    b.title = soundOn ? 'Sound is on. Turn it off.' : 'Sound is off. Turn on small clicks and blips.';
    prefs.sound = soundOn;
    savePrefs();
    if (soundOn) blip(660, 80);
  }
  $('btnSound').onclick = () => setSound(!soundOn);

  // ---- toast & messages ----------------------------------------------------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function msg(id, text, kind) {
    const m = $(id);
    m.textContent = text || '';
    m.className = 'msg' + (kind ? ' ' + kind : '');
  }

  // ---- the design as the game sees it -------------------------------------
  function currentDesign() {
    const packed = Studio.pack(cells, W, H);
    return {
      v: Studio.FORMAT, id: null, tpl: tpl.id, cat: tpl.cat,
      name: $('designName').value.trim() || tpl.name,
      w: W, h: H, px: packed.px, pal: packed.pal,
    };
  }

  function loadDesign(d, opts) {
    tpl = Studio.TPL[d.tpl] || tpl;
    W = d.w; H = d.h;
    cells = Studio.unpack(d);
    undoStack.length = redoStack.length = 0;
    $('designName').value = d.name || tpl.name;
    dirty = !!(opts && opts.dirty);
    cursor = { x: W >> 1, y: H >> 1, on: false };
    autoFit = true;
    fit();
    syncAll();
  }

  function loadTemplate(t, blank) {
    const d = Studio.fromTemplate(t);
    if (blank) { d.px = Studio.pack(Studio.blank(t.w, t.h), t.w, t.h).px; d.pal = { '.': null }; d.name = 'my ' + t.name.toLowerCase(); }
    loadDesign(d, { dirty: false });
  }

  // ---- undo ----------------------------------------------------------------
  function pushUndo() {
    undoStack.push(cells.slice());
    if (undoStack.length > 80) undoStack.shift();
    redoStack.length = 0;
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(cells.slice());
    cells = undoStack.pop();
    changed();
    blip(330, 50);
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(cells.slice());
    cells = redoStack.pop();
    changed();
    blip(440, 50);
  }

  // ---- tools (ported from client.js) --------------------------------------
  const idx = (x, y) => y * W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  function applyTool(x, y, erase) {
    if (!inside(x, y)) return false;
    const paint = (px, py, col) => { if (inside(px, py)) cells[idx(px, py)] = col; };
    if (tool === 'pick' && !erase) {
      const c = cells[idx(x, y)];
      setColor(c || null);
      announce(c ? `picked ${c}` : 'picked transparent');
      return false;
    }
    if (tool === 'fill' && !erase) {
      flood(x, y, cells[idx(x, y)], color);
      return true;
    }
    const col = (erase || tool === 'eraser') ? null : color;
    paint(x, y, col);
    if (mirror) paint(W - 1 - x, y, col);
    return true;
  }

  function flood(x, y, from, to) {
    if (from === to) return;
    const stack = [[x, y]];
    const seen = new Uint8Array(W * H);
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (!inside(cx, cy)) continue;
      const k = idx(cx, cy);
      if (seen[k] || cells[k] !== from) continue;
      seen[k] = 1;
      cells[k] = to;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  }

  const ONE_SHOT = ['fill', 'pick'];

  function setTool(t) {
    tool = t;
    for (const b of $('tools').querySelectorAll('[data-tool]')) {
      const on = b.dataset.tool === t;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    }
    board.classList.toggle('pan', t === 'pan');
    hint();
  }
  for (const b of $('tools').querySelectorAll('[data-tool]')) b.onclick = () => { setTool(b.dataset.tool); blip(520, 40); };

  function setColor(c) {
    color = c;                       // null = transparent (paints like the eraser)
    if (c) $('customColor').value = c;
    syncSwatches();
  }

  // ---- palette -------------------------------------------------------------
  function usedColours() {
    const s = new Set();
    for (const c of cells) if (c) s.add(c);
    return [...s].sort((a, b) => Studio.lum(a) - Studio.lum(b));
  }
  function renderSwatches() {
    const wrap = $('swatches');
    wrap.innerHTML = '';
    const mk = (c, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (c ? '' : ' clear');
      if (c) b.style.background = c;
      b.dataset.c = c || '';
      b.setAttribute('aria-label', label);
      b.title = label;
      b.onclick = () => { setColor(c); if (tool === 'eraser' || tool === 'pick' || tool === 'pan') setTool('pencil'); blip(600, 30); };
      wrap.appendChild(b);
    };
    mk(null, 'Transparent');
    PALETTE.forEach((c, i) => mk(c, `Colour ${i + 1}, ${c}`));
    for (const c of usedColours()) if (!PALETTE.includes(c)) mk(c, `In this design, ${c}`);
    syncSwatches();
  }
  function syncSwatches() {
    for (const b of $('swatches').children) b.setAttribute('aria-pressed', String((b.dataset.c || null) === color));
  }
  $('customColor').addEventListener('input', e => { setColor(e.target.value); if (tool === 'eraser' || tool === 'pan') setTool('pencil'); });

  // ---- geometry ------------------------------------------------------------
  let cssW = 0, cssH = 0, dpr = 1;
  // Until the visitor zooms or pans, the drawing keeps fitting the stage: a
  // lazy-loaded or hidden iframe measures tiny at boot and grows later.
  let autoFit = true;
  function resizeBoard() {
    const r = stage.getBoundingClientRect();
    cssW = Math.max(1, Math.floor(r.width));
    cssH = Math.max(1, Math.floor(r.height));
    dpr = Math.min(3, window.devicePixelRatio || 1);
    board.width = Math.round(cssW * dpr);
    board.height = Math.round(cssH * dpr);
    if (autoFit) fit();
    clampPan();
    render();
  }
  function fit() {
    const r = stage.getBoundingClientRect();
    const cw = Math.max(1, r.width), ch = Math.max(1, r.height);
    zoom = Math.max(4, Math.floor(Math.min((cw - 24) / W, (ch - 24) / H)));
    panX = Math.round((cw - W * zoom) / 2);
    panY = Math.round((ch - H * zoom) / 2);
  }
  function clampPan() {
    // keep at least a quarter of the drawing on screen
    const dw = W * zoom, dh = H * zoom;
    panX = Math.min(cssW - dw * 0.25, Math.max(-dw * 0.75, panX));
    panY = Math.min(cssH - dh * 0.25, Math.max(-dh * 0.75, panY));
  }
  function setZoom(z, ax, ay) {
    z = Math.max(2, Math.min(96, Math.round(z)));
    autoFit = false;
    if (ax === undefined) { ax = cssW / 2; ay = cssH / 2; }
    const gx = (ax - panX) / zoom, gy = (ay - panY) / zoom;   // canvas point under the anchor
    zoom = z;
    panX = ax - gx * zoom;
    panY = ay - gy * zoom;
    clampPan();
    requestRender();
    hint();
  }
  const cellAt = (cx, cy) => ({ x: Math.floor((cx - panX) / zoom), y: Math.floor((cy - panY) / zoom) });

  // ---- rendering -----------------------------------------------------------
  // Everything is drawn on demand. There is no animation loop to pause, and a
  // render requested while the tab is hidden waits for it to come back.
  let renderQueued = false;
  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; if (!document.hidden) render(); else renderQueued = false; });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRender(); });

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const x0 = Math.round(panX), y0 = Math.round(panY);
    const z = zoom;
    // transparency checker, like the game's alternating editor cells
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#151924' : '#12151d';
        ctx.fillRect(x0 + x * z, y0 + y * z, z, z);
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = cells[idx(x, y)];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x0 + x * z, y0 + y * z, z, z);
      }
    }
    if (grid && z >= 6) {
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x++) { ctx.moveTo(x0 + x * z + 0.5, y0); ctx.lineTo(x0 + x * z + 0.5, y0 + H * z); }
      for (let y = 0; y <= H; y++) { ctx.moveTo(x0, y0 + y * z + 0.5); ctx.lineTo(x0 + W * z, y0 + y * z + 0.5); }
      ctx.stroke();
    }
    // a portrait sits on the player's world pixel by its centre cell: show it
    if (tpl.cat === 'portrait' && z >= 6) {
      const ax = W >> 1, ay = H >> 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(x0 + ax * z + 0.5, y0 + ay * z + 0.5, z - 1, z - 1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(x0 - 0.5, y0 - 0.5, W * z + 1, H * z + 1);
    const c = cursor.on ? cursor : hover;
    if (c && inside(c.x, c.y)) {
      ctx.strokeStyle = cursor.on ? '#7dd3fc' : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = cursor.on ? 2 : 1;
      ctx.strokeRect(x0 + c.x * z + 1, y0 + c.y * z + 1, z - 2, z - 2);
    }
  }

  // ---- previews, thumbnails and size estimates ----------------------------
  function paintInto(cv, scale, bg, tile) {
    const c2 = cv.getContext('2d');
    c2.imageSmoothingEnabled = false;
    c2.clearRect(0, 0, cv.width, cv.height);
    if (bg) { c2.fillStyle = bg; c2.fillRect(0, 0, cv.width, cv.height); }
    const t = tile || 1;
    for (let ty = 0; ty < t; ty++) for (let tx = 0; tx < t; tx++) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = cells[idx(x, y)];
        if (!c) continue;
        c2.fillStyle = c;
        c2.fillRect((tx * W + x) * scale, (ty * H + y) * scale, scale, scale);
      }
    }
  }
  function renderPreviews() {
    const tile = tpl.cat === 'pattern' ? 3 : 1;
    const n = $('previewNative');
    n.width = W * tile; n.height = H * tile;
    n.style.width = n.style.height = Math.max(48, W * tile) + 'px';
    paintInto(n, 1, null, tile);
    const big = $('previewBig');
    const s = Math.max(1, Math.floor(96 / Math.max(W, H)));
    big.width = W * s; big.height = H * s;
    paintInto(big, s);
    const painted = cells.filter(Boolean).length;
    $('previewInfo').textContent = `${W}×${H} · ${painted} px · ${usedColours().length} colours`;
    for (const [id, bg] of [['thumbDesign', null], ['thumbPng', null], ['thumbJpg', $('jpgBg').value]]) {
      const cv = $(id);
      const ts = Math.max(1, Math.floor(48 / Math.max(W, H)));
      cv.width = W * ts; cv.height = H * ts;
      paintInto(cv, ts, bg);
    }
  }

  let sizeTimer = 0;
  function scheduleSizes() { clearTimeout(sizeTimer); sizeTimer = setTimeout(estimateSizes, 250); }
  const kb = n => n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  async function estimateSizes() {
    try {
      const text = StudioFile.encode(currentDesign());
      $('sizeDesign').textContent = `≈ ${kb(new Blob([text]).size)}`;
    } catch (e) { $('sizeDesign').textContent = ''; }
    const png = await exportBlob('image/png', +$('pngScale').value, null);
    $('sizePng').textContent = png ? `${W * +$('pngScale').value}×${H * +$('pngScale').value} px, ≈ ${kb(png.size)}` : '';
    const jpg = await exportBlob('image/jpeg', +$('jpgScale').value, $('jpgBg').value);
    $('sizeJpg').textContent = jpg ? `${W * +$('jpgScale').value}×${H * +$('jpgScale').value} px, ≈ ${kb(jpg.size)}` : '';
  }

  // ---- exports -------------------------------------------------------------
  function exportCanvas(scale, bg) {
    const cv = document.createElement('canvas');
    cv.width = W * scale; cv.height = H * scale;
    paintInto(cv, scale, bg);           // one fillRect per cell: exact nearest-neighbour
    return cv;
  }
  function exportBlob(type, scale, bg) {
    return new Promise(res => {
      try { exportCanvas(scale, bg).toBlob(b => res(b), type, type === 'image/jpeg' ? 0.92 : undefined); }
      catch (e) { res(null); }
    });
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    if ('download' in a) a.click();
    else window.open(url, '_blank');   // very old browsers: show it, at least
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (!everExported) { everExported = true; post('completed', { kind: name.replace(/^.*\./, '') }); }
  }
  const slug = () => StudioFile.slug($('designName').value.trim() || tpl.name);

  function saveDesign() {
    let text;
    try { text = StudioFile.encode(currentDesign()); }
    catch (e) { msg('exportMsg', `Can't save: ${e.message}`, 'bad'); return false; }
    const d = currentDesign();
    download(new Blob([text], { type: 'application/json' }), StudioFile.filename(d));
    dirty = false;
    msg('exportMsg', `Saved ${StudioFile.filename(d)} — open it here again any time, or import it into Speck.`, 'good');
    blip(880, 90);
    return true;
  }
  $('btnSaveDesign').onclick = saveDesign;
  $('btnPng').onclick = async () => {
    const s = +$('pngScale').value;
    const b = await exportBlob('image/png', s, null);
    if (!b) { msg('exportMsg', 'This browser could not make a PNG.', 'bad'); return; }
    const name = `speck-${slug()}-${W}x${H}${s > 1 ? '@' + s + 'x' : ''}.png`;
    download(b, name);
    msg('exportMsg', `Downloaded ${name} (${W * s}×${H * s}, transparent background). This is a picture, not the editable design.`, 'good');
    blip(780, 70);
  };
  $('btnJpg').onclick = async () => {
    const s = +$('jpgScale').value, bg = $('jpgBg').value;
    const b = await exportBlob('image/jpeg', s, bg);
    if (!b) { msg('exportMsg', 'This browser could not make a JPG.', 'bad'); return; }
    const name = `speck-${slug()}-${W}x${H}@${s}x.jpg`;
    download(b, name);
    msg('exportMsg', `Downloaded ${name} (${W * s}×${H * s}, on ${bg}). This is a picture, not the editable design.`, 'good');
    blip(780, 70);
  };
  for (const id of ['pngScale', 'jpgScale']) $(id).addEventListener('change', scheduleSizes);
  $('jpgBg').addEventListener('input', () => { renderPreviews(); scheduleSizes(); });
  $('designName').addEventListener('input', () => { dirty = dirty || true; autosave(); scheduleSizes(); });

  // ---- import --------------------------------------------------------------
  const fileInput = $('fileInput');
  const pickFile = () => { fileInput.value = ''; fileInput.click(); };
  $('btnOpen').onclick = pickFile;
  $('btnOpen2').onclick = pickFile;
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    msg('openMsg', '');
    if (f.size > StudioFile.MAX_BYTES) { msg('openMsg', `That file is ${kb(f.size)}. A Speck design file is under ${kb(StudioFile.MAX_BYTES)}, so this isn't one.`, 'bad'); return; }
    let text;
    try { text = await f.text(); } catch (e) { msg('openMsg', 'Could not read that file.', 'bad'); return; }
    let r;
    try { r = StudioFile.parse(text); }
    catch (e) { msg('openMsg', `Can't open ${f.name}: ${e.message}.`, 'bad'); blip(200, 120); return; }
    if (!(await guard('open a different design'))) return;
    loadDesign(r.design, { dirty: false });
    const info = StudioFile.describe(r.design);
    msg('openMsg', `Opened "${r.design.name}" — a ${info.template} (${info.category}), ${info.w}×${info.h}, ${info.colours} colours${r.migrated ? ', updated from an older format' : ''}.`, 'good');
    toast(`opened ${r.design.name}`);
    blip(700, 80);
  });

  // ---- the unsaved-work guard ---------------------------------------------
  // Resolves true when it is fine to go ahead. Offers a save first, because
  // "are you sure?" is not an opportunity to keep the drawing.
  function guard(what) {
    if (!dirty || !cells.some(Boolean)) return Promise.resolve(true);
    const dlg = $('dlgGuard');
    $('dlgGuardText').textContent = `You haven't saved this design as an editable file. Do you want to before you ${what}?`;
    if (typeof dlg.showModal !== 'function') {
      return Promise.resolve(window.confirm(`You haven't saved this design as an editable file. Lose it and ${what}?`));
    }
    return new Promise(res => {
      // The answer comes from the button that was pressed, not only from the
      // dialog's close event: one embedded browser never fired it at all.
      let done = false;
      const btns = [...dlg.querySelectorAll('button[value]')];
      const finish = v => {
        if (done) return;
        done = true;
        dlg.removeEventListener('close', onClose);
        dlg.removeEventListener('cancel', onCancel);
        for (const b of btns) b.removeEventListener('click', onBtn);
        if (dlg.open) dlg.close(v);
        if (v === 'save') res(saveDesign());
        else res(v === 'discard');
      };
      const onBtn = e => { e.preventDefault(); finish(e.currentTarget.value); };
      const onClose = () => finish(dlg.returnValue || 'cancel');
      const onCancel = () => finish('cancel');
      for (const b of btns) b.addEventListener('click', onBtn);
      dlg.addEventListener('close', onClose);
      dlg.addEventListener('cancel', onCancel);
      dlg.returnValue = 'cancel';
      dlg.showModal();
    });
  }

  // ---- template picker -----------------------------------------------------
  let pickCat = 'portrait';
  const dlgT = $('dlgTemplates');
  function renderChips() {
    const wrap = $('catChips');
    wrap.innerHTML = '';
    for (const c of Object.keys(SUBSET)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(c === pickCat));
      b.textContent = CAT_LABEL[c];
      b.onclick = () => { pickCat = c; renderChips(); renderGallery(); };
      wrap.appendChild(b);
    }
  }
  function renderGallery() {
    const g = $('gallery');
    g.innerHTML = '';
    for (const id of SUBSET[pickCat]) {
      const t = Studio.TPL[id];
      if (!t) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gitem' + (t.id === tpl.id ? ' sel' : '');
      const beh = t.behaviour && Studio.BEHAVIOUR[t.behaviour];
      b.title = `${t.name} · ${t.w}×${t.h}${beh ? ' · ' + beh.label : ''}`;
      b.setAttribute('aria-label', b.title);
      const cv = document.createElement('canvas');
      const d = Studio.fromTemplate(t);
      const px = Studio.unpack(d);
      const s = Math.max(1, Math.floor(48 / Math.max(t.w, t.h)));
      cv.width = t.w * s; cv.height = t.h * s;
      const c2 = cv.getContext('2d');
      for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
        const c = px[y * t.w + x];
        if (!c) continue;
        c2.fillStyle = c;
        c2.fillRect(x * s, y * s, s, s);
      }
      b.appendChild(cv);
      const span = document.createElement('span');
      span.textContent = t.name;
      b.appendChild(span);
      b.onclick = async () => {
        const blank = $('startBlank').checked;
        dlgT.close('pick');
        if (!(await guard('start a new design'))) return;
        loadTemplate(t, blank);
        toast(`${blank ? 'empty ' : ''}${t.name} · ${t.w}×${t.h}`);
        blip(640, 60);
        board.focus({ preventScroll: true });
      };
      g.appendChild(b);
    }
  }
  function openTemplates() {
    pickCat = SUBSET[tpl.cat] ? tpl.cat : 'portrait';
    renderChips();
    renderGallery();
    if (typeof dlgT.showModal === 'function') dlgT.showModal();
    else dlgT.setAttribute('open', '');
  }
  $('btnTemplates').onclick = openTemplates;
  $('btnHelp').onclick = () => { const d = $('dlgHelp'); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); };
  for (const d of document.querySelectorAll('dialog')) d.addEventListener('click', e => { if (e.target === d) d.close('cancel'); });

  // ---- restart -------------------------------------------------------------
  $('btnRestart').onclick = async () => {
    if (!(await guard('start over'))) return;
    try { store.del(DRAFT_KEY); } catch (e) { /* off */ }
    loadTemplate(Studio.TPL.blob, false);
    setTool('pencil');
    setColor('#4ade80');
    mirror = false; $('btnMirror').setAttribute('aria-pressed', 'false');
    msg('exportMsg', ''); msg('openMsg', '');
    toast('started over');
    blip(500, 60);
    openTemplates();
  };

  // ---- pointer input: paint, pan, pinch --------------------------------------
  const pointers = new Map();          // id → {x, y}
  let stroke = null;                   // {snapshot, erase} while a paint drag is live
  let panDrag = null;                  // {x, y, panX, panY}
  let pinch = null;                    // {dist, zoom, mid}
  let spaceHeld = false;

  const pos = e => { const r = board.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function beginStroke(erase) {
    stroke = { snapshot: cells.slice(), erase, painted: false };
  }
  function strokeAt(p, first) {
    if (!stroke) return;
    const c = cellAt(p.x, p.y);
    if (!first && ONE_SHOT.includes(tool)) return;
    if (!first && !stroke.painted && !inside(c.x, c.y)) return;
    const before = cells[idx(c.x, c.y)];
    if (applyTool(c.x, c.y, stroke.erase)) {
      if (!stroke.painted) { undoStack.push(stroke.snapshot); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; }
      stroke.painted = true;
      if (first && before !== cells[idx(c.x, c.y)]) blip(tool === 'fill' ? 420 : 560, 25, 0.015);
      changed(true);
    }
  }
  function endStroke() {
    if (!stroke) return;
    if (stroke.painted) { changed(); }
    stroke = null;
  }
  // a stroke that turns out to be the first finger of a pinch is taken back
  function cancelStroke() {
    if (!stroke) return;
    if (stroke.painted) { cells = stroke.snapshot; undoStack.pop(); changed(); }
    stroke = null;
  }

  board.addEventListener('pointerdown', e => {
    board.focus({ preventScroll: true });
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    const p = pos(e);
    pointers.set(e.pointerId, p);
    try { board.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    cursor.on = false;
    if (pointers.size === 2) {
      cancelStroke();
      panDrag = null;
      autoFit = false;
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, panX, panY };
      return;
    }
    if (pointers.size > 2) return;
    const wantPan = tool === 'pan' || spaceHeld || e.button === 1;
    if (wantPan) {
      autoFit = false;
      panDrag = { x: p.x, y: p.y, panX, panY };
      board.classList.add('panning');
      return;
    }
    e.preventDefault();
    beginStroke(e.button === 2);
    strokeAt(p, true);
  });

  board.addEventListener('pointermove', e => {
    const p = pos(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = Math.max(2, Math.min(96, pinch.zoom * dist / pinch.dist));
      // zoom about the original midpoint, then follow the fingers
      const gx = (pinch.mid.x - pinch.panX) / pinch.zoom, gy = (pinch.mid.y - pinch.panY) / pinch.zoom;
      zoom = z;
      panX = mid.x - gx * zoom;
      panY = mid.y - gy * zoom;
      clampPan();
      requestRender();
      hint();
      return;
    }
    if (panDrag) {
      panX = panDrag.panX + (p.x - panDrag.x);
      panY = panDrag.panY + (p.y - panDrag.y);
      clampPan();
      requestRender();
      return;
    }
    const c = cellAt(p.x, p.y);
    hover = inside(c.x, c.y) ? c : null;
    if (stroke) strokeAt(p, false);
    else requestRender();
  });

  function pointerEnd(e) {
    pointers.delete(e.pointerId);
    try { board.releasePointerCapture(e.pointerId); } catch (err) { /* fine */ }
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      endStroke();
      if (panDrag) { panDrag = null; board.classList.remove('panning'); }
    }
  }
  board.addEventListener('pointerup', pointerEnd);
  board.addEventListener('pointercancel', pointerEnd);
  board.addEventListener('pointerleave', () => { hover = null; requestRender(); });
  board.addEventListener('contextmenu', e => e.preventDefault());
  board.addEventListener('wheel', e => {
    e.preventDefault();
    const p = pos(e);
    const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(zoom * f, p.x, p.y);
  }, { passive: false });

  // ---- keyboard ------------------------------------------------------------
  function announce(text) { live.textContent = text; }
  function announceCursor() {
    const c = cells[idx(cursor.x, cursor.y)];
    announce(`cell ${cursor.x + 1}, ${cursor.y + 1}: ${c || 'transparent'}`);
  }
  board.addEventListener('keydown', e => {
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (ctrl && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
    if (k === ' ' && !cursor.on) { spaceHeld = true; board.classList.add('pan'); }
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (move) {
      e.preventDefault();
      cursor.on = true;
      cursor.x = Math.max(0, Math.min(W - 1, cursor.x + move[0]));
      cursor.y = Math.max(0, Math.min(H - 1, cursor.y + move[1]));
      announceCursor();
      requestRender();
      return;
    }
    if ((k === 'Enter' || (k === ' ' && cursor.on)) ) {
      e.preventDefault();
      cursor.on = true;
      pushUndo();
      if (applyTool(cursor.x, cursor.y, false)) { changed(); announceCursor(); } else undoStack.pop();
      return;
    }
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      cursor.on = true;
      pushUndo();
      cells[idx(cursor.x, cursor.y)] = null;
      changed();
      announceCursor();
      return;
    }
    const lower = k.toLowerCase();
    if (lower === 'p') setTool('pencil');
    else if (lower === 'e') setTool('eraser');
    else if (lower === 'f') setTool('fill');
    else if (lower === 'k' || lower === 'i') setTool('pick');
    else if (lower === 'h') setTool('pan');
    else if (lower === 'm') toggleMirror();
    else if (lower === 'g') toggleGrid();
    else if (k === '+' || k === '=') setZoom(zoom * 1.25);
    else if (k === '-' || k === '_') setZoom(zoom / 1.25);
    else if (k === '0') { autoFit = true; fit(); clampPan(); requestRender(); hint(); }
    else if (/^[1-9]$/.test(k)) { const c = PALETTE[+k - 1]; if (c) setColor(c); }
    else if (k === 'Escape') { cursor.on = false; requestRender(); }
    else return;
    e.preventDefault();
  });
  board.addEventListener('keyup', e => { if (e.key === ' ') { spaceHeld = false; if (tool !== 'pan') board.classList.remove('pan'); } });
  board.addEventListener('blur', () => { spaceHeld = false; });

  function toggleMirror() {
    mirror = !mirror;
    $('btnMirror').setAttribute('aria-pressed', String(mirror));
    announce(mirror ? 'mirror on' : 'mirror off');
  }
  function toggleGrid() {
    grid = !grid;
    $('btnGrid').setAttribute('aria-pressed', String(grid));
    $('btnGrid').classList.toggle('active', grid);
    prefs.grid = grid; savePrefs();
    requestRender();
  }
  $('btnUndo').onclick = undo;
  $('btnRedo').onclick = redo;
  $('btnMirror').onclick = toggleMirror;
  $('btnGrid').onclick = toggleGrid;
  $('btnZoomIn').onclick = () => setZoom(zoom * 1.25);
  $('btnZoomOut').onclick = () => setZoom(zoom / 1.25);
  $('btnFit').onclick = () => { autoFit = true; fit(); clampPan(); requestRender(); hint(); };

  function hint() {
    const t = { pencil: 'draw', eraser: 'erase', fill: 'fill', pick: 'pick a colour', pan: 'drag to move' }[tool];
    $('stageHint').textContent = `${zoom}× · ${t} · two fingers or Space+drag to move`;
  }

  // ---- change plumbing -----------------------------------------------------
  let paletteDirty = false;
  function changed(light) {
    dirty = true;
    requestRender();
    if (light) { paletteDirty = true; return; }   // mid-stroke: canvas only
    syncButtons();
    renderPreviews();
    renderSwatches();
    scheduleSizes();
    autosave();
  }
  function syncButtons() {
    $('btnUndo').disabled = !undoStack.length;
    $('btnRedo').disabled = !redoStack.length;
  }
  function syncAll() {
    const beh = tpl.behaviour && Studio.BEHAVIOUR[tpl.behaviour];
    $('whatIs').textContent = `${tpl.name} · ${tpl.cat} · ${W}×${H}${beh ? ' · ' + beh.label : ''}`;
    syncButtons();
    renderSwatches();
    renderPreviews();
    scheduleSizes();
    resizeBoard();
    hint();
    autosave();
    post('resize');
  }

  // ---- autosave ------------------------------------------------------------
  let autosaveTimer = 0;
  function autosave() {
    if (!store.ok) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      try { store.set(DRAFT_KEY, JSON.stringify({ v: 1, at: Date.now(), dirty, design: currentDesign() })); }
      catch (e) { store.ok = false; $('storageCard').hidden = false; $('storageWhy').textContent = 'This browser stopped accepting storage, so your draft is no longer being kept.'; }
    }, 400);
  }
  function recover() {
    if (!store.ok) return false;
    let raw;
    try { raw = store.get(DRAFT_KEY); } catch (e) { return false; }
    if (!raw) return false;
    try {
      const draft = JSON.parse(raw);
      const r = StudioFile.parse(JSON.stringify(draft.design));   // the same gate as a file
      loadDesign(r.design, { dirty: !!draft.dirty });
      const when = draft.at ? new Date(draft.at) : null;
      toast(`recovered your draft${when ? ' from ' + when.toLocaleString() : ''}`);
      return true;
    } catch (e) {
      try { store.del(DRAFT_KEY); } catch (err) { /* off */ }
      return false;
    }
  }

  // ---- messages to an embedding page (optional) -------------------------
  // Only when this page is in a frame AND a parent origin is configured, and
  // always with that exact origin as the target. Nothing about the drawing is
  // ever sent: no pixels, no name, no file. The parent is never listened to.
  const framed = window.parent && window.parent !== window;
  const posting = framed && /^https?:\/\/[^/]+$/.test(PARENT_ORIGIN);
  let lastHeight = 0;
  function post(type, extra) {
    if (!posting) return;
    const m = Object.assign({ source: 'speck-teaser', v: MSG_VERSION, type, app: APP_VERSION }, extra || {});
    if (type === 'resize') {
      // the height at which nothing needs to scroll: on a phone the whole page,
      // on a wide frame the header plus the side panel's own content
      const stacked = window.innerWidth <= 860;
      const h = stacked ? Math.ceil(document.documentElement.scrollHeight)
        : Math.ceil(document.querySelector('.top').offsetHeight + document.querySelector('.side').scrollHeight + 2);
      if (h === lastHeight) return;
      lastHeight = h;
      m.height = h;
    }
    try { window.parent.postMessage(m, PARENT_ORIGIN); } catch (e) { /* nothing to do */ }
  }
  if (posting && 'ResizeObserver' in window) new ResizeObserver(() => post('resize')).observe(document.body);

  // ---- boot ----------------------------------------------------------------
  window.addEventListener('resize', () => { resizeBoard(); post('resize'); });
  if ('ResizeObserver' in window) new ResizeObserver(() => resizeBoard()).observe(stage);
  window.addEventListener('beforeunload', e => {
    if (dirty && cells.some(Boolean) && !store.ok) { e.preventDefault(); e.returnValue = ''; }
  });

  if (prefs.grid === false) { grid = false; $('btnGrid').setAttribute('aria-pressed', 'false'); $('btnGrid').classList.remove('active'); }
  if (prefs.sound) setSound(true); else setSound(false);
  setTool('pencil');
  if (!recover()) {
    loadTemplate(Studio.TPL.blob, false);
    // a first-time visitor gets the picker straight away; nothing to lose yet
    setTimeout(openTemplates, 50);
  }
  post('ready', { framed: true });

  // for the test harness and curious people: read-only snapshot of the state
  window.__speckTeaser = {
    version: APP_VERSION,
    get design() { return currentDesign(); },
    get state() { return { tool, color, zoom, panX, panY, dirty, grid, mirror, undo: undoStack.length, redo: redoStack.length, storage: store.ok, posting, sound: soundOn }; },
    cellAt, exportBlob,
  };
})();
