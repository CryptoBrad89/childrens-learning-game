# Children's Learning Game · Letter Post, Moonboat, and Silk Thread

Open [index.html](index.html) directly, or serve the repository root with
`python3 -m http.server 8000` and visit `/`.
All three games work offline from local files, without a build step.
Vanilla HTML, CSS, and JavaScript; no dependencies.

All three games cover A–Z with their screens, typography, palettes, Lucy
photos, screen animations, themes, hints, replay and visit collections.
Envelope/planet cards scroll vertically within their shelves; stamp
strips/constellations scroll horizontally and count up to 26. A newly earned
letter is brought into view on the celebration screen. Collections last for
the current visit.

G uses goat. X uses fox's ending /ks/: the question and hint say “ends with,”
and the celebration says “Fox ends with x.” Distractors exclude matching
sounds (cat/kite) and matching starting words (fish/fox). Word pictures are
code-native SVGs.

## Audio

`audio-map.js` maps the 53 approved letter clips, including the long-I extra
(the insect round uses short I). They must stay byte-identical to
`approved/approved-sha256.txt`. Six picture-word clips live in each game's
assets; the other 20 are in `audio/words/`. Every clip is inventoried in
`voice-manifest.json` with its hash. All clips are Lucy
(`FgiNpTIapnCbaD6xiqIo`) / ElevenLabs `eleven_v4`; clips are reused byte for
byte, never renamed or re-encoded.

## Tests

Read-only, stdlib checks, from the repository root:

```sh
python3 tests/run_tests.py
```

Strict mode should pass **6/6** groups: approved audio, trim metadata,
wiring, voice inventory, A–Z word/audio/SVG coverage, and light and dark
themes for Letter Post and Moonboat. Failures exit nonzero.

Offline runtime and browser checks:

```sh
node tests/runtime_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/browser_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/motion_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/silk_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/confetti_smoke.cjs
```

- `runtime_smoke.cjs` (no browser) plays 234 rounds (26 letters × 3 themes ×
  3 games) with browser APIs stubbed: listen/replay, wrong answers and
  two-miss hints, celebration, next-letter wraparound, collections and mute.
- `browser_smoke.cjs` uses local Playwright and file URLs to check B/J/X/Z
  at 390×844, 768×1024 and 1440×1000 in all themes, including touch targets
  and horizontal overflow. Screenshots go to `/tmp/lpmb-shots`. Set
  `BROWSER_SMOKE_SHARD` to 0–5 to run one game/viewport pair.
- `motion_smoke.cjs` drives both worlds at phone, tablet, and whiteboard
  sizes with real interactions, normal and reduced motion, and no network.
  Screenshots go to `/tmp/lpmb-motion-shots`.
- `silk_smoke.cjs` checks all 26 Silk Thread rounds, palette persistence,
  60px touch targets, reduced motion and offline resources at widths 390,
  1180 and 1920. Screenshots go to `/tmp/silk-shots`.
- `confetti_smoke.cjs` checks continuous confetti in all three games and
  themes at phone and whiteboard sizes. Screenshots go to
  `/tmp/confetti-shots`.

Set `PLAYWRIGHT_MODULE` and/or `CHROMIUM_EXECUTABLE` if needed. The
[verification skill](tests/verify-game/SKILL.md) documents repeatable home,
play, and reward journeys. These prototypes do not install a service worker.

## Motion

The child UI uses a storybook stage with chunky letter cards, finite staggered
entrances, expressive portrait movements, and sound bars during narration.
Animations use transform and opacity. Lucy breathes gently on play screens.
Hidden tabs pause motion; reduced-motion preferences disable it, including
hover movement. Screen changes fade out before the next scene enters.
Correct picture cards bounce before the reward; wrong cards wiggle with a
fading soft red glow.

Rewards recycle twenty-four SVG paper cut-outs continuously until the route
changes; replay keeps the same pieces falling and reduced motion removes them.
Letter Post scatters envelopes, stamps, hearts, and paper curls; Moonboat
scatters stars, crescents, ringed planets, and curls; Silk Thread scatters
hearts, curls, and stars. Separate transform layers handle descent, flutter,
and tumble, with no per-frame JavaScript or SVG filters. Colors use the
world palette.

## Silk Thread

Silk Thread reuses Letter Post's engine, artwork, motion, fonts, and Lucy
assets through relative paths. Its `config.js` supplies the home view, title,
palette labels, and asset base. Pink is the default, followed by Purple and
Yellow. Each world keeps its own theme choice.

## Rules

- Lucy's images are never redrawn or altered.
- No new audio unless explicitly requested; any new voice is Lucy / `eleven_v4`.
