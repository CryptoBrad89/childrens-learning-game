# Letters with Lucy · Letter Post, Moonboat, and Ribbon Road

Serve the repository root over HTTP(S), for example
`python3 -m http.server 8000`, and visit `/`. After the first visit a service
worker (`sw.js`) keeps every file, so the games work offline. Pages, scripts
and styles come from the network first (the stored copy is for offline), so a
new build shows on the next load; bump `VERSION` in `sw.js` with every build. Opening
[index.html](index.html) straight from disk still works too (without the
offline shell). No build step. Vanilla HTML, CSS, and JavaScript; the only
runtime service is the Supabase project for accounts (see below).

All three games cover A–Z with their screens, typography, palettes, Lucy
photos, screen animations, themes, replay and collections.
On laptops, Chromebooks, tablets and whiteboards (700px wide and up), Letter
Post and Moonboat fit their home screen with no page scroll: the letters come
a page at a time, sized to the space left, with big ◀ ▶ arrows and a page
label, and coming back from a letter opens its page. Their collection is a
one-line summary that opens the whole collection. On phones the cards scroll
in their shelves as before. Ribbon Road's home is unchanged. Stamp
strips/constellations count up to 26, and a newly earned letter is brought
into view on the celebration screen.

A letter is **done** only after a correct answer. Done cards keep their colors
and stay tappable, read **Done**, and carry the same dark green `#176b3a`
badge with a white tick in every game and theme; a newly done letter's badge
settles once (220ms, none in calm or reduced motion). Signed in, done letters
are the account's saved correct answers from **every** game, refreshed after
each sync; playing without saving keeps them for the current visit.

There are no hints. Opening a letter, from its card or with “◀ Listen”,
Lucy says the letter and then its sound. “Find the picture” opens quietly (tap
the letter to hear it). A wrong picture plays only its own word, a short pause and one try-again
clip picked at random from `GAME_AUDIO.feedback.retry` (today only “Not
quite!”); the pictures stay live and any new tap cuts it off. After a correct
answer the cheer starts as the found-it page appears.

Signed in, the player's picture sits at the top right. Its menu has “I'm done”;
a grown-up who is playing also gets the grown-ups' corner and their account,
in one tap. Children never see those links.

