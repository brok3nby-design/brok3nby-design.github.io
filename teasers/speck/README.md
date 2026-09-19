# Speck Studio — website teaser

A small, self-contained pixel-art editor built from the real Speck Studio code, for the
website to host before the game launches. Visitors draw a portrait, a piece of furniture,
a decor item or a tiling pattern; download it as a PNG or JPG for anything they like; and
save an **editable Speck design file** that the game's studio imports.

Independently created by Brok3n by Design. Full project: https://brok3nbydesign.com/speck.html

## What is in the folder

| file | role |
| --- | --- |
| `index.html` | the page: markup, dialogs, the one config line |
| `teaser.css` | styling, same visual language as the game's panels |
| `teaser.js` | the editor: tools, zoom/pan, undo, exports, import, autosave, messaging |
| `studio.js` | **the game's** template book and design format — byte-identical copy |
| `studio-file.js` | **the game's** design-file reader/writer — byte-identical copy |
| `specks.js`, `props.js` | **the game's** portrait and prop art, which `studio.js` needs |
| `README.md` | this file |

No build step is required to *run* it: copy the folder to `/teasers/speck/` on the website
and it works. All paths are relative. It needs no server-side code, no account, no paid
service, no external runtime and no secrets. Nothing is fetched from anywhere; nothing the
visitor draws is uploaded.

### Rebuilding from the game repository

The shared files are copied out of `public/` by `node tools/build-teaser.js`, which also
writes `teaser-dist/speck-teaser.zip`, `teaser-dist/speck-teaser-cover.png` and
`teaser-dist/payload.txt`. Run it after any change to `studio.js` or `studio-file.js` so
the teaser and the game stay on the same format; `node tools/test-studio-file.js` fails
if they drift.

## Payload

The table is written by `tools/build-teaser.js` from the files actually in the folder.

<!-- payload:start -->
| file | bytes | gzip |
| --- | ---: | ---: |
| `index.html` | 13,508 | 4,050 |
| `props.js` | 30,450 | 5,162 |
| `specks.js` | 7,649 | 1,568 |
| `studio-file.js` | 9,643 | 3,684 |
| `studio.js` | 74,404 | 20,873 |
| `teaser.css` | 11,554 | 3,201 |
| `teaser.js` | 37,781 | 11,860 |
| **total (what the browser loads)** | **184,989** | **50,398** |

About 181 KB on disk, 49 KB over the wire with gzip, seven requests, no images or fonts.
<!-- payload:end -->

The first paint is immediate: the page is static HTML, the scripts are plain, and there
is no font, image or network request to wait for.

## Controls

**Tools:** Pencil, Eraser (transparent), Fill, Eyedropper, Move (pan without painting).
**Also:** Undo, Redo, Mirror, Grid, Zoom in/out, Fit.

| input | how |
| --- | --- |
| mouse | left paints with the tool, right erases, wheel zooms, Space+drag or middle-drag pans |
| touch | one finger paints; two fingers pan and pinch-zoom (a stroke that becomes a pinch is undone); pick *Move* to pan with one finger |
| keyboard | Tab to the canvas. Arrows move the cursor, Enter/Space paints, Delete erases. `P` pencil, `E` eraser, `F` fill, `K` eyedropper, `H` move, `M` mirror, `G` grid, `+`/`-` zoom, `0` fit, `Ctrl+Z`/`Ctrl+Y` undo/redo, `1`–`9` swatches |

Every control is a labelled button with a visible focus ring and a 44px touch target.
Sound is off by default and only ever makes short synthesised blips; the toggle is in the
header. `prefers-reduced-motion` turns off the few transitions. There is no continuous
animation; the canvas is drawn on demand and a redraw requested while the tab is hidden
waits until it is visible again.

The page works from 320px wide (toolbar wraps, side panel stacks under the canvas) up to
desktop (two columns).

## Templates

A manageable subset of the game's template book is offered in the picker:

