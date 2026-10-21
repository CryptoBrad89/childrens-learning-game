# Check mark previews for Bradley

Updated the existing Letter Post and Moonboat preview pages on `codex/home-flow-ribbon`. The approved layout remains in place; this pass adds the completion treatment for review.

- [Letter Post preview](https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/codex/home-flow-ribbon/previews/layout-2026-10-21/letter-post.html)
- [Moonboat preview](https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/codex/home-flow-ribbon/previews/layout-2026-10-21/moonboat.html)

## Try the completion moment

1. Start with E selected, or tap another unfinished letter. Tapping selects a letter only. It does not add a check mark or increase the count.
2. Use the header button labeled "Preview only / Simulate correct answer: E". This represents the separate correct-answer event. The selected letter receives its badge and "Done" caption, and the collection count increases.
3. Open the collection to see the matching mark. Simulating a correct answer while the collection is open settles both newly visible badges together.
4. Select a completed letter to see that it remains enabled. The simulation control disables for completed letters. Paging, theme changes, and tapping a completed letter do not replay the animation.
5. Enable Calm before simulating another correct answer, or enable the browser’s reduced-motion preference. The badge appears immediately at its final size. Enabling Calm or reduced motion during a settle cancels the movement.

A–D begin completed as explicit examples of earlier correct answers. E and the remaining letters begin unfinished. Example progress exists only in the preview’s memory and resets on reload. This preview has no answer game, account connection, audio, or saving.

## What changed visually

The completion badge has the specified solid `#176b3a` fill, thick white SVG tick, and 3px white rim. Its size is 36px on the laptop and portrait tablet, 44px on the whiteboard, and 32px on the compact 84px Moonboat planets. Expanded collection badges use a 24px version with a 2px rim.

Badges sit at the upper right. Compact Moonboat badges extend farther beyond the planet rim so they cannot obscure the letter glyph. The map retains sufficient padding to show them without clipping. "Done" replaces "OPEN ME" or "explore" on completed cards, using a 12px caption. Cards retain their full brightness, colors, and ability to be selected.

The same green-and-white badge appears in every theme. The shape and "Done" caption reinforce the status independently of its color. The selected-letter outline remains separate from completion.

Each new visible badge settles once over 220ms, scaling from 0.85 to 1.08 to 1. No extra sound plays. Completed badges render already settled when the page is rebuilt or a collection is opened later.

## The real game already requires a correct answer

