# Grown-ups' corner rethink: build report

Branch `claude/home-flow-ribbon` · 2026-10-19 · rollback tag
`pre-portal-rethink-2026-10-19-claude` (the commit before this work).

**Preview** (hosted from the branch):
- Games and children's sign-in: https://raw.githack.com/CryptoBrad89/childrens-learning-game/claude/home-flow-ribbon/index.html
- Grown-ups' corner: https://raw.githack.com/CryptoBrad89/childrens-learning-game/claude/home-flow-ribbon/grown-ups/index.html

The owner applied `supabase/migrations/20261019180000_simple_grownups_corner.sql`
to the Supabase project (`eyqxkxnhzzemafnwmzbf`). Every account suite then
passed against the live project as well as locally (results below).

**Test logins** (password `7234ab` for both):
- Child: `ava-wru` (Ava). The children's sign-in is on the games page.
- Admin grown-up: `demo-grownup`, from "Are you a grown-up?". They look after
  Ava, Ben (`ben-rx7`) and Cleo (`cleo-kvc`), together with `demo-grownup2`.

## Summary

- **One journey, in Codex's spirit.** "Are you a grown-up?" now opens the
  same cream card as the children's sign-in: same page, same size and place,
  same ink border, offset shadow, Lucy photo and red button. Only the words
  change ("Hello, grown-up!"). The dark-blue mode, paper band and postmark
  are gone. A device set to dark mode still gets the cream corner.
- **A simple admin.** After sign-in the corner is a short column of cream
  cards: **Children**, **Settings**, **Progress**, **Grown-ups**, **This
  device**, **You**. The "Signed in as …" intro, the "Settings for: Me" option,
  the sync line, "Sync now", the side index and the About section are gone.
- **No public grown-up sign-up.** The sign-in card has no "New account". In the
  database, `lw_sign_up` can no longer be called by anyone, and nothing at all
  is callable without signing in. Only a signed-in grown-up can add another
  grown-up (**Add a grown-up**, `lw_create_grownup`). Children can't do it
  either.
- **No groups, classrooms or codes.** Grown-ups add and manage children. The
  grown-ups they add look after the same children. Every group, board and code
  function is closed in the database.
- **Child pictures.** When you add or edit a child, you can pick one of the
  drawn pictures and a color, or tap **Upload a picture** to use any photo.
  The photo is cut to a 160×160 square in the browser and saved with the
  child. It then shows on the sign-in tiles, the player strip, inside the
  games and in the corner.
- **Tests:** the hard rules are covered in the database tests and two browser
  suites. Every suite passes locally (table below).

## The hard rules, and where each is enforced

| Rule | UI | Permissions | Tests |
| --- | --- | --- | --- |
| 1. Grown-up entry matches the children's sign-in | `grown-ups/index.html` uses the children's `.lw-dialog.login` card (from `accounts/front-door.css`) on the same dotted cream page, with the name top left in the same spot. One light theme only. | — | `grown_ups_smoke.cjs`, at 4 sizes: the card's page color, pattern, background, border, radius, shadow, heading ink and font, red button, width and the brand's position all equal the children's card. Also: a dark-mode device still gets cream. |
| 2. Simple admin, no banners | Six plain cards. No "playing as", "signed in as" or sync text. | — | `grown_ups_smoke.cjs`: the card headings are exactly these six; the corner's text contains no playing as, signed in as, sync, upload, group, code, invite, class, teacher, parent or student. |
| 3. No public grown-up sign-up | No sign-up on the sign-in card: three inputs only, and a note that a signed-in grown-up adds new grown-ups. **Add a grown-up** exists only inside the corner. | Migration: `lw_sign_up` is closed to `anon` and `authenticated`. No `public.lw_*` function is executable by `anon`. `lw_create_grownup` requires a signed-in grown-up (children get `grownups_only`). The first grown-up comes from `lw_private.make_grownup`, which only the project owner can run (SQL editor). | `accounts_db.mjs`: sign-up refused signed out and signed in; no function open to `anon`; a child can't make a grown-up; `make_grownup` is unreachable from the API roles. `grown_ups_smoke.cjs`: no sign-up words or extra fields on the card. `accounts_flow.mjs`: a grown-up adds a second grown-up, who sees the same children. |
| 4. No groups or codes | Children are simply "your children". No group names, codes or kinds anywhere. | Closed: `lw_board`, `lw_groups`, `lw_create_group`, `lw_rename_group`, `lw_new_codes`, `lw_join_group`, `lw_remove_member`, `lw_create_child`, `lw_link_child`, `lw_group_states`, `lw_update_child`. Replaced by `lw_portal`, `lw_children_states`, `lw_add_child`, `lw_edit_child`, `lw_add_existing_child`, `lw_remove_child`, `lw_create_grownup`, `lw_remove_grownup`. | `accounts_db.mjs`: every closed function is refused, and the corner's API responses never contain a code or the word group. Browser suites: no codes or groups in the corner. |
| 5. Child avatar: drawn or uploaded | **Upload a picture** next to the 20 drawn pictures and 6 colors, with a live preview. "Use a drawn picture" switches back. | `profiles.picture` takes only a `data:image/jpeg|png|webp;base64` value of 60 KB or less. The check runs in the database (`bad_picture`). The client renders only values that pass the same check. | `accounts_db.mjs`: a photo is accepted; svg, `javascript:`, remote URLs, oversized and tampered values are refused; a photo can be cleared. `accounts_flow.mjs`: a real 640×480 upload is shrunk below 60 KB and shows in the corner, on the sign-in tile, in the player strip and inside Letter Post; a photo can be added to an existing child. |

