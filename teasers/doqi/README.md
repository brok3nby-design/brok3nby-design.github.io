# DOQI Field Evaluation — five-question website teaser

A self-contained, static, five-question preview of the Department of Questionable
Inventions (DOQI) field evaluation from *The Ethical Gauntlet*. Built for the studio
website at `/teasers/doqi/`. Independently created by Brok3n by Design.

Full project page: <https://brok3nbydesign.com/doqi.html>

> Naming note: the game itself calls DOQI the **Department of Questionable Inventions**
> everywhere (quiz header, intro terminal, dossiers). The teaser follows the game.

## What is in this folder

```
teaser/
  index.html            entry point; contains the studio config block
  css/teaser.css        styles (game palette, responsive, reduced-motion aware)
  js/doqi-data.js       the five questions, 20 archetypes, 13 traits, workspace lore (generated)
  js/doqi-core.js       scoring logic (shared by the page and the unit tests)
  js/teaser.js          UI controller, keyboard, sound, copy/PNG export, postMessage
  assets/badges/*.webp  20 archetype badges, 512 px, from the game's art
  assets/traits/*.jpg   13 trait icons, 160 px
  assets/questions/*.webp  the game's scenario art for the 5 questions (shown above each question)
  assets/video/therapist.mp4  Dr. Sloan's intake loop from the game (first screen)
  assets/audio/*.ogg    game background music, answer/sign/result effects, Dr. Sloan narration for the 5 questions
  assets/stamp.webp     DOQI seal
  assets/favicon.svg
  embed-example.html    copy-paste iframe snippet with the optional message listener
  cover.png             1200x630 representative cover image
  README.md             this file
```

No build step is required to run it. Copy the folder to the web server as-is.
All asset paths are relative, so it works at any sub-path (`/teasers/doqi/`, `/doqi/`, …).

## Payload

| Part | Size |
|---|---|
| First meaningful load (HTML + CSS + JS + seal) | ~100 KB |
| Therapist video (first screen, loads in parallel) | 578 KB |
| 5 question images (loaded one ahead) | 794 KB total |
| Background music (streams after the first click) | 2.3 MB |
| 20 archetype badges (only the winning one is loaded, ~35–60 KB each) | 1.0 MB total |
| 13 trait icons (three are loaded on the result screen) | 97 KB total |
| Narration and effects | 502 KB total |
| Cover image (not loaded by the page) | 296 KB |
| **Whole folder** | **~5.6 MB** |

## Controls

- **Mouse / touch:** tap an answer, then *Next* (or *Submit for review* on question 5). *Back* returns to the previous question with its answer still selected.
- **Keyboard:** `Tab` moves between controls, the four answers are a native radio group (`Arrow` keys select), `1`–`4` select an answer directly, `Enter` continues, `Esc` closes dialogs.
- **Restart** (header) clears all answers and returns to the intro. **Retake** (result screen) clears all answers and starts at question 1.
- **Sound** is on by default, at the owner's request. The game's background music starts as soon as the browser allows it. Browsers block audible autoplay until the visitor interacts, so in practice it starts on the first tap, click or key press, usually "Sign and begin". Dr. Sloan narrates each question and the answer, signing and result effects play. The header toggle mutes everything. Sound pauses while the tab is hidden.
- **Copy result text** puts a plain-text summary on the clipboard. If the clipboard is blocked (permissions, insecure context, some iframes) a dialog shows the text for manual copying.
- **Download card (PNG)** renders a 2400×1260 branded card (1200×630 layout at 2×) and opens a large preview with *Get game updates*, *Save PNG* (`doqi-teaser-<archetype>.png`) and *Close*. *Get game updates* opens the newsletter panel on the studio about page. Where downloads are blocked the visitor can right-click / long-press the preview image.

## How the five questions were chosen

The full game has **40** questions (not 20), each with four answers that add weighted
points to some of 13 traits. There is no randomisation in the game; questions run in
file order. The teaser uses a **curated fixed set** rather than a random draw so the
short experience is tuned instead of accidental.

Every 5-question combination from a website-safe pool of 24 questions (the cruder
scenarios were excluded) was brute-forced across all 1,024 answer paths and scored on:

1. all 13 traits reachable,
2. all 20 archetypes reachable as the outright winner,
3. how evenly outcomes spread (no archetype wins more than a quarter of paths),
4. tone mix (office, moral dilemma, absurd-social).

Selected: game questions **18, 20, 30, 35, 37** (the `CLASSIFIED // SIM-n` chip shows the
original number). All 20 archetypes are reachable, the most common result wins 19% of
paths. Question text, answer text, answer order and trait weights are verbatim from
`ethical_gauntlet_questions_final.json`, which a unit test enforces. Each question shows
the game's own scenario art above it. The small "CLICK HERE" invention thumbnails are left
out because the pages they open exist only in the full game.

## Scoring adaptation

The full game (`src/utils/archetypeUtils.js`) sums each chosen answer's trait weights,
then scores every archetype as the sum of its three traits and picks the highest.
There are **no absolute thresholds** in the game, so nothing from the 40-question scale
is reused blindly. The teaser keeps the same rule and adapts three things:

- **Answer replacement.** Answers are stored per question and totals are recomputed
  from that array, so going back and changing an answer replaces its contribution
  (the game appends, because it never lets you go back).
- **Explicit tie procedure.** With five questions about 22% of answer paths tie on
  points under plain argmax (the game only breaks ties by file order). The teaser resolves
  a tie by: (a) more of the archetype's three traits actually scored above zero, then
  (b) the higher single trait inside the archetype, then (c) the game's file order.
  The result screen states which rule applied.
