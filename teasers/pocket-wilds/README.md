# Pocket Wilds — boss-fight teaser

A standalone, embeddable sample of the game's dice battle: the level-1 knight against
**Mossback the Elder**, with the real rules, real names and real art.

## Files

| File | What |
|---|---|
| `index.html` | The page: canvas renderer (the game's own battle layout), intro card, hints bar, end card with **Rematch** and **Play Pocket Wilds** |
| `rules.js` | The battle rules, ported function-for-function from the game (`index.html` BUILD 21-AUG-EJ). No DOM, injectable RNG — runs in the browser and in node |
| `assets/` | Keyed boss portrait + 4 stance cutouts, keyed knight avatar, meadow backdrop (~2 MB total) |
| `tests/equiv.js` | Equivalence suite: runs inside the real game page and compares the port to the game's functions on identical seeds (130 checks) |
| `TUNING.md` | Every deliberate difference from the game, with the measured win rates |

## Deploy

Upload the whole `teaser/` folder as-is (keep `assets/` beside `index.html`). It makes no
network requests beyond its own files, writes nothing to storage, and never touches the
full game's saves, leaderboard, unlocks or daily runs. The **Play** button links to
`https://brok3nbydesign.com/pocket-wilds/`.

To embed in another page: an `<iframe>` at a 5:3 aspect (e.g. 960×576 plus ~110px for
the hints bar), or copy the `#stage` markup and the two scripts.

## Controls

Mouse / touch: click a command, tap dice to hold them or to cycle STRIKE > GUARD > FOCUS,
tap the tray buttons. Keyboard: `1–4` pick a command, `Enter` confirms, arrows move, in the
tray `1–6` toggle dice, `R` rerolls, `A` allocates, `Enter` strikes. Clicking during a
message skips it. RESTART (top-left of the canvas, or under it) is available at any moment.
The fight pauses while the tab is hidden.

## Keeping it in sync with the game

See `TUNING.md` — re-port the changed function into `rules.js`, then in the game page:

```js
await fetch('teaser/tests/equiv.js').then(r=>r.text()).then(eval)   // -> {pass, fail, details}
```
