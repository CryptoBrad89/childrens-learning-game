# Tidy-up list 1

Items 1, 2, 3, 4, 5, and 7 are implemented for Letter Post, Moonboat, and Ribbon Road. Items 6 and 8 remain preview only. Work stays on `codex/home-flow-ribbon`.

## Play and review

- [Letter Post](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v1-letter-post/index.html)
- [Moonboat](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v3-moonboat/index.html)
- [Ribbon Road](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v4-silk-thread/index.html)
- [Items 6 and 8 visual comparison](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/previews/tidy-1/index.html)
- [Local visual comparison](../previews/tidy-1/index.html)

## Result for each item

| Item | Result |
| --- | --- |
| 1. Old offline copy | The service worker requests the current game files on online loads and uses installed files when offline. On an update, it replaces the old cache, takes control, and reloads existing game pages once. It leaves open account and settings pages in place. This also upgrades pages running the previous cache-first code. The manifest version includes the worker itself. |
| 2. Grown-up portal | The game profile menu includes a Grown-up portal link to the Kids view. The link is inserted only for a grown-up profile and is absent from a child's menu. Profile and progress still opens the grown-up's own account view. |
| 3. Repeated sound | Find its picture opens the picture screen silently. Opening a letter still plays its name and sound on the listen screen. |
| 4. Wrong-answer sound | A wrong tap plays only the tapped picture's existing word recording, a 200 ms pause, and one existing Lucy retry recording. The three retry clips are shuffled as a set, including uh-oh. A new picture tap or letter replay cancels the current recording and pending pause or retry. The wrong-answer animation adds no sound effect. |
| 5. Hints | All gameplay hint branches, hint markup, and hint styles are removed. Wrong-answer feedback never names the correct word or repeats the target letter name or sound. Repeated misses keep all three choices available without revealing the answer. The obsolete Help when stuck control is removed from Game settings. Existing stored hint settings stay untouched and cannot enable hints. On the picture screen, sound replay is available on the letter at the left and plays only its sound. |
| 6. Profile picture | Preview only: a 42 px avatar inside a 50 px button, compared with the current 32 px avatar. The proposed button stays centered with the sound and theme controls in all three games. The live avatar styling is unchanged. |
| 7. Dropdown | Outside pointer taps and clicks close the menu. Replacing a game screen also closes it, including transitions that start while the menu is closed and finish after it opens. Links, Escape, and page departure close it too. |
| 8. OPEN FOR PLAY! | Preview only: remove the tilted tag from Letter Post. No replacement decoration is proposed. The live tag and home layout remain unchanged. |

A letter becomes done only after a correct answer and the existing round-save step. Wrong taps and replays do not complete it. No audio files were added or changed.

## Verification

All account-related browser checks use disposable in-memory fixtures. External live account requests are intercepted or blocked. No live accounts were signed into, created, edited, reset, deleted, or restored. Brandy's administrator account, credentials, settings, and progress were left alone. Bradley's account deletions and other test changes were preserved. There are no database, schema, or backend changes.