- **Match strength.** Shown as a percentage of the best score that archetype can reach
  across all 1,024 five-question paths, so a 5-question total is never compared to a
  40-question maximum.

Unit tests live outside this folder in `teaser-dev/scoring.test.mjs` and cover:
additive parity with the game, answer replacement, incomplete-answer rejection,
"winner always has the max score", reachability of all 20 archetypes, tie determinism
for every tie path, the file-order fallback, normalisation bounds, and the disclaimer text.
Run from the project root with `node --test teaser-dev/scoring.test.mjs`.

## Result presentation

The card chip reads CLASSIFIED. Provisional classification (archetype title + badge art), clearance level and
assigned workspace (from the game's level lore), the archetype's in-world description,
the three strongest traits with their taglines, the runner-up, the tie rule if one
applied, and a fixed line stating the teaser is fictional, uses five of the full
evaluation's 40 questions, and is not a real psychological evaluation.

## Privacy

No names, emails or personal details are requested. Answers live in page memory only
and are cleared on Restart/Retake. The page uses no `localStorage`, cookies, analytics,
network requests or third-party scripts; it works with storage blocked.

## Embedding

See `embed-example.html`. Minimal form:

```html
<iframe
  src="/teasers/doqi/index.html"
  title="DOQI Field Evaluation — five-question website teaser"
  style="width:100%;max-width:800px;height:760px;border:0;border-radius:14px;background:#832615"
  loading="lazy"
  allow="autoplay; clipboard-write"
  sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox"
></iframe>
```

- `allow-downloads` is required for the PNG *Save* link inside a sandboxed frame.
  `allow-popups` lets the project-page link open in a new tab. Without `sandbox` none of
  this is needed.
- The initial height of ~760 px fits the longest screen (the result) at 800 px wide; on
  phones it can scroll inside the frame. Use the resize message to fit exactly.

### Optional messages to the parent page

The teaser posts messages **only** when it is inside an iframe *and* the embedding page's
origin is listed in `parentOrigins` in `index.html` (currently `https://brok3nbydesign.com`
and `https://www.brok3nbydesign.com`). The listed origin is used as the exact
`targetOrigin`; `"*"` is never used, and the page never reads or writes parent state.
Standalone (no parent) it simply sends nothing.

Schema (version 1):

| `event` | When | Extra fields |
|---|---|---|
| `ready` | scripts initialised | `height` (content px) |
| `resize` | content height changed | `height` |
| `completed` | result screen shown | none |

Every message is `{ source: "doqi-teaser", version: 1, event, ...extra }`. No answers,
result, exported image, or any other user content is included. Passport or account
integration is **not** part of this; `completed` is a plain signal, nothing more.

Listening side must check `event.origin` and `data.source` (see `embed-example.html`).

## Configuration (top of `index.html`)

- `projectUrl` — link used in the footer, result screen and PNG card.
- `parentOrigins` — allowlist for postMessage.
- `updatesUrl` — target of the *Get game updates* button. Defaults to `https://brok3nbydesign.com/about.html#newsletter`.
- `fullTestUrl` — `null` hides the "Take the full test" button. Set it only to a verified public HTTPS URL.

## Rebuilding from the game source (optional)

From the project root:

```
python teaser-dev/prepare_assets.py   # badges/traits/stamp/audio from local_assets/
python teaser-dev/build_data.py       # regenerates js/doqi-data.js from the game JSON
python teaser-dev/make_cover.py       # regenerates cover.png
node --test teaser-dev/scoring.test.mjs
node teaser-dev/serve.mjs 8765 .      # then open http://localhost:8765/teaser/
```

Requires Python 3 with Pillow, and Node 18+.

## Accessibility and behaviour notes

- Answers are a labelled native radio group inside a `fieldset`/`legend`; buttons have visible focus rings; live regions announce the processing step and errors.
- Text is ≥13 px, colours follow the game's cream-on-red palette with high contrast.
- `prefers-reduced-motion` disables transitions and the stamp animation, keeps the therapist video paused on its first frame, and shortens the "filing" interlude to a quarter second.
- Animations pause and narration stops while the tab is hidden.
- Layout tested from 320 px wide to desktop; two-column answers appear from 560 px.

## Limitations

- **Newsletter anchor.** The about page's newsletter panel has no `id` yet, so `#newsletter` currently opens the top of the page. Add `id="newsletter"` to `<div class="newsletter" ...>` on about.html and the button will land on the panel.
- **Music autoplay.** No browser plays audible sound before the visitor interacts, so music starts on the first click or key press rather than the instant the page opens. Embeds also need `allow="autoplay"` on the iframe.

- **Audio format.** Sound files are the game's OGG Vorbis originals. Safari (macOS/iOS) does not reliably play OGG; there the sound button reads "No sound" and is disabled. Transcoding to MP3/AAC would fix this but no encoder was available in the build environment.
- **PNG export from `file://`.** Opening `index.html` directly from disk works for the quiz, but Chrome treats local images as cross-origin, so the PNG card cannot be rendered; serve the folder over HTTP (any static host).
- **Downloads inside sandboxed iframes** need `allow-downloads`; some in-app browsers still block `download` links, hence the on-screen preview with a save hint.
- Reduced-motion and hidden-tab behaviour were verified through the CSS media query and visibility handler; the in-app test browser could not emulate the OS reduced-motion setting directly.
- No "Take the full test" button is shown because no verified public full-test URL exists yet.
