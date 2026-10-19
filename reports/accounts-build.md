# Accounts and sync: build report

Branch `claude/accounts-supabase` · draft PR
[#4](https://github.com/CryptoBrad89/childrens-learning-game/pull/4) · 2026-10-19

## Summary

- **Real logins for everyone, on Supabase.** Children and grown-ups are real
  Supabase Auth users. Children never need an email address: the database
  makes their accounts already confirmed. So "Confirm email" stays on, no
  auth setting changed, and no email is ever sent.
- **Nothing is per-device.** Settings, every finished round, and stickers
  belong to the person. They follow the person to any device, including the
  per-world color themes.
- **Children don't type.** On any device, a grown-up opens a group's picture
  board, taps the child's picture and types the child's password. Passwords
  only need six characters, so `7234ab` works. People who played on a device
  get a picture tile on its "Who's playing?" screen. **I'm done** hands the
  device to the next child, and a new tab never continues as the last child.
- **Grown-ups and children stay separate.** Grown-ups sign in to the existing
  grown-ups' corner, which keeps its look, door and settings. Any grown-up can
  make any number of groups and children. There are no classroom, teacher or
  parent roles, and every grown-up in a group can do everything there. The
  number-word gate stays, as the quick re-entry check for a grown-up who
  chose to stay signed in on their own device.
- **Offline first.** A service worker keeps all 138 game files after the
  first load. Play saves on the device first and uploads when the connection
  returns.
- **Nothing lost or doubled.** Rounds carry an id made on the device, so a
  retried upload can't count twice. Settings merge per field, and the newest
  edit wins.
- **Tested against the real project.** The required two-device test passes
  live: one profile plays offline, and on reconnect the reply to its first
  upload is deliberately lost, so it retries. The server and both devices then
  show exactly 7 rounds, the newest colors, a grown-up's settings change and
  the stickers. The flow and grown-ups' corner suites also pass live. All
  existing suites pass.
- **Migrations:** three, all applied by you.
- **One SQL statement for you to run:** removing the leftover test grown-ups
  (see [Leftover test accounts](#leftover-test-accounts)).

## What I built and why

### Accounts (`supabase/migrations/`)

- **One account type, two roles.** Every person is an `auth.users` row plus a
  `profiles` row with `role` set to `child` or `grownup`. Each person signs in
  with a **sign-in name** that maps to `<name>@accounts.little-woof.invalid`.
  `.invalid` is a reserved domain, so nothing can ever be mailed there.
- **Accounts are made confirmed by the database.**
  `lw_private.create_auth_user` inserts the `auth.users` and `auth.identities`
  rows with a bcrypt hash and `email_confirmed_at` already set. That is how
  "Confirm email" stays on without blocking anyone; this was verified against
  the real Supabase Auth.
  - Children have no email at all.
  - Grown-ups use the same path. Sending confirmation mail would need SMTP
    set up on the project, and a working sign-in name is enough here.
- **Passwords:** the only rule is six characters (72 is bcrypt's ceiling).
- **Children's sign-in names are made from the child's name** plus three
  characters, for example `ava-wru`. They are easy to read out and are unique.
- **Groups are plain groups.**
  - A group has a **board code** (six characters, safe on a poster: it shows
    names and pictures, and every child still needs their password) and an
    **invite code** (eight characters, for grown-ups only).
  - Any grown-up can make any number of groups. A child can be in any number
    of groups, and every grown-up in a group looks after every child in it.
  - This makes "school and home" just two groups that share a child, with no
    built-in classroom or family. Your rule came after the first two
    migrations, so `20261019140000_any_grownup_groups.sql` removed the
    class/home kinds, the size caps and the owner-only actions.
- **Adding a child who already has an account** takes their sign-in name and
  password, which proves the grown-up knows them. Failed tries are limited to
  ten per grown-up per hour.
- **Locked-down database access.** Every table has row-level security on, and
  `anon` and `authenticated` have no table privileges. Everything goes through
  `lw_*` security-definer functions with a pinned `search_path`, each checking
  `auth.uid()`. On the real project, direct table reads return 401 (signed
  out) and 403 (signed in). Children can't call any grown-up function, open
  the corner, or be added to a group as a grown-up.

### Sync (`accounts/accounts.js`)

- **Rounds:** each finished round is a row `{id, world, letter, misses,
  hinted, played_at}`. The id is made on the device before the round is saved
  locally, and the server inserts with `on conflict (id) do nothing`.
  Progress, letters collected and counts are all worked out from these rows,
  so a retry can never add anything twice.
- **Settings:** one row per field, newest edit wins. Edit times are capped at
  the time the edit arrives, so a device with a fast clock can't win forever.
  Children may change only their own color themes. Grown-ups change the rest.
- **Stickers:** 12 to earn (first sound, five letters, s a t p i n, vowels,
  three worlds, 10 and 50 rounds, ten right first time, all 26 in each world,
  a to z). They are worked out from play, so they are earned offline too, and
  the server keeps the earliest time each was earned.
- **One request per person per sync.** `lw_sync` uploads waiting rounds and
  stickers and returns the person's whole state in the same transaction.
- **What a device shows** is always the last copy from the server plus
  whatever is still waiting on the device. That is why there is nothing to
  double-count, even when a reply is lost.
- **When it syncs:** after each round, on sign-in, when the connection
  returns, when the tab becomes visible, and every 30 seconds.
  - Anyone on the device with play waiting is uploaded too. A child who played
    offline uploads even after the next child has taken over the device.
  - Uploads for one person are serialized with Web Locks across tabs.
- **Offline sign-in.** A device keeps each person who signed in there: name,
  picture, a salted PBKDF2 check of their password, and their saved session.
  That lets someone who signed in before sign in again offline, and lets
  their play upload later.
  - Forgetting a person on a device is refused while they still have play
    waiting.
- **Offline shell.** `sw.js` stores every shipped file on first load.
  - It serves files from that copy and refreshes pages, scripts and styles in
    the background when online.
  - `tests/offline_shell.cjs` fails if its file list drifts from the repo.

### Screens

- **Chooser front door (`accounts/front-door.*`):**
  - "Who's playing?" with picture tiles, a saved-board button for each group
    board used on the device, **Open a group board**, **Sign in with a name**,
    and **Play without saving**.
  - Play without saving is the old one-visit game, and every existing test of
    that game still applies to it.
  - The password step is a native dialog. Six dots fill as you type, and
    there is a Show button.
  - Signing in on a device the child hasn't used before waits up to 5 seconds
    for their settings, so the first round already uses them. The live flow
    test found this gap.
  - The playing strip shows the child, a sync line for the grown-up watching,
    the stickers (tap to open the sticker book), and **I'm done**.
- **Worlds:** collections become "N of 26 · yours to keep" for a signed-in
  child. The footer shows who is playing, with I'm done, and a sticker toast
  appears when a round earns one. Color choices save to the child's account.
- **Grown-ups' corner:**
  - **Sign-in / new account** replaces the gate on a first visit.
  - **01 Children:** groups, codes, each child's sign-in name and short
    progress, and buttons for Settings, Password, Edit, Remove and Delete.
    Each group also has Add a child, Add a child who has an account, Print
    sign-in cards, Rename, New codes and Leave, plus New group and Join with
    an invite code.
  - **A sticky "Settings for" selector:** one child, everyone in a group, or
    me. Only the fields a grown-up touches are written.
  - **The original Sound to Worlds sections, unchanged.**
  - **07 Progress:** letter grids per world and a sticker shelf, or a table
    for a whole group.
  - **08 Sync & this device:** sync status, Sync now, and the people kept on
    this device (with Forget).
  - **09 About.**
  - **Leaving:** a grown-up who didn't choose to stay signed in is signed out
    on leaving. One who did comes back through the number-word gate.

## Design tools used (and skipped)

| Tool | Used for |
| --- | --- |
| **superdesign** | Its workflow (layout as ASCII, then theme, then motion, then build) for every new screen, written up in `accounts/DESIGN.md` and `grown-ups/DESIGN.md` §5–7. I didn't use its Tailwind-from-CDN output or its three-variant generation: the game is vanilla and offline. |
| **design-taste** | The core skill's design read and never-list (no emoji: sticker marks are drawn or typographic, and avatars are the game's own art); `playful-color` for the chooser front door; `taste-ux-copy` for every error (what, why, fix) and button label; `taste-accessibility`'s checklist (native dialogs, labelled inputs, no skipped heading levels, password dots not announced on every key). |
| **ui-layouts** | `showhide-pass` (the Show/Hide password button) and `pass-strength-dotted-indicator`, cut down to six dots for the single six-character rule (no strength meter, since strength rules are ruled out). |
| **motion-primitives** | `AnimatedBackground` (the Sign in / New account pill), `Dialog` (scale-in), `AnimatedGroup` (staggered picture tiles). |
| **trickle** | `stamp` (the Saved postmark, and the sticker toast landing); `underline-draw` (section rules, kept). |
| **Paper Shaders** | The existing static mesh-gradient band, now also behind the sign-in screen. No new shader. |
| **Hyperiux** | The existing `arrow-fill-button` (the corner's leave button), now labelled "Sign out and go to games" or "Lock and go to games". No new effect was needed. |
| **Better Design** | Read-only reference, as instructed: the `number-pop-in` timing for the password dots and the `switch` spec. There was no MCP connection, so its review tools (`get-review-rules`, `review-ui-code`, `inspect-spacing`) were **not** run. |
| canvas-ui, cursify | Skipped: the owner ruled them out. |

## How to test

```sh
python3 tests/run_tests.py
node tests/runtime_smoke.cjs
node tests/grown_ups_runtime.cjs
node tests/offline_shell.cjs
npm ci --prefix tests/db                    # once (PGlite, test-only)
node tests/accounts_db.mjs
export CHROMIUM_EXECUTABLE=/usr/bin/google-chrome
node tests/accounts_two_devices.mjs         # the required two-device test
node tests/accounts_flow.mjs
node tests/grown_ups_smoke.cjs
# add LW_BACKEND=live to the last three to use the real project
# existing suites, without screenshots:
node -r ./tests/no-screenshots.cjs tests/motion_smoke.cjs   # likewise silk_, confetti_
for i in 0 1 2 3 4 5; do BROWSER_SMOKE_SHARD=$i node -r ./tests/no-screenshots.cjs tests/browser_smoke.cjs; done
```

- **Local backend:** `tests/db/supabase-stand-in.mjs` runs every file in
  `supabase/migrations` in PGlite (real Postgres in WebAssembly). It sits on a
  copy of Supabase's `auth.users` and `auth.identities` columns, roles and
  default grants, behind the same token and RPC endpoints the game uses.
- **By hand:** serve the repo (`python3 -m http.server 8000`) and open `/`.
  Open a group board with `7XMA9R` and tap Ava. The password is `7234ab`.

## Test logins (real project)

Every password is `7234ab`. `tests/accounts/demo_logins.mjs` made them and can
be re-run safely. All six were checked by signing in through Supabase Auth.

| Sign-in name | Who | Notes |
| --- | --- | --- |
| `demo-grownup` | **Grown-up** "Demo Grown-up" | Made **Demo Sunflowers** |
| `demo-grownup2` | **Grown-up** "Second Grown-up" | Joined Demo Sunflowers by invite code; made **Demo Evenings** |
| `ava-wru` | **Child** Ava | In both groups, looked after by both grown-ups |
| `ben-rx7` | **Child** Ben | Demo Sunflowers |
| `cleo-kvc` | **Child** Cleo | Demo Sunflowers |
| `dev-qvt` | **Child** Dev | Demo Evenings |

| Group | Board code | Invite code (grown-ups only) |
| --- | --- | --- |
| Demo Sunflowers | `7XMA9R` | `XQUC-EMXJ` |
| Demo Evenings | `ADFA7V` | `PCPQ-999K` |

## Test results

| Suite | Result |
| --- | --- |
| `run_tests.py` (strict) | 6/6 |
| `runtime_smoke.cjs` | 234 rounds, pass |
| `grown_ups_runtime.cjs` | 4/4 (updated: settings come from the signed-in player; rounds recorded once) |
| `offline_shell.cjs` | 2/2 |
| `accounts_db.mjs` | 14/14, on all three migrations |
| `accounts_two_devices.mjs` | **6/6 live** and 6/6 local |
| `accounts_flow.mjs` | **10/10 live** and 10/10 local |
| `grown_ups_smoke.cjs` | **pass live** and local: 4 sizes, gate, worlds at 2 sizes, reduced motion, dark mode (rewritten for real sign-in, keeping all of the old coverage) |
| `motion_smoke.cjs` | 12 cases, pass |
| `silk_smoke.cjs` | 14 checks, pass, re-run after the final wording change (one added line: it taps "Play without saving" first) |
| `confetti_smoke.cjs` | 18 cases, pass |
| `browser_smoke.cjs` | 18 cases, pass when run in its six shards |

Notes:

- **No screenshots were taken.** The existing browser suites ran under
  `tests/no-screenshots.cjs`, which turns `screenshot()` into a no-op. No
  image files were written.
- **`browser_smoke` in one go:** run unsharded, the browser closed partway
  through twice ("Target page, context or browser has been closed"). Every
  shard passes on its own, so it looks like a browser crash on a long run, but
  I didn't confirm the cause.
- **Tests that changed:**
  - `grown_ups_smoke.cjs` and `grown_ups_runtime.cjs` were adapted, because
    settings moved from device storage to accounts.
  - `silk_smoke.cjs` gained one line.
  - No other existing test changed.

## Migrations

| File | Status |
| --- | --- |
| `20261019120000_accounts_schema.sql` | **Applied** |
| `20261019120100_accounts_functions.sql` | **Applied** |
| `20261019140000_any_grownup_groups.sql` | **Applied** |

`supabase/rollback/20261019120100_accounts_down.sql` removes all of it. It is
not a migration and must be run by hand. I checked on PGlite that it removes
everything and that the migrations apply cleanly again afterwards. There are no
edge functions.

## Leftover test accounts

There is no API function that deletes a grown-up account, so the test runs
left grown-ups behind:
- `teacher-…`, including `teacher-probeuyk…`, from the probe and test setup;
- `lee-…` and `dad-…`, from the flow tests;
- plus the children and groups they made.

This statement removes exactly those, and leaves the demo logins. I tested it
on the stand-in: it removed the test accounts and kept a demo child that a
test grown-up had linked into a test group. Please run it in the SQL editor:

```sql
begin;
create temporary table lw_test_grownups on commit drop as
  select id from public.profiles
   where role = 'grownup' and login ~ '^(teacher|lee|dad)-[a-z0-9]+$' and created_at >= '2026-10-19';
create temporary table lw_test_children on commit drop as
  select id from public.profiles
   where role = 'child' and created_by in (select id from lw_test_grownups);
delete from public.groups where created_by in (select id from lw_test_grownups);
delete from auth.users
 where email like '%@accounts.little-woof.invalid'
   and id in (select id from lw_test_children union all select id from lw_test_grownups);
commit;
```

To check before or after:
`select role, login from public.profiles order by role, login;`

Running the live suites again makes new accounts of the same kind, and this
statement clears those too.

## Open questions for the owner

1. **Grown-up password recovery.** There's no email, so a grown-up who forgets
   their password needs someone to reset it with SQL. Children are fine: any
   grown-up who looks after them resets theirs in the corner. Options:
   - set up SMTP on the project and add email recovery;
   - let a grown-up reset another grown-up in a shared group;
   - leave it as an operator job.
2. **Open sign-up.** Anyone can make a grown-up account, with no
   verification. Is that acceptable, or should new grown-ups need an invite?
3. **Equal grown-ups.** Following your rule, any grown-up in a group can take
   out any other grown-up and make new codes. Say if you'd like any of that
   held back.
4. **Play without saving.** Keep it? It is the only per-device-free way to
   play with no account (substitutes, demos), and it saves nothing.
5. **Shared devices that wipe local data** (guest or ephemeral Chromebook
   profiles) lose any play that hasn't uploaded yet. The strip and the corner
   show what is still waiting. Do the target Chromebooks keep site data
   between sessions?
6. **Hosting.** Offline play needs the game served over HTTPS (or localhost)
   for the service worker. Opening the files straight from disk still plays
   and syncs, but has no offline shell. Where will it be hosted?
7. **Old device settings.** Settings saved by the previous build in a
   browser's `little-woof-grown-ups` storage are ignored now. I added no
   import, since nothing is per-device. Is that fine?
8. **Board privacy.** Anyone with a board code sees that group's first names
   and pictures (never passwords). New codes can be made at any time. Is
   that the intended trade-off?