## What changed

### Grown-ups' corner (`grown-ups/`)

- **`index.html`, rebuilt.**
  - Sign-in card: sign-in name, password with Show and the six dots, "Stay
    signed in on this device", **Sign in**, **Back to the games**, and the
    note "New here? A grown-up who already has an account adds you from their
    corner."
  - The reading gate is the same card.
  - Then the six cards. The top bar has the name top left and one
    "Sign out and go to the games" (or "Lock and go to the games") button.
- **`grown-ups.css`, rewritten.** It is built on `front-door.css`, so every
  surface uses the children's tokens: 3px ink outlines, 30px radius, offset
  shadows, red for the one main action. The dark theme, the paper band and
  the Hyperiux fill button are removed.
- **`grown-ups.js`.**
  - Sign-in, gate and settings, as before.
  - Settings go to "All children" or one child. With a single child, "all"
    is that child.
  - The "Me" option is removed.
- **`people.js`.**
  - Child cards with **Settings & progress**, **Name & picture**,
    **Password** and **Remove**.
  - **Remove** asks how: take the child off our list, which keeps the
    account, or delete it for good.
  - Also here: add an existing child, **Add a grown-up** and remove a
    grown-up, print sign-in cards, the photo upload and shrink, and **This
    device** ("Show my children's pictures on the sign-in", "Who played on
    this device" with Forget here).

### Accounts client (`accounts/`)

- **`accounts.js`.**
  - `signUp` and the code-based picture boards are removed.
  - New: `showHere` / `hideHere` / `shown` / `isShownHere`, a local list of
    a grown-up's children for a shared device's sign-in, refreshed whenever
    that grown-up opens the corner.
  - People now carry their `picture`.
  - The old `lw:boards` key is cleared.
- **`pictures.js`.** `avatar()` takes a person and shows their photo when
  they have a valid one, otherwise the drawn picture.
- **`front-door.js`, `in-world.js`.** Tiles and the player strip show
  photos. Tiles come from the "show here" list rather than board codes.

### Database (`supabase/`)

- **New migration `20261019180000_simple_grownups_corner.sql`.**
  - Each grown-up gets one hidden team: the first group they look after, made
    on first use. Children a grown-up adds, and grown-ups they make, join it.
  - Grown-ups and children already in several groups from the accounts build
    keep all of them; the test covers this.
- **Rollbacks.** `rollback/20261019180000_simple_grownups_corner_down.sql`
  undoes only this migration. The full rollback now also drops the new
  functions. I checked both on PGlite: the migration applies cleanly again
  after the simple rollback.
- **`supabase/README.md`** says how the owner makes the first grown-up:
  `select lw_private.make_grownup('name', 'password', 'Their name');`

### Tests

- `accounts_db.mjs`: rewritten for the new API, 15 checks.
- `grown_ups_smoke.cjs`: rewritten for the matching card, the simple
  corner and the dark-mode check. The world checks are unchanged.
- `accounts_flow.mjs`: rewritten, 12 checks. It covers photos, adding a
  grown-up, showing pictures on a shared device, adding an existing child,
  remove and delete.
- The harness has `makeGrownup` and `family()`. Locally they use the owner's
  SQL function. Live, the demo grown-up adds the test grown-up.
  `demo_logins.mjs` now uses the new API.
- The cache version in `sw.js` is bumped to 3, so installed copies pick up
  the new corner.

## Design tools

| Tool | Used for |
| --- | --- |
| **design-taste** | The design read: one journey, the children's tokens, one main action per card. `taste-ux-copy` for the Remove choice and errors (what, why, fix). `taste-accessibility`: native modal cards, a native select, labelled file input, 60/72px targets. |
| **motion-primitives** | `Dialog` pop for the sign-in, gate and form cards (the children's card rule). `AnimatedBackground` sliding pill for Help when stuck. |
| **Better Design** (read-only) | `panel-reveal` for the corner cards arriving, `number-pop-in` for the gate slots and password dots, `switch`. |
| **trickle** | `stamp` for "Saved". |
| **ui-layouts** | `showhide-pass` and the dotted six-character indicator, unchanged. |
| **superdesign** | The workflow (layout, then theme, then motion), written up in `grown-ups/DESIGN.md`. |
| Paper Shaders, Hyperiux | Taken out of the corner, because the band and fill button made it feel like a separate world. Paper Shaders stays on the splash. |
| canvas-ui, cursify | Skipped (owner ruled them out). |

I tried a cross-page view transition so the card would hold still between
the two pages. Chrome logged an error whenever a game page (which doesn't opt
in) was opened, so I removed it. The card already opens in the same place at
the same size.

## Test results (local stand-in backend, Chromium)

| Suite | Result |
| --- | --- |
| `run_tests.py` (strict) | 6/6 |
| `runtime_smoke.cjs` | pass (234 rounds) |
| `grown_ups_runtime.cjs` | pass |
| `offline_shell.cjs` | 2/2 (138 files, cache version 3) |
| `names_check.cjs` | pass, 73 files |
| `accounts_db.mjs` | **15/15** (new rules) |
| `grown_ups_smoke.cjs` | **pass**: 4 sizes, gate, worlds, reduced motion, dark-mode device |
| `accounts_flow.mjs` | **12/12** |
| `accounts_two_devices.mjs` | 6/6 |
| `home_flow.mjs` | 6/6 |
| `ribbon_smoke.cjs`, `motion_smoke.cjs`, `confetti_smoke.cjs` | pass |
| `browser_smoke.cjs` | pass, all six shards |

I ran all of these again, in the foreground, after the final code changes.
The browser suites ran under `tests/no-screenshots.cjs` and wrote no image
files. To judge the look, I took a few review screenshots of the sign-in and
the corner into `/tmp`; none are in the repo.

**Live (`LW_BACKEND=live`, after the migration was applied):**

| Check | Result |
| --- | --- |
| Signed-out calls to `lw_sign_up` and `lw_board` | refused: 404, because PostgREST hides functions the caller can't run |
| `demo_logins.mjs` | pass: `demo-grownup` sees Ava, Ben and Cleo through `lw_portal`, and shares them with `demo-grownup2` |
| `grown_ups_smoke.cjs` | pass |
| `home_flow.mjs` | 6/6 |
| `accounts_flow.mjs` | 12/12 |
| `accounts_two_devices.mjs` | 6/6 |

There is no public sign-up, so live runs create their test grown-ups through
`demo-grownup`. `demo-grownup` then takes each one off their team straight
away, so each test grown-up starts with an empty corner and the demo corner
stays tidy. Each live run leaves its test accounts in the project, as before.

**Fixed during the live runs:** a race showed up only with real network
latency. A refresh could draw the child cards before the "For" settings
picker had been filled in. The picker is now drawn together with the cards
(`people.js`).

## Decisions to check

1. **Every grown-up is an admin.** Any signed-in grown-up can add children and
   other grown-ups, and remove a grown-up from the team. I read "admin
   grown-up" as any grown-up who is signed in. If you want only some grown-ups
   to be able to add grown-ups, that's a small flag in a follow-up migration.
2. **The first grown-up** on a fresh project is made with one SQL line by the
   project owner. Existing grown-ups, including `demo-grownup`, keep working.
3. **Photos live in the database row** (at most 60 KB, usually 8–15 KB), not
   in Supabase Storage. That keeps it offline-friendly with no bucket setup.
   Photos go to every device the child signs in on.
4. **"Add a child who already has an account"** stays. It uses the child's
   sign-in name and password, not a code, and adds only the child, not the
   other family's grown-ups.
