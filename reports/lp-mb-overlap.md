# Letter Post + Moonboat word-overlap fix (Claude, `claude/home-flow-ribbon`)

2026-10-23. Built from `9768782`, as agreed in
`reports/lp-mb-overlap-repeat-back.md` and your go answers. Rollback branch:
`rollback/pre-lp-mb-overlap-2026-10-23-claude` (at `9768782`).

## What was wrong

It's the same bug Ribbon Road had. In the collection, the done tick is the
last item in each slot. The shared style that makes the word small only
matches "the last item in the slot", so once a slot has a tick, the word
loses that style. It comes out at 18px, the same size as the capital letter.

What the new check found on the old code, with all 26 letters done:

- **Phone, 390×844 (strip on the home page), both games:**
  - "umbrella" overlaps "van" by 14px.
  - "jellyfish" overlaps "kite" by 5px.
  - "octopus" overlaps "pig" by 3px.
  - "insect" is less than 4px from "jellyfish".
  - "insect", "jellyfish", "octopus", "rabbit" and "umbrella" spill out of
    their slots.
- **The pop-up, at every laptop and tablet size:**
  - In Letter Post, "umbrella" spills out of its slot.
  - In Moonboat, "umbrella" spills out only at 768×1024.
- **The found-it page, at every size, both games:**
  - "jellyfish", "octopus" and "umbrella" spill out of their slots.
  - In Letter Post, "umbrella" touches "van".
  - In Moonboat, "umbrella" overlaps "van" by 5px, and "jellyfish" is less
    than 4px from "kite".

## What I changed

Three lines in each game's own style file: `v1-letter-post/style.css` and
`v3-moonboat/style.css`. The shared `fun.css` and `app.js` files are
untouched, so Ribbon Road can't change.

- **Words.** Each word stays on one line, never wrapped. It's 16px, or 14px
  on phones (700px wide and under, including 320px). That's a little smaller
  than the accidental 18px, and much bigger than the 9px the old style was
  meant to give.
- **Strip slots.** On the home strip and the found-it page, each slot is a
  fixed 84px wide, or 70px on phones. Each game keeps its own gaps: 10px
  between stamps in Letter Post, and 4px between stars in Moonboat.
- **The pop-up.** Its slots don't change. They were already wide enough for
  16px words. All 26 still show at once with no scrolling at every laptop
  and tablet size: 3 rows, or 4 at 768×1024. So I didn't need the
  scroll-inside-the-pop-up fallback from your answer 3.
- **Capital letters and ticks.** Capital letters stay at 18px, or 16px on
  phones. The done ticks look the same and stay above the letter, and no
  tick sits on a word.
- **Empty slots.** Only filled slots change. A slot with no letter done yet
  still shows its small "·".

The strips already scrolled sideways, so they now show fewer letters at
once:

- the found-it strip at 1366×768: about 9–10 instead of about 14–15,
- the home strip on a 390px phone: about 4–4½ instead of about 6.

Nothing else changed. That includes laptop paging, the play screens,
sounds, flow and the layout system.

## Checks

**New check, in `tests/fit_check.mjs`.** The Ribbon Road word check now
also covers Letter Post and Moonboat. It uses a made-up child, stored only
in the test browser, with all 26 letters done. For each of the three games,
at 1024×576, 1366×768, 768×1024, 1920×1080, 1440×900 and 390×844, in all 3
themes, it checks:

- the home page:
  - at 390×844, the strip in place on the page,
  - at the five wider sizes in Letter Post and Moonboat, the pop-up,
    opened from the home,
- the found-it page, after a real round.

It fails if any word:

- wraps onto two lines,
- spills out of its slot,
- is under 12px,
- has its done tick covering it,
- or is less than 4px from another word.

In the pop-up it also fails if the pop-up scrolls inside, or if any of the
26 slots can't be seen.

Ribbon Road's part checks the same things as before (home and found-it page,
jellyfish round).

**Old code against new code.**

- On the old code it fails 36 of 108 cases: every Letter Post and Moonboat
  word case, with the problems listed above. All 72 earlier cases still pass.
- On the new code, all 108 cases pass. That's the earlier 54 page cases,
  plus 18 word cases for each of the three games.

The README's test notes describe the new check.

**Every existing suite** (local backend, no live accounts used):

