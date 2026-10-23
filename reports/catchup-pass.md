# Catch-up job: pass report (Claude, `claude/home-flow-ribbon`)

2026-10-23. Built from `CATCHUP-JOB.md` and the go answers in
`reports/catchup-go-answers.md`. Started at `f9da662`. The rollback branch
`rollback/pre-catchup-2026-10-22-claude` was pushed at `f9da662` before the
first commit. It hasn't been touched since, and neither has `main`.

## TL;DR

- **Every item is done in my build:** A, B, C1 to C8, D and E. Two are
  partial:
  - **C4 has one try-again clip, not three.** My lane only has "Not quite!"
    (`lucy-nudge-1.mp3`). The game picks at random from a list, so the other
    two clips can be added later (go answer 1).
  - **D's progress reset is checked locally only.** On the live project, the
    reset step of the live check is skipped (see "Live check").
- **Laptops (A).** Letter Post and Moonboat now fit 1024×576, 1366×768,
  768×1024 and 1920×1080 with no page scroll, in every theme. Letters come a
  page at a time with big ◀ ▶ arrows and a page label. The collection is a
  one-line summary that opens the full album. Phones scroll as before, and
  Ribbon Road's layout is unchanged.
- **Done badges (B and D).** A dark green `#176b3a` badge with a white tick,
  and the caption **Done**, in all three games and every theme. Done letters
  come from the account's saved correct answers in **any** game, so a letter
  finished in Ribbon Road shows done in Letter Post and Moonboat too. Guests
  stay visit-only.
- **Sound (C3, C4, C5, E).**
  - No hints anywhere, and the grown-ups' Help setting is removed.
  - A wrong picture plays only its own word, a short pause, then "Not
    quite!".
  - "Find the picture" opens quietly.
  - The letter page says the letter name and then its sound, also when the
    child comes back with "◀ Listen" (clarification 7).
  - The cheer used to start **6.4 s** after the correct tap. It now starts
    **about 1.1 s** after: Lucy says the tapped word, and the cheer follows
    within 8 to 11 ms of the found-it page appearing.
- **Offline copy (C1).** After a new build is pushed, it shows on the next
  load or after one refresh. Offline play still works. The cache version is
  now `little-woof-shell-5`.
- **No database or backend change.**
- **All suites pass**, including the live check. The live check used only
  two disposable children, both deleted by ID afterwards. Brandy (the
  master) wasn't touched.

## Status per item

