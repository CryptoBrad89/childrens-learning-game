# Home and letter shelf

## Sub-features

Letter Post, Moonboat, and Ribbon Road home scenes, finite entrance animation, A–Z scrolling shelves, themes, mute, and collection strips.

## How to get to it (user POV)

Open a world's index page. Home buttons and Escape return here from play.

## Driving it with Playwright

Open `v1-letter-post/index.html` and `v3-moonboat/index.html` with `pathToFileURL`. Await `body[data-screen="home"]`; inspect `[data-letter]` for A–Z. Select `#theme` values 0, 1, and 2. Click `#mute` and inspect `aria-pressed`. Focus `[data-letter="Z"]`, press ArrowRight, and verify A receives focus. Scroll `.picker-shelf` to reach Z and `.collection-slots` to see the final collection slots. Capture home screenshots. The motion helper checks real active animations and reduced-motion preferences; the broader smoke checks all themes and keyboard wrap.

## Gotchas

The shelf and collection intentionally scroll inside their containers. Only document-level horizontal overflow is a layout failure. File contexts begin with isolated progress; do not assume a previously collected letter. Theme changes can cancel preceding finite effects.

Run `tests/silk_smoke.cjs` to verify Ribbon Road palettes in Pink, Purple, Yellow order, persistence, all 26 completed rounds, 60px targets, and chooser links at 390, 1180, and 1920.


The root home page now starts at the child login dialog. Click **Play without saving** to open the layout picker, whose first highlighted choice is Ribbon Road. A fresh home entry always shows the dialog; the explicit **Choose a layout** return from a game restores the picker for the current account or unsaved session. Unsaved play deliberately ignores stored settings. Keep direct-file settings-renderer checks separate from this unsaved journey.

Run `node tests/home_flow.cjs` for the complete hosted journey and unsaved persistence assertions. No screenshots are taken.
