# Website teaser build briefs

Copy the complete brief for a project into its existing development workspace. Each is self-contained. These are build instructions; the teasers have not yet been built in this website folder.

# Glass & Fortune — little dice roller

Create a polished miniature dice-rolling toy for Glass & Fortune. A visitor should immediately recognize the real game's glass dice, colors, symbols, table atmosphere, and sense of fate.

Use the existing five-dice model and actual hand-scoring code where practical. The first action is a prominent Roll the Dice button. Roll five glass dice, settle them quickly, and show the resulting hand name and a brief plain-language explanation of why it scores. Retain the game's number-plus-color identity; color must also have a symbol or text label.

After rolling, let the visitor select a die and try the real TURN, TINT, and RECAST actions if they can be cleanly isolated. Use a small, clearly displayed allowance so the toy stays understandable. These actions must mean what they mean in the current game: inspect rather than inventing their rules or scoring. Show the before-and-after score. If five dice plus all three actions is too heavy, keep the genuine roll and scoring and offer one bending action well.

A satisfying session should take 20–60 seconds, with unlimited fresh rounds. This is a little dice toy, not the full twelve-Reading campaign: omit accounts, economy, leaderboards, achievements from the full game, and long onboarding. Use a concise prompt such as “Roll. Bend one die. See what changes.” A short existing character reaction is optional; it must not slow repeated play.

Test scoring against existing game fixtures, selection, zero-action states, rolling repeatedly, and restarting during an animation. Prevent double-clicks from spending the same action twice or applying stale results.

## Delivery and shared requirements

Build this in the current project using its existing source, visual language, assets, and mechanics. Inspect the actual implementation first. Create a separate website teaser entry point; keep the full game's saves, progression, economy, and normal entry point isolated.

Deliver a self-contained static folder named teaser/ containing index.html and only the assets it needs, ready to be copied into the studio website at /teasers/glass-and-fortune/. Use relative asset paths and no required server, account, paid service, external runtime, or secret. If the source needs a build step, include reproducible build instructions and the finished static output. Also supply a ZIP, a representative cover image, and a README documenting controls, payload size, export formats if applicable, and any limitations. Do not deploy it.

It must work both standalone and inside an iframe, on phones from 320px wide and desktop, using touch, mouse, and keyboard. Use accessible labelled controls, visible focus, readable text, and sound off by default with an explicit toggle. Respect reduced-motion preferences, pause animation when hidden, and keep the first meaningful interaction fast. Include Restart and an unobtrusive “Independently created by Brok3n by Design.” credit. Label it as a website teaser and link to https://brok3nbydesign.com/glass-and-fortune.html for the full project.

For embedding, provide an example iframe with a title, a responsive initial height, and download permission where required. Optionally emit versioned ready/resize/completed messages to a configured, allowlisted studio parent origin, using an exact postMessage targetOrigin. Never use "*" or read or write parent game state. Standalone mode must work without a parent listener. Do not send personal information, quiz answers, exported art, or other user content through these messages. The README should describe the message schema and legitimate completion event; do not claim passport integration is live.

Verify real interactions, keyboard and touch behavior, restart, small-screen layout, reduced motion, storage being blocked, and the copied static folder running from a local HTTP server. Test the teaser in an iframe as well as by itself. Report what was built and tested and any remaining limitation.


---

# Speck — real Studio editor preview and exports

Create a public browser preview of Speck Studio so people can design pixel art before the game launches, download it for other uses, and save compatible assets for Speck.

Reuse or extract the real Speck Studio editor and its data model. Start with a manageable subset of the actual supported templates, such as a character, furniture object, or tile, chosen only after inspecting the project. Let visitors pick a template or start a blank supported canvas. Provide pencil, eraser/transparency, fill, eyedropper, palette selection, zoom, grid toggle, undo/redo, and a clear preview at native size. Use touch-friendly controls and an obvious way to pan/zoom without accidentally painting. Do not include multiplayer, accounts, world generation, inventory, or the full game.

Provide these clearly distinguished downloads:
1. An editable Speck asset/project file using the real versioned serialization format. Preserve canvas dimensions, palette, transparency, layers, template identifier, object type, anchor/origin, and every other field the actual importer requires.
2. A lossless PNG at native resolution with transparency, plus optionally a crisp enlarged PNG using nearest-neighbor scaling.
3. A JPG for ordinary image use, with a selectable solid background since JPG cannot preserve transparency. Explain that JPG is an image export, not the editable Speck file.