G uses goat. X uses fox's ending /ks/: the question says “ends with,”
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
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/ribbon_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/confetti_smoke.cjs
node tests/grown_ups_runtime.cjs
node tests/offline_shell.cjs
npm ci --prefix tests/db            # once: PGlite, for the database tests
node tests/accounts_db.mjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/grown_ups_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_flow.mjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_two_devices.mjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/home_flow.mjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/fit_check.mjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/catchup_flow.mjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/celebrate_timing.mjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/sw_update.mjs
node tests/names_check.cjs
```

To run the browser suites without writing any screenshots, add
`-r ./tests/no-screenshots.cjs` after `node`.

- `runtime_smoke.cjs` (no browser) plays 234 rounds (26 letters × 3 themes ×
  3 games) with browser APIs stubbed: listen/replay, the quiet match step,
  wrong answers that play only the word and a try-again (no hints), the cheer,
  done badges, next-letter wraparound, collections and mute.
- `fit_check.mjs` checks the Letter Post and Moonboat homes at 1024×576,
  1366×768, 768×1024, 1920×1080, 1440×900 and 390×844 in every theme: no page
  scroll, nothing cut off, page arrows and labels, and done badges clear of
  the letter, its caption and the next card (Ribbon Road's badges too). It
  fails if letters overflow at 1024×576. It also checks Ribbon Road's sound
  ribbon on the home and found-it pages at the same sizes and themes, with
  all 26 words: each word whole on one line, inside its slot, clear of its
  done tick and at least 4px from the next word. `FIT_SHOTS=dir` saves screenshots.
- `catchup_flow.mjs` (accounts backend) checks done letters from saved
  progress in every game, reloads, sign-out, account switching, guests and
  resets; one settle; the quiet match step and misses with real audio; the
  picture button and menu for children and grown-ups.
- `celebrate_timing.mjs` measures correct tap → cheer in every layout at
  1024×576, 768×1024 and 1920×1080.
- `sw_update.mjs` installs the start build's offline copy, deploys this build
  and a later one, and checks each shows within one refresh (the later one on
  the next load) and that offline play still works.
- `browser_smoke.cjs` uses local Playwright and file URLs to check B/J/X/Z
  at 390×844, 768×1024 and 1440×1000 in all themes, including pages of
  letters, the collection sheet, touch targets and horizontal overflow. Screenshots go to `/tmp/lpmb-shots`. Set
  `BROWSER_SMOKE_SHARD` to 0–5 to run one game/viewport pair.
- `motion_smoke.cjs` drives both worlds at phone, tablet, and whiteboard
  sizes with real interactions, normal and reduced motion, and no network.
  Screenshots go to `/tmp/lpmb-motion-shots`.
- `ribbon_smoke.cjs` checks all 26 Ribbon Road rounds, palette persistence,
  60px touch targets, reduced motion and offline resources at widths 390,
  1180 and 1920. Screenshots go to `/tmp/ribbon-shots`.
- `confetti_smoke.cjs` checks continuous confetti in all three games and
  themes at phone and whiteboard sizes. Screenshots go to
  `/tmp/confetti-shots`.
- `grown_ups_runtime.cjs` (no browser) checks that settings are validated,
  come from the signed-in player, and that every world's real renderer obeys
  them and records finished rounds.
- `offline_shell.cjs` (no browser) checks `sw.js` stores exactly the shipped
  files and every page loads accounts before settings.
- `accounts_db.mjs` runs `supabase/migrations` in PGlite (real Postgres in
  WebAssembly) behind a local stand-in for Supabase Auth and PostgREST
  (`tests/db/supabase-stand-in.mjs`) and checks the API: no public sign-up
  (nothing is open to anyone signed out), grown-ups made only by a signed-in
  grown-up, no group or code functions, children with drawn or uploaded
  pictures, idempotent sync, settings conflicts, stickers, adding an existing
  child with guess limits, passwords, removing and deleting, and that the
  tables are closed to the API roles.
- `grown_ups_smoke.cjs` checks the corner with real sign-in at phone, tablet,
  Chromebook and whiteboard sizes: the grown-up sign-in card matches the
  children's (same cream page, card, ink and red button) and has no way to
  make an account, refusal, the simple corner with no banners, groups or
  codes, every setting saved to the children, guards, reset, sign-out, the
  reading gate and its pause for a grown-up who stays signed in, the
  settings' effect on the chooser and all three worlds, reduced motion, and a
  dark-mode device still getting the cream corner.
- `accounts_flow.mjs` walks grown-ups and a shared Chromebook through
  accounts end to end: children with an uploaded photo or a drawn picture, a
  grown-up adding another grown-up, pictures shown on a shared sign-in,
  adding an existing child, removing and deleting.
- `accounts_two_devices.mjs` is the two-device check: the same child on two
  browser profiles, one offline with a lost upload reply on reconnect;
  progress, settings and stickers must match exactly on both and the server.

- `home_flow.mjs` checks the home flow: splash, then the sign-in dialog as the
  first interactive thing (no group codes, a small grown-up link), play without
  saving (warned, nothing saved or sent), the picker defaulting to Ribbon Road
  and jumping straight in, a splash video hook, and the name top left on every
  screen.
- `names_check.cjs` (no browser) fails if any of the game's or the third
  layout's old names appears in a page, script, style, doc or test.

The accounts suites use the local stand-in by default; set `LW_BACKEND=live`
to run them against the real Supabase project in `accounts/config.js`.

Set `PLAYWRIGHT_MODULE` and/or `CHROMIUM_EXECUTABLE` if needed. The
[verification skill](tests/verify-game/SKILL.md) documents repeatable home,
play, and reward journeys.

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


Inside the code and the saved data the layout's key is still `silk`
(rounds' world, the `theme_silk` setting, the `all-silk` sticker, the CSS
hook). It is stored on devices and in the database, so renaming it would
orphan saved play; every name people see is Ribbon Road.
## Accounts and sync

Everyone has a real login: children and grown-ups. There are no classroom,
teacher or parent roles, and no groups or codes; any grown-up can look after
any number of children.
Settings, progress (every finished round) and stickers belong to the person,
live in Supabase, and follow them to any device. Details:
[reports/accounts-build.md](reports/accounts-build.md).

- **Home flow.** A short splash, then a sign-in dialog. A child signs in with
  their sign-in name and password (or taps their picture if they played on the
  device before, or a grown-up chose to show their children's pictures on it). Passwords
  only need six characters, for example a four-digit number plus the child's
  initials (`7234mk`). The dialog also has **Play without saving** (nothing is
  kept, and the game says so) and a small **Are you a grown-up?** link. Then
  the three layouts appear with **Ribbon Road** ready to go; picking one goes
  straight into it. **I'm done** hands the device to the next child, and a
  new tab never continues as the last child.
- **Grown-ups** sign in to the grown-ups' corner, on the same cream card as
  the children's sign-in. There is no public sign-up: only a grown-up who is
  signed in can add another grown-up, who then looks after the same children
  (the first grown-up is made by the project owner; see
  [supabase/README.md](supabase/README.md)). There are no groups or codes.
  Grown-ups add children (with one of the drawn pictures or any uploaded
  photo), or add a child who already has an account with the child's sign-in
  name and password. They reset passwords, print sign-in cards, show their
  children's pictures on a device's sign-in, see progress, change settings for
  one child or all of them, and take a child off their list or delete the
  account. A grown-up who stays signed in on their own device passes the
  number-word reading gate to come back in.
- **Offline**: everything is saved on the device first and uploaded when the
  connection returns. Rounds carry an id made on the device, so a retried
  upload never counts twice; settings merge per field, newest edit wins.

Code: `accounts/` (client, front door, pictures, in-world strip),
`grown-ups/` (corner), `supabase/migrations/` (database, the only source of
the schema), `sw.js` (offline shell).

## Grown-ups' corner

The sign-in dialog's **Are you a grown-up?** link (and the chooser's footer
button) opens `grown-ups/index.html`. A grown-up signs in. Settings
save as soon as they change, to the chosen child's account, and apply the
next time a world opens:

- **Sound:** Lucy's voice on or off at the start, voice volume (with a sample),
  and sound effects.
- **Letters:** any set of letters, or quick sets (all 26, s a t p i n,
  vowels). Pickers, collections, counts and "Another sound" use only the
  chosen letters. Wrong-answer pictures can still come from any letter.
- **Motion:** *Calm motion* behaves exactly like a reduced-motion preference.
- **Games and buttons:** which worlds the chooser shows (at least one), and
  whether children see the sound and color buttons.

`grown-ups/settings.js` is the shared, validated settings view of the person
playing. `grown-ups/in-game.css` mirrors the reduced-motion rules for calm
motion. The defaults leave every world exactly as it was. The masthead band is
Paper Shaders' static mesh gradient (Apache-2.0, see `grown-ups/paper-shaders/`),
drawn once with WebGL2, with a CSS fallback. Design notes are in
[grown-ups/DESIGN.md](grown-ups/DESIGN.md) and
[accounts/DESIGN.md](accounts/DESIGN.md).

## Rules

- Lucy's images are never redrawn or altered.
- No new audio unless explicitly requested; any new voice is Lucy / `eleven_v4`.
