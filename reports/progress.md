# Saved progress across all games

Signed-in done badges and collections now use the owning account’s saved correct answers across Letter Post, Moonboat, and Ribbon Road. Guest collections remain visit-only.

Work is on `codex/home-flow-ribbon`. Before implementation, rollback branch `rollback/pre-progress-2026-10-21-codex` was created and pushed at `3076d10d3b06aeffb9a2edc083910f60ddd633c3`.

## Verified cause

The account client already saves correct rounds in IndexedDB and synchronizes them. Both game scripts instead initialized `visited` as an empty set. Ribbon Road loads the Letter Post script. Their home badges and collections consequently forgot saved completions whenever the page reopened.

The regression reproduced this with an isolated regular grown-up fixture: a correct B round appeared in both the local snapshot and the fixture server’s read-only progress result, but the reloaded picker had no B badge. The test failed on that missing badge before implementation. Evidence: [stored round](progress/before-grownup-1024x576-stored-rounds.json), [before screenshot](progress/before-grownup-1024x576-reloaded.png), [expected failing test](progress/tests/before.log).

## Changes

- Seed the existing done set after account readiness from `ACCOUNTS.snapshot.rounds`, across every world, using the existing owner scope. Pending offline rounds are included.
- Subscribe to existing account notifications and replace the displayed set when saved progress changes. Account switches clear the previous owner’s set and cancel an unfinished answer. Guest notifications preserve only the current visit’s completions.
- Refresh the existing pickers and collections without routing away from the current screen. Preserve the six-letter page, open album, letter focus, and Ribbon Road collection scroll position.
- Capture whether a correct answer is a new completion before `recordRound` emits its update. Only that local first completion queues the existing settle. Loaded, synced, and repeated completions stay still. Opening a letter and wrong answers never complete it.
- Use saved-progress wording for signed-in play and visit wording for guests, including accessibility labels. Count completed letters within the enabled pool. Update the Collections explanation and feature documentation.
- Regenerate the 150-asset offline manifest: `633a35e743d88816` → `7efa2a5b01823475`.

The layout system, stylesheets, layout measurements, audio assets, and account client are unchanged. The existing layout controller only gains progress refresh and wording support. The TIDY-1 regression fixture now retains its saved rounds across games and asserts round-count changes relative to its starting count.

## Verification

All account checks used isolated in-memory fixtures, separate browser contexts, and intercepted Supabase transport. No requests reached the live database. Brandy was never signed in or accessed. No live accounts, passwords, settings, progress, deletions, or database state were modified or restored. No database, migration, or backend files changed.

| Check | Result and evidence |
| --- | --- |
| `node tests/progress.cjs` | Six passing cases: grown-up and child at 1024×576, 768×1024, and 1920×1080. Correct B persists after reload and sign-out/sign-in in all three games. Opening/wrong answers do not complete; another account’s D stays separate; guests reset on reload. Collapsed Post/Moonboat homes fit and all homes avoid horizontal overflow. [Results](progress/after-checks.json), [log](progress/tests/browser.log). |
| `node tests/progress_sync.cjs` | Two-device automatic sync updates an open album without moving its page or focus; an active lesson and reward remain open. New local completion settles once under normal motion; repeat, reload, and sync do not. Selected child isolation, owner change during an answer, restricted letter counts, offline pending rounds across three games, and reconnect without duplicate rounds pass. [Results](progress/sync-animation-offline.json), [log](progress/tests/sync-animation-offline.log). |
| `TIDY_REPORT_DIR=reports/progress TIDY_UPDATE_REVISIONS=3076d10 node tests/tidy_1_update.cjs` | One refresh upgrades the rollback cache to the new cache; all games reopen offline at a nested hosting path. The account page stays open without reloading. The next online build is visible. [Results](progress/service-worker-update.json), [log](progress/tests/update.log). |
| `python3 tests/run_tests.py` | All six strict asset, approved-audio, content, voice, and theme checks pass. [Log](progress/tests/static.log). |
| `TIDY_REPORT_DIR=reports/progress/tidy-regression node tests/tidy_1.cjs` | All 18 game/role/viewport combinations pass. Native MP3 checks in all three games confirm silent match entry, five misses without hints, approximately 200 ms retry pauses, all three existing retry clips, cancellation, mute, and correct-only round creation. Role-specific menus, outside-tap closure, navigation closure, and portal routes pass. [Results](progress/tidy-regression/checks.json), [log](progress/tests/tidy-regression.log). |
| `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/motion_smoke.cjs` | All 12 normal/reduced-motion cases pass, including route cancellation, replay, rewards, and live reduced-motion changes. [Log](progress/tests/motion.log). |
| `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/silk_smoke.cjs` | Ribbon Road’s 26 real correct-answer rounds, full collection, keyboard wrap, chooser, and all themes at three sizes pass. [Log](progress/tests/ribbon.log). |
| `BROWSER_SMOKE_SHARD=0…5 NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/browser_smoke.cjs` | All six existing shards exit successfully: 18 theme/game/viewport cases with B/J/X/Z journeys, no hints, replay, collections, next-letter wrap, keyboard navigation, and layout checks. [Combined log](progress/tests/journeys.log). |

JavaScript syntax checks and `git diff --check` pass.

## Screenshots

The browser suite saves every game for both account roles at all three requested sizes under `reports/progress/`.

- [Letter Post, grown-up, 1024×576](progress/after-grownup-1024x576-v1-letter-post-saved.png)
- [Moonboat, child, portrait tablet](progress/after-child-768x1024-v3-moonboat-saved.png)
- [Ribbon Road, grown-up, 1920×1080](progress/after-grownup-1920x1080-v4-silk-thread-saved.png)
- [Incoming sync with album open](progress/remote-sync-album-open.png)
- [Restricted child collection](progress/restricted-child-saved-progress.png)
- [Offline pending completion in Ribbon Road](progress/offline-shared-pending-round.png)

Verification covers local Chromium and fixture sync, including a service worker and nested hosting path. It does not claim a live Supabase or public-host playback test.
