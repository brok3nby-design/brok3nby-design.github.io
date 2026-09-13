# Bid & Buried — website teaser

One storage locker, dug out front to back, in 30–90 seconds. A taste of *Bid & Buried*
for the studio website. Independently created by Brok3n by Design.

Full project: https://brok3nbydesign.com/bid-and-buried.html

## What it is

- **Look from the door.** The front row is lit, the rest is dark. Tap a thing in the
  front row and the yard tells you what it knows (the game's own peek hints). The
  office's line about the tenant and the door's own flavor line are the other clues.
- **Buy it.** No rivals, no bidding: Buzz's opening number is the price. (The auction,
  the rivals, the paper and the daily economy are the full game's.)
- **Dig it out, front to back.** Anything behind something is blocked until that is
  out of the way. Boxes, trunks, bags and lockboxes open as you pull them. Every find
  gets its real name, its game value, its tier colour and one line: a fixed note (the
  drawer things, the decade's things, named junk), what it did when you lifted it
  (rattled, slid, heavier than it looks), or what a closer look turns up (a serial, a
  year, initials, a ticket stub from a town). A legend or its fake stays "needs an
  appraiser" until the end.
- **What would you keep?** The van holds less than came out. Choose. Cash rides in your
  pocket.
- **The haul.** Paid, kept, cash, left for the scrap man, net. What kind of unit it was
  and which front-row thing gave it away. New locker, restart this unit, or the link to
  the full project.

Everything in the unit comes from the game's own code: the 217-item catalogue, the nine
owner archetypes and their pools, brands and conditions, containers and what they can
hold, stacking, the sleeper-in-a-bag rule, named junk, the myth slot (a legend or a very
good fake), the procedural pixel sprites. `js/bb-core.js` *is* eleven of the game's
source files, concatenated, unedited. No item art files exist — the sprites are drawn
by code.

## Files to upload

Copy the whole `teaser/` folder to the site as `/teasers/bid-and-buried/`:

| File | Raw | gzip | What |
|---|---:|---:|---|
| `index.html` | 2.5 KB | 1.1 KB | the page, and the one embed setting |
| `teaser.css` | 9.6 KB | 2.8 KB | styles (the game's palette) |
| `js/bb-core.js` | 464 KB | 139 KB | the game's catalogue, generator and sprites (built) |
| `js/bb-teaser-gen.js` | 15 KB | 6 KB | the teaser's rules: plan, bounds, the van, the summary |
| `js/bb-teaser.js` | 29 KB | 9 KB | the page: canvas, controls, phases, sound, messages |
| `fonts/VT323.ttf` | 144 KB | 41 KB | the masthead face |
| `fonts/Rubik-Regular.ttf` | 171 KB | 76 KB | the UI face |
| `fonts/Rubik-Bold.ttf` | 172 KB | 77 KB | the UI face, bold |
| **Total** | **~1.0 MB** | **~352 KB** | |

Also in the folder, optional on the site: `README.md` (this file) and `cover.png`
(1200×630, a representative image for the project page or a social card).

No server code, no account, no paid service, no external runtime, no secrets, no
network requests beyond its own eight files. All paths are relative, so it works from
any folder depth and from a plain `file://` double-click too. Make sure the host serves
`.ttf` (any static host does) and, ideally, gzip or brotli for `.js`.

The first meaningful frame needs `index.html`, `teaser.css` and the three scripts; the
canvas carries no text, so the fonts arrive whenever they arrive (`font-display: swap`).

## Controls

| Input | What |
|---|---|
| Tap / click a thing in the locker picture | door phase: the yard's hint · dig phase: pull it |
| Tap / click a thing in the list | the same, with the name spelled out; blocked things say so |
| Tab / Shift+Tab, Enter or Space | every control is a real button; focus is a yellow ring |
| **New locker** | a fresh unit at once (never the same arrangement twice running) |
| **Restart** | this unit again, from the door |
| **Sound: off/on** | a few synthesized clicks, thuds and chimes; off by default, remembered if storage allows |
| **Buy it** → **Stop digging / Load the van** → **Drive home** | the three steps |

Hover only ever draws an outline; nothing is revealed by hover alone.

## Seeds (repeatable lockers)

Every page load rolls a fresh locker. For a repeatable one:

```
/teasers/bid-and-buried/?seed=4242
/teasers/bid-and-buried/?seed=raccoon        (words are hashed)
/teasers/bid-and-buried/?seed=4242&start=dig (skip the door: for screenshots and tests)
```

The footer's "locker #N" link is the current seed. The same seed gives the same unit,
the same names and the same values, every time, on every machine.

## Embedding

The example (a title, a sensible starting height, no permissions needed — the teaser
downloads nothing, plays no media files and asks for no device access):

```html
<iframe src="/teasers/bid-and-buried/"
        title="Bid &amp; Buried — website teaser: one storage locker to dig out"
        width="100%" height="760" loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        style="border:0;max-width:1040px;display:block;background:#0b0c12"></iframe>
```

Standalone works as is. Inside an iframe it works as is too — the messages below are
optional and off until you switch them on.

### Messages to the parent page (optional)

In `index.html`, set the exact origin of the page that embeds the teaser:

```js
window.BB_TEASER_CONFIG = { parentOrigin: 'https://brok3nbydesign.com' };
```

With that set, and only when it is running inside a frame, the teaser calls
`window.parent.postMessage(message, parentOrigin)` with that exact origin as the
target (never `"*"`; a value of `"*"` or a non-origin is ignored and nothing is sent).
It never reads or writes anything in the parent, and never sends user content —
no answers, no text, no images. The schema, version 1:

| `event` | when | fields |
|---|---|---|
| `ready` | the page has booted | `height` (document height in CSS px) |
| `resize` | the document height changed | `height` |
| `completed` | the visitor reached the haul summary | `seed` (number), `found` (count), `kept` (count) |

Every message is `{ type: 'bb-teaser', v: 1, event, ...fields }`. The parent should
check `event.origin` against the teaser's origin and `data.type === 'bb-teaser'`
before acting; `tools/teaser_embed_test.html` in the game repo is a working listener
that grows the iframe on `resize`. `completed` is the legitimate "they finished one
locker" signal for analytics or a nudge to the project page. Nothing here is tied to
a passport, account or progression system; none is live.

## Accessibility and behaviour

- Real `<button>`s everywhere, labelled; the locker picture is `role="img"` with a
  description that follows the phase, and every item in it is also in a labelled list.
- Visible focus (yellow ring), 14 px minimum text, a dark palette with the game's
  contrast.
- Works with touch, mouse and keyboard, from 320 px wide phones to desktop; one column
  under 900 px, two above.
- `prefers-reduced-motion`: no door roll, no lift-out, no card slide; the picture just
  changes.
- Animation runs only while something moves and stops when the tab is hidden; if the
  browser stops delivering frames (a background tab, a hidden pane) a watchdog settles
  the picture after 1.5 s so nothing is ever stuck.
- Storage blocked (private mode, strict settings): everything works; only the sound
  preference is not remembered.
- Missing art cannot happen (sprites are code), but a sprite that fails to draw falls
  back to the game's mystery crate rather than a hole.
- Sound is Web Audio synthesis, created on the first click of the sound button; no
  files, nothing autoplays.

## Limits, on purpose

- No auction, no rivals, no towns, no paper, no buyers, no days: it is a teaser.
- One town's pricing (Dusty Flats, a day-9 door), with two other towns' habits
  borrowed so a door is never dull: Salt Lick's sleeper in a bag, Marrow Creek's
  named-junk rate.
- Values are the game's appraised values; in the full game a plain thing prices
  itself on arrival and anything with a claim on it (a legend, a maker's mark) needs
  the appraiser, which is why a legend or its fake stays "needs an appraiser" until
  the summary.
- Locked boxes open on the tailgate here; in the game a locksmith costs $60 and a
  day.
- Media piles (tapes, records, shoeboxes of cartridges) come out as one thing with one
  value; in the game you flip through them spine by spine.
- The set pieces, the authored story doors, the provenance chains and the paper are
  built across days, so they never roll in a single-locker teaser.
- Up to 16 finds per unit (things on the floor plus what is in them); larger units
  hand loose junk to the scrap man before the door opens.

## Rebuilding

`js/bb-core.js` is generated. When the game's catalogue changes:

```
python tools/build_teaser.py            # bundle, copy fonts, run the checks, zip
python tools/build_teaser.py --cover    # also render cover.png (needs playwright + Chrome/Edge)
node tools/teaser_check.js --verbose    # the headless checks alone
```

The checks prove: fixed seeds regenerate identically; 600 units clear front to back
and a blocked thing never pulls; 400 units in a row never repeat an arrangement and
stay inside the find cap; every archetype and contract rolls; the van's empty and
full states summarise; every sprite in the catalogue draws at every shade; a blocked
storage write is swallowed.

The teaser reads nothing from and writes nothing to the full game's save. It is a
separate entry point with its own two files; the game's `index.html` is untouched.