Yes. Both [Letter Post’s answer handler](../v1-letter-post/app.js#L58) and [Moonboat’s answer handler](../v3-moonboat/app.js#L58) add a letter to `visited` only inside `if(selected===current)`. The two app files are byte-identical. [Ribbon Road](../v4-silk-thread/index.html#L17) loads Letter Post’s app and therefore uses the same completion rule.

The correct-answer branch awaits the correct-answer effect, checks that the route has not changed, and, for an account owner, awaits `ACCOUNTS.recordRound(...)`. Only then does it run `visited.add(current.letter)` and enter the celebration screen. If that save call throws, it returns without adding the completion mark. This describes the application call ordering; no live account or database was exercised.

Opening a letter calls `start()` and enters the listen screen without adding to `visited`. Wrong answers increment `misses` and run the retry path without adding to `visited`. The badges and collection derive from that set. It starts empty and represents successful letters in the current visit, not permanent mastery.

Read-only local browser checks also exercised opening A and returning home, answering incorrectly and returning home, then answering correctly and returning home in Letter Post, Moonboat, and Ribbon Road. The first two actions left A unmarked; the correct answer produced its mark and a collection count of 1 of 26. The games were opened from local files in isolated contexts, muted, with reduced motion and external requests blocked. No game files or account data were modified.

## Screenshots

All screenshots use 100% zoom and device scale factor one. Home and simulated-correct screenshots capture the viewport. Expanded collections capture the full document at the same viewport width.

| World | Viewport | Default theme | Second theme | Third theme | Expanded collection | After simulated correct answer |
| --- | --- | --- | --- | --- | --- | --- |
| Letter Post | 1024×576 | [Air mail](checkmark-preview/letter-post-1024x576-theme0-home.png) | [Candy post](checkmark-preview/letter-post-1024x576-theme1-home.png) | [Dark](checkmark-preview/letter-post-1024x576-theme2-home.png) | [Expanded](checkmark-preview/letter-post-1024x576-collection.png) | [Completed E](checkmark-preview/letter-post-1024x576-simulated-correct.png) |
| Letter Post | 768×1024 | [Air mail](checkmark-preview/letter-post-768x1024-theme0-home.png) | [Candy post](checkmark-preview/letter-post-768x1024-theme1-home.png) | [Dark](checkmark-preview/letter-post-768x1024-theme2-home.png) | [Expanded](checkmark-preview/letter-post-768x1024-collection.png) | [Completed E](checkmark-preview/letter-post-768x1024-simulated-correct.png) |
| Letter Post | 1920×1080 | [Air mail](checkmark-preview/letter-post-1920x1080-theme0-home.png) | [Candy post](checkmark-preview/letter-post-1920x1080-theme1-home.png) | [Dark](checkmark-preview/letter-post-1920x1080-theme2-home.png) | [Expanded](checkmark-preview/letter-post-1920x1080-collection.png) | [Completed E](checkmark-preview/letter-post-1920x1080-simulated-correct.png) |
| Moonboat | 1024×576 | [Dark](checkmark-preview/moonboat-1024x576-theme0-home.png) | [Cloud day](checkmark-preview/moonboat-1024x576-theme1-home.png) | [Plum dusk](checkmark-preview/moonboat-1024x576-theme2-home.png) | [Expanded](checkmark-preview/moonboat-1024x576-collection.png) | [Completed E](checkmark-preview/moonboat-1024x576-simulated-correct.png) |
| Moonboat | 768×1024 | [Dark](checkmark-preview/moonboat-768x1024-theme0-home.png) | [Cloud day](checkmark-preview/moonboat-768x1024-theme1-home.png) | [Plum dusk](checkmark-preview/moonboat-768x1024-theme2-home.png) | [Expanded](checkmark-preview/moonboat-768x1024-collection.png) | [Completed E](checkmark-preview/moonboat-768x1024-simulated-correct.png) |
| Moonboat | 1920×1080 | [Dark](checkmark-preview/moonboat-1920x1080-theme0-home.png) | [Cloud day](checkmark-preview/moonboat-1920x1080-theme1-home.png) | [Plum dusk](checkmark-preview/moonboat-1920x1080-theme2-home.png) | [Expanded](checkmark-preview/moonboat-1920x1080-collection.png) | [Completed E](checkmark-preview/moonboat-1920x1080-simulated-correct.png) |

There are 30 screenshots: all three themes at each of the six world-and-viewport combinations, plus an expanded collection and a simulated-completion result for each combination. The static screenshots show the settled result; the preview control demonstrates the actual movement.

## Verification and scope

Run the focused checks and regenerate the evidence with:

```sh
node previews/layout-2026-10-21/verify.cjs --checkmarks
```

The checks cover all 18 theme-and-viewport combinations, collapsed viewport fit, badge color and sizes, white rims, no badge overlap with letter glyphs or clipping at map boundaries, enabled completed cards, all 26 letters through paging, stable arrow positions, collection expansion, and the separate selection and simulation rules.

Native browser animation timing and keyframes verify the 220ms settle. Checks also cover no reanimation on tapping or paging, static completion in Calm and reduced motion, cancelling an active settle with Calm, synchronized visible collection badges, and resetting example progress on reload. No external requests, failed assets, or JavaScript errors were observed in the previews.

- [Preview check results](checkmark-preview/checks.json)
- [Real-game completion check results](checkmark-preview/real-game-completion.json)

Only the standalone preview implementation, its verification script, this report, and the new screenshot evidence are included in this change. Live Letter Post, Moonboat, and Ribbon Road pages and their completion logic remain unchanged. No sound, database, account, or persistent progress changes were made. Brandy and Bradley’s live test changes were not touched.

Both raw.githack URLs returned HTTP 403 when checked from this environment. Hosted rendering could not be verified here; the committed screenshots and local browser checks are the confirmed visual evidence. The URLs point to the existing preview pages on `codex/home-flow-ribbon`.
