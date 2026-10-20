# Portal review pass

## TL;DR

The portal now groups actions by person, separates Kids, Grown-ups and My account, and names the settings page Game settings. Settings targets are explicit. Brandy can manage every kid, including kids not linked to her. Other grown-ups can manage only their linked kids. The master can share kids, transfer links in one server transaction, and reset another grown-up's game progress.

The master account remains `brandy` / Brandy. Existing live accounts were not deleted. Destructive live tests used only exact IDs created during this job. The rollback branch remains at `448ef96`.

## Findings

| Finding | Status | Change and evidence | Difference from the recommendation |
| --- | --- | --- | --- |
| F1: Misleading corner name | Fixed | Game settings naming in `accounts/index.html`, `accounts/navigation.js` and `grown-ups/index.html`; browser navigation checks. | The existing settings editor remains a separate page, as approved. This preserves its review flow without duplicating it. |
| F2: Hidden settings target | Fixed | `grown-ups/editor.js` reads explicit child parameters, displays names/logins, and ignores the progress owner. `portal_review_browser.cjs` opens general settings after viewing a kid and checks that the target is still defaults. | Kids are selected in the portal. The editor displays the selection and offers a return link instead of another checklist. |
| F3: Leaking/resetting views | Fixed | `accounts/portal.js` controls the entire content area and remembers the view in the URL hash. Browser tests open a kid, switch to Grown-ups and reload, checking that kid content stays hidden. | Game settings is a separate page. Kids, Grown-ups and My account retain complete content ownership. |
| F4: Buried kid deletion | Fixed | A kid page replaces the list and has a Delete shortcut at the top, a Back to Kids control and person-level actions. Bulk Delete is available from the list selection bar. | Useful form IDs/wrappers remain, but finding Delete no longer requires opening the management accordion or scrolling through progress. |
| F5: Missing bulk delete | Fixed | Selection bars for kids and regular grown-ups; typed-count confirmations list every name/login. New Edge batch actions validate 1–100 unique UUIDs and report per-ID outcomes. Database, Edge and live tests cover allowed targets and partial failures. | Approved partial-success deletion and sequential progress reset. No bulk password reset. |
| F6: Scattered actions | Fixed | Kid profile, password, settings, assignments and danger actions live on the kid page. The grown-up editor contains profile, password reset, linked kids, progress reset and Delete. Self-service lives in My account. | The existing grown-up dialog becomes the person editor instead of adding another page route. |
| F7: Global settings permission | Fixed | Edge master-only checks plus a replacement `patch_game_settings` database function in the new migration. Non-master defaults UI is disabled with an explanation. | No permission difference. Database and Edge tests both verify denial. |
| F8: Duplicate/wrong copy | Fixed | Removed the signed-in welcome/identity card and duplicate self-row edit action; removed progress numbering; updated help; retained one home-page portal link. | A compact avatar/name My account button replaces the large card. |
| F9: Unsearchable lists | Fixed | Both lists search by name/login. Master kid search also matches assigned grown-up names/logins. Every assignment is visible in the row. | A separate grown-up filter is omitted because assignment-aware search covers the task. |
| F10: No grown-up progress view | Fixed | My account displays the signed-in grown-up's own progress. Existing game sign-in and progress tests remain. | The master can also reset another regular grown-up's progress, as Bradley explicitly requested. |
| F11: No unlink/avatar editing | Fixed | Kid icon and picture editing, linked-grown-up display and unlink. The SQL function keeps the last master link or rehomes the kid to the master. Browser tests cover icon/upload changes; database/live tests cover unlink outcomes. | Last-link unlink returns an explicit kept/rehomed result rather than implying the kid became unassigned. |
| F12: Master scope gap | Fixed | Master reads all kids/assignments and bypasses kid guardian requirements throughout Edge, database functions, RLS and client navigation. Live tests open and manage a kid after transferring its link away from the master. | Section 11 was answered yes. Transfer/sharing follow the approved follow-up rather than the original deferred plan. |
| F13: Selection/dialog defects | Fixed | Selection help and conditional action bars; visible dialog close/cancel controls; separate wrapping login lines; phone/tablet/desktop checks. | Existing dialogs and stable IDs are retained where useful. |

## Permissions model

Permissions are enforced by the authenticated Edge handler and database access rules. A forged client role or actor parameter does not grant access. Sessions still use the existing 30-minute grown-up and six-hour kid limits.

