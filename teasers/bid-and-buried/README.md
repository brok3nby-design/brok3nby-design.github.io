# Bid & Buried — website teaser

One door of one afternoon, played in the game itself. About a minute.

Full project: https://brok3nbydesign.com/bid-and-buried.html

## What happens

1. **Join the auction.** Buzz Kettleman has the gavel; Eagle Ed is on unit 901 at $175 and
   his strip reads *sweating*. Buzz introduces him with his own recorded card, the way every
   rival gets introduced once in the game.
2. **Bid.** Ed holds. The count starts on you, with the roll under it and the heartbeat. At
   "going once" Ed finds his nerve: the late-bid sting, "A late bid!", his recorded line.
   Bid again. He is past his number and folds, in his own voice. Going once, going twice,
   **SOLD**: the cheer, the gavel, the sting, and the room settles.
3. **Dig it out.** The real dig screen: front to back, energy per pull, the LOAD IT / LEAVE IT
   panel, the van bar. The crate up front, then the way to the back, where something loose
   gets the game's first-find ceremony (the hum, the dust, the object rising, PICK IT UP).
4. **LOAD UP & LEAVE.** The door comes down and that is the end of play.
5. **The results screen.** Home, the haul gone through: every box opened, the crate's rummage
   and false bottom tried, everything appraised, all done by the game's own functions in the
   background. What came home with its values, what the evening found, and the call to action:
   SEE THE GAME PAGE.

About a minute. Everything on screen, and every sound, is the game's own: `js/` is the full
game, unedited. `js/teaser.js` is the director: one seeded world (Dusty Flats, day 9), one
unit dressed with the game's own parts (an epic thing loose in the back row, a crate whose
LOOK CLOSER seeds are chosen so they land, cash in the front row), Ed's paddle scripted for the
drama, and a line under the picture saying what to do next. The auction, the dig and the
reveal are the real screens with their real rules.

Not in it, on purpose: the yard, the paper, the garage screen, the buyers, the second door,
the next day. It is a teaser, not a demo.

The teaser reads nothing from and writes nothing to a real game's save: the game's storage
adapter is swapped for memory, and it runs as a demo world (no saves, no arcs, no phone, no
interruptions, no cold open).

## Files to upload

Copy the whole `teaser/` folder to the site as `/teasers/bid-and-buried/`.

| Folder | What | Size |
|---|---:|---:|
| `index.html`, `teaser.css` | the page and the one embed setting | ~15 KB |
| `js/` | the game (28 files, no dev room) plus `teaser.js` | ~1.7 MB |
| `fonts/` | VT323, Rubik regular and bold | ~0.5 MB |
| `backgrounds/` | the auction and the dig | ~0.6 MB |
| `npcs/` | Ed (portrait and cutout), Buzz (still and talking) | ~3.3 MB |
| `sounds/` + `sounds/manifest.js` | 54 files, one take each: Buzz's card for Ed, the chant and the numbers $200-$400, the count and the sale, Ed's bid and fold, the effects the run plays, two ambiences. No music | ~5 MB |
| **Total** | | **~12 MB** on disk; about 3 MB before the first click, the rest streams as it plays |

`README.md` and `cover.png` (1200×630) are in the folder too; they are optional on the site.

Sounds and music load when they first play, not up front: the page is interactive after the
scripts, the fonts and the auction background (about 3 MB), and the rest streams behind the
sale. No server code, no account, no paid service, no external runtime, no secrets, no
requests beyond the folder. Relative paths, any folder depth, `file://` works too.

Make sure the host serves `.mp3`, `.wav`, `.ttf` and `.png/.jpg` with sensible types (any
static host does) and gzip or brotli for `.js`.

## Controls

