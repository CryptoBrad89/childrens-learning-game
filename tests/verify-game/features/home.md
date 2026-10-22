# Home and letter shelf

## Sub-features

Letter Post and Moonboat have six-letter pages, top-aligned home scenes, compact landscape layouts, themes, mute, completion badges, and expandable collections. Ribbon Road retains its existing scrolling A–Z trail and collection.

## How to get to it (user POV)

Open a world's index page. Home buttons and Escape return here from play.

## Driving it with Playwright

Open `v1-letter-post/index.html` and `v3-moonboat/index.html` with `pathToFileURL`. Await `body[data-screen="home"]`; inspect the six `[data-letter]` buttons. Use `[data-action="letters-next"]` and `[data-action="letters-previous"]` to reach all enabled letters. `.page-range` and `.page-number` identify the current page. End arrows are disabled. Arrow keys move letter focus across page boundaries and wrap Z to A.

Select `#theme` values 0, 1, and 2. Click `#mute` and inspect `aria-pressed`. Click `.collection-preview summary` to open the full collection. A correct round adds a green `.done-badge` and a "Done" caption. Opening a letter or answering incorrectly must not add either. Returning home after a new correct answer settles the new badge once; paging, reopening, and repeated success do not replay that settle. Calm and reduced motion are static. Progress remains limited to the current visit.

Run `node tests/layout_build.cjs` for all themes at 1024×576, 1280×720, 1366×768, 1440×900, 768×1024, and 1920×1080, real answer paths, motion, restricted letter pools, and screenshots under `reports/layout-build/`. `tests/browser_smoke.cjs` covers B/J/X/Z journeys, no hints, replay, keyboard wrap, and collection expansion. `tests/motion_smoke.cjs` covers the existing route and reward effects.

## Gotchas

Collapsed home must fit without scrolling at the laptop, portrait-tablet, and whiteboard sizes above. Expanded collections may grow the document. Decorative card shadows can extend beyond the picker box; the picker must not become an inner scroller. Completion is current-visit success, not saved mastery. Ribbon Road does not load the new layout module or stylesheet. `node tests/layout_ribbon_unchanged.cjs` compares its five rendered screens against the rollback app at three sizes.

Run `tests/silk_smoke.cjs` to verify Ribbon Road palettes in Pink, Purple, Yellow order, persistence, all 26 completed rounds, 60px targets, and chooser links at 390, 1180, and 1920.


The root home page now starts at the child login dialog. Click **Play without saving** to open the layout picker, whose first highlighted choice is Ribbon Road. A fresh home entry always shows the dialog; the explicit **Choose a layout** return from a game restores the picker for the current account or unsaved session. Unsaved play deliberately ignores stored settings. Keep direct-file settings-renderer checks separate from this unsaved journey.

Run `node tests/home_flow.cjs` for the complete hosted journey and unsaved persistence assertions. No screenshots are taken.