| Item | Status | What I did and why |
| --- | --- | --- |
| **A.** Letter Post and Moonboat fit a laptop | **Done** | **Wide screens (700px and up):** the home is one screen with no inner scroller. Letters come in pages sized to the space left: 8 a page at 1024×576 (4 pages), 15 at 1366×768 (2 pages), and 10 at 1024×576 in Moonboat. The ◀ ▶ arrows are at least 64px, and the label reads e.g. "Letters A–H · page 1 of 4". The arrows hide when the practice set fits on one page. Coming back from a letter opens the page that letter is on.<br>**Collection:** a one-line summary ("Your stamps: 18 of 26" / "Your stars: …") opens the full album in a sheet. The sheet closes on Close, Escape, a tap outside or a screen change.<br>**Phones** scroll as before. **Ribbon Road's layout is untouched.**<br>**Check:** `tests/fit_check.mjs` covers 54 cases (3 games × 3 themes × 1024×576, 1366×768, 768×1024, 1920×1080, 1440×900, 390×844). It fails if the page scrolls at laptop and tablet sizes, if any letter, arrow, label, badge or title is cut off or overlapped, or if an arrow is under 64px. |
| **B.** Done marks children can't miss | **Done** | **The badge:** a fixed SVG badge (`#176b3a` fill, white rim, thick white tick) at the top right of each finished card in all three games. Its colours never come from the theme. It's 36px on laptops and tablets, 44px on the whiteboard (1500×900 and up) and 32px on phones, and never covers the letter, the caption or another card (checked by `fit_check`).<br>**The card:** the caption reads **Done**, the card stays bright and tappable, and the accessible name is "Play letter B, done".<br>**The settle:** one 220ms settle the first time the child is back on the home grid, with no sound. It never replays on paging, re-taps, replays or opening the collection, and there's none in calm mode or with reduced motion.<br>**Collections:** stamp album, constellation and sound ribbon use the same badge in place of the slot's star or paw.<br>**Focus:** the keyboard focus outline is separate (theme focus colour, offset). |
| **C1.** No stale offline copy | **Done** | **Network first:** pages, scripts and styles now come from the network first, with the stored copy as the offline fallback after 4 s. They're handed to the page marked `no-cache`, so a host's "keep for 10 minutes" can't hide a new build.<br>**Installing a new build:** install fetches skip the HTTP cache (`cache: 'reload'`). The page registers with `updateViaCache: 'none'` and asks for a new `sw.js` on every load. `skipWaiting` and `clients.claim` let a new copy take over at once.<br>**Version:** bumped `little-woof-shell-4` → `-5`, and older stores are deleted.<br>**Check:** `tests/sw_update.mjs` installs the `f9da662` build's offline copy, then deploys this build. It checks that this build shows after one refresh, that a later build shows on the very next load, and that offline play still works. |
| **C2.** Corner link from the profile picture, grown-ups only | **Done** | A new top-right picture button in all three games (go answer 2).<br>**A grown-up who is playing** gets "Grown-ups' corner", "My account" and "I'm done". The corner opens straight away with no reading gate (go answer 3).<br>**A child's menu** has only "I'm done".<br>The server still refuses a child, and the corner page shows a child the grown-up sign-in. All of this is checked locally and on live. |
| **C3.** "Find the picture" doesn't replay the sound | **Done** | The match step opens silently, and the child taps the letter to hear it. The letter page says the name and then the sound, both when it's opened from a card and when the child comes back with "◀ Listen" (clarification 7, changed this session; go answer 4 had said silent). |
| **C4.** A wrong tap gives nothing away | **Done, with one clip** | A wrong tap plays three things only: the tapped word, a pause (169 to 235ms measured), then one try-again clip picked at random each time from `GAME_AUDIO.feedback.retry`. Today that list has only "Not quite!" (go answer 1).<br>The letter, its sound and the correct word never play, and the feedback reads only "That's ball. Try another picture." The pictures stay live, and any new tap cuts off the word, the pause or the clip.<br>The clip is used byte for byte, with no new audio. |
| **C5.** No hints anywhere | **Done** | **Removed from the game:** the outline, the "Try this picture" tag, the hinted text and the hinted audio.<br>**Removed from the corner:** the "Help when stuck" setting. A stored `hintAfter` value stays in the database untouched, and nothing reads it.<br>**Checks:** `runtime_smoke`, `grown_ups_runtime`, `grown_ups_smoke` and `catchup_flow` fail if any hint path runs, or if a miss plays anything other than the tapped word plus one try-again clip. |
| **C6.** Bigger profile picture | **Done** | The picture is 42px in a 50px round button, lined up with the sound and theme buttons (same height and centre line) in Letter Post and Moonboat. In Ribbon Road it's 50px in 60px, because its header buttons are 60px. Checked in every game and theme. |
| **C7.** Profile menus close properly | **Done** | The picture menu and the collection sheet close on any screen change (opening a letter, "find the picture", Home), on following a link, on a tap outside and on Escape. |
| **C8.** Nothing decorative looks tappable | **Done** | **Removed from the Letter Post home:** the "OPEN FOR WOOFS!" sign, the "SOUND MAIL" round sticker, and the "YOUR LITTLE MISSION: Listen → Find → Deliver" card. Nothing replaces them.<br>**Changed:** Lucy's name tag on that home is plain text, and the lone ↓ arrow is gone. |
| **D.** Done letters from saved progress, shared across all games | **Done** (reset checked locally) | **For a signed-in account:** done = the account's saved correct answers in any of the three games, plus this visit's. Done letters load when the game opens and refresh after every sync, with no animation for loaded letters.<br>**Accounts and guests:** progress is kept per account, with no leaks between accounts. Guests stay visit-only and never touch an account.<br>**Wording:** "this visit" wording (visible and screen-reader) now appears only for guests. Signed-in players see "yours to keep".<br>**Collections:** each game's collection shows letters done in any game, and per-game stickers stay per game (go answer 6).<br>**Reset:** clears the badges in all three games on the next sync. This is checked on the local backend. |
| **E.** The celebrate sound comes right away | **Done** | **The cause, measured:** the cheer clip was only created after the found-it page's 4,400ms stamp ("world awakens") animation and a 380ms Lucy nod had both finished. That's the 4.82 s silent gap below, the same in every layout and size.<br>**The fix:** the cheer starts the moment the found-it page shows, with the animations running alongside it. The answer clips are loaded when the game opens; they're in the offline store, so this works offline and on a first visit.<br>"Hear apple again" still works, and C3 to C5 are unchanged. |

### E: measured delays (`tests/celebrate_timing.mjs`)

