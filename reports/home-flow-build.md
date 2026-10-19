# Home flow and Ribbon Road build

Letters with Lucy now opens with child sign-in, followed by a layout picker with Ribbon Road highlighted first. Play without saving is isolated from account history and preferences. Existing accounts, groups, offline caching and cross-device sync remain working. Art and audio are unchanged. No database migration or backend deployment was needed.

## What changed

- Every live page title and top-left brand uses **Letters with Lucy** and **Little Sounds Big Discovery**. Ribbon Road replaces the old visible layout name in the picker, game, settings, notebook, tests and current documentation. Retired product names do not appear in the visible application.
- There is no invented splash video. Until the real video exists, the first interactive screen is the child login dialog. It contains username and password, a smaller **Are you a grown-up?** link, and **Play without saving**. It has no group, board or classroom code field. A previously signed-in child can explicitly continue from the dialog; a fresh ordinary home entry never skips it automatically.
- Sign-in leads to the layout picker. Ribbon Road is the first highlighted choice, followed by Letter Post and Moonboat. Choosing a card opens its game immediately. Returning with **Choose a layout** restores that picker. Existing grown-up layout visibility choices remain respected for signed-in accounts; with default settings, and always in unsaved play, all three layouts appear.
- Unsaved mode shows a warning before selection, on the picker and during play. It clears the active login without deleting that person's pending outbox, exposes no cached achievements or progress, ignores saved preferences, and blocks settings and round writes at the account-store boundary. Guest color and sound changes live only in memory. Only a temporary mode marker follows navigation; cached static assets still support offline play.
- Child and grown-up login forms check their respective account roles. Database permissions remain authoritative. Grown-ups manage kids and groups, with no school-role framing. Signed-in children can still view their own notebook, but cannot open grown-up management or settings.
- Existing identifiers for Auth addresses, IndexedDB/storage, database world values and asset URLs remain compatible. In particular, the database's `silk` world identifier and `v4-silk-thread/` URL still serve Ribbon Road. Renaming these would risk existing accounts, queued rounds and themes or require a migration. Historical build reports remain an audit record.
- The offline manifest includes the new home module and stylesheet. Its 138 cached runtime files use a new branded cache name and clean up the previous cache prefix. Direct local-file previews give clear sign-in guidance and support unsaved play; saved accounts require localhost or HTTPS.

## Preview and manual checks

Run `python3 -m http.server 8000` from the repo root.

1. Open [index.html](../index.html), or `http://localhost:8000/`. Verify that login is the first interactive screen and that the small grown-up link stays secondary.
2. Choose **Play without saving**. Read the warning, check that Ribbon Road is highlighted, then open it. Complete a round, change color, and reload. No progress or choices should survive; the unsaved warning remains visible.
3. Return with **Choose a layout** and try Letter Post and Moonboat. Check the brand and tagline in their home, activity and reward screens.
4. Open [grown-ups/index.html](../grown-ups/index.html). On a hosted page, use a grown-up account to enter settings. The linked-child notebook and kids/groups management retain their existing permissions and sync behavior.
5. Sign in as a child from the home dialog, play, and open the notebook. Its progress should save normally. Repeat on a second browser profile and reconnect after offline play.

The new real-project test logins are recorded in [home-flow-test-logins.json](home-flow-test-logins.json). They were created only in `ixjbgshhzeaosrzavssr`. The original account-build login record and historical reports are preserved.

## Test results

All final checks passed. Browser checks took no screenshots.

| Check | Result |
| --- | --- |
| `python3 tests/run_tests.py` | 6/6 strict groups; approved audio and image references retained |
| `node tests/runtime_smoke.cjs` | 234 rounds across the three layouts and themes |
| `node tests/grown_ups_runtime.cjs` | Settings validation and renderer behavior passed |
| `tests/browser_smoke.cjs`, six existing shards | 18/18 game, viewport and theme cases |
| `tests/motion_smoke.cjs` | 12/12 motion cases |
| `tests/silk_smoke.cjs` | Ribbon Road A-Z, palettes, targets and chooser checks |
| `tests/confetti_smoke.cjs` | 18/18 cases |
| `tests/grown_ups_smoke.cjs` | Door, gate, settings, guards, reset, layouts and effects |
| `node tests/home_flow.cjs` | Login-first, defaults, warning, unsaved persistence isolation, role separation, all-layout branding, offline reload and local-file play |
| `node tests/accounts_sync.cjs` | Two-profile protocol fixture, retry deduplication, account isolation and ordered offline edits |
| `node tests/accounts_sync.cjs --live` | Real two-profile offline sync, groups, linking, RLS denial and linked-child settings |
| `node tests/accounts_selection.cjs` | Real notebook selection and settings navigation |
| `node tests/accounts_database.cjs` and `node tests/accounts_database_edge.cjs` | Existing schema and provisioning tests |
| JavaScript syntax and `git diff --check` | Passed |

Existing browser commands use `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`. The home-flow and account helpers have no screenshot calls. Detailed final output is in the `home-flow-*.log` files beside this report. Repeat the live run with `ACCOUNTS_LOGIN_REPORT=reports/home-flow-test-logins.json CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/accounts_sync.cjs --live` to keep its credentials separate from the prior build record.

The older tests were updated for the intentional entry-flow change: they choose unsaved play before inspecting the layout picker, use the child home login instead of the grown-up form, and test legacy local-file settings separately from unsaved mode. Their gameplay, audio, layout and permission assertions remain. The new test also verifies that unsaved mode cannot append operations even through the public store methods, cannot overwrite existing browser preferences, and cannot upload a round to a previously signed-in child.

## Design references used

The local `/workspace/clg/tools/design/INDEX.md` guided reference selection. Design-taste's `taste-ux-copy` supplied short action labels, visible field errors and explicit saving consequences. UI Layouts' `normal-grid` informed the responsive layout cards and reading order; the implementation uses plain CSS grid. Better Design was read-only reference for preserving the existing design system, clear form hierarchy and accessible labels. No live Better Design connection or new runtime dependency was used. Existing paper, ink, fonts, Lucy art and grown-up shader styling are preserved. Canvas-ui and cursify were excluded as requested; no new effects tool was needed.

The repo's verification skill and home feature guide now describe the new entry flow. Optional pstack fan-out was unnecessary for this client-only change.

## Open questions

Owner review locks verified: grown-up kid management has no group, board or classroom code fields or flow. The picker has three direct layout choices and no separate bottom play button; Ribbon Road remains the default. Both already matched the shipped UI. Added browser regression checks for code fields, collapsed management forms and redundant picker play buttons; the focused home-flow suite passed again.

None block this build. The real splash video remains a future owner-provided asset. No Supabase schema change was made, so no migration application is pending.