| Capability | Master | Other grown-ups |
| --- | --- | --- |
| Read kid profiles, progress and settings | Every kid | Linked kids only |
| Create kids | Yes | Yes, linked to creator |
| Edit kid profile/avatar, reset password/progress, change settings, delete | Every kid | Linked kids only |
| Bulk kid settings, progress reset and deletion | Every kid | Linked kids only |
| Find/share/link existing kids | Yes, to a chosen grown-up | Denied |
| Unlink | Any assignment | Own link only |
| Transfer one kid or selected kids | Yes | Denied |
| List/create/edit/delete/reset another grown-up's password | Yes, with master/self protections | Denied |
| Reset another grown-up's game progress | Regular grown-ups only | Denied |
| Change game defaults | Yes | Denied |
| Own profile, password and game progress | Self-service | Self-service |

Every master kid row shows **Linked to:** with **You** for Brandy and each other grown-up's display name and login. Shared kids list every assignment. The kid page shows the same assignments. These labels stay visible in the phone layout; search matches them.

Transfer takes a source and destination. One database transaction adds/keeps the destination link and removes the source link, preserving unrelated grown-up links. Kids not linked to the source are skipped with a per-kid reason. Logins, progress and settings stay with the kid. A last-link unlink either rehomes the kid to the master or explains that the final master link is kept.

## Commits and deployment

- `e6628a2`: server permissions, bulk deletion, transactional transfer, last-link handling, grown-up progress reset and server tests.
- `e3e9e0c`: portal organization, assignment display/search, explicit settings scope, person-local actions and affected browser tests.
- `7e2625e`: fresh asset paths, rebuilt offline manifest and updated workflow checks.
- `39038ca`: settings sign-out race fix and failed-suite rerun support.
- Final verification/evidence commit: recorded in the branch history with this report.

The new migration is `supabase/migrations/20261020154722_portal_review.sql`. Supabase recorded it as `20261020155544`, named `portal_review`. No old migration was edited. The `accounts` Edge function was deployed to `ixjbgshhzeaosrzavssr`, version 7. It retains its own Auth and server-session validation. Existing single-ID actions remain supported.

Before the first commit, local HEAD and both remote branch references were `448ef96d1d8e1c3068649ecaeee81dba50b6b68d`; `git ls-remote` confirmed the remote values. Work was committed and pushed only on `codex/home-flow-ribbon`, without force-pushes.

## Before and after

These captures use the same named fixtures, not live classroom accounts. Before captures serve commit `448ef96`; after captures serve the revised working tree. `tests/portal_review_browser.cjs` creates its own temporary baseline server so the comparison can be rerun. The original review evidence under `/workspace/lucy-portal-audit/` was not changed.

| Width | Before | After | Visible assignments | Delete confirmation |
| --- | --- | --- | --- | --- |
| 390 px | [Kids before](portal-review/before-kids-390.png) | [Kids after](portal-review/after-kids-390.png) | [Assignments](portal-review/after-assignments-390.png) | [Confirmation](portal-review/after-delete-confirm-390.png) |
| 768 px | [Kids before](portal-review/before-kids-768.png) | [Kids after](portal-review/after-kids-768.png) | [Assignments](portal-review/after-assignments-768.png) | [Confirmation](portal-review/after-delete-confirm-768.png) |
| 1440 px | [Kids before](portal-review/before-kids-1440.png) | [Kids after](portal-review/after-kids-1440.png) | [Assignments](portal-review/after-assignments-1440.png) | [Confirmation](portal-review/after-delete-confirm-1440.png) |

Additional Grown-ups and Game settings captures are in [portal-review](portal-review/). Phone captures show cancel/close controls within the viewport. The browser checks also reject horizontal overflow and uncaught page errors.

The hosted preview initially combined new HTML with an older cached `ui.js`. Changed scripts/styles now have fresh paths (`portal.js`, `portal.css`, `client.js`, `navigation.js`, `editor.js`), and the offline manifest is rebuilt. Game HTML changes only update the shared account-script references. Kid game wording, art and audio are unchanged.

## Validation

All **37 maintained jobs pass**. [Final results](portal-review-tests/results.json) retain each command and outcome. [Initial results](portal-review-tests/initial-results.json) preserve the first run, including four failures. The failures were a closed-form test selector, a settings sign-out subscriber error, an incomplete dependent settings fixture, and a timed-out disposable-account creation request. The corrected settings run and failed-job reruns all passed; their separate logs remain beside the initial logs.