The test uses the page's own clock: the correct tap, the found-it page
appearing, and the cheer clip's `playing` event. The "before" run is the same
test against `f9da662`.

"First" is a brand-new browser. "Repeat" is the same browser loading the game
a second time, with the offline copy in place.

| Game | Size | Before: tap → cheer | Before: page → cheer | After: tap → cheer | After: page → cheer |
| --- | --- | --- | --- | --- | --- |
| Letter Post | 1024×576 | 6418 / 6401 ms | 4820 / 4821 ms | 1107 / 1125 ms | 8 / 10 ms |
| Letter Post | 768×1024 | 6400 / 6402 ms | 4820 / 4820 ms | 1125 / 1124 ms | 9 / 8 ms |
| Letter Post | 1920×1080 | 6418 / 6404 ms | 4819 / 4822 ms | 1126 / 1109 ms | 9 / 8 ms |
| Moonboat | 1024×576 | 6403 / 6418 ms | 4812 / 4829 ms | 1114 / 1129 ms | 8 / 8 ms |
| Moonboat | 768×1024 | 6404 / 6403 ms | 4816 / 4817 ms | 1128 / 1112 ms | 9 / 10 ms |
| Moonboat | 1920×1080 | 6403 / 6403 ms | 4817 / 4818 ms | 1113 / 1128 ms | 11 / 9 ms |
| Ribbon Road | 1024×576 | 6404 / 6404 ms | 4820 / 4821 ms | 1107 / 1125 ms | 8 / 9 ms |
| Ribbon Road | 768×1024 | 6422 / 6401 ms | 4820 / 4820 ms | 1122 / 1122 ms | 8 / 8 ms |
| Ribbon Road | 1920×1080 | 6404 / 6403 ms | 4821 / 4820 ms | 1106 / 1124 ms | 8 / 9 ms |

Each cell shows first visit / repeat visit.

After the fix, the remaining ~1.1 s is Lucy saying the tapped word ("apple",
about 1 s). The tap → found-it page time dropped from about 1,590ms to about
1,110ms, because the card's bounce now plays alongside the word, not after it.

## Commits

On `claude/home-flow-ribbon`, after `f9da662`:

- `4b911c1` Catch-up: paged laptop homes, done badges from saved progress, no
  hints, quiet misses, cheer at once
- `e289516` Catch-up: offline copy takes over within one refresh, tests for
  every item
- `e02af11` Catch-up: ◀ Listen says the letter again, badges sit inside
  collection slots
- this report and the screenshots (the next commit)

## Screenshots

All are in `reports/catchup-shots/`. "Before" is `f9da662` and "after" is
this build. The homes were taken with `fit_check`'s signed-in fixture: done
letters A–G saved in Letter Post, H–L in Moonboat and M–R in Ribbon Road.
That's why every game shows A–R done. The "before" build shows none of them,
because it only counted letters done in this visit (the item D bug).

- **Homes, before and after.** `before/` and `after/`, named
  `<game>-<width>x<height>-theme<n>.jpg`: all three games × every theme ×
  1024×576, 1366×768, 768×1024, 1920×1080, 1440×900 and 390×844. That's 54
  before and 54 after.
- **Collections, after.** `after/collection-<game>-1366x768-theme<n>.jpg`, all
  three games and every theme, showing the matching done mark.
- **Flows, after.** `after/miss-moonboat-1366.jpg` (a wrong picture: no hint),
  `found-it-moonboat-1366.jpg`, `home-after-new-d-moonboat-1366.jpg`,
  `menu-child-moonboat-1366.jpg` and `menu-grownup-letter-post-1366.jpg`.

## Test results

All suites pass on the committed code (local backend unless noted).

| Suite | Result |
| --- | --- |
| `python3 tests/run_tests.py` | 6/6 checks passed (strict) |
| `runtime_smoke.cjs` | 234 rounds, 3 games × 3 themes, all pass |
| `grown_ups_runtime.cjs` | pass, including "no hints whatever is stored" |
| `offline_shell.cjs` | pass |
| `accounts_db.mjs` | 19 database checks passed |
| `names_check.cjs` | pass, 83 files |
| `browser_smoke.cjs` (6 shards) | 18 browser cases pass (390, 768, 1440 × 3 themes × 2 games) |
| `motion_smoke.cjs` | 12 motion cases pass |
| `ribbon_smoke.cjs` | pass |
| `confetti_smoke.cjs` | 18 confetti cases pass |
| `grown_ups_smoke.cjs` | pass |
| `accounts_flow.mjs` | 13 checks passed |
| `accounts_two_devices.mjs` | 6 checks passed |
| `home_flow.mjs` | 6 checks passed |
| `risky_actions.mjs` | 6 checks passed |
| `fit_check.mjs` | 54 cases pass (A and B, including 1024×576) |
| `catchup_flow.mjs` | 12 checks passed (local); 11 passed + reset skipped (live) |
| `celebrate_timing.mjs` | 18 runs pass (cheer ≤ 1,500ms after the tap, ≤ 250ms after the page) |
| `sw_update.mjs` | 4 checks pass (old copy → this build in one refresh → later build on the next load → offline) |