| Input | What |
|---|---|
| Click or tap the buttons on the screen | they are the game's own: BID, LOAD IT, PICK IT UP, LOAD UP & LEAVE |
| Tab / Enter, or a controller | the game's focus ring moves between the same buttons |
| **M** | mute (also the speaker icon top left, and the page's Sound button) |
| **F** | fullscreen |
| **Escape** | backs out of a card |
| **Sound / Fullscreen / Restart** (page buttons) | the page's own |
| **skip ahead ▸** (under the picture) | jumps to the next beat, the honest way (the game does the work) |

Sound is on when you press JOIN THE AUCTION (that click is the browser's audio permission);
"join with the sound off" starts muted. The yellow pulse on the canvas and the line under it
are the director; everything else is the game.

## Seeds

The world is seed 4242 every time, so the run is the same door for every visitor (the
plants are chosen for it). `?seed=N` builds a different world — a different unit, different
things in it — and the director dresses that one instead; the drama script is the same.

## Embedding

```html
<iframe src="/teasers/bid-and-buried/"
        title="Bid &amp; Buried — website teaser: one auction, one dig"
        width="100%" height="700" loading="lazy" allow="fullscreen"
        referrerpolicy="strict-origin-when-cross-origin"
        style="border:0;max-width:1100px;display:block;background:#0b0c12"></iframe>
```

`allow="fullscreen"` is the only permission it wants (the F key and the page button); it
downloads nothing and asks for no device. Standalone works as is; inside a frame it works as
is. The canvas is 960×540 and scales to the frame's width, so give it at least 640 px of
width; on a phone, landscape.

### Messages to the parent page (optional)

In `index.html`, set the exact origin of the page that embeds the teaser:

```js
window.BB_TEASER = { parentOrigin: 'https://brok3nbydesign.com' };
```

With that set, and only when it runs inside a frame, the teaser calls
`window.parent.postMessage(message, parentOrigin)` with that exact origin (never `"*"`;
`"*"` or anything that is not an origin is ignored and nothing is sent). It never reads or
writes anything in the parent, and never sends user content. Schema, version 2:

| `event` | when | fields |
|---|---|---|
| `ready` | the page has booted | `height` (document height in CSS px) |
| `resize` | the document height changed | `height` |
| `started` | JOIN THE AUCTION was pressed | `seed` |
| `completed` | the visitor reached the results screen | `seed`, `pulls`, `finds` (counts) |

Every message is `{ type: 'bb-teaser', v: 2, event, ...fields }`. Check `event.origin`
against the teaser's origin and `data.type === 'bb-teaser'` before acting.
`tools/teaser_embed_test.html` in the game repo is a working listener that grows the frame
on `resize`. `completed` is the honest "they finished a door" signal; nothing here is tied to
a passport, an account or the game's progression, and none of that is live.

## Behaviour and limits

- Runs at the game's own 960×540; scales down to the frame. Under about 640 px wide the text
  gets small: it is a desktop and landscape-phone teaser, not a portrait-phone one.
- Keyboard: the game's focus ring (Tab, Enter, Escape) and a standard-mapping gamepad both work,
  as in the game. The page's own buttons are real buttons.
- Animation runs at the game's frame rate; a hidden tab keeps its clock (the game ticks a
  hidden tab itself) so a sale finishes even if you look away.
- No pause menu, no Ledger, no dev room, no saving: Escape only backs out of a card. Storage blocked: nothing changes; the teaser stores nothing anyway.
- Missing art: the game draws its own stand-ins (Ed's card without his cutout is still a card).
- No reduced-motion mode of its own: the game's MOTION setting is not exposed here; the run
  has no motion clips, only the game's ordinary screen animation.
- Not in the teaser: the paper, the yard, the garage, rivals other than Ed, the buyers, the
  day summary, the second and third doors, the towns, the story arcs.

## Rebuilding

```
python tools/build_teaser.py            # copy the game, pick the art and sounds, write the manifest, run the checks, zip
python tools/build_teaser.py --cover    # also render cover.png (needs playwright + Chrome/Edge)
node tools/teaser_check.js --verbose    # the headless run alone
```

The checks play the whole run headless through the game's own functions: the card, the bid,
the count, Ed's late paddle, the fold, the hammer and the money; the dig with the coach's own
pull order, the reveal, the van; LOAD UP & LEAVE onto the results (the haul opened, gone
through and appraised); restart; and every skip. Rebuild whenever the game changes.
