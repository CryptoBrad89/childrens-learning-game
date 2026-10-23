# Letters with Lucy home flow

The game opens as Letters with Lucy. After a short still splash, the first thing a child can use is a login. Play without saving is on that same screen and keeps nothing. The next screen is three layout cards, with Ribbon Road highlighted. There is no separate play button. Letter Post and Moonboat keep their names. Ready Set ABC is not in this repo and was not used.

Rollback tag, before this portal pass: `pre-portal-rethink-2026-10-19-cursor` on `4850dd2`.

## Preview

- Home: https://raw.githack.com/CryptoBrad89/childrens-learning-game/cursor/home-flow-ribbon/index.html
- Grown-ups: https://raw.githack.com/CryptoBrad89/childrens-learning-game/cursor/home-flow-ribbon/grown-ups/index.html

Open the grown-ups page over http (not `file://`) to see the sign-in. `file://` keeps the number-word gate, on the same cream page.

## What changed

- The grown-up door uses the home chrome: cream dotted paper, navy Nunito, **Letters with Lucy** and **Little Sounds Big Discovery** fixed at the top left, and Lucy’s photo with the red “Hello, friend!” badge. A dark color scheme no longer turns the page navy.
- The portal is a sign-in plus a children list. A grown-up adds a child with an icon and, if they want, a picture from the device. They can set a new secret and sign out. There is no “Playing as…” banner and no group, classroom, board, or invite code on the page.
- The sign-in screen cannot create a grown-up. `accounts-public` now refuses every signup. Only a signed-in admin can add another grown-up, from the desk and from `accounts-manage`.
- Existing teachers on little-woof, including Ada, are admins. Pat is not. New grown-ups are admins only when the checkbox is ticked.
- A child’s icon stays one of the eight drawings. An uploaded picture is stored beside it and shown on the list.
- Ribbon Road stays the highlighted card. The three cards are the only way to start.

## Working sign-ins

- Child: `maya` / `7234ab`
- Admin grown-up: `ada@littlewoof.test` / `sunnyday`
- Grown-up who cannot add grown-ups: `pat@littlewoof.test` / `homepup`

## How to test

```sh
python3 tests/run_tests.py
node tests/runtime_smoke.cjs
node tests/grown_ups_runtime.cjs
node tests/accounts_merge.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/home_flow.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/portal_rules.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/silk_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/grown_ups_smoke.cjs
```

## Test results

Passed on this pass:

- `python3 tests/run_tests.py` — 6/6
- `node tests/accounts_merge.cjs`
- `node tests/runtime_smoke.cjs` — all three worlds, 78 rounds each
- `node tests/grown_ups_runtime.cjs`
- `node tests/home_flow.cjs`
- `node tests/portal_rules.cjs` — cream page in a dark color scheme, three cards, no play button, no public signup, no codes
- `node tests/silk_smoke.cjs`
- `node tests/grown_ups_smoke.cjs` — phone, tablet, Chromebook, whiteboard, gate pause, worlds, reduced motion, dark scheme stays cream

Live little-woof checks, then the temporary rows were removed:

- Public signup returns 403.
- A signed-out call to add a grown-up returns 401.
- Pat’s call to add a grown-up returns 403.
- Ada’s roster is admin, lists Maya and Sam, and does not include a code.
- Ada can add a child with an icon plus a jpeg, and can add a grown-up.

Not run this pass: `accounts_sync.cjs`, full `browser_smoke` shards, `motion_smoke.cjs`, and `confetti_smoke.cjs`.

## Design tools

Used from this repo and the grown-ups notes, not from a live Better Design connection:

- **superdesign** — one job per screen: splash, login, then layouts. The portal is one job too: sign in, then children.
- **better-design** — the 16px / 400ms panel reveal from `grown-ups/DESIGN.md`. Not connected live.
- **design-taste** — no blur on the reveal; reduced motion and Calm motion remove it. The grown-up page keeps the cream paper in a dark color scheme.
- **paper-design shaders** — the grown-ups band still draws the light mesh once. The child splash stays a CSS gradient and does not start WebGL.
- **ui-layouts** — the secret is a labelled field with a Show control. The child picture is a file field plus the icon row.
- **Hyperiux**, **motion-primitives**, and **trickle** — left on the grown-ups page (fill button, dialog, stamp).
- **pstack** — not used.
- **canvas-ui** and **cursify** — skipped.
- **Ready Set ABC** — not present and not used.

## Open questions

- The database still keeps one hidden room per grown-up so a child has a place to belong. The portal never shows its name or code. Say if that row should be dropped in a later migration.
- `supabase/migrations/20261019160000_grownup_groups.sql` was removed and was not applied. `20261019193000_portal_admin_avatars.sql` is applied on little-woof (`shkmpxaejiuqzejsdwyr`).
- The splash is a still on purpose. There is no video file to play.