The full run covered all six game shards, including all 18 Letter Post/Moonboat theme and viewport cases, plus motion, Ribbon Road, confetti, settings, home flow, offline synchronization, database permissions, Edge actions, sessions and live portal flows. After refreshing asset paths, [offline account synchronization](portal-review/offline-after-cache-paths.log) and [the three-width portal journey](portal-review/browser-after-cache-paths.log) passed again. [The final Edge check](portal-review/edge-final.log) verifies both acceptance of 100 IDs and rejection of 101.

Commands used:

```sh
MASTER_HANDLE=brandy PORTAL_PREVIEW=http://127.0.0.1:8770/ python3 tests/run_fixlist.py
MASTER_HANDLE=brandy node tests/child_settings_browser.cjs
MASTER_HANDLE=brandy PORTAL_PREVIEW=http://127.0.0.1:8770/ python3 tests/run_fixlist.py --rerun-failed
```

The local preview server served this repository at port 8770. The successful standalone child-settings rerun is recorded with its real shell exit 0 in the final results; it was not repeated by the failed-job runner.

[Hosted smoke checks](portal-review/hosted-latest.log) passed at 390 and 1440 px using the always-latest branch URL. [The pinned final-code settings journey](portal-review/hosted-pinned.log) passed at both widths on commit `39038ca`, including explicit kid settings and grown-up/kid sign-out. Supabase's post-change security advisor returned the same pre-existing notices as its baseline, with no new notices from this migration.

The new targeted tests have passed:

- `portal_review_database.cjs`: master/regular mutation and read permissions, atomic transfer, skipped source links, last-link rehoming and protected master progress.
- `portal_review_edge.cjs`: master/linked/unlinked action matrix, sharing/transfer/defaults restrictions, bulk happy/partial outcomes, preflight validation, duplicates, UUIDs and the 100-ID limit.
- `portal_review_browser.cjs`: all three widths, assignment-aware search, isolated persisted views, own progress, protected master row, explicit settings, kid icon/upload editing and typed-count cancel flow.
- `portal_review_live.cjs`: real master-unlinked kid navigation and actions, UI bulk transfer, UI reset of a disposable grown-up's progress, source-link skips, shared-link preservation, unlink/rehome, and partial bulk deletion using only recorded disposable IDs.

## Master and data guards

Read-only query used before and after implementation:

```sql
select id, handle, display_name, is_master
from public.profiles
where is_master = true;
```

| Check | Username | Display name | ID | Master rows |
| --- | --- | --- | --- | --- |
| Before | `brandy` | Brandy | `f41a99f8-2952-49d0-982c-70485b142e0d` | 1 |
| Final read-only check | `brandy` | Brandy | `f41a99f8-2952-49d0-982c-70485b142e0d` | 1 |

[The final read-only audit](portal-review/final-read-only-audit.json) records the master identity and retained job-era test accounts by ID. It is an inventory, not a cleanup instruction.

No test changed, renamed, deleted or reset the real master's profile/password/progress. Master-protection mutation tests use local fixtures. Live destructive tests create their targets first and act only on their exact IDs. Existing accounts, including old test accounts, remain for Bradley to clean up.

The inherited modified report JSONs and PNGs were backed up locally and restored before verification because they were not evidence for this pass. Any subsequently refreshed test report included with this change comes from the new runs. Unrelated untracked audit/job artifacts are excluded from commits.

## Test logins

The master login used for read-only identity and authorized administration is `brandy`; its password is not included in this report. Fixture screenshots use `review_master` and `review_alex` with `7234ab` on an in-memory backend.

Disposable real-project logins and exact IDs for the new permission tests are in [test-logins.json](portal-review/test-logins.json), including recorded cleanup results. Refreshed account, master-management, profile-edit and child-settings suites record their disposable credentials in their respective `reports/*test-logins.json` or `reports/*logins.json` files. Deleted disposable accounts cannot be used to sign in. Retained accounts are left for Bradley. [The final local regression logins](portal-review/fixlist-logins.json), [round-two logins](portal-review/round2-logins.json), and the read-only retained-account inventory cover the other live journeys. Common disposable passwords are `7234ab`; the round-two grown-up and reset-password cases record `8345bc`, and the sync isolation child records `aaaaaa`.

## Always-latest preview links

- [Grown-up portal](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/accounts/index.html)
- [Game settings](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/grown-ups/index.html)
- [Game sign-in](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/index.html)
- [Pinned build verified for review](https://raw.githack.com/CryptoBrad89/childrens-learning-game/39038ca/accounts/index.html)

The runner owns the final line of the job log.
