# Call list pass

## TL;DR

The cream portal, accounts, six Lucy pictures, permissions, sync, sessions, home login, and the three wrong-answer clips are on `cursor/home-flow-ribbon`. Grown-up sessions end after 30 minutes without activity. Children end six hours after sign-in. Layout picker, which layouts a child is offered, and letter grids were left as they are.

There is no Brandy profile and no Brandy auth user, before or after. Username and display name are absent. Nothing was renamed, re-passworded, reset, deleted, or restored for her. Masters are still zero.

## Per item

| Item | Status | What happened |
| --- | --- | --- |
| Portal, two views | done | Kids is the whole first view. Grown-ups is a second view and only the master sees it. |
| My account | done | Own page at `grown-ups/account.html`. Name, sign-in name, secret, Lucy picture or upload, own progress, one confirm to reset. |
| Game settings inside Kids | done | Same cream page. The label says `Editing: game defaults` or the children's names. SATPIN and vowels are the letter presets. |
| Sign out | done | One fixed top-right control on grown-up pages. At 390 and 1440 it sits at y=12, 44px tall, and does not cover another button. It returns to `grown-ups/index.html`. |
| Delete confirm | done | Replaced in the risky-actions add-on. The password field is above the button. The button stays disabled until a secret is typed. |
| Six Lucy pictures | done | garden, nap, mail, leap, wave, nudge. Square, face-centered, 256px, offered offline. Upload still works. Spares are not offered. |
| Header picture | done | Narrow picture only. Theme chooser stays where it was. A child's picture opens a sheet that does not edit a name. A grown-up's picture links to My account. |
| Layout picker | deferred | Bradley said leave it. Section 7 picker changes are not in this build. |
| Which layouts are offered | deferred | Device switches are unchanged. |
| Letter rows and grids | deferred | No scroll-box changes. |
| Wrong-answer clips | done | Three mp3s copied byte for byte. Hashes match the brief. They rotate, play after the letter line, and are in the service-worker cache. |
| Permissions | done | Master sees everyone. Other grown-ups get `not-linked` off their kids. Anonymous is 401. A child is 403 `not-allowed`. No public grown-up signup. No groups, classrooms, or codes in the UI. No PIN. |
| One master | done | `profiles_one_master` is a unique partial index. New accounts are not master. The master cannot delete herself. |
| Passwords | done | Minimum 6, no complexity rule, leaked-password check left off, login names unique. |
| Self progress reset | done | On My account, one confirm. Tested with disposable grown-ups, then those accounts were removed by exact id. Brandy was not reset. |
| Kid sign-out | done | From the header sheet and from the home screen. Progress syncs or stays queued first. |
| Sessions | done | See the session rule below. Copy is "You were signed out for safety." |
| Home login | done | Splash placeholder, then a child-first dialog. One "Are you a grown-up?" link. Play without saving writes no account progress. A grown-up can sign in on that screen. |
| Practice scope | done | Per child, including starter `s a t p i n` and vowels. Game defaults are master-only. |
| Offline sync | done | Progress follows the person. A same-epoch round counts once. A newer reset epoch replaces older queued rounds. |
| Live progress | done | From the server, about every 8 seconds. Copy includes "Last activity synced at [date/time]". Offline shows the last known copy and says so. |
| Link and share | done | Master picks children from a list. No typed child secret. A child can also be linked to another grown-up. Unlink is on the child's page. The last link to the master stays. |
| Delete a grown-up | done | Login and links go away. Children stay. A child with no grown-up is linked to the master when one exists. Bulk delete uses the same typed confirm and skips the master's own row. |
| Search | done | Kids search matches name, sign-in, and grown-up names. Grown-ups search matches name and sign-in. |

Play without saving does not read or write account progress. On-device world switches still apply, because those switches were left as they are.

## Session rule

Grown-ups: **30 minutes of inactivity**, not 30 minutes from sign-in, and not a JWT `exp` claim. The server stores `session_marks.last_active_at` and uses its own clock. A peek does not extend the time. The browser asks the server at most once a minute, and only after a click or key press.

Children: **6 hours after sign-in**, from `session_marks.started_at`. Activity does not extend it.

`accounts/session.js` is the fake-clock check. Per-role JWT expiry is not available, so the limit lives in `touch_session`.

## Commits

- `ee79310` Keep one master, session limits, and a progress reset on the server.
- `ff8ac16` Add the cream kids desk, six Lucy pictures, and My account.
- `9bab0ec` Play the three approved wrong-answer lines in turn.
- `07c6524` Cover call-list permissions, session clocks, and reset epochs.
- `1a4b98b` Record the call-list pass, with screenshots.
- `50c01fc` Ask for the grown-up's own secret before a risky account change.
- The commit that records this add-on follows `50c01fc`.

