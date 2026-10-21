# Approved layouts built into Letter Post and Moonboat

The real games now use the approved six-letter home layouts, expandable collections, and clear completion badges. Built on `codex/home-flow-ribbon`.

- [Play Letter Post](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v1-letter-post/index.html)
- [Play Moonboat](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v3-moonboat/index.html)

## Behavior

Home shows six enabled letters per page with previous and next arrows, a letter range, and a page count. End arrows disable at the boundaries. Arrow keys move across pages and wrap through the enabled letters. Returning from a lesson restores the page containing that letter, including when Another sound advances across a page boundary.

The title stays at the top. The approved compact landscape mode keeps the six letters, pager, collection summary, and footer inside the viewport at 1024×576 and the other checked laptop sizes. Portrait tablets use the stacked layout; the whiteboard uses larger cards and artwork. The stamp album or constellation opens on tap, with the collection count visible when collapsed. Expanded collections may extend down the page.

Completed cards stay bright and tappable. They show the solid `#176b3a` badge, thick white tick, white rim, and a 12px "Done" caption. Badges are 36px on laptops and tablets, 44px on the whiteboard, and 32px on the compact Moonboat planets. Collection marks use the same symbol at 24px. Badges do not cover the letter glyphs or clip against the map.

A new completion receives the silent 220ms settle on the first return to the home grid. If the collection is open, its new mark settles at the same time. Replaying or completing an already finished letter, paging, and reopening the collection do not repeat the settle. Calm and reduced motion render the final badge statically. Enabling reduced motion during a settle cancels it.

Completion still requires the correct answer. The existing `visited.add(current.letter)` remains inside the correct-answer branch, after the existing success effect and account round-recording call. Opening a letter and wrong answers do not complete it. There is no example A–D progress or simulation control in the real games. Completion still lasts for the current visit, with no new saving.

## Scope and rollback

The two game entry pages load the new [layout controller](../v1-letter-post/layout.js) and [layout stylesheet](../v1-letter-post/layout.css). Their shared app delegates layout rendering when that controller is present. Ribbon Road loads neither new file and retains its existing renderer, appearance, and completion treatment. Its source files and existing shared styles were not changed.

The existing offline manifest was regenerated to include both layout assets and refresh cached application files. It contains 150 assets with version `7e36993fdbffd603`. An actual service-worker offline check confirmed both games reload the updated home and page letters without a network connection.

The rollback branch `rollback/pre-layout-build-2026-10-21-codex` was verified at `20e7acf8930a33c0663b65b821926f401f4c91e0` and pushed to origin. The previews remain available separately.

No audio files, wrong-answer sound sequence, account implementation, database, or completion-persistence rules were changed. No master-account or other existing-account data was accessed or edited. Bradley's deleted accounts and test changes were not restored. The local offline test blocks external settings reads instead of contacting Supabase.

## Verification

| Check | Result |
| --- | --- |
| `python3 tests/run_tests.py` | All six strict audio, asset, content, and theme checks pass. |
| `node tests/layout_build.cjs` | Both worlds at six sizes in all themes: 36 layout and real-answer cases. Normal, Calm, and reduced-motion completion checks pass, as do one-, six-, and seven-letter pools. |
| `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/motion_smoke.cjs` | All 12 real-browser route, replay, wrong-answer, reward, cancellation, and motion cases pass. |
| `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/browser_smoke.cjs` | All 18 unmuted B/J/X/Z journey cases pass across both worlds, three sizes, and all themes. Run in six shards using `BROWSER_SMOKE_SHARD=0` through `5`. |
| `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/silk_smoke.cjs` | Ribbon Road and chooser checks pass, including all 26 completed rounds, three themes, three screen sizes, and reduced motion. |
| `node tests/layout_ribbon_unchanged.cjs` | Ribbon Road markup, computed styles, and geometry match the rollback app on home, listen, match, reward, and completed home at three sizes. |
| `node tests/layout_offline.cjs` | Both updated home pages, paging, and new assets work from an installed service-worker cache while offline. |
| `node tests/runtime_smoke.cjs` | 78 rounds per world pass in the existing browser-API-stubbed harness. This is supplemental; real-browser checks above establish layout and interaction behavior. |