Sizes checked: 1024×576, 1366×768, 768×1024 and 1920×1080 for items A and B,
plus 390, 768 and 1440 (`browser_smoke`) and 1440×900 and 390×844
(`fit_check`).

### Live check

`LW_BACKEND=live node tests/catchup_flow.mjs` ran against
`eyqxkxnhzzemafnwmzbf`. It signed in as `demo-grownup` (go answer 5) and
created two disposable children:

- `catchupann-t9c`, id `bac7264f-a211-4890-8b4f-89cd35d9344e`
- `catchupbom-3qe`, id `5ad5689f-bbad-42e7-838e-373831cb61ff`

It played as them and checked C2 to C7, B and D across the three games. Both
children were then deleted by those exact IDs (HTTP 200 each). 11 checks
passed.

The reset step is **skipped on live**. The test is written to skip it,
because an earlier session in this job found that the live project doesn't
have `lw_reset_children_progress` (the risky-actions migration isn't
applied). I didn't re-test that claim by calling the function, because a
call would be a write. A schema-lookup probe that runs nothing can't tell
"missing" from "present" (the existing `lw_portal` answers the same way). The
reset is fully checked on the local backend.

## The master account (Brandy): read-only checks

I signed in as `demo-grownup`, never the master, and read `lw_portal`. It's
a `stable` function that only reads. I did this before and after all live
work this session:

| When | Status | Grown-ups seen | Children seen | Profiles named Brandy |
| --- | --- | --- | --- | --- |
| Before (2026-10-23 12:09 UTC) | 200 | 2 | 5 | none |
| After (2026-10-23 12:38 UTC) | 200 | 2 | 5 | none |

The same counts before and after show that the two disposable children were
removed and nothing else changed.

**No Brandy profile is visible.** That matches the risky-actions report: this
project has no master account that `demo-grownup` can see. I never signed in
as, changed, reset or deleted any master. I didn't restore anything, and
didn't undo any of your deletions.

## Test logins

- **Live:** `demo-grownup` / `7234ab` (pre-existing; used, not changed). The
  two disposable children above are already deleted.
- **Local:** each run makes its own grown-up `grownup-<random>` /
  `lucy-1234` with children Mia and Leo, in the throwaway local database.
- **The screenshots** use an on-device fixture child ("Fit"), with no
  network and no account.

## Database or backend change

**None.**

- **D:** works from the progress the sync already returns.
- **C5:** leaves the stored `hintAfter` value alone.
- **C2:** relies on the existing role checks.

No migrations were added or edited.

## Notes for Bradley

1. **Try-again clips.** Only "Not quite!" exists in my lane. To add the
   other two approved clips, put them next to `lucy-nudge-1.mp3` in
   `v1-letter-post/assets/` and `v3-moonboat/assets/`, list them in
   `voice-manifest.json`, and add them to `GAME_AUDIO.feedback.retry` in
   `audio-map.js`. The picker is already random each time.
2. **Live reset.** If you want the reset to work on live, the risky-actions
   migration `20261021010000_risky_actions.sql` needs applying. That's the
   held risky-actions job, so I didn't touch it.
3. **Ribbon Road sound ribbon, outside item A.** At 1366×768 the word
   "jellyfish" in the sound ribbon runs into "kite" next to it. It does this
   with or without this job's badge change, so it comes from Ribbon Road's
   own layout. I left it alone, because Ribbon Road's layout isn't in this
   job. Say if you want it fixed.
4. **Preview links.** raw.githack caches files for a few minutes, so a push
   can take that long to show on the links below, whatever the offline copy
   does.

## Links (always the latest on `claude/home-flow-ribbon`)

- Game home (layout picker): https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/index.html
- Ribbon Road: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/v4-ribbon-road/index.html
- Letter Post: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/v1-letter-post/index.html
- Moonboat: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/v3-moonboat/index.html
- Grown-ups' corner: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/grown-ups/index.html
- Grown-ups' corner, My account: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/grown-ups/index.html?show=you
