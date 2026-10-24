# Pop-up Close button fix (Claude, `claude/home-flow-ribbon`)

2026-10-23. Started at `1580662`. Rollback branch:
`rollback/pre-close-button-2026-10-23-claude` (also at `1580662`).

## In short

The Close button in the collection pop-up now works. In Letter Post and
Moonboat, a click or tap on Close shuts the pop-up at every size and in all 3
themes. Focus then goes back to the collection button. Tapping outside and
Escape still close it too. The pop-up looks the same as before.

## What was wrong

Close floats at the top right of the pop-up. The collection panel under it is
"positioned", and browsers draw positioned things on top of things that aren't.
So the panel was drawn over Close and caught every tap, even though Close was
still visible. I confirmed this in the browser before changing anything: the
element under the middle of Close was the collection panel, not the button.

## The fix

One line, added to both `v1-letter-post/fun.css` and `v3-moonboat/fun.css`
(the two files are still identical):

```css
.collection-sheet .sheet-close{position:relative;z-index:1}
```

This puts Close above the panel. It doesn't move it. Nothing else changed:
no `app.js`, no game `style.css`, no `sw.js`, no sounds, flow, paging or
layout.

## Ribbon Road: no pop-up, so nothing to fix

My repeat-back guessed Ribbon Road had the same pop-up. It doesn't. Ribbon
Road shows its collection right on the home at every size, so it has no
collection button, no pop-up and no Close. The new line only affects Close
inside a pop-up, so it changes nothing there.

- Ribbon Road home before and after, 5 sizes × 3 themes: 14 of 15 shots are
  identical pixel for pixel. The 15th differs in one 4×18px spot that also
  changes between two runs of the same code, so it's normal run-to-run noise.

Because of this, the test has **30 Close runs**, not the 45 in my
repeat-back: 2 games × 5 sizes × 3 themes. It also has 15 Ribbon Road checks
that it still has no pop-up. If Ribbon Road ever gets one, the test will
fail and say to add it.

## The new test: `tests/close_button.mjs`

It opens the pop-up in each game, size and theme, then:

1. checks that the middle of Close and four other points on it are the
   button itself, with nothing on top;
2. clicks the middle of Close with a real mouse click (not forced, not
   Escape, not a tap outside) and checks that the pop-up shuts within a
   second;
3. checks that focus is back on the collection button and that the button
   says the pop-up is closed;
4. checks that Escape and a tap outside still close it;
5. at 768×1024, opens it again in a touch-screen browser and closes it with
   a real touch tap on Close.

It uses a made-up child stored only in the test browser. No accounts and no
network.

| Code | Result |
| --- | --- |
| Old (`1580662`) | **Fails** 30 of 30 pop-up runs: "Close is covered by the collection" and "clicking Close didn't close the pop-up". At 768×1024 the touch tap failed too. The 15 Ribbon Road checks passed. |
| New | **Passes** all 45 (30 pop-up runs, 15 Ribbon Road checks). |

One thing I noticed: after a tap outside, focus stays where the tap landed,
not on the collection button. That's how pages normally behave, it was the
same before, and I didn't change it. The test only requires focus to go back
after Close and Escape.

The README's test notes describe the new test.

## Does the pop-up look the same?

Yes. I compared all 30 pop-ups (2 games × 5 sizes × 3 themes) before and
after:

- **Layout and colour:** every element in the pop-up is in the same place,
  at the same size, with the same colours, in all 30.
- **Pixels:** the screenshots differ only in faint smoothing at a few edges:
  Close's outline, the small stars and one slot border. At most 733 pixels
  change in any one shot (under 0.1% of a 1366×768 screen). The biggest
  change to any pixel is 49 out of 255 colour steps, on an edge. I tried other one-line fixes, including
  pushing the panel down instead of lifting Close. They all gave the same
  faint edge change, so it's how the browser smooths edges when the drawing
  order changes. You can't see it.

Before and after shots at 1366×768, cropped to the pop-up, for each theme
(Air mail, Candy post and Dark for Letter Post; Dark, Cloud day and Plum
dusk for Moonboat), are in `reports/close-button-shots/`.

## Every existing suite

Local backend, no live accounts. Browser suites ran with no screenshots
written. **Everything passed on the first run, and nothing needed a rerun.**
That includes the Letter Post 1440px `browser_smoke` shard (shard 2) that
was flaky last time.

| Suite | Result |
| --- | --- |
| `python3 tests/run_tests.py` | 6/6 checks passed (strict) |
| `runtime_smoke.cjs` | pass, all 3 games |
| `grown_ups_runtime.cjs` | pass, including "no hints whatever is stored" |
| `offline_shell.cjs` | pass |
| `names_check.cjs` | pass |
| `accounts_db.mjs` | 19 database checks passed |
| `browser_smoke.cjs` (6 shards) | 18 browser cases pass |
| `motion_smoke.cjs` | 12 motion cases pass |
| `ribbon_smoke.cjs` | pass |
| `confetti_smoke.cjs` | 18 confetti cases pass |
| `grown_ups_smoke.cjs` | pass |
| `accounts_flow.mjs` | 13 checks passed |
| `accounts_two_devices.mjs` | 6 checks passed |
| `home_flow.mjs` | 6 checks passed |
| `risky_actions.mjs` | 6 checks passed |
| `fit_check.mjs` | 108 cases pass (word layout unchanged) |
| `catchup_flow.mjs` | 12 checks passed |
| `celebrate_timing.mjs` | 18 runs pass |
| `sw_update.mjs` | pass |
| `close_button.mjs` (new) | 45 cases pass |

I edited the README after the quick suites had already run, so I reran
`run_tests.py`, `names_check.cjs` and `offline_shell.cjs` afterwards. All
still pass.

## Rules

- **Brandy.** I didn't touch the Brandy master account and didn't sign in
  as it.
- **Accounts.** I deleted or restored no accounts and undid none of your
  changes. The only test people were made up, in the test browser or the
  throwaway local database.
- **Database.** No database or backend changes.
- **Sounds and hints.** Sound rules are unchanged. There are no hints.
- **Other jobs.** I didn't touch the CALL-LIST, PORTAL-RETHINK or
  RISKY-ACTIONS jobs. I only ran `risky_actions.mjs` as one of the existing
  suites.
- **Commit.** Only this job's files: the two `fun.css` files, the new test,
  the README note, this report and its screenshots.
