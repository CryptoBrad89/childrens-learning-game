# Letters with Lucy

Little Sounds Big Discovery.

The home page opens a child-first sign-in dialog. Sign in, continue a previously signed-in child, or choose **Play without saving**. Then choose **Ribbon Road**, highlighted first by default, **Letter Post**, or **Moonboat**. The small **Are you a grown-up?** link opens the separate grown-up area. Grown-ups manage kids; additional administrator accounts require an existing grown-up to sign in.

Unsaved play never reads or changes saved preferences and never records rounds or achievements. Its colors and sound choices last only for the current page. A small Sign in to save link stays beside the game controls. Existing grown-up layout visibility choices still apply to signed-in accounts; unsaved play always offers all three layouts.

Open [index.html](index.html) directly, or serve the repository root with
`python3 -m http.server 8000` and visit `/`.
All three games work offline from local files, without a build step.
Vanilla HTML, CSS, and JavaScript; no dependencies.

All three games cover A–Z with their screens, typography, palettes, Lucy
photos, screen animations, themes, hints, replay and visit collections.
Envelope/planet cards scroll vertically within their shelves; stamp
strips/constellations scroll horizontally and count up to 26. A newly earned
letter is brought into view on the celebration screen. The in-world collections last for
the current visit. Signed-in progress pages keep lasting progress and milestones.

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
  Chromebook and whiteboard sizes: the portal door, settings without a keypad, the
  three-miss pause and unlock, every setting, the last-world and last-letter
  guards, reset, relocking, and the settings' effect on the chooser and all
  three worlds. It also covers reduced motion and dark mode. Screenshots go to
  `/tmp/grown-ups-shots`.

Set `PLAYWRIGHT_MODULE` and/or `CHROMIUM_EXECUTABLE` if needed. The
[verification skill](tests/verify-game/SKILL.md) documents repeatable home,
play, and reward journeys. Hosted pages install a service worker and cache all game assets for offline use. `file://` play keeps the original local behavior.

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

## Grown-ups' corner

The chooser’s **For grown-ups** link opens the portal. Hosted settings require a grown-up login. Select children using the Kids view checkboxes, then choose **Settings for selected kids**. The settings header has a direct **Grown-up portal** link. Local-file settings open directly; there is no PIN or keypad.

Signed-in settings save to the selected person's account and sync across devices. They apply the next time a world opens. Local-file settings use this browser's `little-woof-grown-ups` storage:

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
world exactly as it was. Grown-up pages use the same cream background, ink and
dotted texture as child sign-in, including on devices that prefer dark mode. Design notes are in
[grown-ups/DESIGN.md](grown-ups/DESIGN.md). Opened straight from `file://`,
some browsers (Firefox, for example) may keep separate storage for each page. Serve the
folder (see above) to share settings in every browser.

## Rules

- Lucy's images are never redrawn or altered.
- No new audio unless explicitly requested; any new voice is Lucy / `eleven_v4`.


## Accounts and offline sync

Serve the repository on HTTPS, or use `python3 -m http.server 8000` for localhost testing. Start at `/` for child sign-in. The grown-up link opens `/accounts/` through the protected settings area; sign in with an existing grown-up account, then make child logins or link an existing child's account. Everyone signs in with a unique login name and a password of at least six characters. A child uses the same login wherever they play. The portal manages kids, offers profile icons or picture uploads when creating a child, and manages child settings. The progress page shows lasting rounds and milestones, and offers an explicit **Sign out** for shared computers.

Grown-ups can edit their display name, unique username, password, and profile icon or uploaded picture. **Link an existing child** offers children already linked to other grown-ups, without asking for a child's password. Each linked child has an **Open progress page** button. The portal reads server progress on entry and refreshes automatically; connection failures show labelled last-known data. **Manage this child**, inside their progress page, contains confirmed progress reset and permanent account deletion. Reset keeps the child's login and settings, and prevents older offline rounds from returning.

The header says **Games ready for offline play** after the whole game is cached. A previously signed-in person can reopen and play offline. A new sign-in requires a connection. Completed rounds and field-level setting edits wait in IndexedDB until reconnecting; repeated delivery cannot count a round twice. Settings include every grown-up option, sound choice and each world's theme. Opening a new world uses the latest synchronized choices. The in-world letter collection remains a collection for this visit; the progress page is permanent history.

Only the publishable client key is in `accounts/config.js`. The database and account-provisioning function are recorded in [supabase/](supabase/README.md). [Build report](reports/accounts-build.md) and [design notes](reports/accounts-design.md) explain the choices and limits.

After editing game assets, run `python3 scripts/build-offline-manifest.py` and commit the generated `sw-assets.js`.

Run account checks with:

```sh
node tests/accounts_database.cjs
node tests/accounts_database_edge.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_sync.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_sync.cjs --live
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_selection.cjs
```

The SQL checks need the pinned local test tools documented in `supabase/README.md`. The default browser account test uses a labelled protocol fixture. `--live` creates test users only in the configured project `ixjbgshhzeaosrzavssr` and saves their logins to `reports/accounts-test-logins.json`. It proves actual Supabase Auth, sync and row permissions with two isolated browser profiles. All account tests avoid screenshots. Add `NO_SCREENSHOTS=1` when running the older browser checks.


## Verify the home flow

Run `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/home_flow.cjs` for login-first behavior, role separation, the Ribbon Road default, the unsaved warning, guest isolation, offline reload and branding at phone, tablet and desktop sizes. It uses a labelled protocol fixture; the separate account helper's `--live` mode still verifies the real project.

The old database world identifier `silk`, existing asset URLs and storage identifiers stay stable so prior logins, offline outboxes, progress and themes continue to work. These are compatibility identifiers; the visible layout is Ribbon Road. Historical account-build reports remain an audit record.

## Fix-list verification

Run `MASTER_HANDLE=<live username> python3 tests/run_fixlist.py` for all local, browser, database, Edge, and live account suites. Read the master username from Supabase first; live tests never edit the master. The live tests create disposable accounts, so run the authorized cleanup after the suites. See [fix-list report](reports/fixlist-pass.md) for this pass’s inventory and retained logins.