Base confirmed before the first commit: local `HEAD`, `origin/cursor/home-flow-ribbon`, and `origin/rollback/pre-call-list-2026-10-20-cursor` were all `0d01cc60678b78e552d6498a6dba6eea0f5b5a35`.

## Screenshots

Home login: [390](call-list/home-login-390.png), [768](call-list/home-login-768.png), [1440](call-list/home-login-1440.png).

Kids portal: [390×844](call-list/portal-kids-390x844.png), [768×1024](call-list/portal-kids-768x1024.png), [1440×900](call-list/portal-kids-1440x900.png), [1180×820](call-list/portal-kids-1180x820.png), [1440×1080](call-list/portal-kids-1440x1080.png), [1920×1080](call-list/portal-kids-1920x1080.png).

Grown-ups, master only: [390×844](call-list/portal-grownups-390x844.png), [768×1024](call-list/portal-grownups-768x1024.png), [1440×900](call-list/portal-grownups-1440x900.png), [1180×820](call-list/portal-grownups-1180x820.png), [1440×1080](call-list/portal-grownups-1440x1080.png), [1920×1080](call-list/portal-grownups-1920x1080.png).

Also: [six pictures](call-list/portal-pictures.png), [game settings for Maya](call-list/portal-game-settings.png), [password confirm at 390](call-list/portal-password-confirm-390.png), [password confirm at 1440](call-list/portal-password-confirm-1440.png), [password typed, Delete enabled](call-list/portal-password-ready-1440.png), [pick a child first](call-list/portal-need-pick.png), [My account](call-list/my-account-1440.png), [current secret](call-list/my-account-current-secret-1440.png), [reset my progress at 390](call-list/my-account-password-reset-390.png), [reset my progress at 1440](call-list/my-account-password-reset-1440.png).

The earlier typed-word delete shots are the same files as the password confirm at 390 and 1440. The button in those shots is the faded Delete, because the secret field is empty.

Game header: [390×844](call-list/game-chip-390x844.png), [1180×820](call-list/game-chip-1180x820.png), [1440×1080](call-list/game-chip-1440x1080.png), [1920×1080](call-list/game-chip-1920x1080.png), [grown-up chip 1180×820](call-list/game-chip-grownup-1180x820.png).

The Grown-ups shots show the tabs and the add form. The checkbox bulk delete was added after those shots.

## Tests

Headless, Chrome:

- `python3 tests/run_tests.py` strict: 6/6. Voice inventory 94 files. The three wrong-answer hashes match.
- `tests/accounts_merge.cjs`: reset epoch replaces an older round, a same epoch counts once, settings stay, a merge with no epoch stays a union.
- `tests/accounts_session.cjs`: fake clock. Exactly 30 minutes idle expires a grown-up. A click inside the window keeps them in. A child expires at 6 hours.
- `tests/portal_rules.cjs`, `tests/home_flow.cjs`, `tests/grown_ups_smoke.cjs`: pass, including phone, tablet, chromebook, whiteboard, reduced motion, and dark.
- `tests/call_list_live.cjs`: anonymous 401, Ada is not master, create-grownup 403 `not-master`, disposable child progress ok, stranger `not-linked`, child token 403 `not-allowed`, peek limit `inactivity`. A delete or a sign-in rename without the grown-up's secret is 403 `password`, and the child can still sign in. Three disposable children were deleted in one call after the secret matched.
- `tests/risky_actions.cjs`: the confirm is a password, the button is not a typed word, Ribbon Road's config matches `0d01cc6`, and no selection cap is in the page, the function, or the new SQL.
- `tests/accounts_merge.cjs` and `tests/accounts_session.cjs` passed again.
- Full suites, run again after the password change: `accounts_sync`, `browser_smoke` (18), `runtime_smoke` (letter-post, moonboat, silk), `motion_smoke` (12), `silk_smoke`, `confetti_smoke` (18), `grown_ups_runtime`. `ALL_SUITES_OK`. `home_flow` and `grown_ups_smoke` passed, including phone, tablet, chromebook, whiteboard, reduced motion, and dark.
- The voice inventory was not run again. The three wrong-answer files were not changed.

Ribbon Road loads `v1-letter-post/app.js`. Moonboat has its own copy. Both got the same wrong-answer hook. `new Audio(` stays one call site.

## Master account, read only

Before and after this build:

- Profiles with login or display name Brandy: 0
- Auth users with a Brandy email or display name: 0
- `is_master` rows: 0

No password was printed. No Brandy row was created.

## Test logins

- `ada@littlewoof.test`, the existing test teacher. The secret is already in `tests/accounts_sync.cjs`. She was not renamed, not re-passworded, and not reset.
- Disposable master `callshot`, id `4142303e-4b3e-4b0e-84cb-b6c6c84cd4ff`, removed by that id.
- Disposable grown-up `callxtra`, id `c62ab944-7dcd-4ff3-8eac-88f42b4ee566`, removed by that id.
- Disposable children from the live test and the screenshot script were removed by the ids the server returned.
- Pre-existing children, including the sync-test child, were left in place.

