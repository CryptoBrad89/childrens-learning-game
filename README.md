# Letters with Lucy · Letter Post, Moonboat, and Ribbon Road

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
node tests/grown_ups_runtime.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/grown_ups_smoke.cjs
node tests/accounts_merge.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_sync.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/home_flow.cjs
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
- `silk_smoke.cjs` checks all 26 Ribbon Road rounds, palette persistence,
  60px touch targets, reduced motion and offline resources at widths 390,
  1180 and 1920. Screenshots go to `/tmp/silk-shots`.
- `confetti_smoke.cjs` checks continuous confetti in all three games and
  themes at phone and whiteboard sizes. Screenshots go to
  `/tmp/confetti-shots`.
- `grown_ups_runtime.cjs` (no browser) checks that settings are validated and
  saved, and that every world's real renderer obeys chosen letters, hint
  timing, a quiet start, voice volume and hidden children's buttons.
- `grown_ups_smoke.cjs` checks the grown-ups' corner at phone, tablet,
  Chromebook and whiteboard sizes: the chooser door, gate refusal, the
  three-miss pause and unlock, every setting, the last-world and last-letter
  guards, reset, relocking, and the settings' effect on the chooser and all
  three worlds. It also covers reduced motion and dark mode. Screenshots go to
  `/tmp/grown-ups-shots`.

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
scatters stars, crescents, ringed planets, and curls; Ribbon Road scatters
hearts, curls, and stars. Separate transform layers handle descent, flutter,
and tumble, with no per-frame JavaScript or SVG filters. Colors use the
world palette.

## Ribbon Road

Ribbon Road reuses Letter Post's engine, artwork, motion, fonts, and Lucy
assets through relative paths. Its `config.js` supplies the home view, title,
palette labels, and asset base. Pink is the default, followed by Purple and
Yellow. Each world keeps its own theme choice.

## Accounts

Serve the folder (`python3 -m http.server 8000`) to use real sign-ins. Opening
the files directly keeps the local grown-up gate and device settings, which is
what the offline checks cover.

After a short still splash, the first screen is a child login: sign-in name
and secret. There is no classroom, group, or invite code on that dialog.
**Are you a grown-up?** opens the same cream page. **Play without saving**
starts a visit that does not keep sounds, stars, or settings. Then the child
picks Letter Post, Moonboat, or Ribbon Road. Ribbon Road is highlighted and is
the default. The three cards start the game. A child signs in with a name and
a secret of at least 6 characters (a pin plus initials, such as `7234ab`, is
enough). There are no capital, number or symbol rules. A grown-up signs in
with an email they already have. The sign-in screen cannot create a grown-up.
An admin who is already signed in can add one.

The number-word gate stays on `file://`. On the served game it is replaced by
these accounts: a child session cannot open settings, and a teacher or parent
session can. Settings, kept letters and stars are stored for the child and
merged across devices. Letters and stars are add-only. Play counts add per
device. Each setting keeps the newer edit, so an older change does not wipe a
newer one. Offline play stays in the browser and merges when the network
returns. The first sign-in on a device needs the network. After that, a refresh
token keeps the session for later offline play.

Demo sign-ins (created by `node tests/seed_accounts.mjs`, safe to run again):

- Admin grown-up `ada@littlewoof.test` / `sunnyday`. Ada can add children and other grown-ups. The corner does not show a class or invite code.
- Child Maya, sign-in `maya` / `7234ab`, picture fox
- Child Sam, sign-in `sam` / `8811sa`, picture owl
- Grown-up `pat@littlewoof.test` / `homepup`, linked to Maya. Pat can manage children and cannot add grown-ups.

`accounts_sync.cjs` signs in a fresh child on two browsers, plays one letter
offline and another online, and checks that both browsers show both letters.

## Grown-ups' corner

The home footer has a small **Are you a grown-up?** link that opens
`grown-ups/index.html`. Before the settings appear, an adult taps three digits
written as words ("seven, two, five"). Children of three or four can't read
number words yet. Each miss brings new numbers, every third miss pauses the
keypad for 10 seconds, and every visit starts locked again.

Opening the files directly, settings save in this browser under
`little-woof-grown-ups` and apply the next time a world opens. On the served
game that key is only a copy of the child who is signed in, and the saved copy
follows that child to the next machine:

- **Sound:** Lucy's voice on or off at the start, voice volume (with a sample),
  and sound effects.
- **Letters:** any set of letters, or quick sets (all 26, s a t p i n,
  vowels). Pickers, collections, counts and "Another sound" use only the
  chosen letters. Wrong-answer pictures can still come from any letter.
- **Help:** the right picture is outlined after one miss, after two (the
  default), or never.
- **Motion:** *Calm motion* behaves exactly like a reduced-motion preference.
- **Worlds and buttons:** which worlds the chooser shows (at least one), and
  whether children see the sound and color buttons.

`grown-ups/settings.js` is the shared, validated store. `grown-ups/in-game.css`
mirrors the reduced-motion rules for calm motion. The defaults leave every
world exactly as it was. The masthead band is Paper Shaders' static mesh
gradient (Apache-2.0, see `grown-ups/paper-shaders/`), drawn once with WebGL2,
with a CSS fallback. Design notes are in
[grown-ups/DESIGN.md](grown-ups/DESIGN.md). Opened straight from `file://`,
some browsers (Firefox, for example) may keep separate storage for each page. Serve the
folder (see above) to share settings in every browser.

## Rules

- Lucy's images are never redrawn or altered.
- No new audio unless explicitly requested; any new voice is Lucy / `eleven_v4`.