Also support reopening the editable export inside the preview. Validate size, dimensions, type, version, pixel bounds, and all imported fields before rendering; provide friendly errors for invalid files and do not execute imported content. Autosave the draft locally, but provide a storage-blocked warning and make manual download work without storage. Before clearing or replacing an unsaved drawing, offer an opportunity to save it.

Compatibility is a required deliverable, not a marketing assumption. Inspect Speck's current loader and run a real round-trip: create a preview design, export it, import it into the development game, and confirm pixel colors, transparency, dimensions, anchors, and template behavior. If no game importer exists, implement a small, tested importer and shared versioned schema in the project; avoid inventing an unrelated “Speck-compatible” format. Include fixtures and migration/version handling. If the current project cannot support this yet, ship normal image exports and label the editable format experimental. Do not promise launch compatibility until there is a maintained importer.

The visitor-facing copy should distinguish “Save editable design,” “Download PNG,” and “Download JPG.” Keep exported artwork free of watermarks and studio branding; place the studio credit in the interface. Include an export size estimate, useful filenames, and a thumbnail preview. Do not collect or upload the visitor's art. Test undo after fill, transparent edges, empty canvases, JPG background flattening, image export dimensions, corrupt/oversized imports, autosave recovery, and the actual game round-trip.

## Delivery and shared requirements

Build this in the current project using its existing source, visual language, assets, and mechanics. Inspect the actual implementation first. Create a separate website teaser entry point; keep the full game's saves, progression, economy, and normal entry point isolated.

Deliver a self-contained static folder named teaser/ containing index.html and only the assets it needs, ready to be copied into the studio website at /teasers/speck/. Use relative asset paths and no required server, account, paid service, external runtime, or secret. If the source needs a build step, include reproducible build instructions and the finished static output. Also supply a ZIP, a representative cover image, and a README documenting controls, payload size, export formats if applicable, and any limitations. Do not deploy it.

It must work both standalone and inside an iframe, on phones from 320px wide and desktop, using touch, mouse, and keyboard. Use accessible labelled controls, visible focus, readable text, and sound off by default with an explicit toggle. Respect reduced-motion preferences, pause animation when hidden, and keep the first meaningful interaction fast. Include Restart and an unobtrusive “Independently created by Brok3n by Design.” credit. Label it as a website teaser and link to https://brok3nbydesign.com/speck.html for the full project.

For embedding, provide an example iframe with a title, a responsive initial height, and download permission where required. Optionally emit versioned ready/resize/completed messages to a configured, allowlisted studio parent origin, using an exact postMessage targetOrigin. Never use "*" or read or write parent game state. Standalone mode must work without a parent listener. Do not send personal information, quiz answers, exported art, or other user content through these messages. The README should describe the message schema and legitimate completion event; do not claim passport integration is live.

Verify real interactions, keyboard and touch behavior, restart, small-screen layout, reduced motion, storage being blocked, and the copied static folder running from a local HTTP server. Test the teaser in an iframe as well as by itself. Report what was built and tested and any remaining limitation.


---

# Bid & Buried — small randomized storage locker

Create a small interactive storage-locker scene that gives visitors a taste of Bid & Buried's treasure hunting.

Show one compact locker with items arranged in front, middle, and back. Reuse the current game's real item catalogue, art, rarity/archetype logic, and visual style. Every page load should create a fresh locker, and a “New locker” button should generate another immediately without needing a full refresh. Avoid the same full arrangement back-to-back during a session. Keep a seeded generation mode available for repeatable tests.

Let visitors inspect visible clues before opening the locker, then reveal or remove items from front to back. Give each discovery its existing item name, interesting detail, and game value if the source supports it. A short “What would you keep?” ending can ask them to pick a few finds for limited van space, followed by a simple haul summary. Keep it to roughly 30–90 seconds. It is a teaser, so bidding against rivals and the full daily economy are optional and should be omitted if they add complexity.

Randomness should produce believable lockers, not disconnected confetti: choose a supported locker theme/archetype, use plausible clusters, preserve occlusion, and vary valuable, ordinary, and funny finds. Do not expose an item only by hover; tapping and keyboard selection must work. Offer a labelled list or other accessible alternative if the scene is rendered on canvas.

