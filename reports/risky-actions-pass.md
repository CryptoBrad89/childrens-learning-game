# Risky actions add-on: build report (Claude, `claude/home-flow-ribbon`)

2026-10-21. Built from `RISKY-ACTIONS-JOB.md` and Bradley's answers to the
repeat-back. The call-list job is untouched and still waits for its own go.

## TL;DR

- **Built and pushed** on `claude/home-flow-ribbon`. All new and updated
  tests pass on the local stand-in (Postgres in PGlite). `ribbon_smoke`
  fails, but it fails the same way on the untouched start commit (see Test
  results). No layout-system file changed.
- **Password-only confirms.** Every risky action asks for one thing: the
  grown-up's own password. That covers:
  - deleting children;
  - taking children off the list;
  - removing grown-ups;
  - resetting children's progress;
  - giving children a new password;
  - adding a grown-up;
  - changing a child's name.

  The dialog shows what will happen and the accounts affected, then the
  password box, then the button. Nothing else has to be typed or ticked.
- **Checked in the database.** Each risky database function checks the
  password itself before changing anything. The old versions without a
  password are **dropped**, so calling the API directly can't skip the check.
- **No caps.** Select mode for Children and Grown-ups, with Select all. A
  selection of any size goes to the server in chunks the grown-up never sees.
  If the connection drops part way, the dialog keeps only the accounts still
  to do, with a **Try again** button. The 2000-per-call cap on settings is
  gone.
- **⚠ Not live yet. You need to do two things in the Supabase dashboard for
  `eyqxkxnhzzemafnwmzbf`.** I have only the project's public key, with no
  admin key, database password or dashboard access, so I couldn't do either:
  1. **Apply the migration.** In the SQL editor, run
     `supabase/migrations/20261021010000_risky_actions.sql`.
     - **Until you do, the pushed corner can't** delete, remove, reset, give
       new passwords, add a grown-up, or save **Name & picture** (even a
       picture-only change). It says "The game's database needs its latest
       update before this works."
     - Signing in, playing, settings and adding children keep working.
  2. **Close the password gap.** Turn on **Authentication → Sign In /
     Providers → Email → "Require current password when updating"** (details
     below).

## What Bradley's answers became

| Answer | What I built |
| --- | --- |
| 1. Adding a grown-up and username changes need the password; resetting settings doesn't | **Add a grown-up** asks for your password. **Changing a child's name** asks for it too. The box only appears once the name is edited; a new picture alone doesn't ask. My build has **no way to change a sign-in name** (the `mia-w7m` kind) for children or grown-ups, so there was nothing else to gate. I didn't add one. "Reset these settings" is unchanged. |
| 2. Grown-ups reset kids' progress, one or in bulk; the master any kid, others their own linked kids | **Reset progress** on each child's card, and in the select bar for any number. Every grown-up can reset the children they look after, and the server skips any others. **My project has no master account** (no Brandy, no master role; see Questions), so there is no "any kid" rule. I didn't create a master. |
| 3. Close the gap if possible without breaking sign-in; the Auth setting may be changed | I looked into it: Supabase has the exact toggle. It's safe for us, because the game never changes passwords through Supabase Auth's own endpoint; it uses database functions. I **couldn't flip it myself** (no dashboard or management access). Steps are below and in `supabase/README.md`. |
| 4. Keep the 500-per-upload sync and the 20-list device memory | Both kept, unchanged. |
| 5. Add multi-select | Built: **Select** on Children and Grown-ups. |
| 6. Build only this add-on | Done. Nothing from the call list was built. |

## The password check, in the database

- **`lw_private.password_problem(me, password)`** compares the password with
  the signed-in grown-up's own `auth.users` bcrypt hash, using the existing
  `password_matches`. It runs first in every risky function.
  - On a wrong password the function returns
    `{ok: false, error: 'wrong_password'}` and changes nothing.
  - It returns instead of raising an error, so the wrong try stays counted.
- **Wrong tries are slowed down.** After 10 wrong passwords in 15 minutes,
  that grown-up's risky actions answer `password_pause` ("Wait 15 minutes"),
  even with the right password. Only wrong passwords count, so a big chunked
  bulk run never trips it. Other grown-ups aren't affected.
- **The old versions without a password are dropped:** `lw_delete_child`,
  `lw_remove_child`, `lw_remove_grownup`, `lw_set_child_password`, the
  3-argument `lw_create_grownup`, and the 4-argument `lw_edit_child`.
  - Also dropped: `lw_create_child`, which held the old 80-member cap, and
    `lw_update_child`, which renamed children with no password. Both were
    already closed.
- **The new functions** (signed-in grown-ups only, nothing open to `anon`):
  - `lw_delete_children(ids, p_my_password)`;
  - `lw_remove_children(ids, p_my_password)`;
  - `lw_remove_grownups(ids, p_my_password)`;
  - `lw_reset_children_progress(ids, p_my_password)`;
  - `lw_set_children_password(ids, p_new, p_my_password)`;
  - `lw_create_grownup(…, p_my_password)`;
  - `lw_edit_child(…, p_my_password)`, which needs the password only when
    the name changes.