The focused layout matrix checks 1024×576, 1280×720, 1366×768, 1440×900, 768×1024, and 1920×1080 in every theme. It verifies collapsed viewport bounds, all 26 letters across pages, stable pager positions, keyboard wrap, no completion from opening or wrong answers, actual correct-answer completion, badge sizes and placement, collection expansion, and no preview controls. The existing journey tests were updated to navigate the new pages rather than assume all 26 cards are mounted together.

The focused browser tests use isolated local-file contexts, the real game UI, and the real mute control. They do not call internal route or progress setters. External requests are blocked. The longer journey suite retains native unmuted MP3 playback.

The Ribbon Road image comparison is exact outside the header controls. Some header-control pixels differ by one RGB channel level between browser captures, while markup, styles, and geometry are identical. The comparison allows only that one-level rounding inside the header-control bounds; other pixel changes fail. This limitation is recorded in the comparison evidence.

- [Layout measurements](layout-build/checks.json)
- [Ribbon Road comparison](layout-build/ribbon-unchanged.json)
- [Offline evidence](layout-build/offline.json)
- [Focused layout log](layout-build/layout-checks.log), [motion log](layout-build/motion.log), and [unmuted journey log](layout-build/browser-smoke.log)
- [Ribbon Road smoke log](layout-build/ribbon-smoke.log), [comparison log](layout-build/ribbon-comparison.log), and [offline log](layout-build/offline.log)

## Screenshots

The 54 screenshots show the real games at 100% zoom and device scale factor one, in all themes at the three required sizes. Each set contains a fresh home, a home after a real correct answer on A, and the expanded collection. Home images use the exact viewport; album images capture the expanded document. Reduced motion and mute keep these static captures consistent. Separate real-browser checks verify normal animation and unmuted playback. Album images show the keyboard-focus outline from opening the collection with Enter.

