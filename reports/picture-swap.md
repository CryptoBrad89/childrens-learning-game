# Picture swap

Implementation commit: [`212e1c9d2ecacee0b89df7960bd6f8120f578ee7`](https://github.com/TeslaWarpDrive/childrens-learning-game/commit/212e1c9d2ecacee0b89df7960bd6f8120f578ee7). Starting commit: `ea2d8a52b7d115da929568f8b26cabdf709e139c`. Branch: `codex/home-flow-ribbon`.

All 78 approved pictures replace existing word art. Letter-only pages, collection badges, found-it text strips, home decorations, Lucy portraits, layout defaults, chrome, and navigation stay unchanged. The large reward picture is the big view.

## Assets

The committed copies are 512×512 lossy WebP at quality 85, encoded with Pillow 12.3.0, Lanczos resizing, and WebP method 6. Each conversion retains the entire square composition and background. There is no cropping, recoloring, or image generation. Before deleting the originals, all 78 files matched a fresh conversion of their corresponding approved source byte for byte. Every file has a lossy VP8 payload and decodes at 512×512.

| Game | Files | Total bytes | Largest file | Largest bytes |
|---|---:|---:|---|---:|
| Letter Post | 26 | 634,702 | `web.webp` | 36,740 |
| Moonboat | 26 | 350,422 | `web.webp` | 28,696 |
| Ribbon Road | 26 | 419,032 | `web.webp` | 31,264 |

Total: 1,404,156 bytes, about 1.34 MiB. [Per-file sizes and SHA-256 hashes](picture-swap/image-sizes.json) include the original PNG hashes and the committed WebP hashes. Only the WebPs enter Git. The incoming originals are deleted after the implementation commit.

## Wiring and offline behavior

Each game config sets `wordPictureBase: "pictures"`. Shared `v1-letter-post/art.js` renders an image with the vocabulary word as its alt text. URLs resolve relative to the game document, so Ribbon Road continues using the shared Letter Post app while loading only `v4-silk-thread/pictures/`. Moonboat now also loads the shared art script, and its duplicate art script is removed. Decorative `draw(...)` calls remain intact. Only the existing choice and reward word-art calls use `wordPicture(...)`. X still maps to fox.

Shared `word-pictures.css` retains existing art boxes and uses containment with square corners. This removes the circular clipping previously applied to Ribbon Road word art. No letter-page pictures or collection pictures were added.

`scripts/build-offline-manifest.py` now accepts `.webp`. Regenerating it produces 228 precached files, including all 78 new picture URLs, with cache version `251666a3f536e346`. The browser test verifies cache entries, reloads each game offline, decodes all 26 pictures per game, and exercises choices, a wrong answer, and the large reward. The common offline cache contains all three sets; every game-rendered picture request stays in that game’s own folder.

## Verification

Tests use local files, localhost guest play, or in-memory fixtures. External game requests are blocked or fulfilled locally. No real Supabase account or data is accessed. Audio sources, account code, settings code, progress logic, and service-worker logic remain unchanged.

| Suite | Result |
|---|---|
| `python3 tests/run_tests.py` | PASS, all six strict checks |
| `runtime_smoke.cjs` | PASS, 78 rounds per game, 234 total |
| `grown_ups_runtime.cjs` | PASS, settings validation and all three game renderers |
| `picture_swap.cjs` | PASS, 12 game/size/online-or-offline cases; all vocabulary files, alt text, own-folder isolation, choices, wrong taps, rewards, cache and decoding |
| `layout_build.cjs` | PASS, existing layout, paging, badges, album, themes, restricted pools and motion |
| `layout_offline.cjs` | PASS |
| `layout_ribbon_unchanged.cjs` | PASS, five screens at three sizes against starting app with approved image calls substituted |
| `motion_smoke.cjs` | PASS, 12 cases |
| `silk_smoke.cjs` | PASS, Ribbon Road themes and chooser |
| `grown_ups_smoke.cjs` | PASS |
| `celebrate_audio_rules.cjs` | PASS, online/offline, all games and sizes, plus regular-user progress fixture |
| `correct_word.cjs` | PASS, 45 real-playback cases |
| `progress.cjs` and `progress_sync.cjs` | PASS, regular-user fixtures, guest isolation, persistence and sync |
| `tidy_1.cjs`, `tidy_1b.cjs`, `tidy_1_update.cjs` | PASS, includes offline upgrades from two earlier builds |
| `accounts_sync.cjs`, `portal_flow.cjs` | PASS, default fixture mode only |
| `portal_review_browser.cjs`, `risky_actions_browser.cjs` | PASS, in-memory fixtures only |
| `call_list_browser.cjs`, `call_list_sounds.cjs`, `call_list_offline.cjs` | PASS, local/fixture mode only |
| `fixlist.cjs` | PASS after retry with Chrome background throttling disabled; earlier runs timed out during playback |
| `browser_smoke.cjs` | PASS, all 18 cases across six shards with Chrome background throttling disabled; two earlier unsharded attempts stalled during playback or animation |
| `celebrate_delay.cjs` | FAIL after 65 completed before/after cases, on a cheer-gap timing assertion in Moonboat at 1920px; that exact size/game passed all 10 before/after cases on isolated retry |
| `home_flow.cjs` | FAIL, stale header-text assertion, reproduced on starting commit; one initial run also raced navigation and saw ACCOUNTS undefined |
| `confetti_smoke.cjs` | FAIL, reward replay clears confetti instead of preserving 24 pieces; same assertion reproduced on starting commit |

The picture replacement does not repair unrelated baseline failures. The Ribbon Road comparison was updated from its historical baseline to this job’s starting commit and substitutes only the two approved word-picture calls in the baseline. Its first run saw a one-level RGB raster difference on the reward screen; a repeat passed without loosening its assertions. The static vocabulary test now checks WebP assets instead of requiring obsolete SVG word shapes. VM test contexts expose the new shared renderer.

Skipped the database and edge suites (`accounts_database`, `accounts_database_edge`, `call_list_database`, `child_settings_database`, `session_limits_database`, `portal_review_database`, `risky_actions_database`, `child_settings_edge`, `portal_master_edit_edge`, `portal_review_edge`, and `risky_actions_edge`). No database or Supabase work is part of this job.

Skipped live or hosted suites (`accounts_selection`, `call_list_live`, `child_settings_browser`, `child_settings_hosted`, `fixlist_live`, `portal_master`, `portal_master_edit`, `portal_review_live`, `portal_round2`, and `risky_actions_live`), plus `accounts_sync --live`, `portal_flow --live`, and the mixed live-test runner `run_fixlist.py`. These use real accounts, require master credentials, write to Supabase, or visit a hosted service. The `master_login.cjs` credential helper was never invoked.

The final browser sweep used `CHROMIUM_EXECUTABLE=reports/picture-swap/chrome-no-throttle.sh`, `NO_SCREENSHOTS=1`, and `BROWSER_SMOKE_SHARD=0` through `5`. The wrapper forwards all arguments and disables Chrome background timer throttling, renderer backgrounding, and occluded-window backgrounding. `fixlist.cjs` also passed using that wrapper.

Timing regressions are used as playback checks. This report makes no speedup or network-latency claim. The actual image sizes above come from file bytes, not a transfer estimate.

## Screenshots

The 12 requested screenshots are listed below. Letter-only pages intentionally have no word pictures. Six additional reward screenshots are saved in the same folder.

| Game | Viewport | Letter page | Find the picture |
|---|---|---|---|
| Letter Post | 768x1024 | [v1-letter-post-letter-768x1024.png](picture-swap/v1-letter-post-letter-768x1024.png) | [v1-letter-post-find-768x1024.png](picture-swap/v1-letter-post-find-768x1024.png) |
| Letter Post | 1280x800 | [v1-letter-post-letter-1280x800.png](picture-swap/v1-letter-post-letter-1280x800.png) | [v1-letter-post-find-1280x800.png](picture-swap/v1-letter-post-find-1280x800.png) |
| Moonboat | 768x1024 | [v3-moonboat-letter-768x1024.png](picture-swap/v3-moonboat-letter-768x1024.png) | [v3-moonboat-find-768x1024.png](picture-swap/v3-moonboat-find-768x1024.png) |
| Moonboat | 1280x800 | [v3-moonboat-letter-1280x800.png](picture-swap/v3-moonboat-letter-1280x800.png) | [v3-moonboat-find-1280x800.png](picture-swap/v3-moonboat-find-1280x800.png) |
| Ribbon Road | 768x1024 | [v4-silk-thread-letter-768x1024.png](picture-swap/v4-silk-thread-letter-768x1024.png) | [v4-silk-thread-find-768x1024.png](picture-swap/v4-silk-thread-find-768x1024.png) |
| Ribbon Road | 1280x800 | [v4-silk-thread-letter-1280x800.png](picture-swap/v4-silk-thread-letter-1280x800.png) | [v4-silk-thread-find-1280x800.png](picture-swap/v4-silk-thread-find-1280x800.png) |

Additional reward paths are `reports/picture-swap/<game>-reward-768x1024.png` and `reports/picture-swap/<game>-reward-1280x800.png` for the three game folders above. The screenshots were visually inspected for complete objects, distinct game art, and clipping. Test logs and image-check results are in `reports/picture-swap/`.

## Shipping and security

The assets, game wiring, checks, screenshots, and test logs are committed in the implementation commit above. This report follows in a documentation commit on the same branch. Both commits are pushed to `origin/codex/home-flow-ribbon`. The configured origin URL uses the former owner CryptoBrad89; GitHub resolves it to `TeslaWarpDrive/childrens-learning-game`, verified with `gh repo view` for both names and matching remote branch hashes. The rollback branch remains at the starting commit.

`incoming-word-pictures/` was removed from the working tree only after verifying that all 78 WebPs were committed and that no incoming original was tracked.

No deployment was performed. The Pi, hosted game, and Supabase were untouched. The real master administrator account was never signed in to, modified, renamed, deleted, or reset. No pre-existing account was deleted or restored. No deleted account or setting was recreated. Tests that exercise account operations use disposable in-memory fixtures only. Unrelated pre-existing working-tree files were not staged. Generated updates to older tracked reports were restored after testing.
