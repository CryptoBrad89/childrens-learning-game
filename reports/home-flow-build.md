# Letters with Lucy home flow

The game now opens as Letters with Lucy. After a short still splash, the first thing a child can use is a login. Play without saving is on that same screen and keeps nothing. The next screen is the three layouts, with Ribbon Road highlighted. Letter Post and Moonboat keep their names. Ready Set ABC is not in this repo and was not used.

## What changed

- Every title and on-screen name that said Little Woof, or the old hub title, now says **Letters with Lucy**. The tagline on the top-left of the home, each world, and the grown-ups page is **Little Sounds Big Discovery**.
- Lucy's Silk Thread is **Ribbon Road** in titles, the layout picker, the world itself, and the grown-ups world switch. The saved world id is still `silk`, and the folder is still `v4-silk-thread`, so letters already stored for that world still merge.
- Home order: still splash (Lucy’s existing photo and the paper palette, no video), then child login, then the layout pick. The login asks for the sign-in name and secret the accounts build already uses. It has no classroom, board, or group code. **Are you a grown-up?** opens the grown-ups corner. **Play without saving** warns that sounds, stars, and settings will not be saved, then sets a tab-only flag. Guest play does not write theme, progress, stars, or settings.
- Ribbon Road starts selected. A child can tap a layout or **Play Ribbon Road**. A child who is already signed in skips the login and lands on the layouts. A guest who comes back in the same tab does too.
- Grown-ups and children stay separate. A child session still cannot open settings. The grown-ups sign-in copy no longer says teacher, parent, or classroom. The live database still stores those two grown-up roles, and one group for the role that creates children.
- Art files and audio files were not replaced.

## How to test

From the repo root, with Chrome available:

```sh
python3 tests/run_tests.py
node tests/runtime_smoke.cjs
node tests/grown_ups_runtime.cjs
node tests/accounts_merge.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/home_flow.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/silk_smoke.cjs
CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/grown_ups_smoke.cjs
```

`tests/home_flow.cjs` is the new check. On a file URL it expects the login first, no classroom field, Ribbon Road selected after **Play without saving**, and no theme, progress, or settings written. Serve the folder (`python3 -m http.server 8000`) to try a real child sign-in (name and secret, such as `maya` / `7234ab`).

## Test results

Passed here:

- `python3 tests/run_tests.py` — 6/6
- `node tests/accounts_merge.cjs`
- `node tests/runtime_smoke.cjs` — all three worlds, 78 rounds each
- `node tests/grown_ups_runtime.cjs`
- `node tests/home_flow.cjs`
- `node tests/silk_smoke.cjs` — chooser at 390, 1180, and 1920, plus Ribbon Road palettes and all 26 rounds
- `node tests/grown_ups_smoke.cjs` — phone, tablet, Chromebook, whiteboard, gate pause, world settings, reduced motion, dark
- `tests/browser_smoke.cjs` shards 0 and 3 — Letter Post and Moonboat at 390×844, all three themes

Not run this pass: `accounts_sync.cjs` (needs the live little-woof project), full `browser_smoke` shards 1, 2, 4, and 5, `motion_smoke.cjs`, and `confetti_smoke.cjs`.

## Design tools

Used from this repo and the grown-ups notes, not from a live Better Design connection:

- **superdesign** — one job per screen: splash, login, then layouts.
- **better-design** — the 16px / 400ms panel reveal from `grown-ups/DESIGN.md`. Not connected live.
- **design-taste** — no blur on the reveal; reduced motion and Calm motion remove it.
- **paper-design shaders** — the splash band uses the same palette as `grown-ups/paper-shader.js`, painted as the CSS gradient that file already uses as its fallback. The child splash does not start WebGL. The grown-ups page still draws the mesh once.
- **ui-layouts** — the secret is a labelled field with a Show control.
- **Hyperiux**, **motion-primitives**, and **trickle** — left as they already are on the grown-ups page (fill button, dialog, stamp). The home flow does not add a second copy.
- **pstack** — not used. It configures model roles, not this screen.
- **canvas-ui** and **cursify** — skipped.
- **Ready Set ABC** — not present and not used.

## Open questions

- `supabase/migrations/20261019160000_grownup_groups.sql` is in the branch and is **not applied**. It would let either grown-up role own more than one group on little-woof (`shkmpxaejiuqzejsdwyr`) only. The page does not call `create_group` yet, so the desk still creates one group for the role that adds children, and links children for the other role. Apply it only if you want that next, and say so before anyone runs it.
- The splash is a still on purpose. There is no video file to play.
- A signed-in child who opens the home again in the same browser goes straight to the layouts after the splash. Say if they should see the login every time instead.