- **How the bulk functions answer.** They take any number of IDs and reply
  `{ok, done, skipped: [{id, why}]}`. An account you don't look after, or a
  child someone outside your corner also looks after (for delete), is
  skipped and named in the result. Every function is safe to repeat.
- **Changing your own password** already needed your current password
  (`lw_change_password`) and is unchanged.

## Progress reset that holds

- **What a reset clears.** It removes the child's rounds and stickers and
  stamps `profiles.progress_from`. Name, picture, password and settings stay.
- **Old play can't sync back.** `lw_sync` now ignores rounds and stickers
  dated before the reset, so a tablet holding old, unsent play can't bring it
  back. The device also drops its own old copy when it next syncs.
- **Stickers have to be re-earned.** For a child whose progress was reset, a
  sticker is accepted only when their rounds since the reset earn it (the
  same tests as the game's stickers). Otherwise a device with a stale copy
  could re-award a sticker with a fresh timestamp. Children who were never
  reset keep the old behaviour exactly.
- **Clock caveat.** A device whose clock is well behind real time could have
  rounds played just after a reset ignored as "before". Normal clocks are
  fine.

## Where the bulk limit lived, and what changed

| Place | Before | Now |
| --- | --- | --- |
| `lw_put_settings` / `apply_settings` (database) | Refused more than 2000 edits per call. "All children" with ~200+ children failed. | No cap. The corner also uploads settings in batches of 500 (`accounts/accounts.js`). Tested with 3000 edits in one call and 750 from the browser. |
| Old `lw_create_child` (database) | 80 per group (closed already) | Dropped |
| Corner | No selection at all, one account at a time | Select mode, any number. Chunks of 100 (20 for new passwords, because bcrypt is slow and Supabase stops a single database call after about 8 seconds). |
| Edge functions | None on my branch | None |
| `lw_sync` 500 rounds per upload, device memory of 20 lists | — | Kept, as you asked |

## The confirm step (what replaced what)

My build never had typed-count or typed-name confirms. Here is what changed:

| Before | Now |
| --- | --- |
| **Remove** a child: radio choice, then Remove | Choice, list of affected accounts, **Your password**, then Remove |
| **Remove** a grown-up: plain "Remove X?" | List, **Your password**, then Remove |
| **Password** for a child: new password, then Save | New password, list, **Your password**, then Save password |
| **Add a grown-up**: name, sign-in name, password | The same, plus **Your password** |
| **Name & picture**: no check | **Your password** appears only when the name is changed |
| *(new)* **Reset progress** | List, **Your password**, then Reset progress |

- The button stays disabled until the password is typed.
- A wrong password is cleared, focus goes back to the box, and the dialog
  says "That isn't your password."

## Closing the Supabase Auth gap (needs you)

- **The gap.** By default, anyone signed in can call `PUT /auth/v1/user` with
  a new password and no current password.
- **The fix.** Supabase has a toggle, **"Require current password when
  updating"**, under **Authentication → Sign In / Providers → Email**. With
  it on, that endpoint refuses a password change unless the current password
  is sent too, and checks it on the server.
- **Why it doesn't break sign-in.**
  - Sign-in uses the password grant, which the toggle doesn't touch.
  - Password changes in the game go through `lw_change_password` and
    `lw_set_children_password`. Those set the hash in the database and never
    call that endpoint.
  - I checked the code: nothing in the game calls `/auth/v1/user`.
- **Don't confuse it with "Secure password change".** That's a different
  toggle that emails a code. Our sign-in emails are fake `.invalid`
  addresses, so that one **would** lock people out. Leave it off.
- **Why I didn't do it.** There's no admin key or dashboard access on this
  machine, so I couldn't flip the toggle or confirm how it's set now. It's
  written up in `supabase/README.md`.

## Commits (pushed to `claude/home-flow-ribbon`)

Before the first commit, local HEAD, `origin/claude/home-flow-ribbon` and
`origin/rollback/pre-call-list-2026-10-20-claude` were all `4f8a823`. The
rollback branch and `main` were not touched, and nothing was force-pushed.

| Commit | What |
| --- | --- |
| `9ce2e75` | Migration `20261021010000_risky_actions.sql`, its rollback `supabase/rollback/20261021010000_risky_actions_down.sql`, the full rollback updated, README, database tests |
| `c429c18` | Corner: select mode, password-only confirms, chunked bulk with Try again, settings batches, reset pruning on devices, the sticker check after a reset (added to the same migration before anyone had applied it), `sw.js` cache version 4, new `tests/risky_actions.mjs` |
| *(this report)* | `reports/risky-actions-pass.md` |

**Rollback.** `supabase/rollback/20261021010000_risky_actions_down.sql`
undoes just this migration. It puts back the earlier functions exactly. I
tested it on PGlite: roll back, then the migration applies cleanly again. The
full rollback also removes the new table and functions; I tested that too.

## Test results (local stand-in, headless Chromium)

| Suite | Result |
| --- | --- |
| `run_tests.py` (strict) | 6/6 |
| `accounts_db.mjs` | **19/19**, 4 of them new: the password gate on every risky function; wrong-password pause; progress reset (including old uploads and stickers refused); no cap (1,000 children reset, unlinked and deleted in one call each, 25 new passwords, 3,000 settings edits) |
| `accounts_flow.mjs` | **13/13**. New: the password step on add-grown-up, remove and delete; only the password to type; password box above the button; the name-change box; select all, then bulk reset and bulk new password; the reset holds on a Chromebook that still had Mia's old copy |
| `risky_actions.mjs` (new) | **6/6**: 250 children load; settings for all 250 in two batches; reset all 250 in three chunks; connection dropped after 200, then Try again for the other 50; 3 grown-ups removed at once; pause after 10 wrong passwords |
| `accounts_two_devices.mjs` | 6/6 |
| `home_flow.mjs` | 6/6 |
| `grown_ups_smoke.cjs`, `grown_ups_runtime.cjs`, `runtime_smoke.cjs` | pass |
| `offline_shell.cjs` | 2/2 (138 files, cache version 4) |
| `names_check.cjs` | pass, 78 files |
| `motion_smoke.cjs`, `confetti_smoke.cjs` | pass |
| `browser_smoke.cjs` | pass, all 18 cases. Letter Post (shards 0–2) ran in one go; the single run hit my 20-minute time limit partway into Moonboat, so I ran Moonboat as shards 3–5: 9/9 |
| `ribbon_smoke.cjs` | **fails, unrelated to this work.** "ribbon-390-pink home: theme 59 × 60", meaning Ribbon Road's theme picker is 1 px under the 60 px target at 390 px. The untouched `4f8a823` fails identically here, and this work changes no layout file. It's probably this machine's newer headless Chromium measuring 1 px differently. It's in the layout system, so I left it for your approval. |

**Sizes.**
- `accounts_flow` checks the corner and select mode for overflow and 60/72 px
  targets at 390, 1366 and 1920 px.
- I also looked at screenshots at **390, 768 and 1440 px**: kid card with
  **Reset progress**, select mode with the bar, the reset and remove dialogs,
  and grown-ups select.
- The screenshots are in `/tmp/rb/shots/` on this machine only; none are in
  the repo.

**Environment note.** Playwright's bundled browser build was missing. I ran
the browser tests with
`CHROMIUM_EXECUTABLE=~/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`.

**Live runs.** None, because the migration isn't applied. Once it is, these
should pass against the project:
- `LW_BACKEND=live node tests/accounts_flow.mjs`
- `LW_BACKEND=live node tests/accounts_two_devices.mjs`

They make their own disposable accounts through `demo-grownup` (password
`7234ab`). `risky_actions.mjs` is local-only, because it builds its 250
children directly in the database.

## Standing rules

- **Master (Brandy).** Not touched, and not seen: my project has no master.
- **Live data.** No reads or writes on the live project at all this turn.
  Nothing restored or undone.
- **Migrations.** One new migration only; no earlier migration edited. The
  rollback scripts aren't migrations.
- **Pushes.** Only to `claude/home-flow-ribbon`.
- **Layout system.** No change. The Ribbon Road failure above is left for your
  approval.

## Test logins

These are the same demo logins as before (password `7234ab`). They'll only
show the new behaviour once the migration is applied:
- Grown-up: `demo-grownup`, through "Are you a grown-up?". They see Ava, Ben
  and Cleo, with `demo-grownup2`.
- Child: `ava-wru`.

## Preview (always the latest on the branch)

- Games: https://raw.githack.com/CryptoBrad89/childrens-learning-game/claude/home-flow-ribbon/index.html
- Grown-ups' corner: https://raw.githack.com/CryptoBrad89/childrens-learning-game/claude/home-flow-ribbon/grown-ups/index.html

**The repository has moved.** GitHub now redirects
`CryptoBrad89/childrens-learning-game` to
**`TeslaWarpDrive/childrens-learning-game`**. Pushes still work through the
redirect, and both link forms load. The new-owner links:
- https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/index.html
- https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/claude/home-flow-ribbon/grown-ups/index.html

I didn't change the local remote URL.

## Questions

1. **Master.** My Supabase project has no master or Brandy, so "the master can
   reset any kid" has nothing to attach to. Leave it as "every grown-up resets
   the children they look after", or add a master role in a later job?
2. **Username.** I gated **changing a child's name**, since sign-in names
   can't be changed anywhere in my build. If you want sign-in names to be
   changeable, that's a new feature (with the password check) for a later job.
3. **Ribbon Road theme picker (layout system).** It's 59 px wide at 390 px in
   this environment, both before and after this work. May I widen it by a
   pixel or two, or should I leave it?
