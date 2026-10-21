# Layout previews for Bradley

Built on `codex/home-flow-ribbon` on 2026-10-21. These are separate, lightly interactive home-layout previews for review before a full game implementation.

Open either preview at 100% browser zoom:

- [Letter Post preview](https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/codex/home-flow-ribbon/previews/layout-2026-10-21/letter-post.html)
- [Moonboat preview](https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/codex/home-flow-ribbon/previews/layout-2026-10-21/moonboat.html)

Both pages reuse the actual world stylesheets, local fonts, Lucy portrait, and SVG art helpers. All layout overrides and interactions live under `previews/layout-2026-10-21/`. No existing game, sound, account, or database files were changed.

## What to try

- Use the arrows to move through A–F, G–L, M–R, S–X, and Y–Z. The arrows stay in the same position on the last page. Previous and next disable at the ends.
- Open and close the stamp album or constellation. The count remains visible when collapsed. All 26 collection slots appear when expanded.
- Switch the color theme using the real world palettes.
- Tap a letter to see its selection outline. This preview does not start a lesson or play audio.

The count is explicitly marked as example progress: A–D are collected, for a total of 4 of 26. Nothing is saved. Reloading resets the preview. Opening the collection preserves the current letter page.

## Layout choices shown

Laptop and whiteboard layouts keep the title at the top left and the six-letter chooser at the right. The shortest landscape viewport reduces decorative portrait space and card height. At 1024×576, envelopes remain 72px tall, planets are 84px across, and paging arrows are 60px targets.

The portrait tablet stacks the title above the chooser. A compact collection row follows the chooser on every screen. Opening that row lets the document scroll to show the full collection without squeezing the main letter targets.

The whiteboard uses larger letters and a larger Lucy portrait. The complete collapsed layout still fits the viewport. These previews do not demonstrate revised listen, match, or reward screens, and they make no wrong-answer audio changes.

## Screenshots

Home screenshots show the exact viewport at 100% zoom and a device scale factor of one. Collection screenshots use the same viewport but capture the full expanded document, so their image height may exceed the viewport. Default palettes are Air mail for Letter Post and Dark for Moonboat.

| Viewport | Letter Post home | Letter Post album expanded | Moonboat home | Moonboat constellation expanded |
| --- | --- | --- | --- | --- |
| 1024×576 | [Home](layout-preview/letter-post-1024x576-home.png) | [Expanded collection](layout-preview/letter-post-1024x576-collection.png) | [Home](layout-preview/moonboat-1024x576-home.png) | [Expanded collection](layout-preview/moonboat-1024x576-collection.png) |
| 1366×768 | [Home](layout-preview/letter-post-1366x768-home.png) | [Expanded collection](layout-preview/letter-post-1366x768-collection.png) | [Home](layout-preview/moonboat-1366x768-home.png) | [Expanded collection](layout-preview/moonboat-1366x768-collection.png) |
| 1280×720 | [Home](layout-preview/letter-post-1280x720-home.png) | [Expanded collection](layout-preview/letter-post-1280x720-collection.png) | [Home](layout-preview/moonboat-1280x720-home.png) | [Expanded collection](layout-preview/moonboat-1280x720-collection.png) |
| 768×1024 | [Home](layout-preview/letter-post-768x1024-home.png) | [Expanded collection](layout-preview/letter-post-768x1024-collection.png) | [Home](layout-preview/moonboat-768x1024-home.png) | [Expanded collection](layout-preview/moonboat-768x1024-collection.png) |
| 1920×1080 | [Home](layout-preview/letter-post-1920x1080-home.png) | [Expanded collection](layout-preview/letter-post-1920x1080-collection.png) | [Home](layout-preview/moonboat-1920x1080-home.png) | [Expanded collection](layout-preview/moonboat-1920x1080-collection.png) |

The final Y–Z page is also captured at the shortest laptop size:

- [Letter Post Y–Z](layout-preview/letter-post-1024x576-last-page.png)
- [Moonboat Y–Z](layout-preview/moonboat-1024x576-last-page.png)

There are 22 screenshots in total.

## Verification

Run from the repository root:

```sh
node previews/layout-2026-10-21/verify.cjs
```

The script uses the existing Playwright installation and Google Chrome. `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` can override their paths. It starts an isolated local static server and closes its browser contexts and server after the run. Rerunning regenerates the screenshots and [checks.json](layout-preview/checks.json).

All 10 world-and-viewport combinations passed. Each was checked in all three themes, for 30 layout checks. The collapsed document fits the viewport with no horizontal overflow; headings, letter cards, paging controls, collection summary, and footer are visible. Letter, paging, and collection targets are at least 60px in both dimensions.

Checks also cover every letter exactly once across five pages, stable paging-control positions, disabled end arrows, letter selection, opening the collection with the keyboard, all 26 collection slots, the four example collected slots, and returning to the same page after closing. No JavaScript errors, failed asset responses, or external requests occurred. The preview does not load account, Supabase, audio, or service-worker code.

I visually reviewed the shortest laptop layouts for both worlds, the Letter Post tablet layout, the Moonboat whiteboard layout, and expanded collections in both worlds. The committed PNGs are the review artifacts. GitHub reports that the repository moved from `CryptoBrad89` to `TeslaWarpDrive`; the preview links above use the current owner. The preview commit `553edf8` was pushed successfully, and the remote branch head matched it. Both raw.githack preview URLs returned HTTP 403 from this environment after pushing. Hosted rendering could not be verified here; the local screenshots and checks are the confirmed evidence.

The preview commits contain only the standalone preview directory, screenshot evidence directory, and this report. No live game rebuild or database work was performed. Bradley can review these layouts before authorizing the proper implementation.
