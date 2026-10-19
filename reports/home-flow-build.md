# Home flow, Letters with Lucy and Ribbon Road: build report

Branch `claude/home-flow-ribbon` (cut from the finished accounts build) ·
2026-10-19 · Preview: `index.html` and `grown-ups/index.html`

## Summary

- **New home flow.**
  - A short splash plays first. It has a slot for the video coming later; no
    video was invented.
  - The **first interactive thing is a child-first sign-in dialog**: sign-in
    name and password, and picture tiles when the device has some. It has no
    class, board or group codes.
  - Below sign-in there is a clear **Play without saving** button, and a
    small **Are you a grown-up?** link to the grown-ups' corner.
  - Next come the three layouts, with **Ribbon Road** highlighted, given a
    "Start here" sticker and focused. Picking any layout goes straight into
    that game.
  - **Play without saving** is one click. The picker then says plainly that
    stars, stickers and settings won't be kept, and each world's footer
    repeats "Playing without saving". Nothing is saved or sent.
- **Renamed to Letters with Lucy everywhere.**
  - It covers page titles, the top-left chrome of every screen (name with
    the tagline under it), the corner's postmark, Letter Post's "post office"
    line, docs and tests.
  - "Little Woof" and "Children's Learning Game" are gone from everything a
    person sees.
- **Silk Thread is now Ribbon Road.**
  - Labels, titles, the "Lucy's Ribbon Road" card, sticker names, the corner's
    world switch and progress, the folder (`v4-ribbon-road/`), the test
    (`ribbon_smoke.cjs`) and the docs all changed.
  - The internal key `silk` stays, because saved data uses it (see below).
- **Owner review applied.**
  - No group, board, classroom or invite codes anywhere in the grown-ups'
    corner: grown-ups just create and manage children.
  - The picker has only the three layout picks, with no separate "Play Ribbon
    Road" button. Ribbon Road stays the default highlighted pick.
- **No new migration.** Everything is client-side; the Supabase project is
  unchanged.
- **Tests:** two new ones, `home_flow.mjs` and `names_check.cjs`. The
  existing ones were updated for the new door and all pass (results below).

## What changed

### Home flow (`index.html`, `accounts/front-door.js`, `accounts/front-door.css`)

1. **Splash (`#splash`).**
   - It is the paper mesh-gradient band (Paper Shaders), Lucy, and the name,
     with its letters sliding in one by one, plus the tagline.
   - It shows once per visit: 1.4 seconds, or 0.5 seconds and still with
     reduced motion or Calm motion.
   - **Video hook:** put a `<video>` inside `#splash` and the sign-in opens
     when the video ends (or errors, or after 20 seconds). The test fakes one
     to prove it.
2. **Sign-in dialog (`#login`).** It is a native modal, so nothing behind it
   can be clicked, and Escape doesn't close it. It contains:
   - "Hello! Who's playing?".
   - Picture tiles, only when there are some. Tapping one fills in the
     sign-in name.
   - Sign-in name, then password with a Show button and the six-dot
     indicator for the only rule.
   - "Stay signed in on this device".
   - **Let's play** (primary), **Play without saving** (secondary) and
     **Are you a grown-up?** (a small link to `grown-ups/index.html`).
   - The world map and the header stay hidden until someone signs in or
     chooses to play without saving.
   - On a device the person hasn't used before, signing in still waits up to
     5 seconds for their settings first.