Make generation bounded and resilient: cap item counts, ensure every generated scene can be cleared, prevent inaccessible objects or overlapping controls, and handle missing artwork with intentional fallbacks. New locker must reset discoveries, selection, capacity, and old animation callbacks. Test several deterministic seeds, the front-to-back rule, repeated generation, and the empty/full van states.

## Delivery and shared requirements

Build this in the current project using its existing source, visual language, assets, and mechanics. Inspect the actual implementation first. Create a separate website teaser entry point; keep the full game's saves, progression, economy, and normal entry point isolated.

Deliver a self-contained static folder named teaser/ containing index.html and only the assets it needs, ready to be copied into the studio website at /teasers/bid-and-buried/. Use relative asset paths and no required server, account, paid service, external runtime, or secret. If the source needs a build step, include reproducible build instructions and the finished static output. Also supply a ZIP, a representative cover image, and a README documenting controls, payload size, export formats if applicable, and any limitations. Do not deploy it.

It must work both standalone and inside an iframe, on phones from 320px wide and desktop, using touch, mouse, and keyboard. Use accessible labelled controls, visible focus, readable text, and sound off by default with an explicit toggle. Respect reduced-motion preferences, pause animation when hidden, and keep the first meaningful interaction fast. Include Restart and an unobtrusive “Independently created by Brok3n by Design.” credit. Label it as a website teaser and link to https://brok3nbydesign.com/bid-and-buried.html for the full project.

For embedding, provide an example iframe with a title, a responsive initial height, and download permission where required. Optionally emit versioned ready/resize/completed messages to a configured, allowlisted studio parent origin, using an exact postMessage targetOrigin. Never use "*" or read or write parent game state. Standalone mode must work without a parent listener. Do not send personal information, quiz answers, exported art, or other user content through these messages. The README should describe the message schema and legitimate completion event; do not claim passport integration is live.

Verify real interactions, keyboard and touch behavior, restart, small-screen layout, reduced motion, storage being blocked, and the copied static folder running from a local HTTP server. Test the teaser in an iframe as well as by itself. Report what was built and tested and any remaining limitation.


---

# Pocket Wilds — a boss dice battle

Build a standalone sample of Pocket Wilds' actual boss-fight dice battle system. This must be a genuine taste of the current dice combat, not a generic roll-high duel and not the overworld's real-time combat.

Inspect the current boss battle implementation first. Reuse its dice pool, allocation/selection rules, abilities, enemy intent, turn order, and damage calculations. Choose one existing early boss or a clearly labelled training encounter using existing mechanics. Give the visitor a predefined hero and a compact starting loadout so they can fight immediately without character creation or exploration.

Introduce the fight with one sentence and contextual hints. Show both combatants, health, readable enemy intent, the dice pool, available actions, and what will happen when the visitor commits. Include the actual risk/reward decision that makes a Pocket Wilds boss turn interesting. Use real names and art from the game. Preserve important mechanics; simplify encounter length, tutorial text, and loadout rather than changing the identity of combat.

Aim for a complete 1–3 minute fight, with visible victory and defeat states and immediate Rematch. Permit strategic play and a reasonable chance of losing; do not secretly force a win. A completed encounter should offer “Play Pocket Wilds” linking to https://brok3nbydesign.com/pocket-wilds/. Keep the teaser's battle state separate from full-game saves, leaderboard submissions, unlocks, and daily runs.

Pause when the tab is hidden and keep transitions short. Test representative combat calculations against the game's implementation, illegal dice assignments, action limits, healing/damage bounds, victory and defeat, quick repeated inputs, and rematching before an animation has finished. Document any deliberate encounter tuning so this can stay in sync with future combat changes.

## Delivery and shared requirements

Build this in the current project using its existing source, visual language, assets, and mechanics. Inspect the actual implementation first. Create a separate website teaser entry point; keep the full game's saves, progression, economy, and normal entry point isolated.

Deliver a self-contained static folder named teaser/ containing index.html and only the assets it needs, ready to be copied into the studio website at /teasers/pocket-wilds/. Use relative asset paths and no required server, account, paid service, external runtime, or secret. If the source needs a build step, include reproducible build instructions and the finished static output. Also supply a ZIP, a representative cover image, and a README documenting controls, payload size, export formats if applicable, and any limitations. Do not deploy it.