- **Portraits** (12×12): Blob, Cat, Frog, Ghost, Mushroom, Robot, Owl, Knight, Fox, Villager, Wizard, Dragonling
- **Furniture** (16×16): Chair, Stool, Table, Bed, Chest, Lamp, Shelf, Couch
- **Decor** (16×16): Rug, Painting, Banner, Flag
- **Tiles** (8×8, shown tiled 3×3 in the preview): Stripes, Checks, Brick, Waves, Starry, Diamonds

"Start with an empty canvas" keeps the chosen template's size and identity but clears the
pixels. The template matters: in Speck the template says what a thing *is* (a chair blocks
the way, a rug is walked over, a portrait sits on your world pixel by its centre) and the
pixels only say what it looks like. A file can reference any of the game's 177 templates,
so a design exported from the game itself also opens here.

## Exports

Three clearly separate downloads, in the side panel:

| button | file | what it is |
| --- | --- | --- |
| **Save editable design** | `speck-<name>-<template>.speck.json` | the real thing: the game's versioned design format. Reopen it here or import it into Speck. |
| **Download PNG** | `speck-<name>-<w>x<h>.png` or `…@8x.png` | lossless, transparent background; 1× native or enlarged 4×/8×/16× with hard pixel edges (nearest-neighbour) |
| **Download JPG** | `speck-<name>-<w>x<h>@8x.jpg` | an ordinary picture for sharing. JPG has no transparency, so clear pixels are flattened onto a background colour you choose. **Not** the editable file. |

Each shows a thumbnail, the output dimensions and an estimated file size before you press
it. Exported artwork carries no watermark or branding; the studio credit lives in the page.
Downloads work with storage blocked: they are built in memory and handed to the browser.

### The editable file

```json
{
  "format": "speck-design", "fv": 1, "made": "2026-09-19T00:00:00.000Z", "by": "speck-studio",
  "design": {
    "v": 1, "id": null, "tpl": "chair", "cat": "furniture", "name": "Red Chair",
    "w": 16, "h": 16,
    "px": ["................", "....000000......", "..."],
    "pal": { ".": null, "0": "#5c3d22", "1": "#a9764a", "2": "#dc2626" },
    "fav": 0, "at": 1758240000000, "up": 1758240000000
  }
}
```

- `fv` is the file envelope version; `design.v` is the design format version
  (`Studio.FORMAT`). Either can move without the other and both are migrated, never wiped.
- `design` is exactly the object the game's server stores in a player's library and accepts
  on `{t:'design', act:'save'}`. `px` rows are one character per pixel, `.` is transparent,
  every other character is a key of `pal`. `w`/`h` must match the template.
- The anchor is not stored because it belongs to the template: a portrait is centred on its
  `(w>>1, h>>1)` cell, furniture fills one world cell. There is one layer; the format has no
  layers.
- A bare design object (a library entry with no envelope) is also accepted, so entries
  copied out of `players.json` open too.

Opening a file checks, in order: size (64 KB cap), text/JSON, envelope kind and version,
design version, template exists, category matches template, dimensions are whole numbers,
within 64×64 and equal to the template's, the right number of rows, each row the right
length and using only palette characters, palette keys single characters and values
`#rrggbb` or `null`, name is text. Then the game's own `Studio.validate` and
`Studio.sanitize` run. Every refusal names the field and what was found. Nothing in a
file is executed; the palette is copied key by key so a `__proto__` entry does nothing.

### Compatibility, honestly