3. **Picker.**
   - The player strip (name, sync state, stickers, **I'm done**) or the
     "playing without saving" bar sits above the three layout cards.
   - The Ribbon Road card gets the default ring, a "Start here" sticker and
     focus, so Enter starts it.
   - If a grown-up has hidden Ribbon Road for that child, the first layout
     shown becomes the default instead.
   - **I'm done**, and **Sign in instead**, go back to the dialog.
   - Coming back from a world in the same visit goes straight to the picker,
     with no splash or dialog.
4. **No codes anywhere, front or back (owner review).**
   - The old "Open a group board" screen is gone from the front.
   - The grown-ups' corner no longer shows board or invite codes. "New codes"
     and "Join with an invite code" are gone, and printed sign-in cards show
     only the picture, name and sign-in name.
   - Grown-ups just create and manage children. To look after a child who
     already has an account, a grown-up uses **Add a child who has an
     account** with the child's sign-in name and password.
   - A grown-up who wants a group's pictures on a shared device taps **Show
     their pictures on this device** on that group (it toggles off again).
     The pictures then appear as tiles in the dialog, and each child still
     types their password. No code is shown at any point.
   - That device list holds up to 20 groups, and drops a group whose code has
     changed in the database.
   - The database still has the code columns and the join and new-code
     functions from the accounts build. The game no longer uses them, so
     nothing needed a migration (open question 6).
5. **Picker: just the three picks (owner review).** There is no separate
   "Play Ribbon Road" button: the Letter Post, Moonboat and Ribbon Road cards
   are the whole choice, and Ribbon Road is the highlighted, focused default.
   The home-flow test checks that nothing else on the picker offers to start
   a game.
6. **Play without saving keeps nothing, not even a color choice.** Inside a
   world, a theme picked in this mode lasts only for that page. Opening a
   world directly, without the home flow, still remembers its color, as
   before, which the existing palette tests rely on.

### Name: Letters with Lucy

| Where | Now |
| --- | --- |
| Page titles | `Letters with Lucy` (chooser); `Lucy’s Letter Post · Letters with Lucy`, likewise Moonboat and Ribbon Road; `Grown-ups' corner · Letters with Lucy` |
| Top-left chrome | Chooser: a new brand line. Worlds: the existing brand link. Corner: a new brand over the paper band. All say **Letters with Lucy** with the tagline under it |
| Inside the worlds | Letter Post's footer line reads "THE LETTERS WITH LUCY POST OFFICE" |
| Corner postmark | "LETTERS WITH LUCY" |
| Docs and tests | README, design notes and verify-game docs |

**Tagline.** I kept the game's existing tagline text, "Little sounds. Big
discoveries.". The job writes it as "Little Sounds Big Discovery" (open
question 1).

### Ribbon Road

Changed to Ribbon Road:
- the chooser card (**Lucy’s Ribbon Road**, "Start here");
- the world's title and home (`Lucy’s<br><em>Ribbon Road.</em>`);
- in-world labels ("ALONG THE RIBBON ROAD", "YOUR SOUND RIBBON", "A NEW SOUND
  ON YOUR RIBBON");
- the sticker (**Full ribbon**: "All 26 letters in Ribbon Road.");
- the corner's world switch and progress;
- the folder `v4-silk-thread/` → `v4-ribbon-road/`, and the test
  `silk_smoke.cjs` → `ribbon_smoke.cjs`;
- the service worker's file list (cache version bumped to 2, so installed
  copies refresh).

**Kept on purpose: the internal key `silk`.** Saved data uses it in four
places:
- the `world` of every round in the database (the applied check allows
  `post`, `space` and `silk`);
- the `theme_silk` setting;
- the `all-silk` sticker;
- the per-world theme key a device keeps when a world is opened directly, without the home flow.

Renaming it would need a migration. Rounds still queued on offline devices
with the old code would then be refused, so play would be lost. No person
ever sees the key; `names_check.cjs` and the home-flow test check that.

Other internal identifiers that keep the old spelling, none of them visible:
- `accounts.little-woof.invalid`: the sign-in address of every existing
  account;
- `little-woof-shell-*`: the service-worker cache names;
- `little-woof-<world>-theme`: a device's theme when a world is opened directly. Play without saving keeps no theme at all.

### Framing

- The dialog and the corner never say teacher, parent, student or classroom.
  The home-flow test checks the dialog text for those words and for
  "class", "board" and "code".
- Grown-ups and children stay separate accounts, with the grown-up-only
  permissions from the accounts build. Any grown-up can manage any number of
  children and groups.

## Design tools used (and skipped)

| Tool | Used for |
| --- | --- |
| **superdesign** | Its workflow (layout as ASCII, then theme, then motion, then build) for the splash, sign-in dialog and picker: `accounts/DESIGN.md`. Not its Tailwind/CDN output (the game is offline and vanilla). |
| **design-taste** | The core design read and never-list (no emoji; one accent, which goes only on "Let's play" and the default ring); `playful-color` (chunky ink-outlined buttons, the rotated "Start here" sticker, one per screen); `taste-ux-copy` (the unsaved warning says what, why and what to do: "You're playing without saving. Stars, stickers and settings won't be kept after this visit." plus "Sign in instead"); `taste-accessibility` (native modal dialog, labelled inputs, a `role="status"` warning, focus moved to the default layout, 60px targets). |
| **trickle** | `char-stagger` (slide) for the splash wordmark; `stamp`, as before, for the corner's Saved stamp. |
| **Paper Shaders** | The static mesh gradient (`grown-ups/paper-shader.js`) reused behind the splash. |
| **motion-primitives** | `Dialog` (scale-in for the sign-in), `AnimatedGroup` (staggered picture tiles). |
| **ui-layouts** | `showhide-pass` and the dotted indicator, reused in the new dialog (six dots, one rule). |
| **Hyperiux** | Unchanged `arrow-fill-button` in the corner. No new effect needed. |
| **Better Design** | Read-only, as instructed: the `number-pop-in` timing for the dots. Its MCP review tools were not run (no connection). |
| canvas-ui, cursify | Skipped: the owner ruled them out. |