| Game | Viewport | Theme | Fresh home | Correct answer on A | Expanded collection |
| --- | --- | --- | --- | --- | --- |
| Letter Post | 1024×576 | Air mail | [Home](layout-build/v1-letter-post-1024x576-theme0-home.png) | [Done](layout-build/v1-letter-post-1024x576-theme0-done.png) | [Album](layout-build/v1-letter-post-1024x576-theme0-album.png) |
| Letter Post | 1024×576 | Candy post | [Home](layout-build/v1-letter-post-1024x576-theme1-home.png) | [Done](layout-build/v1-letter-post-1024x576-theme1-done.png) | [Album](layout-build/v1-letter-post-1024x576-theme1-album.png) |
| Letter Post | 1024×576 | Dark | [Home](layout-build/v1-letter-post-1024x576-theme2-home.png) | [Done](layout-build/v1-letter-post-1024x576-theme2-done.png) | [Album](layout-build/v1-letter-post-1024x576-theme2-album.png) |
| Letter Post | 768×1024 | Air mail | [Home](layout-build/v1-letter-post-768x1024-theme0-home.png) | [Done](layout-build/v1-letter-post-768x1024-theme0-done.png) | [Album](layout-build/v1-letter-post-768x1024-theme0-album.png) |
| Letter Post | 768×1024 | Candy post | [Home](layout-build/v1-letter-post-768x1024-theme1-home.png) | [Done](layout-build/v1-letter-post-768x1024-theme1-done.png) | [Album](layout-build/v1-letter-post-768x1024-theme1-album.png) |
| Letter Post | 768×1024 | Dark | [Home](layout-build/v1-letter-post-768x1024-theme2-home.png) | [Done](layout-build/v1-letter-post-768x1024-theme2-done.png) | [Album](layout-build/v1-letter-post-768x1024-theme2-album.png) |
| Letter Post | 1920×1080 | Air mail | [Home](layout-build/v1-letter-post-1920x1080-theme0-home.png) | [Done](layout-build/v1-letter-post-1920x1080-theme0-done.png) | [Album](layout-build/v1-letter-post-1920x1080-theme0-album.png) |
| Letter Post | 1920×1080 | Candy post | [Home](layout-build/v1-letter-post-1920x1080-theme1-home.png) | [Done](layout-build/v1-letter-post-1920x1080-theme1-done.png) | [Album](layout-build/v1-letter-post-1920x1080-theme1-album.png) |
| Letter Post | 1920×1080 | Dark | [Home](layout-build/v1-letter-post-1920x1080-theme2-home.png) | [Done](layout-build/v1-letter-post-1920x1080-theme2-done.png) | [Album](layout-build/v1-letter-post-1920x1080-theme2-album.png) |
| Moonboat | 1024×576 | Dark | [Home](layout-build/v3-moonboat-1024x576-theme0-home.png) | [Done](layout-build/v3-moonboat-1024x576-theme0-done.png) | [Album](layout-build/v3-moonboat-1024x576-theme0-album.png) |
| Moonboat | 1024×576 | Cloud day | [Home](layout-build/v3-moonboat-1024x576-theme1-home.png) | [Done](layout-build/v3-moonboat-1024x576-theme1-done.png) | [Album](layout-build/v3-moonboat-1024x576-theme1-album.png) |
| Moonboat | 1024×576 | Plum dusk | [Home](layout-build/v3-moonboat-1024x576-theme2-home.png) | [Done](layout-build/v3-moonboat-1024x576-theme2-done.png) | [Album](layout-build/v3-moonboat-1024x576-theme2-album.png) |
| Moonboat | 768×1024 | Dark | [Home](layout-build/v3-moonboat-768x1024-theme0-home.png) | [Done](layout-build/v3-moonboat-768x1024-theme0-done.png) | [Album](layout-build/v3-moonboat-768x1024-theme0-album.png) |
| Moonboat | 768×1024 | Cloud day | [Home](layout-build/v3-moonboat-768x1024-theme1-home.png) | [Done](layout-build/v3-moonboat-768x1024-theme1-done.png) | [Album](layout-build/v3-moonboat-768x1024-theme1-album.png) |
| Moonboat | 768×1024 | Plum dusk | [Home](layout-build/v3-moonboat-768x1024-theme2-home.png) | [Done](layout-build/v3-moonboat-768x1024-theme2-done.png) | [Album](layout-build/v3-moonboat-768x1024-theme2-album.png) |
| Moonboat | 1920×1080 | Dark | [Home](layout-build/v3-moonboat-1920x1080-theme0-home.png) | [Done](layout-build/v3-moonboat-1920x1080-theme0-done.png) | [Album](layout-build/v3-moonboat-1920x1080-theme0-album.png) |
| Moonboat | 1920×1080 | Cloud day | [Home](layout-build/v3-moonboat-1920x1080-theme1-home.png) | [Done](layout-build/v3-moonboat-1920x1080-theme1-done.png) | [Album](layout-build/v3-moonboat-1920x1080-theme1-album.png) |
| Moonboat | 1920×1080 | Plum dusk | [Home](layout-build/v3-moonboat-1920x1080-theme2-home.png) | [Done](layout-build/v3-moonboat-1920x1080-theme2-done.png) | [Album](layout-build/v3-moonboat-1920x1080-theme2-album.png) |

The approved home layouts and the collection presentation are implemented here. Listen, picture matching, and reward behavior otherwise retain the existing game design, including the held wrong-answer sounds.

The requested raw.githack game URLs returned HTTP 403 from this environment. Hosted rendering and CDN freshness could not be verified here. The local real-game screenshots, browser checks, and offline checks are the confirmed evidence.