The importer is real and maintained in the game: `public/studio-file.js` is shared by the
game client (**📂 import file** / **💾 export file** on the studio's *my designs* tab), the
server-side save gate and this teaser. `tools/test-studio-file.js` proves the round trip
against a sandboxed game server: a file drawn as a chair is stored cell for cell,
including a custom colour and an erased pixel; a portrait wears with its three test
pixels at `(-6,-6)`, `(0,0)` and `(5,5)` relative to the player's world pixel; a
hand-widened 17×16 chair is refused by the server as well as by the reader; and the
fixture folder `tools/fixtures/studio-file/` holds the valid, migrated and broken cases.

What that does *not* promise: the design format is version 1 today. If the format changes
before launch, version-1 files will be migrated by the same `Studio.migrate` path the
server already uses for old library entries; that path exists and is tested but has never
had to do any work yet. Imports into the live game also need an account in the game,
which is outside this page.

## Autosave and drafts

The draft (design, name, unsaved flag) is written to `localStorage` a moment after each
change and restored on the next visit, with a toast saying when it was saved. If storage
is unavailable (private mode, blocked third-party storage inside an iframe, full quota)
the page shows a yellow **Autosave is off** card and everything else still works; manual
downloads never touch storage. `?nostorage=1` on the URL simulates a blocked browser.

Before a drawing is replaced (new template, open file, Restart) the page asks: **Save
editable design / Discard / Cancel**. The dialog is only shown when there is unsaved work.

## Embedding

```html
<iframe
  src="/teasers/speck/index.html"
  title="Speck Studio — draw a pixel-art portrait or furniture piece"
  width="100%" height="760" style="border:0; max-width:1100px; min-height:620px"
  loading="lazy"
  allow="fullscreen"
  sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"></iframe>
```

- `height` is a sensible start; the page adapts to whatever height it gets, and can tell
  the parent what it would like (below).
- `sandbox` is optional. If you use it, `allow-downloads` is required or the three download
  buttons do nothing, `allow-scripts` is required, and `allow-same-origin` lets autosave
  use storage (without it the page runs in the storage-blocked mode and says so).
- Standalone mode needs nothing from a parent and never waits for one.

### Messages to the parent (optional)

Off by default. To turn it on, set the exact origin of the embedding page in `index.html`:

```html
<script>window.SPECK_TEASER_CONFIG = { parentOrigin: 'https://brok3nbydesign.com' };</script>
```

Then, only when the page is inside a frame, it posts to that origin (never `*`):

| `type` | when | extra fields |
| --- | --- | --- |
| `ready` | once, after boot | `framed: true` |
| `resize` | when the page's height changes | `height` (CSS px, whole page) |
| `completed` | once per page load, the first time the visitor downloads anything (design, PNG or JPG) | `kind`: `"json"`, `"png"` or `"jpg"` |

Every message is `{ source: 'speck-teaser', v: 1, app: '1.0.0', type, ... }`. No pixels,
names, files, identifiers or other visitor content are ever sent. The page does not listen
for messages from the parent and never reads or writes parent state. `completed` is the
legitimate "the visitor made and exported a design" signal; it does not mean anything was
recorded anywhere, and there is no passport or account integration in this teaser.

Parent side:

```js
window.addEventListener('message', e => {
  if (e.origin !== 'https://brok3nbydesign.com') return;   // the origin the teaser is served from
  const m = e.data;
  if (!m || m.source !== 'speck-teaser' || m.v !== 1) return;
  if (m.type === 'resize') iframe.style.height = Math.min(m.height, 1100) + 'px';
  if (m.type === 'completed') console.log('a design was exported as', m.kind);
});
```

`resize` reports the height at which nothing inside the teaser needs to scroll (on a wide
frame: header plus the whole side panel, about 1,200px; on a phone-width frame: the
whole stacked page). Cap it as above if you would rather the side panel scroll.

## Limitations

- One layer, one frame: the Speck format has no layers or animation, so neither does this.
- Canvas size is fixed by the template (12×12, 16×16 or 8×8 here). There is no free-size
  canvas because the game has none.
- The picker offers 30 of the game's 177 templates; the rest open from files.
- Old browsers without `<dialog>` get a plain confirm box for the unsaved-work guard.
- JPG quality is fixed at 0.92.
- The "completed" message fires on the first download, not on any in-game event, because
  this page has no connection to the game.