It must work both standalone and inside an iframe, on phones from 320px wide and desktop, using touch, mouse, and keyboard. Use accessible labelled controls, visible focus, readable text, and sound off by default with an explicit toggle. Respect reduced-motion preferences, pause animation when hidden, and keep the first meaningful interaction fast. Include Restart and an unobtrusive “Independently created by Brok3n by Design.” credit. Label it as a website teaser and link to https://brok3nbydesign.com/pocket-wilds.html for the full project.

For embedding, provide an example iframe with a title, a responsive initial height, and download permission where required. Optionally emit versioned ready/resize/completed messages to a configured, allowlisted studio parent origin, using an exact postMessage targetOrigin. Never use "*" or read or write parent game state. Standalone mode must work without a parent listener. Do not send personal information, quiz answers, exported art, or other user content through these messages. The README should describe the message schema and legitimate completion event; do not claim passport integration is live.

Verify real interactions, keyboard and touch behavior, restart, small-screen layout, reduced motion, storage being blocked, and the copied static folder running from a local HTTP server. Test the teaser in an iframe as well as by itself. Report what was built and tested and any remaining limitation.


---

# DOQI — five-question department assessment

Create a five-question public teaser for The Department of Questionable Inventions, adapted from the existing forty-question assessment.

Inspect the actual forty questions, answer format, personality dimensions, scoring, and result presentation. Select five existing questions that give a balanced taste of the tone and mechanics without revealing all the best material. Keep the project's absurd bureaucratic voice. If selection is randomized across attempts, preserve coverage of the relevant dimensions instead of picking five arbitrarily. Use a curated fixed set if that gives a stronger short experience.

Show one question at a time with labelled answer buttons or a proper radio group, a clear “Question 1 of 5” indicator, Back and Next, and an intentional transition into the final result. Going back and changing an answer must replace its score rather than count it twice. Do not allow completion until all five answers are valid.

Use the highest-sum archetype rule from the full assessment, with documented tie handling and match-strength normalization for five questions. Explain the adaptation in the README and test representative outcomes and ties. Present an entertaining provisional department assignment, a short in-world explanation, and a clear line that this is a five-question fictional preview, not the full assessment or a real psychological evaluation.

Offer Retake, Copy result text, and Download result card as a PNG if feasible. Keep the downloaded card branded in the game's own style and include the studio credit. Do not request real names, email addresses, employment information, or personal details. Keep answers in memory, and clear them when the assessment restarts; don't add analytics or a server just for the quiz.

Link to the DOQI project page for updates. Do not show “Take the full test” unless a real public full-test URL exists and has been verified. Test keyboard-only completion, missing answers, back navigation, answer replacement, scoring and ties, retake reset, and the image/copy fallback if browser permissions prevent copying.

## Delivery and shared requirements

Build this in the current project using its existing source, visual language, assets, and mechanics. Inspect the actual implementation first. Create a separate website teaser entry point; keep the full game's saves, progression, economy, and normal entry point isolated.

Deliver a self-contained static folder named teaser/ containing index.html and only the assets it needs, ready to be copied into the studio website at /teasers/doqi/. Use relative asset paths and no required server, account, paid service, external runtime, or secret. If the source needs a build step, include reproducible build instructions and the finished static output. Also supply a ZIP, a representative cover image, and a README documenting controls, payload size, export formats if applicable, and any limitations. Do not deploy it.

It must work both standalone and inside an iframe, on phones from 320px wide and desktop, using touch, mouse, and keyboard. Use accessible labelled controls, visible focus, readable text, and sound off by default with an explicit toggle. Respect reduced-motion preferences, pause animation when hidden, and keep the first meaningful interaction fast. Include Restart and an unobtrusive “Independently created by Brok3n by Design.” credit. Label it as a website teaser and link to https://brok3nbydesign.com/doqi.html for the full project.

For embedding, provide an example iframe with a title, a responsive initial height, and download permission where required. Optionally emit versioned ready/resize/completed messages to a configured, allowlisted studio parent origin, using an exact postMessage targetOrigin. Never use "*" or read or write parent game state. Standalone mode must work without a parent listener. Do not send personal information, quiz answers, exported art, or other user content through these messages. The README should describe the message schema and legitimate completion event; do not claim passport integration is live.

Verify real interactions, keyboard and touch behavior, restart, small-screen layout, reduced motion, storage being blocked, and the copied static folder running from a local HTTP server. Test the teaser in an iframe as well as by itself. Report what was built and tested and any remaining limitation.


---


