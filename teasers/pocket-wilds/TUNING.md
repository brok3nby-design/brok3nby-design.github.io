# Pocket Wilds boss-fight teaser — tuning notes

The teaser at `teaser/index.html` runs the game's real dice battle. `rules.js` is a
line-for-line port of the battle functions in `index.html` (BUILD 21-AUG-EJ), and
`tests/equiv.js` proves it: run inside the real game page it feeds identical seeds and
identical situations to both implementations and compares every number that comes out
(damage, HP, stamina, momentum, block, shatter, forced stances, stance picks, pool rolls).

## What is the game, untouched

- Knight dice pool 2d12 + 2d8; d20 to dodge
- Bonus dice from the kit: FORGE (sword LV.3 → d6) and BOON (OCTAVE → d8), labelled in the tray
- Cracked dice (1s), stumble / fumble thresholds scaling with pool size
- Hold + one reroll; ALLOCATE dice to STRIKE / GUARD / FOCUS with the game's exact rules
- Pips-are-damage mapping, crit thresholds by Monte-Carlo percentile, momentum, UNLEASH
- Boss stances (PROWLING / WINDING UP / GUARDING / CHANNELING / EXPOSED), the same weights
- Mossback the Elder: 550 HP, 12 ATK, ABSORB MOSS (+6%), phase two below half (mends 3%/turn)
- The boss's own d20 (whiffs), dodge thresholds (8 normal / 5 against a telegraph), perfect dodge
  counters, DIE SHATTERED on an undodged mighty blow, GUARD pips absorbing a blow
- SHIELD BASH (25 ST; stun on 11+, breaks a wind-up), potion (40% max HP), bomb (130 heavy hit)
- Every timing in the fight: dice physics, lock cadence, message durations, lunges

## Deliberate teaser changes

| Change | Why | Where |
|---|---|---|
| Hero's sword is forged to **LV.3** (the forge builds one at LV.2) | Shortens the fight to ~9 hero turns (1–3 min) without touching the boss. Also grants the FORGE d6, so the visitor sees bonus dice in play. | `rules.js` `makeHero()` |
| **FLEE** removed from the command menu | There is no overworld to flee into | `rules.js` `bMenuList()` |
| Messages can be **skipped** with a click / Enter / Space | Keeps transitions short for a visitor; the game waits them out | `TUNING.msgSkip` |
| Victory / defeat end in an **overlay** with Rematch + Play link | The game returns to the overworld | `index.html` |
| No achievements, stats, saves, leaderboard, vault | Teaser state is fully isolated — it writes nothing | — |
| Sound effects are the game's **synth** voices (no sample files); the boss's **recorded voice lines** are the game's own (`vo_*_0_*`), and the boss reveal narration plays on the first FIGHT | Keeps the teaser small while the warden still speaks | `index.html`, `assets/vo/` |
| Landscape-only on touch devices, with the game's TURN YOUR DEVICE gate; the fight holds while gated | Same rule as the game | `index.html` |
| The in-battle MENU button is a **RESTART** button | The pause menu belongs to the full game | `index.html` |

## Balance (measured, `scratchpad/sim.js`, 1500 seeded fights each)

| Player | Win rate | Hero turns (avg) |
|---|---|---|
| Mash ATTACK, always STRIKE ALL | ~32% | ~9.6 |
| Dodge the wind-ups, hold good dice, guard before big blows, potion under 35% | ~99% | ~9 |

The game does not force a win: the naive line loses two fights in three. A level-1 knight
with the forge's LV.2 sword would win about 3% of the time against the real Mossback —
which is why the sword is forged once more for the teaser.

## Keeping it in sync

When the battle code in `index.html` changes, re-port the affected function into
`rules.js` and rerun the equivalence suite from the game page:

```js
await fetch('teaser/tests/equiv.js').then(r=>r.text()).then(eval)
```

It returns `{pass, fail, details}`. Flavor verbs and body-part words are masked (the
game's audio layer draws random sample takes between the damage roll and those words),
so any remaining failure is a real rules drift.
