# Fade swap

The 52 Moonboat and Ribbon Road pictures now use Bradley's approved round-2 faded WebPs from `8613dae`. The files were extracted with `git show`, without merging the fade branch or importing preview or tools folders.

Implementation and verification commit: [`fc3914aefbec3fde9a5ecf6315ad315cdf65f9fa`](https://github.com/TeslaWarpDrive/childrens-learning-game/commit/fc3914aefbec3fde9a5ecf6315ad315cdf65f9fa). This report follows in a documentation commit on the same branch. Both commits are delivered together.

Rollback branch `rollback/pre-fade-swap-2026-10-24-codex` was created at `b0ef6de7c3931077f27de97da1f8cf9bb023e43a` and pushed before any implementation change. Work remains on `codex/home-flow-ribbon`.

## Files and display

- `v3-moonboat/pictures/*.webp`: 26 exact copies from `8613dae:word-pictures-fade-v2/moonboat/`.
- `v4-silk-thread/pictures/*.webp`: 26 exact copies from `8613dae:word-pictures-fade-v2/ribbon-road/`.
- `v1-letter-post/word-pictures.css`: one rule scoped to `body.space` and `body.silk`, covering answer and reward images. It removes image borders, shadows, transforms, and rotation, including the shared three-degree hover tilt. Existing rules already set transparent backgrounds, zero padding, square corners, and `object-fit: contain`. Cards, layouts, and letter-circle styling retain their existing design.
- `sw-assets.js`: regenerated with `python3 scripts/build-offline-manifest.py`. Version changes from `251666a3f536e346` to `ce8148cf6314b13a`. The service worker derives its cache name from this manifest version. All 228 URLs remain listed, including all 78 game pictures.
- `tests/fade_swap_assets.py` and `tests/fade_swap.cjs`: rerunnable source, alpha-edge, cache-membership, and headless theme verification.
- `reports/fade-swap/`: screenshots, results, logs, and the local-only test harness.

No Letter Post picture changed. Its existing CSS rules remain unchanged, and the new selectors do not match Letter Post. The game-content screenshot comparison passes on home, listen, answer, and reward screens at widths 390, 768, and 1280. This compares the same rendered content with the baseline and updated image stylesheet. Full-page comparison initially picked up a native header-select repaint difference confined to a two-pixel-wide strip; the final comparison isolates `#main` and excludes transient confetti outside it. See [Letter Post log](fade-swap/letter-post.log).

## Verification

`python3 tests/fade_swap_assets.py` verifies all 52 files against the Git source, confirms 512×512 dimensions and fully transparent outer-edge pixels, checks all 78 precache entries, and verifies unchanged Letter Post bytes. See [asset results](fade-swap/assets.json).

`node tests/fade_swap.cjs` checks all six themes at widths 390, 768, and 1280. It decodes every word picture, checks answer images for containment without clipping, transparent backgrounds, no border or shadow, and no transform or hover rotation. It also checks reward images, offline decoding, page errors, and console errors. Moonboat's letter circle contains letters only; it remains letter-only and is captured on the listen screen and alongside the answer cards. No word image was added there.

| Game | Theme | 390 / 768 / 1280 | Evidence |
|---|---|---|---|
| v4-silk-thread | Pink | PASS / PASS / PASS | [answers](fade-swap/v4-silk-thread-0-1280-answers.png), [reward](fade-swap/v4-silk-thread-0-768-reward.png) |
| v4-silk-thread | Purple | PASS / PASS / PASS | [answers](fade-swap/v4-silk-thread-1-1280-answers.png), [reward](fade-swap/v4-silk-thread-1-768-reward.png) |
| v4-silk-thread | Yellow | PASS / PASS / PASS | [answers](fade-swap/v4-silk-thread-2-1280-answers.png), [reward](fade-swap/v4-silk-thread-2-768-reward.png) |
| v3-moonboat | Dark | PASS / PASS / PASS | [answers](fade-swap/v3-moonboat-0-1280-answers.png), [reward](fade-swap/v3-moonboat-0-768-reward.png), [letter circle](fade-swap/v3-moonboat-0-768-letter.png) |
| v3-moonboat | Cloud day | PASS / PASS / PASS | [answers](fade-swap/v3-moonboat-1-1280-answers.png), [reward](fade-swap/v3-moonboat-1-768-reward.png), [letter circle](fade-swap/v3-moonboat-1-768-letter.png) |
| v3-moonboat | Plum dusk | PASS / PASS / PASS | [answers](fade-swap/v3-moonboat-2-1280-answers.png), [reward](fade-swap/v3-moonboat-2-768-reward.png), [letter circle](fade-swap/v3-moonboat-2-768-letter.png) |

All 18 theme/viewport cases pass with no page or console errors. All 26 pictures per game decode online and offline at each width. Screenshots were visually inspected for square edges and clipping. The folder contains 45 theme screenshots: 18 answers, 18 rewards, and nine Moonboat listen screens. The file pattern is `<game>-<theme-index>-<width>-<answers|reward|letter>.png`. See [browser results](fade-swap/browser.json) and [browser log](fade-swap/browser.log).

## Existing tests

The local runner is `python3 reports/fade-swap/run-tests.py`. It runs the existing static, runtime, offline, browser, audio, progress, and fixture suites with external requests blocked. Each suite has a 480-second process limit. Native Playwright timeouts remain unchanged. Full outcomes are in [tests.json](fade-swap/tests.json), the [runner log](fade-swap/tests.log), and each suite's `.log` file in the same folder.

`home_flow` and `confetti_smoke` remain pre-existing failures and are not fixed. `home_flow` expects the brand text to include `Little Sounds Big Discovery`, but receives `Letters with Lucy`. `confetti_smoke` expects 24 confetti pieces after replay and receives zero.

Three additional browser-smoke shards time out. Shards 1 and 2 pass theme 0 before timing out. Shard 1, Letter Post at 768px, times out waiting for celebration at `tests/browser_smoke.cjs:105`. Shard 2, Letter Post at 1440px, times out clicking an unstable choice at line 96. Shard 5, Moonboat at 1440px, times out in `settle()` after returning home at line 116. Its diagnostic shows the page visible, the last clip ended, and no active effects or paused animations. These are reported as unresolved failures, without claiming that their exact failures were reproduced on the starting commit. No test assertion or unrelated game behavior is changed.

Database and edge suites are excluded: `accounts_database`, `accounts_database_edge`, `call_list_database`, `child_settings_database`, `session_limits_database`, `portal_review_database`, `risky_actions_database`, `child_settings_edge`, `portal_master_edit_edge`, `portal_review_edge`, and `risky_actions_edge`.

Live, hosted, and credential-dependent suites are excluded: `accounts_selection`, `call_list_live`, `child_settings_browser`, `child_settings_hosted`, `fixlist_live`, `portal_master`, `portal_master_edit`, `portal_review_live`, `portal_round2`, and `risky_actions_live`. The master-login helper, `--live` modes, and mixed live runner `run_fixlist.py` are not invoked.

34 existing suite/shard invocations finished: 29 pass and five fail. The two known failures and three additional timeouts are detailed above.

| Suite or shard | Result |
|---|---|
| [static](fade-swap/static.log) | PASS |
| [runtime_smoke](fade-swap/runtime_smoke.log) | PASS |
| [grown_ups_runtime](fade-swap/grown_ups_runtime.log) | PASS |
| [picture_swap](fade-swap/picture_swap.log) | PASS |
| [layout_build](fade-swap/layout_build.log) | PASS |
| [layout_offline](fade-swap/layout_offline.log) | PASS |
| [layout_ribbon_unchanged](fade-swap/layout_ribbon_unchanged.log) | PASS |
| [motion_smoke](fade-swap/motion_smoke.log) | PASS |
| [silk_smoke](fade-swap/silk_smoke.log) | PASS |
| [grown_ups_smoke](fade-swap/grown_ups_smoke.log) | PASS |
| [celebrate_audio_rules](fade-swap/celebrate_audio_rules.log) | PASS |
| [correct_word](fade-swap/correct_word.log) | PASS |
| [progress](fade-swap/progress.log) | PASS |
| [progress_sync](fade-swap/progress_sync.log) | PASS |
| [tidy_1](fade-swap/tidy_1.log) | PASS |
| [tidy_1b](fade-swap/tidy_1b.log) | PASS |
| [tidy_1_update](fade-swap/tidy_1_update.log) | PASS |
| [accounts_sync](fade-swap/accounts_sync.log) | PASS |
| [portal_flow](fade-swap/portal_flow.log) | PASS |
| [portal_review_browser](fade-swap/portal_review_browser.log) | PASS |
| [risky_actions_browser](fade-swap/risky_actions_browser.log) | PASS |
| [call_list_browser](fade-swap/call_list_browser.log) | PASS |
| [call_list_sounds](fade-swap/call_list_sounds.log) | PASS |
| [call_list_offline](fade-swap/call_list_offline.log) | PASS |
| [fixlist](fade-swap/fixlist.log) | PASS |
| [home_flow](fade-swap/home_flow.log) | FAIL, pre-existing |
| [confetti_smoke](fade-swap/confetti_smoke.log) | FAIL, pre-existing |
| [celebrate_delay](fade-swap/celebrate_delay.log) | PASS |
| [browser_smoke-0](fade-swap/browser_smoke-0.log) | PASS |
| [browser_smoke-1](fade-swap/browser_smoke-1.log) | FAIL, Playwright timeout |
| [browser_smoke-2](fade-swap/browser_smoke-2.log) | FAIL, Playwright timeout |
| [browser_smoke-3](fade-swap/browser_smoke-3.log) | PASS |
| [browser_smoke-4](fade-swap/browser_smoke-4.log) | PASS |
| [browser_smoke-5](fade-swap/browser_smoke-5.log) | FAIL, Playwright timeout |

## Scope and safety

All browser checks run against local files, localhost, or in-memory fixtures. The test preload blocks external browser requests and supplies a local guest-settings response when needed. Existing fixture routes continue to handle fixture account traffic locally. No live or hosted tests, database or edge tests, master-login helper, or mixed live runner are invoked. No deployment, Pi access, live-site access, Supabase access, database edit, or real-account operation is part of this work. The real Brandy administrator account is untouched, including its credentials, profile, and progress. No real account is deleted or restored.

Unrelated pre-existing untracked files remain untouched. Existing tests generate older report outputs; only those test-generated tracked changes are restored before delivery.
