# Tidy 1B: approved visual changes built

The real Letter Post, Moonboat, and Ribbon Road games now use the approved larger profile picture. Letter Post's "OPEN FOR PLAY!" tag is removed, with nothing in its place. Work stays on `codex/home-flow-ribbon`.

- [Play Letter Post](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v1-letter-post/index.html)
- [Play Moonboat](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v3-moonboat/index.html)
- [Play Ribbon Road](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v4-silk-thread/index.html)

## What changed

Item 6 uses the approved preview's exact dimensions: a 42×42 px image inside a 50×50 px profile button, with 3 px padding. The shared in-game profile CSS applies to all three games, every theme, and both child and grown-up profiles. Browser measurements confirm that the picture, button dimensions, padding, and corner radius match the approved preview. The button centers remain aligned with the sound and theme controls.

Item 8 removes the tag markup from Letter Post's paged home and the fallback home rendering in both copies of the game script. Lucy, the mailbox, and the working letter buttons remain. The original approved previews are unchanged.

The offline manifest now has version `633a35e743d88816`, replacing `4324eb157385c118`, and still contains 150 assets. The worker's update logic is unchanged.

Everything else from tidy list 1 stays intact. The production diff changes only the profile CSS, tag markup, and manifest version. Audio files, wrong-answer playback, hints, portal role checks, dropdown handlers, and completion logic are unchanged. A letter becomes done only after a correct answer. [Scope check](tidy-1b/tests/scope.log).

## Verification results

| Check | Result and evidence |
| --- | --- |
| Approved visual match | `node tests/tidy_1b.cjs`: all 54 cases pass. Three games × three themes × three viewports × two roles. Checks exact avatar and button dimensions against the approved preview, padding, corner radius, centered controls, no tag, working menus, outside taps, and grown-up-only portal visibility. [Log](tidy-1b/tests/visuals.log), [measurements](tidy-1b/visual-checks.json). |
| Tidy-1 regression | `TIDY_REPORT_DIR=reports/tidy-1b node tests/tidy_1.cjs`: all 18 role and viewport cases and three native-audio checks pass. Covers silent picture entry, repeated misses without hints, the word/pause/retry sequence, all retry clips, interruption, mute, dropdown dismissal, and correct-answer-only completion. [Log](tidy-1b/tests/tidy-1-regression.log), [results](tidy-1b/checks.json). |
| Offline update from tidy-1 | `TIDY_REPORT_DIR=reports/tidy-1b TIDY_UPDATE_REVISIONS=e31c9af node tests/tidy_1_update.cjs`: passes. Installs the old build with its tag, serves the new build, then refreshes once in the same tab. The new cache takes over without manually clearing cache or closing tabs. All three games then work offline, apply the 42 px avatar CSS, and have no tag. An open account page stays in place. A later online document change appears on its next load. [Log](tidy-1b/tests/update.log), [results](tidy-1b/service-worker-update.json). |
| Motion and navigation | `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/motion_smoke.cjs`: all 12 cases pass, including normal and reduced motion, entrances, replay, wrong and correct answers, reward, cancellation, and live motion changes. [Log](tidy-1b/tests/motion.log). |
| Audio, assets, and content | `python3 tests/run_tests.py`: all six strict checks pass, including approved audio hashes, inventory, alphabet, and themes. Syntax checks pass for the changed JavaScript. [Static log](tidy-1b/tests/static.log), [syntax log](tidy-1b/tests/syntax.log). |

The required viewports are 1024×576, 768×1024 portrait tablet, and 1920×1080. Screenshots use isolated local fixture accounts and a sample Lucy avatar. No live account requests are sent. The visual harness serves the approved static preview's original localhost avatar reference from the existing local Lucy image; the historical preview files are not edited.

An external raw.githack request returned HTTP 403 from Cloudflare in this environment. Hosted playback could not be verified here. The game behavior, visual measurements, and cache upgrade were verified in Chromium on a local server, including a nested hosting path. [Hosted response](tidy-1b/tests/hosted-head.log).

