# Reward and another sound

## Sub-features

Animated success scene, twenty-four continuously recycled themed paper cut-outs, approved Lucy art, collected letter, word replay, another sound, home return, and cancellation of interrupted scenes.

## How to get to it (user POV)

Choose the matching picture. Tap Hear again, Another sound, or Home from the reward.

## Driving it with Playwright

After a correct `[data-answer="B"]` click, await `body[data-screen="celebrate"]`. Verify `.collection-heading` reads `1 of 26`, capture the reward, and click `[data-action="reward-replay"]`. Click `[data-action="next"]` and verify the listen screen advances to C. Press Escape to return home, start X, and immediately Escape again; await all finite effects and ensure home remains displayed with no `.listen-letter`. The motion helper checks actual reward movement, compositor-friendly active keyframes, bounded decorative particles, live reduced-motion cancellation, and phone/tablet/whiteboard overflow.

## Gotchas

Repeated success for the same letter keeps collection count at one. Finite scene movement ends naturally; inspect animations immediately after the triggering action rather than after screenshots or arbitrary waits. Reduced motion must leave the reward and navigation fully usable with no sustained animation.

Run `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/confetti_smoke.cjs`
to check painted confetti in all three games, all themes, and phone/whiteboard sizes.
The helper waits for visible paper, samples independent descent and drift, then
captures mid-fall screenshots in `/tmp/confetti-shots/`. It verifies painted
SVG shapes including postal hearts, four large hero pieces, continuous fall and flutter,
compositor-only animation, absence of SVG filters, stable DOM reuse across multiple flights and replay, live reduced-motion cleanup,
and cancellation when navigating during the fall. Counting particle nodes alone
does not prove visibility.