| Suite | Result |
| --- | --- |
| `python3 tests/run_tests.py` | 6/6 checks passed (strict) |
| `runtime_smoke.cjs` | 234 rounds, 3 games × 3 themes, all pass |
| `grown_ups_runtime.cjs` | pass, including "no hints whatever is stored" |
| `offline_shell.cjs` | pass, 138 files |
| `names_check.cjs` | pass |
| `accounts_db.mjs` | 19 database checks passed |
| `browser_smoke.cjs` (6 shards) | 18 browser cases pass (see note on shard 2) |
| `motion_smoke.cjs` | 12 motion cases pass |
| `ribbon_smoke.cjs` | pass |
| `confetti_smoke.cjs` | 18 confetti cases pass |
| `grown_ups_smoke.cjs` | pass |
| `accounts_flow.mjs` | 13 checks passed |
| `accounts_two_devices.mjs` | 6 checks passed |
| `home_flow.mjs` | 6 checks passed |
| `risky_actions.mjs` | 6 checks passed |
| `fit_check.mjs` | 108 cases pass |
| `catchup_flow.mjs` | 12 checks passed |
| `celebrate_timing.mjs` | 18 runs pass (cheer within 1,500ms of the tap) |
| `sw_update.mjs` | all checks pass |

**Note: `browser_smoke` shard 2 timed out, on the old code too.** Shard 2
is Letter Post at 1440px. In the full run, it stopped on a 30-second wait.
The one rerun you allowed stopped the same way. Because it failed twice, I
didn't just call it slow. I checked whether my change caused it:

- **What it waits for.** Each time, it was waiting for Lucy to stop talking,
  for her "nod" animation to end, or for the next screen. None of those use
  the collection styles.
- **Old against new.** I ran the shard over and over, switching between the
  starting styles and the new ones:
  - starting styles (`9768782`): passed 3 of 7 runs,
  - new styles: passed 9 of 12 runs.
- **Every failure** was the same kind of 30-second wait. None was a layout
  or word problem.

So the shard is flaky on the starting code as well, and this change didn't
cause it. The last report saw the same kind of timeouts in other shards.

One more thing: my first full run was cut off after shard 1. That was the
time limit I gave the runner, not a test failure. I restarted from shard 2,
and every suite after that ran to the end.

## Screenshots

`reports/lp-mb-overlap-shots/` has before and after shots for each game in
all 3 themes:

- the pop-up at 1366×768,
- the home strip on a 390×844 phone,
- the found-it page strip at 1366×768.

There is also one shot of each game's home strip at 320×640 (answer 4). The
words there are 14px and fit, with about 3½ letters showing (about 5 before). 320px isn't in
the test.

Files are named `before-…` and `after-…`, with the game, the place, the size
and the theme: Air mail, Candy post or Dark for Letter Post, and Dark,
Cloud day or Plum dusk for Moonboat.

## Rules

- **Brandy.** I didn't touch the Brandy master account and didn't sign in as
  it.
- **Accounts.** I deleted or restored no accounts and undid none of your
  changes. The only test people were made-up ones in the test browser or the
  throwaway local database.
- **Database.** No database or backend changes, and no migrations.
- **Sounds and hints.** Sound rules are unchanged. There are no hints.
- **Other jobs.** Ribbon Road and the CALL-LIST, PORTAL-RETHINK and
  RISKY-ACTIONS jobs weren't touched. I only ran `risky_actions.mjs` as one
  of the existing suites.

## Note for Bradley: the pop-up's Close button can't be tapped (not fixed)

I found this while writing the check. It's in both games, at every laptop
and tablet size, and it was already there before this job.

The collection panel inside the pop-up sits on top of the Close button. A tap
or click on Close lands on the panel instead, so nothing happens. The pop-up
does still close:

- with a tap anywhere outside it,
- or with the Escape key.

So nobody gets stuck. But a child or grown-up tapping "Close" will see
nothing happen.

The existing tests close the pop-up with Escape or a tap outside, which is
why they never caught it. My check uses Escape as well.

It's a one-line fix in the shared `fun.css`: lift the Close button above the
panel. I left it alone because it's outside this job, and that file is shared
with Ribbon Road. Say the word and I'll fix it and add a check that taps
Close.