## Screenshots

All screenshots are under `reports/tidy-1b/`. The home screenshots below show grown-up fixtures. The folder also contains child home screenshots for every theme and size, menu screenshots for both roles, gameplay regression screenshots, and the old/new cache-upgrade screenshots. Ribbon Road's full-page images include its existing scrolling trail.

| Game and theme | 1024×576 | 768×1024 | 1920×1080 |
| --- | --- | --- | --- |
| Letter Post · Air mail | [View](tidy-1b/v1-letter-post-grownup-1024x576-theme0-home.png) | [View](tidy-1b/v1-letter-post-grownup-768x1024-theme0-home.png) | [View](tidy-1b/v1-letter-post-grownup-1920x1080-theme0-home.png) |
| Letter Post · Candy post | [View](tidy-1b/v1-letter-post-grownup-1024x576-theme1-home.png) | [View](tidy-1b/v1-letter-post-grownup-768x1024-theme1-home.png) | [View](tidy-1b/v1-letter-post-grownup-1920x1080-theme1-home.png) |
| Letter Post · Dark | [View](tidy-1b/v1-letter-post-grownup-1024x576-theme2-home.png) | [View](tidy-1b/v1-letter-post-grownup-768x1024-theme2-home.png) | [View](tidy-1b/v1-letter-post-grownup-1920x1080-theme2-home.png) |
| Moonboat · Dark | [View](tidy-1b/v3-moonboat-grownup-1024x576-theme0-home.png) | [View](tidy-1b/v3-moonboat-grownup-768x1024-theme0-home.png) | [View](tidy-1b/v3-moonboat-grownup-1920x1080-theme0-home.png) |
| Moonboat · Cloud day | [View](tidy-1b/v3-moonboat-grownup-1024x576-theme1-home.png) | [View](tidy-1b/v3-moonboat-grownup-768x1024-theme1-home.png) | [View](tidy-1b/v3-moonboat-grownup-1920x1080-theme1-home.png) |
| Moonboat · Plum dusk | [View](tidy-1b/v3-moonboat-grownup-1024x576-theme2-home.png) | [View](tidy-1b/v3-moonboat-grownup-768x1024-theme2-home.png) | [View](tidy-1b/v3-moonboat-grownup-1920x1080-theme2-home.png) |
| Ribbon Road · Pink | [View](tidy-1b/v4-silk-thread-grownup-1024x576-theme0-home.png) | [View](tidy-1b/v4-silk-thread-grownup-768x1024-theme0-home.png) | [View](tidy-1b/v4-silk-thread-grownup-1920x1080-theme0-home.png) |
| Ribbon Road · Purple | [View](tidy-1b/v4-silk-thread-grownup-1024x576-theme1-home.png) | [View](tidy-1b/v4-silk-thread-grownup-768x1024-theme1-home.png) | [View](tidy-1b/v4-silk-thread-grownup-1920x1080-theme1-home.png) |
| Ribbon Road · Yellow | [View](tidy-1b/v4-silk-thread-grownup-1024x576-theme2-home.png) | [View](tidy-1b/v4-silk-thread-grownup-768x1024-theme2-home.png) | [View](tidy-1b/v4-silk-thread-grownup-1920x1080-theme2-home.png) |

## Delivery and protections

The rollback branch `rollback/pre-tidy-1b-2026-10-21-codex` was verified at `e31c9afe0c0be4aea04d1877876366499fd99b1c` and pushed to origin before implementation. GitHub accepted the push through the existing origin and reports that the repository moved to `TeslaWarpDrive/childrens-learning-game`. The game links retain the requested CryptoBrad89 form.

There is no database or backend work. Brandy's master account was not signed into, read, edited, renamed, reset, deleted, or otherwise used. No pre-existing accounts were deleted or restored. Bradley's test deletions, passwords, settings, and progress were left alone. All account-related verification used disposable local fixtures or blocked external account requests.

The changes, verification scripts, screenshots, and report are included in the delivery commit on `codex/home-flow-ribbon`. Stop after delivery.