## How to test

```sh
python3 tests/run_tests.py
node tests/runtime_smoke.cjs && node tests/grown_ups_runtime.cjs && node tests/offline_shell.cjs && node tests/names_check.cjs
npm ci --prefix tests/db && node tests/accounts_db.mjs
export CHROMIUM_EXECUTABLE=/usr/bin/google-chrome
node tests/home_flow.mjs            # new: the home flow and the name
node tests/accounts_flow.mjs && node tests/accounts_two_devices.mjs && node tests/grown_ups_smoke.cjs
node -r ./tests/no-screenshots.cjs tests/ribbon_smoke.cjs   # likewise motion_, confetti_
for i in 0 1 2 3 4 5; do BROWSER_SMOKE_SHARD=$i node -r ./tests/no-screenshots.cjs tests/browser_smoke.cjs; done
# LW_BACKEND=live on the account suites uses the real Supabase project
```

By hand:
1. Serve the repo (`python3 -m http.server 8000`) and open `/`.
2. Watch the splash, then try the dialog. The demo logins from the accounts
   build still work (password `7234ab`): child `ava-wru`, grown-up
   `demo-grownup`.
3. Open `/grown-ups/index.html` for the corner.

## Test results

| Suite | Result |
| --- | --- |
| `home_flow.mjs` (new) | **6/6 local, 6/6 live** |
| `names_check.cjs` (new) | pass: 70 files; every page title ends with "Letters with Lucy" |
| `run_tests.py` (strict) | 6/6 |
| `runtime_smoke.cjs` | 234 rounds, pass (now `v4-ribbon-road`) |
| `grown_ups_runtime.cjs` | 4/4 |
| `offline_shell.cjs` | 2/2 (138 files, cache version 2) |
| `accounts_db.mjs` | 14/14 |
| `accounts_flow.mjs` | **10/10 local, 10/10 live** (rewritten for the dialog, "Show their pictures on this device" and no codes in the corner) |
| `accounts_two_devices.mjs` | **6/6 local, 6/6 live** (signs in through the new dialog) |
| `grown_ups_smoke.cjs` | pass, local: 4 sizes, gate, worlds, reduced motion, dark mode; re-run after the codes came out of the corner |
| `ribbon_smoke.cjs` (was `silk_smoke.cjs`) | 14 checks, pass |
| `confetti_smoke.cjs` | 18 cases, pass |
| `motion_smoke.cjs` | 12 cases, pass |
| `browser_smoke.cjs` | 18 cases, pass, in its six shards |

No screenshots were taken. The browser suites that save them ran under
`tests/no-screenshots.cjs`, and no image files were written. The tests that
changed:
- `ribbon_smoke`, `grown_ups_smoke` and the harness: they now pass through the
  sign-in dialog;
- `accounts_flow`: rewritten as described above;
- paths renamed to `v4-ribbon-road` throughout.

## Open questions for the owner

1. **Tagline wording.** The game says "Little sounds. Big discoveries." and I
   kept it. The job writes "Little Sounds Big Discovery". Should it change to
   exactly that, with that capitalization, no full stops and singular
   "Discovery"?
2. **Old links to Silk Thread.** Bookmarks or installed copies pointing at
   `v4-silk-thread/` now get a "not found" until the new version loads (the
   service worker refreshes on the next online visit). A one-line redirect
   page at the old path would fix that, but would keep a "silk" folder. Want
   one?
3. **The "For grown-ups" footer button** on the chooser is still there,
   alongside the dialog's "Are you a grown-up?" link. Keep both, or only the
   dialog link?
4. **Picture tiles in the sign-in dialog.** They show people who played on
   the device, and groups a grown-up chose to show there. Is that the
   intended child-first sign-in, or should the dialog be name and password
   only?
5. **Splash length.** About 1.4 seconds until the video arrives. Is that
   long enough to see?
6. **Unused code machinery in the database.** Groups still have board and
   invite code columns, and the functions that join by invite or make new
   codes. Nothing in the game uses them now. A small migration could remove
   them; I didn't write one, since the job prefers client-only changes and
   it isn't needed. Want it?