## Links

Always-latest raw.githack for `cursor/home-flow-ribbon`:

- https://raw.githack.com/CryptoBrad89/childrens-learning-game/cursor/home-flow-ribbon/index.html
- https://raw.githack.com/CryptoBrad89/childrens-learning-game/cursor/home-flow-ribbon/grown-ups/index.html
- https://raw.githack.com/CryptoBrad89/childrens-learning-game/cursor/home-flow-ribbon/grown-ups/account.html

Supabase project `shkmpxaejiuqzejsdwyr` only. The edge function `accounts-manage` is deployed there with JWT verification on. The call-list git migration is `supabase/migrations/20261021043000_call_list.sql`. The live database has that SQL applied in four idempotent batches (`call_list`, `call_list_roster`, `call_list_sessions`, `call_list_merge`) because one payload was split. The password compare is `supabase/migrations/20261021063000_risky_actions.sql`, applied as `risky_actions`. Old migrations were not edited.

## Design tools

- design-taste: one warm cream Pre-K direction, paper `#faf2df`, ink `#253f65`, red `#c74234`, before the mock.
- superdesign: HTML variants for login, Kids, Grown-ups, My account, and the delete confirm, then rebuilt in the existing vanilla pages.
- Paper shaders: the soft wash already behind home and the portal. It is one static paint. The CSS gradient is the fallback. It is not on the letter boards. Reduced motion still gets that one paint, because the portal check requires `data-drawn`, and there is no animation loop to turn off.
- ui-layouts: pattern ideas only. Vanilla layout, 44px targets, no nested scroll trap.
- Hyperiux: short view change, 180ms, turned off when reduced motion is requested.
- motion-primitives: short dialog timing on the confirm and the child sheet.
- trickle: splash placeholder title only. No invented splash video.
- canvas-ui and cursify: skipped, as decided on 2026-10-19.
- pstack: the setup skill stops to ask Bradley for a budget. No model rule was written.

The direction and the mock live in the project store, not in git. Existing shader and motion credits in the game stay inside their licenses.

## Layout check against 0d01cc6

`v4-silk-thread/config.js` is the same file as `0d01cc60678b78e552d6498a6dba6eea0f5b5a35`, including the line “Scroll for all 26 letters ↓”. The pink Ribbon Road home and the large portrait are that commit. The layout picker, the three worlds, and the letter rows were not restyled and were not reverted.

The header change that stays is the account picture. It is inserted before `.controls`. The theme menu is still the select inside that control group. A grown-up's picture opens My account. A child's picture does not. Wrong-answer clips, the portal, the six pictures, and the accounts stay.

## Risky actions

The grown-up re-enters their own secret. The Edge function calls `confirm_grownup_secret`, which compares the bcrypt hash sign-in already stores and does not write the user row. An empty or wrong secret returns 403 `password` and changes nothing. The secret is not stored and not logged. A count, a name, or a checkbox cannot skip it. The dialog lists who is affected. The only typed confirm is the secret. The button stays disabled until the field has something in it.

### Caps

No numeric cap on how many children or grown-ups one action can select was in the portal, the Edge function, or the database, so none was deleted. The server accepts the whole id list. The page sends that list in groups of 25 so a long selection still finishes. That group size is not shown. Refusing Brandy's row, or the master's own row, is not a count cap. The learner-state size limit was left as it was.

### Behind the secret

- Delete a child, one or many
- Delete a grown-up, one or many
- Reset progress, including Reset my progress, one or many
- Change or reset someone else's secret
- Unlink a child
- Move a child to another grown-up
- Create a grown-up login
- Change a child's sign-in name
- Change your own sign-in name or secret. One current-secret field. There is no second box to retype the new secret.

The portal has no editor for another grown-up's sign-in name. Creating that login already asks for the signed-in grown-up's secret.

### Does not ask

Linking a child, adding a child, game settings, a display name, a picture, and the device-only Reset all settings dialog.

### Live check

Before the password compare, Ada's `last_sign_in_at` was `2026-10-21 05:33:04.530365+00`. A matching compare returned true and a wrong compare returned false. The timestamp was still that value. Later test sign-ins are real sign-ins, so they do move it.

Brandy profiles: 0. Brandy auth users: 0. Masters: 0. Disposable children from the live password test were removed by the ids the server returned. Nothing of hers was created.

## Not finished

- pstack was not configured. It needs Bradley's budget choice.
- No standing master remains, because Brandy is not in this database and was not created.
- Grown-ups list screenshots still predate the bulk-delete checkboxes. The password confirm shots are new.