| Check | Evidence |
| --- | --- |
| Strict audio, assets, alphabet, and themes | `python3 tests/run_tests.py`: six checks, including the approved audio hashes. [Log](tidy-1/tests/static.log). |
| Browser matrix | `node tests/tidy_1.cjs`: all three games, grown-up and child fixtures, 1024×576, 768×1024 portrait tablet, and 1920×1080. Checks portal visibility, outside taps, screen transitions, and menu bounds. [Log](tidy-1/tests/tidy-1.log), [results](tidy-1/checks.json). |
| Native audio | The same browser test uses real MP3 playback in all three games. It checks silent picture entry, five wrong taps without hints, a 150–250 ms measured pause, all three retry clips, no speech overlap, mute, interruption by another picture, and replay during the word, pause, and retry. Only a correct answer records a round and marks B done. |
| Reproduction before the fix | Against rollback build `3d874eb`, the new test fails because picture entry plays `b-sound-trim.mp3`. [Expected failure](tidy-1/tests/baseline.log). |
| Service-worker upgrade | `node tests/tidy_1_update.cjs`: install `20e7acf`, which has the old 26-letter home, then serve the new build on the same origin and refresh once. Repeat from `3d874eb`. Both reach the new cache and runtime without closing a tab or manually clearing cache. All three games then load and play offline. A later online document change appears on its next load. Tests use a nested path matching the requested hosting URL structure. [Log](tidy-1/tests/update.log), [results](tidy-1/service-worker-update.json). |
| Alphabet and settings runtime | The VM harness covers all 26 letters in all three themes for all three games, including two wrong taps per round, correct completion, and mute. Settings checks cover legacy hint values, chosen letters, volume, and controls. These supplement the actual browser tests. [Runtime log](tidy-1/tests/runtime.log), [settings runtime](tidy-1/tests/settings-runtime.log). |
| Motion | `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/motion_smoke.cjs`: 12 normal and reduced-motion cases covering routes, replay, wrong and correct answers, reward, cancellation, and live motion changes. [Log](tidy-1/tests/motion.log). |
| Game settings browser | `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/grown_ups_smoke.cjs`: settings controls, guards, reset, layouts, offline assets, restricted worlds, and legacy hints ignored. [Log](tidy-1/tests/settings-browser.log). |
| Broader B/J/X/Z journeys | All 18 cases pass. The existing browser suite ran in six shards with `BROWSER_SMOKE_SHARD=0` through `5`, `NO_SCREENSHOTS=1`, and `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`. [Combined log](tidy-1/tests/browser.log). |
| Visual previews | `node scripts/build-tidy-1-preview.cjs`: current and proposed pages for all three games at all three required sizes. Checks 32 px versus 42 px avatars, aligned button centers, and Letter Post tag present only in the current preview. [Log](tidy-1/tests/previews.log). The preview pages contain no scripts or account connection. |

Initial longer browser runs hit intermittent playback or animation wait timeouts. Failure-state diagnostics were added to the harness. The isolated dark-theme case, the full 18-case matrix, and all six complete journey shards then passed without further gameplay changes. Initial shard logs remain in `reports/tidy-1/tests/browser-shard-*-initial.log`; the final logs use `browser-shard-0.log` through `browser-shard-5.log`.

Browser checks cover a local server and offline service-worker behavior. An external raw.githack request returned HTTP 403 from Cloudflare in this environment, so hosted browser verification is unavailable. The requested game and preview links are provided above. [Hosted response](tidy-1/tests/hosted-head.log).

## Preview pages and screenshots

The [comparison page](../previews/tidy-1/index.html) includes current and proposed screenshots and links to full previews. [Comparison screenshot](tidy-1/previews/review-page.png).

| Game | Current | Proposed |
| --- | --- | --- |
| Letter Post | [Page](../previews/tidy-1/post-current.html) | [Larger avatar and tag removed](../previews/tidy-1/post-proposed.html) |
| Moonboat | [Page](../previews/tidy-1/moonboat-current.html) | [Larger avatar](../previews/tidy-1/moonboat-proposed.html) |
| Ribbon Road | [Page](../previews/tidy-1/ribbon-current.html) | [Larger avatar](../previews/tidy-1/ribbon-proposed.html) |

All screenshots are under `reports/tidy-1/`. Menu screenshots include the game, role, and viewport in their filenames. Repeated-miss screenshots show the picture screen after five wrong taps. Upgrade screenshots show the old and new home screens. Preview screenshots include both versions at 1024×576, 768×1024, and 1920×1080, plus profile-control crops.

## Delivery and rollback

The local rollback branch `rollback/pre-tidy-1-2026-10-21-codex` was verified at `3d874eb95fe14e0c0eff684a0ae0f43126a45a20` and pushed to origin. Git's configured credential helper referenced a missing `/usr/bin/gh`; using the existing `/usr/local/bin/gh` for the push worked without a persistent configuration change. GitHub reports that the repository moved to `TeslaWarpDrive/childrens-learning-game`, and accepted the push through the existing origin. The links above retain the CryptoBrad89 form requested in the job.

The offline manifest contains 150 assets and has version `4324eb157385c118`. The implementation, previews, test scripts, screenshots, and this report are included in the delivery commit on `codex/home-flow-ribbon`.

Items 6 and 8 require Bradley's preview approval before any live-game changes. Stop after this delivery.
