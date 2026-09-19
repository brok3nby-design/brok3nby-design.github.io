// Speck Studio design files — the one way a design leaves the game and comes back.
//
// A design has always had a versioned shape (`Studio.FORMAT`) because the server
// stores it and migrates it. This module puts that same object in a file, and
// reads it back **through the same gate the server uses** (`Studio.migrate` →
// `Studio.validate` → `Studio.sanitize`), plus the checks a file needs and a
// socket message never did: size, text, structure, and a reason for every
// refusal that a person can act on.
//
// The file is JSON and nothing in it is ever executed. The envelope carries its
// own version (`fv`) separately from the design's (`v`), so either can move
// without the other. A bare design object — the thing `players.json` holds — is
// accepted too, so the game's own library entries are valid files.
//
//   {
//     "format": "speck-design", "fv": 1, "made": "2026-…", "by": "speck-studio",
//     "design": { "v": 1, "tpl": "chair", "cat": "furniture", "name": "…",
//                 "w": 16, "h": 16, "px": ["…", …], "pal": { ".": null, "0": "#8a5f38", … } }
//   }
//
// Shared by the server, the game client, the tests and the website teaser.
(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const studio = node ? require('./studio') : root.Studio;
  if (node) module.exports = factory(studio);
  else root.StudioFile = factory(studio);
})(typeof self !== 'undefined' ? self : this, function (Studio) {

  const FILE_FORMAT = 1;           // bump when the envelope changes; migrate, never wipe
  const KIND = 'speck-design';
  const EXT = '.speck.json';
  const MAX_BYTES = 64 * 1024;     // a 16×16 design is under 1 KB; 64 KB is generous
  const MAX_SIDE = 64;             // no template is this big; a wall against absurd sizes
  const NAME_MAX = 24;             // same as the server
  const HEX = /^#[0-9a-f]{6}$/i;

  class FileError extends Error {
    constructor(message, code) { super(message); this.name = 'StudioFileError'; this.code = code; }
  }
  const refuse = (code, msg) => { throw new FileError(msg, code); };

  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const isInt = v => Number.isInteger(v);

  // ---- writing --------------------------------------------------------------
  // `design` is whatever the editor holds; it is validated and sanitised the way
  // the server would on save, and the library id is dropped: a file is a copy,
  // and importing it makes a new entry rather than silently overwriting one.
  function encode(design, opts) {
    const err = Studio.validate(design);
    if (err) refuse('invalid', `that design can't be saved — ${err}`);
    const clean = Studio.sanitize(design);
    clean.id = null;
    clean.fav = 0;
    const env = {
      format: KIND, fv: FILE_FORMAT,
      made: new Date(opts && opts.now || Date.now()).toISOString(),
      by: (opts && opts.by) || 'speck-studio',
      design: clean,
    };
    return JSON.stringify(env, null, 1);
  }

  // ---- reading --------------------------------------------------------------
  // Envelope versions older than FILE_FORMAT would be rewritten here. There is
  // only one so far; the function exists so that when there are two, nobody's
  // file is refused for being from last year.
  function migrateFile(env) {
    return env;
  }

  // Every check names the field and says what it found, because "invalid file"
  // is not something a visitor can fix.
  function checkDesign(d) {
    if (!isObj(d)) refuse('shape', 'the file has no design in it');
    if (!isInt(d.v) || d.v < 1) refuse('version', 'the design has no format version');
    if (d.v > Studio.FORMAT) refuse('version', `this design was saved in format ${d.v}, newer than this importer (format ${Studio.FORMAT})`);
    if (typeof d.tpl !== 'string' || !d.tpl) refuse('template', 'the design does not say which template it is based on');
    const tpl = Studio.TPL[d.tpl];
    if (!tpl) refuse('template', `unknown template "${String(d.tpl).slice(0, 32)}"`);
    if (d.cat !== undefined && d.cat !== tpl.cat) refuse('template', `a ${tpl.name} is ${tpl.cat}, not "${String(d.cat).slice(0, 24)}"`);
    if (!isInt(d.w) || !isInt(d.h) || d.w < 1 || d.h < 1) refuse('size', 'the canvas size is missing or not a whole number');
    if (d.w > MAX_SIDE || d.h > MAX_SIDE) refuse('size', `${d.w}×${d.h} is bigger than any Speck design can be (${MAX_SIDE}×${MAX_SIDE})`);
    if (d.w !== tpl.w || d.h !== tpl.h) refuse('size', `a ${tpl.name} is ${tpl.w}×${tpl.h}, but this design is ${d.w}×${d.h}`);
    if (!Array.isArray(d.px)) refuse('pixels', 'the pixel rows are missing');
    if (d.px.length !== d.h) refuse('pixels', `expected ${d.h} pixel rows, found ${d.px.length}`);
    if (!isObj(d.pal)) refuse('palette', 'the palette is missing');
    const keys = Object.keys(d.pal);
    if (keys.length > Studio.MAX_COLORS + 1) refuse('palette', `${keys.length} palette entries — the most a design can hold is ${Studio.MAX_COLORS}`);
    for (const k of keys) {
      if (k.length !== 1) refuse('palette', `palette key "${k.slice(0, 8)}" should be a single character`);
      const v = d.pal[k];
      if (v === null) continue;
      if (typeof v !== 'string' || !HEX.test(v)) refuse('palette', `palette entry "${k}" is not a #rrggbb colour`);
    }
    if (d.pal['.'] !== undefined && d.pal['.'] !== null) refuse('palette', 'the "." palette entry must be transparent (null)');
    for (let y = 0; y < d.h; y++) {
      const row = d.px[y];
      if (typeof row !== 'string') refuse('pixels', `pixel row ${y + 1} is not text`);
      if (row.length !== d.w) refuse('pixels', `pixel row ${y + 1} has ${row.length} pixels, expected ${d.w}`);
      for (let x = 0; x < d.w; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        if (!(ch in d.pal)) refuse('pixels', `pixel ${x + 1},${y + 1} uses "${ch}", which is not in the palette`);
      }
    }
    if (d.name !== undefined && d.name !== null && typeof d.name !== 'string') refuse('name', 'the name is not text');
    return tpl;
  }

  // Text (or bytes) in, a clean design out — or a FileError saying why not.
  // The result is exactly what `{t:'design', act:'save', d}` accepts.
  function parse(input) {
    let text = input;
    if (text && typeof text !== 'string') {
      if (typeof TextDecoder !== 'undefined' && (text instanceof ArrayBuffer || ArrayBuffer.isView(text))) text = new TextDecoder().decode(text);
      else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(text)) text = text.toString('utf8');
      else refuse('shape', 'expected the text of a design file');
    }
    if (typeof text !== 'string') refuse('shape', 'expected the text of a design file');
    if (text.length > MAX_BYTES) refuse('size', `that file is ${(text.length / 1024).toFixed(0)} KB — a design file is under ${MAX_BYTES / 1024} KB`);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    if (!text.trim()) refuse('shape', 'the file is empty');
    let obj;
    try { obj = JSON.parse(text); } catch (e) { refuse('json', 'not a readable design file (the JSON is broken)'); }
    if (!isObj(obj)) refuse('shape', 'not a Speck design file');

    let design, fv = null;
    if (obj.format === KIND) {
      if (!isInt(obj.fv) || obj.fv < 1) refuse('version', 'the file has no format version');
      if (obj.fv > FILE_FORMAT) refuse('version', `this file is format ${obj.fv}, newer than this importer (format ${FILE_FORMAT})`);
      fv = obj.fv;
      design = migrateFile(obj).design;
    } else if (typeof obj.format === 'string') {
      refuse('shape', `this is a "${obj.format.slice(0, 24)}" file, not a Speck design`);
    } else if ('tpl' in obj && 'px' in obj) {
      design = obj;                                   // a bare library entry
    } else {
      refuse('shape', 'not a Speck design file');
    }

    if (!isObj(design)) refuse('shape', 'the file has no design in it');
    const before = design.v;
    const migrated = Studio.migrate(Object.assign({}, design));
    checkDesign(migrated);
    const err = Studio.validate(migrated);             // the server's own gate, last
    if (err) refuse('invalid', err);
    const clean = Studio.sanitize(migrated);
    clean.id = null;
    clean.fav = 0;
    return { design: clean, fileVersion: fv, migrated: before !== clean.v };
  }

  // ---- naming ---------------------------------------------------------------
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'design';
  const filename = (design, suffix) => `speck-${slug(design.name)}-${design.tpl}${suffix || ''}${EXT}`;

  // what a person would want to know before they import or export
  function describe(design) {
    const tpl = Studio.TPL[design.tpl];
    const cells = Studio.unpack(design);
    const painted = cells.filter(Boolean).length;
    const colours = new Set(cells.filter(Boolean)).size;
    const b = tpl && tpl.behaviour && Studio.BEHAVIOUR[tpl.behaviour];
    return {
      template: tpl ? tpl.name : design.tpl, category: tpl ? tpl.cat : design.cat,
      w: design.w, h: design.h, painted, transparent: design.w * design.h - painted, colours,
      behaviour: b ? b.label : null, placeable: !!(tpl && tpl.place),
      // portraits sit on the player's world pixel by their centre — the anchor
      // is a property of the template, never of the pixels
      anchor: [design.w >> 1, design.h >> 1],
    };
  }

  return { FILE_FORMAT, KIND, EXT, MAX_BYTES, MAX_SIDE, NAME_MAX, FileError, encode, parse, slug, filename, describe };
});
