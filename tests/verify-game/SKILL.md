---
name: verify-game
description: Drive the Letters with Lucy child-facing Letter Post, Moonboat, and Ribbon Road browser games and verify learning journeys, motion, reduced motion, and offline assets. Use after changes to the games.
---

## Launch

From the repository root, run `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/motion_smoke.cjs`. The harness launches isolated headless Chrome contexts and opens each game's `index.html` with `file://`; no server, package install, seed data, or credentials are needed. The first `PASS v1-letter-post-390-motion` line proves the first complete journey reached a usable reward. Use `PLAYWRIGHT_MODULE` for an existing Playwright install if necessary; the helper also checks the local pnpm installation.

## Doctor

Run `python3 tests/run_tests.py` first. This read-only gate checks game assets, content, and existing invariants. If Chrome cannot launch, check `/usr/bin/google-chrome --version` and the harness's Playwright lookup before changing app code.

## Drive

The feature map is [features/README.md](features/README.md). The motion helper drives both games at phone, tablet, and whiteboard sizes, with normal and reduced motion, through actual letter, replay, choice, reward, next, and Escape interactions. It toggles the real mute button for fast journeys; it does not stub learning state or audio. Run the broader existing journey too: `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/browser_smoke.cjs`.

For focused investigation, reuse the helper's Playwright setup and `pathToFileURL` entry points. Use `[data-letter="B"]`, `.listen-letter`, `[data-action="match"]`, `[data-answer="B"]`, `[data-action="reward-replay"]`, and `[data-action="next"]`; await `document.body.dataset.screen` rather than a fixed delay. Do not call internal route or reward setters to claim a passing user journey.

## Evidence

Motion screenshots survive in `/tmp/lpmb-motion-shots/`, with game, viewport, preference, and screen in the filename. Broader screenshots survive in `/tmp/lpmb-shots/`. Keep the command's exit code and PASS output with the screenshots. A proof covers the actual actions and resulting state: collection count, wrong-choice feedback, route cancellation, animation keyframes, reduced-motion cancellation, page errors, and horizontal overflow. Both helpers reject HTTP(S); the motion helper also fails if any such request was attempted. This proves local runtime assets work without network access; it does not claim service-worker installation on a hosted origin.

## Cleanup

Both helpers close their own contexts and browser in `finally`, including failed iterations. No persistent profile or server is created. If manually driving, close the browser instance you launched. Never kill processes by name. Keep screenshots and failure reports after cleanup; verify `test -f /tmp/lpmb-motion-shots/v1-letter-post-390-motion-home.png`.

## Helpers

Invoke the JavaScript helpers with `node` using the commands above; they do not require executable permissions. Maintain this feature map alongside UI changes; `/maintain-verification-skill` provides the maintenance workflow. This skill lives under `tests/verify-game/` and is loaded by its explicit path.

For Ribbon Road, run `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/ribbon_smoke.cjs`. For continuous confetti in all worlds, run `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/confetti_smoke.cjs`. Check paper remains visible across multiple fall cycles and replay, then disappears on navigation or a live reduced-motion change.
