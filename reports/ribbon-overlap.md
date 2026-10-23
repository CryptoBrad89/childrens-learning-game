# Ribbon Road sound-ribbon overlap fix (Claude, `claude/home-flow-ribbon`)

2026-10-23. Built from `8816691`, as agreed in
`reports/ribbon-overlap-repeat-back.md` and your go answers. Rollback branch:
`rollback/pre-ribbon-overlap-2026-10-23-claude` (at `8816691`).

## What was wrong

Each ribbon slot is meant to show its word in small type. Last pass added the
green done tick as the last item in each slot. The shared style that sizes the
word only matched "the last item in the slot", so once a slot had a tick, the
word lost that style. It came out at 18px, the same size as the capital
letter, inside a 54px slot. Long words ran past their slot and into the next
one:

- "umbrella" overlapped "van" by about 5px.
- "jellyfish" ran right up against "kite".
- "octopus" also ran outside its slot.
- On phones, more words spilled out ("insect", "rabbit" too).

## What I changed

All in `v4-ribbon-road/style.css`, scoped to Ribbon Road (`.silk`). The shared
Letter Post files are untouched.

- **Wider slots.** Each slot is a fixed 84px wide, with 8px between slots.
  On phones it's 70px wide with 6px between. The slots are now even circles
  instead of uneven ovals.
- **Words.** Each word is one line, never wrapped, at 16px (14px on phones).
  That's a little smaller than the accidental 18px, and much bigger than the
  9px the old style was meant to give.
- **Capital letters.** Same size as before: 18px, and 16px on phones.
- **Done ticks.** Unchanged. They still sit above the letter, and the wider
  slot doesn't move them onto any word.

The strip already scrolled sideways, so it now shows fewer letters at once.
At 1366×768 that's about 13½ instead of about 22. On a phone it's about 4½
instead of about 7. Nothing else on Ribbon Road changed: not the trail, the
play screens, the sounds or the flow. Letter Post and Moonboat are untouched.

## Checks

**New check, added to `tests/fit_check.mjs`.** It sets up a made-up child,
stored only in the test browser, with all 26 letters done. It checks Ribbon
Road's sound ribbon:

- on the home page,
- and on the found-it page, after a real jellyfish round,
- at 1024×576, 1366×768, 768×1024, 1920×1080, 1440×900 and 390×844,
- in all 3 themes.

It fails if any word:

- wraps onto two lines,
- spills out of its slot,
- is under 12px,
- has its done tick covering it,
- or comes within 4px of another word.

I ran it against the old style and it fails as it should at 1366×768 and
390×844. It reported "jellyfish" touching "kite", "umbrella" overlapping
"van", and words spilling out of their slots. With the fix, all 18 ribbon
cases pass (36 page checks). The README's test notes describe the new check.

**The phone pop-up.** Ribbon Road has no pop-up for its ribbon. My
repeat-back was wrong about that: only Letter Post and Moonboat have the
collection sheet, and only on screens 700px and wider. On a 390×844 phone,
Ribbon Road's ribbon sits in place on the home and found-it pages. The new
check covers both.

**The tick and the capital letter.** The tick's box and the capital letter's
text box overlap by about 2px. That 2px is empty space above the letter, so
nothing shows in the screenshots, and it was the same before this change. The
check therefore compares each tick with its word, which is what your answer 5
was about.

**Every existing suite** (local backend, no live accounts used):

| Suite | Result |
| --- | --- |
| `python3 tests/run_tests.py` | 6/6 checks passed (strict) |
| `runtime_smoke.cjs` | 234 rounds, 3 games × 3 themes, all pass |
| `grown_ups_runtime.cjs` | pass, including "no hints whatever is stored" |
| `offline_shell.cjs` | pass, 138 files |
| `names_check.cjs` | pass, 84 files |
| `accounts_db.mjs` | 19 database checks passed |
| `browser_smoke.cjs` (6 shards) | 18 browser cases pass (see note) |
| `motion_smoke.cjs` | 12 motion cases pass |
| `ribbon_smoke.cjs` | pass |
| `confetti_smoke.cjs` | 18 confetti cases pass |
| `grown_ups_smoke.cjs` | pass |
| `accounts_flow.mjs` | 13 checks passed |
| `accounts_two_devices.mjs` | 6 checks passed (see note) |
| `home_flow.mjs` | 6 checks passed |
| `risky_actions.mjs` | 6 checks passed |
| `fit_check.mjs` | 72 cases pass: the earlier 54, plus 18 sound-ribbon cases |
| `catchup_flow.mjs` | 12 checks passed |
| `celebrate_timing.mjs` | 18 runs pass (cheer within 1,500ms of the tap) |
| `sw_update.mjs` | all checks pass |

**Note: three runs timed out, then passed.** In the first full run, three
runs stopped on a 30–60 second wait:

- `browser_smoke` shard 1 (Letter Post at 768px),
- `browser_smoke` shard 4 (Moonboat at 768px),
- `accounts_two_devices`.

Re-run on their own, shard 1 and `accounts_two_devices` passed first time.
Shard 4 timed out once more, at a different step. It then passed three times
in a row on this build. I also ran shard 4 twice on the untouched starting
commit and it passed both times.

These suites only load Letter Post, Moonboat and the accounts pages. None of
those files differ from the starting commit, so I read these as slow runs,
not something this change caused. Once, a `fit_check` page load also timed
out on Moonboat, and the next full run passed all 72 cases.

## Screenshots

`reports/ribbon-overlap-shots/` has the ribbon at 1366×768 in Pink, Purple
and Yellow, before and after. For each theme there are three shots: the start
of the strip and the end of the strip on the home page, and the found-it page
after a jellyfish round. The files are named
`before-…` and `after-…`.

## Rules

- **Brandy.** I didn't touch the Brandy master account and didn't sign in as
  it.
- **Accounts.** I deleted or restored no accounts and undid none of your
  changes. The only test people were made-up ones in the test browser or the
  throwaway local database.
- **Database.** No database or backend changes, and no migrations.
- **Sounds and hints.** Sound rules are unchanged. There are no hints.
- **Other jobs.** CALL-LIST, PORTAL-RETHINK and RISKY-ACTIONS weren't touched.
  I only ran `risky_actions.mjs` as one of the existing suites.

## Note for Bradley: the same bug in Letter Post and Moonboat (not fixed)

Letter Post and Moonboat share the same collection style, so they have the
same bug: a done tick stops the word style from matching. I measured them
read-only, with all 26 letters done:

- **On a 390×844 phone** (strip in place on the home), both games have the
  same clashes Ribbon Road had:
  - "jellyfish" overlaps "kite" by 5px.
  - "octopus" overlaps "pig" by 3px.
  - "umbrella" overlaps "van" by 14px.
  - Five words spill out of their slots.
- **On a 1366×768 laptop** (the collection pop-up):
  - Moonboat is clear.
  - In Letter Post, "umbrella" sticks out of its slot but doesn't reach its
    neighbour.

Their existing checks don't look at the collection words, so they still pass.
I changed nothing in either game, because the job says not to touch them. If
you want them fixed, it's the same kind of small change, made in each game's
own style file. Say the word.
